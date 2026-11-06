/**
 * scripts/build_official_data.mjs — DATOS OFICIALES DEL JUEGO (fase 11)
 *
 * Ejecuta las mismas funciones que usan los libros del juego (Codice, libros de
 * habilidades, Bestiario, libro de exploracion) sobre una version descargada del
 * juego y guarda el resultado como JSON, en ingles y en espanol (traducido con
 * el propio traductor del juego y su lang/es.json).
 *
 * Uso:
 *   1) powershell -ExecutionPolicy Bypass -File .\game-sources\descargar_fuentes.ps1
 *   2) npm run build:official            (usa la descarga mas reciente de game-sources/v-*)
 *      npm run build:official -- --src game-sources/v-4ccdce8f2b1e
 *
 * Salida: public/data/bloomshire/official/{meta,codex,skills,bestiary,adventure}.json
 * Los textos en espanol son null cuando el juego todavia no los traduce (se muestra el ingles).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { installShims } from './lib/gameShims.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public/data/bloomshire/official');

function pickSource() {
  const i = process.argv.indexOf('--src');
  if (i > 0 && process.argv[i + 1]) return path.resolve(ROOT, process.argv[i + 1]);
  const base = path.join(ROOT, 'game-sources');
  const dirs = fs.existsSync(base)
    ? fs.readdirSync(base).filter((d) => d.startsWith('v-') && fs.existsSync(path.join(base, d, 'js/game/codexdata.js')))
    : [];
  if (!dirs.length) {
    throw new Error('No hay ninguna descarga del juego en game-sources/v-*. Corre primero game-sources/descargar_fuentes.ps1');
  }
  const stamp = (d) => {
    try { return /date=(\S+)/.exec(fs.readFileSync(path.join(base, d, 'VERSION.txt'), 'utf8'))?.[1] || ''; } catch { return ''; }
  };
  dirs.sort((a, b) => stamp(a).localeCompare(stamp(b)));
  return path.join(base, dirs[dirs.length - 1]);
}

const SRC = pickSource();
installShims(SRC);
const mod = (rel) => import(pathToFileURL(path.join(SRC, 'js', rel)).href);

const i18n = await mod('i18n.js');
await i18n.setLang('es', { keep: false });

/** Lista de nombres "A, B and C": la traduce nombre por nombre si el juego conoce todos. */
function trNameList(en) {
  // "Spring Onion and Wheat seeds" -> "Semillas: Cebolleta y Trigo"
  const seeds = /^(Rare )?(.+) seeds$/.exec(en);
  if (seeds) {
    const inner = trNameList(seeds[2]) || (i18n.t(seeds[2]) !== seeds[2] ? i18n.t(seeds[2]) : null);
    return inner ? `${seeds[1] ? 'Semillas raras' : 'Semillas'}: ${inner}` : null;
  }
  const m = /^(.+?)(?: and | y )([^,]+)$/.exec(en);
  if (!m) return null;
  const names = [...m[1].split(', '), m[2]].map((x) => x.trim()).filter(Boolean);
  const out = names.map((n) => i18n.t(n));
  if (out.every((x, i) => x === names[i])) return null;
  if (out.filter((x, i) => x === names[i]).length > names.length / 2) return null;
  return `${out.slice(0, -1).join(', ')} y ${out[out.length - 1]}`;
}

/** { en, es } — es es null si el juego no lo traduce. */
const tr = (s) => {
  const en = s == null ? '' : String(s);
  let es = en ? i18n.t(en) : '';
  if (es === en) es = trNameList(en) || es;
  return { en, es: es && es !== en ? es : null };
};
const trList = (list) => (list || []).map((s) => tr(s));
const flat = (obj, key, s) => { const v = tr(s); obj[`${key}_en`] = v.en; obj[`${key}_es`] = v.es; return obj; };
const flatList = (obj, key, list) => {
  const v = trList(list);
  obj[`${key}_en`] = v.map((x) => x.en);
  obj[`${key}_es`] = v.some((x) => x.es) ? v.map((x) => x.es ?? x.en) : null;
  return obj;
};

// ---------------------------------------------------------------------------
// Codice (las 360 cosas)
// ---------------------------------------------------------------------------
const codexData = await mod('game/codexdata.js');
const book = codexData.codexBook();
const codex = {
  chapters: codexData.CODEX_CHAPTERS.map((c) => flat({ id: c.id, count: book.find((b) => b.id === c.id)?.pages.length ?? 0 }, 'name', c.name)),
  items: []
};
for (const chapter of book) {
  for (const p of chapter.pages) {
    const item = { id: p.id, chapter: chapter.id, rarity: p.rarity || null };
    flat(item, 'name', p.name);
    flat(item, 'about', p.about || '');
    flatList(item, 'gives', p.gives);
    flatList(item, 'xp', p.xp);
    flatList(item, 'from', p.from);
    item.uses = (p.uses || []).slice();
    flatList(item, 'uses', p.uses);
    flat(item, 'worth', p.worth || '');
    codex.items.push(item);
  }
}

// ---------------------------------------------------------------------------
// Habilidades: que desbloquea cada nivel y que mejora
// ---------------------------------------------------------------------------
const skillbook = await mod('game/skillbook.js');
const catalog = await mod('game/catalog.js');
const MAX = catalog.MAX_LEVEL || 30;
const skills = Object.entries(skillbook.SKILL_NAMES).map(([id, name]) => {
  const s = flat({ id, maxLevel: MAX }, 'name', name);
  s.unlocks = skillbook.unlocksOf(id).map((u) => flat({ level: u.level }, 'text', u.text));
  s.perks = [];
  for (let L = 1; L <= MAX; L++) {
    const perk = skillbook.perkOf(id, L);
    if (perk) s.perks.push(flat({ level: L }, 'text', perk));
  }
  s.coming = trList(skillbook.COMING?.[id] || []);
  return s;
});

// ---------------------------------------------------------------------------
// Bestiario
// ---------------------------------------------------------------------------
const rules = await mod('game/rules.js');
const bt = await mod('game/bestiarytext.js');
const be = await mod('game/bestiary.js');
const bestiary = {
  families: bt.BEAST_FAMILIES.map((f) => flat({ id: f.id, kinds: f.kinds.slice() }, 'name', f.name)),
  beasts: []
};
for (const f of bt.BEAST_FAMILIES) {
  for (const kind of f.kinds) {
    const d = rules.ENEMIES[kind];
    if (!d) continue;
    const b = { id: kind, family: f.id, tier: bt.BEAST_TIERS[kind] ?? 0, reward: bt.beastReward(kind) };
    flat(b, 'name', d.name || kind);
    flat(b, 'description', bt.BEAST_WORDS[kind] || '');
    flatList(b, 'facts', be.beastFacts(kind));
    flat(b, 'where', be.beastWhere(kind) || '');
    b.places = (bt.BEAST_PLACES[kind] || []).slice();
    b.stats = {
      hp: d.hp ?? null, damage: d.damage ?? null, speed: d.speed ?? null,
      gold: Array.isArray(d.gold) ? d.gold.slice() : null, boss: Boolean(d.boss)
    };
    const bw = rules.BOSS_WEAPONS?.[kind];
    b.weapons = bw ? { immune: bw.immune ?? null, weak: bw.weak ?? null } : null;
    bestiary.beasts.push(b);
  }
}

// ---------------------------------------------------------------------------
// Libro de exploracion: regiones y lugares
// ---------------------------------------------------------------------------
const adv = await mod('game/adventuretext.js');
const adventure = {
  regions: adv.ADV_REGIONS.map((r) => {
    const region = { id: r.id, map: r.map ?? null };
    flat(region, 'name', r.name);
    flat(region, 'about', r.about || '');
    flat(region, 'hint', r.hint || '');
    region.places = (r.places || []).map((p) => {
      const place = { id: p.id, map: p.map ?? r.map ?? null, at: p.at ?? null };
      flat(place, 'name', p.name);
      flat(place, 'words', p.words || '');
      flat(place, 'way', p.way || '');
      return place;
    });
    return region;
  })
};

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------
const versionTxt = fs.existsSync(path.join(SRC, 'VERSION.txt')) ? fs.readFileSync(path.join(SRC, 'VERSION.txt'), 'utf8') : '';
const meta = {
  gameVersion: /version=(\S+)/.exec(versionTxt)?.[1] || path.basename(SRC).replace(/^v-/, ''),
  rulesHash: /rules=(\S+)/.exec(versionTxt)?.[1] || null,
  downloadedAt: /date=(\S+)/.exec(versionTxt)?.[1] || null,
  generatedAt: new Date().toISOString(),
  counts: {
    codex: codex.items.length,
    skills: skills.length,
    beasts: bestiary.beasts.length,
    regions: adventure.regions.length,
    places: adventure.regions.reduce((a, r) => a + r.places.length, 0)
  },
  note: 'Datos generados con scripts/build_official_data.mjs a partir del juego Bloomshire. Textos del juego, uso con credito.'
};

fs.mkdirSync(OUT, { recursive: true });
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(data, null, 1)}\n`, 'utf8');
write('codex.json', codex);
write('skills.json', skills);
write('bestiary.json', bestiary);
write('adventure.json', adventure);
write('meta.json', meta);

const esShare = (items, key) => {
  const withEn = items.filter((x) => x[`${key}_en`]);
  return withEn.length ? Math.round((100 * withEn.filter((x) => x[`${key}_es`]).length) / withEn.length) : 100;
};
console.log(`Datos oficiales: version ${meta.gameVersion} (reglas ${meta.rulesHash})`);
console.log(`  codice ${meta.counts.codex} cosas (nombres en espanol ${esShare(codex.items, 'name')}%), ${meta.counts.skills} habilidades,`);
console.log(`  ${meta.counts.beasts} criaturas, ${meta.counts.regions} regiones / ${meta.counts.places} lugares -> ${path.relative(ROOT, OUT)}`);
