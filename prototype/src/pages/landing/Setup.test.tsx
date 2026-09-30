// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { createDay } from '../../domain/day.ts'
import { getHub } from '../../engine/hubs.ts'
import { syntheticGeo } from '../../engine/synthetic-geo.ts'
import { LIVE_KEY_STORAGE } from '../../store/join.ts'
import { createLiveStore } from '../../store/live.ts'
import { createLocalStore } from '../../store/local.ts'
import { tabSecrets } from '../../store/secrets.ts'
import { StoreProvider } from '../../store/StoreContext.tsx'
import type { Store } from '../../store/types.ts'
import { Setup } from './Setup.tsx'

const show = (store: Store) =>
  render(
    <MemoryRouter>
      <StoreProvider store={store}>
        <Setup />
      </StoreProvider>
    </MemoryRouter>,
  )

afterEach(cleanup)

describe('Setup: phones can join the same day without typing keys', () => {
  it('in Demo mode it says ALONE, offers the shared day only if the site has it, and opens plain links', () => {
    show(createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) }))
    expect(screen.getByText('ALONE')).toBeTruthy()
    const share = screen.getByRole('button', { name: 'Several devices (shared day)' })
    expect((share as HTMLButtonElement).disabled).toBe(true) // not built in here
    expect(screen.getByText(/shared day is not set up on this site/i)).toBeTruthy()
    const setup = screen.getByRole('region', { name: /Open three windows/ })
    for (const a of within(setup).getAllByRole('link')) expect(a.getAttribute('href')).not.toMatch(/mode=live|#k=/)
    expect(screen.getByText(/keeps its own separate day/i)).toBeTruthy()
  })

  it('on the shared day it says SYNCED, and every link and QR code opens the same mode and carries the join key after the #', async () => {
    tabSecrets.set(LIVE_KEY_STORAGE, 'the-key')
    const day = createDay(syntheticGeo(getHub('lucknow')), { seed: 1, orders: 20, riders: 4 })
    const store = createLiveStore({
      feed: { fetchDay: async () => day, watch: () => () => undefined },
      call: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }),
      getLiveKey: () => 'the-key',
      getAdminToken: () => 't',
      onError: () => undefined,
      pollMs: 0,
    })
    await store.ensureDay('lucknow')
    show(store)
    expect(screen.getByText('SYNCED')).toBeTruthy()
    const setup = screen.getByRole('region', { name: /Open three windows/ })
    const hrefs = within(setup).getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['/ops?hub=lucknow&mode=live#k=the-key', '/rider?hub=lucknow&mode=live#k=the-key', '/customer?hub=lucknow&mode=live#k=the-key'])
    expect(screen.getByText(/nobody types anything/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'One device (Demo)' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
