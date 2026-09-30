import { describe, expect, it } from 'vitest'
import { createDay } from './day.ts'
import { deskKpis, killRule, MIN_PARCELS_PER_LANE } from './deskKpis.ts'
import { reduce } from './reducer.ts'
import { fakeGeo } from '../engine/testkit.ts'
import { AT, advanceHours, deliverOrder, forceParcel, heroStops, inspectParcel, refuseOrder, run, setPayment, startedDay } from './testkit.ts'
import type { DayState } from './types.ts'

const day = startedDay()
const { bonus: bonusId } = heroStops(day)
const pid = `P-${bonusId}`
const soft = (): DayState => forceParcel(refuseOrder(setPayment(day, bonusId, 'COD'), bonusId), bonusId, { reason: 'not_home' })
const sent = (s = soft()): DayState => run(s, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
const choose = (s: DayState, option: 'deliver' | 'pickup' | 'tomorrow', at = AT + 3): DayState => reduce(s, { type: 'customerSecondChance', at, parcelId: pid, accept: true, option })

describe('the pilot KPI panel', () => {
  it('the floor is 30 parcels per lane', () => {
    expect(MIN_PARCELS_PER_LANE).toBe(30)
  })

  it('an empty day has no numbers at all (no fake zeros), and every lane is "too early"', () => {
    const k = deskKpis(day)
    for (const m of [k.salesSaved, k.acceptRate, k.matchRate, k.pickupRate, k.dwellHours, k.bookedPerParcel]) {
      expect(m.n).toBe(0)
      expect(m.value).toBeNull()
      expect(m.tooEarly).toBe(true)
    }
    expect(k.skips.total).toBe(0)
    expect(k.killRule.status).toBe('not_yet')
  })

  it('says plainly what is not simulated: custody incidents and complaints', () => {
    expect(deskKpis(day).notSimulated).toEqual(['Custody incidents', 'Customer complaints'])
  })

  it('second chances: accept rate and sales saved, with the sample size and the floor', () => {
    const s = choose(sent(), 'deliver')
    const delivered = deliverOrder(s, bonusId, '1357')
    const k = deskKpis(delivered)
    expect(k.acceptRate).toMatchObject({ n: 1, value: 1, tooEarly: true })
    expect(k.salesSaved).toMatchObject({ n: 1, value: 1, tooEarly: true })
    // A second chance that was sent but not yet answered is in the denominator of both.
    const waiting = deskKpis(sent())
    expect(waiting.acceptRate).toMatchObject({ n: 1, value: 0 })
    expect(waiting.salesSaved).toMatchObject({ n: 1, value: 0 })
  })

  it('a second chance that is accepted but not yet delivered is not a saved sale', () => {
    const k = deskKpis(choose(sent(), 'deliver'))
    expect(k.acceptRate.value).toBe(1)
    expect(k.salesSaved.value).toBe(0)
  })

  it('a collected pickup is a saved sale, in the KPIs only; a no-show is not', () => {
    const reserved = choose(sent(), 'pickup')
    const code = reserved.parcels[0].pickup!.code
    const collected = reduce(reserved, { type: 'deskHandover', at: AT + 10, parcelId: pid, code })
    const k = deskKpis(collected)
    expect(k.salesSaved.value).toBe(1)
    expect(k.pickupRate).toMatchObject({ n: 1, value: 1, noShows: 0, collected: 1 })
    const gone = deskKpis(advanceHours(reserved, 48))
    expect(gone.salesSaved.value).toBe(0)
    expect(gone.pickupRate).toMatchObject({ n: 1, value: 0, noShows: 1, collected: 0 })
  })

  it('a pickup still waiting is chosen but neither collected nor a no-show yet', () => {
    const k = deskKpis(choose(sent(), 'pickup'))
    expect(k.pickupRate).toMatchObject({ n: 1, collected: 0, noShows: 0, open: 1 })
  })

  it('average dwell: hours from the refusal to the parcel\'s end (48 h for a pickup nobody collects)', () => {
    const gone = deskKpis(advanceHours(choose(sent(), 'pickup'), 48))
    expect(gone.dwellHours.n).toBe(1)
    expect(gone.dwellHours.value).toBeGreaterThan(47)
    expect(gone.dwellHours.value).toBeLessThan(50)
  })

  it('re-home match rate: matched / held, against the 5.5% break-even, next to what the forecast said', () => {
    const r = inspectParcel(forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 }), bonusId)
    const held = run(r, { type: 'deskHold', at: AT + 3, parcelId: pid })
    expect(deskKpis(held).matchRate).toMatchObject({ n: 1, value: 0 })
    const matched = run(held, { type: 'deskMatch', at: AT + 4, parcelId: pid })
    const k = deskKpis(matched)
    expect(k.matchRate).toMatchObject({ n: 1, value: 1 })
    expect(k.breakEven).toBeCloseTo(8 / 145, 9)
    expect(k.forecastedMatch).toBeGreaterThan(0.9)
  })

  it('booked per refused parcel is the net booked ₹ over all refused parcels', () => {
    const reserved = choose(sent(), 'pickup')
    const code = reserved.parcels[0].pickup!.code
    const collected = reduce(reserved, { type: 'deskHandover', at: AT + 10, parcelId: pid, code })
    const k = deskKpis(collected)
    expect(k.bookedPerParcel.n).toBe(1)
    expect(k.bookedPerParcel.value).toBeCloseTo(120 - 8 - 1, 6)
  })

  it('counts skips and their reasons', () => {
    const s = run(soft(), { type: 'deskSkipSecondChance', at: AT + 2, parcelId: pid, reason: 'seller_wants_back' })
    const k = deskKpis(s)
    expect(k.skips.total).toBe(1)
    expect(k.skips.byReason.seller_wants_back).toBe(1)
    expect(k.skips.byReason.other).toBe(0)
    expect(k.skips.share).toBe(1)
  })

  it('a value is marked too early until a lane has 30 parcels, and not after', () => {
    const big = reduce(reduce(createDay(fakeGeo(0, 1), { seed: 33, orders: 300, riders: 12 }), { type: 'startDay', at: AT }), { type: 'closePilot', at: AT + 10 })
    const k = deskKpis(big)
    expect(k.bookedPerParcel.n).toBeGreaterThan(0)
    expect(k.bookedPerParcel.tooEarly).toBe(k.bookedPerParcel.n < MIN_PARCELS_PER_LANE)
    expect(k.acceptRate.tooEarly).toBe(k.acceptRate.n < MIN_PARCELS_PER_LANE)
    // Every pickup that was chosen ended one way or the other once the pilot closed.
    expect(k.pickupRate.open).toBe(0)
    expect(k.pickupRate.collected + k.pickupRate.noShows).toBe(k.pickupRate.n)
  })
})

describe('the kill rule: match rate below 3% after 30 days', () => {
  it('cannot be judged before 30 pilot days or before 30 held parcels', () => {
    expect(killRule({ days: 12, held: 80, matchRate: 0.01 }).status).toBe('not_yet')
    expect(killRule({ days: 31, held: 12, matchRate: 0.01 }).status).toBe('not_yet')
    expect(killRule({ days: 31, held: 80, matchRate: null }).status).toBe('not_yet')
  })

  it('kills below 3% and keeps going at 3% or more, once it can be judged', () => {
    expect(killRule({ days: 30, held: 30, matchRate: 0.029 }).status).toBe('kill')
    expect(killRule({ days: 30, held: 30, matchRate: 0.03 }).status).toBe('ok')
    expect(killRule({ days: 45, held: 400, matchRate: 0.12 }).status).toBe('ok')
  })

  it('explains itself in a sentence', () => {
    expect(killRule({ days: 2, held: 5, matchRate: 0.2 }).text).toMatch(/30 days/)
  })
})
