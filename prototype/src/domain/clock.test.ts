import { describe, expect, it } from 'vitest'
import { DAY_MS, DAY_START_MS, HOUR_MS, SIM_START, clockText, codReconciliationTime, dayIndex, nextDayStart } from './clock.ts'

describe('sim clock', () => {
  it('starts day 1 at 08:00', () => {
    expect(SIM_START).toBe(8 * HOUR_MS)
    expect(clockText(SIM_START)).toBe('Day 1 · 08:00')
    expect(dayIndex(SIM_START)).toBe(1)
  })

  it('rolls over to day 2 at midnight and shows the time of day', () => {
    expect(dayIndex(DAY_MS)).toBe(2)
    expect(clockText(DAY_MS + 13 * HOUR_MS + 5 * 60_000)).toBe('Day 2 · 13:05')
  })

  it('the next day starts at 08:00 of the following day', () => {
    expect(nextDayStart(SIM_START)).toBe(DAY_MS + DAY_START_MS)
    expect(nextDayStart(DAY_MS - 1)).toBe(DAY_MS + DAY_START_MS)
    expect(nextDayStart(DAY_MS + DAY_START_MS)).toBe(2 * DAY_MS + DAY_START_MS)
  })

  it('cash is reconciled at 20:00 on the day of the delivery', () => {
    expect(codReconciliationTime(SIM_START + HOUR_MS)).toBe(20 * HOUR_MS)
    expect(codReconciliationTime(DAY_MS + 9 * HOUR_MS)).toBe(DAY_MS + 20 * HOUR_MS)
  })
})
