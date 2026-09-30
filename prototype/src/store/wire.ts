import type { Store } from './types.ts'

interface Listens {
  addEventListener(type: string, listener: () => void): void
}

/**
 * Phones put tabs to sleep: no messages arrive while a tab is in the background, and the page may be restored from the
 * back/forward cache without running anything. So whenever the page wakes up (visible, focus, pageshow, back online) and whenever
 * another tab of this browser saves something (the `storage` event, which also works in browsers with no BroadcastChannel),
 * ask the store to look for the newest day.
 */
export function wireResync(
  store: Pick<Store, 'resync'>,
  win: Listens,
  doc: Listens & { readonly visibilityState: string },
  options: { readonly minGapMs?: number; readonly now?: () => number } = {},
): void {
  const minGap = options.minGapMs ?? 1000
  const now = options.now ?? Date.now
  let last = Number.NEGATIVE_INFINITY
  const look = (): void => {
    // Focus, pageshow and visibilitychange often arrive together: one look is enough.
    const t = now()
    if (t - last < minGap) return
    last = t
    store.resync().catch(() => undefined)
  }
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') look()
  })
  for (const type of ['focus', 'pageshow', 'online', 'storage']) win.addEventListener(type, look)
}
