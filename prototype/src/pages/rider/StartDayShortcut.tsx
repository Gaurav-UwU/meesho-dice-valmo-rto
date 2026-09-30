import { useSend } from '../../store/StoreContext.tsx'
import type { HubId } from '../../engine/types.ts'

/** Demo shortcut so a phone screen can be opened on its own: the ops console normally starts the day. */
export function StartDayShortcut({ hubId }: { readonly hubId: HubId }) {
  const send = useSend(hubId)
  return (
    <button type="button" className="rider-dev-link" onClick={() => void send({ type: 'startDay' })}>
      Start day (demo shortcut)
    </button>
  )
}
