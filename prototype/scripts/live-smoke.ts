/**
 * Smoke test of Live mode's server logic against the REAL Supabase project (no Twilio, no browser).
 *
 *   node --env-file=.env.local scripts/live-smoke.ts [hub]
 *
 * Uses the Gaya hub by default so the demo hub is untouched, and resets that hub's day at the end.
 * Checks that the day is stored, an OTP round trip works, and no plain OTP ever reaches the stored (public) row.
 */
import { createClient } from '@supabase/supabase-js'
import { runAction, runReset, type Deps } from '../api/_lib/core.ts'
import { createSupabaseDb } from '../api/_lib/supabaseDb.ts'
import { demoStops } from '../src/domain/selectors.ts'
import { getHub } from '../src/engine/hubs.ts'
import { syntheticGeo } from '../src/engine/synthetic-geo.ts'
import type { HubId } from '../src/engine/types.ts'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
const pepper = process.env.OTP_PEPPER
if (!url || !key || !pepper) {
  process.stderr.write('Missing SUPABASE_URL, SUPABASE_SERVICE_KEY or OTP_PEPPER (run with --env-file=.env.local)\n')
  process.exit(1)
}

const hub = (process.argv[2] ?? 'gaya') as HubId
const CODE = '4321'
const db = createSupabaseDb(url, key)
const sent: string[] = []
const deps: Deps = {
  db,
  send: async (_phone, body) => void sent.push(body),
  now: Date.now,
  newCode: () => CODE,
  loadGeo: async (id) => syntheticGeo(getHub(id)),
  pepper,
}

let failed = 0
const check = (name: string, ok: boolean, detail = ''): void => {
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}\n`)
  if (!ok) failed++
}

const raw = createClient(url, key, { auth: { persistSession: false } })
const storedRow = async (): Promise<string> => {
  const { data, error } = await raw.from('day_state').select('state, version').eq('hub_id', hub).single()
  if (error) throw new Error(error.message)
  return JSON.stringify(data)
}

const r0 = await runReset(deps, hub)
check('reset creates the day in Supabase', r0.ok, r0.ok ? `version ${r0.version}` : r0.error)
const r1 = await runAction(deps, hub, { type: 'startDay' })
check('start day', r1.ok)
const day = await db.loadDay(hub)
check('day reads back with 300 orders', day?.stopOrder.length === 300, `${day?.stopOrder.length}`)
const orderId = day ? demoStops(day).bonus[0] : undefined
check('a demo order exists', orderId !== undefined)

if (orderId) {
  const r2 = await runAction(deps, hub, { type: 'riderDeliver', orderId })
  check('rider Deliver issues an OTP', r2.ok)
  const row = await storedRow()
  check('the stored row never contains the plain OTP', !row.includes(`"code":"${CODE}"`) && !row.includes(`OTP is ${CODE}`))
  check('OTP messages are masked in the stored row', row.includes('••••'))
  const wrong = await runAction(deps, hub, { type: 'submitOtp', orderId, code: '0000' })
  check('a wrong code is accepted as a request but does not deliver', wrong.ok && (await db.loadDay(hub))?.stops[orderId].status === 'otp_sent')
  const right = await runAction(deps, hub, { type: 'submitOtp', orderId, code: CODE })
  const after = await db.loadDay(hub)
  check('the right code delivers and credits ₹15 (pending)', right.ok && after?.stops[orderId].status === 'delivered_a1' && after.ledger[0]?.amount === 15)
  const stale = await db.saveDay(hub, after!, (after?.version ?? 0) - 1)
  check('a stale write is refused (optimistic concurrency)', stale === false)
}

const end = await runReset(deps, hub)
check('cleanup: hub day reset', end.ok)
process.stdout.write(failed === 0 ? '\nAll Live-mode storage checks passed.\n' : `\n${failed} check(s) failed.\n`)
process.exit(failed === 0 ? 0 : 1)
