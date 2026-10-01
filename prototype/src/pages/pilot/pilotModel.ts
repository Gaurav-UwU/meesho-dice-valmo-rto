import {
  annualNetCr,
  breakEvenDelta,
  CONSERVATIVE,
  DEFAULTS,
  netPer100,
  rtoPointsSaved,
  rtoPointValueCr,
  sensitivityTable,
  type BonusParams,
} from '../../engine/economics.ts'
import { causalHeadline, type CausalHeadline } from '../../engine/headline.ts'
import { DEFAULT_PILOT, outcomeOdds, simulatePilot, type OutcomeOdds, type PilotInput, type PilotResult } from '../../engine/pilot.ts'
import { DEFAULT_TARGET_SHARE, flaggedPerDayForShare, flaggedPerYearForShare, targetingFor, type TargetShare } from '../../engine/targeting.ts'
import { DEFAULT_VERDICT_CONFIG, ruleHash } from '../../engine/verdict.ts'

/** Everything the sliders control. Percent-style values are in points (12 = +12 per 100), not fractions. */
export interface Controls {
  /** Who gets the bonus: the riskiest X% of orders. Chosen before the pilot. */
  readonly flaggedShare: TargetShare
  readonly uplift: number
  readonly bonus: number
  readonly baseline: number
  readonly spillover: number
  readonly days: number
  readonly flaggedPerDay: number
  readonly ridersPerHub: number
  /** Extra fake attempts for Bonus riders, in points above Control (the second safety rule is relative to Control) */
  readonly fakeExtra: number
  /** Demo of pre-registration: loosen the kill floor AFTER planning, and watch the verdict go INVALID */
  readonly ruleChanged: boolean
  readonly seed: number
}

export const DEFAULT_CONTROLS: Controls = {
  flaggedShare: DEFAULT_TARGET_SHARE,
  uplift: DEFAULT_PILOT.trueUplift * 100,
  bonus: DEFAULTS.bonus,
  baseline: DEFAULT_PILOT.baselineSuccess * 100,
  spillover: DEFAULT_PILOT.normalSpillover * 100,
  days: DEFAULT_PILOT.days,
  flaggedPerDay: DEFAULT_PILOT.flaggedPerDayPerHub,
  ridersPerHub: DEFAULT_PILOT.ridersPerHub,
  fakeExtra: DEFAULT_PILOT.fakeAttemptExtra * 100,
  ruleChanged: false,
  seed: DEFAULT_PILOT.seed,
}

export const CHART_MAX_DELTA = 25
export const SENSITIVITY_BONUSES: readonly number[] = [10, 15, 20]
export const SENSITIVITY_DELTAS: readonly number[] = [5, 10, 15, 20]

/** The deck's RTO today and the deck's target, used for the cost-per-delivery bars. */
export const RTO_TODAY = 0.17
export const RTO_TARGET = 0.14

/** The rule as planned (with the bonus on the slider), and the rule the result is judged by: the same, unless someone loosened it afterwards. */
export function verdictRules(c: Controls): { readonly planned: typeof DEFAULT_VERDICT_CONFIG; readonly judged: typeof DEFAULT_VERDICT_CONFIG } {
  const planned = { ...DEFAULT_VERDICT_CONFIG, bonus: c.bonus }
  return { planned, judged: c.ruleChanged ? { ...planned, killFloor: planned.killFloor - 1 } : planned }
}

/** Pick who gets the bonus. The baseline and the orders per day follow the choice (both can still be changed under More assumptions). */
export function withTargeting(c: Controls, share: TargetShare): Controls {
  return { ...c, flaggedShare: share, baseline: targetingFor(share).baselineSuccess, flaggedPerDay: flaggedPerDayForShare(share) }
}

export function toPilotInput(c: Controls): PilotInput {
  const { planned, judged } = verdictRules(c)
  return {
    ...DEFAULT_PILOT,
    ridersPerHub: c.ridersPerHub,
    flaggedShare: c.flaggedShare / 100,
    fakeAttemptExtra: c.fakeExtra / 100,
    verdictConfig: judged,
    plannedHash: ruleHash(planned),
    trueUplift: c.uplift / 100,
    baselineSuccess: c.baseline / 100,
    normalSpillover: c.spillover / 100,
    days: c.days,
    flaggedPerDayPerHub: c.flaggedPerDay,
    seed: c.seed,
  }
}

export interface PnlPoint {
  readonly delta: number
  readonly dataPack: number
  readonly conservative: number
}

export interface PilotView {
  readonly result: PilotResult
  readonly params: BonusParams
  readonly conservativeParams: BonusParams
  readonly chart: readonly PnlPoint[]
  readonly breakEven: number
  readonly breakEvenConservative: number
  readonly observedUplift: number
  readonly netDataPack: number
  readonly netConservative: number
  readonly annualCr: number
  readonly annualCrConservative: number
  readonly rtoPoints: number
  readonly rtoPointsValueCr: number
  readonly sensitivity: readonly (readonly number[])[]
  readonly flaggedPerDayAllHubs: number
  /** Flagged orders a year at the chosen cut, for the yearly rupees */
  readonly flaggedPerYear: number
  /** The page's one set of "does it pay?" numbers, all at the success rate the Control group actually showed, so they match the verdict */
  readonly pay: PayNumbers
  /** What the bonus caused: extra deliveries, the bonus bill, the return legs avoided, net */
  readonly headline: CausalHeadline
  /** How often each verdict would come up if this pilot were run again with different luck */
  readonly odds: OutcomeOdds
}

export interface PayNumbers {
  readonly net: number
  /** If Valmo also pays the rider ₹18 on each rescued delivery */
  readonly netConservative: number
  readonly annualCr: number
  readonly breakEven: number
  readonly breakEvenConservative: number
}

export const ODDS_REPLICATES = 300

export function payNumbers(c: Controls, uplift: number, controlPct: number, flaggedPerYear: number): PayNumbers {
  const seen: BonusParams = { ...DEFAULTS, bonus: c.bonus, baselineSuccess: controlPct }
  const seenConservative: BonusParams = { ...CONSERVATIVE, bonus: c.bonus, baselineSuccess: controlPct }
  return {
    net: netPer100(uplift, seen),
    netConservative: netPer100(uplift, seenConservative),
    annualCr: annualNetCr(c.bonus, uplift, seen, flaggedPerYear),
    breakEven: breakEvenDelta(seen),
    breakEvenConservative: breakEvenDelta(seenConservative),
  }
}

/**
 * All numbers the Pilot page shows. The engine's own P&L fields fix the bonus at ₹15, so the P&L here is
 * recomputed from the bonus slider. Sensitivity stays on the deck basis (60% baseline) so it matches slide 5.
 */
export function derivePilotView(c: Controls): PilotView {
  const input = toPilotInput(c)
  const result = simulatePilot(input)
  const params: BonusParams = { ...DEFAULTS, bonus: c.bonus, baselineSuccess: c.baseline }
  const conservativeParams: BonusParams = { ...CONSERVATIVE, bonus: c.bonus, baselineSuccess: c.baseline }
  const chart: PnlPoint[] = []
  for (let i = 0; i <= CHART_MAX_DELTA * 2; i++) {
    const delta = i / 2
    chart.push({ delta, dataPack: netPer100(delta, params), conservative: netPer100(delta, conservativeParams) })
  }
  const observedUplift = result.pooled.upliftPer100
  const rtoPoints = rtoPointsSaved(observedUplift, c.flaggedShare / 100)
  const flaggedPerYear = flaggedPerYearForShare(c.flaggedShare)
  return {
    result,
    params,
    conservativeParams,
    chart,
    breakEven: breakEvenDelta(params),
    breakEvenConservative: breakEvenDelta(conservativeParams),
    observedUplift,
    netDataPack: netPer100(observedUplift, params),
    netConservative: netPer100(observedUplift, conservativeParams),
    annualCr: annualNetCr(c.bonus, observedUplift, params, flaggedPerYear),
    annualCrConservative: annualNetCr(c.bonus, observedUplift, conservativeParams, flaggedPerYear),
    flaggedPerYear,
    pay: payNumbers(c, observedUplift, result.pooled.flagged.control.rate * 100, flaggedPerYear),
    rtoPoints,
    rtoPointsValueCr: rtoPoints * rtoPointValueCr(),
    sensitivity: sensitivityTable(SENSITIVITY_BONUSES, SENSITIVITY_DELTAS),
    flaggedPerDayAllHubs: c.flaggedPerDay * input.hubs.length,
    headline: causalHeadline({
      bonusTerminal: result.pooled.flagged.bonus.n,
      bonusDelivered: result.pooled.flagged.bonus.delivered,
      controlTerminal: result.pooled.flagged.control.n,
      controlDelivered: result.pooled.flagged.control.delivered,
      bonus: c.bonus,
      reverse: params.reverseCost,
      ci95: result.pooled.ci95,
    }),
    odds: outcomeOdds(input, ODDS_REPLICATES),
  }
}
