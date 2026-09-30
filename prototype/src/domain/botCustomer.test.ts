import { describe, expect, it } from 'vitest'
import { REFUSAL_REASONS } from '../engine/router.ts'
import { drawDay, drawOption, OPTION_MIX, PAY_SUCCESS_SHARE, PICKUP_COLLECT_SHARE, pickupCollects } from './botCustomer.ts'
import { reduce } from './reducer.ts'
import { createDay } from './day.ts'
import { fakeGeo } from '../engine/testkit.ts'
import { eventsOf } from './events.ts'
import { runAudit } from './audit.ts'
import { shelfUsed } from './routing.ts'
import { AT } from './testkit.ts'

describe('the simulated customer (bots) picks from a fixed mix by refusal reason', () => {
  it('has a mix for every reason and each mix sums to 1', () => {
    for (const r of REFUSAL_REASONS) {
      expect(OPTION_MIX[r].length).toBe(4)
      expect(OPTION_MIX[r].reduce((t, [, w]) => t + w, 0)).toBeCloseTo(1, 9)
    }
  })

  it('is deterministic for a parcel and follows the mix over many parcels', () => {
    expect(drawOption('no_cash', 'P-a')).toBe(drawOption('no_cash', 'P-a'))
    const n = 4000
    const counts = { deliver: 0, later: 0, pay: 0, pickup: 0 }
    for (let i = 0; i < n; i++) counts[drawOption('no_cash', `P-x${i}`)]++
    // "No cash on hand" mostly pays by UPI.
    expect(counts.pay / n).toBeGreaterThan(0.45)
    expect(counts.pay / n).toBeLessThan(0.55)
    expect(counts.pay).toBeGreaterThan(counts.deliver)
    const later = { tomorrow: 0, day_after: 0 }
    for (let i = 0; i < 1000; i++) later[drawDay(`P-y${i}`)]++
    expect(later.tomorrow).toBeGreaterThan(later.day_after)
  })

  it('has fixed shares for paying successfully and collecting a pickup (engine constants, not editable)', () => {
    expect(PAY_SUCCESS_SHARE).toBe(0.9)
    expect(PICKUP_COLLECT_SHARE).toBe(0.75)
    let collects = 0
    for (let i = 0; i < 2000; i++) if (pickupCollects(`P-z${i}`)) collects++
    expect(collects / 2000).toBeGreaterThan(0.7)
    expect(collects / 2000).toBeLessThan(0.8)
  })
})

describe('Close pilot with every second-chance option in play', () => {
  const full = reduce(createDay(fakeGeo(0, 1), { seed: 33, orders: 300, riders: 12 }), { type: 'startDay', at: AT })
  const closed = reduce(full, { type: 'closePilot', at: AT + 10 })

  it('ends with nothing on the shelf, nothing waiting, and a green Audit', () => {
    expect(closed.parcels.filter((p) => p.state === 'pickup_reserved' || p.state === 'second_chance_sent' || p.state === 'queued')).toEqual([])
    expect(shelfUsed(closed)).toBe(0)
    expect(runAudit(closed).filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail}`)).toEqual([])
  })

  it('uses the new options: pickups are collected or expire, different times and payments happen', () => {
    const choices = closed.parcels.map((p) => p.choice).filter(Boolean)
    expect(new Set(choices).size).toBeGreaterThanOrEqual(3)
    expect(eventsOf(closed, 'PICKUP_RESERVED').length).toBe(eventsOf(closed, 'PICKUP_COLLECTED').length + eventsOf(closed, 'PICKUP_EXPIRED').length)
  })

  it('every pickup that was collected ended as a hub_pickup order, never a delivered one', () => {
    for (const p of closed.parcels.filter((x) => x.state === 'picked_up')) expect(closed.stops[p.orderId].status).toBe('hub_pickup')
  })
})
