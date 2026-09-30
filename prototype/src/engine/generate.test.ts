import { describe, expect, it } from 'vitest'
import { generateOrders, generateRiders, SELLER_STATE_MIX } from './generate.ts'
import { mean } from './math.ts'
import { rescueScore } from './rescue.ts'
import { fakeGeo } from './testkit.ts'

const N = 20000

describe('generateOrders: calibration to the case data pack', () => {
  const generated = generateOrders(fakeGeo(0, 1), N, 5)
  const cod = generated.filter((g) => g.order.payment === 'COD')
  const prepaid = generated.filter((g) => g.order.payment === 'PREPAID')

  it('makes COD about 80% of orders', () => {
    expect(cod.length / N).toBeGreaterThan(0.78)
    expect(cod.length / N).toBeLessThan(0.82)
  })

  it('hits 20% RTO for COD and 5% for prepaid', () => {
    expect(mean(cod.map((g) => g.pRto))).toBeCloseTo(0.2, 3)
    expect(mean(prepaid.map((g) => g.pRto))).toBeCloseTo(0.05, 3)
  })

  it('hits 17% RTO overall (±0.5 pts)', () => {
    const overall = mean(generated.map((g) => g.pRto))
    expect(overall).toBeGreaterThan(0.165)
    expect(overall).toBeLessThan(0.175)
  })

  it('the top 20% by Rescue Score has about 40% RTO', () => {
    const ranked = [...generated].sort((a, b) => rescueScore(b.order) - rescueScore(a.order))
    const top = ranked.slice(0, Math.ceil(N * 0.2))
    const topRto = mean(top.map((g) => g.pRto))
    expect(topRto).toBeGreaterThan(0.36)
    expect(topRto).toBeLessThan(0.44)
  })

  it('RTO rises with distance from the hub (the case-pack gradient)', () => {
    const near = generated.filter((g) => g.order.distanceKm <= 3.5)
    const far = generated.filter((g) => g.order.distanceKm >= 8)
    expect(near.length).toBeGreaterThan(500)
    expect(far.length).toBeGreaterThan(500)
    expect(mean(far.map((g) => g.pRto)) - mean(near.map((g) => g.pRto))).toBeGreaterThan(0.025)
  })

  it('the rest of the day is far safer than the flagged 20%', () => {
    const ranked = [...generated].sort((a, b) => rescueScore(b.order) - rescueScore(a.order))
    const cut = Math.ceil(N * 0.2)
    expect(mean(ranked.slice(cut).map((g) => g.pRto))).toBeLessThan(0.15)
  })
})

describe('generateOrders: shape and determinism', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = generateOrders(fakeGeo(), 200, 1)
    const b = generateOrders(fakeGeo(), 200, 1)
    const c = generateOrders(fakeGeo(), 200, 2)
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it('returns n orders with unique ids and clearly synthetic AWBs', () => {
    const g = generateOrders(fakeGeo(), 500, 3)
    expect(g).toHaveLength(500)
    expect(new Set(g.map((x) => x.order.id)).size).toBe(500)
    expect(g.every((x) => x.order.awb.startsWith('SYN'))).toBe(true)
  })

  it('keeps every probability strictly inside (0, 1)', () => {
    const g = generateOrders(fakeGeo(), 500, 4)
    expect(g.every((x) => x.pRto > 0 && x.pRto < 1)).toBe(true)
  })

  it('a high-RTO hub (Gaya, factor 1.4) has proportionally more RTO', () => {
    const g = generateOrders(fakeGeo(3), 20000, 6)
    const overall = mean(g.map((x) => x.pRto))
    expect(overall).toBeGreaterThan(0.225)
    expect(overall).toBeLessThan(0.25)
  })

  it('non-GST sellers are always in the hub state (same-state by law)', () => {
    const geo = fakeGeo(2)
    const g = generateOrders(geo, 2000, 7)
    const nonGst = g.filter((x) => !x.order.sellerGst)
    expect(nonGst.length).toBeGreaterThan(300)
    expect(nonGst.every((x) => x.order.sellerState === geo.hub.state)).toBe(true)
  })

  it('seller-state mix sums to 1 and keeps the RHP shares for UP and GJ', () => {
    expect(SELLER_STATE_MIX.reduce((s, [, w]) => s + w, 0)).toBeCloseTo(1, 4)
    expect(SELLER_STATE_MIX.find(([s]) => s === 'UP')?.[1]).toBeCloseTo(0.1587, 4)
    expect(SELLER_STATE_MIX.find(([s]) => s === 'GJ')?.[1]).toBeCloseTo(0.157, 4)
  })

  it('refuses an RTO target the model cannot reach', () => {
    expect(() => generateOrders(fakeGeo(0, 40), 500, 1)).toThrow(/calibrate/i)
  })

  it('handles an empty day', () => {
    expect(generateOrders(fakeGeo(), 0, 1)).toEqual([])
  })
})

describe('generateRiders', () => {
  it('splits riders half Bonus, half Control', () => {
    const riders = generateRiders('powai', 12, 1)
    expect(riders).toHaveLength(12)
    expect(riders.filter((r) => r.arm === 'bonus')).toHaveLength(6)
    expect(riders.filter((r) => r.arm === 'control')).toHaveLength(6)
  })

  it('forms pairs: riders 1 and 2, then 3 and 4, and so on, each pair with one Bonus rider and one Control rider', () => {
    const riders = generateRiders('powai', 12, 1)
    for (let i = 0; i < riders.length; i += 2) {
      expect(riders[i].pairId).toBe(riders[i + 1].pairId)
      expect(new Set([riders[i].arm, riders[i + 1].arm])).toEqual(new Set(['bonus', 'control']))
    }
    expect(new Set(riders.map((r) => r.pairId)).size).toBe(6)
  })

  it('lets a coin decide which rider of each pair gets the bonus: it is not always the first', () => {
    const firstGetsBonus = Array.from({ length: 30 }, (_, seed) => generateRiders('powai', 12, seed + 1).filter((_, i) => i % 2 === 0).filter((r) => r.arm === 'bonus').length)
    const total = firstGetsBonus.reduce((a, b) => a + b, 0)
    // Six pairs per seed: a fair coin gives the first rider the bonus in about half of 180 pairs.
    expect(total).toBeGreaterThan(60)
    expect(total).toBeLessThan(120)
  })

  it('leaves an odd rider out of any pair (their own pair id, so no partner will be matched)', () => {
    const riders = generateRiders('gaya', 7, 3)
    expect(riders).toHaveLength(7)
    const last = riders[6]
    expect(riders.filter((r) => r.pairId === last.pairId)).toHaveLength(1)
  })

  it('names pair ids by hub so pilots that pool hubs never mix two hubs\' pairs', () => {
    expect(generateRiders('powai', 4, 1)[0].pairId.startsWith('powai')).toBe(true)
    expect(generateRiders('gaya', 4, 1)[0].pairId.startsWith('gaya')).toBe(true)
  })

  it('gives unique ids, is deterministic, and tags the hub', () => {
    const a = generateRiders('gaya', 8, 4)
    const b = generateRiders('gaya', 8, 4)
    expect(a).toEqual(b)
    expect(new Set(a.map((r) => r.id)).size).toBe(8)
    expect(a.every((r) => r.hubId === 'gaya')).toBe(true)
  })
})
