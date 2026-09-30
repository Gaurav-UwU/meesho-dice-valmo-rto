import { demoStops } from '../../domain/selectors.ts'
import type { DayState } from '../../domain/types.ts'
import { rupees } from '../../ui/format.ts'

const OTHER_LIMIT = 150

interface Props {
  readonly state: DayState
  readonly orderId: string
  readonly onPick: (orderId: string) => void
}

const label = (state: DayState, id: string): string => {
  const o = state.stops[id]?.order
  if (!o) return id
  return `${o.awb} · ${o.payment === 'COD' ? `COD ${rupees(o.value)}` : 'Prepaid'}`
}

/** Demo helper: choose which customer's WhatsApp this phone shows. Lists only orders that have messages. */
export function OrderSelector({ state, orderId, onPick }: Props) {
  const demo = demoStops(state)
  const withMessages = new Set(state.messages.map((m) => m.orderId))
  const demoIds = new Set([...demo.bonus, ...demo.control])
  const others = state.stopOrder.filter((id) => withMessages.has(id) && !demoIds.has(id)).slice(0, OTHER_LIMIT)
  const controlFirst = demo.control[0]
  const bonusFirst = demo.bonus[0]
  const onControl = demo.control.includes(orderId)

  return (
    <div className="cust-selector">
      <label>
        <span className="sr-only">Customer order</span>
        <select value={orderId} onChange={(e) => onPick(e.target.value)}>
          {demo.bonus.length > 0 ? (
            <optgroup label="Rider A orders (demo)">
              {demo.bonus.map((id) => (
                <option key={id} value={id}>
                  {label(state, id)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {demo.control.length > 0 ? (
            <optgroup label="Rider B orders (demo)">
              {demo.control.map((id) => (
                <option key={id} value={id}>
                  {label(state, id)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {others.length > 0 ? (
            <optgroup label="Other orders with messages">
              {others.map((id) => (
                <option key={id} value={id}>
                  {label(state, id)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {!withMessages.has(orderId) ? <option value={orderId}>{label(state, orderId)}</option> : null}
        </select>
      </label>
      {onControl && bonusFirst ? (
        <button type="button" className="cust-link" onClick={() => onPick(bonusFirst)}>
          Open a Rider A order
        </button>
      ) : controlFirst ? (
        <button type="button" className="cust-link" onClick={() => onPick(controlFirst)}>
          Open a Rider B order
        </button>
      ) : null}
    </div>
  )
}
