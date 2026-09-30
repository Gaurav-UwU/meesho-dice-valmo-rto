import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HUBS } from '../engine/hubs.ts'
import type { Hub, HubId } from '../engine/types.ts'

/** Lucknow is the default: it is the Router demo hub (UP sellers, mostly non-GST). */
export const DEFAULT_HUB: HubId = 'lucknow'

const isHubId = (x: string | null): x is HubId => HUBS.some((h) => h.id === x)

/** The selected hub, kept in the URL (?hub=gaya) so QR codes and links carry it between devices. */
export function useHubParam(): { readonly hub: Hub; readonly setHub: (id: HubId) => void } {
  const [params, setParams] = useSearchParams()
  const raw = params.get('hub')
  const id: HubId = isHubId(raw) ? raw : DEFAULT_HUB
  const setHub = useCallback(
    (next: HubId) => {
      const p = new URLSearchParams(params)
      p.set('hub', next)
      setParams(p, { replace: true })
    },
    [params, setParams],
  )
  return { hub: HUBS.find((h) => h.id === id) ?? HUBS[0], setHub }
}
