import { describe, expect, it } from 'vitest'
import { chooseMode, joinUrl, liveAvailable, parseJoin } from './join.ts'

describe('parseJoin: what a link or QR code asks for', () => {
  it('reads the mode from the query and the live key from the part after #', () => {
    expect(parseJoin('?hub=lucknow&mode=live', '#k=abc123')).toEqual({ mode: 'live', liveKey: 'abc123' })
    expect(parseJoin('?mode=demo', '')).toEqual({ mode: 'demo' })
    expect(parseJoin('', '')).toEqual({})
  })

  it('ignores a mode it does not know and an empty or oversized key', () => {
    expect(parseJoin('?mode=party', '#k=')).toEqual({})
    expect(parseJoin('', `#k=${'x'.repeat(201)}`)).toEqual({})
  })

  it('decodes a key that had to be escaped', () => {
    expect(parseJoin('?mode=live', `#k=${encodeURIComponent('a b&c')}`)).toEqual({ mode: 'live', liveKey: 'a b&c' })
  })
})

describe('joinUrl: the link a phone opens from a QR code', () => {
  it('opens the right screen in shared mode and carries the key after the #, which a server never sees', () => {
    const u = joinUrl({ origin: 'https://x.app', route: '/rider', hub: 'lucknow', live: true, liveKey: 'k 1' })
    expect(u).toBe('https://x.app/rider?hub=lucknow&mode=live#k=k%201')
    expect(new URL(u).search).not.toContain('k%201')
  })

  it('has no key in it when there is none, and says demo when not shared', () => {
    expect(joinUrl({ origin: 'https://x.app', route: '/ops', hub: 'gaya', live: true })).toBe('https://x.app/ops?hub=gaya&mode=live')
    expect(joinUrl({ origin: 'https://x.app', route: '/ops', hub: 'gaya', live: false, liveKey: 'secret' })).toBe('https://x.app/ops?hub=gaya')
  })
})

describe('liveAvailable / chooseMode', () => {
  it('needs both Supabase settings built in', () => {
    expect(liveAvailable({ url: 'https://a.supabase.co', anon: 'k' })).toBe(true)
    expect(liveAvailable({ url: 'https://a.supabase.co' })).toBe(false)
    expect(liveAvailable({})).toBe(false)
  })

  it('demo unless shared mode is asked for; asking for it without a server is reported, never silent', () => {
    expect(chooseMode({ requested: null, remembered: null, liveAvailable: true })).toEqual({ mode: 'demo' })
    expect(chooseMode({ requested: 'live', remembered: null, liveAvailable: true })).toEqual({ mode: 'live' })
    expect(chooseMode({ requested: null, remembered: 'live', liveAvailable: true })).toEqual({ mode: 'live' })
    expect(chooseMode({ requested: 'live', remembered: null, liveAvailable: false })).toEqual({ mode: 'demo', aloneReason: 'live-unavailable' })
    expect(chooseMode({ requested: null, remembered: 'live', liveAvailable: false })).toEqual({ mode: 'demo', aloneReason: 'live-unavailable' })
  })

  it('an explicit ?mode=demo beats what the tab remembered', () => {
    expect(chooseMode({ requested: 'demo', remembered: 'live', liveAvailable: true })).toEqual({ mode: 'demo' })
  })
})
