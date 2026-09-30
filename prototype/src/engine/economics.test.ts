import { describe, expect, it } from 'vitest'
import {
  annualNetCr,
  breakEvenDelta,
  costPerSuccessfulDelivery,
  DEFAULTS,
  netPer100,
  routerBreakEven,
  routerNetPerHeldParcel,
  rtoPointValueCr,
  rtoPointsSaved,
  sensitivityTable,
} from './economics.ts'

// Numbers below come from work/14-deck-handoff.md slide 5/6 (case data pack basis).
describe('Rescue Bonus economics', () => {
  it('break-even is about 8.6 extra deliveries per 100 flagged', () => {
    expect(breakEvenDelta()).toBeCloseTo(8.571, 2)
  })

  it('conservative break-even (rider fee 18) is about 10.3', () => {
    expect(breakEvenDelta({ ...DEFAULTS, riderFee: 18 })).toBeCloseTo(10.345, 2)
  })

  it('net per 100 flagged matches the deck table (data-pack basis)', () => {
    expect(netPer100(15)).toBeCloseTo(675, 6)
    expect(netPer100(20)).toBeCloseTo(1200, 6)
    expect(netPer100(9)).toBeCloseTo(45, 6)
  })

  it('net per 100 flagged matches the deck table (conservative)', () => {
    const c = { ...DEFAULTS, riderFee: 18 }
    expect(netPer100(15, c)).toBeCloseTo(405, 6)
    expect(netPer100(20, c)).toBeCloseTo(840, 6)
  })

  it('net is zero at break-even', () => {
    expect(netPer100(breakEvenDelta())).toBeCloseTo(0, 6)
  })

  it('annual net in ₹ cr matches the sensitivity table', () => {
    expect(annualNetCr(15, 15)).toBeCloseTo(103.3, 0)
    expect(annualNetCr(15, 5)).toBeCloseTo(-57.4, 0)
    expect(annualNetCr(10, 5)).toBeCloseTo(-7.65, 1)
    expect(annualNetCr(20, 20)).toBeCloseTo(122.4, 0)
  })

  it('sensitivity table has one row per bonus and one cell per delta', () => {
    const t = sensitivityTable([10, 15, 20], [5, 10, 15, 20])
    expect(t).toHaveLength(3)
    expect(t[1]).toHaveLength(4)
    expect(Math.round(t[1][3])).toBe(184)
  })

  it('3 RTO points come from +15 per 100 on the top 20%', () => {
    expect(rtoPointsSaved(15)).toBeCloseTo(3, 6)
  })

  it('one RTO point is worth about ₹92 cr a year', () => {
    expect(rtoPointValueCr()).toBeCloseTo(91.6, 0)
  })
})

describe('cost per successful delivery', () => {
  it('is ₹84.8 at 17% RTO and ₹77.7 at 14% RTO', () => {
    expect(costPerSuccessfulDelivery(0.17)).toBeCloseTo(84.82, 1)
    expect(costPerSuccessfulDelivery(0.14)).toBeCloseTo(77.67, 1)
  })

  it('falls as RTO falls', () => {
    expect(costPerSuccessfulDelivery(0.1)).toBeLessThan(costPerSuccessfulDelivery(0.2))
  })
})

describe('Hold & Re-home economics', () => {
  it('break-even match rate is 5.5%', () => {
    expect(routerBreakEven()).toBeCloseTo(0.0552, 3)
  })

  it('net per held parcel is 0 at break-even, negative below, positive above', () => {
    expect(routerNetPerHeldParcel(routerBreakEven())).toBeCloseTo(0, 6)
    expect(routerNetPerHeldParcel(0.02)).toBeLessThan(0)
    expect(routerNetPerHeldParcel(0.2)).toBeGreaterThan(0)
  })
})
