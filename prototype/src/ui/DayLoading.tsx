import { getHub } from '../engine/hubs.ts'
import type { HubId } from '../engine/types.ts'
import { useDayControls, useSyncInfo } from '../store/StoreContext.tsx'
import { describeSync } from '../store/syncText.ts'
import './sync.css'
import { useNow } from './useNow.ts'

/**
 * What a screen shows while it has no day yet. Usually a short "Loading"; but when the shared day cannot be read (offline, saved by
 * an older version, join key refused) it says so in plain words and what to do, instead of sitting on "Loading" for ever.
 */
export function DayLoading({ hubId, text, className }: { readonly hubId: HubId; readonly text?: string; readonly className?: string }) {
  const info = useSyncInfo(hubId)
  const { reset } = useDayControls(hubId)
  const now = useNow(2000)
  if (info.link === 'problem' || info.link === 'offline') {
    const d = describeSync(info, getHub(hubId).name, now)
    return (
      <div className="day-problem" role="alert">
        <strong>{d.label}</strong>
        <p>{d.detail}</p>
        {d.howToJoin ? <p>{d.howToJoin}</p> : null}
        {info.problem === 'old-shape' || info.problem === 'unreadable' ? (
          <button type="button" className="btn danger" onClick={() => void reset()}>
            Reset day
          </button>
        ) : null}
      </div>
    )
  }
  return (
    <p className={className} role="status">
      {text ?? `Loading ${getHub(hubId).name}…`}
    </p>
  )
}
