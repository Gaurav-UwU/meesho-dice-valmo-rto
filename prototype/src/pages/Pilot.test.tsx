// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import { createLocalStore } from '../store/local.ts'
import { StoreProvider } from '../store/StoreContext.tsx'
import Pilot from './Pilot.tsx'

afterEach(cleanup)

const show = () =>
  render(
    <MemoryRouter initialEntries={['/pilot']}>
      <StoreProvider store={createLocalStore({ loadGeo: async (id) => syntheticGeo(getHub(id)) })}>
        <Pilot />
      </StoreProvider>
    </MemoryRouter>,
  )

const answer = () => screen.getByRole('region', { name: 'Pilot verdict' })
const verdict = (): string => answer().querySelector('.pilot-verdict-word')?.textContent ?? ''
const inputs = () => screen.getByRole('region', { name: 'Pilot inputs' })
const who = () => within(inputs()).getByRole('radiogroup', { name: 'Who gets the bonus' })

describe('Pilot page: three steps', () => {
  it('has exactly three numbered steps, then "More detail"', () => {
    show()
    const steps = [...document.querySelectorAll('.pilot-stepnum')].map((n) => n.closest('h2')?.textContent?.replace(/\s+/g, ' ').trim())
    expect(steps).toEqual(['1 Your assumptions', '2 What the pilot would say', '3 Does it pay?'])
    expect(screen.getByRole('heading', { name: 'More detail' })).toBeTruthy()
  })

  it('states the mediation disclaimer: the effect of ₹15 is assumed, not measured', () => {
    show()
    const note = screen.getAllByRole('note').find((n) => /Assumed, not measured/.test(n.textContent ?? ''))
    expect(note?.textContent).toMatch(/not evidence that it works/)
  })

  it('says riders are paired on how well they delivered before, with a coin flip in each pair', () => {
    show()
    expect(screen.getByText(/pair riders who delivered equally well last month, and a coin decides who in each pair gets ₹15/)).toBeTruthy()
  })

  it('uses no word a judge would have to look up', () => {
    show()
    expect(document.body.textContent).not.toMatch(/clustered|\bICC\b|design effect|\bMDE\b|t-value|\bCI\b|naive|interval/i)
  })

  it('puts the maths button in the page header', () => {
    show()
    expect(within(screen.getByRole('banner')).getByRole('button', { name: /How the maths works/ })).toBeTruthy()
  })
})

describe('Step 1: your assumptions', () => {
  it('shows only three choices up front: who gets it, how much it helps, the bonus', () => {
    show()
    const up = inputs().querySelector('.pilot-assume-grid')!
    expect(within(up as HTMLElement).getAllByRole('slider').map((s) => s.getAttribute('id'))).toEqual(['pilot-uplift', 'pilot-bonus'])
    expect(within(up as HTMLElement).getByRole('radiogroup', { name: 'Who gets the bonus' })).toBeTruthy()
  })

  it('folds everything else, without overlap, under "More settings"', () => {
    show()
    const more = inputs().querySelector('details')!
    expect(more.hasAttribute('open')).toBe(false)
    expect(more.querySelector('summary span')?.textContent).toBe('More settings')
    expect(within(more).getAllByRole('slider')).toHaveLength(6)
    expect(within(more).getByRole('slider', { name: 'Flagged orders delivered without the bonus' })).toBeTruthy()
    const all = [...document.querySelectorAll('input[type=range]')].map((x) => x.id)
    expect(new Set(all).size).toBe(all.length)
  })

  it('offers the top 10% and the top 20% only', () => {
    show()
    expect(within(who()).getAllByRole('radio').map((r) => r.textContent?.match(/Top \d+%/)?.[0])).toEqual(['Top 10%', 'Top 20%'])
  })

  it('keeps only two safety rules: normal orders and fake attempts', () => {
    show()
    const more = inputs().querySelector('details')!
    const safety = within(more).getByRole('heading', { name: /Safety rules/ }).parentElement as HTMLElement
    expect(within(safety).getAllByRole('slider').map((s) => s.getAttribute('id'))).toEqual(['pilot-spillover', 'pilot-falseAttempts'])
    expect(more.textContent).not.toMatch(/Returns|Complaints|On-time/)
  })

  it('labels the 60% as our assumption, measured by the Control group', () => {
    show()
    expect(inputs().textContent).toMatch(/Our assumption: the riskiest 20% fail about 40% of the time \(vs 17% overall\)\. The Control group measures it\./)
    fireEvent.click(within(who()).getByRole('radio', { name: /Top 10%/ }))
    expect(inputs().textContent).toMatch(/riskiest 10% fail about 49% of the time/)
  })

  it('lets you flag only the riskiest 10%: fewer are delivered anyway, so it needs less to pay', () => {
    show()
    expect(within(who()).getByRole('radio', { name: /Top 20%/ }).getAttribute('aria-checked')).toBe('true')
    expect(inputs().textContent).toMatch(/60% delivered anyway/)
    fireEvent.click(within(who()).getByRole('radio', { name: /Top 10%/ }))
    expect(within(who()).getByRole('radio', { name: /Top 10%/ }).getAttribute('aria-checked')).toBe('true')
    expect(inputs().textContent).toMatch(/51% delivered anyway/)
    expect(screen.getByRole('region', { name: 'Does it pay?' }).textContent).toMatch(/above \+7\.\d extra deliveries/)
  })

  it('scenarios are one tap each and keep "who gets it"', () => {
    show()
    fireEvent.click(within(who()).getByRole('radio', { name: /Top 10%/ }))
    fireEvent.click(screen.getByRole('button', { name: 'It works well' }))
    expect(within(who()).getByRole('radio', { name: /Top 10%/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('shows a broken safety rule on the folded settings', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Fake attempts rise' }))
    const more = inputs().querySelector('details')!
    expect(more.querySelector('summary')?.textContent).toMatch(/1 safety rule broken/)
    expect(within(more).getByText('Breaks the safety rule')).toBeTruthy()
  })
})

describe('Step 2: what the pilot would say', () => {
  it('gives the verdict with a plain sentence and a next step, no jargon', () => {
    show()
    expect(verdict()).toBe('GO')
    expect(answer().querySelector('.pilot-answer-sentence')?.textContent).toMatch(/worst case we can.t rule out .* above the/)
    expect(answer().textContent).toMatch(/Next:/)
    const visible = [...answer().querySelectorAll('.pilot-answer-head p')].map((p) => p.textContent).join(' ')
    expect(visible).not.toMatch(/interval|clustered|naive|MDE|design effect/i)
  })

  it('on RE-PRICE the next step is a pre-planned Pilot 2 with one change', () => {
    show()
    fireEvent.change(document.getElementById('pilot-uplift')!, { target: { value: '8' } })
    expect(verdict()).toBe('RE-PRICE')
    expect(answer().querySelector('.pilot-answer-next')?.textContent).toBe('Next: Run Pilot 2 with one change (Top 10% or a smaller bonus), with its rule fixed before it starts.')
  })

  it('shows one line that the comparison is fair, with the small table folded under it', () => {
    show()
    expect(within(answer()).getByRole('status').textContent).toContain('✔ Fair comparison: same rider skill, same parcel risk mix')
    const fold = answer().querySelector('.pilot-fair-more')!
    expect(fold.hasAttribute('open')).toBe(false)
    const rows = within(fold as HTMLElement).getAllByRole('row').map((r) => r.textContent)
    expect(rows.join('|')).toMatch(/Average past delivery rate/)
    expect(rows.join('|')).toMatch(/High risk band.*Very high risk band.*Extreme risk band/)
  })

  it('the fair-comparison line stays green for every scenario and for the top 10%', () => {
    show()
    for (const name of ['Deck assumption', 'It works well', 'It does nothing', 'It hurts normal orders', 'Fake attempts rise']) {
      fireEvent.click(screen.getByRole('button', { name }))
      expect(answer().querySelector('.pilot-fair')?.classList.contains('is-fair')).toBe(true)
    }
    fireEvent.click(within(who()).getByRole('radio', { name: /Top 10%/ }))
    expect(answer().querySelector('.pilot-fair')?.classList.contains('is-fair')).toBe(true)
  })

  it('draws where the true effect probably is against the "pays" and "stop" lines', () => {
    show()
    const plot = within(answer()).getByRole('img', { name: /true effect is probably between .* It pays for itself above/ })
    expect(plot.textContent).toMatch(/pays above/)
    expect(plot.textContent).toMatch(/stop below/)
  })

  it('shows how often luck alone would change the answer, and does not guarantee GO', () => {
    show()
    const odds = screen.getByRole('list', { name: 'How often each verdict would come up' })
    const shares = within(odds).getAllByRole('listitem').map((li) => Number(/(\d+)%/.exec(li.textContent ?? '')?.[1]))
    expect(shares.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(99)
    expect(Math.max(...shares)).toBeLessThan(95)
  })

  it('keeps the rulebook, the locked rule and the smallest detectable effect folded under "How we decide"', () => {
    show()
    const rules = [...answer().querySelectorAll('details')].find((d) => d.querySelector('summary')?.textContent?.includes('How we decide'))!
    expect(rules.hasAttribute('open')).toBe(false)
    expect(rules.textContent).toMatch(/Rule locked when the pilot was planned: [0-9a-f]{8}/)
    expect(rules.textContent).toMatch(/Smallest effect it can detect/)
  })

  it('every scenario lands on the verdict it describes', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'It hurts normal orders' }))
    expect(verdict()).toBe('KILL')
    expect(answer().textContent).toMatch(/normal orders get worse/)
    fireEvent.click(screen.getByRole('button', { name: 'It works well' }))
    expect(verdict()).toBe('GO')
    fireEvent.click(screen.getByRole('button', { name: 'Fake attempts rise' }))
    expect(verdict()).toBe('KILL')
    expect(answer().textContent).toMatch(/too many fake attempts/)
    fireEvent.click(screen.getByRole('button', { name: 'It does nothing' }))
    expect(verdict()).toBe('KILL')
    fireEvent.click(screen.getByRole('button', { name: 'Deck assumption' }))
    expect(verdict()).toBe('GO')
  })

  it('goes INVALID when the rule is loosened after planning, and says so', () => {
    show()
    fireEvent.click(screen.getByLabelText(/Loosen the rule after seeing the result/))
    expect(verdict()).toBe('INVALID')
    expect(answer().textContent).toMatch(/judged by a different rule now/)
    expect(within(answer()).queryByRole('img')).toBeNull()
  })
})

describe('Step 3: does it pay?', () => {
  it('leads with what the bonus caused, never a raw delivery rate', () => {
    show()
    const pay = screen.getByRole('region', { name: 'Does it pay?' })
    expect(pay.querySelector('.pilot-pay-lead')?.textContent).toMatch(/The bonus caused .* extra deliveries at ₹.*avoiding ₹.*of RTO cost \(net/)
    expect(pay.textContent).not.toMatch(/\d+% of (risky|flagged)/i)
  })

  it('shows three numbers and one break-even that matches the picture; the ₹18 rider-fee case lives in the maths panel', () => {
    show()
    const pay = screen.getByRole('region', { name: 'Does it pay?' })
    expect(pay.querySelectorAll('.pilot-pay-nums dd')).toHaveLength(3)
    expect(pay.textContent).not.toMatch(/₹18/)
    const be = /above \+(\d+\.\d) extra deliveries/.exec(pay.textContent ?? '')?.[1]
    expect(answer().querySelector('[role=img]')?.textContent).toContain(`pays above +${be}`)
  })
})

describe('More detail', () => {
  it('folds the hub table, profit chart, yearly table, cost bars and the Ops-day check', () => {
    show()
    const more = screen.getByRole('region', { name: 'More detail' })
    const titles = [...more.querySelectorAll('details > summary > span')].map((s) => s.textContent)
    expect(titles).toEqual(["Check today's Ops day", 'Hub by hub', 'Profit at every possible effect', 'Yearly rupees by bonus size', 'Cost per successful delivery'])
    for (const d of more.querySelectorAll('details')) expect(d.hasAttribute('open')).toBe(false)
  })
})
