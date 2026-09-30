# 19: Prompt for the session that fixes multi-device sync and "new day" reset

Paste the block below into a new session. Written 1 Oct 2026 after a demo on several phones where a new day did not reset everyone's data.

```
We're working on Meesho DICE 3.0 Round 2 (Team GPS, Valmo RTO case). Read C:\Users\gaura\OneDrive\Desktop\Meesho DICE\00-MASTER.md, then work/NEXT-SESSION.md, then work/19-sync-reset-fix-prompt.md and the newest entries at the bottom of work/R2-HANDOVER.md. The project is a git repo (private GitHub: Gaurav-UwU/meesho-dice-valmo-rto, .git lives outside OneDrive at C:\Users\gaura\.git-dirs\meesho-dice; use plain git, not `gh repo create --source`).

PROBLEM (reported by Gaurav after running the demo on several phones): the devices do not stay in sync, and when I press a new day (Ops: "Start day" / "Reset day") the data does not reset on the other devices. Fix the WHOLE issue, not one symptom. Explain things in simple language.

STEP 0: ask me these before changing code (one short message, then continue with what you can do without the answers):
 1. Were the phones in Demo mode (no ?mode=live) or Live mode (?mode=live, Supabase)? Were the QR codes / links used?
 2. Which phones and browsers (Safari iPhone, Chrome Android)? Were any in a private tab or "in-app browser" (WhatsApp, Instagram)?
 3. What exactly did each device show after the reset: the old orders, a blank/"Loading" page, or a mix? Did the laptop Ops tab reset but the phones did not, or the other way round?
 4. Did anyone press Start day or Reset day, and was Autopilot running?

WHAT THE CODE DOES TODAY (verified by reading it on 1 Oct, check again):
 - Demo mode (src/store/local.ts): the day lives in each BROWSER's localStorage (key rescue-console-day-v5:<hub>) and is shared between tabs with a BroadcastChannel. BroadcastChannel and localStorage never cross devices, so SEPARATE PHONES NEVER SHARE A DAY in Demo mode. The landing page even says a phone keeps its own day.
 - Mode choice (src/main.tsx chooseStore): Live mode only if ?mode=live was in the URL (remembered per tab in sessionStorage) AND the Supabase keys were built in; otherwise it QUIETLY falls back to Demo mode with no warning. A phone opened from a QR code without ?mode=live is therefore in its own private Demo day.
 - Adoption rule in Demo mode (local.ts listener): another tab adopts a broadcast only if state.version > mine.version OR seed differs. reset() builds a fresh day (same default seed 2026) with version = THIS tab's version + 1. A tab whose own version is higher (it took more actions) ignores the reset, and its next action broadcasts its old day with the higher version and OVERWRITES the reset everywhere.
 - Live mode (src/store/live.ts + api/_lib/core.ts): server reset also bumps version+1 and clients poll every 5 s plus Supabase Realtime. Reset needs the admin token (asked once per tab, sessionStorage). A day saved in Supabase with the OLD shape (DAY_SCHEMA is now 5) is silently ignored by isDayState, so screens can sit on "Loading" until someone presses Reset with the admin token.
 - Per-device leftovers after a reset: rider/customer screens keep local UI state (open sheets, typed OTP, selected order, the Autopilot loop toggle in src/pages/ops/useAutopilotLoop.ts), landing walkthrough ticks in localStorage, tab secrets in sessionStorage.
 - reducer actions carry no "which day" id, so an action sent from a stale device can be applied to a NEW day.

LIKELY ROOT CAUSES (confirm each with a failing test or a reproduction, rank by evidence):
 A. Phones were in Demo mode, so they were never meant to sync (most likely). Needs a real shared day plus an honest indicator.
 B. Version-based adoption lets a stale device keep or restore the old day after a reset (Demo and Live).
 C. Actions from a stale device hit the new day (no dayId).
 D. Old-shape day in Supabase ignored silently, or no admin token on the device that pressed Reset.
 E. Safari/private/in-app browsers: localStorage blocked or BroadcastChannel missing, so even tabs do not sync.
 F. Device-local UI state survives a reset.

WHAT "FIXED" MEANS (acceptance):
 1. One place tells every screen whether it is SYNCED (shared day, shows hub + day id + version + last update) or ALONE (this device has its own private day). Never silent. A phone that is alone says so in plain words and how to join.
 2. Phones can join the same day without typing keys: the QR/links on the landing page and Setup open the right mode. Decide with me between (a) Live mode for all devices with WhatsApp emulated in-app (Twilio stays off), or (b) a simpler shared-day backend for the demo. Prefer reusing the existing Supabase + /api Live code.
 3. "Start day" / "Reset day" on Ops gives the day a NEW dayId. Every device discards the old day and any local leftovers within a few seconds (Realtime or the 5 s poll), shows the new day, and stops Autopilot. Actions stamped with an old dayId are rejected with a clear message ("the day was reset, refreshing"), never applied.
 4. A stale device can never overwrite a newer day (compare dayId first, then version).
 5. Old-shape saved days (local or Supabase) recover on their own or show one clear "press Reset" message; no silent "Loading".
 6. Works on iPhone Safari and Android Chrome, including a private tab (falls back with a visible warning) and on a flaky connection.
 7. The 90-second video path still works end to end in Demo mode on one browser. Live mode still compiles and its API tests pass.

HOW TO WORK:
 - Reproduce first: write failing tests that show the bug (two store instances sharing a fake channel / fake feed: reset on A while B has a higher version; a stale action after reset; Supabase fake with old schema; adoption order). Then fix. Tests first for store, reducer and api changes; update, never delete, existing tests.
 - A new field (dayId) changes DayState: bump DAY_SCHEMA (5 -> 6) and the local storage key, keep api-src / api/_lib validation in sync (api/_lib/validate.ts), and note that Supabase needs one Reset afterwards.
 - Check in a real browser with two profiles or a phone-width window plus the laptop tab; say exactly what you could and could not test on real phones.
 - Do not cut anything on the never-cut list (attempt 2 + denominator, verdict module, headline, clawback, Router timers).
 - Deploy only when `npx vitest run && npx tsc -b && npx oxlint && npm run build` are clean (chained with &&), then `node scripts/build-api.mjs && npx vercel deploy --prod --yes`. Commit to git with a conventional message and push.
 - Do NOT enter or create accounts/keys: if Supabase/Vercel/admin keys are needed, tell me what to do.
 - Before we stop: log the session in work/R2-HANDOVER.md, update work/NEXT-SESSION.md and 00-MASTER.md, add a one-line "how to run the multi-phone demo" to prototype/README.md and the landing Setup section.
 - Deadline context: mentor call Thu 1 Oct 3:30 pm IST, freeze Fri 2 Oct 3 pm (screenshots, QR, 90 s video), submit Sat 3 Oct.
```
