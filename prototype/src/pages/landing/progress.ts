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

/** Toggle one step. Returns a new list in the order it was given, never mutating the old one. */
export function toggleStep(done: readonly string[], id: string): readonly string[] {
  return done.includes(id) ? done.filter((x) => x !== id) : [...done, id]
}
