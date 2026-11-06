import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import fs from 'fs';

import i18n from '../src/i18n/index';
import ItemsTab from '../src/components/bloomshire/tabs/ItemsTab';
import { primeOfficialData } from '../src/components/bloomshire/official/useOfficialData';
import encyclopedia from '../public/data/bloomshire/item_encyclopedia.json';

const DIR = 'public/data/bloomshire/official';
const read = (n) => JSON.parse(fs.readFileSync(`${DIR}/${n}.json`, 'utf8'));
const codex = read('codex');
const meta = read('meta');
const skills = read('skills');
const bestiary = read('bestiary');
const adventure = read('adventure');

describe('Datos oficiales generados (scripts/build_official_data.mjs)', () => {
  it('meta coincide con los archivos', () => {
    expect(meta.gameVersion).toMatch(/^[0-9a-f]{12}$/);
    expect(meta.counts.codex).toBe(codex.items.length);
    expect(meta.counts.beasts).toBe(bestiary.beasts.length);
    expect(meta.counts.places).toBe(adventure.regions.reduce((a, r) => a + r.places.length, 0));
  });

  it('codice: capitulos suman los items, ids unicos y nombre en ingles siempre', () => {
    expect(codex.chapters.reduce((a, c) => a + c.count, 0)).toBe(codex.items.length);
    expect(new Set(codex.items.map((i) => i.id)).size).toBe(codex.items.length);
    for (const i of codex.items) {
      expect(i.name_en, i.id).toBeTruthy();
      expect(codex.chapters.some((c) => c.id === i.chapter)).toBe(true);
      for (const k of ['gives', 'xp', 'from', 'uses']) {
        expect(Array.isArray(i[`${k}_en`])).toBe(true);
        if (i[`${k}_es`]) expect(i[`${k}_es`]).toHaveLength(i[`${k}_en`].length);
      }
    }
  });

  it('la mayoria de los items de la enciclopedia tienen pagina en el codice', () => {
    const ids = new Set(codex.items.map((i) => i.id));
    const matched = encyclopedia.filter((e) => ids.has(e.id)).length;
    expect(matched / encyclopedia.length).toBeGreaterThan(0.8);
  });

  it('habilidades con desbloqueos ordenados por nivel', () => {
    expect(skills.map((s) => s.id)).toEqual(expect.arrayContaining(['farming', 'cooking', 'fishing', 'mining', 'combat']));
    for (const s of skills) {
      const levels = s.unlocks.map((u) => u.level);
      expect([...levels].sort((a, b) => a - b)).toEqual(levels);
      for (const u of s.unlocks) expect(u.level).toBeLessThanOrEqual(s.maxLevel);
    }
    const cooking = skills.find((s) => s.id === 'cooking');
    expect(cooking.unlocks.find((u) => u.level === 2).text_es).toContain('Pan');
  });

  it('bestiario: cada criatura pertenece a una familia y tiene estadisticas', () => {
    const fam = new Set(bestiary.families.map((f) => f.id));
    for (const b of bestiary.beasts) {
      expect(fam.has(b.family)).toBe(true);
      expect(b.stats.hp).toBeGreaterThan(0);
    }
  });
});

describe('Buscador de items con el Codice oficial', () => {
  afterEach(async () => { await i18n.changeLanguage('en'); });

  it('muestra nombre, efectos, experiencia y origen oficiales en el idioma elegido', async () => {
    primeOfficialData('codex', codex);
    primeOfficialData('meta', meta);
    await i18n.changeLanguage('en');
    const en = renderToString(<ItemsTab getPlayerItemQty={() => 0} locateInMegaAtlas={() => {}} />);
    expect(en).toContain('Official Codex');
    expect(en).toContain('Grown from Carrot seeds');
    await i18n.changeLanguage('es');
    const es = renderToString(<ItemsTab getPlayerItemQty={() => 0} locateInMegaAtlas={() => {}} />);
    expect(es).toContain('Códice oficial');
    expect(es).toContain('Se cultiva de Semillas de zanahoria');
    expect(es).toContain('xp de Cultivo');
  });
});

describe('Misiones en ingles (official/quests.json)', () => {
  it('usa el nombre y los pasos del juego cuando coinciden', async () => {
    const { localizeQuest, DASHBOARD_QUEST_CATALOG } = await import('../src/components/bloomshire/bloomshireHelpers');
    const en = localizeQuest(DASHBOARD_QUEST_CATALOG.bk03, 'en');
    expect(en.name).toBe('Ch. 3: First Harvest');
    expect(en.steps[0].name).toBe('Water the carrots');
    expect(en.steps[0].where).toContain('Ch. 3: First Harvest');
    expect(localizeQuest(DASHBOARD_QUEST_CATALOG.bk03, 'es')).toBe(DASHBOARD_QUEST_CATALOG.bk03);
    expect(localizeQuest(DASHBOARD_QUEST_CATALOG.sd_otto, 'en').name).toBe('Side: Soup for the Lamplighter');
  });
});
