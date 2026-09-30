/**
 * The one decision rule, shared by the /pilot simulator, the Ops Bonus-vs-Control card and "Check today's Ops day".
 *
 * Riders are paired on how well they delivered risky parcels before the pilot, and a coin decides who in each pair gets the bonus.
 * For each pair we take the Bonus rider's delivery rate minus their partner's. The effect is the average of those differences, and
 * the 95% range is the average plus or minus about 2 x (spread of the differences / square root of the number of pairs).
 *
 *   INVALID     the rule was changed after the day/pilot was planned (compared by hash)
 *   INCOMPLETE  too few orders have a final outcome, or fewer than 6 usable pairs
 *   KILL        a safety rule was broken (normal orders, fake attempts), or the effect is under the kill floor
 *   GO          the LOW end of the 95% range clears break-even
 *   RE-PRICE    otherwise: a real effect that is not proven to pay for itself
 *
 * A stricter rider-by-rider range is kept as a cross-check (`crossCheck`). Nothing here is random.
 */

export type VerdictLabel = 'INVALID' | 'INCOMPLETE' | 'KILL' | 'GO' | 'RE-PRICE'

export interface Guardrails {
  /** Bonus minus Control success on normal orders, in points. Below this is a breach. */
  readonly normalOrderDeltaPts: number
  /** Share of the Bonus riders' attempts that look fake (far from the address, or the customer says nobody came). Above this is a breach. */
  readonly falseAttemptRate: number
}

export interface VerdictConfig {
  /** ₹ paid per rescued order */
  readonly bonus: number
  /** ₹ cost of a reverse leg */
  readonly reverse: number
  /** ₹ rider fee Valmo also pays on a rescued order: 0 on the case basis (the conservative case is 18) */
  readonly riderFee: number
  /** Uplift per 100 flagged orders below which the bonus is stopped */
  readonly killFloor: number
  readonly minTerminalShare: number
  /** Pairs of riders with finished flagged parcels that the rule needs before it says anything */
  readonly minPairs: number
  /** The fake-attempt rule stays silent until Bonus riders have logged this many attempts (a rate from a dozen attempts is noise) */
  readonly minFakeAttempts: number
  readonly alpha: number
  readonly guardrails: Guardrails
}

export const DEFAULT_VERDICT_CONFIG: VerdictConfig = {
  bonus: 15,
  reverse: 120,
  riderFee: 0,
  killFloor: 3,
  minTerminalShare: 0.9,
  minPairs: 6,
  minFakeAttempts: 30,
  alpha: 0.05,
  guardrails: { normalOrderDeltaPts: -1, falseAttemptRate: 0.05 },
}

/** The rider fee in the conservative case, used only for the caveat on a GO. */
export const CONSERVATIVE_RIDER_FEE = 18
const FALLBACK_ICC = 0.05
const Z_975 = 1.959964
const Z_POWER_80 = 0.84
/** (1.96 + 0.84): the smallest true effect the pilot would catch 80% of the time is about this many standard errors. */
const MDE_FACTOR = 2.8

/** One rider: `n` orders that reached a final outcome, of which `y` were delivered. Two riders with the same `pairId` are a pair. */
export interface RiderCell {
  readonly riderId: string
  readonly pairId: string
  readonly n: number
  readonly y: number
}

/** One pair: the rider who got the bonus and the equally-skilled rider who did not. */
export interface RiderPair {
  readonly bonus: RiderCell
  readonly control: RiderCell
}

export interface ArmSample {
  readonly riders: readonly RiderCell[]
  /** Orders of this arm still waiting for a final outcome */
  readonly open: number
}

export interface GuardrailReadings {
  /** Suspected fake attempts of Bonus riders: attempts flagged low-confidence / attempts logged. This is what the verdict judges. */
  readonly falseAttemptRate?: number
  /** Attempts the Bonus riders logged: the rate's denominator. Leave out when it is not known (the rule then always applies). */
  readonly attempts?: number
  /** Attempts Ops confirmed fake with a Strike. Shown next to the suspected rate; it is the stricter number and is not judged here. */
  readonly strikes?: number
}

export interface VerdictData {
  readonly flagged: { readonly bonus: ArmSample; readonly control: ArmSample }
  readonly normal?: { readonly bonus: ArmSample; readonly control: ArmSample }
  readonly readings?: GuardrailReadings
}

/** JSON with keys sorted, so the same rule always gives the same text. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

/** FNV-1a of the rule, as 8 hex characters. Stamped when the day or pilot is planned. */
export function ruleHash(config: VerdictConfig): string {
  const text = stableStringify(config)
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

const T_975_SMALL: readonly number[] = [12.706, 4.303, 3.182, 2.776]

/** Two-sided 95% t quantile. Exact table for 1 to 4 degrees of freedom, a Cornish-Fisher series above. */
export function tQuantile975(df: number): number {
  if (df < 1) return Infinity
  if (df < 5) return T_975_SMALL[Math.round(df) - 1]
  const z = Z_975
  const z3 = z ** 3
  const z5 = z ** 5
  const z7 = z ** 7
  const z9 = z ** 9
  return (
    z +
    (z3 + z) / (4 * df) +
    (5 * z5 + 16 * z3 + 3 * z) / (96 * df ** 2) +
    (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * df ** 3) +
    (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * df ** 4)
  )
}

const live = (cells: readonly RiderCell[]): readonly RiderCell[] => cells.filter((c) => c.n > 0)
const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

export interface PairedUp {
  readonly pairs: readonly RiderPair[]
  /** Pair ids that appear in only one of the two groups (a rider whose partner has no finished parcel at all) */
  readonly unmatched: number
}

/** Match each Bonus rider with the Control rider that shares their pair id. A rider with no partner is counted, never guessed at. */
export function pairUp(bonus: readonly RiderCell[], control: readonly RiderCell[]): PairedUp {
  const controlById = new Map(control.map((c) => [c.pairId, c]))
  const pairs: RiderPair[] = []
  const seen = new Set<string>()
  for (const b of bonus) {
    const c = controlById.get(b.pairId)
    if (c === undefined) continue
    pairs.push({ bonus: b, control: c })
    seen.add(b.pairId)
  }
  return { pairs, unmatched: bonus.length + control.length - 2 * seen.size }
}

export interface PairComparison {
  /** Pairs the range is built from */
  readonly pairs: number
  /** Matched pairs thrown out because one rider had no finished flagged parcel */
  readonly dropped: number
  /** Delivery rates over the pairs that were kept (0 to 1) */
  readonly bonusRate: number
  readonly controlRate: number
  readonly nBonus: number
  readonly nControl: number
  /** The gap in each kept pair (Bonus rider's rate minus their partner's), per 100 orders, in pair order */
  readonly gapsPer100: readonly number[]
  /** The average of the pair differences (Bonus minus partner), per 100 orders */
  readonly diffPer100: number
  /** How much the pair differences vary, per 100 (sample standard deviation) */
  readonly spreadPer100: number
  /** 95% range: average ± t(pairs − 1) × spread ÷ √pairs. The t value (2.07 for 24 pairs) keeps a small pilot from being over-confident. */
  readonly ci95: readonly [number, number]
  /** Smallest true effect this pilot would catch 80% of the time: about 2.8 × spread ÷ √pairs */
  readonly mdePer100: number
}

const rate = (c: RiderCell): number => c.y / c.n

/** The pair-by-pair comparison: for each pair the Bonus rider's rate minus their partner's, then the average and its 95% range. */
export function comparePairs(all: readonly RiderPair[]): PairComparison {
  const pairs = all.filter((p) => p.bonus.n > 0 && p.control.n > 0)
  const k = pairs.length
  const nBonus = sum(pairs.map((p) => p.bonus.n))
  const nControl = sum(pairs.map((p) => p.control.n))
  const base = {
    pairs: k,
    dropped: all.length - k,
    bonusRate: nBonus === 0 ? 0 : sum(pairs.map((p) => p.bonus.y)) / nBonus,
    controlRate: nControl === 0 ? 0 : sum(pairs.map((p) => p.control.y)) / nControl,
    nBonus,
    nControl,
  }
  if (k === 0) return { ...base, gapsPer100: [], diffPer100: 0, spreadPer100: 0, ci95: [0, 0], mdePer100: Infinity }
  const diffs = pairs.map((p) => (rate(p.bonus) - rate(p.control)) * 100)
  const mean = sum(diffs) / k
  if (k < 2) return { ...base, gapsPer100: diffs, diffPer100: mean, spreadPer100: 0, ci95: [-Infinity, Infinity], mdePer100: Infinity }
  const spread = Math.sqrt(sum(diffs.map((d) => (d - mean) ** 2)) / (k - 1))
  const se = spread / Math.sqrt(k)
  const half = tQuantile975(k - 1) * se
  return { ...base, gapsPer100: diffs, diffPer100: mean, spreadPer100: spread, ci95: [mean - half, mean + half], mdePer100: MDE_FACTOR * se }
}

/** Rate and variance of the rate with riders as the unit: G/(G-1) x sum((y - p n)^2) / (sum n)^2. */
function clusterRate(cells: readonly RiderCell[]): { readonly p: number; readonly n: number; readonly riders: number; readonly variance: number } {
  const rows = live(cells)
  const n = sum(rows.map((c) => c.n))
  if (n === 0) return { p: 0, n: 0, riders: 0, variance: 0 }
  const p = sum(rows.map((c) => c.y)) / n
  const g = rows.length
  const variance = g < 2 ? Infinity : (g / (g - 1)) * (sum(rows.map((c) => (c.y - p * c.n) ** 2)) / n ** 2)
  return { p, n, riders: g, variance }
}

export interface ArmComparison {
  readonly bonusRate: number
  readonly controlRate: number
  /** Bonus minus Control, per 100 orders */
  readonly diffPer100: number
  /** 95% interval clustered on rider (ignores the pairing: the stricter cross-check) */
  readonly ci95: readonly [number, number]
  /** What an interval that treats every order as independent would say (too narrow when riders differ) */
  readonly naiveCi95: readonly [number, number]
  readonly df: number
  readonly nBonus: number
  readonly nControl: number
  readonly ridersBonus: number
  readonly ridersControl: number
}

export function compareArms(bonus: readonly RiderCell[], control: readonly RiderCell[]): ArmComparison {
  const b = clusterRate(bonus)
  const c = clusterRate(control)
  const diff = (b.p - c.p) * 100
  const base = { bonusRate: b.p, controlRate: c.p, nBonus: b.n, nControl: c.n, ridersBonus: b.riders, ridersControl: c.riders }
  if (b.n === 0 || c.n === 0) return { ...base, diffPer100: 0, ci95: [0, 0], naiveCi95: [0, 0], df: 0 }
  const df = b.riders + c.riders - 2
  const half = tQuantile975(df) * Math.sqrt(b.variance + c.variance) * 100
  const naiveHalf = Z_975 * Math.sqrt((b.p * (1 - b.p)) / b.n + (c.p * (1 - c.p)) / c.n) * 100
  return {
    ...base,
    diffPer100: diff,
    ci95: [diff - half, diff + half],
    naiveCi95: [diff - naiveHalf, diff + naiveHalf],
    df,
  }
}

/** One-way ANOVA estimate of the intra-rider correlation, riders nested in arms. Falls back to 0.05 when it cannot be estimated. */
export function estimateIcc(bonus: readonly RiderCell[], control: readonly RiderCell[]): number {
  const arms = [live(bonus), live(control)]
  const g = arms[0].length + arms[1].length
  const all = arms.flat()
  const total = sum(all.map((c) => c.n))
  if (arms[0].length === 0 || arms[1].length === 0 || g < 3 || total - g < 1) return FALLBACK_ICC
  let ssb = 0
  let sumSq = 0
  for (const rows of arms) {
    const n = sum(rows.map((c) => c.n))
    const p = sum(rows.map((c) => c.y)) / n
    ssb += sum(rows.map((c) => c.n * (c.y / c.n - p) ** 2))
    sumSq += sum(rows.map((c) => c.n ** 2)) / n
  }
  const ssw = sum(all.map((c) => c.n * (c.y / c.n) * (1 - c.y / c.n)))
  const msb = ssb / (g - 2)
  const msw = ssw / (total - g)
  const n0 = (total - sumSq) / (g - 2)
  const denom = msb + (n0 - 1) * msw
  if (!(denom > 0)) return FALLBACK_ICC
  return Math.min(1, Math.max(0, (msb - msw) / denom))
}

export function minimumDetectableEffect(
  controlRate: number,
  nBonus: number,
  nControl: number,
  meanClusterSize: number,
  icc: number,
): { readonly mdePer100: number; readonly deff: number } {
  const deff = 1 + (meanClusterSize - 1) * icc
  if (nBonus <= 0 || nControl <= 0) return { mdePer100: Infinity, deff }
  // A control rate of exactly 0 or 1 (a handful of early orders all delivered) would claim zero noise: plan on 5% to 95% at the extremes.
  const p = Math.min(0.95, Math.max(0.05, controlRate))
  const variance = p * (1 - p) * (1 / nBonus + 1 / nControl) * deff
  return { mdePer100: (Z_975 + Z_POWER_80) * Math.sqrt(variance) * 100, deff }
}

/** Extra deliveries per 100 flagged orders at which the bonus pays for itself, at a given control success rate (0 to 1). */
export function breakEvenPer100(config: VerdictConfig, controlRate: number): number {
  const room = config.reverse - config.riderFee - config.bonus
  return room <= 0 ? Infinity : (config.bonus * controlRate * 100) / room
}

/** The stricter rider-by-rider method on the same data. It ignores the pairing, so it is wider; "same call" says whether it would change the decision. */
export interface CrossCheck {
  readonly diffPer100: number
  readonly ci95: readonly [number, number]
  /** Its smallest detectable effect, from the rider-to-rider spread (design effect) rather than the pair spread */
  readonly mdePer100: number
  readonly icc: number
  readonly deff: number
  /** True when its low end is on the same side of break-even as the pair-by-pair low end */
  readonly sameCall: boolean
}

export interface VerdictResult {
  readonly verdict: VerdictLabel
  readonly reason: string
  /** Extra text on a GO that holds on the case basis only */
  readonly caveat?: string
  /** Average pair difference: Bonus rider minus their partner, per 100 flagged orders */
  readonly upliftPer100: number
  /** 95% range from the pair-by-pair method */
  readonly ci95: readonly [number, number]
  readonly bonusRate: number
  readonly controlRate: number
  readonly breakEven: number
  readonly breakEvenConservative: number
  /** Share of flagged orders (both groups) with a final outcome */
  readonly terminalShare: number
  /** Pairs the range is built from (one Bonus rider and one partner each) */
  readonly pairs: number
  /** Pairs left out because a rider in them had no finished flagged parcel */
  readonly droppedPairs: number
  /** How much the pair differences vary, per 100 */
  readonly spreadPer100: number
  readonly mdePer100: number
  readonly mdeText: string
  readonly crossCheck: CrossCheck
  readonly normalDeltaPts: number
  readonly normalCi95: readonly [number, number]
  readonly breachedGuardrail?: string
  /** The two fake-attempt numbers side by side: what looks fake (judged) and what Ops confirmed with a Strike */
  readonly fakeAttempts?: { readonly suspectedRate: number; readonly strikes: number; readonly attempts?: number; readonly enough: boolean }
  /** The rule's own limits, so a screen can say where the lines are */
  readonly killFloor: number
  readonly normalOrderLimit: number
  readonly plannedHash: string
  readonly currentHash: string
}

const fmt = (x: number, digits = 1): string => `${x < 0 ? '−' : ''}${Math.abs(x).toFixed(digits)}`
const signed = (x: number): string => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(1)}`
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

const hasEnoughAttempts = (readings: GuardrailReadings, config: VerdictConfig): boolean => readings.attempts === undefined || readings.attempts >= config.minFakeAttempts

function firstBreach(normalDeltaPts: number, hasNormal: boolean, readings: GuardrailReadings, config: VerdictConfig): { readonly name: string; readonly detail: string } | undefined {
  const g = config.guardrails
  if (hasNormal && normalDeltaPts < g.normalOrderDeltaPts) {
    return { name: 'normal orders', detail: `normal-order success is ${fmt(normalDeltaPts)} pts for Bonus riders, below the ${g.normalOrderDeltaPts} pt limit` }
  }
  if (readings.falseAttemptRate !== undefined && readings.falseAttemptRate > g.falseAttemptRate && hasEnoughAttempts(readings, config)) {
    return { name: 'false attempts', detail: `${(readings.falseAttemptRate * 100).toFixed(1)}% of attempts look fake, above the ${(g.falseAttemptRate * 100).toFixed(0)}% limit` }
  }
  return undefined
}

/** The same pair-by-pair comparison for one order class (flagged or normal). */
function compareSamples(sample: { readonly bonus: ArmSample; readonly control: ArmSample }): PairComparison & { readonly unmatched: number } {
  const { pairs, unmatched } = pairUp(sample.bonus.riders, sample.control.riders)
  return { ...comparePairs(pairs), unmatched }
}

function crossCheckOf(flagged: { readonly bonus: ArmSample; readonly control: ArmSample }, paired: PairComparison, breakEven: number): CrossCheck {
  const cmp = compareArms(flagged.bonus.riders, flagged.control.riders)
  const icc = estimateIcc(flagged.bonus.riders, flagged.control.riders)
  const riders = cmp.ridersBonus + cmp.ridersControl
  const mde = minimumDetectableEffect(cmp.controlRate, cmp.nBonus, cmp.nControl, riders === 0 ? 1 : (cmp.nBonus + cmp.nControl) / riders, icc)
  return {
    diffPer100: cmp.diffPer100,
    ci95: cmp.ci95,
    mdePer100: mde.mdePer100,
    icc,
    deff: mde.deff,
    sameCall: (cmp.ci95[0] >= breakEven) === (paired.ci95[0] >= breakEven),
  }
}

/** Judge the data against the rule. `plannedHash` is the rule's hash from when the day or pilot was planned. */
export function verdict(data: VerdictData, config: VerdictConfig, plannedHash: string): VerdictResult {
  if (config.alpha !== 0.05) throw new RangeError('Only alpha = 0.05 is implemented')
  const flagged = compareSamples(data.flagged)
  const normalCmp = data.normal ? comparePairs(pairUp(data.normal.bonus.riders, data.normal.control.riders).pairs) : undefined
  const hasNormal = normalCmp !== undefined && normalCmp.pairs > 0
  const terminal = sum(data.flagged.bonus.riders.map((c) => c.n)) + sum(data.flagged.control.riders.map((c) => c.n))
  const open = data.flagged.bonus.open + data.flagged.control.open
  const terminalShare = terminal + open === 0 ? 0 : terminal / (terminal + open)
  const droppedPairs = flagged.dropped + flagged.unmatched
  const breakEven = breakEvenPer100(config, flagged.controlRate)
  const breakEvenConservative = breakEvenPer100({ ...config, riderFee: CONSERVATIVE_RIDER_FEE }, flagged.controlRate)
  const currentHash = ruleHash(config)
  const readings = data.readings ?? {}

  const result = (v: VerdictLabel, reason: string, extra: Partial<VerdictResult> = {}): VerdictResult => ({
    verdict: v,
    reason,
    upliftPer100: flagged.diffPer100,
    ci95: flagged.ci95,
    bonusRate: flagged.bonusRate,
    controlRate: flagged.controlRate,
    breakEven,
    breakEvenConservative,
    terminalShare,
    pairs: flagged.pairs,
    droppedPairs,
    spreadPer100: flagged.spreadPer100,
    mdePer100: flagged.mdePer100,
    mdeText: Number.isFinite(flagged.mdePer100) && flagged.pairs >= config.minPairs
      ? `Smallest effect this pilot could detect: ${flagged.mdePer100.toFixed(1)} per 100 flagged orders.`
      : 'Smallest effect this pilot could detect: not yet known (too few finished pairs).',
    crossCheck: crossCheckOf(data.flagged, flagged, breakEven),
    normalDeltaPts: hasNormal ? normalCmp.diffPer100 : 0,
    normalCi95: hasNormal ? normalCmp.ci95 : [0, 0],
    ...(readings.falseAttemptRate === undefined
      ? {}
      : {
          fakeAttempts: {
            suspectedRate: readings.falseAttemptRate,
            strikes: readings.strikes ?? 0,
            ...(readings.attempts === undefined ? {} : { attempts: readings.attempts }),
            enough: hasEnoughAttempts(readings, config),
          },
        }),
    killFloor: config.killFloor,
    normalOrderLimit: config.guardrails.normalOrderDeltaPts,
    plannedHash,
    currentHash,
    ...extra,
  })

  if (currentHash !== plannedHash) {
    return result('INVALID', 'Rule changed after planning: this result cannot be used to decide. Re-plan the pilot with the new rule.')
  }

  const needShare = config.minTerminalShare
  const shortShare = terminalShare < needShare
  const shortPairs = flagged.pairs < config.minPairs
  if (terminal + open === 0) return result('INCOMPLETE', 'No flagged orders to judge yet: start the day.')
  if (shortShare || shortPairs) {
    const parts: string[] = []
    if (shortShare) parts.push(`only ${(terminalShare * 100).toFixed(0)}% of flagged orders have a final outcome (need ${(needShare * 100).toFixed(0)}%), ${open} still open`)
    if (shortPairs) {
      const left = droppedPairs > 0 ? `, ${plural(droppedPairs, 'pair')} left out because a rider has no finished flagged parcel` : ''
      parts.push(`only ${plural(flagged.pairs, 'pair')} of riders with finished flagged parcels (need ${config.minPairs})${left}`)
    }
    return result('INCOMPLETE', `Too early to say: ${parts.join('; ')}.`)
  }

  const breach = firstBreach(hasNormal ? normalCmp.diffPer100 : 0, hasNormal, readings, config)
  if (breach) return result('KILL', `Safety rule broken (${breach.name}): ${breach.detail}. Stop, whatever the uplift.`, { breachedGuardrail: breach.name })

  if (flagged.diffPer100 < config.killFloor) {
    return result('KILL', `No meaningful effect: ${signed(flagged.diffPer100)} per 100 is under the kill floor of +${config.killFloor}. Stop and keep the ₹${config.bonus}.`)
  }

  const lower = flagged.ci95[0]
  if (lower >= breakEven) {
    const caveat =
      lower < breakEvenConservative
        ? `Holds on the case basis (break-even +${fmt(breakEven)}) but not if Valmo also pays the ₹${CONSERVATIVE_RIDER_FEE} rider fee on each rescued order (+${fmt(breakEvenConservative)}).`
        : undefined
    return result('GO', `Even the low end of the range (${signed(lower)} per 100) clears break-even (+${fmt(breakEven)}): scale it.`, { caveat })
  }
  return result('RE-PRICE', `A real effect (${signed(flagged.diffPer100)} per 100) but the low end (${signed(lower)}) is under break-even (+${fmt(breakEven)}): tune the bonus or who gets it in a Pilot 2 whose rule is fixed before it starts.`)
}
