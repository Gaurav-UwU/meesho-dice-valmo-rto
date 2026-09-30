import { describe, expect, it } from 'vitest'
import { catalogueFor, HISTORY_HOURS, type CatalogueItem } from './catalogue.ts'
import {
  breakEvenMatch,
  buildForecast,
  clearsBreakEven,
  confidenceLabel,
  evidenceText,
  findSimilar,
  forecastFor,
  gammaQuantile,
  matchBelief,
  normalQuantile,
  pointForecast,
  posterior,
  priorRateFrom,
} from './demand.ts'
import { buildIndex } from './keywords.ts'

const item = (o: Partial<CatalogueItem> & { skuId: string; title: string }): CatalogueItem => ({
  category: 'kurti',
  colour: 'blue',
  material: 'cotton',
  size: 'L',
  price: 400,
  trueRate: 0.005,
  orders14d: 0,
  ...o,
})
const indexOf = (items: readonly CatalogueItem[]) => buildIndex(items.map((i) => ({ id: i.skuId, text: i.title })))
const PARAMS = { holdHours: 48, conversion: 0.5 }

describe('normal and gamma quantiles', () => {
  it('normalQuantile matches the standard table', () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 6)
    expect(normalQuantile(0.1)).toBeCloseTo(-1.2816, 3)
    expect(normalQuantile(0.9)).toBeCloseTo(1.2816, 3)
    expect(normalQuantile(0.05)).toBeCloseTo(-1.6449, 3)
    expect(normalQuantile(0.975)).toBeCloseTo(1.96, 3)
    expect(normalQuantile(0.001)).toBeCloseTo(-3.0902, 3)
  })

  it('gammaQuantile (Wilson-Hilferty) is close to the chi-square table: Gamma(10, 1) and Gamma(13, 1)', () => {
    // chi-square with 20 d.f.: 10th pct 12.443, median 19.337, 90th pct 28.412; Gamma(10,1) = chi-square(20) / 2
    expect(gammaQuantile(10, 1, 0.1)).toBeCloseTo(6.2215, 1)
    expect(gammaQuantile(10, 1, 0.5)).toBeCloseTo(9.6685, 1)
    expect(gammaQuantile(10, 1, 0.9)).toBeCloseTo(14.206, 1)
    // The plan's hand-worked number: the 10th percentile of Gamma(13, 1) is about 8.65.
    expect(gammaQuantile(13, 1, 0.1)).toBeCloseTo(8.648, 2)
  })

  it('scales with the rate: Gamma(13, 2003) is Gamma(13, 1) / 2003', () => {
    expect(gammaQuantile(13, 2003, 0.1)).toBeCloseTo(8.648 / 2003, 5)
  })

  it('quantiles are ordered, and stay positive for small shapes', () => {
    for (const a of [1, 2, 5, 40]) {
      const lo = gammaQuantile(a, 100, 0.1)
      const mid = gammaQuantile(a, 100, 0.5)
      const hi = gammaQuantile(a, 100, 0.9)
      expect(lo).toBeGreaterThan(0)
      expect(lo).toBeLessThan(mid)
      expect(mid).toBeLessThan(hi)
    }
  })
})

describe('the plan\'s hand-worked example', () => {
  // prior 0.006 buyers/h worth 10 pseudo-orders, then 3 exact-SKU orders in 336 h
  const post = posterior(0.006, 10, 3, HISTORY_HOURS)

  it('updates the Gamma prior: alpha = 10 + 3, beta = 10 / 0.006 + 336', () => {
    expect(post.alpha).toBe(13)
    expect(post.beta).toBeCloseTo(10 / 0.006 + 336, 6)
    expect(post.beta).toBeCloseTo(2002.67, 1)
  })

  it('gives a mean chance of a buyer in 48 h of about 14.3% and a low end of about 9.8%, so it holds', () => {
    const f = { ...pointForecast(0.006), alpha: post.alpha, beta: post.beta }
    const b = matchBelief(f, PARAMS)
    expect(b.mean).toBeCloseTo(0.1435, 3)
    expect(b.p10).toBeCloseTo(0.0984, 3)
    expect(b.p90).toBeGreaterThan(b.mean)
    expect(b.p10).toBeLessThan(b.mean)
    expect(clearsBreakEven(b)).toBe(true)
  })

  it('the same listing with no orders of its own and only a weak prior is Low and is not held', () => {
    const weak = posterior(0.002, 2, 0, HISTORY_HOURS)
    const b = matchBelief({ ...pointForecast(0.002), alpha: weak.alpha, beta: weak.beta }, PARAMS)
    expect(b.mean).toBeCloseTo(0.035, 2)
    expect(b.p10).toBeLessThan(breakEvenMatch())
    expect(clearsBreakEven(b)).toBe(false)
    expect(confidenceLabel(0, 0)).toBe('Low')
  })
})

describe('the hold rule sits on the low end of the range', () => {
  it('break-even is ₹8 / ₹145 = 5.5%', () => {
    expect(breakEvenMatch()).toBeCloseTo(8 / 145, 12)
  })

  it('holds at exactly break-even and not a hair below', () => {
    const be = breakEvenMatch()
    expect(clearsBreakEven({ mean: 0.2, p10: be, p90: 0.3 })).toBe(true)
    expect(clearsBreakEven({ mean: 0.2, p10: be - 1e-9, p90: 0.3 })).toBe(false)
  })

  it('a high mean is not enough: thin evidence can have a mean above break-even and a low end below it', () => {
    const thin = posterior(0.006, 2, 1, HISTORY_HOURS)
    const b = matchBelief({ ...pointForecast(0.006), alpha: thin.alpha, beta: thin.beta }, PARAMS)
    expect(b.mean).toBeGreaterThan(breakEvenMatch())
    expect(b.p10).toBeLessThan(breakEvenMatch())
    expect(clearsBreakEven(b)).toBe(false)
  })

  it('more evidence at the same mean rate narrows the range', () => {
    // Both beliefs have mean rate 0.006 per hour; the second is worth ten times the evidence.
    const few = matchBelief({ alpha: 2, beta: 2 / 0.006 }, PARAMS)
    const many = matchBelief({ alpha: 20, beta: 20 / 0.006 }, PARAMS)
    expect(many.p90 - many.p10).toBeLessThan(few.p90 - few.p10)
    expect(many.p10).toBeGreaterThan(few.p10)
  })

  it('a point forecast has no spread: low end = mean = 1 - exp(-rate x 48 x conversion)', () => {
    const b = matchBelief(pointForecast(0.05), PARAMS)
    expect(b.mean).toBeCloseTo(1 - Math.exp(-0.05 * 24), 5)
    expect(b.p10).toBeCloseTo(b.mean, 3)
    expect(matchBelief(pointForecast(0), PARAMS).mean).toBeCloseTo(0, 6)
  })

  it('follows the assumptions: a lower conversion lowers the forecast', () => {
    const half = matchBelief(pointForecast(0.01), PARAMS)
    const low = matchBelief(pointForecast(0.01), { holdHours: 48, conversion: 0.25 })
    expect(low.mean).toBeLessThan(half.mean)
  })
})

describe('confidence label and evidence sentence', () => {
  it('High needs 5 or more orders of the exact SKU in 14 days', () => {
    expect(confidenceLabel(5, 0)).toBe('High')
    expect(confidenceLabel(4, 0)).toBe('Medium')
  })

  it('Medium is 1 to 4 exact orders, or at least 10 similar orders', () => {
    expect(confidenceLabel(1, 0)).toBe('Medium')
    expect(confidenceLabel(0, 10)).toBe('Medium')
    expect(confidenceLabel(0, 9)).toBe('Low')
    expect(confidenceLabel(0, 0)).toBe('Low')
  })

  it('says it in one line', () => {
    expect(evidenceText(3, 41, ['kurti', 'cotton', 'blue'])).toBe('3 exact-SKU orders and 41 similar (kurti, cotton, blue) in 14 days')
    expect(evidenceText(1, 2, ['kurti'])).toBe('1 exact-SKU order and 2 similar (kurti) in 14 days')
    expect(evidenceText(0, 0, [])).toBe('0 exact-SKU orders and no similar listings in 14 days')
  })
})

describe('similar listings: same category, price within ±30%, cosine at least 0.35', () => {
  const target = item({ skuId: 'T', title: "Women's cotton kurti, blue, L", price: 400 })
  const close = item({ skuId: 'A', title: "Women's cotton kurti, red, M", price: 420, orders14d: 10 })
  const dear = item({ skuId: 'B', title: "Women's cotton kurti, red, M", price: 800 })
  const other = item({ skuId: 'C', title: "Women's cotton saree, blue, L", price: 400, category: 'saree' })
  const unlike = item({ skuId: 'D', title: 'Silk georgette frock green', price: 400 })
  const items = [target, close, dear, other, unlike]
  const index = indexOf(items)

  it('keeps the close one and drops the dear one, the other category and the unlike words', () => {
    expect(findSimilar(target, items, index).map((s) => s.skuId)).toEqual(['A'])
  })

  it('never lists the parcel\'s own SKU', () => {
    expect(findSimilar(target, items, index).some((s) => s.skuId === 'T')).toBe(false)
  })

  it('the price band is ±30% (inclusive)', () => {
    const edge = item({ skuId: 'E', title: "Women's cotton kurti, red, M", price: 520, orders14d: 1 })
    const out = item({ skuId: 'F', title: "Women's cotton kurti, red, M", price: 521 })
    const set = [target, edge, out]
    expect(findSimilar(target, set, indexOf(set)).map((s) => s.skuId)).toEqual(['E'])
  })

  it('the cosine threshold is at least 0.35, inclusive', () => {
    const sim = findSimilar(target, items, index)[0].cosine
    expect(sim).toBeGreaterThan(0.35)
    expect(findSimilar(target, items, index, { minCosine: sim }).map((s) => s.skuId)).toEqual(['A'])
    expect(findSimilar(target, items, index, { minCosine: sim + 1e-6 })).toEqual([])
  })

  it('lists the most alike first', () => {
    const better = item({ skuId: 'G', title: "Women's cotton kurti, blue, L", price: 410 })
    const set = [target, close, better]
    expect(findSimilar(target, set, indexOf(set)).map((s) => s.skuId)).toEqual(['G', 'A'])
  })
})

describe('the prior from similar listings', () => {
  it('is the similarity-weighted average of their OBSERVED rates (orders / 336 h)', () => {
    const items = [item({ skuId: 'A', title: 'x', orders14d: 336 * 0.01 }), item({ skuId: 'B', title: 'y', orders14d: 336 * 0.004 })]
    const rate = priorRateFrom([{ skuId: 'A', cosine: 0.6 }, { skuId: 'B', cosine: 0.2 }], items)
    expect(rate).toBeCloseTo((0.6 * 0.01 + 0.2 * 0.004) / 0.8, 6)
  })

  it('never reaches zero, so the Gamma prior stays defined', () => {
    const items = [item({ skuId: 'A', title: 'x', orders14d: 0 })]
    expect(priorRateFrom([{ skuId: 'A', cosine: 0.5 }], items)).toBeGreaterThan(0)
  })
})

describe('building a forecast for a parcel', () => {
  const target = item({ skuId: 'T', title: "Women's cotton kurti, blue, L", orders14d: 3 })
  const sims = [
    item({ skuId: 'A', title: "Women's cotton kurti, red, M", price: 420, orders14d: 30 }),
    item({ skuId: 'B', title: "Women's cotton kurti, green, XL", price: 380, orders14d: 11 }),
  ]
  const others = [item({ skuId: 'Z', title: 'Steel container set, pack of 3', category: 'kitchen', price: 400, orders14d: 50 })]
  const items = [target, ...sims, ...others]
  const f = buildForecast(target, items, indexOf(items))

  it('counts the exact SKU\'s own orders separately from the similar ones', () => {
    expect(f.exactOrders).toBe(3)
    expect(f.similarOrders).toBe(41)
    expect(f.similar.map((s) => s.skuId).sort()).toEqual(['A', 'B'])
    expect(f.evidence).toMatch(/^3 exact-SKU orders and 41 similar \(.*\) in 14 days$/)
    expect(f.confidence).toBe('Medium')
  })

  it('a similar SKU is never the parcel: the update uses only the exact SKU\'s own orders', () => {
    expect(f.alpha).toBe(f.priorStrength + 3)
    expect(f.beta).toBeCloseTo(f.priorStrength / f.priorRate + HISTORY_HOURS, 6)
    // Changing a similar listing moves the prior, never the exact count.
    const busier = buildForecast(target, [target, { ...sims[0], orders14d: 300 }, sims[1], ...others], indexOf(items))
    expect(busier.exactOrders).toBe(3)
    expect(busier.priorRate).toBeGreaterThan(f.priorRate)
  })

  it('puts the shared words on chips', () => {
    expect(f.keywords).toContain('cotton')
    expect(f.keywords).toContain('kurti')
    expect(f.keywords.length).toBeLessThanOrEqual(4)
  })

  it('uses a weak prior worth 2 pseudo-orders, from the hub average, when nothing is similar', () => {
    const lone = item({ skuId: 'L', title: 'Wall hanging jute', category: 'homedecor', orders14d: 0 })
    const set = [lone, ...sims]
    const w = buildForecast(lone, set, indexOf(set))
    expect(w.similar).toEqual([])
    expect(w.priorStrength).toBe(2)
    expect(w.alpha).toBe(2)
    expect(w.priorRate).toBeCloseTo(41 / (3 * HISTORY_HOURS), 6)
    expect(w.confidence).toBe('Low')
    expect(w.evidence).toContain('no similar listings')
  })

  it('is deterministic', () => {
    expect(buildForecast(target, items, indexOf(items))).toEqual(f)
  })
})

describe('forecasts for the synthetic catalogue', () => {
  const items = catalogueFor('lucknow')

  it('every listing has a forecast whose exact count is its own history and whose similar set never contains itself', () => {
    for (const it of items) {
      const f = forecastFor('lucknow', it.skuId)
      expect(f.exactOrders).toBe(it.orders14d)
      expect(f.similar.some((s) => s.skuId === it.skuId)).toBe(false)
      for (const s of f.similar) {
        const other = items.find((x) => x.skuId === s.skuId)!
        expect(other.category).toBe(it.category)
        expect(Math.abs(other.price - it.price) / it.price).toBeLessThanOrEqual(0.3 + 1e-9)
        expect(s.cosine).toBeGreaterThanOrEqual(0.35)
      }
    }
  })

  it('is the same every time, and a hub with no such SKU falls back to a hub-average forecast', () => {
    expect(forecastFor('lucknow', 'SKU-017')).toEqual(forecastFor('lucknow', 'SKU-017'))
    const unknown = forecastFor('lucknow', 'SKU-999')
    expect(unknown.exactOrders).toBe(0)
    expect(unknown.confidence).toBe('Low')
  })

  it('can be told to replay a busier listing (the demo parcels): its history is drawn from that rate', () => {
    const busy = forecastFor('lucknow', 'SKU-017', { rate: 0.2 })
    expect(busy.exactOrders).toBeGreaterThan(40)
    expect(busy.confidence).toBe('High')
    // The prior (worth 10 pseudo-orders at the similar listings' slower rate) pulls the belief down, but the low end still clears 5.5% with room to spare.
    const b = matchBelief(busy, PARAMS)
    expect(b.p10).toBeGreaterThan(0.15)
    expect(b.mean).toBeLessThan(1 - Math.exp(-0.2 * 24))
  })
})
