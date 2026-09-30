import { costPerSuccessfulDelivery } from '../../engine/economics.ts'
import { pct, signedRupees } from '../../ui/format.ts'
import { RTO_TARGET, RTO_TODAY, SENSITIVITY_BONUSES, SENSITIVITY_DELTAS } from './pilotModel.ts'

const MAX_POSITIVE = 250
const MAX_NEGATIVE = 110

/** Round half to even, as the deck's table does (₹10 bonus at +10 is exactly 76.5 and shows as 76). */
function roundHalfEven(x: number): number {
  const floor = Math.floor(x)
  const diff = x - floor
  if (diff === 0.5) return floor % 2 === 0 ? floor : floor + 1
  return Math.round(x)
}

const signedCr = (v: number): string => `${v < 0 ? '−' : '+'}${roundHalfEven(Math.abs(v))}`

/** Green for positive, pink for negative; the sign is always in the text so colour is never the only cue. */
function heat(v: number): string {
  if (v >= 0) return `rgba(79, 191, 131, ${0.14 + 0.62 * Math.min(v / MAX_POSITIVE, 1)})`
  return `rgba(237, 11, 125, ${0.14 + 0.5 * Math.min(-v / MAX_NEGATIVE, 1)})`
}

export function SensitivityTable({ table }: { readonly table: readonly (readonly number[])[] }) {
  return (
    <section className="pilot-card" aria-label="Sensitivity table">
      <h2>Sensitivity: net ₹ crore a year</h2>
      <div className="pilot-table-wrap">
        <table className="pilot-heat">
          <thead>
            <tr>
              <th scope="col">Bonus \ extra deliveries per 100</th>
              {SENSITIVITY_DELTAS.map((d) => (
                <th key={d} scope="col">
                  +{d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SENSITIVITY_BONUSES.map((b, i) => (
              <tr key={b}>
                <th scope="row">₹{b}</th>
                {table[i].map((v, j) => (
                  <td key={SENSITIVITY_DELTAS[j]} style={{ background: heat(v) }}>
                    {signedCr(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pilot-note">
        For 153 mn flagged orders a year (20% of 763.5 mn FY25 Valmo orders), on the deck basis: baseline 60%, ₹120 return. This
        table does not move with the sliders, so it always matches slide 5.
      </p>
    </section>
  )
}

export function CostBars({ observedRto }: { readonly observedRto: number }) {
  const rows = [
    { label: `Today, ${pct(RTO_TODAY, 0)} RTO`, value: costPerSuccessfulDelivery(RTO_TODAY), tone: 'is-today' },
    { label: `Deck target, ${pct(RTO_TARGET, 0)} RTO`, value: costPerSuccessfulDelivery(RTO_TARGET), tone: 'is-target' },
    { label: `Your pilot, ${pct(observedRto)} RTO`, value: costPerSuccessfulDelivery(observedRto), tone: 'is-yours' },
  ]
  const max = Math.max(...rows.map((r) => r.value))
  return (
    <section className="pilot-card" aria-label="Cost per successful delivery">
      <h2>Cost per successful delivery</h2>
      <ul className="pilot-bars">
        {rows.map((r) => (
          <li key={r.label}>
            <span className="pilot-bar-label">{r.label}</span>
            <span className="pilot-bar-track">
              <span className={`pilot-bar ${r.tone}`} style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <strong>₹{r.value.toFixed(1)}</strong>
          </li>
        ))}
      </ul>
      <p className="pilot-note">
        (₹50 forward + RTO × ₹120 reverse) / (1 − RTO). The deck goes from ₹84.8 to ₹77.7. Your pilot line takes today's 17% RTO
        minus the network points your uplift saves ({signedRupees(costPerSuccessfulDelivery(RTO_TODAY) - costPerSuccessfulDelivery(observedRto))} per delivery).
      </p>
    </section>
  )
}
