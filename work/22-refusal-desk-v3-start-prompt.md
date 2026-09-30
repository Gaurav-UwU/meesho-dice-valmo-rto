# 22: Prompt to start the Refused-Parcel Desk v3 build (new session)

Plan: `work/21-refusal-desk-v3-plan.md` (agreed in a grilling session on 1 Oct; decisions are settled). Paste the block below into a new session.

```
We're working on Meesho DICE 3.0 Round 2 (Team GPS, Valmo RTO case). Read C:\Users\gaura\OneDrive\Desktop\Meesho DICE\00-MASTER.md, then work/NEXT-SESSION.md, then work/21-refusal-desk-v3-plan.md in full, then the newest entries at the bottom of work/R2-HANDOVER.md and the "Re-home matching engine" entry in Session 6 of that file. The project is a git repo (private GitHub Gaurav-UwU/meesho-dice-valmo-rto, .git outside OneDrive at C:\Users\gaura\.git-dirs\meesho-dice; use plain git, pull first, commit and push each green step).

BUILD the Refused-Parcel Desk v3 exactly as plan 21 says: its decisions are SETTLED, do not reopen them. Explain in simple language. The plan includes keyword matching for the match rate (TF-IDF cosine on listing keywords, exact-SKU rule, Gamma-Poisson forecast with a lower-bound hold rule, backtest).

FIRST MESSAGE: do not build yet. Reply with (1) a 10-line restatement of the plan in your own words, (2) ONE confirmation question: plan 21 adopts two choices from the earlier recommendation that I have not yet explicitly confirmed: keyword/text similarity instead of AI embeddings, and the lower end of the confidence range (P10 >= 5.5%) as the hold rule. Ask me to confirm or change them, then start as soon as I answer.

BUILD ORDER (from the plan), tests first for every engine and reducer change; update existing tests, never delete coverage:
 1. Clarity only: flip-feedback line with preview-only what-if toggles, the three money tiles (Booked so far net / Still in play / Cost of sending everything back), three headline assumptions with the seven accept rates folded.
 2. Inspect step (hub operator; required before Hold only; bots auto-inspect), the "Item condition OK" gate for damaged/wrong items with a "Seller claim / QC needed" chip, skip second chance with four reasons, and the two Audit checks.
 3. Keyword matching engine: catalogue.ts, keywords.ts, demand.ts, backtest.ts, then router.ts and parcels.ts, then the Desk forecast card, backtest panel last. Hidden true rate vs what the Router believes from 14 days of history. A similar SKU is NEVER the parcel.
 4. Second-chance options: Different time, Pay now by UPI, then Pick up at hub (48 h window, pickup code, shares the 30 shelf slots with Hold, no extra proactive message, the original refusal stays the rider's failure in the pilot verdict and never pays a bonus).
 5. Pilot KPI panel with a "too early" floor of 30 parcels per lane, and the pickup Audit checks.
 If the Fri 2 Oct 3 pm freeze bites, drop in this order: KPI panel, hub pickup, the backtest panel. Never drop steps 1 and 2 or the matching engine itself. Today is Thu 1 Oct, mentor call 3:30 pm IST, submit Sat 3 Oct.

RULES:
 - ONE saved-day schema bump for all steps (DAY_SCHEMA and the local storage key); a shared Supabase day needs one Reset afterwards. Keep api/_lib/validate.ts and the Live inbound parsing in sync; Live mode must still compile and its API tests pass. Re-check the dayId logic from the sync session.
 - Do not cut anything on the never-cut list (attempt-2 + denominator fix, verdict module, headline, clawback, Router timers + booked savings). The hub-pickup terminal state must not count as delivered or pay a bonus (add scenario tests).
 - Contact cap stays 4 proactive messages per order.
 - Every number on screen that is a model or assumption is labelled; history is synthetic and says so; no fake zeros for custody incidents or complaints.
 - Deploy only when `npx vitest run && npx tsc -b && npx oxlint && npm run build` are clean (chained with &&), then `node scripts/build-api.mjs && npx vercel deploy --prod --yes`. Only deploy green steps; the 90-second Demo path must keep working. Check each deploy in the browser at desktop and 375 px.
 - Do not enter or create accounts/keys. Note that Bash here halves backslashes in heredocs, so prefer the Edit/Write tools for code with regexes.
 - Before we stop: log the session in work/R2-HANDOVER.md, update work/NEXT-SESSION.md and 00-MASTER.md, add the new Desk flows to work/20-prototype-user-guide.md, and append what changes for the deck (slide 6: "hold only where the low end of the forecast clears break-even") to work/16-deck-changes-prototype-v2.md.
```
