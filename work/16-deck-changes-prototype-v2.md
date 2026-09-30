# 16 — Deck changes (for the deck teammate), 30 Sep 2026

> **Merged into `14-deck-handoff.md` v4 (1 Oct). Use 14; this file is history.** Its pilot rule is superseded (paired riders, 2 safety rules).

The prototype got stricter, so a few slides need to match it. **Numbers still come from `14-deck-handoff.md` unless changed here.**

## Slide 1 (Executive summary) and slide 5 (Economics): the headline
- Say what the bonus **caused**, not how many risky orders were delivered:
  *"In the pilot, the bonus's effect is measured against a Control group: X extra deliveries per 100 flagged orders, at ₹Y of bonuses, avoiding ₹Z of RTO cost."*
- Never write "85% of risky orders delivered". Some of them would have been delivered anyway, and the Control group is what tells us how many.

## Slides 5 and 7 (the pilot): the new decision rule
| Verdict | Rule |
|---|---|
| **INCOMPLETE** | Fewer than 90% of pilot orders finished, or fewer than 6 riders in either group |
| **KILL** | Any guardrail breached (normal orders, returns, complaints, on-time, fake attempts), or the uplift is below +3 per 100 |
| **GO** | The **low end of the 95% range** is at or above break-even (**8.6 per 100**; show the conservative **10.3** too) and no guardrail is breached |
| **RE-PRICE** | Everything else: a real effect (+3 or more) that isn't proven above break-even |

- **We randomise riders, not orders**, pairing riders with similar routes first. The range is calculated per rider, so it's honestly wider.
- **The rule is locked before the pilot starts.** Changing it afterwards makes the verdict invalid. This answers "did you pick the threshold after seeing the result?"
- **Delete "12,000 orders detects +3".** That was per-order maths. Use the "smallest effect this pilot could detect" figure from the prototype's /pilot screen (Gaurav will send it).
- Add one honest line: *"₹15 → more rider effort → more deliveries is our assumption. The pilot measures it."*

## Slide 4 (How the bonus works): controls to add
- **The bonus goes through stages:** earned → pending (COD cash must be deposited first) → **released after the 7-day return window**. A return inside the window takes the bonus back.
- **Caps and blocks:** ₹300 a day per rider · 2 confirmed fake attempts block the bonus · a rider whose normal (non-bonus) deliveries drop gets bonuses held.
- **Second attempt:** a bonus order delivered on attempt 2 still earns the bonus, unless attempt 1 was faked.
- **Fake-attempt check:** GPS at the door + calls + wait time + the customer's WhatsApp answer. Suspicious attempts go to a review queue: *confirm*, *free re-attempt by another rider*, or *strike*.

## Slide 6 (Refused parcels): the Router
- Each lane is chosen by **expected value** (probability × saving − cost), in order: second chance → hold & re-home → batched return.
- **Timers:** second chance 24h; hold on the shelf at most 48h; shelf capacity 30 parcels.
- **Savings are counted only when a parcel is actually delivered.** A re-homed parcel that then fails goes back in a batch, with no saving.
- A seller who hasn't opted in can never be overridden.

## Earlier fixes still pending
- Slide 5 table, row "69 delivered (Δ=9)": conservative **−₹117** (not −₹150); data-pack basis **+₹45** (not ≈0).
- "1 in 8 breaks even" is ambiguous, so say exactly what it means. Break-even is ~8.6 extra deliveries per 100 flagged orders: **1 extra delivery for every ~12 flagged orders**, which is **1 for every ~8 bonuses paid** (the bonus is also paid on the ~60 that would have been delivered anyway). The line "**one avoided return pays for eight bonuses**" is correct; use that one.
- "₹62–184 cr" mixes two bases. Write **"₹62 cr (conservative, +15 per 100) to ₹184 cr (case, +20 per 100)"**.
- **WhatsApp:** it can't be sent live (Twilio trial limit). Say the prototype shows it in **Demo mode** (an on-screen phone).

---

## Added 1 Oct (Session 11): what the rebuilt pilot page actually says (plan 18 is built)
The prototype now runs the simplified pilot. These are the **final numbers** for the slots marked "PENDING" in `14-deck-handoff.md` (slide 5, cheat sheet, pending items). All are simulated and depend on our assumption that ₹15 changes rider effort.

**1. The method slide: five points in plain words**
1. **Fair groups.** In each hub we pair riders who delivered equally well last month. A coin decides who in each pair gets the ₹15.
2. **Same parcels.** We check both groups carry the same mix of risky parcels (three risk bands). The page shows a ✔ "Fair comparison" line and warns if any gap is over 5 points.
3. **Simple maths.** For each pair, the bonus rider's delivery rate minus their partner's. The effect is the average of those gaps. The range is the average ± about 2 × (how much the gaps vary ÷ √pairs).
4. **One rule, fixed in advance.** GO if even the low end of the range pays for itself; KILL if it barely helps (under +3) or a safety rule breaks; RE-PRICE in between.
5. **Honest next step.** If it doesn't pay we don't re-read the same data. We change one lever (Top 10% or a smaller bonus) and run **Pilot 2** with its own rule fixed before it starts. This is the Pilot 1 → learn → Pilot 2 loop diagram.

**2. The rule table (replaces the one above)**
| Verdict | Rule |
|---|---|
| **INCOMPLETE** | Fewer than 90% of flagged orders finished, or fewer than **6 pairs** of riders |
| **KILL** | One of **two safety rules** breaks (normal orders fall by more than 1 point; more than 5% of Bonus riders' attempts look fake, once there are 30 attempts), or the effect is under +3 per 100 |
| **GO** | The **low end of the range** is at or above break-even (8.6 per 100; 10.3 with the ₹18 rider fee) |
| **RE-PRICE** | Everything else |
Returns, complaints and on-time are **no longer** separate safety rules. Delete them from the deck.

**3. The 60% label (slide 5 and the cheat sheet):** *"Our assumption: the riskiest 20% of orders fail about 40% of the time (vs 17% overall). The Control group measures it."* The 60% is **our calibration, not the data pack**.

**4. Score accuracy (slide 4):** in simulation the top 20% by Rescue Score catch **~46% of all RTOs** (random picking catches 20%; a perfect score 49%). Say "in simulation" and "to be measured on Valmo's last 90 days": the simulator builds failures from the same factors the score uses, so this flatters the score. **New "hard to deliver" signals to add:** pincode failure history, customer unreachable before, gated or no-access address. Weights are updated after each pilot (that is Pilot 2, never a re-read of Pilot 1).

**5. New numbers** (24 rider pairs, 30 days, 4 hubs, seed 2026)
| | Top 20% (Pilot 1) | Top 10% (Pilot 2 option) |
|---|---|---|
| Delivered without the bonus | 60% | 51% |
| Break-even (case basis) | +8.6 per 100 | +7.3 per 100 |
| Default result at +12 (one pilot) | **GO**: +13.6, range +11.1 to +16.2 | **RE-PRICE**: +10.2, range +6.6 to +13.8 |
| **Chance of GO if the true effect is +8 / +10 / +12 / +15** | 3% / 18% / **58%** / 97% | 6% / 32% / **70%** / 97% |
| Smallest effect the pilot can reliably see | **~4 per 100** (was 7.5) | ~5 per 100 |
- **Replace "GO about 2 times in 3 at +15; at +12 usually RE-PRICE"** with: *"If the bonus truly adds +15 per 100, this pilot says GO about 97 times in 100. At +12 it is a coin flip (about 6 in 10). At +10 or less it usually says RE-PRICE, and we'd run Pilot 2."*
- **Replace "smallest effect ~7.5"** with **~4 per 100 for 24 pairs**. It fell because pairing removes most rider-to-rider noise. Be ready to say a real pilot may be noisier than this simulation (good and bad months that past rates don't predict).
- The two safety tests at the default: a −3 point fall on normal orders, or a fake-attempt rate of 9%, both give **KILL** even at +15.
- One Ops demo day (~30 orders per arm) still gives an unreliable verdict (its smallest detectable effect is ~35 per 100). It shows the rule working, not evidence.
