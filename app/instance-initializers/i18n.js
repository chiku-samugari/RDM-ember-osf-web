function calculateLocale(locales) {
    // whatever you do to pick a locale for the user:
    const language = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage;
    const fallbackCode = language.split('-')[0];

    return locales.includes(language.toLowerCase()) ? language : fallbackCode;
}

export default {
    name: 'i18n',
    initialize(app) {
        const i18n = app.lookup('service:i18n');

        i18n.addTranslations('ja-jp');
        i18n.set('locale', calculateLocale(i18n.get('locales')));
    },
};
