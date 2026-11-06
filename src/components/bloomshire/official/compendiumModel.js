// src/components/bloomshire/official/compendiumModel.js
// Une los datos oficiales del juego (Bestiario y libro de exploracion) con las
// regiones del Mega-Atlas.
//
// Lugares del Bestiario -> region del Mega-Atlas. Las cuevas y la Mazmorra se
// asignan a la region desde donde se entra, verificado con las puertas de
// mega_atlas_data.json: cave_old_cave en Moonmere, cave_glimmer en Whisperwood,
// cave_old_working / green_vein / gloom / vault / topaz_drift en Stonepeak, y
// colosseum / dungeon_court en el barrio VIP. "keep" y "crypt" son los modos
// dificil y pesadilla de la Mazmorra (bestiarytext.js beastPlaceOf: dungeon_h / dungeon_n).
// "valley" es el mapa principal alrededor del pueblo.

export const BEAST_PLACE_TO_ATLAS = {
  valley: ['bloomshire_town', 'southvale', 'moonmere', 'bloomshire_bay'],
  whisperwood: ['whisperwood'],
  glimmer: ['whisperwood'],
  stonepeak: ['stonepeak'],
  old_working: ['stonepeak'],
  green_vein: ['stonepeak'],
  gloom: ['stonepeak'],
  vault: ['stonepeak'],
  topaz: ['stonepeak'],
  old_cave: ['moonmere'],
  frosthaven: ['frosthaven'],
  everbloom: ['everbloom'],
  barrowmire: ['barrowmire'],
  colosseum: ['vip_quarter'],
  dungeon: ['vip_quarter'],
  keep: ['vip_quarter'],
  crypt: ['vip_quarter']
};

/** Region del libro de exploracion -> region del Mega-Atlas. */
export const ADVENTURE_TO_ATLAS = {
  home: 'home_island',
  town: 'bloomshire_town',
  moonmere: 'moonmere',
  southvale: 'southvale',
  bay: 'bloomshire_bay',
  whisperwood: 'whisperwood',
  stonepeak: 'stonepeak',
  frosthaven: 'frosthaven',
  everbloom: 'everbloom',
  barrowmire: 'barrowmire',
  dreaming: 'dreaming_fields',
  vip: 'vip_quarter'
};

/** Mapa de cueva -> region del Mega-Atlas desde la que se entra. */
const CAVE_MAP_TO_ATLAS = {
  cave_old_cave: 'moonmere',
  cave_glimmer: 'whisperwood',
  cave_mirror_grotto: 'whisperwood'
};
const caveRegion = (map) => CAVE_MAP_TO_ATLAS[map] || (String(map || '').startsWith('cave_') ? 'stonepeak' : null);

export const FAMILY_ICONS = {
  slimes: '🟢', kings: '👑', plants: '🌿', beasts: '🐺', goblins: '👺',
  spiders: '🕷️', golems: '🗿', dead: '💀', fiends: '👻'
};

export const WEAPON_ICONS = { blade: '⚔️', bow: '🏹', staff: '🪄' };

/** Criaturas que viven en una region del Mega-Atlas, jefes al final, por dificultad. */
export function beastsForRegion(bestiary, atlasRegionId) {
  if (!bestiary || !atlasRegionId) return [];
  return bestiary.beasts
    .filter((b) => b.places.some((p) => (BEAST_PLACE_TO_ATLAS[p] || []).includes(atlasRegionId)))
    .sort((a, b) => Number(a.stats.boss) - Number(b.stats.boss) || a.tier - b.tier || (a.stats.hp || 0) - (b.stats.hp || 0));
}

/**
 * Entrada del libro de exploracion para una region del Mega-Atlas:
 * { region, places } con los lugares propios y las cuevas que se entran desde ahi.
 */
export function adventureForRegion(adventure, atlasRegionId) {
  if (!adventure || !atlasRegionId) return null;
  const region = adventure.regions.find((r) => ADVENTURE_TO_ATLAS[r.id] === atlasRegionId) || null;
  const caves = adventure.regions
    .filter((r) => !ADVENTURE_TO_ATLAS[r.id])
    .flatMap((r) => r.places.filter((p) => caveRegion(p.map) === atlasRegionId).map((p) => ({ ...p, cave: true })));
  if (!region && !caves.length) return null;
  return { region, places: [...(region ? region.places : []), ...caves] };
}

/** Rango de oro "10-25" o null. */
export const goldRange = (gold) => (Array.isArray(gold) && gold.length === 2 ? `${gold[0]}-${gold[1]}` : null);
