import { demoRiders } from '../../domain/selectors.ts'
import type { DayState } from '../../domain/types.ts'

interface Props {
  readonly state: DayState
  readonly onPick: (riderId: string) => void
}

/** Shown when no ?rider= is set. Nothing here reveals a rider's arm (presenter's note: A is a Bonus rider, B a Control rider). */
export function RiderPicker({ state, onPick }: Props) {
  const { bonus, control } = demoRiders(state)
  return (
    <div className="rider-picker">
      <h2>Choose a rider</h2>
      <p className="rider-muted">Open the app as one of the riders in this hub.</p>
      {bonus ? (
        <button type="button" className="rider-big-btn" onClick={() => onPick(bonus.id)}>
          Demo rider A
          <span>{bonus.name}</span>
        </button>
      ) : null}
      {control ? (
        <button type="button" className="rider-big-btn alt" onClick={() => onPick(control.id)}>
          Demo rider B
          <span>{control.name}</span>
        </button>
      ) : null}
      <label className="rider-field">
        <span>All riders</span>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onPick(e.target.value)
          }}
        >
          <option value="" disabled>
            Select a rider
          </option>
          {state.riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.id})
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
