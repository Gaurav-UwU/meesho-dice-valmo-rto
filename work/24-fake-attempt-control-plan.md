# 24: Fake-Attempt Control with the Hub Captain, built independently of the bonus (2 Oct 2026, no code written yet)

**Replaces the old plan 24 ("two parallel pilots + hub captain").** The parallel-pilot idea (the button, Pilot B, the Compare view, the two Ops consoles) is **removed completely**. Nothing in this plan depends on it.

## 1. Why this, and why separately
- **It is independent of the bonus.** It must work with the bonus off, in both the Bonus and the Control arm, and its consequences must not rely on the bonus. If the 30-day bonus pilot fails, this still stands.
- **It solves the same problem the bonus solves, from the other side.** The bonus pays a rider to push through a hard stop. A fake attempt ("customer unavailable", logged from far away) is how a rider avoids that stop. The control makes giving up **visible and costly**, and **recovers the delivery** through another rider, so the parcel is not returned.
- **It is the fallback story for the deck:** *"If the bonus fails in the 30-day pilot, we already have a concrete plan, built and tested in our prototype, that does not depend on it: (1) fake-attempt control run by the hub captain, and (2) the Refused-Parcel Router with local re-home."* (Say "built and tested in our prototype", never "proven". The real pilot measures both.)

## 2. What exists today (read from the code on 2 Oct)
- **The bonus rule (confirmed by Gaurav on 2 Oct):** ₹15 is paid when a flagged order is delivered on **any attempt** (first, second or later). A rider whose own earlier attempt on that order looked fake does not get it; the rider who then delivers it does. So on a given order a fake attempt never earns the bonus; the gaming risks are effort shifting to normal orders, false deliveries, and riders avoiding stops worth more than ₹15 of effort.
- A failed attempt becomes an **exception** when the rider's phone is more than 500 m from the address, or the customer answers the WhatsApp check "the rider never came". It works in **both arms**.
- **Ops** presses Confirm valid / Free re-attempt / Strike. 24 sim-hours with no decision = a free re-attempt, no strike. A human review is booked at **₹10**.
- **A strike's only consequence is that two strikes block the rider's bonus**: it depends on the bonus, so with the bonus off a strike means nothing.
- The rider app shows **nothing** about a flagged attempt or a strike. Strikes are a bare count per rider. A "rider needs review" rule exists in the engine but is not used.
- The simulation assumes **4%** of attempts are fake (an assumption). **No real fake-attempt rate is known**; the old "15% of failed deliveries are fake" claim is on the do-not-use list. The 8-week baseline measures it.

## 3. The design

### 3.1 Independence (hard requirements, each with a test)
1. A day with the **bonus off (`bonus: 0`)** still opens exceptions, passes them to the hub captain, records strikes, shows the rider monitor and the KPIs. It creates **no ledger rows**.
2. The strike **ladder below does not mention the bonus**; the bonus block is an extra consequence only when a bonus exists.
3. It runs for **every rider in both arms** from the baseline period (see Q4).
4. It has its **own KPIs, Audit checks and screens**; none read the verdict.
5. The existing pilot safety rule (suspected fake attempts of Bonus riders above 5%) stays as it is.

### 3.2 Who decides: the hub captain
- A new **`/captain?hub=`** screen. Each hub has a synthetic captain name (for example "Captain Ramesh, Lucknow").
- **A strike needs corroboration (agreed 2 Oct):** a customer's "the rider never came" alone is not enough. It needs supporting evidence (phone more than 500 m away, no calls, no wait, or a repeated pattern) **or** a written captain note. When the attempt has strong at-the-door evidence (high confidence), the screen suggests **Confirm valid** by default.
- Choices: **Confirm valid**, **Free re-attempt**, **Strike**. A strike needs a **reason chip**: "Phone far from the address", "Customer says nobody came", "Repeated pattern", "Other", plus an optional note.
- **Ops becomes read-only** on this queue (who, time left, outcome, "captain did not decide"). **No login in the demo** (labelled "demo, no login"); Live mode uses the live key; a real rollout needs a captain login.
- **24 h with no decision** = a free re-attempt, no strike, marked **"captain did not decide"** and counted on the captain's scorecard and shown to Ops.

### 3.3 The strike ladder (proposed; independent of the bonus)
| Active strikes | What happens | Visible to the rider as |
|---|---|---|
| **1** | **Warning and coaching note.** | "Strike 1 of 3: warning. Reason: ..." |
| **2** | **Enhanced proof for 14 days:** every failed attempt by this rider goes to the captain for review, not only the weak-evidence ones. Any bonus is also blocked (existing rule). | "Strike 2 of 3: every failed attempt is now reviewed for 14 days." |
| **3** | **Escalated to the hub manager** for a human decision outside the app (coaching, assignment, incentive review). Status shows "Escalated". | "Strike 3 of 3: your hub manager will review." |
- Strikes **expire after 30 days** (rolling). A strike can be **overturned by Ops within 48 h** (the rider sees "overturned"); a rider can tap **"Ask for a review"**, which flags the strike for Ops. Every strike keeps its reason, evidence and who decided.
- A strike on a **Control** rider counts exactly the same (the ladder has nothing to do with the bonus).

### 3.3b Closing the "parking" gap (agreed by Gaurav, 2 Oct)
- **The gap:** under the any-attempt rule, a rider can log a weak "customer unavailable" from near the door today, get the same order back tomorrow (retries go to the same rider) and still collect ₹15. A fake attempt pays only through this path.
- **The fix (the any-attempt rule is unchanged):** when a flagged order is **delivered by the same rider whose earlier attempt on it was weak** (not high confidence), the ₹15 accrues but **waits for the hub captain's review** inside the existing 7-day pending window.
  - **Auto-release** if the customer confirmed on WhatsApp that the rider came. Only unconfirmed weak attempts go to the captain.
  - The captain sees the earlier attempt's GPS distance, calls, minutes waited and the customer's answer, and **releases or withholds** (withholding needs a reason chip, like a strike).
  - **If the captain has not decided by the end of the 7-day window, the ₹15 is released** (a captain's silence never costs an honest rider).
  - The rider sees why: "₹15 waiting for review: your earlier attempt had no calls logged".
  - **Deferrals per rider** (weak attempt, then the same rider delivers) are counted in the rider monitor.
- **Tune before day 1:** measure in the 8-week baseline how many deliveries would be held; if too many, tighten what counts as "weak".
- **Tests:** a weak attempt then a same-rider delivery holds the ₹15; a high-confidence attempt pays normally; a customer "rider came" auto-releases; a captain release or withhold works and withhold needs a reason; no decision by day 7 releases; another rider delivering is paid normally; a bonus-off day creates nothing.

### 3.4 Monitoring: the captain's rider monitor
- A table of every rider at the hub: **attempts, disputed, confirmed (strikes), disputed rate, the hub median, status** (Clear / **Watch** / Warning / Escalated), last decision. Click a rider for a **timeline** of every disputed attempt and decision.
- **Watch rule (explainable, rule-based):** at least **3 disputed attempts in 7 days and a disputed rate at least 2× the hub median** (median over riders with at least 5 attempts). The card says why in one line.
- A small **captain scorecard**: decided in time %, strikes issued, overturned, auto-expired.

### 3.5 Transparency: who sees what
| Who | What they see |
|---|---|
| **Hub captain** | The queue with the evidence (GPS distance, calls, minutes waited, the customer's WhatsApp answer), the rider's record, time left, the rider monitor, the scorecard. A red "to review" badge. |
| **Rider** (`/rider`) | A banner on the flagged order ("under review by the hub captain"), a **strike meter with the ladder text**, the reason and any overturn. Hindi strings included. |
| **Ops / central** | A read-only hub view: disputes, time to decide, "captain did not decide", strikes and overturns by hub. |
| **Ledger** | If a bonus exists and is blocked: "blocked: 2 active strikes, decided by Captain X". |
| **Audit** | New checks: every strike has a captain decision with a reason; no strike was issued by anyone else; no decision after the rider's strike expired is counted; a bonus-off day creates no ledger rows. |
| **Customer** | No change (they already answer the WhatsApp check). No new proactive message (cap stays 4). |

### 3.6 The outcome numbers that show it solves the same problem (own KPI panel; "too early" under 30 attempts)
- Attempts, **disputed** (opened), **confirmed fake** (strikes), **cleared** (confirmed valid), **auto-expired**, **overturned**, median time to decide.
- **Recovered deliveries:** free re-attempt orders that ended **delivered**.
- **₹ saved** = recovered deliveries × **₹99** (the ₹120 return avoided less the ₹21 re-attempt) − human reviews × **₹10**.
- **Break-even:** a review pays if more than about **1 in 10** reviewed disputes ends in a delivery (10 ÷ 99 ≈ 10%).
- Labels: "the 4% fake share in the simulation is an assumption; the 8-week baseline measures the real one".

## 4. Where it fits in the 30-day pilot (and the bonus interaction)
Run it in **all pilot hubs, both arms, from the 8-week baseline** (Q4), so the comparison stays fair and the bonus effect is measured **on top of** it. State that on slide 5: a bonus effect measured with the control in place may be smaller than without it, because some of the behaviour the bonus would fix is already caught.

## 5. Deck changes (add to `23-deck-plan-v5.md`)
- **Slide 1:** one line: "Even if the bonus fails, two bonus-independent plans stand: fake-attempt control and the Router."
- **Slide 4:** replace the "fake-attempt check" bullet with the hub-captain flow, the ladder and the monitor (screenshots: captain screen, rider monitor, the rider's strike meter). Keep the 2-strike bonus block as an extra.
- **Slide 5 ("If it doesn't pay"):** "Pilot 2 with one lever changed, and the fallback keeps running either way."
- **Slide 6:** the Router is fallback part 2 (local re-home gated on the forecast's low end).
- **Slide 7:** a row "Fake-attempt control: starts day 0 in every pilot hub, both arms. Metrics: disputed rate, confirmed rate, recovered deliveries, ₹ saved against review cost, overturn rate. Kill or re-tune: if more than 1 in 3 strikes are overturned, or reviews cost more than they recover."
- **Slide 8 risks:** captain conflict of interest (guard: Ops overturn, a sample audit of decisions, a scorecard); unfair strikes (reasons, 30-day expiry, appeal); gig-worker labour and data rules (a real rollout needs a captain login and a documented process); rider backlash; "uplift below break-even" guard now includes the fallback.

## 6. Build plan (tests first; one saved-day schema change)
**Today is Fri 2 Oct: freeze 3 pm, submit Sat 3 Oct.** Take the screenshots, QR (from the **Demo** page, never a shared-day QR) and the 90-second video on the **current build first**. Build on a branch, preview-deploy (`vercel deploy` without `--prod`), promote only if green. No production deploys on Saturday except a hotfix. Tag the current commit as the rollback point.
1. **Domain:** `strikes` becomes a **strike log** (rider, order, sim time, reason, captain, overturned) with a derived active count (30 days, not overturned); the ladder; `owner: hub_captain` on exceptions; `reason` and `note` on `resolveException` (a strike without a reason is rejected); new action `overturnStrike`; `captainMissed`; the Watch rule; the KPI selectors; the ledger block reads the derived count. **Bonus-off scenario tests.** New events with required fields.
2. **Captain screen and rider monitor** (`pages/Captain.tsx`, `pages/captain/*`): queue, evidence cards, monitor, timeline, scorecard.
3. **Visibility:** the rider banner and strike meter (Hindi included), the Ops read-only hub view, the ledger line, the new Audit checks, links from the Ops header, Desk menu and the landing "windows".
4. **KPI panel, economics, docs:** the outcome panel, the walkthrough step "Catch a fake attempt" (now on the captain screen), `20-prototype-user-guide.md`, README, the deck addendum, `api/_lib/validate.ts` (reason enum, overturn action), Live parsing.
**Cut order if time runs short:** the rider timeline and the Watch rule, then the KPI panel. Never cut steps 1 to 3.
**Tests (examples):** a bonus-off day works end to end; the ladder at 1, 2 and 3 strikes; strikes expire at 30 days; an overturn removes a strike; a strike needs a reason; the captain queue shows only that hub; 24 h expiry sets "captain did not decide" with no strike; a Control rider's strike counts; the rider notices follow the events; Ops buttons are gone; Audit checks go red on a forged strike; Live validation; Hindi strings for every new rider text; the existing fake-attempt scenarios are UPDATED, not deleted.
Gate: `npx vitest run && npx tsc -b && npx oxlint && npm run build`, then `node scripts/build-api.mjs && npx vercel deploy --prod --yes`. Do not cut anything on the never-cut list. A shared Supabase day needs **one Reset** after the schema change.

## 7. Decisions to confirm (recommended answers; "agreed" is enough)
1. **Strike ladder** as in 3.3 (warning, 14-day enhanced review, escalation).
2. **Strikes expire after 30 days.**
3. **Appeal:** Ops can overturn within 48 h and the rider can "Ask for a review".
4. **Run in both arms from the baseline period.**
5. **The "Watch" rule:** 3 disputes in 7 days and 2× the hub median.
6. **24 h silence = free re-attempt, marked "captain did not decide"** (not an escalation to Ops).
7. **Deck wording:** "built and tested in our prototype, to be measured in the 30-day pilot" (never "proven").
(Carried over from before and still assumed: the captain decides and Ops is read-only; a strike needs a reason chip; no captain login in the demo.)

## 8. Risks
- The **freeze today** is the biggest risk. Never ship half a step.
- Moving the decision from Ops to the captain changes the walkthrough, the user guide and one deck screenshot.
- The ladder's consequences are a **proposal**; Valmo's real rules and labour practice decide what is allowed. Say so.
- The fake rate is unknown; the savings are only as good as the assumption (4% in simulation).
