import { describe, expect, it } from 'vitest'
import { runAudit } from './audit.ts'
import { eventsOf } from './events.ts'
import { reduce } from './reducer.ts'
import { AT, forceParcel, heroStops, inspectParcel, refuseOrder, run, setPayment, startedDay } from './testkit.ts'
import type { DayState } from './types.ts'

const day = startedDay()
const { bonus: bonusId } = heroStops(day)
const pid = `P-${bonusId}`
const check = (s: DayState, id: string) => runAudit(s).find((c) => c.id === id)!

const reserved = (() => {
  const s = run(forceParcel(refuseOrder(setPayment(day, bonusId, 'COD'), bonusId), bonusId, { reason: 'not_home' }), { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
  return reduce(s, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true, option: 'pickup' })
})()
const code = reserved.parcels[0].pickup!.code
const collected = reduce(reserved, { type: 'deskHandover', at: AT + 10, parcelId: pid, code })
const held = run(inspectParcel(forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 }), bonusId), { type: 'deskHold', at: AT + 3, parcelId: pid })

describe('Audit: no pickup handed over without a verified code', () => {
  it('has eighteen checks now', () => {
    expect(runAudit(day)).toHaveLength(18)
  })

  it('is green with no pickups, with a reserved pickup, and with a collected one', () => {
    for (const s of [day, reserved, collected]) expect(check(s, 'pickup-verified').ok).toBe(true)
    expect(check(collected, 'pickup-verified').detail).toMatch(/1 collected/)
  })

  it('goes red if an order ended as a hub pickup with no collection record', () => {
    const forged = { ...collected, events: collected.events.filter((e) => e.type !== 'PICKUP_COLLECTED') }
    expect(check(forged, 'pickup-verified').ok).toBe(false)
    expect(check(forged, 'pickup-verified').detail).toContain(bonusId)
  })

  it('goes red if a collection is recorded without a verified code', () => {
    const forged = { ...collected, events: collected.events.map((e) => (e.type === 'PICKUP_COLLECTED' ? { ...e, data: { codeVerified: false } } : e)) }
    expect(check(forged, 'pickup-verified').ok).toBe(false)
  })

  it('goes red if a collection has no reservation before it', () => {
    const forged = { ...collected, events: collected.events.filter((e) => e.type !== 'PICKUP_RESERVED') }
    expect(check(forged, 'pickup-verified').ok).toBe(false)
  })

  it('goes red if the parcel says collected but the order is not a hub pickup', () => {
    const forged = { ...collected, stops: { ...collected.stops, [bonusId]: { ...collected.stops[bonusId], status: 'rto' as const } } }
    expect(check(forged, 'pickup-verified').ok).toBe(false)
  })
})

describe('Audit: the shelf is never above capacity', () => {
  it('records the slot taken and the capacity at that moment on every hold and pickup', () => {
    expect(eventsOf(held, 'HELD')[0].data).toMatchObject({ slot: 1, capacity: 30 })
    expect(eventsOf(reserved, 'PICKUP_RESERVED')[0].data).toMatchObject({ slot: 1, capacity: 30 })
  })

  it('is green on a day with holds and pickups', () => {
    for (const s of [day, held, reserved, collected]) expect(check(s, 'shelf-capacity').ok).toBe(true)
  })

  it('stays green if the operator lowers the capacity afterwards (the rule is about the moment a slot is taken)', () => {
    const lowered = reduce(held, { type: 'deskSetParam', at: AT + 5, param: 'shelfCapacity', value: 0 })
    expect(check(lowered, 'shelf-capacity').ok).toBe(true)
  })

  it('goes red if a slot was taken beyond the capacity', () => {
    const forged = { ...held, events: held.events.map((e) => (e.type === 'HELD' ? { ...e, data: { slot: 31, capacity: 30 } } : e)) }
    expect(check(forged, 'shelf-capacity').ok).toBe(false)
    expect(check(forged, 'shelf-capacity').detail).toMatch(/31/)
  })

  it('a hold or a pickup cannot take the last slot twice: with capacity 1 the second is refused', () => {
    const one = reduce(reserved, { type: 'deskSetParam', at: AT + 4, param: 'shelfCapacity', value: 1 })
    expect(one.parcels.filter((p) => p.state === 'pickup_reserved')).toHaveLength(1)
    // a second parcel trying to be held would fail the Shelf capacity gate: the gate itself is covered in the Router tests
    expect(check(one, 'shelf-capacity').ok).toBe(true)
  })
})
