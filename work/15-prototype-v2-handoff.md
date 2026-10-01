# 15 — Prototype v2 handoff: from demo to a defensible experiment

**Written 30 Sep 2026.** It merges the suggested "Valmo Rescue Console: final prototype plan" with what the code actually does today (read directly from `prototype/`).
**Code:** `C:\Users\gaura\OneDrive\Desktop\Meesho DICE\prototype\` · **Live:** https://valmo-rescue-console.vercel.app · **Tests:** Vitest, ~337 today.
**Deadlines:** mentor call **Thu 1 Oct, 3:30 pm** · **freeze Fri 2 Oct, 3 pm** (video + screenshots) · submit **Sat 3 Oct**.
**Live WhatsApp is out** (Twilio trial error 21654). **Demo mode is the product.** Keep Live mode compiling, but don't invest in it.

## Paste this into the new session
> Read `C:\Users\gaura\OneDrive\Desktop\Meesho DICE\00-MASTER.md`, then `work/15-prototype-v2-handoff.md`. We're changing the prototype in `prototype/` per this handoff. Start with Tier 0 (§6). Engine and reducer changes are test-first. Don't break the deployed demo; deploy only when tests, `tsc -b`, `oxlint` and `vite build` are clean. Ask me before cutting anything on the "never cut" list.

---

## 1. What the prototype must show (the purpose)
Three things, **never blended into one score**:
1. **Risk:** will this order fail? This is the **Rescue Score**, a *risk* flag.
2. **Intervention:** can we change the outcome? This is the **pilot**. The Control arm answers "would it have happened anyway?"
3. **Economics:** is changing it worth paying for? This is the **P&L**.

One chain has to be visible from one event log:
**flagged → intervention → actual outcome → incremental rescue → intervention cost → RTO cost avoided → net value**

- **Incremental rescues** = (Bonus-arm delivery rate − Control-arm delivery rate) × flagged Bonus-arm orders.
- **Headline:** *"The bonus caused **X** extra deliveries at **₹Y**, avoiding **₹Z** of RTO cost (net **₹N**)."*
- **Never** a headline like "85% of risky orders delivered". That mixes selection with effect.

## 2. Frozen decisions (don't reopen)
- **Rescue Score keeps its name** and stays a *risk* flag. Rescuability is learned **after** the pilot, from which risk drivers respond to the bonus.
- **The top-20% flag is fixed during the pilot.** Customer replies change the *outcome probability*, never the flag.
- **₹15 is a pilot assumption.**
- **Two attempts max** (config). Another attempt happens only if its expected recovery beats its cost: `P(success next) × ₹120 − ₹21 > 0`.
- **Not building:** difficulty pricing, a second model, extra dashboards, extra WhatsApp flows, a dynamic top-X, Live WhatsApp.
- **Top drivers per flagged order already exist** (`explainScore` → ScoreBars in `ops/OrderPanel.tsx`). Keep them **ops-only**; the rider never sees the score or drivers.

## 3. What the code does today (verified by reading it)
| Area | Today | Problem |
|---|---|---|
| States | `StopStatus = pending \| otp_sent \| delivered \| attempted \| refused \| rescheduled`; parcels `queued \| second_chance_sent \| recovered \| held \| rehomed \| batched`. Ad hoc guards in `domain/reducer.ts`; no transition table | **Only one attempt**: an `attempted` stop can never be delivered. No terminal-state concept |
| Denominator | `kpis()` in `domain/selectors.ts` counts only delivered/attempted/refused | **Rescheduled stops vanish from both arms.** An accepted second chance flips `refused → rescheduled`, **erasing the failure**. Arm is read from the *current* rider |
| Event log | `feed: FeedEvent[]` free text, capped at 300; pilot/ledger never read it | No audit trail |
| Ledger | `LedgerEntry {status: pending \| blocked}`, created in `completeDelivery` | No release, return window, clawback, COD reconciliation, cap or floor. `bonusBlocked` effectively never fires |
| Pilot | `engine/pilot.ts`: per-*order* binomial, naive Wald CI, `THRESHOLDS {go: 9, rePrice: 3}` on the **point estimate**; only guardrail = normal-order drop | Overstated power; GO has no margin; no INCOMPLETE; no rule lock |
| Router | `engine/router.ts`: first lane whose boolean gates pass; fixed ₹ ranges | No EV, no timers (48h is text), match always succeeds, **savings never booked** |
| Attempts | Rider picks a reason code; the WhatsApp "did the rider reach you?" check gives verified/suspect | No GPS/calls/wait; `SuspectQueue.tsx` is read-only; `riderNeedsReview` is unwired |
| Customer replies | "I'm home" does nothing; "change time" → `rescheduled` and never comes back; Pay-now halves pRto with **no payment step** | — |
| Clock | `Date.now()`, single day; Step +50 / Autopilot | No timers are possible |
| Audit | A dead "Audit" item in `pages/desk/DeskDrawer.tsx` | — |

---

## 4. The four frozen specs (implement these first)

### A. State machine (`src/domain/lifecycle.ts`, new)
**Open:** `scored` · `out_for_delivery` (sub-state `otp_sent`) · `ndr` · `rescheduled` · `refused`
**Terminal:** `delivered_a1` · `delivered_a2` · `rehomed` · `rto` · `cancelled`

| From | To | Trigger |
|---|---|---|
| scored | out_for_delivery | day dispatch |
| scored | cancelled | customer cancels before dispatch |
| out_for_delivery | otp_sent | rider requests OTP |
| out_for_delivery / otp_sent | ndr | attempt logged (not home / unreachable / address) |
| out_for_delivery / otp_sent | refused | refusal OTP verified |
| out_for_delivery | rescheduled | customer "change time" before the attempt |
| otp_sent | delivered_a1 / delivered_a2 | delivery OTP verified (by `attempt` number) |
| otp_sent | out_for_delivery | OTP expired |
| ndr | out_for_delivery | re-attempt: `attempt < maxAttempts` **and** EV > cost; or a free re-attempt from the exception queue |
| ndr | rescheduled | customer picks a time |
| ndr | rto | attempts exhausted or EV ≤ cost |
| rescheduled | out_for_delivery | the scheduled sim time arrives |
| rescheduled | rto | reschedule cap exceeded |
| refused | out_for_delivery | second chance accepted (counts as attempt 2) |
| refused | rehomed | the re-homed buyer's new order is **delivered** |
| refused | rto | router ends in batched return (incl. a failed re-home) |

- `transition(order, to, reason)` rejects anything not in the table. State is unchanged and it's counted as `rejectedTransitions` for Audit.
- **Every order ends in exactly one terminal state.**
- **Arm is stamped on the order at dispatch** (`order.arm`, `order.originalRiderId`) and never recomputed. A re-attempt by another rider keeps the original arm.
- **Denominator = all flagged orders in the arm.** The success rate uses terminal orders; open orders are shown separately.

### B. Event schema (`src/domain/events.ts`, new)
`DomainEvent = { seq, simAt, wallAt, type, orderId?, riderId?, arm?, data }`, append-only in `DayState.events` (uncapped).

`emit()` **throws on an unknown type or a missing required field**. The old `feed` becomes a text view derived from events.

| Group | Event types (required `data` fields) |
|---|---|
| Setup | `DAY_PLANNED {ruleHash, config}` · `RULE_CHANGED {newHash}` · `CLOCK_ADVANCED {from, to}` |
| Order | `ORDER_SCORED {score, flagged}` · `ORDER_DISPATCHED {riderId, arm, attempt}` · `ORDER_TERMINAL {status}` · `TRANSITION_REJECTED {from, to}` |
| Customer | `MSG_SENT {template}` · `CUSTOMER_REPLIED {reply}` · `NO_REPLY_TIMEOUT {}` · `PAYMENT_ATTEMPTED {ok}` |
| Delivery | `OTP_REQUESTED {purpose}` · `OTP_VERIFIED {purpose}` · `OTP_FAILED {}` · `DELIVERED {attempt}` · `RESCHEDULED {toSimAt}` · `REFUSED {reason}` |
| Evidence | `ATTEMPT_LOGGED {reason, gpsDistM, calls, waitMin, confidence}` · `ATTEMPT_CHECK_ANSWERED {reached}` · `EXCEPTION_OPENED {confidence}` · `EXCEPTION_RESOLVED {action, auto}` · `STRIKE {riderId}` |
| Router | `ROUTER_LANE {lane, ev, inputs}` · `SECOND_CHANCE_SENT/ACCEPTED/EXPIRED` · `HELD {}` · `MATCHED {newOrderId}` · `HOLD_EXPIRED` · `REHOME_DELIVERED` · `REHOME_FAILED` · `BATCHED {batchId}` |
| Money | `BONUS_ACCRUED/PENDING/RELEASED/CLAWED_BACK/BLOCKED {amount, reason?}` · `COD_RECONCILED {riderId, amount}` · `RETURN_OPENED {}` · `COST_BOOKED {line, amount, owner, stream}` · `SAVING_BOOKED {line, amount}` |

Ops, Pilot (for the live day), Ledger and Audit read **events + terminal states**, never ad hoc stop fields.

### C. Ledger (`src/domain/ledger.ts`, new)
**Bonus lifecycle:** `accrued → pending → released`, or `→ clawed_back`, or `blocked`.

| Step | Rule |
|---|---|
| accrued | `DELIVERED` on a **flagged** order whose **original arm is Bonus**. Also on `delivered_a2` if attempt 1 wasn't confirmed fake |
| accrued → pending | Prepaid: immediately (OTP). **COD: only after `COD_RECONCILED`** (end of sim day auto, or a hub button) |
| pending → released | `simNow ≥ deliveredAt + returnWindowDays (7)` and no return |
| → clawed_back | `RETURN_OPENED` inside the window |
| blocked (at accrual) | rider's daily bonus total ≥ **₹300 cap** · rider has **≥ 2 confirmed strikes** · rider below the **normal-order floor** (normal-order success < arm normal baseline − 3 pts, with ≥ 10 normal orders) · attempt 1 on this order confirmed fake |

**Cost ledger:** one line per cost, **all amounts marked "assumption" except the case-pack figures**.

| Line | ₹ | Owner | Trigger | Stream |
|---|---|---|---|---|
| Rescue bonus | 15 | Valmo | `BONUS_RELEASED` (accrued shown as a liability) | bonus |
| Exception review labour | 10 *(assumption)* | Valmo | `EXCEPTION_RESOLVED` | bonus |
| WhatsApp message | 0.50 *(assumption)* | Meesho | `MSG_SENT` | common |
| Re-attempt (last-mile leg) | 21 | Valmo | `ORDER_DISPATCHED` with attempt ≥ 2 | common |
| RTO reverse | 120 (batched: × 0.7, *assumption*) | Valmo | `ORDER_TERMINAL rto` | common |
| Hold on shelf (48h) | 8 | Valmo (hub) | `HELD` | router |
| Re-home local delivery | 21 | Valmo | re-home dispatch | router |

**Savings are booked only on a real delivery:**
- re-home delivered: +₹145
- second chance delivered: +₹120 − ₹21
- batched: ₹120 × 0.3

**Bonus "RTO avoided" is never per order.** It's incremental rescues × ₹120, from the Control comparison.

### D. Decision rules (`src/engine/verdict.ts`, new; shared by /pilot and the Ops arm card)
```
config = { bonus:15, reverse:120, riderFee:0 (conservative 18), killFloor:3,
           minTerminalShare:0.90, minRidersPerArm:6, alpha:0.05,
           guardrails:{ normalOrderDeltaPts:-1, returnsDeltaPts:+1, complaintsDeltaPts:+0.5,
                        onTimeDeltaPts:-2, falseAttemptRate:0.05 } }
ruleHash = FNV-1a(stableStringify(config))   // stamped in DAY_PLANNED

verdict(data, config, plannedHash):
  if hash(config) != plannedHash            -> INVALID   ("rule changed after planning")
  if terminalShare < .90 or ridersPerArm<6  -> INCOMPLETE
  if any guardrail breached                 -> KILL (name the guardrail)
  if upliftPer100 < killFloor               -> KILL
  BE = bonus × controlRate%/(reverse − riderFee − bonus)   // 8.6 case / 10.3 conservative at 60%
  if CI95.lower ≥ BE                        -> GO (caveat if lower < conservative BE)
  else                                      -> RE-PRICE
```
- **Cluster-robust CI (unit = rider).**
  - For each arm with riders i = 1..G: p = Σyᵢ/Σnᵢ.
  - Var(p) = G/(G−1) × Σ(yᵢ − p·nᵢ)² / (Σnᵢ)².
  - SE = √(Var_B + Var_C). CI = diff ± t(0.975, G_B+G_C−2) × SE.
  - Also compute the naive CI (scenario 15 checks that clustered ≥ naive).
- **MDE line:** MDE per 100 = (1.96 + 0.84) × √(p(1−p)(1/n_B + 1/n_C) × DEFF) × 100, with DEFF = 1 + (m̄ − 1) × ICC (estimated; fall back to 0.05). Show: *"Smallest effect this pilot could detect: X per 100."*
- **/pilot simulator changes:**
  - Randomise **riders**, **paired by route difficulty** (mean pRto of the bag) before a coin flip within each pair.
  - Riders get a random effect (logit shift ~ N(0, 0.3)).
  - Guardrail signals (returns, complaints, on-time) are simulated with their own sliders.
  - Default uplift no longer guarantees GO. Show P(GO) honestly.
- **Prominent disclaimer on /pilot:** *"The link ₹15 → rider effort (calls, wait) → delivery is **assumed, not measured**. This simulator shows how the decision would be made, not evidence that it works."*
- **Ops arm card:** the same `verdict()` on today's events. It will usually say **INCOMPLETE**, which is honest and shows the rule working.

---

## 5. Behaviour changes on top of the specs
- **Clock:** `simNow` in `DayState`, starting day 1 at 08:00. Controls **+1 h · +1 day · Close pilot** (advance past all windows). A `tick` action fires timers: OTP expiry, no-reply, 24h second chance, 48h hold, 24h exception default, 7-day return window, next-day reschedule, end-of-day COD reconciliation. Autopilot uses sim time.
- **Customer replies:** these change the outcome probability, never the flag. All multipliers are labelled assumptions.
  - **I'm home:** pRto logit −0.3.
  - **No reply** 2 sim-hours before dispatch: logit +0.2.
  - **Change time:** `rescheduled` to the chosen slot next day, and it **stays in the denominator**.
  - **Fix address:** as today.
  - **Pay now:** requires `PAYMENT_ATTEMPTED {ok}` (Demo: success/fail buttons). Success → prepaid risk. Failure → **stays COD**.
  - **Contact cap:** 4 non-OTP messages per order; the 5th is rejected.
- **Evidence:**
  - The rider flow logs "I'm at the door" (simulated GPS distance: genuine 30–150 m; the demo "fake" path > 500 m), call count (Call button), and a wait timer.
  - **Attempt confidence:**
    - High = GPS ≤ 200 m, ≥ 2 calls and ≥ 5 min wait, with no customer contradiction.
    - Low = GPS > 500 m, or the customer answers "rider didn't come".
    - Medium otherwise.
  - Low → `EXCEPTION_OPENED`. The Ops queue gets three buttons:
    - **Confirm valid:** normal NDR path.
    - **Free re-attempt:** by another **same-arm** rider; not counted against the attempt cap; the first rider isn't paid.
    - **Strike:** +1 strike, plus a free re-attempt.
  - Unresolved after 24 sim-hours → **auto free re-attempt**.
  - Add a per-rider fake-attempt rate column in the roster.
- **Router:**
  - **Refusal reason captured:** no cash · want it later · not home · changed mind · cheaper elsewhere · didn't order · damaged/wrong.
  - **EV waterfall, in order.** Take a lane if its gates pass and EV > 0:
    1. **Second chance:** P(accept | reason) × (₹120 − ₹21) − messages. P(accept) is an assumption (no cash 0.5, later 0.5, not home 0.4, changed mind 0.15, cheaper 0.1).
    2. **Hold & Re-home:** P(match in 48 h) = 1 − e^(−λ · 48h · conversion) × ₹145 − ₹8. λ is the SKU's synthetic demand rate in the catchment. Gates: unopened, seal, same state, seller opt-in (**never overridable**), invoice outside, **shelf capacity 30**, a rider with bag space.
    3. **Batched return.**
  - **Timers:** second chance 24 h → expired → next lane. Hold 48 h → expired → batched.
  - Parameters are editable on the Desk, marked "assumption".
  - A **re-homed parcel becomes a real new order in its own `rehome` cohort**, kept out of pilot metrics and the headline and shown separately. If that new order fails → the original is batched, **no saving booked**.
- **Audit tab** (make the Desk drawer's "Audit" real, and link it from Ops). Each check is green or red:
  1. Orders = terminal + open
  2. Every order has exactly one terminal state (or is open)
  3. Zero rejected transitions (or listed)
  4. Ledger total = the ₹ shown on every screen
  5. Every RTO has a cost owner
  6. No timer overdue
  7. Rule hash unchanged since `DAY_PLANNED`
  8. Nothing delivered without a verified OTP
  9. Every bonus is on a flagged Bonus-arm order
  10. No re-home order in pilot metrics
- **Honesty text:**
  - Landing "Real vs simulated": WhatsApp = *"built; sending blocked by Twilio's trial; Demo mode shows it on screen"*.
  - Numbers = *"case data pack + labelled assumptions"* (not "nothing simulated").
  - "Legal review" → *"desk research"*.
  - The Pilot intro says riders are randomised (true after this change).
  - Add the headline card on Ops + Pilot.

## 6. Build order (tiers)
| Tier | When | Work | Exit check |
|---|---|---|---|
| **0** | Now → **Thu 1 Oct noon** | (a) Spec A: lifecycle + attempt 2 + arm stamped at dispatch + denominator fix. (b) Spec D: `verdict.ts` (INVALID / INCOMPLETE / KILL / GO / RE-PRICE, hash, clustered CI, MDE) wired into /pilot + the Ops arm card; simulator randomises paired riders. (c) Headline card + mediation disclaimer + honesty text. **Deploy.** | Scenarios 2, 4, 5, 13, 14, 15 pass; the demo still runs end to end for the 3:30 pm call |
| **1** | Thu evening → **Fri noon** | Clock + `tick`; Spec B events (+ derived feed); Spec C ledger + cost lines; customer replies + pay-now + contact cap; evidence + exception queue; Router EV + timers + booking + `rehome` cohort; Audit tab | All 15 scenarios pass; Audit green after Autopilot + Close pilot |
| **Freeze** | **Fri 2 Oct, 3 pm** | Deploy; screenshots for deck slides 4 and 6; QR; **90 s video in Demo mode** | — |

**Cut first if late (in this order):**
1. complaints / on-time guardrails (keep them simulated only in /pilot)
2. rider bag-capacity gate
3. per-rider fake-rate column
4. cost-owner detail (keep amounts)
5. the full SKU-matching engine (from `R2-HANDOVER.md`)
6. a `/demo` guided page
7. a11y beyond focus + contrast basics

**Never cut:** the attempt-2 + denominator fix · the verdict module · the headline reframe · bonus clawback · Router timers + booked savings.

**Expect breakage:** `reducer.test.ts` (44 tests) and `selectors` tests assume the old statuses. Update them; don't delete coverage. `api/_lib/core.ts` uses the reducer, so keep Live mode compiling.

## 7. Definition of done: 15 scenario tests (`src/domain/scenarios.test.ts`)
1. A flagged Bonus-arm delivery accrues ₹15 → pending → **released** at window close.
2. The same order in Control → **no bonus**.
3. A fake attempt (GPS > 500 m / customer "didn't come") → exception → **free re-attempt by another same-arm rider**.
4. A genuine not-home → **attempt-2 delivery**, counted to the **original arm**.
5. "Change time" → next-day attempt; the order **stays in the denominator**.
6. A soft refusal → second chance accepted → delivered; the saving **books at delivery**.
7. A second chance with no reply → **expires at 24 h** → next lane.
8. A hard refusal with all gates → held → matched → new order delivered (saving booked). Variant: the new order fails → batched, **no saving**.
9. A hold with no match after **48 h** → batched.
10. Seller not opted in → the hold lane **cannot be forced**.
11. A return inside the window → bonus **clawed back**.
12. A failed Pay-now → the order **stays COD**.
13. Changing the decision rule after `DAY_PLANNED` → verdict **INVALID**.
14. A guardrail breach → **KILL** even with a strong uplift.
15. On the same data, the **cluster-robust CI is wider** than the naive one.

Plus: Audit all green at the end of a full Autopilot day + Close pilot.

## 8. Team decisions (defaults used; confirm or change)
| Decision | Default |
|---|---|
| Bonus on an attempt-2 delivery? | **Yes (CONFIRMED by Gaurav on 2 Oct: the bonus is paid on a delivery at any attempt)**, unless attempt 1 was confirmed fake (then the delivering same-arm rider gets it and the first rider gets a strike) |
| Return window | 7 simulated days |
| Contact cap | 4 non-OTP messages per order |
| Guardrails | normal-order ≥ control −1 pt · returns ≤ control +1 pt · complaints ≤ control +0.5 pt · on-time ≥ control −2 pts · false-attempt rate ≤ 5% |
| Blocks | ₹300/day cap · 2 strikes · normal-order floor −3 pts |
| GO basis | Case break-even 8.6 decides; conservative 10.3 is shown as a caveat |

## 9. Deck changes this causes → send to the deck teammate (also in `work/16-deck-changes-prototype-v2.md`)
See that file.

## 10. Mentor call (Thu 1 Oct, 3:30 pm): what to show
The Tier-0 build: flag → rider → OTP → ₹15 pending; a reschedule staying in the denominator; the /pilot verdict with the clustered CI + MDE + disclaimer; the Desk.
Questions are in `NEXT-SESSION.md`. Add: *"Is a rider-randomised pilot with a cluster-robust CI the right bar for GO, or would Valmo accept a simpler rule?"*
