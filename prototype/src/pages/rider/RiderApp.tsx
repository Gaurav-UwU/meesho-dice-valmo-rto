import { useEffect, useMemo, useRef, useState } from 'react'
import { isDelivered } from '../../domain/lifecycle.ts'
import { riderBag, riderEarnings } from '../../domain/selectors.ts'
import type { DayState, StopRecord, StopStatus } from '../../domain/types.ts'
import type { AttemptClaim, AttemptEvidence } from '../../engine/attempts.ts'
import type { RefusalReason } from '../../engine/router.ts'
import type { Hub, Rider } from '../../engine/types.ts'
import { useSend } from '../../store/StoreContext.tsx'
import { Footer } from '../../ui/Footer.tsx'
import { AttemptSheet } from './AttemptSheet.tsx'
import { EarningsCard } from './EarningsCard.tsx'
import { translator, type Lang, type Translate } from './i18n.ts'
import { OtpSheet } from './OtpSheet.tsx'
import { holdLine } from './captainText.ts'
import { RefusalSheet } from './RefusalSheet.tsx'
import { StrikeMeter } from './StrikeMeter.tsx'
import { RiderHeader } from './RiderHeader.tsx'
import { TaskCard } from './TaskCard.tsx'

type Tab = 'pending' | 'failed' | 'completed'

const TAB_STATUSES: Readonly<Record<Tab, readonly StopStatus[]>> = {
  pending: ['scored', 'out_for_delivery', 'otp_sent', 'rescheduled'],
  failed: ['ndr', 'refused', 'rto', 'rehomed', 'hub_pickup'],
  completed: ['delivered_a1', 'delivered_a2'],
}
const TABS: readonly Tab[] = ['pending', 'failed', 'completed']
const TOAST_MS = 4000

interface Props {
  readonly state: DayState
  readonly hub: Hub
  readonly rider: Rider
  readonly onSwitch: () => void
}

/** A brief toast when one of this Bonus rider's flagged stops becomes delivered. */
function useBonusToast(state: DayState, bag: readonly StopRecord[], isBonus: boolean): string | null {
  const previous = useRef<Readonly<Record<string, StopStatus>> | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    const prev = previous.current
    previous.current = Object.fromEntries(bag.map((s) => [s.order.id, s.status]))
    if (!prev || !isBonus) return
    const done = bag.find((s) => isDelivered(s.status) && s.flagged && prev[s.order.id] !== undefined && !isDelivered(prev[s.order.id]))
    if (!done) return
    const entry = state.ledger.find((l) => l.orderId === done.order.id)
    if (!entry) return
    setToast(entry.status === 'pending' ? `₹${entry.amount} Rescue Bonus credited (pending)` : `₹${entry.amount} Rescue Bonus on hold`)
  }, [bag, isBonus, state.ledger])
  // The timer depends only on the toast itself, so other state changes (autopilot, another tab) cannot cancel it.
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(id)
  }, [toast])
  return toast
}

/** The rider's line about a bonus held for the captain on this delivered order, in their language */
function heldText(state: DayState, stop: StopRecord, riderId: string, t: Translate): string | undefined {
  const entry = state.ledger.find((l) => l.orderId === stop.order.id && l.riderId === riderId && l.review !== undefined)
  return entry ? holdLine(t, entry.amount, entry.review, entry.status) : undefined
}

export function RiderApp({ state, hub, rider, onSwitch }: Props) {
  const send = useSend(hub.id)
  const [lang, setLang] = useState<Lang>('en')
  const [tab, setTab] = useState<Tab>('pending')
  const [priorityOnly, setPriorityOnly] = useState(false)
  const [otpFor, setOtpFor] = useState<string | null>(null)
  const [attemptFor, setAttemptFor] = useState<string | null>(null)
  const [refuseFor, setRefuseFor] = useState<string | null>(null)
  const t = useMemo(() => translator(lang), [lang])

  const isBonus = rider.arm === 'bonus'
  // Stop-number order, except the stops reserved for the live demo come first so the demo starts on them.
  const bag = useMemo(() => [...riderBag(state, rider.id)].sort((a, b) => Number(b.manual) - Number(a.manual) || a.seq - b.seq), [state, rider.id])
  const earnings = riderEarnings(state, rider.id)
  const toast = useBonusToast(state, bag, isBonus)

  const inTab = (x: Tab): readonly StopRecord[] => bag.filter((s) => TAB_STATUSES[x].includes(s.status))
  const tabStops = inTab(tab)
  const priorityCount = isBonus ? tabStops.filter((s) => s.flagged).length : 0
  const shown = priorityOnly && isBonus ? tabStops.filter((s) => s.flagged) : tabStops
  const donePct = bag.length === 0 ? 0 : Math.round((inTab('completed').length / bag.length) * 100)
  const otp = otpFor ? state.otps[otpFor] : undefined

  const deliver = (orderId: string): void => {
    void send({ type: 'riderDeliver', orderId })
    setOtpFor(orderId)
  }
  const refuse = (reason: RefusalReason): void => {
    if (refuseFor) {
      void send({ type: 'riderRefuse', orderId: refuseFor, reason })
      setOtpFor(refuseFor)
    }
    setRefuseFor(null)
  }
  const attempt = (claim: AttemptClaim, evidence: AttemptEvidence | undefined): void => {
    if (attemptFor) void send({ type: 'riderAttempt', orderId: attemptFor, claim, evidence })
    setAttemptFor(null)
  }

  return (
    <div className="rider-root">
      <RiderHeader rider={rider} lang={lang} t={t} onLang={setLang} onSwitch={onSwitch} />
      <div className="rider-scroll">
        <EarningsCard earnings={earnings} showBonus={isBonus} t={t} />
        <StrikeMeter state={state} rider={rider} t={t} />
        <div className="rider-tabs" role="tablist">
          {TABS.map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tab === x} className="rider-tab" onClick={() => setTab(x)}>
              {t(x)} ({inTab(x).length})
            </button>
          ))}
        </div>
        <div className="rider-filter-chips">
          <button type="button" className="rider-fchip" aria-pressed={!priorityOnly} onClick={() => setPriorityOnly(false)}>
            {t('delivery')} ({tabStops.length})
          </button>
          <button type="button" className="rider-fchip" disabled>
            {t('pickup')} (0)
          </button>
          {isBonus ? (
            <button
              type="button"
              className="rider-fchip"
              aria-pressed={priorityOnly}
              onClick={() => setPriorityOnly(true)}
              disabled={priorityCount === 0 && !priorityOnly}
            >
              {t('priority')} ({priorityCount})
            </button>
          ) : null}
        </div>
        <div className="rider-list">
          {shown.length === 0 ? <p className="rider-empty">{t('emptyTab')}</p> : null}
          {shown.map((stop) => (
            <TaskCard
              key={stop.order.id}
              stop={stop}
              hubName={hub.name}
              showBonus={isBonus}
              bonusAmount={state.config.bonus}
              hasOtp={state.otps[stop.order.id] !== undefined}
              underReview={state.exceptions.some((e) => e.orderId === stop.order.id && e.status === 'open')}
              holdText={heldText(state, stop, rider.id, t)}
              t={t}
              onDeliver={() => deliver(stop.order.id)}
              onEnterCode={() => setOtpFor(stop.order.id)}
              onAttempt={() => setAttemptFor(stop.order.id)}
              onRefuse={() => setRefuseFor(stop.order.id)}
            />
          ))}
        </div>
        <Footer />
      </div>
      <div className="rider-fab" role="img" aria-label={`${donePct}% of stops completed`}>
        {donePct}%
      </div>
      {toast ? (
        <div className="rider-toast" role="status">
          {toast}
        </div>
      ) : null}
      {otpFor && otp ? (
        <OtpSheet
          key={`${otpFor}-${otp.attempts}`}
          purpose={otp.purpose}
          attempts={otp.attempts}
          lockedUntil={otp.lockedUntil}
          onSubmit={(code) => void send({ type: 'submitOtp', orderId: otpFor, code })}
          onClose={() => setOtpFor(null)}
        />
      ) : null}
      {attemptFor ? <AttemptSheet onPick={attempt} onClose={() => setAttemptFor(null)} /> : null}
      {refuseFor ? <RefusalSheet onPick={refuse} onClose={() => setRefuseFor(null)} /> : null}
    </div>
  )
}
