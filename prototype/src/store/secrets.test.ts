import { describe, expect, it, vi } from 'vitest'
import { askOnce, createTabSecrets } from './secrets.ts'

const memoryStorage = () => {
  const data = new Map<string, string>()
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('tab secrets: kept for this tab only, even when the browser blocks storage', () => {
  it('stores in sessionStorage and reads it back', () => {
    const storage = memoryStorage()
    const s = createTabSecrets(storage)
    s.set('k', 'abc')
    expect(storage.data.get('k')).toBe('abc')
    expect(createTabSecrets(storage).get('k')).toBe('abc')
  })

  it('falls back to memory when storage is missing or throws (private tab, in-app browser)', () => {
    const none = createTabSecrets(undefined)
    none.set('k', 'abc')
    expect(none.get('k')).toBe('abc')
    const throwing = createTabSecrets({
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    throwing.set('k', 'xyz')
    expect(throwing.get('k')).toBe('xyz')
  })

  it('askOnce asks the person once, remembers the answer, and does not nag after a "no"', () => {
    const s = createTabSecrets(undefined)
    const ask = vi.fn<(q: string) => string | null>().mockReturnValueOnce('  secret  ')
    expect(askOnce(s, ask, 'k', 'Question?')).toBe('secret')
    expect(askOnce(s, ask, 'k', 'Question?')).toBe('secret')
    expect(ask).toHaveBeenCalledTimes(1)
    const no = vi.fn<(q: string) => string | null>().mockReturnValue(null)
    expect(askOnce(s, no, 'other', 'Q?')).toBeUndefined()
    expect(askOnce(s, no, 'other', 'Q?')).toBeUndefined()
    expect(no).toHaveBeenCalledTimes(1)
  })

  it('askOnce returns nothing when prompts are blocked (they throw in some in-app browsers)', () => {
    const s = createTabSecrets(undefined)
    const ask = () => {
      throw new Error('no prompt')
    }
    expect(askOnce(s, ask, 'k', 'Q?')).toBeUndefined()
  })
})
