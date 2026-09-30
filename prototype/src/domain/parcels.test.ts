import { describe, expect, it } from 'vitest'
import { catalogueFor } from '../engine/catalogue.ts'
import { forecastFor } from '../engine/demand.ts'
import { routeParcel } from '../engine/router.ts'
import { buildParcel, SHOWCASE } from './parcels.ts'
import { stopsOf } from './selectors.ts'
import { startedDay } from './testkit.ts'

const day = startedDay()
const stops = stopsOf(day)

describe('refused parcels carry a listing, a hidden true rate and a forecast', () => {
  it('the listing is a real entry of the hub\'s synthetic catalogue, and the hidden rate is that listing\'s own', () => {
    for (const st of stops.slice(0, 40)) {
      const p = buildParcel(st, day.hub)
      const item = catalogueFor(day.hub.id).find((x) => x.skuId === p.skuId)
      expect(item).toBeDefined()
      expect(p.demandRate).toBe(item!.trueRate)
    }
  })

  it('the forecast is the one the catalogue gives for that listing, and it is the same every time', () => {
    const st = stops[3]
    const p = buildParcel(st, day.hub)
    expect(p.forecast).toEqual(forecastFor(day.hub.id, p.skuId))
    expect(buildParcel(st, day.hub)).toEqual(p)
  })

  it('the forecast is belief only: it never contains the hidden rate', () => {
    for (const st of stops.slice(0, 40)) {
      const p = buildParcel(st, day.hub)
      expect(JSON.stringify(p.forecast)).not.toContain(String(p.demandRate))
      expect(p.forecast!.exactOrders).toBe(catalogueFor(day.hub.id).find((x) => x.skuId === p.skuId)!.orders14d)
    }
  })

  it('a change of the hidden rate does not change what the Router decides (it reads the forecast)', () => {
    const p = buildParcel(stops[5], day.hub, undefined, 'not_ordered')
    const open = { inspection: { unopened: true, sealOk: true, invoiceOutside: true, at: 0, by: 'test', photoNote: '' } }
    const a = routeParcel({ ...p, sellerState: day.hub.state, buyerState: day.hub.state, sellerOptedIn: true, demandRate: 0 }, open)
    const b = routeParcel({ ...p, sellerState: day.hub.state, buyerState: day.hub.state, sellerOptedIn: true, demandRate: 0.9 }, open)
    expect(b).toEqual(a)
  })

  it('the four demo parcels replay a busy listing: a clear, High-confidence hold for the first, and the same forecast for the gated ones', () => {
    const first = buildParcel(stops[0], day.hub, 0)
    expect(first.demandRate).toBe(0.2)
    expect(first.forecast?.exactOrders).toBeGreaterThan(40)
    expect(first.forecast?.confidence).toBe('High')
    for (let i = 0; i < SHOWCASE.length; i++) expect(buildParcel(stops[i], day.hub, i).forecast).toBeDefined()
    // The second demo parcel is an ordinary second-chance case: its listing is the catalogue's own.
    const second = buildParcel(stops[1], day.hub, 1)
    expect(second.demandRate).toBe(catalogueFor(day.hub.id).find((x) => x.skuId === second.skuId)!.trueRate)
  })

  it('across a day of refusals, some listings clear break-even on the low end and some do not', () => {
    const lanes = stops.map((st) => {
      const p = buildParcel(st, day.hub, undefined, 'not_ordered')
      return routeParcel({ ...p, sellerState: day.hub.state, buyerState: day.hub.state, sellerOptedIn: true }).lane
    })
    expect(lanes).toContain('hold_rehome')
    expect(lanes).toContain('consolidated_return')
  })
})
