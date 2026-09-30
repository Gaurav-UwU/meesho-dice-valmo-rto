# 09 — R2 slide content spec (for the deck teammate)

Status: **v2, 2026-09-27.** v1 had cover + 10 slides. **v2 is cover + 9 slides = 10 total**, which fits the official "6–10 slides" whether or not the cover counts. The standalone prototype slide is gone: its screenshots now sit on slides 4 and 6, with a QR code on slide 1. Sources for every figure are in `10-sources.md`, including the fact-check log of the AI trend summary. Vocabulary is in `../CONTEXT.md`.

**Spine (the no-pivot bridge from R1):** R1 said TrustMesh's "signal stops at the hub. The rider at the door never sees it." R2: **carry the risk signal all the way to the door and beyond.** Meesho already predicts RTO, but nobody acts on that prediction after dispatch. We use the same score to trigger the cheapest fix at each stage: Prevent → **Rescue (hero, piloted first)** → Recover. It's the same framework and the same hero as R1.

**Official R2 asks → slides:** ① exec summary → 1 · ② where/why → 2 · ③ prioritised solutions → 3, 4, 5 · ④ refused/undelivered → 6 · ⑤ 30-60-90 → 7 · ⑥ risks → 8. 10x → 9.
**Criteria → where they score:**
- Research (methods, sources, coverage) → methods strip on slide 2, source footers, appendix A7/A9
- Depth → sizing working on slides 2/5
- Innovativeness → Rescue Bonus + Router (no Indian precedent)
- 10x → slide 9
- Feasibility → existing Valmo rails + prototype screens
- Presentation → one message per slide
Layout goes in the Meesho template (`Meesho/DICE Challenge S3 Template…pptx`), with the same visual language as R1: purple/pink, numbered blocks, and a footer line of sources.

**Number rules (say once, in the slide 1 footer):** Valmo economics use the **case data pack** (80% COD, RTO 20% COD / 5% prepaid, ₹50 forward, ₹120 reverse). Meesho-wide trends use the **RHP and shareholder letters**. The two never mix within one chart.

**Continuity with R1:** R1 lever codes map to R2 names on slide 3 only: R1 → **Rescue Bonus**, C1 → **Refused-Parcel Router (Hold & Re-home lane)**. After that, use the R2 names everywhere.

---

## Slide 1 — Executive summary
**Headline:** Valmo pays the same for an easy stop and a hard one, so hard stops fail. We price the difficulty.
**Sub-line (spine):** Meesho already predicts which orders will fail. We carry that signal to the door and act on it.

**Body (3 columns):**
1. **The problem.** 17 of every 100 Valmo orders never reach the buyer (data pack: 80% COD × 20% + 20% prepaid × 5%). COD is 96% of failures in Meesho's own numbers. Each RTO costs ₹170 against ₹50 for a delivery.
2. **The insight.** About 2/3 of RTOs die at a door a rider could still save (refused, not home, unreachable). But the rider is paid only on success, the same amount for every stop, so effort goes to the easy ones. Checkout-side fixes are excluded by the brief and the prepaid lever is already spent.
3. **Three moves:**
   - **Now: Rescue Bonus.** +₹15 to the rider only when an order in the riskiest 20% is delivered. It runs on Valmo's existing risk score and incentive rail.
   - **Next: Refused-Parcel Router.** Every refused parcel goes to its cheapest recovery (second chance → Hold & Re-home → consolidated return) instead of an automatic ₹120 trip back.
   - **Long-term: pay by difficulty.** The risk score becomes a price across the network.

**Impact strip:** Valmo RTO **~17% → ~14%** (Rescue Bonus at +15 deliveries per 100 flagged) · **₹60–180 cr/yr** net from the Rescue Bonus (range explained on slide 5) · **₹50–140 cr/yr** from Hold & Re-home (conservative → central, slide 6) · **no change for the customer**.

**Constraint scorecard** (the brief's three "without hurting" tests):
| | Rescue Bonus | Refused-Parcel Router |
|---|---|---|
| Delivery cost | ↓ net (self-funding above +9 per 100) | ↓ (₹21 local delivery vs ₹120 return) |
| Rider earnings | ↑ (+₹15 on hard stops) | ↑ (an extra paid delivery) |
| Customer speed / ease | unchanged | faster for buyer 2 |

**Prototype:** QR code + live link (small, bottom right). Screens appear on slides 4 and 6.
**Speaker note:** lead with the insight line. Say the three moves once, then show the impact strip.

---

## Slide 2 — Where & why RTO happens
**Headline:** Two-thirds of RTOs happen at a door a rider can still save.

**Left: sized cause tree** (replaces R1's pie; same numbers, grouped by who can act):
```
All RTOs (100%)
├─ At the door, rescuable by rider effort ........ 66%
│   ├─ Refused at the door (verified by customer OTP) 36%
│   ├─ Customer not home ............................ 18%
│   └─ Phone unreachable ............................ 12%
├─ Before the door, system fixes ................. 22%
│   ├─ Unclear address .............................. 13%
│   └─ Far / wrong hub ................................ 9%
├─ No real attempt (already policed by Valmo's
│   verification call) ................................ 9%
└─ Other ............................................. 3%
```
Label: "Our blend: rider interviews (n=12), buyer survey (n=25+), industry NDR mix, data pack. Build-up in Appendix A1." **The research teammate must write A1** (input and n per slice).

**Middle: COD concentration** (from R1, tightened). COD fails 22.3% vs prepaid 2.7% (**~8x**). COD is **96%** of failures despite being 77% of shipments. The prepaid lever is spent: COD share fell 88.7% → 77% (FY23–25) and → 72% (H1 FY26), yet COD success *fell* 78.6% → 75.9%.
Small sidebar: RTO 21.2% → 18.6% → 17.8% (FY23–25, derived from RHP). **About 70%** of that drop came from the shift to prepaid (Appendix A2). ⚠️ R1 said "about three-quarters"; the mix-shift maths gives 69–71%, so use "about 70%".

**Right: why, on both sides:**
- **Buyer:** nothing paid, so refusing is free. Price-shopping in transit (survey quote from R1).
- **Rider:** Valmo's published delivery agreement pays the rider **only on successful delivery**, and the only performance incentive tracks the rider's **overall first-attempt rate**. Nothing prices the difficulty of *this* order, so the rational move is to try less on the likely failures (rider quote from R1). Loop: expected to fail → less effort → fails → expectation confirmed.
- **Distance makes a stop harder, yet pay stays flat (case data pack):** orders ~2 km from the hub fail 15%, ~5 km 17%, 10 km+ **22%**. First-time and unclear addresses also fail noticeably more. That's the difficulty the flat rate ignores, and distance plus address newness feed the flag.
- **India isn't one market:** RTO runs 18% in Vadodara vs 35% in Patna, and climbs from 22% to 35% as delivery time goes from 1–2 days to 5+ (Shipway, 2025). So the pilot tests metro and small-town hubs separately.

**Bottom strip: research methods (for the Research criterion):**
- **Primary:** 12 rider interviews across Mumbai hubs · COD buyer survey (n=25+, update the count) · order-and-observe on the Meesho app (N COD orders; the case suggests this; *to do*) · top-up rider/hub calls.
- **Secondary:** Meesho RHP + Q4 FY26 / Q1 FY27 letters and call · **Valmo's published Delivery Services Agreement** · case data pack · Shipway, Unicommerce, Tata Comms, AWS/Delhivery.
- Every claim was fact-checked; vendor figures are labelled as such (Appendix A9).

**What we don't know (one line, italic):** whether riders *cause* COD failure or correctly *predict* it. The pilot's control arm separates the two.
**Footer:** RHP; Q4 FY26 & Q1 FY27 shareholder letters; Valmo Delivery Services Agreement; Shipway ShipNotes 2025; data pack; primary research Sep 2026.

---

## Slide 3 — Prioritised solutions with expected impact
**Headline:** Rescue first: it's the only lever that needs no new system.

**Conversion shown on the slide:** 1 RTO point on Valmo ≈ 7.6 mn parcels ≈ **₹92 cr/yr in reverse cost** (763.5 mn FY25 Valmo orders × 1% × ₹120).

**Table (replaces R1's matrix; keep a small matrix thumbnail for continuity):**
| Lever (R1 code) | Pool addressed | Assumed effect | RTO pts | ₹ cr/yr | Confidence | Effort | Order |
|---|---|---|---|---|---|---|---|
| **Rescue Bonus** (R1) | Riskiest 20% of orders | +15 deliveries per 100 flagged | **−3.0** | **60–180 net** | Med (pilot measures it) | Low: existing score, app flag, incentive rail | **1 · now** |
| **Refused-Parcel Router** (C1) | All refused/undelivered parcels at the hub | 2.5–13.5% re-homed + cheaper returns | 0 (recovers cost, not RTO) | **50–270** (Hold & Re-home lane) | Low–Med (match rate unknown) | Med | **2 · days 30–90** |
| **Address confidence + pre-dispatch fix** (P2, sharpened) | Address 13% + wrong hub 9% of RTOs = 3.7 pts | fixes ¼ of that pool | −0.9 | ~80 gross | Med: Delhivery runs GenAI geocoding at 8,000 req/min (AWS case) | Med: Meesho already runs GeoIndia, so this adds a low-confidence → ask-the-buyer loop | 3 · day 60+ |
| **Two-way confirm / reschedule** (P1, sharpened: optional WhatsApp "confirm · change time · fix address · pickup" before the rider leaves) | Not home 18% + unreachable 12% = 5.1 pts | fixes ⅕ | −1.0 | ~95 gross | Low–Med: vendor-reported −45% RTO losses, +50% contact rate (Tata Comms × Shiprocket) | Med; **the same build powers the Router's second-chance lane** | 4 · day 60+ |
| Proof of attempt (R2) | No real attempt 9% | — | — | — | — | **Mostly in play:** Valmo already verifies failed attempts by calling the buyer, and refusals need an OTP | **Folded into Rescue Bonus controls** |

Label: "Effects are planning assumptions, to be replaced by pilot data. P1/P2 figures are gross (before build cost)."
Note: P1/P2 impacts overlap with the Rescue Bonus pool, so don't add them to the −3.0.
**Excluded by design (one line):** partial COD, COD restriction, convenience fees, forced prepaid, extra checkout steps. The brief rules out friction in ordering, and **Meesho already runs the risk side** (TrustMesh restricted ~2 mn consumers in FY26).
**Already in play (fix the R1 list):**
- Prepaid push: ~37% prepaid in Q1 FY27 via shareable UPI and Pay Before Delivery
- TrustMesh: monitors 166 mn active listings, RTO down >10%
- Predictive routing (Q1 FY27 letter)
- GeoIndia address model (Q4 FY26 letter)
- Verification call + refusal OTP (Valmo delivery agreement)

**Remove "flexible delivery options" unless the team has a source.**

---

## Slide 4 — Rescue Bonus: how it works, and why gaming doesn't pay
**Headline:** Same score, same app, same payout rail. Only the trigger changes.

**Top: 5-step flow**
1. **Score.** TrustMesh already scores every order before dispatch.
2. **Flag.** The riskiest 20% become **Bonus-Eligible Orders** (the budget is capped at 20%). The inputs we'd add to the score: distance from the hub and first-time/unclear address (both flagged in the data pack).
3. **Show.** The rider app shows "Bonus Eligible · +₹15 on delivery". Never the score, never the word "risk". Nothing changes for the buyer.
4. **Confirm.** Delivered = prepaid OTP, or COD cash reconciled at the hub the same day (both already required by Valmo's delivery agreement).
5. **Pay.** ₹15 via Valmo's existing **"Additional Incentive"** line, straight to the rider's bank account (Valmo pays riders directly under its published delivery agreement). Held until the return window closes.

**Prototype inset:** rider-app screenshot (a stop with "Bonus Eligible +₹15", no score shown) + hub-view thumbnail.
**Why targeted, not a blanket COD bonus:** "without hurting delivery cost" makes a flat bonus on every COD order pure added cost. Only targeting pays for itself, so the constraint is what *requires* a risk score.
**Metro vs small-town:** the pilot starts at a flat ₹15 everywhere. The 60-day plan re-prices by hub type.

**Bottom: "Does it hold once people work around it?"**
| Workaround | Control built in |
|---|---|
| Rider neglects normal orders to chase bonuses | The bonus pays only while the rider's normal-order delivery rate stays at baseline or above. Measured against Control Riders |
| Fake "delivered" (rider + buyer collude) | Existing OTP / cash reconciliation. Payout held through the return window. Post-delivery returns on flagged orders tracked |
| Rider pressures a reluctant buyer | Returns and complaints on Bonus-Eligible Orders are a pilot metric. Pressure shows up as returns |
| Riders learn which areas get flagged and stigmatise them | Score hidden. Flags shown as a bonus, not as risk. Monitored by pin code |
| Flag creep as the model drifts | Fixed 20% cap. Monthly re-grading (bonused vs control at equal score) |
| Rider makes a second trip for one stop and slows the bag | ₹15 buys cheap effort (calls, a 10-minute wait, a neighbour), not a trip. On-time % for the whole bag tracked |

---

## Slide 5 — Economics, sensitivity, and how the pilot proves it
**Headline:** One avoided return pays for eight bonuses. The pilot proves it in 30 days.

**Left: unit economics per 100 Bonus-Eligible Orders** (baseline success 60%, a pilot-measured assumption):
- Bonus cost = ₹15 × (60 + Δ). The bonus is also paid on orders that would have been delivered anyway.
- Saving = ₹120 × Δ (reverse avoided; data pack treats forward ₹50 as spent either way).
- **Break-even Δ ≈ 8.6 → "1 extra delivery for every 8 bonuses paid"** (R1's 1-in-8).
- **Conservative case:** if Valmo also pays the rider's ~₹18 delivery fee on each rescued order (riders are paid only on success), break-even rises to **Δ ≈ 10.3**. Show both; it builds credibility.

| Deliveries of 100 flagged | Net per 100 (data-pack basis) | Net per 100 (incl. rider fee) |
|---|---|---|
| 69 (Δ=9) | ≈ 0 | −₹150 |
| 75 (Δ=15) | +₹675 | +₹405 |
| 80 (Δ=20) | +₹1,200 | +₹840 |

**Scale:** 20% of ~763 mn FY25 Valmo orders ≈ 153 mn flagged a year → **₹62–184 cr/yr** net across Δ=15–20 and both cost bases. Upside not counted: the recovered sale (NMV). Valmo's share rose to 64.5% in H1 FY26, so volume is conservative.

**Middle: sensitivity** (heat table, net ₹ cr/yr, data-pack basis, 153 mn flagged):
| Bonus \ Δ | +5 | +10 | +15 | +20 |
|---|---|---|---|---|
| ₹10 | −8 | 76 | 161 | 245 |
| ₹15 | −57 | 23 | 103 | 184 |
| ₹20 | −107 | −31 | 46 | 122 |
(Formula: net per flagged order = [120Δ − B(60+Δ)]/100, × 153 mn flagged. Values checked 2026-09-27.)

**Right: pilot design** (unchanged from R1, now with numbers)
- 4 hubs (2 metro, 2 small-town), 30 days, baselined on the prior 8 weeks. Riders randomised into Bonus vs Control within each hub.
- Uplift is measured at the same risk score: bonused vs unbonused.
- **Pilot Verdict:** **GO** = ≥ +9 per 100 AND normal-order delivery down ≤ 1 pt AND returns/complaints flat. **RE-PRICE** = +3 to +9. **KILL** = < +3 or normal orders suffer.
- Precedents: Swiggy/Zomato rain pay already prices difficulty per order in India. A gig-worker field experiment (Butschek et al., 2022) finds responses vary by worker, which is why we pilot before scaling.

---

## Slide 6 — Refused parcels: don't send them all back
**Headline:** Send each refused parcel to its cheapest recovery. Only what's left travels back.

**Why it matters (top strip):** a return costs ₹120, which is **45% of Meesho's ₹265 average order**. Meesho reportedly doesn't charge sellers for RTOs, so every rupee saved is Meesho's. Today every refused parcel makes the full trip back. Shopee-style "refuse once, return to sender" is the industry default. **No Indian player redirects locally**; the prior art is US-only (return-to-new-buyer patents, Amazon Grade & Resell).

**Centre: the Router** (decision diagram, applied at the last-mile hub when the parcel comes back the same day):
1. **Soft refusal or missed delivery** (no cash on hand, wants it later, not home)? → **Second chance:** a two-way WhatsApp/IVR message ("reschedule · fix address · pick up nearby · pay by UPI") + one re-attempt within 48h. *Keeps the original sale.* Same build as the P1 lever.
2. **Unopened + same state + seller opted in + the SKU has local demand?** → **Hold & Re-home:** hold ≤48h and redirect to the next order for the same seller + SKU nearby. New AWB, local delivery ₹21. **Saves ~₹145 per match.**
3. **Item value below return cost and seller pre-authorised?** → **Local disposal** (liquidate/donate), saving the full ₹120.
4. **Everything else** → **consolidated return**, batched by seller/region instead of one parcel at a time (batched returns cost roughly 40–60% less per unit in US programmes).

**Right: Hold & Re-home break-even (the flagship lane)**
- Holding a parcel for 48h costs ≈ ₹8. A match saves ₹145. **Break-even = 5.5% match rate.** We don't claim a match rate; the pilot measures it.
- Sizing (130 mn RTO parcels/yr): conservative 2.5% effective match → ~₹50 cr · central 7% → ~₹140 cr · optimistic 13.5% → ~₹270 cr.
- Why only "head" SKUs: Meesho's catalogue is long-tail, so the lane is gated on SKU demand velocity in the catchment, not on a coincidental live order.

**Gates (one line):** same seller + same SKU (seller disclosure rules) · same state (GST place of supply) · unopened (Legal Metrology) · **seller opt-in, title never passes to Meesho/Valmo** (FDI Press Note 2). Detail in Appendix A6.
**Prototype inset:** router screenshot (each parcel → lane + reason + ₹ saved).
**Open question the pilot answers first:** how long refused parcels sit at the hub today. If they leave the same day, the 48h window must be created deliberately.

---

## Slide 7 — 30-60-90 with success metrics
**Headline:** Every phase ends with a number that decides the next.
| | Days 0–30 | Days 31–60 | Days 61–90 |
|---|---|---|---|
| **Rescue Bonus** | Pilot in 4 hubs, Bonus vs Control | RE-PRICE by hub type and distance band; extend to one region (~40 hubs) if GO | Scale decision network-wide; start difficulty-priced bonus tiers |
| **Refused-Parcel Router** | Measure hub dwell time and refusal reasons at pilot hubs; manual second-chance lane | Manual Hold & Re-home in 1 dense cluster (3 hubs), 50 opted-in sellers | Automated matching if match rate ≥ 5.5%; consolidated returns on top routes |
| **Prevent levers (P1/P2)** | — | Two-way WhatsApp confirm/reschedule on Bonus-Eligible Orders in pilot hubs; address-confidence fix in 1 small-town hub | Decision on each |
| **Success metric** | Uplift per 100 flagged (target ≥ +9); normal-order delivery Δ ≤ 1 pt | Cost per rescued order ≤ ₹120; match rate vs 5.5%; WhatsApp reply rate | Valmo RTO and **cost per successful delivery** vs baseline; ₹ saved per month |
| **Kill trigger** | < +3 or normal orders suffer | match rate < 3% after 30 days | net ₹ negative for 2 consecutive months |
Owner row: Valmo last-mile ops (bonus), reverse ops (router), data science (score grading), customer comms (WhatsApp).

---

## Slide 8 — Risks & second-order effects
**Headline:** The ways this could break, and what we do about each.
| Risk | Move | Likelihood | Mitigation |
|---|---|---|---|
| Uplift below break-even | Rescue | Med | Pilot + RE-PRICE path; the bonus switches off cleanly |
| Riders game the bonus (see slide 4) | Rescue | Med | OTP/cash proof, held payout, normal-order floor |
| Buyers pressured into orders they later return | Rescue | Low–Med | Returns/complaints on flagged orders are a GO criterion |
| Model drift inflates flags | Rescue | Med | 20% cap; monthly grading |
| Fairness: riders on hard routes earn less today | Both | — | This *raises* their pay; publish the bonus rule in-app |
| Hub space and custody for held parcels | Router | Med | 48h cap, a "resale-hold" custody status, insurance rider |
| Legal: marketplace seen as controlling inventory (Press Note 2) | Router | Low–Med | Seller opt-in, title stays with the seller, same seller/SKU only |
| Match rate too low (long-tail catalogue) | Router | High | Velocity gating; the other lanes still save money |
| WhatsApp fatigue or low reply rate | P1 / second chance | Med | Opt-in, one message per order, only for Bonus-Eligible or failed orders |
| Regional variation (metro ≠ small town) | Both | High | Separate metro/small-town arms and pricing |
| Valmo share shifts to 3PLs (it has held ~50% in Q1 FY27, and Meesho allocates by lowest lane cost) | Both | Med | Carrier-agnostic design (slide 9) |

---

## Slide 9 — 10x: price difficulty, then buy delivery by cost per *successful* delivery
**Headline:** Today the risk score is a filter. Tomorrow it's a price.
**Core claim:** every node in Valmo's asset-light network is paid a flat rate per parcel, whatever the difficulty. So money coordinates the whole network while carrying no information. RTO is one symptom.
**Three horizons:**
1. **Now:** one ₹15 bonus on the riskiest 20%.
2. **Next (6–12 months):** a continuous difficulty price per parcel (risk × distance × address quality × time slot), learned from pilot data. The rider sees one price per stop.
3. **Long-term:** outcome-based pay at every node (hubs paid per successful outcome, not per parcel handled). Refused parcels become a local inventory network (Router → a seller-authorised agency model, which we flag as an open legal question).

**The network metric (new):** Meesho already gives each lane to its lowest-cost provider (Q1 FY27 call: "no specific guidance" on Valmo share). Switch the yardstick to **cost per successful delivery** = (forward + RTO% × ₹120) ÷ (1 − RTO%):
- Valmo today: (₹50 + 17% × ₹120) ÷ 0.83 = **₹84.8**. At 14% RTO: **₹77.7** (−8%).
- Illustration: carrier A at ₹45 with 10% RTO costs ₹63 per success; carrier B at ₹40 with 20% RTO costs ₹80. **The cheaper parcel is the dearer delivery.**
- The same difficulty-pricing API can pay 3PL partners, so the idea works whatever Valmo's share becomes.

**Asset-light guardrail:** software + incentives on existing floor space. No warehouses (Vidit Aatrey, Feb 2026: warehousing "tends to have lower ROI").

---

## Appendix (only if the portal allows; otherwise use it for speaker notes and Q&A)
- **A1 Cause-pie build-up:** research teammate. The input and n for each slice.
- **A2 Prepaid decomposition:** RTO = c·(1−s_c) + (1−c)·(1−s_p). FY23 21.15% → FY25 17.79% (−3.36 pts). Holding success rates fixed and moving only the mix explains 2.30–2.37 pts = **69–71%**.
- **A3 RTO derivation:** FY23 0.8871×23.43% + 0.1129×3.24% = 21.15%; FY24 18.59%; FY25 17.79%.
- **A4 Economics:** formulas and tables from slide 5; volume basis 763.5 mn FY25 Valmo orders.
- **A5 Full gaming table:** `R2-HANDOVER.md` §5.
- **A6 Legal notes:** from `06-solution-inventory-recovery.md` §1, trimmed + the Press Note 2 line.
- **A7 Research method:** 12 rider interviews across Mumbai hubs, 25+ COD buyer survey. Sampling limits: metro catchment, IIT-area buyers, riders willing to talk. Plus the top-up calls.
- **A8 Sources:** from `10-sources.md`.
- **A9 Fact-check log:** claims we checked and rejected (from `10-sources.md`). Shows research rigour.
