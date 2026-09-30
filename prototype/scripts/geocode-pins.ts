/**
 * Turn a pincode directory into trustworthy pincode centres by asking OpenStreetMap's Nominatim, politely
 * (one request a second, results cached in data/cache/nominatim.json so re-runs are free).
 *
 *   node scripts/geocode-pins.ts --csv data/raw/pincodes.csv --hub lucknow [--hub gaya ...]
 *
 * Writes data/raw/pincodes-geocoded.csv, which scripts/build-geo.ts reads.
 * Map data (c) OpenStreetMap contributors, ODbL.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { candidatePincodes, geocodeAll, HUB_DISTRICTS, toGeocodedCsv, type PinCoord } from './lib/nominatim.ts'

const argv = process.argv.slice(2)
const csvPath = argv[argv.indexOf('--csv') + 1]
const hubs = argv.flatMap((a, i) => (a === '--hub' ? [argv[i + 1]] : []))
if (argv.indexOf('--csv') < 0 || hubs.length === 0 || hubs.some((h) => !(h in HUB_DISTRICTS))) {
  process.stderr.write('Usage: node scripts/geocode-pins.ts --csv <file> --hub <lucknow|powai|whitefield|gaya> [--hub ...]\n')
  process.exit(1)
}

const csv = await readFile(csvPath, 'utf8')
const pincodes = [...new Set(hubs.flatMap((h) => candidatePincodes(csv, HUB_DISTRICTS[h])))].sort()
await mkdir('data/cache', { recursive: true })
const cachePath = 'data/cache/nominatim.json'
let cache: Record<string, PinCoord | null> = {}
try {
  cache = JSON.parse(await readFile(cachePath, 'utf8')) as Record<string, PinCoord | null>
} catch {
  cache = {}
}
process.stdout.write(`${pincodes.length} candidate pincodes, ${pincodes.filter((p) => p in cache).length} already cached\n`)

const UA = 'ValmoRescueConsole-DICE-prototype (gaurav7.ecell@gmail.com)'
const result = await geocodeAll(
  pincodes,
  cache,
  async (url) => fetch(url, { headers: { 'User-Agent': UA } }),
  1100,
  undefined,
  (done, total) => {
    if (done % 20 === 0 || done === total) process.stdout.write(`  ${done}/${total}\n`)
  },
)
await writeFile(cachePath, JSON.stringify(result))
const found = Object.values(result).filter((c): c is PinCoord => c !== null)
await writeFile('data/raw/pincodes-geocoded.csv', toGeocodedCsv(found))
process.stdout.write(`Wrote data/raw/pincodes-geocoded.csv with ${found.length} of ${Object.keys(result).length} pincodes located\n`)
