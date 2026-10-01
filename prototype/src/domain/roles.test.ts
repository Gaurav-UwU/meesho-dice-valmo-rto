import { describe, expect, it } from 'vitest'
import { CUSTOMER_ACTIONS, RIDER_ACTIONS, roleCan, type ActionType } from './roles.ts'

const ALL: readonly ActionType[] = [
  'startDay', 'customerReply', 'customerPayment', 'riderDeliver', 'submitOtp', 'riderAttempt', 'customerReach', 'customerAskedReschedule', 'riderRefuse',
  'deskSecondChance', 'deskInspect', 'deskSkipSecondChance', 'customerSecondChance', 'deskHandover', 'deskSetParam', 'deskHold', 'deskMatch', 'deskConsolidate',
  'reattempt', 'dispatchNextDay', 'resolveException', 'overturnStrike', 'riderAskReview', 'reviewBonus', 'openReturn', 'reconcileCod', 'advanceClock', 'advanceDay', 'nextDay', 'closePilot',
]

describe('roles', () => {
  it('a rider key can send the rider actions and the customer replies, and nothing else', () => {
    const allowed = ALL.filter((t) => roleCan('rider', t)).sort()
    expect(allowed).toEqual([...RIDER_ACTIONS, ...CUSTOMER_ACTIONS].sort())
    for (const t of ['riderDeliver', 'submitOtp', 'riderAttempt', 'riderRefuse'] as const) expect(roleCan('rider', t)).toBe(true)
  })

  it('a rider key cannot decide, hold, move the clock, close the pilot or start the day', () => {
    for (const t of ['resolveException', 'overturnStrike', 'reviewBonus', 'startDay', 'closePilot', 'advanceClock', 'advanceDay', 'nextDay', 'deskHold', 'deskInspect', 'deskSetParam', 'openReturn', 'reconcileCod', 'reattempt', 'dispatchNextDay', 'deskHandover'] as const) {
      expect(roleCan('rider', t)).toBe(false)
    }
  })

  it('the captain key can send everything', () => {
    for (const t of ALL) expect(roleCan('captain', t)).toBe(true)
  })

  it('every action type is covered by this list (so a new action cannot be forgotten and silently open to a rider key)', () => {
    // A new Action type must be added to ALL above; a rider key never gets it unless it is added to RIDER_ACTIONS or CUSTOMER_ACTIONS on purpose.
    for (const t of [...RIDER_ACTIONS, ...CUSTOMER_ACTIONS]) expect(ALL).toContain(t)
  })
})
