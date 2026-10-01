import { describe, expect, it } from 'vitest'
import { fakeGeo } from '../engine/testkit.ts'
import { runAudit } from './audit.ts'
import { OVERTURN_WINDOW_MS, activeCount, captainName, enhancedReview, ladderStep, strikeSupport, STRIKE_ACTIVE_MS } from './captain.ts'
import { DAY_MS, HOUR_MS } from './clock.ts'
import { createDay, DEFAULT_CONFIG } from './day.ts'
import { eventsOf } from './events.ts'
import { costLedger } from './ledger.ts'
import { reduce } from './reducer.ts'
import { demoRiders, stopsOf } from './selectors.ts'
import { AT, advanceHours, deliverOrder, forgedStrikes, heroStops, setPayment, startedDay } from './testkit.ts'
import type { DayState } from './types.ts'

/**
 * Fake-attempt control with the hub captain (plan 24): strike log, ladder, corroboration, overturn, the 24 h silence rule, and the parking-gap hold.
 * Everything here is independent of the bonus unless a test says otherwise.
 */
const day = startedDay()
const bonusRider = demoRiders(day).bonus!.id
const controlRider = demoRiders(day).control!.id
const { bonus: bonusId } = heroStops(day)

const FAR = { gpsDistM: 900, calls: 0, waitMin: 0 }
const AT_DOOR = { gpsDistM: 40, calls: 3, waitMin: 6 }
const WEAK = { gpsDistM: 150, calls: 0, waitMin: 2 }

const stopsOfRider = (s: DayState, riderId: string): string[] => stopsOf(s).filter((x) => x.riderId === riderId && x.status === 'out_for_delivery').map((x) => x.order.id)
const attempt = (s: DayState, orderId: string, evidence: { gpsDistM: number; calls: number; waitMin: number }, at = AT + 1): DayState => reduce(s, { type: 'riderAttempt', at, orderId, claim: 'customer_unavailable', evidence })
const never = (s: DayState, orderId: string, at = AT + 2): DayState => reduce(s, { type: 'customerReach', at, orderId, reached: false })
const decide = (s: DayState, orderId: string, action: 'confirm' | 'free_reattempt' | 'strike', extra: { reason?: 'phone_far' | 'customer_says_nobody_came' | 'repeated_pattern' | 'other'; note?: string } = {}, at = AT + 3): DayState =>
  reduce(s, { type: 'resolveException', at, orderId, action, ...extra })

/** A far-away fake attempt on one of the rider's orders, struck by the captain. */
const strikeOne = (s: DayState, orderId: string, at: number): DayState => decide(attempt(s, orderId, FAR, at), orderId, 'strike', { reason: 'phone_far' }, at + 1)

const ofBonus = stopsOfRider(day, bonusRider)
const ofControl = stopsOfRider(day, controlRider)

describe('the strike log and the ladder', () => {
  it('a strike is a log entry with its reason, the order, the time and the captain who decided it', () => {
    const s = strikeOne(day, ofBonus[0], AT + 10)
    expect(s.strikeLog).toHaveLength(1)
    expect(s.strikeLog[0]).toMatchObject({ riderId: bonusRider, orderId: ofBonus[0], reason: 'phone_far', captainName: captainName(day.hub) })
    expect(eventsOf(s, 'STRIKE')[0].data).toMatchObject({ reason: 'phone_far', captainName: captainName(day.hub), strikeId: s.strikeLog[0].id })
  })

  it('the ladder: 0 clear, 1 warning, 2 enhanced review, 3 escalated to the hub manager', () => {
    expect([0, 1, 2, 3, 4].map(ladderStep)).toEqual(['clear', 'warning', 'enhanced', 'escalated', 'escalated'])
    let s = day
    const counts: number[] = []
    for (const [i, id] of ofBonus.slice(0, 3).entries()) {
      s = strikeOne(s, id, AT + 10 + i * 10)
      counts.push(activeCount(s, bonusRider))
    }
    expect(counts).toEqual([1, 2, 3])
  })

  it('the third active strike escalates the rider once', () => {
    let s = day
    for (const [i, id] of ofBonus.slice(0, 3).entries()) s = strikeOne(s, id, AT + 10 + i * 10)
    expect(eventsOf(s, 'RIDER_ESCALATED')).toHaveLength(1)
    expect(eventsOf(s, 'RIDER_ESCALATED')[0].data).toMatchObject({ riderId: bonusRider })
  })

  it('a strike expires after 30 days (rolling) and no longer counts', () => {
    const s = strikeOne(day, ofBonus[0], AT + 10)
    expect(activeCount(s, bonusRider)).toBe(1)
    expect(activeCount({ ...s, simNow: s.strikeLog[0].simAt + STRIKE_ACTIVE_MS - HOUR_MS }, bonusRider)).toBe(1)
    expect(activeCount({ ...s, simNow: s.strikeLog[0].simAt + STRIKE_ACTIVE_MS }, bonusRider)).toBe(0)
  })

  it('a strike on a Control rider counts exactly the same: the ladder has nothing to do with the bonus', () => {
    const s = strikeOne(day, ofControl[0], AT + 10)
    expect(day.riders.find((r) => r.id === controlRider)?.arm).toBe('control')
    expect(activeCount(s, controlRider)).toBe(1)
    expect(s.strikeLog[0].riderId).toBe(controlRider)
  })

  it('a strike without a reason is rejected: nothing changes', () => {
    const faked = attempt(day, ofBonus[0], FAR)
    expect(decide(faked, ofBonus[0], 'strike')).toBe(faked)
    expect(decide(faked, ofBonus[0], 'strike', { reason: 'nonsense' as never })).toBe(faked)
    expect(faked.exceptions[0].status).toBe('open')
  })
})

describe('a strike needs corroboration, not the customer’s word alone', () => {
  const claimed = never(attempt(day, ofBonus[0], AT_DOOR), ofBonus[0])

  it('the customer saying "never came" opens a dispute but is not enough for a strike on its own', () => {
    expect(claimed.exceptions[0]).toMatchObject({ status: 'open', owner: 'hub_captain' })
    expect(strikeSupport(claimed, claimed.exceptions[0])).toEqual({ ok: false, signals: [] })
    expect(decide(claimed, ofBonus[0], 'strike', { reason: 'customer_says_nobody_came' })).toBe(claimed)
  })

  it('a written captain note makes it enough', () => {
    const s = decide(claimed, ofBonus[0], 'strike', { reason: 'customer_says_nobody_came', note: 'Neighbour saw nobody at the gate' })
    expect(s.strikeLog).toHaveLength(1)
    expect(s.strikeLog[0].note).toBe('Neighbour saw nobody at the gate')
  })

  it('a note that is only a couple of characters does not count', () => {
    expect(decide(claimed, ofBonus[0], 'strike', { reason: 'other', note: 'ok' })).toBe(claimed)
  })

  it('supporting evidence is enough without a note: the phone far away, no calls, no waiting', () => {
    const far = attempt(day, ofBonus[1], FAR)
    const support = strikeSupport(far, far.exceptions[0])
    expect(support.ok).toBe(true)
    expect(support.signals.join(' ')).toMatch(/900 m/)
    expect(support.signals.join(' ')).toMatch(/no calls/)
    expect(support.signals.join(' ')).toMatch(/no waiting/)
  })

  it('a repeated pattern (two other disputed attempts in 7 days) corroborates a customer-only dispute', () => {
    let s = day
    s = decide(attempt(s, ofBonus[0], FAR, AT + 10), ofBonus[0], 'confirm', {}, AT + 11)
    s = decide(attempt(s, ofBonus[1], FAR, AT + 20), ofBonus[1], 'confirm', {}, AT + 21)
    const third = never(attempt(s, ofBonus[2], AT_DOOR, AT + 30), ofBonus[2], AT + 31)
    const support = strikeSupport(third, third.exceptions.find((e) => e.status === 'open')!)
    expect(support.ok).toBe(true)
    expect(support.signals.join(' ')).toMatch(/repeated pattern/)
    expect(decide(third, ofBonus[2], 'strike', { reason: 'repeated_pattern' }, AT + 32).strikeLog).toHaveLength(1)
  })

  it('a free re-attempt and a confirm need no corroboration and no reason', () => {
    expect(decide(claimed, ofBonus[0], 'free_reattempt').exceptions[0]).toMatchObject({ status: 'resolved', action: 'free_reattempt' })
    expect(decide(claimed, ofBonus[0], 'confirm').exceptions[0]).toMatchObject({ status: 'resolved', action: 'confirm' })
  })
})

describe('Ops overturns within 48 h; the rider can ask for a review', () => {
  const struck = strikeOne(day, ofBonus[0], AT + 10)
  const id = struck.strikeLog[0].id

  it('an overturn removes the strike from the count and keeps the record', () => {
    const s = reduce(struck, { type: 'overturnStrike', at: AT + 20, strikeId: id })
    expect(activeCount(s, bonusRider)).toBe(0)
    expect(s.strikeLog[0].overturnedSim).toBe(s.simNow)
    expect(eventsOf(s, 'STRIKE_OVERTURNED')).toHaveLength(1)
  })

  it('works up to 48 h after the strike, and not after', () => {
    expect(OVERTURN_WINDOW_MS).toBe(48 * HOUR_MS)
    const inside = advanceHours(struck, 47)
    expect(reduce(inside, { type: 'overturnStrike', at: AT + 30, strikeId: id }).strikeLog[0].overturnedSim).toBeDefined()
    const outside = advanceHours(struck, 49)
    expect(reduce(outside, { type: 'overturnStrike', at: AT + 30, strikeId: id })).toBe(outside)
  })

  it('cannot be overturned twice, and an unknown strike does nothing', () => {
    const once = reduce(struck, { type: 'overturnStrike', at: AT + 20, strikeId: id })
    expect(reduce(once, { type: 'overturnStrike', at: AT + 21, strikeId: id })).toBe(once)
    expect(reduce(struck, { type: 'overturnStrike', at: AT + 20, strikeId: 'k999' })).toBe(struck)
  })

  it('"Ask for a review" flags the strike for Ops, once', () => {
    const asked = reduce(struck, { type: 'riderAskReview', at: AT + 20, strikeId: id })
    expect(asked.strikeLog[0].reviewAskedSim).toBe(asked.simNow)
    expect(eventsOf(asked, 'REVIEW_ASKED')).toHaveLength(1)
    expect(reduce(asked, { type: 'riderAskReview', at: AT + 21, strikeId: id })).toBe(asked)
  })

  it('a review cannot be asked for an overturned strike', () => {
    const once = reduce(struck, { type: 'overturnStrike', at: AT + 20, strikeId: id })
    expect(reduce(once, { type: 'riderAskReview', at: AT + 21, strikeId: id })).toBe(once)
  })
})

describe('step 2 of the ladder: every failed attempt is reviewed for 14 days', () => {
  const twoStrikes = (): DayState => {
    let s = day
    for (const [i, id] of ofBonus.slice(0, 2).entries()) s = strikeOne(s, id, AT + 10 + i * 10)
    return s
  }

  it('with 2 active strikes even a high-confidence failed attempt goes to the captain', () => {
    const s = twoStrikes()
    expect(enhancedReview(s, bonusRider)).toBe(true)
    const next = attempt(s, ofBonus[2], AT_DOOR, AT + 100)
    expect(next.exceptions.find((e) => e.orderId === ofBonus[2])).toMatchObject({ status: 'open', enhanced: true, confidence: 'high' })
  })

  it('with 0 or 1 strikes a high-confidence attempt opens nothing', () => {
    expect(attempt(day, ofBonus[2], AT_DOOR).exceptions).toHaveLength(0)
    const one = strikeOne(day, ofBonus[0], AT + 10)
    expect(attempt(one, ofBonus[2], AT_DOOR, AT + 100).exceptions.filter((e) => e.orderId === ofBonus[2])).toHaveLength(0)
  })

  it('the step lasts 14 days from the latest strike', () => {
    const old: DayState = { ...day, strikeLog: forgedStrikes(day, bonusRider, 2, day.simNow - 15 * DAY_MS) }
    expect(activeCount(old, bonusRider)).toBe(2)
    expect(enhancedReview(old, bonusRider)).toBe(false)
    expect(attempt(old, ofBonus[2], AT_DOOR).exceptions).toHaveLength(0)
  })

  it('an enhanced-review exception is not counted as a suspected fake attempt by the pilot rule', async () => {
    const { dayVerdictData } = await import('./verdictData.ts')
    const s = attempt(twoStrikes(), ofBonus[2], AT_DOOR, AT + 100)
    const before = dayVerdictData(twoStrikes()).readings
    const after = dayVerdictData(s).readings
    expect(after?.attempts).toBe((before?.attempts ?? 0) + 1)
    // the new attempt has strong evidence: it must not raise the suspected count
    expect(Math.round((after?.falseAttemptRate ?? 0) * (after?.attempts ?? 0))).toBe(Math.round((before?.falseAttemptRate ?? 0) * (before?.attempts ?? 0)))
  })

  it('at 2 active strikes any bonus is blocked (the existing rule, now read from the log)', () => {
    const s = deliverOrder(setPayment(twoStrikes(), bonusId, 'PREPAID'), bonusId, '1111', AT + 200)
    expect(s.stops[bonusId].riderId).toBe(bonusRider)
    expect(s.ledger[0]).toMatchObject({ status: 'blocked' })
    expect(s.ledger[0].reason).toMatch(/2 active strikes/)
  })

  it('an overturned strike lifts the block', () => {
    let s = twoStrikes()
    s = reduce(s, { type: 'overturnStrike', at: AT + 50, strikeId: s.strikeLog[0].id })
    const done = deliverOrder(setPayment(s, bonusId, 'PREPAID'), bonusId, '1111', AT + 200)
    expect(done.ledger[0].status).not.toBe('blocked')
  })
})

describe('24 h of silence: a free re-attempt marked "the captain did not decide"', () => {
  const faked = attempt(day, ofBonus[0], FAR)

  it('no strike, a free re-attempt, marked captainMissed', () => {
    const s = advanceHours(faked, 24)
    expect(s.exceptions[0]).toMatchObject({ status: 'resolved', action: 'free_reattempt', auto: true, captainMissed: true })
    expect(s.strikeLog).toHaveLength(0)
    expect(s.stops[ofBonus[0]].status).toBe('out_for_delivery')
    expect(eventsOf(s, 'EXCEPTION_RESOLVED')[0].data).toMatchObject({ captainMissed: true })
  })

  it('a captain decision is not marked as missed and costs one review (₹10)', () => {
    const s = decide(faked, ofBonus[0], 'free_reattempt')
    expect(s.exceptions[0].captainMissed).toBeUndefined()
    expect(s.exceptions[0].captainName).toBe(captainName(day.hub))
    expect(costLedger(s).find((c) => c.line === 'Exception review labour')).toMatchObject({ amount: 10, count: 1 })
  })

  it('the 24 h default is never a strike, whatever the reason chip', () => {
    // The tick passes auto = true; the reducer never turns an auto resolution into a strike.
    expect(advanceHours(faked, 30).strikeLog).toHaveLength(0)
  })
})

describe('independent of the bonus: a day with the bonus OFF still runs the whole control', () => {
  const off = reduce(createDay(fakeGeo(0, 1), { seed: 11, orders: 120, riders: 6, config: { ...DEFAULT_CONFIG, bonus: 0 } }), { type: 'startDay', at: AT })
  const offBonusRider = demoRiders(off).bonus!.id
  const offStops = stopsOfRider(off, offBonusRider)
  const offHero = heroStops(off).bonus

  it('opens exceptions, records strikes, applies the ladder and creates no ledger rows', () => {
    let s = off
    for (const [i, id] of offStops.slice(0, 2).entries()) s = strikeOne(s, id, AT + 10 + i * 10)
    expect(activeCount(s, offBonusRider)).toBe(2)
    expect(ladderStep(activeCount(s, offBonusRider))).toBe('enhanced')
    expect(eventsOf(s, 'EXCEPTION_OPENED')).toHaveLength(2)
    expect(s.ledger).toHaveLength(0)
    expect(s.events.some((e) => e.type.startsWith('BONUS_'))).toBe(false)
  })

  it('a delivered flagged order in the Bonus arm creates no ledger row, even after a weak attempt by the same rider', () => {
    let s = reduce(off, { type: 'riderAttempt', at: AT + 1, orderId: offHero, claim: 'customer_unavailable', evidence: WEAK })
    s = reduce(s, { type: 'reattempt', at: AT + 2, orderId: offHero })
    s = deliverOrder(setPayment(s, offHero, 'PREPAID'), offHero, '1111', AT + 10)
    expect(s.stops[offHero].status).toBe('delivered_a2')
    expect(s.ledger).toHaveLength(0)
    expect(s.events.some((e) => e.type.startsWith('BONUS_'))).toBe(false)
  })

  it('the Audit stays green and its bonus-off check passes', () => {
    let s = strikeOne(off, offStops[0], AT + 10)
    s = advanceHours(s, 2)
    const checks = runAudit(s)
    expect(checks.filter((c) => !c.ok)).toEqual([])
    expect(checks.find((c) => c.id === 'bonus-off-clean')?.ok).toBe(true)
  })
})

describe('the parking-gap hold: a weak earlier attempt by the SAME rider holds the ₹15 for the captain', () => {
  const weakThenDelivered = (evidence: typeof WEAK | typeof AT_DOOR, reached?: boolean): DayState => {
    let s = setPayment(day, bonusId, 'PREPAID')
    s = reduce(s, { type: 'riderAttempt', at: AT + 1, orderId: bonusId, claim: 'customer_unavailable', evidence })
    if (reached !== undefined) s = reduce(s, { type: 'customerReach', at: AT + 2, orderId: bonusId, reached })
    s = reduce(s, { type: 'reattempt', at: AT + 3, orderId: bonusId })
    return deliverOrder(s, bonusId, '2468', AT + 10)
  }

  it('a weak (medium) attempt then a same-rider delivery: the ₹15 accrues but waits for the captain', () => {
    const s = weakThenDelivered(WEAK)
    expect(s.stops[bonusId].riderId).toBe(bonusRider)
    expect(s.ledger).toHaveLength(1)
    expect(s.ledger[0]).toMatchObject({ amount: 15, status: 'pending' })
    expect(s.ledger[0].review).toMatchObject({ state: 'waiting' })
    expect(s.ledger[0].review?.why).toMatch(/earlier attempt/)
    expect(s.ledger[0].review?.weak).toMatchObject({ gpsDistM: 150, calls: 0, waitMin: 2, reached: null })
    expect(eventsOf(s, 'BONUS_HELD')).toHaveLength(1)
  })

  it('a high-confidence earlier attempt pays normally', () => {
    const s = weakThenDelivered(AT_DOOR)
    expect(s.ledger[0].review).toBeUndefined()
    expect(eventsOf(s, 'BONUS_HELD')).toHaveLength(0)
  })

  it('if the customer confirmed on WhatsApp that the rider came, it is cleared at once: only unconfirmed weak attempts go to the captain', () => {
    const s = weakThenDelivered(WEAK, true)
    expect(s.ledger[0].review).toMatchObject({ state: 'cleared', auto: 'customer_confirmed' })
    expect(eventsOf(s, 'BONUS_HELD')).toHaveLength(0)
  })

  it('the captain can release it: it carries on to the normal release at day 7, no longer waiting', () => {
    const held = weakThenDelivered(WEAK)
    const s = reduce(held, { type: 'reviewBonus', at: AT + 20, orderId: bonusId, decision: 'release' })
    expect(s.ledger[0]).toMatchObject({ status: 'pending' })
    expect(s.ledger[0].review).toMatchObject({ state: 'cleared', captainName: captainName(day.hub) })
    expect(costLedger(s).find((c) => c.line === 'Bonus hold review labour')).toMatchObject({ amount: 10 })
  })

  it('the captain can withhold it, but a withhold needs a reason chip', () => {
    const held = weakThenDelivered(WEAK)
    expect(reduce(held, { type: 'reviewBonus', at: AT + 20, orderId: bonusId, decision: 'withhold' })).toBe(held)
    const s = reduce(held, { type: 'reviewBonus', at: AT + 20, orderId: bonusId, decision: 'withhold', reason: 'phone_far' })
    expect(s.ledger[0]).toMatchObject({ status: 'blocked' })
    expect(s.ledger[0].reason).toMatch(/withheld by Captain/)
    expect(s.ledger[0].review).toMatchObject({ state: 'withheld', reason: 'phone_far' })
    expect(eventsOf(s, 'BONUS_BLOCKED').at(-1)?.data).toMatchObject({ afterAccrual: true, amount: 15 })
  })

  it('the ledger-total Audit check stays green after a withhold (the withheld ₹15 leaves what is owed)', () => {
    const s = reduce(weakThenDelivered(WEAK), { type: 'reviewBonus', at: AT + 20, orderId: bonusId, decision: 'withhold', reason: 'other' })
    expect(runAudit(s).find((c) => c.id === 'ledger-total')?.ok).toBe(true)
  })

  it('with no decision by the end of the 7-day window it is RELEASED by default (a captain’s silence never costs an honest rider)', () => {
    const held = weakThenDelivered(WEAK)
    const early = advanceHours(held, 6 * 24)
    expect(early.ledger[0]).toMatchObject({ status: 'pending' })
    expect(early.ledger[0].review?.state).toBe('waiting')
    const late = advanceHours(held, 8 * 24)
    expect(late.ledger[0].status).toBe('released')
    expect(late.ledger[0].review?.state).toBe('default_released')
    expect(eventsOf(late, 'BONUS_RELEASED')[0].data).toMatchObject({ defaulted: true })
  })

  it('another rider who delivers the order is paid normally (a free re-attempt goes to someone else)', () => {
    let s = setPayment(day, bonusId, 'PREPAID')
    s = decide(attempt(s, bonusId, FAR), bonusId, 'free_reattempt')
    s = deliverOrder(s, bonusId, '1357', AT + 10)
    expect(s.stops[bonusId].riderId).not.toBe(bonusRider)
    expect(s.ledger[0].review).toBeUndefined()
    expect(s.ledger[0].status).toBe('pending')
  })

  it('a captain who confirmed the earlier attempt valid clears it: nothing is held', () => {
    let s = setPayment(day, bonusId, 'PREPAID')
    s = reduce(s, { type: 'riderAttempt', at: AT + 1, orderId: bonusId, claim: 'customer_unavailable', evidence: FAR })
    s = decide(s, bonusId, 'confirm')
    s = reduce(s, { type: 'reattempt', at: AT + 4, orderId: bonusId })
    s = deliverOrder(s, bonusId, '2468', AT + 10)
    expect(s.ledger[0].review).toBeUndefined()
  })

  it('a rider whose own earlier attempt the customer said never happened is still blocked outright (no hold, no payment)', () => {
    const s = weakThenDelivered(WEAK, false)
    expect(s.ledger[0].status).toBe('blocked')
    expect(s.ledger[0].review).toBeUndefined()
  })
})
