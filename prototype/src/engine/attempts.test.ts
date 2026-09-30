import { describe, expect, it } from 'vitest'
import { assessAttempt, attemptConfidence, riderNeedsReview, summariseAssessments } from './attempts.ts'

describe('post-failure check: "Did the rider reach you? Did you ask to reschedule?"', () => {
  it('flags an attempt as suspect when the customer says the rider never came', () => {
    const r = assessAttempt('customer_unavailable', { riderReached: false, askedReschedule: null })
    expect(r.status).toBe('suspect')
    expect(r.bonusBlocked).toBe(true)
    expect(r.reason).toMatch(/never came/i)
  })

  it('accepts "customer unavailable" when the customer confirms the rider came', () => {
    const r = assessAttempt('customer_unavailable', { riderReached: true, askedReschedule: false })
    expect(r.status).toBe('verified')
    expect(r.bonusBlocked).toBe(false)
  })

  it('accepts a claimed reschedule only if the customer really asked for one', () => {
    expect(assessAttempt('reschedule_requested', { riderReached: true, askedReschedule: true }).status).toBe('verified')
    const fake = assessAttempt('reschedule_requested', { riderReached: true, askedReschedule: false })
    expect(fake.status).toBe('suspect')
    expect(fake.reason).toMatch(/did not ask/i)
    expect(fake.bonusBlocked).toBe(true)
  })

  it('stays unverified while the customer has not answered', () => {
    const r = assessAttempt('customer_unavailable', { riderReached: null, askedReschedule: null })
    expect(r.status).toBe('unverified')
    expect(r.bonusBlocked).toBe(false)
  })

  it('a claimed reschedule stays unverified until the second answer arrives', () => {
    const r = assessAttempt('reschedule_requested', { riderReached: true, askedReschedule: null })
    expect(r.status).toBe('unverified')
  })

  it('accepts "address not found" when the customer confirms contact', () => {
    expect(assessAttempt('address_not_found', { riderReached: true, askedReschedule: null }).status).toBe('verified')
  })
})

describe('rider review', () => {
  const suspect = assessAttempt('customer_unavailable', { riderReached: false, askedReschedule: null })
  const ok = assessAttempt('customer_unavailable', { riderReached: true, askedReschedule: false })

  it('counts each status', () => {
    expect(summariseAssessments([suspect, ok, ok])).toEqual({ verified: 2, suspect: 1, unverified: 0, total: 3 })
  })

  it('sends a rider for review after two suspect attempts', () => {
    expect(riderNeedsReview([suspect])).toBe(false)
    expect(riderNeedsReview([suspect, ok, suspect])).toBe(true)
  })
})

describe('attempt confidence from evidence (GPS at the door, calls, wait)', () => {
  const genuine = { gpsDistM: 80, calls: 2, waitMin: 6 }

  it('is high with GPS within 200 m, at least 2 calls and at least 5 minutes of waiting', () => {
    expect(attemptConfidence(genuine, false)).toBe('high')
    expect(attemptConfidence({ gpsDistM: 200, calls: 2, waitMin: 5 }, false)).toBe('high')
  })

  it('is low when the GPS pin is over 500 m from the address', () => {
    expect(attemptConfidence({ gpsDistM: 900, calls: 3, waitMin: 10 }, false)).toBe('low')
  })

  it('is low when the customer says the rider never came, whatever the evidence', () => {
    expect(attemptConfidence(genuine, true)).toBe('low')
    expect(attemptConfidence(undefined, true)).toBe('low')
  })

  it('is medium in between: a near-miss on any of the three checks', () => {
    expect(attemptConfidence({ gpsDistM: 300, calls: 2, waitMin: 6 }, false)).toBe('medium')
    expect(attemptConfidence({ gpsDistM: 80, calls: 1, waitMin: 6 }, false)).toBe('medium')
    expect(attemptConfidence({ gpsDistM: 80, calls: 2, waitMin: 4 }, false)).toBe('medium')
    expect(attemptConfidence({ gpsDistM: 500, calls: 2, waitMin: 6 }, false)).toBe('medium')
  })

  it('is medium when there is no evidence at all and nobody disputes the attempt', () => {
    expect(attemptConfidence(undefined, false)).toBe('medium')
  })
})
