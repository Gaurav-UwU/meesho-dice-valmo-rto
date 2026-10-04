// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

/** Plan 33 on the Demo customer phone: the first message in both languages, the language question, then Hindi. */
let store: Store
const state = (): DayState => store.getState('lucknow')!

const show = (orderId: string): void => {
  cleanup()
  render(
    <MemoryRouter initialEntries={[`/customer?hub=lucknow&order=${orderId}`]}>
      <StoreProvider store={store}>
        <Customer />
      </StoreProvider>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
  await store.send('lucknow', { type: 'startDay' })
})
afterEach(cleanup)

describe('customer phone: Hindi or English', () => {
  it('shows the first message in both languages and asks which language; tapping हिंदी switches the later messages', async () => {
    const hero = demoStops(state()).bonus[0]
    show(hero)
    const user = userEvent.setup()
    expect(await screen.findByText(/Which language should we use/)).toBeTruthy()
    expect(screen.getAllByText(/Meesho ऑर्डर/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'हिंदी' }))
    await waitFor(() => expect(state().stops[hero].lang).toBe('hi'))
    expect(await screen.findByText(/आगे के संदेश हिंदी में/)).toBeTruthy()
    // The first message's buttons still work after the language question.
    await user.click(screen.getByRole('button', { name: /I'm home/ }))
    await waitFor(() => expect(state().stops[hero].replies).toEqual(['home']))
    expect(await screen.findByText(/धन्यवाद/)).toBeTruthy()
    // A later check arrives in Hindi.
    await store.send('lucknow', { type: 'riderAttempt', orderId: hero, claim: 'customer_unavailable' })
    expect(await screen.findByText(/क्या डिलीवरी एजेंट आप तक पहुँचा/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /नहीं, एजेंट आया ही नहीं/ }))
    await waitFor(() => expect(state().stops[hero].answers.riderReached).toBe(false))
  })
})
