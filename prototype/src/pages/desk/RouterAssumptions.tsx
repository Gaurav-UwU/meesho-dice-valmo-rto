import { REFUSAL_LABEL, REFUSAL_REASONS } from '../../engine/router.ts'
import type { DayState, RouterParamKey } from '../../domain/types.ts'
import { shelfUsed } from '../../domain/routing.ts'
import type { ActionInput } from '../../store/types.ts'

interface Props {
  readonly day: DayState
  readonly send: (input: ActionInput) => Promise<void>
}

/** The Router's assumptions, in plain numbers the operator can change. Every one of them is an assumption the pilot would measure. */
export function RouterAssumptions({ day, send }: Props) {
  const set = (param: RouterParamKey, raw: string): void => {
    const value = Number(raw)
    if (raw !== '' && Number.isFinite(value)) void send({ type: 'deskSetParam', param, value })
  }
  return (
    <section className="card desk-panel" aria-label="Router assumptions">
      <h3>
        Router assumptions <span className="pill">assumption</span>
      </h3>
      <p className="desk-empty-line">
        Shelf: {shelfUsed(day)} of {day.router.shelfCapacity} slots in use. Change a number and the lanes on the queue re-price at once.
      </p>
      <div className="desk-params">
        {REFUSAL_REASONS.map((reason) => (
          <label key={reason}>
            <span>P(accepts a second chance) · {REFUSAL_LABEL[reason]}</span>
            <input type="number" min={0} max={1} step={0.05} value={day.router.acceptByReason[reason]} onChange={(e) => set(`accept_${reason}`, e.target.value)} />
          </label>
        ))}
        <label>
          <span>Share of nearby demand that converts to a re-home</span>
          <input type="number" min={0} max={1} step={0.05} value={day.router.conversion} onChange={(e) => set('conversion', e.target.value)} />
        </label>
        <label>
          <span>Shelf capacity (parcels)</span>
          <input type="number" min={0} max={500} step={1} value={day.router.shelfCapacity} onChange={(e) => set('shelfCapacity', e.target.value)} />
        </label>
      </div>
    </section>
  )
}
