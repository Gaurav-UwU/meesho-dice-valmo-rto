import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clockText } from '../../domain/clock.ts'
import { dayHeadline, dayVerdict } from '../../domain/verdictData.ts'
import { headlineSentence } from '../../engine/headline.ts'
import type { VerdictLabel } from '../../engine/verdict.ts'
import { useDay, useSend } from '../../store/StoreContext.tsx'
import { useHubParam } from '../../ui/hub.ts'
import { plainVerdict } from './plainVerdict.ts'
import { RangeDiagram } from './RangeDiagram.tsx'

const TONE: Readonly<Record<VerdictLabel, string>> = { GO: 'is-go', 'RE-PRICE': 'is-reprice', KILL: 'is-kill', INVALID: 'is-invalid', INCOMPLETE: 'is-nodata' }

interface Props {
  /** Flagged orders per arm in the 30-day simulation above, for the size comparison */
  readonly simulatedPerArm: number
}

/**
 * The day played on the Ops console (same browser), judged here with the same rule and drawn with the same range diagram.
 * One day is a few dozen flagged orders per arm, so it shows why a single day cannot decide.
 */
export function OpsDayCheck({ simulatedPerArm }: Props) {
  const { hub } = useHubParam()
  const day = useDay(hub.id)
  const send = useSend(hub.id)
  const [confirming, setConfirming] = useState(false)
  const verdict = useMemo(() => (day?.started ? dayVerdict(day) : undefined), [day])
  const headline = useMemo(() => (day && verdict ? dayHeadline(day, verdict) : undefined), [day, verdict])
  const incomplete = verdict?.verdict === 'INCOMPLETE'
  const finalPct = verdict ? Math.round(verdict.terminalShare * 100) : 0

  const finish = (): void => {
    setConfirming(false)
    void send({ type: 'closePilot' })
  }

  return (
    <section className="pilot-card pilot-opsday" aria-labelledby="pilot-opsday-h">
      <div className="pilot-opsday-head">
        <h2 id="pilot-opsday-h">Check today&apos;s Ops day</h2>
        <Link className="pilot-opsday-link" to={`/ops?hub=${hub.id}`}>
          Open the Ops console<span className="sr-only"> for {hub.name}</span>
        </Link>
      </div>

      {!day ? (
        <p className="pilot-note" role="status">
          Loading {hub.name}…
        </p>
      ) : !day.started || !verdict || !headline ? (
        <p className="pilot-note">No day on the Ops console yet for {hub.name}. Start one there, run Autopilot for a bit, then come back.</p>
      ) : (
        <>
          <p className="pilot-note pilot-opsday-lead">
            The day you played on Ops ({hub.name}, {clockText(day.simNow)}), judged by the same rule as the simulation above.
          </p>
          <div className={`pilot-opsday-verdict ${TONE[verdict.verdict]}`}>
            <strong className="pilot-opsday-word">{verdict.verdict}</strong>
            <span>{plainVerdict(verdict).sentence}</span>
          </div>
          {incomplete ? (
            <div className="pilot-opsday-progress">
              <div
                className="pilot-opsday-track"
                role="progressbar"
                aria-label="Flagged orders with a final outcome"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={finalPct}
                aria-valuetext={`${finalPct}% final, the rule needs 90%`}
              >
                <span style={{ width: `${finalPct}%` }} />
                <i style={{ left: '90%' }} aria-hidden="true" />
              </div>
              <p className="pilot-note">
                No range yet: only {finalPct}% of flagged orders have a final outcome, and the rule needs 90%. Early in a day only deliveries are final (failed
                orders wait for a retry), so a range now would look falsely perfect.
              </p>
            </div>
          ) : (
            <RangeDiagram estimate={verdict.upliftPer100} ci={verdict.ci95} breakEven={verdict.breakEven} killFloor={verdict.killFloor} />
          )}
          <dl className="pilot-mini">
            <div>
              <dt>Flagged orders final</dt>
              <dd>{finalPct}%</dd>
            </div>
            <div>
              <dt>Flagged orders per arm</dt>
              <dd>
                {Math.round((headline.bonusTerminal + headline.controlTerminal) / 2).toLocaleString('en-IN')}{' '}
                <small>vs {simulatedPerArm.toLocaleString('en-IN')} per arm in the 30-day simulation</small>
              </dd>
            </div>
            <div>
              <dt>Smallest effect it can detect</dt>
              <dd>{!incomplete && Number.isFinite(verdict.mdePer100) ? `${verdict.mdePer100.toFixed(0)} per 100` : '—'}</dd>
            </div>
          </dl>
          <p className="pilot-opsday-headline">
            {incomplete ? <span className="pilot-tag">Provisional</span> : null} {headlineSentence(headline)}
          </p>
          <div className="pilot-opsday-actions">
            {!incomplete ? null : confirming ? (
              <span role="group" aria-label="Confirm finishing the day">
                <span className="pilot-note">Work every open order, run the Desk, and skip past every window?</span>
                <button type="button" className="pilot-btn pilot-btn--primary" onClick={finish}>
                  Yes, finish it
                </button>
                <button type="button" className="pilot-btn" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" className="pilot-btn" onClick={() => setConfirming(true)}>
                Finish the day
              </button>
            )}
            <span className="pilot-note">One synthetic day shows the rule working, not evidence. It swings a lot from day to day; that is why the pilot runs 30 days.</span>
          </div>
        </>
      )}
    </section>
  )
}
