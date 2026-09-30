import type { Action, DayState } from '../domain/types.ts'
import type { HubId } from '../engine/types.ts'

type Distribute<T, K extends string> = T extends unknown ? Omit<T, K> : never

/**
 * What a screen sends. The store stamps the time and, for actions that issue an OTP, generates the code
 * (in Live mode the server does this), so screens never invent either.
 */
export type ActionInput =
  | Omit<Extract<Action, { type: 'riderDeliver' }>, 'at' | 'code'>
  | Omit<Extract<Action, { type: 'riderRefuse' }>, 'at' | 'code'>
  | Distribute<Exclude<Action, { type: 'riderDeliver' | 'riderRefuse' }>, 'at'>

export type StoreMode = 'demo' | 'live'

export interface Store {
  readonly mode: StoreMode
  /** undefined until the hub's day has been loaded; call ensureDay first */
  getState(hubId: HubId): DayState | undefined
  subscribe(listener: () => void): () => void
  ensureDay(hubId: HubId): Promise<void>
  send(hubId: HubId, input: ActionInput): Promise<void>
  /** Let the autopilot bots work through `count` stops */
  autopilot(hubId: HubId, count: number): Promise<void>
  /** Throw the day away and start a fresh one */
  reset(hubId: HubId, seed?: number): Promise<void>
}
