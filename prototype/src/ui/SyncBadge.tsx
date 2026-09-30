import { useEffect, useId, useRef, useState } from 'react'
import { getHub } from '../engine/hubs.ts'
import type { HubId } from '../engine/types.ts'
import { useSyncInfo } from '../store/StoreContext.tsx'
import { describeSync } from '../store/syncText.ts'
import './sync.css'
import { useNow } from './useNow.ts'

interface Props {
  readonly hubId: HubId
  /** 'pill' = one line you can tap for the details; 'panel' = everything written out (the landing page) */
  readonly variant?: 'pill' | 'panel'
  /** Short words for a phone screen: the label and the day only */
  readonly compact?: boolean
}

/**
 * The one place that says whether this device shares its day with others: SYNCED (a shared day, with hub, day, version and when it last
 * changed) or ALONE (a private day on this device), plus OFFLINE and the problems that need a person. Never silent.
 */
export function SyncBadge({ hubId, variant = 'pill', compact = false }: Props) {
  const info = useSyncInfo(hubId)
  const now = useNow()
  const [open, setOpen] = useState(false)
  const popId = useId()
  const box = useRef<HTMLDivElement>(null)

  // The details close on a tap anywhere else or on Escape, so they never sit on top of a button.
  useEffect(() => {
    if (!open) return undefined
    const away = (e: Event): void => {
      if (box.current && e.target instanceof Node && !box.current.contains(e.target)) setOpen(false)
    }
    const esc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const hub = getHub(hubId)
  const city = hub.name.split(' · ')[0]
  const d = describeSync(info, city, now)
  const short = info.day ? `Day ${info.day.dayNo} · v${info.day.version}` : city

  const details = (
    <>
      <p>{d.detail}</p>
      {d.howToJoin ? (
        <p>
          <strong>{d.tone === 'alone' ? 'To join' : 'To fix'}:</strong> {d.howToJoin}
        </p>
      ) : null}
      {d.warnings.map((w) => (
        <p key={w} className="sync-warning">
          {w}
        </p>
      ))}
    </>
  )

  if (variant === 'panel') {
    return (
      <div className={`sync sync--${d.tone} sync--panel`} role="status" data-link={info.link}>
        <div className="sync-line">
          <span className="sync-dot" aria-hidden="true" />
          <strong className="sync-label">{d.label}</strong>
          <span className="sync-head">{d.headline}</span>
        </div>
        <div className="sync-body">{details}</div>
      </div>
    )
  }

  return (
    <div ref={box} className={`sync sync--${d.tone}${compact ? ' sync--compact' : ''}`} data-link={info.link}>
      <button type="button" className="sync-pill" aria-expanded={open} aria-controls={popId} title={d.headline} onClick={() => setOpen((v) => !v)}>
        <span className="sync-dot" aria-hidden="true" />
        <strong className="sync-label">{d.label}</strong>
        <span className="sync-head">{compact ? short : d.headline}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {d.label}: {d.headline}
      </span>
      {open ? (
        <div id={popId} className="sync-pop">
          {details}
        </div>
      ) : null}
    </div>
  )
}
