# 24: Two parallel pilots + the Hub Captain for false attempts: the complete plan (2 Oct 2026, no code written yet)

Two changes, one plan, **one saved-day format change**. Part A (hub captain) is smaller and changes the demo path; Part B (two pilots) is bigger and mostly additive. Gaurav agreed every recommended answer in the two-pilots round; the hub-captain defaults in Part A were stated by me and need one "agreed" (see §5).

**Time reality:** today is **Fri 2 Oct, freeze 3 pm** (screenshots, QR, 90 s video), submit **Sat 3 Oct**. Do not let this plan delay the freeze. Order of work in §4.

---

## Part A: false attempts go to the Hub Captain

### What happens today (read from the code on 2 Oct)
- A failed attempt with weak proof (phone more than 500 m from the address, or the customer answers the WhatsApp check "the rider never came") opens an **exception** in the **Ops console's** "Exception queue".
- **Ops** presses **Confirm valid**, **Free re-attempt** or **Strike**. A strike counts on the rider; **2 strikes block the rider's bonus**.
- If nobody decides in 24 sim-hours it becomes a **free re-attempt** with no strike.
- The **rider app shows nothing** about a flagged attempt or a strike. The Ops roster shows each rider's fake rate and strikes.

### What we want
Suspected false attempts are **passed on to the Hub Captain of that rider's hub**, who reviews the evidence and **can strike the rider if caught**. All of it must be **visible**: to the captain, the rider and Ops.

### Defaults (stated by me; confirm in §5)
1. **The hub captain decides; Ops watches.** The captain has the same three choices: **Confirm valid**, **Free re-attempt**, **Strike**. Ops sees the queue read-only (who, how long left, outcome) and no longer presses the buttons.
2. **A strike needs a reason** (one tap): "Phone far from the address", "Customer says nobody came", "Repeated pattern", "Other", plus an optional note. A strike without a reason is rejected.
3. **24 h with no decision** still becomes a free re-attempt with no strike, but it is **marked "captain did not decide"** and counted on the captain's scorecard and shown to Ops.
4. **No login in the demo.** The captain view is "Hub captain view (demo, no login)". In Live mode it uses the live key. A real rollout needs a hub-captain login (listed as a risk).
5. **A strike on a Control rider counts too** (hub discipline) but has no bonus effect, since Control riders have no bonus to block.
6. Each hub has a **synthetic captain name** (for example "Captain Ramesh, Lucknow") so the demo reads like a real hub.

### Where it is visible (the "make this visible" checklist)
| Who | What they see |
|---|---|
| **Hub captain** (new `/captain?hub=`) | A red "3 to review" badge. Each case card: order, rider, **evidence** (GPS distance, calls, minutes waited, the customer's WhatsApp answer), the **rider's record** (attempts, suspected fake rate, strikes), time left, and the three buttons. "Decided today" list. A small **scorecard**: decided in time %, strikes issued, auto-expired. |
| **Rider** (`/rider`) | A banner on the flagged order: **"Your attempt is being reviewed by the hub captain."** A **strike meter** in the earnings card: "Strikes 1 of 2: at 2 you lose the bonus". On a strike: a notice with the reason. Hindi strings included. |
| **Ops** (`/ops`) | The Exception queue becomes **"With hub captains"**, read-only: captain name, time left, status, outcome, **"captain did not decide"** flags, counts per hub. The roster keeps the fake-rate and strikes columns. |
| **Ledger** | When 2 strikes block the bonus, the line says "blocked: 2 confirmed fake attempts, decided by Captain X". |
| **Audit** | Two new checks: "every strike has a hub-captain decision with a reason" and "no strike was issued by anyone else". |
| **Everywhere** | Links to the captain screen from the Ops header, the Desk menu and the landing page's "Open three windows" (a fourth window). |

### Data and code changes
- `engine/hubs.ts`: a `captain` name per hub.
- `ExceptionItem`: `owner: 'hub_captain'`, `captainName`, `reason`, `note`, `captainMissed`.
- `resolveException` action: optional `reason` and `note`; the reducer **rejects a strike without a reason**.
- **Events:** `EXCEPTION_OPENED` carries `owner`; `EXCEPTION_RESOLVED` carries `decidedBy` and `reason`; `STRIKE` carries `reason` (required fields updated in `events.ts`).
- `tick.ts`: the 24 h default marks `captainMissed`.
- `selectors.ts`: `captainQueue`, `captainScorecard`, `riderNotices` (derived from events: flagged, cleared, strike n of 2, bonus blocked).
- New files: `pages/Captain.tsx`, `pages/captain/*`, `pages/rider/StrikeMeter.tsx`, `pages/rider/ReviewBanner.tsx`; edits to `ExceptionQueue.tsx`, the rider `i18n.ts`, the Ops header, the landing `Setup.tsx` and walkthrough, `audit.ts`, `api/_lib/validate.ts` (the reason enum).
- **Landing walkthrough step "Catch a fake attempt"** and `work/20-prototype-user-guide.md`: the decision is now made on the captain screen.
- **Deck slide 4** controls table: "Suspicious attempts go to the hub captain, who can confirm, order a free re-attempt, or strike (2 strikes block the bonus). Ops sees every case." Slide 8 risk: "fake attempts" guard updated.

### Tests first
Captain queue lists only that hub's cases; a strike needs a reason; 24 h auto-expiry sets `captainMissed` and gives no strike; the rider's notices follow the events; two strikes block the bonus (existing test updated); Ops buttons are gone and the queue is read-only; the new Audit checks go red on a forged strike; Live validation accepts the new fields and rejects a strike without a reason; Hindi strings exist for every new rider text; scenario 5/12-style tests (existing fake-attempt scenarios) updated, none deleted.

---

## Part B: two parallel pilots (A and B) with different bonuses

### In plain words
Two **separate** pilots run at the same time, each with its own Ops console, its own riders (paired on past delivery rate, coin flip in each pair), its own Control group and its own locked rule. A **Compare** view then says which bonus fits the business objective.

### The design point that matters most
**Compare each pilot only with its own Control.** Never compare Pilot A's riders directly with Pilot B's: that would mix bonus size with who the riders are. Compare in rupees: **net ₹ per 100 flagged orders, ₹ crore a year, RTO points saved, cost per successful delivery**.

### Settled decisions
| # | Decision |
|---|---|
| Q1 | **Objective:** net ₹ a year decides the winner (subject to GO); the panel also **flags "reaches the −3 RTO points target? yes/no"** (top 20% needs about +15 per 100; top 10% would need about +30, which is unrealistic). |
| Q2 | **Pilot B = ₹10 at the same top 20%** (a clean read on bonus size). The targeting share is **editable per pilot**; if someone changes both bonus and targeting, the page says "two things changed, can't separate them". |
| Q3 | **Assumed true effect in the simulation: A +12 at ₹15, B +8 at ₹10**, both editable and labelled "a guess to show the method, not evidence". At these guesses A nets about ₹55 cr a year and B about ₹43 cr; if B really gave +10 it would net about ₹76 cr and win. |
| Q4 | **Split by hub cluster:** **Pilot A = Powai + Lucknow (₹15)**, **Pilot B = Whitefield + Gaya (₹10)**: one metro and one small town each. Riders in one hub never see different bonuses. |
| Q5 | **Scope:** steps 1 and 2 first; step 3 (the two Ops consoles) only if time; deploy only green steps. |

### Break-evens (use these numbers)
₹15: +8.6 per 100 at a 60% baseline (+7.3 at 51%). **₹10: +5.5** at 60% (+4.6 at 51%).

### The locked winner rule
1. A pilot is **eligible** only if its **own verdict is GO** (the low end of its range clears its own break-even and both safety rules hold).
2. If both are eligible, the winner is the one with the **higher net ₹ a year**, called a **proven** winner only if the range of the difference excludes zero. Otherwise: "no clear winner: take the cheaper (₹10) as the lower-risk choice, or run Pilot 2".
3. If only one is eligible, it wins. If neither, Pilot 2 with one lever changed.
**Be honest on the page:** with about 24 pairs each, the smallest difference between the two effects the data can reliably see is **about 5 per 100** (variance of a difference is the sum of the two). A real 2 to 3 point gap will usually read "can't tell". The Compare view must say so.

### What gets built
1. **Engine (`engine/cells.ts`):** a `PilotCell` {id, label, bonus, flaggedShare, baseline, assumedUplift, hubs}; `simulateCells` runs both through the existing paired-rider simulation; `compareCells` gives each cell's net ₹ per 100 with a range, ₹ cr a year, RTO points, cost per successful delivery, break-even margin, the **range of the difference** (SE = √(SE_A² + SE_B²)), the "reaches −3 points" flag, and the winner by the rule above. Net is linear in the effect, so its range follows from the effect's range.
2. **`/pilot` side by side:** two assumption cards (editable), two verdicts each with the ✔ Fair comparison line, a **"Which bonus fits?"** panel with a chart of net ₹ per 100 with ranges, the winner line, and the "can't tell" warning. Plus **a safety comparison**: does the bigger bonus encourage gaming? Show suspected fake rate and strike rate per pilot.
3. **Two Ops consoles:** `DayConfig` gains `flaggedShare` (this also fixes `17-prototype-audit.md` item 9); each hub's day reads its cell's bonus and share; the Ops header says "Pilot A · ₹15 · top 20%" or "Pilot B · ₹10 · top 20%"; the landing Setup offers an A hub and a B hub. Everything **defaults to today's single-pilot behaviour**, so the 90-second video path is unchanged.
4. **Docs and deck:** a note for slides 5, 7 and 8 (the real pilot runs both clusters at once: 24 pairs per pilot needs 8 hubs at 12 riders a hub, or 4 hubs with 24 riders each; assign by hub to avoid spillover).

### Tests first
Cell config produces the right break-evens; the two cells use separate riders and controls; each cell's verdict equals the single-pilot verdict on the same input (no regression); the difference's range is wider than either alone; the winner rule for every branch (both GO, one GO, none, a tie, a flat "can't tell"); the −3 flag; the two-lever label; the Ops day for an A hub uses ₹15 and a B hub uses ₹10 with different rule hashes; `flaggedShare` in the rule hash (changing it after planning makes the verdict INVALID); the single-hub default is unchanged; page tests for the side-by-side and the winner line.

---

## 3. One schema change for everything
Bump `DAY_SCHEMA` and the local storage key **once** for Part A (exception fields) and Part B (`flaggedShare`, the cell). Keep `api/_lib/validate.ts` and the Live parsing in sync. A shared Supabase day needs **one Reset** afterwards (Gaurav, admin token). The sync session's `dayId` logic must still pass.

## 4. Order of work (and what to cut)
0. **Before any build (today):** take the deck screenshots, QR and the 90 s video on the **currently deployed build** (shot-list in `work/23-deck-plan-v5.md` §6). Those screens do not depend on this plan, except the fake-attempt step (below).
1. **Part A, hub captain** (engine, then the captain screen, then rider and Ops visibility, then Audit and docs). It changes one step of the demo path, so deploy it only when green and **re-take only that screenshot or clip**.
2. **Part B step 1 and 2:** the engine and the side-by-side on `/pilot`.
3. **Part B step 3:** the two Ops consoles. **Cut this first** if time runs out.
4. Deck and docs updates at the end of each step.
Always: tests first, update (never delete) tests, the gate `npx vitest run && npx tsc -b && npx oxlint && npm run build`, then `node scripts/build-api.mjs && npx vercel deploy --prod --yes`, check in the browser at desktop and 375 px, commit and push. Do not cut anything on the never-cut list.

## 5. Please confirm (one word each, "agreed" is fine)
1. **Hub captain decides, Ops read-only.** (Alternative: Ops can still override.)
2. **A strike needs a reason chip.**
3. **24 h with no decision = free re-attempt, marked "captain did not decide".**
4. **No captain login in the demo.**
5. **A strike on a Control rider counts but has no bonus effect.**

## 6. Risks
- **Freeze today at 3 pm:** biggest risk. Never ship half a step.
- Moving the decision from Ops to the captain changes the walkthrough, the user guide and one deck screenshot.
- A real rollout needs a hub-captain login and rules about appeals. Out of scope for the prototype (say so).
- The two-pilot comparison reads the simulator's guessed effects; the page must say it shows the method, not evidence.
- Simulation is cleaner than reality (no month-to-month rider luck): say so.
