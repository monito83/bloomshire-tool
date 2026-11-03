// doc.js -- the map document: what a map IS, and how it is written to disk.
//
// In memory a map is plain objects plus one Uint32Array per tile layer:
//
//   doc.layers   bottom to top. A layer is either
//                  { type: 'tiles',   data: Uint32Array(width*height) }  -- a gid per cell, 0 = empty
//                  { type: 'objects', objects: [ obj, ... ] }            -- drawn in array order
//   doc.tilesets every image a tile layer paints from, each owning a range of
//                gids starting at `firstgid` (the convention Tiled uses)
//   doc.zones    named planning rectangles (never drawn in the game)
//   doc.groups   names of object groups; an object's `group` points here
//
// An object is a rectangle of a source image, placed and transformed:
//   { id, asset, sx, sy, sw, sh,   x, y, w, h,   rot, flipX, flipY, ... }
// x,y is the top-left of the object's box in map pixels; w,h its size on the
// map; rot (degrees) and flips turn it about the box centre. The source art is
// never touched.

export const FORMAT = 'bloomshire-editor-map';
export const EXPORT_FORMAT = 'bloomshire-map-export';
export const VERSION = 1;

export const LAYER_COLORS = ['#8cc26b', '#e0a84a', '#6fa8dc', '#c27ba0', '#76c7b7', '#e06666', '#b4a7d6', '#f6b26b'];

let seq = 0;
export const newId = (prefix, doc) => {
  // unique within the document, stable, short
  if (doc) {
    const n = doc.nextId ?? 1;
    // Live, each designer numbers from their own block (live.mjs) so two people
    // never both make "o57". Run past the end before the next block arrives
    // (a paste of thousands) and the id is one nobody else could make instead.
    if (doc.idLimit && n >= doc.idLimit) return `${prefix}${Date.now().toString(36)}_${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    doc.nextId = n + 1;
    return `${prefix}${n}`;
  }
  return `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;
};

export function makeLayer(doc, type, name) {
  const base = { id: newId('L', doc), name, type, visible: true, locked: false, opacity: 1 };
  if (type === 'tiles') return { ...base, data: new Uint32Array(doc.width * doc.height) };
  return { ...base, ysort: false, objects: [] };
}

export function newDoc({ id, name, region = '', width = 128, height = 96, tileSize = 16, background = '#5a8f3c', notes = '' }) {
  const doc = {
    id, name, region, notes, tileSize, width, height, background,
    tilesets: [], layers: [], zones: [], groups: {}, nextId: 1,
    editor: { view: null }, createdAt: new Date().toISOString(),
  };
  doc.layers.push(makeLayer(doc, 'tiles', 'Ground'));
  doc.layers.push(makeLayer(doc, 'tiles', 'Ground detail'));
  doc.layers.push(makeLayer(doc, 'objects', 'Objects'));
  doc.layers.push(makeLayer(doc, 'objects', 'Foreground'));
  return doc;
}

/* ------------------------------------------------------------- tilesets */

/** The gid range for an image, registering it the first time it is painted with. */
export function tilesetFor(doc, image, columns, rows) {
  let ts = doc.tilesets.find((t) => t.image === image);
  if (ts) return ts;
  const last = doc.tilesets[doc.tilesets.length - 1];
  const firstgid = last ? last.firstgid + last.tileCount : 1;
  ts = { image, firstgid, columns, rows, tileCount: columns * rows };
  doc.tilesets.push(ts);
  return ts;
}

/** gid -> { ts, index } or null. Tilesets are kept in firstgid order. */
export function resolveGid(doc, gid) {
  if (!gid) return null;
  const list = doc.tilesets;
  let lo = 0, hi = list.length - 1, hit = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m].firstgid <= gid) { hit = m; lo = m + 1; } else hi = m - 1; }
  if (hit < 0) return null;
  const ts = list[hit], index = gid - ts.firstgid;
  return index < ts.tileCount ? { ts, index } : null;
}

/* ------------------------------------------------------------ geometry */

/** The four corners of an object's (rotated) box, in map pixels. */
export function corners(o) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  const a = ((o.rot ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-o.w / 2, -o.h / 2], [o.w / 2, -o.h / 2], [o.w / 2, o.h / 2], [-o.w / 2, o.h / 2]]
    .map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

/** Axis-aligned bounds of an object, rotation included. */
export function bounds(o) {
  if (!o.rot) return { x: o.x, y: o.y, w: o.w, h: o.h };
  const pts = corners(o);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

export function unionBounds(list) {
  if (!list.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const o of list) {
    const b = o.w !== undefined && o.sx !== undefined ? bounds(o) : o;
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Map point -> object-local point (origin at the box centre, unrotated, unflipped). */
export function toLocal(o, wx, wy) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  const a = (-(o.rot ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const dx = wx - cx, dy = wy - cy;
  return [dx * c - dy * s, dx * s + dy * c];
}

/** Every object in draw order (bottom layer first), with its layer. */
export function* allObjects(doc) {
  for (const layer of doc.layers) if (layer.type === 'objects') for (const o of layer.objects) yield [o, layer];
}

export function findObject(doc, id) {
  for (const layer of doc.layers) {
    if (layer.type !== 'objects') continue;
    const i = layer.objects.findIndex((o) => o.id === id);
    if (i >= 0) return { obj: layer.objects[i], layer, index: i };
  }
  return null;
}

export const layerOf = (doc, obj) => doc.layers.find((l) => l.type === 'objects' && l.objects.includes(obj)) ?? null;

/** Draw order within a layer: its array order, or feet-first when the layer sorts by depth. */
export function drawOrder(layer) {
  if (!layer.ysort) return layer.objects;
  return layer.objects.map((o, i) => [o, i]).sort((a, b) => (a[0].y + a[0].h) - (b[0].y + b[0].h) || a[1] - b[1]).map((p) => p[0]);
}

/* ------------------------------------------------------ serialization */

function rleEncode(arr) {
  const out = [];
  let i = 0;
  while (i < arr.length) {
    const v = arr[i]; let n = 1;
    while (i + n < arr.length && arr[i + n] === v) n++;
    out.push(v, n); i += n;
  }
  return out;
}

function rleDecode(runs, size) {
  const out = new Uint32Array(size);
  let p = 0;
  for (let i = 0; i + 1 < runs.length && p < size; i += 2) {
    const v = runs[i] >>> 0, n = Math.min(runs[i + 1], size - p);
    if (v) out.fill(v, p, p + n);
    p += n;
  }
  return out;
}

const r2 = (v) => Math.round(v * 1000) / 1000;

function objectOut(o, z) {
  const out = {
    id: o.id, asset: o.asset,
    source: { x: o.sx, y: o.sy, w: o.sw, h: o.sh },
    x: r2(o.x), y: r2(o.y), width: r2(o.w), height: r2(o.h),
    scaleX: r2(o.w / o.sw), scaleY: r2(o.h / o.sh),
    rotation: r2(o.rot ?? 0), flipX: !!o.flipX, flipY: !!o.flipY, zIndex: z,
  };
  if (o.name) out.name = o.name;
  if (o.notes) out.notes = o.notes;
  if (o.tags?.length) out.tags = [...o.tags];
  if (o.group) out.group = o.group;
  if (o.locked) out.locked = true;
  if (o.frame !== undefined && o.frame !== null) out.frame = o.frame;
  // (the designer's say on what stops the farmer, the Blockers tool, 2026-10-20: 'none', or a box in px from the top
  //  left corner; and whether it lies under the farmer's feet)
  if (o.block === 'none') out.block = 'none';
  else if (o.block) out.block = { x: r2(o.block.x), y: r2(o.block.y), w: r2(o.block.w), h: r2(o.block.h) };
  if (o.flat !== undefined) out.flat = !!o.flat;
  return out;
}

export function objectIn(j) {
  const s = j.source ?? {};
  const o = {
    id: String(j.id ?? newId('o')), asset: String(j.asset ?? ''),
    sx: +s.x || 0, sy: +s.y || 0, sw: Math.max(1, +s.w || +j.width || 16), sh: Math.max(1, +s.h || +j.height || 16),
    x: +j.x || 0, y: +j.y || 0,
    w: +j.width || (+s.w * (+j.scaleX || 1)) || 16, h: +j.height || (+s.h * (+j.scaleY || 1)) || 16,
    rot: +j.rotation || 0, flipX: !!j.flipX, flipY: !!j.flipY,
  };
  if (j.name) o.name = String(j.name);
  if (j.notes) o.notes = String(j.notes);
  if (Array.isArray(j.tags) && j.tags.length) o.tags = j.tags.map(String);
  if (j.group) o.group = String(j.group);
  if (j.locked) o.locked = true;
  if (j.frame !== undefined) o.frame = +j.frame;
  if (j.block === 'none') o.block = 'none';
  else if (j.block && typeof j.block === 'object') o.block = { x: +j.block.x || 0, y: +j.block.y || 0, w: Math.max(1, +j.block.w || 1), h: Math.max(1, +j.block.h || 1) };
  if (typeof j.flat === 'boolean') o.flat = j.flat;
  return o;
}

/** The saved form (maps/<id>.json). `forExport` drops editor-only state. */
export function serialize(doc, { forExport = false, includeZones = true, includeHidden = true } = {}) {
  const layers = doc.layers.filter((l) => includeHidden || l.visible).map((l) => {
    const base = { id: l.id, name: l.name, type: l.type, visible: l.visible, locked: l.locked, opacity: l.opacity };
    if (l.type === 'tiles') return { ...base, encoding: 'rle', data: rleEncode(l.data) };
    return { ...base, ysort: !!l.ysort, objects: l.objects.map((o, i) => objectOut(o, i)) };
  });
  const out = {
    format: forExport ? EXPORT_FORMAT : FORMAT, version: VERSION,
    id: doc.id, name: doc.name, region: doc.region ?? '', notes: doc.notes ?? '',
    ...(doc.dark ? { dark: true } : {}),                         // (a dark place that is no cave: the dungeon's levels)
    tileSize: doc.tileSize, width: doc.width, height: doc.height,
    pixelWidth: doc.width * doc.tileSize, pixelHeight: doc.height * doc.tileSize,
    background: doc.background,
    assetRoot: doc.assetRoot ?? 'New Main Asset Pack',
    tilesets: doc.tilesets.map((t) => ({ firstgid: t.firstgid, image: t.image, tileWidth: doc.tileSize, tileHeight: doc.tileSize,
                                          columns: t.columns, rows: t.rows, tileCount: t.tileCount })),
    layers,
    groups: Object.values(doc.groups).map((g) => ({ id: g.id, name: g.name })),
  };
  if (includeZones) out.zones = doc.zones.map((z) => ({ id: z.id, name: z.name, x: z.x, y: z.y, width: z.w, height: z.h,
                                                        color: z.color, notes: z.notes ?? '', tags: z.tags ?? [] }));
  if (forExport) {
    out.exportedAt = new Date().toISOString();
    // which art libraries this map actually drew on, so whoever consumes the
    // export can resolve every path without guessing
    out.sources = (doc.assetSources ?? []).map((s) => ({ id: s.id, name: s.name, dir: s.dir }));
    out.conventions = {
      units: 'pixels; the map origin is its top-left corner, x grows right and y grows down',
      tiles: 'tile layers are width*height gids in row-major order, run-length encoded as [gid, count, gid, count, ...]; gid 0 is empty; a gid belongs to the tileset with the largest firstgid <= gid, and its tile is (gid - firstgid), counted left to right, top to bottom, in columns of tileWidth',
      objects: 'x,y is the top-left of the object box before rotation; width,height its drawn size; rotation (degrees, clockwise) and flips turn it about the box centre; source is the rectangle of the asset image that is drawn',
      order: 'layers are listed bottom to top; within a layer objects draw in zIndex order unless ysort is true, in which case they draw by the bottom edge (y + height), zIndex breaking ties',
      assets: 'an asset path either names a file inside assetRoot, or begins with a library id from `sources` followed by a slash, in which case the rest of the path is relative to THAT library. A map may mix libraries freely.',
    };
  } else {
    out.editor = { view: doc.editor?.view ?? null, reference: doc.editor?.reference ?? null, savedWith: 'bloomshire-map-editor 1' };
    out.nextId = doc.nextId;
    out.createdAt = doc.createdAt;
    out.savedAt = new Date().toISOString();
  }
  return out;
}

/** Read a saved (or exported) map. Tolerant: anything missing gets a default. */
export function deserialize(j) {
  if (!j || (j.format !== FORMAT && j.format !== EXPORT_FORMAT)) throw new Error('This file is not a Bloomshire editor map.');
  const width = Math.max(1, j.width | 0), height = Math.max(1, j.height | 0);
  const doc = {
    id: String(j.id), name: String(j.name ?? j.id), region: j.region ?? '', notes: j.notes ?? '',
    // (DARK, 2026-10-27, the Season 0 audit: read in, a map lost it, so the dungeon's levels -- dark, but no cave by their
    //  region -- were out of doors: the hour's sky and its rain over them, crickets and wind, footsteps on grass)
    ...(j.dark ? { dark: true } : {}),
    tileSize: j.tileSize || 16, width, height, background: j.background ?? '#5a8f3c',
    assetRoot: j.assetRoot, tilesets: [], layers: [], zones: [], groups: {},
    nextId: j.nextId ?? 1, editor: { view: j.editor?.view ? { ...j.editor.view } : null, reference: j.editor?.reference ?? null }, createdAt: j.createdAt,
  };
  doc.tilesets = (j.tilesets ?? []).map((t) => ({ image: t.image, firstgid: t.firstgid, columns: t.columns, rows: t.rows,
                                                  tileCount: t.tileCount ?? t.columns * t.rows }))
    .sort((a, b) => a.firstgid - b.firstgid);
  for (const l of j.layers ?? []) {
    const base = { id: String(l.id ?? newId('L')), name: String(l.name ?? 'Layer'), type: l.type === 'tiles' ? 'tiles' : 'objects',
                   visible: l.visible !== false, locked: !!l.locked, opacity: l.opacity ?? 1 };
    if (base.type === 'tiles') {
      const data = l.encoding === 'rle' ? rleDecode(l.data ?? [], width * height)
                                        : Uint32Array.from((l.data ?? []).slice(0, width * height));
      doc.layers.push({ ...base, data: data.length === width * height ? data : Object.assign(new Uint32Array(width * height), data) });
    } else {
      const raw = [...(l.objects ?? [])];
      if (raw.length && raw.every((o) => typeof o.zIndex === 'number')) raw.sort((a, b) => a.zIndex - b.zIndex);
      doc.layers.push({ ...base, ysort: !!l.ysort, objects: raw.map(objectIn) });
    }
  }
  doc.zones = (j.zones ?? []).map((z) => ({ id: String(z.id), name: z.name ?? 'Zone', x: +z.x || 0, y: +z.y || 0,
                                            w: +(z.width ?? z.w) || 16, h: +(z.height ?? z.h) || 16,
                                            color: z.color ?? '#e0a84a', notes: z.notes ?? '', tags: [...(z.tags ?? [])] }));
  for (const g of j.groups ?? []) doc.groups[g.id] = { id: g.id, name: g.name ?? g.id };
  // keep new ids clear of every id already in the file
  let max = doc.nextId;
  const bump = (id) => { const m = /^[a-zA-Z]+(\d+)$/.exec(id ?? ''); if (m) max = Math.max(max, +m[1] + 1); };
  for (const l of doc.layers) { bump(l.id); for (const o of l.objects ?? []) bump(o.id); }
  for (const z of doc.zones) bump(z.id);
  for (const g of Object.keys(doc.groups)) bump(g);
  doc.nextId = max;
  if (!doc.layers.length) doc.layers.push(makeLayer(doc, 'objects', 'Objects'));
  return doc;
}

/** Deep copy of an object (for clipboard, history snapshots). */
export const cloneObj = (o) => ({ ...o, tags: o.tags ? [...o.tags] : undefined });
