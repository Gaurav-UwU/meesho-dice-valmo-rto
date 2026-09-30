import { isDelivered, isSettled } from '../../domain/lifecycle.ts'
import { demoRiders, riderEarnings, stopsOf, type Earnings } from '../../domain/selectors.ts'
import type { DayState, ReplyKind, StopStatus } from '../../domain/types.ts'
import type { Order, Rider } from '../../engine/types.ts'

export const STATUS_LABEL: Readonly<Record<StopStatus, string>> = {
  scored: 'Scored',
  out_for_delivery: 'Out for delivery',
  otp_sent: 'OTP sent',
  ndr: 'Failed attempt',
  rescheduled: 'Rescheduled',
  refused: 'Refused',
  delivered_a1: 'Delivered',
  delivered_a2: 'Delivered (attempt 2)',
  rehomed: 'Re-homed',
  rto: 'RTO',
  cancelled: 'Cancelled',
}

export const REPLY_LABEL: Readonly<Record<ReplyKind, string>> = {
  home: "I'm home",
  change_time: 'Change time',
  fix_address: 'Fix address',
  pay_now: 'Pay now (UPI)',
}

/** Attempted and ended as delivered or failed (a rescheduled or out-for-delivery order has not been attempted yet). */
export const isResolved = (status: StopStatus): boolean => isSettled(status)

/** Stops the autopilot bots can still work on, and stops held back for the live demo. */
export function autopilotRemaining(s: DayState): { readonly auto: number; readonly reserved: number } {
  const open = stopsOf(s).filter((x) => x.status === 'out_for_delivery')
  const reserved = open.filter((x) => x.manual).length
  return { auto: open.length - reserved, reserved }
}

/** 1 = riskiest order of the day by Rescue Score. Ties break by id so ranks are stable. */
export function rankScores(s: DayState): ReadonlyMap<string, number> {
  const ranked = [...stopsOf(s)].sort((a, b) => b.score - a.score || (a.order.id < b.order.id ? -1 : 1))
  return new Map(ranked.map((x, i) => [x.order.id, i + 1]))
}

export const areaLabel = (o: Order): string => (o.pincode.startsWith('area-') ? `Area ${o.pincode.slice(5)}` : `PIN ${o.pincode}`)

export interface RosterRow {
  readonly rider: Rider
  readonly total: number
  readonly done: number
  readonly delivered: number
  readonly earnings: Earnings
  readonly isDemo: boolean
}

export function rosterRows(s: DayState): readonly RosterRow[] {
  const demo = demoRiders(s)
  const demoIds = new Set([demo.bonus?.id, demo.control?.id])
  const stops = stopsOf(s)
  return s.riders.map((rider) => {
    const mine = stops.filter((x) => x.riderId === rider.id)
    return {
      rider,
      total: mine.length,
      done: mine.filter((x) => isResolved(x.status)).length,
      delivered: mine.filter((x) => isDelivered(x.status)).length,
      earnings: riderEarnings(s, rider.id),
      isDemo: demoIds.has(rider.id),
    }
  })
}

export const riderNameOf = (s: DayState, riderId: string): string => s.riders.find((r) => r.id === riderId)?.name ?? riderId
