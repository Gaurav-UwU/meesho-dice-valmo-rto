import { describe, expect, it } from 'vitest'
import { LANE_LABEL, routeParcel, type RefusedParcel } from './router.ts'
import { laneEv, whatIf } from './whatif.ts'

const parcel = (o: Partial<RefusedParcel> = {}): RefusedParcel => ({
  id: 'p1',
  awb: 'SYNLUC00100001',
  hubId: 'lucknow',
  hubState: 'UP',
  buyerState: 'UP',
  sellerId: 's1',
  sellerState: 'UP',
  sellerGst: false,
  skuId: 'sku-1',
  value: 265,
  reason: 'not_ordered',
  unopened: true,
  sealOk: true,
  sellerOptedIn: true,
  invoiceOutside: true,
  demandRate: 0.2,
  ...o,
})

describe('what-if preview (never changes the parcel)', () => {
  it('names the lane that closes, the new lane and both expected values', () => {
    const r = whatIf(parcel(), { sealOk: false })
    expect(r.before.lane).toBe('hold_rehome')
    expect(r.after.lane).toBe('consolidated_return')
    expect(r.changed).toBe(true)
    expect(r.text).toContain('Seal broken')
    expect(r.text).toContain('Hold lane closed')
    expect(r.text).toContain(LANE_LABEL.consolidated_return)
    // Hold EV at 0.2/h: P = 1 - exp(-0.2 x 48 x 0.5) = 99.2%, so 0.992 x 145 - 8 = +135.8; batched return is 30% of ₹120 = +₹36
    expect(r.text).toContain('EV +₹136 → +₹36')
  })

  it('says when a flip opens the hold lane', () => {
    const r = whatIf(parcel({ sealOk: false }), { sealOk: true })
    expect(r.before.lane).toBe('consolidated_return')
    expect(r.after.lane).toBe('hold_rehome')
    expect(r.text).toContain('Seal intact')
    expect(r.text).toContain('Hold lane opens')
    expect(r.text).toContain('EV +₹36 → +₹136')
  })

  it('says the lane stays when the recommended lane does not change', () => {
    // A soft refusal takes the second chance first, so a broken seal only closes the hold fallback.
    const r = whatIf(parcel({ reason: 'not_home' }), { sealOk: false })
    expect(r.before.lane).toBe('second_chance')
    expect(r.after.lane).toBe('second_chance')
    expect(r.changed).toBe(false)
    expect(r.text).toContain('still Second chance')
    expect(r.text).toContain('Hold lane closed')
  })

  it('combines several flips in one line, in a fixed order', () => {
    const r = whatIf(parcel(), { invoiceOutside: false, unopened: false })
    expect(r.text.startsWith('Parcel opened + Invoice inside:')).toBe(true)
    expect(r.after.lane).toBe('consolidated_return')
  })

  it('a flip to the value the parcel already has is not a change', () => {
    const r = whatIf(parcel(), { sealOk: true })
    expect(r.text).toBe('')
    expect(r.changed).toBe(false)
    expect(whatIf(parcel(), {}).text).toBe('')
  })

  it('never mutates the parcel and the "before" is the real decision', () => {
    const p = Object.freeze(parcel())
    const r = whatIf(p, { sealOk: false })
    expect(p.sealOk).toBe(true)
    expect(r.before).toEqual(routeParcel(p))
  })

  it('ignores anything that is not one of the three what-if gates (the seller opt-in is never editable)', () => {
    const p = parcel({ sellerOptedIn: false })
    const r = whatIf(p, { sellerOptedIn: true } as never)
    expect(r.after.lane).toBe('consolidated_return')
    expect(r.text).toBe('')
  })

  it('laneEv reads the expected value of the recommended lane', () => {
    const hold = routeParcel(parcel())
    expect(laneEv(hold)).toBeCloseTo(hold.ev.hold ?? NaN, 9)
    const batch = routeParcel(parcel({ sealOk: false }))
    expect(laneEv(batch)).toBeCloseTo(36, 9)
    const sc = routeParcel(parcel({ reason: 'not_home' }))
    expect(laneEv(sc)).toBeCloseTo(sc.ev.secondChance, 9)
  })
})
