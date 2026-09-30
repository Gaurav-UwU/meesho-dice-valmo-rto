import { BAND_NAMES, type Fairness as FairnessResult } from '../../engine/pilot.ts'

const pct = (x: number, digits = 0): string => `${(x * 100).toFixed(digits)}%`

/**
 * One line that says the comparison is fair, with the small table folded under it. It warns when the two groups differ by
 * more than 5 points on past delivery rate or on the share of any risk band.
 */
export function Fairness({ fairness }: { readonly fairness: FairnessResult }) {
  const { fair, warning, pastRate, bandMix } = fairness
  return (
    <div className={`pilot-fair ${fair ? 'is-fair' : 'is-unfair'}`}>
      <p role="status" className="pilot-fair-line">
        {fair ? '✔ Fair comparison: same rider skill, same parcel risk mix' : `⚠ The two groups are not matched: ${warning ?? ''}`}
      </p>
      <details className="pilot-fair-more">
        <summary>See the check</summary>
        <p className="pilot-note">
          Riders were paired on how well they delivered risky parcels last month, and a coin decided who in each pair gets the bonus. Every flagged parcel also falls
          into one of three risk bands, a third each, for both groups.
        </p>
        <div className="pilot-table-wrap">
          <table className="pilot-table">
            <thead>
              <tr>
                <th scope="col">Before the pilot</th>
                <th scope="col">Bonus group</th>
                <th scope="col">Control group</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Average past delivery rate</th>
                <td>{pct(pastRate.bonus, 1)}</td>
                <td>{pct(pastRate.control, 1)}</td>
              </tr>
              {BAND_NAMES.map((name, i) => (
                <tr key={name}>
                  <th scope="row">{name} risk band</th>
                  <td>{pct(bandMix.bonus[i])}</td>
                  <td>{pct(bandMix.control[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
