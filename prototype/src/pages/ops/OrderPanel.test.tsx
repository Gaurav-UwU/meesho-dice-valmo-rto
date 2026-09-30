// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { scoreAccuracy } from '../../domain/selectors.ts'
import { startedDay } from '../../domain/testkit.ts'
import { getHub } from '../../engine/hubs.ts'
import { syntheticGeo } from '../../engine/synthetic-geo.ts'
import { createLocalStore } from '../../store/local.ts'
import { StoreProvider } from '../../store/StoreContext.tsx'
import { OrderPanel } from './OrderPanel.tsx'

afterEach(cleanup)

describe('Ops "Why was this flagged?" panel', () => {
  const day = startedDay()
  const flaggedId = day.stopOrder.find((id) => day.stops[id].flagged)!
  const ranks = new Map(day.stopOrder.map((id, i) => [id, i + 1]))

  const show = (selectedId: string | null): void => {
    const store = createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })
    render(
      <MemoryRouter>
        <StoreProvider store={store}>
          <OrderPanel state={day} selectedId={selectedId} ranks={ranks} flaggedIds={[flaggedId]} onSelect={() => undefined} />
        </StoreProvider>
      </MemoryRouter>,
    )
  }

  it('says how accurate the score is, in simulation, next to random picking, and what will measure it', () => {
    show(flaggedId)
    const a = scoreAccuracy(day)
    const note = screen.getByText(/Score accuracy \(simulation\)/)
    expect(note.textContent).toContain(`the top ${Math.round(a.flaggedShare * 100)}% by score catch ${Math.round(a.catchShare * 100)}% of failures`)
    expect(note.textContent).toContain(`random would catch ${Math.round(a.randomShare * 100)}%`)
    expect(note.textContent).toMatch(/to be measured on Valmo.s last 90 days/i)
  })

  it('shows nothing about accuracy until an order is picked', () => {
    show(null)
    expect(screen.queryByText(/Score accuracy/)).toBeNull()
  })
})
