import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VERDICT_CONFIG,
  breakEvenPer100,
  compareArms,
  comparePairs,
  estimateIcc,
  minimumDetectableEffect,
  pairUp,
  ruleHash,
  stableStringify,
  tQuantile975,
  verdict,
  type ArmSample,
  type RiderCell,
  type RiderPair,
  type VerdictConfig,
  type VerdictData,
} from './verdict.ts'

/** `count` riders of `n` orders each. `ys` gives delivered counts and is cycled, so riders can differ. Rider i of each arm forms pair i. */
const cells = (count: number, n: number, ys: readonly number[], prefix = 'r'): RiderCell[] =>
  Array.from({ length: count }, (_, i) => ({ riderId: `${prefix}${i}`, pairId: `p${i}`, n, y: ys[i % ys.length] }))

const cell = (riderId: string, pairId: string, n: number, y: number): RiderCell => ({ riderId, pairId, n, y })

const arm = (riders: readonly RiderCell[], open = 0): ArmSample => ({ riders, open })

const PLANNED = ruleHash(DEFAULT_VERDICT_CONFIG)
const judge = (data: VerdictData, config: VerdictConfig = DEFAULT_VERDICT_CONFIG, planned: string = PLANNED) => verdict(data, config, planned)

/** Eight riders per arm with no spread between riders: bonus 72%, control 60%. */
const cleanWin = (): VerdictData => ({
  flagged: { bonus: arm(cells(8, 250, [180], 'b')), control: arm(cells(8, 250, [150], 'c')) },
})

describe('ruleHash', () => {
  it('is 8 hex characters and stable for the same rule', () => {
    expect(ruleHash(DEFAULT_VERDICT_CONFIG)).toMatch(/^[0-9a-f]{8}$/)
    expect(ruleHash({ ...DEFAULT_VERDICT_CONFIG })).toBe(ruleHash(DEFAULT_VERDICT_CONFIG))
  })

  it('does not depend on key order', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }))
  })

  it('changes when any part of the rule changes, including a nested guardrail', () => {
    const base = ruleHash(DEFAULT_VERDICT_CONFIG)
    expect(ruleHash({ ...DEFAULT_VERDICT_CONFIG, killFloor: 2 })).not.toBe(base)
    expect(ruleHash({ ...DEFAULT_VERDICT_CONFIG, guardrails: { ...DEFAULT_VERDICT_CONFIG.guardrails, falseAttemptRate: 0.1 } })).not.toBe(base)
  })
})

describe('tQuantile975', () => {
  it('matches the t table', () => {
    expect(tQuantile975(1)).toBeCloseTo(12.706, 2)
    expect(tQuantile975(4)).toBeCloseTo(2.776, 2)
    expect(tQuantile975(10)).toBeCloseTo(2.228, 2)
    expect(tQuantile975(30)).toBeCloseTo(2.042, 2)
  })

  it('tends to the normal 1.96 for many degrees of freedom', () => {
    expect(tQuantile975(10_000)).toBeCloseTo(1.96, 2)
  })

  it('refuses fewer than one degree of freedom', () => {
    expect(tQuantile975(0)).toBe(Infinity)
  })
})

describe('compareArms: the stricter rider-by-rider check (kept as a cross-check)', () => {
  it('matches a hand calculation (2 riders per arm)', () => {
    // bonus: (10, 6) (10, 8) -> p .7, var 2 x ((6-7)^2 + (8-7)^2) / 20^2 = .01
    // control: (10, 4) (10, 6) -> p .5, var .01. SE = sqrt(.02), t(2 df) = 4.303
    const c = compareArms(
      [
        { riderId: 'b0', pairId: 'p0', n: 10, y: 6 },
        { riderId: 'b1', pairId: 'p1', n: 10, y: 8 },
      ],
      [
        { riderId: 'c0', pairId: 'p0', n: 10, y: 4 },
        { riderId: 'c1', pairId: 'p1', n: 10, y: 6 },
      ],
    )
    expect(c.diffPer100).toBeCloseTo(20, 9)
    const half = 4.303 * Math.sqrt(0.02) * 100
    expect(c.ci95[0]).toBeCloseTo(20 - half, 0)
    expect(c.ci95[1]).toBeCloseTo(20 + half, 0)
    expect(c.df).toBe(2)
  })

  it('scenario 15: on the same data the cluster-robust interval is wider than the naive one', () => {
    // Riders differ a lot from each other inside each arm (a route effect), so orders are not independent.
    const bonus = cells(8, 250, [200, 160, 190, 150], 'b')
    const control = cells(8, 250, [170, 120, 160, 110], 'c')
    const c = compareArms(bonus, control)
    const width = (ci: readonly [number, number]): number => ci[1] - ci[0]
    expect(width(c.ci95)).toBeGreaterThan(width(c.naiveCi95))
  })

  it('has a zero-width interval when riders are identical', () => {
    const c = compareArms(cells(6, 100, [70], 'b'), cells(6, 100, [60], 'c'))
    expect(c.diffPer100).toBeCloseTo(10, 9)
    expect(c.ci95[0]).toBeCloseTo(10, 9)
    expect(c.ci95[1]).toBeCloseTo(10, 9)
  })

  it('has no usable interval with a single rider in an arm', () => {
    const c = compareArms(cells(1, 100, [70], 'b'), cells(6, 100, [60], 'c'))
    expect(c.ci95[0]).toBe(-Infinity)
    expect(c.ci95[1]).toBe(Infinity)
  })

  it('ignores riders with no terminal orders', () => {
    const c = compareArms([...cells(4, 100, [70], 'b'), { riderId: 'idle', pairId: 'px', n: 0, y: 0 }], cells(4, 100, [60], 'c'))
    expect(c.ridersBonus).toBe(4)
  })

  it('returns zeros for an empty arm', () => {
    const c = compareArms([], cells(4, 100, [60], 'c'))
    expect(c.diffPer100).toBe(0)
    expect(c.nBonus).toBe(0)
  })
})

describe('pairUp', () => {
  it('matches the bonus and control rider that share a pair id', () => {
    const { pairs, unmatched } = pairUp([cell('b0', 'p0', 10, 6), cell('b1', 'p1', 10, 7)], [cell('c1', 'p1', 10, 5), cell('c0', 'p0', 10, 4)])
    expect(pairs.map((p) => [p.bonus.riderId, p.control.riderId])).toEqual([
      ['b0', 'c0'],
      ['b1', 'c1'],
    ])
    expect(unmatched).toBe(0)
  })

  it('counts a rider with no partner in the other group instead of guessing one', () => {
    const { pairs, unmatched } = pairUp([cell('b0', 'p0', 10, 6), cell('b9', 'p9', 10, 7)], [cell('c0', 'p0', 10, 4), cell('c8', 'p8', 10, 4)])
    expect(pairs).toHaveLength(1)
    expect(unmatched).toBe(2)
  })
})

describe('comparePairs: the pair-by-pair range', () => {
  // Three pairs of 100 parcels. Control delivers 50, 55, 60; Bonus delivers 60, 69, 78.
  // Pair differences: +10, +14, +18 points. Mean 14. Deviations -4, 0, +4 -> sum of squares 32 -> variance 32 / 2 = 16 -> spread 4.
  // Standard error 4 / sqrt(3) = 2.3094. t for 2 degrees of freedom = 4.303. Half-width 9.937, so the range is 4.06 to 23.94.
  // Smallest detectable effect = 2.8 x 2.3094 = 6.47.
  const hand: RiderPair[] = [
    { bonus: cell('b0', 'p0', 100, 60), control: cell('c0', 'p0', 100, 50) },
    { bonus: cell('b1', 'p1', 100, 69), control: cell('c1', 'p1', 100, 55) },
    { bonus: cell('b2', 'p2', 100, 78), control: cell('c2', 'p2', 100, 60) },
  ]

  it('matches a hand calculation on three pairs', () => {
    const c = comparePairs(hand)
    expect(c.pairs).toBe(3)
    expect(c.diffPer100).toBeCloseTo(14, 9)
    expect(c.spreadPer100).toBeCloseTo(4, 9)
    const half = 4.303 * (4 / Math.sqrt(3))
    expect(c.ci95[0]).toBeCloseTo(14 - half, 2)
    expect(c.ci95[1]).toBeCloseTo(14 + half, 2)
    expect(c.ci95[0]).toBeCloseTo(4.063, 2)
    expect(c.mdePer100).toBeCloseTo(2.8 * (4 / Math.sqrt(3)), 2)
  })

  it('lists the gap in every pair, in order, so a screen can show its working', () => {
    expect(comparePairs(hand).gapsPer100.map((g) => Math.round(g * 1e9) / 1e9)).toEqual([10, 14, 18])
    expect(comparePairs([]).gapsPer100).toEqual([])
  })

  it('reports the two delivery rates over the pairs it kept', () => {
    const c = comparePairs(hand)
    expect(c.bonusRate).toBeCloseTo(207 / 300, 9)
    expect(c.controlRate).toBeCloseTo(165 / 300, 9)
    expect(c.nBonus).toBe(300)
    expect(c.nControl).toBe(300)
  })

  it('uses the t value for the number of pairs, so a small pilot is not over-confident', () => {
    // 24 pairs: t(23) = 2.069, a little above the "about 2" the page says.
    const many: RiderPair[] = Array.from({ length: 24 }, (_, i) => ({ bonus: cell(`b${i}`, `p${i}`, 100, 70 + (i % 2)), control: cell(`c${i}`, `p${i}`, 100, 60) }))
    const c = comparePairs(many)
    const se = c.spreadPer100 / Math.sqrt(24)
    expect((c.ci95[1] - c.ci95[0]) / 2).toBeCloseTo(tQuantile975(23) * se, 9)
    expect(tQuantile975(23)).toBeCloseTo(2.069, 2)
  })

  it('drops a pair where either rider has no finished parcel, and says how many', () => {
    const c = comparePairs([...hand, { bonus: cell('b3', 'p3', 100, 99), control: cell('c3', 'p3', 0, 0) }, { bonus: cell('b4', 'p4', 0, 0), control: cell('c4', 'p4', 100, 1) }])
    expect(c.pairs).toBe(3)
    expect(c.dropped).toBe(2)
    expect(c.diffPer100).toBeCloseTo(14, 9)
  })

  it('has a zero-width range when every pair shows the same gap', () => {
    const same: RiderPair[] = Array.from({ length: 6 }, (_, i) => ({ bonus: cell(`b${i}`, `p${i}`, 100, 70), control: cell(`c${i}`, `p${i}`, 100, 60) }))
    const c = comparePairs(same)
    expect(c.diffPer100).toBeCloseTo(10, 9)
    expect(c.ci95[0]).toBeCloseTo(10, 9)
    expect(c.ci95[1]).toBeCloseTo(10, 9)
    expect(c.mdePer100).toBeCloseTo(0, 9)
  })

  it('has no usable range with a single pair', () => {
    const c = comparePairs(hand.slice(0, 1))
    expect(c.ci95[0]).toBe(-Infinity)
    expect(c.ci95[1]).toBe(Infinity)
    expect(c.mdePer100).toBe(Infinity)
  })

  it('returns zeros, not NaN, when there is nothing to compare', () => {
    const c = comparePairs([])
    expect(c.pairs).toBe(0)
    expect(c.diffPer100).toBe(0)
    expect(c.ci95).toEqual([0, 0])
    expect(c.mdePer100).toBe(Infinity)
  })

  it('is tighter than the rider-by-rider check when matched riders differ a lot from other pairs', () => {
    // Riders vary widely between pairs (a hard route and an easy route) but each pair is matched, so the gap inside a pair is steady.
    const bonus = [140, 200, 110, 190, 160, 120, 210, 150].map((y, i) => cell(`b${i}`, `p${i}`, 250, y))
    const control = [110, 170, 80, 160, 130, 90, 180, 120].map((y, i) => cell(`c${i}`, `p${i}`, 250, y))
    const paired = comparePairs(pairUp(bonus, control).pairs)
    const strict = compareArms(bonus, control)
    expect(paired.ci95[1] - paired.ci95[0]).toBeLessThan(strict.ci95[1] - strict.ci95[0])
  })
})

describe('estimateIcc and minimumDetectableEffect', () => {
  it('falls back to 0.05 when there are too few riders to estimate it', () => {
    expect(estimateIcc(cells(1, 100, [60], 'b'), cells(1, 100, [50], 'c'))).toBe(0.05)
  })

  it('is near zero when riders do not differ and larger when they do', () => {
    const flat = estimateIcc(cells(8, 250, [150, 151], 'b'), cells(8, 250, [120, 121], 'c'))
    const spread = estimateIcc(cells(8, 250, [220, 80], 'b'), cells(8, 250, [200, 60], 'c'))
    expect(flat).toBeLessThan(0.01)
    expect(spread).toBeGreaterThan(0.2)
  })

  it('gives a larger detectable effect when riders cluster and when samples shrink', () => {
    const base = minimumDetectableEffect(0.6, 3000, 3000, 250, 0.02)
    expect(base.mdePer100).toBeGreaterThan(0)
    expect(minimumDetectableEffect(0.6, 3000, 3000, 250, 0.1).mdePer100).toBeGreaterThan(base.mdePer100)
    expect(minimumDetectableEffect(0.6, 300, 300, 25, 0.02).mdePer100).toBeGreaterThan(base.mdePer100)
  })

  it('never claims zero noise when the early control rate is exactly 0 or 1', () => {
    expect(minimumDetectableEffect(1, 50, 50, 5, 0.05).mdePer100).toBeGreaterThan(5)
    expect(minimumDetectableEffect(0, 50, 50, 5, 0.05).mdePer100).toBeGreaterThan(5)
  })

  it('has design effect 1 when each rider has one order', () => {
    expect(minimumDetectableEffect(0.5, 100, 100, 1, 0.3).deff).toBe(1)
  })

  it('matches the formula (1.96 + 0.84) x sqrt(p(1-p)(1/nB + 1/nC) x DEFF) x 100', () => {
    const m = minimumDetectableEffect(0.6, 3000, 3000, 250, 0.02)
    const deff = 1 + 249 * 0.02
    expect(m.deff).toBeCloseTo(deff, 9)
    expect(m.mdePer100).toBeCloseTo(2.8 * Math.sqrt(0.24 * (2 / 3000) * deff) * 100, 1)
  })
})

describe('breakEvenPer100', () => {
  it('is 8.6 on the case basis and 10.3 with the ₹18 rider fee, at a 60% baseline', () => {
    expect(breakEvenPer100(DEFAULT_VERDICT_CONFIG, 0.6)).toBeCloseTo(8.571, 2)
    expect(breakEvenPer100({ ...DEFAULT_VERDICT_CONFIG, riderFee: 18 }, 0.6)).toBeCloseTo(10.345, 2)
  })
})

describe('verdict', () => {
  it('says GO when the lower end of the interval clears break-even', () => {
    const v = judge(cleanWin())
    expect(v.verdict).toBe('GO')
    expect(v.upliftPer100).toBeCloseTo(12, 6)
    expect(v.ci95[0]).toBeGreaterThanOrEqual(v.breakEven)
    expect(v.caveat).toBeUndefined()
  })

  it('does not say GO on a point estimate that clears break-even while the interval does not', () => {
    // Uplift ~10 per 100 (above the 8.6 break-even) but the gap swings from pair to pair (+8, +12), so the lower end falls below it.
    const data: VerdictData = {
      flagged: { bonus: arm(cells(8, 250, [190, 160], 'b')), control: arm(cells(8, 250, [170, 130], 'c')) },
    }
    const v = judge(data)
    expect(v.upliftPer100).toBeGreaterThan(v.breakEven)
    expect(v.ci95[0]).toBeLessThan(v.breakEven)
    expect(v.verdict).toBe('RE-PRICE')
  })

  it('adds a caveat when GO clears the case break-even but not the conservative one', () => {
    const data: VerdictData = { flagged: { bonus: arm(cells(8, 250, [174], 'b')), control: arm(cells(8, 250, [150], 'c')) } }
    const v = judge(data)
    expect(v.verdict).toBe('GO')
    expect(v.caveat).toMatch(/rider fee|conservative/i)
  })

  it('says KILL below the kill floor', () => {
    const data: VerdictData = { flagged: { bonus: arm(cells(8, 250, [155], 'b')), control: arm(cells(8, 250, [150], 'c')) } }
    const v = judge(data)
    expect(v.verdict).toBe('KILL')
    expect(v.reason).toMatch(/floor|no meaningful/i)
  })

  it('scenario 13: changing the rule after it was planned makes the verdict INVALID', () => {
    const changed: VerdictConfig = { ...DEFAULT_VERDICT_CONFIG, killFloor: 1 }
    const v = judge(cleanWin(), changed, PLANNED)
    expect(v.verdict).toBe('INVALID')
    expect(v.reason).toMatch(/rule changed after planning/i)
  })

  it('INVALID beats every other verdict, even INCOMPLETE and guardrail KILLs', () => {
    const data: VerdictData = { flagged: { bonus: arm(cells(2, 10, [5], 'b'), 50), control: arm(cells(2, 10, [4], 'c'), 50) }, readings: { falseAttemptRate: 0.5 } }
    expect(judge(data, { ...DEFAULT_VERDICT_CONFIG, bonus: 20 }, PLANNED).verdict).toBe('INVALID')
  })

  it('says INCOMPLETE when too few orders have reached a final state', () => {
    const data = cleanWin()
    const v = judge({ flagged: { bonus: arm(data.flagged.bonus.riders, 400), control: arm(data.flagged.control.riders, 400) } })
    expect(v.verdict).toBe('INCOMPLETE')
    expect(v.terminalShare).toBeCloseTo(4000 / 4800, 6)
    expect(v.reason).toMatch(/final|terminal|open/i)
  })

  it('says INCOMPLETE with fewer than 6 pairs', () => {
    const v = judge({ flagged: { bonus: arm(cells(5, 250, [180], 'b')), control: arm(cells(8, 250, [150], 'c')) } })
    expect(v.verdict).toBe('INCOMPLETE')
    expect(v.pairs).toBe(5)
    expect(v.reason).toMatch(/only 5 pairs/i)
  })

  it('says INCOMPLETE when a dropped pair takes the usable count below 6, and says so', () => {
    const bonus = cells(6, 250, [180], 'b')
    const control = [...cells(5, 250, [150], 'c'), cell('c5', 'p5', 0, 0)]
    const v = judge({ flagged: { bonus: arm(bonus), control: arm(control) } })
    expect(v.verdict).toBe('INCOMPLETE')
    expect(v.pairs).toBe(5)
    expect(v.droppedPairs).toBe(1)
    expect(v.reason).toMatch(/left out|no finished/i)
  })

  it('says GO with exactly 6 pairs', () => {
    const v = judge({ flagged: { bonus: arm(cells(6, 250, [180], 'b')), control: arm(cells(6, 250, [150], 'c')) } })
    expect(v.pairs).toBe(6)
    expect(v.verdict).toBe('GO')
  })

  it('says INCOMPLETE, not a false KILL, when there is no data, and says why', () => {
    const v = judge({ flagged: { bonus: arm([]), control: arm([]) } })
    expect(v.verdict).toBe('INCOMPLETE')
    expect(v.reason).toMatch(/start the day/i)
  })

  it('says "1 pair", not "1 pairs"', () => {
    const v = judge({ flagged: { bonus: arm(cells(1, 250, [180], 'b')), control: arm(cells(8, 250, [150], 'c')) } })
    expect(v.reason).toMatch(/only 1 pair\b/)
  })

  it('scenario 14: a guardrail breach means KILL even with a strong uplift, and names the guardrail', () => {
    const data: VerdictData = { ...cleanWin(), readings: { falseAttemptRate: 0.11 } }
    const v = judge(data)
    expect(v.verdict).toBe('KILL')
    expect(v.breachedGuardrail).toBe('false attempts')
    expect(v.reason).toMatch(/fake/i)
  })

  it('a fake-attempt rate above the limit is a KILL', () => {
    const v = judge({ ...cleanWin(), readings: { falseAttemptRate: 0.08 } })
    expect(v.verdict).toBe('KILL')
    expect(v.breachedGuardrail).toBe('false attempts')
    expect(v.reason).toMatch(/8\.0% of attempts/)
  })

  it('has exactly two safety rules: normal orders and fake attempts', () => {
    expect(Object.keys(DEFAULT_VERDICT_CONFIG.guardrails).sort()).toEqual(['falseAttemptRate', 'normalOrderDeltaPts'])
  })

  it('carries the confirmed strikes next to the suspected rate without judging on them', () => {
    const v = judge({ ...cleanWin(), readings: { falseAttemptRate: 0.02, strikes: 3 } })
    expect(v.verdict).toBe('GO')
    expect(v.fakeAttempts).toEqual({ suspectedRate: 0.02, strikes: 3, enough: true })
  })

  it('does not let a handful of attempts stop the pilot: under 30 attempts the fake-attempt rule stays silent, but still shows the number', () => {
    const v = judge({ ...cleanWin(), readings: { falseAttemptRate: 0.2, attempts: 12 } })
    expect(v.verdict).toBe('GO')
    expect(v.fakeAttempts).toMatchObject({ suspectedRate: 0.2, attempts: 12, enough: false })
  })

  it('judges the fake-attempt rate once there are 30 attempts', () => {
    expect(judge({ ...cleanWin(), readings: { falseAttemptRate: 0.1, attempts: 29 } }).verdict).toBe('GO')
    const v = judge({ ...cleanWin(), readings: { falseAttemptRate: 0.1, attempts: 30 } })
    expect(v.verdict).toBe('KILL')
    expect(v.breachedGuardrail).toBe('false attempts')
  })

  it('KILLs when normal orders fall by more than the guardrail, whatever the uplift', () => {
    const data: VerdictData = {
      ...cleanWin(),
      normal: { bonus: arm(cells(8, 500, [430], 'nb')), control: arm(cells(8, 500, [450], 'nc')) },
    }
    const v = judge(data)
    expect(v.normalDeltaPts).toBeCloseTo(-4, 6)
    expect(v.verdict).toBe('KILL')
    expect(v.breachedGuardrail).toBe('normal orders')
  })

  it('passes guardrails that are within their limits', () => {
    const v = judge({ ...cleanWin(), readings: { falseAttemptRate: 0.02 } })
    expect(v.verdict).toBe('GO')
    expect(v.breachedGuardrail).toBeUndefined()
  })

  it('reports the smallest effect the pilot could detect, from the pair-by-pair spread', () => {
    const data: VerdictData = { flagged: { bonus: arm(cells(8, 250, [190, 160], 'b')), control: arm(cells(8, 250, [170, 130], 'c')) } }
    const v = judge(data)
    expect(v.mdePer100).toBeGreaterThan(0)
    expect(v.mdePer100).toBeCloseTo(2.8 * (v.spreadPer100 / Math.sqrt(8)), 6)
    expect(v.mdeText).toMatch(/smallest effect/i)
  })

  it('does not claim it can detect anything when too few pairs have finished (identical gaps in 2 pairs would give 0.0)', () => {
    const v = judge({ flagged: { bonus: arm(cells(2, 250, [180], 'b')), control: arm(cells(2, 250, [150], 'c')) } })
    expect(v.pairs).toBe(2)
    expect(v.mdePer100).toBe(0)
    expect(v.mdeText).toMatch(/not yet known/)
  })

  it('on RE-PRICE the reason points to a pre-planned Pilot 2, never to re-reading the same data', () => {
    const data: VerdictData = { flagged: { bonus: arm(cells(8, 250, [190, 160], 'b')), control: arm(cells(8, 250, [170, 130], 'c')) } }
    const v = judge(data)
    expect(v.verdict).toBe('RE-PRICE')
    expect(v.reason).toMatch(/Pilot 2/)
    expect(v.reason).not.toMatch(/re-?test/i)
  })

  it('uses the pair-by-pair range for the decision and keeps the rider-by-rider range as a cross-check', () => {
    const data: VerdictData = { flagged: { bonus: arm(cells(8, 250, [190, 160], 'b')), control: arm(cells(8, 250, [170, 130], 'c')) } }
    const v = judge(data)
    const paired = comparePairs(pairUp(data.flagged.bonus.riders, data.flagged.control.riders).pairs)
    expect(v.ci95).toEqual(paired.ci95)
    expect(v.crossCheck.ci95).toEqual(compareArms(data.flagged.bonus.riders, data.flagged.control.riders).ci95)
    expect(v.crossCheck.ci95[1] - v.crossCheck.ci95[0]).toBeGreaterThan(v.ci95[1] - v.ci95[0])
  })

  it('says whether the stricter cross-check would make the same call', () => {
    // Pair gaps steady (+10) but riders differ hugely between pairs: the paired range clears break-even, the stricter one does not.
    const bonus = [220, 130, 200, 120, 210, 140, 190, 150].map((y, i) => cell(`b${i}`, `p${i}`, 250, y))
    const control = [195, 105, 175, 95, 185, 115, 165, 125].map((y, i) => cell(`c${i}`, `p${i}`, 250, y))
    const v = judge({ flagged: { bonus: arm(bonus), control: arm(control) } })
    expect(v.verdict).toBe('GO')
    expect(v.crossCheck.sameCall).toBe(false)
    expect(judge(cleanWin()).crossCheck.sameCall).toBe(true)
  })

  it('uses the same pair-by-pair method for the normal-order check', () => {
    const data: VerdictData = {
      ...cleanWin(),
      normal: { bonus: arm(cells(8, 500, [430, 440], 'nb')), control: arm(cells(8, 500, [450, 450], 'nc')) },
    }
    const v = judge(data)
    expect(v.normalDeltaPts).toBeCloseTo(-3, 6)
    expect(v.normalCi95[0]).toBeLessThan(-3)
    expect(v.normalCi95[1]).toBeGreaterThan(-3)
  })

  it('rejects an alpha other than 0.05, which is the only level implemented', () => {
    const odd: VerdictConfig = { ...DEFAULT_VERDICT_CONFIG, alpha: 0.1 }
    expect(() => verdict(cleanWin(), odd, ruleHash(odd))).toThrow(/alpha/i)
  })
})
