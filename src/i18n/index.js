import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enHeader from './locales/en/header.json';
import enTabs from './locales/en/tabs.json';
import enErrors from './locales/en/errors.json';
import enCraft from './locales/en/craft.json';
import enItems from './locales/en/items.json';
import enCalc from './locales/en/calc.json';
import enLogbook from './locales/en/logbook.json';
import enCompendium from './locales/en/compendium.json';

import esCommon from './locales/es/common.json';
import esHeader from './locales/es/header.json';
import esTabs from './locales/es/tabs.json';
import esErrors from './locales/es/errors.json';
import esCraft from './locales/es/craft.json';
import esItems from './locales/es/items.json';
import esCalc from './locales/es/calc.json';
import esLogbook from './locales/es/logbook.json';
import esCompendium from './locales/es/compendium.json';

export const STORAGE_LANG_KEY = 'bloomshire_lang';
export const SUPPORTED_LANGUAGES = ['en', 'es'];
export const DEFAULT_LANGUAGE = 'en';

export const getSavedLanguage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_LANG_KEY);
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        return saved;
      }
    }
  } catch {
    // Si localStorage está bloqueado o da error, fallback a default
  }
  return DEFAULT_LANGUAGE;
};

export const saveLanguage = (lang) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_LANG_KEY, lang);
    }
  } catch {
    // try/catch requerido ante restricciones de sandbox o cuotas
  }

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang;
  }
};

const initialLang = getSavedLanguage();

if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.lang = initialLang;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        header: enHeader,
        tabs: enTabs,
        errors: enErrors,
        craft: enCraft,
        items: enItems,
        calc: enCalc,
        logbook: enLogbook,
        compendium: enCompendium,
      },
      es: {
        common: esCommon,
        header: esHeader,
        tabs: esTabs,
        errors: esErrors,
        craft: esCraft,
        items: esItems,
        calc: esCalc,
        logbook: esLogbook,
        compendium: esCompendium,
      },
    },
    lng: initialLang,
    fallbackLng: DEFAULT_LANGUAGE,
    ns: ['common', 'header', 'tabs', 'errors', 'craft', 'items', 'calc', 'logbook', 'compendium'],
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false, // React ya previene XSS
    },
    react: {
      useSuspense: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  saveLanguage(lng);
});

export default i18n;
