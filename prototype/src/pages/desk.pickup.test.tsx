// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoStops } from '../domain/selectors.ts'
import type { DayState } from '../domain/types.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import type { Store } from '../store/types.ts'
import Customer from './Customer.tsx'
import Desk from './Desk.tsx'

/** Desk step 4 (plan 21): the second-chance options and the hub pickup, through the real Customer and Desk screens. */
let store: Store
const state = (): DayState => store.getState('lucknow')!
let hero = ''

const show = (page: 'customer' | 'desk'): void => {
  cleanup()
  render(
    <MemoryRouter initialEntries={[page === 'customer' ? `/customer?hub=lucknow&order=${hero}` : '/desk?hub=lucknow']}>
      <StoreProvider store={store}>{page === 'customer' ? <Customer /> : <Desk />}</StoreProvider>
    </MemoryRouter>,
  )
}

/** The hero stop is refused as "not home" (soft), inspected, and the operator sends the second chance. */
async function offerSecondChance(): Promise<string> {
  await store.send('lucknow', { type: 'riderRefuse', orderId: hero, reason: 'not_home' })
  const otp = /(\d{4})/.exec(state().messages.filter((m) => m.orderId === hero && m.kind === 'refusal_otp').at(-1)!.text)![1]
  await store.send('lucknow', { type: 'submitOtp', orderId: hero, code: otp })
  const id = state().parcels[0].id
  await store.send('lucknow', { type: 'deskSecondChance', parcelId: id })
  return id
}

beforeEach(async () => {
  store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
  await store.send('lucknow', { type: 'startDay' })
  hero = demoStops(state()).bonus[0]
})

afterEach(cleanup)

describe('the customer phone offers the options', () => {
  it('shows Deliver again, Different time, Pay now by UPI (COD only), Pick up at hub and Cancel order', async () => {
    await offerSecondChance()
    show('customer')
    for (const name of [/Deliver again/, /Different time/, /Pick up at hub/, /Cancel order/]) expect(await screen.findByRole('button', { name })).toBeTruthy()
    const cod = state().stops[hero].order.payment === 'COD'
    expect(screen.queryByRole('button', { name: /Pay now by UPI/ }) !== null).toBe(cod)
  })

  it('Different time asks which day, then books it', async () => {
    const id = await offerSecondChance()
    show('customer')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Different time/ }))
    await user.click(await screen.findByRole('button', { name: 'Tomorrow' }))
    await waitFor(() => expect(state().parcels.find((p) => p.id === id)!.state).toBe('recovered'))
    expect(state().stops[hero].status).toBe('rescheduled')
  })

  it('Pick up at hub shows the pickup code and the instructions in the reply', async () => {
    const id = await offerSecondChance()
    show('customer')
    await userEvent.setup().click(await screen.findByRole('button', { name: /Pick up at hub/ }))
    await waitFor(() => expect(state().parcels.find((p) => p.id === id)!.state).toBe('pickup_reserved'))
    expect((await screen.findAllByText(/pickup code/i)).length).toBeGreaterThan(0)
  })
})

describe('the Desk while the customer is choosing, and at the counter', () => {
  it('says what the customer is doing: choosing a day, or paying', async () => {
    const id = await offerSecondChance()
    await store.send('lucknow', { type: 'customerSecondChance', parcelId: id, accept: true, option: 'later' })
    show('desk')
    expect(await screen.findByText(/choosing a day/i)).toBeTruthy()
  })

  it('a reserved pickup shows the window, takes the customer\'s code, counts wrong tries, and on the right code closes the sale', async () => {
    const id = await offerSecondChance()
    await store.send('lucknow', { type: 'customerSecondChance', parcelId: id, accept: true, option: 'pickup' })
    const code = state().parcels.find((p) => p.id === id)!.pickup!.code
    show('desk')
    const card = await screen.findByRole('article', { name: /Refused parcel/ })
    expect(within(card).getByText('Waiting for pickup')).toBeTruthy()
    expect(within(card).getByText(/h left of 48/)).toBeTruthy()
    expect(card.textContent).not.toContain(code)
    const input = within(card).getByLabelText('Pickup code from the customer')
    const hand = within(card).getByRole('button', { name: 'Customer collected' })
    fireEvent.change(input, { target: { value: code === '0000' ? '1111' : '0000' } })
    fireEvent.click(hand)
    await waitFor(() => expect(state().parcels.find((p) => p.id === id)!.pickup!.tries).toBe(1))
    expect(await within(card).findByText(/Wrong code: 1 of 5 tries used/)).toBeTruthy()
    fireEvent.change(input, { target: { value: code } })
    fireEvent.click(hand)
    await waitFor(() => expect(state().parcels.find((p) => p.id === id)!.state).toBe('picked_up'))
    expect(state().stops[hero].status).toBe('hub_pickup')
    const done = await screen.findByRole('region', { name: 'Done today' })
    expect(within(done).getByText(/Collected at the hub with a verified code/)).toBeTruthy()
    const money = screen.getByRole('region', { name: 'Money today' })
    // ₹120 saved, less the ₹8 shelf slot and the two WhatsApp messages the Router sent (the offer and the code reply): ₹112 before messages.
    expect(within(money).getByLabelText('Booked so far').textContent).toBe('+₹111')
  })

  it('for a COD parcel the operator can note that the cash was taken at the hub', async () => {
    const id = await offerSecondChance()
    await store.send('lucknow', { type: 'customerSecondChance', parcelId: id, accept: true, option: 'pickup' })
    const code = state().parcels.find((p) => p.id === id)!.pickup!.code
    show('desk')
    const card = await screen.findByRole('article', { name: /Refused parcel/ })
    const cod = state().stops[hero].order.payment === 'COD'
    const cash = within(card).queryByLabelText('Cash collected at the hub')
    expect(cash !== null).toBe(cod)
    if (cash) fireEvent.click(cash)
    fireEvent.change(within(card).getByLabelText('Pickup code from the customer'), { target: { value: code } })
    fireEvent.click(within(card).getByRole('button', { name: 'Customer collected' }))
    await waitFor(() => expect(state().parcels.find((p) => p.id === id)!.state).toBe('picked_up'))
    expect(state().parcels.find((p) => p.id === id)!.pickup!.cashCollected).toBe(cod)
  })

  it('shows the shelf as shared: a pickup uses a slot', async () => {
    const id = await offerSecondChance()
    await store.send('lucknow', { type: 'customerSecondChance', parcelId: id, accept: true, option: 'pickup' })
    show('desk')
    const panel = await screen.findByRole('region', { name: 'Router assumptions' })
    expect(within(panel).getByText(/Shelf: 1 of 30 slots in use/)).toBeTruthy()
  })
})

describe('a reset day clears the pickup shelf and its timers (the sync session\'s day id)', () => {
  it('the new day has no parcels, an empty shelf and no overdue timer, and a tap made on the old day is refused', async () => {
    const id = await offerSecondChance()
    await store.send('lucknow', { type: 'customerSecondChance', parcelId: id, accept: true, option: 'pickup' })
    const oldDay = state()
    expect(oldDay.parcels[0].state).toBe('pickup_reserved')
    await store.reset('lucknow')
    const fresh = state()
    expect(fresh.dayId).not.toBe(oldDay.dayId)
    expect(fresh.parcels).toEqual([])
    const { shelfUsed } = await import('../domain/routing.ts')
    const { overdueTimers } = await import('../domain/tick.ts')
    expect(shelfUsed(fresh)).toBe(0)
    expect(overdueTimers(fresh)).toEqual([])
  })
})
