import { clamp } from '../engine/math.ts'
import { createRng, hashSeed } from '../engine/rng.ts'
import type { AttemptEvidence } from '../engine/attempts.ts'
import type { Action, DayState } from './types.ts'

/** What the rider's phone recorded at the door. Genuine attempts are near the address, with calls and a wait; a fake one is logged from far away. */
function bootEvidence(rng: ReturnType<typeof createRng>, fake: boolean): AttemptEvidence {
  if (fake) return { gpsDistM: 600 + Math.floor(rng.next() * 1500), calls: 0, waitMin: 0 }
  const lazy = rng.chance(AUTOPILOT.lazyAttemptShare)
  return { gpsDistM: 30 + Math.floor(rng.next() * 120), calls: lazy ? 1 : 2 + rng.int(2), waitMin: lazy ? 2 + rng.int(3) : 5 + rng.int(6) }
}

/**
 * Autopilot bots work through the synthetic stops so the ops numbers keep moving. Outcomes come from each stop's
 * hidden RTO probability; Bonus riders get the configured uplift on flagged orders. Stops reserved for the live demo are skipped.
 * Failure split and fake-attempt share are ASSUMPTIONS the pilot will measure.
 */
export const AUTOPILOT = { refusedShareOfFailures: 0.4, fakeAttemptShare: 0.04, lazyAttemptShare: 0.15, otp: '0000', stepMs: 40, simMinutesPerStop: 2 } as const

export interface AutopilotOptions {
  readonly count: number
  readonly seed: number
  readonly at: number
  /** Order ids the bots must leave alone (for example orders tied to a real phone) */
  readonly skip?: ReadonlySet<string>
  /** Also work the stops reserved for a live demo (Close pilot: the demo is over) */
  readonly includeManual?: boolean
}

/** Plan up to `count` stops, one per rider per round so every bag advances together. Pure: returns actions, applies nothing. */
export function planAutopilot(s: DayState, opts: AutopilotOptions): readonly Action[] {
  const bags = s.riders.map((r) =>
    s.stopOrder
      .map((id) => s.stops[id])
      .filter((st) => st.riderId === r.id && st.status === 'out_for_delivery' && (opts.includeManual || !st.manual) && !opts.skip?.has(st.order.id))
      .sort((a, b) => a.seq - b.seq),
  )
  const picked: DayState['stops'][string][] = []
  for (let round = 0; picked.length < opts.count; round++) {
    let any = false
    for (let i = 0; i < bags.length && picked.length < opts.count; i++) {
      const stop = bags[i][round]
      if (stop) {
        picked.push(stop)
        any = true
      }
    }
    if (!any) break
  }

  const actions: Action[] = []
  let at = opts.at
  const tick = (): number => {
    at += AUTOPILOT.stepMs
    return at
  }
  for (const stop of picked) {
    const id = stop.order.id
    // A later attempt of the same order gets its own draw (attempt 1 keeps its original seed).
    const rng = createRng((hashSeed(id) ^ opts.seed ^ Math.imul(stop.failedAttempts, 0x9e3779b9)) >>> 0)
    const pDeliver = clamp(1 - stop.pRto + (stop.flagged && stop.arm === 'bonus' ? s.config.uplift : 0), 0, 1)
    if (rng.next() < pDeliver) {
      actions.push({ type: 'riderDeliver', at: tick(), orderId: id, code: AUTOPILOT.otp })
      actions.push({ type: 'submitOtp', at: tick(), orderId: id, code: AUTOPILOT.otp })
    } else if (rng.next() < AUTOPILOT.refusedShareOfFailures) {
      actions.push({ type: 'riderRefuse', at: tick(), orderId: id, code: AUTOPILOT.otp })
      actions.push({ type: 'submitOtp', at: tick(), orderId: id, code: AUTOPILOT.otp })
    } else {
      const fake = rng.chance(AUTOPILOT.fakeAttemptShare)
      const evidence = bootEvidence(createRng((hashSeed(`${id}-evidence`) ^ opts.seed) >>> 0), fake)
      actions.push({ type: 'riderAttempt', at: tick(), orderId: id, claim: 'customer_unavailable', evidence })
      actions.push({ type: 'customerReach', at: tick(), orderId: id, reached: !fake })
    }
    // Sim time moves as the bots work: a few minutes per stop.
    actions.push({ type: 'advanceClock', at: tick(), minutes: AUTOPILOT.simMinutesPerStop })
  }
  return actions
}
