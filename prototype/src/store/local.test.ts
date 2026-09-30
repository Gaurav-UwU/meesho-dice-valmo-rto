import { describe, expect, it, vi } from 'vitest'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from './geo.ts'
import { createLocalStore, type ChannelLike, type KeyValue } from './local.ts'

const loadGeo = async (id: 'powai' | 'whitefield' | 'lucknow' | 'gaya') => syntheticGeo(getHub(id))
const small = { loadGeo, ordersPerDay: 60, ridersPerHub: 6, now: () => 1_000, random: () => 0.5 }

const memoryStorage = (): KeyValue & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

/** Two in-memory channels wired to each other, like two browser tabs. */
const linkedChannels = (): [ChannelLike, ChannelLike] => {
  let toA: ((data: unknown) => void) | undefined
  let toB: ((data: unknown) => void) | undefined
  const a: ChannelLike = { postMessage: (m) => toB?.(m), listen: (h) => void (toA = h) }
  const b: ChannelLike = { postMessage: (m) => toA?.(m), listen: (h) => void (toB = h) }
  return [a, b]
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe('syntheticGeo', () => {
  it('scatters plausible points around the hub and is deterministic', () => {
    const geo = syntheticGeo(getHub('lucknow'))
    expect(geo.points.length).toBeGreaterThan(100)
    expect(geo.points.every((p) => p.distanceKm >= 0.4 && p.distanceKm < 25 && p.weight > 0)).toBe(true)
    expect(syntheticGeo(getHub('lucknow'))).toEqual(geo)
    expect(syntheticGeo(getHub('gaya'))).not.toEqual(geo)
  })
})

describe('local store', () => {
  it('loads a hub day on demand and only builds it once', async () => {
    const spy = vi.fn(loadGeo)
    const store = createLocalStore({ ...small, loadGeo: spy })
    expect(store.getState('powai')).toBeUndefined()
    await Promise.all([store.ensureDay('powai'), store.ensureDay('powai')])
    expect(store.getState('powai')?.stopOrder).toHaveLength(60)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(store.mode).toBe('demo')
  })

  it('applies an action, stamps the time and notifies subscribers', async () => {
    const store = createLocalStore(small)
    const listener = vi.fn()
    store.subscribe(listener)
    await store.send('powai', { type: 'startDay' })
    expect(store.getState('powai')?.started).toBe(true)
    expect(store.getState('powai')?.feed.at(-1)?.at).toBe(1_000)
    expect(listener).toHaveBeenCalled()
  })

  it('unsubscribed listeners stop hearing about changes', async () => {
    const store = createLocalStore(small)
    const listener = vi.fn()
    const off = store.subscribe(listener)
    await store.ensureDay('powai')
    listener.mockClear()
    off()
    await store.send('powai', { type: 'startDay' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('generates the OTP code itself and the customer message carries it', async () => {
    const store = createLocalStore(small)
    await store.send('powai', { type: 'startDay' })
    const s = store.getState('powai')!
    const id = s.stopOrder.find((x) => s.stops[x].flagged && !s.stops[x].manual)!
    await store.send('powai', { type: 'riderDeliver', orderId: id })
    const msg = store.getState('powai')!.messages.at(-1)!
    expect(msg.text).toContain('5500')
    await store.send('powai', { type: 'submitOtp', orderId: id, code: '5500' })
    expect(store.getState('powai')!.stops[id].status).toBe('delivered_a1')
  })

  it('does not notify for a no-op action', async () => {
    const store = createLocalStore(small)
    await store.ensureDay('powai')
    const listener = vi.fn()
    store.subscribe(listener)
    await store.send('powai', { type: 'submitOtp', orderId: 'nope', code: '1' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('autopilot works through stops', async () => {
    const store = createLocalStore(small)
    await store.send('powai', { type: 'startDay' })
    await store.autopilot('powai', 20)
    const s = store.getState('powai')!
    const done = s.stopOrder.filter((id) => ['delivered_a1', 'delivered_a2', 'ndr', 'refused'].includes(s.stops[id].status))
    expect(done.length).toBeGreaterThanOrEqual(15)
  })

  it('reset gives a fresh day with a higher version', async () => {
    const store = createLocalStore(small)
    await store.send('powai', { type: 'startDay' })
    const before = store.getState('powai')!.version
    await store.reset('powai')
    const after = store.getState('powai')!
    expect(after.started).toBe(false)
    expect(after.version).toBeGreaterThan(before)
  })

  it('keeps hubs separate', async () => {
    const store = createLocalStore(small)
    await store.send('powai', { type: 'startDay' })
    await store.ensureDay('gaya')
    expect(store.getState('gaya')?.started).toBe(false)
  })

  it('saves to storage and a new store restores the same day', async () => {
    const storage = memoryStorage()
    const a = createLocalStore({ ...small, storage })
    await a.send('powai', { type: 'startDay' })
    await tick()
    expect(storage.data.size).toBe(1)
    const b = createLocalStore({ ...small, storage })
    await b.ensureDay('powai')
    expect(b.getState('powai')?.started).toBe(true)
    expect(b.getState('powai')?.version).toBe(a.getState('powai')?.version)
  })

  it('ignores corrupt saved data and builds a fresh day', async () => {
    const storage = memoryStorage()
    storage.setItem('rescue-console-day-v5:powai', '{not json')
    const store = createLocalStore({ ...small, storage })
    await store.ensureDay('powai')
    expect(store.getState('powai')?.stopOrder).toHaveLength(60)
  })

  it('survives storage that throws', async () => {
    const storage: KeyValue = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    const store = createLocalStore({ ...small, storage })
    await store.send('powai', { type: 'startDay' })
    await tick()
    expect(store.getState('powai')?.started).toBe(true)
  })

  it('keeps two tabs in sync through the channel, including a reset', async () => {
    const [ca, cb] = linkedChannels()
    const tabA = createLocalStore({ ...small, channel: ca })
    const tabB = createLocalStore({ ...small, channel: cb })
    await tabA.ensureDay('powai')
    await tabB.ensureDay('powai')
    await tabA.send('powai', { type: 'startDay' })
    await tick()
    expect(tabB.getState('powai')?.started).toBe(true)
    await tabB.reset('powai')
    await tick()
    expect(tabA.getState('powai')?.started).toBe(false)
  })

  it('a channel that throws never breaks the demo, and junk messages are ignored', async () => {
    let deliver: (data: unknown) => void = () => undefined
    const channel: ChannelLike = {
      postMessage: () => {
        throw new Error('closed')
      },
      listen: (h) => void (deliver = h),
    }
    const store = createLocalStore({ ...small, channel })
    deliver('junk')
    deliver({ hubId: 'powai', state: {} })
    await store.send('powai', { type: 'startDay' })
    await tick()
    expect(store.getState('powai')?.started).toBe(true)
  })

  it('falls back to the labelled stand-in catchment when a hub file fails to load', async () => {
    const store = createLocalStore({ ...small, loadGeo: async () => Promise.reject(new Error('no file')) })
    await store.ensureDay('powai')
    expect(store.getState('powai')?.stopOrder).toHaveLength(60)
  })

  it('ignores a saved day from an older shape instead of crashing', async () => {
    const storage = memoryStorage()
    storage.setItem('rescue-console-day-v5:powai', JSON.stringify({ version: 3, stops: {}, stopOrder: [], hub: {} }))
    const store = createLocalStore({ ...small, storage })
    await store.ensureDay('powai')
    expect(store.getState('powai')?.stopOrder).toHaveLength(60)
  })

  it('a tab that receives a day from another tab saves it too', async () => {
    const [ca, cb] = linkedChannels()
    const storageB = memoryStorage()
    const tabA = createLocalStore({ ...small, channel: ca })
    const tabB = createLocalStore({ ...small, channel: cb, storage: storageB })
    await tabA.ensureDay('powai')
    await tabB.ensureDay('powai')
    await tabA.send('powai', { type: 'startDay' })
    await tick()
    expect(JSON.parse(storageB.data.get('rescue-console-day-v5:powai')!).started).toBe(true)
  })
})
