import type { AloneReason } from './types.ts'

/** Where a tab remembers its mode and the live key. Per tab (sessionStorage) so a key is never kept on disk. */
export const MODE_STORAGE = 'rescue-mode'
/** The RIDER key: what the rider and customer QR codes carry. */
export const LIVE_KEY_STORAGE = 'rescue-live-key'
/** The CAPTAIN key: the team's own, kept for this tab only and never put in a link or QR code. */
export const CAPTAIN_KEY_STORAGE = 'rescue-captain-key'

export interface JoinRequest {
  readonly mode?: 'live' | 'demo'
  readonly liveKey?: string
}

const MAX_KEY = 200

/**
 * What a link or QR code asks for. The mode is in the query (?mode=live); the live key is after the # (#k=...), because the part after
 * the # is never sent to a server or written in its logs, and the page removes it from the address bar as soon as it has read it.
 */
export function parseJoin(search: string, hash: string): JoinRequest {
  const mode = new URLSearchParams(search).get('mode')
  const rawKey = new URLSearchParams(hash.replace(/^#/, '')).get('k')
  const liveKey = rawKey && rawKey.length <= MAX_KEY ? rawKey : undefined
  return { ...(mode === 'live' || mode === 'demo' ? { mode } : {}), ...(liveKey ? { liveKey } : {}) }
}

export interface JoinUrlOptions {
  readonly origin: string
  readonly route: string
  readonly hub: string
  /** Shared day (Live mode) or this device's own (Demo mode) */
  readonly live: boolean
  readonly liveKey?: string | undefined
}

/** The link a phone opens from a QR code: the right screen, the right hub, the right mode, and (shared mode) the key. */
export function joinUrl(o: JoinUrlOptions): string {
  const base = `${o.origin}${o.route}?hub=${encodeURIComponent(o.hub)}`
  if (!o.live) return base
  return `${base}&mode=live${o.liveKey ? `#k=${encodeURIComponent(o.liveKey)}` : ''}`
}

export const liveAvailable = (env: { readonly url?: string | undefined; readonly anon?: string | undefined }): boolean => Boolean(env.url && env.anon)

export interface ModeChoice {
  readonly mode: 'live' | 'demo'
  /** Set when shared mode was asked for but cannot be offered: the device says it is alone, and why */
  readonly aloneReason?: AloneReason
}

/** Demo is the default. Shared mode needs to be asked for (link or remembered by the tab) AND built in; if it is asked for but not built in, say so. */
export function chooseMode(a: { readonly requested: string | null; readonly remembered: string | null; readonly liveAvailable: boolean }): ModeChoice {
  const wants = (a.requested ?? a.remembered) === 'live'
  if (!wants) return { mode: 'demo' }
  return a.liveAvailable ? { mode: 'live' } : { mode: 'demo', aloneReason: 'live-unavailable' }
}
