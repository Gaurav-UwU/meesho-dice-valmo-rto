// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import Landing from './Landing.tsx'
import { DEMO_STEPS } from './landing/content.ts'
import { loadProgress, reconcileProgress, saveProgress, toggleStep } from './landing/progress.ts'

const show = () => {
  const store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
  render(
    <MemoryRouter>
      <StoreProvider store={store}>
        <Landing />
      </StoreProvider>
    </MemoryRouter>,
  )
  return store
}

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('Landing: one job, the demo', () => {
  it('leads with what to do: begin, or skip to the decision tool', () => {
    show()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Try the Rescue Console/)
    expect(screen.getByRole('link', { name: 'Begin the walkthrough' }).getAttribute('href')).toBe('#setup')
    expect(screen.getByRole('link', { name: 'Skip to the decision tool' }).getAttribute('href')).toBe('/pilot')
  })

  it('tells you to open the windows (Ops, Rider, Customer and the hub captain), each in a new tab, on the Lucknow hub', () => {
    show()
    const setup = screen.getByRole('region', { name: /Open the windows/ })
    const links = within(setup).getAllByRole('link')
    expect(links).toHaveLength(4)
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toContain('noopener')
      expect(a.getAttribute('href')).toMatch(/hub=lucknow/)
    }
  })

  it('walks through every step in order, each with something to do and something to see', () => {
    show()
    const walk = screen.getByRole('region', { name: 'The walkthrough' })
    expect(within(walk).getAllByRole('listitem').length).toBeGreaterThanOrEqual(DEMO_STEPS.length)
    for (const step of DEMO_STEPS) {
      expect(within(walk).getByRole('heading', { name: new RegExp(step.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeTruthy()
    }
    expect(within(walk).getAllByText('Do')).toHaveLength(DEMO_STEPS.length)
    expect(within(walk).getAllByText('See')).toHaveLength(DEMO_STEPS.length)
  })

  it('shows one "You are here" marker, on the first step that is not done', async () => {
    show()
    const user = userEvent.setup()
    expect(screen.getAllByText('You are here')).toHaveLength(1)
    await user.click(screen.getByRole('checkbox', { name: /Mark step 1 done/ }))
    const marked = screen.getByText('You are here').closest('li')!
    expect(within(marked).getByRole('heading').textContent).toContain(DEMO_STEPS[1].title)
  })

  it('counts progress, announces it, and remembers it in this browser', async () => {
    show()
    const user = userEvent.setup()
    const bar = screen.getByRole('progressbar', { name: 'Demo progress' })
    expect(bar.getAttribute('aria-valuenow')).toBe('0')
    await user.click(screen.getByRole('checkbox', { name: /Mark step 1 done/ }))
    await user.click(screen.getByRole('checkbox', { name: /Mark step 2 done/ }))
    expect(bar.getAttribute('aria-valuenow')).toBe('2')
    expect(bar.getAttribute('aria-valuetext')).toBe(`2 of ${DEMO_STEPS.length} steps done`)
    expect(loadProgress(DEMO_STEPS.map((s) => s.id))).toEqual([DEMO_STEPS[0].id, DEMO_STEPS[1].id])

    cleanup()
    show()
    expect(screen.getByRole('progressbar', { name: 'Demo progress' }).getAttribute('aria-valuenow')).toBe('2')
    await user.click(screen.getByRole('button', { name: 'Clear ticks' }))
    expect(screen.getByRole('progressbar', { name: 'Demo progress' }).getAttribute('aria-valuenow')).toBe('0')
  })

  it('drops the ticks when the day is reset, from this device or another, but keeps them while it is the same day', async () => {
    const store = show()
    const user = userEvent.setup()
    await waitFor(() => expect(store.getState('lucknow')).toBeDefined())
    await user.click(screen.getByRole('checkbox', { name: /Mark step 1 done/ }))
    await user.click(screen.getByRole('checkbox', { name: /Mark step 2 done/ }))
    expect(screen.getByRole('progressbar', { name: 'Demo progress' }).getAttribute('aria-valuenow')).toBe('2')
    await store.send('lucknow', { type: 'startDay' }) // same day, more actions: ticks stay
    expect(screen.getByRole('progressbar', { name: 'Demo progress' }).getAttribute('aria-valuenow')).toBe('2')
    await store.reset('lucknow')
    await waitFor(() => expect(screen.getByRole('progressbar', { name: 'Demo progress' }).getAttribute('aria-valuenow')).toBe('0'))
    expect(loadProgress(DEMO_STEPS.map((s) => s.id))).toEqual([])
  })

  it('says so when every step is ticked', async () => {
    saveProgress(DEMO_STEPS.map((s) => s.id))
    show()
    expect(await screen.findByText(/That is the whole loop/)).toBeTruthy()
  })

  it('keeps the honest "what is real" table, folded away', () => {
    show()
    const details = screen.getByText('What is real and what is simulated?').closest('details')!
    expect(details.hasAttribute('open')).toBe(false)
    expect(within(details).getAllByText(/blocked by Twilio’s trial/).length).toBeGreaterThan(0)
    expect(within(details).getAllByRole('row').length).toBeGreaterThan(5)
  })

  it('offers a fresh day only after a confirmation, and then clears the demo day', async () => {
    const store = show()
    const user = userEvent.setup()
    await store.send('lucknow', { type: 'startDay' })
    expect(store.getState('lucknow')?.started).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Start with a fresh day' }))
    expect(store.getState('lucknow')?.started).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Yes, start fresh' }))
    await waitFor(() => expect(store.getState('lucknow')?.started).toBe(false))
    expect(await screen.findByText(/starts on a clean day/)).toBeTruthy()
  })
})

describe('progress helpers', () => {
  it('reconcileProgress keeps ticks on the same day or before days were tracked, and drops them on a different day', () => {
    expect(reconcileProgress('d1', 'd1', ['a'])).toEqual({ dayId: 'd1', done: ['a'] })
    expect(reconcileProgress(undefined, 'd1', ['a'])).toEqual({ dayId: 'd1', done: ['a'] })
    expect(reconcileProgress('d1', 'd2', ['a'])).toEqual({ dayId: 'd2', done: [] })
    expect(reconcileProgress('d1', undefined, ['a'])).toEqual({ dayId: 'd1', done: ['a'] })
  })

  it('toggles without mutating, and ignores junk in storage', () => {
    const before = ['a']
    expect(toggleStep(before, 'b')).toEqual(['a', 'b'])
    expect(toggleStep(['a', 'b'], 'a')).toEqual(['b'])
    expect(before).toEqual(['a'])
    window.localStorage.setItem('rescue-demo-progress-v1', '{not json')
    expect(loadProgress(['a'])).toEqual([])
    window.localStorage.setItem('rescue-demo-progress-v1', JSON.stringify(['a', 'zzz', 4]))
    expect(loadProgress(['a', 'b'])).toEqual(['a'])
  })
})
