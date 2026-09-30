import { describe, expect, it } from 'vitest'
import { agoText, describeSync, shortDayId } from './syncText.ts'
import type { SyncInfo } from './types.ts'

const day = { hubId: 'lucknow' as const, dayId: 'd3-lx9k2a1b7q', dayNo: 3, version: 42 }
const live = (extra: Partial<SyncInfo> = {}): SyncInfo => ({ mode: 'live', link: 'synced', warnings: [], day, lastUpdateAt: 88_000, lastCheckedAt: 98_000, ...extra })
const demo = (extra: Partial<SyncInfo> = {}): SyncInfo => ({ mode: 'demo', link: 'alone', aloneReason: 'demo', warnings: [], day, lastUpdateAt: 90_000, ...extra })
const NOW = 100_000

describe('agoText', () => {
  it('says it in plain words', () => {
    expect(agoText(undefined, NOW)).toBe('not yet')
    expect(agoText(NOW - 400, NOW)).toBe('just now')
    expect(agoText(NOW - 4_000, NOW)).toBe('4 s ago')
    expect(agoText(NOW - 125_000, NOW)).toBe('2 min ago')
    expect(agoText(NOW + 5_000, NOW)).toBe('just now') // a clock that runs a little behind never prints a negative
  })
})

describe('shortDayId', () => {
  it('keeps the end of the id, where the random part is', () => {
    expect(shortDayId('d3-lx9k2a1b7q')).toBe('A1B7Q')
    expect(shortDayId('abc')).toBe('ABC')
    expect(shortDayId('day-2026')).toBe('Y2026') // dashes are not shown
  })
})

describe('describeSync: every screen says, in plain words, whether it is on a shared day', () => {
  it('SYNCED shows the hub, the day number and id, the version and when it last changed', () => {
    const d = describeSync(live(), 'Lucknow', NOW)
    expect(d.tone).toBe('synced')
    expect(d.label).toBe('SYNCED')
    expect(d.headline).toBe('Shared day · Lucknow · Day 3 (A1B7Q) · v42')
    expect(d.detail).toMatch(/everyone/i)
    expect(d.detail).toMatch(/last change 12 s ago/i)
    expect(d.detail).toMatch(/checked with the server 2 s ago/)
  })

  it('ALONE says the device has its own private day, that only tabs of this browser share it, and how to join', () => {
    const d = describeSync(demo(), 'Lucknow', NOW)
    expect(d.tone).toBe('alone')
    expect(d.label).toBe('ALONE')
    expect(d.headline).toBe('Only this device · Lucknow · Day 3 (A1B7Q) · v42')
    expect(d.detail).toMatch(/own private day/i)
    expect(d.detail).toMatch(/other phones/i)
    expect(d.howToJoin).toMatch(/several devices/i)
  })

  it('ALONE because Live mode was asked for but this build has no shared-day server', () => {
    const d = describeSync(demo({ aloneReason: 'live-unavailable' }), 'Lucknow', NOW)
    expect(d.label).toBe('ALONE')
    expect(d.detail).toMatch(/no shared-day server|not set up/i)
    expect(d.howToJoin).toBeTruthy()
  })

  it('warns about a private tab and about a browser that cannot tell its tabs', () => {
    const d = describeSync(demo({ warnings: ['storage-blocked', 'no-tab-sync'] }), 'Lucknow', NOW)
    expect(d.warnings.join(' ')).toMatch(/private|blocked/i)
    expect(d.warnings.join(' ')).toMatch(/other tabs/i)
    expect(describeSync(demo(), 'Lucknow', NOW).warnings).toEqual([])
  })

  it('CONNECTING, OFFLINE (with the last day it saw) and each problem have their own clear words', () => {
    expect(describeSync(live({ link: 'connecting', day: undefined }), 'Lucknow', NOW)).toMatchObject({ tone: 'warn', label: 'CONNECTING' })
    const off = describeSync(live({ link: 'offline' }), 'Lucknow', NOW)
    expect(off).toMatchObject({ tone: 'bad', label: 'OFFLINE' })
    expect(off.detail).toMatch(/cannot reach/i)
    expect(off.detail).toMatch(/Day 3/)
    expect(describeSync(live({ link: 'problem', problem: 'old-shape', day: undefined }), 'Lucknow', NOW)).toMatchObject({ tone: 'bad', label: 'NEEDS RESET' })
    expect(describeSync(live({ link: 'problem', problem: 'old-shape', day: undefined }), 'Lucknow', NOW).howToJoin).toMatch(/Reset day/)
    expect(describeSync(live({ link: 'problem', problem: 'bad-key' }), 'Lucknow', NOW)).toMatchObject({ tone: 'bad', label: 'JOIN KEY REFUSED' })
    expect(describeSync(live({ link: 'problem', problem: 'app-too-old', day: undefined }), 'Lucknow', NOW)).toMatchObject({ tone: 'bad', label: 'PAGE OUT OF DATE' })
  })

  it('before any day has loaded in Demo mode it still says ALONE', () => {
    const d = describeSync(demo({ day: undefined }), 'Lucknow', NOW)
    expect(d.headline).toBe('Only this device · Lucknow')
  })
})
