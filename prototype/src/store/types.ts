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

/** Is this device on a day other devices can see? Every screen shows the answer, in plain words (see syncText.ts). */
export type LinkState =
  /** Shared day: every device that joined sees and changes the same day */
  | 'synced'
  /** This device has its own private day (Demo mode, or Live mode asked for but not available) */
  | 'alone'
  /** Live mode, waiting for the first read of the shared day */
  | 'connecting'
  /** Live mode, but the shared day could not be reached for a while (showing the last one seen) */
  | 'offline'
  /** Something needs a person: see `problem` */
  | 'problem'

export type AloneReason =
  /** Demo mode on purpose */
  | 'demo'
  /** ?mode=live was asked for but this build has no shared-day server */
  | 'live-unavailable'

/** What is wrong, when link is 'problem' */
export type SyncProblem =
  /** The saved shared day was made by an older version of the app. A reset (or the server's own upgrade) fixes it. */
  | 'old-shape'
  /** The join key was refused */
  | 'bad-key'
  /** The shared day is newer than this page understands: reload to get the new version of the app */
  | 'app-too-old'

export type SyncWarning =
  /** Private tab or blocked storage: the day is not kept if this tab is closed */
  | 'storage-blocked'
  /** This browser cannot tell its other tabs about changes */
  | 'no-tab-sync'

export interface SyncInfo {
  readonly mode: StoreMode
  readonly link: LinkState
  readonly aloneReason?: AloneReason
  readonly problem?: SyncProblem
  readonly warnings: readonly SyncWarning[]
  /** The day this device is showing, if it has one */
  readonly day?: { readonly hubId: HubId; readonly dayId: string; readonly dayNo: number; readonly version: number }
  /** When (device clock) the day last changed on this device */
  readonly lastUpdateAt?: number
  /** Live mode: when (device clock) the shared day was last confirmed by the server, even if nothing changed */
  readonly lastCheckedAt?: number
  /** Something worth telling the person, newest last-write-wins. `seq` goes up each time, so a screen can react once per notice. */
  readonly notice?: { readonly seq: number; readonly text: string }
}

export interface Store {
  readonly mode: StoreMode
  /** undefined until the hub's day has been loaded; call ensureDay first */
  getState(hubId: HubId): DayState | undefined
  /** Where this device stands: synced, alone, offline or needing a person. Same object until something changes. */
  getInfo(hubId: HubId): SyncInfo
  subscribe(listener: () => void): () => void
  ensureDay(hubId: HubId): Promise<void>
  send(hubId: HubId, input: ActionInput): Promise<void>
  /** Let the autopilot bots work through `count` stops. Resolves false when nothing was done because the day changed or the server said no: callers stop looping. */
  autopilot(hubId: HubId, count: number): Promise<boolean>
  /** Look again right now for a newer day (the tab woke up, the phone came back online). Safe to call any time. */
  resync(): Promise<void>
  /** Throw the day away and start a fresh one (a new day id that every device switches to) */
  reset(hubId: HubId, seed?: number): Promise<void>
}
