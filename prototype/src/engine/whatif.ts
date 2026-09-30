import { LANE_LABEL, routeParcel, type RefusedParcel, type RouteDecision, type RouteOptions } from './router.ts'

/**
 * "Try a what-if" on the Desk: what would the Router do if one of these three facts about the parcel were different?
 * It is a preview only. The parcel is never changed; the real values come from the hub operator's inspection.
 * The seller's opt-in, the state check, the shelf, the rider's bag and the expected value are facts and cannot be flipped.
 */
export type WhatIfGate = 'unopened' | 'sealOk' | 'invoiceOutside'
export type WhatIfFlips = Partial<Record<WhatIfGate, boolean>>

const ORDER: readonly WhatIfGate[] = ['unopened', 'sealOk', 'invoiceOutside']

const WORDS: Readonly<Record<WhatIfGate, { readonly yes: string; readonly no: string }>> = {
  unopened: { yes: 'Parcel unopened', no: 'Parcel opened' },
  sealOk: { yes: 'Seal intact', no: 'Seal broken' },
  invoiceOutside: { yes: 'Invoice outside', no: 'Invoice inside' },
}

export interface WhatIfResult {
  /** The real decision for the parcel as it is */
  readonly before: RouteDecision
  /** The decision if the flips were true */
  readonly after: RouteDecision
  /** The recommended lane is different */
  readonly changed: boolean
  /** One line, for example "Seal broken: Hold lane closed, now Consolidated return, EV +₹136 → +₹36". Empty when nothing would change. */
  readonly text: string
}

/** Expected value (₹) of the lane the Router recommends. */
export function laneEv(d: RouteDecision): number {
  switch (d.lane) {
    case 'second_chance':
      return d.ev.secondChance
    case 'hold_rehome':
      return d.ev.hold ?? 0
    case 'consolidated_return':
      return d.ev.consolidated
  }
}

const signed = (n: number): string => `${n < 0 ? '−' : '+'}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`

export function whatIf(parcel: RefusedParcel, flips: WhatIfFlips, opts: RouteOptions = {}): WhatIfResult {
  const before = routeParcel(parcel, opts)
  const real = ORDER.filter((g) => flips[g] !== undefined && flips[g] !== parcel[g])
  if (real.length === 0) return { before, after: before, changed: false, text: '' }
  const patch = Object.fromEntries(real.map((g) => [g, flips[g]]))
  const after = routeParcel({ ...parcel, ...patch }, opts)
  const changed = after.lane !== before.lane
  const holdWas = before.ev.hold !== null
  const holdNow = after.ev.hold !== null
  const holdNote = holdWas && !holdNow ? 'Hold lane closed' : !holdWas && holdNow ? 'Hold lane opens' : ''
  const who = real.map((g) => (flips[g] ? WORDS[g].yes : WORDS[g].no)).join(' + ')
  const ev = `EV ${signed(laneEv(before))} → ${signed(laneEv(after))}`
  const text = changed
    ? `${who}: ${holdNote === '' ? 'lane changes' : holdNote}, now ${LANE_LABEL[after.lane]}, ${ev}`
    : `${who}: still ${LANE_LABEL[after.lane]}, ${ev}${holdNote === '' ? '' : `; ${holdNote}`}`
  return { before, after, changed, text }
}
