# R2 HANDOVER — Meesho DICE 3.0, Detailed Submission Round

Paste or point a new session at this file to pick up Round 2. It's a running log, so update the **Session log** at the bottom every session.
Round 1 background (research, numbers, killed ideas, traps) is still in `work/HANDOVER.md`. Read it for depth. This file **overrides** it wherever the two disagree, because the deck we actually submitted differs from that plan (see §2).

**First written:** 2026-09-25 · **Team:** GPS, IIT Bombay · **Track:** Business · **Case:** Valmo, reduce RTO (locked)

---

## 0. STATUS AT A GLANCE

| | |
|---|---|
| Round 1 | ✅ Submitted (`Downloads/GPS_IIT Bombay.pptx` / `.pdf`, cover + 3 slides). **Shortlisted.** |
| Round 2 deliverable | **8–10 slide deck + working prototype** |
| Round 2 deadline | **Oct 4, 2026** (confirmed by Gaurav 2026-09-25; the old Sep 28 date is wrong). About 9 days from Sep 25. |
| Rule | **Enhance and detail. Do not pivot.** R1 hero = R1 lever (risk-weighted delivery incentive). It stays the hero. |
| Round 2 scoring | Depth of Analysis · Innovativeness · **10x & Long-term Thinking** · Feasibility · Presentation Skills. The R1 criteria (research, insights, user-first, problem-first) still matter. |
| Valmo R2 content asks (case PDF) | ① exec summary ② where + why RTO happens, backed by research and/or the data pack ③ prioritised solutions **with expected impact** ④ **a specific proposal for refused/undelivered orders instead of sending them back** ⑤ **30-60-90 plan with success measurement** ⑥ risks. Also: show the sizing working, and cover **second-order effects** ("does it hold once riders/hubs/customers work around it?") |

---

## 1. WHAT WE ACTUALLY SUBMITTED IN ROUND 1 (source of truth)

**Title:** "Reducing RTO: Getting more orders delivered", Team GPS

**Slide A — "RTOs are down, but COD remains the biggest RTO challenge"**
- RTO rate 21.2% (FY23) → 18.6% (FY24) → 17.8% (FY25), a **16% reduction**, but still 18 of 100 orders fail. (All three figures re-derived from RHP numbers this session and they check out.)
- What helped: prepaid adoption (COD share 88.7% → 77.0%, yet COD success *slipped* 78.6% → 77.7%, so "this lever is spent") · Valmo scale (1.8% → 50%+ of shipments) · TrustMesh pre-dispatch filtering ("signal stops at the hub; the rider never sees it").
- Cause pie (share of all RTOs): **Refused at door 36% · Not home 18% · Unclear address 13% · Phone unreachable 12% · Far/wrong hub 9% · No real attempt 9% · Other.** Labelled as a *blend* of rider + buyer research, industry NDR mix and the data pack.
- COD 22.3% failure vs prepaid 2.7%, so **~8x**. **96%** of failed deliveries are COD despite COD being 77% of shipments. (Re-checked: 0.77×22.3 / (0.77×22.3 + 0.23×2.7) = 96.5%. ✓)
- Why COD fails: **two-sided friction.** Customer side: low commitment, no money paid, price-shopping while the parcel is in transit. Rider side: **rational triage.** Paid on success, so effort goes to orders likely to succeed.
- Quotes: COD buyer ("we keep watching prices on other apps… nothing is paid, so there is no loss"). Rider ("For prepaid we call three or four times and wait. For COD we call once or twice… we do not go back").
- **Evidence base as submitted: 12 rider interviews across Mumbai hubs + COD buyer survey (25+ responses).** (The old handover said n=8. The deck says 12, so use 12.)

**Slide B — "Five new levers: where should we act first?"** Impact × Effort, split into Prevent / Rescue / Recover
| Code | Lever | Problem solved | Quadrant |
|---|---|---|---|
| P1 | Preferred delivery slot | Not home (18%) | Assess (high impact, high effort) |
| P2 | Location geotagging (doorstep pin, correct hub) | Unclear address 13%, wrong hub 9% | Pursue-ish (high impact, lowish effort) |
| **R1** | **RTO-score risk-weighted delivery incentive** | Unreachable 12%, no attempt 9% + door refusals | **Pursue: "the one to pilot"** |
| R2 | Proof of attempt (geofence + call log) | Fake "attempted" (~9%, no baseline) | Consider |
| C1 | Local re-home (resell/redeploy to nearby demand) | Refused/undelivered units (36%), must cost < ₹120 | Assess |
- "Already in play" list: prepaid nudges, TrustMesh, predictive routing, reverse-network optimisation, address geocoding, flexible delivery options, better customer comms.
- Assumptions: only new levers are plotted, recover levers must cost < ₹120, and no lever may add customer friction.

**Slide C — "Make the hard stop worth the same effort"** (the R1 pilot)
- **Signal:** existing RTO-risk score flags the **riskiest 20%** of orders. The rider sees only "Bonus Eligible + ₹15 on delivery", never the score. Nothing changes for the customer.
- **Incentive:** ₹18 base (reportedly) + **₹15 only on customer-confirmed delivery** of a flagged order. Nothing is paid for attempts or volume. Paid via **Valmo's existing rider bonus rail**, **directly to the rider**. (The old handover's "pay the hub, hub splits 60/40" was *not* used in the deck.)
- **Economics:** ₹120 return ÷ ₹15 bonus = **1 avoided RTO covers 8 bonuses** ("1 in 8 breaks even").
- **Test:** 30 days, 4 hubs (2 metro + 2 small-town), baselined on the prior 8 weeks, riders randomised Bonus vs Control within hub. A/B the bonus level and a fixed amount vs a percentage. Watch for non-bonus orders being deprioritised. Also grade the risk score itself.
- **Decision rule:** GO / RE-PRICE / KILL.

---

## 2. WHAT ROUND 2 MUST ADD ON TOP OF ROUND 1

✅ **All R1 facts were checked by the team before they went on the slides (confirmed by Gaurav, 2026-09-25).** Treat every R1 number as verified. Our local notes just don't record the sources for a few of them (e.g. "166M listings screened", "flexible delivery already on Valmo", "3/4 of the RTO drop from prepaid", how the cause pie was built). So the job is to **write those sources down** for the R2 footer and for judge Q&A, not to re-check them.

1. **Show the working behind the cause pie.** The case explicitly asks teams to "show sizing working", so give the build-up (which input fed each slice, and its n).
2. **Show the maths for "~3/4 of the RTO drop came from prepaid"** (mix-shift decomposition), either in the appendix or the speaker notes.
3. **Payment route changed:** the deck pays the rider directly via Valmo's rail, but the field note says **the hub pays the rider** (unconfirmed). R2 must answer "who pays the rider?" explicitly. It's the obvious feasibility question at the Finale. Option: show both routes, with direct-to-rider as default and hub pass-through as a fallback.
4. **Economics are one-line.** R2 needs full unit economics (§4 below) and **sensitivity**: flag %, baseline success of the flagged pool, bonus size, uplift.
5. **Gaming / second-order effects** are only a bullet in R1. R2 needs a proper table (§5).
6. **The 10x story is missing** in R1. R2 needs it (§6).
7. **C1 (refused orders)** is only a dot on the matrix, but R2 **mandates** a full proposal. The material already exists in `06-solution-inventory-recovery.md`.

---

## 3. PROPOSED R2 STORYBOARD (10 slides incl. cover; draft, not yet agreed with team)

| # | Slide | Content | Covers ask |
|---|---|---|---|
| 0 | Cover | Same as R1 | — |
| 1 | **Executive summary** | Problem in one number, insight, 3 moves (Rescue now / Recover next / Re-price the network long-term), ₹ impact, what the prototype shows | ① |
| 2 | **Where RTO happens** | RTO trend + COD concentration (R1 Slide A, tightened). Cause tree with sizing **and the working shown** (source per slice). Geography/TAT/AOV cuts from `HANDOVER.md` §4, marked as vendor-reported. | ② |
| 3 | **Why it happens: two-sided friction** | Customer low commitment + rider rational triage loop. Expanded field evidence (12 riders, survey n, any new data). Say plainly what we *don't* know (causation vs riders correctly reading customers). | ② |
| 4 | **Prioritised solutions** | The same 5 levers, now **RICE-scored with the numbers shown** + an expected-impact column (₹ cr/yr, RTO pp). Sequencing: R1 → P2 → C1 → P1. R2 folded in as R1's anti-gaming control. | ③ |
| 5 | **Hero: Rescue, the risk-weighted delivery incentive** | Mechanism end to end (score → flag → rider app → delivery confirmation → payout). Payment route. Anti-gaming controls. Why not blanket COD bonus (the "without hurting delivery cost" constraint *forces* targeting). | ③ |
| 6 | **Economics + sensitivity** | Unit economics per 100 flagged, break-even ≈ 9 extra deliveries per 100 (i.e. 1 in 8 of bonused deliveries incremental). Scale ≈ ₹80–140 cr/yr + recovered GMV. Tornado or sensitivity table. | ③ |
| 7 | **Refused orders: Hold & Re-home (C1)** | Hold refused parcel at the last-mile DC 48h, redirect to confirmed/forecast nearby demand for the same seller + SKU, intra-state (GST). ₹145 saved per match, **break-even ≈ 5–6% match rate**. Velocity-scored "head not tail" pool. Asset-light framing (existing franchise floor, no warehouses). | ④ |
| 8 | **Working prototype** | Screens + QR/link to live demo (see §7) | prototype |
| 9 | **30-60-90 + success metrics + risks** | 30: R1 pilot in 4 hubs + C1 manual hold-and-match in 1 cluster. 60: re-price, expand to a region, P2 geotag pilot. 90: scale decision, C1 automated matching. Metrics + GO/RE-PRICE/KILL thresholds. Risk table. | ⑤ ⑥ |
| 10 | **10x: difficulty-priced logistics** | Long-horizon vision (§6) | 10x criterion |

If we must cut to 9: merge 9's risks into 5/7 or merge 2+3.

---

## 4. ECONOMICS: WORKING TO SHOW (R1 lever)

Inputs: reverse ₹120 · forward ₹50 · bonus ₹15 · flag the riskiest 20% · assume baseline success of the flagged pool ≈ 60% (**assumption, which the pilot must measure**).

Per 100 flagged orders, with Δ extra deliveries:
- Cost = ₹15 × (60 + Δ) (the bonus is paid on *every* delivered flagged order, including ones that would have been delivered anyway)
- Saving = ₹120 × Δ (reverse avoided; forward is sunk either way) **+ recovered sale margin (upside, not counted)**
- Break-even: 120Δ = 15(60+Δ) → **Δ ≈ 8.6, i.e. ~9 extra deliveries per 100 flagged**. That matches the deck's "1 in 8": Δ/(60+Δ) = 1/8.

| Deliveries of 100 flagged | Reverse saved | Bonus paid | Net |
|---|---|---|---|
| 69 | ₹1,080 | ₹1,035 | ≈ break-even |
| 75 | ₹1,800 | ₹1,125 | +₹675 |
| 80 | ₹2,400 | ₹1,200 | +₹1,200 |

(Old `HANDOVER.md` §5 table used different column definitions but reaches the same nets.)

Scale: ~587mn Valmo-ish COD orders/yr × 20% flagged ≈ 117mn flagged → **≈ ₹80–140 cr/yr net** at +15 to +20 deliveries/100, before recovered GMV.

⚠️ A judge may ask: *does a failed parcel really sink the full ₹50 forward?* If the rider isn't paid on failure, part of the ₹21 LMDC leg isn't spent on a failed order. So an extra delivery also costs a rider base payment. Be ready with that correction (it slightly raises break-even).

---

## 5. SECOND-ORDER EFFECTS / GAMING: R2 TABLE TO BUILD

| Workaround | By whom | Control |
|---|---|---|
| Rider cherry-picks flagged orders, neglects normal ones | Rider | Measure unflagged success in the same hub vs control; bonus only paid if the rider's unflagged success holds ≥ baseline |
| Collusion: fake "delivered" to earn bonus | Rider + customer | Pay only on customer-confirmed delivery (OTP) and hold the payout through the return window; R2 geofence/call-log proof |
| Pressuring customer into accepting, who then returns | Rider | Track post-delivery returns + complaints on flagged orders (a pilot metric already) |
| Customers learn to refuse to get "special" treatment | Customer | Customer never sees the flag or the bonus; no customer-facing change |
| Hubs keep the bonus, don't pass it on | Hub | Pay through the rider app directly; if routing via hub, show split in-app |
| Riders infer the risk score and stigmatise areas | Rider | Show only "Bonus Eligible", rotate/threshold flags, monitor by pin code |
| Flag inflation as the model drifts | System | Fixed 20% budget cap; grade the score each month (bonused vs control at equal score) |
| Rider pulled off route for one hard stop, slowing everyone | Rider | Bonus buys *cheap* effort (calls, wait, neighbour), not a second trip; watch on-time % for the whole bag |

---

## 6. THE 10x STORY (candidate, from `HANDOVER.md` §9.5)

**Valmo pays a flat rate per parcel at every node, whatever the difficulty, so the whole asset-light network is coordinated by money that carries no information.** RTO is one symptom.
- **Now (R1 pilot):** price difficulty at the last mile for the riskiest 20% (a single ₹15 bonus).
- **Next:** continuous difficulty-priced payout per parcel (risk × distance × address quality × time-slot), learned from pilot data. The risk score becomes a *price*, not a filter.
- **Long-term:** difficulty pricing across nodes (hubs paid per *successful* outcome, not per parcel handled). Plus Hold & Re-home turns the reverse leg into a local inventory network, which pairs with the Tier 2 GST agency model (`06-…md` §1) as the 10x unlock (~₹200–590 cr/yr range).
- Keep it asset-light: software + incentives on existing franchise floor space. Vidit Aatrey on record: warehousing = low ROI.

---

## 7. PROTOTYPE PLAN (not built yet; decide in the next session)

**Principle:** don't build an RTO predictor (commodity; Meesho has TrustMesh). Build the **layer that doesn't exist**: turning the risk score into rider pay and parcel decisions.

Candidate: **"Valmo Rescue Console"**, a single web app with synthetic data generated from data-pack distributions:
1. **Hub view:** today's orders with a mock risk score → top 20% flagged "Bonus Eligible" → bonus budget.
2. **Rider app mock (phone frame):** the bag of stops, the flag badge, earnings today vs pilot, OTP delivery confirmation → bonus credited.
3. **Pilot simulator / P&L:** sliders for flag %, bonus ₹, baseline success, uplift → net ₹, break-even line, scaled ₹ cr/yr. Treatment vs control readout with GO/RE-PRICE/KILL.
4. **Refused-parcel decision (C1):** a parcel is refused → the engine scores hold-vs-return (SKU velocity × catchment demand × intra-state check × dwell cost) → shows the redirect match or sends it back, with ₹ saved.

Stack suggestion: Vite/React or Next.js on Vercel (account `gaurav-uwu`). The Vercel MCP connector currently needs re-auth (run `/mcp` in an interactive `claude` terminal), or use the Vercel CLI. It has to be a **working**, clickable demo with a public URL + a 60–90s screen recording as backup.

Time budget: see the day-by-day plan (to be set in the grilling session).

---

## 8. OPEN QUESTIONS / TO-DO

- [x] Deadline confirmed: Oct 4. [ ] Still check the submission format on the DICE portal (deck file type, prototype link field, slide cap incl./excl. cover)
- [ ] Decide the storyboard (§3) with the team; assign the deck to the design teammate early
- [ ] Decide the prototype scope (§7) and start building
- [ ] Write down the sources the team used for "166M listings screened", "flexible delivery already on Valmo", "3/4 of the RTO drop from prepaid" (all verified in R1; they just aren't recorded in our notes)
- [ ] Show the cause-pie build-up (source per slice)
- [ ] "Who pays the rider: Meesho/Valmo or the hub?" Get one more rider/hub answer if possible
- [ ] Survey: current response count? Any cut by metro vs T2/T3?
- [ ] Any Round 1 judge feedback? Record it here if received

---

## 9. FILES

| File | What |
|---|---|
| `C:\Users\gaura\Downloads\GPS_IIT Bombay.pptx` / `.pdf` | **Final R1 submission (source of truth)** |
| `Meesho DICE/Meesho DICE 3.0 - Valmo RTO - Round 1.pptx` | Earlier R1 version (Sep 11 04:59) |
| `Meesho DICE/Meesho DICE R1 - ValMo RTO.pptx`, `round1-deck.html` | Earlier draft built from the old handover plan (superseded) |
| `Meesho DICE/Meesho/` | Case PDFs + blank Meesho template |
| `work/HANDOVER.md` | R1 research handover: all verified numbers, traps, killed ideas |
| `work/06-solution-inventory-recovery.md` | **C1 / refused-orders material for slide 7** (GST architecture, economics, prior art, risks) |
| `work/00-case-digest.md` | Case briefs incl. R2 asks |
| `work/R2-HANDOVER.md` | This file |

---

## SESSION LOG

### Session 1: 2026-09-25
- Read the final R1 deck (GPS_IIT Bombay pdf/pptx) and recorded exactly what was submitted (§1).
- Reconciled with the old `HANDOVER.md` and found the deltas (n=12 not 8, direct-to-rider not hub-split, 5 coded levers, cause pie values) plus weak spots to fix (§2).
- Re-verified deck maths: RTO 21.2/18.6/17.8%, 96% COD share of failures, 1-in-8 break-even.
- Pulled the R2 asks from the case digest, drafted a 10-slide storyboard (§3), economics working (§4), gaming table (§5), 10x story (§6) and prototype plan (§7).
- Grilling session: 18 decisions settled (D1–D18 below), glossary started in `../CONTEXT.md`.
- **Next session starts at:** Sep 25–26 row of the day-by-day plan: write the prototype spec → Vite set-up → fake-data generator. Then the slide content spec (due Sep 28).

### Grilling session, 2026-09-25: decisions settled
| # | Decision |
|---|---|
| D1 | Deadline is **Oct 4**. Time is not the constraint ("we have enough time"). |
| D2 | Roles: **Gaurav + Claude build the prototype** · the deck teammate owns the slides · the third teammate collects sources, writes the cause-pie build-up, and runs the research top-up |
| D3 | Prototype = **4-screen console on fake data**: hub view (flags top 20%), rider app mock, pilot profit-and-loss simulator, Hold & Re-home screen. Risk score is a labelled TrustMesh stand-in. No real ML model. |
| D4 | Research: **targeted top-up**, 5–8 rider/hub calls on (a) who pays the rider, (b) today's delivery rate on high-risk/COD orders, plus a push for more survey responses |
| D5 | **Rescue Bonus is the main idea.** Hold & Re-home gets one slide + one prototype screen (answers the mandatory refused-orders ask) |
| D6 | Names: **Rescue Bonus · Bonus-Eligible Order · Hold & Re-home · RTO = never delivered**. Glossary in `../CONTEXT.md` |
| D7 | 10x = **pay by difficulty across both legs**: forward (Rescue Bonus → difficulty-priced payouts) + reverse (Hold & Re-home → local inventory network). One closing slide. |
| D8 | **Storyboard locked:** 0 Cover · 1 Exec summary · 2 Where RTO happens (sizing with working shown) · 3 Why: two-sided friction · 4 Five levers, scored with numbers · 5 Rescue Bonus mechanism + anti-gaming · 6 Economics + sensitivity · 7 Hold & Re-home · 8 Prototype · 9 30-60-90 + metrics + risks · 10 10x: pay by difficulty. If the portal caps at 10 including the cover, merge 2+3. |
| D9 | Bonus payment: **direct to the rider in-app (R1 default)**, with **hub pass-through as the fallback** (Valmo → hub → full amount to the rider, and the credit visible in the rider app). Revisit after the research calls. |
| D10 | Stack: **React + Vite, static, on Vercel** (account `gaurav-uwu`). The Vercel MCP needs re-auth, otherwise use the Vercel CLI. |
| D11 | Fake data: **realistic to the data pack** (80% COD, 20%/5% RTO, ₹50/₹120, plus the vendor-reported city/order-value/delivery-time patterns). **2 metro + 2 small-town hubs.** Rider app in **English + a Hindi toggle**. |
| D12 | Simulator: a **full A/B pilot sim** (Bonus vs Control riders within each hub, uplift with a confidence range, a check on normal orders' delivery rate) ending in a GO / RE-PRICE / KILL verdict |
| D13 | Hold & Re-home rule: **demand forecast + GST check**. Hold if expected 48h nearby demand for the same seller + SKU, same state, parcel unopened, and expected saving > ₹8 holding cost (break-even ≈ 5–6% match rate). Otherwise send it back. |
| D14 | Deck: **Claude drafts the full slide-by-slide content spec** (+ chart images + screenshots). The **deck teammate lays it out in the Meesho template PPTX.** |
| D15 | Demo: **public live link + QR code on slide 8 + a 60–90s screen recording as backup** |
| D16 | Pilot verdict cut-offs: **GO** = +9 or more extra deliveries per 100 Bonus-Eligible orders vs control, normal orders' delivery rate down ≤1 point, returns/complaints flat. **RE-PRICE** = +3 to +9. **KILL** = under +3, or normal orders suffer. |
| D17 | Timeline below. **Submit Oct 3**, with Oct 4 as a buffer day only. |
| D18 | Rescue Bonus is **a flat ₹15 in the pilot**. The simulator lets you vary it by hub type (metro vs small-town). Pricing by region goes in the 60/90-day plan and the 10x story. |

### Day-by-day plan (D17)
| Date | Gaurav + Claude (prototype + content) | Deck teammate | Research teammate |
|---|---|---|---|
| **Sep 25–26** | Write the prototype spec, set up Vite, build the fake-data generator | Slide skeleton in the Meesho template; carry over slides 2–4 from R1 | Write the 2-question call script; start the calls; push the survey; collect sources |
| **Sep 27–29** | Build the 4 screens (hub view, rider app, A/B pilot sim, Hold & Re-home). **Claude writes the full slide content spec by Sep 28.** | Lay out slides from the spec as it lands | Calls done by **Sep 29**; cause-pie build-up + the "3/4 from prepaid" maths written up |
| **Sep 30** | Deploy to Vercel; team reviews the whole thing | Fold the research into slides 2–3, 5 | Hand over findings; update D9 if the pay route changes |
| **Oct 1–2** | Polish; record the 60–90s video; take screenshots; make the QR code | Final layout, slide 8 with screenshots + QR | Fact-check the final deck against the sources list |
| **Oct 3** | **Freeze → full dry run → SUBMIT** | ← | ← |
| Oct 4 | Buffer only | | |

### Session 2: 2026-09-27 (strategy only, plan mode)
The user stopped the prototype scaffold. **This session was deck strategy only; no code.** Approved plan: `C:\Users\gaura\.claude\plans\synthetic-whistling-hennessy.md`.
- **Structure re-opened and approved (replaces D8):** 0 Cover · 1 Exec summary · 2 Where & why (merged) · 3 Prioritised solutions with impact · 4 Rescue Bonus mechanism + workarounds · 5 Economics, sensitivity & pilot · 6 Refused parcels (Router) · 7 Prototype · 8 30-60-90 · 9 Risks & second-order effects · 10 10x: pay by difficulty · Appendix A1–A8. If the portal caps at 10 including the cover, merge 8+9.
- **Web research filled the gaps.** Everything is in `work/10-sources.md`. Key finds:
  - **Valmo's published Delivery Services Agreement:** Valmo contracts with and pays each rider directly, only on successful delivery. There is an existing **"Additional Incentive"** line. The only performance incentive is on the **first-attempt delivery rate**. Refusals need a customer OTP. Valmo calls the customer to verify failed attempts.
  - So **D9 is settled: pay direct via the Additional Incentive rail**, and the hub pass-through fallback is dropped. **R2 (proof of attempt) is mostly in play**, so it folds into the Rescue Bonus controls.
- **R1 errors to fix in R2:**
  - "166M listings screened" → "monitors 166M active listings; RTO down >10%" (Q4 FY26 letter).
  - Valmo share was 48% in FY25 and 64.5% in H1 FY26.
  - "incentives reward volume/speed" → "incentive tracks overall first-attempt rate, not per-order difficulty".
  - "Flexible delivery options" has no source: get one or drop it.
  - The RTO trend is *derived*.
  - **"3/4 of the drop from prepaid" is really ~70%** (mix-shift maths, 69–71%).
- **Economics re-checked.** Break-even is Δ≈8.6 per 100 (data-pack basis) or ≈10.3 if the rider's ~₹18 fee on rescued orders is counted. Net at Δ=15–20 is ₹62–184 cr/yr on 153mn flagged orders. Valmo RTO ~17%→~14%. 1 RTO point ≈ ₹92 cr/yr of reverse cost.
- **Refused orders:** weighed 4 options with pros and cons. **Recommended: the Refused-Parcel Router** (second chance → Hold & Re-home → local disposal → consolidated return), with Hold & Re-home as the flagship lane (break-even 5.5% match rate). ⚠️ **The team still has to confirm Router vs pure Hold & Re-home.** Added to CONTEXT.md.
- **Deliverables written:** `work/09-r2-slide-spec.md` (full slide-by-slide content spec v1, for the deck teammate) and `work/10-sources.md`.
- **Research teammate asks (by Sep 29):**
  - FAD incentive amount and the per-delivery rate
  - **How long refused parcels sit at the hub** (the gate for Hold & Re-home)
  - Share of "soft" refusals
  - Whether the refusal OTP is skipped in practice
  - The cause-pie build-up (A1)
  - Whether the whalesbook claim of a Valmo share cut to ~50% holds
  - Whether the portal slide cap includes the cover and appendix
  - Confirm "no RTO fee to sellers" on the supplier panel
- **Next session:** the team reviews the spec. Then the prototype build plan in plan mode first (screen 4 = Router). We're about 1.5 days behind the D17 timeline on the prototype.

### Session 2b: 2026-09-27 (official guidelines + fact-check of the AI trend summary)
- **Official R2 guidelines (from the case PDF):** **6–10 slides**; asks ①–⑥ as before; criteria = **Quality of Research (methods, sources, coverage)** · Depth · Innovativeness · 10x · Feasibility · Presentation. The case PDF itself doesn't mention a prototype. The prototype requirement came from the competition brief, so **confirm it's still required**.
- **Fact-check of the pasted AI summary:**
  - **Confirmed:** Tata Comms × Shiprocket WhatsApp (−45% RTO losses, undated) · Delhivery GenAI geocoding (8k req/min) · Meesho allocates lanes by lowest cost, **Valmo ≈50% in Q1 FY27** · cost-per-success maths · distance effect.
  - **Not found, don't use:** the "28.62%→5.47%" beauty case · Shiprocket 2026 AI address alerts · the "Sep 2026 intelligence layer" claim.
  - **Rejected as direction:** risk-based/partial COD. It's already in play via TrustMesh (2M consumers restricted) and the prepaid push (37%, Pay Before Delivery), and it adds checkout friction the brief rules out.
  - Full log in `10-sources.md`.
- **🔥 Missed data found in the case PDF:** RTO by distance from hub **15% (~2 km) / 17% (~5 km) / 22% (10 km+)**; new/unclear addresses fail more. Added to slide 2, the flag inputs and day-60 re-pricing.
- **Decision (no pivot): "absorb, don't pivot."** New spine: *carry TrustMesh's risk signal to the door and beyond* (it bridges from R1's "signal stops at the hub"). The Rescue Bonus stays the hero and the first pilot. The valid upstream ideas deepen R1's own levers:
  - P2 → address confidence + fix before dispatch.
  - P1 → optional two-way WhatsApp confirm/reschedule. The same build is the Router's second-chance lane.
  - 10x adds **cost per successful delivery** as the lane-allocation metric (Valmo ₹84.8 today → ₹77.7 at 14% RTO).
- **Structure v2 = cover + 9 = 10 slides:**
  1. Exec
  2. Where/why (+ research-methods strip)
  3. Prioritised solutions
  4. Rescue Bonus (+ rider-app screenshot)
  5. Economics & pilot
  6. Refused-Parcel Router (+ screenshot)
  7. 30-60-90
  8. Risks
  9. 10x

  There's no standalone prototype slide; the QR code sits on slide 1. The spec `09-r2-slide-spec.md` is updated to v2.
- **New research task (Research is criterion #1):** **order-and-observe**. Place 3–5 real COD orders on Meesho and log every notification (WhatsApp? a confirm/reschedule option?), timing and rider behaviour. This settles whether two-way WhatsApp is new.

### Session 2c: 2026-09-27 (prototype plan approved)
- Prototype confirmed as required. The user wants **everything real**: every button works, real geography and data, real WhatsApp/OTP, real multi-device. The code goes **inside `Meesho DICE/prototype/`**.
- The approved spec is now `work/08-prototype-spec.md` v2 and **supersedes D3/D10's static-only stack.**
- **Stack:** React + Vite + TS · Vercel functions · Supabase Realtime · Twilio WhatsApp Sandbox (SMS skipped because of DLT) · Leaflet/OSM · data.gov.in pincodes · OSRM distances, cached.
- **Routes:** `/`, `/hub`, `/rider`, `/pilot`, `/router`, `/customer` (the Demo-mode WhatsApp emulator).
- **Hubs:** Powai (MH), Whitefield (KA), Nashik (MH), Gaya (BR).
- **User actions needed (Claude can't create accounts or enter keys):**
  1. Create a Supabase project and a Twilio account.
  2. Join the WhatsApp sandbox on 2–3 team phones.
  3. Put the keys in `prototype/.env.local` and the Vercel env.
  4. Run `vercel login` once.
- **Twilio trial ≈ 100 free WhatsApp messages**, so budget them. Sandbox sessions expire after 3 days; re-join before recording.
- **Next:** Sep 28, day 1 of the build (scaffold + TDD engine + geo script).

### Session 3: 2026-09-28 (plan v3 approved, nothing built yet)
- **The user stopped `npm install`.** Rule: after a plan is approved, explain it simply and **wait for an explicit "start"**. The only leftover is an empty Vite scaffold at `Meesho DICE/prototype/` (no deps installed).
- **Risk score decision: layer, don't rebuild.** TrustMesh = a checkout/pre-dispatch integrity model (blocks ~9M transactions; scores transactions/consumers/sellers/listings; no public evidence its score reaches Valmo or riders). Our **Rescue Score** = TrustMesh risk + last-mile signals (distance from hub, new/unclear address, phone reachability, past failed attempts, COD).
  - Day 1: transparent rules.
  - After the pilot: an **uplift model** trained on the randomised Bonus vs Control data, targeting *rescuable* orders rather than merely risky ones (precedent: Meituan, arXiv 2202.10695).
  - Not a pivot: R1 slide C already listed these inputs.
- **Novelty check: partially exists; the combination is new.** Closest precedents:
  - Meituan: model-driven rider bonus, but for order acceptance
  - Uber/DoorDash: hidden difficulty pay, for acceptance
  - Ekart: first-attempt incentive on all orders
  - Valmo's own FAD incentive: rider-level
  - Amazon DSP: fleet-level
  - ClickPost/GoKwik: risk scores, but not used for pay
  - Nobody pays per order on the successful delivery of risk-flagged orders. Fix R1's claim "rider app flag exists" (unverified).
- **Deck:** Claude will build the PPTX in R1's exact design. R1 density benchmark = 345–396 words, 66–91 shapes, native charts per slide. Layout per slide is in the plan (`C:\Users\gaura\.claude\plans\synthetic-whistling-hennessy.md` §3). Output: `Meesho DICE/R2/GPS_IIT Bombay_R2.pptx`.
- **Revised timeline:**
  - Sep 28: deck v1
  - Sep 29: review + prototype engine
  - Sep 30: hub/rider screens + WhatsApp
  - Oct 1: simulator/Router + deploy
  - Oct 2: screenshots, video, polish
  - Oct 3: submit

### Order-and-observe #1 (Gaurav, 2026-09-28): primary evidence
Screenshot: `research/order1-valmo-whatsapp.jpg`. **Redact the rider's phone number and the AWB before using it in the deck.**
- The order was COD. The Meesho app showed a **prepaid discount and none for COD**, which is consistent with the prepaid push already in play.
- The app promised **3 Oct** but the parcel **arrived 28 Sep, 5 days early**, with no day-before heads-up.
- Almost all communication happened **in the Meesho app**. Valmo's WhatsApp (a verified business account) sent **one-way** messages only:
  - 12:01 "Arriving Today… Pay via UPI by scanning the QR on the rider app… contact the delivery agent at <number>"
  - 13:30 "Failed Delivery… We will try to deliver again in 24–48 Hrs"
  - Neither message offered reply options (confirm, reschedule, fix address, pickup).
- **Nobody asked about availability**, whereas Flipkart does. We still need a Flipkart screenshot to back that up.
- The team deliberately didn't pick up. **The rider called twice, didn't wait, and the order was rescheduled.** This matches the R1 rider quote about COD ("call once or twice… move on").
- **Still to capture:**
  - The failure reason the app shows
  - Whether Valmo made its verification call (the delivery agreement's SOP says it does)
  - What happens on the re-attempt
  - A Flipkart availability-prompt screenshot
  - 2–4 more orders (COD vs prepaid, answer vs don't answer, different pincodes)
- **No nudge mid-journey to switch COD → prepaid.** Between placing the order and the delivery day, nothing said "pay now for hassle-free delivery". The only payment prompt was "pay via UPI by scanning the QR on the rider app", which is pay *at* the door. The Q1 FY27 letter says "Pay Before Delivery" exists, so check whether the order page offers it. If it does, it exists but isn't pushed.
  - **Idea:** add "Pay now (UPI)" to the same two-way WhatsApp message (P1), for Bonus-Eligible COD orders only. It's post-order and optional, so the brief's checkout constraint isn't broken.
  - **Maths:** prepaid fails 5% vs COD 20% (data pack), so the expected saving is up to ~₹18 per conversion (₹120 × 15 pts). Selection bias means the real effect is smaller, so the pilot has to measure it.
- **R2 buyer survey written:** `work/11-survey-r2.md`. It's Hindi-first and bilingual, takes ~3 minutes, and is built with a Google Apps Script.
  - Neutral design: behaviour questions come before idea questions, and the result that would count against us was decided in advance.
  - It pools with the R1 survey on the refusal questions.
  - Target: 150+ responses by Sep 30, with at least a third from small towns (campus staff filled in person, hometown family groups).
  - New measures: the availability ask by app, early arrival, fake "attempted", rider calls/wait, soft-refusal share, the verification call, and three idea tests (two-way WhatsApp, pay-now UPI, sealed re-homed pack).

### Session 4: 2026-09-29
- **Mentor Connect:** Meesho assigned a mentor and a Slack channel; one mandatory 30-minute call happens between Sep 26 and Oct 1. Intro and progress messages were drafted, with R1's two-sided friction as the hypothesis and the field order as evidence.
- **Prototype screen change (user question "why a hub view?"):**
  - The hub isn't in the bonus flow: the flag is set centrally and Valmo pays the rider directly. So **"Hub view" → "Valmo ops console"** (flag budget, live map, bonus payouts, Bonus vs Control, verdict).
  - **The hub operator appears only in the "Refused-parcel desk"** (hold 48h / re-attempt / send back).
  - Apply this to `08-prototype-spec.md` and the deck.
- The short 1-minute survey (`work/survey-r2-script.gs`) was created by the user.
- **Status:** the deck PPTX isn't started (planned Sep 28) and the prototype isn't started. Both are waiting for the user's "start".
- **Prototype theme researched** (in Chrome): `work/12-prototype-theme.md` + `research/ui-refs/`.
  - Found Valmo's real apps: **Valmo Pilot** (rider, `com.valmo.rider`) and **Valmo Operations** (hub/branch, `com.valmo.ops`).
    - The Ops drawer has RTO Manifest / RVP Inscan / DRS / COD / Audit.
  - Decisions:
    - The rider app clones the Pilot "Today's Tasks" UI and adds a green "₹ +15 Bonus Eligible" chip.
    - The refused-parcel desk is a new Ops drawer item next to RTO Manifest.
    - WhatsApp uses Valmo's real message wording + buttons.
    - The landing page and simulator use the R1 deck palette.
  - Tokens: Valmo navy #092D5E · Meesho magenta #9F2089 · R1 pink #ED0B7D.
  - Fonts: Roboto (app screens) and Figtree (pitch pages).
- **Flipkart WhatsApp evidence** (teammate's real orders): `research/flipkart-whatsapp-messages.md`, redacted.
  - What Flipkart does:
    - asks for availability with a button, and acknowledges the reply
    - sends "Stay available, by 11 PM"
    - **verifies the reschedule with the customer** ("Confirm Delivery Reschedule… if you have requested to change the date")
    - sends a delay notice with the new date
    - uses a **masked number + PIN** to contact the rider, so calls can be logged
    - puts the OTP inside the message
  - Valmo has none of these.
  - Uses:
    - (1) **S3 side-by-side table**. P1 becomes "proven at Flipkart, missing at Valmo, cheap because the channel exists".
    - (2) **S4 anti-gaming controls**: add WhatsApp **attempt/reschedule verification** ("Did you ask to reschedule? Yes/No") and masked-call logs, so a Rescue Bonus can't be claimed on fake attempts, and fake "attempted"/"customer asked to reschedule" marks get caught.
    - (3) The prototype's WhatsApp flow adds a "Did the rider reach you?" verification after a failed attempt.
- **Refused-parcel deep dive:** `work/13-refused-parcels.md`, covering the constraint stack C1–C11 (GST, e-way bill, non-GST sellers, FDI PN2, consumer rules, DPDP, custody, asset-light, patents).
  - **Router v2 lanes:**
    - (1) second chance: clean
    - (2) Hold & Re-home, only when seller state = hub state = buyer state, with seller opt-in per SKU, a seal check, and the invoice in an outside pouch or digital: clean-ish
    - (3) consolidated return: clean
    - (4) donation/destruction: deferred as grey
  - **Key new findings:**
    - Non-GST sellers are same-state by law (Notif. 34/2023). Start with them.
    - UP is the #1 seller state (15.87%), so the pilot cluster is in UP.
    - Pitney Bowes' reroute patent has expired.
    - Merch Factory (India) re-routes RTO stock from its own shelf.
    - Meesho's own policy lets the logistics partner dispose of rejected RTOs.
    - The Meesho invoice travels inside the parcel [verify], which is a DPDP issue.
    - Surat case: 33,035 parcels.
    - Most parcels need no e-way bill (AOV ₹265).
  - **Suggest swapping the prototype hub Nashik → Lucknow (UP)** for the Router demo.
- **Deck handoff for the deck teammate** published as a private artifact: https://claude.ai/artifact/Gxp5kkpej7XvtMfYDUP3dQ (the local copy is `work/14-deck-handoff.html`). It contains:
  - the story and glossary
  - the R1 look rules (20×11.25 in, ~350–400 words, R1 hex colours)
  - wireframes and content for slides 0–9, v3 (adds the real-order strip, the Flipkart vs Valmo table, the Rescue Score + "Is it new?", Router v2 with legal lanes, and UP/non-GST sellers)
  - the numbers cheat sheet, R1 fixes, the do-not-use list, pending items, the timeline and a checklist
  - This supersedes `09-r2-slide-spec.md` where they differ. Main difference: S6 local disposal is deferred and consolidated returns are "up to 20–40%".
  - Plan change: the teammate builds the PPTX (not Claude).

### Session 4 end: 2026-09-29
- Created **`00-MASTER.md`** (the index of every file with current/superseded status + master decisions) and **`work/NEXT-SESSION.md`** (where we left off, next actions, a paste-in prompt). A new session starts from those two. Memory updated to point there.
- Deck handed to the teammate as `work/14-deck-handoff.md` (+ html + artifact).

### Session 5: 2026-09-29 (evening): mentor call fixed, `08` updated to v3
- **Mentor Connect call is fixed: Thu 1 Oct 2026, 3:30–4:00 pm IST** (organiser: Campus Programs, campusprograms@meesho.com). It **can't be rescheduled**; at least one team member must attend; bring a prototype idea, wireframe, demo or WIP. It's the last day of the 26 Sep–1 Oct window.
- **Consequence:** the prototype has to be demoable by 3:30 pm on 1 Oct, so the build order was re-cut: **Demo mode first on a local store (no accounts needed); Live mode (Supabase + Twilio) after the call.** Fallback if not ready: wireframes of the six screens using `research/ui-refs/` + `12` tokens.
- **`work/08-prototype-spec.md` rewritten as v3** with the edits listed in `NEXT-SESSION.md`:
  - "Hub view" → **Valmo ops console** (`/ops`); the hub operator appears only in the **Refused-Parcel Desk** (`/desk`)
  - risk model → **Rescue Score** (TrustMesh stand-in + last-mile signals)
  - hub **Nashik → Lucknow (UP)**
  - **Router v2**: 3 lanes (second chance, Hold & Re-home, consolidated return); local disposal not built
  - customer WhatsApp adds the **"Did the rider reach you? Did you ask to reschedule?"** check (Yes/No; "never came" flags the attempt and blocks the bonus)
  - buttons: I'm home · Change time · Fix address · Pay now (UPI, flagged COD only)
  - two storage adapters (`local` for Demo, `supabase` for Live)
- **Questions to take to the mentor** (in addition to the two in `NEXT-SESSION.md`):
  - Is a look-and-feel clone of Valmo Pilot/Operations OK, or do they prefer a neutral look?
  - Is a labelled synthetic-data prototype acceptable?
  - Live WhatsApp in the video, or a clean Demo mode?
  - Which of the screens matters most to a Meesho judge?
- **Still nothing built.** Waiting for Gaurav's "start". Open items: scope (full vs lean Live), who attends and demos the call, overnight survey/call findings.
- **Scope decision (Gaurav):** build **everything real**; cut down only if time runs out (cut order in `08` §5).
- **Diagrams made** in `work/diagrams/` (Excalidraw): `1-high-level`, `2-sync-flow`, `3-plan-and-schedule`. No code written yet.
- **Flagged, not edited:** `CONTEXT.md` still lists local disposal in the **Refused-Parcel Router** definition and has no **Rescue Score** entry. Update it when next touched.
- **Flagged:** `prototype/` already has a `node_modules/` folder (older notes said nothing was installed). It's inside OneDrive.

### Session 6: 2026-09-29 (evening): the prototype is built (Demo mode complete, Live mode coded, untested against real services)
- Gaurav said "start", answered **everything real, cut only if time runs out**, and asked for Excalidraw diagrams (`work/diagrams/`). Then the build started.
- **Built in `prototype/` (Vite + React 19 + TS).** 281 tests pass, `tsc -b`, `oxlint`, `vite build` clean.
  - **Engine** (`src/engine/`): Rescue Score (TrustMesh stand-in + last-mile signals, weights visible), economics (break-even 8.6 / 10.3, ₹84.8 → ₹77.7, Router 5.5%), pilot simulator (GO / RE-PRICE / KILL, CIs, borderline flag), Router v2 (3 lanes, gates, ₹ ranges), attempt check, seeded generator calibrated to the data pack (17% RTO overall; top 20% ≈ 40%), route assignment.
  - **Domain** (`src/domain/`): the whole day as a pure reducer (`reduce(state, action)`), autopilot, selectors. OTP: 4 digits, 5 tries, 10-minute expiry. **Demo stops:** the first four refusals of the reserved demo stops always show four Router outcomes (Hold & Re-home, second chance, out-of-state seller, broken seal).
  - **Store** (`src/store/`): one interface, two backends. `local.ts` = Demo mode (localStorage + BroadcastChannel sync across tabs). `live.ts` = Live mode (Supabase Realtime + `/api`).
  - **Screens** (`src/pages/`): `/` Landing, `/ops`, `/rider`, `/customer`, `/desk`, `/pilot`. Built by three parallel workers, then checked in the browser. The hero loop (start day → customer taps → rider Deliver → OTP → ₹15 pending; Bonus rider sees the chip, Control rider never does; failed attempt → "never came" → suspect queue) was walked through in two live tabs.
  - **Live API** (`api/`): `action`, `admin`, `whatsapp` (Twilio webhook with signature check), `day`, `health`. OTPs stored as HMAC(pepper, order:code); public state has OTP messages masked; numbered WhatsApp options (sandbox has no buttons); rate limits; zod validation. Supabase adapter and Twilio are **not yet run against real accounts**.
  - **Geo pipeline** (`scripts/build-geo.ts`): reads a pincode CSV → `data/geo-<hub>.json`, optional OSRM road distances. **Waiting on the pincode CSV** (see "asked of Gaurav" below). Until then a labelled synthetic catchment is used and the Landing page says "0 of 4 hubs loaded".
- **Engine review (independent agent) found no critical issues**; fixed: P&L now uses the observed baseline; a GO that fails the conservative (₹18 fee) basis is flagged in the reason; zero-day/no-hub pilot returns "no data" instead of a fake KILL; seller-state mix now sums to 1; second-chance ₹ range is −₹21 to +₹99 (not always +99); normal-order CI added to `borderline`.
- **Numbers changed/noticed:**
  - Ops "RTO expected → realised": expected = the day's baseline without the bonus, so realised RTO shows the bonus effect.
  - Deck slide 5 table row Δ=9 says conservative "−₹150"; the formula gives −₹117. Rows Δ=15 (+405) and Δ=20 (+840) match. Tell the deck teammate.
  - Annual scaling uses 153 mn flagged orders (rounded) so app and deck agree (₹103 cr / ₹184 cr).
- **Still to do:** independent code + security review results (running), Playwright e2e test, Live mode setup and test (needs Gaurav's accounts), real pincode data, Vercel deploy, 90 s video, screenshots for the deck, Hindi coverage on sheets (cut-list item).
- **Asked of Gaurav:** (1) permission/decision to download a pincode file (recommended: he downloads data.gov.in "All India Pincode Directory" himself into `prototype/data/raw/`); (2) Supabase + Twilio accounts, sandbox joined on 2–3 phones; (3) `vercel login`; (4) who demos the 1 Oct call.

### Session 6 (cont.): independent reviews and fixes (29 Sep, night)
- Two independent reviews (security of the Live API; code + product rules of the UI/state). **No critical findings.** Fixed:
  - **OTP:** wrong-guess counter now carries over when a fresh OTP is requested (no brute force by re-requesting); an OTP no longer works once the stop moved on; 10-minute expiry enforced; pay-now is idempotent.
  - **Live API:** a browser can no longer answer as the customer for an order tied to a real WhatsApp number (a rider could have confirmed their own fake attempt); `LIVE_KEY` is now required and `OTP_PEPPER` must be 32+ chars; JSON content-type required; webhook replays/retries applied once (`wa_seen` table, keyed by MessageSid); shared locations from real phones rounded to ~100 m and range-checked; autopilot skips real-phone orders; rate limits on admin and webhook; security headers; send-failure details no longer returned to the browser.
  - **Robustness:** saved demo state is versioned and fully validated (old or corrupt data is ignored, not a white screen); a top-level "Reset demo data" screen; failed hub-file load falls back to the labelled stand-in; hostile realtime payloads are ignored; tabs persist state they receive.
  - **Product rules on screen:** the rider picker no longer says "Bonus/Control" (Demo rider A = Bonus, B = Control); Control riders no longer see a "Priority" chip; customer panel says Rider A/B; the customer location step defaults to a demo spot and uses real GPS only on an explicit tap; sheets close on Escape; the bonus toast timer no longer sticks.
- **Deliberately not changed:** the Landing page still says "Rescue Score / risk signal" (it is the pitch page for judges, not a rider or customer screen). Two tabs acting within milliseconds of each other can still lose one action (rare; use one tab to act at a time during the recording). OTP hashes still sit in the public state (mitigated by the 32+ char pepper).
- **State now:** 307 tests, ~99% coverage on engine/domain/api/scripts, `tsc -b`, `oxlint` (4 harmless warnings) and `vite build` clean. Includes an automated end-to-end test of the hero loop through the real Rider and Customer screens.

### Session 6 (cont.): pincode data + Live storage verified (29 Sep, late)
- **Pincode data:** downloaded the GeoNames-derived CSV (`prototype/data/raw/pincodes.csv`, 11 MB, github.com/egovspace/India-PIN-Code). **Its coordinates are unreliable** (Lucknow-district rows median 211 km from Lucknow), so it is used only for per-hub pincode *lists*; each pincode's centre comes from OpenStreetMap Nominatim (`scripts/geocode-pins.ts`, 1 request/s, cached in `data/cache/`), then `scripts/build-geo.ts` keeps pincodes within 15 km and adds OSRM road distances. Credits: GeoNames CC BY 4.0, OpenStreetMap ODbL.
- **Supabase:** Gaurav created the project and ran `schema.sql`; the service key is in `prototype/.env.local` (git-ignored; also `OTP_PEPPER`, `ADMIN_TOKEN`, `LIVE_KEY` generated locally, not printed). `node --env-file=.env.local scripts/live-smoke.ts` passes all 10 checks against the real project (day stored, OTP round trip, no plain OTP in the stored row, stale writes refused). A fresh day row is ~180 KB.
- **Still missing for Live:** the Supabase public (anon/publishable) key → `VITE_SUPABASE_ANON_KEY`; Twilio SID/token + sandbox joined; `vercel login`. Guide: `prototype/LIVE-SETUP.md`.
- **Real geography built (29 Sep, late):** `prototype/data/geo-<hub>.json` for all four hubs: Powai 82 pincodes (radius 15 km), Whitefield 29 (15 km), Lucknow 26 (15 km), Gaya 15 (25 km, small town so a wider radius). Pincode centres from OpenStreetMap Nominatim (369 of 378 located), road distances from OSRM. Screens now show real pincodes (e.g. "PIN 400063, Powai"). Caveat: a 15 km radius is wider than a real delivery hub's catchment, and pincode centres are one point per pincode; the demo weights orders toward the hub.
- **Supabase fully wired for Live:** service key + public key are in `prototype/.env.local`; the public key can read `day_state` but writes are refused (401) and `wa_binding` / `wa_seen` return nothing. Remaining for Live: Twilio SID/token + sandbox joined on 2–3 phones, `npx vercel login`, then deploy.

### Session 6 (cont.): DEPLOYED (29 Sep, night)
- **Live at https://valmo-rescue-console.vercel.app** (Vercel account `gaurav-uwu`, project `valmo-rescue-console`; public, Demo mode by default). All env vars set in Vercel (secrets marked sensitive), `TWILIO_WEBHOOK_URL=https://valmo-rescue-console.vercel.app/api/whatsapp`.
- Vercel could not run the TypeScript functions (`.ts` import paths), so server routes were moved to `api-src/` and are **bundled to `api/*.js` with esbuild before each deploy** (`node scripts/build-api.mjs`). `.vercelignore` added.
- **Verified on the deployed site:** home + all routes 200; `/api/health` ok; action without key 401; admin wrong token 401; unsigned Twilio webhook 403; start day and autopilot through the API; the deployed ops console in Live mode shows the shared Supabase day and updates when Step +50 is clicked. One transient Supabase 500/timeout happened on the first try (a slow moment on the new project): added 8 s timeouts and one retry on database reads.
- **New:** `/live` admin page (Live mode): send a test WhatsApp to a phone, and link a phone to a demo order (no curl). New admin op `ping`.
- **Still needed from Gaurav:** (1) Twilio sandbox: set "When a message comes in" to the webhook URL above (POST) and Save; (2) sandbox joined on 2–3 phones; (3) then a real WhatsApp round trip test together.

### Session 6 (cont.): Twilio trial limitation found (30 Sep, early hours)
- The Twilio **trial** WhatsApp number (+1 737 250 8034, join phrase `join twilio-trial`) rejects free-text sends with error **21654 "ContentSid Required"**: it only sends pre-made templates. The Content API (custom templates) is **locked on trial accounts** (error 20003 "upgrade your account"). Inbound replies still work: the webhook is set (`https://valmo-rescue-console.vercel.app/api/whatsapp`, POST, saved via the Tryout UI → Inbound → Custom).
- **Consequence:** in Live mode our server can receive customer replies but cannot send our own OTP / order-day / check messages from this trial number. Everything else in Live mode (shared Supabase state, deployed API) works.
- **Options for Gaurav:** (a) upgrade the Twilio account (adds prepaid balance; then create a generic `twilio/text` template `{{1}}` and send with ContentSid, a small code change), (b) Meta WhatsApp Cloud API test number (free, free-form within 24 h, needs a Meta developer app), (c) skip real WhatsApp: Demo mode (on-screen phone) carries the story; the video can say Live mode is built and deployed but WhatsApp sending needs a paid sender. Recommendation: (c) for the 1 Oct call and the submission unless Gaurav wants to pay for (a).
- Test order prepared for the eventual test: `lucknow-0053` (flagged COD, Rider 06 = Demo rider A's first demo stop).

### Session 6 (cont.): Re-home matching engine, designed, BUILD AFTER THE 1 OCT MENTOR CALL (agreed with Gaurav)
- **Purpose:** replace the Router's boolean "nearby demand" gate with a forecast of whether a buyer for the *same listing* appears in the hub catchment within 48 h, with a confidence range.
- **Key correction:** similarity cannot substitute a different product. Re-home needs the same seller and the same listing (seller issues the new invoice). Similar SKUs are used only to *estimate demand* when the exact SKU has thin history (and later to target the "Arrives tomorrow · already near you" badge).
- **Design:**
  1. Order history per pincode, keyed by exact SKU (primary).
  2. Similar SKUs (same category, price band, title words; TF-IDF cosine, explainable, runs in the browser, no API) lend demand via a Gamma-Poisson prior (empirical Bayes) when the exact SKU has few orders.
  3. P(match in 48 h) = 1 − exp(−λ × conversion); expected value = P × ₹145 − ₹8; break-even 5.5%.
  4. Confidence layer: credible interval on P; **hold only if the lower bound clears 5.5%**; High/Medium/Low label with a one-line reason (e.g. "3 exact-SKU orders and 41 similar in 14 days"); backtest chart (predicted vs actual, Brier score) on the Desk.
  5. Wire into `router.ts` lane 2 (replace `demandNearby`), show forecast + confidence + expected ₹ on each Desk card; deck slide 6: "hold only where the low end clears break-even".
- **Honest limits to keep on screen and in the deck:** history is synthetic (labelled); the model shows the mechanism, real calibration comes from pilot data (30 days, measured against the 5.5% break-even); it needs SKU-level order history by pincode from Meesho.
- **Decisions still open (Gaurav to confirm when we start):** text/attribute similarity (recommended) vs AI embeddings via an API; use the confidence lower bound as the hold rule (recommended).
- **Ask the mentor on 1 Oct (added to the list):** "Can hubs get SKU-level demand by pincode from Meesho, near real time?"

### Session 6 (cont.): "How the maths works" button + prototype audit
- **Built:** a **"How the maths works"** button on `/pilot` (`prototype/src/pages/pilot/MathExplainer.tsx`, steps in `mathSteps.ts`). It opens an accessible dialog with 8 sections / 26 steps: who gets the bonus, how the pilot is simulated, reading the result (uplift, 95% CI), the verdict rule, net ₹ per 100 and break-even, scaling to Valmo, cost per successful delivery, the Hold & Re-home break-even, and a fact-vs-assumption list. Every step shows plain sentence, formula, **the same formula with the numbers currently on screen**, and result, tagged Data pack / Our model / Assumption / Simulated. "Copy as text" copies it all. 24 tests check the numbers against the engine (8.6 / 10.3, ₹84.8, 5.5%, sample size, verdict branches). Deployed to https://valmo-rescue-console.vercel.app/pilot. `pilot.ts` now exports `hubBaseline` / `HUB_BASELINE_SLOPE` so the explainer and simulator share one formula.
- **Audit (two independent read-only reviews, a11y/responsive + judge's-eye).** Full findings summarised in the chat; main themes:
  1. **Honesty fixes (1 h):** Landing "Real vs simulated" says Live WhatsApp/OTP is real (Twilio trial cannot send); "Numbers: nothing simulated" is untrue (many assumptions); "our legal review" overstates (desk research); Pilot intro says "riders split" but the simulator randomises per order; the app's cost per delivery excludes the bonus (~₹2.6).
  2. **Pilot rigour:** GO at +9 has no margin over the 10.3 conservative break-even and tests the point estimate not a lower bound; per-order randomisation overstates power (real unit = rider; MDE nearer 8 than 3); default uplift 12 makes the demo GO by construction; add power/MDE readout, cluster-by-rider toggle, P(GO) curve, sliders for score quality, share flagged, ₹18 fee, return leakage.
  3. **Demo flow:** 3 tabs + reading an OTP is too much for a judge alone; add a single `/demo` page (rider + customer + mini ops side by side, autoplay, ends on a before/after headline).
  4. **Accessibility/mobile:** sheets lack focus trap/restore; contrast fails for several small-text tokens (amber, bonus green, FAB orange, muted grey); no 404 route or error state; chat has no `aria-live`; safe-area insets; 36 px touch targets.
  5. **Missing case asks:** diagnosis panel (RTO by COD/distance/cause), constraint scorecard (cost, rider earnings, speed), cost-per-success carrier comparison, wrong-hub (9%).
  6. **Deck fixes (tell the teammate):** slide 5 Δ=9 conservative row (−₹150 → −₹117, data-pack +₹45 not ≈0); "break-even 1 in 8" is wrong (8.6 per 100 flagged ≈ 1 in 12; "one avoided return pays for eight bonuses" is correct); "₹62–184 cr" mixes two bases (62 = conservative at Δ=15; 184 = data pack at Δ=20).

### Session 7: 2026-09-30 (plan mode; review of the suggested "final prototype plan")
- Gaurav pasted a plan from another session.
  - **Its claim that the source isn't on this machine is wrong:** it's in `prototype/`.
  - Code reading confirmed its two suspected leaks: (1) only one attempt, since an `attempted` stop can't be delivered; (2) rescheduled and second-chance orders drop out of the success denominator, and a second chance erases the refusal.
  - Also confirmed:
    - per-order randomisation + naive CI + GO on the point estimate
    - a ledger with only pending/blocked
    - a Router with no timers, EV or booked savings
    - no event log or clock
    - Audit is a dead menu item
- **Decisions:**
  - Adopt the plan's purpose (risk / intervention / economics separate; the headline is "caused X extra deliveries at ₹Y").
  - Adopt the frozen decisions and specs A–D, with one adaptation: typed events are emitted alongside reducer state rather than a full event-sourcing rewrite.
  - Use a shared `verdict.ts` for both /pilot (a 30-day rider-randomised sim) and the Ops card (usually INCOMPLETE).
  - Customer replies change the outcome probability, never the flag.
  - P(match) uses a lean demand-rate forecast; the full matching engine is cut unless there's time.
- **Defaults chosen:** bonus paid on an attempt-2 delivery unless attempt 1 was faked · 7-day window · contact cap 4 · ₹300/day cap · 2 strikes · normal-order floor −3 pts · GO on the case break-even 8.6 with 10.3 shown.
- **Written:**
  - `work/15-prototype-v2-handoff.md` (specs, tiers, 15 scenario tests, cut list, paste-in prompt)
  - `work/16-deck-changes-prototype-v2.md` for the deck teammate (includes fixing the "1 in 8" wording: 1 extra per ~12 flagged = per ~8 bonuses)
  - `NEXT-SESSION.md` and `00-MASTER.md` updated.

### Session 8: 2026-09-30 (night): Prototype v2, Tier 0 built, tested and DEPLOYED
- Gaurav said "start" after a plan for Tier 0. Only Tier 0 (`15-prototype-v2-handoff.md` §6) was built. Tests first for every engine and reducer change. **Nothing on the never-cut list was cut.**
- **State:** 482 tests pass (was 343), ~99% line coverage on engine / domain / api. `tsc -b` clean, `oxlint` 0 errors (5 old harmless warnings), `vite build` clean. **Deployed to https://valmo-rescue-console.vercel.app** (checked live: `/pilot`, `/ops`, `/api/health`, landing). A backup of `src/` and `api-src/` from before the session is in the Claude scratchpad, not in the project.
- **(a) Lifecycle, attempt 2, arm at dispatch, denominator** (spec A)
  - New `src/domain/lifecycle.ts`: the states and the transition table. `applyTransition` refuses an illegal move, leaves the order alone and records it in `rejectedTransitions` (for the Audit tab in Tier 1). A delivery is only reachable from `otp_sent`, so nothing is delivered without an OTP.
  - `StopStatus` is now the lifecycle status (`scored → out_for_delivery ⇄ otp_sent → ndr / refused / rescheduled → delivered_a1 / delivered_a2 / rehomed / rto / cancelled`). New order fields: `failedAttempts` (the current attempt is this + 1), `arm`, `originalRiderId`. **The arm is stamped once at dispatch** (Start day) and read from the order, never from whoever holds it now.
  - Attempt 2 works: a not-home goes `ndr → out_for_delivery`; a second chance accepted goes `refused → out_for_delivery` (no more erased failure). Retry rule: an attempt must be left (`maxAttempts` 2, in `DayConfig`) **and** `P(success next) × ₹120 − ₹21 > 0`, with P = 1 − the order's own pRto (an assumption). A re-attempt can go to another rider of the **same arm** (a different-arm rider is refused).
  - A delivered re-homed order now closes its original as `rehomed`; a batched return closes it as `rto`.
  - **Denominator:** `ArmRate` = `n` (all flagged orders in the arm, never drops), `terminal`, `open`, `delivered`, `rate` (delivered / terminal, the final basis the verdict uses), plus `settled` / `settledRate` (attempted, "as it stands") for the provisional Ops bars.
  - **Stand-ins until the clock exists (Tier 1):** actions `reattempt`, `dispatchNextDay`, and a bulk `nextDay` (new **Next day** button on Ops). Also `plannedRuleHash` on the day (Tier 1 moves it into the `DAY_PLANNED` event).
  - Saved days are versioned: `DayState.schema = 3`, local storage key `…day-v3:`. An old saved day is ignored, not half-read.
- **(b) `verdict.ts`** (spec D) in `src/engine/verdict.ts`, shared by `/pilot` and the Ops arm card
  - INVALID (rule hash) → INCOMPLETE (< 90% final or < 6 riders per arm) → KILL (guardrail, named, or uplift < 3) → GO (**lower** end of the 95% CI ≥ break-even) → RE-PRICE. Caveat on a GO that fails the ₹18 basis. `alpha` other than 0.05 throws (only 0.05 implemented).
  - Cluster-robust CI on rider (G/(G−1) variance, t quantile), naive CI kept for contrast, ANOVA ICC (fallback 0.05), design effect, MDE, break-even at the control rate seen.
  - `engine/pilot.ts` rewritten: **riders are randomised**, sorted by route difficulty, paired, coin flip per pair; per-rider random effect (logit sd 0.3 flagged, 0.15 normal); guardrail readings simulated from four new sliders; exact binomial for small n, normal approximation above 64. `outcomeOdds()` = "if this pilot were run 300 times". `THRESHOLDS` / `decideVerdict` are gone.
  - `/pilot` page: new verdict banner (five verdicts + locked rule hash), headline card, "How sure can this pilot be?" panel (clustered vs naive CI, break-even, riders per arm, design effect, MDE, P(GO / RE-PRICE / KILL)), riders-per-hub and guardrail sliders, and a checkbox that loosens the kill floor after planning to show INVALID. The maths explainer was rewritten for the new rule (pairing, clustered CI, MDE steps added).
  - Ops arm card: the same `verdict()` on today's orders + provisional bars + headline. It says **INCOMPLETE** for most of a demo day. That is the rule working, not a bug.
- **(c) Headline, disclaimer, honesty text**
  - `engine/headline.ts`: "The bonus caused X extra deliveries at ₹Y, avoiding ₹Z of RTO cost (net ₹N)". X = (Bonus rate − Control rate) × Bonus-arm orders; Y = the whole bonus bill (deliveries that would have happened anyway included); Z = X × ₹120. Never "85% of risky orders delivered". On Ops it is tagged **Provisional** until the verdict is decision-grade.
  - Mediation disclaimer on `/pilot` (assumed, not measured; not evidence that it works) and a line in the Ops footer strip.
  - Landing: WhatsApp = "built; sending blocked by Twilio's trial; Demo mode shows it on screen"; Numbers = "case data pack plus labelled assumptions"; "legal review" → "desk research, not legal advice"; Pilot row describes the real rule and the assumed link; Demo/Live switch says the video uses Demo mode.
- **Things to know before the mentor call and for the deck**
  1. **The default pilot no longer says GO.** At the +12 default (seed 2026) it says **RE-PRICE**: uplift +12.2, clustered 95% CI +7.1 to +17.4, break-even +8.3. P(GO) at +12 is about 27%; at +15 about 67%; at +20 about 98%. **Smallest detectable effect ≈ 7.5 per 100** (24 riders per arm, design effect ≈ 8.8). This matches the "nearer 8 than 3" note. The deck's "GO at +9 or more" (slide 5) is now wrong: GO needs the **low end** of the interval to clear break-even. Tell the deck teammate (add to `16-deck-changes-prototype-v2.md`, not edited here).
  2. Break-even shows as +8.3 in the evidence panel (control rate actually observed, 58%) and 8.6 in the chart and deck (60% baseline). Both are right; the label says so.
  3. The normal-order guardrail uses the point estimate, so about 2% of pilots at any uplift are killed by noise alone.
  4. On Ops, **INCOMPLETE stays on** until refused parcels are closed on the Desk (Tier 1's "Close pilot" and timers finish the day). The bars use the provisional "as it stands" basis and say so.
- **Deviations from the spec (all small, all logged here)**
  - One `failedAttempts` field instead of `attempt`.
  - A suspect attempt 1 still **blocks** the bonus on an attempt-2 delivery (existing behaviour). Spec §8's "the delivering same-arm rider gets it, the first rider gets a strike" needs the exception queue (Tier 1).
  - No `events.ts` yet; the free-text `feed` is still the log (Tier 1).
- **Live mode:** still compiles and its API tests pass. A Live day already saved in Supabase has the old shape and is ignored by the screens: one **Reset** in Live mode writes a fresh one. WhatsApp sending is still blocked by Twilio's trial.
- **Not done / not checked**
  - The independent code-review and security-review agents were **not** run this session (I only spawn agents when asked); a self-review was done through tests. Say if you want them before Friday.
  - No screenshots: the browser pane was hidden, so checks used page text and script-driven clicks on both localhost and the live site.
  - Playwright e2e still not written.
  - Tier 1 (clock + `tick`, events, ledger with clawback, customer replies + pay-now + contact cap, evidence + exception queue, Router EV + timers + booked savings + `rehome` cohort, Audit tab) not started.
- **Deck teammate:** send `16-deck-changes-prototype-v2.md` plus point 1 above (the GO rule and the RE-PRICE default).

### Session 9: 2026-10-01 (small hours): Prototype v2, all of Tier 1 built, tested and DEPLOYED
- Gaurav said "move ahead, do all tier changes also". All of Tier 1 (`15-prototype-v2-handoff.md` §5 and §6) is built. Tests first for every engine and reducer change; existing tests were updated, not deleted. Nothing on the never-cut list was cut, and nothing on the cut list was cut either (the bag-space gate, the fake-rate column and the cost-owner detail are all in).
- **State:** 603 tests pass (was 482), ~98% line coverage on engine / domain / api. `tsc -b` clean, `oxlint` 0 errors (the same 5 old warnings), `vite build` clean. **Deployed to https://valmo-rescue-console.vercel.app.** Checked live: Ops (clock, Close pilot), Audit (all 10 green after Autopilot + Close pilot), all routes 200, `/api/health` ok.
- **All 15 scenarios pass** (`scenarios.test.ts` = 2, 4, 5, 13, 14, 15; `scenarios.tier1.test.ts` = 1, 3, 6–12 and the Audit; verdict/pilot tests cover 13–15 again at the engine level). Plus `mechanics.test.ts` (clock, contact cap, reschedule cap, OTP expiry, costs, guardrail readings, every Audit red case) and `tier1.flow.test.tsx` (screens).
- **Clock and timers** (`domain/clock.ts`, `domain/tick.ts`): `simNow` in the day, day 1 starts at 08:00. Controls on Ops: **+1 h, +1 day, Close pilot, Reconcile cash**, and the sim time on screen. Autopilot moves the clock 2 sim-minutes per stop. `advanceClock` runs `tick`, which fires: OTP expiry (10 min), no-reply nudge (2 h), reschedules coming back (next day 08:00; more than 2 reschedules → RTO), the 24 h exception default, failed attempts decided at day start (retry if an attempt is left and P(success) × ₹120 − ₹21 > 0, else RTO), second chance expiry (24 h), holds matching or expiring (48 h), COD reconciliation (20:00), bonus release (7 days). The old `nextDay` / `dispatchNextDay` / `reattempt` stand-ins still exist as manual overrides; `nextDay` now equals `advanceDay`. `Close pilot` (`domain/close.ts`) works every open order (demo stops too), runs the Desk on the Router's advice with seeded customers, moves a day at a time, then skips 8 days. Deterministic.
- **Events** (`domain/events.ts`): every step is a typed `DomainEvent` in `DayState.events` (uncapped). `emit()` throws on an unknown type or a missing required field. As decided in Session 7, events are written **alongside** the reducer's state (the free-text feed stays as the readable log) rather than as a full event-sourcing rewrite. `plannedRuleHash` stays on the day and is also in `DAY_PLANNED`.
- **Ledger** (`domain/ledger.ts`): accrued → pending → released, or clawed back, or blocked. Prepaid goes straight to pending; COD waits for the rider's cash. Blocks at accrual: the same rider who faked attempt 1, 2 strikes, ₹300/day cap, normal-order floor (−3 pts vs Control with ≥10 normal orders). A return inside the 7-day window claws back (Ops order panel button "Customer returned this order (demo)"); after release it does not. Cost lines (owner and stream, assumption vs case pack) and savings are read from the events.
- **Customer replies**: "I'm home" −0.3 logit once; no reply after 2 sim-hours +0.2 once; **Pay now** needs a payment (a new `pay_prompt` message with "I have paid / Payment failed" demo buttons; a failed payment stays COD); contact cap 4 proactive messages per order (order-day, attempt check, reschedule check, second chance, pay prompt), the 5th is rejected and logged. OTPs and replies to the customer's own tap do not count.
- **Evidence + exceptions**: the rider's "Why could you not deliver?" sheet now has "I'm at the door" (simulated GPS 30–150 m), "Call customer" (count), "Waited 5 more min", and a demo link that logs from far away. Confidence high = GPS ≤ 200 m, ≥ 2 calls, ≥ 5 min; low = GPS > 500 m or the customer says the rider never came; else medium. Low opens an exception; Ops gets **Confirm valid / Free re-attempt / Strike** (free re-attempt goes to another same-arm rider, does not count against the cap, the first rider is not paid; strike adds a strike; 24 h of silence = an automatic free re-attempt). Human decisions book ₹10 review labour. Roster has a fake-attempt-rate column; the verdict's false-attempt and returns guardrails now read real data.
- **Router** (`engine/router.ts`, `domain/routing.ts`): the waterfall is now expected-value based. Refusal reason captured by the rider (a new "Why is the customer refusing?" sheet, 7 reasons). Second chance EV = P(accept | reason) × (120 − 21) − messages; Hold EV = P(match in 48 h) × 145 − 8 with P = 1 − exp(−demand × 48 × conversion); gates now include shelf capacity 30 and rider bag space; the **seller's opt-in can never be overridden** (not even by a crafted action). Timers: 24 h second chance, 48 h hold. **Savings book only on a real outcome**: second chance delivered +₹99, re-home delivered +₹145, batched +₹36 (30% of ₹120). A re-homed parcel is a new order in its own cohort (no arm, not flagged, outside the pilot metrics, manual=false so the bots work it); if it fails or the new buyer refuses, the original goes back in a batched return with no saving. The Desk shows expected values per lane, countdowns, a "Simulate a buyer now (demo)" button, and an editable **assumptions panel**.
- **Audit tab** (`/audit`, linked from Ops and the Desk drawer): the ten checks from the spec, each green or red, reading the events and the lifecycle. Red cases are unit-tested.
- **Other changes to know about**
  - Storage version bumped: `DayState.schema = 4`, local key `…day-v4:`. An older saved day is ignored. **Live mode:** a day already saved in Supabase has the old shape; press Reset once in Live mode. A full closed day is ~800 KB of state (about 3,000 events); local storage is fine, a Supabase row is heavier than before.
  - `deskSetGate` accepts only unopened / seal / invoice; `demandNearby` and `sellerOptedIn` are gone as what-ifs. `RefusedParcel` now has `reason` and `demandRate` instead of `refusal` / `demandNearby`.
  - A reason the rider records beats the showcase parcels' reason (the first four refusals of demo stops keep their gates and demand). Demo tip on the sheet: "Didn't order it" → Hold & Re-home; "Not home" → second chance.
  - The Live API validation (`api/_lib/validate.ts`) and Live inbound parsing know the new actions and the `pay_prompt` reply; Live mode compiles and its tests pass.
- **Read before the mentor call / for the deck**
  1. One demo day is ~30 orders per arm, so its verdict is noise. Across 13 seeds the Bonus-vs-Control gap on a Lucknow demo day ranged from −17 to +26 points around a mean of about +10. The Ops card now says so, and its MDE line (≈ 36 per 100 for one day) shows why. `/pilot` is the decision tool; Ops is the rule working.
  2. Close pilot on the default day usually ends decision-grade (GO/RE-PRICE/KILL) instead of INCOMPLETE, so the "INCOMPLETE" line in Session 8 no longer holds after Close pilot.
  3. Costs booked: the default closed day shows RTO ₹120 (case pack), re-attempt ₹21 (case pack), and the assumption lines (bonus ₹15, review ₹10, message ₹0.50, hold ₹8, re-home delivery ₹21) each tagged.
- **Not done / not checked**
  - The independent code-review and security-review agents were **not** run (I only spawn agents when asked). Worth doing before the Fri 3 pm freeze: the Live API accepts more actions now.
  - No screenshots (the browser pane was hidden); checks were page text and scripted clicks on localhost and the live site.
  - No Playwright e2e. The 90 s video, the QR and the deck screenshots (slides 4 and 6) are still to do on Fri.
  - `15-prototype-v2-handoff.md` and `16-deck-changes-prototype-v2.md` were not edited. The deck teammate still needs: GO on the CI lower bound, default pilot = RE-PRICE, MDE ≈ 7.5, and the headline rule.

### Session 10: 2026-10-01: landing page and pilot page redesign (deployed)
- Gaurav asked for the landing page to be only a demo guide, with better colour gradients, less "AI-looking", more user-friendly; the pilot page too. Front-end only: no engine, reducer, or rule changes.
- **Colour:** the dark navy + glass cards + neon-pink look is gone. A warm, light palette in `ui/tokens.css` (`--pitch-*`, `--grad-*`): cream canvas, a soft peach/rose/mint wash behind the hero, a magenta-to-coral brand gradient on the primary buttons and progress, and verdict banners as soft gradients with dark ink text (GO green, RE-PRICE amber, KILL rose, INCOMPLETE lilac, INVALID plum) so the words stay readable. No gradient text, no blur.
- **Landing (`/`)** now has one job: get someone through the demo. Slim hero ("Try the Rescue Console in about six minutes", the 4-step loop at a glance, the three moves as a quiet strip), then **Setup** (open Ops / Rider / Customer in new tabs, QR codes for a phone, an optional "Start with a fresh day" with a confirmation), then an **8-step walkthrough** (start the day, answer as the customer, deliver and watch ₹15 accrue, catch a fake attempt, refuse a parcel and follow it on the Desk, jump forward in time, check the Audit, ask the decision question). Each step says what to do and what you should see, opens in a new tab, and can be ticked off; progress is a bar, marks the next step "You are here", and is remembered in this browser only. The old "seven screens, six people" grid and the Demo/Live switch are gone; the honest "what is real and what is simulated" table is kept but folded away. Demo-mode note fixed: a phone keeps its own day (only windows of one browser share a day).
- **Pilot (`/pilot`)**: a plain question as the title ("Will paying riders ₹15 be worth it?"), a 3-step "how to read this page" strip, numbered sections (1 set what you believe, 2 the verdict, 3 how sure), **five one-tap scenarios** (deck assumption, it works well, it does nothing, it hurts normal orders, fake attempts rise), the three sliders that matter up front, the "loosen the rule" INVALID demo kept visible, and the other eight assumptions folded under "More assumptions". Nav links to the demo guide, Ops and Audit.
- **Checked:** 615 tests pass (13 new: landing steps, progress persistence, folded table, fresh-day confirmation, pilot presets and folding), `tsc -b`, `oxlint`, `vite build` clean; no horizontal overflow at 375 px on either page; screenshots of the hero, setup, first step and pilot at desktop width.
- **Not done:** dark mode for these two pages; the Ops, Rider, Customer, Desk and Audit screens keep their Valmo-app look on purpose (they copy Valmo's own apps).

### Session 10 (cont.): pilot page: maths button top right + "Who gets the bonus?" (deployed)
- "How the maths works" moved into the page header, top right, next to the nav.
- New card **"Who gets the bonus?"** (the scoring strategy): flag the riskiest **10 / 15 / 20 / 30%**. A tighter cut picks riskier orders, so fewer are delivered without the bonus: the baseline drops and break-even drops with it. Baselines are measured from our order generator (calibrated to the data pack) and checked by a test: top 10% → 51%, 15% → 56%, 20% → 60% (the deck), 30% → 65%. Break-even at ₹15: 7.3 / 7.9 / 8.6 / 9.3 per 100. The price: fewer flagged orders (200 vs 400 a day at 10%), so a wider range, and fewer RTO points per unit of uplift (0.10 vs 0.20) and fewer flagged orders a year (76.5 mn vs 153 mn) for the yearly rupees. Whether riskier orders respond more or less to ₹15 is unknown and stays on the uplift slider.
- At the default +12, the verdict turns from RE-PRICE (top 20%, P(GO) ≈ 26%) to **GO** (top 10%, P(GO) ≈ 39%); top 30% is P(GO) ≈ 17%. Worth telling the deck teammate and the mentor: "tighten the cut" is the first lever if the pilot says RE-PRICE.
- The choice is made before the pilot and fixed while it runs, so the frozen "flag fixed during the pilot" rule still holds. Scenarios keep the chosen cut; "Reset to deck defaults" returns to 20%. The maths explainer follows the cut (flag share, baseline, yearly volume). The Ops demo day still flags the top 20%.
- 625 tests (10 new), `tsc -b`, `oxlint`, `vite build` clean; deployed and checked in the browser.

### Session 10 (cont.): pilot inputs made MECE + a diagram for the range (deployed)
- **Inputs, one place each, no overlap:** up front only the two beliefs (true uplift, bonus ₹). Folded groups: **Pilot size (3)** (riders per hub, days, flagged a day) with a "12 riders · 30 days" summary, and **Side effects (5)** (normal orders, returns, complaints, on-time, fake attempts), each showing "OK" or "Over the limit: KILL" and its limit instead of a paragraph; the group title says "all OK" or "1 over the limit". The **baseline** moved into "Who gets the bonus?" (it is decided by the cut), under "Change the baseline". Help text cut to one short line.
- **"How sure can this pilot be?"** is now a picture: a number line with three zones (KILL below the kill floor, RE-PRICE, GO past break-even), the honest rider-clustered range as a dark bar with the estimate as a dot and both ends labelled, the left end ringed (green when it clears break-even), and the naive "if orders were independent" range as a thin grey bar under it. A three-item key says the rule in words: GO if the left end is in green; KILL if the dot is in red or a side effect breaks; RE-PRICE otherwise. Screen readers get a one-sentence summary. Below it, three numbers (smallest effect it can detect, riders per arm, break-even with the ₹18 fee) and the 300-rerun odds bars. The ICC / design-effect jargon moved out (it stays in "How the maths works").
- 629 tests, `tsc -b`, `vite build` clean; `oxlint` back to the 5 old warnings. Deployed and checked in the browser.
- **Bug fix (same day):** the range diagram reused the class names `pilot-bar` and `pilot-dot`, which the "Cost per successful delivery" bars and the header logo already used; its `position: absolute` + round corners turned the cost bars into giant circles over the page. Diagram classes are now `pilot-rg-*`. Checked in the browser; 629 tests pass; redeployed.

### Session 10 (cont.): "Check today's Ops day" on /pilot (option A, deployed)
- New card on `/pilot` under "How sure": it reads the day played on the Ops console **in the same browser** (the hub in the URL, Lucknow by default) and judges it with the same `verdict()` and the same range diagram, next to the 30-day simulation.
- States: no day yet → how to start one (link to Ops); a day in progress → verdict (usually INCOMPLETE) plus a **progress bar to the 90% "final" line instead of a range** (early in a day only deliveries are final, so a range would look falsely perfect; found while testing); after "Finish the day" (runs Close pilot, with a confirmation) → the verdict, the range diagram, flagged orders per arm (about 30 vs 6,000 in the simulation), smallest detectable effect (about 36 per 100), and the headline. A note says one synthetic day shows the rule working, not evidence.
- Seen while testing: a finished Lucknow day said GO with a range of +29.6 to +61.0: pure luck on 30 orders per arm, which is the point to make in the demo.
- Diagram axis now steps by 10 when the range is wide, and the two line labels sit at the top and bottom so they never overlap.
- Option B (running the whole 30-day pilot on the Ops engine as a cross-check) is not built.
- 633 tests, `tsc -b`, `oxlint` (5 old warnings), `vite build` clean; deployed and checked in the browser.

### Session 10 (cont.): prototype audit (no code changed)
- Full audit written to `work/17-prototype-audit.md`, with measurements. Headlines: (1) **Live "Close pilot" sends a real phone the bots' "OTP 0000" and answers its WhatsApp check** (verified with the API harness; Twilio's trial block is the only thing stopping it); (2) **the fake-attempt guardrail reads 0%** because it counts only manual strikes (verified: 4.4% of attempts flagged, all auto-resolved, 0 strikes); (3) no git and no gated deploy; (4) README says "12 = GO" (now RE-PRICE) and lacks `/audit`. Should-fix: `/pilot` slider recompute 75–95 ms, Hindi missing on the new rider sheets, Ops card mixes bases mid-day, ₹120 defined in 4 places, Ops day fixed at top 20%. Plus dead code, duplicated formatters, 836 KB closed-day state, missing CSP/frame-ancestors, a11y leftovers.

### Session 10 (cont.): /pilot simplified to three steps (deployed)
- Gaurav: "simplify the complete pilot, it is very difficult to understand". Engine and maths unchanged; the page is rebuilt.
- **One column, three numbered steps:**
  1. **Your assumptions**: who gets the bonus (Top 10/15/20/30%, "60% delivered anyway"), how much the bonus helps, the bonus ₹. One row of scenario chips ("Try: …"). Everything else (riders, days, orders a day, the baseline, the five safety rules, "loosen the rule", re-roll, reset) is under one **More settings** fold whose summary says "12 riders · 30 days · safety rules OK / 1 broken".
  2. **What the pilot would say**: the verdict word, a two-word title and one plain sentence (new `plainVerdict.ts`: "probably helps, but the worst case we can't rule out is below what it needs"), a **Next:** line, the diagram ("where the true effect probably is", "pays above", "stop below"), and one stacked bar for "if we ran this 300 times". The rulebook, locked rule hash and smallest detectable effect are under **How we decide**. No "interval", "clustered", "naive" or "MDE" on the page.
  3. **Does it pay?**: the "caused X extra deliveries" headline, three numbers (net per 100, ₹ cr a year, RTO points), one line for the ₹18 rider-fee case.
- **More detail** (folded): today's Ops day, hub by hub, profit chart, yearly-rupees table, cost per delivery.
- **One break-even on the page** (`pilotModel.pay`): all "does it pay" numbers now use the success rate the Control group actually showed, so they match the verdict and the diagram (before, the page showed 8.3 in one place and 8.6 in another).
- Removed: the "how to read this page" strip, the grey naive range bar, the separate targeting card, the old verdict banner, headline card and "how sure" panel. The stale "GO at +9" note in the profit chart is gone. Sliders now stay smooth (`useDeferredValue`; audit item 5). The Ops-day card uses the same plain wording. The landing walkthrough's last step describes the new controls.
- 647 tests (rewritten page tests cover every behaviour the old ones did, plus plain wording and one break-even), `tsc -b`, `oxlint` (5 old warnings), `vite build` clean; checked at desktop and 375 px (no overlap or sideways scroll); deployed.

### Session 10 (cont.): plan to simplify the pilot maths (design interview, no code)
- Gaurav asked to simplify the maths so judges can follow it: pair riders by skill, balance parcel risk across groups, fewer assumptions, and a way to improve the scoring.
- Settled Q1–Q14, written up in **`work/18-simplify-pilot-plan.md`** (build in a new session, starting now):
  - pair riders on past delivery rate (coin flip in each pair); a pair-by-pair range everywhere, including the Ops day
  - a 3-band parcel-risk balance check with a "✔ Fair comparison" line
  - only 2 safety rules; Top 20% / 10% only; no per-city rates in the pilot simulator
  - the ₹18 case moves to the maths panel; 60% kept but labelled as our assumption
  - scoring improvements only as a pre-planned Pilot 2
  - the clustered range kept as a hidden cross-check
- Facts found:
  - the 60% is our calibration assumption, not the data pack
  - in simulation the top 20% by score catch 46% of RTOs (random 20%, perfect 49%), but this is rigged because the generator uses the score's own weights

### Session 10 (cont.): deck plan v4 (markdown only)
- `work/14-deck-handoff.md` updated to v4 with a "what changed" box at the top. It now includes all of `16` (marked as merged) and plan 18:
  - slide 5: paired-rider pilot in 5 steps, the new rule table, the targeting table (top 20% vs 10%), fixed numbers
  - slide 4: score accuracy and how it improves; the new controls table and bonus lifecycle
  - slide 6: Router EV rules
  - slide 7: Rescue Score row and Pilot 2 in 31–60
  - slide 8: three new risks
  - cheat sheet, do-not-use list and pending items updated
- The HTML copy (`14-deck-handoff.html` / artifact) was **not** synced, at Gaurav's request.
- Open: the prototype's "Deck assumption" scenario uses +12 per 100, but the deck's case is +15.

### Session 11: 2026-10-01: plan 18 built, tested and DEPLOYED (the simplified pilot)
- Gaurav: "build plan 18, decisions are settled". Tests first for every engine and reducer change; existing tests were updated, none deleted (the old clustered-range tests stay as the cross-check's tests). Nothing on the never-cut list was cut: the Pilot Verdict was simplified, not removed.
- **State:** 723 tests pass (was 647), `tsc -b` clean, `oxlint` 0 errors (the same 5 old warnings), `vite build` clean, `build-api.mjs` ok. **Deployed to https://valmo-rescue-console.vercel.app** (checked: `/pilot` shows the new page; `/`, `/ops`, `/audit`, `/rider`, `/customer`, `/desk` all 200). I did **not** re-check `/api/health` after this deploy (the browser sandbox refused that call). A backup of `src/` and `api-src/` from before the session is in the Claude scratchpad, not in the project.
- **What was built (plan 18 steps 1 to 9)**
  1. **Paired comparison** (`src/engine/verdict.ts`): `RiderCell` now has `pairId`. New `pairUp`, `comparePairs` (gap per pair, average, spread, 95% range = average ± t(pairs − 1) × spread ÷ √pairs, smallest detectable effect = 2.8 × spread ÷ √pairs, pairs with an empty rider dropped and counted). `verdict()` decides on the paired range; INCOMPLETE is now "fewer than 6 pairs". The old rider-clustered range is `crossCheck` (with its own MDE and a `sameCall` flag), tests kept. The normal-order check uses pairs too.
  2. **Two safety rules only** (`normalOrderDeltaPts`, `falseAttemptRate`): returns, complaints and on-time are gone from the config, the readings, the sliders and the page. The rule hash changed. The fake-attempt reading is now **suspected rate = low-confidence attempts (exceptions opened) ÷ Bonus riders' attempts**, read from events, so it no longer waits for Ops to press Strike (audit item 2). Confirmed strikes are returned as a separate number. **Addition (not in the plan):** the rule stays silent until Bonus riders have logged **30 attempts** (`minFakeAttempts`). Why: a demo day has only ~15 Bonus attempts, and a 5% limit on a dozen attempts tripped by chance on about 3 in 10 closed days (9 of 28 closed days in a 14-seed check on two hubs). The Ops card shows the count and says when it is too early.
  3. **Pilot simulator** (`src/engine/pilot.ts` rewritten): each rider has a hidden skill and an observed past rate (125 past parcels), riders are sorted by past rate, neighbours paired, coin per pair. Route difficulty and the per-city starting rates are gone (every hub starts at the same rate). Each flagged parcel falls in one of three risk bands (a third each) at baseline +10 / 0 / −10 points (70 / 60 / 50 at 60%). `fairness` block (past rate and band mix per group) with `checkFairness` (fair when no gap is over 5 points). `outcomeOdds` (300 reruns) kept.
  4. **Ops day pairs:** `Rider.pairId`; `generateRiders` pairs riders 1+2, 3+4 … with a coin per pair (an odd rider gets a solo id and is left out). `DAY_SCHEMA = 5` and the local storage key `…day-v5:`. **Live mode:** a day already saved in Supabase has the old shape, so press **Reset** once in Live mode. New `scoreAccuracy()` selector and the order-panel line "Score accuracy (simulation): the top 20% by score catch N% of failures; random would catch 20%. To be measured on Valmo's last 90 days."
  5. **Pilot page:** Top 10% / Top 20% only; two safety sliders; the 60% label; the **✔ Fair comparison** line with a folded table (new `Fairness.tsx`; it turns into a warning if a gap is over 5 points); "pairs" wording; the ₹18 sentence moved from the pay card to the maths panel; on RE-PRICE "Next:" says "Run Pilot 2 with one change (Top 10% or a smaller bonus), with its rule fixed before it starts." The maths panel (`mathSteps.ts`) tells the paired story (pairs, fair check, gap per pair, average, spread, range, rule, money) with an "Extra checks" section (smallest effect, stricter cross-check). Hub table and Ops card reworded; the Ops card now shows the pair count and the fake-attempt check.
  6. **Wording:** landing walkthrough and the real-vs-simulated pilot row, README (pilot line, `/audit` row, test count).
  7. **Deck list** appended to `work/16-deck-changes-prototype-v2.md` (the method, the new rule table, the 60% label, score accuracy and the new signals, Pilot 1 → Pilot 2, the new numbers).
- **Numbers to know (simulated, 24 pairs, seed 2026)**
  - **Default (top 20%, +12 true) says GO:** +13.6, range +11.1 to +16.2, break-even 8.7. The old method said RE-PRICE. **P(GO) at +12 is about 58%** (was 27%); at +8 / +10 / +15 it is 3% / 18% / 97%. **Smallest detectable effect is about 4 per 100** (was 7.5). Why: pairing on past rate removes most of the rider-to-rider noise. The simulation has **no month-to-month luck** in riders (past rate predicts skill well), so a real pilot will be noisier. Say so.
  - **Top 10%:** break-even 7.3, P(GO) at +12 is 70%; but on seed 2026 the single default run says **RE-PRICE** (+10.2, range +6.6 to +13.8), by luck. On RE-PRICE at Top 10% the "Next:" line still suggests "Top 10%" (plan wording, left as is).
  - Scenarios: "It works well" GO, "It does nothing" KILL, "It hurts normal orders" KILL, "Fake attempts rise" KILL; the fair line stays green in all of them and for Top 10%.
  - **Ops day:** Close pilot gives a decision-grade verdict with 6 pairs (for example RE-PRICE, +37.6, range +5.6 to +69.7, smallest effect 35 per 100: one day is noise). The normal-order rule still trips on about 3 in 10 closed demo days by noise alone (8 of 28 in the same check) (it judges the point estimate on ~25 normal orders per rider). That is the old design, not changed; it is why the Ops card says one day is not evidence.
- **Decisions made inside the plan (small)**
  - Smallest-effect text says "not yet known" until there are 6 pairs (with 2 identical pairs it printed 0.0).
  - RE-PRICE reason in the engine now points to a pre-planned Pilot 2 (it said "then re-test").
  - Sections of the maths panel are numbered 1 to 9 (a test now checks there are no repeats).
  - The baseline slider stays (folded); targeting sets it.
- **Not done / not checked**
  - "Plan Pilot 2" button (plan Q9: only if time was left).
  - Independent code-review and security-review agents were **not** run (I spawn agents only when asked). Worth doing before the Fri 3 pm freeze (the Live API validation is unchanged but `closePilot` still messages bound phones in Live mode, audit item 1).
  - Live mode against real accounts (still blocked by Twilio's trial); `/api/health` after this deploy.
  - `17-prototype-audit.md`: **item 2 is fixed** (the fake-attempt reading), item 4 is partly fixed (README pilot line and `/audit` row; its demo script still predates the landing walkthrough) and item 5 was fixed in Session 10. **Still open:** 1 (Live `closePilot` messages bound phones), 3 (no git), 6 to 15 (Hindi sheets, Ops card mixed bases, ₹120 in four files, Ops day fixed at top 20%, dead code, formatters, state size, CSP, a11y leftovers, evidence from the browser).
  - One flaky baseline run: the autopilot "uplift +12" test (800 orders × 6 seeds) failed once and passed on rerun; it can take close to the 30 s test limit on a busy machine.
  - `14-deck-handoff.md` was not edited (its "PENDING" numbers and the "~7.5" / "GO 2 times in 3" lines are replaced by the list in `16`); the HTML copy is still not synced.

### Session 11 (cont.): GitHub set up
- The whole project (`Meesho DICE/`, not just `prototype/`) is now a git repo: **https://github.com/Gaurav-UwU/meesho-dice-valmo-rto (PRIVATE)**, branch `main`, first commit `2ab7efe` (272 files).
- **The `.git` folder is outside OneDrive** at `C:\Users\gaura\.git-dirs\meesho-dice` (the folder holds only a small `.git` pointer file), so OneDrive cannot corrupt it by syncing. `gh repo create --source` does not recognise this layout: use plain `git` (`git add`, `git commit`, `git push`) and `gh repo view Gaurav-UwU/meesho-dice-valmo-rto`.
- **Kept out on purpose** (root `.gitignore`): `.env.local` and any `.env*` (only `.env.example`), `research/order1-valmo-whatsapp.jpg` (rider phone + AWB, redact before sharing), the organisers' `Meesho/` case PDFs and `meesho_q1.pdf`, `node_modules`, `dist`, `coverage`, generated `prototype/api/*.js` (rebuild with `node scripts/build-api.mjs`), raw/cached geo data (`data/geo-*.json` is kept). A scan of the committed files found no keys or tokens; the phone-like strings are fake test numbers.
- This resolves `17-prototype-audit.md` item 3 in part (version control). The gated deploy script (`npm run ship`) is still not written.

### Session 12: 2026-10-01: multi-device sync and "new day" reset FIXED (code done, NOT yet deployed)
- **Report (Gaurav, after a demo on several phones):** devices did not stay in sync, and pressing a new day on Ops did not reset the data on the other devices. Brief: `work/19-sync-reset-fix-prompt.md`. The Step 0 questions (mode, phones, what each device showed, who pressed what) were asked in chat; **no answers had come in when the code was written**, so the causes below are ranked from the code and from reproductions, not from Gaurav's answers.
- **Causes, ranked by evidence**
  - **A. (certain for separate phones)** In Demo mode a day lives in one browser's localStorage and is shared only between that browser's tabs. Two phones never share a day. A phone opened from a QR code without `?mode=live` fell back to Demo mode **with no warning**.
  - **B. (reproduced with the original code, test run against `git show HEAD:` code)** A tab whose own version was higher ignored a reset from another tab (adoption needed a higher version), and its next tap overwrote the reset everywhere. Live mode had the same version rule.
  - **C. (confirmed by reading)** Taps carried no day id, so a stale device's tap hit a new day.
  - **D. (confirmed by reading)** A Supabase day in the old shape was ignored silently (screens on "Loading" until a Reset with the admin token).
  - **E. (handled)** Browsers with no BroadcastChannel (old Safari), blocked storage (private tab), in-app browsers without sessionStorage or `prompt()`.
  - **F. (confirmed)** Open sheets, typed OTPs, the Autopilot toggle and the landing ticks survived a reset.
- **What changed**
  1. **Day identity.** `DayState` has `dayId` and `dayNo`; `DAY_SCHEMA` 5 to 6; local key `rescue-console-day-v6:`. `src/domain/dayId.ts`: `isNewerDay` (same id: higher version wins; different ids: higher **day number** wins, then id as a tie-break; never a clock), `checkActionDay`, `newDayId`. **Version keeps climbing across resets** (so a slow write expecting an old version can never land on a new day). The first day of a hub has the id `day-<seed>` in Demo mode (tabs that open together hold the same day); every reset gets a fresh unique id.
  2. **Every tap names its day.** Stores stamp the day id the screen was showing. Demo store: storage is re-read first; a tap on a day that has been reset is refused and the tab switches to the new day. Live API: `dayId` is **required** on `/api/action` and on admin `autopilot`; a mismatch answers **409 `{code:'day_reset', error:'The day was reset, refreshing'}`** and changes nothing (`core.ts` `mutate` re-checks inside the retry loop). Webhook replies (customer WhatsApp) name no day and go to the current one.
  3. **A stale device cannot overwrite a newer day.** Demo: adoption by `isNewerDay`; the flush reads storage and will not write an older day over a newer one; `resync()` re-reads storage when the tab wakes (visible, focus, pageshow, online) and on the `storage` event, which also works where BroadcastChannel is missing (`src/store/wire.ts`). Live: adoption by `isNewerDay` for both Realtime and the 5 s poll.
  4. **Reset reaches everyone.** Reset makes a new id and `dayNo + 1`. `ByDay` (route level in `App.tsx`) restarts a screen when the day changes (open sheets, typed OTP, picked order, confirm prompts, Autopilot toggle). Autopilot steps return `false` when refused, which switches the loop off. Landing ticks are tagged with the day and cleared on a new one. One toast per change ("The day was reset. Showing the new day now."); the device that pressed Reset gets none.
  5. **Never silent (acceptance 1).** New `SyncInfo` on every store (`getInfo`) and a badge on Ops, Desk, Audit, Rider and Customer (`SyncBadge`) plus a full panel in the landing Setup. **SYNCED** shows hub, day number, short day id, version, last change and last server check. **ALONE** says the device has its own private day and how to join. Also CONNECTING, OFFLINE (after two failed reads, showing the last day seen), NEEDS RESET, JOIN KEY REFUSED, PAGE OUT OF DATE, and warnings for a private tab and for a browser whose tabs cannot hear each other. `?mode=live` on a site with no Supabase settings now says ALONE and why (it used to fall back silently). Pure text in `src/store/syncText.ts`.
  6. **Phones join without typing (acceptance 2, option a chosen, see below).** Landing Setup has "One device (Demo)" / "Several devices (shared day)". In the shared day the Open links and the QR codes carry `?mode=live` and the live key after `#k=` (the part after `#` never reaches a server; the page removes it from the address bar at once). Keys live in the tab (sessionStorage) with a memory fallback when it is blocked (`src/store/secrets.ts`, `join.ts`).
  7. **Old shapes recover (acceptance 5).** The server replaces a saved day whose schema is **older** when any screen opens it (`runEnsure`), so **no manual Reset is needed after the schema 6 deploy**. Days from a newer schema are left alone; actions on an unreadable day answer `old_shape`. Live screens say NEEDS RESET or PAGE OUT OF DATE instead of "Loading". A wrongly shaped local day is replaced with a notice.
  8. **In-app WhatsApp works across devices.** Public-day OTP messages were masked for every order, so a customer phone on another device could not show the code. Now only orders **linked to a real phone** are masked (`toStorable(state, pepper, maskOnlyFor)`); the stored OTP record is still a hash. The Customer banner says which kind of phone it is.
- **Tests:** 818 (was 723), all pass; `tsc -b` clean; `oxlint` 0 errors (6 warnings: the old 5 plus `useSyncInfo` next to the other hooks in `StoreContext.tsx`); `npm run build` and `node scripts/build-api.mjs` clean. New/updated: `dayId`, `guards`, `local` (two tabs, dropped channel, missed reset, storage, old key), `live` (reset with lower version, stale replay, 409, offline, old shape, bad key), API `core`/`http`/`parts` (stale tap after a reset, autopilot, ensure upgrade, old shape, OTP visibility), `syncText`, `join`, `wire`, `secrets`, `sync.ui` (badge, ByDay, DayLoading, notices, Autopilot stop), `Setup`, Landing ticks. No existing test was deleted; old ones were updated for the new day id and the required `dayId`.
- **Real-browser check (Chromium 1194 via Playwright, headless, in this cloud session): 27 of 27 checks passed.** A stand-in server (the real `api/_lib` handlers with the in-memory test database, plus a mock of Supabase's read endpoint; Realtime is not mocked, so the 5 s poll did the work) served a build with Supabase settings; a laptop window and two 390-px phone contexts joined by link with the key. Start day and Autopilot reached the phones; **Reset day moved both phones to Day 2 in about 1.4 s**, told them once, and dropped their rider screen back to "not started"; a phone with its reads blocked then tapped "I'm home" on the old day: the server answered 409, nothing was applied, the phone said "The day was reset, refreshing" and moved to Day 3 when reads returned; going offline showed OFFLINE, reconnecting showed SYNCED; a planted old-shape day was replaced when a screen opened it; a phone with no key showed JOIN KEY REFUSED. Demo build: a Demo device says ALONE; two tabs follow each other and a reset reaches the other tab; the same with `BroadcastChannel` deleted (old Safari path); a blocked-localStorage page warns and still runs; `?mode=live` without a server says ALONE with the reason and strips the key from the URL; the landing Setup shows ALONE and explains it.
- **NOT tested (be honest at the call):** real iPhone Safari and Android Chrome (only Chromium at phone width), a real private tab or WhatsApp/Instagram in-app browser (simulated by blocking storage and deleting APIs), real Supabase Realtime (the poll was the only transport exercised), the Vercel deploy, and any of Gaurav's original phones. The 90-second Demo video path is covered by the existing flow tests and was not re-filmed.
- **Decisions and things to know**
  - **Shared day = option (a): Live mode for all devices** with the in-app WhatsApp (Twilio stays off). It reuses Supabase and `/api`; no new backend. **Needs Gaurav to confirm.**
  - **"Start day" does not make a new id; "Reset day" does.** Start day begins the day that Reset made (same id), and every device sees it start through the normal update. If Gaurav wants Start day to rotate the id too, it is a small change, but it would throw away a phone's view of a day that has not started.
  - **The join QR code contains the live key.** Acceptable for a demo, but the codes should be shown only to the team's own phones, and `LIVE_KEY` rotated afterwards if a screenshot of them was shared.
  - **Live-mode OTPs on synthetic orders are readable in the public day** (needed by the in-app phone). Real linked phones stay masked. Noted in `LIVE-SETUP.md`.
  - The earlier "press Reset once after the schema change" advice no longer applies to schema 6: the server upgrades it by itself. `scripts/live-smoke.ts` was updated (new `newDayId` dep, day-id and stale-tap checks, OTP expectation).
- **To deploy (I have no Vercel login here, so this is yours to run):** in `prototype/`: `npx vitest run && npx tsc -b && npx oxlint && npm run build` then `node scripts/build-api.mjs && npx vercel deploy --prod --yes`. Then check `/api/health`. If Live mode is wanted on phones, confirm the Vercel build has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (a site built without them says ALONE and "not set up" on the landing page, which is the honest answer, but then phones cannot join) and that `LIVE_KEY` and `ADMIN_TOKEN` are known to the team.
- **Multi-phone run (for the freeze on Fri 2 Oct):** laptop: open the deployed landing page, choose "Several devices (shared day)" (it asks for the live key once), press "Start with a fresh day" (asks for the admin token once), scan the Rider and Customer QR codes with the phones, open Ops from the first link. Every screen should say SYNCED with the same Day and id.

### Session 12 (cont.): independent code review of the fix, and what it changed
- I ran the code-review skill (high) on the Session 12 commit. Ten findings; eight led to changes, tests first (832 tests now), browser checks re-run (27 of 27 still pass):
  - **Binding a real phone now masks an OTP message that was stored earlier** (`bindPhone` re-saves the day, version + 1, only when a message actually changes). Before, the code could stay public until a later action.
  - **A server row that restarts at day 1** (deleted, recreated) while a device holds day 4 no longer strands that device: when the server refuses a tap as "day reset", the device takes the server's day whatever the numbers say.
  - **A damaged shared day** is reported (NEEDS RESET, new problem `unreadable`) instead of "Loading". **The Reset day button now appears in that message**, because the Ops dashboard (which holds the normal button) is not shown when there is no day.
  - **A refused key on a tap** (key rotated, wrong key typed) now shows JOIN KEY REFUSED, not only at the first load.
  - **Landing "Start with a fresh day"** says "Done" only when the reset really happened (`reset()` now returns true or false).
  - **Demo tabs:** a late broadcast can no longer overwrite a newer saved day, and two tabs that act at the same version no longer lose a tap silently: the second writer keeps the saved one and says "Please tap again".
  - **Polling and Realtime:** the 5 s poll sleeps while a tab is hidden; a failing Realtime subscription no longer stops the store from starting; bursts of wake-up events cause one re-read (1 s gap).
  - **Fewer database reads per tap:** phone links are read once per request, not on every retry.
- **Known and accepted (not changed):** the OTP text for orders not linked to a real phone is readable in the public day, by design (the in-app customer phone must show it), so a rider's screen could read a synthetic customer's code; this is fine for the demo and is not fine for real customers, who stay masked. Polling intervals are never cleared (the store lives as long as the page).

### Session 12 (cont.): order id on the rider card
- Gaurav found it hard to match an order on the rider phone with the same order on the customer phone. The rider card now shows **"Order lucknow-0289 · AWB SYN..."** under the customer name, and the customer phone's order picker lists **order id · AWB · payment**. The customer's chat text already showed the AWB. Test added in `flow.test.tsx` (fails without the change). 833 tests, gate clean. Not deployed yet.

### Session 14: 2026-10-01: Refused-Parcel Desk v3 built (plan 21), all 5 steps, tests green, NOT deployed
- Gaurav confirmed the two open choices (keyword matching, not AI embeddings; hold on the low end of the range, P10 ≥ 5.5%) and said "start building". Built in plan order, tests first, nothing on the never-cut list cut. Branch `claude/blissful-cerf-94htkh` (cloud session; one commit per step, pushed). **Not merged to `main`, not deployed**: the cloud session has no Vercel login, so the deploy is Gaurav's (`git pull`, then in `prototype/`: `npx vitest run && npx tsc -b && npx oxlint && npm run build`, then `node scripts/build-api.mjs && npx vercel deploy --prod --yes`). The gate was run chained before every commit: **1,092 tests** (was 834), `tsc -b` clean, `oxlint` 0 errors (the same 6 old warnings), `vite build` and `build-api.mjs` clean.
- **Step 1, clarity (no engine change).** The three switches (Unopened, Seal intact, Invoice outside) are a **"Try a what-if" preview only**: a one-line before/after ("Seal broken: Hold lane closed, now Consolidated return, EV +₹136 → +₹36"), kept in the screen, never saved, never changes the parcel. The old `deskSetGate` action is **removed** (reducer, types, `validate.ts`). Three money tiles replace "Router effect: min to max": **Booked so far (net)** (real savings less real Router costs: hold ₹8, re-home leg ₹21, WhatsApp messages the Router sent), **Still in play (expected)** (each open parcel at its current lane's EV; a held parcel at the chance of a buyer in the hours left, the ₹8 already spent) and **Cost of sending everything back** (refused × ₹120). Assumptions: three headline numbers (**soft-refusal accept rate** sets no cash, wants it later and not home at once, and reads "mixed" when they differ, which the shipped defaults 50/50/40 do; conversion; shelf capacity), the seven rates folded under "More". Also fixed: the reducer now leaves the state untouched for an action type it does not know (it used to bump the version and drop the day). The Desk top bar wraps at 375 px (it scrolled sideways before).
- **Step 2, inspect, item condition, skip, Audit.** **Inspect parcel** (hub operator: unopened, seal intact, invoice outside, a photo **note** (no upload), time, who) is required **before Hold only**. Until it is done the hold lane is closed (new gate "Inspected"; the three fact gates say "Waiting for the inspection") and the what-if switches are off. **Bots inspect for themselves:** a parcel refused by a simulated rider is inspected at once with the synthetic facts (`Bot (synthetic)`); the four live-demo stops wait for the operator; **Close pilot** inspects whatever is left. New gate **"Item condition OK"**: a damaged or wrong item is never re-homed and carries a **"Seller claim / QC needed"** chip from the moment it is refused. **Skip second chance** with four reasons (firm refusal at the door, not reachable, seller wants it back, other): logged (`SECOND_CHANCE_SKIPPED`), counted, no message, never opens a gate. New events `PARCEL_INSPECTED`, `SECOND_CHANCE_SKIPPED`; actions `deskInspect`, `deskSkipSecondChance`. Audit: "No parcel held without an inspection", "No gate was overridden".
- **Step 3, keyword matching (the core of slide 6).** `engine/keywords.ts` (tokeniser with stop words and light plural clean-up, TF-IDF, cosine, shared words), `catalogue.ts` (**synthetic** catalogue: 60 listings per hub, 8 categories, titles like "Women's cotton kurti, blue, L", a **hidden true buyer rate** per listing and a **14-day order history drawn from it**), `demand.ts` (Gamma-Poisson in closed form: prior from similar listings worth k = 10 pseudo-orders, updated by the exact SKU's own orders over 336 h; mean P = 1 − (β ÷ (β + s))^α with s = 48 h × conversion; the range from the 10th and 90th percentile of the rate by Wilson-Hilferty; confidence High / Medium / Low; evidence sentence), `backtest.ts`. **The hold rule is P10 ≥ 5.5%.** Similar = same category, price within ±30%, cosine ≥ 0.35. **A similar listing is evidence of demand only and is never the parcel:** a test checks the exact count never includes a similar listing and the similar set never contains the parcel's own SKU. **The Router never reads the hidden rate** (a test shows the decision is identical whatever it is); the hidden rate only times the simulated buyer. The gate is now "Match forecast clears break-even (low end)"; the ₹ shown still uses the mean. Desk card: forecast block (chance with its range against a dashed 5.5% line, confidence chip, evidence sentence, keyword chips, the "same seller and same listing, history is synthetic" note). Folded **backtest panel** last. Hand-worked test from the plan: prior 0.006/h, 3 exact orders, mean **14.3%**, P10 **9.8%** (the plan said about 9.9%; the exact figure is 9.84%), so hold.
- **Step 4, second-chance options + hub pickup.** The offer is now: Deliver again, **Different time** (asks tomorrow or the day after in a reply; parked to 08:00 on that day then attempt 2; **not** a customer reschedule, so it never counts toward the reschedule cap), **Pay now by UPI** (COD orders only; paid makes the order prepaid and sends it out as attempt 2; a failed payment still sends it out as COD, as the failure message says), **Pick up at hub** (only if a shelf slot is free when the WhatsApp is sent; checked again when the customer answers; if it filled, the customer gets Different time instead), and Cancel order. **All follow-ups are replies, so the cap stays at 4 proactive messages per order** (tests for every option). **Pickup:** 48 h window (`pickupHours`), 4-digit code with 5 tries, shares the 30 slots with Hold, the code and instructions are in the confirmation reply, ₹8 booked on reserve, **₹120 booked only when collected** (net ₹112 before WhatsApp costs; the Desk tile shows +₹111 after the two messages), a no-show at 48 h goes to a batched return (₹36, the ₹8 stays), a COD pickup can note "cash collected at the hub" (a flag only). **New terminal order state `hub_pickup`: not delivered, in the arm's denominator, never pays or accrues a bonus; the original refusal stays the rider's failure** (scenario tests; the delivered-by-rider second chance still counts as delivered). Close pilot's simulated customers pick from a fixed mix by refusal reason (`botCustomer.ts`, an engine constant). **Bug found and fixed:** a customer who took the second chance and refused again on attempt 2 created a duplicate Desk parcel with the same id (stuck in the queue); the order now goes back as an RTO.
- **Step 5, KPI panel + pickup Audit.** Pilot KPI panel: sales saved, accept rate, re-home match rate against the 5.5% break-even and against what the forecast said, pickup rate with no-shows, average dwell, ₹ booked per refused parcel, skips and reasons, the kill rule (match rate below 3% after 30 days, judged only with 30 sim days and 30 held parcels). **Every number shows its n and "too early (needs 30)" until a lane has 30 parcels; an empty lane shows a dash, never 0.** Custody incidents and complaints are stated as not simulated. Audit now has **14 checks**: "No pickup handed over without a verified code" and "The shelf was never above capacity" (the slot and capacity at that moment are logged on every hold and pickup, so lowering the capacity later cannot turn it red).
- **One schema bump:** `DAY_SCHEMA` 6 → **7**, local key `rescue-console-day-v7:` (done in step 2; steps 3 to 5 added their fields inside 7, and nothing was deployed in between). **No manual Reset is needed** after the deploy: Session 12's server upgrade replaces an older-shape day by itself. The `dayId` logic was re-checked: the new actions go through the same envelope (`dayId` required, 409 on a reset day), a reset day has no parcels, no shelf use and no overdue timer (test), and the pickup code is hashed like an OTP. **Live mode:** `validate.ts` knows `deskInspect`, `deskSkipSecondChance`, `deskHandover` and the options; Live inbound numbered replies map by **button id** (a pickup left out of the offer shifts the numbers); the pickup code is stored as a peppered hash and masked for real-phone orders, readable for synthetic ones (the in-app customer phone needs it, same as OTPs).
- **Real numbers to know (all SYNTHETIC)**
  - **Backtest (40 replayed histories × 4 hubs × 60 listings = 9,600 forecasts):** overall a buyer turned up for 9.0%; Brier 0.0796 against 0.0822 for always guessing the average (a modest win); calibrated on average (within 4 points) but **a little low at the bottom (0–5% forecast: 2.5% vs 4.7% actual) and a little high at the top (20–30%: 24.1% vs 17.0%)** because a thin history is pulled toward similar listings.
  - **Hold rules compared:** hold every parcel: 100% held, 9.0% found a buyer, ₹5 per held parcel, ₹5,095 per 1,000 refused. Hold if the average clears 5.5%: 62% held, 11.6%, ₹9, ₹5,523. **Hold if the low end clears 5.5%: 42% held, 14.2%, ₹13, ₹5,291.** **Be honest on slide 6: the low-end rule makes each held parcel pay more often and more, but in this synthetic world it earns slightly LESS in total than the average rule (it gives up volume for certainty).** The argument for it is protection against a forecast that is wrong when history is thin, not a bigger total.
  - The synthetic demand was set near the break-even on purpose (typical listing about 4% to 14% chance in 48 h), so the rule has something to decide. Real rates are unknown: ask Meesho for SKU-by-pincode order history (mentor question).
- **Decisions I made inside the plan (small, all reversible)**
  - "Exact SKU" is the listing id (`SKU-017`); a listing has one seller by construction, but the parcel's `sellerId` is still drawn separately (kept so batches by seller did not change). A real build keys demand by seller + SKU + pincode.
  - The four live-demo parcels replay a busy listing (hidden rate 0.2 per hour) so the first one is a clear, High-confidence hold; its forecast is about 48% (the prior pulls it well below the hidden 99%).
  - The match-rate KPI counts still-waiting holds in the denominator and says how many are waiting.
  - "Cancel order" stays as a fifth button beside the four options.
  - Pay now is not offered on a prepaid order; Pickup not when the shelf is full.
- **Not done / not checked**
  - **Not deployed** (no Vercel login in the cloud session) and **not merged to `main`**. The browser checks (desktop 1280 and phone 375, no sideways scroll) were run on a local production build in Chromium, not on the deployed site.
  - The independent code-review and security-review agents were **not** run (Session 14 touched the API validation, the inbound parser and the pickup-code hashing, so run them before the freeze).
  - Real iPhone/Android phones, Live mode against real accounts, real Supabase Realtime: untested (as in Session 12).
  - Not built, per plan: the "Arrives tomorrow · already near you" badge, real SKU data, AI embeddings. Hindi on the Desk sheets, a "Plan Pilot 2" button, and `17-prototype-audit.md` items 1 and 6 to 15 are still open.
  - `pickup_code` messages to a real phone contain the code in plain text by design (it is for that customer).

### Session 15: 2026-10-01 to 10-02: Desk v3 merged and deployed, wording fix, deck plan v5, plan changes (decisions only after the deploys)
- **Merged and deployed:** the Desk v3 branch `claude/blissful-cerf-94htkh` was fast-forwarded into `main` and deployed (1,058 tests at merge). A forecast wording bug was then fixed (the forecast block now says what the forecast decides, the EV line names what blocks Hold): 1,104 tests, deployed, and the new wording was confirmed in the live bundle. `/api/health` returned ok.
- **Docs written:** `23-deck-plan-v5.md` (the deck delta: final pilot numbers, slide 6 rewrite, risks, the yearly-rupees table explained, a 10-shot screenshot list, timeline; §9 the fallback story), `26-plan-review-2-oct.md` (review of the whole plan: five "do now" items, design flaws, small fixes), `24-fake-attempt-control-plan.md` and its start prompt `25-start-prompt-fake-attempt-control.md`.
- **Decisions by Gaurav (2 Oct):**
  1. **Parallel pilots are dropped completely** (the button, Pilot B, the Compare view, the two Ops consoles). The earlier plans for them were deleted.
  2. **Next build: fake-attempt control with the hub captain, independent of the bonus** (works with the bonus off and in both arms; a bonus-independent strike ladder; rider monitor; rider visibility; outcome KPIs). Plan 24; its seven decisions carry recommended answers.
  3. **The deck says:** if the 30-day bonus pilot fails, a concrete plan stands that does not depend on the bonus, "built and tested in our prototype" (never "proven"): fake-attempt control and the Router with local re-home.
  4. **The bonus rule is confirmed: ₹15 when a flagged order is delivered on ANY attempt** (first, second or later), except to a rider whose own earlier attempt on that order looked fake. This is what the prototype already does (`completeDelivery` calls `accrueBonus` on every delivery). For a moment I wrongly suggested a first-attempt-only rule; nothing was changed in the code. The rule is now written into `CONTEXT.md`, `00-MASTER.md`, `14-deck-handoff.md`, `15-prototype-v2-handoff.md` (decision table), plan 24 and deck plan 23.
- **Not done:** the five "do now" items in `26` (deck assets on the current build, a banner on `14-deck-handoff.md` for its stale numbers, a Demo-page QR, logging the mentor call, the code and security review agents), the real-phone run, the Supabase Reset.

### Session 15 (cont.): 2 Oct: pilot-design decisions, three independent reviews, deck fixes, the all-changes build prompt
- **Decided by Gaurav:**
  - Close the parking gap: hold the ₹15 for the captain's review after a weak same-rider attempt, auto-release when the customer confirmed, release by default.
  - A strike needs corroboration.
  - The fake-attempt rule becomes relative: Bonus no more than 2 points above Control.
  - Returns and complaints are watched, not a stop rule.
  - **Option A for the pilot:** Pilot 1 stays as built (paired riders, a same-time Control). The price test and hub-level design move to the region phase (about 40 hubs, hubs randomly at ₹0/₹10/₹15, difference-in-differences). A before/after alone is rejected because Meesho's RTO and COD success drift by about as much as the bonus's expected effect.
- **Deck docs updated:**
  - `23-deck-plan-v5.md` §10 (slides 5, 7 and 8 wording, two risk rows, small fixes).
  - `14-deck-handoff.md`: a READ FIRST banner, the stale numbers fixed, the 5% rule replaced.
  - `00-MASTER`, `CONTEXT`, `10-sources`, `13`, `24`, `NEXT-SESSION`, the README and `26` are corrected.
- **Three independent read-only reviews** (security, correctness, docs). Findings are in `26-plan-review-2-oct.md`, "Independent reviews (2 Oct)". The prototype is green: 1,104 tests and `tsc` clean.
- **New build prompt: `27-build-prompt-all-changes.md`** (supersedes 25). Its parts:
  - Step 0: rollback tag, assets, mentor notes, preview deploys.
  - Part 1: the relative fake rule, returns watched, 10 correctness fixes.
  - Part 2: fake-attempt control with the hub captain and the parking-gap hold.
  - Part 3: Live-mode security, with role-split keys and longer keys.
- **Not done:** no code changed this session. The deck assets, the mentor-call log and the real-phone run are still open.

### Session 15 (cont. 2): 2 Oct, ~01:00–03:00: the final deck plan (28)
- **`work/28-deck-plan-final.md` is the one deck plan now.** Structure (Gaurav's decision): **slides 0–3 = the real Round 1 cover + 3 slides exactly as submitted** (`Meesho/GPS_IIT Bombay - Round 1 submitted.pdf`, PPTX `GPS_IIT Bombay.pptx`; `round1-deck.html` and `Meesho DICE R1 - ValMo RTO.pptx` are drafts), then **six Round 2 slides**: 4 summary + reason map, 5 Rescue sharpened (controls, fake-attempt), 6 economics + fair test, 7 Router, 8 30-60-90, 9 risks + 10x.
- Story: headline test, Round 1 lever codes kept (P1, P2, R1, R2, C1), "enhance, don't pivot" lines, one real order as the thread, a bridge line on each slide, a research → insight → design table (16 rows) and new sources in `10-sources.md`.
- **Round 2 field research (from Gaurav):** metro + Tier 3/4; parcels arrive before the promised date so COD customers have no cash ready; riders interested in a per-order bonus; hubs paid ₹5 per delivered parcel. Synthesised into the reason map: **Not ready / Not wanting / Not reached**, one fix each. The Round 1 pie is our research blend, so the 9% "no real attempt" is resolved.
- Corrected my error: Round 1 never said the hub pays the rider (it said Valmo's rider bonus system).
- Gaurav asked for fabricated survey data. I declined to present invented numbers as research; a **layout placeholder split** (not ready ≈ 46 / not wanting ≈ 49) is in 28, marked NOT DATA, to be replaced with real answers or relabelled "illustrative" before submission.
- Scored the plan honestly: about 8.3/10 after the changes; research is the weakest criterion until the Round 2 n is on slide 4.
- Commits: 53d11b2 … 21155e3 (all pushed).

### Session 16: 2 Oct: the all-changes build (prompt 27), Parts 1 to 3 BUILT, tested, NOT deployed
- Branch `claude/bold-davinci-pw2kx4` (cloud session; commits `b4a6cc3` to the docs commit after `851cd41`, all pushed). Baseline was 1,104 tests (72 files); now **1,249 tests (77 files)**, `tsc -b`, `oxlint` (0 errors), `npm run build` and `node scripts/build-api.mjs` clean.
- **Step 0:** local tag `freeze-candidate-2026-10-02` = `208d415` (also the tip of `main`). **The tag could NOT be pushed (GitHub returned 403 for tag pushes from this session): Gaurav runs `git tag freeze-candidate-2026-10-02 208d415 && git push origin freeze-candidate-2026-10-02` on his machine.** The current production deployment (the rollback) could not be read: the Vercel connector answered 403 for the `gaurav-uwus-projects` scope and there is no CLI login. Gaurav notes the current production deployment id (`npx vercel ls` or the dashboard) as the rollback. **No preview or production deploy was done** (no Vercel access here). Mentor-call notes: not received, so not logged.
- **Part 1:** fake-attempt rule is relative (Bonus riders' suspected rate more than 2 points above Control's, each arm judged once it has 30 attempts; config key `fakeAttemptExcessPts`; slider "Extra fake attempts for Bonus riders" in points above Control, default 0, scenario "Fake attempts rise" = +6; simulation: Control at 4% baseline, Bonus at baseline + slider). Returns watched: returned share Bonus vs Control on the Ops card and Check today's Ops day, never a KILL. Ten correctness fixes (i to x) each with a failing test first (`src/domain/review.fixes.test.ts`). Existing tests were updated where behaviour changed on purpose (second chance needs the second-chance lane; ₹120 gross saving with a booked ₹21 leg; strikes now need a reason). None deleted.
- **Part 2 (all of it, nothing cut):** strike log (30-day expiry, Ops overturn within 48 h, rider "Ask for a review"), ladder (1 warning, 2 every failed attempt reviewed for 14 days and any bonus blocked, 3 escalated), a strike needs a reason chip AND corroboration (phone far / no calls / no wait / a pattern of other disputed orders, or a written note of 5+ characters), 24 h silence = free re-attempt marked "captain did not decide", the parking-gap hold (weak same-rider attempt: ₹15 waits in the 7-day window; cleared at once if the customer confirmed; released by default at day 7; withhold needs a reason), `/captain?hub=` (queue with evidence, held bonuses, rider monitor with timeline, scorecard, "Does it pay?" panel), Ops read-only with Overturn, rider banner and strike meter (EN and Hindi), 4 new Audit checks (18 in all), Ops header link, Desk menu link, landing window and walkthrough step. A bonus-off day (`bonus: 0`) creates no ledger rows and still runs everything (tests).
- **Part 3:** two keys on the server: `LIVE_KEY` is now the RIDER key (QR codes), new `CAPTAIN_KEY` for everything else; both 20+ characters and different. A rider key may send riderDeliver, submitOtp, riderAttempt, riderRefuse, the customer replies (still bound-order guarded) **and riderAskReview** (my one addition to your list: without it the rider's "Ask for a review" button cannot work in Live mode; it only flags a strike once; tell me if you want it captain-only). `/api/day` rate limited; `/api/health` returns only `{ok}`; OTP lock is a 5-minute cooldown; customer pins rounded to about 1 km (so a real-phone customer's directions are approximate); MessageSid claimed atomically and released if the reply fails (busy day answers 503); `deskInspect.by` set by the server; limiter map bounded; CSP `frame-ancestors 'none'`. The client asks for the captain key only when a captain-level button is pressed and moves it out of the rider slot if the server says it is the captain key; the QR codes only ever carry the rider key.
- **Schema:** ONE bump, `DAY_SCHEMA` 7 to 8 and local key `rescue-console-day-v8:`. The server replaces an older-shape day itself (Session 12), so the Reset afterwards is only needed if a screen says NEEDS RESET.
- **Reviews:** code-review (high) found 10 issues, all fixed with tests (atomic MessageSid claim, clawed-back held bonus, dispatchNextDay leg, overtaken disputes, pattern counting, key prompts, one customer-action list, bounded limiter). Security review: no finding at 8/10 or above. Noted below the bar: a rider key can still play the customer on SYNTHETIC orders (deliberate, the Demo phone); a person pasting the captain key into the rider-key prompt is moved out of the rider slot only after the first `/api/day` answer.
- **Real-browser look (Chromium on a local production build, not a deploy):** `/captain`, `/ops`, `/rider`, `/pilot`, `/audit`, `/` at 1280 and 375 px, plus the strike flow end to end and the Hindi strike meter. No page error. `/ops` scrolls sideways at 375 px, **identically on the freeze build** (591 px), so not a regression.
- **Before the production deploy Gaurav must:** (1) set `CAPTAIN_KEY` in Vercel (20+ characters) and make sure `LIVE_KEY` is also 20+ and different: otherwise `/api/health` says `{"ok":false}` and Live mode is down (Demo mode is unaffected); (2) set the Vercel Firewall rate rule on `/api/*`; (3) preview-deploy (`npx vercel deploy`), check at desktop and 375 px, then `npx vercel deploy --prod --yes`; (4) press Reset once on the shared day with the admin token if a screen says NEEDS RESET; (5) rotate `LIVE_KEY` after the demo if the old one was ever shown in a QR code or screenshot. If Part 3 is not deployed before submission, keep the shared day team-only.
- **Not done / not checked:** preview and production deploys; the rollback id; the pushed tag; the mentor-call notes; real phones; Live mode against real accounts; the deck screenshots of the captain screens (take them after deploy: shot list in `23-deck-plan-v5.md` §11); `10-sources.md` still lacks source lines for **Meituan, Uber Eats / DoorDash and Ekart** (listed at the bottom of that file, nothing invented). The deck wording "designed and next to build" is unchanged until the deploy is live.

### Session 17: 2 Oct: the prompt-27 build DEPLOYED to production
- **Rollback:** tag `freeze-candidate-2026-10-02` → `208d415`, pushed from Gaurav's machine. Production before this deploy: `valmo-rescue-console-27qa2ompb-gaurav-uwus-projects.vercel.app` (roll back with `npx vercel rollback` or by promoting it in the dashboard).
- Merged `main` (deck commits up to `0d90285`, docs only) into `claude/bold-davinci-pw2kx4` → `19ea2ca`, pushed. Gate on that commit: **1,249 tests (77 files) passed**, `tsc -b` clean, `oxlint` 0 errors (warnings only), `vite build` ok, API bundle 5 functions.
- **Keys:** Gaurav asked me to set them; I declined to create or enter secrets or change the Firewall, and gave him the commands (random key piped into `vercel env add`, never shown). `vercel env ls` (names only): every variable is Production-only; **no `CAPTAIN_KEY` yet**; preview has none.
- **Preview** `dbx8ktkqq`: behind Vercel Authentication; checked through `vercel curl` (it auto-generated a deployment-protection bypass token for the project; Gaurav can revoke it in Settings → Deployment Protection). All pages served, CSP `frame-ancestors 'none'` present, `/api/health` `{"ok":false}` (no env on preview). Same build checked locally in Chromium (Demo mode): `/audit` 18 green, `/captain` (queue, held bonuses, scorecard, "Does it pay?" too early, rider monitor), `/rider` (₹ +15 chips, "No strikes"), `/pilot` (GO; slider "points above Control"), no horizontal scroll at 375 px on those pages, no console errors.
- **Production** `j66zrpnqb` (on Gaurav's "go prod"): all pages 200; CSP present; Demo mode verified live (`/ops` loads and starts, `/audit` 18 green, `/captain` scorecard, no console errors). `/api/health` `{"ok":false}` and `/api/day` 500 **until `CAPTAIN_KEY` is set**: Live mode (shared day, real phones) is off, Demo unaffected. Reset: the server replaces an older-shape day itself (schema 7 → 8); once the key is set and redeployed, press Reset once only if a screen says NEEDS RESET.
- Deck wording: 28 and 23 now say fake-attempt control with the hub captain is "built and tested in our prototype"; shot list updated (18 checks, the slider can stay, captain shot 11; re-take shots 1, 5, 6, 11).
- `main` fast-forwarded to the deployed branch.
- **Landing copy (later on 2 Oct):** the hero now presents the whole toolkit (headline "Fix every way a COD order fails", pitch with the not-ready story, a 5-step flow incl. the hub captain and the Router, "Now: Rescue Bonus + fake-attempt control"). Copy moved into `landing/content.ts` with 4 tests; 1,253 tests pass with `--maxWorkers=4` (the full parallel run times out one autopilot test on this machine, with or without the change). Commit `dacec5d`, deployed to production `f1129hr38` and checked live.

### Session 18 (4 Oct): edited the deck directly (building.pptx → GPS_IIT Bombay_ROUND_2_v2.pptx)
- Worked on a copy in the project root: `GPS_IIT Bombay_ROUND_2_v2.pptx` (11 slides). The teammate's `building.pptx` in Downloads is untouched. Edits made through PowerPoint itself (text replaced inside existing boxes, so fonts, colours and positions are kept).
- **Screenshots retaken at 3× from the live site** (Demo mode, Lucknow), each cropped to its box's exact aspect ratio and dropped at the same position/size: Bonus and Control rider cards, WhatsApp before an early arrival and after a failed attempt, the hub-captain evidence card, the refused-parcel Desk card, and a **GO** verdict from `/pilot` (full design: 4 hubs, 24 pairs). The single-hub Ops card always ends RE-PRICE (only 6 pairs → wide range), so the GO comes from the pilot page; the RE-PRICE capture is kept too. All in `deck-screenshots/`. Scripts (puppeteer-core + installed Chrome) are in the session scratchpad.
- **Text fixes:** "7 in 10 … could still have been delivered" (slides 2, 3); research line on slide 2 (12 riders, 25+ buyers, **3 field visits** metro + Tier 3/4, our test orders); slide 3 sources (3 field visits; RTO split = our blend); slide 4 "the 90-day pilot" and P1 moved into Pursue; slide 5 verdict caption + "~4 extra per 100" detectable effect; slide 7 fork (GO → verify then scale; REPRICE → Month 3 pays smarter; Month 3 "If RE-PRICE:"; subtitle); slide 8 net-₹ row fixed to −375 / +150 / +675 / +1,200 and "Up to 4 messages". Slide 9 text left alone (Gaurav).
- **Slide 10 split:** slide 10 = "Guardrails And Ownership" (risk table + 3 rows: first-attempt deferral, captain bias, data misuse; ownership table + "Switch to pay-smarter (Month 3)"; safety-net strip with the asset-light line). Slide 11 = "The Long Game" (staircase, carriers ₹63 vs ₹80, "Every delivery teaches the map" loop, illustrative hexagon inset, closing line).
- Not done: the "Geo-India misroutes down >50%" claim on slide 3 still needs a source check. The .pptx and screenshots are not committed (binary files; Gaurav to decide).

### Session 19 (4 Oct): prototype and deck aligned (early arrival, no hub manager)
- **Decisions (Gaurav):** there is no hub manager; the hub captain decides every strike. The captain gets **no incentive**: the hub already earns ₹5 per delivered order, and the captain's time is costed at ~₹10 a review. (Caveat to keep in mind: a fake today that is delivered tomorrow still earns the hub its ₹5, so Ops overturns, audits and the scorecard are what keep the captain honest.) A **free re-attempt** = the customer gets a real retry by another rider; the first rider gets no strike and no pay for that order; Valmo pays the trip.
- **Prototype, commit `d04535d`:** early-arrival WhatsApp. About a third of COD orders (fixed by order id) arrive 2–5 days early; their message reads "Arriving early, today … promised in N days" with Pay now (UPI) and **Keep my promised date** (parks the order until the promised day; it stays flagged and in its arm). Tests: `earlyArrival.test.ts`.
- **Prototype, commit `0b990aa`:** ladder step 3 = **bonus suspended for the rest of the pilot** (3 strikes Ops did not overturn; does not lapse with the 30-day expiry; the rider keeps delivering and stays in the comparison; an Ops overturn lifts it). `RIDER_ESCALATED` → `RIDER_SUSPENDED`, monitor status "Suspended", rider meter text EN/HI, audit check covers suspensions. 1,263 tests, tsc, oxlint, build, API bundle all clean.
- **Deploy:** preview `ot5h5bm8a`, then **production `agn0k8co1`** on Gaurav's "go prod" (aliased to valmo-rescue-console.vercel.app). Checked live: early-arrival message + Keep-my-promised-date button, `/audit` all 18 checks green, no console errors. Checked locally: early-arrival message and the Keep-my-promised-date tap work, no console errors.
- **Deck (`GPS_IIT Bombay_ROUND_2_v2.pptx`):** slide 6 new early-arrival screenshot; Genuine = "≤ 200 m, 2+ calls and 5+ min waited, or 'Yes, they came'"; Suspect = "More than 500 m away, or 'No, they didn't'" (matches the prototype); ladder note rewritten (captain decides in 24 h; free re-attempt explained; strike 1 warning · 2 reviewed + bonus blocked · 3 bonus suspended, rider still counted; appeal; Ops overturn in 48 h; no "removal from the pilot"). Slide 2 "Month 3 Scale or pay smarter". Slide 5 caption: break-even "8.7 here, from Control's observed rate". Slide 7 footer: "month-3 step: designed, built once month 2 runs". Slide 8: "Captain's time ≈ ₹10 a review, no extra pay." Backup before the edits: scratchpad `pass4-backup.pptx`.
- Then (same day): slide 3 Geo-India line corrected to "misroute cost down ~5%" (our note on the Q4 FY26 letter, `10-sources.md`; the old ">50% misroutes" had no source); slide 5 GO screenshot replaced with a tight, readable crop (`deck-screenshots/pilot-go-tight.png`: GO, "Scale it", the range vs +8.7). Live mode deliberately left off (`/api/health` 503 until `CAPTAIN_KEY` is set); the demo uses share/Demo mode.
- Then (Gaurav's edits after the verdict): research counts now **15+ rider interviews, 35+ COD buyers** (slides 2, 3; Gaurav's figures). Slide 8: ₹10 vs ₹15: "₹10 needs less lift to pay (5.5 vs 8.6 per 100) but may buy less effort. From month 2 the pilot A/B-tests ₹10 vs ₹15 against Control and keeps the amount where the economics work best"; slide 7 month 2 "Bonus pairs split ₹10 vs ₹15 (A/B)". Note: the simulator does not model lift falling with the amount (uplift is hand-set, `engine/pilot.ts`); only break-even moves. Splitting pairs halves the pairs per amount (detectable effect ~4 → ~5.7 per 100). Slide 10: "Decision rhythm" strip (every day / every week / day 30·60·90). Slide 11: panel 1 heading "Three steps, each unlocked by the one before", larger staircase text, loop steps rewritten from our research (landmark addresses, early arrivals, buyers dropping COD on price, riders chasing likely deliveries), carrier line now "Meesho gives each lane to the lowest-cost carrier" with the Q1 FY27 call in the footer, the illustrative cell adds "parcels land 3 days early". Backup: scratchpad `pass7-backup.pptx`.
- Then: **no ₹10 for the hub captain anywhere.** It was a review-labour cost to Valmo, not pay, but read like an incentive. Prototype commit `2c14e5e`: no review labour booked (`orders.ts`, `captain.ts`), "Does it pay?" counts the captain's decisions as "part of the hub captain's job: no extra pay and no cost to Valmo", the "1 in 10" break-even removed; 1,263 tests green; preview `9zv80xsgd`, **prod waits for "go prod"**. Deck slide 8: left "A suspect attempt gets a free re-attempt by another rider. Reviews are part of the hub captain's job: no extra pay."; right "₹99 saved per re-attempt that delivers" (was "≥ 1 in 10 reviews must end in delivery"); "₹10 review cost" removed from the footer. Backup: `pass9-backup.pptx`.
- Then: an outside review's points applied; sizing **the Round 1 way** (R1's levers slide tagged each lever with the RTO slice it solves). Slide 4: third column renamed "Problem solved" (no new columns): P1 not home 18% + unreachable 12%, ~₹95 cr · P2 address 13% + wrong hub 9%, ~₹85 cr · R1 riskiest 20%, ₹103 cr net at +15 · R2 no real attempt 9%, sized by the baseline · C1 not wanting 29%, ₹50–270 cr recovered; sizing note (share × 17%, 1 pt ≈ ₹92 cr, assumed fixes 1 in 5 / 1 in 4, overlap); R1 callout on the matrix. Slide 2: Pay/Test/Learn/Scale ring labels removed; constraints line (cost ↓ ₹84.8→80.3, rider earnings ↑, ordering untouched). Slide 3: "Across Meesho" on 18 in 100; "96% … while COD is only 77%". Slide 6: the 200–500 m band and mocked GPS (planned). Slide 7: ₹10 vs ₹15 A/B moved to month 3; broken sentence, RE-PRICE, WhatsApp fixed. Slide 8: duplicate net-₹ table replaced by "Why +15 is our planning case" (₹18 → ₹33; prepaid 3–4 calls vs COD 1–2; safer +10 = ₹23 cr); "8.6" only; A/B "in month 3; ₹10 wins only on a clear gap". Slide 9: "Pays once more than 1 in 6 … ₹99 net of its trip", "Pays once more than 5.5% … ~₹145 (₹50–270 cr a year)", "pilot: non-GST sellers in UP". Slide 10: risk row "The comparison gets contaminated"; titles on 10 and 11 black. Slide count left at 11 (Gaurav). Backup: `pass10-backup.pptx`.
- Then (Gaurav): **no ₹ figures on slide 4.** "Problem solved" keeps the RTO slice + the original status words; the note is now "Problem solved = share of all RTOs, from the previous slide. Levers overlap the same orders." The preferred delivery slot moved into P1 ("Two-way WhatsApp + preferred delivery slot": it fixes not-at-home, and "Change time" is the slot); P2 is "Location geotagging" only (address 13% + wrong hub 9%), as in Round 1. Backup: `pass14-backup.pptx`. P1 status then set to "Built alongside: two-way WhatsApp only" (the slot is not built; the prototype's "Change time" only moves the day).
- Then (Gaurav): **a free re-attempt goes to the SAME rider** (he knows the area; another rider raises RTO). Deck only: slide 6 "free re-attempt (the same rider retries, as he knows the area; no strike)", slide 8 "a free re-attempt by the same rider, who knows the area". Backup: `pass16-backup.pptx`. **Prototype NOT changed yet (Gaurav: later):** `orders.ts` `resolveExceptionFor` still hands the order to `otherRider` (lightest bag, same arm). When it is changed: give it back to `st.attemptRiderId ?? st.riderId`; on a strike add the rider to that stop's `suspectRiderIds` so "a strike loses that order's ₹15" still holds when he delivers (a plain free re-attempt is already covered by the parking-gap hold); update the 4 tests that expect another rider (`scenarios.tier1.test.ts` scenario 3, `captain.test.ts` "another rider who delivers…", `review.fixes.test.ts` "another rider who delivers…"), the `CaptainQueue` button title and the landing `content.ts` line.
- Then: slide 4 "Pilot this first" callout removed (Gaurav); Gaurav removed the sizing note and the "+ preferred delivery slot" from P1 by hand.
- **Merged deck: `GPS_IIT Bombay_ROUND_2_v5.pptx` (project root) is now the working deck.** Base = v2 (all content fixes) + the teammate's v4 (`Downloads/GPS_IIT Bombay_ROUND_2_v4.pptx`, built from an earlier copy). From v4: whole slides 2, 10, 11 (better layout: takeaway lines on 2; RACI legend above the table and "3. Decision Rhythm" on 10; carriers "VS" panel on 11); her wording on 3 ("Meesho RTO is down 16%… yet on Valmo 17 of every 100 orders still fail"), 4 ("Why the Bonus… Not a Standalone Solution" bullets), 5 (bold lead-ins; "+₹15 Bonus Eligible"), 6 ("a Bonus rider also loses that order's ₹15"), 7 ("plus GPS doorstep pins for landmark-only addresses"), 8 ("At +5, Valmo loses ₹57 cr a year, so we test first"); her heading style ("1." instead of circles) on 3, 5, 6, 8. Kept from v2 on top of her slides: 15+ riders / 35+ buyers (confirmed by Gaurav), the brief-constraints line on 2, the contamination row and "Nothing here needs a new asset" on 10, black titles on 10/11. Not taken from v4: her slide 4 RTO-point estimates, captain ₹10 / "1 in 10", "≈ 9" break-even caption, "Strike 3 suspends the rider", A/B in month 2. v2 and v4 are untouched.
- v5 slide 8: **outside evidence** next to "Why +15": Fehr & Goette (AER 2007) randomized test, Zurich bike couriers, +25% commission for 4 weeks → ~30% more in total, yet effort per shift ~6% lower; "So we measure, not assume." Source added to the slide footer and `10-sources.md` (Precedents). Panel 1 text set to 10.5 pt and the break-even bullets to 12 pt so both fit. Backup: scratchpad `v5-before-evidence.pptx`.
