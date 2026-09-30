import type { MessageButton, WaMessage } from '../../domain/types.ts'
import { clock } from '../../ui/format.ts'
import { otpCodeOf } from './chatActions.ts'

interface Props {
  readonly msg: WaMessage
  /** True when this is the newest message with buttons and its question is still open */
  readonly live: boolean
  readonly onButton: (button: MessageButton) => void
}

export function MessageBubble({ msg, live, onButton }: Props) {
  const outgoing = msg.direction === 'in' // "in" = from the customer, drawn on the right
  const code = otpCodeOf(msg)
  return (
    <div className={`cust-row ${outgoing ? 'mine' : 'theirs'}`}>
      <div className={`cust-bubble ${outgoing ? 'mine' : 'theirs'}`}>
        {code ? (
          <div className="cust-otp" aria-label={`Code ${code.split('').join(' ')}`}>
            {code}
          </div>
        ) : null}
        <p className="cust-text">{msg.text}</p>
        <span className="cust-time">
          {clock(msg.at)}
          {outgoing ? <span className="cust-ticks" aria-hidden="true"> ✓✓</span> : null}
        </span>
      </div>
      {msg.buttons && msg.buttons.length > 0 ? (
        <div className="cust-buttons">
          {msg.buttons.map((b) => (
            <button key={b.id} type="button" className="cust-btn" disabled={!live} onClick={() => onButton(b)}>
              {b.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
