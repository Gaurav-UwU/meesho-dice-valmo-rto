import { describe, expect, it } from 'vitest'
import { createDay } from './day.ts'
import { deskItems, deskSummary, demoRiders, demoStops, kpis, parcelForOrder, returnShare, riderBag, riderEarnings, scoreAccuracy, stopsOf } from './selectors.ts'
import { AT, deliverOrder, heroStops, run, startedDay } from './testkit.ts'
import { dayVerdictData } from './verdictData.ts'
import { DEFAULT_VERDICT_CONFIG } from '../engine/verdict.ts'
import { fakeGeo } from '../engine/testkit.ts'

describe('createDay', () => {
  const s = createDay(fakeGeo(0, 1), { seed: 4, orders: 60, riders: 6 })

  it('loads the orders, assigns every stop to a rider and starts unscored', () => {
    expect(s.stopOrder).toHaveLength(60)
    expect(stopsOf(s).every((x) => x.riderId !== '' && x.seq > 0)).toBe(true)
    expect(stopsOf(s).every((x) => !x.flagged && x.status === 'scored' && x.failedAttempts === 0 && x.arm === undefined)).toBe(true)
    expect(s.started).toBe(false)
    expect(s.messages).toHaveLength(0)
  })

  it('is deterministic for a seed', () => {
    expect(createDay(fakeGeo(0, 1), { seed: 4, orders: 60, riders: 6 })).toEqual(s)
  })

  it('uses the default day when no options are given', () => {
    expect(createDay(fakeGeo(0, 1)).stopOrder).toHaveLength(300)
  })
})

describe('scoreAccuracy: how many failures of the day the flagged orders catch (in simulation)', () => {
  const s = startedDay()

  it('is flagged failures over all failures, using the simulated failure chance', () => {
    const stops = stopsOf(s)
    const total = stops.reduce((t, x) => t + x.pRto, 0)
    const inFlagged = stops.filter((x) => x.flagged).reduce((t, x) => t + x.pRto, 0)
    expect(scoreAccuracy(s).catchShare).toBeCloseTo(inFlagged / total, 12)
  })

  it('beats picking at random and cannot beat a perfect score', () => {
    const a = scoreAccuracy(s)
    expect(a.flaggedShare).toBeCloseTo(24 / 120, 12)
    expect(a.randomShare).toBeCloseTo(a.flaggedShare, 12)
    expect(a.catchShare).toBeGreaterThan(a.randomShare)
    expect(a.catchShare).toBeLessThanOrEqual(a.perfectShare)
  })

  it('matches a hand example: 4 orders, the top one flagged', () => {
    // Failure chances 0.6, 0.3, 0.1, 0.0 (total 1.0). Flagged: the 0.6 order. Random picking of 1 in 4 catches 25%; a perfect score catches 60%.
    const ids = s.stopOrder.slice(0, 4)
    const chances = [0.6, 0.3, 0.1, 0]
    const tiny = {
      ...s,
      stopOrder: ids,
      stops: Object.fromEntries(ids.map((id, i) => [id, { ...s.stops[id], pRto: chances[i], flagged: i === 0 }])),
    }
    const a = scoreAccuracy(tiny)
    expect(a.catchShare).toBeCloseTo(0.6, 12)
    expect(a.randomShare).toBeCloseTo(0.25, 12)
    expect(a.perfectShare).toBeCloseTo(0.6, 12)
  })

  it('is 0 before the day has any flagged order, and does not divide by zero on an empty day', () => {
    const unflagged = { ...s, stops: Object.fromEntries(s.stopOrder.map((id) => [id, { ...s.stops[id], flagged: false }])) }
    expect(scoreAccuracy(unflagged).catchShare).toBe(0)
    expect(scoreAccuracy({ ...s, stopOrder: [], stops: {} })).toEqual({ flaggedShare: 0, catchShare: 0, randomShare: 0, perfectShare: 0 })
  })
})

describe('selectors', () => {
  const s = startedDay()

  it('kpis on a fresh started day', () => {
    const k = kpis(s)
    expect(k.orders).toBe(120)
    expect(k.flagged).toBe(24)
    expect(k.resolved).toBe(0)
    expect(k.successRate).toBe(0)
    expect(k.flaggedBonus.rate).toBe(0)
    expect(k.modelledRto).toBeGreaterThan(0.1)
    expect(k.modelledRto).toBeLessThan(0.3)
    expect(k.costPerSuccessful).toBeGreaterThan(70)
    expect(k.bonusBudget).toBe(s.stopOrder.filter((id) => s.stops[id].flagged && s.riders.find((r) => r.id === s.stops[id].riderId)?.arm === 'bonus').length * 15)
  })

  it('riderBag is ordered by stop number', () => {
    const rider = s.riders[0]
    const bag = riderBag(s, rider.id)
    expect(bag.map((x) => x.seq)).toEqual([...bag.map((x) => x.seq)].sort((a, b) => a - b))
    expect(bag.every((x) => x.riderId === rider.id)).toBe(true)
  })

  it('demoRiders returns one Bonus and one Control rider', () => {
    const d = demoRiders(s)
    expect(d.bonus?.arm).toBe('bonus')
    expect(d.control?.arm).toBe('control')
  })

  it('an empty earnings card before any delivery', () => {
    expect(riderEarnings(s, s.riders[0].id)).toEqual({ deliveries: 0, base: 0, bonusPending: 0, bonusReleased: 0, bonusClawedBack: 0, bonusBlocked: 0, total: 0 })
  })

  it('desk summary is zero with no refusals, and counts open parcels after one', () => {
    expect(deskSummary(s).total).toBe(0)
    expect(deskItems(s)).toEqual([])
    const id = heroStops(s).bonus
    const after = run(s, { type: 'riderRefuse', at: AT, orderId: id, code: '1' }, { type: 'submitOtp', at: AT + 1, orderId: id, code: '1' })
    expect(deskSummary(after).total).toBe(1)
    expect(deskItems(after)).toHaveLength(1)
    expect(deskSummary(after).sendBackCost).toBe(120)
  })

  it('uses the modelled RTO for cost per delivery until stops are resolved, then the realised one', () => {
    const id = heroStops(s).bonus
    const done = run(s, { type: 'riderDeliver', at: AT, orderId: id, code: '1' }, { type: 'submitOtp', at: AT + 1, orderId: id, code: '1' })
    expect(kpis(done).realisedRto).toBe(0)
    expect(kpis(done).costPerSuccessful).toBeCloseTo(50, 6)
  })
})

describe('demo helpers', () => {
  const s = startedDay()

  it('demoStops lists the reserved hero orders for each demo rider, nearest first', () => {
    const d = demoStops(s)
    expect(d.bonus.length).toBeGreaterThan(0)
    expect(d.control.length).toBeGreaterThan(0)
    const riders = demoRiders(s)
    expect(d.bonus.every((id) => s.stops[id].riderId === riders.bonus?.id && s.stops[id].flagged)).toBe(true)
    expect(d.control.every((id) => s.stops[id].riderId === riders.control?.id && s.stops[id].flagged)).toBe(true)
    const seqs = d.bonus.map((id) => s.stops[id].seq)
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b))
  })

  it('parcelForOrder finds the desk record for a refused order', () => {
    const id = demoStops(s).bonus[0]
    expect(parcelForOrder(s, id)).toBeUndefined()
    const after = run(s, { type: 'riderRefuse', at: AT, orderId: id, code: '1' }, { type: 'submitOtp', at: AT + 1, orderId: id, code: '1' })
    expect(parcelForOrder(after, id)?.orderId).toBe(id)
  })
})

describe('returnShare: returns are WATCHED (Bonus vs Control), never a stop rule', () => {
  const day = startedDay()
  const { bonus, control } = heroStops(day)
  const delivered = (s: ReturnType<typeof startedDay>, id: string, at: number) => deliverOrder(s, id, '4321', at)

  it('is a dash (undefined share), not a fake zero, when nothing is delivered yet', () => {
    const r = returnShare(day)
    expect(r.bonus).toEqual({ delivered: 0, returned: 0, share: undefined })
    expect(r.control).toEqual({ delivered: 0, returned: 0, share: undefined })
  })

  it('counts returned flagged orders over delivered flagged orders in each arm', () => {
    let s = delivered(delivered(day, bonus, AT + 100), control, AT + 200)
    s = run(s, { type: 'openReturn', at: AT + 400, orderId: bonus })
    const r = returnShare(s)
    expect(r.bonus).toMatchObject({ delivered: 1, returned: 1, share: 1 })
    expect(r.control).toMatchObject({ delivered: 1, returned: 0, share: 0 })
  })

  it('does not change the verdict: no KILL comes from returns', () => {
    let s = delivered(day, bonus, AT + 100)
    s = run(s, { type: 'openReturn', at: AT + 400, orderId: bonus })
    expect(dayVerdictData(s).readings).not.toHaveProperty('returnsDeltaPts')
    expect(Object.keys(DEFAULT_VERDICT_CONFIG.guardrails)).toHaveLength(2)
  })
})
