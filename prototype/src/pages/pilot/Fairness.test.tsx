// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { checkFairness, DEFAULT_PILOT, simulatePilot } from '../../engine/pilot.ts'
import { Fairness } from './Fairness.tsx'

afterEach(cleanup)

const even = [1 / 3, 1 / 3, 1 / 3]

describe('Fair-comparison line', () => {
  it('says the groups are fairly matched, in one line, for default settings', () => {
    render(<Fairness fairness={simulatePilot(DEFAULT_PILOT).fairness} />)
    expect(screen.getByRole('status').textContent).toContain('✔ Fair comparison: same rider skill, same parcel risk mix')
  })

  it('folds the small table under the line, showing the past rate and the three risk bands for both groups', () => {
    const f = checkFairness({ pastRate: { bonus: 0.602, control: 0.598 }, bandMix: { bonus: [0.34, 0.33, 0.33], control: [0.33, 0.34, 0.33] } })
    render(<Fairness fairness={f} />)
    const details = document.querySelector('details')!
    expect(details.hasAttribute('open')).toBe(false)
    const table = within(details).getByRole('table')
    const rows = within(table).getAllByRole('row').map((r) => r.textContent)
    expect(rows[0]).toMatch(/Bonus group.*Control group/)
    expect(rows.join('|')).toMatch(/Average past delivery rate.*60\.2%.*59\.8%/)
    expect(rows.join('|')).toMatch(/High.*34%.*33%/)
    expect(rows.join('|')).toMatch(/Very high.*33%.*34%/)
    expect(rows.join('|')).toMatch(/Extreme.*33%.*33%/)
  })

  it('warns instead of ticking when the groups differ by more than 5 points', () => {
    const f = checkFairness({ pastRate: { bonus: 0.68, control: 0.6 }, bandMix: { bonus: even, control: even } })
    render(<Fairness fairness={f} />)
    const line = screen.getByRole('status')
    expect(line.textContent).not.toContain('✔')
    expect(line.textContent).toMatch(/not matched/i)
    expect(line.textContent).toContain('8.0 points')
  })

  it('warns about the risk mix when one band is over-represented', () => {
    const f = checkFairness({ pastRate: { bonus: 0.6, control: 0.6 }, bandMix: { bonus: [0.45, 0.3, 0.25], control: even } })
    render(<Fairness fairness={f} />)
    expect(screen.getByRole('status').textContent).toMatch(/risk mix differs/i)
  })

  it('uses no statistics words', () => {
    render(<Fairness fairness={simulatePilot(DEFAULT_PILOT).fairness} />)
    expect(document.body.textContent).not.toMatch(/clustered|ICC|design effect|MDE|t-value|interval/i)
  })
})
