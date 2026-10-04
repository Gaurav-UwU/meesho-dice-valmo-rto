import { describe, expect, it } from 'vitest'
import { fakeGeo } from '../engine/testkit.ts'
import { createDay } from './day.ts'
import { eventsOf } from './events.ts'
import { CONTACT_CAP, proactiveCount } from './helpers.ts'
import { WA_COPY } from './messages.ts'
import { reduce } from './reducer.ts'
import { AT, deliverOrder, forceParcel, heroStops, refuseOrder, run, setPayment, startedDay } from './testkit.ts'
import type { DayState, WaLang, WaMessage } from './types.ts'

/**
 * Plan 33: the first WhatsApp message is in English and Hindi, a second one asks which language the customer prefers, and every later message
 * to that customer is in the language they chose (English when they do not answer).
 */
const day = startedDay()
const { bonus: hero } = heroStops(day)
const HINDI = /[ऀ-ॿ]/

const msgs = (s: DayState, orderId = hero): readonly WaMessage[] => s.messages.filter((m) => m.orderId === orderId)
const lastOut = (s: DayState, orderId = hero): WaMessage => msgs(s, orderId).filter((m) => m.direction === 'out').at(-1)!
const choose = (s: DayState, lang: WaLang, orderId = hero, at = AT + 1): DayState => reduce(s, { type: 'customerLanguage', at, orderId, lang })

describe('the first message is in both languages, and the next one asks which language', () => {
  it('a flagged order gets the order-day message (English, then Hindi) and then the language question', () => {
    const [first, second] = msgs(day)
    expect(first.kind).toBe('order_day')
    expect(first.text).toMatch(/Your Meesho order with AWB/)
    expect(first.text).toMatch(HINDI)
    expect(first.buttons?.every((b) => HINDI.test(b.label) && /[A-Za-z]/.test(b.label))).toBe(true)
    expect(second.kind).toBe('language_check')
    expect(second.text).toMatch(/Which language/)
    expect(second.text).toMatch(HINDI)
    expect(second.buttons).toEqual([
      { id: 'en', label: 'English' },
      { id: 'hi', label: 'हिंदी' },
    ])
  })

  it('an order with no order-day message gets no language question either', () => {
    const plain = day.stopOrder.find((id) => !day.stops[id].flagged)!
    expect(msgs(day, plain)).toHaveLength(0)
  })

  it('the language question is part of the first contact: it does not count against the 4-message cap', () => {
    expect(proactiveCount(day, hero)).toBe(1)
    expect(CONTACT_CAP).toBe(4)
  })

  it('it is still a sent message (costed like every other)', () => {
    expect(eventsOf(day, 'MSG_SENT', hero).map((e) => e.data.template)).toEqual(['order_day', 'language_check'])
  })
})

describe('the customer chooses', () => {
  it('हिंदी: the choice is kept on the order, logged, echoed, and answered in Hindi', () => {
    const s = choose(day, 'hi')
    expect(s.stops[hero].lang).toBe('hi')
    expect(eventsOf(s, 'LANGUAGE_CHOSEN', hero)[0].data).toEqual({ lang: 'hi' })
    const tail = msgs(s).slice(-2)
    expect(tail[0]).toMatchObject({ direction: 'in', text: 'हिंदी' })
    expect(tail[1]).toMatchObject({ direction: 'out', kind: 'ack' })
    expect(tail[1].text).toMatch(HINDI)
  })

  it('English: answered in English', () => {
    const s = choose(day, 'en')
    expect(s.stops[hero].lang).toBe('en')
    expect(lastOut(s).text).toBe(WA_COPY.en.languageAck)
  })

  it('the same choice twice changes nothing; an unknown order or a day not started is refused', () => {
    const s = choose(day, 'hi')
    expect(choose(s, 'hi', hero, AT + 2)).toBe(s)
    expect(choose(day, 'hi', 'nope-0001')).toBe(day)
    const notStarted = createDay(fakeGeo(0, 1), { seed: 11, orders: 120, riders: 6 })
    expect(choose(notStarted, 'hi', notStarted.stopOrder[0])).toBe(notStarted)
  })
})

describe('after choosing Hindi, every later message is in Hindi', () => {
  const hi = choose(day, 'hi')

  it('the reply acks and the pay prompt', () => {
    const home = run(hi, { type: 'customerReply', at: AT + 2, orderId: hero, reply: 'home' })
    expect(lastOut(home).text).toBe(WA_COPY.hi.replyAck.home)
    const cod = setPayment(hi, hero, 'COD')
    const pay = run(cod, { type: 'customerReply', at: AT + 2, orderId: hero, reply: 'pay_now' })
    expect(lastOut(pay).text).toBe(WA_COPY.hi.replyAck.pay_now)
    expect(lastOut(pay).buttons).toEqual(WA_COPY.hi.payButtons)
    const paid = run(pay, { type: 'customerPayment', at: AT + 3, orderId: hero, ok: true })
    expect(lastOut(paid).text).toBe(WA_COPY.hi.paymentOkAck)
  })

  it('the delivery OTP and the refusal code', () => {
    const otp = run(hi, { type: 'riderDeliver', at: AT + 2, orderId: hero, code: '4321' })
    expect(lastOut(otp).text).toBe(WA_COPY.hi.deliveryOtpText('4321'))
    const ref = run(hi, { type: 'riderRefuse', at: AT + 2, orderId: hero, code: '7777' })
    expect(lastOut(ref).text).toBe(WA_COPY.hi.refusalOtpText('7777'))
  })

  it('the "did the agent reach you?" check, its buttons, the echo of the tap, and the reschedule check', () => {
    const failed = run(hi, { type: 'riderAttempt', at: AT + 2, orderId: hero, claim: 'reschedule_requested' })
    const check = lastOut(failed)
    expect(check.kind).toBe('attempt_check')
    expect(check.text).toBe(WA_COPY.hi.attemptCheckText(day.stops[hero].order.awb))
    expect(check.buttons).toEqual(WA_COPY.hi.reachButtons)
    const yes = run(failed, { type: 'customerReach', at: AT + 3, orderId: hero, reached: true })
    expect(msgs(yes).filter((m) => m.direction === 'in').at(-1)?.text).toBe(WA_COPY.hi.reachButtons[0].label)
    expect(lastOut(yes)).toMatchObject({ kind: 'reschedule_check', text: WA_COPY.hi.rescheduleCheckText, buttons: WA_COPY.hi.yesNo })
  })

  it('the second chance and what follows it', () => {
    const refused = forceParcel(refuseOrder(hi, hero), hero, { reason: 'not_home' })
    const pid = refused.parcels.find((p) => p.orderId === hero)!.id
    const sent = run(refused, { type: 'deskSecondChance', at: AT + 3, parcelId: pid })
    const offer = lastOut(sent)
    expect(offer.kind).toBe('second_chance')
    expect(offer.text).toBe(WA_COPY.hi.secondChanceText(day.stops[hero].order.awb))
    expect(offer.buttons?.every((b) => HINDI.test(b.label))).toBe(true)
    const later = run(sent, { type: 'customerSecondChance', at: AT + 4, parcelId: pid, accept: true, option: 'later' })
    expect(lastOut(later)).toMatchObject({ kind: 'second_chance_when', text: WA_COPY.hi.whenText, buttons: WA_COPY.hi.whenButtons })
    const tomorrow = run(later, { type: 'customerSecondChance', at: AT + 5, parcelId: pid, accept: true, option: 'tomorrow' })
    expect(lastOut(tomorrow).text).toBe(WA_COPY.hi.laterAck('tomorrow'))
  })
})

describe('no answer, or English: later messages are English only', () => {
  it('no answer: the attempt check is in English', () => {
    const s = run(day, { type: 'riderAttempt', at: AT + 2, orderId: hero, claim: 'customer_unavailable' })
    expect(lastOut(s).text).toBe(WA_COPY.en.attemptCheckText(day.stops[hero].order.awb))
    expect(lastOut(s).text).not.toMatch(HINDI)
  })

  it('Hindi first, then English: back to English', () => {
    const s = choose(choose(day, 'hi'), 'en', hero, AT + 2)
    const otp = run(s, { type: 'riderDeliver', at: AT + 3, orderId: hero, code: '4321' })
    expect(lastOut(otp).text).toBe(WA_COPY.en.deliveryOtpText('4321'))
  })

  it('a Hindi customer still gets a delivered order and the day carries on (bonus and OTP unchanged)', () => {
    const s = deliverOrder(setPayment(choose(day, 'hi'), hero, 'PREPAID'), hero)
    expect(s.stops[hero].status).toBe('delivered_a1')
  })
})

describe('the copy: every English line has a Hindi line', () => {
  it('same keys in both languages, and the Hindi lines are in Devanagari', () => {
    expect(Object.keys(WA_COPY.hi).sort()).toEqual(Object.keys(WA_COPY.en).sort())
    expect(WA_COPY.hi.attemptCheckText('X')).toMatch(HINDI)
    expect(Object.values(WA_COPY.hi.replyAck).every((t) => HINDI.test(t))).toBe(true)
    expect(WA_COPY.hi.secondChanceButtons({ pay: true, pickup: true }).map((b) => b.id)).toEqual(WA_COPY.en.secondChanceButtons({ pay: true, pickup: true }).map((b) => b.id))
  })
})
