function calculateLocale(locales) {
    // whatever you do to pick a locale for the user:
    const language = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage;
    const fallbackCode = language.split('-')[0];

    return locales.includes(language.toLowerCase()) ? language : fallbackCode;
}

export default {
    name: 'intl',
    initialize(app) {
        const intl = app.lookup('service:intl');
        const moment = app.lookup('service:moment');

        moment.setLocale(calculateLocale(intl.get('locales')));
        intl.set('locale', calculateLocale(intl.get('locales')));
    },
};
