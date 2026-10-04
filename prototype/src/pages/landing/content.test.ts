import { describe, expect, it } from 'vitest'
import { DEMO_STEPS, HERO, MOVES, REAL_VS_SIMULATED } from './content.ts'

describe('the landing hero presents the whole toolkit, not only the bonus', () => {
  const heroText = `${HERO.title} ${HERO.titleSpan} ${HERO.pitch}`

  it('the headline is not about the bonus alone', () => {
    expect(`${HERO.title} ${HERO.titleSpan}`).not.toMatch(/₹15|bonus/i)
  })

  it('the pitch names all three tools and the fair test', () => {
    expect(heroText).toMatch(/₹15/)
    expect(heroText).toMatch(/fake attempt/i)
    expect(heroText).toMatch(/hub captain/i)
    expect(heroText).toMatch(/refused parcel/i)
    expect(heroText).toMatch(/fair test/i)
  })

  it('the "what you will see" flow has a step for each tool', () => {
    const flow = HERO.flow.map((f) => `${f.label} ${f.note}`).join(' ')
    expect(HERO.flow.length).toBeGreaterThanOrEqual(5)
    expect(flow).toMatch(/₹15/)
    expect(flow).toMatch(/hub captain/i)
    expect(flow).toMatch(/refused parcel/i)
    expect(flow).toMatch(/GO, RE-PRICE or KILL/)
  })

  it('the moves put fake-attempt control next to the bonus, and say it works without it', () => {
    const now = MOVES.find((m) => m.tag === 'Now')!
    expect(`${now.title} ${now.text}`).toMatch(/fake-attempt/i)
    expect(now.text).toMatch(/with or without the bonus/i)
    expect(MOVES.map((m) => m.title).join(' ')).toMatch(/Refused-Parcel Router/)
  })
})

const pilotRow = REAL_VS_SIMULATED.find((r) => r.layer === 'Pilot A/B')!
const pilotStep = DEMO_STEPS.find((s) => s.id === 'pilot')!

const refuseStep = DEMO_STEPS.find((s) => s.id === 'refuse')!

describe('landing copy walks the Desk in the order it now works', () => {
  it('the refusal step says to inspect the parcel before Hold, because Hold needs an inspection', () => {
    expect(refuseStep.doThis).toMatch(/Record inspection/)
    expect(refuseStep.doThis.indexOf('Record inspection')).toBeLessThan(refuseStep.doThis.indexOf('Hold'))
    expect(refuseStep.doThis).toMatch(/Simulate a buyer now/)
  })

  it('mentions the match forecast the hold rule reads', () => {
    expect(refuseStep.see).toMatch(/forecast/i)
    expect(refuseStep.see).toMatch(/low end/i)
  })
})

describe('landing copy describes the paired pilot, not the old clustered one', () => {
  it('the real-vs-simulated pilot row names pairs on past delivery rate, the pair-by-pair range, the fair check and two safety rules', () => {
    expect(pilotRow.real).toMatch(/paired on past delivery rate/)
    expect(pilotRow.real).toMatch(/pair-by-pair 95% range/)
    expect(pilotRow.real).toMatch(/fair-comparison check/)
    expect(pilotRow.real).toMatch(/two safety rules/)
    expect(pilotRow.real).toMatch(/INVALID/)
  })

  it('says nothing the judge must look up', () => {
    const text = REAL_VS_SIMULATED.map((r) => `${r.real} ${r.simulated}`).join(' ') + DEMO_STEPS.map((s) => `${s.doThis} ${s.see}`).join(' ')
    expect(text).not.toMatch(/clustered|\bICC\b|design effect|\bMDE\b|t-value|interval|smallest detectable/i)
  })

  it('the pilot walkthrough step points at the fair-comparison line and the Pilot 2 next step', () => {
    expect(pilotStep.doThis).toMatch(/Fair comparison/)
    expect(pilotStep.see).toMatch(/Pilot 2/)
    expect(pilotStep.doThis).toMatch(/Top 10%/)
    expect(pilotStep.doThis).toMatch(/Loosen the rule/)
  })

  it('does not claim the default answer is RE-PRICE or that the top 10% turns it to GO', () => {
    expect(pilotStep.see).not.toMatch(/deck assumption the answer is RE-PRICE|it becomes GO/)
  })
})

describe('the fake-attempt step says the free re-attempt goes back to the same rider (plan 32 A)', () => {
  const fake = DEMO_STEPS.find((d) => d.id === 'fake')!

  it('the same rider tries again; a strike still loses that order’s ₹15', () => {
    expect(fake.see).toMatch(/same rider tries again/i)
    expect(fake.see).not.toMatch(/another rider/i)
    expect(fake.see).toMatch(/strike/i)
    expect(fake.see).toMatch(/₹15/)
  })
})
