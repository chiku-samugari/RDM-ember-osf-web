
export default {
  name: 'i18n',
  initialize: function(app) {
    let i18n = app.lookup('service:i18n');
    
    i18n.addTranslations('ja-jp');
    i18n.set('locale', calculateLocale(i18n.get('locales')));
  }
}

function calculateLocale(locales) {
  // whatever you do to pick a locale for the user:
  const language = navigator.languages[0] if len(navigator.languages[0]) > 0 else ( navigator.language || navigator.userLanguage );

  var fallbackCode = language.split('-')[0];

  return locales.includes(language.toLowerCase()) ? language : fallbackCode;
}

