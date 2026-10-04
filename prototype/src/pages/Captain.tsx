import { Link } from 'react-router-dom'
import { captainTitle } from '../domain/captain.ts'
import { useDay } from '../store/StoreContext.tsx'
import { DayLoading } from '../ui/DayLoading.tsx'
import { Footer } from '../ui/Footer.tsx'
import { HubPicker } from '../ui/HubPicker.tsx'
import { SyncBadge } from '../ui/SyncBadge.tsx'
import { useHubParam } from '../ui/hub.ts'
import './ops/ops.css'
import './captain/captain.css'
import { CaptainQueue } from './captain/CaptainQueue.tsx'
import { HeldBonuses } from './captain/HeldBonuses.tsx'
import { OutcomePanel } from './captain/OutcomePanel.tsx'
import { RiderMonitor, Scorecard } from './captain/RiderMonitor.tsx'

/**
 * The hub captain's screen (/captain?hub=): the review queue with evidence, held bonuses, the rider monitor, a scorecard and the outcome numbers.
 * The captain decides disputed attempts; Ops can only read them (and overturn a strike within 48 h). Works with the bonus off, in both arms.
 * Demo build: no login. A live rollout needs a captain login (Live mode uses the captain key).
 */
export default function Captain() {
  const { hub } = useHubParam()
  const state = useDay(hub.id)
  return (
    <div className="ops-page captain-page">
      <header className="ops-header">
        <h1 className="ops-title">Hub captain</h1>
        <span className="ops-badge">demo, no login</span>
        <SyncBadge hubId={hub.id} />
        <div className="ops-header-spacer" />
        <nav className="ops-nav" aria-label="Other screens">
          <Link to="/">Home</Link>
          <Link to={`/ops?hub=${hub.id}`}>Ops</Link>
          <Link to={`/rider?hub=${hub.id}`}>Rider</Link>
          <Link to={`/audit?hub=${hub.id}`}>Audit</Link>
        </nav>
        <HubPicker light />
      </header>
      {state ? (
        <main className="ops-main">
          <p className="cap-who">
            You are <strong>{captainTitle(state.hub)}</strong> (synthetic name). You decide the disputed attempts at this hub. Ops reads them and can overturn a strike within 48 h.
          </p>
          {!state.started ? <p className="ops-note">The day has not started yet: start it on the Ops console, then come back.</p> : null}
          <CaptainQueue state={state} />
          <HeldBonuses state={state} />
          <div className="ops-pair">
            <Scorecard state={state} />
            <OutcomePanel state={state} />
          </div>
          <RiderMonitor state={state} />
          <p className="ops-strip">
            <strong>Real vs simulated:</strong> riders, attempts and customers are synthetic. The ladder (warning, a 14-day enhanced review, then the bonus suspended for the rest of the pilot) is our proposal; Valmo&apos;s real
            rules and labour practice decide what is allowed. A real rollout needs a captain login and a documented appeal process.
          </p>
        </main>
      ) : (
        <DayLoading hubId={hub.id} className="ops-loading" />
      )}
      <Footer />
    </div>
  )
}
