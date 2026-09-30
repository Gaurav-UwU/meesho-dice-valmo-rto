// Meesho DICE R2: short buyer survey (about 1 minute, 10 taps max).
// Run createSurveyR2 once. If you already made a form, delete the old one in Google Drive.

function createSurveyR2() {
  var form = FormApp.create('ऑनलाइन डिलीवरी सर्वे | Online Delivery Survey (1 मिनट)');
  form.setDescription(
    'IIT Bombay छात्र रिसर्च: ऑनलाइन डिलीवरी क्यों फेल होती है। गुमनाम, सिर्फ़ 1 मिनट।\n' +
    'IIT Bombay student research on why deliveries fail. Anonymous, 1 minute.'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('धन्यवाद! 🙏 Thank you!');

  var YES = 'हाँ / Yes', NO = 'नहीं / No';

  function mc(hi, en, opts) {
    return form.addMultipleChoiceItem().setTitle(hi).setHelpText(en)
      .setChoiceValues(opts).setRequired(true);
  }

  // PAGE 1: screener
  var screener = form.addMultipleChoiceItem()
    .setTitle('पिछले 6 महीनों में क्या आपने कोई ऑर्डर कैश ऑन डिलीवरी (COD) से मंगाया?')
    .setHelpText('In the last 6 months, did you order anything with Cash on Delivery (COD)?')
    .setRequired(true);

  // PAGE 2: basics
  form.addPageBreakItem().setTitle('आपके बारे में | About you');
  mc('आप कहाँ रहते हैं?', 'Where do you live?',
     ['बड़ा शहर / Metro city', 'मध्यम शहर / Tier-2 city', 'छोटा शहर या गाँव / Small town or village']);
  form.addCheckboxItem()
    .setTitle('डिलीवरी से पहले किस ऐप ने पूछा कि आप घर पर होंगे या नहीं?')
    .setHelpText('Which apps asked, before delivery, whether you would be at home? (tick all)')
    .setChoiceValues(['Flipkart', 'Amazon', 'Meesho', 'किसी ने नहीं पूछा / None asked'])
    .setRequired(true);
  var gate = form.addMultipleChoiceItem()
    .setTitle('पिछले 6 महीनों में क्या आपका कोई ऑर्डर डिलीवर नहीं हुआ (आपने मना किया या छूट गया)?')
    .setHelpText('In the last 6 months, did any order NOT get delivered (you refused it or missed it)?')
    .setRequired(true);

  // PAGE 3: last failed delivery (only if yes)
  var pageFail = form.addPageBreakItem()
    .setTitle('आख़िरी बार जब डिलीवरी नहीं हुई | The last failed delivery');
  mc('क्या हुआ था?', 'What happened?',
     ['मैंने मना कर दिया / I refused it',
      'मैं घर पर नहीं था/थी / I was not home',
      'ऑर्डर तय तारीख से पहले आ गया, मैं तैयार नहीं था/थी / It came before the promised date, I was not ready',
      'फ़ोन नहीं उठा पाया/पाई / Could not take the call',
      'डिलीवरी वाले को पता नहीं मिला / Rider could not find the address',
      'कोई आया ही नहीं, पर "attempted" दिखा / Nobody came, but it showed "attempted"']);
  mc('डिलीवरी वाले ने कितनी बार कॉल किया?', 'How many times did the rider call you?',
     ['एक भी नहीं / None', '1', '2', '3+', 'पता नहीं / Don\'t know']);
  mc('अगर अगले दिन अपनी पसंद के समय पर दोबारा डिलीवरी मिलती, तो क्या आप ऑर्डर ले लेते?',
     'If offered delivery again the next day at your chosen time, would you have taken it?',
     [YES, 'शायद / Maybe', 'नहीं, चाहिए ही नहीं था / No, did not want it']);

  // PAGE 4: ideas (everyone)
  var pageIdeas = form.addPageBreakItem()
    .setTitle('3 छोटे सवाल | 3 quick questions')
    .setHelpText('"नहीं" भी उतना ही काम का जवाब है। / "No" is just as useful.');
  mc('डिलीवरी के दिन WhatsApp आए: "✅ मैं घर पर हूँ | 🕐 समय बदलें | 📍 पता ठीक करें"। क्या आप जवाब देंगे?',
     'On delivery day a WhatsApp says: "I am home | Change time | Fix address". Would you reply?',
     [YES, 'शायद / Maybe', NO]);
  mc('उसी मैसेज में "अभी UPI से पेमेंट करें" हो, तो?',
     'If it also said "Pay now by UPI", would you?',
     ['हाँ / Yes', 'हाँ, अगर ₹10–20 छूट मिले / Yes, if ₹10–20 off', 'नहीं, डिलीवरी पर ही / No, I pay at the door']);
  mc('किसी और का लौटाया हुआ, पूरी तरह सील-बंद पैक 1–2 दिन जल्दी मिले, तो ठीक है?',
     'A fully sealed pack that another buyer refused, reaching you 1–2 days sooner: OK?',
     ['हाँ / Yes', 'हाँ, अगर पहले बताया जाए / Yes, if told first', NO]);
  form.addTextItem()
    .setTitle('कुछ और कहना हो तो (वैकल्पिक)')
    .setHelpText('Anything else? (optional)')
    .setRequired(false);

  // Branching
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

  var ss = SpreadsheetApp.create('Delivery Survey R2 (short) - Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  Logger.log('SHARE LINK : ' + form.getPublishedUrl());
  Logger.log('EDIT LINK  : ' + form.getEditUrl());
  Logger.log('RESPONSES  : ' + ss.getUrl());
}

// Prints links of existing survey forms (and makes sure they accept responses).
function getLinks() {
  var files = DriveApp.searchFiles(
    "title contains 'Online Delivery Survey' and mimeType = 'application/vnd.google-apps.form' and trashed = false");
  var found = 0;
  while (files.hasNext()) {
    var form = FormApp.openById(files.next().getId());
    found++;
    try { form.setPublished(true); } catch (e) {}
    form.setAcceptingResponses(true);
    Logger.log('FORM ' + found + ' (' + form.getTitle() + ')');
    Logger.log('  SHARE LINK : ' + form.getPublishedUrl());
    Logger.log('  EDIT LINK  : ' + form.getEditUrl());
  }
  if (found === 0) Logger.log('No form found. Run createSurveyR2 instead.');
}
