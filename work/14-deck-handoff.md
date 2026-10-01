# Team GPS: Round 2 deck handoff

> **READ FIRST (2 Oct, latest): build the deck from `28-deck-plan-final.md`.** It merges this file and 23 slide by slide. **Slides 0 to 3 stay exactly as written here (Gaurav, 2 Oct: do not change the Round 1 slides).** Use this file only for the look and feel (§3), the do-not-use list (§7) and sources.
>
> **Earlier note (2 Oct): `23-deck-plan-v5.md` overrides this file for slides 4 to 8, the numbers cheat sheet and the screenshots.** It has the final pilot numbers (smallest effect ~4 per 100, GO about 97 in 100 if the true effect is +15 and about 6 in 10 at +12), the Refused-Parcel Desk rewrite for slide 6, the fallback story (fake-attempt control + the Router), the hub-captain controls for slide 4, and the pilot-design decisions of 2 Oct (§10). Look, structure, sources and slides 0 to 3 and 9 still come from this file.

**Meesho DICE 3.0 · Business track · Case: Valmo, reducing RTO · Team GPS, IIT Bombay**

This file has everything you need to build our Round 2 deck: the story, how each slide should look, the exact numbers with sources, and what's still coming in from research and the prototype.

| | |
|---|---|
| Deliverable | **10 slides including the cover** (rules allow 6–10) |
| Team submits | **Sat, 3 Oct** |
| Hard deadline | **Sun, 4 Oct** (buffer only) |
| Also due | A working prototype + a 90-second video (Gaurav + Claude) |

> **v4, 1 Oct: what changed since v3.** This file now includes everything from `16-deck-changes-prototype-v2.md` and the simplified pilot design (`18-simplify-pilot-plan.md`). You don't need to read those two.
> 1. **Slide 5 pilot, rewritten simply:** we pair riders who were equally good last month and a coin picks who gets ₹15. We check both groups carry the same mix of risky parcels. The effect is the average bonus-minus-partner difference across the pairs.
> 2. **New decision rule:** GO only if even the **low end** of the range pays for itself (8.6 per 100). There are now **2 safety rules** (normal orders, fake attempts), and the rule is locked before the pilot starts.
> 3. **"If it doesn't pay" plan:** we never re-read the same data. We run **Pilot 2** with one lever changed (the top 10% or a smaller bonus). This is slides 5, 7 and 8.
> 4. **Scoring accuracy, shown and improvable (slide 4):** how well the score finds failing orders, which signals we'd add, and when the weights are updated.
> 5. **Number fixes:** row Δ=9 is +₹45 / −₹117; "₹62 cr (conservative) to ₹184 cr (case)"; the 60% is labelled our assumption; delete "12k orders detects +3".
> 6. **Headline rule:** always say what the bonus **caused** against the Control group, never "X% of risky orders delivered".

---

## 1. Start here

**Your job:** build the 10-slide PPTX in the **exact look and density of our Round 1 deck**. Start today with **version 1**: all slides laid out with the text below, plus clearly labelled placeholder boxes for what's still coming.

**Who does what**
- **You:** the deck
- **Gaurav + Claude:** prototype, screenshots, QR code, video
- **Research teammate:** survey results, rider/hub calls, test orders, cause-chart build-up

**The one rule: enhance, don't pivot.** Meesho penalises teams that change their idea after Round 1. Our Round 1 hero, the ₹15 rider bonus, stays the hero, and so does the Prevent / Rescue / Recover framing. Round 2 adds depth, evidence and a plan for refused parcels.

### What Meesho asked for

| Official ask | Our slide |
|---|---|
| ① Executive summary of diagnosis and recommendations | 1 |
| ② Where and why RTO happens, backed by research / data pack | 2 |
| ③ Prioritised solutions with expected impact and reasoning | 3, 4, 5 |
| ④ A specific proposal for refused / undelivered orders | 6 |
| ⑤ 30-60-90 plan to test the top ideas, with success measures | 7 |
| ⑥ Key risks and how we guard against them | 8 |
| (Scored separately) 10x and long-term thinking | 9 |

### How they score it, and where we earn each point

| Criterion | Where we win it |
|---|---|
| Quality of research (methods, sources, coverage) | Methods strip on slide 2, a sources footer on every slide, real Meesho + Flipkart test orders, Valmo's own rider contract |
| Depth of analysis | Sizing with the working shown (slides 2, 3, 5, 6) |
| Innovativeness | Rescue Bonus + Refused-Parcel Router: we found no one in India doing either (desk search, Sep 2026) |
| 10x and long-term thinking | Slide 9 |
| Feasibility | Runs on systems Valmo already has + a working prototype |
| Presentation | One message per slide, in the Round 1 look |

---

## 2. The story in 60 seconds

**Hypothesis (from Round 1):** COD fails because of **friction on both sides of the door**.
- **Customer side:** nothing is paid upfront, so refusing, changing your mind or not being home costs nothing.
- **Rider side:** riders are paid only on success, and the same for easy and hard stops. So risky COD stops get less effort: two calls, no wait, move on.

**Through-line for Round 2:** Meesho already predicts which orders will fail (its TrustMesh model), but that signal **stops before dispatch**. The rider at the door never sees it. **We carry that signal to the door and beyond**, and trigger the cheapest fix at each stage.

### Three moves

| When | Move | What it is | Impact |
|---|---|---|---|
| **Now** | **Rescue Bonus** | ₹15 extra to the rider, paid only when an order in the riskiest 20% is actually delivered, on any attempt (first or second). The rider never sees the risk score; nothing changes for the customer. A 30-day pilot decides whether it scales. | RTO ~17% → ~14% · ₹62 cr (conservative, +15 per 100) to ₹184 cr (case, +20 per 100) a year |
| **Next** | **Refused-Parcel Router** | Every refused parcel goes to its cheapest legal recovery: second chance → Hold & Re-home → batched return. No more automatic ₹120 trip back. | ₹50–140 cr/yr (up to ₹270 cr) |
| **Long-term** | **Pay by difficulty** | The risk score becomes a price across the network. Carriers are judged on cost per *successful* delivery. | ₹85 → ₹78 per success |

### Words to use (keep them consistent)

| Use | Meaning | Avoid |
|---|---|---|
| **RTO** | A shipped parcel that is never delivered and goes back to the seller | "return" (a different pool: delivered, then sent back) |
| **Rescue Bonus** | The ₹15 paid on a delivered Bonus-Eligible Order | incentive, risk-weighted incentive |
| **Bonus-Eligible Order** | An order in the riskiest 20%; the only signal the rider sees | risky / flagged / high-risk order |
| **Rescue Score** | TrustMesh's risk plus last-mile signals (distance, new address, phone reachability, past failures) | "our own ML model" |
| **Refused-Parcel Router** | The per-parcel decision at the hub: second chance / Hold & Re-home / batched return | reverse optimisation |
| **Hold & Re-home** | Hold an unopened refused parcel ≤48h and deliver it to a new nearby buyer of the same item, from the same seller, in the same state | local resale |
| **Pilot Verdict** | GO / RE-PRICE / KILL at the end of the 30-day test | result, outcome |
| **Bonus group / Control group** | Riders who get the ₹15 / their matched partners who don't | treatment, test arm |
| **Rider pair** | Two riders with the same past delivery rate; a coin decides which gets the bonus | cluster, stratum |
| **Pilot 2** | A new test with one lever changed (tighter score or smaller bonus), its rule fixed before it starts | re-run, re-analysis |

Round 1 lever codes map to Round 2 names **once, on slide 3 only**: R1 → Rescue Bonus; C1 → Refused-Parcel Router. After that, use only the Round 2 names.

---

## 3. Look and feel: match Round 1 exactly

Start from our Round 1 file, **`GPS_IIT Bombay.pptx`** (ask Gaurav for it). Duplicate a Round 1 content slide and replace its content, so the header art, logos and footer stay identical.

**Round 1 benchmark (measured from the file):**
- Canvas **20 × 11.25 in** (16:9)
- **~350–400 words** per content slide
- **66–91 shapes** per slide
- **Native, editable charts**
- Fonts **Graphik + Segoe UI**

**Slide grammar (every content slide):**
1. Round 1 title band with the DICE + meesho logos, and a **headline that states the message** (a full sentence, not a topic).
2. **Three numbered panels** (navy circle ①②③), each with a bold heading + grey sub-heading.
3. Bullets with **➢**, short lines, key numbers in bold.
4. At least one **native chart or diagram** per slide, plus one real quote where it fits.
5. A **pink "so what" callout box** near the bottom.
6. A **grey sources footer** in small text.

**Round 1 colours (from the Round 1 file):**

| Use | Hex |
|---|---|
| Pink accent | `#ED0B7D` |
| Navy | `#120A4A` |
| Body text | `#2B2650` |
| Purple | `#2A0680` |
| Green (GO) | `#4FBF83` |
| Callout background | `#FCF0F6` |
| Cream | `#FFF3D7` |

Verdict colours are the same as Round 1: **GO** green · **RE-PRICE** amber · **KILL** pink/red. Any Valmo app screens use Valmo navy `#092D5E`. That's intentional, because they're meant to look like Valmo's real apps.

---

## 4. Slide by slide

Text marked **[PENDING]** is still coming. Leave a clearly labelled placeholder box there.

### Slide 0: Cover
Same as Round 1: "REDUCING RTO: GETTING MORE ORDERS DELIVERED · Business Track · Team GPS, IIT Bombay". Optionally add "Round 2: Detailed Submission".

---

### Slide 1: Executive summary *(ask ①)*
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

### Slide 2: Where and why RTO happens *(ask ②)*
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

### Slide 3: Prioritised solutions with expected impact *(ask ③)*
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

### Slide 4: Rescue Bonus, how it works *(ask ③, the hero, + second-order effects)*
**Headline:** Same score, same app, same payout rail. Only the trigger changes
**Message:** The Rescue Bonus runs on systems Valmo already has, is new in how it targets, and is built so gaming doesn't pay.

**Top: 5-step flow (chevrons)**
1. **Score:** TrustMesh + last-mile signals
2. **Flag:** the riskiest 20% (capped)
3. **Show:** the rider app shows "Bonus Eligible · +₹15", never the score
4. **Confirm:** prepaid OTP, or COD cash reconciled at the hub the same day
5. **Pay:** ₹15 on Valmo's existing **"Additional Incentive"** line, direct to the rider's bank, held until the return window closes

**① Which score, and how good is it?**
- **TrustMesh decides who we ship to; the Rescue Score decides where effort pays.**
- **Day 1:** simple rules with visible weights. TrustMesh risk + distance from hub + new or unclear address + phone reachability + past failed attempts + COD.
- **How accurate it is:** one small bar: "Riskiest 20% by score catch **~46%** of all RTOs; random picking would catch 20%."
  - Label it **"in our simulation; measured on Valmo's last 90 days before the pilot starts"**. We don't claim a real accuracy we haven't measured.
- **How it gets better:**
  - Add "hard to deliver" signals: the pin code's past failed-delivery rate, a customer unreachable before, a gated or no-access address.
  - Re-weight after each pilot.
  - Then learn which orders the bonus actually **saves** (uplift), so we stop paying on orders that would succeed or fail anyway.

**② What the rider sees**
- Prototype screenshot: a Valmo-style "Today's Tasks" card with the green "₹ +15 Bonus Eligible" chip **[PENDING]**
- Round 1 rider-bag visual: ₹18 ×4 + ₹18+₹15
- Why targeted: a flat bonus on all COD orders only adds cost; only targeting pays for itself

**③ Is it new?**
- Meituan: a model-driven rider bonus, but for order *acceptance*
- Uber Eats / DoorDash: hidden extra pay for harder orders, also for acceptance
- Ekart: a first-attempt incentive on all orders
- Valmo today: an overall first-attempt incentive
- **We found no one who pays per order on the successful delivery of risk-flagged orders** (desk search, Sep 2026; copy the peer sources above into `10-sources.md` or cut the peers)

**Bottom: "Does it hold once people work around it?"**

| If someone works around it… | Control built in |
|---|---|
| Rider chases bonus orders, neglects normal ones | **Safety rule 1:** normal-order delivery must not drop more than 1 pt vs Control riders. A rider whose normal deliveries drop gets bonuses held. |
| Fake "delivered" / fake "attempted" | OTP or same-day COD cash reconciliation. Proof at the door: GPS, calls, wait time. **WhatsApp check "Did the rider reach you? Did you ask to reschedule?"** (Flipkart does this). Suspicious attempts go to a review queue: confirm / free re-attempt by another rider / strike (next build: the hub captain decides). **Safety rule 2:** Bonus riders' suspected fake-attempt rate more than 2 points above Control stops the pilot (judged once there are 30 attempts). 2 confirmed fakes block a rider's bonus. |
| Rider pressures a reluctant buyer | The bonus is held for the **7-day return window**; a return inside it takes the bonus back. Complaints are tracked. |
| Rider farms the bonus | Cap of ₹300 a day per rider. Paid on any attempt; if the same rider's earlier attempt on that order was weak and unconfirmed, the ₹15 waits in the 7-day hold for the hub captain's review (released by default). |
| Riders learn which areas get flagged | The score is never shown; it's shown as a bonus, not as risk; monitored by pin code |
| Flags creep up as the model drifts | Fixed 20% cap; score accuracy re-checked monthly |
| An extra trip for one stop slows the whole bag | ₹15 buys cheap effort (a 3rd call, a 10-min wait, a neighbour), not a second trip; on-time % tracked |

**The bonus's life:** earned at delivery → pending until the COD cash is deposited → **released after the 7-day return window** (or taken back on a return).

**Footer:** Valmo Delivery Services Agreement (Annex A, §3) · Meituan (arXiv 2202.10695, 2022) · Uber fare guide · Flipkart WhatsApp flow (real orders).

---

### Slide 5: Economics and how we'd test it *(asks ③ ⑤)*
**Headline:** One avoided return pays for eight bonuses. A fair 30-day test decides it
**Message:** Break-even is low, the upside is large, and a simple paired-rider pilot gives a clear decision, with a pre-planned next step if it doesn't pay.

**① Unit economics (per 100 flagged orders)** *(line chart: net vs Δ, two lines, break-even marked)*
- Baseline: **60 of 100 flagged orders are delivered without any bonus.** Label it: *"Our assumption: the riskiest 20% fail about 40% of the time, vs 17% overall. The pilot's Control group measures the real number."*
- Cost = ₹15 × (60 + Δ). The bonus is also paid on the 60 that would have been delivered anyway.
- Saving = ₹120 × Δ. Each extra delivery avoids one ₹120 return trip.
- **Break-even Δ ≈ 8.6 extra deliveries per 100 flagged.** Say it as **"one avoided return pays for eight bonuses"**, not "1 in 8", which is ambiguous.
- Conservative case (Valmo also pays the rider's ~₹18 fee on each rescued delivery, so each rescue saves ₹102): **Δ ≈ 10.3**. Show it as one small line, not a second headline.

| Deliveries of 100 flagged | Net per 100 (data-pack basis) | Net per 100 (conservative) |
|---|---|---|
| 69 (Δ=9) | +₹45 | −₹117 |
| 75 (Δ=15) | +₹675 | +₹405 |
| 80 (Δ=20) | +₹1,200 | +₹840 |

**② Sensitivity + scale** *(heat-map table: green positive, pink negative)*

Net ₹ cr/yr, for 153 mn flagged orders/yr (20% of 763.5 mn FY25 Valmo orders):

| Bonus \ Δ | +5 | +10 | +15 | +20 |
|---|---|---|---|---|
| ₹10 | −8 | 76 | 161 | 245 |
| ₹15 | −57 | 23 | 103 | 184 |
| ₹20 | −107 | −31 | 46 | 122 |

Cost per successful delivery: **₹84.8 → ₹77.7**

**The targeting lever** *(small 2-column table; this is Pilot 2's main option)*

| Who gets the bonus | Top 20% (Pilot 1) | Top 10% (Pilot 2 option) |
|---|---|---|
| Delivered anyway (our assumption) | 60% | 51% |
| Break-even | +8.6 per 100 | +7.3 per 100 |
| Flagged orders a year | 153 mn | 76.5 mn |
| Net a year at +15 per 100 | ₹103 cr | ₹62 cr |
| RTO points saved at +15 | −3.0 | −1.5 |

Line under it: *"A tighter score is cheaper per order and easier to prove, but the prize is smaller. That's why we start at 20%."*

**③ Pilot design: a fair test in 5 steps** *(numbered strip, one line each)*
1. **Fair groups:** in each of 4 hubs (2 metro, 2 small-town), sort riders by last month's delivery rate on risky parcels, pair neighbours, and **flip a coin in each pair**. 12 riders a hub gives **24 pairs**.
2. **Same parcels:** check that both groups carry the same mix of risky parcels (3 risk bands). Parcels stay on their normal routes.
3. **30 days:** about 100 flagged orders a hub a day, **~12,000 flagged orders**. An 8-week baseline comes before it.
4. **Simple maths:** for each pair, the bonus rider's delivery rate minus the partner's. **Effect = the average; range = average ± about 2 × spread ÷ √24.**
   - The smallest effect this pilot can reliably see is **~4 per 100** (24 pairs). This replaces "12k orders detects +3", which is wrong: it treated orders as independent.
5. **The rule, locked before day 1:**

| Verdict | Rule |
|---|---|
| **GO** | Even the **low end of the range** is at or above break-even (+8.6) and both safety rules hold |
| **RE-PRICE** | It helps (+3 or more) but isn't proven to pay → **run Pilot 2** with one lever changed |
| **KILL** | Under +3, or a safety rule breaks: normal orders down more than 1 pt, or Bonus riders' suspected fake attempts more than 2 points above Control |
| **Not enough data** | Fewer than 6 pairs, or under 90% of orders finished |

- *"Changing the rule after seeing the result makes it invalid."* This answers "did you pick the threshold after seeing the data?"
- One honest line: *"₹15 → more rider effort → more deliveries is our assumption. The pilot measures it."*
- *Visual:* the prototype's range diagram (bar vs the "pays above" and "stop below" lines) **[PENDING screenshot]**
- Example to quote (prototype, simulated): *"If the bonus truly adds +15 per 100, this pilot says GO about 97 times in 100. At +12 it is about a coin flip (6 in 10). At +10 or less it usually says RE-PRICE, and we'd run Pilot 2."* (Final numbers, 2 Oct.)

**Callout:** "₹120 to haul a parcel back; ₹15 to make the hard stop worth it. If it doesn't pay, we change one lever and test again; we never re-read the data."
**Footer:** case data pack · Swiggy/Zomato rain pay (the Indian precedent for per-order difficulty pay) · Butschek et al., *Labour Economics* 2022 (responses vary by worker, so pilot first).

---

### Slide 6: Refused parcels *(ask ④)*
**Headline:** Send each refused parcel to its cheapest legal recovery. Only the rest travels back
**Message:** A per-parcel router with three lanes, each checked against GST, consumer, privacy and foreign-investment rules.

**① Why it matters**
- A return costs **₹120 = 45%** of Meesho's ₹265 average order
- Meesho bears it (sellers aren't charged for RTO)
- ~**130 mn** RTO parcels a year (763.5 mn × 17%)
- The industry default is to send it back (Shopee: refuse once → return to sender)
- **We found no marketplace that re-homes refused parcels from the last-mile hub** (desk search, Sep 2026). The prior art is patents (Pitney Bowes, expired; Shopify) plus one small Indian firm doing it from its own warehouse.

**② The Router, 3 lanes** *(decision diagram with a legal tick on each lane)*
- Each parcel takes the lane with the best **expected value** (chance it works × saving − cost), tried in this order: second chance → hold & re-home → batched return.
- Timers: second chance 24h; on the shelf at most 48h; shelf capacity 30 parcels.
- **Savings count only when a parcel is actually delivered.** A re-homed parcel that then fails goes back in a batch, with no saving.
- A seller who hasn't opted in is never overridden.
1. **Second chance** (legally clean): WhatsApp reschedule · hub pickup · another address in the same state *(planned; not in the prototype)* · pay now. Saves the original sale.
2. **Hold & Re-home** (clean if same state): unopened, seal checked, **seller state = hub state = buyer state**, and the seller has opted in for that product. Saves ~₹145 per match.
3. **Batched return** (clean): everything else, grouped by seller. US programmes report up to 20–40% cheaper.

**③ Hold & Re-home: break-even and rules** *(break-even line chart)*
- Holding for 48h costs ≈ ₹8 and a match saves ₹145, so **break-even is a 5.5% match rate**. We don't claim a match rate.
- Sizing: ~₹50 / 140 / 270 cr at a 2.5 / 7 / 13.5% effective match rate
- **Start with non-GST sellers.** By law they sell only within their own state, so every refused parcel of theirs already qualifies.
- Pilot in **Uttar Pradesh**, the #1 seller state (15.9% of sellers)
- The seller opts in and sets the rules; the first nearby order gets the parcel; the seller issues the invoice; ownership never passes to Meesho
- Router screenshot **[PENDING]**

**Callout:** the pilot first measures how long refused parcels sit at the hub today, the share of "maybe later" refusals, and the match rate. Kill it if the match rate is below 3% after 30 days, or if any custody incident happens.
**Footer:** GST s.2(85), IGST s.10(1)(a), Notif. 34/2023-CT · FDI Press Note 2 (2018) · Consumer Protection (E-Com) Rules 2020 · DPDP Act 2023 · UPS Happy Returns / Optoro · Meesho RHP (seller states).

---

### Slide 7: 30-60-90 plan *(ask ⑤)*
**Headline:** Every phase ends with a number that decides the next

| | Days 0–30 | Days 31–60 | Days 61–90 |
|---|---|---|---|
| **Rescue Score** | Before day 0: measure score accuracy on Valmo's last 90 days (share of RTOs the top 20% catch) | Add "hard to deliver" signals (pin-code failure history, unreachable before, gated address) and re-weight from pilot data | Start learning which orders the bonus saves (uplift) |
| **Rescue Bonus** | Pilot 1: 4 hubs, 24 rider pairs, top 20%, rule locked | **If GO:** extend to one region (~40 hubs) and test the price there (hubs randomly at ₹0 / ₹10 / ₹15, each compared with its own baseline and the ₹0 hubs). **If RE-PRICE:** Pilot 2 with one lever changed (top 10% or ₹10), new rule locked first | Scale decision; start difficulty-priced bonus tiers |
| **Refused-Parcel Router** | UP cluster (3 hubs): measure dwell time + soft refusals; second-chance lane live | Manual Hold & Re-home with 30–50 opted-in same-state sellers (non-GST first); batched returns | Automate matching if match rate ≥ 5.5% |
| **P1 / P2** | — | Two-way WhatsApp on bonus orders in pilot hubs; address fix in 1 small-town hub | Decide on each |
| **Success metric** | Low end of the uplift range ≥ break-even (+8.6 per 100); normal orders Δ ≤ 1 pt; suspected fakes ≤ Control + 2 pts | Cost per rescued order ≤ ₹120; match rate vs 5.5%; WhatsApp reply rate | Valmo RTO and cost per successful delivery vs baseline |
| **Kill trigger** | Uplift < +3, or a safety rule breaks | Match rate < 3%; any custody incident | Net ₹ negative for 2 months |

*Visual idea:* a small loop **Pilot 1 → learn → Pilot 2 → scale**, with "one lever changed, rule locked before it starts" on the arrow.

**Side:** a KPI tree. North star = cost per successful delivery → RTO % → uplift per 100 flagged / match rate.
**Owners:** Valmo last-mile ops (bonus), reverse ops (router), data science (score), customer comms (WhatsApp).

---

### Slide 8: Risks and second-order effects *(ask ⑥)*
**Headline:** The ways this could break, and what we do about each
**Layout:**
- ① risk matrix (likelihood × impact)
- ② the risk table below
- ③ a "who works around it" quadrant (riders / hubs / customers / sellers)

| Risk | Move | Likelihood | Guard |
|---|---|---|---|
| Uplift below break-even | Rescue | Med | RE-PRICE → Pilot 2 with one lever changed; the bonus switches off cleanly |
| Moving the goalposts after seeing results | Rescue | Low | Rule locked before day 1; changing it makes the verdict invalid; changes go into a new pilot only |
| Unfair groups (better riders get the bonus) | Rescue | Low | Riders paired on past delivery rate, coin flip in each pair; parcel-risk mix checked in both groups |
| Riders game the bonus | Rescue | Med | OTP/cash proof, held payout, customer WhatsApp check, review queue, suspected-fake safety rule (no more than 2 pts above Control), normal-order floor |
| Buyers pressured into orders | Rescue | Low–Med | Bonus held 7 days and taken back on a return; complaints tracked |
| Score misses hard orders / drifts | Rescue | Med | 20% cap; accuracy measured before the pilot and monthly; new "hard to deliver" signals |
| Theft from held parcels (Surat 2026: 33,035 Meesho parcels faked as "delivered") | Router | Med | Scan in/out, old ↔ new order link, OTP to the new buyer, 48h cap, daily shelf count |
| Cross-state GST exposure | Router | Blocked by rule | Same-state only; non-GST sellers first |
| Marketplace seen as controlling stock (FDI) | Router | Low–Med | Seller opt-in and rules; neutral allocation; seller keeps title |
| Buyer 1's data on the parcel (privacy) | Router | Med | Label covered; invoice moved outside or made digital for opted-in sellers |
| Match rate too low (long-tail catalogue) | Router | High | Lanes 1 and 3 still save money |
| WhatsApp fatigue / low replies | P1 | Med | Only bonus or failed orders; one message per order |
| Volume shifts from Valmo to 3PLs (~50% in Q1 FY27) | All | Med | Carrier-agnostic design (slide 9) |

---

### Slide 9: 10x, pay by difficulty
**Headline:** Today the risk score is a filter. Tomorrow it's a price

**① Three horizons** *(staircase graphic)*
- **Now:** one ₹15 bonus on the riskiest 20%
- **6–12 months:** a price per parcel by difficulty (risk × distance × address × time slot)
- **Long-term:** every node paid per successful outcome; refused parcels become a local inventory network

**② Judge carriers by cost per success** *(bar chart: A vs B, per parcel vs per success)*
- Meesho already gives each lane to its cheapest provider (Q1 FY27 call)
- Cost per success = (forward + RTO% × ₹120) ÷ (1 − RTO%)
- Valmo: **₹84.8** today → **₹77.7** at 14% RTO
- Carrier A: ₹45 at 10% RTO = ₹63 per success. Carrier B: ₹40 at 20% = ₹80. **The cheaper parcel is the dearer delivery.**

**③ It learns, and stays asset-light**
- Pilot data → learn which orders effort saves → set prices
- Works for Valmo and 3PL partners alike
- Software + incentives on existing floor space; no warehouses (Vidit Aatrey: warehousing "tends to have lower ROI")

**Callout:** *"Money that carries no information can't coordinate a network. Price the difficulty."*

---

## 5. Numbers cheat sheet

Use these exact figures. If a number isn't here, ask before using it.

| Figure | Value | Source (for footers) |
|---|---|---|
| Valmo RTO (data pack) | COD 20% · prepaid 5% · 17% blended | Case data pack |
| Costs | ₹50 forward (last mile ₹21) · ₹120 reverse | Case data pack |
| RTO by distance from hub | 15% / 17% / 22% at ~2 / 5 / 10 km+ | Case data pack |
| Meesho RTO trend | 21.2% → 18.6% → 17.8% (FY23–25) | Derived from RHP (COD share × success) |
| COD vs prepaid failure | 22.3% vs 2.7% (~8x); COD = 96% of failures | Derived from RHP |
| Share of drop from the prepaid shift | ~70% (69–71%) | Our decomposition of RHP numbers |
| COD success | 78.6% (FY24) → 77.7% (FY25) → 75.9% (H1 FY26) | RHP |
| Prepaid share | ~37% of shipped orders (Q1 FY27) | Q1 FY27 shareholder letter |
| Valmo share of shipments | 48% FY25 → 64.5% H1 FY26 → ~50% Q1 FY27 | RHP; Q1 FY27 earnings call |
| TrustMesh | Monitors 166 mn active listings; RTO down >10%; ~9 mn transactions blocked in FY26 | Q4 FY26 shareholder letter |
| Average order value | ₹265 | RHP |
| Valmo orders FY25 | 763.5 mn | RHP |
| Rider pay | ~₹18 per delivery ("reportedly") | Franchise write-ups (weak; say "reportedly") |
| Rider contract facts | Paid on successful delivery, direct to bank; "Additional Incentive" line; first-attempt-rate incentive; refusal needs the customer's OTP; Valmo calls to verify failed attempts | Valmo Delivery Services Agreement (valmo.in) |
| Seller states | UP 15.9% · Gujarat 15.7% · Delhi 13.8% | RHP |
| City spread / delivery time | Vadodara 18% vs Patna 35%; 22% → 35% (1–2 → 5+ days) | Shipway ShipNotes, 2025 |
| WhatsApp case | −45% RTO losses, +50% contact rate | Tata Comms × Shiprocket (vendor-reported, undated) |
| Bonus economics | Break-even Δ 8.6 (10.3 if the ₹18 rider fee is counted); ₹62 cr (conservative, +15) to ₹184 cr (case, +20) a year; −3 RTO pts at +15 | Our model (data pack) |
| Baseline of flagged orders | 60% delivered without the bonus (top 20%); 51% (top 10%) | **Our assumption**, calibrated to the data pack's 17%; the Control group measures it |
| Top 10% option | Break-even 7.3; 76.5 mn flagged a year; ₹62 cr/yr at +15 | Our model (data pack) |
| Pilot size | 4 hubs · 12 riders a hub = 24 pairs · ~100 flagged a hub a day · 30 days ≈ 12,000 flagged orders | Our pilot design |
| Smallest effect the pilot can see | ~4 extra deliveries per 100 (24 pairs; ~5 at the top 10%) | Prototype /pilot, simulated |
| Rescue Score accuracy | Top 20% catch ~46% of RTOs (random 20%) | **Simulation only**; to be measured on Valmo data |
| 1 RTO point | ≈ 7.6 mn parcels ≈ ₹92 cr/yr | Our calculation |
| Hold & Re-home | ₹145 saved per match; ₹8 to hold; break-even 5.5% | Our model (data pack) |
| Cost per successful delivery | ₹84.8 → ₹77.7 | Our calculation (data pack) |

---

## 6. Fix these from Round 1

Research showed a few Round 1 lines were slightly off. Correct them in Round 2.

| Round 1 said | Round 2 should say |
|---|---|
| "166M listings screened" | "monitors 166M active listings; RTO down >10% since deployment" |
| "Valmo over 50% (FY25)" | "48% FY25 → 64.5% H1 FY26 → ~50% Q1 FY27" |
| "About three-quarters came from prepaid" | "About 70%" |
| "Incentives reward volume and speed" | "Today's incentive tracks the rider's overall first-attempt rate, not how hard a given order is" |
| "The rider app flag exists" | "The rider app already shows per-order details and incentives" |
| "Flexible delivery options already offered on Valmo" | Remove, unless someone has a source |
| RTO 21.2 / 18.6 / 17.8% (unlabelled) | Add "derived from RHP" |
| "Paid only after customer-confirmed delivery" | "Prepaid OTP, or COD cash reconciled at the hub the same day" |
| "Paid via Valmo's existing rider bonus system" | "Paid on Valmo's existing 'Additional Incentive' line, direct to the rider (per its published delivery agreement)" |

---

## 7. Do not use (checked and rejected)

- "Beauty brand cut RTO from 28.62% to 5.47%" (Shiprocket, 17 Sep 2026): not found anywhere
- "Shiprocket 2026 AI address-quality alerts": not found
- "Sep 2026 Shiprocket intelligence layer": not found as stated
- The "42% refused / 28% unavailable / 18% wrong address" split: an SEO blog with no method
- "RTO is 40–50% of shipments": contradicts the audited ~18%
- "15% of failed deliveries are fake attempts": unsourced
- "NDR recovery 30–40%": a vendor blog, no source
- Any Pareto or "80/20" figure about Meesho products: unsourced
- Partial COD or COD restriction as *our* idea: the brief rules out checkout friction
- "12,000 orders detects +3 per 100": per-order maths; riders' orders aren't independent (use ~4, from the paired design)
- "X% of risky orders delivered" as the bonus's result: some would have been delivered anyway; say what the bonus **caused** vs Control
- "GO at +9": GO now needs the **low end of the range** above break-even
- Any real-world Rescue Score accuracy figure: we only have a simulation number
- Stats jargon on slides ("clustered", "ICC", "design effect", "MDE", "t-value"): use "fair pairs", "range" and "smallest effect it can see"

---

## 8. Still coming in (leave placeholders)

| Item | Goes on slide | From | Expected |
|---|---|---|---|
| Survey results (n, split by city type) | 2, 3, 6 | Research teammate | Sep 30 |
| Rider/hub call findings (incentive size, how long refused parcels stay at the hub, soft refusals) | 2, 4, 6 | Research teammate | Sep 30 |
| Cause-chart build-up (source + n per slice) | 2 | Research teammate | Sep 30 |
| More test orders (COD vs prepaid; answered vs not) + the app's failure reason | 2 | Gaurav / team | Sep 30 |
| Redrawn Flipkart vs Valmo WhatsApp visuals | 3 | You (the text is in slide 3 above) | — |
| Prototype screenshots: rider app, ops console, refused-parcel desk | 4, 6 | Gaurav + Claude | Oct 2 |
| Prototype QR code + live link | 1 | Gaurav + Claude | Oct 2 |
| Mentor feedback (call before Oct 1) | any | Whoever joins | Oct 1 |
| **Done 2 Oct:** final pilot numbers (see `23-deck-plan-v5.md` §3: GO ~97 in 100 at +15, about 6 in 10 at +12, smallest effect ~4) | 5 | Gaurav + Claude | Done |
| Pilot screenshot: range diagram + "✔ Fair comparison" line | 5 | Gaurav + Claude | Oct 2 |

---

## 9. Timeline

| Date | Deck (you) | Prototype | Research |
|---|---|---|---|
| Tue 29 Sep | v1: all 10 slides laid out with placeholders | — | Survey push, calls, test orders |
| Wed 30 Sep | Team review → v2; add research findings | Setup, maths, maps | Results handed over |
| Thu 1 Oct | Tighten; check every number against the cheat sheet | Rider app, ops console, WhatsApp, deploy | Fact-check the deck |
| Fri 2 Oct | Insert screenshots + QR; final polish | Simulator, refused-parcel desk, video | — |
| **Sat 3 Oct** | **Freeze, full dry run, submit.** Sun 4 Oct is buffer only. | | |

---

## 10. Your checklist

- [ ] Got the Round 1 PPTX and duplicated a content slide as the base
- [ ] Slides 1–9 laid out with headline + 3 panels + callout + footer
- [ ] Native charts: distance bar, COD vs prepaid, break-even line, sensitivity heat table, cost-per-success bars
- [ ] All [PENDING] placeholders clearly boxed and labelled
- [ ] Round 1 fixes applied (section 6)
- [ ] Every number matches the cheat sheet; nothing from the "do not use" list
- [ ] No personal data on slides (no phone numbers, OTPs, order numbers)
- [ ] ~350–400 words per content slide; nothing overflowing
- [ ] v1 shared with the team for review
- [ ] v4 changes applied: slide 5 rewritten (paired pilot, new rule, targeting table), slide 4 score accuracy + controls, slide 6 Router rules, slide 7 Pilot 2 row + score row, slide 8 new risks
- [ ] "₹62–184 cr" written everywhere as "₹62 cr (conservative) to ₹184 cr (case)"
- [ ] 60% labelled as our assumption wherever it appears
