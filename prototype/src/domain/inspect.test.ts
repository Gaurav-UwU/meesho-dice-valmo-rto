import { describe, expect, it } from 'vitest'
import { runAudit } from './audit.ts'
import { eventsOf } from './events.ts'
import { proactiveCount } from './helpers.ts'
import { reduce } from './reducer.ts'
import { deskItems, stopsOf } from './selectors.ts'
import { AT, forceParcel, heroStops, inspectParcel, refuseOrder, run, startedDay } from './testkit.ts'

const day = startedDay()
const { bonus: bonusId } = heroStops(day)

const HOLDABLE = { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 } as const
const lane = (s: typeof day) => deskItems(s)[0].decision.lane
const gate = (s: typeof day, name: string) => deskItems(s)[0].decision.gates.find((g) => g.name === name)

describe('Inspect parcel (required before Hold only)', () => {
  const refused = forceParcel(refuseOrder(day, bonusId), bonusId, HOLDABLE)
  const pid = refused.parcels[0].id

  it('a parcel the hub operator has not inspected cannot be held, even when every other gate passes', () => {
    expect(refused.parcels[0].inspection).toBeUndefined()
    expect(lane(refused)).toBe('consolidated_return')
    expect(gate(refused, 'Inspected')?.pass).toBe(false)
    expect(reduce(refused, { type: 'deskHold', at: AT + 2, parcelId: pid })).toBe(refused)
  })

  it('inspecting records the facts, who and when, logs PARCEL_INSPECTED, and opens the hold lane', () => {
    const s = reduce(refused, { type: 'deskInspect', at: AT + 2, parcelId: pid, unopened: true, sealOk: true, invoiceOutside: true, photoNote: 'sealed, label outside' })
    expect(s.parcels[0].inspection).toEqual({ unopened: true, sealOk: true, invoiceOutside: true, at: s.simNow, by: 'Hub operator', photoNote: 'sealed, label outside' })
    expect(eventsOf(s, 'PARCEL_INSPECTED', bonusId)).toHaveLength(1)
    expect(eventsOf(s, 'PARCEL_INSPECTED', bonusId)[0].data).toMatchObject({ unopened: true, sealOk: true, invoiceOutside: true, by: 'Hub operator' })
    expect(lane(s)).toBe('hold_rehome')
    expect(run(s, { type: 'deskHold', at: AT + 3, parcelId: pid }).parcels[0].state).toBe('held')
  })

  it('what the operator finds decides the gates: a broken seal closes the hold lane, whatever the parcel record said', () => {
    const s = inspectParcel(refused, bonusId, { sealOk: false })
    expect(gate(s, 'Seal intact')?.pass).toBe(false)
    expect(lane(s)).toBe('consolidated_return')
    expect(reduce(s, { type: 'deskHold', at: AT + 3, parcelId: pid })).toBe(s)
  })

  it('an inspection can be corrected while the parcel is still queued; each one is logged', () => {
    const first = inspectParcel(refused, bonusId, { sealOk: false })
    const second = inspectParcel(first, bonusId, { sealOk: true }, AT + 3)
    expect(lane(second)).toBe('hold_rehome')
    expect(eventsOf(second, 'PARCEL_INSPECTED', bonusId)).toHaveLength(2)
  })

  it('is refused once the parcel has left the queue, for an unknown parcel, and keeps the photo note short', () => {
    const held = run(inspectParcel(refused, bonusId), { type: 'deskHold', at: AT + 3, parcelId: pid })
    expect(reduce(held, { type: 'deskInspect', at: AT + 4, parcelId: pid, unopened: false, sealOk: false, invoiceOutside: false })).toBe(held)
    expect(reduce(refused, { type: 'deskInspect', at: AT + 4, parcelId: 'P-nope', unopened: true, sealOk: true, invoiceOutside: true })).toBe(refused)
    const long = reduce(refused, { type: 'deskInspect', at: AT + 4, parcelId: pid, unopened: true, sealOk: true, invoiceOutside: true, photoNote: 'x'.repeat(300) })
    expect(long.parcels[0].inspection?.photoNote).toHaveLength(80)
  })

  it('a second chance does not need an inspection', () => {
    const soft = forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_home' })
    expect(lane(soft)).toBe('second_chance')
    expect(reduce(soft, { type: 'deskSecondChance', at: AT + 2, parcelId: soft.parcels[0].id }).parcels[0].state).toBe('second_chance_sent')
  })

  it('a consolidated return does not need an inspection', () => {
    const s = run(refused, { type: 'deskConsolidate', at: AT + 2, parcelId: pid })
    expect(s.parcels[0].state).toBe('batched')
  })
})

describe('bots inspect for themselves', () => {
  const botId = stopsOf(day).find((x) => !x.manual && x.riderId !== day.stops[bonusId].riderId)!.order.id

  it('a parcel refused by a simulated rider is inspected at once, with the synthetic values, by "Bot (synthetic)"', () => {
    const s = refuseOrder(day, botId)
    const rec = s.parcels[0]
    expect(rec.inspection).toMatchObject({ unopened: rec.parcel.unopened, sealOk: rec.parcel.sealOk, invoiceOutside: rec.parcel.invoiceOutside, by: 'Bot (synthetic)' })
    expect(eventsOf(s, 'PARCEL_INSPECTED', botId)).toHaveLength(1)
  })

  it('a parcel refused at the live demo stop waits for the operator', () => {
    expect(refuseOrder(day, bonusId).parcels[0].inspection).toBeUndefined()
  })

  it('Close pilot inspects whatever is still waiting, and the Audit stays green', () => {
    const closed = reduce(refuseOrder(day, bonusId), { type: 'closePilot', at: AT + 50 })
    expect(closed.parcels.length).toBeGreaterThan(0)
    expect(closed.parcels.every((p) => p.inspection !== undefined)).toBe(true)
    expect(closed.parcels.find((p) => p.orderId === bonusId)?.inspection?.by).toBe('Bot (synthetic)')
    expect(runAudit(closed).filter((c) => !c.ok)).toEqual([])
  })
})

describe('a damaged or wrong item is never re-homed', () => {
  const damaged = forceParcel(refuseOrder(day, bonusId), bonusId, { ...HOLDABLE, reason: 'damaged' })
  const inspected = inspectParcel(damaged, bonusId)

  it('fails the Item condition OK gate and goes back in a consolidated return, even inspected, even with heavy demand', () => {
    expect(gate(inspected, 'Item condition OK')?.pass).toBe(false)
    expect(lane(inspected)).toBe('consolidated_return')
    expect(reduce(inspected, { type: 'deskHold', at: AT + 5, parcelId: inspected.parcels[0].id })).toBe(inspected)
  })

  it('carries a Seller claim / QC needed flag from the moment it is refused', () => {
    const fine = reduce(reduce(day, { type: 'riderRefuse', at: AT + 100, orderId: bonusId, code: '7777', reason: 'not_ordered' }), { type: 'submitOtp', at: AT + 101, orderId: bonusId, code: '7777' })
    expect(fine.parcels[0].sellerClaim).toBe(false)
    const rider = reduce(reduce(day, { type: 'riderRefuse', at: AT + 100, orderId: bonusId, code: '7777', reason: 'damaged' }), { type: 'submitOtp', at: AT + 101, orderId: bonusId, code: '7777' })
    expect(rider.parcels[0].sellerClaim).toBe(true)
    expect(rider.parcels[0].parcel.reason).toBe('damaged')
  })
})

describe('skip the second chance', () => {
  const soft = forceParcel(refuseOrder(day, bonusId), bonusId, { ...HOLDABLE, reason: 'not_home' })
  const pid = soft.parcels[0].id

  it('the operator skips with one of four reasons: it is logged, counted, sends no message, and the parcel moves to the next lane', () => {
    expect(lane(soft)).toBe('second_chance')
    const s = reduce(soft, { type: 'deskSkipSecondChance', at: AT + 2, parcelId: pid, reason: 'refused_firmly' })
    expect(s.parcels[0].skipReason).toBe('refused_firmly')
    expect(s.parcels[0].state).toBe('queued')
    expect(eventsOf(s, 'SECOND_CHANCE_SKIPPED', bonusId)).toHaveLength(1)
    expect(eventsOf(s, 'SECOND_CHANCE_SKIPPED', bonusId)[0].data).toMatchObject({ reason: 'refused_firmly' })
    expect(proactiveCount(s, bonusId)).toBe(proactiveCount(soft, bonusId))
    // Not inspected yet, so the next lane is a consolidated return; once inspected it is Hold.
    expect(lane(s)).toBe('consolidated_return')
    expect(lane(inspectParcel(s, bonusId))).toBe('hold_rehome')
  })

  it.each(['refused_firmly', 'not_reachable', 'seller_wants_back', 'other'] as const)('accepts the reason %s', (reason) => {
    expect(reduce(soft, { type: 'deskSkipSecondChance', at: AT + 2, parcelId: pid, reason }).parcels[0].skipReason).toBe(reason)
  })

  it('ignores a reason that is not one of the four', () => {
    expect(reduce(soft, { type: 'deskSkipSecondChance', at: AT + 2, parcelId: pid, reason: 'because' as never })).toBe(soft)
  })

  it('cannot skip a second chance that was never on offer, or one already sent, or twice', () => {
    const hard = forceParcel(refuseOrder(day, bonusId), bonusId, HOLDABLE)
    expect(reduce(hard, { type: 'deskSkipSecondChance', at: AT + 2, parcelId: hard.parcels[0].id, reason: 'other' })).toBe(hard)
    const sent = reduce(soft, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
    expect(reduce(sent, { type: 'deskSkipSecondChance', at: AT + 3, parcelId: pid, reason: 'other' })).toBe(sent)
    const skipped = reduce(soft, { type: 'deskSkipSecondChance', at: AT + 2, parcelId: pid, reason: 'other' })
    expect(reduce(skipped, { type: 'deskSkipSecondChance', at: AT + 3, parcelId: pid, reason: 'refused_firmly' })).toBe(skipped)
  })

  it('never overrides a gate: a skipped soft refusal from an unopted seller still goes back', () => {
    const closed = forceParcel(soft, bonusId, { sellerOptedIn: false })
    const s = inspectParcel(reduce(closed, { type: 'deskSkipSecondChance', at: AT + 2, parcelId: pid, reason: 'other' }), bonusId)
    expect(lane(s)).toBe('consolidated_return')
    expect(gate(s, 'Seller opted in')?.pass).toBe(false)
  })
})

describe('Audit: no parcel held without an inspection, no gate overridden', () => {
  const held = run(inspectParcel(forceParcel(refuseOrder(day, bonusId), bonusId, HOLDABLE), bonusId), { type: 'deskHold', at: AT + 3, parcelId: `P-${bonusId}` })
  const check = (s: typeof day, id: string) => runAudit(s).find((c) => c.id === id)!

  it('are green when a parcel is inspected and then held', () => {
    expect(check(held, 'inspect-before-hold')).toMatchObject({ ok: true })
    expect(check(held, 'gates-not-overridden')).toMatchObject({ ok: true })
    expect(check(held, 'inspect-before-hold').detail).toMatch(/1 held/)
  })

  it('are green on a day with no holds', () => {
    expect(check(day, 'inspect-before-hold').ok).toBe(true)
    expect(check(day, 'gates-not-overridden').ok).toBe(true)
  })

  it('go red if a hold has no inspection before it', () => {
    const forged = { ...held, events: held.events.filter((e) => e.type !== 'PARCEL_INSPECTED') }
    expect(check(forged, 'inspect-before-hold')).toMatchObject({ ok: false })
    expect(check(forged, 'inspect-before-hold').detail).toContain(`${bonusId}`)
  })

  it('go red if a parcel was held although the inspection found a broken seal', () => {
    const forged = { ...held, parcels: held.parcels.map((p) => ({ ...p, inspection: { ...p.inspection!, sealOk: false } })) }
    expect(check(forged, 'gates-not-overridden')).toMatchObject({ ok: false })
  })

  it('go red if a damaged item was held', () => {
    const forged = { ...held, parcels: held.parcels.map((p) => ({ ...p, parcel: { ...p.parcel, reason: 'damaged' as const } })) }
    expect(check(forged, 'gates-not-overridden').ok).toBe(false)
  })

  it('the audit now has eighteen checks', () => {
    expect(runAudit(day)).toHaveLength(18)
  })
})
