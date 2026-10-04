// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { demoRiders, demoStops } from '../domain/selectors.ts'
import type { DayState } from '../domain/types.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import type { Store } from '../store/types.ts'
import Rider from './Rider.tsx'

/** Plan 32 B through the real rider screen: Call from the task card, the masked-number sheet, and app-logged calls in the Attempted sheet. */
let store: Store
const state = (): DayState => store.getState('lucknow')!

const showRider = (): { rider: string; hero: string } => {
  const rider = demoRiders(state()).bonus!.id
  const hero = demoStops(state()).bonus[0]
  render(
    <MemoryRouter initialEntries={[`/rider?hub=lucknow&rider=${rider}`]}>
      <StoreProvider store={store}>
        <Rider />
      </StoreProvider>
    </MemoryRouter>,
  )
  return { rider, hero }
}

/** The task card of the first demo stop (demo stops are listed first) */
const heroCard = async (): Promise<HTMLElement> => (await screen.findAllByRole('article'))[0]

beforeEach(async () => {
  store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
  await store.send('lucknow', { type: 'startDay' })
})
afterEach(cleanup)

describe('rider: Call customer from the task card', () => {
  it('Call opens a sheet that says the call goes through a masked number (demo: no real call); No answer is logged by the app', async () => {
    const { hero } = showRider()
    const user = userEvent.setup()
    const card = await heroCard()
    await user.click(within(card).getByRole('button', { name: 'Call' }))
    const sheet = await screen.findByRole('dialog', { name: /Call the customer/ })
    expect(within(sheet).getByText(/Calls go through Valmo’s masked number \(demo: no real call\)/)).toBeTruthy()
    await user.click(within(sheet).getByRole('button', { name: 'No answer' }))
    await waitFor(() => expect(state().stops[hero].callLog).toHaveLength(1))
    expect(state().stops[hero].callLog?.[0].answered).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(await heroCard()).getByText(/^1 call · last \d\d:\d\d$/)).toBeTruthy()
  })

  it('Answered is logged too, and Cancel logs nothing', async () => {
    const { hero } = showRider()
    const user = userEvent.setup()
    await user.click(within(await heroCard()).getByRole('button', { name: 'Call' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(state().stops[hero].callLog ?? []).toHaveLength(0)
    await user.click(within(await heroCard()).getByRole('button', { name: 'Call' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Answered' }))
    await waitFor(() => expect(state().stops[hero].callLog?.[0]).toMatchObject({ answered: true }))
  })

  it('shows no real phone number and no tel: link anywhere on the rider app', async () => {
    showRider()
    const user = userEvent.setup()
    await user.click(within(await heroCard()).getByRole('button', { name: 'Call' }))
    await screen.findByRole('dialog')
    expect(document.querySelectorAll('a[href^="tel:"]')).toHaveLength(0)
    expect(document.body.textContent ?? '').not.toMatch(/\+91|\b[6-9]\d{9}\b/)
  })

  it('the Attempted sheet shows the calls the app logged (read-only) and can call now; the attempt carries that count', async () => {
    const { hero } = showRider()
    const user = userEvent.setup()
    await user.click(within(await heroCard()).getByRole('button', { name: 'Call' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'No answer' }))
    await waitFor(() => expect(state().stops[hero].callLog).toHaveLength(1))

    await user.click(within(await heroCard()).getByRole('button', { name: 'Attempted' }))
    const sheet = await screen.findByRole('dialog', { name: /Why could you not deliver/ })
    expect(within(sheet).getByText('1 call logged by the app')).toBeTruthy()
    // The rider cannot type a call count any more.
    expect(within(sheet).queryByRole('button', { name: 'Call customer' })).toBeNull()
    await user.click(within(sheet).getByRole('button', { name: 'Call now' }))
    await user.click(within(await screen.findByRole('dialog', { name: /Call the customer/ })).getByRole('button', { name: 'No answer' }))
    await waitFor(() => expect(state().stops[hero].callLog).toHaveLength(2))
    const again = await screen.findByRole('dialog', { name: /Why could you not deliver/ })
    expect(within(again).getByText('2 calls logged by the app')).toBeTruthy()

    await user.click(within(again).getByRole('button', { name: /I.m at the door/ }))
    await user.click(within(again).getByRole('button', { name: 'Customer unavailable' }))
    await waitFor(() => expect(state().stops[hero].status).toBe('ndr'))
    expect(state().stops[hero].evidence?.calls).toBe(2)
  })

  it('speaks Hindi too', async () => {
    showRider()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'हिंदी' }))
    const card = await heroCard()
    await user.click(within(card).getByRole('button', { name: 'कॉल करें' }))
    const sheet = await screen.findByRole('dialog', { name: 'ग्राहक को कॉल करें' })
    expect(within(sheet).getByRole('button', { name: 'कॉल नहीं उठी' })).toBeTruthy()
    expect(within(sheet).getByRole('button', { name: 'बात हुई' })).toBeTruthy()
  })
})
