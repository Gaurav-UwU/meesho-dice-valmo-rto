import { describe, expect, it } from 'vitest'
import { demoStops } from '../../src/domain/selectors.ts'
import { runAction, runEnsure, runReset } from './core.ts'
import { loadEnv } from './env.ts'
import { createRateLimiter, handleAction, handleAdmin, handleTwilio } from './http.ts'
import { twilioSignature } from './twilio.ts'
import { harness } from './testkit.ts'

const post = (url: string, body: unknown, headers: Record<string, string> = {}): Request =>
  new Request(url, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } })

/** Make the hub's day exist and return its id, like a screen does when it opens. */
async function ready(h: ReturnType<typeof harness>, hub: 'lucknow' | 'gaya' = 'lucknow'): Promise<string> {
  await runEnsure(h.deps, hub)
  return h.db.days.get(hub)!.dayId
}

describe('handleAction', () => {
  const cfg = { liveKey: 'live-key' }
  // Every tap names the day it was made on. Screens get the id from the day they read; the tests read it from the store.
  const startDay = { hubId: 'lucknow', dayId: 'test-day', action: { type: 'startDay' } }

  it('applies a valid, authorised action', async () => {
    const h = harness()
    const dayId = await ready(h)
    const res = await handleAction(post('http://x/api/action', { ...startDay, dayId }, { 'x-live-key': 'live-key' }), h.deps, cfg)
    expect(res.status).toBe(200)
    expect(h.db.days.get('lucknow')?.started).toBe(true)
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

  it('rounds a shared location to about 100 m and ignores out-of-range coordinates', async () => {
    const { h, orderId } = await boundHarness()
    await handleTwilio(form({ From: 'whatsapp:+919999900001', Body: '', Latitude: '26.876543', Longitude: '81.023456' }), h.deps, cfg)
    expect(h.db.days.get('lucknow')!.stops[orderId].location).toEqual({ lat: 26.877, lng: 81.023 })
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
    LIVE_KEY: 'live-key-1',
    ADMIN_TOKEN: 'a'.repeat(16),
    TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(30),
    TWILIO_AUTH_TOKEN: 't'.repeat(32),
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    TWILIO_WEBHOOK_URL: 'https://demo.vercel.app/api/whatsapp',
  }

  it('accepts a complete configuration', () => {
    expect(loadEnv(good).LIVE_KEY).toBe('live-key-1')
  })

  it('requires a live key and a strong pepper (the API never runs open)', () => {
    expect(() => loadEnv({ ...good, LIVE_KEY: undefined })).toThrow(/LIVE_KEY/)
    expect(() => loadEnv({ ...good, OTP_PEPPER: 'short-pepper-only-24-chars!' })).toThrow(/OTP_PEPPER/)
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

describe('handleEnsure', () => {
  it('creates a missing day once and leaves an existing one alone', async () => {
    const { handleEnsure } = await import('./http.ts')
    const h = harness()
    const req = (): Request => new Request('http://x/api/day?hub=gaya', { headers: { 'x-live-key': 'k' } })
    expect((await handleEnsure(req(), h.deps, { liveKey: 'k' })).status).toBe(200)
    const created = h.db.days.get('gaya')!
    expect(created.started).toBe(false)
    expect(created.dayId).toBeTruthy()
    await runAction(h.deps, 'gaya', { type: 'startDay' })
    expect((await handleEnsure(req(), h.deps, { liveKey: 'k' })).status).toBe(200)
    expect(h.db.days.get('gaya')!.started).toBe(true)
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
