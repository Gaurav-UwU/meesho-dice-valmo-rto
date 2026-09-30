import { describe, expect, it } from 'vitest'
import { createRng } from './rng.ts'
import { CATEGORIES, catalogueFor, generateCatalogue, HISTORY_HOURS, poisson, skuIdFor, SKUS_PER_HUB } from './catalogue.ts'
import { HUBS } from './hubs.ts'

describe('poisson draws', () => {
  const mean = (xs: readonly number[]): number => xs.reduce((t, x) => t + x, 0) / xs.length
  const variance = (xs: readonly number[]): number => mean(xs.map((x) => (x - mean(xs)) ** 2))

  it.each([0.5, 3, 12, 80])('has mean and variance close to %s', (m) => {
    const rng = createRng(7)
    const xs = Array.from({ length: 6000 }, () => poisson(rng, m))
    expect(mean(xs)).toBeGreaterThan(m * 0.94)
    expect(mean(xs)).toBeLessThan(m * 1.06)
    expect(variance(xs)).toBeGreaterThan(m * 0.85)
    expect(variance(xs)).toBeLessThan(m * 1.15)
    expect(xs.every((x) => Number.isInteger(x) && x >= 0)).toBe(true)
  })

  it('is always zero for a zero or negative mean', () => {
    expect(poisson(createRng(1), 0)).toBe(0)
    expect(poisson(createRng(1), -2)).toBe(0)
  })
})

describe('the synthetic catalogue', () => {
  const hubId = 'lucknow'
  const cat = catalogueFor(hubId)

  it('has 60 listings per hub with stable ids SKU-001 to SKU-060, and is the same every time', () => {
    expect(cat).toHaveLength(SKUS_PER_HUB)
    expect(cat[0].skuId).toBe('SKU-001')
    expect(cat[59].skuId).toBe('SKU-060')
    expect(skuIdFor(17)).toBe('SKU-017')
    expect(catalogueFor(hubId)).toBe(cat)
    expect(generateCatalogue(hubId)).toEqual(cat)
  })

  it('gives every listing a readable title, a category, colour, size, material and a price in that category\'s band', () => {
    for (const item of cat) {
      const def = CATEGORIES.find((c) => c.id === item.category)!
      expect(def).toBeDefined()
      expect(item.title.toLowerCase()).toContain(def.noun)
      expect(item.title.toLowerCase()).toContain(item.colour)
      expect(item.title.toLowerCase()).toContain(item.material)
      expect(Number.isInteger(item.price)).toBe(true)
      expect(item.price).toBeGreaterThanOrEqual(def.price[0])
      expect(item.price).toBeLessThanOrEqual(def.price[1])
    }
    expect(cat[0].title).toMatch(/^[A-Z]/)
  })

  it('covers every category', () => {
    expect(new Set(cat.map((c) => c.category)).size).toBe(CATEGORIES.length)
  })

  it('differs between hubs (different titles and hidden rates) but not between calls', () => {
    const other = catalogueFor('gaya')
    expect(other.map((c) => c.title)).not.toEqual(cat.map((c) => c.title))
    expect(other.map((c) => c.trueRate)).not.toEqual(cat.map((c) => c.trueRate))
  })

  it('keeps the hidden true rate inside a sane band (buyers per hour in the catchment)', () => {
    for (const hub of HUBS) for (const item of catalogueFor(hub.id)) {
      expect(item.trueRate).toBeGreaterThanOrEqual(0.0003)
      expect(item.trueRate).toBeLessThanOrEqual(0.08)
    }
  })

  it('draws a 14-day history from the hidden rate: the counts average out to rate x 336 h', () => {
    let orders = 0
    let expected = 0
    for (const hub of HUBS) {
      for (const item of catalogueFor(hub.id)) {
        expect(Number.isInteger(item.orders14d) && item.orders14d >= 0).toBe(true)
        orders += item.orders14d
        expected += item.trueRate * HISTORY_HOURS
      }
    }
    expect(orders / expected).toBeGreaterThan(0.85)
    expect(orders / expected).toBeLessThan(1.15)
  })

  it('a different history seed redraws the counts only: titles, prices and the hidden rates stay', () => {
    const again = generateCatalogue(hubId, 5)
    expect(again.map((c) => c.orders14d)).not.toEqual(cat.map((c) => c.orders14d))
    expect(again.map((c) => [c.title, c.price, c.trueRate])).toEqual(cat.map((c) => [c.title, c.price, c.trueRate]))
  })

  it('same-category listings have more alike rates than listings of different categories (so similar ones carry a signal)', () => {
    const diff = (a: number, b: number): number => Math.abs(Math.log(a / b))
    let within = 0
    let withinN = 0
    let between = 0
    let betweenN = 0
    for (const hub of HUBS) {
      const items = catalogueFor(hub.id)
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const d = diff(items[i].trueRate, items[j].trueRate)
        if (items[i].category === items[j].category) { within += d; withinN++ } else { between += d; betweenN++ }
      }
    }
    expect(within / withinN).toBeLessThan(between / betweenN)
  })
})
