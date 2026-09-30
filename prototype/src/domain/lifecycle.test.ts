import { describe, expect, it } from 'vitest'
import {
  ORDER_STATUSES,
  REATTEMPT_COST,
  TERMINAL_STATUSES,
  applyTransition,
  canTransition,
  deliveredStatus,
  isDelivered,
  isOpen,
  isTerminal,
  reattemptDecision,
  type OrderStatus,
} from './lifecycle.ts'
import { AT, startedDay } from './testkit.ts'

describe('lifecycle table', () => {
  it('has exactly the five terminal states', () => {
    expect([...TERMINAL_STATUSES].sort()).toEqual(['cancelled', 'delivered_a1', 'delivered_a2', 'rehomed', 'rto'])
    for (const s of ORDER_STATUSES) expect(isTerminal(s)).toBe(!isOpen(s))
  })

  it('never leaves a terminal state', () => {
    for (const from of TERMINAL_STATUSES) for (const to of ORDER_STATUSES) expect(canTransition(from, to)).toBe(false)
  })

  it.each<[OrderStatus, OrderStatus]>([
    ['scored', 'out_for_delivery'],
    ['scored', 'cancelled'],
    ['out_for_delivery', 'otp_sent'],
    ['out_for_delivery', 'ndr'],
    ['out_for_delivery', 'refused'],
    ['out_for_delivery', 'rescheduled'],
    ['otp_sent', 'delivered_a1'],
    ['otp_sent', 'delivered_a2'],
    ['otp_sent', 'out_for_delivery'],
    ['otp_sent', 'ndr'],
    ['otp_sent', 'refused'],
    ['ndr', 'out_for_delivery'],
    ['ndr', 'rescheduled'],
    ['ndr', 'rto'],
    ['rescheduled', 'out_for_delivery'],
    ['rescheduled', 'rto'],
    ['refused', 'out_for_delivery'],
    ['refused', 'rehomed'],
    ['refused', 'rto'],
  ])('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true)
  })

  it.each<[OrderStatus, OrderStatus]>([
    ['scored', 'delivered_a1'],
    ['out_for_delivery', 'delivered_a1'],
    ['out_for_delivery', 'delivered_a2'],
    ['ndr', 'delivered_a2'],
    ['ndr', 'delivered_a1'],
    ['rescheduled', 'delivered_a1'],
    ['refused', 'delivered_a2'],
    ['rescheduled', 'ndr'],
    ['ndr', 'refused'],
    ['scored', 'otp_sent'],
  ])('forbids %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false)
  })

  it('a delivery is only ever a terminal delivered state, and only after an OTP', () => {
    const into = ORDER_STATUSES.filter((from) => canTransition(from, 'delivered_a1') || canTransition(from, 'delivered_a2'))
    expect(into).toEqual(['otp_sent'])
    expect(isDelivered('delivered_a1')).toBe(true)
    expect(isDelivered('delivered_a2')).toBe(true)
    expect(isDelivered('rto')).toBe(false)
  })

  it('names the delivered state after the attempt number', () => {
    expect(deliveredStatus(1)).toBe('delivered_a1')
    expect(deliveredStatus(2)).toBe('delivered_a2')
  })
})

describe('reattemptDecision', () => {
  it('re-attempts when attempts are left and the expected recovery beats its cost', () => {
    const d = reattemptDecision({ attempt: 1, maxAttempts: 2, pSuccessNext: 0.6 })
    expect(d.reattempt).toBe(true)
    expect(d.ev).toBeCloseTo(0.6 * 120 - REATTEMPT_COST, 9)
  })

  it('stops when the attempts are used up, however good the odds', () => {
    const d = reattemptDecision({ attempt: 2, maxAttempts: 2, pSuccessNext: 0.9 })
    expect(d.reattempt).toBe(false)
    expect(d.reason).toMatch(/attempts/i)
  })

  it('stops when the expected recovery does not beat the cost, including a tie', () => {
    expect(reattemptDecision({ attempt: 1, maxAttempts: 2, pSuccessNext: 0.05 }).reattempt).toBe(false)
    expect(reattemptDecision({ attempt: 1, maxAttempts: 2, pSuccessNext: REATTEMPT_COST / 120 }).reattempt).toBe(false)
  })
})

describe('applyTransition', () => {
  const day = startedDay()
  const id = day.stopOrder[0]

  it('moves an order along a legal edge and applies the patch', () => {
    const s = applyTransition(day, id, 'otp_sent', { at: AT, reason: 'rider asked for the OTP' })
    expect(s.stops[id].status).toBe('otp_sent')
    expect(s.rejectedTransitions).toHaveLength(0)
  })

  it('rejects an illegal move: the order is unchanged and the rejection is counted for Audit', () => {
    const s = applyTransition(day, id, 'delivered_a1', { at: AT, reason: 'skipped the OTP' })
    expect(s.stops[id].status).toBe('out_for_delivery')
    expect(s.rejectedTransitions).toEqual([{ orderId: id, from: 'out_for_delivery', to: 'delivered_a1', reason: 'skipped the OTP', at: AT }])
  })

  it('ignores an unknown order', () => {
    expect(applyTransition(day, 'nope', 'ndr', { at: AT, reason: 'x' })).toBe(day)
  })

  it('never mutates the state it was given', () => {
    const before = JSON.stringify(day)
    applyTransition(day, id, 'delivered_a1', { at: AT, reason: 'x' })
    expect(JSON.stringify(day)).toBe(before)
  })
})
