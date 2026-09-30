import { planAutopilot } from '../domain/autopilot.ts'
import { createDay, DEFAULT_DAY } from '../domain/day.ts'
import { reduce } from '../domain/reducer.ts'
import type { Action, DayState } from '../domain/types.ts'
import type { HubId } from '../engine/types.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import type { GeoLoader } from './geo.ts'
import { isDayState } from './guards.ts'
import type { ActionInput, Store } from './types.ts'

export interface KeyValue {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ChannelLike {
  postMessage(message: unknown): void
  /** Register the one handler that receives messages from other tabs */
  listen(handler: (data: unknown) => void): void
}

export interface LocalStoreOptions {
  readonly loadGeo: GeoLoader
  readonly storage?: KeyValue
  readonly channel?: ChannelLike
  readonly now?: () => number
  readonly random?: () => number
  readonly ordersPerDay?: number
  readonly ridersPerHub?: number
}

// Bump the version when the shape of the day changes, so old saved days are ignored instead of crashing a screen.
const STORAGE_PREFIX = 'rescue-console-day-v5:'
const AUTOPILOT_SEED_BASE = 7

interface Broadcast {
  readonly hubId: HubId
  readonly state: DayState
}

const isBroadcast = (x: unknown): x is Broadcast => typeof x === 'object' && x !== null && 'hubId' in x && 'state' in x && isDayState((x as Broadcast).state)

/**
 * Demo mode: the whole day lives in this browser. State is saved to localStorage and broadcast to other tabs,
 * so the ops laptop tab, the rider phone frame and the customer phone frame stay in sync with no accounts and no internet.
 */
export function createLocalStore(opts: LocalStoreOptions): Store {
  const now = opts.now ?? Date.now
  const random = opts.random ?? Math.random
  const days = new Map<HubId, DayState>()
  const loading = new Map<HubId, Promise<void>>()
  const listeners = new Set<() => void>()
  const dirty = new Set<HubId>()
  let flushScheduled = false

  const notify = (): void => listeners.forEach((l) => l())

  const persist = (hubId: HubId, state: DayState): void => {
    try {
      opts.storage?.setItem(STORAGE_PREFIX + hubId, JSON.stringify(state))
    } catch {
      // Storage can be full or blocked (private window). The day still works in memory.
    }
  }

  const flush = (): void => {
    flushScheduled = false
    for (const hubId of dirty) {
      const state = days.get(hubId)
      if (!state) continue
      persist(hubId, state)
      try {
        opts.channel?.postMessage({ hubId, state } satisfies Broadcast)
      } catch {
        // A closed channel must never break the demo.
      }
    }
    dirty.clear()
  }

  const commit = (hubId: HubId, state: DayState): void => {
    days.set(hubId, state)
    dirty.add(hubId)
    if (!flushScheduled) {
      flushScheduled = true
      queueMicrotask(flush)
    }
    notify()
  }

  if (opts.channel) {
    opts.channel.listen((data) => {
      if (!isBroadcast(data)) return
      const { hubId, state } = data
      const mine = days.get(hubId)
      if (!mine || state.version > mine.version || state.seed !== mine.seed) {
        days.set(hubId, state)
        persist(hubId, state) // this tab may outlive the one that sent it
        notify()
      }
    })
  }

  const stamp = (input: ActionInput): Action => {
    const at = now()
    if (input.type === 'riderDeliver' || input.type === 'riderRefuse') {
      const code = String(Math.floor(1000 + random() * 9000))
      return { ...input, at, code }
    }
    return { ...input, at } as Action
  }

  const build = async (hubId: HubId, seed: number): Promise<DayState> => {
    // A hub file that fails to load must not leave the screen on "Loading" forever: fall back to the labelled stand-in.
    const geo = await opts.loadGeo(hubId).catch(() => syntheticGeo(getHub(hubId)))
    return createDay(geo, {
      seed,
      orders: opts.ordersPerDay ?? DEFAULT_DAY.orders,
      riders: opts.ridersPerHub ?? DEFAULT_DAY.riders,
    })
  }

  const ensureDay = (hubId: HubId): Promise<void> => {
    if (days.has(hubId)) return Promise.resolve()
    const existing = loading.get(hubId)
    if (existing) return existing
    const p = (async () => {
      try {
        let state: DayState | undefined
        try {
          const raw = opts.storage?.getItem(STORAGE_PREFIX + hubId)
          const parsed: unknown = raw ? JSON.parse(raw) : undefined
          if (isDayState(parsed)) state = parsed
        } catch {
          state = undefined
        }
        if (!state) state = await build(hubId, DEFAULT_DAY.seed)
        if (!days.has(hubId)) {
          days.set(hubId, state)
          notify()
        }
      } finally {
        loading.delete(hubId)
      }
    })()
    loading.set(hubId, p)
    return p
  }

  const send = async (hubId: HubId, input: ActionInput): Promise<void> => {
    await ensureDay(hubId)
    const cur = days.get(hubId)
    if (!cur) return
    const next = reduce(cur, stamp(input))
    if (next !== cur) commit(hubId, next)
  }

  const autopilot = async (hubId: HubId, count: number): Promise<void> => {
    await ensureDay(hubId)
    const cur = days.get(hubId)
    if (!cur) return
    const actions = planAutopilot(cur, { count, seed: AUTOPILOT_SEED_BASE + cur.version, at: now() })
    const next = actions.reduce(reduce, cur)
    if (next !== cur) commit(hubId, next)
  }

  const reset = async (hubId: HubId, seed: number = DEFAULT_DAY.seed): Promise<void> => {
    const fresh = await build(hubId, seed)
    // Keep versions climbing so other tabs adopt the reset instead of thinking it is stale.
    commit(hubId, { ...fresh, version: (days.get(hubId)?.version ?? 0) + 1 })
  }

  return {
    mode: 'demo',
    getState: (hubId) => days.get(hubId),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    ensureDay,
    send,
    autopilot,
    reset,
  }
}
