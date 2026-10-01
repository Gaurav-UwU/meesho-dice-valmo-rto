import type { LatLng } from '../../src/engine/geo.ts'
import { roleCan, type Role } from '../../src/domain/roles.ts'
import { bindPhone, handleInbound, runAction, runAutopilot, runEnsure, runReset, type Deps, type Result } from './core.ts'
import { loadEnv } from './env.ts'
import { safeEqual } from './otp.ts'
import { fromWhatsApp, verifyTwilioSignature } from './twilio.ts'
import { AdminRequestSchema, HubIdSchema, parseActionRequest } from './validate.ts'

const MAX_BODY_BYTES = 10_000
/** The text core.ts answers when every retry lost the race to save (the day was busy) */
const BUSY_TEXT = 'The day is busy, please try again'

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
  /** The RIDER key (`x-live-key`): can send only what a rider's phone does, and the customer replies. Keeps strangers off the Live day. */
  readonly liveKey?: string
  /** The CAPTAIN key (`x-live-key`): can send everything. Never put in a QR code. */
  readonly captainKey?: string
}

/**
 * Who is asking, from the key they sent. The captain key is checked first (a rider key never opens it). With no keys configured the API is open
 * (tests only: the real server refuses to start without both). With only a rider key configured it keeps the old behaviour: that key is trusted fully.
 */
function roleOf(req: Request, cfg: ActionConfig): Role | null {
  if (!cfg.liveKey && !cfg.captainKey) return 'captain'
  const given = req.headers.get('x-live-key')
  if (cfg.captainKey && matches(given, cfg.captainKey)) return 'captain'
  if (cfg.liveKey && matches(given, cfg.liveKey)) return cfg.captainKey ? 'rider' : 'captain'
  return null
}

/** POST { hubId, action }: a screen tapping a button. */
export async function handleAction(req: Request, deps: Deps, cfg: ActionConfig): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405)
  const role = roleOf(req, cfg)
  if (role === null) return json({ ok: false, error: 'Not allowed' }, 401)
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
  // A rider key may send only the rider actions (and the customer replies, which the server also guards for real phones). The rest needs the captain key.
  if (!roleCan(role, parsed.action.type)) return json({ ok: false, code: 'needs_captain', error: 'This needs the captain key. A rider key can only deliver, attempt, refuse or enter a code.' }, 403)
  return fromResult(await runAction(deps, parsed.hubId, parsed.action, 'browser', parsed.dayId))
}

/** GET ?hub=<id>: create the hub's day if it does not exist yet, so a screen opening first still has something to show. */
export async function handleEnsure(req: Request, deps: Deps, cfg: ActionConfig): Promise<Response> {
  if (req.method !== 'GET') return json({ ok: false, error: 'GET only' }, 405)
  // Opening a screen needs either key: it only creates a missing day and never changes a current one.
  if (roleOf(req, cfg) === null) return json({ ok: false, error: 'Not allowed' }, 401)
  const hub = HubIdSchema.safeParse(new URL(req.url).searchParams.get('hub'))
  if (!hub.success) return json({ ok: false, error: 'Unknown hub' }, 400)
  const result = await runEnsure(deps, hub.data)
  // Say which kind of key opened it, so a screen that was given the captain key by mistake never puts it in a QR code.
  return result.ok ? json({ ...result, role: roleOf(req, cfg) }) : fromResult(result)
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
      return fromResult(await runAutopilot(deps, op.hubId, op.count, op.dayId))
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
  // A real customer's spot is published to every screen (the day is readable by anyone), so keep only about 1 km of precision.
  const location: LatLng | undefined = inRange ? { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 } : undefined
  const result = await handleInbound(deps, fromWhatsApp(params.From ?? ''), params.Body ?? '', location, params.MessageSid)
  // A reply that could not be applied because the day was busy is NOT recorded as seen: answer 503 so Twilio sends it again.
  if ('ok' in result && result.ok === false && result.error === BUSY_TEXT) return json({ ok: false, error: 'Busy, please retry' }, 503)
  return twiml()
}

/** What /api/health answers: only whether the server is configured. It never says which variables are missing. */
export function handleHealth(raw: Readonly<Record<string, string | undefined>>): Response {
  try {
    loadEnv(raw)
    return json({ ok: true })
  } catch {
    return json({ ok: false }, 503)
  }
}

/** The most client keys a limiter remembers; past it the oldest are dropped */
const MAX_KEYS = 5000

export interface RateLimiter {
  (key: string): boolean
  /** How many keys are being remembered (for the pruning test) */
  size(): number
}

/**
 * Sliding-window limiter: at most `limit` calls per `windowMs` per key. In memory, so it is per server instance. It forgets keys that have gone
 * quiet, so the map cannot grow without limit. A rate rule in the Vercel Firewall on /api/* is the real control; this is the backstop.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now): RateLimiter {
  const hits = new Map<string, number[]>()
  let lastSweep = now()
  const sweep = (t: number): void => {
    for (const [key, times] of hits) if (times.every((x) => t - x >= windowMs)) hits.delete(key)
    lastSweep = t
  }
  const allow = (key: string): boolean => {
    const t = now()
    // Sweep at most once per window (so a flood of keys cannot make every request walk the whole map), and cap the map by dropping the oldest keys.
    if (t - lastSweep >= windowMs) sweep(t)
    if (hits.size > MAX_KEYS) for (const key of hits.keys()) { if (hits.size <= MAX_KEYS * 0.8) break; hits.delete(key) }
    const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return false
    }
    hits.set(key, [...recent, t])
    return true
  }
  return Object.assign(allow, { size: () => hits.size })
}
