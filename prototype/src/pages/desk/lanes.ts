import { ROUTER } from '../../engine/economics.ts'
import type { Gate as GateResult, Lane } from '../../engine/router.ts'
import type { Gate as GateKey, ParcelRecord, ParcelState } from '../../domain/types.ts'
import { rupees, signedRupees } from '../../ui/format.ts'

export const LANE_LABEL: Readonly<Record<Lane, string>> = {
  second_chance: 'Second chance',
  hold_rehome: 'Hold & Re-home',
  consolidated_return: 'Consolidated return',
}

export const STATE_LABEL: Readonly<Record<ParcelState, string>> = {
  queued: 'Queued',
  second_chance_sent: 'Waiting for the customer',
  held: 'On the shelf',
  recovered: 'Sale saved',
  rehomed: 'Re-homed',
  batched: 'In consolidated return',
}

/** Gates the operator can flip in the demo. The state check, the seller's opt-in (only the seller decides), shelf, bag and expected value are facts, so they are not here. */
export function toggleableGate(gate: GateResult): GateKey | null {
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

export const isDone = (state: ParcelState): boolean => state === 'recovered' || state === 'rehomed' || state === 'batched'

export const effectRange = (min: number, max: number): string => `${signedRupees(min)} to ${signedRupees(max)}`

/** What happened to a finished parcel, in one line. Net figures use the deck's per-parcel numbers. */
export function outcomeText(record: ParcelRecord, riderName: string | undefined): string {
  switch (record.state) {
    case 'recovered':
      return `Customer accepted the second chance: back in the bag as attempt 2. The ${rupees(120)} return is avoided, for a ${rupees(ROUTER.reAttemptCost)} re-attempt, only once it is delivered.`
    case 'rehomed':
      return `Re-homed to a nearby buyer as new AWB ${record.newAwb ?? ''} in ${riderName ?? 'a rider'}'s bag. The ${rupees(ROUTER.savedPerMatch)} saving books only when the new order is delivered; ${rupees(ROUTER.holdCost)} of holding is already booked.`
    case 'batched':
      return `Added to the consolidated return for seller ${record.parcel.sellerId}.`
    default:
      return STATE_LABEL[record.state]
  }
}
