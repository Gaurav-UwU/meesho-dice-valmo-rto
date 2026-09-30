/**
 * The one headline: what the bonus CAUSED, never how many risky orders were delivered.
 * A delivery rate on flagged orders mixes selection (risky orders were picked) with effect (the bonus changed the outcome).
 * Only the Bonus-vs-Control gap is the effect.
 */
export interface HeadlineInput {
  /** Flagged Bonus-arm orders that reached a final outcome, and how many of them were delivered */
  readonly bonusTerminal: number
  readonly bonusDelivered: number
  readonly controlTerminal: number
  readonly controlDelivered: number
  /** ₹ paid per delivered flagged order in the Bonus arm */
  readonly bonus: number
  /** ₹ of reverse leg avoided per rescued order */
  readonly reverse: number
  /** 95% interval of the uplift per 100 flagged orders (rider-clustered), if known */
  readonly ci95?: readonly [number, number]
}

export interface CausalHeadline {
  readonly ready: boolean
  /** (Bonus rate - Control rate) x Bonus-arm orders */
  readonly extraDeliveries: number
  readonly extraRange: readonly [number, number] | undefined
  /** Every bonus paid, including on deliveries that would have happened anyway */
  readonly bonusCost: number
  /** Extra deliveries x reverse leg. Never counted per order. */
  readonly rtoAvoided: number
  readonly net: number
  readonly bonusTerminal: number
  readonly controlTerminal: number
}

export function causalHeadline(i: HeadlineInput): CausalHeadline {
  const ready = i.bonusTerminal > 0 && i.controlTerminal > 0
  const gap = ready ? i.bonusDelivered / i.bonusTerminal - i.controlDelivered / i.controlTerminal : 0
  const extra = gap * i.bonusTerminal
  const bonusCost = i.bonusDelivered * i.bonus
  const rtoAvoided = extra * i.reverse
  return {
    ready,
    extraDeliveries: extra,
    extraRange: ready && i.ci95 ? [(i.ci95[0] / 100) * i.bonusTerminal, (i.ci95[1] / 100) * i.bonusTerminal] : undefined,
    bonusCost,
    rtoAvoided,
    net: rtoAvoided - bonusCost,
    bonusTerminal: i.bonusTerminal,
    controlTerminal: i.controlTerminal,
  }
}

const rupees = (x: number): string => `${x < 0 ? '−' : ''}₹${Math.abs(Math.round(x)).toLocaleString('en-IN')}`

export function headlineSentence(h: CausalHeadline): string {
  if (!h.ready) return 'Not enough finished orders in both arms yet to say what the bonus caused.'
  const extra = Math.round(h.extraDeliveries)
  const noun = Math.abs(extra) === 1 ? 'delivery' : 'deliveries'
  return `The bonus caused ${extra < 0 ? '−' : ''}${Math.abs(extra).toLocaleString('en-IN')} extra ${noun} at ${rupees(h.bonusCost)}, avoiding ${rupees(h.rtoAvoided)} of RTO cost (net ${rupees(h.net)}).`
}
