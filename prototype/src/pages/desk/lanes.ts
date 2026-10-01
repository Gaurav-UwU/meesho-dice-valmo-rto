import { ROUTER } from '../../engine/economics.ts'
import { LANE_LABEL, type Gate as GateResult } from '../../engine/router.ts'
import type { WhatIfGate } from '../../engine/whatif.ts'
import type { ParcelRecord, ParcelState } from '../../domain/types.ts'
import { rupees, signedRupees } from '../../ui/format.ts'

export { LANE_LABEL }

export const STATE_LABEL: Readonly<Record<ParcelState, string>> = {
  queued: 'Queued',
  second_chance_sent: 'Waiting for the customer',
  held: 'On the shelf',
  pickup_reserved: 'Waiting for pickup',
  picked_up: 'Collected at hub',
  recovered: 'Sale saved',
  rehomed: 'Re-homed',
  batched: 'In consolidated return',
}

/** Gates the operator can flip in the demo. The state check, the seller's opt-in (only the seller decides), shelf, bag and expected value are facts, so they are not here. */
export function toggleableGate(gate: GateResult): WhatIfGate | null {
  switch (gate.name) {
    case 'Unopened':
      return 'unopened'
    case 'Seal intact':
      return 'sealOk'
    case 'Invoice outside the parcel':
      return 'invoiceOutside'
    default:
      return null
  }
}

/** The hold part of a card's expected-value line: the rupees, or exactly what is in the way (a gate, the forecast, or both). */
export function holdEvText(h: { readonly hold: number | null; readonly others: readonly string[]; readonly forecastCloses: boolean }): string {
  if (h.hold !== null) return signedRupees(h.hold)
  const gates = h.others.length > 0 ? `blocked by ${h.others.join(', ')}` : ''
  if (h.forecastCloses) return gates ? `${gates}, and the forecast low end is under break-even` : 'closed: the forecast low end is under break-even'
  return gates || 'not available'
}

export const isDone = (state: ParcelState): boolean => state === 'recovered' || state === 'picked_up' || state === 'rehomed' || state === 'batched'

export const effectRange = (min: number, max: number): string => `${signedRupees(min)} to ${signedRupees(max)}`

/** What happened to a finished parcel, in one line. Net figures use the deck's per-parcel numbers. */
export function outcomeText(record: ParcelRecord, riderName: string | undefined): string {
  switch (record.state) {
    case 'recovered':
      return `Customer accepted the second chance: back in the bag as attempt 2. The ${rupees(120)} return is avoided, for a ${rupees(ROUTER.reAttemptCost)} re-attempt, only once it is delivered.`
    case 'picked_up':
      return `Collected at the hub with a verified code: the sale is kept and the ${rupees(120)} return is avoided (net ${rupees(120 - ROUTER.holdCost)} after the ${rupees(ROUTER.holdCost)} shelf slot). It stays the rider's failed attempt in the pilot and pays no bonus.`
    case 'rehomed':
      return `Re-homed to a nearby buyer as new AWB ${record.newAwb ?? ''} in ${riderName ?? 'a rider'}'s bag. The ${rupees(ROUTER.savedPerMatch)} saving books only when the new order is delivered; ${rupees(ROUTER.holdCost)} of holding is already booked.`
    case 'batched':
      return `Added to the consolidated return for seller ${record.parcel.sellerId}.`
    default:
      return STATE_LABEL[record.state]
  }
}
