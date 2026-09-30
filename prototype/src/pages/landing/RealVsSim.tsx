import { HUBS } from '../../engine/hubs.ts'
import { usesRealGeo } from '../../store/geo.ts'
import { REAL_VS_SIMULATED, type RealRow } from './content.ts'

function geographyRow(): RealRow {
  const real = HUBS.filter((h) => usesRealGeo(h.id)).length
  return {
    layer: 'Geography',
    real: `Real pincodes, lat/long, road distances and OpenStreetMap tiles (${real} of ${HUBS.length} hubs loaded in this build).`,
    simulated: 'The hub’s exact spot (a real locality centroid). A hub without its data file uses a labelled synthetic layout.',
  }
}

/** Kept, but folded away: the honest answer to "what is real?" for anyone who asks, without crowding the walkthrough. */
export function RealVsSim() {
  const rows: readonly RealRow[] = [geographyRow(), ...REAL_VS_SIMULATED]
  return (
    <details className="land-details" id="real">
      <summary>What is real and what is simulated?</summary>
      <p className="land-lead">Meesho’s order data is the one thing we cannot have, so orders are synthetic and labelled that way on every screen.</p>
      <div className="land-table-wrap">
        <table className="land-table">
          <thead>
            <tr>
              <th scope="col">Layer</th>
              <th scope="col">Real</th>
              <th scope="col">Simulated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.layer}>
                <th scope="row">{r.layer}</th>
                <td>{r.real}</td>
                <td>{r.simulated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
