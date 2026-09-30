import type { DeskMoney } from '../../domain/deskMoney.ts'
import type { DaySummary } from '../../engine/router.ts'
import { rupees, signedRupeesFine } from '../../ui/format.ts'
import { LANE_LABEL } from './lanes.ts'

const LANES = ['second_chance', 'hold_rehome', 'consolidated_return'] as const

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

interface DeskSummaryProps {
  readonly summary: DaySummary
  readonly money: DeskMoney
}

export function DeskSummary({ summary, money }: DeskSummaryProps) {
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
      <section className="desk-money-tiles" aria-label="Money today">
        <div className="desk-tile desk-tile--booked">
          <span className="desk-tile-label">Booked so far (net)</span>
          <strong className="desk-tile-num" aria-label="Booked so far">
            {money.booked === 0 ? '₹0' : signedRupeesFine(money.booked)}
          </strong>
          <small>
            real outcomes only · {rupees(money.grossSaved)} saved, {rupees(money.routerCosts)} spent
          </small>
        </div>
        <div className="desk-tile desk-tile--play">
          <span className="desk-tile-label">Still in play (expected)</span>
          <strong className="desk-tile-num" aria-label="Still in play">
            {signedRupeesFine(money.inPlay)}
          </strong>
          <small>
            expected value of {plural(money.inPlayCount, 'open parcel')} <span className="pill">assumption</span>
          </small>
        </div>
        <div className="desk-tile desk-tile--back">
          <span className="desk-tile-label">Cost of sending everything back</span>
          <strong className="desk-tile-num desk-cost" aria-label="Cost of sending everything back">
            {rupees(money.sendBackCost)}
          </strong>
          <small>{plural(money.parcels, 'refused parcel')} × {rupees(120)} (case data pack)</small>
        </div>
      </section>
      <small className="desk-money-note">
        Booked is what really happened (a second chance delivered, a re-home delivered, a batch closed, less what the Router spent). Still in play is what the open
        parcels are expected to add, at the assumptions below. The batched-return saving is a benchmark, to be measured in the pilot.
      </small>
    </section>
  )
}
