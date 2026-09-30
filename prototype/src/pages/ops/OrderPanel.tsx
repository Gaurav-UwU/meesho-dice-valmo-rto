import { isDelivered } from '../../domain/lifecycle.ts'
import type { DayState, StopRecord } from '../../domain/types.ts'
import { messagesFor, scoreAccuracy } from '../../domain/selectors.ts'
import { explainScore } from '../../engine/rescue.ts'
import { useSend } from '../../store/StoreContext.tsx'
import { rupees } from '../../ui/format.ts'
import { areaLabel, REPLY_LABEL, riderNameOf, STATUS_LABEL } from './model.ts'
import { ScoreBars } from './ScoreBars.tsx'

const statusTone = (x: StopRecord): string =>
  isDelivered(x.status) ? 'is-green' : x.status === 'ndr' ? 'is-amber' : x.status === 'refused' || x.status === 'rto' ? 'is-red' : ''

interface OrderPanelProps {
  readonly state: DayState
  readonly selectedId: string | null
  readonly ranks: ReadonlyMap<string, number>
  readonly flaggedIds: readonly string[]
  readonly onSelect: (id: string | null) => void
}

function RankMeter({ rank, total, flagged }: { readonly rank: number; readonly total: number; readonly flagged: boolean }) {
  const top = Math.max(1, Math.ceil((rank / total) * 100))
  return (
    <div className="ops-rank">
      <p>
        Rescue rank <strong>#{rank}</strong> of {total} · <strong>top {top}%</strong> riskiest today
        {flagged ? ' · Bonus-Eligible' : ''}
      </p>
      <div className="ops-rank-track" role="img" aria-label={`Ranked ${rank} of ${total}. The top 20% are Bonus-Eligible.`}>
        <span className="ops-rank-cut" />
        <span className="ops-rank-dot" style={{ left: `${(rank / total) * 100}%` }} />
      </div>
      <div className="ops-rank-ends" aria-hidden="true">
        <span>riskiest</span>
        <span>20% cut-off</span>
        <span>least risky</span>
      </div>
    </div>
  )
}

/** How well the score picks failures, in simulation only: the generator builds failures from the same factors the score uses, so this flatters it. */
function ScoreAccuracyNote({ state }: { readonly state: DayState }) {
  const a = scoreAccuracy(state)
  const pct = (x: number): number => Math.round(x * 100)
  return (
    <p className="ops-note">
      Score accuracy (simulation): the top {pct(a.flaggedShare)}% by score catch {pct(a.catchShare)}% of failures; random would catch {pct(a.randomShare)}%. To be measured on Valmo's last 90 days.
    </p>
  )
}

export function OrderPanel({ state, selectedId, ranks, flaggedIds, onSelect }: OrderPanelProps) {
  const stop = selectedId ? state.stops[selectedId] : undefined
  const rider = stop ? state.riders.find((r) => r.id === stop.riderId) : undefined
  const messages = stop ? messagesFor(state, stop.order.id).length : 0
  const send = useSend(state.hub.id)
  const entries = stop ? state.ledger.filter((l) => l.orderId === stop.order.id) : []
  return (
    <section className="ops-card ops-panel" aria-label="Order detail">
      <div className="ops-card-head">
        <h2>Order detail</h2>
        {flaggedIds.length > 0 ? (
          <label className="ops-jump">
            <span className="sr-only">Jump to a Bonus-Eligible order</span>
            <select value={selectedId ?? ''} onChange={(e) => onSelect(e.target.value || null)}>
              <option value="">Jump to a Bonus-Eligible order…</option>
              {flaggedIds.map((id) => (
                <option key={id} value={id}>
                  {state.stops[id].order.awb}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {!stop ? (
        <p className="ops-empty">Click a dot on the map, or pick an order, to see why it was flagged.</p>
      ) : (
        <>
          <div className="ops-panel-title">
            <strong className="ops-awb">{stop.order.awb}</strong>
            {stop.flagged ? <span className="ops-chip is-purple">Bonus-Eligible</span> : null}
            <span className={`ops-chip ${statusTone(stop)}`}>{STATUS_LABEL[stop.status]}</span>
          </div>
          <dl className="ops-facts">
            <div>
              <dt>Area</dt>
              <dd>{areaLabel(stop.order)}</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>{stop.order.distanceKm.toFixed(1)} km from hub</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>
                {stop.order.payment === 'COD' ? 'Cash on delivery' : 'Prepaid'} · {rupees(stop.order.value)}
              </dd>
            </div>
            <div>
              <dt>Rider</dt>
              <dd>
                {riderNameOf(state, stop.riderId)}
                {rider ? <span className={`ops-chip ${rider.arm === 'bonus' ? 'is-green' : ''}`}>{rider.arm === 'bonus' ? 'Bonus' : 'Control'}</span> : null}
                {' · stop '}
                {stop.seq}
              </dd>
            </div>
            <div>
              <dt>WhatsApp replies</dt>
              <dd>
                {stop.replies.length === 0 ? (
                  <span className="ops-muted">none yet ({messages} {messages === 1 ? 'message' : 'messages'} sent)</span>
                ) : (
                  stop.replies.map((r, i) => (
                    <span key={`${r}-${i}`} className="ops-chip">
                      {REPLY_LABEL[r]}
                    </span>
                  ))
                )}
              </dd>
            </div>
            {stop.assessment ? (
              <div>
                <dt>Attempt check</dt>
                <dd>
                  <span className={`ops-chip ${stop.assessment.status === 'suspect' ? 'is-red' : stop.assessment.status === 'verified' ? 'is-green' : ''}`}>
                    {stop.assessment.status}
                  </span>{' '}
                  {stop.assessment.reason}
                </dd>
              </div>
            ) : null}
            {stop.evidence ? (
              <div>
                <dt>Evidence at the door</dt>
                <dd>
                  {Math.round(stop.evidence.gpsDistM)} m from the address · {stop.evidence.calls} calls · waited {stop.evidence.waitMin} min
                  {stop.confidence ? <span className={`ops-chip ${stop.confidence === 'low' ? 'is-red' : stop.confidence === 'high' ? 'is-green' : ''}`}>{stop.confidence} confidence</span> : null}
                </dd>
              </div>
            ) : null}
            {entries.length > 0 ? (
              <div>
                <dt>Rescue Bonus</dt>
                <dd>
                  {entries.map((l) => (
                    <span key={l.id} className={`ops-chip ${l.status === 'blocked' || l.status === 'clawed_back' ? 'is-red' : l.status === 'released' ? 'is-green' : ''}`} title={l.reason}>
                      {rupees(l.amount)} {l.status.replace('_', ' ')}
                    </span>
                  ))}
                  {entries[0].reason ? <span className="ops-muted"> {entries[0].reason}</span> : null}
                </dd>
              </div>
            ) : null}
            {stop.rehomedFrom !== undefined ? (
              <div>
                <dt>Cohort</dt>
                <dd>Re-homed parcel: its own cohort, outside the pilot metrics</dd>
              </div>
            ) : null}
          </dl>
          {isDelivered(stop.status) && !stop.returned ? (
            <button type="button" className="btn" onClick={() => void send({ type: 'openReturn', orderId: stop.order.id })} title="Demo: the customer opens a return. Inside the 7-day window the bonus is clawed back">
              Customer returned this order (demo)
            </button>
          ) : null}
          {stop.returned ? <p className="ops-note">A return was opened on this order.</p> : null}

          <RankMeter rank={ranks.get(stop.order.id) ?? state.stopOrder.length} total={state.stopOrder.length} flagged={stop.flagged} />

          <h3 className="ops-subhead">Why flagged</h3>
          <ScoreBars contributions={explainScore(stop.order)} />
          <p className="ops-note">Rescue Score = TrustMesh signal (stand-in) + last-mile signals. Riders never see it.</p>
          <ScoreAccuracyNote state={state} />
        </>
      )}
    </section>
  )
}
