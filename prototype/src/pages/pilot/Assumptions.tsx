import { TARGET_SHARES, targetingFor } from '../../engine/targeting.ts'
import { DEFAULT_VERDICT_CONFIG } from '../../engine/verdict.ts'
import { DEFAULT_CONTROLS, withTargeting, type Controls } from './pilotModel.ts'
import { breaches, type NumericKey, type SliderSpec } from './sliders.ts'

const signed = (v: number): string => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`
const pts = (v: number): string => `${signed(v)} pts`
const g = DEFAULT_VERDICT_CONFIG.guardrails

const UPLIFT: SliderSpec = { key: 'uplift', label: 'How much the bonus helps', min: 0, max: 25, step: 0.5, format: (v) => `${signed(v)} per 100`, help: 'Extra deliveries per 100 flagged orders. Nobody knows yet: that is what the pilot measures.' }
const BONUS: SliderSpec = { key: 'bonus', label: 'Bonus per delivery', min: 5, max: 30, step: 1, format: (v) => `₹${v}`, help: 'Paid to the rider when a flagged order is delivered.' }

const SIZE: readonly SliderSpec[] = [
  { key: 'ridersPerHub', label: 'Riders per hub', min: 6, max: 24, step: 2, format: (v) => `${v}`, help: 'More riders make the answer surer, fastest.' },
  { key: 'days', label: 'Days', min: 10, max: 60, step: 1, format: (v) => `${v}`, help: 'A longer pilot, a surer answer.' },
  { key: 'flaggedPerDay', label: 'Flagged orders a day, per hub', min: 20, max: 200, step: 10, format: (v) => `${v}`, help: 'Set by "who gets it"; change it to test volume.' },
  { key: 'baseline', label: 'Flagged orders delivered without the bonus', min: 40, max: 80, step: 1, format: (v) => `${v}%`, help: 'Set by "who gets it"; riskier orders are delivered less.' },
]

const SAFETY: readonly SliderSpec[] = [
  { key: 'spillover', label: 'Normal orders', min: -3, max: 1, step: 0.5, format: pts, limit: { value: g.normalOrderDeltaPts, breaksWhen: 'below' } },
  { key: 'falseAttempts', label: 'Fake attempts', min: 0, max: 15, step: 1, format: (v) => `${v}%`, limit: { value: g.falseAttemptRate * 100, breaksWhen: 'above' } },
]

/** One tap each. They change what you believe, never "who gets it". */
const SCENARIOS: readonly { readonly label: string; readonly patch: Partial<Controls> }[] = [
  { label: 'Deck assumption', patch: {} },
  { label: 'It works well', patch: { uplift: 20 } },
  { label: 'It does nothing', patch: { uplift: 0 } },
  { label: 'It hurts normal orders', patch: { uplift: 15, spillover: -3 } },
  { label: 'Fake attempts rise', patch: { uplift: 15, falseAttempts: 9 } },
]

export function Slider({ spec, value, onChange }: { readonly spec: SliderSpec; readonly value: number; readonly onChange: (v: number) => void }) {
  const id = `pilot-${spec.key}`
  const broken = spec.limit ? breaches(spec.limit, value) : false
  return (
    <div className={`pilot-field${broken ? ' is-broken' : ''}`}>
      <div className="pilot-field-head">
        <label htmlFor={id}>{spec.label}</label>
        <output htmlFor={id}>{spec.format(value)}</output>
      </div>
      <input id={id} type="range" min={spec.min} max={spec.max} step={spec.step} value={value} aria-valuetext={spec.format(value)} onChange={(e) => onChange(Number(e.target.value))} />
      {spec.limit ? (
        <p className="pilot-limit">
          {broken ? <strong>Breaks the safety rule</strong> : 'OK'} · limit {spec.format(spec.limit.value)}
        </p>
      ) : spec.help ? (
        <p>{spec.help}</p>
      ) : null}
    </div>
  )
}

interface Props {
  readonly controls: Controls
  readonly onChange: (next: Controls) => void
}

/** Step 1: who gets the bonus, how much it helps, how big it is. Everything else is one click away under "More settings". */
export function Assumptions({ controls, onChange }: Props) {
  const set = (key: NumericKey) => (v: number) => onChange({ ...controls, [key]: v })
  const apply = (patch: Partial<Controls>): void =>
    onChange({ ...DEFAULT_CONTROLS, flaggedShare: controls.flaggedShare, baseline: controls.baseline, flaggedPerDay: controls.flaggedPerDay, ...patch, seed: controls.seed })
  const broken = SAFETY.filter((s) => s.limit && breaches(s.limit, controls[s.key])).length
  return (
    <section className="pilot-card pilot-assume" aria-label="Pilot inputs">
      <h2>
        <span className="pilot-stepnum">1</span> Your assumptions
      </h2>
      <div className="pilot-assume-grid">
        <div className="pilot-field">
          <div className="pilot-field-head">
            <span className="pilot-label" id="pilot-who">
              Who gets the bonus
            </span>
            <output>{controls.baseline}% delivered anyway</output>
          </div>
          <div className="pilot-segment" role="radiogroup" aria-labelledby="pilot-who">
            {TARGET_SHARES.map((share) => (
              <button
                key={share}
                type="button"
                role="radio"
                aria-checked={share === controls.flaggedShare}
                className={share === controls.flaggedShare ? 'is-on' : undefined}
                onClick={() => onChange(withTargeting(controls, share))}
              >
                <strong>Top {share}%</strong>
                <small>{targetingFor(share).baselineSuccess}% base</small>
              </button>
            ))}
          </div>
          <p>
            Our assumption: the riskiest {controls.flaggedShare}% fail about {100 - controls.baseline}% of the time (vs 17% overall). The Control group measures it.
          </p>
        </div>
        <Slider spec={UPLIFT} value={controls.uplift} onChange={set('uplift')} />
        <Slider spec={BONUS} value={controls.bonus} onChange={set('bonus')} />
      </div>

      <div className="pilot-scenarios" role="group" aria-label="Start from a scenario">
        <span>Try:</span>
        {SCENARIOS.map((s) => (
          <button key={s.label} type="button" className="pilot-chip" onClick={() => apply(s.patch)}>
            {s.label}
          </button>
        ))}
      </div>

      <details className="pilot-more">
        <summary>
          <span>More settings</span>
          <em>
            {controls.ridersPerHub} riders · {controls.days} days · {broken > 0 ? `${broken} safety rule broken` : 'safety rules OK'}
          </em>
        </summary>
        <div className="pilot-more-grid">
          <div>
            <h3>Pilot size and baseline</h3>
            {SIZE.map((s) => (
              <Slider key={s.key} spec={s} value={controls[s.key]} onChange={set(s.key)} />
            ))}
          </div>
          <div>
            <h3>Safety rules (side effects of the bonus)</h3>
            {SAFETY.map((s) => (
              <Slider key={s.key} spec={s} value={controls[s.key]} onChange={set(s.key)} />
            ))}
          </div>
        </div>
        <div className="pilot-field pilot-rulebox">
          <div className="pilot-field-head">
            <label htmlFor="pilot-ruleChanged">Loosen the rule after seeing the result</label>
            <input id="pilot-ruleChanged" type="checkbox" checked={controls.ruleChanged} onChange={(e) => onChange({ ...controls, ruleChanged: e.target.checked })} />
          </div>
          <p>The rule is locked before the pilot starts. Changing it afterwards makes the result unusable.</p>
        </div>
        <div className="pilot-buttons">
          <button type="button" className="pilot-btn" onClick={() => onChange({ ...controls, seed: Math.floor(Math.random() * 1_000_000) })}>
            Re-roll the luck
          </button>
          <button type="button" className="pilot-btn" onClick={() => onChange(DEFAULT_CONTROLS)}>
            Reset everything
          </button>
          <span className="pilot-seed">Seed {controls.seed}: same settings, same pilot.</span>
        </div>
      </details>
    </section>
  )
}
