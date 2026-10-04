import { activeCount, riderStep } from '../../domain/captain.ts'
import { strikeView } from '../../domain/captainView.ts'
import type { DayState } from '../../domain/types.ts'
import type { Rider } from '../../engine/types.ts'
import { useSend } from '../../store/StoreContext.tsx'
import { REASON_KEY } from './captainText.ts'
import type { Translate } from './i18n.ts'

interface Props {
  readonly state: DayState
  readonly rider: Rider
  readonly t: Translate
}

const LADDER_KEY = { warning: 'ladder1', enhanced: 'ladder2', suspended: 'ladder3' } as const

/**
 * What the rider sees about their own strikes: a meter (3 pips), the ladder text for where they are, every strike with its reason, and a
 * button to ask for a review. Shown to riders in BOTH arms: fake-attempt control has nothing to do with the bonus.
 */
export function StrikeMeter({ state, rider, t }: Props) {
  const send = useSend(state.hub.id)
  const mine = state.strikeLog.filter((k) => k.riderId === rider.id)
  const count = activeCount(state, rider.id)
  const step = riderStep(state, rider.id)
  return (
    <section className="rider-strikes" aria-label={t('strikeTitle')}>
      <div className="rider-strikes-head">
        <strong>{t('strikeTitle')}</strong>
        <span className="rider-pips" role="img" aria-label={`${Math.min(count, 3)} / 3`}>
          {[0, 1, 2].map((i) => (
            <i key={i} className={i < count ? 'is-on' : undefined} />
          ))}
        </span>
      </div>
      <p className="rider-strike-ladder">{step === 'clear' ? t('noStrikes') : t(LADDER_KEY[step])}</p>
      {mine.length > 0 ? (
        <ul className="rider-strike-list">
          {mine.map((k) => {
            const v = strikeView(state, k)
            return (
              <li key={k.id}>
                <span>
                  {t('reasonLabel')}: {t(REASON_KEY[k.reason])}
                  {v.state === 'overturned' ? <em className="rider-strike-tag is-ok"> · {t('strikeOverturned')}</em> : null}
                  {v.state === 'expired' ? <em className="rider-strike-tag"> · {t('strikeExpired')}</em> : null}
                  {v.state === 'active' ? <em className="rider-strike-tag"> · {v.daysLeft} {t('daysLeft')}</em> : null}
                </span>
                {v.state === 'active' ? (
                  k.reviewAskedSim === undefined ? (
                    <button type="button" className="rider-act" onClick={() => void send({ type: 'riderAskReview', strikeId: k.id })}>
                      {t('askReview')}
                    </button>
                  ) : (
                    <small>{t('reviewAsked')}</small>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
