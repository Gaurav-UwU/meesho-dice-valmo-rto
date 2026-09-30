# 21: Refused-Parcel Desk v3: the agreed design (1 Oct 2026, grilling session, no code written yet)

Every decision below was put to Gaurav and agreed (rounds 1 to 3). Don't reopen them; build in the order at the bottom, tests first. Files: `prototype/src/engine/router.ts`, `src/domain/routing.ts`, `src/domain/parcels.ts`, `src/pages/Desk.tsx`, `src/pages/desk/*`, `src/domain/audit.ts`, `api/_lib/validate.ts`.

## What the Desk must prove to a judge
1. Every refused parcel takes the cheapest **legal** lane, with the maths visible.
2. Savings are booked **only on real outcomes**.
3. The legal gates are **hard**: nothing overrides them, least of all a seller who has not opted in.
Operating it day to day is kept light. It is a decision tool, not an ops system.

## The flow after this build
1. A rider refuses a parcel and records why (7 reasons). It lands in the Desk queue.
2. **Inspect parcel** (hub operator): records unopened, seal intact, invoice outside or inside, a photo placeholder (no real upload), the time and the operator. Required **before Hold only**. Second chance and consolidated return don't need it. Autopilot and Close pilot auto-inspect with the synthetic gate values.
3. The Router recommends a lane (second chance, then hold & re-home, then consolidated return) and shows its expected value.
4. **Second chance** (WhatsApp, 24 h) now offers four options: **Deliver again**, **Different time** (tomorrow or the day after), **Pay now by UPI**, **Pick up at hub**. The customer picks in the emulator (in Live mode a numbered reply). Bots pick from a fixed mix by refusal reason (an engine constant, not editable).
5. The operator can **skip second chance** with one of four reasons: "Customer already refused firmly at the door", "Customer not reachable", "Seller wants it back", "Other". Logged as an event and counted. **Gates can never be overridden.**
6. **Hold & Re-home** and **Consolidated return** work as today. New: a parcel refused as **damaged or wrong item** fails a new "Item condition OK" gate (never re-homed), and goes back with a "Seller claim / QC needed" chip.

## Hub pickup (decided)
- **Window 48 h**, same as Hold (a new Router parameter `pickupHours`). A pickup **code** is valid for the whole window, 5 tries. The operator types it in at the Desk to hand over ("Customer collected"). For a COD parcel the operator records "cash collected at hub" as a flag (no rider, no ledger effect).
- **Shelf:** pickup shares the 30 slots with Hold. Offered only if a slot is free when the WhatsApp is sent, and re-checked when the customer accepts. If the shelf is full by then, the customer falls back to **Different time**.
- **Messages:** no extra proactive message and no reminder (the cap of 4 per order stays honest). The pickup instructions and code go in the confirmation reply (a customer-initiated reply does not count).
- **Money:** ₹8 hold cost booked when the slot is reserved; **₹120 saving booked when collected** (₹112 net, vs ₹99 for a second chance delivered by a rider). A no-show goes to a batched return (the normal 30% saving, ₹36) and the ₹8 stays as a cost.
- **Pilot verdict (important):** the original refusal **stays the rider's failure** in the verdict. A new terminal state (for example `hub_pickup`) is **not delivered**, counts in the denominator, and **never pays a bonus**. The pickup shows up as a saved sale in the Router numbers and KPIs only. (A second chance delivered by a rider still counts as delivered, as today.)
- Expected value: keep the current formula (accept chance × ₹99). Book the **actual** saving of whichever option happened; expected and booked differ slightly and the screen says so.

## What the toggles do after this build
- The three switches (Unopened, Seal intact, Invoice outside) become **"Try a what-if" preview only**. They never change the parcel. Flipping one shows a one-line before/after, for example: "Seal broken: Hold lane closed, now Consolidated return, EV +₹40 → +₹36".
- The real values come only from **Inspect parcel**.
- Facts that can't be toggled: same state, seller opted in, item condition, shelf capacity, rider bag space, expected value.

## Money and assumptions on the Desk
- **Three tiles** replace "Router effect: min to max":
  - **Booked so far** = real savings minus real Router costs (hold ₹8, re-home delivery ₹21, messages). Gross shown small underneath.
  - **Still in play** = expected value of each open parcel in its current lane (queued: recommended lane; second chance sent: its EV; held: remaining hold EV).
  - **Cost of sending everything back** = refused parcels × ₹120.
- **Assumptions:** three headline numbers: **soft-refusal accept rate** (sets no cash, wants it later and not home at once; editing one of the seven rows afterwards shows "mixed"), **conversion**, **shelf capacity**. The seven accept rates fold under "More".

## Pilot KPI panel (with a "too early" floor of 30 parcels per lane)
Sales saved (second chances delivered ÷ sent) · second-chance accept rate · re-home match rate against the 5.5% break-even · pickup rate (collected ÷ chosen) and no-shows · average dwell hours · ₹ booked per refused parcel · skips and their reasons · the kill rule ("match rate below 3% after 30 days"). Custody incidents and complaints are **not simulated**, so the panel says so instead of showing a fake 0.

## Audit additions
"No parcel held without an inspection", "no gate was overridden", "no pickup handed over without a verified code", "shelf never above capacity".

## Engine and data changes (one schema bump)
- **Parcel record:** inspection {unopened, sealOk, invoiceOutside, at, by, photoNote}, skipReason, chosen second-chance option, pickup state (reserved, collected, expired) with code and deadline, sellerClaim flag.
- **Router:** new gates "Inspected" (hold only) and "Item condition OK"; `pickupHours` parameter; pickup slots counted in `shelfUsed`.
- **Events:** PARCEL_INSPECTED, SECOND_CHANCE_SKIPPED, PICKUP_RESERVED, PICKUP_COLLECTED, PICKUP_EXPIRED (with required fields).
- **Actions:** `deskInspect`, `deskSkipSecondChance`, `deskHandover {code}`, and `customerSecondChance` extended with the chosen option. `validate.ts` and the Live inbound parsing know them.
- **Lifecycle:** one new terminal state for a hub pickup (not delivered, no bonus). The "attempt 2 + denominator" fix (never-cut list) must keep passing.
- **Timers:** pickup window expiry (48 h) goes to a batched return.
- **`DAY_SCHEMA` bumped once**, with the local storage key. A shared Supabase day needs **one Reset** afterwards.

## Build order (tests first, one deploy at the end of each step if green)
1. **Clarity only (no engine change):** the flip-feedback line with preview-only toggles, the three money tiles, the three headline assumptions. **Never dropped.**
2. **Inspect step, damaged gate, skip second chance, the two Audit checks.** **Dropped last.**
3. **Second-chance options:** Different time, Pay now, then **Pick up at hub**. Pickup is the heaviest piece and goes before the KPI panel.
4. **Pilot KPI panel** and the pickup Audit checks. **Dropped first** if the Fri 2 Oct 3 pm freeze bites, then pickup.

## Risks to watch
- The pickup terminal state must not leak into the verdict's "delivered" or pay a bonus (scenario tests).
- The contact cap of 4 must still hold with the new options.
- This follows the sync session's day id: re-check `dayId` handling and that a reset clears any pickup timers.
- Live mode must still compile, its API tests must pass, and the 90-second Demo path must still work.
- Gate before any deploy: `npx vitest run && npx tsc -b && npx oxlint && npm run build`, then `node scripts/build-api.mjs && npx vercel deploy --prod --yes`. Log the session in `R2-HANDOVER.md` and update `NEXT-SESSION.md` and `00-MASTER.md`.
