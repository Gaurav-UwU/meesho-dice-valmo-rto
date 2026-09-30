import { describe, expect, it } from 'vitest'
import { DEFAULT_ROUTER_PARAMS } from '../engine/router.ts'
import { reduce } from './reducer.ts'
import { softAcceptRate } from './routing.ts'
import { AT, startedDay } from './testkit.ts'

const day = startedDay()

describe('Desk headline assumptions', () => {
  it('the soft-refusal accept rate sets no cash, wants it later and not home at once', () => {
    const s = reduce(day, { type: 'deskSetParam', at: AT, param: 'accept_soft', value: 0.3 })
    expect(s.router.acceptByReason).toMatchObject({ no_cash: 0.3, want_later: 0.3, not_home: 0.3 })
  })

  it('leaves the four hard reasons alone', () => {
    const s = reduce(day, { type: 'deskSetParam', at: AT, param: 'accept_soft', value: 0.9 })
    expect(s.router.acceptByReason).toMatchObject({
      changed_mind: DEFAULT_ROUTER_PARAMS.acceptByReason.changed_mind,
      cheaper_elsewhere: DEFAULT_ROUTER_PARAMS.acceptByReason.cheaper_elsewhere,
      not_ordered: 0,
      damaged: 0,
    })
  })

  it('is bounded to 0..1 and ignores a number that is not finite', () => {
    expect(reduce(day, { type: 'deskSetParam', at: AT, param: 'accept_soft', value: 7 }).router.acceptByReason.no_cash).toBe(1)
    expect(reduce(day, { type: 'deskSetParam', at: AT, param: 'accept_soft', value: -2 }).router.acceptByReason.not_home).toBe(0)
    expect(reduce(day, { type: 'deskSetParam', at: AT, param: 'accept_soft', value: Number.NaN })).toBe(day)
  })

  it('reads back as one number when the three soft rows agree, and as "mixed" (null) when they do not', () => {
    // The shipped defaults are 50% / 50% / 40%, so the headline starts as "mixed".
    expect(softAcceptRate(day.router)).toBeNull()
    const set = reduce(day, { type: 'deskSetParam', at: AT, param: 'accept_soft', value: 0.45 })
    expect(softAcceptRate(set.router)).toBe(0.45)
    const edited = reduce(set, { type: 'deskSetParam', at: AT, param: 'accept_no_cash', value: 0.2 })
    expect(softAcceptRate(edited.router)).toBeNull()
  })

  it('the conversion and shelf capacity headline numbers are still bounded', () => {
    expect(reduce(day, { type: 'deskSetParam', at: AT, param: 'conversion', value: 3 }).router.conversion).toBe(1)
    expect(reduce(day, { type: 'deskSetParam', at: AT, param: 'shelfCapacity', value: 12.4 }).router.shelfCapacity).toBe(12)
  })
})
