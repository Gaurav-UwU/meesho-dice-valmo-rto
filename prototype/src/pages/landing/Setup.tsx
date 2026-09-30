import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { joinUrl, liveAvailable, LIVE_KEY_STORAGE } from '../../store/join.ts'
import { tabSecrets } from '../../store/secrets.ts'
import { useDayControls, useStore, useSyncInfo } from '../../store/StoreContext.tsx'
import { DEFAULT_HUB } from '../../ui/hub.ts'
import { SyncBadge } from '../../ui/SyncBadge.tsx'

const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '[::1]']

const WINDOWS = [
  { route: '/ops', title: 'Ops console', who: 'On a laptop', why: 'The map, the clock, the queues and the numbers.' },
  { route: '/rider', title: 'Rider app', who: 'On a phone or a narrow window', why: 'Deliver, attempt or refuse a stop.' },
  { route: '/customer', title: 'Customer phone', who: 'A second window', why: 'The WhatsApp chat, and where the OTP appears.' },
] as const

const switchMode = (mode: 'demo' | 'live'): void => window.location.assign(`/?mode=${mode}`)

function Qr({ title, url }: { readonly title: string; readonly url: string }) {
  return (
    <figure className="land-qr">
      <QRCodeSVG value={url} size={112} level="M" marginSize={2} title={`QR code for the ${title}`} />
      <figcaption>{title}</figcaption>
    </figure>
  )
}

/** Before step 1: open the windows the demo needs, optionally on phones, and start from a fresh day. */
export function Setup() {
  const store = useStore()
  const shared = store.mode === 'live'
  // Re-render when the device's standing changes, so the QR codes pick up the live key as soon as it is known.
  useSyncInfo(DEFAULT_HUB)
  const { reset } = useDayControls(DEFAULT_HUB)
  const [state, setState] = useState<'idle' | 'confirm' | 'done'>('idle')
  const origin = window.location.origin
  const isLocal = LOCAL_HOSTS.includes(window.location.hostname)
  const canShare = shared || liveAvailable({ url: import.meta.env.VITE_SUPABASE_URL as string | undefined, anon: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined })
  const liveKey = shared ? tabSecrets.get(LIVE_KEY_STORAGE) : undefined
  const deep = (route: string): string => joinUrl({ origin: '', route, hub: DEFAULT_HUB, live: shared, liveKey })

  const startFresh = (): void => {
    setState('idle')
    // Only say "Done" when the reset really happened (a missing admin token or a server refusal leaves the day as it was).
    void reset().then((ok) => setState(ok ? 'done' : 'idle'))
  }

  return (
    <section id="setup" className="land-card land-setup" aria-labelledby="land-setup-h">
      <div className="land-setup-main">
        <h2 id="land-setup-h">
          <span className="land-badge">Before you start</span>
          Open three windows
        </h2>
        <SyncBadge hubId={DEFAULT_HUB} variant="panel" />
        <div className="land-modes" role="group" aria-label="How many devices">
          <button type="button" className={`land-btn land-btn--small${shared ? ' land-btn--outline' : ''}`} aria-pressed={!shared} disabled={!shared} onClick={() => switchMode('demo')}>
            One device (Demo)
          </button>
          <button type="button" className={`land-btn land-btn--small${shared ? '' : ' land-btn--outline'}`} aria-pressed={shared} disabled={shared || !canShare} onClick={() => switchMode('live')}>
            Several devices (shared day)
          </button>
        </div>
        {canShare ? null : <p className="land-muted land-warn">The shared day is not set up on this site yet (it needs the Supabase settings), so phones cannot join. Demo mode works on one device.</p>}
        <p className="land-lead">
          {shared
            ? 'They share one day with every device that joined, including phones, so what you do in one shows up in all of them.'
            : 'They share one day, so what you do in one shows up in the others. Keep them all in the same browser.'}
        </p>
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
              <span>{shared ? "This starts a new day for every device on the shared day (it asks for the admin token)." : "This clears today's demo day in this browser."}</span>
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
                {state === 'done'
                  ? shared
                    ? 'Done. Every device on the shared day switches to the new day within a few seconds.'
                    : 'Done. The next window you open starts on a clean day.'
                  : 'Optional: use it if someone already played with the demo.'}
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
          {shared
            ? 'Scanning opens the screen on the shared day and brings the join key along, so nobody types anything. Keep these codes to your own phones: they contain the key.'
            : 'In Demo mode a phone keeps its own separate day (only windows of one browser share a day). To put phones on the same day, choose "Several devices (shared day)" on the left first, then scan.'}
        </p>
      </aside>
    </section>
  )
}
