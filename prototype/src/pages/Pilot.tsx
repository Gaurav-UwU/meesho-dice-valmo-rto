import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Footer } from '../ui/Footer.tsx'
import { useHubParam } from '../ui/hub.ts'
import { Answer } from './pilot/Answer.tsx'
import { Assumptions } from './pilot/Assumptions.tsx'
import { HubTable } from './pilot/HubTable.tsx'
import { MathExplainer } from './pilot/MathExplainer.tsx'
import { OpsDayCheck } from './pilot/OpsDayCheck.tsx'
import { PayCard } from './pilot/PayCard.tsx'
import { DEFAULT_CONTROLS, derivePilotView, ODDS_REPLICATES, RTO_TODAY, type Controls } from './pilot/pilotModel.ts'
import { PnlPanel } from './pilot/PnlPanel.tsx'
import { CostBars, SensitivityTable } from './pilot/SensitivityAndCost.tsx'
import './pilot/pilot.css'

function More({ title, hint, children }: { readonly title: string; readonly hint: string; readonly children: ReactNode }) {
  return (
    <details className="pilot-detail">
      <summary>
        <span>{title}</span>
        <em>{hint}</em>
      </summary>
      <div className="pilot-detail-body">{children}</div>
    </details>
  )
}

/** Three steps on one page: your assumptions, what the pilot would say, and whether it pays. Everything else is under "More detail". */
export default function Pilot() {
  const { hub } = useHubParam()
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS)
  // The sliders stay smooth while the 300-run simulation catches up a moment later.
  const settled = useDeferredValue(controls)
  const view = useMemo(() => derivePilotView(settled), [settled])
  const observedRto = RTO_TODAY - view.rtoPoints / 100

  return (
    <div className="pilot-root">
      <header className="pilot-top">
        <Link to={`/?hub=${hub.id}`} className="pilot-brand">
          <span className="pilot-dot" aria-hidden="true" />
          Valmo Rescue Console
        </Link>
        <div className="pilot-top-right">
          <nav className="pilot-nav" aria-label="Other pages">
            <Link to="/">Demo guide</Link>
            <Link to={`/ops?hub=${hub.id}`}>Ops console</Link>
            <Link to={`/audit?hub=${hub.id}`}>Audit</Link>
          </nav>
          <MathExplainer controls={settled} view={view} />
        </div>
      </header>

      <main className="pilot-main pilot-main--simple">
        <div className="pilot-intro">
          <h1>Will paying riders ₹15 be worth it?</h1>
          <p>
            A 30-day test in 4 hubs. In each hub we pair riders who delivered equally well last month, and a coin decides who in each pair gets ₹15 for delivering a
            risky order. Compare the two groups, and you know what the bonus caused.
          </p>
          <p className="pilot-disclaimer" role="note">
            <strong>Assumed, not measured:</strong> how much ₹15 changes what riders do. You set it below. This shows how the decision would be made, not
            evidence that it works.
          </p>
        </div>

        <Assumptions controls={controls} onChange={setControls} />
        <Answer result={view.result} odds={view.odds} replicates={ODDS_REPLICATES} />
        <PayCard headline={view.headline} pay={view.pay} rtoPoints={view.rtoPoints} />

        <section className="pilot-details" aria-labelledby="pilot-more-h">
          <h2 id="pilot-more-h">More detail</h2>
          <More title="Check today's Ops day" hint="the day you played on the Ops console, judged by the same rule">
            <OpsDayCheck simulatedPerArm={view.result.pooled.flagged.bonus.n} />
          </More>
          <More title="Hub by hub" hint="Bonus vs Control in each of the 4 hubs">
            <HubTable result={view.result} />
          </More>
          <More title="Profit at every possible effect" hint="where the bonus starts to pay">
            <PnlPanel view={view} compact />
          </More>
          <More title="Yearly rupees by bonus size" hint="the deck's table">
            <SensitivityTable table={view.sensitivity} />
          </More>
          <More title="Cost per successful delivery" hint="today, the deck target, this pilot">
            <CostBars observedRto={observedRto} />
          </More>
        </section>

        <p className="pilot-sim" role="note">
          Simulated: the pilot has not run. Outcomes are random draws around the effect you set, with some riders better than others and past delivery rates that are only a noisy guide to skill.
        </p>
      </main>
      <Footer />
    </div>
  )
}
