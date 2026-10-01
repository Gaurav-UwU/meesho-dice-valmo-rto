# 25: Prompt to start the Fake-Attempt Control build (new session)

> **SUPERSEDED on 2 Oct by `27-build-prompt-all-changes.md`**, which includes this build plus the pilot-rule fixes, the code-review fixes and the security fixes. Use 27.

Plan: `work/24-fake-attempt-control-plan.md` (decisions settled except the seven in its section 7, which carry recommended answers). Paste the block below into a new session.

```
MY ANSWER TO THE SEVEN DECISIONS IN SECTION 7 OF THE PLAN (edit if you disagree): all seven agreed as recommended.

We're working on Meesho DICE 3.0 Round 2 (Team GPS, Valmo RTO case). Read C:\Users\gaura\OneDrive\Desktop\Meesho DICE\00-MASTER.md, then work/NEXT-SESSION.md, then work/24-fake-attempt-control-plan.md in full, then work/26-plan-review-2-oct.md and the newest entries at the bottom of work/R2-HANDOVER.md. The project is a git repo (private GitHub Gaurav-UwU/meesho-dice-valmo-rto, .git outside OneDrive at C:\Users\gaura\.git-dirs\meesho-dice; use plain git, pull first, commit and push each green step; never use `gh repo create --source`).

BUILD the Fake-Attempt Control exactly as plan 24 says. Its decisions are SETTLED, do not reopen them. Explain in simple language. The idea of parallel pilots is REMOVED completely: do not build any of it.

THE POINT: this is built INDEPENDENTLY of the Rescue Bonus. It must work with the bonus off (bonus: 0), in both arms, from the baseline period, and its consequences must not rely on the bonus. It also solves the same problem the bonus solves (riders avoiding hard stops by logging fake "customer unavailable" attempts) from the other side, and it is the fallback story for the deck: if the 30-day bonus pilot fails, a bonus-independent plan (fake-attempt control + the Refused-Parcel Router with local re-home) stands, "built and tested in our prototype", never "proven".

WHAT TO BUILD (four steps, tests first, one saved-day schema change):
 1. Domain: strikes become a strike log (rider, order, sim time, reason, captain, overturned) with a derived active count (30-day expiry); the ladder (1 warning, 2 enhanced review of every failed attempt for 14 days, 3 escalation to the hub manager); owner hub_captain on exceptions; reason and note on resolveException (a strike without a reason is rejected); overturnStrike (Ops, within 48 h) and a rider "Ask for a review" flag; captainMissed after 24 h (free re-attempt, no strike); the Watch rule (3 disputes in 7 days and 2x the hub median); KPI selectors; the ledger block reads the derived strike count; a bonus-off day creates no ledger rows. New events with required fields.
 2. Captain screen /captain?hub= and the rider monitor (queue with evidence, rider record, status Clear/Watch/Warning/Escalated, timeline, scorecard).
 3. Visibility: rider banner and strike meter with the ladder text (Hindi too), Ops read-only hub view, ledger line, the new Audit checks, links from the Ops header, Desk menu and the landing "windows".
 4. Outcome KPI panel (disputed, confirmed, cleared, auto-expired, overturned, recovered deliveries, rupees saved = recovered x 99 - reviews x 10, break-even about 1 in 10, "too early" under 30), the walkthrough step "Catch a fake attempt" now on the captain screen, work/20-prototype-user-guide.md, README, api/_lib/validate.ts and Live parsing, and the deck addendum.
 Cut order if time runs short: the rider timeline and the Watch rule, then the KPI panel. Never cut steps 1 to 3.

FIRST MESSAGE: do not build yet. Reply with a 10-line restatement of the plan in your own words, then start building as soon as I say "start". (My answer to the seven decisions is on the first line; treat it as final.)

TIME: it is Fri 2 Oct, the freeze is 3 pm (screenshots, QR from the DEMO page and never a shared-day QR which carries the live key, 90 s video), submit Sat 3 Oct. Do NOT delay the freeze. The deck assets are taken on the currently deployed build; only the fake-attempt screenshot or clip is re-taken after this build. Tag the current commit first (git tag freeze-candidate-2026-10-02) and note the current production deployment as the rollback. Build on a branch, use a PREVIEW deploy (vercel deploy without --prod), and promote only if green. No production deploys on Saturday except a hotfix.

RULES:
 - Tests first for every engine, reducer and API change; update existing tests, never delete coverage (the existing fake-attempt scenarios must be UPDATED to the captain flow).
 - ONE saved-day schema bump (DAY_SCHEMA and the local storage key). Keep api/_lib/validate.ts and the Live inbound parsing in sync (the reason enum, overturn action). Live mode must still compile and its API tests pass. The sync session's dayId logic must still pass. A shared Supabase day needs one Reset afterwards (Gaurav, admin token).
 - Do not cut anything on the never-cut list (attempt-2 + denominator fix, verdict module, headline, clawback, Router timers + booked savings). The existing pilot safety rule (suspected fake attempts of Bonus riders above 5%, judged from 30 attempts) stays. Single-pilot behaviour and the 90-second video path must stay as they are.
 - Every model number on screen is labelled as an assumption or simulation (the 4% fake share is an assumption; no real fake rate is known). No fake zeros. No new proactive WhatsApp messages (cap stays 4 per order).
 - Gate before any deploy: `npx vitest run && npx tsc -b && npx oxlint && npm run build` (chained with &&), then `node scripts/build-api.mjs && npx vercel deploy --prod --yes` (only after the preview is checked). Check each deploy in the browser at desktop and 375 px, then commit and push.
 - Run the code-review and security-review agents on the diff before the final production deploy.
 - Do not enter or create accounts/keys. Bash here halves backslashes in heredocs and treats backticks inside double quotes as command substitution: use the Edit/Write tools for code with regexes or backticks.
 - Before we stop: log the session in work/R2-HANDOVER.md, update work/NEXT-SESSION.md and 00-MASTER.md, and make sure work/23-deck-plan-v5.md carries the fallback-story addendum.
```
