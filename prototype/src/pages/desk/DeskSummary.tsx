import type { DaySummary } from '../../engine/router.ts'
import { rupees } from '../../ui/format.ts'
import { effectRange, LANE_LABEL } from './lanes.ts'

const LANES = ['second_chance', 'hold_rehome', 'consolidated_return'] as const

export function DeskSummary({ summary }: { readonly summary: DaySummary }) {
  return (
    <section className="card desk-summary" aria-label="Day summary">
      <div className="desk-tiles">
        <div className="desk-tile desk-tile--big">
          <span className="desk-tile-num">{summary.total}</span>
          <span className="desk-tile-label">refused parcels waiting</span>
        </div>
        {LANES.map((lane) => (
          <div key={lane} className={`desk-tile desk-tile--${lane}`}>
            <span className="desk-tile-num">{summary.counts[lane]}</span>
            <span className="desk-tile-label">{LANE_LABEL[lane]}</span>
          </div>
        ))}
      </div>
      <div className="desk-money">
        <p>
          Sending everything back costs <strong className="desk-cost">{rupees(summary.sendBackCost)}</strong>
        </p>
        <p>
          Router effect on these parcels:{' '}
          <strong className="desk-save">{summary.total === 0 ? '₹0' : effectRange(summary.savedMin, summary.savedMax)}</strong>
        </p>
        <small>
          The low end assumes every second chance is declined and no parcel finds a buyer. Consolidated-return savings are a
          benchmark, to be measured in the pilot.
        </small>
      </div>
    </section>
  )
}
