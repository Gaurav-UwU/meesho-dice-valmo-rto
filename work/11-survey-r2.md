# 11 — Round 2 buyer survey (Hindi-first, bilingual)

**Goal:** 150+ responses by **Sep 30**, with at least a third from small towns or villages. Takes about 1 minute; at most 10 taps (short version v2).
**Who it's for:** anyone who has placed a COD order online in the last 6 months (any app, Meesho preferred).
**Language:** each question is in Hindi (Devanagari) with the English line underneath, and every option is bilingual.
**Pooling with R1:** the refusal-count and refusal-reason questions use **the same options as the R1 survey** (`04-survey.md`), so R1 and R2 responses can be combined.

---

## Neutral by design (what makes it credible)
1. **Behaviour before ideas.** We ask what actually happened (pages 2–4) *before* showing our ideas (page 5). Showing the ideas first would bias the earlier answers.
2. **Every idea question has a real "no" option.**
3. **Recall-based questions are anchored to the most recent failed delivery.** That's more accurate than asking about habits in general.
4. **We decided in advance what would count against us** (table at the bottom), and we report it either way.

---

## Short version (v2, 2026-09-28): about 1 minute, at most 10 taps
**Code:** `work/survey-r2-script.gs`. Paste the whole file into script.google.com and run `createSurveyR2`. It supersedes the long version that used to be here.

| # | Question (Hindi + English) | Feeds slide |
|---|---|---|
| 1 | COD order in the last 6 months? (screener) | — |
| 2 | Metro / Tier-2 / small town | cut every answer by tier (S2) |
| 3 | Which apps asked if you'd be home? (Flipkart / Amazon / Meesho / none) | S3 P1 gap |
| 4 | Any order not delivered in 6 months? (gate) | share of buyers with a failure |
| 5 | What happened last time? (refused / not home / came early / couldn't take call / address not found / "nobody came but attempted") | S2 causes, early arrival, fake attempts |
| 6 | How many times did the rider call? | S2/S4 rider effort |
| 7 | Would you have taken it the next day at your chosen time? | S6 soft-refusal share |
| 8 | Would you reply to a two-way WhatsApp? | S3 P1 |
| 9 | Pay now by UPI? (yes / yes if ₹10–20 off / no) | S3 P1, S5 |
| 10 | Sealed refused pack 1–2 days sooner: OK? | S6 Hold & Re-home |
| + | Optional one-line comment | quotes |

Questions 5–7 only appear for people who had a failed delivery. Everyone else skips to question 8.
Cut from the long version: state, apps used, COD share, refusal counts, refusal reasons (R1 already has these), rider waiting, verification call, "filled by".

## Share messages (send personally, 8–10 pm)

**Hindi (Devanagari):**
> नमस्ते! 🙏 हम IIT Bombay के छात्र हैं और एक राष्ट्रीय प्रतियोगिता के लिए रिसर्च कर रहे हैं: ऑनलाइन ऑर्डर की डिलीवरी क्यों फेल होती है।
> 1 मिनट का सर्वे है, पूरी तरह गुमनाम (नाम या नंबर नहीं लेते):
> [LINK]
> अगर आप इसे अपने शहर/गाँव के 2 लोगों को भेज दें, तो बहुत मदद होगी। धन्यवाद!

**Hinglish (for family and friend groups):**
> Namaste! 🙏 Hum IIT Bombay ke students hain. Ek national competition ke liye research kar rahe hain ki online delivery fail kyun hoti hai.
> 1 minute ka survey hai, bilkul anonymous:
> [LINK]
> Please apne ghar/town ke 2 logon ko bhi bhej dijiye, chhote shehron ke jawab sabse zyada kaam ke hain. Dhanyavaad!

**English:**
> Hi! We're IIT Bombay students researching why online deliveries fail, for a national case competition. It's a 1-minute anonymous survey: [LINK]
> Forwarding it to 2 people from your hometown would help a lot, since we need small-town voices too. Thank you!

---

## Getting to 150+ responses, with small towns included
| Channel | How | Expected |
|---|---|---|
| **Hometown family groups** (each teammate) | A personal message plus "please send to 2 people" | 40–60, mostly Tier-2/small town |
| **Campus staff:** housekeeping, security, canteen, mess, delivery riders at the gate | **Fill it with them on your phone, in Hindi** (tick "with a volunteer") | 20–30; strongest COD/small-town voices |
| **Riders at Valmo/other hubs** during the research calls | Ask them to share it with their COD customers or family | 10–20 |
| **College and friends' groups** | A personal ask, not a broadcast | 30–50 (metro-heavy, so keep it balanced) |
| **Local kirana/mobile shops** near campus | A QR poster at the counter (text below) | 10–20 |
Post a running count in the team chat ("63 so far, need 150 by the 30th").

**QR poster text:** "ऑनलाइन डिलीवरी पर 1 मिनट का सर्वे: IIT Bombay छात्र रिसर्च 🙏 | Scan to help students (1 min, anonymous)"

---

## What each answer feeds (and what would count against us)
| Question | Our hypothesis | Deck slide | Decided in advance: result that counts against us |
|---|---|---|---|
| Asked about availability? + which app | Valmo/Meesho rarely asks; Flipkart does | S3 (P1 gap) | Meesho is named as often as Flipkart |
| Arrived before promised date | Early surprise arrivals cause missed deliveries | S2 | < 10% "yes, and I missed it" |
| What happened last time | Most failures are at the door (refused / not home / no answer) | S2 cause bar (customer side) | "Rider couldn't find address" is the biggest bucket |
| "Nobody came but showed attempted" | Fake attempts are real and measurable | S2, S4 controls | ~0%, which would mean fake attempts are a small issue |
| Calls + waited | Riders give up fast on COD (our order-and-observe: 2 calls, no wait) | S2, S4 | Most report 3+ calls and waiting |
| Second chance next day | A meaningful share of refusals are "soft" | S6 Router, second-chance lane | "No, didn't want it" > 80% |
| Anyone called after failure | Valmo's verification call (per its SOP) doesn't happen consistently | S4 controls | Most say "yes" |
| WhatsApp two-way reply | Buyers would answer | S3 P1 | "Would not reply" > 50% |
| Pay now by UPI | Some COD buyers would pay mid-journey | S3 P1, S5 | "Still pay at door" > 90% |
| Sealed refused pack OK | Buyers accept Hold & Re-home if told | S6 | "No" > 50% |
| City tier + state (cut every question) | India isn't one market | S2 | No difference between tiers |

**Headline cut:** every answer split by **metro vs Tier-2 vs small town**.
**Second cut:** refusal reasons from buyers vs what the 12 riders told us. Where the two disagree is itself a finding.
In the deck, report n, the date range, the share filled with a volunteer, and the sampling limits: convenience sample, student networks, self-reported.
