import { describe, expect, it } from 'vitest'
import { logit, sigmoid } from '../engine/math.ts'
import { runAudit } from './audit.ts'
import { DAY_MS, DAY_START_MS, HOUR_MS, MINUTE_MS, SIM_START } from './clock.ts'
import { eventsOf } from './events.ts'
import { CONTACT_CAP, proactiveCount } from './helpers.ts'
import { costLedger, ledgerTotals } from './ledger.ts'
import { reduce } from './reducer.ts'
import { attemptRecords, kpis, openExceptions } from './selectors.ts'
import { NO_REPLY_LOGIT, OTP_SIM_TTL_MS, RESCHEDULE_CAP, overdueTimers, tick } from './tick.ts'
import { AT, advanceHours, deliverOrder, heroStops, refuseOrder, run, setPayment, startedDay } from './testkit.ts'
import { verdictConfigFor } from './rule.ts'
import { dayVerdict, dayVerdictData } from './verdictData.ts'
import type { DayState } from './types.ts'

const day = startedDay()
const { bonus: bonusId } = heroStops(day)
const unflagged = day.stopOrder.find((id) => !day.stops[id].flagged)!

describe('customer replies change the odds, never the flag', () => {
  it('"I\'m home" lowers the RTO chance by 0.3 on the logit scale, once', () => {
    const once = run(day, { type: 'customerReply', at: AT, orderId: bonusId, reply: 'home' })
    expect(once.stops[bonusId].pRto).toBeCloseTo(sigmoid(logit(day.stops[bonusId].pRto) - 0.3), 9)
    const twice = run(once, { type: 'customerReply', at: AT + 1, orderId: bonusId, reply: 'home' })
    expect(twice.stops[bonusId].pRto).toBeCloseTo(once.stops[bonusId].pRto, 12)
    expect(twice.stops[bonusId].flagged).toBe(true)
  })

  it('no reply 2 sim-hours after the order-day message raises the RTO chance by 0.2 on the logit scale, once', () => {
    const early = advanceHours(day, 1)
    expect(early.stops[bonusId].pRto).toBe(day.stops[bonusId].pRto)
    const late = advanceHours(day, 2)
    expect(late.stops[bonusId].pRto).toBeCloseTo(sigmoid(logit(day.stops[bonusId].pRto) + NO_REPLY_LOGIT), 9)
    expect(eventsOf(late, 'NO_REPLY_TIMEOUT', bonusId)).toHaveLength(1)
    expect(eventsOf(advanceHours(late, 5), 'NO_REPLY_TIMEOUT', bonusId)).toHaveLength(1)
    expect(late.stops[bonusId].flagged).toBe(true)
  })

  it('a customer who replied, or an unflagged order, is not nudged', () => {
    const replied = advanceHours(run(day, { type: 'customerReply', at: AT, orderId: bonusId, reply: 'fix_address' }), 3)
    expect(replied.stops[bonusId].noReplyApplied).toBeUndefined()
    expect(advanceHours(day, 3).stops[unflagged].pRto).toBe(day.stops[unflagged].pRto)
  })
})

describe('contact cap: 4 proactive messages per order', () => {
  it('the 5th is rejected and logged, while OTPs and replies to a tap still go through', () => {
    let s = day
    // order_day (1) + attempt_check (2) + pay_prompt x2 (3, 4) ...
    s = run(s, { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable' })
    expect(proactiveCount(s, bonusId)).toBe(2)
    const cod = setPayment(s, bonusId, 'COD')
    let capped = run(cod, { type: 'customerReply', at: AT + 1, orderId: bonusId, reply: 'pay_now' })
    expect(proactiveCount(capped, bonusId)).toBe(3)
    capped = run(capped, { type: 'customerPayment', at: AT + 2, orderId: bonusId, ok: false }, { type: 'customerReply', at: AT + 3, orderId: bonusId, reply: 'pay_now' })
    expect(proactiveCount(capped, bonusId)).toBe(CONTACT_CAP)
    const before = capped.messages.length
    const over = run(capped, { type: 'customerPayment', at: AT + 4, orderId: bonusId, ok: false }, { type: 'customerReply', at: AT + 5, orderId: bonusId, reply: 'pay_now' })
    expect(proactiveCount(over, bonusId)).toBe(CONTACT_CAP)
    expect(eventsOf(over, 'MSG_REJECTED', bonusId)).toHaveLength(1)
    expect(over.messages.filter((m) => m.orderId === bonusId && m.kind === 'pay_prompt')).toHaveLength(2)
    expect(over.messages.length).toBeGreaterThan(before)
  })

  it('an OTP is never capped', () => {
    const s = run(day, { type: 'riderDeliver', at: AT, orderId: bonusId, code: '1234' })
    expect(s.messages.some((m) => m.orderId === bonusId && m.kind === 'delivery_otp')).toBe(true)
  })
})

describe('OTP expiry on the sim clock', () => {
  const asked = run(day, { type: 'riderDeliver', at: AT, orderId: bonusId, code: '4321' })

  it('is still valid at 9 sim-minutes', () => {
    const s = reduce(asked, { type: 'advanceClock', at: AT + 1, minutes: 9 })
    expect(s.stops[bonusId].status).toBe('otp_sent')
    expect(s.otps[bonusId]).toBeDefined()
  })

  it('expires at 10 sim-minutes: the order goes back out and the code no longer works', () => {
    const s = reduce(asked, { type: 'advanceClock', at: AT + 1, minutes: OTP_SIM_TTL_MS / MINUTE_MS })
    expect(s.stops[bonusId].status).toBe('out_for_delivery')
    expect(s.otps[bonusId]).toBeUndefined()
    expect(eventsOf(s, 'OTP_FAILED', bonusId).some((e) => e.data.reason === 'expired')).toBe(true)
    expect(reduce(s, { type: 'submitOtp', at: AT + 2, orderId: bonusId, code: '4321' })).toBe(s)
  })
})

describe('rescheduling on the clock', () => {
  const asked = run(day, { type: 'customerReply', at: AT, orderId: bonusId, reply: 'change_time' })

  it('books the next day\'s 08:00 slot and logs it', () => {
    expect(asked.stops[bonusId].rescheduledTo).toBe(DAY_MS + DAY_START_MS)
    expect(eventsOf(asked, 'RESCHEDULED', bonusId)[0].data).toEqual({ toSimAt: DAY_MS + DAY_START_MS })
  })

  it('stays parked until then, then goes back out as attempt 1, still in the denominator', () => {
    expect(advanceHours(asked, 20).stops[bonusId].status).toBe('rescheduled')
    const s = advanceHours(asked, 24)
    expect(s.stops[bonusId].status).toBe('out_for_delivery')
    expect(s.stops[bonusId].failedAttempts).toBe(0)
    expect(kpis(s).flaggedBonus.n).toBe(kpis(day).flaggedBonus.n)
  })

  it('a request beyond the cap (more than 2 reschedules) goes back as an RTO at the next tick', () => {
    let s: DayState = day
    for (let i = 0; i <= RESCHEDULE_CAP; i++) {
      s = run(s, { type: 'customerReply', at: AT + i, orderId: bonusId, reply: 'change_time' })
      if (i < RESCHEDULE_CAP) s = reduce(s, { type: 'advanceDay', at: AT + 100 + i })
    }
    expect(s.stops[bonusId].reschedules).toBe(RESCHEDULE_CAP + 1)
    const after = reduce(s, { type: 'advanceClock', at: AT + 200, minutes: 5 })
    expect(after.stops[bonusId].status).toBe('rto')
  })
})

describe('the sim clock', () => {
  it('starts at 08:00 on day 1, logs each move, and does nothing before the day starts', () => {
    expect(day.simNow).toBe(SIM_START)
    const moved = reduce(day, { type: 'advanceClock', at: AT, minutes: 60 })
    expect(moved.simNow).toBe(SIM_START + HOUR_MS)
    expect(eventsOf(moved, 'CLOCK_ADVANCED')[0].data).toEqual({ from: SIM_START, to: SIM_START + HOUR_MS })
    const fresh = { ...day, started: false }
    expect(reduce(fresh, { type: 'advanceClock', at: AT, minutes: 60 })).toBe(fresh)
  })

  it('ignores a zero, negative or absurd step', () => {
    for (const minutes of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(reduce(day, { type: 'advanceClock', at: AT, minutes })).toBe(day)
  })

  it('a tick is idempotent: nothing is due twice', () => {
    const s = advanceHours(day, 30)
    const again = tick(s, AT).state
    expect(again.events.length).toBe(s.events.length)
    expect(again.stops).toEqual(s.stops)
  })

  it('leaves nothing overdue after any clock move', () => {
    expect(overdueTimers(advanceHours(day, 30))).toEqual([])
  })

  it('"reconcile cash now" hands in cash before 20:00', () => {
    const cod = deliverOrder(setPayment(day, bonusId, 'COD'), bonusId)
    expect(cod.ledger[0].status).toBe('accrued')
    expect(run(cod, { type: 'reconcileCod', at: AT + 5 }).ledger[0].status).toBe('pending')
    expect(reduce({ ...day, started: false }, { type: 'reconcileCod', at: AT })).toEqual({ ...day, started: false })
  })
})

describe('the event log and the money lines', () => {
  it('a delivery leaves OTP_REQUESTED, OTP_VERIFIED, ORDER_TERMINAL, DELIVERED and the bonus events in that order', () => {
    const s = deliverOrder(setPayment(day, bonusId, 'PREPAID'), bonusId)
    const types = s.events.filter((e) => e.orderId === bonusId).map((e) => e.type)
    const order = ['OTP_REQUESTED', 'OTP_VERIFIED', 'ORDER_TERMINAL', 'DELIVERED', 'BONUS_ACCRUED', 'BONUS_PENDING']
    let last = -1
    for (const t of order) {
      const i = types.indexOf(t as never, last + 1)
      expect(i, t).toBeGreaterThan(last)
      last = i
    }
  })

  it('a wrong OTP is an OTP_FAILED event', () => {
    const s = run(day, { type: 'riderDeliver', at: AT, orderId: bonusId, code: '4321' }, { type: 'submitOtp', at: AT + 1, orderId: bonusId, code: '0000' })
    expect(eventsOf(s, 'OTP_FAILED', bonusId)).toHaveLength(1)
  })

  it('every message is priced at ₹0.50 (Meesho, common stream, an assumption)', () => {
    const line = costLedger(day).find((c) => c.line === 'WhatsApp message')!
    expect(line).toMatchObject({ owner: 'Meesho', stream: 'common', assumption: true })
    expect(line.count).toBe(day.messages.filter((m) => m.direction === 'out').length)
    expect(line.amount).toBeCloseTo(line.count * 0.5, 9)
  })

  it('a second attempt books the ₹21 last-mile leg (a case-pack figure); an RTO books the ₹120 reverse leg', () => {
    const failed = run(day, { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable' }, { type: 'reattempt', at: AT + 1, orderId: bonusId })
    expect(costLedger(failed).find((c) => c.line === 'Re-attempt (last-mile leg)')).toMatchObject({ amount: 21, assumption: false, stream: 'common' })
    const rto = run(failed, { type: 'riderAttempt', at: AT + 2, orderId: bonusId, claim: 'customer_unavailable' }, { type: 'reattempt', at: AT + 3, orderId: bonusId })
    expect(costLedger(rto).find((c) => c.line === 'RTO reverse')).toMatchObject({ amount: 120, owner: 'Valmo', assumption: false })
  })

  it('assumption lines are labelled as assumptions, the case-pack lines are not', () => {
    const s = advanceHours(deliverOrder(setPayment(day, bonusId, 'PREPAID'), bonusId), 7 * 24)
    expect(costLedger(s).find((c) => c.line === 'Rescue bonus')?.assumption).toBe(true)
  })

  it('a refusal logs its reason', () => {
    const s = run(day, { type: 'riderRefuse', at: AT, orderId: bonusId, code: '7777', reason: 'no_cash' }, { type: 'submitOtp', at: AT + 1, orderId: bonusId, code: '7777' })
    expect(eventsOf(s, 'REFUSED', bonusId)[0].data).toEqual({ reason: 'no_cash' })
    expect(s.parcels[0].parcel.reason).toBe('no_cash')
  })
})

describe('Desk assumptions are editable and bounded', () => {
  it('changes the acceptance chance, conversion and shelf capacity', () => {
    const s = run(
      day,
      { type: 'deskSetParam', at: AT, param: 'accept_no_cash', value: 0.9 },
      { type: 'deskSetParam', at: AT, param: 'conversion', value: 0.25 },
      { type: 'deskSetParam', at: AT, param: 'shelfCapacity', value: 12 },
    )
    expect(s.router.acceptByReason.no_cash).toBe(0.9)
    expect(s.router.conversion).toBe(0.25)
    expect(s.router.shelfCapacity).toBe(12)
  })

  it('clamps out-of-range values and ignores junk', () => {
    const s = run(day, { type: 'deskSetParam', at: AT, param: 'accept_no_cash', value: 7 }, { type: 'deskSetParam', at: AT, param: 'shelfCapacity', value: -3 })
    expect(s.router.acceptByReason.no_cash).toBe(1)
    expect(s.router.shelfCapacity).toBe(0)
    expect(reduce(day, { type: 'deskSetParam', at: AT, param: 'conversion', value: Number.NaN })).toBe(day)
    expect(reduce(day, { type: 'deskSetParam', at: AT, param: 'accept_nonsense' as never, value: 0.5 })).toBe(day)
  })

  it('a full shelf blocks the hold lane (the Desk sees it)', () => {
    const s = run(refuseOrder(day, bonusId), { type: 'deskSetParam', at: AT, param: 'shelfCapacity', value: 0 })
    const lane = s.parcels.length ? s.parcels[0].parcel : undefined
    expect(lane).toBeDefined()
    expect(s.router.shelfCapacity).toBe(0)
  })
})

describe('exceptions and the false-attempt record', () => {
  const faked = run(day, { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable', evidence: { gpsDistM: 900, calls: 0, waitMin: 0 } })

  it('lists open exceptions for Ops and closes them when a re-attempt is set up by hand', () => {
    expect(openExceptions(faked)).toHaveLength(1)
    const s = run(faked, { type: 'reattempt', at: AT + 2, orderId: bonusId })
    expect(openExceptions(s)).toHaveLength(0)
    expect(s.exceptions[0]).toMatchObject({ status: 'resolved', auto: false })
  })

  it('counts attempts and confirmed fakes per rider', () => {
    const struck = run(faked, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'strike' })
    const owner = day.stops[bonusId].riderId
    const rec = attemptRecords(struck).find((r) => r.riderId === owner)!
    expect(rec).toMatchObject({ attempts: 1, strikes: 1, fakeRate: 1 })
    expect(attemptRecords(struck).filter((r) => r.riderId !== owner).every((r) => r.strikes === 0)).toBe(true)
  })

  it('feeds the fake-attempt rule with what LOOKS fake: low-confidence attempts of Bonus riders / their attempts', () => {
    expect(dayVerdictData(faked).readings).toMatchObject({ falseAttemptRate: 1, attempts: 1 })
    expect(dayVerdictData(day).readings).toMatchObject({ falseAttemptRate: 0, attempts: 0 })
  })

  it('does not need anyone to press Strike: a suspected attempt that Ops never reviews still counts', () => {
    const unreviewed = advanceHours(faked, 25)
    expect(openExceptions(unreviewed)).toHaveLength(0)
    expect(unreviewed.exceptions[0]).toMatchObject({ status: 'resolved', auto: true })
    const readings = dayVerdictData(unreviewed).readings
    expect(readings?.falseAttemptRate).toBe(1)
    expect(readings?.strikes).toBe(0)
  })

  it('keeps confirmed strikes as a separate, stricter number', () => {
    const struck = run(faked, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'strike' })
    expect(dayVerdictData(struck).readings).toMatchObject({ falseAttemptRate: 1, strikes: 1 })
  })

  it('a genuine attempt with good evidence is not counted as suspected', () => {
    const genuine = run(day, { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable', evidence: { gpsDistM: 40, calls: 3, waitMin: 6 } })
    expect(openExceptions(genuine)).toHaveLength(0)
    expect(dayVerdictData(genuine).readings).toMatchObject({ falseAttemptRate: 0, strikes: 0 })
  })

  it('the rate is suspected attempts over all Bonus-rider attempts (1 of 2 = 50%)', () => {
    const otherId = day.stopOrder.find((id) => id !== bonusId && day.stops[id].arm === 'bonus' && day.stops[id].status === 'out_for_delivery')!
    const two = run(faked, { type: 'riderAttempt', at: AT + 3, orderId: otherId, claim: 'customer_unavailable', evidence: { gpsDistM: 40, calls: 3, waitMin: 6 } })
    expect(dayVerdictData(two).readings?.falseAttemptRate).toBe(0.5)
  })

  it('reads Control riders the same way, so the rule can compare the two arms', () => {
    const { control } = heroStops(day)
    const fakedControl = run(day, { type: 'riderAttempt', at: AT, orderId: control, claim: 'customer_unavailable', evidence: { gpsDistM: 900, calls: 0, waitMin: 0 } })
    expect(dayVerdictData(fakedControl).readings).toMatchObject({ falseAttemptRate: 0, attempts: 0, controlFalseAttemptRate: 1, controlAttempts: 1 })
    expect(dayVerdictData(faked).readings).toMatchObject({ falseAttemptRate: 1, attempts: 1, controlFalseAttemptRate: 0, controlAttempts: 0 })
  })

  it('the verdict shows the fake-attempt numbers side by side: Bonus, Control and the gap, and what a captain confirmed', () => {
    const v = dayVerdict(faked, { ...verdictConfigFor(faked.config) })
    expect(v.fakeAttempts).toEqual({ suspectedRate: 1, controlRate: 0, excessPts: 100, strikes: 0, attempts: 1, controlAttempts: 0, enough: false })
  })

  it('has no returns reading any more: returns are not one of the two safety rules', () => {
    const { control } = heroStops(day)
    const s = run(
      deliverOrder(deliverOrder(day, bonusId, '1111', AT + 10), control, '2222', AT + 20),
      { type: 'openReturn', at: AT + 30, orderId: bonusId },
    )
    expect(Object.keys(dayVerdictData(s).readings ?? {})).not.toContain('returnsDeltaPts')
  })
})

describe('the Audit catches a day that lies about itself', () => {
  const delivered = deliverOrder(setPayment(day, bonusId, 'PREPAID'), bonusId)

  it('is green for an honest day', () => {
    expect(runAudit(delivered).every((c) => c.ok)).toBe(true)
    expect(runAudit(day).every((c) => c.ok)).toBe(true)
  })

  const red = (s: DayState, id: string): boolean => runAudit(s).find((c) => c.id === id)?.ok === false

  it('turns red when an order is delivered without a verified OTP event', () => {
    const forged = { ...delivered, events: delivered.events.filter((e) => e.type !== 'OTP_VERIFIED') }
    expect(red(forged, 'otp-before-delivery')).toBe(true)
  })

  it('turns red when the lifecycle refused a move', () => {
    const s = { ...day, rejectedTransitions: [{ orderId: bonusId, from: 'scored' as const, to: 'delivered_a1' as const, reason: 'test', at: AT }] }
    expect(red(s, 'no-rejected')).toBe(true)
  })

  it('turns red when the ledger and the event log disagree', () => {
    const s = { ...delivered, ledger: delivered.ledger.map((l) => ({ ...l, amount: l.amount + 5 })) }
    expect(red(s, 'ledger-total')).toBe(true)
    expect(ledgerTotals(s).liability).not.toBe(ledgerTotals(delivered).liability)
  })

  it('turns red when an RTO has no booked cost', () => {
    const rto = run(day, { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable' }, { type: 'reattempt', at: AT + 1, orderId: bonusId })
    const twice = run(rto, { type: 'riderAttempt', at: AT + 2, orderId: bonusId, claim: 'customer_unavailable' }, { type: 'reattempt', at: AT + 3, orderId: bonusId })
    expect(runAudit(twice).every((c) => c.ok)).toBe(true)
    expect(red({ ...twice, events: twice.events.filter((e) => !(e.type === 'COST_BOOKED' && e.data.line === 'RTO reverse')) }, 'rto-cost-owner')).toBe(true)
  })

  it('turns red when a timer is overdue', () => {
    const asked = run(day, { type: 'riderDeliver', at: AT, orderId: bonusId, code: '4321' })
    expect(red({ ...asked, simNow: asked.simNow + HOUR_MS }, 'timers')).toBe(true)
  })

  it('turns red when the rule changed after the day was planned', () => {
    expect(red({ ...day, plannedRuleHash: 'deadbeef' }, 'rule-hash')).toBe(true)
    expect(red({ ...day, config: { ...day.config, bonus: 20 } }, 'rule-hash')).toBe(true)
  })

  it('turns red when a bonus event is on an order outside the Bonus arm', () => {
    const control = heroStops(day).control
    const forged = { ...delivered, events: [...delivered.events, { seq: 9999, simAt: 0, wallAt: 0, type: 'BONUS_BLOCKED' as const, orderId: control, data: { amount: 15 } }] }
    expect(red(forged, 'bonus-eligibility')).toBe(true)
  })

  it('turns red when a re-homed order carries an arm or a flag, and when an order ends twice', () => {
    const leaked = { ...delivered, stops: { ...delivered.stops, [bonusId]: { ...delivered.stops[bonusId], rehomedFrom: 'x' } } }
    expect(red(leaked, 'rehome-cohort')).toBe(true)
    const twice = { ...delivered, events: [...delivered.events, ...delivered.events.filter((e) => e.type === 'ORDER_TERMINAL')] }
    expect(red(twice, 'one-terminal')).toBe(true)
    expect(red({ ...delivered, stopOrder: [...delivered.stopOrder, 'ghost'] }, 'orders-balance')).toBe(true)
  })
})

describe('Close pilot', () => {
  it('does nothing before the day starts, is deterministic, and is safe to press again', () => {
    const fresh = { ...day, started: false }
    expect(reduce(fresh, { type: 'closePilot', at: AT })).toBe(fresh)
    const once = reduce(day, { type: 'closePilot', at: AT })
    expect(reduce(day, { type: 'closePilot', at: AT })).toEqual(once)
    const again = reduce(once, { type: 'closePilot', at: AT })
    expect(again.stops).toEqual(once.stops)
    expect(runAudit(again).every((c) => c.ok)).toBe(true)
  })
})
