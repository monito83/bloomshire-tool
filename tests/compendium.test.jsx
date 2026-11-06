import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import fs from 'fs';

import i18n from '../src/i18n/index';
import megaAtlas from '../public/data/bloomshire/mega_atlas_data.json';
import RegionCompendium from '../src/components/bloomshire/official/RegionCompendium';
import { primeOfficialData } from '../src/components/bloomshire/official/useOfficialData';
import {
  BEAST_PLACE_TO_ATLAS, ADVENTURE_TO_ATLAS, beastsForRegion, adventureForRegion, goldRange
} from '../src/components/bloomshire/official/compendiumModel';

const read = (n) => JSON.parse(fs.readFileSync(`public/data/bloomshire/official/${n}.json`, 'utf8'));
const bestiary = read('bestiary');
const adventure = read('adventure');
const atlasIds = new Set(megaAtlas.regions.map((r) => r.id));

describe('Bestiario y libro de exploracion en el Mega-Atlas: modelo', () => {
  it('todos los lugares del Bestiario tienen region del Mega-Atlas valida', () => {
    for (const b of bestiary.beasts) {
      for (const p of b.places) {
        expect(BEAST_PLACE_TO_ATLAS[p], `${b.id}: ${p}`).toBeTruthy();
        for (const r of BEAST_PLACE_TO_ATLAS[p]) expect(atlasIds.has(r)).toBe(true);
      }
    }
  });

  it('cada criatura aparece en al menos una region', () => {
    const seen = new Set();
    for (const id of atlasIds) for (const b of beastsForRegion(bestiary, id)) seen.add(b.id);
    expect(seen.size).toBe(bestiary.beasts.length);
  });

  it('las regiones del libro de exploracion apuntan a regiones del Mega-Atlas', () => {
    for (const v of Object.values(ADVENTURE_TO_ATLAS)) expect(atlasIds.has(v)).toBe(true);
    for (const r of adventure.regions) if (r.id !== 'caves') expect(ADVENTURE_TO_ATLAS[r.id], r.id).toBeTruthy();
  });

  it('las cuevas se listan en la region desde donde se entra', () => {
    const stone = adventureForRegion(adventure, 'stonepeak');
    expect(stone.places.some((p) => p.cave && p.map === 'cave_gloom')).toBe(true);
    const moon = adventureForRegion(adventure, 'moonmere');
    expect(moon.places.some((p) => p.cave && p.map === 'cave_old_cave')).toBe(true);
    const ww = adventureForRegion(adventure, 'whisperwood');
    expect(ww.places.some((p) => p.cave && p.map === 'cave_glimmer')).toBe(true);
  });

  it('jefes al final y orden por dificultad', () => {
    const list = beastsForRegion(bestiary, 'stonepeak');
    const firstBoss = list.findIndex((b) => b.stats.boss);
    if (firstBoss >= 0) expect(list.slice(firstBoss).every((b) => b.stats.boss)).toBe(true);
    expect(beastsForRegion(bestiary, 'home_island')).toEqual([]);
  });

  it('goldRange', () => {
    expect(goldRange([10, 25])).toBe('10-25');
    expect(goldRange(null)).toBeNull();
  });
});

describe('Bestiario y libro de exploracion en el Mega-Atlas: panel', () => {
  afterEach(async () => { await i18n.changeLanguage('en'); });

  it('muestra lugares y criaturas de Whisperwood en ingles y espanol', async () => {
    primeOfficialData('bestiary', bestiary);
    primeOfficialData('adventure', adventure);
    const en = renderToString(<RegionCompendium regionId="whisperwood" />);
    expect(en).toContain('Exploration book');
    expect(en).toContain('Creatures here');
    expect(en).toContain('Slime');
    await i18n.changeLanguage('es');
    const es = renderToString(<RegionCompendium regionId="whisperwood" />);
    expect(es).toContain('Libro de exploración');
    expect(es).toContain('Criaturas de la zona');
  });

  it('no muestra nada sin datos ni region', () => {
    expect(renderToString(<RegionCompendium regionId="nope" />)).toBe('<div class="space-y-2.5"></div>');
  });
});
