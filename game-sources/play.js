// play.js -- WALK THE MAP AS A PLAYER WOULD.
//
// Judging a road's width or a fountain's size from the zoomed-out editor is
// guesswork: the player never sees the map like that. Play mode puts you on
// the ground at exactly the game's scale. It uses the game's own numbers:
//   * the game's 480 x 270 view of the world, scaled up by the largest whole
//     number that fits the window (src/core/Renderer.js) -- and then widened or
//     deepened to fill the window's shape, so there is never a black band
//     (the designer, 2026-09-24): more world, never less than 480 x 270 (fit())
//   * running at 92 px/s by default, walking at 54 while Shift is held, with a
//     10 x 8 box at the feet (src/entities/Player.js)
//   * the camera easing after the player the way the game's does
//
// It only READS the map: nothing is changed, nothing is marked unsaved,
// nothing is sent to anyone editing with you.
//
// What stops you:
//   * water tiles, unless a pier (a tile on a layer above) or a bridge covers them
//   * the base of whatever stands on the map, worked out from the library's kind
//     for it: a building's walls, a tree's trunk, a fence's run, the lower part
//     of a prop
//   * inside, the walls: in the pack's house tileset (Tileset House.png) only the
//     floors -- columns 12 to 35 of its top four rows -- are ground; the frame
//     round a room and every wall panel stop you
//   * furniture over all its depth but its back edge (a table seen from above
//     is solid, not just its legs)
// Flowers, grass, crops, shadows, lily pads, rugs and mats you walk through, as
// you do the wild birds and insects (the Forest animals' bugs, crows and gulls), and
// anything on a layer named "Floor" (a court's lines, a stage) or "Wall" (what
// hangs on a wall, which stops you already).
//
// DOORS take you through, as in the game: step into a zone tagged to:<map> (a
// building's door zone, a room's exit) and that map opens with you standing
// just clear of the door that leads back -- out of the Bakery, you are on the
// street in front of it. A map with unsaved changes keeps you in (save first);
// a room with unsaved work waiting to be recovered opens the ordinary way, so
// its question is asked in the editor, not behind the game's view.

// THE GAME'S ANIMATION lives in js/game/ (standalone modules the game engine can
// take over): the player is the pack's layered villager with every action it
// has (game/villager.js, game/hero.js -- tools, fishing, swimming, riding,
// carrying, sitting...), and the world moves (game/ambient.js: the
// water, the fountain, the wind in trees, crops and grass, birds, butterflies,
// bees, ducks, children at play, chimney smoke, fire).
//
// THE GAME'S INTERFACE (game/ui.js) is the one designed in the UI Studio
// (tools/ui-editor), drawn over the world in the game's own pixels: the HUD with
// energy, the hotbar and the tool in hand, and the windows its buttons open.
// Escape closes a window first; with none open it goes back to editing.
//
// THE GAME'S RULES (game/rules.js, the designer's): every tool costs energy;
// the hoe turns whole lines of the fields (zones tagged "farm") and each player
// sees their own crops (game/farm.js); the axe fells trees and the pickaxe
// breaks rocks (game/nodes.js); the bow and the staff shoot where you click, the
// sword strikes (game/combat.js). Water stops you on foot: where a zone tagged
// "swim" touches it (the river) the bank offers F to dive in. The mouse is the
// pack's hand. blocked() still answers "could you stand here on foot", which
// doors and arrivals ask.
//
// THE GAME (bloomshire.xyz/play, gamemain.js) runs this same Play with app.game
// set: there is no editor behind it, so Escape opens the pause menu, the testing
// panel and the test keys are gone, you start at the world's spawn, and a door
// simply opens the next map (read-only: nothing is ever saved to a map).
//
// THE GAME'S SOUND (game/sound.js): the game's own sound code and the
// designer's files (SFX/, Music/), served by this editor's server under
// /sound/. Every action, the world round you and the interface make their
// sounds; the music plays while you play and stops when you go back to editing.

import { SkyTester } from './game/skytest.js';
import { bounds, drawOrder, resolveGid } from './doc.js';
import { BLOB } from './terrain.js';
import { doorTarget, doorBackTo, edgeOf, gameName, goTo } from './places.js';
import * as api from './io.js';
import { el, packURL, serverURL } from './util.js';
import { pixelsNow } from './png.js';
import { Villager, DEFAULT_LOOK, ACTIONS, skinAllowed } from './game/villager.js';
import { Hero, until } from './game/hero.js';
import { Hud, savedLook, saveLook } from './game/hud.js';
import { loadGameUi, TOUR, TIPS } from './game/ui.js';
import { AnimWorld } from './game/ambient.js';
import { FishLife } from './game/fish.js';
import { Embers } from './game/embers.js';
import { TileAnims } from './game/tiles.js';
import { Farm } from './game/farm.js';
import { Nodes } from './game/nodes.js';
import { Combat } from './game/combat.js';
import { Heavy, heavyCfg, heavyBlow, drawReticle, AIM_R } from './game/heavy.js';
import { Energy, Health, SWIM_TAG, ENERGY, LOOT, DROPS, gameNow, saveDoc, lockedBecause, wildOf, wideWater, BUFFS, buffOn } from './game/rules.js';
import { DUNGEON, COLOSSEUM_OPEN, prizeBackIn } from './game/rules.js';   // (the dungeon's way out, the Colosseum shut, a boss's prize: 2026-10-27)
import { bestPickaxe, HOME_MAPS, VIP_MAPS, VIP_CHEST_ITEM, placedOf } from './game/commands.js';
import { ITEMS, CHEST_ART, VIP_CHEST_ART, levelOf, SKILL_GAP } from './game/catalog.js';
import { CaveLight } from './game/cavelight.js';
import { Abyss } from './game/abyss.js';
import { undeadClass } from './game/undeadtiles.js';
import { Magic } from './game/magic.js';
import { Twelve, TWELVE } from './game/twelve.js';
import { Scenes } from './game/scenes.js';
import { heartsOf, SWEETHEARTS, canCourt } from './game/hearts.js';
import { SCENES, CUES } from './game/cutscenes.js';
import { Theatre } from './game/theatre.js';
import { Grey } from './game/grey.js';
import { Pet, PET_FIND, petWild } from './game/pet.js';
import { FoundersHall, statueBeside } from './game/foundershall.js';
import { Colosseum } from './game/colosseum.js';
import { Dungeon, pickWay, claimDelve, chooseWeapon } from './game/dungeon.js';
import { Grotto } from './game/grotto.js';
import { Pens, PenWindow } from './game/animals.js';
import { auraRGB } from './game/founding.js';
import { FounderFx } from './game/founderfx.js';
import { GoodsFx } from './game/goodsfx.js';
import { EMPORIUM_SETS } from './game/founding.js';
import { EMPORIUM_GOODS, VIP_PASS_ON_SALE } from './game/catalog.js';
import { setMountTraits } from './game/villager.js';

// (a mount's skin bought at the Emporium: its aura, as the Mount Studio tuned it, for the rig to bake -- villager.js)
setMountTraits(EMPORIUM_GOODS.filter((g) => g.kind === 'mount' && g.fx?.aura).map((g) => [`${g.mount}:${g.skin}`, { aura: g.fx.aura, auraPower: g.fx.auraPower ?? 1 }]));
import { RideWheel } from './game/ridewheel.js';
import { GuideBook } from './game/guidebook.js';
import { Fireworks } from './game/fireworks.js';                   // (a day to celebrate: rules.js EVENTS, 2026-10-28)
import { BoostsWindow } from './game/boostsui.js';                 // (your boosts, 2026-10-28)
import { eventOn, EVENTS } from './game/rules.js';
import { BearPal } from './game/bearpal.js';
import { Runaway } from './game/runaway.js';
import { TownWindow, townsNow } from './game/towns.js';
import { PicksWindow, picksDue } from './game/picks.js';
import { GenderWindow } from './game/genderpick.js';             // (the farmer's gender, chosen once: asked at sign-in)
import { MOUNT_STAMINA, MOUNT_BOLT, MOUNT_NAMES, staminaOf, PET_ENERGY, petEnergyOf, mountsOwned, dungeonDash } from './game/rules.js';   // (a holder's own mount, its stamina: 2026-10-23)
import { ANIMALS } from './game/rules.js';
/** One of the twelve's colours as light's rgb (game/twelve.js). */
const TWELVE_LIGHT = (k) => [1, 3, 5].map((i) => parseInt((TWELVE[k]?.colour ?? '#ffffff').slice(i, i + 2), 16)).join(', ');
import { TouchPad, touchFirst, isPhone, touchText } from './game/touch.js';
import { TURN, applyTurn, wantTurn, viewSize, toLocal, localRect } from './game/turn.js';
import { langNow, t } from './i18n.js';
import { Townsfolk, NPCS } from './game/npcs.js';
import { SKILL_TITLES, regionAt, isSafeAt } from './game/commands.js';
/** The joined world's regions by name, said as you cross into one (checkRegion). */
const REGION_NAMES = { bloomshire: 'Bloomshire', whisperwood: 'Whisperwood', moonmere: 'Moonmere', stonepeak: 'Stonepeak', southvale: 'The Southvale', bay: 'Bloomshire Bay' };
import { QUEST, stepOf } from './game/quests.js';   // (the townsfolk a quest waits on stay out: questFolk)
import { activeOf, shownFor, clueFor, clueAgain, objectShown, isDone, readyOf, startReady, OPENING, openingDone, QUEST_ITEMS, goalOf, trackedOf, foundersShort, keptFor, KEPT_WHY } from './game/quests.js';
import { nextDoor } from './game/where.js';
import { LocalSession } from './game/session.js';
import { Emporium } from './game/emporium.js';
import { RefillShop } from './game/refillshop.js';
import { InboxWindow } from './game/inbox.js';
import { GoodsShop } from './game/goodsshop.js';
import { WalletWindow } from './game/walletui.js';
import { FoundersWindow, founderOf } from './game/foundersui.js';
import { WalletsWindow } from './game/linkwallets.js';
import { LeaderboardWindow } from './game/leaderboard.js';
import { FriendsWindow } from './game/friends.js';
import { BedCard } from './game/bedcard.js';
import { LevelUpCard, SkillCard } from './game/skillbook.js';
import { BugBook } from './game/bugbook.js';
import { startClock, worldTime } from './game/clock.js';
import { Inventory, itemInfo } from './game/inventory.js';
import { loadSound } from './game/sound.js';
import { LiveClient } from './game/live.js';
import { ChatPanel } from './game/chat.js';
import { Sky } from './game/sky.js';
import { Glade } from './game/glade.js';
import { skyAt, keptIn, skyFor, fixedSky, phaseOf, lightAt } from './game/weather.js';
import { MarshGuide } from './game/marshguide.js';
import { stalkerOut, ENEMIES as FOES, RESPAWN } from './game/rules.js';
import { isSafePlace, SEEDS, DEATH_BAG, BOSS_CHEST, HEALTH } from './game/rules.js';
import { AdminDesk, desk as adminAsk } from './game/admin.js';
import { BOOKS } from './game/books.js';
import { SeedShop } from './game/seedshop.js';
import { VipPass } from './game/vippass.js';
import { GardenPanel } from './game/garden.js';
import { isVip, realDay, mealMult, foeScale, placeScale, dishMight, dishGuard, VIP_PERKS, VIP_QUARTER_OPEN, VIP_CLOSED_WORDS } from './game/rules.js';
import { PREMIUM, SKILL_BONUS, armourLook } from './game/rules.js';
import { POT_KEY, freeEnergyAt, HEAVY, DASH, dashHere, lootTaken, dungeonLevel, BOSS_WEAPONS, bossTakes, weaponFamily } from './game/rules.js';
import { GENDERS } from './game/rules.js';                         // (the farmer's gender, chosen once)                         // (your pot on the fire, over the stove: drawPotTimers)
import { premiumAura } from './game/farm.js';

// the pack's hand for a cursor (UI/HUD.png: open, grab, point)
const HAND = { image: 'UI/HUD.png', point: [35, 65, 12, 14], grab: [19, 67, 12, 12] };

export const GAME_W = 480, GAME_H = 270;
const FOES_NEAR_PX = 190;                                            // (a moment waits while a creature is this near: foesNear)
/** No keys held: what the farmer is given while a moment plays (game/twelve.js). */
const NO_KEYS = new Set();
const BOX_W = 10, BOX_H = 8;
const SLIDE_S = 0.55;                    // the view sliding over a border into the next area (keepArea)
const EDGE_OUT_MS = 220;                 // the view going down into the dark over a region's edge, the farmer walking on (travel)
const DOOR_OUT_MS = 150, DOOR_IN_MS = 260;
/** A door that is a LADDER up or down a shaft (the mines' levels, 2026-10-22): tagged `ladder`, or named or noted so. */
const ladderDoor = (z) => !!z && ((z.tags ?? []).includes('ladder') || /ladder|shaft/i.test(`${z.name ?? ''} ${z.notes ?? ''}`)) && (z.tags ?? []).some((t) => t.startsWith('to:'));   // ...and through a door: down as you step in, up again as you walk on (2026-10-22)
// THE PLACE LEFT, KEPT (build, takeUp): what Play makes of a map, kept while one is away from it and taken up again on return
const PARKED = ['outside', 'areas', 'mapW', 'mapH', 'water', 'wall', 'bare', 'road', 'falls', 'outdoors', 'timeless', 'tiles', 'world',
  'fishLife', 'embers', 'fishUnder', 'nodes', 'abyss', 'light', 'skyDraw', 'glade', 'twelve', 'grey', 'combat', 'orders', 'spans',
  'standing', 'grid', 'marshGuide', 'stalkerAt', 'witnessT', 'folk', 'body', 'swimmable', 'wide', 'wilds', 'solids', 'floors',
  'flatThings', 'ways', 'opens', 'ladders', 'stoneWays', 'stoneSteps', 'index', 'floorIndex', 'grotto'];   // (grotto: the Mirror Pond's chest as it was)
const FLAT_W = 48, FLAT_H = 24;                                 // (a thing this small that stops nobody is under your feet: buildSolids)
// face to face: how near (world px) another player stands for E to ask them to trade (the server allows a little more)
const TRADE_NEAR = 40;
// (a thrown rider's mount, 2026-10-28: a horse runs off, but a bicycle does not run and a broomstick flies -- thrownOff, mountWhyNot)
const RAN_OFF = { bicycle: 'rolled off', broom: 'flew off' };
/** How far a finger's tap reaches a person or a thing (world pixels, from your feet): a step or two (Play.tapWorld). */
const TAP_REACH = 36;
// stepping stones: how far from their line the point between the feet may be, over the water; and how near it a step
// has to be to be drawn onto it (play.js onStones, keepToStones)
const STEP_R = 3.5, STEP_PULL = 12, STEP_HOP = 22;   // (STEP_HOP: how far a farmer hops onto a stepping-stone line: alongStones)
/** How far (x, y) is from the segment s { ax, ay, bx, by }: d, the nearest point on it (px, py), and how far along (t, 0-1). */
function segNear(x, y, s) {
  const vx = s.bx - s.ax, vy = s.by - s.ay, t = Math.max(0, Math.min(1, ((x - s.ax) * vx + (y - s.ay) * vy) / (vx * vx + vy * vy || 1)));
  const px = s.ax + vx * t, py = s.ay + vy * t;
  return { d: Math.hypot(x - px, y - py), px, py, t };
}
/** The pack's side views face RIGHT (the villager's third direction block): facing left is the fourth block, or a mirror. */
export const mirrored = (facing) => facing === 'left';
const BUCKET = 64;                                            // spatial index cell, px
// the farmer first stands and walks; the other actions' layers come in behind, a few at a time
const FIRST_ACTIONS = ['idle', 'walk', 'run'];
// THE SCHOOLCHILDREN GO HOME (2026-09-30, a player: "the children shouldn't be at school at this hour"): the town's
// children -- the pack's Child pictures, playing in the schoolyard -- are out from 7 in the morning to 6 in the evening
// (and in out of the rain: 2026-10-01, the designer -- keptIn below)
const KIDS_OUT = [7, 18];
// BY NIGHT AND IN THE RAIN EVERYONE OUTDOORS GOES IN (the designer, 2026-10-01; weather.js keptIn): the townsfolk walk
// in at the nearest door, the children go home, the birds roost -- all but Marlow, wherever his quests have him (the
// designer, the same day: "whether it's raining or not, Marlo needs to be outside, and his quest needs to be done")
// ...and every mermaid (the designer, 2026-10-03: "whatever the weather is or whatever the time is, the mermaid should
// always be on that stone"): anyone drawn from the pack's Mermaid pictures is never sent in
const STAY_OUT = new Set(['marlow', 'silas', 'wick', ...Object.keys(NPCS).filter((id) => /\/Mermaid\//.test(NPCS[id].premade?.sheet ?? ''))]);
// THE NIGHT FOLK (refinement 6, the Night Court's night market): out only after dark, and in by day or in the rain
const NIGHT_FOLK = new Set(Object.keys(NPCS).filter((id) => NPCS[id].night));
/** The person a zone stands someone at (npc:<id>), or null. */
const npcOf = (z) => (z.tags ?? []).find((t) => t.startsWith('npc:'))?.slice(4) ?? null;
const KID = new WeakMap();
const isKid = (o) => { let k = KID.get(o); if (k === undefined) KID.set(o, (k = String(o.asset ?? '').includes("NPC'S/Child/"))); return k; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Every picture a map draws: its tilesets and what stands on its visible layers (an open map's doc, or
 *  a map file as saved -- the same names). */
export function mapArt(doc) {
  const out = new Set();
  for (const t of doc?.tilesets ?? []) if (t.image) out.add(t.image);
  for (const l of doc?.layers ?? []) if (l.type === 'objects' && l.visible !== false) for (const o of l.objects ?? []) if (o.asset) out.add(o.asset);
  return [...out];
}
const NO_WATER = { length: 0 };                               // solid(): a water map where nothing is water
// HOME (the home island, 2026-09-25): what can be used, marked by a zone -- the bed (rest), a chest
// (chest:<id>, its forty slots), the wardrobe (your look)
// ...and the quests' (game/quests.js): something to look at closely (clue:<id>), a stove (cook), what grows
// wild (forage:<kind>)
const SPOT = /^(bed|wardrobe|chest:.+|loot:.+|look|clue:.+|puzzle:.+|cook|mill|dairy|craft|loom|gong|lever|forage:.+|book:.+|pedestal:\d+|pen:[a-z]+)$/;
// ...and the finds the old magic touched: a glint of blue when they are found (clueMagic, game/magic.js)
const MAGIC_FINDS = new Set(['token_hollow', 'grotto_charm', 'old_cave_pearl', 'glowing_stump']);

// (THE QUEST MARKER is gone, 2026-09-27 -- the designer: "it removes the whole exploration". The journal says
// where to go, in words: game/quests.js, each step's `where`.)
// bridges and piers (Bridge.png, Bridge Beach.png) by FILE name -- fences live in "Fence and Bridge/"; and the
// Everbloom's round shores (2026-10-14, design/everbloom/art/shores.py): grass drawn over the edge of the water, walked
// on where it is drawn (deckAt: its solid pixels that are not the water's blue), so you stop at the water you see;
// the crystal pools' pictures the same (their rim of river rocks and the grass round them)
const FLOOR = /(bridge|Everbloom Shore|Crystal Pool)[^/]*\.png$/i;
const SHORE = /(Everbloom Shore|Crystal Pool)[^/]*\.png$/i;
const FOREST_BRIDGE = /Deep Forest\/Bridge\.png$/;
/** The Everbloom's bridges (2026-10-14, the collision pass): laid flat on the Floor layer, they had no railings, and
 *  their pale stones read as the water's blue in a pier's mask, so the deck had holes. Each is its own: the deck a
 *  clean band you walk the length of, its railings (and the long bridge's front face) solid.
 *  [file, picture w, h, 'ew' | 'ns', [deck from, to], [railing / side from, to] x2]  (rows for 'ew', columns for 'ns') */
const ELF_BRIDGES = [
  [/Elf Bridge Long\.png$/, 229, 86, 'ew', [21, 47], [[0, 21], [47, 75]]],
  [/Elf Bridge Avenue\.png$/, 55, 177, 'ns', [13, 44], [[5, 13], [44, 51]]],
  [/Elf Bridge Small NS\.png$/, 53, 97, 'ns', [13, 39], [[5, 13], [39, 51]]],
];
/** The Everbloom's rose gates' posts: [file, picture w, h, [[x0, x1, top of the foot], ...]] (art/px3d elf_garden.py). */
const GATE_POSTS = [
  [/Elf Garden Gate\.png$/, 92, 96, [[3, 22, 84], [74, 91, 84]]],
  [/Elf Gate Arch\.png$/, 115, 121, [[4, 19, 107], [96, 111, 107]]],
  [/Objects\/Lone Door( B)?\.png$/, 40, 60, [[6, 12, 45], [28, 34, 45]]],   // (the Dreaming Fields' lone doors, refinement 2: walked through, between their columns)
  [/Objects\/Vine Door\.png$/, 56, 60, [[6, 12, 45], [44, 50, 45]]],   // (the Everbloom's vine door, 2026-10-21: the lone door widened, its portal between the columns)
];
/** Tiles drawn over the ground that are not ground: the joined world's waterfalls, ripples, depth and murk (Bloomshire Region Art). */
const SEE_THROUGH = /^region\/Tilesets\/(Waterfall|Water Ripples|Water Depth|Water Deep|Water Murk|Lava Falls|Dawn Sky|Dawn Undersides|Dawn Realm|Scar Realm|Frost Realm|Barrow Realm|Barrow Vault|Moon Realm|Dream Realm|Wood Realm|Peak Realm)/;   // (Frosthaven's painted ground too, 2026-10-18, so its holes in the ice, its springs and its black water are water; the Black Scar's falls of fire, 2026-10-15; the Halls of Dawn's sea of billows and the islands' undersides, pictures over the clouds' ground, 2026-10-16; the Black Scar's painted ground, its second making, 2026-10-17: the grounds under it say what each cell is; the vault under Gloamfen's crypt, 2026-10-20: its walls had stopped nobody; Moonmere painted in the joined map, refinement 1, 2026-10-20)
const isFloor = (o) => FLOOR.test(String(o.asset ?? ''));
/** What a stepping stone is drawn with (inside a way over water: see stoneWays). */
const STONE = /Props\/Spring\/props water\.png$|Mine and Dungeon\/Mine props\.png$|Spring\/Ground stones\.png$/;
// layers of things that never stop you: flat on the floor (a court's lines, a
// stage, rugs) or hung on a wall (pictures, windows -- the wall stops you)
const FLAT_LAYER = /^(floor|wall)\b/i;
// the pack's rug sheet, carpet and picnic blankets: lying flat, wherever they are
const RUGS = /Interior\/Part 11 copiar\.png$|Tileset\/carpet\.png$|Exterior\/Picnic\.png$/i;
// the pack's ground-props sheet (tufts, flowers, mushrooms, puddles) and its wild birds and insects
const GROUND_PROPS = /Tileset\/ALL props seasons\.png$/i;
const CRITTERS = /Animals\/Forest\/(Bugs|Crow)\/|Animals\/Forest\/Beach\/(seagull|Pelican)\.png$/i;
/** Is gid a wall of the house tileset? Its floors are columns 12-35 of its top
 *  four rows; everything else -- the frame (columns 0-11) and every wall panel,
 *  the two-row walls at columns 36-51 among them -- is wall. */
function isHouseWall(doc, g) {
  const hit = resolveGid(doc, g);
  if (!hit || !/Tileset House\.png$/i.test(hit.ts.image)) return false;
  const c = hit.index % hit.ts.columns, r = Math.floor(hit.index / hit.ts.columns);
  return !(r < 4 && c >= 12 && c <= 35);
}

// CLIFFS (2026-09-25, the forest): the pack's "Grass Cliff" sheets hold a raised ground -- its top, a 12 x 4 blob
// (rows 0-3, and the darker grass again at rows 6-9) -- and its rock: the faces that go under its rim (rows 4-5),
// the cave mouths and spouts (columns 12-19). You walk about on the top, but not over its rim or into its rock.
// A path painted over the rim is a stair (the top-most tile of a cell decides); a zone tagged `walk` opens a
// ladder's or stepping stones' way (over rock or water), and one tagged `solid` stops you where the art draws no wall.
// A RIM BY THE WATER IS A SHORE, NOT A CLIFF (2026-09-25: the home island is painted with the cliff set, and its
// dock starts on the rim): a rim cell beside water is walked on, as it always was; the rock never is. And a
// bridge, a pier or a walk zone carries you over anything (blocked()).
const CLIFF_SHEET = /Grass Cliff Tileset/i;
const RIM = new Set(Object.entries(BLOB).filter(([m]) => (+m & 15) !== 15).map(([, c]) => c));
// ROCK (2026-09-25, Stonepeak: "we want these caves and walls with rocky things"): the grey stone of the
// pack's cave sheets ("Rock Caves", and the brown "Caves") stands under the heights' rims as their faces. Its
// wall blob (columns 0-11 of the top four rows) and its faces (row 4 there) are rock; its floors are not.
const CAVE_SHEET = /Tileset\/(Rock )?Caves\.png$/i;
// THE CAVES INSIDE (2026-09-26): the sheets' ore bands are rock too -- every ten rows from row 5 a band of
// ore-veined wall (rows 5-8, three colours to a band, twelve columns each) over its ore faces (row 9); the
// rows between (glints to lay on a floor, loose clusters) are not. The Dungeon set's wall blob and its brick
// face (rows 0-4) are wall, its slab floor is not; the Temple's carved faces (rows 4-5) are wall, its inlaid
// floor (rows 0-3) is not.
const DUNGEON_SHEET = /Tileset\/Dungeon tileset\.png$/i, TEMPLE_SHEET = /Tileset\/Tileset Temple\.png$/i;
/** 'rock' (a face, a cave), 'rim' (the top's edge), or false. */
function cliffKind(doc, g) {
  const hit = resolveGid(doc, g);
  if (!hit) return false;
  const c = hit.index % hit.ts.columns, r0 = Math.floor(hit.index / hit.ts.columns);
  // (the sheets' flat tile at column 4 of row 4 -- cobbles in the grey sheet, packed earth in the brown -- is the
  // FLOOR of a cave; outside, on Stonepeak's cliffs, it tops their faces and is rock)
  if (CAVE_SHEET.test(hit.ts.image)) return c === 4 && r0 === 4 && doc.region === 'caves' ? false : (c < 12 && r0 <= 4) || (r0 >= 5 && (r0 - 5) % 10 <= 4) ? 'rock' : false;
  if (DUNGEON_SHEET.test(hit.ts.image)) return r0 <= 4 ? 'rock' : false;
  if (TEMPLE_SHEET.test(hit.ts.image)) return r0 >= 4 ? 'rock' : false;
  if (!CLIFF_SHEET.test(hit.ts.image)) return false;
  const r = r0 % 6;
  return c >= 12 || r >= 4 ? 'rock' : RIM.has(r * 12 + c) ? 'rim' : false;
}
// A PIT (2026-09-25, Stonepeak's Drop): the grass sheets' four grass-edged holes (their terrains 13, 14, 19 and
// 20: the 12 x 4 blocks at rows 24-27 and 36-39) go down into the dark. Nobody walks into one; a deck over it
// (a floor) carries you.
const PIT_SHEET = /Tileset\/Tileset Grass (Spring|Summer|Fall|Deep Forest)\.png$/i;
function isPit(doc, g) {
  const hit = resolveGid(doc, g);
  if (!hit || !PIT_SHEET.test(hit.ts.image)) return false;
  const r = Math.floor(hit.index / hit.ts.columns);
  return (r >= 24 && r <= 27) || (r >= 36 && r <= 39);
}

/** The part of an object that stops the player, in map px ({x, y, w, h}), or null to walk through it. */
/**
 * THE UNDEAD LANDS' THINGS (2026-10-02): every picture of that pack is named "..._shadowN" (its variant: the shadow's
 * colour for the ground under it) -- they are not shadows; each stands by what it is, with the footprint its shape
 * needs, as fractions [x0, y0, x1, y1] of the drawn box (mirrored when the thing is flipped). null: walked over.
 */
const UNDEAD_FOOT = [
  [/Objects_separately\/(Bones_|Thorn_p|Plant_|Plant__|Dead_arm_)/, null],                 // bones, creeping thorns, weeds, hands: walked over
  [/Objects_separately\/(Crystal_shadow\d_[34]|Rock_shadow\d_5)\.png$/, null],                // a small crystal, a pebble: the pack walks through them
  [/Objects_separately\/Lich_shadow/, [0.12, 0.38, 0.86, 0.8]],                          // the fallen crowned giant: its ribs and skull, not its hands
  [/Objects_separately\/Broken_ ?tree_/, [0.05, 0.45, 0.95, 1]],                         // a fallen trunk, end to end
  [/Objects_separately\/(Dead_tree|Tree)_/, [0.36, 0.82, 0.64, 1]],                      // a trunk
  [/Objects_separately\/Pile_sculls_/, [0.06, 0.42, 0.94, 1]],
  [/Objects_separately\/Scull_door_/, [0.04, 0.5, 0.96, 1]],
  [/Objects_separately\/(Grave|Ruin|Rock|Crystal)_/, 'prop'],
  [/PNG\/Animation[1-3]\.png$/, [0.4, 0.8, 0.6, 0.97]],                                  // the twisted trees: their trunk
  [/PNG\/Animation4\.png$/, [0.12, 0.62, 0.88, 1]],                                      // the skull shrine
  [/PNG\/Animation5\.png$/, [0.15, 0.55, 0.85, 1]],                                      // the lich on its throne
  [/PNG\/Animation6\.png$/, [0.18, 0.72, 0.82, 1]],                                      // the hooded lich
];
// Tiled_files/Objects_animated*.png: six bands, top to bottom -- the big tree, a tree, a small tree, the lich on its
// throne, the skull shrine, the hooded lich (build-manifest.mjs bandAnims)
const UNDEAD_BANDS = [[0, 140, [0.42, 0.84, 0.6, 0.98]], [140, 240, [0.4, 0.8, 0.6, 0.97]], [240, 310, [0.38, 0.78, 0.62, 0.97]],
  [310, 415, [0.15, 0.55, 0.85, 1]], [415, 528, [0.12, 0.62, 0.88, 1]], [528, 700, [0.18, 0.72, 0.82, 1]]];
function undeadBox(path, b, o) {
  let f = 'prop';
  if (/Tiled_files\/Objects_animated/.test(path)) f = (UNDEAD_BANDS.find(([y0, y1]) => (o?.sy ?? 0) >= y0 && (o?.sy ?? 0) < y1) ?? [0, 0, 'prop'])[2];
  else { const hit = UNDEAD_FOOT.find(([re]) => re.test(path)); if (hit) f = hit[1]; }
  if (f === null) return null;
  if (b.w * b.h <= 64) return null;
  if (f === 'prop') { const h = Math.min(b.h * 0.5, Math.max(6, b.w * 0.7)); return { x: b.x + 1, y: b.y + b.h - h, w: Math.max(1, b.w - 2), h }; }
  let [x0, y0, x1, y1] = f;
  if (o?.flipX) [x0, x1] = [1 - x1, 1 - x0];
  return { x: b.x + b.w * x0, y: b.y + b.h * y0, w: Math.max(1, b.w * (x1 - x0)), h: Math.max(1, b.h * (y1 - y0)) };
}

// THE SUNLANDS' PIECES (the collision pass, 2026-10-16, the designer: the farmer "walks underneath some of the assets ...
// it should only walk underneath the places where it is supposed to walk"): each stops you over the ground it stands on,
// measured from its model (px3d/sunprops.py: a picture pixel is a model unit, up and back alike), so nobody stands in a
// stall's back half under its awning, on a tomb's back step, in the press's basin or inside a tent; behind one you pass
// as behind a tree. An olive at its trunk (not the tips of its roots, so a row of the vineyard with an olive in it can
// still be walked), a bush over its round foot (their pictures' crops are not the catalogue's, so they had fallen to a
// prop's box: an olive's lower leaves stopped you). [re, picture w, h, x0, y0, x1, y1]
const SUN_FOOT = [
  [/Sun Olive Tree( 2)?\.png$/, 32, 48, 11, 38, 22, 47],
  [/Sun Olive Bush\.png$/, 32, 32, 3, 20, 28, 31],
  [/Sun Stall\.png$/, 32, 58, 1, 28, 31, 58],
  [/Sun Tomb\.png$/, 32, 60, 1, 29, 31, 60],
  [/Sun Wine Press\.png$/, 48, 62, 1, 21, 47, 62],
  [/Sun Tent\.png$/, 28, 41, 1, 16, 27, 41],
  [/Sun Fire Bowl( Lit)?\.png$/, 26, 44, 3, 23, 23, 44],
  [/Sun Column\.png$/, 18, 54, 2, 40, 16, 54],
  [/Sun Column Broken\.png$/, 18, 38, 2, 24, 16, 38],
  [/Sun Milestone\.png$/, 14, 33, 1, 21, 13, 33],
  [/Sun Bollard\.png$/, 10, 23, 1, 14, 9, 23],
  [/Dawn Column\.png$/, 17, 55, 1, 43, 16, 55],                  // (the Halls' own white column: its plinth)
];
// THE SUNLANDS' VINES AND SUNFLOWERS (the same pass): planted for good there, not a farm's crop, so a vine on its post
// and a sunflower on its stem stop you; you walk between the vineyard's rows, not through them (a vine's foot reaches
// the next one's, so a row has no gap to slip through). Anywhere else a crop is walked through, as it always was.
function sunPlanted(path, b) {
  const k = b.w / 16, kh = b.h / 32;
  if (/Crops\/Fall\/Grapes\.png$/.test(path) && b.h >= 24) return { x: b.x + 5 * k, y: b.y + 21 * kh, w: 6 * k, h: 11 * kh };
  if (/Crops\/Summer\/Sunflower\.png$/.test(path) && b.h >= 24) return { x: b.x + 4 * k, y: b.y + 26 * kh, w: 8 * k, h: 6 * kh };
  return null;
}
const ASH_SQUAT = /\/(Ash (Rock|Black Rock|Stump|Fallen Trunk|Ruin Stones|Ruin Corner|Ruin Columns|Plough|Haystack|Column Fallen|Beam|Brazier Fallen|Bones)|Obsidian Shard)[^/]*\.png$/;
export function solidBox(cat, path, b, o = null) {
  if (/^undead\//.test(path)) return undeadBox(path, b, o);
  // THE VIP DISTRICT (2026-10-05, version 2): its pieces are cut from the designer's reference -- no box of their own, the map's
  // `solid` zones carry the collision (design/vip/ref/build.py)
  if (/^vip\/Objects\/(Cutouts|Animated|Decals)\//.test(path)) return null;
  // the kind and the FILE name, not its folders: the pack's trees live in "Common/Shadow/"
  const top = cat.split('/')[0], low = `${cat} ${path.split('/').pop()}`.toLowerCase();
  if (b.w * b.h <= 64) return null;                                                   // specks: pebbles, petals
  if (CRITTERS.test(path)) return null;                                               // birds and insects: they fly off
  if (GROUND_PROPS.test(path) && b.w <= 32) return null;                              // a tuft, a flower, a mushroom
  if (/fruits tree\//i.test(path) && b.h >= 32) {                                     // a grown fruit tree: filed with crops, stands like a tree
    const h = Math.min(10, Math.max(6, b.h * 0.2));
    return { x: b.x + b.w * 0.32, y: b.y + b.h - h, w: b.w * 0.36, h };
  }
  if (/^(crops|effects & weather|ground tiles|items & icons|interface|world map)/.test(top.toLowerCase())) return null;
  // (a crop cut from the pack's season sheets at a frame the catalogue does not list -- the Ashlands' golden field,
  //  2026-10-14: every stalk stopped you -- is a crop all the same: walked through)
  if (/^Crops\/(Spring|Summer|Fall|Autumn|Winter)\//i.test(path)) return null;
  // the Ashlands' burned cart (px3d/furniture.py, 64 x 43): its bed and its standing wheel, not the shafts on the ground
  // nor the fallen wheel; its signpost (38 x 42): the post's foot, not the board fallen beside it
  if (/Ash Cart\.png$/.test(path)) { const k = b.w / 64, x0 = o?.flipX ? 64 - 53 : 22; return { x: b.x + x0 * k, y: b.y + b.h - 12 * (b.h / 43), w: 31 * k, h: 12 * (b.h / 43) }; }
  // the Ashlands' dry fountain: its round basin is solid zones on the map (ashlands.mjs FOUNTAIN_ROWS), not a box
  if (/Ash Fountain\.png$/.test(path)) return null;
  if (/Ash Banner( Burned| Hanging)?\.png$/.test(path)) return null;   // (the Ashlands' banners hang on a wall's face: the wall stops you, 2026-10-14)
  if (/Ash Signpost\.png$/.test(path)) { const k = b.w / 38, x0 = o?.flipX ? 38 - 23 : 16; return { x: b.x + x0 * k, y: b.y + b.h - 5, w: 7 * k, h: 5 }; }
  // (the Halls of Dawn's fountains and flower beds, refinement 8, 2026-10-17: their round basins and oval beds stop you
  //  by the map's own solid zones, laid in slabs to their shapes, not a box with corners that stopped you short)
  if (/Dawn (Fountain|Flower Bed)\.png$/.test(path)) return null;
  // (THE GREAT MUSHROOMS, 2026-10-27, the Season 0 audit: Moonmere refinement 7 set the Deep Forest's fantasy mushroom to
  //  stop one at its stem (below), but "mushroom" in its name walked it through on the next line first, and the farmer
  //  stood inside the stems of Whisperwood's and Stonepeak's tall ones. A tall one stops one at its stem now; the little
  //  ones in the grass are still walked over)
  if (/Deep Forest\/Fantasy Mushroom\.png$/.test(path) && b.h >= 24) return { x: b.x + b.w / 2 - 4, y: b.y + b.h - 7, w: 8, h: 5 };
  // (and the caves' own, the same audit: the Cave Objects pack's tall mushrooms and Glimmer Hollow's crystal tree -- 52 x
  //  97, the farmer walked up into its trunk and out of sight behind it -- stop one at the stalk, as a tree at its trunk;
  //  the horned demon's skull of the Gloom and the Vault, 73 x 61, by its jaw and the growth round it on the ground, not
  //  its horns up the wall. Bones and remains, the line below, still lie flat)
  if (/^cave\/(64|128)\/mushroom\d_/.test(path)) return { x: b.x + b.w * 0.3, y: b.y + b.h - 10, w: b.w * 0.4, h: 8 };
  if (/^cave\/128\/Demon_scull_/.test(path)) return { x: b.x + b.w * 0.26, y: b.y + b.h - 16, w: b.w * 0.5, h: 14 };
  if (/flower|grass|mushroom|lily|reed|leaves|leaf|tuft|props water|puddle|rug|carpet|stairs|ladder|mine rail/.test(low) || RUGS.test(path)) return null;   // (stairs and a ladder: climbed, not bumped into; rails: walked over)
  // (the caves' own, 2026-09-30: bones and remains lie on the floor, a web hangs, a circle is drawn on the ground;
  //  and the mine set's own web -- one stood across a passage in the Green Vein -- is brushed through too)
  if (/^mine & dungeon\/(bones & remains|webs)/.test(cat.toLowerCase()) || /magic_circle|web spider/.test(low)) return null;
  // (the caves' pack names its variants dark_shadow / light_shadow: those stand like any rock or shrine; the other
  //  packs' shadow pictures are shadows)
  if (/shadow/.test(low) && !/^(rocks & stones\/(cave crystals|stalagmites)|mine & dungeon\/cave shrines)/.test(cat.toLowerCase())) return null;
  // a mine's timber shoring (Mine/Structure.png, a frame across a tunnel, 2026-09-26: the caves): walked under;
  // a single prop stands in the way as any prop does
  if (/Mine\/Structure\.png$/.test(path) && b.w >= 32) return null;
  // the Everbloom's garden gate and its Elfgate (2026-10-14): arches you walk through, not things in your way
  if (/Elf (Garden Gate|Gate Arch)\.png$/.test(path)) return null;
  // the Ashlands' fortification (2026-10-14, px3d/fort.py): a picture for each row of the map; the walls' own cells and
  // the towers' feet are solid zones, so the pictures stop no one
  if (/Ash Fort\/Ash Fort \d+\.png$/.test(path)) return null;
  // the Ashlands' things (the eighth refinement, 2026-10-14, the designer: collisions "in a perfect way"): what lies or
  // lies on the ground with its top showing (rocks, rubble, stumps, logs, bones, glass, timbers, the hay, the plough)
  // stops you over the whole of what is drawn, less a pixel at its top, so coming at it from behind you stop at its
  // edge and never stand in it; a thorn bush over its lower two thirds, not its outer twigs. Furniture (a table, a
  // bench, a barrel, a well, a stall, the forge) and what stands tall and thin (a column, a brazier, a gravestone, a
  // tree) still at its foot: you stand behind a table or pass behind a column as behind a tree, and a room keeps room
  // to move in (the designer, the same day: rooms could not be walked about). A vent's smoke is air.
  // (design/ashlands/ashlands.mjs footOf reckons the same.)
  if (ASH_SQUAT.test(path)) return { x: b.x + 1, y: b.y + 1, w: Math.max(1, b.w - 2), h: Math.max(1, b.h - 1) };
  // (the Deeps, 2026-10-15, the same: a fallen or broken pillar, a quench trough, the long table and its benches)
  if (/Deeps (Pillar (Fallen|Broken)|Trough|Long Table)\.png$/.test(path)) return { x: b.x + 1, y: b.y + 1, w: Math.max(1, b.w - 2), h: Math.max(1, b.h - 1) };
  // (refinement 3: the throne stands on the ground it covers, its base and seat, so no one walks behind its back)
  if (/Deeps Throne\.png$/.test(path)) return { x: b.x + 3, y: b.y + b.h - 46, w: Math.max(1, b.w - 6), h: 46 };
  // (the Sunlands, 2026-10-15: the ruins' pictures, the chapel and the bridge stop you by the map's own solid and walk
  //  zones (design/sunlands/sunlands.mjs); the stone circle and the roof tiles lie on the ground; a fallen column lies
  //  across its whole picture; the dry fountain's round basin stops you over all of it but its back rim's top)
  if (/Sun (Fort\/Sun Fort (\d+|Floor)|Chapel( Building| Columns| Steps)?|Bridge|Bridge Wake|Stone Circle|Roof Tiles)\.png$/.test(path)) return null;   // (the wake: water breaking on the bridge's piers, refinement 8: swum through)
  // (refinement 9, the Sunlands reclaimed: the sheepfold's round wall stops you, and keeps its flock in, by its solid zones;
  //  the scholar's dig and the masons' cut stone lie low, so over the whole of what is drawn, as a fallen column)
  if (/Sun Sheepfold\.png$/.test(path)) return null;
  if (/Dawn Hall\/Dawn Hall \d+\.png$/.test(path)) return null;
  if (/region\/Objects\/Colosseum\//.test(path)) return null;     // (the Colosseum: its walls, stands and things stop you by the map's solid zones)      // (the Halls of Dawn's hall: its walls and columns stop you by the map's solid zones)
  if (/Scar Bridge\.png$/.test(path)) return null;
  // (the Barrowmire, 2026-10-19: every one of its things stops you by its footprint at the ground, laid as solid zones from
  //  its model's measures or its picture's foot, design/barrowmire/art/place.py; a tree at its trunk the same way)
  if (/region\/Objects\/Barrow [^/]+\.png$/.test(path)) return null;
  if (/region\/Objects\/Moon [^/]+\.png$/.test(path)) return null;          // (Moonmere's pieces, refinement 1: they stop one by the map's solid zones)
  // (Moonmere refinement 7, 2026-10-20, the designer: "if there is a place where a character can go, there shouldn't be
  //  any blocker": the pack's Deep Forest tree was read as a prop and stopped one over a box as broad as its crown; it is
  //  a tree, it stops one at its trunk; its fantasy mushroom at its stem)
  if (/Deep Forest\/Tree\.png$/.test(path)) return { x: b.x + b.w / 2 - 4, y: b.y + b.h - 8, w: 8, h: 6 };
  // (the Dreaming Fields, refinement 1, 2026-10-20: its small pale plants and glass flowers are walked through, its
  //  floating stones and turf islands hang in the air and are walked under; a pale tree stops one at its trunk, a pale
  //  shade at its plinth, a pearl pillar at its foot)
  if (/region\/Objects\/(Dream Props|Glass Flowers|Floating Stones|Turf Islands)\.png$/.test(path)) return null;
  if (/region\/Objects\/Pale Trees\.png$/.test(path)) return { x: b.x + b.w / 2 - 4, y: b.y + b.h - 7, w: 8, h: 5 };
  if (/region\/Objects\/Founder Shades\.png$/.test(path)) return { x: b.x + b.w * 0.21, y: b.y + b.h - 8, w: b.w * 0.58, h: 8 };
  if (/region\/Objects\/Dream Pillars\.png$/.test(path)) return { x: b.x + 3, y: b.y + b.h - 8, w: Math.max(2, b.w - 6), h: 7 };
  if (/Deep Forest\/Fantasy Mushroom\.png$/.test(path)) return { x: b.x + b.w / 2 - 4, y: b.y + b.h - 7, w: 8, h: 5 };
  if (/Deep Forest\/bushes\.png$/.test(path)) return { x: b.x + b.w * 0.25, y: b.y + b.h - 8, w: b.w * 0.5, h: 6 };   // (a bush at its foot, not its crown)
  // (THE DEEP FOREST'S FALLEN LOGS, 2026-10-27, the Season 0 audit, the designer: "if the player is overlapping with
  //  anything": the sheet's long logs are filed with its trees, so a log lying along the ground stopped one only at a
  //  trunk's foot in the middle of its bottom edge, and the farmer walked into Whisperwood's long hollow log and was hidden
  //  inside it. A log lies on the ground: it stops one over all it covers, less a pixel at its top, as the Ashlands' fallen
  //  trunks do. Its short logs, under a tree's height, keep the stump's rule below)
  if (/Deep Forest\/Big old Tree\.png$/.test(path) && b.h >= 24) return { x: b.x + 1, y: b.y + 1, w: Math.max(1, b.w - 2), h: Math.max(1, b.h - 1) };
  // (flat things on the ground are walked over: a piece of coral on the sand, dry grass sprigs, flat stones in the grass)
  if (/Beach\/sea coral\.png$/.test(path) || /Spring\/Ground stones\.png$/.test(path) || (/Blight Props\.png$/.test(path) && b.w <= 16 && b.h <= 16)) return null;
  // (the Black Scar's second making, 2026-10-17: a thorn tree at its trunk; brambles walked through; a spire at its
  //  foot; the throne by its dais; a fire pit by its ring of stones; a warren over its hole; the fire's pieces lie flat)
  if (/Scar Thorn Tree \d( Back)?\.png$/.test(path)) return { x: b.x + b.w / 2 - 4, y: b.y + b.h - 9, w: 8, h: 6 };   // (refinement 6: and its deeper twin)
  if (/Scar Lava\.png$/.test(path) || /Scar Eyes\.png$/.test(path)) return null;
  if (/Scar Bramble \d\.png$/.test(path)) return null;            // (the thorn forests' undergrowth: laid flat, walked over)
  // (a dead tree's trunk and the low branches it spreads along the ground, measured on each: [from, to, how high] px,
  //  mirrored when it is flipped)
  { const m = /Scar Dead Tree (\d)\.png$/.exec(path); if (m) { const [W0, x0, x1, hh] = { 1: [63, 4, 58, 14], 2: [59, 2, 41, 14], 3: [46, 1, 45, 13] }[m[1]]; const k = b.w / W0, a0 = o?.flipX ? W0 - x1 : x0; return { x: b.x + a0 * k, y: b.y + b.h - hh, w: (x1 - x0) * k, h: hh - 1 }; } }
  if (/Scar (Glass|Rock) \d\.png$/.test(path)) return { x: b.x + 1, y: b.y + 1, w: Math.max(1, b.w - 2), h: Math.max(1, b.h - 1) };   // (refinement 3: the rocks in the walls' black, as the Ashlands' were)
  if (/Scar Spire( Short)? [A-C]\.png$/.test(path)) { const d = Math.round(b.w * 0.62); return { x: b.x + b.w * 0.12, y: b.y + b.h - d, w: b.w * 0.76, h: d - 1 }; }   // (its flared foot and the stone heaved up round it, front to back: refinement 7)
  // (refinement 1: the throne, the buildings, the gate, the obelisks, the stakes and the banners stop you by their outline
  //  at the ground, laid on the map as solid zones from their pictures, art/place.py)
  if (/Scar (Throne|Temple|Hovel [A-C]|Tower|Forge|Gate|Obelisk|Stakes \d|Banner \d|Cage|Rack|Cauldron|Totem)\.png$/.test(path)) return null;
  if (/Scar Lava (Fall|Bubble|Burst)\.png$/.test(path)) return null;
  // (Frosthaven's second making, 2026-10-18: its buildings, the step, the bowl, the cairn, the caves' feet, the boulders,
  //  the benches, woodpiles, sleds, lamps and signs stop you by their whole footprints, laid as solid zones (design/
  //  frosthaven/art/place.py); a snowy tree at its trunk, a bush over its lower half)
  //  (refinement 2: every house its own, A to K, the second longhouse, and the village's things: by their footprints too;
  //  reeds and a rod left fishing are walked past)
  if (/Frost (Hall|Longhouse( B)?|Cottage [A-K]|Forge|Fishing Hut|Woodpile|Bench|Chair|Sled|Sign|Lamp|Wraith Step|Bowl|Cairn|Boulder [AB]|Ice Cave|Great Ice Cave|Fish Bucket|Snowman [AB]|Drying Rack|Stall|Well|Fence [AB]|Brazier|Ice Bear|Runestone|Notice Board|Clothesline|Handcart|Crates|Chopping Block|Snow Heap|Fallen Log|Trough|Snow Fort|Holly [AB]|Reeds [AB]|Fishing Rod|Ruin|Scarecrow|Broken Fence|Watchtower|Tent|Campfire|Fur Rack)\.png$/.test(path)) return null;
  if (/Frost Tree [A-D]\.png$/.test(path)) return { x: b.x + b.w / 2 - 9, y: b.y + b.h - 10, w: 18, h: 9 };   // (its trunk and the snow heaped at its foot)
  // (Frosthaven refinement 5: the pack's older pine sheet is filed as an older sheet, not a tree, and stood as a prop, its
  //  whole lower half; it is a tree: its trunk, as the pack's own pines)
  if (/Objects\/Tree\/Old\/Common\/Pine Tree copiar\.png$/.test(path)) return { x: b.x + b.w * 0.32, y: b.y + b.h - 10, w: b.w * 0.36, h: 10 };
  if (/Frost Pine Snowed [AB]\.png$/.test(path)) return { x: b.x + b.w * 0.32, y: b.y + b.h - 10, w: b.w * 0.36, h: 10 };   // (the pack's pines with snow laid on: refinement 7)
  if (/Frost Bush [AB]\.png$/.test(path)) return { x: b.x + 2, y: b.y + b.h * 0.45, w: Math.max(1, b.w - 4), h: b.h * 0.5 };   // (the fire alive: drawn on the fire, nothing to bump)
  if (/Scar Fire Pit\.png$/.test(path)) return { x: b.x + 3, y: b.y + b.h - 22, w: b.w - 6, h: 18 };
  if (/Scar Warren\.png$/.test(path)) return { x: b.x + 4, y: b.y + b.h * 0.3, w: b.w - 8, h: b.h * 0.62 };                    // (the Black Scar's bridge over the fire: walked, by its walk zone)
  if (/Sun (Column Fallen|Dig|Cut Stones)\.png$/.test(path)) return { x: b.x + 1, y: b.y + 1, w: Math.max(1, b.w - 2), h: Math.max(1, b.h - 1) };
  const sf = SUN_FOOT.find(([re]) => re.test(path));
  if (sf) { const [, pw, ph, x0, y0, x1, y1] = sf, kx = b.w / pw, ky = b.h / ph, L = o?.flipX ? pw - x1 : x0; return { x: b.x + L * kx, y: b.y + y0 * ky, w: (x1 - x0) * kx, h: (y1 - y0) * ky }; }
  if (/Sun Fountain\.png$/.test(path)) return { x: b.x + 2, y: b.y + 10, w: Math.max(1, b.w - 4), h: Math.max(1, b.h - 10) };
  if (/Ash Thorns[^/]*\.png$/.test(path)) return { x: b.x + b.w * 0.12, y: b.y + b.h * 0.35, w: b.w * 0.76, h: b.h * 0.65 };
  // the Ashlands' towers (2026-10-14): their round foot only (each drawn in one frame 70 x 112, the foot's front at row
  // 104: design/ashlands/ash3d.json), not the frame round it, which would narrow the gates between them
  if (/Ash Tower[^/]*\.png$/.test(path)) { const kx = b.w / 70, ky = b.h / 112; return { x: b.x + (35 - 23) * kx, y: b.y + 80 * ky, w: 46 * kx, h: 24 * ky }; }
  // the Ashlands' walls (2026-10-14): a wall piece is its tile and the face drawn above it; only its tile stops you
  if (/Ash Wall (City|Low)\.png$/.test(path)) return { x: b.x, y: b.y + b.h - 16 * (b.h / (o?.sh || b.h)), w: b.w, h: 16 * (b.h / (o?.sh || b.h)) };
  // an elven tree house (the Everbloom, 2026-10-14, the collision pass): its whole foot, from the left stilt to the
  // stair's last step, so you walk round it, not between its stilts or up a stair that leads nowhere
  if (/Elf Tree House\.png$/.test(path)) {
    const k = b.w / 157, x0 = (o?.flipX ? 157 - 156 : 42) * k;
    return { x: b.x + x0, y: b.y + b.h - 12 * (b.h / 246), w: 114 * k, h: 12 * (b.h / 246) };
  }
  // the great tree of gold leaves (the Everbloom's, and the Halls of Dawn's small island, 2026-10-16, the collision pass):
  // its trunk is broad and its roots spread, wider than a tree's usual foot; you stood on them. Its trunk's foot and roots
  // (95 x 126: columns 28-78, rows 112-124)
  if (/Fairy Tree Gold\.png$/.test(path)) { const kx = b.w / 95, ky = b.h / 126, x0 = o?.flipX ? 95 - 78 : 28; return { x: b.x + x0 * kx, y: b.y + 112 * ky, w: 50 * kx, h: 12 * ky }; }
  // an elven lantern post (the Everbloom, 2026-10-14): its slim post's foot, not the width of its two crooks
  if (/Elf Lantern Post\.png$/.test(path)) return { x: b.x + b.w / 2 - 4, y: b.y + b.h - 5, w: 8, h: 5 };
  // (the Halls of Dawn's white blossom trees, art/dawn_tree.py, the fourth making: the trunk and its roots, their foot
  //  3 px above the picture's bottom middle; you walk behind the crown)
  if (/Dawn Blossom Tree( 2)?\.png$/.test(path)) return { x: b.x + b.w / 2 - 9, y: b.y + b.h - 10, w: 18, h: 8 };
  // (refinement 6, the Halls' own decoration) a rose bush as the pack's bushes; a lantern at its slim post's foot; an
  // urn at its foot; the garlanded column as the white one (the flower bed's rule stands above the flowers' own)
  if (/Dawn Rose Bush\.png$/.test(path)) return { x: b.x + b.w * 0.2, y: b.y + b.h * 0.55, w: b.w * 0.6, h: b.h * 0.45 };
  if (/Dawn Lantern\.png$/.test(path)) return { x: b.x + b.w / 2 - 4, y: b.y + b.h - 6, w: 8, h: 6 };
  if (/Dawn Urn\.png$/.test(path)) return { x: b.x + 2, y: b.y + b.h - 12, w: b.w - 4, h: 12 };
  if (/Dawn Column Garland\.png$/.test(path)) return { x: b.x + 1, y: b.y + b.h - 12, w: b.w - 2, h: 12 };
  // (THE TOWN'S FENCES, 2026-10-28, the launch-eve walk of the world: the pack's Fence Wood and Fence Stone pieces, 16 px
  //  each and in no catalogue, stopped one over their lower half as any prop, 8 px. A fence running north and south is a
  //  stack of them, and between each two was a gap exactly as high as the feet, so at just the right height the farmer
  //  walked through the side of a fenced garden. A pixel more of each closes it; a gate a tile wide stays a gate)
  if (/Fence and Bridge\/Fence (Wood|Stone)\.png$/.test(path)) { const h = 9 * (b.h / 16); return { x: b.x + 1, y: b.y + b.h - h, w: Math.max(1, b.w - 2), h }; }
  const inset = (x0, y0, x1, y1) => ({ x: b.x + x0, y: b.y + y0, w: Math.max(1, b.w - x0 - x1), h: Math.max(1, b.h - y0 - y1) });
  if (top === 'Trees & plants') {
    if (/bush|shrub/.test(low)) return inset(b.w * 0.2, b.h * 0.55, b.w * 0.2, 0);
    if (/stump|log|fallen trunk/.test(low) || (/tree/.test(low) && b.h < 24)) return inset(1, b.h * 0.4, 1, 0);   // a stump cut from a tree sheet too
    if (/tree/.test(low)) {                                                           // the trunk
      const h = Math.min(10, Math.max(6, b.h * 0.2));
      return inset(b.w * 0.32, b.h - h, b.w * 0.32, 0);
    }
    return null;                                                                      // other plants
  }
  if (top === 'Buildings') return inset(2, b.h * 0.45, 2, 0);                        // the walls' footprint
  if (top === 'Fences, walls & bridges') return inset(1, Math.min(3, b.h * 0.2), 1, 0);
  if (top === 'Animals' || top === 'Townsfolk & characters') return inset(b.w * 0.2, b.h * 0.6, b.w * 0.2, 0);
  if (top === 'Furniture & interior') return inset(1, b.h * 0.3, 1, 0);                // seen from above: all but its back edge
  const h = Math.min(b.h * 0.5, Math.max(6, b.w * 0.7));                             // a prop: its lower part
  return inset(1, b.h - h, 1, 0);
}

/** The creatures the rules know (rules.js ENEMIES): a blow from one is weighed by the server (commands.js hurt). */
const ENEMY_IDS = new Set(Object.keys(FOES));
/** A wait as a clock (the pot's timer, drawPotTimers): 1:05:09, or 7:09 under the hour. */
function clockOf(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60, two = (v) => String(v).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

export class Play {
  constructor(app) {
    this.app = app;
    this.on = false;
    this.keys = new Set();
    this.onKey = (e) => this.key(e, true);
    this.offKey = (e) => this.key(e, false);
  }

  /* ------------------------------------------------------------ world */

  /** Read the map once: where water is, what is solid, what floors water over. */
  build() {
    const app = this.app, doc = app.doc, T = doc.tileSize, W = doc.width, H = doc.height;
    // THE PLACE LEFT, KEPT (2026-10-22, the designer: going in and out of a building "feels stuck"): what was made of the
    // map being left waits with it (gamemain.js openMap keeps the map itself), and coming back takes it all up again --
    // its ground, walls and water, its creatures and people -- instead of making it anew (the town: 0.6 s, every time
    // one came out of a building)
    const back = app.game && this.parked?.doc === doc ? this.parked : null;
    if (app.game && this.made && this.made !== doc) this.parked = { doc: this.made, ...Object.fromEntries(PARKED.map((k) => [k, this[k]])) };
    else if (!app.game) this.parked = null;
    this.made = doc;
    // THE COLOSSEUM'S WAVES (2026-10-26, game/colosseum.js): on its map only, made anew each time one comes in
    this.colosseum?.leave(); this.colosseum = Colosseum.of(this, doc);
    // THE DUNGEON (2026-10-26, game/dungeon.js): its traps, its gate and lever, on its levels only
    this.dungeon?.leave(); this.dungeon = Dungeon.of(this, doc); this.dungeon?.arrived();
    // THE MIRROR POND'S CHEST (2026-10-27, game/grotto.js): in the Grotto under Mirror Pond, once its creatures are dead
    this.grotto?.leave(); this.grotto = Grotto.of(this, doc);
    if (!this.dungeon && app.game !== undefined) claimDelve(this);   // (out of the dungeon: the run paid -- game/dungeon.js)
    // THE VIP QUARTER, out of doors and in (2026-10-08): the interface in its own cream, blue and turquoise (theme.js vip;
    // its windows too: .emp.vip) -- the player's own theme again outside it
    this.vipHere = doc.region === 'vip' || /^interior_vip_/.test(doc.id ?? '');
    this.gameUi?.setPlaceTheme?.(this.vipHere ? 'vip' : null);
    this.overlay?.classList.toggle('vip', this.vipHere);
    if (back) { this.takeUp(back); this.dungeon?.foesSet(this.combat, false); return; }
    this.mapW = W * T; this.mapH = H * T;
    // (the places beyond, in the game: zones tagged outside -- clampCam; the editor's Play shows the whole map)
    this.outside = app.game ? (doc.zones ?? []).filter((z) => (z.tags ?? []).includes('outside')).map((z) => ({ x: z.x, y: z.y, w: z.w ?? z.width, h: z.h ?? z.height })) : [];
    // THE TOWN A PLACE OF ITS OWN AGAIN (2026-10-22, the designer: "town should be a separate area in on itself, from all
    // four directions ... the system we had in the playtest was much better"): on a map of several regions (zones tagged
    // region:<r>), each region's box is an AREA, shown alone as a map of its own was -- the view keeps within the one the
    // farmer stands in, the rest is not drawn, and its borders are closed but at their roads (zones tagged solid). Walking
    // a road over a border is going through a door: the view comes up in the next place.
    this.areas = null; this.area = null; this.slide = null;
    if (app.game) {
      const by = new Map();
      for (const z of doc.zones ?? []) {
        const r = (z.tags ?? []).find((t) => t.startsWith('region:'))?.slice(7);
        if (!r) continue;
        const x1 = z.x + (z.w ?? z.width), y1 = z.y + (z.h ?? z.height), b = by.get(r);
        if (!b) by.set(r, { id: r, x0: z.x, y0: z.y, x1, y1 });
        else { b.x0 = Math.min(b.x0, z.x); b.y0 = Math.min(b.y0, z.y); b.x1 = Math.max(b.x1, x1); b.y1 = Math.max(b.y1, y1); }
      }
      if (by.size > 1) this.areas = [...by.values()];
    }
    this.buildGround();
    // WHAT MOVES: animated tiles, and everything on the map that lives or sways (game/)
    // (under the open sky: not a room, and not a cave -- the same test as the sky's own, game/sky.js -- where by night
    //  and in the rain nobody is out: keptIn, kept fresh by update())
    const outdoors = this.outdoors = !/^interior/i.test(doc.id) && doc.region !== 'interiors' && !(doc.dark ?? doc.region === 'caves');
    // (THE HALLS OF DAWN, 2026-10-16: a realm of light above the clouds; no night falls there and no rain)
    this.timeless = doc.region === 'halls';
    this.keptIn = outdoors && !this.folkOut && !this.timeless && !fixedSky(doc) ? keptIn(gameNow()) : null;      // (folkOut: the admin's desk keeps them out; the VIP Quarter keeps its own fair hour)
    this.kidsHidden = null;                                          // (the children who cannot walk: update() decides)
    // (a poison or a burn wears off in the town, at home, in a room: nothing can strike you there, and the rules let
    //  nobody fall there -- commands.js wake)
    if (isSafePlace(doc)) this.status = {};
    this.tiles = new TileAnims(app, doc);
    this.world = new AnimWorld(doc, {
      image: (p) => app.assets.image(p), files: this.files ??= new Set(app.assets.fileByPath.keys()),
      pixels: (p) => pixelsNow(packURL(p)),
      isWater: (x, y) => this.isWater(x, y), blocked: (x, y) => this.solid(x, y), kidsAway: () => this.kidsAway(),
      gateFrame: (o) => this.colosseum?.gateFrame(o) ?? 0,              // (the Colosseum's portcullises: game/colosseum.js)
      crowdFrame: () => this.colosseum?.crowdFrame() ?? 0,              // (...and its audience)
      dungeonFrame: (o) => this.dungeon?.dungeonFrame(o) ?? o.frame ?? 0,   // (the dungeon's traps, its gate, its lever: game/dungeon.js; off its levels a picture's own frame, the Dungeon Steps' raised gate)
      pond: (x, y) => this.inPond(x, y),
      // (the children walk home by the nearest road, round what is in the way; those who cannot walk go out of sight)
      route: (a, b) => this.route(a, b), exitPoint: (x, y) => this.exitPoint(x, y, { road: true }), kidsHidden: () => !!this.kidsHidden,
      // where a bird may come down: the base ground (the town's grass), not a road, path, field or water painted over it
      openGround: (x, y) => x >= 0 && y >= 0 && x < this.mapW && y < this.mapH && !!this.bare[Math.floor(y / T) * W + Math.floor(x / T)],
      // (2026-09-27, the designer: "there shouldn't be any bird flying around in any cave")
      outdoors,
      rain: () => (this.skyDraw?.on && !this.skyDraw.dry ? this.sky?.rain ?? 0 : 0),     // (none on the Ashlands: game/sky.js dry)
      snow: () => (this.skyDraw?.on ? this.sky?.snow ?? 0 : 0),           // (Frosthaven's snowfall, always some: weather.js snowAt)
      wind: () => this.sky?.wind ?? 1,                                     // (which way it blows: weather.js windAt)
      keptIn: () => !!this.keptIn,
      // (the world's own sound, a crow or a gull taking off: at the Ambience slider, as the fish's leaps and the birds' song
      //  are -- 2026-10-28, the launch-eve sound audit: with Ambience at nothing the wings still beat at full)
      cue: (n, o) => this.sound?.cue(n, { ...o, gain: (o?.gain ?? 1) * (this.sound?.amb ?? 1) }),
      // (Frosthaven alive: who of the folk is out, where, walking or not -- their footprints, their breath: frostfx.js)
      walkers: () => (this.folk?.people ?? []).filter((p) => !p.hidden && !p.unseen).map((p) => ({ id: p.id, x: p.x, y: p.y, facing: p.facing, moving: !!p.path })),
    });
    this.world.preload();
    // THE LAKE'S FISH (2026-10-13, game/fish.js): a zone tagged fishlife:<n> has its fish, swimming under the shores'
    // and the ripples' tiles (drawn just before the first of them) and leaping out over the water
    this.fishLife = new FishLife(doc, { water: (cx, cy) => cx >= 0 && cy >= 0 && cx < W && cy < H && !!this.water[cy * W + cx] && !this.wall[cy * W + cx], image: (p) => app.assets.image(p), cue: (n, at) => this.sound?.cue(n, { at, gain: this.sound.amb }) });   // (and the bay's dolphins, a zone tagged dolphins, 2026-10-20)
    if (!this.fishLife.pools.length) this.fishLife = null;
    // THE FIRE UNDER THE ASH (2026-10-14, game/embers.js): the Ashlands' cracks, vents, pit and braziers glow and throw sparks
    this.embers = new Embers(doc);
    if (!this.embers.any) this.embers = null;
    const tileLayers = doc.layers.filter((l) => l.type === 'tiles' && l.visible);
    this.fishUnder = this.fishLife ? (tileLayers.find((l) => /^(Banks|Ripples)$/i.test(l.name ?? '')) ?? tileLayers.at(-1)) : null;
    // WHAT A PLAYER WORKS (game/, by rules.js): their own fields, the trees and rocks, the fights
    const image = (p) => app.assets.image(p);
    this.farm = new Farm(doc, image);
    this.nodes = new Nodes(doc);
    this.abyss = Abyss.of(doc);                                      // what lives in a chasm: eyes in the dark, mist rising (game/abyss.js)
    this.light = new CaveLight(doc);                                 // a cave's dark, and its lights (game/cavelight.js)
    (this.magic ??= new Magic()).clear();                            // the quests' magic, this map's only (game/magic.js)
    this.skyDraw = new Sky(doc);                                    // outdoors: the hour's light, the lamps, the rain (game/sky.js)
    this.glade = new Glade(doc, { isWater: (x, y) => this.isWater(x, y), solid: (x, y) => this.solid(x, y) });   // a place of wonder (game/glade.js)
    this.twelve = doc.id === 'dreaming_fields' ? new Twelve(this, doc) : null;   // the twelve round the old pavement (Book One, chapter 16)
    this.grey = Grey.for(this, doc);                                    // the story's grey: the orchard's trees, the deep wood (game/grey.js)
    this.pet ??= new Pet((p) => this.app.assets.image(p));             // a holder's pet, following (game/pet.js)
    (this.scenes ??= new Scenes(this)).stop();                        // the story's moments and the emotes over heads (game/scenes.js)
    // (walk: water too -- for the kinds that keep to the land, def.ground: the undead, 2026-10-02)
    // (keepOut: the town itself, its zones tagged region:bloomshire -- no creature follows you in)
    const town = (doc.zones ?? []).filter((z) => (z.tags ?? []).includes('region:bloomshire'));
    this.combat = new Combat({ image, solid: (x, y) => this.solid(x, y), walk: (x, y) => this.solid(x, y) || this.isWater(x, y), cue: (n, o) => this.sound?.cue(n, o),
      bossWord: (e, kind, family) => this.bossHint(e, kind, family),     // (a boss taking a weapon softly: what to try, said once -- rules.js BOSS_WEAPONS)
      keepOut: town.length ? (x, y) => town.some((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) : null,
      // (where a chase ends: the town, or the water -- swimming, or out on it; rules.js AGGRO, 2026-10-23)
      shelter: (x, y) => town.some((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) || this.hero?.mode === 'swim' || this.isWater(x, y),
      // (a creature weakened by a shadow weapon's heavy attack hits softer: rules.js HEAVY weak -- and the blow told to the rules
      //  is the softer one too, 2026-10-28, the combat audit: the rules weigh the blow they are told, which was the creature's
      //  whole one, so the weakening softened nothing; the server takes the lesser of what it is told and what the creature has)
      hurtHero: (n, from, fx) => { const k = from?.weakT > 0 ? HEAVY.weak.blow : 1; return this.hurtHero(Math.max(1, Math.round(n * k * this.foeScale())), from, fx, n * k); }, killed: (e) => this.killed(e), shake: (sec) => this.shakeScreen(sec, 3),
      foeScale: () => this.foeScale(),                                  // (a beginner's foes: rules.js EASY_FOES)
      foe: (ev, e, at) => this.sound?.foe(ev, e, at) });                // (each enemy's own voice: game/sound.js FOE_SFX)
    // THE HEAVY ATTACKS (game/heavy.js): what was in flight goes with the map; the wait goes on
    (this.heavy ??= new Heavy({ image, enemies: () => this.combat?.enemies ?? [], box: (e) => this.combat?.boxOf(e) ?? null,
      hit: (e, power, from, status) => this.heavyHit(e, power, from, status), shake: (sec) => this.shakeScreen(sec, 2),
      cue: (n, o) => this.sound?.cue(n, o) })).clear();                // (the arrow rain landing, the circle erupting: heard, 2026-10-27)
    this.heavyAim = null;
    // (the enemies are set down at the end, once this map's walls are known: see below)
    this.orders = new Map();                                        // each layer's draw order, sorted once (draw)
    this.spans = new Map();                                          // ... its feet in that order, its tallest thing, its floors (draw)
    this.standing = new Map();                                       // ... and a room layer's furniture, bar its floors
    // THE PEOPLE: the townsfolk where their zones put them (game/npcs.js)
    this.grid = null;                                                // (the walkable cells: made when someone first walks)
    // (none of them out by night or in the rain: folkIn)
    // (refinement 6, the Night Court: a marsh light that leads to a cache now and then by night; where the Night Stalker
    //  stands on the darkest nights -- a zone tagged stalker)
    this.marshGuide = new MarshGuide(doc, { route: (a, b) => this.route(a, b), taken: (id) => lootTaken(this.localSave(), id) });
    if (!this.marshGuide.on) this.marshGuide = null;
    { const z = (doc.zones ?? []).find((q) => (q.tags ?? []).includes('stalker')); this.stalkerAt = z ? { x: z.x + (z.w ?? z.width) / 2, y: z.y + (z.h ?? z.height) / 2 } : null; this.witnessT = 0; }
    this.folk = new Townsfolk(doc, { image, files: this.files, shown: (z) => this.theatreShows(z) || (NIGHT_FOLK.has(npcOf(z)) ? this.folkIn() === 'night' : (!this.folkIn() || STAY_OUT.has(npcOf(z)) || this.questFolk().has(npcOf(z)))) && shownFor(z, this.localSave()),
      route: (a, b) => this.route(a, b), exit: (x, y) => this.exitPoint(x, y), home: (p) => this.homeDoor(p),
      // (a chore, npcs.js: the woodcutter's trees, drawn by the world -- frostfx.js; is a point on screen)
      work: this.world.frost ? { treeAt: (x, y, f) => this.world.frost.treeAt(x, y, f), chop: (o) => { this.world.frost.chop(o); this.sound?.cue?.('chop', { at: { x: o.x + o.w / 2, y: o.y + o.h } }); },
        fell: (o, d) => { this.world.frost.fell(o, d); this.sound?.cue?.('treeFall', { at: { x: o.x + o.w / 2, y: o.y + o.h } }); }, take: (o) => this.world.frost.take(o), regrow: (o) => this.world.frost.regrow(o), felled: (o) => this.world.frost.felled(o),
        seen: (o) => { const v = this.world.frost.view; return !!v && o.x + o.w > v.x0 && o.x < v.x1 && o.y + o.h > v.y0 && o.y < v.y1; } } : null });
    this.folk.preload();
    // where the rules think you are: the map you are on (the game's session keeps the server told)
    this.localSave().where = doc.id;
    for (const p of [HAND.image, 'UI/Bars.png', 'cv2/Tilesets/tilled_dirt.png', 'cv2/Tilesets/wet_tilled_dirt.png', 'Icons/RPG icons/Extras/Wood.png', 'Icons/RPG icons/Extras/Stones.png']) image(p);
    // WHERE YOU MAY SWIM: a body of water (its cells joined side to side, under piers and bridges
    // too) that a zone tagged "swim" touches -- Moonmere's lake, the wood's pools -- where it is WIDE (rules.js
    // wideWater, 2026-09-27: not up a stream or a canal); any other water stops you
    this.body = new Int32Array(W * H).fill(-1); this.swimmable = new Set();
    let nb = 0;
    for (let i = 0; i < W * H; i++) {
      if (!this.water[i] || this.body[i] >= 0) continue;
      const q = [i]; this.body[i] = nb;
      while (q.length) {
        const c = q.pop(), cx = c % W, cy = (c / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy, n = ny * W + nx;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && this.water[n] && this.body[n] < 0) { this.body[n] = nb; q.push(n); }
        }
      }
      nb++;
    }
    for (const z of doc.zones ?? []) {
      if (!(z.tags ?? []).includes(SWIM_TAG)) continue;
      for (let y = Math.floor(z.y / T); y < Math.ceil((z.y + z.h) / T); y++)
        for (let x = Math.floor(z.x / T); x < Math.ceil((z.x + z.w) / T); x++) { const b = this.body[y * W + x]; if (b >= 0) this.swimmable.add(b); }
    }
    this.wide = wideWater(this.water, W, H);
    // WHAT GROWS WILD HERE, known by its look (rules.js WILD): each one pickable, gone a while once picked
    this.wilds = new Map();
    for (const l of doc.layers) if (l.type === 'objects' && l.visible) for (const o of l.objects) { const k = wildOf(o); if (k) this.wilds.set(o, k); }
    this.buildSolids();
    // a wilderness map's enemies -- never the town's (rules.js isSafePlace) -- each on open ground of THIS map
    // (2026-09-26: set down before the walls were known, they were checked against the last map's)
    // (a spot whose creature fell and is not back yet stays empty: rules.js RESPAWN -- slainNow)
    this.combat.spawnZones(doc, this.respawnsHere(doc) ? (slot) => this.slainNow(slot) : null);
    this.dungeon?.foesSet(this.combat, true);                       // (its creatures counted, its guardian behind the gate: game/dungeon.js)
    // the enemies' pictures: in the editor for its practice slime (G); in the game only where enemies are
    // (the town and home are safe: two dozen files a first visit never needed)
    if (!app.game || this.combat.enemies.length) this.combat.preload();
    this.gridAhead();
  }

  /** A map come back to (build): what was made of it taken up again, and made fresh only what may have changed while one
   *  was away -- the fields, trees and rocks as the save has them now, who of the people is out, the hour's keeping in. */
  takeUp(k) {
    const app = this.app, doc = app.doc;
    for (const key of PARKED) this[key] = k[key];
    this.area = null; this.slide = null; this.hopLift = 0; this.kidsHidden = null;
    this.keptIn = this.outdoors && !this.folkOut && !this.timeless && !fixedSky(doc) ? keptIn(gameNow()) : null;
    if (isSafePlace(doc)) this.status = {};
    this.farm = new Farm(doc, (p) => app.assets.image(p));
    this.nodes = new Nodes(doc, { trees: k.nodes.trees, rocks: k.nodes.rocks, wild: k.nodes.wild });
    (this.magic ??= new Magic()).clear();
    this.heavy?.clear(); this.heavyAim = null;
    (this.scenes ??= new Scenes(this)).stop();
    this.folk?.refresh(true);
    this.combat?.regroup?.();                                         // (whoever followed you to its doors went home meanwhile)
    this.localSave().where = doc.id;
    this.gridAhead();
  }

  /** THE GROUND, read from the tiles: where water is and where rock is (the top-most painted tile of a cell decides),
   *  a cliff's rim over dry ground, the rock under a waterfall's picture. (Out of build() on 2026-10-20 so the editor's
   *  Blockers tool reads the map exactly as Play does.) */
  buildGround() {
    const app = this.app, doc = app.doc, T = doc.tileSize, W = doc.width, H = doc.height;
    this.mapW = W * T; this.mapH = H * T;
    // THE GROUND: the top-most painted tile of a cell decides it. Water blocks; a
    // pier on a layer above it does not (its tile is on top, and it is no ground).
    const tiles = doc.layers.filter((l) => l.type === 'tiles' && l.visible);
    this.water = new Uint8Array(W * H);
    this.wall = new Uint8Array(W * H);
    this.bare = new Uint8Array(W * H);                       // only the base ground shows: nothing painted over it
    const rims = [];
    this.road = new Uint8Array(W * H);                       // a road or a path on top (footsteps on stone, sound.js)
    // (what each kind of tile is, worked out once a kind and not once a square -- 2026-10-22, the designer: "much more
    //  smoother": the town's 163,000 squares had each looked their tileset up again, and its tests)
    const kinds = new Map();
    const kindOf = (g) => {
      let q = kinds.get(g);
      if (q) return q;
      // THE UNDEAD LANDS (2026-10-02): no blob terrains there -- their tiles say what they are (game/undeadtiles.js):
      // the toxic fill is water, a crystal face is rock, and ripples and details are seen through
      const hitU = resolveGid(doc, g), u = hitU?.ts?.image?.startsWith('undead/') ? undeadClass(hitU) : null;
      // (the joined world's falls, ripples and depth, 2026-10-13: pictures over the ground, not ground -- a fall
      //  is the cliff and the stream it is drawn over, so nobody walks down one or up the rock beside it)
      if (u === 'see') q = { see: 'undead' };
      else if (SEE_THROUGH.test(hitU?.ts?.image ?? '')) q = { see: 'over' };
      else if (u) q = { u, water: u === 'water' ? 1 : 0, wall: u === 'rock' ? 1 : 0 };
      else {
        const t = app.terrainOfGid(g), cliff = cliffKind(doc, g);
        q = { water: t && !t.road && /water|beach animations|lava|cloud ground/i.test(`${t.image} ${t.sheetName ?? ''}`) ? 1 : 0,   // (Moonmere's clear water is the beach set's; the Black Scar's fire, 2026-10-15, is walked into no more than water, nor the Halls of Dawn's sea of clouds)
          wall: isHouseWall(doc, g) || cliff === 'rock' || isPit(doc, g) ? 1 : 0, rim: cliff === 'rim', road: t?.road ? 1 : 0 };
      }
      kinds.set(g, q);
      return q;
    };
    for (let i = 0; i < W * H; i++) {
      let undeadOnly = false;
      for (let k = tiles.length - 1; k >= 0; k--) {
        const g = tiles[k].data[i];
        if (!g) continue;
        const q = kindOf(g);
        if (q.see === 'undead') { undeadOnly = true; continue; }
        if (q.see) continue;
        if (q.u) {
          this.water[i] = q.water; this.wall[i] = q.wall;
          this.bare[i] = 0; this.road[i] = 0; undeadOnly = false;
          break;
        }
        this.water[i] = q.water; this.wall[i] = q.wall;
        if (q.rim) rims.push(i);
        this.bare[i] = k === 0 && !q.water && !q.road ? 1 : 0;
        this.road[i] = q.road;
        undeadOnly = false;
        break;
      }
      // (the undead lands: a cell nothing decided is their plain floor -- open ground, where a crow may land)
      if (undeadOnly && !this.water[i] && !this.wall[i] && !this.road[i] && doc.region === 'undead') this.bare[i] = 1;
    }
    for (const i of rims) {                                   // a cliff's rim over dry ground stops you; by water it is a shore
      const x = i % W, y = (i - x) / W, wet = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && this.water[yy * W + xx];
      if (!wet(x, y - 1) && !wet(x + 1, y) && !wet(x, y + 1) && !wet(x - 1, y)) this.wall[i] = 1;
    }
    // WATERFALLS (2026-10-07, players: Moonmere's cascade could be swum up into Marven's pool, and the strip of land
    // beside it, under the cascade's picture, walked up): a waterfall is water falling down a cliff -- nobody swims up
    // or down it (canSwim), and the land under its picture is the rock it draws. The pool is reached by its stairs
    this.falls = [];
    for (const layer of doc.layers) if (layer.type === 'objects' && layer.visible) for (const o of layer.objects) {
      if (!/waterfall/i.test(String(o.asset ?? ''))) continue;
      const f = o.rot ? bounds(o) : { x: o.x, y: o.y, w: o.w, h: o.h };
      this.falls.push(f);
      // (a cell is under it when its middle is)
      for (let y = Math.ceil(f.y / T - 0.5); y <= Math.floor((f.y + f.h) / T - 0.5); y++)
        for (let x = Math.ceil(f.x / T - 0.5); x <= Math.floor((f.x + f.w) / T - 0.5); x++)
          if (x >= 0 && y >= 0 && x < W && y < H && !this.water[y * W + x]) this.wall[y * W + x] = 1;
    }
  }

  /** THE THINGS ON IT: what stops you (each thing's box, the solid zones), what floors water or rock over (bridges,
   *  piers, walk zones, stepping stones), the designer's walk-here zones, and the ground things under your feet. */
  buildSolids() {
    const app = this.app, doc = app.doc;
    // THE THINGS ON IT
    this.solids = []; this.floors = []; this.flatThings = new Set();
    for (const layer of doc.layers) {
      if (layer.type !== 'objects' || !layer.visible) continue;
      // a layer laid flat stops no one -- but a bridge's planks laid there still carry you over the water
      // (2026-09-26: the caves lay theirs on the Floor layer)
      if (FLAT_LAYER.test(layer.name ?? '')) { for (const o of layer.objects) if (FLOOR.test(String(o.asset ?? '')) && !this.elfBridge(o)) this.floors.push(o.rot ? bounds(o) : { x: o.x, y: o.y, w: o.w, h: o.h, o }); continue; }
      for (const o of layer.objects) {
        if (this.world?.byObject?.has(o) && !this.world.byObject.get(o).stays) continue;   // creatures and wanderers move out of their spot
        const b = o.rot ? bounds(o) : { x: o.x, y: o.y, w: o.w, h: o.h };
        const path = String(o.asset ?? '');
        if (FLOOR.test(path) && this.elfBridge(o)) continue;
        if (FLOOR.test(path)) {
          // a bridge or a pier: its deck floors the water -- the planks it draws, not the posts and the water painted
          // under its front edge (deckAt); a bridge's railings stop you
          this.floors.push(o.rot ? b : { ...b, o });
          // (the joined map's bridges are laid in narrow slices of the pack's Bridge.png, each taller than it is wide: they
          //  run east and west, their railings top and bottom, not down every slice -- 2026-10-20, Moonmere refinement 1)
          if (FOREST_BRIDGE.test(path) && o.sh === 51 && !o.rot) {
            // (THE FOREST BRIDGES' FRONT RAILINGS, 2026-10-27, the designer: they were stood on. Every slice of the pack's
            //  picture laid on the maps is 51 px tall, its back railing rows 0 to 12, its deck 13 to 30 and its front
            //  railing 31 to 50; only the bottom seventh had stopped you. Now the deck alone is walked)
            const k = b.h / 51, [top, front] = o.flipY ? [51 - 31, 51 - 13] : [13, 31];
            this.solids.push({ x: b.x, y: b.y, w: b.w, h: top * k }, { x: b.x, y: b.y + front * k, w: b.w, h: b.h - front * k });
          } else if (!/beach/i.test(path) && b.h > b.w * 1.5 && !FOREST_BRIDGE.test(path)) {
            // (a bridge running north and south -- the Everbloom's avenue bridge, 2026-10-14: its railings are its sides)
            const s = Math.round(b.w * 0.17);
            this.solids.push({ x: b.x, y: b.y, w: s, h: b.h }, { x: b.x + b.w - s, y: b.y, w: s, h: b.h });
          } else if (!/beach/i.test(path) && b.h > 30) {
            this.solids.push({ x: b.x, y: b.y, w: b.w, h: Math.round(b.h * 0.22) });
            this.solids.push({ x: b.x, y: b.y + b.h - Math.round(b.h * 0.14), w: b.w, h: Math.round(b.h * 0.14) });
          }
          continue;
        }
        // the Everbloom's two rose gates (2026-10-14, the collision pass): you walk through the arch, never through
        // its posts and their planters ([x0, x1, y0] of each post's foot in the picture, its bottom the picture's)
        const posts = GATE_POSTS.find(([re]) => re.test(path));
        if (posts && !o.rot && o.block === undefined) {
          const [, pw, ph, list] = posts, kx = b.w / pw, ky = b.h / ph;
          for (const [x0, x1, y0] of list) {
            const L = o.flipX ? pw - x1 : x0;
            this.solids.push({ x: b.x + L * kx, y: b.y + y0 * ky, w: (x1 - x0) * kx, h: b.h - y0 * ky, o });
          }
          continue;
        }
        // (THE DESIGNER'S OWN SAY, 2026-10-20, the editor's Blockers tool: a thing set to stop nobody, or to stop one over
        //  a box the designer drew, o.block, in px from its top left corner)
        const e = app.assets.entryForObject(o);
        const box = o.block === 'none' ? null : o.block ? { x: o.x + o.block.x, y: o.y + o.block.y, w: o.block.w, h: o.block.h }
          : (doc.region === 'sunlands' && sunPlanted(path, b)) || solidBox(e?.cat ?? '', path, b, o);
        if (box) { box.o = o; this.solids.push(box); }
        // (GROUND THINGS UNDER YOUR FEET, the same day, the designer: "those things need to be under the player, not over
        //  the player": a small thing nobody is stopped by, a tuft, a flower, a stone in the grass, is under the feet of
        //  whoever walks over it (draw); o.flat says so either way for any thing)
        if (o.flat ?? (!box && b.h <= FLAT_H && b.w <= FLAT_W)) this.flatThings.add(o);
      }
    }
    // the map's own say: a zone tagged `solid` is a wall, one tagged `walk` a way through a cliff (a ladder)
    const tagged = (t) => (doc.zones ?? []).filter((z) => (z.tags ?? []).includes(t));
    for (const z of tagged('solid')) this.solids.push({ x: z.x, y: z.y, w: z.w, h: z.h });
    this.ways = tagged('walk').map((z) => ({ x: z.x, y: z.y, w: z.w, h: z.h }));
    // (a zone tagged `open`, the designer's "walk here" (the Blockers tool): feet inside it are never stopped, by rock,
    //  water, a thing or a solid zone)
    this.opens = tagged('open').map((z) => ({ x: z.x, y: z.y, w: z.w, h: z.h }));
    this.ladders = tagged('ladder').map((z) => ({ x: z.x, y: z.y, w: z.w, h: z.h }));
    // STEPPING STONES (2026-09-27, the designer: the farmer "appears to stand on water"; and again: "stepping stones
    // are a narrow area -- the player should only be able to walk on them, not on the water"): a way over water (a
    // walk zone that is not a ladder) with stones laid in it. Unlike a log or a ladder it does NOT floor its whole
    // box: over its water the feet keep to the stones (onStones), you hop from stone to stone, and come to rest on one
    const ladderZone = (z) => (z.tags ?? []).includes('ladder') || /ladder/i.test(z.name ?? '');
    this.stoneWays = tagged('walk').filter((z) => !ladderZone(z)).map((z) => {
      const stones = [];
      for (const l of doc.layers) for (const o of (l.type === 'objects' && l.visible ? l.objects : []))
        if (STONE.test(String(o.asset ?? '')) && o.x < z.x + z.w && o.x + o.w > z.x && o.y < z.y + z.h && o.y + o.h > z.y) stones.push({ x: o.x + o.w / 2, y: o.y + o.h * 0.62 });
      return { x: z.x, y: z.y, w: z.w, h: z.h, stones };
    }).filter((w) => w.stones.length);
    const stoneBox = (z) => this.stoneWays.some((w) => w.x === z.x && w.y === z.y && w.w === z.w && w.h === z.h);
    for (const z of this.ways) if (!stoneBox(z)) this.floors.push(z);   // (a log across a stream, a ladder: water or rock underfoot)
    this.stoneSteps = this.stepsOver(this.stoneWays);
    this.hopLift = 0;
    this.index = new Map();
    this.solids.forEach((s, n) => {
      for (let by = Math.floor(s.y / BUCKET); by <= Math.floor((s.y + s.h) / BUCKET); by++)
        for (let bx = Math.floor(s.x / BUCKET); bx <= Math.floor((s.x + s.w) / BUCKET); bx++) {
          const k = by * 65536 + bx, list = this.index.get(k);
          if (list) list.push(n); else this.index.set(k, [n]);
        }
    });
    // (the floors the same way, by the square of the map they lie over -- onFloor: 2026-10-22, the designer: "much more
    //  smoother"; every step over water had looked at each of the town's hundreds of bridge and pier pieces)
    this.floorIndex = new Map();
    this.floors.forEach((f, n) => {
      for (let by = Math.floor(f.y / BUCKET); by <= Math.floor((f.y + f.h) / BUCKET); by++)
        for (let bx = Math.floor(f.x / BUCKET); bx <= Math.floor((f.x + f.w) / BUCKET); bx++) {
          const k = by * 65536 + bx, list = this.floorIndex.get(k);
          if (list) list.push(f); else this.floorIndex.set(k, [f]);
        }
    });
  }

  /** One of the Everbloom's bridges (ELF_BRIDGES): its deck band floored whole, its railings solid. True if it was one. */
  elfBridge(o) {
    const t = ELF_BRIDGES.find(([re]) => re.test(String(o.asset ?? '')));
    if (!t || o.rot) return false;
    const [, pw, ph, axis, [d0, d1], sides] = t, kx = o.w / pw, ky = o.h / ph;
    if (axis === 'ew') {
      this.floors.push({ x: o.x, y: o.y + d0 * ky, w: o.w, h: (d1 - d0) * ky });
      for (const [a, b] of sides) this.solids.push({ x: o.x, y: o.y + a * ky, w: o.w, h: (b - a) * ky, o });
    } else {
      const X = (a, b) => (o.flipX ? pw - b : a);
      this.floors.push({ x: o.x + X(d0, d1) * kx, y: o.y, w: (d1 - d0) * kx, h: o.h });
      for (const [a, b] of sides) this.solids.push({ x: o.x + X(a, b) * kx, y: o.y, w: (b - a) * kx, h: o.h, o });
    }
    return true;
  }

  onFloor(x, y) {
    const list = this.floorIndex ? this.floorIndex.get(Math.floor(y / BUCKET) * 65536 + Math.floor(x / BUCKET)) : this.floors;
    return !!list && list.some((f) => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h && (!f.o || this.deckAt(f.o, x, y)));
  }

  /** Is (x, y) on the planks a pier or a bridge draws -- not on its posts, nor the water painted under its front edge,
   *  nor a see-through corner? (Until its picture is in, the whole of it counts.) */
  deckAt(o, x, y) {
    const m = this.deckMask(o);
    if (!m) return !SHORE.test(String(o.asset ?? ''));                 // (a shore is no floor until its picture is in: the water stays water)
    let u = Math.floor(((x - o.x) * m.w) / o.w), v = Math.floor(((y - o.y) * m.h) / o.h);
    if (o.flipX) u = m.w - 1 - u;
    if (o.flipY) v = m.h - 1 - v;
    return u >= 0 && v >= 0 && u < m.w && v < m.h && m.deck[v * m.w + u] === 1;
  }

  /** The planks of a pier's picture: every solid pixel that is not the blue of water (made once for each picture). */
  deckMask(o) {
    const key = `${o.asset}|${o.sx},${o.sy},${o.sw},${o.sh}`;
    const masks = (Play.decks ??= new Map());
    if (masks.has(key)) return masks.get(key);
    const rec = this.app.assets.image(o.asset);
    if (rec.state !== 'ok') return null;
    // (the picture's own pixels, from its file -- js/png.js: a canvas read back is noised by privacy-minded browsers,
    //  Brave's among them, which would have put holes in the planks. Until the file is decoded, a canvas's reading
    //  stands in for the moment, and is not kept.)
    const px = pixelsNow(packURL(o.asset));
    // (THAT MOMENT'S READING KEPT FOR THE MOMENT, 2026-10-28, the launch-eve walk of the world: made anew at every point
    //  asked, it cost 3 ms a step by the Everbloom's shores, whose pictures are 512 px across, and the walk grid made in
    //  the first moments there held the game still for twelve seconds. It is made once now, and stands until the file's
    //  own pixels are in; then the true mask is made and kept, as ever)
    const soon = (Play.decksSoon ??= new Map());
    if (!px && soon.has(key)) return soon.get(key);
    const w = o.sw, h = o.sh, deck = new Uint8Array(w * h);
    let d, dw, ox = 0, oy = 0, dh = h;
    if (px) { d = px.data; dw = px.width; dh = px.height; ox = o.sx; oy = o.sy; }
    else {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const q = c.getContext('2d', { willReadFrequently: true });
      q.drawImage(rec.img, o.sx, o.sy, w, h, 0, 0, w, h);
      d = q.getImageData(0, 0, w, h).data; dw = w;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = ox + x, sy = oy + y;
      if (sx >= dw || sy >= dh) continue;
      const i = (sy * dw + sx) * 4, r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      deck[y * w + x] = a > 120 && !(b > r + 16 && b >= g - 8) ? 1 : 0;
    }
    if (SHORE.test(String(o.asset ?? ''))) {
      // A SHORE'S OR A POND'S PICTURE (2026-10-14, the designer: on a river's edge the player "cannot go on top of the
      // water no matter what"): only its grass is ground -- not its stones, its pebbled lip, its foam, its bright and
      // teal lines -- and the feet keep EDGE pixels off all of them, so a farmer stops on the grass before the bank,
      // never on the stones or in the water
      const EDGE = 3;
      const stop = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const sx = ox + x, sy = oy + y, k = y * w + x;
        if (sx >= dw || sy >= dh) { deck[k] = 0; continue; }
        const i = (sy * dw + sx) * 4, r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
        const grass = a > 120 && g > r + 20 && g > b + 20;
        deck[k] = grass ? 1 : 0;
        if (!grass && a > 120) stop[k] = 1;                         // (every edge between its grass and its water is drawn: stones, lip, lines)
      }
      const near = new Uint8Array(w * h), row = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = 0; for (let q = Math.max(0, x - EDGE); q <= Math.min(w - 1, x + EDGE) && !v; q++) v = stop[y * w + q];
        row[y * w + x] = v;
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = 0; for (let q = Math.max(0, y - EDGE); q <= Math.min(h - 1, y + EDGE) && !v; q++) v = row[q * w + x];
        near[y * w + x] = v;
      }
      for (let k = 0; k < w * h; k++) if (near[k]) deck[k] = 0;
    }
    const m = { w, h, deck };
    if (px) { masks.set(key, m); soon.delete(key); } else soon.set(key, m);
    return m;
  }

  /**
   * THE LINE OVER A STEPPING-STONE CROSSING, as the segments the feet keep to over its water: from each stone to every
   * other within three tiles, and from a stone to the bank beside it -- the first dry ground straight or slantwise off
   * it, three tiles at most -- and on a way onto the bank, so walking up to it draws you onto it. Every segment keeps
   * inside the crossing's own zones (the designer draws where the way runs: a cave's stones lie two tiles apart and
   * meet the bank at a slant; a causeway's lie side by side; two crossings side by side never join). [{ ax, ay, bx, by }]
   */
  stepsOver(ways) {
    const T = this.app.doc.tileSize, W = this.app.doc.width, H = this.app.doc.height, REACH = 48;
    const cell = (x, y) => { const cx = Math.floor(x / T), cy = Math.floor(y / T); return cx < 0 || cy < 0 || cx >= W || cy >= H ? -1 : cy * W + cx; };
    const inWay = (x, y) => ways.some((w) => x >= w.x - 4 && x <= w.x + w.w + 4 && y >= w.y - 4 && y <= w.y + w.h + 4);
    const along = (ax, ay, bx, by) => { const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3); for (let k = 0; k <= n; k++) if (!inWay(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n)) return false; return true; };
    const seen = new Set(), stones = [];
    for (const w of ways) for (const s of w.stones) { const k = `${s.x},${s.y}`; if (!seen.has(k)) { seen.add(k); stones.push(s); } }
    const steps = [];
    stones.forEach((a, i) => { for (const b of stones.slice(i + 1)) if (Math.hypot(b.x - a.x, b.y - a.y) <= REACH && along(a.x, a.y, b.x, b.y)) steps.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y }); });
    const D = Math.SQRT1_2;
    for (const s of stones) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [D, D], [D, -D], [-D, D], [-D, -D]])
      for (let r = 2; r <= REACH; r += 2) {
        const x = s.x + dx * r, y = s.y + dy * r, i = cell(x, y);
        if (i < 0 || !inWay(x, y)) break;
        if (this.water[i]) continue;
        if (!this.wall[i]) steps.push({ ax: s.x, ay: s.y, bx: s.x + dx * (r + 14), by: s.y + dy * (r + 14) });
        break;
      }
    if (steps.length) {
      const xs = steps.flatMap((s) => [s.ax, s.bx]), ys = steps.flatMap((s) => [s.ay, s.by]);
      this.stepsBox = { x0: Math.min(...xs) - 8, y0: Math.min(...ys) - 8, x1: Math.max(...xs) + 8, y1: Math.max(...ys) + 8 };
    }
    return steps;
  }

  /** Is (x, y) -- the point between the feet -- on the line over a stepping-stone crossing (stepsOver)? There, and
   *  only there, its water carries you. */
  onStones(x, y) {
    const b = this.stepsBox;
    if (!this.stoneSteps?.length || x < b.x0 || y < b.y0 || x > b.x1 || y > b.y1) return false;
    return this.stoneSteps.some((s) => segNear(x, y, s).d <= STEP_R);
  }

  /** Walking a stepping-stone crossing: the feet drawn onto its line, so a step a little to one side of it still finds
   *  the stones -- only across the line (never along it, so you are never held back), only while you are walking the
   *  way it runs (not along the bank past its end), and never into anything. `dir` the way you are pressing, [x, y]. */
  keepToStones(who, dir, dt) {
    let best = null;
    for (const s of this.stoneSteps) {
      const n = segNear(who.x, who.y, s);
      if (n.d > STEP_PULL || n.d <= 0.2 || n.t <= 0 || n.t >= 1) continue;
      const vx = s.bx - s.ax, vy = s.by - s.ay, len = Math.hypot(vx, vy);
      if (Math.abs((dir[0] * vx + dir[1] * vy) / len) < 0.6) continue;
      if (!best || n.d < best.d) best = n;
    }
    if (!best) return;
    const k = Math.min(1, (90 * dt) / best.d), nx = who.x + (best.px - who.x) * k, ny = who.y + (best.py - who.y) * k;
    if (!this.blocked(nx, ny)) { who.x = nx; who.y = ny; }
  }

  /** A STEP THE WATER STOPS, BY STEPPING STONES (hero.js, blocked the way pressed -- 2026-10-22, the testers: "unable to
   *  jump on the stepping stones"): the stones' line is 3.5 px wide (STEP_R), so a farmer on the bank a little to one side
   *  of it, or on an end stone whose next lay to one side, could never step on. Pressing toward a line within STEP_HOP,
   *  the farmer HOPS onto it; on it, the step goes along it the way nearest the one pressed. [dx, dy], or null. */
  alongStones(x, y, dx, dy) {
    const len = Math.hypot(dx, dy);
    if (!len || !this.stoneSteps?.length) return null;
    const ux = dx / len, uy = dy / len;
    let best = null;
    for (const s of this.stoneSteps) {
      const n = segNear(x, y, s);
      if (n.d > STEP_HOP) continue;
      if (n.d > STEP_R) {
        // (off the line: a hop onto it, to where it lies the way pressed)
        const toward = ((n.px - x) * ux + (n.py - y) * uy) / n.d;
        if (toward < 0.3) continue;
        const score = toward - n.d / 30;
        if (!best || score > best.score) best = { score, mv: [n.px - x, n.py - y] };
        continue;
      }
      const vx = s.bx - s.ax, vy = s.by - s.ay, L = Math.hypot(vx, vy) || 1, c = (dx * vx + dy * vy) / (len * L);
      if (Math.abs(c) < 0.45) continue;                                  // (nowhere near the way pressed)
      if (c > 0 ? n.t >= 1 : n.t <= 0) continue;                          // (at the end it runs to: nothing on that way)
      const score = 1 + Math.abs(c);                                      // (along a line before a hop off it)
      if (!best || score > best.score) best = { score, mv: [((c > 0 ? vx : -vx) / L) * len + (n.px - x) * 0.5, ((c > 0 ? vy : -vy) / L) * len + (n.py - y) * 0.5] };
    }
    return best?.mv ?? null;
  }

  /**
   * ON STEPPING STONES: how high the farmer is in a hop, 0 on a stone -- and, standing still between two, a nudge onto
   * the nearer one. `who` { x, y, mode }; `still` whether they are standing still (only the player is nudged).
   */
  stoneHop(who, still = false, dt = 0) {
    if (!this.stoneWays?.length || who.mode === 'swim' || who.mode === 'broom') return 0;
    if (dt && who.walkDir && this.stoneSteps.length) this.keepToStones(who, who.walkDir, dt);
    // (IN THE SADDLE, 2026-10-23, a player: "still unable to walk on the stepping stones" -- on a horse, a bear or a bicycle
    //  the feet were never drawn onto the stones' line, and a bend in it put them in the water: a rider keeps to the
    //  stones as a walker does, but never hops)
    if (who.mode && who.mode !== 'foot') return 0;
    const w = this.stoneWays.find((s) => who.x >= s.x && who.x < s.x + s.w && who.y >= s.y && who.y < s.y + s.h);
    if (!w) return 0;
    const T = this.app.doc.tileSize, W = this.app.doc.width;
    if (!this.water[Math.floor(who.y / T) * W + Math.floor(who.x / T)]) return 0;      // (the dry ends of the way)
    let best = null, bd = Infinity;
    for (const s of w.stones) { const d = Math.hypot(s.x - who.x, s.y - who.y); if (d < bd) { bd = d; best = s; } }
    if (still && best && bd > 0.5) {
      const k = Math.min(1, (70 * dt) / bd), nx = who.x + (best.x - who.x) * k, ny = who.y + (best.y - who.y) * k;
      if (!this.blocked(nx, ny)) { who.x = nx; who.y = ny; bd *= 1 - k; }
    }
    return bd <= 2.5 ? 0 : Math.min(9, 2 + bd * 0.55);
  }

  /** Is the point open water -- no pier or bridge over it? (You swim there.) */
  isWater(x, y) {
    const T = this.app.doc.tileSize, W = this.app.doc.width;
    if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) return false;
    return !!this.water[Math.floor(y / T) * W + Math.floor(x / T)] && !this.onFloor(x, y) && !this.onStones(x, y);
  }

  /** WATER UNDER ANY PART OF THE FEET (2026-10-22, the testers: "the player can walk on water"): the feet's box over water
   *  no deck, walk zone or stepping stone covers, as blocked() reads it for the townsfolk. The farmer had been stopped
   *  only when the point between the feet was in it, and stood half over the water at every bank and off every pier. */
  wetFeet(x, y) {
    if (this.opens?.some((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)) return false;
    const x0 = x - BOX_W / 2, x1 = x + BOX_W / 2, y0 = y - BOX_H + 2, y1 = y + 2, T = this.app.doc.tileSize, W = this.app.doc.width;
    let stones;
    for (const [px, py] of [[x0, y0], [x1 - 0.01, y0], [x0, y1 - 0.01], [x1 - 0.01, y1 - 0.01], [x, y0], [x, y1 - 0.01]]) {
      if (px < 0 || py < 0 || px >= this.mapW || py >= this.mapH) continue;
      if (this.water[Math.floor(py / T) * W + Math.floor(px / T)] && !this.onFloor(px, py) && !(stones ??= this.onStones(x, y))) return true;
    }
    return false;
  }

  /** On a pond's open water where it is a picture, not water tiles (the VIP maps: their `pond` zones,
   *  design/vip/art/play_build.py) -- where a duck paddles about. Nobody swims or fishes there. */
  inPond(x, y) {
    const doc = this.app.doc;
    if (this.pondsOf !== doc) { this.pondsOf = doc; this.ponds = (doc.zones ?? []).filter((z) => (z.tags ?? []).includes('pond')); }
    return this.ponds.some((z) => x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h);
  }

  /** Is the point water you may swim in (a body a "swim" zone touches, where it is wide)? */
  canSwim(x, y) {
    if (!this.isWater(x, y)) return false;
    const T = this.app.doc.tileSize, i = Math.floor(y / T) * this.app.doc.width + Math.floor(x / T);
    return this.swimmable.has(this.body[i]) && !!this.wide?.[i] && !this.falls?.some((f) => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h);
  }

  /** Like blocked(), but water does not count: what stops a swimmer, a rider, a child at play. */
  solid(x, y) {
    const w = this.water;
    this.water = NO_WATER;
    try { return this.blocked(x, y); } finally { this.water = w; }
  }

  /** Would the feet's box at (x, y) (the point between the feet) hit anything? People count too (they stand in
   *  your way like anyone would) -- but not for a person's own walk (`people` false). */
  blocked(x, y, people = true) {
    const x0 = x - BOX_W / 2, x1 = x + BOX_W / 2, y0 = y - BOX_H + 2, y1 = y + 2;
    if (x0 < 0 || y0 < 0 || x1 > this.mapW || y1 > this.mapH) return true;
    const T = this.app.doc.tileSize, W = this.app.doc.width;
    let stones;                                                      // (the feet on a stepping-stone line: asked once, if water is under them)
    const open = this.opens?.length && this.opens.some((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);   // (the designer's walk here)
    // (the six points of the feet, and the things in the squares round them, looked at without making anything -- a
    //  thing in two squares is simply looked at twice: 2026-10-22, the designer: "much more smoother"; this is asked for
    //  every step of everyone, and 650,000 times for a town's walk grid)
    if (!open) for (let p = 0; p < 6; p++) {
      const px = p === 4 || p === 5 ? x : p & 1 ? x1 - 0.01 : x0, py = p === 0 || p === 1 || p === 4 ? y0 : y1 - 0.01;
      const i = Math.floor(py / T) * W + Math.floor(px / T);
      if (this.wall[i] && !this.onFloor(px, py)) return true;       // (a bridge, a pier, a walk zone: over rock too)
      if (this.water[i] && !this.onFloor(px, py) && !(stones ??= this.onStones(x, y))) return true;
    }
    if (!open) for (let by = Math.floor(y0 / BUCKET); by <= Math.floor(y1 / BUCKET); by++)
      for (let bx = Math.floor(x0 / BUCKET); bx <= Math.floor(x1 / BUCKET); bx++) {
        const list = this.index.get(by * 65536 + bx);
        if (list) for (let j = 0; j < list.length; j++) {
          const s = this.solids[list[j]];
          if (!(x1 > s.x && x0 < s.x + s.w && y1 > s.y && y0 < s.y + s.h)) continue;   // (the box first: it is the cheap one)
          if (s.o && this.nodes?.gone(s.o)) continue;              // a rock you broke is no longer there
          if (s.o?.tags && this.storyHides(s.o)) continue;         // (a quest's thing not there yet, or taken)
          return true;
        }
      }
    if (this.colosseum?.shut(x0, y0, x1, y1)) return true;          // (the Colosseum's players' gate, down: game/colosseum.js)
    if (this.dungeon?.shut(x0, y0, x1, y1)) return true;            // (the dungeon's iron gate, shut: game/dungeon.js)
    // a chest you bought and set down (its lower half: you pass behind its lid)
    const placed = this.localSave().placed, map = this.app.doc.id;
    if (placed) for (const c of placed) if (c.map === map && x1 > c.x - 7 && x0 < c.x + 7 && y1 > c.y - 7 && y0 < c.y) return true;
    // (and a cow, wherever it has wandered to: game/ambient.js blocks)
    return people && (!!this.folk?.blocks(x0, y0, x1, y1) || !!this.world?.blocks(x0, y0, x1, y1));
  }

  /* ------------------------------------------------------------ a person's walk (game/npcs.js) */

  /** The walkable cells of this map, 8 px each, by Play's own collision (people aside). Made once a map: a few rows at a
   *  time while nothing else is going on (gridAhead), and whatever is left of it at once when someone needs a way first
   *  (2026-10-22, the designer: "much more smoother" -- the town's, made at once, had stopped the game 0.8 s the first
   *  time anyone there walked anywhere). */
  walkGrid() {
    const g = this.grid ?? this.gridStart();
    if (g.row < g.gh) this.gridRows(g, g.gh);
    return g;
  }
  gridStart() {
    const S = 8, gw = Math.ceil(this.mapW / S), gh = Math.ceil(this.mapH / S);
    return (this.grid = { S, gw, gh, ok: new Uint8Array(gw * gh), row: 0 });
  }
  /** The grid's rows up to `to` made. */
  gridRows(g, to) {
    const { S, gw } = g;
    for (const end = Math.min(to, g.gh); g.row < end; g.row++) for (let x = 0, y = g.row; x < gw; x++) g.ok[y * gw + x] = this.blocked(x * S + S / 2, y * S + S / 2, false) ? 0 : 1;
  }
  /** The walk grid made in the moments the browser has to spare, after a map opens. */
  gridAhead() {
    const g = this.grid ?? this.gridStart(), doc = this.app.doc;
    const later = (f) => (window.requestIdleCallback ? window.requestIdleCallback(f, { timeout: 1000 }) : setTimeout(() => f(null), 30));
    const step = (d) => {
      if (this.grid !== g || this.app.doc !== doc || (!this.app.game && !this.on)) return;
      const t0 = performance.now(), budget = Math.max(3, Math.min(8, d?.timeRemaining?.() ?? 6));
      while (g.row < g.gh && performance.now() - t0 < budget) this.gridRows(g, g.row + 2);
      if (g.row < g.gh) later(step);
    };
    if (g.row < g.gh) later(step);
  }
  /** A way from a to b ([x, y] each) round whatever is solid -- A*, eight ways, never cutting a corner --
   *  as the points where it turns, ending at b: [[x, y], ...]. Null if there is none. */
  route(a, b, { loose = false } = {}) {
    const grid = this.walkGrid(), { S, gw, gh, ok } = grid, N = gw * gh;
    // (LOOSE, the farmer's arrow's, 2026-10-28, players: the arrow "only leads you to the longer route" -- a cell is open if
    //  the farmer could stand anywhere in it, not only at its middle: a bridge's lane of five pixels can lie between two
    //  middles, and read as shut the way went round the lake. Asked once a cell, as the way is sought. The townsfolk keep
    //  the strict grid: they walk to the middles.)
    const lz = loose ? (grid.loose ??= new Uint8Array(N)) : null;
    const LOOSE_AT = [[2, 2], [S - 2, 2], [2, S - 2], [S - 2, S - 2], [S / 2, 2], [S / 2, S - 2], [2, S / 2], [S - 2, S / 2]];
    const open = (n) => {
      if (ok[n]) return true;
      if (!lz) return false;
      if (lz[n]) return lz[n] === 1;
      const x0 = (n % gw) * S, y0 = ((n / gw) | 0) * S, yes = LOOSE_AT.some(([dx, dy]) => !this.blocked(x0 + dx, y0 + dy, false));
      lz[n] = yes ? 1 : 2;
      return yes;
    };
    const near = ([x, y]) => {
      const cx = Math.max(0, Math.min(gw - 1, Math.floor(x / S))), cy = Math.max(0, Math.min(gh - 1, Math.floor(y / S)));
      if (open(cy * gw + cx)) return cy * gw + cx;
      for (let r = 1; r <= 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && open(ny * gw + nx)) return ny * gw + nx;
      }
      return -1;
    };
    const s0 = near(a), t0 = near(b);
    if (s0 < 0 || t0 < 0) return null;
    const tx = t0 % gw, ty = (t0 / gw) | 0;
    const h = (c) => { const dx = Math.abs((c % gw) - tx), dy = Math.abs(((c / gw) | 0) - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), shut = new Uint8Array(N);
    // (a binary heap of [f, cell])
    const heap = [];
    const push = (f, c) => { heap.push([f, c]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    g[s0] = 0; push(h(s0), s0);
    while (heap.length) {
      const [, c] = pop();
      if (c === t0) break;
      if (shut[c]) continue;
      shut[c] = 1;
      const cx = c % gw, cy = (c / gw) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const n = ny * gw + nx;
        if (shut[n] || !open(n)) continue;
        if (dx && dy && (!open(cy * gw + nx) || !open(ny * gw + cx))) continue;   // (no corners cut)
        const cost = g[c] + (dx && dy ? 1.414 : 1);
        if (cost < g[n]) { g[n] = cost; came[n] = c; push(cost + h(n), n); }
      }
    }
    if (s0 !== t0 && came[t0] < 0) return null;
    const cells = [];
    for (let c = t0; c >= 0 && c !== s0; c = came[c]) cells.push(c);
    cells.reverse();
    // the points where it turns, at the cells' middles; the last is b itself
    const pts = [];
    let dir = null;
    cells.forEach((c, i) => {
      const prev = i ? cells[i - 1] : s0, d = `${(c % gw) - (prev % gw)},${((c / gw) | 0) - ((prev / gw) | 0)}`;
      if (d !== dir && i) pts.push([(prev % gw) * S + S / 2, ((prev / gw) | 0) * S + S / 2]);
      dir = d;
    });
    pts.push(t0 === near(b) && ok[t0] ? [b[0], b[1]] : [tx * S + S / 2, ty * S + S / 2]);
    return pts;
  }
  /** The door a townsperson goes home by at night, and comes out of in the morning (2026-10-04): their own building's
   *  (npcs.js `home`: the door zone tagged building:<home>), else the door nearest the spot they stand at by day. */
  homeDoor(p) {
    // (Frosthaven, 2026-10-19: a house with no room to go into still has its door: a zone tagged home:<id>)
    const mine = (this.app.doc?.zones ?? []).find((z) => (z.tags ?? []).includes(`home:${p.id}`));
    if (mine) return [mine.x + mine.w / 2, mine.y + mine.h / 2 + 4];
    const own = p.def.home && (this.app.doc?.zones ?? []).find((z) => doorTarget(z) && (z.tags ?? []).includes(`building:${p.def.home}`));
    return own ? [own.x + own.w / 2, own.y + own.h / 2] : this.exitPoint(p.hx, p.hy);
  }
  /** The nearest way off this map for someone leaving it: the middle of the nearest door (a zone tagged to:).
   *  `road`: a way out of the place itself -- a road, not a building's door or the boat (else any door). */
  exitPoint(x, y, { road = false } = {}) {
    let best = null, bd = Infinity;
    for (const z of this.app.doc?.zones ?? []) {
      if (!doorTarget(z)) continue;
      if (road && (z.tags ?? []).some((t) => t === 'door' || t === 'boat')) continue;
      const cx = z.x + z.w / 2, cy = z.y + z.h / 2, d = Math.hypot(cx - x, cy - y);
      if (d < bd) { bd = d; best = [cx, cy]; }
    }
    return best ?? (road ? this.exitPoint(x, y) : null);
  }

  /* ------------------------------------------------------------ the Moonstone Circle: stones that wake */

  /** The map object a puzzle's zone is on (a standing stone): the biggest thing overlapping it. */
  pieceOf(z) {
    let best = null, most = 0;
    for (const l of this.app.doc?.layers ?? []) if (l.type === 'objects' && l.visible) for (const o of l.objects) {
      if (isFloor(o) || o.w * o.h < 150) continue;
      const w = Math.min(o.x + o.w, z.x + z.w) - Math.max(o.x, z.x), h = Math.min(o.y + o.h, z.y + z.h) - Math.max(o.y, z.y);
      if (w > 0 && h > 0 && w * h > most) { most = w * h; best = o; }
    }
    return best;
  }
  /** This map's six standing stones (zones tagged puzzle:circle:<k>), stone by stone -- or none. */
  circleStones() {
    const doc = this.app.doc;
    if (this.circleFor !== doc) {
      this.circleFor = doc;
      const zs = (doc?.zones ?? []).map((z) => [z, /^puzzle:circle:(\d+)$/.exec((z.tags ?? []).find((t) => t.startsWith('puzzle:circle:')) ?? '')]).filter(([, m]) => m);
      this.circle = [];
      for (const [z, m] of zs) this.circle[+m[1]] = this.pieceOf(z);
    }
    return this.circle;
  }
  /**
   * A STONE WAKES (the designer, 2026-09-27: "a hum, and a tremble in that stone"): 'wake' -- the stone pressed
   * trembles and hums its own note (so the right order is a tune) and glows until the circle is done; 'sleep' --
   * woken in the wrong order, they all shiver and go dark; 'open' -- all six tremble and sing together.
   */
  stoneFx(k, kind) {
    const stones = this.circleStones(), now = performance.now(), T = (this.trembles ??= new Map());
    const shake = (o, dur, amp) => { if (o) T.set(o, { t0: now, dur, amp }); };
    const mid = (o) => [o.x + o.w / 2, o.y + o.h * 0.45];
    if (kind === 'wake') { shake(stones[k], 0.9, 1.6); if (stones[k]) this.magic?.cast('stone', ...mid(stones[k])); }
    else if (kind === 'sleep') stones.forEach((o) => shake(o, 0.55, 1));
    else {
      stones.forEach((o) => shake(o, 2.2, 2.4)); this.wakeFlash = now + 3200;
      // (their light goes to the moonstone in the middle of the ring -- the hollow the token comes out of -- as it splits)
      const pts = stones.filter(Boolean).map(mid), hollow = this.app.doc?.zones?.find((z) => (z.tags ?? []).includes('clue:token_hollow'));
      const [mx, my] = hollow ? [hollow.x + hollow.w / 2, hollow.y + hollow.h / 2]
        : [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
      if (pts.length) this.magic?.cast('circle', mx, my, { stones: pts });
    }
    this.sound?.hum?.(k, kind);
  }
  /** How far a trembling thing is shaken this frame ([dx, dy]), or null. */
  shakeOf(o) {
    const tr = this.trembles?.get(o);
    if (!tr) return null;
    const e = (performance.now() - tr.t0) / 1000;
    if (e > tr.dur) { this.trembles.delete(o); return null; }
    const k = tr.amp * (1 - e / tr.dur);
    return [Math.round(Math.sin(e * 58) * k), Math.round(Math.sin(e * 37 + 1) * k * 0.5)];
  }
  /** The stones that are awake (the save's puz.circle.seq -- only which, never the answer): a soft pulsing light
   *  round each; the circle opening: all six, bright, fading. */
  drawWake(g) {
    const stones = this.circleStones();
    if (!stones?.length) return;
    const now = performance.now(), flash = this.wakeFlash && now < this.wakeFlash ? (this.wakeFlash - now) / 3200 : 0;
    const seq = this.localSave().puz?.circle?.seq ?? [], lit = flash ? stones.map((_, k) => k) : seq;
    if (!lit.length) return;
    const t = now / 1000;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const k of lit) {
      const o = stones[k];
      if (!o) continue;
      const cx = o.x + o.w / 2, cy = o.y + o.h * 0.5, r = 21 + Math.sin(t * 3 + k) * 2;
      const a = flash ? 0.3 + 0.5 * flash : 0.34 + 0.08 * Math.sin(t * 2.4 + k);
      const gr = g.createRadialGradient(cx, cy, 1, cx, cy, r);
      gr.addColorStop(0, `rgba(150, 215, 255, ${a.toFixed(3)})`); gr.addColorStop(1, 'rgba(150, 215, 255, 0)');
      g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    g.restore();
  }

  /** An enemy's blow reached you: it lands unless you are in the moment of grace after the last; at nought
   *  health you collapse (GAMEPLAY_RULES_REPORT.md A3). */
  /** A BEGINNER'S FOES (rules.js EASY_FOES): how strong the creatures are against this farmer, by their Combat level. */
  foeScale() { return foeScale(levelOf(this.localSave()?.skills?.combat ?? 0)) * placeScale(this.app.doc?.id); }   // (and a first mine's: rules.js GENTLE)
  hurtHero(n, from = null, effect = null, raw = null) {
    // (a meat dish eaten: blows taken softer, as much as it makes yours harder -- rules.js MEALS)
    const m = mealMult(this.localSave(), 'combat');
    if (m > 1) n = Math.max(1, Math.round(n / m));
    // (a Diamond Tart eaten: blows taken softer, as the server's hurt takes them -- rules.js BUFFS, 2026-10-28)
    const g = dishGuard(this.localSave());
    if (g < 1) n = Math.max(1, Math.round(n * g));
    // (THE COLOSSEUM, 2026-10-26: while a wave is on, blows land on an admin too -- this page's only, never the server's --
    //  so the designer feels the waves; a fall there fills it again: wakeInArena)
    // (...and in the dungeon, 2026-10-27: the designer tests as an admin, and "those traps, they're not affecting the
    //  player at all" -- there too an admin feels every blow, this page's only, and a fall there carries them up)
    const arenaAdmin = (!!this.colosseum?.on || !!this.dungeon) && !!this.health?.unlimited;
    if (!this.health || this.collapsing || (this.health.unlimited && !arenaAdmin) || this.health.hp <= 0) return false;
    if (this.inMoment()) return false;                              // (a scene playing: nothing lands -- inMoment)
    // (safe ground, as the server has it -- commands.js hurt: a spit still in the air as you stepped into the town landed here
    //  and the server's refusal came back as "Nothing hurts you here": 2026-10-27, the combat audit)
    if (this.app.game && isSafeAt(this.app.doc, this.x, this.y)) return false;
    if (performance.now() < (this.dashGrace ?? 0)) return false;     // (mid-dash: nothing lands -- dash)
    // (the moment of grace after a blow: this page's -- rules.js Health.hurt)
    const t = performance.now() / 1000;
    if (t < this.health.grace) return false;
    this.health.grace = t + HEALTH.graceSeconds;
    // THE SERVER WEIGHS IT (commands.js hurt, 2026-10-23): which creature, and its blow -- here at once, and on the server,
    // which keeps the health; a page in the editor's Play, or a creature the rules do not know (the arena's), as before
    const kind = from?.type ?? from?.def?.id ?? null;
    if (from?.trap && !arenaAdmin) { if (!this.act('hurt', { trap: from.trap, n: Math.max(1, Math.round(raw ?? n)) })?.ok) return false; }   // (a dungeon's trap: game/dungeon.js)
    else if (kind && ENEMY_IDS.has(kind) && !arenaAdmin) { if (!this.act('hurt', { enemy: kind, n: Math.max(1, Math.round(raw ?? n)) })?.ok) return false; }
    else { this.health.hp = Math.max(0, this.health.hp - n); this.health.keep(); }
    if (this.hero?.mode === 'bear' && this.app.game && !this.app.player?.admin) { this.act('mount.tire', { n: MOUNT_STAMINA.fight, kind: 'bear' }); this.mountTired(); }   // (the bear takes it: game/bearpal.js)
    // THROWN IN THE SADDLE (rules.js MOUNT_BOLT, 2026-10-28): a creature's blow or a trap's, on any mount but the bear
    const ridden = this.hero?.mode;
    if (MOUNT_NAMES[ridden] && ridden !== 'bear' && (from?.trap || kind)) this.thrownOff(ridden, from);
    this.hero?.hurt();
    // A BLOW IS FELT (2026-09-30, the tougher enemies): the screen jolts and reddens at its edges, and it knocks you a
    // step back from whatever struck you
    this.shakeScreen(0.22, 2); this.hurtAt = performance.now();
    if (from && !this.hero?.pose?.stuck) this.knockBack(from.x, from.y, 10);
    // (what the blow leaves: the creature's own effect, or the blow's -- a golem's stun)
    const fx = effect ?? from?.def?.effect;
    if (fx) this.afflict(fx);
    if (this.health.down) this.collapse();
    return true;
  }
  /**
   * POISONED, OR BURNING (2026-09-30, the cave spiders and the lava slime: "poisonous effect or burning effect"): a blow
   * from one leaves you losing a little health each second for a while (rules.js ENEMIES effect) -- a fresh blow keeps
   * it going. The farmer shows it (green bubbles, embers), the game says so once; a collapse ends it.
   */
  afflict(effect) {
    const now = performance.now(), S = (this.status ??= {}), was = S[effect.kind], on = was && was.until > now;
    // STUNNED (2026-10-21, the golems: "it will stun"): no health lost, only a moment where you can do nothing
    // (hero.js stunT); a fresh blow holds you longer, never shorter. SHOCKED (the storm slime: "it stuns the character,
    // shocks the character"): the same, sparks on you. FROZEN (the frost slime: "it freezes, or slows down"): held in
    // ice a moment, then slowed. SLOWED (the ice wolves): only slowed (hero.js slowT, slowBy the speed kept).
    const hold = (key, seconds) => {
      if (this.hero) this.hero.stunT = Math.max(this.hero.stunT ?? 0, seconds);
      const w = S[key], still = w && w.until > now;
      S[key] = { dps: 0, until: Math.max(still ? w.until : 0, now + seconds * 1000), acc: 0 };
    };
    const slow = (by, seconds) => {
      if (buffOn(this.localSave?.(), 'warm')) return;                  // (a Fireheart Pepper eaten: the cold cannot slow you -- rules.js BUFFS)
      const h = this.hero;
      if (h) { h.slowBy = (h.slowT ?? 0) > 0 ? Math.min(h.slowBy ?? 1, by) : by; h.slowT = Math.max(h.slowT ?? 0, seconds); }
      const w = S.chill, still = w && w.until > now;
      S.chill = { dps: 0, until: Math.max(still ? w.until : 0, now + seconds * 1000), acc: 0 };
    };
    if (effect.kind === 'stun' || effect.kind === 'shock') {
      hold(effect.kind, effect.seconds);
      if (!on) { this.gameUi?.notify?.(effect.kind === 'shock' ? 'Shocked! You cannot move for a moment' : 'Stunned!'); this.sound?.cue(effect.kind === 'shock' ? 'shocked' : 'stunned'); }
      return;
    }
    if (effect.kind === 'freeze') {
      hold('freeze', effect.seconds); slow(effect.slow ?? 0.5, effect.seconds + (effect.slowSeconds ?? 3));
      if (!on) { this.gameUi?.notify?.('Frozen! Then slowed by the cold'); this.sound?.cue('frozen'); }
      return;
    }
    if (effect.kind === 'chill') {
      const fresh = !(S.chill && S.chill.until > now);
      slow(effect.slow ?? 0.6, effect.seconds);
      if (fresh) { this.gameUi?.notify?.('Chilled! You move slowly for a while'); this.sound?.cue('chilled'); }
      return;
    }
    S[effect.kind] = { dps: Math.max(effect.dps, on ? was.dps : 0), until: now + effect.seconds * 1000, acc: on ? was.acc : 0 };
    if (!on) { this.gameUi?.notify?.(effect.kind === 'poison' ? 'Poisoned! You lose health for a while' : 'You are burning! You lose health for a while'); this.sound?.cue(effect.kind === 'poison' ? 'poisoned' : 'burning'); }
  }
  /** Each frame: what the poison and the fire take. */
  tickStatus(dt) {
    const S = this.status;
    // (a moment playing -- a scene, the twelve's: inMoment -- bites no more than a blow lands: 2026-10-27, the combat audit, a
    //  poison caught before a scene could still fell the farmer in the middle of it)
    if (!S || !this.health || this.collapsing || this.inMoment()) return;
    // (safe ground -- the joined world's town too, commands.js isSafeAt: a poison or a burn wears off there, 2026-10-23)
    if (Object.keys(S).length && isSafeAt(this.app.doc, this.x, this.y)) { this.status = {}; return; }
    const now = performance.now();
    let lost = 0;
    const bit = {};                                                    // (what each wound bit: its own tick for the server)
    for (const [k, st] of Object.entries(S)) {
      if (st.until <= now) { delete S[k]; continue; }
      st.acc += st.dps * dt;
      const n = Math.floor(st.acc);
      if (n > 0) { st.acc -= n; lost += n; bit[k] = (bit[k] ?? 0) + n; }
    }
    // (an admin in the Colosseum or the dungeon feels a burn's or a poison's bite as every blow there -- this page's only:
    //  hurtHero; 2026-10-27, the combat audit, a fire trap's burn left the designer's health untouched)
    const arenaAdmin = !!this.health.unlimited && (!!this.colosseum?.on || !!this.dungeon);
    if (!lost || (this.health.unlimited && !arenaAdmin) || this.health.hp <= 0) return;
    if (arenaAdmin) { this.health.hp = Math.max(0, this.health.hp - lost); this.health.keep(); }
    // (each tick the server's too: a poison's or a burn's, no more than it can have bitten -- commands.js hurt `tick`)
    else for (const [k, n] of Object.entries(bit)) if (n > 0) this.act('hurt', { tick: k, n });
    if (this.health.down) { this.status = {}; this.collapse(); }
  }
  /** Round the farmer, while it lasts: green bubbles rising (poison), embers (burning). World pixels. */
  drawStatus(g) {
    const S = this.status;
    if (!S || !this.hero) return;
    const now = performance.now(), t = now / 1000;
    for (const [k, st] of Object.entries(S)) {
      if (st.until <= now) continue;
      if (k === 'stun') {                                              // stunned: three little stars round the head
        for (let i = 0; i < 3; i++) {
          const a = t * 5 + i * 2.094, x = Math.round(this.x + Math.cos(a) * 7), y = Math.round(this.y - 31 + Math.sin(a) * 2.5);
          g.fillStyle = i === 1 ? '#fff6b0' : '#ffd84a';
          g.fillRect(x, y - 1, 1, 3); g.fillRect(x - 1, y, 3, 1);
        }
        continue;
      }
      if (k === 'shock') {                                             // shocked: sparks jumping on you, flickering
        const f = Math.floor(t * 18);
        for (let i = 0; i < 4; i++) {
          const h = (n) => ((Math.sin((f * 7 + i * 13 + n) * 12.9898) * 43758.5453) % 1 + 1) % 1;
          let x = Math.round(this.x - 7 + h(1) * 14), y = Math.round(this.y - 24 + h(2) * 20);
          g.fillStyle = i % 2 ? '#fffbe0' : '#ffe14a';
          for (let s = 0; s < 4; s++) { g.fillRect(x, y, 1, 1); x += h(3 + s) < 0.5 ? 1 : -1; y += 1; }
        }
        g.globalAlpha = 0.18 + 0.12 * (f % 2); g.fillStyle = '#fff3a0';
        g.beginPath(); g.ellipse(Math.round(this.x), Math.round(this.y - 12), 9, 14, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        continue;
      }
      if (k === 'freeze') {                                            // frozen: held in a block of ice
        const x = Math.round(this.x) - 8, y = Math.round(this.y) - 27;
        g.globalAlpha = 0.5; g.fillStyle = '#bfe8ff'; g.fillRect(x, y, 16, 28);
        g.globalAlpha = 0.85; g.fillStyle = '#f2fbff'; g.fillRect(x, y, 16, 1); g.fillRect(x, y, 1, 28); g.fillRect(x + 3, y + 3, 1, 6); g.fillRect(x + 11, y + 15, 1, 4);
        g.fillStyle = '#7fb6d8'; g.fillRect(x + 15, y + 1, 1, 27); g.fillRect(x + 1, y + 27, 15, 1);
        g.globalAlpha = 1;
        continue;
      }
      if (k === 'chill') {                                             // slowed by the cold: frost falling round you, a pale ring
        g.globalAlpha = 0.35; g.fillStyle = '#cdeeff';
        g.beginPath(); g.ellipse(Math.round(this.x), Math.round(this.y), 9, 3, 0, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < 5; i++) {
          const p = (t * 0.6 + i / 5) % 1, x = Math.round(this.x + Math.sin(i * 2.1 + t * 2) * 8), y = Math.round(this.y - 28 + p * 26);
          g.globalAlpha = 0.9 * (1 - p * 0.6); g.fillStyle = i % 2 ? '#ffffff' : '#bfe6ff'; g.fillRect(x, y, 1, 1);
          if (i % 2) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
        }
        g.globalAlpha = 1;
        continue;
      }
      const poison = k === 'poison';
      for (let i = 0; i < 5; i++) {
        const p = (t * (poison ? 0.9 : 1.4) + i / 5) % 1, x = Math.round(this.x + Math.sin(i * 2.3 + t * 3) * 6), y = Math.round(this.y - 6 - p * 22);
        g.globalAlpha = 0.85 * (1 - p);
        g.fillStyle = poison ? (i % 2 ? '#7de05a' : '#b7f28a') : (i % 2 ? '#ff8a2a' : '#ffd04a');
        g.fillRect(x, y, poison ? 2 : 1, poison ? 2 : 2);
      }
      g.globalAlpha = 1;
    }
  }
  /**
   * WHAT IS UNDER YOUR FEET, for the footsteps (game/sound.js, 2026-10-21): wood on a floor, a bridge or a dock; stone on
   * a road and in a cave; water where you wade; snow in Frosthaven, mud in the Barrowmire; sand on a beach (a tile there
   * from a sand or beach sheet); else grass.
   */
  groundKind(x, y) {
    const doc = this.app.doc, T = doc.tileSize, W = doc.width, cx = Math.floor(x / T), cy = Math.floor(y / T), i = cy * W + cx;
    if (this.onFloor?.(x, y)) return 'wood';
    if (this.water?.[i] && !this.wall?.[i]) return 'water';
    if (this.onRoad?.(x, y) || doc.dark || doc.region === 'caves' || doc.region === 'dungeon' || doc.id === 'dungeon_court') return 'stone';   // (the dungeon's own: a map read in keeps no `dark`, 2026-10-27; and the Dungeon Steps' flagstones)
    if (doc.region === 'frost') return 'snow';
    if (doc.region === 'undead') return 'mud';
    for (let k = doc.layers.length - 1; k >= 0; k--) {
      const l = doc.layers[k];
      if (l.type !== 'tiles' || !l.visible || !l.data?.[i]) continue;
      const img = resolveGid(doc, l.data[i])?.ts?.image ?? '';
      if (/sand|beach/i.test(img)) return 'sand';
    }
    return 'grass';
  }

  /** Pushed up to `px` away from (fx, fy), as far as the ground lets you. */
  knockBack(fx, fy, px) {
    const dx = this.x - fx, dy = this.y - fy, d = Math.hypot(dx, dy) || 1;
    for (let k = px; k > 0; k -= 2) {
      const nx = this.x + (dx / d) * k, ny = this.y + (dy / d) * k;
      if (this.blocked(nx, ny) || this.isWater(nx, ny)) continue;
      this.x = nx; this.y = ny;
      if (this.hero) { this.hero.x = nx; this.hero.y = ny; }
      return;
    }
  }
  /** The screen shaken for `sec`, by up to `amp` of the world's pixels, dying away. */
  shakeScreen(sec, amp = 2) { const now = performance.now(); if (!this.shake || this.shake.until - now < sec * 1000) this.shake = { until: now + sec * 1000, dur: sec * 1000, amp }; }
  /** The shake now: { x, y } in world pixels. */
  shakeNow() {
    const sh = this.shake, now = performance.now();
    if (!sh || now >= sh.until) return { x: 0, y: 0 };
    const k = sh.amp * ((sh.until - now) / sh.dur);
    return { x: Math.round((Math.random() * 2 - 1) * k), y: Math.round((Math.random() * 2 - 1) * k) };
  }
  /** Hurt a moment ago: the view's edges red, fading (world canvas, over everything). */
  drawHurt(g, vw, vh) {
    const t = this.hurtAt ? (performance.now() - this.hurtAt) / 350 : 1;
    if (t >= 1) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const r = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.25, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
    r.addColorStop(0, 'rgba(190, 20, 20, 0)'); r.addColorStop(1, `rgba(190, 20, 20, ${0.45 * (1 - t)})`);
    g.fillStyle = r; g.fillRect(0, 0, vw, vh);
    g.restore();
  }

  /* ------------------------------------------------------------ the fallen come back (rules.js RESPAWN) */

  /** Do creatures here come back by the clock? Out in the world; the dungeon's and the Colosseum's are set down fresh. */
  respawnsHere(doc = this.app.doc) { return !!doc && !dungeonLevel(doc.id) && !this.colosseum; }
  slainKey() { return `bloomshire.slain.${this.app.player?.id ?? 'editor'}`; }
  /** THE FALLEN (2026-10-28, the designer: "normal enemies will respawn after 30 minutes of being killed, and the bosses will
   *  respawn after 2 hours ... it doesn't need to be in a way that changing the region will respawn all the enemies"): each
   *  spot of a map's spawn zones whose creature fell, and when it comes back -- { slot: { until, type, x, y, corrupt, map } },
   *  this farmer's, kept in this browser over maps and reloads (a map made anew sets down only those whose time has come;
   *  the rules keep a boss's too, commands.js kill). */
  slainBook() {
    if (this.slain) return this.slain;
    let s = {};
    try { s = JSON.parse(localStorage.getItem(this.slainKey()) ?? '{}') ?? {}; } catch { s = {}; }
    const now = Date.now();
    for (const [k, v] of Object.entries(s)) if (!(v?.until > now - 6 * 3600e3)) delete s[k];   // (long since back: forgotten)
    return (this.slain = s);
  }
  slainSave() { try { localStorage.setItem(this.slainKey(), JSON.stringify(this.slain ?? {})); } catch { /* this visit only */ } }
  /** Is this spot's creature still down? */
  slainNow(slot) { const v = this.slainBook()[slot]; return !!v && v.until > Date.now(); }
  /** A creature fell: its spot waits RESPAWN's minutes, a boss's two hours. */
  markSlain(e) {
    if (!e?.spot || !this.respawnsHere()) return;
    const mins = e.def?.boss ? RESPAWN.bossMin : RESPAWN.foeMin;
    this.slainBook()[e.spot] = { until: Date.now() + mins * 60e3, type: e.type, x: e.homeX, y: e.homeY, corrupt: !!e.corrupt, map: this.app.doc?.id };
    this.slainSave();
  }
  /** Every few seconds: a fallen creature of this map whose time has come is set down at its spot again -- never before the
   *  farmer's eyes (it waits until they are a good way off). */
  respawnDue() {
    const now = Date.now();
    if (now - (this.respawnAt ?? 0) < 2000) return;
    this.respawnAt = now;
    const map = this.app.doc?.id, c = this.combat;
    if (!c || !map || !this.respawnsHere()) return;
    const book = this.slainBook();
    let changed = false;
    for (const [slot, v] of Object.entries(book)) {
      if (v.map !== map || v.until > now) continue;
      if (c.enemies.some((e) => e.spot === slot && !e.dead)) { delete book[slot]; changed = true; continue; }   // (set down already: the map made anew)
      if (Math.hypot(v.x - this.x, v.y - this.y) < 200) continue;
      if (!FOES[v.type] || c.blocks(FOES[v.type], v.x, v.y)) continue;
      const e = c.spawn(v.type, v.x, v.y);
      if (e) {
        c.spotted(e, slot, (s) => this.slainNow(s));
        if (v.corrupt) e.corrupt = true;
        const lead = c.enemies.find((o) => !o.dead && o.spot && slot.startsWith(`${o.spot}|`));   // (an escort back beside its boss)
        if (lead) e.leader = lead;
        c.preload?.();
      }
      delete book[slot]; changed = true;
    }
    if (changed) this.slainSave();
  }

  /**
   * AN ENEMY DOWN (the designer, 2026-09-30: "small Gold drops"): the server rolls what it drops (commands.js
   * 'combat.loot': only a kill that could have happened is paid) and the coins spring up and into the purse.
   */
  async killed(e) {
    if (e?.wave) { this.colosseum?.killed(e); return; }               // (a Colosseum wave's creature pays nothing: game/colosseum.js)
    this.markSlain(e);                                               // (its spot empty until it comes back: rules.js RESPAWN)
    const kr = this.act('kill', { enemy: e.type });                  // (the blows paid the energy: commands.js swing)
    if (this.dungeon && e?.guardian) this.dungeon.guardFell(e, kr);  // (a level's guardian: its boon cards, its stair -- game/dungeon.js)
    if (!this.app.game || !(e?.def?.gold || DROPS[e?.type]?.length || e?.def?.boss)) return;   // (a boss's prize, though it drops nothing: the Arch-Lich -- commands.js combat.loot)
    if (this.dungeon) return;                                        // (the dungeon pays at its end: commands.js combat.loot)
    const r = await this.session?.ask?.('combat.loot', { enemy: e.type, ...(e.def?.boss ? { x: Math.round(e.x), y: Math.round(e.y) } : {}) });
    if (r?.ok && r.gold > 0) { this.lootFx({ gold: r.gold }); this.ui?.refresh?.(); }
    // (a boss: its prize every two days, the first time a first prize -- rules.js BOSS_PRIZE; between, the fight's experience)
    const who = e.def?.name ?? 'the boss', the = /^the /i.test(who) ? who : `the ${who}`, The = `${the[0].toUpperCase()}${the.slice(1)}`;
    const many = (w, n) => (n > 1 ? (/(s|x|z|ch|sh)$/.test(w) ? `${w}es` : `${w}s`) : w);
    // (an Emerald, a Ruby: the Bone Spider's first prize said "a Emerald" -- 2026-10-28, the combat audit)
    const found = (r?.items ?? []).map(([id, n]) => { const w = ITEMS[id]?.name ?? id; return `${n > 1 ? `${n} ` : /^[aeiou]/i.test(w) ? 'an ' : 'a '}${many(w, n)}`; });
    const list = found.length > 1 ? `${found.slice(0, -1).join(', ')} and ${found.at(-1)}` : found[0];
    if (r?.ok && r.boss) {
      // (THE PRIZE IN A LOOT CHEST, 2026-10-28, the designer: "when the player kills a boss, it will drop a loot chest ...
      //  players will have to open that chest to claim the reward": set down where it fell, yours alone for 2 hours and then
      //  anyone's -- rules.js BOSS_CHEST, commands.js chest.open)
      if (r.chest) {
        this.addChest({ ...r.chest, mine: true, owner: this.app.player?.name ?? '', boss: e.type, opensIn: BOSS_CHEST.privateHours * 3600e3 });
        this.sound?.cue(this.sound?.has?.('chestClose') ? 'chestClose' : 'pickup', { gain: 0.7 });
        const hours = `${BOSS_CHEST.privateHours} hour${BOSS_CHEST.privateHours === 1 ? '' : 's'}`;
        this.say(r.boss.first ? `Your first win over ${the}! It left a loot chest where it fell. Open it within ${hours} or anyone may take it`
          : `${The} is beaten and left a loot chest where it fell. Open it within ${hours} or anyone may take it`, 6500);
        this.loadBags();
        return;
      }
      if (r.boss.first) this.say(`Your first win over ${the}! ${list ? `You found ${list}, and there` : 'There'} is another prize in 2 days`, 6000);
      else if (r.boss.paid) this.say(`${The} is beaten. Its next prize is in 2 days`, 5200);
      else this.say(`${The} has no prize left for now. The next one is in ${prizeBackIn(r.boss.back)}`, 5200);
      if (found.length) { this.sound?.cue('pickup', { gain: 0.6 }); this.ui?.refresh?.(); }
      return;
    }
    // (what the undead drop instead: rare things, seeds -- 2026-10-03)
    if (r?.ok && r.items?.length) {
      // (as a sentence, no colon: a player's words, 2026-10-28, the combat audit)
      const got = r.items.map(([id, n]) => `${n > 1 ? `${n} ` : ''}${ITEMS[id]?.name ?? id}`);
      this.say(`You found ${got.length > 1 ? `${got.slice(0, -1).join(', ')} and ${got.at(-1)}` : got[0]}`);
      this.sound?.cue('pickup', { gain: 0.6 }); this.ui?.refresh?.();
    }
  }
  /** Gold coins springing up over the farmer and flying to the purse (the lucky Shard's flight, gold). */
  lootFx({ gold }) {
    (this.shardFx ??= []).push({ t0: performance.now(), n: gold, landed: false, kind: 'gold' });
    this.sound?.cue(this.sound?.has?.('coins') ? 'coins' : 'pickup', { gain: 0.6 });
  }

  /** Out cold: you fall, and wake where the game starts (your home island) with part of your health -- your
   *  energy as it was. */
  collapse() {
    this.collapsing = true;
    this.fellAt = { x: Math.round(this.x), y: Math.round(this.y) };     // (where the death bag drops: commands.js wake)
    this.status = {};                                                   // (the poison, the fire: gone with you)
    const h = this.hero;
    h.endPose(); h.carry = false; h.umbrella = false; if (h.mode !== 'swim') h.mode = 'foot';
    h.play('faint', { hold: true, stuck: true });
    h.cue('faint');
    this.say('You collapse...');
    setTimeout(() => this.wake(), 1600);
  }

  async wake() {
    const app = this.app, h = this.hero;
    if (this.colosseum) return this.wakeInArena();
    if (this.dungeon) return this.wakeFromDungeon();
    // (the hotbar's things go into a bag where you fell -- the server's, rules.js DEATH_BAG: told before it goes)
    const lost = this.app.game && !isSafeAt(app.doc, this.x, this.y) && (this.inv?.hotbar ?? []).some((s) => s?.id && !ITEMS[s.id]?.bound && ITEMS[s.id]?.cat !== 'quest');
    const woke = this.act('wake', this.fellAt ?? {});                 // part of your health back; you are home
    this.combat.enemies = []; this.combat.shots = [];
    const home = app.world?.start;
    if (app.game && home && app.doc?.id !== home) {
      try { await app.openMap(home); this.build(); } catch { /* stay where you are */ }
      this.gameUi?.attach({ hero: this.hero, inv: this.inv, energy: this.energy, health: this.health, map: this.mapInfo(), name: app.player?.name ?? null });
    }
    const [sx, sy] = app.spawn ? [app.spawn.x, app.spawn.y] : [this.mapW / 2, this.mapH / 2];
    [this.x, this.y] = this.freeNear(sx, sy);
    h.env = this.heroEnv(); h.x = this.x; h.y = this.y; h.facing = 'down'; h.mode = 'foot';
    h.endPose();
    this.fit(); this.cam = { x: this.x - this.vw / 2, y: this.y - this.vh / 2 }; this.clampCam();
    this.collapsing = false;
    this.say(/^home_/.test(app.doc?.id ?? '') ? 'You come to at home' : 'You come to in town');
    const pet = this.localSave()?.pet, pk = this.localSave()?.perks, carried = !!pet?.kind && (pk?.pet || pk?.petChoice || app.player?.admin) && petEnergyOf(pet) > 0;
    // (no colon in a player's words, 2026-10-28, the combat audit)
    if (lost && carried) this.gameUi?.notify?.('Your pet carried what you had home with it. Press E beside it and it gives it all back.');
    else if (lost) { this.gameUi?.notify?.(`What you carried is in a bag where you fell. Only you can take it back for ${DEATH_BAG.privateHours} hours, and after that anyone may.`); this.sound?.cue('bagDrop'); }   // (the death bag's own sound, 2026-10-27)
    // (a goblin's blow the last: they took a share of the Gold carried -- commands.js wake, rules.js GOBLIN_LOOT)
    if (woke?.robbed) setTimeout(() => this.gameUi?.notify?.(`The ${woke.robbed.by}s took ${woke.robbed.gold.toLocaleString('en-US')} of the Gold you carried. Gold in the bank is safe.`), lost ? 4500 : 0);
  }

  /** OUT COLD IN THE DUNGEON (2026-10-26): carried back up to the top of the dungeon's stair (the Dungeon Steps since
   *  2026-10-27: rules.js DUNGEON.out); nothing lost (commands.js wake). */
  async wakeFromDungeon() {
    const app = this.app, h = this.hero, from = app.doc?.id;
    // (an admin's fall is this page's alone -- hurtHero -- and the server, which never hurt them, said "You are not out cold"
    //  to its wake: 2026-10-27, the combat audit; an admin is simply taken up the stair, as a way out of the dungeon)
    if (this.health.unlimited) this.act('travel', { to: DUNGEON.out }); else this.act('wake', this.fellAt ?? {});
    if (this.health.unlimited) { this.health.hp = this.health.max; this.health.keep(); }
    this.combat.enemies = []; this.combat.shots = [];
    try { await app.openMap(DUNGEON.out); this.build(); } catch { /* stay where you are */ }
    this.gameUi?.attach({ hero: this.hero, inv: this.inv, energy: this.energy, health: this.health, map: this.mapInfo(), name: app.player?.name ?? null });
    // (out cold on any level, one wakes at the top of the dungeon stair: places.js doorBackTo, 2026-10-27, the Season 0 audit)
    const back = doorBackTo(app.doc, from);
    const spot = back ? this.arrival(back) : null;
    if (spot) [this.x, this.y, this.facing] = spot;
    else [this.x, this.y] = this.freeNear(this.mapW / 2, this.mapH / 2);
    h.env = this.heroEnv(); h.x = this.x; h.y = this.y; h.facing = 'down'; h.mode = 'foot'; h.endPose();
    this.fit(); this.cam = { x: this.x - this.vw / 2, y: this.y - this.vh / 2 }; this.clampCam();
    this.collapsing = false;
    this.say('You come to at the top of the dungeon stair. Nothing was lost below.', 4200);
  }

  /** OUT COLD IN THE COLOSSEUM (2026-10-26): carried out to the Ready Court, by the gong; nothing lost (commands.js wake). */
  wakeInArena() {
    const h = this.hero;
    // (an admin's fall is this page's alone: no wake for the server to refuse -- wakeFromDungeon)
    if (!this.health.unlimited) this.act('wake', this.fellAt ?? {});
    if (this.health.unlimited) { this.health.hp = this.health.max; this.health.keep(); }   // (an admin's: hurtHero)
    this.colosseum.fell();
    this.combat.enemies = []; this.combat.shots = [];
    const z = (this.app.doc.zones ?? []).find((q) => (q.tags ?? []).includes('gong'));
    [this.x, this.y] = this.freeNear(z ? z.x + (z.w ?? z.width) / 2 + 28 : this.mapW / 2, z ? z.y + (z.h ?? z.height) + 20 : this.mapH - 80);
    h.x = this.x; h.y = this.y; h.facing = 'down'; h.mode = 'foot'; h.endPose();
    this.fit(); this.cam = { x: this.x - this.vw / 2, y: this.y - this.vh / 2 }; this.clampCam();
    this.collapsing = false;
  }

  /** The nearest spot the player can stand on, searching outward from (x, y). */
  /** A spot somewhere round this map's fountain, a different one each time: open ground a step or four from its
   *  rim, in the open with the fountain (nothing between them), facing it -- [x, y, facing] -- or null (no fountain). */
  byFountain() {
    // (THE JOINED WORLD, 2026-10-21: Moonmere's shell fountain is bigger than the town's -- the town's own, the square's
    //  Water fountain, first; else the biggest)
    let f = null;
    const town = (o) => /Exterior\/Water fountain/i.test(String(o.asset ?? ''));
    for (const l of this.app.doc.layers) if (l.type === 'objects' && l.visible)
      for (const o of l.objects) if (/fountain/i.test(String(o.asset ?? '')) && (!f || (town(o) && !town(f)) || (town(o) === town(f) && o.w * o.h > f.w * f.h))) f = o;
    if (!f) return null;
    const cx = f.x + f.w / 2, cy = f.y + f.h * 0.6, rim = Math.max(f.w, f.h) / 2;
    const open = (x, y) => !this.blocked(x, y, false) && !this.isWater(x, y);
    for (let tries = 0; tries < 80; tries++) {
      const a = Math.random() * Math.PI * 2, r = rim + 14 + Math.random() * 44;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (!open(x, y)) continue;
      // (in the open with it: every step back towards the fountain clear, to within a step of its rim)
      let clear = true;
      for (let d = r - 4; d > rim + 6 && clear; d -= 4) clear = open(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
      if (!clear) continue;
      const dx = cx - x, dy = cy - y;
      return [x, y, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')];
    }
    return null;
  }

  freeNear(x, y) {
    if (!this.blocked(x, y)) return [x, y];
    for (let r = 4; r < 900; r += 4)
      for (let a = 0; a < 16; a++) {
        const px = x + Math.cos((a / 16) * Math.PI * 2) * r, py = y + Math.sin((a / 16) * Math.PI * 2) * r;
        if (!this.blocked(px, py)) return [px, py];
      }
    return [x, y];
  }

  /* ------------------------------------------------------------ start / stop */

  /**
   * THE GAME WAITS FOR ITS FIRST PICTURE (2026-09-25). Before the first frame, what it shows is in: the
   * start map's art, the farmer standing and walking, the interface and its kit -- so nothing is drawn
   * half-loaded, pops in or jumps. Everything else follows in the background. Resolves when ready, or
   * after `cap` ms with whatever is late still coming (a slow picture never keeps the game shut).
   * @param onProgress (done, all) for a loading bar
   */
  async prepare(onProgress = () => {}, cap = 20000) {
    const app = this.app, A = app.assets;
    this.rig ??= new Villager([...A.fileByPath.keys()], (p) => A.image(p), { ...DEFAULT_LOOK, ...savedLook() });
    this.uiLoading ??= loadGameUi(A);
    const paths = new Set(mapArt(app.doc));
    for (const n of FIRST_ACTIONS) for (const p of this.rig.files(n)) paths.add(p);
    const waits = [...paths].map((p) => A.whenLoaded(p)), all = waits.length + 1;
    let done = 0;
    const tick = () => onProgress(++done, all);
    waits.forEach((w) => w.then(tick));
    const ui = this.uiLoading.catch(() => null).then((u) => { tick(); return u; });
    await Promise.race([Promise.all([...waits, ui]), sleep(cap)]);
  }

  /** A map's pictures, in (or `cap` ms gone): what a door waits for before it shows the next place. */
  artIn(doc, cap = 6000) {
    const A = this.app.assets;
    return Promise.race([Promise.all(mapArt(doc).map((p) => A.whenLoaded(p))), sleep(cap)]);
  }

  /** THE NEXT PLACES AHEAD OF TIME (2026-09-25): once a map is in, the maps its doors lead to are fetched
   *  and their pictures asked for, a few at a time -- so the boat to town or a shop's door opens at once.
   *  (The game only: the editor's maps may be changing.) */
  prefetchNext() {
    const app = this.app;
    if (!app.game || !app.mapFile) return;
    this.prefetched ??= new Set(); this.prefetchQ ??= [];
    // (only the maps the game ships, 2026-10-28: Stonepeak's sealed door to the Deeps, a region not in this season,
    //  was fetched on every arrival and answered 404, a red line in the console each time)
    const shipped = app.world?.maps ? new Set(app.world.maps) : null;
    const ids = [...new Set((app.doc?.zones ?? []).map(doorTarget).filter((id) => id && id !== app.doc.id && !this.prefetched.has(id) && (!shipped || shipped.has(id))))];
    ids.forEach((id) => this.prefetched.add(id));
    // one queue for the whole visit: going through a door adds that place's neighbours behind what is
    // still coming, it never starts the town over
    const step = () => {
      this.nextT = null;
      if (!this.on) return;
      for (let n = 0; n < 8 && this.prefetchQ.length; n++) app.assets.image(this.prefetchQ.shift());
      if (this.prefetchQ.length) this.nextT = setTimeout(step, 120);
    };
    (async () => {
      await sleep(600);
      for (const id of ids) {
        try { for (const p of mapArt(await app.mapFile(id))) this.prefetchQ.push(p); } catch { this.prefetched.delete(id); /* it opens when it is walked into */ }
      }
      if (!this.nextT) step();
    })();
  }

  start() {
    const app = this.app;
    if (this.on) return;
    if (!app.doc) { app.toast('Open a map first'); return; }
    this.build();
    // THE SKY TESTER (2026-10-19, the designer): in the map editor's Play only, never the game: any hour, any weather
    if (!app.game && !this.skyTester) this.skyTester = new SkyTester(app.doc.region === 'frost');
    // start where you were looking: under the pointer if it is on the map, else the middle of the view
    const v = app.view, r = app.renderer;
    let [x, y] = app.cursor?.over && app.cursor.surface !== 'whole' ? [app.cursor.wx, app.cursor.wy]
      : [v.x + r.cssW / (2 * v.zoom), v.y + r.cssH / (2 * v.zoom)];
    if (app.spawn && (!app.world?.start || app.doc.id === app.world.start)) [x, y] = [app.spawn.x, app.spawn.y];   // the game: the world's spawn
    x = Math.max(8, Math.min(this.mapW - 8, x)); y = Math.max(8, Math.min(this.mapH - 8, y));
    [this.x, this.y] = this.freeNear(x, y);
    this.facing = 'down'; this.state = 'idle'; this.t = 0;
    // THE TOWN SQUARE (the designer, 2026-09-27: everyone arrives at one place in Bloomshire -- server/world2.js
    // state -- "in the town square, around the fountain; the spawn should be random, but around the fountain"): a
    // visit that begins away from the home island begins somewhere round the town's fountain, or, on a map without
    // one, where the island's boat comes in
    if (app.game && app.world?.start && app.doc.id !== app.world.start) {
      const boat = (app.doc.zones ?? []).find((z) => doorTarget(z) === app.world.start && (z.tags ?? []).includes('boat'));
      // (inside a house -- the cottage, for one who left from it: world2.js state -- just inside its door: the middle of
      //  the view, the old fallback, could be out past its walls, 2026-10-09)
      const out = boat ? null : (app.doc.zones ?? []).find((z) => doorTarget(z) && (z.tags ?? []).includes('exit')) ?? (app.doc.zones ?? []).find((z) => doorTarget(z));
      const spot = this.byFountain() ?? (boat ? this.arrival(boat) : out ? this.arrival(out) : null);
      if (spot) [this.x, this.y, this.facing] = spot;
    }
    this.touchUi = touchFirst();                                     // a phone or a tablet: touch words, the screen filled
    this.exact = this.readExact();
    this.othersOn = this.readOthers();
    this.fit(); this.cam = { x: this.x - this.vw / 2, y: this.y - this.vh / 2 };
    this.clampCam();
    // the player: the pack's layered villager, dressed as you left it (hud.js keeps the look)
    const image = (p) => app.assets.image(p);
    this.rig ??= new Villager([...app.assets.fileByPath.keys()], image, { ...DEFAULT_LOOK, ...savedLook() });
    this.energy ??= new Energy();                                    // the player's own, kept in this browser (rules.js)
    // a Founding Farmer's bigger bar (or a VIP's): as the server last said (loadFounders below asks again), else as the account
    // says -- never put back to the small bar at every change of map (2026-10-23: a rest lain down for just inside the
    // house was a 100 bar's)
    // (and before the server has said, from the save this page holds: perks in it, or a pass running -- 2026-10-26, players:
    //  "when they sleep ... it only shows that it recovers 100 energy. And when they go to other region or refresh the game,
    //  that will show 150": the second or so before api/founders answered, the bar was taken to be 100, and whatever was
    //  done in it, lying down most of all, was a 100 bar's on this page)
    const own = app.game ? this.localSave?.() : null;
    this.energy.setFounding(this.founders ? !!this.founders.founder || !!this.vipNow?.() : !!app.player?.founding || !!own?.perks || (!!own && !!this.vipNow?.()));
    this.health ??= new Health();
    // THE ADMIN (the game's own, never the editor's Play): endless energy, no harm (rules.js setUnlimited)
    const god = !!(app.game && app.player?.admin);
    this.energy.setUnlimited(god); this.health.setUnlimited(god);
    startClock();                                                    // real time is the server's (game/clock.js)
    this.inv ??= new Inventory(); this.pack = this.inv;             // what you carry, slot by slot (game/inventory.js)
    this.hero = new Hero(this.rig, this.heroEnv(), this.x, this.y);
    this.hero.facing = this.facing;                                  // (round the fountain: facing it)
    this.preloadRig();
    if (app.game) this.loadFounders();                               // a Founding Farmer? (the server reads the chain)
    // THE WORLD IS DRAWN AT ITS OWN SIZE (2026-09-25): this canvas is the view's own pixels, and the browser
    // enlarges it by a whole number (image-rendering: pixelated); the interface is a second canvas laid over
    // it, finer (game/ui.js uiScale). Nothing full-screen is copied or re-made each frame.
    // (a phone or a tablet, game/touch.js: the words say what a finger does; a phone held upright is asked to turn)
    this.overlay = el('div#playOverlay', { class: `${this.touchUi ? 'touch' : ''} ${isPhone() ? 'phone' : ''} ${this.vipHere ? 'vip' : ''}`.trim().replace(/\s+/g, ' ') || null },
      el('div.play-view', {}, this.screen = el('canvas'), this.uiCanvas = el('canvas.play-ui')),
      this.hud = el('div.play-hud', { html: this.touchUi
        ? 'Your left thumb moves you &middot; tap to use or talk &middot; the gear for settings'
        : app.game
          ? 'Arrows or WASD to move &middot; Shift dashes &middot; Space uses &middot; <kbd>?</kbd> all the keys &middot; <kbd>Esc</kbd> the menu'
          : '<b>Playing</b> Arrows or WASD to move &middot; Shift dashes &middot; Space uses &middot; <kbd>?</kbd> all the keys &middot; <kbd>L</kbd> your look &middot; <kbd>Esc</kbd> back to editing' }),
      this.where = el('div.play-where'),
      this.banner = el('div.play-place'),
      el('div.play-rotate', {}, el('div.play-rotate-phone'), el('p', {}, 'Turn your phone sideways to play'),
        // (2026-10-07, a player: turned the phone and nothing happened -- its screen rotation was locked): the game asks the
        // browser for full screen on its side; where it cannot, the words say what to do
        el('button.play-rotate-go', { type: 'button', onclick: () => this.goSideways() }, 'Play full screen'),
        el('p.play-rotate-tip', {}, 'Still upright? Turn on Auto-rotate in your phone\'s quick settings, or open bloomshire.xyz/play in Chrome or Safari.')));
    // the frame is drawn off the page and copied onto it once, pixel for pixel (drawing straight into the
    // page's canvas cost more per picture in Chrome's checks)
    this.buffer = document.createElement('canvas');
    this.buffer.width = this.vw ?? GAME_W; this.buffer.height = this.vh ?? GAME_H;
    // THE TOWN, SHARED (2026-09-27, server/live2.js): the other players, and the global chat
    // (THE TOWNS, 2026-10-28: the one this sign-in chose -- or chosen now -- before the shared town is joined: game/towns.js)
    if (app.game) this.chooseTown().then(() => { if (!this.stopped) this.goLive(image); });
    // the town's boards (game/leaderboard.js, 2026-10-02): the story, Gold, Shards
    this.leaderboard = app.game ? new LeaderboardWindow(this) : null;
    // friends, a farmer's card, and who may ask to trade (game/friends.js, 2026-10-03)
    this.friends = app.game ? new FriendsWindow(this) : null;
    this.inbox = app.game ? new InboxWindow(this) : null;              // (the inbox: gifts, requests, stalls sold -- game/inbox.js)
    this.inbox?.load();
    this.bedCard = new BedCard(this);                                // (the bed's two ways to sleep: energy or health)
    this.skillCard = new SkillCard(this);                            // (a skill's page, from the Skills book: game/skillbook.js)
    this.levelCard = new LevelUpCard(this);                          // (a level's news at the top of the game: what it gave)
    this.bugBook = new BugBook(this);                                // (the Butterfly Book, from Foraging's page)
    this.theatre ??= new Theatre(this);                              // the cutscenes' panel (game/theatre.js): F4, the editor's Play and the admins
    this.adminDesk = app.game && app.player?.admin ? new AdminDesk(this) : null;     // the admin's desk (game/admin.js): ` or the HUD's Admin
    this.ctx = this.buffer.getContext('2d');
    this.screenCtx = this.screen.getContext('2d', { alpha: false });
    this.cssSize = '';
    this.ui = new Hud(this.overlay, this.hero, image, { onLook: () => this.preloadRig(), energy: this.energy, pack: this.pack, inv: this.inv, game: !!app.game, onGuide: () => this.showGuide(), touch: this.touchUi });
    if (app.game) this.where.hidden = true;                          // the tile readout is the editor's
    // the game's interface from the UI Studio: once it has loaded it draws over the world and
    // Play's plain bars step aside; without it (the hosted Studio does not serve it) they stay
    this.gameUi = null;
    const session = this.overlay;
    const uiLoading = this.uiLoading ?? loadGameUi(app.assets);    // (the game began loading it in prepare())
    this.uiLoading = null;
    uiLoading.then((ui) => {
      if (!this.on || this.overlay !== session) return;
      ui.attach({ hero: this.hero, inv: this.inv, energy: this.energy, health: this.health, map: this.mapInfo(), sound: () => this.sound,
        // the character screen changes the look as the look panel (L) does: kept in this browser, the panel follows
        setLook: (look) => { this.rig.setLook(look); saveLook(look); this.act('look', { look }); this.preloadRig(); this.ui?.buildLook(); this.live?.setLook(this.rig.look); },
        onHelp: () => this.ui?.toggleHelp(), onQuit: () => app.quit?.(), onEmporium: () => this.openEmporium(), onVipPass: () => this.openVipPass(), onSeedShop: () => (this.seedShop ??= new SeedShop(this)).open(), onGarden: () => this.openGarden(), buffs: () => this.localSave().buffs ?? null, vipUntil: () => this.localSave().vipUntil ?? null,
        onWallet: () => (this.gameWallet ??= new WalletWindow(this)).open(), name: app.player?.name ?? null, game: !!app.game,
        onFounders: app.game ? () => (this.foundersWin ??= new FoundersWindow(this)).open() : null,
        onWallets: app.game ? () => (this.walletsWin ??= new WalletsWindow(this)).open() : null,     // (Your farmer's Wallets: game/linkwallets.js)
        // (the chat is made later, when the game goes live -- goLive: asked for when the button is pressed, 2026-10-28, the
        //  designer: the chat button did nothing, "it only opened by clicking enter", as this was null when the HUD was made)
        onChat: () => this.chat?.toggle(), onAdmin: this.adminDesk ? () => this.adminDesk.toggle() : null,
        onLeaderboard: this.leaderboard ? () => this.leaderboard.open() : null, onFriends: this.friends ? () => this.friends.open() : null, onInbox: this.inbox ? () => this.inbox.open() : null, inboxUnread: this.inbox ? () => this.inbox.unread : null, onRide: () => (this.rideWheel ??= new RideWheel(this)).toggle(), canRide: () => (this.rideWheel ??= new RideWheel(this)).any(),
        onGuide: () => (this.guideBook ??= new GuideBook(this)).toggle(),   // (the green book under Ride & pets: game/guidebook.js)
        onBoosts: () => (this.boostsWin ??= new BoostsWindow(this)).toggle(),   // (the boosts chip: game/boostsui.js, 2026-10-28)
        chatUnread: this.chat ? () => this.chat.unread : null, sky: () => this.sky,
        act: (n, a) => this.act(n, a), session: () => this.session, quests: this.questHooks(),
        exact: { now: () => this.exact, set: (on) => this.setExact(on) }, others: { now: () => this.othersOn, set: (on) => this.setOthers(on) } });
      ui.onFerry = (r) => this.ferried(r); ui.ferryLandings = () => this.ferryLandings();   // (the Night Court's ferryman)
      this.gearChanged(false);                                         // (the armour the save has on, drawn: rules.js armourLook)
      ui.onSkill = (k, back) => this.skillCard?.open(k, back); ui.onLevelUp = (k, L) => this.levelCard?.show(k, L);   // (game/skillbook.js)
      this.gameUi = ui;
      if (this.touchPad?.touchy) ui.setJoystick?.(this.touchPad.fixedSwitch);   // (Settings' Fixed joystick, a phone's: game/touch.js)
      ui.touchy = !!this.touchPad?.touchy;                            // (the Notice beside the Quest card, clear of the buttons: ui.js)
      ui.goods = (this.goodsShop ??= new GoodsShop(this));             // (the Emporium in the pixel windows: game/goodsshop.js)
      ui.emote = (who, kind) => this.scenes?.emote(who, kind);         // (a line's emote, over its speaker or you: game/scenes.js)
      ui.setPlaceTheme?.(this.vipHere ? 'vip' : null);
      ui.setFounder?.(!!this.founders?.founder);
      this.chat?.theme(ui.themeColors?.());
      ui.onTheme = (c) => this.chat?.theme(c);
      ui.onGuideDone = (g) => this.guideSeen(g.key ?? 'tour');
      if (readyOf(this.localSave()).length) this.claimQuests();   // (a reward whose claim was lost on the way)
      this.ui?.plain(false);
    }).catch((e) => console.warn('[play] the UI Studio screens could not be loaded; keeping the plain HUD.', e));
    // the game's sound: once loaded, the music comes in (without it -- the hosted Studio -- Play is silent)
    loadSound().then((s) => {
      if (!this.on || this.overlay !== session || !s) return;
      this.sound = s;
      s.enter();
    });
    // the mouse: the pack's hand for a cursor; a click uses what is in your hand, aimed where you click
    this.mouse = null;
    const toWorld = (e) => this.pointAt(e.clientX, e.clientY);
    // (`window`: the pointer is over one of the game's own windows laid over the canvas -- the chat, the Emporium --
    //  which show the hand themselves: handCursor)
    this.overlay.addEventListener('mousemove', (e) => { this.mouse = { ...toWorld(e), down: this.mouse?.down, window: e.target !== this.screen }; this.gameUi?.move(this.mouse.ux, this.mouse.uy); });
    // the wheel turns through the hotbar (E talks now: 2026-09-25) -- over the game, never over a window laid on it,
    // which scrolls itself (2026-09-27, the designer: "scrolling on the chat should scroll the chat up or down, it
    // shouldn't change the toolbar slots"). Over the interface's own windows it is theirs (2026-09-29, testers: "scroll
    // isn't working"): a long list scrolls, a page turns, the map zooms (game/ui.js wheel)
    this.overlay.addEventListener('wheel', (e) => {
      if (e.target !== this.screen) return;
      if (this.gameUi) {
        const m = toWorld(e), dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 100 : 1);
        if (this.gameUi.wheel(m.ux, m.uy, dy)) { e.preventDefault(); return; }
      }
      if (this.gameUi?.windowOpen || !this.hero || !this.inv) return;
      e.preventDefault();
      const h = this.hero, size = this.inv.size;
      h.slot = (h.slot + (e.deltaY > 0 ? 1 : size - 1)) % size; h.cue('equip');
    }, { passive: false });
    this.overlay.addEventListener('mouseleave', () => { this.mouse = null; this.gameUi?.leave?.(); });
    this.overlay.addEventListener('mousedown', (e) => {
      // THE RIGHT BUTTON: an exclusive weapon's heavy attack (heavyPress) -- the bow's and the staff's aimed while it is held
      if (e.button === 2 && e.target === this.screen) {
        e.preventDefault();
        const m = toWorld(e); this.mouse = { ...m, down: this.mouse?.down };
        if (m.on && this.hero && !this.gameUi?.windowOpen) { this.hero.x = this.x; this.hero.y = this.y; this.heavyPress('mouse'); }
        return;
      }
      if (e.button !== 0 || e.target !== this.screen) return;
      e.preventDefault();
      const m = toWorld(e); this.mouse = { ...m, down: performance.now() };
      this.sound?.wake();
      if (m.on && this.gameUi?.down(m.ux, m.uy)) return;       // a button, a slot, a window: the interface's
      // ANOTHER FARMER CLICKED (2026-10-03): their card -- a friend request, a trade (game/friends.js) -- not a swing at them
      const other = m.on && this.app.game ? this.playerAt(m.x, m.y) : null;
      if (other) { this.friends?.openCard(other); return; }
      if (m.on) { this.hero.x = this.x; this.hero.y = this.y; this.hero.useToward(m.x, m.y); this.ui?.refresh(); }
    });
    this.overlay.addEventListener('mouseup', (e) => {
      if (e.button === 2) { if (this.heavyAim?.by === 'mouse') this.heavyLoose(); return; }
      if (e.button !== 0 || !this.gameUi) return;
      const m = toWorld(e);
      this.gameUi.up(m.ux, m.uy);
      this.ui?.refresh();
    });
    // A FINGER (game/touch.js): the joystick on the left, a tap for a click, a hold for a wind-up or a name
    this.touchPad = new TouchPad(this);        // (not "touch": that is the stones' own, touch(sp) -- 2026-09-29, the stones
    if (this.touchPad.touchy) this.gameUi?.setJoystick?.(this.touchPad.fixedSwitch);   // (Settings' Fixed joystick, 2026-10-26)
                                               //  could not be touched on a phone while the pad hid the method)
    startReady(this.localSave(), gameNow());                         // (the game's save has them already: the server began them)
    this.folk?.refresh();
    if (app.game && app.doc.id === OPENING.map && !openingDone(this.localSave())) this.wakeInBed();
    else if (app.game && this.energy?.recovering(gameNow())) this.backToBed();   // (you went while resting: still in bed)
    else if (app.game && this.energy?.recovery) this.act('getUp');                 // (a rest the bar outgrew: over)
    this.arrivedAt = this.doorAt(this.x, this.y);        // starting on a door does not take you through it
    this.boatAsked = this.boatSpot()?.z ?? null;           // ...nor does starting at the ship ask
    this.travelling = false;
    this.say(gameName(app.doc));
    document.body.append(this.overlay);
    this.prefetchNext();
    this.keys.clear();
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.offKey, true);
    this.blur = () => this.keys.clear();
    window.addEventListener('blur', this.blur);
    this.on = true;
    this.last = performance.now();
    // (a phone or a tablet with a fast screen -- 120 frames a second -- draws every other one: the same smooth walk for
    //  half the battery; a 90 is left as it is)
    const cap = this.touchUi ? 10 : 0;
    this.loop = (now) => { if (!this.on) return; if (!cap || now - this.last >= cap) this.frame(now); requestAnimationFrame(this.loop); };
    requestAnimationFrame(this.loop);
    if (app.game) this.guardPhone();
    setTimeout(() => this.hud?.classList.add('faded'), 5000);
  }

  stop() {
    if (!this.on) return;
    this.on = false;
    this.skyTester?.remove(); this.skyTester = null;                    // (the map editor's sky tester: game/skytest.js)
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('keyup', this.offKey, true);
    window.removeEventListener('blur', this.blur);
    this.touchPad?.detach(); this.touchPad = null;
    if (this.onBack) window.removeEventListener('popstate', this.onBack);
    if (this.keepAwake) { document.removeEventListener('visibilitychange', this.keepAwake); window.removeEventListener('touchend', this.keepAwake, { capture: true }); }
    try { this.wakeLock?.release(); } catch { /* gone */ }
    this.live?.close(); this.live = null; this.chat = null;
    this.sound?.audio?.setRain?.(0);
    this.sound?.leave();                         // the music fades out; the editor is quiet
    this.overlay?.remove();
    if (TURN.on) applyTurn(false);
    this.turnKey = null;
    this.overlay = this.screen = this.hud = this.where = this.banner = this.ui = this.gameUi = null;
    clearTimeout(this.bannerT);
    // back in the editor, looking at where you walked to
    const app = this.app, v = app.view, r = app.renderer;
    v.x = this.x - r.cssW / (2 * v.zoom); v.y = this.y - r.cssH / (2 * v.zoom);
    app.renderer.request();
    app.emit?.('view');
  }

  key(e, down) {
    if (!this.on) return;
    const app = this.app;
    if (e.target?.closest?.('.play-look')) return;   // choosing a look: the selects keep their keys
    if (e.target?.closest?.('.play-name, .play-name-keys')) return;   // ...and the name box its letters
    if (e.target?.closest?.('.play-chat, .play-admin')) return;   // ...and the chat, and the admin's desk
    if (e.target?.closest?.('.emp, .lb')) return;             // ...and the Emporium and the wallet (a password is typed there), the boards
    // (the dungeon's weapon chooser over everything: its keys first -- game/dungeon.js chooseWeapon)
    if (this.weaponKeys) { e.preventDefault(); this.keys.clear(); if (down && !e.repeat) this.weaponKeys(e.key); return; }
    // (...and the boon cards: over any window that happens to be open, their keys first too)
    if (this.dungeon?.choosing) { e.preventDefault(); this.keys.clear(); if (down && !e.repeat && /^[1-9]$/.test(e.key)) this.dungeon.chooseNth(+e.key - 1); return; }
    e.stopImmediatePropagation();                 // the editor's own keys stay quiet while you play
    if (down) this.sound?.wake();                 // ...so the sound is woken here (a browser waits for a key)
    // (a moment playing, the twelve's or a scene: the world is its own; E or Space hurries a line on)
    if (this.twelve?.playing || this.scenes?.playing) { if (down && /^(e|E| )$/.test(e.key)) this.scenes?.hurry(); e.preventDefault?.(); return; }
    // (the cutscenes' panel: F4 opens and shuts it; while it is open the world waits)
    if (down && e.key === 'F4' && this.theatre?.allowed) { e.preventDefault(); this.keys.clear(); this.theatre.toggle(); return; }
    if (this.theatre?.isOpen) { if (down && e.key === 'Escape') { e.preventDefault(); this.theatre.close(); } return; }
    // the Emporium or the wallet laid over the world (a click in it can leave the page itself with the keys): the world
    // waits, and Escape shuts the one on top
    // (the town's boards: the world waits, and their own keys -- tabs, Escape -- reach them wherever the focus is)
    if (this.leaderboard?.isOpen) { if (down) this.leaderboard.onKey(e); return; }
    if (this.friends?.isOpen) { if (down) this.friends.onKey(e); return; }          // (the friends window: the same)
    const over = this.gameWallet?.box ? this.gameWallet : this.emporium?.box ? this.emporium : null;
    if (over) {
      if (down && e.key === 'Escape') { e.preventDefault(); this.keys.clear(); if (!over.busy) over.close(); }
      return;
    }
    if (down && e.key === 'Escape') {
      e.preventDefault();
      if (this.gameUi?.noticeWaits) { this.gameUi.hideNotice(); return; }   // (a Notice waiting for its OK: Escape is its close)
      if (this.gameUi?.escape()) { this.keys.clear(); return; }     // a window was open: Escape closed it
      if (app.game) { this.keys.clear(); if (this.gameUi?.stack.open('pause')) return; }   // the game: the pause menu, never an editor
      if (!app.game) this.stop();
      return;
    }
    // M: the map, open and shut (testers, 2026-09-29: "the ability to open the map directly by pressing M") -- shut
    // from the map itself; over any other window, that window keeps the key
    if (down && !e.repeat && (e.key === 'm' || e.key === 'M') && this.gameUi?.stack.has('map') && !this.emporium?.box && !this.gameWallet?.box) {
      const S = this.gameUi.stack;
      if (S.top === 'map') { e.preventDefault(); this.keys.clear(); this.gameUi.escape(); return; }
      if (!S.top) { e.preventDefault(); this.keys.clear(); S.open('map'); return; }      // (its sound as it opens: game/ui.js)
    }
    // a window of the interface is open: it has the keys, and the world waits
    if (down && this.gameUi?.windowOpen) { e.preventDefault(); this.keys.clear(); return; }
    // (the dungeon's boon cards: 1, 2 or 3 chooses one; nothing else while they are up)
    // the admin's desk: the backquote key
    if (down && this.adminDesk && e.key === '`' && !e.repeat) { e.preventDefault(); this.keys.clear(); this.adminDesk.toggle(); return; }
    // Enter opens the chat and puts you in its box (only Enter: testers, 2026-09-29 -- "the letter t also opens the
    // game chat, and it should not")
    if (down && this.chat && !e.repeat && e.key === 'Enter') { e.preventDefault(); this.keys.clear(); this.chat.open(); return; }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'Shift', ' ', 'Tab', '?', '/', '-', '=', 'Backspace', 'Delete'].includes(k)) e.preventDefault();
    // (SHIFT DASHES, EVERYWHERE -- 2026-10-28, rules.js DASH -- so it is no walk; Z held is the walk the hero reads as 'Shift',
    //  as a phone's small push and the scenes ask for it)
    if (k === 'Shift') { /* a dash, below */ }
    else if (k === 'z') { if (down) this.keys.add('Shift'); else this.keys.delete('Shift'); }
    else if (down) this.keys.add(k); else this.keys.delete(k);
    // everything but moving is a press: once per press, not per key repeat
    if (!this.hero) return;
    // B: an exclusive weapon's heavy attack (heavyPress) -- the slash and the throw at once, the bow's and the staff's aimed
    // while it is held (at the pointer, else ahead) and let loose as it comes up
    if (k === 'b') { if (down && !e.repeat) { this.hero.x = this.x; this.hero.y = this.y; this.heavyPress('key'); } else if (!down && this.heavyAim?.by === 'key') this.heavyLoose(); return; }
    // SHIFT: a dash (dash), anywhere on foot
    if (k === 'Shift') { if (down && !e.repeat && dashHere(app.doc?.id)) { this.hero.x = this.x; this.hero.y = this.y; this.dash(); } return; }
    if (!down) { this.hero.release(k); return; }
    if (e.repeat) return;
    if (k === '?' || (k === '/' && e.shiftKey)) { this.ui?.toggleHelp(); return; }
    if (k === 'l') { if (app.game) this.gameUi?.stack.open('character'); else this.ui?.toggleLook(); return; }
    if (app.game && (k === 'h' || k === 'k' || k === 'g')) return;   // the editor's test keys: get hurt, faint, a practice slime
    if (this.hero.press(k)) this.ui?.refresh();
  }

  /* ------------------------------------------------------------ home: the chests you bought (commands.js place) */

  /** The chests the player has set down on this map: [{ id, map, x, y }] (x, y: the foot of it). */
  placedHere() { const map = this.app.doc?.id; return placedOf(this.localSave()).filter((c) => c.map === map); }
  /** The one of them at (x, y), if any. */
  placedAt(x, y) { return this.placedHere().find((c) => x >= c.x - 8 && x < c.x + 8 && y >= c.y - 16 && y < c.y + 3) ?? null; }
  /** A chest in hand: where Space would set it down -- in front of you -- and whether it can go there. */
  placeSpot() {
    const h = this.hero, f = h.facing;
    const x = Math.round(this.x + (f === 'left' ? -16 : f === 'right' ? 16 : 0)), y = Math.round(this.y + (f === 'down' ? 20 : f === 'up' ? -12 : 2));
    // (a chest at home; the VIP chest in the VIP Quarter -- commands.js place)
    const vip = this.hero?.held()?.id === VIP_CHEST_ITEM, home = (vip ? VIP_MAPS : HOME_MAPS).has(this.app.doc?.id);
    const clear = home && !this.blocked(x, y - 2, false) && !this.isWater(x, y - 3) && !this.isWater(x - 6, y - 1) && !this.isWater(x + 6, y - 1)
      && !this.placedHere().some((c) => Math.abs(c.x - x) < 16 && Math.abs(c.y - y) < 12);
    return { x, y, home, ok: clear, vip };
  }
  /** What Space says with a chest in hand. */
  placeText() {
    const s = this.placeSpot();
    return !s.home ? { text: s.vip ? 'A VIP chest is set down in the VIP Quarter' : 'A chest is set down at home', ok: false } : s.ok ? { text: 'Space  Set the chest down here', ok: true } : { text: 'No room for a chest there', ok: false };
  }
  /** Space with a chest in hand (hotbar slot `slot`): set it down in front of you, at home. */
  /** THROW AWAY what is in a hotbar slot (Delete: hero.js): asked first, since it is gone for good (commands.js
   *  discard; a quest's things never). Without the interface's question window (the editor's Play), at once. */
  discardAsk(slot, h) {
    const name = `${h.n > 1 ? `${h.n} ` : ''}${h.name ?? h.id}`;
    const go = () => {
      // (what was asked about, and only that: refused if the slot holds something else by the time of the Yes)
      const r = this.act('discard', { i: slot, id: h.id, n: h.n });
      if (!r.ok) { this.say(r.reason ?? 'That cannot be thrown away'); this.sound?.cue('deny'); return; }
      this.sound?.cue('place', { gain: 0.6 });
      this.say(`Threw away ${name}`);
    };
    if (ITEMS[h.id]?.cat === 'quest') { this.say('You may need that yet. A quest\'s things cannot be thrown away'); this.sound?.cue('deny'); return; }
    if (keptFor(this.localSave(), h.id, this.inv, h.n)) { this.say(KEPT_WHY); this.sound?.cue('deny'); return; }      // (what the story keeps: quests.js keepCount)
    if (!this.gameUi?.askYesNo({ question: `Throw away ${name}?`, detail: 'Gone for good. Nobody can get it back.', yes: 'Discard', no: 'Keep', onYes: go })) go();
  }

  placeChest(slot) {
    const s = this.placeSpot();
    if (!s.home) { this.say(s.vip ? 'A VIP chest is set down in the VIP Quarter' : 'A chest is set down at home, on your island or in your cottage'); this.sound?.cue('deny'); return; }
    if (!s.ok) { this.say('No room for a chest there'); this.sound?.cue('deny'); return; }
    const r = this.act('place', { slot, x: s.x, y: s.y, id: this.inv?.at('hotbar', slot)?.id ?? null });
    if (!r.ok) { this.say(r.reason ?? 'Not there'); this.sound?.cue('deny'); return; }
    this.sound?.cue('place');
    this.say('You set the chest down. E opens it (40 slots)');
  }
  /** A chest you set down, closed -- or open while its window is. */
  drawPlaced(g, c, alpha = 1) {
    const A = c.kind === 'vip' || c.vip ? VIP_CHEST_ART : CHEST_ART, rec = this.app.assets.image(A.file);   // (the VIP chest: purple and gold)
    if (rec.state !== 'ok') return;
    const open = alpha === 1 && this.gameUi?.stack?.top === 'storage' && this.gameUi.chest?.id === c.id;
    g.globalAlpha = alpha;
    g.drawImage(rec.img, A.sx, open ? A.openSy : A.sy, 16, 16, Math.round(c.x - 8), Math.round(c.y - 15), 16, 16);
    g.globalAlpha = 1;
  }
  /** With a chest in hand at home: a faint one where Space would set it down. */
  drawPlaceGhost(g) {
    const h = this.hero;
    if (!h || h.mode !== 'foot' || h.pose || ITEMS[h.held()?.id]?.cat !== 'furniture') return;
    const s = this.placeSpot();
    if (s.home && s.ok) this.drawPlaced(g, s, 0.5 + 0.15 * Math.sin(performance.now() / 250));
  }

  /* ------------------------------------------------------------ home: the bed, the chests, the wardrobe */

  /** What there is to use at (x, y) -- a zone tagged bed, chest:<id> or wardrobe, or `look` (a sign, a
   *  landmark: E reads its notes) -- and what Space would do there: { kind, id, name, text, ok, z }, or null. */
  spotAt(x, y) {
    const save = this.localSave();
    const mirror = this.grotto?.spotAt(x, y);                        // (the Mirror Pond's chest, risen: game/grotto.js)
    if (mirror) return mirror;
    // (a boss's loot chest: rules.js BOSS_CHEST -- yours, or anyone's past its hours; another's still in them says when)
    const box = this.lootChestAt(x, y);
    if (box) {
      const wait = this.chestOpensIn(box), whose = box.mine ? 'your' : `${box.owner || 'a farmer'}'s`;
      return { kind: 'loot', chest: box, z: null, name: 'Loot chest', ok: wait <= 0,
        text: wait > 0 ? `This is ${box.owner || 'another farmer'}'s chest. Anyone may open it in ${prizeBackIn(wait)}` : `E  Open ${whose} loot chest` };
    }
    const mine = this.placedAt(x, y);                               // (a chest you set down yourself)
    if (mine) return { kind: 'chest', id: mine.id, z: null, name: 'Chest', text: 'E  Open the chest', ok: true };
    const here = (this.app.doc?.zones ?? []).filter((q) => (q.tags ?? []).some((t) => SPOT.test(t)) && x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h
      && !(COLOSSEUM_OPEN && (q.tags ?? []).includes('closed:colosseum')));   // (the velvet rope's notice, gone once the Colosseum opens)
    // (where zones overlap, the story's first: a puzzle's piece, a clue it wants, what grows wild; then the rest)
    const rank = (q) => { const t = q.tags ?? [], c = t.find((s) => s.startsWith('clue:'))?.slice(5);
      return t.some((s) => s.startsWith('puzzle:')) ? 0 : c && (clueFor(save, c) || clueAgain(save, c)) ? 1 : t.some((s) => s.startsWith('forage:')) ? 2 : 3; };
    const z = here.sort((a, b) => rank(a) - rank(b))[0];
    if (!z) {
      const w = this.wildAt(x, y);
      if (!w || this.storyHides(w.o)) return null;
      const name = { silvercap: 'Silvercap', glowcap: 'Glowcap' }[w.kind] ?? 'Mushroom';
      return { kind: 'forage', o: w.o, z: null, name, text: `E  Pick the ${name}`, ok: true };
    }
    const tags = z.tags ?? [], chest = tags.find((t) => t.startsWith('chest:')), loot = tags.find((t) => t.startsWith('loot:'))?.slice(5);
    if (tags.includes('bed')) return { kind: 'bed', z, name: z.name || 'Bed', ...this.bedText() };
    // THE FARM'S ANIMALS (2026-10-22, game/animals.js): a pen at Hollin's Farm -- its window
    const pen = tags.find((t) => t.startsWith('pen:'))?.slice(4);
    if (pen && Object.hasOwn(ANIMALS, pen) && this.app.game) { const w = ANIMALS[pen].place; return { kind: 'pen', animal: pen, z, name: w, text: `E  ${w.charAt(0).toUpperCase()}${w.slice(1)}`, ok: true }; }
    // A PEDESTAL OF THE CELESTIAL GARDEN (the VIP Quarter, 2026-10-08): empty, with a mining crop in hand -- set it down
    // (commands.js placeCrop); else the garden's panel (game/garden.js: what is mined, Collect, your crops, how rare)
    const ped = tags.find((t) => /^pedestal:\d+$/.test(t))?.slice(9);
    if (ped != null) {
      const mine = save.garden?.[`${this.app.doc.id}:${ped}`], held = this.hero?.held(), w = PREMIUM.crops[held?.id]?.weight;
      // (stacked, 2026-10-28: more of the same kind in hand goes on the same pedestal -- commands.js placeCrop)
      const all = (n, crop) => (n > 1 ? `all ${n} ${crop}` : `the ${crop}`);
      if (mine && w && held.id === mine.crop) return { kind: 'pedestal', ped, z, name: held.id, text: `E  Add ${all(held.n ?? 1, held.id)} here`, ok: true };
      if (mine) return { kind: 'garden', ped, z, name: mine.crop, text: `E  ${(mine.n ?? 1) > 1 ? `${mine.n} ${mine.crop}` : `Your ${mine.crop}`} here, the garden`, ok: true };
      if (w) return { kind: 'pedestal', ped, z, name: held.id, text: `E  Set ${all(held.n ?? 1, held.id)} here`, ok: true };
      return { kind: 'garden', ped, z, name: 'Pedestal', text: 'E  The Celestial Garden', ok: true };
    }
    // A BOOK on a shelf (the VIP Library, 2026-10-08: game/books.js) -- read where it stands, nothing to carry
    const book = BOOKS[tags.find((t) => t.startsWith('book:'))?.slice(5)];
    if (book) return { kind: 'book', book, z, name: book.title, text: `E  Read "${book.title}"`, ok: true };
    // THE VIP SHOP'S COUNTER (2026-10-08): Premium Seeds, bought with ETH or USDG (game/seedshop.js)
    if (tags.includes('shop-counter') && tags.includes('building:vip_shop')) return { kind: 'seedshop', z, name: 'VIP Shop', text: 'E  Buy Premium Seeds', ok: true };
    // THE QUESTS' SPOTS: a puzzle's piece, a clue (a look zone may be one too), a stove, what grows wild
    if (tags.some((t) => t.startsWith('puzzle:'))) return { kind: 'puzzle', z, name: z.name || 'Look', text: 'E  Look', ok: true };
    const clue = tags.find((t) => t.startsWith('clue:'))?.slice(5);
    if (clue && shownFor(z, this.localSave())) {
      // (the Founders' chest: somewhere only the map says, so a place to dig -- for someone carrying the map; and once
      //  found, a chest to open with what the step needs, the pry bar: no map wanted then, and only at their own spot,
      //  where their chest stands -- 2026-10-05, a player: "the Founders' chest cannot be opened; even though a pry bar
      //  is nearby" -- the map put away, nothing was offered)
      const step = clueFor(this.localSave(), clue)?.s;
      if (step?.variant) {
        if (step.needs?.length) {
          const v = (z.tags ?? []).map((t) => /^var:([a-z]+):(\d+)$/.exec(t)).find(Boolean), known = this.localSave().known?.[step.variant];
          return !v || known == null || known === +v[2] ? { kind: 'clue', id: clue, z, name: 'Chest', text: 'E  Open the chest', ok: true } : null;
        }
        return this.inv?.count("Founders' Map") ? { kind: 'clue', id: clue, z, name: 'Dig', text: 'E  Dig here', ok: true } : null;
      }
      return { kind: 'clue', id: clue, z, name: z.name || 'Look', text: /sign|board|notice|log|book/i.test(z.name ?? '') ? 'E  Read' : 'E  Look', ok: true };
    }
    if (tags.includes('gong')) return { kind: 'gong', z, name: z.name || 'The Gong', text: this.colosseum?.gongText() ?? 'E  Strike the gong', ok: true };   // (the Colosseum's: game/colosseum.js)
    if (tags.includes('lever')) return { kind: 'lever', z, name: z.name || 'The lever', text: this.dungeon?.pulled ? 'E  The lever' : 'E  Pull the lever', ok: true };   // (the dungeon's: game/dungeon.js)
    if (tags.includes('cook')) return { kind: 'cook', z, name: z.name || 'Stove', text: 'E  Cook', ok: true };
    // (the kitchen's staples, 2026-10-22: the water mill's flour and sugar, the dairy's cream, butter and cheese -- rules.js STAPLES)
    if (tags.includes('mill')) return { kind: 'cook', place: 'mill', z, name: z.name || 'The water mill', text: 'E  Mill', ok: true };
    if (tags.includes('dairy')) return { kind: 'cook', place: 'dairy', z, name: z.name || 'The dairy', text: 'E  Dairy', ok: true };
    // (THE WORKBENCH, 2026-10-26: Pell's at the Carpenter's, Bram's anvil -- rules.js CRAFTS)
    if (tags.includes('craft')) return { kind: 'cook', place: 'craft', z, name: z.name || 'Workbench', text: 'E  Workbench', ok: true };
    if (tags.includes('loom')) return { kind: 'cook', place: 'loom', z, name: z.name || 'Loom', text: 'E  Loom', ok: true };   // (Tilly's: Cloth)
    const wild = tags.find((t) => t.startsWith('forage:'));
    if (wild) {
      const back = this.localSave().forage?.[`${this.app.doc.id}/${z.id}`] ?? 0;
      return { kind: 'forage', z, name: z.name || 'Mushrooms', text: back > gameNow() ? 'Nothing ripe here yet' : 'E  Pick', ok: back <= gameNow() };
    }
    // A CAVE'S OLD CHEST (rules.js LOOT): what is in it is yours, once
    if (loot) {
      const name = z.name || LOOT[loot]?.name || 'Chest', taken = lootTaken(this.localSave(), loot);
      return { kind: 'loot', id: loot, z, name, text: taken ? 'Empty. You took what was in it' : `E  Open ${name.replace(/^The /, 'the ')}`, ok: !taken };   // (no colon in a player's words: 2026-10-28)
    }
    if (tags.includes('look')) return { kind: 'look', z, name: z.name || 'Look', text: /sign|board|notice|wall|tablet/i.test(z.name ?? '') ? 'E  Read' : 'E  Look', ok: true };   // (the Founders' Wall, the Colosseum's tablet: read)
    if (chest) return { kind: 'chest', id: chest.slice(6), z, name: z.name || 'Chest', text: `E  Open the ${(z.name || 'chest').toLowerCase()}`, ok: true };
    return { kind: 'wardrobe', z, name: z.name || 'Wardrobe', text: 'E  Your clothes (how you look)', ok: true };
  }

  /** May lying down fill the energy now (the day's sleep not used up, the bar not full)? */
  canRestEnergy(now = gameNow()) { return !!this.energy?.canRest(now); }

  /** How long lying down now would take to fill what it fills (server ms): the bar's room or the day's sleep left,
   *  whichever is less, at the sleep's pace (rules.js Energy). */
  restTime(now = gameNow()) { const e = this.energy; return this.restGets(now) / e.sleepRate; }
  /** What lying down now would give: the bar's room or the day's sleep left, whichever is less. */
  restGets(now = gameNow()) { const e = this.energy; return Math.max(0, Math.min(e.max - e.value(now), e.sleepLeft(now))); }

  /** The bed: sleep now -- energy at the sleep's pace until the bar is full or the day's sleep is used up (get up
   *  whenever you like) and, whenever you are hurt, your health back -- or why not. */
  bedText(now = gameNow()) {
    const e = this.energy, hurt = !!this.health?.hurtNow;
    if (!e) return { text: 'E  Rest', ok: true };
    // (TWO WAYS TO SLEEP, 2026-10-23: the bed asks which -- game/bedcard.js -- so its line says what each gives now)
    if (this.bedCard && this.overlay && !e.recovering(now)) {
      // (no colon in a player's line, 2026-10-28)
      if (this.canRestEnergy(now)) return { text: `E  Sleep for energy${hurt ? ' or for health' : ''}`, ok: true };
      if (e.value(now) >= e.max - 0.5) return { text: hurt ? 'E  Sleep for health' : 'E  Bed. Your energy and health are full', ok: true };
      return { text: `E  Sleep${hurt ? ' for health' : ''}. No more sleep for energy today`, ok: true };
    }
    if (this.canRestEnergy(now)) {
      const gets = Math.min(e.max, Math.floor(e.value(now) + this.restGets(now) + 0.5));
      return { text: `E  Sleep for ${gets >= e.max ? 'full energy' : `${gets} energy`} in ${until(now + this.restTime(now), now)}${hurt ? ', health now' : ''}`, ok: true };
    }
    // (2026-10-03, players: "slept, but the energy is not full" -- the day's sleep is used up, and it says so)
    if (hurt) return { text: e.value(now) < e.max - 0.5 && !e.recovering(now) ? 'E  Rest and your health comes back now (no more sleep for energy today)' : 'E  Rest and your health comes back', ok: true };
    if (e.recovering(now)) return { text: `Resting, full energy in ${until(e.recovery.until, now)}`, ok: false };
    if (e.value(now) < e.max - 0.5) return { text: `You have slept all you can for energy today. More in ${until(now + e.bedWait(now), now)} (midnight UTC)`, ok: false };
    return { text: 'Your energy and health are full', ok: false };
  }

  /** Lying down in the bed `sp`: `kind` 'energy' (the long rest, your health with it), 'health' (your health back, as
   *  often as you like), or null (both, as the bed did before it asked). */
  sleepFor(sp, kind) {
    const r = this.act('rest', kind ? { sleep: kind } : {}), rested = !!r.rested, healed = !!r.healed;
    if (!r.ok) { this.say(kind ? r.reason : this.bedText().text); return false; }
    // A REST (2026-09-27, the designer): you lie there as long as it takes -- and after, until you choose to get up
    if (rested) {
      this.hero.sleepIn(this.bedArt(sp.z), Infinity, () => this.risen());
      const end = this.restEnd();
      this.say(`You lie down${healed ? ' and your health comes back' : ''}. ${end == null || end >= this.energy.max ? 'Full energy' : `${end} energy`} in ${until(r.full)}. Get up whenever you like`, 6000);
    } else if (kind === 'health') {
      this.hero.sleepIn(this.bedArt(sp.z));
      this.say('You sleep a while. Your health is back', 5000);
    } else {
      this.hero.sleepIn(this.bedArt(sp.z));
      // (the bed gave no energy: the day's sleep is used up -- say so, so nobody thinks it broke)
      const e = this.energy, now = gameNow();
      this.say(e && e.value(now) < e.max - 0.5 && !e.canRest(now) ? `Your health is back. You have slept all you can for energy today, more at midnight (UTC).${e.regenOn?.(now) ? ` Your energy still comes back by itself, 1 every ${ENERGY.regenMinutes} minutes.` : ''}` : 'You rest. Your health is back', 9000);
    }
    return true;
  }

  /** The bed's own picture inside a bed zone (where to lie), else the zone itself. */
  bedArt(z) {
    for (const l of this.app.doc.layers) for (const o of (l.type === 'objects' ? l.objects : [])) {
      if (!/Beds\.png$/i.test(String(o.asset ?? ''))) continue;
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      if (cx >= z.x && cx < z.x + z.w && cy >= z.y && cy < z.y + z.h) return { x: o.x, y: o.y, w: o.w, h: o.h };
    }
    return { x: z.x, y: z.y, w: z.w, h: z.h };
  }

  /**
   * A QUEST'S THING USED BY HAND WHERE ITS STEP WANTS IT (2026-09-30, players at Mirror Pond: "unable to use the potion
   * near the pond" -- the Clearsight Tonic says "drink it by the water", and Space, a click or a tap only read that
   * out): a clue within reach whose step needs this thing is used, as E on it would. False when there is none.
   */
  useNeeded(id) {
    const save = this.localSave();
    for (const z of this.app.doc?.zones ?? []) {
      const clue = (z.tags ?? []).find((t) => t.startsWith('clue:'))?.slice(5);
      if (!clue || !clueFor(save, clue)?.s?.needs?.some(([n]) => n === id)) continue;
      const dx = Math.max(z.x - this.x, 0, this.x - (z.x + z.w)), dy = Math.max(z.y - this.y, 0, this.y - (z.y + z.h));
      if (Math.hypot(dx, dy) > 40) continue;
      const sp = this.spotAt(z.x + z.w / 2, z.y + z.h / 2);
      if (sp?.kind !== 'clue' || !sp.ok) continue;
      this.hero?.face?.(z.x + z.w / 2, z.y + z.h / 2);
      this.useSpot(sp);
      return true;
    }
    return false;
  }

  /** Space on a spot: lie down and start the recovery; open the chest's window; open the wardrobe. */
  useSpot(sp) {
    if (this.twelve?.playing || this.scenes?.playing) return true;     // (a moment playing: nothing else meanwhile)
    if (sp.kind === 'boat') { this.askToSail(sp.z); return true; }
    // (a boss's loot chest only: a cave's old chest is a 'loot' spot too, with its `id` and no `chest` -- below. From the
    //  13:38 deploy of 2026-10-28 every cave chest came here and opened nothing: "players are unable to open them")
    if (sp.kind === 'loot' && sp.chest) { this.openLootChest(sp.chest); return true; }
    if (sp.kind === 'pen') { (this.penUi ??= new PenWindow(this)).open(sp.animal); return true; }
    if (sp.kind === 'pedestal') { this.atPedestal(sp); return true; }
    if (sp.kind === 'seedshop') { (this.seedShop ??= new SeedShop(this)).open(); return true; }
    if (sp.kind === 'garden') { this.openGarden(); return true; }
    if (sp.kind === 'book') { this.sound?.cue('place', { gain: 0.6 }); this.showPaper(sp.book.title, sp.book.pages); return true; }
    // (THE FOUNDERS' WALL, inside the Founders' Hall since 2026-10-26 -- interior_founders_hall: the Elite Founders' names,
    //  game/foundershall.js; the zone, by its name. The town's door is a door now, into the Hall)
    if (sp.kind === 'look' && (sp.z.name === "The Founders' Wall" || sp.z.name === "The Founders' Hall door") && this.app.game) { (this.hall ??= new FoundersHall(this)).open(); return true; }
    // (THE FOUNDERS' WALK: beside a statue, its Mythic and the name on its plate -- the holder's)
    if (sp.kind === 'look' && sp.z.name === "The Founders' Walk" && this.app.game) {
      const t = statueBeside(this.app.doc, this.x, this.y);
      if (t) { (this.hall ??= new FoundersHall(this)).statue(t); return true; }
    }
    // (THE COLOSSEUM, 2026-10-26: the gong calls the next wave, the tablet keeps your best -- game/colosseum.js)
    if (sp.kind === 'gong') { if (this.colosseum) this.colosseum.strike(); else this.say('Nothing answers here'); return true; }
    if (sp.kind === 'lever') { if (this.dungeon) this.dungeon.pull(); else this.say('It will not move'); return true; }
    if (sp.kind === 'look' && (sp.z.tags ?? []).includes('dgatelook') && this.dungeon) { this.say(this.dungeon.gateText(), 3600); return true; }
    if (sp.kind === 'look' && sp.z.name === 'The Wave Tablet' && this.colosseum) { const t = this.colosseum.tabletText(); this.say(t, Math.min(9000, 2200 + t.length * 45)); return true; }
    if (sp.kind === 'look') { const t = sp.z.notes || sp.z.name || ''; this.say(t, Math.min(9000, 2200 + t.length * 45)); return true; }
    if (sp.kind === 'clue') {
      // a quest waiting on it (or still wanting its words): what you find, as the server reads it (quest.inspect:
      // a player's own numbers are the server's to say); otherwise it is only a look
      const want = clueFor(this.localSave(), sp.id) ?? clueAgain(this.localSave(), sp.id);
      if (want) { this.inspect(sp, want); return true; }
      // (the moonstone's hollow, for a farmer short of the Founders' fruit: the server has two more seeds -- quests.js foundersShort)
      if (sp.id === 'token_hollow' && foundersShort(this.localSave())) { this.inspect(sp, { s: { place: 'The Moonstone Circle' } }); return true; }
      // (2026-10-27, the Season 0 audit: a clue's notes are often the designer's own, "Book One, chapter 12: Otto's
      //  round", saying where the story uses it, and a farmer pressing E at the jetty lamp with no step wanting it was
      //  shown just that. Words for a player never carry a colon, so a note with one is the designer's: an ordinary look)
      const own = sp.z.notes && !sp.z.notes.includes(':') ? sp.z.notes : '';
      const t = own || 'Nothing out of the ordinary.';
      this.say(t, Math.min(9000, 2200 + t.length * 45));
      return true;
    }
    if (sp.kind === 'puzzle') { this.touch(sp); return true; }
    if (sp.kind === 'cook') {
      if (this.gameUi?.openCook(sp.place ?? 'cook')) { this.keys.clear(); return true; }
      this.say('The stove needs the game\'s interface, which is not loaded here');
      return false;
    }
    if (sp.kind === 'forage') {
      const r = this.act('forage', sp.o ? { object: sp.o.id } : { zone: sp.z.id });
      if (!r.ok) { this.say(r.reason); this.sound?.cue('deny'); return false; }
      this.sound?.cue('pickup');
      this.say(r.bonus ? `You pick two ${r.got}s, a lucky find` : `You pick a ${r.got}`);
      return true;
    }
    if (sp.kind === 'grotto') {
      if (!sp.ok) { this.say(sp.text); return false; }
      this.grotto?.open();
      return true;
    }
    if (sp.kind === 'loot') {
      if (!sp.ok) { this.say(sp.text); return false; }
      const r = this.act('loot', { id: sp.id });
      if (!r.ok) { this.say(r.reason); this.sound?.cue('deny'); return false; }
      const names = r.got.map(([item, n, st]) => {
        if (!item.startsWith('tool:')) return `${n} ${item}`;
        const it = itemInfo(item, '', {}, st ?? {});
        // (an uncommon sword, an epic bow: 2026-10-28, the launch audit -- "a uncommon")
        const what = it?.weapon ? `${(it.rarityName ?? '').toLowerCase()} ${it.name.toLowerCase()}`.trim() : (it?.name ?? item.slice(5)).toLowerCase();
        return `${/^[aeiou]/.test(what) ? 'an' : 'a'} ${what}`;
      });
      this.sound?.cue('chestOpen'); this.sound?.cue('pickup', { gain: 0.7 });      // (a cave's old chest creaks open, 2026-10-27)
      // (the finds as a sentence, no colon -- a player's words: 2026-10-28, the launch audit)
      this.say(`You found ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? 'nothing'}`, 5200);
      return true;
    }
    if (sp.kind === 'bed') {
      // (TWO WAYS TO SLEEP, 2026-10-23: the bed asks -- energy or health -- game/bedcard.js; with no card, as before)
      if (this.bedCard?.open(sp)) return true;
      return this.sleepFor(sp, null);
    }
    if (sp.kind === 'chest') {
      if (this.gameUi?.openChest({ id: sp.id, name: sp.name })) { this.keys.clear(); return true; }      // (its lid heard as its window opens: game/ui.js)
      this.say('The chest opens in the game\'s interface, which is not loaded here');
      return false;
    }
    if (this.gameUi?.stack.open('character')) { this.keys.clear(); return true; }
    this.ui?.toggleLook();
    return true;
  }

  /* ------------------------------------------------------------ the Founding Farmers' clues, puzzles and papers */

  /** Are the town's children home (outside KIDS_OUT, by the world's clock -- or in out of the rain)? */
  kidsAway() { const h = worldTime(gameNow()).hour; return h < KIDS_OUT[0] || h >= KIDS_OUT[1] || !!this.keptIn; }
  /** Is any of the children who cannot walk (game/ambient.js stillKids) on screen? */
  stillKidsSeen() {
    const x0 = this.cam.x - 16, y0 = this.cam.y - 16, x1 = this.cam.x + this.vw + 16, y1 = this.cam.y + this.vh + 16;
    return (this.world?.stillKids ?? []).some((o) => { const b = o.rot ? bounds(o) : o; return b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0; });
  }
  /** Are the townsfolk on this map in (by night, in the rain: keptIn -- all but STAY_OUT)? 'night', 'rain' or null. */
  folkIn() { return this.keptIn ?? null; }
  /** THE TOWNSFOLK A QUEST WAITS ON (2026-10-23, a tester stuck on "Ask Rosa about the twelve" at night -- she reads out by
   *  the river, and by night and in the rain nobody is out): whoever this farmer's quest steps ask them to talk to, give
   *  to or bring something to stays out for them in any weather, as Marlow does (STAY_OUT). Asked again every few seconds. */
  questFolk() {
    const now = performance.now();
    if (this.qfAt && now - this.qfAt < 3000) return this.qf;
    this.qfAt = now;
    const out = new Set();
    for (const [id, rec] of Object.entries(this.localSave()?.quests ?? {})) {
      const q = !rec?.done && QUEST[id], st = q && stepOf(q, rec);
      if (!st) continue;
      if (st.npc) out.add(st.npc);
      for (const part of st.parts ?? []) if (part?.npc) out.add(part.npc);
    }
    return (this.qf = out);
  }
  /** Is this map object one of the story's things that is not there for this player now? */
  storyHides(o) {
    const save = this.localSave(), map = this.app.doc?.id, now = gameNow();
    if (this.wilds?.has(o) && (save.forage?.[`${map}/${o.id}`] ?? 0) > now) return true;
    return !!o.tags && !objectShown(o, save, map, now);
  }
  /** A wild thing at (x, y) -- a mushroom you could pick -- or null. */
  wildAt(x, y) {
    for (const [o, kind] of this.wilds ?? []) if (x >= o.x - 3 && x < o.x + o.w + 3 && y >= o.y - 3 && y < o.y + o.h + 5) return { o, kind };
    return null;
  }
  /**
   * AT A PEDESTAL OF THE CELESTIAL GARDEN (2026-10-08): with a mining crop in hand on an empty one, it is set down
   * (placeCrop: from then on it mines -- world2.js garden). Collecting what it mined, and taking it back (takeCrop: to
   * trade it, say -- it stops mining), are the garden's panel's (game/garden.js): E at your own pedestal opens it.
   */
  atPedestal(sp) {
    const map = this.app.doc.id;
    const r = this.act('placeCrop', { map, pedestal: sp.ped, slot: this.hero.slot, id: this.hero.held()?.id });
    if (!r.ok) { this.say(r.reason); return; }
    this.sound?.cue('magicCast');
    this.say(r.n > 1 ? `${r.n} ${r.crop} stand on this pedestal now, each one harvesting $AVYN` : `Your ${r.crop} stands in the Celestial Garden. It harvests $AVYN now`, 4200);
  }

  /** The garden's crops on their pedestals (each farmer sees their own, as their fields): drawn standing on the
   *  pedestal's top (the zone's), with their auras. */
  gardenMovers(rect) {
    const garden = this.localSave().garden, out = [];
    if (!garden) return out;
    const map = this.app.doc.id, now = gameNow();
    for (const z of this.app.doc.zones ?? []) {
      const ped = (z.tags ?? []).find((t) => /^pedestal:\d+$/.test(t))?.slice(9);
      const c = ped != null ? garden[`${map}:${ped}`] : null, s = c ? SEEDS.find((q) => q.name === c.crop) : null;
      if (!s || z.x > rect.x1 || z.x + z.w < rect.x0 || z.y > rect.y1 || z.y + z.h < rect.y0 - 40) continue;
      const [sx, sy, w, h] = s.stages[s.stages.length - 1], fx = Math.round(z.x + z.w / 2), fy = Math.round(z.y + 6), aura = PREMIUM.crops[c.crop]?.aura;
      out.push({ y: z.y + z.h - 8 + 0.5, draw: (g) => {
        const rec = this.app.assets.image(s.sheet);
        if (aura) premiumAura(g, aura, fx, fy - 6, now, +ped, true);
        if (rec?.state === 'ok') g.drawImage(rec.img, sx, sy, w, h, fx - 8, fy - h, w, h);
        if (aura) premiumAura(g, aura, fx, fy - 6, now, +ped, false);
        // (a stack: how many, at the crop's foot like a stack's count in the hands -- commands.js placeCrop, 2026-10-28;
        //  over the sprite it stood in the empty top of the picture, far from the crop)
        if ((c.n ?? 1) > 1) {
          const t = `x${c.n}`;
          g.save(); g.font = 'bold 9px monospace'; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.lineWidth = 3; g.lineJoin = 'round'; g.strokeStyle = '#2b1d10'; g.fillStyle = '#ffe9a8';
          g.strokeText(t, fx + 3, fy + 1); g.fillText(t, fx + 3, fy + 1); g.restore();
        }
      } });
    }
    return out;
  }

  /** The server's answer to a clue, a puzzle, a paper (commands.js ASKED): asked once at a time. */
  async askStory(name, args) {
    if (this.asking) return null;
    this.asking = true;
    try { return await this.session.ask(name, args); } finally { this.asking = false; }
  }
  /** Words in the dialogue box (or, without one, over the head). */
  story(title, lines, last) {
    if (!lines?.length) return;
    if (this.gameUi?.openStory(title, lines, last)) this.keys.clear();
    else this.say(lines.join(' '), 9000);
  }
  /** A clue looked at: the server reads it (and the story moves on). */
  async inspect(sp, want) {
    // (a clue with a moment of its own -- a scene, the twelve's -- waits until the creatures about are dealt with: foesNear)
    if ((want?.s?.scene || sp.id === 'pavement') && this.foesNear({ x: sp.z.x + sp.z.w / 2, y: sp.z.y + sp.z.h / 2 })) { this.clearFirst(true); return; }
    const r = await this.askStory('quest.inspect', { clue: sp.id, zone: sp.z.id });
    if (!r) return;
    if (!r.ok) { this.say(r.reason); this.sound?.cue('deny'); return; }
    if (r.nothing && !r.lines) { const t = sp.z.notes || 'Nothing out of the ordinary.'; this.say(t, Math.min(9000, 2200 + t.length * 45)); return; }
    // (the heart of the old pavement, all twelve awake: the moment first, then its words -- game/twelve.js)
    if (sp.id === 'pavement' && r.quest && !r.wrong && !r.again && this.twelve) {
      this.twelve.play(() => { this.story(want.s.place ?? sp.name, r.lines ?? []); this.questMoved(r); });
      return;
    }
    // (a clue with a moment of its own, book1.js `scene`: the scene first, then its words -- game/cutscenes.js)
    const scene = r.quest && !r.wrong && !r.again && !r.nothing ? SCENES[want?.s?.scene] : null;
    const spot = { at: { x: sp.z.x + sp.z.w / 2, y: sp.z.y + sp.z.h / 2 } };
    if (scene && this.scenes?.play(scene, () => { this.story(want.s.place ?? sp.name, r.lines ?? []); this.questMoved(r); }, spot)) { this.sound?.cue('pickup'); return; }
    this.sound?.cue(r.wrong ? 'deny' : r.quest ? 'pickup' : 'place');
    this.story(want.s.place ?? sp.name, r.lines ?? []);
    if ((r.quest && !r.wrong && !r.nothing && !r.again) || r.refill) this.clueMagic(sp);
    if (r.quest) this.questMoved(r);
  }
  /** THE QUESTS' MAGIC (the designer, 2026-09-29: "it should feel magical... but shouldn't feel out of the world";
   *  game/magic.js): what the old magic touched, looked at -- the tonic drunk at the pond, the shrine, a find. */
  clueMagic(sp) {
    const id = sp.id, z = sp.z, mid = [z.x + z.w / 2, z.y + z.h / 2], water = (x, y) => this.isWater(x, y);
    if (id === 'pond_reflection') this.magic?.cast('tonic', this.x, this.y, { water, at: this.waterNear(this.x, this.y, 110) ?? mid });
    else if (id === 'shrine_socket') { const o = this.pieceOf(z); this.magic?.cast('shrine', o ? o.x + o.w / 2 : mid[0], o ? o.y + o.h * 0.6 : mid[1]); }
    else if (MAGIC_FINDS.has(id)) this.magic?.cast('glint', mid[0], mid[1]);
    // (Book One, chapter 16: one of the twelve woken -- a glint of their colour where the stone stood; the old pavement
    //  without them, as it was: every colour, into the farmer)
    else if (/^shade_\d+$/.test(id)) { const k = +id.slice(6); this.magic?.cast('glint', mid[0], mid[1] - 8); this.magic?.glow(mid[0], mid[1], 30, 0.45, 1.6, 0, TWELVE_LIGHT(k)); }
    else if (id === 'pavement') { this.magic?.cast('rainbow', mid[0], mid[1], { r: 80, to: [this.x, this.y] }); this.sound?.shimmer?.('long'); return; }   // (its ring: 80 px out)
    else return;
    this.sound?.shimmer?.(id === 'pond_reflection' ? 'long' : 'short');
  }
  /** The middle of the open water within `r` of (x, y) -- the pond you stand by -- or null. */
  waterNear(x, y, r) {
    let sx = 0, sy = 0, n = 0;
    for (let dy = -r; dy <= r; dy += 8) for (let dx = -r; dx <= r; dx += 8) if (dx * dx + dy * dy <= r * r && this.isWater(x + dx, y + dy)) { sx += x + dx; sy += y + dy; n++; }
    return n ? [sx / n, sy / n] : null;
  }
  /** Something handed over that the old magic is in (ui.js, the moment it is taken): Juniper's brew, Marven's thanks. */
  handedMagic(r, p) {
    if (!p) return;
    if ((r.gave ?? []).some(([id]) => id === 'Clearsight Tonic')) {
      // ("Stir, stir, and... there": off the rim of her pot on the fire, else over her counter)
      const pot = (this.app.doc?.layers ?? []).flatMap((l) => (l.type === 'objects' ? l.objects : [])).find((o) => /Kitchen pot|cauldron/i.test(o.asset ?? ''));
      this.magic?.cast('brew', pot ? pot.x + pot.w / 2 : p.x, pot ? pot.y + pot.h * 0.3 : p.y + 14);
      this.sound?.shimmer?.('short');
    }
    else if (r.founding) { this.magic?.cast('blessing', p.x, p.y, { water: (x, y) => this.isWater(x, y) }); this.sound?.shimmer?.('long'); }
  }
  /** A puzzle's piece: what it is (the server says), and what may be done to it. */
  async touch(sp) {
    const r = await this.askStory('quest.touch', { zone: sp.z.id });
    if (!r) return;
    if (!r.ok) { this.say(r.reason); return; }
    const answer = (a) => async () => {
      const q = await this.askStory('quest.answer', { zone: sp.z.id, answer: a });
      if (!q) return;
      if (!q.ok) { this.story(sp.name, [q.reason]); this.sound?.cue('deny'); return; }
      if (q.puzzle === 'circle') {
        const k = +(/^puzzle:circle:(\d+)$/.exec((sp.z.tags ?? []).find((t) => t.startsWith('puzzle:circle:')) ?? '')?.[1] ?? 0);
        if (q.solved || q.wrong || q.woke) this.stoneFx(k, q.solved ? 'open' : q.wrong ? 'sleep' : 'wake');
        if (!q.solved && !q.wrong) { this.gameUi?.stack?.close?.(); this.keys.clear(); this.say(q.lines?.[0] ?? '', 3200); return; }
      } else this.sound?.cue(q.wrong ? 'deny' : q.solved ? 'pickup' : 'place');
      this.story(sp.name, q.lines ?? []);
      if (q.solved) this.questMoved(q);
    };
    const leave = ['Leave it', 'bye'];
    const last = r.can === 'press' ? [['Press it', answer('press')], leave]
      : r.can === 'search' ? [['Search its hands', answer('search')], leave]
      : r.can === 'code' ? [['Turn the dial', () => { this.gameUi?.stack?.close?.(); this.askCode(r.digits ?? 4).then((code) => code && answer(code)()); }], leave]
      : [['Okay', 'bye']];
    this.story(sp.name, r.lines, last);
  }
  /** The strongbox's dial: four numbers, each 1 to 9. The code, or null when the player walks away. */
  askCode(digits) {
    return new Promise((done) => {
      const wheels = Array.from({ length: digits }, () => 1);
      let row;
      const draw = () => { row.replaceChildren(...wheels.map((v, i) => el('div.play-dial-wheel', {},
        el('button', { type: 'button', onclick: () => { wheels[i] = v % 9 + 1; draw(); } }, '\u25B2'),
        el('div.play-dial-n', {}, String(v)),
        el('button', { type: 'button', onclick: () => { wheels[i] = ((v + 7) % 9) + 1; draw(); } }, '\u25BC')))); };
      const box = el('form.play-name.play-dial', {},
        el('div.play-name-q', {}, 'Haskett\'s strongbox: four numbers on the dial.'),
        row = el('div.play-dial-row'),
        el('div.play-dial-keys', {}, el('button', { type: 'button', onclick: () => close(null) }, 'Leave it'), el('button', { type: 'submit' }, 'Try it')));
      const close = (v) => { box.remove(); this.keys.clear(); done(v); };
      box.addEventListener('submit', (e) => { e.preventDefault(); close(wheels.join('')); });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(null); }
        if (/^[1-9]$/.test(e.key)) { const i = box.dialAt ?? 0; wheels[i] = +e.key; box.dialAt = (i + 1) % digits; draw(); }
      });
      draw();
      this.overlay.append(box);
      setTimeout(() => box.querySelector('button[type=submit]')?.focus(), 30);
    });
  }
  /** A quest's thing in hand (Space): a paper is read (the server's words: a player's own verse, numbers, map),
   *  anything else turned over. */
  async readItem(id) {
    const d = QUEST_ITEMS[id];
    this.sound?.cue('bookPage');
    if (!d?.read) { this.say(d?.about ?? id, 6000); return; }
    const r = await this.askStory('quest.read', { item: id });
    if (!r) return;
    if (!r.ok) { this.say(r.reason); return; }
    this.sound?.cue('place', { gain: 0.6 });
    this.showPaper(id, r.pages, r.picture);
  }
  /** A paper, open: its words, and a drawing (the Founders' Map). */
  showPaper(title, pages, picture = null) {
    this.paper?.remove();
    const close = () => { box.remove(); this.paper = null; this.keys.clear(); };
    const box = el('div.play-paper', { tabindex: '-1' },
      el('div.play-paper-title', {}, title),
      picture ? el('img.play-paper-pic', { src: packURL(picture), alt: title }) : '',
      el('div.play-paper-text', {}, ...pages.map((p) => el('p', {}, p))),
      el('button', { type: 'button', onclick: close }, 'Put it away'));
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === ' ' || e.key === 'e') { e.preventDefault(); e.stopPropagation(); close(); } });
    this.paper = box;
    this.overlay.append(box);
    setTimeout(() => box.focus(), 30);
  }

  /* ------------------------------------------------------------ the rules, and the server that owns them */

  /** The session: the game's, talking to the server (game/session.js), else this editor's own. */
  get session() { return this.app.session ?? (this.localSession ??= Object.assign(new LocalSession(this.localSave()), { ctxOf: () => this.rulesCtx() })); }
  /** The save the rules act on: the server's (the game), else a small one of this editor's own. */
  localSave() { return saveDoc() ?? (this.editorSave ??= { where: this.app.doc?.id }); }
  /** What the shared rules act on: the save, and this Play's own views of it -- what the player sees. (Not
   *  `ctx`: that is the world canvas's drawing context.) */
  rulesCtx() {
    const app = this.app, doc = app.doc;
    // (an admin goes through the caves' locked doors -- in the editor the designer is always one: the master prompt)
    return { now: gameNow(), player: { id: app.player?.id ?? 'editor', name: app.player?.name ?? '', named: app.game ? app.player?.named !== false : true,
      admin: app.game ? !!app.player?.admin : true, unlimited: !!(app.game && app.player?.admin) }, save: this.localSave(),
      inv: this.inv, energy: this.energy, health: this.health,
      // the map you stand on is this Play's; another is only known to exist (the server knows them all)
      map: (id) => (id === doc.id ? { doc, farm: this.farm, nodes: this.nodes } : { doc: null, farm: null, nodes: null }),
      start: app.world?.start ?? doc.id };
  }
  /** Do an action by the shared rules (game/commands.js): here at once, and on the server. */
  act(name, args = {}) {
    const r = this.session.act(name, args, this.rulesCtx());
    this.ui?.refresh?.();
    // a life skill a level up (game/commands.js skillXpOf: every skill with an action earns, 2026-10-01)
    // -- and a harvest's, Farming's: the level's card says what it gave and opened (game/skillbook.js, 2026-10-26: Farming 8's
    // animals among them)
    if (r?.ok && r.skillXp?.levelUp) this.levelCard?.show(r.skillXp.skill, r.skillXp.levelUp);
    if (r?.ok && name === 'harvest' && r.levelUp) this.levelCard?.show('farming', r.levelUp);
    // (THE THREE LEVELS, 2026-10-21 -- catalog.js skillCap: a skill held at three above the lowest says which, once a minute)
    const heldBy = r?.ok ? (r.skillXp?.held ? [r.skillXp.skill, r.skillXp.held] : r.held ? ['farming', r.held] : null) : null;
    if (heldBy && performance.now() - (this.heldSaid ?? -1e9) > 60000) {
      this.heldSaid = performance.now();
      // (said so anyone understands it, the designer, 2026-10-26: skills grow together, never more than three levels apart --
      //  and the level the one holding it back must reach; held by Crafting, where it is earned: the workbenches)
      const need = levelOf(this.localSave()?.skills?.[heldBy[0]] ?? 0) + 1 - SKILL_GAP;
      const where = heldBy[1] === 'crafting' ? " at Pell's workbench (the Carpenter's) or Bram's anvil (the Forge)" : '';
      this.gameUi?.notify?.(`${SKILL_TITLES[heldBy[0]] ?? 'This skill'} can't go higher yet. Your skills grow together, never more than ${SKILL_GAP} levels apart. Raise your ${SKILL_TITLES[heldBy[1]] ?? 'other skills'} to level ${need}${where}`);
    }
    if (r?.ok && (r.quests || r.quest || r.ready)) this.questMoved(r);
    return r;
  }

  /* ------------------------------------------------------------ lucky Shards (world2.js #luck) */

  /**
   * A LUCKY SHARD (the designer, 2026-09-30: "it will show on screen as a small shard being earned"): the server rolled
   * it with a harvest, a catch, a seam, a tree or a mushroom. The shard springs up over the farmer with its number,
   * hangs a moment, and flies to the Shards in the HUD's purse.
   */
  luckyShard(d, lucky = true) {
    const n = Math.max(1, d?.shards | 0);
    (this.shardFx ??= []).push({ t0: performance.now(), n, landed: false });
    this.sound?.cue(this.sound?.has?.('shardGain') ? 'shardGain' : 'magicCast', { gain: 0.7 });
    if (lucky) this.gameUi?.notify?.(`Lucky! +${n} Averyn Shard${n > 1 ? 's' : ''}`);
    this.shardImg ??= Object.assign(new Image(), { src: packURL('art:avyn-shard-32.png') });
  }

  /** The lucky Shards in flight, on the interface's canvas (its pixels: the farmer at gameUi.anchor). */
  drawShards(g) {
    const list = this.shardFx;
    if (!list?.length || !this.gameUi?.anchor) return;
    const img = this.shardImg, a = this.gameUi.anchor, now = performance.now();
    const boxShards = this.gameUi.boxOf?.('hud', 'Shards'), boxGold = this.gameUi.boxOf?.('hud', 'Gold');
    const at = (box) => (box ? { x: box.x + 8, y: box.y + box.h / 2 } : { x: a.w - 100, y: 70 });
    const head = { x: a.x, y: a.y - 26 * a.k };
    // (Gold's coin: the HUD's own, UI/HUD.png -- the same one the Emporium shows)
    const hud = this.app.assets?.image?.('UI/HUD.png');
    for (const f of list) {
      const gold = f.kind === 'gold', to = at(gold ? boxGold : boxShards);
      const t = (now - f.t0) / 1000, UP = 0.55, HOLD = 0.35, FLY = 0.6;
      let x, y, sz, alpha = 1;
      if (t < UP) {                                                     // springs up over the farmer, overshooting a little
        const e = t / UP, ease = 1 - (1 - e) ** 3;
        x = head.x; y = head.y - 22 * ease + Math.sin(e * Math.PI) * -6; sz = 8 + 10 * Math.min(1, e * 1.4);
      } else if (t < UP + HOLD) {                                       // hangs there, bobbing, with its number
        x = head.x; y = head.y - 22 + Math.sin((t - UP) * 14) * 1.2; sz = 18;
      } else if (t < UP + HOLD + FLY) {                                 // flies to the purse, shrinking
        const e = (t - UP - HOLD) / FLY, ease = e * e * (3 - 2 * e);
        const sx = head.x, sy = head.y - 22, mx = (sx + to.x) / 2, my = Math.min(sy, to.y) - 30;
        x = (1 - ease) ** 2 * sx + 2 * (1 - ease) * ease * mx + ease ** 2 * to.x;
        y = (1 - ease) ** 2 * sy + 2 * (1 - ease) * ease * my + ease ** 2 * to.y;
        sz = 18 - 8 * ease; alpha = 1 - 0.3 * ease;
      } else {
        if (!f.landed) { f.landed = true; this.sound?.cue('pickup', { gain: 0.7 }); }
        continue;
      }
      g.save();
      g.globalAlpha = alpha;
      // (a soft glow behind it)
      const glow = g.createRadialGradient(x, y, 0, x, y, sz);
      const tint = gold ? '255,210,90' : '150,220,255';
      glow.addColorStop(0, `rgba(${tint},0.55)`); glow.addColorStop(1, `rgba(${tint},0)`);
      g.fillStyle = glow; g.beginPath(); g.arc(x, y, sz, 0, Math.PI * 2); g.fill();
      if (gold) { if (hud?.state === 'ok') { g.imageSmoothingEnabled = false; g.drawImage(hud.img, 144, 80, 16, 16, Math.round(x - sz / 2), Math.round(y - sz / 2), Math.round(sz), Math.round(sz)); } }
      else if (img?.complete && img.naturalWidth) g.drawImage(img, Math.round(x - sz / 2), Math.round(y - sz / 2), Math.round(sz), Math.round(sz));
      if (t < UP + HOLD) {
        const label = `+${f.n}`;
        g.font = 'bold 9px monospace'; g.textBaseline = 'middle';
        g.lineWidth = 3; g.strokeStyle = gold ? '#4b2507' : '#1a1d4c'; g.strokeText(label, Math.round(x + sz / 2 + 2), Math.round(y));
        g.fillStyle = gold ? '#ffe39a' : '#bfe8ff'; g.fillText(label, Math.round(x + sz / 2 + 2), Math.round(y));
      }
      g.restore();
    }
    this.shardFx = list.filter((f) => (now - f.t0) / 1000 < 1.6);
  }

  /* ------------------------------------------------------------ the quests (game/quests.js) */

  /** The story moved: the people it moves, a reward to claim, the golden moment. */
  questMoved(r = {}) {
    this.sound?.cue('questUpdate', { gain: 0.8 });                     // (a step done: a soft chime, 2026-10-21)
    // (the people it moves move once the conversation is over: nobody vanishes mid-sentence)
    if (this.gameUi?.windowOpen) this.folkStale ||= true; else this.folk?.refresh();
    if (r.founding) this.golden(r);
    if (readyOf(this.localSave()).length) this.claimQuests();
  }
  /** Quests done and waiting for their reward: claimed from the server, one by one (quest.turnIn). */
  async claimQuests() {
    if (this.claiming) return;
    this.claiming = true;
    try {
      for (const q of readyOf(this.localSave())) {
        const r = await this.session.ask('quest.turnIn', { quest: q.id });
        if (!r.ok) {
          // (2026-10-07, players: "I completed everything but it still shows in progress" -- a reward that could not be given
          // was never said; the quest stays in progress until it is: once a visit, why)
          if (!(this.claimSaid ??= new Set()).has(q.id)) { this.claimSaid.add(q.id); this.gameUi?.notify(`${q.name} is done, but its reward could not be given yet: ${r.reason ?? 'please try again'}`); }
          break;
        }
        const got = [r.gold ? `${r.gold} Gold` : '', r.shards ? `${r.shards} Averyn Shards` : '', ...(r.gave ?? []).map(([id, n, st]) => {
          const it = itemInfo(id, '', {}, st ?? {});
          return `${n > 1 ? `${n} ` : ''}${it?.weapon ? `${it.rarityName ?? ''} ${it.name}`.trim() : it?.name ?? id}`;
        })].filter(Boolean);
        this.gameUi?.notify(`Quest complete! ${q.name}${got.length ? `. You got ${got.join(', ')}` : ''}`);
        if (r.home) this.gameUi?.notify('No room on you, so the rest of the reward is in your chest at home');
        this.sound?.cue('questComplete');
        if (r.shards) this.luckyShard({ shards: r.shards }, false);
        // (the first 1,000 to finish the story: the Founders' own reward, world2.js #founded)
        if (r.foundingShards) this.gameUi?.notify(`You're one of the first 1,000 Founding Farmers! +${r.foundingShards} Averyn Shards`);
        if (r.founding) this.golden(r);
      }
    } finally { this.claiming = false; if (this.gameUi?.windowOpen) this.folkStale ||= true; else this.folk?.refresh(); }
  }
  /**
   * THE TOWN, SHARED (2026-09-27): the socket to server/live2.js -- the other players drawn among the things on the
   * map, in their own looks -- and the global chat (game/chat.js) over the game.
   */
  /** THE TOWNS (game/towns.js, server/live2.js TOWNS): the town this sign-in chose, or one chosen now. A server that does not
   *  answer: the shared town joined as before (it puts the farmer in its emptiest town). */
  async chooseTown() {
    const t = await townsNow();
    if (!t?.towns || t.mine) { this.town = t?.mine ?? null; return; }
    await new Promise((done) => {
      this.townWin = new TownWindow(this, t, (n) => { this.town = n; this.townWin = null; done(); });
      if (!this.townWin.open()) { this.townWin = null; done(); }
    });
  }
  goLive(image) {
    const app = this.app, files = this.files ??= new Set(app.assets.fileByPath.keys());
    const rigs = new Map();
    // (a Founding Farmer -- `fd`, the server's word -- drawn as one, with its aura: villager.js setFounder)
    const rigFor = (look, fd = null) => {
      const key = JSON.stringify([look ?? {}, fd?.n ?? 0, fd?.set ?? null]);
      let r = rigs.get(key);
      if (!r) {
        if (rigs.size > 64) rigs.delete(rigs.keys().next().value);
        r = new Villager([...files], image, { ...DEFAULT_LOOK, ...(look ?? {}) });
        if (fd?.look) r.setFounder(fd);
        rigs.set(key, r);
      }
      return r;
    };
    this.rigFor = rigFor;                                           // (the friends window draws farmers with it: game/friends.js)
    const url = new URL('/play/live', location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.chat = null;
    this.live = new LiveClient({ url: url.href, rigFor, lift: (r) => this.stoneHop(r), water: (x, y) => this.isWater(x, y), petImage: (p) => this.app.assets.image(p), on: {
      chat: (c) => { this.chat?.receive(c); this.chatBubbles(c); this.chatTicker(c); },
      note: (text) => { if (this.chat?.isOpen) this.chat.note(text); else this.say(text, 4000); },
      status: (online) => this.chat?.status(online, this.live?.channel),
      // (the admin's desk changed this save -- a gift, a full bar, a quest moved on: the server's copy is taken)
      save: (save, why, applied) => {
        this.session?.adopt?.(save, null, applied);
        if (why === 'trade') return;                             // (a trade says so itself: game/ui.js tradeHeard)
        if (why === 'crypto' && this.gameUi?.cryptoPaying) return;  // (a payment being watched says so itself)
        this.gameUi?.notify({ gift: 'An admin sent you a gift', refill: 'Your energy was filled up', give: 'An admin gave you energy', quest: 'Your quests were moved on', jump: 'An admin finished your quest for you. The reward is yours',
          crypto: 'What you paid for in crypto has arrived', grant: 'A gift for every farmer, 10 carrot seeds', tools: 'Your missing farm tools are back, on your hotbar or in your backpack, or in the chests in your cottage if those were full', vip: 'You are VIP now. Enjoy the VIP Quarter' }[why] ?? 'Your game was updated');
        this.sound?.cue(/^(gift|grant|give|crypto)$/.test(why) ? 'gift' : 'pickup');
        // (a jump that reached the story's last chapter left it for this game to hand in: the end screen opens -- claimQuests)
        if (why === 'jump' && readyOf(this.localSave()).length) this.claimQuests();
      },
      trade: (m) => this.gameUi?.tradeHeard?.(m),
      friend: (m) => this.friends?.heard(m),                     // a friend request, a new friend (server/friends.js)
      inbox: (m) => this.inbox?.heard(m),                        // a new message in the inbox (server/inbox.js)
      crypto: (m) => this.gameUi?.cryptoHeard?.(m),
      // a Founding Farmer: the one you play as, as the server has it; your farmers changed hands -- asked again
      founder: (fd) => { this.rig.setFounder(fd); this.preloadRig(); },
      founders: () => this.loadFounders(),
      notice: (n, now) => this.setNotice(n, now),                // an update on its way: the line across the top (drawTicker)
      message: (m, now) => this.setMessage(m, now),              // the admin's message for everyone: the same line (drawTicker)
      closed: () => this.playtestClosed(),                       // the playtest has closed (server: live2.js): the page reloads
      stopped: (m) => this.stoppedHere(m),                       // signed in on another device, or opened in another window (live2.js)
      folk: (out) => { this.folkOut = out; },                    // the townsfolk out in all weathers (the admin's desk): update() sees it
      me: (me, ch) => { if (me?.name && app.player) app.player.name = me.name; if (this.gameUi && me?.name) this.gameUi.playerName = me.name; this.chat?.status(true, ch); },
    } });
    this.live.setLook(this.rig.look);
    this.chat = new ChatPanel({ host: this.overlay, live: this.live, me: () => ({ name: app.player?.name ?? '', admin: !!app.player?.admin }),
      sound: (c) => this.sound?.cue(c), keys: () => this.keys.clear(), mod: app.player?.admin ? adminAsk : null,
      profile: app.game ? (l) => this.friends?.openCard({ line: l.id, lid: l.lid, name: l.n }) : null });   // (a name in the chat: their card)
    this.chat.theme(this.gameUi?.themeColors?.());             // (the interface may be in already: the chat wears its theme at once)
  }

  /**
   * EVERYONE'S NAME OVER THEIR HEAD (the designer, 2026-09-27): yours and every other player's, in the interface's own
   * letters (drawn finer than the world, like the rest of the interface), under its windows -- and (2026-09-28) the
   * townsfolk's, on the shard-blue plates. `k` interface pixels to one of the world's.
   */
  /**
   * THE LINE ACROSS THE TOP (2026-10-09, a player: an update that lands while you plant, water or harvest undoes some
   * of it -- "popout an update notice"; the designer: "a string of words going from right to left continuously for 15
   * minutes before the update happens"). An update on its way (server: store.js notice, live2.js) runs round and round,
   * its minutes counted by the server's own time, until the page reloads with the new version (gamemain.js build.onNew);
   * short news, `ticker(text)`, goes across a few times and is gone. Under the interface, over the world: the corner
   * panels sit on it, the words show between them.
   */
  setNotice(n, serverNow) {
    this.notice = n && Number.isFinite(n.until) ? { kind: n.kind, ends: performance.now() + (n.until - (Number(serverNow) || Date.now())) } : null;
    // THE PLAYTEST CLOSING (2026-10-11, the designer: "everyone will be logged out in two minutes ... the website itself
    // will refresh automatically"; server: newgame.js 'playtest'): at the end of the countdown the page reloads by
    // itself, to the door, which is closed then (auth.js). Not an admin's: they stay in.
    clearTimeout(this.closeReload);
    if (this.notice?.kind === 'close') {
      this.say(t('The playtest is ending. Everyone is signed out in two minutes. Thank you for farming with us!'), 8000);
      if (!this.app.player?.admin) this.closeReload = setTimeout(() => this.playtestClosed(), Math.max(0, this.notice.ends - performance.now()) + 1000);
    }
  }

  /**
   * ONE GAME AT A TIME (2026-10-27, the designer: "when someone signs into their account from a different device, the old
   * device will be signed out"; server: store.js endOtherSessions, live2.js): this page stops, sends nothing more (game/
   * session.js stop) and says why over a veil. Signed out (a sign-in on another device): back to the door. Another window
   * or device opened: Play here makes this one the game again, and that one stops.
   */
  stoppedHere(m) {
    if (this.stopped) return;
    this.stopped = true;
    this.session?.stop?.(); this.keys?.clear?.();
    // (and quiet under the veil: update() stands still once stopped, so the place's air held where it was and the music went
    //  on round its tracks for as long as the page stayed open -- with the game opened in a second window, the two played
    //  over each other. 2026-10-28, the launch-eve sound audit: the music fades out and the beds go down, as leaving Play)
    this.sound?.audio?.setRain?.(0); this.sound?.leave?.();
    const el = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
    const veil = el('div', 'play-stopped'), box = el('div', 'col-prize');
    box.append(el('div', 'col-prize-head', t(m?.out ? 'Signed out' : 'Paused here')));
    box.append(el('div', 'col-prize-sub', t(String(m?.why ?? ''))));
    box.append(el('div', 'col-prize-note', t(m?.out ? 'A farm is played on one device at a time.' : 'One game at a time. Play here and the other one stops.')));
    const go = el('button', 'col-prize-ok', t(m?.out ? 'Sign in here' : 'Play here'));
    go.type = 'button';
    go.addEventListener('click', () => location.reload());
    box.append(go); veil.append(box);
    (this.overlay ?? document.body).append(veil);
    this.sound?.cue?.('deny', { gain: 0.5 });
  }

  /** The playtest has closed: the page goes back to the door (a few seconds apart for everyone, not all at once). */
  playtestClosed() {
    if (this.app.player?.admin || this.closing) return;
    this.closing = true;
    setTimeout(() => location.reload(), 500 + Math.random() * 6000);
  }

  /** THE ADMIN'S MESSAGE FOR EVERYONE (2026-10-14; server: store.js message, the admin's desk): their own words, never
   *  translated, run round and round like the update notice (which goes first while there is one) until its time is up. */
  setMessage(m, serverNow) {
    this.message = m && typeof m.text === 'string' && m.text && Number.isFinite(m.until)
      ? { text: m.text, key: `message:${m.at ?? 0}`, ends: performance.now() + (m.until - (Number(serverNow) || Date.now())) } : null;
  }

  ticker(text, { color = '#ffd84a', times = 2 } = {}) { (this.tickerQueue ??= []).push({ text: String(text ?? ''), color, times, bold: true }); }

  /** THE GOLD LINE (2026-10-09, the designer: when someone harvests a crop that mines AVYN in the VIP Quarter, the line
   *  across the top "in golden words"): a line from Bloomshire marked for it (server: world2.js #harvestNews, live2.js
   *  announce tk) goes across twice, in every game. New lines only, never the history a page is greeted with. */
  chatTicker(c) {
    for (const l of c?.add ?? []) if (l?.tk === 'gold' && l.t && (this.tickerQueue?.length ?? 0) < 6) this.ticker(t(l.t), { color: '#ffd84a', times: 2 });
  }

  noticeText(now = performance.now()) {
    const left = this.notice.ends - now, m = Math.ceil(left / 60e3);
    if (this.notice.kind === 'close') {
      const s = Math.ceil(left / 1000);
      if (left <= 0) return this.app.player?.admin ? 'The playtest is closed: only admins are in the game now.' : 'The playtest has ended. Thank you for playing! The game reloads now.';
      return `The playtest ends in ${s > 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} seconds`}. Everyone is signed out then. Thank you for farming with us!`;
    }
    if (left <= 0) return 'The update is going live now. The game reloads by itself in a moment.';
    if (m <= 1) return 'An update goes live in less than a minute. Finish your planting, watering and harvesting now: the game reloads by itself when it does.';
    return `An update goes live in ${m} minutes. Finish your planting, watering and harvesting before then: the game reloads by itself when it does.`;
  }

  drawTicker(g, w) {
    const fonts = this.gameUi?.stack?.fonts, now = performance.now();
    if (!fonts) return;
    if (this.notice && now > this.notice.ends + 10 * 60e3) this.notice = null;          // (a deploy that stopped half way)
    if (this.message && now > this.message.ends) this.message = null;                   // (its time is up)
    const line = this.notice ? { text: t(this.noticeText(now)), color: '#ffffff', key: 'notice', bold: true }
      : this.message ? { text: this.message.text, color: '#ffffff', key: this.message.key, bold: true } : this.tickerQueue?.[0] ?? null;
    if (!line?.text) { this.tickerKey = null; if (line) this.tickerQueue.shift(); return; }
    const key = line.key ?? line, font = line.bold ? 'bold' : 'regular';
    if (this.tickerKey !== key) { this.tickerKey = key; this.tickerAt = now; }
    // it comes in at the right edge and runs left, SPEED interface pixels a second, the next time round close behind
    const SPEED = 42, GAP = 72, tw = fonts.width(line.text, font), span = tw + GAP, h = fonts.glyphH[font] + 9;
    const run = ((now - this.tickerAt) / 1000) * SPEED;
    if (line.times && run > w + (line.times - 1) * span + tw) { this.tickerQueue.shift(); this.tickerKey = null; return; }
    g.fillStyle = 'rgba(16, 10, 4, 0.72)';
    g.fillRect(0, 0, w, h);
    g.fillStyle = line.key === 'notice' || String(line.key).startsWith('message:') ? '#e8a33a' : '#ffd84a';
    g.fillRect(0, h, w, 1);
    let x = w - run;
    while (x + tw < 0) x += span;
    for (let k = Math.round((x - (w - run)) / span); x < w && (!line.times || k < line.times); x += span, k++)
      fonts.draw(g, line.text, Math.round(x), 4, { font, color: line.color, shadow: '#000000', shadowY: 1 });
  }

  drawCropTag(g, cx, cy, k) {
    // WHAT GROWS UNDER THE MOUSE (2026-10-08, a player: "I wish we could see what we growing here while they are not
    // ripe yet"): over a planted square, its crop and when it is ripe -- the line the hero says facing it (hero.js
    // cropText), on the names' own plate, just above the plant. (By touch: face the square, the line over the hotbar)
    const m = this.mouse, farm = this.farm, fonts = this.gameUi?.stack?.fonts;
    if (!m?.on || m.window || !farm || !fonts || !this.hero || this.gameUi?.windowOpen) return;
    const i = farm.cellAt(m.x, m.y), c = farm.at(i)?.crop;
    if (!c || !farm.state(i)) return;
    const text = t(this.hero.cropText(i)), T = this.app.doc.tileSize;
    if (!text) return;
    const col = i % farm.W, row = Math.floor(i / farm.W), x = (col + 0.5) * T, y = row * T - (SEEDS[c.s]?.tall ? 18 : 4);
    const w = fonts.width(text, 'regular'), h = fonts.glyphH.regular + 4, tx = Math.round((x - cx) * k - w / 2), ty = Math.round((y - cy) * k) - h;
    g.fillStyle = 'rgba(0, 0, 0, 0.55)';
    g.fillRect(tx - 2, ty + 1, w + 6, h - 2); g.fillRect(tx - 3, ty + 2, w + 8, h - 4);
    fonts.draw(g, text, tx + 1, ty + 2, { font: 'regular', color: /: ripe$/.test(text) ? '#ffe680' : '#ffffff' });
  }

  /**
   * THE POT ON THE FIRE, SEEN (2026-10-23, a player: "a visual timer like a green bar decreasing near the fireplace so we
   * can see how much time til dish i cooked"): over every stove on this map -- and the mill and the dairy, for what is
   * being made there (rules.js POT_KEY) -- while your own pot is on, a green bar that empties as it cooks and the time
   * left beside it; done, the bar full and gold, and "Ready". In the interface's own letters, as the names, over the world.
   */
  drawPotTimers(g, cx, cy, k) {
    const s = this.localSave?.(), fonts = this.gameUi?.stack?.fonts, doc = this.app.doc;
    if (!this.app.game || !s || !fonts || !doc || this.goldenQuiet) return;
    const now = gameNow();
    for (const [place, key] of Object.entries(POT_KEY)) {
      const pot = s[key];
      if (!pot?.ready) continue;
      const left = pot.ready - now, done = left <= 0, total = Math.max(1, pot.ready - (pot.at ?? pot.ready - 1));
      const frac = done ? 1 : Math.max(0, Math.min(1, left / total)), text = done ? t('Ready') : clockOf(left);
      for (const z of doc.zones ?? []) {
        if (!(z.tags ?? []).includes(place)) continue;
        const zw = z.w ?? z.width ?? 0, bw = 26, bh = 4, tw = fonts.width(text, 'regular'), gh = fonts.glyphH.regular;
        const W = bw + 5 + tw + 6, H = Math.max(bh + 4, gh + 4), x0 = Math.round((z.x + zw / 2 - cx) * k - W / 2);
        // (over the stove; standing at it, your name stays at your head and the timer steps up over it)
        let y0 = Math.round((z.y - cy) * k) - H - 4;
        for (let n = 0, hit = true; hit && n < 6; n++) {
          hit = false;
          for (const r of this.takenPlates ?? []) if (x0 < r.x + r.w && x0 + W > r.x && y0 < r.y + r.h + 3 && y0 + H > r.y - 3) { y0 = r.y - H - 4; hit = true; }
        }
        g.fillStyle = 'rgba(0, 0, 0, 0.55)';
        g.fillRect(x0 + 1, y0, W - 2, H); g.fillRect(x0, y0 + 1, W, H - 2);
        const bx = x0 + 3, by = y0 + Math.round((H - bh) / 2);
        g.fillStyle = 'rgba(12, 10, 24, 0.9)'; g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        // (done: gold, and breathing a little so it is seen)
        g.save();
        if (done) g.globalAlpha = 0.75 + 0.25 * Math.sin(performance.now() / 260);
        g.fillStyle = done ? '#ffd84a' : '#8fdc5a'; g.fillRect(bx, by, Math.max(1, Math.round(bw * frac)), bh);
        g.restore();
        fonts.draw(g, text, bx + bw + 5, y0 + Math.round((H - gh) / 2), { font: 'regular', color: done ? '#ffe680' : '#ffffff' });
      }
    }
  }

  /** A BOSS TAKING A WEAPON SOFTLY (combat.js hurt, rules.js BOSS_WEAPONS, 2026-10-27; softly, never shrugged off, since
   *  2026-10-28): what to try instead, said in the Notice the first time each boss does so on this page -- "The Great Frost
   *  Golem takes less from arrows. Try a staff." */
  bossHint(e, kind, family) {
    // (OUT OF ITS REACH, 2026-10-28: across the water from it, a boss takes nothing -- combat.js hurt -- said once a boss)
    if (kind === 'reach') {
      const told = (this.reachTold ??= new Set());
      if (!e.def?.boss || told.has(e.type)) return;
      told.add(e.type);
      this.say(`The ${e.def.name ?? 'creature'} can't reach you there, so your blows do nothing. Fight it on its own ground.`, 5000);
      return;
    }
    if ((kind !== 'soft' && kind !== 'immune') || !BOSS_WEAPONS[e.type]) return;
    const told = (this.bossTold ??= new Set());
    if (told.has(e.type)) return;
    told.add(e.type);
    const noun = { blade: 'blades', bow: 'arrows', staff: 'magic' }[family] ?? 'that', fear = { blade: 'a sword', bow: 'a bow', staff: 'a staff' }[BOSS_WEAPONS[e.type].weak];
    this.say(kind === 'soft' ? `The ${e.def.name ?? 'creature'} takes less from ${noun}. Try ${fear}.` : `The ${e.def.name ?? 'creature'} shrugs off ${noun}. Try ${fear}.`, 5000);
  }

  /** A BOSS'S WORD over its head (combat.js word: Immune, Weak), rising a little as it fades; in the interface's own letters. */
  drawCombatWords(g, cx, cy, k) {
    const W = this.combat?.words, fonts = this.gameUi?.stack?.fonts;
    if (!W?.length || !fonts) return;
    const now = performance.now();
    for (const w of W) {
      const age = (now - w.t0) / 900;
      if (age >= 1 || w.e.dead) continue;
      const text = t(w.text), tw = fonts.width(text, 'regular'), box = this.combat.boxOf?.(w.e), plate = this.bossPlates?.get(w.e);
      // (a boss's word rises from over its name, drawBossNames, not across it)
      const x = Math.round((w.e.x - cx) * k - tw / 2), y = plate != null ? Math.round(plate - fonts.glyphH.regular - 5 - age * 8 * k)
        : Math.round(((box ? box.y0 : w.e.y - 30) - 8 - age * 8 - cy) * k);
      g.save(); g.globalAlpha = Math.min(1, (1 - age) * 2.5);
      g.fillStyle = 'rgba(0, 0, 0, 0.45)'; g.fillRect(x - 3, y - 1, tw + 6, fonts.glyphH.regular + 3);
      fonts.draw(g, text, x, y, { font: 'regular', color: w.color });
      g.restore();
    }
  }

  /** A BOSS'S NAME over its great bar (2026-10-28, the launch eve creature audit: a boss had its great bar and no name, so the
   *  Great Frost Golem among its three golems was only the biggest of them, and the dungeon's guardians came unnamed): while
   *  its bar shows (combat.js movers: hurt, or after you), on the interface's plate, in the bar's own orange paled; the plate's
   *  top kept for its Immune or Weak to rise from (drawCombatWords). */
  drawBossNames(g, cx, cy, k) {
    this.bossPlates = null;
    const fonts = this.gameUi?.stack?.fonts;
    if (!fonts) return;
    for (const e of this.combat?.enemies ?? []) {
      if (!e.def?.boss || e.dead || e.buried || !(e.hp < e.def.hp || e.chasing)) continue;
      // (the bar's rim's top row, as combat.js movers draws it: its height the way it faces, a boss's a row up)
      const a = e.def.art, sc = a.scale ?? 1, rim = Math.round(e.y - (a.tallBy?.[e.facing] ?? a.tall ?? a.cell * 0.72) * sc) - Math.round(e.z ?? 0) - 6;
      const text = t(e.def.name ?? ''), tw = fonts.width(text, 'regular'), h = fonts.glyphH.regular + 3;
      const x = Math.round((e.x - cx) * k - tw / 2), y = Math.round((rim - 1 - cy) * k) - h;
      g.fillStyle = 'rgba(0, 0, 0, 0.45)'; g.fillRect(x - 3, y, tw + 6, h);
      fonts.draw(g, text, x, y + 1, { font: 'regular', color: '#ffc79a' });
      (this.bossPlates ??= new Map()).set(e, y);
    }
  }

  drawNames(g, cx, cy, k) {
    this.takenPlates = [];                                               // (where the plates went: drawPotTimers keeps off them)
    if (!this.app.game || !this.gameUi?.stack?.fonts || this.goldenQuiet) return;   // (not over the story's end: golden)
    const fonts = this.gameUi.stack.fonts;
    // ON A PLATE (2026-09-27, the designer: "translucent... a bit see through, a bit darker, so the name shows properly",
    // as their reference): black at 45% behind the letters, its corners rounded two pixels, three pixels either side
    const plate = (x0, y0, w, h, r = 2) => {
      g.fillStyle = 'rgba(0, 0, 0, 0.45)';
      for (let i = 0; i < r; i++) {
        const inset = r - i;
        g.fillRect(x0 + inset, y0 + i, w - 2 * inset, 1); g.fillRect(x0 + inset, y0 + h - 1 - i, w - 2 * inset, 1);
      }
      g.fillRect(x0, y0 + r, w, h - 2 * r);
    };
    // the plates drawn so far: a player's steps up out of the way of any it would cover (standing by someone to talk,
    // your name and theirs would sit on each other)
    const taken = this.takenPlates;
    const clear = (r) => {
      for (let n = 0, hit = true; hit && n < 8; n++) {
        hit = false;
        for (const t of taken) if (r.x < t.x + t.w && r.x + r.w > t.x && r.y < t.y + t.h && r.y + r.h > t.y) { r.y = t.y - r.h - 1; hit = true; }
      }
      taken.push(r);
      return r;
    };
    // (an ELITE FOUNDER -- a holder of ten, server/founders.js perks.elite -- wears the Founders' Hall's badge before
    //  the name: design/founders/art, its 10 px drawing, as the studio made it for over the head)
    const badge = this.app.assets.image('art:elite-badge-10.png');
    const tag = (x, y, name, color, lid = null, elite = false) => {
      if (!name) return;
      const bw = elite && badge?.state === 'ok' ? 12 : 0;
      const w = fonts.width(name, 'regular') + bw, tx = Math.round((x - cx) * k - w / 2);
      // (two rows over the letters; under them the descender's and one more)
      const r = clear({ x: tx - 3, y: Math.round((y - cy) * k) - 4, w: w + 6, h: fonts.glyphH.regular + 4 });
      plate(r.x, r.y, r.w, r.h);
      if (bw) g.drawImage(badge.img, tx, r.y + Math.round((r.h - 10) / 2));
      fonts.draw(g, name, tx + bw, r.y + 2, { font: 'regular', color });
      bubble(lid, Math.round((x - cx) * k), r.y - 2);
    };
    // A CHAT BUBBLE over the name (chatBubbles): a cream bubble, its point down at the name, the line in up to three
    // rows (longer ones end in ...), gone after a few seconds
    const now = performance.now(), B = this.bubbles;
    const bubble = (lid, mx, bottom) => {
      const b = lid != null ? B?.get(lid) : null;
      if (!b) return;
      if (now > b.until) { B.delete(lid); return; }
      const maxW = 140, rows = [], words = b.text.replace(/\s+/g, ' ').trim().split(' ');
      let row = '';
      for (const wd of words) {
        const next = row ? `${row} ${wd}` : wd;
        if (fonts.width(next, 'regular') <= maxW) { row = next; continue; }
        if (row) rows.push(row);
        row = wd;
        while (fonts.width(row, 'regular') > maxW) { let cut = row.length - 1; while (cut > 1 && fonts.width(row.slice(0, cut), 'regular') > maxW) cut--; rows.push(row.slice(0, cut)); row = row.slice(cut); }
      }
      if (row) rows.push(row);
      if (rows.length > 3) { rows.length = 3; let r3 = rows[2]; while (r3.length > 1 && fonts.width(`${r3}...`, 'regular') > maxW) r3 = r3.slice(0, -1); rows[2] = `${r3}...`; }
      const lh = fonts.glyphH.regular + 2, w = Math.max(...rows.map((t) => fonts.width(t, 'regular'))) + 10, h = rows.length * lh + 6;
      // (two people talking side by side: the later bubble steps up over the other, as the name plates do)
      const bx = mx - Math.floor(w / 2), by = clear({ x: bx, y: bottom - h - 4, w, h: h + 4 }).y;
      const fade = Math.min(1, (b.until - now) / 400);
      g.save(); g.globalAlpha = fade;
      g.fillStyle = '#3b2210';                                             // the rim, its corners cut
      g.fillRect(bx + 2, by, w - 4, h); g.fillRect(bx + 1, by + 1, w - 2, h - 2); g.fillRect(bx, by + 2, w, h - 4);
      g.fillStyle = '#fff8e8';
      g.fillRect(bx + 2, by + 1, w - 4, h - 2); g.fillRect(bx + 1, by + 2, w - 2, h - 4);
      for (let i = 0; i < 4; i++) { g.fillStyle = '#3b2210'; g.fillRect(mx - 3 + i, by + h - 1 + i, 7 - 2 * i, 1); }   // the point
      for (let i = 0; i < 3; i++) { g.fillStyle = '#fff8e8'; g.fillRect(mx - 2 + i, by + h - 1 + i, 5 - 2 * i, 1); }
      rows.forEach((t, i) => fonts.draw(g, t, bx + 5, by + 3 + i * lh, { font: 'regular', color: '#3b2210' }));
      g.restore();
    };
    // THE TOWNSFOLK'S NAMES (2026-09-28, the designer, with a reference: a plate over each one, pointing down at them,
    // "a blue kind of color like our shards... gradient blue"): the Averyn shard's own blues (UI art avyn-shard.png --
    // sky #5cc6ff, blue #3f8ff0, deepening) inside its navy rim, a shine along the top, the name in capitals
    const plates = new Map();                                               // (a townsperson's plate: where the quest pip sits)
    const npcTag = (x, y, name, id) => {
      const text = name.toUpperCase(), w = fonts.width(text, 'bold'), pw = w + 10, ph = fonts.glyphH.bold + 8;
      const mx = Math.round((x - cx) * k), px = mx - Math.floor(pw / 2), py = Math.round((y - cy) * k) - ph - 2;
      if (px + pw < 0 || py + ph + 3 < 0 || px > g.canvas.width || py > g.canvas.height) return;
      taken.push({ x: px, y: py, w: pw, h: ph + 3 });
      plates.set(id, { mx, py });
      g.fillStyle = '#0c1433';                                               // the rim, its corners cut
      g.fillRect(px + 2, py, pw - 4, ph); g.fillRect(px + 1, py + 1, pw - 2, ph - 2); g.fillRect(px, py + 2, pw, ph - 4);
      const blue = g.createLinearGradient(0, py + 1, 0, py + ph - 1);
      blue.addColorStop(0, '#5cc6ff'); blue.addColorStop(0.5, '#3f8ff0'); blue.addColorStop(1, '#2d5fd2');
      g.fillStyle = blue;
      g.fillRect(px + 2, py + 1, pw - 4, ph - 2); g.fillRect(px + 1, py + 2, pw - 2, ph - 4);
      g.fillStyle = 'rgba(232, 251, 255, 0.6)'; g.fillRect(px + 3, py + 1, pw - 6, 1);   // the shine
      // the point, under the middle: its rim, and the plate's deepest blue running down into it
      for (let i = 0; i < 4; i++) { g.fillStyle = '#0c1433'; g.fillRect(mx - 3 + i, py + ph - 1 + i, 7 - 2 * i, 1); }
      for (let i = 0; i < 3; i++) { g.fillStyle = '#2d5fd2'; g.fillRect(mx - 2 + i, py + ph - 1 + i, 5 - 2 * i, 1); }
      fonts.draw(g, text, px + 5, py + 4, { font: 'bold', color: '#ffffff', shadow: '#0c1433', shadowY: 1 });
    };
    for (const p of this.folk?.people ?? []) if (p.def?.name) npcTag(p.x, p.y - this.folk.headOf(p) - 2, p.def.name, p.id);   // (its point just over the head)
    const above = (swim) => (swim ? 14 : 34);
    // (a VIP's name in gold: rules.js VIP_PERKS)
    for (const r of (this.othersOn ? this.live?.tags() : null) ?? []) tag(r.x, r.y - above(r.swim), r.name, r.admin ? '#ffd35c' : r.vip ? VIP_PERKS.nameColour : '#ffffff', r.lid, r.elite);
    // (your own name, but not while you talk to someone: their name and their hearts over them are what you look at)
    if (this.hero && !this.hero.pose?.bed && this.gameUi?.stack?.top !== 'dialogue') tag(this.x, this.y - above(this.hero.mode === 'swim'), this.app.player?.name ?? '', this.app.player?.admin ? '#ffd35c' : this.vipNow() ? VIP_PERKS.nameColour : '#fff4c8', this.live?.me?.lid ?? null, !!this.localSave()?.perks?.elite);
    // NAMES FOR PETS AND MOUNTS (2026-10-23, a player: "I wanna name my bear WINNIE and Dog to Scooby" -- "visible for
    // everyone": commands.js name.set): a pet's and a mount's at their feet -- the mount's while it is ridden (and over the
    // bear walking beside you) -- words in a soft green, clear of the farmers' names over their heads; yours and everyone's
    const named = (x, y, name) => {
      if (!name) return;
      const w = fonts.width(name, 'regular'), tx = Math.round((x - cx) * k - w / 2);
      const r = clear({ x: tx - 3, y: Math.round((y - cy) * k), w: w + 6, h: fonts.glyphH.regular + 4 });
      plate(r.x, r.y, r.w, r.h);
      fonts.draw(g, name, tx, r.y + 2, { font: 'regular', color: '#c8f2a4' });
    };
    const mine = this.localSave?.()?.names ?? {}, h0 = this.hero;
    if (mine.pet && this.pet?.pet) named(this.pet.x, this.pet.y + 4, mine.pet);
    if (mine.mount && h0 && MOUNT_NAMES[h0.mode]) named(this.x, this.y + 8, mine.mount);
    if (mine.mount && this.bearPal && !this.bearPal.hidden && !(h0 && h0.mode === 'bear')) named(this.bearPal.x, this.bearPal.y - 34, mine.mount);
    for (const r of (this.othersOn ? this.live?.tags() : null) ?? []) {
      if (r.pet) named(r.pet.x, r.pet.y + 4, r.pet.name);
      if (r.mount) named(r.x, r.y + 8, r.mount);
    }
    this.#questMark(g, cx, cy, k, plates);
    this.#markTo(g, cx, cy, k, plates, this.pinTarget(), 'pin');      // (your pin on the map: game/ui.js, 2026-10-26)
    this.#heartsMeter(g, plates);
    this.namePlates = plates;                                        // (where each townsperson's plate is: the emotes go over it)
  }

  /**
   * WHERE THE FOLLOWED QUEST WANTS YOU (quests.js goalOf, the journal's Track): on this map, the person -- { npc }, the
   * townsperson as they stand -- or the place, { x, y }; on another map, the door that leads towards it (where.js
   * nextDoor). World pixels; null when there is nowhere to point (a whole map to search, no quest). Looked up twice a
   * second.
   */
  questTarget() {
    if (!this.app.game || !this.app.world?.index || this.goldenQuiet) return null;
    const now = performance.now();
    if (this.qTarget && now - this.qTarget.at < 500) return this.qTarget.v;
    let v = null;
    try {
      const save = this.localSave(), ix = this.app.world.index, t = trackedOf(save, this.inv);
      const want = t ? goalOf(save, t.q, ix) : null, here = this.app.doc?.id;
      const mid = (r) => ({ x: r[0] + r[2] / 2, y: r[1] + r[3] / 2 });
      if (want?.map === here) {
        const p = want.npc ? this.folk?.people.find((q) => q.id === want.npc) : null;
        // A PLACE TO SEARCH (Bramble Meadow, Mirror Pond): its middle leads you there; once you are in it (or at its
        // edge), the pip goes onto the thing itself (2026-09-30, players: "I can't find the bramble seed" -- the
        // pip sat in the middle of a meadow of flowers, the brambles at its corner; the pond's in the water)
        const near = (r, m = 48) => !!r && this.x >= r[0] - m && this.x < r[0] + r[2] + m && this.y >= r[1] - m && this.y < r[1] + r[3] + m;
        // (the one it wants has gone in for the night, or out of the rain: no pip over an empty spot -- a word instead)
        const home = want.npc && !p && this.folkIn() ? this.folk?.all.find((q) => q.id === want.npc) : null;
        if (home) this.folkHomeNote(home.def.name);
        v = home ? null : p ? { npc: p } : want.spot && near(want.r) ? mid(want.spot) : want.r ? mid(want.r) : null;
      } else if (want?.map) {
        const d = nextDoor(ix, here, want.map);
        v = d?.r ? mid(d.r) : null;
      }
    } catch { v = null; }
    this.qTarget = { at: now, v };
    return v;
  }
  /**
   * MAP PINS (2026-10-26, players: "make a feature where players can put a pin in the map and be able to track it"): one pin,
   * set by a click on the Map window's picture (a click by it takes it away), kept on this device; a red pip over it and a
   * red arrow the walking way to it, through the doors when it is on another map; reached, it goes.
   */
  pinKey() { return `bloomshire.pin.${this.app.player?.id ?? 'editor'}`; }
  pinNow() {
    try { const p = JSON.parse(localStorage.getItem(this.pinKey()) ?? 'null'); return p && p.map && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null; } catch { return null; }
  }
  setPin(p) {
    try { if (p) localStorage.setItem(this.pinKey(), JSON.stringify(p)); else localStorage.removeItem(this.pinKey()); } catch { /* a private window */ }
    this.guides?.delete('pin'); this.pinCache = null;
  }
  /** A click on the Map's picture at (x, y), the map's own pixels: the pin there -- or, `near` it already, taken away. */
  pinAt(x, y, near = 24) {
    const here = this.app.doc?.id, was = this.pinNow();
    if (was && was.map === here && Math.hypot(was.x - x, was.y - y) <= near) { this.setPin(null); this.say('Pin taken away'); this.sound?.cue('click'); return null; }
    const p = { map: here, x: Math.round(x), y: Math.round(y) };
    this.setPin(p); this.say('Pinned. Follow the red arrow there, and click the pin again to take it away'); this.sound?.cue('place', { gain: 0.6 });
    return p;
  }
  /** Where the pin's marker goes: the pin itself on its map, else the door on the way there; reached, it goes. */
  pinTarget() {
    const p = this.pinNow(), here = this.app.doc?.id;
    if (!p || !this.app.world) return null;
    if (p.map === here) {
      if (Math.hypot(p.x - this.x, p.y - this.y) < 28) { this.setPin(null); this.say('You reached your pin'); return null; }
      return { x: p.x, y: p.y };
    }
    const now = performance.now();
    if (this.pinCache && this.pinCache.here === here && now - this.pinCache.at < 1000) return this.pinCache.v;
    let v = null;
    try { const d = this.app.world.index ? nextDoor(this.app.world.index, here, p.map) : null; v = d?.r ? { x: d.r[0] + d.r[2] / 2, y: d.r[1] + d.r[3] / 2 } : null; } catch { v = null; }
    this.pinCache = { at: now, here, v };
    return v;
  }

  /** Say once (a map, a person, night or rain) that the one your quest wants is in, and until when. */
  folkHomeNote(name) {
    const why = this.folkIn(), key = `${this.app.doc?.id}/${name}/${why}`;
    if (!why || this.homeNoted === key) return;
    this.homeNoted = key;
    this.say(why === 'rain' ? `${name} is indoors out of the rain. Back when it stops.` : `${name} is indoors for the night. Back in the morning.`, 4000);
  }

  /**
   * THE QUEST MARKER, SMALL (the designer, 2026-09-28, bringing it back: "it needs to be very small... that doesn't
   * hinder anything else"): a little gold pip, bobbing gently, over the person the quest wants (just above their name
   * plate) or the place, or the door on the way; when that is off the screen, a small gold arrow at the edge points
   * the way. Drawn in the interface's own pixels (drawNames), `k` of them to one of the world's.
   */
  /** A FRIEND'S HEARTS (game/hearts.js), over the plate of whoever you are talking to: a little heart for each, filled as far
   *  as you are friends (a sweetheart's last two filled only once you walk out together; then pink). */
  #heartsMeter(g, plates) {
    const who = this.gameUi?.stack?.top === 'dialogue' ? this.gameUi?.talk?.p : null, pl = who && plates.get(who.id);
    if (!pl) return;
    const save = this.localSave(), H = heartsOf(save, who.id), sweet = SWEETHEARTS[who.id] && canCourt(save, who.id);
    const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'], n = 10, step = 9;
    const x0 = pl.mx - Math.floor((n * step - 2) / 2), y0 = pl.py - 10;
    // (each heart outlined dark, so it reads on any ground: filled red, pink once you walk out together; an empty one pale)
    const dot = (hx, hy, c) => HEART.forEach((row, y) => { for (let x = 0; x < 7; x++) if (row[x] === 'X') { g.fillStyle = c; g.fillRect(hx + x, hy + y, 1, 1); } });
    for (let i = 0; i < n; i++) {
      const on = i < H.hearts, fill = on ? (H.dating ? '#ff7eb6' : '#e8344a') : i >= H.cap ? 'rgba(255, 236, 236, 0.28)' : 'rgba(255, 236, 236, 0.6)', hx = x0 + i * step;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) dot(hx + dx, y0 + dy, '#2a1416');
      dot(hx, y0, fill);
      if (on) { g.fillStyle = 'rgba(255, 255, 255, 0.7)'; g.fillRect(hx + 1, y0 + 1, 1, 1); }
      if (sweet && i === 7 && !H.dating) { g.fillStyle = '#ffd35c'; g.fillRect(x0 + i * step + 3, y0 - 2, 1, 1); }   // (where courting begins)
    }
  }
  #questMark(g, cx, cy, k, plates) { this.#markTo(g, cx, cy, k, plates, this.questTarget(), 'quest'); }

  /**
   * THE WALKING WAY (2026-10-26, players: the pointer "directly points to the direction of the NPC/place even if it is on
   * the other side of the lake. It should point the long way like points to bridge first"): the walk grid's own route
   * (route, A* round whatever is solid -- the townsfolk's), asked again only once the farmer or the target has moved on,
   * and the turn of it a little way ahead. { x, y, detour } -- detour when the way round is well longer than the straight
   * line (the arrow shows then even with the target in view) -- or null (no way found: the straight line, as before).
   */
  #guideTo(t, key) {
    const now = performance.now(), G = (this.guides ??= new Map()), c = G.get(key);
    // (asked again when the farmer has strayed from the way, the target has moved, or a few seconds on -- never more often
    //  than every 400 ms)
    const stale = !c || c.map !== this.app.doc?.id || (c.off ?? 0) > 24 || Math.hypot(c.tx - t.x, c.ty - t.y) > 16 || now - c.at > 3000;
    if (stale && (!c || now - c.at > 400)) {
      let pts = null;
      try { pts = this.route([this.x, this.y], [t.x, t.y], { loose: true }); } catch { pts = null; }
      G.set(key, { at: now, map: this.app.doc?.id, tx: t.x, ty: t.y, line: pts ? [[this.x, this.y], ...pts] : null, off: 0 });
    }
    const v = G.get(key), line = v?.line;
    if (!line || line.length < 2) return null;
    // WHERE THE FARMER IS ON THE WAY NOW (2026-10-28, a player's film: the arrow "is going everywhere" -- the way is asked
    // only now and then, and the turn it pointed at was the first a little way from where the farmer stood, which, once
    // they had walked on past the way's first points, lay BEHIND them: the arrow swung back, and round again when the way
    // was asked anew). Now: the nearest point of the way to the farmer, and from there a little way on along it.
    let bi = 0, bu = 0, bd = Infinity;
    for (let i = 0; i + 1 < line.length; i++) {
      const [ax, ay] = line[i], [bx, by] = line[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const u = L2 ? Math.max(0, Math.min(1, ((this.x - ax) * dx + (this.y - ay) * dy) / L2)) : 0;
      const d = Math.hypot(ax + dx * u - this.x, ay + dy * u - this.y);
      if (d < bd) { bd = d; bi = i; bu = u; }
    }
    v.off = bd;
    const onX = line[bi][0] + (line[bi + 1][0] - line[bi][0]) * bu, onY = line[bi][1] + (line[bi + 1][1] - line[bi][1]) * bu;
    let px = onX, py = onY, need = 28;
    for (let i = bi; i + 1 < line.length && need > 0; i++) {
      const [nx, ny] = line[i + 1], seg = Math.hypot(nx - px, ny - py);
      if (seg >= need) { px += ((nx - px) / seg) * need; py += ((ny - py) / seg) * need; need = 0; }
      else { need -= seg; px = nx; py = ny; }
    }
    // (what is left of the way from here, against the straight line: a detour shows the arrow even with the target in view)
    let rest = Math.hypot(line[bi + 1][0] - onX, line[bi + 1][1] - onY);
    for (let i = bi + 1; i + 1 < line.length; i++) rest += Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1]);
    const straight = Math.hypot(t.x - this.x, t.y - this.y);
    return { x: px, y: py, detour: rest > straight * 1.3 + 48 };
  }

  /** A MARKER AND ITS ARROW (the quest's, gold; your pin's, red): the pip over `want` when it is in view, and round the
   *  farmer the arrow the walking way (#guideTo) when it is not -- or when the way there goes round. */
  #markTo(g, cx, cy, k, plates, want, key = 'quest') {
    if (!want) return;
    const W = g.canvas.width, H = g.canvas.height, t = performance.now() / 1000;
    let x, y;                                                                // where the pip points, interface pixels
    if (want.npc) {
      const pl = plates.get(want.npc.id);
      if (pl) { x = pl.mx; y = pl.py - 2; }
      else { x = Math.round((want.npc.x - cx) * k); y = Math.round((want.npc.y - this.folk.headOf(want.npc) - 14 - cy) * k); }
    } else { x = Math.round((want.x - cx) * k); y = Math.round((want.y - cy) * k); }
    const M = 14, DARK = key === 'pin' ? '#3a0e14' : '#3b2210', GOLD = key === 'pin' ? '#ff5a6e' : '#ffd35c', GLINT = key === 'pin' ? '#ffd0d6' : '#fff3c4';
    const wx = want.npc ? want.npc.x : want.x, wy = want.npc ? want.npc.y : want.y;
    const guide = Number.isFinite(wx) && Number.isFinite(wy) ? this.#guideTo({ x: wx, y: wy }, key) : null;
    const inView = x >= M && x <= W - M && y >= M && y <= H - M;
    if (inView) {
      // the pip: nine pixels wide, five tall, its point down at (x, y), bobbing a pixel or two
      const top = Math.round(y - 6 + Math.sin(t * 3.5) * 1.5);
      for (let i = 0; i < 5; i++) { g.fillStyle = DARK; g.fillRect(x - 4 + i, top + i, 9 - 2 * i, 1); }
      for (let i = 0; i < 3; i++) { g.fillStyle = GOLD; g.fillRect(x - 3 + i, top + i, 7 - 2 * i, 1); }
      g.fillStyle = GLINT; g.fillRect(x - 2, top, 3, 1);                 // (a glint)
      if (!guide?.detour) return;
    }
    // off the screen (or the way round): the same small arrow, ROUND THE FARMER (the designer, 2026-10-01: at the screen's
    // edge it "sometimes hides away under the UI") -- on a ring just clear of them, turned the way to walk (#guideTo),
    // nudging a pixel or two that way
    const ox = (this.x - cx) * k, oy = (this.y - 14 - cy) * k;
    const a = guide ? Math.atan2((guide.y - 14 - cy) * k - oy, (guide.x - cx) * k - ox) : Math.atan2(y - oy, x - ox);
    const d = 26 * k + Math.sin(t * 3.5) * 1.5 * Math.max(1, k / 2);
    const ax = Math.max(M, Math.min(W - M, ox + Math.cos(a) * d)), ay = Math.max(M, Math.min(H - M, oy + Math.sin(a) * d));
    const pulse = 1 + Math.sin(t * 3.5) * 0.08;
    g.save();
    g.translate(Math.round(ax), Math.round(ay)); g.rotate(a); g.scale(pulse, pulse);
    g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -5); g.lineTo(-2, 0); g.lineTo(-4, 5); g.closePath();
    g.fillStyle = GOLD; g.fill(); g.lineWidth = 1.5; g.strokeStyle = DARK; g.stroke();
    g.restore();
  }

  /** CHAT BUBBLES (2026-09-28, a player's suggestion via the designer): a line said in the chat shows for a few seconds
   *  in a bubble over whoever said it (their newest line; the history a new arrival is sent is not shown). */
  chatBubbles({ add = [] }) {
    const now = performance.now(), B = (this.bubbles ??= new Map());
    for (const l of add) if (l.lid != null && l.t) B.set(l.lid, { text: String(l.t), until: now + Math.min(9000, 4000 + l.t.length * 60) });
  }

  /** What the interface needs of the quests: the save, whether the player has a name, the name box, news. */
  questHooks() {
    return { save: () => this.localSave(), named: () => (this.app.game ? this.app.player?.named !== false : true), name: () => this.app.player?.name ?? '',
      askName: (prompt) => this.askName(prompt), changed: (r) => this.questMoved(r), handed: (r, p) => this.handedMagic(r, p) };
  }

  /**
   * THE NAME (the designer, 2026-09-26: Marlow asks it): a box over the game, the name checked by the server
   * (POST /api/account/name: 3 to 20 letters, numbers, - or _, not taken). Resolves to the name, or null.
   */
  askName(prompt, was = '') {
    const app = this.app;
    // the server keeps the name, or says why not (null: kept)
    const send = async (name) => {
      if (!app.game) { app.player = { ...(app.player ?? {}), name, named: true }; return null; }
      const res = await fetch(new URL('/api/account/name', location.origin), { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) return out.error ?? 'That name could not be used.';
      app.player.name = out.name ?? name; app.player.named = true;
      return null;
    };
    // (2026-09-28: in the interface's own look -- ui.js askName; the plain box below only if the interface is not in)
    const asked = this.gameUi?.askName?.(prompt, was, send, this.overlay);
    if (asked) return asked.then((name) => { this.keys.clear(); return name ? app.player?.name ?? name : null; });
    return new Promise((done) => {
      let input, err, btn;
      const box = el('form.play-name', {},
        el('div.play-name-q', {}, prompt),
        input = el('input', { maxlength: '20', placeholder: 'Your name', autocomplete: 'off', spellcheck: 'false', value: was }),
        err = el('div.play-name-err'),
        el('div.play-name-row', {},
          was ? el('button.play-name-cancel', { type: 'button', onclick: () => close(null) }, 'Cancel') : null,
          btn = el('button', { type: 'submit' }, was ? 'Change my name' : 'That\'s me')));
      const close = (name) => { box.remove(); this.keys.clear(); done(name); };
      box.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (!/^[A-Za-z0-9_-]{3,20}$/.test(name)) { err.textContent = 'A name is 3 to 20 letters, numbers, - or _.'; return; }
        if (was && name === was) { close(null); return; }
        btn.disabled = true; err.textContent = '';
        try {
          const why = await send(name);
          if (why) { err.textContent = why; btn.disabled = false; return; }
          close(app.player.name);
        } catch { err.textContent = 'The server could not be reached. Try again.'; btn.disabled = false; }
      });
      box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(null); } });
      this.overlay.append(box);
      setTimeout(() => input.focus(), 30);
    });
  }

  /**
   * THE STORY'S END (the spec's completion effect; remade 2026-10-01 to the designer's reference): when Marven hands
   * over the scroll, the interface's "founding" screen (ui.js founding, the studio's) -- the scroll with the golden
   * carrot on its seal, "Story Completed!", and, for the first 1,000 to finish (`r.foundingShards`, world2.js #founded),
   * the free mint spot and the Shards -- over golden rays that turn behind the scroll, densest and brightest there and
   * fading slowly out to the screen's edges, with sparkles. The rays go between the world and the interface, so the
   * screen is drawn over them. Once; on Continue the Shards fly to the purse.
   */
  golden(r = {}) {
    if (this.goldenOn || !this.overlay) return;
    this.goldenOn = true;
    const shards = Math.max(0, r?.foundingShards | 0), rewarded = shards > 0;
    const out = (o) => { o.classList.add('out'); setTimeout(() => { o.remove(); this.goldenOn = false; }, 900); };
    const card = this.gameUi?.founding?.({ rewarded, shards });
    // the sparkles: scattered round the middle, more of them near it, each twinkling in its own time
    const sparks = Array.from({ length: 22 }, (_, i) => {
      const a = Math.random() * Math.PI * 2, d = 6 + Math.pow(Math.random(), 0.8) * 40;
      const s = el('div.play-golden-spark');
      s.style.cssText = `left: calc(var(--gx, 50%) + ${(Math.cos(a) * d * 1.3).toFixed(1)}vmin); top: calc(var(--gy, 50%) + ${(Math.sin(a) * d).toFixed(1)}vmin);`
        + `--s: ${Math.round(i % 4 ? 10 + Math.random() * 14 : 20 + Math.random() * 16)}px; --t: ${(1.8 + Math.random() * 1.8).toFixed(2)}s; --d: ${(Math.random() * 3).toFixed(2)}s;`;
      return s;
    });
    const layers = () => [el('div.play-golden-rays'), el('div.play-golden-rays.fine'), el('div.play-golden-glow'), ...sparks];
    let o;
    if (card) {
      o = el('div.play-golden.under', {}, ...layers());
      this.screen.after(o);
      this.goldenQuiet = true;                                          // (no names, no quest pip over it: drawNames, questTarget)
      // the rays' middle: behind the scroll, wherever the screen lays it out (each frame: a resized window moves it)
      const follow = () => {
        if (!o.isConnected) return;
        const b = this.gameUi?.boxOf?.('founding', 'Scroll'), uc = this.uiCanvas;
        if (b && uc?.width) {
          const k = uc.getBoundingClientRect().width / uc.width, at = o.getBoundingClientRect(), u0 = uc.getBoundingClientRect();
          o.style.setProperty('--gx', `${Math.round(u0.left - at.left + (b.x + b.w / 2) * k)}px`);
          o.style.setProperty('--gy', `${Math.round(u0.top - at.top + (b.y + b.h / 2) * k)}px`);
        }
        requestAnimationFrame(follow);
      };
      follow();
      card.then(() => { this.goldenQuiet = false; out(o); if (rewarded) this.luckyShard({ shards }, false); });
    } else {
      let btn;
      o = el('div.play-golden', {}, ...layers(),
        el('div.play-golden-card', {},
          el('div.play-golden-kicker', {}, 'Marven\'s scroll'),
          el('div.play-golden-title', {}, 'Story Completed!'),
          el('div.play-golden-line', {}, 'You have successfully completed the Founding Farmer story!'),
          el('div.play-golden-line', {}, rewarded ? `You've earned a Free Mint Spot and ${shards} Averyn Shards!`
            : 'The 1,000 free mint spots have all been claimed, but your name is on the Founders\' roll.'),
          btn = el('button', { type: 'button' }, 'Continue')));
      btn.addEventListener('click', () => out(o));
      this.overlay.append(o);
    }
    requestAnimationFrame(() => o.classList.add('on'));
    this.sound?.cue('levelUp');
    this.keys.clear();
  }

  /** ARMOUR PUT ON OR TAKEN OFF (rules.js armourLook, 2026-10-26): the farmer drawn in it, and the others told -- the server
   *  reads the save's armour for them, never this page's word (server/newgame.js cleanLook). `tell`: false at the start. */
  gearChanged(tell = true) {
    if (!this.rig) return;
    const g = armourLook(this.localSave());
    if ((this.rig.look.armour ?? null) === g.armour && (this.rig.look.helmet ?? null) === g.helmet) return;
    this.rig.setLook({ ...this.rig.look, armour: g.armour ?? undefined, helmet: g.helmet ?? undefined });
    this.preloadRig?.();
    if (!tell) return;
    clearTimeout(this.gearTimer);
    this.gearTimer = setTimeout(() => this.live?.setLook(this.rig.look), 1500);
  }

  /** Up from a rest (the player chose to): the energy stops filling, and what it gave is kept (rules.js Energy.getUp). */
  risen() {
    const e = this.energy, now = gameNow();
    if (!e || this.travelling) return;
    const was = e.recovering(now);
    if (e.recovery) this.act('getUp');                             // (any rest still written down, a filled one too: over)
    const v = Math.floor(e.value(now));
    if (v >= e.max - 0.5) this.say('You get up, fully rested');
    else if (was) { const left = Math.floor(e.sleepLeft(now)); this.say(`You get up with ${v} energy${left > 0 ? `. ${left} sleep left today` : ''}`); }
  }

  /** What the bed says while you rest in it: how long till the bar is full, and how to get up. */
  restText(now = gameNow()) {
    const e = this.energy;
    if (this.app.game && !openingDone(this.localSave())) return 'E  Get up';            // (the opening: Marlow's spare bed)
    if (e?.recovering(now)) {
      const end = this.restEnd();
      return `E  Get up  (${end >= e.max ? 'full energy' : `${end} energy`} in ${until(e.recovery.until, now)})`;
    }
    // (a rest carried on gives only what it had left, so it may end short of a full bar: then never "fully rested" --
    //  2026-10-01, a player saw it at 36 energy, after getting up early and lying down again)
    if (e && e.value(now) < e.max - 0.5) return e.canRest(now) ? 'E  Get up' : 'E  Get up  (no more sleep for energy today)';
    return 'E  Get up  (fully rested)';
  }
  /** The energy the rest under way ends at (a whole number), or null when there is none. */
  restEnd() { const e = this.energy; return e?.recovery ? Math.min(e.max, Math.floor(e.value(e.recovery.until) + 0.5)) : null; }

  /** Back in the bed you were resting in when you went (the server keeps you there, world2.js state): still resting. */
  backToBed() {
    const bedZone = (this.app.doc?.zones ?? []).find((z) => (z.tags ?? []).includes('bed'));
    if (!bedZone || !this.hero) { this.act('getUp'); return; }                   // no bed here: the rest is over
    const art = this.bedArt(bedZone);
    [this.x, this.y] = this.freeNear(Math.round(art.x + art.w / 2), art.y + art.h + 8);
    this.hero.x = this.x; this.hero.y = this.y;
    this.hero.sleepIn(art, Infinity, () => this.risen());
  }

  /** Someone the cutscenes' panel brings in for its moment (game/theatre.js): their spot, whatever the story says. */
  theatreShows(z) {
    const t = this.theatreShow;
    return !!t && npcOf(z) === t.id && (!t.zone || t.zone.test(z.name ?? ''));
  }
  /** THE OPENING (game/quests.js OPENING): a new farmer wakes in Marlow's bed, the room fading in. */
  wakeInBed() {
    const bedZone = (this.app.doc?.zones ?? []).find((z) => (z.tags ?? []).includes('bed'));
    if (!bedZone || !this.hero) return;
    const art = this.bedArt(bedZone);
    [this.x, this.y] = this.freeNear(Math.round(art.x + art.w / 2), art.y + art.h + 8);
    this.hero.x = this.x; this.hero.y = this.y;
    // (2026-10-22, the designer: "when the game asks you to press E to get up from the bed, there should be a cutscene where
    //  the player will be very shocked and surprised where the player is": E gets you up, and the wake scene plays)
    this.hero.sleepIn(art, Infinity, () => this.openingScene());
    const veil = (this.veil ??= el('div.play-veil'));
    if (veil.parentNode !== this.overlay) this.overlay.insertBefore(veil, this.hud);
    veil.classList.add('on');
    setTimeout(() => veil.classList.remove('on'), 700);
    setTimeout(() => this.say('You wake in a bed that isn\'t yours. Somewhere in the house, someone is moving about.', 6000), 1400);
  }
  /** Up out of Marlow's spare bed for the first time: the wake scene, and then the old man's first words. */
  openingScene() {
    this.scenes?.play(SCENES.wake, () => { const m = this.scenes.person('marlow'); if (m && !openingDone(this.localSave())) this.talkTo(m); });
  }
  /**
   * THE STORY'S MOMENTS THAT PLAY BY THEMSELVES (game/cutscenes.js CUES): on their map, where the story is, with whoever
   * is in them near -- once each (remembered in this browser), and never over a window, a door or another moment.
   */
  scenesDue() {
    if (!this.scenes || this.scenes.playing || this.twelve?.playing || this.travelling || this.gameUi?.windowOpen || this.hero?.pose?.bed || this.theatreOn) return;
    const id = this.app.doc?.id, save = this.localSave();
    if (!save || !CUES.some((c) => c.map === id)) return;
    const key = 'bloomshire.scenes', seen = (this.scenesSeen ??= new Set((() => { try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; } })()));
    const inv = this.inv, who = this.app.player?.name ?? 'me', q = { step: (qid) => activeOf(save, qid)?.step ?? null,
      has: (id) => [...(inv?.hotbar ?? []), ...(inv?.bag ?? [])].some((x) => x?.id === id) };
    for (const c of CUES) {
      if (c.map !== id || seen.has(`${who}:${c.id}`) || !c.when(q)) continue;
      const p = c.near ? this.scenes.person(c.near) : null;
      if (c.near && (!p || Math.hypot(p.x - this.x, p.y - this.y) > (c.r ?? 120))) continue;
      const at = c.at ? c.at(this) : null;
      if (c.at && !at) continue;
      // (creatures about: the moment waits until they are dealt with -- foesNear)
      if (this.foesNear(at ?? p ?? this)) { this.clearFirst(); return; }
      seen.add(`${who}:${c.id}`);
      try { localStorage.setItem(key, JSON.stringify([...seen])); } catch { /* remembered for this visit */ }
      this.scenes.play(c.scene, () => { const t = c.talk ? this.scenes.person(c.talk) : null; if (t) this.talkTo(t); }, { at });
      return;
    }
  }

  /** Is a moment playing -- a scene, the twelve's, the theatre's -- in which the world holds still? */
  inMoment() { return !!(this.scenes?.playing || this.twelve?.playing || this.theatreOn || this.grotto?.playing); }
  /**
   * CREATURES ABOUT (2026-10-27, the designer: "when there is a cutscene, the enemies still attack the player, which should
   * not happen in any way at all ... the players will only be able to interact with the area where a cutscene might play
   * after that area has been cleared out of those enemies"): any creature alive and up out of the ground within `r` of
   * the spot -- or of the farmer -- that is not going home.
   */
  foesNear(at = this, r = FOES_NEAR_PX) {
    const spots = [at, this].filter((q) => q && Number.isFinite(q.x));
    return (this.combat?.enemies ?? []).some((e) => !e.dead && !e.buried && !e.returning && !e.def?.stationary
      && spots.some((q) => Math.hypot(e.x - q.x, e.y - q.y) < r));
  }
  /** ...said, now and then (or at once, asked). */
  clearFirst(now = false) {
    const t = performance.now();
    if (!now && t - (this.clearSaid ?? -1e9) < 8000) return;
    this.clearSaid = t;
    this.say('Deal with the creatures around here first', 3200);
    if (now) this.sound?.cue('deny');
  }

  /** The server's save has replaced this one (it refused something, or anything economic): everything the
   *  game shows is read from it again. */
  reloadFromSave(reason = null) {
    // WHERE YOU ARE IS THE MAP ON SCREEN (2026-10-02, a player at the Bakery's ovens: "There is no stove here"): a save
    // from the server can be from before a door this page already went through (an ask, a refusal or a push answered
    // while the travel was on its way); taken whole, its `where` put the rules back on the last map -- which Play's rules
    // cannot see (rulesCtx) -- so the stove, the townsfolk and the way out were "not here". The travel itself is still
    // queued, and the server runs it (game/session.js), so the two agree again.
    if (this.app.game && this.app.doc && !this.travelling && !this.collapsing) this.localSave().where = this.app.doc.id;
    const founding = this.energy?.founding;
    if (this.inv) Object.assign(this.inv, new Inventory());
    if (this.energy) { Object.assign(this.energy, new Energy()); this.energy.setFounding(!!founding); }
    if (this.health) Object.assign(this.health, new Health());
    if (this.app.doc) { this.farm = new Farm(this.app.doc, (p) => this.app.assets.image(p)); this.nodes = new Nodes(this.app.doc); }
    if (this.hero) this.hero.env = this.heroEnv();
    this.folk?.refresh();
    this.ui?.refresh?.();
    if (reason) this.say(reason);
  }

  /** E: talk to whoever you face; else use what is in front of you -- the boat, the bed, a chest, the wardrobe; else
   *  ask the player beside you to trade (2026-09-28, face to face: game/trade.js). */
  interact() {
    if (this.travelling || this.crossing || this.collapsing || this.gameUi?.windowOpen || this.scenes?.playing || this.twelve?.playing) return;
    const h = this.hero;
    const p = this.personAhead();
    if (p) { this.talkTo(p); return; }
    // (a DEATH BAG at your feet: take it -- yours, or anyone's past its hours; the server's to say: commands.js bag.take)
    const bag = this.bagNear();
    if (bag) {
      this.askStory('bag.take', { id: bag.id }).then((r) => {
        if (!r) return;
        if (r.ok) { this.sound?.cue('bagPickup'); this.say(bag.mine ? 'Your things, back in your hands' : `You found ${bag.owner || 'a farmer'}'s bag`); if (r.left) this.say('Some is still in the bag. There was no room for it'); }
        else this.say(r.reason);
        this.loadBags();
      });
      return;
    }
    // (a BOSS'S LOOT CHEST at your feet: yours, or anyone's past its hours -- rules.js BOSS_CHEST)
    const loot = this.chestNear();
    if (loot) {
      const wait = this.chestOpensIn(loot);
      if (wait > 0) this.say(`This is ${loot.owner || 'another farmer'}'s chest. Anyone may open it in ${prizeBackIn(wait)}`);
      else this.openLootChest(loot);
      return;
    }
    const [ax, ay] = h.ahead(12);
    const sp = this.spotAt(ax, ay) ?? this.boatSpot();
    if (sp) { if (sp.ok) this.useSpot(sp); else this.say(sp.text); return; }
    // (YOUR PET LAST -- 2026-10-22, the testers: it is always beside its farmer, and an E for its treat had come before
    //  the death bag and before what is ahead, a chest, the bed: none of them could be had while it was not fed)
    // (your pet, beside you, with something in its satchel: take it -- game/pet.js, commands.js pet.take)
    if (this.pet?.near(h.x, h.y) && this.petFindsNow() > 0) {
      const r = this.act('pet.take', {});
      if (r.ok) {
        this.sound?.cue('pickup'); const n = new Map(); for (const id of r.got ?? []) n.set(id, (n.get(id) ?? 0) + 1);
        this.say(r.back?.length ? `Your pet gives back what you carried${r.left ? ': the rest when you have room' : ''}` : `From its satchel: ${[...n].map(([id, k]) => `${k} ${id}`).join(', ')}`);
      } else this.say(r.reason);
      return;
    }
    // (...or, short of energy, fed: a crop, a fish or meat -- commands.js pet.treat, rules.js PET_ENERGY, 2026-10-23)
    if (this.pet?.pet && this.pet.near(h.x, h.y) && this.localSave()?.pet && petEnergyOf(this.localSave().pet) <= PET_ENERGY.max - 10) {
      const r = this.act('pet.treat', {});
      if (r.ok) { this.sound?.cue('pickup', { gain: 0.6 }); this.say(`Your pet ate a ${r.gave}: energy ${r.energy} of ${PET_ENERGY.max}`); }
      else this.say(r.reason);
      return;
    }
    // (E beside another farmer asked them to trade -- by accident too, players said: 2026-10-03 a tap or a click on them
    //  opens their card instead, with a Trade button: game/friends.js)
  }

  /**
   * A PHONE'S HABITS (2026-09-29): its Back (Android's button, an iPhone's swipe from the edge) would leave the game
   * mid-play -- here it closes the window that is open, else opens the menu (Save & quit is there); and while the game
   * is played its screen stays on (a wait for a bite is not a phone left alone). The Back is caught with a page of
   * history put in at the first touch or key (a browser keeps only one put in by the player's own hand).
   */
  guardPhone() {
    const armed = () => {
      if (this.backArmed || !this.on) return;
      this.backArmed = true;
      try { history.pushState({ bloomshire: 'play' }, ''); } catch { /* no history here */ }
    };
    const arm = () => { for (const t of ['touchend', 'keydown', 'mousedown']) window.addEventListener(t, armed, { once: true, capture: true }); };
    arm();
    this.onBack = () => {
      if (!this.on) return;
      this.backArmed = false; arm();                                // (the next Back is caught too, from the next touch on)
      if (this.leaderboard?.isOpen) { this.leaderboard.close(); return; }      // (the town's boards, laid over all the rest)
      if (this.guideBook?.isOpen) { this.guideBook.close(); return; }          // (the guidebook: game/guidebook.js)
      if (this.boostsWin?.isOpen) { this.boostsWin.close(); return; }          // (your boosts: game/boostsui.js)
      if (this.friends?.isOpen) { this.friends.onKey({ key: 'Escape', preventDefault() {} }); return; }   // (friends: a card back to the list, then shut)
      if (this.chat?.isOpen) { this.chat.close(); return; }
      if (this.gameWallet?.box) { if (!this.gameWallet.busy) this.gameWallet.close(); return; }
      if (this.emporium?.box) { this.emporium.close?.(); return; }
      if (this.gameUi?.escape()) { this.keys.clear(); return; }
      this.keys.clear(); this.gameUi?.stack.open('pause');
    };
    window.addEventListener('popstate', this.onBack);
    // the screen kept on, while the game is in view (a wake lock goes when the page is hidden: asked for again)
    if (!this.touchUi || !navigator.wakeLock) return;
    this.keepAwake = async () => {                                 // (not "wake": that is getting up after fainting)
      if (!this.on || document.visibilityState !== 'visible' || this.wakeLock) return;
      try { this.wakeLock = await navigator.wakeLock.request('screen'); this.wakeLock.addEventListener('release', () => { this.wakeLock = null; }); } catch { /* the browser said no */ }
    };
    document.addEventListener('visibilitychange', this.keepAwake);
    window.addEventListener('touchend', this.keepAwake, { capture: true });
    this.keepAwake();
  }

  /** A point on the page (a mouse's, a finger's), in the game's terms: the view's pixels (sx, sy), the interface's
   *  (ux, uy: it is drawn finer than the world, game/ui.js), the world's (x, y), and whether it is on the view. */
  pointAt(clientX, clientY) { const p = toLocal(clientX, clientY); return this.pointLocal(p.x, p.y); }
  /** The same, for a point already on the page as the game lies on it (game/turn.js: a page drawn on its side). */
  pointLocal(clientX, clientY) {
    const r = localRect(this.screen.getBoundingClientRect());
    const sx = ((clientX - r.left) / r.width) * this.vw, sy = ((clientY - r.top) / r.height) * this.vh;
    const ux = ((clientX - r.left) / r.width) * (this.uiW ?? GAME_W), uy = ((clientY - r.top) / r.height) * (this.uiH ?? GAME_H);
    return { sx, sy, ux, uy, x: sx + Math.round(this.cam.x), y: sy + Math.round(this.cam.y), on: sx >= 0 && sy >= 0 && sx < this.vw && sy < this.vh };
  }

  /** A TAP ON THE WORLD (game/touch.js): what a click does -- what is in your hand, aimed there; a person or a thing
   *  in reach talked to or used -- and a tap on another player beside you asks them to trade (E, on a keyboard). */
  tapWorld(m) {
    if (!m?.on || !this.hero || this.gameUi?.windowOpen) return;
    // ANOTHER FARMER TAPPED (2026-10-03): their card -- a friend request, a trade (game/friends.js); no trade asked at once
    const other = this.playerAt(m.x, m.y);
    if (other) { this.friends?.openCard(other); return; }
    const h = this.hero;
    h.x = this.x; h.y = this.y;
    // WHAT THE FINGER WAS ON (2026-09-29, the designer: "unable to interact with the stones"): a person by their
    // whole figure, a thing by its picture as well as its zone (a standing stone rises from the zone at its foot),
    // with a finger's slack -- used if it is within a step or two, else the game says to come closer
    const free = h.mode === 'foot' && !h.carry && !h.fishGame && !h.pose?.stuck && (!h.pose || h.pose.hold);
    const p = free ? this.personTapped(m.x, m.y) : null;
    if (p) {
      h.face(p.x, p.y);
      // (in reach -- or across a shop's counter, which E reaches over: personAhead)
      if (Math.hypot(p.x - this.x, p.y - this.y) <= TAP_REACH + 6 || this.personAhead() === p) this.talkTo(p);
      else this.say(`Walk closer to talk to ${p.def.name}`);
      this.ui?.refresh();
      return;
    }
    const t = free ? this.spotTapped(m.x, m.y) : null;
    if (t) {
      h.face(t.x, t.y);
      if (t.d > TAP_REACH) this.say('Walk closer to reach that');
      else if (t.sp.ok === false) this.say(t.sp.text);
      else this.useSpot(t.sp);
      this.ui?.refresh();
      return;
    }
    h.useToward(m.x, m.y); this.ui?.refresh();
  }
  /** The other farmer a click or a finger is on (game/live.js): their figure, head to feet, a little wider; or null. */
  playerAt(x, y) {
    if (!this.othersOn) return null;                 // (Settings: other players hidden -- nobody there to click)
    let best = null, bd = Infinity;
    for (const r of this.live?.remotes?.values() ?? []) {
      if (Math.abs(x - r.x) > 10 || y < r.y - 30 || y > r.y + 4) continue;
      const d = Math.abs(x - r.x) + Math.abs(y - (r.y - 12));
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }
  /** The townsperson a finger is on: their figure, head to feet, a little wider than it looks. */
  personTapped(x, y) {
    let best = null, bd = Infinity;
    for (const p of this.folk?.people ?? []) {
      const top = p.y - this.folk.headOf(p) - 4;
      if (Math.abs(x - p.x) > 11 || y < top || y > p.y + 5) continue;
      const d = Math.abs(x - p.x) + Math.abs(y - (p.y - 12));
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  /** The spot a finger is on (spotAt: a stone, a chest, a clue, a bed...), found at the finger or a little below it --
   *  the thing drawn stands up from its zone -- or a little to either side; with how far it is from your feet. */
  spotTapped(x, y) {
    for (const [dx, dy] of [[0, 0], [0, 8], [0, 16], [0, 24], [0, 32], [-6, 0], [6, 0], [-6, 12], [6, 12], [0, -6]]) {
      const sp = this.spotAt(x + dx, y + dy);
      if (!sp) continue;
      const z = sp.z, fx = this.x, fy = this.y - 4;
      // (from your feet to the nearest edge of its zone; a chest you set down, to the finger)
      const nx = z ? Math.max(z.x, Math.min(fx, z.x + z.w)) : x, ny = z ? Math.max(z.y, Math.min(fy, z.y + z.h)) : y;
      return { sp, d: Math.hypot(nx - fx, ny - fy), x: z ? z.x + z.w / 2 : x, y: z ? z.y + z.h / 2 : y };
    }
    return null;
  }
  /** The thing in your hand, tapped again on the hotbar (game/touch.js): used on its own -- eaten, read, set down. */
  useHeld() {
    const h = this.hero;
    if (!h || this.gameUi?.windowOpen) return;
    h.x = this.x; h.y = this.y;
    h.useItem();
    this.ui?.refresh();
  }
  /** The line over the hotbar, tapped: what it says, done -- "Talk to Maren" (E), "Swim" (F), "Hoe this line" (Space). */
  promptAction() {
    const h = this.hero, key = /^(E|F|Space)\s/.exec(h?.preview()?.text ?? '')?.[1];
    if (!key || this.gameUi?.windowOpen) return;
    if (key === 'E') h.press('e');
    else if (key === 'F') h.press('f');
    else { h.x = this.x; h.y = this.y; const [x, y] = h.ahead(20); h.useToward(x, y); }
    this.ui?.refresh();
  }
  /** The thing in your hand, thrown away -- asked first (Delete, on a keyboard; a long hold on its slot, by touch). */
  discardHeld() { this.hero?.press('Delete'); this.ui?.refresh(); }

  /** Who E talks to: the person you face, close by -- or, at a shop's counter and facing it, its keeper
   *  however deep the counter. */
  personAhead() {
    const h = this.hero;
    if (!h || !this.folk) return null;
    const p = this.folk.facing(this.x, this.y, h.facing);
    if (p || h.facing !== 'up') return p;
    const at = (this.app.doc?.zones ?? []).some((z) => (z.tags ?? []).includes('shop-counter')
      && this.x >= z.x && this.x < z.x + z.w && this.y >= z.y - 4 && this.y < z.y + z.h + 4);
    return at ? this.folk.facing(this.x, this.y, 'up', 96) : null;
  }

  /** A word with someone: they turn to you, and their window opens (game/ui.js openTalk). */
  talkTo(p) {
    if (this.twelve?.playing || this.scenes?.playing) return;          // (a moment playing: a tap on someone waits)
    p.facing = { up: 'down', down: 'up', left: 'right', right: 'left' }[this.hero.facing];
    this.hero.endPose();
    this.keys.clear();
    if (this.gameUi?.openTalk(p)) return;
    this.say(`${p.def.name}: ${p.def.lines[0]}`);
  }

  /** The boat you stand at: the end of a pier, a zone tagged boat and to:<map>. */
  boatSpot() {
    const z = (this.app.doc?.zones ?? []).find((q) => (q.tags ?? []).includes('boat') && doorTarget(q)
      && this.x >= q.x - 6 && this.x < q.x + q.w + 6 && this.y >= q.y - 10 && this.y < q.y + q.h + 6);
    if (!z) return null;
    const to = doorTarget(z), home = /^home_/.test(to);
    // (THE GOLDEN BOAT, 2026-10-08: to the VIP Quarter, and back)
    if ((z.tags ?? []).includes('golden')) return { kind: 'boat', z, to, name: 'Golden boat', text: /^vip/.test(to) ? 'E  Board the golden boat' : 'E  Sail back to Bloomshire', ok: true };
    return { kind: 'boat', z, to, name: 'Boat', text: home ? 'E  Sail home' : 'E  Sail to Bloomshire', ok: true };
  }

  /** AT THE SHIP (the designer, 2026-09-25): it asks -- "Sail to Bloomshire?" or "Sail home?" -- once as you
   *  come up to it, and again whenever you press E there. Yes sets sail (cross); no leaves you on the dock. */
  askToSail(z) {
    // THE GOLDEN BOAT (the designer, 2026-10-08: "only those who have a VIP pass will be able to use that boat, everyone
    // else will be denied"): to anyone without a pass, the VIP Pass instead (the server refuses the crossing too:
    // rules.js lock:vip); to a pass holder, the question. In the editor the designer's own testing switch says (the HUD)
    if ((z.tags ?? []).includes('golden')) {
      const out = /^vip/.test(doorTarget(z) ?? '');
      // (the Quarter shut for now -- rules.js VIP_QUARTER_OPEN: said, for all but an admin)
      if (out && !VIP_QUARTER_OPEN && this.app.game && !this.app.player?.admin) { this.sayWait(VIP_CLOSED_WORDS, 'Coming soon'); return; }
      if (out && !this.vipNow()) { this.openVipPass({ boat: true }); return; }
      const asked = this.gameUi?.askYesNo({
        question: out ? 'Sail to the VIP Quarter?' : 'Sail back to Bloomshire?',
        detail: out ? 'The golden boat carries VIP pass holders across the water.' : 'The golden boat rows you back to town.',
        yes: 'Set sail', no: 'Stay', onYes: () => this.cross(z),
      });
      if (asked) this.keys.clear(); else this.cross(z);
      return;
    }
    const home = /^home_/.test(doorTarget(z) ?? '');
    const asked = this.gameUi?.askYesNo({
      question: home ? 'Sail home?' : 'Sail to Bloomshire?',
      detail: home ? 'Row back across the water to your island.' : 'Row across the water to the town of Bloomshire.',
      yes: 'Set sail', no: 'Stay', onYes: () => this.cross(z),
    });
    if (asked) this.keys.clear(); else this.cross(z);             // (no interface, as in a bare editor: just go)
  }
  /** Is the farmer VIP now (their pass running: rules.js isVip)? In the editor, its own testing switch (the HUD's). */
  vipNow() { return this.app.game ? isVip(this.localSave()) : !!this.inv?.vip; }
  /** THE CELESTIAL GARDEN'S PANEL (game/garden.js): from a pedestal, and from Iris, its keeper. */
  openGarden() { (this.gardenPanel ??= new GardenPanel(this)).open(); }
  /** THE VIP PASS window (game/vippass.js): from the golden boat, the HUD's badge, the Emporium. */
  openVipPass(o = {}) {
    // (not sold while its perks are decided -- catalog.js VIP_PASS_ON_SALE: the golden boat only says so; an admin sees it)
    if (!VIP_PASS_ON_SALE && this.app.game && !this.app.player?.admin) { this.sayWait(o.boat ? 'The golden boat sails only for VIP pass holders.' : 'The VIP Pass is coming soon.', 'Coming soon'); return; }
    (this.vipPass ??= new VipPass(this)).open(o);
  }
  /** A pass bought or renewed: the hotbar's second row and the badge follow at once (the save that brought it is in). */
  vipChanged() { this.inv?.setVip?.(this.vipNow()); this.energy?.setFounding(!!this.founders?.founder || this.vipNow()); this.ui?.refresh?.(); }

  /** Coming up to the ship asks once; walk away and back and it asks again. */
  checkBoat() {
    const sp = this.boatSpot();
    if (!sp) { this.boatAsked = null; return; }
    if (this.boatAsked === sp.z || this.crossing || this.travelling || this.gameUi?.windowOpen) return;
    this.boatAsked = sp.z;
    this.askToSail(sp.z);
  }

  /** ROWING ACROSS (the designer, 2026-09-25): not a step onto the pier's end but E at the boat, and it takes
   *  a moment -- the screen dims, the oars splash, the far shore comes up (a second and a half). */
  async cross(z) {
    if (this.crossing || this.travelling) return;
    this.crossing = true; this.keys.clear();
    const veil = (this.veil ??= el('div.play-veil'));
    if (veil.parentNode !== this.overlay) this.overlay.insertBefore(veil, this.hud);
    requestAnimationFrame(() => veil.classList.add('on'));
    this.sound?.cue('splash'); this.sound?.cue('boatDepart');
    this.say(/^home_/.test(doorTarget(z) ?? '') ? 'Rowing home...' : 'Rowing to Bloomshire...');
    await new Promise((ok) => setTimeout(ok, 900));
    try { await this.travel(z); } finally {
      await new Promise((ok) => setTimeout(ok, 350));
      veil.classList.remove('on');
      this.crossing = false;
    }
  }

  /** The map being played, for the interface's Map window: its size, a picture of it at a scale, its named places --
   *  and where they are, for their names on the picture. */
  mapInfo() {
    const app = this.app, doc = app.doc;
    // (places: not the people standing about, nor the quests' spots)
    const named = (doc.zones ?? []).filter((z) => z.name && !(z.tags ?? []).every((t) => t === 'farm' || t === 'swim' || t === 'exit')
      && !(z.tags ?? []).some((t) => /^(npc|clue|puzzle|forage|show|var):/.test(t) || t === 'cook' || t === 'mill' || t === 'dairy' || t === 'craft' || t === 'loom' || t === 'fishing'));
    return {
      w: this.mapW, h: this.mapH, name: gameName(doc), bg: doc.background ?? null,
      render: (k, x = 0, y = 0, w = this.mapW, h = this.mapH) => app.renderer.renderRegion(x, y, w, h, k),   // (a part of it: game/ui.js #fillMap)
      places: () => [...new Set(named.map((z) => z.name))],
      labels: () => this.mapLabels(named),
      // (the fishing spots, drawn on the map: game/ui.js #mapPicture -- commands.js fishingSpotAt)
      fishing: () => (doc.zones ?? []).filter((z) => (z.tags ?? []).includes('fishing')).map((z) => ({ x: z.x, y: z.y, w: z.w ?? z.width, h: z.h ?? z.height })),
      // (your pin, if it is on this map, and a click on the picture to set it: 2026-10-26)
      pin: () => { const p = this.pinNow(); return p && p.map === doc.id ? p : null; },
      setPin: (x, y, near) => this.pinAt(x, y, near),
    };
  }

  /**
   * THE NAMES ON THE MAP (testers, 2026-09-29: "more detailed landmark names"), made from the places the map already
   * names -- only places, never the map's workings (a stall, a ladder, stepping stones, where slimes come from, a
   * thing to look at): a door is the place it leads into ("Bank", "Glimmer Hollow"), a way out to another part of the
   * world "To Whisperwood"; a named place (a zone tagged area), the river, a field, their names without the editor's
   * notes in brackets. A door the story keeps shut for this player (a secret way, a quest's lock) is not named until
   * it opens; a cave that only wants a better pickaxe is. The same name twice, close together, is one name between
   * them. [{ name, x, y, door }] in the map's pixels -- a door's name goes over it (x, y: the top of the door), a
   * place's in its middle -- the doors first, then the places, then the ways out.
   */
  mapLabels(named) {
    const names = this.app.world?.index?.names ?? {}, save = this.localSave(), out = [];
    for (const z of named) {
      const tags = z.tags ?? [], to = doorTarget(z);
      const cx = z.x + (z.width ?? 0) / 2, cy = z.y + (z.height ?? 0) / 2;
      if (to) {
        const there = names[to];
        if (!there || to === this.app.doc?.id || lockedBecause(z, save, 99)) continue;
        const room = /^(interior_|cave_)/.test(to);
        out.push({ name: room ? there : `To ${there}`, x: cx, y: room ? z.y : cy, door: room, rank: room ? 0 : 2 });
        continue;
      }
      if (!tags.some((t) => t === 'area' || t === 'river' || t === 'farm')) continue;
      const name = String(z.name).replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (name) out.push({ name, x: cx, y: cy, door: false, rank: 1 });
    }
    // the same name, near itself: once, between
    const merged = [];
    for (const l of out) {
      const twin = merged.find((m) => m.name === l.name && Math.hypot(m.x - l.x, m.y - l.y) < 240);
      if (twin) { twin.n = (twin.n ?? 1) + 1; twin.x += (l.x - twin.x) / twin.n; twin.y += (l.y - twin.y) / twin.n; } else merged.push({ ...l });
    }
    return merged.sort((a, b) => a.rank - b.rank);
  }

  /** What the player's actions need to know about the place: solid, water, indoors, the living world. */
  heroEnv() {
    const doc = this.app.doc;
    return {
      // (what only the server can answer -- a catch: commands.js ASKED -- asked of it, and waited for)
      ask: this.session ? (n, a) => this.session.ask(n, a) : null,
      blocked: (x, y) => this.solid(x, y), isWater: (x, y) => this.isWater(x, y), canSwim: (x, y) => this.canSwim(x, y), say: (t) => this.say(t),
      freeEnergy: () => freeEnergyAt(this.app.doc?.id),                  // (a VIP place: nothing spends energy -- rules.js freeEnergyAt)
      wetFeet: (x, y) => this.wetFeet(x, y), alongStones: (x, y, dx, dy) => this.alongStones(x, y, dx, dy),
      image: (p) => this.app.assets.image(p), world: this.world,
      // the mounts: a holder of five Founding Farmers (save.perks, the server's) and the game's admins (the designer, 2026-10-04,
      //  2026-10-22; hero.js MOUNTS_ON)
      rideWheel: () => (this.rideWheel ??= new RideWheel(this)).toggle(),   // (R: the mounts and the pet, game/ridewheel.js)
      rode: (kind) => { this.lastMount = kind; },                        // (the mount ridden last: the quick ride's, R twice)
      // (a holder's ONE mount, picked once, with stamina left -- mountWhyNot; the bear got down from stays and fights: game/bearpal.js)
      mountOk: (kind) => this.mountWhyNot(kind), mountTired: () => this.mountTired(),
      dismounted: (kind) => { if (kind === 'bear' && this.mayBear()) { this.bearPal = new BearPal(this); this.bearPal.x = this.x; this.bearPal.y = this.y; this.x -= 12; if (this.hero) this.hero.x = this.x; } },
      mounted: () => { this.bearPal = null; },
      mountsOn: () => !this.app.game || !!this.app.player?.admin || mountsOwned(this.localSave()).size > 0,   // (a mount picked or bought: rules.js mountsOwned, 2026-10-28; the editor's Play: the big maps on horseback, 2026-10-22)
      // (which skins: villager.js skinAllowed -- the exclusive ones the admins', the Founders' horse its chooser's)
      skinOk: (key, v) => !this.app.game || skinAllowed(key, v, { admin: !!this.app.player?.admin, horse: this.localSave()?.perks?.horse ?? null, owned: this.localSave()?.owned ?? null }),
      // (a mount's skin chosen while riding -- hero.js nextSkin: kept as the character screen keeps a look)
      setLook: (look) => { this.rig.setLook(look); saveLook(look); this.act('look', { look }); this.preloadRig(); this.ui?.buildLook(); this.live?.setLook(this.rig.look); },
      foodSave: () => this.localSave?.(),                              // (today's food energy, read before eating: hero.js noEnergyWords)
      energy: this.energy, health: this.health, pack: this.pack, inv: this.inv, farm: this.farm, nodes: this.nodes, combat: this.combat,
      spot: (x, y) => this.spotAt(x, y) ?? this.boatSpot(), useSpot: (sp) => this.useSpot(sp), readItem: (id) => this.readItem(id),
      gearChanged: () => this.gearChanged(),                         // (armour put on: the farmer drawn in it)
      useNeeded: (id) => this.useNeeded(id),
      mapId: doc.id, act: (n, a) => this.act(n, a), interact: () => this.interact(), restText: () => this.restText(),
      restLocked: () => false,                                         // (never a lock: get up whenever you like -- 2026-10-26)
      placeText: () => this.placeText(), placeChest: (slot) => this.placeChest(slot), discard: (slot, h) => this.discardAsk(slot, h),
      npcAhead: () => this.personAhead(),
      // the ladder you are on: the middle of its zone (you climb centred on it), or null
      ladderX: (x, y) => { const z = (this.ladders ?? []).find((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); return z ? z.x + z.w / 2 : null; },
      indoors: /^interior/i.test(doc.id) || doc.region === 'interiors',
      cue: (n, o) => this.sound?.cue(n, o),
      // (a Sunfire Chili on: on foot, faster -- rules.js BUFFS swift)
      pace: () => (buffOn(this.localSave(), 'swift') ? BUFFS.swift.pace : 1) * mealMult(this.localSave(), 'pace'),   // (a sweet dish: rules.js MEALS)
      mealDamage: () => mealMult(this.localSave(), 'combat') * dishMight(this.localSave()),   // (...and a Sunfire Chili: rules.js BUFFS)                                                         // (a meat dish)
      dashOn: () => dashHere(this.app.doc?.id),                                                                       // (Shift dashes there: dash)
    };
  }

  /** Is (x, y) on a road or a path? (Footsteps on stone.) */
  onRoad(x, y) {
    const T = this.app.doc.tileSize, W = this.app.doc.width, cx = Math.floor(x / T), cy = Math.floor(y / T);
    return cx >= 0 && cy >= 0 && cx < W && !!this.road?.[cy * W + cx];
  }

  /** Load every action for the current look ahead, so nothing blinks the first time it plays. */
  /**
   * THE FOUNDING FARMERS (2026-10-01, server/founders.js): does this player hold one (their bar is 200, refilling twice
   * as fast -- the server's own rules agree), and which do they play as. Asked at the start, when the town says their
   * farmers changed hands, and by the window (game/foundersui.js).
   */
  async loadFounders() {
    try {
      const r = await fetch(serverURL('api/founders'), { credentials: 'same-origin', cache: 'no-store' });
      if (r.ok) this.applyFounders(await r.json());
    } catch { /* the server is away: as you were */ }
  }
  applyFounders(info) {
    if (!info || info.ok === false) return;
    this.founders = info;
    // (the perks as the server just worked them out: the mounts, the Founders' horse -- before the next command brings them)
    const own = this.localSave?.();
    if (own && 'perks' in info) { if (info.perks) own.perks = info.perks; else delete own.perks; }
    this.energy?.setFounding(!!info.founder || this.vipNow());
    this.gameUi?.setFounder?.(!!info.founder);
    const fd = founderOf((info.farmers ?? []).find((f) => f.n === info.playing), info.wearing ?? null);
    this.founderRaw = fd;                                              // (as the server sent it: game/genderpick.js shows it both ways)
    if ((fd?.n ?? 0) !== (this.rig?.founder?.n ?? 0) || (fd?.set ?? null) !== (this.rig?.founder?.set ?? null) || (fd?.gender ?? null) !== (this.rig?.founder?.gender ?? null)) { this.rig.setFounder(fd); this.preloadRig(); }
  }

  /** THE EMPORIUM'S ENERGY REFILLS (2026-10-26): their own window (game/refillshop.js). */
  openRefills() { (this.refillShop ??= new RefillShop(this)).open(); }

  /** THE AVERYN EMPORIUM (2026-10-23): the pixel window (game/goodsshop.js) -- the old one if the interface lacks it. */
  async openEmporium(tab = null) {
    if (await (this.goodsShop ??= new GoodsShop(this)).open(tab)) return;
    (this.emporium ??= new Emporium(this)).open();
  }

  preloadRig() {
    const A = this.app.assets, rig = this.rig;
    for (const name of FIRST_ACTIONS) for (const p of rig.files(name)) A.image(p);
    // the rest a few at a time, behind what is on screen (2026-09-25: all 47 actions at once were ~225
    // requests ahead of the map's own art); an action wanted before its turn loads the moment it is drawn
    const rest = Object.keys(ACTIONS).filter((n) => !FIRST_ACTIONS.includes(n));
    clearTimeout(this.rigT);
    const next = () => {
      if (!this.on || this.rig !== rig) return;
      for (let n = 0; n < 2 && rest.length; n++) for (const p of rig.files(rest.shift())) A.image(p);
      if (rest.length) this.rigT = setTimeout(next, 100);
    };
    this.rigT = setTimeout(next, this.app.game ? 1200 : 0);
    // AND EACH POSE PUT TOGETHER AHEAD (2026-10-22, the designer: "much more smoother"): an action's frames are made from
    // the look's layers the first time it is drawn -- the first run, the first swing of each tool, had stopped the game
    // while they were (a Founding Farmer's some 50 ms). Now one at a time, in the moments the browser has to spare; one
    // whose pictures are not in yet is tried again later
    const todo = [...FIRST_ACTIONS, ...rest], tries = new Map(), turn = (this.bakeTurn = {});      // (a new look: this round only)
    const later = (f) => (window.requestIdleCallback ? window.requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 150));
    const bake = () => {
      if (this.rig !== rig || this.bakeTurn !== turn) return;
      while (todo.length && rig.baked.get(todo[0]) && !rig.baked.get(todo[0]).partial) todo.shift();
      if (!todo.length) return;
      const n = todo.shift(), b = rig.bake(n);
      if ((!b || b.partial) && (tries.set(n, (tries.get(n) ?? 0) + 1).get(n) < 40)) todo.push(n);
      later(bake);
    };
    later(bake);
  }

  /* ------------------------------------------------------------ one frame */

  /** THE VIEW FILLS THE WINDOW: the largest whole-number scale at which the game's 480 x 270 still
   *  fits, and then as much more of the world as the window's shape has room for -- never a black
   *  band, never less than 480 x 270. Sets this.px (screen pixels per world pixel) and the view,
   *  this.vw x this.vh world pixels; the frame's buffer follows it.
   *  ON A PHONE OR A TABLET (2026-09-29: the game "should look good on every device"): not a whole number, but
   *  exactly the scale that fills the screen with the 480 x 270 -- a whole number left a phone's view a third too
   *  small, the interface's words a millimetre high. A touch screen's pixels are too small for an uneven one to
   *  show. Settings' "Pixel-perfect scaling" chooses (this.exact): on for a desktop, off for a touch screen. */
  fit() {
    const dpr = window.devicePixelRatio || 1, view = viewSize(), W = view.w * dpr, H = view.h * dpr;      // (on its side: game/turn.js)
    const fill = Math.min(W / GAME_W, H / GAME_H), s = (this.exact ?? true) ? Math.max(1, Math.floor(fill)) : fill;
    this.px = s; this.vw = Math.max(GAME_W, Math.ceil(W / s)); this.vh = Math.max(GAME_H, Math.ceil(H / s));
    if (this.buffer && (this.buffer.width !== this.vw || this.buffer.height !== this.vh)) { this.buffer.width = this.vw; this.buffer.height = this.vh; }
    if (this.world) this.world.view = { w: this.vw, h: this.vh };     // what counts as out of sight (ambient.js)
    return s;
  }

  /**
   * A PAGE THAT CANNOT TURN (2026-09-29, game/turn.js): a phone held upright in a wallet app's browser -- which
   * stays upright however the phone is held -- or in one whose rotation is locked (the rotate screen's "Play
   * sideways"): the whole page is drawn on its side, and set straight again when the window turns itself.
   */
  turnCheck() {
    const key = `${innerWidth}x${innerHeight}`;
    if (key === this.turnKey) return;
    this.turnKey = key;
    const want = wantTurn(isPhone()), changed = want !== TURN.on;
    if (want || TURN.on) applyTurn(want);                         // (at a new size too: the page's box follows the window's)
    this.cssSize = ''; this.chatPlaced = '';
    if (changed) { this.touchPad?.reset(); this.keys.clear(); }
  }

  /** Settings' "Pixel-perfect scaling" (fit): this browser's choice, else on for a desktop and off for a touch screen. */
  readExact() {
    try { const v = localStorage.getItem('bloomshire.pixelPerfect'); if (v === '1' || v === '0') return v === '1'; } catch { /* a private window */ }
    return !touchFirst();
  }
  setExact(on) {
    this.exact = !!on;
    try { localStorage.setItem('bloomshire.pixelPerfect', on ? '1' : '0'); } catch { /* for this visit */ }
    this.cssSize = '';                                               // (the canvases are laid out again on the next frame)
  }
  /** SETTINGS' "SHOW OTHER PLAYERS" (2026-10-03, the designer: clicked by mistake while planting, another farmer's card
   *  came up): this browser's choice, on unless turned off. Off, the other farmers are not drawn, named or clickable
   *  here -- the chat still has their words, and they still see you. */
  readOthers() {
    try { return localStorage.getItem('bloomshire.others') !== '0'; } catch { return true; }
  }
  setOthers(on) {
    this.othersOn = !!on;
    try { localStorage.setItem('bloomshire.others', on ? '1' : '0'); } catch { /* for this visit */ }
  }

  /** THE FERRYMAN'S LANDINGS on this map (zones tagged ferry:<id>): [[id, its name]], the one you stand at left out. */
  ferryLandings() {
    return (this.app?.doc?.zones ?? []).filter((z) => (z.tags ?? []).some((t) => t.startsWith('ferry:')))
      .filter((z) => Math.hypot(z.x + (z.w ?? z.width) / 2 - this.x, z.y + (z.h ?? z.height) / 2 - this.y) > 96)
      .map((z) => [z.tags.find((t) => t.startsWith('ferry:')).slice(6), z.name || 'Across the water']);
  }
  /** Rowed across: set down at the landing, the camera with you. */
  ferried(r) {
    if (!Number.isFinite(r?.x) || !Number.isFinite(r?.y)) return;
    this.x = Math.round(r.x); this.y = Math.round(r.y);
    this.gameUi?.notify('Wick rows you across the black water.');
    this.sound?.cue?.('place', { gain: 0.6 });
  }
  /** THE NIGHT STALKER (refinement 6): on the darkest nights, in their hour, a hooded figure stands on the watchtower
   *  (game/ambient.js draws it). A farmer who sees it -- it on their screen, the tower near -- is told so, once a night,
   *  and the server keeps that they saw it (game/commands.js witness). */
  watchTower(dt = 0) {
    // (the tower's top is higher than the view is tall: on the darkest night, a farmer who stands still at its foot
    //  looks up, the camera rising slowly to the top; it comes back down when they move -- this.lookUp, update())
    const z = this.stalkerAt, out = stalkerOut(gameNow());
    const moved = this.x !== this.stillAt?.x || this.y !== this.stillAt?.y;
    this.stillAt = { x: this.x, y: this.y }; this.stillT = moved ? 0 : (this.stillT ?? 0) + dt;
    const below = Math.abs(this.x - z.x) < 6 * 16 && this.y > z.y && this.y - z.y < 300;
    const want = out && below && this.stillT > 1.2 ? Math.max(0, this.y - this.vh / 2 - (z.y - 72)) : 0;
    this.lookUp = (this.lookUp ?? 0) + (want - (this.lookUp ?? 0)) * Math.min(1, dt * (want > (this.lookUp ?? 0) ? 0.9 : 4));
    if (this.lookUp < 0.5 && !want) this.lookUp = 0;
    if (!out) { this.witnessT = 0; return; }
    if (this.witnessT) return;
    const c = this.cam ?? { x: 0, y: 0 };
    const inView = z.x > c.x && z.x < c.x + (this.vw ?? 0) && z.y - 40 > c.y && z.y < c.y + (this.vh ?? 0);   // (all of it, head to foot)
    if (!inView || Math.hypot(z.x - this.x, z.y - this.y) > 26 * 16) return;
    this.witnessT = 1;
    const r = this.act('witness', {});
    if (r?.ok) this.gameUi?.notify(r.first ? 'On the darkest of nights, someone stands watch on the old tower. You have seen the Night Stalker.' : 'The Night Stalker is on the tower again tonight.');
  }
  clampCam() {
    const vw = this.vw ?? GAME_W, vh = this.vh ?? GAME_H;
    this.cam.x = Math.max(0, Math.min(this.mapW - vw, this.cam.x));
    this.cam.y = Math.max(0, Math.min(this.mapH - vh, this.cam.y));
    // (the area the farmer is in: the view within it, as within a map of its own -- build's areas)
    const a = this.area;
    if (a) {
      this.cam.x = a.x1 - a.x0 < vw ? (a.x0 + a.x1 - vw) / 2 : Math.max(a.x0, Math.min(a.x1 - vw, this.cam.x));
      this.cam.y = a.y1 - a.y0 < vh ? (a.y0 + a.y1 - vh) / 2 : Math.max(a.y0, Math.min(a.y1 - vh, this.cam.y));
    }
    // THE PLACES BEYOND (2026-10-22, the designer: from the town "I can see the Whisperwood and Stonepeak region ... way too
    // weird", the playtest's town never showed them -- they are maps of their own now, over the edge doors): a zone tagged
    // `outside` is not this map's to show. The view keeps off it as off the map's own edge, the farmer still in it; what
    // shows of it at a corner is not drawn (drawOutside).
    for (const o of this.outside ?? []) {
      const x0 = this.cam.x, y0 = this.cam.y;
      if (x0 + vw <= o.x || x0 >= o.x + o.w || y0 + vh <= o.y || y0 >= o.y + o.h) continue;
      const ways = [];
      if (this.x >= o.x + o.w + 8) ways.push(['x', o.x + o.w]);
      if (this.x <= o.x - 8) ways.push(['x', o.x - vw]);
      if (this.y >= o.y + o.h + 8) ways.push(['y', o.y + o.h]);
      if (this.y <= o.y - 8) ways.push(['y', o.y - vh]);
      const best = ways.sort((a, b) => Math.abs(a[1] - this.cam[a[0]]) - Math.abs(b[1] - this.cam[b[0]]))[0];
      if (best) this.cam[best[0]] = best[1];
    }
    this.cam.x = Math.max(0, Math.min(this.mapW - vw, this.cam.x));
    this.cam.y = Math.max(0, Math.min(this.mapH - vh, this.cam.y));
    if (this.mapW < vw) this.cam.x = (this.mapW - vw) / 2;
    if (this.mapH < vh) this.cam.y = (this.mapH - vh) / 2;
  }
  /** What still shows of the places beyond (clampCam) is the map's own dark, as past a map's edge. */
  drawOutside(g) {
    if (!this.outside?.length && !this.area) return;
    g.save(); g.fillStyle = this.app.doc?.background || '#101418';
    for (const o of this.outside ?? []) g.fillRect(o.x, o.y, o.w, o.h);
    // (and round the area the farmer is in, every other area: not shown, as another map is not -- while the view slides
    //  over a border, round both: keepArea)
    const a = this.slide?.box ?? this.area;
    if (a) {
      const W = this.mapW, H = this.mapH;
      g.fillRect(0, 0, W, a.y0); g.fillRect(0, a.y1, W, H - a.y1); g.fillRect(0, a.y0, a.x0, a.y1 - a.y0); g.fillRect(a.x1, a.y0, W - a.x1, a.y1 - a.y0);
    }
    g.restore();
  }
  /** The area at (x, y) (build's areas): the one the farmer is in already, if it is one of those there; else the first. */
  areaAt(x, y) {
    const inn = (a) => x >= a.x0 && x < a.x1 && y >= a.y0 && y < a.y1;
    if (this.area && inn(this.area)) return this.area;
    return this.areas?.find(inn) ?? null;
  }
  /** Each frame: over a border by its road, into the next area. THE VIEW SLIDES ON INTO IT (2026-10-22, the designer: the
   *  crossing "stucks a bit, and then continues ... needs to be as smooth as butter"; it was a cut with a pale flash): for
   *  half a second the view goes from where it stood to where the new area has it, both areas shown, the farmer walking
   *  on (update). Put into another area from afar (a bed, a quest's jump) is still a cut. */
  keepArea(dt = 0) {
    if (!this.areas) return;
    const s = this.slide;
    if (s && (s.t += dt / SLIDE_S) >= 1) { this.cam = s.cam; this.slide = null; }
    this.warmAhead();
    const a = this.areaAt(this.x, this.y);
    if (!a || a === this.area) return;
    const was = this.slide?.box ?? this.area, M = 48;
    this.area = a;
    if (was && this.x >= was.x0 - M && this.x < was.x1 + M && this.y >= was.y0 - M && this.y < was.y1 + M) {
      const box = { x0: Math.min(was.x0, a.x0), y0: Math.min(was.y0, a.y0), x1: Math.max(was.x1, a.x1), y1: Math.max(was.y1, a.y1) };
      this.slide = { from: { x: this.cam.x, y: this.cam.y }, cam: { x: this.slide?.cam.x ?? this.cam.x, y: this.slide?.cam.y ?? this.cam.y }, t: 0, box };
      return;
    }
    this.slide = null;
    this.cam = { x: Math.round(this.x - this.vw / 2), y: Math.round(this.y - this.vh / 2) }; this.clampCam();
  }
  /** THE NEXT AREA'S GROUND MADE AHEAD (2026-10-22): near a border, the pieces of ground the view may show over it are
   *  drawn into the chunk cache a few a frame (render.js chunk), so sliding over costs nothing (a whole screen of new
   *  ground at once was 47 ms: three frames lost). */
  warmAhead() {
    const a = this.area, r = this.app.renderer, doc = this.app.doc;
    if (!a || !r?.chunks || !this.tiles?.layers) return;
    const M = 192;
    if (this.x - a.x0 > M && a.x1 - this.x > M && this.y - a.y0 > M && a.y1 - this.y > M) return;
    const span = 32 * doc.tileSize, t0 = performance.now();
    const kx0 = Math.max(0, Math.floor((this.x - this.vw) / span)), kx1 = Math.min(Math.ceil(doc.width / 32) - 1, Math.floor((this.x + this.vw) / span));
    const ky0 = Math.max(0, Math.floor((this.y - this.vh) / span)), ky1 = Math.min(Math.ceil(doc.height / 32) - 1, Math.floor((this.y + this.vh) / span));
    // (the things standing there: their pictures decoded by the browser beforehand, off the game's own time -- a big
    //  picture is otherwise decoded the first time it is drawn)
    const wk = `${doc.id}|${kx0},${ky0},${kx1},${ky1}`;
    if (wk !== this.warmKey) {
      this.warmKey = wk; this.decoded ??= new Set();
      const x0 = kx0 * span, y0 = ky0 * span, x1 = (kx1 + 1) * span, y1 = (ky1 + 1) * span;
      for (const l of doc.layers) if (l.type === 'objects' && l.visible) for (const o of l.objects) {
        if (this.decoded.has(o.asset) || o.x > x1 || o.x + o.w < x0 || o.y > y1 || o.y + o.h < y0) continue;
        const img = this.app.assets.image(o.asset)?.img;
        if (img?.decode) { this.decoded.add(o.asset); img.decode().catch(() => {}); }
      }
    }
    for (const layer of doc.layers) {
      if (layer.type !== 'tiles' || !layer.visible) continue;
      const L = this.tiles.layers.get(layer)?.staticLayer ?? layer;
      for (let ky = ky0; ky <= ky1; ky++) for (let kx = kx0; kx <= kx1; kx++) {
        const c = r.chunks.get(r.key(L, 1, kx, ky));
        if (c && !c.dirty) continue;
        r.chunk(L, kx, ky, 1);
        if (performance.now() - t0 > 3) return;                         // (a few a frame: the rest the next)
      }
    }
    // (and the moving water's pieces there, one frame of each: the rest are made a few a picture as it shows, game/tiles.js)
    const T = this.tiles, k = Math.floor((this.world?.t ?? 0) * T.fps);
    for (const layer of doc.layers) {
      const L = T.layers.get(layer);
      if (!L?.cells.length || !layer.visible) continue;
      const cyc = L.cycle || T.cycle;
      for (let ky = ky0; ky <= ky1; ky++) for (let kx = kx0; kx <= kx1; kx++) {
        if (!L.pieces.has(`${kx},${ky}`) || T.madeNear(L, layer.id, kx, ky, k % cyc)) continue;
        T.make(L, kx, ky, k % cyc, `${layer.id}|${kx},${ky}|${k % cyc}`);
        if (performance.now() - t0 > 3) return;
      }
    }
  }

  frame(now) {
    // (never backwards: a frame's time can fall a hair before a clock read since -- a door's arrival -- and
    // an animation's frame from a negative time is no frame at all)
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
    this.last = now; this.frameDt = dt;
    if (this.travelling) return;                   // the next place is opening: hold the last frame
    if (this.folkStale && !this.gameUi?.windowOpen) { const why = this.folkStale === 'weather' ? 'weather' : null; this.folkStale = false; this.folk?.refresh(false, why); }
    if (!this.dungeon?.choosing) this.update(dt);                   // (the dungeon's boon cards up: the world waits -- game/dungeon.js)
    this.draw();
    if (now - (this.guideAt ?? 0) > 500) { this.guideAt = now; this.guideTick(); }
  }

  /* ------------------------------------------------------------ the guide (game/ui.js TOUR, TIPS) */

  /** What this farmer has been shown, in this browser: { tour, fishing, trading }. */
  guideSeenOf() { try { return JSON.parse(localStorage.getItem(`bloomshire.guide.${this.app.player?.id}`) ?? '{}') ?? {}; } catch { return {}; } }
  guideSeen(key) {
    const s = this.guideSeenOf(); s[key] = true;
    try { localStorage.setItem(`bloomshire.guide.${this.app.player?.id}`, JSON.stringify(s)); } catch { /* shown again next time */ }
  }

  /**
   * WHEN THE GUIDE COMES (testers, 2026-09-28), twice a second: the tour once the farmer has a name (a new one:
   * straight after Marlow asks it) and nothing else is open; the fishing tip the first time a rod is in hand; the
   * trading tip the first time another player stands near. Each once, in this browser.
   */
  guideTick() {
    const U = this.gameUi;
    if (!this.app.game || !U?.startGuide || U.windowOpen || U.guiding || !this.hero || document.querySelector('.play-name') || this.leaderboard?.isOpen || this.friends?.isOpen) return;
    if (this.app.player?.named === false) return;
    const seen = this.guideSeenOf();
    if (!seen.tour) { U.startGuide(TOUR, { key: 'tour' }); return; }
    if (!seen.fishing && this.hero.held()?.use === 'fish') { U.startGuide(TIPS.fishing, { tip: true, key: 'fishing' }); return; }
    // (the first time a book or a note is carried: how to read it -- 2026-09-29)
    if (!seen.reading && this.inv?.hotbar.slice(0, this.inv.size).some((q) => ITEMS[q?.id]?.readable)) { U.startGuide(TIPS.reading, { tip: true, key: 'reading' }); return; }
    if (!seen.trading && this.othersOn && this.live?.nearest?.(this.x, this.y, 48)) { U.startGuide(TIPS.trading, { tip: true, key: 'trading' }); }
  }

  /** The keys card's "Show the guide": the tour again, from the start. */
  showGuide() { this.ui?.toggleHelp(); this.gameUi?.startGuide(TOUR, { key: 'tour' }); }

  /* ------------------------------------------------------------ doors */

  /** The door zone (tagged to:<map>) the point stands in, if any. */
  doorAt(x, y) {
    // (a boat is not walked into: you stand at it and press E -- boatSpot, cross)
    return (this.app.doc?.zones ?? []).find((z) => doorTarget(z) && !(z.tags ?? []).includes('boat') && x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) ?? null;
  }

  /** A door within this map (zone tagged warp:<key>) the point stands in, if any. */
  warpAt(x, y) {
    return (this.app.doc?.zones ?? []).find((z) => (z.tags ?? []).some((t) => t.startsWith('warp:')) && x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) ?? null;
  }

  /** A DOOR WITHIN THE MAP (2026-10-20, the Dreaming Fields' lone doors, the brief: "step through it and you come out on
   *  the far side of the field"): a zone tagged warp:<key> takes one to the other zone with the same tag, out of it on
   *  the side one was going, the view with one at once, a moment of pale light. */
  warp(z) {
    const key = (z.tags ?? []).find((t) => t.startsWith('warp:'));
    const to = (this.app.doc?.zones ?? []).find((q) => q !== z && (q.tags ?? []).includes(key));
    if (!to) return;
    const cx = to.x + to.w / 2, up = this.facing !== 'down';
    const ways = up ? [[cx, to.y - 6, 'up'], [cx, to.y + to.h + 10, 'down']] : [[cx, to.y + to.h + 10, 'down'], [cx, to.y - 6, 'up']];
    const spot = ways.find(([x, y]) => !this.blocked(x, y) && !this.warpAt(x, y)) ?? [...this.freeNear(cx, to.y + to.h + 10), 'down'];
    [this.x, this.y, this.facing] = spot;
    if (this.hero) { this.hero.x = this.x; this.hero.y = this.y; this.hero.facing = this.facing; }
    this.arrivedAt = to; this.slide = null;
    this.cam = { x: Math.round(this.x - this.vw / 2), y: Math.round(this.y - this.vh / 2) }; this.clampCam();
    this.warpedAt = performance.now();
    this.sound?.cue('door');
  }

  drawWarp(g, vw, vh) {
    const t = this.warpedAt ? (performance.now() - this.warpedAt) / 700 : 1;
    if (t >= 1) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = `rgba(246, 242, 255, ${0.9 * (1 - t) ** 2})`; g.fillRect(0, 0, vw, vh);
    g.restore();
  }

  /** Stepping into a door takes you through it -- not the one you have just come in by, until you step off it. */
  checkDoor() {
    const w = this.warpAt(this.x, this.y);
    if (w) { if (w !== this.arrivedAt) this.warp(w); return; }
    const z = this.doorAt(this.x, this.y);
    if (!z) { this.arrivedAt = null; return; }
    if (z !== this.arrivedAt) this.travel(z);
  }

  async travel(z) {
    const app = this.app, from = app.doc.id, to = pickWay(z, from) ?? doorTarget(z);   // (the dungeon's ways: one making of the level, game/dungeon.js)
    if (!to || to === from) return;
    this.arrivedAt = z;
    if (!app.game && (app.isDirty() || app.live?.unsent)) { this.say('Save the map first -- then its doors take you through'); return; }
    // a door that is locked for players (rules.js lockedBecause): the designer, in the editor, is told and let in
    const shut = !app.game ? lockedBecause(z, this.localSave(), bestPickaxe(this.inv)) : null;
    // DOWN INTO THE DUNGEON WITH ONE WEAPON (2026-10-28: a run is the weapon chosen and nothing else -- commands.js travel,
    // game/dungeon.js chooseWeapon; there is no way back up but its end, or a fall)
    if (app.game && dungeonLevel(to) && !dungeonLevel(from) && !z.weapon) {
      if (chooseWeapon(this, (weapon) => { z.weapon = weapon; try { this.travel(z); } finally { delete z.weapon; } })) { this.keys.clear(); return; }
    }
    // (a region's edge: where along it you crossed, so you come out at the same place on the other side)
    const along = edgeOf(z) ? (z.h > z.w ? this.y - z.y : this.x - z.x) : null;
    const ok = this.act('travel', { to, ...(z.weapon ? { weapon: z.weapon } : {}) });
    if (!ok.ok) {
      // (a door's notes say why it is shut -- but the dungeon's are the editor's own, about its making: never shown)
      const t = ok.locked && z.notes && !(z.tags ?? []).includes('dungeon') ? `${z.notes}  ${ok.reason}` : ok.reason;
      if (ok.locked) this.sayWait(t, 'Locked');                         // (a door not open yet: the Notice, till OK)
      else this.say(t);
      if (ok.locked) this.dungeon?.guardBack?.();                       // (a guardian the rules never saw fall stands up again: game/dungeon.js)
      return;
    }
    // OVER A REGION'S EDGE, SMOOTHLY (2026-10-22, the designer: going from one region to another "stucks a bit, and then
    // continues ... needs to be as smooth as butter"; the last frame stood still while the next map was made): the view
    // goes down into the dark as the farmer walks on, the next map is opened and drawn unseen, and the view comes up out
    // of the dark with the farmer still walking (the keys held are kept)
    // (and THROUGH A DOOR, 2026-10-22, the designer: going in and out of a building "feels stuck" -- the keys were let go
    //  of and the farmer stood until pressed again, the last frame held: the same dip into the dark, shorter, and on they
    //  walk. A boat has splashed already, and rows: cross)
    const boat = (z.tags ?? []).includes('boat');
    // (a shaft's ladder: up into it before the dark -- hero.js climbDoor)
    if (ladderDoor(z) && this.hero) { this.keys.clear(); this.hero.climbDoor = { x: z.x + z.w / 2, dy: -34, s: 0.5 }; await sleep(380); }
    if (!boat) {
      if (along == null) this.sound?.cue('door');
      const ms = along != null ? EDGE_OUT_MS : DOOR_OUT_MS;
      this.edgeOut = { t0: performance.now(), z, ms }; await sleep(ms);
    }
    this.travelling = true;
    if (boat) this.keys.clear();
    try {
      // unsaved work waiting to be recovered there: open it the ordinary way, out of the game's view
      if (!app.game && await api.getRecovery(to).catch(() => null)) { this.travelling = false; this.edgeOut = null; this.stop(); await goTo(app, to, { from }); return; }
      await app.openMap(to);
      // its pictures in before it is shown -- the last frame holds meanwhile, the place's name up
      if (app.doc?.id === to) { if (along == null) this.say(`${gameName(app.doc)}...`); await this.artIn(app.doc); }   // (over an edge: its name comes as a card)
    } catch (e) {
      this.travelling = false; this.edgeOut = null;
      this.say(`This door leads to "${to}", which could not be opened`);
      app.toast(`Could not open "${to}": ${e.message}`, 'error');
      return;
    }
    if (app.doc?.id !== to) { this.travelling = false; this.edgeOut = null; if (!app.game) this.stop(); return; }
    this.build();
    // (up out of the dungeon from any level: at the top of its stair -- places.js doorBackTo, 2026-10-27, the Season 0 audit)
    const back = doorBackTo(app.doc, from, z);
    const spot = back ? (along != null && edgeOf(back) ? this.edgeArrival(back, along) : this.arrival(back)) : null;
    // (at the door back, out in front of a building or just inside a room's; the middle of the map only for a door with no
    //  way back -- 2026-10-22, the testers: the name card's line had come between the two and every door led to the middle)
    if (spot) { [this.x, this.y, this.facing] = spot; }
    else { [this.x, this.y] = this.freeNear(this.mapW / 2, this.mapH / 2); this.facing = 'down'; }
    // (by a shaft's ladder: down off it, from a little up its rungs, to where you stand -- hero.js climbDoor)
    if (back && ladderDoor(back) && this.hero) { this.x = back.x + back.w / 2; this.hero.climbDoor = { x: this.x, dy: 34, s: 0.55 }; this.y -= 19; }
    // (into another region over its edge: the view comes up out of the dark, and the region's name across it --
    //  2026-10-22, the designer: the split "still looks like one map")
    if (along != null && edgeOf(back)) this.placeCard(gameName(app.doc), true);
    this.landed(back, shut);
    if (this.bearPal) { this.bearPal.x = this.x - 14; this.bearPal.y = this.y; this.bearPal.stuck = 0; }   // (the bear beside you comes too)
    // (its first picture drawn while still dark -- the new ground's pieces made then, unseen -- and up from there)
    if (this.edgeOut) {
      // (the edge left behind holds the farmer no more: update keeps them at the edge they walk into, and that was the
      //  last map's -- 2026-10-22, the testers: over Stonepeak's edges they came out where the town's edge had been)
      this.edgeOut.z = null;
      if (this.on) { try { this.update(0); this.draw(); } catch { /* the next frame draws it */ } }
      this.edgeOut = null;
      if (this.arrivalCard?.fade) this.arrivalCard.t0 = performance.now();
      else this.doorIn = performance.now();                            // (through a door: up out of the dark, drawArrivalFade)
      this.last = performance.now();
    }
  }

  /**
   * THE ADMIN'S SHORTCUT (2026-09-27): straight to any place (the server lets an admin travel without a door: the
   * rules' player.unlimited), arriving by one of its doors.
   */
  async teleport(to) {
    const app = this.app;
    if (!to || this.travelling) return;
    if (to === app.doc.id) { this.say(gameName(app.doc)); return; }
    const ok = this.act('travel', { to });
    if (!ok.ok) { this.say(ok.reason ?? 'That place cannot be reached'); return; }
    this.sound?.cue('teleport');
    this.travelling = true; this.keys.clear();
    try { await app.openMap(to); if (app.doc?.id === to) await this.artIn(app.doc); }
    catch (e) { this.travelling = false; this.say(`"${to}" could not be opened`); return; }
    if (app.doc?.id !== to) { this.travelling = false; return; }
    this.build();
    const door = (app.doc.zones ?? []).find((z) => doorTarget(z) && !(z.tags ?? []).includes('boat')) ?? (app.doc.zones ?? []).find((z) => doorTarget(z));
    const spot = door ? this.arrival(door) : null;
    if (spot) [this.x, this.y, this.facing] = spot;
    else { [this.x, this.y] = this.freeNear(this.mapW / 2, this.mapH / 2); this.facing = 'down'; }
    this.landed(door, null);
  }

  /** Arrived on a new map at (this.x, this.y): the player, the camera, the interface and the sound follow. */
  landed(back, shut) {
    const app = this.app;
    // (down into the dungeon on a mount: off it at the stair -- a run is one weapon and nothing else, 2026-10-28)
    // (and the bear got down from before the stair, walking beside its farmer, waits up there too: 2026-10-28, the combat audit,
    //  it came down every stair after them -- moveTo's "the bear beside you comes too" -- and fought the whole run with them)
    if (dungeonLevel(app.doc?.id)) { if (MOUNT_NAMES[this.hero?.mode]) this.hero.mode = 'foot'; this.bearPal = null; }
    this.arrivedAt = back;
    this.boatAsked = this.boatSpot()?.z ?? null;           // landing by a ship does not ask you to sail straight back
    this.state = 'idle'; this.t = 0;
    this.gameUi?.attach({ hero: this.hero, inv: this.inv, energy: this.energy, health: this.health, map: this.mapInfo(), name: app.player?.name ?? null });
    // the player comes with you: on foot through a door (a horse stays outside), swimming only in water
    const h = this.hero;
    h.endPose();                                                     // (first: a pose ending puts you back where it began)
    h.env = this.heroEnv(); h.x = this.x; h.y = this.y; h.facing = this.facing;
    if (h.mode !== 'foot' && h.mode !== 'swim' && !edgeOf(back)) h.mode = 'foot';      // (over a region's edge you ride on)
    if (h.mode === 'swim' && !this.isWater(this.x, this.y)) h.mode = 'foot';
    this.fit(); this.cam = { x: this.x - this.vw / 2, y: this.y - this.vh / 2 };
    this.clampCam();
    this.last = performance.now();
    this.travelling = false;
    if (shut) this.say(`${gameName(app.doc)} -- locked for players (${shut}) You are the designer, so in you go.`, 7000);
    else if (!edgeOf(back)) this.placeCard(gameName(app.doc), false);
    this.sound?.arrived(app.doc);                // a shop says hello
    this.prefetchNext();
  }

  /** Where you stand coming in through `z`: just clear of it on its open side -- into the room above
   *  a room's exit (tagged "exit"), out on the street below a building's door. */
  arrival(z) {
    const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
    // a way off the side of the map (the forest's road from the town): you come in beside it, facing inwards
    const T = this.app.doc.tileSize, edge = z.x <= T / 2 ? [z.x + z.w + 10, cy, 'right'] : z.x + z.w >= this.mapW - T / 2 ? [z.x - 10, cy, 'left']
      : z.y <= T / 2 ? [cx, z.y + z.h + 12, 'down'] : z.y + z.h >= this.mapH - T / 2 ? [cx, z.y - 6, 'up'] : null;
    if (edge && !this.blocked(edge[0], edge[1]) && !this.doorAt(edge[0], edge[1])) return edge;
    const up = [cx, z.y - 4, 'up'], down = [cx, z.y + z.h + 10, 'down'];
    // (a boat is moored at a pier's end: you step off it back up the pier)
    const into = (z.tags ?? []).some((t) => t === 'exit' || t === 'boat');
    const sides = [...(into ? [up, down] : [down, up]), [z.x - 8, cy, 'left'], [z.x + z.w + 8, cy, 'right']];
    for (const [x, y, f] of sides) if (!this.blocked(x, y) && !this.doorAt(x, y)) return [x, y, f];
    const [x, y] = this.freeNear(cx, cy);
    return [x, y, 'down'];
  }

  /** OVER A REGION'S EDGE (2026-10-21, the designer: Whisperwood and Stonepeak their own maps again, "it just doesn't feel
   *  right" as one): its edge is a long door, a zone tagged edge:<side> along the line, and its twin on the other map has
   *  the same length. You come out `along` it as far as you went in, on its <side>, facing on; somewhere near if that
   *  spot is taken. */
  edgeArrival(z, along) {
    const side = edgeOf(z), upright = side === 'left' || side === 'right';
    const at = (d) => {
      const a = Math.max(2, Math.min((upright ? z.h : z.w) - 2, along + d));
      return upright ? [side === 'right' ? z.x + z.w + 8 : z.x - 8, z.y + a] : [z.x + a, side === 'down' ? z.y + z.h + 10 : z.y - 6];
    };
    for (let d = 0; d <= 160; d += 4) for (const s of d ? [d, -d] : [0]) {
      const [x, y] = at(s);
      if (!this.blocked(x, y) && !this.doorAt(x, y)) return [x, y, side];
    }
    return this.arrival(z);
  }

  /** The nearest spot round the farmer where they may stand (within three tiles): they step there. */
  unstick(h) {
    for (let r = 4; r <= 48; r += 4) for (let a = 0; a < 16; a++) {
      const x = Math.round(h.x + Math.cos((a / 8) * Math.PI) * r), y = Math.round(h.y + Math.sin((a / 8) * Math.PI) * r);
      if (h.canStand(x, y)) { h.x = x; h.y = y; return true; }
    }
    return false;
  }

  /** The rotate screen's button: the game full screen, and turned on its side where the browser can (Android's). */
  async goSideways() {
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* not in this browser */ }
    try { await screen.orientation?.lock?.('landscape'); } catch { /* an iPhone, or a browser that will not: the words under the button say what to do */ }
  }

  /** INTO A REGION OF THE JOINED WORLD (2026-10-21: commands.js enter): crossing into one is told to the server -- a quest's
   *  visit, the first time's Exploration -- and its name is shown, as a door's place is. Arriving on a map is not a
   *  crossing: the region you arrive in is told, unnamed. */
  checkRegion(h) {
    if (this.regionMap !== this.app.doc?.id) { this.regionMap = this.app.doc?.id; this.regionNow = undefined; }
    const r = regionAt(this.app.doc, h.x, h.y);
    if (!r || r === this.regionNow) return;
    const crossed = this.regionNow !== undefined, map = this.app.doc?.id;
    this.regionNow = r;
    // (walked over: told once the view has slid on -- the rules' work, up to 26 ms, out of the slide's frames: keepArea)
    if (crossed) setTimeout(() => { if (this.on && this.app.doc?.id === map) this.act('enter', { region: r }); }, SLIDE_S * 1000 + 60);
    else this.act('enter', { region: r });
    if (crossed && REGION_NAMES[r]) this.placeCard(REGION_NAMES[r]);
  }

  /** A line in the middle of the game's view for a moment: where you are, or why a door stays shut. */
  say(text, ms = 2200) {
    if (!this.banner) return;
    this.banner.textContent = this.touchUi ? touchText(text, langNow() === 'en') : text;      // (a finger's words: game/touch.js)
    // (2026-10-22, the designer: the line "is not in our game text at all": in the game's own letters on the interface's
    //  canvas when it has them, drawSay; the page's line stays for a Play without the interface)
    // (2026-10-27, the designer: not on a darkened plate at all -- in the interface's own box, the Notice under the Quest)
    if (this.gameUi?.showNotice?.(this.banner.textContent, { ms })) { this.sayLine = null; return; }
    if (this.gameUi?.stack?.fonts) { this.sayLine = { text: t(this.banner.textContent), t0: performance.now(), ms, high: !!this.hero?.fishGame }; return; }
    // (while a fish is on, at the top of the view: over the middle it hid the fishing bar on a phone -- 2026-10-07)
    this.banner.classList.toggle('high', !!this.hero?.fishGame);
    this.banner.classList.add('on');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => this.banner?.classList.remove('on'), ms);
  }

  /** SOMETHING NOT OPEN YET, OR NOT TO BE HAD (2026-10-27, the designer): said in the Notice under the Quest, which waits
   *  for OK or its close (game/ui.js showNotice); `tag` its ribbon. */
  sayWait(text, tag = null) {
    this.sound?.cue('deny');
    if (this.gameUi?.showNotice?.(this.touchUi ? touchText(text, langNow() === 'en') : text, { ok: true, tag })) return;
    this.say(text, Math.min(9000, 2600 + String(text).length * 45));
  }

  update(dt) {
    if (this.stopped) return;                                       // (stopped here: another device or window has the game, stoppedHere)
    // A DAY TO CELEBRATE (rules.js EVENTS: a birthday, 2026-10-30): fireworks outdoors (draw), and its line across the top
    // as the game starts and every 40 minutes after. (partyTest: set from the console, to see them on any day.)
    this.party = this.app.game ? eventOn(gameNow()) ?? (this.partyTest ? Object.entries(EVENTS)[0] : null) : null;
    if (this.party && performance.now() - (this.partyToldAt ?? -Infinity) > 40 * 60e3) { this.partyToldAt = performance.now(); this.ticker(t(this.party[1].ticker), { times: 3 }); }
    // the villager moves and acts (game/hero.js); Play keeps the position doors and the camera use
    const h = this.hero;
    // (refinement 6, the Night Court: the marsh light that leads, and the Night Stalker seen on the tower)
    if (this.marshGuide) this.marshGuide.update(dt, { x: this.x, y: this.y }, this.skyDraw?.on ? this.sky?.light?.dark ?? 0 : 0);
    if (this.stalkerAt && this.on) this.watchTower(dt);
    // a door or a test moved you from outside: tell the villager; otherwise the villager's own
    // moves (a dive in from the bank, getting out of bed) stand
    if (this.x !== this.syncX || this.y !== this.syncY) { h.x = this.x; h.y = this.y; }
    this.touchPad?.tick();                                            // (a thumb held on the joystick: its way, still pushed)
    h.update(dt, this.twelve?.playing ? NO_KEYS : this.scenes?.playing ? this.scenes.keys : this.keys);   // (in a moment the farmer is the scene's)
    this.twelve?.update(dt);
    this.scenes?.update(dt);
    if ((this.cueT = (this.cueT ?? 0) - dt) <= 0) { this.cueT = 0.5; this.scenesDue(); }   // (the editor's Play too: the designer watches them there)
    // on stepping stones: a hop between them, and at rest on one
    const lift = this.stoneHop(h, !h.moving && !h.pose, dt);
    this.hopLift += (lift - this.hopLift) * Math.min(1, dt * 18);
    h.hop = this.hopLift > 0.3 ? this.hopLift : 0;
    // FREED IF SHUT IN (2026-10-07, a player: dug up the Founders' chest and could not move -- the chest the story then
    // shows came down where they stood): where nothing may stand, not held by a pose nor hopping stones, the farmer
    // steps to the nearest free spot (looked at twice a second)
    if ((this.unstickT = (this.unstickT ?? 0) - dt) <= 0) { this.unstickT = 0.5; if (!h.pose?.stuck && !h.hop && !h.climbDoor && !this.travelling && !h.canStand(h.x, h.y)) this.unstick(h); }
    // (a quest's reward not claimed yet -- the server out of reach, say: asked for again every half a minute)
    if (this.app.game && (this.claimT = (this.claimT ?? 30) - dt) <= 0) { this.claimT = 30; if (readyOf(this.localSave()).length) this.claimQuests(); }
    // (going down into the dark over a region's edge: the farmer walks on at it, and no further -- travel)
    const eo = this.edgeOut?.z;
    if (eo) { h.x = Math.max(eo.x - 4, Math.min(eo.x + eo.w + 4, h.x)); h.y = Math.max(eo.y - 4, Math.min(eo.y + eo.h + 4, h.y)); }
    this.x = this.syncX = h.x; this.y = this.syncY = h.y; this.facing = h.facing;
    const moving = h.moving, going = this.travelling || !!eo;
    if (moving && !going && !h.climbDoor) this.checkDoor();          // (on a shaft's ladder, the door is being taken: hero.js climbDoor)
    if (!going) this.checkBoat();
    if (this.app.game && !going && (this.regionT = (this.regionT ?? 0) - dt) <= 0) { this.regionT = 0.5; this.checkRegion(h); }
    const state = h.shown()[0];
    if (state !== this.state) { this.state = state; this.t = 0; }
    this.t += dt;
    this.world.update(dt, h);
    this.fishLife?.update(dt, { x0: this.cam.x, y0: this.cam.y, x1: this.cam.x + this.vw, y1: this.cam.y + this.vh });
    this.embers?.update(dt, { x0: this.cam.x, y0: this.cam.y, x1: this.cam.x + this.vw, y1: this.cam.y + this.vh });
    this.abyss?.update(dt, { x0: this.cam.x, y0: this.cam.y, x1: this.cam.x + this.vw, y1: this.cam.y + this.vh });
    this.folk?.update(dt);
    this.farm.update(dt);
    if (this.combat) this.combat.allies = this.bearPal?.allies() ?? [];  // (the bear beside you: game/bearpal.js)
    // A MOMENT PLAYING (a scene, the twelve's, the theatre's: 2026-10-27, players were struck in the middle of one): the
    // creatures stand where they are, and nothing strikes the farmer (hurtHero) -- see also foesNear
    const moment = this.inMoment();
    if (!moment) this.combat.update(dt, h);
    if (this.app.game) this.respawnDue();                            // (the fallen back at their spots when their time comes: rules.js RESPAWN)
    this.heavy?.update(dt);                                         // (an exclusive weapon's heavy attack: game/heavy.js)
    this.colosseum?.update(dt);                                     // (the waves: game/colosseum.js)
    if (!moment) this.dungeon?.update(dt);                         // (the traps, the gate: game/dungeon.js)
    this.grotto?.update(dt);                                        // (the Mirror Pond's chest: game/grotto.js)
    this.bearPal?.update(dt);
    if (this.runaways?.length) { for (const r of this.runaways) r.update(dt); this.runaways = this.runaways.filter((r) => !r.done); }   // (a mount that threw its rider)
    // A MOUNT'S STAMINA (rules.js MOUNT_STAMINA, 2026-10-23): a holder's own mount tires, one every rideS seconds on the move
    if (this.app.game && !this.app.player?.admin && MOUNT_NAMES[h.mode]) {
      if (h.moving) this.rideS = (this.rideS ?? 0) + dt;
      // (EXPLORATION, 2026-10-26: a mount goes further on its stamina, SKILL_BONUS.exploration.ride a level -- rules.js)
      const every = MOUNT_STAMINA.rideS * (1 + (SKILL_BONUS.exploration?.ride ?? 0) * levelOf(this.localSave()?.skills?.exploration ?? 0));
      if (this.rideS >= every) { this.rideS -= every; this.act('mount.tire', { n: 1, kind: h.mode }); this.mountTired(); }   // (the one ridden: each its own)
    }
    // THE FARMER'S GENDER (game/genderpick.js, 2026-10-23): a farm that has not chosen is asked, before anything else --
    // over any window, as a new farm's guide is
    if (this.app.game && !this.genderAsked && (this.genderIn = (this.genderIn ?? 2) - dt) <= 0) {
      this.genderIn = 1;
      const s = this.localSave();
      if (s && !GENDERS.includes(s.gender) && !this.travelling && !this.townWin) { this.genderAsked = true; (this.genderWin ??= new GenderWindow(this)).open(); }
      else if (s) this.genderAsked = true;
    }
    // A HOLDER'S GIFTS (game/picks.js): asked when their Founding Farmers give a pick not made yet -- once nothing else is
    // open on the screen -- and asked again whenever it is not up and a pick is still due (2026-10-26, the designer: no
    // "later": they pick it then)
    if (this.app.game && !this.picksWin?.box && (this.picksIn = (this.picksIn ?? 4) - dt) <= 0) {
      this.picksIn = 2;
      if (picksDue(this.localSave()).length && !this.gameUi?.stack?.top && !this.overlay?.querySelector('.emp, .rw')) (this.picksWin ??= new PicksWindow(this)).open();
    }
    this.tickStatus(dt);                                                // (poison, burning: play.js afflict)
    // (the death bags on this map: asked of the server now and then -- loadBags)
    if (this.app.game && this.bagsMap !== this.app.doc.id) { this.bagsMap = this.app.doc.id; this.bags = []; this.chests = []; this.chestsOpened = []; this.bagsIn = 0; }   // (a map come to: its own bags, at once)
    if (this.app.game && (this.bagsIn = (this.bagsIn ?? 0) - dt) <= 0) { this.bagsIn = 20; this.loadBags(); }
    this.sound?.update(dt, this);
    // the other players (server/live2.js): where you are goes out, where they are glides in
    this.live?.update(dt, { map: this.app.doc.id, x: h.x, y: h.y, facing: h.facing, action: state, mode: h.mode });
    // your pet (game/pet.js): the save's, while your Founding Farmers give one; not in the water, nor on a broomstick, nor down
    // in the dungeon (a run is one weapon and nothing else: it waits up top, 2026-10-28)
    const own = this.localSave?.(), pk = own?.perks;
    this.pet?.set(own?.pet && (pk?.pet || pk?.petChoice || this.app.player?.admin) && h.mode !== 'swim' && h.mode !== 'broom' && !dungeonLevel(this.app.doc?.id) && petEnergyOf(own.pet) > 0 ? own.pet : null);
    // (A PET'S ENERGY, rules.js PET_ENERGY: out on an adventure it tires, one every wildS seconds; worn out, home it goes)
    if (this.pet?.pet && this.app.game && !this.app.player?.admin && petWild(this.app.doc)) {
      this.petS = (this.petS ?? 0) + dt;
      if (this.petS >= PET_ENERGY.wildS) {
        this.petS -= PET_ENERGY.wildS; this.act('pet.tire', { n: 1 });
        if (petEnergyOf(this.localSave()?.pet) <= 0) this.gameUi?.notify?.('Your pet is worn out and goes home: feed it a crop, a fish or meat (Ride & pets)');
      }
    }
    this.pet?.update(dt, { x: h.x, y: h.y, facing: h.facing }, (x, y) => this.solid(x, y));
    (this.pens ??= new Pens(this)).update(dt);                       // (your animals at Hollin's Farm: game/animals.js)
    // (out on an adventure, lingering in one place: it might find something -- the server's roll, game/pet.js PET_FIND)
    if (this.pet?.pet && this.app.game && petWild(this.app.doc)) {
      const a = this.petAnchor;
      if (!a || a.map !== this.app.doc.id || Math.hypot(h.x - a.x, h.y - a.y) > PET_FIND.area) this.petAnchor = { map: this.app.doc.id, x: h.x, y: h.y, t: 0 };
      else if ((a.t += dt) >= PET_FIND.linger) {
        a.t = 0;
        this.askStory('pet.sniff', {}).then((r) => {
          if (r?.found) { this.sound?.cue('pickup', { gain: 0.5 }); this.say('Your pet found something: E beside it to take it'); }
          else if (r?.hungry && this.petAsked !== realDay(gameNow())) { this.petAsked = realDay(gameNow()); this.say('Your pet wants its treat before it goes looking: E beside it gives it one of your crops', 4200); }
        });
      }
    }
    this.keepArea(dt);                                                  // (the town and its neighbours, each a place of its own)
    // the sky (game/weather.js): the same hour and the same shower for everyone; the rain heard outdoors
    this.sky = skyFor(this.app.doc, gameNow());                        // (the VIP Quarter: its own hour -- weather.js fixedSky)
    // (a moment's own hour over its map: the twelve's night, and the morning after it; a scene played from the cutscenes'
    //  panel at its own hour -- this player's sky alone, the valley's clock goes on)
    const held = this.twelve?.skyClock ?? (this.skyHold?.map === this.app.doc?.id ? this.skyHold.clock : null);
    if (held != null) this.sky = { ...this.sky, clock: held, phase: phaseOf(held), light: lightAt(held), rain: 0, snow: 0 };
    // A REST OVER (2026-10-01): in bed till the bed has given what it gives (hero.press), then up by yourself
    if (this.hero?.resting) { if (this.energy?.recovering(gameNow())) this.restOn = true; else if (this.restOn) { this.restOn = false; this.hero.getUp(); } }
    else this.restOn = false;
    // BY NIGHT AND IN THE RAIN NOBODY IS OUT (weather.js keptIn): as it turns, the townsfolk walk in (or come out again)
    // -- not while you are talking to one of them, though: when the window shuts (folkStale)
    // (THE TOWNSFOLK OUT IN ALL WEATHERS, the admin's desk -- 2026-10-11, the designer: for the 24 hours open to all)
    const inNow = this.outdoors && !this.folkOut && !this.timeless && !fixedSky(this.app.doc) ? keptIn(gameNow()) : null;
    if (inNow !== this.keptIn) {
      const turned = !inNow !== !this.keptIn;
      this.keptIn = inNow;
      if (turned) { this.qTarget = null; if (this.gameUi?.windowOpen) this.folkStale = 'weather'; else this.folk?.refresh(false, 'weather'); }
    }
    // THE CHILDREN WHO CANNOT WALK -- at play with a rope or a ball, on the swing, eating an ice cream -- go home, and
    // come back, only while none of them is on screen (2026-10-04, the designer: nobody should just vanish); the
    // wandering ones walk off by the road (game/ambient.js)
    const kidsAway = this.outdoors && this.kidsAway();
    if (this.kidsHidden == null) this.kidsHidden = kidsAway;
    else if (kidsAway !== this.kidsHidden && !this.stillKidsSeen()) this.kidsHidden = kidsAway;
    const rainHeard = this.skyDraw?.on ? this.sky.rain : 0;
    if (Math.abs(rainHeard - (this.rainHeard ?? 0)) > 0.02 || (rainHeard === 0 && this.rainHeard)) { this.rainHeard = rainHeard; this.sound?.audio?.setRain?.(this.sound?.has?.('rainHeavy') ? 0 : rainHeard * 0.8); }
    if ((this.hudT = (this.hudT ?? 0) - dt) <= 0) { this.ui?.refresh(); this.hudT = 0.2; }
    // the camera eases after you, then snaps to whole pixels (src/core/Renderer.js follow())
    const k = Math.min(1, dt * 9);
    const f = this.twelve?.focus ?? this.scenes?.focus ?? this.grotto?.focus;   // (a moment looks where it plays)
    const s = this.slide;                                               // (over a border: the new area's view, eased as ever, ...
    if (s) this.cam = s.cam;
    this.cam.x += ((f ? f.x : this.x) - this.vw / 2 - this.cam.x) * k;
    this.cam.y += ((f ? f.y : this.y - (this.lookUp ?? 0)) - this.vh / 2 - this.cam.y) * k;
    this.clampCam();
    if (s) { s.cam = this.cam; const e = s.t * s.t * (3 - 2 * s.t); this.cam = { x: s.from.x + (s.cam.x - s.from.x) * e, y: s.from.y + (s.cam.y - s.from.y) * e }; }   // ... slid to: keepArea)
  }

  draw() {
    this.tiles?.newFrame?.();                                           // (the moving water's pieces: a few made a picture, game/tiles.js)
    this.turnCheck();                                                   // (a phone upright where the page cannot turn)
    this.fit();                                                         // the window may have changed shape
    const app = this.app, doc = app.doc, g = this.ctx, vw = this.vw, vh = this.vh;
    const shake = this.shakeNow(), cx = Math.round(this.cam.x) + shake.x, cy = Math.round(this.cam.y) + shake.y;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    g.fillStyle = '#000';
    g.fillRect(0, 0, vw, vh);
    g.setTransform(1, 0, 0, 1, -cx, -cy);
    g.fillStyle = doc.background || '#5a8f3c';
    g.fillRect(0, 0, this.mapW, this.mapH);
    const rect = { x0: cx - 32, y0: cy - 32, x1: cx + vw + 32, y1: cy + vh + 32 };
    // THE FOUNDERS' SPARKLE (2026-10-23, game/founderfx.js): a Mythic's footsteps and sparkle, a Legendary's motes; by day
    // among the farmer's layer, by night (or in a cave) light after the dark, with each aura's glow
    const auraFolk = this.auraFolk(rect), fxDark = this.founderDark();
    (this.founderFx ??= new FounderFx()).step(this.frameDt ?? 0.016, auraFolk);
    // (and the Emporium's: an outfit's or a mount's sparkle and prints, as the studios draw them -- game/goodsfx.js)
    (this.goodsFx ??= new GoodsFx()).step(this.frameDt ?? 0.016, this.goodsFolk(rect));
    // you walk among the things that stand: the depth-sorted layer, else the one called Objects -- never
    // the flat ones (a room's Floor would draw every desk over you)
    const objLayers = doc.layers.filter((l) => l.type === 'objects' && l.visible);
    const heroLayer = objLayers.find((l) => l.ysort) ?? objLayers.find((l) => /^objects$/i.test(l.name ?? ''))
      ?? objLayers.find((l) => !FLAT_LAYER.test(l.name ?? '')) ?? objLayers[0];
    const lastTiles = doc.layers.filter((l) => l.type === 'tiles' && l.visible).at(-1);
    for (const layer of doc.layers) {
      if (!layer.visible) continue;
      g.globalAlpha = layer.opacity ?? 1;
      if (layer.type === 'tiles') {
        if (layer === this.fishUnder) { g.globalAlpha = 1; this.fishLife.drawUnder(g, rect); this.scenes?.drawWater(g); g.globalAlpha = layer.opacity ?? 1; }   // (the fish, under the shores; a scene's, under the jetties too)
        this.drawTiles(g, layer, rect);
        if (layer === lastTiles) { g.globalAlpha = 1; this.grey?.drawGround(g); }          // (the story's grey ground: under everyone's feet)
        if (layer === lastTiles) { g.globalAlpha = 1; this.farm.drawSoil(g, rect); this.fishLife?.drawAir(g, rect); this.world.drawGround?.(g, rect); }     // your turned soil, on the ground; a fish leaping; footprints in the snow
        if (layer === lastTiles) this.combat.drawGround?.(g);                           // the grave-roots' marks (combat.js)
        if (layer === lastTiles && !this.fishUnder) this.scenes?.drawWater(g);          // (a scene's fish and rings: a map without fish of its own)
        continue;
      }
      const heroHere = layer === heroLayer;
      const seen = (o) => { const b = o.rot ? bounds(o) : o; return !(b.x > rect.x1 || b.y > rect.y1 || b.x + b.w < rect.x0 || b.y + b.h < rect.y0); };
      const kidsHidden = !!this.kidsHidden;
      let order = this.orders.get(layer);                              // (sorted once: nothing moves on a layer in play)
      if (!order) { order = drawOrder(layer); this.orders.set(layer, order); }
      // A BIG MAP (2026-10-13, the joined world): a depth-sorted layer is in order of its things' feet, so only the
      // band of that order whose feet lie between the view's top and its bottom plus the layer's tallest thing can be
      // seen; the rest is never looked at. The floors (bridges, piers) are picked out once, not tested every frame.
      let span = this.spans.get(layer);
      if (!span) {
        const foot = new Float64Array(order.length); let tall = 0;
        order.forEach((o, i) => { const b = o.rot ? bounds(o) : o; foot[i] = o.y + o.h; tall = Math.max(tall, b.h, (o.y + o.h) - b.y); });
        span = { foot, tall: tall + 32, floors: order.filter((o) => isFloor(o)), sorted: !!layer.ysort };
        this.spans.set(layer, span);
      }
      const firstAt = (y) => { let a = 0, z = span.foot.length; while (a < z) { const m = (a + z) >> 1; if (span.foot[m] < y) a = m + 1; else z = m; } return a; };
      // (a turned thing's box can reach a little below its feet: some slack above the view)
      const lo = span.sorted ? firstAt(rect.y0 - 48) : 0, hi = span.sorted ? firstAt(rect.y1 + span.tall) : order.length;
      // who moves among this layer's things, by where their feet are: you, your crops, enemies,
      // and on a depth-sorted layer the creatures and children too
      // (the townsfolk too; in a room -- a layer in the designer's order -- they stand among its furniture
      // once it is laid, behind their counters, and you over them as over the furniture)
      const folk = heroHere ? (this.folk?.movers(rect) ?? []) : [];
      const movers = [...(heroHere ? [{ y: this.y, x: this.x, draw: (q) => this.drawHero(q), hero: true }, ...(fxDark < 0.5 ? this.founderFx.movers() : []), ...this.goodsFx.movers(), ...(this.bearPal?.movers(rect) ?? []), ...(this.runaways?.flatMap((r) => r.movers()) ?? []), ...this.farm.movers(rect), ...this.gardenMovers(rect), ...(this.pens?.movers(rect) ?? []), ...this.combat.movers(rect), ...(this.twelve?.movers(rect) ?? []), ...(this.scenes?.movers(rect, FOES) ?? []), ...(this.grotto?.movers() ?? []), ...((this.othersOn ? this.live?.movers(rect) : null) ?? []),
        ...this.placedHere().filter((c) => c.x > rect.x0 - 16 && c.x < rect.x1 + 16 && c.y > rect.y0 && c.y < rect.y1 + 20).map((c) => ({ y: c.y, draw: (q) => this.drawPlaced(q, c) }))] : []),
        ...(layer.ysort ? [...folk, ...this.world.movers(layer).filter((m) => m.y > rect.y0 - 8 && m.y < rect.y1 + 40)] : [])].sort((a, b) => a.y - b.y);
      let mi = 0, oiNow = lo;
      const putThing = (o) => {
        if ((o.tags || this.wilds.has(o)) && this.storyHides(o)) return;           // (the story's things: quests.js objectShown; a picked mushroom)
        if (kidsHidden && isKid(o)) return;                                         // (the schoolchildren, home for the night)
        const fade = this.twelve?.alphaOf(o) ?? null;                               // (a pale shape whose founder stands there now)
        if (fade === 0) return;
        if (fade != null) g.globalAlpha = (layer.opacity ?? 1) * fade;
        const sh = this.trembles?.size ? this.shakeOf(o) : null;                    // (a stone waking: it trembles)
        if (sh) g.translate(sh[0], sh[1]);
        // a felled tree's stump, a broken rock; else the thing itself
        const draw = (q) => { if (!this.nodes.draw(q, o, (p) => app.assets.image(p)) && !this.world.drawObject(q, o)) this.drawObject(q, o); };
        if (!this.grey?.drawThing(g, o, draw)) draw(g);                             // (the story's grey trees, drawn grey: game/grey.js)
        if (sh) g.translate(-sh[0], -sh[1]);
        if (fade != null) g.globalAlpha = layer.opacity ?? 1;
      };
      // GROUND THINGS UNDER YOUR FEET (2026-10-20, the designer: "the player should walk over it, not under it"): a tuft,
      // a flower, a stone in the grass (buildSolids flatThings) is drawn among the things by its depth, as ever, but one
      // that someone walking is over is drawn just before them, so it lies under their feet
      const early = heroHere && layer.ysort && this.flatThings?.size ? new Set() : null;
      const drawMover = (m) => {
        const mx = m.x ?? m.p?.x;
        if (early && mx !== undefined) for (let j = oiNow; j < hi && span.foot[j] <= m.y + 40; j++) {
          const o = order[j];
          if (!this.flatThings.has(o) || early.has(o) || !seen(o)) continue;
          const b = o.rot ? bounds(o) : o;
          if (b.x < mx + 12 && b.x + b.w > mx - 12 && b.y < m.y + 4 && b.y + b.h > m.y - 34) { early.add(o); putThing(o); }
        }
        g.globalAlpha = 1; m.draw(g); g.globalAlpha = layer.opacity ?? 1;
      };
      // a bridge or a pier is ground you walk ON: it goes under you, whatever its depth
      if (heroHere) for (const o of span.floors) if (seen(o)) this.drawObject(g, o);
      for (let oi = lo; oi < hi; oi++) {
        const o = order[oi];
        oiNow = oi;
        if (!seen(o) || (heroHere && isFloor(o))) continue;
        const b = o.rot ? bounds(o) : o;
        // depth: a mover goes in front of everything whose base is above its feet
        if (layer.ysort) while (mi < movers.length && b.y + b.h > movers[mi].y) drawMover(movers[mi++]);
        if (early?.has(o)) continue;                                                 // (drawn already, under someone's feet)
        putThing(o);
      }
      if (!layer.ysort && folk.length) {
        let things = this.standing.get(layer);
        if (!things) { things = order.filter((o) => !isFloor(o)); this.standing.set(layer, things); }
        const put = (q, o) => { if (!this.world.drawObject(q, o)) this.drawObject(q, o); };
        g.globalAlpha = 1;
        for (const m of folk.sort((a, b) => a.y - b.y)) this.folk.drawAmong(g, m.p, things, put);
        g.globalAlpha = layer.opacity ?? 1;
      }
      while (mi < movers.length) drawMover(movers[mi++]);
      if (this.embers) { g.globalAlpha = 1; this.embers.drawFlow(g, rect, layer); }     // the lava, moving, on the ground it lies on (game/embers.js)
    }
    if (!heroLayer) this.drawHero(g);
    this.grey?.drawFlecks(g);                                           // (the grey trees' leaves, crumbling off)
    // THE FARMER SEEN THROUGH (2026-10-20, the Barrowmire: a ghoul standing in front of the farmer hid them whole): when
    // a creature in a fight is drawn over you, you are drawn again faintly on top, so you always see where you stand
    // (by its size, 2026-10-28, the launch eve creature audit: a boss drawn larger than its kind -- the Great Frost Golem,
    //  1.8 times a golem -- hid the farmer nine tenths and more standing 28 to 40 px off its middle, or 44 to 58 px behind
    //  it, past what a creature of the usual size covers; the reach grows with its art's scale, never shrinks)
    if (this.combat.enemies.some((e) => { const k = Math.max(1, e.def?.art?.scale ?? 1); return !e.dead && !e.buried && Math.abs(e.x - this.x) < 28 * k && e.y > this.y && e.y - this.y < 44 * k; })) { g.save(); g.globalAlpha = 0.45; this.drawHero(g); g.restore(); }
    // over everything: birds on the wing, flocks, chimney smoke, arrows and bolts in flight
    g.globalAlpha = 1;
    this.glade?.drawVeil(g, rect, this.sky);                           // a glade's twilight, whatever the hour
    this.world.drawSky(g, rect);
    this.combat.drawAir(g);
    this.drawTarget(g);
    this.drawPlaceGhost(g);                                              // (a chest in hand: where it would go)
    this.drawWake(g);                                                   // the Moonstone Circle's woken stones
    this.embers?.drawAir(g, rect);                                      // the Ashlands' air: ash falling, smoke from the vents and the pit
    this.drawOutside(g);                                                 // (the places beyond: not this map's to show)
    if (this.skyDraw) this.skyDraw.auras = this.auraLights(rect);       // (the auras in view, lit by night: game/sky.js)
    this.skyDraw?.draw(g, rect, this.sky, this.frameDt ?? 0.016, { x: this.x, y: this.y });       // the hour's light, the lamps, the rain (outdoors)
    if (this.skyDraw?.on) this.world.drawNight?.(g, rect, this.sky);    // the northern lights over Frosthaven by night (game/frostfx.js)
    if (this.party && this.skyDraw?.on) (this.fireworks ??= new Fireworks()).draw(g, rect, this.frameDt ?? 0.016, this.sky?.light?.dark ?? 0);   // a day to celebrate's fireworks
    this.marshGuide?.draw(g, rect, this.skyDraw?.on ? this.sky?.light?.dark ?? 0 : 0);   // the Night Court's leading light (game/marshguide.js)
    this.embers?.draw(g, rect, { x: this.x, y: this.y });               // the fire under the ash: its glow and its sparks, bright by night too
    this.glade?.drawLights(g, rect, this.skyDraw?.on ? this.sky : null, this.frameDt ?? 0.016);   // ...and its moonlight, fireflies and moths
    this.light?.draw(g, rect, performance.now() / 1000, { x: this.x, y: this.y, lamps: [this.pet?.lamp()] }, (o) => this.nodes?.down(o) || (!!o.tags && this.storyHides(o)), this.skyDraw?.on ? this.sky?.light?.dark ?? 0 : 0);
    if (this.light?.on) this.combat.drawEyes(g, { x: this.x, y: this.y }, performance.now() / 1000);   // a spider out in the dark: its eyes
    this.abyss?.draw(g, rect, { x: this.x, y: this.y });               // the chasm's mist, and the eyes in it
    this.twelve?.drawAir(g, rect);                                      // the twelve's colours on the pavement's ring, and their moment
    this.magic?.draw(g, rect, this.frameDt ?? 0.016);                   // the quests' magic: over the night and a cave's dark, glowing
    this.grotto?.drawGlow(g);                                           // the Mirror Pond's chest: its light in the cave's dark
    this.heavy?.draw(g, rect);                                          // an exclusive weapon's heavy attack, glowing (game/heavy.js)
    this.drawHeavyAim(g);                                               // ...where it is aimed, and its wait by the farmer
    this.drawStatus(g);                                                 // poisoned, burning: round the farmer
    if (fxDark > 0) this.founderFx.night(g, rect, auraFolk, fxDark, fxDark >= 0.5);   // the founders' light in the dark (game/founderfx.js)
    this.drawMountBar(g);                                               // a holder's mount's stamina, small, over it
    this.drawDashBar(g);                                                // ...in the dungeon, the dash's two charges
    this.drawPetBar(g);                                                 // ...and their pet's energy, while short
    this.drawHurt(g, vw, vh);                                           // a blow taken: the view's edges red a moment
    this.drawWarp(g, vw, vh);                                           // (a lone door gone through: a moment of pale light)
    this.twelve?.drawScreen(g, vw, vh);                                 // (the twelve's moment: its bars, its white light)
    this.scenes?.drawScreen(g, vw, vh);                                 // (a scene's bars)
    this.drawArrivalFade(g, vw, vh);                                    // (into a region over its edge: up out of the dark)
    // ONTO THE SCREEN: the world's picture, pixel for pixel; the browser enlarges it s times
    // (its page size changes only when the window does)
    const scr = this.screen, dpr = window.devicePixelRatio || 1, s = this.px;
    if (scr.width !== vw || scr.height !== vh) { scr.width = vw; scr.height = vh; }
    this.screenCtx.drawImage(this.buffer, 0, 0);
    // the game's interface over it, drawn FINER than the world (game/ui.js uiScale): its own canvas at its own
    // whole-number scale u -- the view (vw x vh) x s / u of its pixels -- laid over the world, enlarged u times
    const uc = this.uiCanvas, u = this.gameUi ? this.gameUi.scaleFor(s, dpr) : Math.min(s, 3);
    const uw = Math.floor((vw * s) / u), uh = Math.floor((vh * s) / u);
    const css = `${vw * s}x${vh * s}x${u}x${dpr}`;
    if (css !== this.cssSize) {
      this.cssSize = css;
      scr.style.width = `${(vw * s) / dpr}px`; scr.style.height = `${(vh * s) / dpr}px`;
      uc.width = uw; uc.height = uh;
      uc.style.width = `${(uw * u) / dpr}px`; uc.style.height = `${(uh * u) / dpr}px`;
    }
    const ug = uc.getContext('2d');
    ug.setTransform(1, 0, 0, 1, 0, 0); ug.clearRect(0, 0, uw, uh); ug.imageSmoothingEnabled = false;
    const cinema = !!this.twelve?.playing || !!this.scenes?.playing;    // (a moment has the whole screen: no interface)
    if (!cinema) this.drawNames(ug, cx, cy, s / u);                     // everyone's name over their head, under the windows
    if (!cinema) this.drawBossNames(ug, cx, cy, s / u);                // (a boss's name over its great bar)
    else this.bossPlates = null;
    if (!cinema) this.drawCombatWords(ug, cx, cy, s / u);              // (a boss's Immune or Weak over its head: rules.js BOSS_WEAPONS)
    this.drawCropTag(ug, cx, cy, s / u);                                // what grows under the mouse, and when it is ripe
    if (!cinema) this.drawPotTimers(ug, cx, cy, s / u);                 // your pot on the fire: a bar over the stove, emptying
    if (this.gameUi) this.gameUi.anchor = { x: (this.x - cx) * (s / u), y: (this.y - cy) * (s / u), k: s / u, w: uw, h: uh };   // (the fishing bar stands by the farmer)
    if (!cinema) this.drawTicker(ug, uw);                               // the line across the top: an update coming, news
    if (this.gameUi && !cinema) this.gameUi.draw(ug, uw, uh);
    if (!cinema) this.drawArrivalCard(ug, uw, uh);                      // (a place's name across the view)
    if (!cinema) this.drawSay(ug, uw, uh);                              // (and a line said: where you are, why a door stays shut)
    this.scenes?.drawUi(ug, cx, cy, s / u, this.gameUi?.stack?.fonts, t);   // (the lines said in a scene, in bubbles over heads)
    this.scenes?.drawEmotes(ug, cx, cy, s / u, cinema ? null : this.namePlates);   // the emotes over heads, over their name plates (game/scenes.js)
    this.namePlates = null;
    this.drawShards(ug);                                                // lucky Shards, over the interface, into the purse
    this.uiScale = u; this.uiW = (vw * s) / u; this.uiH = (vh * s) / u;          // the pointer's span, in the interface's pixels
    // (and where the chat button stands, which the Shop and the Wallet lifted: its lines begin above it -- ui.js chatTop)
    const chatTop = this.gameUi?.chatTop?.() ?? null, chatAt = `${css}|${chatTop}`;
    if (this.chat && chatAt !== this.chatPlaced) { this.chatPlaced = chatAt; this.chat.place(localRect(scr.getBoundingClientRect()), u / dpr, chatTop); }
    // the pack's hand, over everything, at about the game's pixel size (a grab for a moment after a click) -- and the
    // same hand for the pointer over the game's own windows (the chat, the Emporium, the admin's desk), which lie over
    // this canvas where it cannot be drawn (2026-09-27, the designer: over the chat "the cursor changes from the game
    // cursor, a pixelated hand, to the system cursor, a white arrow")
    const hand = app.assets.image(HAND.image), m = this.mouse, k = Math.max(1, Math.round(Math.min(s, 3) / u));
    if (hand.state === 'ok') this.handCursor(hand.img, Math.max(1, Math.round((k * u) / dpr)));
    if (m?.on && !m.window && hand.state === 'ok') {
      const [hx, hy, hw, hh] = m.down && performance.now() - m.down < 180 ? HAND.grab : HAND.point;
      ug.drawImage(hand.img, hx, hy, hw, hh, Math.round(m.ux - 2 * k), Math.round(m.uy - k), hw * k, hh * k);
    }
    if (!this.where.hidden) {
      const T = doc.tileSize, w = `tile ${Math.floor(this.x / T)}, ${Math.floor(this.y / T)}  ·  ×${s}`;
      if (w !== this.whereText) { this.whereText = w; this.where.textContent = w; }
    }
  }

  /** INTO A REGION OVER ITS EDGE (play.js travel, edgeOf): the view goes down into the dark as you step over, and comes
   *  up out of it in half a second on the other side. */
  drawArrivalFade(g, vw, vh) {
    const now = performance.now();
    const a = Math.max(this.edgeOut ? Math.min(1, (now - this.edgeOut.t0) / (this.edgeOut.ms ?? EDGE_OUT_MS)) : 0, this.arrivalCard?.fade ? 1 - (now - this.arrivalCard.t0) / 650 : 0,
      this.doorIn ? 1 - (now - this.doorIn) / DOOR_IN_MS : 0);
    if (a <= 0) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = `rgba(8, 8, 12, ${a.toFixed(3)})`; g.fillRect(0, 0, vw, vh);
    g.restore();
  }
  /** A PLACE'S NAME (2026-10-22, the designer: "the text need to be a bit golden ... with a proper background and with a
   *  proper curved background, like highlighted background ... it doesn't need to be fully transparent"): gold letters in
   *  the game's own font on a rounded, half seen-through plate across the top of the view. `fade`: over a region's edge,
   *  where the view also comes up out of the dark (drawArrivalFade). */
  placeCard(name, fade = false) {
    if (!name) return;
    if (!this.gameUi?.stack?.fonts) { this.say(name); return; }
    this.arrivalCard = { t0: performance.now(), name: t(name), fade };
    this.sound?.cue?.('placeName');
    this.sayLine = null;
  }

  /** The plate both are drawn on: a rounded box, its fill and a fine edge (in the interface's pixels). */
  #plate(g, x, y, w, h, r, fill, edge) {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
    g.fillStyle = fill; g.fill();
    if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.beginPath(); if (g.roundRect) g.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, Math.max(0, r - 1.5)); else g.rect(x + 1.5, y + 1.5, w - 3, h - 3); g.stroke(); }
  }

  /** The place's card: in over half a second, rising a little, held, out over the last; four seconds in all. */
  drawArrivalCard(g, w, h) {
    const c = this.arrivalCard, fonts = this.gameUi?.stack?.fonts;
    if (!c || !fonts) return;
    const t = (performance.now() - c.t0) / 1000, LONG = 4.2;
    if (t > LONG) { this.arrivalCard = null; return; }
    const a = Math.max(0, Math.min(1, t / 0.5, (LONG - t) / 0.9));
    if (a <= 0) return;
    const S = 2, tw = fonts.width(c.name, 'bold') * S, gh = fonts.glyphH.bold * S;
    const pw = tw + 64, ph = gh + 22, x = Math.round((w - pw) / 2), y = Math.round(h * 0.17 + 5 * (1 - Math.min(1, t / 0.5)));
    g.save();
    g.globalAlpha = a;
    // a soft dark halo, the plate (dark, half seen-through), a gold edge round it
    this.#plate(g, x - 3, y - 3, pw + 6, ph + 6, (ph + 6) / 2, 'rgba(0, 0, 0, 0.16)', null);
    this.#plate(g, x, y, pw, ph, ph / 2, 'rgba(28, 16, 6, 0.6)', 'rgba(232, 182, 74, 0.55)');
    // a small gold diamond at each end
    g.fillStyle = '#f2c55c';
    for (const dx of [x + 15, x + pw - 15]) { const cy = y + ph / 2; g.beginPath(); g.moveTo(dx, cy - 4); g.lineTo(dx + 4, cy); g.lineTo(dx, cy + 4); g.lineTo(dx - 4, cy); g.closePath(); g.fill(); }
    fonts.draw(g, c.name, Math.round((w - tw) / 2), y + Math.round((ph - gh) / 2) - 1,
      { font: 'bold', scale: S, color: '#e9a83a', gradient: '#ffe292', gradientRow: 4, outline: '#3b2207', outline8: true, shadow: '#120801', shadowY: 1 });
    g.restore();
  }

  /** A line said (say): the game's own letters, wrapped, on a smaller dark plate under the place's card. */
  drawSay(g, w, h) {
    const L = this.sayLine, fonts = this.gameUi?.stack?.fonts;
    if (!L || !fonts) return;
    const t = performance.now() - L.t0;
    if (t > L.ms + 350) { this.sayLine = null; return; }
    const a = Math.max(0, Math.min(1, t / 220, (L.ms + 350 - t) / 350));
    if (a <= 0) return;
    const maxW = Math.min(Math.round(w * 0.72), 320), lines = fonts.wrap(L.text, maxW, 'regular');
    const lh = (fonts.lineH.regular ?? fonts.glyphH.regular + 3) + 1, tw = Math.max(...lines.map((s) => fonts.width(s, 'regular')));
    const pw = tw + 22, ph = lines.length * lh + 11, x = Math.round((w - pw) / 2);
    const y = L.high ? 6 : Math.round(h * 0.17 + (this.arrivalCard ? fonts.glyphH.bold * 2 + 34 : 0));
    g.save();
    g.globalAlpha = a;
    this.#plate(g, x, y, pw, ph, 7, 'rgba(20, 13, 6, 0.66)', 'rgba(255, 236, 200, 0.16)');
    lines.forEach((s, i) => fonts.draw(g, s, Math.round((w - fonts.width(s, 'regular')) / 2), y + 6 + i * lh, { color: '#fff3dc', shadow: '#000000', shadowY: 1 }));
    g.restore();
  }

  /** The pack's hand as the page's own pointer, K screen pixels to one of its pixels (made again only when K changes):
   *  the overlay's --play-hand, which every window over the canvas wears (styles.css). */
  handCursor(img, K) {
    if (this.handK === K) return;
    this.handK = K;
    const [hx, hy, hw, hh] = HAND.point, c = document.createElement('canvas');
    c.width = hw * K; c.height = hh * K;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, hx, hy, hw, hh, 0, 0, hw * K, hh * K);
    this.overlay.style.setProperty('--play-hand', `url(${c.toDataURL()}) ${2 * K} ${K}, auto`);
  }

  /** The square a farm tool would work on: the live game's small maroon corner ticks (src/Game.js
   *  drawTargetTile), on that one square -- full strength when the tool works there, faint when not. */
  drawTarget(g) {
    const p = this.hero?.preview();
    if (p?.target == null) return;
    const T = this.app.doc.tileSize, W = this.app.doc.width;
    const x = (p.target % W) * T, y = Math.floor(p.target / W) * T;
    g.fillStyle = '#aa143c';
    g.globalAlpha = p.ok === false ? 0.4 : 0.9;
    for (const [cx, cy, dx, dy] of [[0, 0, 1, 1], [15, 0, -1, 1], [0, 15, 1, -1], [15, 15, -1, -1]]) {
      g.fillRect(x + cx, y + cy, 1, 1); g.fillRect(x + cx + dx, y + cy, 1, 1); g.fillRect(x + cx, y + cy + dy, 1, 1);
    }
    g.globalAlpha = 1;
  }

  /** A tile layer: its still tiles from the editor's chunk cache, its water moving (game/tiles.js). */
  drawTiles(g, layer, rect) { this.tiles.draw(g, layer, rect, this.world.t); }

  drawObject(g, o) {
    const rec = this.app.assets.image(o.asset);
    if (rec.state !== 'ok') return;
    if (!o.rot && !o.flipX && !o.flipY) { g.drawImage(rec.img, o.sx, o.sy, o.sw, o.sh, o.x, o.y, o.w, o.h); return; }
    g.save();
    g.translate(o.x + o.w / 2, o.y + o.h / 2);
    if (o.rot) g.rotate((o.rot * Math.PI) / 180);
    if (o.flipX || o.flipY) g.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
    g.drawImage(rec.img, o.sx, o.sy, o.sw, o.sh, -o.w / 2, -o.h / 2, o.w, o.h);
    g.restore();
  }

  /** May this farmer ride this mount now? null, or why not (2026-10-23, rules.js PICKS and MOUNT_STAMINA): their one mount,
   *  picked once at sign-in, with stamina left. An admin, and the editor's Play, ride any. */
  mountWhyNot(kind) {
    // (THROWN, 2026-10-28: a mount that threw its rider has run off, and comes back in a while -- rules.js MOUNT_BOLT)
    const back = (this.localSave()?.mountBack ?? 0) - gameNow();
    if (back > 0 && kind !== 'bear') return `Your ${MOUNT_NAMES[kind]} ${RAN_OFF[kind] ?? 'ran off'}. It will be back in ${Math.ceil(back / 1000)} seconds`;
    if (dungeonLevel(this.app.doc?.id)) return 'No mounts in the dungeon. Only your weapon comes down here';   // (a run: one weapon, nothing else)
    if (!this.app.game || this.app.player?.admin) return null;
    // (a holder's own mount, picked once, and every mount bought in the Emporium: rules.js mountsOwned, 2026-10-28)
    const s = this.localSave(), k = s?.perks, mine = s?.picks?.mount, owned = mountsOwned(s);
    if (!owned.has(kind)) {
      // (no colon in a player's line, 2026-10-28: "Pick your mount first: ..." and "... is worn out: feed it")
      if ((k?.mounts || k?.mountChoice) && !mine) return 'Pick your mount first. Open Ride & pets, then Pick your gifts';
      if (!owned.size) return 'Mounts come with five Founding Farmers, or from the Emporium';
      return `You have no ${MOUNT_NAMES[kind]} to ride`;
    }
    if (staminaOf(s, kind) <= 0) return `Your ${MOUNT_NAMES[kind]} is worn out. Feed it in Ride & pets`;
    return null;
  }
  /** THROWN (rules.js MOUNT_BOLT): off the mount at once, which runs off (game/runaway.js) and is back in its while. */
  thrownOff(kind, from) {
    // (OVER WATER NOBODY MAY SWIM IN, 2026-10-28, the combat audit: a broomstick flies over any water, and its rider thrown
    //  over a stream or a pool with no swim zone -- all of Whisperwood's -- came down swimming where no stroke is allowed,
    //  fifty px and more from the bank, and could not move at all (play.js unstick looks three tiles round). Thrown there,
    //  the farmer comes down on the nearest dry ground instead; over water one may swim in, swimming, as before)
    const h = this.hero, wet = !!h.env?.isWater?.(this.x, this.y);
    if (wet && !this.canSwim(this.x, this.y)) { [this.x, this.y] = this.freeNear(this.x, this.y); h.x = this.x; h.y = this.y; h.mode = 'foot'; }
    else h.mode = wet ? 'swim' : 'foot';
    (this.runaways ??= []).push(new Runaway(this, kind, from));
    this.act('mount.bolt', { kind });
    this.sound?.cue(kind === 'horse' ? 'horse' : kind === 'bicycle' ? 'bikeBell' : 'broom');
    this.say(`Thrown! Your ${MOUNT_NAMES[kind]} ${RAN_OFF[kind] ?? 'ran off'}. It will be back in ${MOUNT_BOLT.backS} seconds`, 3600);
  }
  /** Out of stamina while ridden: down off it, told why (the bear stays beside you, lying down until fed). */
  mountTired() {
    const h = this.hero;
    if (!h || !MOUNT_NAMES[h.mode] || !this.app.game || this.app.player?.admin) return;
    const kind = h.mode;
    if (staminaOf(this.localSave(), kind) > 0) return;
    h.mount(kind);
    this.bearPal?.tire();
    this.gameUi?.notify?.(`Your ${MOUNT_NAMES[kind]} is worn out. Feed it in Ride & pets`);   // (no colon: as mountWhyNot says it, 2026-10-28)
  }
  /* ------------------------------------------------------------ THE HEAVY ATTACKS (game/heavy.js, rules.js HEAVY) */

  /** The weapon in hand, if it has a heavy attack (an exclusive one, the Emporium's): { kind, cfg, h, slot }, or null. */
  heavyHeld() {
    const h = this.hero?.held();
    if (!h?.exclusive || !h.skin || !HEAVY.cooldown[h.use]) return null;
    const cfg = heavyCfg(h);
    return cfg ? { kind: h.use, cfg, h, slot: this.hero.slot } : null;
  }
  /** Where an aimed one would come down: the pointer (or ahead of the farmer), no further off than its reach. */
  heavySpot(kind) {
    const reach = HEAVY.reach[kind] ?? 100, hx = this.x, hy = this.y - 4, m = this.mouse;
    let tx, ty;
    if (m?.on && !m.window && !this.touchPad?.touchy) { tx = m.sx + Math.round(this.cam.x); ty = m.sy + Math.round(this.cam.y); }
    else {
      // (a phone, or no pointer: the nearest creature in reach, else ahead)
      const foe = (this.combat?.enemies ?? []).filter((e) => !e.dead && !e.buried && Math.hypot(e.x - hx, e.y - hy) <= reach)
        .sort((a, b) => Math.hypot(a.x - hx, a.y - hy) - Math.hypot(b.x - hx, b.y - hy))[0];
      const v = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.hero.facing] ?? [0, 1];
      [tx, ty] = foe ? [foe.x, foe.y - 4] : [hx + v[0] * 60, hy + v[1] * 60];
    }
    const d = Math.hypot(tx - hx, ty - hy);
    if (d > reach) { tx = hx + ((tx - hx) / d) * reach; ty = hy + ((ty - hy) / d) * reach; }
    return [tx, ty];
  }
  /** The right button or B (or the phone's button) pressed: the slash and the throw go at once; the arrow rain and the
   *  magic circle are aimed until it comes up (heavyLoose) -- on a phone, at the nearest creature at once. */
  heavyPress(by) {
    const H = this.heavyHeld();
    if (!H) { if (by !== 'mouse') this.say('Heavy attacks belong to the Emporium weapons'); return; }
    if (!this.heavyCan()) return;
    if (H.kind === 'bow' || H.kind === 'magic') {
      if (by === 'touch') { const T = this.heavySpot(H.kind); this.hero.face(T[0], T[1]); this.heavyGo(H, T); }
      else this.heavyAim = { by, kind: H.kind };
      return;
    }
    if (by === 'mouse' && this.mouse?.on) this.hero.face(this.mouse.sx + Math.round(this.cam.x), this.mouse.sy + Math.round(this.cam.y));
    this.heavyGo(H, null);
  }
  heavyLoose() {
    const A = this.heavyAim, H = this.heavyHeld();
    this.heavyAim = null;
    if (!A || !H || H.kind !== A.kind || !this.heavyCan()) return;
    const T = this.heavySpot(H.kind);
    this.hero.face(T[0], T[1]);
    this.heavyGo(H, T);
  }
  /** May one be let loose now? If not, said why (the wait, the place, the mount). */
  heavyCan() {
    const h = this.hero;
    if (!h || this.travelling || this.gameUi?.windowOpen) return false;
    if (h.mode !== 'foot') { this.say(h.mode === 'swim' ? 'Not while swimming' : 'Get down first'); return false; }
    if ((h.pose && !h.pose.hold) || h.stunT > 0 || h.carry) return false;
    if (isSafePlace(this.app.doc)) { this.say('Nothing to fight here'); return false; }
    const left = Math.ceil(this.heavy?.waitLeft() ?? 0);
    if (left > 0) { this.say(`Heavy attack ready in ${left} ${left === 1 ? 'second' : 'seconds'}`); this.sound?.cue('deny'); return false; }
    return h.ready('heavyAttack');
  }
  /** LET IT LOOSE: told to the rules (commands.js heavy: the weapon, the wait, the energy), the farmer's swing, and as it
   *  lands the attack itself (game/heavy.js). T: where the bow's or the staff's comes down. */
  heavyGo(H, T) {
    const r = this.act('heavy', { what: H.kind, slot: H.slot });
    if (!r.ok) { this.say(r.reason ?? 'Not now'); this.sound?.cue('deny'); return; }
    this.heavy.began(H.kind);
    this.heavyNow = { kind: H.kind, cfg: H.cfg };
    const hero = this.hero;
    hero.heavySwing(H.kind, H.h.skin, () => this.heavy.start(H.kind, H.cfg, { x: this.x, y: this.y, facing: hero.facing }, T));
  }
  /** A creature caught in it: the hit as the rules count it (commands.js heavy.hit, the attack's own share of its heavy
   *  blow), knocked back from where it came, and its element's mark -- burning, frozen, bound or weakened. */
  heavyHit(e, power, from, status) {
    const N = this.heavyNow;
    if (!N || !this.act('heavy.hit', {}).ok) return;
    const dmg = heavyBlow(N.kind) * power, dx = e.x - from[0], dy = e.y - from[1], d = Math.hypot(dx, dy) || 1, family = weaponFamily(N.kind);
    this.combat.hurt(e, dmg, dx / d, dy / d, true, false, family);
    // (a boss shrugging this family off takes no mark of it either: no burn, no frost, no vines, no curse -- BOSS_WEAPONS)
    // (the burn's bite by the same rule as the blow's: in the dungeon, where nothing is immune, a fire weapon of the family a
    //  guardian shrugs off elsewhere burns it too -- 2026-10-28, the combat audit: it was held burning, and the burn bit nothing)
    if (status && !e.dead && bossTakes(e.type, family, !!this.dungeon) > 0) Heavy.hold(e, status[0], status[1], N.cfg, status[0] === 'burn' ? (dmg * HEAVY.burn.share * HEAVY.burn.every * bossTakes(e.type, family, !!this.dungeon)) / status[1] : 0);
  }
  /** Where it is aimed, while the button is held; and THE WAIT, by the farmer's head, filling as it comes back (the
   *  designer: "visible to the players that there is a cooldown and it's filling up"). With an exclusive weapon in hand. */
  drawHeavyAim(g) {
    const h = this.hero;
    if (!h || h.mode !== 'foot' || !this.heavy) return;
    const H = this.heavyHeld();
    if (!H) { this.heavyAim = null; return; }
    if (H.kind === 'axe') this.heavy.picOf(H.cfg);                     // (the thrown axe's own picture, sent for while it is in hand)
    if (this.heavyAim?.kind === H.kind) { const [tx, ty] = this.heavySpot(H.kind); drawReticle(g, tx, ty, AIM_R[H.kind] ?? 24, H.cfg, 0.85); }
    this.heavy.drawWait(g, H.cfg, Math.round(this.x) + 12, Math.round(this.y) - 30);
  }

  /* ------------------------------------------------------------ THE DASH (the dungeons, rules.js DASH) */

  /** The dash bar now: 0 to DASH.charges, a charge coming back every DASH.refillS. */
  dashLeft() {
    const now = performance.now(), b = (this.dashBar ??= { v: DASH.charges, at: now });
    b.v = Math.min(DASH.charges, b.v + (now - b.at) / 1000 / DASH.refillS); b.at = now;
    return b.v;
  }
  /** Is there dashing here? (the dungeon's levels) */
  dashHere() { return dashHere(this.app.doc?.id); }
  /** A DASH: a quick dart the way the farmer goes (or faces), DASH.px, nothing landing on them meanwhile; one charge of
   *  the bar. A held pose (sitting, fishing) is left; never mid-swing, on a mount, carrying, stunned. */
  dash() {
    const h = this.hero;
    if (!h || !this.dashHere() || this.travelling || this.gameUi?.windowOpen) return;
    if (h.mode !== 'foot' || h.dashing || h.climbDoor || h.stunT > 0 || h.carry || h.pose?.stuck || (h.pose && !h.pose.hold)) return;
    if (this.dashLeft() < 1) { this.sound?.cue('deny', { gain: 0.4 }); return; }
    if (h.pose?.hold) h.endPose();
    const K = this.keys;
    let ax = (K.has('ArrowRight') || K.has('d') ? 1 : 0) - (K.has('ArrowLeft') || K.has('a') ? 1 : 0);
    let ay = (K.has('ArrowDown') || K.has('s') ? 1 : 0) - (K.has('ArrowUp') || K.has('w') ? 1 : 0);
    if (!ax && !ay) [ax, ay] = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[h.facing] ?? [0, 1];
    const len = Math.hypot(ax, ay); ax /= len; ay /= len;
    this.dashBar.v -= 1;
    h.dashing = { vx: (ax * DASH.px) / DASH.s, vy: (ay * DASH.px) / DASH.s, s: DASH.s };
    h.facing = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up');
    this.dashGrace = performance.now() + DASH.grace * 1000;
    this.dashDust = { t: performance.now(), x: h.x, y: h.y, ax, ay };
    this.sound?.cue('dashWhoosh');
  }
  /** THE DASH BAR, SEEN (the designer: "a very small bar of dash energy"): two short pips under the farmer's feet in the
   *  dungeon, pale blue filling as each comes back; and the dust a dash kicks up behind it. */
  drawDashBar(g) {
    if (!this.dashHere() || !this.hero || this.hero.mode !== 'foot') return;
    const d = this.dashDust, now = performance.now();
    if (d && now - d.t < 380) {
      const u = (now - d.t) / 380;
      g.save();
      for (let k = 0; k < 6; k++) {
        const s = k / 5, x = d.x + d.ax * DASH.px * s * 0.9 - d.ay * ((k % 2) * 2 - 1) * 3, y = d.y + d.ay * DASH.px * s * 0.9 + d.ax * ((k % 2) * 2 - 1) * 2;
        g.globalAlpha = 0.45 * (1 - u) * (1 - s * 0.5); g.fillStyle = '#d9d2c4';
        g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 3 + u * 3, 1.5 + u, 0, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    const v = this.dashLeft(), w = 7, gap = 2, x0 = Math.round(this.x - (w * DASH.charges + gap * (DASH.charges - 1)) / 2), y = Math.round(this.y + 3);
    if (v >= DASH.charges && !dungeonDash(this.app.doc?.id)) return;   // (out of the dungeon, only while a dash comes back)
    g.save(); g.globalAlpha = 0.9;
    for (let k = 0; k < DASH.charges; k++) {
      const x = x0 + k * (w + gap), f = Math.max(0, Math.min(1, v - k));
      g.fillStyle = 'rgba(12, 10, 24, 0.85)'; g.fillRect(x - 1, y - 1, w + 2, 4);
      g.fillStyle = f >= 1 ? '#8fd8ff' : '#4a6f8c'; g.fillRect(x, y, Math.round(w * f), 2);
    }
    g.restore();
  }

  /** A MOUNT'S STAMINA, SEEN (2026-10-23, the designer: "the energy amount should show somewhere ... smaller, way smaller
   *  than the one we have for our energy and health bar"): a thin bar under the mount's feet (over the head is the name's),
   *  or under the bear beside them -- green to amber to red as it tires. A holder's own mount only (an admin's never tire). */
  drawMountBar(g) {
    if (!this.app.game || this.app.player?.admin) return;
    const s = this.localSave(), h = this.hero;
    if (!mountsOwned(s).size) return;
    // (each mount its own: rules.js staminaOf -- the one ridden, and the bear beside)
    const bar = (cx, top, kind) => {
      const k = staminaOf(s, kind) / MOUNT_STAMINA.max;
      const w = 16, x = Math.round(cx - w / 2), y = Math.round(top), f = Math.max(0, Math.min(w, Math.round(w * k)));
      g.save(); g.globalAlpha = 0.9; g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(12, 10, 24, 0.85)'; g.fillRect(x - 1, y - 1, w + 2, 4);
      g.fillStyle = k > 0.5 ? '#8fdc5a' : k > 0.2 ? '#f2c94c' : '#e8553c'; g.fillRect(x, y, f, 2);
      g.restore();
    };
    if (h && MOUNT_NAMES[h.mode]) bar(this.x, this.y + 3, h.mode);
    const b = this.bearPal;
    if (b && !b.hidden && !(h && h.mode === 'bear')) bar(b.x, b.y + 3, 'bear');
  }
  /** A PET'S ENERGY, SEEN (rules.js PET_ENERGY): a thin bar under it, while it is short of a full bar. */
  drawPetBar(g) {
    const p = this.localSave?.()?.pet;
    if (!this.app.game || this.app.player?.admin || !this.pet?.pet || !p) return;
    const k = petEnergyOf(p) / PET_ENERGY.max;
    if (k >= 1) return;
    const w = 12, x = Math.round(this.pet.x - w / 2), y = Math.round(this.pet.y + 2), f = Math.max(0, Math.round(w * k));
    g.save(); g.globalAlpha = 0.9;
    g.fillStyle = 'rgba(12, 10, 24, 0.85)'; g.fillRect(x - 1, y - 1, w + 2, 4);
    g.fillStyle = k > 0.5 ? '#8fdc5a' : k > 0.2 ? '#f2c94c' : '#e8553c'; g.fillRect(x, y, f, 2);
    g.restore();
  }
  /** Is the bear this farmer's to have beside them? (an admin's, the editor's, or a holder whose mount is the bear) */
  mayBear() { return !this.app.game || !!this.app.player?.admin || mountsOwned(this.localSave()).has('bear'); }

  /** The player: the layered villager doing whatever it is doing (game/hero.js). */
  drawHero(g) { this.drawChests(g); this.drawBags(g); this.pet?.draw(g, this.petFindsNow()); this.hero.draw(g); }
  /** Every Founding Farmer with an aura in view -- you, and the others shown -- for the sky to light by night: [{ x, y,
   *  mythic, rgb, seed }] (game/founding.js auraRGB). */
  auraLights(rect) {
    return this.auraFolk(rect).map((f) => ({ x: f.x, y: f.y, mythic: !!f.fd.mythic, rgb: auraRGB(f.fd.aura), seed: f.fd.n ?? 0 }));
  }
  /** The same, with their rigs: [{ key, x, y, fd, rig }] (game/founderfx.js). */
  auraFolk(rect) {
    const out = [], add = (key, rig, x, y) => {
      const f = rig?.founder;
      if (f?.aura && x > rect.x0 - 40 && x < rect.x1 + 40 && y > rect.y0 - 40 && y < rect.y1 + 60) out.push({ key, x, y, fd: f, rig });
    };
    add('me', this.hero?.rig, this.x, this.y);
    if (this.othersOn) for (const [i, r] of this.live?.remotes ?? []) add(i, r.rig, r.x, r.y);
    return out;
  }
  /** Everyone in view with an Emporium good's trait (game/goodsfx.js): [{ key, x, y, fx, ride }] -- a mount ridden in a
   *  skin bought there (its own sparkle and hoofprints), else an outfit worn (the set's). */
  goodsFolk(rect) {
    const out = [], add = (key, rig, x, y, act) => {
      if (!rig || x < rect.x0 - 40 || x > rect.x1 + 40 || y < rect.y0 - 40 || y > rect.y1 + 60) return;
      const ride = /^horse/.test(act ?? '') ? 'horse' : /^bear/.test(act ?? '') ? 'bear' : act === 'broom' ? 'broom' : null;
      const m = ride ? EMPORIUM_GOODS.find((g) => g.kind === 'mount' && g.mount === ride && g.skin === rig.look?.[ride] && g.fx) : null;
      const set = EMPORIUM_SETS[rig.look?.costume];
      const fx = m?.fx ?? (set ? { effect: set.effect, steps: set.steps, tint: set.tint, sparkle: set.sparkle ?? 1 } : null);
      if (fx && (fx.effect !== 'none' || fx.steps !== 'none')) out.push({ key, x, y, fx, ride: m ? ride : ride ? 'ride' : null });
    };
    add('me', this.hero?.rig, this.x, this.y, this.hero?.mode);
    if (this.othersOn) for (const [i, r] of this.live?.remotes ?? []) add(i, r.rig, r.x, r.y, r.action);
    return out;
  }
  /** How dark it is for the founders' light (game/founderfx.js): 1 in a cave's dark, the night's outdoors, 0 by day. */
  founderDark() {
    if (this.light?.on) return 1;
    if (!this.skyDraw?.on) return 0;
    return Math.max(0, Math.min(1, ((this.sky?.light?.dark ?? 0) - 0.15) / 0.35));
  }
  /** THE DEATH BAGS on this map you may see (server/world2.js bagsFor): yours, and anyone's past its hours. */
  async loadBags() {
    const map = this.app.doc?.id;
    try {
      const r = await fetch(serverURL(`api/bags?map=${encodeURIComponent(map)}`), { credentials: 'same-origin', cache: 'no-store' });
      const j = r.ok ? await r.json() : null;
      if (j?.ok && this.app.doc?.id === map) { this.bags = j.bags; this.chests = (j.chests ?? []).map((c) => ({ ...c, opensAt: Date.now() + (c.opensIn ?? 0) })); }
    } catch { /* the server is away: the bags as they were */ }
  }
  /** ...each where it lies (art:death-bag.png, design/deathbag): on the ground, twinkling now and then. */
  drawBags(g) {
    if (!this.bags?.length) return;
    const rec = this.app.assets.image('art:death-bag.png');
    if (rec?.state !== 'ok') return;
    const t = performance.now() / 1000;
    for (const b of this.bags) {
      const f = Math.floor(t * 2 + (b.x % 7)) % 6, col = f === 0 ? 2 : f === 1 ? 3 : 1;
      g.drawImage(rec.img, col * 16, 0, 16, 16, Math.round(b.x - 8), Math.round(b.y - 14), 16, 16);
    }
  }
  /** A BOSS'S LOOT CHEST known on this map (rules.js BOSS_CHEST), kept with when anyone may open it, by this page's clock. */
  addChest(c) { this.chests = [...(this.chests ?? []).filter((q) => q.id !== c.id), { ...c, opensAt: Date.now() + (c.opensIn ?? 0) }]; }
  /** How long until anyone may open this chest (0: now, or it is yours). */
  chestOpensIn(c) { return c.mine ? 0 : Math.max(0, (c.opensAt ?? 0) - Date.now()); }
  /** The loot chest at (x, y) -- its own 16 px and a little round it -- or null. */
  lootChestAt(x, y) { return (this.chests ?? []).find((c) => Math.abs(x - c.x) <= 12 && y >= c.y - 20 && y <= c.y + 10) ?? null; }
  /** The loot chest you stand by (BOSS_CHEST.near), or null. */
  chestNear() { return (this.chests ?? []).find((c) => Math.hypot(c.x - this.x, c.y - this.y) < BOSS_CHEST.near) ?? null; }
  /** ...each where its boss fell (BOSS_CHEST.art, the pack's navy and gold chest): a warm glow under it and a twinkle on its
   *  lid while it may be opened, another farmer's still in its hours a little dim; one just opened stands open a moment and
   *  fades. */
  drawChests(g) {
    const A = BOSS_CHEST.art, rec = this.app.assets.image(A.file);
    if (rec?.state !== 'ok') return;
    const now = performance.now(), t = now / 1000;
    this.chestsOpened = (this.chestsOpened ?? []).filter((c) => now - c.t < 1400);
    for (const c of [...(this.chests ?? []), ...this.chestsOpened]) {
      const open = c.t != null, free = this.chestOpensIn(c) <= 0, x = Math.round(c.x - 8), y = Math.round(c.y - 14);
      if (!open && free) {
        // (a warm pool of light round it, and a soft beam rising from it, so a chest is seen from across its arena)
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + c.x), r = 20 + pulse * 3, cy = c.y - 4;
        const glow = g.createRadialGradient(c.x, cy, 1, c.x, cy, r);
        glow.addColorStop(0, `rgba(255, 214, 102, ${(0.5 + pulse * 0.1).toFixed(2)})`); glow.addColorStop(1, 'rgba(255, 214, 102, 0)');
        g.fillStyle = glow; g.fillRect(c.x - r, cy - r, r * 2, r * 2);
        const top = c.y - 14 - 46, beam = g.createLinearGradient(0, c.y - 12, 0, top);
        beam.addColorStop(0, `rgba(255, 216, 110, ${(0.55 + pulse * 0.15).toFixed(2)})`); beam.addColorStop(1, 'rgba(255, 216, 110, 0)');
        g.save(); g.fillStyle = beam;
        g.fillRect(Math.round(c.x - 4), top, 8, c.y - 12 - top); g.fillRect(Math.round(c.x - 1), top - 8, 2, c.y - 12 - top + 8);
        g.restore();
      }
      g.save();
      g.globalAlpha = open ? Math.max(0, Math.min(1, (1400 - (now - c.t)) / 600)) : free ? 1 : 0.8;
      g.drawImage(rec.img, A.sx, open ? A.openSy : A.sy, 16, 16, x, y, 16, 16);
      g.restore();
      if (!open && free) {
        const f = (t * 1.4 + (c.x % 9) * 0.3) % 2.4;
        if (f < 0.5) {
          const a = 1 - Math.abs(f - 0.25) * 4, sx = x + 3 + (Math.abs(c.x * 7) % 10), sy = y + 2;
          g.fillStyle = `rgba(255, 248, 214, ${a.toFixed(2)})`; g.fillRect(sx, sy - 1, 1, 3); g.fillRect(sx - 1, sy, 3, 1);
        }
      }
    }
  }
  /** A LOOT CHEST OPENED (the server's: commands.js chest.open): its prize into your hands, the chest left open a moment. */
  async openLootChest(c) {
    if (this.lootBusy) return;
    this.lootBusy = true;
    try {
      const r = await this.session?.ask?.('chest.open', { id: c.id });
      if (!r) return;
      if (!r.ok) { this.say(r.reason ?? 'The chest will not open'); this.sound?.cue('deny'); this.loadBags(); return; }
      this.chests = (this.chests ?? []).filter((q) => q.id !== c.id);
      (this.chestsOpened ??= []).push({ ...c, t: performance.now() });
      this.sound?.cue(this.sound?.has?.('chestLuxury') ? 'chestLuxury' : 'chestOpen', { gain: 0.8 });
      if (r.gold > 0) this.lootFx({ gold: r.gold });
      const many = (w, n) => (n > 1 ? (/(s|x|z|ch|sh)$/.test(w) ? `${w}es` : `${w}s`) : w);
      const parts = [...(r.gold > 0 ? [`${r.gold.toLocaleString('en-US')} Gold`] : []),
        ...(r.items ?? []).map(([id, n]) => { const w = ITEMS[id]?.name ?? id; return `${n > 1 ? `${n} ` : /^[aeiou]/i.test(w) ? 'an ' : 'a '}${many(w, n)}`; })];
      const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] ?? 'nothing at all';
      this.say(r.mine ? `Your loot chest held ${list}` : `You opened ${r.owner || 'a farmer'}'s loot chest. It held ${list}`, 6000);
      this.ui?.refresh?.();
    } finally { this.lootBusy = false; }
  }
  /** The bag you stand by (DEATH_BAG.near), or null. */
  bagNear() { return (this.bags ?? []).find((b) => Math.hypot(b.x - this.x, b.y - this.y) < DEATH_BAG.near) ?? null; }
  /** How many finds your pet has for you now (its satchel, the server's: commands.js pet.sniff). */
  petFindsNow() { const p = this.localSave?.()?.pet; return this.pet?.pet ? (p?.finds?.length ?? 0) + (p?.bag?.length ?? 0) : 0; }
}
