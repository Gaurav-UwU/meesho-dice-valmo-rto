# 34 · Prompt: deploy plans 32 + 33 (run on Gaurav's machine, which has the Vercel login)

Paste the block below into Claude Code opened in the project folder on your own computer (the cloud session cannot reach Vercel).

```
Read 00-MASTER.md, then work/NEXT-SESSION.md, then the Session 20 entry at the bottom of work/R2-HANDOVER.md.
Deploy plans 32 + 33 from branch claude/practical-ptolemy-74voam (commits 3e7ad7a, 1cd97b1; docs c07e59f).

1. git fetch origin && git checkout claude/practical-ptolemy-74voam && git pull. Note the current production
   deployment (npx vercel ls) as the rollback; it should be agn0k8co1.
2. In prototype/: npm ci, then the gate chained with &&:
   npx vitest run --maxWorkers=4 && npx tsc -b && npx oxlint && npm run build && node scripts/build-api.mjs
   Expect 1,320 tests, oxlint 0 errors. If anything fails, stop and tell me; do not deploy.
3. Preview: npx vercel deploy (NOT --prod). Give me the preview URL. Check it in a browser (Demo mode, hub Lucknow),
   at desktop and 375 px width, with no console errors:
   - / : no "Team GPS · IIT Bombay · Meesho DICE 3.0" line, no chips; footer says "Not an official Valmo app. Synthetic data."
   - /ops?hub=lucknow : Start day.
   - /customer?hub=lucknow : first message in English AND Hindi; next message "Which language…" with English / हिंदी;
     tap हिंदी → Hindi reply; "I'm home" still works under it → Hindi thanks.
   - /rider?hub=lucknow (Demo Bonus rider): Call → masked-number sheet (no phone number, no tel: link) → No answer twice
     → card shows "2 calls · last HH:MM"; Attempted → "2 calls logged by the app" → Demo: log it from far away →
     Customer unavailable.
   - /captain?hub=lucknow : evidence card "Calls: 2 (logged by the app)"; Free re-attempt → the order is back in the
     SAME rider's Pending list.
   - /audit?hub=lucknow : "All 19 checks are green".
   - /api/health answers (it may say {"ok":false} until CAPTAIN_KEY is set; Demo mode does not need it).
   Report what you saw, then STOP and wait.
4. Production ONLY after I type "go prod": npx vercel deploy --prod --yes (this also ships 2c14e5e, no captain ₹10).
   Then repeat the step 3 checks on https://valmo-rescue-console.vercel.app. If a shared-day screen says NEEDS RESET,
   tell me (do not press Reset yourself). If production is broken, roll back to the deployment noted in step 1.
5. After prod: merge the branch into main (fast-forward if possible) and push. Do not create or print any keys
   (CAPTAIN_KEY / LIVE_KEY); I set those myself.
6. Log the deploy (preview id, prod id, what was checked) at the bottom of work/R2-HANDOVER.md, and update
   work/NEXT-SESSION.md and 00-MASTER.md. Remind me to retake the slide 6 captain screenshot (Calls line changed)
   and to have a native speaker read the Hindi WhatsApp lines (prototype/src/domain/messages.ts, the HI block).
Explain in simple language.
```
