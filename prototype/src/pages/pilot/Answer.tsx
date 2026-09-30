import type { OutcomeOdds, PilotResult, Verdict } from '../../engine/pilot.ts'
import { pct } from '../../ui/format.ts'
import { Fairness } from './Fairness.tsx'
import { plainVerdict } from './plainVerdict.ts'
import { RangeDiagram } from './RangeDiagram.tsx'

const TONE: Readonly<Record<Verdict, string>> = { GO: 'is-go', 'RE-PRICE': 'is-reprice', KILL: 'is-kill', INVALID: 'is-invalid', INCOMPLETE: 'is-nodata' }
const ODDS: readonly ('GO' | 'RE-PRICE' | 'KILL')[] = ['GO', 'RE-PRICE', 'KILL']

interface Props {
  readonly result: PilotResult
  readonly odds: OutcomeOdds
  readonly replicates: number
}

/** Step 2: the decision in words, the picture of why, and how often luck would change it. The rulebook is folded away. */
export function Answer({ result, odds, replicates }: Props) {
  const v = result.verdictResult
  const plain = plainVerdict(v)
  const word = result.insufficientData ? 'NO DATA' : result.verdict
  const changed = v.currentHash !== v.plannedHash
  const showPicture = !result.insufficientData && result.verdict !== 'INCOMPLETE' && result.verdict !== 'INVALID'
  return (
    <section className={`pilot-card pilot-answer ${result.insufficientData ? 'is-nodata' : TONE[result.verdict]}`} aria-label="Pilot verdict" aria-live="polite">
      <h2>
        <span className="pilot-stepnum">2</span> What the pilot would say
      </h2>
      <div className="pilot-answer-head">
        <strong className="pilot-verdict-word">{word}</strong>
        <div>
          <p className="pilot-answer-title">{result.insufficientData ? 'No data' : plain.title}</p>
          <p className="pilot-answer-sentence">{result.insufficientData ? result.reason : plain.sentence}</p>
          {result.insufficientData ? null : (
            <p className="pilot-answer-next">
              <b>Next:</b> {plain.next}
            </p>
          )}
          {result.borderline ? <span className="pilot-badge">Close call: more data could flip this</span> : null}
          {changed ? (
            <p className="pilot-answer-next">
              Rule locked when planned <code>{v.plannedHash}</code>, judged by a different rule now <code>{v.currentHash}</code>.
            </p>
          ) : null}
        </div>
      </div>

      {result.insufficientData ? null : <Fairness fairness={result.fairness} />}

      {showPicture ? <RangeDiagram estimate={result.pooled.upliftPer100} ci={result.pooled.ci95} breakEven={v.breakEven} killFloor={v.killFloor} /> : null}

      <div className="pilot-luck">
        <p className="pilot-luck-title">If we ran this same pilot {replicates} times, luck alone would give:</p>
        <div className="pilot-stack" aria-hidden="true">
          {ODDS.map((label) =>
            odds[label] > 0 ? <span key={label} className={`pilot-stack-part ${TONE[label]}`} style={{ width: `${odds[label] * 100}%` }} /> : null,
          )}
        </div>
        <ul className="pilot-luck-legend" aria-label="How often each verdict would come up">
          {ODDS.map((label) => (
            <li key={label}>
              <i className={TONE[label]} aria-hidden="true" /> {label} <strong>{pct(odds[label], 0)}</strong>
            </li>
          ))}
        </ul>
      </div>

      <details className="pilot-more">
        <summary>
          <span>How we decide</span>
          <em>the rule, fixed before the pilot</em>
        </summary>
        <ul className="pilot-rules" aria-label="Decision rule">
          <li>
            <b>GO</b> the worst case we can&apos;t rule out still pays for itself (at least +{v.breakEven.toFixed(1)} extra deliveries per 100)
          </li>
          <li>
            <b>RE-PRICE</b> it probably helps, but that isn&apos;t proven
          </li>
          <li>
            <b>KILL</b> it helps less than +{v.killFloor} per 100, or a safety rule breaks
          </li>
          <li>
            <b>Not enough data</b> fewer than 6 pairs of riders, or under 90% of orders finished
          </li>
          <li>
            <b>Not usable</b> the rule was changed after planning
          </li>
        </ul>
        <p className="pilot-note">
          Rule locked when the pilot was planned: <code>{v.plannedHash}</code>. Smallest effect it can detect:{' '}
          {Number.isFinite(v.mdePer100) ? `${v.mdePer100.toFixed(1)} per 100` : '—'}. Pairs of riders: {v.pairs}. The range is worked out pair by pair: for each pair,
          the bonus rider&apos;s delivery rate minus their partner&apos;s, then the average of those gaps. &quot;How the maths works&quot; has the details.
        </p>
      </details>
    </section>
  )
}
