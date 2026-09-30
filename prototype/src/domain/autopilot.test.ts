import { describe, expect, it } from 'vitest'
import { fakeGeo } from '../engine/testkit.ts'
import { planAutopilot } from './autopilot.ts'
import { createDay } from './day.ts'
import { reduce } from './reducer.ts'
import { kpis, stopsOf } from './selectors.ts'
import { AT, run, startedDay } from './testkit.ts'
import type { DayState } from './types.ts'

const step = (s: DayState, count: number, seed = 1): DayState => run(s, ...planAutopilot(s, { count, seed, at: AT }))

describe('autopilot', () => {
  const s0 = startedDay()

  it('is deterministic', () => {
    expect(planAutopilot(s0, { count: 30, seed: 5, at: AT })).toEqual(planAutopilot(s0, { count: 30, seed: 5, at: AT }))
  })

  it('plans nothing for a day that has not started being worked when count is 0', () => {
    expect(planAutopilot(s0, { count: 0, seed: 1, at: AT })).toEqual([])
  })

  it('skips the stops reserved for the live demo', () => {
    const planned = planAutopilot(s0, { count: 500, seed: 1, at: AT })
    const manual = new Set(s0.stopOrder.filter((id) => s0.stops[id].manual))
    expect(manual.size).toBeGreaterThan(0)
    expect(planned.every((a) => !('orderId' in a) || !manual.has(a.orderId))).toBe(true)
  })

  it('advances every rider bag together (one stop per rider per round)', () => {
    const planned = planAutopilot(s0, { count: 6, seed: 1, at: AT })
    const firstOrders = [...new Set(planned.map((a) => ('orderId' in a ? a.orderId : '')))].filter((id) => id !== '')
    const riders = new Set(firstOrders.map((id) => s0.stops[id].riderId))
    expect(riders.size).toBe(6)
  })

  it('resolves the whole day (except demo stops) and the numbers land in a sane range', () => {
    const s = step(s0, 1000)
    const k = kpis(s)
    const manual = s.stopOrder.filter((id) => s.stops[id].manual).length
    expect(k.pending).toBe(manual)
    expect(k.rescheduled).toBe(0)
    expect(k.realisedRto).toBeGreaterThan(0.08)
    expect(k.realisedRto).toBeLessThan(0.3)
  })

  it('Bonus riders deliver more of the flagged orders than Control riders (uplift +12)', () => {
    const geo = fakeGeo(0, 1)
    let bonusDelivered = 0
    let bonusN = 0
    let controlDelivered = 0
    let controlN = 0
    for (let seed = 1; seed <= 6; seed++) {
      const s = step(reduce(createDay(geo, { seed, orders: 800, riders: 12 }), { type: 'startDay', at: AT }), 5000, seed)
      const k = kpis(s)
      // First-attempt outcome of every flagged stop the bots worked (the demo stops they leave alone are not counted).
      const first = (arm: 'bonus' | 'control'): { n: number; y: number } => {
        const mine = stopsOf(s).filter((x) => x.flagged && x.arm === arm && !x.manual)
        return { n: mine.length, y: mine.filter((x) => x.status === 'delivered_a1').length }
      }
      bonusDelivered += first('bonus').y
      bonusN += first('bonus').n
      controlDelivered += first('control').y
      controlN += first('control').n
      void k
    }
    const uplift = (bonusDelivered / bonusN - controlDelivered / controlN) * 100
    expect(uplift).toBeGreaterThan(7)
    expect(uplift).toBeLessThan(17)
  })

  it('only credits ₹15 to Bonus riders on flagged orders', () => {
    const s = step(s0, 1000)
    expect(s.ledger.length).toBeGreaterThan(0)
    for (const l of s.ledger) {
      expect(s.stops[l.orderId].flagged).toBe(true)
      expect(s.riders.find((r) => r.id === l.riderId)?.arm).toBe('bonus')
      expect(l.amount).toBe(15)
    }
  })

  it('a small share of failed attempts are fake and land in the suspect queue', () => {
    const s = step(reduce(createDay(fakeGeo(0, 1), { seed: 3, orders: 1000, riders: 12 }), { type: 'startDay', at: AT }), 5000)
    expect(kpis(s).suspect).toBeGreaterThan(0)
    expect(kpis(s).suspect).toBeLessThan(kpis(s).attempted * 0.15)
  })

  it('sends refused parcels to the desk', () => {
    expect(step(s0, 1000).parcels.length).toBeGreaterThan(0)
  })
})
