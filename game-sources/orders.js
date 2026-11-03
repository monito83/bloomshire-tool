// orders.js -- THE GENERAL STORE'S ORDERS (2026-09-28): the same here and on the server.
//
// The designer, with a picture of Pixels' general store: the store "also buys or gives tasks to you, orders to you...
// one order is asking for eight clover; when they are delivered it gives farming XP and gold". So Odette keeps a
// board of orders, each player's own: SIX A DAY, new at midnight (UTC). Each asks for some of one thing the town
// makes -- crops that player can grow, fish, ore, mushrooms, butterflies -- and pays, when it is brought to her
// counter, the goods' worth and a quarter more in Gold (never more: an order is a better sale, not a mint), and
// experience in the skill that made them (the Skills book's own keys: farming, fishing, mining, foraging).
//
// Nothing a shop sells is ever ordered (seeds, wood, stone, dishes, tools): an order can never be filled from a
// shelf at a profit. The day's orders are made from the player's id and the day, the same on both sides, and kept in
// the save (`orders`) so a level gained today does not change them.

import { ITEMS, SHOPS } from './catalog.js';
import { SEED_LEVEL } from './rules.js';

/** THE NUMBERS (for the designer to turn): how many a day, the premium on the goods' worth, what an order is worth
 *  (base + per Farming level, give or take `spread`), the most of one thing, and how the experience is reckoned. */
export const ORDERS = {
  perDay: 6,
  crops: 4,                           // of the six: crops; the rest from the other trades
  premium: 1.25,                      // Gold: the goods' worth, and a quarter more
  worth: { base: 300, perLevel: 120, spread: 0.3 },
  maxN: 30,
  cropValue: { base: 200, perLevel: 250 },    // a crop is ordered once its worth is at most this (grows with Farming)
  otherMax: 250,                      // fish, ore, mushrooms, butterflies: only the common ones (no deep-cave gems)
  cropXp: 0.5,                        // a crop order: half the harvest experience of what it asks for
  otherXpPer: 40,                     // anything else: one experience for every 40 Gold of worth (at least 2)
};

/** Which skill makes a thing, by its kind. */
const SKILL_OF = { crop: 'farming', fish: 'fishing', ore: 'mining', forage: 'foraging', bug: 'foraging' };
export const SKILL_NAMES = { farming: 'Farming', fishing: 'Fishing', mining: 'Mining', foraging: 'Foraging' };
// (the rare catches are never ordered: a Golden Fish, a Ghost Catfish)
const NEVER = new Set(['Golden Fish', 'Ghost Catfish']);

/** The day an order belongs to: whole days since 1970, UTC -- new orders at midnight. */
export const dayOf = (now) => Math.floor(now / 86_400_000);
/** When the next orders come (ms). */
export const nextOrders = (now) => (dayOf(now) + 1) * 86_400_000;

/** A small seeded random (mulberry32) from a text. */
function seeded(text) {
  let h = 2166136261;
  for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** What a shop sells: never ordered. */
function shelved() {
  const out = new Set();
  for (const s of Object.values(SHOPS)) for (const e of s.sells ?? []) out.add(e.id);
  return out;
}

/** What may be ordered of a player at Farming level `level`: [crops], [others]. */
export function orderable(level) {
  const shop = shelved(), cap = ORDERS.cropValue.base + ORDERS.cropValue.perLevel * (level - 1);
  const crops = [], others = [];
  for (const [id, d] of Object.entries(ITEMS)) {
    if (shop.has(id) || NEVER.has(id) || !(d.value > 0)) continue;
    if (d.cat === 'crop') { if (d.value <= cap && (SEED_LEVEL[id] ?? 1) <= level) crops.push(id); }
    else if (SKILL_OF[d.cat] && d.value <= Math.min(cap + 50, ORDERS.otherMax)) others.push(id);
  }
  return [crops, others];
}

/** The day's orders for a player: [{ id, item, n, gold, skill, xp }], made from their id and the day. */
export function makeOrders(playerId, day, level) {
  const rand = seeded(`${playerId}|${day}|orders`), [crops, others] = orderable(Math.max(1, level));
  const pick = (list) => list.splice(Math.floor(rand() * list.length), 1)[0];
  const items = [];
  for (let i = 0; i < ORDERS.perDay; i++) {
    const pool = i < ORDERS.crops ? (crops.length ? crops : others) : (others.length ? others : crops);
    if (pool.length) items.push(pick(pool));
  }
  return items.map((item, i) => {
    const d = ITEMS[item], w = ORDERS.worth, want = (w.base + w.perLevel * (level - 1)) * (1 - w.spread + 2 * w.spread * rand());
    const n = Math.max(1, Math.min(ORDERS.maxN, Math.round(want / d.value)));
    const gold = Math.max(5, Math.round((d.value * n * ORDERS.premium) / 5) * 5);
    const skill = SKILL_OF[d.cat] ?? 'farming';
    const xp = d.cat === 'crop' ? Math.max(1, Math.round((d.xp ?? 1) * n * ORDERS.cropXp)) : Math.max(2, Math.round((d.value * n) / ORDERS.otherXpPer));
    return { id: `${day}-${i}`, item, n, gold, skill, xp };
  });
}

/** The save's orders for today (made now if the day has turned): { day, list, done: [ids] }. */
export function ordersOf(save, playerId, now, level) {
  const day = dayOf(now);
  if (save.orders?.day !== day) save.orders = { day, list: makeOrders(playerId, day, level), done: [] };
  return save.orders;
}
