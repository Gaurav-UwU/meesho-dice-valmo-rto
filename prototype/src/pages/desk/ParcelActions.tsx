import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HOUR_MS } from '../../domain/clock.ts'
import { MAX_PICKUP_TRIES } from '../../domain/secondChance.ts'
import type { ParcelRecord } from '../../domain/types.ts'
import type { Lane, SkipReason } from '../../engine/router.ts'
import type { HubId } from '../../engine/types.ts'
import { SkipSecondChance } from './SkipSecondChance.tsx'

interface ParcelActionsProps {
  readonly record: ParcelRecord
  readonly lane: Lane
  readonly hubId: HubId
  readonly simNow: number
  readonly secondChanceHours: number
  readonly holdHours: number
  readonly pickupHours: number
  readonly payment: 'COD' | 'PREPAID'
  readonly onHandover: (code: string, cashCollected: boolean) => void
  readonly onSecondChance: () => void
  readonly onHold: () => void
  readonly onMatch: () => void
  readonly onConsolidate: () => void
  readonly onSkip: (reason: SkipReason) => void
}

const hoursLeft = (until: number, simNow: number): number => Math.max(0, Math.ceil((until - simNow) / HOUR_MS))

export function ParcelActions({ record, lane, hubId, simNow, secondChanceHours, holdHours, pickupHours, payment, onHandover, onSecondChance, onHold, onMatch, onConsolidate, onSkip }: ParcelActionsProps) {
  if (record.state === 'pickup_reserved' && record.pickup) {
    return <Handover record={record} left={hoursLeft(record.pickup.deadline, simNow)} pickupHours={pickupHours} cod={payment === 'COD'} onHandover={onHandover} />
  }
  if (record.state === 'second_chance_sent') {
    const doing = record.awaiting === 'when' ? 'The customer is choosing a day (Different time). ' : record.awaiting === 'pay' ? 'The customer is paying by UPI. ' : ''
    return (
      <div className="desk-actions">
        <p className="desk-wait" role="status">
          {doing}Waiting for the customer, {hoursLeft((record.secondChanceSentSim ?? simNow) + secondChanceHours * HOUR_MS, simNow)} h left. They answer on the{' '}
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
        <SkipSecondChance onSkip={onSkip} />
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

interface HandoverProps {
  readonly record: ParcelRecord
  readonly left: number
  readonly pickupHours: number
  readonly cod: boolean
  readonly onHandover: (code: string, cashCollected: boolean) => void
}

/** The customer is at the counter: the operator types the code the customer shows. The code is never shown on the Desk. */
function Handover({ record, left, pickupHours, cod, onHandover }: HandoverProps) {
  const [code, setCode] = useState('')
  const [cash, setCash] = useState(false)
  const tries = record.pickup?.tries ?? 0
  const locked = tries >= MAX_PICKUP_TRIES
  return (
    <div className="desk-actions desk-handover">
      <p className="desk-wait" role="status">
        Waiting for pickup: {left} h left of {pickupHours}. The customer has the code on WhatsApp; if they do not come, the parcel goes back in a batched return and the shelf slot
        is freed. The shelf slot is shared with Hold.
      </p>
      <label className="desk-handover-code">
        <span>Pickup code from the customer</span>
        <input type="text" inputMode="numeric" maxLength={4} value={code} disabled={locked} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
      </label>
      {cod ? (
        <label className="desk-handover-cash">
          <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} /> <span>Cash collected at the hub</span>
        </label>
      ) : null}
      <button type="button" className="btn primary" disabled={locked || code.length !== 4} onClick={() => onHandover(code, cash)}>
        Customer collected
      </button>
      {tries > 0 ? (
        <p role="status" className="desk-danger">
          {locked ? `Wrong code: ${tries} of ${MAX_PICKUP_TRIES} tries used. Locked.` : `Wrong code: ${tries} of ${MAX_PICKUP_TRIES} tries used`}
        </p>
      ) : null}
    </div>
  )
}
