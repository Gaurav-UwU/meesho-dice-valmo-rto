# 25: Prompt to start the Hub Captain + Two Pilots build (new session)

Plan: `work/24-two-pilots-and-hub-captain-plan.md` (decisions settled; the five hub-captain defaults in §5 need a one-word "agreed" from Gaurav). Paste the block below into a new session.

```
We're working on Meesho DICE 3.0 Round 2 (Team GPS, Valmo RTO case). Read C:\Users\gaura\OneDrive\Desktop\Meesho DICE\00-MASTER.md, then work/NEXT-SESSION.md, then work/24-two-pilots-and-hub-captain-plan.md in full, then the newest entries at the bottom of work/R2-HANDOVER.md. The project is a git repo (private GitHub Gaurav-UwU/meesho-dice-valmo-rto, .git outside OneDrive at C:\Users\gaura\.git-dirs\meesho-dice; use plain git, pull first, commit and push each green step; never use `gh repo create --source`).

BUILD two changes exactly as plan 24 says. Its decisions are SETTLED, do not reopen them. Explain in simple language.
 Part A: suspected false attempts are passed to the HUB CAPTAIN (a new /captain?hub= screen) who can Confirm valid / Free re-attempt / Strike (a strike needs a reason chip). Ops becomes read-only on the queue. Make it visible to the captain, the rider (review banner, strike meter "1 of 2", Hindi strings), Ops ("With hub captains" read-only, "captain did not decide" flags), the ledger, the Audit (two new checks) and the landing walkthrough.
 Part B: two parallel pilots. Pilot A = Powai + Lucknow at Rs 15, Pilot B = Whitefield + Gaya at Rs 10, same top 20%, assumed true effect A +12, B +8 (editable, labelled a guess). Each pilot is compared only with its own Control; a Compare view applies the locked winner rule and shows the honest "can't tell" warning (smallest detectable difference about 5 per 100) plus a safety comparison (suspected fake rate and strike rate per pilot).

FIRST MESSAGE: do not build yet. Reply with (1) a 10-line restatement of the plan in your own words, and (2) ONE question: ask me to confirm in one word each the five hub-captain defaults in section 5 of the plan (captain decides and Ops is read-only; a strike needs a reason chip; 24 h with no decision is a free re-attempt marked "captain did not decide"; no captain login in the demo; a strike on a Control rider counts but has no bonus effect). Then start as soon as I answer.

TIME: it is Fri 2 Oct, the freeze is 3 pm (screenshots, QR, 90 s video), submit Sat 3 Oct. Do NOT delay the freeze. The deck screenshots and the video are taken on the currently deployed build; only the fake-attempt screenshot or clip needs re-taking after Part A. ORDER: Part A (engine, then the captain screen, then rider and Ops visibility, then Audit and docs), then Part B steps 1 and 2 (engine and side-by-side on /pilot), then Part B step 3 (the two Ops consoles) only if there is time: cut that first. Only deploy green steps.

RULES:
 - Tests first for every engine, reducer and API change; update existing tests, never delete coverage (the existing fake-attempt scenarios must be UPDATED to the captain flow).
 - ONE saved-day schema bump for everything (DAY_SCHEMA and the local storage key). Keep api/_lib/validate.ts and the Live inbound parsing in sync (the strike reason enum). Live mode must still compile and its API tests pass. The sync session's dayId logic must still pass. A shared Supabase day needs one Reset afterwards (Gaurav, admin token).
 - Do not cut anything on the never-cut list (attempt-2 + denominator fix, verdict module, headline, clawback, Router timers + booked savings). Single-pilot behaviour must stay the DEFAULT so the 90-second video path is unchanged.
 - Every model number on screen is labelled as an assumption or simulation. No fake zeros. No new proactive WhatsApp messages (cap stays 4 per order).
 - Gate before any deploy: `npx vitest run && npx tsc -b && npx oxlint && npm run build` (chained with &&), then `node scripts/build-api.mjs && npx vercel deploy --prod --yes`. Check each deploy in the browser at desktop and 375 px, then commit and push.
 - Do not enter or create accounts/keys. Bash here halves backslashes in heredocs and treats backticks inside double quotes as command substitution: use the Edit/Write tools for code with regexes or backticks.
 - Before we stop: log the session in work/R2-HANDOVER.md, update work/NEXT-SESSION.md and 00-MASTER.md, update work/20-prototype-user-guide.md (the fake-attempt step now uses the captain screen), and append the deck edits (slide 4 controls table: suspicious attempts go to the hub captain; slides 5, 7, 8: two parallel pilots, 24 pairs per pilot needs 8 hubs at 12 riders a hub, assign by hub) to work/23-deck-plan-v5.md.
```
