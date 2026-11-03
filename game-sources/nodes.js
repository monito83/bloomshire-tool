// nodes.js -- TREES AND ROCKS as things a player works: an axe fells a tree in
// TREE_HITS blows (a stump is left, and wood), a pickaxe breaks a rock in
// ROCK_HITS (stone). Like the fields, this is the player's own: the map is not
// changed, and what was felled or broken is back after REGROW_SECONDS.
//
// THE CAVES' ORE (2026-09-26, rules.js ORES): a seam or a crystal is a rock too, known by its picture --
// the pack's ore boulders (stone with minerals2.png, 32 x 16 each: a single seam in rows 1-2, a double in
// rows 3-4, five colours to a row), its crystals (stone with minerals.png: a colour to a column, clusters
// and pillars in rows 2-6) and the Caves sheet's white crystal, the diamond. Each takes its own blows,
// gives its own ore and is back after its own time. The plain cave rocks (the boulders' row 0, the
// crystals sheet's one big rock in its row 9) break for Stone, like the valley's. ORE IS ONLY IN THE CAVES (maps of region "caves"):
// the same crystals on a hillside or at a shrine outside are only to look at.

import { TREE_HITS, ROCK_HITS, REGROW_SECONDS, ORES, gameNow, load, save } from './rules.js';

const TREE = /Objects\/Tree\/Common\/(Shadow|No Shadow)\/Maple Tree\.png$/;
const SPRING_ROCK = /Objects\/Props\/Spring\/(Ground stones|Stones)\.png$/;
const SEAMS = /Mine and Dungeon\/stone with minerals2\.png$/, CRYSTALS = /Mine and Dungeon\/stone with minerals\.png$/;
const CAVES = /Tileset\/Caves\.png$/;
const SEAM_COLOURS = [['copper', 'quartz', 'gold', 'moonstone', 'amethyst'], ['rose', 'ruby', 'emerald', 'sapphire', null]];
const CRYSTAL_COLOURS = ['copper', 'quartz', 'topaz', 'moonstone', 'amethyst', 'ruby', 'emerald', 'sapphire', null, 'rose'];

/** The ore a picture is -- { kind (rules.js ORES), double } -- or null. */
export function oreOf(o) {
  const a = String(o?.asset ?? ''), r = Math.floor((o?.sy ?? 0) / 16);
  if (SEAMS.test(a)) {
    const k = r >= 1 && r <= 4 ? SEAM_COLOURS[(r - 1) % 2][Math.floor(o.sx / 32)] : null;
    return k ? { kind: k, double: r >= 3 } : null;
  }
  if (CRYSTALS.test(a)) {
    const k = r >= 2 && r <= 6 ? CRYSTAL_COLOURS[Math.floor(o.sx / 16)] : null;
    return k ? { kind: k, double: r === 3 || r === 5 } : null;
  }
  if (CAVES.test(a) && o.sy === 704 && o.sx >= 192 && o.sx < 384) return { kind: 'diamond', double: false };
  return null;
}
/** A rock that breaks for Stone: the valley's anywhere, the plain cave rocks in a cave (outside, the mine set's
 *  gravel and boulders are only to look at). */
export function isStone(o, caves = true) {
  const a = String(o?.asset ?? ''), r = Math.floor((o?.sy ?? 0) / 16);
  return SPRING_ROCK.test(a) || (caves && ((SEAMS.test(a) && r === 0 && o.sx % 64 === 0) || (CRYSTALS.test(a) && r === 9 && o.sx === 96)));
}
const STUMP = { image: 'Objects/Tree/Common/Shadow/Maple Tree.png', rect: [9, 131, 14, 12] };

export class Nodes {
  /** A map's trees and rocks, found by looking at every thing on it: { trees, rocks }. The server finds them once a map
   *  and hands them to every command's Nodes (2026-10-02: found again for every command, a walk through every object
   *  of the town -- part of the lag); Play, where a map can be edited, finds them each time it builds. */
  static index(doc) {
    const trees = [], rocks = [], caves = doc.region === 'caves';
    for (const l of doc.layers) for (const o of l.objects ?? []) {
      if (TREE.test(o.asset) && o.h >= 30) trees.push(o);
      else if (isStone(o, caves) || (caves && oreOf(o))) rocks.push(o);
    }
    return { trees, rocks };
  }

  constructor(doc, index = null) {
    this.id = doc.id;
    this.caves = doc.region === 'caves';
    ({ trees: this.trees, rocks: this.rocks } = index ?? Nodes.index(doc));
    // kept per map: object id -> when it is back (ms), and the blows a standing one has taken -- the
    // server keeps them too (game/commands.js), so a tree takes its four blows across requests. (An old
    // save kept only the times.)
    const saved = load(`nodes.${this.id}`, {});
    const old = saved && !saved.until && !saved.hits;
    this.until = old ? saved : saved.until ?? {};
    this.hitsById = old ? {} : saved.hits ?? {};
    this.jolt = new Map();                              // object -> when it was last hit (a rock shivers)
  }

  /** Felled (a tree) or broken (a rock), for now? */
  down(o, now = gameNow()) { const u = this.until[o.id]; if (!u) return false; if (u > now) return true; delete this.until[o.id]; this.keep(); return false; }
  /** A broken rock is gone: nothing there to bump into. (A felled tree leaves its stump, as solid as the trunk.) */
  gone(o) { return this.rocks.includes(o) && this.down(o); }
  /** What breaking a rock gives, how many blows it takes and how long it is gone:
   *  { ore (a rules.js ORES key, or null for plain stone), item, n, hits, regrow (seconds), tier (the pickaxe it needs) }. */
  yieldOf(o) {
    const ore = this.caves ? oreOf(o) : null;
    if (!ore) return { ore: null, item: 'Stone', n: 2, hits: ROCK_HITS, regrow: REGROW_SECONDS, tier: 1 };
    const O = ORES[ore.kind];
    return { ore: ore.kind, item: O.item, n: ore.double ? 2 : 1, hits: O.hits + (ore.double ? 1 : 0), regrow: O.regrow * 60, tier: O.tier };
  }
  keep() { save(`nodes.${this.id}`, { until: this.until, hits: this.hitsById }); }
  /** An object on this map by its id: a tree or a rock (null for anything else). */
  byId(id) { return this.trees.find((o) => o.id === id) ?? this.rocks.find((o) => o.id === id) ?? null; }
  isTree(o) { return this.trees.includes(o); }

  /** The tree whose trunk is in front of you, or the rock. */
  treeAt(x, y) { return nearest(this.trees.filter((o) => !this.down(o)), (o) => [o.x + o.w / 2, o.y + o.h - 4], x, y, 18); }
  rockAt(x, y) { return nearest(this.rocks.filter((o) => !this.down(o)), (o) => [o.x + o.w / 2, o.y + o.h - 5], x, y, 14); }

  /** A blow: returns 'hit', or 'felled' / 'broken' when it was the last one. */
  hit(o, now = gameNow()) {
    const tree = this.trees.includes(o), n = (this.hitsById[o.id] ?? 0) + 1, y = tree ? null : this.yieldOf(o);
    if (typeof performance !== 'undefined') this.jolt.set(o, performance.now());
    if (n < (tree ? TREE_HITS : y.hits)) { this.hitsById[o.id] = n; this.keep(); return 'hit'; }
    delete this.hitsById[o.id];
    this.until[o.id] = now + (tree ? REGROW_SECONDS : y.regrow) * 1000; this.keep();
    return tree ? 'felled' : 'broken';
  }

  /** Draw a worked node instead of the map's picture: true if drawn (or hidden). */
  draw(g, o, image) {
    const tree = this.trees.includes(o), rock = !tree && this.rocks.includes(o);
    if (!tree && !rock) return false;
    if (this.down(o)) {
      if (rock) return true;                             // broken: nothing left
      const rec = image(STUMP.image); if (rec.state !== 'ok') return true;
      const [sx, sy, w, h] = STUMP.rect;
      g.drawImage(rec.img, sx, sy, w, h, Math.round(o.x + o.w / 2 - w / 2), Math.round(o.y + o.h - h - 1), w, h);
      return true;
    }
    if (rock) {                                          // a rock shivers for a moment when struck
      const since = performance.now() - (this.jolt.get(o) ?? -1e9);
      if (since > 200) return false;
      const rec = image(o.asset); if (rec.state !== 'ok') return true;
      const dx = Math.round(Math.sin(since / 25) * 1.5);
      g.drawImage(rec.img, o.sx, o.sy, o.sw, o.sh, o.x + dx, o.y, o.w, o.h);
      return true;
    }
    return false;                                        // a standing tree: the world draws it (wind, shake)
  }
}

function nearest(list, at, x, y, r) {
  let best = null, bd = r;
  for (const o of list) { const [ox, oy] = at(o), d = Math.hypot(ox - x, oy - y); if (d < bd) { bd = d; best = o; } }
  return best;
}
