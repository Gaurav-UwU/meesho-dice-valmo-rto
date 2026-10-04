import { describe, expect, it } from 'vitest'
import { DAY_MS, nextDayStart } from './clock.ts'
import { eventsOf } from './events.ts'
import { daysEarly, KEEP_DATE_LABEL } from './messages.ts'
import { kpis, stopsOf } from './selectors.ts'
import { AT, run, startedDay } from './testkit.ts'
import type { DayState } from './types.ts'

/**
 * Our field research (Tier 3/4) and our own test order: COD parcels often arrive days before the promised date, when the cash is not ready.
 * For those orders the delivery-day WhatsApp says so, and offers "Pay now (UPI)" or "Keep my promised date".
 */
const day = startedDay()
const flaggedCod = stopsOf(day).filter((x) => x.flagged && x.order.payment === 'COD')
const early = flaggedCod.find((x) => daysEarly(x.order.id, true) > 0)!
const onTime = flaggedCod.find((x) => daysEarly(x.order.id, true) === 0)!
const orderDayMsg = (s: DayState, orderId: string) => s.messages.find((m) => m.orderId === orderId && m.kind === 'order_day')!

describe('which orders arrive early', () => {
  it('prepaid orders are never "early" (nothing to have ready); COD orders are 0 or 2 to 5 days early', () => {
    for (const x of stopsOf(day)) {
      const d = daysEarly(x.order.id, x.order.payment === 'COD')
      if (x.order.payment !== 'COD') expect(d).toBe(0)
      else expect([0, 2, 3, 4, 5]).toContain(d)
    }
  })

  it('about a third of COD orders arrive early, decided by the order id so it never changes', () => {
    const cod = stopsOf(day).filter((x) => x.order.payment === 'COD')
    const share = cod.filter((x) => daysEarly(x.order.id, true) > 0).length / cod.length
    expect(share).toBeGreaterThan(0.2)
    expect(share).toBeLessThan(0.5)
    expect(daysEarly(early.order.id, true)).toBe(daysEarly(early.order.id, true))
  })
})

describe('the delivery-day message for an early COD order', () => {
  it('says the parcel is early, by how many days, and offers UPI and the promised date', () => {
    const m = orderDayMsg(day, early.order.id)
    const n = daysEarly(early.order.id, true)
    expect(m.text.startsWith('Arriving early, today')).toBe(true)
    expect(m.text).toContain(`${n} days`)
    expect(m.text).toContain('promised')
    expect(m.buttons?.map((b) => b.id)).toEqual(['home', 'pay_now', 'change_time', 'fix_address'])
    expect(m.buttons?.find((b) => b.id === 'change_time')?.label).toBe(KEEP_DATE_LABEL)
  })

  it('an on-time order keeps the usual "Arriving Today" message', () => {
    const m = orderDayMsg(day, onTime.order.id)
    expect(m.text.startsWith('Arriving Today')).toBe(true)
    expect(m.buttons?.find((b) => b.id === 'change_time')?.label).not.toBe(KEEP_DATE_LABEL)
  })
})

describe('"Keep my promised date"', () => {
  const n = daysEarly(early.order.id, true)
  const kept = run(day, { type: 'customerReply', at: AT, orderId: early.order.id, reply: 'change_time' })

  it('parks the order until the promised date, not just tomorrow', () => {
    expect(kept.stops[early.order.id].status).toBe('rescheduled')
    expect(kept.stops[early.order.id].rescheduledTo).toBe(nextDayStart(day.simNow) + (n - 1) * DAY_MS)
    expect(eventsOf(kept, 'RESCHEDULED', early.order.id)).toHaveLength(1)
  })

  it('shows the tapped label in the chat and answers with the promised date', () => {
    const mine = kept.messages.filter((m) => m.orderId === early.order.id)
    expect(mine.some((m) => m.direction === 'in' && m.text === KEEP_DATE_LABEL)).toBe(true)
    expect(mine[mine.length - 1].text).toContain('promised date')
  })

  it('the order stays flagged and stays in its arm (still counted)', () => {
    expect(kept.stops[early.order.id].flagged).toBe(true)
    expect(kpis(kept).flaggedBonus.n + kpis(kept).flaggedControl.n).toBe(kpis(day).flaggedBonus.n + kpis(day).flaggedControl.n)
  })
})
