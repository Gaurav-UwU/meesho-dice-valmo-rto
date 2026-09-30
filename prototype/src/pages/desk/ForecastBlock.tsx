import { listingFor } from '../../engine/catalogue.ts'
import { breakEvenMatch, clearsBreakEven } from '../../engine/demand.ts'
import { beliefOf, type RefusedParcel, type RouterParams } from '../../engine/router.ts'
import { pct } from '../../ui/format.ts'

interface ForecastBlockProps {
  readonly parcel: RefusedParcel
  readonly params: RouterParams
}

/**
 * The match forecast on a Desk card: the chance that a buyer for THE SAME listing turns up in the hold window, as a range, against the
 * break-even line. A model on synthetic history, not data. Only the exact listing is ever re-homed; similar ones are evidence of demand only.
 */
export function ForecastBlock({ parcel, params }: ForecastBlockProps) {
  const f = parcel.forecast
  if (!f) return null
  const b = beliefOf(parcel, params)
  const be = breakEvenMatch()
  const clears = clearsBreakEven(b)
  const scale = Math.max(b.p90 * 1.15, be * 2, 0.1)
  const at = (x: number): string => `${Math.min(100, (x / scale) * 100).toFixed(1)}%`
  const listing = listingFor(parcel.hubId, parcel.skuId)
  return (
    <section className="desk-forecast" aria-label="Match forecast">
      <div className="desk-forecast-head">
        <h4>
          Match forecast <span className="pill">model</span>
        </h4>
        <span className={`desk-conf desk-conf--${f.confidence.toLowerCase()}`}>{f.confidence} confidence</span>
      </div>
      <p className="desk-forecast-listing">
        Listing {parcel.skuId}
        {listing ? `: ${listing.title}, ₹${listing.price}` : ''}
      </p>
      <p className="desk-forecast-num">
        <strong>{pct(b.mean)}</strong> chance of a buyer in {params.holdHours} h (range {pct(b.p10)} to {pct(b.p90)})
      </p>
      <div
        className="desk-forecast-bar"
        role="img"
        aria-label={`Forecast range ${pct(b.p10)} to ${pct(b.p90)}, mean ${pct(b.mean)}, break-even ${pct(be)}`}
      >
        <span className="desk-forecast-range" style={{ left: at(b.p10), width: `calc(${at(b.p90)} - ${at(b.p10)})` }} />
        <span className="desk-forecast-mean" style={{ left: at(b.mean) }} />
        <span className="desk-forecast-be" style={{ left: at(be) }} />
      </div>
      <p className="desk-forecast-legend">{pct(be)} break-even (₹8 ÷ ₹145): the dashed line</p>
      <p className={clears ? 'desk-forecast-verdict is-ok' : 'desk-forecast-verdict is-no'}>
        {clears ? 'Low end clears break-even: Hold & Re-home is allowed' : 'Low end is below break-even: Hold & Re-home is closed'}
      </p>
      <p className="desk-forecast-evidence">{f.evidence}</p>
      {f.keywords.length > 0 ? (
        <ul className="desk-forecast-chips" aria-label="Shared keywords">
          {f.keywords.map((w) => (
            <li key={w} className="pill tag">
              {w}
            </li>
          ))}
        </ul>
      ) : null}
      <small>
        Only the same seller and the same listing is ever re-homed (the seller issues the new invoice). Similar listings are evidence of demand, never a substitute for
        this parcel. History is synthetic: this shows the mechanism; real calibration comes from pilot data.
      </small>
    </section>
  )
}
