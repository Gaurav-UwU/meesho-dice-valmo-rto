# Valmo RTO: Team GPS (Meesho DICE 3.0)

The shared vocabulary for our Round 2 deck and prototype on reducing failed deliveries in Valmo, Meesho's logistics network.

## Language

### Failure

**RTO (Return to Origin)**:
A shipped parcel that is never delivered and travels back toward the seller.
_Avoid_: Return, failed return, non-delivery return

**Return**:
A parcel the buyer received and later sent back. It is a separate pool from RTO and outside our scope.
_Avoid_: RTO

**Refused Parcel**:
An RTO where the buyer was reached at the door and declined the order.
_Avoid_: Rejected order, cancelled delivery

### Rescue (in the field)

**Risk Score**:
Meesho's existing per-order estimate of how likely an order is to end in RTO (TrustMesh). In our prototype it is a labelled stand-in.
_Avoid_: RTO score, fraud score

**Bonus-Eligible Order**:
An order in the top 20% by Risk Score. It is the only risk signal the rider ever sees.
_Avoid_: Flagged order, risky order, high-risk order

**Rescue Bonus**:
The ₹15 paid to the delivering rider when a Bonus-Eligible Order is delivered and the customer confirms it.
_Avoid_: Incentive, risk-weighted delivery incentive, bonus

### Recover (after failure)

**Hold & Re-home**:
Holding a Refused Parcel at the last-mile delivery centre and redirecting it to nearby demand for the same seller and SKU, instead of sending it back.
_Avoid_: Local resale, local re-home, inventory recovery

### Pilot

**Control Rider**:
A pilot rider who delivers Bonus-Eligible Orders without being offered the Rescue Bonus. The comparison baseline within the same hub.
_Avoid_: Non-bonus rider, baseline rider

**Pilot Verdict**:
The end-of-pilot decision: GO (scale), RE-PRICE (real effect, bonus needs tuning) or KILL (stop).
_Avoid_: Outcome, result

**Refused-Parcel Router**:
The decision applied to each Refused Parcel at the last-mile hub. It sends the parcel to its cheapest recovery lane: second chance, Hold & Re-home, local disposal (only if the seller opted in), or a consolidated return. Hold & Re-home is the flagship lane.
_Avoid_: Reverse optimisation, RTO engine

### Prototype

**Live mode**:
The prototype running against real WhatsApp (Twilio Sandbox) on team phones: real OTPs, real replies and real location shares.
_Avoid_: Production, real mode

**Demo mode**:
The public default. A built-in customer phone panel replaces WhatsApp so anyone can click through the full flow.
_Avoid_: Fake mode, mock
