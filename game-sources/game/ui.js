// ui.js -- THE GAME'S INTERFACE in Play: the screens designed in the UI Studio
// (tools/ui-editor), drawn over the world at the game's own 480 x 270 pixels in
// the player's theme (Mustard unless they pick Blossom or Midnight in Settings). The HUD is always there; its buttons open the
// other screens -- the quests, the map, the pause menu -- the chat
// button above them opens the chat, and Escape closes them. The arrows fold the
// menu and the quest away.
//
// What the screens show that Play really has, it fills live:
//   * energy (rules.js), and the energy it refills to
//   * THE HOTBAR (game/inventory.js): no slot is locked -- the ten slots hold
//     whatever the player put there, and with VIP there are twenty (a second
//     row, below). Drag a thing along the hotbar to arrange it (there is no bag:
//     2026-09-27 -- what is not carried is kept in a chest at home, or at the bank);
//     click a slot (or press its key) to take it in hand
//   * the name of what is in hand, and what Space (or F) would do here
//   * what was just picked up, for a few seconds
//   * the Map: the map being played, drawn from the map itself, centred on you
//   * THE TOWNSFOLK (game/npcs.js, 2026-09-25): E on someone opens the dialogue box -- their face, their
//     name, what they say, the answers their trade gives -- and from it their SHOP (buy on one tab, sell
//     from your hotbar on the other, a page at a time; the Market Hall's keeper sells chests), the BANK (Gold between your purse and the vault) or
//     the EXCHANGE (set swaps of materials; players' own offers of one coin for another: Gold, Shards, $AVYN). Everything that moves
//     Gold is the server's: asked, answered, and the save it sends back is what the windows show
//   * THE CHEST (the "storage" screen), opened by a chest at home (Play's spots): the chest's forty
//     slots over the hotbar -- drag things between them; Take all (chest to hotbar), Put all (the
//     hotbar to the chest, but the tools), Stack (only what the chest holds some of already), Sort;
//     a chest you bought and set down yourself: Pick up (when it is empty)
//   * THE PORTRAIT (top left) is the player's own upper body, drawn from the
//     villager they made, and it follows every change of look. A click on it
//     opens "Your farmer", where the look is changed layer by layer (skin, eyes,
//     hair, its colour, clothes, a hat), the farmer moving in the preview
//   * with VIP, THE SECOND ROW of the hotbar folds open above the first (its
//     arrow, or Tab, which also moves the hand between the rows)
//   * THE INTERFACE IS DRAWN FINER THAN THE WORLD (the designer, 2026-09-24:
//     "every panel is very big"). The world is scaled up by a whole number to
//     fit the window; the interface by a smaller whole number (uiScale), on its
//     own canvas, so it fills a larger view -- every screen is anchored, so each
//     piece keeps its designed size and place and simply takes less of the
//     screen. Settings' Interface size picks Small, Medium (the default, about
//     two thirds of the world's scale) or Large (the world's own scale).
//   * THE SOUND (game/sound.js): a click for a button, the hotbar taking a
//     thing in hand, a thing picked up and put down in the bag; Settings' three
//     sliders -- Music, Sounds, Ambience -- are the game's own sound levels
// Everything else on a screen -- the clock, the money, the quests, the chat's
// lines -- is still the studio's sample data until the game has it.
//
// The drawing is the studio's own code (tools/ui-editor/js/runtime), served
// read-only by this editor's server under /ui/, so a screen looks exactly as it
// did in the studio. If it cannot be had (the hosted Studio does not serve it),
// Play keeps its plain HUD.

import { serverURL, packURL } from '../util.js';
import { exactPixels } from '../png.js';
import { t as tr, LANGS, langNow, langInfo, setLang, onLang } from '../i18n.js';
import { touchFirst, touchText, withoutKey } from './touch.js';

/** THE GUIDEBOOK'S BOOK (2026-10-28): the journal's own (kit hud.book), its cover green -- its pages, its clasp and its
 *  outline as they are -- so it reads as another book (the HUD's Guide, game/guidebook.js). */
const GUIDE_GREEN = { '#ae4924': '#3f8f4f', '#8a3625': '#2f6e3c', '#c46120': '#56a35a', '#e0682b': '#6fbf6a', '#4a2123': '#1f3d29', '#32131e': '#16301f' };

/** A phone or a tablet (game/touch.js): a finger's words, the line over the hotbar without its key, the interface large. */
const TOUCH = touchFirst();
import { itemInfo, CHEST_SLOTS } from './inventory.js';
import { errandToday } from './commands.js';
import { PLAYTEST_ITEMS_FREE, WEAPON_RARITY } from './rules.js';
import { boostsOn } from './rules.js';                 // (every dish boost on now: the boosts chip and window, 2026-10-28)
import { ENERGY, MEALS, foodHealth, saveDoc, SEEDS, TOOL_TIERS, RECIPES, foodEnergy, needWords, SELL_LIMITS, goldCap, realDay, gameNow, SEED_SOURCES, BUFFS, buffLeft, WORLD_TIME, seasonAt, inSeason, REGROW_FROM_LEVEL, cookCost, waitWords, recipePlace, POT_KEY, craftXp, isCraftPlace } from './rules.js';
import { vipLeft } from './vippass.js';
/** A finger, not a mouse: a box is not focused unasked there (a phone's keyboard would come up over the game). */
const COARSE = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
import { talkFor, journal, stillWanted, wantName, carriedCount, matchesItem, trackedOf, chapterOf, QUEST, QUESTS, keptIds, keptFor, KEPT_WHY, spareFor, activeOf } from './quests.js';
import { NPCS, faceFrame, moodOf } from './npcs.js';
import { untag } from './scenes.js';
import { giftable, heartsOf, eventDue, EVENTS, GIFT_WORDS, OWN_GIFT_WORDS } from './hearts.js';
import { ITEMS, SHOPS, SWAPS, priceOf, shopBuys, levelOf, xpFor, MAX_LEVEL, MARKET, COINS, OFFER_ASSETS, coinText, coinFee, offerFees, CRYPTO_COINS, isCrypto } from './catalog.js';
import { TRADE_COINS, tradeFees, isTool } from './trade.js';
import { payTicket, settle } from './cryptopay.js';
import { SKILL_NAMES, dayOf } from './orders.js';
import { worldTime, clockText } from './clock.js';
import { LOOK_OPTIONS, ACTIONS } from './villager.js';
import { FISH_GAME, ateWords, noEnergyWords, warnBeforeEating } from './hero.js';

const PAGE = 10;               // hotbar slots in view: ten, a second ten with VIP
const TOAST_SECONDS = 3;
const NOTICE_W = 100, NOTICE_LH = 9, NOTICE_LINES = 5;                 // (the Notice's words: their width, a line's height, the most lines: hud.json)
const MAP_FRAME = { x: 3, y: 3, w: 266, h: 158 };     // where the Map screen's picture sits in its frame
const MAP_OUT = 1.5;                                  // how much further out than it opens the map zooms (2026-10-23)
const KEYS = '1,2,3,4,5,6,7,8,9,0';
/** The look's values as the character screen says them. */
const NICE = {
  skin: (v) => `Tone ${v}`,
  eyes: (v) => { const [kind, c] = v.split('/'); return kind === 'Female' ? `${c}, lashes` : c; },
  acc: (v) => (v ? v.replace(/\//g, ' ') : 'None'),
};
const nice = (k, v) => (NICE[k] ? NICE[k](v) : v);
/** The Chest window's buttons (storage.json's actions): what each does to the inventory. */
const CHEST_VERBS = {
  takeall: (id) => ['chest', { op: 'takeAll', id }], putall: (id) => ['chest', { op: 'putAll', id }], stack: (id) => ['chest', { op: 'stack', id }],
  sortchest: (id) => ['chest', { op: 'sort', id }], sortbag: () => ['sort', { area: 'bag' }],
};
/** The townsfolk's windows' actions (dialogue.json, shop.json, bank.json, exchange.json). */
const NPC_VERBS = new Set(['talk', 'shoptab', 'shoppage', 'shoprow', 'shopbulk', 'bank', 'exchtab', 'exchpage', 'swap', 'offer',
  'offerflip', 'offercoin', 'offergive', 'offerwant', 'offerstep', 'offerpost',
  // each trade's own window (build-shops.mjs), and the Market Hall
  'shoppick', 'shopqty', 'shopqtyset', 'shopbuy', 'shopbuyn', 'shopsell', 'shopsellall', 'shopselleach', 'shopsellpick', 'shopsellone', 'shopsellstack',
  'shopsellask',
  'orderdeliver',
  'mktab', 'mkcat', 'mkpage', 'mkpick', 'mkqty', 'mkqtyall', 'mkbuy', 'mkbagpick', 'mkn', 'mknall', 'mkprice', 'mkcoin', 'mklist', 'mkcollect', 'mkcancel',
  'mkitem', 'mkback', 'mksearch', 'mkmpage', 'mkhpage',
  // (a number typed: 2026-10-08 -- askNumber)
  'mktype', 'offertype', 'banktype']);
const PER_PAGE = 5, OFFERS_PER_PAGE = 3;
/** THE TRADES' OWN WINDOWS (2026-09-25, tools/ui-editor/starter/build-shops.mjs: the designer found one window
 *  for every shop "AI generated"): which each shop opens, and how many of its goods a page of it holds. */
const SHOP_SCREENS = {
  seedtool: { screen: 'shop_seeds', per: 12, word: 'Rack' }, blacksmith: { screen: 'shop_forge', per: 8 }, general: { screen: 'shop_general', per: 4 },
  bakery: { screen: 'shop_bakery', per: 6, word: 'Page' }, fisherman: { screen: 'shop_fisher', per: 4 }, carpenter: { screen: 'shop_timber', per: 1 },
  apothecary: { screen: 'shop_herbs', per: 3 },
};
/** A trade that buys only a few kinds shows them all on a board (the forge's crates, the fish prices). (Ore too, since
 *  the forge buys it: 2026-09-29 -- without it the forge's "Sell ore" board stood empty.) */
const BOARD_CATS = new Set(['resource', 'fish', 'ore']);
/** THE MARKET HALL: stalls a page, your own stalls shown, its kinds of goods (the chips: All, Crops, Seeds,
 *  Fish, Food, Goods), and what is never sold at a stall. */
const MY_STALLS = 3;
const HISTORY_ROWS = 6;          // the Marketplace's History: lines a page
/** How long ago: "just now", "5 min ago", "3 h ago", "2 days ago". */
const agoText = (t) => { const m = Math.max(0, Math.floor((Date.now() - t) / 60e3)); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} day${m >= 2880 ? 's' : ''} ago`; };
/** THE MARKETPLACE (2026-09-28, the designer's reference): its kinds down the left, a search, every item that can be
 *  listed with how many are and the cheapest, and each item's listings -- cheapest first, Gold before Shards before
 *  $AVYN. A tool is listed too (on its own, tier and uses shown); a quest's things and the chest never are. */
const MK_CATS = [['All items', null], ['Crops', ['crop']], ['Seeds', ['seed']], ['Fish', ['fish']], ['Food', ['food']],
  ['Goods', ['resource', 'ore', 'bug', 'forage']], ['Tools', ['tool', 'weapon']]];
const ITEMS_PER_PAGE = 6, LISTINGS_PER_PAGE = 5;
const MARKET_NEVER = new Set(['quest', 'furniture']);
const COIN_ORDER = ['gold', 'shards', 'avyn', 'eth', 'usdg'];
const cheapestFirst = (x, y) => COIN_ORDER.indexOf(x.coin ?? 'gold') - COIN_ORDER.indexOf(y.coin ?? 'gold') || x.price - y.price;
/**
 * THE GUIDE (testers, 2026-09-28: "introduce users to each and every icon and their corresponding uses... T for chat,
 * E for actions... how to fish... how to trade with a friend"): the HUD, part by part (`at`: its name in the HUD,
 * framed in gold as the card tells of it; none, a card in the middle). A new farmer is walked through it once they
 * have a name; Skip ends it; the keys card (?) shows it again. The TIPS come once each, the first time they are
 * wanted (play.js).
 */
export const TOUR = [
  { at: 'Farmer', title: 'You', body: 'Health (red) and energy (green). Work costs energy, but tilling and watering are free. Eat cooked food or rest in bed. Click your face to change your look.' },
  { at: 'Slots', title: 'Your hotbar', body: 'The ten things you carry, and five more in your backpack (the bag button). Press 1 to 0, or click, to hold one. Space uses it.' },
  { at: 'Quest', title: 'Your quest', body: 'What to do next, and where. A small gold marker shows the way, over a person, a place, or the door to go through.' },
  { at: 'Money', title: 'Your money', body: 'Gold, for everyday things. Averyn Shards and $AVYN, the rarer coins.' },
  { at: 'Day', title: 'The day', body: 'The time and the weather. A Bloomshire day lasts eight real hours, with a night in each, and crops grow while you are away.' },
  { at: 'Quests', title: 'The journal', body: 'Every quest you have, the story so far, and where to go next.' },
  { at: 'Skills', title: 'Skills', body: 'What you are getting better at, like farming, fishing, mining and foraging.' },
  { at: 'Map', title: 'The map', body: 'Where you are, and what is around you. Press M to open it. The wheel zooms, and you can drag it about.' },
  { at: 'Settings', title: 'Settings', body: 'Music and sounds, the size of the interface, and its look. Pick a light or a dark theme. Your language too.' },
  { at: 'Chat', title: 'Chat', body: 'Talk to everyone in town. Click here or press Enter. What you say shows over your head, too.' },
  { at: 'Guide', title: 'The guidebook', body: 'How everything in Bloomshire works, with a search at the top. Open it whenever you wonder about something.' },
  { at: 'Shop', title: 'The Emporium', body: 'Averyn Shards, and Moonlight Stew. A bowl fills your energy right up.' },
  { at: 'Wallet', title: 'Your wallet', body: 'Your own crypto wallet, inside the game. Receive, send and swap coins, and deposit Averyn Shards. Only your password opens it.' },
  { at: null, title: 'The keys', body: 'E talks, opens and rows the boat. Space uses what you hold. Beside another player, E asks them to trade. ? shows every key.' },
];
export const TIPS = {
  fishing: [{ at: 'Slots', title: 'Fishing', body: 'Face the water from the bank. Hold Space to wind up, then let go to cast. When a fish bites, press Space while the needle is in the green.' }],
  trading: [{ at: null, title: 'Trading', body: 'Stand beside another player and press E to trade with them. You each choose what to give, and both must confirm.' }],
  // (2026-09-29: the Moonstone Circle's order is written in two books, and nothing said a book could be read)
  reading: [{ at: 'Slots', title: 'Books and notes', body: 'Something you can read is in your hotbar. Hold it and press Space to read it. What is written in it may be what a quest needs.' }],
};

/** A price short enough for a narrow price tag (testers, 2026-09-28: the Fisherman's rods ran into each other):
 *  2500 -> "2.5k", 120000 -> "120k", under a thousand as it is. The exact price shows where there is room. */
const shortGold = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}m` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n ?? 0));
/** An amount with its coin's name: "9.75 $AVYN", "1,500 Gold". */
const amountText = (coin, units) => `${coinText(coin, units)} ${COINS[coin]?.name ?? ''}`;
/** TYPE A NUMBER (askNumber): its value as it is typed -- "7870", "0.25" (no thousands marks, no trailing zeros) -- and as
 *  it is read ("7,870 Gold", "0.25 $AVYN"; a count as a count). */
const plainOf = (a, v) => (a.dec ? String(+(v / a.unit).toFixed(a.dec)) : String(Math.round(v / a.unit)));
const numText = (a, v) => (a.coin ? amountText(a.coin, v) : Math.round(v).toLocaleString('en-US'));
/** THE COINS BETWEEN PLAYERS (2026-09-28: $AVYN too). The Exchange's +/- step, in whole coins -- down to a
 *  hundredth only while $AVYN is on the offer -- and a step in a coin's own units (never less than one of them). */
const exSteps = (ex) => (ex.give.asset === 'avyn' || ex.want.asset === 'avyn' ? [0.01, 0.1, 1, 10, 100] : [1, 10, 100]);
const stepUnits = (coin, s) => Math.max(COINS[coin].step, Math.round(s * COINS[coin].unit));
/** An amount moved to another coin, its number kept as near as it can be: 2.5 $AVYN -> 3 Gold. */
const recoin = (units, from, to) => { const c = COINS[to]; return Math.max(c.step, Math.round((units / COINS[from].unit) * c.unit / c.step) * c.step); };
/** A stall's price buttons: -/+ and the big step, in the coin's units ($AVYN by tenths, and a whole one; ETH by
 *  0.0001 and 0.001; USDG by 0.1 and 1). */
const PRICE_STEP = { gold: 1, shards: 1, avyn: 100_000, eth: 100_000, usdg: 100_000 };
/**
 * THE STALL'S COIN IS REMEMBERED (2026-10-12, players: "we list for Shards, but when it sells it gives us Gold"): the
 * Market window opened priced in Gold every time, so a farmer who had sold for Shards before picked the goods, typed the
 * price and listed it -- in Gold, and was paid in Gold. Now the window opens in the coin last chosen (in this browser),
 * at that coin's own starting price, and the List and Collect buttons name the coin.
 */
const MK_COIN_KEY = 'bloomshire.market.coin';
const MK_START = { gold: 10, shards: 1, avyn: 1_000_000 };
const lastMkCoin = () => { try { const c = localStorage.getItem(MK_COIN_KEY); return MARKET.coins.includes(c) ? c : 'gold'; } catch { return 'gold'; } };
const keepMkCoin = (c) => { try { if (MARKET.coins.includes(c)) localStorage.setItem(MK_COIN_KEY, c); } catch { /* this page only */ } };
const BIG_STEP = { gold: '+10', shards: '+10', avyn: '+1', eth: '+.001', usdg: '+1' };
/** TRADING FOR CRYPTO (2026-09-28, server/crypto.js): the 2.5% of a crypto price, as Bloomshire Pay takes it on the
 *  chain (rounded down, in the coin's smallest units -- exact at the price steps). */
const cryptoFee = (units) => Math.floor((units * 250) / 10000);
/** FACE TO FACE (trade.json, game/trade.js): the Trade window's actions -- a hotbar thing in, one of yours back out,
 *  the coin and its step, less or more of it, confirm, call it off. */
const TRADE_VERBS = new Set(['trbag', 'troff', 'trcoin', 'trstep', 'trless', 'trmore', 'trok', 'trcancel', 'trtype']);
/** The Trade window's step: in whole coins for a coin (to a hundredth for $AVYN), in things for what you carry. */
const coinSteps = (coin) => ({ avyn: [0.01, 0.1, 1, 10, 100], eth: [0.0001, 0.001, 0.01, 0.1], usdg: [0.1, 1, 10, 100] }[coin] ?? [1, 10, 100]);
const thingStep = (s) => Math.max(1, Math.round(s));
/** A stall's coin, for a row: its price and icon ('' is the stat's own gold coin), and whether it is Gold, crypto (its
 *  price written out, no coin drawn) or another of the game's coins. */
const coinOf = (coin = 'gold', units = 0) => ({ coin, gold: coin === 'gold', crypto: isCrypto(coin), other: coin !== 'gold' && !isCrypto(coin),
  coinName: COINS[coin]?.name ?? '', coinIcon: COINS[coin]?.icon ?? '', priceText: coinText(coin, units) });
/** What you may say to someone, by their trade: [label, what it does]. */
function answersFor(def) {
  const bye = ['Goodbye', 'bye'], more = ['Tell me more', 'more'];
  if (def.role === 'shop') return [['Buy and sell', 'shop'], more, bye];
  if (def.role === 'bank') return [['My vault', 'bank'], more, bye];
  if (def.role === 'exchange') return [['Trade', 'exchange'], more, bye];
  if (def.role === 'market') return [['The Marketplace', 'market'], ['Buy a chest', 'shop'], more, bye];
  if (def.role === 'quest') return [['Any work for me?', 'work'], more, bye];
  if (def.role === 'ferry') return [['Take me across', 'ferry'], more, bye];
  if (def.role === 'seeds') return [['Premium Seeds', 'seeds'], ['Buy a VIP chest', 'shop'], more, bye];   // (the VIP Shop's keeper: game/seedshop.js; the VIP chest)
  if (def.role === 'garden') return [['The garden', 'garden'], more, bye];            // (the Celestial Garden's keeper: game/garden.js)
  return [more, bye];
}
/** The Emporium window's own actions (game/goodsshop.js). */
const EMP_VERBS = new Set(['emptab', 'empkind', 'emppage', 'empcoin', 'emppick', 'empadd', 'empdrop', 'empclear', 'empbuy', 'emppass', 'emprefill']);
const itemRefOf = (id, slot = null, tierDir = '3. Iron') => {
  const info = itemInfo(id, tierDir, {}, slot);
  if (info?.icon) return { ...info.icon };
  const it = ITEMS[id]; return it?.icon ? { file: it.icon[0], sx: it.icon[1] ?? 0, sy: it.icon[2] ?? 0 } : '';
};
const nameOf = (id, slot = null) => itemInfo(id, '3. Iron', {}, slot)?.name ?? ITEMS[id]?.name ?? id;   // ("Bronze Axe": the slot's own metal)
/** Settings' Interface size: how fine the interface is drawn against the world, and where the choice is kept. */
export const UI_SIZES = ['Small', 'Medium', 'Large'];
const UI_RATIO = { Small: 0.45, Medium: 0.67, Large: 1 };
const UI_SIZE_KEY = 'bme.play.uiSize';
/** Settings' Interface theme (2026-09-25: "people can choose whatever UI they want"): kept in this browser. */
const UI_THEME_KEY = 'bme.play.uiTheme';

/**
 * The interface's whole-number scale, in device pixels, for a world drawn at `s`: the chosen fraction of
 * it, but never under two CSS pixels to one of the interface's (its letters stay readable), and never
 * over the world's own. A world scaled to fill a touch screen (play.js fit: not a whole number) has an
 * interface scaled the same way: the same rule, unrounded.
 */
export function uiScale(s, dpr = 1, size = 'Medium') {
  const ratio = UI_RATIO[size] ?? UI_RATIO.Medium;
  if (!Number.isInteger(s)) return Math.max(Math.min(s, 2 * dpr), Math.min(s, s * ratio));
  const least = Math.min(s, Math.max(2, Math.round(2 * dpr)));
  return Math.max(least, Math.min(s, Math.round(s * ratio)));
}

/** Settings' sliders, and the sound level each one is (game/sound.js). */
const LEVELS = { Music: 'music', Sounds: 'sfx', Ambience: 'ambience' };
/** The interface's pixel font (ui/runtime/uifont.js), once loaded: its glyph packs are fetched through it. */
let UIFONT = null;

/** Load the studio's screens and drawing code; resolves to a GameUi, or throws. */
export async function loadGameUi(assets) {
  const base = serverURL('ui/');
  const bundle = fetch(base + 'bundle.json').then((r) => { if (!r.ok) throw new Error(`the UI bundle: ${r.status}`); return r.json(); });
  const [{ Kit }, { Fonts }, { resolveTheme, THEMES, PLAYER_THEMES }, { ScreenStack }, pf, data, uf] = await Promise.all([
    import(base + 'runtime/kit.js'), import(base + 'runtime/font.js'), import(base + 'runtime/theme.js'),
    import(base + 'runtime/screens.js'), import(base + 'PixelFont.js'), bundle, import(base + 'runtime/uifont.js')]);
  // CHINESE and other scripts the pixel font has not got (2026-09-29): their characters come as a glyph pack, fetched
  // the first time one is drawn (a player's chat line too, in any language) -- or at once for a language that needs it
  UIFONT = uf;
  // (2026-10-26: 10 px characters, a pack for Chinese and one for Japanese -- langs.js `glyphs`, true or 'ja' -- and a page
  //  in either has taller lines)
  uf.setGlyphLoader((name) => fetch(base + `fonts/${name === 'ja' ? 'cjk-10px-ja' : 'cjk-10px'}.json`).then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }));
  const glyphsFor = () => { const g = langInfo().glyphs; if (g) uf.preloadGlyphs(g === 'ja' ? 'ja' : null); uf.setTall?.(!!g); };
  glyphsFor(); onLang(glyphsFor);                                   // (however the language is changed)
  const loadImg = (p) => new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i); i.onerror = () => no(new Error(`could not load ${p}`));
    i.src = packURL(p);
  });
  // (the sheets' pixels as their files have them, for cutting icons and recolouring: a canvas read back is noised by
  //  privacy-minded browsers -- Brave's fingerprinting protection -- and speckled the interface there. js/png.js)
  const kit = await new Kit(data.kit, loadImg, (p) => exactPixels(packURL(p))).load();
  const pictures = new Map();
  let ui = null;
  const picture = (f) => {
    if (!f) return null;
    if (f === 'live:map') return ui?.mapCanvas ?? null;             // the map being played (GameUi draws it)
    if (f.startsWith('live:emp')) return ui?.goods?.canvas(f) ?? null;  // the Emporium's good, large and alive (game/goodsshop.js)
    let p = pictures.get(f);
    if (!p) {
      p = { img: new Image(), ok: false };
      p.img.onload = () => { p.ok = true; };
      p.img.src = base + 'backdrops/' + encodeURIComponent(f);
      pictures.set(f, p);
    }
    return p.ok ? p.img : null;
  };
  const art = new Map();
  const icon = (f) => {
    if (f === 'live:portrait') return ui?.portraitCanvas ?? null;   // the player's own upper body (GameUi draws it)
    if (f === 'live:npc') return ui?.npcCanvas ?? null;             // the townsperson you are talking to
    if (f === 'live:body') return ui?.bodyCanvas ?? null;           // ...and the whole farmer, moving, for "Your farmer"
    if (f.startsWith('live:emp')) return ui?.goods?.canvas(f) ?? null;  // the Emporium's good picked, live (game/goodsshop.js)
    if (f.startsWith('art:')) {                                      // the interface's own art: the Avyn coin and shard
      let a = art.get(f);
      if (!a) { a = { img: new Image(), ok: false }; a.img.onload = () => { a.ok = true; }; a.img.src = base + 'art/' + encodeURIComponent(f.slice(4)); art.set(f, a); }
      return a.ok ? a.img : null;
    }
    const rec = assets.image(f); return rec.state === 'ok' ? rec.img : null;
  };
  ui = new GameUi((onAction, onEvent) => new ScreenStack({
    screens: data.screens, kit, fonts: new Fonts(pf), theme: resolveTheme(data.theme), icon, picture, base: 'hud', onAction, onEvent,
    // (every word the screens show, in the player's language: i18n.js -- and on a phone or a tablet, a finger's words
    //  first: "Tap your face", not "Click" -- game/touch.js)
    t: TOUCH ? (s) => tr(touchText(s, langNow() === 'en')) : (s) => tr(s),
  }));
  // the themes a player may wear (theme.js PLAYER_THEMES), and the one they last chose
  const ids = (PLAYER_THEMES ?? [data.theme]).filter((id) => THEMES?.[id]);
  ui.themes = { ids: ids.length ? ids : [data.theme], resolve: resolveTheme, name: (id) => THEMES?.[id]?.name ?? id };
  let saved = null;
  try { saved = localStorage.getItem(UI_THEME_KEY); } catch { /* the bundle's own */ }
  ui.setUiTheme(ui.themes.ids.includes(saved) ? saved : ui.themes.ids.includes(data.theme) ? data.theme : ui.themes.ids[0], { keep: false });
  return ui;
}

const h_look = (hero) => hero.rig.look;

/** The opaque box of frame f in a baked strip: its top row and its middle across (null if the frame is empty). */
/** "4h 05m", "35m": how long, for the bed's wait. */
function waitText(ms) {
  const m = Math.max(1, Math.ceil(ms / 60e3)), h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

function opaqueBox(canvas, f, cw, ch) {
  const d = canvas.getContext('2d').getImageData(f * cw, 0, cw, ch).data;
  let top = ch, x0 = cw, x1 = -1;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3] > 20) { if (y < top) top = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  return x1 < 0 ? null : { top, cx: (x0 + x1 + 1) / 2 };
}

export class GameUi {
  constructor(makeStack) {
    this.stack = makeStack((verb, arg, from, arg2) => this.action(verb, arg, from, arg2), (type, d) => this.heard(type, d));
    this.hero = null; this.inv = null; this.energy = null; this.map = null; this.setLook = null;
    this.soundOf = () => null;   // Play's sound, once it has loaded
    let size = null;
    try { size = localStorage.getItem(UI_SIZE_KEY); } catch { /* the default */ }
    this.uiSize = UI_SIZES.includes(size) ? size : TOUCH ? 'Large' : 'Medium';     // (a phone or a tablet: as big as it goes)
    this.row2Open = false;       // with VIP: the second row of the hotbar is folded open
    this.bpPage = 0;             // which ten of the hotbar the Backpack shows
    this.portraitCanvas = null; this.bodyCanvas = null; this.faceKey = ''; this.time = 0;
    this.counts = null;          // what is carried, by id, to see what was just picked up
    this.toastT = 0;
    this.picked = 0;             // the bag cell picked in the Backpack
    this.mapCanvas = null;       // the map being played, drawn small while the Map window is open
    this.chest = null;           // the chest the Chest window shows: { id, name }
    this.talk = null;            // the townsperson the dialogue box shows: { p, words, answers }
    this.shop = null; this.bank = null; this.ex = null; this.mk = null;   // their windows' own state
    this.npcCanvas = null; this.npcFaceOf = null; this.busy = false;
    this.act = () => ({ ok: false }); this.session = () => null;
    this.last = performance.now();
  }

  /** Point the interface at this Play's player -- the look it changes (setLook), and the map, to draw it for the Map window. */
  attach({ hero, inv, energy, health = null, map = null, setLook = null, sound = null, onHelp = null, onQuit = null, name = null, game = false, act = null, session = null, quests = null, onEmporium = null, onWallet = null, onFounders = null, onWallets = null, onChat = null, chatUnread = null, sky = null, onAdmin = null, onLeaderboard = null, onFriends = null, onInbox = null, inboxUnread = null, onRide = null, canRide = null, onGuide = null, onBoosts = null, exact = null, others = null, joystick = null, onVipPass = null, vipUntil = null, onSeedShop = null, onGarden = null, buffs = null }) {
    if (exact) this.exact = exact;               // Settings' Pixel-perfect scaling: { now(), set(on) } (Play.fit)
    if (others) this.others = others;            // Settings' Show other players: { now(), set(on) } (Play.othersOn)
    if (this.others && !this.othersRow && this.stack.has('settings')) { this.othersRow = true; this.#othersSwitch(); }
    if (joystick) this.joystick = joystick;      // Settings' Fixed joystick, on a phone or a tablet: { now(), set(on) } (game/touch.js)
    if (this.joystick && this.othersRow && !this.joyRow && this.stack.has('settings')) { this.joyRow = true; this.#joySwitch(); }
    if (onEmporium && !this.onEmporium) this.#shopButton();
    if (onEmporium) this.onEmporium = onEmporium; // the Averyn Emporium (game/emporium.js)
    if (buffs) this.buffsOf = buffs;                 // the premium dishes' boosts on now (rules.js BUFFS): the HUD's chip
    if (onGarden) this.onGarden = onGarden;         // the Celestial Garden's panel (game/garden.js): its keeper's answer
    if (onSeedShop) this.onSeedShop = onSeedShop;   // the VIP Shop's counter (game/seedshop.js): its keeper's answer
    if (onVipPass) this.onVipPass = onVipPass;     // the VIP Pass (game/vippass.js): the HUD's VIP badge
    if (vipUntil) this.vipUntil = vipUntil;        // ...and until when the farmer's pass runs (their save's)
    if (onWallet && !this.onWallet) this.#walletButton();
    if (onWallet) this.onWallet = onWallet;       // the player's Bloomshire Wallet (game/walletui.js)
    if (onFounders && !this.onFounders) { this.#foundersButton(); this.#eliteRibbon(); }
    if (onFounders) this.onFounders = onFounders; // the Founding Farmers window (game/foundersui.js)
    if (onWallets && !this.onWallets) this.#walletsButton();
    if (onWallets) this.onWallets = onWallets;     // the player's own wallets, linked (game/linkwallets.js)
    if (onChat) this.onChat = onChat;             // the global chat (game/chat.js): the HUD's chat button opens it
    if (chatUnread) this.chatUnread = chatUnread; // ...and its badge counts what came while it was shut
    if (sky) this.sky = sky;                      // the weather (game/weather.js): the HUD's little sky
    // THE TOWN'S BOARDS (2026-10-02, the designer: "right under the profile section"): a button under the farmer's card,
    // a trophy and the word (game/leaderboard.js) -- and the admin's own beside it
    if (onLeaderboard && !this.onLeaderboard && this.stack.has('hud')) {
      this.#addTo('hud', 'HUD parts', { id: 'lbbtn', type: 'button', name: 'Leaderboard', x: 8, y: 62, w: 106, h: 18, anchor: 'tl', label: 'Leaderboard', family: '@soft',
        state: 'normal', bare: false, icon: '', glyph: 'trophy', action: 'leaderboard' });
    }
    if (onLeaderboard) this.onLeaderboard = onLeaderboard;
    // FRIENDS (2026-10-03, game/friends.js): a button under the boards' -- the list, the requests, the trade setting
    if (onFriends && !this.onFriends && this.stack.has('hud')) {
      this.#addTo('hud', 'HUD parts', { id: 'frbtn', type: 'button', name: 'Friends', x: 8, y: 84, w: 106, h: 18, anchor: 'tl', label: 'Friends', family: '@soft',
        state: 'normal', bare: false, icon: '', glyph: 'heart', action: 'friends' });
    }
    if (onFriends) this.onFriends = onFriends;
    // THE INBOX (2026-10-26, game/inbox.js): under Friends -- gifts, friend and trade requests, stalls sold -- its badge the
    // messages not yet read
    if (onInbox && !this.onInbox && this.stack.has('hud')) {
      // (an envelope, the kit's own -- hud.mail: the button's mail glyph read as a blank box, 2026-10-28, the designer)
      this.#addTo('hud', 'HUD parts', { id: 'inbtn', type: 'button', name: 'Inbox', x: 8, y: 106, w: 106, h: 18, anchor: 'tl', label: 'Inbox', family: '@soft',
        state: 'normal', bare: false, icon: 'hud.mail', glyph: '', action: 'inbox', badge: '{mail}' });
    }
    if (onInbox) { this.onInbox = onInbox; this.inboxUnread = inboxUnread; }
    // RIDE & PETS (2026-10-23, game/ridewheel.js): under the Inbox, for a farmer with a mount or a pet -- the wheel, on a
    // phone as at a keyboard (R)
    if (onRide && !this.onRide && this.stack.has('hud')) {
      this.#addTo('hud', 'HUD parts', { id: 'ridebtn', type: 'button', name: 'Ride and pets', x: 8, y: this.onInbox ? 128 : 106, w: 106, h: 18, anchor: 'tl', label: 'Ride & pets', family: '@soft',
        state: 'normal', bare: false, icon: '', glyph: 'star', action: 'ride', showIf: 'canRide' });
    }
    if (onRide) { this.onRide = onRide; this.canRide = canRide; }
    // THE GUIDEBOOK (2026-10-28, the designer: "a very small icon of a book, a different colored book, right under ride and
    // pets", game/guidebook.js): the journal's own book, green, under Ride & pets -- or in its place while that is not there
    if (onGuide && !this.onGuide && this.stack.has('hud')) {
      this.#addTo('hud', 'HUD parts', { id: 'guidebtn', type: 'button', name: 'Guide', x: 8, y: this.onInbox ? 150 : 128, w: 22, h: 22, anchor: 'tl', label: '', family: '@soft',
        state: 'normal', bare: false, icon: 'hud.book', iconMap: GUIDE_GREEN, action: 'guidebook' });
    }
    if (onGuide) this.onGuide = onGuide;
    if (onBoosts) this.onBoosts = onBoosts;                // (your boosts: game/boostsui.js)
    // THE BOOSTS' CHIP BESIDE FRIENDS (2026-10-27): hud.json has it at y 106, under Friends -- the Inbox's own place since
    // 2026-10-26, and the Inbox, drawn after it, covered it whole: a meal's timer ("Milkshake 20m") never showed. Under the
    // last button it met the chat's on a phone's short screen; so it takes the VIP badge's old place beside Friends, as the
    // Admin's is beside the boards' (its x follows the buttons' width: #fill)
    if (this.stack.has('hud') && !this.boostsMoved) { this.boostsMoved = true; this.#rebind('hud', { Boosts: { x: 118, y: 84, w: 96 } }); }
    // THE BED'S WAIT (2026-10-03, players: "I slept, but my energy is not full"): beside the energy bar, while the bed cannot
    // fill it and it is under half, how long until it can (game/rules.js bedWait) -- tapped, the rule in a sentence
    if (this.stack.has('hud') && !this.bedPill) {
      this.bedPill = true;
      this.#addTo('hud', 'HUD parts', { id: 'bedbtn', type: 'button', name: 'Bed wait', x: 152, y: 37, w: 96, h: 16, anchor: 'tl', label: 'Bed {bedWait}', family: '@soft',
        state: 'normal', bare: false, icon: '', glyph: 'home', action: 'bedinfo', showIf: 'bedWait' });
    }
    if (onAdmin && !this.onAdmin && this.stack.has('hud')) {
      // the admin's desk (game/admin.js): a gold button under the farmer's card, for an admin alone (beside the boards')
      this.#addTo('hud', 'HUD parts', { id: 'admbtn', type: 'button', name: 'Admin', x: this.onLeaderboard ? 118 : 8, y: 62, w: 46, h: 18, anchor: 'tl', label: 'Admin', family: '@warn',
        state: 'normal', bare: false, icon: '', action: 'admin' });
    }
    if (onAdmin) this.onAdmin = onAdmin;
    if (!this.fishBarAdded && this.stack.has('hud')) { this.fishBarAdded = true; this.#fishBar(); }
    if (!this.hudFreed && this.stack.has('hud')) { this.hudFreed = true; this.#freeFromHud(['Prompt', 'Toast', 'Fishing', 'Cast']); }
    if (act) this.act = act;                     // an action by the shared rules (Play.act)
    if (quests) this.quests = quests;            // Play's side of the quests: the save, the name box, a finished quest
    if (session) this.session = session;         // the session: asks of the server, the Exchange's board
    this.hero = hero; this.inv = inv; this.energy = energy; this.map = map; this.counts = null; this.mapCanvas = null; this.mapRegions = null;
    if (health) this.health = health;
    if (setLook) this.setLook = setLook;
    if (sound) this.soundOf = sound;
    if (onHelp) this.onHelp = onHelp;           // How to play: the card of keys
    if (onQuit) this.onQuit = onQuit;           // Save & quit (the game: everything is already kept; sign out)
    if (name) this.playerName = name;           // the signed-in player's name, for the HUD
    if (game && !this.game) { this.game = true; this.#truthful(); }
  }

  /**
   * THE GAME SHOWS ONLY WHAT IS TRUE. The studio's screens carry sample data (12,450 gold, "Lv 16", quests
   * from Maren and Wren) so a designer can see them filled; a player must not. What the game does not have
   * yet reads as a beginning: no money, level 1, one first quest -- walk the town -- and nothing made up.
   */
  #truthful() {
    const S = this.stack;
    const first = { title: 'Your first day', giver: 'Bloomshire',
                    text: 'Walk the town. See the square, the shops, the river and the fields. Your first real quests are on their way.' };
    if (S.has('journal')) {
      S.set('journal', { quests: [{ title: first.title, giver: 'Welcome to Bloomshire', glyph: 'alert', color: '@warn' }], quest: first });
      S.run('hide:Giver face;hide:Reward xp;hide:Done mark;hide:Step 1;hide:Open mark;hide:Step 2', 'journal');
      // THE QUESTS (game/quests.js): the list picks by its rows; the detail tells the quest's story, then EVERY
      // step so far, done or in hand -- an `all` step as each of its parts (the designer, 2026-09-26: "what does
      // an ordinary day's work mean?"); Track follows the quest picked (its place marked on the map)
      // (the giver's line the page's whole width, 176: the face beside it is hidden, and "Founding Farmers, chapter 12 of 18"
      //  ran past the 146 it had -- 2026-10-27)
      this.#rebind('journal', { 'Quest list': { action: 'questpick:{row}' }, 'List label': { text: '{listLabel}' }, Giver: { x: 12, y: 26, w: 176, maxLines: 1, text: '{quest.from}' },
        Story: { y: 38, h: 34 }, 'To do': { y: 74, showIf: 'quest.hasSteps' },
        'Reward gold': { text: '{quest.gold}', showIf: 'quest.gold' },
        Track: { label: '{quest.trackLabel}', action: 'questtrack', showIf: 'quest.canTrack', glyph: 'star' } });
      this.#addTo('journal', 'Detail', { id: 'qsteps', type: 'list', name: 'Quest steps', x: 12, y: 84, w: 176, h: 52, anchor: 'tl', rows: [], itemH: 10, gap: 0,
        columns: 1, clip: true, source: 'quest.steps', children: [
          { id: 'qstepmark', type: 'icon', name: 'Step mark', x: 0, y: 0, w: 10, h: 10, anchor: 'tl', source: 'glyph', glyph: '{row.glyph}', color: '{row.color}', scale: 1, shadow: false, showIf: 'row.glyph' },
          { id: 'qstepdone', type: 'text', name: 'Step done', x: 12, y: 1, w: 164, h: 9, anchor: 'tl', text: '{row.text}', style: '@muted', align: 'left', valign: 'top', wrap: false, maxLines: 1, showIf: 'row.done' },
          { id: 'qstepnow', type: 'text', name: 'Step now', x: 12, y: 1, w: 164, h: 9, anchor: 'tl', text: '{row.text}', style: '@body', align: 'left', valign: 'top', wrap: false, maxLines: 1, showIf: 'row.now' },
        ] });
      // A QUEST'S NAME TOO LONG FOR ITS ROW (2026-10-27: "The Fisherman's Memory", "Something From the Kitchen" and a dozen
      // more read "The Fisherman's Mem..."): on two lines, in the giver's line's place -- the page beside it says who gave it
      // (row.long: #fillJournal)
      const qrow = (function find(n) { return n?.name === 'Quest list' ? n.children?.find((c) => c.name === 'Row') : (n?.children ?? []).map(find).find(Boolean); })(S.docs.get('journal')?.root);
      if (qrow?.children && !qrow.children.some((c) => c.name === 'Quest long')) {
        for (const c of qrow.children) if (c.name === 'Quest' || c.name === 'Giver') c.showIf = '!row.long';
        // (and a giver's line kept inside its row: Spanish "Trabajo de campo, capitulo 2" ran over the row's edge)
        for (const c of qrow.children) if (c.name === 'Giver') c.maxLines = 1;
        qrow.children.push({ id: 'qlongname', type: 'text', name: 'Quest long', x: 22, y: 3, w: 134, h: 18, anchor: 'tl', text: '{row.title}', style: '@heading',
          align: 'left', valign: 'top', wrap: true, maxLines: 2, lineGap: 0, upper: false, showIf: 'row.long' });
      }
    }
    // (the HUD's quest card shows only while a quest is followed -- 2026-10-02: players may follow none)
    if (S.has('hud')) this.#rebind('hud', { Quest: { showIf: 'quest' } });
    // (a skill in the book opens its page: what it gives, and what its levels open -- game/skillbook.js, 2026-10-26)
    if (S.has('skills')) {
      this.#rebind('skills', { 'Left page': { action: 'skillL:{row}' }, 'Right page': { action: 'skillR:{row}' } });
      // (MORE ROOM ON THE PAGE, the designer, 2026-10-26: "way too crammed"): a row's name on a line of its own, its level and
      //  a thin bar under it without the numbers (the skill's page has them)
      const rowLook = { Skill: { x: 19, y: 2, w: 73 }, Level: { x: 19, y: 13, w: 27 }, Progress: { x: 47, y: 15, w: 44, h: 6, inset: 1, label: '' } };
      const roomy = (n) => {
        if (n.type === 'list' && / page$/.test(n.name)) { for (const c of n.children ?? []) Object.assign(c, rowLook[c.name] ?? {}); }
        for (const c of n.children ?? []) roomy(c);
      };
      roomy(S.docs.get('skills').root);
      this.#addTo('skills', 'Book', { id: 'skhint', type: 'text', name: 'Tap hint', x: 20, y: 147, w: 199, h: 9, anchor: 'tl', text: 'Click a skill to see what it gives',   // ("Tap" on a phone: touch.js)
        style: '@gold', align: 'center', valign: 'top', wrap: false, maxLines: 1, lineGap: 0, upper: false });
    }
    // (no quest marker on the map any more -- the designer, 2026-09-27: "it removes the whole exploration";
    // the journal says where to go, in words)
    // TYPE A NUMBER (2026-10-08 -- a player: "to list this food for sale, I had to click nearly 900 times"; the designer:
    // "there should be an option to type in how many items they want to sell and type in at what price ... on every shop
    // and everywhere"): every number a window steps with - and + is a button too, over it -- a click or a tap opens the
    // How many window to type it (askNumber). (The shops' own Buy and Sell ask How many already: askAmount)
    this.typedOver = [['market', 'texn04rsajff', 'mktype:qty'], ['market', 'texn04rtb9yt', 'mktype:n'], ['market', 'texn04rtbeds', 'mktype:price'],
      ['trade', 'texyt5vf7rx', 'trtype'], ['exchange', 'texn04rs9dtx', 'offertype:give'], ['exchange', 'texn04rs9i8y', 'offertype:want'],
      ['bank', 'texn04rr87lo', 'banktype:in'], ['bank', 'texn04rr8hav', 'banktype:out'], ['cooking', 'texks5838hxb', 'cooktype']];
    if (S.has('cooking')) {
      // THE HEARTH (a stove: rules.js RECIPES): one dish at a time, from what you carry. THE POT (2026-10-07, the
      // designer: "the player has to drag and drop those things"): a slot for every ingredient the dish takes, each
      // showing faintly what goes there; your hotbar and backpack are in the window, and what is dragged (or tapped)
      // goes into its own slot -- the wrong thing is refused, by name. Cook cooks what is in the pot. (The window grows
      // by the two rows; "Fewer" is the pot's Empty, the old "Needs" slot is gone)
      // (THE DISH'S WORDS IN FULL, 2026-10-23, a player: "the details in the dish is cropped. cant read the details in
      //  full" -- three lines beside its picture held what it takes, its Gold and energy, and what it does. Now its energy
      //  and price sit beside the picture, under its name, and the words run the panel's whole width under them, five
      //  lines; "The pot" goes -- the line under the pot says it -- and the window is DY taller, all under the words lower;
      //  the list of dishes eight whole rows, of 20)
      S.run('hide:Tabs;hide:Health;hide:Kind;hide:Needs 1;hide:Needs', 'cooking');
      const DY = 26;
      this.#rebind('cooking', { Window: { y: 4, h: 232 + DY }, Recipes: { action: 'cookpick:{row}', h: 160 }, Recipe: { h: 150 + DY },
        Makes: { item: '{pick.icon}' }, Name: { text: '{pick.name}' },
        Energy: { text: '{pick.topLine}', x: 60, y: 28, w: 124 }, Sells: { text: '{pick.sells}', x: 60, y: 41, w: 124 },
        Does: { text: '{pick.needs}', x: 12, y: 55, w: 172, h: 45, maxLines: 5 },
        Rule: { y: 101 }, 'Have 1': { text: '{pick.inPot}', x: 12, y: 113 + DY, w: 172 },
        // (PORTIONS, 2026-10-07: the pot full, how many to cook -- as many as you have, to begin with; until then, Empty)
        Fewer: { action: 'cookn:-1', showIf: 'pick.full', y: 124 + DY }, 'How many': { text: '{pick.portions}', showIf: 'pick.full', y: 128 + DY }, More: { action: 'cookn:1', showIf: 'pick.full', y: 124 + DY },
        Cook: { action: 'cookgo' }, 'Next level': { text: '{hint}', y: 192 + DY } });
      const grid = (id, name, x, y, cols, items, action, more = {}) => ({ id, type: 'grid', name, x, y, w: cols * 19 - 1, h: 18, anchor: 'tl', cols, rows: 1, cell: 18, gap: 1,
        piece: '@slot', items, selected: '{noPick}', bevel: false, lift: false, drag: true, action, ...more });
      this.#addTo('cooking', 'Recipe', grid('gricookpot', 'Pot', 12, 83 + DY, 4, '{pot}', 'cookpot', { w: 122, h: 26, cell: 26, gap: 6, piece: '@slotAlt' }));
      this.#addTo('cooking', 'Recipe', { id: 'butcookempty', type: 'button', name: 'Empty', x: 12, y: 124 + DY, w: 64, h: 16, anchor: 'tl', label: 'Empty', family: '@secondary',
        state: 'normal', bare: false, action: 'cookempty', glyph: 'close', showIf: 'pick.emptyable' });
      this.#addTo('cooking', 'Window', grid('gricookhot', 'Cook hotbar', 12, 206 + DY, PAGE, '{cookHotbar}', 'cookadd'));
      this.#addTo('cooking', 'Window', grid('gricookbag', 'Cook bag', 209, 206 + DY, 5, '{cookBag}', 'cookaddbag'));
      this.#addTo('cooking', 'Window', { id: 'tabcookpages', type: 'tabs', name: 'Cook pages', x: 311, y: 208 + DY, w: 44, h: 14, anchor: 'tl', labels: '1,2', active: '{cookPage}',
        family: '@primary', idle: '@neutral', gap: 1, fit: 'content', showLabels: true, actions: 'cookpage:0,cookpage:1', showIf: 'vip' });
    }
    if (S.has('market')) {
      // THE MARKETPLACE'S HISTORY (2026-10-07, the designer: "a transaction history ... in marketplace"): a third tab --
      // what you sold and to whom, what you bought and from whom, newest first (the market's book: server/world2.js)
      // (the keeper's words beside her face kept clear of the third tab: 200 wide, "Welcome to the Market Hall. First time?" ran
      //  over "History" -- 2026-10-27; two lines in the 126 left of her face)
      this.#rebind('market', { Tabs: { labels: 'Browse,My listings,History', actions: 'mktab:0,mktab:1,mktab:2', glyphs: 'search,home,list', w: 230 },
        'Set it out': { label: '{mkListLabel}' }, Words: { w: 126 } });
      const T = (id, name, x, y, w, text, style, more = {}) => ({ id, type: 'text', name, x, y, w, h: 9, anchor: 'tl', text, style, align: 'left', valign: 'top', wrap: false,
        maxLines: 1, lineGap: 0, upper: false, ...more });
      const amount = (id, name, more) => ({ id, type: 'stat', name, x: -6, y: 5, w: 110, h: 12, anchor: 'tr', piece: 'hud.coins.6', text: '{row.amount}', gap: 2, iconBox: 0, align: 'right', ...more });
      const arrow = (id, name, x, step, glyph) => ({ id, type: 'button', name, x, y: 33, w: 16, h: 16, anchor: 'tl', label: '', family: '@secondary', state: 'normal', bare: false,
        action: `mkhpage:${step}`, glyph, showIf: 'histPages' });
      this.#addTo('market', 'Window', { id: 'grpmkhist', type: 'group', name: 'History', x: 0, y: 0, w: 440, h: 226, anchor: 'tl', clip: false, showIf: 'onHistory', children: [
        T('texmkhhead', 'History heading', 12, 37, 290, 'What you sold and bought, newest first', '@label'),
        T('texmkhpage', 'History page', 314, 37, 74, '{histPageText}', '@soft', { align: 'right', showIf: 'histPages' }),
        arrow('butmkhprev', 'History previous', 392, -1, 'arrow-left'), arrow('butmkhnext', 'History next', 412, 1, 'arrow-right'),
        { id: 'lismkhist', type: 'list', name: 'History rows', x: 12, y: 52, w: 416, h: 150, anchor: 'tl', rows: [], itemH: 23, gap: 2, columns: 1, clip: true, source: 'history', children: [
          { id: 'panmkhrow', type: 'panel', name: 'History row', x: 0, y: 0, w: 416, h: 23, anchor: 'tl', piece: '@card', shadow: false, clip: false, hug: false, children: [] },
          { id: 'icomkhgoods', type: 'icon', name: 'Goods', x: 4, y: 3, w: 16, h: 16, anchor: 'tl', source: 'item', glyph: 'star', color: '@text', item: '{row.icon}', piece: 'hud.coins.6', scale: 1, shadow: false },
          T('texmkhwhat', 'What', 24, 3, 280, '{row.title}', '@heading'),
          T('texmkhwhen', 'When', 24, 13, 280, '{row.sub}', '@soft'),
          amount('stamkhgold', 'Amount', { style: '@gold', showIf: 'row.gold' }),
          amount('stamkhcoin', 'Amount (coin)', { style: '@number', showIf: 'row.other', item: '{row.coinIcon}' }),
          T('texmkhcrypto', 'Amount (crypto)', -6, 7, 110, '{row.amount} {row.coinName}', '@number', { anchor: 'tr', align: 'right', showIf: 'row.crypto' }),
        ] },
        T('texmkhnone', 'History none', 12, 110, 416, 'Nothing sold or bought yet', '@muted', { align: 'center', showIf: 'noHistory' }),
      ] });
    }
    // (the numbers' own buttons, last: over each number as the windows above have placed it -- TYPE A NUMBER)
    for (const [screen, id, action] of this.typedOver) if (S.has(screen)) this.#tapOver(screen, id, action);
  }

  /**
   * THE SHOP (the designer, 2026-09-27): a golden cart in the very bottom-left corner of the game, bigger than the
   * menu's buttons, "Shop" written under it; the menu's fold arrow right beside it, then the menu; the chat button
   * above. It opens the Averyn Emporium (game/emporium.js).
   */
  #shopButton() {
    if (!this.stack.has('hud')) return;
    // (the Toast keeps the place of the name in hand, {nameY}, which it stands in for since 2026-09-29: lifted to -55 here, it
    //  lay over half of "E  Get up" and every other line of what Space does, at -61 -- a quest's news hid the prompt
    //  under it, 2026-10-27 -- and with VIP's second row open, over that row)
    this.#rebind('hud', { Menu: { x: 44, y: -19 }, Chat: { y: -52, action: 'chat', badge: '{unread}' }, Name: { maxLines: 1, w: 58 } });
    this.#addTo('hud', 'HUD parts', { id: 'shopgrp', type: 'group', name: 'Shop', x: 6, y: -4, w: 34, h: 42, anchor: 'bl', clip: false, children: [
      { id: 'shopbtn', type: 'button', name: 'Shop button', x: 0, y: 0, w: 34, h: 31, anchor: 'tl', label: '', family: '@soft', state: 'normal', bare: false,
        icon: '', action: 'shop' },
      { id: 'shopcart', type: 'icon', name: 'Shop cart', x: 5, y: 3, w: 24, h: 24, anchor: 'tl', source: 'item',
        item: { file: 'art:shop-cart.png', sx: 0, sy: 0, w: 24, h: 24 }, scale: 1, shadow: true },
      // (50 wide round the cart's 34, as the Wallet's: "Dompet", Indonesian's Wallet, was cut to "Dom..." in 40, 2026-10-27)
      { id: 'shoplabel', type: 'text', name: 'Shop label', x: -8, y: 32, w: 50, h: 9, anchor: 'tl', text: 'Shop', style: '@title', align: 'center',
        valign: 'top', wrap: false, maxLines: 1 },
    ] });
    // YOUR NAME, CHANGED (the designer, 2026-09-27: "the name changing function doesn't work"): the character screen's
    // name box is a button to the name box that asks the server (Play.askName)
    if (this.stack.has('character')) this.#rebind('character', { Name: { action: 'rename', focused: false, placeholder: 'Your name' } });
  }

  /**
   * THE FOUNDING FARMERS (2026-10-01): on the character screen, by Done, a gold button to the Founding Farmers window
   * (game/foundersui.js) -- for a player who holds one (the server's word: Play.applyFounders sets `founder`).
   */
  #foundersButton() {
    if (!this.stack.has('character')) return;
    this.#addTo('character', 'Window', { id: 'ffbtn', type: 'button', name: 'Founding Farmers', x: 122, y: 168, w: 100, h: 18, anchor: 'tl',
      label: 'Founding Farmers', family: '@warn', state: 'normal', bare: false, icon: '', action: 'founders', showIf: 'founder' });
  }

  /** YOUR WALLETS (2026-10-22, the designer: link up to four wallets "inside the profile section"): on the farmer's own
   *  screen under Random, for every player -- the wallets whose Founding Farmers they may play (game/linkwallets.js). */
  #walletsButton() {
    if (!this.stack.has('character')) return;
    this.#addTo('character', 'Window', { id: 'walletsbtn', type: 'button', name: 'Wallets', x: 16, y: 168, w: 88, h: 18, anchor: 'tl',
      label: 'Wallets', family: '@soft', state: 'normal', bare: false, icon: '', action: 'wallets' });
  }

  /**
   * VIP AND THE ELITE FOUNDER, ON THE CARD ITSELF (the designer, 2026-10-22: no chips or bars of their own -- "their
   * profile panel will become golden", the badge "somewhere on their profile panel"; then: "the whole board needs to be
   * in a golden color ... only outline golden ... is not okay"): the farmer's card drawn all in gold while VIP (a pass,
   * or a holder's months: the panel's goldIf, ui-editor widgets.js goldMap), its name in dark ink on the gold
   * (#goldInk); and the Founders' Hall's badge pinned to the portrait's corner for an Elite Founder (server/founders.js
   * perks.elite; design/founders/art). The VIP chip under the card is gone.
   */
  #eliteRibbon() {
    if (!this.stack.has('hud')) return;
    this.#rebind('hud', { 'VIP badge': { showIf: 'vipChipGone' }, Farmer: { goldIf: 'vipGold' } });
    this.#addTo('hud', 'HUD parts', { id: 'elitebadge', type: 'icon', name: 'Elite badge', x: 38, y: 38, w: 16, h: 16, anchor: 'tl', source: 'item', showIf: 'elite',
      item: { file: 'art:elite-badge-16.png', sx: 0, sy: 0, w: 16, h: 16 }, scale: 1, shadow: true });
  }
  /** The words on the card in dark ink while it is gold, in the theme's own again when it is not. */
  #goldInk(on) {
    if (this.inkGold === on) return;
    this.inkGold = on;
    const ink = on ? { color: '#3a1c08', edge: false } : { color: undefined, edge: undefined };
    this.#rebind('hud', { Name: ink, Level: ink });
  }

  /** Does this player hold a Founding Farmer? (the character screen's button) */
  setFounder(on) { this.founder = !!on; }

  /**
   * THE WALLET (the designer, 2026-09-30: "a Wallet button on the HUD"): the Shop's twin, right above it -- a leather
   * wallet (art:wallet.png, design/ui/make_wallet.mjs), "Wallet" written under it -- the chat button moved up over
   * both. It opens the player's own Bloomshire Wallet (game/walletui.js).
   */
  #walletButton() {
    if (!this.stack.has('hud')) return;
    this.#rebind('hud', { Chat: { y: -100 } });
    this.#addTo('hud', 'HUD parts', { id: 'walletgrp', type: 'group', name: 'Wallet', x: 6, y: -52, w: 34, h: 42, anchor: 'bl', clip: false, children: [
      { id: 'walletbtn', type: 'button', name: 'Wallet button', x: 0, y: 0, w: 34, h: 31, anchor: 'tl', label: '', family: '@soft', state: 'normal', bare: false,
        icon: '', action: 'wallet' },
      { id: 'walleticon', type: 'icon', name: 'Wallet icon', x: 5, y: 3, w: 24, h: 24, anchor: 'tl', source: 'item',
        item: { file: 'art:wallet.png', sx: 0, sy: 0, w: 24, h: 24 }, scale: 1, shadow: true },
      { id: 'walletlabel', type: 'text', name: 'Wallet label', x: -8, y: 32, w: 50, h: 9, anchor: 'tl', text: 'Wallet', style: '@title', align: 'center',
        valign: 'top', wrap: false, maxLines: 1 },
    ] });
  }

  /**
   * THE FISHING BAR (the designer, 2026-09-27: "a bar... a needle going up and down and a small green area... it must
   * follow the game's UI"): beside the farmer while a fish is on -- the theme's own panel, the water in it, the green
   * band, the needle, the time running out under it -- and, while Space winds the rod up, how far the cast will go.
   * Where they stand is bound to the farmer's place on the screen (Play sets `anchor` each frame).
   */
  #fishBar() {
    this.#addTo('hud', 'HUD parts', { id: 'fishgrp', type: 'group', name: 'Fishing', x: '{fish.x}', y: '{fish.y}', w: 30, h: 116, anchor: 'tl', clip: false,
      showIf: 'fish', children: [
        { id: 'fishframe', type: 'panel', name: 'Fish frame', x: 0, y: 0, w: 30, h: 104, anchor: 'tl', piece: '@panel', shadow: true, clip: false, hug: false },
        { id: 'fishwater', type: 'rect', name: 'Fish water', x: 9, y: 9, w: 12, h: 86, anchor: 'tl', fill: '#23527c', radius: 1 },
        { id: 'fishband', type: 'rect', name: 'Fish band', x: 9, y: '{fish.bandY}', w: 12, h: '{fish.bandH}', anchor: 'tl', fill: '@good', radius: 1 },
        { id: 'fishbandhi', type: 'rect', name: 'Fish band light', x: 10, y: '{fish.bandY}', w: 10, h: 1, anchor: 'tl', fill: '@highlight' },
        { id: 'fishneedle', type: 'rect', name: 'Fish needle', x: 4, y: '{fish.needleY}', w: 22, h: 4, anchor: 'tl', fill: '@ink', radius: 1 },
        { id: 'fishneedleout', type: 'rect', name: 'Fish needle core', x: 5, y: '{fish.needleY1}', w: 20, h: 2, anchor: 'tl', fill: '#ffffff', showIf: 'fish.out' },
        { id: 'fishneedlein', type: 'rect', name: 'Fish needle core in', x: 5, y: '{fish.needleY1}', w: 20, h: 2, anchor: 'tl', fill: '#b9f56a', showIf: 'fish.in' },
        { id: 'fishtime', type: 'rect', name: 'Fish time', x: 4, y: 98, w: '{fish.timeW}', h: 2, anchor: 'tl', fill: '@warn' },
        { id: 'fishkey', type: 'text', name: 'Fish key', x: -15, y: 106, w: 60, h: 9, anchor: 'tl', text: 'Space!', style: '@title', align: 'center', valign: 'top',
          wrap: false, maxLines: 1 },
      ] });
    this.#addTo('hud', 'HUD parts', { id: 'castgrp', type: 'group', name: 'Cast', x: '{cast.x}', y: '{cast.y}', w: 50, h: 15, anchor: 'tl', clip: false,
      showIf: 'cast', children: [
        { id: 'castframe', type: 'panel', name: 'Cast frame', x: 0, y: 0, w: 50, h: 15, anchor: 'tl', piece: '@plate', shadow: true, clip: false, hug: false },
        { id: 'casttrack', type: 'rect', name: 'Cast track', x: 5, y: 5, w: 40, h: 5, anchor: 'tl', fill: '@slotShade', radius: 1 },
        { id: 'castfill', type: 'rect', name: 'Cast power', x: 5, y: 5, w: '{cast.w}', h: 5, anchor: 'tl', fill: '@gold', radius: 1 },
      ] });
  }

  /** How high the top of the HUD's chat button stands over the bottom of the view, in the interface's pixels -- where the
   *  chat's newest lines and its window begin (game/chat.js place), so they never lie over the buttons under them. null:
   *  no chat button. (2026-10-28, the designer: the chat's lines showed over the chat button, since the Shop and the
   *  Wallet had lifted it to -100 and the chat still began at 76.) */
  chatTop() {
    let n = null;
    const find = (x) => { if (!n && x?.name === 'Chat' && x.type === 'button') n = x; for (const c of x?.children ?? []) find(c); };
    find(this.stack?.docs?.get('hud')?.root);
    return n && n.anchor === 'bl' && Number.isFinite(+n.y) && Number.isFinite(+n.h) ? -n.y + n.h : null;
  }

  /** Give a screen's widgets (by name) the game's own words and actions: the studio's sample text becomes a binding. */
  #rebind(screen, byName) {
    const doc = this.stack.docs?.get(screen);
    if (!doc) return;
    // (a list's own row is left alone: its words are its rows')
    const visit = (n, inList = false) => {
      const change = byName[n.name];
      if (change && !inList) Object.assign(n, change);
      for (const c of n.children ?? []) visit(c, inList || n.type === 'list');
    };
    visit(doc.root);
  }

  /** Put a widget of the game's own on a screen (inside the named panel; at `at` among its children, else on
   *  top), once. The studio's design is not touched: this is the game's copy of it. */
  /**
   * HIDE HUD HIDES THE HUD ALONE (2026-10-03, the designer: with it hidden, "E  Cook" at a stove and "F  Swim" by the lake
   * were gone too): what tells the player what they can do -- the prompt, the notes, the fishing bars -- is taken out of
   * the group the button hides and put on the screen itself, just under the button. Each still shows only when it has
   * something to show (its own showIf), where it was (the group fills the screen: the same place).
   */
  #freeFromHud(names) {
    const doc = this.stack.docs?.get('hud'), root = doc?.root;
    const parts = root?.children?.find((c) => c.name === 'HUD parts');
    if (!parts?.children) return;
    const moving = parts.children.filter((c) => names.includes(c.name));
    parts.children = parts.children.filter((c) => !names.includes(c.name));
    const at = Math.max(0, root.children.indexOf(parts) + 1);
    root.children.splice(at, 0, ...moving);
  }
  /**
   * SHOW OTHER PLAYERS (Settings, 2026-10-03, the designer: players planting a field clicked other farmers by mistake and
   * their card came up): a switch in the Game column, under Show hints; the window grows by its row. Off, Play draws,
   * names and answers clicks on no other farmer (they still see you).
   */
  #othersSwitch() {
    this.#addTo('settings', 'Window', { id: 'othlbl', type: 'text', name: 'Other players label', x: 14, y: 147, w: 130, h: 9, anchor: 'tl', text: 'Show other players',
      style: '@body', align: 'left', valign: 'top', wrap: false, maxLines: 0, lineGap: 0, upper: false });
    this.#addTo('settings', 'Window', { id: 'othtog', type: 'toggle', name: 'Other players', x: 155, y: 145, w: 25, h: 12, anchor: 'tl', on: true, color: 'red' });
    this.#rebind('settings', { Window: { h: 210 }, Rule: { y: 164 }, Version: { y: 181 }, Controls: { y: 176 }, 'Save & quit': { y: 176 } });
  }
  /** FIXED JOYSTICK (Settings, 2026-10-26, players: "let players choose whether to use a joystick or not, so they can
   *  customize the controls based on their device"): on a phone or a tablet, a switch under Show other players; on, the
   *  joystick stays in sight low on the left (game/touch.js). */
  /** The touch pad's Fixed joystick switch, once Play has made the pad (it comes after attach). */
  setJoystick(j) {
    this.joystick = j;
    if (j && this.othersRow && !this.joyRow && this.stack.has('settings')) { this.joyRow = true; this.#joySwitch(); }
  }
  #joySwitch() {
    this.#addTo('settings', 'Window', { id: 'joylbl', type: 'text', name: 'Fixed joystick label', x: 14, y: 162, w: 130, h: 9, anchor: 'tl', text: 'Fixed joystick',
      style: '@body', align: 'left', valign: 'top', wrap: false, maxLines: 0, lineGap: 0, upper: false });
    this.#addTo('settings', 'Window', { id: 'joytog', type: 'toggle', name: 'Fixed joystick', x: 155, y: 160, w: 25, h: 12, anchor: 'tl', on: false, color: 'red' });
    this.#rebind('settings', { Window: { h: 225 }, Rule: { y: 179 }, Version: { y: 196 }, Controls: { y: 191 }, 'Save & quit': { y: 191 } });
  }
  /** A number's own button (TYPE A NUMBER): over the text `id` on `screen`, as big as it and a little taller, shown
   *  when it is -- nothing drawn, a click on the number does `action`. */
  #tapOver(screen, id, action) {
    const doc = this.stack.docs?.get(screen);
    if (!doc) return;
    let host = null, node = null;
    const find = (n) => { if (node) return; for (const c of n.children ?? []) { if (c.id === id) { host = n; node = c; return; } find(c); } };
    find(doc.root);
    if (!node || host.children.some((c) => c.id === `tap-${id}`)) return;
    host.children.splice(host.children.indexOf(node) + 1, 0, { id: `tap-${id}`, type: 'button', name: `${node.name} (typed)`, x: node.x, y: node.y - 4,
      w: Math.max(node.w, 24), h: node.h + 8, anchor: node.anchor ?? 'tl', label: '', bare: true, action, ...(node.showIf ? { showIf: node.showIf } : {}) });
  }
  #addTo(screen, parent, node, at = null) {
    const doc = this.stack.docs?.get(screen);
    if (!doc) return;
    let host = null;
    const find = (n) => { if (host) return; if (n.name === parent && n.children) host = n; else for (const c of n.children ?? []) find(c); };
    find(doc.root);
    if (!host || host.children.some((c) => c.id === node.id)) return;
    if (at == null) host.children.push(node); else host.children.splice(at, 0, node);
  }

  /** What the player did in the interface, for the ears -- and Settings' sliders, which are the sound's levels. */
  heard(type, d) {
    if (type === 'close' && d.id === 'name') this.naming?.finish(null);
    if (type === 'close' && d.id === 'amount') this.#amountGone();            // (How many, left without selling or buying)
    if (type === 'open' && d.id === 'journal') { this.qPick = null; this.qTab = 0; }   // (it opens on the quest you follow)
    if (type === 'close' && d.id === 'founding') this.foundingDone?.();
    // a question closed without its yes: its no (an invitation to trade, turned down)
    if (type === 'close' && d.id === 'confirm' && this.confirm) { const c = this.confirm; this.confirm = null; c.onNo?.(); }
    // the Trade window closed by its X or Esc: the trade is called off (not when the trade itself ended)
    // (while it waits for a payment in crypto it cannot be called off: the window goes, the trade stays -- E by them opens it)
    if (type === 'close' && d.id === 'trade' && this.tr?.paying && !this.trClosing) this.notify(`The trade waits for the payment. Press E by ${this.tr.them} to see it`);
    else if (type === 'close' && d.id === 'trade' && this.tr && !this.trClosing) { const id = this.tr.id; this.tr = null; this.session()?.trade?.('cancel', { id }); }
    if (type === 'close' && d.id === 'trade') this.trClosing = false;
    if (type === 'close' && d.id === 'market') this.searchKeys?.blur();
    // the guide closed by Esc: as good as done (it is not shown again: the keys card shows it on asking)
    if (type === 'close' && d.id === 'guide' && this.guide) { const g = this.guide; this.guide = null; this.onGuideDone?.(g); }
    // SETTINGS' SWITCHES FOR THE SCREEN (2026-09-29, for phones and tablets): Full screen, and Pixel-perfect scaling
    if (type === 'open' && d.id === 'settings') {
      this.stack.setValue('settings', 'Full screen', !!(document.fullscreenElement ?? document.webkitFullscreenElement));
      if (this.exact) this.stack.setValue('settings', 'Pixel-perfect scaling', this.exact.now());
      if (this.others) this.stack.setValue('settings', 'Other players', this.others.now());
      if (this.joystick && this.joyRow) this.stack.setValue('settings', 'Fixed joystick', this.joystick.now());
    }
    if (type === 'press' && d.screen === 'settings' && d.type === 'toggle') this.#screenSwitch(d.name);
    const s = this.soundOf();
    if (!s) return;
    if (type === 'press') s.press(d);
    else if (type === 'open') {
      // (a tab switching windows has clicked already) (the map and a chest have their own, 2026-10-27, the sound audit: the
      //  window's sound under them made two at once; a chest shuts with its lid)
      if (!d.swap) s.cue(d.id === 'map' && s.has('mapOpen') ? 'mapOpen' : d.id === 'storage' && s.has('chestOpen') ? 'chestOpen' : 'windowOpen');
      if (d.id === 'settings') for (const [name, k] of Object.entries(LEVELS)) this.stack.setValue('settings', name, s.levels[k]);
    } else if (type === 'close') s.cue(d.id === 'storage' && s.has('chestClose') ? 'chestClose' : 'windowClose');
    else if (type === 'lift') s.cue('lift');
    else if (type === 'slide' && d.screen === 'settings' && LEVELS[d.name]) s.setLevel(LEVELS[d.name], d.value, d.done);
  }

  get windowOpen() { return !!this.stack.top; }
  get page() { return Math.floor((this.hero?.slot ?? 0) / PAGE); }

  /** The game's own actions: take a slot in hand, fold the second row, switch the Backpack's ten, pick a bag
   *  cell, drop a dragged thing, change the look. */
  action(verb, arg, from, arg2) {
    // (the Notice under the Quest: OK, or its close -- showNotice)
    if (verb === 'noticeok' || verb === 'noticeclose') { this.noticeNow = null; return; }
    // the shop, the chat and your name: at any time
    if (verb === 'shop' || verb === 'emporium') { this.onEmporium?.(); return; }
    // (the Emporium's own window: its tabs, pages, rows, the way to pay -- game/goodsshop.js)
    if (EMP_VERBS.has(verb)) { this.goods?.act(verb, arg); return; }
    if (verb === 'vippass') { this.onVipPass?.(); return; }
    // (the boosts window, 2026-10-28, the designer: "a UI which basically explains how many boosts are active and for how
    //  much time": game/boostsui.js -- a line in the Notice box where there is none)
    if (verb === 'boosts') { if (this.onBoosts) { this.onBoosts(); return; } const l = this.#boostsOn(); this.notify(l.length ? l.map((b) => `${b.dish}, ${b.words.toLowerCase()}, ${b.mins} min left`).join('. ') : 'No boosts on'); return; }
    if (verb === 'wallet') { this.onWallet?.(); return; }
    if (verb === 'founders') { this.onFounders?.(); return; }
    if (verb === 'wallets') { this.onWallets?.(); return; }
    if (verb === 'chat') { this.onChat?.(); return; }
    if (verb === 'admin') { this.onAdmin?.(); return; }
    if (verb === 'leaderboard') { this.onLeaderboard?.(); return; }
    if (verb === 'friends') { this.onFriends?.(); return; }
    if (verb === 'inbox') { this.onInbox?.(); return; }
    // A SKILL'S PAGE (2026-10-26): a skill in the Skills book, tapped -- what it gives, and what its levels open (game/skillbook.js)
    if (verb === 'skillL' || verb === 'skillR') {
      const k = this.skillBook?.[(verb === 'skillR' ? 5 : 0) + (+arg || 0)];
      if (k && this.onSkill) { this.stack.close(); this.onSkill(k.name.toLowerCase().split(' ').at(-1), () => this.stack.run('open:skills')); }
      return;
    }
    if (verb === 'ride') { this.onRide?.(); return; }
    if (verb === 'guidebook') { this.onGuide?.(); return; }       // (the green book: game/guidebook.js -- 'guide' is the tour's)
    if (verb === 'bedinfo') {
      const e = this.energy, w = e?.bedWait?.() ?? 0;
      // (back by itself for a VIP alone, 2026-10-28: rules.js Energy regenOn)
      const back = e?.regenOn?.() ? 'Your energy still comes back by itself, and the bed heals you any time.' : 'The bed heals you any time.';
      if (e) this.notify(w > 0 ? `You have slept all you can for energy today. More in ${waitText(w)} (midnight UTC). ${back}`
        : e.regenOn?.() ? `Lie down in your bed at home to fill your energy. It also comes back by itself, 1 every ${ENERGY.regenMinutes} minutes.`
          : `Lie down in your bed at home to fill your energy. With a VIP Pass it also comes back by itself, 1 every ${ENERGY.regenMinutes} minutes.`);
      return;
    }
    if (verb === 'rename') { this.#rename(); return; }
    if (verb === 'nameok') { this.naming?.submit(); return; }
    if (verb === 'namecancel') { this.naming?.finish(null); return; }
    if (verb === 'foundingok') { this.foundingDone?.(); return; }
    // the interface's own settings and questions answer at any time, farmer or none
    if (verb === 'uisize') { this.setUiSize(UI_SIZES[Math.max(0, Math.min(UI_SIZES.length - 1, UI_SIZES.indexOf(this.uiSize) + (+arg || 0)))]); return; }
    if (verb === 'uitheme' && this.themes) {
      // round and round the themes: Blossom, Mustard, Midnight
      const ids = this.themes.ids, i = ids.indexOf(this.uiTheme);
      this.setUiTheme(ids[(i + (+arg || 1) + ids.length) % ids.length]);
      return;
    }
    if (verb === 'confirmyes') { const c = this.confirm; this.confirm = null; this.stack.close(); c?.onYes?.(); return; }
    // the wheel over a window with no long list under it (the runtime scrolls those): a page turned, the map zoomed
    if (verb === 'wheel') { this.#wheelOver(from, arg); return; }
    // HOW MANY (the "amount" window: selling, 2026-09-29): fewer, more, all of them, and sell
    if (verb === 'amount' && this.amount?.kind === 'number') {
      const a = this.amount;
      a.v = arg === 'all' ? a.max : Math.max(a.min, Math.min(a.max, a.v + (+arg || 0) * a.by - (a.v % a.step)));
      a.text = plainOf(a, a.v); a.warn = '';
      if (a.input) { a.input.value = a.text; if (!COARSE()) { a.input.focus({ preventScroll: true }); a.input.select(); } }
      return;
    }
    if (verb === 'amountok' && this.amount?.kind === 'number') {
      const a = this.amount;
      if (!(a.v >= a.min) || a.v > a.max) { a.warn = `At least ${numText(a, a.min)}`; this.soundOf()?.cue('deny'); return; }
      this.#amountGone(); this.stack.close(); a.onOk?.(a.v); return;
    }
    if (verb === 'amount' && this.amount) {
      const a = this.amount;
      a.n = arg === 'all' ? a.max : Math.max(1, Math.min(a.max, a.n + (+arg || 0)));
      a.text = String(a.n);
      if (a.input) { a.input.value = a.text; if (!COARSE()) { a.input.focus({ preventScroll: true }); a.input.select(); } }
      return;
    }
    if (verb === 'amountok' && this.amount) {
      if (!(this.amount.n >= 1)) { this.soundOf()?.cue('deny'); return; }
      const a = this.#amountGone(); this.stack.close(); a.onOk?.(a.n); return;
    }
    if (verb === 'guide') { this.#guideStep(arg); return; }
    // THE LANGUAGE (Settings, 2026-09-28): round the languages there are; everything shown changes at once (i18n.js)
    if (verb === 'lang') {
      const i = LANGS.findIndex((l) => l.id === langNow()), next = LANGS[(i + (+arg || 1) + LANGS.length) % LANGS.length];
      if (next.glyphs) UIFONT?.preloadGlyphs(next.glyphs === 'ja' ? 'ja' : null);   // (at once: setLang's own call follows)
      setLang(next.id).then(() => this.onLang?.());
      return;
    }
    const h = this.hero, inv = this.inv;
    if (!h || !inv) return;
    const take = (i) => { if (i >= 0 && i < inv.size) h.slot = i; };
    // (in the Chest window, a click on either grid also says what is there: testers, 2026-09-28)
    if (verb === 'hotbar') { take((from === 'backpack' || from === 'storage' ? this.bpPage * PAGE : 0) + (+arg || 0)); if (from === 'storage') this.chestPick = null; if (from === 'backpack') this.bpHot = true; }
    else if (verb === 'chestpick') this.chestPick = +arg || 0;
    else if (verb === 'hotbar2') take(PAGE + (+arg || 0));
    else if (verb === 'row2') {
      this.row2Open = !this.row2Open;
      if (!this.row2Open && h.slot >= PAGE) h.slot -= PAGE;          // folding it away puts the hand back on the first row
    } else if (verb === 'page') this.bpPage = Math.min(inv.pages - 1, arg === undefined ? (this.bpPage + 1) % inv.pages : +arg || 0);
    else if (verb === 'pick') { this.picked = +arg || 0; this.bpHot = false; }
    // THE BACKPACK'S BUTTONS (2026-10-02, five slots): sort it; eat, or throw away, the thing picked in it (asked first)
    else if (verb === 'bagsort') { if (this.act('sort', { area: 'bag' }).ok) this.soundOf()?.cue('place', { gain: 0.7 }); }
    else if (verb === 'bageat') {
      const [a, k] = this.#bpSel(), id = inv.at(a, k)?.id ?? null;
      // (no energy from it: said first, eaten at the second press -- hero.js noEnergyWords)
      if (id && warnBeforeEating(this.eatAsk ??= {}, id, noEnergyWords(id, this.energy, this.health, this.#save()), (w) => { this.soundOf()?.cue('deny'); this.notify(w); })) return;
      const r = this.act('eat', { area: a, i: k, id });
      if (r.ok) { this.soundOf()?.cue('eat'); if (r.buff) this.soundOf()?.cue('magicCast', { gain: 0.6 }); this.notify(ateWords(r)); }   // (eating heard as eating, 2026-10-27)
      else { this.soundOf()?.cue('deny'); this.notify(r.reason ?? 'Not now'); }
    } else if (verb === 'bagdrop') {
      const [a, k] = this.#bpSel(), s = inv.at(a, k);
      if (!s) return;
      // (what a quest needs is not offered to be thrown away at all: 2026-10-07, quests.js keepCount)
      if (ITEMS[s.id]?.cat === 'quest' || keptFor(this.#save(), s.id, inv, s.n)) {
        this.soundOf()?.cue('deny'); this.notify(ITEMS[s.id]?.cat === 'quest' ? 'You may need that yet. A quest\'s things cannot be thrown away' : KEPT_WHY); return;
      }
      const name = `${s.n > 1 ? `${s.n} ` : ''}${nameOf(s.id, s)}`;
      const go = () => {
        // (the slot and the thing asked about -- not whatever is picked, or lies there, by the time of the Yes)
        const r = this.act('discard', { area: a, i: k, id: s.id, n: s.n });
        if (r.ok) { this.soundOf()?.cue('place', { gain: 0.6 }); this.notify(`Threw away ${name}`); }
        else { this.soundOf()?.cue('deny'); this.notify(r.reason ?? 'That cannot be thrown away'); }
      };
      if (!this.askYesNo({ question: `Throw away ${name}?`, detail: 'Gone for good. Nobody can get it back.', yes: 'Discard', no: 'Keep', onYes: go })) go();
    }
    else if (verb === 'drop' && from === 'cooking') this.#potDrop(arg);
    else if (verb === 'drop' && arg?.to) { const from = this.#slot(arg.from), to = this.#slot(arg.to); if (from && to && this.act('move', { from, to }).ok) this.soundOf()?.cue('place', { gain: 0.7 }); }
    else if (CHEST_VERBS[verb] && this.chest) { if (this.act(...CHEST_VERBS[verb](this.chest.id)).ok) this.soundOf()?.cue('place', { gain: 0.7 }); }
    else if (verb === 'pickupchest' && this.chest) {
      // a chest you set down yourself, empty: back on the hotbar, to set down somewhere else
      const r = this.act('pickUp', { id: this.chest.id });
      if (r.ok) { this.soundOf()?.cue('pickup'); this.chest = null; this.stack.close(); this.notify('You pick the chest up'); }
      else { this.soundOf()?.cue('deny'); this.notify(r.reason ?? 'Not now'); }
    }
    else if (NPC_VERBS.has(verb)) this.#npcAction(verb, arg, arg2);
    else if (TRADE_VERBS.has(verb)) this.#tradeAction(verb, arg);
    else if (verb === 'questpick') this.qPick = +arg || 0;                // (the row's own number, scrolled or not)
    else if (verb === 'questtab') { this.qTab = +arg === 1 ? 1 : 0; this.qPick = 0; this.stack.scrollTo('journal', 'Quest list', 0, { top: true }); }
    else if (verb === 'questtrack') {
      // (Following on the followed quest unfollows it: nothing followed until the player picks one again)
      const j = this.qShown, on = !!j && trackedOf(this.#save(), this.inv)?.q.id === j.q.id;
      if (j && !j.done && this.act('quest.track', { quest: on ? null : j.q.id }).ok) {
        this.soundOf()?.cue('place', { gain: 0.7 });
        this.notify(on ? `No longer following ${j.q.name}` : `Now following ${j.q.name}`);
      }
    }
    else if (verb === 'mapzoom') this.#mapZoom(+arg || 0);
    else if (verb === 'cookpick') { const c = this.cook, p = +arg || 0; if (c && c.pick !== p) { c.pick = p; c.pot = []; c.status = ''; } }   // (another dish: the pot is emptied)
    else if (verb === 'cookgo') this.#cookNow();
    else if (verb === 'cookadd') this.#potPut('hotbar', (this.cook?.page ?? 0) * PAGE + (+arg || 0));
    else if (verb === 'cookaddbag') this.#potPut('bag', +arg || 0);
    else if (verb === 'cookpot') this.#potTap(+arg || 0);
    else if (verb === 'cooktype') { const c = this.cook, R = c?.list?.[c?.pick ?? -1]; if (R) this.askNumber({ question: `Cook how many ${R.dish}?`, value: c.n ?? 1, max: this.#potMax(R), onOk: (n) => { if (this.cook === c) { c.n = n; c.status = ''; } } }); }
    else if (verb === 'cookn') { const c = this.cook, R = c?.list?.[c?.pick ?? -1]; if (R) { c.n = Math.max(1, Math.min(this.#potMax(R), (c.n ?? 1) + (+arg || 0))); c.status = ''; } }
    else if (verb === 'cookempty') { if (this.cook) { this.cook.pot = []; this.cook.status = 'The pot is empty'; this.soundOf()?.cue('place', { gain: 0.4 }); } }
    else if (verb === 'cookpage') { if (this.cook) this.cook.page = Math.max(0, Math.min((inv.pages ?? 1) - 1, +arg || 0)); }
    else if (verb === 'look') this.#look(arg, +arg2 || 0);
    else if (verb === 'help') this.onHelp?.();
    else if (verb === 'quit') this.onQuit?.();
  }

  /**
   * THE NAME BOX in the interface's own look (the designer, 2026-09-28: the old box "is not a pixel UI"): the studio's
   * "name" screen over the game, on top of whatever window asked. What is typed goes into a hidden text box (the keys,
   * a paste, a phone's keyboard) and shows in the screen's field; Enter or the button sends it, Escape or Cancel leaves
   * it. `send(name)` resolves to why the name cannot be had, or null when it is kept. Resolves to the name typed, or
   * null. Null at once when there is no such screen (Play keeps its plain box for that).
   */
  // (`rule`: (name) => why it won't do, or null -- a pet's or a mount's name, rules.js nameWhy; else a player's name)
  askName(question, was, send, host = document.body, rule = null) {
    if (!this.stack.has('name')) return null;
    this.naming?.finish(null);
    return new Promise((done) => {
      const input = document.createElement('input');
      Object.assign(input, { className: 'play-name-keys', maxLength: 20, value: was ?? '', autocomplete: 'off', spellcheck: false });
      input.setAttribute('aria-label', question);
      const st = { question, was: was ?? '', err: '', busy: false, input };
      st.finish = (name) => {
        if (this.naming !== st) return;
        this.naming = null; input.remove();
        if (this.stack.top === 'name') this.stack.close();
        done(name);
      };
      st.submit = async () => {
        if (st.busy) return;
        const name = rule ? input.value.replace(/\s+/g, ' ').trim() : input.value.trim();
        const bad = rule ? rule(name) : !/^[A-Za-z0-9_-]{3,20}$/.test(name) ? 'A name is 3 to 20 letters, numbers, - or _.' : null;
        if (bad) { st.err = bad; this.soundOf()?.cue('deny'); return; }
        if (st.was && name === st.was) { st.finish(null); return; }
        st.busy = true; st.err = '';
        const why = await send(name).catch(() => 'The server could not be reached. Try again.');
        st.busy = false;
        if (why) { st.err = why; this.soundOf()?.cue('deny'); } else st.finish(name);
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); st.submit(); } else if (e.key === 'Escape') { e.preventDefault(); st.finish(null); }
      });
      input.addEventListener('input', () => { st.err = ''; });
      this.naming = st;
      host.append(input);
      this.stack.open('name');
      // (a phone brings its keyboard up only for a box focused while the finger is on the screen: now, and again a moment
      //  later for a mouse whose click is still on its way -- and again at every tap on the interface: keysFocus)
      Object.assign(input, { enterKeyHint: 'done', autocapitalize: 'off' }); input.setAttribute('autocorrect', 'off');
      input.focus({ preventScroll: true });
      setTimeout(() => input.focus({ preventScroll: true }), 30);
    });
  }

  /**
   * THE STORY'S END in the interface's own look (2026-10-01, the designer's reference): the studio's "founding" screen
   * -- Marven's scroll, "Story Completed!" -- over the golden rays Play draws behind the interface. `rewarded`: this
   * player is one of the first 1,000 to finish (the free mint spot and `shards` Averyn Shards are shown); anyone else is
   * told the places are taken. Resolves when it is closed (Continue, or Escape). Null when there is no such screen.
   */
  founding({ rewarded = false, shards = 0 } = {}) {
    if (!this.stack.has('founding')) return null;
    // the whole screen is the moment's (as the reference): the HUD steps aside while it is up -- and comes back as the
    // player had it (hidden stays hidden)
    const named = (name) => { const walk = (n) => (n?.name === name ? n : (n?.children ?? []).reduce((f, c) => f ?? walk(c), null)); return walk(this.stack.docs.get('hud')?.root); };
    const parts = named('HUD parts'), toggle = named('Hide HUD'), was = [parts?.hidden, toggle?.hidden];
    if (parts) parts.hidden = true;
    if (toggle) toggle.hidden = true;
    return new Promise((done) => {
      this.foundingDone = () => {
        this.foundingDone = null;
        if (parts) { if (was[0]) parts.hidden = true; else delete parts.hidden; }
        if (toggle) { if (was[1]) toggle.hidden = true; else delete toggle.hidden; }
        if (this.stack.top === 'founding') this.stack.close();
        done();
      };
      this.stack.set('founding', { rewarded: !!rewarded, shards: Number(shards).toLocaleString('en-US') });
      this.stack.open('founding');
    });
  }

  /** A new name: asked in the name box, checked and kept by the server; the HUD and the other players follow. */
  async #rename() {
    if (!this.game || this.renaming) return;
    this.renaming = true;
    try {
      const name = await this.quests?.askName?.('What should everyone call you?', this.playerName ?? '');
      if (name) { this.playerName = name; this.notify(`You are ${name} now`); }
    } finally { this.renaming = false; }
  }

  /* ---------------------------------------------------------------- the townsfolk */

  /** Someone to talk to (game/npcs.js): the dialogue box -- their face, their words, the answers their
   *  trade gives. False when the interface has no dialogue box. */
  openTalk(p) {
    if (!this.stack.has('dialogue')) return false;
    const lines = p.def.lines ?? ['Hello.'];
    this.talk = { p, line: Math.floor(Math.random() * lines.length), words: null, answers: this.#answersFor(p) };
    // (hello first: the designer, 2026-09-27, "there is no greeting when the player goes to the NPC")
    const hi = this.#hello(p), line = lines[this.talk.line] ?? '';
    this.talk.words = this.#named(hi && `${hi} ${line}`.length <= 150 ? `${hi} ${line}` : hi || line);
    this.npcFaceOf = null;
    if (this.stack.top) this.stack.swap('dialogue'); else this.stack.open('dialogue');
    // the first time: a proper first meeting (npcs.js intro), then whatever a quest wants of them
    if (p.def.intro && !this.#save()?.met?.[p.id]) { this.#meet(p); return true; }
    // (a friend's first word today: game/hearts.js)
    const hr = p.id ? this.act('hearts.talk', { npc: p.id }) : null;
    if (hr?.ok && hr.up) this.soundOf()?.cue('heartUp');
    if (hr?.ok && hr.up) this.notify(`${p.def.name} is at ${hr.hearts} ${hr.hearts === 1 ? 'heart' : 'hearts'}`);
    // (a sweetheart's moment, when one is due, comes first: there are five, and a quest waits for the next word)
    if (!this.#heartsMoment(p)) this.#questWith(p, p.def.role === 'quest');
    return true;
  }
  /** What you may say to someone: their trade's answers, and, with something in hand you could give, the gift. */
  #answersFor(p) {
    const a = answersFor(p.def), h = this.inv?.at?.('hotbar', this.hero?.slot ?? 0);
    // (one gift a day each: once given, the answer is gone till tomorrow)
    if (!h || !p?.id || !giftable(h.id) || this.#save()?.hearts?.[p.id]?.gift === realDay(gameNow())) return a;
    // (the thing's name when it fits the answer's button, else just the gift: what is in your hand is on the hotbar)
    const what = `Give the ${nameOf(h.id, h)}`, give = [what.length <= 20 ? what : 'Give a gift', 'gift'];
    return a.length >= 3 ? a.map((x) => (x[1] === 'more' ? give : x)) : [give, ...a];
  }
  /** A SWEETHEART'S OWN MOMENT, due now (game/hearts.js EVENTS): played as a conversation, and the eighth asks whether
   *  you will walk out together (your first answer yes, your second no). True if one played. */
  #heartsMoment(p) {
    const n = eventDue(this.#save(), p.id);
    if (!n) return false;
    const ev = EVENTS[p.id], back = () => this.#answersFor(p), seen = (yes = false) => this.act('hearts.event', { npc: p.id, n, yes });
    if (n !== 8) { this.#talkPages(ev[n], () => { seen(); return back(); }); return true; }
    const pages = ev[8], q = pages[pages.length - 1];
    const answer = (yes) => () => { seen(yes); this.#talkPages(yes ? ev.yes : ev.no, back); };
    this.#talkPages(pages.slice(0, -1), () => [[this.#named(q.you[0]), answer(true)], [this.#named(q.you[1]), answer(false)]]);
    return true;
  }
  /** Meeting someone for the first time: their intro -- a line, your reply, who they are -- and then the rules'
   *  `meet` (the save remembers). A quest that wants them goes on from there; else their everyday answers. */
  #meet(p) {
    const done = () => {
      const r = this.act('meet', { npc: p.id });
      if (r.ok) this.quests?.changed?.(r);
      if (this.talk && !this.#questWith(p, false)) this.talk.answers = this.#answersFor(p);
    };
    this.#converse(p.def.intro, [['Nice to meet you.', done]]);
  }
  /** A conversation: their lines a page at a time; where a page is { you: [...] }, your replies are the answers
   *  to the line before it. `last`: the final page's answers (or a function giving them). */
  #converse(pages, last) {
    const t = this.talk;
    if (!t) return;
    const show = (i) => {
      t.words = pages[i] ?? '';
      const nx = pages[i + 1];
      if (nx && typeof nx === 'object') { t.answers = [].concat(nx.you ?? []).map((o) => [o, () => show(i + 2)]); return; }
      t.answers = i + 1 < pages.length ? [['Next', () => show(i + 1)]] : (typeof last === 'function' ? last() : last);
    };
    show(0);
  }
  /** Someone's face in the dialogue box and their trade's window, as it is just now (2026-10-22, the designer: every
   *  NPC's portrait, with its expressions): the premade people's own sheet, everyone else's made from their look (npcs.js
   *  portraitSheet, #faces) -- the face their words call for, the mouth moving while they say them, a blink now and then. */
  #face(p) {
    if (!p) return { face: '', frame: 0 };
    const words = this.talk?.p === p ? this.talk.words ?? '' : '';
    if (this.faceWho !== p || this.faceWords !== words) { this.faceWho = p; this.faceWords = words; this.faceSince = this.time; }
    const since = this.time - this.faceSince, seed = p.id?.length ?? 0;
    if (p.def.premade) return { face: p.def.premade.portrait, frame: faceFrame(words, since, this.time, seed, false) };
    return { face: 'live:npc', frame: this.npcSheet && this.npcFaceOf === p ? faceFrame(words, since, this.time, seed) : 0 };
  }

  /* ---------------------------------------------------------------- the quests (game/quests.js) */

  #save() { return this.quests?.save?.() ?? saveDoc() ?? {}; }
  /** Words with the player's name in them ({name}). */
  #named(text) { return String(text ?? '').replace(/\{name\}/g, this.quests?.name?.() || this.playerName || 'friend'); }
  /** How someone says hello (npcs.js hello), different each time; '' for someone without one. */
  #hello(p) { const h = p?.def?.hello ?? []; return h.length ? h[Math.floor(Math.random() * h.length)] : ''; }
  /**
   * A CONVERSATION (the designer, 2026-09-27: "there should be a dialogue for the player as well"): their words a
   * page at a time; a page { you: [...] } is the player's reply to the page before -- the answers, which lead
   * on. At the end, `last` (answers, or a function giving them). A conversation that ends on the player's reply
   * ends with it: each reply does what the first of `last` does, and the rest of `last` stay beside them.
   */
  #talkPages(pages, last) {
    const t = this.talk;
    if (!t) return;
    const end = () => (typeof last === 'function' ? last() : last);
    const show = (i) => {
      t.words = this.#named(pages[i]);
      const nx = pages[i + 1];
      if (nx && typeof nx === 'object') {
        const replies = [].concat(nx.you ?? []).map((o) => this.#named(o));
        if (i + 2 < pages.length) { t.answers = replies.map((o) => [o, () => show(i + 2)]); return; }
        const fin = end() ?? [];
        t.answers = [...replies.map((o) => [o, fin[0]?.[1] ?? 'bye']), ...fin.slice(1)];
        return;
      }
      t.answers = i + 1 < pages.length ? [['Next', () => show(i + 1)]] : end();
    };
    if (pages.length) show(0); else t.answers = end();
  }
  /** Words a page at a time: Next between them, and `last` (answers, or a function giving them) on the final page. */
  #pages(pages, last) {
    const t = this.talk;
    if (!t) return;
    const end = () => (typeof last === 'function' ? last() : last);
    const show = (i) => { t.words = pages[i] ?? ''; t.answers = i < pages.length - 1 ? [['Next', () => show(i + 1)]] : end(); };
    if (pages.length) show(0); else t.answers = end();
  }
  /** Someone the story wants: their part of it (a talk, a delivery), a reminder when you ask for work, or
   *  their own words. True when a quest spoke. */
  #questWith(p, asked) {
    const t = talkFor(this.#save(), p.id);
    if (t?.kind === 'talk') { this.#questTalk(p, t); return true; }
    if (t?.kind === 'deliver') { this.#questDeliver(p, t); return true; }
    // (the giver's spare, for a farmer left with none of it and nothing growing -- quests.js spareFor, commands.js quest.spare)
    if (t?.kind === 'remind' && spareFor(this.#save(), this.inv, t.q, activeOf(this.#save(), t.q.id)).length) { this.#questSpare(p, t); return true; }
    if (t?.kind === 'remind' && asked) {
      // (asked for work while their step is elsewhere: a hello, and a nudge the way they would put it)
      const lines = t.s?.remind ?? [this.#hello(p) || 'Oh, hello.', `Don't let me keep you. ${t.s?.text ?? 'You know what to do'}, wasn't it?`];
      this.#talkPages(lines, this.#answersFor(p)); return true;
    }
    return false;
  }
  /** The giver's spare (a step's `spare`): their words, and what they hand over (the rules' quest.spare). */
  #questSpare(p, t) {
    const role = this.#answersFor(p);
    const give = () => {
      const r = this.act('quest.spare', { quest: t.q.id, npc: p.id });
      if (!r.ok) { if (this.talk) { this.talk.words = r.reason; this.talk.answers = role; } return; }
      this.#gave(p, r.gave);
      this.quests?.changed?.(r);
      this.stack.close();
    };
    this.#talkPages(t.s.spareSays ?? ['Here, I kept a few back.'], [['Thank you', give]]);
  }
  /** A quest's talk: its lines, the player's answer when there is a choice, their name when it is asked, and
   *  then the rules' own quest.talk (what the person hands over). */
  #questTalk(p, t) {
    const s = t.s, q = t.q, role = this.#answersFor(p);
    const named = () => this.quests?.named?.() ?? true;
    const done = async () => {
      if (s.name && !named()) {
        const name = await this.quests?.askName?.(s.name.ask);
        if (!name) { this.#pages([s.name.ask], [['Say your name', done]]); return; }
        this.playerName = name;
      }
      const r = this.act('quest.talk', { quest: q.id, npc: p.id });
      if (!r.ok) { if (this.talk) { this.talk.words = r.reason; this.talk.answers = role; } return; }
      this.#gave(p, r.gave);
      this.quests?.changed?.(r);
      const after = s.after ?? [];
      if (after.length && this.talk) this.#talkPages(after, [['Okay', () => this.stack.close()]]);
      else this.stack.close();
    };
    const toName = () => (s.name && !named() ? this.#talkPages([s.name.ask], [['Say your name', done]]) : done());
    const last = s.choices ? () => s.choices.map(([label, reply]) => [label, () => this.#talkPages([reply], [['Okay', toName]])]) : [['Okay', toName]];
    this.#talkPages(s.lines, last);
  }
  /** A delivery: what is still wanted, or the things handed over (the server's quest.turnIn) and the thanks. */
  #questDeliver(p, t) {
    const s = t.s, q = t.q, role = this.#answersFor(p);
    const want = stillWanted(s, this.#save(), this.inv), miss = want.filter((w) => !w.met);
    if (miss.length) {
      const say = (w) => (w.have >= w.n && w.why ? `${wantName(w)} ${w.why}` : `${wantName(w)} ${Math.min(w.have, w.n)}/${w.n}`);
      const hi = this.#hello(p);
      this.#talkPages([s.missing ? (hi ? `${hi} ${s.missing}` : s.missing) : `${hi} ${s.text}?`.trim(), `You still need to bring ${miss.map(say).join(', ')}.`], role);
      return;
    }
    const give = async () => {
      const session = this.session();
      if (!session || this.busy) return;
      this.busy = true;
      let r;
      try { r = await session.ask('quest.turnIn', { quest: q.id }); } finally { this.busy = false; }
      if (!this.talk) return;
      if (!r.ok) { this.talk.words = r.reason ?? 'Not yet'; this.talk.answers = role; return; }
      this.soundOf()?.cue('place', { gain: 0.7 });
      this.quests?.handed?.(r, p);                                    // (as it is taken: Juniper's brew, Marven's thanks -- Play's magic)
      this.counts = null;                                             // (what was handed over is no pick-up)
      // WHAT WENT (testers, 2026-09-29: two fish of theirs stayed in the hotbar, and nothing said which were taken):
      // what the step asked for, one by one -- a spare of anything is still yours
      const handed = want.map((w) => (w.item === 'gold' ? `${w.n.toLocaleString('en-US')} Gold` : `${w.n > 1 ? `${w.n} ` : ''}${wantName(w)}`));
      const first = want.find((w) => w.item !== 'gold' && !w.item.endsWith(':*'));
      this.notify(`You gave ${p.def.name} ${handed.join(', ')}`, first ? itemRefOf(first.item) : '');
      this.#talkPages(s.lines, [['Okay', () => { this.stack.close(); this.quests?.changed?.(r); }]]);
    };
    const hand = want.length > 1 || want[0]?.n > 1 ? 'Hand them over' : 'Hand it over';
    this.#talkPages(s.ask ?? [want.length > 1 || want[0]?.n > 1 ? 'You have them? Let me see.' : 'You have it? Let me see.'], [[hand, give], ['Not yet', 'bye']]);
  }
  /** Something looked at closely (a clue: Play's quest.inspect; a puzzle's piece): its lines in the dialogue box,
   *  no one speaking -- and on the last page `last`'s answers (press a stone, search a watcher). */
  openStory(title, lines, last = [['Okay', 'bye']]) {
    if (!this.stack.has('dialogue')) return false;
    this.talk = { p: null, speaker: title, line: 0, words: '', answers: [] };
    if (this.stack.top) this.stack.swap('dialogue'); else this.stack.open('dialogue');
    this.#pages(lines, last);
    return true;
  }
  /** What someone handed over, as a notice. */
  #gave(p, gave) {
    if (!gave?.length) return;
    const names = gave.map(([id, n]) => `${n > 1 ? `${n} ` : ''}${nameOf(id)}`);
    const list = names.length > 3 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(', ');
    this.notify(`${p?.def?.name ?? 'You'} gave you ${list}`, itemRefOf(gave[0][0]));
    this.counts = null;
  }
  /**
   * A LINE SAID, IN THE INTERFACE'S OWN BOX (2026-10-27, the designer: the lines on a darkened plate "need to be shown in
   * our game UI ... like the box the quest uses ... on the right side, right under the quest area, where there will be an
   * option to close that box and an option to OK"): the HUD's Notice, under the Quest. A passing line goes by itself after
   * `ms` (its close button sends it sooner); something not open yet or not to be had (`ok`) waits for OK or the close.
   * False when the HUD is not there to show it (hidden, or none): Play says it its old way.
   */
  showNotice(text, { ms = 2200, ok = false, tag = null } = {}) {
    if (!this.hudShows()) return false;
    const s = String(text ?? ''), fonts = this.stack.fonts;
    const lines = Math.max(1, Math.min(NOTICE_LINES, fonts ? fonts.wrap(tr(s), NOTICE_W, 'regular').length : 3));
    const th = lines * NOTICE_LH;
    this.noticeNow = { text: s, ok: !!ok, tag: tag ?? (ok ? 'Not yet' : 'Notice'), th, h: 16 + th + (ok ? 21 : 5), until: ok ? Infinity : performance.now() + ms };
    return true;
  }
  hideNotice() { this.noticeNow = null; }
  /** Is a Notice waiting for its OK? */
  get noticeWaits() { return !!this.noticeNow?.ok; }
  /** Is the HUD up to show a Notice in (not hidden by its button, nor by a moment that takes the screen)? */
  hudShows() {
    const walk = (n) => (n?.name === 'HUD parts' ? n : (n?.children ?? []).reduce((f, c) => f ?? walk(c), null));
    const parts = walk(this.stack.docs?.get?.('hud')?.root);
    return !!parts && !parts.hidden;
  }

  /** A line over the hotbar for a few seconds (a quest begun or done, a gift): one after another, never one
   *  over the last. */
  notify(text, icon = '') {
    (this.noteQ ??= []).push({ text, icon, quest: true });
    if (!(this.toast?.quest && this.toastT > 0)) this.#nextNote();
  }
  #nextNote() { this.toast = this.noteQ.shift(); this.toastT = TOAST_SECONDS + 1.5; }

  /* ---------------------------------------------------------------- the Hearth */

  /** A stove (Play's cook spots): the Hearth window, every dish and what it takes. False without the window. */
  // (the water mill's and the dairy's too, 2026-10-22: the same window, their staples only -- rules.js STAPLES)
  openCook(place = 'cook') {
    if (!this.stack.has('cooking')) return false;
    const list = RECIPES.filter((r) => recipePlace(r) === place);
    this.cook = { place, list, pick: Math.max(0, list.findIndex((r) => this.#canCook(r))), status: '', pot: [], page: (this.hero?.slot ?? 0) >= PAGE ? 1 : 0, show: true };
    this.#rebind('cooking', { Title: { label: { cook: 'Hearth', mill: 'Water Mill', dairy: 'Dairy', craft: 'Workbench', loom: 'Loom' }[place] ?? 'Hearth' },
      // (at the workbench and the loom, what a craft gives is Crafting experience, not energy: its star, not the bolt)
      Energy: { piece: isCraftPlace(place) ? 'star.full' : 'bolt.small.full' } });
    if (this.stack.top) this.stack.swap('cooking'); else this.stack.open('cooking');
    return true;
  }
  /** THE BACKPACK'S PICK (2026-10-07, a player threw away carrots and lost an Amethyst pickaxe: a click on the hotbar row
   *  showed the carrots in hand, while Drop and Eat went on acting on the backpack slot picked before): the last thing
   *  clicked in the window, either row -- what the window shows, Drop throws away and Eat eats. [area, i]. */
  #bpSel() { return this.bpHot && this.hero ? ['hotbar', this.hero.slot] : ['bag', this.picked]; }
  /** THE BACKPACK'S ROW (2026-10-22): five slots, or ten for a holder of seven Founding Farmers (inventory.js bagSize) --
   *  the Bag grid of the Backpack and the Chest windows widens to show them all, one row as long as the hotbar's. */
  #bagGrid(n) {
    if (this.bagCols === n || !this.stack?.docs) return;
    this.bagCols = n;
    const find = (q) => (q?.type === 'grid' && q.name === 'Bag' ? q : (q?.children ?? []).map(find).find(Boolean));
    for (const id of ['backpack', 'storage']) {
      const g = find(this.stack.docs.get(id)?.root);
      if (g) { g.cols = n; g.w = n * (g.cell ?? 18) + (n - 1) * (g.gap ?? 1); }
    }
    const label = (q) => (q?.name === 'Bag label' ? q : (q?.children ?? []).map(label).find(Boolean));
    const l = label(this.stack.docs.get('backpack')?.root);
    if (l && /^Backpack \(\d+ slots\)$/.test(l.text ?? '')) l.text = `Backpack (${n} slots)`;
  }
  #canCook(R) { return this.#cookLevel(R) >= (R.level ?? 1) && R.needs.every(([id, n]) => carriedCount(this.inv, id) >= n); }
  /** The farmer's Cooking level: the dishes it opens (rules.js DISH_BOOK) -- or at a workbench, Crafting's (CRAFTS). */
  #cookLevel(R = null) { return levelOf(saveDoc()?.skills?.[isCraftPlace(R ? recipePlace(R) : this.cook?.place) ? 'crafting' : 'cooking'] ?? 0); }
  /** The window's words for its place: the stove's, the workbench's, the loom's, the mill's and the dairy's (`spot`: where
   *  what goes in sits). */
  #cookWords(place = this.cook?.place) {
    return place === 'cook' ? { go: 'Cook', going: 'Cooking...', on: 'on the fire', doing: 'cooking', skill: 'Cooking', into: 'into the pot', spot: 'in the pot' }
      : place === 'craft' ? { go: 'Craft', going: 'Crafting...', on: 'on the bench', doing: 'being made', skill: 'Crafting', into: 'onto the bench', spot: 'on the bench' }
      : place === 'loom' ? { go: 'Weave', going: 'Weaving...', on: 'on the loom', doing: 'on the loom', skill: 'Crafting', into: 'onto the loom', spot: 'on the loom' }
      : { go: 'Make', going: 'Being made...', on: '', doing: 'being made', skill: 'Cooking', into: 'into the pot', spot: 'in the pot' };
  }
  /** THE POT: one slot for each ingredient a dish takes, in the recipe's order, each holding as many as it takes (2026-10-22:
   *  the recipes doubled -- Bread's four Wheat in one slot; a slot each of them was nine wide). */
  #potUnits(R) { return R.needs.map(([id]) => id); }
  /** How many dishes what you carry makes (the portions' most: commands.js cook). */
  #potMax(R) { return Math.max(1, Math.min(99, ...R.needs.map(([id, n]) => Math.floor(carriedCount(this.inv, id) / n)))); }
  /** A cell of the window's own hotbar or backpack, as an inventory slot. */
  #cookSlot({ grid, i }) {
    if (grid === 'Cook hotbar') { const k = (this.cook?.page ?? 0) * PAGE + i; return k < this.inv.size ? { area: 'hotbar', i: k } : null; }
    if (grid === 'Cook bag') return { area: 'bag', i };
    return null;
  }
  /** The pot keeps only what is still there: a slot emptied or changed (eaten, sold, a reward in its place) lets go. */
  #potCheck() {
    const c = this.cook, R = c?.list?.[c?.pick ?? -1];
    c.pot = (c.pot ?? []).map((p, k) => (p && this.inv.at(p.area, p.i)?.id === p.id && carriedCount(this.inv, p.id) >= (R?.needs[k]?.[1] ?? 1) ? p : null));
  }
  /** Put one of a slot's things in the pot: in slot `at` if it goes there, else the first slot for it. The wrong thing
   *  -- a Perch for a Fried Fish -- is refused, by name, and what the dish takes said. */
  #potPut(area, i, at = -1) {
    const c = this.cook, R = c?.list?.[c?.pick ?? -1], s = R ? this.inv.at(area, i) : null;
    if (!s) return;
    const units = this.#potUnits(R), deny = (why) => { c.status = why; this.soundOf()?.cue('deny'); };
    if (!units.includes(s.id)) return deny(`${nameOf(s.id, s)} doesn't go in ${R.dish}. It takes ${needWords(R.needs)}`);
    const free = (k) => units[k] === s.id && !c.pot[k], k = free(at) ? at : units.findIndex((u, q) => free(q));
    if (k < 0) return deny(`There's enough ${s.id} ${this.#cookWords(c.place).spot} already`);
    const need = R.needs[k][1], have = carriedCount(this.inv, s.id);
    if (have < need) return deny(`${R.dish} takes ${need} ${s.id}: you have ${have}`);
    c.pot[k] = { area, i, id: s.id };
    // (the pot full: as many portions as what you carry makes -- fewer with the minus)
    const full = c.pot.filter(Boolean).length === units.length;
    if (full) c.n = this.#potMax(R);
    c.status = full ? '' : `${s.id} goes ${this.#cookWords(c.place).spot}`;   // (all in: the hint says what the pot costs -- #fillCook)
    this.soundOf()?.cue('place', { gain: 0.6 });
  }
  /** Take a thing out of the pot (back to its slot). */
  #potTake(k) {
    const c = this.cook, p = c?.pot?.[k];
    if (!p) return false;
    c.pot[k] = null;
    c.status = `${p.id} taken out`;
    this.soundOf()?.cue('pickup', { gain: 0.5 });
    return true;
  }
  /** A tap on the pot: a thing in it comes out; an empty slot says what goes there. */
  #potTap(k) {
    if (this.#potTake(k)) return;
    const R = this.cook?.list?.[this.cook?.pick ?? -1], id = R && this.#potUnits(R)[k];
    if (id) this.cook.status = `This one takes ${R.needs[k][1]} ${id}. Drag it here from your hotbar`;
  }
  /** The window's drag and drop: from the hotbar or backpack into the pot; out of the pot, anywhere but the pot. */
  #potDrop({ from, to }) {
    if (!this.cook) return;
    const src = this.#cookSlot(from);
    if (src && to?.grid === 'Pot') this.#potPut(src.area, src.i, to.i);
    else if (from.grid === 'Pot' && to?.grid !== 'Pot') this.#potTake(from.i);
  }
  /** COOK: the pot on the fire (the server's: it costs Gold -- commands.js cook.start), or, with a pot done, taken out. */
  async #cookNow() {
    const c = this.cook, R = c?.list?.[c?.pick ?? -1], pot = c ? saveDoc()?.[POT_KEY[c.place]] : null, now = gameNow();
    if (!c || c.busy) return;
    if (pot) {
      if (pot.ready > now) { c.status = `Your ${pot.dish} is still cooking, ${waitWords(pot.ready - now)} more`; this.soundOf()?.cue('deny'); return; }
      const r = this.act('cook.take', { place: c.place });
      c.status = r.ok ? `You took out ${r.n > 1 ? `${r.n} ` : ''}${r.dish}` : r.reason;
      // (a workbench's or the loom's piece done: the craft's own chime, 2026-10-27, the sound audit)
      this.soundOf()?.cue(r.ok ? (c.place === 'craft' || c.place === 'loom' ? 'craftDone' : 'pickup') : 'deny', r.ok ? { gain: 0.7 } : undefined);
      if (r.ok) this.quests?.changed?.(r);
      return;
    }
    if (!R) return;
    this.#potCheck();
    if (c.pot.filter(Boolean).length < this.#potUnits(R).length) { c.status = `Put the ingredients in the pot first. ${R.dish} takes ${needWords(R.needs)}`; this.soundOf()?.cue('deny'); return; }
    const n = Math.max(1, Math.min(this.#potMax(R), c.n ?? 1)), session = this.session();
    if (!session) return;
    c.busy = true; c.status = 'Putting the pot on the fire...';
    let r;
    try { r = await session.ask('cook.start', { recipe: R.dish, put: R.needs, n }); } finally { c.busy = false; }
    c.status = r?.ok ? `${n > 1 ? `${n} ` : ''}${R.dish} ${this.#cookWords().on || 'being made'}, ready in ${waitWords(Math.max(0, r.ready - gameNow()))}` : r?.reason ?? 'That could not be done';
    // (the stove's pot sizzles as it goes on, the dairy's milk pours: the library's own, 2026-10-27, the sound audit)
    this.soundOf()?.cue(r?.ok ? ({ cook: 'sizzle', dairy: 'milk' }[c.place] ?? 'place') : 'deny', r?.ok ? { gain: 0.7 } : undefined);
    if (r?.ok) c.pot = [];
  }
  #fillCook() {
    const c = this.cook, R = c.list[c.pick] ?? c.list[0], inv = this.inv, tier = this.hero?.tierDir();
    this.#potCheck();
    const units = this.#potUnits(R), inPot = c.pot.filter(Boolean).length, page = c.page * PAGE, full = inPot === units.length;
    const max = this.#potMax(R);
    c.n = Math.max(1, Math.min(max, c.n ?? 1));
    const lv = this.#cookLevel(), locked = (q) => (q.level ?? 1) > lv, W = this.#cookWords();
    const rows = c.list.map((q) => ({ name: q.dish, icon: itemRefOf(q.dish), can: this.#canCook(q), locked: locked(q), lv: locked(q) ? String(q.level) : '' }));
    // (the window's hotbar and backpack: what the cooking will use is shown gone from its slots -- the pot's one of each,
    //  or with the pot full, the portions' n of each: from the slots they were put in from, then the rest, in order)
    const gone = new Map(), slotKey = (a, i) => `${a}:${i}`;
    for (const [k, [id, m]] of R.needs.entries()) {
      if (!c.pot[k]) continue;
      let want = m * (full ? c.n : 1);
      const from = [slotKey(c.pot[k].area, c.pot[k].i)];
      const all = [...inv.hotbar.slice(0, inv.size).map((s, i) => ['hotbar', i, s]), ...inv.bag.map((s, i) => ['bag', i, s])].filter(([, , s]) => s?.id === id);
      all.sort((a, b) => (from.includes(slotKey(b[0], b[1])) ? 1 : 0) - (from.includes(slotKey(a[0], a[1])) ? 1 : 0));
      for (const [a, i, s] of all) { if (want <= 0) break; const t = Math.min(want, s.n); gone.set(slotKey(a, i), t); want -= t; }
    }
    const cell = (s, area, i) => { const n = s ? s.n - (gone.get(slotKey(area, i)) ?? 0) : 0, r = n > 0 ? itemRefOf(s.id, s, tier) : ''; return r ? { ...r, count: n > 1 ? String(n) : '' } : ''; };
    const missing = R.needs.map(([id, n]) => [id, n - carriedCount(inv, id)]).filter(([, n]) => n > 0);
    // (THE POT ON THE FIRE, 2026-10-22: cooking takes time -- what cooks and how long it has left, or done to take out)
    const fire = saveDoc()?.[POT_KEY[c.place]], left = fire ? fire.ready - gameNow() : 0, many = fire && fire.n > 1;
    const fireWords = !fire ? '' : left > 0 ? `${many ? `${fire.n} ` : ''}${fire.dish} ${W.doing}, ${waitWords(left)} left`
      : `${many ? `${fire.n} ` : ''}${fire.dish} ${many ? 'are' : 'is'} ready. Press Claim to take ${many ? 'them' : 'it'}`;
    // THE CLAIM (2026-10-26, the designer: once it is done "the player will be able to claim that dish", not press Cook
    // again): the button says what it does -- Claim, green, with a pot done; Cooking... while it is on the fire; else Cook
    const ready = !!fire && left <= 0, cookLabel = ready ? `Claim ${many ? `${fire.n} ` : ''}${fire.dish}` : fire ? W.going : W.go;
    const cost = cookCost(R.level ?? 1, c.n, R.staple ?? R.cost), one = cookCost(R.level ?? 1, 1, R.staple ?? R.cost);
    this.stack.set('cooking', {
      recipes: rows, noPick: -1, vip: !!inv.vip, cookPage: c.page, cookLabel,
      hint: c.status || fireWords || (locked(R) ? `${R.dish} needs ${W.skill} level ${R.level}` : missing.length ? `You're missing ${needWords(missing)}` : !full ? `Drag each ingredient from your hotbar ${W.into} (or tap it)`
        : `${c.n > 1 ? `${c.n} ${isCraftPlace(c.place) ? 'at once' : 'portions'}` : isCraftPlace(c.place) ? 'One' : 'One portion'} for ${cost.gold.toLocaleString('en-US')} Gold, ${cost.energy ? `${cost.energy} energy, ` : ''}${waitWords(cost.ms)}${W.on && c.place === 'cook' ? ` ${W.on}` : ''}. Press ${W.go}`),
      // (WHAT IS ON THE FIRE, IN THE POT, 2026-10-26, players: "placeholder for cooking food during and after": the dish
      //  itself, faded while it cooks, whole once it is ready to claim -- else the recipe's ingredients, as ever)
      pot: fire ? [{ ...(itemRefOf(fire.dish) || {}), count: fire.n > 1 ? String(fire.n) : '', ghost: left > 0 }]
        : units.map((id, k) => ({ ...(itemRefOf(id) || {}), count: R.needs[k][1] > 1 ? String(R.needs[k][1]) : '', ghost: !c.pot[k] })),
      cookHotbar: inv.hotbar.slice(page, page + PAGE).map((s, k) => cell(s, 'hotbar', page + k)),
      cookBag: inv.bag.map((s, k) => cell(s, 'bag', k)),
      pick: { name: R.dish, icon: itemRefOf(R.dish), energy: foodEnergy(R.dish), value: ITEMS[R.dish]?.value ?? 0,
        // (a weapon made here is worth what it does, never a shop's price: its rarity -- rules.js FORGED, 2026-10-28)
        sells: ITEMS[R.dish]?.forge ? `${WEAPON_RARITY[ITEMS[R.dish].forge.rarity]?.name ?? ''} weapon` : `Sells for ${(ITEMS[R.dish]?.value ?? 0).toLocaleString('en-US')}`,
        // (not "...XP each": the line ran over the page's right edge, 2026-10-27; the line under it says "each")
        topLine: R.craft ? `+${craftXp(R.level ?? 1)} Crafting XP` : `+${foodEnergy(R.dish)} energy`,
        // (a premium dish says what it does too: rules.js BUFFS)
        // (a common dish takes no energy to cook: rules.js COOK_TIERS, 2026-10-23)
        needs: `Takes ${needWords(R.needs)}${R.makes > 1 ? `, makes ${R.makes}` : ''}. ${one.gold.toLocaleString('en-US')} Gold${one.energy ? `, ${one.energy} energy` : ''} ${isCraftPlace(c.place) ? 'each' : 'a portion'}.${ITEMS[R.dish]?.brief ? ` ${ITEMS[R.dish].brief}` : ''}`, potAny: inPot > 0, full, emptyable: inPot > 0 && !full, portions: String(c.n),
        inPot: fire ? (left > 0 ? `${fire.dish}, ${waitWords(left)} left` : `${fire.dish} is ready to claim`)
          : full ? `${isCraftPlace(c.place) ? 'Makes' : 'Cooks'} ${max > 1 ? `${c.n} (enough for ${max})` : '1'}` : `${inPot} of ${units.length} ${this.#cookWords(c.place).spot}` },
    });
    // (the pot as wide as the dish: centred in the panel)
    const cols = fire ? 1 : units.length, w = cols * 26 + (cols - 1) * 6;
    this.#rebind('cooking', { Pot: { cols, w, x: 12 + Math.floor((172 - w) / 2) }, 'Have 1': { color: fire ? (left > 0 ? '@muted' : '@goodText') : inPot === units.length ? '@goodText' : '@muted' },
      Cook: { family: ready ? '@success' : '@primary', w: ready ? 120 : 84, state: fire && !ready ? 'disabled' : 'normal' } });
    // (the cook's book is longer than its box: the picked one's brackets on its row as the list is scrolled, gone while
    //  it is scrolled out of view; brought into view once the list knows how many rows it shows -- as the journal's)
    if (c.show && this.stack.scrollOf('cooking', 'Recipes')?.fit) { c.show = false; this.stack.scrollTo('cooking', 'Recipes', c.pick); }
    const sc = this.stack.scrollOf('cooking', 'Recipes'), at = c.pick - (sc?.top ?? 0), inView = at >= 0 && at < (sc?.fit || 7);
    this.#rebind('cooking', { Picked: { hidden: !inView } });
    if (inView) this.#rebindSelect('cooking', 'Picked', 'Recipes', at);
  }
  /** Move a screen's selection brackets onto row `i` of its list: where the design puts the list, and its rows' pitch
   *  (2026-09-28: the windows lost their tab bars and their lists moved up -- no number here of its own). */
  #rebindSelect(screen, name, list, i) {
    let L = null;
    const find = (n) => { if (L) return; if (n.name === list && n.type === 'list') L = n; else for (const c of n.children ?? []) find(c); };
    find(this.stack.docs?.get(screen)?.root ?? {});
    if (L) this.#rebind(screen, { [name]: { y: (L.y ?? 0) + i * ((L.itemH ?? 20) + (L.gap ?? 2)) } });
  }

  /* ---------------------------------------------------------------- the journal and the tracker */

  #fillJournal() {
    const save = this.#save(), all = journal(save, this.inv), open = all.filter((j) => !j.done), finished = all.filter((j) => j.done);
    const followed = trackedOf(save, this.inv);
    // IN PROGRESS and COMPLETED, each on its own tab (testers, 2026-09-29: "separating completed tasks from incomplete
    // ones"), each list as long as it is: the wheel scrolls it (the runtime's list), a click picks
    const tab = this.qTab === 1 ? 1 : 0, all2 = tab === 1 ? finished : open;
    // (opening the journal shows the quest you follow)
    if (this.qPick == null) { this.qPick = tab === 0 && followed ? Math.max(0, all2.findIndex((x) => x.q.id === followed.q.id)) : 0; this.qShow = true; }
    this.qPick = Math.max(0, Math.min(all2.length - 1, this.qPick ?? 0));
    const j = all2[this.qPick];
    this.qShown = j ?? null;
    const FF = QUESTS.filter((q) => q.chain === 'founding').length;
    // (field work goes with its chapter: quests.js FIELD_WORK)
    const fieldOf = (q) => chapterOf(QUEST[q.of] ?? {});
    const giver = (q) => (q.chain === 'founding' ? `Founding Farmers, ${chapterOf(q)} of ${FF}` : q.chain === 'fields' ? `Field work, chapter ${fieldOf(q)}` : NPCS[q.giver]?.name ?? 'Bloomshire');
    const rows = all2.map((x) => {
      const mine = followed?.q.id === x.q.id;
      return { title: x.q.name, giver: giver(x.q), glyph: x.done ? 'check' : mine ? 'star' : 'alert', color: x.done ? '@good' : mine ? '@gold' : '@warn',
        long: (this.stack.fonts?.width(tr(x.q.name), 'bold') ?? 0) > 134 };          // (on two lines: #truthful's 'Quest long')
    });
    let quest = tab === 1
      ? { title: 'Nothing finished yet', giver: 'Bloomshire', from: '', text: 'The quests you finish are kept here, with their stories.', steps: [], hasSteps: false, gold: '', canTrack: false }
      : { title: 'No quests yet', giver: 'Bloomshire', from: '', text: 'Someone will want a hand soon.', steps: [], hasSteps: false, gold: '', canTrack: false };
    if (j) {
      const steps = this.#stepRows(j);
      // WHERE TO GO, in words (the designer, 2026-09-27: "give directions and landmarks", not an arrow): the step
      // in hand's own directions; a quest done, or waiting for its reward, tells its story instead
      const now = !j.done && !j.ready ? j.q.steps[j.rec.step] : null;
      quest = { title: j.q.name, giver: giver(j.q), from: j.q.chain === 'founding' ? `Founding Farmers, chapter ${chapterOf(j.q)} of ${FF}` : j.q.chain === 'fields' ? `Field work for chapter ${fieldOf(j.q)}` : `From ${NPCS[j.q.giver]?.name ?? 'Bloomshire'}`,
        text: now?.where ?? j.q.summary, steps, hasSteps: steps.length > 0,
        gold: j.q.reward?.gold ? String(j.q.reward.gold) : '', canTrack: !j.done, trackLabel: followed?.q.id === j.q.id ? 'Following' : 'Track' };
    }
    // THE WHOLE OF THE DIRECTIONS (2026-09-29: the box held four lines, and a quest's directions ran to five or six
    // -- more in Indonesian -- and were cut off): the story takes up to two lines more, the To do below it moves down,
    // and the steps shown are the latest that still fit
    const fonts = this.stack.fonts, lines = fonts ? fonts.wrap(tr(quest.text ?? ''), 176, 'regular').length : 4;
    // (up to four lines more since 2026-10-01: a long translation was cut off at six)
    const extra = Math.max(0, Math.min(4, lines - 4));
    if (this.qExtra !== extra) {
      this.qExtra = extra;
      this.#rebind('journal', { Story: { h: 34 + extra * 9, maxLines: 4 + extra }, 'To do': { y: 74 + extra * 9 }, 'Quest steps': { y: 84 + extra * 9, h: 52 - extra * 9 } });
    }
    // EVERY WORD OF EVERY STEP (2026-10-01, a player: "cant see the text" -- "Find where the charm and the..." was cut to
    // one line): a step too long for its line goes on over as many as it needs (the mark only on its first), measured
    // as the reader sees it (in their language), clear of the list's bar; a list longer than its box scrolls (the wheel,
    // the bar), and opens on the step in hand
    if (quest.steps?.length) quest.steps = this.#wrapSteps(quest.steps, fonts);
    this.stack.set('journal', { quests: rows, quest, questTab: tab, listLabel: tab === 1 ? `Completed (${finished.length})` : `In progress (${open.length})` });
    const stepsKey = `${j?.q.id ?? ''}:${j?.rec?.step ?? ''}:${quest.steps?.length ?? 0}:${extra}`;
    if (this.qStepsKey !== stepsKey) { this.qStepsKey = stepsKey; this.qStepsScroll = true; }
    const ss = this.stack.scrollOf('journal', 'Quest steps');
    if (this.qStepsScroll && ss?.fit) {
      this.qStepsScroll = false;
      const all = quest.steps?.length ?? 0, now = Math.max(0, (quest.steps ?? []).findIndex((r) => r.now));
      this.stack.scrollTo('journal', 'Quest steps', Math.max(0, Math.min(now, all - ss.fit)), { top: true });
    }
    // the picked one's brackets: on its row as the list is scrolled -- gone while it is scrolled out of view
    // (brought into view once the list has been drawn and knows how many rows it shows)
    if (this.qShow && this.stack.scrollOf('journal', 'Quest list')?.fit) { this.qShow = false; this.stack.scrollTo('journal', 'Quest list', this.qPick); }
    const sc = this.stack.scrollOf('journal', 'Quest list'), at = this.qPick - (sc?.top ?? 0), inView = !!j && at >= 0 && at < (sc?.fit || 6);
    this.#rebind('journal', { Picked: { hidden: !inView } });
    if (inView) this.#rebindSelect('journal', 'Picked', 'Quest list', at);
  }
  /** Each step row as many rows as its words need at the list's width (less the bar's room), in the reader's language:
   *  the first with its mark, the rest without. */
  #wrapSteps(steps, fonts) {
    if (!fonts) return steps;
    const out = [];
    for (const r of steps) {
      const lines = fonts.wrap(tr(r.text ?? ''), 154, 'regular');
      if (lines.length <= 1) { out.push(r); continue; }
      lines.forEach((l, i) => out.push(i ? { text: l, done: r.done, now: r.now, glyph: '', color: r.color } : { ...r, text: l }));
    }
    return out;
  }
  /** A quest's steps as the journal lists them: the ones done (the last few), then the one in hand -- or, for
   *  a step of several parts, each part, done or not. At most five lines. */
  #stepRows(j) {
    const q = j.q, at = j.done ? q.steps.length : j.rec.step ?? 0;
    const doneRow = (text) => ({ text, done: true, now: false, glyph: 'check', color: '@good' });
    const past = q.steps.slice(0, at).map((st) => doneRow(st.text));
    if (j.done) return past.slice(-5);
    if (j.ready) return [...past.slice(-4), { text: 'Done. The reward is on its way.', done: false, now: true, glyph: 'star', color: '@gold' }];
    if (j.parts) {
      const parts = j.parts.map((p) => (p.done ? doneRow(p.text) : { text: `${p.text}${p.count ? `  ${p.count}` : ''}`, done: false, now: true, glyph: 'tri-right', color: '@warn' }));
      return [...past.slice(-Math.max(0, 5 - parts.length)), ...parts].slice(-5);
    }
    return [...past.slice(-4), { text: `${j.text}${j.progress ? `  ${j.progress}` : ''}`, done: false, now: true, glyph: 'tri-right', color: '@warn' }];
  }
  /** The HUD's tracker: the quest you follow (Track), else the one that matters most (the opening, the Founding
   *  Farmers, the town, a job) -- and of a step of several parts, the next part and how many are done. */
  #tracked() {
    if (this.#save()?.tracked === false) return null;              // (following nothing: the card hides)
    const j = trackedOf(this.#save(), this.inv);
    if (!j) return { title: 'Bloomshire', step: 'Ask around town for work' };
    // (and who it is for, and where they stand, in a line of its own: quests.js NEAR, 2026-10-28)
    if (j.next) return { title: j.q.name, step: `${j.next}  (${j.progress})`, near: j.near ?? null };
    return { title: j.q.name, step: `${j.text}${j.progress ? `  ${j.progress}` : ''}`, near: j.near ?? null };
  }
  /** A quest begun or finished since the last look: a notice. */
  #questNews() {
    const R = this.#save().quests ?? {}, sig = new Map(Object.entries(R).map(([id, r]) => [id, r.done ? 'done' : 'open']));
    if (this.qSig) {
      for (const [id, st] of sig) {
        const was = this.qSig.get(id), q = QUEST[id];
        if (!q || was === st) continue;
        // (no colon in a player's line, 2026-10-27: "Quest complete: ..." was the toast every player sees first)
        if (st === 'done') this.notify(`Quest complete! ${q.name}`);
        else if (!was) this.notify(`A new quest, ${q.name}`);
      }
    }
    this.qSig = sig;
  }
  /** The dishes' boosts on now: [{ kind, dish, words, mins }], the soonest over first -- the premium dishes' and, since
   *  2026-10-26 (players: "add visible timer for boosts received from any dish"), the Cook's Book meals' (rules.js boostsOn:
   *  one of each kind at once since 2026-10-28). */
  #boostsOn(now = gameNow()) {
    const save = { ...this.#save(), buffs: this.buffsOf?.() ?? saveDoc()?.buffs };
    return boostsOn(save, now).map((b) => ({ ...b, mins: Math.ceil(b.left / 60e3) }));
  }
  #boostChip() {
    const l = this.#boostsOn();
    if (!l.length) return '';
    const t = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);
    return l.length === 1 ? `${l[0].dish.split(' ').pop()} ${t(l[0].mins)}` : `${l.length} boosts ${t(l[0].mins)}`;
  }
  #keeper(p) { const f = this.#face(p); return { name: p.def.name, says: this.talk?.words ?? p.def.lines?.[0] ?? '', face: f.face, frame: f.frame }; }
  #status(s) { for (const w of [this.shop, this.bank, this.ex, this.mk]) if (w) w.status = s; }

  /** An answer in the dialogue box, or a click in one of the townsfolk's windows. */
  async #npcAction(verb, arg, arg2) {
    if (this.busy) return;
    const say = (w) => { if (this.talk) this.talk.words = w; };
    if (verb === 'talk') {
      const t = this.talk, a = t?.answers[+arg];
      if (!a) return;
      if (typeof a[1] === 'function') { a[1](); return; }
      if (a[1] === 'bye') { this.stack.close(); return; }
      if (!t.p) return;
      const lines = t.p.def.lines ?? [];
      if (a[1] === 'more') { t.line = (t.line + 1) % Math.max(1, lines.length); say(lines[t.line]); return; }
      if (a[1] === 'gift') {                                          // (a gift from your hand: game/hearts.js)
        const slot = this.hero?.slot ?? 0, h = this.inv?.at?.('hotbar', slot);
        const r = h ? this.act('hearts.gift', { npc: t.p.id, area: 'hotbar', i: slot, id: h.id }) : null;
        if (!r?.ok) { say(r?.reason ?? 'Take something in hand first.'); return; }
        const list = OWN_GIFT_WORDS[t.p.id]?.[r.taste] ?? GIFT_WORDS[r.taste];
        let w = list[Math.floor(Math.random() * list.length)];
        const k = { loved: 'love', liked: 'happy', disliked: 'meh', hated: 'angry' }[r.taste];
        if (k && !untag(w).tags.length) w = `{${k}}${w}`;
        say(w);
        this.soundOf()?.cue(r.up ? 'heartUp' : 'giftGive');
        if (r.up || r.down) this.notify(`${t.p.def.name} is at ${r.hearts} ${r.hearts === 1 ? 'heart' : 'hearts'}`);
        t.answers = this.#answersFor(t.p);
        return;
      }
      if (a[1] === 'seeds') { this.stack.close(); this.onSeedShop?.(); return; }
      if (a[1] === 'garden') { this.stack.close(); this.onGarden?.(); return; }
      if (a[1] === 'work') { if (!this.#questWith(t.p, true)) say('Nothing just now. Enjoy the day, and ask me again another time.'); return; }
      if (a[1] === 'ferry') {                                         // (the Night Court's ferryman: a landing, his fare -- refinement 6)
        const p = t.p, ls = this.ferryLandings?.() ?? [];
        t.answers = [...ls.map(([id, label]) => [label, () => {
          const r = this.act('ferry', { to: id });
          if (r?.ok) { this.stack.close(); this.onFerry?.(r); } else say(r?.reason ?? 'Not now.');
        }]), ['Not today', 'bye']];
        say(ls.length ? 'Where to? Sit still, and keep your hands out of the water.' : 'Nowhere to row tonight.');
        return;
      }
      if (a[1] === 'shop') {
        // each trade's own window (tools/ui-editor/starter/build-shops.mjs); the plain list if the interface lacks it
        const cfg = SHOP_SCREENS[t.p.def.shop], screen = cfg && this.stack.has(cfg.screen) ? cfg.screen : 'shop';
        this.shop = { p: t.p, screen, per: screen === 'shop' ? PER_PAGE : cfg.per, word: cfg?.word ?? 'Page', tab: 0, page: 0, pick: null, qty: 1, sellPick: null, status: '' };
        this.stack.swap(screen); return;
      }
      if (a[1] === 'bank') { this.bank = { p: t.p, status: '' }; this.stack.swap('bank'); return; }
      if (a[1] === 'exchange') {
        this.ex = { p: t.p, tab: 0, page: 0, status: '', give: { asset: 'shards', amount: 10 }, want: { asset: 'gold', amount: 500 }, step: 10, board: { open: [], mine: [] } };
        this.stack.swap('exchange'); this.#loadBoard();
      }
      if (a[1] === 'market' && this.stack.has('market')) {
        const coin = lastMkCoin();
        this.mk = { p: t.p, tab: 0, cat: 0, page: 0, item: null, lpage: 0, search: '', pick: null, qty: 1, bagPick: null, n: 1, price: MK_START[coin] ?? 10, coin, status: '',
          board: { stalls: [], myStalls: [] } };
        this.stack.swap('market'); this.#loadBoard(); this.#cryptoLook();
      }
      return;
    }
    const ask = async (name, args, done) => {
      const session = this.session();
      if (!session) return { ok: false };
      this.busy = true;
      try {
        const r = await session.ask(name, args);
        this.#status(r.ok ? done(r) : r.reason ?? 'That could not be done');
        // (a purchase and a sale heard as the shop's own, 2026-10-27, the sound audit: the library's shop-buy and shop-sell)
        this.soundOf()?.cue(r.ok ? ({ 'shop.buy': 'shopBuy', 'shop.sell': 'shopSell' }[name] ?? 'place') : 'deny', r.ok ? { gain: 0.7 } : undefined);
        this.counts = null;                                           // (what came from a counter is no pick-up)
        return r;
      } finally { this.busy = false; }
    };
    // (what was sold, and -- the day's limit reached -- why the rest stayed: commands.js sellRoom)
    const soldWords = (x, n, name) => { const k = x?.sold ?? n; return `Sold ${k > 1 ? `${k} ` : ''}${name}${x?.note ? `. ${x.note}` : ''}`; };
    /** Sell n of an item, from however many stacks hold it. */
    const sellId = async (shopNpc, id, n, name) => {
      let left = n, got = 0;
      for (const c of this.#carried((q) => q.id === id)) {
        if (left <= 0) break;
        const k = Math.min(left, c.n);
        const r = await ask('shop.sell', { npc: shopNpc, area: c.area, i: c.i, n: k, id: c.id ?? null }, (x) => soldWords(x, k, name));
        if (!r?.ok) break;
        got += r.earned ?? 0; left -= r.sold ?? k;
        if ((r.sold ?? k) < k) break;                                 // (the day's limit: the rest stays -- commands.js sellRoom)
      }
      return got;
    };
    const sh = this.shop;
    /** HOW MANY TO BUY (the designer, 2026-10-03: "add the option to buy whatever the amount they want ... in the
     *  shops"): what is bought by the stack asks how many first -- typed, or - and + -- from `n0`, up to what the Gold in
     *  hand pays for (999 at most: shop.buy's own limit). Anything bought one at a time (a tool, a chest) is not asked. */
    const buyHowMany = async (row, n0, buy) => {
      const price = row.price ?? 0, gold = saveDoc()?.purse?.gold ?? 0;
      if (price > 0 && gold < price) { this.#status('Not enough Gold'); this.soundOf()?.cue('deny'); return null; }
      const max = Math.max(1, Math.min(999, price > 0 ? Math.floor(gold / price) : 999));
      if (this.askAmount({ mode: 'buy', name: row.name, max, each: price, n: Math.min(max, n0), gold, onOk: (n) => buy(n) })) return null;
      return buy(Math.min(max, n0));
    };
    const oneAtATime = (row) => !!ITEMS[row.id]?.finite || ITEMS[row.id]?.cat === 'tool';
    if (sh) {
      const rows = this.#shopRows();
      if (verb === 'shoptab') {
        Object.assign(sh, { tab: +arg || 0, page: 0, pick: null, sellPick: null, qty: 1, status: '' });
        if (sh.tab === 2) this.act('orders.look', {});                 // (the General Store's orders: today's, made if new)
        return;
      }
      // THE GENERAL STORE'S ORDERS (game/orders.js): deliver one -- its Gold, and experience in the skill that made it
      if (verb === 'orderdeliver') {
        const row = this.#orderRows()[+arg || 0];
        if (!row) return;
        if (!row.can) { this.#status(row.done ? 'Delivered already' : `You have ${row.have} of the ${row.n} ${row.name}`); this.soundOf()?.cue('deny'); return; }
        const r = await ask('order.deliver', { npc: sh.p.id, id: row.id }, (x) => `Delivered: +${x.gold.toLocaleString('en-US')} Gold, +${x.xp} ${SKILL_NAMES[x.skill] ?? ''} XP`);
        if (r?.ok && r.levelUp) { if (this.onLevelUp) this.onLevelUp(r.skill, r.levelUp); else this.notify(`${SKILL_NAMES[r.skill] ?? 'A skill'} is level ${r.levelUp} now`); }
        return;
      }
      if (verb === 'shoppage') { sh.page = Math.max(0, Math.min(rows.pages - 1, sh.page + (+arg || 0))); return; }
      if (verb === 'shoprow' || verb === 'shopbulk') {
        // (the plain list's row: buy or sell at once)
        const i = verb === 'shoprow' ? sh.page * PER_PAGE + (+arg || 0) : sh.pick;
        const row = (sh.tab === 0 ? rows.all : rows.carried)[i];
        if (!row || row.locked) return;
        sh.pick = i;
        const bulk = verb === 'shopbulk';
        if (sh.tab === 0) {
          if (!oneAtATime(row)) {
            await buyHowMany(row, bulk ? 10 : 1, (k) => ask('shop.buy', { npc: sh.p.id, item: row.id, tier: row.tier ?? null, n: k }, () => `Bought ${k > 1 ? `${k} ` : ''}${row.name}`));
            return;
          }
          const n = 1, cost = row.price ?? 0;
          const buy = () => ask('shop.buy', { npc: sh.p.id, item: row.id, tier: row.tier ?? null, n }, () => `Bought ${row.name}`);
          // something dear (a chest, 150,000 Gold): asked first, not bought at a click
          if (cost >= 10000 && this.askYesNo({ question: `Buy ${n > 1 ? `${n} of` : 'a'} ${row.name} for ${cost.toLocaleString('en-US')} Gold?`, detail: ITEMS[row.id]?.about ?? '', yes: 'Buy', no: 'Not now',
            onYes: async () => { const r = await buy(); this.notify(r?.ok ? `You bought ${row.name}${ITEMS[row.id]?.cat === 'furniture' ? '. Hold it at home and press Space to set it down' : ''}` : r?.reason ?? 'Not bought'); } })) return;
          await buy();
        } else {
          const n = bulk ? row.n : 1;
          await ask('shop.sell', { npc: sh.p.id, area: row.area, i: row.i, n, id: row.id ?? null }, (x) => soldWords(x, n, row.name));
        }
        return;
      }
      if (verb === 'shoppick') { const i = sh.page * sh.per + (+arg || 0); if (rows.all[i]) Object.assign(sh, { pick: i, qty: 1, status: '' }); return; }
      const picked = sh.pick != null ? rows.all[sh.pick] : null, most = picked && ITEMS[picked.id]?.finite ? 1 : 99;
      if (verb === 'shopqty') { sh.qty = Math.max(1, Math.min(most, sh.qty + (+arg || 0))); return; }
      if (verb === 'shopqtyset') { sh.qty = Math.max(1, Math.min(most, +arg || 1)); return; }
      if (verb === 'shopbuy' || verb === 'shopbuyn') {
        const row = verb === 'shopbuyn' ? rows.all[0] : picked;
        if (!row || row.locked) { if (row) this.#status(`Needs Farming level ${row.level}`); return; }
        const buy = (n) => ask('shop.buy', { npc: sh.p.id, item: row.id, tier: row.tier ?? null, n }, () => `Bought ${n > 1 ? `${n} ` : ''}${row.name}`);
        if (oneAtATime(row)) { await buy(1); return; }
        // (a button with its own number -- the timber yard's Buy 5 -- buys that; Buy asks how many, from the one picked)
        if (verb === 'shopbuyn') { await buy(Math.max(1, +arg || 1)); return; }
        await buyHowMany(row, sh.qty, buy);
        return;
      }
      // a board of what they buy (the forge's crates, the carpenter's, the fish prices): one, or all of that kind
      if (verb === 'shopsell' || verb === 'shopsellall') {
        const b = rows.board[+arg || 0];
        if (b?.n) await sellId(sh.p.id, b.id, verb === 'shopsell' ? 1 : b.n, b.name);
        return;
      }
      // HOW MANY (testers, 2026-09-29: "if we have more than one fish and we sell it, all of them are getting sold"):
      // a board's Sell asks, when there is more than one
      if (verb === 'shopsellask' && arg !== undefined && arg !== '') {
        const b = rows.board[+arg || 0];
        if (!b?.n) return;
        const sell = (n) => sellId(sh.p.id, b.id, n, b.name);
        // (one of a kind a quest still wants is asked about too: the window says so)
        if ((b.n === 1 && !b.keep) || !this.askAmount({ name: b.name, max: b.n, each: b.price, keep: b.keep, onOk: sell })) await sell(1);
        return;
      }
      // the lot: everything on the board -- but what a quest in hand still wants, kept back (the Golden Fish Nixie asks for)
      if (verb === 'shopselleach') {
        let total = 0;
        const kept = [];
        for (const b of rows.board) {
          if (!b.n) continue;
          if (b.keep) kept.push(`${b.keep > 1 ? `${b.keep} ` : ''}${b.name}`);
          if (b.n - b.keep > 0) total += await sellId(sh.p.id, b.id, b.n - b.keep, b.name);
        }
        // (what was kept back, over the hotbar: the shop's own line is too short for it)
        if (total) this.#status(`Sold the lot for ${total.toLocaleString('en-US')} Gold`);
        if (kept.length) this.notify(`Kept for your quests, ${kept.join(', ')}`);
        return;
      }
      // the bag grid (seeds, the store, the bakery, the apothecary): pick a stack, sell one or all of it
      if (verb === 'shopsellpick') { sh.sellPick = rows.carried[+arg] ? +arg : null; sh.status = ''; return; }
      if (verb === 'shopsellone' || verb === 'shopsellstack' || verb === 'shopsellask') {
        const c = rows.carried[sh.sellPick];
        if (!c) return;
        const sell = async (n) => {
          await ask('shop.sell', { npc: sh.p.id, area: c.area, i: c.i, n, id: c.id ?? null }, (x) => soldWords(x, n, c.name));
          if (!this.#shopRows().carried[sh.sellPick]) sh.sellPick = null;
        };
        // (the picked stack's Sell: how many, asked -- when there is more than one, or a quest still wants it; the
        //  Founders' fruit is not sold at all yet: quests.js FOUNDERS_KEEP)
        if (keptFor(this.#save(), c.id, this.inv, 1)) { this.#status(KEPT_WHY); return; }
        const keep = Math.min(c.n, this.#questKeeps().get(c.id) ?? 0);
        if (verb === 'shopsellask' && (c.n > 1 || keep) && this.askAmount({ name: c.name, max: c.n, each: ITEMS[c.id]?.value ?? 0, keep, onOk: sell })) return;
        await sell(verb === 'shopsellstack' ? c.n : 1);
        return;
      }
    }
    if (this.bank && verb === 'banktype') {
      const purse = saveDoc()?.purse ?? {}, into = arg === 'in', have = (into ? purse.gold : purse.bank) ?? 0;
      if (!(have > 0)) { this.bank.status = into ? 'No Gold in hand' : 'The vault is empty'; return; }
      this.askNumber({ question: into ? 'Put how much Gold in the vault?' : 'Take how much Gold out?', value: have, max: have, yes: into ? 'Put in' : 'Take out',
        onOk: (n) => this.#npcAction('bank', into ? 'in' : 'out', String(n)) });
      return;
    }
    if (this.bank && verb === 'bank') {
      // (10 or 100 when there is less: what there is)
      const purse = saveDoc()?.purse ?? {}, into = arg === 'in', have = (into ? purse.gold : purse.bank) ?? 0;
      const amount = arg2 === 'all' ? have : Math.min(+arg2 || 0, have);
      if (!(amount > 0)) { this.bank.status = into ? 'No Gold in hand' : 'The vault is empty'; return; }
      await ask(into ? 'bank.deposit' : 'bank.withdraw', { npc: this.bank.p.id, amount }, () => (into ? `Put ${amount} Gold in the vault` : `Took ${amount} Gold out`));
      return;
    }
    const mk = this.mk;
    if (mk && verb.startsWith('mk')) {
      const stalls = this.#stalls(), carried = this.#marketCarried();
      const pick = mk.pick != null ? stalls.find((o) => o.id === mk.pick) : null;
      if (verb === 'mktab') { this.searchKeys?.blur(); Object.assign(mk, { tab: +arg || 0, status: '' }); this.#loadBoard(); return; }
      // browsing: a kind, the search, an item's listings, and back
      if (verb === 'mkcat') { Object.assign(mk, { cat: +arg || 0, page: 0, item: null, pick: null }); return; }
      if (verb === 'mksearch') { this.#searchKeys(); return; }
      if (verb === 'mkitem') {
        const row = this.#items()[mk.page * ITEMS_PER_PAGE + (+arg || 0)];
        // (its listings as they are now: someone may have listed or bought since the board was read)
        if (row) { Object.assign(mk, { item: row.id, lpage: 0, pick: null, qty: 1, status: '' }); this.#loadBoard(); }
        return;
      }
      if (verb === 'mkback') { Object.assign(mk, { item: null, pick: null, status: '' }); return; }
      if (verb === 'mkpage') {
        if (mk.item) mk.lpage = Math.max(0, Math.min(Math.ceil(stalls.length / LISTINGS_PER_PAGE) - 1, mk.lpage + (+arg || 0)));
        else mk.page = Math.max(0, Math.min(Math.ceil(this.#items().length / ITEMS_PER_PAGE) - 1, mk.page + (+arg || 0)));
        return;
      }
      if (verb === 'mkpick') { const o = stalls[mk.lpage * LISTINGS_PER_PAGE + (+arg || 0)]; if (o) Object.assign(mk, { pick: o.id, qty: 1, status: '' }); return; }
      if (verb === 'mkqty') { if (pick) mk.qty = Math.max(1, Math.min(pick.left, mk.qty + (+arg || 0))); return; }
      if (verb === 'mkqtyall') { if (pick) mk.qty = pick.left; return; }
      if (verb === 'mktype' && arg === 'qty') { if (pick) this.askNumber({ question: `Buy how many ${pick.name ?? ''}?`.replace(' ?', '?'), value: mk.qty, max: pick.left, onOk: (n) => { mk.qty = n; } }); return; }
      if (verb === 'mkbuy') {
        if (!pick) return;
        const n = Math.min(mk.qty, pick.left);
        if (pick.crypto) { this.#cryptoBuy(pick, n); return; }
        await ask('market.buy', { npc: mk.p.id, id: pick.id, n }, () => `Bought ${n} ${pick.name} from ${pick.byName || 'a farmer'}`);
        mk.qty = 1; await this.#loadBoard();
        return;
      }
      if (verb === 'mkbagpick') { mk.bagPick = carried[+arg] ? +arg : null; mk.n = 1; mk.status = ''; return; }
      const c = carried[mk.bagPick];
      if (verb === 'mkn') { if (c) mk.n = Math.max(1, Math.min(c.n, mk.n + (+arg || 0))); return; }
      if (verb === 'mknall') { if (c) mk.n = c.n; return; }
      if (verb === 'mktype' && arg === 'n') { if (c) this.askNumber({ question: `Set out how many ${c.name}?`, value: mk.n, max: c.n, onOk: (n) => { mk.n = n; } }); return; }
      if (verb === 'mktype' && arg === 'price') {
        // (in the stall's coin, between the least a thing may cost and the most -- the - and + keep their own step)
        const cc = CRYPTO_COINS[mk.coin];
        if (c) this.askNumber({ question: `Price each, in ${COINS[mk.coin].name}?`, coin: mk.coin, value: mk.price, by: PRICE_STEP[mk.coin] ?? 1,
          min: cc ? cc.min : COINS[mk.coin].step, max: cc ? cc.max : MARKET.maxPrice * COINS[mk.coin].unit, onOk: (v) => { mk.price = v; } });
        return;
      }
      if (verb === 'mkprice') {
        // (a crypto price: from the least a thing may cost to the most one payment may be -- catalog.js CRYPTO_COINS)
        const step = PRICE_STEP[mk.coin] ?? 1, cc = CRYPTO_COINS[mk.coin];
        mk.price = Math.max(cc ? cc.min : step, Math.min(cc ? cc.max : MARKET.maxPrice * COINS[mk.coin].unit, mk.price + (+arg || 0) * step));
        return;
      }
      // the stall's coin: Gold, Shards, $AVYN in turn (the price keeps its number as near as it can) -- and ETH and
      // USDG once trading for crypto is open and you signed in with a wallet (paid straight to it)
      if (verb === 'mkcoin') {
        const coins = [...MARKET.coins];   // (ETH and USDG are for Bloomshire Town Hall alone, 2026-10-27: commands.js market.hall)
        const next = coins[(coins.indexOf(mk.coin) + 1) % coins.length];
        mk.price = isCrypto(next) ? CRYPTO_COINS[next].min : isCrypto(mk.coin) ? 10 * COINS[next].unit : Math.max(PRICE_STEP[next], recoin(mk.price, mk.coin, next));
        mk.coin = next; keepMkCoin(next);
        mk.status = isCrypto(next) ? `Paid in ${COINS[next].name} straight to your wallet` : '';
        return;
      }
      if (verb === 'mklist') {
        if (!c) return;
        const n = Math.min(mk.n, c.n), price = mk.price, coin = mk.coin;
        const r = await ask('market.list', { npc: mk.p.id, area: c.area, i: c.i, n, price, coin, id: c.id ?? null }, (x) => `${n} ${c.name} set out at ${amountText(coin, price)} each${x?.fee ? `. Listing fee ${amountText(x.fee.coin, x.fee.units)}` : ''}`);
        if (r?.ok) { mk.bagPick = null; mk.n = 1; keepMkCoin(coin); }
        await this.#loadBoard();
        return;
      }
      // your listings, three a page (a player may have eight)
      if (verb === 'mkmpage') { mk.mpage = Math.max(0, Math.min(Math.ceil((mk.board.myStalls ?? []).length / MY_STALLS) - 1, (mk.mpage ?? 0) + (+arg || 0))); return; }
      if (verb === 'mkhpage') { mk.hpage = Math.max(0, Math.min(Math.ceil((mk.board.history ?? []).length / HISTORY_ROWS) - 1, (mk.hpage ?? 0) + (+arg || 0))); return; }
      if (verb === 'mkcollect' || verb === 'mkcancel') {
        const o = (mk.board.myStalls ?? [])[(mk.mpage ?? 0) * MY_STALLS + (+arg || 0)];
        if (!o) return;
        const name = nameOf(o.item, o.slot ?? null), coin = o.coin ?? 'gold';
        if (verb === 'mkcollect') await ask('market.collect', { id: o.id }, (r) => `Collected ${amountText(coin, r.got)} for your ${name}`);
        else await ask('market.cancel', { id: o.id }, (r) => `Took back your ${name}${r.got ? `, and ${amountText(coin, r.got)}` : ''}`);
        await this.#loadBoard();
        return;
      }
      return;
    }
    const ex = this.ex;
    if (!ex) return;
    if (verb === 'exchtab') { ex.tab = +arg || 0; ex.page = 0; if (ex.tab === 1) this.#loadBoard(); return; }
    if (verb === 'exchpage') { ex.page = Math.max(0, Math.min(this.#exRows().pages - 1, ex.page + (+arg || 0))); return; }
    const per = ex.tab === 1 ? OFFERS_PER_PAGE : PER_PAGE;
    if (verb === 'swap') {
      const w = SWAPS[ex.page * PER_PAGE + (+arg || 0)];
      if (w) await ask('shop.trade', { npc: ex.p.id, swap: w.id, n: 1 }, () => `Swapped ${w.give.map(([id, k]) => `${k} ${id}`).join(', ')} for ${w.get.map(([id, k]) => `${k} ${id}`).join(', ')}`);
      return;
    }
    if (verb === 'offer') {
      const row = this.#exRows().all[ex.page * per + (+arg || 0)];
      if (!row) return;
      if (row.kind === 'take') await ask('offer.take', { npc: ex.p.id, id: row.id }, (r) => `You got ${amountText(row.give.asset, r.got)}${r.fee ? ` (fee ${coinText(row.give.asset, r.fee)})` : ''}`);
      else if (row.kind === 'cancel') await ask('offer.cancel', { id: row.id }, () => 'Offer taken back');
      else if (row.kind === 'collect') await ask('offer.collect', { id: row.id }, (r) => `Collected ${amountText(row.want.asset, r.got)}`);
      this.#loadBoard();
      return;
    }
    if (verb === 'offerflip') { [ex.give, ex.want] = [ex.want, ex.give]; return; }
    // a side's coin: Gold, Shards, $AVYN in turn -- the other side takes this side's old coin when the two would meet
    if (verb === 'offercoin') {
      const side = arg === 'want' ? ex.want : ex.give, other = arg === 'want' ? ex.give : ex.want;
      const next = OFFER_ASSETS[(OFFER_ASSETS.indexOf(side.asset) + 1) % OFFER_ASSETS.length];
      if (next === other.asset) Object.assign(other, { asset: side.asset, amount: recoin(other.amount, other.asset, side.asset) });
      Object.assign(side, { asset: next, amount: recoin(side.amount, side.asset, next) });
      if (!exSteps(ex).includes(ex.step)) ex.step = 1;
      return;
    }
    if (verb === 'offergive' || verb === 'offerwant') {
      const side = verb === 'offergive' ? ex.give : ex.want;
      side.amount = Math.max(COINS[side.asset].step, side.amount + (+arg || 0) * stepUnits(side.asset, ex.step));
      return;
    }
    if (verb === 'offertype') {
      // (what you give: at most what you have; what you want: up to the Exchange's own most)
      const side = arg === 'want' ? ex.want : ex.give, cn = COINS[side.asset].name, have = saveDoc()?.purse?.[side.asset] ?? 0;
      this.askNumber({ question: arg === 'want' ? `Ask for how much ${cn}?` : `Give how much ${cn}?`, coin: side.asset, value: side.amount, by: stepUnits(side.asset, ex.step),
        min: COINS[side.asset].step, max: arg === 'want' ? 1e9 * COINS[side.asset].unit : Math.max(COINS[side.asset].step, have - (have % COINS[side.asset].step)), onOk: (v) => { side.amount = v; } });
      return;
    }
    if (verb === 'offerstep') { const steps = exSteps(ex); ex.step = steps[(steps.indexOf(ex.step) + 1) % steps.length]; return; }
    if (verb === 'offerpost') {
      await ask('offer.post', { npc: ex.p.id, give: { ...ex.give }, want: { ...ex.want } },
        () => `Posted ${amountText(ex.give.asset, ex.give.amount)} for ${amountText(ex.want.asset, ex.want.amount)}`);
      this.#loadBoard();
    }
  }

  /** The Exchange's board and the Market Hall's stalls, as the server has them now. */
  async #loadBoard() {
    const b = await this.session()?.offers?.();
    if (!b) return;
    if (this.ex) this.ex.board = b;
    if (this.mk) this.mk.board = b;
  }

  /* ---------------------------------------------------------------- trading for crypto (game/cryptopay.js, server/crypto.js) */

  /** Is trading for crypto open, and on what chain (asked of the server when the Marketplace or a trade opens)? */
  async #cryptoLook() { const r = await this.session()?.crypto?.('info'); if (r) this.cryptoInfo = r; }
  /** May you price a listing (or pay in a trade) in crypto just now: open, and you signed in with a wallet. */
  #cryptoOpen() { return !!(this.cryptoInfo?.open && this.cryptoInfo.wallet); }

  /** A LISTING PAID IN CRYPTO: asked first; then a ticket (the listing held for you), your wallet pays the seller's (2.5%
   *  to the game on the way), and the server hands over the goods once the chain has the payment. */
  #cryptoBuy(pick, n) {
    const mk = this.mk, c = CRYPTO_COINS[pick.coin], total = pick.price * n;
    if (!this.cryptoInfo?.open) { this.#status('Paying in crypto is not open just now'); return; }
    if (!this.cryptoInfo.wallet) { this.#status('Sign in with your wallet to pay in crypto'); return; }
    if (this.cryptoPaying) { this.#status('A payment is on its way already'); return; }
    if (pick.held === 'other') { this.#status('Someone is paying for this just now'); return; }
    if (total > c.max) { this.#status(`At most ${amountText(pick.coin, c.max)} in one payment`); return; }
    // (the Marketplace comes back after the question, yes or no)
    const back = () => setTimeout(() => { if (this.mk === mk && !this.stack.top) this.stack.open('market'); }, 0);
    if (!this.askYesNo({ question: `Pay ${amountText(pick.coin, total)} for ${n} ${pick.name}?`,
      detail: `From your wallet, on ${this.cryptoInfo.chain?.name ?? 'Robinhood Chain'}: ${pick.seller} gets 97.5%, the game 2.5%. Held for you ${this.cryptoInfo.minutes ?? 10} minutes.`,
      yes: 'Pay', no: 'Not now', onYes: () => { back(); this.#cryptoPay(pick, n); }, onNo: back })) this.#cryptoPay(pick, n);
  }

  async #cryptoPay(pick, n) {
    const s = this.session(), mk = this.mk;
    // (each step on the Marketplace's status line; the outcome told as news if the window has gone)
    const say = (t, last = false) => { if (this.mk === mk && this.stack.top === 'market') mk.status = t; else if (last) this.notify(t); };
    this.cryptoPaying = true;
    try {
      say('Asking for a ticket...');
      const q = await s.crypto('quote', { listing: pick.id, n });
      if (!q.ok) { say(q.reason ?? 'Not now', true); this.soundOf()?.cue('deny'); return; }
      this.#loadBoard();
      let tx;
      try { tx = await payTicket(q, (t) => say(`${t}...`)); } catch (e) { say(e.message, true); this.soundOf()?.cue('deny'); return; }
      const r = await settle(s, q.ticket.id, tx, (t) => say(`${t}...`));
      if (r.ok) { say(`Paid. ${n} ${pick.name} ${n > 1 ? 'are' : 'is'} yours`, true); this.soundOf()?.cue('pickup'); if (this.mk === mk) mk.qty = 1; }
      else if (r.waiting) say('Paid. The network is slow today, so your goods arrive by themselves in a few minutes', true);
      else { say(r.reason ?? 'That did not work', true); this.soundOf()?.cue('deny'); }
    } finally { this.cryptoPaying = false; this.#loadBoard(); }
  }

  /** A listing of yours paid for in crypto (server/crypto.js): the news, and the Marketplace as it is now. */
  cryptoHeard(m) {
    const x = m.sold, c = CRYPTO_COINS[x?.coin];
    if (!x || !c) return;
    const units = Number((BigInt(x.amount) * BigInt(c.unit)) / 10n ** BigInt(c.decimals));
    this.notify(`Sold ${x.n} ${nameOf(x.item)} for ${amountText(x.coin, units)}, and ${amountText(x.coin, units - cryptoFee(units))} went to your wallet`);
    this.soundOf()?.cue('pickup');
    if (this.mk) this.#loadBoard();
  }

  /** What you carry, stack by stack (bag, then hotbar): { id, area, i, n, name, icon, price }. */
  /** What may go on a Market Hall stall, as the list shows it AND as a pick in it is read: one list for both (2026-10-28,
   *  a player listed Copper Ore and a Cabbage went up -- the list drawn kept a bound thing, a Frost tool or an Energy
   *  Refill, that the list picked from left out, so every row below it named the next one down). */
  #marketCarried() { return this.#carried((q) => !MARKET_NEVER.has(ITEMS[q.id]?.cat) && !ITEMS[q.id]?.bound); }
  #carried(keep = () => true) {
    const inv = this.inv, tier = this.hero?.tierDir(), out = [];
    for (const area of ['hotbar', 'bag']) inv.area(area).forEach((q, i) => {
      if (!q || (area === 'hotbar' && i >= inv.size) || !keep(q)) return;
      out.push({ id: q.id, area, i, n: q.n, name: nameOf(q.id), icon: itemRefOf(q.id, q, tier), price: ITEMS[q.id]?.value ?? 0 });
    });
    return out;
  }

  /** A shop's rows: its goods (all, with what each needs); what you carry that it buys (carried: the bag
   *  grid); and, for a trade that buys a few kinds, a board of every kind with how many you have. */
  #shopRows() {
    const sh = this.shop, id = sh.p.def.shop, shop = SHOPS[id], level = levelOf(saveDoc()?.skills?.farming ?? 0), tier = this.hero?.tierDir();
    // (THE SEASONS, 2026-10-22: this season's seeds to buy, the next season's shown locked, the others not at all)
    const S = WORLD_TIME.seasons, next = S[(S.indexOf(seasonAt()) + 1) % S.length];
    const all = (shop?.sells ?? []).map((e, i) => {
      const it = ITEMS[e.id], sd = it?.cat === 'seed' ? SEEDS[+e.id.slice(5)] : null, later = !!sd && !inSeason(sd);
      const locked = (e.level ?? 1) > level || later, slot = it?.finite ? { tier: e.tier ?? 1 } : null;
      let note = '';
      if (later) note = `Sold in ${next}`;
      else if (locked && sh.screen === 'shop') note = `Needs Farming level ${e.level}`;
      else if (it?.finite) note = `${TOOL_TIERS[e.tier ?? 1]?.uses} uses`;
      else if (sd) note = !sd.regrow ? `Grows in ${sd.grow} min` : level >= REGROW_FROM_LEVEL ? `Grows in ${sd.grow} min, ${sd.harvests} harvests` : `Grows in ${sd.grow} min, again from Farming ${REGROW_FROM_LEVEL}`;
      else if (it?.cat === 'food') note = `+${it.energy} energy`;
      return { i, id: e.id, tier: e.tier ?? null, name: nameOf(e.id, slot), note, icon: itemRefOf(e.id, slot, tier), price: priceOf(e), priceShort: shortGold(priceOf(e)), label: 'Buy', locked,
        level: e.level ?? 1, tierName: e.tier ? TOOL_TIERS[e.tier]?.name ?? '' : '', uses: e.tier ? TOOL_TIERS[e.tier]?.uses ?? '' : '', energy: it?.energy ?? '', hide: later && !sd.seasons.includes(next) };
    }).filter((r) => !r.hide);
    const carried = this.#carried((q) => shopBuys(id, q.id));
    // the board: every kind the trade buys, when they are few (the forge's and the carpenter's crates, the fish)
    const kinds = Array.isArray(shop?.buys) && shop.buys.every((c) => BOARD_CATS.has(c)) ? Object.keys(ITEMS).filter((k) => shopBuys(id, k)) : [];
    // (what you carry first -- testers, 2026-09-29: the Golden Fish was below the fold -- then the rest, in the
    //  catalogue's order; a quest's still-wanted ones are kept back from "Sell the lot")
    const keeps = this.#questKeeps();
    const board = kinds.map((k, i) => {
      const n = carried.filter((c) => c.id === k).reduce((s, c) => s + c.n, 0), keep = Math.min(n, keeps.get(k) ?? 0);
      return { i, id: k, name: nameOf(k), icon: itemRefOf(k), n, price: ITEMS[k].value, total: ITEMS[k].value * n, has: n > 0, keep };
    }).sort((a, b) => (b.has - a.has) || a.i - b.i);
    const per = sh.per ?? PER_PAGE;
    return { all, carried, board, pages: Math.max(1, Math.ceil((sh.tab === 0 || sh.screen !== 'shop' ? all.length : carried.length) / per)) };
  }

  /** The General Store's orders as cards: what each asks, what it pays, and whether you can deliver it now. */
  #orderRows() {
    const o = saveDoc()?.orders, tier = this.hero?.tierDir();
    if (!o?.list) return [];
    return o.list.map((q) => {
      const have = this.inv?.count(q.item) ?? 0, done = o.done.includes(q.id);
      return { id: q.id, name: nameOf(q.item), icon: itemRefOf(q.item, null, tier), n: q.n, count: q.n, have,
        gold: q.gold.toLocaleString('en-US'), xp: `+${q.xp} ${SKILL_NAMES[q.skill] ?? ''} XP`,
        done, can: !done && have >= q.n, short: !done && have < q.n, haveText: `${Math.min(have, q.n)} / ${q.n}` };
    });
  }
  #ordersData() {
    // (the day turned with the window open, or an order came back "gone": today's are asked for, once a day)
    const today = dayOf(Date.now());
    if (saveDoc()?.orders?.day !== today && this.ordersAsked !== today) { this.ordersAsked = today; this.act('orders.look', {}); }
    // (the board never runs out since 2026-10-28: orders.js refillOrders -- what is said is how many went today)
    const rows = this.#orderRows(), sent = saveDoc()?.orders?.done?.length ?? 0;
    return { orders: rows, noOrders: !rows.length,
      ordersNote: this.shop?.status || (sent ? `${sent} delivered today. Each one you deliver brings a new order` : 'Each order you deliver brings a new one') };
  }

  /** The Marketplace's items of the kind picked (and the search): every item that can be listed, those with listings
   *  first -- how many, and the cheapest (Gold before Shards before $AVYN). */
  #items() {
    const mk = this.mk, kinds = MK_CATS[mk.cat]?.[1], q = (mk.search ?? '').trim().toLowerCase(), tier = this.hero?.tierDir();
    const by = new Map();
    for (const o of mk.board.stalls ?? []) { if (!by.has(o.item)) by.set(o.item, []); by.get(o.item).push(o); }
    const rows = [];
    for (const [id, d] of Object.entries(ITEMS)) {
      if (MARKET_NEVER.has(d.cat) || d.bound || (kinds && !kinds.includes(d.cat))) continue;
      const name = nameOf(id);
      if (q && !name.toLowerCase().includes(q)) continue;
      const list = by.get(id) ?? [], best = [...list].sort(cheapestFirst)[0];
      rows.push({ id, name, icon: itemRefOf(id, null, tier), n: list.length, has: list.length > 0,
        note: best ? `${list.length} listing${list.length > 1 ? 's' : ''}, from ${amountText(best.coin ?? 'gold', best.price)}` : 'No listings yet' });
    }
    return rows.sort((a, b) => (b.n > 0) - (a.n > 0) || a.name.localeCompare(b.name));
  }

  /** The listings of the item being looked at, cheapest first: who sells it, how many, at what (a tool: its uses). */
  #stalls() {
    const mk = this.mk, tier = this.hero?.tierDir();
    if (!mk.item) return [];
    return (mk.board.stalls ?? []).filter((o) => o.item === mk.item).sort(cheapestFirst)
      .map((o) => ({ ...o, ...coinOf(o.coin, o.price), name: nameOf(o.item, o.slot ?? null), icon: itemRefOf(o.item, o.slot ?? null, tier),
        seller: o.byName || 'A farmer',
        // (a listing paid in crypto is held while its buyer pays: for you, or for someone else)
        sub: o.held === 'you' ? 'Held for you. Pay for it' : o.held ? 'Someone is paying for it' : o.slot?.uses != null ? `${o.slot.uses} uses left` : `${o.left} for sale`,
        from: o.slot?.uses != null ? `from ${o.byName || 'a farmer'}, ${o.slot.uses} uses left` : `from ${o.byName || 'a farmer'}, ${o.left} left` }));
  }

  /** The search box: what is typed goes into a hidden text box (the keys, a paste, a phone's keyboard), as the name
   *  box does; Enter or Escape leaves it. */
  #searchKeys() {
    if (this.searchKeys) { this.searchKeys.focus(); return; }
    const input = document.createElement('input');
    Object.assign(input, { className: 'play-name-keys', maxLength: 24, value: this.mk?.search ?? '', autocomplete: 'off', spellcheck: false });
    input.setAttribute('aria-label', 'Search the Marketplace');
    input.addEventListener('input', () => { if (this.mk) Object.assign(this.mk, { search: input.value, page: 0, item: null, pick: null }); });
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); input.blur(); } });
    input.addEventListener('blur', () => { input.remove(); if (this.searchKeys === input) this.searchKeys = null; });
    this.searchKeys = input;
    document.body.append(input);
    Object.assign(input, { enterKeyHint: 'search', autocapitalize: 'off' }); input.setAttribute('autocorrect', 'off');
    input.focus({ preventScroll: true });                    // (a phone's keyboard: only while the finger is down)
    setTimeout(() => input.focus({ preventScroll: true }), 30);
  }

  /** A tap on the interface while a box waits for letters (the name, the Marketplace's search): its phone keyboard up,
   *  in the tap itself -- a keyboard put away with its Done comes back at the next tap (game/touch.js). */
  keysFocus() {
    const st = this.naming, input = st?.input && this.stack.top === 'name' ? st.input : this.amount?.input && this.stack.top === 'amount' ? this.amount.input : null;
    if (!input) return;
    input.blur(); input.focus({ preventScroll: true });
  }

  /** The Exchange's rows: the swaps, or the board -- your own offers first, then everyone else's. */
  #exRows() {
    const ex = this.ex, inv = this.inv, all = [];
    if (ex.tab === 0) {
      for (const w of SWAPS) {
        const [gid, gk] = w.give[0], [tid, tk] = w.get[0], have = inv.count(gid);
        all.push({ icon: itemRefOf(gid), name: `${w.give.map(([id, k]) => `${k} ${id}`).join(', ')} for ${w.get.map(([id, k]) => `${k} ${id}`).join(', ')}`, note: `You have ${have} ${gid}`,
          have, giveIcon: itemRefOf(gid), giveN: String(gk), getIcon: itemRefOf(tid), getN: String(tk), locked: have < gk });
      }
    } else {
      const name = (o) => `${amountText(o.give.asset, o.give.amount)} for ${amountText(o.want.asset, o.want.amount)}`;
      for (const o of ex.board.mine ?? []) {
        if (o.status === 'open') all.push({ ...o, kind: 'cancel', name: name(o), note: 'Your offer, waiting', label: 'Cancel' });
        else all.push({ ...o, kind: 'collect', name: name(o), note: `Taken, ${amountText(o.want.asset, o.proceeds)} for you`, label: 'Collect' });
      }
      // (what the taker would get, the fee already cut: offerFees)
      for (const o of ex.board.open ?? [])
        all.push({ ...o, kind: 'take', name: name(o), note: `From ${o.byName || 'a farmer'}: you get ${amountText(o.give.asset, o.give.amount - offerFees(o)[0])}`, label: 'Take' });
    }
    return { all, pages: Math.max(1, Math.ceil(all.length / (ex.tab === 1 ? OFFERS_PER_PAGE : PER_PAGE))) };
  }

  /** WHAT THE SHOPS STILL TAKE TODAY (2026-10-21, rules.js SELL_LIMITS; the server counts it, save.sold): the Gold left,
   *  and the words for one thing in the sell list -- how many more, and how many of it came over from the playtest
   *  (`line`: a whole line for the window's foot, the thing picked). */
  #sellLeft(c = null, line = false) {
    const s = saveDoc(), sold = s?.sold?.day === realDay(gameNow()) ? s.sold : null;
    const gold = Math.max(0, goldCap(saveDoc()) - (sold?.gold ?? 0)), goldText = `${gold.toLocaleString('en-US')} more Gold`;
    const things = Math.max(0, SELL_LIMITS.things - (sold?.n ?? 0));
    if (!gold || !things) return 'The shops have bought all they will from you today. They buy again tomorrow';
    // (today's favour, asked before the first sale: commands.js errandToday -- the shop's foot says what it is)
    const held = (id) => this.inv.count(id) + Object.values(this.inv.chests ?? {}).reduce((t, l) => t + (l ?? []).reduce((u, q) => u + (q?.id === id ? q.n ?? 1 : 0), 0), 0);
    const fav = s?.id ? errandToday(s, s.id, gameNow(), held) : null;
    if (fav) return `A favour first. Bring ${fav.words}, then the shops buy from you today`;
    if (!c) return `The shops pay you ${goldText} today, for ${things} more things`;
    const more = Math.max(0, Math.min(things, SELL_LIMITS.perItem - (sold?.items?.[c.id] ?? 0))), kept = PLAYTEST_ITEMS_FREE ? 0 : Math.min(c.n, s?.carried?.[c.id] ?? 0);
    // (a crop above the farmer's Farming level: the shops buy it only from those who can grow it -- commands.js sellRoom)
    const from = SEED_SOURCES.shopAtFarmingLevel[c.id] ?? 0;
    if (from > 1 && levelOf(s?.skills?.farming ?? 0) < from) return line ? `The shops buy ${c.name} only from farmers who can grow it, at Farming ${from}` : `You have ${c.n}, not yours to sell to a shop yet`;
    if (line) {
      if (kept >= c.n) return 'These came from the playtest. Trade them or list them';
      if (!more) return `The shops have all the ${c.name} they want from you today`;
      if (kept) return `The shops take ${Math.min(c.n - kept, more)} of these today, as ${kept} came from the playtest`;
      return `The shops take ${more} more today, up to ${gold.toLocaleString('en-US')} Gold`;
    }
    if (kept >= c.n) return `You have ${c.n}, from the playtest`;
    return `You have ${c.n}${kept ? ` (${kept} from the playtest)` : ''}, ${more ? `${more} more today` : 'no more today'}`;
  }

  /** AN ITEM'S STATS IN A LINE (2026-10-26, players: "show stats of items in SHOP"): what is worth knowing before buying --
   *  a tool's uses, a weapon's rarity and blow, a dish's energy and health and boost, a seed's time and season and what
   *  its crop fetches. */
  #statsLine(id, row = null) {
    // (a shop's row says which metal or rarity it sells: a Bronze Axe, not the Iron one the id alone means)
    const slot = row && (row.tier || row.rarity) ? { ...(row.tier ? { tier: row.tier } : {}), ...(row.rarity ? { rarity: row.rarity } : {}) } : null;
    const it = ITEMS[id], info = itemInfo(id, this.hero?.tierDir(), this.inv?.icons ?? {}, slot), bits = [];
    if (info?.finite) bits.push(`${Number(info.maxUses ?? 0).toLocaleString('en-US')} uses`);
    if (info?.weapon) bits.push(`${info.rarityName ?? 'Common'} weapon${info.damage && info.damage !== 1 ? `, ${info.damage}x the blow` : ''}${info.knock ? ', knocks back' : ''}`);
    if (it?.cat === 'food') {
      const e = foodEnergy(id), h = foodHealth(id);
      if (e) bits.push(`+${e} energy`); if (h) bits.push(`+${h} health`); if (it.brief) bits.push(it.brief.replace(/\.$/, ''));
    }
    if (info?.use === 'sow') {
      const q = SEEDS[info.seed], crop = ITEMS[q?.name];
      if (q?.grow) bits.push(`grows in ${waitWords(q.grow * 60e3)}`);
      if (q?.seasons?.length) bits.push(q.seasons.join(' and '));
      if (crop?.value) bits.push(`the crop sells for ${crop.value.toLocaleString('en-US')} Gold`);
    } else if (it?.value && it.cat !== 'food' && !info?.tool) bits.push(`sells back for ${it.value.toLocaleString('en-US')} Gold`);
    if (!bits.length && it?.about) bits.push(it.about.replace(/\.$/, ''));
    // (without the thing's name in front, "Carrot seeds: grows in..." -- the counter beside it shows the name already, and the
    //  line ran past its box in every trade's window and over the Bakery's tabs; and no colon in a player's line: 2026-10-27)
    const line = bits.join(', ') || 'Press Buy';
    return line[0].toUpperCase() + line.slice(1);
  }

  /** Fill whichever of the townsfolk's windows is open. */
  #fillTownsfolk() {
    const S = this.stack, purse = saveDoc()?.purse ?? {};
    if (S.top === 'dialogue' && this.talk) {
      // A LINE'S EMOTES (2026-10-22, the designer: "when there are shocking, surprising things ... an exclamation mark on
      // top of the player. Same thing with the NPCs"): its tags ({!} over the speaker, {me:?} over you: game/scenes.js),
      // else the face the words call for over whoever says them -- once, as the line comes up. The tags never show.
      if (this.talk.words !== this.tagWords) {
        const { text, tags } = untag(this.talk.words ?? '');
        this.talk.words = text; this.tagWords = text;
        const them = this.talk.p ?? 'me';
        for (const g of tags) this.emote?.(g.me ? 'me' : them, g.kind);
        if (!tags.length && this.talk.p) {
          const m = moodOf(text), kind = m === 'oh' ? '!' : m === 'cross' ? 'angry' : m === 'sad' ? 'sad' : /\bha(ha)+\b/i.test(text) ? 'laugh' : null;
          if (kind) this.emote?.(this.talk.p, kind);
        }
      }
      // a place's story (a clue) has no face and no name plate: its words take their room
      const story = !this.talk.p;
      if (this.dlgStory !== story) {
        this.dlgStory = story;
        this.#rebind('dialogue', { Face: { hidden: story }, 'Name plate': { hidden: story }, Words: story ? { x: 12, w: 302 } : { x: 92, w: 222 } });
      }
      const f = this.#face(this.talk.p), a = this.talk.answers;
      S.set('dialogue', { speaker: this.talk.speaker ?? this.talk.p?.def.name ?? '', words: this.talk.words, face: f.face, faceFrame: f.frame,
        a0: a[0]?.[0] ?? '', a1: a[1]?.[0] ?? '', a2: a[2]?.[0] ?? '' });
    }
    const sh = this.shop;
    if (sh && S.top === sh.screen && sh.screen === 'shop') {
      const rows = this.#shopRows(), list = sh.tab === 0 ? rows.all : rows.carried.map((c) => ({ ...c, note: this.#sellLeft(c), label: 'Sell' }));
      const from = sh.page * PER_PAGE, pick = sh.pick != null && sh.pick >= from && sh.pick < from + PER_PAGE ? sh.pick - from : null;
      const picked = sh.pick != null ? list[sh.pick] : null;
      S.set('shop', { title: SHOPS[sh.p.def.shop]?.name ?? sh.p.def.title, tab: sh.tab, keeper: this.#keeper(sh.p), gold: purse.gold ?? 0,
        goods: list.slice(from, from + PER_PAGE), pages: rows.pages > 1, pageText: rows.pages > 1 ? `Page ${sh.page + 1} of ${rows.pages}` : '',
        hasPick: pick != null, pickY: 38 + (pick ?? 0) * 27,
        bulkLabel: !picked || picked.locked ? '' : sh.tab === 0 ? (ITEMS[picked.id]?.finite ? '' : 'Buy 10') : picked.n > 1 ? `Sell all ${picked.n}` : '',
        status: sh.status || (sh.tab === 0 ? (picked && !picked.locked ? this.#statsLine(picked.id, picked) : 'Pick something to buy') : list.length ? this.#sellLeft() : 'Nothing you carry sells here') });
    } else if (sh && S.top === sh.screen) {
      // a trade's own window: its goods a page at a time, the one picked, what you could sell it
      const rows = this.#shopRows(), per = sh.per, from = sh.page * per, p = sh.pick != null ? rows.all[sh.pick] : null;
      const sale = sh.sellPick != null ? rows.carried[sh.sellPick] : null, carried = rows.carried;
      const sellTotal = rows.board.reduce((s, b) => s + b.price * (b.n - b.keep), 0);
      // (a purse in a narrow corner, short: "98.7M", "123K" -- the Seed & Tool's 50 pixels beside Hazel's face, where
      //  "98,765,432" ran under the portrait, 2026-10-27; never rounded up)
      const g0 = purse.gold ?? 0, goldShort = g0 < 1e5 ? g0.toLocaleString('en-US') : g0 < 1e6 ? `${Math.floor(g0 / 1e3)}K` : `${(Math.floor(g0 / 1e5) / 10).toLocaleString('en-US')}M`;
      S.set(sh.screen, { title: SHOPS[sh.p.def.shop]?.name ?? sh.p.def.title, keeper: this.#keeper(sh.p), gold: purse.gold ?? 0, goldShort, status: sh.status || (sh.tab === 1 ? this.#sellLeft(sh.sellPick != null ? rows.carried[sh.sellPick] : null, true) : sh.tab === 0 && p && !p.locked ? this.#statsLine(p.id, p) : ''),
        tab: sh.tab, onBuy: sh.tab === 0, onSell: sh.tab === 1, onOrders: sh.tab === 2, cardTitle: sh.tab === 0 ? "Today's Menu" : 'Your crops',
        ...(sh.tab === 2 ? this.#ordersData() : {}),
        wares: rows.all.slice(from, from + per).map((r, k) => ({ ...r, picked: from + k === sh.pick })),
        hasPages: rows.pages > 1, pageText: rows.pages > 1 ? `${sh.word} ${sh.page + 1} of ${rows.pages}` : '',
        pick: p ? { ...p, canBuy: !p.locked, lock: p.locked ? `Needs Farming level ${p.level}` : '' } : {}, hasPick: !!p, noPick: !p,
        qty: sh.qty, total: p ? p.price * sh.qty : 0, log: rows.all[0] ?? {},
        sells: rows.board, hasSells: rows.board.some((b) => b.n > 0), sellTotal, sellLot: sellTotal > 0,
        sellItems: carried.map((c) => (c.icon && typeof c.icon === 'object' ? { ...c.icon, count: c.n } : c.icon)), sellPick: sh.sellPick ?? -1,
        sale: sale ?? {}, hasSellPick: !!sale, noSellPick: !sale, noSells: !carried.length, sellEmpty: 'Nothing you carry sells here' });
    }
    if (S.top === 'emporium' && this.goods) S.set('emporium', this.goods.data());
    if (S.top === 'bank' && this.bank) {
      S.set('bank', { title: 'The Bank', keeper: this.#keeper(this.bank.p), gold: purse.gold ?? 0, bank: purse.bank ?? 0, status: this.bank.status });
    }
    if (S.top === 'exchange' && this.ex) {
      const ex = this.ex, rows = this.#exRows(), per = ex.tab === 1 ? OFFERS_PER_PAGE : PER_PAGE, from = ex.page * per;
      S.set('exchange', { title: 'The Exchange', keeper: this.#keeper(ex.p), tab: ex.tab, onSwaps: ex.tab === 0, onOffers: ex.tab === 1,
        swaps: ex.tab === 0 ? rows.all.slice(from, from + per) : [], offers: ex.tab === 1 ? rows.all.slice(from, from + per) : [],
        pages: rows.pages > 1, pageText: rows.pages > 1 ? `Page ${ex.page + 1} of ${rows.pages}` : '',
        gold: purse.gold ?? 0, shards: purse.shards ?? 0, avyn: coinText('avyn', purse.avyn),
        status: ex.status || (ex.tab === 0 ? 'Swap what you have too much of' : rows.all.length ? 'Offers between farmers, with a 2.5% fee' : 'No offers yet. Post the first one'),
        giveAmt: coinText(ex.give.asset, ex.give.amount), giveName: COINS[ex.give.asset].name, wantAmt: coinText(ex.want.asset, ex.want.amount), wantName: COINS[ex.want.asset].name,
        stepText: `x${ex.step}`, feeNote: '2.5% fee each side' });   // (every coin pays its fee since 2026-10-27: catalog.js offerFees)
    }
    const mk = this.mk;
    if (S.top === 'market' && mk) {
      // browsing: the items (of the kind picked, and the search); or one item's listings, with the one picked beside them
      const items = mk.item ? [] : this.#items(), stalls = this.#stalls();
      const list = mk.item ? stalls : items, per = mk.item ? LISTINGS_PER_PAGE : ITEMS_PER_PAGE, at = mk.item ? mk.lpage : mk.page;
      const pages = Math.max(1, Math.ceil(list.length / per)), from = at * per;
      const pick = mk.pick != null ? stalls.find((o) => o.id === mk.pick) : null;
      const carried = this.#marketCarried(), sale = carried[mk.bagPick] ?? null;
      const allMine = mk.board.myStalls ?? [], mPages = Math.max(1, Math.ceil(allMine.length / MY_STALLS));
      mk.mpage = Math.min(mk.mpage ?? 0, mPages - 1);
      const mine = allMine.slice(mk.mpage * MY_STALLS, mk.mpage * MY_STALLS + MY_STALLS).map((o) => ({ ...o, ...coinOf(o.coin, o.price), name: nameOf(o.item, o.slot ?? null), icon: itemRefOf(o.item, o.slot ?? null),
        open: o.status === 'open', proceeds: o.proceeds || 0, collectLabel: `Get ${amountText(o.coin ?? 'gold', o.proceeds || 0)}` }));   // ("Get 2,049 Shards": the coin named, in the button's room)
      // (a stall's price and what it takes in are in its own coin: Gold, Shards or $AVYN, in that coin's units)
      // (the History: the farmer's own sales and purchases, from the market's book -- newest first, a page at a time)
      const allHist = mk.board.history ?? [], hPages = Math.max(1, Math.ceil(allHist.length / HISTORY_ROWS));
      mk.hpage = Math.min(mk.hpage ?? 0, hPages - 1);
      const history = allHist.slice(mk.hpage * HISTORY_ROWS, mk.hpage * HISTORY_ROWS + HISTORY_ROWS).map((e) => this.#historyRow(e));
      const n = sale ? Math.min(mk.n, sale.n) : mk.n, gross = n * mk.price, fee = isCrypto(mk.coin) ? cryptoFee(gross) : coinFee(mk.coin, gross);
      const shown = mk.item ? { id: mk.item, name: nameOf(mk.item), icon: itemRefOf(mk.item, null, this.hero?.tierDir()),
        note: stalls.length ? `${stalls.length} listing${stalls.length > 1 ? 's' : ''}, cheapest first` : 'Nobody is selling this just now' } : {};
      S.set('market', { title: 'Marketplace', keeper: this.#keeper(mk.p), gold: purse.gold ?? 0, shards: purse.shards ?? 0, avyn: coinText('avyn', purse.avyn),
        tab: mk.tab, onStalls: mk.tab === 0, onMine: mk.tab === 1, onHistory: mk.tab === 2, history, noHistory: !allHist.length,
        histPages: hPages > 1, histPageText: hPages > 1 ? `${mk.hpage + 1} of ${hPages}` : '', cat: mk.cat, onItem: !!mk.item, onItems: !mk.item,
        cats: MK_CATS.map(([name], i) => ({ name, on: i === mk.cat })), searchText: `${mk.search ?? ''}${this.searchKeys ? '_' : ''}`,
        items: items.slice(from, from + per), item: shown,
        stalls: stalls.slice(from, from + per).map((o) => ({ ...o, picked: o.id === mk.pick })), noStalls: !list.length,
        emptyText: mk.item ? 'Nobody is selling this just now' : mk.search ? 'Nothing by that name' : 'Nothing of this kind',
        pages: pages > 1, pageText: pages > 1 ? `${at + 1} of ${pages}` : '',
        minePages: mPages > 1, minePageText: mPages > 1 ? `${mk.mpage + 1} of ${mPages}` : '',
        pick: pick ? { ...pick } : {}, hasPick: !!pick, noPick: !pick, qty: mk.qty,
        total: pick ? coinText(pick.coin, pick.price * Math.min(mk.qty, pick.left)) : 0,
        bagItems: carried.map((c) => (c.icon && typeof c.icon === 'object' ? { ...c.icon, count: c.n } : c.icon)), bagPick: mk.bagPick ?? -1,
        hasBagPick: !!sale, noBagPick: !sale, sale: sale ?? {}, myStalls: mine, stallCount: (mk.board.myStalls ?? []).filter((o) => o.status === 'open').length,
        mkQty: n, mkPrice: coinText(mk.coin, mk.price), mkFee: coinText(mk.coin, fee), mkGets: coinText(mk.coin, gross - fee),
        mkCoin: coinOf(mk.coin), mkBig: BIG_STEP[mk.coin] ?? '+10', mkListLabel: `List for ${amountText(mk.coin, mk.price)}`, buyLabel: pick?.crypto ? `Pay in ${pick.coinName}` : 'Buy',
        status: mk.status || (mk.tab === 0 ? (mk.item ? (stalls.length ? 'Pick a listing to look closer' : '') : 'Pick a kind, or search, then View Listings')
          : mk.tab === 2 ? (allHist.length ? 'Your sales and purchases at the stalls' : '')
          : sale && isCrypto(mk.coin) ? 'Paid straight to your wallet, 2.5% to the game' : 'Pick something you carry to list it') });
    }
  }

  /** A line of the Marketplace's History: a sale of yours (what came in, after the fee) or a purchase (what went out). */
  #historyRow(e) {
    const sold = e.side === 'sold', coin = e.coin ?? 'gold', got = sold ? e.total - (e.fee ?? 0) : e.total, c = coinOf(coin, got), each = coinOf(coin, e.price);
    const what = `${e.n > 1 ? `${e.n} ` : ''}${nameOf(e.item, e.slot ?? null)}`, who = e.who || 'someone';
    return { ...c, icon: itemRefOf(e.item, e.slot ?? null), title: sold ? `Sold ${what} to ${who}` : `Bought ${what} from ${who}`,
      sub: [agoText(e.at), `${each.priceText} ${each.coinName} each`, sold && e.fee ? `fee ${coinText(coin, e.fee)}` : '', sold && e.crypto ? 'paid to your wallet' : ''].filter(Boolean).join(', '),
      amount: `${sold ? '+' : '-'}${c.priceText}` };
  }

  /** A chest at home opens (Play's spots): the Chest window, its forty slots over the hotbar.
   *  False when the interface has no Chest window. */
  openChest({ id, name = 'Chest' }) {
    if (!this.stack.has('storage') || !id) return false;
    this.chest = { id, name };
    this.chestPick = null;                                           // (what the name line shows: your hand, until a click)
    if (this.stack.top !== 'storage') this.stack.open('storage');
    return true;
  }

  /** Settings' Interface size: Small, Medium or Large, kept in this browser. */
  /** A yes-or-no question in the confirm window (its question, a line under it, the two answers); `onYes`
   *  runs on the first. False when the interface has no confirm window. */
  /* ---------------------------------------------------------------- face to face (game/trade.js, server/trade2.js) */

  /** Ask another player to trade: from their card (game/friends.js) -- a friend by their account, wherever they are
   *  ({ id, name }); anyone else in the game around you by their live id ({ lid, name }). (2026-10-03: no longer E.) */
  async askToTrade(r) {
    const s = this.session();
    if (this.tr?.paying && this.stack.has('trade')) { if (this.stack.top !== 'trade') { if (this.stack.top) this.stack.swap('trade'); else this.stack.open('trade'); } return; }
    if (!s?.trade || this.tr) { if (this.tr) this.notify('You are in a trade already'); return; }
    const out = await s.trade('ask', r.id != null ? { id: r.id } : { to: r.lid });
    this.notify(out.ok ? `You asked ${r.name} to trade` : out.reason ?? 'Not now');
  }

  /** What the server says of a trade, over the live socket: an invitation, the trade as it stands, its end. */
  tradeHeard(m) {
    if (m.ask) {
      const id = m.ask.id, s = this.session();
      const answer = async (yes) => {
        const out = await s?.trade?.('answer', { id, yes });
        if (out?.trade) this.#tradeShow(out.trade); else if (out?.ok === false) this.notify(out.reason ?? 'That trade is over');
      };
      this.trAsk = id;
      this.soundOf()?.cue('windowOpen');
      if (!this.askYesNo({ question: `${m.ask.from} would like to trade with you.`, detail: 'You both see what the other gives, and both confirm, before anything changes hands.',
        yes: 'Trade', no: 'Not now', onYes: () => answer(true), onNo: () => answer(false) })) answer(false);
      return;
    }
    if (m.trade) { this.#tradeShow(m.trade); if (m.note && this.tr) this.tr.note = m.note; return; }
    if (m.end) {
      // (an invitation still asking goes, and the window of a trade that ended)
      if (this.trAsk === m.end.id && this.stack.top === 'confirm') { this.confirm = null; this.stack.close(); }
      if (this.tr?.id === m.end.id) {
        this.tr = null;
        if (this.stack.top === 'trade') { this.trClosing = true; this.stack.close(); }
      }
      this.notify(m.end.why);
      this.soundOf()?.cue(m.end.done ? 'tradeComplete' : 'deny', m.end.done ? undefined : { gain: 0.6 });   // (the library's trade-complete, 2026-10-27)
    }
  }

  /** The trade as the server has it: kept, and its window opened once it is open. */
  #tradeShow(v) {
    const was = this.tr?.id === v.id ? this.tr : null;
    if (!was) this.#cryptoLook();
    this.tr = { coin: was?.coin ?? 'gold', step: was?.step ?? 1, ...v, note: '' };
    if (v.status !== 'open' || !this.stack.has('trade') || this.stack.top === 'trade') return;
    if (this.stack.top) this.stack.swap('trade'); else this.stack.open('trade');
  }

  /** The Trade window's buttons and cells. Every change to your side goes to the server, which answers with the trade. */
  async #tradeAction(verb, arg) {
    const t = this.tr, s = this.session(), inv = this.inv;
    if (!t || !s?.trade || !inv) return;
    // waiting for a payment in crypto: the payer pays; nothing else changes
    if (t.status === 'paying') { if (verb === 'trok' && t.payer === 'you') this.#tradePay(); return; }
    if (t.status !== 'open') return;
    const mine = t.mine;
    // (with crypto on your side, anything else put in is refused by the server, and said so: that side pays only)
    const raw = () => ({ ...(mine.crypto ? { crypto: { ...mine.crypto } } : {}),
      items: mine.items.map((l) => (l.at != null ? { at: l.at } : { id: l.id, n: l.n })), gold: mine.gold, shards: mine.shards, avyn: mine.avyn });
    const send = async (offer) => {
      if (this.trBusy) return;
      this.trBusy = true;
      try {
        const out = await s.trade('offer', { id: t.id, offer });
        if (out.trade) this.#tradeShow(out.trade);
        if (out.ok === false && this.tr) this.tr.note = out.reason ?? 'Not that';
        this.soundOf()?.cue(out.ok ? 'place' : 'deny', { gain: 0.6 });
      } finally { this.trBusy = false; }
    };
    if (verb === 'trbag') {
      // a thing you carry into your side (the hotbar, then the backpack: 2026-10-02): a tool by its very slot -- its
      // place in what you carry (trade.js cleanOffer) -- a stack by the step (not more than you have)
      const i = +arg || 0, slot = [...inv.hotbar.slice(0, inv.size), ...inv.bag][i];
      if (!slot) return;
      const o = raw();
      if (isTool(slot.id)) { if (o.items.some((l) => l.at === i)) return; o.items.push({ at: i }); }
      else {
        const line = o.items.find((l) => l.id === slot.id), had = line?.n ?? 0, n = Math.min(inv.count(slot.id), had + thingStep(t.step));
        if (n === had) return;
        if (line) line.n = n; else o.items.push({ id: slot.id, n });
      }
      await send(o);
      return;
    }
    if (verb === 'troff') {
      // one of yours back out: a tool whole; a stack by the step
      const o = raw(), k = +arg || 0, l = o.items[k];
      if (!l) return;
      if (l.at != null || l.n <= thingStep(t.step)) o.items.splice(k, 1); else l.n -= thingStep(t.step);
      await send(o);
      return;
    }
    if (verb === 'trcoin') {
      // Gold, Shards, $AVYN -- and ETH and USDG once trading for crypto is open (a side paid in crypto gives only that)
      const coins = [...TRADE_COINS];   // (never ETH or USDG in the game, 2026-10-27: trading for crypto is at Bloomshire Town Hall alone)
      t.coin = coins[(coins.indexOf(t.coin) + 1) % coins.length];
      if (!coinSteps(t.coin).includes(t.step)) t.step = coinSteps(t.coin)[0];
      return;
    }
    if (verb === 'trtype') {
      // (the coin picked, typed: never more than you have -- crypto, from the least one payment may be to the most)
      const c = t.coin;
      if (isCrypto(c)) {
        const cc = CRYPTO_COINS[c], had = mine.crypto?.coin === c ? mine.crypto.amount : 0;
        this.askNumber({ question: `Pay how much ${COINS[c].name}?`, coin: c, value: had || cc.min, min: cc.min, max: cc.max,
          onOk: (v) => { if (this.tr === t) send({ crypto: { coin: c, amount: v } }); } });
        return;
      }
      const have = saveDoc()?.purse?.[c] ?? 0, unit = COINS[c];
      this.askNumber({ question: `Give how much ${unit.name}?`, coin: c, value: mine[c] ?? 0, min: 0, max: have - (have % unit.step),
        onOk: (v) => { if (this.tr !== t) return; const o = raw(); o[c] = v; send(o); } });
      return;
    }
    if (verb === 'trstep') { const st = coinSteps(t.coin); t.step = st[(st.indexOf(t.step) + 1) % st.length]; return; }
    if ((verb === 'trless' || verb === 'trmore') && isCrypto(t.coin)) {
      // crypto: from the least one payment may be to the most (catalog.js CRYPTO_COINS); below the least, none
      const cc = CRYPTO_COINS[t.coin], had = mine.crypto?.coin === t.coin ? mine.crypto.amount : 0, d = Math.round(t.step * cc.unit);
      let v = verb === 'trmore' ? (had ? had + d : Math.max(cc.min, d)) : had - d;
      v = v < cc.min ? 0 : Math.min(cc.max, v - (v % cc.step));
      if (v === had) return;
      await send(v ? { crypto: { coin: t.coin, amount: v } } : { items: [], gold: 0, shards: 0, avyn: 0 });
      return;
    }
    if (verb === 'trless' || verb === 'trmore') {
      // less or more of the coin picked, by the step -- never more than you have (a $AVYN to the hundredth)
      const o = raw(), c = t.coin, have = saveDoc()?.purse?.[c] ?? 0, unit = COINS[c];
      const d = Math.max(unit.step, Math.round(t.step * unit.unit)) * (verb === 'trmore' ? 1 : -1);
      const v = Math.max(0, Math.min(have - (have % unit.step), o[c] + d));
      if (v === o[c]) return;
      o[c] = v;
      await send(o);
      return;
    }
    if (verb === 'trok') {
      if (t.okMine || this.trBusy) return;
      this.trBusy = true;
      try {
        const out = await s.trade('confirm', { id: t.id, v: t.v });
        if (out.trade) this.#tradeShow(out.trade);
        if (out.ok === false && this.tr) { this.tr.note = out.reason ?? 'Not yet'; this.soundOf()?.cue('deny'); }
      } finally { this.trBusy = false; }
      return;
    }
    if (verb === 'trcancel') { this.tr = null; this.trClosing = true; this.stack.close(); await s.trade('cancel', { id: t.id }); }
  }

  /** The Trade window: both sides, who has confirmed, what you carry -- hotbar and backpack -- less what is in your
   *  side, the fee. */
  #fillTrade() {
    const t = this.tr, inv = this.inv;
    if (!t || !inv) return;
    const tier = this.hero?.tierDir();
    const cell = (id, slot, n) => { const ic = itemRefOf(id, slot, tier); return ic && typeof ic === 'object' ? { ...ic, count: n > 1 ? n : undefined } : ic; };
    const side = (o) => o.items.map((l) => cell(l.id, l.slot ?? null, l.n));
    // your hotbar as it would be: a tool in the trade is out of it, a stack shows what is left (and while a payment
    // in crypto is awaited, your side is held by the game already: your hotbar as it is)
    const held = !!t.paying;
    const left = new Map(held ? [] : t.mine.items.filter((l) => l.at == null).map((l) => [l.id, l.n]));
    const bag = [...inv.hotbar.slice(0, inv.size), ...inv.bag].map((s, i) => {
      if (!s || (!held && t.mine.items.some((l) => l.at === i))) return null;
      if (isTool(s.id)) return cell(s.id, s, 1);
      const take = Math.min(left.get(s.id) ?? 0, s.n);
      if (take) left.set(s.id, left.get(s.id) - take);
      return s.n - take > 0 ? cell(s.id, s, s.n - take) : null;
    });
    // the fee on what you would get (the other side's is theirs to see)
    const f = tradeFees(t.mine, t.theirs).a, kept = TRADE_COINS.filter((c) => f.kept[c] > 0);
    // paid in crypto: what goes where, and -- once both said yes -- the payment awaited
    const pays = t.mine.crypto ?? t.theirs.crypto, mins = t.deadline ? Math.max(0, Math.ceil((t.deadline * 1000 - Date.now()) / 60_000)) : 0;
    const cryptoLine = !pays ? '' : t.paying
      ? (t.payer === 'you' ? `Pay ${amountText(pays.coin, pays.amount)} from your wallet. Press Pay now (${mins} min left)` : `Waiting for ${t.them} to pay ${amountText(pays.coin, pays.amount)} (${mins} min left)`)
      : t.mine.crypto ? `You pay from your wallet. ${t.them} gets 97.5%, the game 2.5%` : `Paid to your wallet, you get ${amountText(pays.coin, pays.amount - cryptoFee(pays.amount))} (2.5% to the game)`;
    // (each side pays on what it receives: the coins, and the goods' worth beyond the Gold given for them -- game/trade.js)
    const parts = [kept.length ? `${kept.map((c) => amountText(c, f.kept[c])).join(' and ')} kept from what you get` : '',
      f.gold ? `${f.gold} Gold on the goods' worth${f.waivable ? ' (none without the Gold)' : ''}` : ''].filter(Boolean);
    const fee = t.note || cryptoLine || (parts.length ? `A 2.5% trade fee, ${parts.join(', and ')}`
      : t.mine.items.length || t.theirs.items.length || TRADE_COINS.some((c) => t.mine[c] || t.theirs[c]) ? 'No fee for you in this trade'
      : 'Click what you carry to put it in; click it again to take it back');
    const c = t.coin, amounts = (o) => ({ gold: coinText('gold', o.gold), shards: coinText('shards', o.shards), avyn: coinText('avyn', o.avyn) });
    const cryptoText = (o, who) => (o.crypto ? `${who} ${amountText(o.crypto.coin, o.crypto.amount)}` : '');
    this.stack.set('trade', { them: t.them, mine: amounts(t.mine), theirs: amounts(t.theirs), mineItems: side(t.mine), theirItems: side(t.theirs),
      okMine: !!t.okMine, okTheirs: !!t.okTheirs, bagItems: bag, fee, coinName: COINS[c].name,
      coinAmt: isCrypto(c) ? coinText(c, t.mine.crypto?.coin === c ? t.mine.crypto.amount : 0) : coinText(c, t.mine[c]),
      mineCrypto: !!t.mine.crypto, theirCrypto: !!t.theirs.crypto, mineCryptoText: cryptoText(t.mine, 'You pay'), theirCryptoText: cryptoText(t.theirs, 'Pays'),
      stepText: isCrypto(c) ? `+${t.step}` : `x${t.step}`, okLabel: t.paying ? (t.payer === 'you' ? 'Pay now' : 'Waiting') : t.okMine ? 'Waiting' : 'Confirm' });
  }

  /** A TRADE PAID IN CRYPTO, the payer's part: the ticket the server handed you, paid from your wallet; the goods
   *  are yours when the chain has it (the trade's end says so). */
  async #tradePay() {
    const t = this.tr, s = this.session();
    if (!t?.pay || this.cryptoPaying) return;
    const say = (x) => { if (this.tr?.id === t.id) this.tr.note = x; else this.notify(x); };
    this.cryptoPaying = true;
    try {
      let tx;
      try { tx = await payTicket(t.pay, (x) => say(`${x}...`)); } catch (e) { say(e.message); this.soundOf()?.cue('deny'); return; }
      const r = await settle(s, t.pay.ticket.id, tx, (x) => say(`${x}...`));
      if (r.waiting) say('Paid. The network is slow today, so the goods arrive by themselves in a few minutes');
      else if (!r.ok) { say(r.reason ?? 'That did not work'); this.soundOf()?.cue('deny'); }
    } finally { this.cryptoPaying = false; }
  }

  /* ---------------------------------------------------------------- the guide (testers, 2026-09-28) */

  /** Walk the farmer through `steps` (TOUR), or show one tip ({ tip: true }): the Guide window over the HUD. False
   *  when the interface has no Guide window. */
  startGuide(steps = TOUR, { tip = false, key = null } = {}) {
    if (!this.stack.has('guide')) return false;
    this.guide = { steps, i: 0, tip, key };
    if (this.stack.top !== 'guide') { if (this.stack.top) this.stack.swap('guide'); else this.stack.open('guide'); }
    return true;
  }
  get guiding() { return !!this.guide; }

  /** Next (or, on the last card, done), or Skip. */
  #guideStep(arg) {
    const g = this.guide;
    if (!g) return;
    if (arg === 'next' && g.i < g.steps.length - 1) { g.i++; this.soundOf()?.cue('click'); return; }
    this.guide = null;
    if (this.stack.top === 'guide') this.stack.close();
    this.onGuideDone?.(g);
  }

  /**
   * The card, next to the HUD part it tells of (below it where there is room, else above, else beside), and a gold
   * frame round that part, where the HUD last drew it; a card with no part, in the middle.
   */
  #fillGuide() {
    const g = this.guide, S = this.stack;
    if (!g) return;
    const st = g.steps[g.i], view = S.size ?? { w: 480, h: 270 }, CW = 190, CH = 96, P = 3, M = 4;
    let r = null;
    if (st.at) for (const b of S.boxes.get('hud')?.values() ?? []) if (b.node.name === st.at && !b.ghost && b.w > 0) { r = b; break; }
    let cardX = Math.round((view.w - CW) / 2), cardY = Math.round((view.h - CH) / 2);
    if (r) {
      const below = r.y + r.h + P + 6, above = r.y - P - 6 - CH;
      cardX = Math.max(M, Math.min(view.w - CW - M, Math.round(r.x + r.w / 2 - CW / 2)));
      if (below + CH <= view.h - M) cardY = below;
      else if (above >= M) cardY = above;
      else {
        // (a tall part: beside it)
        cardY = Math.max(M, Math.min(view.h - CH - M, r.y));
        cardX = r.x + r.w / 2 < view.w / 2 ? Math.min(view.w - CW - M, r.x + r.w + P + 6) : Math.max(M, r.x - P - 6 - CW);
      }
    }
    const x = r ? r.x - P : 0, y = r ? r.y - P : 0, w = r ? r.w + 2 * P : 0, h = r ? r.h + 2 * P : 0;
    const last = g.i === g.steps.length - 1;
    S.set('guide', { cardX, cardY, title: st.title, body: st.body, hasRing: !!r,
      ringX: x, ringY: y, ringW: w, ringH: h, ringX2: x + w - 3, ringY2: y + h - 3,
      ringXi: x + 1, ringYi: y + 1, ringWi: w - 2, ringHi: h - 2, ringX2i: x + w - 2, ringY2i: y + h - 2,
      stepText: g.tip ? '' : `${g.i + 1} of ${g.steps.length}`, nextLabel: !last ? 'Next' : g.tip ? 'Got it' : 'Play',
      skipLabel: 'Skip', canSkip: !g.tip && !last });
  }

  /** A QUESTION TOO LONG FOR ITS LINE (2026-10-27: "Throw away 99 Celestial Pineapple seeds?" ran past both sides of its
   *  box, "Sell how many Celestial Pineapple seeds?" too): on two lines, the box a line taller and what is under the
   *  question (`below`, by name) a line lower; back as it was for a short one. */
  #fitQuestion(screen, question, below) {
    const S = this.stack, doc = S.docs?.get(screen);
    if (!doc || !S.fonts) return;
    const base = ((this.qBase ??= {})[screen] ??= (() => {
      const b = {};
      const walk = (n) => { if (n.name === 'Dialog') b.Dialog = n.h; else if (below.includes(n.name)) b[n.name] = n.y; for (const c of n.children ?? []) walk(c); };
      walk(doc.root);
      return b;
    })());
    const two = S.fonts.width(tr(String(question ?? '')), 'bold') > 196;
    if ((this.qTwo ??= {})[screen] === two) return;
    this.qTwo[screen] = two;
    const d = two ? S.fonts.lineH.bold : 0, change = { Question: { h: two ? 18 : 9, wrap: two, maxLines: two ? 2 : 0 } };
    if (base.Dialog != null) change.Dialog = { h: base.Dialog + d };
    for (const n of below) if (base[n] != null) change[n] = { y: base[n] + d };
    this.#rebind(screen, change);
  }

  askYesNo({ question, detail = '', yes = 'Yes', no = 'No', onYes, onNo = null }) {
    if (!this.stack.has('confirm')) return false;
    this.confirm = { onYes, onNo };
    this.#fitQuestion('confirm', question, ['Detail']);
    this.stack.set('confirm', { question, detail, yes, no });
    if (this.stack.top) this.stack.swap('confirm'); else this.stack.open('confirm');
    return true;
  }

  /**
   * HOW MANY (the studio's "amount" window, 2026-09-29): one to `max` of a thing -- fewer, more, all of them -- and
   * what they fetch (`each` Gold apiece); `keep`, how many of them a quest in hand still wants, said. Over the window
   * that asked, which is there again after. `onOk(n)` once it is sure. False when the interface has no such window.
   * `mode` 'buy': a shop's -- what it costs, and the Gold in hand (`gold`); `n`, the number it opens on.
   * TYPED (the designer, 2026-10-03: "people can just type the amount they wanna buy themselves"): the number goes into
   * a hidden box as the name box's letters do (the keys, a paste, a phone's number pad), over the one shown; Enter is
   * OK, Escape is Cancel, the arrows one more or one fewer.
   */
  askAmount({ name, max, each = 0, keep = 0, onOk, mode = 'sell', n = 1, gold = null }) {
    if (!this.stack.has('amount') || !(max >= 1)) return false;
    this.#amountGone();
    const a = this.amount = { name, max, n: Math.max(1, Math.min(max, Math.floor(n) || 1)), each, keep, onOk, mode, gold };
    a.text = String(a.n);
    this.stack.open('amount');
    const input = document.createElement('input'), width = String(max).length;
    Object.assign(input, { className: 'play-name-keys', maxLength: width, value: a.text, autocomplete: 'off', spellcheck: false, inputMode: 'numeric', enterKeyHint: 'done' });
    input.setAttribute('aria-label', mode === 'buy' ? `Buy how many ${name}?` : `Sell how many ${name}?`);
    input.addEventListener('input', () => {
      if (this.amount !== a) return;
      const digits = input.value.replace(/[^0-9]/g, '').slice(0, width), v = digits ? Math.min(max, parseInt(digits, 10)) : 0;
      a.n = v; a.text = digits ? String(v) : '';
      if (input.value !== a.text) input.value = a.text;
    });
    input.addEventListener('keydown', (e) => {
      if (this.amount !== a) return;
      if (e.key === 'Enter') { e.preventDefault(); this.action('amountok'); }
      else if (e.key === 'Escape') { e.preventDefault(); this.stack.close(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this.action('amount', e.key === 'ArrowUp' ? '1' : '-1'); }
    });
    a.input = input;
    document.body.append(input);
    input.focus({ preventScroll: true }); input.select();
    setTimeout(() => { if (this.amount === a) { input.focus({ preventScroll: true }); input.select(); } }, 30);
    return true;
  }
  /**
   * TYPE A NUMBER (2026-10-08, the designer: "type in how many items they want to sell and type in at what price ... on
   * every shop and everywhere"): the How many window for any number a window steps -- a count, 1 (`min`) to `max`, or,
   * with `coin`, an amount of that coin in its units (Gold and Shards whole, $AVYN, ETH and USDG to their decimals,
   * kept to the coin's step). Typed, as How many is (the keys, a paste, a phone's number pad), or - and + by `by` (the
   * window's own step), Max. `onOk(value)` once it is sure; the window that asked is there again. False if the
   * interface has no such window.
   */
  askNumber({ question, value, min = 1, max, onOk, coin = null, by = null, yes = 'OK', note = '' }) {
    if (!this.stack.has('amount') || !(max >= min)) return false;
    this.#amountGone();
    const unit = coin ? COINS[coin]?.unit ?? 1 : 1, step = coin ? COINS[coin]?.step ?? 1 : 1;
    const dec = Math.max(0, Math.round(Math.log10(unit / step)));
    const a = this.amount = { kind: 'number', question, coin, unit, step, dec, by: by ?? step, min, max, onOk, yes, note, warn: '', mode: 'number',
      v: Math.max(min, Math.min(max, Math.round((value ?? min) / step) * step)) };
    a.text = plainOf(a, a.v);
    this.stack.open('amount');
    const input = document.createElement('input'), width = String(Math.floor(max / unit)).length + (dec ? dec + 1 : 0);
    Object.assign(input, { className: 'play-name-keys', maxLength: width, value: a.text, autocomplete: 'off', spellcheck: false, inputMode: dec ? 'decimal' : 'numeric', enterKeyHint: 'done' });
    input.setAttribute('aria-label', question);
    input.addEventListener('input', () => {
      if (this.amount !== a) return;
      // digits, and (for a coin with decimals) one point and as many places as the coin has
      let t = input.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
      const i = t.indexOf('.');
      t = !dec ? t.replace(/\./g, '') : i < 0 ? t : t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, '').slice(0, dec);
      t = t.slice(0, width);
      const v = t && t !== '.' ? Math.round((parseFloat(t) * unit) / step) * step : 0;
      a.v = Math.min(max, v); a.warn = '';
      a.text = v > max ? plainOf(a, max) : t;
      if (input.value !== a.text) input.value = a.text;
    });
    input.addEventListener('keydown', (e) => {
      if (this.amount !== a) return;
      if (e.key === 'Enter') { e.preventDefault(); this.action('amountok'); }
      else if (e.key === 'Escape') { e.preventDefault(); this.stack.close(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this.action('amount', e.key === 'ArrowUp' ? '1' : '-1'); }
    });
    a.input = input;
    document.body.append(input);
    input.focus({ preventScroll: true }); input.select();
    setTimeout(() => { if (this.amount === a) { input.focus({ preventScroll: true }); input.select(); } }, 30);
    return true;
  }
  /** The How many put away (its box gone): what it was, or null. */
  #amountGone() {
    const a = this.amount;
    this.amount = null;
    a?.input?.remove();
    return a;
  }
  #fillAmount() {
    const a = this.amount, buy = a.mode === 'buy';
    if (a.kind === 'number') {
      if (a.input && !COARSE() && document.activeElement !== a.input && !document.activeElement?.closest?.('input, textarea, select')) a.input.focus({ preventScroll: true });
      const caret = a.input && document.activeElement === a.input && Math.floor(performance.now() / 500) % 2 === 0 ? '_' : '';
      // (the number as it is typed, its thousands marked: "7,870", "0.25")
      const [whole, frac] = String(a.text ?? '').split('.'), shown = `${whole ? Number(whole).toLocaleString('en-US') : a.text?.startsWith('.') ? '0' : ''}${frac != null ? `.${frac}` : ''}`;
      this.#fitQuestion('amount', a.question, ['Fewer', 'How many', 'More', 'All', 'Detail']);
      this.stack.set('amount', { question: a.question, n: `${shown}${caret}`, detail: [a.warn, a.note, `From ${numText(a, a.min)} to ${numText(a, a.max)}.`, 'Type a number, or use - and +.'].filter(Boolean).join(' '),
        yes: a.yes, no: 'Cancel', max: numText(a, a.max) });
      // (a price is wider than a count: the box twice as wide, - and + further out)
      if (this.amountMode !== 'number') { this.amountMode = 'number'; this.#rebind('amount', { All: { label: 'Max', x: 50 }, Fewer: { x: -72 }, 'How many': { x: -30, w: 66 }, More: { x: 14 } }); }
      return;
    }
    // (the box keeps the keys while the window is up -- a click on the window's buttons takes them away from it; a phone's
    //  keyboard is not called up again unasked: keysFocus, at a tap)
    if (a.input && !COARSE() && document.activeElement !== a.input && !document.activeElement?.closest?.('input, textarea, select')) a.input.focus({ preventScroll: true });
    const total = (a.each * a.n).toLocaleString('en-US'), gold = a.each && a.n >= 1 ? (buy ? `Costs ${total} Gold.` : `For ${total} Gold.`) : '';
    const purse = buy && a.gold != null ? `You have ${a.gold.toLocaleString('en-US')}.` : '';
    const note = !buy && a.keep ? `A quest you are on still needs ${a.keep}.` : '';
    const caret = a.input && document.activeElement === a.input && Math.floor(performance.now() / 500) % 2 === 0 ? '_' : '';
    // (each line whole, as it is translated: "Buy how many {0}?", "Sell {0}")
    const question = buy ? `Buy how many ${a.name}?` : `Sell how many ${a.name}?`;
    const yes = a.n >= 1 ? (buy ? `Buy ${a.n}` : `Sell ${a.n}`) : buy ? 'Buy' : 'Sell';
    this.#fitQuestion('amount', question, ['Fewer', 'How many', 'More', 'All', 'Detail']);
    this.stack.set('amount', { question, n: `${a.text ?? a.n}${caret}`, detail: [gold, purse, note, 'Type a number, or use - and +.'].filter(Boolean).join(' '),
      yes, no: 'Cancel', max: String(a.max) });
    if (this.amountMode !== a.mode) { this.amountMode = a.mode; this.#rebind('amount', { All: { label: buy ? 'Max' : 'All', x: 40 }, Fewer: { x: -47 }, 'How many': { x: -19, w: 32 }, More: { x: 9 } }); }
  }

  /** What the quests in hand still ask to be brought -- their deliveries, the steps still to come too: item -> how many
   *  (a kind -- any fish -- is not one thing to keep). */
  #questKeeps() {
    const save = this.#save(), out = new Map();
    for (const q of QUESTS) {
      const rec = save?.quests?.[q.id];
      if (!rec || rec.done || rec.ready) continue;
      for (const s of q.steps.slice(rec.step ?? 0)) {
        for (const p of s.kind === 'all' ? s.parts ?? [] : [s]) {
          const wants = p.kind === 'deliver' ? p.items ?? [] : p.kind === 'have' && p.item ? [{ item: p.item, n: p.n ?? 1 }] : [];
          for (const w of wants) if (typeof w.item === 'string' && w.item !== 'gold' && !w.item.endsWith(':*')) out.set(w.item, (out.get(w.item) ?? 0) + (w.n ?? 1));
        }
      }
    }
    for (const id of keptIds(save)) out.set(id, Infinity);             // (the Founders' fruit, all of it, until Marven has hers)
    return out;
  }

  /** Dress every screen in a theme: the HUD, the bag, the shops -- everything the interface draws. (In a place with a
   *  dress of its own -- the VIP Quarter, setPlaceTheme -- the choice is kept, and worn again on leaving.) */
  setUiTheme(id, { keep = true } = {}) {
    if (!this.themes?.ids.includes(id)) return;
    this.uiTheme = id;
    this.stack.theme = this.themes.resolve(this.placeTheme ?? id);
    if (keep) try { localStorage.setItem(UI_THEME_KEY, id); } catch { /* holds for this visit */ }
    this.onTheme?.(this.themeColors());                 // (the chat wears the theme too: game/chat.js)
  }

  /**
   * THE PLACE'S OWN DRESS (the VIP Quarter, 2026-10-08: "when players enter [the] premium area ... their whole UI will
   * change into a premium UI"): the whole interface worn in a theme that is no player's pick (theme.js vip) while they
   * are there -- null: their own again.
   */
  setPlaceTheme(id) {
    const next = id ?? null;
    if (next === (this.placeTheme ?? null) || !this.themes) return;
    this.placeTheme = next;
    this.stack.theme = this.themes.resolve(next ?? this.uiTheme);
    this.onTheme?.(this.themeColors());                 // (the chat too)
  }

  /** The theme's colours (its roles: surface, text, trim...), for what is drawn outside the canvas. */
  themeColors() { return this.stack.theme?.colors ?? null; }

  setUiSize(size) {
    if (!UI_SIZES.includes(size)) return;
    this.uiSize = size;
    try { localStorage.setItem(UI_SIZE_KEY, size); } catch { /* holds for this visit */ }
  }

  /** The interface's scale for a world drawn at s device pixels to one of its own. */
  scaleFor(s, dpr = 1) { return uiScale(s, dpr, this.uiSize); }

  /** A step through one layer of the look (look:hairStyle:1), or a random farmer (look:random). */
  #look(key, step) {
    const cur = { ...h_look(this.hero) }, gender = saveDoc()?.gender;
    // (THE GENDER, CHOSEN ONCE -- commands.js gender.choose: the eyes step only through that gender's)
    const opts = (k) => (k === 'eyes' && (gender === 'male' || gender === 'female') ? LOOK_OPTIONS.eyes.filter((e) => e.startsWith(gender === 'female' ? 'Female/' : 'Male/')) : LOOK_OPTIONS[k]);
    if (key === 'random') {
      for (const k of ['skin', 'eyes', 'hairStyle', 'hairColour', 'clothes', 'acc']) { const o = opts(k); cur[k] = o[Math.floor(Math.random() * o.length)]; }
    } else {
      const o = opts(key);
      if (!o) return;
      cur[key] = o[(o.indexOf(cur[key]) + step + o.length) % o.length];
    }
    this.setLook?.(cur);
  }

  /**
   * NAMES ON HOVER (testers, 2026-09-29: "see item name when we hover over them rather than clicking"): the pointer
   * resting on a slot -- the hotbar, a chest, the bag, a shop's grid of what you carry -- shows what is there in a small
   * card over it (the studio's "hover" screen, floated over everything): its name, how many, and one thing worth
   * knowing -- what it sells for, the energy it gives, the uses a tool has left.
   */
  #fillHover() {
    const S = this.stack;
    if (!S.has('hover')) return;
    const p = this.pointer && !S.dragging ? S.pointAt(this.pointer.x, this.pointer.y) : null;
    const s = p?.type === 'grid' && p.part != null ? this.#hoverSlot(p) : null;
    const fonts = S.fonts;
    if (!s?.id || !fonts) { S.float('hover', false); return; }
    const info = itemInfo(s.id, this.hero?.tierDir(), this.inv.icons, s), it = ITEMS[s.id];
    const name = nameOf(s.id, s);
    // (how many is on the slot itself)
    const note = s.note ?? (info?.finite ? `${info.uses} of ${info.maxUses} uses left` : info?.weapon ? info.rarityName ?? 'Weapon'
      : it?.readable ? 'Space to read' : it?.cat === 'quest' ? 'For a quest' : it?.cat === 'food' && it.energy ? `+${it.energy} energy` : it?.cat === 'furniture' ? 'Set it down at home'
      : info?.use === 'sow' ? `Grows in ${SEEDS[info.seed]?.grow ?? '?'} min` : it?.value ? `Sells for ${it.value.toLocaleString('en-US')} Gold` : info?.tool ? 'Tool' : '');
    // (as wide as its words are in the player's language; over the pointer, never off the screen)
    const textW = Math.max(fonts.width(tr(name), 'bold'), note ? fonts.width(tr(note), 'regular') : 0) + 2;
    const w = 24 + textW + 6, h = 26, view = S.size ?? { w: 480, h: 270 };
    const x = Math.max(2, Math.min(view.w - w - 2, Math.round(this.pointer.x - w / 2)));
    let y = Math.round(this.pointer.y - h - 12);
    // (over the hotbar: clear of the lines above it -- the name in hand, what Space does, a notice)
    if (p.screen === 'hud') {
      const busy = ['Item name', 'Prompt', 'Toast'].map((n) => this.#boxNamed('hud', n)).filter(Boolean);
      for (let k = 0; k < 4; k++) {
        const hit = busy.find((b) => b.x < x + w && x < b.x + b.w && b.y < y + h && y < b.y + b.h);
        if (!hit) break;
        y = hit.y - h - 2;
      }
    }
    y = Math.max(2, y);
    S.set('hover', { tip: { name, note, icon: itemRefOf(s.id, s, this.hero?.tierDir()) }, tipX: x, tipY: y, tipW: w, tipTextW: textW });
    S.float('hover', true);
  }
  /** The thing in a grid's cell under the pointer: the HUD's hotbar, the Backpack's, the Chest's, a shop's grid. */
  #hoverSlot({ name, part }) {
    const inv = this.inv;
    if (!inv) return null;
    if (this.shop && (name === 'What you carry' || name === 'Your crops')) { const c = this.#shopRows().carried[part]; return c ? inv.at(c.area, c.i) : null; }
    // (the Hearth's pot: what goes in that slot; its hotbar and backpack: what is there)
    if (name === 'Pot' && this.cook) { const R = this.cook.list[this.cook.pick], id = R && this.#potUnits(R)[part]; return id ? { id, n: 1, note: this.cook.pot[part] ? 'In the pot' : 'Goes in the pot' } : null; }
    const at = this.#slot({ grid: name, i: part }) ?? (this.cook && this.#cookSlot({ grid: name, i: part }));
    return at ? inv.at(at.area, at.i) : null;
  }

  /** A grid cell as an inventory slot: the HUD's two rows, the Backpack's ten in view, the bag. */
  #slot({ grid, i }) {
    if (grid === 'Bag') return { area: 'bag', i };
    if (grid === 'Slots') return { area: 'hotbar', i };
    if (grid === 'Slots 2') return { area: 'hotbar', i: PAGE + i };
    if (grid === 'Hotbar') return { area: 'hotbar', i: this.bpPage * PAGE + i };
    if (grid === 'Chest' && this.chest) return { area: `chest:${this.chest.id}`, i };
    return null;
  }

  /** Fill the screens with what Play has, then draw them -- onto a view of w x h (the interface's own, finer
   *  canvas), or at the screens' designed 480 x 270 when no size is given. */
  draw(g, w = null, h = null) {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now; this.time += dt;
    this.stack.setSize(w, h);
    if (this.hero && this.inv) { this.#faces(); this.#fill(dt); }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    this.stack.draw(g, dt);
    g.restore();
  }

  /** The player's own face for the portrait, and the whole farmer for the character screen's preview. */
  #faces() {
    const rig = this.hero.rig, b = rig.bake('idle');
    if (!b) return;                                                   // the look's layers are still loading
    const key = JSON.stringify([rig.look, rig.founder?.n ?? 0, !!b.partial]);       // (a Founding Farmer played: their face)
    if (key !== this.faceKey || !this.portraitCanvas) {
      // the upper body, like a portrait photo: the idle frame facing you at twice its size, cut at the waist
      // by the bottom of the window the HUD shows (rows 10 to 48 of the 64 px portrait) -- head, shirt and
      // arms, whatever the look -- centred across it
      const box = opaqueBox(b.canvas, 0, b.cw, b.ch);
      const c = this.portraitCanvas ?? document.createElement('canvas');
      c.width = 64; c.height = 64;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
      const waist = ACTIONS.idle.feet - 5;                              // the villager's waist, five rows above its feet
      if (box) g.drawImage(b.canvas, 0, 0, b.cw, b.ch, 32 - Math.round(box.cx * 2), 48 - waist * 2, b.cw * 2, b.ch * 2);
      this.portraitCanvas = c; this.faceKey = key;
    }
    // whoever you are talking to, if their face is their villager's: drawn as the player's own portrait is
    // (their portrait -- npcs.js portraitSheet -- once its layers are in; till then, and if it never comes, their
    //  villager's upper body as the player's own is drawn)
    const who = this.talk?.p ?? this.shop?.p ?? this.bank?.p ?? this.ex?.p ?? this.mk?.p;
    if (who?.rig && (this.npcFaceOf !== who || !this.npcSheet)) {
      const sheet = who.portrait?.();
      if (sheet) { this.npcCanvas = sheet; this.npcFaceOf = who; this.npcSheet = true; }
      else if (this.npcFaceOf !== who) {
        const nb = who.rig.bake('idle');
        if (nb) {
          const box = opaqueBox(nb.canvas, 0, nb.cw, nb.ch), c = this.npcCrop ??= document.createElement('canvas');
          c.width = 64; c.height = 64;
          const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
          if (box) g.drawImage(nb.canvas, 0, 0, nb.cw, nb.ch, 32 - Math.round(box.cx * 2), 48 - (ACTIONS.idle.feet - 5) * 2, nb.cw * 2, nb.ch * 2);
          this.npcCanvas = c; this.npcFaceOf = who; this.npcSheet = false;
        }
      }
    }
    // the preview on "Your farmer": the whole farmer, idling, feet near the bottom
    if (this.stack.top === 'character') {
      const c = this.bodyCanvas ?? document.createElement('canvas');
      c.width = 64; c.height = 64;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
      const { f } = rig.frameOf('idle', 'down', this.time);
      g.drawImage(b.canvas, f * b.cw, 0, b.cw, b.ch, 0, 64 - ACTIONS.idle.feet * 2 - 4, b.cw * 2, b.ch * 2);
      this.bodyCanvas = c;
    }
  }

  #fill(dt) {
    const h = this.hero, inv = this.inv, S = this.stack, tier = h.tierDir();
    const ref = (s) => {
      if (!s) return '';
      const info = itemInfo(s.id, tier, inv.icons, s), it = ITEMS[s.id];
      // (a thing with no icon of its own kept -- one put away from an old bag -- shows the catalogue's)
      if (info && !info.icon && it?.icon) info.icon = { file: it.icon[0], sx: it.icon[1] ?? 0, sy: it.icon[2] ?? 0 };
      // a finite tool: its uses left as a wear bar under it
      return info?.icon ? { ...info.icon, count: s.n > 1 ? String(s.n) : '', ...(info.finite ? { wear: info.uses / info.maxUses } : {}) } : '';
    };
    // the two rows: the second only with VIP, open while it is folded open (or the hand is on it)
    const vip = inv.vip;
    if (!vip) { this.row2Open = false; this.bpPage = 0; }
    if (vip && h.slot >= PAGE) this.row2Open = true;
    const row = h.slot >= PAGE ? 1 : 0, open = vip && this.row2Open;
    const hotbar = inv.hotbar.slice(0, PAGE).map(ref), hotbar2 = vip ? inv.hotbar.slice(PAGE, 2 * PAGE).map(ref) : [];
    const held = h.held();
    const hud = {
      face: 'live:portrait',
      hotbar, slot: row === 0 ? h.slot : -1, hotbarKeys: row === 0 ? KEYS : '',
      hotbar2, slot2: row === 1 ? h.slot - PAGE : -1, hotbarKeys2: row === 1 ? KEYS : '',
      vipOpen: open, vipCanOpen: vip && !open, nameY: open ? -76 : -42, promptY: open ? -95 : -61,
      // (an Elite Founder: the ribbon under the card -- #eliteRibbon; the server's word, save.perks)
      elite: !!saveDoc()?.perks?.elite,
      // (VIP, a pass or a holder's months: the card in gold -- #eliteRibbon)
      vipGold: Math.max(this.vipUntil?.() ?? saveDoc()?.vipUntil ?? 0, saveDoc()?.perks?.vipUntil ?? 0) > gameNow(),
      // THE VIP BADGE (2026-10-08): while a pass runs, under the farmer's card -- how long it has left; a press opens the pass
      // (a holder's VIP months count too: save.perks.vipUntil, the server's)
      vipBadge: (() => { const l = vipLeft(Math.max(this.vipUntil?.() ?? saveDoc()?.vipUntil ?? 0, saveDoc()?.perks?.vipUntil ?? 0) || null, gameNow()); return l ? `VIP ${l.replace(/ days?/, 'd').replace(/ hours?/, 'h')}` : ''; })(),
      // THE BOOSTS (2026-10-08, the premium dishes: rules.js BUFFS): beside it, which is on and for how long -- one by its
      // dish ("Chili 24m"), more by how many; a press says each
      boosts: this.#boostChip(),
      // (by touch the line is its own button: "Talk to Maren", in the player's language, without the key -- game/touch.js)
      selected: held?.name ?? '', prompt: this.#promptWords((h.preview()?.text ?? '').replace(/\s{2,}/g, '  ')), unread: (() => { const n = this.chatUnread?.() ?? 0; return n ? String(Math.min(99, n)) : ''; })(),
      mail: (() => { const n = this.inboxUnread?.() ?? 0; return n ? String(Math.min(99, n)) : ''; })(),
    };
    this.#goldInk(hud.vipGold);
    // energy (a Founding Farmer's bar is bigger), health, and the Bloomshire day -- one day is 8 real hours,
    // on the server's clock (game/clock.js)
    if (this.energy) {
      hud.energy = Math.floor(this.energy.value()); hud.energyMax = this.energy.max;
      // (the bed's wait, beside the bar while it is under half and the bed cannot fill it: game/rules.js bedWait)
      const wait = hud.energy < this.energy.max / 2 ? this.energy.bedWait?.() ?? 0 : 0;
      hud.bedWait = wait > 0 ? waitText(wait) : '';
      hud.canRide = !!this.canRide?.();                       // (the Ride & pets button: game/ridewheel.js)
      // (the green book under it, or in its place while it is not shown)
      const gy = (this.onInbox ? 128 : 106) + (hud.canRide ? 22 : 0);
      if (this.onGuide && this.guideY !== gy) { this.guideY = gy; this.#rebind('hud', { Guide: { y: gy } }); }
    }
    if (this.health) { hud.hp = Math.ceil(this.health.hp); hud.hpMax = this.health.max; }
    // (the map editor's Play: the corner clock the world's own time too, so the sky tester's hour shows there, 2026-10-19)
    if (!this.game) { const w = worldTime(); Object.assign(hud, { season: w.season, day: w.dayOfSeason, weekday: w.weekday, time: clockText(w) }); }
    if (this.game) {
      // the purse as the server keeps it: $AVYN in millionths (2026-09-28: it comes with Shards bought), shown whole,
      // or to two places when there is a fraction
      const w = worldTime();
      const purse = saveDoc()?.purse ?? {}, level = levelOf(saveDoc()?.skills?.farming ?? 0);
      const avyn = ((purse.avyn ?? 0) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 });
      Object.assign(hud, { player: { name: this.playerName ?? 'Farmer', level }, gold: purse.gold ?? 0, shards: purse.shards ?? 0, avyn,
        season: w.season, day: w.dayOfSeason, weekday: w.weekday, time: clockText(w),
        quest: this.#tracked() });
      // THE QUEST CARD AS TALL AS ITS WORDS (2026-10-27): half the quests' names are wider than the card's hundred pixels
      // ("The Fisherman's Memory" read "The Fisherman...", "Something From the Kitchen" lost half of itself) -- a name takes
      // two lines when it needs them, a step up to three, the card grows by the lines, and the Notice under it steps down
      if (S.fonts) {
        const F = S.fonts, q = hud.quest, lb = F.lineH.bold, lr = F.lineH.regular;
        const tl = q ? Math.max(1, Math.min(2, F.wrap(tr(String(q.title ?? '')), 100, 'bold').length)) : 1;
        const sl = q ? Math.max(2, Math.min(3, F.wrap(tr(String(q.step ?? '')), 100, 'regular').length)) : 2;
        // (who it is for and where they stand, under the step: up to three lines more -- quests.js NEAR, 2026-10-28)
        const nl = q?.near ? Math.min(3, F.wrap(tr(String(q.near)), 100, 'regular').length) : 0;
        const stepY = 14 + tl * lb + 1, nearY = stepY + sl * lr + 1, cardH = Math.max(44, nearY + nl * lr + 1);
        const key = `${tl}|${sl}|${nl}|${lb}|${lr}|${this.touchy ? 't' : ''}`;
        if (this.questCardKey !== key) {
          this.questCardKey = key;
          this.#rebind('hud', { Quest: { h: cardH }, 'Quest body': { h: cardH }, 'Quest title': { h: tl * lb, maxLines: tl, wrap: tl > 1 },
            Step: { y: stepY, h: sl * lr, maxLines: sl }, 'Quest near': { y: nearY, h: Math.max(1, nl) * lr, maxLines: Math.max(1, nl) },
            // (on a phone or a tablet the Notice stands beside the Quest card, level with it: under it the Use, Heavy and
            //  Dash buttons covered its words -- 2026-10-27, the Season 0 audit)
            Notice: this.touchy ? { x: -126, y: 100 } : { y: 100 + cardH + 8 } });
        }
        // A LANGUAGE'S LONGER WORDS ON THE HUD (2026-10-27): Indonesian's "Tunggangan & Peliharaan" (Ride & pets) ran past
        // its button by 27 pixels even in the narrower letters, Spanish "Primavera 10" ran under the weather's icon -- the
        // buttons under the card as wide as their longest label needs (never under 106, the Admin's beside them), and the
        // day's card 8 wider while its date needs it. English keeps its own sizes.
        if (this.hudLang !== langNow()) {
          this.hudLang = langNow();
          const bw = Math.max(106, ...['Leaderboard', 'Friends', 'Inbox', 'Ride & pets'].map((l) => F.width(tr(l), 'regular') + 8));
          this.#rebind('hud', { Leaderboard: { w: bw }, Friends: { w: bw }, Inbox: { w: bw }, 'Ride and pets': { w: bw }, Boosts: { x: bw + 12 }, Admin: { x: bw + 12 } });
        }
        const dayW = Math.max(F.width(tr(`${hud.season} ${hud.day}`), 'bold'), F.width(`${tr(String(hud.season ?? ''))} ${hud.day}`, 'bold')) > 70 ? 120 : 112;
        if (this.dayW !== dayW) { this.dayW = dayW; this.#rebind('hud', { Day: { w: dayW } }); }
      }
      // the little sky in the corner: the sun, a cloud at night, rain in a shower (game/weather.js) -- and a cloud while
      // snow falls in the VIP Quarter (the kit has no snowflake)
      const sky = this.sky?.();
      const icon = !sky ? null : sky.rain > 0.7 ? 'weather.rain.heavy' : sky.rain > 0 ? 'weather.rain' : sky.snow > 0 || sky.phase === 'Night' ? 'weather.cloud' : 'weather.sun';
      if (icon && icon !== this.skyIcon) { this.skyIcon = icon; this.#rebind('hud', { Weather: { piece: icon } }); }
      this.#questNews();
    }
    // what was just picked up: what is carried now, against the last look (not what came out of a chest)
    const counts = new Map(inv.list().map(([id, v]) => [id, v.n]));
    if (this.counts && S.top !== 'storage') {
      for (const [id, n] of counts) {
        const more = n - (this.counts.get(id) ?? 0);
        // (a quest's notice keeps its moment: a pick-up does not write over it)
        if (more > 0 && !(this.toast?.quest && this.toastT > 0)) { this.toast = { text: `+${more} ${itemInfo(id, tier, inv.icons)?.name ?? id}`, icon: ref({ id, n: 1 }) }; this.toastT = TOAST_SECONDS; }
      }
    }
    this.counts = counts;
    this.toastT = Math.max(0, this.toastT - dt);
    if (this.toastT <= 0 && this.noteQ?.length) this.#nextNote();
    hud.toast = this.toastT > 0 ? this.toast : null;
    // (a notice -- a pick-up, a quest's news -- shows where the name of what is in hand does, just over the hotbar, where
    //  no chat or window covers it: testers, 2026-09-29. The name steps aside while it shows)
    if (hud.toast) hud.selected = '';
    // (a notice with no picture -- a quest's news, a word from the game -- begins its words where the picture would have
    //  been, not after an empty square of it: 2026-10-27)
    const toastX = hud.toast && !hud.toast.icon ? 8 : 24;
    if (this.toastX !== toastX) { this.toastX = toastX; this.#rebind('hud', { 'Toast text': { x: toastX } }); }
    // the fishing bar and the cast's wind-up, beside the farmer (Play's anchor: the feet, in the interface's pixels)
    const A = this.anchor, fg = h.fishGame;
    hud.fish = null; hud.cast = null;
    if (A && fg) {
      const top = 9, span = 86, n = h.needle(), inBand = n >= fg.at - FISH_GAME.slack && n <= fg.at + fg.band + FISH_GAME.slack;
      hud.fish = { x: Math.round(Math.max(2, Math.min(A.w - 32, A.x + 20 * A.k))), y: Math.round(Math.max(2, Math.min(A.h - 118, A.y - 20 * A.k - 52))),
        bandY: top + Math.round(fg.at * span), bandH: Math.max(3, Math.round(fg.band * span)), needleY: top + Math.round(n * span) - 2,
        needleY1: top + Math.round(n * span) - 1, in: inBand, out: !inBand, timeW: Math.max(0, Math.round(22 * (1 - fg.t / FISH_GAME.time))) };
    }
    if (A && h.pose?.charge != null) hud.cast = { x: Math.round(A.x - 25), y: Math.round(Math.max(2, A.y - 38 * A.k - 18)), w: Math.max(1, Math.round(40 * h.pose.charge)) };
    // (the Notice under the Quest, while its time lasts or until its OK: showNotice)
    if (this.noticeNow && performance.now() >= this.noticeNow.until) this.noticeNow = null;
    hud.notice = this.noticeNow;
    S.set('hud', hud);
    // the Backpack: the backpack's five slots, the hotbar's ten it is showing, the item picked in the backpack -- what
    // it is, what it sells for, the energy it gives if it is eaten
    this.#bagGrid(inv.bag.length);
    if (S.has('backpack')) {
      const [selA, selK] = this.#bpSel(), got = inv.at(selA, selK), info = got ? itemInfo(got.id, tier, inv.icons, got) : null, bp = this.bpPage * PAGE;
      const it = got ? ITEMS[got.id] : null;
      if (info && !info.icon && it?.icon) info.icon = { file: it.icon[0], sx: it.icon[1] ?? 0, sy: it.icon[2] ?? 0 };
      // A LONG NAME ON TWO LINES (2026-10-27): "Celestial Pineapple seeds" and "Founding Farmers Scroll" were cut to "Celestial
      // Pine..." in the hundred pixels beside the picture -- now the name takes a second line, and its kind and count step down
      const two = !!info && (S.fonts?.width(tr(nameOf(got.id, got)), 'bold') ?? 0) > 100;
      if (this.bpTwo !== two) {
        this.bpTwo = two;
        this.#rebind('backpack', { 'Item name': { y: two ? 12 : 14, h: two ? 18 : 9, maxLines: two ? 2 : 1, wrap: two }, Kind: { y: two ? 31 : 25 }, Count: { y: two ? 50 : 44 }, Description: { y: two ? 62 : 60 } });
      }
      // (and how many, where they are: a thing picked on the hotbar said "x99 in your backpack")
      const onBar = selA !== 'bag';
      if (this.bpOnBar !== onBar) { this.bpOnBar = onBar; this.#rebind('backpack', { Count: { text: onBar ? 'x{item.count} on your hotbar' : 'x{item.count} in your backpack' } }); }
      S.set('backpack', {
        bag: inv.bag.map(ref), picked: this.bpHot ? -1 : this.picked, hotbar: inv.hotbar.slice(bp, bp + PAGE).map(ref),
        slot: h.slot >= bp && h.slot < bp + PAGE ? h.slot - bp : -1, hotbarKeys: KEYS, vip, page: this.bpPage,
        ...(this.game ? { gold: saveDoc()?.purse?.gold ?? 0, shards: saveDoc()?.purse?.shards ?? 0 } : {}),
        item: info ? { name: nameOf(got.id, got), icon: ref(got), count: got.n, text: it?.about ?? '',
          price: it?.value && Object.keys(SHOPS).some((k) => shopBuys(k, got.id)) ? it.value.toLocaleString('en-US') : '',   // (only what a shop buys: never a dish)
          energy: it?.cat === 'food' ? Math.round(foodEnergy(got.id)) : 0,
          kind: info.finite ? `${info.uses}/${info.maxUses}` : info.weapon ? info.rarityName : info.tool ? 'Tool' : info.use === 'sow' ? 'Seeds' : ITEMS[got.id]?.rarity ?? '' }
          : { name: 'An empty slot', icon: '', count: 0 },
      });
    }
    // the Chest: the chest's forty slots, and the hotbar's ten (with VIP, either ten: its page tabs)
    if (S.top === 'storage' && this.chest) {
      const bp = this.bpPage * PAGE, id = this.chest.id, box = inv.chest(id);
      // WHAT IS THERE (testers, 2026-09-28: "the item name displayed when clicking on an item inside the chest"): the
      // thing clicked in the chest -- or, after a click on the hotbar, the one in your hand -- by name, and how many
      const shown = this.chestPick != null ? box[this.chestPick] : inv.at('hotbar', h.slot);
      const pickedName = shown ? `${nameOf(shown.id, shown)}${shown.n > 1 ? ` × ${shown.n}` : ''}` : '';
      S.set('storage', {
        title: this.chest.name, chestLabel: `${this.chest.name} (${CHEST_SLOTS} slots)`, pickedName, chestPick: this.chestPick ?? -1,
        chest: box.map(ref), hotbar: inv.hotbar.slice(bp, bp + PAGE).map(ref), bag: inv.bag.map(ref),
        slot: h.slot >= bp && h.slot < bp + PAGE ? h.slot - bp : -1, hotbarKeys: KEYS, vip, page: this.bpPage,
        placed: (saveDoc()?.placed ?? []).some((c) => c.id === id),
        ...(this.game ? { gold: saveDoc()?.purse?.gold ?? 0 } : {}),
      });
    }
    this.#fillTownsfolk();
    if (S.top === 'trade') this.#fillTrade();
    if (S.top === 'guide') this.#fillGuide();
    if (S.top === 'journal' && this.game) this.#fillJournal();
    if (S.top === 'skills') this.#fillSkills();
    if (S.top === 'name' && this.naming) {
      const st = this.naming;
      if (document.activeElement !== st.input) st.input.focus({ preventScroll: true });     // (a click on the game takes it away)
      S.set('name', { question: st.question, name: st.input.value, err: st.err, canCancel: !!st.was, first: !st.was,
        ok: st.busy ? 'Asking...' : st.was ? 'Change my name' : 'That\'s me' });
    }
    if (S.top === 'cooking' && this.cook) this.#fillCook();
    if (S.top === 'amount' && this.amount) this.#fillAmount();
    this.#fillHover();
    // the Map: the map being played, drawn when the window opens, centred on you
    if (S.top === 'map') this.#fillMap(); else { this.mapCanvas = null; this.mapView = null; this.mapDrag = null; this.mapRegions = null; }
    if (S.has('settings')) S.set('settings', { uiSize: this.uiSize, uiTheme: this.themes?.name(this.uiTheme) ?? '', langName: langInfo().short ?? langInfo().name });
    // Your farmer: the look, layer by layer, and the farmer in it
    if (S.has('character')) {
      const L = h_look(h);
      S.set('character', { preview: 'live:body', founder: !!this.founder, ...(this.game && this.playerName ? { name: this.playerName } : {}), look: Object.fromEntries(['skin', 'eyes', 'hairStyle', 'hairColour', 'clothes', 'acc'].map((k) => [k, nice(k, L[k])])) });
    }
  }

  /**
   * THE SKILLS BOOK (the designer, 2026-09-28: "the skills in a book format... all the skills and their level and
   * their progress bar"): the ten life skills, five a page, each at its level with how far it is into it -- from the
   * save's experience (only Farming earns it yet: the others wait at their start). A name too wide for its page
   * keeps its last word ("Husbandry").
   */
  #fillSkills() {
    const xp = saveDoc()?.skills ?? {}, fonts = this.stack.fonts;
    this.skillBook ??= (this.stack.docs?.get('skills')?.data?.skills ?? []).map((k) => ({ name: k.name, icon: k.icon }));
    const rows = this.skillBook.map((k) => {
      const key = k.name.toLowerCase().split(' ').at(-1), total = Math.max(0, xp[key] ?? 0), level = levelOf(total);
      const from = xpFor(level), top = level >= MAX_LEVEL, need = top ? 1 : xpFor(level + 1) - from;
      const title = !fonts || fonts.width(k.name, 'bold') <= 73 ? k.name : k.name.split(' ').at(-1);
      return { name: k.name, title, icon: k.icon, level, into: top ? 1 : total - from, need };
    });
    this.stack.set('skills', { skills: rows, skillsLeft: rows.slice(0, 5), skillsRight: rows.slice(5) });
  }

  /**
   * THE MAP (testers, 2026-09-29: "more detailed landmark names, zoom functionality"): the map being played, with its
   * places' names on it (Play's mapLabels), at one of a few sizes -- the whole map in the frame, a quarter, a half,
   * its own -- turned by the wheel or the window's + and -, and moved about by holding it and dragging. It opens as
   * it always did: as large as it can be while the whole map still pans in the frame, centred on you.
   * NEVER THE WHOLE WORLD AT ONCE (2026-10-23, the designer: zoomed out it "shows the whole area, which is not how we
   * want it to be ... only around 50% more area where the player currently is", and black bands at its sides): the
   * sizes are the one it opens at, half as far again out (MAP_OUT), and two nearer -- never so far out that the map stops
   * short of the frame. A map smaller than the frame even at its own size sits in its middle, as before.
   */
  #mapOpen(m) {
    const F = MAP_FRAME, cover = Math.min(1, Math.max(F.w / m.w, F.h / m.h));
    return Math.max(cover, [1, 0.5, 0.25].find((k) => m.w * k <= F.w * 2 && m.h * k <= F.h * 2) ?? 0.25);
  }
  #mapLevels(m) {
    const F = MAP_FRAME, cover = Math.min(1, Math.max(F.w / m.w, F.h / m.h)), k0 = this.#mapOpen(m);
    return [...new Set([k0 / MAP_OUT, k0, k0 * 2, k0 * 4].map((k) => Math.min(1, Math.max(cover, k))))].sort((a, b) => a - b);
  }
  #mapZoom(step) {
    const m = this.map, v = this.mapView;
    if (!m || !v) return;
    const levels = this.#mapLevels(m), i = levels.indexOf(v.k), j = Math.max(0, Math.min(levels.length - 1, (i < 0 ? 0 : i) + step));
    if (levels[j] === v.k) return;
    v.k = levels[j];
    this.soundOf()?.cue('click');
  }
  /** Is (x, y) on the Map window's picture? */
  #inMapPicture(x, y) {
    const b = this.#boxNamed('map', 'Map');
    return !!b && x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;
  }
  #mapDragTo(x, y) {
    const d = this.mapDrag, v = this.mapView;
    if (!d || !v || d.cx == null) return;
    v.cx = d.cx - (x - d.x) / v.k; v.cy = d.cy - (y - d.y) / v.k;
  }
  /** Where a named widget of a screen landed in the last draw (the lucky Shard flies to the HUD's Shards). */
  boxOf(screen, name) { return this.#boxNamed(screen, name); }
  /** Where a named widget of a screen landed in the last draw. */
  #boxNamed(screen, name) {
    for (const b of this.stack.boxes.get(screen)?.values() ?? []) if (b.node?.name === name && b.row == null) return b;
    return null;
  }

  /* ---------------------------------------------------------------- by touch (game/touch.js) */

  /** The line over the hotbar as shown: by touch, translated first and then without its key (the line is a button). */
  #promptWords(text) {
    this.promptShown = text;
    return TOUCH && text ? withoutKey(tr(text)) : text;
  }
  /** Is (x, y) on the line over the hotbar, while it says something to do? (A tap there does it: Play.promptAction.) */
  promptAt(x, y) {
    if (!this.promptShown || this.stack.top) return false;
    const b = this.#boxNamed('hud', 'Prompt');
    return !!b && x >= b.x - 4 && x < b.x + b.w + 4 && y >= b.y - 4 && y < b.y + b.h + 4;
  }
  /** The hotbar slot at (x, y) on the HUD -- its index in the hotbar -- or null. */
  slotAt(x, y) {
    const p = this.stack.top ? null : this.stack.pointAt(x, y);
    if (p?.screen !== 'hud' || p.type !== 'grid' || p.part == null) return null;
    return p.name === 'Slots' ? p.part : p.name === 'Slots 2' ? PAGE + p.part : null;
  }
  /** A press let go of without its click: a finger that went on to scroll a list, or to pinch the map. */
  cancelPress() { this.mapDrag = null; this.stack.cancelPress?.(); }

  /** A switch in Settings, flipped (heard: the press comes before the switch turns, so it is to be the other way). */
  #screenSwitch(name) {
    const on = !this.stack.valueOf('settings', name);
    if (name === 'Pixel-perfect scaling' && this.exact) { this.exact.set(on); return; }
    if (name === 'Other players' && this.others) { this.others.set(on); return; }
    if (name === 'Fixed joystick' && this.joystick) { this.joystick.set(on); return; }
    if (name !== 'Full screen') return;
    const root = document.documentElement, now = document.fullscreenElement ?? document.webkitFullscreenElement;
    const go = root.requestFullscreen ?? root.webkitRequestFullscreen, leave = document.exitFullscreen ?? document.webkitExitFullscreen;
    if (on && !now && go) {
      Promise.resolve(go.call(root, { navigationUI: 'hide' }))
        // (a phone: held on its side, the way the game is played -- where the browser lets a page say so)
        .then(() => (TOUCH ? screen.orientation?.lock?.('landscape') : null)).catch(() => {})
        .finally(() => this.stack.setValue('settings', 'Full screen', !!(document.fullscreenElement ?? document.webkitFullscreenElement)));
    } else if (!on && now && leave) Promise.resolve(leave.call(document)).catch(() => {});
    else if (on && !go) {
      // (an iPhone's browser has no full screen for a page: the Home Screen gives the game the whole screen)
      queueMicrotask(() => this.stack.setValue('settings', 'Full screen', false));
      this.notify('On an iPhone, tap Share, then Add to Home Screen');
    }
  }
  /** The map at scale k, with its places' names written on it: the doors first, then the places, then the ways out --
   *  a name that would sit on another is left off at that size. A map smaller than the frame sits in its middle, on its
   *  own ground colour (this.mapPad: where the map starts in the picture). */
  #mapPicture(m, k, R = { x: 0, y: 0, w: m.w, h: m.h }) {
    const pic = m.render(k, R.x, R.y, R.w, R.h), fonts = this.stack.fonts;
    const labels = (m.labels?.() ?? []).filter((L) => L.x >= R.x && L.x < R.x + R.w && L.y >= R.y && L.y < R.y + R.h);
    // (THE FISHING SPOTS, 2026-10-26: where fish bite -- commands.js fishingSpotAt -- shown on the map)
    const spots = (m.fishing?.() ?? []).filter((z) => z.x < R.x + R.w && z.x + z.w > R.x && z.y < R.y + R.h && z.y + z.h > R.y);
    this.mapPad = { x: 0, y: 0 };
    if (!pic) return pic;
    const cw = Math.max(pic.width, MAP_FRAME.w), ch = Math.max(pic.height, MAP_FRAME.h);
    if ((!labels.length || !fonts) && !spots.length && cw === pic.width && ch === pic.height) return pic;
    const px = Math.floor((cw - pic.width) / 2), py = Math.floor((ch - pic.height) / 2);
    this.mapPad = { x: px, y: py };
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (px || py) { g.fillStyle = m.bg ?? this.stack.theme?.colors?.ink ?? '#1c0a18'; g.fillRect(0, 0, cw, ch); }
    g.drawImage(pic, px, py);
    // the fishing spots: the water a line may come down in, lightly blue, its edge dotted, and a fish at its middle
    for (const z of spots) {
      const x = px + Math.round((z.x - R.x) * k), y = py + Math.round((z.y - R.y) * k), w = Math.max(3, Math.round(z.w * k)), h = Math.max(3, Math.round(z.h * k));
      g.fillStyle = 'rgba(70, 200, 255, 0.34)'; g.fillRect(x, y, w, h);
      g.fillStyle = '#e8fbff';
      for (let i = 0; i < w; i += 6) { g.fillRect(x + i, y, 3, 2); g.fillRect(x + i, y + h - 2, 3, 2); }
      for (let j = 0; j < h; j += 6) { g.fillRect(x, y + j, 2, 3); g.fillRect(x + w - 2, y + j, 2, 3); }
      // (a fish at its middle, twice the size: body, tail, eye -- on a dark round so it reads over any water)
      const s = 2, fx = x + Math.round(w / 2) - 6 * s, fy = y + Math.round(h / 2) - 4 * s;
      g.fillStyle = 'rgba(20, 40, 70, 0.75)'; g.fillRect(fx - 2 * s, fy - 2 * s, 15 * s, 11 * s);
      g.fillStyle = '#1c3550'; g.fillRect(fx, fy, 8 * s, 5 * s); g.fillRect(fx + 8 * s, fy - s, 3 * s, 7 * s);
      g.fillStyle = '#9fe6ff'; g.fillRect(fx + s, fy + s, 6 * s, 3 * s); g.fillRect(fx + 9 * s, fy, s, 5 * s);
      g.fillStyle = '#1c3550'; g.fillRect(fx + 2 * s, fy + s, s, s);
    }
    if (!fonts) return c;
    const taken = [], H = 9;
    const ink = this.stack.theme?.colors?.ink ?? '#1c0a18';
    for (const L of labels) {
      const text = tr(L.name), w = fonts.width(text, 'regular');
      if (!w || w + 4 > c.width) continue;
      const lx = L.x - R.x, ly = L.y - R.y;
      const x = Math.max(2, Math.min(c.width - w - 2, px + Math.round(lx * k - w / 2)));
      const y = Math.max(2, Math.min(c.height - H - 2, py + Math.round(L.door ? ly * k - H - 3 : ly * k - H / 2)));
      const box = { x: x - 3, y: y - 2, w: w + 6, h: H + 4 };
      if (taken.some((b) => b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h)) continue;
      taken.push(box);
      // light letters with a dark edge all round: readable on grass, water and roofs alike
      fonts.draw(g, text, x, y, { font: 'regular', color: '#fff4e0', outline: ink, outline8: true });
    }
    return c;
  }

  #fillMap() {
    const m = this.map;
    if (!m) return;
    const F = MAP_FRAME;
    // opened: the size it always opened at, centred on you
    if (!this.mapView) this.mapView = { k: this.#mapOpen(m), cx: this.hero.x, cy: this.hero.y };
    const v = this.mapView;
    if (!this.#mapLevels(m).includes(v.k)) v.k = this.#mapOpen(m);
    const k = v.k;
    // (drawn again at a new size -- or once the letters of another script have come: game/../uifont.js)
    const fontV = UIFONT?.version?.() ?? 0;
    // (the whole map's picture at this size, as if drawn: with its ground round it when it is smaller than the frame)
    const Wm = m.w * k, Hm = m.h * k, padX = Wm < F.w ? Math.floor((F.w - Wm) / 2) : 0, padY = Hm < F.h ? Math.floor((F.h - Hm) / 2) : 0;
    const W = Math.max(Wm, F.w), H = Math.max(Hm, F.h);
    const pad = { x: padX, y: padY }, px = this.hero.x * k + padX, py = this.hero.y * k + padY;
    // the view's middle where it was left (you, at first), never past an edge; a picture smaller than the frame sits in its middle
    const pan = (p, size, frame) => (size <= frame ? -Math.round((frame - size) / 2) : Math.round(Math.max(0, Math.min(size - frame, p - frame / 2))));
    const ox = pan(v.cx * k + padX, W, F.w), oy = pan(v.cy * k + padY, H, F.h);
    // (dragged past an edge: the middle comes back to where the picture stops, so dragging back answers at once)
    if (!this.mapDrag) { v.cx = W <= F.w ? m.w / 2 : (ox + F.w / 2 - padX) / k; v.cy = H <= F.h ? m.h / 2 : (oy + F.h / 2 - padY) / k; }
    // ONLY THE MAP ROUND THE VIEW IS DRAWN (2026-10-23, the testers: zooming the map lagged -- each size drew the whole
    // map, the joined world 42 million pixels at its own size): twice the frame round the view, drawn again only when it is
    // moved out of it, and kept for each size while the window is open
    const inside = (R) => R && R.fontV === fontV && (R.w >= m.w || (ox >= R.x * k && ox + F.w <= (R.x + R.w) * k))
      && (R.h >= m.h || (oy >= R.y * k && oy + F.h <= (R.y + R.h) * k));
    this.mapRegions ??= new Map();
    let R = this.mapRegions.get(k);
    if (!inside(R)) {
      const rw = Math.min(m.w, Math.ceil(F.w * 2 / k)), rh = Math.min(m.h, Math.ceil(F.h * 2 / k));
      const mid = (o, f, size, r) => Math.max(0, Math.min(size - r, Math.round((o + f / 2) / k - r / 2)));
      R = { fontV, x: mid(ox, F.w, m.w, rw), y: mid(oy, F.h, m.h, rh), w: rw, h: rh };
      R.canvas = this.#mapPicture(m, k, R);
      this.mapRegions.set(k, R);
    }
    this.mapCanvas = R.canvas;
    // you: at your place in the picture, or at its edge, the side you are on, when the picture is moved off you
    const youX = Math.max(F.x, Math.min(F.x + F.w - 16, F.x + Math.round(px - ox) - 8));
    const youY = Math.max(F.y, Math.min(F.y + F.h - 16, F.y + Math.round(py - oy) - 16 - Math.round(24 * k)));
    const places = (m.places?.() ?? []).slice(0, 6).map((name) => ({ name, glyph: 'home' }));
    // the followed quest's place: a marker (a person, a thing, the door on the way), or a lit patch to search
    const goal = m.goal?.(), clampX = (v, w = 0) => Math.max(MAP_FRAME.x, Math.min(MAP_FRAME.x + MAP_FRAME.w - w, v)),
      clampY = (v, h = 0) => Math.max(MAP_FRAME.y, Math.min(MAP_FRAME.y + MAP_FRAME.h - h, v));
    const g = { goalSpot: false, goalArea: false, goalName: '', goalX: 0, goalY: 0, areaX: 0, areaY: 0, areaW: 0, areaH: 0, gtagX: 0, gtagY: 0 };
    if (goal) {
      const gx = MAP_FRAME.x + Math.round(goal.x * k + pad.x - ox), gy = MAP_FRAME.y + Math.round(goal.y * k + pad.y - oy);
      const gw = Math.max(6, Math.round(goal.w * k)), gh = Math.max(6, Math.round(goal.h * k));
      const name = goal.npc ? NPCS[goal.npc]?.name ?? '' : goal.label ?? '';
      if (goal.exact) {
        Object.assign(g, { goalSpot: true, goalX: clampX(gx + Math.round(gw / 2) - 8, 16), goalY: clampY(gy - 14, 16) });
        Object.assign(g, { gtagX: clampX(g.goalX - 44, 104), gtagY: clampY(g.goalY + 16, 15) });
      } else {
        const x0 = clampX(gx), y0 = clampY(gy), x1 = clampX(gx + gw), y1 = clampY(gy + gh);
        Object.assign(g, { goalArea: x1 - x0 > 1 && y1 - y0 > 1, areaX: x0, areaY: y0, areaW: x1 - x0, areaH: y1 - y0,
          gtagX: clampX(Math.round((x0 + x1) / 2) - 52, 104), gtagY: clampY(y1 + 2, 15) });
      }
      g.goalName = name;
      if (name) places.unshift({ name, glyph: 'star' });
    }
    // YOUR PIN (2026-10-26, play.js pinAt): its marker where it is, and the view kept so a click can be turned into the map's
    // own pixels (up)
    if (this.stack.docs?.get('map') && !this.pinPart) {
      this.pinPart = true;
      this.#addTo('map', 'Map frame', { id: 'mappin', type: 'icon', name: 'Pin', x: '{pinX}', y: '{pinY}', w: 16, h: 16, anchor: 'tl', glyph: 'star', color: '#ff5a6e', scale: 1, shadow: true, showIf: 'hasPin' });
    }
    const pin = m.pin?.();
    const pinXY = pin ? { pinX: clampX(MAP_FRAME.x + Math.round(pin.x * k + pad.x - ox) - 8, 16), pinY: clampY(MAP_FRAME.y + Math.round(pin.y * k + pad.y - oy) - 15, 16) } : {};
    this.mapClick = { ox, oy, pad, k, m };
    this.stack.set('map', {
      mapPicture: 'live:map', mapX: ox - R.x * k, mapY: oy - R.y * k, youX, youY, tagX: youX - 12, tagY: youY - 15, townLabels: false, ...g,
      hasPin: !!pin, pinX: 0, pinY: 0, ...pinXY,
      places: places.length ? places.slice(0, 6) : [{ name: m.name ?? 'Here', glyph: 'home' }],
    });
  }

  /* ---------------------------------------------------------------- the pointer and Escape */

  move(x, y) {
    this.pointer = { x, y };
    if (this.mapDrag) { this.#mapDragTo(x, y); return true; }
    return this.stack.move(x, y);
  }
  down(x, y) {
    // the Map's picture: held and moved, it pans (testers, 2026-09-29) -- but its buttons are buttons
    if (this.stack.top === 'map' && this.#inMapPicture(x, y) && !this.stack.move(x, y)) {
      this.mapDrag = { x, y, cx: this.mapView?.cx, cy: this.mapView?.cy };
      return true;
    }
    return this.stack.down(x, y);
  }
  up(x, y) {
    if (this.mapDrag) {
      // (a click that did not move the map: your pin there, or away -- play.js pinAt)
      const d = this.mapDrag, c = this.mapClick;
      this.mapDrag = null;
      const b = this.#boxNamed('map', 'Map');
      if (c && b && Math.hypot(x - d.x, y - d.y) < 3) c.m.setPin?.((x - b.x + c.ox - c.pad.x) / c.k, (y - b.y + c.oy - c.pad.y) / c.k, 10 / c.k);
      return true;
    }
    return this.stack.up(x, y);
  }
  /** The pointer left the game: no map held, no name shown for what it was over. */
  leave() { this.mapDrag = null; this.pointer = null; }
  /** The wheel over the interface (play.js): a long list scrolls, a page turns, the map zooms. True when it was
   *  the interface's (anything over an open window is). */
  wheel(x, y, dy) { return this.stack.wheel(x, y, dy); }
  /** The wheel over a window where no list scrolls: the page it shows turned, or the map zoomed. */
  #wheelOver(screen, { dy = 0 } = {}) {
    const step = Math.sign(dy);
    if (!step) return;
    if (screen === 'map') { this.#mapZoom(-step); return; }
    if (screen === 'amount' && this.amount) { this.action('amount', String(-step)); return; }   // (up: one more)
    const sh = this.shop;
    if (sh && screen === sh.screen) { if (this.#shopRows().pages > 1) this.#npcAction('shoppage', String(step)); return; }
    if (screen === 'exchange' && this.ex) { this.#npcAction('exchpage', String(step)); return; }
    if (screen === 'market' && this.mk) { this.#npcAction(this.mk.tab === 1 ? 'mkmpage' : this.mk.tab === 2 ? 'mkhpage' : 'mkpage', String(step)); }
  }
  /** Escape: close the top window; false when there was none (Play then goes back to editing). */
  escape() {
    const closed = this.stack.escape(), s = this.soundOf();
    if (closed && s && !s.has('windowClose')) s.cue('click');       // (with its own sound, the window's close plays it)
    return closed;
  }
}
