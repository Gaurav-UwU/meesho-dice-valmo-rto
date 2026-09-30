# 20: How to use the prototype, function by function (1 Oct 2026)

Live site: https://valmo-rescue-console.vercel.app. Everything is synthetic. Add `?hub=lucknow|powai|whitefield|gaya` to any link to pick a hub (Lucknow is the default and the one the walkthrough uses).

## 0. Before you start: one device or several
| You want | Do this |
|---|---|
| **One laptop, three windows** (the normal demo and the video) | Open `/`. Under "Before you start" keep **One device (Demo)**. Use the three "Open" buttons (Ops, Rider, Customer). Keep all windows in the **same browser**: they share one day. |
| **Several devices / real phones** | Open `/` on the laptop, press **Several devices (shared day)**, then **Start with a fresh day** (asks for the admin token). Scan the **Rider** and **Customer** QR codes with phones. Every screen should say **SYNCED** with the same day. |
| Phones in Demo mode | They keep their own separate day: the badge says **ALONE**. That is expected. |

- In the shared day you will be asked once per tab for the **Live key** and, for buttons like Reset/Autopilot, the **Admin token**. Ask the team; never put them in a URL.
- Sandbox caveat: real WhatsApp sending is blocked by Twilio's trial. The customer screen is the WhatsApp emulator.

## 1. Ops console (`/ops`): the control room
Top bar: hub switcher, links to Desk, Pilot, Audit, Demo guide, and the SYNCED/ALONE badge.

**Day controls**
- **Start day**: scores every order, flags the riskiest 20% (purple on the map, "Bonus-Eligible"), stamps each flagged order into Bonus or Control, sim clock = Day 1 08:00.
- **Autopilot** (toggle) and **Step +50**: bots work the other stops (deliver, fail, refuse, sometimes fake an attempt) so the numbers move. They skip the "demo" stops reserved for you.
- **+1 h**: moves the sim clock one hour and fires every due timer (OTP expiry, no-reply nudge, second chance 24 h, hold 48 h).
- **+1 day**: jumps to 08:00 tomorrow: rescheduled orders return, failed attempts are retried once or closed as RTO, the 7-day bonus window advances.
- **Reconcile cash**: riders hand in COD cash; COD bonuses move from accrued to pending.
- **Close pilot** (asks to confirm): works every open order, runs the Desk on the Router's advice, skips past every window. Gives a decision-grade verdict.
- **Reset day** (asks to confirm): throws the day away and starts fresh (a new day for every device on the shared day).

**What you read on it**
- **KPIs** (orders, flagged, delivered, success rate, modelled RTO, cost per successful delivery, bonus budget, suspect attempts).
- **Live map**: click a dot to open an order. **Order detail** (or the dropdown "Jump to a Bonus-Eligible order"): why it was flagged (score bars), rank, status, messages, ledger, rider. Shows "Score accuracy (simulation)". On a delivered order the button **Customer returned this order (demo)** opens a return (inside 7 days the bonus is clawed back).
- **Bonus vs Control**: the verdict (INCOMPLETE / GO / RE-PRICE / KILL / INVALID), pairs of riders, the fake-attempt check, "the bonus caused X extra deliveries at ₹Y". Mostly INCOMPLETE until the day is finished: that is the rule working.
- **Exception queue**: failed attempts with weak proof. Buttons: **Confirm valid**, **Free re-attempt** (another same-arm rider retries, first rider not paid), **Strike**. 24 h of silence = an automatic free re-attempt.
- **Rider roster**: arm, earnings, pending/released/clawed-back bonus, fake-attempt rate.
- **Money ledger**: every rupee booked, who pays, bonus status (accrued → pending → released / clawed back / blocked). **Event feed**: the typed event log.

## 2. Customer phone (`/customer`): the WhatsApp emulator
1. Pick an order in the order picker (flagged ones are the interesting ones).
2. The "Arriving Today" message has buttons: **I'm home** (lowers the failure chance once), **Change time** (parks the order for tomorrow), **Fix address** (share a location; the map pin moves), **Pay now** (then **I have paid** or **Payment failed**: a failed payment stays COD).
3. **OTP**: when the rider asks to deliver, the OTP appears here. Read it to the rider screen.
4. **Attempt check**: after a rider logs a failed attempt you are asked if the agent came. Answer **No, the agent never came** to raise a dispute.
5. **Second chance**: after a refusal you may get an offer; accept or ignore it (24 h timer).
- A limit of 4 proactive messages per order: the 5th is refused and logged.

## 3. Rider app (`/rider`): a clone of Valmo Pilot
- Choose a rider (**Demo Bonus rider** shows the green **₹ +15 Bonus Eligible** chip; **Demo Control rider** does not). Hindi toggle in the header. The rider never sees a score.
- **Deliver** → the OTP sheet: type the code from the customer screen. Success: Bonus rider's ₹15 shows as pending (COD waits for cash). Wrong code: 5 tries, 10-minute expiry.
- **Attempted** → "Why could you not deliver?" (Customer unavailable / asked to reschedule / Address not found) and the **Proof you tried**: **I'm at the door** (good GPS), **Call customer** (count), **Waited 5 more min**, or **Demo: log it from far away** (fake attempt, low confidence). The customer is asked on WhatsApp to confirm.
- **Refused** → "Why is the customer refusing?" (7 reasons; try **Didn't order it** for Hold & Re-home, **Not home** for second chance, **Damaged or wrong item** for the Seller claim chip), then the refusal code/OTP.
- **Earnings card**: pending, released, clawed back, blocked. A rider with the reserved demo stops gets the full story; others are worked by Autopilot.

## 4. Refused-Parcel Desk (`/desk`): the hub operator
*Rebuilt in Session 14 (Desk v3). Everything here is a demo on synthetic data; every number that is a model or an assumption says so on screen.*

**The flow for one refused parcel**
1. A rider refuses a parcel and records why (7 reasons). It lands in the **Queue** as a card.
2. **Inspect parcel** (the box at the bottom of the card, hub operator). Tick what you actually see: **Unopened**, **Seal intact**, **Invoice outside the parcel**, add a **Photo note** (a note only, nothing is uploaded) and press **Record inspection**. It is stored with the time and who did it. **Required before Hold only**; a second chance or a consolidated return does not need it. Until it is done the card says "Inspect the parcel to unlock Hold & Re-home". Simulated riders' parcels are inspected for you (**Bot (synthetic)**); the four live-demo parcels wait for you. **Change inspection** while the parcel is still queued.
3. The **Router** recommends a lane, in order: **second chance**, **Hold & Re-home**, **consolidated return**, and shows the **expected value** of each (chance × saving − cost).
4. A **damaged or wrong item** fails the **Item condition OK** gate: it is never re-homed, goes back, and carries a red **Seller claim / QC needed** chip.

**Reading a card**
- **Match forecast (model)**: the chance that a buyer for **the same listing** turns up within 48 h, as a range (low end, average, high end) on a bar with a dashed **5.5% break-even** line, a **confidence** chip (High = 5+ orders of this exact listing in 14 days; Medium = 1 to 4 of its own or 10+ of similar ones; Low otherwise), one evidence sentence ("3 exact-SKU orders and 41 similar (kurti, cotton, blue) in 14 days") and the shared **keyword chips**. **Hold is allowed only when the low end clears 5.5%.** The ₹ shown uses the average. A similar listing is evidence of demand, never a substitute for the parcel (the seller issues the new invoice). History is synthetic: it shows the mechanism; real calibration comes from the pilot.
- **Gate checklist**: each legal and practical gate with a green tick or red cross. The three switches (Unopened, Seal intact, Invoice outside) are **Try a what-if: a preview only**. Flip one and a yellow line says what would happen ("Seal broken: Hold lane closed, now Consolidated return, EV +₹136 → +₹36"). Nothing is saved; **Clear what-if** removes it. The switches are off until the parcel is inspected. Seller opt-in, same state, item condition, shelf capacity, rider bag space and the forecast are facts and cannot be flipped; **a seller who has not opted in can never be overridden**.

**Lanes and actions**
- **Second chance**: **Send second-chance WhatsApp** (24 h to answer). The customer phone (`/customer`) offers **Deliver again**, **Different time** (then **Tomorrow** or **Day after tomorrow**), **Pay now by UPI** (COD orders only), **Pick up at hub** (only while a shelf slot is free) and **Cancel order**. All answers after the first message are replies, so the **4 proactive messages per order** cap holds.
  - *Deliver again / Different time / Pay now* send the order out again as attempt 2; the ₹99 saving books only if it is delivered. A failed UPI payment still goes out as cash on delivery.
  - ***Pick up at hub***: the parcel waits on the shelf for **48 h**. The customer's WhatsApp reply holds the **pickup code**. At the counter the operator types it in **Pickup code from the customer** and presses **Customer collected** (5 tries; for a COD parcel tick **Cash collected at the hub**, a flag only). The sale is kept: ₹8 shelf cost booked on reserve, **₹120 saving booked only when collected**. A no-show goes back in a batched return (the ₹8 stays). A pickup uses a slot of the **same 30-slot shelf as Hold**.
  - **Skip second chance**: pick one of four reasons (customer already refused firmly at the door, not reachable, seller wants it back, other) and press it. It is logged and counted, sends no message and moves the parcel to the next lane. Gates are never overridden.
- **Hold 48 h**, then **Simulate a buyer now (demo)** to match and deliver it (the ₹145 saving books only when the new buyer's order is delivered). **Add to consolidated return** batches it by seller.
- A pickup is **never a delivery**: the order ends as **Collected at hub**, stays the rider's failed attempt in the pilot, and pays **no bonus**.

**The top of the page**
- **Three money tiles:** **Booked so far (net)** (real outcomes only, less what the Router really spent, gross shown small), **Still in play (expected)** (open parcels at their current lane's expected value; an assumption), **Cost of sending everything back** (refused parcels × ₹120).
- **Side column:** **Pilot KPIs (simulated)**: sales saved, second-chance accept rate, re-home match rate against the 5.5% break-even and against what the forecast said, pickup rate and no-shows, average dwell, ₹ booked per refused parcel, skips and their reasons, and the **kill rule** (match rate below 3% after 30 days). Every line shows its **n** and **too early (needs 30)** until a lane has 30 parcels; an empty lane shows a dash, never 0. Custody incidents and complaints are **not simulated**, and the panel says so. **Done today**, **Consolidated return batches**, **Router assumptions** and the folded **Backtest of the match forecast** follow.
- **Router assumptions:** three headline numbers: **Soft-refusal accept rate** (sets no cash, wants it later and not home together; it reads "mixed" if the three differ), **Share of nearby demand that converts to a re-home**, **Shelf capacity**. **More: the seven accept rates** folds the individual rows.
- **Backtest (open the fold):** replays 160 synthetic histories and shows the forecast against what happened in bins, the Brier score, and three hold rules side by side (low end, average, hold everything). History is synthetic: it shows the mechanism only.

## 5. Audit (`/audit`)
Fourteen checks, each green or red, on the day's own record (one final state per order, nothing delivered without a verified OTP, ledger equals every screen, **no parcel held without an inspection, no gate overridden, no pickup handed over without a verified code, the shelf never above capacity**, and so on). Run Autopilot + Close pilot first, then open it: it should be all green.

## 6. Pilot (`/pilot`): the decision question
1. **Your assumptions**: **Who gets the bonus** (Top 10% / Top 20%), **How much the bonus helps** (+12 per 100 by default), **Bonus per delivery** (₹15). **Try:** Deck assumption, It works well, It does nothing, It hurts normal orders, Fake attempts rise.
2. **More settings**: riders per hub, days, flagged orders a day, the delivered-anyway baseline, the two safety sliders (normal orders, fake attempts), **Loosen the rule after seeing the result** (makes the verdict INVALID), **Re-roll the luck**, **Reset everything**.
3. **What the pilot would say**: verdict, plain sentence, **Next:** line, the ✔ **Fair comparison** line ("See the check"), the range picture, and the "300 times" odds bar. **How we decide** is the rulebook and locked rule.
4. **Does it pay?**: what the bonus caused, net per 100, yearly ₹ cr, RTO points.
5. **More detail**: **Check today's Ops day** (judges the day you played on Ops with the same rule, with **Finish the day**), Hub by hub, Profit chart, Yearly rupees table, Cost per successful delivery.
6. **How the maths works** (top right): every step with the numbers on screen, **Copy as text**.

## 7. The 25-minute checklist: touch every function once
1. `/` → Setup → (Demo) open Ops, Rider, Customer in the same browser. Optional: **Start with a fresh day**.
2. **Ops: Start day.** Note the purple flagged orders and the clock.
3. **Customer:** pick a flagged order → **I'm home**. Pick another → **Change time**. Try **Fix address** and **Pay now**.
4. **Rider:** choose **Demo Bonus rider** → **Deliver** → read OTP on Customer → type it. See ₹15 pending on Rider and Ops.
5. **Rider:** choose **Demo Control rider** → deliver one: no bonus chip, no ₹15.
6. **Fake attempt:** Rider **Attempted** → **Demo: log it from far away**. Customer: **No, the agent never came**. Ops: **Exception queue** → **Free re-attempt** (then try **Strike** on a second one).
7. **Refusal:** Rider **Refused** → **Didn't order it**. Desk: read the **Match forecast**, **Record inspection**, then **Hold** → **Simulate a buyer now**. Flip a what-if switch (nothing changes). Also refuse a **Not home** one: **Send second-chance WhatsApp**, then on Customer try **Pick up at hub**, copy the code into the Desk and press **Customer collected** (Booked so far shows +₹111). Open the **Backtest** fold and the **Pilot KPIs**.
8. **Ops:** **Reconcile cash**, **+1 h**, **+1 day** (watch timers, rescheduled orders, the ledger).
9. **Return:** open a delivered order on Ops → **Customer returned this order (demo)** → the ₹15 is clawed back.
10. **Ops: Autopilot** a while, then **Close pilot** → read **Bonus vs Control** and the money ledger.
11. **`/audit`** → all green.
12. **`/pilot`** → Try each scenario; switch **Top 10%**; set **How much the bonus helps** to about +8 to see RE-PRICE and the Pilot 2 "Next:"; tick **Loosen the rule** (INVALID); open **Check today's Ops day**; open **How the maths works**.
13. **Reset day** on Ops (or **Start with a fresh day** on `/`) to start over. On the shared day every phone drops the old day within a few seconds.

## 8. If something looks wrong
- **Badge says ALONE** on a phone: it is on its own Demo day. Use **Several devices (shared day)** on the laptop first, then scan the QR codes.
- **A screen stuck on "Loading"** in the shared day: an old-format day is saved in Supabase; press **Reset** once on Ops with the admin token.
- **Verdict stays INCOMPLETE:** normal for one day. Use **Close pilot** (Ops) or **Finish the day** (Pilot page).
- **Numbers do not move:** Autopilot is off or the day has no open orders left.
- **Two windows disagree in Demo mode:** they are in different browsers/profiles or one is a private tab; open them all in the same normal window.
