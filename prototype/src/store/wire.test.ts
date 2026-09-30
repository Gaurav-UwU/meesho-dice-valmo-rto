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
  it('resyncs when the tab becomes visible, gets focus, is restored from the back/forward cache, comes back online, or another tab saved', () => {
    const e = fakeEnv()
    const resync = vi.fn(async () => undefined)
    wireResync({ resync }, e.win, e.doc)
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
