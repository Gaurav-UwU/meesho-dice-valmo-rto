# 26: Review of the whole plan (Fri 2 Oct 2026): what is solid, what is flawed, what to do today

Checked against the code, the docs and the live site on 2 Oct. Items marked **verified** were recomputed or read in the source; items marked **not checked** could not be seen from here.

## Verdict
**The idea, the numbers and the prototype hang together and are in good shape. The real risks are not in the maths: they are the schedule, one stale file the deck teammate may build from, a possible key leak through a QR code, and a few design gaps a sharp judge could press.** Fix the five "do now" items and the plan is sound.

## What is solid (verified)
- **Numbers agree across docs, deck plan and prototype.** Recomputed: every cell of the yearly-rupees table (₹15 at +10 = ₹23 cr; at +5 = −₹57 cr; ₹20 at +20 = ₹122 cr), top-10% net ₹62 cr at +15 and −1.5 RTO points, cost per delivery ₹84.8 → ₹77.7, break-evens 8.6 / 7.3 / 5.5 (and 10.3 with the ₹18 fee), 1 RTO point ≈ ₹92 cr, "130 mn RTO parcels".
- **Prototype health:** 1,104 tests pass, type check and build clean, live `/api/health` returns ok, the forecast-wording fix is in the live bundle, the Audit really has 14 checks, hub tiers match the deck ("2 metro, 2 smaller").
- **Method is honest:** one verdict rule everywhere, the rule locked in advance, "low end clears break-even", Control group, labelled assumptions, "in simulation" wording, a Pilot 2 loop instead of re-reading data.

## DO NOW (high priority)
1. **The schedule is the biggest risk.** Freeze is today 3 pm, submit tomorrow. The notes still list the **screenshots, QR and 90-second video as not done**, and two sizeable features (hub captain, parallel-pilot button) are planned on a working public site. *Fix:* take the screenshots, QR and video **first** on the current build; tag a known-good commit (`git tag freeze-candidate-2026-10-02`) and write down the current production deployment as the rollback; build new work on a branch and use a **preview deploy** (`vercel deploy` without `--prod`), promoting only after checks; **no production deploys on Saturday except a hotfix**. If time is short, ship neither feature and show them in the deck as designed.
2. **`14-deck-handoff.md` still contains the old numbers and has no pointer to the new plan.** It still says "smallest effect ~7.5", "GO about 2 times in 3", and its own "do not use" list tells the teammate to use 7.5. If she builds from 14 she will put wrong numbers on slide 5. *Fix:* add a banner at the top of 14 ("numbers and slides 4 to 8 are superseded by `23-deck-plan-v5.md`") or edit those lines directly. Five minutes.
3. **A shared-day QR code carries the live key.** The join key is in the link after `#k=`. If the QR on the deck or in the video comes from the shared-day screen, it publishes the key. *Fix:* make the deck and video QR from the **Demo-mode** landing page (a plain link), and never screenshot the shared-day QR codes. Rotate the live key if one ever leaks.
4. **The mentor call happened and its answers are not logged.** *Fix:* write them into `R2-HANDOVER.md` now (rider pay, TrustMesh after dispatch, SKU history, which screen matters) and turn any change into deck edits.
5. **The public site has never had an independent code or security review, and has never run on real phones.** Six sessions have skipped it. *Fix:* run the code-review and security-review agents on the diff before the final deploy; test the video path on one iPhone and one Android.

## DESIGN FLAWS (medium)
6. **Pairing on "last month's delivery rate on risky parcels" needs Valmo to score last month's orders retroactively.** The deck states it as easy. Ask Valmo; state a fallback (overall delivery rate, a weaker match).
7. **Inconsistent stance on contamination.** Pilot 1 pairs riders **inside** a hub, so Control riders work next to colleagues earning ₹15 on the same parcels (resentment, swapping bags, quitting). (An earlier idea of assigning by hub for parallel pilots was dropped on 2 Oct, so the within-hub design stands and needs its mitigation stated.) *Fix:* say one thing on slide 5 or 8: bags are assigned by the system (no swapping, logged), and Control riders get the bonus after the 30 days (a "stepped" rollout), or run hub-level pairs.
8. **The bonus break-even leaves out the cost of a second attempt.** A rescue often needs a ₹21 re-attempt, which moves break-even from 8.6 to about 10.7 (it is 10.3 with the ₹18 fee). *Fix:* label the conservative line "extra cost per rescue, about ₹18 to ₹21".
9. **The simulator is cleaner than reality in two ways:** no good-month and bad-month luck in riders, and every rider responds to ₹15 equally (the deck itself cites Butschek et al.: responses vary by worker). Both make ranges too narrow and GO too likely. *Fix:* say so on the slide (already planned) and, if time, add a rider-to-rider effect spread to the simulator. Never present "GO 97 in 100" as a prediction; say "if the effect is +15".
10. ~~Parallel-pilot winner rule~~ **Removed on 2 Oct: the parallel-pilot idea was dropped completely.**
11. **Hub-captain design gaps** (now addressed in `24-fake-attempt-control-plan.md`). The captain judges riders from their own hub (a conflict of interest: protect or over-strike); silence costs nothing (auto free re-attempt); there was **no appeal or overturn**; a strike's only consequence was a bonus block, so it meant nothing with the bonus off. *Now in the plan:* an Ops **overturn** within 48 h and a rider "Ask for a review", a 30-day strike expiry, a bonus-independent strike ladder, the captain scorecard and a sample audit of decisions; a real rollout still needs a captain login and a labour-fair process.
12. ~~Parallel-pilot effect defaults~~ **Removed on 2 Oct (same reason).**

## SMALL
13. Pickup books ₹111 in the prototype (₹120 − ₹8 shelf − ₹1 messages), the deck plan says ₹112 net of the shelf cost: say "about ₹112".
14. Source lines for the Surat theft figure and the patents live in `13-refused-parcels.md`, not in `10-sources.md`, although rule 4 says every number is sourced there. Copy them across.
15. "No marketplace re-homes refused parcels from the last-mile hub" is an absolute claim: write "we found none (searched [date])".
16. The prototype's "Deck assumption" button is +12 but the deck's case is +15: change the button or quote both.
17. ~~Pilot-size lever~~ **Removed on 2 Oct (parallel pilots dropped).**
18. Still open from the audit: Live "Close pilot" messages bound phones (disabled in practice by the Twilio trial), no CSP/frame protection, dead code.

## Not checked
The deck PPTX (the teammate's), the 90-second video, the survey and calls, how much time is left today, the mentor's actual answers, real-device behaviour, and any independent security review.

## Do-today checklist, in order
1. Tag the current commit and note the rollback deployment.
2. Screenshots (10-shot list in `23`), QR from the **Demo** page, 90-second video.
3. Banner on `14-deck-handoff.md` (or fix its stale lines).
4. Log the mentor call.
5. Only then: build on a branch, preview-deploy, review, and promote only if green and the assets are already saved.

---

## Deep dive (2 Oct): why the pilot has a fake-attempt rule, every scenario, and the flaws
**Facts read from the code:** the bonus pays on a delivery at any attempt; it is blocked for a rider only when the customer answered "the rider never came" on that rider's own attempt (`assessAttempt` sets `bonusBlocked` only then; GPS alone never blocks it). A phone more than 500 m away opens an exception; within 200 m with no calls and no wait is only "medium" confidence and opens nothing. A failed order is retried at the next day's start by the **same rider** (`tick.ts` calls `retryOne` without a rider). The bots fake 4% of failures **in both arms equally**. The pilot's fake-attempt rule is **absolute** (Bonus riders' suspected rate above 5%), not compared with Control.

**Why a rider might still fake an attempt with a bonus in place (on the same order a fake never earns the ₹15):**
| # | Scenario | Rider's gain | What the prototype does | Gap? |
|---|---|---|---|---|
| S1 | Fake to drop a hard flagged stop for good | Time | Far GPS opens an exception and another same-arm rider re-attempts; "never came" blocks his bonus | Covered |
| S2 | **Defer**: fake "customer unavailable" from near the door today, deliver tomorrow and still get ₹15 | A convenient time and the ₹15 | Medium confidence, no exception; next day the **same rider** gets it; blocked only if the customer answers "never came" | **Gap** |
| S3 | **Effort shift**: push the ₹15 orders, fake or skip normal orders | Time | The rule counts all Bonus riders' attempts (normal orders too); normal-order rule −1 pt; ledger floor −3 pts | Partly (see F1) |
| S4 | **False delivery** (pressure or OTP collusion) to collect ₹15 | ₹15 | OTP, COD cash reconciliation, 7-day hold and clawback, ₹300 cap | **Gap**: no pilot rule watches returns or complaints since plan 18 |
| S5 | Pass-through: A fakes, B (same arm) re-attempts and gets ₹15 | None overall (it moves the ₹15) | Captain monitor (planned) would see repeats | Low |
| S6 | Customer says "never came" when the rider did come (forgot, or avoiding COD) | — | Low confidence, exception, a human decides | Risk of unfair strikes (F6) |
| S7 | Rider fakes the evidence itself (GPS from his own phone) | Time | Values capped, but sent by the rider's app | Real system needs device-level data (audit item 15) |
| S8 | Control rider | No bonus reason | Fakes at the baseline rate: the comparison | — |

**Flaws**
- **F1 The rule is absolute, not causal.** If fake attempts are already 4 to 6% everywhere, it can stop the bonus for a problem the bonus did not cause; if they are 1%, a bonus-caused rise to 4% passes. *Fix:* judge Bonus minus Control (for example no more than +2 points), like the normal-order rule, and show both rates.
- **F2 The simulator cannot show the effect it guards against:** the bots fake equally in both arms and never respond to the bonus. The "Fake attempts rise" scenario is only a slider. Say so.
- **F3 The deferral loophole (S2).** *Fix without changing the any-attempt rule:* when a flagged order's earlier attempt by the same rider was not high confidence, its ₹15 waits in the 7-day pending window for a captain review; count deferrals per rider in the monitor; optionally give the retry to another rider.
- **F4 No watch on false deliveries (S4)**, the bonus's real fraud risk. *Fix:* add returns and complaints (Bonus vs Control) as a monitored number on `/pilot` (or a third safety rule; Gaurav's call, since plan 18 settled two).
- **F5 Plan 24's "₹ saved" double counts:** a recovered delivery in the Bonus arm pays ₹15 to the rider who delivers it; subtract it.
- **F6 A customer's word alone should not produce a strike (S6):** require corroboration (far GPS, no calls, a pattern) or a captain note; with strong at-the-door evidence the default is "confirm valid".
- **F7 Thresholds are guesses** (5% limit, 4% assumed rate): set the limit from the 8-week baseline and lock it before day 1.
- **F8 Code comment** in `attempts.ts` says the check stops fakes being used "to claim a Rescue Bonus": misleading, since a fake attempt never earns the bonus on that order; reword.
