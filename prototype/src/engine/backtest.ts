import { HISTORY_HOURS, SKUS_PER_HUB } from './catalogue.ts'
import { breakEvenMatch, forecastForHistory, matchBelief, type WindowParams } from './demand.ts'
import { ROUTER } from './economics.ts'
import { HUBS } from './hubs.ts'
import { createRng, hashSeed } from './rng.ts'

/**
 * Backtest of the match forecast on SYNTHETIC history: replay many 14-day histories of the same catalogue, forecast each listing from its
 * history alone (never the hidden rate), then draw what really happened in the next 48 h from the hidden rate and compare.
 * It shows the MECHANISM is calibrated when the world behaves the way the model assumes. It proves nothing about Meesho's real demand:
 * real calibration comes from pilot data, measured against the 5.5% break-even.
 */
export interface BacktestBin {
  readonly label: string
  readonly lo: number
  readonly hi: number
  readonly n: number
  /** Average forecast in the bin */
  readonly predicted: number
  /** Share of those parcels that really found a buyer */
  readonly actual: number
}

export interface RuleResult {
  readonly name: string
  readonly held: number
  readonly share: number
  /** Share of held parcels that really found a buyer */
  readonly actual: number
  /** Average forecast of the held parcels */
  readonly predicted: number
  /** ₹ per held parcel: actual match share x ₹145 less the ₹8 to hold */
  readonly netPerHeld: number
}

export interface BacktestResult {
  readonly cases: number
  readonly bins: readonly BacktestBin[]
  /** Mean squared gap between the forecast and what happened (0 is perfect) */
  readonly brier: number
  /** The Brier score of always guessing the overall average */
  readonly baselineBrier: number
  readonly overall: number
  readonly rules: { readonly holdAll: RuleResult; readonly meanRule: RuleResult; readonly lowEnd: RuleResult }
  readonly breakEven: number
}

const EDGES = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 1.0001] as const
const label = (lo: number, hi: number): string => (hi > 1 ? `${Math.round(lo * 100)}%+` : `${Math.round(lo * 100)}–${Math.round(hi * 100)}%`)

export interface BacktestOptions {
  readonly replays?: number
  readonly seed?: number
  readonly params?: WindowParams
}

interface Case {
  readonly mean: number
  readonly p10: number
  readonly y: number
}

export function backtest(opts: BacktestOptions = {}): BacktestResult {
  const replays = opts.replays ?? 40
  const seed = opts.seed ?? 1
  const params = opts.params ?? { holdHours: 48, conversion: 0.5 }
  const s = params.holdHours * params.conversion
  const cases: Case[] = []
  for (const hub of HUBS) {
    for (let r = 0; r < replays; r++) {
      for (const { item, forecast } of forecastForHistory(hub.id, 1000 * seed + r)) {
        const b = matchBelief(forecast, params)
        // What really happens: the hidden rate decides whether a buyer turns up in the next window.
        const real = createRng(hashSeed(`outcome-${hub.id}-${seed}-${r}-${item.skuId}`)).next() < 1 - Math.exp(-s * item.trueRate)
        cases.push({ mean: b.mean, p10: b.p10, y: real ? 1 : 0 })
      }
    }
  }
  const n = cases.length
  const avg = (xs: readonly number[]): number => (xs.length === 0 ? 0 : xs.reduce((t, x) => t + x, 0) / xs.length)
  const overall = avg(cases.map((c) => c.y))
  const bins = EDGES.slice(0, -1).map((lo, i) => {
    const hi = EDGES[i + 1]
    const inBin = cases.filter((c) => c.mean >= lo && c.mean < hi)
    return { label: label(lo, hi), lo, hi, n: inBin.length, predicted: avg(inBin.map((c) => c.mean)), actual: avg(inBin.map((c) => c.y)) }
  })
  const be = breakEvenMatch()
  const rule = (name: string, pick: (c: Case) => boolean): RuleResult => {
    const held = cases.filter(pick)
    const actual = avg(held.map((c) => c.y))
    return { name, held: held.length, share: n === 0 ? 0 : held.length / n, actual, predicted: avg(held.map((c) => c.mean)), netPerHeld: held.length === 0 ? 0 : actual * ROUTER.savedPerMatch - ROUTER.holdCost }
  }
  return {
    cases: n,
    bins,
    brier: avg(cases.map((c) => (c.mean - c.y) ** 2)),
    baselineBrier: overall * (1 - overall),
    overall,
    rules: { holdAll: rule('Hold every parcel', () => true), meanRule: rule('Hold if the average clears 5.5%', (c) => c.mean >= be), lowEnd: rule('Hold if the low end clears 5.5%', (c) => c.p10 >= be) },
    breakEven: be,
  }
}

export const BACKTEST_CASES_PER_REPLAY = HUBS.length * SKUS_PER_HUB
export { HISTORY_HOURS }
