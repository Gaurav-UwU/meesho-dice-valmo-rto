import { describe, expect, it } from 'vitest'
import { backtest, BACKTEST_CASES_PER_REPLAY } from './backtest.ts'

describe('backtest of the match forecast on synthetic history', () => {
  const r = backtest()

  it('replays 40 histories of every hub\'s 60 listings', () => {
    expect(r.cases).toBe(40 * BACKTEST_CASES_PER_REPLAY)
    expect(r.cases).toBe(9600)
  })

  it('is deterministic for a seed, and a different seed gives a different (but similar) answer', () => {
    expect(backtest()).toEqual(r)
    const other = backtest({ seed: 2 })
    expect(other.brier).not.toBe(r.brier)
    expect(Math.abs(other.overall - r.overall)).toBeLessThan(0.02)
  })

  it('puts every case in exactly one bin of predicted match rate', () => {
    expect(r.bins.reduce((t, b) => t + b.n, 0)).toBe(r.cases)
    for (const b of r.bins) {
      if (b.n === 0) continue
      expect(b.predicted).toBeGreaterThanOrEqual(b.lo)
      expect(b.predicted).toBeLessThan(b.hi)
    }
    expect(r.bins.map((b) => b.label)).toEqual(['0–5%', '5–10%', '10–15%', '15–20%', '20–30%', '30%+'])
  })

  it('is calibrated on average: the forecast and what happened agree within 4 points across the bins', () => {
    const gap = r.bins.reduce((t, b) => t + b.n * Math.abs(b.predicted - b.actual), 0) / r.cases
    expect(gap).toBeLessThan(0.04)
  })

  it('no busy bin is far off, though the thin tail is forecast a little low and the top a little high (prior shrinkage)', () => {
    for (const b of r.bins) if (b.n >= 200) expect(Math.abs(b.predicted - b.actual)).toBeLessThan(0.08)
  })

  it('beats always guessing the average (Brier score), by a modest margin', () => {
    expect(r.brier).toBeLessThan(r.baselineBrier)
    expect(r.brier).toBeGreaterThan(0)
  })

  it('a stricter hold rule holds fewer parcels and each one finds a buyer more often, at 5.5% break-even', () => {
    const { holdAll, meanRule, lowEnd } = r.rules
    expect(holdAll.held).toBe(r.cases)
    expect(lowEnd.held).toBeLessThan(meanRule.held)
    expect(meanRule.held).toBeLessThan(holdAll.held)
    expect(lowEnd.actual).toBeGreaterThan(meanRule.actual)
    expect(meanRule.actual).toBeGreaterThan(holdAll.actual)
    expect(lowEnd.actual).toBeGreaterThan(r.breakEven)
    expect(lowEnd.netPerHeld).toBeGreaterThan(meanRule.netPerHeld)
    expect(lowEnd.netPerHeld).toBeCloseTo(lowEnd.actual * 145 - 8, 9)
  })

  it('is honest that the low-end rule does not always earn more in total: it trades volume for certainty', () => {
    const { meanRule, lowEnd } = r.rules
    // Total ₹ per 1,000 refused parcels. Reported as it comes out, not tuned.
    const total = (x: typeof lowEnd): number => (x.held * x.netPerHeld * 1000) / r.cases
    expect(Number.isFinite(total(lowEnd))).toBe(true)
    expect(total(lowEnd)).toBeGreaterThan(0)
    expect(total(meanRule)).toBeGreaterThan(0)
  })
})
