import { useMemo, useState } from 'react'
import { backtest } from '../../engine/backtest.ts'
import { pct, rupees } from '../../ui/format.ts'

/** Predicted against actual on synthetic history. Computed only when the operator opens it (it replays 160 histories). */
export function BacktestPanel() {
  const [opened, setOpened] = useState(false)
  const r = useMemo(() => (opened ? backtest() : null), [opened])
  return (
    <details className="card desk-panel desk-backtest" aria-label="Backtest of the match forecast" onToggle={(e) => setOpened(e.currentTarget.open)}>
      <summary>Backtest of the match forecast (synthetic history)</summary>
      {r ? (
        <>
          <p>
            History is synthetic: this shows the mechanism. Real calibration comes from pilot data, measured against the {pct(r.breakEven)} break-even. {r.cases.toLocaleString('en-IN')}{' '}
            forecasts were made from replayed 14-day histories; what really happened in the next 48 h is drawn from each listing&apos;s hidden rate.
          </p>
          <table aria-label="Forecast against what happened">
            <thead>
              <tr>
                <th scope="col">Forecast</th>
                <th scope="col">Parcels</th>
                <th scope="col">Forecast (avg)</th>
                <th scope="col">Found a buyer</th>
              </tr>
            </thead>
            <tbody>
              {r.bins.map((b) => (
                <tr key={b.label}>
                  <th scope="row">{b.label}</th>
                  <td>{b.n.toLocaleString('en-IN')}</td>
                  <td>{b.n === 0 ? '–' : pct(b.predicted)}</td>
                  <td>{b.n === 0 ? '–' : pct(b.actual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Brier score {r.brier.toFixed(4)} against {r.baselineBrier.toFixed(4)} for always guessing the average ({pct(r.overall)}): lower is better, so the forecast
            beats the guess, by a modest margin. It is a little high at the top and a little low at the bottom, because a thin history is pulled toward similar listings.
          </p>
          <table aria-label="Hold rules compared">
            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">Held</th>
                <th scope="col">Found a buyer</th>
                <th scope="col">₹ per held parcel</th>
                <th scope="col">₹ per 1,000 refused</th>
              </tr>
            </thead>
            <tbody>
              {[r.rules.lowEnd, r.rules.meanRule, r.rules.holdAll].map((x) => (
                <tr key={x.name}>
                  <th scope="row">{x.name}</th>
                  <td>{pct(x.share, 0)}</td>
                  <td>{pct(x.actual)}</td>
                  <td>{rupees(x.netPerHeld)}</td>
                  <td>{rupees(x.held * x.netPerHeld * (1000 / r.cases))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <small>
            The low-end rule holds fewer parcels and each one pays more often; the total can be a little lower than the average rule because it trades volume for certainty.
            It guards against a forecast that is wrong when history is thin.
          </small>
        </>
      ) : (
        <p>Open to replay 160 synthetic histories and see how the forecast held up.</p>
      )}
    </details>
  )
}
