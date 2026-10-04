# 33 · Plan: WhatsApp in Hindi or English (the customer chooses)

Written 4 Oct 2026 (Session 20, after plan 32). Asked by Gaurav: "for WhatsApp also there should be an option to ask do you prefer
Hindi/English after the first message, that is asked in both Hindi and English. Plan and build."

## What the customer sees
1. **First message** (order day, flagged orders only, as today): the text in English, then the same text in Hindi; each button in both
   ("✅ I'm home · मैं घर पर हूँ").
2. **Right after it**, one short message in both languages: "Which language should we use for your messages? / आगे के संदेश किस भाषा में
   भेजें?" with two buttons: **English**, **हिंदी**.
3. **After the tap**: "Done. We will send your messages in English." or "ठीक है, आगे के संदेश हिंदी में भेजेंगे।". Every later message to this
   customer is in that language, buttons included: reply acks, payment, OTPs, the "did the agent reach you?" check, the reschedule check,
   the second chance (and its follow-ups), the pickup code.
4. **No answer**: later messages stay in English (today's behaviour).

## Rules
- The language question does **not** replace the first message's buttons: "I'm home / Change time / Fix address / Pay now" stay tappable
  (on the Demo phone only the newest button message is live; the language question is the exception).
- It is part of the first contact, so it is **not counted in the 4-message cap** (otherwise a refused order could lose its second-chance
  message). It is still a sent message: ₹0.50 in the cost ledger, like every other.
- The choice is per order (`stop.lang`), logged as `LANGUAGE_CHOSEN { lang }`, and can be changed (Live: type the word).
- **Live (real WhatsApp, numbered replies):** the language question asks the customer to reply with a WORD ("ENGLISH" or "HINDI / हिंदी"),
  not a number, so "1" still means "I'm home". The word works any time to switch. "hi"/"en" are NOT accepted (a "hi" greeting must not
  switch to Hindi). The "Reply with a number" line is in the customer's language.
- New action `customerLanguage { orderId, lang: 'en' | 'hi' }`: a customer action (rider key allowed on synthetic orders; on a bound order
  only the customer's own WhatsApp may answer), validated on the server.

## Files
`domain/messages.ts` (English and Hindi copy with the same keys; the old English exports stay), `types.ts` (`WaLang`, `stop.lang`,
`language_check`, the action), `events.ts`, `reducer.ts` + `secondChance.ts` (send in the customer's language), `roles.ts`,
`api/_lib/validate.ts`, `api/_lib/inbound.ts` + `core.ts` (word replies, offers skip the language question, numbered prompt in Hindi),
`pages/customer/chatActions.ts` (live buttons). No schema bump beyond 9 (plan 32's, not yet deployed).

## Tests first
Domain (first message bilingual, the question follows, not in the cap, choice → later messages in Hindi, default English, switch back),
customer phone (buttons stay live, tap हिंदी), Live parser (words, numbers still map to the order-day options, Hindi prompt), validation, roles.
