import { describe, expect, it, vi } from 'vitest'
import type { DayState } from '../domain/types.ts'
import { createDay } from '../domain/day.ts'
import { reduce } from '../domain/reducer.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
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

  it('adopts a reset (same version, different seed)', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.push?.({ ...day(1), seed: 99 })
    expect(store.getState('lucknow')?.seed).toBe(99)
  })

  it('sends an action to /api/action with the live key, then re-reads the day', async () => {
    const f = fake()
    const store = createLiveStore(f.opts)
    await store.ensureDay('lucknow')
    f.state.day = reduce(day(1), { type: 'startDay', at: 1 })
    await store.send('lucknow', { type: 'startDay' })
    const call = f.calls.find((c) => c.path === '/api/action')!
    expect(JSON.parse(call.body!)).toEqual({ hubId: 'lucknow', action: { type: 'startDay' } })
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
    expect(JSON.parse(admin[0].body!)).toEqual({ op: 'autopilot', count: 20, hubId: 'lucknow' })
    expect(JSON.parse(admin[1].body!)).toEqual({ op: 'reset', seed: 7, hubId: 'lucknow' })
    expect(JSON.parse(admin[2].body!)).toEqual({ op: 'reset', hubId: 'lucknow' })
  })

  it('asks for the admin token instead of calling the server without one', async () => {
    const f = fake({ getAdminToken: () => undefined })
    const store = createLiveStore(f.opts)
    await store.autopilot('lucknow', 20)
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
