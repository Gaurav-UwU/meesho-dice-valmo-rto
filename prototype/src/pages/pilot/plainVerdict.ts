import type { VerdictResult } from '../../engine/verdict.ts'

/** The verdict in everyday words: a two-word title, one sentence of why, and what to do next. No statistics terms. */
export interface PlainVerdict {
  readonly title: string
  readonly sentence: string
  readonly next: string
}

const n = (x: number): string => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(1)}`

const SAFETY_WORDS: Readonly<Record<string, string>> = {
  'normal orders': 'normal orders get worse',
  'false attempts': 'too many fake attempts compared with Control riders',
}

/** "The worst case we can't rule out" is the low end of the 95% range; the page never needs the word "interval". */
export function plainVerdict(v: VerdictResult): PlainVerdict {
  const est = n(v.upliftPer100)
  const low = n(v.ci95[0])
  const need = n(v.breakEven)
  switch (v.verdict) {
    case 'GO':
      return {
        title: 'Scale it',
        sentence: `The bonus adds about ${est} deliveries per 100 flagged orders. Even the worst case we can't rule out (${low}) is above the ${need} it needs to pay for itself.`,
        next: 'Roll it out to more hubs.',
      }
    case 'RE-PRICE':
      return {
        title: 'Not proven yet',
        sentence: `The bonus probably helps (about ${est} per 100), but it isn't proven to pay: the worst case we can't rule out (${low}) is below the ${need} it needs.`,
        next: 'Run Pilot 2 with one change (Top 10% or a smaller bonus), with its rule fixed before it starts.',
      }
    case 'KILL':
      return v.breachedGuardrail
        ? {
            title: 'Stop',
            sentence: `It breaks a safety rule: ${SAFETY_WORDS[v.breachedGuardrail] ?? v.breachedGuardrail}. That stops it, however much it helps.`,
            next: 'Stop, find out why, and fix it before any retest.',
          }
        : {
            title: 'Stop',
            sentence: `The bonus barely helps (about ${est} per 100). It needs at least +${v.killFloor} to be worth keeping.`,
            next: 'Stop and keep the money.',
          }
    case 'INCOMPLETE':
      return {
        title: 'Not enough data',
        sentence:
          v.terminalShare < 0.9
            ? `Too early: only ${Math.round(v.terminalShare * 100)}% of flagged orders have finished, and the rule needs 90%.`
            : `Too few pairs of riders to judge: ${v.pairs}, and the rule needs at least 6.`,
        next: 'Run it longer or with more riders.',
      }
    case 'INVALID':
      return {
        title: 'Result not usable',
        sentence: 'The decision rule was changed after the pilot was planned, so this result cannot be used to decide.',
        next: 'Plan the pilot again with the new rule, then run it.',
      }
  }
}
