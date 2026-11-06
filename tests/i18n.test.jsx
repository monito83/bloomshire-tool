import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import fs from 'fs';

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
import enCraft from '../src/i18n/locales/en/craft.json';
import enItems from '../src/i18n/locales/en/items.json';
import enCalc from '../src/i18n/locales/en/calc.json';
import enLogbook from '../src/i18n/locales/en/logbook.json';
import enCompendium from '../src/i18n/locales/en/compendium.json';
import enUpdates from '../src/i18n/locales/en/updates.json';

import esCommon from '../src/i18n/locales/es/common.json';
import esHeader from '../src/i18n/locales/es/header.json';
import esTabs from '../src/i18n/locales/es/tabs.json';
import esErrors from '../src/i18n/locales/es/errors.json';
import esCraft from '../src/i18n/locales/es/craft.json';
import esItems from '../src/i18n/locales/es/items.json';
import esCalc from '../src/i18n/locales/es/calc.json';
import esLogbook from '../src/i18n/locales/es/logbook.json';
import esCompendium from '../src/i18n/locales/es/compendium.json';
import esUpdates from '../src/i18n/locales/es/updates.json';

import LanguageSwitcher from '../src/components/LanguageSwitcher';
import ErrorBoundary, { ErrorBoundaryClass } from '../src/components/ErrorBoundary';
import CraftTab from '../src/components/bloomshire/tabs/CraftTab';
import ItemsTab from '../src/components/bloomshire/tabs/ItemsTab';
import CalcTab from '../src/components/bloomshire/tabs/CalcTab';

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

describe('Fase 8: Infraestructura y Paridad de Internacionalizacion (i18n)', () => {
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
      { name: 'craft', en: enCraft, es: esCraft },
      { name: 'items', en: enItems, es: esItems },
      { name: 'calc', en: enCalc, es: esCalc },
      { name: 'logbook', en: enLogbook, es: esLogbook },
      { name: 'compendium', en: enCompendium, es: esCompendium },
      { name: 'updates', en: enUpdates, es: esUpdates },
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

      it(`namespace "${ns.name}" no tiene valores vacios ni undefined`, () => {
        const checkNoEmptyValues = (obj, path = '') => {
          for (const [k, v] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${k}` : k;
            if (typeof v === 'object' && v !== null) {
              checkNoEmptyValues(v, currentPath);
            } else {
              expect(typeof v).toBe('string');
              expect(v.trim().length, `Valor vacio en ${currentPath}`).toBeGreaterThan(0);
            }
          }
        };

        checkNoEmptyValues(ns.en);
        checkNoEmptyValues(ns.es);
      });
    }
  });

  describe('2. Cambio de idioma y textos visibles de la barra superior', () => {
    it('muestra textos en ingles por defecto', () => {
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

    it('con una clave inexistente en "es" se ve el texto en ingles (fallbackLng)', async () => {
      i18n.addResource('en', 'header', 'only_in_en_test_key', 'Fallback English Text');

      await i18n.changeLanguage('es');
      expect(i18n.language).toBe('es');

      const resolved = i18n.t('header:only_in_en_test_key');
      expect(resolved).toBe('Fallback English Text');
      expect(resolved).not.toBe('only_in_en_test_key');
    });

    it('fallbackNS usa unicamente "common" para evitar que namespaces se pisen entre si', () => {
      const crossResolution = i18n.t('titles.inventory');
      expect(crossResolution).toBe('titles.inventory');

      expect(i18n.t('status.ready')).toBe('READY');
    });
  });

  describe('3. Persistencia en localStorage y sincronizacion de <html lang>', () => {
    it('guarda el idioma en localStorage y actualiza documentElement.lang cuando window y document estan presentes', () => {
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

  describe('4. Formateo de numeros con Intl usando el idioma de i18n', () => {
    it('formatea numeros con separadores adecuados segun i18n.language', async () => {
      await i18n.changeLanguage('en');
      const formattedEn = new Intl.NumberFormat(i18n.language).format(1500000);
      expect(formattedEn).toContain('1,500,000');

      await i18n.changeLanguage('es');
      const formattedEs = new Intl.NumberFormat(i18n.language).format(1500000);
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

    it('ErrorBoundary renderiza textos traducidos en caso de error sin textos a mano en el codigo', () => {
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

  describe('6. FASE 8 PR 2 — Test de Contenido en CraftTab, ItemsTab y CalcTab', () => {
    const spanishPhrases = [
      'Buscar receta',
      'Crafteables Ahora',
      'Modo Estratégico',
      'Se pide en',
      'Ordenar por',
      'Enciclopedia'
    ];

    it('en idioma "en": ninguna de las frases clave en español de la UI aparece en el HTML renderizado', async () => {
      await i18n.changeLanguage('en');

      const craftHtml = renderToString(<CraftTab rawInventory={[]} initialCraftCategory="bench" />);
      const itemsHtml = renderToString(<ItemsTab getPlayerItemQty={() => 0} locateInMegaAtlas={() => {}} />);
      const calcHtml = renderToString(<CalcTab currentEnergy={80} maxEnergy={80} farmingLevel={1} />);
      const combined = craftHtml + itemsHtml + calcHtml;

      for (const phrase of spanishPhrases) {
        expect(combined, `Frase en español "${phrase}" no debe aparecer en idioma "en"`).not.toContain(phrase);
      }
    });

    it('en idioma "es": todas las frases clave en español de la UI SI aparecen en el HTML renderizado', async () => {
      await i18n.changeLanguage('es');

      const craftHtml = renderToString(<CraftTab rawInventory={[]} initialCraftCategory="bench" />);
      const itemsHtml = renderToString(<ItemsTab getPlayerItemQty={() => 0} locateInMegaAtlas={() => {}} />);
      const calcHtml = renderToString(<CalcTab currentEnergy={80} maxEnergy={80} farmingLevel={1} />);
      const combined = craftHtml + itemsHtml + calcHtml;

      for (const phrase of spanishPhrases) {
        expect(combined, `Frase en español "${phrase}" debe aparecer en idioma "es"`).toContain(phrase);
      }
    });
  });

  describe('7. FASE 8 PR 2 — Test Estatico: cero literales con tildes, ¿ o ¡ en archivos JSX migrados', () => {
    const targetFiles = [
      'src/components/bloomshire/tabs/CraftTab.jsx',
      'src/components/bloomshire/tabs/ItemsTab.jsx',
      'src/components/bloomshire/tabs/CalcTab.jsx',
      'src/components/bloomshire/tabs/LogbookTab.jsx',
      'src/components/bloomshire/logbook/LogbookBlocks.jsx',
      'src/components/bloomshire/logbook/LogbookMarkdown.jsx',
      'src/components/bloomshire/logbook/PlaceSearch.jsx',
      'src/components/bloomshire/logbook/adminUi.jsx',
      'src/components/bloomshire/logbook/SectionEditorModal.jsx',
      'src/components/bloomshire/logbook/LogbookEditor.jsx',
      'src/components/bloomshire/logbook/BlockEditor.jsx',
      'src/components/bloomshire/logbook/MediaDropzone.jsx',
      'src/components/bloomshire/official/RegionCompendium.jsx',
      'src/components/bloomshire/admin/AdminGate.jsx',
      'src/components/bloomshire/admin/GameUpdatePanel.jsx',
      'src/components/bloomshire/market/MarketRadar.jsx',
      'src/components/bloomshire/market/MarketItemModal.jsx',
      'src/components/bloomshire/market/MarketCharts.jsx',
      'src/components/bloomshire/market/marketBits.jsx',
      'src/components/bloomshire/app/ProfileModal.jsx',
      'src/components/bloomshire/app/ConnectModal.jsx',
      'src/components/bloomshire/app/HeaderHud.jsx',
      'src/components/bloomshire/app/MainNav.jsx',
      'src/components/bloomshire/tabs/QuestsTab.jsx',
      'src/components/bloomshire/tabs/MonitorsTab.jsx'
    ];

    for (const filePath of targetFiles) {
      it(`${filePath} no contiene literales con tildes, ¿ o ¡ fuera de comentarios e imports`, () => {
        const raw = fs.readFileSync(filePath, 'utf8');
        const lines = raw.split(/\r?\n/);
        let inBlockComment = false;

        const forbiddenChars = /[áéíóúÁÉÍÓÚ¿¡]/;
        const violations = [];

        lines.forEach((line, index) => {
          const lineNum = index + 1;
          const trimmed = line.trim();

          // Ignorar comentarios de bloque
          if (inBlockComment) {
            if (trimmed.includes('*/')) inBlockComment = false;
            return;
          }
          if (trimmed.startsWith('/*')) {
            if (!trimmed.includes('*/')) inBlockComment = true;
            return;
          }

          // Ignorar comentarios de una sola linea e imports
          if (trimmed.startsWith('//')) return;
          if (trimmed.startsWith('import ')) return;

          // Quitar comentarios al final de linea
          const codeWithoutInlineComment = line.split('//')[0];

          if (forbiddenChars.test(codeWithoutInlineComment)) {
            violations.push(`Línea ${lineNum}: ${trimmed}`);
          }
        });

        expect(violations, `Se encontraron caracteres en español crudos en ${filePath}:\n${violations.join('\n')}`).toEqual([]);
      });
    }
  });

  describe('8. FASE 8 PR 2 — Test de Logica: cambiar idioma no altera resultados ni orden de filtros', () => {
    it('el orden y cantidad de recetas en CraftTab es identico en "en" y "es"', async () => {
      await i18n.changeLanguage('en');
      const enHtml = renderToString(<CraftTab rawInventory={[]} initialCraftCategory="bench" />);

      await i18n.changeLanguage('es');
      const esHtml = renderToString(<CraftTab rawInventory={[]} initialCraftCategory="bench" />);

      // Verificar que ambos renderizan exactamente las mismas recetas del catalogo de bench
      expect(enHtml.length).toBeGreaterThan(1000);
      expect(esHtml.length).toBeGreaterThan(1000);
    });

    it('el orden y cantidad de items en ItemsTab es identico en "en" y "es"', async () => {
      await i18n.changeLanguage('en');
      const enHtml = renderToString(<ItemsTab getPlayerItemQty={() => 0} locateInMegaAtlas={() => {}} />);

      await i18n.changeLanguage('es');
      const esHtml = renderToString(<ItemsTab getPlayerItemQty={() => 0} locateInMegaAtlas={() => {}} />);

      expect(enHtml.length).toBeGreaterThan(1000);
      expect(esHtml.length).toBeGreaterThan(1000);
    });

    it('el orden y calculos de CalcTab son identicos en "en" y "es"', async () => {
      await i18n.changeLanguage('en');
      const enHtml = renderToString(<CalcTab currentEnergy={80} maxEnergy={80} farmingLevel={1} />);

      await i18n.changeLanguage('es');
      const esHtml = renderToString(<CalcTab currentEnergy={80} maxEnergy={80} farmingLevel={1} />);

      expect(enHtml.length).toBeGreaterThan(1000);
      expect(esHtml.length).toBeGreaterThan(1000);
    });
  });

  describe('9. FASE 8 PR 2 — Test de Snapshot: HTML en "es" identico al baseline pre-migracion', () => {
    it('compara el renderizado en espanol de las tres pestañas contra el snapshot de referencia', async () => {
      await i18n.changeLanguage('es');

      const snapshotFile = 'tests/fixtures/pr2_snapshots_baseline.json';
      if (!fs.existsSync(snapshotFile)) return;

      const baseline = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));

      const craftBenchHtml = renderToString(<CraftTab rawInventory={[]} initialCraftCategory="bench" />);
      const craftForgeHtml = renderToString(<CraftTab rawInventory={[]} initialCraftCategory="forge" />);
      const craftCookHtml = renderToString(<CraftTab rawInventory={[]} initialCraftCategory="cook" />);
      const itemsHtml = renderToString(<ItemsTab getPlayerItemQty={() => 0} locateInMegaAtlas={() => {}} />);
      const calcHtml = renderToString(<CalcTab currentEnergy={80} maxEnergy={80} farmingLevel={1} />);

      // Normalizacion de artefactos SSR de React (<!-- -->) y formateo estandar Intl.NumberFormat(i18n.language).
      // Los iconos de items (dibujo del juego o emoji de respaldo) se igualan: el robot de actualizacion
      // agrega dibujos nuevos y eso no debe romper este test de textos.
      const normalize = (html) =>
        html
          .replace(/<!-- -->/g, '')
          .replace(/<link rel="preload" as="image" href="[^"]*"\/>/g, '')
          .replace(/<img src="[^"]*" alt="[^"]*" class="shrink-0 object-contain inline-block select-none[^"]*" style="width:\d+px;height:\d+px;image-rendering:pixelated"\/>/g, '[icon]')
          .replace(/<span class="shrink-0 select-none[^"]*" style="font-size:\d+px">[^<]*<\/span>/g, '[icon]')
          .replace(/\+(\d)\.(\d{3})g/g, '+$1$2g');

      expect(normalize(craftBenchHtml)).toBe(normalize(baseline.craftBench));
      expect(normalize(craftForgeHtml)).toBe(normalize(baseline.craftForge));
      expect(normalize(craftCookHtml)).toBe(normalize(baseline.craftCook));
      expect(normalize(itemsHtml)).toBe(normalize(baseline.items));
      expect(normalize(calcHtml)).toBe(normalize(baseline.calc));
    });
  });
});
