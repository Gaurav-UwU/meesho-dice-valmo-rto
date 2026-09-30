/**
 * The simulated clock. Timers (OTP expiry, no-reply, 24 h second chance, 48 h hold, 24 h exception default, 7-day return window,
 * next-day reschedule, end-of-day cash reconciliation) run on this clock, never on the wall clock, so a demo can jump days.
 */
export const MINUTE_MS = 60_000
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS
/** A day's first deliveries go out at 08:00 */
export const DAY_START_MS = 8 * HOUR_MS
/** Day 1 starts at 08:00 */
export const SIM_START = DAY_START_MS
/** Riders hand the day's cash in at 20:00 */
export const COD_RECONCILE_HOUR = 20

export const dayIndex = (now: number): number => Math.floor(now / DAY_MS) + 1

export const nextDayStart = (now: number): number => (Math.floor(now / DAY_MS) + 1) * DAY_MS + DAY_START_MS

/** 20:00 on the same sim day as `at` */
export const codReconciliationTime = (at: number): number => Math.floor(at / DAY_MS) * DAY_MS + COD_RECONCILE_HOUR * HOUR_MS

export function clockText(now: number): string {
  const inDay = now - Math.floor(now / DAY_MS) * DAY_MS
  const h = Math.floor(inDay / HOUR_MS)
  const m = Math.floor((inDay % HOUR_MS) / MINUTE_MS)
  return `Day ${dayIndex(now)} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
