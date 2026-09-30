import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDay } from '../store/StoreContext.tsx'
import { Footer } from '../ui/Footer.tsx'
import { useHubParam } from '../ui/hub.ts'
import { PhoneFrame } from '../ui/PhoneFrame.tsx'
import './rider/rider.css'
import { RiderApp } from './rider/RiderApp.tsx'
import { RiderPicker } from './rider/RiderPicker.tsx'
import { StartDayShortcut } from './rider/StartDayShortcut.tsx'

const FRAME_LABEL = 'Rider phone (Valmo Pilot)'

/** Rider phone: a clone of Valmo Pilot "Today's Tasks". /rider?hub=lucknow&rider=<id> */
export default function Rider() {
  const { hub } = useHubParam()
  const state = useDay(hub.id)
  const [params, setParams] = useSearchParams()
  const rider = state?.riders.find((r) => r.id === params.get('rider'))

  const pick = (id: string | null): void => {
    const next = new URLSearchParams(params)
    if (id) next.set('rider', id)
    else next.delete('rider')
    setParams(next, { replace: true })
  }

  if (state && rider && state.started) {
    return (
      <PhoneFrame label={FRAME_LABEL}>
        <RiderApp state={state} hub={hub} rider={rider} onSwitch={() => pick(null)} />
      </PhoneFrame>
    )
  }

  let body: ReactNode
  if (!state) {
    body = <p className="rider-empty">Loading…</p>
  } else if (!rider) {
    body = (
      <>
        <RiderPicker state={state} onPick={pick} />
        {state.started ? null : <StartDayShortcut hubId={hub.id} />}
      </>
    )
  } else {
    body = (
      <div className="rider-empty-day">
        <p>No tasks yet. The ops team has not started the day.</p>
        <StartDayShortcut hubId={hub.id} />
        <button type="button" className="rider-link-btn" onClick={() => pick(null)}>
          Change rider
        </button>
      </div>
    )
  }

  return (
    <PhoneFrame label={FRAME_LABEL}>
      <div className="rider-root">
        <header className="rider-header">
          <div className="rider-header-text">
            <h1>Today's Tasks</h1>
            <p>{hub.name}</p>
          </div>
        </header>
        <div className="rider-scroll">
          {body}
          <Footer />
        </div>
      </div>
    </PhoneFrame>
  )
}
