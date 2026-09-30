// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoStops } from '../domain/selectors.ts'
import type { DayState } from '../domain/types.ts'
import type { RefusalReason } from '../engine/router.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import type { Store } from '../store/types.ts'
import Desk from './Desk.tsx'

/** Desk step 2 (plan 21): the Inspect step, the item-condition chip and skipping the second chance. */
let store: Store
const state = (): DayState => store.getState('lucknow')!

async function refuse(reason?: RefusalReason): Promise<void> {
  const hero = demoStops(state()).bonus[0]
  await store.send('lucknow', { type: 'riderRefuse', orderId: hero, reason })
  const code = /(\d{4})/.exec(state().messages.filter((m) => m.orderId === hero && m.kind === 'refusal_otp').at(-1)!.text)![1]
  await store.send('lucknow', { type: 'submitOtp', orderId: hero, code })
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

describe('desk: Inspect parcel', () => {
  it('a parcel nobody has inspected offers the form, says Hold is closed, and keeps the what-if switches off', async () => {
    await refuse()
    showDesk()
    const card = await screen.findByRole('article', { name: /Refused parcel/ })
    const form = within(card).getByRole('group', { name: 'Inspect parcel' })
    expect(within(form).getByLabelText('Unopened')).toBeTruthy()
    expect(within(form).getByLabelText('Seal intact')).toBeTruthy()
    expect(within(form).getByLabelText('Invoice outside the parcel')).toBeTruthy()
    expect(within(form).getByLabelText(/Photo note/)).toBeTruthy()
    expect(within(card).getByText(/Inspect the parcel to unlock Hold & Re-home/)).toBeTruthy()
    expect(within(card).queryByRole('button', { name: /^Hold 48h/ })).toBeNull()
    for (const sw of within(card).getAllByRole('switch')) expect((sw as HTMLButtonElement).disabled).toBe(true)
  })

  it('recording the inspection stores who and what, unlocks Hold & Re-home, and shows the record', async () => {
    await refuse()
    showDesk()
    const card = await screen.findByRole('article', { name: /Refused parcel/ })
    fireEvent.change(within(card).getByLabelText(/Photo note/), { target: { value: 'label outside' } })
    fireEvent.click(within(card).getByRole('button', { name: 'Record inspection' }))
    await waitFor(() => expect(state().parcels[0].inspection).toBeDefined())
    expect(state().parcels[0].inspection).toMatchObject({ by: 'Hub operator', photoNote: 'label outside' })
    const after = await screen.findByRole('article', { name: /Refused parcel/ })
    await waitFor(() => expect(within(after).getByRole('button', { name: /^Hold 48h/ })).toBeTruthy())
    expect(within(after).getAllByText(/Inspected by Hub operator/).length).toBeGreaterThanOrEqual(2) // the record and the Inspected gate
    expect(within(after).getByText(/photo: label outside/)).toBeTruthy()
    expect(within(after).getByText(/nothing is uploaded/i)).toBeTruthy()
    for (const sw of within(after).getAllByRole('switch')) expect((sw as HTMLButtonElement).disabled).toBe(false)
  })

  it('what the operator ticks decides the lane: a broken seal keeps the parcel out of Hold', async () => {
    await refuse()
    showDesk()
    const card = await screen.findByRole('article', { name: /Refused parcel/ })
    const seal = within(card).getByLabelText('Seal intact') as HTMLInputElement
    if (seal.checked) fireEvent.click(seal)
    fireEvent.click(within(card).getByRole('button', { name: 'Record inspection' }))
    await waitFor(() => expect(state().parcels[0].inspection?.sealOk).toBe(false))
    const after = await screen.findByRole('article', { name: /Refused parcel/ })
    expect(within(after).queryByRole('button', { name: /^Hold 48h/ })).toBeNull()
    expect(within(after).getByRole('button', { name: /Add to consolidated return/ })).toBeTruthy()
  })
})

describe('desk: a damaged or wrong item', () => {
  it('shows the Item condition OK gate failing and a Seller claim / QC needed chip, and offers no hold', async () => {
    await refuse('damaged')
    const p = state().parcels[0]
    await store.send('lucknow', { type: 'deskInspect', parcelId: p.id, unopened: true, sealOk: true, invoiceOutside: true })
    showDesk()
    const card = await screen.findByRole('article', { name: /Refused parcel/ })
    expect(within(card).getByText('Seller claim / QC needed')).toBeTruthy()
    const gates = within(card).getByRole('region', { name: 'Router gate checklist' })
    expect(within(gates).getByText('Item condition OK')).toBeTruthy()
    expect(within(gates).getByText(/never re-homed/i)).toBeTruthy()
    expect(within(card).queryByRole('button', { name: /^Hold 48h/ })).toBeNull()
  })

  it('an ordinary refusal has no such chip', async () => {
    await refuse('not_ordered')
    showDesk()
    const card = await screen.findByRole('article', { name: /Refused parcel/ })
    expect(within(card).queryByText('Seller claim / QC needed')).toBeNull()
  })
})

describe('desk: skip the second chance', () => {
  it('offers four reasons, logs the skip, sends no message and moves the parcel on', async () => {
    await refuse('not_home')
    showDesk()
    const card = await screen.findByRole('article', { name: /Refused parcel/ })
    const why = within(card).getByLabelText('Why skip the second chance?') as HTMLSelectElement
    expect([...why.options].map((o) => o.text).filter((t) => !/^Choose/.test(t))).toEqual([
      'Customer already refused firmly at the door',
      'Customer not reachable',
      "Seller wants it back",
      'Other',
    ])
    const skip = within(card).getByRole('button', { name: 'Skip second chance' }) as HTMLButtonElement
    expect(skip.disabled).toBe(true)
    fireEvent.change(why, { target: { value: 'not_reachable' } })
    expect(skip.disabled).toBe(false)
    const messagesBefore = state().messages.length
    fireEvent.click(skip)
    await waitFor(() => expect(state().parcels[0].skipReason).toBe('not_reachable'))
    expect(state().messages).toHaveLength(messagesBefore)
    const after = await screen.findByRole('article', { name: /Refused parcel/ })
    expect(within(after).queryByRole('button', { name: 'Send second-chance WhatsApp' })).toBeNull()
    expect(within(after).getByText(/Second chance skipped: customer not reachable/i)).toBeTruthy()
  })

  it('a parcel whose lane is not the second chance has no skip control', async () => {
    await refuse('not_ordered')
    showDesk()
    const card = await screen.findByRole('article', { name: /Refused parcel/ })
    expect(within(card).queryByRole('button', { name: 'Skip second chance' })).toBeNull()
  })
})
