# 32 · Prototype plan: same-rider re-attempt, in-app calling, landing clean-up

Written 4 Oct 2026 (Session 19). Prototype: `prototype/` (Vite + React + TS), live at https://valmo-rescue-console.vercel.app.
Working deck: `GPS_IIT Bombay_ROUND_2_v5.pptx`. The deck already says "same rider" (slides 6, 8), so **part A must ship before submission**.

Production right now (`agn0k8co1`) does NOT have commit `2c14e5e` (captain ₹10 review cost removed). It is on `main` and on preview `9zv80xsgd`; it goes live with the next production deploy.

---

## A. Free re-attempt goes back to the SAME rider (deck already says so)

**Why:** the rider who knows the area has the best chance of delivering; handing the order to another rider raises RTO (Gaurav).
Known counter-point, kept for Q&A: INSEAD WP 2024/13 finds fake remarks do more damage when the rider is familiar with the area. Gaurav chose same-rider anyway; the 24 h captain review, strikes and the parking-gap hold are the guard.

**Change (`src/domain/orders.ts`, `resolveExceptionFor`):**
- After `free_reattempt` or `strike`, give the order back to `st.attemptRiderId ?? st.riderId` (not `otherRider(...)`). Delete `otherRider` if nothing else uses it.
- Keep: `failedAttempts - 1` (it does not count against the cap), the order's arm, the 24 h auto default ("the captain did not decide").
- **Strike → that order's ₹15 is lost even when the same rider delivers it.** Today this held only because someone else delivered. Add the rider to the stop's `suspectRiderIds` on a strike, so `ledger.blockReason` returns "an earlier attempt by this rider on this order looked fake".
- A plain free re-attempt is already covered: his weak earlier attempt puts the ₹15 on the parking-gap hold for the captain.
- Feed text: "Free re-attempt for {awb}: {rider} tries again (knows the area); it does not count against the attempt cap".

**Tests to update (they expect another rider):** `scenarios.tier1.test.ts` scenario 3 (free re-attempt, "rider who delivers earns the bonus", "strike … gives a free re-attempt"), `captain.test.ts` "another rider who delivers the order is paid normally…", `review.fixes.test.ts` "another rider who delivers the order is paid normally". New expectations: same rider; after a free re-attempt the ₹15 waits for the captain (`review.state === 'waiting'`); after a strike it is `blocked` with the "earlier attempt by this rider" reason; audit stays green.

**Copy:** `pages/captain/CaptainQueue.tsx` button title ("The same rider tries again; …"), `pages/landing/content.ts` ("Another rider of the same arm takes the order…" → same rider), `reducer.ts:352` text if it applies, `types.ts:20` and `types.ts:352` comments.

---

## B. A "Call customer" option on the rider's task card (calls logged by the app)

**Why:** today the call count is a number the rider taps up inside the "Attempted" sheet, so it is self-reported. A call made from the app is logged by the app (as the Indian firm in the INSEAD paper does: it flags fake remarks from rider location and **call records**). It also helps delivery: the rider calls before reaching the door.

**Rules (demo-safe):** no real phone numbers, no `tel:` links. The sheet says "Calls go through Valmo's masked number (demo: no real call)".

**Domain:**
- New action `riderCall { orderId, answered: boolean }` (+ `at`). Only for a stop `out_for_delivery` held by that rider.
- Store on the stop: `callLog: readonly { simAt: number; answered: boolean }[]`. Emit `CALL_LOGGED { answered }` (add to `events.ts` schema). Feed: "{rider} called the customer for {awb}: answered / no answer".
- `riderAttempt`: `evidence.calls` = calls logged since the order last went out for delivery (from `callLog`), not a typed number.
- If the customer answered, offer the rider a quick note on the card ("Customer will be home after 6 pm") that shows on the card. Optional; skip if it grows the scope.

**UI:**
- `pages/rider/TaskCard.tsx`: a "Call" button next to Direction / Deliver, enabled while out for delivery; shows "2 calls · last 4:12 pm".
- New small `CallSheet` (same pattern as `AttemptSheet`): Answered / No answer / Cancel.
- `AttemptSheet.tsx`: the "Call customer" row becomes read-only "2 calls logged by the app" plus a "Call now" button that dispatches the same `riderCall`. GPS and wait stay as they are.
- Captain evidence card: "Calls: 2 (logged by the app)".
- i18n: EN and HI strings in `pages/rider/i18n.ts`.

**Live mode:** add `riderCall` to the action validation (`api/_lib/validate.ts`) and role rules (`src/domain/roles.ts`: rider only, own orders), then `node scripts/build-api.mjs`.

**Audit (`domain/audit.ts`):** one new check: "every attempt's call count matches the calls the app logged" (`ATTEMPT_LOGGED.calls ≤ CALL_LOGGED` for that order since dispatch).

**Autopilot:** `domain/autopilot.ts` should log calls through `riderCall` so the simulated day still produces 2+ calls on genuine attempts.

---

## C. Landing page: remove the eyebrow line and the three chips

Remove from `pages/landing/Hero.tsx`:
- line 20: `Team GPS · IIT Bombay · Meesho DICE 3.0` (the eyebrow)
- lines 33–37: the chips "About 6 minutes", "No sign-in", "Synthetic data, not an official Valmo app"

**Must keep a disclaimer:** the landing page does NOT render `ui/Footer.tsx`. Today the third chip is its only "not an official Valmo app" line. Add `<Footer />` to `pages/Landing.tsx` (the footer comment says it is required on every screen) so the disclaimer and team credit stay on the page.

Clean-up: delete the `.land-eyebrow` and `.land-chips` rules in `pages/landing/landing.css` if nothing else uses them; update any landing test that looks for the chips (`Landing.test.tsx`, `content.test.ts`).

---

## Order, checks and deploy

1. Branch from `main`. Tests first for A and B (red), then code (green).
2. Gate: `npx vitest run --maxWorkers=4 && npx tsc -b && npx oxlint && npm run build`, then `node scripts/build-api.mjs`.
3. Local check in the browser (Demo mode, Lucknow): captain "Free re-attempt" → same rider gets the order; rider "Call" → count shows on the card and in the Attempted sheet; captain card shows app-logged calls; `/audit` all green; landing has no eyebrow/chips and does show the footer disclaimer; no console errors; 375 px width.
4. Commit (conventional commits, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), push, `npx vercel deploy` (preview).
5. **Production only after Gaurav says "go prod"**: `npx vercel deploy --prod --yes`. This also ships `2c14e5e` (no captain ₹10).
6. After prod: retake the slide 6 captain screenshot if the card changed (calls line), log the session in `work/R2-HANDOVER.md`, `work/NEXT-SESSION.md`, `00-MASTER.md`.

**Out of scope:** mocked-GPS detection (deck says "planned"), real calling, any change to Live-mode keys (Gaurav sets `CAPTAIN_KEY` / `LIVE_KEY` himself; never print or create keys).

---

## Prompt for the next session

```
Read Meesho DICE/00-MASTER.md, then work/NEXT-SESSION.md, then work/32-prototype-plan-calling-landing.md.
Implement plan 32 in prototype/ in this order: A (free re-attempt goes back to the same rider; a strike still loses
that order's ₹15), B (a "Call customer" option on the rider's task card, calls logged by the app and used as attempt
evidence, plus the audit check, Live-mode validation and EN/HI strings), C (remove the landing eyebrow line and the
three chips from Hero.tsx, and add the shared Footer to the landing page so the "not an official Valmo app"
disclaimer stays). Write the failing tests first, then the code. Run the full gate, check it locally in the browser
(Demo mode, Lucknow) including /audit, then commit, push and make a preview deploy. Do NOT deploy to production until
I say "go prod". No real phone numbers or tel: links. Log the session in R2-HANDOVER, NEXT-SESSION and 00-MASTER.
```
