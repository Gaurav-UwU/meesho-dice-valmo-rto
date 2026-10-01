import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ROUTER_PARAMS,
  FORECAST_GATE,
  REFUSAL_REASONS,
  batchBySeller,
  holdBlockers,
  holdEv,
  holdGates,
  isSoftReason,
  pAccept,
  pMatch,
  routeParcel,
  secondChanceEv,
  summariseDay,
  type RefusedParcel,
} from './router.ts'
import { matchBelief, pointForecast, posterior, type DemandForecast } from './demand.ts'

const parcel = (o: Partial<RefusedParcel> = {}): RefusedParcel => ({
  id: 'p1',
  awb: 'SYNLUC00100001',
  hubId: 'lucknow',
  hubState: 'UP',
  buyerState: 'UP',
  sellerId: 's1',
  sellerState: 'UP',
  sellerGst: false,
  skuId: 'sku-1',
  value: 265,
  reason: 'not_ordered',
  unopened: true,
  sealOk: true,
  sellerOptedIn: true,
  invoiceOutside: true,
  demandRate: 0.05,
  ...o,
})

const soft = { reason: 'not_home' } as const

describe('expected values behind the waterfall', () => {
  it('P(match in 48 h) = 1 - exp(-rate x 48 x conversion)', () => {
    expect(pMatch(0.05)).toBeCloseTo(1 - Math.exp(-0.05 * 48 * 0.5), 9)
    expect(pMatch(0)).toBe(0)
  })

  it('holding pays only above the 5.5% match rate (₹8 / ₹145)', () => {
    expect(holdEv(0)).toBe(-8)
    expect(holdEv(0.05)).toBeGreaterThan(80)
    // Find the demand rate where P(match) = 8/145
    const breakEvenRate = -Math.log(1 - 8 / 145) / (48 * 0.5)
    expect(holdEv(breakEvenRate)).toBeCloseTo(0, 6)
    expect(holdEv(breakEvenRate * 0.9)).toBeLessThan(0)
    expect(holdEv(breakEvenRate * 1.1)).toBeGreaterThan(0)
  })

  it('second chance EV = P(accept) x (₹120 - ₹21) - messages', () => {
    expect(secondChanceEv('no_cash')).toBeCloseTo(0.5 * 99 - 1, 9)
    expect(secondChanceEv('not_ordered')).toBeCloseTo(-1, 9)
  })

  it('has an acceptance chance for every reason, from the assumption table', () => {
    for (const r of REFUSAL_REASONS) expect(pAccept(r)).toBe(DEFAULT_ROUTER_PARAMS.acceptByReason[r])
    expect(pAccept('no_cash')).toBe(0.5)
    expect(pAccept('cheaper_elsewhere')).toBe(0.1)
    expect(REFUSAL_REASONS).toHaveLength(7)
  })

  it('treats not home, no cash and "later" as soft', () => {
    expect(REFUSAL_REASONS.filter(isSoftReason)).toEqual(['no_cash', 'want_later', 'not_home'])
  })
})

describe('Router v2: lane 1, second chance', () => {
  it('offers a second chance when its expected value is above zero', () => {
    const d = routeParcel(parcel(soft))
    expect(d.lane).toBe('second_chance')
    expect(d.effect.min).toBe(-21)
    expect(d.effect.max).toBe(99)
    expect(d.ev.secondChance).toBeGreaterThan(0)
    expect(d.inputs.pAccept).toBe(0.4)
  })

  it('a reason that never accepts (didn\'t order, damaged) skips the second chance', () => {
    expect(routeParcel(parcel({ reason: 'not_ordered' })).lane).toBe('hold_rehome')
    // A damaged or wrong item is never re-homed (see the "Item condition OK" gate below), so it goes back.
    expect(routeParcel(parcel({ reason: 'damaged' })).lane).toBe('consolidated_return')
  })

  it('even a hard reason with a small acceptance chance gets the offer first (EV is still positive)', () => {
    expect(routeParcel(parcel({ reason: 'changed_mind' })).lane).toBe('second_chance')
  })

  it('a soft refusal beats Hold & Re-home even when every gate passes', () => {
    expect(routeParcel(parcel(soft)).lane).toBe('second_chance')
  })

  it('falls through to the next lane once the customer declines or lets the offer expire', () => {
    expect(routeParcel(parcel(soft), { secondChanceDeclined: true }).lane).toBe('hold_rehome')
    expect(routeParcel(parcel(soft), { secondChanceExpired: true }).lane).toBe('hold_rehome')
    expect(routeParcel(parcel({ ...soft, sellerOptedIn: false }), { secondChanceDeclined: true }).lane).toBe('consolidated_return')
  })

  it('is not offered when the edited acceptance chance makes it lose money', () => {
    const params = { ...DEFAULT_ROUTER_PARAMS, acceptByReason: { ...DEFAULT_ROUTER_PARAMS.acceptByReason, not_home: 0.005 } }
    expect(routeParcel(parcel(soft), { params }).lane).toBe('hold_rehome')
  })
})

describe('Router v2: lane 2, Hold & Re-home', () => {
  it('takes a hard refusal when every gate passes and the expected value is positive', () => {
    const d = routeParcel(parcel())
    expect(d.lane).toBe('hold_rehome')
    expect(d.effect.max).toBe(145)
    expect(d.effect.min).toBe(-8)
    expect(d.gates.every((g) => g.pass)).toBe(true)
    expect(d.ev.hold).toBeGreaterThan(0)
    expect(d.reason).toMatch(/expected value/i)
  })

  it.each([
    ['opened parcel', { unopened: false }],
    ['broken seal', { sealOk: false }],
    ['seller has not opted in', { sellerOptedIn: false }],
    ['no invoice pouch', { invoiceOutside: false }],
    ['no nearby demand (negative expected value)', { demandRate: 0.001 }],
    ['seller in another state', { sellerState: 'GJ', sellerGst: true }],
    ['buyer in another state', { buyerState: 'BR' }],
  ] as const)('goes to lane 3 for: %s', (_name, override) => {
    const d = routeParcel(parcel(override))
    expect(d.lane).toBe('consolidated_return')
    expect(d.reason.length).toBeGreaterThan(5)
    expect(d.ev.hold).toBeNull()
  })

  it('scenario 10: an unopted seller can never be forced into the hold lane', () => {
    const d = routeParcel(parcel({ sellerOptedIn: false }))
    expect(d.lane).toBe('consolidated_return')
    expect(d.gates.find((g) => g.name === 'Seller opted in')?.pass).toBe(false)
    expect(d.gates.find((g) => g.name === 'Seller opted in')?.note).toMatch(/cannot be overridden/i)
  })

  it('a full shelf blocks the hold lane (capacity 30)', () => {
    expect(routeParcel(parcel(), { shelfUsed: 29 }).lane).toBe('hold_rehome')
    const full = routeParcel(parcel(), { shelfUsed: 30 })
    expect(full.lane).toBe('consolidated_return')
    expect(full.reason).toMatch(/shelf/i)
  })

  it('no rider with bag space blocks the hold lane', () => {
    const d = routeParcel(parcel(), { riderHasSpace: false })
    expect(d.lane).toBe('consolidated_return')
    expect(d.reason).toMatch(/bag/i)
  })

  it('names the failing gate in the reason', () => {
    expect(routeParcel(parcel({ sellerState: 'GJ', sellerGst: true })).reason).toMatch(/same state/i)
    expect(routeParcel(parcel({ sealOk: false })).reason).toMatch(/seal/i)
  })

  it('notes that non-GST sellers are same-state by law', () => {
    const gates = holdGates(parcel({ sellerGst: false }))
    expect(gates.find((g) => g.name === 'Same state')?.note).toMatch(/by law/i)
  })

  it('registered sellers need the hub added as an additional place of business', () => {
    const gates = holdGates(parcel({ sellerGst: true }))
    expect(gates.find((g) => g.name === 'Same state')?.note).toMatch(/additional place of business/i)
  })
})

describe('Router v3: the inspection, the item-condition gate and skipping the second chance', () => {
  const found = { unopened: true, sealOk: true, invoiceOutside: true }

  it('a parcel that has not been inspected cannot be held: the Inspected gate fails and so do the three facts it would record', () => {
    const d = routeParcel(parcel(), { inspection: null })
    expect(d.lane).toBe('consolidated_return')
    expect(d.ev.hold).toBeNull()
    const byName = (n: string) => d.gates.find((g) => g.name === n)
    expect(byName('Inspected')).toMatchObject({ pass: false })
    expect(byName('Inspected')?.note).toMatch(/inspect/i)
    for (const n of ['Unopened', 'Seal intact', 'Invoice outside the parcel']) {
      expect(byName(n)?.pass).toBe(false)
      expect(byName(n)?.note).toMatch(/waiting for the inspection/i)
    }
    expect(d.reason).toMatch(/inspected/i)
  })

  it('an inspected parcel takes the hold lane when everything the inspector found is fine', () => {
    const d = routeParcel(parcel(), { inspection: { ...found, at: 1, by: 'Hub operator', photoNote: '' } })
    expect(d.lane).toBe('hold_rehome')
    expect(d.gates.find((g) => g.name === 'Inspected')?.pass).toBe(true)
  })

  it('what the inspector recorded wins over the parcel\'s own seeded facts', () => {
    const broken = routeParcel(parcel({ sealOk: true }), { inspection: { ...found, sealOk: false, at: 1, by: 'Hub operator', photoNote: '' } })
    expect(broken.lane).toBe('consolidated_return')
    expect(broken.gates.find((g) => g.name === 'Seal intact')?.pass).toBe(false)
    const fine = routeParcel(parcel({ sealOk: false }), { inspection: { ...found, at: 1, by: 'Hub operator', photoNote: '' } })
    expect(fine.lane).toBe('hold_rehome')
  })

  it('with no inspection step at all (engine use only) the parcel\'s own facts are used', () => {
    expect(routeParcel(parcel()).lane).toBe('hold_rehome')
    expect(routeParcel(parcel({ sealOk: false })).lane).toBe('consolidated_return')
  })

  it('a damaged or wrong item fails "Item condition OK" and is never re-homed, however much demand there is', () => {
    const d = routeParcel(parcel({ reason: 'damaged', demandRate: 0.5 }))
    expect(d.lane).toBe('consolidated_return')
    const gate = d.gates.find((g) => g.name === 'Item condition OK')
    expect(gate?.pass).toBe(false)
    expect(gate?.note).toMatch(/seller claim|QC/i)
    expect(d.reason).toMatch(/item condition/i)
    expect(routeParcel(parcel({ reason: 'not_ordered' })).gates.find((g) => g.name === 'Item condition OK')?.pass).toBe(true)
  })

  it('skipping the second chance sends a soft refusal to the next lane, and never opens a closed gate', () => {
    expect(routeParcel(parcel(soft), { secondChanceSkipped: true }).lane).toBe('hold_rehome')
    const closed = routeParcel(parcel({ ...soft, sellerOptedIn: false }), { secondChanceSkipped: true })
    expect(closed.lane).toBe('consolidated_return')
    expect(closed.gates.find((g) => g.name === 'Seller opted in')?.pass).toBe(false)
  })

  it('lists the gates in a fixed order: inspected first, item condition after the invoice', () => {
    const names = holdGates(parcel()).map((g) => g.name)
    expect(names.slice(0, 4)).toEqual(['Inspected', 'Unopened', 'Seal intact', 'Same state'])
    expect(names).toContain('Item condition OK')
    expect(names.indexOf('Item condition OK')).toBeGreaterThan(names.indexOf('Invoice outside the parcel'))
  })
})

describe('Router v3: the hold rule reads the match forecast and its LOW end', () => {
  const forecastOf = (priorRate: number, strength: number, orders: number): DemandForecast => ({ ...pointForecast(priorRate), ...posterior(priorRate, strength, orders, 336), exactOrders: orders, confidence: 'Medium' })
  // The plan's example: 3 orders against a prior worth 10 pseudo-orders at 0.006/h -> mean 14.3%, low end 9.8%.
  const clear = forecastOf(0.006, 10, 3)
  // Thin evidence (a prior worth 2 pseudo-orders, 1 order): the mean is above 5.5% but the low end is not.
  const thin = forecastOf(0.006, 2, 1)

  it('holds when the low end clears 5.5%, and shows the mean, the range and the ₹ on the gate', () => {
    const d = routeParcel(parcel({ forecast: clear, demandRate: 0 }))
    expect(d.lane).toBe('hold_rehome')
    const g = d.gates.find((x) => x.name === 'Match forecast clears break-even (low end)')!
    expect(g.pass).toBe(true)
    expect(g.note).toMatch(/14\.3%/)
    expect(g.note).toMatch(/9\.8%/)
    expect(g.note).toMatch(/5\.5%/)
    // The expected value shown uses the mean: 0.1435 x 145 - 8 = +12.8
    expect(d.ev.hold).toBeCloseTo(0.14345 * 145 - 8, 1)
  })

  it('does not hold when only the average clears it: thin evidence is not enough', () => {
    const b = matchBelief(thin, { holdHours: 48, conversion: 0.5 })
    expect(b.mean).toBeGreaterThan(8 / 145)
    expect(b.p10).toBeLessThan(8 / 145)
    const d = routeParcel(parcel({ forecast: thin, demandRate: 0.3 }))
    expect(d.lane).toBe('consolidated_return')
    expect(d.ev.hold).toBeNull()
    expect(d.reason).toMatch(/low end/i)
  })

  it('never reads the hidden true rate when there is a forecast: the decision is identical whatever it is', () => {
    const a = routeParcel(parcel({ forecast: clear, demandRate: 0 }))
    const b = routeParcel(parcel({ forecast: clear, demandRate: 0.5 }))
    expect(b).toEqual(a)
  })

  it('without a forecast (engine-only use) the parcel\'s own rate is treated as known exactly, as before', () => {
    expect(routeParcel(parcel({ demandRate: 0.05 })).lane).toBe('hold_rehome')
    expect(routeParcel(parcel({ demandRate: 0.001 })).lane).toBe('consolidated_return')
  })

  it('holds right at the boundary: a known rate just above break-even holds, just below does not', () => {
    const rate = -Math.log(1 - 8 / 145) / (48 * 0.5)
    expect(routeParcel(parcel({ forecast: pointForecast(rate * 1.02) })).lane).toBe('hold_rehome')
    expect(routeParcel(parcel({ forecast: pointForecast(rate * 0.98) })).lane).toBe('consolidated_return')
  })

  it('follows the editable assumptions: a lower conversion can close the hold lane', () => {
    const params = { ...DEFAULT_ROUTER_PARAMS, conversion: 0.1 }
    expect(routeParcel(parcel({ forecast: clear }), { params }).lane).toBe('consolidated_return')
  })

  it('reports the forecast behind the decision for the audit trail (belief only, never the hidden rate)', () => {
    const d = routeParcel(parcel({ forecast: clear, demandRate: 0.123 }))
    expect(d.inputs.pMatch).toBeCloseTo(0.1435, 3)
    expect(d.inputs.pMatchLow).toBeCloseTo(0.0984, 3)
    expect(d.inputs.pMatchHigh).toBeGreaterThan(d.inputs.pMatch)
    expect(d.inputs.confidence).toBe('Medium')
    expect(JSON.stringify(d.inputs)).not.toContain('0.123')
  })
})

describe('Router v2: lane 3, consolidated return', () => {
  it('is the default and carries a saving range labelled as unmeasured', () => {
    const d = routeParcel(parcel({ demandRate: 0 }))
    expect(d.lane).toBe('consolidated_return')
    expect(d.effect.min).toBeCloseTo(24, 6)
    expect(d.effect.max).toBeCloseTo(48, 6)
    expect(d.effect.label).toMatch(/measured/i)
    expect(d.ev.consolidated).toBeCloseTo(36, 6)
  })
})

describe('day summary', () => {
  const parcels = [
    parcel({ id: 'a', ...soft }),
    parcel({ id: 'b' }),
    parcel({ id: 'c', sealOk: false }),
    parcel({ id: 'd', sellerId: 's2', unopened: false }),
  ]

  it('counts parcels per lane', () => {
    const s = summariseDay(parcels)
    expect(s.counts).toEqual({ second_chance: 1, hold_rehome: 1, consolidated_return: 2 })
    expect(s.total).toBe(4)
  })

  it('compares against sending everything back at ₹120', () => {
    const s = summariseDay(parcels)
    expect(s.sendBackCost).toBe(480)
    expect(s.savedMin).toBeCloseTo(-21 - 8 + 24 + 24, 6)
    expect(s.savedMax).toBeCloseTo(99 + 145 + 48 + 48, 6)
  })

  it('handles an empty queue', () => {
    expect(summariseDay([])).toEqual({
      counts: { second_chance: 0, hold_rehome: 0, consolidated_return: 0 },
      total: 0,
      sendBackCost: 0,
      savedMin: 0,
      savedMax: 0,
    })
  })

  it('batches consolidated returns by seller', () => {
    const batches = batchBySeller(parcels.filter((p) => routeParcel(p).lane === 'consolidated_return'))
    expect(batches).toEqual([
      { sellerId: 's1', parcelIds: ['c'] },
      { sellerId: 's2', parcelIds: ['d'] },
    ])
  })
})

describe('Router v3: what blocks Hold, said apart from what the forecast says', () => {
  const forecastOf = (priorRate: number, strength: number, orders: number): DemandForecast => ({ ...pointForecast(priorRate), ...posterior(priorRate, strength, orders, 336), exactOrders: orders, confidence: 'Medium', evidence: 'test', keywords: [], similar: [], similarOrders: 0 })
  const clear = forecastOf(0.006, 10, 3)
  const thin = forecastOf(0.006, 2, 1)
  const blockers = (o: Partial<RefusedParcel>) => holdBlockers(holdGates(parcel(o)))

  it('has nothing blocking when every gate passes', () => {
    expect(blockers({ forecast: clear, demandRate: 0 })).toEqual({ forecastCloses: false, others: [] })
  })

  it('names the gates that block Hold even when the forecast alone would allow it', () => {
    const b = blockers({ forecast: clear, demandRate: 0, sellerState: 'GJ', sellerOptedIn: false })
    expect(b.forecastCloses).toBe(false)
    expect(b.others).toEqual(['Same state', 'Seller opted in'])
  })

  it('says it is the forecast when that is the only gate that fails', () => {
    expect(blockers({ forecast: thin, demandRate: 0.3 })).toEqual({ forecastCloses: true, others: [] })
  })

  it('reports both when a gate and the forecast fail', () => {
    const b = blockers({ forecast: thin, demandRate: 0.3, sealOk: false })
    expect(b.forecastCloses).toBe(true)
    expect(b.others).toEqual(['Seal intact'])
  })

  it('uses one constant for the forecast gate name', () => {
    expect(holdGates(parcel({ forecast: clear, demandRate: 0 })).some((g) => g.name === FORECAST_GATE)).toBe(true)
  })
})
