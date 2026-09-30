import type { DayState } from '../domain/types.ts'
import type { HubId } from '../engine/types.ts'
import { isDayState } from './guards.ts'
import type { ActionInput, Store } from './types.ts'

/** Where the browser reads the shared day from (Supabase in production, a fake in tests). */
export interface DayFeed {
  fetchDay(hubId: HubId): Promise<DayState | null>
  /** Call `onState` whenever the stored day changes. Returns a function that stops listening. */
  watch(hubId: HubId, onState: (state: DayState) => void): () => void
}

export interface CallResult {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
}

export interface LiveStoreOptions {
  readonly feed: DayFeed
  /** Call the server API (POST/GET to /api/...) */
  readonly call: (path: string, init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string }) => Promise<CallResult>
  readonly getLiveKey: () => string | undefined
  readonly getAdminToken: () => string | undefined
  /** Show a problem to the person using the screen (a toast). The store never throws at a button press. */
  readonly onError: (message: string) => void
  /** Safety net if Realtime is slow or blocked: re-read the day this often (ms). 0 turns it off. */
  readonly pollMs?: number
}

const DEFAULT_POLL_MS = 5000

const errorText = async (r: CallResult): Promise<string> => {
  try {
    const body = (await r.json()) as { error?: unknown }
    return typeof body.error === 'string' ? body.error : `The server said no (${r.status})`
  } catch {
    return `The server said no (${r.status})`
  }
}

/**
 * Live mode: the day lives on the server. Every screen reads it from Supabase (live updates) and sends its taps to /api,
 * where OTPs are generated and checked and real WhatsApp messages are sent. Same interface as the Demo-mode store.
 */
export function createLiveStore(opts: LiveStoreOptions): Store {
  const days = new Map<HubId, DayState>()
  const started = new Map<HubId, Promise<void>>()
  const listeners = new Set<() => void>()
  const notify = (): void => listeners.forEach((l) => l())

  const adopt = (hubId: HubId, incoming: unknown): void => {
    // Whatever arrives from the network is untrusted: a malformed day would crash every screen.
    if (!isDayState(incoming)) return
    const state = incoming
    const cur = days.get(hubId)
    if (cur && state.version < cur.version) return
    if (cur && state.version === cur.version && state.seed === cur.seed) return
    days.set(hubId, state)
    notify()
  }

  const refresh = async (hubId: HubId): Promise<void> => {
    try {
      const s = await opts.feed.fetchDay(hubId)
      if (s) adopt(hubId, s)
    } catch {
      // A missed read is fixed by the next update or poll.
    }
  }

  const post = async (path: string, payload: unknown, headers: Record<string, string>): Promise<boolean> => {
    try {
      const res = await opts.call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) })
      if (!res.ok) {
        opts.onError(await errorText(res))
        return false
      }
      return true
    } catch {
      opts.onError('Could not reach the server. Check your connection.')
      return false
    }
  }

  const liveHeaders = (): Record<string, string> => {
    const key = opts.getLiveKey()
    return key ? { 'x-live-key': key } : {}
  }

  const adminHeaders = (): Record<string, string> | null => {
    const token = opts.getAdminToken()
    return token ? { authorization: `Bearer ${token}` } : null
  }

  const ensureDay = (hubId: HubId): Promise<void> => {
    const existing = started.get(hubId)
    if (existing) return existing
    const p = (async () => {
      try {
        await opts.call(`/api/day?hub=${hubId}`, { method: 'GET', headers: liveHeaders() })
      } catch {
        // The server may be asleep; the read below still tells us what exists.
      }
      await refresh(hubId)
      opts.feed.watch(hubId, (s) => adopt(hubId, s))
      const every = opts.pollMs ?? DEFAULT_POLL_MS
      if (every > 0) setInterval(() => void refresh(hubId), every)
    })()
    started.set(hubId, p)
    return p
  }

  const send = async (hubId: HubId, input: ActionInput): Promise<void> => {
    await ensureDay(hubId)
    if (await post('/api/action', { hubId, action: input }, liveHeaders())) await refresh(hubId)
  }

  const admin = async (hubId: HubId, body: Record<string, unknown>): Promise<void> => {
    await ensureDay(hubId)
    const headers = adminHeaders()
    if (!headers) {
      opts.onError('The admin token is needed for this button')
      return
    }
    if (await post('/api/admin', { ...body, hubId }, headers)) await refresh(hubId)
  }

  return {
    mode: 'live',
    getState: (hubId) => days.get(hubId),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    ensureDay,
    send,
    autopilot: (hubId, count) => admin(hubId, { op: 'autopilot', count }),
    reset: (hubId, seed) => admin(hubId, seed === undefined ? { op: 'reset' } : { op: 'reset', seed }),
  }
}
