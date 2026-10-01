# 28: The complete Round 2 deck plan (final, 2 Oct 2026)

**Structure (Gaurav, 2 Oct): the deck opens with our Round 1 slides exactly as submitted, then six Round 2 slides.** The real Round 1 submission is `Meesho/GPS_IIT Bombay - Round 1 submitted.pdf` (the PPTX is `GPS_IIT Bombay.pptx`). `round1-deck.html` and `Meesho DICE R1 - ValMo RTO.pptx` are earlier drafts: never quote them as Round 1.

**Build the deck from this file only.** It replaces `14-deck-handoff.md` slides 1–3 (those were rewritten versions of Round 1; we now use the real ones) and merges 14 + `23-deck-plan-v5.md` for slides 4–9. Still use 14 for the **look and feel (§3)** and the **do-not-use list (§7)**, and `10-sources.md` for every footer.

**Format:** 10 slides including the cover (rules allow 6–10). The Round 2 slides copy the Round 1 look: the DICE Season 3 header with the meesho logo, a big two-line headline, three numbered panels (circled ①②③), ➢ bullets, at least one native chart or diagram, a pink "so what" callout box, a small grey sources footer. About 350–400 words a slide. Valmo app screens keep Valmo navy #092D5E.

**Words never to use:** "proven" (say "built and tested in our prototype" or "in simulation"), "X% of risky orders delivered" (say what the bonus *caused* against Control), "GO at +9", "12,000 orders detects +3", "15% of failed deliveries are fake", stats jargon on the slide face ("clustered", "MDE", "t-value", "difference-in-differences", "Brier score").

---

## The story

**The problem we solve, in one line:** *Valmo pays the same for an easy stop and a hard stop, so hard stops get the least effort and fail; Meesho knows which stops are hard, but that knowledge never reaches the door.*

**What Round 2 adds, in one line:** *Much of "refused" is not "didn't want it" but "wasn't ready" (the parcel came early and the cash wasn't there), so each kind of failure gets its own fix: pay for the effort, make the moment right, check the attempt was real, and recover cheaply what still fails.*

**Headline test: read only the headlines, in order; they must make one argument.**

| # | Act | Headline | What the judge should believe after it |
|---|---|---|---|
| 1 | Diagnose *(Round 1, as submitted)* | RTOs are down, but COD remains the biggest RTO challenge | COD is the residual; failure is two-sided friction (the cause pie) |
| 2 | Choose *(Round 1, as submitted)* | Five New Levers: Where Should We Act First? | Of five new levers, R1 (the delivery incentive) is the one to pilot |
| 3 | Design *(Round 1, as submitted)* | Make the hard stop worth the same effort | The ₹15 bonus: signal, incentive, a 30-day controlled test |
| 4 | **Summary: what we learned** | Since Round 1: many refusals mean "not ready", not "don't want it", so each kind of failure now gets its own fix | Round 2 research changed what we know; the plan follows from it |
| 5 | **Rescue, sharpened** | Same app, same payout rail: ₹15 for the hard delivery, and a check that every failed attempt was real | It runs on Valmo's rails; gaming doesn't pay; the effort checks work even without the bonus |
| 6 | **Rescue, proved** | One avoided return pays for eight bonuses. A fair 30-day test decides it | The bar is low, and we won't scale on hope |
| 7 | **Recover** | The doors we still lose: send each refused parcel to its cheapest legal recovery, not ₹120 back | Even a failed door doesn't have to cost ₹120 |
| 8 | Decide | Every phase ends with a number that decides the next, and a fallback if the bonus fails | There is no scenario where we have nothing |
| 9 | Guard + 10x | A guard for every way this can break, and an end state that pays by difficulty | We thought like the people who will game it, and this is step one of repricing the network |

**The frame (from Round 1, kept):** Prevent · Rescue · Recover, and Round 1's lever codes (P1 preferred slot, P2 geotagging, R1 delivery incentive, R2 proof of attempt, C1 local re-home). Round 2 slides use the same codes, so a judge can see each Round 1 lever grow. A small breadcrumb in the top-right of slides 4–9: Summary (4), Rescue (5, 6), Recover (7), Plan (8), Risks + 10x (9).

**Enhance, don't pivot (say it on slide 4):** the hero is still R1, the ₹15 on a delivered risky order. What changed: R2 (proof of attempt) moves from "Consider" to "Pursue" because Valmo already collects the evidence and the hub, paid only on delivery, is on our side; the cheapest slice of P1 (an early-arrival heads-up) needs no build; C1 has its legal design and break-even; Round 1's "A/B the bonus level" becomes a region-scale price test, because 4 hubs can't separate price from hub.

**One order runs through the deck.** Our real Meesho COD order (promised 3 Oct, **arrived 28 Sep, 5 days early, with no warning**, "the rider called twice and didn't wait", "Failed Delivery") is introduced on slide 4. It is the "not ready" failure in one picture. Slides 5–8 end with one italic line on what would have happened to *that* order:
- **Slide 5:** a heads-up would have said "arriving early, today: pay by UPI or keep 3 Oct"; the rider sees "+₹15 Bonus Eligible" and has a reason to wait or offer UPI; the two calls with no wait are a weak attempt, so it goes to the hub captain and the customer is asked "Did the rider reach you?"
- **Slide 6:** across 12,000 orders like it, the pilot measures whether ₹15 makes the rider wait and knock.
- **Slide 7:** if the customer still says no, a second chance ("different time", "pay by UPI"), then a nearby buyer, then a batched return; never an automatic ₹120 trip.
- **Slide 8:** a captain's ruling on that attempt is one of the numbers that decides day 31.

**How fake attempts run through the deck:** Round 1 slide 1's pie has "No real attempt 9%" and the rider quote ("once or twice… we do not go back"); Round 1 slide 2 lists R2 proof of attempt ("no baseline exists to size it yet") in Consider; **slide 4 moves it to Pursue and says why**; slide 5 shows the controls and that they don't need the bonus; slide 8 runs them from day 0 in both groups and keeps them if the bonus is killed; slide 9 guards the captain against bias.

---

## Research → insight → design: why every choice is there (the scoring lever)

Judges score research quality first. The Round 1 slides show the Round 1 research; slides 4–9 must show that **each Round 2 design choice comes from a finding**. Every row appears on the slide named, as a short "because" line. Sources: `10-sources.md`, `01-valmo-research.md`, `07-problem-breakdown.md`.

| # | What we found | So we designed | Slide |
|---|---|---|---|
| 1 | The brief rules out customer-side levers (no COD gating, fees or checkout friction). The rider is the only person who meets the customer | Work on the system side: the rider, the hub, the moment of delivery | 4, 5 |
| 2 | For prepaid riders "call three or four times and wait"; for COD "once or twice… and we do not go back" (Round 1, 12 rider interviews). **Round 2 field research in metro and Tier 3/4 hubs: riders are interested in a per-order bonus** (stated interest; the pilot measures behaviour) | **Remove the barrier, don't add effort:** give a flagged COD order the prepaid playbook | 4, 5 |
| 3 | ₹15 nearly doubles pay on that order (₹18 base). It buys cheap effort (more calls, a wait, offering UPI, coming back at a set time), not a second trip (≈ 2 other deliveries, ≈ ₹40, for the rider) | ₹15, not ₹50: priced for cheap effort | 5 |
| 4 | **Hubs are paid ₹5 per delivered parcel** (Round 2 field research). Round 1 said the bonus rides Valmo's rider bonus system; **Round 2 found the clause: §3 "Additional Incentive" in Valmo's own rider contract** | The ₹15 (3× the hub's whole fee) goes straight to the rider. A hub earns only on delivery, so a fake attempt costs the hub too: **the hub captain is a natural reviewer** | 4, 5 |
| 4b | **Orders arrive before the promised date, so the customer has no cash ready** (Round 2 field research, Tier 3/4; our test order came 5 days early, no warning). Round 1's survey listed "no cash" as a refusal trigger: this is *why* | A big share of "refused" is **not ready, not unwilling**. Fix the moment: an early-arrival heads-up ("pay by UPI, or keep my promised date"), the rider offering UPI, a second chance at a set time | 4, 7, 8 |
| 5 | Hubs are multi-platform: the same bag carries Flipkart parcels | The bonus also wins rider effort for Meesho's hard stops | 5 |
| 6 | Valmo's contract already phones customers to verify failed attempts; Flipkart asks the customer "Confirm delivery reschedule" | Fake-attempt control routes those answers to the hub captain, using evidence Valmo already collects | 4, 5 |
| 7 | RTO rises with slow delivery (22% at 1–2 days → 35% at 5+), distance (15 → 22%), new addresses, and the ₹500–1,000 order band (28%, the worst) | Rescue Score signals | 5 |
| 8 | **No Indian vendor's RTO-reduction claim is independently audited** (Delhivery "up to 20%", GoKwik, Shadowfax "almost 60%": all self-reported) | We test with a same-time Control group a sceptic would accept | 6 |
| 9 | RTO swings with the season (D2C ~39% in Nov 2025 → ~21% in Feb 2026), more than the bonus's whole effect | No before/after; a same-time Control group | 6 |
| 10 | Tier-2/3 cities are 66% of new D2C orders; India is not one market (Vadodara 18% vs Patna 35%) | 2 of the 4 pilot hubs are smaller-town hubs (as Round 1 said) | 6 |
| 11 | Hubs earn ₹5 per delivered parcel; node margins are thin | Meesho funds the bonus, paid only on success; the hub bears no new cost and gains ₹5 per rescue. A re-homed parcel is a delivered parcel, so the hub earns its ₹5 again | 6, 7, 9 |
| 12 | E-way bills are a red herring (₹50,000 threshold). **The real constraint is GST place of supply** (Notif. 34/2023), plus FDI Press Note 2 and the Carriage by Road Act s.15 (a carrier can't sell goods) | Re-home only within one state, with seller opt-in; the seller stays the seller | 7 |
| 13 | The two halves exist in India: Ecom Express runs dark stores at its delivery centres; Delhivery's doorstep QC lifted AJIO's resaleable returns 25% → 98%. Nobody has joined them at the refused parcel | The Router joins them: inspect at the hub, re-home locally | 7 |
| 14 | Prior art: Amazon's 2012 patent (US 8,615,473) offers the cost of a return as a discount to a nearby buyer | Name it first: the same principle, pushed to the last-mile hub, where India's COD economics make it pay | 7 |
| 15 | Meesho allocates lanes by lowest cost, no fixed Valmo share (Q1 FY27 call) | Allocate by cost per *successful* delivery | 9 |
| 16 | Predicting *when* the customer is home cut delivery cost up to 10.2% (Kandula et al., *Decision Support Systems* 2021) | Time slot is one input to the difficulty price | 9 |

**State the research limits ourselves:** riders willing to talk are the least busy; stated interest in a bonus is not behaviour; no published Indian RTO cause split exists, so ours (the Round 1 pie) is a labelled blend of rider + buyer research, the industry NDR mix and the data pack; every vendor number is self-reported. Round 2 research covered Tier 3/4 as well as metro. The pilot's Control group answers the biggest unknown: do riders *cause* COD failure or correctly *predict* it?

## Why orders fail: the reason map (synthesis of everything we know)

Round 1's pie says *where* RTOs happen. Round 2 research says *why*, and the why sorts every reason into three kinds of failure. **Each kind needs a different fix: that is the logic of the whole solution set.**

| Kind | The reasons (with our evidence) | Share of RTOs (Round 1 pie) | What fixes it | Slide |
|---|---|---|---|---|
| **Not ready**: wants it, wrong moment | **Arrived before the promised date, no cash ready** (Tier 3/4 research; our order 5 days early, no warning) · not home: work, travel, asleep (R1 survey) · phone unreachable, often with no heads-up · the opposite timing failure: intent decays after 5+ days (RTO 22% → 35%, Shipway) | Not home 18 + unreachable 12 + the "no cash" part of refused 36 | **R1 Rescue:** the ₹15 makes the rider wait, call again, offer UPI, return at a set time · **P1, sharpened:** heads-up before an early arrival · **C1 second chance:** different time / pay by UPI / hub pickup | 4, 5, 7, 8 |
| **Not wanting**: changed mind | Cheaper on another app ("we keep watching prices… nothing is paid, so there is no loss", R1 survey) · changed mind in transit · COD used to see the item first | The "better deal / changed mind" part of refused 36 | Effort can't fix this, so don't pay to try: **C1 Recover**: re-home to a nearby buyer of the same item, or a batched return | 7 |
| **Not reached**: the system failed first | Unclear address 13 · far / wrong hub 9 (distance 15% → 22%) · **no real attempt 9**: one or two calls and leave, or "unavailable" logged without a knock (R1 rider quote; Valmo's contract already verifies failed attempts) | 13 + 9 + 9 = 31 | **R2 fake-attempt control** (hub captain; the hub earns only on delivery) · **P2** address fix | 4, 5, 8 |

**The one-line insight:** *"Much of what is logged as 'refused' is not 'didn't want it', it's 'wasn't ready': the parcel came early and the cash wasn't there. You can't make a customer want an order, but you can make the moment right."*
**What we don't claim:** how the 36% "refused" splits between *not ready* and *not wanting*. The second-chance replies ("different time" / "pay by UPI" = not ready; "cancel" = not wanting) measure it per hub from day 1. If the survey has the split, put it here.

---

## Slides 0–3: Round 1, exactly as submitted (do not edit)

Insert the cover and the three content slides from `GPS_IIT Bombay.pptx` unchanged: same text, numbers, charts and footers. What they say, so the Round 2 slides can build on them:
- **Slide 0, cover:** "REDUCING RTO: GETTING MORE ORDERS DELIVERED · Business Track · Team GPS, IIT Bombay".
- **Slide 1: "RTOs are down, but COD remains the biggest RTO challenge."** ① RTO 21.2% → 18.6% → 17.8% (FY23–25), a 16% reduction, about three-quarters from prepaid; prepaid push, Valmo scale, TrustMesh (the signal stops at the hub). ② The cause pie (refused 36 · not home 18 · unclear address 13 · unreachable 12 · far/wrong hub 9 · no real attempt 9 · other), "Blend: rider + buyer research, industry NDR mix, data pack"; COD vs prepaid success 78.6/97.9 → 77.7/97.3; 22.3%, 8×, 96%. ③ Two-sided friction: customer low commitment (survey quote, 25+ responses) and rider rational triage (rider quote, n = 12).
- **Slide 2: "Five New Levers: Where Should We Act First?"** Impact × effort map: R1 (risk-weighted delivery incentive) in Pursue; P2 (location geotagging); R2 (proof of attempt, "no baseline exists to size it yet") in Consider; P1 (preferred delivery slot) and C1 (local re-home) in Assess. "Already in play" list (prepaid nudges, TrustMesh, predictive routing, reverse-network optimisation, geocoding, flexible delivery options incl. hub pickup, better customer communication).
- **Slide 3: "Make the hard stop worth the same effort."** Quick win (no new system); the rider's bag (₹18 × 4, ₹18 + ₹15); ① Signal (riskiest 20%, rider sees only "Bonus Eligible + ₹15"); ② Incentive (₹15 only on a customer-confirmed delivery, via Valmo's rider bonus system; "1 in 8 breaks even"); ③ Test (4 hubs, 2 metro + 2 small-town, 8-week baseline, riders split Bonus/Control by hub, A/B the bonus level); GO / RE-PRICE / KILL.

**Round 2 slides must not contradict them.** Where Round 2 sharpens something, say it as "Round 1 → Round 2" (see "Enhance, don't pivot" above), never silently change a number.

---

## Slide 4: Since Round 1: what we learned and what we recommend (ask ① + ②) · breadcrumb: SUMMARY
**Headline:** Since Round 1: many refusals mean "not ready", not "don't want it", so each kind of failure now gets its own fix
**Message:** Round 2 field research, in metro and Tier 3/4 hubs, sharpened the diagnosis; the recommendation keeps the Round 1 hero and adds a fix for each kind of failure.
**Story beat:** the executive summary for Round 2. It turns Round 1's pie into three kinds of failure and puts the whole recommendation on one page.

**① What we found since Round 1** (➢ bullets + the real-order strip)
- ➢ **Parcels arrive before the promised date, and COD customers don't have the cash ready** (Tier 3/4 research). Our own order: promised 3 Oct → arrived 28 Sep, no warning → "the rider called twice and didn't wait" → "Failed Delivery" (redrawn strip; the raw screenshot shows the rider's number).
- ➢ **Riders are interested in a per-order bonus** (metro and Tier 3/4 hubs), and still give COD "once or twice" before leaving.
- ➢ **Hubs earn ₹5 per delivered parcel**, so the hub gains only when the parcel is delivered, and a fake attempt costs the hub too.
- ➢ **Valmo's rider contract** has an "Additional Incentive" line (the bonus rail) and already verifies failed attempts by phone (fake attempts are a known problem).
- Evidence line: 12 rider interviews + COD buyer survey (25+, Round 1) · Round 2 field research, metro + Tier 3/4 **[n]** · real test orders on Meesho + Flipkart · Valmo Delivery Services Agreement.

**② Three kinds of failure** (visual: the Round 1 pie regrouped into three coloured blocks, each with its fix)
| Kind | Share of RTOs | Fix |
|---|---|---|
| **Not ready** (came early, no cash; not home; unreachable) | 30 + the "no cash" part of refused 36 | R1 bonus · P1 early-arrival heads-up · C1 second chance |
| **Not wanting** (cheaper elsewhere, changed mind) | the rest of refused 36 | C1 Router: re-home or batched return |
| **Not reached** (no real attempt, bad address, wrong hub) | 31 | R2 fake-attempt control · P2 address |
One line: *"You can't make a customer want an order, but you can make the moment right."*

**③ What we recommend** (stacked cards, Round 1 codes)
- **Now: R1 Rescue Bonus.** −3 RTO points, **₹62 cr (conservative) to ₹184 cr (case) a year**, if a 30-day paired-rider pilot confirms it.
- **Now, alongside: R2 fake-attempt control**, moved from Consider to Pursue (the evidence already exists; the hub captain reviews; a ₹10 review pays if more than ~1 in 10 ends in a delivery). **P1, its cheapest slice:** a WhatsApp heads-up when a COD parcel will arrive early: "pay by UPI, or keep my promised date" (no build).
- **Next: C1 Refused-Parcel Router.** ₹50–140 cr a year (up to ₹270 cr).
- **Long-term: pay by difficulty.**
- Under the cards: *"Even if the bonus fails, fake-attempt control and the Router stand on their own."*

**Callout band:** the brief's three tests: delivery cost ↓ · rider earnings ↑ · customer speed and ease unchanged. Plus the prototype **QR code** (Demo landing page, never a shared-day QR) and the live link.
**Footer:** Round 2 field research (metro + Tier 3/4, Sep–Oct 2026) · Round 1 research (12 rider interviews, 25+ buyer survey) · Valmo Delivery Services Agreement · case data pack · Meesho RHP.
**Bridge (italic, last line):** *"Here's how the Round 1 bonus gets sharper, and harder to game."*
*Density: this slide replaces the old executive summary and the old where/why slide. Keep each bullet to one line; the reason table can be three coloured boxes instead of a table.*

---

## Slide 5: Rescue, sharpened: how the bonus works and how gaming is caught (ask ③) · breadcrumb: RESCUE
**Headline:** Same app, same payout rail: ₹15 for the hard delivery, and a check that every failed attempt was real
**Message:** Round 1's bonus, now specified down to the clause it pays on, with the controls that make gaming pointless; suspicious attempts go to the hub captain.
**Story beat:** Round 1 slide 3 showed Signal → Incentive → Test. This slide shows what Round 2 added to each, and the controls.
**"Why the rider" strip (one line; insights 1–3):** *"The brief rules out customer-side levers, and the rider is the only person who meets the customer. Riders give COD 'once or twice' and leave, and say a per-order bonus interests them. ₹15 nearly doubles pay on that order and buys cheap effort (calls, a wait, offering UPI, coming back at a set time), not a second trip."*

**Top: what Round 2 added to Round 1's flow** (Round 1's 3 steps as chevrons, with the additions under each)
1. **Signal:** the Rescue Score (TrustMesh + last-mile signals), riskiest 20% (capped); the rider sees "Bonus Eligible · +₹15", never the score.
2. **Incentive:** ₹15 on Valmo's **§3 "Additional Incentive"** line, direct to the rider's bank (hubs earn ₹5 per delivered parcel, so never through the hub); **on any attempt (first or second)**; held until the 7-day return window closes. Proof: prepaid OTP, or COD cash reconciled at the hub the same day.
3. **Test:** riders paired on past delivery rate, a coin in each pair (slide 6).

**① Which score, and how good is it?**
- TrustMesh decides who we ship to; the Rescue Score decides where effort pays.
- Day 1: simple rules with visible weights, each from a finding (insight 7): TrustMesh risk, COD, distance (15 → 22%), new or unclear address, slow delivery (5+ days: 35%), the ₹500–1,000 order band (28%), phone reachability, past failed attempts.
- Accuracy bar: "the riskiest 20% by score catch **about 46%** of all RTOs; random picking catches 20%". Small type: *"in our simulation; measured on Valmo's last 90 days before the pilot"*.
- How it improves: add "hard to deliver" signals; re-weight after each pilot; later learn which orders the bonus actually saves.

**② What the rider sees** (screenshot: the rider app's "Today's Tasks" card with the green "₹ +15 Bonus Eligible" chip). Why targeted: a flat bonus on all COD orders only adds cost. Why it matters to Meesho: the same bag carries Flipkart parcels, so the ₹15 wins rider effort for Meesho's hard stops (insight 5).

**③ Is it new?** **We found no one who pays per order on the successful delivery of risk-flagged orders** (desk search, Sep 2026). Meituan pays at order *acceptance*; Uber Eats / DoorDash pay extra for harder orders, also at acceptance; Ekart and Valmo pay a first-attempt incentive on all orders. *(Add the peer sources to `10-sources.md` or cut the peers.)*

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
One line under the table: **"Fake-attempt control (R2) stands on its own.** It targets the 9% 'no real attempt' slice of Round 1's pie (at most about 1.5 RTO points; not claimed until the baseline measures it), runs in both pilot groups from day 0, and needs no bonus: the hub earns only on delivery, so the captain is on our side."
Small line: *"Every prototype day is checked by 14 automatic tests, for example nothing delivered without a verified OTP."*
Screenshots: the rider chip (shot 4); the hub-captain queue and the rider's strike meter **once built** (until then the Ops exception queue, labelled "being replaced by the hub-captain screen").
**Footer:** Valmo Delivery Services Agreement (Annex A, §3) · Round 2 field research · Meituan (arXiv 2202.10695) · Uber fare guide · Flipkart WhatsApp flow (real orders).
**Bridge (italic, last line):** *"Our real order: a heads-up would have said 'arriving early, pay by UPI or keep 3 Oct'; the rider would have seen +₹15; 'called twice, didn't wait' would have gone to the captain. But does ₹15 change what riders do, and does it pay?"*
**Speaker notes (off the slide face):** Ops can overturn a strike within 48 h; the rider can ask for a review; 24 h with no captain decision = a free re-attempt, no strike; the Watch rule (3 disputes in 7 days and 2× the hub median).
*Density warning: the fullest slide. Keep the table to one line per row. If it overflows, cut ③ to its first sentence; never cut the "Why the rider" strip or the Round 1 → Round 2 flow.*

---

## Slide 6: Economics and the fair test (asks ③ ⑤) · breadcrumb: RESCUE
**Headline:** One avoided return pays for eight bonuses. A fair 30-day test decides it
**Message:** Break-even is low, the upside is large, and a simple paired-rider pilot gives a clear decision, with a pre-planned next step if it doesn't pay.
**Story beat:** answers the question slide 5 ends on. Left: how little it takes to pay. Right: how we find out honestly.
**Round 1 → Round 2 (one line):** *"Round 1: one avoided return covers eight bonuses. Round 2 adds the orders that arrive anyway: break-even is +8.6 per 100 flagged. Round 1's 'Bonus vs Control by hub' becomes pairs of equally good riders; Round 1's 'A/B the bonus level' moves to a 40-hub region phase, because 4 hubs can't tell price from hub."*
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
One line: *"A tighter cut (top 10%) is cheaper per order and easier to prove, but the prize is half, so we start at 20%."* **Speaker notes:** top 20% vs top 10%: delivered anyway 60% vs 51%; break-even +8.6 vs +7.3; 153 mn vs 76.5 mn flagged a year; ₹103 cr vs ₹62 cr at +15; −3.0 vs −1.5 RTO points (the top-10% ₹62 cr and the conservative ₹62 cr are different calculations).

**③ A fair test in 5 steps** (numbered strip)
1. **Fair groups:** in each of 4 hubs (2 metro, 2 small-town, as in Round 1, because Tier-2/3 is 66% of new orders and India is not one market), pair riders who delivered equally well last month; a coin decides who gets ₹15 → **24 pairs**. For judges: *"two equally good riders, a coin decides which one gets ₹15; after 30 days we compare every pair."*
2. **Same parcels:** both groups carry the same mix of risky parcels; bags assigned by the system; Control riders get the bonus when the 30 days end.
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
- Example (simulated): *"If the bonus truly adds +15 per 100, this pilot says GO about 97 times in 100; at +12 about 6 in 10; at +10 or less it usually says RE-PRICE and we'd run Pilot 2."* Small type: *"the simulation has no good-month and bad-month luck in riders, so a real pilot will be noisier."*
- *"₹15 → more rider effort → more deliveries is our assumption. The pilot measures it, and its Control group also answers the question nobody has answered: do riders cause COD failure, or correctly predict it?"*
- One line: *"Meesho funds the ₹15, paid only on success; the hub, which earns ₹5 per delivered parcel, bears no new cost and gains ₹5 on every rescue."*
- Visual: the prototype's range diagram with the ✔ Fair comparison line (shot 1); optional shot 2 (RE-PRICE with "Next: Pilot 2").
- **Speaker notes, if asked "why not compare with last year?":** Meesho's RTO moved 21.2% → 17.8% (FY23–25) and COD success fell 78.6% → 77.7%; the bonus should move network RTO by about 1.7 points at break-even, the same size as normal drift and festive swings.
**Callout:** "₹120 to haul a parcel back; ₹15 to make the hard stop worth it. If it doesn't pay, we change one lever and test again, and the fallback keeps running."
**Bridge (italic, last line):** *"Even with the bonus, some customers will still say no at the door. What happens to those parcels?"*
**Footer:** case data pack · RHP · Swiggy/Zomato rain pay · Butschek et al., *Labour Economics* 2022 · Unicommerce D2C Report 2026 · Business Standard (Unicommerce), Apr 2026 · vendor claims: Delhivery, GoKwik, Shadowfax (self-reported).

---

## Slide 7: Refused parcels: the Router (ask ④) · breadcrumb: RECOVER
**Headline:** The doors we still lose: send each refused parcel to its cheapest legal recovery, not ₹120 back
**Message:** Round 1's C1, now designed: a per-parcel router with three lanes, each checked against GST, consumer, privacy and foreign-investment rules, and paid for only when a parcel is actually delivered.
**Story beat:** Rescue lowers how many doors fail; Recover lowers what each failed door costs. It works whether or not the bonus scales. The second chance serves the "not ready" refusals; re-home serves the "not wanting" ones.

**① Why it matters:** a return costs **₹120 = 45%** of Meesho's ₹265 average order; Meesho bears it; about **130 mn** RTO parcels a year (763.5 mn × 17%); the default is to send it back (Shopee: refuse once → return to sender). **We found no marketplace that re-homes refused parcels from the last-mile hub** (desk search, Sep 2026). **The two halves already exist in India:** Ecom Express runs dark stores at its delivery centres; Delhivery's doorstep quality check lifted AJIO's resaleable returns from 25% to 98%. Nobody has joined them at the refused parcel. **We name the prior art first:** Amazon's 2012 patent offers the cost of a return as a discount to a nearby buyer (also Pitney Bowes, expired 2025; Formula Labs). Ours pushes that principle to the last-mile hub, where India's COD economics make it pay.

**② The Router, 3 lanes** (decision diagram, a legal tick on each lane; each chosen by expected value: chance × saving − cost)
1. **Second chance, for "not ready"** (24 h WhatsApp, legally clean): **Deliver again · Different time · Pay now by UPI · Pick up at hub** (48 h, a pickup code; saves the ₹120 return, about ₹112 net of the ₹8 shelf; never counts as a delivery or pays a bonus). "Different time" and "Pay now by UPI" answer exactly the early-arrival, no-cash refusal. Hub pickup is an option Valmo already offers (Round 1 slide 2); we offer it at the moment of refusal.
2. **Hold & Re-home, for "not wanting"** (clean if same state): **inspected first** (unopened, seal intact, invoice outside, photo); **seller state = hub state = buyer state**; the seller has opted in for that product; damaged or wrong items never re-homed. **Hold only where the low end of the demand forecast clears break-even (5.5%)**; only the **same seller and the same listing** is re-homed; similar listings are evidence of demand only.
3. **Batched return** (clean): everything else, grouped by seller (US programmes report 20–40% cheaper).
- 30 shelf slots shared by Hold and pickup; savings count only on real outcomes.

**③ Break-even and rules** (break-even line chart)
- Holding 48 h costs about ₹8; a match saves ₹145 → **break-even 5.5% match rate**. We don't claim a match rate. Sizing: about **₹50 / 140 / 270 cr** at a 2.5 / 7 / 13.5% effective match rate.
- **The legal insight:** *"Everyone worries about e-way bills; they only apply above ₹50,000. The real constraint is GST place of supply, and a carrier may not sell goods (Carriage by Road Act s.15). So we re-home only within one state, only with the seller's opt-in, and the seller stays the seller."*
- Start with **non-GST sellers** (same state by law) in **Uttar Pradesh** (15.9% of sellers).
- **Why the hub will do it:** a re-homed parcel is a delivered parcel, so the hub earns its ₹5 again.
- The forecast shows a chance with a range and a confidence label; in a synthetic backtest it is calibrated on average. Say *"it holds fewer parcels and each pays more often; we choose it to limit custody risk and wrong calls"* (never "it earns more in total").
- Small type: *"History is synthetic: this shows the mechanism; real calibration comes from the pilot. Kill the Hold lane if the match rate is below 3% after 30 days, or on any custody incident."*
- Screenshots: a Desk parcel card (shot 7), the money tiles (shot 8), the four second-chance options (shot 9).
**Callout:** the pilot first measures how long refused parcels sit at the hub today, the share of "not ready" vs "not wanting" refusals (from the second-chance replies), and the match rate.
**Bridge (italic, last line):** *"Our real order: if the customer still said no, a WhatsApp second chance, then a nearby buyer of the same item, then a batched return. Never an automatic ₹120 trip."*
**Footer:** GST s.2(85), IGST s.10(1)(a), Notif. 34/2023-CT · FDI Press Note 2 (2018) · Consumer Protection (E-Com) Rules 2020 · DPDP Act 2023 · Carriage by Road Act 2007 s.15 · CGST Rule 138 · Amazon US 8,615,473 · Ecom Express DRHP p.181 · Delhivery QC-RVP (AJIO) · UPS Happy Returns / Optoro · Meesho RHP.

---

## Slide 8: 30-60-90 plan (ask ⑤) · breadcrumb: PLAN
**Headline:** Every phase ends with a number that decides the next, and a fallback if the bonus fails
**Story beat:** pulls slides 5–7 into one timeline and answers "what if you're wrong?" before the judge asks.
**Visual (top right): the decision fork after day 30.** Pilot 1 verdict → **GO:** region price test (~40 hubs) → scale · **RE-PRICE:** Pilot 2, one lever changed · **KILL:** stop the bonus; **fake-attempt control and the Router carry on** (the same two boxes sit under all three branches).
| | Days 0–30 | Days 31–60 | Days 61–90 |
|---|---|---|---|
| **Rescue Score** | Before day 0: measure accuracy on Valmo's last 90 days | Add "hard to deliver" signals; re-weight from pilot data | Learn which orders the bonus saves |
| **R1 Rescue Bonus** | Pilot 1: 4 hubs, 24 rider pairs, top 20%, rule locked | **If GO:** one region (~40 hubs) with a **price test** (Round 1's "A/B the bonus level", at a scale that can see it): hubs randomly at ₹0 / ₹10 / ₹15 (and top 10% vs 20%), each compared with its own baseline and the ₹0 hubs over the same weeks. **If RE-PRICE:** Pilot 2 with one lever changed, rule locked first | Scale decision; start difficulty-priced tiers |
| **R2 Fake-attempt control** | Day 0 in every pilot hub, both groups: hub-captain review, strikes, rider monitor | Tune the evidence thresholds and the ladder from baseline data | Roll out with the bonus, or alone if the bonus is killed |
| **C1 Router** | UP cluster (3 hubs): measure dwell time + "not ready" vs "not wanting" refusals; second chance live | Manual Hold & Re-home with 30–50 opted-in same-state sellers (non-GST first); batched returns | Automate matching if match rate ≥ 5.5% |
| **P1 / P2** | **Early-arrival heads-up** in pilot hubs (no build: one WhatsApp when a COD parcel will arrive before its promised date: "pay by UPI, or keep my promised date"; uses the customer messaging Valmo is rolling out) | Two-way WhatsApp on bonus orders; address fix in 1 small-town hub | Decide on each |
| **Success metric** | Low end of the range ≥ +8.6; normal orders ≥ Control − 1 pt; suspected fakes ≤ Control + 2 pts; heads-up: refusals on early arrivals vs a no-message hub | Cost per rescued order ≤ ₹120; match rate vs 5.5%; WhatsApp reply rate; recovered deliveries from reviews | Valmo RTO and cost per successful delivery vs baseline |
| **Kill / re-tune** | Uplift < +3, or a safety rule breaks; heads-up raises cancellations | Match rate < 3%; any custody incident; more than 1 in 3 strikes overturned, or reviews cost more than they recover | Net ₹ negative for 2 months |
- Loop picture: **Pilot 1 → learn → Pilot 2 → scale**, "one lever changed, rule locked first". *"Pilot 1 answers 'does ₹15 work?'; the region phase answers 'which price and which cut?'"*
- KPI tree: north star = cost per successful delivery → RTO % → uplift per 100 flagged / match rate / recovered deliveries.
- Router and fake-attempt KPIs show their count and "too early" until 30 parcels or attempts. **Custody incidents and complaints are not simulated; they are measured in the real pilot** (never show a 0).
- Owners: last-mile ops (bonus, fake-attempt control via hub captains), reverse ops (Router), data science (score), customer comms (heads-up, WhatsApp).
- **Bridge (italic, last line):** *"A plan this specific has specific ways to break, and a bigger prize if it works."*

---

## Slide 9: Risks and the 10x (ask ⑥ + 10x) · breadcrumb: RISKS + 10x
**Headline:** A guard for every way this can break, and an end state that pays by difficulty
**Story beat:** left 60%: we think like the people who will game it. Right 40%: where this goes. The last words echo Round 1's "make the hard stop worth the same effort".

**Left: ① risk matrix (likelihood × impact) + ② the top 10 risks** (rows grouped R1 / R2 / C1 / all; the rest go in a small "also guarded" line and the speaker notes)
| Risk | Lever | Likelihood | Guard |
|---|---|---|---|
| Uplift below break-even | R1 | Med | RE-PRICE → Pilot 2 with one lever changed; **fake-attempt control + Router continue** |
| Riders correctly *predict* COD failure rather than cause it | R1 | Med | Exactly what the Control group measures; a KILL is a cheap, 30-day answer to the case's central unknown |
| Season or trend distorts the result | R1 | Med | A same-time Control group; never a before/after alone |
| Riders game the bonus (fake attempts, fake deliveries, neglected normal orders) | R1 | Med | OTP and cash proof, 7-day hold and clawback, hub-captain review, the two safety rules, returns watched |
| Riders' interest is stated, not shown | R1 | Med | The pilot measures deliveries vs Control, never stated interest; 2 of 4 pilot hubs small-town |
| Hub captain biased (protects or over-strikes) | R2 | Med | Ops can overturn within 48 h; sample audit; captain scorecard |
| Unfair strikes on riders | R2 | Med | Evidence and a reason for every strike; 30-day expiry; appeal; the rider sees everything |
| Theft from held parcels (Surat 2026: 33,035 Meesho parcels faked as delivered) | C1 | Med | Inspection, scan in/out, old ↔ new order link, OTP to the new buyer, 48 h cap, daily shelf count |
| Cross-state GST exposure | C1 | Blocked by rule | Same state only; non-GST sellers first |
| Volume shifts to 3PLs (~50% in Q1 FY27) | All | Med | Carrier-agnostic design (right half) |
"Also guarded" line: moving the goalposts (rule locked) · unfair groups (pairs + coin) · hub differences hide price (region-scale test) · noisier than simulation (decide on the low end) · score drift (20% cap, monthly check) · thin-listing forecasts (low end only) · pickup no-shows (48 h) · FDI (seller opt-in) · buyer 1's data (label covered) · WhatsApp fatigue (cap 4 per order) · heads-up nudging cancels ("keep my promised date" is the default).

**Right: ③ the 10x: today the risk score is a filter; tomorrow it's a price**
- **Three horizons** (staircase): now one ₹15 bonus on the riskiest 20% → 6–12 months a price per parcel by difficulty (risk × distance × address × time slot) → long-term every node paid per successful outcome; refused parcels become a local inventory network.
- **Judge carriers by cost per success** (small bar chart): cost per success = (forward + RTO% × ₹120) ÷ (1 − RTO%); Valmo **₹84.8** today → **₹77.7** at 14% RTO; Carrier A ₹45 at 10% RTO = ₹63 per success, Carrier B ₹40 at 20% = ₹80: **the cheaper parcel is the dearer delivery.** Meesho already allocates lanes by lowest cost with no fixed Valmo share (Q1 FY27 call); allocate by cost per *successful* delivery instead.
- **The price learns *when*, not just *whether*:** predicting when the customer is home cut delivery cost up to 10.2% (Kandula et al., 2021), and our early-arrival finding says timing matters, so time slot is an input to the price.
- **Asset-light:** software + incentives on existing floor space (Vidit Aatrey: warehousing "tends to have lower ROI"); works for Valmo and 3PLs.
**Callout (the last words of the deck):** *"Money that carries no information can't coordinate a network. Price the hard stop."*
**Footer:** Surat (deshgujarat.com, Apr 2026) · Meesho Q1 FY27 earnings call · Kandula, Krishnamoorthy & Roy, *Decision Support Systems* 149 (2021) · MediaNama, 2 Feb 2026 · our cost-per-success calculation.
*Density: this is two slides' worth. If it overflows, cut the risk matrix (keep the table) before cutting anything on the 10x side; the 10x is scored on its own.*

---

## Numbers cheat sheet (every figure on the slides)
| Figure | Value | Source |
|---|---|---|
| Valmo RTO | COD 20% · prepaid 5% · 17% blended | Case data pack |
| Costs | ₹50 forward (last mile ₹21) · ₹120 reverse | Case data pack |
| RTO by distance | 15% / 17% / 22% | Case data pack |
| Meesho RTO trend | 21.2% → 18.6% → 17.8% (FY23–25) | Derived from RHP (Round 1 slide 1) |
| COD vs prepaid | 22.3% vs 2.7% failure; COD = 96% of failures | Derived from RHP (Round 1 slide 1) |
| COD success | 78.6% (FY24) → 77.7% (FY25) | RHP (Round 1 slide 1) |
| Cause split (Round 1 pie) | Refused 36 · not home 18 · unclear address 13 · unreachable 12 · far/wrong hub 9 · no real attempt 9 · other 3 | Round 1 slide 1, our research blend |
| Valmo orders FY25 | 763.5 mn; average order ₹265 | RHP |
| Rider base pay | ₹18 per delivery (Round 1 bag) | Our research; "reportedly ₹18–25" in franchise write-ups |
| Hub pay | ₹5 per delivered parcel | Round 2 field research |
| Early arrival | Parcels arrive before the promised date; COD customers have no cash ready (our order: 5 days early) | Round 2 field research (Tier 3/4) + real order |
| Bonus economics | break-even 8.6 (10.3–10.7 conservative); ₹62 cr (conservative, +15) to ₹184 cr (case, +20) a year; −3 RTO points at +15 | Our model (data pack) |
| Baseline of flagged orders | 60% (top 20%) / 51% (top 10%) | Our assumption |
| Pilot | 4 hubs, 24 pairs, ~12,000 flagged orders, 30 days, 8-week baseline; smallest effect ~4 per 100 | Our design / prototype |
| Chance of GO at +8 / +10 / +12 / +15 | 3 / 18 / 58 / 97% (top 20%) | Prototype, simulated |
| Score accuracy | top 20% catch ~46% of RTOs (random 20%) | Simulation only |
| Fake attempts | "no real attempt" ~9% of RTOs; ≤ ~1.5 RTO points addressable; review break-even ~1 in 10 | Round 1 pie / our model |
| 1 RTO point | ≈ 7.6 mn parcels ≈ ₹92 cr a year | Our calculation |
| Hold & Re-home | ₹145 per match, ₹8 to hold, break-even 5.5%; ₹50 / 140 / 270 cr | Our model |
| Hub pickup | about ₹112 net; never a delivery, never a bonus | Our model |
| Cost per successful delivery | ₹84.8 → ₹77.7 | Our calculation |
| City spread | Vadodara 18% vs Patna 35% | Shipway 2025 |
| Delivery time | RTO 22% (1–2 days) → 35% (5+ days) | Shipway 2025 |
| Seasonality | D2C RTO ~39% (Nov 2025) → ~21% (Feb 2026) | Unicommerce 2026 |
| TrustMesh | 166 mn listings; RTO down >10% | Q4 FY26 letter |

## Screenshot list (current build, before the freeze; Lucknow hub; never a real phone number or AWB)
1. `/pilot` default: GO, range diagram, ✔ Fair comparison, odds bar (slide 6). Crop out the fake-attempt slider until the relative rule (prompt 27, Part 1a) is built: the live build still says 5%.
2. `/pilot` at about +8: RE-PRICE with "Next: Run Pilot 2" (slide 6, optional)
3. `/pilot` yearly-rupees table (slide 6)
4. `/rider` Demo Bonus rider with the ₹ +15 chip (slide 5)
5. `/ops` after Autopilot + Close pilot: Bonus vs Control card + money ledger (slide 5)
6. `/audit` 14 green checks (slide 5, small)
7. `/desk` one parcel card: forecast, gates, expected value (slide 7)
8. `/desk` money tiles + Backtest panel (slide 7)
9. `/customer` second-chance message with four options and the pickup code (slide 7)
10. `/` landing **Demo-mode** QR (slide 4). Never a shared-day QR: it contains the live key.
11. *(After the hub-captain build)* the captain queue and the rider's strike meter (slide 5).

## Still to arrive
- **Round 2 field research numbers:** how many riders, hubs and towns (the **[n]** on slide 4), and the towns' names if they can be shown.
- Any survey or field split of **"not ready" vs "not wanting"** refusals (slide 4 ② and the reason map).
- Rider/hub call findings: how long refused parcels sit at the hub (slide 7 callout), who decides a failed attempt today (slide 5: who becomes the hub captain).
- Source lines for Meituan / Uber Eats / DoorDash / Ekart; URLs for Delhivery QC-RVP. The mentor's feedback. The redrawn real-order strip.
- **Resolved 2 Oct:** the cause split is the Round 1 pie (our research blend), so the 9% is ours; Round 2 research covered Tier 3/4.
