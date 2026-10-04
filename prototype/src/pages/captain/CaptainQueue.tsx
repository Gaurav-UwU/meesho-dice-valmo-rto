import { useState } from 'react'
import { activeCount, ladderStep, strikeSupport, hasNote, STRIKE_REASONS, STRIKE_REASON_LABEL } from '../../domain/captain.ts'
import { HOUR_MS } from '../../domain/clock.ts'
import { EXCEPTION_DEFAULT_MS } from '../../domain/orders.ts'
import type { DayState, ExceptionItem, StrikeReason } from '../../domain/types.ts'
import { useSend } from '../../store/StoreContext.tsx'
import { riderNameOf } from '../ops/model.ts'

interface Props {
  readonly state: DayState
}

const hoursLeft = (state: DayState, item: ExceptionItem): number => Math.max(0, Math.ceil((item.openedSim + EXCEPTION_DEFAULT_MS - state.simNow) / HOUR_MS))

const ANSWER_TEXT = (reached: boolean | null): string => (reached === null ? 'has not answered the WhatsApp check yet' : reached ? 'says the rider came' : 'says nobody came')

/** One disputed attempt: the evidence, what the customer said, the rider's record, and the three choices. */
function DecisionCard({ state, item }: { readonly state: DayState; readonly item: ExceptionItem }) {
  const send = useSend(state.hub.id)
  const st = state.stops[item.orderId]
  const ev = st.evidence
  const [striking, setStriking] = useState(false)
  const [reason, setReason] = useState<StrikeReason | null>(null)
  const [note, setNote] = useState('')
  const support = strikeSupport(state, item)
  const canStrike = reason !== null && (support.ok || hasNote(note))
  const active = activeCount(state, item.riderId)
  const suggestConfirm = item.confidence === 'high'
  const decide = (action: 'confirm' | 'free_reattempt'): void => void send({ type: 'resolveException', orderId: item.orderId, action })
  const strike = (): void => {
    if (reason === null || !canStrike) return
    void send({ type: 'resolveException', orderId: item.orderId, action: 'strike', reason, ...(hasNote(note) ? { note: note.trim() } : {}) })
  }
  return (
    <article className="cap-card" aria-label={`Dispute on ${st.order.awb}`}>
      <header className="cap-card-head">
        <strong>{st.order.awb}</strong>
        <span className="ops-chip">{st.arm === 'bonus' ? 'Bonus arm' : st.arm === 'control' ? 'Control arm' : 'no arm'}</span>
        <span className={`ops-chip ${item.confidence === 'low' ? 'is-red' : ''}`}>{item.enhanced ? 'enhanced review' : `${item.confidence} confidence`}</span>
        <span className="cap-left">{hoursLeft(state, item)} h left to decide</span>
      </header>
      <p>
        <strong>{riderNameOf(state, item.riderId)}</strong> logged a failed attempt. Record: {active} active strike{active === 1 ? '' : 's'} ({ladderStep(active)}).
      </p>
      <dl className="cap-evidence">
        <div>
          <dt>Phone vs address</dt>
          <dd>{ev ? `${Math.round(ev.gpsDistM)} m away` : 'no GPS logged'}</dd>
        </div>
        <div>
          <dt>Calls</dt>
          <dd>{ev ? `${ev.calls} (logged by the app)` : '—'}</dd>
        </div>
        <div>
          <dt>Waited</dt>
          <dd>{ev ? `${ev.waitMin} min` : '—'}</dd>
        </div>
        <div>
          <dt>Customer (WhatsApp)</dt>
          <dd>{ANSWER_TEXT(st.answers.riderReached)}</dd>
        </div>
      </dl>
      {suggestConfirm ? <p className="cap-suggest">Suggested: Confirm valid. The evidence at the door is strong (at the address, calls made, waited).</p> : null}
      <p className="ops-muted">
        {support.ok ? `A strike is possible: ${support.signals.join('; ')}.` : 'A strike needs more than the customer’s word: nothing else in the evidence supports it. Add a written note, or choose another action.'}
      </p>
      <div className="ops-actions">
        <button type="button" className={`btn${suggestConfirm ? ' primary' : ''}`} onClick={() => decide('confirm')} title="The attempt was valid: normal failed-attempt path, the bonus block is lifted">
          Confirm valid
        </button>
        <button type="button" className="btn" onClick={() => decide('free_reattempt')} title="The same rider tries again (they know the area); it does not count against the attempt cap, and their ₹15 waits for your review">
          Free re-attempt
        </button>
        <button type="button" className="btn danger" aria-expanded={striking} onClick={() => setStriking((v) => !v)}>
          Strike…
        </button>
      </div>
      {striking ? (
        <div className="cap-strike" role="group" aria-label="Strike reason">
          <p className="ops-muted">Pick a reason (required). The rider sees it.</p>
          <div className="cap-chips">
            {STRIKE_REASONS.map((r) => (
              <button key={r} type="button" className="cap-chip" aria-pressed={reason === r} onClick={() => setReason(r)}>
                {STRIKE_REASON_LABEL[r]}
              </button>
            ))}
          </div>
          <label className="cap-note">
            <span>Note (optional, 140 characters)</span>
            <input type="text" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="button" className="btn danger" disabled={!canStrike} onClick={strike}>
            Record strike and give a free re-attempt
          </button>
          {reason !== null && !canStrike ? <p className="ops-bad">Not enough to strike: add a note of at least 5 characters, or choose another action.</p> : null}
        </div>
      ) : null}
    </article>
  )
}

/** The captain's queue of disputed attempts, with evidence and the rider's record. */
export function CaptainQueue({ state }: Props) {
  const open = state.exceptions.filter((e) => e.status === 'open')
  return (
    <section className="ops-card" aria-label="Review queue">
      <div className="ops-card-head">
        <h2>To review</h2>
        <span className={`ops-chip ${open.length > 0 ? 'is-red' : ''}`}>{open.length} open</span>
      </div>
      {open.length === 0 ? (
        <p className="ops-empty">
          Nothing to review. An attempt lands here when the rider&apos;s phone puts them over 500 m from the address, or the customer answers the WhatsApp check with
          “the rider never came”. After 24 h with no decision it becomes a free re-attempt marked “captain did not decide”.
        </p>
      ) : (
        <div className="cap-list">
          {open.map((e) => (
            <DecisionCard key={e.id} state={state} item={e} />
          ))}
        </div>
      )}
    </section>
  )
}
