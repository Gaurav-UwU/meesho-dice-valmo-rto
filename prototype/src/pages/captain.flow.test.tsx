// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activeCount } from '../domain/captain.ts'
import { demoRiders, demoStops, stopsOf } from '../domain/selectors.ts'
import type { DayState } from '../domain/types.ts'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import type { Store } from '../store/types.ts'
import Captain from './Captain.tsx'
import Ops from './Ops.tsx'
import Rider from './Rider.tsx'

vi.mock('./ops/LiveMap.tsx', () => ({ LiveMap: () => null }))

/** The hub captain's screen, Ops' read-only view, and what the rider sees, through the real screens. */
let store: Store
const state = (): DayState => store.getState('lucknow')!
const PAGES = { captain: Captain, ops: Ops, rider: Rider } as const
const show = (url: string, page: keyof typeof PAGES): void => {
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

const FAR = { gpsDistM: 900, calls: 0, waitMin: 0 }
const AT_DOOR = { gpsDistM: 40, calls: 3, waitMin: 6 }

beforeEach(async () => {
  store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
  await store.send('lucknow', { type: 'startDay' })
})
afterEach(cleanup)

const heroBonus = (): { rider: string; order: string } => ({ rider: demoRiders(state()).bonus!.id, order: demoStops(state()).bonus[0] })

describe('the captain screen', () => {
  it('says who the captain is, that there is no login in the demo, and shows an empty queue honestly', async () => {
    show('/captain?hub=lucknow', 'captain')
    expect(await screen.findByText('demo, no login')).toBeTruthy()
    expect(screen.getByText(/Captain Irfan, Gomti Nagar/)).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Review queue' })).getByText(/Nothing to review/)).toBeTruthy()
  })

  it('shows a disputed attempt with its evidence and the customer’s answer, and a strike needs a reason chip', async () => {
    const { order } = heroBonus()
    await store.send('lucknow', { type: 'riderAttempt', orderId: order, claim: 'customer_unavailable', evidence: FAR })
    show('/captain?hub=lucknow', 'captain')
    const user = userEvent.setup()
    const queue = await screen.findByRole('region', { name: 'Review queue' })
    expect(within(queue).getByText('900 m away')).toBeTruthy()
    expect(within(queue).getByText(/has not answered the WhatsApp check yet/)).toBeTruthy()
    await user.click(within(queue).getByRole('button', { name: /Strike…/ }))
    const record = within(queue).getByRole('button', { name: /Record strike/ }) as HTMLButtonElement
    expect(record.disabled).toBe(true)
    await user.click(within(queue).getByRole('button', { name: 'Phone far from the address' }))
    expect(record.disabled).toBe(false)
    await user.click(record)
    await waitFor(() => expect(state().strikeLog).toHaveLength(1))
    expect(state().strikeLog[0]).toMatchObject({ orderId: order, reason: 'phone_far' })
  })

  it('a customer’s word alone is not enough: it needs a written note', async () => {
    const { order } = heroBonus()
    await store.send('lucknow', { type: 'riderAttempt', orderId: order, claim: 'customer_unavailable', evidence: AT_DOOR })
    await store.send('lucknow', { type: 'customerReach', orderId: order, reached: false })
    show('/captain?hub=lucknow', 'captain')
    const user = userEvent.setup()
    const queue = await screen.findByRole('region', { name: 'Review queue' })
    expect(within(queue).getByText(/says nobody came/)).toBeTruthy()
    expect(within(queue).getByText(/A strike needs more than the customer’s word/)).toBeTruthy()
    await user.click(within(queue).getByRole('button', { name: /Strike…/ }))
    await user.click(within(queue).getByRole('button', { name: 'Customer says nobody came' }))
    const record = within(queue).getByRole('button', { name: /Record strike/ }) as HTMLButtonElement
    expect(record.disabled).toBe(true)
    await user.type(within(queue).getByRole('textbox'), 'Neighbour saw nobody')
    expect(record.disabled).toBe(false)
    await user.click(record)
    await waitFor(() => expect(state().strikeLog).toHaveLength(1))
    expect(state().strikeLog[0].note).toBe('Neighbour saw nobody')
  })

  it('suggests Confirm valid by default when the evidence at the door is strong (enhanced review of a rider with 2 strikes)', async () => {
    const { rider } = heroBonus()
    const bag = stopsOf(state()).filter((x) => x.riderId === rider && x.status === 'out_for_delivery').map((x) => x.order.id)
    for (const id of bag.slice(0, 2)) {
      await store.send('lucknow', { type: 'riderAttempt', orderId: id, claim: 'customer_unavailable', evidence: FAR })
      await store.send('lucknow', { type: 'resolveException', orderId: id, action: 'strike', reason: 'phone_far' })
    }
    expect(activeCount(state(), rider)).toBe(2)
    await store.send('lucknow', { type: 'riderAttempt', orderId: bag[2], claim: 'customer_unavailable', evidence: AT_DOOR })
    show('/captain?hub=lucknow', 'captain')
    const queue = await screen.findByRole('region', { name: 'Review queue' })
    expect(within(queue).getByText(/Suggested: Confirm valid/)).toBeTruthy()
    expect(within(queue).getByText(/enhanced review/)).toBeTruthy()
  })

  it('shows the rider monitor with a status and a timeline on click, and the scorecard', async () => {
    const { rider, order } = heroBonus()
    await store.send('lucknow', { type: 'riderAttempt', orderId: order, claim: 'customer_unavailable', evidence: FAR })
    await store.send('lucknow', { type: 'resolveException', orderId: order, action: 'strike', reason: 'phone_far' })
    show('/captain?hub=lucknow', 'captain')
    const user = userEvent.setup()
    const monitor = await screen.findByRole('region', { name: 'Rider monitor' })
    const name = state().riders.find((r) => r.id === rider)!.name
    expect(within(monitor).getByText('Warning')).toBeTruthy()
    await user.click(within(monitor).getByRole('button', { name }))
    const timeline = within(monitor).getByRole('list', { name: 'Rider timeline' })
    expect(within(timeline).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    const card = screen.getByRole('region', { name: 'Captain scorecard' })
    expect(within(card).getByText('Strikes issued').nextElementSibling?.textContent).toBe('1')
  })

  it('the outcome panel says too early under 30 attempts and labels the 4% as an assumption', async () => {
    show('/captain?hub=lucknow', 'captain')
    const panel = await screen.findByRole('region', { name: 'Outcome of fake-attempt control' })
    expect(within(panel).getByText(/too early: 0 of 30 attempts/)).toBeTruthy()
    expect(panel.textContent).toMatch(/4% fake share in the simulation is an assumption/)
    expect(panel.textContent).toMatch(/part of the hub captain’s job/)
    expect(panel.textContent).not.toMatch(/1 in 10|Minus reviews|₹10/)
  })
})

describe('Ops: read-only, with an overturn', () => {
  it('Ops can overturn a strike within 48 h, and the rider sees it overturned', async () => {
    const { rider, order } = heroBonus()
    await store.send('lucknow', { type: 'riderAttempt', orderId: order, claim: 'customer_unavailable', evidence: FAR })
    await store.send('lucknow', { type: 'resolveException', orderId: order, action: 'strike', reason: 'phone_far' })
    show('/ops?hub=lucknow', 'ops')
    const user = userEvent.setup()
    const queue = await screen.findByRole('region', { name: 'Exception queue' })
    await user.click(within(queue).getByRole('button', { name: 'Overturn' }))
    await waitFor(() => expect(activeCount(state(), rider)).toBe(0))
    show(`/rider?hub=lucknow&rider=${rider}`, 'rider')
    const meter = await screen.findByRole('region', { name: 'Your attempt record' })
    expect(meter.textContent).toMatch(/Overturned/)
  })
})

describe('the rider sees it, in both languages', () => {
  it('a banner on the order under review, the strike meter with the ladder text, and "Ask for a review"', async () => {
    const { rider, order } = heroBonus()
    await store.send('lucknow', { type: 'riderAttempt', orderId: order, claim: 'customer_unavailable', evidence: FAR })
    show(`/rider?hub=lucknow&rider=${rider}`, 'rider')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Failed/ }))
    expect(await screen.findByText('Attempt under review by the hub captain')).toBeTruthy()
    await store.send('lucknow', { type: 'resolveException', orderId: order, action: 'strike', reason: 'phone_far' })
    const meter = await screen.findByRole('region', { name: 'Your attempt record' })
    await waitFor(() => expect(meter.textContent).toMatch(/Strike 1 of 3: warning/))
    expect(meter.textContent).toMatch(/Reason: Phone far from the address/)
    await user.click(within(meter).getByRole('button', { name: 'Ask for a review' }))
    await waitFor(() => expect(state().strikeLog[0].reviewAskedSim).toBeDefined())
    expect(meter.textContent).toMatch(/Review requested/)
  })

  it('Hindi: the strike meter, the ladder text and the banner are translated', async () => {
    const { rider, order } = heroBonus()
    await store.send('lucknow', { type: 'riderAttempt', orderId: order, claim: 'customer_unavailable', evidence: FAR })
    await store.send('lucknow', { type: 'resolveException', orderId: order, action: 'strike', reason: 'phone_far' })
    show(`/rider?hub=lucknow&rider=${rider}`, 'rider')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /हिन्दी|Hindi|हिंदी|HI/ }))
    const meter = await screen.findByRole('region', { name: 'आपका प्रयास रिकॉर्ड' })
    expect(meter.textContent).toMatch(/स्ट्राइक 1 \/ 3: चेतावनी/)
    expect(meter.textContent).toMatch(/कारण: फोन पते से दूर/)
    expect(within(meter).getByRole('button', { name: 'समीक्षा माँगें' })).toBeTruthy()
  })

  it('a Control rider sees the same strike meter: it has nothing to do with the bonus', async () => {
    const control = demoRiders(state()).control!
    show(`/rider?hub=lucknow&rider=${control.id}`, 'rider')
    const meter = await screen.findByRole('region', { name: 'Your attempt record' })
    expect(meter.textContent).toMatch(/No strikes/)
  })
})

describe('the parking-gap hold on the captain screen', () => {
  const heldOrder = async (): Promise<string> => {
    const hero = demoStops(state()).bonus[0]
    await store.send('lucknow', { type: 'riderAttempt', orderId: hero, claim: 'customer_unavailable', evidence: { gpsDistM: 150, calls: 0, waitMin: 2 } })
    await store.send('lucknow', { type: 'reattempt', orderId: hero })
    await store.send('lucknow', { type: 'riderDeliver', orderId: hero })
    const code = /(\d{4})/.exec(state().messages.filter((m) => m.orderId === hero && m.kind === 'delivery_otp').at(-1)!.text)![1]
    await store.send('lucknow', { type: 'submitOtp', orderId: hero, code })
    return hero
  }

  it('a held ₹15 shows for the captain with the weak evidence, and Release clears it', async () => {
    const hero = await heldOrder()
    expect(state().ledger[0].review?.state).toBe('waiting')
    show('/captain?hub=lucknow', 'captain')
    const user = userEvent.setup()
    const held = await screen.findByRole('region', { name: 'Held bonuses' })
    expect(within(held).getByText(/₹15 held/)).toBeTruthy()
    expect(within(held).getByText('150 m away')).toBeTruthy()
    await user.click(within(held).getByRole('button', { name: /Release the ₹15/ }))
    await waitFor(() => expect(state().ledger.find((l) => l.orderId === hero)?.review?.state).toBe('cleared'))
  })

  it('Withhold needs a reason chip', async () => {
    const hero = await heldOrder()
    show('/captain?hub=lucknow', 'captain')
    const user = userEvent.setup()
    const held = await screen.findByRole('region', { name: 'Held bonuses' })
    await user.click(within(held).getByRole('button', { name: /Withhold…/ }))
    await user.click(within(held).getByRole('button', { name: 'Withhold: Phone far from the address' }))
    await waitFor(() => expect(state().ledger.find((l) => l.orderId === hero)?.status).toBe('blocked'))
  })

  it('the rider sees why the ₹15 is waiting, in English and in Hindi', async () => {
    const hero = await heldOrder()
    const rider = state().stops[hero].riderId
    show(`/rider?hub=lucknow&rider=${rider}`, 'rider')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Completed/ }))
    expect(await screen.findByText(/₹15 waiting for the hub captain to review: your earlier attempt on this order: no calls were logged/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /हिन्दी|Hindi|हिंदी|HI/ }))
    expect(await screen.findByText(/हब कैप्टन की समीक्षा का इंतज़ार/)).toBeTruthy()
  })
})

describe('with the bonus OFF the captain screen still works', () => {
  it('shows the review queue and the outcome panel, and no held-bonus panel or bonus-paid line', async () => {
    const { createDay, DEFAULT_CONFIG } = await import('../domain/day.ts')
    const { fakeGeo } = await import('../engine/testkit.ts')
    const { reduce } = await import('../domain/reducer.ts')
    const day = reduce(createDay(fakeGeo(0, 1), { seed: 11, orders: 120, riders: 6, config: { ...DEFAULT_CONFIG, bonus: 0 } }), { type: 'startDay', at: 1_000_000 })
    const { CaptainQueue } = await import('./captain/CaptainQueue.tsx')
    const { HeldBonuses } = await import('./captain/HeldBonuses.tsx')
    const { OutcomePanel } = await import('./captain/OutcomePanel.tsx')
    cleanup()
    render(
      <MemoryRouter>
        <StoreProvider store={store}>
          <CaptainQueue state={day} />
          <HeldBonuses state={day} />
          <OutcomePanel state={day} />
        </StoreProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('region', { name: 'Review queue' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Held bonuses' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Outcome of fake-attempt control' }).textContent).not.toMatch(/bonus paid on recovered/i)
  })
})
