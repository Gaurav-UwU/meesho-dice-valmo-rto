import { useState } from 'react'
import { clockText } from '../../domain/clock.ts'
import type { ParcelRecord } from '../../domain/types.ts'
import type { ActionInput } from '../../store/types.ts'

interface InspectBlockProps {
  readonly record: ParcelRecord
  readonly send: (input: ActionInput) => Promise<void>
}

const seen = (i: NonNullable<ParcelRecord['inspection']>): string =>
  [i.unopened ? 'unopened' : 'opened', i.sealOk ? 'seal intact' : 'seal broken', i.invoiceOutside ? 'invoice outside' : 'invoice inside'].join(', ')

/**
 * Inspect parcel: what the hub operator finds with the parcel in their hands. Required before Hold & Re-home only.
 * The boxes start at what this synthetic parcel really is (a demo shortcut); the operator ticks what they actually see.
 * The photo is a note: nothing is uploaded.
 */
export function InspectBlock({ record, send }: InspectBlockProps) {
  const { parcel, inspection } = record
  const queued = record.state === 'queued'
  const [editing, setEditing] = useState(false)
  const [facts, setFacts] = useState({ unopened: inspection?.unopened ?? parcel.unopened, sealOk: inspection?.sealOk ?? parcel.sealOk, invoiceOutside: inspection?.invoiceOutside ?? parcel.invoiceOutside })
  const [note, setNote] = useState(inspection?.photoNote ?? '')

  const record_ = async (): Promise<void> => {
    await send({ type: 'deskInspect', parcelId: record.id, ...facts, photoNote: note })
    setEditing(false)
  }

  if (inspection && !editing) {
    return (
      <div className="desk-inspect is-done">
        <p>
          <strong>Inspected by {inspection.by}</strong> · {clockText(inspection.at)} · {seen(inspection)}
          {inspection.photoNote !== '' ? ` · photo: ${inspection.photoNote}` : ''} <span className="desk-hint">(a note only: nothing is uploaded)</span>
        </p>
        {queued ? (
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            Change inspection
          </button>
        ) : null}
      </div>
    )
  }
  if (!queued) return null
  return (
    <fieldset className="desk-inspect" aria-label="Inspect parcel">
      <legend>Inspect parcel</legend>
      <p className="desk-hint">
        Required before Hold &amp; Re-home only. Inspect the parcel to unlock Hold &amp; Re-home; a second chance or a consolidated return does not need it.
        The boxes start at what this synthetic parcel really is: tick what you actually see.
      </p>
      <div className="desk-inspect-row">
        <label>
          <input type="checkbox" checked={facts.unopened} onChange={(e) => setFacts({ ...facts, unopened: e.target.checked })} /> Unopened
        </label>
        <label>
          <input type="checkbox" checked={facts.sealOk} onChange={(e) => setFacts({ ...facts, sealOk: e.target.checked })} /> Seal intact
        </label>
        <label>
          <input type="checkbox" checked={facts.invoiceOutside} onChange={(e) => setFacts({ ...facts, invoiceOutside: e.target.checked })} /> Invoice outside the parcel
        </label>
      </div>
      <label className="desk-inspect-note">
        <span>Photo note (placeholder, nothing is uploaded)</span>
        <input type="text" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. sealed, label outside" />
      </label>
      <button type="button" className="btn primary" onClick={() => void record_()}>
        Record inspection
      </button>
    </fieldset>
  )
}
