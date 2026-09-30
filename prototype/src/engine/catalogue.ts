import { createRng, hashSeed, type Rng } from './rng.ts'

/**
 * A SYNTHETIC catalogue per hub, for the Refused-Parcel Router's match forecast. Nothing here is real Meesho data: the titles, prices and
 * order counts are made up, seeded and stable, so the mechanism can be shown. Real calibration would come from SKU-level order history by
 * pincode (to be asked of Meesho) and from the pilot.
 *
 * Every listing has a HIDDEN TRUE buyer rate (buyers per hour in the hub catchment): that is the simulation's truth, used only to time the
 * simulated buyer and to draw history. The Router never reads it: it sees only the 14-day order counts drawn from it.
 */
export const SKUS_PER_HUB = 60
export const HISTORY_DAYS = 14
export const HISTORY_HOURS = HISTORY_DAYS * 24

export interface CategoryDef {
  readonly id: string
  readonly noun: string
  readonly gender: string
  readonly materials: readonly string[]
  readonly sizes: readonly string[]
  /** Price band in ₹ */
  readonly price: readonly [number, number]
  /** Typical buyers per hour for the category in a hub catchment (synthetic) */
  readonly pop: number
}

export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'kurti', noun: 'kurti', gender: "Women's", materials: ['cotton', 'rayon', 'georgette'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], price: [249, 599], pop: 0.006 },
  { id: 'saree', noun: 'saree', gender: "Women's", materials: ['silk', 'cotton', 'georgette', 'chiffon'], sizes: ['free size'], price: [349, 899], pop: 0.004 },
  { id: 'tshirt', noun: 'tshirt', gender: "Men's", materials: ['cotton', 'polyester', 'dryfit'], sizes: ['S', 'M', 'L', 'XL'], price: [199, 499], pop: 0.005 },
  { id: 'jeans', noun: 'jeans', gender: "Men's", materials: ['denim', 'stretch'], sizes: ['28', '30', '32', '34'], price: [399, 899], pop: 0.003 },
  { id: 'kidswear', noun: 'frock', gender: "Girls'", materials: ['cotton', 'net', 'satin'], sizes: ['2y', '4y', '6y'], price: [199, 499], pop: 0.0025 },
  { id: 'homedecor', noun: 'cushion cover', gender: 'Home', materials: ['velvet', 'cotton', 'jute'], sizes: ['16 inch', '18 inch'], price: [149, 449], pop: 0.002 },
  { id: 'kitchen', noun: 'container set', gender: 'Kitchen', materials: ['steel', 'plastic', 'glass'], sizes: ['pack of 3', 'pack of 5'], price: [199, 699], pop: 0.0015 },
  { id: 'footwear', noun: 'sandals', gender: "Women's", materials: ['leather', 'rubber', 'canvas'], sizes: ['UK 4', 'UK 5', 'UK 6', 'UK 7'], price: [249, 699], pop: 0.0025 },
]

const COLOURS = ['blue', 'red', 'black', 'green', 'pink', 'white', 'yellow', 'maroon', 'grey', 'navy'] as const

export interface CatalogueItem {
  readonly skuId: string
  readonly title: string
  readonly category: string
  readonly colour: string
  readonly material: string
  readonly size: string
  readonly price: number
  /** HIDDEN truth: buyers per hour in the catchment. Only the simulation may read it. */
  readonly trueRate: number
  /** Orders seen in the last 14 days: what the Router is allowed to know */
  readonly orders14d: number
}

export const skuIdFor = (n: number): string => `SKU-${String(n).padStart(3, '0')}`

/** A Poisson count. Knuth's method for small means; a rounded normal for large ones (the catalogue's means are mostly below 30). */
export function poisson(rng: Rng, mean: number): number {
  if (!(mean > 0)) return 0
  if (mean >= 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * rng.normal()))
  const limit = Math.exp(-mean)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng.next()
  } while (p > limit)
  return k - 1
}

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x))

/**
 * The hub's catalogue. The structure and the hidden rates depend on the hub only; `historySeed` redraws the 14-day order counts
 * (the backtest uses that to replay many histories of the same catalogue).
 */
export function generateCatalogue(hubId: string, historySeed = 0): readonly CatalogueItem[] {
  const rng = createRng(hashSeed(`catalogue-${hubId}`))
  // Categories sell at different speeds in a catchment, and listings within a category sell alike: that is what lets similar listings lend evidence.
  const categoryFactor = new Map(CATEGORIES.map((c) => [c.id, Math.exp(0.4 * rng.normal())]))
  const order = rng.shuffle(CATEGORIES)
  const items: CatalogueItem[] = []
  for (let n = 1; n <= SKUS_PER_HUB; n++) {
    const def = order[(n - 1) % order.length]
    const colour = rng.pick(COLOURS)
    const material = rng.pick(def.materials)
    const size = rng.pick(def.sizes)
    const price = def.price[0] + rng.int(def.price[1] - def.price[0] + 1)
    const trueRate = clamp(def.pop * (categoryFactor.get(def.id) ?? 1) * Math.exp(0.6 * rng.normal()), 0.0003, 0.08)
    const skuId = skuIdFor(n)
    const title = `${def.gender} ${material} ${def.noun}, ${colour}, ${size}`
    const history = createRng(hashSeed(`history-${hubId}-${historySeed}-${skuId}`))
    items.push({ skuId, title: title.charAt(0).toUpperCase() + title.slice(1), category: def.id, colour, material, size, price, trueRate, orders14d: poisson(history, trueRate * HISTORY_HOURS) })
  }
  return items
}

/** The listing behind a SKU id in a hub's catalogue (the parcel's exact listing), or undefined. */
export const listingFor = (hubId: string, skuId: string): CatalogueItem | undefined => catalogueFor(hubId).find((x) => x.skuId === skuId)

const cache = new Map<string, readonly CatalogueItem[]>()

/** The hub's catalogue with its actual history (seed 0), built once. */
export function catalogueFor(hubId: string): readonly CatalogueItem[] {
  let c = cache.get(hubId)
  if (!c) {
    c = generateCatalogue(hubId)
    cache.set(hubId, c)
  }
  return c
}
