import { MARKER_COLORS } from './markers.ts'

interface Item {
  readonly label: string
  readonly fill: string
  readonly ring?: string
  readonly size: number
}

const ITEMS: readonly Item[] = [
  { label: 'Hub', fill: MARKER_COLORS.hub, size: 14 },
  { label: 'Order', fill: MARKER_COLORS.neutral, size: 8 },
  { label: 'Bonus-Eligible', fill: '#D9C5FC', ring: MARKER_COLORS.flagged, size: 14 },
  { label: 'Delivered', fill: MARKER_COLORS.delivered, size: 10 },
  { label: 'Attempted', fill: MARKER_COLORS.attempted, size: 10 },
  { label: 'Refused', fill: MARKER_COLORS.refused, size: 10 },
  { label: 'OTP sent', fill: MARKER_COLORS.otp, size: 10 },
  { label: 'Rescheduled', fill: MARKER_COLORS.muted, size: 10 },
  { label: 'Suspect attempt', fill: MARKER_COLORS.attempted, ring: MARKER_COLORS.suspect, size: 14 },
]

export function MapLegend() {
  return (
    <ul className="ops-legend" aria-label="Map legend">
      {ITEMS.map((it) => (
        <li key={it.label}>
          <span
            className="ops-legend-dot"
            aria-hidden="true"
            style={{ width: it.size, height: it.size, background: it.fill, borderColor: it.ring ?? '#fff', borderWidth: it.ring ? 3 : 1 }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  )
}
