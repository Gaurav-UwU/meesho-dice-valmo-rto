/** Which demo steps a visitor has ticked off. Kept in this browser only; a blocked or full storage just means it is not remembered. */
const KEY = 'rescue-demo-progress-v1'

export function loadProgress(valid: readonly string[]): readonly string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && valid.includes(x)) : []
  } catch {
    return []
  }
}

export function saveProgress(done: readonly string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(done))
  } catch {
    // Not remembered: the checklist still works for this visit.
  }
}

/** Which day the ticks belong to. A reset starts a new day, so ticks left over from the old one would be wrong. */
const DAY_KEY = 'rescue-demo-progress-day-v1'

export function loadProgressDay(): string | undefined {
  try {
    return window.localStorage.getItem(DAY_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function saveProgressDay(dayId: string): void {
  try {
    window.localStorage.setItem(DAY_KEY, dayId)
  } catch {
    // Not remembered: the worst case is one extra "Clear ticks".
  }
}

/**
 * Ticks belong to a day. Once the day is known: the same day (or ticks saved before days were tracked) keeps them;
 * a different day means someone reset it, so the old ticks are dropped.
 */
export function reconcileProgress(savedDayId: string | undefined, currentDayId: string | undefined, done: readonly string[]): { readonly dayId: string | undefined; readonly done: readonly string[] } {
  if (!currentDayId) return { dayId: savedDayId, done }
  if (savedDayId !== undefined && savedDayId !== currentDayId) return { dayId: currentDayId, done: [] }
  return { dayId: currentDayId, done }
}

/** Toggle one step. Returns a new list in the order it was given, never mutating the old one. */
export function toggleStep(done: readonly string[], id: string): readonly string[] {
  return done.includes(id) ? done.filter((x) => x !== id) : [...done, id]
}
