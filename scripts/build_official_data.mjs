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
 * Arte: public/data/bloomshire/beasts/<criatura>.png (primer cuadro de reposo, recortado como en el
 * Bestiario del juego) y retratos faltantes en public/data/bloomshire/portraits/<aldeano>.png.
 * El arte se lee de game-sources/v-<version>/pack/...; los archivos que hagan falta se listan en
 * game-sources/v-<version>/assets_needed.txt y los baja descargar_fuentes.ps1 en su siguiente pasada.
 * Los textos en espanol son null cuando el juego todavia no los traduce (se muestra el ingles).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import crypto from 'crypto';
import { installShims } from './lib/gameShims.mjs';
import { readPng, blank, blit, opaqueBox, writePng } from './lib/gameArt.mjs';

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
// Arte: miniaturas de criaturas y retratos de aldeanos
// ---------------------------------------------------------------------------
const PACK = path.join(SRC, 'pack');
const needed = new Set();
const missing = [];
const packFile = (p) => {
  needed.add(p);
  const f = path.join(PACK, ...p.split('/'));
  if (!fs.existsSync(f)) { missing.push(p); return null; }
  return f;
};

// Criaturas: como drawBeast() de bestiary.js -- hoja de reposo, mirando hacia abajo, recortada a lo que se dibuja
const BEAST_OUT = path.join(ROOT, 'public/data/bloomshire/beasts');
let beastArt = 0;
for (const b of bestiary.beasts) {
  const a = rules.ENEMIES[b.id]?.art;
  if (!a?.anim?.idle) continue;
  const [file, frames = 1, col0 = 0, fixedRow = null] = a.anim.idle;
  const f = packFile(`${a.dir}/${file}.png`);
  if (!f) {
    // (sin la hoja en esta pasada: se mantiene la miniatura ya publicada, si existe)
    if (fs.existsSync(path.join(BEAST_OUT, `${b.id}.png`))) b.art = `beasts/${b.id}.png`;
    continue;
  }
  const sheet = readPng(f);
  const c = a.cell;
  const row = fixedRow ?? (a.rows === 4 ? Math.max(0, (a.order ?? ['down', 'up', 'right', 'left']).indexOf('down')) : a.rows === 8 ? Math.max(0, (a.order8 ?? ['down']).indexOf('down')) : 0);
  let box = null;
  for (let i = 0; i < frames; i++) {
    const fb = opaqueBox(sheet, (col0 + i) * c, row * c, c, c);
    if (!fb) continue;
    box = box ? (() => {
      const x0 = Math.min(box.x, fb.x), y0 = Math.min(box.y, fb.y);
      return { x: x0, y: y0, w: Math.max(box.x + box.w, fb.x + fb.w) - x0, h: Math.max(box.y + box.h, fb.y + fb.h) - y0 };
    })() : fb;
  }
  if (!box) continue;
  const out = blit(blank(box.w, box.h), sheet, col0 * c + box.x, row * c + box.y, box.w, box.h);
  writePng(path.join(BEAST_OUT, `${b.id}.png`), out);
  b.art = `beasts/${b.id}.png`;
  beastArt++;
}

// Aldeanos: solo los retratos que faltan o que son la imagen de relleno repetida
const PORTRAITS = path.join(ROOT, 'public/data/bloomshire/portraits');
const npcsMod = await mod('game/npcs.js');
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const existing = fs.existsSync(PORTRAITS) ? fs.readdirSync(PORTRAITS).filter((f) => f.endsWith('.png')) : [];
const byHash = new Map();
for (const f of existing) { const h = md5(path.join(PORTRAITS, f)); byHash.set(h, [...(byHash.get(h) || []), f.replace(/\.png$/, '')]); }
const placeholders = new Set([...byHash.values()].filter((ids) => ids.length > 1).flat());
const ALIASES = { tamzin: 'tamsin', virelia: 'virella' };
const wanted = new Set([...placeholders, ...Object.keys(npcsMod.NPCS).filter((id) => !existing.includes(`${id}.png`))]);
let portraitArt = 0;
for (const id of [...wanted].sort()) {
  const def = npcsMod.NPCS[ALIASES[id] || id];
  if (!def) continue;
  const layers = def.premade?.portrait ? [def.premade.portrait] : def.face ? [def.face] : def.look ? npcsMod.portraitLayers(def.look) : [];
  const files = layers.map(packFile);
  if (!files.length || files.some((x) => !x)) continue;
  const out = blank(64, 64);
  for (const f of files) blit(out, readPng(f), 0, 0, 64, 64, 0, 0, true);
  if (!opaqueBox(out, 0, 0, 64, 64)) continue;
  writePng(path.join(PORTRAITS, `${id}.png`), out);
  portraitArt++;
}

fs.writeFileSync(path.join(SRC, 'assets_needed.txt'), `${[...needed].sort().join('\n')}\n`, 'utf8');

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
const serialize = (data) => `${JSON.stringify(data, null, 1)}\n`;
const readPrev = (name) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8')); } catch { return null; } };
const prev = { meta: readPrev('meta.json'), codex: readPrev('codex.json'), bestiary: readPrev('bestiary.json'), skills: readPrev('skills.json') };

// Solo se escribe lo que cambio: asi una corrida sin novedades no genera commits.
const changedFiles = [];
for (const [name, data] of Object.entries({ 'codex.json': codex, 'skills.json': skills, 'bestiary.json': bestiary, 'adventure.json': adventure })) {
  const file = path.join(OUT, name);
  const text = serialize(data);
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) {
    fs.writeFileSync(file, text, 'utf8');
    changedFiles.push(name);
  }
}
const versionChanged = !prev.meta || prev.meta.gameVersion !== meta.gameVersion || prev.meta.rulesHash !== meta.rulesHash;
if (changedFiles.length || versionChanged) fs.writeFileSync(path.join(OUT, 'meta.json'), serialize(meta), 'utf8');
else meta.generatedAt = prev.meta.generatedAt;

// Historial de cambios (las ultimas 15 actualizaciones), para el panel de Ajustes
const brief = (x) => ({ id: x.id, name_en: x.name_en, name_es: x.name_es || null });
function diffById(before, after, fields) {
  const a = new Map((before || []).map((x) => [x.id, x]));
  const b = new Map((after || []).map((x) => [x.id, x]));
  const added = [...b.values()].filter((x) => !a.has(x.id)).map(brief);
  const removed = [...a.values()].filter((x) => !b.has(x.id)).map(brief);
  const changed = [];
  for (const [id, x] of b) {
    const old = a.get(id);
    if (!old) continue;
    const diff = fields.filter((f) => JSON.stringify(old[f]) !== JSON.stringify(x[f]));
    if (diff.length) changed.push({ ...brief(x), fields: diff });
  }
  return { added, removed, changed };
}
const CHANGES = path.join(OUT, 'changes.json');
const history = (() => { try { return JSON.parse(fs.readFileSync(CHANGES, 'utf8')); } catch { return { updates: [] }; } })();
if (changedFiles.length && prev.codex) {
  const items = diffById(prev.codex.items, codex.items, ['name_en', 'gives_en', 'xp_en', 'from_en', 'uses', 'worth_en', 'rarity', 'about_en']);
  const beasts = diffById(prev.bestiary?.beasts, bestiary.beasts, ['name_en', 'stats', 'facts_en', 'places', 'reward', 'weapons']);
  const skillUnlocks = skills.filter((sk) => {
    const old = (prev.skills || []).find((o) => o.id === sk.id);
    return !old || JSON.stringify(old.unlocks) !== JSON.stringify(sk.unlocks) || JSON.stringify(old.perks) !== JSON.stringify(sk.perks);
  }).map(brief);
  const meaningful = items.added.length || items.removed.length || items.changed.length ||
    beasts.added.length || beasts.removed.length || beasts.changed.length || skillUnlocks.length ||
    (prev.meta && prev.meta.gameVersion !== meta.gameVersion);
  if (meaningful) history.updates.unshift({
    at: meta.generatedAt,
    from: prev.meta ? { gameVersion: prev.meta.gameVersion, rulesHash: prev.meta.rulesHash } : null,
    to: { gameVersion: meta.gameVersion, rulesHash: meta.rulesHash },
    files: changedFiles,
    items: { added: items.added, removed: items.removed, changed: items.changed.slice(0, 60), changedCount: items.changed.length },
    beasts: { added: beasts.added, removed: beasts.removed, changed: beasts.changed.slice(0, 40), changedCount: beasts.changed.length },
    skills: skillUnlocks
  });
  history.updates = history.updates.slice(0, 15);
}
const recorded = history.updates[0] && history.updates[0].at === meta.generatedAt;
if (!fs.existsSync(CHANGES) || recorded) fs.writeFileSync(CHANGES, serialize(history), 'utf8');

const esShare = (items, key) => {
  const withEn = items.filter((x) => x[`${key}_en`]);
  return withEn.length ? Math.round((100 * withEn.filter((x) => x[`${key}_es`]).length) / withEn.length) : 100;
};
console.log(`Datos oficiales: version ${meta.gameVersion} (reglas ${meta.rulesHash})${changedFiles.length ? ` -- cambiaron: ${changedFiles.join(', ')}` : ' -- sin cambios en los datos'}`);
console.log(`  codice ${meta.counts.codex} cosas (nombres en espanol ${esShare(codex.items, 'name')}%), ${meta.counts.skills} habilidades,`);
console.log(`  ${meta.counts.beasts} criaturas, ${meta.counts.regions} regiones / ${meta.counts.places} lugares -> ${path.relative(ROOT, OUT)}`);
console.log(`  arte: ${beastArt} miniaturas de criaturas, ${portraitArt} retratos de aldeanos`);
if (missing.length) {
  console.log(`  FALTAN ${new Set(missing).size} imagenes del juego (listadas en ${path.relative(ROOT, path.join(SRC, 'assets_needed.txt'))}).`);
  console.log('  Corre de nuevo game-sources/descargar_fuentes.ps1 para bajarlas y despues npm run build:official.');
}
