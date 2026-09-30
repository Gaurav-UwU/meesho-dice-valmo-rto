import type { Controls } from './pilotModel.ts'

export type NumericKey = Exclude<keyof Controls, 'seed' | 'ruleChanged' | 'flaggedShare'>

/** Where a guardrail breaks: a reading above (or below) this value is a KILL. */
export interface Limit {
  readonly value: number
  readonly breaksWhen: 'above' | 'below'
}

export interface SliderSpec {
  readonly key: NumericKey
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly format: (v: number) => string
  /** One short line. Guardrails show their limit instead. */
  readonly help?: string
  readonly limit?: Limit
}

export const breaches = (limit: Limit, v: number): boolean => (limit.breaksWhen === 'above' ? v > limit.value : v < limit.value)
