import type { ParcelRecord } from '../../domain/types.ts'
import type { Rider } from '../../engine/types.ts'
import type { ReturnBatch } from '../../engine/router.ts'
import { ROUTER, routerBreakEven } from '../../engine/economics.ts'
import { pct, rupees } from '../../ui/format.ts'
import { outcomeText } from './lanes.ts'

export interface DoneEntry {
  readonly record: ParcelRecord
  readonly rider: Rider | undefined
}

export function DoneList({ entries }: { readonly entries: readonly DoneEntry[] }) {
  return (
    <section className="card desk-panel" aria-label="Done today">
      <h3>Done today ({entries.length})</h3>
      {entries.length === 0 ? (
        <p className="desk-empty-line">Nothing finished yet.</p>
      ) : (
        <ul className="desk-done">
          {entries.map(({ record, rider }) => (
            <li key={record.id}>
              <strong>{record.parcel.awb}</strong>
              <span>{outcomeText(record, rider?.name)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function BatchList({ batches }: { readonly batches: readonly ReturnBatch[] }) {
  return (
    <section className="card desk-panel" aria-label="Consolidated return batches by seller">
      <h3>Consolidated return batches by seller</h3>
      {batches.length === 0 ? (
        <p className="desk-empty-line">No parcels are heading back yet.</p>
      ) : (
        <ul className="desk-batches">
          {batches.map((b) => (
            <li key={b.sellerId}>
              <span>{b.sellerId}</span>
              <strong>
                {b.parcelIds.length} parcel{b.parcelIds.length === 1 ? '' : 's'}, one return
              </strong>
            </li>
          ))}
        </ul>
      )}
      <small>Batching benchmark is up to 20-40% off the reverse cost. To be measured in the pilot.</small>
    </section>
  )
}

export function LaneFour() {
  return (
    <section className="card desk-panel desk-lane4" aria-label="Lane 4, not built">
      <h3>
        Lane 4 · Local donation or destruction <span className="pill">Not built</span>
      </h3>
      <p>Later, pending legal review (GST s.17(5)(h), local sale re-triggers GST).</p>
    </section>
  )
}

export function EconomicsNote() {
  return (
    <p className="desk-econ">
      Hold &amp; Re-home break-even is a <strong>{pct(routerBreakEven())} match rate</strong>: {rupees(ROUTER.holdCost)} to hold for 48h,{' '}
      {rupees(ROUTER.savedPerMatch)} saved on each match. Lanes 1 and 3 apply to every refused parcel, so the Router pays even if
      the match rate is low.
    </p>
  )
}
