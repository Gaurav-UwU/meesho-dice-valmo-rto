/**
 * Day identity. Every reset makes a new day with a new `dayId` and a higher `dayNo`. Screens compare days by identity first
 * and by how many actions happened second, so a device that took lots of actions on an old day can never beat a reset.
 */

export interface DayStamp {
  readonly dayId: string
  readonly dayNo: number
  readonly version: number
}

export const DAY_RESET_MESSAGE = 'The day was reset, refreshing'

/** A short, unique, readable id for a new day ("d" + day number + time + random). Not a secret; it only tells days apart. The day number in it means two resets in a row can never collide. */
export function newDayId(now: number, random: () => number, dayNo: number): string {
  const time = Math.floor(now).toString(36)
  const salt = Math.floor(random() * 36 ** 5)
    .toString(36)
    .padStart(5, '0')
  return `d${dayNo}-${time}${salt}`
}

/**
 * True when `candidate` is strictly newer than `current`. Same day: more actions win. Different days: the higher day number wins
 * (a counter, never a clock, because phone clocks disagree). Two resets racing with the same number settle by id, the same on every device.
 */
export function isNewerDay(candidate: DayStamp, current: DayStamp): boolean {
  if (candidate.dayId === current.dayId) return candidate.version > current.version
  if (candidate.dayNo !== current.dayNo) return candidate.dayNo > current.dayNo
  return candidate.dayId > current.dayId
}

export type DayCheck = { readonly ok: true } | { readonly ok: false; readonly code: 'day_reset'; readonly message: string }

/** An action carries the id of the day its screen was showing. If that day is gone, the action must not touch the new one. */
export function checkActionDay(current: { readonly dayId: string }, actionDayId: string): DayCheck {
  return current.dayId === actionDayId ? { ok: true } : { ok: false, code: 'day_reset', message: DAY_RESET_MESSAGE }
}
