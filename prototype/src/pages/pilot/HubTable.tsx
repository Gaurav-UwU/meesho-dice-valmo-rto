import { getHub } from '../../engine/hubs.ts'
import type { HubResult, PilotResult } from '../../engine/pilot.ts'
import { pct } from '../../ui/format.ts'

const num = (x: number, digits = 1): string => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(digits)}`

interface RowProps {
  readonly name: string
  readonly detail?: string
  readonly r: HubResult
  readonly isPooled?: boolean
}

function Row({ name, detail, r, isPooled = false }: RowProps) {
  return (
    <tr className={isPooled ? 'is-pooled' : undefined}>
      <th scope="row">
        {name}
        {detail ? <small>{detail}</small> : null}
      </th>
      <td>{pct(r.flagged.bonus.rate)}</td>
      <td>{pct(r.flagged.control.rate)}</td>
      <td>
        <strong>{num(r.upliftPer100)}</strong>
        <small>
          95% range {num(r.ci95[0])} to {num(r.ci95[1])}
        </small>
      </td>
      <td>
        {num(r.normalDeltaPts)} pts
        <small>
          range {num(r.normalCi95[0])} to {num(r.normalCi95[1])}
        </small>
      </td>
    </tr>
  )
}

export function HubTable({ result }: { readonly result: PilotResult }) {
  return (
    <section className="pilot-card" aria-label="Results by hub">
      <h2>Bonus vs Control, hub by hub</h2>
      <div className="pilot-table-wrap">
        <table className="pilot-table">
          <thead>
            <tr>
              <th scope="col">Hub</th>
              <th scope="col">Bonus rate</th>
              <th scope="col">Control rate</th>
              <th scope="col">Uplift per 100 flagged</th>
              <th scope="col">Normal-order delta</th>
            </tr>
          </thead>
          <tbody>
            {result.hubs.map((h) => {
              const hub = getHub(h.hubId)
              return <Row key={h.hubId} name={hub.name} detail={`${hub.state} · ${hub.tier}`} r={h} />
            })}
            <Row name="All 4 hubs pooled" r={result.pooled} isPooled />
          </tbody>
        </table>
      </div>
      <p className="pilot-note">
        Every hub starts from the same rate. Each hub has only {result.hubs[0]?.pairs ?? 0} pairs of riders, so hub rows are wide; the pooled row has {result.pooled.pairs}. Rates are the share of flagged
        orders delivered in each group.
      </p>
    </section>
  )
}
