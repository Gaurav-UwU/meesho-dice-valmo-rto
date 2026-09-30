import 'leaflet/dist/leaflet.css'
import { memo, useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Hub } from '../../engine/types.ts'
import { MARKER_COLORS, type Bounds, type MarkerDatum } from './markers.ts'
import { MapLegend } from './MapLegend.tsx'

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

interface StopMarkerProps extends Omit<MarkerDatum, 'flagged'> {
  readonly onSelect: (id: string) => void
}

/** Takes plain values so React skips every marker whose look did not change. */
const StopMarker = memo(function StopMarker({ id, lat, lng, radius, fill, fillOpacity, ring, ringWeight, label, onSelect }: StopMarkerProps) {
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng])
  const handlers = useMemo(() => ({ click: () => onSelect(id) }), [id, onSelect])
  return (
    <CircleMarker
      center={center}
      radius={radius}
      pathOptions={{ color: ring, weight: ringWeight, fillColor: fill, fillOpacity, opacity: 1 }}
      eventHandlers={handlers}
    >
      <Tooltip direction="top" offset={[0, -6]}>
        {label}
      </Tooltip>
    </CircleMarker>
  )
})

const FIT_OPTIONS: { readonly padding: [number, number] } = { padding: [28, 28] }

/**
 * Leaflet does not notice when its box changes size without a window resize (the side panel grows), so tell it.
 * If the map was mounted while its box was still empty (hidden tab, slow layout), fit the catchment once it has a size.
 */
function MapAutoResize({ bounds }: { readonly bounds: Bounds }) {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    let fitted = el.clientWidth > 0 && el.clientHeight > 0
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
      if (!fitted && el.clientWidth > 0 && el.clientHeight > 0) {
        fitted = true
        map.fitBounds(bounds, FIT_OPTIONS)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [map, bounds])
  return null
}

interface LiveMapProps {
  readonly hub: Hub
  readonly markers: readonly MarkerDatum[]
  readonly bounds: Bounds
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}

export function LiveMap({ hub, markers, bounds, selectedId, onSelect }: LiveMapProps) {
  const selected = selectedId ? markers.find((m) => m.id === selectedId) : undefined
  return (
    <section className="ops-card ops-map-card" aria-label="Live map of today's orders">
      <div className="ops-card-head">
        <h2>Live map</h2>
        <span className="ops-muted">Click a dot to open the order. Purple ring = Bonus-Eligible.</span>
      </div>
      <MapContainer
        key={hub.id}
        className="ops-map"
        bounds={bounds}
        boundsOptions={FIT_OPTIONS}
        preferCanvas
        scrollWheelZoom={false}
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
        <MapAutoResize bounds={bounds} />
        {markers.map((m) => (
          <StopMarker
            key={`${m.id}:${m.flagged ? 'f' : 'n'}`}
            id={m.id}
            lat={m.lat}
            lng={m.lng}
            radius={m.radius}
            fill={m.fill}
            fillOpacity={m.fillOpacity}
            ring={m.ring}
            ringWeight={m.ringWeight}
            label={m.label}
            onSelect={onSelect}
          />
        ))}
        {selected ? (
          <CircleMarker
            key={`sel-${selected.id}`}
            center={[selected.lat, selected.lng]}
            radius={selected.radius + 7}
            interactive={false}
            pathOptions={{ color: MARKER_COLORS.hub, weight: 2, dashArray: '4 3', fill: false }}
          />
        ) : null}
        <CircleMarker
          center={[hub.lat, hub.lng]}
          radius={10}
          pathOptions={{ color: MARKER_COLORS.white, weight: 3, fillColor: MARKER_COLORS.hub, fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -8]} permanent>
            {hub.name}
          </Tooltip>
        </CircleMarker>
      </MapContainer>
      <MapLegend />
    </section>
  )
}
