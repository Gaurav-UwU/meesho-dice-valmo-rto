import { causalHeadline, type CausalHeadline } from '../engine/headline.ts'
import type { Arm } from '../engine/types.ts'
import { verdict, type ArmSample, type GuardrailReadings, type RiderCell, type VerdictConfig, type VerdictData, type VerdictResult } from '../engine/verdict.ts'
import { isDelivered, isSettled, isTerminal } from './lifecycle.ts'
import { plannedRuleHash, verdictConfigFor } from './rule.ts'
import { stopsOf } from './selectors.ts'
import type { DayState, StopRecord } from './types.ts'

/** One arm of one order class (flagged or normal). An order counts for the rider it was first given to, and that rider's pair decides who they are compared with. */
function armSample(s: DayState, stops: readonly StopRecord[]): ArmSample {
  const pairOf = new Map(s.riders.map((r) => [r.id, r.pairId]))
  const byRider = new Map<string, { n: number; y: number }>()
  let open = 0
  for (const st of stops) {
    if (!isTerminal(st.status)) {
      open++
      continue
    }
    const id = st.originalRiderId ?? st.riderId
    const cell = byRider.get(id) ?? { n: 0, y: 0 }
    byRider.set(id, { n: cell.n + 1, y: cell.y + (isDelivered(st.status) ? 1 : 0) })
  }
  const riders: RiderCell[] = [...byRider.entries()].map(([riderId, c]) => ({ riderId, pairId: pairOf.get(riderId) ?? riderId, ...c }))
  return { riders, open }
}

/**
 * The fake-attempt safety rule reads what LOOKS fake: attempts that opened an exception (the phone was far from the address, or the customer said
 * nobody came) over all attempts logged, for Bonus riders AND for Control riders. The rule compares the two (Bonus no more than 2 points above
 * Control), because a fake rate both arms share is not something the bonus caused. It does not wait for a captain to press Strike, because a
 * dispute nobody reviews still resolves by itself after 24 h. Confirmed strikes (Bonus arm) are returned as a separate, stricter number.
 */
function guardrailReadings(s: DayState): GuardrailReadings {
  const of = (type: string, arm: Arm): number => s.events.filter((e) => e.type === type && e.arm === arm).length
  // Only exceptions opened because the attempt LOOKS fake count. One opened because a rider is on the enhanced-review step (every failed attempt is
  // reviewed) says nothing about this attempt, so it is left out.
  const suspected = (arm: Arm): number => s.events.filter((e) => e.type === 'EXCEPTION_OPENED' && e.arm === arm && e.data.enhanced !== true).length
  const rate = (arm: Arm): { readonly attempts: number; readonly rate: number } => {
    const attempts = of('ATTEMPT_LOGGED', arm)
    return { attempts, rate: attempts === 0 ? 0 : suspected(arm) / attempts }
  }
  const bonus = rate('bonus')
  const control = rate('control')
  return {
    falseAttemptRate: bonus.rate,
    attempts: bonus.attempts,
    controlFalseAttemptRate: control.rate,
    controlAttempts: control.attempts,
    strikes: of('STRIKE', 'bonus'),
  }
}

/**
 * What the verdict reads from a day: flagged and normal orders by the arm stamped at dispatch, split by original rider.
 * Re-homed parcels (a new order in their own cohort) and cancelled orders stay out.
 */
export function dayVerdictData(s: DayState): VerdictData {
  const inArm = (arm: Arm, flagged: boolean): StopRecord[] =>
    stopsOf(s).filter((x) => x.arm === arm && x.flagged === flagged && x.rehomedFrom === undefined && x.status !== 'cancelled')
  return {
    flagged: { bonus: armSample(s, inArm('bonus', true)), control: armSample(s, inArm('control', true)) },
    normal: { bonus: armSample(s, inArm('bonus', false)), control: armSample(s, inArm('control', false)) },
    readings: guardrailReadings(s),
  }
}

/** The day's verdict on today's data. `config` defaults to the rule the day was planned with. */
export function dayVerdict(s: DayState, config: VerdictConfig = verdictConfigFor(s.config)): VerdictResult {
  return verdict(dayVerdictData(s), config, s.plannedRuleHash ?? plannedRuleHash(s.config))
}

/**
 * "The bonus caused X extra deliveries at ₹Y": Bonus arm against Control arm on flagged orders.
 * While the day runs, orders count "as it stands" (attempted and delivered or failed so far), so the numbers are PROVISIONAL
 * and `dayVerdict` says INCOMPLETE until 90% of flagged orders have a final outcome.
 */
export function dayHeadline(s: DayState, verdictResult: VerdictResult = dayVerdict(s)): CausalHeadline {
  const counts = (arm: Arm): { readonly n: number; readonly y: number } => {
    const settled = stopsOf(s).filter((x) => x.arm === arm && x.flagged && x.rehomedFrom === undefined && isSettled(x.status))
    return { n: settled.length, y: settled.filter((x) => isDelivered(x.status)).length }
  }
  const b = counts('bonus')
  const c = counts('control')
  return causalHeadline({
    bonusTerminal: b.n,
    bonusDelivered: b.y,
    controlTerminal: c.n,
    controlDelivered: c.y,
    bonus: s.config.bonus,
    // What the ledger actually owes: a blocked or clawed-back bonus is not a cost.
    bonusPaid: s.ledger.filter((l) => l.status !== 'blocked' && l.status !== 'clawed_back').reduce((t, l) => t + l.amount, 0),
    reverse: verdictConfigFor(s.config).reverse,
    ci95: Number.isFinite(verdictResult.ci95[0]) && Number.isFinite(verdictResult.ci95[1]) ? verdictResult.ci95 : undefined,
  })
}
