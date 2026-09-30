import { useEffect, useRef } from 'react'
import { messagesFor } from '../../domain/selectors.ts'
import type { DayState, MessageButton } from '../../domain/types.ts'
import type { LatLng } from '../../engine/geo.ts'
import type { Hub } from '../../engine/types.ts'
import { useSend } from '../../store/StoreContext.tsx'
import { Footer } from '../../ui/Footer.tsx'
import { actionForButton, isMessageLive, latestButtonMessageId } from './chatActions.ts'
import { LocationBar } from './LocationBar.tsx'
import { MessageBubble } from './MessageBubble.tsx'

interface Props {
  readonly state: DayState
  readonly hub: Hub
  readonly orderId: string
}

/** The chat itself: messages, live buttons and, after "Fix address", the share-location step. */
export function ChatView({ state, hub, orderId }: Props) {
  const send = useSend(hub.id)
  const scroller = useRef<HTMLDivElement>(null)
  const messages = messagesFor(state, orderId)
  const stop = state.stops[orderId]
  const latestId = latestButtonMessageId(messages)
  const showLocationBar =
    stop !== undefined &&
    stop.replies.includes('fix_address') &&
    (stop.status === 'out_for_delivery' || stop.status === 'otp_sent' || stop.status === 'rescheduled')

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, orderId, showLocationBar])

  const onButton = (msg: (typeof messages)[number], button: MessageButton): void => {
    const action = actionForButton(state, msg, button)
    if (action) void send(action)
  }

  const shareLocation = (location: LatLng): void => {
    void send({ type: 'customerReply', orderId, reply: 'fix_address', location })
  }

  return (
    <>
      <div className="cust-chat" ref={scroller}>
        <div className="cust-day">Today</div>
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} live={isMessageLive(state, m, latestId)} onButton={(b) => onButton(m, b)} />
        ))}
        <Footer />
      </div>
      {showLocationBar && stop ? <LocationBar hub={hub} current={stop.order} shared={stop.location !== undefined} onShare={shareLocation} /> : null}
    </>
  )
}
