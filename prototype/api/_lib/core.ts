import { planAutopilot } from '../../src/domain/autopilot.ts'
import { createDay, DEFAULT_DAY } from '../../src/domain/day.ts'
import { reduce } from '../../src/domain/reducer.ts'
import { parcelForOrder } from '../../src/domain/selectors.ts'
import type { Action, DayState } from '../../src/domain/types.ts'
import type { LatLng } from '../../src/engine/geo.ts'
import type { HubGeo, HubId } from '../../src/engine/types.ts'
import type { ActionInput } from '../../src/store/types.ts'
import { actionFromReply, formatOutbound } from './inbound.ts'
import { hashOtp } from './otp.ts'
import { toStorable } from './sanitize.ts'

export interface Binding {
  readonly phone: string
  readonly hubId: HubId
  readonly orderId: string
}

/** Storage the server needs. Supabase in production, an in-memory fake in tests. */
export interface Db {
  loadDay(hubId: HubId): Promise<DayState | null>
  /** Write only if the stored version still equals `expectedVersion` (null = no row yet). false = someone else wrote first. */
  saveDay(hubId: HubId, state: DayState, expectedVersion: number | null): Promise<boolean>
  findBinding(phone: string): Promise<Binding | null>
  bindingsFor(hubId: HubId): Promise<readonly Binding[]>
  saveBinding(b: Binding): Promise<void>
  /** Remember a Twilio MessageSid. Returns false if it was already seen (a retry or a replay). */
  markSeen(messageSid: string): Promise<boolean>
}

export interface Deps {
  readonly db: Db
  readonly send: (toPhone: string, body: string) => Promise<void>
  readonly now: () => number
  readonly newCode: () => string
  readonly loadGeo: (hubId: HubId) => Promise<HubGeo>
  readonly pepper: string
}

export type Result =
  | { readonly ok: true; readonly version: number; readonly sent: number; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly error: string }

export const MAX_OTP_REQUESTS_PER_ORDER = 5
const MAX_SAVE_ATTEMPTS = 4
const AUTOPILOT_SEED_BASE = 7

const fail = (error: string): Result => ({ ok: false, error })

async function freshDay(deps: Deps, hubId: HubId, seed: number = DEFAULT_DAY.seed): Promise<DayState> {
  return createDay(await deps.loadGeo(hubId), { ...DEFAULT_DAY, seed })
}

/** Turn a screen's input into a full action: stamp the time, generate OTP codes, hash the code being verified. */
function stamp(deps: Deps, input: ActionInput): Action {
  const at = deps.now()
  if (input.type === 'riderDeliver' || input.type === 'riderRefuse') return { ...input, at, code: deps.newCode() }
  if (input.type === 'submitOtp') return { ...input, at, code: hashOtp(deps.pepper, input.orderId, input.code) }
  return { ...input, at } as Action
}

const otpRequestsFor = (s: DayState, orderId: string): number =>
  s.messages.filter((m) => m.orderId === orderId && (m.kind === 'delivery_otp' || m.kind === 'refusal_otp')).length

/** Send the new outbound messages of bound orders (real phones). Returns how many went out plus any failures. */
async function deliver(deps: Deps, hubId: HubId, prev: DayState, next: DayState): Promise<{ sent: number; warnings: string[] }> {
  const fresh = next.messages.slice(prev.messages.length).filter((m) => m.direction === 'out')
  if (fresh.length === 0) return { sent: 0, warnings: [] }
  const bindings = await deps.db.bindingsFor(hubId)
  const phoneByOrder = new Map(bindings.map((b) => [b.orderId, b.phone]))
  let sent = 0
  const warnings: string[] = []
  for (const m of fresh) {
    const phone = phoneByOrder.get(m.orderId)
    if (!phone) continue
    try {
      await deps.send(phone, formatOutbound(m))
      sent++
    } catch {
      warnings.push(`WhatsApp to order ${m.orderId} could not be sent`)
    }
  }
  return { sent, warnings }
}

/** Load, apply, deliver, store. Retries if another request wrote in between (optimistic concurrency). */
async function mutate(deps: Deps, hubId: HubId, change: (s: DayState) => DayState | string): Promise<Result> {
  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
    const stored = await deps.db.loadDay(hubId)
    const base = stored ?? (await freshDay(deps, hubId))
    const out = change(base)
    if (typeof out === 'string') return fail(out)
    if (out === base && stored) return { ok: true, version: base.version, sent: 0, warnings: [] }
    const storable = toStorable(out, deps.pepper)
    const saved = await deps.db.saveDay(hubId, storable, stored ? stored.version : null)
    if (!saved) continue
    // Send only after the write succeeded, so a conflict retry never messages the customer twice.
    const { sent, warnings } = await deliver(deps, hubId, base, out)
    return { ok: true, version: storable.version, sent, warnings }
  }
  return fail('The day is busy, please try again')
}

const CUSTOMER_ACTIONS = new Set<ActionInput['type']>(['customerReply', 'customerPayment', 'customerReach', 'customerAskedReschedule', 'customerSecondChance'])

/** The order a customer action is about (a parcel id is "P-" + the order id). */
const customerOrderOf = (input: ActionInput): string | undefined => {
  if ('orderId' in input) return input.orderId
  if ('parcelId' in input) return input.parcelId.replace(/^P-/, '')
  return undefined
}

/**
 * `source` says who is asking. A screen in a browser ('browser') may play the customer for synthetic orders (that is the Demo phone),
 * but never for an order tied to a real WhatsApp number: only that customer's own reply ('webhook') may answer for them.
 * Otherwise a rider could confirm their own fake attempt.
 */
export async function runAction(deps: Deps, hubId: HubId, input: ActionInput, source: 'browser' | 'webhook' = 'browser'): Promise<Result> {
  if (source === 'browser' && CUSTOMER_ACTIONS.has(input.type)) {
    const orderId = customerOrderOf(input)
    const bound = (await deps.db.bindingsFor(hubId)).some((b) => b.orderId === orderId)
    if (bound) return fail('This customer answers on their own WhatsApp')
  }
  return mutate(deps, hubId, (s) => {
    if ((input.type === 'riderDeliver' || input.type === 'riderRefuse') && otpRequestsFor(s, input.orderId) >= MAX_OTP_REQUESTS_PER_ORDER) {
      return 'Too many OTP requests for this order'
    }
    return reduce(s, stamp(deps, input))
  })
}

export async function runAutopilot(deps: Deps, hubId: HubId, count: number): Promise<Result> {
  // Real phones must never get the bots' fixed test OTP, so bound orders are left alone.
  const skip = new Set((await deps.db.bindingsFor(hubId)).map((b) => b.orderId))
  return mutate(deps, hubId, (s) => planAutopilot(s, { count, seed: AUTOPILOT_SEED_BASE + s.version, at: deps.now(), skip }).reduce(reduce, s))
}

export async function runReset(deps: Deps, hubId: HubId, seed?: number): Promise<Result> {
  const stored = await deps.db.loadDay(hubId)
  const fresh = await freshDay(deps, hubId, seed)
  // Keep versions climbing so open browsers adopt the reset.
  const next = { ...fresh, version: (stored?.version ?? 0) + 1 }
  const saved = await deps.db.saveDay(hubId, toStorable(next, deps.pepper), stored ? stored.version : null)
  return saved ? { ok: true, version: next.version, sent: 0, warnings: [] } : fail('The day is busy, please try again')
}

/** Make sure a day exists for the hub. Safe to call any time: it never touches an existing day. */
export async function runEnsure(deps: Deps, hubId: HubId): Promise<Result> {
  const stored = await deps.db.loadDay(hubId)
  if (stored) return { ok: true, version: stored.version, sent: 0, warnings: [] }
  const fresh = toStorable(await freshDay(deps, hubId), deps.pepper)
  await deps.db.saveDay(hubId, fresh, null) // losing the race just means someone else created it
  const now = await deps.db.loadDay(hubId)
  return now ? { ok: true, version: now.version, sent: 0, warnings: [] } : fail('Could not create the day')
}

export async function bindPhone(deps: Deps, binding: Binding): Promise<Result> {
  const day = await deps.db.loadDay(binding.hubId)
  if (!day?.stops[binding.orderId]) return fail('Unknown order for this hub')
  await deps.db.saveBinding(binding)
  return { ok: true, version: day.version, sent: 0, warnings: [] }
}

/** A customer's WhatsApp reply: find their order, understand the reply, apply it. */
export async function handleInbound(
  deps: Deps,
  phone: string,
  body: string,
  location?: LatLng,
  messageSid?: string,
): Promise<Result | { readonly ok: true; readonly ignored: string }> {
  // Twilio retries and replays carry the same MessageSid: apply each reply once.
  if (messageSid && !(await deps.db.markSeen(messageSid))) return { ok: true, ignored: 'duplicate' }
  const binding = await deps.db.findBinding(phone)
  if (!binding) return { ok: true, ignored: 'unknown sender' }
  const day = await deps.db.loadDay(binding.hubId)
  if (!day) return { ok: true, ignored: 'no day' }
  const offers = day.messages.filter((m) => m.orderId === binding.orderId && m.direction === 'out' && m.buttons)
  const action = actionFromReply(
    { orderId: binding.orderId, lastOffer: offers.at(-1), parcelId: parcelForOrder(day, binding.orderId)?.id },
    body,
    location,
  )
  if (!action) return { ok: true, ignored: 'not understood' }
  return runAction(deps, binding.hubId, action, 'webhook')
}
