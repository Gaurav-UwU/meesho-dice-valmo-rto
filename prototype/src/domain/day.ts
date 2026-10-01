import { generateOrders, generateRiders } from '../engine/generate.ts'
import { rescueScore } from '../engine/rescue.ts'
import { assignRoutes } from '../engine/routes.ts'
import type { HubGeo } from '../engine/types.ts'
import { DEFAULT_ROUTER_PARAMS } from '../engine/router.ts'
import { SIM_START } from './clock.ts'
import type { DayConfig, DayState, StopRecord } from './types.ts'

/** Bump when the shape of DayState changes (see DayState.schema). */
export const DAY_SCHEMA = 8

export const DEFAULT_CONFIG: DayConfig = { maxAttempts: 2, bonus: 15, uplift: 0.12, basePay: 20 }

export interface DayOptions {
  readonly seed: number
  readonly orders: number
  readonly riders: number
  readonly config?: DayConfig
  /** Give every new day its own id (the stores do). Left out, it is derived from the seed so tests stay deterministic. */
  readonly dayId?: string
  /** 1 for the first day of a hub; a reset passes the old number plus one */
  readonly dayNo?: number
}

export const DEFAULT_DAY: DayOptions = { seed: 2026, orders: 300, riders: 12 }

/** Build the morning state: orders loaded, bags assigned, nothing scored or sent yet. */
export function createDay(geo: HubGeo, opts: DayOptions = DEFAULT_DAY): DayState {
  const generated = generateOrders(geo, opts.orders, opts.seed)
  const riders = generateRiders(geo.hub.id, opts.riders, opts.seed + 1)
  const routes = assignRoutes(
    generated.map((g) => g.order),
    riders,
    geo.hub,
  )
  const route = new Map(routes.map((r) => [r.orderId, r]))
  const stops: Record<string, StopRecord> = {}
  for (const g of generated) {
    const r = route.get(g.order.id)
    stops[g.order.id] = {
      order: g.order,
      pRto: g.pRto,
      score: rescueScore(g.order),
      flagged: false,
      riderId: r?.riderId ?? '',
      seq: r?.seq ?? 0,
      status: 'scored',
      failedAttempts: 0,
      reschedules: 0,
      replies: [],
      answers: { riderReached: null, askedReschedule: null },
      manual: false,
    }
  }
  return {
    schema: DAY_SCHEMA,
    dayId: opts.dayId ?? `day-${opts.seed}`,
    dayNo: opts.dayNo ?? 1,
    version: 0,
    hub: geo.hub,
    seed: opts.seed,
    started: false,
    config: opts.config ?? DEFAULT_CONFIG,
    simNow: SIM_START,
    riders,
    stopOrder: generated.map((g) => g.order.id),
    stops,
    otps: {},
    messages: [],
    ledger: [],
    parcels: [],
    feed: [],
    events: [],
    exceptions: [],
    strikeLog: [],
    router: DEFAULT_ROUTER_PARAMS,
    rejectedTransitions: [],
    nextId: 1,
  }
}
