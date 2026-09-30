import { CONSERVATIVE, DEFAULTS, FLAGGED_SHARE, netPer100, rtoPointsSaved } from './economics.ts'
import { clamp, logit, sigmoid } from './math.ts'
import { createRng, type Rng } from './rng.ts'
import type { Arm, HubId } from './types.ts'
import { DEFAULT_VERDICT_CONFIG, comparePairs, pairUp, ruleHash, verdict, type RiderCell, type VerdictConfig, type VerdictLabel, type VerdictResult } from './verdict.ts'

/**
 * 30-day A/B pilot simulator. RIDERS are randomised, not orders. Within each hub every rider has a hidden skill and an observed
 * PAST delivery rate on risky parcels (their skill plus the luck of about 125 past parcels). Riders are sorted by past rate, paired with the
 * nearest neighbour, and a coin decides which rider of each pair gets the bonus. The verdict is the shared `verdict()` rule: for each pair,
 * Bonus rider's rate minus their partner's; the effect is the average of those differences.
 *
 * Each flagged parcel also carries a risk band (high / very high / extreme, a third each) with its own "delivered anyway" rate, and both groups
 * draw from the same band mix. `fairness` shows that the two groups started equally skilled and carried the same mix.
 *
 * Outcomes are simulated because the pilot has not run. The link from the bonus to rider effort to delivery is ASSUMED:
 * `trueUplift` is put in by hand; this shows how the decision would be made, not evidence that it works.
 */
export type Verdict = VerdictLabel

/** How far each risk band sits from the baseline "delivered anyway" rate: 70 / 60 / 50 at the deck's 60. They average to the baseline. */
export const BAND_OFFSETS: readonly [number, number, number] = [0.1, 0, -0.1]
export const BAND_NAMES: readonly [string, string, string] = ['High', 'Very high', 'Extreme']
/** How many past parcels a rider's observed past rate is built from. Fewer parcels = a noisier past rate = worse pairing. */
export const PAST_PARCELS = 125
/** The two groups are "fairly matched" when no measured gap (past rate, or any risk band's share) is wider than this many points. */
export const FAIR_GAP_PTS = 5
/** Noise on the simulated fake-attempt reading, in share of attempts. Assumption. */
const FAKE_READING_NOISE = 0.005
const BINOMIAL_EXACT_MAX = 64
const BAND_SHARE_FIRST = 1 / 3
const BAND_SHARE_SECOND_OF_REST = 1 / 2
const RATE_FLOOR = 0.02

export interface PilotInput {
  readonly hubs: readonly HubId[]
  readonly days: number
  readonly flaggedPerDayPerHub: number
  readonly normalPerDayPerHub: number
  /** Riders per hub. An odd number drops one rider so riders can be paired. */
  readonly ridersPerHub: number
  /** Success rate of flagged orders without the bonus, the same in every hub (deck assumption: 60%). The three risk bands sit 10 points above and below it. */
  readonly baselineSuccess: number
  readonly normalBaselineSuccess: number
  /** True extra share delivered on flagged orders (0.12 = +12 per 100). ASSUMED, not measured. */
  readonly trueUplift: number
  /** Change in normal-order success for Bonus riders (negative = the bonus hurts normal orders) */
  readonly normalSpillover: number
  /** Share of all orders that are flagged (0.2 = the riskiest 20%). Only scales the network RTO points here. */
  readonly flaggedShare: number
  /** How much riders differ in skill on flagged orders (standard deviation, logit scale). Pairing on past rate is what controls for it. */
  readonly riderEffectSd: number
  /** Same, for normal orders: routine orders depend less on the rider. Assumption. */
  readonly normalRiderEffectSd: number
  /** True share of Bonus riders' attempts that look fake (the second safety rule) */
  readonly falseAttemptRate: number
  /** The rule the result is judged by, and the hash of the rule as it was when the pilot was planned */
  readonly verdictConfig: VerdictConfig
  readonly plannedHash: string
  readonly seed: number
}

export const DEFAULT_PILOT: PilotInput = {
  hubs: ['powai', 'whitefield', 'lucknow', 'gaya'],
  days: 30,
  flaggedPerDayPerHub: 100,
  normalPerDayPerHub: 400,
  ridersPerHub: 12,
  baselineSuccess: 0.6,
  normalBaselineSuccess: 0.89,
  trueUplift: 0.12,
  normalSpillover: 0,
  flaggedShare: FLAGGED_SHARE,
  riderEffectSd: 0.3,
  normalRiderEffectSd: 0.15,
  falseAttemptRate: 0.02,
  verdictConfig: DEFAULT_VERDICT_CONFIG,
  plannedHash: ruleHash(DEFAULT_VERDICT_CONFIG),
  seed: 2026,
}

export interface ArmStats {
  readonly n: number
  readonly delivered: number
  readonly rate: number
}

export interface ArmPair {
  readonly bonus: ArmStats
  readonly control: ArmStats
}

export interface HubResult {
  readonly flagged: ArmPair
  readonly normal: ArmPair
  /** Extra deliveries per 100 flagged orders: the average of the pair differences */
  readonly upliftPer100: number
  /** 95% range, pair by pair */
  readonly ci95: readonly [number, number]
  /** Pairs the range is built from */
  readonly pairs: number
  /** The gap in each pair (Bonus rider minus partner), per 100 flagged orders */
  readonly gaps: readonly number[]
  /** Bonus minus Control on normal orders, in percentage points */
  readonly normalDeltaPts: number
  readonly normalCi95: readonly [number, number]
}

export interface HubPilotResult extends HubResult {
  readonly hubId: HubId
}

/** The fair-comparison check: were the two groups equally skilled and did they carry the same mix of risky parcels? */
export interface Fairness {
  /** Average past delivery rate of the riders in each group (0 to 1) */
  readonly pastRate: { readonly bonus: number; readonly control: number }
  /** Share of each group's flagged parcels in the high / very high / extreme band (each triple adds to 1) */
  readonly bandMix: { readonly bonus: readonly number[]; readonly control: readonly number[] }
  /** The widest gap between the groups on any of the four measures, in points */
  readonly maxGapPts: number
  /** True when `maxGapPts` is within FAIR_GAP_PTS */
  readonly fair: boolean
  readonly warning?: string
}

export interface PilotResult {
  readonly hubs: readonly HubPilotResult[]
  readonly pooled: HubResult
  readonly fairness: Fairness
  readonly verdict: Verdict
  readonly verdictResult: VerdictResult
  readonly reason: string
  /** True when the 95% range straddles a decision line, so the verdict could flip with more data */
  readonly borderline: boolean
  readonly netPer100: number
  readonly netPer100Conservative: number
  readonly rtoPointsSaved: number
  /** True when there was no data to judge (zero days or no hubs). The verdict is then meaningless. */
  readonly insufficientData: boolean
}

function binomial(rng: Rng, n: number, p: number): number {
  const q = clamp(p, 0, 1)
  if (n <= 0) return 0
  if (n <= BINOMIAL_EXACT_MAX) {
    let hits = 0
    for (let i = 0; i < n; i++) if (rng.next() < q) hits++
    return hits
  }
  // Normal approximation of the binomial: fine for the hundreds of orders a rider handles in a pilot.
  return clamp(Math.round(n * q + Math.sqrt(n * q * (1 - q)) * rng.normal()), 0, n)
}

/** The "delivered anyway" rate of each risk band for a rider of the given skill, before any bonus. */
const bandRates = (baseline: number, sd: number, skill: number): readonly number[] =>
  BAND_OFFSETS.map((o) => sigmoid(logit(clamp(baseline + o, RATE_FLOOR, 1 - RATE_FLOOR)) + sd * skill))

const average = (xs: readonly number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length)

interface HubSample {
  readonly flagged: Readonly<Record<Arm, readonly RiderCell[]>>
  readonly normal: Readonly<Record<Arm, readonly RiderCell[]>>
  /** Flagged parcels per risk band, by group */
  readonly bandCounts: Readonly<Record<Arm, readonly number[]>>
  /** Each rider's observed past delivery rate, by group */
  readonly pastRates: Readonly<Record<Arm, readonly number[]>>
}

function simulateHub(rng: Rng, input: PilotInput, hubId: HubId): HubSample {
  const riders = Math.max(2, input.ridersPerHub - (input.ridersPerHub % 2))
  const draws = Array.from({ length: riders }, (_, i) => {
    const skill = rng.normal()
    const past = binomial(rng, PAST_PARCELS, average(bandRates(input.baselineSuccess, input.riderEffectSd, skill))) / PAST_PARCELS
    return { i, skill, past }
  })

  // Pair riders who delivered equally well before the pilot; a coin flip inside each pair decides who gets the bonus.
  const arms = new Map<number, { readonly arm: Arm; readonly pairId: string }>()
  const byPastRate = [...draws].sort((a, b) => a.past - b.past || a.i - b.i)
  for (let k = 0; k + 1 < byPastRate.length; k += 2) {
    const pairId = `${hubId}-pair${k / 2 + 1}`
    const firstGetsBonus = rng.next() < 0.5
    arms.set(byPastRate[k].i, { arm: firstGetsBonus ? 'bonus' : 'control', pairId })
    arms.set(byPastRate[k + 1].i, { arm: firstGetsBonus ? 'control' : 'bonus', pairId })
  }

  const flaggedN = Math.floor((input.flaggedPerDayPerHub * input.days) / riders)
  const normalN = Math.floor((input.normalPerDayPerHub * input.days) / riders)
  const flagged: Record<Arm, RiderCell[]> = { bonus: [], control: [] }
  const normal: Record<Arm, RiderCell[]> = { bonus: [], control: [] }
  const bandCounts: Record<Arm, number[]> = { bonus: [0, 0, 0], control: [0, 0, 0] }
  const pastRates: Record<Arm, number[]> = { bonus: [], control: [] }
  for (const d of draws) {
    const slot = arms.get(d.i)
    if (slot === undefined) continue
    const { arm, pairId } = slot
    const riderId = `${hubId}-r${d.i}`
    pastRates[arm].push(d.past)

    // Each flagged parcel falls into one of three risk bands, a third each; the bonus lifts every band by the same points.
    const first = binomial(rng, flaggedN, BAND_SHARE_FIRST)
    const second = binomial(rng, flaggedN - first, BAND_SHARE_SECOND_OF_REST)
    const counts = [first, second, flaggedN - first - second]
    const rates = bandRates(input.baselineSuccess, input.riderEffectSd, d.skill)
    const lift = arm === 'bonus' ? input.trueUplift : 0
    let delivered = 0
    counts.forEach((n, b) => {
      bandCounts[arm][b] += n
      delivered += binomial(rng, n, rates[b] + lift)
    })
    flagged[arm].push({ riderId, pairId, n: flaggedN, y: delivered })

    const pNormal = sigmoid(logit(input.normalBaselineSuccess) + input.normalRiderEffectSd * d.skill) + (arm === 'bonus' ? input.normalSpillover : 0)
    normal[arm].push({ riderId, pairId, n: normalN, y: binomial(rng, normalN, pNormal) })
  }
  return { flagged, normal, bandCounts, pastRates }
}

const stats = (cells: readonly RiderCell[]): ArmStats => {
  const n = cells.reduce((t, c) => t + c.n, 0)
  const delivered = cells.reduce((t, c) => t + c.y, 0)
  return { n, delivered, rate: n === 0 ? 0 : delivered / n }
}

const gapRound = (x: number): number => Math.round(x * 1e6) / 1e6

/** Compare the two groups' past rate and risk mix. Fair when no gap is wider than FAIR_GAP_PTS points. */
export function checkFairness(input: Pick<Fairness, 'pastRate' | 'bandMix'>): Fairness {
  const pastGap = gapRound(Math.abs(input.pastRate.bonus - input.pastRate.control) * 100)
  const bandGaps = input.bandMix.bonus.map((share, i) => gapRound(Math.abs(share - input.bandMix.control[i]) * 100))
  const worstBand = bandGaps.reduce((best, g, i) => (g > bandGaps[best] ? i : best), 0)
  const maxGapPts = Math.max(pastGap, ...bandGaps)
  const fair = maxGapPts <= FAIR_GAP_PTS
  const warning = fair
    ? undefined
    : pastGap > FAIR_GAP_PTS
      ? `The past delivery rate of the two groups differs by ${pastGap.toFixed(1)} points (limit ${FAIR_GAP_PTS}), so they were not equally skilled to start with.`
      : `The risk mix differs: ${BAND_NAMES[worstBand].toLowerCase()}-risk parcels are ${(input.bandMix.bonus[worstBand] * 100).toFixed(0)}% of one group and ${(input.bandMix.control[worstBand] * 100).toFixed(0)}% of the other (limit ${FAIR_GAP_PTS} points).`
  return { ...input, maxGapPts, fair, ...(warning === undefined ? {} : { warning }) }
}

function fairnessOf(samples: readonly HubSample[]): Fairness {
  const past = (arm: Arm): number => average(samples.flatMap((s) => s.pastRates[arm]))
  const mix = (arm: Arm): readonly number[] => {
    const totals = [0, 1, 2].map((b) => samples.reduce((t, s) => t + s.bandCounts[arm][b], 0))
    const all = totals.reduce((a, b) => a + b, 0)
    return totals.map((t) => (all === 0 ? 0 : t / all))
  }
  return checkFairness({ pastRate: { bonus: past('bonus'), control: past('control') }, bandMix: { bonus: mix('bonus'), control: mix('control') } })
}

function summarise(sample: Pick<HubSample, 'flagged' | 'normal'>): HubResult {
  const flagged = comparePairs(pairUp(sample.flagged.bonus, sample.flagged.control).pairs)
  const normal = comparePairs(pairUp(sample.normal.bonus, sample.normal.control).pairs)
  return {
    flagged: { bonus: stats(sample.flagged.bonus), control: stats(sample.flagged.control) },
    normal: { bonus: stats(sample.normal.bonus), control: stats(sample.normal.control) },
    upliftPer100: flagged.diffPer100,
    ci95: flagged.ci95,
    pairs: flagged.pairs,
    gaps: flagged.gapsPer100,
    normalDeltaPts: normal.diffPer100,
    normalCi95: normal.ci95,
  }
}

const merge = (samples: readonly HubSample[]): Pick<HubSample, 'flagged' | 'normal'> => {
  const cat = (pick: (s: HubSample) => Readonly<Record<Arm, readonly RiderCell[]>>, arm: Arm): RiderCell[] => samples.flatMap((s) => [...pick(s)[arm]])
  return {
    flagged: { bonus: cat((s) => s.flagged, 'bonus'), control: cat((s) => s.flagged, 'control') },
    normal: { bonus: cat((s) => s.normal, 'bonus'), control: cat((s) => s.normal, 'control') },
  }
}

/**
 * True when the 95% range straddles a decision line, so more data could flip the verdict.
 * GO: the low end only just clears break-even (under 1 point of margin). RE-PRICE: the range reaches break-even or the kill floor.
 * KILL: the range reaches the kill floor. Any decision: the normal-order range straddles its safety limit.
 * INVALID and INCOMPLETE are not decisions, so they are never borderline.
 */
export function isBorderline(v: VerdictResult): boolean {
  if (v.verdict === 'INVALID' || v.verdict === 'INCOMPLETE') return false
  const straddles = (c: readonly [number, number], t: number): boolean => c[0] < t && c[1] >= t
  if (straddles(v.normalCi95, v.normalOrderLimit)) return true
  if (v.verdict === 'GO') return v.ci95[0] - v.breakEven < 1
  if (v.verdict === 'RE-PRICE') return straddles(v.ci95, v.breakEven) || straddles(v.ci95, v.killFloor)
  return straddles(v.ci95, v.killFloor)
}

export function simulatePilot(input: PilotInput): PilotResult {
  const rng = createRng(input.seed)
  const samples = input.hubs.map((hubId) => ({ hubId, sample: simulateHub(rng, input, hubId) }))
  const hubs: HubPilotResult[] = samples.map(({ hubId, sample }) => ({ hubId, ...summarise(sample) }))
  const all = merge(samples.map((x) => x.sample))
  const pooled = summarise(all)

  const verdictResult = verdict(
    {
      flagged: { bonus: { riders: all.flagged.bonus, open: 0 }, control: { riders: all.flagged.control, open: 0 } },
      normal: { bonus: { riders: all.normal.bonus, open: 0 }, control: { riders: all.normal.control, open: 0 } },
      // Bonus riders log an attempt for about every flagged parcel they fail to deliver.
      readings: { falseAttemptRate: Math.max(0, input.falseAttemptRate + rng.normal() * FAKE_READING_NOISE), attempts: pooled.flagged.bonus.n - pooled.flagged.bonus.delivered },
    },
    input.verdictConfig,
    input.plannedHash,
  )

  const insufficientData = hubs.length === 0 || pooled.flagged.bonus.n === 0 || pooled.flagged.control.n === 0
  // Judge the P&L on the baseline the pilot actually observed, not the deck's 60.
  const observed = { ...DEFAULTS, baselineSuccess: pooled.flagged.control.rate * 100 }
  const observedConservative = { ...CONSERVATIVE, baselineSuccess: pooled.flagged.control.rate * 100 }
  const reason = insufficientData
    ? 'No data: the pilot needs at least one hub and one day'
    : verdictResult.caveat
      ? `${verdictResult.reason} Caveat: ${verdictResult.caveat.charAt(0).toLowerCase()}${verdictResult.caveat.slice(1)}`
      : verdictResult.reason
  return {
    hubs,
    pooled,
    fairness: fairnessOf(samples.map((x) => x.sample)),
    verdict: verdictResult.verdict,
    verdictResult,
    reason,
    borderline: !insufficientData && isBorderline(verdictResult),
    netPer100: netPer100(pooled.upliftPer100, observed),
    netPer100Conservative: netPer100(pooled.upliftPer100, observedConservative),
    rtoPointsSaved: rtoPointsSaved(pooled.upliftPer100, input.flaggedShare),
    insufficientData,
  }
}

export type OutcomeOdds = Readonly<Record<VerdictLabel, number>>

const SEED_STRIDE = 7919

/**
 * How often each verdict comes up if the same pilot were run many times with different luck (different riders in each group, different noise).
 * Deterministic for a seed. This is the honest answer to "will it say GO?": usually not for certain.
 */
export function outcomeOdds(input: PilotInput, replicates = 300): OutcomeOdds {
  const counts: Record<VerdictLabel, number> = { INVALID: 0, INCOMPLETE: 0, KILL: 0, GO: 0, 'RE-PRICE': 0 }
  for (let k = 0; k < replicates; k++) counts[simulatePilot({ ...input, seed: input.seed + (k + 1) * SEED_STRIDE }).verdict]++
  return {
    INVALID: counts.INVALID / replicates,
    INCOMPLETE: counts.INCOMPLETE / replicates,
    KILL: counts.KILL / replicates,
    GO: counts.GO / replicates,
    'RE-PRICE': counts['RE-PRICE'] / replicates,
  }
}
