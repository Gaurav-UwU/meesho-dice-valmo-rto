import type { DeskItem } from '../../domain/selectors.ts'
import type { Gate as GateKey } from '../../domain/types.ts'
import type { ActionInput } from '../../store/types.ts'
import { REFUSAL_LABEL } from '../../engine/router.ts'
import { rupees, signedRupees } from '../../ui/format.ts'
import { GateList } from './GateList.tsx'
import { effectRange, LANE_LABEL, STATE_LABEL } from './lanes.ts'
import { ParcelActions } from './ParcelActions.tsx'

interface ParcelCardProps {
  readonly item: DeskItem
  /** Sim time, for the countdowns */
  readonly simNow: number
  readonly secondChanceHours: number
  readonly holdHours: number
  readonly send: (input: ActionInput) => Promise<void>
}

export function ParcelCard({ item, send, simNow, secondChanceHours, holdHours }: ParcelCardProps) {
  const { record, decision } = item
  const { parcel } = record
  const parcelId = record.id
  const editable = record.state === 'queued'
  const sameState = parcel.sellerState === parcel.hubState && parcel.buyerState === parcel.hubState

  return (
    <article className={`card desk-card desk-card--${decision.lane}`} aria-label={`Refused parcel ${parcel.awb}`}>
      <header className="desk-card-head">
        <div>
          <h3 className="desk-awb">{parcel.awb}</h3>
          <p className="desk-sub">
            {rupees(parcel.value)} · {REFUSAL_LABEL[parcel.reason]} · {parcel.skuId} · seller {parcel.sellerId}
          </p>
        </div>
        <div className="desk-chips">
          <span className={`desk-lane desk-lane--${decision.lane}`}>{LANE_LABEL[decision.lane]}</span>
          <span className="pill status">{STATE_LABEL[record.state]}</span>
        </div>
      </header>

      <div className="desk-chips desk-chips--row">
        <span className="pill tag">Hub {parcel.hubState}</span>
        <span className={sameState ? 'pill tag' : 'pill danger'}>Seller {parcel.sellerState}</span>
        <span className={parcel.buyerState === parcel.hubState ? 'pill tag' : 'pill danger'}>Buyer {parcel.buyerState}</span>
        {parcel.sellerGst ? (
          <span className="pill">Registered seller</span>
        ) : (
          <span className="pill bonus">Non-GST seller · same state by law</span>
        )}
      </div>

      {record.secondChanceDeclined ? (
        <p className="desk-note">The customer declined the second chance, so this parcel was re-routed.</p>
      ) : null}
      <p className="desk-reason">{decision.reason}</p>

      <p className="desk-ev" aria-label="Expected values of each lane">
        Expected value: second chance <strong>{signedRupees(decision.ev.secondChance)}</strong> ({(decision.inputs.pAccept * 100).toFixed(0)}% accept) · hold{' '}
        <strong>{decision.ev.hold === null ? 'not allowed' : signedRupees(decision.ev.hold)}</strong> ({(decision.inputs.pMatch * 100).toFixed(0)}% chance of a buyer in {holdHours} h) ·
        batched <strong>{signedRupees(decision.ev.consolidated)}</strong>
      </p>
      <p className="desk-effect">
        <strong>{effectRange(decision.effect.min, decision.effect.max)}</strong> vs sending it back
        <span>{decision.effect.label}</span>
      </p>

      <GateList
        gates={decision.gates}
        editable={editable}
        onToggle={(gate: GateKey, value: boolean) => void send({ type: 'deskSetGate', parcelId, gate, value })}
      />

      <ParcelActions
        record={record}
        lane={decision.lane}
        hubId={parcel.hubId}
        simNow={simNow}
        secondChanceHours={secondChanceHours}
        holdHours={holdHours}
        onSecondChance={() => void send({ type: 'deskSecondChance', parcelId })}
        onHold={() => void send({ type: 'deskHold', parcelId })}
        onMatch={() => void send({ type: 'deskMatch', parcelId })}
        onConsolidate={() => void send({ type: 'deskConsolidate', parcelId })}
      />
    </article>
  )
}
