import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/tokens.css'
import App from './App.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary.tsx'
import { showToast } from './ui/toast.ts'
import { loadGeo } from './store/geo.ts'
import { createLiveStore } from './store/live.ts'
import { createLocalStore, type ChannelLike, type KeyValue } from './store/local.ts'
import type { Store } from './store/types.ts'
import { createSupabaseFeed } from './store/supabaseFeed.ts'
import { StoreProvider } from './store/StoreContext.tsx'

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

/** Ask once per browser tab and remember for the tab (sessionStorage), so keys are never stored on disk or in the URL. */
const declined = new Set<string>()

function tabSecret(name: string, question: string): string | undefined {
  try {
    const have = window.sessionStorage.getItem(name)
    if (have) return have
    if (declined.has(name)) return undefined
    const answer = window.prompt(question)?.trim()
    if (!answer) declined.add(name)
    if (answer) window.sessionStorage.setItem(name, answer)
    return answer || undefined
  } catch {
    return undefined
  }
}

/**
 * Demo mode is the default and needs nothing. Live mode (real WhatsApp, shared across devices) is chosen with ?mode=live
 * and only when the Supabase settings were built in; otherwise we quietly stay in Demo mode.
 */
function chooseStore(): Store {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  let wantsLive = false
  try {
    const q = new URLSearchParams(window.location.search).get('mode')
    if (q) window.sessionStorage.setItem('rescue-mode', q)
    wantsLive = window.sessionStorage.getItem('rescue-mode') === 'live'
  } catch {
    wantsLive = false
  }
  if (wantsLive && url && anon) {
    return createLiveStore({
      feed: createSupabaseFeed(url, anon),
      call: (path, init) => fetch(path, init),
      getLiveKey: () => tabSecret('rescue-live-key', 'Live key (ask the team)'),
      getAdminToken: () => tabSecret('rescue-admin-token', 'Admin token (ask the team)'),
      onError: (message) => showToast(message),
    })
  }
  return createLocalStore({ loadGeo, storage: safeStorage(), channel: safeChannel() })
}

const store = chooseStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider store={store}>
        <App />
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>,
)
