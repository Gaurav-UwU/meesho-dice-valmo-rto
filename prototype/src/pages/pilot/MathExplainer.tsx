import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildMathSections, toPlainText, type Source } from './mathSteps.ts'
import type { Controls, PilotView } from './pilotModel.ts'
import './mathexplainer.css'

const SOURCE_LABEL: Readonly<Record<Source, string>> = {
  'data pack': 'Data pack',
  'our model': 'Our model',
  assumption: 'Assumption',
  simulated: 'Simulated',
}

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface Props {
  readonly controls: Controls
  readonly view: PilotView
}

/** A button on the Pilot page that opens the complete maths, every step with the numbers currently on screen. */
export function MathExplainer({ controls, view }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const sections = useMemo(() => (open ? buildMathSections(controls, view) : []), [open, controls, view])

  const close = useCallback((): void => {
    setOpen(false)
    setCopied(false)
    trigger.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('.pilot-math-close')?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, close])

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(toPlainText(sections))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const jump = (id: string): void => {
    panel.current?.querySelector<HTMLElement>(`#pilot-math-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <button ref={trigger} type="button" className="pilot-math-open" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span aria-hidden="true">ƒ</span> How the maths works
      </button>
      {open ? (
        <div className="pilot-math-backdrop" role="presentation" onClick={close}>
          <div
            ref={panel}
            className="pilot-math-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pilot-math-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="pilot-math-head">
              <div>
                <h2 id="pilot-math-title">How the maths works</h2>
                <p>Every step from “who gets the bonus” to “rupees a year”, with the numbers currently on your screen. Change a slider and reopen to see it update.</p>
              </div>
              <div className="pilot-math-actions">
                <button type="button" className="pilot-math-copy" onClick={() => void copy()}>
                  {copied ? 'Copied' : 'Copy as text'}
                </button>
                <button type="button" className="pilot-math-close" onClick={close} aria-label="Close the maths explanation">
                  ✕
                </button>
              </div>
            </header>
            <div className="pilot-math-body">
              <nav className="pilot-math-toc" aria-label="Sections">
                <ol>
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => jump(s.id)}>
                        {s.heading.replace(/^\d+\.\s*/, '')}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="pilot-math-content">
                {sections.map((s) => (
                  <section key={s.id} id={`pilot-math-${s.id}`} aria-labelledby={`pilot-math-h-${s.id}`}>
                    <h3 id={`pilot-math-h-${s.id}`}>{s.heading}</h3>
                    <p className="pilot-math-intro">{s.intro}</p>
                    {s.steps.map((st) => (
                      <article key={st.id} className="pilot-math-step">
                        <div className="pilot-math-step-top">
                          <h4>{st.title}</h4>
                          <span className={`pilot-math-tag is-${st.source.replace(' ', '-')}`}>{SOURCE_LABEL[st.source]}</span>
                        </div>
                        <p>{st.plain}</p>
                        {st.formula !== '—' ? (
                          <dl>
                            <dt>Formula</dt>
                            <dd className="pilot-math-formula">{st.formula}</dd>
                            <dt>With your numbers</dt>
                            <dd className="pilot-math-working">{st.working}</dd>
                          </dl>
                        ) : null}
                        <p className="pilot-math-result">
                          <span>Result</span> {st.result}
                        </p>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
