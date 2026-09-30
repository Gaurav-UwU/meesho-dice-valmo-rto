import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/tokens.css'
import App from './App.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary.tsx'
import { showToast } from './ui/toast.ts'
import { loadGeo } from './store/geo.ts'
import { createLiveStore } from './store/live.ts'
import { chooseMode, liveAvailable, LIVE_KEY_STORAGE, MODE_STORAGE, parseJoin } from './store/join.ts'
import { askOnce, tabSecrets } from './store/secrets.ts'
import { createLocalStore, type ChannelLike, type KeyValue } from './store/local.ts'
import type { Store } from './store/types.ts'
import { createSupabaseFeed } from './store/supabaseFeed.ts'
import { StoreProvider } from './store/StoreContext.tsx'
import { wireResync } from './store/wire.ts'

/** Storage and tabs can be blocked (private window, file previews). The demo must still run in memory. */
function safeStorage(): KeyValue | undefined {
  try {
    const probe = '__rescue_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return undefined
  }
}

function safeChannel(): ChannelLike | undefined {
  try {
    if (typeof BroadcastChannel === 'undefined') return undefined
    const bc = new BroadcastChannel('rescue-console')
    return {
      postMessage: (m) => bc.postMessage(m),
      listen: (handler) => {
        bc.onmessage = (e) => handler(e.data)
      },
    }
  } catch {
    return undefined
  }
}

/**
 * A link or QR code can carry the mode (?mode=live) and, after the #, the live key. Read them once, keep them for this tab only
 * (sessionStorage), and take the key out of the address bar so it is not left on screen or in the history.
 */
function consumeJoinLink(): { requested: string | null; remembered: string | null } {
  const join = parseJoin(window.location.search, window.location.hash)
  let remembered: string | null = null
  try {
    if (join.mode) window.sessionStorage.setItem(MODE_STORAGE, join.mode)
    remembered = window.sessionStorage.getItem(MODE_STORAGE)
  } catch {
    // Storage blocked: the link itself still decides for this page load.
  }
  if (join.liveKey) {
    tabSecrets.set(LIVE_KEY_STORAGE, join.liveKey)
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    } catch {
      // Not critical: the key just stays in the address bar.
    }
  }
  return { requested: join.mode ?? null, remembered }
}

/**
 * Demo mode is the default and needs nothing: this device has its own day (and says so). Several devices on one day is Live mode,
 * chosen with ?mode=live (the landing page's QR codes do this) and only possible when the Supabase settings were built in.
 * If it was asked for and cannot be offered, the device stays in Demo mode and SAYS it is alone, and why.
 */
function chooseStore(): Store {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const choice = chooseMode({ ...consumeJoinLink(), liveAvailable: liveAvailable({ url, anon }) })
  if (choice.mode === 'live' && url && anon) {
    return createLiveStore({
      feed: createSupabaseFeed(url, anon),
      call: (path, init) => fetch(path, init),
      getLiveKey: () => askOnce(tabSecrets, (q) => window.prompt(q), LIVE_KEY_STORAGE, 'Live key (ask the team, or scan the QR code on the landing page)'),
      getAdminToken: () => askOnce(tabSecrets, (q) => window.prompt(q), 'rescue-admin-token', 'Admin token (ask the team)'),
      onError: (message) => showToast(message),
    })
  }
  return createLocalStore({ loadGeo, storage: safeStorage(), channel: safeChannel(), ...(choice.aloneReason ? { aloneReason: choice.aloneReason } : {}) })
}

const store = chooseStore()
wireResync(store, window, document)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider store={store}>
        <App />
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>,
)
