import { useState } from 'react'
import { DEFAULT_HUB } from '../../ui/hub.ts'
import { DEMO_STEPS } from './content.ts'
import { useDay } from '../../store/StoreContext.tsx'
import { loadProgress, loadProgressDay, reconcileProgress, saveProgress, saveProgressDay, toggleStep } from './progress.ts'

const deep = (route: string): string => `${route}?hub=${DEFAULT_HUB}`
const IDS = DEMO_STEPS.map((s) => s.id)

/** The eight-step demo, one step at a time. Ticking a step off is remembered in this browser. */
export function Walkthrough() {
  const dayId = useDay(DEFAULT_HUB)?.dayId
  const [done, setDone] = useState<readonly string[]>(() => loadProgress(IDS))
  const [forDay, setForDay] = useState<string | undefined>(loadProgressDay)
  // The ticks belong to a day: when someone resets it (on this device or another), the old ticks go too.
  if (dayId && dayId !== forDay) {
    const next = reconcileProgress(forDay, dayId, done)
    setForDay(dayId)
    saveProgressDay(dayId)
    if (next.done !== done) {
      setDone(next.done)
      saveProgress(next.done)
    }
  }
  const total = DEMO_STEPS.length
  const nextId = DEMO_STEPS.find((s) => !done.includes(s.id))?.id

  const toggle = (id: string): void => {
    const next = toggleStep(done, id)
    setDone(next)
    saveProgress(next)
  }
  const restart = (): void => {
    setDone([])
    saveProgress([])
  }

  return (
    <section id="walkthrough" className="land-walk" aria-labelledby="land-walk-h">
      <div className="land-walk-head">
        <h2 id="land-walk-h">The walkthrough</h2>
        <div className="land-progress">
          <div className="land-progress-track" role="progressbar" aria-label="Demo progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done.length} aria-valuetext={`${done.length} of ${total} steps done`}>
            <span style={{ width: `${(done.length / total) * 100}%` }} />
          </div>
          <span className="land-progress-text">
            {done.length} of {total} done
          </span>
          {done.length > 0 ? (
            <button type="button" className="land-linkbtn" onClick={restart}>
              Clear ticks
            </button>
          ) : null}
        </div>
      </div>

      <ol className="land-steps">
        {DEMO_STEPS.map((step, i) => {
          const isDone = done.includes(step.id)
          const isNext = step.id === nextId
          return (
            <li key={step.id} className={`land-step${isDone ? ' is-done' : ''}${isNext ? ' is-next' : ''}`}>
              <span className="land-step-num" aria-hidden="true">
                {isDone ? (
                  <svg viewBox="0 0 20 20" width="18" height="18" focusable="false">
                    <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <div className="land-step-card">
                <h3>
                  {step.title}
                  {isNext ? <span className="land-next">You are here</span> : null}
                </h3>
                <p className="land-do">
                  <span className="land-label">Do</span>
                  {step.doThis}
                </p>
                <p className="land-see">
                  <span className="land-label">See</span>
                  {step.see}
                </p>
                <div className="land-step-actions">
                  {step.links.map((l) => (
                    <a key={l.label} className="land-btn land-btn--small" href={deep(l.route)} target="_blank" rel="noopener noreferrer">
                      {l.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ))}
                  <label className="land-check">
                    <input type="checkbox" checked={isDone} aria-label={`Mark step ${i + 1} done: ${step.title}`} onChange={() => toggle(step.id)} />
                    <span aria-hidden="true">Done</span>
                  </label>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      {done.length === total ? (
        <p className="land-finish" role="status">
          That is the whole loop: flag, deliver, pay, decide. The full pilot simulator has more sliders if you want to keep going.
        </p>
      ) : null}
    </section>
  )
}
