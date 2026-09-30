import { describe, expect, it } from 'vitest'
import { createDay } from '../domain/day.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { isDayState } from './guards.ts'

const day = createDay(syntheticGeo(getHub('powai')), { seed: 1, orders: 20, riders: 4 })

describe('isDayState', () => {
  it('accepts a real day, including after a JSON round trip', () => {
    expect(isDayState(day)).toBe(true)
    expect(isDayState(JSON.parse(JSON.stringify(day)))).toBe(true)
  })

  it('refuses things that are not a day', () => {
    for (const bad of [null, undefined, 42, 'day', [], {}, { version: 1 }]) expect(isDayState(bad)).toBe(false)
  })

  it('refuses a day with any part missing or the wrong type (old shape, corruption, hostile payload)', () => {
    for (const key of ['hub', 'config', 'riders', 'stopOrder', 'stops', 'otps', 'messages', 'ledger', 'parcels', 'feed', 'rejectedTransitions', 'schema', 'version', 'seed', 'started', 'nextId']) {
      const broken: Record<string, unknown> = { ...day }
      delete broken[key]
      expect(isDayState(broken), key).toBe(false)
    }
    expect(isDayState({ ...day, version: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isDayState({ ...day, stops: [] })).toBe(false)
    expect(isDayState({ ...day, config: { bonus: 15 } })).toBe(false)
    expect(isDayState({ ...day, hub: { id: 'x' } })).toBe(false)
  })

  it('refuses a day saved with an older lifecycle (schema) and one whose config lacks the attempt limit', () => {
    expect(isDayState({ ...day, schema: day.schema - 1 })).toBe(false)
    expect(isDayState({ ...day, config: { bonus: 15, uplift: 0.12, basePay: 20 } })).toBe(false)
  })
})
