# Decisions — DICE 3.0 (grilling session, 2026-09-08)

## SETTLED

| Decision | Answer |
|---|---|
| **Case** | **Valmo — RTO reduction.** Locked through R2 (no switching). |
| Risk posture | **Spiky idea, safe case.** Variance goes in the angle, not the bet. |
| Objective | Reach the Grand Finale (FTE/PPI >> ₹1L cash), with one differentiating spike. |
| Team | 3 people. Deck covered by a teammate. **Fieldwork and build are both solely on Gaurav.** |
| R1 fieldwork | 4–6 hrs, **split across all three groups** (riders / hub operators / COD shoppers) — R1 asks for a *map* of causes, and "Coverage" is a named criterion. |
| Allocation refinement | Field hours → **riders + hub operators** (cannot be surveyed). COD shoppers → **survey** (scales for free). |
| Survey | Yes — **metro + hometown push**, ~100 responses, gives a geographic split and patches the T2/T3 representativeness hole. |
| Order & observe | **Order normally, observe closely.** No manufactured failures — riders are paid per successful delivery and a staged refusal costs a real person money. |
| Eligibility | Confirmed clear — registered, team locked, same college, all 2027. |

## OPEN — deferred deliberately

**The spike.** Three candidates, deliberately not chosen tonight. This is an *ungrillable* question: it needs field data, not more reasoning.

1. **Rider incentive redesign** — dynamic per-delivery pay priced by difficulty. Genuine white space (zero published Indian work), named in the case, works as a 30-day pilot.
2. **Local resale at the last-mile DC** — engineered around the GST place-of-supply constraint. Highest ceiling; but mandatory for every Valmo team anyway, not a 30-day win, and carries the illegal-resale fraud objection.
3. **Predict when the customer is home** (not whether they refuse) — peer-reviewed basis, differentiated from commodity checkout scoring.

⏰ **Time-critical consequence:** the spike can wait; the interview script cannot. **Wednesday's questions must be designed to discriminate between all three** — otherwise the field data won't decide it and we'll be guessing on Thursday night.

## KILLED

- ❌ **RTO risk model at checkout** as the prototype — commodity. Delhivery RTO Predictor, GoKwik, Shadowfax all sell it, and Meesho already runs TrustMesh + predictive routing. Would be showing Meesho their own system.
- ❌ **Pickup points / self-pickup** as the RTO answer — the S1 Business national winner already proposed this and Meesho owns that IP in perpetuity.
- ❌ Seller Growth (no manufacturer access), Monetization (highest variance, ruled out by risk posture), Content Commerce (creator DM latency).

### ❌ Pricing — KILLED by research (2026-09-09), on two independent grounds
1. **Meesho already ships a Price Recommendation Tool.** Live in the Supplier Panel since 2022; elasticity-based (views/orders vs price change), competitor comparison across Meesho and other platforms, returns an updating recommended range. **~125,000 sellers/month were using it as of July 2022.** Amazon ships Automate Pricing; Flipkart ships an ML recommender in Seller Hub. Pitching a price recommender = reinventing a shipped feature to the people who shipped it.
2. **The prototype cannot be built.** Meesho's official public dataset (Kaggle Visual Taxonomy challenge) is images + attributes only — no pricing, no sales, no order outcomes. Third-party scrapes have no conversion/return data. You could build a price-comparison UI, not a real elasticity model. **This removes the entire reason Pricing was attractive.**

Surviving wedge, for the record: cold-start pricing (Meesho's tool needs history — what happens on listing #1?) + an original mispricing→RTO analysis, which nobody has published. Real but thin, and still unbuildable on public data.

### ❌ UG — confirmed weak (2026-09-09)
- **No public number on Meesho's gender split exists anywhere** — not in prospectus coverage, not Redseer, not Bain. All sizing invented from scratch.
- ⚠️ **A likely-hallucinated stat is circulating**: "Meesho is now ~55% female / 45% male after diversifying into electronics." Traces to no real article; contradicts the one actual datapoint (Similarweb: 59% male *web* traffic — weak proxy, Meesho is app-dominant). **Never put this in a deck.**
- Meesho has men's categories in the catalog but **no named male-acquisition strategy** — so the case premise holds; the case just isn't winnable for us.
- Two non-obvious angles worth remembering: **Zivame deliberately did NOT expand to men** (deepened within-gender instead; activewear+sleepwear now ~30% of sales), and **Rent the Runway partnered rather than built** for menswear, reasoning that men's purchase/repeat patterns are structurally different. Both argue against the "launch Meesho Man" answer every other team will give.

## THE OPENING SLIDE (best fact available)
Meesho's prospectus: **CoD success got *worse* in H1 FY26 (78.05% → 75.85%) even as CoD mix fell 78.5% → 72%.** Blended RTO *rose* despite the prepaid shift. The payment-mix lever — what every other team will propose — is visibly running out of road.

## NEXT
1. Build the Wednesday interview script (must discriminate between the three spikes) + the survey form.
2. Fieldwork Wednesday.
3. Pick the spike Wednesday night from what the field says.
4. Build 3 slides Thursday. Submit Friday, well before 11:59 PM IST.

**Deadline: Sep 11, 11:59 PM IST.**
