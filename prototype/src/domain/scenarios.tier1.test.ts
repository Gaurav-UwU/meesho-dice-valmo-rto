import { describe, expect, it } from 'vitest'
import { fakeGeo } from '../engine/testkit.ts'
import { whatIf } from '../engine/whatif.ts'
import { runAudit } from './audit.ts'
import { DAY_MS, HOUR_MS } from './clock.ts'
import { createDay } from './day.ts'
import { eventsOf } from './events.ts'
import { costLedger, ledgerTotals, savingsLedger } from './ledger.ts'
import { reduce } from './reducer.ts'
import { deskItems, kpis, stopsOf } from './selectors.ts'
import { AT, advanceHours, deliverOrder, forceParcel, heroStops, inspectParcel, refuseOrder, run, setPayment, startedDay } from './testkit.ts'
import type { DayState } from './types.ts'

/**
 * Tier 1 of the 15 scenarios in work/15-prototype-v2-handoff.md section 7: 1, 3, 6 to 12, and the Audit.
 * (2, 4, 5, 13, 14 and 15 are in scenarios.test.ts.)
 */
const day = startedDay()
const { bonus: bonusId } = heroStops(day)
const owner = day.stops[bonusId].riderId

const ledgerOf = (s: DayState, orderId: string) => s.ledger.filter((l) => l.orderId === orderId)

describe('scenario 1: a flagged Bonus-arm delivery accrues ₹15, becomes pending, and is released when the window closes', () => {
  const prepaid = setPayment(day, bonusId, 'PREPAID')

  it('prepaid: pending straight away (the OTP proves the delivery)', () => {
    const s = deliverOrder(prepaid, bonusId)
    expect(ledgerOf(s, bonusId)).toHaveLength(1)
    expect(ledgerOf(s, bonusId)[0]).toMatchObject({ amount: 15, status: 'pending', riderId: owner, cod: false })
    expect(eventsOf(s, 'BONUS_ACCRUED', bonusId)).toHaveLength(1)
    expect(eventsOf(s, 'BONUS_PENDING', bonusId)).toHaveLength(1)
  })

  it('COD: accrued only, until the rider\'s cash is reconciled', () => {
    const cod = setPayment(day, bonusId, 'COD')
    const s = deliverOrder(cod, bonusId)
    expect(ledgerOf(s, bonusId)[0]).toMatchObject({ status: 'accrued', cod: true })
    const paid = run(s, { type: 'reconcileCod', at: AT + 50 })
    expect(ledgerOf(paid, bonusId)[0].status).toBe('pending')
    expect(eventsOf(paid, 'COD_RECONCILED')).toHaveLength(1)
    expect(eventsOf(paid, 'COD_RECONCILED')[0].data).toMatchObject({ riderId: owner, amount: cod.stops[bonusId].order.value })
  })

  it('COD is reconciled automatically at 20:00 the same sim day', () => {
    const s = advanceHours(deliverOrder(setPayment(day, bonusId, 'COD'), bonusId), 13)
    expect(ledgerOf(s, bonusId)[0].status).toBe('pending')
  })

  it('stays pending inside the 7-day return window and is released the moment it closes', () => {
    const delivered = deliverOrder(prepaid, bonusId)
    const inside = advanceHours(delivered, 6 * 24)
    expect(ledgerOf(inside, bonusId)[0].status).toBe('pending')
    const released = advanceHours(inside, 24)
    expect(ledgerOf(released, bonusId)[0].status).toBe('released')
    expect(eventsOf(released, 'BONUS_RELEASED', bonusId)).toHaveLength(1)
    expect(ledgerTotals(released)).toMatchObject({ released: 15, pending: 0 })
  })

  it('the released bonus is a booked cost: ₹15, owned by Valmo, on the bonus stream', () => {
    const s = advanceHours(deliverOrder(prepaid, bonusId), 7 * 24)
    const line = costLedger(s).find((c) => c.line === 'Rescue bonus')!
    expect(line).toMatchObject({ amount: 15, owner: 'Valmo', stream: 'bonus', count: 1 })
  })
})

describe('bonus blocks at accrual', () => {
  it('the same rider that faked attempt 1 does not earn the bonus for delivering on attempt 2', () => {
    const s0 = run(
      day,
      { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable' },
      { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: false },
      { type: 'reattempt', at: AT + 3, orderId: bonusId },
    )
    const s = deliverOrder(s0, bonusId)
    expect(ledgerOf(s, bonusId)[0]).toMatchObject({ status: 'blocked' })
    expect(ledgerOf(s, bonusId)[0].reason).toMatch(/faked|fake/i)
    expect(eventsOf(s, 'BONUS_BLOCKED', bonusId)).toHaveLength(1)
  })

  it('a rider with 2 confirmed strikes earns nothing new', () => {
    const struck: DayState = { ...day, strikes: { [owner]: 2 } }
    const s = deliverOrder(struck, bonusId)
    expect(ledgerOf(s, bonusId)[0]).toMatchObject({ status: 'blocked' })
    expect(ledgerOf(s, bonusId)[0].reason).toMatch(/2 confirmed/i)
  })

  it('a rider is capped at ₹300 of bonus in a sim day', () => {
    const big = reduce(createDay(fakeGeo(0, 1), { seed: 5, orders: 600, riders: 6 }), { type: 'startDay', at: AT })
    let s: DayState = big
    const flagged = stopsOf(big).filter((x) => x.flagged && x.arm === 'bonus').map((x) => x.order.id)
    // Give one rider 21 flagged Bonus-arm stops, deliver them all: the 21st is over the ₹300 cap.
    const ids = flagged.slice(0, 21)
    const bigOwner = big.riders.find((r) => r.arm === 'bonus')!.id
    s = { ...s, stops: { ...s.stops, ...Object.fromEntries(ids.map((id) => [id, { ...s.stops[id], riderId: bigOwner }])) } }
    for (const [i, id] of ids.entries()) s = deliverOrder(setPayment(s, id, 'PREPAID'), id, `${1000 + i}`, AT + 100 + i * 10)
    const entries = s.ledger.filter((l) => l.riderId === bigOwner)
    expect(entries.filter((l) => l.status !== 'blocked')).toHaveLength(20)
    expect(entries.filter((l) => l.status === 'blocked')).toHaveLength(1)
    expect(entries.find((l) => l.status === 'blocked')?.reason).toMatch(/cap/i)
  })

  it('a rider well below the Control arm on normal orders earns no bonus', () => {
    // 12 normal orders of this rider, only 4 delivered, against a Control baseline of about 100%.
    let s: DayState = day
    const normals = stopsOf(day).filter((x) => !x.flagged && x.arm === 'bonus').slice(0, 12).map((x) => x.order.id)
    s = { ...s, stops: { ...s.stops, ...Object.fromEntries(normals.map((id) => [id, { ...s.stops[id], riderId: owner, originalRiderId: owner }])) } }
    const controlNormals = stopsOf(day).filter((x) => !x.flagged && x.arm === 'control').slice(0, 12).map((x) => x.order.id)
    for (const id of controlNormals) s = deliverOrder(s, id, '2222', AT + 200)
    for (const id of normals.slice(0, 4)) s = deliverOrder(s, id, '3333', AT + 300)
    // The rest fail for good (hopeless odds, so the first failed attempt closes as an RTO): final outcomes, so the floor can see them.
    for (const id of normals.slice(4)) {
      s = { ...s, stops: { ...s.stops, [id]: { ...s.stops[id], pRto: 0.99 } } }
      s = run(s, { type: 'riderAttempt', at: AT + 400, orderId: id, claim: 'customer_unavailable' }, { type: 'reattempt', at: AT + 401, orderId: id })
    }
    const flaggedId = stopsOf(s).find((x) => x.flagged && x.arm === 'bonus' && x.status === 'out_for_delivery')!.order.id
    const s2 = deliverOrder(setPayment({ ...s, stops: { ...s.stops, [flaggedId]: { ...s.stops[flaggedId], riderId: owner } } }, flaggedId, 'PREPAID'), flaggedId, '4444', AT + 500)
    expect(ledgerOf(s2, flaggedId)[0]).toMatchObject({ status: 'blocked' })
    expect(ledgerOf(s2, flaggedId)[0].reason).toMatch(/normal/i)
  })
})

describe('scenario 3: a fake attempt becomes an exception and a free re-attempt by another same-arm rider', () => {
  const faked = run(day, { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable', evidence: { gpsDistM: 900, calls: 0, waitMin: 0 } })

  it('logs the evidence, rates it low and opens an exception for Ops', () => {
    expect(faked.stops[bonusId].status).toBe('ndr')
    expect(faked.stops[bonusId].confidence).toBe('low')
    expect(faked.exceptions).toHaveLength(1)
    expect(faked.exceptions[0]).toMatchObject({ orderId: bonusId, riderId: owner, status: 'open', confidence: 'low' })
    expect(eventsOf(faked, 'ATTEMPT_LOGGED', bonusId)[0].data).toMatchObject({ gpsDistM: 900, calls: 0, waitMin: 0, confidence: 'low' })
    expect(eventsOf(faked, 'EXCEPTION_OPENED', bonusId)).toHaveLength(1)
  })

  it('a well-evidenced attempt (near the door, 2 calls, 5+ minutes) is high confidence and opens nothing', () => {
    const s = run(day, { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable', evidence: { gpsDistM: 60, calls: 3, waitMin: 8 } })
    expect(s.stops[bonusId].confidence).toBe('high')
    expect(s.exceptions).toHaveLength(0)
  })

  it('a customer who says the rider never came makes it low confidence and opens an exception', () => {
    const s = run(
      day,
      { type: 'riderAttempt', at: AT, orderId: bonusId, claim: 'customer_unavailable', evidence: { gpsDistM: 60, calls: 3, waitMin: 8 } },
      { type: 'customerReach', at: AT + 1, orderId: bonusId, reached: false },
    )
    expect(s.stops[bonusId].confidence).toBe('low')
    expect(s.exceptions).toHaveLength(1)
  })

  it('"free re-attempt" hands the order to another rider of the same arm and does not count against the attempt cap', () => {
    const s = run(faked, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'free_reattempt' })
    const st = s.stops[bonusId]
    expect(st.status).toBe('out_for_delivery')
    expect(st.riderId).not.toBe(owner)
    expect(s.riders.find((r) => r.id === st.riderId)?.arm).toBe('bonus')
    expect(st.arm).toBe('bonus')
    expect(st.failedAttempts).toBe(0)
    expect(s.exceptions[0]).toMatchObject({ status: 'resolved', action: 'free_reattempt', auto: false })
  })

  it('the rider who delivers earns the bonus; the rider who faked earns nothing', () => {
    const s = deliverOrder(setPayment(run(faked, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'free_reattempt' }), bonusId, 'PREPAID'), bonusId)
    expect(s.stops[bonusId].status).toBe('delivered_a1')
    const entries = ledgerOf(s, bonusId)
    expect(entries).toHaveLength(1)
    expect(entries[0].riderId).not.toBe(owner)
    expect(entries[0].status).toBe('pending')
  })

  it('"strike" adds a strike to the rider and also gives a free re-attempt', () => {
    const s = run(faked, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'strike' })
    expect(s.strikes[owner]).toBe(1)
    expect(eventsOf(s, 'STRIKE')).toHaveLength(1)
    expect(s.stops[bonusId].status).toBe('out_for_delivery')
    expect(s.stops[bonusId].riderId).not.toBe(owner)
  })

  it('"confirm valid" keeps the normal failed-attempt path and clears the dispute', () => {
    const s = run(faked, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'confirm' })
    expect(s.stops[bonusId].status).toBe('ndr')
    expect(s.stops[bonusId].assessment?.bonusBlocked).not.toBe(true)
    expect(s.exceptions[0]).toMatchObject({ status: 'resolved', action: 'confirm' })
  })

  it('left unresolved for 24 sim-hours, it becomes a free re-attempt on its own', () => {
    const s = advanceHours(faked, 24)
    expect(s.exceptions[0]).toMatchObject({ status: 'resolved', action: 'free_reattempt', auto: true })
    expect(s.stops[bonusId].status).toBe('out_for_delivery')
    expect(s.stops[bonusId].failedAttempts).toBe(0)
    expect(s.strikes[owner] ?? 0).toBe(0)
  })

  it('an exception can only be resolved once, and only while the order is a failed attempt', () => {
    const done = run(faked, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'confirm' })
    expect(reduce(done, { type: 'resolveException', at: AT + 3, orderId: bonusId, action: 'strike' })).toBe(done)
    expect(reduce(day, { type: 'resolveException', at: AT, orderId: bonusId, action: 'confirm' })).toBe(day)
  })

  it('resolving by a person books ₹10 of review labour on the bonus stream', () => {
    const s = run(faked, { type: 'resolveException', at: AT + 2, orderId: bonusId, action: 'confirm' })
    expect(costLedger(s).find((c) => c.line === 'Exception review labour')).toMatchObject({ amount: 10, stream: 'bonus' })
  })
})

describe('scenario 6: a soft refusal accepted as a second chance is delivered, and the saving books at delivery', () => {
  const refused = forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_home' })
  const pid = refused.parcels[0].id
  const accepted = run(refused, { type: 'deskSecondChance', at: AT + 2, parcelId: pid }, { type: 'customerSecondChance', at: AT + 3, parcelId: pid, accept: true })

  it('the Router offers it (soft reason, positive expected value) and logs the lane', () => {
    expect(deskItems(refused)[0].decision.lane).toBe('second_chance')
    const sent = run(refused, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })
    expect(eventsOf(sent, 'ROUTER_LANE')[0].data).toMatchObject({ lane: 'second_chance' })
    expect(eventsOf(sent, 'SECOND_CHANCE_SENT')).toHaveLength(1)
  })

  it('acceptance alone books no saving', () => {
    expect(eventsOf(accepted, 'SECOND_CHANCE_ACCEPTED')).toHaveLength(1)
    expect(savingsLedger(accepted).total).toBe(0)
  })

  it('delivery on attempt 2 books the gross ₹120 return avoided; the ₹21 leg was booked as a cost when the order went back out (net ₹99)', () => {
    const s = deliverOrder(accepted, bonusId)
    expect(s.stops[bonusId].status).toBe('delivered_a2')
    expect(eventsOf(s, 'SAVING_BOOKED', bonusId)[0].data).toMatchObject({ line: 'Second chance delivered (₹120 return avoided)', amount: 120 })
    expect(savingsLedger(s).total).toBe(120)
    expect(costLedger(s).find((c) => c.line === 'Second-chance re-attempt leg')).toMatchObject({ amount: 21, stream: 'router' })
  })

  it('if attempt 2 fails, no saving is ever booked', () => {
    const failed = run(
      accepted,
      { type: 'riderAttempt', at: AT + 5, orderId: bonusId, claim: 'customer_unavailable' },
      { type: 'reattempt', at: AT + 6, orderId: bonusId },
    )
    expect(failed.stops[bonusId].status).toBe('rto')
    expect(savingsLedger(failed).total).toBe(0)
  })
})

describe('scenario 7: a second chance with no reply expires at 24 hours and falls to the next lane', () => {
  const refused = forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'no_cash' })
  const pid = refused.parcels[0].id
  const sent = run(refused, { type: 'deskSecondChance', at: AT + 2, parcelId: pid })

  it('is still waiting at 23 hours', () => {
    expect(advanceHours(sent, 23).parcels[0].state).toBe('second_chance_sent')
  })

  it('expires at 24 hours, logs it, and is routed by the next lane', () => {
    const s = advanceHours(sent, 24)
    expect(s.parcels[0].state).toBe('queued')
    expect(s.parcels[0].secondChanceExpired).toBe(true)
    expect(eventsOf(s, 'SECOND_CHANCE_EXPIRED')).toHaveLength(1)
    expect(deskItems(s)[0].decision.lane).not.toBe('second_chance')
  })
})

describe('scenario 8: a hard refusal with every gate is held, matched, delivered, and only then is the ₹145 booked', () => {
  const hard = inspectParcel(forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.3 }), bonusId)
  const pid = hard.parcels[0].id
  const held = run(hard, { type: 'deskHold', at: AT + 2, parcelId: pid })
  const matched = run(held, { type: 'deskMatch', at: AT + 3, parcelId: pid })
  const newId = matched.parcels[0].rehomedStopId!

  it('the Router picks Hold & Re-home and the hold costs ₹8 on the router stream', () => {
    expect(deskItems(hard)[0].decision.lane).toBe('hold_rehome')
    expect(held.parcels[0].state).toBe('held')
    expect(eventsOf(held, 'HELD')).toHaveLength(1)
    expect(costLedger(held).find((c) => c.line === 'Hold on shelf (48h)')).toMatchObject({ amount: 8, stream: 'router' })
  })

  it('a match creates a new order in its own re-home cohort: no arm, not flagged, outside the pilot metrics', () => {
    const st = matched.stops[newId]
    expect(st.rehomedFrom).toBe(bonusId)
    expect(st.arm).toBeUndefined()
    expect(st.flagged).toBe(false)
    expect(kpis(matched).flaggedBonus.n).toBe(kpis(day).flaggedBonus.n)
    expect(matched.stops[bonusId].status).toBe('refused')
    expect(savingsLedger(matched).total).toBe(0)
    expect(costLedger(matched).find((c) => c.line === 'Re-home local delivery')).toMatchObject({ amount: 21, stream: 'router' })
  })

  it('the new order delivered books ₹145 and closes the original as re-homed', () => {
    const s = deliverOrder(matched, newId, '9090')
    expect(s.stops[bonusId].status).toBe('rehomed')
    expect(eventsOf(s, 'REHOME_DELIVERED')).toHaveLength(1)
    expect(savingsLedger(s).total).toBe(145)
  })

  it('variant: the new order fails, the original is batched, and NO saving is booked', () => {
    const failed = run(
      matched,
      { type: 'riderAttempt', at: AT + 5, orderId: newId, claim: 'customer_unavailable' },
      { type: 'reattempt', at: AT + 6, orderId: newId },
      { type: 'riderAttempt', at: AT + 7, orderId: newId, claim: 'customer_unavailable' },
      { type: 'reattempt', at: AT + 8, orderId: newId },
    )
    expect(failed.stops[newId].status).toBe('rto')
    expect(failed.stops[bonusId].status).toBe('rto')
    expect(failed.parcels[0].state).toBe('batched')
    expect(eventsOf(failed, 'REHOME_FAILED')).toHaveLength(1)
    expect(savingsLedger(failed).lines.some((l) => l.line.startsWith('Re-home'))).toBe(false)
  })

  it('variant: the new buyer refuses on the doorstep: same outcome, and the parcel never returns to the queue', () => {
    const failed = refuseOrder(matched, newId, AT + 9)
    expect(failed.stops[bonusId].status).toBe('rto')
    expect(failed.parcels).toHaveLength(1)
    expect(failed.parcels[0].state).toBe('batched')
  })
})

describe('scenario 9: a hold with no match after 48 hours goes back in a batched return', () => {
  const hard = inspectParcel(forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: 0.2 }), bonusId)
  const pid = hard.parcels[0].id
  // Nobody comes: the shelf timer is what matters, so force "no buyer within the window".
  const held: DayState = (() => {
    const h = run(hard, { type: 'deskHold', at: AT + 2, parcelId: pid })
    return { ...h, parcels: h.parcels.map((p) => ({ ...p, matchAt: undefined })) }
  })()

  it('is still on the shelf at 47 hours', () => {
    expect(advanceHours(held, 47).parcels[0].state).toBe('held')
  })

  it('expires at 48 hours: batched, the original is an RTO, and only the batched saving books', () => {
    const s = advanceHours(held, 48)
    expect(s.parcels[0].state).toBe('batched')
    expect(s.stops[bonusId].status).toBe('rto')
    expect(eventsOf(s, 'HOLD_EXPIRED')).toHaveLength(1)
    expect(eventsOf(s, 'BATCHED')).toHaveLength(1)
    expect(costLedger(s).find((c) => c.line === 'RTO reverse')).toMatchObject({ amount: 84, owner: 'Valmo', stream: 'common' })
    expect(savingsLedger(s).lines.map((l) => l.line)).toEqual(['Batched return'])
    expect(savingsLedger(s).total).toBeCloseTo(36, 6)
  })

  it('a buyer that turns up before the shelf timer ends matches on the clock', () => {
    const early: DayState = { ...held, parcels: held.parcels.map((p) => ({ ...p, matchAt: p.heldSim! + 5 * HOUR_MS })) }
    const s = advanceHours(early, 6)
    expect(s.parcels[0].state).toBe('rehomed')
    expect(eventsOf(s, 'MATCHED')).toHaveLength(1)
  })
})

describe('scenario 10: a seller that has not opted in can never be forced into the hold lane', () => {
  const base = inspectParcel(forceParcel(refuseOrder(day, bonusId), bonusId, { reason: 'not_ordered', sellerState: day.hub.state, sellerGst: false, unopened: true, sealOk: true, sellerOptedIn: false, invoiceOutside: true, demandRate: 0.3 }), bonusId)
  const pid = base.parcels[0].id

  it('the Router sends it to a consolidated return and the hold action is refused', () => {
    expect(deskItems(base)[0].decision.lane).toBe('consolidated_return')
    expect(reduce(base, { type: 'deskHold', at: AT + 2, parcelId: pid })).toBe(base)
  })

  it('the opt-in cannot be toggled from the Desk, even by a crafted action', () => {
    const forged = reduce(base, { type: 'deskSetGate', at: AT + 2, parcelId: pid, gate: 'sellerOptedIn', value: true } as never)
    expect(forged).toBe(base)
    expect(deskItems(forged)[0].decision.lane).toBe('consolidated_return')
  })

  it('the other three gates are only a what-if: flipping one previews the lane and never touches the parcel', () => {
    const optedIn = forceParcel(base, bonusId, { sellerOptedIn: true })
    expect(deskItems(optedIn)[0].decision.lane).toBe('hold_rehome')
    const r = whatIf(optedIn.parcels[0].parcel, { sealOk: false }, deskItems(optedIn)[0].options)
    expect(r.before.lane).toBe('hold_rehome')
    expect(r.after.lane).toBe('consolidated_return')
    expect(optedIn.parcels[0].parcel.sealOk).toBe(true)
    expect(reduce(optedIn, { type: 'deskSetGate', at: AT + 2, parcelId: pid, gate: 'sealOk', value: false } as never)).toBe(optedIn)
  })
})

describe('scenario 11: a return inside the window claws the bonus back', () => {
  const prepaid = setPayment(day, bonusId, 'PREPAID')
  const delivered = deliverOrder(prepaid, bonusId)

  it('a return opened on day 3 claws back the pending bonus, and it is never released', () => {
    const s = run(advanceHours(delivered, 3 * 24), { type: 'openReturn', at: AT + 900, orderId: bonusId })
    expect(ledgerOf(s, bonusId)[0].status).toBe('clawed_back')
    expect(eventsOf(s, 'BONUS_CLAWED_BACK', bonusId)).toHaveLength(1)
    expect(eventsOf(s, 'RETURN_OPENED', bonusId)).toHaveLength(1)
    const later = advanceHours(s, 10 * 24)
    expect(ledgerOf(later, bonusId)[0].status).toBe('clawed_back')
    expect(ledgerTotals(later)).toMatchObject({ clawedBack: 15, released: 0 })
  })

  it('a COD bonus that is still accrued is clawed back too', () => {
    const cod = deliverOrder(setPayment(day, bonusId, 'COD'), bonusId)
    const s = run(cod, { type: 'openReturn', at: AT + 900, orderId: bonusId })
    expect(ledgerOf(s, bonusId)[0].status).toBe('clawed_back')
  })

  it('a return after the window has closed does not touch a released bonus', () => {
    const released = advanceHours(delivered, 8 * 24)
    const s = run(released, { type: 'openReturn', at: AT + 900, orderId: bonusId })
    expect(ledgerOf(s, bonusId)[0].status).toBe('released')
    expect(eventsOf(s, 'BONUS_CLAWED_BACK')).toHaveLength(0)
  })

  it('only a delivered order can be returned, and only once', () => {
    expect(reduce(day, { type: 'openReturn', at: AT, orderId: bonusId })).toBe(day)
    const s = run(delivered, { type: 'openReturn', at: AT + 900, orderId: bonusId })
    expect(reduce(s, { type: 'openReturn', at: AT + 901, orderId: bonusId })).toBe(s)
  })
})

describe('scenario 12: a failed Pay-now leaves the order on COD', () => {
  const codId = day.stopOrder.find((id) => day.stops[id].flagged && day.stops[id].order.payment === 'COD')!
  const asked = run(day, { type: 'customerReply', at: AT, orderId: codId, reply: 'pay_now' })

  it('tapping Pay now changes nothing until a payment is attempted', () => {
    expect(asked.stops[codId].order.payment).toBe('COD')
    expect(asked.stops[codId].pRto).toBe(day.stops[codId].pRto)
    expect(asked.stops[codId].paymentPending).toBe(true)
  })

  it('a failed payment stays COD and does not change the RTO chance', () => {
    const s = run(asked, { type: 'customerPayment', at: AT + 1, orderId: codId, ok: false })
    expect(s.stops[codId].order.payment).toBe('COD')
    expect(s.stops[codId].pRto).toBe(day.stops[codId].pRto)
    expect(eventsOf(s, 'PAYMENT_ATTEMPTED', codId)[0].data).toMatchObject({ ok: false })
  })

  it('a successful payment makes it prepaid and halves the RTO chance', () => {
    const s = run(asked, { type: 'customerPayment', at: AT + 1, orderId: codId, ok: true })
    expect(s.stops[codId].order.payment).toBe('PREPAID')
    expect(s.stops[codId].pRto).toBeCloseTo(day.stops[codId].pRto * 0.5, 9)
  })

  it('a payment can only be attempted after tapping Pay now, and only once', () => {
    expect(reduce(day, { type: 'customerPayment', at: AT, orderId: codId, ok: true })).toBe(day)
    const s = run(asked, { type: 'customerPayment', at: AT + 1, orderId: codId, ok: false })
    expect(reduce(s, { type: 'customerPayment', at: AT + 2, orderId: codId, ok: true })).toBe(s)
  })
})

describe('the Audit is green after a full Autopilot day and Close pilot', () => {
  const full = reduce(createDay(fakeGeo(0, 1), { seed: 21, orders: 300, riders: 12 }), { type: 'startDay', at: AT })
  const closed = reduce(full, { type: 'closePilot', at: AT + 10 })

  it('every check passes', () => {
    const checks = runAudit(closed)
    expect(checks).toHaveLength(14)
    const red = checks.filter((c) => !c.ok)
    expect(red.map((c) => `${c.id}: ${c.detail}`)).toEqual([])
  })

  it('Close pilot works every open order, so most of the day has a final outcome', () => {
    const k = kpis(closed)
    expect(k.terminal / k.orders).toBeGreaterThan(0.9)
    expect(closed.simNow).toBeGreaterThan(full.simNow + 7 * DAY_MS)
  })

  it('the verdict is decision-grade (no longer INCOMPLETE) after Close pilot', async () => {
    const { dayVerdict } = await import('./verdictData.ts')
    expect(dayVerdict(closed).verdict).not.toBe('INCOMPLETE')
  })

  it('the ledger reconciles with the events, and every bonus is on a flagged Bonus-arm order', () => {
    const totals = ledgerTotals(closed)
    const fromEvents = closed.events.filter((e) => e.type === 'BONUS_RELEASED').reduce((t: number, e) => t + Number(e.data.amount), 0)
    expect(totals.released).toBe(fromEvents)
    expect(totals.released).toBeGreaterThan(0)
  })
})
