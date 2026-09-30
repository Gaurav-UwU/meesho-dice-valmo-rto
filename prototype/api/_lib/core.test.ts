import { describe, expect, it } from 'vitest'
import { isDelivered } from '../../src/domain/lifecycle.ts'
import { demoStops } from '../../src/domain/selectors.ts'
import type { DayState } from '../../src/domain/types.ts'
import { bindPhone, handleInbound, MAX_OTP_REQUESTS_PER_ORDER, runAction, runAutopilot, runEnsure, runReset } from './core.ts'
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

  it('never stores a plain OTP: the code is hashed and, for a real phone, the message masked', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
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

const OLD_SHAPE_V5 = (version: number): DayState => ({ ...({ schema: 5, version, hub: { id: HUB }, stopOrder: [], stops: {} } as unknown as DayState) })

describe('the day has an identity: a tap made on a day that was reset must not touch the new one', () => {
  it('a new day has a day id and number, and the first one is day 1', async () => {
    const h = harness()
    await runEnsure(h.deps, HUB)
    const day = h.db.days.get(HUB)!
    expect(day.dayId).toBeTruthy()
    expect(day.dayNo).toBe(1)
  })

  it('applies an action that carries the current day id', async () => {
    const { h, day } = await started()
    const r = await runAction(h.deps, HUB, { type: 'advanceClock', minutes: 30 }, 'browser', day.dayId)
    expect(r.ok).toBe(true)
    expect(h.db.days.get(HUB)!.version).toBe(day.version + 1)
  })

  it('refuses an action from a screen that was showing another day, says why, and changes nothing', async () => {
    const { h, day } = await started()
    const r = await runAction(h.deps, HUB, { type: 'advanceClock', minutes: 30 }, 'browser', 'some-older-day')
    expect(r).toEqual({ ok: false, code: 'day_reset', error: 'The day was reset, refreshing' })
    expect(h.db.days.get(HUB)).toEqual(day)
  })

  it('THE BUG: after a reset, a late tap from a device still on the old day is refused, not applied to the new day', async () => {
    const { h, day: oldDay } = await started()
    await runReset(h.deps, HUB)
    const fresh = h.db.days.get(HUB)!
    expect(fresh.dayId).not.toBe(oldDay.dayId)
    expect(fresh.dayNo).toBe(oldDay.dayNo + 1)
    const late = await runAction(h.deps, HUB, { type: 'startDay' }, 'browser', oldDay.dayId)
    expect(late).toMatchObject({ ok: false, code: 'day_reset' })
    expect(h.db.days.get(HUB)!.started).toBe(false)
    expect(h.db.days.get(HUB)!.version).toBe(fresh.version)
  })

  it('autopilot from a stale device is refused too', async () => {
    const { h, day: oldDay } = await started()
    await runReset(h.deps, HUB)
    await runAction(h.deps, HUB, { type: 'startDay' })
    const fresh = h.db.days.get(HUB)!
    const r = await runAutopilot(h.deps, HUB, 30, oldDay.dayId)
    expect(r).toMatchObject({ ok: false, code: 'day_reset' })
    expect(h.db.days.get(HUB)).toEqual(fresh)
    expect((await runAutopilot(h.deps, HUB, 30, fresh.dayId)).ok).toBe(true)
  })

  it('a reset keeps the version climbing (so a late write expecting an old version can never slip in) and counts the days', async () => {
    const { h, day } = await started()
    await runReset(h.deps, HUB)
    const one = h.db.days.get(HUB)!
    await runReset(h.deps, HUB)
    const two = h.db.days.get(HUB)!
    expect(one.version).toBe(day.version + 1)
    expect(two.version).toBe(one.version + 1)
    expect([day.dayNo, one.dayNo, two.dayNo]).toEqual([1, 2, 3])
    expect(new Set([day.dayId, one.dayId, two.dayId]).size).toBe(3)
  })

  it('the first reset before any day exists is day 1', async () => {
    const h = harness()
    await runReset(h.deps, 'gaya', 5)
    expect(h.db.days.get('gaya')!.dayNo).toBe(1)
  })
})

describe('a day saved by an older version of the app', () => {
  it('ensure upgrades it on its own to a fresh current day, so no screen sits on Loading', async () => {
    const h = harness()
    h.db.days.set(HUB, OLD_SHAPE_V5(41))
    const r = await runEnsure(h.deps, HUB)
    expect(r.ok).toBe(true)
    const day = h.db.days.get(HUB)!
    expect(day.schema).toBe(6)
    expect(day.dayNo).toBe(1)
    expect(day.version).toBe(42)
    expect(day.started).toBe(false)
  })

  it('ensure leaves a current day alone, and a day from a NEWER app alone', async () => {
    const h = harness()
    await runEnsure(h.deps, HUB)
    const cur = h.db.days.get(HUB)!
    await runEnsure(h.deps, HUB)
    expect(h.db.days.get(HUB)).toBe(cur)
    const newer = { ...cur, schema: cur.schema + 1 } as DayState
    h.db.days.set(HUB, newer)
    await runEnsure(h.deps, HUB)
    expect(h.db.days.get(HUB)).toBe(newer)
  })

  it('an action on an old-shape day is refused with a clear message instead of crashing the server', async () => {
    const h = harness()
    h.db.days.set(HUB, OLD_SHAPE_V5(3))
    const r = await runAction(h.deps, HUB, { type: 'startDay' }, 'browser', 'x')
    expect(r).toMatchObject({ ok: false, code: 'old_shape' })
    expect((r as { error: string }).error).toMatch(/older version/i)
    expect(h.db.days.get(HUB)).toEqual(OLD_SHAPE_V5(3))
  })

  it('a reset replaces it and counts on from version 1', async () => {
    const h = harness()
    h.db.days.set(HUB, OLD_SHAPE_V5(9))
    const r = await runReset(h.deps, HUB)
    expect(r.ok).toBe(true)
    expect(h.db.days.get(HUB)).toMatchObject({ schema: 6, dayNo: 1, version: 10 })
  })
})

describe('the OTP on a demo phone', () => {
  it('a synthetic customer (no real phone) sees the code on the in-app phone, while the stored code stays hashed', async () => {
    const { h, orderId } = await started()
    await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })
    const day = h.db.days.get(HUB)!
    const otpMsg = day.messages.filter((m) => m.kind === 'delivery_otp').at(-1)!
    expect(otpMsg.text).toContain('4321')
    expect(JSON.stringify(day.otps)).not.toContain('4321')
  })

  it('a real customer\'s code is still masked', async () => {
    const { h, orderId } = await started()
    await bindPhone(h.deps, { phone: PHONE, hubId: HUB, orderId })
    await runAction(h.deps, HUB, { type: 'riderDeliver', orderId })
    const otpMsg = h.db.days.get(HUB)!.messages.filter((m) => m.kind === 'delivery_otp').at(-1)!
    expect(otpMsg.text).not.toContain('4321')
    expect(h.sent.at(-1)!.body).toContain('4321') // the real phone still gets the real code
  })
})
