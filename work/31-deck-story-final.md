# 31: The deck as one story (final plan, 3 Oct 2026)

**Use this file to rebuild the draft.** It supersedes the slide plans in `deck.md` and `30` where they differ (30's layout and polish notes still apply). Cover + 10 slides.

## The story in six sentences (what every slide serves)
1. We started with **one hypothesis**: riders give hard COD stops less effort because they're paid the same for every stop.
2. We went to **riders, buyers and hubs**, placed our own orders and read Valmo's rider contract, and found that **most failed orders could still have been delivered**: they fail because the customer wasn't ready, the attempt wasn't real, or (less often) the customer didn't want it.
3. So we propose **one pilot**: pay riders a bonus for delivering hard orders, to test whether pay changes effort.
4. A bonus alone puts the whole burden on the rider, so **alongside it we build two things for every rider, in both groups**: an **attempt check** that shows whether a failed attempt was real, and **two-way WhatsApp** that gives the customer a voice. Together they're a second way to bring RTO down, whatever happens to the bonus.
5. The pilot runs for **three months, and each month's result decides the next**: if riders respond but the bonus doesn't pay for itself, we **pay smarter**: only on the next attempt, only after a genuine attempt and a customer who still wants the parcel; a fake attempt means a strike and no bonus.
6. **Everything is built and running in our prototype.** Recovering refused parcels and pricing every stop are the ideas that come after.

## Rules for the whole deck
- **Every number appears once**, on the slide where it's explained, with its source. (See the number budget at the end.)
- **Clean slides:** a two-line headline, one message line, three panels, one visual, one prototype screenshot where it proves something, a small sources footer, a bridge line in small italics (no "Bridge:" label).
- **No "Round 1 / Round 2"** on any slide. Our earlier work is "our first hypothesis".
- **We propose a pilot, not a rollout.** Say so plainly on slides 1, 4 and 6.
- **Results we haven't measured are never shown as results.** Slide 6 is a worked example of how the pilot unfolds, simulated in our prototype; the real pilot replaces it.
- One name per idea: **Rescue Bonus** · **Attempt check** · **Two-way WhatsApp** · **Refused-parcel router** · **Delivery map**.

## Headline test (read only these, in order)
1. We spoke to riders, buyers and hubs: most failed orders could still be delivered. So we're piloting one fix, with two checks built alongside it
2. Where orders fail: COD at the door, for three reasons, and only one of them is a customer who changed their mind
3. From one hypothesis to a complete answer: pay for the hard stop, check the attempt was real, and hear the customer
4. How we'll run the pilot: four hubs, matched riders, a coin toss, and the rule fixed before day one
5. The attempt check and two-way WhatsApp work for every rider, bonus or not
6. Three months, one question each, and each answer decides the next
7. Does it pay? The bar is low, the upside is large, and paying smarter lowers it further
8. A separate idea for orders customers refuse: find each parcel its cheapest way back
9. Every way to game it has a guard
10. Today the risk score is a filter. Tomorrow it's a price, on Meesho's own delivery map

---

## Slide 0: Cover
"REDUCING RTO: GETTING MORE ORDERS DELIVERED · Business Track · Team GPS, IIT Bombay".

---

## Slide 1: Executive summary (the whole story on one page; research loud)
**Headline:** *We spoke to riders, buyers and hubs: most failed orders could still be delivered.* / *(pink)* *So we're piloting one fix, with two checks built alongside it.*
**Message line:** **17%** of Valmo orders never arrive. *(the only problem number on this slide)*

**① What we did and heard** (the research, loud: a band of five icons with counts, then three findings)
- 🛵 **12 rider interviews** · 🛍️ **25+ COD buyers surveyed** · 🏘️ **field visits in metro and Tier 3/4 towns [n]** · 📦 **our own test orders** · 📄 **Valmo's rider contract**
- *"For COD we call once or twice; if no one answers we move on."* Riders give hard stops less effort; the pay is the same for every stop.
- **Parcels arrive before customers expect them**, and the cash isn't ready.
- **A failed "attempt" isn't always a real attempt.**
- → **7 in 10 failed orders could still have been delivered.**

**② What we're doing** (three numbered cards, one line each)
1. **Pilot the Rescue Bonus:** pay the rider extra for delivering a hard order. *Does pay change effort?*
2. **Build the attempt check:** GPS, calls, waiting time and the customer's reply show whether a failed attempt was real, for every rider.
3. **Build two-way WhatsApp:** the customer can say "I'm home", "pay by UPI", "come later", or "the rider never came".
- One line under the cards: *"A bonus alone puts the whole burden on the rider. The two checks show what really happened at the door, and bring RTO down on their own."*

**③ How the pilot decides** (a three-step strip)
**Month 1 · Pay** → **Month 2 · Check and listen** → **Month 3 · Scale, pay smarter, or stop**. *"Each month's result decides the next. If the bonus doesn't pay, the checks still do."*

**④ What it could mean**
- If the pilot confirms it: **RTO from 17% to about 14%**.
- **Built and running in our prototype:** [QR] try it in six minutes, no sign-in.

**Bottom strip:** *Beyond the pilot: a router for refused parcels, and a price per stop on Meesho's own delivery map.* · *No new assets: everything runs on Valmo's existing app, payout line and WhatsApp.*
**Footer:** case data pack · our research (interviews, survey, field visits, test orders) · Valmo Delivery Services Agreement.
**Bridge:** *Here is where and why orders fail.*

---

## Slide 2: What we found (ask ②: where and why)
**Headline:** *Where orders fail: COD at the door, for three reasons,* / *(pink) and only one of them is a customer who changed their mind*
**Message:** Meesho's push to prepaid cut RTO; what's left is cash-on-delivery, and our research shows why it fails.

**① Where** (two small charts)
- RTO 21.2% → 18.6% → 17.8% (FY23–25), about 70% of the fall from more prepaid. COD still fails at **22.3%** vs **2.7%** prepaid (8×), and is **96%** of failures. *Source: Meesho RHP, rates derived by us.*
- Each failure costs **₹170** (₹50 out + ₹120 back) vs **₹50** for a delivery. Failure rises with distance from the hub, **15% → 22%**, and from city to city (**Vadodara 18%, Patna 35%**). *Sources: data pack; Shipway 2025.*

**② Why: three kinds of failure** (the donut + the two-question sorter from the draft)
| **Not ready · 40%** | **Not reached · 31%** | **Not wanting · 29%** |
|---|---|---|
| wants it, wrong moment: came early, no cash · not home · phone off | never got a fair chance: a landmark address · wrong hub · "attempted", no knock | changed mind · cheaper elsewhere |
*Split: our blend of rider and buyer research, the industry's failed-delivery mix, and the data pack; two-way WhatsApp will measure the real split.*

**③ What we heard** (two quotes + three field findings + the real order)
- Buyer: *"We order on COD and keep watching prices on other apps…"* (our survey)
- Rider: *"For prepaid we call three or four times and wait. For COD we call once or twice… and we do not go back."* (our interviews)
- Field visits, metro and Tier 3/4: parcels arrive before the promised date and the cash isn't there · addresses are landmarks, not house numbers · hubs earn **₹5** per delivered parcel.
- **Our own order** (redrawn strip): promised 3 Oct → arrived 28 Sep, no warning → "Arriving Today" → the rider called twice and didn't wait → "Failed Delivery".

**Methods strip:** 12 rider interviews (Mumbai hubs) · COD buyer survey (25+) · field visits, metro + Tier 3/4 [n] · test orders on Meesho and Flipkart · Valmo's rider contract · Meesho filings · case data pack.
**Bridge:** *So what do we do about each kind?*

---

## Slide 3: From one hypothesis to a complete answer (ask ③: prioritised solutions)
**Headline:** *From one hypothesis to a complete answer:* / *(pink) pay for the hard stop, check the attempt was real, and hear the customer*
**Message:** Our first idea was the bonus. Our research showed why the bonus alone isn't enough, so two more parts were added.

**① Where we started** (the rider's bag visual): today every stop pays the same **₹18**, easy or hard, only on success. The hypothesis: *if the hard stop paid more, riders would try harder.* The Rescue Bonus tests it.

**② Why the bonus alone isn't enough** (three short points)
- It puts the whole burden on the rider: we'd see more deliveries, but not whether attempts were real.
- It can't tell a customer who isn't ready from one who doesn't want the parcel.
- A bonus without checks invites gaming: a fake "attempted" today, a paid delivery tomorrow.
→ **So we add the attempt check and two-way WhatsApp, for every rider, in both groups.**

**③ All five ideas, prioritised** (the impact × effort map from the draft, colour-coded by kind of failure)
| Idea | Fixes | Status |
|---|---|---|
| **Rescue Bonus** | not ready | **The pilot** |
| **Attempt check** | not reached | **Built alongside the pilot** |
| **Two-way WhatsApp** | not ready | **Built alongside the pilot** |
| Learned doorsteps | not reached (addresses) | Later, part of the delivery map (slide 10) |
| Refused-parcel router | not wanting | A separate idea (slide 8) |
*Excluded by the brief: forcing prepaid, COD limits, fees, extra checkout steps. Already running at Meesho: prepaid nudges, TrustMesh risk filtering, predictive routing, address geocoding.*
**Bridge:** *How do we test the bonus fairly?*

---

## Slide 4: How we'll run the pilot (ask ⑤, part 1: the design)
**Headline:** *How we'll run the pilot:* / *(pink) four hubs, matched riders, a coin toss, and the rule fixed before day one*
**Message:** A fair test isolates what the bonus causes, against riders who don't get it, over the same weeks.

**① Who and where** (a map icon with four pins)
- **4 hubs:** 2 metro + 2 small-town, because the same fix may not work everywhere.
- **12 riders a hub**, sorted by how well they delivered last month; neighbours are paired, so **24 pairs**.
- **A coin decides** who in each pair gets the bonus (Bonus group) and who doesn't (Control group).
- An **8-week baseline** before day one confirms each pair delivers alike.

**② What changes for whom** (a two-column picture: Bonus rider / Control rider)
- The riskiest **20%** of orders, by Meesho's risk score plus last-mile signals, are flagged; both riders carry the same mix of flagged orders.
- **Bonus rider:** a flagged order shows "Bonus Eligible · +₹15"; ₹15 when it's delivered, on any attempt, held 7 days. **Never the risk score.**
- **Control rider:** the same order looks normal.
- **Both riders:** the attempt check and two-way WhatsApp (slide 5).

**③ What we measure, and the rule** (fixed before day one; changing it later voids the result)
- Flagged orders delivered, Bonus vs Control, pair by pair · normal orders (must not suffer) · suspected fake attempts per group · returns and complaints.
- The test can reliably see a difference of about **4 extra deliveries per 100** flagged orders.
- Three outcomes: **GO** (it works and pays) · **PAY SMARTER** (riders respond, but it doesn't pay) · **STOP** (riders don't respond).

**Live in our prototype:** the pilot page (the verdict, the range against break-even, the ✔ Fair comparison line) and the Ops Bonus-vs-Control card. *It runs the exact rule above on simulated orders.*
**Bridge:** *And while the bonus is tested, the two checks run for everyone.*

---

## Slide 5: The attempt check and two-way WhatsApp (built for every rider)
**Headline:** *The attempt check and two-way WhatsApp* / *(pink) work for every rider, bonus or not*
**Message:** They show what really happened at the door, so the pilot measures real effort, and they cut RTO on their own.

**① The attempt check: was it a real attempt?** (four evidence icons → two outcomes)
- Every "attempted" records **GPS distance from the door, calls made, minutes waited**, and the **customer's reply**.
- **Genuine:** near the door and called or waited, or the customer confirms. **Suspect:** more than **500 m** away, no calls, or "the rider never came".
- Suspect attempts go to the **hub captain**, who earns only on delivered parcels and so wants real attempts: confirm, free re-attempt by another rider, or a **strike** (with a reason and evidence; Ops can overturn it within 48 h).

**② Two-way WhatsApp: the customer's voice** (two phone mock-ups)
- **Before an early arrival:** "Your parcel is arriving early, today." → Keep my date · Pay by UPI now · Choose a time.
- **After a failed attempt:** "Did the rider reach you? Still want it?" → Yes, they came · No, they didn't · I don't want it.
- At most **4 messages** per order. Modelled on the delivery messages Flipkart already sends.

**③ Why both matter** (three lines)
- The rider gets a reason to try; the customer gets a voice; the hub gets evidence.
- In the pilot they make the comparison honest: real effort, not just more "attempted" taps.
- **On their own**, they target the failures that aren't real attempts and the customers who aren't ready.

**Live in our prototype** (three screenshots): the rider app's "Attempted" (logs GPS, calls, wait) · the customer's WhatsApp · the hub captain's queue with an evidence card (909 m away, 0 calls, "nobody came"). *Tested by 1,253 automated checks and 18 audits on every simulated day.*
**Bridge:** *Here is how the three parts come together, month by month.*

---

## Slide 6: The pilot, month by month (ask ⑤, part 2: what each result triggers)
**Headline:** *Three months, one question each,* / *(pink) and each answer decides the next*
**Message:** A worked example, simulated in our prototype: how the pilot unfolds if riders respond but the bonus doesn't yet pay for itself, the case we plan for.

| | **Month 1 · PAY** | **Month 2 · CHECK AND LISTEN** | **Month 3 · PAY SMARTER** |
|---|---|---|---|
| **The question** | Does paying for the hard stop change rider effort? | Does the effect survive when every failed attempt is checked? What do customers say? | Can we pay only where the bonus truly rescues an order? |
| **What runs** | Bonus on flagged orders, any attempt · the attempt check and WhatsApp switched on for both groups, recording | Strikes enforced for both groups · a Bonus rider with a suspect attempt loses that ₹15 · customer replies collected | Bonus only on the **next attempt** by the **same rider**, and only if: the last attempt was **genuine** (near the door, called, waited) **and** the customer said they **still want it** · a fake attempt = a **strike and the bonus blocked** |
| **What we'd look for** | Bonus riders deliver more flagged orders than their pairs | The difference holds; suspect attempts don't rise in the Bonus group; replies show who's "not ready" | More rescues per rupee; first-attempt deliveries don't fall; deliveries don't get slower |
| **In the worked example** | ✔ Riders respond, but not enough to pay for every bonus | ✔ The effect holds under the checks | → Pay smarter becomes the rule to scale |

**The other two branches** (a thin fork after month 1):
- **If month 1 shows it already pays** → month 3 prepares to **scale**: one region, a share of riders kept as Control.
- **If riders don't respond** → **stop the bonus**; the attempt check and two-way WhatsApp carry on, because they never depended on it.

**Why "pay smarter" is safe:** it pays only after a genuine, high-effort attempt and a customer who still wants the parcel, and it stops if first-attempt deliveries fall or deliveries slow down. A rider can't earn it by faking an attempt.
**Live in our prototype:** the Ops close-of-pilot card (verdict + the money ledger) and the 18 green audit checks.
**Bridge:** *Does any of this pay?*

---

## Slide 7: Does it pay? (ask ③: expected impact)
**Headline:** *Does it pay? The bar is low, the upside is large,* / *(pink) and paying smarter lowers the bar further*
**Message:** The bonus pays when enough extra deliveries replace returns; the pilot measures whether they do.

**① The rule** (one line, large): *Extra deliveries × ₹120 return avoided > ₹15 × every bonus paid.* **One avoided return pays for eight bonuses.**
**② Paying on any attempt** (line chart + the value table)
- **Break-even: about 9 extra deliveries per 100 flagged orders** (8.6), because 60 of every 100 flagged orders would arrive anyway, and they get the bonus too. *(Our assumption; the Control group measures it.)*
- What it's worth a year (₹ cr): the draft's heat-map. At **+15 extra per 100**: **₹103 cr a year net** and **−3 RTO points**; at +5 it loses money. *"That's why we pilot first."*
**③ Paying smarter**
- Paying only on genuine next attempts goes to far fewer orders that would have arrived anyway: **break-even about 7 extra per 100** re-attempts.
- **The checks on their own:** a recovered delivery saves **₹99** (₹120 return − ₹21 re-attempt); a hub captain's review costs about **₹10**, so a review pays if more than **1 in 10** ends in a delivery.
- Cost per successful delivery: **₹84.8 → ₹80.3**, bonus included. *Sources: data pack; our model.*
**Bridge:** *And the orders customers still refuse?*

---

## Slide 8: A separate idea for refused parcels (ask ④)
**Headline:** *A separate idea for orders customers refuse:* / *(pink) find each parcel its cheapest way back*
**Message:** Not part of the pilot. A second, separate trial if Valmo finds it feasible: each refused parcel takes its cheapest legal route, not an automatic trip back.

**① Why it matters:** a return costs **₹120, 45%** of Meesho's average **₹265** order; about **130 mn** parcels a year travel back. We found no marketplace that re-routes refused parcels from the last-mile hub.
**② Three routes, chosen per parcel**
1. **Second chance** (24 h): deliver again · another time · pay by UPI · pick up at the hub. *The customer's WhatsApp reply picks this route.*
2. **A nearby buyer of the same item** (48 h): unopened and inspected; same seller, same state; the seller opts in. Holding costs **₹8**, a match saves **₹145**, so it pays above a **5.5%** match rate.
3. **A grouped return** for everything else.
**③ The law and the guards:** same state only (GST) · the seller stays the seller (FDI rules) · scan in and out, an OTP for the new buyer, a 48-hour limit · damaged or wrong items go back to the seller, never re-routed.
**Live in our prototype:** the Refused-Parcel Desk card (route, value, legal checklist) and the customer's second-chance options.
**Bridge:** *What could go wrong with all of this?*

---

## Slide 9: Risks and guards (ask ⑥)
**Headline:** *Every way to game it has a guard,* / *(pink) and every risk at scale has a stop rule*
**① Who might game it, and the guard** (the draft's table, kept): bonus riders neglect normal orders → their bonuses are held · fake attempts → the attempt check, strikes, no bonus · a rider defers the first attempt to earn the next-attempt bonus → only after a genuine, high-effort attempt; stops if first-attempt deliveries fall · pressuring a buyer → OTP, a 7-day hold, complaints watched · the captain protects friends or over-strikes → Ops overturns within 48 h, audits · flagged areas guessed → the score is never shown, a **₹300** daily cap · held parcels mishandled → inspection, scans, OTP (a real case: **33,035** Meesho parcels falsely marked delivered in Surat, 2026).
**② Risks at scale** (matrix + table): works in 4 hubs but not a region → a stop rule, kept Control riders · riders predict failure rather than cause it → exactly what month 1 measures · the season distorts results → same-weeks comparison · the score drifts → monthly check · location data misused → consent and delivery-only use (DPDP Act).
**③ The safety net:** *If the bonus fails, the attempt check and two-way WhatsApp carry on. Nothing we propose needs a new asset, so anything can be switched off.*
**Bridge:** *Guarded and tested, the pilot is only the first step.*

---

## Slide 10: The long game (10x)
**Headline:** *Today the risk score is a filter.* / *(pink) Tomorrow it's a price, on Meesho's own delivery map*
**① Three steps** (staircase): **Now:** the pilot (a bonus on hard orders, attempts checked, customers heard) → **6–12 months:** pay by difficulty: a price per stop from risk, distance, address and time of day, so less on easy stops and more on hard ones · **every delivery teaches the map** (the real doorstep, learned from verified deliveries and the customer's own landmark words) → **Long term: Meesho's own delivery map**, a hexagon grid of India like Uber's; each cell carries its doorsteps, failure rate, best delivery time and difficulty price.
**② Visual:** a hexagon map of one town, shaded by difficulty, one cell opened (*illustrative*).
**③ Judge carriers by cost per successful delivery:** Carrier A at ₹45 a parcel and 10% RTO costs **₹63** per successful delivery; Carrier B at ₹40 and 20% costs **₹80**. *"The cheaper parcel is the dearer delivery."*
**Last words:** *"Money that carries no information can't coordinate a network. Price the hard stop."*

---

## Number budget: each number has one home
| Number | Slide |
|---|---|
| 17%, "7 in 10", 17% → ~14%, research counts (12, 25+, [n]) | 1 |
| RTO trend, 22.3% vs 2.7%, 8×, 96%, ₹170 vs ₹50, 15% → 22%, Vadodara/Patna, 40/29/31, ₹5 hub pay, the order dates | 2 |
| ₹18 rider pay, the 20% flag share | 3 (₹18) · 4 (20%) |
| 4 hubs, 12 riders, 24 pairs, 8-week baseline, ~4 per 100 detectable, ₹15, 7-day hold | 4 |
| 500 m, 48 h overturn, 4 messages, 1,253 tests, 18 audits | 5 |
| (no new numbers: words only) | 6 |
| 1 in 8, 8.6, 60 of 100, ₹103 cr, −3 points, ~7 per 100, ₹99, ₹10, 1 in 10, ₹84.8 → ₹80.3 | 7 |
| ₹120 = 45% of ₹265, 130 mn, ₹8, ₹145, 5.5% | 8 |
| ₹300 cap, 33,035 Surat | 9 |
| ₹63 vs ₹80 | 10 |
*Not used anywhere: the ₹65,000 test cost (the pilot design on slide 4 says what matters).*

## Presenting it (one minute per slide)
- **Slide 1** is the pitch: research → three parts → the month-by-month pilot → what it could mean. If a judge reads only this slide, they have it.
- **Slides 2–3** earn the right to the answer: what we heard, and why the bonus needed two partners.
- **Slides 4–6** are the pilot: design → the two checks → month by month. Say "pilot" and "simulated in our prototype" out loud.
- **Slides 7–10** answer "does it pay, what about refusals, what could go wrong, where does it lead".
- If asked "what are the results?": *"The pilot hasn't run. Slide 6 is the plan for each possible result, and our prototype runs it on simulated orders so you can see every decision."*
