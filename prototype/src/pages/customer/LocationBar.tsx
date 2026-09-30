import { useState } from 'react'
import type { LatLng } from '../../engine/geo.ts'
import { roadKmEstimate } from '../../engine/geo.ts'

/** A real GPS fix further than this from the hub is a laptop in another city, not the customer: use the demo spot. */
const MAX_PLAUSIBLE_KM = 60
const GEO_TIMEOUT_MS = 4000
/** Demo location: roughly 4 km from the order's current pin. */
const DEMO_OFFSET = { lat: 0.03, lng: 0.025 } as const

interface Props {
  readonly hub: LatLng
  readonly current: LatLng
  /** The store already has a shared location for this order */
  readonly shared: boolean
  readonly onShare: (location: LatLng) => void
}

const demoLocation = (from: LatLng): LatLng => ({ lat: from.lat + DEMO_OFFSET.lat, lng: from.lng + DEMO_OFFSET.lng })

function tryGeolocation(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    // The browser's own timeout does not start while a permission prompt is open, so race our own timer.
    const giveUp = window.setTimeout(() => resolve(null), GEO_TIMEOUT_MS)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        window.clearTimeout(giveUp)
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude })
      },
      () => {
        window.clearTimeout(giveUp)
        resolve(null)
      },
      { timeout: GEO_TIMEOUT_MS },
    )
  })
}

/** Shown after the customer taps "Fix address": WhatsApp's "Share location" step. */
export function LocationBar({ hub, current, shared, onShare }: Props) {
  const [busy, setBusy] = useState(false)
  const [usedDemo, setUsedDemo] = useState(false)

  // Default is a demo spot near the order, so the demo never asks for (or stores) anyone's real position.
  // Real GPS is used only when the person explicitly chooses it.
  const share = async (useGps: boolean): Promise<void> => {
    setBusy(true)
    const real = useGps ? await tryGeolocation() : null
    const useReal = real !== null && roadKmEstimate(hub, real) <= MAX_PLAUSIBLE_KM
    setUsedDemo(!useReal)
    setBusy(false)
    onShare(useReal ? real : demoLocation(current))
  }

  return (
    <div className="cust-composer">
      <button type="button" className="cust-share" disabled={busy || shared} onClick={() => void share(false)}>
        <span aria-hidden="true">📍</span> {busy ? 'Getting location…' : shared ? 'Location shared' : 'Share location'}
      </button>
      <span className="cust-composer-note" aria-live="polite">
        {shared ? (usedDemo ? '(demo location)' : '') : 'Shares a demo spot near the order'}
      </span>
      {shared ? null : (
        <button type="button" className="cust-link" disabled={busy} onClick={() => void share(true)}>
          Use my real location instead
        </button>
      )}
    </div>
  )
}
