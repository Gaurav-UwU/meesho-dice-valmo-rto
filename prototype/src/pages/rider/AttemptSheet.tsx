import { useEffect, useState } from 'react'
import type { AttemptClaim, AttemptEvidence } from '../../engine/attempts.ts'

interface Props {
  readonly onPick: (claim: AttemptClaim, evidence: AttemptEvidence | undefined) => void
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
 * how many times they called, and how long they waited. Strong evidence (near the door, 2+ calls, 5+ minutes) is trusted;
 * a pin far from the address opens an exception for Ops.
 */
export function AttemptSheet({ onPick, onClose }: Props) {
  const [gps, setGps] = useState<number | null>(null)
  const [calls, setCalls] = useState(0)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const evidence: AttemptEvidence | undefined = gps === null ? undefined : { gpsDistM: gps, calls, waitMin: wait }

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
            <button type="button" className="rider-chipbtn" onClick={() => setCalls((c) => c + 1)}>
              Call customer
            </button>
            <span>
              {calls} {calls === 1 ? 'call' : 'calls'}
            </span>
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
