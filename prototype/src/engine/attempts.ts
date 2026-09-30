/**
 * Post-failure check. After a rider marks an attempt as failed, the customer is asked on WhatsApp:
 * "Did the rider reach you?" and, if the rider says the customer asked for it, "Did you ask to reschedule?".
 * This stops fake "attempted" marks being used to shed a hard stop or claim a Rescue Bonus.
 */
export type AttemptClaim = 'customer_unavailable' | 'reschedule_requested' | 'address_not_found'

export interface CustomerAnswers {
  /** null = customer has not answered yet */
  readonly riderReached: boolean | null
  readonly askedReschedule: boolean | null
}

export type AttemptStatus = 'verified' | 'suspect' | 'unverified'

export interface AttemptAssessment {
  readonly status: AttemptStatus
  readonly reason: string
  /** A suspect attempt withholds the bonus on this order until someone reviews it. */
  readonly bonusBlocked: boolean
}

const verified = (reason: string): AttemptAssessment => ({ status: 'verified', reason, bonusBlocked: false })
const unverified = (reason: string): AttemptAssessment => ({ status: 'unverified', reason, bonusBlocked: false })
const suspect = (reason: string): AttemptAssessment => ({ status: 'suspect', reason, bonusBlocked: true })

/**
 * "Reached" means the rider visited or called. A customer who confirms contact corroborates the attempt;
 * it cannot prove the reason the rider gave, so the reason stays the rider's claim.
 */
export function assessAttempt(claim: AttemptClaim, answers: CustomerAnswers): AttemptAssessment {
  if (answers.riderReached === null) return unverified('Waiting for the customer to answer')
  if (!answers.riderReached) return suspect('Customer says the rider never came')

  if (claim === 'reschedule_requested') {
    if (answers.askedReschedule === null) return unverified('Waiting to hear whether the customer asked to reschedule')
    return answers.askedReschedule
      ? verified('Customer confirms they asked to reschedule')
      : suspect('Customer says they did not ask to reschedule')
  }
  return verified('Customer confirms the rider came')
}

export interface AssessmentSummary {
  readonly verified: number
  readonly suspect: number
  readonly unverified: number
  readonly total: number
}

export function summariseAssessments(items: readonly AttemptAssessment[]): AssessmentSummary {
  const count = (s: AttemptStatus): number => items.filter((a) => a.status === s).length
  return { verified: count('verified'), suspect: count('suspect'), unverified: count('unverified'), total: items.length }
}

export const REVIEW_THRESHOLD = 2

/** A rider with two or more suspect attempts goes to review. */
export function riderNeedsReview(items: readonly AttemptAssessment[]): boolean {
  return summariseAssessments(items).suspect >= REVIEW_THRESHOLD
}

/** What the rider's phone recorded at the door. Simulated in the prototype: genuine 30-150 m, the demo "fake" path over 500 m. */
export interface AttemptEvidence {
  readonly gpsDistM: number
  readonly calls: number
  readonly waitMin: number
}

export type AttemptConfidence = 'high' | 'medium' | 'low'

export const EVIDENCE_RULE = { genuineMaxM: 200, fakeMinM: 500, minCalls: 2, minWaitMin: 5 } as const

/**
 * High = at the door (GPS within 200 m), at least 2 calls and at least 5 minutes of waiting, with no customer contradiction.
 * Low = GPS over 500 m from the address, or the customer says the rider never came. Medium otherwise (including no evidence).
 * A low attempt opens an exception for Ops.
 */
export function attemptConfidence(evidence: AttemptEvidence | undefined, customerContradicts: boolean): AttemptConfidence {
  if (customerContradicts) return 'low'
  if (!evidence) return 'medium'
  if (evidence.gpsDistM > EVIDENCE_RULE.fakeMinM) return 'low'
  const atDoor = evidence.gpsDistM <= EVIDENCE_RULE.genuineMaxM
  return atDoor && evidence.calls >= EVIDENCE_RULE.minCalls && evidence.waitMin >= EVIDENCE_RULE.minWaitMin ? 'high' : 'medium'
}
