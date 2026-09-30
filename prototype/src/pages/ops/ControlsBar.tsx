import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clockText } from '../../domain/clock.ts'
import { kpis } from '../../domain/selectors.ts'
import type { DayState } from '../../domain/types.ts'
import { useDayControls, useSend } from '../../store/StoreContext.tsx'
import { autopilotRemaining } from './model.ts'
import { useAutopilotLoop } from './useAutopilotLoop.ts'

const STEP_SIZE = 50

export function ControlsBar({ state }: { readonly state: DayState }) {
  const hubId = state.hub.id
  const send = useSend(hubId)
  const { autopilot, reset } = useDayControls(hubId)
  const [confirming, setConfirming] = useState(false)
  const [closing, setClosing] = useState(false)
  const { auto, reserved } = autopilotRemaining(state)
  const hasWork = state.started && auto > 0
  const loop = useAutopilotLoop(hasWork, autopilot)
  const k = kpis(state)
  const waiting = k.rescheduled + k.attempted

  const handleReset = (): void => {
    setConfirming(false)
    void reset()
  }
  const handleClose = (): void => {
    setClosing(false)
    if (loop.active) loop.toggle()
    void send({ type: 'closePilot' })
  }

  return (
    <section className="ops-card ops-controls" aria-label="Day controls">
      <div className="ops-controls-row">
        <button type="button" className="btn primary" disabled={state.started} onClick={() => void send({ type: 'startDay' })}>
          {state.started ? 'Day started' : 'Start day'}
        </button>
        <button
          type="button"
          className={`btn ops-autopilot${loop.active ? ' is-on' : ''}`}
          aria-pressed={loop.active}
          disabled={!hasWork && !loop.active}
          onClick={loop.toggle}
        >
          <span className="ops-autopilot-dot" aria-hidden="true" />
          {loop.active ? 'Autopilot: running' : 'Autopilot'}
        </button>
        <button type="button" className="btn" disabled={!hasWork} onClick={() => void autopilot(STEP_SIZE)}>
          Step +{STEP_SIZE}
        </button>
        <span className="ops-clock" role="timer" aria-label="Simulated time">
          <span className="ops-clock-label">Sim time</span>
          <strong>{clockText(state.simNow)}</strong>
        </span>
        <button type="button" className="btn" disabled={!state.started} title="Move the sim clock on one hour and fire every timer that is due" onClick={() => void send({ type: 'advanceClock', minutes: 60 })}>
          +1 h
        </button>
        <button
          type="button"
          className="btn"
          disabled={!state.started}
          title="Jump to 08:00 tomorrow: rescheduled orders return, failed attempts are retried once (or closed as RTO), 24 h and 48 h timers fire"
          onClick={() => void send({ type: 'advanceDay' })}
        >
          +1 day{waiting > 0 ? ` (${waiting})` : ''}
        </button>
        <button type="button" className="btn" disabled={!state.started} title="Riders hand their cash in (normally at 20:00): COD bonuses become pending" onClick={() => void send({ type: 'reconcileCod' })}>
          Reconcile cash
        </button>
        {closing ? (
          <span className="ops-confirm" role="group" aria-label="Confirm close pilot">
            <span>Work every open order, run the Desk, and skip past every window?</span>
            <button type="button" className="btn primary" onClick={handleClose}>
              Yes, close the pilot
            </button>
            <button type="button" className="btn" onClick={() => setClosing(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" className="btn" disabled={!state.started} onClick={() => setClosing(true)}>
            Close pilot
          </button>
        )}
        <span className="ops-controls-spacer" />
        <Link className="btn" to={`/audit?hub=${hubId}`}>
          Audit
        </Link>
        {confirming ? (
          <span className="ops-confirm" role="group" aria-label="Confirm reset">
            <span>Throw away today and start fresh?</span>
            <button type="button" className="btn danger" onClick={handleReset}>
              Yes, reset
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" className="btn danger" onClick={() => setConfirming(true)}>
            Reset day
          </button>
        )}
      </div>
      <p className="ops-helper" aria-live="polite">
        {!state.started
          ? "Press Start day to score today's orders and flag the top 20%."
          : `${auto} stops left for autopilot${reserved > 0 ? ` · ${reserved} held back for the live demo (drive them from /rider)` : ''}. Timers run on the sim clock: OTP 10 min, second chance 24 h, hold 48 h, exception 24 h, return window 7 days.`}
      </p>
    </section>
  )
}
