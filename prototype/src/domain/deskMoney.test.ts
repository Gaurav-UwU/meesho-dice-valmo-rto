import { describe, expect, it } from 'vitest'
import { deskMoney } from './deskMoney.ts'
import { deskItems } from './selectors.ts'
import { AT, advanceHours, deliverOrder, forceParcel, heroStops, refuseOrder, run, startedDay } from './testkit.ts'

const day = startedDay()
const { bonus: bonusId } = heroStops(day)

const HARD_HOLDABLE = { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 } as const

describe('Desk money tiles: booked so far, still in play, cost of sending everything back', () => {
  it('an empty day is all zero', () => {
    expect(deskMoney(day)).toMatchObject({ parcels: 0, booked: 0, grossSaved: 0, routerCosts: 0, inPlay: 0, inPlayCount: 0, sendBackCost: 0 })
  })

  it('a queued parcel books nothing; it is in play at the expected value of its recommended lane; sending it back costs ₹120', () => {
    const s = forceParcel(refuseOrder(day, bonusId), bonusId, HARD_HOLDABLE)
    const m = deskMoney(s)
    expect(m.parcels).toBe(1)
    expect(m.booked).toBe(0)
    expect(m.sendBackCost).toBe(120)
    expect(m.inPlayCount).toBe(1)
    expect(m.inPlay).toBeCloseTo(deskItems(s)[0].decision.ev.hold ?? NaN, 9)
  })

  it('a consolidated return books only its batched saving (₹36) and leaves play', () => {
    const s0 = forceParcel(refuseOrder(day, bonusId), bonusId, { ...HARD_HOLDABLE, sealOk: false })
    const s = run(s0, { type: 'deskConsolidate', at: AT + 2, parcelId: s0.parcels[0].id })
    const m = deskMoney(s)
    expect(m.grossSaved).toBeCloseTo(36, 6)
    expect(m.routerCosts).toBe(0)
    expect(m.booked).toBeCloseTo(36, 6)
    expect(m.inPlayCount).toBe(0)
    expect(m.inPlay).toBe(0)
    expect(m.sendBackCost).toBe(120)
  })

  it('a hold books its ₹8 as a real cost (booked goes negative) and the parcel stays in play at the remaining-hold value', () => {
    const s0 = forceParcel(refuseOrder(day, bonusId), bonusId, HARD_HOLDABLE)
    const held = run(s0, { type: 'deskHold', at: AT + 2, parcelId: s0.parcels[0].id })
    const m = deskMoney(held)
    expect(m.routerCosts).toBe(8)
    expect(m.booked).toBe(-8)
    expect(m.inPlayCount).toBe(1)
    // The ₹8 is already spent, so what is still in play is P(buyer in the hours left) x ₹145.
    expect(m.inPlay).toBeGreaterThan(100)
    expect(m.inPlay).toBeLessThanOrEqual(145)
    // Later in the window, less of the forecast is left.
    const later = advanceHours({ ...held, parcels: held.parcels.map((p) => ({ ...p, matchAt: undefined })) }, 30)
    expect(deskMoney(later).inPlay).toBeLessThan(m.inPlay)
  })

  it('a second chance books only the messages actually sent (₹0.50 each); the customer taps are free', () => {
    const s0 = refuseOrder(day, bonusId)
    const sc = run(forceParcel(s0, bonusId, { reason: 'not_home' }), { type: 'deskSecondChance', at: AT + 2, parcelId: s0.parcels[0].id })
    const m = deskMoney(sc)
    expect(m.routerCosts).toBeCloseTo(0.5, 9)
    expect(m.booked).toBeCloseTo(-0.5, 9)
    expect(m.inPlayCount).toBe(1)
    expect(m.inPlay).toBeCloseTo(deskItems(sc)[0].decision.ev.secondChance, 9)
  })

  it('a re-home that is delivered books ₹145 gross, less the ₹8 hold and the ₹21 local leg', () => {
    const s0 = forceParcel(refuseOrder(day, bonusId), bonusId, HARD_HOLDABLE)
    const pid = s0.parcels[0].id
    const matched = run(s0, { type: 'deskHold', at: AT + 2, parcelId: pid }, { type: 'deskMatch', at: AT + 3, parcelId: pid })
    const newId = matched.parcels[0].rehomedStopId!
    const m1 = deskMoney(matched)
    expect(m1.grossSaved).toBe(0)
    expect(m1.routerCosts).toBe(29)
    expect(m1.booked).toBe(-29)
    const done = deskMoney(deliverOrder(matched, newId, '9090'))
    expect(done.grossSaved).toBe(145)
    expect(done.booked).toBe(116)
    expect(done.inPlayCount).toBe(0)
  })

  it('counts every refused parcel in the cost of sending everything back, done or not', () => {
    const s0 = forceParcel(refuseOrder(day, bonusId), bonusId, { ...HARD_HOLDABLE, sealOk: false })
    const s = run(s0, { type: 'deskConsolidate', at: AT + 2, parcelId: s0.parcels[0].id })
    expect(deskMoney(s).sendBackCost).toBe(120)
    expect(deskMoney(s).parcels).toBe(1)
  })
})
