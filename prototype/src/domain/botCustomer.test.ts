import { describe, expect, it } from 'vitest'
import { REFUSAL_REASONS } from '../engine/router.ts'
import { ANSWER_MIX, drawOutcome, drawWhen, PAY_SUCCESS_SHARE, paysByUpi, PICKUP_COLLECT_SHARE, pickupCollects, SHARE_LOCATION_SHARE, sharesLocation } from './botCustomer.ts'
import { reduce } from './reducer.ts'
import { createDay } from './day.ts'
import { fakeGeo } from '../engine/testkit.ts'
import { eventsOf } from './events.ts'
import { runAudit } from './audit.ts'
import { shelfUsed } from './routing.ts'
import { AT } from './testkit.ts'

describe('the simulated customer (bots) answers each step from a fixed mix by refusal reason', () => {
  it('has a mix for every reason, every share a probability', () => {
    for (const r of REFUSAL_REASONS) {
      for (const v of Object.values(ANSWER_MIX[r])) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
    expect(SHARE_LOCATION_SHARE).toBeGreaterThan(0)
  })

  it('is deterministic for a parcel and follows the mix over many parcels', () => {
    expect(drawOutcome('no_cash', 'P-a')).toBe(drawOutcome('no_cash', 'P-a'))
    const n = 4000
    let pickups = 0
    let upi = 0
    const when = { today: 0, tomorrow: 0, day_after: 0 }
    for (let i = 0; i < n; i++) {
      if (drawOutcome('no_cash', `P-x${i}`) === 'pickup') pickups++
      if (paysByUpi('no_cash', `P-x${i}`)) upi++
      when[drawWhen('want_later', `P-x${i}`)]++
    }
    expect(pickups / n).toBeCloseTo(ANSWER_MIX.no_cash.pickup, 1)
    // "No cash on hand" mostly pays by UPI; "wants it later" mostly picks a later day, tomorrow more than the day after.
    expect(upi / n).toBeGreaterThan(0.55)
    expect(when.today / n).toBeLessThan(0.35)
    expect(when.tomorrow).toBeGreaterThan(when.day_after)
    let shares = 0
    for (let i = 0; i < n; i++) if (sharesLocation(`P-x${i}`)) shares++
    expect(shares / n).toBeCloseTo(SHARE_LOCATION_SHARE, 1)
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

  it('answers every step: deliveries and pickups, later days, how to pay and the address; pickups are collected or expire', () => {
    const choices = closed.parcels.map((p) => p.choice).filter(Boolean)
    expect(new Set(choices)).toEqual(new Set(['deliver', 'pickup']))
    expect(closed.parcels.some((p) => p.scWhen === 'tomorrow' || p.scWhen === 'day_after')).toBe(true)
    const asked = new Set(closed.messages.map((m) => m.kind))
    expect((['second_chance_when', 'second_chance_method', 'second_chance_address'] as const).every((k) => asked.has(k))).toBe(true)
    expect(eventsOf(closed, 'PICKUP_RESERVED').length).toBe(eventsOf(closed, 'PICKUP_COLLECTED').length + eventsOf(closed, 'PICKUP_EXPIRED').length)
  })

  it('every pickup that was collected ended as a hub_pickup order, never a delivered one', () => {
    for (const p of closed.parcels.filter((x) => x.state === 'picked_up')) expect(closed.stops[p.orderId].status).toBe('hub_pickup')
  })
})
