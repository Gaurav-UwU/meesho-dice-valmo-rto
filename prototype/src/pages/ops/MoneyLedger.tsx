import { costLedger, ledgerTotals, savingsLedger } from '../../domain/ledger.ts'
import type { DayState } from '../../domain/types.ts'
import { rupees } from '../../ui/format.ts'

const STREAM_LABEL = { bonus: 'Rescue Bonus', common: 'Common', router: 'Router' } as const

const money = (x: number): string => `₹${x.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/** Every ₹ the day booked, from the event log: costs by line with their owner and stream, savings only where an outcome really happened. */
export function MoneyLedger({ state }: { readonly state: DayState }) {
  const costs = costLedger(state)
  const savings = savingsLedger(state)
  const totals = ledgerTotals(state)
  const costTotal = costs.reduce((t, c) => t + c.amount, 0)
  return (
    <section className="ops-card" aria-label="Costs and savings ledger">
      <div className="ops-card-head">
        <h2>Costs &amp; savings booked</h2>
        <span className="ops-muted">from the event log</span>
      </div>
      <p className="ops-note">
        Bonus owed {rupees(totals.liability)} (accrued or pending) · released {rupees(totals.released)} · clawed back {rupees(totals.clawedBack)} · blocked {rupees(totals.blocked)}.
      </p>
      {costs.length === 0 ? (
        <p className="ops-empty">Nothing booked yet. Costs appear as the day runs.</p>
      ) : (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <caption className="sr-only">Cost lines with owner and stream</caption>
            <thead>
              <tr>
                <th scope="col">Cost line</th>
                <th scope="col">Owner</th>
                <th scope="col">Stream</th>
                <th scope="col" className="is-num">
                  Times
                </th>
                <th scope="col" className="is-num">
                  ₹
                </th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.line}>
                  <th scope="row">
                    {c.line}
                    {c.assumption ? <span className="ops-chip">assumption</span> : <span className="ops-chip is-navy">case pack</span>}
                  </th>
                  <td>{c.owner}</td>
                  <td>{STREAM_LABEL[c.stream]}</td>
                  <td className="is-num">{c.count}</td>
                  <td className="is-num">{money(c.amount)}</td>
                </tr>
              ))}
              <tr className="is-total">
                <th scope="row">Total cost</th>
                <td />
                <td />
                <td />
                <td className="is-num">{money(costTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <h3 className="ops-subhead">Savings (booked only on a real outcome)</h3>
      {savings.lines.length === 0 ? (
        <p className="ops-empty">None yet: a second chance or a re-home saves money only once it is delivered; a batched return once it closes.</p>
      ) : (
        <ul className="ops-savings">
          {savings.lines.map((l) => (
            <li key={l.line}>
              <span>
                {l.line} <span className="ops-muted">× {l.count}</span>
              </span>
              <strong>{money(l.amount)}</strong>
            </li>
          ))}
          <li className="is-total">
            <span>Total saved</span>
            <strong>{money(savings.total)}</strong>
          </li>
        </ul>
      )}
    </section>
  )
}
