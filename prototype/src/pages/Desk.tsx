import { useState } from 'react'
import { deskItems, deskSummary } from '../domain/selectors.ts'
import type { DayState } from '../domain/types.ts'
import { batchBySeller } from '../engine/router.ts'
import { useDay, useDayControls, useSend, useStore } from '../store/StoreContext.tsx'
import { Footer } from '../ui/Footer.tsx'
import { HubPicker } from '../ui/HubPicker.tsx'
import { useHubParam } from '../ui/hub.ts'
import { DeskDrawer } from './desk/DeskDrawer.tsx'
import { DeskSummary } from './desk/DeskSummary.tsx'
import { isDone } from './desk/lanes.ts'
import { ParcelCard } from './desk/ParcelCard.tsx'
import { RouterAssumptions } from './desk/RouterAssumptions.tsx'
import { BatchList, DoneList, EconomicsNote, LaneFour, type DoneEntry } from './desk/SidePanels.tsx'
import './desk/desk.css'

const AUTOPILOT_STOPS = 60

function doneEntries(day: DayState, items: ReturnType<typeof deskItems>): readonly DoneEntry[] {
  return items
    .filter((i) => isDone(i.record.state))
    .map((i) => {
      const riderId = i.record.rehomedStopId ? day.stops[i.record.rehomedStopId]?.riderId : undefined
      return { record: i.record, rider: day.riders.find((r) => r.id === riderId) }
    })
}

export default function Desk() {
  const { mode } = useStore()
  const { hub } = useHubParam()
  const day = useDay(hub.id)
  const send = useSend(hub.id)
  const { autopilot } = useDayControls(hub.id)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const runAutopilot = async (): Promise<void> => {
    setIsRunning(true)
    try {
      if (!day?.started) await send({ type: 'startDay' })
      await autopilot(AUTOPILOT_STOPS)
    } finally {
      setIsRunning(false)
    }
  }

  const items = day ? deskItems(day) : []
  const active = items.filter((i) => !isDone(i.record.state))
  const batches = batchBySeller(
    items
      .filter((i) => i.record.state === 'batched' || (i.record.state === 'queued' && i.decision.lane === 'consolidated_return'))
      .map((i) => i.record.parcel),
  )

  return (
    <div className="desk-root">
      <header className="desk-bar">
        <button
          type="button"
          className="desk-burger"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <h1>Refused Parcel Desk</h1>
        <div className="desk-bar-right">
          <HubPicker light />
          <span className="desk-demo-pill">{mode === 'demo' ? 'Demo mode' : 'Live mode'}</span>
        </div>
      </header>

      <div className="desk-body">
        <DeskDrawer hubName={hub.name} hubId={hub.id} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="desk-main">
          {!day ? (
            <p role="status">Loading the hub day...</p>
          ) : (
            <>
              <DeskSummary summary={deskSummary(day)} />
              {items.length === 0 ? (
                <section className="card desk-empty">
                  <p>No refused parcels yet. Refuse a parcel from the rider app (/rider) or let the ops console run Autopilot.</p>
                  <button type="button" className="btn primary" disabled={isRunning} onClick={() => void runAutopilot()}>
                    {isRunning ? 'Running...' : `Run autopilot (${AUTOPILOT_STOPS} stops)`}
                  </button>
                </section>
              ) : (
                <div className="desk-grid">
                  <section className="desk-queue" aria-label="Refused parcel queue">
                    <div className="desk-queue-head">
                      <h2>Queue ({active.length})</h2>
                      <button type="button" className="btn" disabled={isRunning} onClick={() => void runAutopilot()}>
                        {isRunning ? 'Running...' : `Run autopilot (${AUTOPILOT_STOPS} more stops)`}
                      </button>
                    </div>
                    {active.length === 0 ? <p className="desk-empty-line">Queue is clear. See Done today.</p> : null}
                    {active.map((item) => (
                      <ParcelCard key={item.record.id} item={item} send={send} simNow={day.simNow} secondChanceHours={day.router.secondChanceHours} holdHours={day.router.holdHours} />
                    ))}
                  </section>
                  <aside className="desk-side">
                    <DoneList entries={doneEntries(day, items)} />
                    <BatchList batches={batches} />
                    <RouterAssumptions day={day} send={send} />
                    <LaneFour />
                  </aside>
                </div>
              )}
              <EconomicsNote />
            </>
          )}
        </main>
      </div>
      <Footer />
    </div>
  )
}
