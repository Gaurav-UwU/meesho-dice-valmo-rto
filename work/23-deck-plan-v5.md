# 23: Deck plan v5 (1 Oct 2026): what the prototype now lets us say, slide by slide

**Use with `14-deck-handoff.md` (v4).** v4 is still the base for look, structure and sources. This file is the **delta**: it replaces every "PENDING" number in v4, rewrites the slides the last two build sessions changed (5, 6, 4, 7, 8), and gives a screenshot shot-list. Everything marked *simulated* comes from our synthetic prototype and must be labelled "in simulation" and "to be measured in the 30-day pilot".

**Dates:** submit **Sat 3 Oct**, freeze **Fri 2 Oct 3 pm** (screenshots, QR, 90 s video), Sun 4 Oct is buffer only. Live prototype: https://valmo-rescue-console.vercel.app (Demo mode is the product; real WhatsApp sending is blocked by Twilio's trial, so the customer phone is an emulator).

---

## 0. The three sentences the whole deck now rests on (a fourth is added in §9: the fallback story)
1. **We pay riders ₹15 only for the hard orders, and we test it fairly:** riders are paired on past delivery rate, a coin decides who gets the bonus, and GO needs even the **low end** of the range to pay for itself.
2. **If it doesn't pay we never re-read the data.** We change one lever (the top 10% or a smaller bonus) and run **Pilot 2** with its rule locked first.
3. **Every refused parcel takes its cheapest legal recovery,** and we **hold a parcel for a new buyer only where even the low end of the demand forecast clears break-even (5.5%).**

---

## 1. What changed since v4 (fix these first)
| v4 said | Now say | Why |
|---|---|---|
| Smallest effect the pilot can see **~7.5 per 100** | **~4 per 100** (24 pairs; ~5 at the top 10%) | Pairing on past rate removes most rider-to-rider noise. |
| "If the bonus truly adds +15 per 100, GO about **2 times in 3**; at +12 usually RE-PRICE" | "At +15 the pilot says GO about **97 times in 100**. At +12 it is about a **coin flip (6 in 10)**. At +10 or less it usually says RE-PRICE and we'd run Pilot 2." | Final simulated numbers (table in §3). |
| Slide 6 lane 2 "Hold & Re-home where there is nearby demand" | **"Hold only where the low end of the forecast clears break-even."** | The Desk forecasts demand and shows a range. |
| Second chance = reschedule, pickup, other address, pay now | **Four options built: Deliver again, Different time, Pay now by UPI, Pick up at hub.** (Another address in the same state is **not** built; say "planned".) | What the prototype does. |
| Pilot rule had 5 safety rules in some places | **2 safety rules only:** normal orders fall more than 1 point; suspected fake attempts above 5% (judged once there are 30 attempts) | Plan 18. |
| Slide 4 Audit line | The prototype's Audit now runs **14 checks** | Desk v3 added 4. |
| Screenshots and QR "PENDING" | See the shot-list in §6 | Prototype is built and live. |

**Do not use:** "GO at +9 or more", "12,000 orders detects +3", "85% of risky orders delivered", "1 in 8", any statistics word on a slide ("clustered", "ICC", "design effect", "MDE", "t-value"; say "fair pairs", "range", "smallest effect it can see").

---

## 2. What the "Yearly rupees by bonus size" table is (slide 5, ② Sensitivity + scale)
This is the table you pasted from the prototype's `/pilot` page.
- **What it shows:** the **net ₹ crore per year** Valmo would gain (positive) or lose (negative) from the bonus, **after paying the bonuses**, for each **bonus size** (rows: ₹10, ₹15, ₹20) and each **assumed effect** (columns: +5, +10, +15, +20 extra deliveries per 100 flagged orders).
- **How each cell is worked out** (the deck basis: 60% of flagged orders delivered anyway, ₹120 return avoided per extra delivery, 153 million flagged orders a year = 20% of Valmo's 763.5 million FY25 orders):
  - Net per 100 flagged orders = ₹120 × Δ − bonus × (60 + Δ). The bonus is paid on **all** delivered flagged orders, including the 60 that would have been delivered anyway.
  - ₹ crore a year = net per 100 ÷ 100 × 153 million ÷ 10 million.
  - **Check, ₹15 at +10:** 120×10 − 15×70 = 1,200 − 1,050 = ₹150 per 100 → ₹1.50 an order × 153 mn = ₹229.5 mn = **₹23 cr**. **₹15 at +5:** 600 − 975 = −₹375 per 100 → **−₹57 cr**. **₹10 at +5:** 600 − 650 = −₹50 → **−₹8 cr**. **₹20 at +20:** 2,400 − 1,600 = ₹800 per 100 → **₹122 cr**.
- **How to read it:** a negative cell means that combination loses money. At ₹15 the bonus needs roughly +8.6 or more to break even, so +5 loses and +10 wins. A bigger bonus needs a bigger effect (₹20 loses at +10).
- **What it is not:** it is **not a pilot result.** It is a what-if grid of our own maths, and it **does not move with the sliders**, so it always matches slide 5. It uses the case-basis saving (₹120); it does **not** subtract the reported ~₹18 rider fee (that is the conservative case, in the small line under the chart).
- **Slide wording:** *"If a ₹15 bonus truly adds +10 extra deliveries per 100, Valmo gains about ₹23 cr a year; at +15, about ₹103 cr; at +5 it loses ₹57 cr. This is why we test before we scale."* Footer: *our model on the case data pack.*

---

## 3. Final pilot numbers (simulated; 4 hubs, 24 rider pairs, 30 days, ~12,000 flagged orders)
| | Top 20% (Pilot 1) | Top 10% (Pilot 2 option) |
|---|---|---|
| Delivered without the bonus (our assumption) | 60% | 51% |
| Break-even | +8.6 per 100 | +7.3 per 100 |
| Flagged orders a year | 153 mn | 76.5 mn |
| **Chance the pilot says GO if the true effect is +8 / +10 / +12 / +15** | 3% / 18% / **58%** / 97% | 6% / 32% / **70%** / 97% |
| Smallest effect it can reliably see | **~4 per 100** | **~5 per 100** |
| Default screen (seed 2026, +12 true) | **GO**: +13.6, range +11.1 to +16.2 | RE-PRICE: +10.2, range +6.6 to +13.8 (one unlucky run) |
- Two safety tests at the default: a −3 point fall in normal orders, or a 9% suspected fake rate, **both give KILL** even at +15.
- **Say this out loud on slide 5 (small type):** *"The simulation has no good-month/bad-month luck in riders, so a real pilot will be noisier: a wider range and fewer GOs."*
- **Open decision:** the prototype's "Deck assumption" button uses **+12**, but the deck's case is **+15**. Either quote both (as above) or change the button to +15. Gaurav to decide before the screenshot.

---

## 4. Slide by slide: what changes
**Slide 1 (Executive summary).** Headline numbers unchanged (break-even 8.6; ₹62 cr conservative to ₹184 cr case; −3 RTO points at +15). Add the live link and **QR** (landing page, "Prefer a real phone?"). Keep the caused-not-delivered headline rule: *"the bonus caused X extra deliveries at ₹Y against a Control group."*

**Slide 2, 3.** No change from v4 (diagnosis, prioritised solutions). Survey, rider/hub calls and the cause chart are still the research teammate's.

**Slide 4 (Rescue Bonus, how it works).**
- Add the **score accuracy bar**: in simulation the top 20% by Rescue Score catch **~46% of all RTOs** (random 20%, perfect 49%). Small type: *"in simulation, to be measured on Valmo's last 90 days"*. The simulator builds failures from the same factors the score uses, so it flatters the score.
- Controls table as in v4 (stages: earned → pending → released after 7 days; caps; strikes). Add: *"A suspected-fake rate is judged from the attempts that look fake (far from the address, or the customer says nobody came); strikes are a stricter confirmed number."*
- Add the **Audit line**: *"Every day is checked by 14 automatic tests, for example nothing delivered without a verified OTP and no parcel held without an inspection."*
- Screenshots: rider app with the green "₹ +15 Bonus Eligible" chip; Ops "Bonus vs Control" card.

**Slide 5 (Economics and how we'd test it).** Keep v4's structure (unit economics, targeting table, pilot in 5 steps, rule table). Replace the pending lines with §3: **GO 97/100 at +15, coin flip at +12**, **smallest effect ~4**, the Top 10% column, the "real pilot will be noisier" line. Use the **sensitivity table with the §2 sentence**. Visual: the prototype's range diagram with the **✔ Fair comparison** line (shot 1).

**Slide 6 (Refused parcels). Rewrite the Router box:**
- Order of lanes, each by **expected value**: **second chance → hold & re-home → batched return.** Timers: second chance 24 h; shelf at most 48 h; **30 shelf slots shared by Hold and hub pickup**.
- **Second chance, four options:** Deliver again · Different time · Pay now by UPI · **Pick up at hub** (48 h, a pickup code; saves the ₹120 return, ₹112 net of the ₹8 shelf cost; **never counts as a delivery and never pays a bonus**: the original refusal stays the rider's failure in the pilot).
- **Inspect before you hold:** the hub inspects each parcel (unopened, seal intact, invoice outside, photo) before Hold. A parcel refused as **damaged or wrong item is never re-homed**; it goes back with a "seller claim / QC needed" flag. The seller's opt-in can never be overridden.
- **Hold & Re-home, new rule: "Hold only where the low end of the forecast clears break-even."** Break-even is a **5.5% chance** a buyer for the **same listing** appears within 48 h (₹8 ÷ ₹145).
- **The forecast, five points:** (1) only the **same seller and the same listing** is ever re-homed (the seller issues the new invoice); a similar product is **never** substituted; (2) similar listings are **evidence of demand only**, matched on the words in the title, same category, price within 30%; (3) it shows a chance **with a range**, a High / Medium / Low label and one line of evidence ("3 exact-SKU orders and 41 similar in 14 days"); (4) plain word matching that runs in the browser, **no AI service**, with the shared words shown as chips; (5) savings book only on real outcomes.
- **Backtest (small chart; synthetic, 9,600 forecasts):** calibrated on average (within 4 points); Brier score 0.080 vs 0.082 for always guessing the average (a modest win); a little low for the thinnest listings (2.5% forecast, 4.7% happened) and a little high at the top (24% forecast, 17% happened).
- **Do not claim the low-end rule earns more in total.** Same synthetic world: hold-every-parcel ₹5 per held parcel (₹5,095 per 1,000 refused); hold if the **average** clears 5.5%: ₹9 (₹5,523); hold if the **low end** clears 5.5%: **₹13 per held parcel, but it holds 42% of parcels instead of 62%, total ₹5,291.** Say: *"The low-end rule holds fewer parcels and each one pays more often and more. We choose it to protect against custody risk and wrong calls, not for a bigger total."*
- Small type, on the slide: *"History is synthetic. This shows the mechanism. Real calibration comes from the 30-day pilot, measured against the 5.5% break-even. Kill the Hold lane if the match rate is below 3% after 30 days."*
- Keep: UP first, non-GST sellers first; ₹50 / 140 / 270 cr sizing at a 2.5 / 7 / 13.5% effective match rate; footer sources as v4.
- Screenshots: a Desk parcel card (forecast range against the dashed 5.5% line, confidence chip, keyword chips, gate checklist) and the three money tiles.

**Slide 7 (30-60-90).** Keep v4's table. Add the **Router KPI list**, each with its count and "too early" until a lane has **30 parcels**: sales saved (second chances delivered ÷ sent), second-chance accept rate, re-home match rate against 5.5%, pickup rate and no-shows, average dwell hours, ₹ booked per refused parcel, skips and their reasons. **We do not simulate custody incidents or customer complaints: they are measured only in the real pilot** (say it; never show a 0). Keep the loop picture: **Pilot 1 → learn → Pilot 2 → scale**, "one lever changed, rule locked first".

**Slide 8 (Risks). Add three rows to v4's table:**
| Risk | Move | Likelihood | Guard |
|---|---|---|---|
| The demand forecast is wrong for thin listings | Router | Med | Hold only on the **low end** of the range; confidence label; backtest; kill rule: match rate below 3% after 30 days |
| Real pilot noisier than our simulation | Rescue | Med | Rule uses the low end; Pilot 2 loop; the smallest effect is stated; we do not claim more than the data pack |
| Pickup no-shows and shelf crowding | Router | Low–Med | 48 h window then batched return; shared 30-slot shelf cap; no extra messages; no bonus for pickups |

**Slide 9 (10x).** No change.

---

## 5. Numbers cheat sheet (additions and replacements for v4 §5)
| Figure | Value | Source |
|---|---|---|
| Smallest effect the pilot can see | ~4 per 100 (top 20%), ~5 (top 10%) | Prototype `/pilot`, simulated |
| Chance of GO at +8 / +10 / +12 / +15 | 3% / 18% / 58% / 97% (top 20%); 6% / 32% / 70% / 97% (top 10%) | Prototype, 300 reruns, simulated |
| Default pilot | GO at +13.6, range +11.1 to +16.2 (top 20%, seed 2026) | Prototype, simulated |
| Hub pickup | 48 h window; ₹8 hold cost; ₹120 saved when collected (₹112 net); never counts as a delivery or pays a bonus | Our model (data pack) |
| Match forecast | break-even 5.5% = ₹8 ÷ ₹145; hold only if the low end clears it; 14-day history; 80% range | Our model on synthetic history |
| Backtest | calibrated within 4 points; Brier 0.080 vs 0.082; per-parcel ₹5 / ₹9 / ₹13 for hold-all / average / low-end | Prototype backtest, synthetic |
| Audit | 14 automatic checks | Prototype `/audit` |
| Safety rules | 2: normal orders down over 1 pt; suspected fake attempts over 5% (from 30 attempts) | Our design |
Everything else in v4's cheat sheet stands.

---

## 6. Screenshot shot-list (Gaurav + Claude, before the Fri 3 pm freeze)
| # | Slide | Where | What to capture |
|---|---|---|---|
| 1 | 5 | `/pilot` | Step 2 on the default: GO, the range diagram, the ✔ Fair comparison line, the "300 times" odds bar |
| 2 | 5 | `/pilot` | Drag "How much the bonus helps" to about +8: **RE-PRICE** and the "Next: Run Pilot 2…" line |
| 3 | 5 | `/pilot` More detail | The yearly-rupees table (§2) |
| 4 | 4 | `/rider` | Demo Bonus rider with the green "₹ +15 Bonus Eligible" chip |
| 5 | 4 | `/ops` | After Autopilot + Close pilot: the Bonus vs Control card and the money ledger |
| 6 | 4 | `/audit` | 14 green checks |
| 7 | 6 | `/desk` | One parcel card: forecast block, gate checklist, expected-value line |
| 8 | 6 | `/desk` | The three money tiles at the top, and the folded Backtest panel opened |
| 9 | 6 | `/customer` | The second-chance message with the four options and the pickup code reply |
| 10 | 1 | `/` landing | The QR codes ("Prefer a real phone?") |
Use the Lucknow hub. Do not show any real phone number or AWB (the real-order screenshot in `research/` must stay redacted).

---

## 7. What still has to arrive (placeholders stay until it does)
- Survey results, rider/hub calls (incentive size, how long refused parcels sit at the hub, soft refusals), the cause-chart build-up, more test orders: **research teammate / Gaurav.**
- Mentor feedback from the 1 Oct call (three things worth asking if not yet asked: does rider pay allow a per-order bonus; is the TrustMesh signal available after dispatch; can hubs get SKU-level order history by pincode, near real time; the forecast needs it).
- Redrawn Flipkart-vs-Valmo WhatsApp visuals: the deck teammate.

## 8. Timeline
| When | Deck | Prototype |
|---|---|---|
| Thu 1 Oct (today) | Apply §1 fixes to slides 5, 6 and 4; leave screenshot placeholders | Live and green; code review and a real-phone run still to do |
| Fri 2 Oct, before 3 pm | Drop in screenshots (§6), QR, final numbers | Freeze: screenshots, QR, 90 s video (Demo mode, one browser) |
| Sat 3 Oct | Dry run, **submit** | No new features |
| Sun 4 Oct | Buffer only | |

---

## 9. ADDENDUM (2 Oct): the fallback story and fake-attempt control (source: `24-fake-attempt-control-plan.md`)
**The fourth sentence of the deck:** *"If the bonus fails in the 30-day pilot, we already have a concrete plan that does not depend on it, built and tested in our prototype: (1) fake-attempt control run by the hub captain, and (2) the Refused-Parcel Router with local re-home."* **Never write "proven"**: both are built and tested in simulation, and the real pilot measures them. The old idea of two parallel pilots is **dropped**: do not mention it.

**Why fake-attempt control belongs next to the bonus:** the bonus pays a rider to push through a hard stop; a fake attempt ("customer unavailable", logged from far away) is how a rider avoids that stop. The control makes giving up **visible and costly** and **recovers the delivery** through another rider, so the parcel is not sent back. It works with the bonus off, in both arms.

**Slide-by-slide edits**
| Slide | Edit |
|---|---|
| 1 Executive summary | One line: "Even if the bonus fails, two bonus-independent plans stand: fake-attempt control and the Router." |
| 4 How the bonus works | **Keep the payment rule exactly as it is: ₹15 when a flagged order is delivered on any attempt (first, second or later), confirmed by Gaurav on 2 Oct.** Then replace the "fake-attempt check" bullet with the **hub-captain flow**: suspicious attempts (phone far from the address, or the customer says nobody came) go to the **hub captain**, who sees the evidence and can **confirm, order a free re-attempt, or strike**. **Strike ladder (a proposal):** 1 warning and coaching; 2 every failed attempt reviewed for 14 days (and any bonus blocked); 3 escalated to the hub manager. Strikes expire after 30 days; Ops can overturn within 48 h; the rider sees every strike and its reason. Add a **monitoring** line: "a rider monitor flags riders with 3 disputes in 7 days and twice the hub median". Screenshots: the captain screen, the rider monitor, the rider's strike meter. |
| 5 Economics and test | "If it doesn't pay: **Pilot 2 with one lever changed, and the fallback keeps running either way.**" State that fake-attempt control runs in **both arms from the 8-week baseline**, so the bonus effect is measured **on top of it** (it may be a little smaller than without it). |
| 6 Refused parcels | Label the Router as **fallback part 2**: local re-home gated on the forecast's low end. |
| 7 30-60-90 | New row **"Fake-attempt control":** starts day 0 in every pilot hub, both arms. Metrics: disputed rate, confirmed rate, recovered deliveries, ₹ saved against review cost, overturn rate, time to decide. **Re-tune if** more than 1 in 3 strikes are overturned, or reviews cost more than they recover. |
| 8 Risks | Add: **captain conflict of interest** (guard: Ops overturn, a sample audit of decisions, a scorecard); **unfair strikes** (reasons, 30-day expiry, appeal); **gig-worker labour and data rules** (a real rollout needs a captain login and a documented process); **rider backlash**. Update "uplift below break-even": "RE-PRICE → Pilot 2; the fallback continues". |

**Numbers to use (all simulated or assumed; label them):**
- The simulation assumes **4%** of attempts are fake. **No real rate is known**; the "15% of failed deliveries are fake" claim is on the do-not-use list. The baseline measures the real one.
- **Break-even of a review:** a ₹10 human review pays if more than about **1 in 10** reviewed disputes ends in a delivery (₹120 return avoided − ₹21 re-attempt = ₹99; 10 ÷ 99 ≈ 10%).
- ₹ saved = recovered deliveries × ₹99 − reviews × ₹10 (shown per hub in the prototype's KPI panel once built).

**Screenshots to add to the §6 shot-list (after the feature exists):** the captain queue with an evidence card; the rider monitor with a "Watch" rider; the rider app's banner and strike meter. Until then the deck uses the existing Exception-queue screenshot, relabelled "being replaced by the hub-captain screen".
