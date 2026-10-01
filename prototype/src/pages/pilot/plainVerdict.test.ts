import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOT, simulatePilot } from '../../engine/pilot.ts'
import { DEFAULT_VERDICT_CONFIG } from '../../engine/verdict.ts'
import { plainVerdict } from './plainVerdict.ts'

const judge = (patch: Partial<typeof DEFAULT_PILOT>) => plainVerdict(simulatePilot({ ...DEFAULT_PILOT, ...patch }).verdictResult)

describe('plain-language verdict', () => {
  it('GO: the worst case we cannot rule out still clears what it needs', () => {
    const p = judge({ trueUplift: 0.22 })
    expect(p.title).toBe('Scale it')
    expect(p.sentence).toMatch(/worst case we can.t rule out \(\+\d+\.\d\) is above the \+\d+\.\d it needs/)
  })

  it('RE-PRICE: probably helps, not proven to pay, and the next step is a pre-planned Pilot 2', () => {
    const p = judge({ trueUplift: 0.08 })
    expect(p.title).toBe('Not proven yet')
    expect(p.sentence).toMatch(/probably helps/)
    expect(p.sentence).toMatch(/below the \+8\.\d it needs/)
    expect(p.next).toBe('Run Pilot 2 with one change (Top 10% or a smaller bonus), with its rule fixed before it starts.')
  })

  it('never tells you to re-read the same data: improvements wait for a pre-planned pilot', () => {
    expect(judge({ trueUplift: 0.08 }).next).not.toMatch(/re-?test|again|bigger pilot/i)
  })

  it('KILL on a safety rule names it in words', () => {
    expect(judge({ trueUplift: 0.2, normalSpillover: -0.03 }).sentence).toMatch(/normal orders get worse/)
    expect(judge({ trueUplift: 0.2, fakeAttemptExtra: 0.12 }).sentence).toMatch(/too many fake attempts/)
  })

  it('KILL when it barely helps', () => {
    const p = judge({ trueUplift: 0 })
    expect(p.title).toBe('Stop')
    expect(p.sentence).toMatch(/barely helps/)
    expect(p.sentence).toMatch(/at least \+3/)
  })

  it('not enough pairs of riders to judge', () => {
    const p = judge({ hubs: ['powai'], ridersPerHub: 8 })
    expect(p.title).toBe('Not enough data')
    expect(p.sentence).toMatch(/Too few pairs of riders to judge: 4, and the rule needs at least 6/)
  })

  it('a rule changed after planning', () => {
    const p = judge({ verdictConfig: { ...DEFAULT_VERDICT_CONFIG, killFloor: 1 } })
    expect(p.title).toBe('Result not usable')
    expect(p.sentence).toMatch(/changed after the pilot was planned/)
  })

  it('never uses statistics jargon', () => {
    for (const patch of [{}, { trueUplift: 0.08 }, { trueUplift: 0.22 }, { trueUplift: 0 }, { trueUplift: 0.2, normalSpillover: -0.03 }, { hubs: ['powai' as const], ridersPerHub: 8 }]) {
      const p = judge(patch)
      expect(`${p.sentence} ${p.next}`).not.toMatch(/interval|\bCI\b|clustered|confidence|MDE|naive|t-value|ICC|design effect/i)
    }
  })
})
