import type { Gate as GateResult, RefusedParcel } from '../../engine/router.ts'
import type { WhatIfFlips, WhatIfGate } from '../../engine/whatif.ts'
import { toggleableGate } from './lanes.ts'

interface GateListProps {
  readonly gates: readonly GateResult[]
  /** The parcel as it really is: the what-if switches start from these values */
  readonly parcel: RefusedParcel
  /** The what-if flips the operator has tried (kept in the screen only, never saved) */
  readonly flips: WhatIfFlips
  /** The one-line result of those flips, or '' */
  readonly preview: string
  /** What-if toggles work only while the parcel is still queued. */
  readonly editable: boolean
  readonly onToggle: (gate: WhatIfGate, value: boolean) => void
  readonly onClear: () => void
}

export function GateList({ gates, parcel, flips, preview, editable, onToggle, onClear }: GateListProps) {
  const tried = Object.keys(flips).length > 0
  return (
    <section className="desk-gates" aria-label="Router gate checklist">
      <div className="desk-gates-head">
        <h4>Gate checklist</h4>
        <span className="desk-whatif">Try a what-if: a preview only, it never changes the parcel</span>
      </div>
      <ul>
        {gates.map((gate) => {
          const key = toggleableGate(gate)
          return (
            <li key={gate.name} className={gate.pass ? 'desk-gate is-pass' : 'desk-gate is-fail'}>
              <span className="desk-gate-icon" aria-hidden="true">
                {gate.pass ? '✓' : '✕'}
              </span>
              <span className="desk-gate-text">
                <strong>{gate.name}</strong>
                <span className="sr-only">{gate.pass ? ' passed. ' : ' failed. '}</span>
                <small>{gate.note}</small>
              </span>
              {key ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={flips[key] ?? parcel[key]}
                  aria-label={`What-if: ${gate.name}`}
                  className={flips[key] === undefined ? 'desk-switch' : 'desk-switch is-tried'}
                  disabled={!editable}
                  onClick={() => onToggle(key, !(flips[key] ?? parcel[key]))}
                />
              ) : (
                <span className="desk-fixed">fact</span>
              )}
            </li>
          )
        })}
      </ul>
      {preview !== '' ? (
        <p className="desk-whatif-line" role="status" aria-label="What-if result">
          <strong>What-if, nothing saved:</strong> {preview}
        </p>
      ) : null}
      {tried ? (
        <button type="button" className="btn desk-whatif-clear" onClick={onClear}>
          Clear what-if
        </button>
      ) : null}
    </section>
  )
}
