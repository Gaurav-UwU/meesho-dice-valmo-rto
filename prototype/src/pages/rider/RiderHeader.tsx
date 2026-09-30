import type { Rider } from '../../engine/types.ts'
import type { Lang, Translate } from './i18n.ts'

interface Props {
  readonly rider: Rider
  readonly lang: Lang
  readonly t: Translate
  readonly onLang: (lang: Lang) => void
  readonly onSwitch: () => void
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export function RiderHeader({ rider, lang, t, onLang, onSwitch }: Props) {
  return (
    <header className="rider-header">
      <div className="rider-avatar" aria-hidden="true">
        {initials(rider.name)}
      </div>
      <div className="rider-header-text">
        <h1>{t('title')}</h1>
        <p>
          {rider.name} · {rider.id}
        </p>
      </div>
      <div className="rider-lang" role="group" aria-label="Language">
        <button type="button" aria-pressed={lang === 'en'} onClick={() => onLang('en')}>
          EN
        </button>
        <button type="button" aria-pressed={lang === 'hi'} onClick={() => onLang('hi')} lang="hi">
          हिंदी
        </button>
      </div>
      <button type="button" className="rider-switch" onClick={onSwitch} aria-label={t('switchRider')} title={t('switchRider')}>
        ⇄
      </button>
    </header>
  )
}
