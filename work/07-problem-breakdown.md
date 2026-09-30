# RTO on Valmo — problem breakdown

Solution-neutral. Built from audited filings, the case data pack, secondary research and our own field notes.
Confidence marks: ✅ audited/primary · 🔵 derived by us · ⚠️ vendor-reported, unaudited · 🟡 our field data, n small · ❌ nobody knows

---

## LAYER 1 — The size

✅ **Meesho FY25:** 1,588mn shipped orders. CoD 76.95% of them.
✅ **CoD success 77.70% · Prepaid success 97.28%** (FY25, prospectus).
🔵 **CoD RTO ≈ 22.3% · Prepaid RTO ≈ 2.72% · Blended ≈ 17.8%** → **~283mn failed parcels/year system-wide.**
✅ **Valmo carried 763.51mn shipped orders FY25** (48.08%), rising to 64.52% by H1 FY26.
🔵 **≈136mn Valmo RTO parcels/year.**

**Unit economics** (case data pack):
- Successful delivery: **₹50** forward
- RTO: **₹50** forward (sunk) **+ ₹120** reverse = **₹170**
- Leg split: FM Hub 4 · FM Carting 2 · FMSC 5 · NLH 8 · LMSC 5 · RLH 5 · **LMDC 21**
- → **Last-mile delivery is 42% of forward cost.** The most expensive leg is the one where failure happens.

✅ Context: cost per placed order **₹47.03 (FY24) → ₹43.08 (FY25) → ₹38.38 (H1 FY26)**. Meesho is already driving cost down hard; RTO is the line that resists.

---

## LAYER 2 — Anatomy: where a parcel can fail

The chain, and what can go wrong at each node:

| # | Stage | Failure modes | Evidence |
|---|---|---|---|
| 1 | **Order formation** | No firm intent to accept · payment mode chosen · address captured badly (landmark-based, no street number) · unreachable phone entered | ✅ case; ❌ no sizing |
| 2 | **Network transit** | Wrong-hub routing · TAT stretch · handover loss | ✅ **4 handovers FY25, 4.5 in H1 FY26** per Valmo order — every handover is a failure surface, and an RTO retraces all of them |
| 3 | **Attempt** | Rider can't reach customer by phone · can't find address · attempt marked without being made · **discretionary effort withheld** | 🟡 field, n≈1–4 |
| 4 | **Doorstep decision** | Customer refuses · not present · no cash · didn't recognise order · someone else ordered it | ❌ no credible split exists |
| 5 | **Post-failure** | Parcel hauled the full distance back at ₹120; no local disposition option exists | ✅ case |

⚠️ **Correlates (vendor-reported, directionally consistent, not audited):**
- **TAT** — RTO 22% (1–2 days) → 27% (3–5) → **35% (>5 days)**. Time is the strongest single correlate after payment mode.
- **Distance/zone** — intra-city 20% → inter-state non-metro 27% → special zones 28%
- **Geography** — Vadodara 18% ... **Patna 35%**
- **AOV band** — <₹500 = 25% · **₹500–1,000 = 28% (worst)** · >₹1,000 = 24%

🔵 Note the chain effect: stage 2 failures (misrouting, handovers) feed stage 4 by stretching TAT, and TAT is itself a top correlate. **These are not independent causes.**

---

## LAYER 3 — 🔥 The central question

Strip it back and the whole case reduces to one number.

```
Prepaid RTO   2.7%   ← baseline failure: bad addresses, genuine
                        unavailability, network errors. Payment-mode-independent.
CoD RTO      22.3%
             ─────
GAP          19.6 percentage points  ← this is the entire prize
```

**Everything worth solving lives in that 19.6-point gap.** Four candidate explanations, and *nobody has decomposed it publicly*:

| | Hypothesis | Status |
|---|---|---|
| **H1** | **Customer behaviour** — COD makes refusal costless at the door | Universally assumed. ❌ never isolated |
| **H2** | **Selection** — people who choose COD differ (lower intent, less trust, first-time buyers) | Plausible, ❌ untested |
| **H3** | **Rider effort triage** — riders withhold discretionary effort from orders they expect to fail, making the expectation self-fulfilling | 🟡 n≈1–4, our own field data. Not in any published source |
| **H4** | **Order-quality correlation** — COD correlates with lower AOV, worse addresses, less-connected buyers; the payment mode is a proxy, not a cause | ⚠️ AOV-band data is directionally supportive |

**The distinction that matters:** H1 and H2 are *customer* properties. H3 and H4 are *system* properties. If any meaningful share of the gap is H3 or H4, then Meesho is partly generating the number it's trying to reduce — and that portion is addressable without touching the customer at all.

### The finding that reframes it

✅ **CoD success got WORSE in H1 FY26 — 78.05% → 75.85% — even as the CoD mix fell from 78.5% to 72%.**

Blended RTO **rose** despite a hard push to prepaid. Mix-shifting away from CoD did not fix CoD. Whatever drives the gap is not being touched by the lever the whole industry is pulling.

⚠️ Prepaid RTO also worsened (2.72% → 3.61%). Even the baseline is deteriorating.

---

## LAYER 4 — What the brief permits

✅ Verbatim: *"...bring this number down **without hurting delivery cost, rider earnings, or the speed and ease of ordering for customers.**"*

| Constraint | Reading |
|---|---|
| Delivery cost | Must not rise. Measured per order across the network (₹50 / ₹120). Net, not gross. |
| Rider earnings | A **floor**, not a ceiling. Reducing them is prohibited; raising them is not. |
| Speed & ease of ordering | **Rules out the entire customer-facing toolkit** |

**Explicitly off the table:** CoD gating for high-risk customers · convenience fees on high-RTO buyers · forcing prepaid · mandatory confirmation friction · extra address-verification steps at checkout.

🔵 **Consequence:** the constraint bars action on H1 and H2 — the customer hypotheses — almost entirely. Combined with Layer 3's finding that the mix-shift lever is exhausted, **the addressable surface is the system side: H3, H4, network execution, and post-failure handling.**

(Note: ✅ Meesho itself *does* gate CoD and levy convenience fees per its prospectus. The case forbids *you* from proposing it.)

---

## LAYER 5 — What's already deployed

Anything proposed must be positioned against what exists, or it reads as uninformed.

✅ **Meesho today:** TrustMesh (filters high-risk orders pre-dispatch) · "predictive routing models" credited with lower RTO (⚠️ one sentence in the Q1 FY27 letter, no mechanism disclosed — it means parcel paths and hub sequencing, not rider assignment) · prepaid nudges, Meesho Balance, Pay Before Delivery · CoD gating for repeat offenders · doorstep QC on returns · seller packing videos · **"Return and RTO Assurance Program"** — Meesho already *monetises* RTO risk as a seller-paid product.

⚠️ **Others:** Delhivery RTO Predictor (checkout-facing, "up to 20%", 4,800+ brands) · GoKwik checkout risk scoring · Shadowfax NDR automation · Delhivery AdFix geocoding · Delhivery QC-RVP doorstep grading (AJIO: returns resaleability 25% → 98%) · industry norm of 3 attempts before RTO.

❌ **No independently audited RTO-reduction result exists from any Indian vendor.** Every number above is self-reported.

---

## LAYER 6 — What nobody knows

These are the gaps. Each is either a research opportunity or a limitation to state openly.

| Unknown | Why it matters |
|---|---|
| ❌ **Any credible RTO cause split for India** | The only public one is an unsourced SEO blog. Slide 1's split has to be constructed — ours, from rider tallies against an audited total |
| ❌ **Decomposition of the 19.6pt CoD gap** | The central question of the case, unanswered by anyone |
| ❌ **Meesho's own RTO rate, stated as such** | Never published. Everything is derived from success rates |
| ❌ **Whether "attempted" means attempted** | Case names fake attempts; nobody has quantified them |
| ❌ **Who actually sets a rider's pay** | Hubs are run by small entrepreneurs who manage riders. Meesho pays the partner; the partner pays the rider. **Any incentive intervention has a pass-through problem** |
| ❌ **SKU concentration in Indian fashion e-commerce** | Governs whether any local-matching approach is viable. All circulating "80/20" figures are unsourced |
| ❌ **Intra-state vs inter-state order split** | Only Meesho's AWB data has it |
| ❌ **Hub dwell time before reverse dispatch** | Governs any hold-based option |

---

## LAYER 7 — Structural facts that bound any solution

- ✅ **Valmo is 100% asset-light** — no owned or leased infrastructure at first, mid or last mile. No warehouses, no dark stores, no fleet.
- ✅ **Vidit Aatrey on record:** warehousing *"tends to have lower return on investment"*, *"staying asset light makes sense"*; quick commerce de-prioritised — *"price matters more than speed."* Anything reading as "build infrastructure" contradicts stated doctrine.
- ✅ **Hubs are franchise operations run by small entrepreneurs**, 150–500 sq ft, who manage the riders. Riders are gig workers paid per successful delivery.
- ⚠️ **Node margins are razor thin** — Shadowfax nets ~15 paise per order, 2.86% EBITDA. Anything adding per-parcel cost breaks the node.
- ✅ **102,349 Valmo delivery agents, 18,098 active logistics providers** — a fragmented, multi-party network, not an employed workforce.
- 🟡 **Hubs are multi-platform** — our rider's hub serves Flipkart and Meesho both. Meesho competes for rider effort against other platforms' parcels in the same bag.
- ✅ **India is not one market** — the case says so, and the geography spread (18% to 35%) confirms it. A metro solution is not a village solution.

---

## LAYER 8 — Our own evidence

🟡 **n ≈ 1–4 riders, Mumbai metro, IIT catchment. Directional, not conclusive. State n on the slide.**

Reported behaviour (strong — describes what he does):
- Paid **per successful delivery**, not per attempt
- **Motivated to re-attempt** — he re-attempts specifically to earn more. Not a lazy-rider story
- Process: attends the address, **calls 2–3 times, leaves if unanswered**
- Chases a wrong address if it's within reach
- **Puts extra effort into prepaid orders only.** CoD has taught him the customer is probably cancelling
- No extra pay for extra effort; no targets at his hub

Stated preference (weak — hypothetical, discount it):
- Says target-based incentives would be good. Everyone says this. Not evidence.

⚠️ **Open contradictions to resolve:** Valmo's Partner app advertises target-based incentives; he reports none. And his hub is multi-platform — so **he may not be a Valmo pilot at all**, but a local partner's rider whose pay the partner sets.

🔵 **Sampling limits, name them yourself:** metro catchment when Meesho's base is T2/T3 · IIT area is students and hostels, atypically dense and phone-literate · his CoD scepticism may be formed partly on Flipkart orders · riders willing to stop and talk are the least busy ones.

---

## THE PROBLEM IN ONE PARAGRAPH

Roughly one in six Valmo parcels never reaches its buyer, each costing ₹170 against ₹50 for a successful delivery — around 136mn parcels a year. Almost the entire gap is CoD: 22.3% against 2.7% prepaid. The industry's answer has been to shift buyers to prepaid, but Meesho's own filings show CoD success *deteriorating* even as the CoD mix falls, so that lever is not reaching the cause. Nobody has decomposed the 19.6-point gap into what the customer does versus what the system does to itself — and the brief forbids touching the customer side at all. Which makes the unanswered question the only question: **how much of the CoD gap does the delivery system manufacture, and what happens if you stop?**
