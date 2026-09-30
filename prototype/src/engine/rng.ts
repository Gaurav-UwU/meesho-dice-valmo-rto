/** Small seeded PRNG (mulberry32) so every synthetic day is reproducible. */
export interface Rng {
  next(): number
  normal(): number
  int(n: number): number
  chance(p: number): boolean
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const normal = (): number => {
    let u = 0
    while (u === 0) u = next()
    const v = next()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  const int = (n: number): number => Math.floor(next() * n)

  const chance = (p: number): boolean => next() < p

  const pick = <T>(items: readonly T[]): T => items[int(items.length)]

  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1)
      const tmp = out[i]
      out[i] = out[j]
      out[j] = tmp
    }
    return out
  }

  return { next, normal, int, chance, pick, shuffle }
}

/** Stable 32-bit seed from a string (FNV-1a), so a given order always behaves the same way. */
export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
