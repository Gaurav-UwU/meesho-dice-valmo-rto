import type { Gate as GateKey } from '../../domain/types.ts'
import type { Gate as GateResult } from '../../engine/router.ts'
import { toggleableGate } from './lanes.ts'

interface GateListProps {
  readonly gates: readonly GateResult[]
  /** What-if toggles work only while the parcel is still queued. */
  readonly editable: boolean
  readonly onToggle: (gate: GateKey, value: boolean) => void
}

export function GateList({ gates, editable, onToggle }: GateListProps) {
  return (
    <section className="desk-gates" aria-label="Router gate checklist">
      <div className="desk-gates-head">
        <h4>Gate checklist</h4>
        <span className="desk-whatif">Toggles are a what-if for the demo</span>
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
                  aria-checked={gate.pass}
                  aria-label={`What-if: ${gate.name}`}
                  className="desk-switch"
                  disabled={!editable}
                  onClick={() => onToggle(key, !gate.pass)}
                />
              ) : (
                <span className="desk-fixed">fact</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
