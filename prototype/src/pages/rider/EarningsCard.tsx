import type { Earnings } from '../../domain/selectors.ts'
import { rupees } from '../../ui/format.ts'
import type { Translate } from './i18n.ts'

interface Props {
  readonly earnings: Earnings
  /** Bonus text is shown to Bonus-arm riders only. Control riders see base pay and nothing else. */
  readonly showBonus: boolean
  readonly t: Translate
}

export function EarningsCard({ earnings, showBonus, t }: Props) {
  return (
    <section className="rider-earn" aria-label={t('earnings')}>
      <div className="rider-earn-label">{t('earnings')}</div>
      <div className="rider-earn-amount">{rupees(earnings.base)}</div>
      {showBonus ? (
        <>
          <div className="rider-earn-bonus">
            + {rupees(earnings.bonusPending)} {t('bonusPending')}
          </div>
          {earnings.bonusReleased > 0 ? <div className="rider-earn-bonus">{rupees(earnings.bonusReleased)} released to you</div> : null}
          {earnings.bonusClawedBack > 0 ? (
            <div className="rider-earn-hold">{rupees(earnings.bonusClawedBack)} taken back (order returned)</div>
          ) : null}
          {earnings.bonusBlocked > 0 ? (
            <div className="rider-earn-hold">
              {rupees(earnings.bonusBlocked)} {t('onHold')}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
