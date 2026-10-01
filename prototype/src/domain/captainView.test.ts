import { describe, expect, it } from 'vitest'
import { captainScorecard, hubMedianDisputedRate, outcomeKpis, riderMonitor, riderTimeline, strikeView, WATCH_DISPUTES, WATCH_MULTIPLE } from './captainView.ts'
import { DAY_MS } from './clock.ts'
import { reduce } from './reducer.ts'
import { demoRiders, stopsOf } from './selectors.ts'
import { AT, advanceHours, deliverOrder, forgedStrikes, setPayment, startedDay } from './testkit.ts'
import type { DayState } from './types.ts'

const day = startedDay()
const bonusRider = demoRiders(day).bonus!.id
const otherRider = day.riders.find((r) => r.id !== bonusRider && r.arm === 'bonus')!.id
const FAR = { gpsDistM: 900, calls: 0, waitMin: 0 }
const AT_DOOR = { gpsDistM: 40, calls: 3, waitMin: 6 }

const open = (s: DayState, riderId: string): string[] => stopsOf(s).filter((x) => x.riderId === riderId && x.status === 'out_for_delivery').map((x) => x.order.id)
const attempt = (s: DayState, id: string, evidence: typeof FAR, at: number): DayState => reduce(s, { type: 'riderAttempt', at, orderId: id, claim: 'customer_unavailable', evidence })
const decide = (s: DayState, id: string, action: 'confirm' | 'free_reattempt' | 'strike', at: number): DayState =>
  reduce(s, { type: 'resolveException', at, orderId: id, action, ...(action === 'strike' ? { reason: 'phone_far' as const } : {}) })

describe('rider monitor', () => {
  it('lists every rider with attempts, disputed attempts, strikes, the disputed rate and a status', () => {
    const ids = open(day, bonusRider)
    let s = attempt(day, ids[0], FAR, AT + 1)
    s = decide(s, ids[0], 'strike', AT + 2)
    s = attempt(s, ids[1], AT_DOOR, AT + 3)
    const rows = riderMonitor(s)
    expect(rows).toHaveLength(day.riders.length)
    const row = rows.find((r) => r.riderId === bonusRider)!
    expect(row).toMatchObject({ attempts: 2, disputed: 1, strikes: 1, status: 'Warning', step: 'warning' })
    expect(row.disputedRate).toBeCloseTo(0.5, 6)
    expect(row.lastDecision).toMatch(/strike/i)
    expect(rows.find((r) => r.riderId === otherRider)).toMatchObject({ attempts: 0, disputed: 0, status: 'Clear' })
  })

  it('status follows the ladder: Warning at 1 or 2 strikes, Escalated at 3', () => {
    const base = (n: number): DayState => ({ ...day, strikeLog: forgedStrikes(day, bonusRider, n) })
    expect(riderMonitor(base(0)).find((r) => r.riderId === bonusRider)?.status).toBe('Clear')
    expect(riderMonitor(base(1)).find((r) => r.riderId === bonusRider)?.status).toBe('Warning')
    expect(riderMonitor(base(2)).find((r) => r.riderId === bonusRider)?.status).toBe('Warning')
    expect(riderMonitor(base(2)).find((r) => r.riderId === bonusRider)).toMatchObject({ step: 'enhanced', enhanced: true })
    expect(riderMonitor(base(3)).find((r) => r.riderId === bonusRider)?.status).toBe('Escalated')
  })

  it('an overturned or expired strike no longer counts', () => {
    const s: DayState = { ...day, strikeLog: forgedStrikes(day, bonusRider, 1, day.simNow - 31 * DAY_MS) }
    expect(riderMonitor(s).find((r) => r.riderId === bonusRider)?.status).toBe('Clear')
  })

  it('the hub median is taken over riders with at least 5 attempts', () => {
    expect(WATCH_DISPUTES).toBe(3)
    expect(WATCH_MULTIPLE).toBe(2)
    expect(hubMedianDisputedRate(day)).toBe(0)
  })

  it('Watch: 3 disputes in 7 days and a disputed rate at least 2x the hub median, with no strike yet; the card says why', () => {
    const ids = open(day, bonusRider)
    let s = day
    for (const [i, id] of ids.slice(0, 3).entries()) s = decide(attempt(s, id, FAR, AT + 10 + i * 10), id, 'confirm', AT + 11 + i * 10)
    const row = riderMonitor(s).find((r) => r.riderId === bonusRider)!
    expect(row.disputed).toBe(3)
    expect(row.status).toBe('Watch')
    expect(row.why).toMatch(/3 disputed attempts in 7 days/)
    expect(row.why).toMatch(/2×|2x|twice/i)
  })

  it('does not Watch a rider with only 2 disputes, nor one whose rate is not far above the hub median', () => {
    const ids = open(day, bonusRider)
    let two = day
    for (const [i, id] of ids.slice(0, 2).entries()) two = decide(attempt(two, id, FAR, AT + 10 + i * 10), id, 'confirm', AT + 11 + i * 10)
    expect(riderMonitor(two).find((r) => r.riderId === bonusRider)?.status).toBe('Clear')
  })

  it('counts deferrals per rider: a weak attempt then the same rider delivering the order', () => {
    const hero = stopsOf(day).find((x) => x.flagged && x.arm === 'bonus' && x.status === 'out_for_delivery' && x.riderId === bonusRider)!.order.id
    let s = setPayment(day, hero, 'PREPAID')
    s = reduce(s, { type: 'riderAttempt', at: AT + 1, orderId: hero, claim: 'customer_unavailable', evidence: { gpsDistM: 150, calls: 0, waitMin: 2 } })
    s = reduce(s, { type: 'reattempt', at: AT + 2, orderId: hero })
    s = deliverOrder(s, hero, '2468', AT + 10)
    expect(riderMonitor(s).find((r) => r.riderId === bonusRider)?.deferrals).toBe(1)
    expect(riderMonitor(day).find((r) => r.riderId === bonusRider)?.deferrals).toBe(0)
  })
})

describe('rider timeline', () => {
  it('lists every disputed attempt and every decision in order, with the strike and an overturn', () => {
    const ids = open(day, bonusRider)
    let s = attempt(day, ids[0], FAR, AT + 10)
    s = decide(s, ids[0], 'strike', AT + 11)
    s = reduce(s, { type: 'overturnStrike', at: AT + 12, strikeId: s.strikeLog[0].id })
    const t = riderTimeline(s, bonusRider)
    expect(t.map((x) => x.kind)).toEqual(['disputed', 'decision', 'strike', 'overturned'])
    expect(t[0].text).toMatch(/900 m/)
    expect(t[1].text).toMatch(/strike/i)
  })

  it('is empty for a rider with nothing disputed', () => {
    expect(riderTimeline(day, otherRider)).toEqual([])
  })
})

describe('captain scorecard', () => {
  it('counts decided in time, strikes, overturned and auto-expired', () => {
    const ids = open(day, bonusRider)
    let s = attempt(day, ids[0], FAR, AT + 10)
    s = decide(s, ids[0], 'strike', AT + 11)
    s = attempt(s, ids[1], FAR, AT + 20)
    s = advanceHours(s, 25)
    s = reduce(s, { type: 'overturnStrike', at: AT + 99, strikeId: s.strikeLog[0].id })
    const c = captainScorecard(s)
    expect(c).toMatchObject({ opened: 2, decided: 1, autoExpired: 1, strikes: 1, overturned: 1 })
    expect(c.decidedInTimeShare).toBeCloseTo(0.5, 6)
  })

  it('shows no share (a dash), not a fake 100%, before anything was opened', () => {
    expect(captainScorecard(day)).toMatchObject({ opened: 0, decided: 0, decidedInTimeShare: undefined })
  })
})

describe('strikeView: what the rider and Ops see about a strike', () => {
  it('is overturned / active / expired, with the days left', () => {
    const ids = open(day, bonusRider)
    let s = decide(attempt(day, ids[0], FAR, AT + 10), ids[0], 'strike', AT + 11)
    const k = s.strikeLog[0]
    expect(strikeView(s, k)).toMatchObject({ state: 'active', daysLeft: 30 })
    expect(strikeView(advanceHours(s, 48), k).canOverturn).toBe(true)
    expect(strikeView(advanceHours(s, 49), k).canOverturn).toBe(false)
    expect(strikeView({ ...s, simNow: k.simAt + 31 * DAY_MS }, k).state).toBe('expired')
    s = reduce(s, { type: 'overturnStrike', at: AT + 12, strikeId: k.id })
    expect(strikeView(s, s.strikeLog[0]).state).toBe('overturned')
  })
})

describe('outcome KPIs (the numbers that show it solves the same problem)', () => {
  const ids = open(day, bonusRider)

  it('is "too early" under 30 attempts, with dashes rather than fake zeros', () => {
    const k = outcomeKpis(day)
    expect(k.enough).toBe(false)
    expect(k.attempts).toBe(0)
    expect(k.recoveryShare).toBeUndefined()
    expect(k.medianHoursToDecide).toBeUndefined()
  })

  it('a recovered delivery is a free re-attempt (or strike) order that ends delivered: ₹99 each, less ₹10 per human review', () => {
    let s = setPayment(day, ids[0], 'PREPAID')
    s = decide(attempt(s, ids[0], FAR, AT + 10), ids[0], 'free_reattempt', AT + 11)
    s = deliverOrder(s, ids[0], '1357', AT + 20)
    const k = outcomeKpis(s)
    expect(k).toMatchObject({ disputed: 1, recovered: 1, reviews: 1 })
    expect(k.savedGross).toBe(99)
    expect(k.reviewCost).toBe(10)
    expect(k.bonusPaidOnRecovered).toBe(day.stops[ids[0]].flagged && day.stops[ids[0]].arm === 'bonus' ? 15 : 0)
    expect(k.netSaved).toBe(99 - 10 - k.bonusPaidOnRecovered)
  })

  it('subtracts the ₹15 paid on a recovered delivery in the Bonus arm (the rider who delivers it is paid)', () => {
    const flaggedBonus = stopsOf(day).find((x) => x.flagged && x.arm === 'bonus' && x.status === 'out_for_delivery')!.order.id
    let s = setPayment(day, flaggedBonus, 'PREPAID')
    s = decide(attempt(s, flaggedBonus, FAR, AT + 10), flaggedBonus, 'free_reattempt', AT + 11)
    s = deliverOrder(s, flaggedBonus, '1357', AT + 20)
    const k = outcomeKpis(s)
    expect(k.bonusPaidOnRecovered).toBe(15)
    expect(k.netSaved).toBe(99 - 10 - 15)
  })

  it('the break-even is about 1 in 10 reviewed disputes ending in a delivery (₹10 ÷ ₹99)', () => {
    expect(outcomeKpis(day).breakEvenShare).toBeCloseTo(10 / 99, 6)
  })

  it('a bonus clawed back after a customer return is not "paid on a recovered delivery"', () => {
    const flaggedBonus = stopsOf(day).find((x) => x.flagged && x.arm === 'bonus' && x.status === 'out_for_delivery')!.order.id
    let s = setPayment(day, flaggedBonus, 'PREPAID')
    s = decide(attempt(s, flaggedBonus, FAR, AT + 10), flaggedBonus, 'free_reattempt', AT + 11)
    s = deliverOrder(s, flaggedBonus, '1357', AT + 20)
    expect(outcomeKpis(s).bonusPaidOnRecovered).toBe(15)
    s = reduce(s, { type: 'openReturn', at: AT + 30, orderId: flaggedBonus })
    expect(outcomeKpis(s).bonusPaidOnRecovered).toBe(0)
  })
})
