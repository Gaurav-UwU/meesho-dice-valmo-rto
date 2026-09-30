import { z } from 'zod'
import type { ActionInput } from '../../src/store/types.ts'
import type { HubId } from '../../src/engine/types.ts'

/** Everything that arrives from the browser is untrusted: validate it strictly before it touches the day. */
export const HubIdSchema = z.enum(['powai', 'whitefield', 'lucknow', 'gaya'])

const orderId = z.string().regex(/^[a-z]+-\d{4,6}(-B2)?$/)
const parcelId = z.string().regex(/^P-[a-z]+-\d{4,6}(-B2)?$/)
const code = z.string().regex(/^\d{4}$/)
const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })

const ActionInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('startDay') }),
  z.object({ type: z.literal('customerReply'), orderId, reply: z.enum(['home', 'change_time', 'fix_address', 'pay_now']), location: latLng.optional() }),
  z.object({ type: z.literal('riderDeliver'), orderId }),
  z.object({ type: z.literal('submitOtp'), orderId, code }),
  z.object({ type: z.literal('customerPayment'), orderId, ok: z.boolean() }),
  z.object({
    type: z.literal('riderAttempt'),
    orderId,
    claim: z.enum(['customer_unavailable', 'reschedule_requested', 'address_not_found']),
    evidence: z.object({ gpsDistM: z.number().min(0).max(100_000), calls: z.number().int().min(0).max(50), waitMin: z.number().min(0).max(600) }).optional(),
  }),
  z.object({ type: z.literal('customerReach'), orderId, reached: z.boolean() }),
  z.object({ type: z.literal('customerAskedReschedule'), orderId, asked: z.boolean() }),
  z.object({ type: z.literal('riderRefuse'), orderId, reason: z.enum(['no_cash', 'want_later', 'not_home', 'changed_mind', 'cheaper_elsewhere', 'not_ordered', 'damaged']).optional() }),
  z.object({ type: z.literal('deskSecondChance'), parcelId }),
  z.object({ type: z.literal('customerSecondChance'), parcelId, accept: z.boolean() }),
  z.object({ type: z.literal('deskSetGate'), parcelId, gate: z.enum(['unopened', 'sealOk', 'invoiceOutside']), value: z.boolean() }),
  z.object({
    type: z.literal('deskSetParam'),
    param: z.enum(['conversion', 'shelfCapacity', 'accept_no_cash', 'accept_want_later', 'accept_not_home', 'accept_changed_mind', 'accept_cheaper_elsewhere', 'accept_not_ordered', 'accept_damaged']),
    value: z.number().min(0).max(500),
  }),
  z.object({ type: z.literal('deskHold'), parcelId }),
  z.object({ type: z.literal('deskMatch'), parcelId }),
  z.object({ type: z.literal('deskConsolidate'), parcelId }),
  z.object({ type: z.literal('reattempt'), orderId, riderId: z.string().regex(/^[a-z]+-r\d{2}$/).optional() }),
  z.object({ type: z.literal('resolveException'), orderId, action: z.enum(['confirm', 'free_reattempt', 'strike']) }),
  z.object({ type: z.literal('openReturn'), orderId }),
  z.object({ type: z.literal('reconcileCod') }),
  z.object({ type: z.literal('advanceClock'), minutes: z.number().min(1).max(60 * 24 * 30) }),
  z.object({ type: z.literal('advanceDay') }),
  z.object({ type: z.literal('nextDay') }),
  z.object({ type: z.literal('closePilot') }),
])

export const ActionRequestSchema = z.object({ hubId: HubIdSchema, action: ActionInputSchema })

export type ParsedRequest = { readonly ok: true; readonly hubId: HubId; readonly action: ActionInput } | { readonly ok: false; readonly error: string }

export function parseActionRequest(raw: unknown): ParsedRequest {
  const r = ActionRequestSchema.safeParse(raw)
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }
  return { ok: true, hubId: r.data.hubId, action: r.data.action }
}

export const AdminRequestSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('reset'), hubId: HubIdSchema, seed: z.number().int().min(0).max(1_000_000).optional() }),
  z.object({ op: z.literal('autopilot'), hubId: HubIdSchema, count: z.number().int().min(1).max(500) }),
  z.object({ op: z.literal('bind'), hubId: HubIdSchema, orderId, phone: z.string().regex(/^\+\d{10,15}$/) }),
  z.object({ op: z.literal('ping'), phone: z.string().regex(/^\+\d{10,15}$/) }),
])
