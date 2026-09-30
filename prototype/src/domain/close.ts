import { createRng, hashSeed } from '../engine/rng.ts'
import { pAccept } from '../engine/router.ts'
import { planAutopilot } from './autopilot.ts'
import { DAY_MS } from './clock.ts'
import { decisionFor } from './routing.ts'
import type { Action, DayState } from './types.ts'

type Reduce = (s: DayState, a: Action) => DayState

/** More rounds than a pilot day ever needs (every failed order gets at most 2 attempts, every parcel 3 lanes) */
const MAX_ROUNDS = 24
/** Share of second-chance offers the simulated customer never answers, so the 24 h expiry runs too (assumption) */
const NO_ANSWER_SHARE = 0.15

/** Work still to do that the bots and the clock can finish. Close pilot also works the stops reserved for a live demo: the demo is over. */
function openWork(s: DayState): number {
  const orders = s.stopOrder.filter((id) => {
    const st = s.stops[id]
    return ['out_for_delivery', 'otp_sent', 'ndr', 'rescheduled', 'refused'].includes(st.status)
  }).length
  const parcels = s.parcels.filter((p) => p.state === 'queued' || p.state === 'second_chance_sent' || p.state === 'held').length
  return orders + parcels + s.exceptions.filter((e) => e.status === 'open').length
}

/** The Desk on the Router's advice: send the offer, and let a seeded customer answer (accept per P(accept | reason), decline, or say nothing). */
function deskRound(s: DayState, at: number, reduce: Reduce): DayState {
  let next = s
  for (const rec of s.parcels) {
    const cur = next.parcels.find((p) => p.id === rec.id)
    if (!cur || cur.state !== 'queued') continue
    const lane = decisionFor(next, cur).lane
    if (lane === 'consolidated_return') {
      next = reduce(next, { type: 'deskConsolidate', at, parcelId: cur.id })
    } else if (lane === 'hold_rehome') {
      next = reduce(next, { type: 'deskHold', at, parcelId: cur.id })
    } else {
      next = reduce(next, { type: 'deskSecondChance', at, parcelId: cur.id })
      const u = createRng(hashSeed(`sc-${cur.id}`)).next()
      const accept = pAccept(cur.parcel.reason, next.router)
      if (u < accept) next = reduce(next, { type: 'customerSecondChance', at, parcelId: cur.id, accept: true })
      else if (u < accept + (1 - accept) * (1 - NO_ANSWER_SHARE)) next = reduce(next, { type: 'customerSecondChance', at, parcelId: cur.id, accept: false })
    }
  }
  return next
}

/**
 * Run the rest of the pilot: the bots work every open order, the Desk follows the Router, and the clock moves a day at a time
 * (so second chances expire, holds match or expire, failed attempts are retried or closed) until nothing is left; then it
 * advances past the 7-day return window so bonuses release. Deterministic for a day.
 */
export function closePilot(s0: DayState, at: number, reduce: Reduce): DayState {
  let s = s0
  for (let round = 0; round < MAX_ROUNDS && openWork(s) > 0; round++) {
    s = planAutopilot(s, { count: 100_000, seed: s0.seed + round, at, includeManual: true }).reduce(reduce, s)
    s = deskRound(s, at, reduce)
    s = reduce(s, { type: 'advanceDay', at })
  }
  return reduce(s, { type: 'advanceClock', at, minutes: (8 * DAY_MS) / 60_000 })
}
