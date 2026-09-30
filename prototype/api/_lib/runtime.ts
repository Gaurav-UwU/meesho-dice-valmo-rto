import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getHub } from '../../src/engine/hubs.ts'
import { syntheticGeo } from '../../src/engine/synthetic-geo.ts'
import type { GeoPoint, HubGeo, HubId } from '../../src/engine/types.ts'
import type { Deps } from './core.ts'
import { loadEnv, type ServerEnv } from './env.ts'
import { newOtp } from './otp.ts'
import { createSupabaseDb } from './supabaseDb.ts'
import { sendWhatsApp } from './twilio.ts'

/** Real pincode geography when data/geo-<hub>.json was shipped with the function, otherwise the labelled stand-in. */
async function loadGeoNode(hubId: HubId): Promise<HubGeo> {
  const hub = getHub(hubId)
  try {
    const raw = await readFile(join(process.cwd(), 'data', `geo-${hubId}.json`), 'utf8')
    const file = JSON.parse(raw) as { points?: GeoPoint[] }
    if (Array.isArray(file.points) && file.points.length > 0) return { hub, points: file.points }
  } catch {
    // No real file for this hub: fall through to the stand-in.
  }
  return syntheticGeo(hub)
}

let cached: { env: ServerEnv; deps: Deps } | undefined

/** Wire the real Supabase, Twilio and clock. Built once per warm function instance. */
export function runtime(): { env: ServerEnv; deps: Deps } {
  if (cached) return cached
  const env = loadEnv(process.env)
  const deps: Deps = {
    db: createSupabaseDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY),
    send: (phone, body) =>
      sendWhatsApp({ accountSid: env.TWILIO_ACCOUNT_SID, authToken: env.TWILIO_AUTH_TOKEN, from: env.TWILIO_WHATSAPP_FROM }, phone, body, async (url, init) => {
        const res = await fetch(url, init)
        return { ok: res.ok, status: res.status, text: () => res.text() }
      }),
    now: Date.now,
    newCode: newOtp,
    loadGeo: loadGeoNode,
    pepper: env.OTP_PEPPER,
  }
  cached = { env, deps }
  return cached
}
