import { describe, expect, it } from 'vitest'
import { EVENT_FIELDS, emit, eventsOf, type EventType } from './events.ts'
import { SIM_START } from './clock.ts'
import { AT, startedDay } from './testkit.ts'

const day = startedDay()

describe('event log', () => {
  it('rejects an unknown event type', () => {
    expect(() => emit(day, AT, 'NOT_A_THING' as EventType, {})).toThrow(/unknown event type/i)
  })

  it('rejects an event with a required field missing', () => {
    expect(() => emit(day, AT, 'DELIVERED', {})).toThrow(/attempt/)
    expect(() => emit(day, AT, 'COST_BOOKED', { line: 'x', amount: 1, owner: 'Valmo' })).toThrow(/stream/)
  })

  it('appends in order, never mutates, and stamps sim time, wall time and the order\'s arm', () => {
    const id = day.stopOrder[0]
    const before = JSON.stringify(day.events)
    const s = emit(day, AT + 5, 'DELIVERED', { attempt: 1 }, { orderId: id })
    expect(JSON.stringify(day.events)).toBe(before)
    const e = s.events.at(-1)!
    expect(e).toMatchObject({ type: 'DELIVERED', orderId: id, wallAt: AT + 5, simAt: day.simNow, arm: day.stops[id].arm, data: { attempt: 1 } })
    expect(e.seq).toBe(day.events.length + 1)
  })

  it('knows the required fields of every event in the schema', () => {
    for (const [type, fields] of Object.entries(EVENT_FIELDS)) {
      const data = Object.fromEntries(fields.map((f) => [f, 1]))
      expect(() => emit(day, AT, type as EventType, data)).not.toThrow()
    }
  })

  it('eventsOf filters by type and order', () => {
    const id = day.stopOrder[0]
    const s = emit(emit(day, AT, 'NO_REPLY_TIMEOUT', {}, { orderId: id }), AT, 'NO_REPLY_TIMEOUT', {}, { orderId: day.stopOrder[1] })
    expect(eventsOf(s, 'NO_REPLY_TIMEOUT', id)).toHaveLength(1)
    expect(eventsOf(s, 'NO_REPLY_TIMEOUT')).toHaveLength(2)
  })

  it('a started day already has its plan on the record, and starts the sim clock', () => {
    expect(day.simNow).toBe(SIM_START)
    const planned = eventsOf(day, 'DAY_PLANNED')
    expect(planned).toHaveLength(1)
    expect(planned[0].data.ruleHash).toBe(day.plannedRuleHash)
    expect(eventsOf(day, 'ORDER_SCORED')).toHaveLength(day.stopOrder.length)
    expect(eventsOf(day, 'ORDER_DISPATCHED')).toHaveLength(day.stopOrder.length)
  })
})
