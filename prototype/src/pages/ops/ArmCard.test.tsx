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

  it('shows the fake-attempt check as a count, not a hidden zero: suspected attempts out of attempts, with strikes apart', () => {
    const { bonus } = heroStops(day)
    const faked = run(day, { type: 'riderAttempt', at: AT, orderId: bonus, claim: 'customer_unavailable', evidence: { gpsDistM: 900, calls: 0, waitMin: 0 } })
    show(faked)
    const line = screen.getByText(/Fake-attempt check/).closest('p')!
    expect(line.textContent).toMatch(/1 of 1 attempts? by Bonus riders looks fake/)
    expect(line.textContent).toMatch(/0 confirmed by Ops/)
    expect(line.textContent).toMatch(/30 attempts/)
  })

  it('says so when no attempt has been logged yet', () => {
    show(day)
    expect(screen.getByText(/Fake-attempt check/).closest('p')!.textContent).toMatch(/no attempts logged yet/i)
  })

  it('says INVALID when the rule is loosened after the day was planned', () => {
    show(day, { ...verdictConfigFor(day.config), killFloor: 1 })
    expect(screen.getByRole('status', { name: 'Verdict: INVALID' })).toBeTruthy()
    expect(screen.getByText(/Rule changed after planning/)).toBeTruthy()
  })
})
