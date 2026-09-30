import { describe, expect, it } from 'vitest'
import { createRng, hashSeed } from './rng.ts'

describe('seeded rng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })

  it('gives different sequences for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next())
  })

  it('next() stays in [0, 1)', () => {
    const r = createRng(7)
    for (let i = 0; i < 5000; i++) {
      const x = r.next()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('normal() has mean near 0 and sd near 1', () => {
    const r = createRng(11)
    const xs = Array.from({ length: 20000 }, () => r.normal())
    const m = xs.reduce((a, b) => a + b, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
    expect(Math.abs(m)).toBeLessThan(0.03)
    expect(sd).toBeGreaterThan(0.97)
    expect(sd).toBeLessThan(1.03)
  })

  it('int(n) returns integers in [0, n)', () => {
    const r = createRng(3)
    for (let i = 0; i < 1000; i++) {
      const k = r.int(5)
      expect(Number.isInteger(k)).toBe(true)
      expect(k).toBeGreaterThanOrEqual(0)
      expect(k).toBeLessThan(5)
    }
  })

  it('chance(p) hits about p of the time', () => {
    const r = createRng(5)
    const hits = Array.from({ length: 20000 }, () => r.chance(0.3)).filter(Boolean).length
    expect(hits / 20000).toBeGreaterThan(0.28)
    expect(hits / 20000).toBeLessThan(0.32)
  })

  it('pick returns an element of the list', () => {
    const r = createRng(9)
    const items = ['a', 'b', 'c'] as const
    for (let i = 0; i < 50; i++) expect(items).toContain(r.pick(items))
  })

  it('shuffle returns a permutation without changing the input', () => {
    const r = createRng(13)
    const input = [1, 2, 3, 4, 5, 6]
    const out = r.shuffle(input)
    expect(out).toHaveLength(6)
    expect([...out].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('hashSeed', () => {
  it('is stable and spreads different strings apart', () => {
    expect(hashSeed('powai-0001')).toBe(hashSeed('powai-0001'))
    expect(hashSeed('powai-0001')).not.toBe(hashSeed('powai-0002'))
    expect(Number.isInteger(hashSeed('x'))).toBe(true)
  })
})
