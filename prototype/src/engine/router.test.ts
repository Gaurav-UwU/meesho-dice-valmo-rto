import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ROUTER_PARAMS,
  REFUSAL_REASONS,
  batchBySeller,
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
    expect(routeParcel(parcel({ reason: 'damaged' })).lane).toBe('hold_rehome')
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
