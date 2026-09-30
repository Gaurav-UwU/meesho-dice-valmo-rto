import { ruleHash } from '../engine/verdict.ts'
import { eventsOf } from './events.ts'
import { ledgerTotals } from './ledger.ts'
import { isDelivered, isTerminal } from './lifecycle.ts'
import { verdictConfigFor } from './rule.ts'
import { kpis, riderEarnings } from './selectors.ts'
import { overdueTimers } from './tick.ts'
import type { DayState } from './types.ts'

export interface AuditCheck {
  readonly id: string
  readonly label: string
  readonly ok: boolean
  /** What was checked, in a sentence; on a red check, what is wrong */
  readonly detail: string
}

const list = (items: readonly string[], max = 5): string => `${items.slice(0, max).join('; ')}${items.length > max ? `; and ${items.length - max} more` : ''}`

/**
 * The ten checks on the day's own record (prototype spec, Audit tab). Each is green or red. They read the event log and the
 * lifecycle, so an action that forgot to log itself, or a screen that shows a different ₹ figure, turns a check red.
 */
export function runAudit(s: DayState): readonly AuditCheck[] {
  const missing = s.stopOrder.filter((id) => !(id in s.stops))
  const clean: DayState = missing.length === 0 ? s : { ...s, stopOrder: s.stopOrder.filter((id) => id in s.stops) }
  const stops = clean.stopOrder.map((id) => s.stops[id])
  const terminal = stops.filter((x) => isTerminal(x.status))
  const open = stops.length - terminal.length
  const terminalEvents = eventsOf(s, 'ORDER_TERMINAL')

  const wrongTerminal = stops.filter((x) => {
    const mine = terminalEvents.filter((e) => e.orderId === x.order.id)
    return isTerminal(x.status) ? mine.length !== 1 || mine[0].data.status !== x.status : mine.length !== 0
  })

  const delivered = stops.filter((x) => isDelivered(x.status))
  const noOtp = delivered.filter((x) => {
    const otp = s.events.find((e) => e.type === 'OTP_VERIFIED' && e.orderId === x.order.id && e.data.purpose === 'delivery')
    const done = s.events.find((e) => e.type === 'DELIVERED' && e.orderId === x.order.id)
    return !otp || !done || otp.seq > done.seq
  })

  const rtoWithoutCost = stops.filter((x) => x.status === 'rto' && !s.events.some((e) => e.type === 'COST_BOOKED' && e.orderId === x.order.id && e.data.line === 'RTO reverse' && String(e.data.owner).length > 0))

  const sumEvents = (type: 'BONUS_ACCRUED' | 'BONUS_RELEASED' | 'BONUS_CLAWED_BACK' | 'BONUS_BLOCKED'): number => eventsOf(s, type).reduce((t, e) => t + Number(e.data.amount), 0)
  const totals = ledgerTotals(s)
  const k = kpis(clean)
  const shownOnRiders = s.riders.reduce((t, r) => t + riderEarnings(clean, r.id).bonusPending, 0)
  const expected = { liability: sumEvents('BONUS_ACCRUED') - sumEvents('BONUS_RELEASED') - sumEvents('BONUS_CLAWED_BACK'), released: sumEvents('BONUS_RELEASED'), clawedBack: sumEvents('BONUS_CLAWED_BACK'), blocked: sumEvents('BONUS_BLOCKED') }
  const ledgerOk =
    totals.liability === expected.liability &&
    totals.released === expected.released &&
    totals.clawedBack === expected.clawedBack &&
    totals.blocked === expected.blocked &&
    k.bonusPending === totals.liability &&
    shownOnRiders === totals.liability

  const overdue = overdueTimers(clean)
  const plannedEvent = eventsOf(s, 'DAY_PLANNED')[0]
  const currentHash = ruleHash(verdictConfigFor(s.config))
  const hashOk = !s.started || (s.plannedRuleHash === currentHash && plannedEvent?.data.ruleHash === currentHash)

  const bonusEvents = s.events.filter((e) => e.type.startsWith('BONUS_'))
  const wrongBonus = bonusEvents.filter((e) => {
    const st = e.orderId === undefined ? undefined : s.stops[e.orderId]
    return !st || !st.flagged || st.arm !== 'bonus'
  })

  const rehome = stops.filter((x) => x.rehomedFrom !== undefined)
  const leakedRehome = rehome.filter((x) => x.arm !== undefined || x.flagged)
  const flaggedInArms = k.flaggedBonus.n + k.flaggedControl.n
  const flaggedNotRehome = stops.filter((x) => x.flagged && x.arm !== undefined && x.rehomedFrom === undefined && x.status !== 'cancelled').length

  return [
    { id: 'orders-balance', label: 'Orders = terminal + open', ok: terminal.length + open === stops.length && missing.length === 0, detail: missing.length === 0 ? `${stops.length} orders = ${terminal.length} in a terminal state + ${open} still open` : `orders with no record: ${list(missing)}` },
    { id: 'one-terminal', label: 'Every order has exactly one terminal state (or is open)', ok: wrongTerminal.length === 0, detail: wrongTerminal.length === 0 ? `${terminal.length} terminal orders each ended once; ${open} are open` : `wrong for ${list(wrongTerminal.map((x) => x.order.id))}` },
    { id: 'no-rejected', label: 'Zero rejected transitions', ok: s.rejectedTransitions.length === 0, detail: s.rejectedTransitions.length === 0 ? 'the lifecycle table refused nothing' : `refused: ${list(s.rejectedTransitions.map((r) => `${r.orderId} ${r.from} → ${r.to}`))}` },
    {
      id: 'ledger-total',
      label: 'Ledger total = the ₹ shown on every screen',
      ok: ledgerOk,
      detail: ledgerOk
        ? `₹${totals.liability} owed, ₹${totals.released} released, ₹${totals.clawedBack} clawed back, ₹${totals.blocked} blocked: the event log, the Ops tile and the rider earnings agree`
        : `ledger says ₹${totals.liability} owed / ₹${totals.released} released / ₹${totals.clawedBack} clawed back / ₹${totals.blocked} blocked; events say ₹${expected.liability} / ₹${expected.released} / ₹${expected.clawedBack} / ₹${expected.blocked}; Ops tile ₹${k.bonusPending}; riders ₹${shownOnRiders}`,
    },
    { id: 'rto-cost-owner', label: 'Every RTO has a cost owner', ok: rtoWithoutCost.length === 0, detail: rtoWithoutCost.length === 0 ? `${stops.filter((x) => x.status === 'rto').length} RTOs, each booked to Valmo` : `no cost booked for ${list(rtoWithoutCost.map((x) => x.order.id))}` },
    { id: 'timers', label: 'No timer overdue', ok: overdue.length === 0, detail: overdue.length === 0 ? `sim clock ${new Date(s.simNow).toISOString().slice(11, 16)} on day ${Math.floor(s.simNow / 86_400_000) + 1}: nothing due` : list(overdue) },
    { id: 'rule-hash', label: 'Rule hash unchanged since DAY_PLANNED', ok: hashOk, detail: !s.started ? 'the day has not been planned yet' : hashOk ? `rule ${currentHash} is the rule the day was planned with` : `planned with ${s.plannedRuleHash}, now ${currentHash}` },
    { id: 'otp-before-delivery', label: 'Nothing delivered without a verified OTP', ok: noOtp.length === 0, detail: noOtp.length === 0 ? `${delivered.length} deliveries, each after a verified OTP` : `no OTP before delivery for ${list(noOtp.map((x) => x.order.id))}` },
    { id: 'bonus-eligibility', label: 'Every bonus is on a flagged Bonus-arm order', ok: wrongBonus.length === 0, detail: wrongBonus.length === 0 ? `${bonusEvents.length} bonus events, all on flagged Bonus-arm orders` : `bonus on other orders: ${list(wrongBonus.map((e) => e.orderId ?? '?'))}` },
    {
      id: 'rehome-cohort',
      label: 'No re-home order in pilot metrics',
      ok: leakedRehome.length === 0 && flaggedInArms === flaggedNotRehome,
      detail: leakedRehome.length === 0 && flaggedInArms === flaggedNotRehome ? `${rehome.length} re-homed orders, all outside the arms (${flaggedInArms} flagged orders in the pilot)` : `re-home orders with an arm or flag: ${list(leakedRehome.map((x) => x.order.id))}`,
    },
  ]
}

export const auditGreen = (checks: readonly AuditCheck[]): boolean => checks.every((c) => c.ok)
