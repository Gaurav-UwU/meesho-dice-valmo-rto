import type { LatLng } from '../../src/engine/geo.ts'
import { bindPhone, handleInbound, runAction, runAutopilot, runEnsure, runReset, type Deps, type Result } from './core.ts'
import { safeEqual } from './otp.ts'
import { fromWhatsApp, verifyTwilioSignature } from './twilio.ts'
import { AdminRequestSchema, HubIdSchema, parseActionRequest } from './validate.ts'

const MAX_BODY_BYTES = 10_000

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const fromResult = (r: Result): Response => (r.ok ? json(r) : json(r, r.error === 'Too many OTP requests for this order' ? 429 : 409))

async function readJson(req: Request): Promise<unknown> {
  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) throw new Error('too large')
  return JSON.parse(text)
}

/** Constant-time comparison that treats a missing header as a mismatch. */
const matches = (given: string | null, expected: string): boolean => given !== null && safeEqual(given, expected)

export interface ActionConfig {
  /** If set, every browser call must send it as `x-live-key`. Keeps strangers off the Live day. */
  readonly liveKey?: string
}

/** POST { hubId, action }: a screen tapping a button. */
export async function handleAction(req: Request, deps: Deps, cfg: ActionConfig): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405)
  if (cfg.liveKey && !matches(req.headers.get('x-live-key'), cfg.liveKey)) return json({ ok: false, error: 'Not allowed' }, 401)
  // Requiring JSON blocks "simple" cross-site form posts, which browsers send without a preflight check.
  if (!req.headers.get('content-type')?.startsWith('application/json')) return json({ ok: false, error: 'Send JSON' }, 415)
  let raw: unknown
  try {
    raw = await readJson(req)
  } catch {
    return json({ ok: false, error: 'Bad request body' }, 400)
  }
  const parsed = parseActionRequest(raw)
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400)
  return fromResult(await runAction(deps, parsed.hubId, parsed.action))
}

/** GET ?hub=<id>: create the hub's day if it does not exist yet, so a screen opening first still has something to show. */
export async function handleEnsure(req: Request, deps: Deps, cfg: ActionConfig): Promise<Response> {
  if (req.method !== 'GET') return json({ ok: false, error: 'GET only' }, 405)
  if (cfg.liveKey && !matches(req.headers.get('x-live-key'), cfg.liveKey)) return json({ ok: false, error: 'Not allowed' }, 401)
  const hub = HubIdSchema.safeParse(new URL(req.url).searchParams.get('hub'))
  if (!hub.success) return json({ ok: false, error: 'Unknown hub' }, 400)
  return fromResult(await runEnsure(deps, hub.data))
}

export interface AdminConfig {
  readonly adminToken: string
}

/** POST { op, ... } with `Authorization: Bearer <ADMIN_TOKEN>`: reset the day, run autopilot, link a real phone to an order. */
export async function handleAdmin(req: Request, deps: Deps, cfg: AdminConfig): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405)
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
  if (!matches(bearer, cfg.adminToken)) return json({ ok: false, error: 'Not allowed' }, 401)
  let raw: unknown
  try {
    raw = await readJson(req)
  } catch {
    return json({ ok: false, error: 'Bad request body' }, 400)
  }
  const parsed = AdminRequestSchema.safeParse(raw)
  if (!parsed.success) return json({ ok: false, error: 'Invalid admin request' }, 400)
  const op = parsed.data
  switch (op.op) {
    case 'reset':
      return fromResult(await runReset(deps, op.hubId, op.seed))
    case 'autopilot':
      return fromResult(await runAutopilot(deps, op.hubId, op.count))
    case 'bind':
      return fromResult(await bindPhone(deps, { phone: op.phone, hubId: op.hubId, orderId: op.orderId }))
    case 'ping':
      try {
        await deps.send(op.phone, 'Valmo Rescue Console: WhatsApp is connected. This phone can now receive order messages and OTPs.')
        return json({ ok: true, version: 0, sent: 1, warnings: [] })
      } catch {
        return json({ ok: false, error: 'WhatsApp could not send. Has this phone joined the Twilio sandbox (in the last 3 days)?' }, 502)
      }
  }
}

export interface TwilioConfigHttp {
  readonly authToken: string
  /** The exact public URL Twilio is configured to call (it is part of what Twilio signs) */
  readonly webhookUrl: string
}

const twiml = (): Response => new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { status: 200, headers: { 'content-type': 'text/xml' } })

const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Twilio's inbound WhatsApp webhook. Only requests carrying a valid Twilio signature are believed. */
export async function handleTwilio(req: Request, deps: Deps, cfg: TwilioConfigHttp): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405)
  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: 'Bad request body' }, 400)
  const params = Object.fromEntries(new URLSearchParams(text).entries())
  if (!verifyTwilioSignature(cfg.authToken, cfg.webhookUrl, params, req.headers.get('x-twilio-signature'))) {
    return json({ ok: false, error: 'Bad signature' }, 403)
  }
  const lat = num(params.Latitude)
  const lng = num(params.Longitude)
  const inRange = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  // A real customer's spot is published to every screen, so keep only about 100 m of precision.
  const location: LatLng | undefined = inRange ? { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 } : undefined
  await handleInbound(deps, fromWhatsApp(params.From ?? ''), params.Body ?? '', location, params.MessageSid)
  return twiml()
}

/** Sliding-window limiter: at most `limit` calls per `windowMs` per key. In memory, so it is per server instance (good enough for a demo). */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now): (key: string) => boolean {
  const hits = new Map<string, number[]>()
  return (key) => {
    const t = now()
    const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return false
    }
    hits.set(key, [...recent, t])
    return true
  }
}
