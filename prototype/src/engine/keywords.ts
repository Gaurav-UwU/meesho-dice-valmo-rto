/**
 * Keyword matching for the Refused-Parcel Router: plain text similarity (TF-IDF and cosine) on listing titles.
 * No AI embeddings and no API: it runs in the browser and can always say which words two listings share.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'of', 'with', 'in', 'on', 'to', 'by', 'from', 'is', 'are', 'this', 'that', 'it', 'at', 'as'])

/** Light plural clean-up: enough that "kurtis" and "kurti" meet, not a full stemmer. */
export function stem(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`
  if (/(ss|sh|ch|x)es$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1)
  return word
}

/** Lower-case, drop the possessive, split on anything that is not a letter or digit, drop stop words, clean plurals. Repeats are kept. */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== '' && !STOP_WORDS.has(w))
    .map(stem)
}

export interface TfIdfIndex {
  /** idf = ln((1 + N) / (1 + df)) + 1, so a word in every listing still counts a little */
  readonly idf: ReadonlyMap<string, number>
  /** Per listing: word -> term count x idf */
  readonly weights: ReadonlyMap<string, ReadonlyMap<string, number>>
  readonly norms: ReadonlyMap<string, number>
}

export function buildIndex(docs: readonly { readonly id: string; readonly text: string }[]): TfIdfIndex {
  const counts = new Map<string, Map<string, number>>()
  const df = new Map<string, number>()
  for (const d of docs) {
    const tf = new Map<string, number>()
    for (const t of tokenise(d.text)) tf.set(t, (tf.get(t) ?? 0) + 1)
    counts.set(d.id, tf)
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  }
  const n = docs.length
  const idf = new Map<string, number>()
  for (const [t, f] of df) idf.set(t, Math.log((1 + n) / (1 + f)) + 1)
  const weights = new Map<string, Map<string, number>>()
  const norms = new Map<string, number>()
  for (const [id, tf] of counts) {
    const w = new Map<string, number>()
    let sq = 0
    for (const [t, c] of tf) {
      const x = c * (idf.get(t) ?? 0)
      w.set(t, x)
      sq += x * x
    }
    weights.set(id, w)
    norms.set(id, Math.sqrt(sq))
  }
  return { idf, weights, norms }
}

/** Cosine similarity of two listings, 0 to 1. Unknown or empty listings are similar to nothing. */
export function cosine(index: TfIdfIndex, a: string, b: string): number {
  const wa = index.weights.get(a)
  const wb = index.weights.get(b)
  const na = index.norms.get(a) ?? 0
  const nb = index.norms.get(b) ?? 0
  if (!wa || !wb || na === 0 || nb === 0) return 0
  let dot = 0
  for (const [t, x] of wa) dot += x * (wb.get(t) ?? 0)
  return dot / (na * nb)
}

/** The words two listings share, heaviest first (by the weight they carry in the pair): these are the chips on the Desk card. */
export function sharedKeywords(index: TfIdfIndex, a: string, b: string, max = 5): string[] {
  const wa = index.weights.get(a)
  const wb = index.weights.get(b)
  if (!wa || !wb) return []
  return [...wa.keys()]
    .filter((t) => wb.has(t))
    .sort((x, y) => (wa.get(y) ?? 0) * (wb.get(y) ?? 0) - (wa.get(x) ?? 0) * (wb.get(x) ?? 0) || (x < y ? -1 : 1))
    .slice(0, max)
}
