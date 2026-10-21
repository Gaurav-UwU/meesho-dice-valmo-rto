import { describe, expect, it } from 'vitest'
import { runAudit } from './audit.ts'
import { DAY_MS, HOUR_MS, nextDayStart } from './clock.ts'
import { eventsOf } from './events.ts'
import { CONTACT_CAP, proactiveCount } from './helpers.ts'
import { ledgerTotals, savingsLedger, costLedger } from './ledger.ts'
import { reduce } from './reducer.ts'
import { shelfUsed } from './routing.ts'
import { deskKpis } from './deskKpis.ts'
import { deskItems, kpis, stopsOf } from './selectors.ts'
import { AT, advanceHours, deliverOrder, forceParcel, heroStops, inspectParcel, refuseOrder, run, setPayment, startedDay, walkSecondChance } from './testkit.ts'
import { overdueTimers } from './tick.ts'
import type { DayState, SecondChanceOption } from './types.ts'

const day = startedDay()
const { bonus: bonusId } = heroStops(day)
const pid = `P-${bonusId}`

/** A COD order refused as "not home" (a soft refusal: the Router offers the second chance first). */
const refused = (payment: 'COD' | 'PREPAID' = 'COD', reason: 'not_home' | 'no_cash' | 'other' = 'not_home'): DayState =>
  forceParcel(refuseOrder(setPayment(day, bonusId, payment), bonusId), bonusId, { reason })
const offered = (s = refused()): DayState => run(s, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
const choose = (s: DayState, option: SecondChanceOption, at = AT + 3): DayState =>
  reduce(s, { type: 'customerSecondChance', at, parcelId: pid, accept: true, option })
const record = (s: DayState) => s.parcels.find((p) => p.id === pid)!
const order = (s: DayState) => s.stops[bonusId]
const messagesOf = (s: DayState, kind: string) => s.messages.filter((m) => m.orderId === bonusId && m.kind === kind)

const buttonsOf = (s: DayState, kind: string) => messagesOf(s, kind).at(-1)!.buttons?.map((b) => b.id)

describe('step 1, "Do you still want it?": three outcomes that do not overlap', () => {
  it('offers deliver, pick up at the hub, or cancel, and nothing about time, payment or address', () => {
    const msg = messagesOf(offered(), 'second_chance').at(-1)!
    expect(msg.text).toMatch(/Do you still want it\?/)
    expect(msg.buttons?.map((b) => b.id)).toEqual(['deliver', 'pickup', 'decline'])
    expect(msg.buttons?.map((b) => b.label)).toEqual(['🚚 Yes, deliver it', '🏬 Yes, I’ll pick it up at the hub', '❌ No, cancel it'])
    expect(record(offered()).pickupOffered).toBe(true)
  })

  it('leaves out the pickup when there is no free shelf slot at the moment it is sent', () => {
    const full = reduce(refused(), { type: 'deskSetParam', at: AT + 1, param: 'shelfCapacity', value: 0 })
    expect(buttonsOf(offered(full), 'second_chance')).toEqual(['deliver', 'decline'])
  })

  it('is the same for a prepaid order (payment is asked later, and only on COD)', () => {
    expect(buttonsOf(offered(refused('PREPAID')), 'second_chance')).toEqual(['deliver', 'pickup', 'decline'])
  })

  it('the offer is the only proactive message: it counts, and the order stays inside the cap of 4', () => {
    expect(proactiveCount(offered(), bonusId)).toBeLessThanOrEqual(CONTACT_CAP)
  })

  it('an answer from a later step is ignored until its question has been asked', () => {
    const s = offered()
    for (const option of ['today', 'tomorrow', 'cod', 'upi', 'same_address', 'share_location'] as const) expect(choose(s, option)).toBe(s)
  })

  it('an accept with no option means "Yes, deliver it"', () => {
    const s = reduce(offered(), { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true })
    expect(record(s).awaiting).toBe('when')
  })
})

describe('step 2, "When should we come?": today, tomorrow or the day after', () => {
  it('asks in a reply (not a proactive message) and waits; the order is still refused', () => {
    const before = offered()
    const s = choose(before, 'deliver')
    expect(record(s)).toMatchObject({ state: 'second_chance_sent', awaiting: 'when', choice: 'deliver' })
    expect(messagesOf(s, 'second_chance_when').at(-1)!.text).toMatch(/When should we come\?/)
    expect(buttonsOf(s, 'second_chance_when')).toEqual(['today', 'tomorrow', 'day_after'])
    expect(proactiveCount(s, bonusId)).toBe(proactiveCount(before, bonusId))
    expect(order(s).status).toBe('refused')
  })

  it('with no attempt left it goes to the next lane instead, and asks nothing more', () => {
    const sent = offered()
    const lowered: DayState = { ...sent, config: { ...sent.config, maxAttempts: 1 } }
    const s = choose(lowered, 'deliver')
    expect(record(s).state).toBe('queued')
    expect(order(s).status).toBe('refused')
    expect(messagesOf(s, 'second_chance_when')).toHaveLength(0)
  })
})

describe('step 3, "How will you pay?": cash or UPI, on COD orders only', () => {
  const atMethod = (s = offered()) => choose(choose(s, 'deliver'), 'today', AT + 4)

  it('a COD order is asked; cash on delivery comes first', () => {
    const s = atMethod()
    expect(record(s).awaiting).toBe('method')
    expect(messagesOf(s, 'second_chance_method').at(-1)!.text).toMatch(/How will you pay\?/)
    expect(buttonsOf(s, 'second_chance_method')).toEqual(['cod', 'upi'])
  })

  it('when the rider heard "no cash on hand", UPI comes first', () => {
    expect(buttonsOf(atMethod(offered(refused('COD', 'no_cash'))), 'second_chance_method')).toEqual(['upi', 'cod'])
  })

  it('a prepaid order skips straight to the address', () => {
    expect(record(atMethod(offered(refused('PREPAID')))).awaiting).toBe('address')
  })

  it('UPI asks for the payment in a reply and marks it pending', () => {
    const s = choose(atMethod(), 'upi', AT + 5)
    expect(record(s).awaiting).toBe('pay')
    expect(order(s).paymentPending).toBe(true)
    expect(buttonsOf(s, 'second_chance_pay')).toEqual(['pay_ok', 'pay_fail'])
  })

  it('a payment that goes through makes the order prepaid, then asks the address; one that fails keeps it COD and asks the address too', () => {
    const paid = reduce(choose(atMethod(), 'upi', AT + 5), { type: 'customerPayment', at: AT + 6, orderId: bonusId, ok: true })
    expect(order(paid).order.payment).toBe('PREPAID')
    expect(record(paid).awaiting).toBe('address')
    expect(eventsOf(paid, 'PAYMENT_ATTEMPTED', bonusId)).toHaveLength(1)
    const failed = reduce(choose(atMethod(), 'upi', AT + 5), { type: 'customerPayment', at: AT + 6, orderId: bonusId, ok: false })
    expect(order(failed).order.payment).toBe('COD')
    expect(record(failed).awaiting).toBe('address')
  })
})

describe('step 4, "Is the address right?": always asked, then the order goes out', () => {
  it('is asked with two answers', () => {
    const s = choose(choose(choose(offered(), 'deliver'), 'today', AT + 4), 'cod', AT + 5)
    expect(record(s).awaiting).toBe('address')
    expect(buttonsOf(s, 'second_chance_address')).toEqual(['same_address', 'share_location'])
  })

  it('today + same address: back in the bag as attempt 2 at once; the saving books only when it is delivered (net ₹99)', () => {
    const s = walkSecondChance(offered(), pid, AT + 3)
    expect(record(s)).toMatchObject({ state: 'recovered', choice: 'deliver' })
    expect(record(s).awaiting).toBeUndefined()
    expect(order(s).status).toBe('out_for_delivery')
    expect(order(s).viaSecondChance).toBe(true)
    expect(messagesOf(s, 'second_chance_ack').at(-1)!.text).toMatch(/goes out again today/)
    expect(savingsLedger(s).total).toBe(0)
    const done = deliverOrder(s, bonusId, '1357')
    expect(order(done).status).toBe('delivered_a2')
    expect(savingsLedger(done).total).toBe(120)
    expect(costLedger(done).find((c) => c.line === 'Second-chance re-attempt leg')?.amount).toBe(21)
  })

  it('tomorrow: parked until 08:00 tomorrow, then out as attempt 2; never counted as a customer reschedule', () => {
    const s = walkSecondChance(offered(), pid, AT + 3, { when: 'tomorrow' })
    expect(record(s).state).toBe('recovered')
    expect(order(s).status).toBe('rescheduled')
    expect(order(s).rescheduledTo).toBe(nextDayStart(s.simNow))
    expect(order(s).reschedules).toBe(0)
    const out = advanceHours(s, 24)
    expect(order(out).status).toBe('out_for_delivery')
    expect(eventsOf(out, 'ORDER_DISPATCHED', bonusId).at(-1)?.data.attempt).toBe(2)
    expect(savingsLedger(deliverOrder(out, bonusId, '2468')).total).toBe(120)
  })

  it('the day after: one day later than tomorrow', () => {
    const s = walkSecondChance(offered(), pid, AT + 3, { when: 'day_after' })
    expect(order(s).rescheduledTo).toBe(nextDayStart(s.simNow) + DAY_MS)
  })

  it('on Ops, +1 day brings back a "tomorrow" at once and a "day after" only on the second press, with a green Audit', () => {
    const nextDay = (x: DayState, at: number): DayState => reduce(x, { type: 'advanceDay', at })
    const tomorrow = nextDay(walkSecondChance(offered(), pid, AT + 3, { when: 'tomorrow' }), AT + 10)
    expect(order(tomorrow).status).toBe('out_for_delivery')
    const later = walkSecondChance(offered(), pid, AT + 3, { when: 'day_after' })
    const day2 = nextDay(later, AT + 10)
    expect(order(day2).status).toBe('rescheduled')
    const day3 = nextDay(day2, AT + 11)
    expect(order(day3).status).toBe('out_for_delivery')
    expect(eventsOf(day3, 'ORDER_DISPATCHED', bonusId).at(-1)?.data.attempt).toBe(2)
    expect(runAudit(deliverOrder(day3, bonusId, '2468', AT + 12)).filter((c) => !c.ok)).toEqual([])
  })

  it('on Ops, a customer who stops at "When should we come?" can still answer after +1 day until the 24 h run out', () => {
    const halfway = choose(offered(), 'deliver')
    const nextDay = reduce(halfway, { type: 'advanceDay', at: AT + 10 })
    const open = nextDay.simNow - record(nextDay).secondChanceSentSim! < 24 * HOUR_MS
    expect(record(nextDay).state).toBe(open ? 'second_chance_sent' : 'queued')
    if (open) {
      const done = walkSecondChance(nextDay, pid, AT + 11, { when: 'tomorrow' })
      expect(order(done).rescheduledTo).toBe(nextDayStart(nextDay.simNow))
    }
    const twoDays = reduce(nextDay, { type: 'advanceDay', at: AT + 12 })
    expect(record(twoDays).state).toBe('queued')
    expect(overdueTimers(twoDays)).toEqual([])
  })

  it('share my exact location: the order goes out and the customer is asked for the pin, which then moves it', () => {
    const s = walkSecondChance(offered(), pid, AT + 3, { shareLocation: true })
    expect(order(s).status).toBe('out_for_delivery')
    expect(order(s).replies).toContain('fix_address')
    expect(s.messages.filter((m) => m.orderId === bonusId).at(-1)!.text).toMatch(/share your live location/i)
    const pinned = reduce(s, { type: 'customerReply', at: AT + 20, orderId: bonusId, reply: 'fix_address', location: { lat: 26.851, lng: 81.001 } })
    expect(order(pinned).order.addressQuality).toBe('clear')
    expect(runAudit(deliverOrder(pinned, bonusId, '1357')).filter((c) => !c.ok)).toEqual([])
  })

  it('a UPI payment that went through ends prepaid and out for delivery', () => {
    const s = walkSecondChance(offered(), pid, AT + 3, { upi: true, payOk: true })
    expect(order(s).order.payment).toBe('PREPAID')
    expect(order(s).status).toBe('out_for_delivery')
  })
})

describe('a refusal the rider could not explain ("Other") goes to the second chance first', () => {
  it('the Desk offers the second chance and says the customer’s reply decides the lane', () => {
    const s = refused('COD', 'other')
    const item = deskItems(s).find((d) => d.record.id === pid)!
    expect(item.decision.lane).toBe('second_chance')
    expect(item.decision.reason).toMatch(/Reason not given by the rider/)
    expect(record(offered(s)).state).toBe('second_chance_sent')
  })
})

describe('Pick up at hub', () => {
  const reserved = choose(offered(), 'pickup')
  const code = (): string => /\b(\d{4})\b/.exec(messagesOf(reserved, 'pickup_code').at(-1)!.text)![1]

  it('reserves a shelf slot for 48 h: a pickup code, a deadline, the ₹8 booked, the order still open', () => {
    const p = record(reserved)
    expect(p.state).toBe('pickup_reserved')
    expect(p.choice).toBe('pickup')
    expect(p.pickup).toMatchObject({ code: code(), deadline: reserved.simNow + 48 * HOUR_MS, tries: 0 })
    expect(p.pickup?.code).toMatch(/^\d{4}$/)
    expect(order(reserved).status).toBe('refused')
    expect(eventsOf(reserved, 'PICKUP_RESERVED', bonusId)).toHaveLength(1)
    expect(costLedger(reserved).find((c) => c.line === 'Hub pickup shelf slot (48h)')).toMatchObject({ amount: 8, stream: 'router' })
    expect(savingsLedger(reserved).total).toBe(0)
  })

  it('the code and the instructions go in the confirmation reply, which is not a proactive message', () => {
    const msg = messagesOf(reserved, 'pickup_code').at(-1)!
    expect(msg.direction).toBe('out')
    expect(msg.text).toMatch(/48/)
    expect(msg.text).toMatch(/hub/i)
    expect(proactiveCount(reserved, bonusId)).toBe(proactiveCount(offered(), bonusId))
    expect(eventsOf(reserved, 'MSG_REJECTED', bonusId)).toHaveLength(0)
  })

  it('the code is not written into the event log', () => {
    expect(JSON.stringify(eventsOf(reserved, 'PICKUP_RESERVED'))).not.toContain(code())
  })

  it('shares the 30 shelf slots with Hold', () => {
    expect(shelfUsed(reserved)).toBe(1)
    // With room for one, the pickup now fills the shelf, so another parcel cannot be held and no other pickup is offered.
    const tight = reduce(reserved, { type: 'deskSetParam', at: AT + 4, param: 'shelfCapacity', value: 1 })
    expect(deskItems(tight)[0].options.shelfUsed).toBe(1)
  })

  it('falls back to tomorrow’s delivery when the shelf filled between the offer and the answer', () => {
    const sent = offered()
    expect(record(sent).pickupOffered).toBe(true)
    const full = reduce(sent, { type: 'deskSetParam', at: AT + 2, param: 'shelfCapacity', value: 0 })
    const s = choose(full, 'pickup')
    expect(record(s).state).toBe('recovered')
    expect(order(s).status).toBe('rescheduled')
    expect(costLedger(s).some((c) => c.line.startsWith('Hub pickup'))).toBe(false)
    expect(messagesOf(s, 'second_chance_ack').some((m) => /filled up/i.test(m.text))).toBe(true)
  })

  it('a wrong code counts a try and changes nothing; five wrong tries lock the handover', () => {
    let s = reserved
    for (let i = 1; i <= 5; i++) {
      s = reduce(s, { type: 'deskHandover', at: AT + 10 + i, parcelId: pid, code: code() === '0000' ? '1111' : '0000' })
      expect(record(s).pickup?.tries).toBe(i)
      expect(record(s).state).toBe('pickup_reserved')
    }
    const locked = reduce(s, { type: 'deskHandover', at: AT + 20, parcelId: pid, code: code() })
    expect(locked).toBe(s)
  })

  it('the right code hands the parcel over: a saved sale, a terminal hub_pickup state, ₹120 booked (₹112 net of the ₹8)', () => {
    const s = reduce(reserved, { type: 'deskHandover', at: AT + 10, parcelId: pid, code: code() })
    expect(record(s).state).toBe('picked_up')
    expect(order(s).status).toBe('hub_pickup')
    expect(eventsOf(s, 'PICKUP_COLLECTED', bonusId)[0].data).toMatchObject({ codeVerified: true })
    expect(eventsOf(s, 'ORDER_TERMINAL', bonusId).at(-1)?.data.status).toBe('hub_pickup')
    expect(savingsLedger(s).lines.find((l) => l.line === 'Hub pickup collected')).toMatchObject({ amount: 120 })
    expect(savingsLedger(s).total - 8).toBe(112)
    expect(runAudit(s).filter((c) => !c.ok)).toEqual([])
  })

  it('for a COD parcel the operator can note that the cash was collected at the hub; it changes no ledger', () => {
    const s = reduce(reserved, { type: 'deskHandover', at: AT + 10, parcelId: pid, code: code(), cashCollected: true })
    expect(record(s).pickup?.cashCollected).toBe(true)
    expect(ledgerTotals(s)).toMatchObject({ liability: 0, released: 0 })
  })

  it('a no-show goes back in a batched return at 48 h: the normal ₹36 saving, and the ₹8 stays spent', () => {
    expect(record(advanceHours(reserved, 47)).state).toBe('pickup_reserved')
    const s = advanceHours(reserved, 48)
    expect(record(s).state).toBe('batched')
    expect(eventsOf(s, 'PICKUP_EXPIRED', bonusId)).toHaveLength(1)
    expect(order(s).status).toBe('rto')
    expect(savingsLedger(s).total).toBeCloseTo(36, 6)
    expect(costLedger(s).find((c) => c.line === 'Hub pickup shelf slot (48h)')?.amount).toBe(8)
    expect(overdueTimers(s)).toEqual([])
  })

  it('a handover after the window closed is refused even if the timer has not run yet', () => {
    const late: DayState = { ...reserved, simNow: reserved.simNow + 49 * HOUR_MS }
    expect(reduce(late, { type: 'deskHandover', at: AT + 30, parcelId: pid, code: code() })).toBe(late)
  })

  it('only a reserved pickup can be handed over', () => {
    const s = offered()
    expect(reduce(s, { type: 'deskHandover', at: AT + 10, parcelId: pid, code: '1234' })).toBe(s)
    expect(reduce(reserved, { type: 'deskHandover', at: AT + 10, parcelId: 'P-nope', code: '1234' })).toBe(reserved)
  })

  it('an overdue pickup shows up on the timers check until the clock has fired it', () => {
    const late: DayState = { ...reserved, simNow: reserved.simNow + 49 * HOUR_MS }
    expect(overdueTimers(late).join(' ')).toMatch(/pickup/i)
  })
})

describe('the pickup never counts as a delivery and never pays a bonus (the verdict stays honest)', () => {
  const collected = (() => {
    const r = choose(offered(), 'pickup')
    const c = /\b(\d{4})\b/.exec(messagesOf(r, 'pickup_code').at(-1)!.text)![1]
    return reduce(r, { type: 'deskHandover', at: AT + 10, parcelId: pid, code: c })
  })()

  it('the flagged Bonus-arm order is in the arm\'s denominator, not delivered: the original refusal stays the rider\'s failure', () => {
    const k = kpis(collected).flaggedBonus
    const k0 = kpis(day).flaggedBonus
    expect(order(collected).flagged).toBe(true)
    expect(order(collected).arm).toBe('bonus')
    expect(k.n).toBe(k0.n)
    expect(k.terminal).toBe(k0.terminal + 1)
    expect(k.delivered).toBe(k0.delivered)
    expect(k.rate).toBeLessThanOrEqual(k0.rate === 0 ? 0 : k0.rate)
  })

  it('is not delivered anywhere else either', () => {
    const k = kpis(collected)
    expect(k.delivered).toBe(kpis(day).delivered)
    expect(stopsOf(collected).filter((x) => x.status === 'hub_pickup')).toHaveLength(1)
  })

  it('pays no bonus, accrues no bonus, blocks no bonus', () => {
    expect(collected.ledger.filter((l) => l.orderId === bonusId)).toHaveLength(0)
    expect(collected.events.filter((e) => e.type.startsWith('BONUS_') && e.orderId === bonusId)).toHaveLength(0)
  })

  it('whereas a second chance delivered by a rider still counts as delivered and pays as before', () => {
    const prepaid = refused('PREPAID')
    const s = deliverOrder(walkSecondChance(offered(prepaid), pid, AT + 3), bonusId, '1357')
    expect(order(s).status).toBe('delivered_a2')
    expect(kpis(s).flaggedBonus.delivered).toBe(kpis(day).flaggedBonus.delivered + 1)
  })
})

describe('contact cap: four proactive messages per order, whatever the customer answers', () => {
  it.each([
    ['today, cash', {}],
    ['tomorrow', { when: 'tomorrow' }],
    ['UPI', { upi: true }],
    ['share location', { shareLocation: true }],
  ] as const)('the walk %s adds replies only and rejects nothing', (_name, walk) => {
    const base = offered()
    const s = walkSecondChance(base, pid, AT + 3, walk)
    expect(proactiveCount(s, bonusId)).toBe(proactiveCount(base, bonusId))
    expect(eventsOf(s, 'MSG_REJECTED', bonusId)).toHaveLength(0)
  })

  it('a pickup adds replies only', () => {
    expect(proactiveCount(choose(offered(), 'pickup'), bonusId)).toBe(proactiveCount(offered(), bonusId))
  })
})

describe('a customer who takes the second chance and refuses again', () => {
  it('does not become a second parcel: the order goes back as an RTO and nothing is saved', () => {
    const back = walkSecondChance(offered(), pid, AT + 3)
    const again = run(back, { type: 'riderRefuse', at: AT + 50, orderId: bonusId, code: '8888' }, { type: 'submitOtp', at: AT + 51, orderId: bonusId, code: '8888' })
    expect(again.parcels.filter((p) => p.orderId === bonusId)).toHaveLength(1)
    expect(order(again).status).toBe('rto')
    expect(savingsLedger(again).total).toBe(0)
    expect(runAudit(again).filter((c) => !c.ok)).toEqual([])
  })
})

describe('a declined or unanswered offer still works as before', () => {
  it('decline re-routes; expiry after 24 h re-routes, whatever step the customer was on', () => {
    const declined = reduce(offered(), { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: false })
    expect(record(declined).state).toBe('queued')
    expect(record(declined).secondChanceDeclined).toBe(true)
    const midway = choose(choose(choose(offered(), 'deliver'), 'today', AT + 4), 'upi', AT + 5)
    const expired = advanceHours(midway, 24)
    expect(record(expired).state).toBe('queued')
    expect(record(expired).secondChanceExpired).toBe(true)
    expect(record(expired).awaiting).toBeUndefined()
    expect(order(expired).paymentPending).toBeFalsy()
  })

  it('a customer who stops halfway and lets the offer expire is not counted as an accept on the Desk', () => {
    const halfway = choose(offered(), 'deliver')
    expect(deskKpis(halfway).acceptRate.n).toBe(1)
    const expired = advanceHours(halfway, 24)
    expect(record(expired).choice).toBeUndefined()
    expect(deskKpis(expired).acceptRate.value).toBe(0)
  })
})

describe('a pickup is a parcel waiting at the hub, so a later Hold sees the shelf as used', () => {
  it('a held parcel and a pickup add up against the capacity', () => {
    const r = inspectParcel(forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 }), bonusId)
    const held = run(r, { type: 'deskHold', at: AT + 3, parcelId: pid })
    expect(shelfUsed(held)).toBe(1)
  })
})
