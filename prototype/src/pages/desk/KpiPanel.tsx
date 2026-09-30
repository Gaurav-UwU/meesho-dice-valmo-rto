import { MIN_PARCELS_PER_LANE, type DeskKpis, type Metric } from '../../domain/deskKpis.ts'
import { SKIP_LABEL, SKIP_REASONS } from '../../engine/router.ts'
import { pct, rupees } from '../../ui/format.ts'

interface RowProps {
  readonly label: string
  readonly metric: Metric
  readonly text: string
  readonly children?: React.ReactNode
}

function Row({ label, metric, text, children }: RowProps) {
  return (
    <li className="desk-kpi-row">
      <div className="desk-kpi-head">
        <span className="desk-kpi-label">{label}</span>
        <strong className="desk-kpi-value">{metric.value === null ? '–' : text}</strong>
      </div>
      <div className="desk-kpi-sub">
        <span>n = {metric.n}</span>
        {metric.tooEarly ? <span className="desk-kpi-early">too early (needs {MIN_PARCELS_PER_LANE})</span> : null}
        {children}
      </div>
    </li>
  )
}

/** What a real pilot would read, from this day's own record. All simulated outcomes, each held back as "too early" until its lane has 30 parcels. */
export function KpiPanel({ kpis: k }: { readonly kpis: DeskKpis }) {
  const skipped = SKIP_REASONS.filter((r) => k.skips.byReason[r] > 0)
  return (
    <section className="card desk-panel desk-kpis" aria-label="Pilot KPIs">
      <h3>
        Pilot KPIs <span className="pill">simulated</span>
      </h3>
      <ul>
        <Row label="Sales saved" metric={k.salesSaved} text={pct(k.salesSaved.value ?? 0)}>
          <span>second chances delivered + pickups collected, over second chances sent</span>
        </Row>
        <Row label="Second-chance accept rate" metric={k.acceptRate} text={pct(k.acceptRate.value ?? 0)}>
          <span>customers who took an option, over offers sent</span>
        </Row>
        <Row label="Re-home match rate" metric={k.matchRate} text={pct(k.matchRate.value ?? 0)}>
          <span>{pct(k.breakEven)} break-even</span>
          {k.forecastedMatch !== null ? <span>forecast said {pct(k.forecastedMatch)}</span> : null}
          {k.matchRate.open > 0 ? <span>{k.matchRate.open} still waiting</span> : null}
        </Row>
        <Row label="Pickup rate" metric={k.pickupRate} text={pct(k.pickupRate.value ?? 0)}>
          <span>{k.pickupRate.collected} collected</span>
          <span>{k.pickupRate.noShows} no-shows</span>
          {k.pickupRate.open > 0 ? <span>{k.pickupRate.open} waiting</span> : null}
        </Row>
        <Row label="Average dwell" metric={k.dwellHours} text={`${(k.dwellHours.value ?? 0).toFixed(1)} h`}>
          <span>from refusal to the parcel&apos;s end</span>
        </Row>
        <Row label="₹ booked per refused parcel" metric={k.bookedPerParcel} text={rupees1(k.bookedPerParcel.value ?? 0)}>
          <span>real outcomes, net of Router costs</span>
        </Row>
        <li className="desk-kpi-row">
          <div className="desk-kpi-head">
            <span className="desk-kpi-label">Second chances skipped</span>
            <strong className="desk-kpi-value">{k.skips.share === null ? '–' : `${k.skips.total} (${pct(k.skips.share)} of refused parcels)`}</strong>
          </div>
          {skipped.length > 0 ? (
            <ul className="desk-kpi-sub desk-kpi-reasons">
              {skipped.map((r) => (
                <li key={r}>
                  {SKIP_LABEL[r]}: {k.skips.byReason[r]}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      </ul>
      <p className={k.killRule.status === 'kill' ? 'desk-danger' : 'desk-kpi-kill'}>{k.killRule.text}</p>
      <small>
        {k.notSimulated.join(' and ')} are not simulated: they are measured in the real pilot, so no number is shown. Every number above is a simulated outcome, and is too early until a lane
        has {MIN_PARCELS_PER_LANE} parcels.
      </small>
    </section>
  )
}

/** ₹ with one decimal below ₹100, so ₹23.5 does not round to ₹24 */
const rupees1 = (n: number): string => (Math.abs(n) < 100 && !Number.isInteger(n) ? `${n < 0 ? '−' : ''}₹${Math.abs(n).toFixed(1)}` : rupees(n))
