# 28: The complete Round 2 deck plan (final, consolidated 2 Oct 2026)

**Build the deck from this file only.** It merges `14-deck-handoff.md` (v4) and `23-deck-plan-v5.md` (with §9 and §10). **Slides 0 to 3 are the Round 1 slides and are not changed**; the fake-attempt control is shown on slides 4, 7 and 8. Still use 14 for the **look and feel (§3)** and the **do-not-use list (§7)**, and `10-sources.md` for every footer. Ignore `16-deck-changes-prototype-v2.md` and the HTML copy of 14 (both are history).

**Format:** 10 slides including the cover (rules allow 6 to 10), Round 1 look: 20 × 11.25 in, about 350–400 words a slide, a full-sentence headline, three numbered panels (navy ①②③), ➢ bullets, at least one native chart or diagram, a pink "so what" callout, a grey sources footer. Colours: pink #ED0B7D, navy #120A4A, text #2B2650, purple #2A0680, GO green #4FBF83, callout #FCF0F6, cream #FFF3D7; Valmo app screens keep Valmo navy #092D5E.

**Words never to use:** "proven" (say "built and tested in our prototype" or "in simulation"), "X% of risky orders delivered" (say what the bonus *caused* against Control), "GO at +9", "12,000 orders detects +3", "15% of failed deliveries are fake", stats jargon on the slide face ("clustered", "MDE", "t-value", "difference-in-differences", "Brier score").

---

## The story

**The problem we solve, in one line:** *Valmo pays the same for an easy stop and a hard stop, so hard stops get the least effort and fail; Meesho knows which stops are hard but that knowledge never reaches the door.*

**The answer, in one line:** *Carry the risk signal to the door, pay for the hard delivery, check the effort was real, and recover cheaply what still fails.*

**Read the headlines in order: they must work as one paragraph** (the "headline test"; a judge skimming only the headlines should get the whole argument):

| # | Act | Headline | What the judge should believe after it |
|---|---|---|---|
| 1 | Claim | Price the hard stop: 3 more of every 100 orders delivered *(Round 1 slide, unchanged)* | There is a cheap, specific answer, and it is big |
| 2 | Diagnose | Two-thirds of RTOs happen at a door a rider can still save *(unchanged)* | The failure is at the door, and both sides have reasons to let it happen, including attempts that were never really made (the 9% slice) |
| 3 | Choose | Rescue first: the only lever that needs no new system *(unchanged)* | Of five scored levers, the bonus goes first; proof of attempt sits inside its controls |
| 4 | **Rescue**: how | Same app, same payout rail: ₹15 for the hard delivery, and a check that every failed attempt was real | It runs on Valmo's rails; gaming doesn't pay; the effort checks work even without the bonus |
| 5 | **Rescue**: proof | One avoided return pays for eight bonuses. A fair 30-day test decides it | The bar is low, and we won't scale on hope: a fair test with a rule locked in advance |
| 6 | **Recover** | The doors we still lose: send each refused parcel to its cheapest legal recovery, not ₹120 back | Even a failed door doesn't have to cost ₹120 |
| 7 | Decide | Every phase ends with a number that decides the next, and a fallback if the bonus fails | There is no scenario where we have nothing: if the bonus fails, the effort checks and the Router still stand |
| 8 | Guard | The ways this could break, and what we do about each | We have thought like the rider, the hub, the customer and the seller who try to game it |
| 9 | Scale | Today the risk score is a filter. Tomorrow it's a price | The pilot is step one of repricing difficulty across the whole network |

**The frame (from Round 1, kept):** Prevent · **Rescue** · **Recover**. On slides 4–9 a small breadcrumb in the top-right corner shows where we are: Rescue (4, 5), Recover (6), Plan (7), Risks (8), 10x (9). It is not added to slides 1–3.

**One order runs through the deck.** Slide 2's real order (COD, arrived early with no warning, "the rider called twice and didn't wait", "Failed Delivery") is the thread. Each slide from 4 to 7 ends with one italic line saying what would have happened to *that* order:
- **Slide 4:** the rider sees "+₹15 Bonus Eligible"; the two calls with no wait are a weak attempt, so it lands in the hub captain's queue and the customer is asked "Did the rider reach you?"
- **Slide 5:** across 12,000 orders like it, the pilot measures whether ₹15 makes the rider wait and knock.
- **Slide 6:** if the customer still says no, a second chance on WhatsApp, then a nearby buyer, then a batched return, never an automatic ₹120 trip.
- **Slide 7:** a captain ruling on that attempt is one of the numbers that decides day 31.

## Research → insight → design: why every choice is there (the scoring lever)

Judges score research quality first. Slides 1–3 show the research; slides 4–9 must show that **each design choice comes from a finding**. Every row below appears on the slide named, as a short "because" line. Sources are in `10-sources.md`, `01-valmo-research.md` and `07-problem-breakdown.md`.

| # | What we found | So we designed | Slide |
|---|---|---|---|
| 1 | The brief rules out customer-side levers (no COD gating, fees or checkout friction). The rider is the only person who meets the customer | Work on the system side: the rider and the hub | 4 |
| 2 | Riders are not lazy: they re-attempt to earn more. But they give prepaid 2–3 calls and COD almost none ("COD = will cancel") (12 rider interviews) | **Remove the barrier, don't add effort:** give a flagged COD order the prepaid playbook | 4 |
| 3 | ₹15 nearly doubles pay on that order (₹18–25 per delivery, reportedly). It buys cheap effort (more calls, a 10-minute wait, asking a neighbour), not a second trip (which costs the rider about 2 other deliveries, ≈ ₹40) | ₹15, not ₹50: priced for cheap effort | 4 |
| 4 | Round 1 assumed the hub pays the rider. **Valmo's own contract shows Valmo pays the rider directly and already has an "Additional Incentive" line** | The ₹15 goes straight to the rider; no hub pass-through problem | 4 |
| 5 | Hubs are multi-platform: the same bag carries Flipkart parcels | The bonus also wins rider effort for Meesho's hard stops | 4 |
| 6 | Valmo's contract already phones customers to verify failed attempts; Flipkart asks the customer "Confirm delivery reschedule" | Fake-attempt control routes those answers to the hub captain, using evidence Valmo already collects | 4 |
| 7 | RTO rises with slow delivery (22% at 1–2 days → 35% at 5+), with distance (15 → 22%), for new addresses, and in the ₹500–1,000 order band (28%, the worst) | These become Rescue Score signals | 4 |
| 8 | **No Indian vendor's RTO-reduction claim is independently audited** (Delhivery "up to 20%", GoKwik, Shadowfax "almost 60%": all self-reported) | We test with a same-time Control group a sceptic would accept | 5 |
| 9 | RTO swings with the season (D2C ~39% in Nov 2025 → ~21% in Feb 2026), more than the bonus's whole effect | No before/after; a same-time Control group | 5 |
| 10 | Tier-2/3 cities are 66% of new D2C orders, and India is not one market (Vadodara 18% vs Patna 35%) | 2 of the 4 pilot hubs are smaller-town hubs | 5 |
| 11 | Node margins are razor thin (a large 3PL nets about 15 paise an order) | Meesho funds the bonus, paid only on success; the hub bears no new cost | 5, 8 |
| 12 | E-way bills are a red herring (₹50,000 threshold). **The real constraint is GST place of supply** (Notif. 34/2023), plus FDI Press Note 2 and the Carriage by Road Act s.15 (a carrier can't sell goods) | Re-home only within one state, with seller opt-in; the seller stays the seller | 6 |
| 13 | The two halves already exist in India: Ecom Express runs dark stores at its delivery centres; Delhivery's doorstep QC lifted AJIO's resaleable returns from 25% to 98%. Nobody has joined them at the refused parcel | The Router joins them: inspect at the hub, re-home locally | 6 |
| 14 | Prior art: Amazon's 2012 patent (US 8,615,473) offers the cost of a return as a discount to a nearby buyer | We name it first: the same principle, pushed to the last-mile hub, where India's COD economics make it pay | 6 |
| 15 | Meesho allocates lanes by lowest cost, with no fixed Valmo share (Q1 FY27 call) | Allocate by cost per *successful* delivery instead | 9 |
| 16 | Predicting *when* the customer is home cut delivery cost by up to 10.2% (Kandula et al., *Decision Support Systems* 2021) | Time slot is one of the inputs to the difficulty price | 9 |

**State the research limits ourselves** (credibility): the rider interviews are a metro sample and riders willing to talk are the least busy; no published Indian RTO cause split exists, so ours is a labelled blend; every vendor number is self-reported. The pilot's Control group answers the biggest unknown: do riders *cause* COD failure or correctly *predict* it?

**How fake attempts fit the story (without touching slides 1–3):** slide 2 diagnoses it (the 9% "no real attempt" slice and the real order); slide 3 says proof of attempt is part of the bonus's controls; **slide 4 shows those controls and adds that they do not need the bonus to work**; slide 7 runs them from day 0 in both groups and keeps them if the bonus is killed; slide 8 guards the captain against bias. Read in order, this is one line of thought, not a contradiction: *built as the bonus's guard, strong enough to stand alone.*

---

> **Slides 0 to 3 are the Round 1 slides: copied word for word from `14-deck-handoff.md`. Do not change them** (Gaurav, 2 Oct). The fake-attempt material lives on slides 4, 7 and 8.

## Slide 0: Cover
Same as Round 1: "REDUCING RTO: GETTING MORE ORDERS DELIVERED · Business Track · Team GPS, IIT Bombay". Optionally add "Round 2: Detailed Submission".

---

## Slide 1: Executive summary *(ask ①)*
**Headline:** Price the hard stop: 3 more of every 100 orders delivered
**Message:** Valmo pays the same for easy and hard stops, so hard stops fail. We carry Meesho's risk signal to the door and price the difficulty.

**① The problem**
- Big-number tiles:
  - **17%** of Valmo orders fail (data pack: 80% × 20% + 20% × 5%)
  - **₹170 vs ₹50** per failed vs delivered order
  - **96%** of failures are COD
  - **2 in 3** fail at the door
- *Visual:* mini bar, RTO by distance from hub: 15% / 17% / 22% (~2 / 5 / 10 km+)

**② What we found**
- Two-sided friction (customer: nothing paid; rider: flat pay, paid only on success)
- Valmo's own rider contract: paid per successful delivery; the only incentive tracks the *overall* first-attempt rate
- TrustMesh's signal stops before dispatch
- Evidence line: 12 rider interviews · buyer survey **[n PENDING]** · real test orders · Valmo contract
- *Visual:* one rider quote (from Round 1)

**③ What we recommend** *(three stacked cards)*
- **Now:** Rescue Bonus: −3 RTO pts, ₹62 cr (conservative) to ₹184 cr (case) a year, **if a 30-day paired-rider pilot confirms it**
- **Next:** Refused-Parcel Router: ₹50–140 cr/yr (up to ₹270 cr)
- **Long-term:** pay by difficulty

**Callout band:** a constraint scorecard for the brief's three tests: delivery cost ↓ · rider earnings ↑ · customer speed/ease unchanged (faster for buyer 2). Plus the prototype QR code **[PENDING]**.
**Footer:** "Valmo economics use the case data pack; Meesho-wide trends use the RHP and shareholder letters."

---

## Slide 2: Where and why RTO happens *(ask ②)*
**Headline:** Two-thirds of RTOs happen at a door a rider can still save
**Message:** Most failures are rescuable at the door, and both the customer and the rider have reasons not to make it happen.

**① Where** *(horizontal grouped bar; replaces the Round 1 pie, same numbers)*
```
All RTOs (100%)
├ At the door, rescuable ..... 66%
│  Refused (customer OTP) .... 36
│  Not home .................. 18
│  Phone unreachable ......... 12
├ Before the door (system) ... 22%
│  Unclear address ........... 13
│  Far / wrong hub ............ 9
├ No real attempt ............. 9%
└ Other ....................... 3%
```
Label: "Our blend of rider interviews, buyer survey, industry mix, data pack." The build-up is **[PENDING]** from the research teammate.

**② Who fails most** *(native charts: COD vs prepaid; distance bar)*
- COD fails **22.3%** vs prepaid **2.7%** (~8x). COD is **96%** of failures while being 77% of shipments.
- Distance (data pack): **15% → 17% → 22%** at ~2 / 5 / 10 km+. New or unclear addresses fail more.
- India isn't one market: **18%** in Vadodara vs **35%** in Patna. RTO rises from 22% to 35% as delivery time goes from 1–2 to 5+ days (Shipway 2025).
- Sidebar:
  - RTO 21.2% → 18.6% → 17.8% (FY23–25, derived from RHP).
  - **~70%** of the drop came from the shift to prepaid.
  - Yet COD success fell 78.6% → 75.9%, so that lever is spent.

**③ Why: two-sided friction** *(small loop diagram + two quotes)*
- **Customer:** nothing paid, so refusing is free; price-shopping while the parcel travels (Round 1 survey quote)
- **Rider:** paid only on success, flat per stop, so effort goes to likely successes (Round 1 rider quote)
- Loop: expected to fail → less effort → fails → expectation confirmed

**"We placed a real order" strip** (timeline):
1. COD order placed → app promised **3 Oct**
2. Arrived **28 Sep**, 5 days early, with no heads-up
3. Valmo WhatsApp "Arriving Today": one-way, no availability question, no pay-now option
4. The rider called twice and didn't wait
5. "Failed Delivery… we will try again in 24–48 hrs"

Use a redrawn version, not the raw screenshot (it shows the rider's number).

**Footer: methods strip**
- 12 rider interviews (Mumbai hubs) · buyer survey, Hindi/English **[n PENDING]** · real test orders on Meesho + Flipkart · rider/hub calls **[PENDING]**
- RHP, Q4 FY26 & Q1 FY27 letters · Valmo Delivery Services Agreement · case data pack · Shipway
- Italic line: *"What we don't know: whether riders cause COD failure or correctly predict it. The pilot's control group separates the two."*

---

## Slide 3: Prioritised solutions with expected impact *(ask ③)*
**Headline:** Rescue first: the only lever that needs no new system
**Message:** Five levers scored with numbers. The bonus goes first because it runs on what Valmo already has.

**① Scored table (the main element)**

| Lever (R1 code) | Pool | Assumed effect | RTO pts | ₹ cr/yr | Confidence | Effort | Order |
|---|---|---|---|---|---|---|---|
| **Rescue Bonus** (R1) | Riskiest 20% | +15 deliveries / 100 flagged | −3.0 | 62 (conservative) – 184 (case, +20) net | Med | Low | 1 · now |
| **Refused-Parcel Router** (C1) | All refused parcels | 2.5–13.5% re-homed + cheaper returns | 0 (recovers cost) | 50–270 | Low–Med | Med | 2 · day 30+ |
| **Two-way WhatsApp** (P1, sharpened) | Not home 18% + unreachable 12% | fixes ⅕ | −1.0 | ~95 gross | Low–Med | **Low**: Valmo already sends WhatsApp | 3 · day 31+ |
| **Address confidence + fix before dispatch** (P2) | Address 13% + wrong hub 9% | fixes ¼ | −0.9 | ~80 gross | Med | Med (builds on GeoIndia) | 4 · day 60+ |
| Proof of attempt (R2) | No real attempt 9% | Mostly in play already (Valmo verification call + refusal OTP), so it's folded into the Rescue Bonus controls | | | | | — |

Keep a small thumbnail of the Round 1 matrix for continuity.

**② Evidence for P1: Flipkart does it, Valmo doesn't**

| Moment | Flipkart | Valmo |
|---|---|---|
| Asks if you'll be home | ✅ button | ❌ |
| Replies to your answer | ✅ | ❌ one-way |
| Delay notice with new date | ✅ | ❌ |
| Checks reschedule claims with you | ✅ | ❌ |
| Rider contact | masked number + PIN | direct number shown |

*Visual:* before/after. Valmo's real "Arriving Today" message next to ours, with the buttons ✅ I'm home · 🕐 Change time · 📍 Fix address · 💳 Pay now (UPI).

**③ Already in play · excluded by design**
- **In play:**
  - prepaid push (~37% prepaid, Q1 FY27; Pay Before Delivery, shareable UPI)
  - TrustMesh (monitors 166 mn active listings; RTO down >10%)
  - predictive routing
  - GeoIndia address model
  - verification call + refusal OTP
- **Excluded by design:** partial COD, COD restriction, convenience fees, forced prepaid, extra checkout steps. The brief rules out friction in ordering, and Meesho already runs the risk side.

**Callout:** **1 RTO point on Valmo ≈ 7.6 mn parcels ≈ ₹92 cr/yr** of reverse cost. Note: "Effects are planning assumptions the pilot replaces. P1/P2 overlap the bonus pool, so don't add them up."
**Footer:** Q1 FY27 & Q4 FY26 letters · Valmo Delivery Services Agreement · Tata Comms × Shiprocket case (vendor-reported: −45% RTO losses) · real test orders.

---

## Slide 4: Rescue Bonus, how it works, and how gaming is caught (ask ③, the hero) · breadcrumb: RESCUE
**Headline:** Same app, same payout rail: ₹15 for the hard delivery, and a check that every failed attempt was real
**Message:** The Rescue Bonus runs on systems Valmo already has, is new in how it targets, and is built so gaming doesn't pay; suspicious attempts go to the hub captain.
**Story beat:** slide 3 chose Rescue; this is how it works. Two halves: pay for the hard delivery (top), and make sure the effort was real (bottom).
**"Why the rider" strip (one line, above the flow; insights 1–3):** *"The brief rules out customer-side levers, and the rider is the only person who meets the customer. Riders re-attempt for pay but give COD almost none of the 2–3 calls prepaid gets. ₹15 nearly doubles pay on that order and buys exactly that cheap effort (calls, a 10-minute wait, a neighbour), not a second trip."*
**"What research changed since Round 1" tag (one line, under the flow; insight 4):** *"Round 1 assumed the hub pays the rider. Valmo's contract shows Valmo pays riders directly, with an 'Additional Incentive' line, so the ₹15 goes straight to the rider."*

**Top: 5-step flow (chevrons)**
1. **Score:** TrustMesh + last-mile signals
2. **Flag:** the riskiest 20% (capped)
3. **Show:** the rider app shows "Bonus Eligible · +₹15", never the score
4. **Confirm:** prepaid OTP, or COD cash reconciled at the hub the same day
5. **Pay:** ₹15 on Valmo's existing **"Additional Incentive"** line, direct to the rider's bank, **on any attempt (first or second)**, held until the 7-day return window closes

**① Which score, and how good is it?**
- TrustMesh decides who we ship to; the Rescue Score decides where effort pays.
- Day 1: simple rules with visible weights, each from a finding (insight 7): TrustMesh risk, COD, distance (15 → 22%), new or unclear address, slow delivery (5+ days: 35%), the ₹500–1,000 order band (28%), phone reachability, past failed attempts.
- Accuracy bar: "the riskiest 20% by score catch **about 46%** of all RTOs; random picking catches 20%". Small type: *"in our simulation; measured on Valmo's last 90 days before the pilot"*.
- How it improves: add "hard to deliver" signals (pin code's past failure rate, customer unreachable before, gated address); re-weight after each pilot; later learn which orders the bonus actually saves.

**② What the rider sees** (screenshot: the rider app's "Today's Tasks" card with the green "₹ +15 Bonus Eligible" chip). Round 1 rider-bag visual (₹18 × 4 + ₹18 + ₹15). Why targeted: a flat bonus on all COD orders only adds cost. Why it matters to Meesho: the same bag carries Flipkart parcels, so the ₹15 wins rider effort for Meesho's hard stops (insight 5).

**③ Is it new?** Meituan pays for order *acceptance*; Uber Eats / DoorDash pay hidden extra for harder orders, also at acceptance; Ekart and Valmo today pay a first-attempt incentive on all orders. **We found no one who pays per order on the successful delivery of risk-flagged orders** (desk search, Sep 2026). *(Copy the peer sources into `10-sources.md` or cut the peers.)*

**Bottom: "Does it hold once people work around it?"**
| If someone works around it… | Control built in |
|---|---|
| Chases bonus orders, neglects normal ones | **Safety rule 1:** normal-order delivery no more than 1 point below Control riders; a rider whose normal deliveries drop gets bonuses held |
| Logs a fake "attempted" | Proof at the door (GPS, calls, wait) + WhatsApp "Did the rider reach you?". **Suspicious attempts go to the hub captain:** confirm, free re-attempt by another rider, or strike (needs evidence, not the customer's word alone). Strikes: 1 warning → 2 bonus blocked + every failure reviewed → 3 hub manager; visible to the rider; expire in 30 days. **Safety rule 2:** Bonus riders' suspected fakes ≤ Control + 2 pts |
| Fakes an attempt today and delivers it himself tomorrow | If the same rider's earlier attempt was weak and the customer did not confirm it, the ₹15 waits in the 7-day hold for the captain's review (released by default) |
| Fakes a delivery or pressures a buyer | OTP or same-day COD cash; the bonus is held 7 days and taken back on a return; returns and complaints watched, Bonus vs Control |
| Farms the bonus | ₹300 a day cap per rider |
| Learns which areas get flagged | The score is never shown; monitored by pin code |
| Flags creep up | Fixed 20% cap; score accuracy re-checked monthly |
One line under the table: **"Fake-attempt control stands on its own.** It is Round 1's proof-of-visit, sharpened: the pool is the 'no real attempt' 9% of RTOs on slide 2 (at most about 1.5 RTO points; not claimed until the baseline measures it). It runs in both pilot groups from day 0, independent of the bonus, and a ₹10 review pays if more than about 1 in 10 ends in a delivery."
Small line: *"Every prototype day is checked by 14 automatic tests, for example nothing delivered without a verified OTP."*
Screenshots: the rider chip (shot 4); the hub-captain queue and the rider's strike meter **once built** (until then the Ops exception queue, labelled "being replaced by the hub-captain screen").
**Footer:** Valmo Delivery Services Agreement (Annex A, §3) · Meituan (arXiv 2202.10695) · Uber fare guide · Flipkart WhatsApp flow (real orders).
**Bridge (italic, last line):** *"Our real order: the rider would have seen +₹15, and 'called twice, didn't wait' would have gone to the captain. But does ₹15 actually change what riders do, and does it pay?"*
**Speaker notes (off the slide face):** Ops can overturn a strike within 48 h; the rider can ask for a review; 24 h with no captain decision = a free re-attempt, no strike; the Watch rule (3 disputes in 7 days and 2× the hub median).
*Density warning: this is the fullest slide; keep the table to one line per row. If it overflows, cut panel ③ "Is it new?" to its last sentence first; never cut the "Why the rider" strip or the Round 1 → Round 2 tag.*

---

## Slide 5: Economics and how we'd test it (asks ③ ⑤) · breadcrumb: RESCUE
**Headline:** One avoided return pays for eight bonuses. A fair 30-day test decides it
**Message:** Break-even is low, the upside is large, and a simple paired-rider pilot gives a clear decision, with a pre-planned next step if it doesn't pay.
**Story beat:** answers the question slide 4 ends on. Left half: how little it takes to pay. Right half: how we find out honestly.
**"Why a test, not a claim" line (top of ③; insights 8 and 9):** *"No Indian vendor's RTO-reduction claim is independently audited, and RTO swings with the season (D2C ~39% in November vs ~21% in February), more than our whole effect. So we compare riders over the same weeks, not this year with last."*

**① Unit economics (per 100 flagged orders)** (line chart: net vs effect, break-even marked)
- Baseline: **60 of 100 flagged orders are delivered without the bonus.** Label: *"Our assumption: the riskiest 20% fail about 40% of the time, vs 17% overall. The Control group measures it."*
- Cost = ₹15 × (60 + Δ) (the bonus is also paid on the 60 that would arrive anyway). Saving = ₹120 × Δ.
- **Break-even Δ ≈ 8.6 per 100**: "one avoided return pays for eight bonuses".
- Conservative line: *"extra cost per rescue of about ₹18 to ₹21 (a rider fee or a second attempt)"*: break-even **10.3 to 10.7**.
| Delivered of 100 flagged | Net per 100 (case) | Net per 100 (conservative, ₹18) |
|---|---|---|
| 69 (Δ = 9) | +₹45 | −₹117 |
| 75 (Δ = 15) | +₹675 | +₹405 |
| 80 (Δ = 20) | +₹1,200 | +₹840 |

**② Sensitivity + scale** (heat-map; net ₹ cr a year for 153 mn flagged orders = 20% of 763.5 mn)
| Bonus \ Δ | +5 | +10 | +15 | +20 |
|---|---|---|---|---|
| ₹10 | −8 | 76 | 161 | 245 |
| ₹15 | −57 | 23 | 103 | 184 |
| ₹20 | −107 | −31 | 46 | 122 |
Sentence: *"If a ₹15 bonus truly adds +10 per 100, Valmo gains about ₹23 cr a year; at +15, about ₹103 cr; at +5 it loses ₹57 cr. That is why we test before we scale."* Cost per successful delivery: **₹84.8 → ₹77.7**.
One line on the slide: *"A tighter cut (top 10%) is cheaper per order and easier to prove, but the prize is half, so we start at 20%."* **Speaker notes:** the targeting table (top 20% vs top 10%: delivered anyway 60% vs 51%; break-even +8.6 vs +7.3; 153 mn vs 76.5 mn flagged a year; ₹103 cr vs ₹62 cr a year at +15; −3.0 vs −1.5 RTO points; the top-10% ₹62 cr and the conservative ₹62 cr are different calculations).

**③ A fair test in 5 steps** (numbered strip)
1. **Fair groups:** in each of 4 hubs (2 metro, 2 smaller, because Tier-2/3 is 66% of new orders and India is not one market), pair riders who delivered equally well last month; a coin decides who gets ₹15 → **24 pairs**. One sentence for judges: *"two equally good riders, a coin decides which one gets ₹15; after 30 days we compare every pair."*
2. **Same parcels:** check both groups carry the same mix of risky parcels; bags assigned by the system (no swapping); Control riders get the bonus when the 30 days end.
3. **30 days**, about 100 flagged orders a hub a day (**about 12,000**), after an **8-week baseline**. Fake-attempt control runs in both groups from the baseline, so the bonus effect is measured on top of it.
4. **Simple maths:** for each pair, the bonus rider's delivery rate minus the partner's; effect = the average; range = average ± about 2 × spread ÷ √24. The smallest effect it can reliably see is **about 4 per 100**.
5. **The rule, locked before day 1:**
| Verdict | Rule |
|---|---|
| **GO** | Even the **low end of the range** ≥ break-even (+8.6) and both safety rules hold |
| **RE-PRICE** | It helps (+3 or more) but isn't proven to pay → **Pilot 2** with one lever changed (top 10% or a smaller bonus), its rule locked first |
| **KILL** | Under +3, or a safety rule breaks: normal orders more than 1 point below Control, or Bonus riders' suspected fake attempts more than 2 points above Control |
| **Not enough data** | Fewer than 6 pairs, or under 90% of orders finished |
Watched, not a stop rule: returns and complaints, Bonus vs Control.
- **Speaker notes, ready if asked** *"Why not just compare with last year?"*: Meesho's RTO moved 21.2% → 17.8% (FY23–25) and COD success fell 78.6% → 75.9%; the bonus should move network RTO by about 1.7 points at break-even, the same size as normal drift and festive swings. A same-time Control group removes that.
- Example (simulated): *"If the bonus truly adds +15 per 100, this pilot says GO about 97 times in 100; at +12 it is about a coin flip (6 in 10); at +10 or less it usually says RE-PRICE and we'd run Pilot 2."* Small type: *"the simulation has no good-month and bad-month luck in riders, so a real pilot will be noisier."*
- *"₹15 → more rider effort → more deliveries is our assumption. The pilot measures it, and its Control group also answers the question nobody has answered: do riders cause COD failure, or correctly predict it?"*
- One line: *"Meesho funds the ₹15, paid only on success; the hub, whose margin is paise per order, bears no new cost."* (insight 11)
- Visual: the prototype's range diagram with the ✔ Fair comparison line (shot 1); optional shot 2 (RE-PRICE with "Next: Pilot 2").
**Callout:** "₹120 to haul a parcel back; ₹15 to make the hard stop worth it. If it doesn't pay, we change one lever and test again, and the fallback keeps running."
**Bridge (italic, last line):** *"Even with the bonus, some customers will still say no at the door. What happens to those parcels?"*
**Footer:** case data pack · RHP · Swiggy/Zomato rain pay (Indian per-order difficulty pay) · Butschek et al., *Labour Economics* 2022 · Unicommerce D2C Report 2026 · Business Standard (Unicommerce), Apr 2026 · vendor claims: Delhivery, GoKwik, Shadowfax (self-reported).

---

## Slide 6: Refused parcels (ask ④): the Router · breadcrumb: RECOVER
**Headline:** The doors we still lose: send each refused parcel to its cheapest legal recovery, not ₹120 back
**Message:** A per-parcel router with three lanes, each checked against GST, consumer, privacy and foreign-investment rules, and paid for only when a parcel is actually delivered.
**Story beat:** Rescue lowers how many doors fail; Recover lowers what each failed door costs. It works whether or not the bonus is scaled.

**① Why it matters:** a return costs **₹120 = 45%** of Meesho's ₹265 average order; Meesho bears it; about **130 mn** RTO parcels a year (763.5 mn × 17%); the default is to send it back (Shopee: refuse once → return to sender). **We found no marketplace that re-homes refused parcels from the last-mile hub** (desk search, Sep 2026). **The two halves already exist in India** (insight 13): Ecom Express runs dark stores at its delivery centres, and Delhivery's doorstep quality check lifted AJIO's resaleable returns from 25% to 98%. Nobody has joined them at the refused parcel. **We name the prior art first** (insight 14): Amazon's 2012 patent offers the cost of a return as a discount to a nearby buyer (also Pitney Bowes, expired 2025; Formula Labs). Ours is that principle pushed to the last-mile hub, where India's COD economics make it pay.

**② The Router, 3 lanes** (decision diagram, a legal tick on each lane; each chosen by expected value: chance × saving − cost)
1. **Second chance** (24 h WhatsApp, legally clean): **Deliver again · Different time · Pay now by UPI · Pick up at hub** (48 h, a pickup code; saves the ₹120 return, about ₹112 net of the ₹8 shelf; never counts as a delivery or pays a bonus).
2. **Hold & Re-home** (clean if same state): **inspected first** (unopened, seal intact, invoice outside, photo); **seller state = hub state = buyer state**; the seller has opted in for that product (never overridden); damaged or wrong items never re-homed ("seller claim / QC" flag). **Hold only where the low end of the demand forecast clears break-even (5.5%)**: only the **same seller and the same listing** is ever re-homed; similar listings (matched on title words, same category, price within 30%) are evidence of demand only, never a substitute.
3. **Batched return** (clean): everything else, grouped by seller (US programmes report 20–40% cheaper).
- 30 shelf slots shared by Hold and pickup; savings count only on real outcomes.

**③ Break-even and rules** (break-even line chart)
- Holding 48 h costs about ₹8; a match saves ₹145 → **break-even 5.5% match rate**. We don't claim a match rate. Sizing: about **₹50 / 140 / 270 cr** at a 2.5 / 7 / 13.5% effective match rate.
- **The legal insight** (insight 12): *"Everyone worries about e-way bills; they only apply above ₹50,000. The real constraint is GST place of supply, and a carrier may not sell goods (Carriage by Road Act s.15). So we re-home only within one state, only with the seller's opt-in, and the seller stays the seller."*
- Start with **non-GST sellers** (same state by law) in **Uttar Pradesh** (15.9% of sellers).
- The forecast shows a chance with a range and a confidence label; in a synthetic backtest it is calibrated on average. **Do not claim the low-end rule earns more in total**; say *"it holds fewer parcels and each pays more often; we choose it to limit custody risk and wrong calls."*
- Small type: *"History is synthetic: this shows the mechanism; real calibration comes from the pilot. Kill the Hold lane if the match rate is below 3% after 30 days, or on any custody incident."*
- Screenshots: a Desk parcel card (shot 7), the money tiles (shot 8), the four second-chance options (shot 9).
**Callout:** the pilot first measures how long refused parcels sit at the hub today, the share of "maybe later" refusals, and the match rate.
**Bridge (italic, last line):** *"Our real order: if the customer still said no, a WhatsApp second chance, then a nearby buyer of the same item, then a batched return. Never an automatic ₹120 trip."*
**Footer:** GST s.2(85), IGST s.10(1)(a), Notif. 34/2023-CT · FDI Press Note 2 (2018) · Consumer Protection (E-Com) Rules 2020 · DPDP Act 2023 · Carriage by Road Act 2007 s.15 · CGST Rule 138 (e-way bill) · Amazon US 8,615,473 · Ecom Express DRHP p.181 · Delhivery QC-RVP (AJIO) · UPS Happy Returns / Optoro · Meesho RHP.

---

## Slide 7: 30-60-90 plan (ask ⑤) · breadcrumb: PLAN
**Headline:** Every phase ends with a number that decides the next, and a fallback if the bonus fails
**Story beat:** pulls slides 4–6 into one timeline and answers "what if you're wrong?" before the judge asks.
**Visual (top right): the decision fork after day 30.** Pilot 1 verdict → **GO:** region price test (~40 hubs) → scale · **RE-PRICE:** Pilot 2, one lever changed · **KILL:** stop the bonus; **fake-attempt control and the Router carry on** (the same two boxes sit under all three branches, so the picture shows they never depended on the bonus).
| | Days 0–30 | Days 31–60 | Days 61–90 |
|---|---|---|---|
| **Rescue Score** | Before day 0: measure accuracy on Valmo's last 90 days | Add "hard to deliver" signals; re-weight from pilot data | Learn which orders the bonus saves |
| **Rescue Bonus** | Pilot 1: 4 hubs, 24 rider pairs, top 20%, rule locked | **If GO:** one region (~40 hubs) with a **price test**: hubs randomly at ₹0 / ₹10 / ₹15 (and top 10% vs 20%), each compared with its own baseline and the ₹0 hubs over the same weeks. **If RE-PRICE:** Pilot 2 with one lever changed, rule locked first | Scale decision; start difficulty-priced tiers |
| **Fake-attempt control** | Day 0 in every pilot hub, both groups: hub-captain review, strikes, rider monitor | Tune the evidence thresholds and the ladder from baseline data | Roll out with the bonus, or alone if the bonus is killed |
| **Refused-Parcel Router** | UP cluster (3 hubs): measure dwell time + soft refusals; second chance live | Manual Hold & Re-home with 30–50 opted-in same-state sellers (non-GST first); batched returns | Automate matching if match rate ≥ 5.5% |
| **P1 / P2** | — | Two-way WhatsApp on bonus orders in pilot hubs; address fix in 1 small-town hub | Decide on each |
| **Success metric** | Low end of the range ≥ +8.6; normal orders ≥ Control − 1 pt; suspected fakes ≤ Control + 2 pts | Cost per rescued order ≤ ₹120; match rate vs 5.5%; WhatsApp reply rate; recovered deliveries from reviews | Valmo RTO and cost per successful delivery vs baseline |
| **Kill / re-tune** | Uplift < +3, or a safety rule breaks | Match rate < 3%; any custody incident; more than 1 in 3 strikes overturned, or reviews cost more than they recover | Net ₹ negative for 2 months |
- Loop picture: **Pilot 1 → learn → Pilot 2 → scale**, "one lever changed, rule locked first". Line: *"Pilot 1 answers 'does ₹15 work?'; the region phase answers 'which price and which cut?'"*
- KPI tree: north star = cost per successful delivery → RTO % → uplift per 100 flagged / match rate / recovered deliveries.
- Router and fake-attempt KPIs show their count and "too early" until 30 parcels or attempts. **Custody incidents and complaints are not simulated; they are measured in the real pilot** (never show a 0).
- Owners: last-mile ops (bonus, fake-attempt control via hub captains), reverse ops (Router), data science (score), customer comms (WhatsApp).
- **Bridge (italic, last line):** *"A plan this specific has specific ways to break. Here they are."*

---

## Slide 8: Risks and second-order effects (ask ⑥) · breadcrumb: RISKS
**Headline:** The ways this could break, and what we do about each
**Story beat:** we think like the people who will game it. Group the table rows by Rescue / fake-attempt control / Recover / all, in the same order as slides 4–6, so it reads as a recap.
**Bridge (italic, last line):** *"Guarded and tested, the bonus is only the first step."*
**Density rule:** the table has 21 rows. Put the **top 10 by likelihood × impact** on the slide face (they also go on the matrix), and the rest in a small "also guarded" line plus the speaker notes. The top 10 must include: uplift below break-even, riders predict rather than cause, season distorts the result, riders game the bonus, captain bias, unfair strikes, theft from held parcels, cross-state GST, the metro-sample limit and the 3PL shift.
Layout: ① risk matrix (likelihood × impact) · ② the table · ③ a "who works around it" quadrant (riders / hubs / customers / sellers).
| Risk | Move | Likelihood | Guard |
|---|---|---|---|
| Uplift below break-even | Rescue | Med | RE-PRICE → Pilot 2 with one lever changed; **the fallback (fake-attempt control + Router) continues** |
| Riders correctly *predict* COD failure rather than cause it (then effort can't fix it) | Rescue | Med | This is exactly what the Control group measures; a KILL is a cheap, 30-day answer to the case's central unknown |
| The hub, not Valmo, sets rider pay (the bonus leaks) | Rescue | Low | Valmo's contract pays riders directly; the ₹15 rides the existing "Additional Incentive" line |
| Our evidence is a metro sample | All | Med | 2 of 4 pilot hubs are smaller-town; the 8-week baseline measures the real cause mix and fake-attempt rate |
| A trend or the festive season distorts the result | Rescue | Med | A same-time Control group; never a before/after alone |
| Moving the goalposts after seeing results | Rescue | Low | Rule locked before day 1; a changed rule makes the verdict invalid |
| Unfair groups | Rescue | Low | Riders paired on past rate, coin in each pair, parcel-risk mix checked |
| Riders game the bonus (fake attempts, fake deliveries, neglected normal orders) | Rescue | Med | OTP and cash proof, 7-day hold and clawback, hub-captain review, the two safety rules, returns watched |
| Hub differences hide the price effect | Rescue | High at 4 hubs | Price test only at region scale (~40 hubs), hubs assigned at random |
| Real pilot noisier than our simulation | Rescue | Med | Decide on the low end; Pilot 2 loop; smallest detectable effect stated |
| Hub captain biased (protects or over-strikes) | Fake-attempt | Med | Ops can overturn within 48 h; sample audit of decisions; captain scorecard |
| Unfair strikes on riders | Fake-attempt | Med | A strike needs evidence and a reason; 30-day expiry; appeal; rider sees everything; a real rollout needs a captain login and a documented process |
| Score misses hard orders / drifts | Rescue | Med | 20% cap; accuracy measured before the pilot and monthly |
| Theft from held parcels (Surat 2026: 33,035 Meesho parcels faked as delivered) | Router | Med | Inspection, scan in/out, old ↔ new order link, OTP to the new buyer, 48 h cap, daily shelf count |
| Demand forecast wrong for thin listings | Router | Med | Hold only on the low end; confidence label; kill rule |
| Pickup no-shows, shelf crowding | Router | Low–Med | 48 h then batched return; shared 30-slot cap |
| Cross-state GST exposure | Router | Blocked by rule | Same state only; non-GST sellers first |
| Marketplace seen as controlling stock (FDI) | Router | Low–Med | Seller opt-in and rules; neutral allocation; seller keeps title |
| Buyer 1's data on the parcel | Router | Med | Label covered; invoice outside or digital |
| WhatsApp fatigue | P1 | Med | Only bonus or failed orders; cap of 4 messages per order |
| Volume shifts to 3PLs (~50% in Q1 FY27) | All | Med | Carrier-agnostic design (slide 9) |

---

## Slide 9: 10x, pay by difficulty · breadcrumb: 10x
**Headline:** Today the risk score is a filter. Tomorrow it's a price
**Story beat:** closes the loop with slide 1 ("price the hard stop"): the ₹15 is the first price; the network learns to price every stop.
- **① Three horizons** (staircase): now one ₹15 bonus on the riskiest 20% → 6–12 months a price per parcel by difficulty (risk × distance × address × time slot) → long-term every node paid per successful outcome; refused parcels become a local inventory network.
- **② Judge carriers by cost per success** (bar chart): cost per success = (forward + RTO% × ₹120) ÷ (1 − RTO%); Valmo **₹84.8** today → **₹77.7** at 14% RTO; Carrier A ₹45 at 10% RTO = ₹63 per success, Carrier B ₹40 at 20% = ₹80: **the cheaper parcel is the dearer delivery.** Meesho already allocates lanes by lowest cost with no fixed Valmo share (Q1 FY27 call, insight 15). We propose allocating by cost per *successful* delivery.
- **The price learns *when*, not just *whether*:** predicting when the customer is home cut delivery cost by up to 10.2% in a published study (Kandula et al., 2021; insight 16), so time slot is one of the price's inputs.
- **③ It learns and stays asset-light:** pilot data → learn which orders effort saves → set prices; works for Valmo and 3PLs; software + incentives on existing floor space (Vidit Aatrey: warehousing "tends to have lower ROI").
- **Footer:** Meesho Q1 FY27 earnings call (23 Jul 2026) · Kandula, Krishnamoorthy & Roy, *Decision Support Systems* 149 (2021) · MediaNama, 2 Feb 2026 (Aatrey quote) · our cost-per-success calculation.
- **Callout (the last words of the deck, echoing slide 1):** *"Money that carries no information can't coordinate a network. Price the hard stop."*

---

## Numbers cheat sheet (every figure on the slides)
| Figure | Value | Source |
|---|---|---|
| Valmo RTO | COD 20% · prepaid 5% · 17% blended | Case data pack |
| Costs | ₹50 forward (last mile ₹21) · ₹120 reverse | Case data pack |
| RTO by distance | 15% / 17% / 22% | Case data pack |
| Meesho RTO trend | 21.2% → 18.6% → 17.8% (FY23–25); ~70% of the drop from prepaid | Derived from RHP |
| COD vs prepaid failure | 22.3% vs 2.7%; COD = 96% of failures | Derived from RHP |
| COD success | 78.6% (FY24) → 77.7% (FY25) → 75.9% (H1 FY26) | RHP |
| Valmo orders FY25 | 763.5 mn; average order ₹265 | RHP |
| Bonus economics | break-even 8.6 (10.3–10.7 conservative); ₹62 cr (conservative, +15) to ₹184 cr (case, +20) a year; −3 RTO points at +15 | Our model (data pack) |
| Baseline of flagged orders | 60% (top 20%) / 51% (top 10%) | Our assumption |
| Pilot | 4 hubs, 24 pairs, ~12,000 flagged orders, 30 days, 8-week baseline; smallest effect ~4 per 100 | Our design / prototype |
| Chance of GO at +8 / +10 / +12 / +15 | 3 / 18 / 58 / 97% (top 20%) | Prototype, simulated |
| Score accuracy | top 20% catch ~46% of RTOs (random 20%) | Simulation only |
| Fake attempts | "no real attempt" ~9% of RTOs (our blend, build-up pending); ≤ ~1.5 RTO points addressable; review break-even ~1 in 10 | Our estimate / our model |
| 1 RTO point | ≈ 7.6 mn parcels ≈ ₹92 cr a year | Our calculation |
| Hold & Re-home | ₹145 per match, ₹8 to hold, break-even 5.5%; ₹50 / 140 / 270 cr | Our model |
| Hub pickup | about ₹112 net; never a delivery, never a bonus | Our model |
| Cost per successful delivery | ₹84.8 → ₹77.7 | Our calculation |
| City spread | Vadodara 18% vs Patna 35% | Shipway 2025 |
| TrustMesh | 166 mn listings; RTO down >10% | Q4 FY26 letter |

## Screenshot list (take on the current build before the freeze; Lucknow hub; never a real phone number or AWB)
1. `/pilot` default: GO, range diagram, ✔ Fair comparison, odds bar (slide 5)
2. `/pilot` at about +8: RE-PRICE with "Next: Run Pilot 2" (slide 5, optional)
3. `/pilot` yearly-rupees table (slide 5)
4. `/rider` Demo Bonus rider with the ₹ +15 chip (slide 4)
5. `/ops` after Autopilot + Close pilot: Bonus vs Control card + money ledger (slide 4)
6. `/audit` 14 green checks (slide 4, small)
7. `/desk` one parcel card: forecast, gates, expected value (slide 6)
8. `/desk` money tiles + Backtest panel (slide 6)
9. `/customer` second-chance message with four options and the pickup code (slide 6)
10. `/` landing **Demo-mode** QR (slide 1). Never a shared-day QR: it contains the live key.
11. *(After the hub-captain build)* the captain queue and the rider's strike meter (slide 4).

## Still to arrive (placeholders until then)
Survey n and results, rider/hub call findings (incentive size, dwell time, soft refusals), the cause-chart build-up (including the 9% "no real attempt" slice), more test orders, the mentor's feedback, the redrawn Flipkart-vs-Valmo visuals, source lines for Meituan / Uber Eats / DoorDash / Ekart, URLs for Delhivery QC-RVP and the Shadowfax margin.

**Where the Round 2 field research goes when it arrives** (slides 1–3 only get their `[PENDING]` boxes filled; their wording stays):
| Finding | Goes to |
|---|---|
| Survey n | Slide 1 evidence line and slide 2 methods footer (the `[n PENDING]` boxes) |
| Survey: top refusal reasons, metro vs small town | Slide 2 cause build-up; one "because" line on slide 6 (which second-chance option to lead with) |
| Survey: would you answer "Did the rider reach you?" / did a rider ever mark you unavailable without coming | Slide 4 fake-attempt row ("x of n buyers say a rider marked them unavailable without coming") and the 9% build-up |
| Rider/hub calls: what extra pay would make a rider wait or call again | Slide 4 "Why the rider" strip (replaces "reportedly" with our own number) |
| Rider/hub calls: how long refused parcels sit at the hub; "maybe later" refusals | Slide 6 callout (replaces "the pilot first measures…") |
| Rider/hub calls: who decides a failed attempt today | Slide 4 (who becomes the hub captain) |
