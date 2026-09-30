import { useSearchParams } from 'react-router-dom'
import { demoStops, messagesFor } from '../domain/selectors.ts'
import { useDay, useStore } from '../store/StoreContext.tsx'
import { Footer } from '../ui/Footer.tsx'
import { useHubParam } from '../ui/hub.ts'
import { PhoneFrame } from '../ui/PhoneFrame.tsx'
import { ChatView } from './customer/ChatView.tsx'
import './customer/customer.css'
import { OrderSelector } from './customer/OrderSelector.tsx'
import { StartDayShortcut } from './rider/StartDayShortcut.tsx'

/** Demo-mode stand-in for the customer's WhatsApp. /customer?hub=lucknow&order=<orderId> */
export default function Customer() {
  const { hub } = useHubParam()
  const state = useDay(hub.id)
  const store = useStore()
  const [params, setParams] = useSearchParams()

  const pick = (orderId: string): void => {
    const next = new URLSearchParams(params)
    next.set('order', orderId)
    setParams(next, { replace: true })
  }

  const requested = params.get('order')
  const orderId = requested ?? (state ? demoStops(state).bonus[0] : undefined)
  const hasChat = state !== undefined && orderId !== undefined && messagesFor(state, orderId).length > 0

  return (
    <PhoneFrame label="Customer phone (WhatsApp)">
      <div className="cust-root">
        <header className="cust-header">
          <div className="cust-avatar" aria-hidden="true">
            V
          </div>
          <div>
            <h1>
              Valmo <span className="cust-verified" aria-label="verified">✓</span>
            </h1>
            <p>Business account</p>
          </div>
        </header>
        {store.mode === 'demo' ? <div className="cust-banner">Demo-mode phone. In Live mode this is your real WhatsApp.</div> : null}
        {state && orderId ? <OrderSelector state={state} orderId={orderId} onPick={pick} /> : null}
        {state && orderId && hasChat ? (
          <ChatView state={state} hub={hub} orderId={orderId} />
        ) : (
          <div className="cust-chat">
            <p className="cust-empty">
              {!state
                ? 'Loading…'
                : state.started
                  ? 'No messages for this customer yet.'
                  : 'No messages yet. The ops team has not started the day.'}
            </p>
            {state && !state.started ? <StartDayShortcut hubId={hub.id} /> : null}
            <Footer />
          </div>
        )}
      </div>
    </PhoneFrame>
  )
}
