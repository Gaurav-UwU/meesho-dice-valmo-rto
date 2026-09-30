import type { ReactNode } from 'react'
import type { Kpis } from '../../domain/selectors.ts'
import { pct, rupees } from '../../ui/format.ts'

interface TileProps {
  readonly label: string
  readonly value: ReactNode
  readonly sub?: ReactNode
  readonly tone?: 'danger' | 'good'
}

function Tile({ label, value, sub, tone }: TileProps) {
  return (
    <div className="ops-kpi">
      <dt className="ops-kpi-label">{label}</dt>
      <dd className={`ops-kpi-value${tone ? ` is-${tone}` : ''}`}>{value}</dd>
      {sub ? <dd className="ops-kpi-sub">{sub}</dd> : null}
    </div>
  )
}

export function KpiRow({ kpis }: { readonly kpis: Kpis }) {
  const started = kpis.resolved > 0
  return (
    <section aria-label="Key numbers">
      <dl className="ops-kpis">
        <Tile label="Orders" value={kpis.orders} sub={`${kpis.pending} pending · ${kpis.rescheduled} rescheduled`} />
        <Tile
          label="Bonus-Eligible (top 20%)"
          value={kpis.flagged}
          sub={kpis.flagged > 0 ? `${pct(kpis.flagged / Math.max(1, kpis.orders), 0)} of today's orders` : 'flagged when the day starts'}
        />
        <Tile label="Delivered" value={kpis.delivered} sub={`of ${kpis.resolved} resolved`} tone={kpis.delivered > 0 ? 'good' : undefined} />
        <Tile label="Success rate" value={started ? pct(kpis.successRate) : '—'} sub="delivered / resolved" />
        <Tile
          label="RTO: expected → realised"
          value={`${pct(kpis.modelledRto)} → ${started ? pct(kpis.realisedRto) : '—'}`}
          sub="expected without the bonus → outcomes so far"
        />
        <Tile
          label="Cost per successful delivery"
          value={`₹${kpis.costPerSuccessful.toFixed(1)}`}
          sub="deck: ₹84.8 at 17% RTO → ₹77.7 at 14%"
        />
        <Tile
          label="Bonus budget"
          value={rupees(kpis.bonusBudget)}
          sub={
            <>
              <span className="ops-good">Owed {rupees(kpis.bonusPending)}</span> · Released {rupees(kpis.bonusReleased)} · <span className="ops-bad">Clawed back {rupees(kpis.bonusClawedBack)} · Blocked {rupees(kpis.bonusBlocked)}</span>
            </>
          }
        />
        <Tile
          label="Suspect attempts"
          value={kpis.suspect}
          tone={kpis.suspect > 0 ? 'danger' : undefined}
          sub={kpis.suspect > 0 ? 'see the exception queue below' : 'none flagged by the WhatsApp check'}
        />
      </dl>
    </section>
  )
}
