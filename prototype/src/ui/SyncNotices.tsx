import { useEffect, useRef } from 'react'
import { useSyncInfo } from '../store/StoreContext.tsx'
import { showToast } from './toast.ts'
import { useHubParam } from './hub.ts'

/**
 * Tells the person when their day changed under them ("the day was reset, refreshing"). One quiet notice per change,
 * never one for something that was already there when the page opened.
 */
export function SyncNotices() {
  const { hub } = useHubParam()
  const { notice } = useSyncInfo(hub.id)
  const seen = useRef(notice?.seq)
  useEffect(() => {
    if (!notice || notice.seq === seen.current) return
    seen.current = notice.seq
    showToast(notice.text, 6000, 'info')
  }, [notice])
  return null
}
