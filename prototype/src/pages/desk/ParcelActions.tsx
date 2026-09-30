import { Link } from 'react-router-dom'
import { HOUR_MS } from '../../domain/clock.ts'
import type { ParcelRecord } from '../../domain/types.ts'
import type { Lane } from '../../engine/router.ts'
import type { HubId } from '../../engine/types.ts'

interface ParcelActionsProps {
  readonly record: ParcelRecord
  readonly lane: Lane
  readonly hubId: HubId
  readonly simNow: number
  readonly secondChanceHours: number
  readonly holdHours: number
  readonly onSecondChance: () => void
  readonly onHold: () => void
  readonly onMatch: () => void
  readonly onConsolidate: () => void
}

const hoursLeft = (until: number, simNow: number): number => Math.max(0, Math.ceil((until - simNow) / HOUR_MS))

export function ParcelActions({ record, lane, hubId, simNow, secondChanceHours, holdHours, onSecondChance, onHold, onMatch, onConsolidate }: ParcelActionsProps) {
  if (record.state === 'second_chance_sent') {
    return (
      <div className="desk-actions">
        <p className="desk-wait" role="status">
          Waiting for the customer, {hoursLeft((record.secondChanceSentSim ?? simNow) + secondChanceHours * HOUR_MS, simNow)} h left. They answer on the{' '}
          <Link to={`/customer?hub=${hubId}`}>customer panel</Link>; if they decline, or say nothing, the parcel comes back to this queue re-routed.
        </p>
      </div>
    )
  }
  if (record.state === 'held') {
    return (
      <div className="desk-actions">
        <button type="button" className="btn primary" onClick={onMatch}>
          Simulate a buyer now (demo) → new AWB
        </button>
        <span className="desk-hint">
          On the hub shelf, {hoursLeft((record.heldSim ?? simNow) + holdHours * HOUR_MS, simNow)} h left of {holdHours}. A buyer may appear on the sim clock; if none does, it goes back in a batched return. The saving books only when the new order is delivered.
        </span>
      </div>
    )
  }
  if (lane === 'second_chance') {
    return (
      <div className="desk-actions">
        <button type="button" className="btn primary" onClick={onSecondChance}>
          Send second-chance WhatsApp
        </button>
      </div>
    )
  }
  if (lane === 'hold_rehome') {
    return (
      <div className="desk-actions">
        <button type="button" className="btn primary" onClick={onHold}>
          Hold {holdHours}h
        </button>
        <span className="desk-hint">Then match to a nearby buyer for the same seller and SKU.</span>
      </div>
    )
  }
  return (
    <div className="desk-actions">
      <button type="button" className="btn primary" onClick={onConsolidate}>
        Add to consolidated return
      </button>
    </div>
  )
}
