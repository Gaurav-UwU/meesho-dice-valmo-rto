import type { KeyValue } from './local.ts'

export interface TabSecrets {
  get(name: string): string | undefined
  set(name: string, value: string): void
}

/**
 * Keys (the live key, the admin token) live for this browser tab only: sessionStorage, never disk and never the address bar.
 * Some browsers (private tabs, in-app browsers) block sessionStorage; then the key is kept in memory for the life of the page instead.
 */
export function createTabSecrets(storage: KeyValue | undefined): TabSecrets {
  const memory = new Map<string, string>()
  return {
    get(name) {
      try {
        const v = storage?.getItem(name)
        if (v) return v
      } catch {
        // fall through to memory
      }
      return memory.get(name)
    },
    set(name, value) {
      memory.set(name, value)
      try {
        storage?.setItem(name, value)
      } catch {
        // memory has it
      }
    },
  }
}

const declined = new Set<string>()

/** The stored secret, or ask the person once (a "no" is remembered so a button does not nag on every tap). */
export function askOnce(secrets: TabSecrets, ask: (question: string) => string | null, name: string, question: string): string | undefined {
  const have = secrets.get(name)
  if (have) return have
  if (declined.has(`${name}`)) return undefined
  try {
    const answer = ask(question)?.trim()
    if (!answer) {
      declined.add(name)
      return undefined
    }
    secrets.set(name, answer)
    return answer
  } catch {
    return undefined
  }
}

const sessionOrUndefined = (): KeyValue | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage
  } catch {
    return undefined
  }
}

/** The keys of this browser tab (used by the app; tests make their own with createTabSecrets) */
export const tabSecrets: TabSecrets = createTabSecrets(sessionOrUndefined())
