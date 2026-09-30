import { describe, expect, it } from 'vitest'
import { DEFAULT_CONTROLS, derivePilotView } from './pilotModel.ts'

describe('the page shows one set of "does it pay?" numbers', () => {
  it('uses the break-even the verdict uses, so the page never shows two different ones', () => {
    for (const c of [DEFAULT_CONTROLS, { ...DEFAULT_CONTROLS, bonus: 20 }, { ...DEFAULT_CONTROLS, uplift: 20 }]) {
      const view = derivePilotView(c)
      expect(view.pay.breakEven).toBeCloseTo(view.result.verdictResult.breakEven, 9)
      expect(view.pay.breakEvenConservative).toBeCloseTo(view.result.verdictResult.breakEvenConservative, 9)
    }
  })

  it('net per 100 agrees with the "caused X extra deliveries" headline', () => {
    const view = derivePilotView(DEFAULT_CONTROLS)
    const perHundred = (view.headline.net / view.headline.bonusTerminal) * 100
    expect(view.pay.net).toBeCloseTo(perHundred, 0)
  })

  it('counting the ₹18 rider fee lowers the net and raises the break-even', () => {
    const { pay } = derivePilotView(DEFAULT_CONTROLS)
    expect(pay.netConservative).toBeLessThan(pay.net)
    expect(pay.breakEvenConservative).toBeGreaterThan(pay.breakEven)
    expect(pay.annualCr).toBeGreaterThan(0)
  })
})
