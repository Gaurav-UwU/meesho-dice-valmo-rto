import { useEffect } from 'react'
import type { Translate } from './i18n.ts'

interface Props {
  readonly t: Translate
  readonly onLog: (answered: boolean) => void
  readonly onClose: () => void
}

/**
 * The rider calls the customer from the task card. In a real rollout the call goes through Valmo's masked number; in the demo there is no
 * real call, no phone number and no tel: link. The rider says how it went, and the app logs the call (it is the attempt's call evidence).
 */
export function CallSheet({ t, onLog, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="rider-overlay" role="presentation" onClick={onClose}>
      <div className="rider-sheet" role="dialog" aria-modal="true" aria-labelledby="rider-call-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="rider-call-title">{t('callTitle')}</h2>
        <p className="rider-muted">{t('callMasked')}</p>
        <button type="button" className="rider-menu-item" onClick={() => onLog(true)}>
          {t('callAnswered')}
        </button>
        <button type="button" className="rider-menu-item" onClick={() => onLog(false)}>
          {t('callNoAnswer')}
        </button>
        <button type="button" className="rider-link-btn" onClick={onClose}>
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}
