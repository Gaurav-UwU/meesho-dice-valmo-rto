import type { SyncInfo } from './types.ts'

export type SyncTone = 'synced' | 'alone' | 'warn' | 'bad'

export interface SyncDescription {
  readonly tone: SyncTone
  /** One word or two, upper case: what the badge says */
  readonly label: string
  /** The line next to it: where, which day, which version */
  readonly headline: string
  /** Plain words: what this means for the person holding the device */
  readonly detail: string
  /** What to do to get on the shared day (or to fix it), when there is something to do */
  readonly howToJoin?: string
  /** Extra cautions (private tab, no tab sync) */
  readonly warnings: readonly string[]
}

/** "4 s ago" style, never negative (phone clocks drift a little) */
export function agoText(at: number | undefined, now: number): string {
  if (at === undefined) return 'not yet'
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 2) return 'just now'
  if (s < 90) return `${s} s ago`
  return `${Math.round(s / 60)} min ago`
}

/** The last five letters or digits of a day id (the random part), upper case: enough to tell two days apart at a glance */
export const shortDayId = (dayId: string): string => dayId.replace(/[^0-9a-z]/gi, '').slice(-5).toUpperCase()

const JOIN_STEPS = 'To use several devices together: on the laptop open the landing page, choose "Several devices (shared day)", then scan its QR codes on each phone.'

const WARNING_TEXT = {
  'storage-blocked': 'This looks like a private or blocked tab: the day is not saved, so closing this tab loses it.',
  'no-tab-sync': 'This browser cannot tell its other tabs about changes, so reload a tab to see what another tab did.',
} as const

/** Everything a screen needs to tell the person, in plain words, whether this device shares its day with others. */
export function describeSync(info: SyncInfo, hubName: string, now: number): SyncDescription {
  const warnings = info.warnings.map((w) => WARNING_TEXT[w])
  const dayPart = info.day ? ` · Day ${info.day.dayNo} (${shortDayId(info.day.dayId)}) · v${info.day.version}` : ''
  const lastDay = info.day ? `Day ${info.day.dayNo} (${shortDayId(info.day.dayId)})` : 'no day yet'

  if (info.link === 'synced') {
    return {
      tone: 'synced',
      label: 'SYNCED',
      headline: `Shared day · ${hubName}${dayPart}`,
      detail: `Everyone who joined this shared day sees what you do. Last change ${agoText(info.lastUpdateAt, now)}; checked with the server ${agoText(info.lastCheckedAt, now)}.`,
      warnings,
    }
  }
  if (info.link === 'alone') {
    return {
      tone: 'alone',
      label: 'ALONE',
      headline: `Only this device · ${hubName}${dayPart}`,
      detail:
        info.aloneReason === 'live-unavailable'
          ? 'The shared day was asked for, but this site is not set up with a shared-day server, so this device has its own private day. Other phones cannot see it.'
          : 'This device has its own private day. Other phones cannot see it and it cannot see theirs (only tabs of this same browser share it).',
      howToJoin: JOIN_STEPS,
      warnings,
    }
  }
  if (info.link === 'connecting') {
    return { tone: 'warn', label: 'CONNECTING', headline: `Joining the shared day · ${hubName}`, detail: 'Waiting for the first answer from the shared day. This usually takes a second or two.', warnings }
  }
  if (info.link === 'offline') {
    return {
      tone: 'bad',
      label: 'OFFLINE',
      headline: `Shared day · ${hubName}${dayPart}`,
      detail: `Cannot reach the shared day right now. Showing ${lastDay} as last seen (checked ${agoText(info.lastCheckedAt, now)}). It tries again every few seconds; taps will not work until it is back.`,
      warnings,
    }
  }
  // problem
  switch (info.problem) {
    case 'old-shape':
      return {
        tone: 'bad',
        label: 'NEEDS RESET',
        headline: `Shared day · ${hubName}`,
        detail: 'The saved shared day was made by an older version of the app, so this page cannot read it. The server replaces it when a page loads; if this stays, it needs one reset.',
        howToJoin: 'Press Reset day (it asks for the admin token once).',
        warnings,
      }
    case 'unreadable':
      return {
        tone: 'bad',
        label: 'NEEDS RESET',
        headline: `Shared day · ${hubName}`,
        detail: 'The saved shared day is damaged, so this page cannot read it. One reset replaces it with a fresh day.',
        howToJoin: 'Press Reset day (it asks for the admin token once).',
        warnings,
      }
    case 'bad-key':
      return {
        tone: 'bad',
        label: 'JOIN KEY REFUSED',
        headline: `Shared day · ${hubName}${dayPart}`,
        detail: 'You can look at the shared day, but the server refused the join key, so your taps will not work.',
        howToJoin: 'Scan the QR code on the landing page again, or reload and type the current live key.',
        warnings,
      }
    default:
      return {
        tone: 'bad',
        label: 'PAGE OUT OF DATE',
        headline: `Shared day · ${hubName}`,
        detail: 'The shared day was saved by a newer version of the app than this page. Reload this page to get the new version.',
        howToJoin: 'Reload the page (on an iPhone, close the tab and open the link again).',
        warnings,
      }
  }
}
