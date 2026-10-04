import { useEffect, useState } from 'react'
import type { EvidenceInput } from '../../domain/types.ts'
import type { AttemptClaim } from '../../engine/attempts.ts'
import type { Translate } from './i18n.ts'

interface Props {
  /** Calls the app logged on this order since it went out (read-only: the rider cannot type a number) */
  readonly calls: number
  readonly t: Translate
  readonly onCallNow: () => void
  readonly onPick: (claim: AttemptClaim, evidence: EvidenceInput | undefined) => void
  readonly onClose: () => void
}

const CLAIMS: readonly { readonly claim: AttemptClaim; readonly label: string }[] = [
  { claim: 'customer_unavailable', label: 'Customer unavailable' },
  { claim: 'reschedule_requested', label: 'Customer asked to reschedule' },
  { claim: 'address_not_found', label: 'Address not found' },
]

/** Simulated phone readings. A genuine attempt is 30 to 150 m from the address; the demo "fake" path is over 500 m. */
const genuineGps = (): number => 30 + Math.floor(Math.random() * 120)
const farGps = (): number => 600 + Math.floor(Math.random() * 900)

/**
 * The rider says why they could not deliver, and the phone backs it up: the GPS distance when they tap "I'm at the door",
 * the calls the app logged (made from the task card or with "Call now", never typed), and how long they waited. Strong evidence
 * (near the door, 2+ calls, 5+ minutes) is trusted; a pin far from the address opens an exception for the hub captain.
 */
export function AttemptSheet({ calls, t, onCallNow, onPick, onClose }: Props) {
  const [gps, setGps] = useState<number | null>(null)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // No call count is sent: the app counts the calls it logged.
  const evidence: EvidenceInput | undefined = gps === null ? undefined : { gpsDistM: gps, waitMin: wait }

  return (
    <div className="rider-overlay" role="presentation" onClick={onClose}>
      <div className="rider-sheet" role="dialog" aria-modal="true" aria-labelledby="rider-attempt-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="rider-attempt-title">Why could you not deliver?</h2>
        <p className="rider-muted">The customer will be asked on WhatsApp to confirm this.</p>
        <div className="rider-evidence" role="group" aria-label="Proof you tried">
          <div className="rider-evidence-row">
            <button type="button" className="rider-chipbtn" onClick={() => setGps(genuineGps())}>
              I&apos;m at the door
            </button>
            <span>{gps === null ? 'GPS not logged' : `${gps} m from the address`}</span>
          </div>
          <div className="rider-evidence-row">
            <button type="button" className="rider-chipbtn" onClick={onCallNow}>
              {t('callNow')}
            </button>
            <span>{(calls === 1 ? t('callLoggedOne') : t('callsLogged')).replace('{n}', String(calls))}</span>
          </div>
          <div className="rider-evidence-row">
            <button type="button" className="rider-chipbtn" onClick={() => setWait((w) => w + 5)}>
              Waited 5 more min
            </button>
            <span>{wait} min waited</span>
          </div>
          <button type="button" className="rider-link-btn" onClick={() => setGps(farGps())}>
            Demo: log it from far away
          </button>
        </div>
        {CLAIMS.map((c) => (
          <button key={c.claim} type="button" className="rider-menu-item" onClick={() => onPick(c.claim, evidence)}>
            {c.label}
          </button>
        ))}
        <button type="button" className="rider-link-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
