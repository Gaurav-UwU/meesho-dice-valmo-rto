// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { pointForecast, posterior, type DemandForecast } from '../../engine/demand.ts'
import { DEFAULT_ROUTER_PARAMS, type RefusedParcel } from '../../engine/router.ts'
import { BacktestPanel } from './BacktestPanel.tsx'
import { ForecastBlock } from './ForecastBlock.tsx'

afterEach(cleanup)

const forecastOf = (priorRate: number, strength: number, orders: number, extra: Partial<DemandForecast> = {}): DemandForecast => ({
  ...pointForecast(priorRate),
  ...posterior(priorRate, strength, orders, 336),
  exactOrders: orders,
  similarOrders: 41,
  similar: [{ skuId: 'SKU-002', cosine: 0.6 }],
  keywords: ['kurti', 'cotton', 'blue'],
  confidence: 'Medium',
  evidence: `${orders} exact-SKU orders and 41 similar (kurti, cotton, blue) in 14 days`,
  ...extra,
})

const parcel = (forecast: DemandForecast): RefusedParcel => ({
  id: 'P-1',
  awb: 'SYN1',
  hubId: 'lucknow',
  hubState: 'UP',
  buyerState: 'UP',
  sellerId: 'UP-S01',
  sellerState: 'UP',
  sellerGst: false,
  skuId: 'SKU-017',
  value: 265,
  reason: 'not_ordered',
  unopened: true,
  sealOk: true,
  sellerOptedIn: true,
  invoiceOutside: true,
  demandRate: 0.123456,
  forecast,
})

describe('the forecast block on a Desk card', () => {
  it('shows the chance of a buyer, its range against the 5.5% line, the confidence, the evidence and the keyword chips', () => {
    render(<ForecastBlock parcel={parcel(forecastOf(0.006, 10, 3))} params={DEFAULT_ROUTER_PARAMS} />)
    const block = screen.getByRole('region', { name: 'Match forecast' })
    expect(within(block).getByText(/14\.3%/)).toBeTruthy()
    expect(within(block).getByText(/9\.8%/)).toBeTruthy()
    expect(within(block).getByText(/5\.5% break-even/)).toBeTruthy()
    expect(within(block).getByText(/low end clears break-even/i)).toBeTruthy()
    expect(within(block).getByText('Medium confidence')).toBeTruthy()
    expect(within(block).getByText('3 exact-SKU orders and 41 similar (kurti, cotton, blue) in 14 days')).toBeTruthy()
    for (const w of ['kurti', 'cotton', 'blue']) expect(within(block).getByText(w)).toBeTruthy()
    expect(within(block).getByRole('img', { name: /Forecast range 9\.8% to .*mean 14\.3%.*break-even 5\.5%/ })).toBeTruthy()
  })

  it('says the hold is closed when only the average clears break-even', () => {
    render(<ForecastBlock parcel={parcel(forecastOf(0.006, 2, 1, { confidence: 'Low' }))} params={DEFAULT_ROUTER_PARAMS} />)
    const block = screen.getByRole('region', { name: 'Match forecast' })
    expect(within(block).getByText(/low end is below break-even/i)).toBeTruthy()
    expect(within(block).getByText('Low confidence')).toBeTruthy()
  })

  it('labels the numbers as a model on synthetic history, never shows the hidden rate, and says a similar listing is never the parcel', () => {
    render(<ForecastBlock parcel={parcel(forecastOf(0.006, 10, 3))} params={DEFAULT_ROUTER_PARAMS} />)
    const block = screen.getByRole('region', { name: 'Match forecast' })
    expect(within(block).getByText('model')).toBeTruthy()
    expect(within(block).getByText(/history is synthetic/i)).toBeTruthy()
    expect(within(block).getByText(/same seller and the same listing/i)).toBeTruthy()
    expect(block.textContent).not.toContain('0.123456')
    expect(block.textContent).not.toContain('12.3')
  })

  it('names the listing the forecast is about', () => {
    render(<ForecastBlock parcel={parcel(forecastOf(0.006, 10, 3))} params={DEFAULT_ROUTER_PARAMS} />)
    expect(screen.getByText(/SKU-017/)).toBeTruthy()
  })

  it('renders nothing for a parcel with no forecast', () => {
    const { container } = render(<ForecastBlock parcel={{ ...parcel(forecastOf(0.006, 10, 3)), forecast: undefined }} params={DEFAULT_ROUTER_PARAMS} />)
    expect(container.textContent).toBe('')
  })

  it('follows the assumptions: a lower conversion shows a lower forecast', () => {
    render(<ForecastBlock parcel={parcel(forecastOf(0.006, 10, 3))} params={{ ...DEFAULT_ROUTER_PARAMS, conversion: 0.1 }} />)
    expect(screen.queryByText(/14\.3%/)).toBeNull()
    expect(screen.getByText(/low end is below break-even/i)).toBeTruthy()
  })
})

describe('the backtest panel', () => {
  it('is folded, and computes nothing until it is opened', () => {
    render(<BacktestPanel />)
    const panel = screen.getByRole('group', { name: 'Backtest of the match forecast' }) as HTMLDetailsElement
    expect(panel.open).toBe(false)
    expect(screen.queryByRole('table', { name: 'Forecast against what happened' })).toBeNull()
  })

  it('shows predicted against actual in bins, the Brier score, and what each hold rule did, labelled synthetic', () => {
    render(<BacktestPanel />)
    const panel = screen.getByRole('group', { name: 'Backtest of the match forecast' }) as HTMLDetailsElement
    panel.open = true
    fireEvent(panel, new Event('toggle'))
    const table = screen.getByRole('table', { name: 'Forecast against what happened' })
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 6)
    expect(within(panel).getByText(/Brier score/)).toBeTruthy()
    expect(within(panel).getByText(/history is synthetic/i)).toBeTruthy()
    expect(within(panel).getByText(/real calibration comes from pilot data/i)).toBeTruthy()
    const rules = screen.getByRole('table', { name: 'Hold rules compared' })
    expect(within(rules).getByText('Hold if the low end clears 5.5%')).toBeTruthy()
    expect(within(rules).getByText('Hold if the average clears 5.5%')).toBeTruthy()
    expect(within(rules).getByText('Hold every parcel')).toBeTruthy()
  })
})
