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
    storage.setItem('rescue-console-day-v8:powai', '{not json')
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
    storage.setItem('rescue-console-day-v8:powai', JSON.stringify({ version: 3, stops: {}, stopOrder: [], hub: {} }))
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
    expect(JSON.parse(storageB.data.get('rescue-console-day-v8:powai')!).started).toBe(true)
  })
})

/** A channel that goes nowhere: a tab that is asleep, a browser with no BroadcastChannel message delivered. */
const deaf: ChannelLike = { postMessage: () => undefined, listen: () => undefined }

describe('local store: a new day reaches every tab and an old day can never come back', () => {
  it('a reset makes a new day id and a higher day number, and keeps the version climbing', async () => {
    const store = createLocalStore(small)
    await store.send('powai', { type: 'startDay' })
    const before = store.getState('powai')!
    await store.reset('powai')
    const after = store.getState('powai')!
    expect(after.dayId).not.toBe(before.dayId)
    expect(after.dayNo).toBe(before.dayNo + 1)
    expect(after.version).toBeGreaterThan(before.version)
    expect(after.started).toBe(false)
  })

  it('a first day is day 1, and tabs that open at the same time hold the SAME first day (so they never start out as rivals)', async () => {
    const one = createLocalStore({ ...small, random: () => 0.1 })
    const two = createLocalStore({ ...small, random: () => 0.7 })
    await one.ensureDay('powai')
    await two.ensureDay('powai')
    expect(one.getState('powai')!.dayNo).toBe(1)
    expect(one.getState('powai')!.dayId).toBe(two.getState('powai')!.dayId)
    await one.reset('powai')
    await two.reset('powai')
    expect(one.getState('powai')!.dayId).not.toBe(two.getState('powai')!.dayId) // each reset is its own event
  })

  it('tabs that opened at the same moment (nothing saved yet) follow each other from the first tap', async () => {
    const [ca, cb] = linkedChannels()
    const tabA = createLocalStore({ ...small, channel: ca, random: () => 0.2 })
    const tabB = createLocalStore({ ...small, channel: cb, random: () => 0.9 })
    await Promise.all([tabA.ensureDay('powai'), tabB.ensureDay('powai')])
    await tabA.send('powai', { type: 'startDay' })
    await tick()
    expect(tabB.getState('powai')!.started).toBe(true)
    await tabB.send('powai', { type: 'advanceClock', minutes: 30 })
    await tick()
    expect(tabA.getState('powai')!.version).toBe(tabB.getState('powai')!.version)
  })

  it('THE BUG: a tab that took more actions still switches to the new day after a reset somewhere else', async () => {
    // A hears nothing from B, B hears A: B took three actions A never saw, then A resets.
    let toB: ((data: unknown) => void) | undefined
    const a: ChannelLike = { postMessage: (m) => toB?.(m), listen: () => undefined }
    const b: ChannelLike = { postMessage: () => undefined, listen: (h) => void (toB = h) }
    const tabA = createLocalStore({ ...small, channel: a })
    const tabB = createLocalStore({ ...small, channel: b })
    await tabA.ensureDay('powai')
    await tabB.ensureDay('powai')
    await tabB.send('powai', { type: 'startDay' })
    await tabB.send('powai', { type: 'advanceClock', minutes: 30 })
    await tabB.send('powai', { type: 'advanceClock', minutes: 30 })
    expect(tabB.getState('powai')!.version).toBeGreaterThan(tabA.getState('powai')!.version + 1)
    await tabA.reset('powai')
    await tick()
    expect(tabB.getState('powai')!.dayId).toBe(tabA.getState('powai')!.dayId)
    expect(tabB.getState('powai')!.started).toBe(false)
  })

  it('an old day broadcast late does not replace a newer day', async () => {
    const [ca, cb] = linkedChannels()
    const tabA = createLocalStore({ ...small, channel: ca })
    const tabB = createLocalStore({ ...small, channel: cb })
    await tabA.ensureDay('powai')
    await tabB.ensureDay('powai')
    const oldDay = tabA.getState('powai')!
    await tabA.reset('powai')
    await tick()
    const fresh = tabB.getState('powai')!
    expect(fresh.dayNo).toBe(2)
    // replay the old day into B, as a slow channel would
    ca.postMessage({ hubId: 'powai', state: { ...oldDay, version: 999 } })
    await tick()
    expect(tabB.getState('powai')!.dayId).toBe(fresh.dayId)
  })

  it('a tab that missed the reset message cannot overwrite it: its tap is refused and it moves to the new day', async () => {
    const storage = memoryStorage()
    const tabA = createLocalStore({ ...small, storage, channel: deaf })
    const tabB = createLocalStore({ ...small, storage, channel: deaf })
    await tabA.ensureDay('powai')
    await tabB.ensureDay('powai')
    await tabA.reset('powai')
    await tick()
    const fresh = tabA.getState('powai')!
    expect(tabB.getState('powai')!.dayId).not.toBe(fresh.dayId) // B never heard
    await tabB.send('powai', { type: 'startDay' })
    await tick()
    expect(tabB.getState('powai')!.dayId).toBe(fresh.dayId)
    expect(tabB.getState('powai')!.started).toBe(false) // the tap was NOT applied to the new day
    expect(tabB.getInfo('powai').notice?.text).toMatch(/day was reset/i)
    expect(JSON.parse(storage.data.get('rescue-console-day-v8:powai')!).dayId).toBe(fresh.dayId)
  })

  it('an autopilot step from a tab showing the old day is refused too, and says so (so the loop stops)', async () => {
    const storage = memoryStorage()
    const tabA = createLocalStore({ ...small, storage, channel: deaf })
    const tabB = createLocalStore({ ...small, storage, channel: deaf })
    await tabA.send('powai', { type: 'startDay' })
    await tick()
    await tabB.ensureDay('powai')
    await tabA.reset('powai')
    await tick()
    expect(await tabB.autopilot('powai', 20)).toBe(false)
    expect(tabB.getState('powai')!.dayId).toBe(tabA.getState('powai')!.dayId)
    expect(tabB.getState('powai')!.started).toBe(false)
  })

  it('autopilot reports true when it did work', async () => {
    const store = createLocalStore(small)
    await store.send('powai', { type: 'startDay' })
    expect(await store.autopilot('powai', 10)).toBe(true)
  })

  it('never writes an older day over a newer one in storage', async () => {
    const storage = memoryStorage()
    const tabA = createLocalStore({ ...small, storage, channel: deaf })
    const tabB = createLocalStore({ ...small, storage, channel: deaf })
    await tabB.ensureDay('powai')
    await tabA.reset('powai')
    await tick()
    const newId = JSON.parse(storage.data.get('rescue-console-day-v8:powai')!).dayId
    // B is stale and acts on something that is not a day-checked tap (a no-op path); its write must not win either way
    await tabB.send('powai', { type: 'startDay' })
    await tick()
    expect(JSON.parse(storage.data.get('rescue-console-day-v8:powai')!).dayId).toBe(newId)
  })

  it('resync() picks up a newer day another tab saved while this one was asleep', async () => {
    const storage = memoryStorage()
    const tabA = createLocalStore({ ...small, storage, channel: deaf })
    const tabB = createLocalStore({ ...small, storage, channel: deaf })
    await tabB.ensureDay('powai')
    await tabA.send('powai', { type: 'startDay' })
    await tabA.reset('powai')
    await tick()
    const listener = vi.fn()
    tabB.subscribe(listener)
    await tabB.resync()
    expect(tabB.getState('powai')!.dayId).toBe(tabA.getState('powai')!.dayId)
    expect(listener).toHaveBeenCalled()
    expect(tabB.getInfo('powai').notice?.text).toMatch(/new day|reset/i)
  })

  it('resync() does nothing when storage holds the same or an older day', async () => {
    const storage = memoryStorage()
    const store = createLocalStore({ ...small, storage })
    await store.send('powai', { type: 'startDay' })
    await tick()
    const before = store.getState('powai')
    await store.resync()
    expect(store.getState('powai')).toBe(before)
  })

  it('a saved day from the old shape (v5 key) is not read, and the new key is used', async () => {
    const storage = memoryStorage()
    storage.setItem('rescue-console-day-v5:powai', JSON.stringify({ schema: 5, version: 40, hub: { id: 'powai' }, stopOrder: [] }))
    const store = createLocalStore({ ...small, storage })
    await store.send('powai', { type: 'startDay' })
    await tick()
    expect(store.getState('powai')!.version).toBeLessThan(40)
    expect(storage.data.has('rescue-console-day-v8:powai')).toBe(true)
  })

  it('a saved day with the right key but the wrong shape is replaced, with a notice', async () => {
    const storage = memoryStorage()
    storage.setItem('rescue-console-day-v8:powai', JSON.stringify({ schema: 4, version: 3, hub: { id: 'powai' }, stopOrder: [] }))
    const store = createLocalStore({ ...small, storage })
    await store.ensureDay('powai')
    expect(store.getState('powai')?.stopOrder).toHaveLength(60)
    expect(store.getInfo('powai').notice?.text).toMatch(/older version|fresh/i)
  })
})

describe('local store: it always says whether this device is alone', () => {
  it('Demo mode is ALONE and says why, with nothing wrong', async () => {
    const store = createLocalStore({ ...small, storage: memoryStorage(), channel: deaf })
    await store.ensureDay('powai')
    const info = store.getInfo('powai')
    expect(info).toMatchObject({ mode: 'demo', link: 'alone', aloneReason: 'demo', warnings: [] })
    expect(info.day).toMatchObject({ hubId: 'powai', dayNo: 1 })
    expect(info.day?.dayId).toBe(store.getState('powai')!.dayId)
  })

  it('warns when the browser cannot keep the day (private tab) or cannot tell its other tabs', async () => {
    const store = createLocalStore(small)
    await store.ensureDay('powai')
    expect(store.getInfo('powai').warnings).toEqual(['storage-blocked', 'no-tab-sync'])
  })

  it('says when Live mode was asked for but is not available in this build', async () => {
    const store = createLocalStore({ ...small, aloneReason: 'live-unavailable' })
    await store.ensureDay('powai')
    expect(store.getInfo('powai')).toMatchObject({ link: 'alone', aloneReason: 'live-unavailable' })
  })

  it('records when the day last changed and gives the same object until something changes', async () => {
    let t = 5_000
    const store = createLocalStore({ ...small, now: () => t })
    await store.ensureDay('powai')
    const one = store.getInfo('powai')
    expect(store.getInfo('powai')).toBe(one)
    t = 9_000
    await store.send('powai', { type: 'startDay' })
    const two = store.getInfo('powai')
    expect(two).not.toBe(one)
    expect(two.lastUpdateAt).toBe(9_000)
    expect(two.day?.version).toBe(1)
  })

  it('before the day has loaded there is no day in the info', () => {
    const store = createLocalStore(small)
    expect(store.getInfo('powai').day).toBeUndefined()
  })
})

describe('local store: concurrent tabs never silently lose the newer write', () => {
  it('a late broadcast of an older version does not overwrite a newer saved day', async () => {
    const storage = memoryStorage()
    let toB: ((data: unknown) => void) | undefined
    const a: ChannelLike = { postMessage: (m) => toB?.(m), listen: () => undefined }
    const b: ChannelLike = { postMessage: () => undefined, listen: (h) => void (toB = h) }
    const tabA = createLocalStore({ ...small, storage, channel: a })
    const tabB = createLocalStore({ ...small, storage, channel: b })
    await tabA.ensureDay('powai')
    await tabB.ensureDay('powai')
    await tabA.send('powai', { type: 'startDay' })
    await tick()
    const v1 = tabA.getState('powai')!
    // a third writer saves something newer straight into storage while the broadcast of v1 is still in flight
    const newer = { ...v1, version: v1.version + 2 }
    storage.setItem('rescue-console-day-v8:powai', JSON.stringify(newer))
    toB?.({ hubId: 'powai', state: { ...v1, version: v1.version + 1 } })
    await tick()
    expect(JSON.parse(storage.data.get('rescue-console-day-v8:powai')!).version).toBe(newer.version)
  })

  it('two tabs that act at the same version: the second writer notices, keeps the first one\'s saved change and says its own tap was not kept', async () => {
    const storage = memoryStorage()
    const tabA = createLocalStore({ ...small, storage, channel: deaf })
    const tabB = createLocalStore({ ...small, storage, channel: deaf })
    await tabA.ensureDay('powai')
    await tabB.ensureDay('powai')
    await tabA.send('powai', { type: 'startDay' })
    await tick()
    await tabB.resync()
    // both tabs tap before either has flushed
    await Promise.all([tabA.send('powai', { type: 'advanceClock', minutes: 30 }), tabB.send('powai', { type: 'advanceClock', minutes: 60 })])
    await tick()
    const saved = JSON.parse(storage.data.get('rescue-console-day-v8:powai')!)
    const told = [tabA, tabB].filter((t) => /tap again/i.test(t.getInfo('powai').notice?.text ?? ''))
    expect(told).toHaveLength(1) // exactly one tab lost its tap, and it knows
    const loser = told[0]
    expect(loser.getState('powai')!.version).toBe(saved.version) // it now shows what is saved
    expect(loser.getState('powai')!.started).toBe(saved.started)
  })

  it('a tab that keeps acting on its own does not raise that notice', async () => {
    const storage = memoryStorage()
    const store = createLocalStore({ ...small, storage, channel: deaf })
    await store.send('powai', { type: 'startDay' })
    await store.send('powai', { type: 'advanceClock', minutes: 30 })
    await tick()
    await store.send('powai', { type: 'advanceClock', minutes: 30 })
    await tick()
    expect(store.getInfo('powai').notice).toBeUndefined()
  })

  it('reset returns true', async () => {
    const store = createLocalStore(small)
    expect(await store.reset('powai')).toBe(true)
  })
})
