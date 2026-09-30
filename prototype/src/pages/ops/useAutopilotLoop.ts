import { useCallback, useEffect, useState } from 'react'

const AUTOPILOT_INTERVAL_MS = 1500
const AUTOPILOT_BATCH = 20

/**
 * Runs `step(20)` every 1.5 s while the toggle is on and there is still work for the bots.
 * When the work runs out, the day is reset, or a step comes back `false` (refused: the day changed under it, no admin token,
 * the server said no) the toggle switches itself off, so a stale device can never keep driving a new day.
 */
export function useAutopilotLoop(hasWork: boolean, step: (count: number) => Promise<boolean>): { readonly active: boolean; readonly toggle: () => void } {
  const [wanted, setWanted] = useState(false)
  // Out of work (or day reset): switch off here, during render, so it cannot restart by itself later.
  if (wanted && !hasWork) setWanted(false)
  const active = wanted && hasWork

  useEffect(() => {
    if (!active) return undefined
    const run = (): void => {
      step(AUTOPILOT_BATCH)
        .then((ok) => {
          if (!ok) setWanted(false)
        })
        .catch(() => setWanted(false))
    }
    run()
    const id = window.setInterval(run, AUTOPILOT_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [active, step])

  const toggle = useCallback(() => setWanted((w) => !w), [])
  return { active, toggle }
}
