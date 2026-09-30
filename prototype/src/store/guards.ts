import { DAY_SCHEMA } from '../domain/day.ts'
import type { DayState } from '../domain/types.ts'

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/**
 * Structural check for a saved or received day. Anything that does not look like a full day (old shape, corrupted,
 * or hostile) is refused, so screens never render half a state and crash.
 */
export function isDayState(x: unknown): x is DayState {
  if (!isObj(x)) return false
  const { hub, config } = x
  return (
    x.schema === DAY_SCHEMA &&
    typeof x.version === 'number' &&
    Number.isFinite(x.version) &&
    typeof x.seed === 'number' &&
    typeof x.started === 'boolean' &&
    typeof x.nextId === 'number' &&
    typeof x.simNow === 'number' &&
    Number.isFinite(x.simNow) &&
    isObj(hub) &&
    typeof hub.id === 'string' &&
    typeof hub.lat === 'number' &&
    typeof hub.lng === 'number' &&
    isObj(config) &&
    typeof config.bonus === 'number' &&
    typeof config.uplift === 'number' &&
    typeof config.basePay === 'number' &&
    typeof config.maxAttempts === 'number' &&
    Array.isArray(x.riders) &&
    Array.isArray(x.stopOrder) &&
    isObj(x.stops) &&
    isObj(x.otps) &&
    Array.isArray(x.messages) &&
    Array.isArray(x.ledger) &&
    Array.isArray(x.parcels) &&
    Array.isArray(x.feed) &&
    Array.isArray(x.rejectedTransitions) &&
    Array.isArray(x.events) &&
    Array.isArray(x.exceptions) &&
    isObj(x.strikes) &&
    isObj(x.router)
  )
}
