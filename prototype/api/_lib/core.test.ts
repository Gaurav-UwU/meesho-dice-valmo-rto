import { describe, expect, it } from 'vitest'
import { isDelivered } from '../../src/domain/lifecycle.ts'
import { demoStops } from '../../src/domain/selectors.ts'
import type { DayState } from '../../src/domain/types.ts'
import { bindPhone, handleInbound, MAX_OTP_REQUESTS_PER_ORDER, runAction, runAutopilot, runReset } from './core.ts'
import { hashOtp } from './otp.ts'
import { harness } from './testkit.ts'

const HUB = 'lucknow' as const
const PHONE = '+919999900001'

async function started(h = harness()): Promise<{ h: ReturnType<typeof harness>; day: DayState; orderId: string }> {
  await runAction(h.deps, HUB, { type: 'startDay' })
  const day = h.db.days.get(HUB)!
  return { h, day, orderId: demoStops(day).bonus[0] }
}

describe('runAction', () => {
  it('creates the day on first use, then applies the action', async () => {
    const h = harness()
    const r = await runAction(h.deps, HUB, { type: 'startDay' })
    expect(r.ok).toBe(true)
    expect(h.db.days.get(HUB)?.started).toBe(true)
  })

  it('no-op actions do not write or bump the version', async () => {
    const { h } = await started()
    const before = h.db.days.get(HUB)!.version
    const r = await runAction(h.deps, HUB, { type: 'startDay' })
    expect(r).toMatchObject({ ok: true, version: before, sent: 0 })
    expect(h.db.days.get(HUB)!.version).toBe(before)
  })

  it('never stores a plain OTP: the code is hashed and the message masked', async () => {
    const { h, orderId } = await started()
    await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })
    const day = h.db.days.get(HUB)!
    expect(day.otps[orderId].code).toBe(hashOtp('test-pepper', orderId, '4321'))
    expect(day.otps[orderId].code).not.toContain('4321')
    const otpMsg = day.messages.filter((m) => m.kind === 'delivery_otp').at(-1)!
    expect(otpMsg.text).not.toContain('4321')
    expect(otpMsg.text).toContain('••••')
    expect(JSON.stringify([day.otps, day.messages])).not.toContain('4321')
  })

  it('verifies the OTP against the hash: right code delivers, wrong code does not', async () => {
    const { h, orderId } = await started()
    await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })
    await runAction(h.deps, HUB, { type: 'submitOtp', orderId, code: '0000' })
    expect(h.db.days.get(HUB)!.stops[orderId].status).toBe('otp_sent')
    expect(h.db.days.get(HUB)!.otps[orderId].attempts).toBe(1)
    await runAction(h.deps, HUB, { type: 'submitOtp', orderId, code: '4321' })
    const day = h.db.days.get(HUB)!
    expect(day.stops[orderId].status).toBe('delivered_a1')
    expect(day.ledger).toHaveLength(1)
  })

  it('rate-limits OTP requests per order', async () => {
    const { h, orderId } = await started()
    for (let i = 0; i < MAX_OTP_REQUESTS_PER_ORDER; i++) {
      expect((await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })).ok).toBe(true)
    }
    const r = await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })
    expect(r).toEqual({ ok: false, error: 'Too many OTP requests for this order' })
  })

  it('retries when another request wrote first, and still applies the action once', async () => {
    const { h, orderId } = await started()
    h.db.conflicts = 2
    const r = await runAction(h.deps, HUB, { type: 'customerReply', orderId, reply: 'home' })
    expect(r.ok).toBe(true)
    expect(h.db.days.get(HUB)!.stops[orderId].replies).toEqual(['home'])
  })

  it('gives up with a friendly error if the day stays busy', async () => {
    const { h, orderId } = await started()
    h.db.conflicts = 99
    const r = await runAction(h.deps, HUB, { type: 'customerReply', orderId, reply: 'home' })
    expect(r).toEqual({ ok: false, error: 'The day is busy, please try again' })
  })
})

describe('WhatsApp delivery to a real phone', () => {
  it('sends messages only for orders bound to a phone, and only after the write succeeds', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    const r = await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })
    expect(r).toMatchObject({ ok: true, sent: 1 })
    expect(h.sent).toHaveLength(1)
    expect(h.sent[0].phone).toBe(PHONE)
    expect(h.sent[0].body).toContain('4321')
  })

  it('does not message customers of unbound orders', async () => {
    const { h } = await started()
    const other = demoStops(h.db.days.get(HUB)!).bonus[1]
    await runAction(h.deps, HUB, { type: 'riderDeliver', orderId: other })
    expect(h.sent).toHaveLength(0)
  })

  it('does not double-send when a save conflict forces a retry', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    h.db.conflicts = 1
    await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })
    expect(h.sent).toHaveLength(1)
  })

  it('reports a failed send as a warning but still applies the action', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    h.failSend = true
    const r = await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })
    expect(r.ok && r.warnings.length).toBe(1)
    expect(h.db.days.get(HUB)!.stops[orderId].status).toBe('otp_sent')
  })

  it('includes numbered options in the message body', async () => {
    const h = harness()
    await runAction(h.deps, HUB, { type: 'startDay' })
    const day = h.db.days.get(HUB)!
    const orderId = demoStops(day).bonus[0]
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    await runAction(h.deps, HUB, { type: 'riderAttempt', orderId, claim: 'customer_unavailable' })
    expect(h.sent.at(-1)?.body).toMatch(/Reply with a number:\n1 {2}Yes, the agent reached me\n2 {2}No, the agent never came/)
  })
})

describe('bindPhone', () => {
  it('refuses an order that does not exist', async () => {
    const { h } = await started()
    const r = await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId: 'lucknow-9999' })
    expect(r.ok).toBe(false)
  })
})

describe('handleInbound', () => {
  it('turns a numbered reply into the customer action', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    const r = await handleInbound(h.deps, PHONE, '1')
    expect(r.ok).toBe(true)
    expect(h.db.days.get(HUB)!.stops[orderId].replies).toEqual(['home'])
  })

  it('turns a shared location into an address fix', async () => {
    const { h, day, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    const spot = { lat: day.hub.lat + 0.02, lng: day.hub.lng + 0.02 }
    await handleInbound(h.deps, PHONE, '', spot)
    expect(h.db.days.get(HUB)!.stops[orderId].location).toEqual(spot)
  })

  it('answers the failed-attempt check and flags a suspect attempt', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    await runAction(h.deps, HUB, { type: 'riderAttempt', orderId, claim: 'customer_unavailable' })
    await handleInbound(h.deps, PHONE, 'no')
    expect(h.db.days.get(HUB)!.stops[orderId].assessment?.status).toBe('suspect')
  })

  it('ignores unknown senders and replies it cannot understand', async () => {
    const { h, orderId } = await started()
    expect(await handleInbound(h.deps, '+910000000000', '1')).toEqual({ ok: true, ignored: 'unknown sender' })
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    expect(await handleInbound(h.deps, PHONE, 'banana')).toEqual({ ok: true, ignored: 'not understood' })
  })

  it('ignores a bound phone when no day exists', async () => {
    const h = harness()
    h.db.bindings.set(PHONE, { phone: PHONE, hubId: HUB, orderId: 'x' })
    expect(await handleInbound(h.deps, PHONE, '1')).toEqual({ ok: true, ignored: 'no day' })
  })

  it('applies a second-chance answer for a refused parcel', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    await runAction(h.deps, HUB, { type: 'riderRefuse', orderId })
    await runAction(h.deps, HUB, { type: 'submitOtp', orderId, code: '4321' })
    await runAction(h.deps, HUB, { type: 'deskSecondChance', parcelId: `P-${orderId}` })
    await handleInbound(h.deps, PHONE, '1')
    expect(h.db.days.get(HUB)!.parcels[0].state).toBe('recovered')
  })
})

describe('autopilot and reset', () => {
  it('autopilot resolves stops and saves the result', async () => {
    const { h } = await started()
    const r = await runAutopilot(h.deps, HUB, 40)
    expect(r.ok).toBe(true)
    const day = h.db.days.get(HUB)!
    expect(day.stopOrder.filter((id) => isDelivered(day.stops[id].status)).length).toBeGreaterThan(20)
    expect(JSON.stringify(day.otps)).not.toContain('"code":"0000"')
  })

  it('reset gives a fresh day at a higher version', async () => {
    const { h } = await started()
    const before = h.db.days.get(HUB)!.version
    const r = await runReset(h.deps, HUB)
    expect(r.ok).toBe(true)
    const day = h.db.days.get(HUB)!
    expect(day.started).toBe(false)
    expect(day.version).toBeGreaterThan(before)
  })

  it('reset works before any day exists', async () => {
    const h = harness()
    expect((await runReset(h.deps, 'gaya', 5)).ok).toBe(true)
  })

  it('reset reports a lost race instead of overwriting', async () => {
    const { h } = await started()
    h.db.conflicts = 1
    expect(await runReset(h.deps, HUB)).toEqual({ ok: false, error: 'The day is busy, please try again' })
  })
})

describe('who may answer for a real customer', () => {
  it('a browser cannot play the customer for an order tied to a real phone', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    await runAction(h.deps, HUB, { type: 'riderAttempt', orderId, claim: 'customer_unavailable' })
    for (const input of [
      { type: 'customerReach', orderId, reached: true },
      { type: 'customerAskedReschedule', orderId, asked: true },
      { type: 'customerReply', orderId, reply: 'home' },
    ] as const) {
      expect(await runAction(h.deps, HUB, input)).toEqual({ ok: false, error: 'This customer answers on their own WhatsApp' })
    }
    expect(h.db.days.get(HUB)!.stops[orderId].answers.riderReached).toBeNull()
    // The customer's own reply is accepted.
    await handleInbound(h.deps, PHONE, '1')
    expect(h.db.days.get(HUB)!.stops[orderId].answers.riderReached).toBe(true)
  })

  it('also protects a bound order\'s second-chance offer (addressed by parcel id)', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    const r = await runAction(h.deps, HUB, { type: 'customerSecondChance', parcelId: `P-${orderId}`, accept: true })
    expect(r.ok).toBe(false)
  })

  it('a browser can still play the customer for synthetic orders (the Demo phone)', async () => {
    const { h, orderId } = await started()
    expect((await runAction(h.deps, HUB, { type: 'customerReply', orderId, reply: 'home' })).ok).toBe(true)
  })

  it('autopilot leaves orders tied to a real phone alone', async () => {
    const { h } = await started()
    const day = h.db.days.get(HUB)!
    const target = day.stopOrder.find((id) => day.stops[id].status === 'out_for_delivery' && !day.stops[id].manual)!
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId: target })
    await runAutopilot(h.deps, HUB, 300)
    expect(h.db.days.get(HUB)!.stops[target].status).toBe('out_for_delivery')
    expect(h.sent).toHaveLength(0)
  })

  it('reports a failed WhatsApp send without leaking the reason', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    h.failSend = true
    const r = await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })
    expect(r.ok && r.warnings[0]).not.toMatch(/boom/)
  })
})

describe('duplicate replies', () => {
  it('handleInbound applies a MessageSid once', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    expect(await handleInbound(h.deps, PHONE, '1', undefined, 'SM1')).toMatchObject({ ok: true })
    expect(await handleInbound(h.deps, PHONE, '1', undefined, 'SM1')).toEqual({ ok: true, ignored: 'duplicate' })
  })
})
