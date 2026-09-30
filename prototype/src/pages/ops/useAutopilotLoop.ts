import { useCallback, useEffect, useState } from 'react'

const AUTOPILOT_INTERVAL_MS = 1500
const AUTOPILOT_BATCH = 20

/**
 * Runs `step(20)` every 1.5 s while the toggle is on and there is still work for the bots.
 * When the work runs out (or the day is reset) the toggle switches itself off.
 */
export function useAutopilotLoop(hasWork: boolean, step: (count: number) => Promise<void>): { readonly active: boolean; readonly toggle: () => void } {
  const [wanted, setWanted] = useState(false)
  // Out of work (or day reset): switch off here, during render, so it cannot restart by itself later.
  if (wanted && !hasWork) setWanted(false)
  const active = wanted && hasWork

  useEffect(() => {
    if (!active) return undefined
    const run = (): void => {
      step(AUTOPILOT_BATCH).catch(() => setWanted(false))
    }
    run()
    const id = window.setInterval(run, AUTOPILOT_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [active, step])

  const toggle = useCallback(() => setWanted((w) => !w), [])
  return { active, toggle }
}
