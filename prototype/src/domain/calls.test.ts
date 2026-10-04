import { describe, expect, it } from 'vitest'
import { fakeGeo } from '../engine/testkit.ts'
import { runAudit } from './audit.ts'
import { planAutopilot } from './autopilot.ts'
import { callsSinceDispatch } from './calls.ts'
import { createDay } from './day.ts'
import { EVENT_FIELDS, emit, eventsOf } from './events.ts'
import { reduce } from './reducer.ts'
import { AT, deliverOrder, heroStops, run, startedDay } from './testkit.ts'
import type { DayState } from './types.ts'

/**
 * Plan 32 B: the rider calls the customer from the task card. The app logs every call, and the call count on a failed attempt is the
 * number the app logged since the order last went out for delivery, never a number the rider types.
 */
const day = startedDay()
const { bonus: hero } = heroStops(day)
const owner = day.stops[hero].riderId

const call = (s: DayState, orderId: string, answered = false, at = AT + 1): DayState => reduce(s, { type: 'riderCall', at, orderId, answered })
const calls = (s: DayState, orderId: string, n: number, answered = false): DayState => Array.from({ length: n }).reduce<DayState>((acc) => call(acc, orderId, answered), s)
const attempt = (s: DayState, evidence: { gpsDistM: number; calls?: number; waitMin: number } | undefined, at = AT + 5): DayState =>
  reduce(s, { type: 'riderAttempt', at, orderId: hero, claim: 'customer_unavailable', evidence })

describe('the day shape', () => {
  it('is schema 9: a day saved before calls were logged by the app (typed call counts) is replaced, never half-read', () => {
    expect(day.schema).toBe(9)
  })
})

describe('riderCall: a call from the task card is logged by the app', () => {
  it('adds the call to the order, with the rider and whether the customer answered', () => {
    const s = call(day, hero, true)
    expect(s.stops[hero].callLog).toEqual([{ simAt: day.simNow, answered: true, riderId: owner }])
    expect(eventsOf(s, 'CALL_LOGGED', hero)).toHaveLength(1)
    expect(eventsOf(s, 'CALL_LOGGED', hero)[0]).toMatchObject({ riderId: owner, data: { answered: true } })
  })

  it('says so in the feed: who called, which parcel, and whether the customer answered', () => {
    const awb = day.stops[hero].order.awb
    expect(call(day, hero, true).feed.at(-1)?.text).toMatch(new RegExp(`called the customer for ${awb}: answered`))
    expect(call(day, hero, false).feed.at(-1)?.text).toMatch(new RegExp(`called the customer for ${awb}: no answer`))
  })

  it('needs the order to be out with the rider: a failed, delivered or unknown order is refused (state unchanged)', () => {
    const failed = attempt(day, undefined)
    expect(call(failed, hero)).toBe(failed)
    const done = deliverOrder(day, hero)
    expect(call(done, hero)).toBe(done)
    expect(call(day, 'nope-0001')).toBe(day)
    const notStarted = createDay(fakeGeo(0, 1), { seed: 11, orders: 120, riders: 6 })
    expect(call(notStarted, notStarted.stopOrder[0])).toBe(notStarted)
  })

  it('CALL_LOGGED is a typed event that needs "answered"', () => {
    expect(EVENT_FIELDS.CALL_LOGGED).toEqual(['answered'])
    expect(() => emit(day, AT, 'CALL_LOGGED', {}, { orderId: hero })).toThrow(/answered/)
  })
})

describe('the attempt’s call count is what the app logged, not a typed number', () => {
  it('two logged calls, at the door, waited 6 min: high confidence, and the event says 2 calls', () => {
    const s = attempt(calls(day, hero, 2), { gpsDistM: 40, waitMin: 6 })
    expect(s.stops[hero].evidence).toEqual({ gpsDistM: 40, calls: 2, waitMin: 6 })
    expect(s.stops[hero].confidence).toBe('high')
    expect(eventsOf(s, 'ATTEMPT_LOGGED', hero)[0].data).toMatchObject({ calls: 2 })
  })

  it('a typed call count is ignored: 9 typed with none logged is 0 calls, so not high confidence', () => {
    const s = attempt(day, { gpsDistM: 40, calls: 9, waitMin: 6 })
    expect(s.stops[hero].evidence?.calls).toBe(0)
    expect(s.stops[hero].confidence).toBe('medium')
    expect(eventsOf(s, 'ATTEMPT_LOGGED', hero)[0].data).toMatchObject({ calls: 0 })
  })

  it('counts only the calls since the order last went out: a re-attempt starts from zero again', () => {
    let s = attempt(calls(day, hero, 3), { gpsDistM: 40, waitMin: 6 })
    expect(s.stops[hero].evidence?.calls).toBe(3)
    s = reduce(s, { type: 'reattempt', at: AT + 6, orderId: hero })
    expect(callsSinceDispatch(s, hero)).toHaveLength(0)
    s = attempt(call(s, hero, false, AT + 7), { gpsDistM: 40, waitMin: 6 }, AT + 8)
    expect(s.stops[hero].evidence?.calls).toBe(1)
    // The order keeps every call it ever had.
    expect(s.stops[hero].callLog).toHaveLength(4)
  })

  it('an attempt with no GPS reading still has no evidence (the calls stay on the order’s log)', () => {
    const s = attempt(calls(day, hero, 2), undefined)
    expect(s.stops[hero].evidence).toBeUndefined()
    expect(s.stops[hero].callLog).toHaveLength(2)
  })

  it('callsSinceDispatch gives the calls of this run, in order, with their time', () => {
    const s = calls(day, hero, 2, false)
    expect(callsSinceDispatch(s, hero).map((c) => c.answered)).toEqual([false, false])
    expect(callsSinceDispatch(s, hero).every((c) => c.simAt === day.simNow)).toBe(true)
  })
})

describe('Audit: every attempt’s call count matches the calls the app logged', () => {
  it('is a check of its own, green on a day with calls and attempts', () => {
    const s = attempt(calls(day, hero, 2), { gpsDistM: 40, waitMin: 6 })
    const check = runAudit(s).find((c) => c.id === 'calls-logged')
    expect(check?.ok).toBe(true)
    expect(check?.label).toMatch(/call count matches the calls the app logged/)
  })

  it('turns red when an attempt claims more calls than the app logged', () => {
    const s = attempt(day, { gpsDistM: 40, waitMin: 6 })
    const forged: DayState = { ...s, events: s.events.map((e) => (e.type === 'ATTEMPT_LOGGED' && e.orderId === hero ? { ...e, data: { ...e.data, calls: 3 } } : e)) }
    const check = runAudit(forged).find((c) => c.id === 'calls-logged')
    expect(check?.ok).toBe(false)
    expect(check?.detail).toContain(hero)
  })

  it('turns red when an order’s call log and its CALL_LOGGED events disagree', () => {
    const s = call(day, hero)
    const forged: DayState = { ...s, stops: { ...s.stops, [hero]: { ...s.stops[hero], callLog: [] } } }
    expect(runAudit(forged).find((c) => c.id === 'calls-logged')?.ok).toBe(false)
  })
})

describe('Autopilot logs its calls through riderCall', () => {
  const big = reduce(createDay(fakeGeo(0, 1), { seed: 21, orders: 300, riders: 12 }), { type: 'startDay', at: AT })
  const worked = run(big, ...planAutopilot(big, { count: 1000, seed: 3, at: AT }))
  const attempts = eventsOf(worked, 'ATTEMPT_LOGGED')

  it('plans the calls before the attempt they back up', () => {
    const planned = planAutopilot(big, { count: 1000, seed: 3, at: AT })
    const firstAttempt = planned.findIndex((a) => a.type === 'riderAttempt')
    expect(firstAttempt).toBeGreaterThan(0)
    const id = (planned[firstAttempt] as { orderId: string }).orderId
    expect(planned.slice(0, firstAttempt).some((a) => a.type === 'riderCall' && a.orderId === id)).toBe(true)
  })

  it('genuine attempts still have 2 or more calls; a fake one (far away) has none', () => {
    expect(attempts.length).toBeGreaterThan(10)
    const genuine = attempts.filter((e) => Number(e.data.gpsDistM) <= 200)
    const fake = attempts.filter((e) => Number(e.data.gpsDistM) > 500)
    expect(genuine.filter((e) => Number(e.data.calls) >= 2).length).toBeGreaterThan(genuine.length / 2)
    expect(fake.every((e) => e.data.calls === 0)).toBe(true)
    expect(eventsOf(worked, 'CALL_LOGGED').length).toBeGreaterThan(0)
  })

  it('the day stays green on the Audit', () => {
    const red = runAudit(worked).filter((c) => !c.ok)
    expect(red.map((c) => `${c.id}: ${c.detail}`)).toEqual([])
  })
})
