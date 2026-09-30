# 18 — Simplify the pilot maths (plan agreed 1 Oct, build in a new session)

Agreed with Gaurav in a design interview on 1 Oct. **The decisions below are settled; don't reopen them.** Goal: a judge can follow the whole pilot method in two minutes. The Pilot Verdict is on the "never cut" list: simplify it, don't remove it.

## The story we want a judge to hear
1. **Fair groups.** In each hub we pair riders who were equally good last month (their past delivery rate on risky parcels). A coin decides which rider in each pair gets the ₹15.
2. **Same parcels.** We check that both groups carry the same mix of risky parcels (three risk bands). We don't move parcels off their routes; paired riders on similar routes make the mix come out equal.
3. **Simple maths.** For each pair: bonus rider's delivery rate minus their partner's. Effect = the average of those differences. Range = average ± about 2 × (spread of the differences ÷ √number of pairs).
4. **One rule, fixed in advance.** GO if even the low end of the range pays for itself; KILL if it barely helps or a safety rule breaks; RE-PRICE in between.
5. **Honest next step.** If it doesn't pay, we don't re-read the same data. We change one lever (a tighter score such as the top 10%, or a smaller bonus) and run **Pilot 2** with its own rule fixed before it starts.

## Decisions (all settled)
| # | Decision |
|---|---|
| Q1 | Improving the score or the strategy happens only as a **pre-planned Pilot 2**, never by re-reading pilot 1 (that stays INVALID). |
| Q2 | Balance rider skill by **pairing on each rider's past delivery rate** on risky parcels; coin flip within each pair. |
| Q3 | Parcel risk: keep routes; **show a balance check** of three risk bands per group. In the simulator both groups draw from the same band mix. |
| Q4 | Simplify the **story and the pilot simulator**. The Ops day only gets rider pairs (Q10) and wording, not a rebuild. |
| Q5 | Cut assumptions: keep ₹15 / ₹120 / 60%; targeting **Top 20% and Top 10% only**; **no per-city starting rates** in the pilot simulator; rider skill = past-rate pairs (replaces route difficulty + skill bell curves); **2 safety rules** (normal orders, fake attempts); the ₹18 case moves to "How the maths works" only; keep the 300-reruns bar; hub table stays under More detail. |
| Q6 | Scoring accuracy: **no new scoring maths.** Show how accurate the score is and the plan to improve it (see step 7). |
| Q7 | Range = **pair-by-pair** (paired difference). Smallest detectable effect moves to "How the maths works" only. |
| Q8 | Keep **60%**, labelled "our assumption: the riskiest 20% fail about 40% of the time (vs 17% overall). The Control group measures it." |
| Q9 | Pilot 2 appears as the **"Next:" sentence and a deck diagram**. No "Plan pilot 2" button (only if time is left). |
| Q10 | **Pair the Ops-day riders too**, so one verdict rule (pair-by-pair) runs on `/pilot`, the Ops card and "Check today's Ops day". |
| Q11 | Keep the old rider-clustered range as a **hidden cross-check** in "How the maths works" ("a stricter method gives X to Y; they agree"). Its tests stay. |
| Q12 | Step 2 shows one visible line, **"✔ Fair comparison: same rider skill, same parcel risk mix"**, with the small table folded under it. It warns if the groups differ by more than 5 points. |
| Q13 | **Build now**, in a new session. |
| Q14 | Add a deck-changes list to `work/16-deck-changes-prototype-v2.md`. |

Facts found while planning:
- The **60%** is our calibration assumption, not the data pack. The data pack gives 17% overall RTO (COD 20% / prepaid 5%).
- **Score accuracy in the simulator:** the top 20% by Rescue Score have 43% RTO and catch 46% of all RTOs. Random picking catches 20%; a perfect score catches 49%. This is rigged, because the generator builds true risk from the same factors and weights the score uses (`generate.ts` `TRUTH` vs `rescue.ts` `RESCUE_WEIGHTS`). Say "in simulation" and "to be measured on Valmo's last 90 days".
- Ops-day riders are currently split by a plain shuffle (`src/engine/generate.ts:161`) and all have equal skill.

## Build steps (tests first for engine and reducer changes; update tests, don't delete coverage)
1. **Paired comparison in the engine** (`src/engine/verdict.ts`).
   - Add `comparePairs(pairs)`, where each pair is `{ bonus: RiderCell, control: RiderCell }`. It returns `diffPer100` (the mean of the pair differences), `ci95` (mean ± t(df = pairs − 1) × SD ÷ √pairs), `pairs`, and `mdePer100` (≈ 2.8 × SD ÷ √pairs).
   - The page text says "about 2 ×"; the code uses the t value (2.07 for 24 pairs) so a small pilot isn't over-confident.
   - Drop a pair where either rider has no finished flagged parcel, and say so in the reason.
   - `verdict()` uses the paired result. The INCOMPLETE rule becomes "at least 6 pairs".
   - Keep `compareArms` (clustered) and return it as `crossCheck` for the maths panel.
   - Tests to cover: a hand-worked example (3 pairs, check the arithmetic by hand), the INCOMPLETE rule under 6 pairs, dropped empty pairs, and that the paired and clustered ranges roughly agree on a big simulated pilot.
2. **Two safety rules only.** Remove returns, complaints and on-time from `VerdictConfig`, the readings and the sliders. The rule hash changes, so update the pinned hashes in tests. Fix the fake-attempt reading so it can actually trip (audit item 2 in `work/17-prototype-audit.md`): use suspected fake rate = low-confidence attempts ÷ attempts, and keep strikes as a separate number.
3. **Pilot simulator** (`src/engine/pilot.ts`).
   - Each rider has a hidden skill and an observed **past rate** (skill plus the noise of about 125 past parcels). Sort riders by past rate, pair neighbours, and flip a coin in each pair.
   - Remove `DIFFICULTY_LOGIT` and the route draw, and remove `hubBaseline`/city factor from the pilot (every hub starts at the same rate).
   - Each flagged parcel gets a risk band, one third each (high / very high / extreme), with "delivered anyway" rates of 70 / 60 / 50 (averaging 60). Both groups draw from the same mix.
   - Return a `fairness` block: the average past rate per group and the band mix per group.
   - Keep the uplift as +points on each rider's chance and keep the 300-reruns odds.
4. **Ops day pairs** (`src/engine/generate.ts`, `src/domain/*`).
   - Riders 1 and 2 form a pair, a coin decides the bonus, then riders 3 and 4, and so on. Add `pairId` to `Rider`.
   - `dayVerdictData` builds pairs from rider cells.
   - Bump `DayState.schema` so old saved days reset. The Live Supabase day will need a Reset. Keep Live mode compiling.
   - Ops "Why was this flagged?" panel (`src/pages/ops/OrderPanel.tsx`): add one line, "Score accuracy (simulation): the top 20% by score catch N% of failures; random would catch 20%. To be measured on Valmo's last 90 days." Compute N from the day's orders (`pRto` of flagged ÷ total `pRto`).
5. **Pilot page** (`src/pages/Pilot.tsx`, `src/pages/pilot/*`).
   - Targeting shows Top 20% and Top 10% only (`src/engine/targeting.ts` `TARGET_SHARES`).
   - The safety sliders drop to 2, and the "It hurts normal orders" and "Fake attempts rise" scenarios stay.
   - The "60% delivered anyway" help text carries the Q8 label.
   - Step 2 gets the "✔ Fair comparison" line with a folded table: riders' past rate per group, and the band mix per group.
   - The diagram label stays "Where the true effect probably is".
   - The PayCard ₹18 sentence moves into `MathExplainer`/`mathSteps.ts`.
   - Rewrite `mathSteps.ts` to the paired story: pairs → differences → average → spread → range → rule → money. Add the clustered cross-check and the smallest detectable effect as an "extra" section.
   - On RE-PRICE, `plainVerdict` "Next:" says: "Run Pilot 2 with one change (Top 10% or a smaller bonus), with its rule fixed before it starts."
6. **Wording elsewhere.** Update `src/pages/landing/content.ts`: the pilot row of `REAL_VS_SIMULATED` ("riders paired on past delivery rate, a pair-by-pair 95% range, …") and the walkthrough pilot step. Also update the README's pilot line and `/audit` if they mention the clustered interval.
7. **Deck list** (Q14). Append to `work/16-deck-changes-prototype-v2.md`:
   - the method slide (the 5-point story above)
   - the 60% label
   - "Score accuracy: top 20% catch ~46% of RTOs in simulation, to be measured on Valmo data; new 'hard to deliver' signals to add: pincode failure history, customer unreachable before, gated or no-access address; weights updated after each pilot"
   - the Pilot 1 → learn → Pilot 2 loop
   - the new numbers from the rebuilt page (default verdict, P(GO), the top-10% result)
8. **Gate and deploy.** Run `npx vitest run && npx tsc -b && npx oxlint && npm run build && node scripts/build-api.mjs && npx vercel deploy --prod --yes`, all joined with `&&`. Then check in the browser at desktop and 375 px: pick every scenario, check Top 10%, and do Ops → Close pilot → "Check today's Ops day".
9. **Log it.** Update `work/R2-HANDOVER.md`, `work/NEXT-SESSION.md` and `00-MASTER.md`.

## Done when
- One verdict method (pair-by-pair) is used on `/pilot`, the Ops card and the Ops-day check.
- The page shows no word a judge must look up ("clustered", "ICC", "design effect", "MDE", "t-value").
- The fair-comparison line is green for default settings.
- All old behaviours still have tests, and everything is deployed.
