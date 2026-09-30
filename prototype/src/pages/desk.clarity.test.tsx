// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoStops } from '../domain/selectors.ts'
import type { DayState } from '../domain/types.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import type { Store } from '../store/types.ts'
import Desk from './Desk.tsx'

/** Desk step 1 (plan 21): what-if toggles that only preview, three money tiles, three headline assumptions. */
let store: Store
const state = (): DayState => store.getState('lucknow')!

/** The first demo refusal is the showcase parcel: every gate passes, so the Router picks Hold & Re-home. */
async function refuseShowcase(): Promise<void> {
  const hero = demoStops(state()).bonus[0]
  await store.send('lucknow', { type: 'riderRefuse', orderId: hero })
  const code = /(\d{4})/.exec(state().messages.filter((m) => m.orderId === hero && m.kind === 'refusal_otp').at(-1)!.text)![1]
  await store.send('lucknow', { type: 'submitOtp', orderId: hero, code })
  // The hub operator inspects it: the facts are what the synthetic parcel really is.
  const { id, parcel } = state().parcels[0]
  await store.send('lucknow', { type: 'deskInspect', parcelId: id, unopened: parcel.unopened, sealOk: parcel.sealOk, invoiceOutside: parcel.invoiceOutside })
}

const showDesk = (): void => {
  cleanup()
  render(
    <MemoryRouter initialEntries={['/desk?hub=lucknow']}>
      <StoreProvider store={store}>
        <Desk />
      </StoreProvider>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
  await store.send('lucknow', { type: 'startDay' })
})

afterEach(cleanup)

describe('desk: a what-if toggle only previews', () => {
  it('flipping the seal shows a one-line before/after and never changes the parcel', async () => {
    await refuseShowcase()
    showDesk()
    const gates = await screen.findByRole('region', { name: 'Router gate checklist' })
    expect(within(gates).getByText(/never changes the parcel/i)).toBeTruthy()
    fireEvent.click(within(gates).getByRole('switch', { name: 'What-if: Seal intact' }))
    const line = await screen.findByRole('status', { name: 'What-if result' })
    expect(line.textContent).toMatch(/Seal broken: Hold lane closed, now Consolidated return, EV \+₹\d+ → \+₹36/)
    // The checklist still shows the real gate, and the saved parcel is untouched.
    expect(within(gates).getByText('Seal check passed')).toBeTruthy()
    expect(state().parcels[0].parcel.sealOk).toBe(true)
    expect(state().version).toBeGreaterThan(0)
    const versionBefore = state().version
    fireEvent.click(within(gates).getByRole('button', { name: 'Clear what-if' }))
    await waitFor(() => expect(screen.queryByRole('status', { name: 'What-if result' })).toBeNull())
    expect(state().version).toBe(versionBefore)
  })

  it('a flip back to the real value clears the preview', async () => {
    await refuseShowcase()
    showDesk()
    const gates = await screen.findByRole('region', { name: 'Router gate checklist' })
    const toggle = within(gates).getByRole('switch', { name: 'What-if: Seal intact' })
    fireEvent.click(toggle)
    await screen.findByRole('status', { name: 'What-if result' })
    fireEvent.click(toggle)
    await waitFor(() => expect(screen.queryByRole('status', { name: 'What-if result' })).toBeNull())
  })
})

describe('desk: the three money tiles', () => {
  it('shows booked so far, still in play and the cost of sending everything back, each labelled', async () => {
    await refuseShowcase()
    showDesk()
    const money = await screen.findByRole('region', { name: 'Money today' })
    expect(within(money).getByText('Booked so far (net)')).toBeTruthy()
    expect(within(money).getByText('Still in play (expected)')).toBeTruthy()
    expect(within(money).getByText('Cost of sending everything back')).toBeTruthy()
    // One refused parcel: nothing booked yet, ₹120 to send it back, one parcel in play.
    expect(within(money).getByLabelText('Booked so far').textContent).toBe('₹0')
    expect(within(money).getByLabelText('Cost of sending everything back').textContent).toBe('₹120')
    expect(within(money).getByText(/1 open parcel/)).toBeTruthy()
    expect(within(money).getByText(/assumption/i)).toBeTruthy()
    expect(screen.queryByText(/Router effect on these parcels/)).toBeNull()
  })

  it('books the hold cost as a real cost and says so', async () => {
    await refuseShowcase()
    await store.send('lucknow', { type: 'deskHold', parcelId: state().parcels[0].id })
    showDesk()
    const money = await screen.findByRole('region', { name: 'Money today' })
    expect(within(money).getByLabelText('Booked so far').textContent).toBe('−₹8')
    expect(within(money).getByText(/₹0 saved/)).toBeTruthy()
    expect(within(money).getByText(/₹8 spent/)).toBeTruthy()
  })
})

describe('desk: three headline assumptions', () => {
  it('shows the soft-refusal accept rate, conversion and shelf capacity up front, with the seven rates folded', async () => {
    await refuseShowcase()
    showDesk()
    const panel = await screen.findByRole('region', { name: 'Router assumptions' })
    const soft = within(panel).getByLabelText(/Soft-refusal accept rate/)
    expect(within(panel).getByLabelText(/Share of nearby demand/)).toBeTruthy()
    expect(within(panel).getByLabelText(/Shelf capacity/)).toBeTruthy()
    // The shipped defaults differ slightly (50% / 50% / 40%), so the headline is honest and says mixed.
    expect(within(panel).getByText(/mixed/i)).toBeTruthy()
    const more = within(panel).getByText(/More: the seven accept rates/).closest('details')!
    expect(more.open).toBe(false)
    expect(within(more).getAllByLabelText(/P\(accepts a second chance\)/)).toHaveLength(7)
    fireEvent.change(soft, { target: { value: '0.3' } })
    await waitFor(() => expect(state().router.acceptByReason.not_home).toBe(0.3))
    expect(state().router.acceptByReason.no_cash).toBe(0.3)
    expect(state().router.acceptByReason.want_later).toBe(0.3)
    // Editing one of the seven rows afterwards makes the headline "mixed" again.
    const row = within(more).getByLabelText(/P\(accepts a second chance\) · No cash on hand/)
    fireEvent.change(row, { target: { value: '0.2' } })
    await waitFor(() => expect(within(panel).getByText(/mixed/i)).toBeTruthy())
  })
})
