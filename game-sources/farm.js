// farm.js -- THE FIELDS, as one player sees them.
//
// A field is a zone tagged "farm" on the map (the designer draws it in the
// editor; the town has three, the dirt fields by the greenhouse). Nothing a
// player does changes the map: tilled squares and crops are the player's own,
// kept per map in this browser (rules.js save/load) -- another player walking by
// sees only their own. The server will keep this later.
//
//   * hoeLine: one swing turns the whole line of the field the way you face;
//     already-turned squares and planted ones are skipped (and not charged)
//   * sow, water, harvest: one square at a time
//
// GROWTH (the designer's Final Rules, 2026-09-24): a crop grows in REAL time, by
// the SERVER's clock (game/clock.js), and goes on while the player is away -- a
// crop records when it was planted and watered, and its stage is worked out from
// that, never counted up while the page runs.
//   * every crop is watered once after planting; its growing starts then
//   * a crop that takes longer than an hour (rules.js WATERING) asks for a SECOND
//     watering at its last stage before ripe, and waits there until it has it
//   * no soil moisture, no watering at every stage
//   * a regrowing crop (rules.js CROP_TIMES regrow) stays after its harvest,
//     goes back a couple of stages and grows again -- watered again by the same
//     rule, for its regrow time -- five harvests in all (rules.js REGROW_HARVESTS),
//     and at the fifth it goes, the soil left turned
//   * RAIN WATERS WHAT GROWS OUTDOORS (the designer, 2026-09-27: yes to "should rain water outdoor crops?"): a crop
//     in a field out in the open that wants water -- its first or its second -- is watered by the first shower
//     after it began to want it, at the moment the rain came, whether anyone was there or not (weather.js: the
//     same showers for everyone, from the server's clock, so the server's rules agree). Indoors it stays dry.
//   * tilled soil is drawn with a blob autotile, so a turned row has edges, not seams;
//     a square whose crop is growing on its water is drawn wet

import { BLOB, canonMask } from '../terrain.js';
import { FARM_TAG, SEEDS, WATERING, REGROW_BACK_STAGES, gameNow, load, save } from './rules.js';
import { firstRainBetween } from './weather.js';

// the tilled soil: the live game's own ploughed earth (Clover Valley 2.1 tilled_dirt / wet_tilled_dirt,
// 12 x 4 autotiles, the same blob order as terrain.js) -- furrows you can see were turned; a watered
// square is drawn in the wet set instead, as the live game does
export const SOIL = {
  dry: { image: 'cv2/Tilesets/tilled_dirt.png', x: 0, y: 0 },
  wet: { image: 'cv2/Tilesets/wet_tilled_dirt.png', x: 0, y: 0 },
};

/**
 * Where a crop is at server time `now`: { stage, last, ripe, needs: 'first' | 'second' | null, readyAt, two, rained }.
 * `crop` is { s, base, regrowing, h, t, w1, w2 }: the stage it grows from, whether this is a regrowth (and `h`, how
 * many times this plant has been cut: a regrowth from before the count is taken as cut once), when it was
 * sown, and when it was watered (first, second). Each remaining stage takes an even share of the cycle's time.
 * `outdoors`: out in the open, the rain waters it too (`rained`: it did).
 */
export function growth(crop, now = gameNow(), outdoors = false) {
  if (outdoors) {
    // (a crop the rain watered is worked out as if it had been watered when the rain came)
    let w1 = crop.w1, w2 = crop.w2, rained = false;
    if (!w1 && crop.t) { w1 = firstRainBetween(crop.t, now); rained = !!w1; }
    if (w1 && !w2) {
      const g = growth({ ...crop, w1, w2: null }, now);
      if (g.needs === 'second') { w2 = firstRainBetween(g.waitAt ?? w1, now); rained ||= !!w2; }
    }
    if (rained) return { ...growth({ ...crop, w1, w2 }, now), rained: true, w1, w2 };
  }
  const seed = SEEDS[crop.s];
  const last = seed.stages.length - 1, from = Math.min(crop.base ?? 0, last - 1), span = last - from;
  const minutes = crop.regrowing ? (seed.regrow ?? seed.grow) : seed.grow;
  const total = minutes * 60e3, per = total / span;
  const two = minutes > WATERING.secondWateringOverMinutes && span >= 2;      // a long crop: a second watering...
  const wait = two ? last - 1 : last;                                          // ...at its last stage before ripe
  if (!crop.w1) return { stage: from, last, ripe: false, needs: 'first', readyAt: null, two, per };
  const first = Math.min(wait, from + Math.floor(Math.max(0, now - crop.w1) / per));
  if (!two) return { stage: first, last, ripe: first >= last, needs: null, readyAt: crop.w1 + total, two, per };
  if (first < wait) return { stage: first, last, ripe: false, needs: null, readyAt: null, waitAt: crop.w1 + (wait - from) * per, two, per };
  if (!crop.w2) return { stage: wait, last, ripe: false, needs: 'second', readyAt: null, waitAt: crop.w1 + (wait - from) * per, two, per };
  const stage = Math.min(last, wait + Math.floor(Math.max(0, now - crop.w2) / per));
  return { stage, last, ripe: stage >= last, needs: null, readyAt: crop.w2 + per, two, per };
}

/**
 * WHERE A SEED JUST SOWN SITS (2026-10-01, a player: "the seed is positioned too close to the edge, it should be in the
 * middle"). Most crops' planted frame has its seed at the foot of the frame, as a plant stands; a sown seed belongs in
 * the middle of its square. Each crop's offset [dx, dy] (px) moves its planted frame's art there -- measured: the opaque
 * box of the frame, drawn foot-down in its 16 px square. Only small seed art (11 px tall at most): a crop that starts as
 * a stake or a vine (Green Beans, Grapes, Cucumber) stands as it is; Carrot and Corn are in the middle already.
 */
const PLANTED = {
  'Potato': [0, -4], 'Cabbage': [2, -2], 'Cauliflower': [0, -1], 'Strawberry': [0, -4], 'Tomato': [0, -4], 'Wheat': [0, -5],
  'Sunflower': [0, -5], 'Marigold': [0, -1], 'Star Fruit': [1, 1], 'Onion': [-1, -6], 'Eggplant': [0, -4], 'Watermelon': [0, -4],
  'Beetroot': [0, -6], 'Pumpkin': [0, -6], 'Hot Pepper': [1, -4], 'Asparagus': [0, -6], 'Blueberry': [0, -4], 'Broccoli': [0, -4],
  'Parsnip': [0, -5], 'Rice': [0, -5], 'Spring Onion': [-1, -4], 'Adzuki Bean': [0, -3], 'Green Bell Pepper': [0, -2],
  'Red Bell Pepper': [0, -2], 'Yellow Bell Pepper': [0, -2], 'Blackberry': [0, -4], 'Pineapple': [0, -4], 'Aloe': [0, -6],
};

export class Farm {
  constructor(doc, image) {
    this.doc = doc; this.image = image; this.T = doc.tileSize; this.W = doc.width;
    this.id = doc.id;
    this.outdoors = !/^interior/i.test(doc.id ?? '') && doc.region !== 'interiors';     // (the rain waters these fields)
    // the farmable squares: every cell of every zone tagged "farm"
    this.farmable = new Set();
    this.fields = [];
    for (const z of doc.zones ?? []) {
      if (!(z.tags ?? []).includes(FARM_TAG)) continue;
      const x0 = Math.floor(z.x / this.T), y0 = Math.floor(z.y / this.T), x1 = Math.ceil((z.x + z.w) / this.T) - 1, y1 = Math.ceil((z.y + z.h) / this.T) - 1;
      this.fields.push({ name: z.name, x0, y0, x1, y1 });
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.farmable.add(y * this.W + x);
    }
    const saved = load(`farm.${this.id}`, {});
    this.cells = new Map(Object.entries(saved).map(([k, v]) => [+k, v]).filter(([k]) => this.farmable.has(k)));
    this.dirty = false; this.saveIn = 0;
    this.migrate();
  }

  /** A save from before real-time growth ({ s, stage, grow } and a wet flag): the crop keeps the stage it
   *  had reached, as if watered that long ago; one never watered still needs its first watering. */
  migrate(now = gameNow()) {
    for (const c of this.cells.values()) {
      const k = c.crop;
      delete c.wet; delete c.dry;
      if (!k || k.w1 !== undefined) continue;
      if (!SEEDS[k.s]) { delete c.crop; continue; }
      const had = k.stage ?? 0;
      const fresh = { s: k.s, base: 0, regrowing: false, t: now, w1: null, w2: null };
      if (had > 0) {
        const g0 = growth({ ...fresh, w1: now }, now);
        fresh.w1 = now - Math.min(had, g0.two ? g0.last - 1 : g0.last) * g0.per;
        if (had >= g0.last && g0.two) fresh.w2 = now - g0.per;               // it was ripe: it stays ripe
      }
      c.crop = fresh;
      this.dirty = true;
    }
  }

  cellAt(x, y) { return Math.floor(y / this.T) * this.W + Math.floor(x / this.T); }
  isFarmable(i) { return this.farmable.has(i); }
  at(i) { return this.cells.get(i); }
  changed() { this.dirty = true; }
  /** The crop on square i, where it is now (or null). */
  state(i, now = gameNow()) { const c = this.cells.get(i)?.crop; return c && SEEDS[c.s] ? growth(c, now, this.outdoors) : null; }

  /** The squares one hoe swing at cell i turns, facing that way: the field's whole line through it. */
  hoeLine(i, facing) {
    if (!this.farmable.has(i)) return null;
    const W = this.W, step = facing === 'up' || facing === 'down' ? W : 1;
    const sameLine = (j) => (step === 1 ? Math.floor(j / W) === Math.floor(i / W) : true);
    const line = [i];
    for (let j = i - step; this.farmable.has(j) && sameLine(j); j -= step) line.push(j);
    for (let j = i + step; this.farmable.has(j) && sameLine(j); j += step) line.push(j);
    return line.filter((j) => !this.cells.get(j)?.tilled);
  }

  till(list) { for (const j of list) this.cells.set(j, { tilled: true }); this.changed(); }

  canSow(i) { const c = this.cells.get(i); return !!c?.tilled && !c.crop; }
  sow(i, seed, now = gameNow()) { const c = this.cells.get(i); c.crop = { s: seed, base: 0, regrowing: false, t: now, w1: null, w2: null }; this.changed(); }

  /** Does the crop here want water now (its first watering, or its second)? Bare soil never does. */
  canWater(i, now = gameNow()) { return !!this.state(i, now)?.needs; }
  /** Water it: its first watering starts its growing; its second lets it ripen. True if it took. */
  water(i, now = gameNow()) {
    const c = this.cells.get(i)?.crop, g = this.state(i, now);
    if (!c || !g?.needs) return false;
    if (g.rained && g.w1 && !c.w1) c.w1 = g.w1;                             // (the rain gave it its first: kept, with this one)
    if (g.needs === 'first') c.w1 = now; else c.w2 = now;
    this.changed();
    return true;
  }

  /** A crop fully grown here? */
  ripe(i, now = gameNow()) { return !!this.state(i, now)?.ripe; }
  /** Take the crop: returns its seed index. A regrowing crop stays, a couple of stages back, and grows
   *  again once watered -- till its last harvest (rules.js REGROW_HARVESTS); any other leaves the soil turned. */
  harvest(i, now = gameNow()) {
    const c = this.cells.get(i), k = c.crop, seed = SEEDS[k.s];
    const cut = (k.h ?? (k.regrowing ? 1 : 0)) + 1;                                   // (this plant's harvests, this one too)
    if (seed.regrow && cut < (seed.harvests ?? 1)) {
      const last = seed.stages.length - 1;
      c.crop = { s: k.s, base: Math.max(1, last - REGROW_BACK_STAGES), regrowing: true, h: cut, t: now, w1: null, w2: null };
    } else delete c.crop;
    this.changed();
    return k.s;
  }
  /** How many more harvests the crop on square i will give, the next one included (0: nothing grows there). */
  harvestsLeft(i) {
    const k = this.cells.get(i)?.crop, seed = k && SEEDS[k.s];
    return seed ? Math.max(1, (seed.harvests ?? 1) - (k.h ?? (k.regrowing ? 1 : 0))) : 0;
  }

  /** Dig the crop out (the shovel, commands.js dig): gone, whatever it was; the soil left turned. */
  dig(i) { const c = this.cells.get(i); if (c?.crop) { delete c.crop; this.changed(); } }

  /** Keep the fields now (the server saves after every command). */
  keep() { save(`farm.${this.id}`, Object.fromEntries(this.cells)); this.dirty = false; }

  /** Nothing ticks: a crop's stage is worked out from its times. This only keeps the fields saved. */
  update(dt) {
    if (this.dirty && (this.saveIn -= dt) <= 0) {
      save(`farm.${this.id}`, Object.fromEntries(this.cells));
      this.dirty = false; this.saveIn = 2;
    }
  }

  /** The turned soil in view, autotiled over every turned square (dry and wet join up); a square whose crop
   *  is growing on its water in the wet set. */
  drawSoil(g, rect, now = gameNow()) {
    const T = this.T, W = this.W;
    const x0 = Math.floor(rect.x0 / T), x1 = Math.ceil(rect.x1 / T), y0 = Math.floor(rect.y0 / T), y1 = Math.ceil(rect.y1 / T);
    for (const [i, c] of this.cells) {
      if (!c.tilled) continue;
      const x = i % W, y = Math.floor(i / W);
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const st = c.crop ? this.state(i, now) : null, wet = !!st && !st.needs && !st.ripe;
      const S = SOIL[wet ? 'wet' : 'dry'], rec = this.image(S.image);
      if (rec.state !== 'ok') continue;
      const has = (dx, dy) => x + dx >= 0 && x + dx < W && !!this.cells.get((y + dy) * W + x + dx)?.tilled;
      const m = (has(0, -1) ? 1 : 0) | (has(1, 0) ? 2 : 0) | (has(0, 1) ? 4 : 0) | (has(-1, 0) ? 8 : 0)
        | (has(1, -1) ? 16 : 0) | (has(1, 1) ? 32 : 0) | (has(-1, 1) ? 64 : 0) | (has(-1, -1) ? 128 : 0);
      const b = BLOB[canonMask(m)] ?? BLOB[255];
      g.drawImage(rec.img, (S.x + (b % 12)) * T, (S.y + Math.floor(b / 12)) * T, T, T, x * T, y * T, T, T);
    }
  }

  /** The crops in view, as things standing at their square's foot (drawn among the objects by depth). A seed just
   *  sown sits in the middle of its square (PLANTED). */
  movers(rect, now = gameNow()) {
    const T = this.T, W = this.W, out = [];
    for (const [i, c] of this.cells) {
      if (!c.crop) continue;
      const x = (i % W) * T, y = Math.floor(i / W) * T;
      if (x < rect.x0 - T || x > rect.x1 || y < rect.y0 - 2 * T || y > rect.y1) continue;
      const seed = SEEDS[c.crop.s];
      if (!seed) continue;                                               // a crop this build does not know
      const stage = growth(c.crop, now, this.outdoors).stage, [sx, sy, w, h] = seed.stages[stage];
      const [dx, dy] = (stage === 0 && PLANTED[seed.name]) || [0, 0];
      out.push({ y: y + T - 1, draw: (g) => { const rec = this.image(seed.sheet); if (rec.state === 'ok') g.drawImage(rec.img, sx, sy, w, h, x + dx, y + T - h + dy, w, h); } });
    }
    return out;
  }
}
