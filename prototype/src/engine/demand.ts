import { catalogueFor, generateCatalogue, HISTORY_DAYS, HISTORY_HOURS, poisson, type CatalogueItem } from './catalogue.ts'
import { ROUTER } from './economics.ts'
import { buildIndex, cosine, sharedKeywords, type TfIdfIndex } from './keywords.ts'
import { createRng, hashSeed } from './rng.ts'

/**
 * The match forecast: how likely is it that a buyer for the SAME listing (same seller, same SKU: the seller issues the new invoice)
 * turns up in the hub catchment within the hold window, and how sure are we?
 *
 * Gamma-Poisson in closed form. The buyer rate λ (buyers per hour) gets a Gamma(α, β) belief. The prior comes from SIMILAR listings
 * (keyword match, same category, close price): it is worth k pseudo-orders, with mean rate λ0 (α0 = k, β0 = k / λ0). The exact SKU's own
 * n orders over T = 336 h then update it: α = α0 + n, β = β0 + T. A similar listing is evidence of demand only, never a substitute for the parcel.
 *
 * For a window of s = holdHours x conversion:  mean P(match) = 1 - (β / (β + s))^α, and the range is P at the 10th and 90th percentile of λ
 * (Wilson-Hilferty for the Gamma quantile): P_q = 1 - exp(-s x λ_q). Hold only when the LOW end (P10) clears break-even.
 */
export const PRIOR_STRENGTH = 10
export const WEAK_PRIOR_STRENGTH = 2
export const SIMILAR_MIN_COSINE = 0.35
export const SIMILAR_PRICE_BAND = 0.3
/** A prior rate never falls below this (buyers per hour), so the Gamma prior stays defined */
export const MIN_RATE = 0.0005

export type Confidence = 'High' | 'Medium' | 'Low'

export interface SimilarSku {
  readonly skuId: string
  readonly cosine: number
}

/** What the Router believes about one listing's demand. The HIDDEN true rate is never in here. */
export interface DemandForecast {
  readonly alpha: number
  readonly beta: number
  readonly priorRate: number
  readonly priorStrength: number
  /** Orders of the exact SKU in the last 14 days */
  readonly exactOrders: number
  /** Orders of the similar listings in the last 14 days (evidence of demand only) */
  readonly similarOrders: number
  readonly similar: readonly SimilarSku[]
  /** The words the parcel shares with its similar listings, for the chips on the Desk */
  readonly keywords: readonly string[]
  readonly confidence: Confidence
  readonly evidence: string
}

export interface MatchBelief {
  /** P(a buyer for the exact listing turns up within the window), averaged over what we are unsure of */
  readonly mean: number
  /** The pessimistic end: P at the 10th percentile of the buyer rate */
  readonly p10: number
  readonly p90: number
}

export interface WindowParams {
  readonly holdHours: number
  readonly conversion: number
}

/** Inverse of the standard normal CDF (Acklam's rational approximation, error below 1.2e-9). */
export function normalQuantile(q: number): number {
  if (q <= 0) return -Infinity
  if (q >= 1) return Infinity
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const low = 0.02425
  if (q < low) {
    const r = Math.sqrt(-2 * Math.log(q))
    return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1)
  }
  if (q > 1 - low) return -normalQuantile(1 - q)
  const r = q - 0.5
  const s = r * r
  return ((((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r) / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1)
}

/** The q-quantile of Gamma(shape α, rate β), by the Wilson-Hilferty approximation (good to about 0.1% for shapes of 2 and up). */
export function gammaQuantile(alpha: number, beta: number, q: number): number {
  const t = 1 / (9 * alpha)
  const base = Math.max(1e-6, 1 - t + normalQuantile(q) * Math.sqrt(t))
  return (alpha * base ** 3) / beta
}

/** The belief after seeing `orders` orders of the exact SKU over `hours` hours, from a prior worth `strength` pseudo-orders at `priorRate`. */
export function posterior(priorRate: number, strength: number, orders: number, hours: number): { readonly alpha: number; readonly beta: number } {
  const rate = Math.max(MIN_RATE, priorRate)
  return { alpha: strength + orders, beta: strength / rate + hours }
}

export function matchBelief(f: Pick<DemandForecast, 'alpha' | 'beta'>, params: WindowParams): MatchBelief {
  const s = params.holdHours * params.conversion
  const at = (q: number): number => 1 - Math.exp(-s * gammaQuantile(f.alpha, f.beta, q))
  return { mean: 1 - Math.exp(f.alpha * Math.log1p(-s / (f.beta + s))), p10: at(0.1), p90: at(0.9) }
}

/** The match rate at which holding stops losing money: ₹8 to hold / ₹145 saved per match = 5.5% */
export const breakEvenMatch = (): number => ROUTER.holdCost / ROUTER.savedPerMatch

/** The hold rule: the LOW end of the range must clear break-even. */
export const clearsBreakEven = (b: MatchBelief): boolean => b.p10 >= breakEvenMatch()

export function confidenceLabel(exactOrders: number, similarOrders: number): Confidence {
  if (exactOrders >= 5) return 'High'
  if (exactOrders >= 1 || similarOrders >= 10) return 'Medium'
  return 'Low'
}

export function evidenceText(exactOrders: number, similarOrders: number, keywords: readonly string[]): string {
  const exact = `${exactOrders} exact-SKU order${exactOrders === 1 ? '' : 's'}`
  const similar = keywords.length === 0 && similarOrders === 0 ? 'no similar listings' : `${similarOrders} similar${keywords.length > 0 ? ` (${keywords.join(', ')})` : ''}`
  return `${exact} and ${similar} in ${HISTORY_DAYS} days`
}

/** A forecast with no spread: the belief of someone who knows the rate exactly. For engine-only use and tests. */
export function pointForecast(rate: number): DemandForecast {
  const alpha = 1e6
  return { alpha, beta: alpha / Math.max(rate, 1e-9), priorRate: rate, priorStrength: alpha, exactOrders: 0, similarOrders: 0, similar: [], keywords: [], confidence: 'High', evidence: 'rate known exactly (engine test)' }
}

/** Listings like this one: same category, price within ±30%, cosine of the title words at least 0.35. Never the listing itself. Most alike first. */
export function findSimilar(target: CatalogueItem, items: readonly CatalogueItem[], index: TfIdfIndex, opts: { readonly minCosine?: number; readonly priceBand?: number } = {}): readonly SimilarSku[] {
  const minCosine = opts.minCosine ?? SIMILAR_MIN_COSINE
  const band = opts.priceBand ?? SIMILAR_PRICE_BAND
  return items
    .filter((x) => x.skuId !== target.skuId && x.category === target.category && Math.abs(x.price - target.price) <= band * target.price + 1e-9)
    .map((x) => ({ skuId: x.skuId, cosine: cosine(index, target.skuId, x.skuId) }))
    .filter((x) => x.cosine >= minCosine)
    .sort((x, y) => y.cosine - x.cosine || (x.skuId < y.skuId ? -1 : 1))
}

/** The prior mean rate: the similarity-weighted average of the similar listings' OBSERVED rates (their 14-day orders / 336 h). */
export function priorRateFrom(similar: readonly SimilarSku[], items: readonly CatalogueItem[]): number {
  const byId = new Map(items.map((x) => [x.skuId, x]))
  let weight = 0
  let sum = 0
  for (const s of similar) {
    const item = byId.get(s.skuId)
    if (!item) continue
    weight += s.cosine
    sum += s.cosine * (item.orders14d / HISTORY_HOURS)
  }
  return Math.max(MIN_RATE, weight === 0 ? 0 : sum / weight)
}

function topKeywords(target: CatalogueItem, similar: readonly SimilarSku[], index: TfIdfIndex, max = 4): readonly string[] {
  const counts = new Map<string, number>()
  for (const s of similar) for (const w of sharedKeywords(index, target.skuId, s.skuId, 10)) counts.set(w, (counts.get(w) ?? 0) + 1)
  return [...counts.entries()]
    .sort(([a, x], [b, y]) => y - x || (index.idf.get(b) ?? 0) - (index.idf.get(a) ?? 0) || (a < b ? -1 : 1))
    .slice(0, max)
    .map(([w]) => w)
}

/** The forecast for one listing, from the hub's catalogue and its 14-day history. Reads orders14d only, never the hidden rate. */
export function buildForecast(target: CatalogueItem, items: readonly CatalogueItem[], index: TfIdfIndex): DemandForecast {
  const similar = findSimilar(target, items, index)
  const similarOrders = similar.reduce((t, s) => t + (items.find((x) => x.skuId === s.skuId)?.orders14d ?? 0), 0)
  const hubAverage = items.length === 0 ? MIN_RATE : items.reduce((t, x) => t + x.orders14d, 0) / (items.length * HISTORY_HOURS)
  const strength = similar.length > 0 ? PRIOR_STRENGTH : WEAK_PRIOR_STRENGTH
  const priorRate = similar.length > 0 ? priorRateFrom(similar, items) : Math.max(MIN_RATE, hubAverage)
  const { alpha, beta } = posterior(priorRate, strength, target.orders14d, HISTORY_HOURS)
  const keywords = topKeywords(target, similar, index)
  return {
    alpha,
    beta,
    priorRate,
    priorStrength: strength,
    exactOrders: target.orders14d,
    similarOrders,
    similar,
    keywords,
    confidence: confidenceLabel(target.orders14d, similarOrders),
    evidence: evidenceText(target.orders14d, similarOrders, keywords),
  }
}

const indexCache = new Map<string, TfIdfIndex>()
const hubIndex = (hubId: string, items: readonly CatalogueItem[]): TfIdfIndex => {
  let idx = indexCache.get(hubId)
  if (!idx) {
    idx = buildIndex(items.map((x) => ({ id: x.skuId, text: x.title })))
    indexCache.set(hubId, idx)
  }
  return idx
}

/**
 * The forecast for a hub's listing. `rate` replays that listing with a busier (or quieter) hidden rate: its own 14-day history is drawn
 * from it. The four demo parcels use that so the live demo shows a clear hold; the similar listings are untouched.
 */
export function forecastFor(hubId: string, skuId: string, opts: { readonly rate?: number } = {}): DemandForecast {
  const items = catalogueFor(hubId)
  const index = hubIndex(hubId, items)
  const found = items.find((x) => x.skuId === skuId)
  if (!found) return buildForecast({ skuId, title: '', category: 'unknown', colour: '', material: '', size: '', price: 0, trueRate: 0, orders14d: 0 }, items, index)
  if (opts.rate === undefined) return buildForecast(found, items, index)
  const orders14d = poisson(createRng(hashSeed(`replay-${hubId}-${skuId}-${opts.rate}`)), opts.rate * HISTORY_HOURS)
  return buildForecast({ ...found, trueRate: opts.rate, orders14d }, items, index)
}

/** The forecast for a listing in a replayed history (the backtest): same catalogue structure, a different draw of the 14-day counts. */
export function forecastForHistory(hubId: string, historySeed: number): readonly { readonly item: CatalogueItem; readonly forecast: DemandForecast }[] {
  const items = generateCatalogue(hubId, historySeed)
  const index = hubIndex(hubId, items)
  return items.map((item) => ({ item, forecast: buildForecast(item, items, index) }))
}
