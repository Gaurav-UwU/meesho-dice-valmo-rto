import { headlineSentence, type CausalHeadline } from '../../engine/headline.ts'
import { signedRupees } from '../../ui/format.ts'
import type { PayNumbers } from './pilotModel.ts'

interface Props {
  readonly headline: CausalHeadline
  readonly pay: PayNumbers
  readonly rtoPoints: number
}

const cr = (v: number): string => `${v < 0 ? '−' : ''}₹${Math.abs(v).toFixed(0)} cr`

/** Step 3: what the bonus caused, and whether that is worth the money. Three numbers and one line for the cautious case. */
export function PayCard({ headline, pay, rtoPoints }: Props) {
  return (
    <section className="pilot-card pilot-pay" aria-label="Does it pay?">
      <h2>
        <span className="pilot-stepnum">3</span> Does it pay?
      </h2>
      <p className="pilot-pay-lead">{headlineSentence(headline)}</p>
      <dl className="pilot-pay-nums">
        <div>
          <dt>Net, per 100 flagged orders</dt>
          <dd>{signedRupees(pay.net)}</dd>
        </div>
        <div>
          <dt>Across Valmo, a year</dt>
          <dd>{cr(pay.annualCr)}</dd>
        </div>
        <div>
          <dt>Fewer RTOs, network-wide</dt>
          <dd>{rtoPoints.toFixed(1)} pts</dd>
        </div>
      </dl>
      <p className="pilot-note">
        It pays for itself above <b>+{pay.breakEven.toFixed(1)}</b> extra deliveries per 100.
      </p>
    </section>
  )
}
