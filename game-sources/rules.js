// rules.js -- THE GAME'S RULES in one place, as data: what every action costs,
// how energy comes back, what grows how fast, how many blows a tree or a rock
// takes. Tune the game here, nowhere else.
//
// The designer's rules (2026-09-23):
//   * EVERY action a tool does costs energy: hoeing, sowing, watering,
//     harvesting, chopping, mining, fishing, shooting, fighting. A tool used on
//     nothing it works on does nothing and costs nothing -- weapons always swing.
//   * The hoe works only in the FIELDS (zones tagged "farm": the three dirt
//     fields by the greenhouse), and one swing turns the WHOLE LINE of the field
//     the way you face -- a column facing up or down, a row facing left or right.
//     It is charged per square it turns (the live game's rule: the bed costs
//     what its squares would have cost).
//   * Each player sees only their own fields and crops.
//   * The watering can grows what is sown: a crop needs water to reach its next
//     stage. The sickle harvests only what is fully grown.
//   * You swim only in WIDE water a zone tagged "swim" touches (Moonmere's lake,
//     the wood's pools): where a square of open water SWIM_WIDE tiles across fits,
//     and the tile of shore round it -- never in the town, never up a stream or a
//     canal (the designer, 2026-09-27). You go in on purpose, from the bank (F),
//     never by walking in; at any other water F says you cannot swim there.
//
// THE FINAL RULES (the designer, 2026-09-24; GAMEPLAY_RULES_REPORT.md) replace the passive refill:
// energy never comes back by itself; a RECOVERY (resting in the bed at home) does, and cooked
// food a little. Crops grow in real minutes on the SERVER's clock, while the player is away too, and
// are watered once -- twice if they take longer than an hour. Every number below is the one place it
// lives: THE BALANCE.

/* ================================================================================ THE BALANCE */

/** The time everything real-time reads: the SERVER's clock (game/clock.js plugs itself in here; until
 *  it does -- only in a check with no page -- the page's own). */
let nowFn = () => Date.now();
export function useClock(fn) { nowFn = fn; }
export const gameNow = () => nowFn();

/** ENERGY. A normal player's bar is 100; a Founding Farmer's is TWICE that, 200 (the designer, 2026-10-01: "100
 *  over 200 ... and twice as fast" -- their holders' benefit, written on every token). There is NO passive regeneration: energy comes back through a
 *  RECOVERY, started by resting in the bed at home -- available once every 12 real hours (a Founding
 *  Farmer: every 6), it fills the bar over 1 real hour -- and a little through cooked food (FOOD). */
export const ENERGY = {
  max: 100,
  foundingBonus: 1,                 // a Founding Farmer's maximum is max x (1 + this) = 200: the only place the bonus lives
  recoveryEveryHours: 12,           // a normal player may start a recovery once in this long
  foundingRecoveryEveryHours: 6,    // ...a Founding Farmer, once in this long: twice as often
  recoveryHours: 1,                 // resting fills a whole bar in this long (a half-empty one in half the time): a
                                    // Founding Farmer's 200 in the same hour, twice as fast
};
/** The size of this player's bar. */
export const maxEnergy = (founding = false) => Math.round(ENERGY.max * (founding ? 1 + ENERGY.foundingBonus : 1));

/** WHAT EACH ACTION COSTS. A normal action is 1; heavy or special effort 2 or more. A tool used on nothing
 *  it works on does nothing and costs nothing.
 *  THE FIELDS COST ENERGY TWICE: planting a seed and harvesting the crop (the designer, 2026-10-01: "energy should only
 *  be consumed when the player is planting seeds and... harvesting the crop"); turning the soil and watering are free. */
export const COST = {
  hoe: 0, sow: 1, water: 0, harvest: 1, dig: 0,  // (dig: the shovel, 2026-10-04 -- as the hoe, no energy)
  forage: 1,                                      // picking what grows wild (2026-10-04; it was free)
  axe: 1, pickaxe: 1, fish: 1, bugnet: 1,
  sword: 1, bow: 1, magic: 1,                     // normal attacks (the staff's bolt is its normal attack): needed to swing
  hitsPerEnergy: 3,                               // ...and every third blow that lands on a creature spends one (the
                                                  // designer, 2026-10-01; from 2026-09-30 it was one per creature killed)
  heavyOre: 2, heavyAttack: 2, special: 2,        // heavy seams, heavy attacks, special abilities -- when they come
};

/** FOOD. Raw ingredients restore NOTHING -- no raw crop, fish, fruit or vegetable is an energy source.
 *  Cooked food does: basic dishes 2-5, more for dishes that ask more of the cook. Starting values for the
 *  cooking system (not in /play yet), to be tuned by play; eating never goes past the bar's maximum. */
export const FOOD = {
  raw: 0,
  dishes: {
    'Vegetable Plate': 2, 'Garden Salad': 3, 'Bread': 4, 'Fried Fish': 5,
    'Fruit Jam': 6, 'Roast Drumstick': 8, 'Cheese': 8, 'Berry Pie': 10, 'Cake': 12,
    'Honey-Glazed Bacon': 16, 'Roast Dinner': 18, 'Hearty Stew': 22,
    'Moonlight Stew': 25,                         // the Founders' recipe (the Founding Farmers, Chapter 16)
  },
};
// (EATING HAD A LIMIT from 2026-09-26 -- 60 energy from food in 12 real hours -- removed 2026-10-02 by the designer:
//  "we won't have any limit on how much food they can consume to replenish their energy". A dish's energy is its own.)
/** The energy eating something gives: a cooked dish its value, anything raw nothing. */
export const foodEnergy = (name) => FOOD.dishes[name] ?? FOOD.raw;
/** COOKED FOOD HEALS TOO (the designer, 2026-09-30, with the tougher enemies: "food heals too") -- this much health
 *  for each point of the dish's energy, whether or not the energy bar had room; the bed still heals it all. */
export const FOOD_HEALS = 2;
export const foodHealth = (name) => foodEnergy(name) * FOOD_HEALS;

/** TOOLS. Permanent tools never wear out (the hoe, the can, the sickle, the bug net, the flute). The
 *  finite GATHERING tools spend one use per valid action and are gone at nought -- which kind a tool is
 *  is its item data (inventory.js TOOLS `finite`), never a list of names. A finite tool's TIER is part
 *  of the item; `dir` is the pack's icon folder for that metal. */
export const TOOL_TIERS = [
  null,
  // (2026-09-27, with the new prices -- 2,500 / 5,000 / 35,000 / 120,000 Gold: the designer chose tools that
  // still wear out, but slowly, so a tier is an investment; about 10 Gold of wear a use at any tier)
  { name: 'Iron', uses: 300, dir: '3. Iron' },
  { name: 'Bronze', uses: 1000, dir: '2. Cooper' },
  { name: 'Gold', uses: 4000, dir: '4. Gold' },
  { name: 'Amethyst', uses: 10000, dir: '8. Shadow' },
];
/** COMBAT WEAPONS are permanent -- they never break -- and grow by RARITY: a multiple of the weapon's own blow
 *  (2026-09-30, with the tougher enemies: a better weapon now matters -- an Epic bow, the Founders' reward,
 *  hits twice as hard as a common one). */
export const WEAPON_RARITY = {
  common: { name: 'Common', damage: 1 },
  uncommon: { name: 'Uncommon', damage: 1.3 },
  rare: { name: 'Rare', damage: 1.6 },
  epic: { name: 'Epic', damage: 2 },
  legendary: { name: 'Legendary', damage: 2.6 },
};

/** HEALTH -- not in the brief, but enemies that fight back need it (GAMEPLAY_RULES_REPORT.md A3): no
 *  passive healing; at nought you collapse and wake at home with `collapseTo` of it, your energy as it
 *  was; a moment of grace after each hurt. RESTING IN THE BED AT HOME HEALS (the designer, 2026-09-25):
 *  back to `restTo` of the maximum, whenever you lie down -- the energy recovery keeps its own cooldown. */
export const HEALTH = { max: 100, collapseTo: 0.4, graceSeconds: 0.8, restTo: 1 };

/** THE FIELDS AND THEIR WATER. Every crop is watered once after planting; a crop that takes longer than
 *  `secondWateringOverMinutes` asks for a second watering at its last stage before ripe, and waits there
 *  until it has it. No soil moisture, no watering at every stage. */
export const FARM_TAG = 'farm', SWIM_TAG = 'swim';
/** How wide water must be to swim in, in tiles (the designer, 2026-09-27: "the swimming will only happen in wide
 *  areas... disable the swimming inside narrow canals, narrow areas"): the streams run 2 to 4 across. */
export const SWIM_WIDE = 6;
/** Of a map's water cells (truthy = water, W x H), those in WIDE water: covered by a square of water `k` tiles
 *  across, or within `shore` tiles of one (a lake's shore is ragged, and its corners narrow) -- a lake, a pool,
 *  never a stream, a canal or a moat. A Uint8Array, one a cell. */
export function wideWater(water, W, H, k = SWIM_WIDE, shore = 2) {
  const at = (x, y) => y * (W + 1) + x;
  // a running count of the water, and of where a k x k square of it starts (summed-area tables)
  const S = new Int32Array((W + 1) * (H + 1)), C = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S[at(x + 1, y + 1)] = (water[y * W + x] ? 1 : 0) + S[at(x, y + 1)] + S[at(x + 1, y)] - S[at(x, y)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const full = x + k <= W && y + k <= H && S[at(x + k, y + k)] - S[at(x, y + k)] - S[at(x + k, y)] + S[at(x, y)] === k * k;
    C[at(x + 1, y + 1)] = (full ? 1 : 0) + C[at(x, y + 1)] + C[at(x + 1, y)] - C[at(x, y)];
  }
  // a cell a square covers: one starts no more than k - 1 above it and to its left
  const core = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!water[y * W + x]) continue;
    const x0 = Math.max(0, x - k + 1), y0 = Math.max(0, y - k + 1);
    if (C[at(x + 1, y + 1)] - C[at(x0, y + 1)] - C[at(x + 1, y0)] + C[at(x0, y0)] > 0) core[y * W + x] = 1;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!water[y * W + x]) continue;
    let wide = 0;
    for (let dy = -shore; dy <= shore && !wide; dy++) for (let dx = -shore; dx <= shore && !wide; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && core[ny * W + nx]) wide = 1;
    }
    out[y * W + x] = wide;
  }
  return out;
}
export const WATERING = { secondWateringOverMinutes: 60 };
/** A regrowing crop, harvested, goes back this many stages before ripe and grows again in its `regrow`
 *  time (watered again, by the same rule, for that length). */
export const REGROW_BACK_STAGES = 2;
/** ...and gives this many harvests in all, the first included: at the last, it goes (the designer, 2026-10-04). */
export const REGROW_HARVESTS = 5;

/** THE BLOOMSHIRE DAY: 8 real hours (the designer, 2026-09-29: it was 12, and its 2.5-hour night fell at the same
 *  real hours every day, so many players never saw one) -- daylight 05:00-21:00 over 6 of them, the night over 2:
 *  three nights in every real day. 28 days a season. Day 1 of Spring began at the epoch (server time) -- moved when
 *  the day went from 12 hours to 8, so the calendar ran straight on (Spring 11, late in the night, either way). */
export const WORLD_TIME = {
  dayRealHours: 8,
  daylight: { from: 5, to: 21, realHours: 6 },
  daysPerSeason: 28,
  seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
  epoch: Date.UTC(2026, 8, 25, 19, 40, 0),
};

/**
 * THE WORLD'S CLOCK AND SKY AS AN ADMIN SET THEM (the designer, 2026-09-29: "permissions for admin to set any
 * weather, any time of the day"): the same for everyone, kept by the server (data/v2/sky.json, server/world2.js) and
 * sent to every game.
 *   shift    ms added to the server's time for the world's clock -- a time of day set runs on from there
 *   windows  [{ from, to, rain }] in server time: while one lasts it IS the weather (rain 0: dry, 0.62: a shower,
 *            1: heavy), over the sky's own
 */
export const SKY = { shift: 0, windows: [] };
export function setSky(s) {
  SKY.shift = Number.isFinite(+s?.shift) ? +s.shift : 0;
  SKY.windows = (Array.isArray(s?.windows) ? s.windows : [])
    .filter((w) => Number.isFinite(+w?.from) && Number.isFinite(+w?.to) && +w.to > +w.from)
    .map((w) => ({ from: +w.from, to: +w.to, rain: Math.max(0, Math.min(1, +w.rain || 0)) }));
}
/** The world's own time at server time t: the clock the day, the night and the rain follow. */
export const worldMs = (t) => t + SKY.shift;

/** Is it night at server time t? A Bloomshire day begins at dawn: its daylight first, then its night (the
 *  last 2 of its 8 real hours) -- the same reckoning as clock.js worldTime. */
export function isNight(t) {
  const day = WORLD_TIME.dayRealHours * 3600e3, light = WORLD_TIME.daylight.realHours * 3600e3;
  return ((((worldMs(t) - WORLD_TIME.epoch) % day) + day) % day) >= light;
}
/** How long until night at server time t (ms; 0 at night). */
export function nightIn(t) {
  const day = WORLD_TIME.dayRealHours * 3600e3, light = WORLD_TIME.daylight.realHours * 3600e3;
  const into = (((worldMs(t) - WORLD_TIME.epoch) % day) + day) % day;
  return into >= light ? 0 : light - into;
}
/** "40 min", "1 h 20 min": a wait in real time, in the words the languages know (i18n.js durations). */
export function waitWords(ms) {
  const m = Math.max(1, Math.ceil(ms / 60e3));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
}

export const TREE_HITS = 4, ROCK_HITS = 3;      // blows to fell a tree / break a rock
export const REGROW_SECONDS = 600;              // a felled tree or a broken rock is back after this long
export const ARROW = { speed: 190, range: 170, damage: 2 };
export const BOLT = { speed: 150, range: 150, damage: 4 };
export const SWORD = { reach: 20, damage: 3 };

// THE CROPS COME FROM BOTH PACKS (the designer, 2026-09-24, crop by crop; design/crops/crop_selection.png):
// New Main for most, Clover Valley for Corn, Green Beans and Cauliflower -- and for the five only it has.
// Each crop: its growth FRAMES [sx, sy, w, h] on its sheet (planted, then each stage to fully grown; drawn
// standing on the square's foot), its harvest ITEM and its seed BAG ({ file, sx, sy }, 16 x 16).
//
// SEEDS COME IN BAGS (the designer, 2026-09-24): a seed is only ever seen planted; carried or sold it is
// its crop's seed bag -- New Main's own (All Crops.png: three blocks at columns 0, 9 and 18, a row per crop:
// the bag, the bag outlined, the harvest, three quality stars...), or for the five Clover Valley crops New
// Main has no bag for, its blank bag with the crop painted on (design/crops/make_seed_bags.py).
//
// THE ORDER IS THE SAVE FORMAT: a planted square and a slot say 'seed:<its place here>'. Add at the end,
// never reorder or remove (Cauliflower kept its place when it moved to the Clover Valley art).
export const SEED_BAGS = 'Crops/All Crops.png';
const CV_CROPS = 'cv2/Enviroment/Crops/Crops.png';
const OWN_BAGS = 'art:seed-bags.png';
const at = (file, col, row) => ({ file, sx: col * 16, sy: row * 16 });

/** A New Main crop: its own file, 16 px cells in a row -- column 0 the seeds, then each stage, the harvest
 *  last (measured 2026-09-24); a tall crop's file is 32 high. `bag` is its All Crops.png [column, row]; the
 *  harvest icon sits two columns right of it, on the same sheet. */
const NMC = (name, file, stages, [bc, br], tall = false) => ({
  name, pack: 'New Main', sheet: `Crops/${file}`, tall,
  stages: stages.map((c) => [c * 16, 0, 16, tall ? 32 : 16]),
  item: at(SEED_BAGS, bc + 2, br), bag: at(SEED_BAGS, bc, br),
});
/** A Clover Valley crop: Crops.png's ten bands of two rows, a crop on the left or right of each (the live
 *  game's src/core/Atlas.js CROP_TABLE): every stage a 16 x 32 strip, the planted seeds first; the harvest
 *  in the band's lower row. */
const CVC = (name, band, side, cols, bag) => ({
  name, pack: 'Clover Valley', sheet: CV_CROPS, tall: true,
  stages: cols.map((c) => [c * 16, band * 32, 16, 32]),
  item: { file: CV_CROPS, sx: (side === 'L' ? 8 : 20) * 16, sy: band * 32 + 16 }, bag,
});
const span = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const SEEDS = [
  // 0-7: the first eight, in their saved places
  NMC('Carrot', 'Spring/Carrot.png', span(1, 5), [0, 6]),
  NMC('Potato', 'Spring/Potato.png', span(1, 5), [0, 4]),
  NMC('Cabbage', 'Spring/Cabbage.png', span(1, 6), [0, 9]),
  CVC('Cauliflower', 1, 'L', span(2, 7), at(SEED_BAGS, 0, 10)),
  NMC('Strawberry', 'Spring/Strawberry.png', span(1, 5), [0, 2]),
  NMC('Tomato', 'Summer/Tomato.png', span(1, 6), [9, 4]),
  NMC('Wheat', 'Summer/Wheat.png', span(1, 5), [9, 17]),
  NMC('Sunflower', 'Summer/Sunflower.png', span(1, 5), [9, 5], true),
  // 8-14: Clover Valley's (bags: New Main's for the crops it also has, else our own)
  CVC('Corn', 2, 'R', span(14, 19), at(SEED_BAGS, 18, 4)),
  CVC('Green Beans', 1, 'R', span(14, 18), at(SEED_BAGS, 9, 14)),
  CVC('Cantaloupe', 6, 'L', span(2, 7), at(OWN_BAGS, 0, 0)),
  CVC('Marigold', 8, 'L', span(2, 6), at(OWN_BAGS, 1, 0)),
  CVC('Sweet Potato', 5, 'R', span(14, 17), at(OWN_BAGS, 2, 0)),
  CVC('Saffron', 3, 'R', span(14, 17), at(OWN_BAGS, 3, 0)),
  CVC('Star Fruit', 7, 'R', span(14, 19), at(OWN_BAGS, 4, 0)),
  // 15-35: New Main's
  NMC('Onion', 'Spring/Onion.png', span(1, 5), [0, 5]),
  NMC('Eggplant', 'Fall/Eggplant.png', span(1, 5), [18, 5]),
  NMC('Watermelon', 'Summer/Watermelon.png', span(1, 7), [9, 11]),
  NMC('Beetroot', 'Fall/Beetroot.png', span(1, 5), [18, 1]),
  NMC('Pumpkin', 'Fall/Pumpkin.png', [0, 2, 3, 4, 5], [18, 2]),              // its column 1 is empty
  NMC('Grapes', 'Fall/Grapes.png', [0, 2, 3, 4, 5], [18, 3], true),          // (and this one's)
  NMC('Hot Pepper', 'Summer/Hot Pepper.png', span(1, 6), [9, 6]),
  NMC('Asparagus', 'Spring/Asparagus.png', span(1, 4), [0, 13]),
  NMC('Blueberry', 'Spring/Blueberry.png', span(1, 5), [0, 7], true),
  NMC('Broccoli', 'Spring/Broccoli.png', span(1, 4), [0, 12]),
  NMC('Parsnip', 'Spring/Parsnip.png', span(1, 4), [0, 8]),
  NMC('Rice', 'Spring/Rice.png', span(1, 5), [0, 11]),
  NMC('Spring Onion', 'Spring/Spring Onion.png', span(1, 5), [0, 3]),
  NMC('Adzuki Bean', 'Summer/Adzuki Bean.png', span(1, 6), [9, 15], true),
  // one bell pepper plant, three colours: the same four stages, then its own ripe plant and harvest
  NMC('Green Bell Pepper', 'Summer/Bell Pepper.png', [1, 2, 3, 4, 7], [9, 7]),
  NMC('Red Bell Pepper', 'Summer/Bell Pepper.png', [1, 2, 3, 4, 6], [9, 8]),
  NMC('Yellow Bell Pepper', 'Summer/Bell Pepper.png', [1, 2, 3, 4, 5], [9, 9]),
  NMC('Blackberry', 'Summer/Blackberry.png', span(1, 6), [9, 16]),
  NMC('Cucumber', 'Summer/Cucumber.png', span(1, 5), [9, 12], true),
  NMC('Pineapple', 'Summer/Pineapple.png', span(1, 5), [9, 13], true),
  NMC('Aloe', 'Fall/Aloe.png', span(1, 5), [18, 6]),
];

/** CROP GROWTH, in REAL minutes from the first watering to ripe (GAMEPLAY_BALANCE_AUDIT.md, approved
 *  2026-09-24). A crop with a `regrow` stays after its harvest and grows again in that time -- FIVE HARVESTS in all
 *  (the designer, 2026-10-04, after a morning of "every crop is only one time only" and a player's word that the
 *  crops that stay are a free farmer's steady living: "these crops will only give you five times ... at the fifth
 *  time you are harvesting, each crop will vanish"); every other crop is harvested once. Their seeds keep the dearer
 *  price they always had (catalog.js, seedDear). The shovel takes any crop out at any time. */
export const CROP_TIMES = {
  Carrot: { grow: 2 }, Parsnip: { grow: 5 }, 'Spring Onion': { grow: 6 }, Potato: { grow: 8 }, Onion: { grow: 12 },
  Wheat: { grow: 15 }, Marigold: { grow: 20 }, Cabbage: { grow: 20 }, Rice: { grow: 30 }, Broccoli: { grow: 30 },
  Sunflower: { grow: 35 }, Corn: { grow: 40, regrow: 30 }, Cucumber: { grow: 40, regrow: 30 },
  Tomato: { grow: 45, regrow: 35 }, 'Adzuki Bean': { grow: 45, regrow: 35 },
  'Green Beans': { grow: 50, regrow: 40 }, Blackberry: { grow: 50, regrow: 40 },
  Eggplant: { grow: 60, regrow: 45 }, 'Hot Pepper': { grow: 60, regrow: 45 },
  'Green Bell Pepper': { grow: 60, regrow: 45 }, 'Red Bell Pepper': { grow: 60, regrow: 45 }, 'Yellow Bell Pepper': { grow: 60, regrow: 45 },
  'Sweet Potato': { grow: 70 }, Strawberry: { grow: 80, regrow: 60 }, Blueberry: { grow: 90, regrow: 60 },
  Cauliflower: { grow: 90 }, Cantaloupe: { grow: 100 }, Watermelon: { grow: 110 }, Beetroot: { grow: 120 },
  Asparagus: { grow: 120 }, Aloe: { grow: 150 }, Grapes: { grow: 150, regrow: 90 }, Pumpkin: { grow: 180 },
  Saffron: { grow: 240 }, Pineapple: { grow: 240 }, 'Star Fruit': { grow: 300 },
};
for (const s of SEEDS) {
  const t = CROP_TIMES[s.name];
  if (!t) throw new Error(`rules.js: no growth time for ${s.name}`);
  s.grow = t.grow; s.regrow = t.regrow ?? null; s.seedDear = !!t.regrow;
  s.harvests = t.regrow ? REGROW_HARVESTS : 1;                     // (how many times one plant is cut before it goes)
}

/** WHERE SEEDS COME FROM. The Seed & Tool Shop sells some from the start and more as the Farming level
 *  rises; the rarest come from quests, Task Center rewards, exploration and discoveries -- never the shop.
 *  A harvest never returns seeds. Seeds are bought, sold and traded through the server economy, which
 *  /play is not connected to yet: this is what it will read (levels: the live game's ladder, with the new
 *  crops placed on it -- starting values). */
export const SEED_SOURCES = {
  shopFromStart: ['Carrot', 'Parsnip'],
  shopAtFarmingLevel: {
    'Spring Onion': 2, Wheat: 2, Potato: 3, Cabbage: 3, Onion: 4, Marigold: 5, Rice: 5, Broccoli: 5, Corn: 6,
    Sunflower: 6, Tomato: 7, Cucumber: 7, 'Green Beans': 8, 'Adzuki Bean': 8, Eggplant: 9, Blackberry: 9,
    'Hot Pepper': 10, 'Green Bell Pepper': 10, 'Red Bell Pepper': 10, 'Yellow Bell Pepper': 10, 'Sweet Potato': 10,
    Strawberry: 11, Cauliflower: 12, Blueberry: 12, Cantaloupe: 13, Watermelon: 13, Beetroot: 14, Asparagus: 14,
    Pumpkin: 15, Aloe: 15, Grapes: 16, Pineapple: 17,
  },
  special: ['Saffron', 'Star Fruit'],       // quests, tasks, exploration, hidden areas, discoveries
};

/** ENEMIES (the designer's categories). PASSIVE creatures -- the forest animals, the goblin merchant --
 *  are the living world (ambient.js), never enemies. NEUTRAL ones fight only once hit, and retreat when
 *  badly hurt. HOSTILE ones notice you within `notice` px, come at you, attack within `reach` every
 *  `cooldown` s, flinch when hit, and die -- or retreat, below `retreatAt` of their health. ELITE: the
 *  strong regional ones. `art`: the pack's own animations (4 rows -- down, up, right, left -- of `cell` px).
 *
 *  TOUGH (the designer, 2026-09-30: "a lot stronger, tougher enemies, so the combat feels good" -- "Tough": about
 *  four times the health and twice the damage of the starting stats, faster and keener; the golden slime a real
 *  fight). Against the player's 100 health and a common sword's 3 a blow (arrow 2, staff bolt 4; a better weapon's
 *  rarity multiplies it, WEAPON_RARITY): a slime takes about 8 strokes and can take a third of your health.
 *  `windup`: the tell before a blow (it stops and flashes -- step away and it misses); `pack`: how near its kind
 *  must be to join the fight when it does; `gold`: what it drops, [least, most] (the server rolls it:
 *  commands.js 'combat.loot'); `slam` (the golden slime): every `every`th attack a leap onto where you stand,
 *  hurting everything within `radius`. */
const ANIM4 = (dir, a, cell = 32, rows = 4) => ({ dir: `Enemy/${dir}`, cell, rows, anim: a });
const SLIME_ART = (c) => ANIM4(`Slimes/${c}/Slime`, { idle: ['Idle', 4], walk: ['Walk', 4], attack: ['Walk', 4], hurt: ['Damage', 4], dead: ['Dead', 4] });
const GOBLIN_ART = (g, attack) => ANIM4(`Goblins/${g}`, { idle: ['Idle', 4], walk: ['Walk', 6], attack, hurt: ['Damage', 4], dead: ['Dead', 4] });
export const ENEMIES = {
  slime:         { name: 'Slime', behavior: 'hostile', hp: 24, damage: 10, speed: 32, notice: 100, reach: 14, cooldown: 1.0, windup: 0.4, pack: 72, gold: [10, 25], art: SLIME_ART('Green') },
  blue_slime:    { name: 'Blue Slime', behavior: 'hostile', hp: 24, damage: 10, speed: 32, notice: 100, reach: 14, cooldown: 1.0, windup: 0.4, pack: 72, gold: [10, 25], art: SLIME_ART('Blue') },
  pink_slime:    { name: 'Pink Slime', behavior: 'hostile', hp: 24, damage: 10, speed: 32, notice: 100, reach: 14, cooldown: 1.0, windup: 0.4, pack: 72, gold: [10, 25], art: SLIME_ART('Pink') },
  black_slime:   { name: 'Black Slime', behavior: 'hostile', hp: 48, damage: 16, speed: 34, notice: 110, reach: 14, cooldown: 0.95, windup: 0.38, pack: 80, gold: [25, 45], art: SLIME_ART('Black') },
  purple_slime:  { name: 'Purple Slime', behavior: 'hostile', hp: 48, damage: 16, speed: 34, notice: 110, reach: 14, cooldown: 0.95, windup: 0.38, pack: 80, gold: [25, 45], art: SLIME_ART('Pupple') },
  golden_slime:  { name: 'Golden Slime', behavior: 'elite', hp: 120, damage: 20, speed: 36, notice: 130, reach: 16, cooldown: 1.0, windup: 0.45, pack: 96, gold: [220, 280],
                   slam: { every: 3, windup: 0.7, radius: 30, damage: 28 }, art: SLIME_ART('Golden') },
  sprout_slime:  { name: 'Sprout Slime', behavior: 'neutral', hp: 32, damage: 8, speed: 28, notice: 100, reach: 14, cooldown: 1.1, windup: 0.4, retreatAt: 0.2, pack: 64, gold: [8, 20],
                   art: ANIM4('Sprout Slime/Blue', { idle: ['Idle', 1], walk: ['Walk', 2], attack: ['Walk', 2], hurt: ['Damage', 2], dead: ['Dead', 4] }) },
  myconid:       { name: 'Myconid', behavior: 'neutral', hp: 40, damage: 12, speed: 30, notice: 100, reach: 16, cooldown: 1.1, windup: 0.45, retreatAt: 0.2, pack: 80, gold: [15, 35],
                   art: ANIM4('Myconid/Red', { idle: ['Idle', 4], walk: ['Walk', 6], attack: ['Attack', 6], hurt: ['Damage', 4], dead: ['Dead', 5] }) },
  spear_goblin:  { name: 'Spear Goblin', behavior: 'hostile', hp: 56, damage: 16, speed: 38, notice: 120, reach: 18, cooldown: 0.95, windup: 0.4, retreatAt: 0.15, pack: 96, gold: [30, 50],
                   art: GOBLIN_ART('Spear Goblin', ['Spear', 6]) },
  archer_goblin: { name: 'Archer Goblin', behavior: 'hostile', hp: 40, damage: 12, speed: 34, notice: 150, reach: 110, cooldown: 1.4, windup: 0.5, retreatAt: 0.15, pack: 96, gold: [25, 45],
                   shot: 'arrow', art: GOBLIN_ART('Archer Goblin', ['Bow', 7]) },
  bomb_goblin:   { name: 'Bomb Goblin', behavior: 'elite', hp: 96, damage: 30, speed: 36, notice: 130, reach: 90, cooldown: 2.0, windup: 0.6, pack: 110, gold: [120, 180],
                   shot: 'bomb', blast: 24, art: GOBLIN_ART('Bomb Goblin', ['Throw a bomb', 5]) },
  spike:         { name: 'Spike', behavior: 'hostile', hp: 48, damage: 12, speed: 0, notice: 120, reach: 100, cooldown: 1.6, windup: 0.5, gold: [20, 40], stationary: true,
                   shot: 'spit', art: ANIM4('Spike', { idle: ['idle', 4], walk: ['idle', 4], attack: ['spitting', 5], hurt: ['damage', 2], dead: ['dead', 5] }) },
  venom_bloom:   { name: 'Venom Bloom', behavior: 'hostile', hp: 48, damage: 16, speed: 0, notice: 48, reach: 24, cooldown: 1.3, windup: 0.45, gold: [20, 40], stationary: true,
                   art: ANIM4('Venom Bloom/Purple', { idle: ['Idle', 3], walk: ['Idle', 3], attack: ['Attack', 4], hurt: ['Damage', 2], dead: ['Dead', 5] }, 48, 1) },
};
/** THE CAVES' OWN CREATURES (the designer, 2026-09-30: "more slime enemies... fire lava slime", and "spider enemies
 *  for caves... multiple variations inside multiple caves, and every spider can have different damage, and maybe
 *  they can have poisonous effect or burning effect"): the designer's own packs (sources 'slime' and 'spider').
 *  A new slime's sheet is one per animation, 64 px cells, rows down / up / left / right, its feet at 41. A spider's is
 *  one sheet: rows up / left / down / right, columns 0-3 its bite and 4-9 its walk; row 4 its death. A spider is
 *  drawn at `scale` of its 64 px (the art is a giant's: a half is a slime's size; the two queens of the deep are
 *  drawn whole). `effect`: what its blow leaves you with -- poison or burning, `dps` health a second for `seconds`
 *  (play.js afflict). `radius`: how far from its middle a blow or a shot finds it. */
const NEWSLIME = (n, attack) => ({ dir: `slime/Slime${n}`, cell: 64, rows: 4, order: ['down', 'up', 'left', 'right'], foot: 41, tall: 24,
  anim: { idle: [`Slime${n}_Idle_with_shadow`, 6], walk: [`Slime${n}_Walk_with_shadow`, 8], attack: [`Slime${n}_Attack_with_shadow`, attack],
    hurt: [`Slime${n}_Hurt_with_shadow`, 5], dead: [`Slime${n}_Death_with_shadow`, 10] } });
const SPIDER = (nn, scale) => ({ dir: 'spider', cell: 64, rows: 4, order: ['up', 'left', 'down', 'right'], foot: 50, tall: 38, scale,
  anim: { idle: [`spider${nn}`, 2, 4], walk: [`spider${nn}`, 6, 4], attack: [`spider${nn}`, 4, 0], hurt: [`spider${nn}`, 2, 0, 4], dead: [`spider${nn}`, 4, 0, 4] } });
const POISON = (dps, seconds) => ({ kind: 'poison', dps, seconds }), BURN = (dps, seconds) => ({ kind: 'burn', dps, seconds });
Object.assign(ENEMIES, {
  // the new slimes: a cave slime, a crystal slime, and the lava slime of the red deep, whose touch burns
  cave_slime:     { name: 'Cave Slime', behavior: 'hostile', hp: 30, damage: 10, speed: 32, notice: 100, reach: 14, cooldown: 1.0, windup: 0.4, pack: 72, gold: [12, 28], art: NEWSLIME(1, 10) },
  crystal_slime:  { name: 'Crystal Slime', behavior: 'hostile', hp: 44, damage: 12, speed: 30, notice: 100, reach: 14, cooldown: 1.0, windup: 0.4, pack: 72, gold: [20, 38], art: NEWSLIME(2, 11) },
  lava_slime:     { name: 'Lava Slime', behavior: 'hostile', hp: 54, damage: 14, speed: 30, notice: 110, reach: 14, cooldown: 1.0, windup: 0.42, pack: 80, gold: [28, 48],
                    effect: BURN(4, 3), art: NEWSLIME(3, 9) },
  // the spiders, a kind to a cave, harder the deeper the cave
  pit_spider:     { name: 'Pit Spider', behavior: 'hostile', hp: 28, damage: 9, speed: 38, notice: 96, reach: 15, cooldown: 1.0, windup: 0.35, pack: 80, gold: [15, 30], radius: 9, art: SPIDER('10', 0.5) },
  tunnel_spider:  { name: 'Tunnel Spider', behavior: 'hostile', hp: 36, damage: 11, speed: 38, notice: 100, reach: 15, cooldown: 1.0, windup: 0.35, pack: 80, gold: [18, 34], radius: 9, art: SPIDER('06', 0.5) },
  glimmer_spider: { name: 'Glimmer Spider', behavior: 'hostile', hp: 30, damage: 10, speed: 38, notice: 96, reach: 15, cooldown: 1.0, windup: 0.35, pack: 80, gold: [15, 30], radius: 9, art: SPIDER('02', 0.5) },
  pale_spider:    { name: 'Pale Spider', behavior: 'hostile', hp: 26, damage: 8, speed: 36, notice: 90, reach: 15, cooldown: 1.1, windup: 0.38, pack: 72, gold: [12, 26], radius: 9, art: SPIDER('07', 0.5) },
  topaz_spider:   { name: 'Topaz Spider', behavior: 'hostile', hp: 48, damage: 14, speed: 40, notice: 110, reach: 17, cooldown: 0.95, windup: 0.36, pack: 88, gold: [25, 45], radius: 12, art: SPIDER('09', 0.75) },
  drowned_spider: { name: 'Drowned Spider', behavior: 'hostile', hp: 44, damage: 12, speed: 38, notice: 110, reach: 17, cooldown: 1.0, windup: 0.38, pack: 88, gold: [25, 45], radius: 12,
                    effect: POISON(2, 4), art: SPIDER('08', 0.75) },
  venom_spider:   { name: 'Venom Spider', behavior: 'hostile', hp: 56, damage: 14, speed: 40, notice: 115, reach: 17, cooldown: 0.95, windup: 0.36, pack: 88, gold: [30, 50], radius: 12,
                    effect: POISON(3, 5), art: SPIDER('01', 0.75) },
  ember_spider:   { name: 'Ember Spider', behavior: 'hostile', hp: 60, damage: 16, speed: 40, notice: 115, reach: 17, cooldown: 0.95, windup: 0.36, pack: 88, gold: [35, 55], radius: 12,
                    effect: BURN(4, 3), art: SPIDER('03', 0.75) },
  cinder_spider:  { name: 'Cinder Spider', behavior: 'hostile', hp: 70, damage: 18, speed: 42, notice: 120, reach: 17, cooldown: 0.9, windup: 0.35, pack: 96, gold: [40, 60], radius: 12,
                    effect: BURN(5, 3), art: SPIDER('04', 0.75) },
  gilded_spider:  { name: 'Gilded Spider', behavior: 'hostile', hp: 80, damage: 20, speed: 42, notice: 120, reach: 17, cooldown: 0.9, windup: 0.35, pack: 96, gold: [45, 70], radius: 12,
                    effect: POISON(3, 5), art: SPIDER('11', 0.75) },
  // the two queens of the deep: whole giants, a bite that lingers
  bone_spider:    { name: 'Bone Spider', behavior: 'elite', hp: 220, damage: 26, speed: 40, notice: 140, reach: 22, cooldown: 1.0, windup: 0.5, pack: 120, gold: [300, 380], radius: 16,
                    effect: POISON(4, 6), art: SPIDER('05', 1) },
  vault_queen:    { name: 'Vault Queen', behavior: 'elite', hp: 280, damage: 30, speed: 40, notice: 140, reach: 22, cooldown: 1.0, windup: 0.5, pack: 120, gold: [400, 500], radius: 16,
                    effect: POISON(5, 6), art: SPIDER('11', 1) },
});
/**
 * THE UNDEAD (2026-10-02, the Barrowmire; the designer: "undead soldier, undead knight, undead archer, undead lich,
 * undead monsters... as epically menacing as possible"). Drawn by script (design/undead-enemies; source 'undeadfoe' =
 * the folder Undead Enemies/): four rows (down, up, right, left), square cells -- 48 for the ghoul, hound and wraith,
 * 64 for the knight and the lich, 96 for the golem. What they do is combat.js's (2026-10-02): steady (a blow does not
 * stop it), armor, the green curse in volleys that home, summoned thralls, a stomp, rising from the ground, their own
 * windup and rise frames, eyes in the dark, the land-bound (`ground`) kept off the water. The Gold is proposed, for the
 * designer to approve (it keeps the existing Gold-to-health ratios: commons about 0.7-1, elites 1.1-1.4).
 */
const UNDEAD = (dir, cell, foot, tall, o = {}) => ({ dir: `undeadfoe/${dir}`, cell, rows: 4, foot, tall, deathS: 1.4, ...o.art,
  anim: { idle: ['Idle', 4], walk: ['Walk', 6], attack: ['Attack', 6], hurt: ['Hurt', 3], dead: ['Death', 6], windup: ['Windup', 3], ...(o.anim ?? {}) } });
const BONES = { notice: 'hit', death: 'rockBreak', rise: 'rockBreak' };
Object.assign(ENEMIES, {
  death_knight: { name: 'Death Knight', behavior: 'elite', hp: 180, damage: 26, speed: 22, notice: 125, reach: 22, cooldown: 1.4, windup: 0.6, pack: 120,
                  gold: [140, 200], radius: 13, mid: 18, steady: true, armor: 0.25, ground: true, cues: { ...BONES, notice: 'hit' },
                  art: UNDEAD('Death Knight', 64, 58, 56, { art: { eyeColor: '#ff4a3a', eyes: { down: [[29, 20], [35, 20]], right: [[39, 22], [40, 22]], left: [[24, 22], [23, 22]] } } }) },
  lich:         { name: 'Lich', behavior: 'elite', hp: 280, damage: 22, speed: 24, notice: 175, reach: 140, cooldown: 1.7, windup: 0.7, pack: 170,
                  gold: [320, 400], radius: 12, mid: 24, steady: true, shot: 'curse', volley: { n: 3, spread: 0.22 }, homing: 1.0,
                  castFrom: { down: [-11, -36], up: [19, -46], right: [23, -42], left: [-23, -42] },
                  summon: { kind: 'skeleton_soldier', n: 2, every: 3, most: 4 }, cues: { notice: 'magicCast', death: 'rockBreak' },
                  art: UNDEAD('Lich', 64, 58, 60, { art: { eyeColor: '#9dffb8' } }) },
  wraith:       { name: 'Wraith', behavior: 'hostile', hp: 70, damage: 16, speed: 40, notice: 150, reach: 18, cooldown: 1.0, windup: 0.45, pack: 120,
                  gold: [40, 64], radius: 10, mid: 18, cues: { notice: 'magicCast', death: 'magicCast' },
                  art: UNDEAD('Wraith', 48, 43, 40, { art: { eyeColor: '#8ff4ff' } }) },
  bone_golem:   { name: 'Bone Golem', behavior: 'elite', hp: 360, damage: 30, speed: 18, notice: 130, reach: 26, cooldown: 1.7, windup: 0.8, pack: 120,
                  gold: [380, 460], radius: 22, mid: 30, steady: true, armor: 0.3, ground: true,
                  slam: { every: 2, windup: 0.8, radius: 40, damage: 36, leap: false }, cues: { ...BONES, notice: 'hit' },
                  art: UNDEAD('Bone Golem', 96, 90, 88, { art: { eyeColor: '#7dff9f' } }) },
});

/** KILLS PAY (the designer, 2026-09-30: "small Gold drops"): the server pays a kill once it could have happened --
 *  the map has that enemy, and no more of its kind in `windowS` seconds than the map sets down (commands.js
 *  'combat.loot'). */
// (2026-10-02, a player's report: a kill's Gold could be claimed from the console with no fight and no energy. A kill is
//  now paid only from the damage the farmer's own blows have landed -- commands.js swing keeps it (save.fight), and
//  'combat.loot' takes the creature's whole health out of it. keepS: how long landed damage waits for its kill; most:
//  the most creatures one sword blow is believed to reach.)
export const KILL_LOOT = { windowS: 90, keepS: 600, most: 4, cap: 1000 };

/** THE TOWN IS SAFE, AND SO IS HOME: no enemy is ever set down on the town's map, inside its buildings, or
 *  on the player's home island (home_island, and its cottage, interior_home) -- a zone tagged
 *  `spawn:<enemy>` there is ignored. Enemies live in the wilderness maps still to be made. */
export const isSafePlace = (doc) => doc?.safe === true || /^(bloomshire_town|interior_|home_)/.test(doc?.id ?? '');

/* ================================================================================ THE CAVES (2026-09-26) */

// Every region's caves (the designer, 2026-09-26): each one different -- some deeper, some with better
// things in them -- and not every one open to everyone: some wait on a quest, one on a better pickaxe.
// The maps are cave_* (region "caves"); their doors are the regions' old cave-mouth zones.

/** ORE: what a pickaxe gets out of a seam or a crystal (game/nodes.js knows them by their art). `tier`: the
 *  pickaxe it needs (TOOL_TIERS: 1 Iron, 2 Bronze, 3 Gold, 4 Amethyst -- the Forge sells all four); `hits`:
 *  blows to break it (a double seam takes one more and gives two); `regrow`: minutes until it is back.
 *  Every blow on ore is heavy work (COST.heavyOre). What each is worth is catalog.js's.
 *  TEMP: starting values for the balance phase. */
export const ORES = {
  copper:    { item: 'Copper Ore', tier: 1, hits: 3, regrow: 20 },
  quartz:    { item: 'Quartz', tier: 1, hits: 3, regrow: 20 },
  rose:      { item: 'Rose Quartz', tier: 1, hits: 3, regrow: 25 },
  topaz:     { item: 'Topaz', tier: 2, hits: 4, regrow: 40 },
  sapphire:  { item: 'Sapphire', tier: 2, hits: 4, regrow: 40 },
  moonstone: { item: 'Moonstone', tier: 2, hits: 4, regrow: 45 },
  emerald:   { item: 'Emerald', tier: 3, hits: 5, regrow: 60 },
  amethyst:  { item: 'Amethyst', tier: 3, hits: 5, regrow: 60 },
  ruby:      { item: 'Ruby', tier: 3, hits: 5, regrow: 75 },
  gold:      { item: 'Gold Ore', tier: 4, hits: 6, regrow: 90 },
  diamond:   { item: 'Diamond', tier: 4, hits: 6, regrow: 120 },
};

/** THE WAYS IN. A door (a zone tagged to:<map>) may be LOCKED for players by another tag on it:
 *    lock:quest:<id>     until the player has finished that quest (game/quests.js)
 *    lock:step:<id>:<n>  until that quest has reached step n (a way that opens part-way through a chapter)
 *    lock:pickaxe:<n>    until they carry a pickaxe of tier n or better (a rockfall to break through)
 *  An admin goes through any of them (the master prompt: the developer must be able to bypass locks), and
 *  so does the designer in the map editor's Play. The zone's notes are what a player reads at the door. */
export const questDone = (save, id) => !!save?.quests?.[id]?.done;
const questAt = (save, id, n) => questDone(save, id) || (save?.quests?.[id]?.step ?? -1) >= n;
/** A door's locks, from its zone's tags: [{ kind: 'quest', id } | { kind: 'step', id, n } | { kind: 'pickaxe', tier }]. */
export function locksOf(z) {
  const out = [];
  for (const t of z?.tags ?? []) {
    const m = /^lock:(quest|step|pickaxe):(.+)$/.exec(t);
    if (m?.[1] === 'quest') out.push({ kind: 'quest', id: m[2] });
    else if (m?.[1] === 'step') { const [id, n] = m[2].split(':'); out.push({ kind: 'step', id, n: +n || 0 }); }
    else if (m?.[1] === 'pickaxe') out.push({ kind: 'pickaxe', tier: Math.max(1, Math.min(4, +m[2] || 1)) });
  }
  return out;
}
/** What a quest-locked door says (game/quests.js tells this file: it imports the rules, not the other way round). */
let LOCK_HINTS = {};
export function useLockHints(h) { LOCK_HINTS = h ?? {}; }
/** Why a door stays shut for this player -- a sentence -- or null when it opens. `bestPickaxe` is the best
 *  pickaxe tier they carry (0 for none). */
export function lockedBecause(z, save, bestPickaxe = 0) {
  for (const L of locksOf(z)) {
    if (L.kind === 'quest' && !questDone(save, L.id)) return LOCK_HINTS[L.id] ?? 'The way is shut.';
    if (L.kind === 'step' && !questAt(save, L.id, L.n)) return LOCK_HINTS[L.id] ?? 'Not yet.';
    if (L.kind === 'pickaxe' && bestPickaxe < L.tier) return `Fallen rock blocks the way. A ${TOOL_TIERS[L.tier].name} pickaxe or better would break through.`;
  }
  return null;
}

/** COOKING (2026-09-26, the designer: "build simple cooking"): at a stove (a zone tagged cook -- Marlow's old
 *  house, the Bakery) ingredients become a dish (FOOD's dishes). EVERY INGREDIENT BY NAME (2026-10-07, the designer:
 *  a dish "requires one fish of a specific kind and then one vegetable of a specific kind ... they can't really just
 *  put any fish they want"): no "any fish", no "any crop" -- and the cook puts each one in the pot by hand, at the
 *  Hearth (ui.js). Cooking costs no energy; eating is where the energy is. */
export const RECIPES = [
  { dish: 'Fried Fish', needs: [['Carp', 1]] },
  { dish: 'Vegetable Plate', needs: [['Carrot', 1], ['Potato', 1]] },
  { dish: 'Bread', needs: [['Wheat', 2]] },
  { dish: 'Garden Salad', needs: [['Cabbage', 1], ['Tomato', 1]] },
  { dish: 'Fruit Jam', needs: [['Strawberry', 2]] },
  { dish: 'Hearty Stew', needs: [['Pike Fish', 1], ['Potato', 1], ['Onion', 1]] },
  // the Founders' own (their letter: the Founding Farmers, Chapter 16)
  { dish: 'Moonlight Stew', needs: [['Ghost Catfish', 1], ['Star Fruit', 1], ['Silvercap Mushroom', 2]] },
];
/** A dish's ingredients in words: "1 Pike Fish, 1 Potato and 1 Onion". */
export const needWords = (needs) => { const w = needs.map(([id, n]) => `${n} ${id}`); return w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w.at(-1)}` : w[0] ?? ''; };
/** FORAGING: what grows wild to be picked (a zone tagged forage:<item>), and how long until it grows back. */
export const FORAGE_REGROW_MINUTES = 30;
export const FORAGE = { silvercap: 'Silvercap Mushroom', glowcap: 'Glowcap Mushroom' };
/** WHAT GROWS WILD, KNOWN BY ITS LOOK (the designer, 2026-09-26: what you see is what you get): a map object drawn
 *  with one of these IS that thing, wherever it is -- picked (forage), it is gone until it grows back. */
export const WILD = [
  { kind: 'silvercap', asset: 'Objects/Tree/Deep Forest/Fantasy Mushroom.png', x: 8, y: 128 },
  { kind: 'glowcap', asset: 'Objects/Tree/Deep Forest/Fantasy Mushroom.png', x: 8, y: 224 },
];
/** The kind of wild thing a map object is (either shape of object: the editor's or the file's), or null. */
export const wildOf = (o) => WILD.find((w) => o?.asset === w.asset && (o.sx ?? o.source?.x) === w.x && (o.sy ?? o.source?.y) === w.y)?.kind ?? null;
/** THE FOUNDERS' SEED takes only for a farmer who knows the land: the Farming level a seed needs to be sown. */
export const SEED_LEVEL = { 'Star Fruit': 10 };

/**
 * LUCKY SHARDS (the designer, 2026-09-30: "if you have planted some rare crops and when you harvest them, you might
 * get lucky and get AVS. And same with fishing ... same with the other life skills"; the numbers, their picks): now
 * and then an action brings 1 or 2 Averyn Shards with it. The SERVER alone rolls (server/world2.js: a secret the page
 * never has, so a drop cannot be foreseen), books it through the economy's own door ('shards.drop') and tells the
 * page, which shows the shard. At most `dailyCap` a player a day (UTC).
 */
export const SHARD_DROPS = {
  dailyCap: 30,
  amounts: [1, 1, 2],                   // (1 twice as often as 2)
  chance: { rareCrop: 1 / 8, fish: 1 / 20, ore: 1 / 25, tree: 1 / 25, forage: 1 / 25 },
  rareFromLevel: 10,                    // a crop the shops sell from this Farming level up -- and the quests' own -- is rare
};
/** Is this crop rare enough to drop Shards? */
export const isRareCrop = (name) => SEED_SOURCES.special.includes(name) || (SEED_SOURCES.shopAtFarmingLevel[name] ?? 0) >= SHARD_DROPS.rareFromLevel;
/** THE FOUNDERS' REWARD (the designer, 2026-09-30): the first 1,000 players to finish the Founding Farmers story -- a
 *  free mint spot, and these Shards (server/world2.js; admins never take a place). */
export const FOUNDING_REWARD = { first: 1000, shards: 500 };

/** LOOT: what a cave's old chest holds (a zone tagged loot:<id> over the chest). Each player takes it once,
 *  for good. A tool comes at its tier, a weapon at its rarity; the deeper and harder the cave, the better.
 *  TEMP: starting values for the balance phase. */
export const LOOT = {
  old_working:  { name: "The shift boss's chest", items: [['tool:pickaxe', 1, { tier: 2 }], ['Copper Ore', 6], ['Quartz', 3]] },
  topaz_drift:  { name: "The drift's tool box", items: [['tool:axe', 1, { tier: 2 }], ['Topaz', 3]] },
  green_vein:   { name: "The prospector's chest", items: [['tool:pickaxe', 1, { tier: 3 }], ['Emerald', 2]] },
  // (the Gloom's rare sword and the vault's Amethyst pickaxe and epic bow are the Founding Farmers' chapter rewards
  // now -- game/quests.js ff11, ff13 --, and Marven's rubies are mined, not found: 2026-09-26)
  gloom:        { name: 'The chest in the red deep', items: [['tool:axe', 1, { tier: 3 }], ['Amethyst', 3]] },
  vault:        { name: "The delvers' strongbox", items: [['tool:rod', 1, { tier: 4 }], ['Gold Ore', 4], ['Diamond', 1]] },
  glimmer:      { name: 'The chest under the roots', items: [['tool:rod', 1, { tier: 2 }], ['Sapphire', 3]] },
  old_cave:     { name: 'The drowned chest', items: [['tool:rod', 1, { tier: 3 }], ['Moonstone', 2], ['Rose Quartz', 4]] },
};

/* ------------------------------------------------------------ keeping it (per player) */

// THE SAVE DOCUMENT (2026-09-25): the game's progress is the SERVER's. The game (gamemain.js) points
// load/save at the player's save document -- the one the server sent and keeps (server/world2.js) -- and
// the server runs these same rules against its own copy of it (game/commands.js). Without one (the map
// editor's Play) they are kept in this browser, as before.
let KEY = 'bme.play.';
let DOC = null;
/** Where this browser keeps a player's things: the game gives each signed-in wallet its own (gamemain.js). */
export function setSaveKey(prefix) { KEY = String(prefix || 'bme.play.'); }
/** Keep everything in `doc` (a plain object: name -> value) from now on; null goes back to the browser. */
export function useSaveDoc(doc) { DOC = doc ?? null; }
export const saveDoc = () => DOC;
export function load(name, fallback) {
  if (DOC) return DOC[name] == null ? fallback : structuredClone(DOC[name]);
  try { return JSON.parse(localStorage.getItem(KEY + name) || 'null') ?? fallback; } catch { return fallback; }
}
export function save(name, value) {
  if (DOC) { DOC[name] = structuredClone(value); return; }
  try { localStorage.setItem(KEY + name, JSON.stringify(value)); } catch { /* a private window */ }
}

/**
 * ENERGY (the Final Rules). An amount, and nothing that raises it but:
 *   * a RECOVERY -- startRecovery(), called by lying down in the bed at home: a REST, allowed once every 12 real hours
 *     (a Founding Farmer's: 6), the cooldown running from the moment it starts. It fills the bar at a whole bar
 *     per real hour (2026-09-27, the designer: "one hour should replenish all that energy... if some player comes to
 *     the bed with 50 energy or 25 energy, it will take less time") -- and only while you lie there: getting up
 *     (getUp()) keeps what it has given so far and stops it. Lying down again before the next rest is due carries
 *     the same rest on until the bar it set out to fill is full (restLeft: what this rest may still give), so an
 *     early get-up is never wasted and a rest never gives more than the one bar;
 *   * FOOD -- eat(): a cooked dish's value, capped at the bar's maximum; raw food gives nothing;
 *   * refill(): a testing aid in the editor, never in the game.
 * All times are the SERVER's (gameNow()). A save from the old passive refill is carried over once: what
 * it had come back to by then, and no more.
 */
export class Energy {
  constructor(now = gameNow()) {
    this.founding = false;
    const s = load('energy', null);
    if (s && s.v == null && s.stored != null) {                 // the old save: { stored, at }, refilling 100 per 2 hours
      this.v = Math.min(ENERGY.max, s.stored + Math.max(0, Date.now() - (s.at ?? Date.now())) * (ENERGY.max / 7.2e6));
      this.at = now; this.lastRecovery = null; this.recovery = null; this.keep();
    } else {
      this.v = s?.v ?? ENERGY.max; this.at = s?.at ?? now;
      this.lastRecovery = s?.lastRecovery ?? null; this.recovery = s?.recovery ?? null;
      // (a rest begun before restLeft was kept: what it had still to give)
      const r = this.recovery;
      this.restLeft = s?.restLeft ?? (r ? r.rate * Math.max(0, r.until - Math.max(this.at, r.from)) : 0);
    }
  }
  keep() { save('energy', { v: this.v, at: this.at, lastRecovery: this.lastRecovery, recovery: this.recovery, restLeft: this.restLeft ?? 0 }); }
  /** A Founding Farmer's bar (the account says so): bigger, and a shorter cooldown. */
  setFounding(on) { this.founding = !!on; }
  /** THE ADMIN (2026-09-27: "every restriction for players shouldn't apply to me"): a bar that never runs down. */
  setUnlimited(on) { this.unlimited = !!on; }
  get max() { return maxEnergy(this.founding); }
  get cooldownMs() { return (this.founding ? ENERGY.foundingRecoveryEveryHours : ENERGY.recoveryEveryHours) * 3600e3; }

  value(now = gameNow()) {
    if (this.unlimited) return this.max;
    let v = this.v;
    const r = this.recovery;
    if (r) v += r.rate * Math.max(0, Math.min(now, r.until) - Math.max(this.at, r.from));
    return Math.max(0, Math.min(this.max, v));
  }
  /** Fold what a recovery has given so far into the amount (before any change) -- and out of what the rest may still give. */
  settle(now) {
    const v = this.value(now);
    if (this.recovery && !this.unlimited) this.restLeft = Math.max(0, (this.restLeft ?? 0) - Math.max(0, v - this.v));
    this.v = v; this.at = now;
    if (this.recovery && now >= this.recovery.until) this.recovery = null;
  }
  /** Spend if there is enough; false (and nothing spent) if not. */
  spend(n, now = gameNow()) {
    if (this.unlimited) return true;
    const v = this.value(now);
    if (v + 1e-9 < n) return false;
    this.settle(now); this.v = v - n; this.keep();
    return true;
  }
  /** When the next recovery may start (server ms); now or earlier = it may. */
  recoveryAt() { return this.lastRecovery == null ? 0 : this.lastRecovery + this.cooldownMs; }
  canRecover(now = gameNow()) { return (!this.recovery || now >= this.recovery.until) && now >= this.recoveryAt(); }
  /** Is a rest filling the bar now? Not once the bar is full, however it got there (2026-10-01: the admin's gift of energy
   *  to everyone filled the bars of farmers asleep, and they could not get up till the rest's hour was out). */
  recovering(now = gameNow()) { return !!this.recovery && now < this.recovery.until && this.value(now) < this.max - 1e-6; }
  /** What this rest may still give at `now` (what it had, less what it has given since it was last settled). */
  restLeftAt(now = gameNow()) {
    const left = this.restLeft ?? 0;
    return this.recovery && !this.unlimited ? Math.max(0, left - Math.max(0, this.value(now) - this.v)) : left;
  }
  /** Lying down again would carry on the rest you got up from (it is not over, and the next is not due yet)? */
  canResume(now = gameNow()) {
    return !this.recovering(now) && this.lastRecovery != null && now < this.recoveryAt() && this.restLeftAt(now) > 0.5;
  }
  /** Would lying down now fill the bar at all (a new rest, or the rest of one)? */
  canRest(now = gameNow()) {
    return !this.recovering(now) && (this.canRecover(now) || this.canResume(now)) && this.value(now) < this.max - 0.5;
  }
  /** Lie down (resting in the bed at home): a new rest, or the one you got up from carried on. The bar fills at a
   *  whole bar per ENERGY.recoveryHours until it is full (or the rest has given its bar). False if it may not. */
  startRecovery(now = gameNow()) {
    if (!this.canRest(now)) return false;
    const fresh = this.canRecover(now);
    this.settle(now);
    // ONE WHOLE BAR A REST, TAKEN IN AS MANY PIECES AS YOU LIKE (2026-10-03, the designer, on players' reports of "slept but
    // the energy is not full"): a rest begun at 95 used to be the 12 hours' whole rest for 5 energy -- lying down by accident
    // left the bed giving nothing for half a day. Now a new rest may give a whole bar before the next is due: what it does
    // not give now, lying down again gives later (canResume). Never more than one bar every 12 hours (6 for a Founder).
    if (fresh) { this.lastRecovery = now; this.restLeft = this.max; }
    const rate = this.max / (ENERGY.recoveryHours * 3600e3), want = Math.min(this.restLeft, this.max - this.v);
    this.recovery = { from: now, until: now + want / rate, rate };
    this.keep();
    return true;
  }
  /** How long until the bed can fill this bar again (ms), when it cannot now and the bar is not full; else 0. (The HUD
   *  shows it beside the bar: game/ui.js bedWait.) */
  bedWait(now = gameNow()) {
    if (this.unlimited || this.recovering(now) || this.canRest(now) || this.value(now) >= this.max - 0.5) return 0;
    return Math.max(0, this.recoveryAt() - now);
  }
  /** Get up from the bed: what the rest has given so far is kept, and it stops. False if you were not resting. */
  getUp(now = gameNow()) {
    // (any rest still written down ends -- one the bar filled before its time too, so it gives nothing after you are up)
    if (!this.recovery) return false;
    this.settle(now);
    this.recovery = null; this.keep();
    return true;
  }
  /** Eat: a cooked dish restores its value, never past the maximum; raw food restores nothing. The gain. */
  eat(name, now = gameNow(), cap = Infinity) {
    const n = Math.min(foodEnergy(name), cap);
    if (n <= 0) return 0;
    this.settle(now);
    const before = this.v; this.v = Math.min(this.max, this.v + n);
    if (this.v >= this.max - 1e-6) this.recovery = null;           // (a full bar: the rest is over)
    this.keep();
    return this.v - before;
  }
  /** A testing aid (the editor's look panel): full, now. Not reachable in the game. */
  refill(now = gameNow()) { this.v = this.max; this.at = now; this.recovery = null; this.restLeft = 0; this.keep(); }
  /** n more energy (the admin's gift, server/world2.js adminGive), up to the full bar -- a bar never holds more than
   *  its maximum. How much went in. */
  give(n, now = gameNow()) {
    this.settle(now); const was = this.v; this.v = Math.min(this.max, this.v + n);
    if (this.v >= this.max - 1e-6) this.recovery = null;           // (a full bar: a rest under way is over -- you may get up)
    this.keep(); return this.v - was;
  }
}

/** HEALTH (GAMEPLAY_RULES_REPORT.md A3): hurt by enemies, no passive healing; at nought, a collapse. */
export class Health {
  constructor() { const s = load('health', null); this.hp = Math.max(0, Math.min(HEALTH.max, s?.hp ?? HEALTH.max)); this.grace = 0; }
  get max() { return HEALTH.max; }
  keep() { save('health', { hp: this.hp }); }
  /** The admin: nothing hurts. */
  setUnlimited(on) { this.unlimited = !!on; if (on) this.hp = HEALTH.max; }
  /** A blow: nothing during the moment of grace after the last. True if it landed. `t` in seconds. */
  hurt(n, t = performance.now() / 1000) {
    if (this.unlimited || this.hp <= 0 || t < this.grace) return false;
    this.hp = Math.max(0, this.hp - n); this.grace = t + HEALTH.graceSeconds; this.keep();
    return true;
  }
  /** POISON, BURNING (2026-09-30, the cave spiders): n health lost a little at a time -- no grace stops it. */
  sap(n) { if (this.unlimited || this.hp <= 0) return false; this.hp = Math.max(0, this.hp - n); this.keep(); return true; }
  get down() { return this.hp <= 0; }
  /** Out cold: woken with part of your health (energy is not touched). */
  collapse() { this.hp = Math.round(this.max * HEALTH.collapseTo); this.keep(); }
  heal(n) { this.hp = Math.min(this.max, this.hp + n); this.keep(); }
  get hurtNow() { return this.hp < this.max * HEALTH.restTo; }
  /** A rest in the bed at home: health back to HEALTH.restTo of the maximum. True if it healed anything. */
  rest() { if (!this.hurtNow) return false; this.hp = Math.round(this.max * HEALTH.restTo); this.keep(); return true; }
  /** A testing aid. */
  refill() { this.hp = this.max; this.keep(); }
}

/**
 * What you carry: counts by item, each with the pack icon it shows.
 *
 * NOT PART OF THE ECONOMY (Economy v0.1). This bag is the map editor's Play
 * prototype, kept in this browser only: it holds no currency, nothing reads it
 * as anyone's goods, and it never reaches the game server. The one economy is
 * the live server's (server/economy.js); when this world is played online its
 * bag will be the server's PlayerState, not this.
 */
export class Pack {
  constructor() { this.items = load('pack', {}); }
  add(id, n = 1, icon = null) { const it = this.items[id] ?? { n: 0, icon }; it.n += n; if (icon) it.icon = icon; this.items[id] = it; save('pack', this.items); }
  list() { return Object.entries(this.items).filter(([, v]) => v.n > 0); }
}
