import { describe, expect, it } from 'vitest'
import { bisect, clamp, logit, mean, sigmoid } from './math.ts'

describe('math helpers', () => {
  it('sigmoid and logit are inverses', () => {
    for (const p of [0.05, 0.17, 0.5, 0.9]) {
      expect(sigmoid(logit(p))).toBeCloseTo(p, 10)
    }
  })

  it('logit stays finite at the extremes', () => {
    expect(Number.isFinite(logit(0))).toBe(true)
    expect(Number.isFinite(logit(1))).toBe(true)
  })

  it('clamp bounds a value', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })

  it('mean of an empty list is 0', () => {
    expect(mean([])).toBe(0)
    expect(mean([1, 2, 3])).toBe(2)
  })

  it('bisect finds the root of an increasing function', () => {
    const root = bisect((x) => x * x * x - 8, 0, 10)
    expect(root).toBeCloseTo(2, 6)
  })
})
