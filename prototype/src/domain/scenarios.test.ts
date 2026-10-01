import { describe, expect, it } from 'vitest'
import { DEFAULT_VERDICT_CONFIG, compareArms, ruleHash, verdict } from '../engine/verdict.ts'
import { reduce } from './reducer.ts'
import { kpis, stopsOf } from './selectors.ts'
import { AT, forceParcel, heroStops, run, startedDay } from './testkit.ts'
import { verdictConfigFor } from './rule.ts'
import { dayVerdict, dayVerdictData } from './verdictData.ts'
import type { DayState } from './types.ts'

/**
 * Tier 0 of the 15 scenarios in work/15-prototype-v2-handoff.md section 7: 2, 4, 5, 13, 14, 15.
 * The other scenarios need the clock, the ledger and the Router timers (Tier 1).
 */
const day = startedDay()
const { bonus: bonusId, control: controlId } = heroStops(day)

const deliver = (s: DayState, id: string, code = '4321', at = AT + 100): DayState =>
  run(s, { type: 'riderDeliver', at, orderId: id, code }, { type: 'submitOtp', at: at + 1, orderId: id, code })

const flaggedIn = (s: DayState, arm: 'bonus' | 'control'): number => stopsOf(s).filter((x) => x.flagged && x.arm === arm).length

describe('scenario 2: the same kind of order in Control earns no bonus', () => {
  it('a flagged Control delivery is counted for Control and pays nothing', () => {
    const s = deliver(day, controlId)
    expect(s.stops[controlId].arm).toBe('control')
    expect(s.stops[controlId].status).toBe('delivered_a1')
    expect(s.ledger).toHaveLength(0)
    expect(kpis(s).flaggedControl.delivered).toBe(1)
    expect(kpis(s).flaggedBonus.delivered).toBe(0)
  })
})

describe('scenario 4: a genuine not-home becomes an attempt-2 delivery, counted to the original arm', () => {
  const notHome = run(
    day,
    { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable' },
    { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: true },
  )
  const original = day.stops[bonusId].riderId
  const other = day.riders.find((r) => r.arm === 'bonus' && r.id !== original)!

  it('the failed first attempt is recorded and the order is not delivered or lost', () => {
    expect(notHome.stops[bonusId].status).toBe('ndr')
    expect(notHome.stops[bonusId].failedAttempts).toBe(1)
    expect(notHome.stops[bonusId].assessment?.status).toBe('verified')
  })

  it('a re-attempt by another rider keeps the original arm and rider on the order', () => {
    const again = run(notHome, { type: 'reattempt', at: AT + 2, orderId: bonusId, riderId: other.id })
    const st = again.stops[bonusId]
    expect(st.status).toBe('out_for_delivery')
    expect(st.riderId).toBe(other.id)
    expect(st.originalRiderId).toBe(original)
    expect(st.arm).toBe('bonus')
  })

  it('delivering on the second attempt ends in delivered_a2, still in the Bonus arm, with the bonus accrued', () => {
    const prepaid = { ...notHome, stops: { ...notHome.stops, [bonusId]: { ...notHome.stops[bonusId], order: { ...notHome.stops[bonusId].order, payment: 'PREPAID' as const } } } }
    const s = deliver(run(prepaid, { type: 'reattempt', at: AT + 2, orderId: bonusId, riderId: other.id }), bonusId)
    expect(s.stops[bonusId].status).toBe('delivered_a2')
    expect(s.stops[bonusId].arm).toBe('bonus')
    expect(s.ledger).toHaveLength(1)
    expect(s.ledger[0]).toMatchObject({ orderId: bonusId, riderId: other.id, amount: 15, status: 'pending' })
    const k = kpis(s)
    expect(k.flaggedBonus).toMatchObject({ terminal: 1, delivered: 1, rate: 1 })
    expect(k.flaggedControl.terminal).toBe(0)
  })

  it('the arm never follows the rider: it is read from the order, not from whoever holds it now', () => {
    const control = day.riders.find((r) => r.arm === 'control')!
    const moved: DayState = { ...notHome, stops: { ...notHome.stops, [bonusId]: { ...notHome.stops[bonusId], riderId: control.id } } }
    const s = deliver(run(moved, { type: 'reattempt', at: AT + 2, orderId: bonusId }), bonusId)
    expect(kpis(s).flaggedBonus.delivered).toBe(1)
    expect(kpis(s).flaggedControl.delivered).toBe(0)
  })

  it('refuses to hand a re-attempt to a rider of the other arm', () => {
    const control = day.riders.find((r) => r.arm === 'control')!
    expect(reduce(notHome, { type: 'reattempt', at: AT + 2, orderId: bonusId, riderId: control.id })).toBe(notHome)
  })

  it('goes back as an RTO after the second failed attempt', () => {
    const second = run(
      notHome,
      { type: 'reattempt', at: AT + 2, orderId: bonusId },
      { type: 'riderAttempt', at: AT + 3, orderId: bonusId, claim: 'customer_unavailable' },
      { type: 'reattempt', at: AT + 4, orderId: bonusId },
    )
    expect(second.stops[bonusId].status).toBe('rto')
    expect(second.stops[bonusId].failedAttempts).toBe(2)
  })
})

describe('scenario 5: "Change time" becomes a next-day attempt and the order stays in the denominator', () => {
  const asked = run(day, { type: 'customerReply', at: AT, orderId: bonusId, reply: 'change_time' })

  it('parks the order as rescheduled but keeps it in its arm as an open order', () => {
    expect(asked.stops[bonusId].status).toBe('rescheduled')
    const k = kpis(asked)
    expect(k.flaggedBonus.n).toBe(flaggedIn(day, 'bonus'))
    expect(k.flaggedBonus.open).toBe(flaggedIn(day, 'bonus'))
    expect(k.flaggedBonus.terminal).toBe(0)
  })

  it('is still counted as open (not dropped) in the data the verdict reads', () => {
    const data = dayVerdictData(asked)
    expect(data.flagged.bonus.open).toBe(flaggedIn(day, 'bonus'))
  })

  it('the next-day attempt is still attempt 1, and a delivery then ends in delivered_a1', () => {
    const next = run(asked, { type: 'dispatchNextDay', at: AT + 10, orderId: bonusId })
    expect(next.stops[bonusId].status).toBe('out_for_delivery')
    expect(next.stops[bonusId].failedAttempts).toBe(0)
    expect(deliver(next, bonusId).stops[bonusId].status).toBe('delivered_a1')
  })

  it('cannot be delivered while it is parked', () => {
    expect(reduce(asked, { type: 'riderDeliver', at: AT + 1, orderId: bonusId, code: '1111' })).toBe(asked)
  })
})

describe('the accepted second chance no longer erases the failure', () => {
  const refused = forceParcel(run(day, { type: 'riderRefuse', at: AT, orderId: bonusId, code: '7777' }, { type: 'submitOtp', at: AT + 1, orderId: bonusId, code: '7777' }), bonusId, { reason: 'not_home' })
  const pid = refused.parcels[0].id
  const accepted = run(refused, { type: 'deskSecondChance', at: AT + 2, parcelId: pid }, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true })

  it('the order goes back out as attempt 2, still counted in its arm', () => {
    expect(accepted.stops[bonusId].status).toBe('out_for_delivery')
    expect(accepted.stops[bonusId].failedAttempts).toBe(1)
    expect(kpis(accepted).flaggedBonus.n).toBe(flaggedIn(day, 'bonus'))
  })

  it('delivering it ends in delivered_a2', () => {
    expect(deliver(accepted, bonusId).stops[bonusId].status).toBe('delivered_a2')
  })
})

describe('scenario 13: changing the decision rule after the day was planned makes the verdict INVALID', () => {
  it('the day stamps its rule hash when it starts', () => {
    expect(day.plannedRuleHash).toBe(ruleHash(verdictConfigFor(day.config)))
  })

  it('the same rule is judged; a changed rule is INVALID', () => {
    expect(dayVerdict(day).verdict).not.toBe('INVALID')
    const loosened = { ...verdictConfigFor(day.config), killFloor: 1 }
    expect(dayVerdict(day, loosened).verdict).toBe('INVALID')
  })

  it('an unfinished day is INCOMPLETE, honestly', () => {
    expect(dayVerdict(day).verdict).toBe('INCOMPLETE')
  })
})

describe('scenario 14: a guardrail breach is a KILL even with a strong uplift', () => {
  it('holds for data built from a day', () => {
    const data = dayVerdictData(day)
    const strong = {
      flagged: {
        bonus: { riders: Array.from({ length: 8 }, (_, i) => ({ riderId: `b${i}`, pairId: `p${i}`, n: 250, y: 190 })), open: 0 },
        control: { riders: Array.from({ length: 8 }, (_, i) => ({ riderId: `c${i}`, pairId: `p${i}`, n: 250, y: 150 })), open: 0 },
      },
      readings: { falseAttemptRate: 0.09, controlFalseAttemptRate: 0.04 },
    }
    expect(data.flagged.bonus.riders).toBeDefined()
    const v = verdict(strong, DEFAULT_VERDICT_CONFIG, ruleHash(DEFAULT_VERDICT_CONFIG))
    expect(v.upliftPer100).toBeCloseTo(16, 6)
    expect(v.verdict).toBe('KILL')
    expect(v.breachedGuardrail).toBe('false attempts')
  })
})

describe('scenario 15: the rider-by-rider cross-check is wider than the naive range on the same data', () => {
  it('when riders differ inside an arm', () => {
    const bonus = Array.from({ length: 8 }, (_, i) => ({ riderId: `b${i}`, pairId: `p${i}`, n: 250, y: [200, 160, 190, 150][i % 4] }))
    const control = Array.from({ length: 8 }, (_, i) => ({ riderId: `c${i}`, pairId: `p${i}`, n: 250, y: [170, 120, 160, 110][i % 4] }))
    const c = compareArms(bonus, control)
    expect(c.ci95[1] - c.ci95[0]).toBeGreaterThan(c.naiveCi95[1] - c.naiveCi95[0])
  })
})
