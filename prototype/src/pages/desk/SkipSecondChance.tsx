import { useState } from 'react'
import { SKIP_LABEL, SKIP_REASONS, type SkipReason } from '../../engine/router.ts'

interface SkipSecondChanceProps {
  readonly onSkip: (reason: SkipReason) => void
}

/** The operator may skip the second chance with a reason. It is logged and counted; it never opens a gate. */
export function SkipSecondChance({ onSkip }: SkipSecondChanceProps) {
  const [reason, setReason] = useState<SkipReason | ''>('')
  return (
    <div className="desk-skip">
      <label>
        <span className="sr-only">Why skip the second chance?</span>
        <select aria-label="Why skip the second chance?" value={reason} onChange={(e) => setReason(e.target.value as SkipReason | '')}>
          <option value="">Choose a reason to skip…</option>
          {SKIP_REASONS.map((r) => (
            <option key={r} value={r}>
              {SKIP_LABEL[r]}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn" disabled={reason === ''} onClick={() => reason !== '' && onSkip(reason)}>
        Skip second chance
      </button>
    </div>
  )
}
