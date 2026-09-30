import { describe, expect, it } from 'vitest'
import { buildPoints, demandWeight, parseCsv, rowsFromCsv, selectCatchment } from './geo-build.ts'
import { osrmDistances, type OsrmFetch } from './osrm.ts'

const HUB = { lat: 26.85, lng: 80.999 }

describe('parseCsv', () => {
  it('reads quoted fields, doubled quotes, embedded commas and CRLF', () => {
    const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n\r\nlast,row')
    expect(rows).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['last', 'row'],
    ])
  })

  it('handles a file with no trailing newline and an empty file', () => {
    expect(parseCsv('a,b')).toEqual([['a', 'b']])
    expect(parseCsv('')).toEqual([])
  })
})

describe('rowsFromCsv', () => {
  const csv = [
    'circlename,pincode,officename,latitude,longitude',
    'UP,226010,Gomti Nagar,26.85,80.99',
    'UP,226010,Vibhuti Khand,26.86,81.00',
    'UP,226011,Bad,NA,NA',
    'UP,22601,Short,26.8,80.9',
    'XX,110001,Far,99,20',
  ].join('\n')

  it('keeps rows with a valid 6-digit pincode and coordinates inside India', () => {
    expect(rowsFromCsv(csv).map((r) => r.pincode)).toEqual(['226010', '226010'])
  })

  it('accepts alternative header names', () => {
    expect(rowsFromCsv('PIN,Lat,Long\n226010,26.85,80.99')).toEqual([{ pincode: '226010', lat: 26.85, lng: 80.99 }])
  })

  it('explains a CSV without the needed columns', () => {
    expect(() => rowsFromCsv('a,b\n1,2')).toThrow(/pincode, latitude and longitude/)
  })

  it('returns nothing for an empty file', () => {
    expect(rowsFromCsv('')).toEqual([])
  })
})

describe('selectCatchment', () => {
  it('merges post offices sharing a pincode and drops those beyond the radius', () => {
    const sel = selectCatchment(
      [
        { pincode: '226010', lat: 26.85, lng: 80.99 },
        { pincode: '226010', lat: 26.87, lng: 81.01 },
        { pincode: '110001', lat: 28.6, lng: 77.2 },
      ],
      HUB,
      15,
    )
    expect(sel).toHaveLength(1)
    expect(sel[0].lat).toBeCloseTo(26.86, 6)
    expect(sel[0].lng).toBeCloseTo(81, 6)
  })
})

describe('buildPoints', () => {
  const rows = [
    { pincode: '226010', lat: 26.86, lng: 81.0 },
    { pincode: '226011', lat: 26.95, lng: 81.1 },
  ]

  it('falls back to straight line x 1.3 and weights nearer pincodes higher', () => {
    const pts = buildPoints(rows, HUB)
    expect(pts[0].distanceKm).toBeGreaterThan(0.4)
    expect(pts[1].distanceKm).toBeGreaterThan(pts[0].distanceKm)
    expect(pts[0].weight).toBeGreaterThan(pts[1].weight)
  })

  it('prefers a routed distance when we have one, and never goes below 0.4 km', () => {
    const pts = buildPoints(
      rows,
      HUB,
      new Map([
        ['226010', 7.26],
        ['226011', 0.01],
      ]),
    )
    expect(pts[0].distanceKm).toBe(7.3)
    expect(pts[1].distanceKm).toBe(0.4)
  })

  it('demandWeight falls with distance', () => {
    expect(demandWeight(0)).toBe(1)
    expect(demandWeight(12)).toBeLessThan(demandWeight(3))
  })
})

describe('osrmDistances', () => {
  const pts = Array.from({ length: 45 }, (_, i) => ({ pincode: String(226000 + i), lat: 26.8 + i / 1000, lng: 80.9 }))
  const noSleep = async (): Promise<void> => undefined

  it('asks in chunks, converts metres to km and skips unroutable points', async () => {
    const urls: string[] = []
    const fetcher: OsrmFetch = async (url) => {
      urls.push(url)
      const n = url.split('/driving/')[1].split('?')[0].split(';').length - 1
      return { ok: true, status: 200, json: async () => ({ distances: [[0, ...Array.from({ length: n }, (_, k) => (k === 1 ? null : 1500 + k))]] }) }
    }
    const out = await osrmDistances(HUB, pts, fetcher, 0, noSleep)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('sources=0&annotations=distance')
    expect(out.get('226000')).toBeCloseTo(1.5, 6)
    expect(out.has('226001')).toBe(false)
    expect(out.size).toBe(43)
  })

  it('leaves failed chunks to the fallback instead of crashing', async () => {
    let calls = 0
    const flaky: OsrmFetch = async () => {
      calls++
      if (calls === 1) throw new Error('down')
      return { ok: false, status: 429, json: async () => ({}) }
    }
    const out = await osrmDistances(HUB, pts, flaky, 0, noSleep)
    expect(out.size).toBe(0)
    expect(calls).toBe(2)
  })
})
