import { describe, expect, it } from 'vitest'
import { ADDRESS_FIX_LOGIT_DROP, MAX_OTP_ATTEMPTS, OTP_TTL_MS, PAY_NOW_RTO_FACTOR, reduce } from './reducer.ts'
import { deskItems, demoStops, kpis, messagesFor, riderEarnings, suspectStops } from './selectors.ts'
import { createDay } from './day.ts'
import { fakeGeo } from '../engine/testkit.ts'
import { DAY_MS, DAY_START_MS } from './clock.ts'
import { AT, forceParcel, heroStops, inspectParcel, run, startedDay } from './testkit.ts'
import type { Action, DayState } from './types.ts'
import { logit, sigmoid } from '../engine/math.ts'

const day = startedDay()
const { bonus: bonusId, control: controlId } = heroStops(day)

const deliver = (s: DayState, id: string, code = '4321'): DayState =>
  run(s, { type: 'riderDeliver', at: AT + 1, orderId: id, code }, { type: 'submitOtp', at: AT + 2, orderId: id, code })

describe('startDay', () => {
  it('flags the top 20% and reserves demo stops', () => {
    expect(day.started).toBe(true)
    const flagged = day.stopOrder.filter((id) => day.stops[id].flagged)
    expect(flagged).toHaveLength(24)
    expect(day.stopOrder.some((id) => day.stops[id].manual)).toBe(true)
  })

  it('sends an order-day WhatsApp with buttons to every flagged customer, Pay now on COD only', () => {
    const flagged = day.stopOrder.filter((id) => day.stops[id].flagged)
    for (const id of flagged) {
      const m = messagesFor(day, id).find((x) => x.kind === 'order_day')
      expect(m).toBeDefined()
      const labels = m!.buttons!.map((b) => b.label).join(' ')
      expect(labels).toMatch(/Fix address/)
      expect(/Pay now/.test(labels)).toBe(day.stops[id].order.payment === 'COD')
    }
    expect(day.messages.filter((m) => m.kind === 'order_day')).toHaveLength(24)
  })

  it('does nothing the second time', () => {
    const again = reduce(day, { type: 'startDay', at: AT + 5 })
    expect(again).toBe(day)
  })

  it('bumps the version on every applied action and leaves it alone on a no-op', () => {
    expect(day.version).toBe(1)
    const noop = reduce(day, { type: 'submitOtp', at: AT, orderId: bonusId, code: '1' })
    expect(noop).toBe(day)
  })

  it('never mutates the previous state', () => {
    const before = JSON.stringify(day)
    reduce(day, { type: 'customerReply', at: AT, orderId: bonusId, reply: 'home' })
    expect(JSON.stringify(day)).toBe(before)
  })
})

describe('customer WhatsApp replies', () => {
  it('"I\'m home" is acknowledged and recorded', () => {
    const s = run(day, { type: 'customerReply', at: AT, orderId: bonusId, reply: 'home' })
    expect(s.stops[bonusId].replies).toEqual(['home'])
    const msgs = messagesFor(s, bonusId)
    expect(msgs.at(-2)?.direction).toBe('in')
    expect(msgs.at(-1)?.kind).toBe('ack')
  })

  it('"Change time" parks the order as rescheduled (it stays counted in its arm)', () => {
    const s = run(day, { type: 'customerReply', at: AT, orderId: bonusId, reply: 'change_time' })
    expect(s.stops[bonusId].status).toBe('rescheduled')
  })

  it('"Pay now" asks for a payment first; a successful payment switches COD to prepaid and lowers the RTO chance', () => {
    const cod = day.stopOrder.find((id) => day.stops[id].flagged && day.stops[id].order.payment === 'COD')!
    const asked = run(day, { type: 'customerReply', at: AT, orderId: cod, reply: 'pay_now' })
    expect(asked.stops[cod].order.payment).toBe('COD')
    expect(messagesFor(asked, cod).at(-1)?.kind).toBe('pay_prompt')
    const s = run(asked, { type: 'customerPayment', at: AT + 1, orderId: cod, ok: true })
    expect(s.stops[cod].order.payment).toBe('PREPAID')
    expect(s.stops[cod].pRto).toBeCloseTo(day.stops[cod].pRto * PAY_NOW_RTO_FACTOR, 9)
  })

  it('"Fix address" first asks for a location, then moves the pin and recomputes distance and score', () => {
    const unclear = day.stopOrder.find((id) => day.stops[id].flagged && day.stops[id].order.addressQuality !== 'clear')!
    const ask = run(day, { type: 'customerReply', at: AT, orderId: unclear, reply: 'fix_address' })
    expect(ask.stops[unclear].location).toBeUndefined()
    expect(messagesFor(ask, unclear).at(-1)?.text).toMatch(/share your live location/i)

    const spot = { lat: day.hub.lat + 0.01, lng: day.hub.lng + 0.01 }
    const fixed = run(ask, { type: 'customerReply', at: AT + 1, orderId: unclear, reply: 'fix_address', location: spot })
    const st = fixed.stops[unclear]
    expect(st.location).toEqual(spot)
    expect(st.order.addressQuality).toBe('clear')
    expect(st.order.distanceKm).not.toBe(day.stops[unclear].order.distanceKm)
    expect(st.score).toBeLessThan(day.stops[unclear].score)
    expect(st.pRto).toBeCloseTo(sigmoid(logit(day.stops[unclear].pRto) - ADDRESS_FIX_LOGIT_DROP), 9)
  })

  it('fixing an already-clear address does not change the RTO chance', () => {
    const clear = day.stopOrder.find((id) => day.stops[id].flagged && day.stops[id].order.addressQuality === 'clear')!
    const s = run(day, { type: 'customerReply', at: AT, orderId: clear, reply: 'fix_address', location: { lat: day.hub.lat, lng: day.hub.lng } })
    expect(s.stops[clear].pRto).toBeCloseTo(day.stops[clear].pRto, 9)
  })

  it('ignores replies for unknown orders', () => {
    expect(reduce(day, { type: 'customerReply', at: AT, orderId: 'nope', reply: 'home' })).toBe(day)
  })
})

describe('delivery with OTP and the Rescue Bonus', () => {
  it('Deliver sends an OTP to the customer and holds the stop', () => {
    const s = run(day, { type: 'riderDeliver', at: AT, orderId: bonusId, code: '4321' })
    expect(s.stops[bonusId].status).toBe('otp_sent')
    expect(messagesFor(s, bonusId).at(-1)?.text).toContain('4321')
  })

  it('a correct OTP delivers the order and credits ₹15, pending, to a Bonus rider on a flagged order', () => {
    const s = deliver(day, bonusId)
    expect(s.stops[bonusId].status).toBe('delivered_a1')
    expect(s.ledger).toHaveLength(1)
    // A prepaid delivery is pending at once; a COD one is accrued until the rider's cash is reconciled.
    expect(s.ledger[0]).toMatchObject({ orderId: bonusId, amount: 15, status: day.stops[bonusId].order.payment === 'COD' ? 'accrued' : 'pending' })
    expect(s.otps[bonusId]).toBeUndefined()
  })

  it('a Control rider delivers the same kind of order with no bonus', () => {
    const s = deliver(day, controlId)
    expect(s.stops[controlId].status).toBe('delivered_a1')
    expect(s.ledger).toHaveLength(0)
  })

  it('an unflagged order earns no bonus', () => {
    const rider = day.riders.find((r) => r.arm === 'bonus')!
    const plain = day.stopOrder.find((id) => day.stops[id].riderId === rider.id && !day.stops[id].flagged)!
    expect(deliver(day, plain).ledger).toHaveLength(0)
  })

  it('a wrong OTP does not deliver and counts the try', () => {
    const s = run(
      day,
      { type: 'riderDeliver', at: AT, orderId: bonusId, code: '4321' },
      { type: 'submitOtp', at: AT + 1, orderId: bonusId, code: '0000' },
    )
    expect(s.stops[bonusId].status).toBe('otp_sent')
    expect(s.otps[bonusId].attempts).toBe(1)
    expect(s.ledger).toHaveLength(0)
  })

  it('locks after five wrong tries, even for the right code', () => {
    const wrong: Action[] = Array.from({ length: MAX_OTP_ATTEMPTS }, (_, i) => ({ type: 'submitOtp', at: AT + i, orderId: bonusId, code: '9999' }))
    const s = run(day, { type: 'riderDeliver', at: AT, orderId: bonusId, code: '4321' }, ...wrong, { type: 'submitOtp', at: AT + 99, orderId: bonusId, code: '4321' })
    expect(s.stops[bonusId].status).toBe('otp_sent')
    expect(s.feed.at(-1)?.text).toMatch(/locked/i)
  })

  it('an OTP older than 10 minutes no longer works, and a fresh one does', () => {
    const asked = run(day, { type: 'riderDeliver', at: AT, orderId: bonusId, code: '4321' })
    const late = run(asked, { type: 'submitOtp', at: AT + OTP_TTL_MS + 1, orderId: bonusId, code: '4321' })
    expect(late.stops[bonusId].status).toBe('otp_sent')
    expect(late.feed.at(-1)?.text).toMatch(/expired/i)
    const renewed = run(late, { type: 'riderDeliver', at: AT + OTP_TTL_MS + 5, orderId: bonusId, code: '8765' }, { type: 'submitOtp', at: AT + OTP_TTL_MS + 9, orderId: bonusId, code: '8765' })
    expect(renewed.stops[bonusId].status).toBe('delivered_a1')
  })

  it('asking for a fresh OTP does not reset the wrong-guess counter', () => {
    const s = run(
      day,
      { type: 'riderDeliver', at: AT, orderId: bonusId, code: '1111' },
      { type: 'submitOtp', at: AT + 1, orderId: bonusId, code: '0000' },
      { type: 'submitOtp', at: AT + 2, orderId: bonusId, code: '0001' },
      { type: 'riderDeliver', at: AT + 3, orderId: bonusId, code: '2222' },
    )
    expect(s.otps[bonusId].attempts).toBe(2)
  })

  it('an OTP does nothing once the stop has moved on (failed attempt, rescheduled)', () => {
    const s = run(
      day,
      { type: 'riderDeliver', at: AT, orderId: bonusId, code: '1111' },
      { type: 'riderAttempt', at: AT + 1, orderId: bonusId, claim: 'customer_unavailable' },
      { type: 'submitOtp', at: AT + 2, orderId: bonusId, code: '1111' },
    )
    expect(s.stops[bonusId].status).toBe('ndr')
    expect(s.ledger).toHaveLength(0)
  })

  it('paying now twice does not compound the RTO drop', () => {
    const cod = day.stopOrder.find((id) => day.stops[id].flagged && day.stops[id].order.payment === 'COD')!
    const once = run(day, { type: 'customerReply', at: AT, orderId: cod, reply: 'pay_now' })
    const twice = run(once, { type: 'customerReply', at: AT + 1, orderId: cod, reply: 'pay_now' })
    expect(twice.stops[cod].pRto).toBeCloseTo(once.stops[cod].pRto, 12)
  })

  it('cannot deliver an order twice', () => {
    const s = deliver(day, bonusId)
    expect(reduce(s, { type: 'riderDeliver', at: AT + 9, orderId: bonusId, code: '1111' })).toBe(s)
  })

  it('shows up in the rider earnings: base pay plus the pending bonus', () => {
    const s = deliver(day, bonusId)
    const riderId = s.stops[bonusId].riderId
    expect(riderEarnings(s, riderId)).toMatchObject({ deliveries: 1, base: 20, bonusPending: 15, total: 35 })
  })

  it('updates the ops KPIs', () => {
    const s = deliver(day, bonusId)
    const k = kpis(s)
    expect(k.delivered).toBe(1)
    expect(k.bonusPending).toBe(15)
    expect(k.flaggedBonus).toMatchObject({ terminal: 1, settled: 1, delivered: 1, rate: 1, settledRate: 1 })
    expect(k.flaggedBonus.n).toBeGreaterThan(1)
    expect(k.flaggedBonus.open).toBe(k.flaggedBonus.n - 1)
  })
})

describe('failed attempt check', () => {
  const attempt = (claim: 'customer_unavailable' | 'reschedule_requested'): DayState =>
    run(day, { type: 'riderAttempt', at: AT, orderId: bonusId, claim })

  it('asks the customer whether the rider reached them', () => {
    const s = attempt('customer_unavailable')
    expect(s.stops[bonusId].status).toBe('ndr')
    expect(s.stops[bonusId].failedAttempts).toBe(1)
    const last = messagesFor(s, bonusId).at(-1)!
    expect(last.kind).toBe('attempt_check')
    expect(last.buttons).toHaveLength(2)
  })

  it('"never came" flags a suspect attempt and shows it in the ops queue', () => {
    const s = run(attempt('customer_unavailable'), { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: false })
    expect(s.stops[bonusId].assessment?.status).toBe('suspect')
    expect(suspectStops(s).map((x) => x.order.id)).toEqual([bonusId])
    expect(s.feed.at(-1)?.kind).toBe('suspect')
  })

  it('"reached" verifies a customer-unavailable claim', () => {
    const s = run(attempt('customer_unavailable'), { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: true })
    expect(s.stops[bonusId].assessment?.status).toBe('verified')
  })

  it('a claimed reschedule asks the second question, and a "no" makes it suspect', () => {
    const asked = run(attempt('reschedule_requested'), { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: true })
    expect(messagesFor(asked, bonusId).at(-1)?.kind).toBe('reschedule_check')
    expect(asked.stops[bonusId].assessment).toBeUndefined()
    const s = run(asked, { type: 'customerAskedReschedule', at: AT + 2, orderId: bonusId, asked: false })
    expect(s.stops[bonusId].assessment?.status).toBe('suspect')
  })

  it('answers only count once', () => {
    const s = run(attempt('customer_unavailable'), { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: false })
    expect(reduce(s, { type: 'customerReach', at: AT + 2, orderId: bonusId, reached: true })).toBe(s)
  })

  it('a suspect first attempt blocks the bonus if the order is delivered on the second attempt', () => {
    const suspect = run(attempt('customer_unavailable'), { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: false })
    const retried = run(suspect, { type: 'reattempt', at: AT + 2, orderId: bonusId })
    expect(retried.stops[bonusId].status).toBe('out_for_delivery')
    const s = deliver(retried, bonusId)
    expect(s.ledger[0].status).toBe('blocked')
    expect(kpis(s).bonusBlocked).toBe(15)
    expect(kpis(s).bonusPending).toBe(0)
  })

  it('ignores answers for orders that were not attempted', () => {
    expect(reduce(day, { type: 'customerReach', at: AT, orderId: bonusId, reached: true })).toBe(day)
    expect(reduce(day, { type: 'customerAskedReschedule', at: AT, orderId: bonusId, asked: true })).toBe(day)
  })
})

describe('refusal and the Refused-Parcel Desk', () => {
  const refused = (id: string): DayState =>
    run(day, { type: 'riderRefuse', at: AT, orderId: id, code: '7777' }, { type: 'submitOtp', at: AT + 1, orderId: id, code: '7777' })

  it('a refusal OTP proves the refusal and queues the parcel on the desk', () => {
    const s = refused(bonusId)
    expect(s.stops[bonusId].status).toBe('refused')
    expect(s.parcels).toHaveLength(1)
    expect(s.parcels[0].state).toBe('queued')
    expect(s.parcels[0].parcel.hubState).toBe(day.hub.state)
    expect(messagesFor(s, bonusId).some((m) => m.kind === 'refusal_otp')).toBe(true)
  })

  it('no parcel appears until the OTP is entered', () => {
    const s = run(day, { type: 'riderRefuse', at: AT, orderId: bonusId, code: '7777' })
    expect(s.parcels).toHaveLength(0)
  })

  it('second chance: accepted saves the sale', () => {
    const s0 = refused(bonusId)
    const pid = s0.parcels[0].id
    const s = run(s0, { type: 'deskSecondChance', at: AT + 2, parcelId: pid }, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true })
    expect(s.parcels[0].state).toBe('recovered')
    expect(s.stops[bonusId].status).toBe('out_for_delivery')
    expect(s.stops[bonusId].failedAttempts).toBe(1)
  })

  it('second chance: declined puts it back in the queue and marks it declined', () => {
    const s0 = refused(bonusId)
    const pid = s0.parcels[0].id
    const s = run(s0, { type: 'deskSecondChance', at: AT + 2, parcelId: pid }, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: false })
    expect(s.parcels[0].state).toBe('queued')
    expect(s.parcels[0].secondChanceDeclined).toBe(true)
  })

  it('cannot send a second chance twice or answer one that was never sent', () => {
    const s0 = refused(bonusId)
    const pid = s0.parcels[0].id
    expect(reduce(s0, { type: 'customerSecondChance', at: AT, parcelId: pid, accept: true })).toBe(s0)
    const sent = reduce(s0, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
    expect(reduce(sent, { type: 'deskSecondChance', at: AT + 3, parcelId: pid })).toBe(sent)
  })

  it('Hold & Re-home: only when every gate passes, then a match lands a new AWB in a rider bag', () => {
    const s0 = refused(bonusId)
    const pid = s0.parcels[0].id
    // Force a clean parcel that passes every gate, from a customer who never accepts a second chance, in a catchment with demand.
    const fixed = forceParcel(s0, bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 })
    // Nothing can be held before the hub operator has inspected it.
    expect(deskItems(fixed)[0].decision.lane).toBe('consolidated_return')
    expect(reduce(fixed, { type: 'deskHold', at: AT + 2, parcelId: pid })).toBe(fixed)
    const inspected = inspectParcel(fixed, bonusId)
    expect(deskItems(inspected)[0].decision.lane).toBe('hold_rehome')
    const held = run(inspected, { type: 'deskHold', at: AT + 3, parcelId: pid })
    expect(held.parcels[0].state).toBe('held')
    const s = run(held, { type: 'deskMatch', at: AT + 4, parcelId: pid })
    expect(s.parcels[0].state).toBe('rehomed')
    const newId = s.parcels[0].rehomedStopId!
    expect(s.stops[newId].status).toBe('out_for_delivery')
    expect(s.stops[newId].arm).toBeUndefined()
    expect(s.stops[newId].rehomedFrom).toBe(bonusId)
    expect(s.stopOrder).toContain(newId)
    expect(s.parcels[0].newAwb).toMatch(/^SYNRH/)
  })

  it('cannot hold a parcel that fails a gate, and cannot match one that is not held', () => {
    const s0 = inspectParcel(refused(bonusId), bonusId, { sealOk: false })
    const pid = s0.parcels[0].id
    expect(reduce(s0, { type: 'deskHold', at: AT + 3, parcelId: pid })).toBe(s0)
    expect(reduce(s0, { type: 'deskMatch', at: AT + 3, parcelId: pid })).toBe(s0)
  })

  it('consolidates a parcel into the seller return batch', () => {
    const s0 = refused(bonusId)
    const s = run(s0, { type: 'deskConsolidate', at: AT + 2, parcelId: s0.parcels[0].id })
    expect(s.parcels[0].state).toBe('batched')
    expect(s.stops[bonusId].status).toBe('rto')
  })

  it('the old deskSetGate action is gone: the toggles are a preview, so a crafted action changes nothing', () => {
    const s0 = refused(bonusId)
    const forged = reduce(s0, { type: 'deskSetGate', at: AT + 3, parcelId: s0.parcels[0].id, gate: 'sealOk', value: false } as never)
    expect(forged).toBe(s0)
    expect(forged.parcels[0].parcel.sealOk).toBe(s0.parcels[0].parcel.sealOk)
  })
})

describe('demo showcase refusals', () => {
  // A full-size day (300 orders, 12 riders) so the demo rider really has plenty of flagged demo stops.
  const full = reduce(createDay(fakeGeo(0, 1)), { type: 'startDay', at: AT })
  const stops = demoStops(full).bonus
  const refuseInOrder = (n: number): DayState =>
    stops.slice(0, n).reduce<DayState>(
      (s, id, i) => run(s, { type: 'riderRefuse', at: AT + i * 10, orderId: id, code: '5555' }, { type: 'submitOtp', at: AT + i * 10 + 1, orderId: id, code: '5555' }),
      full,
    )

  it('picks the Bonus rider with the most flagged stops and reserves up to six', () => {
    expect(stops.length).toBeGreaterThanOrEqual(4)
    expect(stops.length).toBeLessThanOrEqual(6)
    const counts = full.riders.filter((r) => r.arm === 'bonus').map((r) => full.stopOrder.filter((id) => full.stops[id].riderId === r.id && full.stops[id].flagged).length)
    expect(stops.length).toBe(Math.min(6, Math.max(...counts)))
  })

  it('the first four refusals of demo stops give four different Router outcomes, in order', () => {
    const s = refuseInOrder(4)
    // The operator inspects the four demo parcels; until then Hold is closed for the first one.
    expect(deskItems(s).map((d) => d.decision.lane)).toEqual(['consolidated_return', 'second_chance', 'consolidated_return', 'consolidated_return'])
    const inspected = s.parcels.reduce((acc, p) => inspectParcel(acc, p.orderId), s)
    expect(deskItems(inspected).map((d) => d.decision.lane)).toEqual(['hold_rehome', 'second_chance', 'consolidated_return', 'consolidated_return'])
  })

  it('names why the last two cannot be re-homed (different state, then a broken seal)', () => {
    const s0 = refuseInOrder(4)
    const items = deskItems(s0.parcels.reduce((acc, p) => inspectParcel(acc, p.orderId), s0))
    expect(items[2].decision.reason).toMatch(/Same state/)
    expect(items[3].decision.reason).toMatch(/Seal/)
  })

  it('ordinary stops still get random parcels', () => {
    const rider = full.riders.find((r) => r.arm === 'bonus')!
    const plain = full.stopOrder.find((id) => full.stops[id].riderId === rider.id && !full.stops[id].manual)!
    const s = run(full, { type: 'riderRefuse', at: AT, orderId: plain, code: '5555' }, { type: 'submitOtp', at: AT + 1, orderId: plain, code: '5555' })
    expect(s.parcels).toHaveLength(1)
  })
})

describe('order lifecycle in the reducer', () => {
  const notHome = (s: DayState, id: string, at = AT): DayState =>
    run(s, { type: 'riderAttempt', at, orderId: id, claim: 'customer_unavailable' }, { type: 'customerReach', at: at + 1, orderId: id, reached: true })

  it('day dispatch stamps the arm and first rider on every order, once', () => {
    for (const id of day.stopOrder) {
      const st = day.stops[id]
      expect(st.status).toBe('out_for_delivery')
      expect(st.failedAttempts).toBe(0)
      expect(st.originalRiderId).toBe(st.riderId)
      expect(st.arm).toBe(day.riders.find((r) => r.id === st.riderId)?.arm)
    }
    expect(day.plannedRuleHash).toMatch(/^[0-9a-f]{8}$/)
  })

  it('a delivery is impossible without an OTP round trip: it cannot skip from a failed attempt', () => {
    const failed = notHome(day, bonusId)
    expect(reduce(failed, { type: 'riderDeliver', at: AT + 5, orderId: bonusId, code: '1111' })).toBe(failed)
    expect(failed.rejectedTransitions).toHaveLength(0)
  })

  it('a stale OTP for an order that has moved on is ignored', () => {
    const asked = run(day, { type: 'riderRefuse', at: AT, orderId: bonusId, code: '7777' })
    // The order has moved on to a new state before the OTP is entered: nothing half-applies.
    const moved: DayState = { ...asked, stops: { ...asked.stops, [bonusId]: { ...asked.stops[bonusId], status: 'rescheduled' } } }
    expect(reduce(moved, { type: 'submitOtp', at: AT + 1, orderId: bonusId, code: '7777' })).toBe(moved)
    expect(moved.rejectedTransitions).toHaveLength(0)
  })

  it('a re-attempt only applies to a failed attempt', () => {
    expect(reduce(day, { type: 'reattempt', at: AT, orderId: bonusId })).toBe(day)
    expect(reduce(day, { type: 'reattempt', at: AT, orderId: 'nope' })).toBe(day)
    expect(reduce(notHome(day, bonusId), { type: 'reattempt', at: AT + 9, orderId: bonusId, riderId: 'nobody' }).stops[bonusId].status).toBe('ndr')
  })

  it('goes back as an RTO when another attempt would not pay (expected recovery under ₹21)', () => {
    const hopeless: DayState = { ...day, stops: { ...day.stops, [bonusId]: { ...day.stops[bonusId], pRto: 0.95 } } }
    const s = run(notHome(hopeless, bonusId), { type: 'reattempt', at: AT + 5, orderId: bonusId })
    expect(s.stops[bonusId].status).toBe('rto')
    expect(s.feed.at(-1)?.text).toMatch(/not worth it/i)
  })

  it('hands the re-attempt to the end of the other rider\'s bag', () => {
    const other = day.riders.find((r) => r.arm === day.stops[bonusId].arm && r.id !== day.stops[bonusId].riderId)!
    const s = run(notHome(day, bonusId), { type: 'reattempt', at: AT + 5, orderId: bonusId, riderId: other.id })
    const bag = day.stopOrder.filter((id) => day.stops[id].riderId === other.id).map((id) => day.stops[id].seq)
    expect(s.stops[bonusId].seq).toBe(Math.max(...bag) + 1)
  })

  it('"Change time" from a failed attempt also parks the order; it comes back on the next day', () => {
    const s = run(notHome(day, bonusId), { type: 'customerReply', at: AT + 5, orderId: bonusId, reply: 'change_time' })
    expect(s.stops[bonusId].status).toBe('rescheduled')
    const back = run(s, { type: 'dispatchNextDay', at: AT + 6, orderId: bonusId })
    expect(back.stops[bonusId].status).toBe('out_for_delivery')
    expect(back.stops[bonusId].failedAttempts).toBe(1)
    expect(deliver(back, bonusId).stops[bonusId].status).toBe('delivered_a2')
    expect(reduce(day, { type: 'dispatchNextDay', at: AT, orderId: bonusId })).toBe(day)
  })

  it('next day: rescheduled orders return, failed attempts are retried or closed, and it is a no-op when there is nothing to do', () => {
    // With nothing waiting, the next day just moves the clock to 08:00.
    const idle = reduce(day, { type: 'nextDay', at: AT })
    expect(idle.simNow).toBe(DAY_MS + DAY_START_MS)
    expect(day.stopOrder.every((id) => idle.stops[id].status === day.stops[id].status)).toBe(true)
    const other = day.stopOrder.find((id) => id !== bonusId && day.stops[id].riderId !== day.stops[bonusId].riderId && day.stops[id].flagged)!
    const hopeless: DayState = { ...day, stops: { ...day.stops, [other]: { ...day.stops[other], pRto: 0.99 } } }
    const s0 = run(hopeless, { type: 'customerReply', at: AT, orderId: controlId, reply: 'change_time' })
    const s1 = notHome(notHome(s0, bonusId, AT + 1), other, AT + 3)
    const s = run(s1, { type: 'nextDay', at: AT + 9 })
    expect(s.stops[controlId].status).toBe('out_for_delivery')
    expect(s.stops[bonusId].status).toBe('out_for_delivery')
    expect(s.stops[bonusId].failedAttempts).toBe(1)
    expect(s.stops[other].status).toBe('rto')
    expect(s.feed.at(-1)?.text).toMatch(/1 rescheduled orders back in bags, 1 failed attempts retried, 1 closed as RTO/)
  })

  it('a delivered re-homed order closes the original as re-homed', () => {
    const s0 = run(day, { type: 'riderRefuse', at: AT, orderId: bonusId, code: '7777' }, { type: 'submitOtp', at: AT + 1, orderId: bonusId, code: '7777' })
    const pid = s0.parcels[0].id
    const fixed = inspectParcel(forceParcel(s0, bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 }), bonusId)
    const matched = run(fixed, { type: 'deskHold', at: AT + 3, parcelId: pid }, { type: 'deskMatch', at: AT + 4, parcelId: pid })
    expect(matched.stops[bonusId].status).toBe('refused')
    const newId = matched.parcels[0].rehomedStopId!
    const done = deliver(matched, newId, '2468')
    expect(done.stops[newId].status).toBe('delivered_a1')
    expect(done.stops[bonusId].status).toBe('rehomed')
    expect(done.ledger).toHaveLength(0)
    expect(kpis(done).flaggedBonus.settled).toBe(1)
  })
})
