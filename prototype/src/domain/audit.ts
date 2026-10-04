import { holdGates, PARCEL_GATES } from '../engine/router.ts'
import { activeCount, bonusSuspended, BONUS_HOLD_WINDOW_MS, captainName, STRIKE_REASONS } from './captain.ts'
import { STRIKE_LIMIT, SUSPENDED_REASON } from './ledger.ts'
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
 * The eighteen checks on the day's own record (prototype spec, Audit tab). Each is green or red. They read the event log and the
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

  // A re-home order that failed is the same physical parcel as its original: the one reverse leg is booked on the original, so the re-home order is exempt.
  const rtoWithoutCost = stops.filter((x) => x.status === 'rto' && x.rehomedFrom === undefined && !s.events.some((e) => e.type === 'COST_BOOKED' && e.orderId === x.order.id && e.data.line === 'RTO reverse' && String(e.data.owner).length > 0))

  const sumEvents = (type: 'BONUS_ACCRUED' | 'BONUS_RELEASED' | 'BONUS_CLAWED_BACK' | 'BONUS_BLOCKED'): number => eventsOf(s, type).reduce((t, e) => t + Number(e.data.amount), 0)
  const totals = ledgerTotals(s)
  const k = kpis(clean)
  const shownOnRiders = s.riders.reduce((t, r) => t + riderEarnings(clean, r.id).bonusPending, 0)
  // A bonus the captain withheld AFTER it accrued leaves the liability (its BONUS_BLOCKED event says so); one blocked at accrual never entered it.
  const withheldAfter = eventsOf(s, 'BONUS_BLOCKED').filter((e) => e.data.afterAccrual === true).reduce((t, e) => t + Number(e.data.amount), 0)
  const expected = { liability: sumEvents('BONUS_ACCRUED') - sumEvents('BONUS_RELEASED') - sumEvents('BONUS_CLAWED_BACK') - withheldAfter, released: sumEvents('BONUS_RELEASED'), clawedBack: sumEvents('BONUS_CLAWED_BACK'), blocked: sumEvents('BONUS_BLOCKED') }
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

  const heldEvents = eventsOf(s, 'HELD')
  const heldUninspected = heldEvents.filter((h) => !s.events.some((e) => e.type === 'PARCEL_INSPECTED' && e.orderId === h.orderId && e.seq < h.seq))
  const overridden = heldEvents
    .map((h) => s.parcels.find((p) => p.orderId === h.orderId))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .filter((p) => holdGates(p.parcel, { params: s.router, inspection: p.inspection ?? null }).some((g) => PARCEL_GATES.includes(g.name) && !g.pass))

  const reservedEvents = eventsOf(s, 'PICKUP_RESERVED')
  const collectedEvents = eventsOf(s, 'PICKUP_COLLECTED')
  const pickupOrders = stops.filter((x) => x.status === 'hub_pickup')
  const badPickup = [
    ...collectedEvents.filter((c) => c.data.codeVerified !== true || !reservedEvents.some((r) => r.orderId === c.orderId && r.seq < c.seq)).map((c) => c.orderId ?? '?'),
    ...pickupOrders.filter((x) => !collectedEvents.some((c) => c.orderId === x.order.id)).map((x) => x.order.id),
    ...s.parcels.filter((p) => p.state === 'picked_up' && s.stops[p.orderId]?.status !== 'hub_pickup').map((p) => p.orderId),
  ]
  const overCapacity = [...eventsOf(s, 'HELD'), ...reservedEvents].filter((e) => typeof e.data.slot !== 'number' || typeof e.data.capacity !== 'number' || e.data.slot > e.data.capacity)

  // Fake-attempt control (plan 24): the strike log, the captain's decisions, and the bonus-off and bonus-hold rules.
  const strikeEvents = eventsOf(s, 'STRIKE')
  const badStrikes = s.strikeLog.filter((k) => {
    const decided = s.exceptions.find((e) => e.orderId === k.orderId && e.status === 'resolved' && e.action === 'strike' && e.auto !== true && e.captainName !== undefined)
    return !STRIKE_REASONS.includes(k.reason) || k.captainName !== captainName(s.hub) || decided === undefined || decided.captainName !== k.captainName
  })
  const strikeLogOk = badStrikes.length === 0 && strikeEvents.length === s.strikeLog.length && s.exceptions.every((e) => e.action !== 'strike' || e.auto !== true)
  const strikeBlocked = s.ledger.filter(
    (l) =>
      l.status === 'blocked' &&
      ((l.reason?.includes('active strikes') && activeCount(s, l.riderId, l.deliveredSim) < STRIKE_LIMIT) || (l.reason === SUSPENDED_REASON && !bonusSuspended(s, l.riderId, l.deliveredSim))),
  )
  const bonusOff = !(s.config.bonus > 0)
  const bonusRows = s.ledger.length + s.events.filter((e) => e.type.startsWith('BONUS_')).length
  const heldBad = s.ledger.filter((l) => {
    const r = l.review
    if (r === undefined) return false
    if (r.state === 'withheld') return r.reason === undefined || !STRIKE_REASONS.includes(r.reason) || r.captainName === undefined || l.status !== 'blocked'
    if (r.state === 'default_released') return r.decidedSim === undefined || r.decidedSim < l.deliveredSim + BONUS_HOLD_WINDOW_MS || l.status !== 'released'
    // A held bonus whose order was returned inside the window is clawed back like any other: it leaves the hold, it is not an error.
    if (r.state === 'waiting') return l.status !== 'pending' && l.status !== 'accrued' && l.status !== 'clawed_back'
    return false
  })

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
    { id: 'rto-cost-owner', label: 'Every RTO has a cost owner', ok: rtoWithoutCost.length === 0, detail: rtoWithoutCost.length === 0 ? `${stops.filter((x) => x.status === 'rto' && x.rehomedFrom === undefined).length} RTOs, each booked to Valmo (a failed re-home books its one return on the original parcel)` : `no cost booked for ${list(rtoWithoutCost.map((x) => x.order.id))}` },
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
    {
      id: 'inspect-before-hold',
      label: 'No parcel held without an inspection',
      ok: heldUninspected.length === 0,
      detail: heldUninspected.length === 0 ? (heldEvents.length === 0 ? 'no parcel has been held yet' : `${heldEvents.length} held, each after the hub operator's (or the bot's) inspection`) : `held with no inspection before it: ${list(heldUninspected.map((e) => e.orderId ?? '?'))}`,
    },
    {
      id: 'gates-not-overridden',
      label: 'No gate was overridden',
      ok: overridden.length === 0,
      detail: overridden.length === 0 ? `${heldEvents.length} held parcels, each passing inspection, same state, seller opt-in, invoice and item condition` : `held although a gate fails: ${list(overridden.map((p) => p.orderId))}`,
    },
    {
      id: 'pickup-verified',
      label: 'No pickup handed over without a verified code',
      ok: badPickup.length === 0,
      detail: badPickup.length === 0 ? (collectedEvents.length === 0 ? 'no pickup has been collected yet' : `${collectedEvents.length} collected, each after a reservation and a verified code, each ending as a hub pickup (never a delivery)`) : `pickup records that do not add up: ${list(badPickup)}`,
    },
    {
      id: 'shelf-capacity',
      label: 'The shelf was never above capacity',
      ok: overCapacity.length === 0,
      detail: overCapacity.length === 0 ? `${eventsOf(s, 'HELD').length + reservedEvents.length} shelf slots taken (holds and pickups share them), each within the capacity at that moment` : `slot taken beyond capacity: ${list(overCapacity.map((e) => `${e.orderId ?? '?'} (slot ${String(e.data.slot)} of ${String(e.data.capacity)})`))}`,
    },
    {
      id: 'strike-decided',
      label: 'Every strike has a captain decision with a reason',
      ok: strikeLogOk,
      detail: strikeLogOk
        ? s.strikeLog.length === 0
          ? 'no strike has been issued yet'
          : `${s.strikeLog.length} strike${s.strikeLog.length === 1 ? '' : 's'}, each decided by ${captainName(s.hub)} with a reason chip, none by anyone else and none by the 24 h default`
        : `strikes without a captain's decision, a valid reason, or the right captain: ${list(badStrikes.length > 0 ? badStrikes.map((k) => k.orderId) : ['the strike log and the STRIKE events disagree'])}`,
    },
    {
      id: 'strike-expiry',
      label: 'No strike counted after it expired',
      ok: strikeBlocked.length === 0,
      detail: strikeBlocked.length === 0 ? 'every bonus blocked for strikes had 2 active strikes (inside 30 days, not overturned), or 3 strikes not overturned for a suspension, at the time' : `blocked on strikes that were not active: ${list(strikeBlocked.map((l) => l.orderId))}`,
    },
    {
      id: 'bonus-off-clean',
      label: 'A day with the bonus off creates no ledger rows',
      ok: !bonusOff || bonusRows === 0,
      detail: !bonusOff ? 'the bonus is on for this day, so this check has nothing to test' : bonusRows === 0 ? 'the bonus is off and nothing was booked: fake-attempt control ran without it' : `the bonus is off but ${bonusRows} bonus rows or events exist`,
    },
    {
      id: 'bonus-hold-decided',
      label: 'Every held bonus was decided by the captain, or released by default after 7 days',
      ok: heldBad.length === 0,
      detail:
        heldBad.length === 0
          ? `${s.ledger.filter((l) => l.review !== undefined).length} bonuses went through the parking-gap check: withheld ones have a captain and a reason, default releases came after the 7-day window`
          : `held bonuses that do not add up: ${list(heldBad.map((l) => l.orderId))}`,
    },
  ]
}

export const auditGreen = (checks: readonly AuditCheck[]): boolean => checks.every((c) => c.ok)
