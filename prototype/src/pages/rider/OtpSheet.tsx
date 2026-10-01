import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import type { OtpPurpose } from '../../domain/types.ts'
import { MAX_OTP_ATTEMPTS } from '../../domain/reducer.ts'

const LENGTH = 4

interface Props {
  readonly purpose: OtpPurpose
  readonly attempts: number
  /** After five wrong tries the order is locked until this time (a cooldown, not for good) */
  readonly lockedUntil?: number
  readonly onSubmit: (code: string) => void
  readonly onClose: () => void
}

const COPY: Readonly<Record<OtpPurpose, { readonly title: string; readonly body: string }>> = {
  delivery: {
    title: 'Delivery OTP',
    body: "OTP sent to the customer's WhatsApp. Ask the customer for the 4-digit code.",
  },
  refusal: {
    title: 'Refusal code',
    body: "A refusal code was sent to the customer's WhatsApp. The customer shares the 4-digit code to confirm they refused.",
  },
}

/** Bottom sheet with four boxes. Remounted (via key) after a wrong code so the boxes clear. */
export function OtpSheet({ purpose, attempts, lockedUntil, onSubmit, onClose }: Props) {
  const [digits, setDigits] = useState<readonly string[]>(() => Array.from({ length: LENGTH }, () => ''))
  const refs = useRef<(HTMLInputElement | null)[]>([])
  // Locked after five wrong tries, for a few minutes. (A record with no lock time is a lock from before cooldowns: it stays locked.)
  const locked = attempts >= MAX_OTP_ATTEMPTS && (lockedUntil === undefined || Date.now() < lockedUntil)
  const minutes = lockedUntil === undefined ? undefined : Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60_000))
  const code = digits.join('')
  const complete = code.length === LENGTH
  const copy = COPY[purpose]

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const setAt = (i: number, value: string): void => setDigits((d) => d.map((x, k) => (k === i ? value : x)))

  const onChange = (i: number, raw: string): void => {
    const v = raw.replace(/\D/g, '').slice(-1)
    setAt(i, v)
    if (v && i < LENGTH - 1) refs.current[i + 1]?.focus()
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'Enter' && complete && !locked) onSubmit(code)
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    e.preventDefault()
    setDigits(Array.from({ length: LENGTH }, (_, k) => pasted[k] ?? ''))
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus()
  }

  return (
    <div className="rider-overlay" role="presentation" onClick={onClose}>
      <div className="rider-sheet" role="dialog" aria-modal="true" aria-labelledby="rider-otp-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="rider-otp-title">{copy.title}</h2>
        <p className="rider-muted">{copy.body}</p>
        <div className="rider-otp-row" role="group" aria-label={`${LENGTH}-digit code`}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el
              }}
              className="rider-otp-box"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              disabled={locked}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
            />
          ))}
        </div>
        <div className="rider-otp-msg" role="alert">
          {locked
            ? `Too many wrong codes. This order is locked${minutes === undefined ? '' : ` for about ${minutes} more minute${minutes === 1 ? '' : 's'}`}. Ask the customer for the code again, or ask the hub for help.`
            : attempts > 0
              ? `Wrong code. ${MAX_OTP_ATTEMPTS - attempts} ${MAX_OTP_ATTEMPTS - attempts === 1 ? 'try' : 'tries'} left.`
              : ''}
        </div>
        <button type="button" className="rider-submit" disabled={!complete || locked} onClick={() => onSubmit(code)}>
          Submit
        </button>
        <button type="button" className="rider-link-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
