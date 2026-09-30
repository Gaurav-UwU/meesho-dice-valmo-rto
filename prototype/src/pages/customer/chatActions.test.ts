import { describe, expect, it } from 'vitest'
import { reduce } from '../../domain/reducer.ts'
import { AT, forceParcel, heroStops, refuseOrder, run, startedDay } from '../../domain/testkit.ts'
import type { DayState, WaMessage } from '../../domain/types.ts'
import { actionForButton, isMessageLive, latestButtonMessageId } from './chatActions.ts'

const day = startedDay()
const { bonus: bonusId } = heroStops(day)
const pid = `P-${bonusId}`

const offered = (): DayState => run(forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_home' }), { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
const last = (s: DayState, kind: WaMessage['kind']): WaMessage => s.messages.filter((m) => m.orderId === bonusId && m.kind === kind).at(-1)!
const press = (s: DayState, kind: WaMessage['kind'], id: string) => actionForButton(s, last(s, kind), last(s, kind).buttons!.find((b) => b.id === id)!)

describe('the customer phone turns the second-chance buttons into actions', () => {
  it.each([
    ['accept', { accept: true, option: 'deliver' }],
    ['later', { accept: true, option: 'later' }],
    ['pay', { accept: true, option: 'pay' }],
    ['pickup', { accept: true, option: 'pickup' }],
    ['decline', { accept: false }],
  ])('button %s', (id, expected) => {
    const s = offered()
    const a = press(s, 'second_chance', id)
    expect(a).toMatchObject({ type: 'customerSecondChance', parcelId: pid, ...expected })
    if (id === 'decline') expect(a).not.toHaveProperty('option')
  })

  it('the day question: tomorrow and the day after', () => {
    const s = reduce(offered(), { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'later' })
    expect(press(s, 'second_chance_when', 'tomorrow')).toMatchObject({ type: 'customerSecondChance', accept: true, option: 'tomorrow' })
    expect(press(s, 'second_chance_when', 'day_after')).toMatchObject({ option: 'day_after' })
  })

  it('the payment question maps to the payment action', () => {
    const s = reduce(offered(), { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'pay' })
    expect(press(s, 'second_chance_pay', 'pay_ok')).toEqual({ type: 'customerPayment', orderId: bonusId, ok: true })
    expect(press(s, 'second_chance_pay', 'pay_fail')).toEqual({ type: 'customerPayment', orderId: bonusId, ok: false })
  })
})

describe('which WhatsApp buttons are live', () => {
  it('the offer is live until the customer answers; then the follow-up question is', () => {
    const s = offered()
    const offer = last(s, 'second_chance')
    expect(isMessageLive(s, offer, latestButtonMessageId(s.messages.filter((m) => m.orderId === bonusId)))).toBe(true)
    const asked = reduce(s, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'later' })
    const thread = asked.messages.filter((m) => m.orderId === bonusId)
    const latest = latestButtonMessageId(thread)
    expect(latest).toBe(last(asked, 'second_chance_when').id)
    expect(isMessageLive(asked, last(asked, 'second_chance_when'), latest)).toBe(true)
    expect(isMessageLive(asked, offer, latest)).toBe(false)
  })

  it('the day question stops being live once a day is chosen, and the payment question once it is answered', () => {
    const asked = reduce(offered(), { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'later' })
    const done = reduce(asked, { type: 'customerSecondChance', at: AT + 4, parcelId: pid, accept: true, option: 'tomorrow' })
    const when = last(done, 'second_chance_when')
    expect(isMessageLive(done, when, when.id)).toBe(false)
    const paying = reduce(offered(), { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'pay' })
    const pay = last(paying, 'second_chance_pay')
    expect(isMessageLive(paying, pay, pay.id)).toBe(true)
    const paid = reduce(paying, { type: 'customerPayment', at: AT + 4, orderId: bonusId, ok: true })
    expect(isMessageLive(paid, pay, pay.id)).toBe(false)
  })
})
