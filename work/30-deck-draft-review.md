# 30: Review of the first deck draft (`GPS_IIT Bombay_ROUND_2.pptx`, 3 Oct) and the fix plan

**How to use this file:** fix in the order of the sections. Section 1 holds the errors a judge would catch; section 2 the new story and order; section 3 slide-by-slide edits with exact text; section 4 presentation polish; section 5 a number-consistency table; section 6 the final checklist.

**Where the draft stands:** a strong draft. The story is clear ("three nots"), the economics are right (I re-derived every figure), the prototype has its own slide, and the 90-day plan is thoughtful. **Score today ≈ 8.2 / 10. After these fixes ≈ 9.1.**

| Criterion | Now | After fixes | What moves it |
|---|---|---|---|
| Quality of research | 7.5 | 9 | Put the field research (Tier 3/4, early arrival, hubs ₹5, landmarks, our test order) on the slides; label the estimated split |
| Depth of analysis | 9 | 9 | Already strong |
| Innovativeness | 8.5 | 9 | Fix month 3; show how the fixes compound |
| 10x thinking | 7.5 | 9 | Give the 10x its own slide (we have room for one more slide) |
| Feasibility | 9 | 9.5 | The KILL path + "1,253 tests, 18 audit checks" + a finished verdict screenshot |
| Presentation | 7.5 | 9 | Less text, no clipped or overlapping elements, no "Bridge:" labels, one name per lever |

The draft numbers slides with the cover as 0 (exec summary = 1 … risks = 9). This file uses the same numbering for the current draft, and the new numbering in section 2.

---

## 1. Must-fix: errors a judge would catch

### 1.1 (FINAL, 3 Oct) Month 3 depends on what month 1 shows: the second-attempt bonus is the "pay smarter" trial when paying on every attempt doesn't pay
**The logic:** month 1 answers two different questions: *(a) do riders put in more effort when paid?* and *(b) does paying ₹15 on every attempt pay for itself?* The second-attempt bonus is the right move when (a) is yes and (b) is no: it pays only where an order has already shown it is hard (a genuine failed first attempt), so far fewer bonuses go to orders that would have arrived anyway (break-even ~7 extra per 100 re-attempts instead of 8.6 per 100 flagged). The alternative in that case is killing the bonus, so the trial can only add.

**Month 1's gate has three outcomes, and month 3 follows from it:**
| Month 1 shows | Month 3 |
|---|---|
| **Effort responds AND any-attempt pays** (low end ≥ break-even) | **SCALE PREP:** keep ₹15 on any attempt; prepare the region phase (~40 hubs, 10% Control); the Router starts by hand |
| **Effort responds BUT any-attempt doesn't pay** (lift ≥ +3, below break-even) | **PAY SMARTER (trial):** stop paying on every attempt; pay ₹15 only on the **re-attempt** of a flagged order, and only after a **verified, high-effort first attempt** (≤ 200 m from the door, 2+ calls, 5+ min wait) **and** the customer said on WhatsApp they still want it. Suspect first attempt → captain, no bonus |
| **Effort doesn't respond** (lift < +3) or a guardrail breaks | **KILL the bonus.** The attempt check and two-way WhatsApp continue on their own; the Router starts on the customers' replies (the compounding lane) |

**Guards for the pay-smarter trial** (it pays more for attempt 2 than attempt 1, so a rider could be tempted to defer):
- The **high-effort** first attempt is required, not just a genuine one: a rider who really waits and calls usually delivers, so deferring is hard to fake.
- **Stop rules:** the first-attempt delivery rate on flagged orders must not fall below month 2's, and the average days to deliver must not rise. If either breaks, stop the trial.
- Measured, as before, Bonus vs Control in the same pairs.

**Deck text (one line):** *"Month 3 depends on month 1: if paying on every attempt works, we prepare to scale; if riders respond but it doesn't pay, we pay smarter, only for genuine second-attempt rescues; if riders don't respond, the checks carry on without the bonus."*

*(The original analysis below is kept for the reasoning; where it conflicts, the resolved version above wins.)*

### 1.1 (original) Month 3 "the bonus moves to the second attempt" breaks our own rule and pays riders to fail first
- **It contradicts the agreed rule:** ₹15 is paid when a flagged order is delivered **on any attempt** (first or second).
- **It creates the wrong incentive:** under "second attempt only", a rider earns **₹0 extra** for delivering a flagged order on the first try but **₹15** on the second. A rider can pass the "genuine" check cheaply (stand near the door, call once, wait a few minutes) and come back the next day for ₹15. That **delays the customer**, costs a **₹21 re-attempt** and adds a trip, the opposite of what the brief asks (no hit to delivery cost or customer experience).
- **It weakens the main lever:** most of the rescue happens on the first attempt (that's where "call again, wait, offer UPI" matters).
- **Fix: Month 3 = "PAY SMARTER" by tuning who gets it and how much, keeping "any attempt":**
  - **A clean-record tier:** riders with no suspect attempt in 30 days earn the full ₹15; a rider with a confirmed strike drops to ₹0 on bonus orders for 14 days (the strike ladder). Pay follows *genuine* effort without delaying anyone.
  - **Price by difficulty (first step):** ₹10 on the lower half of the flagged 20%, ₹20 on the riskiest 5%, budget kept the same. This is a small first step towards the 10x.
  - **Prepare the region test:** top 10% vs 20%, ₹10 vs ₹15, across ~40 hubs.
- **Also change:** slide 1's Month 3 box ("Pay only for genuine rescues" → "Pay for genuine effort, priced by difficulty"); slide 5's bottom note ("That is what makes a second-attempt bonus safe" → delete); slide 8 panel 3's "Second-attempt bonus (month 3)" box (→ "Clean-record tier + difficulty price: budget-neutral; the test measures whether extra deliveries per ₹ rise"); slide 9's row "fakes the 1st attempt to earn the 2nd-attempt bonus" (→ "farms the bonus by repeating weak attempts: suspect attempts → strike → ₹15 not paid; the clean-record tier").

### 1.2 There is no "if the bonus fails" path (your question)
- Today it is one small line at the bottom of slide 5. Month 1's gate shows KILL, but nothing says what happens next.
- **Fix:** see section 3, slide 7 (new numbering): a **KILL lane** under months 2–3, plus the **compounding chain**. Also add one line to the exec summary and one row to the risks.

### 1.3 Two slides contradict each other on the attempt check
- Slide 4 says "a bonus rider follows the same process, and the ₹15 is not paid" as if it always applies; slide 5 says month 1 has **no attempt check**.
- **Fix (slide 4, panel 4, last line):** *"From month 2, a fake attempt is a strike for every rider; for a Bonus rider the ₹15 is also not paid. Month 1 measures pay on its own."*

### 1.4 The levers map puts two-way WhatsApp in "Consider" while the text pilots it
- On slide 3 the map plots P1 (two-way WhatsApp) as low impact, low effort, yet the table gives it the biggest pool (not ready, 40%) and the outcome box says it joins the pilot.
- **Fix:** move P1 into **Pursue**, lower than R1 and R2 (it is low effort and acts on the biggest "not"). Headline: *"…we pilot the two that act at the door, and give the customer a voice"*.

### 1.5 The 40 / 29 / 31 split looks like measured data on slide 1
- Slide 2 labels it "our estimate", but slide 1 shows it as hard numbers.
- **Fix (slide 1):** add a tiny "est." under each of the three tiles, plus in the footer: *"Split: our estimate from rider and buyer research and the data pack; two-way WhatsApp measures the real split."* If the survey sheet gives a real split, use it with its n.

### 1.6 Facts to correct or align
| Where | Now | Change to |
|---|---|---|
| Slide 2, "Already in play" | "Valmo now carries ~50–65% of Meesho's shipments" | "Valmo carried 48% of Meesho's shipments in FY25, 65% in H1 FY26" |
| Slide 3, "Already in play" | "COD 88.7% → 72%" | "COD share 88.7% (FY23) → 72% (H1 FY26)" (slide 2 uses FY25's 77%; always say the year) |
| Slide 2, panel 2 | "Every RTO is one of three customer **intents**" | "Every RTO is one of three **kinds of failure**" ("not reached" isn't an intent; it's the system failing) |
| Slide 2, table | "Damaged / wrong item" under Not wanting | Keep it there, but slide 6 must add: *"Damaged or wrong item → seller claim, never re-homed"* |
| Slide 8, heat-map | ₹10 row 160 / 244, ₹15 row 183 | Fine, but use the same numbers everywhere (the plan docs say 161 / 245 / 184; pick one set) |
| Slide 8, panel 3 | "Every 1% re-homed ≈ ₹5.5 cr" | "Every 1% of 'not wanting' parcels re-homed ≈ ₹5.5 cr a year, gross" (say 1% of what) |

### 1.7 Layout breaks
- **Slide 4:** the "+₹15" badge sits on top of "hard stop, when delivered". Move the badge up, or the text right.
- **Slide 5:** the **Threshold** row is clipped ("retune if > 1 in 3 strikes are overturned" and "is negative for 2 months" overflow). Make the row taller or shorten the text.
- **Slide 2:** the headline orphans "residual," on its own line. Rephrase so the first line ends cleanly (see section 3).
- **Every slide:** the **"Bridge:"** label reads like an internal note. Keep the sentence, delete the word "Bridge:", and set it in small italics.

---

## 2. The new story and order (cover + 10)

The brief allows 6–10 slides plus the cover. Two changes: **give the 10x its own slide** (it is scored on its own, and today it is a third of a slide), and **put the money before the 90-day plan**, so the plan's gates can point back to break-even instead of forward.

| # | Slide | Comes from the draft | Asks covered |
|---|---|---|---|
| 0 | Cover | 0 | — |
| 1 | **Executive summary** | 1 (edited) | ① |
| 2 | **Where and why: three kinds of failure** | 2 (edited + the real-order strip + field research) | ② |
| 3 | **Five levers, scored** | 3 (P1 moved) | ③ |
| 4 | **At the door: pay, check, hear** | 4 (edited) | ③ |
| 5 | **The orders we still lose: the Router** | 6 (moved up) | ④ |
| 6 | **What it costs and what it returns** | 8 (moved up, month 3 box replaced) | ③ |
| 7 | **The 90-day plan, with a KILL path that compounds** | 5 (rewritten month 3 + KILL lane) | ⑤ |
| 8 | **Our working prototype** | 7 (better screenshots + test counts) | Feasibility |
| 9 | **Every way to game it has a guard** | 9, panels 1–2 only | ⑥ |
| 10 | **The long game: price every hard stop on Meesho's own map** | 9, panel 3, expanded | 10x |

**Headline test (read only these, in order):**
1. Riders cut effort where pay is flat. Pay for the hard order, check the attempt was real, and recover what still fails
2. RTOs are down, but COD still fails 8× more often, and every failure is one of three kinds
3. Five new levers, scored: we pilot the two that act at the door, and give the customer a voice
4. Pay the rider for the hard order, check the attempt was real, and hear the customer
5. The orders we still lose: send each refused parcel to its cheapest recovery, not an automatic ₹120 trip back
6. One avoided return pays for eight bonuses: the bar is low, the upside is large, and a ₹65,000 test decides
7. Three months, one question each, and if the bonus fails, the checks keep compounding
8. Our working prototype: one decision engine, four consoles, one shared record
9. Every way to game it has a guard, and every risk at scale has a stop rule
10. Today the risk score is a filter; tomorrow it's a price on Meesho's own delivery map

**Bridges (italic, no label):** 1→2 *"Here's where and why orders fail."* · 2→3 *"Three kinds, five levers. Which first?"* · 3→4 *"So does paying more change what a rider does?"* · 4→5 *"Some customers will still say no."* · 5→6 *"What does it all cost, and what does it return?"* · 6→7 *"How it switches on over 90 days."* · 7→8 *"Here's what the rider, customer, hub captain and Ops see."* · 8→9 *"The numbers work only if nobody games them."* · 9→10 *"Guarded and tested, the bonus is only the first step."*

---

## 3. Slide-by-slide edits (new numbering)

### Slide 1: Executive summary
- **Panel 2 "Why it happens":** add one line under the three tiles: *"From riders, hubs and buyers in metro and Tier 3/4 towns: parcels arrive before the promised date and the cash isn't ready; addresses are landmarks; hubs earn only ₹5 a delivered parcel."* Add "est." to the 40 / 29 / 31 tiles.
- **Panel 5 "The 90-day pilot":** Month 3 → *"PAY SMARTER · if paying on every attempt doesn't pay, pay only for genuine second-attempt rescues"*. Add one line under the bar: *"If the bonus fails, the attempt check and two-way WhatsApp still go live, and keep compounding."*
- **"The long game" box:** *"Today the risk score is a filter; tomorrow it's a price per delivery, on Meesho's own delivery map."*
- **Footer:** add "field visits in metro and Tier 3/4 towns [n]" and "our Meesho and Flipkart test orders".

### Slide 2: Where and why
- **Headline:** *"RTOs are down, but COD still fails 8× more often, / and every failure is one of three kinds"*.
- **Panel 2 title:** "Every RTO is one of three kinds of failure".
- **Add a real-order strip** across the bottom of panels 2–3 (short, redrawn, no phone or AWB numbers): *Our Meesho COD order: promised 3 Oct → arrived 28 Sep, no warning → one-way "Arriving Today" → the rider called twice and didn't wait → "Failed Delivery". Not ready, then not reached, in one parcel.*
- **Panel 3:** add two field findings to "Customer side": *"Parcels arrive early; the cash isn't ready (Tier 3/4)"* · *"Addresses are landmarks, not house numbers"*. Add to "Rider side": *"Riders said a per-order bonus would change how hard they try"*.
- **Methods strip (footer):** 12 rider interviews · COD buyer survey (25+) · field visits in metro and Tier 3/4 towns **[n]** · our test orders on Meesho and Flipkart · Valmo's rider contract · Meesho filings · data pack. (This is where the research score is won.)
- **To make room:** shorten "Already in play" to one line (it is repeated on slide 3).

### Slide 3: Five levers, scored
- Move **P1** into **Pursue** (lower than R1 and R2). Headline: *"…we pilot the two that act at the door, and give the customer a voice"*.
- Outcome box: *"R1 + R2 are the 90-day pilot, with P1 as the customer's side of the check. **R2 and P1 don't depend on R1:** if the bonus fails, they still go live. C1 starts by hand after month 2; P2 starts in one small-town hub."*
- Fix "COD 88.7% → 72%" with years (1.6).

### Slide 4: At the door
- Fix the "+₹15" overlap (1.7).
- Panel 4 last line (1.3): *"From month 2, a fake attempt is a strike for every rider; for a Bonus rider the ₹15 is also not paid. Month 1 measures pay on its own."*
- Add a **complaints line** to panel 4 B: *"After delivery: 'Anything wrong?' (rude, asked for money, pressured, not received). A 'not received' claim takes the ₹15 back at once."*
- Optional: on the bonus label, *"paid on any attempt, held 7 days"*.

### Slide 5: The Router (was slide 6)
- Add to "The law and the guards": *"Damaged or wrong item → seller claim, never re-homed"*.
- Add one line to the lane table: *"The customer's own WhatsApp reply picks the lane: 'yes, but not now' → second chance; 'I don't want it' → re-home or return."* (This is how two-way WhatsApp compounds into the Router.)
- "When" line: *"From month 3, by hand in 3 hubs in Uttar Pradesh (most sellers, 15.9%), using month 2's customer replies; automated once the match rate clears 5.5%."*

### Slide 6: Costs and returns (was slide 8)
- Keep the **"Second-attempt bonus (month 3)"** box but retitle it **"Pay smarter (month 3, if any-attempt doesn't pay)"**: *"Paid only on the re-attempt of a flagged order, after a verified, high-effort first attempt and a 'still want it' reply. Break-even ≈ 7 extra per 100 re-attempts (if Control delivers 50 of 100). Far fewer bonuses go to orders that would have arrived anyway."*
- Add a small **"If the bonus is killed"** box: *"The attempt check targets up to ~1.5 RTO points (no real attempt) and two-way WhatsApp ~1 point (not home or unreachable, if it fixes 1 in 5), for ₹10 reviews and a few messages. Planning assumptions; the pilot measures them."*
- Fix the "1% re-homed" wording (1.6).

### Slide 7: The 90-day plan (was slide 5): the main rewrite
**Headline:** *"Three months, one question each, / and if the bonus fails, the checks keep compounding"*

**Top lane (the bonus path):** keep months 1 and 2 as they are. **Month 1's gate becomes a three-way fork** (see 1.1), and month 3 shows the two bonus branches stacked:
> **Month 3 · SCALE PREP** *(if month 1: effort responds and any-attempt pays)*: ₹15 on any attempt continues; region phase prepared (~40 hubs, 10% of riders kept as Control); the Router starts by hand in 3 UP hubs. *Gate:* SCALE / STOP (net ₹ negative for 2 months).
> **Month 3 · PAY SMARTER** *(if month 1: effort responds but any-attempt doesn't pay)*: ₹15 only on the **re-attempt** of a flagged order, after a **verified, high-effort first attempt** (≤ 200 m, 2+ calls, 5+ min) and a "still want it" reply. *Measure:* extra deliveries per ₹ paid · cost per rescued order · **first-attempt delivery rate and days-to-deliver (must not get worse)**. *Gate:* SCALE the smarter rule / STOP. Break-even ≈ 7 extra per 100 re-attempts.
> Month 2 (attempt check + two-way WhatsApp for both groups) is what makes the pay-smarter trial possible: it needs verified attempts and the customer's reply.

**New bottom lane, starting from Month 1's KILL box (thin, a different colour):**
> **If month 1 says KILL, months 2–3 still run, without the bonus**
> **Month 2 · CHECK + LISTEN:** the attempt check and two-way WhatsApp, all 4 hubs, every rider. *Do they cut RTO on their own?* Measure: suspect-attempt rate vs the 8-week baseline · deliveries recovered by free re-attempts · "not ready" refusals turned into deliveries by "keep my date" or "pay by UPI".
> **Month 3 · ROUTE:** the customer's reply routes each refused parcel (second chance or re-home); the Router starts by hand. *Gate:* a ₹10 review pays above 1 in 10 recoveries; WhatsApp is worth it if it beats a hub without it.

**New strip under both lanes: the compounding chain**
> **Check → Listen → Route → Map → Price.** The attempt check builds a record of genuine attempts. Two-way WhatsApp captures what the customer wants. That reply routes each refused parcel. The GPS of genuine attempts and deliveries learns the real doorstep. The map sets the price per stop. **None of it needs the bonus, and each month makes the next step cheaper and more accurate.**

- Fix the clipped Threshold row (1.7).
- Replace the bottom pink note with: *"Bonus and Control follow the same process; the Bonus group has one extra consequence: a suspect attempt means the ₹15 is not paid. Not a dead end: if the bonus is killed, the same 90 days test the checks on their own."*
- Add a **complaints line** to "What we measure" (months 1–3): *"complaints per 1,000 deliveries, Bonus vs Control, weekly; a hub at 1.5× pauses payouts for review."*

### Slide 8: The prototype (was slide 7)
- Replace the Ops screenshot showing **"INCOMPLETE / too early to say"** with a **finished verdict**: run Autopilot, then +1 day twice, then Close pilot (or use the `/pilot` page showing GO, the range and the ✔ Fair comparison line). A hero screenshot shouldn't say "incomplete".
- Make the **hub captain** screenshot bigger (it is unreadable now); crop it to one evidence card.
- Add to "What's real": *"1,253 automated tests · 18 audit checks on every simulated day (nothing delivered without an OTP, every strike has a reason, the ledger matches every screen)"*.
- Headline reference: "Every rule on slides 4–7 runs as working code" (after the re-order).

### Slide 9: Risks (panels 1–2 of the old slide 9)
- **Headline:** *"Every way to game it has a guard, / and every risk at scale has a stop rule"*.
- Replace the row "fakes the 1st attempt to earn the 2nd-attempt bonus" (1.1).
- Add to "Risks at scale": **"7 · The bonus doesn't pay → months 2–3 test the checks on their own; both continue, and the Router starts on the customers' replies."**
- Customer row: add *"complaints per 1,000 deliveries, weekly, Bonus vs Control"*.
- With the 10x moved out, there's room for bigger text and the full risk table.

### Slide 10: The 10x (new full slide, from panel 3 of the old slide 9)
**Headline:** *"Today the risk score is a filter; / tomorrow it's a price on Meesho's own delivery map"*
- **① Three horizons (staircase):** Now: ₹15 on flagged orders, attempts verified, tested against matched riders → 6–12 months: pay by difficulty (risk × distance × address × time slot; budget-neutral: less on easy stops, more on hard) + **every delivery teaches the map** (doorsteps learned from verified deliveries and the customer's own landmark words) → Long term: **Meesho's own delivery map**, a hexagon grid of India like Uber's H3; each cell carries its real doorsteps, failure rate, best time and difficulty price; refused parcels are matched to buyers in the same cell.
- **② Visual:** a hexagon map of one town shaded by difficulty, one cell opened: "412 learned doorsteps · failure 21% · best time 6–9 pm · price +₹12" (*illustrative*).
- **③ Judge carriers by cost per successful delivery:** Carrier A ₹45 at 10% RTO = ₹63; Carrier B ₹40 at 20% = ₹80. *"The cheaper parcel is the dearer delivery."* Meesho already picks carriers by cost per parcel; picking by cost per successful delivery makes every carrier price the hard stop.
- **Asset-light line:** *"All software and incentives on Valmo's existing hubs, apps and payout lines; the grid is open-source. Any part can be switched off."*
- **Last words of the deck:** *"Money that carries no information can't coordinate a network. Price the hard stop."*

---

## 4. Presentation polish (how to present it better)

1. **Cut the text by about a third.** Most slides carry 550–700 words at ~9 pt. Aim for **≤ 400 words** and **body text ≥ 11 pt** (judges read a PDF on a laptop). Rule of thumb: one hero number or visual per panel, at most 3 bullets, no sentence over 2 lines.
2. **One message per slide:** the headline states it, the panels prove it, the callout repeats it in 8–10 words. Delete anything that doesn't serve the headline.
3. **One name per lever, everywhere:** R1 **Rescue Bonus** · R2 **Attempt check** · P1 **Two-way WhatsApp** · P2 **Learned doorstep** · C1 **Local re-home (the Router)**. The draft mixes "Rider pay for hard orders", "Proof of attempt", "attempt check" and "fake-attempt check". Pick these five and search-replace.
4. **Delete the word "Bridge:"**; keep the sentence, small and italic, bottom-right.
5. **Screenshots must be readable:** at most 2 per panel, cropped to the part that matters, with a one-line caption ("The captain sees: 909 m away, 0 calls, 'nobody came'").
6. **Numbers:** always give the year (FY25, H1 FY26); label estimates "est." or "our estimate"; label simulated numbers "in simulation".
7. **Page numbers** with the cover as 0, to match the in-slide references.
8. **Colours:** keep one colour per kind of failure on every slide (not ready = pink, not wanting = orange, not reached = purple), already done well on slides 1–3. Carry it into the levers, the Router and the 90-day plan.
9. **Read the 10 headlines aloud in order** before exporting. If one doesn't lead into the next, fix that headline.

---

## 5. Numbers that must match on every slide
| Figure | Use |
|---|---|
| RTO trend | 21.2% → 18.6% → 17.8% (FY23–25), 18.4% (H1 FY26); ~70% of the fall from prepaid |
| COD vs prepaid | 22.3% vs 2.7% fail (FY25), 8×; 96% of failures, 77% of shipments |
| Three kinds (est.) | not ready 40% (6.8 pts, ~52 mn) · not wanting 29% (4.9 pts, ~38 mn) · not reached 31% (5.3 pts, ~40 mn) |
| Break-even | 8.6 extra deliveries per 100 flagged; ₹120 ÷ ₹15 = 8 |
| At +15 | −3 RTO points (17% → 14%) · ₹103 cr net a year · ₹275 cr avoided − ₹172 cr bonuses · cost per success ₹84.8 → ₹80.3, bonus included |
| Test | 4 hubs · 24 pairs · ~₹65,000 in bonuses (30 days) · 8-week baseline |
| Attempt check | ₹99 per recovered delivery · ₹10 a review · pays above 1 in 10 |
| Router | ₹145 per re-home · ₹8 hold · 5.5% match · 17.5% re-attempt · 6.7% pickup |
| Carriers | A ₹63 vs B ₹80 per successful delivery |
| Prototype | 1,253 automated tests · 18 audit checks |
| Valmo share | 48% (FY25) → 65% (H1 FY26) |

---

## 6. Final checklist before export
- [ ] Month 1's gate is a three-way fork; month 3 = SCALE PREP (any-attempt pays) or PAY SMARTER (second-attempt trial, if effort responds but any-attempt doesn't pay) or KILL lane; the trial needs a high-effort first attempt and has the first-attempt-rate and days-to-deliver stop rules (1.1)
- [ ] The KILL lane and the compounding chain are on the 90-day slide; one line each on slides 1, 3, 6 and 9
- [ ] Slides 2 and 4 agree on when the attempt check starts (1.3)
- [ ] P1 is in Pursue (1.4)
- [ ] "est." on the 40 / 29 / 31 tiles; the field research and its **[n]** on slides 1–2; the real-order strip on slide 2
- [ ] Refusal split: real survey numbers with n, or labelled "illustrative" (never a made-up split presented as data)
- [ ] No clipped rows, no overlaps, no "Bridge:" labels
- [ ] Prototype slide: a finished verdict screenshot, a readable captain card, the test counts
- [ ] 10x has its own slide; total = cover + 10
- [ ] One name per lever; years on every number; no phone, OTP or AWB numbers
- [ ] Headline test passes
