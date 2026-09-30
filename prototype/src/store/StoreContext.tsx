import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import type { DayState } from '../domain/types.ts'
import type { HubId } from '../engine/types.ts'
import type { ActionInput, Store } from './types.ts'

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ store, children }: { readonly store: Store; readonly children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}

/** The live day for a hub. undefined for a moment while it loads; re-renders on every change from any tab. */
export function useDay(hubId: HubId): DayState | undefined {
  const store = useStore()
  useEffect(() => {
    void store.ensureDay(hubId)
  }, [store, hubId])
  return useSyncExternalStore(store.subscribe, () => store.getState(hubId))
}

/** Send actions to a hub's day. The store stamps the time and generates OTP codes. */
export function useSend(hubId: HubId): (input: ActionInput) => Promise<void> {
  const store = useStore()
  return useCallback((input: ActionInput) => store.send(hubId, input), [store, hubId])
}

/** Autopilot and reset controls for the ops console. */
export function useDayControls(hubId: HubId): {
  readonly autopilot: (count: number) => Promise<void>
  readonly reset: () => Promise<void>
} {
  const store = useStore()
  return {
    autopilot: useCallback((count: number) => store.autopilot(hubId, count), [store, hubId]),
    reset: useCallback(() => store.reset(hubId), [store, hubId]),
  }
}
