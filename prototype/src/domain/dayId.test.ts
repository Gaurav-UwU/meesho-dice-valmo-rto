import { describe, expect, it } from 'vitest'
import { DAY_RESET_MESSAGE, checkActionDay, isNewerDay, newDayId } from './dayId.ts'

const at = (dayId: string, dayNo: number, version: number) => ({ dayId, dayNo, version })

describe('newDayId', () => {
  it('makes a different id every call and a short readable one', () => {
    let n = 0
    const random = (): number => [0.1, 0.2, 0.9][n++ % 3]
    const a = newDayId(1_700_000_000_000, random, 3)
    const b = newDayId(1_700_000_000_000, random, 3)
    expect(a).not.toBe(b)
    expect(a).toMatch(/^d3-[0-9a-z]{6,20}$/)
  })

  it('two resets in a row differ even when the clock and the dice do not move', () => {
    expect(newDayId(5, () => 0.5, 1)).not.toBe(newDayId(5, () => 0.5, 2))
  })
})

describe('isNewerDay: which copy of the day wins', () => {
  it('within one day, the higher version wins', () => {
    expect(isNewerDay(at('a', 1, 5), at('a', 1, 4))).toBe(true)
    expect(isNewerDay(at('a', 1, 4), at('a', 1, 4))).toBe(false)
    expect(isNewerDay(at('a', 1, 3), at('a', 1, 4))).toBe(false)
  })

  it('a newer day beats an older one however many actions the old one took', () => {
    expect(isNewerDay(at('b', 2, 0), at('a', 1, 500))).toBe(true)
  })

  it('an older day never beats a newer one, even with a much higher version', () => {
    expect(isNewerDay(at('a', 1, 500), at('b', 2, 0))).toBe(false)
  })

  it('two resets at the same time (same day number) settle the same way on every device', () => {
    const x = at('dAAA', 3, 10)
    const y = at('dBBB', 3, 99)
    expect(isNewerDay(y, x)).not.toBe(isNewerDay(x, y))
  })
})

describe('checkActionDay: an action belongs to the day its screen was showing', () => {
  it('lets an action through when it was made on the current day', () => {
    expect(checkActionDay({ dayId: 'a' }, 'a')).toEqual({ ok: true })
  })

  it('refuses an action made on a day that has since been reset, with a plain message', () => {
    expect(checkActionDay({ dayId: 'b' }, 'a')).toEqual({ ok: false, code: 'day_reset', message: DAY_RESET_MESSAGE })
    expect(DAY_RESET_MESSAGE).toMatch(/reset/i)
  })
})
