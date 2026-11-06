import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

import i18n from '../src/i18n/index';
import megaAtlasData from '../public/data/bloomshire/mega_atlas_data.json';
import {
  pickLang, normalizeText, buildTree, indexTree, entryPath, flattenEntries, parseLogbookHash,
  parseYouTubeId, parseYouTubeStart, youTubeEmbedUrl, mediaUrl, safeHref, sanitizeBlock, sanitizeBlocks,
  buildPlaceCorpus, searchPlaces, searchEntries, entryPlainText, isMissingTranslation, entryHasPlace
} from '../src/components/bloomshire/logbook/logbookModel';
import LogbookMarkdown, { parseMarkdownTable } from '../src/components/bloomshire/logbook/LogbookMarkdown';
import LogbookTab from '../src/components/bloomshire/tabs/LogbookTab';
import { DEMO_INDEX, DEMO_ENTRIES } from '../src/components/bloomshire/logbook/logbookDemoData';
import handler, { visibleSectionIds, makeSnippet } from '../api/logbook.js';

const MEDIA = 'https://abc.supabase.co/storage/v1/object/public/logbook';

describe('Bitacora: modelo', () => {
  it('pickLang usa es si existe y si no cae a en', () => {
    const o = { title_en: 'Cave', title_es: 'Cueva', summary_en: 'Only EN', summary_es: '  ' };
    expect(pickLang(o, 'title', 'es')).toBe('Cueva');
    expect(pickLang(o, 'title', 'es-AR')).toBe('Cueva');
    expect(pickLang(o, 'title', 'en')).toBe('Cave');
    expect(pickLang(o, 'summary', 'es')).toBe('Only EN');
    expect(pickLang({ items_en: ['a'], items_es: [] }, 'items', 'es')).toEqual(['a']);
  });

  it('normalizeText quita tildes, mayusculas y signos', () => {
    expect(normalizeText('  Whísperwood — Bosque  ÑANDÚ!')).toBe('whisperwood bosque nandu');
  });

  it('buildTree arma niveles libres, ordena, cuenta y resiste ciclos', () => {
    const sections = [
      { id: 'a', parent_id: null, slug: 'guides', title_en: 'Guides', sort: 1 },
      { id: 'b', parent_id: 'a', slug: 'bosses', title_en: 'Bosses', sort: 0 },
      { id: 'c', parent_id: 'b', slug: 'deep', title_en: 'Deep', sort: 0 },
      { id: 'd', parent_id: null, slug: 'zones', title_en: 'Zones', sort: 0 },
      { id: 'x', parent_id: 'y', slug: 'loop-x', title_en: 'X' },
      { id: 'y', parent_id: 'x', slug: 'loop-y', title_en: 'Y' }
    ];
    const entries = [
      { id: 'e1', section_id: 'c', slug: 'bone-spider', title_en: 'Bone Spider', sort: 0 },
      { id: 'e2', section_id: 'a', slug: 'intro', title_en: 'Intro', sort: 0 }
    ];
    const tree = buildTree(sections, entries);
    expect(tree.map((n) => n.slug)).toEqual(['zones', 'guides']);
    const guides = tree[1];
    expect(guides.total).toBe(2);
    expect(guides.children[0].children[0].path).toEqual(['guides', 'bosses', 'deep']);
    const idx = indexTree(tree);
    expect(entryPath(idx, 'e1')).toBe('guides/bosses/deep/bone-spider');
    expect(idx.byPath.get('guides/bosses')).toEqual({ kind: 'section', id: 'b' });
    expect(flattenEntries(tree).map((e) => e.id)).toEqual(['e2', 'e1']);
  });

  it('parseLogbookHash acepta slugs y rechaza rutas raras', () => {
    expect(parseLogbookHash('#logbook/guides/the-gloom-cave')).toEqual({ path: 'guides/the-gloom-cave' });
    expect(parseLogbookHash('#logbook')).toEqual({ path: '' });
    expect(parseLogbookHash('#logbook/../etc')).toEqual({ path: '' });
    expect(parseLogbookHash('#other')).toBeNull();
  });

  it('YouTube: ids, URLs y embed sin cookies', () => {
    expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYouTubeId('javascript:alert(1)')).toBeNull();
    expect(parseYouTubeStart('1m30s')).toBe(90);
    expect(youTubeEmbedUrl('dQw4w9WgXcQ', 5)).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?.*start=5/);
  });

  it('mediaUrl solo arma URLs del bucket con rutas seguras', () => {
    expect(mediaUrl(MEDIA, 'entries/gloom/1.webp')).toBe(`${MEDIA}/entries/gloom/1.webp`);
    expect(mediaUrl(MEDIA, '../secret')).toBeNull();
    expect(mediaUrl(MEDIA, '/abs.png')).toBeNull();
    expect(mediaUrl(MEDIA, 'https://evil.com/x.png')).toBeNull();
    expect(mediaUrl('https://evil.com/', 'a.png')).toBeNull();
  });

  it('safeHref bloquea esquemas peligrosos', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,hi')).toBeNull();
    expect(safeHref('https://bloomshire.xyz')).toBe('https://bloomshire.xyz/');
    expect(safeHref('#logbook/guides')).toBe('#logbook/guides');
  });

  it('sanitizeBlock descarta tipos y datos invalidos', () => {
    expect(sanitizeBlock({ type: 'html', html: '<b>x</b>' })).toBeNull();
    expect(sanitizeBlock({ type: 'image', path: '../x.png' })).toBeNull();
    expect(sanitizeBlock({ type: 'youtube', id: 'nope' })).toBeNull();
    expect(sanitizeBlock({ type: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' }).id).toBe('dQw4w9WgXcQ');
    expect(sanitizeBlock({ type: 'callout', variant: 'evil', md_en: 'x' }).variant).toBe('note');
    expect(sanitizeBlock({ type: 'place', key: 'region:whisperwood' }).key).toBe('region:whisperwood');
    expect(sanitizeBlock({ type: 'place', key: 'javascript:1' })).toBeNull();
    expect(sanitizeBlocks([{ type: 'divider' }, null, 'x', { type: 'gallery', images: [{ path: 'a.png' }, { path: '..' }] }]))
      .toEqual([{ type: 'divider' }, { type: 'gallery', images: [expect.objectContaining({ path: 'a.png' })], caption_en: '', caption_es: '' }]);
  });

  it('isMissingTranslation detecta textos sin version es', () => {
    expect(isMissingTranslation({ title_en: 'A', title_es: 'A', blocks: [{ type: 'text', md_en: 'x', md_es: '' }] }, 'es')).toBe(true);
    expect(isMissingTranslation({ title_en: 'A', title_es: 'A', blocks: [{ type: 'text', md_en: 'x', md_es: 'y' }] }, 'es')).toBe(false);
    expect(isMissingTranslation({ title_en: 'A', title_es: '' }, 'en')).toBe(false);
  });

  it('searchEntries busca en EN/ES/cuerpo sin tildes y prioriza el titulo', () => {
    const pool = DEMO_ENTRIES.map((e) => ({ ...e, _plain: normalizeText(entryPlainText(e)) }));
    const r = searchEntries(pool, 'guia ejemplo');
    expect(r[0].entry.slug).toBe('layout-showcase');
    expect(searchEntries(pool, 'alert')).toHaveLength(1); // texto del cuerpo
    expect(searchEntries(pool, 'zzzz')).toHaveLength(0);
  });
});

describe('Bitacora: lugares (autocompletado)', () => {
  const corpus = buildPlaceCorpus(megaAtlasData, [{ id: 'abc-1', name_en: 'The Gloom Cave', name_es: 'La Cueva Lúgubre', atlas_ref: 'region:stonepeak' }]);

  it('corpus incluye regiones, zonas, aldeanos, entradas, pistas y lugares propios', () => {
    const kinds = new Set(corpus.map((p) => p.kind));
    ['region', 'sub', 'npc', 'door', 'clue', 'custom'].forEach((k) => expect(kinds.has(k)).toBe(true));
    expect(corpus.filter((p) => p.kind === 'region')).toHaveLength(12);
  });

  it('"Whis" sugiere Whisperwood primero, sin distinguir mayusculas ni tildes', () => {
    expect(searchPlaces(corpus, 'Whis')[0].key).toBe('region:whisperwood');
    expect(searchPlaces(corpus, 'wHÍs')[0].key).toBe('region:whisperwood');
  });

  it('busca tambien por el nombre en espanol', () => {
    expect(searchPlaces(corpus, 'bosque').some((p) => p.key === 'region:whisperwood')).toBe(true);
    expect(searchPlaces(corpus, 'lugubre')[0].key).toBe('custom:abc-1');
  });

  it('cada lugar del atlas tiene destino para "Ver en Mega-Atlas"; el propio hereda el de su referencia', () => {
    const ww = corpus.find((p) => p.key === 'region:whisperwood');
    expect(ww.target).toEqual(expect.objectContaining({ regionId: 'whisperwood' }));
    const greta = corpus.find((p) => p.key === 'npc:greta');
    expect(greta.target).toEqual(expect.objectContaining({ wx: 6322, wy: 3802 }));
    expect(corpus.find((p) => p.key === 'custom:abc-1').target.regionId).toBe('stonepeak');
  });

  it('entryHasPlace mira places y bloques de lugar', () => {
    expect(entryHasPlace({ places: ['npc:greta'] }, 'npc:greta')).toBe(true);
    expect(entryHasPlace({ places: [], blocks: [{ type: 'place', key: 'sub:x' }] }, 'sub:x')).toBe(true);
    expect(entryHasPlace({ places: [] }, 'npc:greta')).toBe(false);
  });
});

describe('Bitacora: markdown seguro', () => {
  it('nunca inyecta HTML crudo', () => {
    const html = renderToString(<LogbookMarkdown md={'Hola <script>alert(1)</script> <img src=x onerror=alert(1)>'} />);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('enlaces javascript: quedan como texto sin href', () => {
    const html = renderToString(<LogbookMarkdown md={'[click](javascript:alert(1)) y [ok](https://bloomshire.xyz)'} />);
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://bloomshire.xyz/"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('negrita, listas y tablas', () => {
    const html = renderToString(<LogbookMarkdown md={'**Boss**\n\n- uno\n- dos\n\n| A | B |\n|---|--:|\n| 1 | 2 |'} />);
    expect(html).toContain('<strong');
    expect(html).toContain('<ul');
    expect(html).toContain('<table');
    expect(parseMarkdownTable('| A | B |\n|:-:|--:|\n| 1 | 2 |')).toEqual({ head: ['A', 'B'], rows: [['1', '2']], align: ['center', 'right'] });
  });
});

describe('Bitacora: pestaña', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); });
  afterEach(async () => { await i18n.changeLanguage('en'); });

  it('portada en ingles con secciones', () => {
    const html = renderToString(<LogbookTab initialData={DEMO_INDEX} initialPath="" />);
    expect(html).toContain('Logbook');
    expect(html).toContain('Guides');
    expect(html).toContain('Browse the logbook');
  });

  it('portada en espanol', async () => {
    await i18n.changeLanguage('es');
    const html = renderToString(<LogbookTab initialData={DEMO_INDEX} initialPath="" />);
    expect(html).toContain('Bitácora y guías');
    expect(html).toContain('Guías');
  });

  it('entrada con bloques, lugares y aviso de traduccion faltante en es', async () => {
    await i18n.changeLanguage('es');
    const e = DEMO_ENTRIES[1];
    const html = renderToString(
      <LogbookTab initialData={DEMO_INDEX} initialPath="zones/whisperwood/english-only-sample" initialEntries={[{ ...e, blocks: sanitizeBlocks(e.blocks) }]} />
    );
    expect(html).toContain('English-only sample entry');
    expect(html).toContain('todavía no está traducida');
    expect(html).toContain('data-place="region:whisperwood"');
    expect(html).toContain('Reproducir video');
    expect(html).not.toContain('<iframe'); // el video carga solo al tocar
  });

  it('seccion y ruta inexistente', () => {
    expect(renderToString(<LogbookTab initialData={DEMO_INDEX} initialPath="zones" />)).toContain('Subsections');
    expect(renderToString(<LogbookTab initialData={DEMO_INDEX} initialPath="nope/nada" />)).toContain('no longer published');
  });

  it('bitacora vacia muestra estado vacio', () => {
    const html = renderToString(<LogbookTab initialData={{ ok: true, sections: [], entries: [], places: [], mediaBase: MEDIA }} initialPath="" />);
    expect(html).toContain('still blank');
  });
});

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

const SEC = [
  { id: '11111111-1111-4111-8111-111111111111', parent_id: null, slug: 'guides', title_en: 'Guides', status: 'published', sort: 0 },
  { id: '22222222-2222-4222-8222-222222222222', parent_id: null, slug: 'secret', title_en: 'Secret', status: 'draft', sort: 1 },
  { id: '33333333-3333-4333-8333-333333333333', parent_id: '22222222-2222-4222-8222-222222222222', slug: 'child', title_en: 'Child', status: 'published', sort: 0 }
];
const ENT = [
  { id: 'aaaaaaaa-0000-4000-8000-000000000001', section_id: SEC[0].id, slug: 'gloom-cave', title_en: 'The Gloom Cave Guide', blocks: [{ type: 'text', md_en: 'Beware the Bone Spider on the last floor.' }, { type: 'html', html: '<script>' }] },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', section_id: SEC[2].id, slug: 'hidden', title_en: 'Hidden Spider', blocks: [] }
];

function mockRes() {
  const res = { headers: {}, code: 0, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

const call = async (query, method = 'GET', ip = `10.0.0.${Math.floor(Math.random() * 250)}`) => {
  const res = mockRes();
  await handler({ method, query, headers: { 'x-forwarded-for': ip } }, res);
  return res;
};

describe('Bitacora: api/logbook.js', () => {
  let urls;
  beforeEach(() => {
    urls = [];
    process.env.SUPABASE_URL = 'https://abc.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-test';
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      urls.push(url);
      const u = new URL(url);
      const table = u.pathname.split('/').pop();
      let body = [];
      if (table === 'logbook_sections') body = SEC;
      if (table === 'logbook_places') body = [];
      if (table === 'logbook_entries') {
        const idEq = u.searchParams.get('id');
        body = idEq ? ENT.filter((e) => `eq.${e.id}` === idEq) : ENT;
        if (!u.searchParams.get('select').includes('blocks')) body = body.map(({ blocks, ...m }) => m);
      }
      return { ok: true, status: 200, json: async () => body };
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
  });

  it('solo GET', async () => {
    const res = await call({ action: 'index' }, 'POST');
    expect(res.code).toBe(405);
  });

  it('503 si falta la clave de Supabase', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await call({ action: 'index' });
    expect(res.code).toBe(503);
  });

  it('index: oculta secciones en borrador y sus descendientes; pide solo publicadas; cachea', async () => {
    const res = await call({ action: 'index' });
    expect(res.code).toBe(200);
    expect(res.body.sections.map((s) => s.slug)).toEqual(['guides']);
    expect(res.body.sections[0].status).toBeUndefined();
    expect(res.body.entries.map((e) => e.slug)).toEqual(['gloom-cave']);
    expect(res.body.mediaBase).toBe(MEDIA);
    expect(urls.find((u) => u.includes('logbook_entries'))).toContain('status=eq.published');
    expect(res.headers['cache-control']).toContain('s-maxage=60');
    expect(fetch.mock.calls[0][1].headers.apikey).toBe('service-key-test');
  });

  it('entry: valida uuid, sanea bloques y devuelve 404 si la seccion no es visible', async () => {
    expect((await call({ action: 'entry', id: '1 or 1=1' })).code).toBe(400);
    const ok = await call({ action: 'entry', id: ENT[0].id });
    expect(ok.code).toBe(200);
    expect(ok.body.entry.blocks).toEqual([{ type: 'text', md_en: 'Beware the Bone Spider on the last floor.', md_es: '' }]);
    expect((await call({ action: 'entry', id: ENT[1].id })).code).toBe(404);
  });

  it('search: busca en el cuerpo, devuelve fragmento y no expone bloques ni ocultas', async () => {
    const res = await call({ action: 'search', q: 'spider' });
    expect(res.code).toBe(200);
    expect(res.body.results.map((r) => r.slug)).toEqual(['gloom-cave']);
    expect(res.body.results[0].blocks).toBeUndefined();
    expect(res.body.results[0].snippet).toContain('Bone Spider');
    expect((await call({ action: 'search', q: 'x' })).code).toBe(400);
  });

  it('errores de Supabase no filtran detalles', async () => {
    fetch.mockImplementation(async () => ({ ok: false, status: 500, json: async () => ({ message: 'secret detail' }) }));
    const res = await call({ action: 'index' });
    expect(res.code).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('limite de pedidos por IP', async () => {
    let last;
    for (let i = 0; i < 95; i++) last = await call({ action: 'nope' }, 'GET', '9.9.9.9');
    expect(last.code).toBe(429);
  });

  it('helpers: visibleSectionIds y makeSnippet', () => {
    expect([...visibleSectionIds(SEC)]).toEqual([SEC[0].id]);
    expect(makeSnippet('Árbol grande. La Cueva Lúgubre está al norte.', 'lugubre')).toContain('Lúgubre');
  });
});
