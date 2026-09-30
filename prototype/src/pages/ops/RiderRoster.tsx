import { rupees } from '../../ui/format.ts'
import type { RiderAttemptRecord } from '../../domain/selectors.ts'
import type { RosterRow } from './model.ts'

export function RiderRoster({ rows, records, hubId }: { readonly rows: readonly RosterRow[]; readonly records: readonly RiderAttemptRecord[]; readonly hubId: string }) {
  const recordOf = (id: string): RiderAttemptRecord | undefined => records.find((r) => r.riderId === id)
  return (
    <section className="ops-card" aria-label="Rider roster">
      <div className="ops-card-head">
        <h2>Rider roster</h2>
        <span className="ops-muted">{rows.length} riders · Bonus and Control arms</span>
      </div>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <caption className="sr-only">Riders with their arm, progress, deliveries and earnings</caption>
          <thead>
            <tr>
              <th scope="col">Rider</th>
              <th scope="col">Arm</th>
              <th scope="col" className="is-num">
                Stops done / total
              </th>
              <th scope="col" className="is-num">
                Delivered
              </th>
              <th scope="col" className="is-num">
                Earnings
              </th>
              <th scope="col" className="is-num">
                Pending bonus
              </th>
              <th scope="col" className="is-num">
                Released / clawed back
              </th>
              <th scope="col" className="is-num">
                Fake-attempt rate
              </th>
              <th scope="col">
                <span className="sr-only">Rider app</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ rider, done, total, delivered, earnings, isDemo }) => (
              <tr key={rider.id} className={isDemo ? 'is-demo' : undefined}>
                <th scope="row">
                  {rider.name}
                  {isDemo ? <span className="ops-chip is-navy">Demo rider</span> : null}
                </th>
                <td>
                  <span className={`ops-chip ${rider.arm === 'bonus' ? 'is-green' : ''}`}>{rider.arm === 'bonus' ? 'Bonus' : 'Control'}</span>
                </td>
                <td className="is-num">
                  {done} / {total}
                </td>
                <td className="is-num">{delivered}</td>
                <td className="is-num">{rupees(earnings.total)}</td>
                <td className="is-num">
                  {rider.arm === 'bonus' ? rupees(earnings.bonusPending) : <span className="ops-muted">n/a</span>}
                  {earnings.bonusBlocked > 0 ? <span className="ops-bad"> ({rupees(earnings.bonusBlocked)} blocked)</span> : null}
                </td>
                <td className="is-num">
                  {rider.arm === 'bonus' ? `${rupees(earnings.bonusReleased)} / ${rupees(earnings.bonusClawedBack)}` : <span className="ops-muted">n/a</span>}
                </td>
                <td className="is-num">
                  {(() => {
                    const rec = recordOf(rider.id)
                    if (!rec || rec.attempts === 0) return <span className="ops-muted">no attempts</span>
                    return (
                      <span className={rec.strikes > 0 ? 'ops-bad' : undefined}>
                        {(rec.fakeRate * 100).toFixed(0)}% ({rec.strikes} of {rec.attempts})
                      </span>
                    )
                  })()}
                </td>
                <td>
                  <a
                    className="ops-link"
                    href={`/rider?hub=${hubId}&rider=${encodeURIComponent(rider.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open rider app for ${rider.name} in a new tab`}
                  >
                    Open rider app
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
