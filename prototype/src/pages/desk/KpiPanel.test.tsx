// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { deskKpis, type DeskKpis } from '../../domain/deskKpis.ts'
import { startedDay } from '../../domain/testkit.ts'
import { KpiPanel } from './KpiPanel.tsx'

afterEach(cleanup)

const empty = deskKpis(startedDay())

const filled: DeskKpis = {
  ...empty,
  salesSaved: { n: 40, value: 0.45, tooEarly: false },
  acceptRate: { n: 40, value: 0.6, tooEarly: false },
  matchRate: { n: 12, value: 0.25, tooEarly: true, open: 2 },
  forecastedMatch: 0.18,
  pickupRate: { n: 10, value: 0.7, tooEarly: true, collected: 7, noShows: 2, open: 1 },
  dwellHours: { n: 35, value: 31.4, tooEarly: false },
  bookedPerParcel: { n: 50, value: 23.5, tooEarly: false },
  skips: { total: 4, byReason: { refused_firmly: 2, not_reachable: 1, seller_wants_back: 1, other: 0 }, share: 0.08 },
  days: 12,
}

describe('the pilot KPI panel', () => {
  it('an empty day shows dashes and "too early", never a fake zero, and says what is not simulated', () => {
    render(<KpiPanel kpis={empty} />)
    const panel = screen.getByRole('region', { name: 'Pilot KPIs' })
    for (const label of ['Sales saved', 'Second-chance accept rate', 'Re-home match rate', 'Pickup rate', 'Average dwell', '₹ booked per refused parcel']) {
      const row = within(panel).getByText(label).closest('li')!
      expect(within(row).getByText('–')).toBeTruthy()
      expect(within(row).getByText(/too early/i)).toBeTruthy()
    }
    expect(panel.textContent).not.toMatch(/(^|[^\d.])0%/)
    expect(within(panel).getByText(/Custody incidents and Customer complaints are not simulated/)).toBeTruthy()
    expect(within(panel).getByText(/Not judged yet/)).toBeTruthy()
  })

  it('shows the value, the sample size, and the too-early flag only where the lane has fewer than 30 parcels', () => {
    render(<KpiPanel kpis={filled} />)
    const panel = screen.getByRole('region', { name: 'Pilot KPIs' })
    const row = (label: string) => within(panel).getByText(label).closest('li')!
    expect(within(row('Sales saved')).getByText(/45\.0%/)).toBeTruthy()
    expect(within(row('Sales saved')).getByText(/n = 40/)).toBeTruthy()
    expect(within(row('Sales saved')).queryByText(/too early/i)).toBeNull()
    expect(within(row('Re-home match rate')).getByText(/too early/i)).toBeTruthy()
    expect(within(row('Re-home match rate')).getByText(/25\.0%/)).toBeTruthy()
    expect(within(row('Re-home match rate')).getByText(/5\.5% break-even/)).toBeTruthy()
    expect(within(row('Re-home match rate')).getByText(/forecast said 18\.0%/)).toBeTruthy()
    expect(within(row('Pickup rate')).getByText(/7 collected/)).toBeTruthy()
    expect(within(row('Pickup rate')).getByText(/2 no-shows/)).toBeTruthy()
    expect(within(row('Average dwell')).getByText(/31\.4 h/)).toBeTruthy()
    expect(within(row('₹ booked per refused parcel')).getByText(/₹23\.5/)).toBeTruthy()
  })

  it('lists the skips and the reasons behind them', () => {
    render(<KpiPanel kpis={filled} />)
    const panel = screen.getByRole('region', { name: 'Pilot KPIs' })
    const row = within(panel).getByText('Second chances skipped').closest('li')!
    expect(within(row).getByText(/4 \(8\.0% of refused parcels\)/)).toBeTruthy()
    expect(within(row).getByText(/Customer already refused firmly at the door: 2/)).toBeTruthy()
    expect(within(row).queryByText(/Other: 0/)).toBeNull()
  })

  it('labels the numbers as simulated outcomes and explains the floor of 30', () => {
    render(<KpiPanel kpis={filled} />)
    const panel = screen.getByRole('region', { name: 'Pilot KPIs' })
    expect(within(panel).getByText('simulated')).toBeTruthy()
    expect(within(panel).getByText(/too early until a lane has 30 parcels/i)).toBeTruthy()
  })

  it('shows the kill rule as it stands', () => {
    render(<KpiPanel kpis={{ ...filled, killRule: { status: 'kill', text: 'Kill rule tripped: the match rate is under 3% after 30 days. Stop the Hold lane.' } }} />)
    expect(screen.getByText(/Kill rule tripped/)).toBeTruthy()
  })
})
