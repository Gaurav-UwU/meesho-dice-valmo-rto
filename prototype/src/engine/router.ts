import { DEFAULTS, ROUTER } from './economics.ts'
import type { HubId } from './types.ts'

/**
 * Refused-Parcel Router v2 (work/13-refused-parcels.md). Lanes are taken in order, and a lane is taken only if its gates pass
 * AND its expected value is above zero (the waterfall):
 *   1. Second chance: P(customer accepts | why they refused) x (₹120 return avoided - ₹21 re-attempt) - messages
 *   2. Hold & Re-home: gates pass, and P(a buyer appears in 48 h) x ₹145 - ₹8 to hold
 *   3. Consolidated return (always available)
 * Lane 4 (local donation or destruction) is deliberately not built: it is legally grey and deferred.
 * Every probability here is an ASSUMPTION, editable on the Desk; the 30-day pilot measures the real ones.
 */
export type Lane = 'second_chance' | 'hold_rehome' | 'consolidated_return'

export type RefusalReason = 'no_cash' | 'want_later' | 'not_home' | 'changed_mind' | 'cheaper_elsewhere' | 'not_ordered' | 'damaged'

export const REFUSAL_REASONS: readonly RefusalReason[] = ['no_cash', 'want_later', 'not_home', 'changed_mind', 'cheaper_elsewhere', 'not_ordered', 'damaged']

export const REFUSAL_LABEL: Readonly<Record<RefusalReason, string>> = {
  no_cash: 'No cash on hand',
  want_later: 'Wants it later',
  not_home: 'Not home',
  changed_mind: 'Changed their mind',
  cheaper_elsewhere: 'Found it cheaper elsewhere',
  not_ordered: "Didn't order it",
  damaged: 'Damaged or wrong item',
}

/** Not home, no cash and "later" are soft: the sale may still be there. The rest are hard. */
export const isSoftReason = (r: RefusalReason): boolean => r === 'no_cash' || r === 'want_later' || r === 'not_home'

export interface RouterParams {
  /** P(customer accepts a second chance | reason). ASSUMPTION. */
  readonly acceptByReason: Readonly<Record<RefusalReason, number>>
  /** Share of nearby demand that turns into a re-home. ASSUMPTION. */
  readonly conversion: number
  /** Hours a parcel may sit on the shelf hoping for a buyer */
  readonly holdHours: number
  /** Hours the customer has to answer a second-chance message */
  readonly secondChanceHours: number
  readonly shelfCapacity: number
}

export const DEFAULT_ROUTER_PARAMS: RouterParams = {
  acceptByReason: { no_cash: 0.5, want_later: 0.5, not_home: 0.4, changed_mind: 0.15, cheaper_elsewhere: 0.1, not_ordered: 0, damaged: 0 },
  conversion: 0.5,
  holdHours: 48,
  secondChanceHours: 24,
  shelfCapacity: 30,
}

/** ₹ per WhatsApp message (assumption) and how many a second chance costs (the offer and the answer). */
export const MESSAGE_COST = 0.5
const SECOND_CHANCE_MESSAGES = 2
/** Batched returns are assumed 30% cheaper than sending each parcel back alone (US benchmark 20-40%, unmeasured in India). */
export const BATCH_SAVING_SHARE = 0.3

export interface RefusedParcel {
  readonly id: string
  readonly awb: string
  readonly hubId: HubId
  readonly hubState: string
  readonly buyerState: string
  readonly sellerId: string
  readonly sellerState: string
  readonly sellerGst: boolean
  readonly skuId: string
  readonly value: number
  /** Why the customer refused: captured by the rider when the refusal OTP is verified */
  readonly reason: RefusalReason
  readonly unopened: boolean
  readonly sealOk: boolean
  readonly sellerOptedIn: boolean
  /** Invoice is in an outside pouch or digital, so the seal never has to be broken */
  readonly invoiceOutside: boolean
  /** Buyers of this SKU appearing per hour in the hub catchment (synthetic). Feeds P(match in 48 h). */
  readonly demandRate: number
}

export interface Gate {
  readonly name: string
  readonly pass: boolean
  readonly note: string
}

export interface Effect {
  /** ₹ saved versus sending the parcel back. Negative = a cost. */
  readonly min: number
  readonly max: number
  readonly label: string
}

export interface LaneEv {
  readonly secondChance: number
  /** null when a gate fails: the hold lane is not even considered */
  readonly hold: number | null
  readonly consolidated: number
}

export interface RouteDecision {
  readonly lane: Lane
  readonly reason: string
  readonly gates: readonly Gate[]
  readonly effect: Effect
  readonly ev: LaneEv
  /** The numbers behind the decision, for the audit trail */
  readonly inputs: { readonly pAccept: number; readonly pMatch: number; readonly demandRate: number; readonly refusalReason: RefusalReason }
}

export interface RouteOptions {
  readonly secondChanceDeclined?: boolean
  readonly secondChanceExpired?: boolean
  readonly params?: RouterParams
  /** Parcels already on the shelf */
  readonly shelfUsed?: number
  /** False when no rider has room in the bag for a re-homed parcel */
  readonly riderHasSpace?: boolean
}

const LANE_EFFECT: Record<Lane, Effect> = {
  second_chance: {
    // If the customer says no, we still paid for the re-attempt and the parcel goes back anyway.
    min: -ROUTER.reAttemptCost,
    max: DEFAULTS.reverseCost - ROUTER.reAttemptCost,
    label: 'If accepted: saves the ₹120 return and keeps the sale for ₹21. If not: the ₹21 re-attempt is lost',
  },
  hold_rehome: {
    min: -ROUTER.holdCost,
    max: ROUTER.savedPerMatch,
    label: 'Gross ₹145 if a nearby buyer matches; about ₹8 to hold 48h either way',
  },
  consolidated_return: {
    // US programmes report batching cuts reverse cost by 20-40%. India is unmeasured, so we say so.
    min: DEFAULTS.reverseCost * 0.2,
    max: DEFAULTS.reverseCost * 0.4,
    label: 'Batched by seller, up to 20-40% cheaper (benchmark; to be measured in the pilot)',
  },
}

/** P(customer accepts a second chance | reason) */
export const pAccept = (reason: RefusalReason, params: RouterParams = DEFAULT_ROUTER_PARAMS): number => params.acceptByReason[reason]

/** P(at least one buyer of the same SKU appears and takes it within the hold window) = 1 - exp(-rate x hours x conversion) */
export const pMatch = (demandRate: number, params: RouterParams = DEFAULT_ROUTER_PARAMS): number =>
  1 - Math.exp(-Math.max(0, demandRate) * params.holdHours * params.conversion)

export const secondChanceEv = (reason: RefusalReason, params: RouterParams = DEFAULT_ROUTER_PARAMS): number =>
  pAccept(reason, params) * (DEFAULTS.reverseCost - ROUTER.reAttemptCost) - SECOND_CHANCE_MESSAGES * MESSAGE_COST

export const holdEv = (demandRate: number, params: RouterParams = DEFAULT_ROUTER_PARAMS): number => pMatch(demandRate, params) * ROUTER.savedPerMatch - ROUTER.holdCost

export function holdGates(p: RefusedParcel, opts: RouteOptions = {}): readonly Gate[] {
  const params = opts.params ?? DEFAULT_ROUTER_PARAMS
  const sameState = p.sellerState === p.hubState && p.buyerState === p.hubState
  const shelfUsed = opts.shelfUsed ?? 0
  const ev = holdEv(p.demandRate, params)
  return [
    { name: 'Unopened', pass: p.unopened, note: p.unopened ? 'Parcel not opened' : 'Opened parcels cannot be re-homed' },
    { name: 'Seal intact', pass: p.sealOk, note: p.sealOk ? 'Seal check passed' : 'Seal is broken or tampered' },
    {
      name: 'Same state',
      pass: sameState,
      note: sameState
        ? p.sellerGst
          ? 'Seller state = hub state = buyer state. Registered seller: add the hub as an additional place of business'
          : 'Non-GST seller: same state by law (Notif. 34/2023-CT)'
        : `Seller in ${p.sellerState}, hub in ${p.hubState}: needs a new invoice, so it cannot be re-homed`,
    },
    {
      name: 'Seller opted in',
      pass: p.sellerOptedIn,
      note: p.sellerOptedIn ? 'Seller allows re-homing for this SKU (the seller decides, never the hub)' : 'Seller has not opted in for this SKU: this cannot be overridden',
    },
    {
      name: 'Invoice outside the parcel',
      pass: p.invoiceOutside,
      note: p.invoiceOutside ? 'Invoice is in an outside pouch or digital' : 'Invoice is inside the parcel: the seal would have to be broken',
    },
    {
      name: 'Shelf capacity',
      pass: shelfUsed < params.shelfCapacity,
      note: shelfUsed < params.shelfCapacity ? `${shelfUsed} of ${params.shelfCapacity} shelf slots used` : `Shelf is full (${params.shelfCapacity} parcels)`,
    },
    {
      name: 'Rider bag space',
      pass: opts.riderHasSpace !== false,
      note: opts.riderHasSpace === false ? 'No rider has room in the bag for a re-homed parcel' : 'A rider has room for the re-homed parcel',
    },
    {
      name: 'Expected value',
      pass: ev > 0,
      note: `P(match in ${params.holdHours} h) ${(pMatch(p.demandRate, params) * 100).toFixed(1)}% x ₹${ROUTER.savedPerMatch} - ₹${ROUTER.holdCost} = ${ev >= 0 ? '+' : '−'}₹${Math.abs(ev).toFixed(1)}`,
    },
  ]
}

export function routeParcel(p: RefusedParcel, opts: RouteOptions = {}): RouteDecision {
  const params = opts.params ?? DEFAULT_ROUTER_PARAMS
  const gates = holdGates(p, opts)
  const scEv = secondChanceEv(p.reason, params)
  const failing = gates.filter((g) => !g.pass)
  const ev: LaneEv = {
    secondChance: scEv,
    hold: failing.length === 0 ? holdEv(p.demandRate, params) : null,
    consolidated: DEFAULTS.reverseCost * BATCH_SAVING_SHARE,
  }
  const inputs = { pAccept: pAccept(p.reason, params), pMatch: pMatch(p.demandRate, params), demandRate: p.demandRate, refusalReason: p.reason }
  const tried = opts.secondChanceDeclined === true || opts.secondChanceExpired === true
  if (!tried && scEv > 0) {
    return {
      lane: 'second_chance',
      reason: `${REFUSAL_LABEL[p.reason]}: ${(inputs.pAccept * 100).toFixed(0)}% accept a second chance, worth +₹${scEv.toFixed(0)} on average. Offer it on WhatsApp`,
      gates,
      effect: LANE_EFFECT.second_chance,
      ev,
      inputs,
    }
  }
  if (failing.length === 0) {
    return {
      lane: 'hold_rehome',
      reason: `Every gate passes and the expected value is +₹${(ev.hold ?? 0).toFixed(0)}: hold ${params.holdHours}h and re-home to nearby demand for the same seller and SKU`,
      gates,
      effect: LANE_EFFECT.hold_rehome,
      ev,
      inputs,
    }
  }
  return {
    lane: 'consolidated_return',
    reason: `Cannot re-home. ${failing.map((g) => `${g.name}: ${g.note}`).join('. ')}`,
    gates,
    effect: LANE_EFFECT.consolidated_return,
    ev,
    inputs,
  }
}

export interface DaySummary {
  readonly counts: Record<Lane, number>
  readonly total: number
  /** What it costs to send every parcel back the old way */
  readonly sendBackCost: number
  readonly savedMin: number
  readonly savedMax: number
}

export function summariseDay(parcels: readonly RefusedParcel[], opts: RouteOptions = {}): DaySummary {
  const decisions = parcels.map((p) => routeParcel(p, opts))
  const count = (lane: Lane): number => decisions.filter((d) => d.lane === lane).length
  return {
    counts: { second_chance: count('second_chance'), hold_rehome: count('hold_rehome'), consolidated_return: count('consolidated_return') },
    total: parcels.length,
    sendBackCost: parcels.length * DEFAULTS.reverseCost,
    savedMin: decisions.reduce((s, d) => s + d.effect.min, 0),
    savedMax: decisions.reduce((s, d) => s + d.effect.max, 0),
  }
}

export interface ReturnBatch {
  readonly sellerId: string
  readonly parcelIds: readonly string[]
}

/** Lane 3: group parcels going back so each seller gets one consolidated return. */
export function batchBySeller(parcels: readonly RefusedParcel[]): readonly ReturnBatch[] {
  const bySeller = new Map<string, string[]>()
  for (const p of parcels) {
    const ids = bySeller.get(p.sellerId) ?? []
    ids.push(p.id)
    bySeller.set(p.sellerId, ids)
  }
  return [...bySeller.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([sellerId, parcelIds]) => ({ sellerId, parcelIds }))
}
