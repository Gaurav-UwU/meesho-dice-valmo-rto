import { Fragment, useState, type ReactNode } from 'react'
import { useDay } from '../store/StoreContext.tsx'
import { useHubParam } from './hub.ts'

/**
 * Wraps a screen so that when the day is reset (by this device or another) the screen starts over: open sheets, typed OTPs, a picked
 * order, a running Autopilot and confirm prompts all belong to the old day and are dropped with it. The first day a screen sees does not
 * restart it; only a later, different day does.
 */
export function ByDay({ children }: { readonly children: ReactNode }) {
  const { hub } = useHubParam()
  const dayId = useDay(hub.id)?.dayId
  const [known, setKnown] = useState<string | undefined>(undefined)
  const [epoch, setEpoch] = useState(0)
  if (dayId && dayId !== known) {
    setKnown(dayId)
    if (known !== undefined) setEpoch((e) => e + 1)
  }
  return <Fragment key={`${hub.id}:${epoch}`}>{children}</Fragment>
}
