# 08 — Prototype spec v3: "Valmo Rescue Console" (updated 2026-09-29; supersedes v2 of 2026-09-27)

> **Status:** planned, **not built.** Waiting for Gaurav's explicit "start" (see `00-MASTER.md` rule 3).
> **Fixed date:** Mentor Connect call is **Thu 1 Oct 2026, 3:30–4:00 pm IST** (cannot be rescheduled). The build order in §5 is shaped around it.

## What changed since v2 (27 Sep)
| # | Change | Why | Source |
|---|---|---|---|
| 1 | "Hub view" → **Valmo ops console** (`/ops`). The hub operator appears **only** in the **Refused-Parcel Desk** (`/desk`) | The flag is set centrally and Valmo pays the rider directly, so the hub isn't in the bonus flow | `R2-HANDOVER` Session 4 |
| 2 | Risk model → **Rescue Score** (TrustMesh stand-in + last-mile signals) | Layer on TrustMesh, don't rebuild it | `R2-HANDOVER` Session 3 |
| 3 | Router hub **Nashik → Lucknow (UP)**; the Router demo uses UP sellers | UP is the #1 seller state (15.87%); non-GST sellers are same-state by law | `13-refused-parcels.md` §3 |
| 4 | Router lanes → **Router v2**: Second chance · Hold & Re-home · Consolidated return. Local disposal is **not built** (shown as a greyed "later" chip) | Local disposal is legally grey (s.17(5)(h), C1) | `13` §3 |
| 5 | Customer WhatsApp adds a **post-failure check**: "Did the rider reach you? Did you ask to reschedule?" | Stops fake "attempted" marks being used to claim the bonus (Flipkart precedent) | `R2-HANDOVER` Session 4 |
| 6 | WhatsApp buttons become **✅ I'm home · 🕐 Change time · 📍 Fix address · 💳 Pay now (UPI)** (Pay now on flagged COD orders only) | Matches the P1/P2 levers and the post-order pay-now idea | `R2-HANDOVER` order-and-observe #1 |
| 7 | Routes renamed (`/hub`→`/ops`, `/router`→`/desk`); look follows the real Valmo apps | Each screen looks like the real thing it lives in | `12-prototype-theme.md` |
| 8 | **Build order re-cut around the mentor call.** Demo mode first, on a local store; Live (Supabase + Twilio) after the call | We need something clickable by 3:30 pm on 1 Oct | §5 |

## Context
Round 2 needs a **working prototype** alongside the 10-slide deck (`work/14-deck-handoff.md` is the deck source of truth). The prototype makes the deck's claims tangible:
- the **Rescue Bonus** (Rescue Score flag → rider app → confirmed delivery → ₹15 credited)
- the **Refused-Parcel Router** (second chance → Hold & Re-home → consolidated return)
- the two sharpened Prevent levers: **two-way WhatsApp** (P1) and **address confidence + fix before dispatch** (P2)
- the **pilot's GO / RE-PRICE / KILL** decision

Gaurav wants it as real as possible: every button works, real geography and case-pack data, real WhatsApp/OTP, real multi-device. The code lives **inside `Meesho DICE/prototype/`**. The only thing we can't make real is Meesho's order data, so orders are synthetic and **labelled as such everywhere**.

---

## 1. What is real vs simulated (put this on the landing page and in the deck footer)
| Layer | Real | Simulated |
|---|---|---|
| Geography | Real pincodes + lat/long (data.gov.in directory), real road distances (OSRM, cached), real OSM map tiles | Hub exact location (placed at a real locality centroid) |
| Numbers | Case data pack (80% COD, 20%/5% RTO, ₹50/₹120, distance curve 15/17/22%) and Shipway city factors | — |
| Orders & riders | — | Synthetic orders generated from those distributions (seeded) |
| **Rescue Score** | Transparent, rule-based, weights visible (Day 1 design). Inputs are the last-mile signals from R1 slide C: distance from hub, new/unclear address, phone reachability, past failed attempts, COD, order value | The **TrustMesh part is a labelled stand-in** (a logistic model calibrated to 17% RTO overall and ~40% in the top 20%). We never claim to be TrustMesh. After the pilot the score becomes an uplift model (slide only, not built) |
| Messaging | **Real WhatsApp** (Twilio Sandbox) to team phones: order-day message, OTP for delivery, refusal OTP, second-chance offer, shared-location address fix, post-failure check | Public **Demo mode**: a built-in customer phone panel stands in for WhatsApp so judges without the sandbox can click through |
| OTP | Real in Live mode: generated and hashed server-side, sent over WhatsApp, verified server-side, expires in 10 min | Demo mode shows the OTP on the emulated phone |
| Multi-device | **Real in Live mode:** ops laptop, rider phone and customer WhatsApp sync through Supabase Realtime | **Autopilot** bots deliver the other ~99% of synthetic stops so the numbers move |
| Pilot A/B | The decision engine is real code | Pilot outcomes are simulated (the pilot hasn't run yet) |
| Refused-Parcel Router | The lane rules and ₹ effects are real code from `13` | Which parcels are refused, seller opt-ins and seal checks are synthetic |

## 2. Stack and architecture
- **Frontend:** React + Vite + TypeScript, React Router, Leaflet (OSM tiles, attribution kept), Recharts. Mobile-first rider view, installable as a PWA.
- **Two storage adapters behind one interface** *(new in v3)*:
  - **`local`**: in-memory store, synced between browser tabs (BroadcastChannel). This is **Demo mode**, needs no accounts, and is what we build first and show at the mentor call.
  - **`supabase`**: Postgres + Realtime (free tier). This is **Live mode**, built after the call. The browser reads through the anon key under read-only RLS; **all writes go through `/api`** using the service key server-side only.
- **Backend (Live mode):** Vercel serverless functions in `/api`.
- **Messaging (Live mode):** Twilio WhatsApp Sandbox. Outbound via REST; inbound replies and shared locations via `/api/whatsapp/inbound`, which validates `X-Twilio-Signature` and stores latitude/longitude on arrival. SMS is skipped because it needs DLT registration (days).
  - **Open point to verify:** quick-reply *buttons* may need an approved template or the Content API. Sandbox fallback is numbered replies ("Reply 1 / 2 / 3 / 4"). Demo mode always renders real buttons.
- **Deploy:** Vercel CLI (Gaurav runs `vercel login` once; the Vercel MCP connector needs re-auth and isn't required).
- **Secrets:** `.env.local` + Vercel env vars, created **by Gaurav** (Twilio SID/token/sandbox number, Supabase URL/anon/service keys, `ADMIN_TOKEN`). Claude never enters keys. Ship `.env.example` and a `.gitignore`.

### The hero demo (~90 s)
1. **Ops console:** "Start day" scores the day's orders and marks the top 20% Bonus-Eligible.
2. **Customer WhatsApp:** the flagged customer gets Valmo's real "Arriving Today…" wording plus **✅ I'm home · 🕐 Change time · 📍 Fix address · 💳 Pay now (UPI)**. "Fix address" + a shared location moves the pin on the ops map and recomputes distance and the score.
3. **Rider phone:** the stop shows the green **"₹ +15 Bonus Eligible"** chip and never a score. Tap **Deliver** and the customer gets an OTP on WhatsApp.
4. **OTP:** the rider types it; the server verifies it and credits ₹15 to the ledger (status "pending until return window").
5. **Ops console** updates live (delivered, bonus paid, cost per successful delivery, Bonus vs Control).
6. **Failure branch:** on another stop the rider marks "Attempted, customer unavailable". The customer receives **"Did the rider reach you? Did you ask to reschedule?"** (Yes / No). A "No, the rider never came" answer flags the attempt as suspect on the ops console and blocks the bonus.
7. **Refusal branch:** a customer refuses. The refusal OTP goes out and the parcel lands on the **Refused-Parcel Desk** (Lucknow hub), which picks a lane and shows the ₹ effect.

## 3. Screens (routes)
| Route | Device | Looks like | What works |
|---|---|---|---|
| `/` | any | Team GPS palette (R1 deck: pink `#ED0B7D`, navy `#120A4A`) | Landing: what the prototype is, the real/simulated table, QR codes for rider and customer, Live/Demo switch, footer "Prototype by Team GPS (IIT Bombay) for Meesho DICE 3.0. Not an official Valmo app. Synthetic data." |
| `/ops` | laptop | Valmo Operations colours on a desktop layout | **Valmo ops console** (central team): hub picker; live map of today's orders (Bonus-Eligible in purple); KPIs (orders, Bonus-Eligible count, expected RTO, bonus budget, cost per successful delivery); rider roster with Bonus/Control arms; **suspect-attempt queue** (from the WhatsApp check); live event feed; "Start day" / "Autopilot" / "Reset" (admin). **No hub-operator workflow here.** |
| `/rider` | phone | Clone of **Valmo Pilot** "Today's Tasks" (Roboto, navy `#092D5E`, tabs Pending/Failed/Completed) | Pick a rider → bag of stops in route order, earnings card (base + pending bonus), EN/हिंदी toggle. Stop card: call (tel: link), WhatsApp status chip (confirmed / rescheduled / address fixed / pay-now), **Deliver → OTP**, **Attempted**, **Refused → refusal OTP**. **Control riders see no bonus chip.** Only addition to the real UI: the green chip and a Priority count that includes bonus orders |
| `/customer` | phone (Demo mode) | Real WhatsApp look, "Valmo ✓ Business account" | An emulated WhatsApp chat so anyone can drive the customer side without the sandbox. Uses Valmo's real wording |
| `/desk` | laptop/tablet | **Valmo Operations** style; a new drawer item **"Refused Parcel Desk"** just above the real "RTO Manifest" | **The only hub-operator screen.** Refused-parcel queue → each card shows AWB, lane chip, reason, ₹ effect. Actions: send second-chance WhatsApp · confirm seal check → Hold & Re-home match → new AWB · add to consolidated return. Day summary (₹ saved vs sending everything back). Lane 4 (local disposal) shown greyed as "later, pending legal review" |
| `/pilot` | laptop | Team GPS palette (Figtree) | A/B pilot simulator: inputs (share flagged, bonus by hub type, baseline success, true uplift, spillover, days) → Bonus vs Control per hub, uplift ± 95% CI, normal-order delta, **GO / RE-PRICE / KILL** (verdict colours: GO `#4FBF83`, RE-PRICE `#F5A623`, KILL `#ED0B7D`); P&L with break-even (**8.6** per 100 flagged on the data-pack basis / **10.3** conservative), scaled ₹ cr/yr, sensitivity heat table |

### Router v2 logic (from `13-refused-parcels.md` §3; each parcel takes the **first lane it qualifies for**)
| Lane | Gate in the prototype | ₹ effect shown |
|---|---|---|
| **1. Second chance** | Soft refusal (not home, no cash, "later") + customer confirms on WhatsApp: reschedule · pick up at hub · alternate address **in the same state** · pay now by UPI | Saves the sale + the ₹120 return; costs one ₹21 re-attempt |
| **2. Hold & Re-home** | Unopened + seal check ok · **seller state = hub state = buyer state** · seller **opted in for that SKU** · invoice in an outside pouch or digital · SKU has near-term demand in the catchment. **Non-GST sellers are the default pool**, then registered sellers in the hub's state | Saves **~₹145** per match, costs **~₹8** to hold 48h, **break-even 5.5%** match rate |
| **3. Consolidated return** | Everything else | Batching by seller/region: **up to 20–40% off** the reverse cost (benchmarks; India unmeasured, so labelled "to be measured in the pilot") |
| 4. Local disposal | **Not built.** Greyed chip only | Deferred |

Router demo data: **Lucknow hub, UP sellers, mostly non-GST**. Also show the guard working: a parcel from an out-of-state seller is routed to lane 3 and the reason says "different state".

### 4 pilot hubs (2 metro + 2 small-town, per D11)
- Mumbai–Powai (MH), metro. Near where the field research was done.
- Bengaluru–Whitefield (KA), metro.
- **Lucknow (UP), tier-2.** *(replaces Nashik)* The Router hub.
- Gaya (BR), small-town. High-RTO geography ("India isn't one market").

## 4. Code layout (`C:\Users\gaura\OneDrive\Desktop\Meesho DICE\prototype\`)
```
prototype/
  src/engine/        # pure, unit-tested logic (no I/O)
    rescue.ts        # Rescue Score: TrustMesh stand-in + last-mile signals, calibration (17% overall, ~40% top-20%)
    distance.ts      # data-pack distance curve 15/17/22% + interpolation
    economics.ts     # bonus P&L, break-even 8.6/10.3, sensitivity, ₹cr scaling, cost per successful delivery
    pilot.ts         # A/B simulation, CI, Pilot Verdict rules (D16)
    router.ts        # Router v2 lanes 1-3, gates, per-lane ₹ (lane 4 stub)
    attempts.ts      # post-failure check: "Did the rider reach you?" -> suspect flag, bonus block
    generate.ts      # seeded synthetic orders/riders/refused parcels from real pincodes
  src/store/         # one interface, two adapters: local.ts (Demo) and supabase.ts (Live)
  src/pages/         # Landing, Ops, Rider, Customer, Desk, Pilot
  src/lib/           # i18n (EN/HI), api client
  api/               # Vercel functions (Live): day/start, order/[id]/deliver, otp/send, otp/verify,
                     # order/[id]/attempt, order/[id]/refuse, desk/act, whatsapp/inbound (webhook), admin/reset
  scripts/           # build-geo.ts: pincodes CSV -> trimmed JSON; OSRM distances -> cached JSON
  data/              # pincodes-<hub>.json, distances-<hub>.json (committed, small)
  supabase/schema.sql# hubs, riders, orders, events, otps, bonus_ledger, refused_parcels, messages, attempt_checks
  tests/             # vitest unit tests for engine + api handlers; one Playwright e2e (demo mode)
```
Customer messages are in English with a Hindi line. Sandbox rules: free-form text only within 24h of the customer's last message; otherwise use approved "order notification" / "verification code" templates.

## 5. Build order (re-cut around the mentor call)
Ground rule: **nothing starts until Gaurav says "start".** This is a proposal.

| When | Work | Exit check |
|---|---|---|
| **Wed 30 Sep** (start) | Confirm/clean the scaffold. **TDD the engine first** (rescue, distance, economics, pilot, router, attempts) at ≥80% coverage. `build-geo` for the 4 hubs. `local` store + generator. Ops console + rider phone frame + customer emulator on the `local` adapter | `npm test` green; calibration hits 17% ±0.5 and top-20% ~40%; "Start day" flags orders on a map |
| **Thu 1 Oct, before 3:30 pm** | Close the **Demo-mode hero loop**: flag → customer buttons → rider chip → OTP → ₹15 → ops updates live. Add the **Refused-Parcel Desk** if time allows. Screenshots + the wireframe fallback ready | One clickable flow on a laptop. **Mentor call 3:30–4:00 pm** |
| Thu 1 Oct, after the call | Fold in the mentor's feedback. Start Live mode: Supabase schema + RLS, `/api`, Twilio (order-day message, OTP, inbound webhook, location share, failure check) | Notes from the call written to `R2-HANDOVER.md` and passed to the deck teammate |
| **Fri 2 Oct** | Finish Live round trip on a team phone. `/desk` + `/pilot` complete. First Vercel deploy. Landing page + real/simulated table. Code + security review of `/api` and the webhook. e2e test in Demo mode. Record the 90 s video on real phones. Screenshots + QR codes to the deck teammate | All 6 routes clickable on the deployed URL; video + screenshots handed over |
| **Sat 3 Oct** | Freeze, dry run, submit with the deck (Sun 4 Oct = buffer only) | — |

**Cut order if we slip:** Hindi toggle → Autopilot bots → Live-mode polish (keep Demo as the public default) → Hold & Re-home matching animation.
**Never cut:** a working flag → rider → OTP → ₹15 loop, the failure check, the Pilot Verdict, and the Router lanes.

**Mentor-call fallback (if the Demo-mode loop isn't ready by 3:30 pm):** wireframes of the six screens using `research/ui-refs/` and the tokens in `12`, plus the hero flow described step by step.

## 6. Risks
- **Time is the main risk.** Nothing is built on 29 Sep and we submit 3 Oct. Demo mode first is the mitigation.
- **Twilio trial allows ~100 free WhatsApp messages.** Use Demo mode for development and Live only for tests and the recording. If credit runs out: a paid top-up (Gaurav decides) or Meta's Cloud API test number.
- **Sandbox sessions expire after 3 days.** Re-join on the morning of the recording and before submitting.
- **Judges can't receive our WhatsApp**, so the public link defaults to Demo mode and the video shows Live. Say this on the landing page.
- **WhatsApp buttons in the sandbox** may need a template. Fall back to numbered replies (see §2).
- **OSRM demo server** can be withdrawn, so distances are precomputed and committed.
- **`node_modules` inside OneDrive** syncs thousands of files. The scaffold already has a `node_modules/`, despite the older note that nothing was installed. Verify it on "start". Pause OneDrive sync during any install, or later mark `prototype/node_modules` as "Free up space".
- **Look-and-feel clone of Valmo/Meesho apps** is for a Meesho-run competition. Mitigation: the footer on every screen, no real rider phone numbers or AWBs. Ask the mentor if they are comfortable with it.
- **Security (Live mode):** validate the webhook signature; hash OTPs, 5 attempts, 10-minute expiry; rate-limit OTP sends per order; the service key stays server-side; admin reset needs a token; validate every API input with zod.

## 7. Open decisions for Gaurav
1. **Scope:** full "everything real" (Live WhatsApp + Supabase), or lean (Live only for the video, everything else Demo mode)? The lean version is safer on time. This spec keeps the full scope but builds Demo first, so we can drop Live without losing the demo.
2. Who attends the mentor call (at least one member is mandatory), and who demos?
3. Any survey or call findings that change the prototype?

## Verification
- `npm test`: engine unit tests + API handler tests at ≥80% coverage on `src/engine` and `api`.
- Demo mode: the full hero flow on one laptop, including the failure check and a refusal reaching the Desk.
- Live mode: laptop `/ops` + phone `/rider` + a real WhatsApp phone run the full flow.
- A Playwright e2e test of the same flow in Demo mode against the deployed URL.
- Numbers in the app match the deck: break-even 8.6 / 10.3, ₹84.8 → ₹77.7 cost per successful delivery, Router break-even 5.5%, ₹145 / ₹8 per parcel.
