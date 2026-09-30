import type { ReplyKind, StopRecord } from '../../domain/types.ts'
import { clock, persona, rupees } from '../../ui/format.ts'
import type { Translate } from './i18n.ts'

interface Props {
  readonly stop: StopRecord
  readonly hubName: string
  /** True only for riders on the Rescue Bonus arm. Control riders never see the chip. */
  readonly showBonus: boolean
  readonly bonusAmount: number
  readonly hasOtp: boolean
  readonly t: Translate
  readonly onDeliver: () => void
  readonly onEnterCode: () => void
  readonly onAttempt: () => void
  readonly onRefuse: () => void
}

const replyChip = (reply: ReplyKind, stop: StopRecord): string => {
  switch (reply) {
    case 'home':
      return 'Customer confirmed at home'
    case 'change_time':
      return 'Customer asked to reschedule'
    case 'fix_address':
      return stop.location ? 'Address fixed by customer' : 'Customer is fixing the address'
    case 'pay_now':
      return 'Paid online'
  }
}

function attemptNote(stop: StopRecord): string {
  const s = stop.assessment?.status
  if (s === 'verified') return 'Attempt recorded. The customer confirmed on WhatsApp.'
  if (s === 'suspect') return 'Attempt recorded. Under review by the ops team.'
  return 'Attempt recorded. Waiting for the customer to confirm on WhatsApp.'
}

/** Why the action buttons are disabled for this status. */
function lockedReason(stop: StopRecord): string | null {
  switch (stop.status) {
    case 'delivered_a1':
    case 'delivered_a2':
      return `Delivered${stop.deliveredAt ? ` at ${clock(stop.deliveredAt)}` : ''}. No more actions.`
    case 'ndr':
      return attemptNote(stop)
    case 'refused':
      return 'Refusal confirmed by the customer. The parcel goes back to the hub.'
    case 'rto':
      return 'This order went back to the seller as an RTO.'
    case 'rehomed':
      return 'The parcel was re-homed to a new buyer nearby.'
    case 'cancelled':
      return 'This order was cancelled.'
    default:
      return null
  }
}

export function TaskCard({ stop, hubName, showBonus, bonusAmount, hasOtp, t, onDeliver, onEnterCode, onAttempt, onRefuse }: Props) {
  const { order } = stop
  const who = persona(order, hubName)
  const rescheduled = stop.status === 'rescheduled'
  const reason = lockedReason(stop)
  const locked = reason !== null
  const open = stop.status === 'out_for_delivery' || stop.status === 'otp_sent'
  const chips = [...new Set(stop.replies)]
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`

  return (
    <article className="rider-card" aria-label={`Stop ${stop.seq}, ${who.name}`}>
      <div className="rider-card-top">
        <span className="pill tag">{t('delivery')}</span>
        <span className="pill">{t('item')}</span>
        <span className="pill cod">{order.payment === 'COD' ? `COD: ${rupees(order.value)}` : t('prepaid')}</span>
        <span className="rider-stop-no">
          {t('stop')} {stop.seq}
        </span>
      </div>
      <h3 className="rider-cust">{who.name}</h3>
      <p className="rider-ids">
        Order {order.id} · AWB {order.awb}
      </p>
      <p className="rider-addr">{who.address}</p>
      <p className="rider-addr muted">
        {t('landmark')}: {who.landmark}
      </p>

      {(showBonus && stop.flagged) || chips.length > 0 || hasOtp ? (
        <div className="rider-chips">
          {showBonus && stop.flagged ? (
            <span className="pill bonus">
              ₹ +{bonusAmount} {t('bonusChip')}
            </span>
          ) : null}
          {chips.map((c) => (
            <span key={c} className="pill wa">
              <span aria-hidden="true">💬</span> {replyChip(c, stop)}
            </span>
          ))}
          {hasOtp ? <span className="pill amber">{t('otpSent')}</span> : null}
        </div>
      ) : null}

      {rescheduled ? <p className="rider-note">Customer asked for another time</p> : null}
      {open && stop.failedAttempts > 0 ? <p className="rider-note">Attempt {stop.failedAttempts + 1}: an earlier attempt on this order did not deliver.</p> : null}
      {reason ? <p className="rider-note">{reason}</p> : null}

      <div className="rider-actions">
        <a className="rider-dir" href={dir} target="_blank" rel="noopener noreferrer">
          {t('direction')}
        </a>
        {rescheduled ? null : (
          <>
            {stop.status === 'otp_sent' ? (
              <button type="button" className="rider-act primary" onClick={onEnterCode}>
                {t('enterCode')}
              </button>
            ) : (
              <button type="button" className="rider-act primary" disabled={locked} title={reason ?? undefined} onClick={onDeliver}>
                {t('deliver')}
              </button>
            )}
            <button type="button" className="rider-act" disabled={!open} title={reason ?? undefined} onClick={onAttempt}>
              {t('attempted')}
            </button>
            <button type="button" className="rider-act danger" disabled={!open} title={reason ?? undefined} onClick={onRefuse}>
              {t('refused')}
            </button>
          </>
        )}
      </div>
    </article>
  )
}
