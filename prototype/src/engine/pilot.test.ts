import { describe, expect, it } from 'vitest'
import { BAND_OFFSETS, DEFAULT_PILOT, FAIR_GAP_PTS, checkFairness, isBorderline, outcomeOdds, simulatePilot } from './pilot.ts'
import { DEFAULT_VERDICT_CONFIG, ruleHash, type VerdictResult } from './verdict.ts'

describe('simulatePilot: design', () => {
  it('is deterministic for a seed', () => {
    expect(simulatePilot(DEFAULT_PILOT)).toEqual(simulatePilot(DEFAULT_PILOT))
  })

  it('runs 4 hubs, ~12k flagged orders over 30 days, split evenly between arms', () => {
    const r = simulatePilot(DEFAULT_PILOT)
    expect(r.hubs).toHaveLength(4)
    const n = r.pooled.flagged.bonus.n + r.pooled.flagged.control.n
    expect(n).toBe(12000)
    expect(r.pooled.flagged.bonus.n).toBe(r.pooled.flagged.control.n)
  })

  it('randomises riders, not orders: every pair has one rider with the bonus and one without', () => {
    const r = simulatePilot(DEFAULT_PILOT)
    expect(r.verdictResult.pairs).toBe((DEFAULT_PILOT.ridersPerHub / 2) * DEFAULT_PILOT.hubs.length)
    for (const h of r.hubs) expect(h.pairs).toBe(DEFAULT_PILOT.ridersPerHub / 2)
  })

  it('drops the odd rider out so riders can be paired', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, hubs: ['powai'], ridersPerHub: 13 })
    expect(r.hubs[0].pairs).toBe(6)
  })

  it('pairs riders on their past delivery rate before the coin flip, so the groups start equally skilled', () => {
    // With no true effect, any gap between groups comes from rider skill alone. Pairing on past rate keeps the gap small.
    const seeds = Array.from({ length: 40 }, (_, i) => i + 1)
    const runs = seeds.map((seed) => simulatePilot({ ...DEFAULT_PILOT, seed, trueUplift: 0, riderEffectSd: 0.5 }))
    const meanGap = runs.reduce((t, r) => t + Math.abs(r.pooled.upliftPer100), 0) / runs.length
    const meanPastGap = runs.reduce((t, r) => t + Math.abs(r.fairness.pastRate.bonus - r.fairness.pastRate.control), 0) / runs.length
    expect(meanGap).toBeLessThan(2.5)
    // A plain coin flip over the same riders would leave a gap of about 3 points; pairing on past rate brings it to about 1.
    expect(meanPastGap).toBeLessThan(0.015)
  })

  it('starts every hub from the same delivery rate: there are no per-city starting rates in the pilot', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0, riderEffectSd: 0, normalRiderEffectSd: 0 })
    const rates = r.hubs.map((h) => h.flagged.control.rate)
    expect(Math.max(...rates) - Math.min(...rates)).toBeLessThan(0.05)
  })

  it('gives riders a random effect: rider spread widens the honest interval', () => {
    const flat = simulatePilot({ ...DEFAULT_PILOT, riderEffectSd: 0, normalRiderEffectSd: 0 })
    const noisy = simulatePilot({ ...DEFAULT_PILOT, riderEffectSd: 0.5 })
    const width = (r: typeof flat): number => r.pooled.ci95[1] - r.pooled.ci95[0]
    expect(width(noisy)).toBeGreaterThan(width(flat))
  })

  it('scenario 15 at pilot level: the stricter rider-by-rider range is wider than the pair-by-pair range, and roughly agrees with it', () => {
    const r = simulatePilot(DEFAULT_PILOT)
    const v = r.verdictResult
    const width = (ci: readonly [number, number]): number => ci[1] - ci[0]
    expect(width(v.crossCheck.ci95)).toBeGreaterThan(width(v.ci95))
    expect(Math.abs(v.crossCheck.diffPer100 - v.upliftPer100)).toBeLessThan(2)
    // The two ranges overlap: they are two readings of the same pilot.
    expect(v.crossCheck.ci95[0]).toBeLessThan(v.ci95[1])
    expect(v.crossCheck.ci95[1]).toBeGreaterThan(v.ci95[0])
  })

  it('the pair-by-pair range has its centre within a point or two of the stricter method over many pilots', () => {
    const gaps = Array.from({ length: 30 }, (_, i) => {
      const v = simulatePilot({ ...DEFAULT_PILOT, seed: 100 + i * 17 }).verdictResult
      return Math.abs(v.upliftPer100 - v.crossCheck.diffPer100)
    })
    expect(gaps.reduce((a, b) => a + b, 0) / gaps.length).toBeLessThan(1)
  })

  it('reports the smallest effect the pilot could detect, from the pair-by-pair spread', () => {
    const r = simulatePilot(DEFAULT_PILOT)
    expect(r.verdictResult.mdePer100).toBeGreaterThan(1)
    expect(r.verdictResult.mdePer100).toBeLessThan(15)
    expect(r.verdictResult.mdeText).toMatch(/smallest effect/i)
    expect(r.verdictResult.mdePer100).toBeCloseTo(2.8 * (r.verdictResult.spreadPer100 / Math.sqrt(r.verdictResult.pairs)), 6)
  })

  it('keeps the gap in every pair so the maths panel can show its working', () => {
    const r = simulatePilot(DEFAULT_PILOT)
    expect(r.pooled.gaps).toHaveLength(24)
    expect(r.pooled.gaps.reduce((a, b) => a + b, 0) / 24).toBeCloseTo(r.pooled.upliftPer100, 9)
    for (const h of r.hubs) expect(h.gaps).toHaveLength(6)
  })

  it('the pooled range is the same pair-by-pair range the verdict uses', () => {
    const r = simulatePilot(DEFAULT_PILOT)
    expect(r.pooled.ci95).toEqual(r.verdictResult.ci95)
    expect(r.pooled.upliftPer100).toBe(r.verdictResult.upliftPer100)
  })
})

describe('simulatePilot: the fair-comparison check', () => {
  it('passes for default settings: same rider skill, same parcel risk mix', () => {
    const f = simulatePilot(DEFAULT_PILOT).fairness
    expect(f.fair).toBe(true)
    expect(f.maxGapPts).toBeLessThan(FAIR_GAP_PTS)
  })

  it('passes across many seeds (the pairing is what keeps it fair)', () => {
    const fails = Array.from({ length: 40 }, (_, i) => simulatePilot({ ...DEFAULT_PILOT, seed: 500 + i * 13 }).fairness).filter((f) => !f.fair)
    expect(fails.length).toBeLessThanOrEqual(1)
  })

  it('gives each group a past delivery rate near the baseline', () => {
    const f = simulatePilot(DEFAULT_PILOT).fairness
    expect(f.pastRate.bonus).toBeGreaterThan(0.5)
    expect(f.pastRate.bonus).toBeLessThan(0.7)
    expect(f.pastRate.control).toBeGreaterThan(0.5)
    expect(f.pastRate.control).toBeLessThan(0.7)
  })

  it('gives each group a high / very high / extreme mix that adds to 1 and is about a third each', () => {
    const { bandMix } = simulatePilot(DEFAULT_PILOT).fairness
    for (const arm of [bandMix.bonus, bandMix.control]) {
      expect(arm.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
      for (const share of arm) expect(Math.abs(share - 1 / 3)).toBeLessThan(0.03)
    }
  })

  it('draws the three risk bands around the baseline: 70 / 60 / 50 at the deck default, averaging 60', () => {
    expect(BAND_OFFSETS.map((o) => Math.round((0.6 + o) * 100))).toEqual([70, 60, 50])
    expect(BAND_OFFSETS.reduce((a, b) => a + b, 0) / 3).toBeCloseTo(0, 9)
  })

  it('checkFairness warns when the past rate differs by more than 5 points', () => {
    const f = checkFairness({ pastRate: { bonus: 0.66, control: 0.6 }, bandMix: { bonus: [1 / 3, 1 / 3, 1 / 3], control: [1 / 3, 1 / 3, 1 / 3] } })
    expect(f.fair).toBe(false)
    expect(f.maxGapPts).toBeCloseTo(6, 6)
    expect(f.warning).toMatch(/past delivery rate/i)
  })

  it('checkFairness warns when one risk band is over-represented by more than 5 points', () => {
    const f = checkFairness({ pastRate: { bonus: 0.6, control: 0.6 }, bandMix: { bonus: [0.4, 0.3, 0.3], control: [0.3, 0.35, 0.35] } })
    expect(f.fair).toBe(false)
    expect(f.warning).toMatch(/risk/i)
  })

  it('checkFairness is fair at exactly the limit and stays silent', () => {
    const f = checkFairness({ pastRate: { bonus: 0.65, control: 0.6 }, bandMix: { bonus: [0.35, 0.3, 0.35], control: [0.3, 0.35, 0.35] } })
    expect(f.fair).toBe(true)
    expect(f.warning).toBeUndefined()
  })
})

describe('simulatePilot: verdicts', () => {
  it('a big real effect says GO', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0.22 })
    expect(r.pooled.upliftPer100).toBeGreaterThan(15)
    expect(r.verdict).toBe('GO')
    expect(r.pooled.ci95[0]).toBeLessThan(r.pooled.upliftPer100)
    expect(r.pooled.ci95[1]).toBeGreaterThan(r.pooled.upliftPer100)
    expect(r.pooled.ci95[0]).toBeGreaterThanOrEqual(r.verdictResult.breakEven)
  })

  it('the default +12 does not guarantee GO: over many pilots it is sometimes GO and sometimes RE-PRICE', () => {
    const odds = outcomeOdds(DEFAULT_PILOT, 300)
    expect(odds.GO).toBeGreaterThan(0.05)
    expect(odds.GO).toBeLessThan(0.95)
    expect(odds['RE-PRICE']).toBeGreaterThan(0.05)
  })

  it('a modest +5 effect is mostly RE-PRICE, never a confident GO', () => {
    const odds = outcomeOdds({ ...DEFAULT_PILOT, trueUplift: 0.05 }, 300)
    expect(odds['RE-PRICE']).toBeGreaterThan(0.4)
    expect(odds.GO).toBeLessThan(0.02)
  })

  it('no effect is almost always KILL', () => {
    const odds = outcomeOdds({ ...DEFAULT_PILOT, trueUplift: 0 }, 300)
    expect(odds.KILL).toBeGreaterThan(0.8)
    expect(odds.GO).toBeLessThan(0.01)
  })

  it('odds add up to 1 and are deterministic', () => {
    const a = outcomeOdds(DEFAULT_PILOT, 50)
    expect(Object.values(a).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 9)
    expect(outcomeOdds(DEFAULT_PILOT, 50)).toEqual(a)
  })

  it('KILLs when normal orders get worse, whatever the uplift (guardrail)', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0.2, normalSpillover: -0.03 })
    expect(r.pooled.normalDeltaPts).toBeLessThan(-1)
    expect(r.verdict).toBe('KILL')
    expect(r.verdictResult.breachedGuardrail).toBe('normal orders')
  })

  it('scenario 14 at pilot level: too many fake attempts KILLs even with a strong uplift', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0.22, falseAttemptRate: 0.12 })
    expect(r.verdict).toBe('KILL')
    expect(r.verdictResult.breachedGuardrail).toBe('false attempts')
  })

  it('the pilot input has no returns, complaints or on-time settings any more', () => {
    expect(Object.keys(DEFAULT_PILOT)).not.toEqual(expect.arrayContaining(['returnsDeltaPts']))
    expect(Object.keys(DEFAULT_PILOT).filter((k) => /returns|complaints|onTime/i.test(k))).toEqual([])
  })

  it('scenario 13 at pilot level: judging with a rule that differs from the planned one is INVALID', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0.22, verdictConfig: { ...DEFAULT_VERDICT_CONFIG, killFloor: 1 } })
    expect(r.verdict).toBe('INVALID')
    expect(r.reason).toMatch(/rule changed after planning/i)
  })

  it('a new rule planned in advance is judged normally', () => {
    const config = { ...DEFAULT_VERDICT_CONFIG, bonus: 20 }
    const r = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0.22, verdictConfig: config, plannedHash: ruleHash(config) })
    expect(r.verdict).not.toBe('INVALID')
  })

  it('says INCOMPLETE when there are fewer than 6 pairs to judge', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, hubs: ['powai'], ridersPerHub: 8 })
    expect(r.verdictResult.pairs).toBe(4)
    expect(r.verdict).toBe('INCOMPLETE')
    expect(r.reason).toMatch(/pairs/i)
  })

  it('is not borderline for a clear win', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0.25 })
    expect(r.borderline).toBe(false)
  })

  it('warns when a GO holds on the case basis but not the conservative one', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0.15, seed: 5 })
    if (r.verdict === 'GO' && r.verdictResult.caveat) expect(r.reason).toMatch(/rider fee/i)
    else expect(r.reason.length).toBeGreaterThan(5)
  })

  it('attaches the P&L at the observed uplift, on both bases', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0.15 })
    expect(r.netPer100).toBeGreaterThan(r.netPer100Conservative)
    expect(r.netPer100).toBeGreaterThan(0)
    expect(r.rtoPointsSaved).toBeCloseTo(r.pooled.upliftPer100 * 0.2, 6)
  })

  it('reports each hub separately, each with its own pairs and range', () => {
    const r = simulatePilot(DEFAULT_PILOT)
    expect(r.hubs.map((h) => h.hubId)).toEqual(['powai', 'whitefield', 'lucknow', 'gaya'])
    for (const h of r.hubs) {
      expect(h.ci95[0]).toBeLessThan(h.upliftPer100)
      expect(h.ci95[1]).toBeGreaterThan(h.upliftPer100)
    }
  })

  it('reports "no data" for a zero-day pilot instead of a false KILL story', () => {
    const r = simulatePilot({ ...DEFAULT_PILOT, days: 0 })
    expect(r.insufficientData).toBe(true)
    expect(r.pooled.upliftPer100).toBe(0)
    expect(r.reason).toMatch(/no data/i)
    expect(r.borderline).toBe(false)
  })

  it('reports "no data" with no hubs', () => {
    expect(simulatePilot({ ...DEFAULT_PILOT, hubs: [] }).insufficientData).toBe(true)
  })

  it('computes the P&L on the baseline the pilot actually observed', () => {
    const low = simulatePilot({ ...DEFAULT_PILOT, baselineSuccess: 0.4, trueUplift: 0.15 })
    const high = simulatePilot({ ...DEFAULT_PILOT, baselineSuccess: 0.8, trueUplift: 0.15 })
    expect(low.netPer100).toBeGreaterThan(high.netPer100)
  })
})

describe('isBorderline', () => {
  const base: VerdictResult = simulatePilot({ ...DEFAULT_PILOT, trueUplift: 0.22 }).verdictResult
  const withCi = (verdict: VerdictResult['verdict'], ci95: readonly [number, number], normalCi95: readonly [number, number] = [-0.4, 0.4]): VerdictResult => ({
    ...base,
    verdict,
    ci95,
    normalCi95,
    breakEven: 8.6,
    killFloor: 3,
    normalOrderLimit: -1,
  })

  it('GO is borderline when the low end only just clears break-even', () => {
    expect(isBorderline(withCi('GO', [9, 14]))).toBe(true)
    expect(isBorderline(withCi('GO', [12, 18]))).toBe(false)
  })

  it('RE-PRICE is borderline when the interval reaches break-even or the kill floor', () => {
    expect(isBorderline(withCi('RE-PRICE', [5, 11]))).toBe(true)
    expect(isBorderline(withCi('RE-PRICE', [2, 7]))).toBe(true)
    expect(isBorderline(withCi('RE-PRICE', [4, 8]))).toBe(false)
  })

  it('KILL is borderline when the interval reaches the kill floor', () => {
    expect(isBorderline(withCi('KILL', [0, 4]))).toBe(true)
    expect(isBorderline(withCi('KILL', [-2, 1]))).toBe(false)
  })

  it('any decision is borderline when the normal-order interval straddles the guardrail', () => {
    expect(isBorderline(withCi('GO', [12, 16], [-1.8, -0.4]))).toBe(true)
  })

  it('INVALID and INCOMPLETE are never "borderline": they are not decisions', () => {
    expect(isBorderline(withCi('INVALID', [5, 11]))).toBe(false)
    expect(isBorderline(withCi('INCOMPLETE', [5, 11]))).toBe(false)
  })
})
