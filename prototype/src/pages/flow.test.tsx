// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoRiders, demoStops, kpis, riderEarnings, suspectStops } from '../domain/selectors.ts'
import type { DayState } from '../domain/types.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import type { Store } from '../store/types.ts'
import Customer from './Customer.tsx'
import Rider from './Rider.tsx'

/**
 * The hero loop through the real screens, sharing one store the way two browser tabs do:
 * customer taps → rider delivers with an OTP → ₹15 pending for a Bonus rider (and nothing for a Control rider)
 * → failed attempt is questioned on WhatsApp → the suspect lands in the ops queue.
 */
let store: Store

const state = (): DayState => store.getState('lucknow')!

const show = (url: string, page: 'rider' | 'customer'): void => {
  cleanup()
  render(
    <MemoryRouter initialEntries={[url]}>
      <StoreProvider store={store}>{page === 'rider' ? <Rider /> : <Customer />}</StoreProvider>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
  await store.send('lucknow', { type: 'startDay' })
})

afterEach(cleanup)

describe('hero loop through the screens', () => {
  it('the customer taps "I\'m home" and it is recorded', async () => {
    const hero = demoStops(state()).bonus[0]
    show(`/customer?hub=lucknow&order=${hero}`, 'customer')
    const user = userEvent.setup()
    expect(await screen.findByText(/Arriving Today/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /I'm home/ }))
    await waitFor(() => expect(state().stops[hero].replies).toEqual(['home']))
  })

  it('the rider card and the customer phone show the same order id and AWB, so the two phones can be matched', async () => {
    const rider = demoRiders(state()).bonus!
    const hero = demoStops(state()).bonus[0]
    const awb = state().stops[hero].order.awb
    show(`/rider?hub=lucknow&rider=${rider.id}`, 'rider')
    const card = (await screen.findAllByText(new RegExp(`Order ${hero}`)))[0]
    expect(card.textContent).toContain(awb)
    show(`/customer?hub=lucknow&order=${hero}`, 'customer')
    const option = (await screen.findAllByRole('option')).find((o) => (o as HTMLOptionElement).value === hero)!
    expect(option.textContent).toContain(hero)
    expect(option.textContent).toContain(awb)
  })

  it('a Bonus rider sees the ₹+15 chip, delivers with the OTP and earns ₹15 pending', async () => {
    const rider = demoRiders(state()).bonus!
    const hero = demoStops(state()).bonus[0]
    show(`/rider?hub=lucknow&rider=${rider.id}`, 'rider')
    const user = userEvent.setup()
    expect((await screen.findAllByText(/Bonus Eligible/)).length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: 'Deliver' })[0])
    const otpMessage = state().messages.filter((m) => m.orderId === hero && m.kind === 'delivery_otp').at(-1)!
    const code = /(\d{4})/.exec(otpMessage.text)![1]
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByLabelText('Digit 1'))
    await user.keyboard(code)
    await user.click(within(dialog).getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(state().stops[hero].status).toBe('delivered_a1'))
    expect(state().ledger).toHaveLength(1)
    expect(riderEarnings(state(), rider.id)).toMatchObject({ deliveries: 1, bonusPending: 15 })
    expect(kpis(state()).bonusPending).toBe(15)
  })

  it('a wrong code does not deliver, and shows how many tries are left', async () => {
    const rider = demoRiders(state()).bonus!
    const hero = demoStops(state()).bonus[0]
    show(`/rider?hub=lucknow&rider=${rider.id}`, 'rider')
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Deliver' }))[0])
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByLabelText('Digit 1'))
    await user.keyboard('0000')
    await user.click(within(dialog).getByRole('button', { name: 'Submit' }))
    expect(await screen.findByText(/Wrong code\. 4 tries left/)).toBeTruthy()
    expect(state().stops[hero].status).toBe('otp_sent')
    expect(state().ledger).toHaveLength(0)
  })

  it('a Control rider never sees the chip, a Priority filter or any bonus wording', async () => {
    const control = demoRiders(state()).control!
    show(`/rider?hub=lucknow&rider=${control.id}`, 'rider')
    await screen.findAllByRole('button', { name: 'Deliver' })
    expect(screen.queryByText(/Bonus/i)).toBeNull()
    expect(screen.queryByText(/Rescue/i)).toBeNull()
    expect(screen.queryByText(/score/i)).toBeNull()
    expect(screen.queryByText(/Priority/)).toBeNull()
  })

  it('a rider-claimed attempt the customer denies lands in the suspect queue', async () => {
    const rider = demoRiders(state()).bonus!
    const hero = demoStops(state()).bonus[0]
    show(`/rider?hub=lucknow&rider=${rider.id}`, 'rider')
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Attempted' }))[0])
    await user.click(await screen.findByRole('button', { name: 'Customer unavailable' }))
    await waitFor(() => expect(state().stops[hero].status).toBe('ndr'))

    show(`/customer?hub=lucknow&order=${hero}`, 'customer')
    await user.click(await screen.findByRole('button', { name: /never came/ }))
    await waitFor(() => expect(suspectStops(state()).map((s) => s.order.id)).toEqual([hero]))
  })

  it('a not-home order is tried again the next day as attempt 2, delivered in the same arm, and the bonus is paid', async () => {
    const rider = demoRiders(state()).bonus!
    const hero = demoStops(state()).bonus[0]
    show(`/rider?hub=lucknow&rider=${rider.id}`, 'rider')
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Attempted' }))[0])
    await user.click(await screen.findByRole('button', { name: 'Customer unavailable' }))
    await waitFor(() => expect(state().stops[hero].status).toBe('ndr'))
    expect(state().stops[hero].arm).toBe('bonus')

    await store.send('lucknow', { type: 'nextDay' })
    await waitFor(() => expect(state().stops[hero].status).toBe('out_for_delivery'))
    expect(state().stops[hero].failedAttempts).toBe(1)

    show(`/rider?hub=lucknow&rider=${rider.id}`, 'rider')
    expect((await screen.findAllByText(/Attempt 2: an earlier attempt/)).length).toBeGreaterThan(0)
    await user.click(screen.getAllByRole('button', { name: 'Deliver' })[0])
    const code = /(\d{4})/.exec(state().messages.filter((m) => m.orderId === hero && m.kind === 'delivery_otp').at(-1)!.text)![1]
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByLabelText('Digit 1'))
    await user.keyboard(code)
    await user.click(within(dialog).getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(state().stops[hero].status).toBe('delivered_a2'))
    expect(state().stops[hero].arm).toBe('bonus')
    expect(state().ledger).toHaveLength(1)
    expect(kpis(state()).flaggedBonus.delivered).toBe(1)
  })

  it('every screen carries the prototype footer', async () => {
    const hero = demoStops(state()).bonus[0]
    show(`/customer?hub=lucknow&order=${hero}`, 'customer')
    expect((await screen.findAllByText(/Not an official Valmo app/)).length).toBeGreaterThan(0)
    show('/rider?hub=lucknow', 'rider')
    expect((await screen.findAllByText(/Not an official Valmo app/)).length).toBeGreaterThan(0)
  })
})
