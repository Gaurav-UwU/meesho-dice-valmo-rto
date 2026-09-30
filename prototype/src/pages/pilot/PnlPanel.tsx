import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { rupees, signedRupees } from '../../ui/format.ts'
import { CHART_MAX_DELTA, type PilotView } from './pilotModel.ts'

const NAVY = '#120a4a'
const PURPLE = '#7b4bd6'
const PINK = '#ed0b7d'
const TICKS = [0, 5, 10, 15, 20, 25]

const cr = (v: number): string => `${v < 0 ? '−' : ''}₹${Math.abs(v).toFixed(0)} cr`

function Stat({ label, value, note }: { readonly label: string; readonly value: string; readonly note: string }) {
  return (
    <div className="pilot-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

/** The profit line at every possible uplift. `compact` drops the numbers the page already shows in "Does it pay?". */
export function PnlPanel({ view, compact = false }: { readonly view: PilotView; readonly compact?: boolean }) {
  const { observedUplift } = view
  const markerX = Math.min(Math.max(observedUplift, 0), CHART_MAX_DELTA)
  const markerY = view.netDataPack
  return (
    <section className="pilot-card" aria-label="Profit and loss">
      <h2>Does it pay? Net ₹ per 100 flagged orders</h2>
      <div className="pilot-chart" role="img" aria-label="Line chart of net rupees per 100 flagged orders against extra deliveries">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={view.chart} margin={{ top: 22, right: 18, bottom: 22, left: 6 }}>
            <CartesianGrid stroke="#ece6d6" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="delta"
              domain={[0, CHART_MAX_DELTA]}
              ticks={TICKS}
              label={{ value: 'Extra deliveries per 100 flagged (Δ)', position: 'insideBottom', offset: -12, fill: '#5b5678', fontSize: 12 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis tickFormatter={(v: number) => rupees(v)} width={64} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v) => rupees(Number(v))}
              labelFormatter={(l) => `Δ = ${l} extra deliveries`}
              contentStyle={{ borderRadius: 10, fontFamily: 'inherit' }}
            />
            <ReferenceLine y={0} stroke="#120a4a" strokeOpacity={0.5} />
            <ReferenceLine
              x={Number(view.breakEven.toFixed(1))}
              stroke={NAVY}
              strokeDasharray="4 3"
              label={{ value: `${view.breakEven.toFixed(1)}`, position: 'top', fill: NAVY, fontSize: 12, fontWeight: 700 }}
            />
            <ReferenceLine
              x={Number(view.breakEvenConservative.toFixed(1))}
              stroke={PURPLE}
              strokeDasharray="4 3"
              label={{ value: `${view.breakEvenConservative.toFixed(1)}`, position: 'insideTopRight', fill: PURPLE, fontSize: 12, fontWeight: 700 }}
            />
            <Line type="linear" dataKey="dataPack" name="Data-pack basis" stroke={NAVY} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line
              type="linear"
              dataKey="conservative"
              name="Conservative (₹18 rider fee)"
              stroke={PURPLE}
              strokeWidth={2.5}
              strokeDasharray="7 4"
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceDot x={markerX} y={markerY} r={7} fill={PINK} stroke="#fff" strokeWidth={2} ifOverflow="extendDomain" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="pilot-legend">
        <li>
          <i style={{ background: NAVY }} /> Data-pack basis, break-even at {view.breakEven.toFixed(1)}
        </li>
        <li>
          <i style={{ background: PURPLE }} /> Conservative (₹18 rider fee), break-even at {view.breakEvenConservative.toFixed(1)}
        </li>
        <li>
          <i style={{ background: PINK, borderRadius: '50%' }} /> Your observed uplift, {observedUplift.toFixed(1)} per 100
        </li>
      </ul>

      {compact ? null : (
      <div className="pilot-stats">
        <Stat label="Net per 100 flagged" value={signedRupees(view.netDataPack)} note={`Conservative ${signedRupees(view.netConservative)}`} />
        <Stat
          label="Scaled to Valmo, per year"
          value={cr(view.annualCr)}
          note={`Conservative ${cr(view.annualCrConservative)}. Uses 153 mn flagged orders a year`}
        />
        <Stat
          label="RTO points saved"
          value={`${view.rtoPoints.toFixed(1)} pts`}
          note={`About ${cr(view.rtoPointsValueCr)} a year of reverse cost at ₹92 cr per point`}
        />
      </div>
      )}
      <p className="pilot-note">
        Cost = bonus × (baseline + Δ), saving = ₹120 × Δ, at the baseline you set ({view.params.baselineSuccess}%). At the deck's 60% the lines cross zero at 8.6
        and 10.3 (with the ₹18 rider fee).
      </p>
    </section>
  )
}
