import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import megaAtlasData from '../public/data/bloomshire/mega_atlas_data.json';
import seed from '../src/data/logbook_seed.json';
import handler, { SEED_CONFIRM, _resetLoginLimits } from '../api/logbook-admin.js';
import {
  validateSectionInput, validateEntryInput, buildPlaceCorpus, mediaUrl, extractMediaPath, isSafeMediaPath, isGameMedia, sanitizeBlock,
  isGameSprite, imagePath
} from '../src/components/bloomshire/logbook/logbookModel';
import { buildSpriteCatalog, filterSprites } from '../src/components/bloomshire/logbook/spriteCatalog';
import bestiary from '../public/data/bloomshire/official/bestiary.json';
import officialNpcs from '../public/data/bloomshire/official/npcs.json';
import codex from '../public/data/bloomshire/official/codex.json';
import itemIcons from '../public/data/bloomshire/item_icons_map.json';

const PUBLIC = path.resolve(__dirname, '../public');
const spriteExists = (p) => fs.existsSync(path.join(PUBLIC, mediaUrl('', p)));
function imagesOf(entry) {
  const out = entry.cover_path ? [entry.cover_path] : [];
  for (const b of entry.blocks || []) {
    if (b.type === 'image') out.push(b.path, ...(b.path_es ? [b.path_es] : []));
    if (b.type === 'gallery') out.push(...b.images.flatMap((im) => [im.path, ...(im.path_es ? [im.path_es] : [])]));
  }
  return out;
}

const SECRET = 'y'.repeat(40);
const PASSWORD = 'seed-test-password';
const HOST = 'bloomshire-tool.vercel.app';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function placesOf(entry) {
  const out = [...(entry.places || [])];
  for (const b of entry.blocks || []) if (b.type === 'place' && b.key) out.push(b.key);
  return out;
}

describe('Bitacora: contenido inicial (seed)', () => {
  it('tiene secciones y entradas con ids unicos', () => {
    expect(seed.sections.length).toBeGreaterThanOrEqual(3);
    expect(seed.entries.length).toBeGreaterThanOrEqual(20);
    const ids = [...seed.sections, ...seed.entries].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(UUID_RE);
  });

  it('cada seccion y entrada pasa la validacion del admin', () => {
    const sectionIds = new Set(seed.sections.map((s) => s.id));
    for (const s of seed.sections) expect(validateSectionInput(s).ok, s.slug).toBe(true);
    for (const e of seed.entries) {
      const r = validateEntryInput(e);
      expect(r.ok, `${e.slug}: ${r.error}`).toBe(true);
      expect(sectionIds.has(e.section_id)).toBe(true);
      // la validacion no debe tirar bloques
      expect(r.value.blocks.length).toBe(e.blocks.length);
    }
  });

  it('todas las entradas tienen titulo en ingles y espanol', () => {
    for (const e of seed.entries) {
      expect(e.title_en, e.slug).toBeTruthy();
      expect(e.title_es, e.slug).toBeTruthy();
    }
  });

  it('todos los lugares existen en el Atlas', () => {
    const keys = new Set(buildPlaceCorpus(megaAtlasData, []).map((p) => p.key));
    for (const e of seed.entries) {
      for (const k of placesOf(e)) expect(keys.has(k), `${e.slug} -> ${k}`).toBe(true);
    }
  });

  it('cada entrada tiene portada y todas sus imagenes son sprites del juego que existen', () => {
    for (const e of seed.entries) {
      expect(e.cover_path, e.slug).toBeTruthy();
      for (const p of imagesOf(e)) {
        expect(isGameMedia(p), `${e.slug} -> ${p}`).toBe(true);
        expect(spriteExists(p), `${e.slug} -> ${p}`).toBe(true);
      }
    }
    const bosses = seed.entries.filter((e) => e.tags.includes('boss') && e.blocks.some((b) => b.type === 'gallery'));
    expect(bosses.length).toBeGreaterThanOrEqual(8);
  });

  it('el recorrido por la tool va primero, con capturas en los dos idiomas y enlaces internos validos', () => {
    const tour = seed.sections[0];
    expect(tour.slug).toBe('how-to-use');
    const entries = seed.entries.filter((e) => e.section_id === tour.id);
    expect(entries.length).toBeGreaterThanOrEqual(10);
    const shots = entries.flatMap((e) => e.blocks.filter((b) => b.type === 'image'));
    expect(shots.length).toBeGreaterThanOrEqual(10);
    for (const b of shots) {
      expect(b.path).toMatch(/^game\/guide\/[a-z_]+_en\.jpg$/);
      expect(b.path_es).toBe(b.path.replace('_en.jpg', '_es.jpg'));
    }
    // cada [texto](#logbook/seccion/entrada) apunta a algo que existe
    const sectionsById = new Map(seed.sections.map((s) => [s.id, s]));
    const paths = new Set(seed.entries.map((e) => `${sectionsById.get(e.section_id).slug}/${e.slug}`));
    const text = JSON.stringify(seed.entries);
    const links = [...text.matchAll(/\(#logbook\/([a-z0-9/-]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(10);
    for (const l of links) expect(paths.has(l), l).toBe(true);
  });

  it('autor Admin y sin rastros de Leonman', () => {
    for (const e of seed.entries) expect(e.author).toBe('Admin');
    expect(JSON.stringify(seed)).not.toMatch(/leonman/i);
  });
});

describe('Bitacora: sprites del juego', () => {
  it('rutas game/ resuelven a los datos de la app sin depender del bucket', () => {
    expect(mediaUrl('', 'game/beasts/lich.png')).toBe('/data/bloomshire/beasts/lich.png');
    expect(mediaUrl('https://x.supabase.co/storage/v1/object/public/logbook', 'game/items/gold_sword.png')).toBe('/data/bloomshire/items/gold_sword.png');
    expect(isSafeMediaPath('game/other/x.png')).toBe(false);
    expect(isSafeMediaPath('game/beasts/../x.png')).toBe(false);
    expect(isSafeMediaPath('game/beasts/Lich.PNG')).toBe(false);
    expect(mediaUrl('', 'game/beasts/x.js')).toBeNull();
    // Las rutas del bucket siguen igual
    expect(isSafeMediaPath('entries/2026/11/a.webp')).toBe(true);
  });

  it('capturas de la guia: rutas game/guide/*.jpg, sin efecto pixel art, y version en espanol', () => {
    expect(mediaUrl('', 'game/guide/atlas_en.jpg')).toBe('/data/bloomshire/guide/atlas_en.jpg');
    expect(isGameMedia('game/guide/atlas_en.jpg')).toBe(true);
    expect(isGameSprite('game/guide/atlas_en.jpg')).toBe(false);
    expect(isGameSprite('game/beasts/lich.png')).toBe(true);
    expect(isSafeMediaPath('game/guide/atlas.png')).toBe(false);
    expect(extractMediaPath('/data/bloomshire/guide/items_es.jpg')).toBe('game/guide/items_es.jpg');
    const img = sanitizeBlock({ type: 'image', path: 'game/guide/items_en.jpg', path_es: 'game/guide/items_es.jpg' });
    expect(img.path_es).toBe('game/guide/items_es.jpg');
    expect(imagePath(img, 'es')).toBe('game/guide/items_es.jpg');
    expect(imagePath(img, 'en')).toBe('game/guide/items_en.jpg');
    expect(sanitizeBlock({ type: 'image', path: 'game/guide/items_en.jpg', path_es: '../x' }).path_es).toBeUndefined();
  });

  it('extractMediaPath acepta la URL o ruta del sprite y rechaza otras carpetas', () => {
    expect(extractMediaPath('/data/bloomshire/beasts/lich.png')).toBe('game/beasts/lich.png');
    expect(extractMediaPath('https://bloomshire-tool.vercel.app/data/bloomshire/items/gold_sword.png')).toBe('game/items/gold_sword.png');
    expect(extractMediaPath('game/portraits/bram.png')).toBe('game/portraits/bram.png');
    expect(extractMediaPath('/data/bloomshire/maps/world.png')).toBeNull();
    expect(sanitizeBlock({ type: 'image', path: 'game/beasts/lich.png' }).path).toBe('game/beasts/lich.png');
    expect(validateEntryInput({ section_id: seed.sections[0].id, title_en: 'x', cover_path: 'game/beasts/lich.png' }).value.cover_path).toBe('game/beasts/lich.png');
  });

  it('el catalogo del editor sale de los datos oficiales y todos los sprites existen', () => {
    const list = buildSpriteCatalog({ bestiary, npcs: officialNpcs, codex, icons: itemIcons });
    const by = (k) => list.filter((s) => s.kind === k);
    expect(by('beasts').length).toBeGreaterThanOrEqual(30);
    expect(by('items').length).toBeGreaterThanOrEqual(100);
    expect(by('portraits').length).toBeGreaterThanOrEqual(30);
    expect(new Set(list.map((s) => s.path)).size).toBe(list.length);
    for (const s of list) expect(spriteExists(s.path), s.path).toBe(true);
    const lich = list.find((s) => s.path === 'game/beasts/lich.png');
    expect(lich.name_en).toBeTruthy();
    expect(filterSprites(list, { query: 'espada de oro' }).some((s) => s.path === 'game/items/gold_sword.png')).toBe(true);
    expect(filterSprites(list, { kind: 'portraits', query: 'bram' })[0].path).toBe('game/portraits/bram.png');
  });
});

// ---------------------------------------------------------------------------

function mockRes() {
  const res = { headers: {}, code: 0, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

let ip = 0;
async function call(body, token) {
  const res = mockRes();
  const headers = { host: HOST, origin: `https://${HOST}`, 'x-forwarded-for': `10.9.0.${++ip % 250}` };
  if (token) headers.authorization = `Bearer ${token}`;
  await handler({ method: 'POST', headers, body }, res);
  return res;
}

describe('Bitacora admin: seed_reset', () => {
  let requests;
  let existing;
  beforeEach(() => {
    existing = { logbook_sections: [], logbook_entries: [] };
    _resetLoginLimits();
    process.env.SUPABASE_URL = 'https://abc.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.SESSION_SECRET = SECRET;
    process.env.LOGBOOK_ADMIN_PASSWORD = PASSWORD;
    requests = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      const u = new URL(url);
      const method = opts.method || 'GET';
      const body = opts.body ? JSON.parse(opts.body) : undefined;
      const table = u.pathname.split('/').pop();
      requests.push({ method, table, query: u.search, body, prefer: opts.headers?.Prefer });
      const data = method === 'POST' ? body : method === 'GET' ? (existing[table] || []) : [];
      return { ok: true, status: method === 'DELETE' ? 204 : 200, json: async () => data, text: async () => JSON.stringify(data) };
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET', 'LOGBOOK_ADMIN_PASSWORD']) delete process.env[k];
  });

  it('exige sesion y la palabra de confirmacion', async () => {
    expect((await call({ action: 'seed_reset', confirm: SEED_CONFIRM })).code).toBe(401);
    const token = (await call({ action: 'login', password: PASSWORD })).body.token;
    const bad = await call({ action: 'seed_reset', confirm: 'borrar' }, token);
    expect(bad.code).toBe(400);
    expect(bad.body.error).toBe('confirm_mismatch');
    expect(requests.filter((r) => r.method !== 'GET')).toHaveLength(0);
  });

  it('seed_upsert actualiza por id sin borrar nada', async () => {
    const token = (await call({ action: 'login', password: PASSWORD })).body.token;
    const r = await call({ action: 'seed_upsert' }, token);
    expect(r.code).toBe(200);
    expect(r.body).toEqual(expect.objectContaining({ ok: true, entries: seed.entries.length }));
    expect(requests.some((q) => q.method === 'DELETE')).toBe(false);
    const posts = requests.filter((q) => q.method === 'POST');
    expect(posts.length).toBeGreaterThan(0);
    for (const q of posts) expect(q.query).toBe('?on_conflict=id');
    expect(posts.every((q) => q.prefer === 'resolution=merge-duplicates,return=minimal')).toBe(true);
    expect(posts.filter((q) => q.table === 'logbook_entries').flatMap((q) => q.body)).toHaveLength(seed.entries.length);
  });

  it('seed_upsert no pisa lo hecho a mano: si choca un enlace devuelve 409 y no escribe', async () => {
    existing.logbook_sections = [{ id: '99999999-9999-4999-8999-999999999999', slug: 'bosses', parent_id: null }];
    const token = (await call({ action: 'login', password: PASSWORD })).body.token;
    const r = await call({ action: 'seed_upsert' }, token);
    expect(r.code).toBe(409);
    expect(r.body.error).toBe('seed_conflict');
    expect(requests.some((q) => q.method === 'POST')).toBe(false);
  });

  it('borra todo y carga secciones y entradas como Admin', async () => {
    const token = (await call({ action: 'login', password: PASSWORD })).body.token;
    const r = await call({ action: 'seed_reset', confirm: SEED_CONFIRM }, token);
    expect(r.code).toBe(200);
    expect(r.body).toEqual(expect.objectContaining({ ok: true, sections: seed.sections.length, entries: seed.entries.length }));

    const deletes = requests.filter((q) => q.method === 'DELETE').map((q) => q.table);
    expect(deletes).toEqual(expect.arrayContaining(['logbook_entries', 'logbook_sections', 'logbook_places']));
    const firstPost = requests.findIndex((q) => q.method === 'POST');
    const lastDelete = requests.map((q) => q.method).lastIndexOf('DELETE');
    expect(lastDelete).toBeLessThan(firstPost);

    const posted = (table) => requests.filter((q) => q.method === 'POST' && q.table === table).flatMap((q) => q.body);
    expect(posted('logbook_sections')).toHaveLength(seed.sections.length);
    const entries = posted('logbook_entries');
    expect(entries).toHaveLength(seed.entries.length);
    for (const e of entries) {
      expect(e.author).toBe('Admin');
      expect(e.id).toMatch(UUID_RE);
    }
  });
});
