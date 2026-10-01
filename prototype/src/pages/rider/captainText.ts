import type { BonusReview, StrikeReason } from '../../domain/types.ts'
import { EVIDENCE_RULE } from '../../engine/attempts.ts'
import type { StringKey, Translate } from './i18n.ts'

const fill = (text: string, n: number): string => text.replace('{n}', String(n))

export const REASON_KEY: Readonly<Record<StrikeReason, StringKey>> = {
  phone_far: 'reasonPhoneFar',
  customer_says_nobody_came: 'reasonNobodyCame',
  repeated_pattern: 'reasonPattern',
  other: 'reasonOther',
}

/** Why a held bonus is held, in the rider's language: what the weak earlier attempt looked like. Built from the numbers, so it can be shown in Hindi too. */
export function weakWhy(t: Translate, weak: BonusReview['weak']): string {
  const parts: string[] = []
  if (weak.gpsDistM !== null && weak.gpsDistM > EVIDENCE_RULE.genuineMaxM) parts.push(fill(t('weakFar'), Math.round(weak.gpsDistM)))
  if (weak.calls !== null && weak.calls < EVIDENCE_RULE.minCalls) parts.push(weak.calls === 0 ? t('weakNoCalls') : fill(t('weakFewCalls'), weak.calls))
  if (weak.waitMin !== null && weak.waitMin < EVIDENCE_RULE.minWaitMin) parts.push(weak.waitMin === 0 ? t('weakNoWait') : fill(t('weakShortWait'), weak.waitMin))
  return `${t('earlierAttempt')}: ${parts.length === 0 ? t('weakGeneric') : parts.join(', ')}`
}

/** The one line the rider sees about a bonus under the parking-gap check, or undefined when there is nothing to say */
export function holdLine(t: Translate, amount: number, review: BonusReview | undefined, status: string): string | undefined {
  if (review === undefined) return undefined
  // Once the bonus left the hold (for example clawed back after a return) there is nothing waiting to say.
  if (review.state === 'waiting' && status !== 'accrued' && status !== 'pending') return undefined
  if (review.state === 'waiting') return `₹${amount} ${t('waitingReview')}: ${weakWhy(t, review.weak)}`
  if (review.state === 'withheld') return `₹${amount} ${t('withheldBy')}${review.reason ? `: ${t(REASON_KEY[review.reason])}` : ''}`
  if (review.state === 'default_released') return `₹${amount} ${t('releasedByDefault')}`
  return undefined
}
