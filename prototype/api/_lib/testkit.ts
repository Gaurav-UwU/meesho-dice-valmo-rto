import { getHub } from '../../src/engine/hubs.ts'
import { syntheticGeo } from '../../src/engine/synthetic-geo.ts'
import type { DayState } from '../../src/domain/types.ts'
import type { HubId } from '../../src/engine/types.ts'
import type { Binding, Db, Deps } from './core.ts'

export interface FakeDb extends Db {
  readonly days: Map<HubId, DayState>
  readonly bindings: Map<string, Binding>
  readonly seen: Set<string>
  /** Make the next `n` saves lose a race, to test the retry */
  conflicts: number
}

export function fakeDb(): FakeDb {
  const days = new Map<HubId, DayState>()
  const bindings = new Map<string, Binding>()
  const seen = new Set<string>()
  const db: FakeDb = {
    days,
    bindings,
    seen,
    conflicts: 0,
    loadDay: async (hubId) => days.get(hubId) ?? null,
    saveDay: async (hubId, state, expected) => {
      if (db.conflicts > 0) {
        db.conflicts--
        return false
      }
      const cur = days.get(hubId)
      if ((cur?.version ?? null) !== expected) return false
      days.set(hubId, state)
      return true
    },
    findBinding: async (phone) => bindings.get(phone) ?? null,
    bindingsFor: async (hubId) => [...bindings.values()].filter((b) => b.hubId === hubId),
    saveBinding: async (b) => void bindings.set(b.phone, b),
    markSeen: async (sid) => {
      if (seen.has(sid)) return false
      seen.add(sid)
      return true
    },
  }
  return db
}

export interface Harness {
  readonly deps: Deps
  readonly db: FakeDb
  readonly sent: { readonly phone: string; readonly body: string }[]
  failSend: boolean
}

export function harness(overrides: Partial<Deps> = {}): Harness {
  const db = fakeDb()
  const sent: { phone: string; body: string }[] = []
  const h: Harness = {
    db,
    sent,
    failSend: false,
    deps: {
      db,
      send: async (phone, body) => {
        if (h.failSend) throw new Error('boom')
        sent.push({ phone, body })
      },
      now: () => 1_700_000_000_000,
      newCode: () => '4321',
      loadGeo: async (id) => ({ ...syntheticGeo(getHub(id)), hub: getHub(id) }),
      pepper: 'test-pepper',
      ...overrides,
    },
  }
  return h
}
