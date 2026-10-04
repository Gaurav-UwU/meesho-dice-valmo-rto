import { outcomeKpis, RECOVERED_VALUE, KPI_MIN_ATTEMPTS } from '../../domain/captainView.ts'
import type { DayState } from '../../domain/types.ts'

const rs = (x: number): string => `${x < 0 ? '−' : ''}₹${Math.abs(Math.round(x)).toLocaleString('en-IN')}`
const pct = (x: number | undefined): string => (x === undefined ? '—' : `${(x * 100).toFixed(0)}%`)

/**
 * The outcome numbers for fake-attempt control: does reviewing disputes pay for itself? They read the day's record only, never the bonus pilot.
 * Under 30 attempts every number is marked too early, and an empty number is a dash, never a zero.
 */
export function OutcomePanel({ state }: { readonly state: DayState }) {
  const k = outcomeKpis(state)
  const early = !k.enough
  return (
    <section className="ops-card" aria-label="Outcome of fake-attempt control">
      <div className="ops-card-head">
        <h2>Does it pay?</h2>
        <span className={`ops-chip ${early ? 'is-amber' : ''}`}>{early ? `too early: ${k.attempts} of ${KPI_MIN_ATTEMPTS} attempts` : `${k.attempts} attempts`}</span>
      </div>
      <dl className="cap-tiles">
        <div>
          <dt>Disputed</dt>
          <dd>{k.attempts === 0 ? '—' : k.disputed}</dd>
        </div>
        <div>
          <dt>Confirmed fake (strikes)</dt>
          <dd>{k.attempts === 0 ? '—' : k.confirmedFake}</dd>
        </div>
        <div>
          <dt>Cleared (confirmed valid)</dt>
          <dd>{k.attempts === 0 ? '—' : k.cleared}</dd>
        </div>
        <div>
          <dt>The captain did not decide</dt>
          <dd>{k.attempts === 0 ? '—' : k.autoExpired}</dd>
        </div>
        <div>
          <dt>Overturned by Ops</dt>
          <dd>{k.attempts === 0 ? '—' : k.overturned}</dd>
        </div>
        <div>
          <dt>Median time to decide</dt>
          <dd>{k.medianHoursToDecide === undefined ? '—' : `${k.medianHoursToDecide.toFixed(1)} h`}</dd>
        </div>
      </dl>
      <div className="cap-money">
        <p>
          <strong>Recovered deliveries:</strong> {k.recovered} free re-attempts that ended delivered, at {rs(RECOVERED_VALUE)} each (the ₹120 return avoided, less the ₹21 re-attempt) ={' '}
          <strong>{rs(k.savedGross)}</strong>
        </p>
        <p>
          <strong>Reviews:</strong> {k.reviews} decision{k.reviews === 1 ? '' : 's'} by the captain, part of the hub captain’s job: no extra pay and no cost to Valmo (the hub already earns on every delivered
          order).
        </p>
        {state.config.bonus > 0 ? (
          <p>
            <strong>Minus the bonus paid on recovered deliveries</strong> (Bonus arm: the rider who delivers is paid, so it is not a saving): {rs(k.bonusPaidOnRecovered)}
          </p>
        ) : null}
        <p className="cap-net">
          Net so far: <strong className={k.netSaved < 0 ? 'ops-bad' : 'ops-good'}>{k.attempts === 0 ? '—' : rs(k.netSaved)}</strong>
        </p>
        <p className="ops-muted">So far: {pct(k.recoveryShare)} of reviewed disputes ended in a recovered delivery.</p>
      </div>
      <p className="ops-note">
        The 4% fake share in the simulation is an assumption; the 8-week baseline measures the real one. {early ? 'Under 30 attempts these numbers are too early to read.' : ''} The ₹99 and ₹120 figures come from the
        case pack, not measurements.
      </p>
    </section>
  )
}
