// catalog.js -- WHAT EVERYTHING IS WORTH, WHO SELLS IT AND WHO BUYS IT (2026-09-25).
//
// The game and the server read this one file: the price a shopkeeper asks, what they pay, which seeds the
// Seed & Tool shop has at which Farming level, what the Exchange swaps. The economy's own rules (the
// ledger, the fees, where Gold may come from) are src/economy; this is the new game's goods.
//
// EVERY NUMBER HERE IS A STARTING VALUE (TEMP) for the designer and the economy simulation to set:
//   * a crop's worth grows with its growing time: 5 + 3 x minutes^0.75 (a 2-minute carrot 10 Gold, an
//     hour's tomato 70, three hours' pumpkin 152) -- longer crops pay more for the same energy
//   * a packet of seed is 40% of its crop's worth; a crop that grows again after harvest, 2.5 times that
//   * every buyer pays the same for a thing (no buying low at one counter and selling high at another)
//   * food buys energy at 10 Gold an energy point; it sells back for 4
//   * finite tools cost a little less per use the better the metal
//   * Farming experience: half a harvested crop's worth; level L needs 40 x (L-1)^1.9 experience in all

import { SEEDS, FOOD, TOOL_TIERS, SEED_SOURCES, ORES } from './rules.js';
import { QUEST_ITEMS, useKinds } from './quests.js';

/* ------------------------------------------------------------ the goods */

/** The fish any water gives; and the rare ones, by place and time (commands.js fishFor): a Golden Fish now and
 *  then in the river, a Ghost Catfish in Moonmere only at night. */
export const COMMON_FISH = ['Carp', 'Perch', 'Pike Fish', 'Sunfish', 'Chub', 'Tiger Trout'];
export const FISH = [...COMMON_FISH, 'Golden Fish', 'Ghost Catfish'];
const FISH_VALUE = { Carp: 12, Perch: 16, 'Pike Fish': 24, Sunfish: 14, Chub: 13, 'Tiger Trout': 30, 'Golden Fish': 80, 'Ghost Catfish': 55 };

/** The food the Bakery sells: each dish's pack icon. */
const DISH_ICON = {
  'Vegetable Plate': 'Vegetable Mix.png', 'Garden Salad': 'Salad.png', Bread: 'Bread .png', 'Fried Fish': 'Baked Fish.png',
  'Fruit Jam': 'Jam.png', 'Roast Drumstick': 'Chicken Drumstick.png', Cheese: 'Cheese.png', 'Berry Pie': 'Tarte aux myrtilles.png',
  Cake: 'Cake.png', 'Honey-Glazed Bacon': 'Bacon.png', 'Roast Dinner': 'Complete Breakfast.png', 'Hearty Stew': 'Fish Stew.png',
  'Moonlight Stew': 'Tom Kha Soup.png',
};

export const cropValue = (minutes) => Math.round(5 + 3 * minutes ** 0.75);
/**
 * THE PRICES (the designer, 2026-09-27: "everything feels so cheap... it should be difficult for people to get
 * everything"). A carrot sells for 40 and its seed costs 20, and everything above it climbs steeply, not
 * doubling but more: a thing's worth is its old worth (10 for a carrot) to the power 1.5, times four. A worth
 * is rounded the way a shopkeeper would say it.
 */
export const nice = (n) => (n >= 10000 ? Math.round(n / 500) * 500 : n >= 1000 ? Math.round(n / 50) * 50 : n >= 100 ? Math.round(n / 5) * 5 : Math.max(1, Math.round(n)));
export const steep = (old) => nice(40 * (old / 10) ** 1.5);
/** Finite tools by tier (rules.js TOOL_TIERS: Iron 300 uses, Bronze 1,000, Gold 4,000, Amethyst 10,000): the
 *  designer's prices, 2026-09-27. */
export const TOOL_PRICE = [0, 2500, 5000, 35000, 120000];
/** WHAT A DISH IS WORTH (the designer: "no dish should be less than 3,000 Gold", Moonlight Stew 30 to 40
 *  thousand), and how rare it is. A dish is cooked, or bought at the Bakery -- which sells only the four
 *  common ones -- and never sold back to a shop (a plate of two carrots is not a 3,000 Gold sale). */
export const DISHES = {
  'Vegetable Plate': [3000, 'Common'], 'Garden Salad': [3500, 'Common'], Bread: [4000, 'Common'], 'Fried Fish': [4500, 'Common'],
  'Fruit Jam': [6000, 'Uncommon'], 'Roast Drumstick': [7500, 'Uncommon'], Cheese: [7500, 'Uncommon'], 'Berry Pie': [9000, 'Uncommon'],
  Cake: [11000, 'Rare'], 'Honey-Glazed Bacon': [13500, 'Rare'], 'Roast Dinner': [16000, 'Rare'], 'Hearty Stew': [20000, 'Epic'],
  'Moonlight Stew': [35000, 'Legendary'],
};
/** The only dishes the Bakery sells (the designer: "Nothing else should be available"). */
export const BAKERY_DISHES = ['Vegetable Plate', 'Garden Salad', 'Bread', 'Fried Fish'];
/**
 * THE AVERYN EMPORIUM (the designer, 2026-09-27: "people will be able to buy dishes from the shop to refill their
 * energy... and Averyn Shards... it should look premium"). Shards are bought with ETH on Robinhood Chain, about a
 * cent each, more for a bigger pack (server/premium.js checks every payment on the chain); Moonlight Stew is
 * bought with Shards, at the designer's price: 75 Shards a bowl, however many (2026-09-30: "one Moonlight Stew should
 * be at least seventy-five shards"; it was 12.5). What is bought is the player's to eat, keep, or trade.
 *
 * $AVYN WITH EVERY PACK (the designer, 2026-09-28): "ten tokens for the one dollar package, fifty for the five dollar
 * package, and so on" -- a fixed amount, ten $AVYN a dollar (chosen over the lucky roll first built the same day).
 * `avyn` is whole $AVYN, added by the server with the pack's Shards (server/premium.js).
 */
export const SHARD_PACKS = [
  { id: 'handful', name: 'A Handful of Shards', shards: 100, usd: 1, bonus: 0, avyn: 10 },
  { id: 'pouch', name: 'A Pouch of Shards', shards: 550, usd: 5, bonus: 10, avyn: 50 },
  { id: 'chest', name: 'A Chest of Shards', shards: 1200, usd: 10, bonus: 20, tag: 'Most popular', avyn: 100 },
  { id: 'vault', name: 'A Vault of Shards', shards: 2600, usd: 20, bonus: 30, avyn: 200 },
  { id: 'hoard', name: 'A Dragon\'s Hoard', shards: 7000, usd: 50, bonus: 40, tag: 'Best value', avyn: 500 },
];
export const EMPORIUM_OFFERS = [
  { id: 'stew2', name: 'A Pair of Bowls', item: 'Moonlight Stew', n: 2, shards: 150 },
  { id: 'stew4', name: 'A Supper for Four', item: 'Moonlight Stew', n: 4, shards: 300 },
  { id: 'stew8', name: 'The Harvest Pot', item: 'Moonlight Stew', n: 8, shards: 600, tag: 'Most popular' },
  { id: 'stew16', name: 'The Founders\' Feast', item: 'Moonlight Stew', n: 16, shards: 1200, tag: 'Grand feast' },
];

/**
 * THE ITEMS: id -> { name, cat, value (what a buyer pays), price (what a seller asks; absent: not sold),
 * icon: [file, sx, sy] }. Ids are the game's own: 'seed:0', a crop's name ('Carrot'), 'Wood', 'tool:axe'.
 */
export const ITEMS = {};
SEEDS.forEach((s, k) => {
  // a seed costs half its crop's worth (a crop that grows again, two and a half times that); Farming experience
  // stays with the old worth, so the levels come as they always did
  const base = cropValue(s.grow), worth = steep(base), seed = nice(worth * 0.5 * (s.seedDear ? 2.5 : 1));   // (the crops that once grew again keep their dearer seeds: 2026-10-04)
  ITEMS[s.name] = { name: s.name, cat: 'crop', value: worth, xp: Math.max(1, Math.round(base / 2)), icon: [s.item.file, s.item.sx, s.item.sy] };
  ITEMS[`seed:${k}`] = { name: `${s.name} seeds`, cat: 'seed', value: Math.floor(seed / 2), price: seed, icon: [s.bag.file, s.bag.sx, s.bag.sy] };
});
for (const f of FISH) ITEMS[f] = { name: f, cat: 'fish', value: steep(FISH_VALUE[f]), icon: [`Icons/Fish/River/${f}.png`, 0, 0] };
ITEMS.Wood = { name: 'Wood', cat: 'resource', value: steep(8), price: nice(steep(8) * 2.5), icon: ['Icons/RPG icons/Extras/Wood.png', 0, 0] };
ITEMS.Stone = { name: 'Stone', cat: 'resource', value: steep(5), price: nice(steep(5) * 2.5), icon: ['Icons/RPG icons/Extras/Stones.png', 0, 0] };
// THE CAVES' ORE (rules.js ORES): worth about three Gold for each energy point its blows cost (a seam is
// heavy work: COST.heavyOre a blow), the rarest a little more. Icons: the pack's ore piles (Mine/Miners
// props.png: metals in the top row, gems below it), the diamond the Caves sheet's white crystal. TEMP.
const ORE_ICON = 'Objects/Exterior/Mine and Dungeon/Mine/Miners props.png';
const ORE_WORTH = { copper: [16, [ORE_ICON, 0, 0]], quartz: [16, [ORE_ICON, 16, 16]], rose: [18, [ORE_ICON, 144, 16]],
  topaz: [30, [ORE_ICON, 32, 16]], sapphire: [30, [ORE_ICON, 112, 16]], moonstone: [34, [ORE_ICON, 48, 16]],
  emerald: [52, [ORE_ICON, 96, 16]], amethyst: [52, [ORE_ICON, 64, 16]], ruby: [60, [ORE_ICON, 80, 16]],
  gold: [95, [ORE_ICON, 32, 0]], diamond: [150, ['Tileset/Caves.png', 208, 704]] };
for (const [k, o] of Object.entries(ORES)) ITEMS[o.item] = { name: o.item, cat: 'ore', value: steep(ORE_WORTH[k][0]), icon: ORE_WORTH[k][1] };
ITEMS.Butterfly = { name: 'Butterfly', cat: 'bug', value: steep(15), icon: ['Animals/Forest/Bugs/Butterfly/Butterflies.png', 0, 0] };
for (const [dish, energy] of Object.entries(FOOD.dishes)) {
  const [worth, rarity] = DISHES[dish] ?? [3000, 'Common'];
  ITEMS[dish] = { name: dish, cat: 'food', value: worth, price: worth, rarity, energy, icon: [`Icons/Food Icons/${DISH_ICON[dish]}`, 0, 0] };
}
// (the Emporium's stew: eaten whenever you like -- as every dish is since 2026-10-02, when the limit on food went)
ITEMS['Moonlight Stew'].noLimit = true;
// THE QUESTS' THINGS (game/quests.js): worth nothing to a buyer and kept off the stalls -- except what grows
// wild (a Silvercap), which is an ordinary find
// (readable: a book or a note -- Space reads it, and the game says so: 2026-09-29)
for (const [id, q] of Object.entries(QUEST_ITEMS)) ITEMS[id] = { name: id, cat: q.cat ?? 'quest', value: q.value ? steep(q.value) : 0, icon: q.icon, about: q.about, readable: !!q.read };
useKinds({ food: new Set(Object.keys(FOOD.dishes)), fish: new Set(FISH), crop: new Set(SEEDS.map((s) => s.name)),
  farmLevel: (save) => levelOf(save?.skills?.farming ?? 0),
  cropLevel: (name) => (SEED_SOURCES.shopFromStart.includes(name) ? 1 : SEED_SOURCES.shopAtFarmingLevel[name] ?? 1) });
for (const t of ['axe', 'pickaxe', 'rod']) ITEMS[`tool:${t}`] = { name: t, cat: 'tool', value: 0, finite: true };
for (const t of ['hoe', 'can', 'sickle', 'bugnet', 'flute', 'shovel']) ITEMS[`tool:${t}`] = { name: t, cat: 'tool', value: 0 };
// THE SHOVEL (2026-10-04, the designer: "around fifteen thousand gold"): at the Seed & Tool shop, one a farmer
ITEMS['tool:shovel'].price = 15000;
ITEMS['tool:shovel'].about = 'Digs up anything planted, a seed or a crop, to sow the square again. What it digs up is thrown away.';
// A FARMER'S OWN TOOLS, SOLD AGAIN (2026-09-30, a player: "where can I get a hoe? I had one in my chest and now it's
// gone"; the designer: "I will add that in store"): the hoe, the watering can and the sickle never wear out, so one of
// each is enough -- the Seed & Tool shop sells a new one, at an Iron tool's price, to a farmer without one
for (const t of ['hoe', 'can', 'sickle']) ITEMS[`tool:${t}`].price = TOOL_PRICE[1];
for (const t of ['sword', 'bow', 'staff']) ITEMS[`tool:${t}`] = { name: t, cat: 'weapon', value: 0 };
/** A CHEST (2026-09-27, the designer: "player can also buy chests from the market. A chest will cost 150,000 gold"):
 *  bought at the Market Hall, set down at home (commands.js place), forty slots. Not sold back, nor at the stalls. */
export const CHEST_ART = { file: 'Objects/Exterior/chest.png', sx: 40, sy: 0, openSy: 16 };
ITEMS.Chest = { name: 'Chest', cat: 'furniture', value: 0, price: 150000, icon: [CHEST_ART.file, CHEST_ART.sx, CHEST_ART.sy],
  about: 'Forty slots to keep things in. Hold it at home, on your island or in your cottage, and press Space to set it down.' };

export const itemOf = (id) => ITEMS[id] ?? null;
/** Anything a buyer takes: a thing of worth that is not a tool. */
export const sellable = (id) => { const it = ITEMS[id]; return !!it && it.value > 0 && it.cat !== 'tool' && it.cat !== 'weapon'; };

/* ------------------------------------------------------------ Farming experience */

export const FARMING_XP = (cropName) => ITEMS[cropName]?.xp ?? 1;
/** Experience needed in all to be at level L (level 1 needs none). */
export const xpFor = (L) => (L <= 1 ? 0 : Math.round(40 * (L - 1) ** 1.9));
export const MAX_LEVEL = 30;
export function levelOf(xp = 0) { let L = 1; while (L < MAX_LEVEL && xp >= xpFor(L + 1)) L++; return L; }

/* ------------------------------------------------------------ the shops */

const seedIndex = (name) => SEEDS.findIndex((s) => s.name === name);
const HERBS = new Set(['Marigold', 'Sunflower', 'Aloe']);           // the Apothecary's, not the Seed & Tool shop's
/** Seeds a shop may sell, with the Farming level each needs: [{ id, level }]. */
function seedStock(filter) {
  const out = [];
  for (const n of SEED_SOURCES.shopFromStart) if (filter(n)) out.push({ id: `seed:${seedIndex(n)}`, level: 1 });
  for (const [n, lv] of Object.entries(SEED_SOURCES.shopAtFarmingLevel)) if (filter(n)) out.push({ id: `seed:${seedIndex(n)}`, level: lv });
  return out.filter((s) => !s.id.endsWith(':-1')).sort((a, b) => a.level - b.level);
}
const tools = (kind, tiers) => tiers.map((tier) => ({ id: `tool:${kind}`, tier }));

/**
 * THE SHOPS: id -> { name, keeper (npcs.js), sells: [{ id, tier?, level? }], buys: [cat] or 'all' }.
 * A shop sells what its trade makes and buys what its trade uses; the Market Hall buys everything with a
 * worth. Every buyer pays an item's `value`.
 */
export const SHOPS = {
  seedtool:   { name: 'Seed & Tool', sells: [...seedStock((n) => !HERBS.has(n)), { id: 'tool:hoe' }, { id: 'tool:can' }, { id: 'tool:sickle' }, { id: 'tool:shovel' }, ...tools('axe', [1]), ...tools('pickaxe', [1])], buys: ['seed', 'crop'] },
  general:    { name: 'General Store', sells: [{ id: 'Wood' }, { id: 'Stone' }], buys: 'all' },
  blacksmith: { name: 'The Forge', sells: [...tools('axe', [1, 2, 3, 4]), ...tools('pickaxe', [1, 2, 3, 4])], buys: ['resource', 'ore'] },
  carpenter:  { name: 'Carpenter\'s Workshop', sells: [{ id: 'Wood' }], buys: ['resource'] },
  fisherman:  { name: 'The Fisherman', sells: tools('rod', [1, 2, 3, 4]), buys: ['fish'] },
  bakery:     { name: 'The Bakery', sells: BAKERY_DISHES.map((id) => ({ id })), buys: ['crop'] },
  apothecary: { name: 'The Apothecary', sells: seedStock((n) => HERBS.has(n)), buys: ['crop', 'bug'] },
  market:     { name: 'The Market Hall', sells: [{ id: 'Chest' }], buys: [] },                 // (Rowan: chests; the stalls are the farmers')
};
/** What a shop asks for an entry (a tool's tier sets its price). */
export const priceOf = (entry) => (ITEMS[entry.id]?.finite ? TOOL_PRICE[entry.tier ?? 1] : ITEMS[entry.id]?.price ?? 0);
/** Does this shop buy this item? */
export function shopBuys(shopId, id) {
  const s = SHOPS[shopId];
  if (!s || !sellable(id)) return false;
  if (ITEMS[id].cat === 'food') return false;                        // (dishes: eaten, or traded at the Market Hall)
  return s.buys === 'all' || s.buys.includes(ITEMS[id].cat);
}

/* ------------------------------------------------------------ the Exchange */

/** THE MATERIALS COUNTER: swaps at set rates, when you have too much of the wrong thing (TEMP). */
export const SWAPS = [
  { id: 'wood-stone', give: [['Wood', 4]], get: [['Stone', 5]] },
  { id: 'stone-wood', give: [['Stone', 6]], get: [['Wood', 4]] },
  { id: 'fish-wood', give: [['Carp', 2]], get: [['Wood', 3]] },
  { id: 'butterfly-stone', give: [['Butterfly', 1]], get: [['Stone', 3]] },
];
/** THE COINS players trade with each other: Gold, Shards and -- since the designer opened it (2026-09-28) --
 *  internal $AVYN. Amounts are whole units: 1 Gold, 1 Shard, a millionth of a $AVYN (the purse keeps $AVYN in
 *  millionths). Between players $AVYN moves in hundredths (`step`: 0.01). No shop takes $AVYN. */
export const COINS = {
  gold: { name: 'Gold', unit: 1, step: 1, icon: '' },                                   // (the stat's own coin piece)
  shards: { name: 'Shards', unit: 1, step: 1, icon: 'art:avyn-shard.png' },
  avyn: { name: '$AVYN', unit: 1e6, step: 1e4, icon: 'art:avyn-coin.png' },
};
/** TRADING FOR CRYPTO (2026-09-28, the designer: ETH and USDG on Robinhood Chain -- items and tools only, never Gold
 *  or Shards; $AVYN only once the designer switches it on). A price is kept in gwei (ETH) or micro-USDG, to its
 *  step; the designer's limits: at least 0.0005 ETH or 1 USDG a thing, at most 0.2 ETH or 500 USDG at once. The
 *  buyer's own wallet pays the seller's (server/crypto.js, contracts/BloomshirePay.sol); 2.5% of it goes to the
 *  treasury on the way. `token`: the coin's contract (ETH has none). */
export const CRYPTO_COINS = {
  eth: { name: 'ETH', decimals: 18, unit: 1e9, step: 1e5, min: 5e5, max: 2e8, token: null },
  usdg: { name: 'USDG', decimals: 6, unit: 1e6, step: 1e4, min: 1e6, max: 5e8, token: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' },
};
export const isCrypto = (coin) => Object.hasOwn(CRYPTO_COINS, coin);
// (shown like any coin: its name, its unit; no icon of its own -- a crypto price is written, never drawn as Gold --
//  to its last digit, so the 2.5% of 0.0005 ETH reads 0.0000125, not 0)
for (const [id, c] of Object.entries(CRYPTO_COINS)) COINS[id] = { name: c.name, unit: c.unit, step: c.step, icon: '', crypto: true, digits: id === 'eth' ? 8 : 6 };
/** An amount of a coin as a player reads it: 1500 Gold -> "1,500"; 2500000 $AVYN units -> "2.5". */
export const coinText = (coin, units) => ((units ?? 0) / (COINS[coin]?.unit ?? 1)).toLocaleString('en-US', { maximumFractionDigits: COINS[coin]?.digits ?? 2 });
/** Is `units` a whole, positive amount of the coin, in its steps (a $AVYN to the hundredth), at most `max` of it? */
export const coinAmount = (coin, units, max = 1e9) => {
  const c = COINS[coin];
  return !!c && Number.isSafeInteger(units) && units > 0 && units % c.step === 0 && units <= max * c.unit;
};
/** THE CURRENCY COUNTER: players' own offers of one coin for another (Gold, Shards, $AVYN). */
export const OFFER_ASSETS = ['gold', 'shards', 'avyn'];
export const OFFERS_PER_PLAYER = 5;
/** THE MARKETPLACE (the Market Hall's, 2026-09-25; rebuilt 2026-09-28 to the designer's reference): players' own
 *  listings -- some of what you carry, at your price each, in the coin the seller picks (Gold, Shards or $AVYN). The
 *  seller pays the 2.5% fee on what they take in. A tool is listed on its own, with its tier and uses (2026-09-28);
 *  a quest's things and a chest are never listed. `maxPrice` is in whole coins. */
export const MARKET = { stallsPerPlayer: 8, maxPrice: 99999, coins: ['gold', 'shards', 'avyn'] };
/** The Market's fee on n Gold taken in, as the server takes it (src/economy/amount.js feeOf, FEES.trade:
 *  2.5% to the nearest Gold, at least 1 -- but never all of it). For the stall's "You get". */
export const marketFee = (n) => (n > 0 ? Math.min(n, Math.max(Math.floor((n * 250 + 5000) / 10000), Math.min(1, n - 1))) : 0);
/** THE FEE ON A COIN RECEIVED IN A TRADE between players (the server passes its own `fee`, feeOf at FEES.trade;
 *  the page, marketFee -- the same sum). $AVYN pays it to the hundredth, so a balance never holds less than
 *  0.01 of a $AVYN: the fee on 10 $AVYN is 0.25. (The designer, 2026-09-28: in a trade with $AVYN in it, the
 *  2.5% is cut from the $AVYN alone.) */
export const coinFee = (coin, units, fee = marketFee) => {
  const step = COINS[coin]?.step ?? 1;
  return step === 1 ? fee(units) : fee(Math.floor(units / step)) * step;
};
/** What an Exchange offer's two sides pay when it is taken: [the fee on what the taker gets, the fee on what the
 *  maker gets]. Each pays 2.5% of the coin it receives; in a trade with $AVYN in it, only the $AVYN pays. */
export function offerFees(o, fee = marketFee) {
  const avyn = o.give.asset === 'avyn' || o.want.asset === 'avyn';
  const on = (side) => (avyn && side.asset !== 'avyn' ? 0 : coinFee(side.asset, side.amount, fee));
  return [on(o.give), on(o.want)];
}

/** The tiers' names, for a label: "Bronze Axe". */
export const tierName = (tier) => TOOL_TIERS[tier]?.name ?? 'Iron';
