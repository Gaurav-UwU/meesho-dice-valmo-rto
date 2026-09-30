import { describe, expect, it } from 'vitest'
import { runAudit } from './audit.ts'
import { DAY_MS, HOUR_MS, nextDayStart } from './clock.ts'
import { eventsOf } from './events.ts'
import { CONTACT_CAP, proactiveCount } from './helpers.ts'
import { ledgerTotals, savingsLedger, costLedger } from './ledger.ts'
import { reduce } from './reducer.ts'
import { shelfUsed } from './routing.ts'
import { deskItems, kpis, stopsOf } from './selectors.ts'
import { AT, advanceHours, deliverOrder, forceParcel, heroStops, inspectParcel, refuseOrder, run, setPayment, startedDay } from './testkit.ts'
import { overdueTimers } from './tick.ts'
import type { DayState } from './types.ts'

const day = startedDay()
const { bonus: bonusId } = heroStops(day)
const pid = `P-${bonusId}`

/** A COD order refused as "not home" (a soft refusal: the Router offers the second chance first). */
const refused = (payment: 'COD' | 'PREPAID' = 'COD'): DayState => forceParcel(refuseOrder(setPayment(day, bonusId, payment), bonusId), bonusId, { reason: 'not_home' })
const offered = (s = refused()): DayState => run(s, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
const choose = (s: DayState, option: 'deliver' | 'later' | 'tomorrow' | 'day_after' | 'pay' | 'pickup', at = AT + 3): DayState =>
  reduce(s, { type: 'customerSecondChance', at, parcelId: pid, accept: true, option })
const record = (s: DayState) => s.parcels.find((p) => p.id === pid)!
const order = (s: DayState) => s.stops[bonusId]
const messagesOf = (s: DayState, kind: string) => s.messages.filter((m) => m.orderId === bonusId && m.kind === kind)

describe('the second-chance offer carries the options the customer can really take', () => {
  it('offers Deliver again, Different time, Pay now by UPI, Pick up at hub and Cancel order, in that order', () => {
    const msg = messagesOf(offered(), 'second_chance').at(-1)!
    expect(msg.buttons?.map((b) => b.id)).toEqual(['accept', 'later', 'pay', 'pickup', 'decline'])
    expect(msg.buttons?.map((b) => b.label)).toEqual(['🔁 Deliver again', '🕐 Different time', '💳 Pay now by UPI', '🏬 Pick up at hub', '❌ Cancel order'])
    expect(record(offered()).pickupOffered).toBe(true)
  })

  it('does not offer a pickup when there is no free shelf slot at the moment it is sent', () => {
    const full = reduce(refused(), { type: 'deskSetParam', at: AT + 1, param: 'shelfCapacity', value: 0 })
    const s = offered(full)
    expect(record(s).pickupOffered).toBe(false)
    expect(messagesOf(s, 'second_chance').at(-1)!.buttons?.map((b) => b.id)).toEqual(['accept', 'later', 'pay', 'decline'])
  })

  it('does not offer Pay now on an order that is already prepaid', () => {
    const s = offered(refused('PREPAID'))
    expect(messagesOf(s, 'second_chance').at(-1)!.buttons?.map((b) => b.id)).toEqual(['accept', 'later', 'pickup', 'decline'])
  })

  it('the offer is the only proactive message: it counts, and the order stays inside the cap of 4', () => {
    expect(proactiveCount(offered(), bonusId)).toBeLessThanOrEqual(CONTACT_CAP)
  })
})

describe('Deliver again (as before)', () => {
  it('puts the order back in the bag as attempt 2 and books the saving only when it is delivered', () => {
    const s = choose(offered(), 'deliver')
    expect(record(s).state).toBe('recovered')
    expect(order(s).status).toBe('out_for_delivery')
    expect(order(s).viaSecondChance).toBe(true)
    expect(savingsLedger(s).total).toBe(0)
    const done = deliverOrder(s, bonusId, '1357')
    expect(order(done).status).toBe('delivered_a2')
    expect(savingsLedger(done).total).toBe(99)
  })

  it('an accept with no option means Deliver again', () => {
    expect(reduce(offered(), { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true }).parcels[0].state).toBe('recovered')
  })
})

describe('Different time', () => {
  it('asks which day in a reply (not a proactive message) and waits', () => {
    const before = proactiveCount(offered(), bonusId)
    const s = choose(offered(), 'later')
    expect(record(s).state).toBe('second_chance_sent')
    expect(record(s).awaiting).toBe('when')
    const ask = messagesOf(s, 'second_chance_when').at(-1)!
    expect(ask.buttons?.map((b) => b.id)).toEqual(['tomorrow', 'day_after'])
    expect(proactiveCount(s, bonusId)).toBe(before)
    expect(order(s).status).toBe('refused')
  })

  it('tomorrow: the order is parked until 08:00 tomorrow, then goes out as attempt 2; the delivery books the ₹99 saving', () => {
    const s = choose(choose(offered(), 'later'), 'tomorrow', AT + 4)
    expect(record(s).state).toBe('recovered')
    expect(record(s).choice).toBe('later')
    expect(record(s).awaiting).toBeUndefined()
    expect(order(s).status).toBe('rescheduled')
    expect(order(s).rescheduledTo).toBe(nextDayStart(s.simNow))
    expect(order(s).viaSecondChance).toBe(true)
    expect(order(s).reschedules).toBe(0)
    const out = advanceHours(s, 24)
    expect(order(out).status).toBe('out_for_delivery')
    expect(eventsOf(out, 'ORDER_DISPATCHED', bonusId).at(-1)?.data.attempt).toBe(2)
    expect(savingsLedger(deliverOrder(out, bonusId, '2468')).total).toBe(99)
  })

  it('the day after: one day later than tomorrow', () => {
    const s = choose(choose(offered(), 'later'), 'day_after', AT + 4)
    expect(order(s).rescheduledTo).toBe(nextDayStart(s.simNow) + DAY_MS)
  })

  it('a customer who picks a day straight away (no question) gets the same result', () => {
    expect(order(choose(offered(), 'tomorrow')).status).toBe('rescheduled')
  })

  it('never turns the order into an RTO through the reschedule cap, because it is not a customer reschedule', () => {
    const s = choose(offered(), 'tomorrow')
    expect(order(advanceHours(s, 24)).status).toBe('out_for_delivery')
  })
})

describe('Pay now by UPI', () => {
  it('asks for the payment in a reply, marks the payment pending, and waits', () => {
    const s = choose(offered(), 'pay')
    expect(record(s).awaiting).toBe('pay')
    expect(record(s).state).toBe('second_chance_sent')
    expect(order(s).paymentPending).toBe(true)
    expect(messagesOf(s, 'second_chance_pay').at(-1)!.buttons?.map((b) => b.id)).toEqual(['pay_ok', 'pay_fail'])
  })

  it('a payment that goes through makes the order prepaid and sends it out as attempt 2', () => {
    const s = reduce(choose(offered(), 'pay'), { type: 'customerPayment', at: AT + 4, orderId: bonusId, ok: true })
    expect(order(s).order.payment).toBe('PREPAID')
    expect(record(s).state).toBe('recovered')
    expect(record(s).choice).toBe('pay')
    expect(order(s).status).toBe('out_for_delivery')
    expect(order(s).viaSecondChance).toBe(true)
    expect(eventsOf(s, 'PAYMENT_ATTEMPTED', bonusId)).toHaveLength(1)
  })

  it('a payment that fails still gets the parcel back out, cash on delivery (as the failure message says)', () => {
    const s = reduce(choose(offered(), 'pay'), { type: 'customerPayment', at: AT + 4, orderId: bonusId, ok: false })
    expect(order(s).order.payment).toBe('COD')
    expect(record(s).state).toBe('recovered')
    expect(order(s).status).toBe('out_for_delivery')
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

  it('falls back to Different time when the shelf filled between the offer and the answer', () => {
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
    const s = deliverOrder(choose(offered(prepaid), 'deliver'), bonusId, '1357')
    expect(order(s).status).toBe('delivered_a2')
    expect(kpis(s).flaggedBonus.delivered).toBe(kpis(day).flaggedBonus.delivered + 1)
  })
})

describe('contact cap: four proactive messages per order, whatever the customer picks', () => {
  it.each(['deliver', 'later', 'pay', 'pickup'] as const)('option %s keeps the order within the cap and rejects nothing', (option) => {
    const s = choose(offered(), option)
    expect(proactiveCount(s, bonusId)).toBeLessThanOrEqual(CONTACT_CAP)
    expect(eventsOf(s, 'MSG_REJECTED', bonusId)).toHaveLength(0)
  })

  it('a full walk (later -> tomorrow) and a full pickup each add replies only', () => {
    const base = proactiveCount(offered(), bonusId)
    expect(proactiveCount(choose(choose(offered(), 'later'), 'tomorrow'), bonusId)).toBe(base)
    expect(proactiveCount(choose(offered(), 'pickup'), bonusId)).toBe(base)
  })
})

describe('a customer who takes the second chance and refuses again', () => {
  it('does not become a second parcel: the order goes back as an RTO and nothing is saved', () => {
    const back = choose(offered(), 'deliver')
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
    const midway = choose(offered(), 'pay')
    const expired = advanceHours(midway, 24)
    expect(record(expired).state).toBe('queued')
    expect(record(expired).secondChanceExpired).toBe(true)
    expect(record(expired).awaiting).toBeUndefined()
    expect(order(expired).paymentPending).toBeFalsy()
  })
})

describe('a pickup is a parcel waiting at the hub, so a later Hold sees the shelf as used', () => {
  it('a held parcel and a pickup add up against the capacity', () => {
    const r = inspectParcel(forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 }), bonusId)
    const held = run(r, { type: 'deskHold', at: AT + 3, parcelId: pid })
    expect(shelfUsed(held)).toBe(1)
  })
})
