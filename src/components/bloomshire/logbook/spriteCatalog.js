// src/components/bloomshire/logbook/spriteCatalog.js
// Catalogo de sprites del juego para el editor de la Bitacora: criaturas,
// items y retratos de aldeanos que ya vienen con la app. Se arma con los datos
// oficiales (los actualiza el robot), asi que crece solo con cada version.
import { GAME_MEDIA_RE, normalizeText } from './logbookModel';

export const SPRITE_KINDS = ['beasts', 'items', 'portraits'];

const DATA = '/data/bloomshire';

const fileOf = (p) => String(p || '').split('/').pop();
const gamePath = (folder, file) => {
  const p = `game/${folder}/${file}`;
  return GAME_MEDIA_RE.test(p) ? p : null;
};

/** Arma la lista [{ path, kind, name_en, name_es }] desde los JSON del juego. */
export function buildSpriteCatalog({ bestiary, npcs, codex, icons } = {}) {
  const out = [];
  const seen = new Set();
  const push = (path, kind, name_en, name_es) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    const en = String(name_en || '').trim() || fileOf(path).replace(/\.png$/, '').replace(/_/g, ' ');
    out.push({ path, kind, name_en: en, name_es: String(name_es || '').trim() || en });
  };

  for (const b of bestiary?.beasts || []) {
    if (b?.art) push(gamePath('beasts', fileOf(b.art)), 'beasts', b.name_en, b.name_es);
  }

  const iconMap = icons && typeof icons === 'object' ? icons : {};
  for (const it of codex?.items || []) {
    const name = String(it?.name_en || it?.id || '');
    const key = name.toLowerCase();
    const src = iconMap[key] || iconMap[key.replace(/[^a-z0-9]+/g, '_')];
    if (src) push(gamePath('items', fileOf(src)), 'items', it.name_en, it.name_es);
  }

  for (const [id, n] of Object.entries(npcs || {})) {
    const name = n?.name || id;
    const title = (lang) => n?.[`title_${lang}`];
    push(gamePath('portraits', `${id}.png`), 'portraits',
      title('en') ? `${name} — ${title('en')}` : name,
      title('es') ? `${name} — ${title('es')}` : name);
  }
  return out;
}

/** Filtra por tipo y texto (sin tildes, en ambos idiomas). */
export function filterSprites(list, { kind = null, query = '' } = {}) {
  const q = normalizeText(query);
  return (list || []).filter((s) => (!kind || s.kind === kind) &&
    (!q || normalizeText(`${s.name_en} ${s.name_es} ${s.path}`).includes(q)));
}

let pending = null;

/** Carga (una sola vez) el catalogo desde los JSON publicos del juego. */
export function loadSpriteCatalog() {
  if (!pending) {
    const get = (f) => fetch(`${DATA}/${f}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    pending = Promise.all([
      get('official/bestiary.json'), get('official/npcs.json'), get('official/codex.json'), get('item_icons_map.json')
    ]).then(([bestiary, npcs, codex, icons]) => {
      const list = buildSpriteCatalog({ bestiary, npcs, codex, icons });
      if (!list.length) throw new Error('sprite_catalog_empty');
      return list;
    }).catch((err) => { pending = null; throw err; });
  }
  return pending;
}
