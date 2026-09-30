import { planAutopilot } from '../../src/domain/autopilot.ts'
import { createDay, DAY_SCHEMA, DEFAULT_DAY } from '../../src/domain/day.ts'
import { checkActionDay } from '../../src/domain/dayId.ts'
import { reduce } from '../../src/domain/reducer.ts'
import { parcelForOrder } from '../../src/domain/selectors.ts'
import type { Action, DayState } from '../../src/domain/types.ts'
import type { LatLng } from '../../src/engine/geo.ts'
import type { HubGeo, HubId } from '../../src/engine/types.ts'
import { dayShape } from '../../src/store/guards.ts'
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
  /** A fresh id for a new day. The number is the day's number (1, 2, 3 ...), so two resets can never share an id. */
  readonly newDayId: (dayNo: number) => string
}

/**
 * Why a request was refused, when the screen needs to react in a particular way:
 * 'day_reset' = the tap was made on a day that has since been reset (the screen refreshes and shows the new day);
 * 'old_shape' = the saved day was made by another version of the app (Reset day fixes it).
 */
export type FailCode = 'day_reset' | 'old_shape'

export type Result =
  | { readonly ok: true; readonly version: number; readonly sent: number; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly error: string; readonly code?: FailCode }

/** What a change can return instead of a new day: a refusal, with the text for the screen */
interface Refusal {
  readonly refuse: string
  readonly code?: FailCode
}

export const MAX_OTP_REQUESTS_PER_ORDER = 5
const MAX_SAVE_ATTEMPTS = 4
const AUTOPILOT_SEED_BASE = 7

const fail = (error: string, code?: FailCode): Result => (code ? { ok: false, error, code } : { ok: false, error })

const OLD_SHAPE_TEXT = 'The saved day is from an older version of the app. Press Reset day on the Ops screen (or reload the page).'

async function freshDay(deps: Deps, hubId: HubId, dayNo: number, seed: number = DEFAULT_DAY.seed): Promise<DayState> {
  return createDay(await deps.loadGeo(hubId), { ...DEFAULT_DAY, seed, dayId: deps.newDayId(dayNo), dayNo })
}

/** The version number a stored row carries, even when its shape is old (the database needs it to write safely) */
const storedVersion = (stored: unknown): number => {
  const v = (stored as { version?: unknown } | null)?.version
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** The day number a stored row carries (0 when it is an old shape that had none) */
const storedDayNo = (stored: unknown): number => {
  const n = (stored as { dayNo?: unknown } | null)?.dayNo
  return typeof n === 'number' && Number.isInteger(n) ? n : 0
}

/** Orders tied to a real WhatsApp number: only their OTP messages are masked in the public day (an in-app demo customer needs to read theirs). */
const boundOrders = async (deps: Deps, hubId: HubId): Promise<ReadonlySet<string>> => new Set((await deps.db.bindingsFor(hubId)).map((b) => b.orderId))

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
async function deliver(deps: Deps, prev: DayState, next: DayState, phoneByOrder: ReadonlyMap<string, string>): Promise<{ sent: number; warnings: string[] }> {
  const fresh = next.messages.slice(prev.messages.length).filter((m) => m.direction === 'out')
  if (fresh.length === 0) return { sent: 0, warnings: [] }
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

/**
 * Load, apply, deliver, store. Retries if another request wrote in between (optimistic concurrency).
 * `dayId` is the day the caller's screen was showing: if the stored day is a different one (it was reset), nothing is applied.
 * Internal callers (the WhatsApp webhook) pass none: a customer's reply always belongs to whatever day is current.
 */
async function mutate(deps: Deps, hubId: HubId, change: (s: DayState) => DayState | Refusal, dayId?: string): Promise<Result> {
  // Phone links change rarely, so read them once per request rather than on every retry.
  const bindings = await deps.db.bindingsFor(hubId)
  const bound = new Set(bindings.map((b) => b.orderId))
  const phoneByOrder = new Map(bindings.map((b) => [b.orderId, b.phone]))
  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
    const stored = await deps.db.loadDay(hubId)
    if (stored && dayShape(stored) !== 'ok') return fail(OLD_SHAPE_TEXT, 'old_shape')
    const base = stored ?? (await freshDay(deps, hubId, 1))
    if (dayId !== undefined) {
      const check = checkActionDay(base, dayId)
      if (!check.ok) return fail(check.message, check.code)
    }
    const out = change(base)
    if ('refuse' in out) return fail(out.refuse, out.code)
    if (out === base && stored) return { ok: true, version: base.version, sent: 0, warnings: [] }
    const storable = toStorable(out, deps.pepper, bound)
    const saved = await deps.db.saveDay(hubId, storable, stored ? stored.version : null)
    if (!saved) continue
    // Send only after the write succeeded, so a conflict retry never messages the customer twice.
    const { sent, warnings } = await deliver(deps, base, out, phoneByOrder)
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
export async function runAction(deps: Deps, hubId: HubId, input: ActionInput, source: 'browser' | 'webhook' = 'browser', dayId?: string): Promise<Result> {
  if (source === 'browser' && CUSTOMER_ACTIONS.has(input.type)) {
    const orderId = customerOrderOf(input)
    const bound = (await deps.db.bindingsFor(hubId)).some((b) => b.orderId === orderId)
    if (bound) return fail('This customer answers on their own WhatsApp')
  }
  return mutate(
    deps,
    hubId,
    (s) => {
      if ((input.type === 'riderDeliver' || input.type === 'riderRefuse') && otpRequestsFor(s, input.orderId) >= MAX_OTP_REQUESTS_PER_ORDER) {
        return { refuse: 'Too many OTP requests for this order' }
      }
      return reduce(s, stamp(deps, input))
    },
    dayId,
  )
}

export async function runAutopilot(deps: Deps, hubId: HubId, count: number, dayId?: string): Promise<Result> {
  // Real phones must never get the bots' fixed test OTP, so bound orders are left alone.
  const skip = await boundOrders(deps, hubId)
  return mutate(deps, hubId, (s) => planAutopilot(s, { count, seed: AUTOPILOT_SEED_BASE + s.version, at: deps.now(), skip }).reduce(reduce, s), dayId)
}

/**
 * Throw the day away and start a new one: a new day id and the next day number, which every open screen switches to.
 * The version keeps climbing (it is never reset) so a slow write that expected an old version can never land on the new day.
 */
export async function runReset(deps: Deps, hubId: HubId, seed?: number): Promise<Result> {
  const stored = await deps.db.loadDay(hubId)
  const fresh = await freshDay(deps, hubId, storedDayNo(stored) + 1, seed)
  const next = { ...fresh, version: storedVersion(stored) + 1 }
  const saved = await deps.db.saveDay(hubId, toStorable(next, deps.pepper), stored ? storedVersion(stored) : null)
  return saved ? { ok: true, version: next.version, sent: 0, warnings: [] } : fail('The day is busy, please try again')
}

/**
 * Make sure a usable day exists for the hub. Safe to call any time: it never touches a current day.
 * A day saved by an OLDER version of the app cannot be read by any screen, so it is replaced by a fresh one here
 * (this is why nobody sits on "Loading" after a deploy that changed the shape of the day).
 */
export async function runEnsure(deps: Deps, hubId: HubId): Promise<Result> {
  const stored = await deps.db.loadDay(hubId)
  if (stored) {
    const oldShape = dayShape(stored) === 'old' && (stored as unknown as { schema: number }).schema < DAY_SCHEMA
    if (!oldShape) return { ok: true, version: stored.version, sent: 0, warnings: [] }
    const upgraded = { ...(await freshDay(deps, hubId, 1)), version: storedVersion(stored) + 1 }
    await deps.db.saveDay(hubId, toStorable(upgraded, deps.pepper), storedVersion(stored)) // losing the race: someone else upgraded it
    const now = await deps.db.loadDay(hubId)
    return now && dayShape(now) === 'ok' ? { ok: true, version: now.version, sent: 0, warnings: [] } : fail(OLD_SHAPE_TEXT, 'old_shape')
  }
  const fresh = toStorable(await freshDay(deps, hubId, 1), deps.pepper)
  await deps.db.saveDay(hubId, fresh, null) // losing the race just means someone else created it
  const now = await deps.db.loadDay(hubId)
  return now ? { ok: true, version: now.version, sent: 0, warnings: [] } : fail('Could not create the day')
}

export async function bindPhone(deps: Deps, binding: Binding): Promise<Result> {
  const day = await deps.db.loadDay(binding.hubId)
  if (!day || dayShape(day) !== 'ok' || !day.stops[binding.orderId]) return fail('Unknown order for this hub')
  await deps.db.saveBinding(binding)
  // An OTP message stored before the link was made is readable in the public day; mask it now that the order belongs to a real phone.
  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
    const current = await deps.db.loadDay(binding.hubId)
    if (!current || dayShape(current) !== 'ok') break
    const masked = toStorable(current, deps.pepper, await boundOrders(deps, binding.hubId))
    if (JSON.stringify(masked.messages) === JSON.stringify(current.messages)) return { ok: true, version: current.version, sent: 0, warnings: [] }
    const next = { ...masked, version: current.version + 1 }
    if (await deps.db.saveDay(binding.hubId, next, current.version)) return { ok: true, version: next.version, sent: 0, warnings: [] }
  }
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
  if (!day || dayShape(day) !== 'ok') return { ok: true, ignored: 'no day' }
  const offers = day.messages.filter((m) => m.orderId === binding.orderId && m.direction === 'out' && m.buttons)
  const action = actionFromReply(
    { orderId: binding.orderId, lastOffer: offers.at(-1), parcelId: parcelForOrder(day, binding.orderId)?.id },
    body,
    location,
  )
  if (!action) return { ok: true, ignored: 'not understood' }
  return runAction(deps, binding.hubId, action, 'webhook')
}
