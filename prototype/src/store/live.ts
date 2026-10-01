import { DAY_SCHEMA } from '../domain/day.ts'
import { DAY_RESET_MESSAGE, isNewerDay } from '../domain/dayId.ts'
import { roleCan } from '../domain/roles.ts'
import type { DayState } from '../domain/types.ts'
import type { HubId } from '../engine/types.ts'
import { dayShape } from './guards.ts'
import type { ActionInput, LinkState, Store, SyncInfo, SyncProblem } from './types.ts'

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
  /** The RIDER key (the one in the phone QR codes) */
  readonly getLiveKey: () => string | undefined
  /** The CAPTAIN key: needed for the captain, desk, clock and pilot actions. Asked for when such a button is first pressed. */
  readonly getCaptainKey?: () => string | undefined
  /** The server said the key given as the rider key is really the captain key: keep it out of the rider slot so it can never reach a QR code */
  readonly onKeyIsCaptain?: (key: string) => void
  readonly getAdminToken: () => string | undefined
  /** Show a problem to the person using the screen (a toast). The store never throws at a button press. */
  readonly onError: (message: string) => void
  /** Safety net if Realtime is slow or blocked: re-read the day this often (ms). 0 turns it off. */
  readonly pollMs?: number
  readonly now?: () => number
  /** True while the tab is in the background: the poll then sleeps (waking the tab triggers a read through resync) */
  readonly isHidden?: () => boolean
}

const errorBody = async (r: CallResult): Promise<{ error?: string; code?: string }> => {
  try {
    const body = (await r.json()) as { error?: unknown; code?: unknown }
    return { ...(typeof body.error === 'string' ? { error: body.error } : {}), ...(typeof body.code === 'string' ? { code: body.code } : {}) }
  } catch {
    return {}
  }
}

const DEFAULT_POLL_MS = 5000

/** Two missed reads in a row (10 s with the default poll) and the device says it is offline. One miss is not news. */
const OFFLINE_AFTER_FAILURES = 2

const RESET_SEEN = 'The day was reset. Showing the new day now.'

type Outcome = 'ok' | 'day_reset' | 'failed'

interface Meta {
  checkedAt?: number
  updatedAt?: number
  failures: number
  problem?: SyncProblem
  notice?: SyncInfo['notice']
}

/**
 * Live mode: the day lives on the server. Every screen reads it from Supabase (live updates) and sends its taps to /api,
 * where OTPs are generated and checked and real WhatsApp messages are sent. Same interface as the Demo-mode store.
 *
 * Which copy of the day wins is decided by `isNewerDay` (day identity first, then the number of actions), and every tap names the day
 * it was made on, so a device that slept through a reset can neither keep showing the old day nor change the new one.
 */
export function createLiveStore(opts: LiveStoreOptions): Store {
  const now = opts.now ?? Date.now
  const days = new Map<HubId, DayState>()
  const started = new Map<HubId, Promise<void>>()
  const listeners = new Set<() => void>()
  const metas = new Map<HubId, Meta>()
  const infos = new Map<HubId, SyncInfo>()
  const quiet = new Set<HubId>() // hubs where this device itself is resetting: no "the day was reset" notice for its own button
  let noticeSeq = 0

  const notify = (): void => listeners.forEach((l) => l())
  const metaOf = (hubId: HubId): Meta => metas.get(hubId) ?? { failures: 0 }

  const infoOf = (hubId: HubId): SyncInfo => {
    const m = metaOf(hubId)
    const d = days.get(hubId)
    let link: LinkState = 'synced'
    if (m.problem) link = 'problem'
    else if (m.failures >= OFFLINE_AFTER_FAILURES) link = 'offline'
    else if (m.checkedAt === undefined) link = 'connecting'
    return {
      mode: 'live',
      link,
      warnings: [],
      ...(m.problem ? { problem: m.problem } : {}),
      ...(d ? { day: { hubId, dayId: d.dayId, dayNo: d.dayNo, version: d.version } } : {}),
      ...(m.updatedAt === undefined ? {} : { lastUpdateAt: m.updatedAt }),
      ...(m.checkedAt === undefined ? {} : { lastCheckedAt: m.checkedAt }),
      ...(m.notice ? { notice: m.notice } : {}),
    }
  }

  /** What a person can see in the info, apart from the "last confirmed" clock. Only a change in this wakes the listeners. */
  const visible = (i: SyncInfo): string => [i.link, i.problem, i.day?.dayId, i.day?.version, i.lastUpdateAt, i.notice?.seq].join('|')

  /** Change a hub's bookkeeping and rebuild its info object (a new object, so subscribers see a change) */
  const patch = (hubId: HubId, change: Partial<Meta>): void => {
    const before = infoOf(hubId)
    metas.set(hubId, { ...metaOf(hubId), ...change })
    const after = infoOf(hubId)
    infos.set(hubId, after)
    if (visible(before) !== visible(after)) notify()
  }

  const setNotice = (hubId: HubId, text: string): void => patch(hubId, { notice: { seq: ++noticeSeq, text } })

  /** A read from the server worked (or Realtime pushed): the device is in touch. */
  const confirmed = (hubId: HubId): void => patch(hubId, { checkedAt: now(), failures: 0 })

  /** A good read of the day fixes a shape problem, but not a refused key (reading is open to everyone; only taps need the key) */
  const readProblem = (hubId: HubId): SyncProblem | undefined => (metaOf(hubId).problem === 'bad-key' ? 'bad-key' : undefined)

  /**
   * `force` = the server itself just told us our day is gone (a tap was refused as "day reset"): take its day whatever the numbers say.
   * That covers a server row that was deleted and started again at day 1 while this device still held day 4.
   */
  const adopt = (hubId: HubId, incoming: unknown, force = false): void => {
    // Whatever arrives from the network is untrusted: a malformed day would crash every screen.
    const shape = dayShape(incoming)
    if (shape === 'invalid') {
      // With a good day already on screen, ignore junk. With none, say so instead of sitting on "Loading".
      if (!days.has(hubId)) patch(hubId, { checkedAt: now(), failures: 0, problem: 'unreadable' })
      return
    }
    if (shape === 'old') {
      // One of our days, but from another version of the app. Say so instead of leaving the screen on "Loading".
      const older = (incoming as { schema: number }).schema < DAY_SCHEMA
      patch(hubId, { checkedAt: now(), failures: 0, problem: older ? 'old-shape' : 'app-too-old' })
      return
    }
    const state = incoming as DayState
    const cur = days.get(hubId)
    if (cur && !(force && cur.dayId !== state.dayId) && !isNewerDay(state, cur)) {
      patch(hubId, { checkedAt: now(), failures: 0, problem: readProblem(hubId) })
      return
    }
    days.set(hubId, state)
    const switched = cur !== undefined && cur.dayId !== state.dayId
    patch(hubId, {
      checkedAt: now(),
      updatedAt: now(),
      failures: 0,
      problem: readProblem(hubId),
      ...(switched && !quiet.has(hubId) ? { notice: { seq: ++noticeSeq, text: RESET_SEEN } } : {}),
    })
  }

  const refresh = async (hubId: HubId, force = false): Promise<void> => {
    try {
      const s = await opts.feed.fetchDay(hubId)
      if (s) adopt(hubId, s, force)
      else confirmed(hubId)
    } catch {
      // A missed read is fixed by the next update or poll; two in a row mark the device offline.
      patch(hubId, { failures: metaOf(hubId).failures + 1 })
    }
  }

  const post = async (path: string, payload: unknown, headers: Record<string, string>, hubId: HubId): Promise<Outcome> => {
    try {
      const res = await opts.call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) })
      if (res.ok) {
        if (metaOf(hubId).problem === 'bad-key') patch(hubId, { problem: undefined })
        return 'ok'
      }
      const { error, code } = await errorBody(res)
      if (code === 'day_reset') return 'day_reset'
      // 401 = the key is not one of ours. 403 = it is a rider key and the action needs the captain key: not a bad join key.
      if (res.status === 401) patch(hubId, { problem: 'bad-key' })
      if (code === 'old_shape') patch(hubId, { problem: 'old-shape' })
      opts.onError(error ?? `The server said no (${res.status})`)
      return 'failed'
    } catch {
      opts.onError('Could not reach the server. Check your connection.')
      return 'failed'
    }
  }

  /**
   * The tap was made on a day that has since been reset: not an error. Say so at once (the read below can be slow on a bad connection),
   * then fetch the new day. The notice already explains the switch, so the read does not add a second one.
   */
  const dayMovedOn = async (hubId: HubId): Promise<void> => {
    setNotice(hubId, DAY_RESET_MESSAGE)
    quiet.add(hubId)
    try {
      await refresh(hubId, true)
    } finally {
      quiet.delete(hubId)
    }
  }

  /**
   * The key for a request. A rider-level action (what a rider's phone does, and the customer replies) uses the rider key, falling back to the
   * captain key; every other action uses the captain key (asked for once). A rider key can never do what only the captain key may.
   */
  const liveHeaders = (type?: ActionInput['type']): Record<string, string> => {
    const captainLevel = type !== undefined && !roleCan('rider', type)
    const key = captainLevel ? (opts.getCaptainKey?.() ?? opts.getLiveKey()) : (opts.getLiveKey() ?? opts.getCaptainKey?.())
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
        const headers = liveHeaders()
        const res = await opts.call(`/api/day?hub=${hubId}`, { method: 'GET', headers })
        if (res.status === 401) patch(hubId, { problem: 'bad-key' })
        if (res.ok && opts.onKeyIsCaptain && headers['x-live-key'] && headers['x-live-key'] === opts.getLiveKey()) {
          try {
            const body = (await res.json()) as { role?: unknown }
            if (body.role === 'captain') opts.onKeyIsCaptain(headers['x-live-key'])
          } catch {
            // No role in the answer (an older server): nothing to do.
          }
        }
      } catch {
        // The server may be asleep; the read below still tells us what exists.
      }
      await refresh(hubId)
      try {
        opts.feed.watch(hubId, (s) => adopt(hubId, s))
      } catch {
        // Realtime blocked or unavailable: the poll below still keeps the day fresh.
      }
      const every = opts.pollMs ?? DEFAULT_POLL_MS
      if (every > 0) setInterval(() => void (opts.isHidden?.() ? undefined : refresh(hubId)), every)
    })()
    started.set(hubId, p)
    return p
  }

  const send = async (hubId: HubId, input: ActionInput): Promise<void> => {
    await ensureDay(hubId)
    const seen = days.get(hubId)
    if (!seen) {
      opts.onError('The shared day has not loaded yet. Check your connection.')
      return
    }
    const outcome = await post('/api/action', { hubId, dayId: seen.dayId, action: input }, liveHeaders(input.type), hubId)
    if (outcome === 'day_reset') await dayMovedOn(hubId)
    else if (outcome === 'ok') await refresh(hubId)
  }

  const admin = async (hubId: HubId, body: Record<string, unknown>): Promise<Outcome> => {
    await ensureDay(hubId)
    const headers = adminHeaders()
    if (!headers) {
      opts.onError('The admin token is needed for this button')
      return 'failed'
    }
    const outcome = await post('/api/admin', { ...body, hubId }, headers, hubId)
    if (outcome === 'day_reset') await dayMovedOn(hubId)
    else if (outcome === 'ok') await refresh(hubId)
    return outcome
  }

  const autopilot = async (hubId: HubId, count: number): Promise<boolean> => {
    await ensureDay(hubId)
    const seen = days.get(hubId)
    if (!seen) {
      opts.onError('The shared day has not loaded yet. Check your connection.')
      return false
    }
    return (await admin(hubId, { op: 'autopilot', count, dayId: seen.dayId })) === 'ok'
  }

  const reset = async (hubId: HubId, seed?: number): Promise<boolean> => {
    quiet.add(hubId)
    try {
      return (await admin(hubId, seed === undefined ? { op: 'reset' } : { op: 'reset', seed })) === 'ok'
    } finally {
      quiet.delete(hubId)
    }
  }

  const resync = async (): Promise<void> => {
    await Promise.all([...started.keys()].map((hubId) => refresh(hubId)))
  }

  return {
    mode: 'live',
    getState: (hubId) => days.get(hubId),
    getInfo: (hubId) => {
      let info = infos.get(hubId)
      if (!info) {
        info = infoOf(hubId)
        infos.set(hubId, info)
      }
      return info
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    ensureDay,
    send,
    autopilot,
    reset,
    resync,
  }
}
