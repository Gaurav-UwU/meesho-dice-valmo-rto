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
 * Attempts Ops has to look at: weak evidence at the door (GPS over 500 m away) or a customer who says the rider never came.
 * Three choices; nobody decides in 24 sim-hours and it becomes a free re-attempt on its own.
 */
export function ExceptionQueue({ state, onSelect }: Props) {
  const send = useSend(state.hub.id)
  const open = state.exceptions.filter((e) => e.status === 'open')
  const done = state.exceptions.filter((e) => e.status === 'resolved')
  const decide = (orderId: string, action: ExceptionAction): void => void send({ type: 'resolveException', orderId, action })
  return (
    <section className="ops-card" aria-label="Exception queue">
      <div className="ops-card-head">
        <h2>Exception queue</h2>
        <span className={`ops-chip ${open.length > 0 ? 'is-red' : ''}`}>{open.length} open</span>
      </div>
      {open.length === 0 ? (
        <p className="ops-empty">
          Nothing to decide. A failed attempt lands here when the rider&apos;s phone puts them over 500 m from the address, or the customer answers the
          WhatsApp check with “the rider never came”. {done.length > 0 ? `${done.length} decided so far.` : ''}
        </p>
      ) : (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <caption className="sr-only">Failed attempts that need a decision</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Rider</th>
                <th scope="col">Evidence at the door</th>
                <th scope="col">Time left</th>
                <th scope="col">Decide</th>
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
                      <span className="ops-chip is-red">{e.confidence} confidence</span>{' '}
                      {ev ? `${Math.round(ev.gpsDistM)} m away · ${ev.calls} calls · waited ${ev.waitMin} min` : 'no GPS logged'}
                      {st.assessment?.status === 'suspect' ? <div className="ops-muted">{st.assessment.reason}</div> : null}
                    </td>
                    <td>{hoursLeft(state, e)} h</td>
                    <td>
                      <div className="ops-actions">
                        <button type="button" className="btn" onClick={() => decide(e.orderId, 'confirm')} title="The attempt was valid: normal failed-attempt path, bonus block lifted">
                          Confirm valid
                        </button>
                        <button type="button" className="btn" onClick={() => decide(e.orderId, 'free_reattempt')} title="Another rider of the same arm tries again; it does not count against the cap and the first rider is not paid">
                          Free re-attempt
                        </button>
                        <button type="button" className="btn danger" onClick={() => decide(e.orderId, 'strike')} title="A strike on the first rider, plus a free re-attempt">
                          Strike
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {done.length > 0 ? (
        <p className="ops-note">
          Decided: {done.slice(-5).map((e) => `${state.stops[e.orderId].order.awb} ${ACTION_LABEL[e.action ?? 'confirm'].toLowerCase()}${e.auto ? ' (auto after 24 h)' : ''}`).join(' · ')}
        </p>
      ) : null}
    </section>
  )
}
