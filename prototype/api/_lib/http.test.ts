import { describe, expect, it } from 'vitest'
import { demoStops } from '../../src/domain/selectors.ts'
import { runAction, runEnsure, runReset } from './core.ts'
import { loadEnv } from './env.ts'
import { createRateLimiter, handleAction, handleAdmin, handleHealth, handleTwilio } from './http.ts'
import { twilioSignature } from './twilio.ts'
import { harness } from './testkit.ts'

const RIDER = 'rider-key-0123456789abcdef'
const CAPT = 'captain-key-0123456789abcd'

const post = (url: string, body: unknown, headers: Record<string, string> = {}): Request =>
  new Request(url, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } })

/** Make the hub's day exist and return its id, like a screen does when it opens. */
async function ready(h: ReturnType<typeof harness>, hub: 'lucknow' | 'gaya' = 'lucknow'): Promise<string> {
  await runEnsure(h.deps, hub)
  return h.db.days.get(hub)!.dayId
}

describe('handleAction', () => {
  // Two keys: the RIDER key (in the QR codes) and the CAPTAIN key (the team's, never in a QR code).
  const cfg = { liveKey: 'rider-key-0123456789abcdef', captainKey: 'captain-key-0123456789abcd' }
  const rider = { 'x-live-key': 'rider-key-0123456789abcdef' }
  const captain = { 'x-live-key': 'captain-key-0123456789abcd' }
  // Every tap names the day it was made on. Screens get the id from the day they read; the tests read it from the store.
  const startDay = { hubId: 'lucknow', dayId: 'test-day', action: { type: 'startDay' } }

  it('applies a valid, authorised action', async () => {
    const h = harness()
    const dayId = await ready(h)
    const res = await handleAction(post('http://x/api/action', { ...startDay, dayId }, captain), h.deps, cfg)
    expect(res.status).toBe(200)
    expect(h.db.days.get('lucknow')?.started).toBe(true)
  })

  it('a RIDER key can send only the rider actions: starting the day, deciding, the clock and the pilot need the captain key (403)', async () => {
    const h = harness()
    const dayId = await ready(h)
    await handleAction(post('http://x', { ...startDay, dayId }, captain), h.deps, cfg)
    const oid = demoStops(h.db.days.get('lucknow')!).bonus[0]
    const send = async (action: unknown, headers: Record<string, string>) => handleAction(post('http://x', { hubId: 'lucknow', dayId, action }, headers), h.deps, cfg)
    for (const action of [
      { type: 'startDay' },
      { type: 'resolveException', orderId: oid, action: 'confirm' },
      { type: 'overturnStrike', strikeId: 'k1' },
      { type: 'reviewBonus', orderId: oid, decision: 'release' },
      { type: 'advanceClock', minutes: 60 },
      { type: 'advanceDay' },
      { type: 'closePilot' },
      { type: 'deskHold', parcelId: `P-${oid}` },
      { type: 'openReturn', orderId: oid },
    ]) {
      const res = await send(action, rider)
      expect(res.status, JSON.stringify(action)).toBe(403)
    }
    const before = h.db.days.get('lucknow')!.version
    expect((await send({ type: 'advanceDay' }, rider)).status).toBe(403)
    expect(h.db.days.get('lucknow')!.version).toBe(before)
    // The same actions with the captain key go through (or fail on their own merits, never with 403).
    expect((await send({ type: 'advanceClock', minutes: 60 }, captain)).status).toBe(200)
  })

  it('a RIDER key can send riderDeliver, submitOtp, riderAttempt and riderRefuse, and the customer replies', async () => {
    const h = harness()
    const dayId = await ready(h)
    await handleAction(post('http://x', { ...startDay, dayId }, captain), h.deps, cfg)
    const oid = demoStops(h.db.days.get('lucknow')!).bonus[0]
    const send = async (action: unknown) => handleAction(post('http://x', { hubId: 'lucknow', dayId, action }, rider), h.deps, cfg)
    expect((await send({ type: 'riderDeliver', orderId: oid })).status).toBe(200)
    expect((await send({ type: 'submitOtp', orderId: oid, code: '0000' })).status).toBe(200)
    expect((await send({ type: 'customerReply', orderId: oid, reply: 'home' })).status).toBe(200)
    const o2 = demoStops(h.db.days.get('lucknow')!).bonus[1]
    expect((await send({ type: 'riderAttempt', orderId: o2, claim: 'customer_unavailable' })).status).toBe(200)
    expect((await send({ type: 'customerReach', orderId: o2, reached: false })).status).toBe(200)
    const o3 = demoStops(h.db.days.get('lucknow')!).bonus[2]
    expect((await send({ type: 'riderRefuse', orderId: o3, reason: 'no_cash' })).status).toBe(200)
  })

  it('a rider key still cannot answer for a customer on a REAL WhatsApp number (the bound-order guard)', async () => {
    const h = harness()
    const dayId = await ready(h)
    await handleAction(post('http://x', { ...startDay, dayId }, captain), h.deps, cfg)
    const oid = demoStops(h.db.days.get('lucknow')!).bonus[0]
    h.db.bindings.set('+919999900001', { phone: '+919999900001', hubId: 'lucknow', orderId: oid })
    const res = await handleAction(post('http://x', { hubId: 'lucknow', dayId, action: { type: 'customerReach', orderId: oid, reached: true } }, rider), h.deps, cfg)
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toMatch(/own WhatsApp/)
  })

  it('the captain key can send everything, and a rider key is not the captain key (neither opens the other)', async () => {
    const h = harness()
    const dayId = await ready(h)
    expect((await handleAction(post('http://x', { ...startDay, dayId }, rider), h.deps, cfg)).status).toBe(403)
    expect(h.db.days.get('lucknow')!.started).toBe(false)
    expect((await handleAction(post('http://x', { ...startDay, dayId }, { 'x-live-key': `${CAPT}x` }), h.deps, cfg)).status).toBe(401)
    expect((await handleAction(post('http://x', { ...startDay, dayId }, captain), h.deps, cfg)).status).toBe(200)
  })

  it('the 403 says what is needed without revealing either key', async () => {
    const h = harness()
    const dayId = await ready(h)
    const res = await handleAction(post('http://x', { ...startDay, dayId }, rider), h.deps, cfg)
    const body = (await res.json()) as { error: string; code?: string }
    expect(body.error).toMatch(/captain key/i)
    expect(JSON.stringify(body)).not.toContain(CAPT)
    expect(JSON.stringify(body)).not.toContain(RIDER)
  })


  it('rejects a missing or wrong live key', async () => {
    const h = harness()
    expect((await handleAction(post('http://x', startDay), h.deps, cfg)).status).toBe(401)
    expect((await handleAction(post('http://x', startDay, { 'x-live-key': 'nope' }), h.deps, cfg)).status).toBe(401)
    expect(h.db.days.size).toBe(0)
  })

  it('needs no key when none is configured', async () => {
    const h = harness()
    const dayId = await ready(h)
    expect((await handleAction(post('http://x', { ...startDay, dayId }), h.deps, {})).status).toBe(200)
  })

  it('refuses a tap that does not say which day it was made on (an old page that is still open)', async () => {
    const h = harness()
    await ready(h)
    const res = await handleAction(post('http://x', { hubId: 'lucknow', action: { type: 'startDay' } }), h.deps, {})
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toMatch(/dayId/)
    expect(h.db.days.get('lucknow')!.started).toBe(false)
  })

  it('answers 409 with the code day_reset when the tap was made on a day that has since been reset, and does not apply it', async () => {
    const h = harness()
    const oldId = await ready(h)
    await runReset(h.deps, 'lucknow')
    const res = await handleAction(post('http://x', { ...startDay, dayId: oldId }), h.deps, {})
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ ok: false, code: 'day_reset', error: 'The day was reset, refreshing' })
    expect(h.db.days.get('lucknow')!.started).toBe(false)
  })

  it('refuses a body that is not declared as JSON (blocks cross-site form posts)', async () => {
    const h = harness()
    const form = new Request('http://x', { method: 'POST', body: JSON.stringify(startDay), headers: { 'content-type': 'text/plain' } })
    expect((await handleAction(form, h.deps, {})).status).toBe(415)
    expect(h.db.days.size).toBe(0)
  })

  it('rejects other methods, bad JSON, oversized bodies and invalid actions', async () => {
    const h = harness()
    expect((await handleAction(new Request('http://x', { method: 'GET' }), h.deps, {})).status).toBe(405)
    expect((await handleAction(post('http://x', '{not json'), h.deps, {})).status).toBe(400)
    expect((await handleAction(post('http://x', 'x'.repeat(20_000)), h.deps, {})).status).toBe(400)
    const bad = await handleAction(post('http://x', { hubId: 'lucknow', dayId: 'x', action: { type: 'submitOtp', orderId: 'bad', code: 'x' } }), h.deps, {})
    expect(bad.status).toBe(400)
    expect(h.db.days.size).toBe(0)
  })

  it('answers 429 when OTP requests for an order run out, 409 when the day is busy', async () => {
    const h = harness()
    await runAction(h.deps, 'lucknow', { type: 'startDay' })
    const orderId = demoStops(h.db.days.get('lucknow')!).bonus[0]
    const dayId = h.db.days.get('lucknow')!.dayId
    const otp = { hubId: 'lucknow', dayId, action: { type: 'riderDeliver', orderId } }
    for (let i = 0; i < 5; i++) await handleAction(post('http://x', otp), h.deps, {})
    expect((await handleAction(post('http://x', otp), h.deps, {})).status).toBe(429)
    h.db.conflicts = 99
    expect((await handleAction(post('http://x', { hubId: 'lucknow', dayId, action: { type: 'customerReply', orderId, reply: 'home' } }), h.deps, {})).status).toBe(409)
  })
})

describe('handleAdmin', () => {
  const cfg = { adminToken: 'admin-token-123' }
  const auth = { authorization: 'Bearer admin-token-123' }

  it('needs the admin token', async () => {
    const h = harness()
    const body = { op: 'reset', hubId: 'gaya' }
    expect((await handleAdmin(post('http://x', body), h.deps, cfg)).status).toBe(401)
    expect((await handleAdmin(post('http://x', body, { authorization: 'Bearer wrong' }), h.deps, cfg)).status).toBe(401)
    expect(h.db.days.size).toBe(0)
  })

  it('runs reset, autopilot and bind', async () => {
    const h = harness()
    expect((await handleAdmin(post('http://x', { op: 'reset', hubId: 'lucknow' }, auth), h.deps, cfg)).status).toBe(200)
    await runAction(h.deps, 'lucknow', { type: 'startDay' })
    const dayId = h.db.days.get('lucknow')!.dayId
    expect((await handleAdmin(post('http://x', { op: 'autopilot', hubId: 'lucknow', count: 30, dayId }, auth), h.deps, cfg)).status).toBe(200)
    const orderId = demoStops(h.db.days.get('lucknow')!).bonus[0]
    const bound = await handleAdmin(post('http://x', { op: 'bind', hubId: 'lucknow', orderId, phone: '+919999900001' }, auth), h.deps, cfg)
    expect(bound.status).toBe(200)
    expect(h.db.bindings.get('+919999900001')?.orderId).toBe(orderId)
  })

  it('refuses autopilot from a device showing an old day (409 day_reset), and one that names no day (400)', async () => {
    const h = harness()
    await handleAdmin(post('http://x', { op: 'reset', hubId: 'lucknow' }, auth), h.deps, cfg)
    await runAction(h.deps, 'lucknow', { type: 'startDay' })
    const before = h.db.days.get('lucknow')!
    const stale = await handleAdmin(post('http://x', { op: 'autopilot', hubId: 'lucknow', count: 30, dayId: 'an-older-day' }, auth), h.deps, cfg)
    expect(stale.status).toBe(409)
    expect(((await stale.json()) as { code: string }).code).toBe('day_reset')
    expect((await handleAdmin(post('http://x', { op: 'autopilot', hubId: 'lucknow', count: 30 }, auth), h.deps, cfg)).status).toBe(400)
    expect(h.db.days.get('lucknow')).toEqual(before)
  })

  it('reset works from any device with the token and gives every screen a new day to switch to', async () => {
    const h = harness()
    const first = await ready(h)
    const res = await handleAdmin(post('http://x', { op: 'reset', hubId: 'lucknow' }, auth), h.deps, cfg)
    expect(res.status).toBe(200)
    expect(h.db.days.get('lucknow')!.dayId).not.toBe(first)
  })

  it('rejects other methods, bad bodies and invalid operations', async () => {
    const h = harness()
    expect((await handleAdmin(new Request('http://x', { method: 'GET' }), h.deps, cfg)).status).toBe(405)
    expect((await handleAdmin(post('http://x', '{nope', auth), h.deps, cfg)).status).toBe(400)
    expect((await handleAdmin(post('http://x', { op: 'drop tables' }, auth), h.deps, cfg)).status).toBe(400)
  })

  it('reports an unknown order on bind', async () => {
    const h = harness()
    await runAction(h.deps, 'lucknow', { type: 'startDay' })
    const res = await handleAdmin(post('http://x', { op: 'bind', hubId: 'lucknow', orderId: 'lucknow-9999', phone: '+919999900001' }, auth), h.deps, cfg)
    expect(res.status).toBe(409)
  })
})

describe('handleTwilio', () => {
  const url = 'https://demo.vercel.app/api/whatsapp'
  const cfg = { authToken: 'twilio-secret-token', webhookUrl: url }

  const form = (params: Record<string, string>, sign = true): Request =>
    new Request(url, {
      method: 'POST',
      body: new URLSearchParams(params).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded', ...(sign ? { 'x-twilio-signature': twilioSignature(cfg.authToken, url, params) } : {}) },
    })

  async function boundHarness(): Promise<{ h: ReturnType<typeof harness>; orderId: string }> {
    const h = harness()
    await runAction(h.deps, 'lucknow', { type: 'startDay' })
    const orderId = demoStops(h.db.days.get('lucknow')!).bonus[0]
    h.db.bindings.set('+919999900001', { phone: '+919999900001', hubId: 'lucknow', orderId })
    return { h, orderId }
  }

  it('applies a signed reply from a bound phone', async () => {
    const { h, orderId } = await boundHarness()
    const res = await handleTwilio(form({ From: 'whatsapp:+919999900001', Body: '1' }), h.deps, cfg)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/xml')
    expect(h.db.days.get('lucknow')!.stops[orderId].replies).toEqual(['home'])
  })

  it('reads a shared location', async () => {
    const { h, orderId } = await boundHarness()
    await handleTwilio(form({ From: 'whatsapp:+919999900001', Body: '', Latitude: '26.87', Longitude: '81.02' }), h.deps, cfg)
    expect(h.db.days.get('lucknow')!.stops[orderId].location).toEqual({ lat: 26.87, lng: 81.02 })
  })

  it('rounds a shared location to about 1 km (the day is readable by anyone) and ignores out-of-range coordinates', async () => {
    const { h, orderId } = await boundHarness()
    await handleTwilio(form({ From: 'whatsapp:+919999900001', Body: '', Latitude: '26.876543', Longitude: '81.023456' }), h.deps, cfg)
    expect(h.db.days.get('lucknow')!.stops[orderId].location).toEqual({ lat: 26.88, lng: 81.02 })
    // The pin that drives the order is rounded in the stored day too: nothing finer than about 1 km is published.
    expect(h.db.days.get('lucknow')!.stops[orderId].order).toMatchObject({ lat: 26.88, lng: 81.02 })
    const before = h.db.days.get('lucknow')!.version
    await handleTwilio(form({ From: 'whatsapp:+919999900001', Body: '', Latitude: '999', Longitude: '0' }), h.deps, cfg)
    expect(h.db.days.get('lucknow')!.version).toBe(before)
  })

  it('applies a replayed or retried message (same MessageSid) only once', async () => {
    const { h, orderId } = await boundHarness()
    const params = { From: 'whatsapp:+919999900001', Body: '4', MessageSid: 'SM123' }
    await handleTwilio(form(params), h.deps, cfg)
    await handleTwilio(form(params), h.deps, cfg)
    expect(h.db.days.get('lucknow')!.stops[orderId].replies).toEqual(['pay_now'])
  })

  it('records the MessageSid only AFTER the reply was applied: a busy day answers 503 and the retry is applied, once', async () => {
    const { h, orderId } = await boundHarness()
    const params = { From: 'whatsapp:+919999900001', Body: '1', MessageSid: 'SMretry' }
    h.db.conflicts = 10 // every save loses the race: the day is "busy"
    const busy = await handleTwilio(form(params), h.deps, cfg)
    expect(busy.status).toBe(503)
    expect(h.db.seen.has('SMretry')).toBe(false)
    expect(h.db.days.get('lucknow')!.stops[orderId].replies).toEqual([])
    h.db.conflicts = 0
    expect((await handleTwilio(form(params), h.deps, cfg)).status).toBe(200)
    expect(h.db.days.get('lucknow')!.stops[orderId].replies).toEqual(['home'])
    expect(h.db.seen.has('SMretry')).toBe(true)
    await handleTwilio(form(params), h.deps, cfg)
    expect(h.db.days.get('lucknow')!.stops[orderId].replies).toEqual(['home'])
  })

  it('ignores a garbage location and still answers Twilio with 200', async () => {
    const { h } = await boundHarness()
    const res = await handleTwilio(form({ From: 'whatsapp:+919999900001', Body: 'hello', Latitude: 'abc', Longitude: '' }), h.deps, cfg)
    expect(res.status).toBe(200)
  })

  it('refuses unsigned or wrongly signed requests, without touching the day', async () => {
    const { h, orderId } = await boundHarness()
    expect((await handleTwilio(form({ From: 'whatsapp:+919999900001', Body: '1' }, false), h.deps, cfg)).status).toBe(403)
    const forged = new Request(url, { method: 'POST', body: 'From=whatsapp%3A%2B919999900001&Body=1', headers: { 'x-twilio-signature': 'AAAA' } })
    expect((await handleTwilio(forged, h.deps, cfg)).status).toBe(403)
    expect(h.db.days.get('lucknow')!.stops[orderId].replies).toEqual([])
  })

  it('rejects other methods and oversized bodies', async () => {
    const { h } = await boundHarness()
    expect((await handleTwilio(new Request(url, { method: 'GET' }), h.deps, cfg)).status).toBe(405)
    expect((await handleTwilio(new Request(url, { method: 'POST', body: 'x'.repeat(20_000) }), h.deps, cfg)).status).toBe(400)
  })
})

describe('rate limiter', () => {
  it('prunes keys that have gone quiet, so the map cannot grow forever', () => {
    let t = 0
    const allow = createRateLimiter(5, 1000, () => t)
    for (let i = 0; i < 500; i++) allow(`ip-${i}`)
    expect(allow.size()).toBe(500)
    t = 5000
    allow('ip-new')
    expect(allow.size()).toBeLessThan(5)
  })

  it('allows `limit` calls per window per key, then blocks, then recovers', () => {
    let t = 0
    const allow = createRateLimiter(2, 1000, () => t)
    expect([allow('a'), allow('a'), allow('a')]).toEqual([true, true, false])
    expect(allow('b')).toBe(true)
    t = 1500
    expect(allow('a')).toBe(true)
  })
})

describe('loadEnv', () => {
  const good = {
    SUPABASE_URL: 'https://abc.supabase.co',
    SUPABASE_SERVICE_KEY: 'x'.repeat(30),
    OTP_PEPPER: 'p'.repeat(40),
    LIVE_KEY: 'rider-key-0123456789abcd',
    CAPTAIN_KEY: 'captain-key-0123456789abc',
    ADMIN_TOKEN: 'a'.repeat(16),
    TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(30),
    TWILIO_AUTH_TOKEN: 't'.repeat(32),
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    TWILIO_WEBHOOK_URL: 'https://demo.vercel.app/api/whatsapp',
  }

  it('accepts a complete configuration', () => {
    expect(loadEnv(good).LIVE_KEY).toBe('rider-key-0123456789abcd')
    expect(loadEnv(good).CAPTAIN_KEY).toBe('captain-key-0123456789abc')
  })

  it('requires a live key and a strong pepper (the API never runs open)', () => {
    expect(() => loadEnv({ ...good, LIVE_KEY: undefined })).toThrow(/LIVE_KEY/)
    expect(() => loadEnv({ ...good, OTP_PEPPER: 'short-pepper-only-24-chars!' })).toThrow(/OTP_PEPPER/)
  })

  it('requires both keys to be at least 20 characters, and different', () => {
    expect(() => loadEnv({ ...good, LIVE_KEY: 'short-key-19-chars!!' .slice(0, 19) })).toThrow(/LIVE_KEY/)
    expect(() => loadEnv({ ...good, CAPTAIN_KEY: 'short-key-19-chars!!'.slice(0, 19) })).toThrow(/CAPTAIN_KEY/)
    expect(() => loadEnv({ ...good, CAPTAIN_KEY: undefined })).toThrow(/CAPTAIN_KEY/)
    expect(() => loadEnv({ ...good, CAPTAIN_KEY: good.LIVE_KEY })).toThrow(/CAPTAIN_KEY/)
    expect(loadEnv({ ...good, LIVE_KEY: 'x'.repeat(20), CAPTAIN_KEY: 'y'.repeat(20) }).LIVE_KEY).toHaveLength(20)
  })

  it('names what is missing without printing any value', () => {
    let message = ''
    try {
      loadEnv({ ...good, OTP_PEPPER: undefined, ADMIN_TOKEN: 'short', TWILIO_AUTH_TOKEN: 'super-secret-but-too-short' })
    } catch (e) {
      message = e instanceof Error ? e.message : ''
    }
    expect(message).toMatch(/OTP_PEPPER/)
    expect(message).toMatch(/ADMIN_TOKEN/)
    expect(message).not.toMatch(/super-secret/)
  })
})

describe('health', () => {
  const good = {
    SUPABASE_URL: 'https://abc.supabase.co',
    SUPABASE_SERVICE_KEY: 'x'.repeat(30),
    OTP_PEPPER: 'p'.repeat(40),
    LIVE_KEY: 'rider-key-0123456789abcd',
    CAPTAIN_KEY: 'captain-key-0123456789abc',
    ADMIN_TOKEN: 'a'.repeat(16),
    TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(30),
    TWILIO_AUTH_TOKEN: 't'.repeat(32),
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    TWILIO_WEBHOOK_URL: 'https://demo.vercel.app/api/whatsapp',
  }

  it('returns only {ok}: it never lists which variables are missing', async () => {
    const ok = handleHealth(good)
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ ok: true })
    const bad = handleHealth({ ...good, OTP_PEPPER: undefined, CAPTAIN_KEY: undefined })
    expect(bad.status).toBe(503)
    const body = await bad.json()
    expect(body).toEqual({ ok: false })
    expect(JSON.stringify(body)).not.toMatch(/OTP_PEPPER|CAPTAIN_KEY|variable/)
  })
})

describe('handleEnsure', () => {
  it('creates a missing day once and leaves an existing one alone', async () => {
    const { handleEnsure } = await import('./http.ts')
    const h = harness()
    const req = (): Request => new Request('http://x/api/day?hub=gaya', { headers: { 'x-live-key': 'k' } })
    expect((await handleEnsure(req(), h.deps, { liveKey: 'k', captainKey: 'c' })).status).toBe(200)
    const created = h.db.days.get('gaya')!
    expect(created.started).toBe(false)
    expect(created.dayId).toBeTruthy()
    await runAction(h.deps, 'gaya', { type: 'startDay' })
    expect((await handleEnsure(req(), h.deps, { liveKey: 'k', captainKey: 'c' })).status).toBe(200)
    expect(h.db.days.get('gaya')!.started).toBe(true)
  })

  it('says which role the key is, so a screen can keep the captain key out of QR codes', async () => {
    const { handleEnsure } = await import('./http.ts')
    const h = harness()
    const both = { liveKey: 'rider-key', captainKey: 'captain-key' }
    const get = (key: string): Request => new Request('http://x/api/day?hub=gaya', { headers: { 'x-live-key': key } })
    expect(((await (await handleEnsure(get('rider-key'), h.deps, both)).json()) as { role: string }).role).toBe('rider')
    expect(((await (await handleEnsure(get('captain-key'), h.deps, both)).json()) as { role: string }).role).toBe('captain')
  })

  it('opens the day for either key, and for neither a stranger', async () => {
    const { handleEnsure } = await import('./http.ts')
    const h = harness()
    const get = (key: string | null): Request => new Request('http://x/api/day?hub=gaya', { headers: key === null ? {} : { 'x-live-key': key } })
    const both = { liveKey: 'rider-key', captainKey: 'captain-key' }
    expect((await handleEnsure(get('rider-key'), h.deps, both)).status).toBe(200)
    expect((await handleEnsure(get('captain-key'), h.deps, both)).status).toBe(200)
    expect((await handleEnsure(get('stranger'), h.deps, both)).status).toBe(401)
    expect((await handleEnsure(get(null), h.deps, both)).status).toBe(401)
  })

  it('checks the key, the method and the hub', async () => {
    const { handleEnsure } = await import('./http.ts')
    const h = harness()
    expect((await handleEnsure(new Request('http://x/api/day?hub=gaya'), h.deps, { liveKey: 'k' })).status).toBe(401)
    expect((await handleEnsure(new Request('http://x/api/day?hub=mars'), h.deps, {})).status).toBe(400)
    expect((await handleEnsure(new Request('http://x/api/day?hub=gaya', { method: 'POST' }), h.deps, {})).status).toBe(405)
  })

  it('survives a lost creation race', async () => {
    const { handleEnsure } = await import('./http.ts')
    const h = harness()
    h.db.conflicts = 1
    const res = await handleEnsure(new Request('http://x/api/day?hub=gaya'), h.deps, {})
    expect(res.status).toBe(409)
  })
})

describe('admin ping', () => {
  const cfg = { adminToken: 'admin-token-123' }
  const auth = { authorization: 'Bearer admin-token-123' }

  it('sends one test WhatsApp message and does not touch the day', async () => {
    const h = harness()
    const res = await handleAdmin(post('http://x', { op: 'ping', phone: '+919999900001' }, auth), h.deps, cfg)
    expect(res.status).toBe(200)
    expect(h.sent).toHaveLength(1)
    expect(h.sent[0].phone).toBe('+919999900001')
    expect(h.db.days.size).toBe(0)
  })

  it('explains a failed send (usually a phone that has not joined the sandbox)', async () => {
    const h = harness()
    h.failSend = true
    const res = await handleAdmin(post('http://x', { op: 'ping', phone: '+919999900001' }, auth), h.deps, cfg)
    expect(res.status).toBe(502)
    expect(((await res.json()) as { error: string }).error).toMatch(/joined the Twilio sandbox/)
  })

  it('needs the admin token and a valid phone number', async () => {
    const h = harness()
    expect((await handleAdmin(post('http://x', { op: 'ping', phone: '+919999900001' }), h.deps, cfg)).status).toBe(401)
    expect((await handleAdmin(post('http://x', { op: 'ping', phone: '99999' }, auth), h.deps, cfg)).status).toBe(400)
    expect(h.sent).toHaveLength(0)
  })
})
