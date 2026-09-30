# NEXT SESSION: pick up from here

**Last updated at the end of Session 12 (1 Oct): the multi-device sync and "new day" reset bug is FIXED in code (tests and a real-browser check pass) but NOT yet deployed.** Read [`../00-MASTER.md`](../00-MASTER.md) first, then this file, then the Session 12 entry at the bottom of `R2-HANDOVER.md`.

## ⭐ FIRST: deploy and try it on real phones
1. `cd prototype && npx vitest run && npx tsc -b && npx oxlint && npm run build`, then `node scripts/build-api.mjs && npx vercel deploy --prod --yes` (needs Gaurav's Vercel login; none in the cloud session). Check `https://valmo-rescue-console.vercel.app/api/health`.
2. Confirm the Vercel build has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; otherwise the landing page says the shared day is "not set up" and phones can only be ALONE (honest, but not what the demo needs). `LIVE_KEY` and `ADMIN_TOKEN` must be known to the team. No manual Reset is needed after this deploy: the server replaces the old-shape day by itself.
3. **Multi-phone run:** laptop → landing page → "Several devices (shared day)" → "Start with a fresh day" → scan the Rider and Customer QR codes → every screen should say **SYNCED · same Day and id**. Press Reset day on Ops: phones switch to the next day within about 5 s. A phone that says **ALONE** is on its own private day (tap the badge for why).
4. Test on **real iPhone Safari and Android Chrome**, and a private tab and a WhatsApp in-app browser. Only Chromium at phone width was tested.
5. Decisions waiting for Gaurav: (a) shared day = Live mode with the in-app WhatsApp (chosen, Twilio off), (b) Start day keeps the day id, only Reset day makes a new one, (c) the QR codes contain the live key, so show them only to the team's phones.

## Then the list from Session 11 (unchanged)
1. **Deck:** send the teammate `16-deck-changes-prototype-v2.md` (the new section at the bottom is the source for slide 5); `14-deck-handoff.md`'s "PENDING" lines, "~7.5" and "GO 2 times in 3" are replaced. The HTML copy of 14 is not synced.
2. Run the independent **code-review + security-review agents** (not run in Sessions 8, 9, 11 or 12). Session 12 touched the API (day id check, OTP masking rule, old-shape upgrade), so the security review matters more now.
3. Fix from `17-prototype-audit.md` if time: item 1 (Live `closePilot` messages bound phones), then the nice-to-haves.
4. **Freeze Fri 2 Oct, 3 pm:** Ops, Desk, Rider, Audit and `/pilot` at desktop and phone width; screenshots for deck slides 4 and 6, the QR, the 90 s video (Demo mode, one browser), then redeploy.
5. Optional: a "Plan Pilot 2" button, the re-home matching engine, Playwright e2e in the repo (the Session 12 check was a throwaway script), Hindi on the rider sheets.

**The single most important thing to know before the mentor call (Thu 1 Oct, 3:30 pm) is unchanged:** the default pilot says GO (+13.6, range +11.1 to +16.2), smallest effect about 4 per 100, P(GO) at +12 about 58%, and a real pilot will be noisier than the simulation. Say that before a judge does.

Paste to start the next session:
> We're working on Meesho DICE 3.0 Round 2 (Team GPS, Valmo RTO case). Read `C:\Users\gaura\OneDrive\Desktop\Meesho DICE\00-MASTER.md`, then `work/NEXT-SESSION.md`, then the newest entries at the bottom of `work/R2-HANDOVER.md` (Session 12 is the sync and reset fix). Tell me what happened on the real phones and at the mentor call, then do the next steps in NEXT-SESSION.md. Tests first for store, reducer and API changes, update (don't delete) existing tests, keep Live mode compiling, deploy only when `npx vitest run && npx tsc -b && npx oxlint && npm run build` are clean (chained with `&&`), and ask me before cutting anything on the "never cut" list. Explain in simple language. Before we stop, log the session in R2-HANDOVER.md and update NEXT-SESSION.md and 00-MASTER.md.

---

## (Session 11 state, kept for reference) the prototype is feature-complete; what is left is the call, the deck numbers, and the freeze
**Plan 18 is DONE** (Session 11 at the bottom of `R2-HANDOVER.md`). Live: https://valmo-rescue-console.vercel.app · 723 tests, `tsc -b` / `oxlint` / `vite build` clean. Riders are paired on past delivery rate, the range is pair by pair on `/pilot`, the Ops card and "Check today's Ops day", a ✔ Fair comparison line, two safety rules, Top 20% / 10% only, Pilot 2 as the "Next:" sentence.

**The single most important thing to know before the mentor call (Thu 1 Oct, 3:30 pm):** the **default pilot now says GO** (+13.6, range +11.1 to +16.2), not RE-PRICE, and the **smallest effect it can see is about 4 per 100** (was 7.5). Chance of GO if the true effect is +12 is **about 58%** (was 27%), at +15 it is 97%. The simplified maths is sharper because pairing removes rider-to-rider noise, **but the simulation has no month-to-month luck in riders, so a real pilot will be noisier**. Say that before a judge does. Top 10% on the default seed says RE-PRICE by luck (+10.2, range +6.6 to +13.8).

**Next session, in this order**
1. **Deck:** send the teammate `16-deck-changes-prototype-v2.md` (the new section at the bottom is the source for slide 5: the method, the rule table, the 60% label, score accuracy, the new numbers) and tell them `14-deck-handoff.md`'s "PENDING" lines, "~7.5" and "GO 2 times in 3 at +15" are replaced. The HTML copy of 14 is not synced.
2. Run the independent **code-review + security-review agents** (not run in Sessions 8, 9 or 11).
3. Fix from `17-prototype-audit.md` if time: item 1 (Live `closePilot` messages bound phones, 30 min), item 3 (no git: `git init` + a gated `npm run ship`), then the nice-to-haves.
4. **Freeze Fri 2 Oct, 3 pm:** look at Ops, Desk, Rider, Audit and `/pilot` with your own eyes at desktop and phone width; screenshots for deck slides 4 and 6, the QR, the 90 s video (Demo mode, use the landing page as the script), then redeploy.
5. Optional: a "Plan Pilot 2" button (plan Q9), the re-home matching engine, Playwright e2e, Hindi on the rider sheets.

Paste to start the next session:
> We're working on Meesho DICE 3.0 Round 2 (Team GPS, Valmo RTO case). Read `C:\Users\gaura\OneDrive\Desktop\Meesho DICE\00-MASTER.md`, then `work/NEXT-SESSION.md`, then the newest entries at the bottom of `work/R2-HANDOVER.md`. Plan 18 (the simplified pilot) is built and deployed. Tell me what came out of the mentor call, then do the next steps in NEXT-SESSION.md. Tests first for engine and reducer changes, update (don't delete) existing tests, keep Live mode compiling, deploy only when vitest, `tsc -b`, oxlint and vite build are clean (chained with `&&`), and ask me before cutting anything on the "never cut" list. Explain in simple language. Before we stop, log the session in R2-HANDOVER.md and update NEXT-SESSION.md and 00-MASTER.md.

---


## PROTOTYPE v2: Tier 0 AND Tier 1 are DONE and deployed (1 Oct, small hours; the pilot part was later simplified by plan 18)
**Read the Session 8 and Session 9 entries at the bottom of `R2-HANDOVER.md`.** Test count then: 603. All 15 scenarios pass and the Audit is green after Autopilot + Close pilot.

**What the prototype now does end to end (Demo mode is the product):**
- Flag → customer WhatsApp (I'm home / change time / fix address / Pay now with a real payment step) → rider (proof at the door: GPS, calls, wait; refusal reason) → OTP → ₹15 accrues, waits for COD cash, is held 7 sim-days, then released or clawed back
- A sim clock with timers, an exception queue (confirm / free re-attempt / strike), typed events, a cost and savings ledger booked only on real outcomes
- The Refused-Parcel Desk on expected values (second chance, hold and re-home, batched return), 24 h and 48 h timers, a re-home cohort kept out of the metrics, an editable assumptions panel
- `/pilot` (riders paired on past rate, pair-by-pair range, fair-comparison check, two safety rules, P(GO), INVALID demo) and the Ops card and "Check today's Ops day" on the same `verdict()`; `/audit` with ten green-or-red checks

**For the mentor call (Thu 1 Oct, 3:30 pm)**, a good 5-minute path: Start day → Autopilot a few steps → rider: "Attempted", tap "Demo: log it from far away" → Ops: exception queue, "Free re-attempt" → +1 day → Close pilot (confirm) → Ops card verdict, pair count and fake-attempt check + money ledger → `/audit` all green → `/pilot`: the ✔ Fair comparison line, the verdict with its range, the "300 times" odds bar (GO about 6 in 10 at +12), drag "How much the bonus helps" to about +8 to see RE-PRICE and the Pilot 2 "Next:" line, the disclaimer, the INVALID checkbox, then "How the maths works". Be ready to say that one demo day (~30 orders per arm) is noise and that the normal-order safety rule can trip by chance on a single day.

**Landing page (1 Oct):** `/` is the demo guide (setup, 8 ticked steps, folded real-vs-simulated table) and `/pilot` has one-tap scenarios; use the landing page as the script for the 90 s video. Session 10 in `R2-HANDOVER.md`.

**Still true from earlier sessions:** Live mode: a day already saved in Supabase has the old shape (now also schema 5): press Reset once. WhatsApp sending is still blocked by the Twilio trial. The re-home matching engine (design in `R2-HANDOVER.md`) is still not built.

## Where we are (29 Sep)
**Done**
- Deck strategy, structure and full slide content (v3) → handed to the deck teammate (`14-deck-handoff.md`). **She builds the PPTX.**
- Research:
  - fact-checks and sources (`10-sources.md`)
  - Valmo's rider contract
  - a real Meesho order observed (one-way WhatsApp, 5 days early, 2 calls, no wait)
  - Flipkart comparison
  - refused-parcel legal deep dive (`13`)
  - novelty check
  - TrustMesh analysis
- Survey: short 1-minute Hindi/English Google Form created from `work/survey-r2-script.gs`
- Prototype: plan (`08` v2) + theme from Valmo's real apps (`12` + `research/ui-refs/`)
- Mentor Slack intro and progress messages drafted and sent by Gaurav

**Also done (29 Sep evening)**
- ✅ `08-prototype-spec.md` rewritten as **v3**: ops console, hub only in the Refused-Parcel Desk, Rescue Score, Lucknow (UP), Router v2 lanes, WhatsApp failure check, and a build order re-cut around the mentor call.

**Also done (29 Sep night): the prototype is built.** Demo mode is complete and tested (281 tests); Live mode is coded but not tested against real accounts. See `prototype/README.md` and `R2-HANDOVER.md` Session 6. Diagrams in `work/diagrams/`.

**Not done**
- ❌ Live mode: Supabase is done and verified. Still needs Twilio (SID/token in `.env.local`, sandbox joined on 2–3 phones) and `npx vercel login`, then deploy + set the Twilio webhook (see `prototype/LIVE-SETUP.md`)
- ✅ Real pincode geography built for all 4 hubs (`prototype/data/geo-*.json`)
- ❌ Playwright e2e test, Vercel deploy, 90 s video, screenshots + QR for the deck
- ❓ Open with Gaurav: full vs lean Live scope · who attends and demos the mentor call · overnight survey/call findings
- ❌ Survey responses and analysis (target 150+ by Sep 30, ⅓ small-town)
- ❌ Rider/hub calls:
  - incentive size
  - **how long refused parcels sit at the hub before going back**
  - share of "maybe later" refusals
  - whether the refusal OTP gets skipped
- ❌ Cause-chart build-up (source + n per slice)
- ❌ From Gaurav's order:
  - the app's failure reason
  - whether Valmo made a verification call
  - what happened on the re-attempt
  - whether "Pay Before Delivery" appears on the order page
- ❌ 2–4 more test orders
- ❌ **Mentor Connect call: Thu 1 Oct 2026, 3:30–4:00 pm IST. Cannot be rescheduled; at least one team member must attend.** Bring a prototype idea, wireframe, demo or WIP (target: the Demo-mode click-through; fallback: wireframes). Ask:
  1. Does rider pay work per successful delivery, and would a per-order bonus fit?
  2. Is TrustMesh's signal available after dispatch?
  3. Is a look-and-feel clone of Valmo Pilot/Operations OK, or would they prefer a neutral look?
  4. Is a labelled synthetic-data prototype acceptable?
  5. Live WhatsApp in the video, or a clean Demo mode?
  6. Which screen matters most to a Meesho judge?
  After the call: write the notes to `R2-HANDOVER.md` and pass them to the deck teammate.
- ⚠️ The Vercel MCP connector needs re-auth (`/mcp` in an interactive `claude` terminal), or use the Vercel CLI

## Timeline (submit Sat 3 Oct)
| Date | Deck (teammate) | Prototype (Gaurav + Claude) | Research |
|---|---|---|---|
| Tue 29 Sep | v1 all slides with placeholders | — | Survey push, calls, orders |
| Wed 30 Sep | Review → v2, add findings | **Start:** engine with tests (Rescue Score, economics, Router), geo data, then ops console + rider + customer emulator in **Demo mode** (local store, no accounts) | Results handed over |
| Thu 1 Oct | Tighten, check numbers | Morning: close the Demo-mode hero loop (+ Desk if time). **3:30–4:00 pm MENTOR CALL.** After: fold in feedback, start Live mode (Supabase + Twilio) | Fact-check deck; call notes to the deck teammate |
| Fri 2 Oct | Screenshots + QR, polish | Live round trip, Refused-Parcel Desk, simulator, deploy, 90s video, screenshots | — |
| Sat 3 Oct | **Freeze → dry run → submit** | | |

**We're about 1.5 days behind on the prototype.** If time runs short, drop in this order: the Hindi toggle → auto-moving fake riders → the Demo-mode WhatsApp emulator. **Never drop:** flag → rider → OTP → ₹15 loop, the pilot verdict, the Router lanes.

## Suggested first actions in the new session
1. Ask Gaurav what came in overnight: survey count, call findings, teammate's deck v1, mentor call date.
2. `08-prototype-spec.md` is already v3 (done 29 Sep). Confirm the open items with Gaurav (§ "Also done" above).
3. Walk through the plan in simple language if needed, then wait for **"start"**. Remember the mentor call at 3:30 pm on 1 Oct sets the pace.
4. On "start":
   - Gaurav creates Supabase + Twilio accounts, joins the WhatsApp sandbox on 2–3 phones, puts the keys in `prototype/.env.local`, and runs `vercel login`.
   - Claude builds per `08` in the build order (engine with tests first).
5. Fold any new research into `14-deck-handoff.md` (and tell the deck teammate what changed).

## Things Claude must not do
- Start code, installs or PPTX building without "start".
- Enter API keys or create accounts (Gaurav does these).
- Use the rejected claims (`10-sources.md` fact-check log / `14` §7).
- Put personal data (phone numbers, OTPs, AWBs) on slides or in the prototype.


## After the 1 Oct call
- **Build the re-home matching engine** (design in `R2-HANDOVER.md`, "Re-home matching engine"). Start with the engine + tests, then Desk cards + backtest chart. Needs Gaurav's "start" and two answers: similarity by text/attributes vs AI embeddings; hold rule on the confidence lower bound.
- Twilio trial cannot send free-text WhatsApp (error 21654); decide between upgrade, Meta test number, or Demo-mode-only for the video.
