/**
 * Build data/geo-<hub>.json from a pincode directory CSV (data.gov.in "All India Pincode Directory" or similar).
 *
 *   node scripts/build-geo.ts --csv data/raw/pincodes.csv --hub lucknow [--radius 15] [--osrm]
 *
 * --osrm asks the public OSRM demo server for real road distances (slow: about one request a second) and caches them
 * in data/cache/, so re-runs are free. Without it, distance = straight line x 1.3.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { getHub } from '../src/engine/hubs.ts'
import type { HubId } from '../src/engine/types.ts'
import { buildPoints, rowsFromCsv, selectCatchment } from './lib/geo-build.ts'
import { osrmDistances } from './lib/osrm.ts'

const args = new Map<string, string>()
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue
  const next = argv[i + 1]
  args.set(argv[i].slice(2), next === undefined || next.startsWith('--') ? 'true' : argv[++i])
}

const csvPath = args.get('csv')
const hubId = args.get('hub') as HubId | undefined
if (!csvPath || !hubId) {
  process.stderr.write('Usage: node scripts/build-geo.ts --csv <file> --hub <powai|whitefield|lucknow|gaya> [--radius 15] [--osrm]\n')
  process.exit(1)
}

const hub = getHub(hubId)
const radius = Number(args.get('radius') ?? 15)
const rows = selectCatchment(rowsFromCsv(await readFile(csvPath, 'utf8')), hub, radius)
if (rows.length < 5) {
  process.stderr.write(`Only ${rows.length} pincodes with coordinates within ${radius} km of ${hub.name}. Check the CSV and the hub.\n`)
  process.exit(1)
}

let road = new Map<string, number>()
if (args.has('osrm')) {
  const cachePath = `data/cache/osrm-${hubId}.json`
  await mkdir('data/cache', { recursive: true })
  try {
    road = new Map(Object.entries(JSON.parse(await readFile(cachePath, 'utf8')) as Record<string, number>))
    process.stdout.write(`Using ${road.size} cached routed distances\n`)
  } catch {
    road = await osrmDistances(hub, rows, async (url) => fetch(url))
    await writeFile(cachePath, JSON.stringify(Object.fromEntries(road)))
    process.stdout.write(`Fetched ${road.size} routed distances from OSRM\n`)
  }
}

const points = buildPoints(rows, hub, road)
const out = {
  hub: hubId,
  source: `${csvPath} (pincode directory); ${args.has('osrm') ? 'OSRM road distances' : 'straight line x 1.3'}; demand weights assumed`,
  points,
}
await writeFile(`data/geo-${hubId}.json`, JSON.stringify(out))
process.stdout.write(`Wrote data/geo-${hubId}.json with ${points.length} pincodes within ${radius} km of ${hub.name}\n`)
