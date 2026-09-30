import { describe, expect, it } from 'vitest'
import { actionFromReply, formatOutbound, pickedIndex } from './inbound.ts'
import { hashOtp, isPlainOtp, newOtp, safeEqual } from './otp.ts'
import { redactMessage, toStorable } from './sanitize.ts'
import { fromWhatsApp, sendWhatsApp, toWhatsApp, twilioSignature, verifyTwilioSignature, type FetchLike } from './twilio.ts'
import { AdminRequestSchema, parseActionRequest } from './validate.ts'
import { startedDay, run, AT } from '../../src/domain/testkit.ts'
import { demoStops } from '../../src/domain/selectors.ts'
import type { WaMessage } from '../../src/domain/types.ts'

describe('otp', () => {
  it('newOtp is always 4 digits', () => {
    for (let i = 0; i < 200; i++) expect(isPlainOtp(newOtp())).toBe(true)
  })

  it('hashOtp depends on pepper, order and code', () => {
    const h = hashOtp('p', 'o1', '1234')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(hashOtp('p', 'o1', '1234')).toBe(h)
    expect(hashOtp('q', 'o1', '1234')).not.toBe(h)
    expect(hashOtp('p', 'o2', '1234')).not.toBe(h)
    expect(hashOtp('p', 'o1', '1235')).not.toBe(h)
  })

  it('safeEqual compares strings of any length', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('sanitize', () => {
  const msg = (kind: WaMessage['kind'], text: string): WaMessage => ({ id: 'm', orderId: 'o', at: 1, direction: 'out', kind, text })

  it('masks codes in OTP messages only', () => {
    expect(redactMessage(msg('delivery_otp', 'Your OTP is 1234. Share it.')).text).toBe('Your OTP is ••••. Share it.')
    expect(redactMessage(msg('refusal_otp', 'code 9876')).text).toBe('code ••••')
    const other = msg('ack', 'We will call 1234 people')
    expect(redactMessage(other)).toBe(other)
  })

  it('toStorable hashes plain codes once and leaves hashes alone', () => {
    let s = startedDay()
    const id = demoStops(s).bonus[0]
    s = run(s, { type: 'riderDeliver', at: AT, orderId: id, code: '8642' })
    const stored = toStorable(s, 'pep')
    expect(stored.otps[id].code).toBe(hashOtp('pep', id, '8642'))
    expect(JSON.stringify([stored.otps, stored.messages])).not.toContain('8642')
    expect(toStorable(stored, 'pep')).toEqual(stored)
    expect(s.otps[id].code).toBe('8642')
  })
})

describe('inbound parsing', () => {
  const offer = (kind: WaMessage['kind'], ids: string[]): WaMessage => ({
    id: 'm',
    orderId: 'o',
    at: 1,
    direction: 'out',
    kind,
    text: 'Hello',
    buttons: ids.map((id) => ({ id, label: id })),
  })

  it('formats numbered options under the message, or just the text when there are none', () => {
    expect(formatOutbound(offer('order_day', ['home', 'change_time']))).toBe('Hello\n\nReply with a number:\n1  home\n2  change_time')
    expect(formatOutbound({ ...offer('ack', []), buttons: undefined })).toBe('Hello')
  })

  it('reads numbers, "option 2" and yes/no for two-button questions', () => {
    expect(pickedIndex('2', 4)).toBe(1)
    expect(pickedIndex(' 3. ', 4)).toBe(2)
    expect(pickedIndex('Option 1', 3)).toBe(0)
    expect(pickedIndex('9', 4)).toBeNull()
    expect(pickedIndex('0', 4)).toBeNull()
    expect(pickedIndex('yes', 2)).toBe(0)
    expect(pickedIndex('No!', 2)).toBe(1)
    expect(pickedIndex('yes', 4)).toBeNull()
    expect(pickedIndex('maybe', 2)).toBeNull()
  })

  const base = { orderId: 'lucknow-0001', parcelId: 'P-lucknow-0001' }

  it('maps each kind of offer to the right action', () => {
    expect(actionFromReply({ ...base, lastOffer: offer('order_day', ['home', 'change_time', 'fix_address', 'pay_now']) }, '4')).toEqual({ type: 'customerReply', orderId: base.orderId, reply: 'pay_now' })
    expect(actionFromReply({ ...base, lastOffer: offer('attempt_check', ['yes', 'no']) }, '2')).toEqual({ type: 'customerReach', orderId: base.orderId, reached: false })
    expect(actionFromReply({ ...base, lastOffer: offer('reschedule_check', ['yes', 'no']) }, 'yes')).toEqual({ type: 'customerAskedReschedule', orderId: base.orderId, asked: true })
    expect(actionFromReply({ ...base, lastOffer: offer('second_chance', ['accept', 'decline']) }, '2')).toEqual({ type: 'customerSecondChance', parcelId: base.parcelId, accept: false })
  })

  it('understands a shared location even with no open offer', () => {
    expect(actionFromReply({ ...base, lastOffer: undefined }, '', { lat: 1, lng: 2 })).toMatchObject({ type: 'customerReply', reply: 'fix_address', location: { lat: 1, lng: 2 } })
  })

  it('returns null when there is nothing to answer or the reply is unclear', () => {
    expect(actionFromReply({ ...base, lastOffer: undefined }, '1')).toBeNull()
    expect(actionFromReply({ ...base, lastOffer: offer('order_day', ['home']) }, 'hmm')).toBeNull()
    expect(actionFromReply({ ...base, lastOffer: offer('second_chance', ['accept', 'decline']), parcelId: undefined }, '1')).toBeNull()
    expect(actionFromReply({ ...base, lastOffer: offer('delivery_otp', ['x']) }, '1')).toBeNull()
    expect(actionFromReply({ ...base, lastOffer: offer('order_day', ['bogus']) }, '1')).toBeNull()
  })
})

describe('twilio', () => {
  const url = 'https://example.vercel.app/api/whatsapp'
  const params = { Body: '1', From: 'whatsapp:+919999900001', To: 'whatsapp:+14155238886' }

  it('signs like Twilio: URL + sorted params, HMAC-SHA1, base64', () => {
    expect(twilioSignature('secret', url, params)).toBe(twilioSignature('secret', url, { To: params.To, Body: params.Body, From: params.From }))
    expect(twilioSignature('secret', url, params)).not.toBe(twilioSignature('other', url, params))
  })

  it('accepts a valid signature and rejects a wrong or missing one', () => {
    const sig = twilioSignature('secret', url, params)
    expect(verifyTwilioSignature('secret', url, params, sig)).toBe(true)
    expect(verifyTwilioSignature('secret', url, { ...params, Body: '2' }, sig)).toBe(false)
    expect(verifyTwilioSignature('secret', url, params, 'nope')).toBe(false)
    expect(verifyTwilioSignature('secret', url, params, null)).toBe(false)
  })

  it('converts phone formats', () => {
    expect(toWhatsApp('+91999')).toBe('whatsapp:+91999')
    expect(fromWhatsApp('whatsapp:+91999')).toBe('+91999')
    expect(fromWhatsApp('+91999')).toBe('+91999')
  })

  it('posts to the Messages API with basic auth and a form body', async () => {
    let seen: { url: string; init: Parameters<FetchLike>[1] } | undefined
    const ok: FetchLike = async (u, init) => {
      seen = { url: u, init }
      return { ok: true, status: 201, text: async () => '' }
    }
    await sendWhatsApp({ accountSid: 'AC1', authToken: 'tok', from: 'whatsapp:+14155238886' }, '+919999900001', 'Hi there', ok)
    expect(seen?.url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json')
    expect(seen?.init.headers.Authorization).toBe(`Basic ${Buffer.from('AC1:tok').toString('base64')}`)
    const body = new URLSearchParams(seen?.init.body)
    expect(body.get('To')).toBe('whatsapp:+919999900001')
    expect(body.get('From')).toBe('whatsapp:+14155238886')
    expect(body.get('Body')).toBe('Hi there')
  })

  it('throws when Twilio refuses', async () => {
    const bad: FetchLike = async () => ({ ok: false, status: 400, text: async () => 'nope' })
    await expect(sendWhatsApp({ accountSid: 'AC1', authToken: 't', from: 'f' }, '+91999', 'x', bad)).rejects.toThrow(/HTTP 400/)
  })
})

describe('request validation', () => {
  it('accepts a well-formed action and rejects malformed ones', () => {
    expect(parseActionRequest({ hubId: 'lucknow', action: { type: 'startDay' } })).toEqual({ ok: true, hubId: 'lucknow', action: { type: 'startDay' } })
    expect(parseActionRequest({ hubId: 'lucknow', action: { type: 'submitOtp', orderId: 'lucknow-0001', code: '1234' } }).ok).toBe(true)
    expect(parseActionRequest({ hubId: 'mars', action: { type: 'startDay' } }).ok).toBe(false)
    expect(parseActionRequest({ hubId: 'lucknow', action: { type: 'hack' } }).ok).toBe(false)
    expect(parseActionRequest({ hubId: 'lucknow', action: { type: 'submitOtp', orderId: 'lucknow-0001', code: '12' } }).ok).toBe(false)
    expect(parseActionRequest({ hubId: 'lucknow', action: { type: 'riderDeliver', orderId: '../etc' } }).ok).toBe(false)
    expect(parseActionRequest({ hubId: 'lucknow', action: { type: 'customerReply', orderId: 'lucknow-0001', reply: 'home', location: { lat: 999, lng: 0 } } }).ok).toBe(false)
    expect(parseActionRequest('junk').ok).toBe(false)
  })

  it('reports why a request was rejected', () => {
    const r = parseActionRequest({ hubId: 'lucknow', action: { type: 'submitOtp', orderId: 'bad', code: '1' } })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/orderId|code/)
  })

  it('validates admin operations', () => {
    expect(AdminRequestSchema.safeParse({ op: 'reset', hubId: 'gaya', seed: 3 }).success).toBe(true)
    expect(AdminRequestSchema.safeParse({ op: 'autopilot', hubId: 'gaya', count: 9999 }).success).toBe(false)
    expect(AdminRequestSchema.safeParse({ op: 'bind', hubId: 'gaya', orderId: 'gaya-0001', phone: '+919999900001' }).success).toBe(true)
    expect(AdminRequestSchema.safeParse({ op: 'bind', hubId: 'gaya', orderId: 'gaya-0001', phone: '9999900001' }).success).toBe(false)
  })
})
