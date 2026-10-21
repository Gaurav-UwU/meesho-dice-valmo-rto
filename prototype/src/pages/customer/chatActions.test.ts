import { describe, expect, it } from 'vitest'
import { reduce } from '../../domain/reducer.ts'
import { AT, forceParcel, heroStops, refuseOrder, run, setPayment, startedDay } from '../../domain/testkit.ts'
import type { DayState, SecondChanceOption, WaMessage } from '../../domain/types.ts'
import { actionForButton, isMessageLive, latestButtonMessageId } from './chatActions.ts'

const day = startedDay()
const { bonus: bonusId } = heroStops(day)
const pid = `P-${bonusId}`

const offered = (): DayState => run(forceParcel(refuseOrder(setPayment(day, bonusId, 'COD'), bonusId), bonusId, { reason: 'not_home' }), { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
const choose = (s: DayState, option: SecondChanceOption, at = AT + 3): DayState => reduce(s, { type: 'customerSecondChance', at, parcelId: pid, accept: true, option })
const last = (s: DayState, kind: WaMessage['kind']): WaMessage => s.messages.filter((m) => m.orderId === bonusId && m.kind === kind).at(-1)!
const press = (s: DayState, kind: WaMessage['kind'], id: string) => actionForButton(s, last(s, kind), last(s, kind).buttons!.find((b) => b.id === id)!)

describe('the customer phone turns the second-chance buttons into actions', () => {
  it.each([
    ['deliver', { accept: true, option: 'deliver' }],
    ['pickup', { accept: true, option: 'pickup' }],
    ['decline', { accept: false }],
  ])('button %s', (id, expected) => {
    const s = offered()
    const a = press(s, 'second_chance', id)
    expect(a).toMatchObject({ type: 'customerSecondChance', parcelId: pid, ...expected })
    if (id === 'decline') expect(a).not.toHaveProperty('option')
  })

  it('the day question: today, tomorrow and the day after', () => {
    const s = choose(offered(), 'deliver')
    for (const id of ['today', 'tomorrow', 'day_after']) expect(press(s, 'second_chance_when', id)).toMatchObject({ type: 'customerSecondChance', accept: true, option: id })
  })

  it('the payment question: cash on delivery or UPI, then the UPI result maps to the payment action', () => {
    const s = choose(choose(offered(), 'deliver'), 'tomorrow', AT + 4)
    expect(press(s, 'second_chance_method', 'cod')).toMatchObject({ type: 'customerSecondChance', accept: true, option: 'cod' })
    expect(press(s, 'second_chance_method', 'upi')).toMatchObject({ type: 'customerSecondChance', accept: true, option: 'upi' })
    const paying = choose(s, 'upi', AT + 5)
    expect(press(paying, 'second_chance_pay', 'pay_ok')).toEqual({ type: 'customerPayment', orderId: bonusId, ok: true })
    expect(press(paying, 'second_chance_pay', 'pay_fail')).toEqual({ type: 'customerPayment', orderId: bonusId, ok: false })
  })

  it('the address question: same address or share the exact location', () => {
    const s = choose(choose(choose(offered(), 'deliver'), 'tomorrow', AT + 4), 'cod', AT + 5)
    expect(press(s, 'second_chance_address', 'same_address')).toMatchObject({ type: 'customerSecondChance', accept: true, option: 'same_address' })
    expect(press(s, 'second_chance_address', 'share_location')).toMatchObject({ option: 'share_location' })
  })
})

describe('which WhatsApp buttons are live', () => {
  it('the offer is live until the customer answers; then the follow-up question is', () => {
    const s = offered()
    const offer = last(s, 'second_chance')
    expect(isMessageLive(s, offer, latestButtonMessageId(s.messages.filter((m) => m.orderId === bonusId)))).toBe(true)
    const asked = choose(s, 'deliver')
    const latest = latestButtonMessageId(asked.messages.filter((m) => m.orderId === bonusId))
    expect(latest).toBe(last(asked, 'second_chance_when').id)
    expect(isMessageLive(asked, last(asked, 'second_chance_when'), latest)).toBe(true)
    expect(isMessageLive(asked, offer, latest)).toBe(false)
  })

  it('each question stops being live once it is answered, and only the next one is live', () => {
    const live = (s: DayState, kind: WaMessage['kind']) => isMessageLive(s, last(s, kind), latestButtonMessageId(s.messages.filter((m) => m.orderId === bonusId)))
    const when = choose(offered(), 'deliver')
    const method = choose(when, 'tomorrow', AT + 4)
    expect(live(method, 'second_chance_when')).toBe(false)
    expect(live(method, 'second_chance_method')).toBe(true)
    const paying = choose(method, 'upi', AT + 5)
    expect(live(paying, 'second_chance_pay')).toBe(true)
    const paid = reduce(paying, { type: 'customerPayment', at: AT + 6, orderId: bonusId, ok: true })
    expect(live(paid, 'second_chance_pay')).toBe(false)
    expect(live(paid, 'second_chance_address')).toBe(true)
    const done = choose(paid, 'same_address', AT + 7)
    expect(live(done, 'second_chance_address')).toBe(false)
  })
})

describe('the language question (plan 33)', () => {
  const lang = (s: DayState): WaMessage => last(s, 'language_check')
  const orderDay = (s: DayState): WaMessage => last(s, 'order_day')

  it('the order-day buttons stay live: the language question is not "the newest button message"', () => {
    const msgs = day.messages.filter((m) => m.orderId === bonusId)
    expect(latestButtonMessageId(msgs)).toBe(orderDay(day).id)
    expect(isMessageLive(day, orderDay(day), latestButtonMessageId(msgs))).toBe(true)
  })

  it('the language buttons are live until the customer chooses, then greyed out', () => {
    const msgs = day.messages.filter((m) => m.orderId === bonusId)
    expect(isMessageLive(day, lang(day), latestButtonMessageId(msgs))).toBe(true)
    const chosen = reduce(day, { type: 'customerLanguage', at: AT + 1, orderId: bonusId, lang: 'hi' })
    const after = chosen.messages.filter((m) => m.orderId === bonusId)
    expect(isMessageLive(chosen, lang(chosen), latestButtonMessageId(after))).toBe(false)
  })

  it('English and हिंदी turn into customerLanguage', () => {
    expect(press(day, 'language_check', 'en')).toEqual({ type: 'customerLanguage', orderId: bonusId, lang: 'en' })
    expect(press(day, 'language_check', 'hi')).toEqual({ type: 'customerLanguage', orderId: bonusId, lang: 'hi' })
  })
})
