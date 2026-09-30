function createSurveyR2() {
  var form = FormApp.create('ऑनलाइन डिलीवरी सर्वे | Online Delivery Survey (3 मिनट)');
  form.setDescription(
    'IIT Bombay के छात्रों का रिसर्च प्रोजेक्ट: ऑनलाइन ऑर्डर की डिलीवरी क्यों फेल होती है। ' +
    'पूरी तरह गुमनाम: हम नाम, ईमेल या फ़ोन नंबर नहीं लेते। लगभग 3 मिनट।\n' +
    'Student research project (IIT Bombay) on why online deliveries fail. ' +
    'Fully anonymous: no name, email or phone collected. About 3 minutes.'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('धन्यवाद! आपका जवाब बहुत काम आएगा। 🙏\nThank you, this genuinely helps!');

  var YES = 'हाँ / Yes', NO = 'नहीं / No';
  var COUNT = ['0', '1', '2–3', '4 या ज़्यादा / 4 or more'];

  function mc(hi, en, opts, required) {
    return form.addMultipleChoiceItem().setTitle(hi).setHelpText(en)
      .setChoiceValues(opts).setRequired(required !== false);
  }
  function cb(hi, en, opts, other) {
    var it = form.addCheckboxItem().setTitle(hi).setHelpText(en)
      .setChoiceValues(opts).setRequired(false);
    if (other) it.showOtherOption(true);
    return it;
  }

  // ---------- PAGE 1: SCREENER ----------
  var screener = form.addMultipleChoiceItem()
    .setTitle('पिछले 6 महीनों में क्या आपने कोई ऑनलाइन ऑर्डर कैश ऑन डिलीवरी (COD) से मंगाया है?')
    .setHelpText('In the last 6 months, have you ordered anything online with Cash on Delivery (COD)?')
    .setRequired(true);

  // ---------- PAGE 2: ABOUT YOU ----------
  form.addPageBreakItem().setTitle('आपके बारे में | About you');
  mc('आपका ऑर्डर आमतौर पर कहाँ डिलीवर होता है?',
     'Where do your orders usually get delivered?',
     ['बड़ा शहर (मुंबई, दिल्ली, बेंगलुरु, हैदराबाद, चेन्नई, कोलकाता, पुणे) / Metro city',
      'मध्यम शहर (जैसे जयपुर, लखनऊ, इंदौर, पटना, नागपुर) / Tier-2 city',
      'छोटा शहर या गाँव / Small town or village']);
  mc('आपका राज्य कौन-सा है?', 'Which state do you live in?',
     ['महाराष्ट्र / Maharashtra', 'उत्तर प्रदेश / Uttar Pradesh', 'बिहार / Bihar',
      'मध्य प्रदेश / Madhya Pradesh', 'राजस्थान / Rajasthan', 'कर्नाटक / Karnataka',
      'गुजरात / Gujarat', 'दिल्ली / Delhi', 'अन्य / Other']);
  cb('आपने किन ऐप पर COD से ऑर्डर किया है?', 'Which apps have you used COD on? (tick all)',
     ['Meesho', 'Flipkart', 'Amazon', 'Myntra / Ajio'], true);
  mc('आपके कितने ऑनलाइन ऑर्डर COD होते हैं?', 'How many of your online orders are COD?',
     ['सभी या लगभग सभी / All or almost all', 'लगभग आधे / About half', 'कभी-कभी / Sometimes']);

  // ---------- PAGE 3: BEFORE DELIVERY ----------
  form.addPageBreakItem().setTitle('डिलीवरी से पहले | Before delivery');
  mc('डिलीवरी से पहले क्या कभी आपसे पूछा गया कि आप घर पर होंगे या नहीं?',
     'Before a delivery, were you ever asked whether you would be at home?',
     ['हाँ, अक्सर / Yes, often', 'कभी-कभी / Sometimes', 'कभी नहीं / Never', 'याद नहीं / Don\'t remember']);
  cb('अगर पूछा गया, तो किस ऐप ने?', 'If yes, which app asked?',
     ['Flipkart', 'Amazon', 'Meesho', 'Myntra / Ajio'], true);
  mc('क्या कभी ऑर्डर बताई गई तारीख से पहले आ गया, जब आप उसकी उम्मीद नहीं कर रहे थे?',
     'Has an order ever arrived before the promised date, when you were not expecting it?',
     ['हाँ, और मैं उसे ले नहीं पाया/पाई / Yes, and I missed it',
      'हाँ, पर मैंने ले लिया / Yes, but I received it',
      'नहीं / No', 'याद नहीं / Don\'t remember']);

  // ---------- PAGE 4: YOUR ORDERS ----------
  form.addPageBreakItem().setTitle('आपके ऑर्डर | Your orders');
  mc('पिछले 6 महीनों में कितने COD ऑर्डर आपने दरवाज़े पर लेने से मना किया या नहीं लिए?',
     'In the last 6 months, how many COD orders did you refuse at the door or not accept?', COUNT);
  mc('पिछले 6 महीनों में कितनी बार डिलीवरी इसलिए नहीं हो पाई क्योंकि आप घर पर नहीं थे या फ़ोन नहीं उठा पाए?',
     'In the last 6 months, how many times did a delivery fail because you were not home or could not take the call?', COUNT);
  var gate = form.addMultipleChoiceItem()
    .setTitle('क्या पिछले 6 महीनों में आपका कोई भी ऑर्डर डिलीवर नहीं हुआ (आपने मना किया, या डिलीवरी छूट गई)?')
    .setHelpText('In the last 6 months, did any of your orders NOT get delivered (you refused it, or missed it)?')
    .setRequired(true);

  // ---------- PAGE 5: THE LAST FAILED DELIVERY ----------
  var pageFail = form.addPageBreakItem()
    .setTitle('आख़िरी बार जब डिलीवरी नहीं हुई | The last time a delivery failed')
    .setHelpText('सिर्फ़ सबसे हाल की घटना के बारे में सोचें। / Think only about the most recent time.');
  mc('उस बार क्या हुआ था?', 'What happened that time?',
     ['मैंने ऑर्डर लेने से मना कर दिया / I refused the order',
      'मैं घर पर नहीं था/थी / I was not at home',
      'मैं फ़ोन नहीं उठा पाया/पाई / I could not take the call',
      'डिलीवरी वाले को पता नहीं मिला / The rider could not find my address',
      'कोई आया ही नहीं, पर ऐप में "attempted" दिखा / Nobody came, but the app showed "attempted"',
      'पता नहीं / Don\'t know']);
  cb('अगर आपने मना किया था, तो क्यों? (जितने लागू हों)', 'If you refused, why? (tick all that apply)',
     ['मन बदल गया / Changed my mind',
      'कहीं और सस्ता मिल गया / Found it cheaper elsewhere',
      'बहुत देर से आया / It took too long to arrive',
      'उस समय कैश नहीं था / Did not have cash at that moment',
      'गलती से ऑर्डर हुआ था / Ordered by mistake',
      'घर में किसी और ने पहले ही मंगा लिया था / Someone at home had already ordered it',
      'फ़ोटो से अलग लग रहा था / Looked different from the photos',
      'ऑर्डर पहचान में नहीं आया / Did not recognise the order'], true);
  mc('डिलीवरी वाले ने आपको कितनी बार कॉल किया?', 'How many times did the delivery person call you?',
     ['एक भी नहीं / Not once', '1 बार / Once', '2 बार / Twice', '3 या ज़्यादा / 3 or more', 'पता नहीं / Don\'t know']);
  mc('क्या डिलीवरी वाले ने कुछ देर इंतज़ार किया?', 'Did the delivery person wait for some time?',
     ['हाँ, कुछ मिनट रुके / Yes, waited a few minutes', 'नहीं, तुरंत चले गए / No, left right away',
      'पता नहीं / Don\'t know']);
  mc('अगर आपको अगले दिन अपनी पसंद के समय पर दोबारा डिलीवरी का विकल्प मिलता, तो क्या आप ऑर्डर ले लेते?',
     'If you had been offered delivery again the next day at a time you choose, would you have taken the order?',
     ['हाँ / Yes', 'शायद / Maybe', 'नहीं, मुझे वो चाहिए ही नहीं था / No, I did not want it anymore']);
  mc('डिलीवरी फेल होने के बाद क्या Meesho/कूरियर से किसी ने आपको कॉल करके पूछा कि क्या हुआ?',
     'After the delivery failed, did anyone from the app/courier call you to ask what happened?',
     [YES, NO, 'याद नहीं / Don\'t remember']);

  // ---------- PAGE 6: TWO QUICK IDEAS ----------
  var pageIdeas = form.addPageBreakItem()
    .setTitle('दो छोटे सवाल, नए विचारों पर | Two quick questions on new ideas')
    .setHelpText('कोई सही या गलत जवाब नहीं है। "नहीं" भी उतना ही काम का जवाब है। / There is no right answer; "no" is just as useful.');
  mc('मान लीजिए डिलीवरी वाले दिन WhatsApp पर मैसेज आए: "आज आपका ऑर्डर आएगा: ✅ मैं घर पर हूँ | 🕐 समय बदलें | 📍 पता ठीक करें"। आप क्या करेंगे?',
     'Suppose on delivery day you get a WhatsApp: "Your order arrives today: I\'m home | Change time | Fix address". What would you do?',
     ['ज़रूर जवाब दूँगा/दूँगी / Would definitely reply', 'शायद जवाब दूँ / Might reply',
      'जवाब नहीं दूँगा/दूँगी / Would not reply']);
  mc('अगर उसी मैसेज में विकल्प हो: "अभी UPI से पेमेंट करें, डिलीवरी आसान", तो आप क्या करेंगे?',
     'If the same message offered "Pay now by UPI for a hassle-free delivery", what would you do?',
     ['पेमेंट कर दूँगा/दूँगी, छूट के बिना भी / Would pay now, even without a discount',
      'पेमेंट करूँगा/करूँगी अगर ₹10–20 की छूट मिले / Would pay now if I got ₹10–20 off',
      'नहीं, डिलीवरी पर ही दूँगा/दूँगी / No, I would still pay at the door']);
  mc('अगर आपका ऑर्डर ऐसा पैक हो जो किसी और ग्राहक ने लौटा दिया था, पर पूरी तरह सील-बंद (कभी खोला नहीं गया), और वो आपको 1–2 दिन जल्दी मिल जाए, तो क्या आपको ठीक लगेगा?',
     'If your order came as a pack another buyer had refused, fully sealed (never opened), and it reached you 1–2 days sooner, would that be OK?',
     ['हाँ, ठीक है / Yes, fine', 'ठीक है, अगर पहले बताया जाए / OK if I am told first',
      'नहीं / No']);

  // ---------- LAST ----------
  form.addParagraphTextItem()
    .setTitle('पिछली बार जब कोई डिलीवरी नहीं हुई या आपने मना किया, क्या हुआ था? (अपनी भाषा में, चाहें तो)')
    .setHelpText('Optional: tell us what happened the last time a delivery failed or you refused one. Any language.')
    .setRequired(false);
  mc('यह फ़ॉर्म कैसे भरा गया?', 'How was this form filled?',
     ['खुद / By myself', 'किसी वॉलंटियर की मदद से / With a volunteer\'s help']);

  // ---------- BRANCHING (set after pages exist) ----------
  screener.setChoices([
    screener.createChoice(YES, FormApp.PageNavigationType.CONTINUE),
    screener.createChoice(NO, FormApp.PageNavigationType.SUBMIT)
  ]);
  gate.setChoices([
    gate.createChoice(YES, pageFail),
    gate.createChoice(NO, pageIdeas)
  ]);

  try { form.setPublished(true); } catch (e) { Logger.log('Publish step skipped: ' + e); }
  form.setAcceptingResponses(true);
  var ss = SpreadsheetApp.create('Delivery Survey R2 - Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  Logger.log('SHARE LINK : ' + form.getPublishedUrl());
  Logger.log('EDIT LINK  : ' + form.getEditUrl());
  Logger.log('RESPONSES  : ' + ss.getUrl());
}

// Run this ONLY if the form already exists and you just need its links.
function getLinks() {
  var files = DriveApp.searchFiles(
    "title contains 'Online Delivery Survey' and mimeType = 'application/vnd.google-apps.form' and trashed = false");
  var found = 0;
  while (files.hasNext()) {
    var form = FormApp.openById(files.next().getId());
    found++;
    try { form.setPublished(true); } catch (e) {}
    form.setAcceptingResponses(true);
    Logger.log('FORM ' + found + ' SHARE LINK : ' + form.getPublishedUrl());
    Logger.log('FORM ' + found + ' EDIT LINK  : ' + form.getEditUrl());
  }
  if (found === 0) Logger.log('No form found. Run createSurveyR2 instead.');
}
