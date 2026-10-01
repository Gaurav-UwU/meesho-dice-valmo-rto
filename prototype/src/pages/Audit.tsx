import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { auditGreen, runAudit } from '../domain/audit.ts'
import { clockText } from '../domain/clock.ts'
import { useDay, useSend } from '../store/StoreContext.tsx'
import { DayLoading } from '../ui/DayLoading.tsx'
import { Footer } from '../ui/Footer.tsx'
import { SyncBadge } from '../ui/SyncBadge.tsx'
import { HubPicker } from '../ui/HubPicker.tsx'
import { useHubParam } from '../ui/hub.ts'
import './ops/ops.css'
import './audit.css'

/** Eighteen checks on the day's own record, each green or red. Read from the event log and the lifecycle, so a screen that lies turns a check red. */
export default function Audit() {
  const { hub } = useHubParam()
  const day = useDay(hub.id)
  const send = useSend(hub.id)
  const checks = useMemo(() => (day ? runAudit(day) : []), [day])
  const green = auditGreen(checks)
  return (
    <div className="ops-page audit-page">
      <header className="ops-header">
        <h1 className="ops-title">Audit</h1>
        <SyncBadge hubId={hub.id} />
        <div className="ops-header-spacer" />
        <nav className="ops-nav" aria-label="Other screens">
          <Link to={`/ops?hub=${hub.id}`}>Ops console</Link>
          <Link to={`/desk?hub=${hub.id}`}>Refused Parcel Desk</Link>
          <Link to="/pilot">Pilot</Link>
        </nav>
        <HubPicker light />
      </header>
      <main className="ops-main">
        {!day ? (
          <DayLoading hubId={hub.id} className="ops-loading" />
        ) : (
          <>
            <section className={`ops-card audit-summary ${green ? 'is-green' : 'is-red'}`} aria-label="Audit result" role="status">
              <strong>{green ? `All ${checks.length} checks are green` : `${checks.filter((c) => !c.ok).length} of ${checks.length} checks are red`}</strong>
              <span>
                {day.started ? `${day.stopOrder.length} orders · ${day.events.length} events logged · ${clockText(day.simNow)}` : 'The day has not started: start it on the Ops console.'}
              </span>
              {day.started ? (
                <button type="button" className="btn" onClick={() => void send({ type: 'closePilot' })} title="Work every open order, run the Desk on the Router's advice, and skip past every window">
                  Close pilot
                </button>
              ) : null}
            </section>
            <ol className="audit-list" aria-label="Audit checks">
              {checks.map((c, i) => (
                <li key={c.id} className={`ops-card audit-check ${c.ok ? 'is-green' : 'is-red'}`}>
                  <span className="audit-mark" aria-hidden="true">
                    {c.ok ? '✓' : '✕'}
                  </span>
                  <div>
                    <h2>
                      {i + 1}. {c.label} <span className="sr-only">{c.ok ? 'passed' : 'failed'}</span>
                    </h2>
                    <p>{c.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="ops-strip">
              Every check reads the day&apos;s event log or its lifecycle table, not a screen. Run Autopilot, then Close pilot on the Ops console, and all ten stay green.
              Numbers here are synthetic.
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
