// assets.js -- the asset library as data: the manifest, the folder tree, the
// collections, search, and the images themselves.
//
// An ENTRY is one thing you can pick in the library:
//   { key, name, path, rect:[x,y,w,h], frames?, kind: 'sprite'|'anim'|'tileset'|'prefab', file, hay }
// `key` is "path#x,y,w,h" -- stable across rescans as long as the art is unchanged.

import { packURL, serverURL } from './util.js';
import { terrainsFrom } from './terrain.js';

const SYNONYMS = {
  rock: 'stone', rocks: 'stones', house: 'houses', home: 'house', building: 'houses', tree: 'trees', bush: 'bushes',
  npc: "npc's", person: 'character', people: 'character', snow: 'winter', ice: 'frozen', lake: 'water', river: 'water',
  pond: 'water', sea: 'beach', coast: 'beach', ground: 'tileset', terrain: 'tileset', floor: 'tileset', road: 'path',
  street: 'path', plant: 'crops', farm: 'farm', fence: 'fence', wall: 'fence', lamp: 'lamp', light: 'lamp',
};

export class Assets {
  constructor(app) {
    this.app = app;
    this.images = new Map();          // path -> { img, state: 'loading'|'ok'|'error', waiters: [] }
    this.alpha = new Map();           // path -> Uint8ClampedArray alpha (for pixel-exact picking)
    this.entries = [];
    this.byKey = new Map();
    this.byFile = new Map();
    this.prefabs = [];
    this.manifest = null;
    this.queue = [];            // images waiting to load
    this.active = 0;
    this.maxActive = 12;        // at once -- enough to be quick, few enough to be safe
    this.maxCached = 700;       // decoded pictures kept in memory (the open map is always kept)
  }

  async load() {
    const r = await fetch(serverURL('/api/manifest'));
    if (!r.ok) throw new Error(`the asset manifest could not be loaded (${r.status})`);
    this.build(await r.json());
  }

  build(m) {
    this.manifest = m;
    this.files = m.files;
    this.tileSize = m.tileSize ?? 16;
    this.collections = m.collections ?? [];
    this.kits = m.kits ?? [];
    this.sources = m.sources ?? [{ id: 'main', name: 'Assets', short: 'Main' }];
    this.sourceById = new Map(this.sources.map((s) => [s.id, s]));
    this.defaultSource = this.sources[0]?.id ?? 'main';

    // ONE PATH, QUALIFIED BY ITS LIBRARY.
    //
    // Two packs can hold the same relative path, so a bare path is ambiguous
    // once more than one library is indexed. Every file's path is therefore
    // prefixed with its source id here, once, at the door: "cv2/Tilesets/
    // Grass.png". Everything downstream -- entries, tile sheets, terrains, the
    // image cache, the asset recorded on a placed object -- keeps treating it
    // as a single opaque string, so nothing else had to change.
    //
    // The FIRST library is left unprefixed, which is what makes every map
    // written before this change still resolve.
    for (const f of m.files) {
      f.src = f.s ?? this.defaultSource;
      if (f.src !== this.defaultSource && !f.p.startsWith(f.src + '/')) f.p = `${f.src}/${f.p}`;
    }

    const colName = Object.fromEntries(this.collections.map((c) => [c.id, c.name]));
    const entries = [];
    const add = (e) => {
      const srcName = this.sourceById.get(e.file.src)?.name ?? '';
      e.src = e.file.src;
      e.srcName = srcName;
      e.srcShort = this.sourceById.get(e.file.src)?.short ?? '';
      e.hay = `${e.name} ${e.path} ${e.cat ?? ''} ${(e.file.t ?? []).join(' ')} ${(e.file.c ?? []).map((c) => colName[c]).join(' ')} ${e.kind} ${srcName}`.toLowerCase();
      entries.push(e);
    };
    // Every entry carries the KIND folder it is filed in (catalog.mjs). A piece
    // cut from a tile sheet is filed with props, the sheet itself with tiles.
    for (const a of m.assets) {
      const file = m.files[a.f];
      add({ key: `${file.p}#${a.r.join(',')}`, name: a.n, path: file.p, rect: a.r, frames: a.fr ?? null,
            kind: a.fr ? 'anim' : 'sprite', file, cat: file.pcat ?? file.cat ?? 'Unsorted' });
    }
    // tilesets appear in the library too: picking one opens it in the Tiles palette
    for (const file of m.files) if (file.k === 'tileset')
      add({ key: `${file.p}#tileset`, name: file.n, path: file.p, rect: [0, 0, file.w, file.h], kind: 'tileset', file, cat: file.cat ?? 'Unsorted' });
    entries.sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true }) || (a.kind === 'tileset' ? -1 : 0) || a.rect[1] - b.rect[1] || a.rect[0] - b.rect[0]);
    this.entries = entries;
    this.byKey = new Map(entries.map((e) => [e.key, e]));
    this.byFile = new Map();
    for (const e of entries) (this.byFile.get(e.path) ?? this.byFile.set(e.path, []).get(e.path)).push(e);
    this.tilesets = m.files.filter((f) => f.k === 'tileset');
    // grounds you can paint with (see terrain.js)
    this.terrains = terrainsFrom(m.files);
    this.terrainsByImage = new Map();
    for (const t of this.terrains) (this.terrainsByImage.get(t.image) ?? this.terrainsByImage.set(t.image, []).get(t.image)).push(t);
    this.terrainByKey = new Map(this.terrains.map((t) => [t.key, t]));
    this.fileByPath = new Map(m.files.map((f) => [f.p, f]));
    this.tree = this.buildTree(entries);
    this.byCollection = new Map(this.collections.map((c) => [c.id, entries.filter((e) => e.file.c?.includes(c.id))]));
    this.bySource = new Map(this.sources.map((s) => [s.id, entries.filter((e) => e.src === s.id)]));
    // A KIT is everything needed to build one thing -- the blacksmith's
    // building, his forge, his interior and the smith himself -- gathered
    // across folders and across libraries. See build-manifest.mjs.
    this.byKit = new Map(this.kits.map((k) => [k.id, entries.filter((e) => e.file.kit?.includes(k.id))]));
    // how many entries each library contributed, for the filter's counts
    this.sourceCounts = Object.fromEntries(this.sources.map((s) => [s.id, this.bySource.get(s.id)?.length ?? 0]));
    // THE KIND FOLDERS: one tree, every entry in exactly one folder of it
    this.kinds = m.kinds ?? [];
    this.kindRank = new Map(this.kinds.map((k, i) => [k.name, i]));
    this.kindTree = this.buildKindTree(entries);
    // the whole library in kind order -- folder by folder, the way the tree reads
    this.byKindOrder = [...entries].sort((a, b) => this.compareCat(a.cat, b.cat) || a.path.localeCompare(b.path, 'en', { numeric: true }) || a.rect[1] - b.rect[1] || a.rect[0] - b.rect[0]);
  }

  /** Order two kind paths: top-level folders in the pack's own order, then by name. */
  compareCat(a = '', b = '') {
    if (a === b) return 0;
    const [ta] = a.split('/'), [tb] = b.split('/');
    const ra = this.kindRank?.get(ta) ?? 999, rb = this.kindRank?.get(tb) ?? 999;
    return ra - rb || a.localeCompare(b, 'en', { numeric: true });
  }

  /** { name, path, children: Map, count } for every kind folder, from entries' `cat`. */
  buildKindTree(entries) {
    const root = { name: 'Everything', path: '', children: new Map(), count: 0 };
    for (const e of entries) {
      let n = root; n.count++;
      let p = '';
      for (const part of (e.cat || 'Unsorted').split('/')) {
        p = p ? `${p}/${part}` : part;
        if (!n.children.has(part)) n.children.set(part, { name: part, path: p, children: new Map(), count: 0 });
        n = n.children.get(part); n.count++;
      }
    }
    return root;
  }

  /** The node of the kind tree at a path, or null. */
  kindNode(path) {
    let n = this.kindTree;
    for (const part of String(path).split('/').filter(Boolean)) { n = n.children.get(part); if (!n) return null; }
    return n;
  }

  /** Every entry filed at or under a kind folder, in folder order. */
  inKind(path) {
    const pre = path + '/';
    return this.byKindOrder.filter((e) => e.cat === path || e.cat.startsWith(pre));
  }

  /**
   * A trade's art, split by kind: [{ name, count }] for its top-level kind
   * folders -- "Blacksmith" opens onto Buildings, Work stations, Items...
   */
  tradeKinds(id) {
    const counts = new Map();
    for (const e of this.byKit.get(id) ?? []) { const top = e.cat.split('/')[0]; counts.set(top, (counts.get(top) ?? 0) + 1); }
    return [...counts].sort((a, b) => this.compareCat(a[0], b[0])).map(([name, count]) => ({ name, count }));
  }

  /** A trade's entries, optionally narrowed to one kind, in folder order. */
  inTrade(id, kind = null) {
    const list = (this.byKit.get(id) ?? []).filter((e) => !kind || e.cat === kind || e.cat.startsWith(kind + '/'));
    return list.sort((a, b) => this.compareCat(a.cat, b.cat) || a.path.localeCompare(b.path, 'en', { numeric: true }) || a.rect[1] - b.rect[1] || a.rect[0] - b.rect[0]);
  }

  buildTree(entries) {
    const root = { name: 'All assets', path: '', children: new Map(), count: 0 };
    for (const e of entries) {
      const parts = e.path.split('/'); parts.pop();
      let n = root; n.count++;
      let p = '';
      for (const part of parts) {
        p = p ? `${p}/${part}` : part;
        if (!n.children.has(part)) n.children.set(part, { name: part, path: p, children: new Map(), count: 0 });
        n = n.children.get(part); n.count++;
      }
    }
    return root;
  }

  /** Entries under a folder path ('' = everything). */
  inFolder(path) {
    if (!path) return this.entries;
    const pre = path + '/';
    return this.entries.filter((e) => e.path.startsWith(pre));
  }

  /** Fast word search over names, folders, tags and collections. */
  search(query, within = this.entries) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return within;
    const alts = words.map((w) => [w, SYNONYMS[w]].filter(Boolean));
    const hits = within.filter((e) => alts.every((alt) => alt.some((w) => e.hay.includes(w))));
    const first = words[0];
    return hits.sort((a, b) => (b.name.toLowerCase().startsWith(first) - a.name.toLowerCase().startsWith(first)));
  }

  /** The library entry an object on the map came from (or null for art the manifest does not know). */
  entryForObject(o) {
    const list = this.byFile.get(o.asset);
    if (!list) return null;
    return list.find((e) => e.rect[0] === o.sx && e.rect[1] === o.sy && e.rect[2] === o.sw && e.rect[3] === o.sh)
        ?? list.find((e) => e.frames?.some((f) => f[0] === o.sx && f[1] === o.sy && f[2] === o.sw && f[3] === o.sh))
        ?? null;
  }

  /* -------------------------------------------------------------- images */
  //
  // Loading is queued, retried and bounded. The library can ask for hundreds
  // of pictures in a second while you scroll, and a browser that is briefly
  // out of breath answers some of them with an error -- which used to stick,
  // and left a magenta "missing art" cross on something that was never
  // missing. Now a failure is retried a few times before it counts, only a
  // few load at once, and old pictures the open map does not use are dropped
  // so the tab's memory stays small (they reload if they are asked for again).

  /** The image record for a pack path, loading it on first request. */
  image(path) {
    let rec = this.images.get(path);
    if (rec) {
      rec.used = performance.now();
      // (the game: a picture that could not be had is asked for again a while later -- recovering())
      if (rec.state === 'error' && this.recover && rec.used >= (rec.again ?? 0)) { rec.state = 'loading'; rec.tries = 0; this.queue.push(rec); this.pump(); }
      return rec;
    }
    rec = { img: null, state: 'loading', waiters: [], tries: 0, used: performance.now(), path };
    this.images.set(path, rec);
    this.queue.push(rec);
    this.pump();
    this.evict();
    return rec;
  }

  /**
   * THE GAME'S PICTURES COME BACK (2026-09-29, the designer, on a phone: the townsfolk and the other players showed
   * "their names but not their avatars"). A phone's connection drops and returns; three failures in a second used
   * to give a picture up for good, and whoever was drawn with it stayed without it. For the game (not the editor,
   * whose missing art is marked as missing): a failure is retried more patiently (0.5, 1, 2, 4 s), a request that
   * hangs is given up after 20 s and retried, and a picture given up is asked for again when it is next wanted --
   * 5 s later, then 10, 20, up to a minute -- and at once when the page is back in view or back online.
   */
  recovering() {
    if (this.recover) return;
    this.recover = true;
    const again = () => { if (document.visibilityState === 'hidden') return; for (const r of this.images.values()) if (r.state === 'error') r.again = 0; };
    addEventListener('online', again);
    document.addEventListener('visibilitychange', again);
  }

  pump() {
    while (this.active < this.maxActive && this.queue.length) {
      const rec = this.queue.shift();
      if (!this.images.has(rec.path) || rec.state !== 'loading') continue;   // dropped (or settled) while queued
      this.active++;
      const img = new Image();
      rec.img = img;
      rec.tries++;
      img.decoding = 'async';
      let over = false, late = 0;
      const end = () => { if (over) return false; over = true; clearTimeout(late); this.active--; return true; };
      const failed = () => {
        if (!end()) return;
        const most = this.recover ? 5 : 3;
        if (rec.tries < most) {                                    // give it another go before calling it missing
          rec.img = null;
          const wait = this.recover ? 500 * 2 ** (rec.tries - 1) : 200 * rec.tries;
          setTimeout(() => { if (this.images.get(rec.path) === rec && rec.state === 'loading') { if (this.recover) this.queue.unshift(rec); else this.queue.push(rec); this.pump(); } }, wait);   // (the game's: first in line, it has waited longest)
        } else {
          rec.state = 'error';
          rec.fails = (rec.fails ?? 0) + 1;
          rec.again = performance.now() + Math.min(60000, 5000 * 2 ** (rec.fails - 1));
          console.warn(`[map editor] could not load ${rec.path} after ${rec.tries} tries`);
          this.settle(rec);
        }
        this.pump();
      };
      img.onload = () => { if (!end()) return; rec.state = 'ok'; this.settle(rec); this.pump(); };
      img.onerror = failed;
      // (a request that hangs -- a connection that went away without a word -- is given up and tried again)
      if (this.recover) late = setTimeout(() => { if (rec.img === img) { img.onload = img.onerror = null; img.src = ''; } failed(); }, 20000);
      // (after a failure, a fresh address -- the servers read only the path: a browser would otherwise hand the retry
      //  to the request still hanging on the old one)
      rec.attempts = (rec.attempts ?? 0) + 1;
      img.src = packURL(rec.path) + (this.recover && rec.attempts > 1 ? `?r=${rec.attempts}` : '');
    }
  }

  settle(rec) {
    for (const w of rec.waiters) w(rec);
    rec.waiters = [];
    this.app.onImageLoaded?.(rec.path, rec);
    if (this.images.size > this.maxCached * 1.15) this.evict();   // a burst of loads settles back down
  }

  /** Art the open map needs is never dropped. */
  pinned() {
    const keep = new Set();
    const doc = this.app.doc;
    if (!doc) return keep;
    for (const t of doc.tilesets ?? []) keep.add(t.image);
    for (const l of doc.layers ?? []) for (const o of l.objects ?? []) keep.add(o.asset);
    return keep;
  }

  evict() {
    if (this.images.size <= this.maxCached) return;
    const keep = this.pinned();
    const drop = [...this.images.values()]
      .filter((r) => r.state === 'ok' && !keep.has(r.path))
      .sort((a, b) => a.used - b.used)
      .slice(0, this.images.size - this.maxCached);
    for (const r of drop) { this.images.delete(r.path); this.alpha.delete(r.path); }
  }

  /** Try any art that failed to load again (File > Reload art, and after a rescan). */
  retryFailed() {
    let n = 0;
    for (const rec of [...this.images.values()]) if (rec.state === 'error') { this.images.delete(rec.path); this.alpha.delete(rec.path); n++; }
    if (n) { this.app.renderer?.invalidateAll(); this.app.emit('images'); }
    return n;
  }

  whenLoaded(path) {
    const rec = this.image(path);
    if (rec.state !== 'loading') return Promise.resolve(rec);
    return new Promise((ok) => rec.waiters.push(ok));
  }

  /** Is the pixel at (x,y) of this image opaque? Unknown -> true. */
  opaqueAt(path, x, y) {
    const rec = this.images.get(path);
    if (!rec || rec.state !== 'ok') return true;
    let a = this.alpha.get(path);
    if (!a) {
      const c = document.createElement('canvas');
      c.width = rec.img.naturalWidth; c.height = rec.img.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(rec.img, 0, 0);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      a = new Uint8Array(c.width * c.height);
      for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3];
      a.w = c.width;
      this.alpha.set(path, a);
    }
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= a.w || y >= a.length / a.w) return false;
    return a[y * a.w + x] > 8;
  }

  /**
   * Draw an entry's picture into a canvas, as big as fits in `box` pixels at a
   * whole-number zoom where possible (pixel art stays crisp).
   */
  async drawThumb(canvas, entry, box, { maxScale = 4 } = {}) {
    const [sx, sy, sw, sh] = entry.rect;
    const rec = entry.kind === 'prefab' ? null : await this.whenLoaded(entry.path);
    const g = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box * dpr); canvas.height = Math.round(box * dpr);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (entry.kind === 'prefab') { if (entry.thumb) { const im = new Image(); im.src = entry.thumb; await im.decode().catch(() => {}); g.drawImage(im, 0, 0, canvas.width, canvas.height); } return; }
    if (!rec || rec.state !== 'ok') { drawMissing(g, 0, 0, canvas.width, canvas.height); return; }
    const fit = Math.min((box * dpr) / sw, (box * dpr) / sh);
    const s = fit >= 1 ? Math.min(Math.floor(fit), maxScale * dpr) : fit;
    const w = Math.max(1, Math.round(sw * s)), h = Math.max(1, Math.round(sh * s));
    g.drawImage(rec.img, sx, sy, sw, sh, Math.floor((canvas.width - w) / 2), Math.floor((canvas.height - h) / 2), w, h);
  }
}

/** The placeholder for art that could not be found. */
export function drawMissing(g, x, y, w, h) {
  g.save();
  g.fillStyle = 'rgba(214, 46, 150, 0.35)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#d62e96';
  g.lineWidth = Math.max(1, Math.min(w, h) / 24);
  g.strokeRect(x + g.lineWidth / 2, y + g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke();
  g.restore();
}
