# COD Shopper Survey — build & distribution

**Target: ~100 responses, split metro / Tier-2 / small town.**
Runtime for respondent: ~2 minutes. Every question is single-tap except the last.

---

## FASTEST BUILD — Google Apps Script

1. Go to **[script.google.com](https://script.google.com)** → **New project**
2. Delete the placeholder code, paste everything below
3. Click **Run** (▶). Approve the permissions prompt when Google asks
4. Open **View → Logs** (or the Execution log panel) — it prints your live form URL, edit URL, and the linked response sheet

```javascript
function createSurvey() {
  var form = FormApp.create('Why do online deliveries fail? (2 min)');

  form.setDescription(
    'Student research project on why e-commerce deliveries in India fail or get refused. ' +
    'Completely anonymous — we do not collect your name, email or phone. ' +
    'Takes about 2 minutes. Thank you!'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('Thank you! This genuinely helps.');

  // ---------- PAGE 1: SCREENER ----------
  var q1 = form.addMultipleChoiceItem();
  q1.setTitle('Have you ordered anything online with Cash on Delivery (COD) in the last 6 months?')
    .setRequired(true)
    .setChoices([
      q1.createChoice('Yes', FormApp.PageNavigationType.CONTINUE),
      q1.createChoice('No',  FormApp.PageNavigationType.SUBMIT)
    ]);

  form.addPageBreakItem().setTitle('About your orders');

  // ---------- CONTEXT ----------
  form.addMultipleChoiceItem()
    .setTitle('Where do your orders usually get delivered?')
    .setChoiceValues([
      'Metro city (Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune)',
      'Tier-2 city (e.g. Jaipur, Lucknow, Indore, Kochi, Nagpur)',
      'Small town or village'
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Which platforms have you used Cash on Delivery on?')
    .setChoiceValues(['Meesho', 'Amazon', 'Flipkart', 'Myntra', 'Ajio'])
    .showOtherOption(true)
    .setRequired(true);

  // ---------- REFUSAL BEHAVIOUR (sizing) ----------
  form.addMultipleChoiceItem()
    .setTitle('In the last 6 months, how many COD orders did you refuse at the door, or not accept?')
    .setChoiceValues(['0', '1', '2-3', '4 or more'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('If you refused or did not accept an order — why? (tick all that apply)')
    .setChoiceValues([
      'Changed my mind by the time it arrived',
      'Found it cheaper somewhere else',
      'It took too long to arrive',
      'I was not at home and never rescheduled it',
      'I did not have cash at that moment',
      'I ordered it by mistake',
      'Someone else at home had already ordered it',
      'It looked different from the photos',
      'I did not recognise the order'
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Have you ever placed an order knowing you might not accept it?')
    .setChoiceValues(['Yes', 'No', 'Maybe / not sure'])
    .setRequired(true);

  // ---------- AVAILABILITY ----------
  form.addMultipleChoiceItem()
    .setTitle('Has a delivery ever failed because you were not at home?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('What time of day are you usually available to receive a delivery?')
    .setChoiceValues([
      'Morning (8am - 12pm)',
      'Afternoon (12pm - 4pm)',
      'Evening (4pm - 8pm)',
      'Night (8pm - 10pm)',
      'It varies a lot day to day'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Would you use a feature that let you choose your own delivery time slot?')
    .setChoiceValues(['Yes', 'No', 'Maybe'])
    .setRequired(true);

  // ---------- ADDRESS & CONTACT ----------
  form.addMultipleChoiceItem()
    .setTitle('Your delivery address — does it have a proper house and street number, or is it based on landmarks?')
    .setChoiceValues([
      'Proper house / street number',
      'Mostly landmark-based ("near X temple", "behind Y shop")',
      'A mix of both'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Has a delivery ever failed because the delivery person could not reach you on the phone?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);

  // ---------- PAYMENT ----------
  form.addCheckboxItem()
    .setTitle('Why do you choose Cash on Delivery instead of paying online? (tick all that apply)')
    .setChoiceValues([
      'I do not fully trust the platform yet',
      'I want to see the product before paying',
      'I do not have UPI or a card set up',
      'Habit — I always do it this way',
      'Returns and refunds feel easier with COD'
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addCheckboxItem()
    .setTitle('What would make you pay in advance instead? (tick all that apply)')
    .setChoiceValues([
      'A discount for paying online',
      'A guarantee that returns would be easy',
      'If it was a brand I already trusted',
      'Faster delivery',
      'Nothing — I will always prefer COD'
    ])
    .showOtherOption(true)
    .setRequired(false);

  // ---------- OPEN (quotes) ----------
  form.addParagraphTextItem()
    .setTitle('Last one — tell us about the last time you refused a delivery, or missed one. What happened?')
    .setHelpText('Even one or two lines helps a lot. Optional.')
    .setRequired(false);

  // ---------- LINKED RESPONSE SHEET ----------
  var ss = SpreadsheetApp.create('COD Survey - Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('SHARE THIS LINK : ' + form.getShortUrl());
  Logger.log('Edit the form   : ' + form.getEditUrl());
  Logger.log('Responses sheet : ' + ss.getUrl());
}
```

---

## DISTRIBUTION — this is what decides whether you get 100 or 12

Response rate is mostly about the ask, not the form. Rules:

- **Send it as a personal message, not a broadcast.** Forwarded blasts get ignored; a direct message to one person gets filled.
- **Push the hometown networks hard.** Family WhatsApp groups, school friends, cousins in smaller towns. This is the half that fixes your metro-representativeness problem, and it's the half that will be under-represented if you only spam college groups.
- **Ask ~15 people to forward it to one person each.** Second-degree reach is where you cross 100.
- **Send between 8–10pm.** Highest WhatsApp open rates.
- **Post a running count** ("62 so far, need 100 by tomorrow") — visible progress converts.

### English message
> Hey! I'm doing a student research project on why online deliveries in India fail or get refused — for a national case competition.
>
> Could you fill this 2-minute anonymous form? No name, email or phone collected.
> [LINK]
>
> And if you could send it to one person from your hometown, that would genuinely help — we need responses from smaller cities, not just metros. 🙏

### Hindi message
> Namaste! Main ek student research project kar raha hoon — online delivery fail ya refuse kyun hoti hai, uspe. National competition ke liye hai.
>
> 2 minute ka form hai, bilkul anonymous — naam, email, phone kuch nahi poochte.
> [LINK]
>
> Aur agar aap apne ghar/town ke ek do logon ko bhej dein toh bahut help ho jayegi — humein chhote sheher se responses chahiye, sirf metro se nahi. 🙏

---

## WHAT EACH ANSWER FEEDS

| Question | Feeds |
|---|---|
| Delivery location | The metro vs T2/T3 cut — proves you didn't only sample your own bubble |
| Refusals in 6 months | **Slide 1 sizing** — customer-side refusal frequency |
| Why refused | **Slide 1 cause-split** — the demand-side half of the map |
| Ordered knowing you might refuse | Intent-to-refuse. Nobody measures this. If it's non-trivial, it's a finding in itself |
| Not at home / time available / time slot | Spike **C** — is failure driven by timing rather than intent |
| Address landmark-based | Address quality, cross-checks against what riders tell you |
| Phone unreachable | Cross-checks the rider-side "couldn't reach customer" bucket |
| Why COD / what would change it | Whether the payment-mix lever has road left — set against Meesho's H1 FY26 numbers showing it doesn't |
| Open text | **Quotes for the deck** |

## READING IT TOMORROW

The single most valuable cut: **cross-tabulate "why refused" against delivery location.** If metro and small-town respondents give materially different reasons, that is a genuine insight — it directly evidences the case's own line that *"India is not one market"*, and almost nobody else will have the data to say it.

Second: check whether the customer-reported refusal reasons **match or contradict** what riders told you. Where the two sides disagree about why an order failed, that gap is the most interesting thing you'll find all week.
