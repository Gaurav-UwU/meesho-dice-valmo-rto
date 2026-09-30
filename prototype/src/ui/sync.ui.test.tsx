// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutopilotLoop } from '../pages/ops/useAutopilotLoop.ts'
import { createDay } from '../domain/day.ts'
import type { DayState } from '../domain/types.ts'
import { getHub } from '../engine/hubs.ts'
import type { HubId } from '../engine/types.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLiveStore, type DayFeed, type LiveStoreOptions } from '../store/live.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import type { Store } from '../store/types.ts'
import { ByDay } from './ByDay.tsx'
import { DayLoading } from './DayLoading.tsx'
import { SyncBadge } from './SyncBadge.tsx'
import { SyncNotices } from './SyncNotices.tsx'

const loadGeo = async (id: HubId) => syntheticGeo(getHub(id))
const small = { loadGeo, ordersPerDay: 40, ridersPerHub: 4 }

const mount = (store: Store, ui: React.ReactNode, url = '/?hub=lucknow') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <StoreProvider store={store}>{ui}</StoreProvider>
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('SyncBadge: never silent about whether this device shares its day', () => {
  it('a Demo-mode device says ALONE, and the details say how to join', async () => {
    const store = createLocalStore(small)
    await store.ensureDay('lucknow')
    mount(store, <SyncBadge hubId="lucknow" />)
    expect(screen.getByText('ALONE')).toBeTruthy()
    expect(screen.getByRole('button').textContent).toMatch(/Only this device · Lucknow · Day 1/)
    await userEvent.setup().click(screen.getByRole('button'))
    expect(screen.getByText(/own private day/i)).toBeTruthy()
    expect(screen.getByText(/Several devices \(shared day\)/)).toBeTruthy()
  })

  it('the details close on Escape and on a tap elsewhere, so they never sit on top of a button', async () => {
    const store = createLocalStore(small)
    await store.ensureDay('lucknow')
    mount(store, <div><SyncBadge hubId="lucknow" /><button type="button">elsewhere</button></div>)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /ALONE/ }))
    expect(screen.queryByText(/own private day/i)).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByText(/own private day/i)).toBeNull()
    await user.click(screen.getByRole('button', { name: /ALONE/ }))
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(screen.queryByText(/own private day/i)).toBeNull()
  })

  it('the panel variant writes it all out', async () => {
    const store = createLocalStore({ ...small, aloneReason: 'live-unavailable' })
    await store.ensureDay('lucknow')
    mount(store, <SyncBadge hubId="lucknow" variant="panel" />)
    expect(screen.getByText('ALONE')).toBeTruthy()
    expect(screen.getByText(/no shared-day server|not set up/i)).toBeTruthy()
  })

  it('a private tab (no storage, no tab channel) is warned about in plain words', async () => {
    const store = createLocalStore(small)
    await store.ensureDay('lucknow')
    mount(store, <SyncBadge hubId="lucknow" variant="panel" />)
    expect(screen.getByText(/private or blocked tab/i)).toBeTruthy()
  })
})

/** A live store over a fake server, enough to drive the screens */
function fakeLive(initial: DayState | null) {
  const state = { day: initial, push: undefined as ((s: DayState) => void) | undefined }
  const feed: DayFeed = {
    fetchDay: async () => state.day,
    watch: (_h, on) => {
      state.push = on
      return () => undefined
    },
  }
  const opts: LiveStoreOptions = {
    feed,
    call: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }),
    getLiveKey: () => 'k',
    getAdminToken: () => 't',
    onError: () => undefined,
    pollMs: 0,
  }
  return { store: createLiveStore(opts), state }
}
const liveDay = (over: Partial<DayState> = {}): DayState => ({ ...createDay(syntheticGeo(getHub('lucknow')), { seed: 1, orders: 20, riders: 4 }), version: 1, ...over })

describe('a Live-mode device', () => {
  it('says SYNCED with the day, the version and when it changed', async () => {
    const { store } = fakeLive(liveDay({ dayNo: 3, dayId: 'd3-abcde', version: 42 }))
    await store.ensureDay('lucknow')
    mount(store, <SyncBadge hubId="lucknow" />)
    expect(screen.getByText('SYNCED')).toBeTruthy()
    expect(screen.getByRole('button').textContent).toMatch(/Shared day · Lucknow · Day 3 \(ABCDE\) · v42/)
  })

  it('does not sit on "Loading" when the saved day is from an older version: it says what is wrong and what to do', async () => {
    const { store } = fakeLive({ ...liveDay(), schema: 5 } as DayState)
    await store.ensureDay('lucknow')
    mount(store, <DayLoading hubId="lucknow" />)
    expect(screen.getByRole('alert').textContent).toMatch(/NEEDS RESET/)
    expect(screen.getByRole('alert').textContent).toMatch(/Reset day/)
  })

  it('offers the Reset day button right there, because the Ops dashboard is not shown without a day', async () => {
    const { store } = fakeLive({ ...liveDay(), schema: 5 } as DayState)
    await store.ensureDay('lucknow')
    mount(store, <DayLoading hubId="lucknow" />)
    expect(screen.getByRole('button', { name: /Reset day/ })).toBeTruthy()
  })

  it('says OFFLINE when it cannot reach the shared day instead of pretending to load', async () => {
    const f = fakeLive(null)
    f.state.day = null
    const store = createLiveStore({
      feed: { fetchDay: async () => Promise.reject(new Error('down')), watch: () => () => undefined },
      call: async () => Promise.reject(new Error('down')),
      getLiveKey: () => 'k',
      getAdminToken: () => 't',
      onError: () => undefined,
      pollMs: 0,
    })
    await store.ensureDay('lucknow')
    await store.resync()
    mount(store, <DayLoading hubId="lucknow" />)
    expect(screen.getByRole('alert').textContent).toMatch(/OFFLINE/)
  })

  it('while loading normally it still says Loading', async () => {
    const store = createLocalStore(small)
    mount(store, <DayLoading hubId="lucknow" />)
    expect(screen.getByRole('status').textContent).toMatch(/^Loading Lucknow/)
  })
})

describe('ByDay: a reset wipes what a screen was holding', () => {
  function Counter() {
    const [n, setN] = useState(0)
    return (
      <button type="button" onClick={() => setN((x) => x + 1)}>
        taps {n}
      </button>
    )
  }

  it('keeps local state while the day is the same and through the first load, and drops it when the day is reset (even by another device)', async () => {
    const f = fakeLive(liveDay({ dayId: 'day-1', dayNo: 1 }))
    mount(f.store, <ByDay><Counter /></ByDay>)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'taps 0' }))
    expect(screen.getByRole('button', { name: 'taps 1' })).toBeTruthy()
    // same day, more actions: still 1
    act(() => f.state.push?.(liveDay({ dayId: 'day-1', dayNo: 1, version: 5 })))
    expect(screen.getByRole('button', { name: 'taps 1' })).toBeTruthy()
    // another device resets the day
    act(() => f.state.push?.(liveDay({ dayId: 'day-2', dayNo: 2, version: 6 })))
    await waitFor(() => expect(screen.getByRole('button', { name: 'taps 0' })).toBeTruthy())
  })
})

describe('SyncNotices: the person is told, once', () => {
  it('shows one notice when the day is reset under them, and none for what was already there', async () => {
    const f = fakeLive(liveDay({ dayId: 'day-1', dayNo: 1 }))
    await f.store.ensureDay('lucknow')
    mount(f.store, <SyncNotices />)
    expect(document.body.textContent).not.toMatch(/reset/i)
    act(() => f.state.push?.(liveDay({ dayId: 'day-2', dayNo: 2, version: 2 })))
    await waitFor(() => expect(document.body.textContent).toMatch(/day was reset/i))
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1)
  })
})

describe('Autopilot stops when a step is refused', () => {
  beforeEach(() => vi.useFakeTimers())

  it('switches itself off when a step says false (the day changed under it), and keeps going while steps work', async () => {
    const step = vi.fn(async () => true)
    const { result } = renderHook(() => useAutopilotLoop(true, step))
    act(() => result.current.toggle())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3200)
    })
    expect(result.current.active).toBe(true)
    expect(step.mock.calls.length).toBeGreaterThanOrEqual(2)
    step.mockImplementation(async () => false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(result.current.active).toBe(false)
    const calls = step.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(step.mock.calls.length).toBe(calls)
  })
})
