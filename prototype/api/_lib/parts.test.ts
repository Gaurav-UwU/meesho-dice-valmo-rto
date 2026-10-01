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

  it('masks the pickup code in the confirmation message like an OTP (for real phones, or for everyone when no list is given)', () => {
    const m = msg('pickup_code', 'Your parcel is kept at the hub. Show this pickup code: 4821. It works for 5 tries.')
    expect(redactMessage(m).text).toBe('Your parcel is kept at the hub. Show this pickup code: ••••. It works for 5 tries.')
    expect(redactMessage(m, new Set(['other-order']))).toBe(m)
    expect(redactMessage(m, new Set(['o'])).text).toContain('••••')
  })

  it('toStorable stores the pickup code as a peppered hash, once, and keeps the plain one only in memory', () => {
    let s = startedDay()
    const id = demoStops(s).bonus[0]
    s = run(s, { type: 'riderRefuse', at: AT, orderId: id, code: '7777' }, { type: 'submitOtp', at: AT + 1, orderId: id, code: '7777' })
    s = { ...s, parcels: s.parcels.map((p) => ({ ...p, parcel: { ...p.parcel, reason: 'not_home' as const } })) }
    s = run(s, { type: 'deskSecondChance', at: AT + 2, parcelId: `P-${id}` })
    const reserved = run(s, { type: 'customerSecondChance', at: AT + 3, parcelId: `P-${id}`, accept: true, option: 'pickup' })
    const plain = reserved.parcels[0].pickup!.code
    expect(plain).toMatch(/^\d{4}$/)
    const stored = toStorable(reserved, 'pep')
    expect(stored.parcels[0].pickup!.code).toBe(hashOtp('pep', `P-${id}`, plain))
    expect(JSON.stringify(stored.parcels)).not.toContain(`"${plain}"`)
    expect(toStorable(stored, 'pep')).toEqual(stored)
    expect(reserved.parcels[0].pickup!.code).toBe(plain)
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

  it('reads the four second-chance options by number, whichever are on offer', () => {
    const all = offer('second_chance', ['accept', 'later', 'pay', 'pickup', 'decline'])
    const sc = (accept: boolean, option?: string) => ({ type: 'customerSecondChance', parcelId: base.parcelId, accept, ...(option ? { option } : {}) })
    expect(actionFromReply({ ...base, lastOffer: all }, '1')).toEqual(sc(true, 'deliver'))
    expect(actionFromReply({ ...base, lastOffer: all }, '2')).toEqual(sc(true, 'later'))
    expect(actionFromReply({ ...base, lastOffer: all }, '3')).toEqual(sc(true, 'pay'))
    expect(actionFromReply({ ...base, lastOffer: all }, '4')).toEqual(sc(true, 'pickup'))
    expect(actionFromReply({ ...base, lastOffer: all }, '5')).toEqual(sc(false))
    // With no pickup on offer the numbers shift: the ids decide, never the position.
    const noPickup = offer('second_chance', ['accept', 'later', 'pay', 'decline'])
    expect(actionFromReply({ ...base, lastOffer: noPickup }, '4')).toEqual(sc(false))
    expect(actionFromReply({ ...base, lastOffer: noPickup }, '3')).toEqual(sc(true, 'pay'))
  })

  it('reads the follow-up questions: which day, and did the payment go through', () => {
    expect(actionFromReply({ ...base, lastOffer: offer('second_chance_when', ['tomorrow', 'day_after']) }, '2')).toEqual({ type: 'customerSecondChance', parcelId: base.parcelId, accept: true, option: 'day_after' })
    expect(actionFromReply({ ...base, lastOffer: offer('second_chance_when', ['tomorrow', 'day_after']) }, 'yes')).toEqual({ type: 'customerSecondChance', parcelId: base.parcelId, accept: true, option: 'tomorrow' })
    expect(actionFromReply({ ...base, lastOffer: offer('second_chance_pay', ['pay_ok', 'pay_fail']) }, '1')).toEqual({ type: 'customerPayment', orderId: base.orderId, ok: true })
    expect(actionFromReply({ ...base, lastOffer: offer('second_chance_pay', ['pay_ok', 'pay_fail']) }, '2')).toEqual({ type: 'customerPayment', orderId: base.orderId, ok: false })
    expect(actionFromReply({ ...base, lastOffer: offer('second_chance_when', ['bogus', 'day_after']) }, '1')).toBeNull()
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
    expect(parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action: { type: 'startDay' } })).toEqual({ ok: true, hubId: 'lucknow', dayId: 'd1-x', action: { type: 'startDay' } })
    expect(parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action: { type: 'submitOtp', orderId: 'lucknow-0001', code: '1234' } }).ok).toBe(true)
    expect(parseActionRequest({ hubId: 'mars', dayId: 'd1-x', action: { type: 'startDay' } }).ok).toBe(false)
    expect(parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action: { type: 'hack' } }).ok).toBe(false)
    expect(parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action: { type: 'submitOtp', orderId: 'lucknow-0001', code: '12' } }).ok).toBe(false)
    expect(parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action: { type: 'riderDeliver', orderId: '../etc' } }).ok).toBe(false)
    expect(parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action: { type: 'customerReply', orderId: 'lucknow-0001', reply: 'home', location: { lat: 999, lng: 0 } } }).ok).toBe(false)
    expect(parseActionRequest('junk').ok).toBe(false)
    expect(parseActionRequest({ hubId: 'lucknow', action: { type: 'startDay' } }).ok).toBe(false) // which day?
    for (const dayId of ['', 'has space', 'x'.repeat(65), '<script>', 7]) expect(parseActionRequest({ hubId: 'lucknow', dayId, action: { type: 'startDay' } }).ok).toBe(false)
  })

  it('accepts the Desk v3 actions and rejects malformed ones (and the removed deskSetGate)', () => {
    const ok = (action: unknown) => parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action }).ok
    const pid = 'P-lucknow-0001'
    expect(ok({ type: 'deskInspect', parcelId: pid, unopened: true, sealOk: false, invoiceOutside: true, photoNote: 'label outside' })).toBe(true)
    expect(ok({ type: 'deskInspect', parcelId: pid, unopened: true, sealOk: false, invoiceOutside: true, by: 'bot' })).toBe(true)
    expect(ok({ type: 'deskInspect', parcelId: pid, unopened: true, sealOk: 'yes', invoiceOutside: true })).toBe(false)
    expect(ok({ type: 'deskInspect', parcelId: pid, unopened: true, sealOk: true, invoiceOutside: true, photoNote: 'x'.repeat(81) })).toBe(false)
    expect(ok({ type: 'deskInspect', parcelId: '../x', unopened: true, sealOk: true, invoiceOutside: true })).toBe(false)
    for (const reason of ['refused_firmly', 'not_reachable', 'seller_wants_back', 'other']) expect(ok({ type: 'deskSkipSecondChance', parcelId: pid, reason })).toBe(true)
    expect(ok({ type: 'deskSkipSecondChance', parcelId: pid, reason: 'because' })).toBe(false)
    expect(ok({ type: 'deskSetParam', param: 'accept_soft', value: 0.4 })).toBe(true)
    expect(ok({ type: 'deskSetGate', parcelId: pid, gate: 'sealOk', value: false })).toBe(false)
  })

  it('accepts the captain actions (reason chips, notes, overturn, review, bonus hold) and rejects malformed ones', () => {
    const ok = (action: unknown) => parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action }).ok
    const oid = 'lucknow-0001'
    for (const reason of ['phone_far', 'customer_says_nobody_came', 'repeated_pattern', 'other']) expect(ok({ type: 'resolveException', orderId: oid, action: 'strike', reason, note: 'seen by the neighbour' })).toBe(true)
    expect(ok({ type: 'resolveException', orderId: oid, action: 'confirm' })).toBe(true)
    expect(ok({ type: 'resolveException', orderId: oid, action: 'strike', reason: 'because I said so' })).toBe(false)
    expect(ok({ type: 'resolveException', orderId: oid, action: 'strike', reason: 'other', note: 'x'.repeat(141) })).toBe(false)
    expect(ok({ type: 'overturnStrike', strikeId: 'k12' })).toBe(true)
    expect(ok({ type: 'overturnStrike', strikeId: '../k12' })).toBe(false)
    expect(ok({ type: 'riderAskReview', strikeId: 'k12' })).toBe(true)
    expect(ok({ type: 'reviewBonus', orderId: oid, decision: 'release' })).toBe(true)
    expect(ok({ type: 'reviewBonus', orderId: oid, decision: 'withhold', reason: 'phone_far' })).toBe(true)
    expect(ok({ type: 'reviewBonus', orderId: oid, decision: 'steal' })).toBe(false)
  })

  it('accepts the second-chance options and the pickup handover, and rejects anything else', () => {
    const ok = (action: unknown) => parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action }).ok
    const pid = 'P-lucknow-0001'
    for (const option of ['deliver', 'later', 'tomorrow', 'day_after', 'pay', 'pickup']) expect(ok({ type: 'customerSecondChance', parcelId: pid, accept: true, option })).toBe(true)
    expect(ok({ type: 'customerSecondChance', parcelId: pid, accept: true })).toBe(true)
    expect(ok({ type: 'customerSecondChance', parcelId: pid, accept: true, option: 'refund' })).toBe(false)
    expect(ok({ type: 'deskHandover', parcelId: pid, code: '4321' })).toBe(true)
    expect(ok({ type: 'deskHandover', parcelId: pid, code: '4321', cashCollected: true })).toBe(true)
    expect(ok({ type: 'deskHandover', parcelId: pid, code: '43' })).toBe(false)
    expect(ok({ type: 'deskHandover', parcelId: pid, code: '4321', cashCollected: 'yes' })).toBe(false)
    expect(ok({ type: 'deskHandover', parcelId: '../x', code: '4321' })).toBe(false)
  })

  it('reports why a request was rejected', () => {
    const r = parseActionRequest({ hubId: 'lucknow', dayId: 'd1-x', action: { type: 'submitOtp', orderId: 'bad', code: '1' } })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/orderId|code/)
  })

  it('validates admin operations', () => {
    expect(AdminRequestSchema.safeParse({ op: 'reset', hubId: 'gaya', seed: 3 }).success).toBe(true)
    expect(AdminRequestSchema.safeParse({ op: 'autopilot', hubId: 'gaya', dayId: 'd1-x', count: 30 }).success).toBe(true)
    expect(AdminRequestSchema.safeParse({ op: 'autopilot', hubId: 'gaya', dayId: 'd1-x', count: 9999 }).success).toBe(false)
    expect(AdminRequestSchema.safeParse({ op: 'autopilot', hubId: 'gaya', count: 30 }).success).toBe(false)
    expect(AdminRequestSchema.safeParse({ op: 'bind', hubId: 'gaya', orderId: 'gaya-0001', phone: '+919999900001' }).success).toBe(true)
    expect(AdminRequestSchema.safeParse({ op: 'bind', hubId: 'gaya', orderId: 'gaya-0001', phone: '9999900001' }).success).toBe(false)
  })
})
