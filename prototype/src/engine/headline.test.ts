import { describe, expect, it } from 'vitest'
import { causalHeadline, headlineSentence } from './headline.ts'

const inputs = { bonusTerminal: 6000, bonusDelivered: 4320, controlTerminal: 6000, controlDelivered: 3600, bonus: 15, reverse: 120, ci95: [10, 14] as const }

describe('causalHeadline', () => {
  it('counts extra deliveries as the rate gap times the Bonus-arm orders, not the delivery rate', () => {
    const h = causalHeadline(inputs)
    expect(h.extraDeliveries).toBeCloseTo(720, 6)
    expect(h.extraRange?.[0]).toBeCloseTo(600, 6)
    expect(h.extraRange?.[1]).toBeCloseTo(840, 6)
  })

  it('charges the whole bonus bill (including deliveries that would have happened anyway) and credits only the rescues', () => {
    const h = causalHeadline(inputs)
    expect(h.bonusCost).toBe(4320 * 15)
    expect(h.rtoAvoided).toBeCloseTo(720 * 120, 6)
    expect(h.net).toBeCloseTo(720 * 120 - 4320 * 15, 6)
  })

  it('matches net per 100 flagged orders from the economics module', () => {
    // 120 x 12 - 15 x 72 = 360 per 100 orders, so 21,600 over 6,000 orders
    expect(causalHeadline(inputs).net).toBeCloseTo(21_600, 6)
  })

  it('shows a loss honestly when the bonus did worse than Control', () => {
    const h = causalHeadline({ ...inputs, bonusDelivered: 3300 })
    expect(h.extraDeliveries).toBeLessThan(0)
    expect(h.net).toBeLessThan(0)
  })

  it('is not ready until both arms have finished orders', () => {
    expect(causalHeadline({ ...inputs, controlTerminal: 0, controlDelivered: 0 }).ready).toBe(false)
    expect(causalHeadline({ ...inputs, bonusTerminal: 0, bonusDelivered: 0 }).ready).toBe(false)
    expect(causalHeadline(inputs).ready).toBe(true)
  })
})

describe('headlineSentence', () => {
  it('says the bonus caused X extra deliveries at ₹Y, avoiding ₹Z of RTO cost, net ₹N', () => {
    const text = headlineSentence(causalHeadline(inputs))
    expect(text).toMatch(/caused 720 extra deliveries/)
    expect(text).toMatch(/₹64,800/)
    expect(text).toMatch(/₹86,400/)
    expect(text).toMatch(/net ₹21,600/)
  })

  it('uses the singular for exactly one extra delivery', () => {
    const one = causalHeadline({ bonusTerminal: 100, bonusDelivered: 61, controlTerminal: 100, controlDelivered: 60, bonus: 15, reverse: 120 })
    expect(headlineSentence(one)).toMatch(/caused 1 extra delivery at/)
  })

  it('never states a plain delivery rate as the headline', () => {
    expect(headlineSentence(causalHeadline(inputs))).not.toMatch(/\d+% of (risky|flagged)/i)
  })

  it('writes a loss with a minus sign', () => {
    expect(headlineSentence(causalHeadline({ ...inputs, bonusDelivered: 3300 }))).toMatch(/net −₹/)
  })

  it('says there is nothing to report yet when an arm is empty', () => {
    expect(headlineSentence(causalHeadline({ ...inputs, controlTerminal: 0, controlDelivered: 0 }))).toMatch(/not enough|no finished/i)
  })
})
