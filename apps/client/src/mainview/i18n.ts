import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { electroview } from '../shared/rpc';

import en from './locales/en.json';
import uk from './locales/uk.json';
import es from './locales/es.json';

// Configure i18n initially with english as fallback
i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            uk: { translation: uk },
            es: { translation: es }
        },
        lng: 'en', // default synchronously
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false 
        }
    });

// Request actual language setting asynchronously and apply it instantly
(async () => {
    try {
        const settings = await electroview.rpc?.request.getSettings({});
        if (settings && settings.language) {
            i18n.changeLanguage(settings.language);
        }
    } catch (e) {
        console.error("Failed to load language from RPC", e);
    }
})();

export default i18n;
