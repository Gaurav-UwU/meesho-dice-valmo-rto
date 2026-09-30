import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { useDayControls } from '../../store/StoreContext.tsx'
import { DEFAULT_HUB } from '../../ui/hub.ts'

const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '[::1]']

const WINDOWS = [
  { route: '/ops', title: 'Ops console', who: 'On a laptop', why: 'The map, the clock, the queues and the numbers.' },
  { route: '/rider', title: 'Rider app', who: 'On a phone or a narrow window', why: 'Deliver, attempt or refuse a stop.' },
  { route: '/customer', title: 'Customer phone', who: 'A second window', why: 'The WhatsApp chat, and where the OTP appears.' },
] as const

const deep = (route: string): string => `${route}?hub=${DEFAULT_HUB}`

function Qr({ title, url }: { readonly title: string; readonly url: string }) {
  return (
    <figure className="land-qr">
      <QRCodeSVG value={url} size={112} level="M" marginSize={2} title={`QR code for the ${title}`} />
      <figcaption>{title}</figcaption>
    </figure>
  )
}

/** Before step 1: open the windows the demo needs, optionally on a phone, and start from a fresh day. */
export function Setup() {
  const { reset } = useDayControls(DEFAULT_HUB)
  const [state, setState] = useState<'idle' | 'confirm' | 'done'>('idle')
  const origin = window.location.origin
  const isLocal = LOCAL_HOSTS.includes(window.location.hostname)

  const startFresh = (): void => {
    setState('done')
    void reset()
  }

  return (
    <section id="setup" className="land-card land-setup" aria-labelledby="land-setup-h">
      <div className="land-setup-main">
        <h2 id="land-setup-h">
          <span className="land-badge">Before you start</span>
          Open three windows
        </h2>
        <p className="land-lead">They share one day, so what you do in one shows up in the others. Keep them all in the same browser.</p>
        <ul className="land-windows">
          {WINDOWS.map((w) => (
            <li key={w.route}>
              <div>
                <strong>{w.title}</strong>
                <span>
                  {w.who}. {w.why}
                </span>
              </div>
              <a className="land-btn land-btn--small" href={deep(w.route)} target="_blank" rel="noopener noreferrer">
                Open<span className="sr-only"> {w.title} in a new tab</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="land-fresh">
          {state === 'confirm' ? (
            <span role="group" aria-label="Confirm a fresh day">
              <span>This clears today&apos;s demo day in this browser.</span>
              <button type="button" className="land-btn land-btn--small" onClick={startFresh}>
                Yes, start fresh
              </button>
              <button type="button" className="land-linkbtn" onClick={() => setState('idle')}>
                Cancel
              </button>
            </span>
          ) : (
            <>
              <button type="button" className="land-btn land-btn--outline land-btn--small" onClick={() => setState('confirm')}>
                Start with a fresh day
              </button>
              <span className="land-muted" role="status">
                {state === 'done' ? 'Done. The next window you open starts on a clean day.' : 'Optional: use it if someone already played with the demo.'}
              </span>
            </>
          )}
        </div>
      </div>
      <aside className="land-setup-phone" aria-label="Open on a phone">
        <h3>Prefer a real phone?</h3>
        <div className="land-qr-row">
          <Qr title="Rider app" url={`${origin}${deep('/rider')}`} />
          <Qr title="Customer" url={`${origin}${deep('/customer')}`} />
        </div>
        <p className={isLocal ? 'land-muted land-warn' : 'land-muted'}>
          {isLocal ? 'You are on localhost, which a phone cannot reach: use the deployed link. ' : ''}
          In Demo mode a phone keeps its own separate day (only windows of one browser share a day), so use it to try one screen on its own.
        </p>
      </aside>
    </section>
  )
}
