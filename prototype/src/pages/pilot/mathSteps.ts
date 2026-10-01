import { costPerSuccessfulDelivery, FORWARD_COST, ROUTER, routerBreakEven, VALMO_ORDERS_PER_YEAR } from '../../engine/economics.ts'
import { BAND_NAMES, BAND_OFFSETS, FAIR_GAP_PTS } from '../../engine/pilot.ts'
import { tQuantile975, type VerdictResult } from '../../engine/verdict.ts'
import { RTO_TODAY, type Controls, type PilotView } from './pilotModel.ts'

/** Where a number comes from, so a judge can tell fact from assumption. */
export type Source = 'data pack' | 'our model' | 'assumption' | 'simulated'

export interface MathStep {
  readonly id: string
  readonly title: string
  /** One sentence a non-expert can follow */
  readonly plain: string
  readonly formula: string
  /** The same formula with the numbers currently on screen substituted in */
  readonly working: string
  readonly result: string
  readonly source: Source
}

export interface MathSection {
  readonly id: string
  readonly heading: string
  readonly intro: string
  readonly steps: readonly MathStep[]
}

const n1 = (x: number): string => x.toFixed(1)
const pct1 = (x: number): string => `${(x * 100).toFixed(1)}%`
const n2 = (x: number): string => x.toFixed(2)
const rs = (x: number): string => `${x < 0 ? '−' : ''}₹${Math.abs(x).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const signed = (x: number, digits = 1): string => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(digits)}`
const num = (x: number): string => x.toLocaleString('en-IN')

const plainPct = (x: number): string => `${x.toFixed(1)}%`

/**
 * The whole chain of maths behind the Pilot page, every step with the numbers currently on screen.
 * It recomputes nothing new: it reads the engine's results and shows the working, so it cannot drift from the page.
 */
function fakeWorking(f: VerdictResult['fakeAttempts']): string {
  if (f === undefined) return 'no fake-attempt reading'
  if (f.controlRate === undefined) return `Bonus riders ${pct1(f.suspectedRate)}; no Control reading to compare with`
  return `Bonus riders ${pct1(f.suspectedRate)} − Control riders ${pct1(f.controlRate)} = ${n2(f.excessPts ?? 0)} points`
}

export function buildMathSections(c: Controls, view: PilotView): readonly MathSection[] {
  const r = view.result
  const pooled = r.pooled
  const fee = view.conservativeParams.riderFee
  const reverse = view.params.reverseCost
  const bonus = c.bonus
  const base = c.baseline
  const delta = view.observedUplift
  const hubCount = r.hubs.length
  const perHubFlagged = c.days * c.flaggedPerDay
  const totalFlagged = perHubFlagged * hubCount
  const perArm = pooled.flagged.bonus.n
  const pB = pooled.flagged.bonus.rate
  const pC = pooled.flagged.control.rate
  const v = r.verdictResult
  const fair = r.fairness
  const cross = v.crossCheck
  const pairsPerHub = Math.floor(c.ridersPerHub / 2)
  const designedPairs = pairsPerHub * hubCount
  const pairs = v.pairs
  const t = tQuantile975(pairs - 1)
  const spread = v.spreadPer100
  const half = pairs < 2 ? 0 : (t * spread) / Math.sqrt(pairs)
  const gaps = pooled.gaps
  const firstGaps = gaps.slice(0, 3).map((g) => signed(g)).join(', ')
  const bandRates = BAND_OFFSETS.map((o) => `${Math.round(base + o * 100)}%`).join(' / ')
  const bandShare = (mix: readonly number[]): string => mix.map((x) => `${(x * 100).toFixed(0)}%`).join(' / ')
  const pointsSaved = view.rtoPoints
  const rtoAfter = RTO_TODAY - pointsSaved / 100
  const flaggedYr = view.flaggedPerYear / 1e6
  const share = c.flaggedShare
  const perOrderNet = view.netDataPack / 100
  const savingDp = reverse * delta
  const costDp = bonus * (base + delta)
  const savingCons = (reverse - fee) * delta
  const conservativeBase = view.conservativeParams.baselineSuccess
  const closeToThreshold = r.borderline
  const verdictBranch = r.insufficientData ? 'No data yet, so no verdict.' : r.reason

  return [
    {
      id: 'flag',
      heading: '1. Who gets the bonus',
      intro: 'The bonus goes only to orders the system thinks are most likely to fail. The rider is never told the score, only that the order is Bonus-Eligible.',
      steps: [
        {
          id: 'flag-share',
          title: `Flag the top ${share}%`,
          plain: `Every order gets a Rescue Score. The riskiest ${share}% of the day are flagged. The cut is chosen before the pilot and fixed while it runs.`,
          formula: `flagged = ceil(${share}% × orders that day)`,
          working: `${c.flaggedPerDay} flagged per hub per day (you set this), × ${hubCount} hubs = ${c.flaggedPerDay * hubCount} a day`,
          result: `${num(c.flaggedPerDay * hubCount)} flagged orders a day`,
          source: 'our model',
        },
        {
          id: 'flag-rto',
          title: `Why the top ${share}% is worth targeting`,
          plain: `About 17% of all orders fail (the data pack). Our assumption: the riskiest ${share}% fail about ${100 - c.baseline}% of the time (vs 17% overall). The Control group measures it. A tighter cut lowers the share delivered anyway, and with it the break-even, but reaches fewer orders.`,
          formula: 'overall RTO = 80% COD × 20% + 20% prepaid × 5% = 17%;  baseline = share of the flagged slice delivered with no bonus',
          working: `0.80 × 0.20 + 0.20 × 0.05 = 0.16 + 0.01; top 10% → 51%, top 20% → 60% delivered with no bonus`,
          result: `17% overall; about ${100 - c.baseline}% fail among the flagged top ${share}% (baseline ${c.baseline}%)`,
          source: 'assumption',
        },
      ],
    },
    {
      id: 'setup',
      heading: '2. How the pilot is set up and simulated',
      intro: 'Four hubs, 30 days. Riders, not orders, are randomised: inside each hub we pair riders who delivered equally well before the pilot, and a coin flip decides who in each pair gets the bonus. The pilot has not run, so we draw outcomes from chances you control.',
      steps: [
        {
          id: 'sample',
          title: 'Number of flagged orders',
          plain: 'More days and more orders make the answer sharper.',
          formula: 'N = hubs × days × flagged per day per hub; each group gets half of the riders',
          working: `${hubCount} × ${c.days} × ${c.flaggedPerDay} = ${num(totalFlagged)}; ${num(perArm)} in each group; ${c.ridersPerHub} riders per hub`,
          result: `${num(totalFlagged)} orders, ${num(perArm)} per group`,
          source: 'assumption',
        },
        {
          id: 'pairing',
          title: 'Pair riders on their past delivery rate',
          plain: 'Some riders are simply better. So each rider’s past delivery rate on risky parcels (about 125 past parcels) is looked at, riders are sorted by it, neighbours are paired, and a coin flip inside each pair decides who gets the bonus. That makes the two groups equally skilled on average.',
          formula: 'sort riders by past delivery rate; pair neighbours; coin flip inside each pair',
          working: `${c.ridersPerHub} riders per hub → ${pairsPerHub} pairs per hub → ${designedPairs} pairs across ${hubCount} hubs`,
          result: `${designedPairs} pairs of riders`,
          source: 'assumption',
        },
        {
          id: 'baseline',
          title: 'Control group: what would happen without the bonus',
          plain: `The chance a flagged parcel is delivered with no bonus. It is the same in every hub. Each flagged parcel sits in one of three risk bands (high, very high, extreme), a third each, 10 points above and below the baseline.`,
          formula: 'delivered anyway, by band = baseline + 10 pts / baseline / baseline − 10 pts;  riders differ by their own skill',
          working: `${bandRates} (${BAND_NAMES.map((b) => b.toLowerCase()).join(' / ')}), averaging ${n1(base)}%`,
          result: `about ${n1(pC * 100)}% pooled across hubs`,
          source: 'assumption',
        },
        {
          id: 'bonus-arm',
          title: 'Bonus group: what the bonus is assumed to add',
          plain: 'The uplift is the unknown the pilot exists to measure, so you set it.',
          formula: 'chance with the bonus = chance without it + uplift (in every band)',
          working: `chance without the bonus + ${n1(c.uplift)} points`,
          result: `+${n1(c.uplift)} extra deliveries per 100 flagged orders (true value, hidden from the pilot)`,
          source: 'assumption',
        },
        {
          id: 'draws',
          title: 'Play every rider’s orders',
          plain: 'Each rider’s delivered count is a random draw from their own chance (their skill and their mix of risk bands). The draws are seeded, so the same sliders always give the same pilot.',
          formula: 'delivered by a rider ~ Binomial(orders, their chance), seed fixed',
          working: `seed ${c.seed}; Re-roll changes it`,
          result: `${num(pooled.flagged.bonus.delivered)} delivered in Bonus, ${num(pooled.flagged.control.delivered)} in Control`,
          source: 'simulated',
        },
        {
          id: 'fair',
          title: 'Check the groups are matched',
          plain: `After pairing we check the two groups really did start alike: the same average past delivery rate and the same mix of risk bands. If any gap is wider than ${FAIR_GAP_PTS} points the page warns you.`,
          formula: `fair if the past-rate gap ≤ ${FAIR_GAP_PTS} pts and every risk band’s share gap ≤ ${FAIR_GAP_PTS} pts`,
          working: `Past rate: Bonus ${plainPct(fair.pastRate.bonus * 100)}, Control ${plainPct(fair.pastRate.control * 100)}. Risk bands (high / very high / extreme): Bonus ${bandShare(fair.bandMix.bonus)}, Control ${bandShare(fair.bandMix.control)}`,
          result: fair.fair ? `Fair: the widest gap is ${n1(fair.maxGapPts)} points (limit ${FAIR_GAP_PTS})` : `Not matched: ${fair.warning ?? ''}`,
          source: 'simulated',
        },
      ],
    },
    {
      id: 'read',
      heading: '3. Reading the result',
      intro: 'From here on the maths is what the real pilot would do with real data: one gap per pair, then the average and how much the gaps vary.',
      steps: [
        {
          id: 'rates',
          title: 'Delivery rate in each group',
          plain: 'Share of flagged orders that were delivered.',
          formula: 'rate = delivered ÷ orders in the group',
          working: `Bonus ${num(pooled.flagged.bonus.delivered)} ÷ ${num(pooled.flagged.bonus.n)} = ${pct1(pB)} · Control ${num(pooled.flagged.control.delivered)} ÷ ${num(pooled.flagged.control.n)} = ${pct1(pC)}`,
          result: `Bonus ${pct1(pB)}, Control ${pct1(pC)}`,
          source: 'simulated',
        },
        {
          id: 'pair-gaps',
          title: 'The gap in each pair',
          plain: 'For each pair, take the Bonus rider’s delivery rate minus their partner’s. Each pair is one data point, so a hard-route rider is only ever compared with someone equally good.',
          formula: 'gap in a pair = (Bonus rider’s rate − partner’s rate) × 100',
          working: gaps.length === 0 ? 'No finished pairs yet' : `${pairs} pairs; the first three gaps are ${firstGaps} per 100`,
          result: gaps.length === 0 ? 'No gaps' : `${pairs} gaps, from ${signed(Math.min(...gaps))} to ${signed(Math.max(...gaps))} per 100`,
          source: 'simulated',
        },
        {
          id: 'uplift',
          title: 'The effect: the average gap',
          plain: 'The average of the pair gaps, in extra deliveries per 100 flagged orders. This one number drives the verdict and the money.',
          formula: 'Δ = average of the pair gaps',
          working: `sum of ${pairs} gaps ÷ ${pairs} = ${n2(delta)}`,
          result: `Δ = ${signed(delta)} per 100`,
          source: 'simulated',
        },
        {
          id: 'spread',
          title: 'How much the gaps vary',
          plain: 'If every pair shows about the same gap we can be fairly sure of the effect; if the gaps jump around we cannot.',
          formula: 'spread = √( Σ(gap − average)² ÷ (pairs − 1) )',
          working: `${pairs} gaps around an average of ${n2(delta)}: spread = ${n2(spread)}`,
          result: `${n1(spread)} points per 100`,
          source: 'our model',
        },
        {
          id: 'ci',
          title: 'How sure are we: the 95% range',
          plain: `The true effect is probably within about 2 × (spread ÷ √pairs) of the average. The multiplier is a little above 2 when there are few pairs (${n2(t)} for ${pairs}), so a small pilot is not over-confident. More pairs, meaning more riders, narrow the range.`,
          formula: 'range = average ± multiplier × spread ÷ √pairs',
          working: `${n2(delta)} ± ${n2(t)} × ${n2(spread)} ÷ √${pairs} = ${n2(delta)} ± ${n2(half)}`,
          result: `${signed(pooled.ci95[0])} to ${signed(pooled.ci95[1])} per 100`,
          source: 'our model',
        },
        {
          id: 'normal',
          title: 'Do normal orders suffer?',
          plain: 'The same pair-by-pair comparison on the other 80% of orders. If riders chase the bonus and neglect normal stops, this goes negative.',
          formula: 'Normal-order Δ = average of the pair gaps on unflagged orders, with the same 95% range',
          working: `average of the ${pairs} pair gaps on normal orders = ${n2(pooled.normalDeltaPts)}`,
          result: `${signed(pooled.normalDeltaPts)} pts (range ${signed(pooled.normalCi95[0])} to ${signed(pooled.normalCi95[1])})`,
          source: 'simulated',
        },
        {
          id: 'fake',
          title: 'Do Bonus riders fake more attempts than Control?',
          plain: "A fake attempt is a failed delivery logged from far away, or one the customer says never happened. Some happen with no bonus at all, so the rule compares Bonus riders with Control riders: only a gap above 2 points stops the pilot. In this simulation riders' fake attempts do not respond to the bonus unless you move the slider.",
          formula: "Gap = Bonus riders' suspected fake rate − Control riders' rate;  KILL if the gap is more than 2 points (judged once each arm has 30 attempts)",
          working: fakeWorking(v.fakeAttempts),
          result: v.fakeAttempts === undefined ? 'not read' : v.fakeAttempts.enough ? `${signed(v.fakeAttempts.excessPts ?? 0)} pts above Control (limit +${v.fakeAttemptLimitPts})` : 'too early (each arm needs 30 attempts)',
          source: 'simulated',
        },
      ],
    },
    {
      id: 'verdict',
      heading: '4. The verdict rule',
      intro: 'Decided in advance, before any data, so nobody can argue afterwards.',
      steps: [
        {
          id: 'rules',
          title: 'INVALID, INCOMPLETE, KILL, GO or RE-PRICE',
          plain: "GO only when even the LOW end of the range pays for the bonus. A broken safety rule (normal orders get worse, or Bonus riders' fake attempts run more than 2 points above Control's) or no effect is KILL. Too little data is INCOMPLETE. A rule changed after planning is INVALID.",
          formula: `INVALID if the rule hash changed;  INCOMPLETE if < 90% of orders final or < 6 pairs;  KILL if a safety rule breaks or Δ < +${v.killFloor};  GO if the low end of the range ≥ break-even;  else RE-PRICE`,
          working: verdictBranch,
          result: r.insufficientData ? 'NO DATA' : r.verdict,
          source: 'our model',
        },
        {
          id: 'borderline',
          title: 'Is it too close to call?',
          plain: 'If the 95% range crosses a decision line, more data could change the verdict, so we say so.',
          formula: 'borderline if the range straddles break-even or the kill floor, a GO clears break-even by under 1 point, or the normal-order range straddles its −1 pt limit',
          working: `range ${signed(pooled.ci95[0])} to ${signed(pooled.ci95[1])} against +${n1(v.breakEven)} (break-even) and +${v.killFloor} (kill floor)`,
          result: closeToThreshold ? 'Borderline: could flip with more data' : 'Clear: the range does not cross a threshold',
          source: 'our model',
        },
      ],
    },
    {
      id: 'pay',
      heading: '5. Does it pay? Net ₹ per 100 flagged orders',
      intro: `Every avoided return saves the reverse trip (${rs(reverse)}). Every delivered flagged order in the Bonus group costs the bonus (${rs(bonus)}). The chart and cards use the baseline you set (${n1(base)}%), so break-even lands on the deck's 8.6 and 10.3.`,
      steps: [
        {
          id: 'saving',
          title: 'Saving from avoided returns',
          plain: 'Each extra delivery is a parcel that does not travel back.',
          formula: 'saving = (reverse cost − rider fee) × Δ',
          working: `data-pack basis (fee 0): ${rs(reverse)} × ${n2(delta)} = ${rs(savingDp)} · conservative (fee ${rs(fee)}): (${rs(reverse)} − ${rs(fee)}) × ${n2(delta)} = ${rs(savingCons)}`,
          result: `${rs(savingDp)} (data pack) / ${rs(savingCons)} (conservative)`,
          source: 'data pack',
        },
        {
          id: 'cost',
          title: 'Cost of the bonus',
          plain: 'The bonus is paid on every delivered flagged order in the Bonus group, including the ones that would have been delivered anyway.',
          formula: 'cost = bonus × (baseline deliveries + Δ)',
          working: `${rs(bonus)} × (${n1(base)} + ${n2(delta)}) = ${rs(costDp)}`,
          result: rs(costDp),
          source: 'our model',
        },
        {
          id: 'net',
          title: 'Net per 100 flagged orders',
          plain: 'Saving minus cost. Positive means Valmo comes out ahead.',
          formula: 'net = saving − cost',
          working: `${rs(savingDp)} − ${rs(costDp)} = ${rs(view.netDataPack)} · ${rs(savingCons)} − ${rs(bonus * (conservativeBase + delta))} = ${rs(view.netConservative)}`,
          result: `${rs(view.netDataPack)} (data pack) / ${rs(view.netConservative)} (conservative)`,
          source: 'our model',
        },
        {
          id: 'break-even',
          title: 'Break-even: how many extra deliveries pay for the bonus',
          plain: 'The smallest uplift at which net is zero. Below it the bonus loses money. On the data-pack basis it is roughly 1 in 12. If Valmo also pays the rider a ~₹18 fee on each rescued delivery (a reported partner rate of ₹18–25), it needs more: about 1 in 10.',
          formula: 'Δ* = bonus × baseline ÷ (reverse cost − rider fee − bonus)',
          working: `data pack: ${bonus} × ${n1(base)} ÷ (${reverse} − 0 − ${bonus}) = ${n2(view.breakEven)} · conservative: ${bonus} × ${n1(base)} ÷ (${reverse} − ${fee} − ${bonus}) = ${n2(view.breakEvenConservative)}`,
          result: `Δ* = ${n1(view.breakEven)} (data pack), ${n1(view.breakEvenConservative)} (conservative)`,
          source: 'our model',
        },
      ],
    },
    {
      id: 'scale',
      heading: '6. Scaling to all of Valmo',
      intro: 'Per-100 results are multiplied up to a year of flagged orders.',
      steps: [
        {
          id: 'flagged-year',
          title: 'Flagged orders a year',
          plain: `The flagged ${share}% of Valmo’s yearly orders. The top 20% is rounded to 153 million so the app matches the deck; other cuts scale from it.`,
          formula: `flagged per year = ${share}% × 763.5 million (FY25 Valmo orders)`,
          working: `${(share / 100).toFixed(2)} × ${n1(VALMO_ORDERS_PER_YEAR / 1e6)} mn = ${n1((share / 100) * (VALMO_ORDERS_PER_YEAR / 1e6))} mn, used as ${n1(flaggedYr)} mn`,
          result: `${n1(flaggedYr)} million flagged orders a year`,
          source: 'data pack',
        },
        {
          id: 'annual',
          title: 'Net rupees a year',
          plain: 'Net per order × flagged orders a year, in crore (1 crore = 10 million).',
          formula: 'annual ₹ cr = (net per 100 ÷ 100) × flagged per year ÷ 10,000,000',
          working: `(${rs(view.netDataPack)} ÷ 100) × ${n1(flaggedYr)} mn ÷ 10 mn = ${rs(perOrderNet)} × ${n1(flaggedYr / 10)}`,
          result: `₹${view.annualCr.toFixed(0)} cr (data pack) / ₹${view.annualCrConservative.toFixed(0)} cr (conservative)`,
          source: 'our model',
        },
        {
          id: 'points',
          title: 'RTO points saved',
          plain: 'Flagged orders are 20% of all orders, so +Δ per 100 flagged is +0.2Δ per 100 orders overall.',
          formula: 'RTO points = Δ × 20%',
          working: `${n2(delta)} × 0.20 = ${n2(pointsSaved)}`,
          result: `${n1(pointsSaved)} points off the network RTO`,
          source: 'our model',
        },
        {
          id: 'point-value',
          title: 'What one RTO point is worth',
          plain: 'Each avoided return saves the reverse trip. This is the gross saving, before paying the bonus.',
          formula: 'value of 1 point = 1% × orders per year × reverse cost',
          working: `0.01 × ${n1(VALMO_ORDERS_PER_YEAR / 1e6)} mn × ${rs(reverse)} = ₹${n1((VALMO_ORDERS_PER_YEAR * 0.01 * reverse) / 1e7)} cr; × ${n1(pointsSaved)} points`,
          result: `₹${view.rtoPointsValueCr.toFixed(0)} cr a year gross`,
          source: 'our model',
        },
        {
          id: 'cost-per-delivery',
          title: 'Cost per successful delivery',
          plain: 'The fair way to judge a carrier: what does one parcel that actually arrives cost, including the failures?',
          formula: 'cost = (forward + RTO × reverse) ÷ (1 − RTO)',
          working: `today: (${FORWARD_COST} + 0.17 × ${reverse}) ÷ 0.83 = ${n1(costPerSuccessfulDelivery(RTO_TODAY))} · after: (${FORWARD_COST} + ${n2(rtoAfter)} × ${reverse}) ÷ ${n2(1 - rtoAfter)} = ${n1(costPerSuccessfulDelivery(rtoAfter))}`,
          result: `₹${n1(costPerSuccessfulDelivery(RTO_TODAY))} → ₹${n1(costPerSuccessfulDelivery(rtoAfter))} per delivery (deck: ₹84.8 → ₹77.7 at 14%)`,
          source: 'data pack',
        },
      ],
    },
    {
      id: 'router',
      heading: '7. Refused parcels: the Hold & Re-home break-even',
      intro: 'A different lever with the same logic: is it worth holding a refused parcel for a nearby buyer?',
      steps: [
        {
          id: 'router-break-even',
          title: 'Break-even match rate',
          plain: 'Holding a parcel costs about ₹8 whether or not a buyer appears. A match saves about ₹145. So at least 1 in 18 held parcels must find a buyer.',
          formula: 'break-even = hold cost ÷ saved per match;  net per held parcel = match rate × saved − hold cost',
          working: `${ROUTER.holdCost} ÷ ${ROUTER.savedPerMatch} = ${(routerBreakEven() * 100).toFixed(2)}%`,
          result: `${(routerBreakEven() * 100).toFixed(1)}% match rate. We do not claim a real match rate: the pilot measures it.`,
          source: 'our model',
        },
      ],
    },
    {
      id: 'extra',
      heading: '8. Extra checks',
      intro: 'Two checks that do not change the verdict. They are here for anyone who wants to look under the bonnet.',
      steps: [
        {
          id: 'mde',
          title: 'Smallest effect this pilot could detect',
          plain: 'A pilot this size can only reliably see an effect above a certain size (it would catch it 8 times in 10). Anything smaller is invisible, however real.',
          formula: 'smallest effect ≈ 2.8 × spread ÷ √pairs',
          working: pairs < 2 ? 'Too few pairs to say' : `2.8 × ${n2(spread)} ÷ √${pairs} = ${n1(v.mdePer100)}`,
          result: Number.isFinite(v.mdePer100) ? `${n1(v.mdePer100)} per 100` : 'not yet known',
          source: 'our model',
        },
        {
          id: 'cross-check',
          title: 'A stricter check that ignores the pairing',
          plain: 'We also work the range out a second, stricter way: each rider counts once and who they were paired with is ignored. It is wider. If both ways would make the same call, the pairing is not flattering the result.',
          formula: 'same comparison of the two groups, but riders are not matched to a partner',
          working: `stricter range ${signed(cross.ci95[0])} to ${signed(cross.ci95[1])} per 100 (its smallest detectable effect: ${Number.isFinite(cross.mdePer100) ? n1(cross.mdePer100) : '—'}); pair-by-pair range ${signed(pooled.ci95[0])} to ${signed(pooled.ci95[1])}; break-even +${n1(v.breakEven)}`,
          result: cross.sameCall ? 'Both methods make the same call: they agree' : 'The stricter method would make a different call: look twice before scaling',
          source: 'our model',
        },
      ],
    },
    {
      id: 'sources',
      heading: '9. What is fact and what is assumed',
      intro: 'Every number on the page falls in one of four groups.',
      steps: [
        {
          id: 'src-data',
          title: 'Data pack (given in the case)',
          plain: 'COD share 80%, RTO 20% COD and 5% prepaid, forward ₹50, reverse ₹120, RTO by distance 15 / 17 / 22%, FY25 Valmo orders 763.5 million.',
          formula: '—',
          working: '—',
          result: 'Treated as fact',
          source: 'data pack',
        },
        {
          id: 'src-model',
          title: 'Our model (arithmetic on the data pack)',
          plain: 'Break-even, net per 100, annual scaling, cost per delivery, verdict rules. Anyone can redo these by hand with the formulas above.',
          formula: '—',
          working: '—',
          result: 'Correct by construction; only as good as the inputs',
          source: 'our model',
        },
        {
          id: 'src-assumption',
          title: 'Assumptions (to be replaced by pilot measurements)',
          plain: `Baseline delivery of flagged orders (${n1(base)}%: our assumption that the riskiest ${share}% fail about ${100 - c.baseline}% of the time), the three risk bands around it (±10 points), how much riders differ in skill, the uplift itself, and the ₹18 rider fee (a reported partner rate of ₹18–25).`,
          formula: '—',
          working: '—',
          result: 'Move the sliders to see what each one does',
          source: 'assumption',
        },
        {
          id: 'src-sim',
          title: 'Simulated outcomes',
          plain: 'Which orders got delivered. A real pilot may give a wider range than this one: real riders also have good and bad months that their past delivery rate does not predict.',
          formula: '—',
          working: '—',
          result: 'Replaced by real data when the pilot runs',
          source: 'simulated',
        },
      ],
    },
  ]
}

/** The same content as plain text, to paste into notes or the deck. */
export function toPlainText(sections: readonly MathSection[]): string {
  return sections
    .map((s) => {
      const steps = s.steps
        .map((st) => [`${st.title} [${st.source}]`, `  ${st.plain}`, `  Formula: ${st.formula}`, `  With your numbers: ${st.working}`, `  Result: ${st.result}`].join('\n'))
        .join('\n\n')
      return `${s.heading}\n${s.intro}\n\n${steps}`
    })
    .join('\n\n----------------------------------------\n\n')
}
