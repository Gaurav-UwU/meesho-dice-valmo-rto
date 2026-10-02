# deck.md: the final deck plan (Team GPS · Valmo RTO · 2 Oct 2026)

**This is the only file needed to build the deck.** It replaces `28` and `29` (both kept as history). Look and feel: our existing template (DICE header, meesho logo, ➢ bullets, numbered panels). Sources for every footer: `10-sources.md`.

**Three rules for the whole deck**
1. **It is one story.** Each headline leads into the next; each slide ends with a one-line bridge.
2. **No mention of "rounds"** anywhere on the slides. Our earlier work is simply "our research", "our survey", "our field visits". (The idea, numbers and framework stay exactly as we first submitted them; see "For us only" at the end.)
3. **The prototype is the proof on every slide.** From slide 4 on, each slide has a small **"Live in our prototype"** box: one screenshot, the screen's name, and what it proves. The judge can open any of it from the QR on slide 1.

**Format:** cover + 10 slides (the brief allows 6–10; the cover is not counted). About 350–400 words a slide. Each slide: a full-sentence headline, a one-line message, three numbered panels, one chart or diagram, a pink "so what" callout, a grey sources footer.

**Words and claims we never use:** "proven" (say "built and tested in our prototype" or "in simulation") · "X% of risky orders delivered" (say what the bonus *caused* against riders without it) · "15% of failed deliveries are fake" (unsourced) · stats jargon on the slide face (MDE, t-value, clustered, Brier) · real phone numbers, OTPs or AWB numbers anywhere · any shared-day QR (it carries the live key; use the Demo page QR only).

---

## The story in five sentences
1. **Meesho knows which orders will be hard, but that knowledge stops at the warehouse**: the rider at the door is paid the same for an easy stop and a hard one, so hard stops get the least effort and fail.
2. **We went to riders, hubs and buyers, in metros and Tier 3/4 towns, and found failures come in three kinds**: *not ready* (the parcel came early and the cash wasn't there), *not wanting* (a better deal elsewhere), *not reached* (a faked attempt, a landmark address, the wrong hub).
3. **Each kind gets its own fix**: pay the rider for the hard delivery and warn the customer before an early arrival; check that every failed attempt was real; find each refused parcel its cheapest way back.
4. **Nothing scales on hope**: a fair 30-day test with pairs of equally good riders, and a rule fixed before it starts, decides GO, RE-PRICE or KILL; if the bonus fails, the other fixes still stand.
5. **Long term, the risk score becomes a price**, and every delivery teaches Meesho where the real doorstep is.

## Headline test (read only these, in order: they must make one argument)
1. Pay for the hard stop, check it was real, recover what still fails: 3 more of every 100 orders delivered
2. Meesho has cut RTO, but COD still fails 8 times more often, and two-thirds of it fails at the door
3. Most failures are "not ready" or "not reached", not "not wanting", and each needs a different fix
4. Five fixes, scored: rescue at the door first, because it needs no new system
5. At the door: pay for the hard delivery, warn before an early arrival, and check every failed attempt was real
6. One avoided return pays for eight bonuses, and a fair 30-day test decides if it works
7. The doors we still lose: send each refused parcel to its cheapest legal recovery, not ₹120 back
8. Every phase ends with a number that decides the next, and a fallback if the bonus fails
9. We thought like the people who will game it, and built a guard for each move
10. Today the risk score is a filter. Tomorrow it's a price

## One order runs through the deck
Our own Meesho COD test order: **promised 3 Oct → arrived 28 Sep, five days early, no warning → a one-way "Arriving Today" message → the rider called twice and didn't wait → "Failed Delivery"**. It appears on slide 3 (redrawn, no phone numbers or AWB). Slides 5–8 each end with one italic line on what would have happened to *that* order.

---

## Slide 0: Cover
"REDUCING RTO: GETTING MORE ORDERS DELIVERED · Business Track · Team GPS, IIT Bombay". Same cover as before.

---

## Slide 1: Executive summary (ask ①)
**Headline:** Pay for the hard stop, check it was real, recover what still fails: 3 more of every 100 orders delivered
**Message:** Valmo pays the same for every stop, so hard stops fail. We found three kinds of failure, give each its own fix on systems Valmo already runs, and test before we scale.

**① The problem** (four big-number tiles + a mini bar)
- **17%** of Valmo orders never arrive · **₹170 vs ₹50** per failed vs delivered order · **96%** of failures are cash on delivery · **2 in 3** fail at the door
- Mini bar: RTO by distance from the hub: 15% / 17% / 22%

**② What we found** (➢ bullets)
- ➢ Two-sided friction: refusing COD costs the customer nothing; the rider is paid flat and only on success.
- ➢ Failures come in three kinds: **not ready** (the parcel came early, no cash), **not wanting** (cheaper elsewhere), **not reached** (a faked attempt, a landmark address, the wrong hub).
- ➢ Hubs earn ₹5 per delivered parcel; riders want a per-order bonus; Valmo's own rider contract already has an "Additional Incentive" payout line.
- Evidence: 12 rider interviews · COD buyer survey (25+) · field visits in metro and Tier 3/4 towns **[n]** · real test orders · Valmo's rider contract · Meesho's filings.

**③ What we recommend** (stacked cards: Now / Next / Long-term)
- **Now: Rescue Bonus.** ₹15 to the rider when a top-20% risky order is delivered: **−3 RTO points, ₹62–184 cr a year**, if a 30-day fair test confirms it.
- **Now, alongside: Attempt Check + early-arrival heads-up.** A hub captain reviews suspicious "attempted" marks; customers are warned before a parcel arrives early ("pay by UPI, or keep my promised date").
- **Next: Refused-Parcel Router** (₹50–140 cr a year, up to ₹270 cr) and **learned doorsteps** in one small-town hub.
- **Long-term: pay by difficulty.**
- Under the cards: *"If the bonus fails, the Attempt Check and the Router still stand: neither needs it."*

**Callout band:** the brief's three tests as a scorecard: delivery cost ↓ · rider earnings ↑ · ordering speed and ease unchanged. **QR to the prototype** (Demo landing page) + https://valmo-rescue-console.vercel.app + *"Every fix in this deck is built and tested in our prototype: try it in six minutes, no sign-in."*
**Footer:** case data pack · Meesho RHP, Q1 FY27 letter · Valmo Delivery Services Agreement · our field research.
**Bridge:** *"Here is where the failures happen."*

---

## Slide 2: Where RTO happens (ask ②)
**Headline:** Meesho has cut RTO, but COD still fails 8 times more often, and two-thirds of it fails at the door
**Message:** The easy lever (more prepaid) is spent; what's left is COD, and most of it fails at a door a rider can still save.

**① The trend: progress, then a wall** (bar chart)
- RTO 21.2% → 18.6% → 17.8% (FY23–25): a 16% fall, about three-quarters of it from more prepaid.
- But COD's success rate slipped 78.6% → 77.7% even as COD's share fell from 88.7% to 77%: **the prepaid lever is spent.**
- Valmo grew from 1.8% of Meesho's shipments (FY23) to 48% (FY25) and 65% (H1 FY26): this is Valmo's problem now.

**② Where on the journey it breaks** (the cause pie: our blend of rider and buyer research, the industry failed-delivery mix and the data pack)
- Refused at the door **36** · customer not home **18** · unclear address **13** · phone unreachable **12** · far / wrong hub **9** · no real attempt **9** · other **3**
- **Two-thirds (66%) fail at the door**, where effort can still save them; 22% fail before it (address, hub); 9% were never really attempted.
- Journey strip under the pie: order placed → sorted → hub → **door** → refused → ₹120 trip back. The door is where most of it is lost.

**③ Who fails most** (two small charts)
- COD fails at **22.3%** vs prepaid **2.7%** (8×); COD is **96%** of failures while 77% of shipments.
- India is not one market: **18%** in Vadodara vs **35%** in Patna; RTO rises from 22% to 35% as delivery time goes from 1–2 to 5+ days; distance from the hub 15% → 22%.

**Callout:** *"1 RTO point on Valmo ≈ 7.6 mn parcels ≈ ₹92 cr a year of return cost."*
**Footer:** Meesho RHP (Nov 2025) rates derived by us · Q1 FY27 letter · case data pack · Shipway 2025.
**Bridge:** *"Why does a parcel fail at a door someone could have opened?"*

---

## Slide 3: Why it happens (ask ②)
**Headline:** Most failures are "not ready" or "not reached", not "not wanting", and each needs a different fix
**Message:** Both sides of the door have reasons to let a delivery fail; our research sorts every reason into three kinds.

**① Three kinds of failure** (the pie regrouped into three coloured blocks)
| Kind | What it looks like | Share of RTOs | The fix (next slides) |
|---|---|---|---|
| **Not ready**: wants it, wrong moment | Parcel came before the promised date, no cash ready · not home · phone unreachable, often because nobody warned them | not home 18 + unreachable 12 + the "no cash" part of refused 36 | Pay the rider to wait, call again and offer UPI · a heads-up before an early arrival · a second chance |
| **Not wanting**: changed mind | Found it cheaper on another app · changed mind in transit · ordered to look first | the rest of refused 36 | Don't pay to try: re-home the parcel to a nearby buyer, or return it cheaply |
| **Not reached**: the system failed first | One or two calls and leave, or "unavailable" logged without a knock · a landmark address · the wrong hub | 9 + 13 + 9 = 31 | Check the attempt was real · learn the real doorstep |
- **Refusal split chart** under the table: **real survey numbers** (our buyer survey asked "why did you refuse?", including "I did not have cash at that moment": count the responses sheet), shown with their n. **If they aren't in by submission, label the chart "Illustrative; the pilot measures it"** and use the layout placeholder (not ready ≈ 46%, not wanting ≈ 49%, other 5). Never present the placeholder as survey data.

**② Two-sided friction** (loop diagram + two quotes)
- Customer: *"We order on COD and keep watching prices on other apps. If it drops somewhere else we take that one, since nothing is paid."* (buyer survey)
- Rider: *"For prepaid we call three or four times and wait. For COD we call once or twice; if no one answers we move on."* (rider interviews)
- Loop: expected to fail → less effort → fails → expectation confirmed.
- New from the field: **parcels arrive early and the cash isn't there** (Tier 3/4); **addresses are landmarks**, not house numbers; **riders want a per-order bonus**.

**③ Our real order** (redrawn timeline): promised 3 Oct → arrived 28 Sep, no warning → one-way "Arriving Today" → **the rider called twice and didn't wait** → "Failed Delivery". *Not ready, then not reached, in one parcel.*

**Methods strip (footer):** 12 rider interviews (Mumbai hubs) · COD buyer survey, Hindi/English (25+) · field visits, metro + Tier 3/4 **[n]** · real test orders on Meesho and Flipkart · Valmo Delivery Services Agreement · Meesho filings · case data pack. Italic: *"What nobody knows yet: whether riders cause COD failure or correctly predict it. Our test measures it."*
**Bridge:** *"Three kinds of failure. Which fix first?"*

---

## Slide 4: What to fix first (ask ③)
**Headline:** Five fixes, scored: rescue at the door first, because it needs no new system
**Message:** Prevent · Rescue · Recover, each fix matched to a kind of failure, sized with the working shown, and ordered by impact against effort.

**① The map** (impact × effort; Prevent ▲, Rescue ●, Recover ■)
- **Pursue now:** Rescue Bonus · Attempt Check · early-arrival heads-up (all run on what Valmo already has)
- **Assess:** learned doorsteps (needs a hub trial) · Refused-Parcel Router (needs legal and custody controls)
- Struck through, "the brief rules it out": forcing prepaid, COD limits, convenience fees, extra checkout steps

**② Scored table** (the main element)
| Fix | Kind it fixes | Assumed effect | RTO pts | ₹ cr / yr | Effort | When |
|---|---|---|---|---|---|---|
| **Rescue Bonus** (Rescue) | Not ready, riskiest 20% | +15 deliveries per 100 flagged | −3.0 | 62 (conservative) – 184 (case) net | Low: payout line exists | Now |
| **Attempt Check** (Rescue) | Not reached: no real attempt 9% | measured in the baseline; a ₹10 review pays above ~1 in 10 recoveries | up to −1.5 (not claimed) | not claimed | Low | Now, all hubs, with or without the bonus |
| **Heads-up + two-way WhatsApp** (Prevent) | Not ready: not home 18 + unreachable 12 | fixes ⅕ | −1.0 | ~95 gross | Low: Valmo already sends WhatsApp | Now (heads-up), day 31+ (two-way) |
| **Learned doorsteps** (Prevent) | Not reached: address 13 + wrong hub 9 | fixes ¼ | −0.9 | ~80 gross | Med: builds on GeoIndia | Day 31+, one hub |
| **Refused-Parcel Router** (Recover) | Not wanting: refused parcels | 2.5–13.5% re-homed + cheaper returns | 0 (recovers cost) | 50–270 | Med | Day 30+ |

**③ Already running, so not counted** (one line each): prepaid nudges (~37% prepaid) · TrustMesh risk filtering (166 mn listings, RTO down >10%) · predictive routing · address geocoding (GeoIndia) · hub pickup options · better customer messaging.

**Live in our prototype:** the Ops console after Autopilot: the map with the purple Bonus-Eligible orders and the money tiles. *Proves:* the score, the flag and the money all run together today.
**Callout:** *"Effects are planning assumptions our test replaces. The fixes overlap the same orders, so don't add them up."*
**Footer:** Q1 FY27 and Q4 FY26 letters · Valmo Delivery Services Agreement · Tata Comms × Shiprocket (vendor-reported) · our sizing.
**Bridge:** *"Start at the door."*

---

## Slide 5: At the door (ask ③)
**Headline:** At the door: pay for the hard delivery, warn before an early arrival, and check every failed attempt was real
**Message:** Three small changes on systems Valmo already runs: the same app, the same payout line, the same WhatsApp; only the trigger changes.
**Why the rider (one line across the top):** *"The brief rules out customer-side levers, and the rider is the only person who meets the customer. ₹15 nearly doubles the ₹18 pay on that order and buys cheap effort (another call, a ten-minute wait, offering UPI, coming back at a set time), not a second trip."*

**① Pay for the hard delivery: the Rescue Bonus** (flow chevrons)
- **Score:** the risk score Meesho already has + last-mile signals (COD, distance, new or unclear address, slow delivery, the ₹500–1,000 order band, phone reachability, past failures), weights visible.
- **Flag:** the riskiest 20% (capped). In our simulation the riskiest 20% catch about 46% of failures (random picking: 20%); measured on Valmo's last 90 days before the test.
- **Show:** the rider app shows "Bonus Eligible · +₹15", never the score.
- **Pay:** ₹15 on Valmo's existing "Additional Incentive" line, straight to the rider's bank, **on any attempt**, held 7 days (taken back if the order comes back). Not through the hub (it earns ₹5 a parcel).
- Is it new? We found no one paying per order on the *delivery* of risk-flagged orders: Meituan and Uber Eats pay at order acceptance; Ekart and Valmo pay a first-attempt incentive on all orders.

**② Warn before an early arrival: the heads-up**
- One WhatsApp when a COD parcel will arrive before its promised date: **"Arriving early, today: pay by UPI, or keep my promised date."** "Keep my date" is the default.
- For low-confidence addresses: one tap, "Share your location so your parcel finds you" (after ordering, never at checkout).

**③ Check the attempt was real: the Attempt Check**
- A failed attempt with weak evidence (GPS far from the door, no calls, no wait, or the customer says "the rider never came") goes to the **hub captain**, who earns only on delivery and so wants real attempts.
- The captain confirms, orders a free re-attempt by another rider, or gives a strike (with a reason and supporting evidence, never the customer's word alone). Strikes: 1 warning → 2 bonus blocked + every failure reviewed for 14 days → 3 to the hub manager; they expire in 30 days and Ops can overturn one within 48 h.
- **Works with the bonus off**, for every rider, from day 0.

**Live in our prototype** (three small screenshots): the rider app's **"₹ +15 Bonus Eligible"** chip · the **customer phone** with the WhatsApp message · the **hub captain** queue with an evidence card. *Proves:* the whole door flow runs end to end.
**Callout:** *"Same app, same payout rail, same WhatsApp. Only the trigger changes."*
**Footer:** Valmo Delivery Services Agreement (§3, Annex A) · Meituan (arXiv 2202.10695) · Uber fare guide · Flipkart WhatsApp flow (our orders) · our field research.
**Bridge (our order):** *"A heads-up would have said 'arriving early: pay by UPI or keep 3 Oct'; the rider would have seen +₹15; 'called twice, didn't wait' would have gone to the captain. But does ₹15 change what riders do, and does it pay?"*
*Density: the fullest slide. One line per bullet; if it overflows, cut "Is it new?" to its first sentence.*

---

## Slide 6: Will it pay, and how would we know? (asks ③ ⑤)
**Headline:** One avoided return pays for eight bonuses, and a fair 30-day test decides if it works
**Message:** The bar to pay off is low, the upside is large, and a simple test with pairs of equally good riders gives a clear answer.
**Why a test, not a claim (one line):** *"No Indian company's RTO-reduction claim is independently audited, and RTO swings with the season (online-brand RTO ~39% in November vs ~21% in February), more than our whole effect. So we compare riders over the same weeks, never this year with last."*

**① The economics, per 100 flagged orders** (line chart: net ₹ against extra deliveries, break-even marked)
- Without the bonus, **60 of 100** flagged orders arrive anyway (our assumption; the test measures it).
- Cost = ₹15 × every flagged delivery (including the 60). Saving = ₹120 × each extra delivery.
- **Break-even: about 9 extra deliveries per 100 (8.6)**: one avoided return pays for eight bonuses. With an extra ₹18–21 per rescue (a fee or a second attempt): 10.3–10.7.
- Mini table: 69 delivered → +₹45 · 75 → +₹675 · 80 → +₹1,200 (per 100 flagged).

**② What it's worth a year** (heat-map, ₹ cr, 153 mn flagged orders a year)
| Bonus \ extra per 100 | +5 | +10 | +15 | +20 |
|---|---|---|---|---|
| ₹10 | −8 | 76 | 161 | 245 |
| ₹15 | −57 | 23 | 103 | 184 |
| ₹20 | −107 | −31 | 46 | 122 |
- *"At +15, Valmo gains about ₹103 cr a year; at +5 it loses ₹57 cr. That is why we test before we scale."* Cost per successful delivery: **₹84.8 → ₹77.7**.
- *"A tighter cut (top 10%) is cheaper per order and easier to prove, but the prize is half, so we start at 20%."*

**③ A fair test in five steps** (numbered strip)
1. **Fair pairs:** 4 hubs (2 metro, 2 small-town); in each, pair riders who delivered equally well last month; a coin decides who gets ₹15 → **24 pairs**.
2. **Same parcels:** both riders carry the same mix of risky parcels; bags assigned by the system.
3. **30 days**, ~100 flagged orders a hub a day (**~12,000**), after an **8-week baseline**; the Attempt Check runs for everyone from the baseline.
4. **Simple maths:** each pair's difference; the average is the effect; the range is how sure we are. It can reliably see an effect of about **4 per 100**.
5. **The rule, fixed before day 1:** **GO** if even the low end of the range clears break-even and two safety rules hold (normal orders no more than 1 point below; Bonus riders' suspected fake attempts no more than 2 points above the others) · **RE-PRICE** if it helps but doesn't pay → Pilot 2 with one change (top 10% or a smaller bonus) · **KILL** under +3 or if a safety rule breaks · returns and complaints watched; a rise stops the payout for review. Changing the rule afterwards makes the result invalid.
- Simulated example: *"If the bonus truly adds +15 per 100, this test says GO about 97 times in 100; at +12 about 6 in 10; at +10 or less it usually says RE-PRICE."* Small type: *"Real riders vary more than our simulation, so the real test will be noisier."*

**Live in our prototype:** the **pilot page** with the verdict, the range against break-even and the ✔ Fair comparison line. *Proves:* the decision rule is real code; the judge can move the sliders.
**Callout:** *"₹120 to haul a parcel back; ₹15 to make the hard stop worth it."*
**Footer:** case data pack · Meesho RHP · Swiggy/Zomato rain pay · Butschek et al., *Labour Economics* 2022 · Unicommerce D2C Report 2026.
**Bridge (our order):** *"Across 12,000 orders like ours, the test shows whether ₹15 makes riders wait and knock. Even then, some customers will still say no. What happens to those parcels?"*

---

## Slide 7: Recover what still fails (ask ④)
**Headline:** The doors we still lose: send each refused parcel to its cheapest legal recovery, not ₹120 back
**Message:** A per-parcel router at the hub with three lanes, each checked against the law, and savings counted only when a parcel is actually delivered.

**① Why it matters:** a return costs **₹120, 45% of the ₹265 average order**; about **130 mn** parcels a year travel back; the default everywhere is to send it back. We found no marketplace that re-homes refused parcels from the last-mile hub. The pieces exist in India (Ecom Express runs dark stores at delivery centres; Delhivery's doorstep checks lifted AJIO's resaleable returns from 25% to 98%); nobody has joined them at the refused parcel. The idea itself is old (Amazon's 2012 patent): we push it to the hub, where COD economics make it pay.

**② Three lanes** (decision diagram; each lane chosen by expected value: chance × saving − cost)
1. **Second chance, for "not ready"** (24 h on WhatsApp): deliver again · a different time · **pay now by UPI** · pick up at the hub (48 h, with a code; saves about ₹112). "Different time" and "pay by UPI" answer exactly the early-arrival, no-cash refusal.
2. **Hold & re-home, for "not wanting"**: inspected first (unopened, seal intact, photo); seller, hub and new buyer in the **same state**; the seller has opted in; only the **same seller's same listing** goes to a nearby buyer; held only where even the low end of the demand forecast clears break-even.
3. **Batched return**: everything else, grouped by seller (reported 20–40% cheaper).

**③ The numbers and the law**
- Holding 48 h costs ~₹8; a match saves ₹145 → **break-even 5.5% match rate**. We don't claim a match rate. Worth ₹50 / 140 / 270 cr a year at 2.5 / 7 / 13.5%.
- *"Everyone worries about e-way bills; they only apply above ₹50,000. The real limit is GST place of supply, and a carrier may not sell goods. So: same state only, seller opt-in, the seller stays the seller."* Start with small non-GST sellers in Uttar Pradesh (15.9% of sellers).
- **The hub wants it:** a re-homed parcel is a delivered parcel, so the hub earns its ₹5 again.

**Live in our prototype** (two screenshots): the **Refused-Parcel Desk** card (inspection, forecast range against the 5.5% line, the expected value of each lane) · the **customer phone** with the four second-chance options. *Proves:* each parcel's decision is computed and logged; savings are booked only on real outcomes.
**Callout:** *"Our test first measures how long refused parcels sit at the hub, how many refusals are 'not ready', and the match rate."* Small type: *"The demand history is synthetic; it shows the mechanism. Kill the hold lane under a 3% match rate or on any custody incident."*
**Footer:** GST s.2(85), IGST s.10(1)(a), Notif. 34/2023 · FDI Press Note 2 (2018) · Consumer Protection (E-Commerce) Rules 2020 · DPDP Act 2023 · Carriage by Road Act s.15 · Amazon US 8,615,473 · Ecom Express DRHP · Delhivery (AJIO) · Meesho RHP.
**Bridge (our order):** *"If our customer still said no: a WhatsApp second chance, then a nearby buyer, then a batched return. Never an automatic ₹120 trip. Here is how it rolls out."*

---

## Slide 8: The 30-60-90 day plan (ask ⑤)
**Headline:** Every phase ends with a number that decides the next, and a fallback if the bonus fails
**Message:** Three months, five work streams, a success number and a stop rule for each phase.

**Top right: the decision fork after day 30** (diagram): the test says **GO** → a price test across one region (~40 hubs at ₹0 / ₹10 / ₹15, top 10% vs 20%) → scale · **RE-PRICE** → Pilot 2 with one change · **KILL** → stop the bonus. **The Attempt Check and the Router sit under all three branches**: they never depended on the bonus.

| | Days 0–30: test | Days 31–60: act on the answer | Days 61–90: decide on scale |
|---|---|---|---|
| **Risk score** | Before day 0: accuracy on Valmo's last 90 days | Add "hard to deliver" signals; re-weight | Learn which orders the bonus saves |
| **Rescue Bonus** | 4 hubs, 24 rider pairs, top 20%, rule fixed | GO: region price test · RE-PRICE: Pilot 2 | Scale decision; first difficulty-priced tiers |
| **Attempt Check** | Day 0, every pilot hub, every rider | Tune the evidence rules and the strike ladder | Roll out with the bonus, or alone if it's killed |
| **Refused-Parcel Router** | 3 hubs in UP: measure dwell time and refusal kinds; second chance live | Hold & re-home by hand with 30–50 opted-in sellers; batched returns | Automate matching if the match rate ≥ 5.5% |
| **Heads-up + doorsteps** | Early-arrival heads-up in pilot hubs | Two-way WhatsApp; **learned doorsteps in one small-town hub** (store the doorstep from every OTP-verified delivery; one-tap location for unclear addresses) | Roll out what worked, region by region |
| **Success if** | Low end of the effect ≥ break-even; both safety rules hold | Cost per rescued order ≤ ₹120; match rate vs 5.5%; reviews recover enough deliveries to pay | Valmo's RTO and cost per successful delivery beat the baseline |
| **Stop if** | Effect < +3, a safety rule breaks, or the heads-up raises cancellations | Match rate < 3%; any custody incident; more than 1 in 3 strikes overturned | Net ₹ negative for 2 months |
- One number to watch: **cost per successful delivery** → RTO % → extra deliveries per 100 / match rate / recovered deliveries.
- Owners: last-mile ops (bonus, hub captains) · reverse ops (Router) · data science (score, doorsteps) · customer messaging (heads-up).
- *"Nothing here needs new infrastructure: day 0 runs on tools we have already built and tested."*

**Live in our prototype:** the **Ops "Close pilot"** card (Bonus vs Control verdict + the money ledger: owed, released, taken back, blocked) and the **18 green audit checks**. *Proves:* day 30's decision and every rupee are already computed and checked.
**Callout:** *"Pilot 1 answers 'does ₹15 work?'; the region test answers 'at what price, for which orders?'"*
**Bridge (our order):** *"A captain's ruling on our rider's attempt is one of the numbers that decides day 31. But a plan this specific has specific ways to break."*

---

## Slide 9: Risks and second-order effects (ask ⑥)
**Headline:** We thought like the people who will game it, and built a guard for each move
**Message:** Riders, hubs, customers and sellers will all try to work around it; each move has a guard, most of them already in Valmo's process or in our prototype.

**① Who works around it, and the guard** (four-quadrant)
| If someone… | The guard |
|---|---|
| **Rider** chases bonus orders, neglects normal ones | Safety rule: normal-order deliveries no more than 1 point below; a rider whose normal deliveries drop gets bonuses held |
| **Rider** logs a fake "attempted" | Evidence at the door + the customer's "did the rider reach you?" + the hub captain; strikes need a reason and evidence |
| **Rider** fakes today, delivers it himself tomorrow for the bonus | The ₹15 waits in the 7-day hold for the captain when that rider's earlier attempt was weak (released by default) |
| **Rider** fakes a delivery or pressures a buyer | OTP or same-day cash; 7-day hold, taken back on a return; returns and complaints watched |
| **Rider** farms the bonus / learns which areas are flagged | ₹300 a day cap; the score is never shown; checked by pin code |
| **Hub captain** protects friends or over-strikes | Ops overturns within 48 h; sample audits; a captain scorecard |
| **Customer** gets nudged to cancel by the heads-up | "Keep my promised date" is the default; cancels measured against a hub without it |
| **Seller / hub** mishandles held parcels (Surat 2026: 33,035 Meesho parcels falsely marked delivered) | Inspection, scan in and out, old ↔ new order link, OTP to the new buyer, 48 h limit, daily shelf count |

**② What could go wrong with the plan** (risk matrix, likelihood × impact, top 8 plotted)
| Risk | Guard |
|---|---|
| The bonus doesn't pay | RE-PRICE → Pilot 2; the Attempt Check and the Router continue |
| Riders correctly *predict* COD failure rather than cause it | Exactly what the test measures; a KILL is a cheap 30-day answer to the biggest open question |
| The season or a trend distorts the result | Same-weeks comparison, never before/after |
| Riders' interest is stated, not shown | We measure deliveries, not what riders say; 2 of 4 hubs are small-town |
| Cross-state GST exposure | Same state only; small non-GST sellers first |
| A stored doorstep is personal data or wrong | Consent and delivery-only use (DPDP Act); delete option; learn only from OTP-verified deliveries, averaged |
| Volume shifts to other carriers (~50% in Q1 FY27) | Carrier-neutral design (slide 10) |
| The real test is noisier than our simulation | Decide on the low end of the range; the smallest effect we can see is stated up front |
- "Also guarded" line: unfair pairs (coin + matched riders) · moving the goalposts (rule fixed, else invalid) · score drift (20% cap, monthly check) · thin listings (hold on the low end only) · pickup no-shows (48 h) · foreign-investment rules (seller opt-in) · WhatsApp fatigue (cap 4 messages per order).

**Live in our prototype:** the **rider's strike meter** (in Hindi too) and the captain's **scorecard**. *Proves:* the guards are working rules, not promises.
**Callout:** *"Every guard is either already in Valmo's process (OTP, cash reconciliation, the verification call) or built and tested in our prototype."*
**Footer:** Surat (deshgujarat.com, Apr 2026) · Valmo Delivery Services Agreement · DPDP Act 2023 · Meesho Q1 FY27 letter.
**Bridge:** *"Guarded and tested, the bonus is only the first step."*

---

## Slide 10: The 10x (criterion: 10x and long-term thinking)
**Headline:** Today the risk score is a filter. Tomorrow it's a price
**Message:** The ₹15 is the first price on a hard stop; the network learns to price every stop, and to know every door.

**① Three horizons** (staircase)
- **Now:** one ₹15 bonus on the riskiest 20%, tested against riders without it.
- **6–12 months:** a price per parcel by difficulty: risk × distance × address × **time slot** (timing matters: the early-arrival finding; predicting *when* a customer is home cut delivery cost by up to 10.2% in a published study).
- **6–12 months, alongside: every delivery teaches the map.** Customers in smaller towns give landmarks, not house numbers. Meesho learns the real doorstep from each OTP-verified delivery and keeps it as India Post's DIGIPIN plus the customer's own landmark words, on top of GeoIndia. A repeat customer's next order already knows the door; the right hub is picked from the doorstep; any carrier gets the same doorstep. It targets the 22% of RTOs that are "not reached" (≈ 3.7 RTO points, ~₹340 cr a year) and gets better with every order.
- **Long term:** every node paid per successful outcome; refused parcels become a local inventory network.

**② Judge carriers by cost per success** (bar chart)
- Cost per success = (forward + RTO% × ₹120) ÷ (1 − RTO%). Valmo **₹84.8** today → **₹77.7** at 14% RTO.
- Carrier A: ₹45 at 10% RTO = **₹63** per success · Carrier B: ₹40 at 20% = **₹80**: **the cheaper parcel is the dearer delivery.**
- Meesho already picks carriers by lowest cost per parcel; picking by cost per *successful* delivery pushes every carrier to price the hard stop.

**③ It learns, and stays asset-light**
- Test data → learn which orders effort saves → set prices from evidence.
- Software and incentives on existing floor space; no warehouses ("warehousing tends to have lower return on investment": Meesho's CEO). Works for Valmo and any carrier.

**Live in our prototype:** the Ops tile **"Cost per successful delivery"** moving as the day plays out. *Proves:* the north-star number is already wired.
**Callout (the last words of the deck):** *"Money that carries no information can't coordinate a network. Price the hard stop."*
**Footer:** Meesho Q1 FY27 earnings call · Kandula, Krishnamoorthy & Roy, *Decision Support Systems* 149 (2021) · MediaNama, 2 Feb 2026 · India Post DIGIPIN (check the spec) · our calculation.

---

## The prototype, used to its full potential

**Where each screen appears**
| Slide | Screen (route) | What it proves |
|---|---|---|
| 1 | Landing page QR (`/`, Demo mode) | Anyone can try it in six minutes |
| 4 | Ops after Autopilot (`/ops`) | Score, flag and money run together |
| 5 | Rider chip (`/rider`), customer WhatsApp (`/customer`), captain queue (`/captain`) | The whole door flow works |
| 6 | Pilot verdict (`/pilot`) | The decision rule is real code |
| 7 | Desk card + second-chance options (`/desk`, `/customer`) | Each refused parcel's decision is computed and logged |
| 8 | Close-pilot card + ledger (`/ops`) and 18 audit checks (`/audit`) | Day 30's decision and every rupee are checked |
| 9 | Strike meter (`/rider`) + captain scorecard (`/captain`) | The guards are rules, not promises |
| 10 | "Cost per successful delivery" tile (`/ops`) | The north star is wired |

**Screenshot list** (live site, Demo mode, Lucknow hub; never a real number or AWB; take after the latest deploy):
1. `/` landing top (QR source) · 2. `/ops` after Start day + Autopilot (map + tiles) · 3. `/rider` Demo rider A with the ₹ +15 chips · 4. `/customer` the WhatsApp message with buttons · 5. `/captain?hub=lucknow` after a fake attempt (walkthrough step 4) · 6. `/pilot` default (GO, range, ✔ Fair comparison) · 7. `/desk` a parcel card after "Record inspection" · 8. `/customer` the four second-chance options · 9. `/ops` after "Close pilot" (verdict card + ledger) · 10. `/audit` 18 green · 11. `/rider` the strike meter after a strike · 12. `/ops` the cost-per-success tile.

**The 90-second video** (follows the deck's story, Demo mode, one browser):
- 0–10 s: the landing page: "Fix every way a COD order fails".
- 10–25 s: Ops: Start day, the purple flagged orders (slide 4).
- 25–45 s: Rider: the +₹15 chip, deliver with the OTP from the customer phone; then a weak "attempted" from far away lands in the captain queue (slide 5).
- 45–60 s: a refusal → the Desk: inspect, hold, a nearby buyer (slide 7).
- 60–80 s: +1 day, Close pilot: the verdict and the ledger; the pilot page's range and Fair comparison (slides 6, 8).
- 80–90 s: Audit: 18 green. End card: the QR.

**What is real and what is simulated** (say it if asked; don't overclaim)
- Real code: the decision rule, pairing and rule lock; OTP rules; the money ledger; the strike log and ladder; the Router's lanes and legal gates; savings booked only on real outcomes; 1,253 automated tests; 18 audit checks on every day.
- Simulated: orders, riders and outcomes (synthetic, no customer data); the demand history behind the match forecast; WhatsApp sending (built, but blocked by Twilio's trial; Demo mode shows it on screen).

---

## Numbers cheat sheet (every figure on the slides)
| Figure | Value | Source |
|---|---|---|
| Valmo RTO | COD 20% · prepaid 5% · 17% overall | Case data pack |
| Costs | ₹50 forward (last mile ₹21) · ₹120 return | Case data pack |
| RTO by distance | 15% / 17% / 22% | Case data pack |
| Meesho RTO trend | 21.2% → 18.6% → 17.8% (FY23–25), ~¾ of the fall from prepaid | Derived from RHP |
| COD vs prepaid | 22.3% vs 2.7% failure (8×); COD = 96% of failures, 77% of shipments | Derived from RHP |
| COD share / success | share 88.7% → 77%; success 78.6% → 77.7% | RHP |
| Valmo's share | 1.8% (FY23) → 48% (FY25) → 65% (H1 FY26) | RHP |
| Cause pie | refused 36 · not home 18 · address 13 · unreachable 12 · wrong hub 9 · no real attempt 9 · other 3 | Our research blend |
| Valmo orders | 763.5 mn (FY25); average order ₹265 | RHP |
| 1 RTO point | ≈ 7.6 mn parcels ≈ ₹92 cr a year | Our calculation |
| Rider / hub pay | rider ₹18 a delivery (reportedly ₹18–25); hub ₹5 per delivered parcel | Our research |
| Bonus economics | break-even 8.6 per 100 (10.3–10.7 conservative); ₹62 cr (conservative, +15) to ₹184 cr (case, +20) a year; −3 RTO points at +15 | Our model |
| Arrive anyway | 60 of 100 flagged (top 20%), 51 (top 10%) | Our assumption |
| The test | 4 hubs, 24 pairs, ~12,000 flagged orders, 30 days, 8-week baseline; smallest effect ~4 per 100 | Our design / prototype |
| Chance of GO | 3 / 18 / 58 / 97 in 100 at a true +8 / +10 / +12 / +15 | Prototype, simulated |
| Score accuracy | riskiest 20% catch ~46% of failures (random 20%) | Simulation only |
| Attempt Check | no real attempt 9% of RTOs, ≤ ~1.5 RTO points; ₹99 per recovered delivery, ₹10 per review, pays above ~1 in 10 | Our research / model |
| Router | ₹145 per match, ₹8 to hold, break-even 5.5%; ₹50 / 140 / 270 cr; pickup ~₹112 net | Our model |
| Address failures | 13% + 9% = 22% of RTOs ≈ 3.7 RTO points ≈ ₹340 cr a year | Our calculation |
| Cost per success | ₹84.8 → ₹77.7; carriers ₹63 vs ₹80 | Our calculation |
| City / time spread | Vadodara 18% vs Patna 35%; 22% → 35% by delivery time | Shipway 2025 |
| Seasonality | online-brand RTO ~39% (Nov 2025) → ~21% (Feb 2026) | Unicommerce 2026 |
| Smaller towns | Tier-2/3 = 66% of new online-brand orders | Business Standard (Unicommerce) |
| TrustMesh | 166 mn listings; RTO down >10% | Q4 FY26 letter |
| Theft case | Surat, Apr 2026: 33,035 Meesho parcels (₹1.35 cr) falsely marked delivered | deshgujarat.com |
| Prototype | 1,253 automated tests · 18 audit checks | Our prototype |

---

## Questions a judge may ask (speaker notes)
1. **"Isn't the rider just predicting which orders will fail?"** Maybe, and nobody knows. Our test measures exactly that; a KILL would be a cheap 30-day answer.
2. **"Why ₹15?"** It nearly doubles pay on that order and buys cheap effort, not a second trip; break-even is only ~9 extra deliveries per 100. The region test then finds the best price (₹0 / ₹10 / ₹15).
3. **"Why not compare with last year?"** RTO moves with the season and with prepaid more than our whole effect; only a same-weeks comparison isolates the bonus.
4. **"Won't riders fake attempts to farm it?"** The bonus pays only on a delivery; a weak attempt goes to the captain; strikes block the bonus; the safety rule caps fake attempts at 2 points above riders without the bonus.
5. **"Is re-homing legal?"** Same state only (GST place of supply), seller opt-in, the seller stays the seller (FDI), the carrier never sells goods. Small non-GST sellers first.
6. **"Doesn't Meesho already do geocoding?"** Yes (GeoIndia). We add the doorstep learned from real deliveries and the customer's own landmark words, which smaller-town addresses need.
7. **"What if the bonus doesn't work?"** RE-PRICE → Pilot 2; and the Attempt Check and the Router never depended on it.
8. **"Is the prototype real?"** The rules are real code with 1,253 tests and 18 audit checks; the data is synthetic; WhatsApp sending is built but blocked by the Twilio trial.
9. **"How sure is the 9% fake-attempt figure?"** It is our research blend, labelled so; the 8-week baseline measures the real rate. We never use the unsourced "15%".
10. **"Why the riskiest 20%?"** It balances prize and proof: the top 10% is cheaper per order and easier to prove, but worth half as much.

---

## Build checklist for the deck teammate
- [ ] Use the template; cover + 10 slides; each slide 350–400 words.
- [ ] Slides 2–3 reuse our existing charts (RTO trend, success-rate bars, the pie, the impact × effort map): restyle, don't change their numbers.
- [ ] No "Round", "R1", "R2" anywhere on the slides; fixes are named, not coded.
- [ ] Every slide from 4 on has its "Live in our prototype" box with a screenshot.
- [ ] Slide 3: refusal split with real numbers **and n**, or labelled "Illustrative; the pilot measures it". Slide 1 and 3: the field-visit **[n]**.
- [ ] One bridge line at the bottom of each slide; read the 10 headlines in order before sending.
- [ ] The QR comes from the Demo landing page only. No phone numbers, OTPs or AWBs on any slide.
- [ ] Check the DIGIPIN spec before slide 10.

## For us only (never on a slide)
- What we submitted earlier is unchanged at its core: the ₹15 bonus on a delivered risky order is still the hero; the pie, the impact × effort map, Prevent · Rescue · Recover and the 4-hub, 2-metro + 2-small-town test all stay. Everything else *sharpens* it. If a judge asks what changed, the answer is: "we went back to the field, found three kinds of failure, and built a fix and a guard for each."
- Earlier we wrote "Valmo grew to over 50% of shipments in FY25"; the filing says 48% (FY25) and 65% (H1 FY26). Slide 2 uses the exact figures.
- Live mode (real phones, shared day) needs `CAPTAIN_KEY` set in Vercel; the deck and video use Demo mode.
