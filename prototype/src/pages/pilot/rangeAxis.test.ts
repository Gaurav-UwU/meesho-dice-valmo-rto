import { describe, expect, it } from 'vitest'
import { axisFor } from './rangeAxis.ts'

describe('range diagram axis', () => {
  it('covers every value on round steps of 5, from at most 0 up to at least 20', () => {
    const a = axisFor({ estimate: 12.2, ci: [7.1, 17.4], breakEven: 8.3, killFloor: 3 })
    expect(a.lo).toBe(-5)
    expect(a.hi).toBe(20)
    expect(a.ticks).toEqual([-5, 0, 5, 10, 15, 20])
  })

  it('grows for wide ranges, with ticks every 10 so labels do not crowd, and ignores an infinite end', () => {
    const a = axisFor({ estimate: 5, ci: [-12, 31], breakEven: 8.6, killFloor: 3 })
    expect(a.lo).toBe(-20)
    expect(a.hi).toBe(40)
    expect(a.ticks).toEqual([-20, -10, 0, 10, 20, 30, 40])
    const day = axisFor({ estimate: 45, ci: [29.6, 61], breakEven: 6.9, killFloor: 3 })
    expect(day.ticks.length).toBeLessThanOrEqual(9)
    const b = axisFor({ estimate: 5, ci: [-Infinity, Infinity], breakEven: 8.6, killFloor: 3 })
    expect(Number.isFinite(b.lo) && Number.isFinite(b.hi)).toBe(true)
  })
})
