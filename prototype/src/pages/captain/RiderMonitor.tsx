import { Fragment, useState } from 'react'
import { clockText } from '../../domain/clock.ts'
import { captainScorecard, hubMedianDisputedRate, MEDIAN_MIN_ATTEMPTS, riderMonitor, riderTimeline, WATCH_DISPUTES, WATCH_MULTIPLE, type MonitorStatus } from '../../domain/captainView.ts'
import type { DayState } from '../../domain/types.ts'

const pct = (x: number): string => `${(x * 100).toFixed(0)}%`
const TONE: Readonly<Record<MonitorStatus, string>> = { Clear: '', Watch: 'is-amber', Warning: 'is-red', Escalated: 'is-red' }

/** The captain's scorecard: how this captain is doing, so a captain's silence or over-striking is itself visible to Ops. */
export function Scorecard({ state }: { readonly state: DayState }) {
  const c = captainScorecard(state)
  return (
    <section className="ops-card" aria-label="Captain scorecard">
      <div className="ops-card-head">
        <h2>Captain scorecard</h2>
        <span className="ops-muted">this hub, this day</span>
      </div>
      <dl className="cap-tiles">
        <div>
          <dt>Decided in time</dt>
          <dd>{c.decidedInTimeShare === undefined ? '—' : pct(c.decidedInTimeShare)}</dd>
          <small>
            {c.decided} decided · {c.autoExpired} the captain did not decide
          </small>
        </div>
        <div>
          <dt>Strikes issued</dt>
          <dd>{c.strikes}</dd>
        </div>
        <div>
          <dt>Overturned by Ops</dt>
          <dd>{c.overturned}</dd>
        </div>
        <div>
          <dt>Reviews asked by riders</dt>
          <dd>{c.reviewsAsked}</dd>
        </div>
      </dl>
    </section>
  )
}

/** Every rider at the hub: attempts, disputes, strikes, a status you can explain in one line, and a timeline on click. */
export function RiderMonitor({ state }: { readonly state: DayState }) {
  const rows = riderMonitor(state)
  const [open, setOpen] = useState<string | null>(null)
  const median = hubMedianDisputedRate(state)
  return (
    <section className="ops-card" aria-label="Rider monitor">
      <div className="ops-card-head">
        <h2>Rider monitor</h2>
        <span className="ops-muted">hub median disputed rate {pct(median)} (riders with {MEDIAN_MIN_ATTEMPTS}+ attempts)</span>
      </div>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <caption className="sr-only">Every rider at the hub with their attempts, disputes and strikes</caption>
          <thead>
            <tr>
              <th scope="col">Rider</th>
              <th scope="col">Arm</th>
              <th scope="col">Attempts</th>
              <th scope="col">Disputed</th>
              <th scope="col">Strikes</th>
              <th scope="col">Disputed rate</th>
              <th scope="col">Held ₹</th>
              <th scope="col">Status</th>
              <th scope="col">Last decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.riderId}>
                <tr>
                  <th scope="row">
                    <button type="button" className="ops-linkbtn" aria-expanded={open === r.riderId} onClick={() => setOpen(open === r.riderId ? null : r.riderId)}>
                      {r.name}
                    </button>
                  </th>
                  <td>{r.arm === 'bonus' ? 'Bonus' : 'Control'}</td>
                  <td>{r.attempts}</td>
                  <td>{r.disputed}</td>
                  <td>{r.strikes}</td>
                  <td>{r.attempts === 0 ? '—' : pct(r.disputedRate)}</td>
                  <td title="Deliveries where the same rider's own earlier attempt was weak (the parking-gap check)">{r.deferrals}</td>
                  <td>
                    <span className={`ops-chip ${TONE[r.status]}`}>{r.status}</span>
                    {r.status !== 'Clear' ? <div className="ops-muted">{r.why}</div> : null}
                  </td>
                  <td>{r.lastDecision ?? '—'}</td>
                </tr>
                {open === r.riderId ? (
                  <tr>
                    <td colSpan={9}>
                      <Timeline state={state} riderId={r.riderId} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ops-note">
        Watch means {WATCH_DISPUTES} or more disputed attempts in 7 days and a disputed rate at least {WATCH_MULTIPLE}× the hub median. It is a prompt to look, never a punishment. Strikes are only
        ever decided by the captain, with a reason.
      </p>
    </section>
  )
}

function Timeline({ state, riderId }: { readonly state: DayState; readonly riderId: string }) {
  const items = riderTimeline(state, riderId)
  if (items.length === 0) return <p className="ops-muted">Nothing disputed or decided for this rider yet.</p>
  return (
    <ol className="cap-timeline" aria-label="Rider timeline">
      {items.map((x, i) => (
        <li key={i}>
          <time>{clockText(x.simAt)}</time> {x.text}
        </li>
      ))}
    </ol>
  )
}
