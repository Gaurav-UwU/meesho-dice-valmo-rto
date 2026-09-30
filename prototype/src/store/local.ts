import { planAutopilot } from '../domain/autopilot.ts'
import { createDay, DEFAULT_DAY } from '../domain/day.ts'
import { checkActionDay, isNewerDay, newDayId } from '../domain/dayId.ts'
import { reduce } from '../domain/reducer.ts'
import type { Action, DayState } from '../domain/types.ts'
import type { HubGeo, HubId } from '../engine/types.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import type { GeoLoader } from './geo.ts'
import { dayShape, isDayState } from './guards.ts'
import type { ActionInput, AloneReason, Store, SyncInfo, SyncWarning } from './types.ts'

export interface KeyValue {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ChannelLike {
  postMessage(message: unknown): void
  /** Register the one handler that receives messages from other tabs */
  listen(handler: (data: unknown) => void): void
}

export interface LocalStoreOptions {
  readonly loadGeo: GeoLoader
  readonly storage?: KeyValue
  readonly channel?: ChannelLike
  readonly now?: () => number
  readonly random?: () => number
  readonly ordersPerDay?: number
  readonly ridersPerHub?: number
  /** Why this device is on its own day; 'live-unavailable' when ?mode=live was asked for but the build has no shared-day server */
  readonly aloneReason?: AloneReason
}

// Bump the version when the shape of the day changes, so old saved days are ignored instead of crashing a screen.
const STORAGE_PREFIX = 'rescue-console-day-v6:'
const AUTOPILOT_SEED_BASE = 7

interface Broadcast {
  readonly hubId: HubId
  readonly state: DayState
}

const isBroadcast = (x: unknown): x is Broadcast => typeof x === 'object' && x !== null && 'hubId' in x && 'state' in x && isDayState((x as Broadcast).state)

const TAKEN_OVER = 'A new day started on another screen. Showing it now.'
const LOST_TAP = 'Another window changed the day at the same moment. Please tap again.'
const OLD_SAVED_DAY = 'The saved day was from an older version of the app, so a fresh day was started.'

/**
 * Demo mode: the day lives in this browser. State is saved to localStorage and broadcast to other tabs, so the ops laptop tab,
 * the rider phone frame and the customer phone frame of ONE browser stay in sync with no accounts and no internet.
 * Separate devices never share a day in this mode (they say so: see getInfo).
 *
 * Which copy of a day wins is decided by `isNewerDay` (day identity first, then the number of actions), never by "whoever wrote last",
 * so a tab that took lots of actions on an old day cannot undo a reset somewhere else.
 */
export function createLocalStore(opts: LocalStoreOptions): Store {
  const now = opts.now ?? Date.now
  const random = opts.random ?? Math.random
  const days = new Map<HubId, DayState>()
  const loading = new Map<HubId, Promise<void>>()
  const listeners = new Set<() => void>()
  const dirty = new Set<HubId>()
  let flushScheduled = false

  const warnings: SyncWarning[] = []
  if (!opts.storage) warnings.push('storage-blocked')
  if (!opts.channel) warnings.push('no-tab-sync')
  const baseInfo: SyncInfo = { mode: 'demo', link: 'alone', aloneReason: opts.aloneReason ?? 'demo', warnings }
  const infos = new Map<HubId, SyncInfo>()
  const meta = new Map<HubId, { lastUpdateAt?: number; notice?: SyncInfo['notice'] }>()
  let noticeSeq = 0

  const notify = (): void => listeners.forEach((l) => l())

  /** Rebuild the info object for a hub (a new object, so subscribers see a change) */
  const touch = (hubId: HubId): void => {
    const d = days.get(hubId)
    const m = meta.get(hubId) ?? {}
    infos.set(hubId, {
      ...baseInfo,
      ...(d ? { day: { hubId, dayId: d.dayId, dayNo: d.dayNo, version: d.version } } : {}),
      ...(m.lastUpdateAt === undefined ? {} : { lastUpdateAt: m.lastUpdateAt }),
      ...(m.notice ? { notice: m.notice } : {}),
    })
  }

  const setNotice = (hubId: HubId, text: string): void => {
    meta.set(hubId, { ...meta.get(hubId), notice: { seq: ++noticeSeq, text } })
    touch(hubId)
    notify()
  }

  const setDay = (hubId: HubId, state: DayState): void => {
    days.set(hubId, state)
    meta.set(hubId, { ...meta.get(hubId), lastUpdateAt: now() })
    touch(hubId)
  }

  const readStored = (hubId: HubId): { readonly state?: DayState; readonly old: boolean } => {
    try {
      const raw = opts.storage?.getItem(STORAGE_PREFIX + hubId)
      if (!raw) return { old: false }
      const parsed: unknown = JSON.parse(raw)
      const shape = dayShape(parsed)
      return shape === 'ok' ? { state: parsed as DayState, old: false } : { old: shape === 'old' }
    } catch {
      return { old: false }
    }
  }

  /** The version of the day this tab last wrote to, or read from, storage: if storage holds something else at flush time, another tab wrote in between */
  const syncedVersion = new Map<HubId, number>()

  const write = (hubId: HubId, state: DayState): void => {
    syncedVersion.set(hubId, state.version)
    try {
      opts.storage?.setItem(STORAGE_PREFIX + hubId, JSON.stringify(state))
    } catch {
      // Storage can be full or blocked (private window). The day still works in memory.
    }
  }

  /** Take `incoming` only if it is a newer day (or we have none). Returns true if this tab switched. */
  const adoptIfNewer = (hubId: HubId, incoming: DayState, persistIt: boolean): boolean => {
    const mine = days.get(hubId)
    if (mine && !isNewerDay(incoming, mine)) return false
    const newDay = mine !== undefined && mine.dayId !== incoming.dayId
    setDay(hubId, incoming)
    syncedVersion.set(hubId, incoming.version)
    // The sender already saved it; this tab only saves a copy if storage has nothing as new (it may outlive the sender). Never over a newer day.
    if (persistIt) {
      const stored = readStored(hubId).state
      if (!stored || isNewerDay(incoming, stored)) write(hubId, incoming)
    }
    if (newDay) meta.set(hubId, { ...meta.get(hubId), notice: { seq: ++noticeSeq, text: TAKEN_OVER } })
    touch(hubId)
    notify()
    return true
  }

  /** Look in storage for a newer day (another tab wrote it while this one slept or could not hear). */
  const syncFromStorage = (hubId: HubId): boolean => {
    const { state } = readStored(hubId)
    return state ? adoptIfNewer(hubId, state, false) : false
  }

  const flush = (): void => {
    flushScheduled = false
    for (const hubId of dirty) {
      const state = days.get(hubId)
      if (!state) continue
      const stored = readStored(hubId).state
      if (stored && isNewerDay(stored, state)) {
        // A newer day is already saved: this tab's copy must not overwrite it.
        const sameDay = stored.dayId === state.dayId
        adoptIfNewer(hubId, stored, false)
        if (sameDay) setNotice(hubId, LOST_TAP)
        continue
      }
      if (stored && stored.dayId === state.dayId && stored.version >= state.version && stored.version !== syncedVersion.get(hubId)) {
        // Another tab saved a change at the same version while this one was making its own: theirs is already saved, so keep it.
        setDay(hubId, stored)
        syncedVersion.set(hubId, stored.version)
        setNotice(hubId, LOST_TAP)
        continue
      }
      write(hubId, state)
      try {
        opts.channel?.postMessage({ hubId, state } satisfies Broadcast)
      } catch {
        // A closed channel must never break the demo.
      }
    }
    dirty.clear()
  }

  const commit = (hubId: HubId, state: DayState): void => {
    setDay(hubId, state)
    dirty.add(hubId)
    if (!flushScheduled) {
      flushScheduled = true
      queueMicrotask(flush)
    }
    notify()
  }

  if (opts.channel) {
    opts.channel.listen((data) => {
      if (!isBroadcast(data)) return
      adoptIfNewer(data.hubId, data.state, true)
    })
  }

  const stamp = (input: ActionInput): Action => {
    const at = now()
    if (input.type === 'riderDeliver' || input.type === 'riderRefuse') {
      const code = String(Math.floor(1000 + random() * 9000))
      return { ...input, at, code }
    }
    return { ...input, at } as Action
  }

  const loadGeoSafe = async (hubId: HubId): Promise<HubGeo> =>
    // A hub file that fails to load must not leave the screen on "Loading" forever: fall back to the labelled stand-in.
    opts.loadGeo(hubId).catch(() => syntheticGeo(getHub(hubId)))

  // The very first day of a hub gets the id createDay derives from the seed, the same in every tab, so tabs that open at the same time
  // and each build their own day still hold the SAME day. A reset (day 2 onwards) is a real event and gets a fresh unique id.
  const build = (geo: HubGeo, seed: number, dayNo: number): DayState =>
    createDay(geo, {
      seed,
      orders: opts.ordersPerDay ?? DEFAULT_DAY.orders,
      riders: opts.ridersPerHub ?? DEFAULT_DAY.riders,
      dayNo,
      ...(dayNo > 1 ? { dayId: newDayId(now(), random, dayNo) } : {}),
    })

  const ensureDay = (hubId: HubId): Promise<void> => {
    if (days.has(hubId)) return Promise.resolve()
    const existing = loading.get(hubId)
    if (existing) return existing
    const p = (async () => {
      try {
        const saved = readStored(hubId)
        let state = saved.state
        if (!state) state = build(await loadGeoSafe(hubId), DEFAULT_DAY.seed, 1)
        if (!days.has(hubId)) {
          setDay(hubId, state)
          syncedVersion.set(hubId, state.version)
          if (saved.old) meta.set(hubId, { ...meta.get(hubId), notice: { seq: ++noticeSeq, text: OLD_SAVED_DAY } })
          touch(hubId)
          notify()
        }
      } finally {
        loading.delete(hubId)
      }
    })()
    loading.set(hubId, p)
    return p
  }

  /**
   * The day a tap was made on, or undefined if the tap must not be applied. A tap belongs to the day the screen was showing:
   * if the day has been reset since (even in a tab we could not hear), the tap is refused and this tab moves to the new day.
   */
  const dayForTap = (hubId: HubId): DayState | undefined => {
    const seen = days.get(hubId)
    if (!seen) return undefined
    syncFromStorage(hubId)
    const cur = days.get(hubId)
    if (!cur) return undefined
    const check = checkActionDay(cur, seen.dayId)
    if (!check.ok) {
      setNotice(hubId, check.message)
      return undefined
    }
    return cur
  }

  const send = async (hubId: HubId, input: ActionInput): Promise<void> => {
    await ensureDay(hubId)
    const cur = dayForTap(hubId)
    if (!cur) return
    const next = reduce(cur, stamp(input))
    if (next !== cur) commit(hubId, next)
  }

  const autopilot = async (hubId: HubId, count: number): Promise<boolean> => {
    await ensureDay(hubId)
    const cur = dayForTap(hubId)
    if (!cur) return false
    const actions = planAutopilot(cur, { count, seed: AUTOPILOT_SEED_BASE + cur.version, at: now() })
    const next = actions.reduce(reduce, cur)
    if (next !== cur) commit(hubId, next)
    return true
  }

  const reset = async (hubId: HubId, seed: number = DEFAULT_DAY.seed): Promise<boolean> => {
    const geo = await loadGeoSafe(hubId)
    syncFromStorage(hubId) // build on the newest day number, even if this tab missed the last reset
    const prev = days.get(hubId)
    const dayNo = (prev?.dayNo ?? 0) + 1
    // The version keeps climbing across resets: it is a counter, not a day age.
    commit(hubId, { ...build(geo, seed, dayNo), version: (prev?.version ?? 0) + 1 })
    return true
  }

  const resync = async (): Promise<void> => {
    for (const hubId of [...days.keys()]) syncFromStorage(hubId)
  }

  return {
    mode: 'demo',
    getState: (hubId) => days.get(hubId),
    getInfo: (hubId) => {
      let info = infos.get(hubId)
      if (!info) {
        touch(hubId)
        info = infos.get(hubId)!
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
