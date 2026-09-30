import { describe, expect, it } from 'vitest'
import { annualNetCr, breakEvenDelta, CONSERVATIVE, costPerSuccessfulDelivery, DEFAULTS, netPer100, routerBreakEven } from '../../engine/economics.ts'
import { BAND_OFFSETS } from '../../engine/pilot.ts'
import { tQuantile975 } from '../../engine/verdict.ts'
import { buildMathSections, toPlainText, type MathStep } from './mathSteps.ts'
import { DEFAULT_CONTROLS, derivePilotView, RTO_TODAY, type Controls } from './pilotModel.ts'

const build = (c: Controls = DEFAULT_CONTROLS) => {
  const view = derivePilotView(c)
  const sections = buildMathSections(c, view)
  const step = (id: string): MathStep => {
    const found = sections.flatMap((s) => s.steps).find((s) => s.id === id)
    if (!found) throw new Error(`no step ${id}`)
    return found
  }
  return { view, sections, step }
}

describe('maths explainer: structure', () => {
  const { sections } = build()

  it('covers the whole chain in order, with the extra checks near the end', () => {
    expect(sections.map((s) => s.id)).toEqual(['flag', 'setup', 'read', 'verdict', 'pay', 'scale', 'router', 'extra', 'sources'])
  })

  it('tells the paired story in order: pairs, gaps, average, spread, range, then the rule and the money', () => {
    const ids = sections.flatMap((s) => s.steps.map((x) => x.id))
    const order = ['pairing', 'fair', 'pair-gaps', 'uplift', 'spread', 'ci', 'rules', 'saving', 'net']
    const at = order.map((id) => ids.indexOf(id))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('gives every step a plain sentence, a formula slot, a working and a result', () => {
    for (const st of sections.flatMap((s) => s.steps)) {
      expect(st.title.length).toBeGreaterThan(3)
      expect(st.plain.length).toBeGreaterThan(10)
      expect(st.working.length).toBeGreaterThan(0)
      expect(st.result.length).toBeGreaterThan(0)
      expect(['data pack', 'our model', 'assumption', 'simulated']).toContain(st.source)
    }
  })

  it('numbers the sections 1, 2, 3... with no repeats', () => {
    expect(sections.map((s) => Number(/^(\d+)\./.exec(s.heading)?.[1]))).toEqual(sections.map((_, i) => i + 1))
  })

  it('has unique step ids', () => {
    const ids = sections.flatMap((s) => s.steps.map((x) => x.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses no word a judge would have to look up', () => {
    const text = toPlainText(build().sections)
    expect(text).not.toMatch(/clustered|\bICC\b|design effect|\bMDE\b|DEFF|t-value|\bCI\b|naive/i)
  })
})

describe('maths explainer: numbers agree with the engine and the deck', () => {
  it('shows the deck break-even values 8.6 and 10.3', () => {
    const { step, view } = build()
    const be = step('break-even')
    expect(be.result).toContain('8.6')
    expect(be.result).toContain('10.3')
    expect(be.working).toContain(breakEvenDelta({ ...DEFAULTS, baselineSuccess: 60 }).toFixed(2))
    expect(be.working).toContain(breakEvenDelta({ ...CONSERVATIVE, baselineSuccess: 60 }).toFixed(2))
    expect(view.breakEven).toBeCloseTo(8.571, 2)
  })

  it('carries the ₹18 rider-fee case here, not on the page: it is the conservative break-even', () => {
    const { step } = build()
    expect(step('break-even').plain).toMatch(/₹18/)
    expect(step('break-even').plain).toMatch(/rider/i)
  })

  it('reproduces the net per 100 and the annual rupees the page shows', () => {
    const { step, view } = build()
    const net = step('net').result
    const fmt = (x: number): string => `${x < 0 ? '−' : ''}₹${Math.abs(x).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    expect(net).toContain(fmt(view.netDataPack))
    expect(net).toContain(fmt(view.netConservative))
    expect(step('annual').result).toContain(`₹${view.annualCr.toFixed(0)} cr`)
    expect(view.annualCr).toBeCloseTo(annualNetCr(15, view.observedUplift, { ...DEFAULTS, baselineSuccess: 60 }), 6)
  })

  it('net per 100 in the working matches saving minus cost', () => {
    const { view } = build()
    const delta = view.observedUplift
    expect(view.netDataPack).toBeCloseTo(120 * delta - 15 * (60 + delta), 6)
    expect(netPer100(delta, { ...DEFAULTS, baselineSuccess: 60 })).toBeCloseTo(view.netDataPack, 6)
  })

  it('shows cost per delivery to one decimal, matching the deck at 17% RTO', () => {
    const { step } = build()
    expect(costPerSuccessfulDelivery(RTO_TODAY)).toBeCloseTo(84.82, 1)
    expect(step('cost-per-delivery').result).toContain('₹84.8 →')
  })

  it('says every hub starts from the same rate, and shows the three risk bands around the baseline (70 / 60 / 50)', () => {
    const { step } = build()
    expect(step('baseline').plain).toMatch(/same in every hub|every hub/i)
    expect(step('baseline').working).toContain(BAND_OFFSETS.map((o) => `${Math.round((0.6 + o) * 100)}%`).join(' / '))
    expect(step('baseline').working).not.toMatch(/cityFactor/i)
  })

  it('states the Hold & Re-home break-even as 5.5%', () => {
    const { step } = build()
    expect(routerBreakEven()).toBeCloseTo(0.0552, 3)
    expect(step('router-break-even').result).toContain('5.5%')
  })

  it('states the sample size for the current sliders', () => {
    const { step } = build({ ...DEFAULT_CONTROLS, days: 10, flaggedPerDay: 50 })
    expect(step('sample').working).toContain('4 × 10 × 50 = 2,000')
  })

  it('explains that overall RTO is 17% from the data pack, and labels the 60% as our assumption', () => {
    const { step } = build()
    expect(step('flag-rto').result).toContain('17%')
    expect(step('flag-rto').plain).toMatch(/our assumption/i)
    expect(step('flag-rto').plain).toMatch(/Control group measures it/)
    expect(step('flag-rto').source).toBe('assumption')
  })
})

describe('maths explainer: the pair-by-pair range, with the numbers on screen', () => {
  it('lists the pair gaps, their average and their spread', () => {
    const { step, view } = build()
    const v = view.result.verdictResult
    expect(step('pair-gaps').working).toContain(`${v.pairs} pairs`)
    expect(step('pair-gaps').working).toContain(view.result.pooled.gaps[0].toFixed(1))
    expect(step('uplift').working).toContain(view.observedUplift.toFixed(2))
    expect(step('uplift').result).toContain(view.observedUplift.toFixed(1))
    expect(step('spread').result).toContain(v.spreadPer100.toFixed(1))
  })

  it('builds the range as average ± multiplier × spread ÷ √pairs, using the multiplier for this many pairs', () => {
    const { step, view } = build()
    const v = view.result.verdictResult
    const t = tQuantile975(v.pairs - 1)
    expect(step('ci').working).toContain(t.toFixed(2))
    expect(step('ci').working).toContain(v.spreadPer100.toFixed(2))
    expect(step('ci').formula).toMatch(/spread ÷ √pairs/)
    expect(step('ci').result).toContain(Math.abs(view.result.pooled.ci95[0]).toFixed(1))
    expect(step('ci').result).toContain(Math.abs(view.result.pooled.ci95[1]).toFixed(1))
    expect(step('ci').plain).toMatch(/about 2/)
  })

  it('shows the fair-comparison numbers behind the tick', () => {
    const { step, view } = build()
    expect(step('fair').result).toMatch(/fair/i)
    expect(step('fair').working).toContain((view.result.fairness.pastRate.bonus * 100).toFixed(1))
    expect(step('fair').working).toContain((view.result.fairness.pastRate.control * 100).toFixed(1))
  })

  it('puts the smallest detectable effect and the stricter cross-check in the extra section only', () => {
    const { sections, step, view } = build()
    const extra = sections.find((s) => s.id === 'extra')!
    expect(extra.steps.map((s) => s.id)).toEqual(['mde', 'cross-check'])
    const v = view.result.verdictResult
    expect(step('mde').result).toContain(v.mdePer100.toFixed(1))
    expect(step('mde').formula).toMatch(/2\.8/)
    expect(step('cross-check').working).toContain(Math.abs(v.crossCheck.ci95[0]).toFixed(1))
    expect(step('cross-check').result).toMatch(v.crossCheck.sameCall ? /same call|agree/i : /different call|look twice/i)
  })

  it('says the two methods agree on the default pilot', () => {
    expect(build().step('cross-check').result).toMatch(/agree|same call/i)
  })

  it('reports the normal-order comparison pair by pair, too', () => {
    const { step, view } = build()
    expect(step('normal').working).toMatch(/pair/i)
    expect(step('normal').result).toContain(Math.abs(view.result.pooled.normalDeltaPts).toFixed(1))
  })
})

describe('maths explainer: follows the sliders', () => {
  it('says KILL in the verdict step when the bonus does nothing', () => {
    const { step } = build({ ...DEFAULT_CONTROLS, uplift: 0 })
    expect(step('rules').result).toBe('KILL')
    expect(step('rules').working).toMatch(/kill floor of \+3/)
  })

  it('says GO on the low end of the range, not the point estimate, for a strong uplift', () => {
    const { step } = build({ ...DEFAULT_CONTROLS, uplift: 25 })
    expect(step('rules').result).toBe('GO')
    expect(step('rules').working).toMatch(/low end of the range/)
    expect(step('rules').formula).toMatch(/low end of the range ≥ break-even/)
  })

  it('names the normal-order safety rule when spillover is bad', () => {
    const { step } = build({ ...DEFAULT_CONTROLS, uplift: 15, spillover: -3 })
    expect(step('rules').result).toBe('KILL')
    expect(step('rules').working).toMatch(/Safety rule broken \(normal orders\)/)
  })

  it('says INVALID when the rule is loosened after planning', () => {
    const { step } = build({ ...DEFAULT_CONTROLS, uplift: 25, ruleChanged: true })
    expect(step('rules').result).toBe('INVALID')
    expect(step('rules').working).toMatch(/rule changed after planning/i)
  })

  it('states how many pairs there are for the current sliders', () => {
    const { step } = build({ ...DEFAULT_CONTROLS, ridersPerHub: 8 })
    expect(step('pairing').result).toBe('16 pairs of riders')
  })

  it('says the rule needs 6 pairs', () => {
    expect(build().step('rules').formula).toMatch(/< 6 pairs/)
  })

  it('handles a pilot with no data', () => {
    const { step } = build({ ...DEFAULT_CONTROLS, days: 0 })
    expect(step('rules').result).toBe('NO DATA')
    expect(step('rules').working).toMatch(/No data/)
  })

  it('a different bonus changes cost, net and break-even', () => {
    const a = build({ ...DEFAULT_CONTROLS, bonus: 10 })
    const b = build({ ...DEFAULT_CONTROLS, bonus: 20 })
    expect(a.step('break-even').result).not.toBe(b.step('break-even').result)
    expect(a.step('cost').result).not.toBe(b.step('cost').result)
  })
})

describe('toPlainText', () => {
  it('includes every heading and each step\'s formula and result', () => {
    const { sections } = build()
    const text = toPlainText(sections)
    for (const s of sections) expect(text).toContain(s.heading)
    expect(text).toContain('Formula: gap in a pair = (Bonus rider’s rate − partner’s rate) × 100')
    expect(text).toContain('Result:')
  })
})

describe('maths explainer: follows the targeting choice', () => {
  it('names the cut, the lower baseline and the smaller yearly volume for the top 10%', async () => {
    const { withTargeting } = await import('./pilotModel.ts')
    const { step, view } = build(withTargeting(DEFAULT_CONTROLS, 10))
    expect(step('flag-share').title).toBe('Flag the top 10%')
    expect(step('flag-rto').result).toMatch(/baseline 51%/)
    expect(step('flag-rto').source).toBe('assumption')
    expect(step('flagged-year').result).toBe('76.5 million flagged orders a year')
    expect(view.breakEven).toBeCloseTo((15 * 51) / 105, 6)
    expect(view.rtoPoints).toBeCloseTo(view.observedUplift * 0.1, 9)
  })
})
