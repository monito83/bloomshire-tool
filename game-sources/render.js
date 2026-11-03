// render.js -- drawing the map.
//
// Only draws when something changed (request() coalesces into one frame).
// Tile layers are drawn from CHUNKS: 32x32-tile canvases, cached per zoom
// level of detail (a chunk seen at 25% is built at a quarter of the size), so
// a large map zoomed out costs a few hundred image draws, not a few hundred
// thousand. Objects are culled to the view and drawn straight from their
// source images. Pixel art is never smoothed.

import { resolveGid, bounds, drawOrder, corners } from './doc.js';
import { drawMissing } from './assets.js';

const CH = 32;                                  // tiles per chunk side
const LODS = [1, 0.5, 0.25, 0.125, 0.0625];
const lodFor = (s) => LODS.find((l) => s >= l * 0.999) ?? LODS[LODS.length - 1];
const OUTSIDE = '#16130f';
const SEL = '#ffcf5a';
export const RULER = 22;                        // ruler thickness, css px

export class Renderer {
  /**
   * `view` and `tools` default to the app's main ones. The whole-map panel
   * passes its own: a view fitted to the whole map, and the tools that work
   * through it (wholemap.js).
   */
  constructor(app, canvas, { view = null, tools = null, main = true } = {}) {
    this.app = app;
    this.canvas = canvas;
    this.viewFn = view;
    this.toolsFn = tools;
    this.main = main;
    this.linked = null;                         // another renderer that redraws whenever this one does
    this.g = canvas.getContext('2d', { alpha: false });
    this.chunks = new Map();                    // key -> { canvas, lod, dirty, empty, px }
    this.cachedPx = 0;
    this.budget = 48e6;                         // cached chunk pixels (~190 MB) before old chunks are dropped
    this.pending = false;
    this.cssW = 1; this.cssH = 1; this.dpr = 1;
    this.frames = 0;
    this.lastDrawMs = 0;
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.cssW = Math.max(1, r.width); this.cssH = Math.max(1, r.height);
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
    this.canvas.style.width = `${this.cssW}px`; this.canvas.style.height = `${this.cssH}px`;
    if (this.main) this.app.emit?.('resize');
    else this.onResize?.();
    this.draw();
  }

  request() {
    this.linked?.request();
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => { if (this.pending) this.draw(); });
  }

  get view() { return this.viewFn ? this.viewFn() : this.app.view; }
  get tools() { return this.toolsFn ? this.toolsFn() : this.app.tools; }

  /* ------------------------------------------------------ coordinates */

  /** The exact transform of the current view (the same rounding the drawing uses). */
  xf() {
    const v = this.view, dpr = this.dpr, S = v.zoom * dpr;
    return { S, dpr, ox: Math.round(-v.x * S), oy: Math.round(-v.y * S) };
  }
  toWorld(cssX, cssY) { const { S, dpr, ox, oy } = this.xf(); return [(cssX * dpr - ox) / S, (cssY * dpr - oy) / S]; }
  toScreen(wx, wy) { const { S, dpr, ox, oy } = this.xf(); return [(wx * S + ox) / dpr, (wy * S + oy) / dpr]; }

  /* ----------------------------------------------------------- chunks */

  key(layer, lod, cx, cy) { return `${layer.id}|${lod}|${cx},${cy}`; }

  invalidateAll() { for (const c of this.chunks.values()) c.dirty = true; this.request(); }
  invalidateLayer(layer) {
    const pre = `${layer.id}|`;
    for (const [k, c] of this.chunks) if (k.startsWith(pre)) c.dirty = true;
    this.request();
  }
  dropLayer(layer) {
    const pre = `${layer.id}|`;
    for (const [k, c] of this.chunks) if (k.startsWith(pre)) { this.cachedPx -= c.px ?? 0; this.chunks.delete(k); }
  }

  /** One cell changed: patch the cached chunk in place where possible. */
  invalidateCell(layer, idx) {
    const doc = this.app.doc, W = doc.width, x = idx % W, y = (idx / W) | 0;
    const cx = (x / CH) | 0, cy = (y / CH) | 0;
    for (const lod of LODS) {
      const c = this.chunks.get(this.key(layer, lod, cx, cy));
      if (!c || c.dirty) continue;
      if (c.empty || lod < 0.25) { c.dirty = true; continue; }
      const ts = doc.tileSize * lod, px = (x - cx * CH) * ts, py = (y - cy * CH) * ts;
      const g = c.canvas.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.clearRect(px, py, ts, ts);
      if (!this.drawTile(g, layer.data[idx], px, py, ts)) c.dirty = true;
    }
    this.request();
  }
  invalidateCells(layer, list) {
    if (list.length < 64) { for (const i of list) this.invalidateCell(layer, i); return; }
    const W = this.app.doc.width, seen = new Set();
    for (const idx of list) seen.add(`${((idx % W) / CH) | 0},${(((idx / W) | 0) / CH) | 0}`);
    for (const lod of LODS) for (const s of seen) { const c = this.chunks.get(`${layer.id}|${lod}|${s}`); if (c) c.dirty = true; }
    this.request();
  }

  /** Draw one tile; false if its image has not arrived yet. */
  drawTile(g, gid, x, y, size) {
    if (!gid) return true;
    const doc = this.app.doc, hit = resolveGid(doc, gid);
    if (!hit) { drawMissing(g, x, y, size, size); return true; }
    const rec = this.app.assets.image(hit.ts.image);
    if (rec.state === 'loading') return false;
    if (rec.state === 'error') { drawMissing(g, x, y, size, size); return true; }
    const ts = doc.tileSize;
    g.drawImage(rec.img, (hit.index % hit.ts.columns) * ts, ((hit.index / hit.ts.columns) | 0) * ts, ts, ts, x, y, size, size);
    return true;
  }

  chunk(layer, cx, cy, lod) {
    const k = this.key(layer, lod, cx, cy);
    let c = this.chunks.get(k);
    if (c && !c.dirty) { this.chunks.delete(k); this.chunks.set(k, c); return c; }   // LRU touch
    const doc = this.app.doc, ts = doc.tileSize, W = doc.width;
    const tw = Math.min(CH, doc.width - cx * CH), th = Math.min(CH, doc.height - cy * CH);
    let any = false;
    for (let y = 0; y < th && !any; y++) {
      const row = (cy * CH + y) * W + cx * CH;
      for (let x = 0; x < tw; x++) if (layer.data[row + x]) { any = true; break; }
    }
    if (c) { this.cachedPx -= c.px ?? 0; this.chunks.delete(k); }
    if (!any) { c = { empty: true, lod, dirty: false, px: 0 }; this.chunks.set(k, c); return c; }
    const cw = Math.max(1, Math.round(tw * ts * lod)), chh = Math.max(1, Math.round(th * ts * lod));
    const canvas = c?.canvas && c.canvas.width === cw && c.canvas.height === chh ? c.canvas : document.createElement('canvas');
    canvas.width = cw; canvas.height = chh;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cw, chh);
    let complete = true;
    const size = ts * lod;
    for (let y = 0; y < th; y++) {
      const row = (cy * CH + y) * W + cx * CH;
      for (let x = 0; x < tw; x++) {
        const gid = layer.data[row + x];
        if (gid && !this.drawTile(g, gid, x * size, y * size, size)) complete = false;
      }
    }
    c = { canvas, lod, dirty: !complete, empty: false, px: cw * chh };
    this.chunks.set(k, c);
    this.cachedPx += c.px;
    while (this.cachedPx > this.budget && this.chunks.size > 1) {
      const [oldK, old] = this.chunks.entries().next().value;
      if (oldK === k) break;
      this.cachedPx -= old.px ?? 0;
      this.chunks.delete(oldK);
    }
    return c;
  }

  drawTileLayer(g, layer, rect, s) {
    const doc = this.app.doc, span = CH * doc.tileSize, lod = lodFor(s);
    const cx0 = Math.max(0, Math.floor(rect.x0 / span)), cy0 = Math.max(0, Math.floor(rect.y0 / span));
    const cx1 = Math.min(Math.ceil(doc.width / CH) - 1, Math.floor(rect.x1 / span));
    const cy1 = Math.min(Math.ceil(doc.height / CH) - 1, Math.floor(rect.y1 / span));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = this.chunk(layer, cx, cy, lod);
      if (c.empty) continue;
      g.drawImage(c.canvas, cx * span, cy * span, c.canvas.width / lod, c.canvas.height / lod);
    }
  }

  drawObjectLayer(g, layer, rect, missing) {
    const assets = this.app.assets;
    const hidden = this.app.hiddenWhileDragging;
    for (const o of drawOrder(layer)) {
      const b = o.rot ? bounds(o) : o;
      if (b.x > rect.x1 || b.y > rect.y1 || b.x + b.w < rect.x0 || b.y + b.h < rect.y0) continue;
      if (hidden?.has(o)) continue;
      const rec = assets.image(o.asset);
      if (rec.state === 'loading') continue;
      const plain = !o.rot && !o.flipX && !o.flipY;
      if (!plain) {
        g.save();
        g.translate(o.x + o.w / 2, o.y + o.h / 2);
        if (o.rot) g.rotate((o.rot * Math.PI) / 180);
        if (o.flipX || o.flipY) g.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
      }
      const x = plain ? o.x : -o.w / 2, y = plain ? o.y : -o.h / 2;
      if (rec.state === 'error') { drawMissing(g, x, y, o.w, o.h); missing.push(o); }
      else g.drawImage(rec.img, o.sx, o.sy, o.sw, o.sh, x, y, o.w, o.h);
      if (!plain) g.restore();
    }
  }

  /* ------------------------------------------------------------- frame */

  draw() {
    this.pending = false;
    const t0 = performance.now();
    const { app, g } = this;
    const W = this.canvas.width, H = this.canvas.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = OUTSIDE;
    g.fillRect(0, 0, W, H);
    const doc = app.doc;
    if (!doc) return;
    const { S, dpr, ox, oy } = this.xf();
    const ts = doc.tileSize, mapW = doc.width * ts, mapH = doc.height * ts;
    const rect = { x0: -ox / S, y0: -oy / S, x1: (W - ox) / S, y1: (H - oy) / S };

    // ---- world space
    g.setTransform(S, 0, 0, S, ox, oy);
    g.imageSmoothingEnabled = false;
    g.fillStyle = doc.background || '#5a8f3c';
    g.fillRect(0, 0, mapW, mapH);
    // THE TRACING GUIDE goes on first, under every layer, inside the same
    // world transform as the map itself -- which is what keeps it glued to
    // the map through any zoom or pan instead of drifting on its own.
    app.reference?.drawUnder(g);
    g.globalAlpha = 1;
    g.imageSmoothingEnabled = false;
    const missing = [];
    for (const layer of doc.layers) {
      if (!layer.visible) continue;
      g.globalAlpha = layer.opacity ?? 1;
      if (layer.type === 'tiles') this.drawTileLayer(g, layer, rect, S);
      else this.drawObjectLayer(g, layer, rect, missing);
    }
    g.globalAlpha = 1;
    // the guide again, this time ON TOP, if the designer has floated it there
    app.reference?.drawOver(g);
    g.globalAlpha = 1;
    if (this.main) app.blockers?.drawWorld(g, rect, S);               // (the Blockers tool: what stops the farmer)
    g.globalAlpha = 1;
    this.tools?.drawWorld(g, S);

    // ---- screen space (CSS pixels)
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = (wx) => (wx * S + ox) / dpr, sy = (wy) => (wy * S + oy) / dpr;
    const set = app.settings;
    const mx0 = sx(0), my0 = sy(0), mx1 = sx(mapW), my1 = sy(mapH);
    if (set.dimOutside) {
      g.fillStyle = 'rgba(12, 10, 8, 0.62)';
      const cw = this.cssW, chh = this.cssH;
      g.fillRect(0, 0, cw, Math.max(0, my0));
      g.fillRect(0, my1, cw, Math.max(0, chh - my1));
      g.fillRect(0, my0, Math.max(0, mx0), my1 - my0);
      g.fillRect(mx1, my0, Math.max(0, cw - mx1), my1 - my0);
    }
    if (set.grid) this.drawGrid(g, doc, sx, sy, S / dpr);
    // the map's edge
    g.strokeStyle = 'rgba(255, 236, 200, 0.55)';
    g.lineWidth = 1;
    g.strokeRect(Math.round(mx0) - 0.5, Math.round(my0) - 0.5, Math.round(mx1 - mx0) + 1, Math.round(my1 - my0) + 1);

    if (set.showZones && app.tool !== 'block') this.drawZones(g, doc, sx, sy);
    for (const o of missing) this.missingLabel(g, o, sx, sy);
    this.tools?.drawScreen(g, sx, sy, S / dpr);
    // the other designers in this map, in their colours (live.js)
    if (this.main) app.live?.drawScreen(g, sx, sy);
    if (set.rulers) this.drawRulers(g, doc, sx, sy, S / dpr);
    this.frames++;
    this.lastDrawMs = performance.now() - t0;
    app.emit?.('drawn');
  }

  drawGrid(g, doc, sx, sy, z) {
    const set = this.app.settings;
    // Fine lines only while they are far enough apart to help; zoomed out, just
    // the coarse lines (every gridMajor cells); further out still, no grid at all.
    const base = Math.max(1, set.gridSize || doc.tileSize);
    const major = base * (set.gridMajor || 8);
    let step = base;
    if (base * z < 6) { if (major * z < 14) return; step = major; }
    const ts = doc.tileSize, mapW = doc.width * ts, mapH = doc.height * ts;
    const [wx0, wy0] = this.toWorld(0, 0), [wx1, wy1] = this.toWorld(this.cssW, this.cssH);
    const x0 = Math.max(0, Math.floor(wx0 / step) * step), x1 = Math.min(mapW, wx1);
    const y0 = Math.max(0, Math.floor(wy0 / step) * step), y1 = Math.min(mapH, wy1);
    const top = Math.max(sy(0), 0), bot = Math.min(sy(mapH), this.cssH);
    const lft = Math.max(sx(0), 0), rgt = Math.min(sx(mapW), this.cssW);
    const minor = new Path2D(), majorP = new Path2D();
    for (let x = x0; x <= x1; x += step) { const p = Math.round(sx(x)) + 0.5; (x % major === 0 ? majorP : minor).moveTo(p, top); (x % major === 0 ? majorP : minor).lineTo(p, bot); }
    for (let y = y0; y <= y1; y += step) { const p = Math.round(sy(y)) + 0.5; (y % major === 0 ? majorP : minor).moveTo(lft, p); (y % major === 0 ? majorP : minor).lineTo(rgt, p); }
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(20, 14, 8, 0.16)'; g.stroke(minor);
    g.strokeStyle = 'rgba(20, 14, 8, 0.34)'; g.stroke(majorP);
  }

  drawZones(g, doc, sx, sy) {
    const sel = this.app.zoneSel;
    g.font = '600 11px system-ui, sans-serif';
    g.textBaseline = 'middle';
    for (const z of doc.zones) {
      const x = Math.round(sx(z.x)), y = Math.round(sy(z.y)), w = Math.round(sx(z.x + z.w)) - x, h = Math.round(sy(z.y + z.h)) - y;
      g.fillStyle = hexA(z.color, z === sel ? 0.22 : 0.13);
      g.fillRect(x, y, w, h);
      g.strokeStyle = hexA(z.color, 0.95);
      g.lineWidth = z === sel ? 2 : 1.5;
      g.setLineDash(z === sel ? [] : [6, 4]);
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      g.setLineDash([]);
      const label = z.name || 'Zone';
      const tw = g.measureText(label).width + 12;
      g.fillStyle = hexA(z.color, 0.92);
      roundRect(g, x + 1, y + 1, tw, 18, 4); g.fill();
      g.fillStyle = '#1b1612';
      g.fillText(label, x + 7, y + 10.5);
    }
  }

  missingLabel(g, o, sx, sy) {
    const b = bounds(o);
    const x = sx(b.x), y = sy(b.y), w = sx(b.x + b.w) - x;
    if (w < 40) return;
    g.save();
    g.font = '600 10px system-ui, sans-serif';
    g.textBaseline = 'top';
    const text = `MISSING ASSET: ${o.asset}`;
    const tw = Math.min(g.measureText(text).width + 8, Math.max(w, 120));
    g.fillStyle = 'rgba(40, 8, 26, 0.88)';
    g.fillRect(x, y - 16, tw, 15);
    g.fillStyle = '#ff9bd2';
    g.beginPath(); g.rect(x, y - 16, tw, 15); g.clip();
    g.fillText(text, x + 4, y - 14);
    g.restore();
  }

  /**
   * RULERS, IN PIXELS -- the unit a 2D tile map is actually measured in (a
   * tile is 16 of them). Labels fall on round pixel counts that are whole
   * tiles (16, 32, 64, 128...), a tick marks every tile once they are far
   * enough apart to read, the map's own right and bottom edges are marked with
   * its size, and the cursor's exact position is read out on both rulers.
   * The corner box says which unit is showing; click it for tiles instead.
   */
  drawRulers(g, doc, sx, sy, z) {
    const R = RULER, ts = doc.tileSize, cw = this.cssW, chh = this.cssH;
    const tiles = this.app.settings.rulerUnits === 'tiles';
    const unit = tiles ? ts : 1;                           // map pixels per unit
    const su = unit * z;                                   // screen pixels per unit
    const mapW = doc.width * ts, mapH = doc.height * ts;
    g.fillStyle = 'rgba(28, 23, 19, 0.95)';
    g.fillRect(0, 0, cw, R); g.fillRect(0, 0, R, chh);
    g.strokeStyle = 'rgba(255, 240, 220, 0.14)';
    g.beginPath(); g.moveTo(0, R - 0.5); g.lineTo(cw, R - 0.5); g.moveTo(R - 0.5, 0); g.lineTo(R - 0.5, chh); g.stroke();

    // label spacing: whole tiles in pixels (16, 32, 64...), round numbers in tiles
    const steps = tiles ? [1, 2, 4, 5, 8, 10, 16, 20, 25, 32, 50, 64, 100, 128, 200, 250, 500, 1000]
                        : [ts, ts * 2, ts * 4, ts * 8, ts * 16, ts * 32, ts * 64, ts * 128, ts * 256, ts * 512];
    const labelStep = steps.find((s) => s * su >= 60) ?? steps[steps.length - 1];
    // ticks: every tile when a tile is at least 5 screen pixels wide, else the
    // finest step that still divides the label step and is legible
    // (a tile is only split into pixel ticks once those are 12 screen px
    // apart: at 100% a tick is a tile, at 200% half a tile, and so on)
    const fine = tiles ? steps : [1, 2, 4, 8, ...steps];
    const tickStep = fine.find((s) => s * su >= (!tiles && s < ts ? 12 : 5) && labelStep % s === 0) ?? labelStep;
    const halfStep = labelStep % 2 === 0 && (labelStep / 2) % tickStep === 0 ? labelStep / 2 : 0;

    g.font = '600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    g.textBaseline = 'top';
    const [wx0] = this.toWorld(R, 0), [wx1] = this.toWorld(cw, 0);
    const [, wy0] = this.toWorld(0, R), [, wy1] = this.toWorld(0, chh);
    const ticks = new Path2D(), labels = [];
    const fmt = (v) => String(v);
    const u0x = Math.max(0, Math.floor(wx0 / unit / tickStep) * tickStep), u1x = Math.min(mapW / unit, wx1 / unit);
    for (let u = u0x; u <= u1x; u += tickStep) {
      const x = Math.round(sx(u * unit)) + 0.5;
      if (x < R) continue;
      const big = u % labelStep === 0, mid = halfStep && u % halfStep === 0;
      ticks.moveTo(x, big ? 3 : mid ? 11 : 15); ticks.lineTo(x, R);
      if (big) labels.push(['x', x, fmt(u)]);
    }
    const u0y = Math.max(0, Math.floor(wy0 / unit / tickStep) * tickStep), u1y = Math.min(mapH / unit, wy1 / unit);
    for (let u = u0y; u <= u1y; u += tickStep) {
      const y = Math.round(sy(u * unit)) + 0.5;
      if (y < R) continue;
      const big = u % labelStep === 0, mid = halfStep && u % halfStep === 0;
      ticks.moveTo(big ? 3 : mid ? 11 : 15, y); ticks.lineTo(R, y);
      if (big) labels.push(['y', y, fmt(u)]);
    }
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(240, 226, 204, 0.42)';
    g.stroke(ticks);
    // what was drawn, for the self-test (and anyone curious in the console)
    this.rulerInfo = { unit: tiles ? 'tiles' : 'px', labelStep, tickStep, labels: labels.map((l) => l[2]) };
    g.fillStyle = 'rgba(240, 226, 204, 0.78)';
    for (const [axis, p, t] of labels) {
      if (axis === 'x') g.fillText(t, p + 3, 3);
      else { g.save(); g.translate(3, p + 3); g.rotate(Math.PI / 2); g.fillText(t, 0, -13); g.restore(); }
    }

    // the map's own edges: where the map ends, and how big it is
    g.fillStyle = 'rgba(140, 194, 107, 0.95)';
    const ex = Math.round(sx(mapW)), ey = Math.round(sy(mapH));
    const wLabel = tiles ? `${doc.width}` : `${mapW}`, hLabel = tiles ? `${doc.height}` : `${mapH}`;
    if (ex > R && ex < cw) { g.fillRect(ex - 1, 0, 2, R); this.rulerChip(g, wLabel, ex, 'x', 'rgba(140, 194, 107, 0.95)', '#15220d'); }
    if (ey > R && ey < chh) { g.fillRect(0, ey - 1, R, 2); this.rulerChip(g, hLabel, ey, 'y', 'rgba(140, 194, 107, 0.95)', '#15220d'); }

    // where the cursor is, to the pixel
    const cur = this.app.cursor;
    if (cur?.over && cur.inside !== undefined) {
      const cx = sx(cur.wx), cy = sy(cur.wy);
      g.fillStyle = SEL;
      if (cx > R && cx < cw) { g.fillRect(Math.round(cx) - 1, 0, 2, R); this.rulerChip(g, tiles ? String(Math.floor(cur.wx / ts)) : String(Math.floor(cur.wx)), cx, 'x', SEL, '#2b1f05'); }
      if (cy > R && cy < chh) { g.fillRect(0, Math.round(cy) - 1, R, 2); this.rulerChip(g, tiles ? String(Math.floor(cur.wy / ts)) : String(Math.floor(cur.wy)), cy, 'y', SEL, '#2b1f05'); }
    }
    // the corner: which unit is showing (click it to switch)
    g.fillStyle = 'rgba(40, 33, 26, 1)';
    g.fillRect(0, 0, R, R);
    g.fillStyle = 'rgba(255, 207, 90, 0.9)';
    g.font = '700 9px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tiles ? 'T' : 'px', R / 2, R / 2 + 0.5);
    g.textAlign = 'left';
  }

  /** A little value box on a ruler, at a screen position along it. */
  rulerChip(g, text, p, axis, bg, fg) {
    const R = RULER;
    g.save();
    g.font = '700 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    const w = Math.ceil(g.measureText(text).width) + 8, h = 14;
    g.fillStyle = bg;
    if (axis === 'x') {
      const x = Math.min(Math.max(R + 1, p + 3), this.cssW - w - 1);
      roundRect(g, x, 3, w, h, 3); g.fill();
      g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(text, x + 4, 3 + h / 2 + 0.5);
    } else {
      const y = Math.min(Math.max(R + 1, p + 3), this.cssH - w - 1);
      g.translate(3, y); g.rotate(Math.PI / 2);
      roundRect(g, 0, -h, w, h, 3); g.fill();
      g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(text, 4, -h / 2 + 0.5);
    }
    g.restore();
  }

  /** Is a screen point on the rulers? 'corner' | 'top' | 'left' | null */
  rulerAt(cx, cy) {
    if (!this.app.settings.rulers || !this.app.doc || this.noRulers) return null;
    if (cx < RULER && cy < RULER) return 'corner';
    if (cy < RULER) return 'top';
    if (cx < RULER) return 'left';
    return null;
  }

  /* ------------------------------------------------ selection drawing */

  outlineObject(g, o, sx, sy, color = SEL, width = 1) {
    const pts = corners(o).map(([x, y]) => [sx(x), sy(y)]);
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.lineWidth = width + 2; g.strokeStyle = 'rgba(20, 14, 8, 0.7)'; g.stroke();
    g.lineWidth = width; g.strokeStyle = color; g.stroke();
  }

  /**
   * Render a region of the map (all visible layers) into a new canvas -- used
   * for the whole-map panel and for prefab thumbnails.
   */
  renderRegion(x, y, w, h, scale, { objects = null, background = true } = {}) {
    const doc = this.app.doc;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
    if (background) { g.fillStyle = doc.background; g.fillRect(0, 0, doc.width * doc.tileSize, doc.height * doc.tileSize); }
    const rect = { x0: x, y0: y, x1: x + w, y1: y + h };
    for (const layer of doc.layers) {
      if (!layer.visible) continue;
      g.globalAlpha = layer.opacity ?? 1;
      if (layer.type === 'tiles') { if (!objects) this.drawTileLayer(g, layer, rect, scale); }
      else this.drawObjectLayer(g, objects ? { ...layer, objects: layer.objects.filter((o) => objects.has(o)) } : layer, rect, []);
    }
    return c;
  }
}

export function hexA(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  const n = m ? parseInt(m[1], 16) : 0xe0a84a;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
