import { ROUTER } from '../engine/economics.ts'
import { pMatchWithin } from '../engine/router.ts'
import { laneEv } from '../engine/whatif.ts'
import { HOUR_MS } from './clock.ts'
import { WHATSAPP_COST, REVERSE_COST } from './helpers.ts'
import { savingsLedger } from './ledger.ts'
import { decisionFor } from './routing.ts'
import type { DayState } from './types.ts'

/** Outbound WhatsApp templates the Router sends: each costs ₹0.50 and is a Router cost (the customer's taps are free). */
const ROUTER_TEMPLATES: ReadonlySet<string> = new Set(['second_chance'])

export interface DeskMoney {
  /** Refused parcels the Desk has seen today */
  readonly parcels: number
  /** ₹ saved on real outcomes only (gross) */
  readonly grossSaved: number
  /** ₹ the Router really spent: hold, re-home delivery leg, messages sent */
  readonly routerCosts: number
  /** Booked so far, net = gross saved - Router costs. Negative while holds are still waiting for a buyer. */
  readonly booked: number
  /** Expected ₹ of the parcels still open, each in the lane it is in now. A model, not a booking. */
  readonly inPlay: number
  readonly inPlayCount: number
  /** What sending every refused parcel back the old way costs (₹120 each) */
  readonly sendBackCost: number
}

/** The three money tiles on the Desk. Booked is real (from the event log); Still in play is the assumptions at work. */
export function deskMoney(s: DayState): DeskMoney {
  const grossSaved = savingsLedger(s).total
  const bookedCosts = s.events.filter((e) => e.type === 'COST_BOOKED' && e.data.stream === 'router').reduce((t, e) => t + Number(e.data.amount), 0)
  const messages = s.events.filter((e) => e.type === 'MSG_SENT' && ROUTER_TEMPLATES.has(String(e.data.template))).length * WHATSAPP_COST
  const routerCosts = bookedCosts + messages

  let inPlay = 0
  let inPlayCount = 0
  for (const rec of s.parcels) {
    if (rec.state === 'queued') {
      inPlay += laneEv(decisionFor(s, rec))
      inPlayCount++
    } else if (rec.state === 'second_chance_sent') {
      inPlay += decisionFor(s, rec).ev.secondChance
      inPlayCount++
    } else if (rec.state === 'held' && rec.heldSim !== undefined) {
      // The ₹8 is already spent (it is in the costs), so only the chance of a buyer in the hours left is still in play.
      const hoursLeft = (rec.heldSim + s.router.holdHours * HOUR_MS - s.simNow) / HOUR_MS
      inPlay += pMatchWithin(rec.parcel.demandRate, hoursLeft, s.router) * ROUTER.savedPerMatch
      inPlayCount++
    }
  }
  return { parcels: s.parcels.length, grossSaved, routerCosts, booked: grossSaved - routerCosts, inPlay, inPlayCount, sendBackCost: s.parcels.length * REVERSE_COST }
}
