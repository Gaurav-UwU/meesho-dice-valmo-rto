import { breakEvenMatch } from '../engine/demand.ts'
import { beliefOf, SKIP_REASONS, type SkipReason } from '../engine/router.ts'
import { DAY_MS, HOUR_MS, SIM_START } from './clock.ts'
import { deskMoney } from './deskMoney.ts'
import { eventsOf } from './events.ts'
import { isDelivered } from './lifecycle.ts'
import type { DayState } from './types.ts'

/** A number is "too early" until its lane has this many parcels behind it. */
export const MIN_PARCELS_PER_LANE = 30
/** The kill rule: a re-home match rate below this, judged after 30 days, stops the Hold lane. */
export const KILL_MATCH_RATE = 0.03
export const KILL_AFTER_DAYS = 30

export interface Metric {
  /** Parcels behind the number: the sample size */
  readonly n: number
  /** null when there is nothing behind it yet: never a fake zero */
  readonly value: number | null
  /** Fewer than 30 parcels in the lane: read it as a hint, not a result */
  readonly tooEarly: boolean
}

const metric = (n: number, total: number): Metric => ({ n, value: n === 0 ? null : total / n, tooEarly: n < MIN_PARCELS_PER_LANE })

export interface KillRule {
  readonly status: 'not_yet' | 'ok' | 'kill'
  readonly text: string
}

/** Match rate below 3% after 30 days ends the Hold lane. It cannot be judged before 30 days and 30 held parcels. */
export function killRule(input: { readonly days: number; readonly held: number; readonly matchRate: number | null }): KillRule {
  const { days, held, matchRate } = input
  if (days < KILL_AFTER_DAYS || held < MIN_PARCELS_PER_LANE || matchRate === null) {
    return { status: 'not_yet', text: `Kill rule: match rate below 3% after 30 days. Not judged yet: day ${Math.max(0, Math.floor(days))} of 30, ${held} of ${MIN_PARCELS_PER_LANE} held parcels.` }
  }
  return matchRate < KILL_MATCH_RATE
    ? { status: 'kill', text: `Kill rule tripped: the match rate is under 3% after 30 days. Stop the Hold lane.` }
    : { status: 'ok', text: `Kill rule: the match rate is at least 3% after 30 days, so Hold goes on.` }
}

export interface Skips {
  readonly total: number
  readonly byReason: Readonly<Record<SkipReason, number>>
  /** Skips over refused parcels; null with no parcels */
  readonly share: number | null
}

export interface PickupRate extends Metric {
  readonly collected: number
  readonly noShows: number
  /** Chosen and still waiting on the shelf */
  readonly open: number
}

export interface DeskKpis {
  /** (second chances delivered by a rider + pickups collected) / second chances sent */
  readonly salesSaved: Metric
  /** second chances the customer took / sent */
  readonly acceptRate: Metric
  /** held parcels that found a buyer / held (still-waiting ones are in the denominator) */
  readonly matchRate: Metric & { readonly open: number }
  /** What the forecast said the average held parcel's chance was, to set beside the match rate; null with nothing held */
  readonly forecastedMatch: number | null
  readonly breakEven: number
  readonly pickupRate: PickupRate
  /** Hours from the refusal to the parcel's end, for parcels whose order has ended */
  readonly dwellHours: Metric
  /** Net ₹ booked per refused parcel */
  readonly bookedPerParcel: Metric
  readonly skips: Skips
  readonly killRule: KillRule
  /** Things the simulation does not produce, so the panel says so instead of showing a fake 0 */
  readonly notSimulated: readonly string[]
  /** Pilot days the sim clock has run */
  readonly days: number
}

/** The numbers a real pilot would read, computed from the day's own record. Every one is a SIMULATED outcome. */
export function deskKpis(s: DayState): DeskKpis {
  const parcels = s.parcels
  const sent = parcels.filter((p) => p.secondChanceSentSim !== undefined).length
  const accepted = parcels.filter((p) => p.choice !== undefined).length
  const savedByRider = parcels.filter((p) => s.stops[p.orderId]?.viaSecondChance === true && isDelivered(s.stops[p.orderId].status)).length
  const collected = eventsOf(s, 'PICKUP_COLLECTED').length
  const chosen = eventsOf(s, 'PICKUP_RESERVED').length
  const noShows = eventsOf(s, 'PICKUP_EXPIRED').length
  const heldIds = new Set(eventsOf(s, 'HELD').map((e) => e.orderId))
  const matched = eventsOf(s, 'MATCHED').length
  const heldParcels = parcels.filter((p) => heldIds.has(p.orderId))
  const matchRate = heldParcels.length === 0 ? null : matched / heldParcels.length

  const dwell: number[] = []
  for (const p of parcels) {
    const refused = s.events.find((e) => e.type === 'REFUSED' && e.orderId === p.orderId)
    const ended = s.events.filter((e) => e.type === 'ORDER_TERMINAL' && e.orderId === p.orderId).at(-1)
    if (refused && ended) dwell.push((ended.simAt - refused.simAt) / HOUR_MS)
  }

  const byReason = Object.fromEntries(SKIP_REASONS.map((r) => [r, 0])) as Record<SkipReason, number>
  for (const e of eventsOf(s, 'SECOND_CHANCE_SKIPPED')) {
    const r = e.data.reason as SkipReason
    if (r in byReason) byReason[r]++
  }
  const skipTotal = SKIP_REASONS.reduce((t, r) => t + byReason[r], 0)
  const days = Math.max(0, Math.floor((s.simNow - SIM_START) / DAY_MS))

  return {
    salesSaved: metric(sent, savedByRider + parcels.filter((p) => p.state === 'picked_up').length),
    acceptRate: metric(sent, accepted),
    matchRate: { ...metric(heldParcels.length, matched), open: heldParcels.filter((p) => p.state === 'held').length },
    forecastedMatch: heldParcels.length === 0 ? null : heldParcels.reduce((t, p) => t + beliefOf(p.parcel, s.router).mean, 0) / heldParcels.length,
    breakEven: breakEvenMatch(),
    pickupRate: { ...metric(chosen, collected), collected, noShows, open: chosen - collected - noShows },
    dwellHours: { n: dwell.length, value: dwell.length === 0 ? null : dwell.reduce((t, x) => t + x, 0) / dwell.length, tooEarly: dwell.length < MIN_PARCELS_PER_LANE },
    bookedPerParcel: { n: parcels.length, value: parcels.length === 0 ? null : deskMoney(s).booked / parcels.length, tooEarly: parcels.length < MIN_PARCELS_PER_LANE },
    skips: { total: skipTotal, byReason, share: parcels.length === 0 ? null : skipTotal / parcels.length },
    killRule: killRule({ days, held: heldParcels.length, matchRate }),
    notSimulated: ['Custody incidents', 'Customer complaints'],
    days,
  }
}
