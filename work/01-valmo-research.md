# Valmo / RTO — research findings

Two background research passes, 2026-09-08. Confidence: ✅ confirmed primary source · ⚠️ vendor/trade press, unaudited · 🔵 derived by us.

---

## A. THE PRIZE — Meesho's own audited numbers

**Source: Meesho Limited Prospectus (RHP, 27 Nov 2025), Risk Factor 6, pp. 96–97.**
[morganstanley.com/content/dam/msdotcom/en/indiaofferdocuments/pdfs/Meesho_Limited_Prospectus.pdf](https://www.morganstanley.com/content/dam/msdotcom/en/indiaofferdocuments/pdfs/Meesho_Limited_Prospectus.pdf)

| Metric | FY23 | FY24 | FY25 | H1 FY25 | H1 FY26 |
|---|---|---|---|---|---|
| CoD % of shipped orders | 88.71% | 85.39% | 76.95% | 78.51% | 72.00% |
| **CoD success rate** | 76.57% | 78.60% | **77.70%** | 78.05% | **75.85%** |
| **Prepaid success rate** | 96.76% | 97.85% | **97.28%** | 97.39% | **96.39%** |
| Shipped orders (mn) | 866.93 | 1,146.38 | 1,587.94 | 713.98 | 1,077.82 |

Success rate = successfully delivered ÷ shipped, of that payment type. So **1 − success ≈ RTO/failed-delivery rate.**

🔵 **Derived:** CoD RTO ≈ **22.3%** FY25, **24.15%** H1 FY26. Prepaid RTO ≈ **2.72%** FY25, **3.61%** H1 FY26. Blended ≈ **17.8%** FY25, **18.4%** H1 FY26. On 1.59bn shipped orders FY25 → **~283 million RTO parcels**.

**This validates the case's data pack** (COD 20%, prepaid 5%, blended 17%) against audited filings — and lets us cite a primary financial source instead of the handout.

### 🔥 The counter-intuitive headline
**CoD success got WORSE in H1 FY26 (78.05% → 75.85%) even as CoD mix fell from 78.5% to 72%.** Blended RTO *rose* despite the prepaid shift. The mix-shift lever — the one everybody will propose — is running out of road. This is the single best slide-one fact available.

---

## B. THE 10x IDEA — local resale of refused parcels. Verdict: survives, but reframe.

### Novelty
| Dimension | Novel? |
|---|---|
| The concept (monetise the parcel where it stands rather than pay to haul it back) | ❌ **No.** Amazon patented it in 2012 |
| Doing it **pre-RTO, at the last-mile DC** (not post-haul at a warehouse) | ✅ Largely — no operator found doing this |
| Doing it in **India, COD, ~₹300 AOV, asset-light 100k-agent network** | ✅ Genuinely unexploited |
| Patentable in India | ❌ No — India applies worldwide novelty; US prior art kills it |

**Prior art to name before a judge does:**
- ✅ **Amazon US 8,615,473 B2** (filed 2012, granted 2013), "anticipatory package shipping." Verbatim: *"Rather than incur the potential cost of returning or redirecting a package without a sale, some or all of the potential cost may be offered as a discount to a potentially interested customer… as an inducement to convert the potential interest into an order."* → [patents.google.com/patent/US8615473B2](https://patents.google.com/patent/US8615473B2/en)
- ✅ **Formula Labs family** US 9,760,854 B1 → US 11,900,442 B1 — reroute undelivered in-transit orders to a different requesting customer
- ✅ **ZigZag Global** (Rithum) — production "resell locally vs restock" decisioning for cross-border returns
- ✅ **Optoro SmartDisposition®** — AI routing of returns to most profitable node
- ❌ **Nobody, anywhere,** resells a *refused* parcel to a *different local buyer* from a *last-mile DC*. Jumia (closest COD analogue) uses pickup stations instead.

**Honest pitch:** not "nobody thought of this" — *"a known disposition-routing principle that no one has pushed to the last-mile node, and India's COD/RTO economics are the only place the arbitrage is big enough to justify it."*

### The real blocker (this is the insight, not the obstacle)
Everyone will hand-wave about e-way bills. They're wrong:
- ❌ **E-way bill is a red herring** — Rule 138 threshold is ₹50,000; Meesho AOV is a few hundred rupees.
- ❌ **Ownership is not the problem** — ✅ SOGA s.54(2)/(3): unpaid seller's right of resale gives buyer 2 **good title**. Clean chain.
- ❌ **Invoice cancellation is routine** — credit note under CGST s.34.

✅ **The actual binding constraint is GST place-of-supply.** CGST s.2(85) makes any place where goods are stored a "place of business"; s.22 r/w s.25 requires registration **in every state you supply from**. Selling a Surat seller's parcel out of a Patna DC needs a Bihar GSTIN. And **Notification 34/2023-Central Tax** (w.e.f. 1 Oct 2023) means the small-seller registration exemption applies *only* if they make no inter-state supply from a single state — a local resale voids it outright.

🔵 **So the constraint is arithmetic, not doctrine:** Meesho has **1.04mn Annual Transacting Sellers**, mostly single-state MSMEs, and Valmo covers ~19,000 pin codes. The law permits selling from a remote node; the seller base cannot bear the compliance. **Engineering around this IS the solution.**

### Other constraints to design around
- ✅ **FDI Press Note 2 (2018)** — a foreign-invested marketplace may not own inventory. "Meesho buys the parcel off the seller at a haircut" is illegal. Seller must stay principal throughout.
- ✅ **Carriage by Road Act 2007 s.15** — a *carrier* may sell unclaimed goods only after 30-day + further 15-day notice. Kills the carrier-led version; only the seller-as-principal route works.
- ✅ **VTPL is registered as a Goods Transport Agency under GST** — selling goods is outside that registration; needs a separate entity, which re-triggers Press Note 2.
- ⚠️ **Legal Metrology (Packaged Commodities) Rules 2011** — re-labelling makes the DC operator a "packer."
- ⚠️ **Consumer Protection (E-Commerce) Rules 2020** — buyer 2 gets full seller identity, origin, grievance officer, same return rights.

### ⚠️ The hardest objection a judge will raise
Local resale of undelivered parcels **already happens illegally, at scale.** Surat, Apr 2026: **33,035 Meesho parcels (₹1.35 crore)** marked delivered via OTP-loophole collusion and misappropriated. Noida gang: ₹75 lakh of Flipkart/Amazon goods "resold in the open market at reduced prices." Any legitimate sell-at-the-DC scheme runs directly against the anti-pilferage control regime those cases produced. **Must be answered head-on.**

Also: ✅ Meesho has filed FIRs against parties fraudulently offering Valmo hub allotments. The franchise-DC channel is already a fraud surface.

### Two halves already exist separately in India
- ✅ **Ecom Express DRHP p.181:** *"We also operate **dark stores at our delivery centers**… helps us monetize our delivery centers in a unique way."* — selling forward stock from last-mile DCs, already real.
- ⚠️ **Delhivery QC-RVP:** 26,000 last-mile agents run 20+ parameter quality checks **at the customer's door**. For AJIO: resaleability of returns **25% → 98%**, refunds 8 days → 24 hrs, NPS +130%.

**Nobody has joined them at the RTO parcel.** That's the gap.

---

## C. ⚠️ CORRECTION — "RTO risk model at checkout" is a COMMODITY

This was my proposed prototype. It is already a shipping product from at least three vendors:

| Player | Product | Claim |
|---|---|---|
| **Delhivery** | **RTO Predictor** — ML on 2.7bn+ shipments + location intelligence, integrates at checkout, carrier-agnostic | *"reduces RTOs by up to 20%"*; 4,800+ D2C brands ⚠️ |
| **GoKwik** | Checkout RTO risk scoring, COD gating, prepaid nudges | Sam & Marshall 17–20% → 12%; ~₹130 Cr saved ⚠️ |
| **Shadowfax** | "RTO Predictor" AI return-risk scoring | *"reduce RTO by almost 60%"* ⚠️ marketing, no methodology |
| **Meesho itself** | **TrustMesh** (~9mn high-risk transactions blocked FY26 ⚠️) + *"predictive routing models"* cited for lower RTO in Q1 FY27 ✅ | — |

**Building a checkout RTO scorer would be re-presenting Meesho's own existing system back to them.** Do not do this.

❌ Note: **no independently audited RTO-reduction result exists from any Indian vendor.** Every number above is self-reported. Saying so in the deck is a credibility asset.

---

## D. WHITE SPACES — where the spike actually is

### 1. 🔥 Rider incentive redesign
❌ **"Not found: any published Indian work on rider/delivery-partner incentive redesign as an RTO lever."** Genuine white space.

- The case names it directly: *"Riders are currently paid the same fixed rate for all successful deliveries; for certain specific orders riders have a lower intent, leading to RTO."*
- ✅ Meesho discloses only the *negative* control — suspending volume allocation to partners breaching CoD remittance thresholds.
- Reachable by exactly the fieldwork planned (riders, in person).
- Second-order effects are rich — and the case explicitly asks *"does your idea hold up once riders, hubs, or customers try to work around it?"*

### 2. Predict WHEN the customer is home, not WHETHER they'll refuse
✅ **Kandula, Krishnamoorthy & Roy (2021), "A prescriptive analytics framework for efficient E-commerce order delivery," *Decision Support Systems* 149:113584.** [doi:10.1016/j.dss.2021.113584](https://doi.org/10.1016/j.dss.2021.113584)
Two-stage: ML predicts delivery success **for each period of the delivery shift**, feeding a scheduling optimiser. Two real-world datasets from a large e-commerce platform. **Result: up to 10.2% delivery-cost savings vs current practice.**
Framing: *"due to the lack of customer availability information, schedules are optimized for shortest tour distance… orders are not delivered in customer-preferred time periods resulting in missed deliveries."*
→ Differentiated from the commodity checkout-scoring approach every vendor sells.

### 3. Pre-RTO local resale at the last-mile node (Section B)

---

## E. Causal variables, ranked by evidenced effect size

1. **Payment mode — dominant.** ~20pp gap, CoD vs prepaid, on Meesho's audited numbers ✅
2. **Delivery TAT** — RTO 22% (1–2d) → 27% (3–5d) → **35% (>5d)** ⚠️ Shipway
3. **Zone** — intra-city 20% → inter-state non-metro 27% → special zones 28% ⚠️
4. **Geography** — best Vadodara 18%, worst **Patna 35%** (also Srinagar, Jaipur, Varanasi, Ranchi, Jammu, Meerut, Guwahati, Vizag, Nashik) ⚠️
5. **AOV** — <₹500 = 25%, **₹500–1,000 = 28% (worst)**, >₹1,000 = 24% ⚠️
6. **Address quality** — ✅ Delhivery AdFix geocoding, *"augmenting it to get exact doorstep information"* (AR FY25 p.21)
7. **Handover complexity (Valmo-specific)** — ✅ average **4 handovers FY25, 4.5 H1 FY26** between different logistics providers per order. Every handover is a failure surface; an RTO retraces all of them.
8. **Fraud / CoD abuse** — ✅ Meesho: *"may restrict CoD access for repeat offenders or impose a convenience fee on consumers with high RTO rates"*

⚠️ **There is NO methodologically credible published RTO cause-breakdown for India.** The only percentage split found ("42% refused / 28% unavailable / 18% wrong address / 12% fraud") is an SEO blog with no stated method or sample. **Do not cite it.** Generate a split from the case data pack + our own primary research and say exactly that.

❌ Also **distrust:** Logistics Insider's *"RTO is 40–50% of shipments"* — irreconcilable with Meesho's audited ~18% and Delhivery's stated 14–18% industry average.

---

## F. Valmo facts worth citing (all ✅ Prospectus)

- Launched **Aug 2022**. Share of Meesho shipped orders: 1.83% (FY23) → 19.55% (FY24) → **48.08% (FY25)** → **64.52% (H1 FY26)**
- LTM to 30 Sep 2025: **18,098 active logistics providers**, **102,349 Valmo delivery agents**, 5 end-to-end partners
- **Only completely asset-light model among scaled Indian e-comm logistics providers (FY25)** — no owned/leased infrastructure at first-, mid- or last-mile. No warehouses, no dark stores.
- **Cost per placed order: ₹47.03 (FY24) → ₹43.08 (FY25) → ₹38.38 (H1 FY26).** Charged to sellers: ₹51.17 → ₹52.26 → ₹44.20
- Valmo avg cost per shipment is **0.5–11% below** the scaled-provider average (LTM Sep 2025)
- Meesho = **29–31% of all Indian e-commerce shipments ex-hyperlocal, FY25** (Redseer) — highest of any player
- Q1 FY27: 725mn placed orders, NMV ₹11,614 Cr (+34% YoY), 274mn ATUs, **1.04mn annual transacting sellers**
- Refunds processed on average within **1 hr 14 min** of product pickup (FY25)
- ✅ **"Return and RTO Assurance Program"** — Meesho already *monetises* RTO risk: sellers pay a % of sale revenue for protection against return costs (Prospectus p.444). **Any new RTO product must be positioned relative to this existing P&L line, not as if the problem were unaddressed.**

⚠️ **Unverified but strategically enormous:** blog sources claim RTO is *free* to Meesho sellers while post-delivery customer returns cost ₹140–170. If true, **Meesho absorbs RTO cost itself** — so the entire benefit of an RTO-reduction idea lands on Meesho's own P&L. **Verify against the Meesho supplier rate card before building the business case on it.**

❌ **Meesho does not publish an RTO rate anywhere.** No Valmo-specific RTO figure, no reverse-cost split, no DC count in any filing.

---

## G. Competitive intel — past DICE editions

- **Prototype is NEW in S3.** S1 and S2 never required working software in either track. S2's Tech track actually *reduced* the artefact to a 2,000-word one-pager. No prior art, no template, no past winner to copy.
- S3 page, verbatim: *"the builders who win are the ones who can size a problem, crunch the data, and ship a fix themselves."* Tracks merged; engineers expected to build.
- **Registrations:** S1 10,443 · S2 4,072 · **S3 1,539** (as of 8 Sep, 3 days left). S2 Business ran 200+ teams → Top 5.
- **S1 Business national winner (IIM Mumbai) proposed a self-pickup last-mile logistics model.** Participants assign all IP to Meesho in perpetuity — **Meesho already owns a pickup-point answer to failed delivery. Do not re-tread it.**
- **What an S2 national finalist (Top 5 of 200+) says judges rewarded:** *"Execution > Ideas. Everyone has ideas. Few people can show exactly how to ship them in 30 days with limited resources."* Specifically: a 30-day roadmap not a multi-year vision; RICE prioritisation with the maths shown; named risks + mitigations; **153 real surveys of which 60% of starting assumptions had to be revised.**
- ✅ S1 rules: teams are expected to *"enhance and detail their solutions and not change their ideas completely"* between rounds. **Meesho penalises pivoting — the Round 1 idea locks you.**
