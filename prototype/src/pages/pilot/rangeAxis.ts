import type { RangeDiagramProps } from './RangeDiagram.tsx'

/** Ticks every 5, or every 10 when the range is wide, so the labels never crowd. */
const WIDE_SPAN = 40

/** The axis runs from a round number below everything to a round number above everything (at least 0 to +20). */
export function axisFor(p: RangeDiagramProps): { readonly lo: number; readonly hi: number; readonly ticks: readonly number[] } {
  const finite = [p.ci[0], p.ci[1], p.estimate, p.breakEven, p.killFloor, 0].filter(Number.isFinite)
  const min = Math.min(...finite) - 1
  const max = Math.max(Math.max(...finite) + 1, 20)
  const STEP = max - min > WIDE_SPAN ? 10 : 5
  const lo = Math.floor(min / STEP) * STEP
  const hi = Math.ceil(max / STEP) * STEP
  const ticks: number[] = []
  for (let t = lo; t <= hi; t += STEP) ticks.push(t)
  return { lo, hi, ticks }
}
