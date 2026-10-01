import { Link } from 'react-router-dom'
import { headlineSentence, type CausalHeadline } from '../../engine/headline.ts'
import type { VerdictResult } from '../../engine/verdict.ts'
import type { ArmRate, Kpis } from '../../domain/selectors.ts'
import { pct } from '../../ui/format.ts'

const TONE: Readonly<Record<VerdictResult['verdict'], string>> = {
  GO: 'is-go',
  'RE-PRICE': 'is-reprice',
  KILL: 'is-kill',
  INVALID: 'is-invalid',
  INCOMPLETE: 'is-incomplete',
}

function ArmBar({ label, arm, tone }: { readonly label: string; readonly arm: ArmRate; readonly tone: 'bonus' | 'control' }) {
  return (
    <div className="ops-arm">
      <div className="ops-arm-top">
        <span>{label}</span>
        <strong>{arm.settled === 0 ? '—' : pct(arm.settledRate)}</strong>
      </div>
      <div className="ops-arm-track" role="img" aria-label={`${label}: ${arm.delivered} of ${arm.settled} attempted flagged orders delivered so far`}>
        <span className={`ops-arm-fill is-${tone}`} style={{ width: `${arm.settledRate * 100}%` }} />
      </div>
      <div className="ops-muted">
        {arm.delivered} of {arm.settled} attempted flagged orders delivered so far · {arm.open} of {arm.n} not final yet
      </div>
    </div>
  )
}

const attemptsText = (who: string, rate: number | undefined, attempts: number): string =>
  `${who}: ${Math.round((rate ?? 0) * attempts)} of ${attempts} attempt${attempts === 1 ? '' : 's'} looks fake`

/**
 * The second safety rule in numbers, for BOTH arms: it stops the pilot only when Bonus riders' suspected fake rate is more than 2 points above
 * Control's, because a fake rate both arms share is not something the bonus caused.
 */
function FakeAttemptCheck({ reading, limitPts }: { readonly reading: VerdictResult['fakeAttempts']; readonly limitPts: number }) {
  if (reading === undefined) return null
  const { attempts = 0, controlAttempts = 0, suspectedRate, controlRate, strikes, enough, excessPts } = reading
  return (
    <p className="ops-note">
      <strong>Fake-attempt check:</strong>{' '}
      {attempts === 0 && controlAttempts === 0
        ? 'no attempts logged yet. '
        : `${attemptsText('Bonus riders', suspectedRate, attempts)}; ${attemptsText('Control riders', controlRate, controlAttempts)} (${strikes} confirmed). ${
            excessPts === undefined ? '' : `Bonus is ${excessPts >= 0 ? '+' : '−'}${Math.abs(excessPts).toFixed(1)} points against Control. `
          }`}
      The pilot stops only if Bonus riders run more than {limitPts} points above Control, and it cannot judge until each arm has logged 30 attempts.
      {enough ? '' : ' Not enough attempts yet.'}
    </p>
  )
}

/** Returns are WATCHED: shown, Bonus against Control, but they never stop the pilot (no KILL comes from them). */
function ReturnsWatch({ returns }: { readonly returns: Kpis['returns'] }) {
  const part = (who: string, r: Kpis['returns']['bonus']): string => `${who}: ${r.returned} of ${r.delivered} delivered flagged orders returned (${r.share === undefined ? '—' : pct(r.share)})`
  const none = returns.bonus.delivered === 0 && returns.control.delivered === 0
  return (
    <p className="ops-note">
      <strong>Returns (watched):</strong> {none ? 'nothing delivered yet. ' : `${part('Bonus riders', returns.bonus)}; ${part('Control riders', returns.control)}. `}
      Watched in the real pilot, not a stop rule: a bonus that pushed false deliveries would show up here.
    </p>
  )
}

interface Props {
  readonly kpis: Kpis
  readonly verdict: VerdictResult
  readonly headline: CausalHeadline
}

/**
 * The same `verdict()` as /pilot, on today's orders. Every flagged order stays in its arm, whatever happens to it: open orders are
 * counted and shown, never dropped. It will usually say INCOMPLETE until most orders have a final outcome, which is the rule working.
 */
export function ArmCard({ kpis, verdict, headline }: Props) {
  const { flaggedBonus: b, flaggedControl: c } = kpis
  const ready = b.settled > 0 && c.settled > 0
  const diff = (b.settledRate - c.settledRate) * 100
  const provisional = verdict.verdict === 'INCOMPLETE'
  return (
    <section className="ops-card" aria-label="Bonus versus Control">
      <div className="ops-card-head">
        <h2>Bonus vs Control</h2>
        <span className="ops-muted">flagged orders only</span>
      </div>
      <div className={`ops-verdict ${TONE[verdict.verdict]}`} role="status" aria-label={`Verdict: ${verdict.verdict}`}>
        <strong>{verdict.verdict}</strong>
        <span>{verdict.reason}</span>
      </div>
      <ArmBar label="Bonus riders" arm={b} tone="bonus" />
      <ArmBar label="Control riders" arm={c} tone="control" />
      <p className="ops-diff">
        Difference so far:{' '}
        <strong className={ready && diff < 0 ? 'ops-bad' : 'ops-good'}>{ready ? `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)} points` : '—'}</strong>
        <span className="ops-muted"> (provisional: failed orders may still be rescued)</span>
      </p>
      <p className="ops-headline">
        {provisional ? <span className="ops-tag">Provisional</span> : null} {headlineSentence(headline)}
      </p>
      <p className="ops-note">
        Each Bonus rider is compared with an equally-skilled partner: {verdict.pairs} {verdict.pairs === 1 ? 'pair has' : 'pairs have'} finished flagged orders so far.
      </p>
      <FakeAttemptCheck reading={verdict.fakeAttempts} limitPts={verdict.fakeAttemptLimitPts} />
      <ReturnsWatch returns={kpis.returns} />
      <p className="ops-note">
        {verdict.mdeText} One synthetic day is a few dozen orders per arm, so even a GO here shows the rule working, not evidence that the bonus works. Every flagged order stays in its arm until it has a final outcome. The real answer comes from the 30-day pilot (
        <Link to="/pilot">/pilot</Link>).
      </p>
    </section>
  )
}
