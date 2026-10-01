import { describe, expect, it } from 'vitest'
import { causalHeadline } from '../engine/headline.ts'
import { runAudit } from './audit.ts'
import { eventsOf } from './events.ts'
import { CONTACT_CAP, proactiveCount } from './helpers.ts'
import { costLedger, normalFloorBreached, savingsLedger } from './ledger.ts'
import { reduce } from './reducer.ts'
import { decisionFor } from './routing.ts'
import { demoRiders, stopsOf } from './selectors.ts'
import { AT, advanceHours, deliverOrder, forceParcel, heroStops, inspectParcel, refuseOrder, run, startedDay } from './testkit.ts'
import { dayHeadline, dayVerdict } from './verdictData.ts'
import { verdictConfigFor } from './rule.ts'
import type { OrderStatus } from './lifecycle.ts'
import type { DayState } from './types.ts'

/**
 * The correctness fixes from the independent code review of 2 Oct (build prompt 27, part 1c). One describe per fix, each written to fail
 * on the code as it was before the fix.
 */
const day = startedDay()
const { bonus: bonusId, control: controlId } = heroStops(day)
const pid = `P-${bonusId}`
const record = (s: DayState) => s.parcels.find((p) => p.id === pid)!

const force = (s: DayState, ids: readonly string[], status: OrderStatus): DayState => ({
  ...s,
  stops: { ...s.stops, ...Object.fromEntries(ids.map((id) => [id, { ...s.stops[id], status }])) },
})

const faked = { gpsDistM: 900, calls: 0, waitMin: 0 }
const genuine = { gpsDistM: 40, calls: 3, waitMin: 6 }

describe('1c(i): the normal-order floor counts SETTLED orders, not only terminal ones', () => {
  it('a Bonus rider whose normal orders keep failing (still open) is judged on them', () => {
    const rider = demoRiders(day).bonus!.id
    const normalOf = (pick: (x: ReturnType<typeof stopsOf>[number]) => boolean) =>
      stopsOf(day)
        .filter((x) => !x.flagged && x.rehomedFrom === undefined && pick(x))
        .map((x) => x.order.id)
    const mine = normalOf((x) => x.originalRiderId === rider)
    const theirs = normalOf((x) => x.arm === 'control')
    expect(mine.length).toBeGreaterThanOrEqual(12)
    // 10 delivered and 2 failed-and-waiting (ndr is settled but not terminal): 10/12 = 83%, against Control at 100%.
    let s = force(day, mine.slice(0, 10), 'delivered_a1')
    s = force(s, mine.slice(10, 12), 'ndr')
    s = force(s, theirs, 'delivered_a1')
    expect(normalFloorBreached(s, rider)).toBe(true)
  })

  it('still passes a rider whose settled normal orders are as good as Control', () => {
    const rider = demoRiders(day).bonus!.id
    const mine = stopsOf(day).filter((x) => !x.flagged && x.rehomedFrom === undefined && x.originalRiderId === rider).map((x) => x.order.id)
    const theirs = stopsOf(day).filter((x) => !x.flagged && x.rehomedFrom === undefined && x.arm === 'control').map((x) => x.order.id)
    const s = force(force(day, mine.slice(0, 12), 'delivered_a1'), theirs, 'delivered_a1')
    expect(normalFloorBreached(s, rider)).toBe(false)
  })
})

describe('1c(ii): a failed re-home books ONE reverse leg and NO batch saving', () => {
  const hard = inspectParcel(
    forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 }),
    bonusId,
  )
  const held = run(hard, { type: 'deskHold', at: AT + 2, parcelId: pid })
  const matched = run(held, { type: 'deskMatch', at: AT + 3, parcelId: pid })
  const newId = matched.parcels[0].rehomedStopId!
  const failed = refuseOrder(matched, newId, AT + 9)

  it('the parcel goes back once: one RTO reverse cost (the batched ₹84), not ₹120 + ₹84', () => {
    const reverse = costLedger(failed).find((c) => c.line === 'RTO reverse')
    expect(reverse).toMatchObject({ amount: 84, count: 1 })
  })

  it('books no saving at all (no "Batched return" saving on a failed re-home)', () => {
    expect(savingsLedger(failed).total).toBe(0)
    expect(savingsLedger(failed).lines).toEqual([])
  })

  it('the Audit rule "every RTO has a cost owner" stays green: the re-home order carries no cost of its own, its original does', () => {
    expect(failed.stops[newId].status).toBe('rto')
    expect(failed.stops[bonusId].status).toBe('rto')
    expect(runAudit(failed).find((c) => c.id === 'rto-cost-owner')?.ok).toBe(true)
  })

  it('a hold that simply expires still books its batched saving (only a FAILED re-home books none)', () => {
    const expired = advanceHours({ ...held, parcels: held.parcels.map((p) => ({ ...p, matchAt: undefined })) }, 48)
    expect(savingsLedger(expired).lines.map((l) => l.line)).toEqual(['Batched return'])
  })
})

describe('1c(iii): a second chance never exceeds maxAttempts', () => {
  const oneAttempt: DayState = { ...day, config: { ...day.config, maxAttempts: 1 } }
  const refused = (s: DayState): DayState => forceParcel(refuseOrder(s, bonusId), bonusId, { reason: 'not_home' })

  it('with no attempt left the Router does not offer a second chance: the parcel goes to the next lane', () => {
    const s = refused(oneAttempt)
    expect(decisionFor(s, record(s)).lane).not.toBe('second_chance')
  })

  it('the Desk cannot send a second chance when no attempt is left', () => {
    const s = refused(oneAttempt)
    const after = reduce(s, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
    expect(record(after).state).toBe('queued')
    expect(proactiveCount(after, bonusId)).toBe(proactiveCount(s, bonusId))
  })

  it('an accepted second chance that would be attempt 3 sends the parcel on instead of back out', () => {
    // The offer went out while an attempt was left; the cap was then lowered.
    const sent = run(refused(day), { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
    const lowered: DayState = { ...sent, config: { ...sent.config, maxAttempts: 1 } }
    const accepted = reduce(lowered, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'deliver' })
    expect(accepted.stops[bonusId].status).toBe('refused')
    expect(record(accepted).state).toBe('queued')
    expect(decisionFor(accepted, record(accepted)).lane).not.toBe('second_chance')
  })

  it('with the default two attempts a second chance still goes out as attempt 2', () => {
    const s = run(refused(day), { type: 'deskSecondChance', at: AT + 2, parcelId: pid }, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'deliver' })
    expect(s.stops[bonusId].status).toBe('out_for_delivery')
  })
})

describe('1c(iv): the ₹21 second-chance leg is a booked cost, and the saving is the gross ₹120', () => {
  const refused = forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_home' })
  const out = run(refused, { type: 'deskSecondChance', at: AT + 2, parcelId: pid }, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'deliver' })
  const leg = (s: DayState) => costLedger(s).find((c) => c.line === 'Second-chance re-attempt leg')

  it('books the leg as a Router cost the moment the order goes back out', () => {
    expect(leg(out)).toMatchObject({ amount: 21, stream: 'router', count: 1 })
  })

  it('a delivered second chance books the gross ₹120 return avoided (net ₹99 with the leg)', () => {
    const done = deliverOrder(out, bonusId, '1357')
    expect(savingsLedger(done).total).toBe(120)
    expect(savingsLedger(done).total - (leg(done)?.amount ?? 0)).toBe(99)
  })

  it('a FAILED second chance shows its cost and books no saving', () => {
    const failed = refuseOrder(out, bonusId, AT + 20)
    expect(leg(failed)).toMatchObject({ amount: 21 })
    expect(savingsLedger(failed).total).toBe(0)
  })

  it('a "different time" books the leg when the order goes back out, not before', () => {
    const later = run(refused, { type: 'deskSecondChance', at: AT + 2, parcelId: pid }, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'tomorrow' })
    expect(leg(later)).toBeUndefined()
    const next = reduce(later, { type: 'advanceDay', at: AT + 4 })
    expect(next.stops[bonusId].status).toBe('out_for_delivery')
    expect(leg(next)).toMatchObject({ amount: 21, count: 1 })
  })
})

describe('1c(v): a suspect attempt is not washed out by a later attempt', () => {
  const three: DayState = { ...day, config: { ...day.config, maxAttempts: 3 } }
  const attempt = (s: DayState, at: number, evidence = genuine): DayState => reduce(s, { type: 'riderAttempt', at, orderId: bonusId, claim: 'customer_unavailable', evidence })

  it('keeps the suspect rider on the stop after a good second attempt, and the same rider is still blocked', () => {
    let s = attempt(three, AT, faked)
    s = reduce(s, { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: false })
    const first = s.stops[bonusId].attemptRiderId!
    expect(s.stops[bonusId].suspectRiderIds).toEqual([first])
    // Handled by hand, back to the same rider, who then logs a clean-looking attempt and the customer says yes this time.
    s = reduce(s, { type: 'reattempt', at: AT + 2, orderId: bonusId })
    s = reduce(s, { type: 'riderDeliver', at: AT + 3, orderId: bonusId, code: '1111' })
    s = attempt(run(s, { type: 'submitOtp', at: AT + 3, orderId: bonusId, code: '9999' }), AT + 4)
    s = reduce(s, { type: 'customerReach', at: AT + 5, orderId: bonusId, reached: true })
    expect(s.stops[bonusId].assessment?.status).toBe('verified')
    expect(s.stops[bonusId].suspectRiderIds).toEqual([first])
    s = reduce(s, { type: 'reattempt', at: AT + 6, orderId: bonusId })
    const done = deliverOrder(s, bonusId, '2222', AT + 10)
    expect(done.stops[bonusId].riderId).toBe(first)
    expect(done.ledger[0]).toMatchObject({ status: 'blocked' })
    expect(done.ledger[0].reason).toMatch(/earlier attempt by this rider/)
  })

  it('a captain confirming the attempt valid lifts the block (the rider is cleared)', () => {
    let s = attempt(three, AT, faked)
    s = reduce(s, { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: false })
    s = reduce(s, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'confirm' })
    expect(s.stops[bonusId].suspectRiderIds ?? []).toEqual([])
  })

  it('another rider who delivers the order is paid normally', () => {
    let s = attempt(three, AT, faked)
    s = reduce(s, { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: false })
    s = reduce(s, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'free_reattempt' })
    const done = deliverOrder(s, bonusId, '3333', AT + 10)
    expect(done.ledger[0].status).not.toBe('blocked')
  })
})

describe('1c(vi): the second-chance send checks the lane and the cap before anything changes', () => {
  const refused = forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_home' })

  it('when the 4-message cap rejects the message, the parcel is NOT marked sent', () => {
    const fillers = Array.from({ length: CONTACT_CAP }, (_, i) => ({ id: `mx${i}`, orderId: bonusId, at: AT, simAt: AT, direction: 'out' as const, kind: 'attempt_check' as const, text: 'filler' }))
    const capped: DayState = { ...refused, messages: [...refused.messages, ...fillers] }
    expect(proactiveCount(capped, bonusId)).toBeGreaterThanOrEqual(CONTACT_CAP)
    const after = reduce(capped, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
    expect(record(after).state).toBe('queued')
    expect(eventsOf(after, 'SECOND_CHANCE_SENT')).toHaveLength(0)
    expect(eventsOf(after, 'MSG_REJECTED')).toHaveLength(1)
    expect(proactiveCount(after, bonusId)).toBe(proactiveCount(capped, bonusId))
  })

  it('no second chance after the customer declined', () => {
    const sent = run(refused, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
    const declined = reduce(sent, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: false })
    expect(record(declined).state).toBe('queued')
    const again = reduce(declined, { type: 'deskSecondChance', at: AT + 4, parcelId: pid })
    expect(again).toBe(declined)
  })

  it('no second chance after it expired', () => {
    const expired = advanceHours(run(refused, { type: 'deskSecondChance', at: AT + 2, parcelId: pid }), 25)
    expect(record(expired).state).toBe('queued')
    const again = reduce(expired, { type: 'deskSecondChance', at: AT + 4, parcelId: pid })
    expect(again).toBe(expired)
  })

  it('no skip without a valid reason', () => {
    const bad = reduce(refused, { type: 'deskSkipSecondChance', at: AT + 2, parcelId: pid, reason: '' as never })
    expect(bad).toBe(refused)
    const missing = reduce(refused, { type: 'deskSkipSecondChance', at: AT + 2, parcelId: pid } as never)
    expect(missing).toBe(refused)
  })
})

describe("1c(vii): the headline's bonus cost reads the ledger (blocked and clawed-back bonuses are not a cost)", () => {
  it('the engine uses the amount actually owed when the day gives it', () => {
    const h = causalHeadline({ bonusTerminal: 10, bonusDelivered: 8, controlTerminal: 10, controlDelivered: 5, bonus: 15, reverse: 120, bonusPaid: 75 })
    expect(h.bonusCost).toBe(75)
    expect(causalHeadline({ bonusTerminal: 10, bonusDelivered: 8, controlTerminal: 10, controlDelivered: 5, bonus: 15, reverse: 120 }).bonusCost).toBe(120)
  })

  it('on a day: a clawed-back bonus is not counted in the headline cost', () => {
    const done = deliverOrder(deliverOrder(day, bonusId, '1111', AT + 100), controlId, '2222', AT + 200)
    expect(dayHeadline(done).bonusCost).toBe(15)
    const returned = run(done, { type: 'openReturn', at: AT + 400, orderId: bonusId })
    expect(returned.ledger[0].status).toBe('clawed_back')
    expect(dayHeadline(returned).bonusCost).toBe(0)
  })

  it('a blocked bonus is not counted either', () => {
    let s = reduce(day, { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable', evidence: faked })
    s = reduce(s, { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: false })
    s = reduce(s, { type: 'reattempt', at: AT + 2, orderId: bonusId })
    const done = deliverOrder(s, bonusId, '4444', AT + 10)
    expect(done.ledger[0].status).toBe('blocked')
    expect(dayHeadline(done).bonusCost).toBe(0)
  })
})

describe('1c(viii): normal-order data with no pairs is INCOMPLETE, not silently skipped', () => {
  it('says INCOMPLETE when the flagged side is fine but the normal side has no pair to judge', async () => {
    const { verdict, DEFAULT_VERDICT_CONFIG, ruleHash } = await import('../engine/verdict.ts')
    const cells = (prefix: string) => Array.from({ length: 8 }, (_, i) => ({ riderId: `${prefix}${i}`, pairId: `p${i}`, n: 250, y: prefix === 'b' ? 180 : 150 }))
    const data = {
      flagged: { bonus: { riders: cells('b'), open: 0 }, control: { riders: cells('c'), open: 0 } },
      normal: { bonus: { riders: [], open: 0 }, control: { riders: [], open: 0 } },
    }
    const v = verdict(data, DEFAULT_VERDICT_CONFIG, ruleHash(DEFAULT_VERDICT_CONFIG))
    expect(v.verdict).toBe('INCOMPLETE')
    expect(v.reason).toMatch(/normal orders/i)
    // Without normal data at all the rule is unchanged (no normal rule to judge).
    expect(verdict({ flagged: data.flagged }, DEFAULT_VERDICT_CONFIG, ruleHash(DEFAULT_VERDICT_CONFIG)).verdict).toBe('GO')
  })

  it('on a day, a normal side with no finished pairs does not hide behind GO/KILL', () => {
    const s = startedDay()
    expect(dayVerdict(s, verdictConfigFor(s.config)).verdict).toBe('INCOMPLETE')
  })
})

describe('1c(ix): a held parcel with no rider bag space falls through to the 48 h expiry', () => {
  const hard = inspectParcel(
    forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.2 }),
    bonusId,
  )
  const held = run(hard, { type: 'deskHold', at: AT + 2, parcelId: pid })

  it('a buyer appeared but no rider has room: it is not stuck on the shelf forever', () => {
    const buyerAt: DayState = { ...held, riders: [], parcels: held.parcels.map((p) => ({ ...p, matchAt: AT })) }
    const early = advanceHours(buyerAt, 24)
    expect(early.parcels[0].state).toBe('held')
    const late = advanceHours(buyerAt, 48)
    expect(late.parcels[0].state).toBe('batched')
    expect(eventsOf(late, 'HOLD_EXPIRED')).toHaveLength(1)
  })
})

describe('code review of 2 Oct: follow-up fixes', () => {
  it('a dispute closed because a re-attempt was set up by hand is not a captain decision: the scorecard and KPIs leave it out', async () => {
    const { captainScorecard, outcomeKpis } = await import('./captainView.ts')
    let s = reduce(day, { type: 'riderAttempt', at: AT + 1, orderId: bonusId, claim: 'customer_unavailable', evidence: { gpsDistM: 900, calls: 0, waitMin: 0 } })
    s = reduce(s, { type: 'reattempt', at: AT + 2, orderId: bonusId })
    expect(s.exceptions[0]).toMatchObject({ status: 'resolved', overtaken: true })
    expect(captainScorecard(s)).toMatchObject({ opened: 1, decided: 0, autoExpired: 0, decidedInTimeShare: undefined })
    expect(outcomeKpis(s)).toMatchObject({ cleared: 0, autoExpired: 0 })
  })

  it('a held bonus whose order is returned is clawed back cleanly: the Audit stays green and the rider is no longer told it is waiting', async () => {
    const { holdLine } = await import('../pages/rider/captainText.ts')
    const { translator } = await import('../pages/rider/i18n.ts')
    const { setPayment } = await import('./testkit.ts')
    let s = setPayment(day, bonusId, 'PREPAID')
    s = reduce(s, { type: 'riderAttempt', at: AT + 1, orderId: bonusId, claim: 'customer_unavailable', evidence: { gpsDistM: 150, calls: 0, waitMin: 2 } })
    s = reduce(s, { type: 'reattempt', at: AT + 2, orderId: bonusId })
    s = deliverOrder(s, bonusId, '2468', AT + 10)
    expect(s.ledger[0].review?.state).toBe('waiting')
    s = reduce(s, { type: 'openReturn', at: AT + 20, orderId: bonusId })
    expect(s.ledger[0].status).toBe('clawed_back')
    expect(runAudit(s).find((c) => c.id === 'bonus-hold-decided')?.ok).toBe(true)
    expect(holdLine(translator('en'), 15, s.ledger[0].review, s.ledger[0].status)).toBeUndefined()
  })

  it('the dispatchNextDay override also books the ₹21 second-chance leg', () => {
    const refused = forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_home' })
    let s = run(refused, { type: 'deskSecondChance', at: AT + 2, parcelId: pid }, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'tomorrow' })
    s = reduce(s, { type: 'dispatchNextDay', at: AT + 4, orderId: bonusId })
    expect(s.stops[bonusId].status).toBe('out_for_delivery')
    expect(costLedger(s).find((c) => c.line === 'Second-chance re-attempt leg')).toMatchObject({ amount: 21, count: 1 })
  })
})
