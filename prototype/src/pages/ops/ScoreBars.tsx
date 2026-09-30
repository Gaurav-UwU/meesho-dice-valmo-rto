import type { Contribution } from '../../engine/rescue.ts'

/** Bars grow right when a factor pushes toward RTO and left when it pulls away. The baseline is left out: it is the same for every order. */
export function ScoreBars({ contributions }: { readonly contributions: readonly Contribution[] }) {
  const factors = contributions.filter((c) => c.label !== 'Baseline').sort((a, b) => b.logit - a.logit)
  const max = Math.max(0.5, ...factors.map((c) => Math.abs(c.logit)))
  return (
    <div>
      <div className="ops-bars-axis" aria-hidden="true">
        <span />
        <span className="ops-bars-axis-labels">
          <span>lowers risk</span>
          <span>raises risk</span>
        </span>
        <span />
      </div>
      <ul className="ops-bars">
        {factors.map((c) => {
          const width = `${(Math.abs(c.logit) / max) * 50}%`
          const raises = c.logit > 0
          return (
            <li key={c.label}>
              <span className="ops-bar-label">{c.label}</span>
              <span className="ops-bar-track" aria-hidden="true">
                {c.logit === 0 ? null : (
                  <span className={`ops-bar-fill ${raises ? 'is-up' : 'is-down'}`} style={raises ? { left: '50%', width } : { right: '50%', width }} />
                )}
              </span>
              <span className="ops-bar-value">
                {c.logit > 0 ? '+' : c.logit < 0 ? '−' : ''}
                {Math.abs(c.logit).toFixed(2)}
                <span className="sr-only">{c.logit > 0 ? ' raises risk' : c.logit < 0 ? ' lowers risk' : ' no effect'}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
