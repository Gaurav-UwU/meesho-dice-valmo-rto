import { axisFor } from './rangeAxis.ts'

const fmt = (x: number): string => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(1)}`

export interface RangeDiagramProps {
  readonly estimate: number
  /** Where the true effect probably is (95% range, by rider) */
  readonly ci: readonly [number, number]
  readonly breakEven: number
  readonly killFloor: number
}

/**
 * How the decision reads the result, as a picture: three zones on a number line (stop, not proven, scale), and a bar for where the true
 * effect probably is, with a dot for the best guess. GO needs the whole bar past the break-even line.
 */
export function RangeDiagram(p: RangeDiagramProps) {
  const { lo, hi, ticks } = axisFor(p)
  const clampX = (x: number): number => Math.min(hi, Math.max(lo, x))
  const pct = (x: number): number => ((clampX(x) - lo) / (hi - lo)) * 100
  const allPast = p.ci[0] >= p.breakEven
  const summary = `The true effect is probably between ${fmt(p.ci[0])} and ${fmt(p.ci[1])} extra deliveries per 100, best guess ${fmt(p.estimate)}. It pays for itself above ${fmt(p.breakEven)}; below ${fmt(p.killFloor)} it is stopped. The whole bar is ${allPast ? '' : 'not '}past the break-even line.`
  return (
    <figure className="pilot-rg-range">
      <div className="pilot-rg-range-plot" role="img" aria-label={summary}>
        <span className="pilot-rg-zone is-kill" style={{ left: 0, width: `${pct(p.killFloor)}%` }} />
        <span className="pilot-rg-zone is-reprice" style={{ left: `${pct(p.killFloor)}%`, width: `${pct(p.breakEven) - pct(p.killFloor)}%` }} />
        <span className="pilot-rg-zone is-go" style={{ left: `${pct(p.breakEven)}%`, right: 0 }} />
        <span className="pilot-rg-line is-kill" style={{ left: `${pct(p.killFloor)}%` }}>
          <span>stop below {fmt(p.killFloor)}</span>
        </span>
        <span className="pilot-rg-line is-be" style={{ left: `${pct(p.breakEven)}%` }}>
          <span>pays above {fmt(p.breakEven)}</span>
        </span>

        <span className="pilot-rg-row-label is-honest">Where the true effect probably is</span>
        <span className="pilot-rg-bar is-honest" style={{ left: `${pct(p.ci[0])}%`, width: `${Math.max(0.5, pct(p.ci[1]) - pct(p.ci[0]))}%` }} />
        <span className={`pilot-rg-leftend${allPast ? ' is-go' : ''}`} style={{ left: `${pct(p.ci[0])}%` }} />
        <span className="pilot-rg-dot" style={{ left: `${pct(p.estimate)}%` }} />
        <span className="pilot-rg-endlabel" style={{ left: `${pct(p.ci[0])}%` }}>
          {fmt(p.ci[0])}
        </span>
        <span className="pilot-rg-endlabel" style={{ left: `${pct(p.ci[1])}%` }}>
          {fmt(p.ci[1])}
        </span>
      </div>
      <div className="pilot-rg-axis" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} style={{ left: `${pct(t)}%` }}>
            {t > 0 ? `+${t}` : t}
          </span>
        ))}
      </div>
      <p className="pilot-rg-axis-title" aria-hidden="true">
        extra deliveries per 100 flagged orders
      </p>
      <figcaption className="pilot-rg-range-key">
        <span>
          <i className="is-go" /> <b>GO</b> when the whole bar is past the “pays” line
        </span>
        <span>
          <i className="is-kill" /> <b>KILL</b> when the dot is below “stop”, or a safety rule breaks
        </span>
        <span>
          <i className="is-reprice" /> <b>RE-PRICE</b> in between
        </span>
      </figcaption>
    </figure>
  )
}
