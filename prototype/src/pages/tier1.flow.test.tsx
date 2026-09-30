// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DAY_MS, DAY_START_MS, SIM_START } from '../domain/clock.ts'
import { demoRiders, demoStops } from '../domain/selectors.ts'
import type { DayState } from '../domain/types.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import type { Store } from '../store/types.ts'
import Audit from './Audit.tsx'
import Customer from './Customer.tsx'
import Desk from './Desk.tsx'
import Ops from './Ops.tsx'
import Rider from './Rider.tsx'

// The map needs a real browser (canvas, ResizeObserver); everything else on the Ops screen is exercised.
vi.mock('./ops/LiveMap.tsx', () => ({ LiveMap: () => null }))

/** Tier 1 through the real screens: refusal reasons, evidence at the door, the exception queue, Pay now, the sim clock, the Audit. */
let store: Store
const state = (): DayState => store.getState('lucknow')!

type Page = 'rider' | 'customer' | 'ops' | 'audit' | 'desk'
const PAGES = { rider: Rider, customer: Customer, ops: Ops, audit: Audit, desk: Desk } as const

const show = (url: string, page: Page): void => {
  cleanup()
  const Component = PAGES[page]
  render(
    <MemoryRouter initialEntries={[url]}>
      <StoreProvider store={store}>
        <Component />
      </StoreProvider>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
  await store.send('lucknow', { type: 'startDay' })
})

afterEach(cleanup)

describe('rider: refusal reasons and proof at the door', () => {
  it('the rider says why the customer refuses, and the parcel carries that reason to the Desk', async () => {
    const rider = demoRiders(state()).bonus!
    const hero = demoStops(state()).bonus[0]
    show(`/rider?hub=lucknow&rider=${rider.id}`, 'rider')
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Refused' }))[0])
    const sheet = await screen.findByRole('dialog', { name: /Why is the customer refusing/ })
    expect(within(sheet).getAllByRole('button').length).toBeGreaterThanOrEqual(7)
    await user.click(within(sheet).getByRole('button', { name: 'No cash on hand' }))
    const code = /(\d{4})/.exec(state().messages.filter((m) => m.orderId === hero && m.kind === 'refusal_otp').at(-1)!.text)![1]
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByLabelText('Digit 1'))
    await user.keyboard(code)
    await user.click(within(dialog).getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(state().stops[hero].status).toBe('refused'))
    expect(state().parcels[0].parcel.reason).toBe('no_cash')
  })

  it('logging an attempt from far away opens an exception that Ops can settle', async () => {
    const rider = demoRiders(state()).bonus!
    const hero = demoStops(state()).bonus[0]
    show(`/rider?hub=lucknow&rider=${rider.id}`, 'rider')
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Attempted' }))[0])
    await user.click(await screen.findByRole('button', { name: /Demo: log it from far away/ }))
    await user.click(screen.getByRole('button', { name: 'Customer unavailable' }))
    await waitFor(() => expect(state().exceptions).toHaveLength(1))
    expect(state().stops[hero].confidence).toBe('low')

    show('/ops?hub=lucknow', 'ops')
    const queue = await screen.findByRole('region', { name: 'Exception queue' })
    expect(within(queue).getByText(/low confidence/)).toBeTruthy()
    await user.click(within(queue).getByRole('button', { name: 'Free re-attempt' }))
    await waitFor(() => expect(state().exceptions[0].status).toBe('resolved'))
    expect(state().stops[hero].status).toBe('out_for_delivery')
    expect(state().stops[hero].riderId).not.toBe(rider.id)
  })

  it('a well-evidenced attempt (at the door, two calls, ten minutes) is trusted and opens nothing', async () => {
    const rider = demoRiders(state()).bonus!
    const hero = demoStops(state()).bonus[0]
    show(`/rider?hub=lucknow&rider=${rider.id}`, 'rider')
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Attempted' }))[0])
    await user.click(await screen.findByRole('button', { name: /I'm at the door/ }))
    await user.click(screen.getByRole('button', { name: 'Call customer' }))
    await user.click(screen.getByRole('button', { name: 'Call customer' }))
    await user.click(screen.getByRole('button', { name: /Waited 5 more min/ }))
    await user.click(screen.getByRole('button', { name: /Waited 5 more min/ }))
    await user.click(screen.getByRole('button', { name: 'Customer unavailable' }))
    await waitFor(() => expect(state().stops[hero].status).toBe('ndr'))
    expect(state().stops[hero].confidence).toBe('high')
    expect(state().exceptions).toHaveLength(0)
  })
})

describe('customer: Pay now needs a payment', () => {
  it('shows the payment prompt, and a failed payment leaves the order on COD', async () => {
    const codId = state().stopOrder.find((id) => state().stops[id].flagged && state().stops[id].order.payment === 'COD' && state().stops[id].manual)
    expect(codId).toBeDefined()
    if (!codId) return
    show(`/customer?hub=lucknow&order=${codId}`, 'customer')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Pay now/ }))
    const fail = await screen.findByRole('button', { name: /Payment failed/ })
    await user.click(fail)
    await waitFor(() => expect(state().stops[codId].paymentPending).toBe(false))
    expect(state().stops[codId].order.payment).toBe('COD')
  })
})

describe('ops: the sim clock, Close pilot and the Audit', () => {
  it('shows the sim time and moves it with +1 h and +1 day', async () => {
    show('/ops?hub=lucknow', 'ops')
    const user = userEvent.setup()
    expect(await screen.findByText('Day 1 · 08:00')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '+1 h' }))
    await waitFor(() => expect(state().simNow).toBe(SIM_START + 3_600_000))
    expect(await screen.findByText('Day 1 · 09:00')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /\+1 day/ }))
    await waitFor(() => expect(state().simNow).toBe(DAY_MS + DAY_START_MS))
    expect(await screen.findByText('Day 2 · 08:00')).toBeTruthy()
  })

  it('Close pilot (after a confirmation) finishes the day, and the Audit is all green', async () => {
    show('/ops?hub=lucknow', 'ops')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Close pilot' }))
    await user.click(screen.getByRole('button', { name: 'Yes, close the pilot' }))
    await waitFor(() => expect(state().simNow).toBeGreaterThan(SIM_START + 7 * DAY_MS))

    show('/audit?hub=lucknow', 'audit')
    expect(await screen.findByText('All 12 checks are green')).toBeTruthy()
    const list = screen.getByRole('list', { name: 'Audit checks' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(12)
    expect(within(list).getByText(/Nothing delivered without a verified OTP/)).toBeTruthy()
  })

  it('the Audit says so plainly when the day has not started', async () => {
    const fresh = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
    store = fresh
    show('/audit?hub=lucknow', 'audit')
    expect(await screen.findByText(/The day has not started/)).toBeTruthy()
  })

  it('the money ledger lists what was booked, with owners and assumption labels', async () => {
    show('/ops?hub=lucknow', 'ops')
    const ledger = await screen.findByRole('region', { name: 'Costs and savings ledger' })
    expect(within(ledger).getByText('WhatsApp message')).toBeTruthy()
    expect(within(ledger).getAllByText('assumption').length).toBeGreaterThan(0)
  })
})

describe('desk: the Router shows its working', () => {
  it('lists expected values per lane and lets the operator edit an assumption', async () => {
    const hero = demoStops(state()).bonus[0]
    await store.send('lucknow', { type: 'riderRefuse', orderId: hero, reason: 'not_home' })
    const code = /(\d{4})/.exec(state().messages.filter((m) => m.orderId === hero && m.kind === 'refusal_otp').at(-1)!.text)![1]
    await store.send('lucknow', { type: 'submitOtp', orderId: hero, code })
    show('/desk?hub=lucknow', 'desk')
    expect((await screen.findAllByLabelText('Expected values of each lane')).length).toBeGreaterThan(0)
    const assumptions = screen.getByRole('region', { name: 'Router assumptions' })
    const input = within(assumptions).getByLabelText(/Shelf capacity/)
    fireEvent.change(input, { target: { value: '5' } })
    await waitFor(() => expect(state().router.shelfCapacity).toBe(5))
  })
})
