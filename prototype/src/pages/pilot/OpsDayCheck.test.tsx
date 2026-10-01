// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getHub } from '../../engine/hubs.ts'
import { syntheticGeo } from '../../engine/synthetic-geo.ts'
import { createLocalStore } from '../../store/local.ts'
import { StoreProvider } from '../../store/StoreContext.tsx'
import type { Store } from '../../store/types.ts'
import { OpsDayCheck } from './OpsDayCheck.tsx'

let store: Store

const show = () =>
  render(
    <MemoryRouter initialEntries={['/pilot?hub=lucknow']}>
      <StoreProvider store={store}>
        <OpsDayCheck simulatedPerArm={6000} />
      </StoreProvider>
    </MemoryRouter>,
  )

const card = () => screen.getByRole('region', { name: "Check today's Ops day" })

beforeEach(() => {
  store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
})
afterEach(cleanup)

describe("Check today's Ops day", () => {
  it('says how to get a day when the Ops console has not started one', async () => {
    show()
    expect(await within(card()).findByText(/No day on the Ops console yet/)).toBeTruthy()
    expect(within(card()).getByRole('link', { name: /Open the Ops console/ }).getAttribute('href')).toBe('/ops?hub=lucknow')
  })

  it('judges a running day with the same rule: usually INCOMPLETE, with how far along it is', async () => {
    await store.send('lucknow', { type: 'startDay' })
    await store.autopilot('lucknow', 40)
    show()
    const c = await screen.findByRole('region', { name: "Check today's Ops day" })
    await waitFor(() => expect(c.querySelector('.pilot-opsday-word')?.textContent).toBe('INCOMPLETE'))
    expect(c.textContent).toMatch(/Flagged orders final/)
    // No range while the day is incomplete: early on only deliveries are final, so it would look falsely perfect.
    expect(within(c).queryByRole('img', { name: /true effect is probably/ })).toBeNull()
    const bar = within(c).getByRole('progressbar', { name: 'Flagged orders with a final outcome' })
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeLessThan(90)
    expect(c.textContent).toMatch(/Provisional/)
  })

  it('shows the returned share Bonus vs Control as WATCHED, with a dash before anything is delivered, and no stop rule', async () => {
    await store.send('lucknow', { type: 'startDay' })
    show()
    const c = await screen.findByRole('region', { name: "Check today's Ops day" })
    const row = await within(c).findByText('Returned (watched)')
    expect(row.parentElement?.textContent).toMatch(/Bonus —/)
    expect(row.parentElement?.textContent).toMatch(/Control —/)
    expect(c.textContent).toMatch(/not a stop rule/i)
  })

  it('compares the size of one day with the 30-day simulation', async () => {
    await store.send('lucknow', { type: 'startDay' })
    show()
    const c = await screen.findByRole('region', { name: "Check today's Ops day" })
    await waitFor(() => expect(c.textContent).toMatch(/6,000 per arm in the 30-day simulation/))
  })

  it('can finish the day from here (after a confirmation), and then gives a decision-grade verdict', async () => {
    await store.send('lucknow', { type: 'startDay' })
    show()
    const user = userEvent.setup()
    const c = await screen.findByRole('region', { name: "Check today's Ops day" })
    await user.click(within(c).getByRole('button', { name: 'Finish the day' }))
    expect(store.getState('lucknow')?.simNow).toBe(8 * 3_600_000)
    await user.click(within(c).getByRole('button', { name: 'Yes, finish it' }))
    await waitFor(() => expect(['GO', 'RE-PRICE', 'KILL']).toContain(c.querySelector('.pilot-opsday-word')?.textContent))
    expect(c.textContent).not.toMatch(/Provisional/)
    expect(within(c).getByRole('img', { name: /true effect is probably/ })).toBeTruthy()
    expect(within(c).queryByRole('progressbar')).toBeNull()
    expect(within(c).queryByRole('button', { name: 'Finish the day' })).toBeNull()
  })
})
