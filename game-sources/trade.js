// trade.js -- FACE TO FACE (2026-09-28): the rules of one trade between two players, the same here and on the server
// (server/trade2.js keeps the trades; server/world2.js settles them through the economy's gate).
//
// The designer: "if you don't have [a face-to-face trade], then please implement it" -- and $AVYN may buy anything a
// player has, a tool too, but only from another player (no townsperson anywhere trades for $AVYN).
//
//   1. You face another player and press E: they are asked, and may say yes.
//   2. Each of you sets what you give: things from your hotbar (a tool by its very slot, so its tier and uses go with
//      it) and any of Gold, Shards and $AVYN (to the hundredth).
//   3. Both of you see the whole trade, and each confirms THE VERSION YOU SAW. Any change to either side makes a new
//      version and clears both confirmations, so nothing can be swapped after the other said yes.
//   4. On the second confirmation it settles, all of it or none of it: every check again against what the two of you
//      hold at that moment.
//
// THE FEE (src/economy/config.js FEES.trade: 2.5%, to the nearest unit, at least 1 -- but never all of it):
//   * $AVYN in the trade (the designer, 2026-09-28): the 2.5% is cut from the $AVYN alone -- whoever receives it gets
//     97.5%, to the hundredth -- and nothing else in the trade pays.
//   * Otherwise, currency in it: whoever receives Gold or Shards pays 2.5% of it. The goods carry no fee: the
//     currency is their price.
//   * Goods for goods: each side pays 2.5% of the Gold value of the goods it receives (an item's `value`), in Gold --
//     and a farmer without the Gold for the 1-Gold minimum barters without it (the economy's decision, 2026-09-23).

import { ITEMS, COINS, coinAmount, coinFee, marketFee, CRYPTO_COINS } from './catalog.js';
import { purseOf } from './commands.js';
import { KEPT_WHY } from './quests.js';

export const TRADE_COINS = ['gold', 'shards', 'avyn'];
/** Things on one side at most (the window's grid), how long an invitation waits, how long a trade may sit untouched,
 *  how near (world px) you must stand to ask. */
export const TRADE = { lines: 16, askMs: 30_000, idleMs: 5 * 60_000, reach: 64 };

/** May this change hands face to face? Anything carried, but a quest's things and a chest. */
export const tradeable = (id) => { const d = ITEMS[id]; return !!d && d.cat !== 'quest' && d.cat !== 'furniture'; };
/** A tool (anything `tool:`) is never stacked: it goes as its whole slot, with its tier and uses. */
export const isTool = (id) => String(id).startsWith('tool:');

export const emptyOffer = () => ({ items: [], gold: 0, shards: 0, avyn: 0 });
const WHOLE_MAX = 1_000_000;

/**
 * An offer as a player sends it, checked against what they carry, as it is kept -- `hotbar`: their hotbar as far as it
 * reaches, then their backpack (2026-10-02; server/world2.js carried), `size` its length:
 * { items: [{ id, n } | { id, n: 1, at: i, slot: {...the tool} }], gold, shards, avyn } -- or { error }.
 * Things are named `{ id, n }` (a stack, from anywhere they carry) or `{ at: i }` (a tool, by its place in that list).
 * `kept`: what the player's story keeps with them now (quests.js keptIds: the Founders' fruit, until Marven has it).
 */
export function cleanOffer(raw, hotbar, size, { crypto = false, kept = [] } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'That is not an offer' };
  const out = emptyOffer();
  // PAID IN CRYPTO (2026-09-28, server/crypto.js): { coin: 'eth' | 'usdg', amount } in gwei or micro-USDG -- and then
  // that side gives only the crypto
  if (raw.crypto != null) {
    const c = CRYPTO_COINS[raw.crypto?.coin], amount = raw.crypto?.amount;
    if (!crypto) return { error: 'Trading for crypto is not open yet' };
    if (!c) return { error: 'ETH or USDG, please' };
    if (!Number.isSafeInteger(amount) || amount < c.min || amount > c.max || amount % c.step) return { error: `From ${c.min / c.unit} to ${c.max / c.unit} ${c.name}, please` };
    if ((raw.items ?? []).length || TRADE_COINS.some((k) => (raw[k] ?? 0) !== 0)) return { error: 'A side paid in crypto gives only the crypto' };
    out.crypto = { coin: raw.crypto.coin, amount };
    return out;
  }
  for (const c of TRADE_COINS) {
    const v = raw[c] ?? 0;
    if (v !== 0 && !coinAmount(c, v)) return { error: c === 'avyn' ? '$AVYN to the hundredth, please' : `A whole number of ${COINS[c].name}, please` };
    out[c] = v;
  }
  const lines = raw.items ?? [];
  if (!Array.isArray(lines) || lines.length > TRADE.lines) return { error: `At most ${TRADE.lines} things on one side` };
  const bar = (hotbar ?? []).slice(0, size), seen = new Set();
  for (const l of lines) {
    if (l && Number.isInteger(l.at)) {
      const s = bar[l.at];
      if (!s || !isTool(s.id)) return { error: 'That tool is not there any more' };
      if (!tradeable(s.id)) return { error: `${ITEMS[s.id]?.name ?? 'That'} cannot be traded` };
      if (seen.has(`@${l.at}`)) return { error: 'That tool is in the trade already' };
      seen.add(`@${l.at}`);
      out.items.push({ id: s.id, n: 1, at: l.at, slot: { ...s } });
      continue;
    }
    const id = l?.id, n = l?.n;
    if (typeof id !== 'string' || !ITEMS[id] || isTool(id)) return { error: 'That is not something you can trade' };
    if (!tradeable(id)) return { error: `${ITEMS[id].name} cannot be traded` };
    if (kept.includes(id)) return { error: KEPT_WHY };
    if (!Number.isSafeInteger(n) || n < 1 || n > WHOLE_MAX) return { error: 'How many?' };
    if (seen.has(id)) return { error: 'Each thing once, please' };
    seen.add(id);
    const have = bar.reduce((t, s) => t + (s?.id === id ? s.n : 0), 0);
    if (have < n) return { error: `You have only ${have} ${ITEMS[id].name}` };
    out.items.push({ id, n });
  }
  return out;
}

const hasCoin = (o) => TRADE_COINS.some((c) => o[c] > 0);
/** The Gold value of the goods in an offer (each item's `value`: what the town pays for it). */
export function goodsValue(o) {
  const v = (o.items ?? []).reduce((t, l) => t + (ITEMS[l.id]?.value ?? 0) * l.n, 0);
  return Number.isSafeInteger(v) ? v : Number.MAX_SAFE_INTEGER;
}

/**
 * THE FEES of a trade: for each side, what is kept back from each coin it RECEIVES (`kept`), and -- goods for goods
 * only -- the Gold it pays on the goods it receives (`gold`; `waivable` when that is only the 1-Gold minimum).
 * `fee` is the server's (feeOf at FEES.trade) or, on the page, marketFee: the same sum. `basis`: which rule.
 */
export function tradeFees(a, b, fee = marketFee) {
  // paid in crypto: the 2.5% comes out of the crypto, on the chain (contracts/BloomshirePay.sol) -- nothing here
  if (a.crypto || b.crypto) return { basis: 'crypto', a: { kept: { gold: 0, shards: 0, avyn: 0 }, gold: 0, waivable: false }, b: { kept: { gold: 0, shards: 0, avyn: 0 }, gold: 0, waivable: false } };
  const avyn = a.avyn > 0 || b.avyn > 0, coin = hasCoin(a) || hasCoin(b);
  const side = (gets) => {
    const kept = { gold: 0, shards: 0, avyn: 0 };
    let gold = 0, waivable = false;
    if (avyn) kept.avyn = coinFee('avyn', gets.avyn, fee);
    else if (coin) { kept.gold = fee(gets.gold); kept.shards = fee(gets.shards); }
    else {
      const value = goodsValue(gets);
      gold = fee(value);
      waivable = gold > 0 && Math.floor((value * 250 + 5000) / 10000) === 0;
    }
    return { kept, gold, waivable };
  };
  return { basis: avyn ? 'avyn' : coin ? 'coin' : 'goods', a: side(b), b: side(a) };
}

/** Is there anything in the trade at all? */
export const emptyTrade = (a, b) => !a.items.length && !hasCoin(a) && !a.crypto && !b.items.length && !hasCoin(b) && !b.crypto;

/**
 * A TRADE WITH CRYPTO IN IT, as a whole (both sides): one side pays in crypto and gives nothing else; the other gives
 * things -- never Gold or Shards (the designer: those are not sold for crypto), $AVYN only once the designer has
 * switched that on -- and something. An error, or null when it may go ahead.
 */
export function cryptoTradeError(a, b, avynOn = false) {
  if (!a.crypto && !b.crypto) return null;
  if (a.crypto && b.crypto) return 'Only one side pays in crypto';
  const goods = a.crypto ? b : a;
  if (goods.gold > 0 || goods.shards > 0) return 'Gold and Shards are not sold for crypto';
  if (goods.avyn > 0 && !avynOn) return '$AVYN is not sold for crypto yet';
  if (!goods.items.length && !(goods.avyn > 0)) return 'Put something in for the crypto';
  return null;
}

/* ------------------------------------------------------------------ settling (the server, one player at a time) */
// The rules keep ONE save at a time (rules.js useSaveDoc), so a trade settles in turns: each side's things come out
// of their own save, then each side's new things go in. The server copies both saves first and puts both back if
// any turn fails -- all of it, or none of it.

/** The same tool, field by field (a slot's fields may come in any order): its id, tier, uses, used, rarity. */
export const sameSlot = (x, y) => !!x && !!y && [...new Set([...Object.keys(x), ...Object.keys(y)])].every((k) => x[k] === y[k]);

/** Take one side's offer out of their save (ctx: that player's rules context). { ok, got: [slots], coins } or { ok: false, reason }. */
export function takeOffer(ctx, offer, fees) {
  const inv = ctx.inv, p = purseOf(ctx.save), got = [];
  // the Gold for a goods-for-goods fee, waived for a farmer without the minimum
  let barter = fees.gold;
  if (fees.waivable && (p.gold ?? 0) < barter) barter = 0;
  if ((p.gold ?? 0) < offer.gold + barter) return { ok: false, reason: 'Not enough Gold' };
  for (const c of ['shards', 'avyn']) if ((p[c] ?? 0) < offer[c]) return { ok: false, reason: `Not enough ${COINS[c].name}` };
  // the tools first, each from its very slot, just as it was shown (its place in what is carried: the hotbar as far
  // as it reaches, then the backpack)
  for (const l of offer.items) {
    if (l.at == null) continue;
    const [area, i] = l.at < inv.size ? ['hotbar', l.at] : ['bag', l.at - inv.size];
    const s = inv.at(area, i);
    if (!sameSlot(s, l.slot)) return { ok: false, reason: 'Something in the trade has changed' };
    inv.area(area)[i] = null;
    got.push({ ...s });
  }
  for (const l of offer.items) {
    if (l.at != null) continue;
    if (!inv.takeId(l.id, l.n)) return { ok: false, reason: `Not enough ${ITEMS[l.id]?.name ?? l.id}` };
    got.push({ id: l.id, n: l.n });
  }
  inv.save();
  for (const c of TRADE_COINS) p[c] = (p[c] ?? 0) - offer[c];
  p.gold -= barter;
  return { ok: true, got, barter };
}

/** Give one side what the other gave (their slots from takeOffer), and the coins less the fees. { ok } or { ok: false, reason }. */
export function giveOffer(ctx, slots, offer, fees) {
  const inv = ctx.inv, p = purseOf(ctx.save);
  for (const s of slots) {
    const ok = isTool(s.id) ? inv.addSlot({ ...s }) : inv.add(s.id, s.n, ITEMS[s.id]?.icon ?? null);
    if (!ok) return { ok: false, reason: 'No room on a hotbar or in a backpack for it all' };
  }
  for (const c of TRADE_COINS) p[c] = (p[c] ?? 0) + offer[c] - fees.kept[c];
  return { ok: true };
}
