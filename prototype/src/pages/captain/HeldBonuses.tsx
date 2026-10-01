import { useState } from 'react'
import { BONUS_HOLD_WINDOW_MS, heldBonuses, STRIKE_REASONS, STRIKE_REASON_LABEL } from '../../domain/captain.ts'
import { DAY_MS } from '../../domain/clock.ts'
import type { DayState, LedgerEntry, StrikeReason } from '../../domain/types.ts'
import { useSend } from '../../store/StoreContext.tsx'
import { riderNameOf } from '../ops/model.ts'

const answer = (reached: boolean | null): string => (reached === null ? 'the customer did not answer' : reached ? 'the customer says the rider came' : 'the customer says nobody came')

function HoldCard({ state, entry }: { readonly state: DayState; readonly entry: LedgerEntry }) {
  const send = useSend(state.hub.id)
  const [withholding, setWithholding] = useState(false)
  const review = entry.review!
  const st = state.stops[entry.orderId]
  const days = Math.max(0, Math.ceil((entry.deliveredSim + BONUS_HOLD_WINDOW_MS - state.simNow) / DAY_MS))
  const w = review.weak
  return (
    <article className="cap-card" aria-label={`Held bonus on ${st.order.awb}`}>
      <header className="cap-card-head">
        <strong>{st.order.awb}</strong>
        <span className="ops-chip">₹{entry.amount} held</span>
        <span className="cap-left">{days} days left, then released by default</span>
      </header>
      <p>
        <strong>{riderNameOf(state, entry.riderId)}</strong> delivered this order after an earlier attempt of their own that was weak: {review.why.replace(/^your earlier attempt/, 'the earlier attempt')}.
      </p>
      <dl className="cap-evidence">
        <div>
          <dt>Phone vs address</dt>
          <dd>{w.gpsDistM === null ? '—' : `${Math.round(w.gpsDistM)} m away`}</dd>
        </div>
        <div>
          <dt>Calls</dt>
          <dd>{w.calls ?? '—'}</dd>
        </div>
        <div>
          <dt>Waited</dt>
          <dd>{w.waitMin === null ? '—' : `${w.waitMin} min`}</dd>
        </div>
        <div>
          <dt>Customer (WhatsApp)</dt>
          <dd>{answer(w.reached)}</dd>
        </div>
      </dl>
      <div className="ops-actions">
        <button type="button" className="btn primary" onClick={() => void send({ type: 'reviewBonus', orderId: entry.orderId, decision: 'release' })}>
          Release the ₹{entry.amount}
        </button>
        <button type="button" className="btn danger" aria-expanded={withholding} onClick={() => setWithholding((v) => !v)}>
          Withhold…
        </button>
      </div>
      {withholding ? (
        <div className="cap-strike" role="group" aria-label="Withhold reason">
          <p className="ops-muted">A reason is required to withhold.</p>
          <div className="cap-chips">
            {STRIKE_REASONS.map((r: StrikeReason) => (
              <button key={r} type="button" className="cap-chip" onClick={() => void send({ type: 'reviewBonus', orderId: entry.orderId, decision: 'withhold', reason: r })}>
                Withhold: {STRIKE_REASON_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}

/**
 * The parking gap: a rider logged a weak “customer unavailable” on a flagged order and delivered it themselves later. The ₹15 waits here for the
 * captain. If the customer confirmed the rider came it never reaches this list, and if nobody decides in 7 days it is released.
 */
export function HeldBonuses({ state }: { readonly state: DayState }) {
  if (!(state.config.bonus > 0)) return null
  const held = heldBonuses(state)
  const decided = state.ledger.filter((l) => l.review !== undefined && l.review.state !== 'waiting')
  return (
    <section className="ops-card" aria-label="Held bonuses">
      <div className="ops-card-head">
        <h2>Held bonuses</h2>
        <span className={`ops-chip ${held.length > 0 ? 'is-red' : ''}`}>{held.length} waiting</span>
      </div>
      {held.length === 0 ? (
        <p className="ops-empty">
          Nothing held. A ₹{state.config.bonus} waits here when the same rider who logged a weak “customer unavailable” on a flagged order delivers it later and the customer did not confirm the
          rider came. {decided.length > 0 ? `${decided.length} already cleared or decided.` : ''}
        </p>
      ) : (
        <div className="cap-list">
          {held.map((l) => (
            <HoldCard key={l.id} state={state} entry={l} />
          ))}
        </div>
      )}
    </section>
  )
}
