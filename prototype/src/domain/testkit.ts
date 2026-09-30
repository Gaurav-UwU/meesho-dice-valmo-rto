import { fakeGeo } from '../engine/testkit.ts'
import { createDay } from './day.ts'
import { reduce } from './reducer.ts'
import { demoRiders } from './selectors.ts'
import type { RefusedParcel } from '../engine/router.ts'
import type { Payment } from '../engine/types.ts'
import type { Action, DayState } from './types.ts'

export const AT = 1_000_000

/** A small started day: 120 orders, 6 riders, Powai. */
export function startedDay(seed = 11): DayState {
  const day = createDay(fakeGeo(0, 1), { seed, orders: 120, riders: 6 })
  return reduce(day, { type: 'startDay', at: AT })
}

export const run = (s: DayState, ...actions: readonly Action[]): DayState => actions.reduce(reduce, s)

/** First flagged, manual (demo) stop of the Bonus demo rider, and of the Control demo rider. */
export function heroStops(s: DayState): { readonly bonus: string; readonly control: string } {
  const { bonus, control } = demoRiders(s)
  const pick = (riderId: string | undefined): string => {
    const id = s.stopOrder.find((sid) => s.stops[sid].riderId === riderId && s.stops[sid].flagged && s.stops[sid].manual)
    if (!id) throw new Error('no hero stop')
    return id
  }
  return { bonus: pick(bonus?.id), control: pick(control?.id) }
}

/** Move the sim clock on by whole hours and fire every timer that is due. */
export const advanceHours = (s: DayState, hours: number): DayState => reduce(s, { type: 'advanceClock', at: AT + 5000, minutes: hours * 60 })

/** Rider asks for the OTP, the customer reads it out, the rider submits it. */
export const deliverOrder = (s: DayState, id: string, code = '4321', at = AT + 100): DayState =>
  run(s, { type: 'riderDeliver', at, orderId: id, code }, { type: 'submitOtp', at: at + 1, orderId: id, code })

/** The customer refuses on the doorstep: refusal OTP asked and verified. */
export const refuseOrder = (s: DayState, id: string, at = AT + 100): DayState =>
  run(s, { type: 'riderRefuse', at, orderId: id, code: '7777' }, { type: 'submitOtp', at: at + 1, orderId: id, code: '7777' })

export const setPayment = (s: DayState, id: string, payment: Payment): DayState => ({
  ...s,
  stops: { ...s.stops, [id]: { ...s.stops[id], order: { ...s.stops[id].order, payment } } },
})

/** Change what the Desk sees about the parcel of a refused order (reason, gates, demand). */
export const forceParcel = (s: DayState, orderId: string, patch: Partial<RefusedParcel>): DayState => ({
  ...s,
  parcels: s.parcels.map((p) => (p.orderId === orderId ? { ...p, parcel: { ...p.parcel, ...patch } } : p)),
})

/** The hub operator inspects the parcel of a refused order and records what is really there (by default the parcel's own seeded facts). */
export function inspectParcel(s: DayState, orderId: string, found: { unopened?: boolean; sealOk?: boolean; invoiceOutside?: boolean; photoNote?: string } = {}, at = AT + 1): DayState {
  const rec = s.parcels.find((p) => p.orderId === orderId)
  if (!rec) throw new Error(`no parcel for ${orderId}`)
  const { unopened, sealOk, invoiceOutside } = rec.parcel
  return reduce(s, { type: 'deskInspect', at, parcelId: rec.id, unopened, sealOk, invoiceOutside, ...found })
}
