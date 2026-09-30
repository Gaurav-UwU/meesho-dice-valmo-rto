import { describe, expect, it } from 'vitest'
import { candidatePincodes, geocodeAll, geocodePincode, HUB_DISTRICTS, toGeocodedCsv, type NominatimFetch } from './nominatim.ts'

const CSV = ['﻿country code,postal code ,Area,State,state code,District,latitude,longitude', 'IN,226010,A,UP,1,Lucknow,1,1', 'IN,226010,B,UP,1,Lucknow,1,1', 'IN,400076,C,MH,1,Mumbai,1,1', 'IN,22601,Short,UP,1,Lucknow,1,1', 'IN,823001,D,BR,1,Gaya,1,1'].join('\n')

describe('candidatePincodes', () => {
  it('lists unique valid pincodes for the districts, ignoring a BOM and the directory\'s own coordinates', () => {
    expect(candidatePincodes(CSV, ['Lucknow'])).toEqual(['226010'])
    expect(candidatePincodes(CSV, ['lucknow', 'MUMBAI'])).toEqual(['226010', '400076'])
    expect(candidatePincodes(CSV, ['Nowhere'])).toEqual([])
  })

  it('needs the right columns and tolerates an empty file', () => {
    expect(() => candidatePincodes('a,b\n1,2', ['x'])).toThrow(/postal code and District/)
    expect(candidatePincodes('', ['x'])).toEqual([])
  })

  it('has a district list for every pilot hub', () => {
    expect(Object.keys(HUB_DISTRICTS).sort()).toEqual(['gaya', 'lucknow', 'powai', 'whitefield'])
  })
})

const ok = (body: unknown): NominatimFetch => async () => ({ ok: true, status: 200, json: async () => body })

describe('geocodePincode', () => {
  it('reads the first hit', async () => {
    const r = await geocodePincode('226010', ok([{ lat: '26.8513', lon: '81.0035', display_name: '226010, Lucknow' }]))
    expect(r).toEqual({ pincode: '226010', lat: 26.8513, lng: 81.0035, label: '226010, Lucknow' })
  })

  it('returns null for no result, a bad number, an HTTP error or a network failure', async () => {
    expect(await geocodePincode('1', ok([]))).toBeNull()
    expect(await geocodePincode('1', ok([{ lat: 'x', lon: 'y' }]))).toBeNull()
    expect(await geocodePincode('1', async () => ({ ok: false, status: 429, json: async () => ({}) }))).toBeNull()
    expect(
      await geocodePincode('1', async () => {
        throw new Error('down')
      }),
    ).toBeNull()
  })

  it('works when the label is missing', async () => {
    expect((await geocodePincode('1', ok([{ lat: '1', lon: '2' }])))?.label).toBe('')
  })
})

describe('geocodeAll', () => {
  const noSleep = async (): Promise<void> => undefined

  it('skips cached pincodes, remembers misses, and reports progress', async () => {
    let calls = 0
    const fetcher: NominatimFetch = async (url) => {
      calls++
      return { ok: true, status: 200, json: async () => (url.includes('111111') ? [] : [{ lat: '1', lon: '2', display_name: 'x' }]) }
    }
    const seen: number[] = []
    const out = await geocodeAll(['226010', '111111', '400076'], { '400076': { pincode: '400076', lat: 9, lng: 9, label: 'cached' } }, fetcher, 0, noSleep, (d) => seen.push(d))
    expect(calls).toBe(2)
    expect(out['400076']?.label).toBe('cached')
    expect(out['111111']).toBeNull()
    expect(out['226010']?.lat).toBe(1)
    expect(seen).toEqual([1, 2, 3])
  })

  it('does not ask again for a cached miss', async () => {
    let calls = 0
    await geocodeAll(['1'], { '1': null }, async () => {
      calls++
      return { ok: true, status: 200, json: async () => [] }
    }, 0, noSleep)
    expect(calls).toBe(0)
  })
})

describe('toGeocodedCsv', () => {
  it('writes the columns build-geo reads, quoting the label', () => {
    const csv = toGeocodedCsv([{ pincode: '226010', lat: 26.85, lng: 81, label: 'A "B", C' }])
    expect(csv).toBe('pincode,latitude,longitude,source\n226010,26.85,81,"A ""B"", C"\n')
  })
})
