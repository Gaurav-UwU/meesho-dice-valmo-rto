import { describe, expect, it, vi } from 'vitest'
import { wireResync } from './wire.ts'

/** A tiny stand-in for window and document that records listeners */
const fakeEnv = () => {
  const handlers = new Map<string, () => void>()
  const add = (type: string, fn: () => void): void => void handlers.set(type, fn)
  const doc = { visibilityState: 'visible' as 'visible' | 'hidden', addEventListener: add }
  const win = { addEventListener: add }
  return { handlers, doc, win }
}

describe('wireResync: a device that woke up, came back online or saw another tab write looks for the newest day', () => {
  const eachTimeRunning = (e: ReturnType<typeof fakeEnv>, resync: () => Promise<void>): void => {
    wireResync({ resync }, e.win, e.doc, { minGapMs: 0 })
  }

  it('resyncs when the tab becomes visible, gets focus, is restored from the back/forward cache, comes back online, or another tab saved', () => {
    const e = fakeEnv()
    const resync = vi.fn(async () => undefined)
    eachTimeRunning(e, resync)
    for (const type of ['visibilitychange', 'focus', 'pageshow', 'online', 'storage']) {
      resync.mockClear()
      e.handlers.get(type)!()
      expect(resync, type).toHaveBeenCalledTimes(1)
    }
  })

  it('does nothing while the tab is hidden', () => {
    const e = fakeEnv()
    const resync = vi.fn(async () => undefined)
    wireResync({ resync }, e.win, e.doc)
    e.doc.visibilityState = 'hidden'
    e.handlers.get('visibilitychange')!()
    expect(resync).not.toHaveBeenCalled()
  })

  it('never lets a failed resync break the page', async () => {
    const e = fakeEnv()
    wireResync({ resync: async () => Promise.reject(new Error('down')) }, e.win, e.doc)
    expect(() => e.handlers.get('focus')!()).not.toThrow()
    await new Promise((r) => setTimeout(r, 0))
  })
})

describe('wireResync: bursts of wake-up events cause one look, not many', () => {
  it('ignores events that come within the minimum gap of the last look', () => {
    let t = 1000
    const e = fakeEnv()
    const resync = vi.fn(async () => undefined)
    wireResync({ resync }, e.win, e.doc, { minGapMs: 1000, now: () => t })
    e.handlers.get('focus')!()
    e.handlers.get('storage')!()
    e.handlers.get('pageshow')!()
    expect(resync).toHaveBeenCalledTimes(1)
    t += 1200
    e.handlers.get('focus')!()
    expect(resync).toHaveBeenCalledTimes(2)
  })
})
