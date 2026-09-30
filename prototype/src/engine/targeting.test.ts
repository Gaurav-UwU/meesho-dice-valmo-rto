import { describe, expect, it } from 'vitest'
import { breakEvenDelta, DEFAULTS } from './economics.ts'
import { generateOrders } from './generate.ts'
import { rescueScore } from './rescue.ts'
import { DEFAULT_TARGET_SHARE, TARGETING, TARGET_SHARES, flaggedPerDayForShare, flaggedPerYearForShare, targetingFor, type TargetShare } from './targeting.ts'
import { fakeGeo } from './testkit.ts'

describe('targeting: who gets the bonus', () => {
  it('offers the top 10% and the top 20% only, with 20% as the deck default', () => {
    expect(TARGET_SHARES).toEqual([10, 20])
    expect(DEFAULT_TARGET_SHARE).toBe(20)
    expect(targetingFor(20).baselineSuccess).toBe(60)
  })

  it('a tighter cut picks riskier orders, so fewer would be delivered without the bonus', () => {
    const b = TARGET_SHARES.map((s) => targetingFor(s).baselineSuccess)
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeGreaterThan(b[i - 1])
    expect(targetingFor(10).baselineSuccess).toBe(51)
  })

  it('the table matches the order generator (share of the riskiest orders delivered with no bonus)', () => {
    const all: { s: number; p: number }[] = []
    for (let seed = 1; seed <= 20; seed++) for (const g of generateOrders(fakeGeo(0, 1), 1000, seed)) all.push({ s: rescueScore(g.order), p: g.pRto })
    all.sort((a, b) => b.s - a.s)
    for (const share of TARGET_SHARES) {
      const top = all.slice(0, Math.round((all.length * share) / 100))
      const success = (1 - top.reduce((t, x) => t + x.p, 0) / top.length) * 100
      expect(Math.abs(success - TARGETING[share].baselineSuccess)).toBeLessThan(1.5)
    }
  })

  it('a lower baseline lowers break-even: at the top 10% the bonus pays back sooner', () => {
    const be = (share: TargetShare): number => breakEvenDelta({ ...DEFAULTS, baselineSuccess: targetingFor(share).baselineSuccess })
    expect(be(20)).toBeCloseTo(8.57, 2)
    expect(be(10)).toBeCloseTo((15 * 51) / 105, 6)
    expect(be(10)).toBeLessThan(be(20))
  })

  it('but a tighter cut flags fewer orders a day and a year', () => {
    expect(flaggedPerDayForShare(20)).toBe(100)
    expect(flaggedPerDayForShare(10)).toBe(50)
    expect(flaggedPerYearForShare(20)).toBe(153e6)
    expect(flaggedPerYearForShare(10)).toBe(76.5e6)
  })

  it('labels every choice with its source', () => {
    for (const share of TARGET_SHARES) expect(TARGETING[share].note.length).toBeGreaterThan(5)
  })
})
