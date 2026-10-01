export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x))

/** The middle value (the average of the two middle values for an even count). 0 for an empty list. */
export const median = (xs: readonly number[]): number => {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x))

export const logit = (p: number): number => {
  const q = clamp(p, 1e-9, 1 - 1e-9)
  return Math.log(q / (1 - q))
}

export const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length

/** Root of an increasing function on [lo, hi] by bisection. */
export function bisect(f: (x: number) => number, lo: number, hi: number, iterations = 60): number {
  let a = lo
  let b = hi
  for (let i = 0; i < iterations; i++) {
    const mid = (a + b) / 2
    if (f(mid) < 0) a = mid
    else b = mid
  }
  return (a + b) / 2
}
