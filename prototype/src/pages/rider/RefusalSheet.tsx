import { useEffect } from 'react'
import { REFUSAL_LABEL, REFUSAL_REASONS, type RefusalReason } from '../../engine/router.ts'

interface Props {
  readonly onPick: (reason: RefusalReason) => void
  readonly onClose: () => void
}

/** The rider records why the customer is refusing. The Desk's Router uses it: a soft reason gets a second-chance offer first. */
export function RefusalSheet({ onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="rider-overlay" role="presentation" onClick={onClose}>
      <div className="rider-sheet" role="dialog" aria-modal="true" aria-labelledby="rider-refuse-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="rider-refuse-title">Why is the customer refusing?</h2>
        <p className="rider-muted">A refusal code will be sent to the customer next. Demo tip: “Didn&apos;t order it” sends the parcel to Hold &amp; Re-home; “Not home” offers a second chance.</p>
        {REFUSAL_REASONS.map((reason) => (
          <button key={reason} type="button" className="rider-menu-item" onClick={() => onPick(reason)}>
            {REFUSAL_LABEL[reason]}
          </button>
        ))}
        <button type="button" className="rider-link-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
