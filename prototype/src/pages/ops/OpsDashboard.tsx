import { useCallback, useMemo, useState } from 'react'
import { attemptRecords, kpis, stopsOf } from '../../domain/selectors.ts'
import { dayHeadline, dayVerdict } from '../../domain/verdictData.ts'
import type { DayState } from '../../domain/types.ts'
import { ArmCard } from './ArmCard.tsx'
import { ControlsBar } from './ControlsBar.tsx'
import { ExceptionQueue } from './ExceptionQueue.tsx'
import { MoneyLedger } from './MoneyLedger.tsx'
import { EventFeed } from './EventFeed.tsx'
import { KpiRow } from './KpiRow.tsx'
import { LiveMap } from './LiveMap.tsx'
import { buildMarkerData, catchmentBounds } from './markers.ts'
import { rankScores, rosterRows } from './model.ts'
import { OrderPanel } from './OrderPanel.tsx'
import { RiderRoster } from './RiderRoster.tsx'

/** Everything below the header. Rendered from `state` alone; remount it (key) when the hub changes. */
export function OpsDashboard({ state }: { readonly state: DayState }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const select = useCallback((id: string | null) => setSelectedId(id), [])

  const stops = useMemo(() => stopsOf(state), [state])
  const k = useMemo(() => kpis(state), [state])
  const verdict = useMemo(() => dayVerdict(state), [state])
  const headline = useMemo(() => dayHeadline(state, verdict), [state, verdict])
  const markers = useMemo(() => buildMarkerData(stops), [stops])
  const ranks = useMemo(() => rankScores(state), [state])
  const roster = useMemo(() => rosterRows(state), [state])
  const records = useMemo(() => attemptRecords(state), [state])
  const flaggedIds = useMemo(
    () =>
      stops
        .filter((x) => x.flagged)
        .map((x) => x.order.id)
        .sort((a, b) => (ranks.get(a) ?? 0) - (ranks.get(b) ?? 0)),
    [stops, ranks],
  )
  // The map fits the catchment once, when it mounts for a hub. Later pin moves must not re-zoom it mid-demo.
  const [bounds] = useState(() => catchmentBounds(stops, state.hub))

  return (
    <main className="ops-main">
      <ControlsBar state={state} />
      <KpiRow kpis={k} />
      <div className="ops-split">
        <LiveMap hub={state.hub} markers={markers} bounds={bounds} selectedId={selectedId} onSelect={select} />
        <div className="ops-stack">
          <OrderPanel state={state} selectedId={selectedId} ranks={ranks} flaggedIds={flaggedIds} onSelect={select} />
          <ArmCard kpis={k} verdict={verdict} headline={headline} />
        </div>
      </div>
      <RiderRoster rows={roster} records={records} hubId={state.hub.id} />
      <div className="ops-pair">
        <ExceptionQueue state={state} onSelect={select} />
        <EventFeed feed={state.feed} onSelect={select} />
      </div>
      <MoneyLedger state={state} />
      <p className="ops-strip">
        <strong>Real vs simulated:</strong> Orders, riders and outcomes are synthetic. Rescue Score uses a labelled TrustMesh stand-in. The bonus effect shown here is the
        Bonus-vs-Control gap on synthetic orders; the link from ₹15 to rider effort is assumed, not measured.
      </p>
    </main>
  )
}
