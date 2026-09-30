# HANDOVER — Meesho DICE 3.0

Paste this into a new session to pick up with zero context loss. Written 2026-09-10.

---

## 1. THE SITUATION

**Competition:** Meesho DICE Challenge 3.0, Business Track only.
**Team:** 3 people. One is strong on decks. **Fieldwork and any building are on Gaurav alone.**
**Location:** Indian metro. No special industry access.

**Timeline:**
| Round | Window | Deliverable |
|---|---|---|
| **Idea Submission** | → **Sep 11, 11:59 PM IST** | **3 slides, one focused on solution design** |
| Detailed Submission | Sep 18 → Sep 28, 11:59 PM IST | 8–10 slides **+ working prototype** |
| Grand Finale | Bangalore | Present to Meesho leaders; every finalist gets interviewed |

**Prizes:** ₹1L / ₹60k / ₹40k. **Every Grand Finale participant is interviewed by Meesho**; top teams get PPIs and possible FTE as Senior Associate. The FTE is worth far more than the cash — objective is *reach the Finale*.

**Chosen case: ValMo — reduce RTO (Return to Origin).** Locked. You cannot switch; the Round 1 case carries into Round 2.

**Template:** `Meesho/DICE Challenge S3 Template for Case studies submission (Presentation).pptx` — 5 blank Meesho-branded slides, 16:9 (20″×11.25″). Slide 1 is a cover and appears not to count toward your three. No mandated content structure.

---

## 2. HOW ROUND 1 IS SCORED

Four criteria only. **Note what's absent: nothing about whether your solution is good.**
1. **Extent of Research** — methods, sources, coverage
2. **Quality of Insights**
3. **User-First Approach**
4. **Problem-First Mindset**

Round 2 adds: Depth of Analysis · Innovativeness · **10x and Long-term Thinking** · Feasibility · Presentation Skills.

**Competitive intel:** S3 had 1,539 registrations as of Sep 8 (S1: 10,443 · S2: 4,072). S2's Business track ran 200+ teams → Top 5. **The working prototype is NEW in S3** — neither prior season required software, so there's no prior art and no template. An S2 national finalist (Top 5 of 200+) reported what judges rewarded: *"Execution > Ideas. Everyone has ideas. Few people can show exactly how to ship them in 30 days."* Specifically: a 30-day roadmap, RICE-style prioritisation with maths shown, named risks with mitigations, and **153 real surveys of which 60% of starting assumptions had to be revised.**

⚠️ **Meesho penalises pivoting** — S1 rules say teams must *"enhance and detail their solutions and not change their ideas completely"* between rounds.

---

## 3. THE THESIS

**One in six Valmo parcels never reaches its buyer.** Each costs ₹170 instead of ₹50.

Almost all of it is cash-on-delivery: **22 fail per 100 CoD vs 3 per 100 prepaid.** That ~19.6-point gap is the entire problem.

**The finding that reframes it:** Meesho pushed hard on prepaid — CoD fell from 78.5% to 72% of orders — and **CoD delivery success got WORSE anyway (78.05% → 75.85%).** The industry-standard lever is not reaching the cause.

**Our insight (primary research, n=8 riders across different hubs):** riders are paid only for successful deliveries, nothing for effort. So they put discretionary effort into prepaid orders and withhold it from cash orders, which they've learned tend to fail. It becomes a loop — expected to fail → less effort → fails → expectation confirmed.

**The solution:** Meesho already scores every order's risk (TrustMesh) and then uses it only to filter orders pre-dispatch. Send that score downstream to the delivery hub. Pay a bonus on **risky cash orders that actually get delivered**, via the app, to the rider who delivered it.

⚠️ **Do NOT overclaim causation.** Two separate claims: (a) the payment-mix lever is saturating; (b) here is one unexamined cause we found evidence for. Riders may be accurately *reading* real customer behaviour rather than causing it — **the pilot is designed to measure exactly that.** That makes it an experiment, not a rollout.

---

## 4. THE NUMBERS (all verified)

**From Meesho's Prospectus (RHP, 27 Nov 2025), Risk Factor 6, pp. 96–97:**
[morganstanley.com/content/dam/msdotcom/en/indiaofferdocuments/pdfs/Meesho_Limited_Prospectus.pdf](https://www.morganstanley.com/content/dam/msdotcom/en/indiaofferdocuments/pdfs/Meesho_Limited_Prospectus.pdf)

| | FY23 | FY24 | FY25 | H1 FY25 | H1 FY26 |
|---|---|---|---|---|---|
| CoD % of shipped orders | 88.71% | 85.39% | 76.95% | 78.51% | 72.00% |
| **CoD success rate** | 76.57% | 78.60% | **77.70%** | 78.05% | **75.85%** |
| **Prepaid success rate** | 96.76% | 97.85% | **97.28%** | 97.39% | 96.39% |
| Shipped orders (mn) | 866.93 | 1,146.38 | **1,587.94** | 713.98 | 1,077.82 |

**Derived by us:** CoD RTO ≈ 22.3% · Prepaid RTO ≈ 2.72% · Blended ≈ **17.8%** (FY25) → **~283mn failed parcels system-wide**.

**Valmo:** 763.51mn shipped FY25 (**48.08%** of Meesho), **64.52%** by H1 FY26 → **~136mn Valmo RTO parcels/year**.

**Case data pack:** CoD 80% of Valmo orders · CoD RTO 20% · prepaid RTO 5% · forward ₹50 · reverse ₹120.
Leg split (₹): FM Hub 4 · FM Carting 2 · FMSC 5 · NLH 8 · LMSC 5 · RLH 5 · **LMDC 21** → last mile is **42% of forward cost**.

**Other Valmo facts (prospectus):** 102,349 delivery agents · 18,098 active logistics providers · cost per placed order ₹47.03 (FY24) → ₹43.08 (FY25) → **₹38.38 (H1 FY26)** · **4 handovers FY25, 4.5 in H1 FY26** per order · **100% asset-light — no owned/leased warehouses, dark stores or fleet at any mile** · Meesho = 29–31% of all Indian e-commerce shipments ex-hyperlocal.

⚠️ **Rider pay ~₹18–25 per successful delivery** — franchise writeups only, thin sourcing. Say "reportedly."

⚠️ **Vendor-reported correlates** (unaudited, directionally useful): RTO by TAT 22% (1–2d) → 27% (3–5d) → **35% (>5d)** · zone: intra-city 20% → special zones 28% · geography: Vadodara 18% → **Patna 35%** · AOV: <₹500 = 25%, **₹500–1,000 = 28% (worst)**, >₹1,000 = 24%.

---

## 5. THE ECONOMICS

Per **100 flagged risky cash orders**, paying ₹15 for each one delivered:

| Deliveries (from 60) | Return cost | Bonus paid | Net |
|---|---|---|---|
| 69 | ₹3,720 | ₹1,035 | **break-even** |
| 75 | ₹3,000 | ₹1,125 | **+₹675** |
| 80 | ₹2,400 | ₹1,200 | **+₹1,200** |

**Break-even ≈ 9 extra deliveries per 100 flagged orders.** At scale (flag riskiest 20% of ~587mn CoD orders ≈ 117mn/yr): roughly **₹80–140 cr/year** plus recovered sales.

**The line to remember:** *it costs ₹120 to bring a parcel back; it costs ₹15 to make a rider try harder.*

**Why ₹15 works:** rider base is ~₹20/delivery, so this nearly doubles pay on that order. **But it buys cheap effort only** — 3 more calls, a 10-minute wait, asking a neighbour. It does NOT buy a second trip (that costs the rider 2 other deliveries ≈ ₹40). Our rider said he *"calls 2–3 times and leaves"* — cheap effort is exactly what's missing.

---

## 6. FIELD EVIDENCE — n=8 riders, multiple hubs

**Different hubs matters** — it rules out "one operator's local policy."

- Paid **per successful delivery**, not per attempt. No pay for effort.
- **Motivated** — re-attempts specifically to earn more. Not a lazy-rider story.
- Process: attends address, **calls 2–3 times, leaves if unanswered**.
- Chases a wrong address if it's within reach.
- **Puts extra effort into PREPAID only.** Cash has taught them the customer is probably cancelling.
- No targets at his hub.
- **His hub serves Flipkart AND Meesho** — so Meesho competes for rider effort against other platforms' parcels in the same bag.
- **Assumption (unconfirmed): the HUB pays the rider, not Meesho.** Meesho pays the hub; hub pays rider. Flag as an assumption on the slide.

**Sampling limits — state them yourself:** metro catchment while Meesho's base is T2/T3 · IIT-area is students/hostels, atypically dense and phone-literate · CoD scepticism may be formed partly on Flipkart orders · riders willing to talk are the least busy.

⚠️ Discount the rider's *stated preference* ("incentives would be good"). Everyone says yes to more money. Use only **reported behaviour**.

---

## 7. THE THREE SLIDES

**Built 2026-09-10.** Files in `Meesho DICE/`: `Meesho DICE R1 - ValMo RTO.pptx` (official template — cover + 3 slides, rendered full-bleed) · `round1-deck.html` (editable design source) · artifact: https://claude.ai/code/artifact/b2287f8e-fc2e-47db-a32c-2ad07983cf3f · per-slide PNGs in the session scratchpad.

Guidelines are still literal. The Round-1 asks — (1) map the biggest RTO reasons with rough sizing, (2) the framework used to prioritise, (3) one 30-day quick win — map onto the three slides below.

Two reframes run through the whole deck:
- **Remove the barrier, don't add effort.** Riders already re-attempt for pay; the problem is a *belief* ("CoD = the customer will cancel") that makes them skip the cheap effort — the calls, the wait, the neighbour-ask — on CoD only. The goal is to get a CoD order the *same* 2–3 calls a prepaid order already gets. Close the effort gap; don't raise the ceiling.
- **Dual-mode risk scoring.** Today TrustMesh scores CoD only, pre-dispatch only. The pilot flags the riskiest ~20% of *all* orders, both modes — CoD weighted higher, but a prepaid buyer with a flagged history can outscore a clean CoD one.

### Slide 1 — "Sizing · Challenge · Opportunity"
Answers the map-and-size ask through three columns, left → right:
- **Sizing (the market):** Meesho GMV vs NMV, 5 quarters (Q1FY26→Q1FY27, ₹ cr, Q1 FY27 letter). Bar = GMV; solid = NMV; gap = cancellations + RTO + returns + discount. Insights: ≈₹7,400 cr/qtr leaks (~61% conversion, ~₹30k cr/yr); NMV +34% YoY beat orders +29%, and Meesho attributes it to "lower Cancellations and RTO" → RTO down = top line up ~1:1.
- **Challenge (5 stats):** 1 in 6 fail (blended ≈17%, ~136mn Valmo/yr) · CoD 20% vs prepaid 5% RTO, CoD = 80% of Valmo · ₹170 vs ₹50, last mile = 42% of forward cost · **75.85%** — CoD success *after* the CoD mix was cut 78.5→72% (was 78.05%): the prepaid-shift lever is spent · 4.5 handovers/order.
- **Opportunity (the rider):** the rider is the only node that meets the customer. Field (n=8, multiple Mumbai hubs): the "CoD = will cancel" rule; prepaid gets 2–3 calls, CoD gets none; the loop expects failure → withholds effort → it fails → belief confirmed.
- On-slide caveat: GMV−NMV is not all RTO (also cancellations, returns, discounts); the CoD/prepaid split is audited-derived, the cause read is ours — no public India RTO-cause breakdown exists.

### Slide 2 — "Prevent · Rescue · Recover" on Impact × Effort
The prioritisation framework. Three postures, every strategy plotted on **Impact** (effect on the 20-vs-5 CoD gap) vs **Effort** — a *labelled composite*: engineering lift · per-parcel cost · time-to-live · brief-permissibility · network disruption · behaviour/pass-through risk. Quadrants: Pursue / Assess / Consider / Defer.
- **Prevent** (before dispatch): confirm availability/slot · address clean-up/geocoding · risk-score both modes pre-dispatch. Scored on *incremental* impact — TrustMesh & predictive routing already live, CoD success still fell. Mostly Consider/Assess.
- **Rescue** (parcel in the field, flagged): carry the flag to hub + rider · **incentivise the hub for flagged orders delivered → hub shares with the rider** · proof-of-visit vs fake "attempted". Low effort (score + payout rail exist, brief-clean), high impact → sits alone in **Pursue**.
- **Recover** (customer refused): resell locally / local inventory buffer, redeploy to nearby demand · short hold-and-retry before the ₹120 haul-back. High ceiling but GST place-of-supply + anti-pilferage → Assess (Round 2).
- "Force prepaid / CoD gating" shown struck through — the brief forbids it.

### Slide 3 — the 30-day RESCUE pilot
One idea, no hedge. **Not paying for a second trip — paying to break the "CoD is dead" reflex** so a flagged order gets the rider's normal prepaid playbook.
- **Money flow:** Meesho pays the **hub** ₹15 per flagged order *delivered* — never "attempted", never on total volume → hub **splits with the delivering rider** (~60/40 illustrative, ratio tunable), same day, in-app. Routes hub→rider because the hub pays the rider today (assumption, flagged). Keeps Valmo asset-light.
- ⚠️ **NOT on total orders delivered** — that pays for speed and makes riders skip hard orders harder.
- 30 days: 1 cluster, 3–5 hubs, ~100k flagged/mo. Setup (baseline prior 8 wks) → live → mid-read → readout + go/no-go.
- **Measure four:** flagged delivered (barrier lifted?) · **unflagged delivered in the same hubs = the control** (did effort just move?) · returns after delivery (anyone pressured?) · net cost/order.
- Test: ≥ 9 extra deliveries per 100 flagged → self-funding. At scale ≈ ₹80–140 cr/yr net + recovered sales.
- Line to keep: "₹120 to haul a parcel back; ₹15 to reset the reflex that sent it there."
- Honest framing: if it *doesn't* work, the barrier wasn't effort — learned for the price of one pilot. Experiment, not rollout.

**Every slide carries an evidence footer strip:** which Meesho filing, the case data pack, rider count (n=8). Extent of Research is the top criterion — keep it visible. **No appendix** — the brief says three slides.

**Framing rule:** state the brief's constraint as *ours* — "the brief rules out checkout-side friction, so we worked the parcel's journey downstream." Never frame it as other teams being wrong.

**Superseded 2026-09-10:** the earlier plan (Slide 1 = pure RTO cause-split table; Slide 2 = Size/Allowed/Speed/Cost scored table). Core idea unchanged — incentive on risky-delivered orders — so this is detailing, not a pivot.

---

## 8. WHAT TRUSTMESH IS

Meesho's risk-checking system. Before an order ships it scores how likely the order is to be a problem, and filters out high-risk ones. Q1 FY27 letter: RTO fell *"due to enhancements to 'TrustMesh' algorithms filtering out high-risk orders."*

**Downstream: it does nothing.** The score is used once, at order acceptance, then discarded. It doesn't travel with the parcel. The hub can't see it. The rider knocking on the door doesn't know the system already predicted failure.

**That's the whole idea: Meesho already knows which orders will fail — it just doesn't tell the person delivering them.**

⚠️ Meesho has never published what TrustMesh looks at or how it scores. Claim only "filters high-risk orders." Also: the separately-circulating "9 million blocked transactions" figure comes from press, **not** the shareholder letter — don't attribute it there.

⚠️ Meesho's "predictive routing models" (Q1 FY27 letter) is ONE sentence with no mechanism. Routing = parcel paths and hub sequencing. **Neither TrustMesh nor predictive routing touches rider assignment or rider pay.** Verified.

---

## 9. STILL OPEN

1. **Who actually pays the rider** — Meesho or the hub? Load-bearing for slide 3. Ask: *"Who pays you — Meesho or the hub owner?"*
2. **Survey** — was not sent as of Sep 10. Decision was to send it; check status.
3. **Rider tallies → the Slide 1 cause split** — the numbers need extracting from the 8 interviews.
4. **Round 2 prototype is undefined.** Since we're reusing TrustMesh rather than building a model, what gets demoed on Sep 28? Candidate: a simulator taking order attributes → risk score → optimal bonus → predicted uplift → net P&L.
5. **The 10x gap for Round 2.** The incentive fix is an optimisation, not 10x. The 10x version sits inside the same insight: **Valmo pays a flat rate per parcel regardless of difficulty at EVERY node — the whole asset-light network is coordinated by money that carries no information.** RTO is one symptom. Re-architecting to difficulty-priced payments across the network is the long-horizon idea.

---

## 10. KILLED — do not revisit

| | Why |
|---|---|
| **Pricing case** | Meesho has shipped a Price Recommendation Tool since 2022 (elasticity-based, ~125k sellers/month by Jul 2022). And no public data exists to build a real one — the official Kaggle dataset is images only. |
| **Seller Growth (C2M)** | No route to manufacturer interviews. IndiaMART averages 4–8 hrs to answer *inbound* enquiries at <3% conversion. |
| **Monetization** | Requires inventing something genuinely new — highest variance. (Note: Meesho bought **Kirana Club** for ₹202 cr in June 2026, which already occupies the two obvious answers.) |
| **User Growth** | No public gender-split data exists anywhere. Most crowded case. Weakest prototype. ⚠️ A hallucinated "55% female / 45% male" stat circulates — never use it. |
| **Content Commerce** | Creator DM latency — replies take days. |
| **RTO risk model at checkout** *(as prototype)* | Commodity. Delhivery RTO Predictor, GoKwik, Shadowfax all sell it; Meesho runs TrustMesh. Would be showing Meesho their own system. |
| **Pickup points / self-pickup** | The S1 Business national winner already proposed this and Meesho owns that IP in perpetuity. |

**Local inventory-recovery matching** (redirect refused parcels to nearby confirmed demand) is NOT killed but is **not the Round 1 spike.** It's the most convergent idea in the case, isn't a 30-day win, and struggles against Meesho's long-tail catalogue. Hold it for Round 2 — R2 *mandates* a proposal for refused orders. Full analysis in `06-solution-inventory-recovery.md`, including the GST place-of-supply architecture, which is genuinely differentiated material.

---

## 11. TRAPS

- ❌ **Don't cite** *Aarel Import-Export* or *Gandhar Oil* AAR rulings — they turn on an import-specific rule and a GST-literate judge will catch it.
- ❌ **Don't cite** any "80/20" or Gini SKU-concentration figure for Indian fashion — all unsourced vendor marketing.
- ❌ **Don't cite** the "42% refused / 28% unavailable / 18% wrong address" RTO cause split — SEO blog, no methodology.
- ❌ **Don't cite** "RTO is 40–50% of shipments" (Logistics Insider) — irreconcilable with audited ~18%.
- ❌ **Don't use** the 5–7 day RTO window as a "hold" window — that clock is about re-attempting to the *original* customer.
- ⚠️ The RHP's **"Return orders"** line (64mn FY25) is a DIFFERENT pool — post-delivery returns, not RTO. Be explicit which you mean.
- ⚠️ **No independently audited RTO-reduction result exists from any Indian vendor.** Saying so is a credibility asset.
- ⚠️ **Vidit Aatrey is on record**: warehousing *"tends to have lower return on investment"*, asset-light is deliberate, quick commerce de-prioritised (*"price matters more than speed"*). Anything reading as "build infrastructure" contradicts stated doctrine.
- ⚠️ Node margins are razor thin — Shadowfax nets **~15 paise per order**. Anything adding per-parcel cost breaks the hub.

---

## 12. FILES

All in `Meesho DICE/work/`:

| File | Contents |
|---|---|
| `00-case-digest.md` | All 6 problem statements condensed. Replaces the PDFs. |
| `01-valmo-research.md` | Prospectus numbers, competitor landscape, white spaces, past-DICE intel |
| `02-decisions.md` | Decision log with reasons; includes the Pricing/UG kill findings |
| `03-interview-script.md` | Rider + hub-operator scripts (Hindi + English), capture sheet |
| `04-survey.md` | Google Apps Script that builds the survey + distribution messages |
| `05-why-each-question.md` | Rationale for every interview question |
| `06-solution-inventory-recovery.md` | Local-matching solution: legal architecture, economics, prior art. **Round 2 material.** |
| `07-problem-breakdown.md` | Solution-neutral problem structure, 8 layers, confidence-marked |
| `HANDOVER.md` | This file |

---

## 13. IMMEDIATE NEXT STEPS

1. Pull the cause split out of the 8 rider interviews → Slide 1 numbers
2. Send the survey if not already out
3. Build the three slides in the Meesho template
4. Teammate reviews
5. **Submit Sep 11 afternoon — not 11:58 PM**
