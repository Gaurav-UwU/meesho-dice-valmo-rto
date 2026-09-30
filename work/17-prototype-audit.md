# 17 — Prototype audit (1 Oct 2026)

A read of `prototype/` after Tier 0, Tier 1 and the page redesigns, with measurements. Nothing was changed; this is a list of suggested changes, most important first. Each item says what is wrong, how it was checked, why it matters, the change, and a rough effort.

**Overall:** the core is in good shape. The day is a pure, deterministic reducer; the lifecycle, ledger, Router and verdict are unit-tested (633 tests, ~98% line coverage on engine/domain/api); all 15 scenarios pass; the Audit tab is green after Autopilot + Close pilot. The problems below are mostly at the edges: Live mode, one guardrail that cannot fire, process, and polish.

---

## Must fix before the Fri 3 pm freeze

### 1. Live mode: "Close pilot" messages real phones and answers for real customers
- **What:** in Live mode, the `closePilot` action runs the bots on every open order, including orders tied to a real WhatsApp number. `runAutopilot` in `api/_lib/core.ts` deliberately skips those orders; `closePilot` (`src/domain/close.ts`) has no skip list.
- **Checked:** a throwaway test with the real API harness: bind a phone to a flagged order, send `closePilot`. The phone was sent **"Your Meesho delivery OTP is 0000"** and a "Failed Delivery" message, and the bots answered the "did the rider reach you?" check on that customer's behalf (order ended `delivered_a2`).
- **Why it matters:** it breaks two rules the Live API was built around: real phones never get the bots' fixed test OTP, and only the customer can answer for their own order (otherwise a rider could confirm their own fake attempt). Only Twilio's trial block stops it today.
- **Change:** give `closePilot` the same `skip` set as autopilot (pass bound order ids from `core.ts`, as `runAutopilot` does), or refuse `closePilot` in `runAction` when the hub has any binding. Add a core test.
- **Effort:** 30 min.

### 2. The fake-attempt guardrail can never trip on Ops
- **What:** the verdict's false-attempt reading (`src/domain/verdictData.ts`) counts only **strikes** (Ops pressing Strike). A disputed attempt that nobody reviews auto-resolves after 24 h as a free re-attempt, with no strike.
- **Checked:** 10 closed 600-order days: 688 attempts, 30 low-confidence exceptions (4.4%, the bots fake about 4%), **all 30 auto-resolved, 0 strikes, guardrail reading 0.0%**.
- **Why it matters:** the page says "Fake attempts: above 5% breaks the guardrail", but in practice the reading is 0 unless a person clicks Strike. A guardrail that cannot fire is worse than none: it looks like a control. The `/pilot` slider's help text ("confirmed fake by the WhatsApp check") also describes a different measure from the one Ops computes.
- **Change:** measure what the check actually detects: **suspected fake rate = low-confidence attempts ÷ attempts** (GPS over 500 m, or the customer says "never came"). Keep confirmed strikes as a separate, stricter number for the rider block. Label both. Update the `/pilot` help line to match.
- **Effort:** 30–45 min with tests.

### 3. No version control, and deploys are not gated
- **What:** neither `Meesho DICE/` nor `prototype/` is a git repository. Deploys are a manual chain of commands.
- **Checked:** no `.git` folder. On 1 Oct a deploy went out while a test file was failing, because the commands were chained with `;` rather than `&&` (the app code was fine; it was caught right after).
- **Why it matters:** two days before submission there is no way to see what changed or roll back a bad edit, other than scratchpad copies. The folder is also inside OneDrive, which syncs `node_modules` and can conflict mid-write.
- **Change:** `git init` in `prototype/` with a `.gitignore` (node_modules, dist, coverage, .env*), commit the current state as the baseline. Add one script, `npm run ship` = `vitest run && tsc -b && oxlint && vite build && node scripts/build-api.mjs && vercel deploy --prod`, joined with `&&` so nothing deploys unless everything passes.
- **Effort:** 15 min.

### 4. The README contradicts the product
- **What:** `prototype/README.md` still says "move the uplift slider: 12 = GO" (it is RE-PRICE now), has no `/audit` route, and its demo steps predate the clock, exceptions and the new landing walkthrough. `CONTEXT.md` still lists "local disposal" as a Router lane (it is not built).
- **Why it matters:** a judge or teammate who reads the README before clicking will see the product disagree with it.
- **Change:** point the README's demo section at the landing page walkthrough, add `/audit`, fix the uplift line (12 = RE-PRICE at the top 20%, GO at the top 10% or at +20). Fix the Router line in `CONTEXT.md`.
- **Effort:** 20 min.

---

## Should fix (clear value, low risk)

### 5. Dragging a slider on `/pilot` stutters
- **Checked:** one recompute of the page takes **75–95 ms**, mostly the "run 300 times" odds (300 full simulations). A slider drag fires this on every pixel.
- **Why:** it feels laggy on a laptop and worse on a phone (the responsiveness target is under about 100–200 ms per interaction).
- **Change:** use React's `useDeferredValue` for the controls (the slider stays smooth, results catch up), or compute the odds only when the drag ends. No maths change.
- **Effort:** 20–30 min.

### 6. The rider app's Hindi toggle stops at the new sheets
- **What:** the rider app has an English/Hindi switch, but the new "proof at the door" sheet and the "Why is the customer refusing?" sheet are English only.
- **Why:** switching to Hindi gives a half-translated flow, on the screen that talks to riders.
- **Change:** move their strings into `src/pages/rider/i18n.ts` with Hindi versions.
- **Effort:** 30 min.

### 7. The Ops card mixes two bases mid-day
- **What:** the verdict uses orders with a final outcome; the bars and the "caused X extra deliveries" headline use "attempted so far". Mid-day the card can say INCOMPLETE next to "The bonus caused 6 extra deliveries". It is tagged Provisional, but it is the same trap `/pilot`'s new Ops-day card now avoids (it shows a progress bar until 90% final).
- **Change:** on the Ops card, show the progress bar instead of the headline until the day is decision-grade, as on `/pilot`.
- **Effort:** 15 min.

### 8. The case-pack rupees are typed in several places
- **What:** ₹120 is defined in four files (`economics.ts`, `verdict.ts`, `lifecycle.ts`, `helpers.ts`) and ₹21 in three.
- **Why:** if a number changes (the deck teammate has already had to fix figures), some screens would move and others not, and the Audit would not notice because each part is internally consistent.
- **Change:** one `src/engine/casePack.ts` with the data-pack numbers (₹50, ₹120, ₹21, ₹145, ₹8, 17%, 763.5 mn), imported everywhere. The tests already pin the outputs, so this is safe.
- **Effort:** 45 min.

### 9. The Ops day always flags the top 20%
- **What:** `/pilot` can now target the top 10–30%, but the Ops day (and so the "Check today's Ops day" card) always uses 20%.
- **Change:** the quick fix is a line on the card ("Ops days flag the top 20%"). The full fix carries the share into the day's config, so it is part of the planned rule.
- **Effort:** 5 min (label) or 1 h (config).

---

## Nice to have

### 10. Dead code
Exported but unused outside tests: `ModeBadge`, `emitOrder`, `MAX_ATTEMPTS` (duplicates `DayConfig.maxAttempts`), `isTargetShare`, `suspectStops`, `riderNeedsReview`, `summariseDay`, `routerNetPerHeldParcel`, `isSoftReason`, `openExceptions`. Remove them, or use the ones that still earn a place (for example `riderNeedsReview` could drive a "needs review" chip on the roster). Less to read, less to keep in sync. 20 min.

### 11. Twelve copies of small number formatters
`signed`, `fmt`, `num`, `rs` / `rupees` are redefined in 12 files, with small differences in how minus signs and decimals look. Move them into `src/ui/format.ts`. 30 min.

### 12. State size
A closed day is **836 KB** and about 3,000 events (a fresh day is 333 KB). Demo mode keeps up to four hubs in local storage (about 3.3 MB, close to Safari's 5 MB). If storage fills, the page keeps working but other tabs stop syncing. In Live mode, each tap would rewrite the whole 836 KB row and push it to every screen. Fine for the demo; if Live is revived, keep events in their own table or send only new events.

### 13. Site security headers
`vercel.json` sets `nosniff`, `Referrer-Policy` and `Permissions-Policy`, but no Content-Security-Policy and no `frame-ancestors`, so the console can be embedded in another site (click-jacking). Add `Content-Security-Policy: frame-ancestors 'none'` at least. 10 min.

### 14. Accessibility leftovers
The rider bottom sheets move focus in but do not trap it (from the 29 Sep audit, still true). The "Who gets the bonus?" choice is a radio group without arrow-key movement. Both are small fixes.

### 15. Evidence comes from the browser
GPS distance, calls and wait time are simulated and sent by the rider's screen. Live validation caps the values, but a rider could send "50 m, 3 calls" from anywhere. That is fine for a prototype, but the deck and Live docs should say that in production these come from the device and the call logs, not from the app's form.

---

## Checked and fine
- OTPs: expiry on both clocks, guesses carried over, never usable after the order moves on, hashed in Live storage.
- Every order ends in exactly one final state; nothing is delivered without a verified OTP; the ledger reconciles with the events (the Audit checks all of these).
- Speed of the Ops screens: one Step +50 takes about 37 ms; all Ops selectors take 15 ms on a running day and 37 ms on a closed day; Close pilot takes about 240 ms.
- The layout has no horizontal scroll at 375 px on `/` and `/pilot`.

## Suggested order
1, 3 and 4 today (together about 1 h); then 2, 5, 7 (about 1.5 h); the rest only if time is left before the Fri 3 pm freeze.
