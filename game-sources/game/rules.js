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

/** ENERGY (THE REWORK, 2026-10-26, the designer, after the players' talk of "no limit" and "trimming"). A normal
 *  player's bar is 100, a Founding Farmer's (and a VIP's) 150. It comes back three ways:
 *   * BY ITSELF, for everyone alike, online or away: one energy every `regenMinutes`, up to the full bar ("one energy
 *     in 3 minutes ... the same with everyone"; "while offline ... up to full bar");
 *   * SLEEPING in the bed at home, much faster, and never a lock: lie down, get up whenever you like, and what you did
 *     not sleep stays for later in the day. A day's (UTC) sleep is `sleepBars` whole bars (200), a holder's
 *     `foundingSleepBars` of theirs (450), at twice the pace ("the NFT holders can recover 450 energy a day");
 *   * FOOD, one bar a day (FOOD_BARS_A_DAY) -- and the Emporium's Energy Refill, a full bar, `refillsADay` a day. */
export const ENERGY = {
  max: 100,
  // (150, the designer, 2026-10-22: "150 (as in the docs)" -- the mint page and the docs say 150; it was 200)
  foundingBonus: 0.5,               // a Founding Farmer's maximum is max x (1 + this) = 150: the only place the bonus lives
  regenMinutes: 3,                  // one energy back every this long, online or not -- a VIP's alone (2026-10-28)
  sleepBars: 2,                     // a normal player's sleep in a day: this many of their bars (200)
  foundingSleepBars: 3,             // ...a holder's (a VIP's): this many of theirs (450)
  sleepMinutes: 20,                 // sleeping fills 100 in this long (a normal player)...
  foundingSleepPace: 2,             // ...a holder's sleep, this many times as fast
  refillsADay: 3,                   // Energy Refills (the Emporium) a player may drink in a day
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

/**
 * THE DISHES (2026-10-21, the designer: "a full system of how the dishes will be made and how much energy each dish
 * gives"). Every dish a stove makes: [dish, the Cooking level it needs, its energy, what goes in the pot]. Raw food
 * gives nothing; a dish heals as well (FOOD_HEALS), and food gives at most a bar of energy a day (FOOD_BARS_A_DAY).
 *   - The energy climbs with the Cooking level, from 4 at the first to 40 at level 25: a new cook fills the day's bar
 *     with some twenty dishes, a master with three.
 *   - A dish takes only what a cook of its level can grow: no skill climbs more than three levels above another
 *     (catalog.js SKILL_GAP), so a crop sown from Farming level F waits for Cooking F - 3. Saffron and Star Fruit,
 *     which only a story gave, go into none but the Founders' stew.
 *   - At most five things in the pot (the Hearth's pot is five wide), and the dearer they are, the more the dish gives.
 * (Before 2026-10-21 there were eight recipes, Vegetable Plate 2 to Hearty Stew 22, with no level.)
 *
 * THE DISH BOOK REBUILT FOR THE ANIMALS (2026-10-22, the designer: "everything is pretty good, I like everything",
 * design/season0/DISH_BOOK_PROPOSAL.md): 84 dishes -- the 47 above, Roast Drumstick and Honey-Glazed Bacon given recipes,
 * 35 new ones from the eggs, the milk, the meat, the winter and regional crops and the kitchen's staples (STAPLES: the
 * mill's flour and sugar, the dairy's cream, butter and cheese) -- and a fifth: the KIND of dish, and so its boost (MEALS).
 */
export const DISH_BOOK = [
  ['Boiled Egg', 1, 5, [['Egg', 1]], 'breakfast'],
  ['Fried Fish', 1, 5, [['Carp', 1]], 'fish'],
  ['Parsnip Soup', 1, 4, [['Parsnip', 2]], 'garden'],
  ['Vegetable Plate', 1, 5, [['Carrot', 1], ['Potato', 1]], 'garden'],
  ['Baked Potato', 2, 6, [['Potato', 2], ['Spring Onion', 1]], 'garden'],
  ['Bread', 2, 6, [['Flour', 1]], 'sweet'],
  ['Fried Egg', 2, 6, [['Egg', 1], ['Spring Onion', 1]], 'breakfast'],
  ['Corn on the Cob', 3, 7, [['Corn', 2]], 'garden'],
  ['Fried Mushrooms', 3, 7, [['Silvercap Mushroom', 2]], 'forage'],
  ['Garden Salad', 4, 8, [['Cabbage', 1], ['Tomato', 1]], 'garden'],
  ['Hash Browns', 4, 8, [['Potato', 3], ['Onion', 1]], 'breakfast'],
  ['Kale Chips', 4, 8, [['Winter Kale', 2]], 'garden'],
  ['Omelette', 4, 8, [['Egg', 2], ['Onion', 1], ['Tomato', 1]], 'breakfast'],
  ['Popcorn', 4, 8, [['Corn', 3], ['Butter', 1]], 'sweet'],
  ['Pancakes', 5, 9, [['Flour', 1], ['Egg', 1], ['Milk', 1]], 'breakfast'],
  ['Rice Ball', 5, 9, [['Rice', 2], ['Chub', 1]], 'fish'],
  ['Rice Bowl', 5, 10, [['Rice', 2], ['Broccoli', 1], ['Spring Onion', 1]], 'garden'],
  ['Coleslaw', 6, 11, [['Cabbage', 2], ['Carrot', 1], ['Onion', 1]], 'garden'],
  ['Cucumber Salad', 6, 11, [['Cucumber', 2], ['Onion', 1]], 'garden'],
  ['Fish Tacos', 6, 12, [['Perch', 1], ['Corn', 1], ['Tomato', 1]], 'fish'],
  ['Hearty Stew', 6, 12, [['Pike Fish', 1], ['Potato', 1], ['Onion', 1]], 'fish'],
  ['Honey Toast', 6, 11, [['Flour', 1], ['Honey', 1], ['Butter', 1]], 'sweet'],
  ['Roast Drumstick', 6, 11, [['Chicken Meat', 1], ['Potato', 1]], 'meat'],
  ['Bean Hotpot', 7, 13, [['Green Beans', 1], ['Adzuki Bean', 1], ['Tomato', 1], ['Onion', 1]], 'garden'],
  ['Cheese Toast', 7, 12, [['Flour', 1], ['Cheese', 1], ['Tomato', 1]], 'breakfast'],
  ['Chicken Soup', 7, 12, [['Chicken Meat', 1], ['Carrot', 1], ['Onion', 1], ['Parsnip', 1]], 'meat'],
  ['Vegetable Stir Fry', 7, 13, [['Broccoli', 1], ['Green Beans', 1], ['Carrot', 1], ['Rice', 1]], 'garden'],
  ['Bacon and Eggs', 8, 13, [['Pork', 1], ['Egg', 2]], 'breakfast'],
  ['Carrot Cake', 8, 14, [['Carrot', 3], ['Flour', 1], ['Egg', 1], ['Sugar', 1]], 'sweet'],
  ['Fruit Jam', 8, 14, [['Strawberry', 2]], 'sweet'],
  ['Strawberry Milkshake', 8, 13, [['Milk', 1], ['Strawberry', 1], ['Sugar', 1]], 'sweet'],
  ['Turnip Mash', 8, 13, [['Snow Turnip', 2], ['Butter', 1]], 'garden'],
  ['Blackberry Cobbler', 9, 16, [['Blackberry', 3], ['Flour', 1], ['Butter', 1]], 'sweet'],
  ['Butter Cookies', 9, 14, [['Flour', 1], ['Butter', 1], ['Sugar', 1]], 'sweet'],
  ['Duck Egg Custard', 9, 15, [['Duck Egg', 1], ['Milk', 1], ['Sugar', 1]], 'sweet'],
  ['Eggplant Parmigiana', 9, 16, [['Eggplant', 2], ['Tomato', 2], ['Cheese', 1]], 'garden'],
  ['Goat Cheese Salad', 10, 16, [['Goat Cheese', 1], ['Cabbage', 1], ['Tomato', 1], ['Cucumber', 1]], 'garden'],
  ['Ice Cream', 10, 16, [['Cream', 1], ['Sugar', 1], ['Frostberry', 1]], 'sweet'],
  ['Spicy Tacos', 10, 18, [['Hot Pepper', 2], ['Corn', 1], ['Tiger Trout', 1]], 'fish'],
  ['Stuffed Peppers', 10, 18, [['Green Bell Pepper', 1], ['Red Bell Pepper', 1], ['Yellow Bell Pepper', 1], ['Rice', 2]], 'garden'],
  ['Berry Pie', 11, 19, [['Blueberry', 3], ['Flour', 1], ['Butter', 1], ['Sugar', 1]], 'sweet'],
  ['Fairy Rose Tea', 11, 18, [['Fairy Rose', 1], ['Honey', 1]], 'region'],
  ['Fish Pie', 11, 19, [['Pike Fish', 1], ['Potato', 2], ['Cream', 1], ['Butter', 1]], 'fish'],
  ['Glazed Yams', 11, 19, [['Sweet Potato', 3], ['Honey', 1]], 'sweet'],
  ['Roast Duck', 11, 18, [['Duck Meat', 1], ['Honey', 1], ['Sweet Potato', 1]], 'meat'],
  ['Frostberry Tart', 12, 20, [['Frostberry', 3], ['Flour', 1], ['Sugar', 1]], 'sweet'],
  ['Fruit Salad', 12, 21, [['Strawberry', 1], ['Blueberry', 1], ['Cantaloupe', 1]], 'sweet'],
  ['Honey-Glazed Bacon', 12, 16, [['Pork', 1], ['Honey', 1]], 'meat'],
  ['Quiche', 12, 20, [['Flour', 1], ['Egg', 2], ['Cream', 1], ['Asparagus', 1]], 'breakfast'],
  ['Strawberry Tart', 12, 20, [['Strawberry', 3], ['Flour', 1], ['Butter', 1], ['Cream', 1]], 'sweet'],
  ['Honey Cake', 13, 22, [['Flour', 2], ['Honey', 1], ['Egg', 1]], 'sweet'],
  ['Shepherd\'s Pie', 13, 22, [['Mutton', 1], ['Potato', 2], ['Carrot', 1], ['Butter', 1]], 'meat'],
  ['Stuffed Mushrooms', 13, 22, [['Silvercap Mushroom', 2], ['Glowcap Mushroom', 1], ['Tomato', 1]], 'forage'],
  ['Beetroot Soup', 14, 23, [['Beetroot', 2], ['Onion', 1], ['Carrot', 1]], 'garden'],
  ['Cake', 14, 24, [['Flour', 2], ['Egg', 1], ['Milk', 1], ['Sugar', 1], ['Strawberry', 1]], 'sweet'],
  ['Fireheart Chili', 14, 23, [['Fireheart Pepper', 1], ['Beef', 1], ['Adzuki Bean', 1], ['Tomato', 1]], 'region'],
  ['Mutton Stew', 14, 23, [['Mutton', 1], ['Snow Turnip', 1], ['Carrot', 1], ['Onion', 1]], 'meat'],
  ['Casserole', 15, 26, [['Cauliflower', 1], ['Broccoli', 1], ['Potato', 2], ['Asparagus', 1]], 'garden'],
  ['Goat Curry', 15, 26, [['Goat Meat', 1], ['Rice', 2], ['Hot Pepper', 1], ['Onion', 1]], 'meat'],
  ['Pumpkin Soup', 15, 26, [['Pumpkin', 1], ['Onion', 1], ['Carrot', 1]], 'garden'],
  ['Ice Melon Sorbet', 16, 28, [['Ice Melon', 1], ['Sugar', 1], ['Cream', 1]], 'sweet'],
  ['Pork Roast', 16, 28, [['Pork', 1], ['Sweet Potato', 1], ['Cabbage', 1], ['Onion', 1]], 'meat'],
  ['Roast Dinner', 16, 28, [['Tiger Trout', 1], ['Potato', 2], ['Asparagus', 1], ['Beetroot', 1]], 'fish'],
  ['Beef Stew', 17, 29, [['Beef', 1], ['Potato', 2], ['Carrot', 1], ['Onion', 1]], 'meat'],
  ['Pumpkin Pie', 17, 29, [['Pumpkin', 2], ['Flour', 1], ['Butter', 1], ['Sugar', 1]], 'sweet'],
  ['Fruit Smoothie', 18, 30, [['Pineapple', 1], ['Strawberry', 1], ['Blueberry', 1]], 'sweet'],
  ['Hamburger', 18, 30, [['Beef', 1], ['Flour', 1], ['Cheese', 1], ['Tomato', 1]], 'meat'],
  ['Sweet Berry Cake', 18, 31, [['Strawberry', 1], ['Blueberry', 1], ['Blackberry', 1], ['Flour', 2], ['Egg', 1]], 'sweet'],
  ['Cheesecake', 19, 32, [['Cheese', 1], ['Cream', 1], ['Sugar', 1], ['Strawberry', 1], ['Flour', 1]], 'sweet'],
  ['Sashimi', 19, 32, [['Golden Fish', 1], ['Cucumber', 1]], 'fish'],
  ['Tropical Salad', 19, 33, [['Pineapple', 1], ['Watermelon', 1], ['Cantaloupe', 1], ['Grapes', 1]], 'sweet'],
  ['Grape Juice', 20, 33, [['Grapes', 3], ['Aloe', 1]], 'sweet'],
  ['Lasagne', 20, 33, [['Beef', 1], ['Flour', 2], ['Cheese', 1], ['Tomato', 2]], 'meat'],
  ['Maki Sushi', 20, 34, [['Rice', 2], ['Tiger Trout', 1], ['Cucumber', 1], ['Spring Onion', 1]], 'fish'],
  ['Cioppino', 21, 36, [['Tiger Trout', 1], ['Pike Fish', 1], ['Perch', 1], ['Tomato', 1], ['Onion', 1]], 'fish'],
  ['Sunday Roast', 21, 36, [['Chicken Meat', 1], ['Potato', 2], ['Carrot', 1], ['Butter', 1]], 'meat'],
  ['Mushroom Risotto', 22, 38, [['Rice', 2], ['Asparagus', 1], ['Silvercap Mushroom', 1], ['Glowcap Mushroom', 1]], 'forage'],
  ['Beef Wellington', 23, 39, [['Beef', 1], ['Flour', 1], ['Butter', 1], ['Silvercap Mushroom', 2]], 'meat'],
  ['Truffle Risotto', 23, 39, [['Rice', 2], ['Truffle', 1], ['Cheese', 1], ['Butter', 1]], 'forage'],
  ['Harvest Cake', 24, 39, [['Flour', 2], ['Pineapple', 1], ['Grapes', 1], ['Strawberry', 1], ['Honey', 1]], 'feast'],
  ['Golden Bisque', 25, 40, [['Golden Fish', 1], ['Pumpkin', 1], ['Asparagus', 1], ['Onion', 1]], 'feast'],
  ['The Harvest Feast', 25, 45, [['Beef', 1], ['Chicken Meat', 1], ['Pumpkin', 1], ['Grapes', 1], ['Flour', 1]], 'feast'],
  // the Founders' own (their letter: the Founding Farmers, Chapter 16), and the Emporium's: as it was
  ['Moonlight Stew', 1, 25, [['Ghost Catfish', 1], ['Star Fruit', 1], ['Silvercap Mushroom', 2]], 'feast'],
  // the Night Court's: two of its eels over the smokehouse fire (refinement 6; its region's economy is still to set)
  ['Smoked Eel', 1, 9, [['Marsh Eel', 2]], 'fish'],
];
/** What each dish was written to give (the book's), and the premium dishes' (the VIP Quarter's common premium crops: BUFFS
 *  below -- the three boosts a little energy, the Golden Pie a big fill). A dish HEALS by this (FOOD_HEALS). */
const BOOK_ENERGY = { ...Object.fromEntries(DISH_BOOK.map(([dish, , energy]) => [dish, energy])),
  'Sunfire Chili': 6, 'Sapphire Jam': 6, 'Diamond Tart': 6, 'Golden Pie': 50 };
/**
 * LESS ENERGY FROM FOOD (2026-10-23, the designer: "moonlight stew and other dishes from playtest still give the same
 * energy, which is way too much ... decrease ... a lot ... not only moonlight stew, but all the other ones as well ... to
 * get energy, players will have to work"): every dish gives FOOD_ENERGY_TIMES of the book's energy (more than half off,
 * never under 1); Moonlight Stew -- bought for Shards, no work at all -- MOONLIGHT_ENERGY (it was 25). The bed's rest is
 * the way to a full bar; food gives at most a bar a day besides (FOOD_BARS_A_DAY).
 */
export const FOOD_ENERGY_TIMES = 0.45, MOONLIGHT_ENERGY = 8;
/** FOOD's energy: every dish's (raw food gives nothing). The animal dishes no stove makes yet keep theirs. Filled in
 *  below the kitchen's staples and the animals (FOOD OVER ITS WORK), which a dish's work is reckoned from. */
export const FOOD = { raw: 0, dishes: {} };
/**
 * PREMIUM DISHES (the VIP Quarter, 2026-10-08; the designer: "I want people to care about common crops as well", and
 * the use chosen: "Premium dishes"): the four common premium crops -- Sunfire Pepper, Sapphire Blueberry, Diamond
 * Strawberry, Golden Pumpkin -- cooked at any Hearth into dishes that do something for a while, and never make money:
 *   Sunfire Chili  you walk faster          (pace: on foot, x this)
 *   Sapphire Jam   energy refills faster    (mult: what a dish gives, and the bed's rest, x this)
 *   Diamond Tart   more skill XP            (xp: every skill's experience, x this)
 *   Golden Pie     a big energy fill        (FOOD above: 50 energy at once)
 * A boost lasts `minutes` from when it is eaten; another eaten while it lasts adds its minutes on the end, up to
 * BUFF_MAX_MINUTES ahead. Kept in the save (save.buffs: { kind: until, server time }) -- the server's, as everything.
 * THE STRENGTHS ARE PROPOSALS (2026-10-08), the designer's to tune.
 *   AND FOR THE FIGHT (2026-10-28, the designer: the dungeon made hard so that players "are encouraged to grow premium
 * plants, to grow to make premium food, to consume before they get into dungeons", dishes "which give boost for maybe damage
 * boost, speed boost, health boost"): the Sunfire Chili's farmer strikes harder too (blows: x this), the Diamond Tart's takes
 * blows softer (guard: x this), and the Golden Pie gives more health while it lasts (maxHp, and fills it). Every boost has its
 * own clock, so all of them may be on at once; nothing is eaten below, so they are eaten before the stair. My numbers.
 */
export const BUFFS = {
  // (2026-10-28 again, the designer: the premium dishes "will give like 10% more boosts" than a dish of the book's -- whose
  //  best is 20%, MEAL_TIERS -- so 30%; and a quicker swing besides, "attack speed", the Chili's: as one Haste boon)
  swift: { dish: 'Sunfire Chili', minutes: 30, words: 'You walk 30% faster, strike 30% harder and swing 15% quicker', brief: 'Faster feet and swings, harder blows', pace: 1.3, blows: 1.3, rate: 1.15 },
  jam: { dish: 'Sapphire Jam', minutes: 30, words: 'Energy refills twice as fast', brief: 'Energy refills 2x', mult: 2 },
  tart: { dish: 'Diamond Tart', minutes: 30, words: '30% more skill XP, and blows hurt you 30% less', brief: 'More XP, blows hurt less', xp: 1.3, guard: 0.7 },
  hearty: { dish: 'Golden Pie', minutes: 30, words: '40 more health', brief: '40 more health', maxHp: 40 },
  // the regional crops, eaten raw (REGIONAL): Everbloom's for the forager, Frosthaven's against its cold
  bloom: { dish: 'Fairy Rose', minutes: 30, words: 'More Foraging XP', brief: 'Foraging XP +20%', skill: 'foraging', xp: 1.2 },
  warm: { dish: 'Fireheart Pepper', minutes: 30, words: 'The cold cannot slow you', brief: 'Warm through, the cold cannot slow you' },
};
export const BUFF_MAX_MINUTES = 120;
/** The boost a dish gives ('swift', 'jam', 'tart'), or null. */
export const buffOf = (dish) => Object.keys(BUFFS).find((k) => BUFFS[k].dish === dish) ?? null;
/** How long a boost has left (ms), 0 when it is not on. */
export const buffLeft = (save, kind, now = gameNow()) => Math.max(0, (save?.buffs?.[kind] ?? 0) - now);
export const buffOn = (save, kind, now = gameNow()) => buffLeft(save, kind, now) > 0;
/** A premium dish in a fight (BUFFS, 2026-10-28), the page's and the server's alike: what the farmer's blows are multiplied
 *  by (a Sunfire Chili's), what a blow they take is (a Diamond Tart's), and the health it adds (a Golden Pie's). */
export const dishMight = (save, now = gameNow()) => (buffOn(save, 'swift', now) ? BUFFS.swift.blows : 1);
export const dishGuard = (save, now = gameNow()) => (buffOn(save, 'tart', now) ? BUFFS.tart.guard : 1);
export const dishHealth = (save, now = gameNow()) => (buffOn(save, 'hearty', now) ? BUFFS.hearty.maxHp : 0);
/** ...and how much quicker a weapon swings (a Sunfire Chili's, 2026-10-28). */
export const dishRate = (save, now = gameNow()) => (buffOn(save, 'swift', now) ? BUFFS.swift.rate ?? 1 : 1);
/** Experience as a Diamond Tart has it: `n` more by its share while it lasts. */
// (and a skill's own boost on its own skill: a Fairy Rose's on Foraging)
export const xpWith = (save, n, now = gameNow(), skill = null) => {
  let k = buffOn(save, 'tart', now) ? BUFFS.tart.xp : 1;
  for (const [kind, b] of Object.entries(BUFFS)) if (b.skill && b.skill === skill && buffOn(save, kind, now)) k *= b.xp;
  k *= mealMult(save, 'xp', now, skill);                             // (a meal's boost: MEALS)
  return k === 1 ? n : Math.round(n * k);
};
/**
 * WHAT A DISH DOES (2026-10-22, the designer's approved dish book): every dish of the book gives a boost of its own, by the
 * KIND of dish it is (DISH_BOOK's fifth), as strong and as long as its Cooking level says (MEAL_TIERS). ONE OF EACH KIND AT
 * ONCE (2026-10-28, a player: their Fishing XP meal was "nullified" by a Baked Potato's Farming XP -- the designer: "different
 * XPs can coexist together"): a new meal takes the place of the one before of its own kind only (save.meals { [kind]:
 * { dish, k, until } }; an older save's one save.meal reads as one of them, mealsOn). The premium dishes keep their own
 * (BUFFS), on top. The regional dishes give their region's boost three times as long (REGION_DISHES).
 */
export const MEALS = {
  garden: { words: 'More Farming XP', skills: ['farming'] },
  fish: { words: 'More Fishing XP', skills: ['fishing'] },
  meat: { words: 'Harder blows, and blows taken softer', combat: true },
  breakfast: { words: 'More Woodcutting and Mining XP', skills: ['woodcutting', 'mining'] },
  forage: { words: 'More Foraging XP', skills: ['foraging'] },
  sweet: { words: 'You walk faster', pace: true },
  feast: { words: 'More XP in every skill', skills: 'all' },
};
export const MEAL_TIERS = [{ from: 1, k: 0.10, minutes: 20 }, { from: 10, k: 0.15, minutes: 30 }, { from: 20, k: 0.20, minutes: 45 }];
export const mealTier = (level = 1) => MEAL_TIERS.findLast((t) => (level ?? 1) >= t.from) ?? MEAL_TIERS[0];
/** A dish's meal boost: { kind, k, minutes, words } (none for a dish not of the book, or a regional one: REGION_DISHES). */
export function mealOf(dish) {
  const d = DISH_BOOK.find((x) => x[0] === dish), kind = d?.[4];
  if (!kind || !MEALS[kind]) return null;
  const t = mealTier(d[1]);
  return { kind, k: t.k, minutes: t.minutes, words: MEALS[kind].words };
}
/** The meals' boosts on now, one of each kind: [{ kind, dish, k, until }]. */
export function mealsOn(save, now = gameNow()) {
  const all = { ...(save?.meal?.kind ? { [save.meal.kind]: save.meal } : {}), ...(save?.meals ?? {}) };
  return Object.entries(all).filter(([kind, m]) => MEALS[kind] && m?.until > now).map(([kind, m]) => ({ ...m, kind }));
}
/** The meals' boost on now, for `what`: 'xp' (with the skill), 'pace' or 'combat' -- the multiplier (1: none). Of the meals
 *  that touch it the strongest counts (a feast and a fish dish do not add up for Fishing: the better of them does). */
export function mealMult(save, what, now = gameNow(), skill = null) {
  let best = 0;
  for (const m of mealsOn(save, now)) {
    const M = MEALS[m.kind];
    const on = what === 'xp' ? !!skill && (M.skills === 'all' || M.skills?.includes(skill)) : what === 'pace' ? !!M.pace : what === 'combat' ? !!M.combat : false;
    if (on) best = Math.max(best, m.k);
  }
  return 1 + best;
}
/** EVERY DISH BOOST ON NOW, the soonest over first (the boosts window, game/boostsui.js, and the HUD's chip): the premium
 *  and regional dishes' (BUFFS: save.buffs, the time each runs to) and the meals' (mealsOn) --
 *  [{ kind, dish, words, left (ms), full (ms, as long as it runs from new), k? }]. */
export function boostsOn(save, now = gameNow()) {
  const l = Object.entries(BUFFS).map(([kind, b]) => ({ kind, dish: b.dish, words: b.words, left: buffLeft(save, kind, now), full: (b.minutes ?? 30) * 60e3 }));
  for (const m of mealsOn(save, now)) l.push({ kind: `meal:${m.kind}`, dish: m.dish, words: MEALS[m.kind].words, left: m.until - now, k: m.k, full: (m.minutes ?? mealOf(m.dish)?.minutes ?? 20) * 60e3 });
  return l.filter((b) => b.left > 0).map((b) => ({ ...b, full: Math.max(b.full, b.left) })).sort((a, b) => a.left - b.left);
}
/** THE REGIONAL DISHES: their region's boost (BUFFS), three times as long as the crop eaten raw gives it. */
export const REGION_DISHES = { 'Fairy Rose Tea': 'bloom', 'Fireheart Chili': 'warm' };
// (EATING HAD A LIMIT from 2026-09-26 -- 60 energy from food in 12 real hours -- removed 2026-10-02 by the designer:
//  "we won't have any limit on how much food they can consume to replenish their energy". A dish's energy is its own.)
/** EATING'S ENERGY, A BAR A DAY (2026-10-21, the designer, after the playtest's 269,645 meals: food was energy without
 *  end, and energy without end was Gold and levels without end): food gives at most this many full bars of energy (the
 *  farmer's own bar, a Founder's bigger) in a real (UTC) day. Past it a dish still heals (FOOD_HEALS). */
export const FOOD_BARS_A_DAY = 1;
/** SELLING TO THE SHOPS (2026-10-21, the designer, after the playtest: the shops paid out 698 million Gold in 19 days,
 *  294 million of it for Grapes and 160 million for Pineapple -- "if the economy stays the same it's going to be
 *  destroyed very soon"): a farmer sells the shops at most `perItem` of any one thing, and `gold` Gold in all, in a real
 *  (UTC) day; the General Store's orders count as selling. The Marketplace and trades between players are not shops. */
// (TIGHTER, 2026-10-22, the designer: "a limit on ... how many items the player can sell to the shop, so the economy is much
//  more stable": 15 of any one thing, 60 things in all and 12,000 Gold a day; it was 25 of a thing and 20,000 Gold)
export const SELL_LIMITS = { perItem: 15, things: 60, gold: 12000 };
/** THE PLAYTEST'S THINGS ARE THE FARMER'S, LIKE ANY OTHER (2026-10-28, the designer: "the restriction on playtest items, that
 *  they cannot be sold or anything? Please remove all of those restrictions so players can do whatever they want to do with
 *  those items"): what came over from the playtest (save.carried, server/reset.js) no longer keeps anything from the shops
 *  or the orders (commands.js sellRoom, ui.js). The count is still kept, so this is undone by setting it false. */
export const PLAYTEST_ITEMS_FREE = true;
/** The real (UTC) day a moment falls in: the daily limits (selling, eating) start again at midnight UTC. */
export const realDay = (now) => Math.floor(now / 86_400_000);
/**
 * A DAY TO CELEBRATE (2026-10-28, the designer: the birthday of a friend of the game, SkumBuxet, on the 30th -- "fireworks
 * ... free energy refill for everyone ... 1000 FP for everyone"; and, for him, "like 100 AVYN reward"). On its day (UTC)
 * every game has fireworks outdoors and a line across the top now and then (play.js, game/fireworks.js), and a farmer who
 * comes in that day finds a gift in their Inbox to claim (server/world2.js #eventGifts, commands.js 'event.claim'): its
 * things and its FP -- and the farmer it is for (`avyn.for`, their name in the game) $AVYN besides, through the economy's
 * own door for it (src/economy/config.js AVYN_EVENTS: 100 in all, never more). Claimed once, whenever after.
 */
export const EVENTS = {
  bday_skumbuxet: {
    day: realDay(Date.UTC(2026, 9, 30)), items: [['Energy Refill', 1]], fp: 1000, avyn: { for: 'SkumBuxet', n: 100 },
    ticker: 'Happy birthday, SkumBuxet! Fireworks all day over Bloomshire, and a birthday gift for every farmer in the Inbox',
    title: 'Happy birthday, SkumBuxet!',
    text: 'It is SkumBuxet\'s birthday and the whole valley is celebrating. Here is an Energy Refill and 1,000 Farming Points for you. Press Claim to take them.',
    mine: 'The whole valley is celebrating you today. Your gift is an Energy Refill, 1,000 Farming Points and 100 $AVYN. Press Claim to take it.',
  },
};
/** The celebration on today (UTC): [id, event], or null. */
export const eventOn = (now = gameNow()) => Object.entries(EVENTS).find(([, e]) => e.day === realDay(now)) ?? null;
/** Is this farmer (their name in the game) the one an event's $AVYN is for? */
export const eventFor = (e, name) => !!e?.avyn?.for && String(name ?? '').trim().toLowerCase() === e.avyn.for.toLowerCase();

/**
 * THE FARM'S ANIMALS (2026-10-22, the designer: husbandry "open for everyone" from Farming 8, "a free chicken that gives an
 * egg every day"; each kind lives in its own small place at Hollin's Farm, where a farmer buys it and keeps it -- a zone
 * tagged pen:<kind> on the town map, game/animals.js draws a farmer's own there). An animal fed with the farmer's own
 * crops gives its product a game day (8 real hours) later; collected, it waits to be fed again: one a game day at most.
 * The designer's prices (Chicken 15,000 to Cow 150,000, its product a thirtieth of it); meat, from an animal kept a week,
 * about four fifths of what it cost; everything tradeable. Husbandry's own levels open the kinds one by one (TEMP).
 *   feed: [crops it eats (any of them), how many a feeding] -- the staples that grow all year, so no winter starves it
 */
export const ANIMALS = {
  chicken: { name: 'Chicken', many: 'chickens', place: 'the chicken coop', price: 15000, level: 1, product: 'Egg', feed: [['Wheat', 'Corn'], 1], meat: ['Chicken Meat', 2] },
  duck: { name: 'Duck', many: 'ducks', place: 'the duck pen', price: 25000, level: 2, product: 'Duck Egg', feed: [['Wheat', 'Corn'], 1], meat: ['Duck Meat', 2] },
  bee: { name: 'Beehive', many: 'beehives', place: 'the apiary', price: 30000, level: 3, product: 'Honey', feed: [['Marigold', 'Sunflower'], 1], meat: null },
  sheep: { name: 'Sheep', many: 'sheep', place: 'the sheep pen', price: 50000, level: 4, product: 'Wool', feed: [['Cabbage', 'Wheat'], 2], meat: ['Mutton', 4] },
  goat: { name: 'Goat', many: 'goats', place: 'the goat pen', price: 65000, level: 5, product: 'Goat Milk', feed: [['Cabbage', 'Wheat'], 3], meat: ['Goat Meat', 4] },
  pig: { name: 'Pig', many: 'pigs', place: 'the pig sty', price: 90000, level: 6, product: 'Truffle', feed: [['Potato', 'Wheat'], 4], meat: ['Pork', 4] },
  cow: { name: 'Cow', many: 'cows', place: 'the cow pasture', price: 150000, level: 7, product: 'Milk', feed: [['Wheat', 'Cabbage'], 5], meat: ['Beef', 6] },
};
/** The rules round them: Farming to begin, how many of a kind a farmer keeps, a feeding's energy, a game day to its
 *  product, a week before the butcher, and the free chicken. */
// (productMs: a Bloomshire day, WORLD_TIME.dayRealHours below)
// A WORKING LIFE (2026-10-22, the designer: "a limit of how many ... items like milk, eggs, how many an animal can give"):
// `life` products, then the animal is old -- it gives no more, and goes to the butcher or is let go (about 40 real days
// collected three times a day)
/**
 * A HOLDER'S PICKS (2026-10-23, the designer: "the mounts and pets they can select is only one ... Once they have selected
 * it, they cannot select any other", picked in a pop-up at sign-in, each seen first): one mount (five Founding Farmers, or a
 * Legendary's mount of choice), one pet (three, or an Epic's pet of choice: save.pet), and an Epic's or Legendary's one
 * weapon of the four Founders' weapon skins -- save.picks { v, mount, weapon }. A save of another `v` is cleared of them
 * once (server/world2.js #perks): the testers' earlier picks gave way to the pop-up.
 */
export const PICKS = { v: 1, mounts: ['horse', 'bicycle', 'bear', 'broom'], weapons: ['blade', 'axe', 'bow', 'staff'] };
export const MOUNT_NAMES = { horse: 'horse', bicycle: 'bicycle', bear: 'bear', broom: 'broomstick' };
export const WEAPON_NAMES = { blade: 'Spring Blade', axe: 'Summer Axe', bow: 'Autumn Bow', staff: 'Winter Staff' };
/**
 * A MOUNT'S STAMINA (2026-10-23, the designer: "every animal should have an energy ... a maximum energy for a mount.
 * Obviously, it shouldn't be very low, but it shouldn't be way too high", fed to fill it again, and a bear's "consumed a
 * lot faster" when it fights): a bar of `max`; riding uses one every `rideS` seconds on the move, a bear's blow given or
 * taken `fight`. Empty, the rider gets down and it waits to be fed: the horse Carrot or Wheat, or Hay from the mill; the
 * bear Honey or any meat; the bicycle a Repair Kit from the Forge; the broomstick a Broom Charm from the Apothecary.
 * The numbers are TEMP (the economy pass).
 */
export const MOUNT_STAMINA = { max: 100, rideS: 15, fight: 4,
  food: { horse: { Carrot: 10, Wheat: 10, Hay: 40 }, bear: { Honey: 25, meat: 25 }, bicycle: { 'Repair Kit': 50 }, broom: { 'Broom Charm': 50 } } };
/**
 * THROWN IN THE SADDLE (2026-10-28, the designer: "when the player is on their mount, when they are passing through enemies,
 * if the enemy hits them on the mount, the player will immediately get off from the mount and the mount will run away ...
 * unless it's a bear. So the player will have to fight the enemies or run away"): a creature's blow, or a trap's, lands on a
 * rider -- off at once, and the mount runs off, back in `backS` seconds (save.mountBack, commands.js mount.bolt). The bear
 * stands and fights, as it always has.
 */
export const MOUNT_BOLT = { backS: 25 };
/**
 * THE BEAR'S FISH (2026-10-27, the designer: "not every fish will generate the same energy. Some fish will only generate like
 * 3 to 4 energy, or maybe less than that ... salmon ... difficult to get. And maybe it requires a higher fishing level, and
 * feeding salmon to the bear gives the most energy ... like 20-25. Or maybe 30"): the river's everyday catch 2 to 5, the
 * night's and the river's specials a little more, a rare fish (FISH_LADDER) by its Fishing level up to 18, a fish nobody
 * named here 3 -- and the Salmon, from Fishing 20 now, 30.
 */
export const BEAR_FISH = { Sunfish: 2, Carp: 3, Chub: 3, Perch: 3, 'Pike Fish': 4, 'Tiger Trout': 5, 'Ghost Catfish': 8, 'Marsh Eel': 8, 'Golden Fish': 10, Salmon: 30 };
export const bearFish = (id) => {
  if (Object.hasOwn(BEAR_FISH, id)) return BEAR_FISH[id];
  const f = FISH_LADDER.find((q) => q.name === id);
  return f ? Math.min(18, 4 + Math.floor(f.level / 2)) : 3;
};
/** What an item gives a mount of this kind, or 0 (`cat`: its catalogue kind -- a bear eats any meat, and any fish: 2026-10-26,
 *  players: "add a FISH to Bear's Diet"; each fish its own: BEAR_FISH). */
export const mountFood = (kind, id, cat) => MOUNT_STAMINA.food[kind]?.[id]
  ?? (kind === 'bear' && cat === 'fish' ? bearFish(id) : cat === 'meat' || cat === 'fish' ? MOUNT_STAMINA.food[kind]?.[cat] ?? 0 : 0);
/** A save's mount stamina now (one never ridden is full). */
/** THE MOUNTS A FARMER HAS (2026-10-28, the designer: a player "bought two rides, one bear and one broomstick, but the
 *  broomstick didn't show up on their ride wheel"): a holder's own pick (PICKS, while their farmers still give a mount), and
 *  every kind of mount they bought a look of in the Emporium (save.owned m:<kind>:<skin>, catalog.js EMPORIUM_GOODS) -- a
 *  mount bought is a mount ridden, with the look bought. One stamina for them all (staminaOf). */
export const mountsOwned = (save) => {
  const out = new Set(), k = save?.perks;
  if (save?.picks?.mount && (k?.mounts || k?.mountChoice)) out.add(save.picks.mount);
  for (const id of Object.keys(save?.owned ?? {})) { const m = /^m:([a-z]+):/.exec(id); if (m && Object.hasOwn(MOUNT_NAMES, m[1])) out.add(m[1]); }
  return out;
};
/** A MOUNT'S OWN STAMINA (2026-10-28, players: "if they have multiple mounts ... the energy is tied for both of them ... if
 *  they feed the one ... the other's energy also restores" -- one bar for them all since mounts could be bought, the same
 *  day): each kind its own, save.staminas[kind]; the one bar kept before is the picked mount's. `kind`: else the pick. */
export const staminaOf = (save, kind = null) => {
  const k = kind ?? save?.picks?.mount ?? null;
  const own = k != null && Object.hasOwn(save?.staminas ?? {}, k) ? save.staminas[k] : undefined;
  const before = k != null && k === save?.picks?.mount ? save?.stamina : undefined;
  return Math.max(0, Math.min(MOUNT_STAMINA.max, own ?? before ?? MOUNT_STAMINA.max));
};
/** Set one mount's stamina (0 to MOUNT_STAMINA.max). */
export const setStamina = (save, kind, v) => { (save.staminas ??= {})[kind] = Math.max(0, Math.min(MOUNT_STAMINA.max, v)); };
/**
 * A PET'S ENERGY (2026-10-23, the designer: "we also need to make some kind of energy for pet ... we don't want the pet to
 * be used infinitely. There should be an energy and use case to feed them"): a bar of `max`; out on an adventure (where it
 * finds things: pet.js petWild) it uses one every `wildS` seconds, and a find costs `find`. Worn out, it goes home -- it
 * follows, lights and finds nothing, and carries no bag -- until fed: a crop, a fish or meat (`food`, by the catalogue's
 * kind), from E beside it or the Ride & pets wheel. The numbers are TEMP (the economy pass).
 */
export const PET_ENERGY = { max: 100, wildS: 30, find: 5, food: { crop: 10, fish: 15, meat: 30 } };
/**
 * NAMES FOR A PET AND A MOUNT (2026-10-23, a player: "can we personalize pet and mount names and make them visible for
 * everyone? I wanna name my bear WINNIE and Dog to Scooby"): the save's `names` { pet, mount }, shown over the pet and
 * at the mount's feet to everyone in view. Letters and numbers, spaces and ' . - between, up to NAME_MAX; never one of
 * the words the chat stars out.
 */
export const NAME_MAX = 14;
// (the chat's own list -- server/live2.js FILTER_START -- and two more; a word where a word begins, as the chat stars them:
//  "Peacock" is a fine name)
const NAME_RUDE = ['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'bastard', 'dickhead', 'motherfucker', 'bullshit', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard', 'nazi', 'hitler'];
const NAME_RUDE_RX = new RegExp(`(?<![\\p{L}\\p{N}])(?:${NAME_RUDE.join('|')})`, 'iu');
/** Why a pet's or mount's name won't do, or null. */
export function nameWhy(name) {
  const n = String(name ?? '');
  if (!n || [...n].length > NAME_MAX) return `A name of 1 to ${NAME_MAX} letters, please`;
  if (!/^[\p{L}\p{N}](?:[\p{L}\p{N} '.-]*[\p{L}\p{N}.])?$/u.test(n)) return 'Letters and numbers, please';
  if (NAME_RUDE_RX.test(n)) return 'Not that name';
  return null;
}
/**
 * THE FARMER'S GENDER, CHOSEN ONCE (2026-10-23, the designer: "players only choose their gender once ... when creating
 * their account ... If they have NFT which conflicts with their chosen gender, that NFT appearance should change to their
 * chosen gender"): the save's `gender`, 'male' or 'female' -- the eyes follow it (the pack's Female eyes carry the lashes:
 * hearts.js sexOf), and a Founding Farmer played as is drawn so (server/founders.js genderOf, founding.js genderLook).
 */
export const GENDERS = ['male', 'female'];
/** The eyes `eyes` (villager.js LOOK_OPTIONS: Male/Brown...) in the same colour, for `gender`. */
export const genderEyes = (eyes, gender) => `${gender === 'female' ? 'Female' : 'Male'}/${String(eyes ?? '').split('/')[1] || 'Brown'}`;
/** A pet's energy now (one from before the bar is full). */
export const petEnergyOf = (pet) => Math.max(0, Math.min(PET_ENERGY.max, pet?.energy ?? PET_ENERGY.max));
export const HUSBANDRY = { farmingLevel: 8, perKind: 4, feedEnergy: 1, productMs: 8 * 3600e3, butcherDays: 7, free: 'chicken', life: 120 };
/** How many more products an animal will give in its life. */
export const animalLeft = (a) => Math.max(0, HUSBANDRY.life - (a?.given ?? 0));
/** An animal's state at `now`: 'hungry' (to be fed), 'growing' (fed, its product coming: `left` ms), 'ready', or 'old'
 *  (its life's products given: HUSBANDRY.life). */
export function animalState(a, now) {
  if (!a?.fed) return animalLeft(a) > 0 ? { state: 'hungry', left: 0 } : { state: 'old', left: 0 };
  const left = a.fed + HUSBANDRY.productMs - now;
  return left > 0 ? { state: 'growing', left } : { state: 'ready', left: 0 };
}
/** The energy eating something gives: a cooked dish its value, anything raw nothing. */
export const foodEnergy = (name) => FOOD.dishes[name] ?? FOOD.raw;
/** COOKED FOOD HEALS TOO (the designer, 2026-09-30, with the tougher enemies: "food heals too") -- this much health
 *  for each point of the dish's energy, whether or not the energy bar had room; the bed still heals it all. */
export const FOOD_HEALS = 2;
export const foodHealth = (name) => (BOOK_ENERGY[name] ?? FOOD.raw) * FOOD_HEALS;
/** A dish's energy as the book has it -- what Cooking's experience is reckoned by (LESS ENERGY FROM FOOD cut only the eating). */
export const bookEnergy = (name) => BOOK_ENERGY[name] ?? FOOD.raw;     // (healing as the book has it: LESS ENERGY FROM FOOD cut only the energy)

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
/** COMBAT WEAPONS are permanent -- they never break -- and grow by RARITY: a `bonus` to the farmer's strength (COMBAT;
 *  2026-10-23, the designer: "As for your recommendation on combat, I agree with that"). `damage`, a multiple of the blow,
 *  was the rule from 2026-09-30 to then. */
export const WEAPON_RARITY = {
  common: { name: 'Common', damage: 1, bonus: 0 },
  uncommon: { name: 'Uncommon', damage: 1.3, bonus: 1 },
  rare: { name: 'Rare', damage: 1.6, bonus: 3 },
  epic: { name: 'Epic', damage: 2, bonus: 5 },
  legendary: { name: 'Legendary', damage: 2.6, bonus: 8 },
};
/**
 * COMBAT BY LEVEL (2026-10-23, the designer's numbers as I proposed them: "the normal strength of the player is going to be
 * 5 ... leveling up will also give maybe one strength ... at max combat level, the player will have 150 health ... optimize
 * it in a way that it doesn't make the player way overpowered"): a farmer's blow is their STRENGTH -- 5, one more every
 * `strengthEvery` Combat levels (19 at Combat 30) -- and their weapon's rarity bonus (WEAPON_RARITY); an EXCLUSIVE weapon
 * (bought for real money: its knock) adds 12 to a normal blow and 25 to a heavy one instead. An arrow is two thirds of
 * that and a staff's bolt four thirds, as the bow's 2 and the bolt's 4 were to the sword's 3. Health 100, growing to 150 at
 * Combat 30.
 */
export const COMBAT = { strength: 5, strengthEvery: 2, health: 100, healthTop: 150, topLevel: 30, exclusive: { normal: 12, heavy: 25 } };
/** THE HEAVY ATTACKS (2026-10-26, the designer: an exclusive weapon's "area of effect attack ... a cooldown of some seconds.
 *  Like 5 to 10 seconds before they can do it again ... visible to the players"). game/heavy.js draws them (the Weapon
 *  Studio's own), commands.js heavy and heavy.hit weigh them. One wait for them all (cooldown: s, by the weapon last used).
 *    power  each hit, a share of the weapon's heavy blow (blowMult heavy): the slash once a creature; the spinning axe each
 *           quarter second it turns in one; each arrow of the rain; each of the magic circle's three eruptions
 *    hits   the most hits one heavy attack may land, all told;  lastS  how long after it begins they may land
 *    reach  how far off the aimed ones (bow, staff) may be set down, px
 *    burn   fire's bite: every `every` s while it burns, `share` of the hit over the burn (credited with the hit)
 *    status the element's mark on a creature: [kind, s] -- fire burns, ice freezes, nature binds, shadow weakens
 *    weak   a weakened creature's blows, and its pace */
export const HEAVY = {
  cooldown: { sword: 6, axe: 7, bow: 8, magic: 8 },
  power: { sword: 1, axe: 0.5, bow: 0.5, magic: 0.45 },
  hits: { sword: 8, axe: 16, bow: 16, magic: 18 },
  lastS: { sword: 1.2, axe: 2, bow: 2.6, magic: 2.6 },
  reach: { bow: 150, magic: 140 },
  burn: { every: 0.5, share: 0.35 },
  status: { fire: ['burn', 3.5], ice: ['freeze', 1.5], nature: ['root', 2], shadow: ['weaken', 3] },
  weak: { blow: 0.6, pace: 0.6 },
};
/** THE DASH (2026-10-26, the designer: "players can dash in dungeons ... a very small bar of dash energy ... in the full
 *  dash energy bar, player can dash two times. Max. And then they'll have to wait before that energy fills up"): in the
 *  dungeon only (Shift there; a button on a phone) -- EVERYWHERE since 2026-10-28 (the designer: "the dash needs to work ... in
 *  all of the game ... while fighting, if the player is fighting or not"), on foot. charges: dashes in a full bar; refillS: each one's time to come back;
 *  px, s: how far it darts and how quickly; grace: no blow nor trap lands on the farmer while it lasts. */
export const DASH = { charges: 2, refillS: 2.5, px: 46, s: 0.18, grace: 0.24 };
export const dashHere = (where) => !!where;                                           // (anywhere at all: on foot, Play dash)
export const dungeonDash = (where) => /^dungeon_\d+[a-z]$/.test(String(where ?? ''));   // (the dungeon's levels: its bar always shown)
let combatLevelOf = () => 1;
/** How a save's Combat level is read (catalog.js sets it: its experience curve). */
export function useCombatLevel(fn) { combatLevelOf = fn ?? (() => 1); }
export const combatLevel = (save) => combatLevelOf(save) ?? 1;
export const strengthAt = (L) => COMBAT.strength + Math.floor((Math.max(1, L) - 1) / COMBAT.strengthEvery);
export const healthAt = (L) => COMBAT.health + Math.round(((COMBAT.healthTop - COMBAT.health) * (Math.min(COMBAT.topLevel, Math.max(1, L)) - 1)) / (COMBAT.topLevel - 1));
/** A blow as a multiple of the sword's 3 (and so of the arrow's 2 and the bolt's 4: combat.js lands those): the farmer's
 *  strength and the weapon's bonus, over 3. */
export const blowMult = (L, rarity = 'common', exclusive = false, heavy = false) =>
  (strengthAt(L) + (exclusive ? COMBAT.exclusive[heavy ? 'heavy' : 'normal'] : WEAPON_RARITY[rarity]?.bonus ?? 0)) / 3;

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
 *  three nights in every real day. 28 days a season (9 real days and 8 hours). Day 1 of Spring begins at the epoch
 *  (server time), at dawn: SEASON 0 OPENS ON THE MORNING OF SPRING 1 (2026-10-22, the designer chose it: the story
 *  starts in spring, and the first five weeks are a whole year). It was 2026-09-25 19:40 for the playtest. */
export const WORLD_TIME = {
  dayRealHours: 8,
  daylight: { from: 5, to: 21, realHours: 6 },
  daysPerSeason: 28,
  seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
  epoch: Date.UTC(2026, 9, 23, 14, 0, 0),
};
/** THE SEASON at server time t, for the fields' rules (the admin's sky shift is the sky's, not the farm's), and when it
 *  began. BEFORE THE EPOCH IT IS ALREADY SPRING (2026-10-22, the testers' head start the day before Season 0: what they sow
 *  is Spring's, and nothing withers at the launch; it was the last Winter). */
export const SEASON_MS = WORLD_TIME.dayRealHours * 3600e3 * WORLD_TIME.daysPerSeason;
const seasonNo = (t) => Math.max(0, Math.floor((t - WORLD_TIME.epoch) / SEASON_MS));
export const seasonAt = (t = gameNow()) => WORLD_TIME.seasons[((seasonNo(t) % 4) + 4) % 4];
export const seasonStartAt = (t = gameNow()) => WORLD_TIME.epoch + seasonNo(t) * SEASON_MS;
/** May this seed go in the ground at t? (`seasons` null: any season -- the staples, the premium and regional crops) */
export const inSeason = (seed, t = gameNow()) => !seed?.seasons || seed.seasons.includes(seasonAt(t));
/** "Summer", "Spring or Fall": the seasons a seed is sown in, in words. */
export const seasonWords = (seed) => (seed?.seasons ?? []).join(' or ');

/**
 * THE SEASONS' CROPS (2026-10-22, the designer: seasonal crops, from the New Main pack's own Spring, Summer and Fall
 * folders; four winter crops made in frost colours). A seed is sown only in its season; the Seed & Tool shop sells only
 * this season's. At the turn of the season a crop still growing withers; one ripe waits (WITHER). The staples grow all
 * year, so a new farmer always has something to plant -- the five proposed, and Cabbage and Marigold, which Book One asks
 * for (bk10, Ivy's and Lena's errands: a story never waits a season). Premium and regional crops keep no season.
 */
export const CROP_SEASONS = {
  all: ['Carrot', 'Parsnip', 'Spring Onion', 'Wheat', 'Potato', 'Cabbage', 'Marigold'],
  Spring: ['Onion', 'Rice', 'Broccoli', 'Strawberry', 'Cauliflower', 'Blueberry', 'Asparagus'],
  Summer: ['Sunflower', 'Tomato', 'Cucumber', 'Green Beans', 'Adzuki Bean', 'Blackberry', 'Hot Pepper', 'Green Bell Pepper',
    'Red Bell Pepper', 'Yellow Bell Pepper', 'Cantaloupe', 'Watermelon', 'Pineapple', 'Star Fruit'],
  Fall: ['Corn', 'Eggplant', 'Sweet Potato', 'Beetroot', 'Pumpkin', 'Aloe', 'Grapes', 'Saffron'],
  Winter: ['Winter Kale', 'Snow Turnip', 'Frostberry', 'Ice Melon'],
};
// (the rare crops, Farming 18 to 30: a season each -- SEEDS 50-56)
CROP_SEASONS.Spring.push('Purple Cauliflower', 'Golden Beet');
CROP_SEASONS.Summer.push('Honeydew Melon', 'Black Tomato', 'Dragon Fruit');
CROP_SEASONS.Fall.push('Blue Corn');
CROP_SEASONS.Winter.push('Snow Pea');
/** A CROP LEFT TOO LONG WITHERS (2026-10-22, the designer: "if a player doesn't harvest their crop ... after 5 hours of
 *  it has been fully matured, the crop will be withered"), and so does one still growing when its season ends
 *  (farm.js growth). A withered crop gives nothing: the hoe or the sickle clears it. A premium crop, paid for in coin,
 *  never withers. */
export const WITHER = { afterRipeHours: 5 };
/** A CROP THAT GROWS AGAIN (2026-10-22, the designer: they are "a free gold making harvest"): below this Farming level it
 *  is harvested once, as any crop; from it, five times (REGROW_HARVESTS). */
export const REGROW_FROM_LEVEL = 15;
/** THE DEATH BAG (the designer, 2026-10-17: a farmer beaten where something can hurt them drops a bag where they fell
 *  with every thing in their hotbar; only they may see and take it for a while -- "2 hours" proposed -- then anyone
 *  on the server, "finders keepers"; its art 2026-10-22: design/deathbag). What cannot be traded (a Frost tool, a
 *  quest's thing) stays with its farmer. `lastsDays`: a bag nobody takes is gone after it (TEMP, mine); `near`: how
 *  close (px) a farmer stands to take it. Kept by the server's world (server/world2.js), never a page. */
export const DEATH_BAG = { privateHours: 2, lastsDays: 3, near: 24 };
/** A BOSS'S LOOT CHEST (2026-10-28, the designer: "when the player kills a boss, it will drop a loot box ... a loot chest.
 *  So players will have to open that chest to claim the reward ... If the players don't claim the loot chest in 2 hours,
 *  some other players can come and ... collect that chest for themselves"): a boss's prize lies where it fell, the
 *  winner's alone for `privateHours`, then anyone's who finds it -- the server's to keep (server/world2.js #chestsOf),
 *  opened with commands.js 'chest.open'. `lastsDays`: one nobody opens is gone after it (as a death bag); `near`: how close
 *  (px) a farmer stands to open it; `reach`: how far from where the server knew the farmer stood the page may say the boss
 *  fell. `art`: the pack's chest sheet, its navy and gold chest (shut, then open below). */
export const BOSS_CHEST = { privateHours: 2, lastsDays: 3, near: 30, reach: 240, art: { file: 'Objects/Exterior/chest.png', sx: 104, sy: 0, openSy: 16 } };

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
/** A BETTER AXE FELLS SOONER (2026-10-28, a player: "difference between Amethyst axe and Bronze axe is none at all ... both
 *  take four hits ... and four energy"; the designer: the Amethyst two, the Gold three): the blows a tree takes by the axe's
 *  tier (TOOL_TIERS: 1 Iron, 2 Bronze, 3 Gold, 4 Amethyst -- and the Emporium's axes, tier 4), one energy each. */
export const AXE_HITS = { 1: 4, 2: 4, 3: 3, 4: 2 };
export const treeHits = (tier = 1) => AXE_HITS[Math.max(1, Math.min(4, Math.floor(+tier || 1)))] ?? TREE_HITS;
export const REGROW_SECONDS = 600;              // a broken rock is back after this long
/** A FELLED TREE GROWS BACK IN SIX HOURS (2026-10-28, the designer: "those trees grow up after ... 6 hours ... we have the
 *  tree growth phases ... add those phases"): a stump, then the ground cleared and a seed in it, a sprout, a young tree,
 *  and the tree again (game/nodes.js draw). And only the Woodlot's trees are cut at all: nodes.js index, a zone tagged
 *  woodlot -- the town's, by Pell's workshop (design/town/woodlot.py). */
export const TREE_REGROW_S = 6 * 3600;
export const ARROW = { speed: 260, range: 170, damage: 2 };       // (faster in flight, 2026-10-26: the bow quicker all round)
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
/** A PREMIUM crop (the VIP Quarter's: design/vip-small/premium/game_art.py): VIP Assets/Crops/Premium Crops.png, a
 *  16 x 32 row each -- three growing stages the SAME for all (a mystery until it ripens), then its own ripe plant;
 *  its harvest and the premium seed's bag on Premium Items.png. */
const PRC = (name, row) => ({
  name, pack: 'VIP', sheet: 'vip/Crops/Premium Crops.png', tall: true, premium: true, mystery: row === 0,
  stages: [0, 1, 2, 3].map((c) => [c * 16, row * 32, 16, 32]),
  item: at('vip/Crops/Premium Items.png', row, 0), bag: at('vip/Crops/Premium Items.png', 0, 0),
});
/** A WINTER crop (2026-10-22): a New Main crop in frost colours (design/crops/make_winter_crops.py), a 32 px row each on
 *  art:winter-crops.png -- its source file's cells where they were (seeds, stages, harvest at `harvest`), foot down; its
 *  bag, the source crop's own recoloured, at column 10. */
const WINTER_ART = 'art:winter-crops.png';
const WNC = (name, row, stages, harvest, tall = false) => ({
  name, pack: 'New Main', sheet: WINTER_ART, tall,
  stages: stages.map((c) => [c * 16, row * 32 + (tall ? 0 : 16), 16, tall ? 32 : 16]),
  item: { file: WINTER_ART, sx: harvest * 16, sy: row * 32 + 16 }, bag: { file: WINTER_ART, sx: 160, sy: row * 32 + 16 },
});

/** A REGIONAL crop (2026-10-22): a New Main crop in its region's colours (design/crops/make_region_crops.py), a 32 px row
 *  each on art:region-crops.png laid out as the winter crops' (WNC). */
const REGION_ART = 'art:region-crops.png';
const RGC = (name, row, stages, harvest, tall = false) => ({ ...WNC(name, row, stages, harvest, tall), sheet: REGION_ART,
  item: { file: REGION_ART, sx: harvest * 16, sy: row * 32 + 16 }, bag: { file: REGION_ART, sx: 160, sy: row * 32 + 16 } });

/** A RARE crop (2026-10-26): a New Main crop recoloured (design/crops/make_rare_crops.py), a 32 px row each on
 *  art:rare-crops.png laid out as the winter crops' (WNC), its bag gold. `rare`: priced above its growing time (RARE_CROPS). */
const RARE_ART = 'art:rare-crops.png';
const RRC = (name, row, stages, harvest, tall = false) => ({ ...WNC(name, row, stages, harvest, tall), sheet: RARE_ART, rare: true,
  item: { file: RARE_ART, sx: harvest * 16, sy: row * 32 + 16 }, bag: { file: RARE_ART, sx: 160, sy: row * 32 + 16 } });

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
  // 36-43: THE PREMIUM SEED and the seven crops it grows into (the VIP Quarter, 2026-10-08: PREMIUM below)
  ...['Premium Seed', 'Sunfire Pepper', 'Diamond Strawberry', 'Sapphire Blueberry', 'Golden Pumpkin', 'Crystal Grapes', 'Starbloom', 'Celestial Pineapple']
    .map((name, row) => PRC(name, row)),
  // 44-47: THE WINTER CROPS (2026-10-22: CROP_SEASONS)
  WNC('Winter Kale', 0, span(1, 4), 7), WNC('Snow Turnip', 1, span(1, 4), 7), WNC('Frostberry', 2, span(1, 5), 7, true),
  WNC('Ice Melon', 3, span(1, 5), 9),
  // 48-49: THE REGIONAL CROPS (2026-10-22), each grown only in its region's seed bed (`soil`: OWN_SOIL)
  { ...RGC('Fireheart Pepper', 0, span(1, 6), 9), soil: 'frost' },
  { ...RGC('Fairy Rose', 1, span(1, 5), 9, true), soil: 'bloom' },
  // 50-56: THE RARE CROPS (2026-10-26, the designer: Farming to 30 still opening crops, "very rare ... difficult to get,
  // and they also sell for more"): Farming 18 to 30, one season each, long to grow, dear seeds (RARE_CROPS)
  RRC('Honeydew Melon', 6, span(1, 5), 9),
  RRC('Purple Cauliflower', 0, span(1, 5), 7), RRC('Snow Pea', 1, span(1, 6), 9, true), RRC('Golden Beet', 2, span(1, 5), 7),
  RRC('Black Tomato', 3, span(1, 6), 9), RRC('Blue Corn', 4, span(1, 7), 9, true), RRC('Dragon Fruit', 5, span(1, 5), 8, true),
];
/** THE RARE CROPS' PRICES: their worth half again what their growing time gives, and their seeds 60% of it, not half. */
export const RARE_CROPS = { worth: 1.5, seed: 0.6 };

/** CROP GROWTH, in REAL minutes from the first watering to ripe (GAMEPLAY_BALANCE_AUDIT.md, approved
 *  2026-09-24). A crop with a `regrow` stays after its harvest and grows again in that time -- FIVE HARVESTS in all
 *  (the designer, 2026-10-04, after a morning of "every crop is only one time only" and a player's word that the
 *  crops that stay are a free farmer's steady living: "these crops will only give you five times ... at the fifth
 *  time you are harvesting, each crop will vanish"); every other crop is harvested once. From 2026-10-22 a crop grows
 *  again only for a farmer at Farming REGROW_FROM_LEVEL, so its seed costs as any seed (it was two and a half times
 *  dearer: below 15 one harvest would have lost money). The shovel takes any crop out at any time. */
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
  // the premium ones: every one 15 minutes (the designer, 2026-10-23: "it needs to be 15 minutes, not 3 hours"; it was
  // 3 hours from 2026-10-08), harvested once
  'Premium Seed': { grow: 15 }, 'Sunfire Pepper': { grow: 15 }, 'Diamond Strawberry': { grow: 15 }, 'Sapphire Blueberry': { grow: 15 },
  'Golden Pumpkin': { grow: 15 }, 'Crystal Grapes': { grow: 15 }, Starbloom: { grow: 15 }, 'Celestial Pineapple': { grow: 15 },
  // the winter ones (2026-10-22), each its worth beside the crops of its Farming level
  'Winter Kale': { grow: 20 }, 'Snow Turnip': { grow: 45 }, Frostberry: { grow: 90, regrow: 60 }, 'Ice Melon': { grow: 150 },
  // the regional ones (2026-10-22): a third above a crop of their Farming level, which their bed and their seeds pay for
  'Fairy Rose': { grow: 110 }, 'Fireheart Pepper': { grow: 180 },
  // the rare ones (2026-10-26), Farming 18 to 30: four and a half hours to eight, harvested once
  'Honeydew Melon': { grow: 270 }, 'Purple Cauliflower': { grow: 300 }, 'Snow Pea': { grow: 330 }, 'Golden Beet': { grow: 360 },
  'Black Tomato': { grow: 390 }, 'Blue Corn': { grow: 420 }, 'Dragon Fruit': { grow: 480 },
};

/**
 * THE PREMIUM SEED (the VIP Quarter; the designer, 2026-10-08): ONE seed, bought with crypto -- 15 for a dollar, more in
 * the bigger bundles -- that grows in the premium beds (zones tagged farm + premium, already tilled) into one of seven
 * crops. Which one is the SERVER's roll when it is sown (world2.js: from its secret, never the page's), at these odds;
 * the three rarest have a fixed number that can ever be grown (`cap`: once reached, a roll for it falls to the next
 * one down) and MINE: placed in the Celestial Garden they share the day's $AVYN pool by `weight` (built later). The
 * plant is a mystery until it ripens. Seeds and crops can be traded; no shop buys them. `aura`: farm.js's particles.
 */
/**
 * THE VIP PASS (the designer, 2026-10-08: "$7 a month to get VIP access ... a golden boat ... only those who have a VIP
 * pass will be able to use that boat"; since 2026-10-17 "$10 a week or $25 a month": catalog.js VIP_PASS_OFFERS sells
 * them): bought with USDG or ETH (server/premium.js), each payment its days more. A farmer is VIP while save.vipUntil
 * (server time, ms) is still ahead; it opens the golden boat (a door locked lock:vip), the twenty-slot hotbar, and wakes
 * the Frost tools (inventory.js TOOLS vip).
 */
export const VIP_PASS = { usd: 25, days: 30, week: { usd: 10, days: 7 } };
// (a holder of ten Founding Farmers, or of a Mythic, is VIP from Season 0's opening for a month or two: save.perks, the
//  server's -- server/founders.js PERKS)
export const isVip = (save, now = gameNow()) => Math.max(save?.vipUntil ?? 0, save?.perks?.vipUntil ?? 0) > now;
/** When this farmer's VIP ends (server time, ms): 0 for one who never had it. */
export const vipEnd = (save) => Math.max(save?.vipUntil ?? 0, save?.perks?.vipUntil ?? 0);
/** THE VIP PASS'S PERKS (the designer, 2026-10-23), beside the golden boat, the twenty slots and the Frost tools: the
 *  Founding Farmers' energy -- their bar and their quicker rest, never more for having both (Energy.setFounding) -- 30
 *  Premium Seeds with the first pass, 10% off in the Emporium, a gold name, cooking a quarter faster, and a quarter more
 *  Gold a day from the shops. */
export const VIP_PERKS = { firstSeeds: 30, emporiumOff: 10, cookFaster: 0.25, sellGold: 1.25, nameColour: '#ffcf4a' };
/** The Gold the shops pay this farmer in a day (SELL_LIMITS.gold; a VIP's a quarter more). */
export const goldCap = (save, now = gameNow()) => Math.round(SELL_LIMITS.gold * (isVip(save, now) ? VIP_PERKS.sellGold : 1));
/** What a Frost tool says when its farmer's pass has run out (the designer: kept, but asleep until renewed). */
export const VIP_ASLEEP = 'Your Frost tools wake again when you renew your VIP pass';

export const PREMIUM = {
  seed: 'Premium Seed',
  crops: {
    'Sunfire Pepper': { tier: 'Premium', odds: 0.32, aura: 'embers' },
    'Diamond Strawberry': { tier: 'Premium', odds: 0.28, aura: 'diamonds' },
    'Sapphire Blueberry': { tier: 'Premium', odds: 0.24, aura: 'motes' },
    'Golden Pumpkin': { tier: 'Premium', odds: 0.1538, aura: 'dust' },
    'Crystal Grapes': { tier: 'Rare', odds: 0.005, cap: 2000, weight: 1, aura: 'prism' },
    Starbloom: { tier: 'Rare', odds: 0.001, cap: 500, weight: 3, aura: 'stars' },
    'Celestial Pineapple': { tier: 'Legendary', odds: 0.0002, cap: 100, weight: 10, aura: 'celestial' },
  },
};
/** Which premium crop a roll r (0 <= r < 1) gives, when `found` many of the capped ones exist already: down the list
 *  from the rarest, so a capped crop that is all grown gives way to the one below it. */
/** THE CELESTIAL GARDEN (the VIP Quarter): how much a farmer's crops on its pedestals weigh in the day's $AVYN pool --
 *  save.garden { '<map>:<n>': { crop, n, at } }, a pedestal's stack of one kind (`n`, 1 for one set before 2026-10-28),
 *  each crop its PREMIUM weight (only the three rarest have one). */
export const gardenWeight = (garden) => Object.values(garden ?? {}).reduce((a, c) => a + (PREMIUM.crops[c?.crop]?.weight ?? 0) * (c?.n ?? 1), 0);
/** How many of each harvesting crop a farmer has on the Celestial Garden's pedestals: { [crop]: n } (2026-10-28: each crop
 *  its own daily harvest, server/world2.js -- the three with a PREMIUM weight are the ones that harvest). */
export function gardenCounts(garden) {
  const n = {};
  for (const c of Object.values(garden ?? {})) if (PREMIUM.crops[c?.crop]?.weight) n[c.crop] = (n[c.crop] ?? 0) + Math.max(1, c.n ?? 1);
  return n;
}
/** THE GARDEN'S SUGGESTED NUMBERS (2026-10-28, the designer: "decide how much each crop ... what percentage of the AVYN it
 *  will get ... then ... the daily share for each crop"; mine, for the desk's calculator to start from -- the desk sets
 *  the real ones): a budget for Season 0's garden, the days it runs, and each crop's share of it. A crop's daily harvest is
 *  its share of the budget, over all of it that will ever grow (PREMIUM cap), over the days. */
// (2026-10-28, the designer: "a separate supply ... for premium crops ... 2% of the total supply": 20,000,000 of the
//  1,000,000,000 -- src/economy/config.js AVYN_MINING's ceiling -- over a year, 40 / 30 / 30)
export const GARDEN_PLAN = { budget: 20_000_000, days: 365, share: { 'Crystal Grapes': 0.4, Starbloom: 0.3, 'Celestial Pineapple': 0.3 } };
/** THE PREMIUM CROPS' FP BY THEIR RANK (2026-10-28, the designer: "higher ranked premium crops will give more FP"; and
 *  again that day: "The starting FP on any crop in VIP area needs to be at least 100 ... celestial pineapple ... around
 *  8,000 to 9,000", "random, like 10 to 15, 15 to 20"): Farming Points a harvest, a range rolled each time, and what it
 *  says is what it gives -- not tripled again as the VIP places' other work is (VIP_FP), nor cut by the day's bands
 *  (commands.js earnFp `flat`: each one a Premium Seed bought or won, so no grinding). The ranks between are mine, the
 *  designer's to tune. (Round 9's were 10 / 15 / 60 / 150 / 500, before the three times.) */
export const PREMIUM_FP = { 'Sunfire Pepper': [100, 120], 'Diamond Strawberry': [110, 130], 'Sapphire Blueberry': [120, 140],
  'Golden Pumpkin': [180, 220], 'Crystal Grapes': [1000, 1200], Starbloom: [3000, 3500], 'Celestial Pineapple': [8000, 9000] };
/** THE REST OF THE WORK'S FP, RANDOM (the same day: "like 10 to 15, 15 to 20"): its measure up to half as much again. */
export const FP_SPREAD = 0.5;
export const gardenRateOf = (crop, { budget, days, share } = GARDEN_PLAN) =>
  Math.floor(((budget * (share[crop] ?? 0)) / (PREMIUM.crops[crop]?.cap || 1) / Math.max(1, days)) * 100) / 100;
export function premiumCrop(r, found = {}) {
  const list = Object.entries(PREMIUM.crops);                       // (commonest first)
  let acc = 0, pick = null;
  for (const [name, c] of [...list].reverse()) { acc += c.odds; if (r < acc) { pick = name; break; } }
  pick ??= list[0][0];
  for (let i = list.findIndex(([n]) => n === pick); i > 0; i--) {
    const [name, c] = list[i];
    if (!c.cap || (found[name] ?? 0) < c.cap) return name;
  }
  return list[0][0];
}
for (const s of SEEDS) {
  const t = CROP_TIMES[s.name];
  if (!t) throw new Error(`rules.js: no growth time for ${s.name}`);
  s.grow = t.grow; s.regrow = t.regrow ?? null;
  s.harvests = t.regrow ? REGROW_HARVESTS : 1;                     // (how many times one plant is cut before it goes)
  // (its seasons: CROP_SEASONS; null sows in any -- the staples, the premium crops)
  const seasons = WORLD_TIME.seasons.filter((k) => CROP_SEASONS[k].includes(s.name));
  if (!s.premium && !s.soil && !seasons.length && !CROP_SEASONS.all.includes(s.name)) throw new Error(`rules.js: no season for ${s.name}`);
  s.seasons = seasons.length ? seasons : null;
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
    'Winter Kale': 4, 'Snow Turnip': 8, Frostberry: 12, 'Ice Melon': 16,
    // the rare crops (2026-10-26): Farming 18 to 30
    'Honeydew Melon': 18, 'Purple Cauliflower': 20, 'Snow Pea': 22, 'Golden Beet': 24, 'Black Tomato': 26, 'Blue Corn': 28, 'Dragon Fruit': 30,
  },
  special: ['Saffron', 'Star Fruit', 'Fairy Rose', 'Fireheart Pepper'],       // quests, tasks, exploration, hidden areas, discoveries
};

/** GOBLINS ROB THE FALLEN (2026-10-26, a player's idea: "a band of THIEVES ... when player gets KOed by them they loose 20%
 *  of CARRIED GOLD ... stronger goblins ... 30% loss in gold. Gold in bank is safe"; the designer: "instead of thieves, we
 *  can use goblins"): knocked out with a goblin's blow the last (within `withinMs`), a farmer loses `share` of the Gold they
 *  carry -- an elite goblin's `elite` -- gone from the game (the ledger's 'goblins' sink). What is in the bank is safe. */
export const GOBLIN_LOOT = { share: 0.2, elite: 0.3, withinMs: 30_000 };
/** A goblin that fights (the goblin merchant in the town is no enemy). */
export const isGoblin = (id) => /goblin/i.test(String(id ?? '')) && Object.hasOwn(ENEMIES, String(id)) && ENEMIES[id].behavior !== 'passive';
/**
 * BOSSES AND THE WEAPONS THEY FEAR (2026-10-27, a player's suggestion -- a boss golem no bow can hurt, weak to the axe;
 * the designer: "such an interesting suggestion ... we need to do it in a way that everything is balanced"): each boss
 * shrugs off one family of weapons, no harm at all, and is weak to another, BOSS_WEAK times the harm; the third does what
 * it always did. The families: blades (the sword, an Emporium axe, a bear's paws), bows, staffs. Every farmer has all
 * three from the start (inventory.js, the cottage's chests), so no boss is beyond anyone; an Emporium axe is only a
 * blade, so no boss favours what is bought. Each family is shrugged off by two or three and feared by two or three.
 * The bosses alone (ENEMIES boss: the Great Golems, not the golems round them -- 2026-10-27, the designer: "the weapon
 * attributes, they only apply to those bosses"): every other creature takes every weapon as before.
 */
export const BOSS_WEAPONS = {
  boss_frost_golem: { immune: 'bow', weak: 'staff' },       // (arrows glance off its ice)
  boss_crystal_golem: { immune: 'staff', weak: 'blade' },   // (its crystal turns magic aside)
  orc_warlord: { immune: 'blade', weak: 'bow' },            // (his shield takes every blade)
  bone_spider: { immune: 'bow', weak: 'blade' },            // (arrows pass through its bones)
  vault_queen: { immune: 'blade', weak: 'staff' },          // (her shell turns every blade)
  lich: { immune: 'staff', weak: 'bow' },                   // (a master of magic: the Arch-Lich)
  storm_slime_king: { immune: 'blade', weak: 'staff' },     // (a blade sinks in and comes out clean: the player's own example)
  goblin_warchief: { immune: 'bow', weak: 'blade' },        // (his great shield takes every arrow)
};
/** A boss's feared weapon, and every other (2026-10-28, the designer: "the other weapons shouldn't hit normally, but they
 *  should hit the bosses weakly. The damage will be reduced for other weapons. And for the weapon that is designed for
 *  boss, it will do a bit more, just like 10 to 15% more damage"): BOSS_WEAK the one it fears, BOSS_OTHER the rest. The
 *  numbers mine, within the designer's words. */
export const BOSS_WEAK = 1.15, BOSS_OTHER = 0.8;
/** Does this map have a boss on it (a zone tagged spawn:<a boss>)? Kept for each map. A boss is fought without energy
 *  (2026-10-28, the designer: "fighting boss does not consume energy, but fighting with other mobs, that should ... boss is
 *  very difficult to kill, and it might take more than the maximum energy a player has"): commands.js swing. */
const BOSS_MAPS = new WeakMap();
export function bossOnMap(doc) {
  if (!doc) return false;
  if (!BOSS_MAPS.has(doc)) BOSS_MAPS.set(doc, (doc.zones ?? []).some((z) => (z.tags ?? []).some((t) => { const m = /^spawn:([a-z_]+)/.exec(t); return !!m && !!ENEMIES[m[1]]?.boss; })));
  return BOSS_MAPS.get(doc);
}
/** A weapon's family: what a swing names it (commands.js swing), a shot's kind (combat.js shoot), a heavy attack's kind. */
export const weaponFamily = (what) => (/^(sword|axe|bear|blade)$/.test(what) ? 'blade' : /^(bow|arrow)$/.test(what) ? 'bow' : /^(magic|staff|bolt)$/.test(what) ? 'staff' : null);
/** What a creature takes of a blow by this family: a boss BOSS_WEAK (its weakness) or BOSS_OTHER (any other weapon); any
 *  other creature, 1. A blow of no family (a burn's bite) as it is. */
/** (NO BOSS SHRUGS A WEAPON OFF ANY MORE, 2026-10-28, the designer: "when I said that the bosses will take more damage from
 *  specific weapons, I didn't say that ... the bosses will be completely immune to the damage from other weapons ... The
 *  only thing that will happen is the other weapons will do lesser damage compared to the ones that does a bit more
 *  damage": the weapon a boss fears hits it BOSS_WEAK times as hard, every other one as it hits anything. BOSS_WEAPONS'
 *  `immune` is kept, unread, should it ever be wanted again; `below`, the dungeon's, is the same now.) */
export const bossTakes = (type, family, below = false) => { void below; const B = BOSS_WEAPONS[type]; return !B || !family ? 1 : family === B.weak ? BOSS_WEAK : BOSS_OTHER; };
/** How much of a creature's health a kill needs out of the blows banked (commands.js kill, combat.loot): a boss's
 *  weakness takes it down BOSS_WEAK times quicker. */
export const bossHpFactor = (type) => (BOSS_WEAPONS[type] ? 1 / BOSS_WEAK : 1);

/** MORE OF THEM OUT IN THE WILD (2026-10-26, the designer: "we will increase the enemies in the open areas, you know, more
 *  goblins, more slimes, more of all the enemies. So it's much more difficult to venture outside" -- about half again):
 *  every spawn zone of an open map sets down OPEN_FOES times its count (a fraction a chance of one more); the caves and
 *  the buildings keep theirs. */
export const OPEN_FOES = 1.5;
export const openFoes = (mapId, n, rnd = Math.random) => {
  if (/^(cave_|interior_|dungeon_)/.test(String(mapId ?? ''))) return n;
  const want = n * OPEN_FOES;
  return Math.floor(want) + (rnd() < want - Math.floor(want) ? 1 : 0);
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
/** NOTICED, CHASED, LET GO (2026-10-22, the testers: "I just saw them a little bit in my screen and now they're chasing
 *  me", and mobs that followed a farmer to the town "stay on entrance even after 10 minutes"): a creature notices you
 *  within `notice` px at most, whatever its own sight; once after you it keeps on while you are within `chaseFor` times
 *  that. ITS GROUND (2026-10-23, the designer: "a radius of how much distance they can go from their spawn point ... when
 *  the player is out of that radius, the enemy should return to their place ... it doesn't follow wherever you go"): it
 *  fights only while you are within `territory` px of where it was set down (and its reach), never goes further than that
 *  itself, and the moment you are out of it -- or in the town -- it walks back the way it came (combat.js), heeding no
 *  blow on the way, whole again when it is home. */
// (NO LEASH ONCE AFTER YOU, 2026-10-23, the designer: "if the player is near the enemy ... there shouldn't be any radius at
//  all ... once the player is gone into the water, or ... the town region, the enemy should go back immediately": the
//  territory decides only whether it notices you; after you, it follows until you are in the water or the town, or out of
//  its sight -- `lostAt` times its notice, off the screen)
export const AGGRO = { notice: 130, chaseFor: 1.5, territory: 170, lostAt: 3 };
/** A BEGINNER'S FOES (2026-10-22, the designer: the testers say the story's fights are too hard for a new farmer -- "those
 *  caves will have normal enemies ... when players are not advanced in their combat yet ... the system detects if the
 *  player have enough strength ... the enemies will become like what we have right now"): every creature's health and
 *  every blow it lands are `from` of their own at Combat level 1, growing to all of them at Combat level `fullAt`. */
export const EASY_FOES = { from: 0.5, fullAt: 8 };
/** THE FIRST MINES ARE GENTLE (2026-10-23, the designer: "In the starting quest, the mine is way too difficult ... the caves
 *  are so difficult right now that they can't even complete their initial quest, even when they are so weak"): the caves
 *  the early quests send a new farmer into -- the Old Working, both its levels (Book One's Quartz, Bram's ore), and Glimmer
 *  Hollow (Quartz too) -- set down at most `most` creature at each of their spots and none of the kinds in `none`, and every
 *  creature there has `scale` of its health and its blows -- besides a beginner's foes (EASY_FOES). */
export const GENTLE = { places: ['cave_old_working', 'cave_old_working_2', 'cave_glimmer'], most: 1, none: ['skeleton', 'storm_slime'], scale: 0.6 };
/** THE DUNGEON IS HARD, AND HARDER THE DEEPER (2026-10-28, the designer, the morning of the launch: "we need to make it so
 *  that dungeons are difficult ... players are not forced, but are encouraged to plant premium seedbeds to grow those plants,
 *  to make those dishes which give boost for maybe damage boost, speed boost, health boost ... to consume before they get
 *  into dungeons"): on each level every creature, its guardian too, takes this many times its own blows to fell and lands
 *  its blows this many times as hard -- the page and the server alike, as placeScale is read by both (play.js foeScale,
 *  combat.js hurt; commands.js kill, hurt, levelNeed). The premium dishes are the answer to it (BUFFS: the Sunfire Chili's
 *  harder blows, the Diamond Tart's softer blows taken, the Golden Pie's health). By level, [none, 1 ... 6]: my numbers. */
export const DUNGEON_HARD = [1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75];
export const placeScale = (map) => (GENTLE.places.includes(map) ? GENTLE.scale : DUNGEON_HARD[dungeonLevel(map)] ?? 1);
export const foeScale = (combatLevel) => Math.min(1, EASY_FOES.from + (1 - EASY_FOES.from) * Math.max(0, (combatLevel ?? 1) - 1) / (EASY_FOES.fullAt - 1));
const ANIM4 = (dir, a, cell = 32, rows = 4) => ({ dir: `Enemy/${dir}`, cell, rows, anim: a });
// (THE SLIMES STAND ON THE GROUND, 2026-10-27, the enemy animation audit -- the designer: "fight with all enemies and see if
//  their animation is properly animated": the pack's slime has its lowest row at 20 of its 32 px cell, and with no foot of
//  its own it was set down by the cell's, 26 -- every slime of these hovered 6 px over where it stood, its feet above the
//  farmer's beside it; tall 10, from there to its top, so its health sits just over it)
const SLIME_ART = (c) => ({ ...ANIM4(`Slimes/${c}/Slime`, { idle: ['Idle', 4], walk: ['Walk', 4], attack: ['Walk', 4], hurt: ['Damage', 4], dead: ['Dead', 4] }), foot: 20, tall: 10 });
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
  spike:         { name: 'Spike', behavior: 'hostile', hp: 48, damage: 12, speed: 0, notice: 210, reach: 190, cooldown: 1.6, windup: 0.5, gold: [20, 40], stationary: true,
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
// (ITS WHOLE DEATH, 2026-10-27, the enemy animation audit: ten frames at the old 6 a second are 1.7 s, and a body is gone at
//  0.9 s -- a new slime vanished mid-splash, its puddle never seen; now at 8 a second, the puddle kept a moment after, as the
//  bought sheets' deaths are: FOE's deathS)
// (its feet at 39, not 41, 2026-10-28, the launch eve creature audit: 41 is the bottom of the shadow drawn under it, and the
//  body ends at 39 in all three sheets -- each new slime sat 2 px over where it stood, while a goblin's or an orc's body
//  ends on its ground point, its shadow a little under; tall kept, its health a little clearer of the crystals)
const NEWSLIME = (n, attack) => ({ dir: `slime/Slime${n}`, cell: 64, rows: 4, order: ['down', 'up', 'left', 'right'], foot: 39, tall: 24, deathFps: 8, deathS: 10 / 8 + 0.4,
  anim: { idle: [`Slime${n}_Idle_with_shadow`, 6], walk: [`Slime${n}_Walk_with_shadow`, 8], attack: [`Slime${n}_Attack_with_shadow`, attack],
    hurt: [`Slime${n}_Hurt_with_shadow`, 5], dead: [`Slime${n}_Death_with_shadow`, 10] } });
// (a spider's flinch is its own standing frames, the way it faces, 2026-10-27, the enemy animation audit: it was the first two
//  of its death, row 4, drawn from the front only -- one going left or right that was hit turned to face you and back)
// (shadow: the sheet draws none -- a shadow under its body, inside its legs, 2026-10-28, the launch eve creature audit: combat.js)
const SPIDER = (nn, scale) => ({ dir: 'spider', cell: 64, rows: 4, order: ['up', 'left', 'down', 'right'], foot: 50, tall: 38, scale, shadow: [14, 4],
  anim: { idle: [`spider${nn}`, 2, 4], walk: [`spider${nn}`, 6, 4], attack: [`spider${nn}`, 4, 0], hurt: [`spider${nn}`, 2, 4], dead: [`spider${nn}`, 4, 0, 4] } });
const POISON = (dps, seconds) => ({ kind: 'poison', dps, seconds }), BURN = (dps, seconds) => ({ kind: 'burn', dps, seconds });
// (2026-10-21, the designer: "very specific slimes, so there should be these things for those ... not all enemies"):
// SHOCK, a stun with sparks (the storm slime); FREEZE, held in ice a moment then slowed (the frost slime); CHILL, only
// slowed (the ice wolves). play.js afflict; `slow` is the speed kept.
const SHOCK = (seconds) => ({ kind: 'shock', seconds }), FREEZE = (seconds, slowSeconds, slow = 0.5) => ({ kind: 'freeze', seconds, slowSeconds, slow }),
  CHILL = (seconds, slow = 0.6) => ({ kind: 'chill', seconds, slow });
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
 * the folder Undead Enemies/). What they do is combat.js's: steady (a blow does not stop it), armor, the soulfire in
 * volleys that home, summoned skeletons, a stomp, rising from the ground, escorts, their own windup and rise frames,
 * eyes in the dark, the land-bound (`ground`) kept off the water.
 *
 * (2026-10-03, the designer: "the enemies should be able to move all the ways, not just sideways or four directional...
 * they are very slow, they hit slow... the arch-lich needs to be menacing, bigger... his main ability spawning
 * skeletons... smaller skeletons, bigger skeletons, skeleton soldiers and skeleton knights, multiple knights, and a boss
 * knight with smaller skeleton soldiers... as difficult as we can make it"; and no Gold -- they drop rare things for
 * the quests and seeds for the Barrowmire's own field: DROPS.) The Death Knight, the Arch-Lich, the wraith and the golem
 * are drawn from one 3D body in EIGHT directions (design/undead-enemies/rig3d.py: art.rows 8, combat.js DIR8; eyes8 /
 * castFrom8 / tall measured by `rig3d.py --meta`). The rest are THE DESIGNER'S OWN (2026-10-03, Undead Enemies Pack/):
 * skeleton, ghoul, wight, hooded wraith, gravebound, bone hound -- animated by design/undead-enemies/pack_anim.py (four
 * rows; `--meta` measures them), each fighting its own way: a spear's reach, a rake and a pounce, a cleave that splits
 * the ground, a vanishing, grave-roots under your feet, a pack's pounce.
 */
// (2026-10-20, the designer: "smoothen the enemy animations": twelve frames to a walk and eight to a breath, both rigs
//  drawn again; the walk goes by the ground covered, art.stride px to its whole cycle (combat.js), about nine tenths of
//  the creature's height, between 30 and 64 px; the breath slower, 5 frames a second)
const UNDEAD = (dir, cell, foot, tall, o = {}) => ({ dir: `undeadfoe/${dir}`, cell, rows: 4, foot, tall, deathS: 1.4,
  stride: Math.round(Math.max(30, Math.min(64, tall * 0.9))), idleFps: 5, ...o.art,
  anim: { idle: ['Idle', 8], walk: ['Walk', 12], attack: ['Attack', 6], hurt: ['Hurt', 3], dead: ['Death', 6], windup: ['Windup', 3], ...(o.anim ?? {}) } });
const UNDEAD8 = (dir, cell, foot, tall, eyes8, o = {}) => ({ ...UNDEAD(dir, cell, foot, tall, o), rows: 8, eyes8 });
const PACK4 = (dir, cell, foot, tall, eyes, o = {}) => ({ ...UNDEAD(dir, cell, foot, tall, { ...o, anim: { walk: ['Walk', 12], ...(o.anim ?? {}) } }), eyes });
const RISE = { anim: { rise: ['Rise', 6] } };
const BONES = { notice: 'hit', death: 'rockBreak', rise: 'rockBreak' };
const GREEN_EYES = '#9dffb8';
Object.assign(ENEMIES, {
  // THE DESIGNER'S UNDEAD (2026-10-03: "use their art, the same thing, but make their walking look good, make their
  //  movement look good, and make them attack with a better pattern"): the pack's own drawings (Undead Enemies Pack/),
  //  cut into parts and animated by design/undead-enemies/pack_anim.py -- four rows; each with a way of fighting of its own
  // the skeleton spearman: a long reach, out of the ground (and what the Arch-Lich raises, and the Death Knight's men)
  skeleton:      { name: 'Skeleton', behavior: 'hostile', hp: 56, damage: 13, speed: 54, notice: 150, reach: 24, cooldown: 0.8, windup: 0.32, pack: 160,
                   radius: 9, mid: 16, ambush: true, ground: true, cues: BONES,
                   art: PACK4('Skeleton', 64, 55, 53, {"down":[[29,14],[33,14]],"up":[],"right":[[31,13]],"left":[[30,13],[32,13]]}, { art: { eyeColor: '#7ff0e0' }, ...RISE }) },
  // the ghoul: quick and low, a rake of both claws that rots, and every third time a pounce from further off
  ghoul:         { name: 'Ghoul', behavior: 'hostile', hp: 70, damage: 14, speed: 66, notice: 160, reach: 18, cooldown: 0.7, windup: 0.28, pack: 170,
                   radius: 10, mid: 14, ground: true, effect: POISON(2, 4), slam: { every: 3, windup: 0.45, radius: 16, damage: 18 },
                   cues: { notice: 'hit', death: 'slimeSplat' },
                   art: PACK4('Ghoul', 64, 55, 52, {"down":[[26,13],[30,13]],"up":[],"right":[[35,13],[39,11]],"left":[[24,12],[28,13]]}, { art: { eyeColor: '#d9fff0' } }) },
  // the wight: heavy plate, a two-handed cleave, and every third blow the ground split round it
  wight:         { name: 'Wight', behavior: 'elite', hp: 220, damage: 30, speed: 44, notice: 150, reach: 26, cooldown: 1.0, windup: 0.5, pack: 160,
                   radius: 14, mid: 24, steady: true, armor: 0.3, ground: true, slam: { every: 3, windup: 0.7, radius: 34, damage: 28, leap: false },
                   cues: { ...BONES, notice: 'hit' },
                   art: PACK4('Wight', 72, 62, 61, {"down":[[34,18],[38,16]],"up":[],"right":[[41,16]],"left":[[30,16]]}, { art: { eyeColor: '#7ff0e0' } }) },
  // the hooded wraith: from further off it vanishes, and is beside you -- then the claws
  hooded_wraith: { name: 'Hooded Wraith', behavior: 'hostile', hp: 80, damage: 17, speed: 58, notice: 190, reach: 20, cooldown: 0.8, windup: 0.3, pack: 160,
                   radius: 10, mid: 18, blink: { every: 3.2, near: 22 }, cues: { notice: 'magicCast', death: 'magicCast' },
                   art: PACK4('Hooded Wraith', 64, 55, 54, {"down":[[29,10],[33,10]],"up":[],"right":[[39,9]],"left":[[24,9]]}, { art: { eyeColor: '#bfe6ff' } }) },
  // the gravebound: keeps away and marks the ground where you stand -- then it breaks there (grave-roots, combat.js)
  gravebound:    { name: 'Gravebound', behavior: 'elite', hp: 130, damage: 22, speed: 34, notice: 200, reach: 140, cooldown: 1.6, windup: 0.6, pack: 180,
                   radius: 13, mid: 22, shot: 'roots', roots: { radius: 15, delay: 0.85, spread: 30 }, volley: { n: 2 }, ground: true,
                   cues: { notice: 'magicCast', death: 'rockBreak' },
                   art: PACK4('Gravebound', 72, 63, 57, {"down":[[30,14],[33,14]],"up":[[31,10],[34,10]],"right":[[39,14],[41,14]],"left":[[30,14],[33,14]]}, { art: { eyeColor: '#7ff0e0' } }) },
  // the bone hound: the fastest thing here, in packs; a snap, and every other time a pounce
  bone_hound:    { name: 'Bone Hound', behavior: 'hostile', hp: 40, damage: 11, speed: 78, notice: 180, reach: 16, cooldown: 0.65, windup: 0.25, pack: 200,
                   radius: 9, mid: 10, ground: true, slam: { every: 2, windup: 0.4, radius: 14, damage: 16 }, cues: BONES,
                   art: PACK4('Bone Hound', 56, 49, 44, {"down":[],"up":[],"right":[[41,13]],"left":[[14,13]]}, { art: { eyeColor: '#d6c8ff', quad: true } }) },
  // THE DEATH KNIGHT, the boss knight: a greatsword, and his soldiers round him (escort)
  death_knight:     { name: 'Death Knight', behavior: 'elite', hp: 320, damage: 32, speed: 50, notice: 160, reach: 28, cooldown: 0.9, windup: 0.4, pack: 160,
                      radius: 15, mid: 26, steady: true, armor: 0.3, ground: true, cues: { ...BONES, notice: 'hit' },
                      escort: { skeleton: 3 },
                      art: UNDEAD8('Death Knight', 112, 100, 76, {"down":[[55,50],[57,50]],"down-right":[[61,49],[63,49]],"right":[[65,47]],"up-right":[],"up":[],"up-left":[],"left":[[46,47]],"down-left":[[50,49],[48,49]]}, { art: { eyeColor: '#ff4a3a' } }) },
  // THE ARCH-LICH (2026-10-03, the designer): raises skeletons above all, and throws soulfire -- green fire with a
  //  purple hue, a trail behind it. Floats; towers over you.
  lich:             { name: 'Arch-Lich', behavior: 'elite', hp: 520, damage: 26, speed: 36, notice: 210, reach: 170, cooldown: 1.0, windup: 0.45, pack: 210,
                      radius: 18, mid: 40, steady: true, armor: 0.2, shot: 'soulfire', volley: { n: 3, spread: 0.26 }, homing: 1.3,
                      castFrom8: {"down":[-17,-93],"down-right":[9,-92],"right":[29,-98],"up-right":[32,-109],"up":[17,-117],"up-left":[-32,-109],"left":[-29,-98],"down-left":[-9,-92]},
                      summon: { kind: 'skeleton', n: 3, every: 2, most: 9 }, cues: { notice: 'magicCast', death: 'rockBreak' },
                      art: UNDEAD8('Lich', 144, 128, 112, {"down":[[76,49],[68,49]],"down-right":[[83,47],[78,49]],"right":[[84,46]],"up-right":[],"up":[],"up-left":[],"left":[[59,46]],"down-left":[[60,47],[65,49]]}, { art: { eyeColor: GREEN_EYES } }) },
  wraith:           { name: 'Wraith', behavior: 'hostile', hp: 90, damage: 18, speed: 62, notice: 170, reach: 20, cooldown: 0.7, windup: 0.3, pack: 140,
                      radius: 10, mid: 18, cues: { notice: 'magicCast', death: 'magicCast' },
                      art: UNDEAD8('Wraith', 72, 64, 56, {"down":[[38,27],[34,27]],"down-right":[[44,25],[42,26]],"right":[[46,23]],"up-right":[],"up":[],"up-left":[],"left":[[25,23]],"down-left":[[27,25],[29,26]]}, { art: { eyeColor: '#8ff4ff' } }) },
  bone_golem:       { name: 'Bone Golem', behavior: 'elite', hp: 520, damage: 36, speed: 32, notice: 150, reach: 28, cooldown: 1.15, windup: 0.55, pack: 140,
                      radius: 22, mid: 30, steady: true, armor: 0.35, ground: true,
                      slam: { every: 2, windup: 0.8, radius: 40, damage: 36, leap: false }, cues: { ...BONES, notice: 'hit' },
                      art: UNDEAD8('Bone Golem', 128, 116, 86, {"down":[[67,62],[61,62]],"down-right":[[81,59],[76,60]],"right":[[84,55]],"up-right":[],"up":[],"up-left":[],"left":[[43,55]],"down-left":[[46,59],[51,60]]}, { art: { eyeColor: '#7dff9f' } }) },
});

/** WHAT A KILL DROPS BESIDES GOLD (2026-10-03, the designer: the undead drop no Gold -- "very rare things, which we
 *  will use for quests later on", and "a few seeds" for crops that grow only in the Barrowmire's field). By enemy kind:
 *  [{ item, chance (a kill, 0..1), n: [least, most] }], rolled by the server (commands.js 'combat.loot'); what finds no
 *  room waits at home, as a grant does. Empty until the designer names the rare things and the Barrowmire's crops. */
/**
 * THE NEW ENEMIES (2026-10-21: the designer, "these enemies don't look good ... I bought lots of new enemies"): bought
 * sheets, one an action, four rows of 64 px cells (down, up, left, right), copied into Enemies/ (source 'foe'). The
 * Barrowmire's dead are theirs now: skeletons, liches and ghouls ("liches and skeletons will do ... we can make
 * ghouls": the tan gnoll recoloured, Enemies/Ghoul) and the red bats. A creature's wind-up is its attack sheet's first
 * frames (wind), the blow the rest; it runs when it gives chase; a skeleton rises by its death played backwards.
 * m: what was measured on its idle (foot, the lowest row of its body; tall, from there to the top) and its frames.
 */
const FOE = (dir, m, o = {}) => {
  const wind = o.wind ?? 3;
  return { dir: `foe/${dir}`, cell: m.cell ?? 64, rows: 4, order: ['down', 'up', 'left', 'right'], foot: m.foot, tall: m.tall,
    stride: Math.round(Math.max(26, Math.min(56, m.tall * 1.5))), idleFps: 5, deathFps: 8, deathS: (m.Death ?? 6) / 8 + 0.4,
    room: Math.max(8, Math.round(m.tall * 0.45)), ...o.art,
    anim: { idle: ['Idle', m.Idle], walk: ['Walk', m.Walk], run: ['Run', m.Run], windup: ['Attack', wind], attack: ['Attack', m.Attack - wind, wind],
      hurt: ['Hurt', m.Hurt], dead: ['Death', m.Death], ...(o.anim ?? {}) } };
};
const SKEL = (n, tall) => FOE(`Skeleton${n}`, { foot: 40, tall, Idle: 4, Walk: 6, Run: 8, Attack: 9, Hurt: 4, Death: 6 },
  { art: { riseBack: true, eyeColor: '#9dfff0' }, anim: { rise: ['Death', 6] } });
const LICH = (n, tall) => FOE(`Lich${n}`, { foot: 43, tall, Idle: 4, Walk: 6, Run: 6, Attack: 8, Hurt: 4, Death: 10 }, { art: { eyeColor: GREEN_EYES } });
// (a bat's eyes glint in the dark as a spider's do, 2026-10-21: in a cave a bat was not seen until it bit; eyesF, the
//  eyes in each of its three wingbeat frames, which rise and fall with it)
const BAT_EYES = { right: [[[37, 34]], [[37, 30]], [[36, 26]]], down: [[[29, 26], [33, 26]], [[29, 29], [33, 29]], [[29, 33], [33, 33]]],
  left: [[[25, 34]], [[25, 30]], [[26, 26]]] };
// (2026-10-28, the launch eve creature audit: a small shadow on the ground under it, its 11 px of flight seen; and its wings
//  beat on through its dash and flit back, art.flap -- combat.js)
const BAT = (c) => ({ dir: `foe/Bat${c}`, cell: 64, rows: 4, order: ['up', 'right', 'down', 'left'], foot: 54, tall: 34, room: 12, fadeDeath: true, deathS: 0.6, eyesF: BAT_EYES,
  shadow: [6, 2], flap: true,
  anim: { idle: ['Fly', 3], walk: ['Fly', 3], attack: ['Fly', 3], hurt: ['Fly', 3], dead: ['Fly', 3] } });
Object.assign(ENEMIES, {
  // the skeleton: a sword, out of the ground when you come near; the commonest dead here, and what the Arch-Lich raises
  skeleton:        { undead: true, name: 'Skeleton', behavior: 'hostile', hp: 56, damage: 13, speed: 50, notice: 150, reach: 18, cooldown: 0.8, windup: 0.32, pack: 160,
                     radius: 8, mid: 12, ambush: true, ground: true, cues: BONES, art: SKEL(1, 20) },
  skeleton_guard:  { undead: true, name: 'Skeleton Guard', behavior: 'hostile', hp: 66, damage: 14, speed: 52, notice: 150, reach: 18, cooldown: 0.8, windup: 0.32, pack: 160,
                     radius: 8, mid: 12, ambush: true, ground: true, cues: BONES, art: SKEL(2, 21) },
  // the skeleton knight: red and gold plate, a cleave, every third blow the ground split round it; its guards with it
  skeleton_knight: { undead: true, name: 'Skeleton Knight', behavior: 'elite', hp: 240, damage: 28, speed: 46, notice: 160, reach: 22, cooldown: 0.95, windup: 0.42, pack: 160,
                     radius: 10, mid: 15, steady: true, armor: 0.3, ground: true, slam: { every: 3, windup: 0.7, radius: 30, damage: 26, leap: false },
                     escort: { skeleton_guard: 2 }, cues: { ...BONES, notice: 'hit' }, art: SKEL(3, 25) },
  // the liches: the adept throws a curse, the mage marks the ground where you stand and it breaks there (grave-roots)
  lich_adept:      { undead: true, name: 'Lich Adept', behavior: 'hostile', hp: 90, damage: 15, speed: 40, notice: 180, reach: 130, cooldown: 1.4, windup: 0.5, pack: 170,
                     radius: 9, mid: 18, shot: 'curse', homing: 0.8, cues: { notice: 'magicCast', death: 'rockBreak' }, art: LICH(1, 32) },
  lich_mage:       { undead: true, name: 'Lich Mage', behavior: 'elite', hp: 150, damage: 22, speed: 36, notice: 200, reach: 140, cooldown: 1.6, windup: 0.6, pack: 180,
                     radius: 9, mid: 18, shot: 'roots', roots: { radius: 15, delay: 0.85, spread: 30 }, volley: { n: 2 }, ground: true,
                     cues: { notice: 'magicCast', death: 'rockBreak' }, art: LICH(2, 34) },
  // THE ARCH-LICH, crowned in gold: raises skeletons above all, and throws soulfire in threes that follow you
  lich:            { undead: true, name: 'Arch-Lich', behavior: 'elite', hp: 520, damage: 26, speed: 36, notice: 210, reach: 170, cooldown: 1.0, windup: 0.45, pack: 210,
                     radius: 10, mid: 20, steady: true, armor: 0.2, shot: 'soulfire', volley: { n: 3, spread: 0.26 }, homing: 1.3,
                     summon: { kind: 'skeleton', n: 3, every: 2, most: 9 }, cues: { notice: 'magicCast', death: 'rockBreak' }, art: LICH(3, 36) },
  // the ghoul: quick and low, a rake of both claws that rots, and every third time a pounce from further off
  ghoul:           { undead: true, name: 'Ghoul', behavior: 'hostile', hp: 70, damage: 14, speed: 64, notice: 160, reach: 16, cooldown: 0.7, windup: 0.28, pack: 170,
                     radius: 9, mid: 16, ground: true, effect: POISON(2, 4), slam: { every: 3, windup: 0.45, radius: 16, damage: 18 },
                     cues: { notice: 'hit', death: 'slimeSplat' },
                     art: FOE('Ghoul', { foot: 42, tall: 31, Idle: 4, Walk: 6, Run: 8, Attack: 10, Hurt: 4, Death: 6 }, { art: { eyeColor: '#b4ff9a' } }) },
  // the grave bats: quick, in flocks, a bite and away; they fly, over water and graves alike
  grave_bat:       { undead: true, name: 'Grave Bat', behavior: 'hostile', hp: 22, damage: 8, speed: 82, notice: 170, reach: 14, cooldown: 1.0, windup: 0.32, pack: 200,
                     radius: 7, mid: 30, dash: { from: 74, keep: 54, speed: 270, track: 70, most: 0.45, back: 0.32 }, cues: { notice: 'hit', death: 'slimeSplat' }, art: BAT('Red') },
});

/**
 * THE REGIONS' OWN (2026-10-21, the designer: "please add all the enemies in each region wherever enemy suits best in
 * that region. And add electric slime in some regions as well"): the bought sheets (Enemies/, source 'foe'), each where
 * it belongs. Whisperwood: goblins, the predator plants, wolves. Moonmere: the blue bulbs on the shore. Stonepeak and its
 * caves: golems of earth and crystal, goblins and orcs in the foothills, the storm slime on the heights, skeletons and
 * cave bats in the old workings. The Everbloom: the thorn blooms. Frosthaven: ice wolves, the frost slime, the frost
 * golem. A bat's attack is a dash and a bite (dash: it keeps off, `keep` px, darts in from `from` px at `speed`, bends
 * after you `track` px a second, never past where it meant to strike: combat.js dashStep). The Gold is a stand-in until
 * each region's economy is settled (the designer, 2026-10-20: fares, stock, prices, loot wait per region).
 */
// (a goblin's feet are at 39, 2026-10-27, the enemy animation audit: 46 was measured on its front row, where the dagger hangs
//  below them -- every goblin hovered 7 px over where it stood, its shadow above the farmer's feet; art.tall from the feet to
//  its top for its health, its stride and room as they were)
const GOB = (n, tall) => FOE(`Goblin${n}`, { foot: 39, tall, Idle: 4, Walk: 6, Run: 8, Attack: 5, Hurt: 4, Death: 6 }, { wind: 2, art: { tall: tall - 7 } });
// (the orc's tell is its first two frames, 2026-10-21: the third is already the swing, its arc drawn: held as the tell it
//  showed the blow before it fell)
const ORC = (n, tall) => FOE(`Orc${n}`, { foot: 41, tall, Idle: 4, Walk: 6, Run: 8, Attack: 8, Hurt: 6, Death: 8 }, { wind: 2 });
// (a golem WALKS at you, 2026-10-21, the designer: they "were just sliding across": the sheet called Run is a charge with
//  its fists thrown, and its legs went one frame for every 77 px; its walk's feet keep to the ground at 24 px a stride)
const GOLEM = (n, tall) => FOE(`Golem${n}`, { cell: 128, foot: 75, tall, Idle: 4, Walk: 8, Run: 8, Attack: 9, Hurt: 4, Death: 8 },
  { wind: 5, art: { stride: 24, runStride: 24 }, anim: { run: ['Walk', 8] } });
const PLANT = (n, foot, tall) => FOE(`Plant${n}`, { foot, tall, Idle: 4, Walk: 6, Run: 8, Attack: 7, Hurt: 5, Death: 10 }, { wind: 4, art: { room: 16 } });
const SLIME = (n, foot, tall) => FOE(`Slime${n}`, { foot, tall, Idle: 6, Walk: 8, Run: 8, Attack: 10, Hurt: 5, Death: 10 }, { wind: 5 });
// (the LPC wolves, by Stephen "Redshrike" Challener and William.Thompsonj: one standing frame, no flinch of their own,
//  drawn at a little over half, the LPC sheets being made for people twice the farmer's height)
// (tallBy, 2026-10-27, the enemy animation audit: coming at you or going away a wolf is drawn twice as tall as from the side,
//  and its health, set by the side, crossed its back -- combat.js takes the height of the way it faces)
// (going away, up 57 not 46, 2026-10-28, the launch eve creature audit: 46 was its standing frame's; walking, running and
//  biting away from you its head is up at 2 to 6 px of its cell, and its health sat on its ears. And a shadow under it, the
//  LPC sheets drawing none: long from the side, narrow coming or going)
const WOLF = (dir) => FOE(dir, { foot: 59, tall: 30, Idle: 1, Walk: 5, Run: 4, Attack: 5, Hurt: 1, Death: 4 },
  { wind: 2, art: { scale: 0.55, deathFps: 6, room: 15, stride: 26, tallBy: { down: 58, up: 57 }, shadow: [22, 6], shadowBy: { down: [11, 6], up: [11, 6] } },
    anim: { hurt: ['Idle', 1] } });
const GROWL = { notice: 'hit', death: 'slimeSplat' };
// (a golem's two attacks, 2026-10-21, the designer: both crack the ground where they land and stun: its fists, both
//  together where it meant to strike -- GOLEM_FISTS, combat.js fists -- and, every third, the ground pound all round it)
const GOLEM_FISTS = { r: 16, crack: 13, gap: 9, stun: 0.8 };
Object.assign(ENEMIES, {
  // the goblins: a cutter, a raider with a spear, a hooded one quicker than both
  goblin:          { name: 'Goblin Cutter', behavior: 'hostile', hp: 44, damage: 12, speed: 44, notice: 130, reach: 17, cooldown: 0.9, windup: 0.34, retreatAt: 0.15, pack: 110,
                     radius: 8, mid: 12, gold: [20, 35], art: GOB(1, 27) },
  goblin_raider:   { name: 'Goblin Raider', behavior: 'hostile', hp: 56, damage: 15, speed: 44, notice: 130, reach: 20, cooldown: 0.95, windup: 0.36, retreatAt: 0.15, pack: 110,
                     radius: 8, mid: 13, gold: [28, 45], art: GOB(2, 29) },
  goblin_rogue:    { name: 'Goblin Rogue', behavior: 'hostile', hp: 50, damage: 17, speed: 54, notice: 140, reach: 17, cooldown: 0.8, windup: 0.3, retreatAt: 0.2, pack: 110,
                     radius: 8, mid: 14, gold: [32, 52], art: GOB(3, 32) },
  // the orcs of the foothills: heavier, slower to tire; the warlord comes with two of his own
  orc:             { name: 'Orc Brute', behavior: 'hostile', hp: 110, damage: 20, speed: 40, notice: 140, reach: 21, cooldown: 1.05, windup: 0.42, pack: 130,
                     radius: 10, mid: 13, armor: 0.1, gold: [55, 85], art: ORC(1, 27) },
  orc_reaver:      { name: 'Orc Reaver', behavior: 'hostile', hp: 130, damage: 22, speed: 42, notice: 140, reach: 21, cooldown: 1.0, windup: 0.4, pack: 130,
                     radius: 10, mid: 14, armor: 0.1, gold: [65, 95], art: ORC(2, 29) },
  orc_warlord:     { name: 'Orc Warlord', behavior: 'elite', hp: 280, damage: 28, speed: 40, notice: 150, reach: 23, close: 13, cooldown: 1.0, windup: 0.45, pack: 150,
                     radius: 11, mid: 16, steady: true, armor: 0.25, slam: { every: 3, windup: 0.7, radius: 30, damage: 26, leap: false, stun: 0.8 },
                     escort: { orc: 1, orc_reaver: 1 }, gold: [220, 300], art: ORC(3, 34) },
  // the golems: slow, hard as their stone, every third blow a stamp that shakes the ground; never alone (`group`: how many
  // stand together where one is set down -- 2026-10-22, the designer: "3 to 4 golems at a place ... as they are a very rare enemy")
  earth_golem:     { name: 'Earth Golem', behavior: 'hostile', hp: 190, damage: 24, speed: 28, notice: 120, reach: 32, close: 26, cooldown: 1.2, windup: 0.5, pack: 120,
                     radius: 14, mid: 18, steady: true, armor: 0.3, ground: true, impact: GOLEM_FISTS, group: [3, 4],
                     slam: { every: 3, windup: 0.75, radius: 32, damage: 26, leap: false, crack: true, stun: 1.4 },
                     gold: [90, 140], art: GOLEM(1, 34) },
  crystal_golem:   { name: 'Crystal Golem', behavior: 'elite', hp: 250, damage: 26, speed: 30, notice: 130, reach: 32, close: 26, cooldown: 1.15, windup: 0.5, pack: 130,
                     radius: 14, mid: 20, steady: true, armor: 0.35, ground: true, impact: GOLEM_FISTS, group: [3, 4],
                     slam: { every: 3, windup: 0.75, radius: 34, damage: 28, leap: false, ring: '#e6c8ff', crack: true, stun: 1.4 },
                     gold: [150, 220], art: GOLEM(2, 41) },
  frost_golem:     { name: 'Frost Golem', behavior: 'elite', hp: 310, damage: 30, speed: 30, notice: 130, reach: 32, close: 26, cooldown: 1.15, windup: 0.5, pack: 130,
                     radius: 15, mid: 22, steady: true, armor: 0.35, ground: true, impact: GOLEM_FISTS, group: [3, 4],
                     slam: { every: 2, windup: 0.75, radius: 36, damage: 28, leap: false, ring: '#bfeaff', crack: true, stun: 1.6 },
                     gold: [200, 280], art: GOLEM(3, 48) },
  // the predator plants: they stand among the green as plants do until you are close, then come after you and bite;
  // the blue bulb spits from off, keeping its distance as it comes (2026-10-22, the designer: the plants, "especially the
  // one who shoot from range, they don't follow the player at all ... some of the plant monsters, they are stuck": it
  // was rooted, and the biters crept at 22, slower than a walk, from 64 px)
  flytrap:         { name: 'Flytrap', behavior: 'hostile', hp: 70, damage: 16, speed: 34, notice: 100, reach: 28, close: 22, cooldown: 1.1, windup: 0.45, pack: 80,
                     radius: 10, mid: 16, ground: true, effect: POISON(2, 4), cues: GROWL, gold: [30, 50], art: PLANT(1, 48, 34) },
  bulb_plant:      { name: 'Bulb Spitter', behavior: 'hostile', hp: 56, damage: 12, speed: 30, notice: 130, reach: 120, cooldown: 1.6, windup: 0.5, pack: 80,
                     radius: 10, mid: 14, shot: 'spit', cues: GROWL, gold: [25, 42], art: PLANT(2, 46, 31) },
  thorn_bloom:     { name: 'Thorn Bloom', behavior: 'hostile', hp: 84, damage: 18, speed: 34, notice: 100, reach: 28, close: 22, cooldown: 1.05, windup: 0.42, pack: 80,
                     radius: 10, mid: 16, ground: true, effect: POISON(3, 4), cues: GROWL, gold: [35, 58], art: PLANT(3, 46, 32) },
  // the new slimes: the storm slime's touch is a shock all round it, the frost slime's a breath of cold
  // (the storm slime's feet are at 39 as the frost slime's, its sheet the same slime's: 43 was its sparks' lowest, and it hovered
  //  4 px over where it stood; tall 14 to its top for its health -- 2026-10-27, the enemy animation audit)
  storm_slime:     { name: 'Storm Slime', behavior: 'hostile', hp: 52, damage: 14, speed: 34, notice: 110, reach: 20, cooldown: 1.1, windup: 0.4, pack: 90,
                     radius: 9, mid: 8, slam: { every: 1, windup: 0.6, radius: 28, damage: 18, leap: false, ring: '#fff3a0', zap: true, shake: false, cue: 'magicCast', fx: SHOCK(0.9) },
                     gold: [30, 50], art: { ...SLIME(2, 39, 21), tall: 14 } },
  frost_slime:     { name: 'Frost Slime', behavior: 'hostile', hp: 46, damage: 13, speed: 32, notice: 105, reach: 18, cooldown: 1.0, windup: 0.4, pack: 90,
                     radius: 8, mid: 7, effect: FREEZE(0.7, 3), gold: [26, 44], art: SLIME(1, 39, 14) },
  // the wolves: quick, in packs, a bite; one roused rouses the rest
  wolf:            { name: 'Wolf', behavior: 'hostile', hp: 60, damage: 14, speed: 64, notice: 170, reach: 28, close: 21, cooldown: 0.9, windup: 0.3, pack: 210,
                     radius: 11, mid: 12, ground: true, cues: GROWL, gold: [25, 40], art: WOLF('Wolf') },
  grey_wolf:       { name: 'Grey Wolf', behavior: 'hostile', hp: 70, damage: 15, speed: 66, notice: 170, reach: 28, close: 21, cooldown: 0.9, windup: 0.3, pack: 210,
                     radius: 11, mid: 12, ground: true, cues: GROWL, gold: [28, 44], art: WOLF('WolfGrey') },
  dark_wolf:       { name: 'Dark Wolf', behavior: 'hostile', hp: 82, damage: 17, speed: 68, notice: 180, reach: 28, close: 21, cooldown: 0.85, windup: 0.28, pack: 210,
                     radius: 11, mid: 12, ground: true, cues: GROWL, gold: [35, 55], art: WOLF('WolfDark') },
  ice_wolf:        { name: 'Ice Wolf', behavior: 'hostile', hp: 92, damage: 18, speed: 68, notice: 180, reach: 28, close: 21, cooldown: 0.85, windup: 0.28, pack: 210,
                     radius: 11, mid: 12, ground: true, effect: CHILL(2.5), cues: GROWL, gold: [40, 60], art: WOLF('WolfIce') },
  // the cave bats: in flocks in the old workings and the caves, a dash and a bite
  cave_bat:        { name: 'Cave Bat', behavior: 'hostile', hp: 26, damage: 10, speed: 72, notice: 150, reach: 14, cooldown: 1.15, windup: 0.4, pack: 180,
                     radius: 7, mid: 30, dash: { from: 70, keep: 52, speed: 250, track: 60, most: 0.45, back: 0.34 }, cues: { notice: 'hit', death: 'slimeSplat' },
                     gold: [12, 24], art: BAT('Purple') },
});
/**
 * THE BOSSES (2026-10-27, the designer: "we are going to make the bosses bigger ... a boss ice golem there [the great ice
 * cave], which is way bigger than the rest ... and we can have a few of the smaller golems. So the boss attributes and
 * boss stats of this boss is only going to apply to that"; and the others the same, "increase their stat and increase
 * their sizes so they are actually bosses. And the weapon attributes, they only apply to those bosses"): one of a kind
 * each, `size` times as large as their kind (body, reach and stamp to match), `hp` times its health, its blow a third
 * more, its Gold twice and a half, never pushed back; `boss: true`, which the weapons table (BOSS_WEAPONS), the great
 * health bar and the spawning (one, never more out in the open) read. The golems' and the slime's are kinds of their own,
 * their smaller kin round them (escort), the kin as they were; the Warlord, the two spider queens and the Arch-Lich were
 * one of a kind already, and become bosses as they stand.
 */
// (A BOSS SEES FURTHER AND REACHES FURTHER, 2026-10-28, the designer: "the range of bosses is the same as range of ... mobs ...
//  the range of bosses need to be increased, especially the golem ... Even though the player ... should be in its radar, it
//  is not attacking"): its notice 1.8 times its kind's (it was 1.3), its reach 1.2 times its size's. `leap`: its stomp a
//  leap instead, onto where you stand from further off ("when golem jumps, it can jump further ... to the player") --
//  combat.js leaps from afar, over what stands between, when you keep out of its reach)
function bossOf(d, { name, size, hp = 2.5, damage = 1.3, gold = 2.5, escort = null, leap = false }) {
  const a = d.art, near = (r) => Math.round(r * size);
  const boss = { ...d, name: name ?? d.name, boss: true, behavior: 'elite', steady: true, hp: Math.round(d.hp * hp), damage: Math.round(d.damage * damage),
    notice: Math.round(d.notice * 1.8), pack: Math.round((d.pack ?? 100) * 1.3), radius: near(d.radius ?? 9),
    reach: d.reach > 60 ? d.reach : Math.round(near(d.reach) * 1.2),      // (a caster's reach is its shot's: as it was)
    art: { ...a, scale: (a.scale ?? 1) * size, stride: near(a.stride ?? 30), room: near(a.room ?? 12), ...(a.runStride ? { runStride: near(a.runStride) } : {}) } };
  delete boss.group;                                                       // (one, not a pack: its kin come as its escort)
  delete boss.retreatAt;                                                   // (and it stands its ground to the last)
  if (d.close) boss.close = near(d.close);
  if (d.mid) boss.mid = near(d.mid);
  if (d.gold) boss.gold = d.gold.map((g) => Math.round(g * gold));
  if (d.slam) boss.slam = { ...d.slam, radius: Math.round(d.slam.radius * Math.min(size, 1.6)), damage: Math.round(d.slam.damage * damage) };
  if (escort) boss.escort = escort;
  if (leap && boss.slam) boss.slam = { ...boss.slam, leap: true };
  return boss;
}
Object.assign(ENEMIES, {
  // (each in an arena of its own in its region -- 2026-10-27, the designer: "a separate place, which looks like ... that
  //  place is reserved for a boss": design/bosses/arenas.py)
  boss_frost_golem: bossOf(ENEMIES.frost_golem, { name: 'Great Frost Golem', size: 1.8, escort: { frost_golem: 3 }, leap: true }),   // (before Frosthaven's great ice cave)
  boss_crystal_golem: bossOf(ENEMIES.crystal_golem, { name: 'Great Crystal Golem', size: 1.8, escort: { crystal_golem: 2 }, leap: true }),   // (Stonepeak, the Delvers' Court)
  // (the electric slime, the designer's choice over the golden: "maybe we could use ... the electric slime")
  storm_slime_king: bossOf(ENEMIES.storm_slime, { name: 'Storm Slime King', size: 2.6, hp: 9, escort: { storm_slime: 3 } }),   // (Whisperwood, the storm hollow)
  goblin_warchief: bossOf(ENEMIES.goblin_rogue, { name: 'Goblin Warchief', size: 2.0, hp: 10, escort: { goblin: 2, goblin_raider: 2 } }),   // (Whisperwood, the goblin camp)
  orc_warlord: bossOf(ENEMIES.orc_warlord, { size: 1.5, hp: 2, escort: { orc: 2 } }),   // (Stonepeak's south, his war camp, his two orcs with him)
  bone_spider: bossOf(ENEMIES.bone_spider, { size: 1.6 }),               // (the Gloom's deepest cave)
  vault_queen: bossOf(ENEMIES.vault_queen, { size: 1.7 }),               // (the Vault's deepest cave)
  // (the Night Court's, and the Dungeon Lord on level 6: the size it was, a little more -- the designer: "keep the size of
  //  boss inside the dungeon the same ... Maybe 10 or 20%")
  lich: bossOf(ENEMIES.lich, { size: 1.15, hp: 2 }),
});
// NO ENEMY WALKS ON WATER (2026-10-21, the designer: "some of the enemies... could cross the water by walking on top of
// it... go through each and every enemy"): every kind keeps to the land (combat.js `ground`), but the bats, which fly
export const FLIERS = new Set(['grave_bat', 'cave_bat']);
for (const [id, def] of Object.entries(ENEMIES)) if (!FLIERS.has(id)) def.ground = true;

export const DROPS = {};
// (the regional crops' seeds, now and then, from the creatures of their region: REGIONAL)
DROPS.ice_wolf = [{ item: `seed:${SEEDS.findIndex((s) => s.name === 'Fireheart Pepper')}`, chance: 0.03 }];
DROPS.thorn_bloom = [{ item: `seed:${SEEDS.findIndex((s) => s.name === 'Fairy Rose')}`, chance: 0.04 }];

/** FIELD_SOIL (2026-10-03, the designer: the Barrowmire's crops "only growable in this area"): a map's region gives its
 *  fields their soil; a seed with a `soil` grows only in that soil, and a field with a soil takes only its own seeds
 *  (farm.js soilWhy). */
export const FIELD_SOIL = { undead: 'barrow' };
/** A REGION'S OWN BED (2026-10-22, the regional crops): its fields take any seed, and the seeds of its own crop -- which
 *  grow nowhere else (farm.js soilWhy). The Barrowmire's (FIELD_SOIL) takes only its own. */
export const OWN_SOIL = { frost: 'frost', everbloom: 'bloom' };
export const SOIL_PLACE = { barrow: 'the Barrowmire', frost: "Frosthaven's seed beds", bloom: "Everbloom's seed bed" };
/** THE REGIONAL CROPS (2026-10-22, the designer liked them, "and the eating benefits"): never sold in a shop -- a harvest
 *  sometimes gives a seed back (`seedBack`), and the region's creatures sometimes drop one (DROPS); the Epic one no shop
 *  buys either (`noShop`): it is traded between farmers. Eaten raw, its boost (BUFFS). The story's parts give the first. */
export const REGIONAL = { 'Fairy Rose': { seedBack: 0.35, rarity: 'Rare' }, 'Fireheart Pepper': { seedBack: 0.25, rarity: 'Epic', noShop: true } };

/** KILLS PAY (the designer, 2026-09-30: "small Gold drops"): the server pays a kill once it could have happened --
 *  the map has that enemy, and no more of its kind in `windowS` seconds than the map sets down (commands.js
 *  'combat.loot'). */
// (2026-10-02, a player's report: a kill's Gold could be claimed from the console with no fight and no energy. A kill is
//  now paid only from the damage the farmer's own blows have landed -- commands.js swing keeps it (save.fight), and
//  'combat.loot' takes the creature's whole health out of it. keepS: how long landed damage waits for its kill; most:
//  the most creatures one sword blow is believed to reach.)
export const KILL_LOOT = { windowS: 90, keepS: 600, most: 4, cap: 1000 };
/** WHEN A CREATURE COMES BACK (2026-10-28, the designer: "normal enemies will respawn after 30 minutes of being killed, and
 *  the bosses will respawn after 2 hours of them being killed ... it doesn't need to be in a way that changing the region
 *  will respawn all the enemies"): minutes from its fall, out in the world -- each spot of a map's spawn zones remembered by
 *  the page (play.js slain), the boss's by the rules too (commands.js kill). The dungeon and the Colosseum set theirs down
 *  fresh each time, as before. */
export const RESPAWN = { foeMin: 30, bossMin: 120 };

/**
 * WHAT A BOSS PAYS (2026-10-27, the designer: "killing the boss will give the players around 900 to 1100 farming point
 * randomly ... a recurring thing ... players can fight the boss multiple times a day, but they can only get the gold and
 * farming points ... every 2 days ... the bosses will give XP every time ... more than what the normal enemies will give";
 * and each "a one-time reward"). Every kill: Combat XP, by its health as any creature's (two to ten times its kin's), and
 * no Farming Points out of it (commands.js run). Its PRIZE, once a day for each boss and each farmer, the server's
 * roll ('combat.loot'): `fp` Farming Points (never shown) and its own `gold`. The FIRST time a farmer fells it, `first`
 * besides: its Gold again, Premium Seeds, and the gem it guards. The Dungeon Lord's kill is the dungeon's to pay
 * (DUNGEON_PRIZE). Gold and the first prize are my numbers, for the designer to turn.
 */
// (ONCE A DAY, 2026-10-29, the designer: "they give the kill bonus every single day, right? ... make it so that it is once
//  every day": a fresh prize each real (UTC) day, the day the game's other limits keep -- realDay; it was every 2 days,
//  `everyMs`, counted from the last one -- commands.js bossPrize)
export const BOSS_PRIZE = {
  fp: [900, 1100],
  gold: { storm_slime_king: [1000, 1400], goblin_warchief: [1000, 1400], orc_warlord: [1400, 1900], boss_crystal_golem: [1400, 1900],
    boss_frost_golem: [1800, 2400], bone_spider: [1800, 2400], vault_queen: [2000, 2600], lich: [2000, 2600] },
  first: { seeds: [2, 3], gems: { storm_slime_king: ['Sapphire', 1], goblin_warchief: ['Topaz', 2], orc_warlord: ['Ruby', 1],
    boss_crystal_golem: ['Amethyst', 2], boss_frost_golem: ['Moonstone', 2], bone_spider: ['Emerald', 1], vault_queen: ['Diamond', 1], lich: ['Diamond', 1] } },
};
/** "1 day and 6 hours", "5 hours", "40 minutes": how long until a boss's prize is back (player words). */
export const prizeBackIn = (ms) => {
  const m = Math.max(1, Math.ceil(ms / 60_000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  const part = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (d) return h ? `${part(d, 'day')} and ${part(h, 'hour')}` : part(d, 'day');
  if (h) return mm && h < 3 ? `${part(h, 'hour')} and ${part(mm, 'minute')}` : part(h, 'hour');
  return part(mm, 'minute');
};

/** THE TOWN IS SAFE, AND SO IS HOME: no enemy is ever set down on the town's map, inside its buildings, or
 *  on the player's home island (home_island, and its cottage, interior_home) -- a zone tagged
 *  `spawn:<enemy>` there is ignored. Enemies live in the wilderness maps still to be made. */
/** NO ENERGY IN THE VIP PLACES (2026-10-26, the designer: "VIP area does not need consume any energy at all. This includes
 *  crops, dungeons, and Colosseum"): the VIP Quarter, its rooms, the Colosseum and the dungeons to come. Nothing done there
 *  spends energy (commands.js run), and the page never stops you there for being tired (hero.js ready). */
export const freeEnergyAt = (where) => /^(vip_quarter|interior_vip_|colosseum|dungeon)/.test(String(where ?? ''));
/** FP IN THE VIP PLACES (2026-10-28, the designer: "VIP area needs to give at least 2 to 3x more FP" than the rest of the
 *  valley): every Farming Point earned in the Quarter, its houses, the Dungeon or the Colosseum counts this many times
 *  (commands.js earnFp, after the day's bands). */
export const VIP_FP = 3;
/** THE VIP QUARTER IS FOR ITS OWN THINGS (2026-10-28, the designer: "butterflies inside the VIP area, players can't catch them
 *  ... foraging should only happen outside of VIP area ... players should only be able to fish, plant, go to dungeons, and
 *  other things which are designed for VIP area"): the Quarter and its houses -- no net, no picking, no axe, no pickaxe there
 *  (commands.js net, forage, work). */
export const vipPlace = (where) => /^(vip_quarter|interior_vip_)/.test(String(where ?? ''));
/** THE COLOSSEUM (2026-10-26, game/colosseum.js): its map. Out cold there nothing is lost (commands.js wake). */
export const ARENA_MAP = 'colosseum';
/** ...and how much harder than its own a creature there may strike, at most (its waves grow: colosseum.js strength) */
export const ARENA_BLOW = 3;
/** THE SIX WAVES (2026-10-26, the designer: "there will be total of 6 waves ... the waves will start with the slimes ...
 *  starting wave will have 9 slimes. Then the next wave will contain 4 slimes, and 5 slimes and 4 bats. After that I will
 *  leave it up to you ... much difficult"; then: only "the enemies which we are currently using", none made for it): [kind,
 *  how many], in the order they come out of the gates, every one a creature already set down somewhere in Bloomshire. The
 *  bigger slimes are the Crystal Slimes, the ones whose touch hurts on are the Lava Slimes (they burn). Stand through all
 *  six and the run is won. `hp` and `dmg`: each wave's creatures that much stronger than their own (a blow never past
 *  ARENA_BLOW of its own). */
export const ARENA = {
  waves: [
    [['crystal_slime', 3], ['lava_slime', 3], ['slime', 1], ['blue_slime', 1], ['pink_slime', 1]],
    [['crystal_slime', 4], ['lava_slime', 5], ['cave_bat', 4]],
    [['goblin', 5], ['goblin_raider', 5], ['goblin_rogue', 4]],
    [['wolf', 5], ['skeleton_guard', 5], ['grave_bat', 4]],
    [['orc', 4], ['goblin_raider', 4], ['goblin_rogue', 4], ['orc_warlord', 1]],
    [['skeleton_knight', 1], ['lich_mage', 1], ['skeleton_guard', 6], ['lich_adept', 2], ['dark_wolf', 4]],
  ],
  hp: [1, 1.1, 1.2, 1.3, 1.45, 1.6],
  dmg: [1, 1, 1.1, 1.15, 1.25, 1.35],
  gateS: 0.9,                           // (a portcullis going all the way up)
  spawnGap: 0.5,                        // (between one creature out of a gate and the next)
  // WHAT THE SERVER ASKS OF A WAVE STOOD THROUGH (commands.js arena.wave): no sooner than its creatures could all have come
  // out and fallen (`settleS` after the last), and the farmer's own blows to show for it -- `need` of its health, a blow
  // counted at most every `swingS` (the fight is the browser's: a wave told and never fought is not paid)
  settleS: 3, need: 0.45, swingS: 0.25,
};
/** How strong wave n's creatures are (1 to 6): health and blows as a share of their own. */
export const arenaStrength = (n) => {
  const k = Math.max(0, Math.min(ARENA.waves.length - 1, n - 1));
  return { hp: ARENA.hp[k], dmg: Math.min(ARENA_BLOW, ARENA.dmg[k]) };
};
/** Wave n's creatures, one name each, in the order they come out. */
export const arenaKinds = (n) => (ARENA.waves[n - 1] ?? []).flatMap(([kind, k]) => Array(k).fill(kind)).filter((kind) => ENEMIES[kind]);
/** The whole health wave n puts in the sand -- an escort and what a split leaves too -- as a blow must take it (armour). */
export function arenaHealth(n) {
  const s = arenaStrength(n);
  const of = (kind, depth = 0) => {
    const d = ENEMIES[kind]; if (!d || depth > 3) return 0;
    let hp = (d.hp * s.hp) / (1 - (d.armor ?? 0));
    for (const [e, k] of Object.entries(d.escort ?? {})) hp += k * of(e, depth + 1);
    if (d.split) hp += d.split.n * of(d.split.kind, depth + 1);
    return hp;
  };
  return arenaKinds(n).reduce((t, kind) => t + of(kind), 0);
}
/** The soonest wave n can be stood through after it began: its gates up, its creatures all out, a moment to fell the last. */
export const arenaMinS = (n) => ARENA.gateS + arenaKinds(n).length * ARENA.spawnGap + ARENA.settleS;
/** WHAT THE COLOSSEUM PAYS (2026-10-26, the designer: "farming points ... if they don't win ... very low ... premium seeds
 *  ... gold, not a lot ... if they are lucky ... AVS"; then: seeds "a chance" not every win, the points big and uneven; as
 *  proposed and approved). FP (Farming Points: the Season's leaderboard -- what they turn into is decided after Season 0),
 *  Gold, now and then Premium Seeds, by luck Averyn Shards; never $AVYN. A WIN: all six waves. A run LOST (fallen, or walked
 *  out): a little for each wave stood through. FP every run (the designer, 2026-10-27: no daily limit on FP); in a day (UTC)
 *  only the first `runs` runs pay a lost run's Gold, and only the first `wins` wins their Gold, seeds and Shards
 *  (commands.js 'arena.prize'). */
export const ARENA_PRIZE = {
  win: { fp: [437, 689], gold: [1500, 2600], seeds: { chance: 0.3, n: [2, 4] }, shards: [{ chance: 0.01, n: [25, 25] }, { chance: 0.15, n: [3, 9] }] },
  wave: { fp: [9, 17], gold: [60, 120] },
  lostShards: { from: 4, chance: 0.02, n: [1, 3] },
  runs: 5, wins: 3,
};
export const isSafePlace = (doc) => doc?.safe === true || /^(bloomshire_town|interior_|home_)/.test(doc?.id ?? '');
/** THE DUNGEON (2026-10-26, design/dungeon; the designer: "six explorable levels in one dungeon", three makings of each):
 *  its maps are dungeon_<level><making>, reached from the VIP Quarter, and nothing done there spends energy (freeEnergyAt).
 *  Out cold below, you are carried back up with nothing lost (commands.js wake), to the Dungeon Steps outside the
 *  Quarter's west hedge, where its stair begins (2026-10-27: design/vip-small/entrances). Its traps strike only
 *  where its map sets them and never harder than it says (a zone tagged trap:<kind> and hurt:<n>: commands.js hurt); the
 *  fire ones leave a burn. */
export const DUNGEON = { levels: 6, out: 'dungeon_court', burn: { vents: { dps: 3, seconds: 3 }, jets: { dps: 4, seconds: 3 } } };
/** Which level of the dungeon a map is (1 to 6), or 0 for none. */
export const dungeonLevel = (id) => { const m = /^dungeon_(\d+)[a-z]$/.exec(String(id ?? '')); return m ? +m[1] : 0; };

/**
 * EACH LEVEL'S GUARDIAN (2026-10-28, the designer: "the boss room will not open until the player has killed all other enemies
 * inside the dungeon level", and the boons "will appear after the player has killed the boss"). The iron gate before each
 * level's stair down opens when every creature of the level is down, and behind it, in the stair's room, waits the level's
 * guardian -- the realm's own bosses, stronger the deeper, each fearing a weapon of its own (BOSS_WEAPONS weak; down here none
 * is immune: bossTakes). Its fall brings the boon cards, and opens the stair; the last level's, the Arch-Lich, is the Dungeon
 * Lord (DUNGEON_PRIZE.lord), and its fall opens the way out. By level: [none, 1 ... 6].
 */
export const DUNGEON_GUARDS = [null, 'storm_slime_king', 'goblin_warchief', 'bone_spider', 'orc_warlord', 'vault_queen', 'lich'];
/** The share of a level's creatures (its spawn zones' count) the server needs to have seen fall before its guardian's fall is
 *  believed: the page opens the gate only when every one it set down is down, and a creature that found no ground to stand on
 *  was never set down (commands.js guardFell). */
export const GUARD_NEED = 0.6;

/**
 * A DUNGEON RUN AND WHAT IT PAYS (2026-10-26, the designer: "the dungeon rewards will still be the same. Gold, if they're
 * lucky, they can get a premium seeds and AVS as well ... maybe ores ... they'll get gold and farming points, FP ... once
 * they've completed ... Even if they haven't completed, the dungeon, die during the dungeon, they will still get a few
 * gold and FP"; the numbers mine to set). A run (save.delve, commands.js travel, kill, wake) begins at the VIP Quarter's
 * gate down to the first level; each level below reached is one cleared, if it took levelS at least; it is WON out by the
 * sixth level's far stairs with the Dungeon Lord (lord) beaten. Paid once over ('dungeon.prize', the server's roll):
 *   win    FP, Gold, by chance Premium Seeds and Averyn Shards (AVS), and ore and gems, each by its own chance
 *   level  a run not won (back up the stairs, or out cold): this for each level cleared
 *   runs   a UTC day's runs not won that pay their Gold;  wins  a day's wins that pay Gold, seeds, Shards and ore
 *          (FP, every run: the designer, 2026-10-27, "I don't want any daily limits for FP")
 */
export const DUNGEON_PRIZE = {
  win: { fp: [611, 947], gold: [2800, 4200], seeds: { chance: 0.35, n: [2, 5] }, shards: [{ chance: 0.01, n: [30, 30] }, { chance: 0.2, n: [4, 12] }],
    ores: [['Gold Ore', 0.5, [2, 4]], ['Ruby', 0.25, [1, 2]], ['Emerald', 0.25, [1, 2]], ['Amethyst', 0.25, [1, 2]], ['Diamond', 0.05, [1, 1]]] },
  level: { fp: [13, 23], gold: [80, 150] },
  levelS: 20, runs: 5, wins: 3, lord: 'lich',
  // (A LEVEL IS CLEARED BY FIGHTING IT, 2026-10-27, the economy's audit: a level counted as cleared after levelS alone, so a
  //  run walked down with not one blow paid its FP -- and FP has no day's limit. Now the farmer's own blows there must come
  //  to `need` of its creatures' whole health, and a win wants every level below cleared so: commands.js delveOn. The
  //  audit's number, for the designer to turn)
  need: 0.3,
};
/**
 * THE BOONS (2026-10-26, the designer: "before going into the next level of the dungeon ... players will get to choose
 * from three, but there are five things ... increase the damage, increase the attack speed, regenerate the HP, increase
 * the HP, increase the max HP. This is only going to be for dungeons, not the permanent system ... one more thing, I
 * need your suggestion"): on the way down to each level below the first, three cards of these six (Bloodthirst the sixth,
 * mine), one chosen ('dungeon.boon'); they stack, and last the run, in the dungeon only.
 */
export const DUNGEON_BOONS = {
  might: { name: 'Might', text: 'Your blows hit 20% harder', dmg: 0.2 },
  haste: { name: 'Haste', text: 'You swing, shoot and cast 15% faster', rate: 0.15 },
  mending: { name: 'Mending', text: 'Your wounds close by themselves, 1 health every 2 seconds', regen: 0.5 },
  respite: { name: 'Respite', text: 'Heal half your health right now', heal: 0.5 },
  vigour: { name: 'Vigour', text: '25 more health for the rest of the run', maxHp: 25 },
  bloodthirst: { name: 'Bloodthirst', text: 'Every creature you slay heals you 5', leech: 5 },
};
export const BOON_CARDS = 3;
/** The cards offered on the way down to level `depth` of run number `n` -- the same on the page and the server. */
export function boonOffer(n, depth) {
  let h = 2166136261;
  for (const ch of `${n}|${depth}|boons`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const all = Object.keys(DUNGEON_BOONS);
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return all.slice(0, BOON_CARDS);
}
/** How many of a boon the farmer holds now: on a run, in the dungeon. */
export const boonCount = (save, kind) => (save?.delve && !save.delve.end && dungeonLevel(save.where) ? (save.delve.boons ?? []).filter((b) => b === kind).length : 0);
/** Their blows, as a multiple (Might); their swings' pace (Haste); their health's top, more (Vigour). */
export const boonMight = (save) => 1 + boonCount(save, 'might') * DUNGEON_BOONS.might.dmg;
export const boonRate = (save) => 1 + boonCount(save, 'haste') * DUNGEON_BOONS.haste.rate;
/** How quickly a weapon swings: a Haste boon's, and a Sunfire Chili's (dishRate). */
export const swingRate = (save, now = gameNow()) => boonRate(save) * dishRate(save, now);
export const boonHealth = (save) => boonCount(save, 'vigour') * DUNGEON_BOONS.vigour.maxHp;

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
    else if (t === 'lock:vip') out.push({ kind: 'vip' });           // (the golden boat: VIP pass holders only)
  }
  return out;
}
/** What a quest-locked door says (game/quests.js tells this file: it imports the rules, not the other way round). */
let LOCK_HINTS = {};
export function useLockHints(h) { LOCK_HINTS = h ?? {}; }
/** A STORY'S LOCK WITH THE STORY GONE (2026-10-21): a door shut until a chapter the farm will never be given (quests.js:
 *  the Founding Farmers, retired for every Season 0 farm) is open to it -- the caves it kept (the Mirror Grotto, the Green
 *  Vein, the Gloom, the Sunken Vault) keep only their own gates, a rockfall's pickaxe. Set by quests.js. */
let neverGiven = () => false;
export function useNeverGiven(fn) { neverGiven = fn ?? (() => false); }
/** The quest a door's lock names, for this farm: a Season 0 farm's Book One stands for the playtest's opening (quests.js storyId). */
let storyAlias = (save, id) => id;
export function useStoryAlias(fn) { storyAlias = fn ?? ((save, id) => id); }
/** Why a door stays shut for this player -- a sentence -- or null when it opens. `bestPickaxe` is the best
 *  pickaxe tier they carry (0 for none). */
/** IS THE VIP QUARTER OPEN? (2026-10-23, the designer: "close the VIP for now ... we will open the VIP in 2 days"): shut,
 *  the golden boat sails for nobody but an admin (commands.js doorShut lets an admin through), whatever their VIP; the
 *  boat back from the Quarter stays open. The pass is not sold meanwhile either (catalog.js VIP_PASS_ON_SALE). */
// (OPEN WITH THE PASS, 2026-10-27: the pass is sold from Season 0's opening -- catalog.js VIP_PASS_ON_SALE -- and its golden
//  boat must sail for those who buy it; the Season 0 door keeps everyone but admins and testers out until then)
export let VIP_QUARTER_OPEN = true;
/** (for a test of the Quarter itself: dev/vip_pass_test.mjs opens it after checking it is shut) */
export const setVipQuarterOpen = (on) => { VIP_QUARTER_OPEN = !!on; };
export const VIP_CLOSED_WORDS = 'The VIP Quarter is closed for now. It opens soon.';
/** IS THE COLOSSEUM OPEN? (2026-10-27, the designer: "Colosseum won't go live as soon as season zero. Only dungeons will go
 *  live ... we will make the Colosseum go live after season zero goes live. Maybe a one or two weeks after"): shut, its
 *  gate lets nobody in but an admin (commands.js doorShut). Open it here when the time comes. */
export let COLOSSEUM_OPEN = false;
export const setColosseumOpen = (on) => { COLOSSEUM_OPEN = !!on; };
export const COLOSSEUM_CLOSED_WORDS = 'The Colosseum opens a little after the Season begins. The dungeon is open now.';
export function lockedBecause(z, save, bestPickaxe = 0, now = gameNow()) {
  if (!COLOSSEUM_OPEN && (z?.tags ?? []).includes(`to:${ARENA_MAP}`)) return COLOSSEUM_CLOSED_WORDS;
  for (const L of locksOf(z)) {
    if (L.kind === 'vip' && !VIP_QUARTER_OPEN) return VIP_CLOSED_WORDS;
    if (L.kind === 'vip' && !isVip(save, now)) return 'The golden boat sails only for VIP pass holders.';
    const id = L.id && storyAlias(save, L.id);
    if (L.kind === 'quest' && !questDone(save, id) && !neverGiven(save, id)) return LOCK_HINTS[id] ?? LOCK_HINTS[L.id] ?? 'The way is shut.';
    if (L.kind === 'step' && !questAt(save, id, L.n) && !neverGiven(save, id)) return LOCK_HINTS[id] ?? LOCK_HINTS[L.id] ?? 'Not yet.';
    if (L.kind === 'pickaxe' && bestPickaxe < L.tier) return `Fallen rock blocks the way. A ${TOOL_TIERS[L.tier].name} pickaxe or better would break through.`;
  }
  return null;
}

/** COOKING (2026-09-26, the designer: "build simple cooking"): at a stove (a zone tagged cook -- Marlow's old
 *  house, the Bakery) ingredients become a dish (DISH_BOOK, from the Cooking level each needs). EVERY INGREDIENT BY NAME (2026-10-07, the designer:
 *  a dish "requires one fish of a specific kind and then one vegetable of a specific kind ... they can't really just
 *  put any fish they want"): no "any fish", no "any crop" -- and the cook puts each one in the pot by hand, at the
 *  Hearth (ui.js).
 * DISHES ARE NOT EASY TO MAKE (2026-10-22, the designer, the economy tightened: "it will require even the veterans a lot
 * and it will also require a lot of money and energy"): every dish of the cook's book takes TWICE what DISH_BOOK lists
 * (the Founders' stew, the story's, as it was), and a pot costs Gold, energy and time on the fire (COOK_TIERS). */
export const RECIPE_TIMES = 2;
/**
 * THE KITCHEN'S STAPLES (2026-10-22, the designer's approved dish book: "the water mill and Hollin's dairy at the farm"; and
 * "everything will take time to be made"): each made at its place at Hollin's Farm (a zone tagged mill or dairy), for its
 * Gold and energy, taking its minutes -- a pot of its own at each place (commands.js cook.start, cook.take). `makes`: how
 * many one portion gives. The Gold, energy and minutes are a proposal (TEMP).
 */
export const STAPLES = [
  { item: 'Flour', at: 'mill', needs: [['Wheat', 2]], makes: 1, gold: 50, energy: 1, minutes: 2 },
  { item: 'Sugar', at: 'mill', needs: [['Beetroot', 1]], makes: 2, gold: 50, energy: 1, minutes: 3 },
  { item: 'Cream', at: 'dairy', needs: [['Milk', 1]], makes: 1, gold: 150, energy: 2, minutes: 5 },
  { item: 'Butter', at: 'dairy', needs: [['Milk', 1]], makes: 1, gold: 150, energy: 2, minutes: 10 },
  { item: 'Cheese', at: 'dairy', needs: [['Milk', 2]], makes: 1, gold: 300, energy: 2, minutes: 120 },
  { item: 'Goat Cheese', at: 'dairy', needs: [['Goat Milk', 2]], makes: 1, gold: 300, energy: 2, minutes: 120 },
  // (a horse's feed, 2026-10-23: MOUNT_STAMINA; TEMP)
  { item: 'Hay', at: 'mill', needs: [['Wheat', 2]], makes: 1, gold: 20, energy: 1, minutes: 1 },
];
/**
 * CRAFTING (2026-10-26, the designer: "there was nothing that urged or directed players to craft something. So players need
 * something to craft to upgrade their crafting level"): at a WORKBENCH -- Pell's two at the Carpenter's, Bram's anvil at the
 * Forge (zones tagged `craft`) -- in the Hearth's own window, a pot and its timer and its Claim: what the gathering brings in,
 * refined (planks, bars, rope, cloth, cut gems), then made into things (the bicycle's Repair Kit, the broomstick's Broom
 * Charm), then jewellery. Each from its Crafting level; each portion its Gold (nails, oil, polish) and energy and minutes
 * by its tier (CRAFT_TIERS), and Crafting experience (craftXp). What it makes sells to the General Store for a quarter
 * more than went in (catalog.js). The recipes and numbers are my proposal (TEMP), for the designer to turn.
 *   [item, Crafting level, needs, makes, its icon [file, sx, sy] -- null: the item's own, already in the game]
 */
const GEMS = 'Icons/RPG icons/Extras/Gemstones.png', BARS = 'Icons/RPG icons/Extras/Bars and ores.png', RINGS = 'Icons/RPG icons/Extras/Rings.png', AMULETS = 'Icons/RPG icons/Extras/Amulet.png';
export const CRAFTS = [
  ['Wooden Plank', 1, [['Wood', 3]], 1, ['Icons/RPG icons/Extras/Wood.png', 16, 0]],
  ['Copper Bar', 1, [['Copper Ore', 2]], 1, [BARS, 0, 0]],
  ['Rope', 2, [['Wheat', 3]], 1, ['Icons/RPG icons/Extras/Rope of vines.png', 0, 0]],
  ['Repair Kit', 3, [['Wooden Plank', 2], ['Copper Bar', 1]], 1, null],
  ['Cut Rose Quartz', 4, [['Rose Quartz', 2]], 1, [GEMS, 96, 0]],
  ['Broom Charm', 5, [['Rope', 1], ['Cut Rose Quartz', 1], ['Marigold', 1]], 1, null],
  ['Cut Topaz', 6, [['Topaz', 2]], 1, [GEMS, 64, 0]],
  ['Vine Ring', 7, [['Rope', 1], ['Wooden Plank', 2]], 1, [RINGS, 0, 0]],
  ['Cut Sapphire', 8, [['Sapphire', 2]], 1, [GEMS, 48, 0]],
  // (woven at Tilly's loom in the Tailor's, not at a workbench: the designer, 2026-10-26, "shouldn't cloth have a different
  //  machine?" -- its sixth, the place)
  ['Cloth', 9, [['Wool', 2]], 1, ['Icons/RPG icons/Extras/Cloth.png', 16, 32], 'loom'],
  ['Topaz Ring', 10, [['Copper Bar', 1], ['Cut Topaz', 1]], 1, [RINGS, 16, 16]],
  ['Cut Emerald', 12, [['Emerald', 2]], 1, [GEMS, 80, 0]],
  ['Gold Bar', 13, [['Gold Ore', 2]], 1, [BARS, 0, 16]],
  ['Cut Amethyst', 14, [['Amethyst', 2]], 1, [GEMS, 32, 0]],
  ['Amethyst Ring', 15, [['Gold Bar', 1], ['Cut Amethyst', 1]], 1, [RINGS, 16, 0]],
  ['Cut Ruby', 17, [['Ruby', 2]], 1, [GEMS, 16, 0]],
  ['Sapphire Amulet', 18, [['Gold Bar', 1], ['Cut Sapphire', 1], ['Cloth', 1]], 1, [AMULETS, 32, 0]],
  ['Ruby Ring', 20, [['Gold Bar', 1], ['Cut Ruby', 1]], 1, [RINGS, 0, 16]],
  ['Cut Diamond', 22, [['Diamond', 2]], 1, [GEMS, 0, 0]],
  ['Emerald Amulet', 24, [['Gold Bar', 1], ['Cut Emerald', 1], ['Rope', 1]], 1, [AMULETS, 0, 0]],
  ['Diamond Ring', 26, [['Gold Bar', 1], ['Cut Diamond', 1]], 1, [RINGS, 32, 0]],
  ['Royal Amulet', 28, [['Gold Bar', 2], ['Cut Diamond', 1], ['Cut Ruby', 1], ['Cloth', 1]], 1, [AMULETS, 0, 32]],
];

/**
 * THE RARE METALS (2026-10-26, the designer: "we need to work a lot on our mining ... I don't know what is rare and what is
 * not. So I am counting on you"): six metals of the pack's own (Icons/RPG icons/Extras/Bars and ores.png) that no rock is
 * made of. A rock or a seam broken may give one besides what it gives, once the Mining level reaches the metal's, and only
 * where that metal lies -- the deeper and the colder, the rarer: `maps` (null: any map), `caves` (any cave), its `chance`
 * a break (TEMP). Each is smelted at a workbench into its bar (CRAFTS below), for armour (ARMOUR_SETS).
 */
export const RARE_METALS = [
  { ore: 'Iron Ore', bar: 'Iron Bar', level: 5, maps: ['stonepeak'], caves: true, chance: 0.12, worth: 40, at: [32, 0] },
  { ore: 'Platinum Ore', bar: 'Platinum Bar', level: 10, maps: [], caves: true, chance: 0.09, worth: 80, at: [32, 16] },
  { ore: 'Crimson Ore', bar: 'Crimson Bar', level: 15, maps: ['cave_gloom', 'cave_gloom_2', 'cave_gloom_3'], chance: 0.08, worth: 120, at: [0, 32] },
  { ore: 'Frost Ore', bar: 'Frost Bar', level: 20, maps: ['cave_topaz_drift', 'cave_mirror_grotto', 'cave_glimmer'], chance: 0.07, worth: 150, at: [32, 32] },
  { ore: 'Shadow Ore', bar: 'Shadow Bar', level: 25, maps: ['cave_gloom_3', 'cave_vault', 'cave_vault_2'], chance: 0.06, worth: 190, at: [0, 48] },
  { ore: 'Obsidian Ore', bar: 'Obsidian Bar', level: 30, maps: ['cave_vault_2'], chance: 0.05, worth: 250, at: [32, 48] },
];
/** Where a rare metal lies: this map, for a farmer of this Mining level -- the metals that may come from a break here. */
export const metalsHere = (mapId, miningLevel) => RARE_METALS.filter((m) => miningLevel >= m.level
  && ((m.caves && String(mapId).startsWith('cave_')) || m.maps.includes(mapId)));
// (their bars, smelted at a workbench: the bar's picture beside its ore's on the pack's sheet)
CRAFTS.push(...[['Iron Bar', 6], ['Platinum Bar', 11], ['Crimson Bar', 16], ['Frost Bar', 19], ['Shadow Bar', 23], ['Obsidian Bar', 27]]
  .map(([bar, level]) => { const m = RARE_METALS.find((x) => x.bar === bar); return [bar, level, [[m.ore, 2]], 1, [BARS, m.at[0], m.at[1]]]; }));

/**
 * ARMOUR (2026-10-26, the designer: crafting and combat "we can do that right now ... wearing armour will also change the
 * look of how the player looks"): the pack's ten sets of helmet, chestplate, leggings and boots (Icons/RPG icons/Weapons and
 * Armor), made at a workbench from the set's bars (`of`, `plus` a cut gem or the Fairy Rose on the helmet and chestplate --
 * on every piece for the Fairy's) from Crafting `make`, worn from Combat `wear`. A whole set takes `off` of every blow
 * taken; each piece its share (ARMOUR_PARTS). On the farmer the chestplate is the set's armour and the helmet its helmet
 * (founding.js ARMOURS: the farmer generator draws all ten). TEMP numbers.
 */
export const ARMOUR_SETS = [
  { metal: 'Wood', dir: '1. Wood', wear: 1, make: 2, off: 0.04, of: 'Wooden Plank', per: 2 },
  { metal: 'Copper', dir: '2. Cooper', wear: 4, make: 4, off: 0.08, of: 'Copper Bar' },
  { metal: 'Iron', dir: '3. Iron', wear: 7, make: 7, off: 0.12, of: 'Iron Bar' },
  { metal: 'Gold', dir: '4. Gold', wear: 10, make: 13, off: 0.16, of: 'Gold Bar' },
  { metal: 'Platinum', dir: '5. Platinum', wear: 13, make: 13, off: 0.2, of: 'Platinum Bar' },
  { metal: 'Crimson', dir: '6. Crimson', wear: 16, make: 17, off: 0.24, of: 'Crimson Bar', plus: 'Cut Ruby' },
  { metal: 'Frost', dir: '7. Frost', wear: 19, make: 20, off: 0.28, of: 'Frost Bar', plus: 'Cut Sapphire' },
  { metal: 'Shadow', dir: '8. Shadow', wear: 22, make: 24, off: 0.32, of: 'Shadow Bar', plus: 'Cut Amethyst' },
  { metal: 'Fairy', dir: '9. Fairy', wear: 25, make: 26, off: 0.36, of: 'Platinum Bar', plus: 'Fairy Rose', plusAll: true },
  { metal: 'Obsidian', dir: '9. Obsidian', wear: 28, make: 30, off: 0.4, of: 'Obsidian Bar', plus: 'Cut Diamond' },
];
/** The four pieces: what each is called, its share of the set's `off`, and how many of the set's bars it takes. */
export const ARMOUR_PARTS = {
  head: { name: 'Helmet', share: 0.2, bars: 2 }, chest: { name: 'Chestplate', share: 0.4, bars: 4 },
  legs: { name: 'Leggings', share: 0.25, bars: 3 }, feet: { name: 'Boots', share: 0.15, bars: 2 },
};
/** An armour piece's own: { set, part } for its item id ('Iron Helmet'), or null. */
export function armourOf(id) {
  for (const s of ARMOUR_SETS) for (const [part, p] of Object.entries(ARMOUR_PARTS)) if (id === `${s.metal} ${p.name}`) return { set: s, part };
  return null;
}
/** How much of a blow the armour worn takes off (0 to 0.4): save.armour { head, chest, legs, feet } -> item ids. */
export function armourOff(save) {
  let off = 0;
  for (const [part, id] of Object.entries(save?.armour ?? {})) { const a = armourOf(id); if (a && a.part === part) off += a.set.off * ARMOUR_PARTS[part].share; }
  return Math.min(0.4, Math.round(off * 1000) / 1000);
}
/** The armour's look on the farmer (founding.js ARMOURS): { armour, helmet } metals, from the chestplate and the helmet. */
export function armourLook(save) {
  if (!ARMOUR_ON) return { armour: null, helmet: null };            // (hidden: nothing drawn, whatever a save holds)
  const chest = armourOf(save?.armour?.chest), head = armourOf(save?.armour?.head);
  return { armour: chest?.set.metal ?? null, helmet: head?.set.metal ?? null };
}
/** ARMOUR IS HIDDEN (2026-10-26, the designer: "the armors ... shouldn't go live right now. And they shouldn't even be
 *  mentioned anywhere ... maybe in season 1 or when we are public"): while off, nothing of it is made, given, shown or said
 *  -- no crafts, no items (catalog.js), no word on the Combat page (skillbook.js). The rules above wait for it. */
export const ARMOUR_ON = false;
if (ARMOUR_ON) CRAFTS.push(...ARMOUR_SETS.flatMap((s) => Object.values(ARMOUR_PARTS).map((p) => {
  const needs = [[s.of, p.bars * (s.per ?? 1)]];
  if (s.plus && (s.plusAll || p.name === 'Helmet' || p.name === 'Chestplate')) needs.push([s.plus, 1]);
  return [`${s.metal} ${p.name}`, s.make, needs, 1, [`Icons/RPG icons/Weapons and Armor/${s.dir}/${p.name}.png`, 0, 0]];
})));
/**
 * WEAPONS MADE AT A WORKBENCH (2026-10-28, the designer: "players should be able to craft their weapons, but obviously higher
 * level weapons like gold weapon or amethyst weapons, they will require much more rare minerals and ores"): a sword, a bow
 * or a staff in the tools' four metals (TOOL_TIERS: Iron, Bronze, Gold, Amethyst), each a rarity higher (WEAPON_RARITY), from
 * its Crafting level, of its metal's bars and gems and the kind's wood or string (WEAPON_KINDS). Each a weapon of its own,
 * permanent as every weapon is, its metal in its name and its picture, and in the farmer's hand (villager.js setHeld:
 * `look`, the farmer sheets' tier). One at a time (commands.js cook.start). Bought ones (the Emporium's) stay above them:
 * their knock and their heavy attacks. My numbers, TEMP, for the designer to turn.
 */
export const WEAPON_METALS = [
  { tier: 1, metal: 'Iron', rarity: 'uncommon', level: 6, look: '3', needs: [['Iron Bar', 3]] },
  { tier: 2, metal: 'Bronze', rarity: 'rare', level: 11, look: '2', needs: [['Copper Bar', 6], ['Iron Bar', 2]] },
  { tier: 3, metal: 'Gold', rarity: 'epic', level: 17, look: '4', needs: [['Gold Bar', 4], ['Platinum Bar', 2], ['Cut Emerald', 1]] },
  { tier: 4, metal: 'Amethyst', rarity: 'legendary', level: 25, look: '8', needs: [['Shadow Bar', 4], ['Gold Bar', 2], ['Cut Amethyst', 2]] },
];
/** The three kinds: the tool each is (inventory.js TOOLS), its name, its picture in the pack, and what it takes besides the metal. */
export const WEAPON_KINDS = {
  sword: { name: 'Sword', icon: 'Sword', plus: [['Wooden Plank', 1]] },
  bow: { name: 'Bow', icon: 'Bow', plus: [['Wooden Plank', 2], ['Rope', 2]] },
  staff: { name: 'Staff', icon: 'Staff', plus: [['Wooden Plank', 2], ['Cut Topaz', 1]] },
};
/** A made weapon's name ("Gold Sword"), and what a workbench's recipe of that name makes: { kind, tier, rarity, metal }. */
export const forgedName = (kind, tier) => `${WEAPON_METALS.find((m) => m.tier === tier)?.metal ?? ''} ${WEAPON_KINDS[kind]?.name ?? ''}`.trim();
export const FORGED = Object.fromEntries(WEAPON_METALS.flatMap((m) => Object.keys(WEAPON_KINDS).map((kind) =>
  [forgedName(kind, m.tier), { kind, tier: m.tier, rarity: m.rarity, metal: m.metal, look: m.look }])));
CRAFTS.push(...WEAPON_METALS.flatMap((m) => Object.entries(WEAPON_KINDS).map(([kind, w]) =>
  [forgedName(kind, m.tier), m.level, [...m.needs, ...w.plus], 1, [`Icons/RPG icons/Weapons and Armor/${TOOL_TIERS[m.tier].dir}/${w.icon}.png`, 0, 0]])));
CRAFTS.sort((a, b) => a[1] - b[1]);                                  // (the workbench's list by level, a set's pieces together)

/**
 * THE BUTTERFLY BOOK (2026-10-26, the designer: "we definitely need butterflies to catch by net ... players will have to
 * level up to unlock these butterfly to catch those butterflies. But we also need to give those butterflies some purpose"):
 * every butterfly and moth of the pack, each from its Foraging level. [name, level, where it flies (BUTTERFLY_PLACES: a
 * flying butterfly netted there is one of these, by the server's roll), a moth flying only at night]. The first is the
 * plain Butterfly the game always had. A butterfly drawn as its own kind on a map (Everbloom's) is that kind when netted.
 * The purpose: the book's sets, each paying Gold once complete (BUTTERFLY_SETS); a rarer one sells for more; the first of
 * each kind gives more Foraging experience.
 */
export const BUTTERFLIES = [
  ['Butterfly', 1, ['meadow', 'wood', 'lake', 'peak', 'bloom']], ['Cabbage White', 2, ['meadow', 'lake', 'bloom']], ['Wood White', 3, ['meadow', 'wood', 'bloom']],
  ['Orange Tip', 4, ['meadow', 'bloom']], ['Red Admiral', 5, ['meadow', 'peak', 'bloom']], ['Hairstreak Butterfly', 6, ['meadow', 'wood', 'bloom']],
  ['Cloudless Sulphur', 7, ['meadow', 'peak', 'bloom']], ['European Peacock', 8, ['meadow', 'bloom']], ['Migrant Butterfly', 9, ['meadow', 'peak', 'bloom']],
  ['Monarch Butterfly', 10, ['meadow', 'bloom']], ['Glider Butterfly', 11, ['wood', 'bloom']], ['Cinnabar Moth', 12, ['meadow', 'wood'], true],
  ['Peacock Pansy', 13, ['wood', 'bloom']], ['Eggfly', 14, ['wood', 'bloom']], ['Diadem butterfly', 15, ['wood', 'bloom']],
  ['Azure Butterfly', 16, ['lake', 'bloom']], ['Periander Metalmark', 17, ['peak', 'bloom']], ['Silkmoth', 18, ['wood'], true],
  ['Io Moth', 19, ['wood', 'lake'], true], ['Emperor Butterfly', 20, ['wood', 'bloom']], ['Glasswing Butterfly', 21, ['lake', 'bloom']],
  ['Sheep Moth', 22, ['peak'], true], ['Birdwing Butterfly', 23, ['bloom']], ['Ulysses Butterfly', 24, ['bloom']],
  ['Morpho Butterfly', 26, ['bloom']], ['Luna Moth', 28, ['lake'], true], ['Goliath Birdwing', 30, ['bloom']],
].map(([name, level, where, night = false]) => ({ name, level, where, night }));
/** Which of BUTTERFLIES' places each map is (a map not here has none to roll). */
export const BUTTERFLY_PLACES = { home_island: 'meadow', bloomshire: 'meadow', vip_quarter: 'meadow', interior_vip_greenhouse: 'meadow', dreaming_fields: 'meadow',
  whisperwood: 'wood', forest: 'wood', lake: 'lake', stonepeak: 'peak', everbloom: 'bloom' };
/** The book's sets: each species in one; complete, it pays its Gold once (commands.js bugbook.claim). TEMP rewards. */
export const BUTTERFLY_SETS = [
  { id: 'meadow', name: 'Meadow Butterflies', gold: 3000, kinds: ['Butterfly', 'Cabbage White', 'Wood White', 'Orange Tip', 'Red Admiral', 'Hairstreak Butterfly',
    'Cloudless Sulphur', 'European Peacock', 'Migrant Butterfly', 'Monarch Butterfly'] },
  { id: 'wood', name: 'Woodland Butterflies', gold: 6000, kinds: ['Glider Butterfly', 'Peacock Pansy', 'Eggfly', 'Diadem butterfly', 'Emperor Butterfly'] },
  { id: 'water', name: 'Lake and Mountain', gold: 6000, kinds: ['Azure Butterfly', 'Periander Metalmark', 'Glasswing Butterfly'] },
  { id: 'night', name: 'Night Moths', gold: 9000, kinds: ['Cinnabar Moth', 'Silkmoth', 'Io Moth', 'Sheep Moth', 'Luna Moth'] },
  { id: 'bloom', name: 'Rare Wings of Everbloom', gold: 15000, kinds: ['Birdwing Butterfly', 'Ulysses Butterfly', 'Morpho Butterfly', 'Goliath Birdwing'] },
  { id: 'all', name: 'The Whole Book', gold: 30000, kinds: null },
];
/**
 * THE RARE FISH (2026-10-26, the designer: "there will be ocean fish, river fish, and lake fish ... we can deploy those fish
 * right now, but they will be so difficult to get ... a few of those fish will only be caught in the ocean when you are on
 * the big boat ... that feature will not be available just yet"): the pack's other fish, each living in its own `water`
 * (waterOf), from its Fishing `level`, some only at night, the Faeries Fish only in Everbloom. A cast brings one up only now
 * and then (RARE_FISH_CHANCE), and then the rarer the less likely. The `boat` ones wait for the big boat, not sailing yet:
 * nobody catches them, the Fishing page tells of it. [name, level, water, night, icon file, only these regions]. TEMP.
 */
export const FISH_LADDER = [
  ['Sardine', 2, 'sea'], ['Shad', 2, 'river', false, 'River/Shad .png'], ['Large Mouth Bass', 3, 'lake'], ['Anchovy', 4, 'sea'], ['Walleye', 5, 'river'],
  ['Smallmouth Bass', 6, 'lake', false, 'Sea/Smallmouth Bass.png'], ['Herring', 7, 'sea'], ['Bullhead Catfish', 8, 'river', true], ['Bream', 9, 'sea'],
  // (the Salmon from Fishing 20, 2026-10-27: hard to come by, as the bear's best meal -- BEAR_FISH)
  ['Flounder', 10, 'sea'], ['Salmon', 20, 'river', false, 'Sea/Salmon.png'], ['Red Mullet', 12, 'sea'], ['Sea Bullhead', 13, 'sea', false, 'Sea/Sea bullhead.png'],
  ['Goby', 14, 'sea'], ['Dorado', 15, 'river'], ['Clownfish', 16, 'sea'], ['Halibut', 17, 'sea'], ['Faeries Fish', 18, 'lake', false, null, ['everbloom']],
  ['Red Snapper', 19, 'sea'], ['Glacier Fish', 20, 'ice', false, 'Sea/Glacier Fish.png'], ['Lingcod', 21, 'sea'], ['Crimson Snapper', 22, 'sea'],
  ['Pufferfish', 23, 'sea', false, 'Sea/pufferfish.png'], ['Bone Fish', 24, 'river', true], ['Lionfish', 25, 'sea', false, 'Sea/LionFish.png'],
  ['Zombie Fish', 26, 'lake', true], ['Regal Blue Tang', 27, 'sea'], ['Dynamite Fish', 28, 'river'], ['Sturgeon', 30, 'river'],
  // (the big boat's, far out at sea: not yet)
  ['Albacore', 20, 'boat'], ['Tuna', 22, 'boat'], ['Blobfish', 25, 'boat', false, 'Sea/BlobFish.png'], ['Devil Fish', 28, 'boat'], ['Anglerfish', 30, 'boat'],
].map(([name, level, water, night = false, file = null, only = null]) => ({ name, level, water, night, only,
  icon: `Icons/Fish/${file ?? `${water === 'river' || water === 'lake' ? 'River' : 'Sea'}/${name}.png`}` }));
/** One cast in this many brings up a rare fish at all (TEMP); which one, FISH_LADDER says. */
export const RARE_FISH_CHANCE = 0.04;
/** The water a line came down in, by the map or the joined world's region where it landed. */
export function waterOf(where, region = null) {
  const r = region ?? where;
  if (r === 'bay' || where === 'home_island') return 'sea';
  if (r === 'frost' || where === 'frosthaven') return 'ice';
  if (['moonmere', 'whisperwood', 'everbloom', 'lake'].includes(r) || ['lake', 'everbloom', 'whisperwood'].includes(where)) return 'lake';
  if (r === 'bloomshire' || r === 'southvale' || where === 'bloomshire_town_traced') return 'river';
  return null;
}

/** A butterfly's worth and its Foraging experience, by its level. */
export const butterflyXp = (level = 1) => 6 + 2 * (level ?? 1);

/** A craft's cost by its Crafting level: each portion's Gold and energy, and the bench's minutes (TEMP). */
export const CRAFT_TIERS = [
  { from: 1, gold: 20, energy: 1, minutes: 1 },
  { from: 5, gold: 100, energy: 1, minutes: 2 },
  { from: 10, gold: 300, energy: 2, minutes: 5 },
  { from: 15, gold: 800, energy: 2, minutes: 12 },
  { from: 21, gold: 2000, energy: 3, minutes: 25 },
];
export const craftTier = (level = 1) => CRAFT_TIERS.findLast((t) => (level ?? 1) >= t.from) ?? CRAFT_TIERS[0];
/** Crafting's experience for one portion made at `level` (a first plank 18; a Royal Amulet 180). */
export const craftXp = (level = 1) => 12 + 6 * (level ?? 1);

/**
 * WHAT A SKILL'S LEVELS GIVE besides what they open (2026-10-26, the designer: "when a player levels up their skills, it
 * should show what they have unlocked, and what that skill did ... For every skill"): the gathering skills a chance of one
 * more of what they bring in -- `extra` a level (1%: 30% at level 30), rolled the same on both sides (commands.js bonusOf);
 * Exploration a mount's stamina going further, `ride` a level (2%: 58% further at level 30 -- play.js). Farming, Cooking,
 * Animal Husbandry and Crafting open things (their seeds, dishes, animals, recipes); Combat its strength and health
 * (COMBAT). My proposal (TEMP), for the designer to turn.
 */
export const SKILL_BONUS = { woodcutting: { extra: 0.01 }, mining: { extra: 0.01 }, foraging: { extra: 0.01 }, fishing: { extra: 0.01 }, exploration: { ride: 0.02 } };

/** Where a recipe is made: 'cook' (a stove), 'mill' or 'dairy' -- or 'craft' (a workbench) or 'loom' (Tilly's, Cloth). */
export const recipePlace = (R) => R?.at ?? 'cook';
/** The places Crafting is done at (its level opens what they make, and what they make gives Crafting experience). */
export const isCraftPlace = (place) => place === 'craft' || place === 'loom';
/** Where in the save the pot of each place is kept. */
export const POT_KEY = { cook: 'pot', mill: 'millPot', dairy: 'dairyPot', craft: 'craftPot', loom: 'loomPot' };
export const RECIPES = [...DISH_BOOK.map(([dish, level, , needs]) => ({ dish, level,
    needs: dish === 'Moonlight Stew' ? needs : needs.map(([id, n]) => [id, n * RECIPE_TIMES]) })),
  // the premium dishes (the VIP Quarter's common premium crops: BUFFS)
  { dish: 'Sunfire Chili', needs: [['Sunfire Pepper', 2]] },
  { dish: 'Sapphire Jam', needs: [['Sapphire Blueberry', 2]] },
  { dish: 'Diamond Tart', needs: [['Diamond Strawberry', 2]] },
  { dish: 'Golden Pie', needs: [['Golden Pumpkin', 1]] },
  // THE KITCHEN'S STAPLES (STAPLES): made at Hollin's Farm, at the water mill and at the dairy, not at a stove
  ...STAPLES.map((x) => ({ dish: x.item, needs: x.needs, level: 1, at: x.at, makes: x.makes, staple: x })),
  // THE WORKBENCH'S (CRAFTS): made at a workbench, from the Crafting level -- `cost` its tier's, `craft` so it is known
  ...CRAFTS.map(([item, level, needs, makes, , at = 'craft']) => ({ dish: item, needs, level, at, makes, cost: craftTier(level), craft: true })),
];
/**
 * WHAT A POT COSTS (2026-10-22, the designer: recipes "cost gold, energy to cook by tier", and "every dish will take time
 * to cook ... hierarchy will take more time"): by the dish's Cooking level, each portion's Gold (the spices, the oil, the
 * firewood: Gold leaving the game) and energy, and the pot's minutes on the fire -- each portion past the first half as
 * long again. One pot on the fire at a time; it is taken out at any stove once it is done (commands.js cook.start,
 * cook.take). The minutes are a proposal (TEMP); the Gold and energy the designer's.
 */
// (COOKING'S ENERGY, BALANCED, 2026-10-23, a player: "it takes 2 energy to have 1 parsnip and 1 dish requires 4, thats
//  like 8 energy invested ... and 1 dish of that only replenishes 2 energy. Or better just require energy when cooking high
//  lvl dish"; the designer: balanced, never giving too much -- food stays one bar a day, FOOD_BARS_A_DAY. A common dish
//  costs no energy to cook, the rest half what they did: 2, 3, 4, 6, 8 were)
export const COOK_TIERS = [
  { tier: 'Common', from: 1, gold: 100, energy: 0, minutes: 1 },
  { tier: 'Uncommon', from: 5, gold: 400, energy: 1, minutes: 3 },
  { tier: 'Rare', from: 10, gold: 1000, energy: 2, minutes: 8 },
  { tier: 'Epic', from: 15, gold: 2500, energy: 3, minutes: 20 },
  { tier: 'Legendary', from: 21, gold: 6000, energy: 4, minutes: 45 },
];
export const cookTier = (level = 1) => COOK_TIERS.findLast((t) => (level ?? 1) >= t.from) ?? COOK_TIERS[0];
/** A pot of `n` portions of a dish of Cooking `level` (or of a staple: its own -- STAPLES): { gold, energy, ms }. */
export const cookCost = (level, n = 1, staple = null) => {
  const t = staple ?? cookTier(level);
  return { gold: t.gold * n, energy: t.energy * n, ms: Math.round(t.minutes * 60e3 * (1 + 0.5 * (n - 1))) };
};
/** A dish's ingredients in words: "1 Pike Fish, 1 Potato and 1 Onion". */
export const needWords = (needs) => { const w = needs.map(([id, n]) => `${n} ${id}`); return w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w.at(-1)}` : w[0] ?? ''; };
/** FORAGING: what grows wild to be picked (a zone tagged forage:<item>), and how long until it grows back. */
export const FORAGE_REGROW_MINUTES = 30;
export const FORAGE = { silvercap: 'Silvercap Mushroom', glowcap: 'Glowcap Mushroom' };

/**
 * FOOD OVER ITS WORK (2026-10-23, the designer: players "spend more energy than they get after making ... consuming that
 * food ... every food should give at least 30%, 50% more energy than what is consumed in the process of making them"):
 * a dish gives at least FOOD_OVER_WORK times the energy it took -- every ingredient's (workOf) and the stove's (cookTier)
 * -- or what LESS ENERGY FROM FOOD left it, whichever is more. Food still gives at most a bar a day (FOOD_BARS_A_DAY).
 *   a crop: sown and harvested (COST); a fish: a cast, and one now and then that gets away; a mushroom: picked;
 *   an animal's product: a feeding and the crops it ate (ANIMALS, HUSBANDRY); its meat: the butcher takes no energy,
 *   counted 1; a staple: what goes in, and the mill's or the dairy's own energy, over what it makes (STAPLES).
 * NEVER MORE THAN HALF A BAR FROM ONE DISH (2026-10-27, the designer: "this is too much energy for only one dish" -- a
 * Truffle Risotto gave 156, a Cheesecake 141, twenty seven dishes 50 or more, the dairy ones dearest to make): every dish
 * gives at most DISH_MAX_ENERGY. The dishes under it keep their half again over the work; the dear ones above it are
 * cooked for their Gold, their experience and the orders, no longer for the energy.
 */
export const FOOD_OVER_WORK = 1.5, DISH_MAX_ENERGY = 50;
const CROP_WORK = COST.sow + COST.harvest, FISH_WORK = 2, MEAT_WORK = 1;
const PRODUCT_OF = Object.fromEntries(Object.values(ANIMALS).map((A) => [A.product, A]));
const MEAT_OF = new Set(Object.values(ANIMALS).map((A) => A.meat?.[0]).filter(Boolean));
const FORAGED = new Set(Object.values(FORAGE));
/** The energy one of a dish's ingredients took to come by. */
export function workOf(item, seen = new Set()) {
  if (seen.has(item)) return CROP_WORK;
  const A = PRODUCT_OF[item];
  if (A) return HUSBANDRY.feedEnergy + A.feed[1] * CROP_WORK;
  if (MEAT_OF.has(item)) return MEAT_WORK;
  if (FORAGED.has(item)) return COST.forage;
  const st = STAPLES.find((x) => x.item === item);
  if (st) return (st.needs.reduce((t, [id, n]) => t + n * workOf(id, new Set([...seen, item])), 0) + st.energy) / (st.makes || 1);
  if (SEEDS.some((q) => q.name === item)) return CROP_WORK;
  return FISH_WORK;                                                  // (the fish, and anything else caught or found)
}
/** The energy a portion of a dish took: its ingredients and its stove. */
export const dishWork = (needs, level = 1) => needs.reduce((t, [id, n]) => t + n * workOf(id), 0) + cookTier(level).energy;
// (what goes in the pot is the recipe's -- RECIPES, the book's amounts RECIPE_TIMES over -- and one pot is one portion)
for (const [dish, e] of Object.entries(BOOK_ENERGY)) {
  const R = RECIPES.find((q) => q.dish === dish && !q.staple), cut = dish === 'Moonlight Stew' ? MOONLIGHT_ENERGY : Math.max(1, Math.round(e * FOOD_ENERGY_TIMES));
  FOOD.dishes[dish] = Math.min(DISH_MAX_ENERGY, R ? Math.max(cut, Math.ceil(dishWork(R.needs, R.level ?? 1) * FOOD_OVER_WORK)) : cut);
}
/** WHAT GROWS WILD, KNOWN BY ITS LOOK (the designer, 2026-09-26: what you see is what you get): a map object drawn
 *  with one of these IS that thing, wherever it is -- picked (forage), it is gone until it grows back. */
export const WILD = [
  { kind: 'silvercap', asset: 'Objects/Tree/Deep Forest/Fantasy Mushroom.png', x: 8, y: 128 },
  { kind: 'glowcap', asset: 'Objects/Tree/Deep Forest/Fantasy Mushroom.png', x: 8, y: 224 },
  // (the Night Court's toadstools, glowing at the dead trees' feet: Glowcaps -- refinement 6)
  { kind: 'glowcap', asset: 'region/Objects/Barrow Toadstools A.png', x: 0, y: 0 },
  { kind: 'glowcap', asset: 'region/Objects/Barrow Toadstools B.png', x: 0, y: 0 },
];
/** The kind of wild thing a map object is (either shape of object: the editor's or the file's), or null. */
export const wildOf = (o) => WILD.find((w) => o?.asset === w.asset && (o.sx ?? o.source?.x) === w.x && (o.sy ?? o.source?.y) === w.y)?.kind ?? null;
/** THE FOUNDERS' SEED takes only for a farmer who knows the land: the Farming level a seed needs to be sown. */
export const SEED_LEVEL = { 'Star Fruit': 10, 'Fairy Rose': 11, 'Fireheart Pepper': 14 };

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
 *  (2026-10-27, the designer: the caves' creatures "are much difficult to defeat. So maybe we could increase the reward
 *  as well inside those chests": about twice the ore and gems they held, and a gem more of the cave's own.) */
export const LOOT = {
  old_working:  { name: "The shift boss's chest", items: [['tool:pickaxe', 1, { tier: 2 }], ['Copper Ore', 12], ['Quartz', 6], ['Topaz', 1]] },
  topaz_drift:  { name: "The drift's tool box", items: [['tool:axe', 1, { tier: 2 }], ['Topaz', 6], ['Quartz', 4]] },
  green_vein:   { name: "The prospector's chest", items: [['tool:pickaxe', 1, { tier: 3 }], ['Emerald', 4], ['Topaz', 3]] },
  // (the Gloom's rare sword and the vault's Amethyst pickaxe and epic bow are the Founding Farmers' chapter rewards
  // now -- game/quests.js ff11, ff13 --, and Marven's rubies are mined, not found: 2026-09-26)
  gloom:        { name: 'The chest in the red deep', items: [['tool:axe', 1, { tier: 3 }], ['Amethyst', 6], ['Ruby', 1]] },
  vault:        { name: "The delvers' strongbox", items: [['tool:rod', 1, { tier: 4 }], ['Gold Ore', 8], ['Diamond', 2], ['Ruby', 2]] },
  glimmer:      { name: 'The chest under the roots', items: [['tool:rod', 1, { tier: 2 }], ['Sapphire', 6], ['Rose Quartz', 3]] },
  old_cave:     { name: 'The drowned chest', items: [['tool:rod', 1, { tier: 3 }], ['Moonstone', 4], ['Rose Quartz', 8]] },
  // THE NIGHT COURT (refinement 6): the caches the marsh lights lead to, each its own find, and the chest beside the Night
  // Stalker's empty tomb in the vault under the crypt. TEMP: the designer's to set.
  marsh_1:      { name: 'A cache in the reeds', items: [['Moonstone', 2], ['Glowcap Mushroom', 3]] },
  marsh_2:      { name: 'A cache by the water', items: [['Amethyst', 1], ['Rose Quartz', 3]] },
  marsh_3:      { name: 'A cache under the willow roots', items: [['Sapphire', 2], ['Glowcap Mushroom', 2]] },
  marsh_4:      { name: 'A cache on the isle', items: [['Ruby', 1], ['Moonstone', 2]] },
  marsh_5:      { name: 'A cache at the wood\'s edge', items: [['Emerald', 1], ['Topaz', 2]] },
  marsh_6:      { name: 'A cache on the dead land\'s shore', items: [['Gold Ore', 2], ['Amethyst', 1]] },
  night_vault:  { name: "The Night Stalker's chest", items: [['tool:rod', 1, { tier: 4 }], ['Ruby', 3], ['Diamond', 1]] },
};
/**
 * THE MIRROR POND'S CHEST (2026-10-27, the designer: in the Grotto under Mirror Pond, "a lot more enemies"; when they are
 * all killed "a chest will come out of the water"; "a big premium looking, a luxurious looking chest"; in it 500 $AVYN
 * (the designer, 2026-10-27: "I didn't say AVS, I said ... AVYN. And it will be for the first 300 players"), "two things
 * which are very exclusive, not the weapons", "an enchanted egg with lots of golden markings ... a mystery for now").
 * game/grotto.js shows it, commands.js 'grotto.chest' pays it.
 *   first   the farmers who get what is in it (admins never take a place, nor the $AVYN)
 *   avyn    whole $AVYN (the purse keeps millionths)
 *   items   the keepsakes and the egg (catalog.js: never sold, traded nor given)
 *   after   what a farmer finds once the first are gone
 *   need    the share of the cave's creatures (its spawn zones, at the least) a farmer must have killed since coming in
 *   keepMin a visit's kills kept this long (minutes) after the last: out to the pond and back, the cave is as it was
 */
export const GROTTO_CHEST = { map: 'cave_mirror_grotto', first: 300, avyn: 500, items: [['Enchanted Egg', 1], ['Mirror Pond Pearl', 1], ['Silver Looking Glass', 1]],
  after: [['Moonstone', 3], ['Sapphire', 2]], need: 0.8, keepMin: 20 };
/** How many of the cave's creatures must fall before the chest will open: GROTTO_CHEST.need of the fewest its spawn zones
 *  set down (spawnZones: a zone's count, as many again out in the open, at most 18). */
export function grottoNeed(doc) {
  let n = 0;
  for (const z of doc?.zones ?? []) for (const t of z.tags ?? []) {
    const m = /^spawn:([a-z_]+)(?::(\d+))?/.exec(t);
    if (m && ENEMIES[m[1]]) n += Math.min(18, openFoes(doc.id, +(m[2] ?? 1)));
  }
  return Math.floor(n * GROTTO_CHEST.need);
}

/** THE CHESTS FULL AGAIN (2026-10-27, the designer: the caves' chests opened in the playtest were "still empty, even though
 *  they should be filled"): a farmer's save kept which chests they had opened from before Season 0 (the season's reset,
 *  server/reset.js, had no word for it), each as the moment it was opened. A chest opened since is kept as { at } --
 *  and only those count as taken. */
export const lootTaken = (save, id) => { const at = save?.loot?.[id]; return !!at && typeof at === 'object'; };

/** THE NIGHT COURT (refinement 6, the designer's picks of the suggestions): THE DARKEST NIGHTS -- one night in `every`, chosen by the night's own number (the same for everyone), in the part of it
 *  from `from` to `to` (a fraction of the night) the Night Stalker stands on the watchtower (an Easter egg: rare, so a
 *  player must chance on it). */
export const NIGHT_COURT = { dark: { every: 12, from: 0.42, to: 0.6 } };
/** Is the Night Stalker on the tower at server time t? A darkest night, in its window (rain or not: the map's own). */
export function stalkerOut(t) {
  const day = WORLD_TIME.dayRealHours * 3600e3, light = WORLD_TIME.daylight.realHours * 3600e3, D = NIGHT_COURT.dark;
  const w = worldMs(t) - WORLD_TIME.epoch, n = Math.floor(w / day), into = ((w % day) + day) % day;
  if (into < light) return false;
  let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  if (h % D.every !== 0) return false;
  const f = (into - light) / (day - light);
  return f >= D.from && f <= D.to;
}

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
 * ENERGY (THE REWORK, 2026-10-26 -- ENERGY above). An amount, written down with the moment it was true (v, at), and
 * from there it grows:
 *   * BY ITSELF, one every ENERGY.regenMinutes, to the full bar -- online or away, the same for everyone;
 *   * SLEEPING (startRecovery, lying down in the bed at home): at the sleep's own pace instead, until the bar is full or
 *     the day's sleep is used up (sleepLeft: ENERGY.sleepBars of the bar a UTC day, a holder's foundingSleepBars at
 *     foundingSleepPace). Never a lock: getting up (getUp) keeps what it gave, and the rest of the day's sleep waits;
 *   * FOOD -- eat(): a cooked dish's value, capped by the caller at the day's bar; raw food gives nothing; and give(),
 *     a gift or an Energy Refill.
 * All times are the SERVER's (gameNow()). A save from the old passive refill is carried over once: what it had come
 * back to by then, and no more. (The old rest's `lastRecovery`, `restLeft` and `restFor` are let go: no cooldowns now.)
 */
export class Energy {
  constructor(now = gameNow()) {
    this.founding = false;
    const s = load('energy', null);
    if (s && s.v == null && s.stored != null) {                 // the old save: { stored, at }, refilling 100 per 2 hours
      this.v = Math.min(ENERGY.max, s.stored + Math.max(0, Date.now() - (s.at ?? Date.now())) * (ENERGY.max / 7.2e6));
      this.at = now; this.recovery = null; this.slept = null; this.keep();
    } else {
      this.v = s?.v ?? ENERGY.max; this.at = s?.at ?? now;
      this.recovery = s?.recovery ?? null;
      this.slept = s?.slept ?? null;                             // { day, n }: what sleep gave on that UTC day
    }
  }
  keep() { save('energy', { v: this.v, at: this.at, recovery: this.recovery, slept: this.slept }); }
  /** A Founding Farmer's bar (the account says so) -- and a VIP's, the same and never more for both: bigger, more sleep a
   *  day, and sleep twice as fast. A rest under way when it changes is planned again for the new bar (2026-10-23,
   *  players: a rest lain down for in the moment before the page knew was a 100 bar's). */
  setFounding(on, now = gameNow()) {
    if (!!on === this.founding) return;
    if (!this.recovery || this.unlimited) { this.founding = !!on; return; }
    // (A BIGGER BAR, A REST UNDER WAY: walked under the new top, 2026-10-28, a player: "they wake up with only 100 energy
    //  filled up, and when they went to town ... it showed 150". Every bar is made a 100 one and told its size after -- the
    //  page as it loads or takes the server's save, the server for each command -- and a rest written for a 150 bar was
    //  settled under the 100 first, so what it gave past 100 was cut off and the rest ended there. A bar growing takes
    //  its size first; a bar shrinking, as before, is settled under the old one.)
    if (on) this.founding = true;
    this.settle(now);
    this.founding = !!on;
    if (this.recovery) this.#plan(now, this.recovery.mult ?? 1);
    this.keep();
  }
  /** THE ADMIN (2026-09-27: "every restriction for players shouldn't apply to me"): a bar that never runs down. */
  setUnlimited(on) { this.unlimited = !!on; }
  get max() { return maxEnergy(this.founding); }
  /** A day's sleep, in energy (200, a holder's 450). */
  get sleepADay() { return this.max * (this.founding ? ENERGY.foundingSleepBars : ENERGY.sleepBars); }
  /** How fast sleep fills the bar (energy a ms): 100 in ENERGY.sleepMinutes, a holder's twice as fast. */
  get sleepRate() { return (ENERGY.max / (ENERGY.sleepMinutes * 60e3)) * (this.founding ? ENERGY.foundingSleepPace : 1); }

  /** BACK BY ITSELF, A VIP'S ALONE (2026-10-28, the designer: "only VIP holders, VIP pass holders, have that energy
   *  refill over time ... one energy every 3 minutes"): until when it comes back by itself -- the end of the farmer's VIP,
   *  the save's own (the server's and the page's alike: useSaveDoc), or `vipTo` where it is set (the checks). */
  regenUntil() { return this.vipTo ?? vipEnd(saveDoc()); }
  /** Does the energy come back by itself now? */
  regenOn(now = gameNow()) { return this.regenUntil() > now; }
  /** The amount at `now`, and what sleep gave of it since it was last written down. */
  #walk(now) {
    const max = this.max, regen = 1 / (ENERGY.regenMinutes * 60e3), r = this.recovery, vipTo = this.regenUntil();
    let v = this.v, t = this.at, slept = 0;
    const grow = (to, rate) => { if (to > t) { if (v < max) v = Math.min(max, v + rate * (to - t)); t = to; } };
    // (time with no bed: one back every regenMinutes while the VIP runs, nothing after it -- a pass run out while away
    //  gives what it gave up to its end)
    const idle = (to) => { if (vipTo > t) grow(Math.min(to, vipTo), regen); if (to > t) t = to; };
    if (r) {
      idle(Math.min(now, r.from));
      const before = v; grow(Math.min(now, r.until), r.rate); slept = Math.max(0, v - before);
    }
    idle(now);
    // (NOTHING HELD IS TAKEN BY THE BAR'S SIZE, 2026-10-28, a player: 150, then "on just one fishing, their energy dropped
    //  to 98": a bar read for a moment as a 100 one -- the server's list of who holds a Founding Farmer still loading after
    //  a restart, a page not yet told -- cut what it held down to 100 at the first thing spent. The top stops it GROWING,
    //  never what is already there. And a rest or the trickle that ends a hair under the top is the top: 149.9998 was
    //  shown as 149)
    if (v < max && max - v < 1e-3) v = max;
    return { v: Math.max(0, Math.min(Math.max(max, this.v), v)), slept };
  }
  value(now = gameNow()) { return this.unlimited ? this.max : this.#walk(now).v; }
  /** Fold what time has given into the amount (before any change): sleep's share counted against its day. */
  settle(now) {
    const w = this.#walk(now);
    if (this.recovery && w.slept > 0 && !this.unlimited) this.#slept(w.slept, this.recovery.day ?? realDay(this.recovery.from));
    this.v = this.unlimited ? this.max : w.v; this.at = now;
    if (this.recovery && (now >= this.recovery.until || this.v >= this.max - 1e-6)) this.recovery = null;
  }
  #slept(n, day) { if (this.slept?.day !== day) this.slept = { day, n: 0 }; this.slept.n += n; }
  /** Spend if there is enough; false (and nothing spent) if not. */
  spend(n, now = gameNow()) {
    if (this.unlimited) return true;
    const v = this.value(now);
    if (v + 1e-9 < n) return false;
    this.settle(now); this.v = v - n; this.keep();
    return true;
  }
  /** What sleep may still give today (a rest under way counted as it goes). */
  sleepLeft(now = gameNow()) {
    const day = realDay(now), r = this.recovery;
    let used = this.slept?.day === day ? this.slept.n : 0;
    if (r && (r.day ?? realDay(r.from)) === day) used += this.#walk(now).slept;
    return Math.max(0, this.sleepADay - used);
  }
  /** Is sleep filling the bar now? Not once the bar is full, however it got there. */
  recovering(now = gameNow()) { return !!this.recovery && now < this.recovery.until && this.value(now) < this.max - 1e-6; }
  /** Would lying down now fill the bar at all (the day's sleep not used up, the bar not full)? */
  canRest(now = gameNow()) {
    return !this.unlimited && !this.recovering(now) && this.sleepLeft(now) > 0.5 && this.value(now) < this.max - 0.5;
  }
  /** The rest from `now`: the bar's room or the day's sleep left, whichever is less, at the sleep's pace. */
  #plan(now, mult = 1) {
    const rate = this.sleepRate * mult, want = Math.min(this.sleepLeft(now), this.max - this.v);
    this.recovery = want > 1e-6 ? { from: now, until: now + want / rate, rate, mult, day: realDay(now) } : null;
  }
  /** Lie down (resting in the bed at home): sleep fills the bar until it is full or the day's sleep is used up, for as
   *  long as you lie there. False if it may not. */
  startRecovery(now = gameNow(), mult = 1) {                     // (mult: a Sapphire Jam on -- BUFFS)
    if (!this.canRest(now)) return false;
    this.settle(now);
    this.#plan(now, mult);
    this.keep();
    return !!this.recovery;
  }
  /** How long until the bed can fill this bar again (ms): the day's sleep used up and the bar not full -- till the next
   *  UTC midnight; else 0. (The HUD shows it beside the bar: game/ui.js bedWait.) */
  bedWait(now = gameNow()) {
    if (this.unlimited || this.recovering(now) || this.value(now) >= this.max - 0.5 || this.sleepLeft(now) > 0.5) return 0;
    return (realDay(now) + 1) * 86_400_000 - now;
  }
  /** Get up from the bed: what the rest has given so far is kept, and it stops. False if you were not resting. */
  getUp(now = gameNow()) {
    if (!this.recovery) return false;
    this.settle(now);
    this.recovery = null; this.keep();
    return true;
  }
  /** Eat: a cooked dish restores its value, never past the maximum; raw food restores nothing. The gain. */
  eat(name, now = gameNow(), cap = Infinity, mult = 1) {
    const n = Math.min(foodEnergy(name) * mult, cap);           // (mult: a Sapphire Jam on -- BUFFS)
    if (n <= 0) return 0;
    this.settle(now);
    const before = this.v; this.v = Math.max(this.v, Math.min(this.max, this.v + n));   // (never less than it held: #walk)
    if (this.v >= this.max - 1e-6) this.recovery = null;           // (a full bar: the rest is over)
    this.keep();
    return this.v - before;
  }
  /** A testing aid (the editor's look panel): full, now. Not reachable in the game. */
  refill(now = gameNow()) { this.v = Math.max(this.v ?? 0, this.max); this.at = now; this.recovery = null; this.keep(); }
  /** n more energy (the admin's gift, server/world2.js adminGive; an Energy Refill), up to the full bar -- a bar never
   *  holds more than its maximum. How much went in. */
  give(n, now = gameNow()) {
    this.settle(now); const was = this.v; this.v = Math.max(this.v, Math.min(this.max, this.v + n));   // (never less than it held: #walk)
    if (this.v >= this.max - 1e-6) this.recovery = null;           // (a full bar: a rest under way is over -- you may get up)
    this.keep(); return this.v - was;
  }
}

/** HEALTH (GAMEPLAY_RULES_REPORT.md A3): hurt by enemies, no passive healing; at nought, a collapse. */
export class Health {
  constructor() { const s = load('health', null); this._hp = Math.max(0, Math.min(this.max, s?.hp ?? this.max)); this.grace = 0; }
  /** 100, growing with the Combat level to 150 (COMBAT); in the dungeon, a Vigour boon's more (DUNGEON_BOONS); while a Golden
   *  Pie lasts, its more (BUFFS hearty). */
  get max() { const s = saveDoc(); return healthAt(combatLevel(s)) + boonHealth(s) + dishHealth(s); }
  /** The health now: never above the most there is now -- a Golden Pie's half hour over, its more health goes with it, on
   *  the page and the server alike (2026-10-28). */
  get hp() { return Math.min(this._hp ?? 0, this.max); }
  set hp(v) { this._hp = v; }                                       // (other files set it so: commands.js hurt, the page)
  keep() { save('health', { hp: this.hp }); }
  /** The admin: nothing hurts. */
  setUnlimited(on) { this.unlimited = !!on; if (on) this._hp = this.max; }
  /** A blow: nothing during the moment of grace after the last. True if it landed. `t` in seconds. */
  hurt(n, t = performance.now() / 1000) {
    if (this.unlimited || this.hp <= 0 || t < this.grace) return false;
    this._hp = Math.max(0, this.hp - n); this.grace = t + HEALTH.graceSeconds; this.keep();
    return true;
  }
  /** POISON, BURNING (2026-09-30, the cave spiders): n health lost a little at a time -- no grace stops it. */
  sap(n) { if (this.unlimited || this.hp <= 0) return false; this._hp = Math.max(0, this.hp - n); this.keep(); return true; }
  get down() { return this.hp <= 0; }
  /** Out cold: woken with part of your health (energy is not touched). */
  collapse() { this._hp = Math.round(this.max * HEALTH.collapseTo); this.keep(); }
  heal(n) { this._hp = Math.min(this.max, this.hp + n); this.keep(); }
  get hurtNow() { return this.hp < this.max * HEALTH.restTo; }
  /** A rest in the bed at home: health back to HEALTH.restTo of the maximum. True if it healed anything. */
  rest() { if (!this.hurtNow) return false; this._hp = Math.round(this.max * HEALTH.restTo); this.keep(); return true; }
  /** A testing aid. */
  refill() { this._hp = this.max; this.keep(); }
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
