// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MathExplainer } from './MathExplainer.tsx'
import { DEFAULT_CONTROLS, derivePilotView } from './pilotModel.ts'

const view = derivePilotView(DEFAULT_CONTROLS)
const show = () => render(<MathExplainer controls={DEFAULT_CONTROLS} view={view} />)

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('MathExplainer', () => {
  it('shows only the button until it is pressed', () => {
    show()
    expect(screen.getByRole('button', { name: /How the maths works/ })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens a labelled dialog with every section and the live numbers', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: /How the maths works/ }))
    const dialog = screen.getByRole('dialog', { name: 'How the maths works' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    for (const h of ['1. Who gets the bonus', '5. Does it pay?', '7. Refused parcels']) {
      expect(within(dialog).getByText(new RegExp(h.replace('?', '\?')))).toBeTruthy()
    }
    expect(within(dialog).getAllByText(/8\.6/).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('Assumption').length).toBeGreaterThan(0)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('moves focus into the dialog, closes on Escape, and gives focus back to the button', async () => {
    const user = userEvent.setup()
    show()
    const trigger = screen.getByRole('button', { name: /How the maths works/ })
    await user.click(trigger)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close the maths explanation' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.body.style.overflow).toBe('')
  })

  it('closes from the close button and by clicking the backdrop, but not by clicking inside', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: /How the maths works/ }))
    await user.click(screen.getByRole('heading', { name: 'How the maths works' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Close the maths explanation' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: /How the maths works/ }))
    await user.click(screen.getByRole('dialog').parentElement as HTMLElement)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: /How the maths works/ }))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 40; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 5; i++) {
      await user.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('copies the whole explanation as text', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    show()
    await user.click(screen.getByRole('button', { name: /How the maths works/ }))
    await user.click(screen.getByRole('button', { name: 'Copy as text' }))
    expect(writeText).toHaveBeenCalledTimes(1)
    const text = (writeText.mock.calls[0] as unknown as [string])[0]
    expect(text).toContain('5. Does it pay?')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy()
  })

  it('survives a blocked clipboard', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => Promise.reject(new Error('blocked')) }, configurable: true })
    show()
    await user.click(screen.getByRole('button', { name: /How the maths works/ }))
    await user.click(screen.getByRole('button', { name: 'Copy as text' }))
    expect(screen.getByRole('button', { name: 'Copy as text' })).toBeTruthy()
  })
})
