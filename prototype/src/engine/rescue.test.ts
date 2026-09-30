import { describe, expect, it } from 'vitest'
import { explainScore, flagBonusEligible, rescueScore } from './rescue.ts'
import { logit } from './math.ts'
import { baseOrder } from './testkit.ts'

describe('Rescue Score', () => {
  it('stays strictly between 0 and 1', () => {
    const s = rescueScore(baseOrder())
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThan(1)
  })

  it('rises for COD', () => {
    expect(rescueScore(baseOrder({ payment: 'COD' }))).toBeGreaterThan(rescueScore(baseOrder({ payment: 'PREPAID' })))
  })

  it('rises with distance from the hub', () => {
    expect(rescueScore(baseOrder({ distanceKm: 12 }))).toBeGreaterThan(rescueScore(baseOrder({ distanceKm: 2 })))
  })

  it('rises for unclear and new addresses', () => {
    const clear = rescueScore(baseOrder({ addressQuality: 'clear' }))
    expect(rescueScore(baseOrder({ addressQuality: 'unclear' }))).toBeGreaterThan(clear)
    expect(rescueScore(baseOrder({ addressQuality: 'new' }))).toBeGreaterThan(clear)
  })

  it('rises when the phone is unreachable', () => {
    expect(rescueScore(baseOrder({ phoneReachable: false }))).toBeGreaterThan(rescueScore(baseOrder()))
  })

  it('rises with each past failed attempt', () => {
    const s0 = rescueScore(baseOrder({ pastFailedAttempts: 0 }))
    const s1 = rescueScore(baseOrder({ pastFailedAttempts: 1 }))
    const s2 = rescueScore(baseOrder({ pastFailedAttempts: 2 }))
    expect(s1).toBeGreaterThan(s0)
    expect(s2).toBeGreaterThan(s1)
  })

  it('rises with the TrustMesh signal', () => {
    expect(rescueScore(baseOrder({ trustmesh: 0.8 }))).toBeGreaterThan(rescueScore(baseOrder({ trustmesh: 0.1 })))
  })

  it('explainScore adds up to the score and names every factor', () => {
    const o = baseOrder({ payment: 'COD', distanceKm: 9, addressQuality: 'new', phoneReachable: false, pastFailedAttempts: 1 })
    const parts = explainScore(o)
    const total = parts.reduce((s, c) => s + c.logit, 0)
    expect(total).toBeCloseTo(logit(rescueScore(o)), 8)
    expect(parts.map((p) => p.label).join(' ')).toMatch(/TrustMesh/)
    expect(parts.map((p) => p.label).join(' ')).toMatch(/Cash on delivery/)
    expect(parts.map((p) => p.label).join(' ')).toMatch(/unreachable/)
  })

  it('labels the alternative branches of each factor', () => {
    const labels = explainScore(baseOrder({ addressQuality: 'unclear' })).map((p) => p.label).join(' ')
    expect(labels).toMatch(/Unclear address/)
    expect(labels).toMatch(/Prepaid/)
    expect(labels).toMatch(/Phone reachable/)
  })
})

describe('flagBonusEligible', () => {
  const orders = Array.from({ length: 50 }, (_, i) =>
    baseOrder({ id: `o-${String(i).padStart(2, '0')}`, distanceKm: 1 + i * 0.3, payment: i % 2 ? 'COD' : 'PREPAID' }),
  )

  it('flags the top 20% by default', () => {
    expect(flagBonusEligible(orders).size).toBe(10)
  })

  it('rounds up so a small day still flags someone', () => {
    expect(flagBonusEligible(orders.slice(0, 3)).size).toBe(1)
  })

  it('flags only orders that outrank every unflagged order', () => {
    const flagged = flagBonusEligible(orders)
    const lowestFlagged = Math.min(...orders.filter((o) => flagged.has(o.id)).map((o) => rescueScore(o)))
    const highestUnflagged = Math.max(...orders.filter((o) => !flagged.has(o.id)).map((o) => rescueScore(o)))
    expect(lowestFlagged).toBeGreaterThanOrEqual(highestUnflagged)
  })

  it('honours a custom share', () => {
    expect(flagBonusEligible(orders, 0.5).size).toBe(25)
  })

  it('is stable: identical orders break ties by id', () => {
    const twins = [baseOrder({ id: 'b' }), baseOrder({ id: 'a' }), baseOrder({ id: 'c' }), baseOrder({ id: 'd' }), baseOrder({ id: 'e' })]
    expect([...flagBonusEligible(twins, 0.2)]).toEqual(['a'])
  })

  it('returns an empty set for no orders', () => {
    expect(flagBonusEligible([]).size).toBe(0)
  })
})
