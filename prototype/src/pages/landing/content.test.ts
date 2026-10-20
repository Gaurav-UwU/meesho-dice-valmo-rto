import { describe, expect, it } from 'vitest'
import { runAudit } from '../../domain/audit.ts'
import { startedDay } from '../../domain/testkit.ts'
import { DEMO_STEPS, HERO, MOVES, REAL_VS_SIMULATED } from './content.ts'

describe('the landing hero follows the final deck (slide 2), not only the bonus', () => {
  const heroText = `${HERO.title} ${HERO.titleSpan} ${HERO.pitch}`

  it('the headline is not about the bonus alone', () => {
    expect(`${HERO.title} ${HERO.titleSpan}`).not.toMatch(/₹15|bonus/i)
  })

  it('the headline carries the deck: cut RTO at the last mile and prove it pays', () => {
    expect(`${HERO.title} ${HERO.titleSpan}`).toMatch(/Cut RTO at the last mile and prove it pays/)
  })

  it('the pitch leads with the research finding, then names the three pilot pieces, the router and the pilot', () => {
    expect(heroText).toMatch(/Seven in ten failed orders could still have been delivered/)
    expect(heroText).toMatch(/₹15/)
    expect(heroText).toMatch(/hub captain/i)
    expect(heroText).toMatch(/WhatsApp/)
    expect(heroText).toMatch(/refused/i)
    expect(heroText).toMatch(/90-day pilot/)
  })

  it('the copy has no dashes as connectors (humanizer rule)', () => {
    const all = [HERO.title, HERO.titleSpan, HERO.pitch, ...HERO.flow.flatMap((f) => [f.label, f.note]), ...MOVES.flatMap((m) => [m.title, m.text])].join(' ')
    expect(all).not.toMatch(/[—–]| -- /)
  })

  it('the "what you will see" flow has a step for each tool', () => {
    const flow = HERO.flow.map((f) => `${f.label} ${f.note}`).join(' ')
    expect(HERO.flow.length).toBeGreaterThanOrEqual(5)
    expect(flow).toMatch(/₹15/)
    expect(flow).toMatch(/hub captain/i)
    expect(flow).toMatch(/WhatsApp/)
    expect(flow).toMatch(/refused parcel/i)
    expect(flow).toMatch(/GO, RE-PRICE or KILL/)
    expect(flow).toMatch(/₹120/)
  })

  it('now is the pilot (bonus, verification, WhatsApp), and verification and WhatsApp outlive a stopped bonus', () => {
    const now = MOVES.find((m) => m.tag === 'Now')!
    expect(`${now.title} ${now.text}`).toMatch(/90-day pilot/i)
    expect(now.text).toMatch(/attempt verification/i)
    expect(now.text).toMatch(/WhatsApp/)
    expect(now.text).toMatch(/bonus is stopped, verification and WhatsApp keep running/i)
  })

  it('next is the router, later is the deck long game: price per stop and the delivery map', () => {
    expect(MOVES.find((m) => m.tag === 'Next')!.title).toMatch(/Refused-Parcel Router/)
    const later = MOVES.find((m) => m.tag === 'Later')!
    expect(`${later.title} ${later.text}`).toMatch(/price per stop/i)
    expect(later.text).toMatch(/delivery map/i)
  })
})

describe('the audit step states the real number of checks', () => {
  const WORDS: Readonly<Record<number, string>> = { 18: 'Eighteen', 19: 'Nineteen', 20: 'Twenty', 21: 'Twenty-one' }

  it('names as many checks as the audit runs', () => {
    const n = runAudit(startedDay()).length
    const audit = DEMO_STEPS.find((s) => s.id === 'audit')!
    expect(audit.see.startsWith(`${WORDS[n]} checks`)).toBe(true)
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

describe('the customer step says the WhatsApp asks Hindi or English (plan 33)', () => {
  it('names the first message in both languages and the हिंदी choice', () => {
    const customer = DEMO_STEPS.find((d) => d.id === 'customer')!
    expect(`${customer.doThis} ${customer.see}`).toMatch(/English and Hindi/)
    expect(`${customer.doThis} ${customer.see}`).toMatch(/हिंदी/)
  })
})
