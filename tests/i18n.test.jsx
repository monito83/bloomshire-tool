import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';

import i18n, {
  getSavedLanguage,
  saveLanguage,
  STORAGE_LANG_KEY,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES
} from '../src/i18n/index';

import enCommon from '../src/i18n/locales/en/common.json';
import enHeader from '../src/i18n/locales/en/header.json';
import enTabs from '../src/i18n/locales/en/tabs.json';
import enErrors from '../src/i18n/locales/en/errors.json';

import esCommon from '../src/i18n/locales/es/common.json';
import esHeader from '../src/i18n/locales/es/header.json';
import esTabs from '../src/i18n/locales/es/tabs.json';
import esErrors from '../src/i18n/locales/es/errors.json';

import LanguageSwitcher from '../src/components/LanguageSwitcher';
import ErrorBoundary, { ErrorBoundaryClass } from '../src/components/ErrorBoundary';

// Helper recursivo para extraer todas las rutas de claves hojas de un objeto JSON
function getDeepKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(getDeepKeys(obj[key], nextPrefix));
    } else {
      keys.push(nextPrefix);
    }
  }
  return keys.sort();
}

describe('Fase 8: Infraestructura y Paridad de Internacionalización (i18n)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  describe('1. Paridad estricta de claves (en vs es)', () => {
    const namespaces = [
      { name: 'common', en: enCommon, es: esCommon },
      { name: 'header', en: enHeader, es: esHeader },
      { name: 'tabs', en: enTabs, es: esTabs },
      { name: 'errors', en: enErrors, es: esErrors },
    ];

    for (const ns of namespaces) {
      it(`namespace "${ns.name}" tiene paridad 1:1 de claves entre en y es`, () => {
        const enKeys = getDeepKeys(ns.en);
        const esKeys = getDeepKeys(ns.es);

        const missingInEs = enKeys.filter(k => !esKeys.includes(k));
        const extraInEs = esKeys.filter(k => !enKeys.includes(k));

        expect(missingInEs, `Claves en "en/${ns.name}.json" faltantes en "es/${ns.name}.json"`).toEqual([]);
        expect(extraInEs, `Claves en "es/${ns.name}.json" inexistentes en "en/${ns.name}.json"`).toEqual([]);
        expect(enKeys).toEqual(esKeys);
      });

      it(`namespace "${ns.name}" no tiene valores vacíos ni undefined`, () => {
        const checkNoEmptyValues = (obj, path = '') => {
          for (const [k, v] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${k}` : k;
            if (typeof v === 'object' && v !== null) {
              checkNoEmptyValues(v, currentPath);
            } else {
              expect(typeof v).toBe('string');
              expect(v.trim().length, `Valor vacío en ${currentPath}`).toBeGreaterThan(0);
            }
          }
        };

        checkNoEmptyValues(ns.en);
        checkNoEmptyValues(ns.es);
      });
    }
  });

  describe('2. Cambio de idioma y textos visibles de la barra superior', () => {
    it('muestra textos en inglés por defecto', () => {
      expect(i18n.language).toBe('en');
      expect(i18n.t('header:mode.freeGuide')).toBe('Free Community Guide');
      expect(i18n.t('header:disconnect.button')).toBe('Disconnect');
      expect(i18n.t('tabs:titles.inventory')).toBe('ECONOMY & SHOPS');
    });

    it('cambiar a "es" cambia textos visibles de la barra superior y pestañas', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.language).toBe('es');
      expect(i18n.t('header:mode.freeGuide')).toBe('Guía Comunitaria Libre');
      expect(i18n.t('header:disconnect.button')).toBe('Desconectar');
      expect(i18n.t('tabs:titles.inventory')).toBe('ECONOMÍA & TIENDAS');
      expect(i18n.t('tabs:titles.mega_atlas')).toBe('MEGA-ATLAS HD');
    });

    it('con una clave inexistente en "es" se ve el texto en inglés (fallbackLng)', async () => {
      // Registrar dinámicamente una clave que solo existe en 'en'
      i18n.addResource('en', 'header', 'only_in_en_test_key', 'Fallback English Text');

      await i18n.changeLanguage('es');
      expect(i18n.language).toBe('es');

      const resolved = i18n.t('header:only_in_en_test_key');
      expect(resolved).toBe('Fallback English Text');
      expect(resolved).not.toBe('only_in_en_test_key');
    });
  });

  describe('3. Persistencia en localStorage y sincronización de <html lang>', () => {
    it('guarda el idioma en localStorage y actualiza documentElement.lang cuando window y document están presentes', () => {
      const storageMock = {};
      const prevWindow = globalThis.window;
      const prevDoc = globalThis.document;

      try {
        globalThis.window = {
          localStorage: {
            getItem: (k) => storageMock[k] || null,
            setItem: (k, v) => { storageMock[k] = String(v); }
          }
        };
        globalThis.document = {
          documentElement: { lang: 'en' }
        };

        saveLanguage('es');
        expect(storageMock[STORAGE_LANG_KEY]).toBe('es');
        expect(globalThis.document.documentElement.lang).toBe('es');

        saveLanguage('en');
        expect(storageMock[STORAGE_LANG_KEY]).toBe('en');
        expect(globalThis.document.documentElement.lang).toBe('en');
      } finally {
        globalThis.window = prevWindow;
        globalThis.document = prevDoc;
      }
    });

    it('getSavedLanguage maneja try/catch con seguridad ante errores de localStorage', () => {
      const prevWindow = globalThis.window;
      try {
        globalThis.window = {
          localStorage: {
            getItem: () => {
              throw new Error('Storage access denied');
            }
          }
        };
        const lang = getSavedLanguage();
        expect(lang).toBe(DEFAULT_LANGUAGE);
      } finally {
        globalThis.window = prevWindow;
      }
    });

    it('saveLanguage maneja try/catch con seguridad ante cuotas o errores de setItem', () => {
      const prevWindow = globalThis.window;
      try {
        globalThis.window = {
          localStorage: {
            setItem: () => {
              throw new Error('QuotaExceededError');
            }
          }
        };
        expect(() => saveLanguage('es')).not.toThrow();
      } finally {
        globalThis.window = prevWindow;
      }
    });
  });

  describe('4. Formateo de números con Intl usando el idioma de i18n', () => {
    it('formatea números con separadores adecuados según i18n.language', async () => {
      await i18n.changeLanguage('en');
      const formattedEn = new Intl.NumberFormat(i18n.language).format(1500000);
      expect(formattedEn).toContain('1,500,000');

      await i18n.changeLanguage('es');
      const formattedEs = new Intl.NumberFormat(i18n.language).format(1500000);
      // En español se utiliza punto como separador de miles
      expect(formattedEs).toContain('1.500.000');
    });
  });

  describe('5. Componente LanguageSwitcher y ErrorBoundary', () => {
    it('LanguageSwitcher se renderiza con botones EN y ES accesibles', () => {
      const html = renderToString(<LanguageSwitcher />);
      expect(html).toContain('EN');
      expect(html).toContain('ES');
      expect(html).toContain('aria-label');
      expect(html).toContain('aria-pressed');
    });

    it('ErrorBoundary renderiza textos traducidos en caso de error', () => {
      // Simular un ErrorBoundary en estado de error
      const mockProps = {
        title: undefined,
        t: (key) => {
          const map = {
            'boundary.defaultTitle': 'Default Error Title',
            'boundary.description': 'Safe fallback description',
            'boundary.retry': 'Retry Button',
            'boundary.backToAtlas': 'Back to Atlas Button',
          };
          return map[key] || key;
        }
      };

      const errorBoundaryInstance = new ErrorBoundaryClass(mockProps);
      errorBoundaryInstance.state = {
        hasError: true,
        error: new Error('Test crash')
      };

      const rendered = renderToString(errorBoundaryInstance.render());
      expect(rendered).toContain('Default Error Title');
      expect(rendered).toContain('Safe fallback description');
      expect(rendered).toContain('Retry Button');
      expect(rendered).toContain('Test crash');
    });
  });
});
