import { Link } from 'react-router-dom'
import { captainName, STRIKE_REASON_LABEL } from '../../domain/captain.ts'
import { strikeView } from '../../domain/captainView.ts'
import { HOUR_MS } from '../../domain/clock.ts'
import { EXCEPTION_DEFAULT_MS } from '../../domain/orders.ts'
import type { DayState, ExceptionAction, ExceptionItem } from '../../domain/types.ts'
import { useSend } from '../../store/StoreContext.tsx'
import { riderNameOf } from './model.ts'

interface Props {
  readonly state: DayState
  readonly onSelect: (id: string) => void
}

const ACTION_LABEL: Readonly<Record<ExceptionAction, string>> = {
  confirm: 'Confirmed valid',
  free_reattempt: 'Free re-attempt',
  strike: 'Strike + free re-attempt',
}

const hoursLeft = (state: DayState, item: ExceptionItem): number => Math.max(0, Math.ceil((item.openedSim + EXCEPTION_DEFAULT_MS - state.simNow) / HOUR_MS))

/**
 * Ops' READ-ONLY view of the disputed attempts. The hub captain decides them on /captain; nobody here can confirm, re-attempt or strike.
 * Ops sees who is deciding, how long is left, the outcome, and "captain did not decide" when 24 h went by. Ops can overturn a strike
 * within 48 h, and sees when a rider has asked for a review.
 */
export function ExceptionQueue({ state, onSelect }: Props) {
  const send = useSend(state.hub.id)
  const open = state.exceptions.filter((e) => e.status === 'open')
  const done = state.exceptions.filter((e) => e.status === 'resolved')
  const strikes = state.strikeLog
  return (
    <section className="ops-card" aria-label="Exception queue">
      <div className="ops-card-head">
        <h2>Disputed attempts</h2>
        <span className={`ops-chip ${open.length > 0 ? 'is-red' : ''}`}>{open.length} with the captain</span>
      </div>
      <p className="ops-note">
        Decided by {captainName(state.hub)} on <Link to={`/captain?hub=${state.hub.id}`}>the captain screen</Link>. Ops reads them here (read-only) and can overturn a strike within 48 h.
      </p>
      {open.length === 0 ? (
        <p className="ops-empty">
          Nothing waiting. A failed attempt goes to the captain when the rider&apos;s phone puts them over 500 m from the address, or the customer answers the WhatsApp check with “the rider never
          came”. {done.length > 0 ? `${done.length} decided so far.` : ''}
        </p>
      ) : (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <caption className="sr-only">Failed attempts waiting for the hub captain</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Rider</th>
                <th scope="col">Evidence at the door</th>
                <th scope="col">Captain</th>
                <th scope="col">Time left</th>
              </tr>
            </thead>
            <tbody>
              {open.map((e) => {
                const st = state.stops[e.orderId]
                const ev = st.evidence
                return (
                  <tr key={e.id}>
                    <th scope="row">
                      <button type="button" className="ops-linkbtn" onClick={() => onSelect(e.orderId)}>
                        {st.order.awb}
                      </button>
                    </th>
                    <td>{riderNameOf(state, e.riderId)}</td>
                    <td>
                      <span className="ops-chip is-red">{e.enhanced ? 'enhanced review' : `${e.confidence} confidence`}</span>{' '}
                      {ev ? `${Math.round(ev.gpsDistM)} m away · ${ev.calls} calls · waited ${ev.waitMin} min` : 'no GPS logged'}
                      {st.assessment?.status === 'suspect' ? <div className="ops-muted">{st.assessment.reason}</div> : null}
                    </td>
                    <td>{captainName(state.hub)}</td>
                    <td>{hoursLeft(state, e)} h</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {done.length > 0 ? (
        <p className="ops-note">
          Decided:{' '}
          {done
            .slice(-5)
            .map((e) => `${state.stops[e.orderId].order.awb} ${ACTION_LABEL[e.action ?? 'confirm'].toLowerCase()}${e.captainMissed ? ' (captain did not decide, auto after 24 h)' : ` by ${e.captainName ?? 'the captain'}`}`)
            .join(' · ')}
        </p>
      ) : null}
      {strikes.length > 0 ? (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <caption>Strikes (overturn within 48 h)</caption>
            <thead>
              <tr>
                <th scope="col">Rider</th>
                <th scope="col">Order</th>
                <th scope="col">Reason</th>
                <th scope="col">Status</th>
                <th scope="col">Ops</th>
              </tr>
            </thead>
            <tbody>
              {strikes.map((k) => {
                const v = strikeView(state, k)
                return (
                  <tr key={k.id}>
                    <th scope="row">{riderNameOf(state, k.riderId)}</th>
                    <td>{state.stops[k.orderId]?.order.awb ?? k.orderId}</td>
                    <td>
                      {STRIKE_REASON_LABEL[k.reason]}
                      {k.note ? <div className="ops-muted">{k.note}</div> : null}
                    </td>
                    <td>
                      {v.state === 'active' ? `active, ${v.daysLeft} days left` : v.state}
                      {k.reviewAskedSim !== undefined && v.state === 'active' ? <span className="ops-chip is-red">rider asked for a review</span> : null}
                    </td>
                    <td>
                      {v.canOverturn ? (
                        <button type="button" className="btn" onClick={() => void send({ type: 'overturnStrike', strikeId: k.id })}>
                          Overturn
                        </button>
                      ) : v.state === 'active' ? (
                        <span className="ops-muted">overturn window (48 h) closed</span>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
