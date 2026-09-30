import { describe, expect, it, vi } from 'vitest'
import type { DayState } from '../domain/types.ts'
import { createDay } from '../domain/day.ts'
import { reduce } from '../domain/reducer.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { DAY_SCHEMA } from '../domain/day.ts'
import { DAY_RESET_MESSAGE } from '../domain/dayId.ts'
import { createLiveStore, type CallResult, type DayFeed, type LiveStoreOptions } from './live.ts'

const day = (version = 0): DayState => ({ ...createDay(syntheticGeo(getHub('lucknow')), { seed: 1, orders: 30, riders: 4 }), version })

interface Fake {
  readonly opts: LiveStoreOptions
  readonly calls: { path: string; method: string; headers: Record<string, string>; body?: string }[]
  readonly errors: string[]
  readonly state: {
    day: DayState | null
    push: ((s: DayState) => void) | undefined
    respond: { ok: boolean; status: number; body: unknown } | 'throw'
  }
}

function fake(extra: Partial<LiveStoreOptions> = {}): Fake {
  const calls: Fake['calls'] = []
  const errors: string[] = []
  const state: Fake['state'] = { day: day(1), push: undefined, respond: { ok: true, status: 200, body: { ok: true } } }
  const feed: DayFeed = {
    fetchDay: async () => state.day,
    watch: (_hub, on) => {
      state.push = on
      return () => undefined
    },
  }
  const opts: LiveStoreOptions = {
    feed,
    call: async (path, init) => {
      calls.push({ path, ...init })
      if (state.respond === 'throw') throw new Error('network')
      const r = state.respond
      return { ok: r.ok, status: r.status, json: async () => r.body } satisfies CallResult
    },
    getLiveKey: () => 'live-key',
    getAdminToken: () => 'admin-token',
    onError: (m) => void errors.push(m),
    pollMs: 0,
    ...extra,
  }
  return { opts, calls, errors, state }
}

describe('live store', () => {
  it('ensures the day exists, reads it and starts listening', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    expect(store.mode).toBe('live')
    expect(f.calls[0]).toMatchObject({ path: '/api/day?hub=lucknow', method: 'GET' })
    expect(f.calls[0].headers['x-live-key']).toBe('live-key')
    expect(store.getState('lucknow')?.version).toBe(1)
    expect(f.state.push).toBeDefined()
  })

  it('only starts once per hub', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await Promise.all([store.ensureDay('lucknow'), store.ensureDay('lucknow')])
    expect(f.calls.filter((c) => c.path.startsWith('/api/day'))).toHaveLength(1)
  })

  it('adopts newer versions pushed by Realtime, ignores older ones, and notifies', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    const listener = vi.fn()
    store.subscribe(listener)
    await store.ensureDay('lucknow')
    listener.mockClear()
    f.state.push?.(day(5))
    expect(store.getState('lucknow')?.version).toBe(5)
    expect(listener).toHaveBeenCalledTimes(1)
    f.state.push?.(day(3))
    expect(store.getState('lucknow')?.version).toBe(5)
    f.state.push?.(day(5))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('adopts a reset (a new day id and number, same version)', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.push?.({ ...day(1), seed: 99, dayId: 'day-b', dayNo: 2 })
    expect(store.getState('lucknow')?.seed).toBe(99)
  })

  it('sends an action to /api/action with the live key, then re-reads the day', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.day = reduce(day(1), { type: 'startDay', at: 1 })
    await store.send('lucknow', { type: 'startDay' })
    const call = f.calls.find((c) => c.path === '/api/action')!
    expect(JSON.parse(call.body!)).toEqual({ hubId: 'lucknow', dayId: 'day-1', action: { type: 'startDay' } })
    expect(call.headers['x-live-key']).toBe('live-key')
    expect(store.getState('lucknow')?.started).toBe(true)
    expect(f.errors).toEqual([])
  })

  it('shows the server\'s message when an action is refused, and does not throw', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.respond = { ok: false, status: 429, body: { error: 'Too many OTP requests for this order' } }
    await expect(store.send('lucknow', { type: 'startDay' })).resolves.toBeUndefined()
    expect(f.errors).toEqual(['Too many OTP requests for this order'])
  })

  it('falls back to a generic message for an unreadable error, and for a network failure', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.respond = { ok: false, status: 500, body: 'oops' }
    await store.send('lucknow', { type: 'startDay' })
    expect(f.errors.at(-1)).toBe('The server said no (500)')
    f.state.respond = { ok: false, status: 502, body: { error: 42 } }
    await store.send('lucknow', { type: 'startDay' })
    expect(f.errors.at(-1)).toBe('The server said no (502)')
    f.state.respond = 'throw'
    await store.send('lucknow', { type: 'startDay' })
    expect(f.errors.at(-1)).toMatch(/Could not reach the server/)
  })

  it('autopilot and reset go through /api/admin with the bearer token', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.autopilot('lucknow', 20)
    await store.reset('lucknow', 7)
    await store.reset('lucknow')
    const admin = f.calls.filter((c) => c.path === '/api/admin')
    expect(admin).toHaveLength(3)
    expect(admin[0].headers.authorization).toBe('Bearer admin-token')
    expect(JSON.parse(admin[0].body!)).toEqual({ op: 'autopilot', count: 20, hubId: 'lucknow', dayId: 'day-1' })
    expect(JSON.parse(admin[1].body!)).toEqual({ op: 'reset', seed: 7, hubId: 'lucknow' })
    expect(JSON.parse(admin[2].body!)).toEqual({ op: 'reset', hubId: 'lucknow' })
  })

  it('asks for the admin token instead of calling the server without one', async () => {
    const f = fake({ getAdminToken: () => undefined })
    const store = createLiveStore(f.opts)
    expect(await store.autopilot('lucknow', 20)).toBe(false)
    expect(f.calls.some((c) => c.path === '/api/admin')).toBe(false)
    expect(f.errors).toEqual(['The admin token is needed for this button'])
  })

  it('omits the live key header when none is set', async () => {
    const f = fake({ getLiveKey: () => undefined })
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    expect(f.calls[0].headers['x-live-key']).toBeUndefined()
  })

  it('survives a server that is asleep or a feed that fails to read', async () => {
    const f = fake()
    f.state.respond = 'throw'
    const failing: LiveStoreOptions = { ...f.opts, feed: { fetchDay: async () => { throw new Error('down') }, watch: () => () => undefined } }
    const store = createLiveStore(failing)
    await expect(store.ensureDay('lucknow')).resolves.toBeUndefined()
    expect(store.getState('lucknow')).toBeUndefined()
  })

  it('polls as a safety net when Realtime is quiet', async () => {
    vi.useFakeTimers()
    try {
      const f = fake({ pollMs: 1000 })
      const store = createLiveStore(f.opts)
      await store.ensureDay('lucknow')
      f.state.day = day(9)
      await vi.advanceTimersByTimeAsync(1100)
      expect(store.getState('lucknow')?.version).toBe(9)
    } finally {
      vi.useRealTimers()
    }
  })

  it('unsubscribed listeners stop hearing about changes', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    const listener = vi.fn()
    const off = store.subscribe(listener)
    await store.ensureDay('lucknow')
    off()
    listener.mockClear()
    f.state.push?.(day(20))
    expect(listener).not.toHaveBeenCalled()
  })

  it('ignores a malformed or hostile day pushed through the feed', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    const before = store.getState('lucknow')
    f.state.push?.({ version: 1e15 } as unknown as DayState)
    f.state.push?.(null as unknown as DayState)
    f.state.push?.({ ...day(50), stops: [] } as unknown as DayState)
    expect(store.getState('lucknow')).toBe(before)
  })
})

/** A later day: what the server holds after somebody presses Reset day */
const nextDay = (prev: DayState, version = prev.version + 1): DayState => ({ ...prev, dayId: `day-${prev.dayNo + 1}`, dayNo: prev.dayNo + 1, version })

describe('live store: a new day reaches every device and an old one can never come back', () => {
  it('adopts a reset even though this device has a much higher version (the reported bug)', async () => {
    const f = fake()
    f.state.day = day(60)
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    expect(store.getState('lucknow')?.version).toBe(60)
    f.state.push?.(nextDay(day(60), 61))
    expect(store.getState('lucknow')?.dayNo).toBe(2)
    f.state.push?.({ ...nextDay(day(60), 61), version: 0, dayId: 'day-2' }) // same day, older version: ignored
    expect(store.getState('lucknow')?.version).toBe(61)
  })

  it('never goes back to an older day, however high its version, whether it arrives by Realtime or by the poll', async () => {
    const f = fake()
    f.state.day = nextDay(day(5), 6)
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.push?.(day(999))
    f.state.day = day(999)
    await store.resync()
    expect(store.getState('lucknow')?.dayNo).toBe(2)
    expect(store.getState('lucknow')?.version).toBe(6)
  })

  it('tells the person the day was reset when another device reset it, but not the device that pressed the button', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    expect(store.getInfo('lucknow').notice).toBeUndefined()
    f.state.push?.(nextDay(day(1), 2))
    expect(store.getInfo('lucknow').notice?.text).toMatch(/reset|new day/i)
    const seq = store.getInfo('lucknow').notice!.seq
    // this device presses Reset: the server answers with day 3, which it should adopt quietly
    f.state.day = nextDay(nextDay(day(1), 2), 3)
    await store.reset('lucknow')
    expect(store.getState('lucknow')?.dayNo).toBe(3)
    expect(store.getInfo('lucknow').notice?.seq).toBe(seq)
  })

  it('a tap made on a day that was reset is not an error for the person: no red toast, a notice, and the new day is fetched', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.day = nextDay(day(1), 2) // the server already moved on; this device has not heard yet
    f.state.respond = { ok: false, status: 409, body: { ok: false, code: 'day_reset', error: DAY_RESET_MESSAGE } }
    await store.send('lucknow', { type: 'startDay' })
    expect(f.errors).toEqual([])
    expect(store.getInfo('lucknow').notice?.text).toBe(DAY_RESET_MESSAGE)
    expect(store.getState('lucknow')?.dayNo).toBe(2)
  })

  it('an autopilot step refused because the day was reset says so by returning false (so the loop stops) and fetches the new day', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.day = nextDay(day(1), 2)
    f.state.respond = { ok: false, status: 409, body: { ok: false, code: 'day_reset', error: DAY_RESET_MESSAGE } }
    expect(await store.autopilot('lucknow', 20)).toBe(false)
    expect(f.errors).toEqual([])
    expect(store.getState('lucknow')?.dayNo).toBe(2)
    f.state.respond = { ok: true, status: 200, body: { ok: true } }
    expect(await store.autopilot('lucknow', 20)).toBe(true)
  })

  it('does not send a tap when there is no day to name yet', async () => {
    const f = fake()
    f.state.day = null
    const store = createLiveStore(f.opts)
    await store.send('lucknow', { type: 'startDay' })
    expect(f.calls.some((c) => c.path === '/api/action')).toBe(false)
    expect(f.errors.at(-1)).toMatch(/not loaded|not connected|Loading/i)
  })
})

describe('live store: it always says where this device stands', () => {
  it('is connecting until the first read, then synced with the day, the version and when the server last confirmed it', async () => {
    let t = 1_000
    const f = fake({ now: () => t })
    const store = createLiveStore(f.opts)
    expect(store.getInfo('lucknow')).toMatchObject({ mode: 'live', link: 'connecting', warnings: [] })
    await store.ensureDay('lucknow')
    t = 2_000
    const info = store.getInfo('lucknow')
    expect(info).toMatchObject({ link: 'synced', day: { hubId: 'lucknow', dayId: 'day-1', dayNo: 1, version: 1 } })
    expect(info.lastCheckedAt).toBe(1_000)
    t = 7_000
    await store.resync()
    expect(store.getInfo('lucknow').lastCheckedAt).toBe(7_000)
  })

  it('goes offline after two failed reads (still showing the last day), and is synced again when a read works', async () => {
    const f = fake()
    let down = false
    const flaky: LiveStoreOptions = { ...f.opts, feed: { fetchDay: async () => { if (down) throw new Error('net'); return f.state.day }, watch: f.opts.feed.watch } }
    const store = createLiveStore(flaky)
    await store.ensureDay('lucknow')
    down = true
    await store.resync()
    expect(store.getInfo('lucknow').link).toBe('synced') // one miss is not news
    await store.resync()
    expect(store.getInfo('lucknow').link).toBe('offline')
    expect(store.getState('lucknow')).toBeDefined()
    down = false
    await store.resync()
    expect(store.getInfo('lucknow').link).toBe('synced')
  })

  it('a day saved by an older version of the app is reported, not silently ignored (no endless "Loading")', async () => {
    const f = fake()
    f.state.day = { ...day(3), schema: DAY_SCHEMA - 1 } as DayState
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    expect(store.getState('lucknow')).toBeUndefined()
    expect(store.getInfo('lucknow')).toMatchObject({ link: 'problem', problem: 'old-shape' })
    // once somebody (or the server) replaces it, the problem clears by itself
    f.state.push?.(day(4))
    expect(store.getInfo('lucknow')).toMatchObject({ link: 'synced' })
    expect(store.getInfo('lucknow').problem).toBeUndefined()
  })

  it('a day from a NEWER app says this page is out of date', async () => {
    const f = fake()
    f.state.day = { ...day(3), schema: DAY_SCHEMA + 1 } as DayState
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    expect(store.getInfo('lucknow')).toMatchObject({ link: 'problem', problem: 'app-too-old' })
  })

  it('a refused join key is reported as a problem', async () => {
    const f = fake()
    f.state.respond = { ok: false, status: 401, body: { ok: false, error: 'Not allowed' } }
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    expect(store.getInfo('lucknow')).toMatchObject({ link: 'problem', problem: 'bad-key' })
  })

  it('keeps the same info object until something changes', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    const a = store.getInfo('lucknow')
    expect(store.getInfo('lucknow')).toBe(a)
  })
})

describe('live store: recovery paths', () => {
  it('when the server says the tap was on a reset day, it takes the server\'s day even if its day number is LOWER (row recreated)', async () => {
    const f = fake()
    f.state.day = nextDay(nextDay(day(9), 10), 11) // this device holds day 3
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    expect(store.getState('lucknow')?.dayNo).toBe(3)
    f.state.day = { ...day(12), dayId: 'recreated', dayNo: 1 } // the server lost its row and started again at day 1
    f.state.respond = { ok: false, status: 409, body: { ok: false, code: 'day_reset', error: DAY_RESET_MESSAGE } }
    await store.send('lucknow', { type: 'startDay' })
    expect(store.getState('lucknow')?.dayId).toBe('recreated')
  })

  it('a damaged shared day is reported as a problem, not left on Loading', async () => {
    const f = fake()
    f.state.day = { ...day(3), stops: [] } as unknown as DayState
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    expect(store.getInfo('lucknow')).toMatchObject({ link: 'problem', problem: 'unreadable' })
    f.state.push?.(day(4))
    expect(store.getInfo('lucknow').link).toBe('synced')
  })

  it('a refused join key on a TAP (key rotated, wrong key typed) also shows JOIN KEY REFUSED', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.respond = { ok: false, status: 401, body: { ok: false, error: 'Not allowed' } }
    await store.send('lucknow', { type: 'startDay' })
    expect(store.getInfo('lucknow')).toMatchObject({ link: 'problem', problem: 'bad-key' })
    f.state.respond = { ok: true, status: 200, body: { ok: true } }
    await store.send('lucknow', { type: 'startDay' })
    expect(store.getInfo('lucknow').link).toBe('synced')
  })

  it('reset tells the caller whether it worked (so a screen never claims a reset that failed)', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    expect(await store.reset('lucknow')).toBe(true)
    f.state.respond = { ok: false, status: 401, body: { error: 'Not allowed' } }
    expect(await store.reset('lucknow')).toBe(false)
    const none = createLiveStore(fake({ getAdminToken: () => undefined }).opts)
    expect(await none.reset('lucknow')).toBe(false)
  })

  it('does not poll while the tab is hidden, and polls again when it is shown', async () => {
    vi.useFakeTimers()
    try {
      let hidden = true
      const f = fake({ pollMs: 1000, isHidden: () => hidden })
      const store = createLiveStore(f.opts)
      await store.ensureDay('lucknow')
      f.state.day = day(9)
      await vi.advanceTimersByTimeAsync(3100)
      expect(store.getState('lucknow')?.version).toBe(1)
      hidden = false
      await vi.advanceTimersByTimeAsync(1100)
      expect(store.getState('lucknow')?.version).toBe(9)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a Realtime subscription that fails does not stop the store from starting (the poll still works)', async () => {
    const f = fake()
    const store = createLiveStore({ ...f.opts, feed: { fetchDay: async () => f.state.day, watch: () => { throw new Error('ws blocked') } } })
    await expect(store.ensureDay('lucknow')).resolves.toBeUndefined()
    expect(store.getState('lucknow')).toBeDefined()
  })
})
