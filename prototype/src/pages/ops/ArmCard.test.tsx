// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { verdictConfigFor } from '../../domain/rule.ts'
import { kpis } from '../../domain/selectors.ts'
import { AT, heroStops, run, startedDay } from '../../domain/testkit.ts'
import { dayHeadline, dayVerdict } from '../../domain/verdictData.ts'
import type { DayState } from '../../domain/types.ts'
import { ArmCard } from './ArmCard.tsx'

afterEach(cleanup)

const show = (s: DayState, config = verdictConfigFor(s.config)) => {
  const verdict = dayVerdict(s, config)
  render(
    <MemoryRouter>
      <ArmCard kpis={kpis(s)} verdict={verdict} headline={dayHeadline(s, verdict)} />
    </MemoryRouter>,
  )
}

describe('Ops Bonus-vs-Control card', () => {
  const day = startedDay()

  it('says INCOMPLETE on a fresh day, honestly, with the smallest detectable effect and a provisional headline', () => {
    show(day)
    expect(screen.getByRole('status', { name: 'Verdict: INCOMPLETE' })).toBeTruthy()
    expect(screen.getByText(/Provisional/)).toBeTruthy()
    expect(screen.getByText(/Not enough finished orders in both arms yet/)).toBeTruthy()
    expect(screen.getByText(/Smallest effect this pilot could detect/)).toBeTruthy()
  })

  it('shows every flagged order as still in its arm: open orders are counted, not dropped', () => {
    const { bonus, control } = heroStops(day)
    const s = run(day, { type: 'customerReply', at: AT, orderId: bonus, reply: 'change_time' }, { type: 'customerReply', at: AT, orderId: control, reply: 'change_time' })
    show(s)
    const k = kpis(s)
    expect(screen.getAllByText(new RegExp(`of ${k.flaggedBonus.n} not final yet`)).length).toBe(1)
    expect(k.flaggedBonus.open).toBe(k.flaggedBonus.n)
  })

  it('states the headline as what the bonus caused once both arms have attempted orders', () => {
    const { bonus, control } = heroStops(day)
    const deliver = (s: DayState, id: string): DayState =>
      run(s, { type: 'riderDeliver', at: AT + 1, orderId: id, code: '1111' }, { type: 'submitOtp', at: AT + 2, orderId: id, code: '1111' })
    show(deliver(deliver(day, bonus), control))
    expect(screen.getByText(/The bonus caused/)).toBeTruthy()
    expect(screen.queryByText(/\d+% of (risky|flagged) orders (were )?delivered/i)).toBeNull()
  })

  it('says each Bonus rider is compared with a partner, and how many pairs have finished flagged orders', () => {
    show(day)
    expect(screen.getByText(/compared with an equally-skilled partner: 0 pairs have finished flagged orders so far/)).toBeTruthy()
  })

  it('shows the fake-attempt check as counts for BOTH arms, not a hidden zero, with strikes apart and the limit against Control', () => {
    const { bonus, control } = heroStops(day)
    const faked = run(
      day,
      { type: 'riderAttempt', at: AT, orderId: bonus, claim: 'customer_unavailable', evidence: { gpsDistM: 900, calls: 0, waitMin: 0 } },
      { type: 'riderAttempt', at: AT, orderId: control, claim: 'customer_unavailable', evidence: { gpsDistM: 40, calls: 3, waitMin: 6 } },
    )
    show(faked)
    const line = screen.getByText(/Fake-attempt check/).closest('p')!
    expect(line.textContent).toMatch(/Bonus riders: 1 of 1 attempt looks fake/)
    expect(line.textContent).toMatch(/Control riders: 0 of 1 attempt looks fake/)
    expect(line.textContent).toMatch(/0 confirmed/)
    expect(line.textContent).toMatch(/more than 2 points above Control/)
    expect(line.textContent).toMatch(/30 attempts/)
  })

  it('says so when no attempt has been logged yet', () => {
    show(day)
    expect(screen.getByText(/Fake-attempt check/).closest('p')!.textContent).toMatch(/no attempts logged yet/i)
  })

  it('watches returns, Bonus against Control, and says they never stop the pilot', () => {
    const { bonus, control } = heroStops(day)
    const deliver = (s: DayState, id: string): DayState =>
      run(s, { type: 'riderDeliver', at: AT + 1, orderId: id, code: '1111' }, { type: 'submitOtp', at: AT + 2, orderId: id, code: '1111' })
    show(run(deliver(deliver(day, bonus), control), { type: 'openReturn', at: AT + 500, orderId: bonus }))
    const line = screen.getByText(/Returns \(watched\)/).closest('p')!
    expect(line.textContent).toMatch(/Bonus riders: 1 of 1 delivered flagged orders returned/)
    expect(line.textContent).toMatch(/Control riders: 0 of 1/)
    expect(line.textContent).toMatch(/not a stop rule/i)
  })

  it('shows a dash for returns, not 0%, before anything is delivered', () => {
    show(day)
    expect(screen.getByText(/Returns \(watched\)/).closest('p')!.textContent).toMatch(/nothing delivered yet/i)
  })

  it('says INVALID when the rule is loosened after the day was planned', () => {
    show(day, { ...verdictConfigFor(day.config), killFloor: 1 })
    expect(screen.getByRole('status', { name: 'Verdict: INVALID' })).toBeTruthy()
    expect(screen.getByText(/Rule changed after planning/)).toBeTruthy()
  })
})
