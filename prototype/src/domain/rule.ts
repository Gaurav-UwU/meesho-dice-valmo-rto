import { DEFAULT_VERDICT_CONFIG, ruleHash, type VerdictConfig } from '../engine/verdict.ts'
import type { DayConfig } from './types.ts'

/** The decision rule a day is judged by: the standard rule with the day's bonus. */
export const verdictConfigFor = (config: DayConfig): VerdictConfig => ({ ...DEFAULT_VERDICT_CONFIG, bonus: config.bonus })

/** Stamped on the day when it starts. A verdict against a different rule is INVALID. */
export const plannedRuleHash = (config: DayConfig): string => ruleHash(verdictConfigFor(config))
