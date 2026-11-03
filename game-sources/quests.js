// quests.js -- THE QUESTS (2026-09-26): the designer's quest structure (design/quests/QUEST_STRUCTURE.md) as
// data, and the rules that move a player through it. The game and the server read this one file: the browser
// shows the dialogue and the tracker, the server (game/commands.js, run again by server/world2.js) decides.
//
//   PART 1  the opening on Home Island: waking in Marlow's house, the first harvest, the boat (q01-q04)
//   PART 2  Bloomshire: meeting the town, an ordinary day's work, the town's work (q05-q07, q07t)
//   PART 3  the Founding Farmers chain (version 2, 2026-09-26: design/quests/FOUNDING_FARMERS_V2.md): eighteen
//           chapters in three acts, about three days of committed play -- puzzles that need what earlier chapters
//           gave, things you find lying in the world, each player's own answers; finishing it is recorded on the
//           server (save.founding) -- who is selected from those who finish is decided elsewhere, not here
//   SIDE    small jobs for the townsfolk (s_*)
//
// A QUEST: { id, name, chain, giver, after: [quests done first], unless?: [quests], summary (the journal's words),
// steps, reward: { gold, items: [[id, n, state?]] }, founding? }. It starts by itself once every quest in `after` is
// done -- unless the player already has one of `unless` (begun or done: a lesson that came in after they had passed
// that point in the story). Its STEPS are done in order; a step is one of
//   talk     { npc, lines, choices?, name?, gives? }      talk to someone (the server checks they are here)
//   meet     { npc }                                       meet someone (their first conversation: npcs.js intro)
//   clue     { clue, place, lines, needs?, gives? }       look at something: a zone tagged clue:<id> on the map
//   visit    { map }                                       go somewhere (by the maps' own doors)
//   do       { on, item?, map?, n }                        do something n times (a hoe swing, a catch, a cooked dish,
//                                                          'store': something put away in a chest on `map`)
//   have     { item, n }                                   carry something (a seed of any kind: 'seed:*')
//   all      { parts: [steps], need? }                     several of the above, in any order (all of them, or `need`)
//   deliver  { npc, items: [{ item, n, grown?, caughtAt?, cooked? }], lines, gives?, ask?, missing? }   hand things
//            over ('gold': Gold); `ask`: what they say when you come with it all, `missing`: when something is not there yet
//   puzzle   { puzzle, gives?, lines? }                     solve one of PUZZLES (the server judges: quest.touch/answer)
// EVERY STEP SAYS WHERE (`where`, the designer 2026-09-27: "give directions and landmarks", no arrow): the
// journal shows the step in hand's directions. A conversation's `lines` may hold the player's own replies,
// { you: ['...', '...'] } (at most 17 letters each), and {name} for the player's name.
// A clue may also say `night` (only at night, the server's clock), `needs` (used up unless `keeps`), `variant`
// (only at the player's own spot: a zone tagged var:<variant>:<n>). Its words may hold the player's secrets
// ({verse.1}, {code.1}, {carts}...): only the server fills them in (quest.inspect, quest.read).
// A quest's REWARD and a DELIVERY go through the economy's own command, quest.turnIn (keyed and booked like
// a sale): when the last step is done a quest with a reward is READY (rec.ready), and the game claims it at
// once; a deliver step is handed in the same way. Every step carries `text`, the tracker's line. Dialogue
// is short and plain: ordinary people in a small town (no dashes, no speeches).
//
// WHERE A STEP HAPPENS (the quest markers, 2026-09-26): a person's zone, a clue's zone -- or, for a clue with an
// `area`, the named place to search (the exact spot is still the player's to find), and for a `hidden` one only
// the map it is on. A `do` step may say `at`: { npc } | { map, tag } (a field, the water, a stove) | { map, area }
// | { map }. goalOf() turns that into a place, and where.js finds the way there, door by door.

import { useLockHints } from './rules.js';

export const MARK = 'a circle with three short lines cut through it';

/* ================================================================================ the things quests give */

const BOOK = 'Icons/RPG icons/Extras/Books.png', AMULET = 'Icons/RPG icons/Extras/Amulet.png', POTION = 'Icons/RPG icons/Extras/Potions.png';
const MUSH = 'Objects/Tree/Deep Forest/Fantasy Mushroom.png', QA = 'qart/icons/';
const art = (name) => [`${QA}${name}.png`, 0, 0];
/**
 * QUEST ITEMS: their icon -- the pack's where it has one, else Bloomshire Quest Art's (design/quests/art/make_art.mjs),
 * and always the same picture as where it lies in the world -- what they are, and for a book or a note what it
 * says (`read`: pages, a player's secrets in braces; `picture`: a drawing, {spot} being the player's own). Never
 * sold or traded, except what grows wild.
 */
export const QUEST_ITEMS = {
  'Marked Driftwood': { icon: art('driftwood'), about: 'A split plank from an old boat. A circle is cut into it, three short lines through its top.' },
  "Tobin's Trail Log": { icon: [BOOK, 224, 0], about: "Wren's great-grandfather's log of his fishing trail.",
    read: ['Tobin\'s trail log. The old fishing trail, lodge to stones, as my father walked it.',
      'The posts carry the Founders\' mark. Mind it and you won\'t get lost.',
      'At the top of the wood stand six stones, each with a beast cut into it. My father taught me the song that wakes them. I never could keep a tune, so here are the words, as near as I have them:',
      '"First wake {riddle.1}.', 'Then {riddle.2}.', 'Then {riddle.3}..."',
      'There was more to it. The hunter who keeps a fire in the west of the wood had the rest. He never did tell me.'] },
  "Hunter's Journal": { icon: [BOOK, 192, 16], about: 'A hunter\'s journal, kept dry in oilcloth.',
    read: ['Forty years hunting this wood. Deer at the glade, boar in the south, and never the hollow. Nothing good lives in the hollow.',
      'Old Tobin sang me the end of the stone song once, the part his boy never learned. I wrote it down before I lost it too:',
      '"...then wake {riddle.4}.', 'Then {riddle.5}.', 'And last of all, {riddle.6}."',
      'Wake them in that order and the moonstone opens. Wake them wrong and they go back to sleep, and sulk a while before they\'ll listen again.'] },
  'Old Token': { icon: art('token'), about: 'A disc of dark stone, cold in the hand. The mark on one face. It was cut to fit somewhere.' },
  'Silvercap Mushroom': { icon: [MUSH, 8, 128], about: 'A small pale blue mushroom. They grow in the wood\'s shade, thickest in Mushroom Hollow.', value: 25, cat: 'forage' },
  'Glowcap Mushroom': { icon: [MUSH, 8, 224], about: 'A small purple mushroom that glows faintly. A few grow in the wood; more at Moonmere.', value: 30, cat: 'forage' },
  'Clearsight Tonic': { icon: [POTION, 64, 32], about: 'Juniper\'s brew. Drink it where you want to see what still water hides, at night.' },
  'Mirror Charm': { icon: [AMULET, 32, 0], about: 'A charm of pale stone, cut to fit something. The mark again.' },
  'Map Piece I': { icon: [BOOK, 16, 48], about: 'A torn corner of an old map. From the Forgotten Shrine.' },
  'Map Piece II': { icon: [BOOK, 32, 48], about: 'A torn corner of an old map. From the delvers\' treasury.' },
  'Map Piece III': { icon: [BOOK, 48, 48], about: 'A torn corner of an old map. Nixie kept it.' },
  'Map Piece IV': { icon: [BOOK, 64, 48], about: 'A torn corner of an old map. From the Old Cave.' },
  "Founders' Map": { icon: art('map'), about: 'The Founders\' map of Moonmere, its four pieces joined. There is an X on it.',
    read: ['Four pieces of an old map, joined. Moonmere, drawn by hand, and a small X.'], picture: 'qart/maps/founders_map_{spot}.png' },
  'Lucky Pick': { icon: ['Icons/RPG icons/Weapons and Armor/2. Cooper/Pickaxe.png', 0, 0], about: 'A small pick, brass-bound, with the mark cut into its head.' },
  "Foreman's Record": { icon: [BOOK, 112, 0], about: 'Haskett\'s record, from his strongbox.',
    read: ['Haskett, foreman. Shift counts, winch repairs, the usual.',
      'The Green Vein runs further than anyone knows. The delvers cut a passage below it, into the deep they called the Gloom.',
      'I have barred the Vein. Nobody goes in without my leave.', 'If you are reading this, you opened my box, so you have it.'] },
  "Haskett's Note": { icon: [BOOK, 0, 48], about: 'A note in Haskett\'s hand, left by the green pool.',
    read: ['I went below, looking for the delvers\' old passage.',
      'The lever in the red deep has lost its handle. Bram\'s father made the first: emeralds set in iron. It would take another like it.',
      'I have left the Gloom\'s portcullis up behind me. Close it if I don\'t come back.',
      'Don\'t pull the lever unless you know where it leads.'] },
  'Lever Handle': { icon: art('handle'), about: 'Bram\'s work: an iron handle with three emeralds set in it.' },
  "Delvers' Key": { icon: art('key'), about: 'A heavy key of old bronze. The delvers made it for their vault.' },
  "Delvers' Record": { icon: [BOOK, 144, 0], about: 'The delvers\' record, from the vault.',
    read: ['Weights and tallies. Emerald, ruby, gold.', 'Then this: we cut the lake\'s pearl out of the rock below Moonmere. The Founders begged us not to.',
      'It was hers, the one who lives under the lake. She will want it back.',
      'The Founders tore their map in four so that no delver would find their cache. One piece is here.'] },
  'Pry Bar': { icon: art('prybar'), about: 'Bram\'s bar of gold-hardened iron. For a lid that will not open.' },
  "Founders' Letter": { icon: art('letter'), about: 'The Founders\' letter, from their chest.',
    read: ['To whoever finds this. We came to a valley under water, and she let us drain it and farm it.',
      'Every autumn we took her some of what we grew, caught and cooked, up at the lake.',
      'Our stew for her: a Ghost Catfish from her own water, caught under the moon. A Star Fruit from our seed. Two Silvercaps from the hollow. Cook it slowly.',
      'If the peace is ever broken, bring her our seal and what was taken. She will remember us.'] },
  "Founders' Seal": { icon: art('seal'), about: 'A round seal of gold, the Founders\' mark cut deep in it.' },
  'Moon Pearl': { icon: art('pearl'), about: 'A big pale pearl. It glows a little, even in the dark.' },
  'Founding Farmers Scroll': { icon: art('scroll'), about: 'Marven\'s scroll. Your name is on the Founding Farmers roll.' },
  'Wild Seeds': { icon: ['Crops/All Crops.png', 0, 0], about: 'Seeds from the bramble. Hazel will want to see them.' },
};

/* ================================================================================ the quests */

const T = (npc, text, lines, more = {}) => ({ kind: 'talk', npc, text, lines, ...more });
const C = (clue, place, text, lines, more = {}) => ({ kind: 'clue', clue, place, text, lines, ...more });
const V = (map, text, where = null) => ({ kind: 'visit', map, text, ...(where ? { where } : {}) });
const D = (on, text, more = {}) => ({ kind: 'do', on, n: 1, text, ...more });
const M = (npc, text) => ({ kind: 'meet', npc, text });
// the places the steps point at
const ISLAND_FIELD = { map: 'home_island', tag: 'farm' }, TOWN_FIELD = { map: 'bloomshire_town_traced', tag: 'farm' };
const RIVER = { map: 'bloomshire_town_traced', tag: 'river' };       // (its zone was tagged swim until 2026-09-27: no swimming in town)

export const QUESTS = [
  /* ---------------------------------------------------------------- PART 1: HOME ISLAND */
  { id: 'q01', name: 'Waking Up', chain: 'tutorial', giver: 'marlow', after: [],
    summary: 'You woke up in a stranger\'s bed. Someone is moving about the house.',
    steps: [
      T('marlow', 'Talk to the man in the house', [
        'Oh! You\'re awake. Easy, easy. Don\'t try to stand up too fast.', { you: ['Where am I?', 'Who are you?'] },
        'You\'re in my house, on my island. My name\'s Marlow.',
        'Found you three days ago, tangled up in what was left of a boat. Most things that go in that river don\'t come out. You were lucky.',
        'I carried you up here and kept the fire going. That\'s about all the doctoring I know.', 'How are you feeling?'],
      { where: 'The old man is here in the house with you. Walk up to him and press E to talk.',
        choices: [['I\'m alright.', 'Good. You slept long enough for it.'], ['Sore, but alive.', 'Sore and alive. That\'s the right way round.']],
        name: { ask: 'Now, I can\'t keep calling you "the one from the river". What\'s your name?' },
        after: ['{name}. Good. It\'s nice to know who I\'ve been feeding soup to.',
          'Listen. I\'m getting old, and this island is too much work for me now.', 'I\'m moving over to Bloomshire, across the water. I\'ve got a little house lined up in town.',
          'Which leaves this place empty. The house, the field, the boat. You can have them, if you want them.', { you: ['Mine? Really?', 'Why me?'] },
          'Someone ought to live here, and you need somewhere to live. Seems simple enough to me.',
          'But I\'m not letting you loose in Bloomshire till you can grow something.',
          'Come out when you\'re steady on your feet. I\'ll be by the door.'] }),
    ] },
  { id: 'q02', name: 'First Harvest', chain: 'tutorial', giver: 'marlow', after: ['q01'],
    summary: 'Marlow wants to see you grow something before you leave the island.',
    steps: [
      T('marlow', 'Find Marlow outside the door',['There you are, {name}. Still in one piece? Good.',
        'That field hasn\'t been worked since my knees gave up. The soil\'s good, though. It only wants turning.',
        'Here\'s my old hoe, and some carrot seeds. Break up the ground, then put the seeds in.', { you: ['Just carrots?', 'Got it.'] },
        'Carrots are easy. Best thing to learn on. They come up quick and they\'re hard to kill.'],
      { gives: [['tool:hoe', 1], ['seed:0', 5]], where: 'Go out of the front door: Marlow is standing by the path, just outside it. The field is the patch of bare earth west of the house.' }),
      D('hoe', 'Hoe some soil in the field', { at: ISLAND_FIELD, where: 'Stand in the field west of the house with the hoe in your hand and press Space. One swing turns a whole row.' }),
      D('sow', 'Plant the seeds', { at: ISLAND_FIELD, where: 'Take the seeds in hand from your hotbar, stand on the turned soil and press Space.' }),
      T('marlow', 'Tell Marlow the seeds are in', ['All in? Let\'s have a look.', 'Not bad at all. Maybe you\'ve done this before. Before the river, I mean.',
        { you: ['I don\'t remember.', 'What now?'] }, 'Now they want water. Here, take my can. And the sickle, for when they\'re ready.'],
      { gives: [['tool:can', 1], ['tool:sickle', 1]], where: 'Marlow is standing by the path outside your front door.' }),
    ] },
  { id: 'q03', name: 'Give It Some Water', chain: 'tutorial', giver: 'marlow', after: ['q02'],
    summary: 'The carrots are in. They need a drink, and a little patience.',
    steps: [
      // (2026-10-01: rain waters the carrots too, and the can is then refused -- "it does not need water" -- so a farmer
      //  whose carrots the rain had watered could never do this step, harvested them, and had no seeds left: a harvest
      //  counts here as well)
      D('water', 'Water what you planted', { on: ['water', 'harvest'], at: ISLAND_FIELD, where: 'Take the can to your carrots west of the house and press Space. Did rain water them already? Then harvest one when it is ripe.',
        remind: ['Water them, then give them a couple of minutes.', 'Nothing grows faster for being stared at. I\'ve tried.'] }),
      D('harvest', 'Harvest it with the sickle', { at: ISLAND_FIELD, where: 'When the carrots have come up, stand by them with the sickle in hand and press Space.',
        remind: ['They look ready to me. Get the sickle on them before the rabbits notice.'] }),
      T('marlow', 'Show Marlow your first harvest', ['Well, look at that. Your first carrot.', { you: ['Not bad, eh?', 'It\'s a bit small.'] },
        'It\'s a good carrot. The small ones are sweeter anyway.', 'Here, a little something for your pocket. You\'ll need Gold over in Bloomshire.'],
      { where: 'Marlow is by the path outside your front door.' }),
    ],
    reward: { gold: 60 } },
  // (the designer, 2026-09-28: after the farming lesson Marlow tells the player the hotbar holds ten things, and that
  //  what they don't use every day goes in a chest -- the ones in the house, and the Storehouse's in Bloomshire; and
  //  2026-10-02, the backpack's five more)
  { id: 'q03c', name: 'A Place for Everything', chain: 'tutorial', giver: 'marlow', after: ['q03'], unless: ['q04'],
    summary: 'You carry ten things in hand and five in your backpack. Marlow shows you where the rest can go.',
    steps: [
      T('marlow', 'Hear what Marlow has to say', ['One more thing before you go anywhere, {name}.',
        'You can carry ten things in hand. That row along the bottom. Five more go in your backpack. That\'s your lot.', { you: ['Only fifteen?', 'When it\'s full?'] },
        'When it fills up, come home. There are chests in the house. Put away whatever you don\'t need every day.',
        'And over in Bloomshire, the Storehouse keeps a chest for you as well. Handy when you\'re in town.',
        'Go on, try it. Put something in one of the chests in the house.'],
      { where: 'Marlow is by the path outside your front door.' }),
      D('store', 'Put something away in a chest in the house', { map: 'interior_home',
        where: 'The chests are in the house: two by the fireplace, a crate, and one by the bed. Press E at one and drag something into it.',
        remind: ['Any chest in the house will do. Drag something from your hotbar into it.'] }),
      T('marlow', 'Tell Marlow it\'s put away', ['There. Safe, and your hands are free.', { you: ['Easy enough.', 'Is it safe there?'] },
        'Whatever you put in a chest stays there until you come back for it. Nobody else can open them.',
        'The Storehouse in town works the same way. Remember it when your hands are full.'],
      { where: 'Marlow is by the path outside your front door.' }),
    ] },
  { id: 'q04', name: 'The Road to Bloomshire', chain: 'tutorial', giver: 'marlow', after: ['q03c'],
    summary: 'Marlow has taught you what he can on the island. Bloomshire is across the water, and he is going with you.',
    steps: [
      T('marlow', 'Talk to Marlow', ['Well, {name}. I think you\'re ready. Readier than I was, anyway.',
        'Bloomshire\'s just over the water. Good people. They\'ll talk your ear off, mind.',
        'Take these. My old axe, my pickaxe, my rod and my sword. They\'re worn, but they\'ll serve.', { you: ['A sword?', 'Thanks, Marlow.'] },
        'There are wild things in the woods, and worse in the caves. Better to have it and not need it.', 'And a few more seeds. Now come on. I\'ll meet you down at the boat.'],
      { gives: [['tool:axe', 1], ['tool:pickaxe', 1], ['tool:rod', 1], ['tool:sword', 1], ['seed:0', 5]], where: 'Marlow is by the path outside your front door.' }),
      V('bloomshire_town_traced', 'Row across to Bloomshire', 'The rowing boat is tied up on the south shore of the island, below the house. Stand next to it and press E.'),
    ] },

  /* ---------------------------------------------------------------- PART 2: BLOOMSHIRE */
  // (the Storehouse's chest, as Marlow said: everyone's own forty slots in town -- the map's chest:storehouse zone)
  { id: 's_storehouse', name: 'The Storehouse', chain: 'town', giver: 'marlow', after: ['q04'],
    summary: 'Marlow said the Storehouse in Bloomshire keeps a chest for you. Handy when your hands are full in town.',
    steps: [
      D('store', 'Put something in your chest at the Storehouse', { map: 'interior_storehouse',
        where: 'East side of town, straight south of the Bank. Inside, the chest is on the right above a barrel: press E, drag something in.' }),
    ] },
  { id: 'q05', name: 'A New Place', chain: 'town', giver: 'marlow', after: ['q04'],
    summary: 'Marlow wants you to go round town and meet people. There\'s no hurry.',
    steps: [
      T('marlow', 'Talk to Marlow by the jetty', ['Here we are. Bloomshire. Smell that? That\'s Tamsin\'s bread. You get used to it. I never have.',
        { you: ['It\'s lovely.', 'Where do I start?'] }, 'Start by meeting people. They\'ll want to know who you are anyway, so you might as well get in first.',
        'Maren is the Elder. Her house is on the west bank of the river, north of the bridge. She knows everyone.',
        'Then Hazel at the Seed & Tool, Odette at the General Store, Bram at the Forge, and Wren the fisher.',
        'I\'ll be at my new house, west of the river and south of the main road. Come and find me when you\'ve had a look round.'],
      { where: 'Marlow is on the jetty where the boat came in, at the south end of town by the river.' }),
      { kind: 'all', text: 'Meet the people of Bloomshire', where: 'Maren: west bank, north of the bridge. Odette: by the bridge. Hazel and Bram: east of the square. Wren: the cottage by the south jetties.', parts: [
        M('maren', 'Meet Maren, the Elder'),
        M('hazel', 'Meet Hazel at the Seed & Tool'),
        M('odette', 'Meet Odette at the store'),
        M('bram', 'Meet Bram at the Forge'),
        M('wren', 'Meet Wren, the fisher'),
      ] },
    ] },
  { id: 'q06', name: 'Your Own Routine', chain: 'town', giver: 'marlow', after: ['q04'],
    summary: 'Bloomshire isn\'t only farming. Marlow wants you to try a real day of it.',
    steps: [
      T('marlow', 'Ask Marlow about a day here', ['Hello, {name}. Come in, mind the boxes. I haven\'t unpacked a thing.', { you: ['A typical day?', 'Need a hand?'] },
        'I\'ll tell you what a day here looks like. Buy some seeds from Hazel, and plant them in the fields by the greenhouse, north of the square.',
        'Chop a tree or break a rock. Somebody always needs wood or stone.',
        'Catch a fish in the river. Then sell something to a shop. Wren buys fish, Hazel buys crops, Odette buys nearly anything.',
        { you: ['Sounds busy.', 'I\'ll do it.'] }, 'That\'s a day\'s work, near enough. Come back and tell me how you get on.'],
      { where: 'Marlow\'s new house is west of the river, south of the main road, near the allotments.' }),
      { kind: 'all', text: 'Five everyday things', where: 'Hazel\'s shop is just east of the square. The fields are north of the square, by the greenhouse. The river runs through the west of town.', parts: [
        { kind: 'do', on: 'buy', item: 'seed:*', n: 1, text: 'Buy seeds from Hazel', at: { npc: 'hazel' } },
        D('sow', 'Plant a crop in a field', { at: TOWN_FIELD }),
        { kind: 'do', on: ['chop', 'mine'], n: 1, text: 'Chop a tree or break a rock' },
        D('fish', 'Catch a fish in the river', { at: RIVER }),
        { kind: 'do', on: ['sell', 'trade'], n: 1, text: 'Sell something at a shop' },
      ] },
      T('marlow', 'Tell Marlow how the day went', ['Well? How was it? You\'ve got mud on your boots, so it can\'t have gone too badly.',
        { you: ['It was good.', 'I\'m tired.'] }, 'Tired\'s normal. Seeds, a crop, wood, a fish, a sale. That\'s the job.',
        'Here. You earned that.'],
      { where: 'Marlow\'s new house is west of the river, south of the main road, near the allotments.' }),
    ],
    reward: { gold: 100 } },
  { id: 'q07', name: 'The Town\'s Work', chain: 'town', giver: 'maren', after: ['q05', 'q06'],
    summary: 'You\'ve met the town and done a day\'s work. Maren thinks it\'s time you made yourself useful.',
    steps: [
      T('maren', 'Talk to Maren', ['Ah, {name}. Come and sit a minute. Marlow tells me you\'ve been busy.', { you: ['A little.', 'Word gets around.'] },
        'It does. You\'ve settled in quicker than most. The last newcomer spent a week lost in the orchard.',
        'Now. There\'s always somebody here who needs a hand.',
        'Hollis could use a hand with the animals, and Tamsin wants someone to cook with. Wren, Juniper, Bram, Pell and Hazel have jobs going too.',
        'Nobody here turns down help. Go and ask around.'],
      { where: 'Maren\'s house is on the west bank of the river, north of the bridge.' }),
    ] },
  { id: 'q07t', name: 'Something From the Kitchen', chain: 'town', giver: 'tamsin', after: ['q07'],
    summary: 'Tamsin says anyone can cook if they\'ll stand at a stove long enough.',
    steps: [
      T('tamsin', 'Talk to Tamsin at the Bakery', ['Come in, come in. Watch the flour, I\'ve had a bit of an accident.', { you: ['Teach me to cook?', 'What happened?'] },
        'You want to learn? Oh, good. Nobody ever wants to learn. They just want to eat.',
        'The stove\'s right behind me. Start simple. Fry a fish, or put some vegetables on a plate.', 'Bring me whatever you make. I\'ll be honest, but I\'ll be nice about it.'],
      { where: 'The Bakery is on the west bank, right by the bridge, on the north side of the main road.' }),
      D('cook', 'Cook something at a stove', { at: { map: 'interior_bakery', tag: 'cook' }, where: 'Stand at the stove in the Bakery and press E. Fried Fish takes one Carp: put it in the pot.' }),
      { kind: 'deliver', npc: 'tamsin', text: 'Bring Tamsin what you cooked', items: [{ item: 'food:*', n: 1, cooked: true }],
        where: 'Tamsin is behind the counter in the Bakery, by the bridge.',
        ask: ['Is that for me? Let\'s have a taste.', { you: ['Here you go.'] }], missing: 'Nothing yet? The stove won\'t bite. Well, it might. Use a cloth.',
        lines: ['Mm. Not bad for a first go. Not bad at all.', 'You can cook at home too. There\'s a stove in Marlow\'s old house, if I remember right.'] },
    ],
    reward: { gold: 80 } },

  /* ================================================================ PART 3: THE FOUNDING FARMERS (version 2) */
  /* ---------------------------------------------------------------- ACT I: THE MARK */
  { id: 'ff01', name: 'A Strange Find', chain: 'founding', giver: 'maren', after: ['q04'],
    summary: 'Something odd has washed up below Maren\'s house, and she wants you to take a look.',
    steps: [
      T('maren', 'Talk to Maren', ['{name}, have you got a minute? I could use your help.', { you: ['What\'s wrong?', 'Is all well?'] },
        'Nothing\'s wrong, exactly. It\'s just odd.', 'Something washed up on the riverbank this morning, just below my house. Hugo found it and came running.',
        'Hugo says it looks older than his mill. And that mill is falling to bits.', { you: ['I\'ll take a look.', 'What is it?'] },
        'Go and see for yourself. It\'s still lying there. I didn\'t want to move it.'],
      { where: 'Maren\'s house is on the west bank of the river, north of the bridge.' }),
      C('wreck', 'The riverbank', 'Look at the find by the river', ['A split plank from an old boat, grey from the water.', 'Someone cut a mark into it: a circle, with three short lines through its top.'],
        { gives: [['Marked Driftwood', 1]], where: 'Just below Maren\'s house, at the water\'s edge on the west bank. Look for something grey lying in the grass.' }),
      T('maren', 'Show Maren the mark', ['Well? What was it?', { you: ['A boat plank.', 'There\'s a mark.'] },
        'Let me see. A circle, and three lines cut through the top of it.',
        'I\'ve seen this before. On a post in Whisperwood, when I was a girl. I used to think it was a warning.',
        'Wren\'s family has fished this river for four generations. If anyone knows it, she will. Her cottage is down by the south jetties.'],
      { where: 'Maren is at her house on the west bank of the river, north of the bridge.' }),
    ] },
  { id: 'ff02', name: 'The Fisherman\'s Memory', chain: 'founding', giver: 'wren', after: ['ff01'],
    summary: 'Maren thinks Wren\'s family knows the mark on the plank.',
    steps: [
      T('wren', 'Ask Wren about the mark', ['So, {name}. Come to buy a rod, or just to drip on my floor?', { you: ['Look at this.', 'Know this mark?'] },
        'Let\'s see it, then. Oh. Oh, now that\'s something.', 'That\'s my great-grandfather\'s mark. Tobin. He cut it into every post on his old fishing trail.',
        'He kept a log of that trail. It\'s in the chest upstairs somewhere. Probably under the nets.', { you: ['Can I see it?', 'May I borrow it?'] },
        'Family things don\'t go for nothing. Bring me a Chub, a Perch and a Sunfish, fresh out of the river.', 'And leave me that plank. It was his. It stays in the family.'],
      { where: 'Wren\'s cottage is on the east bank of the river, down by the south jetties.' }),
      { kind: 'deliver', npc: 'wren', text: 'Bring Wren three fish and the plank', items: [{ item: 'Chub', n: 1 }, { item: 'Perch', n: 1 }, { item: 'Sunfish', n: 1 }, { item: 'Marked Driftwood', n: 1 }],
        where: 'Chub, Perch and Sunfish all bite in the river through town. Wren is at her cottage by the south jetties.',
        ask: ['Back already? Let\'s see what the river gave you.', { you: ['Here they are.'] }], missing: 'Not all three yet? Chub, Perch, Sunfish. They\'re all in there. Just keep casting.',
        lines: ['Good fish, all three. I\'ll put his plank with the rest of his things.', 'Here. Tobin\'s trail log. Read it carefully, he wrote small.',
          'His trail started at the old lodge where the road goes into Whisperwood, west of town.'], gives: [["Tobin's Trail Log", 1]] },
    ],
    reward: { gold: 150 } },
  { id: 'ff03', name: 'The Trailhead', chain: 'founding', giver: 'wren', after: ['ff02'],
    summary: 'Tobin\'s trail began at the lodge in Whisperwood. His log holds half of an old song for waking the stones. A hunter kept the rest.',
    steps: [
      V('forest', 'Go west to Whisperwood', 'Take the main road west out of town, over the bridge and past the Bakery. It runs straight into Whisperwood.'),
      C('trail_marker', 'Trailhead lodge', 'Find the marker at the lodge', ['An old post by the lodge. It was here before the lodge was. Someone has nailed a birdhouse to it.',
        'Under the birdhouse, Tobin\'s mark, and a line cut small:', '"The rest of the song is at the hunter\'s fire."'],
        { area: 'Trailhead lodge', where: 'Just inside Whisperwood, beside the path by the old lodge. Look for an old post with a birdhouse nailed to it.' }),
      C('hunter_box', 'The Hunter\'s Camp', 'Look in the chest by the hunter\'s fire', ['A small chest by the fire, its lid swollen with damp.', 'Inside, wrapped in oilcloth, a hunter\'s journal.'],
        { gives: [["Hunter's Journal", 1]], area: "Hunter's Camp", where: 'Follow the main path west through the wood, over the stream and past the crossroads, to the camp at its far end. The chest is by the fire.' }),
    ] },
  { id: 'ff04', name: 'The Moonstone Circle', chain: 'founding', giver: null, after: ['ff03'],
    summary: 'An old song in two halves, one in Tobin\'s log and one in the hunter\'s journal: which stone to wake first, and which last. It is written in riddles.',
    steps: [
      // (the order is the song's, and the journal says so -- testers, 2026-09-29)
      { kind: 'puzzle', puzzle: 'circle', text: 'Wake the six stones in order', area: 'Moonstone Circle',
        where: 'North of the crossroads, west of Mirror Pond. Wake them in the song\'s order: Tobin\'s Trail Log, then the Hunter\'s Journal.' },
      C('token_hollow', 'Moonstone Circle', 'Look in the moonstone\'s hollow', ['The moonstone has split along an old seam. In the hollow, wrapped in rotten cloth: a disc of dark stone with the mark on it.',
        'Under it, two seeds you don\'t know, wrapped in a scrap that says: "Our fruit. It won\'t grow for a beginner."', 'A line is scratched inside the hollow: "The caps grow where the light does not. Follow them."'],
        { gives: [['Old Token', 1], ['seed:14', 2]], area: 'Moonstone Circle', where: 'The moonstone is the knot of crystal in the middle of the ring of stones.' }),
    ],
    reward: { gold: 250 } },
  { id: 'ff05', name: 'Clear Eyes', chain: 'founding', giver: 'juniper', after: ['ff04'],
    summary: '"The caps grow where the light does not." That sounds like Mushroom Hollow, in the far west of Whisperwood.',
    steps: [
      C('hollow_carving', 'Mushroom Hollow', 'Find the mark among the caps', ['A cut stump among the caps. Someone has scraped the moss off it.', 'The mark again, and under it:',
        '"Clear eyes see what the water hides. Ask the herb-woman."'],
        { area: 'Mushroom Hollow', where: 'Go past the Hunter\'s Camp to the far west of the wood, where the trees turn teal. Look for a cut stump among the giant mushrooms.' }),
      T('juniper', 'Ask Juniper about clear eyes', ['You\'ve got that look. Somebody\'s sent you with a question.', { you: ['Clear eyes?', 'A carving did.'] },
        'Clear eyes? My grandmother used to say that. It\'s not a riddle, it\'s a recipe.',
        'It\'s Clearsight. A tonic. Drink it by still water at night and you see what the water\'s hiding.',
        'I can brew it. I\'ll need three Silvercaps, the small pale blue ones. Mushroom Hollow is thick with them.',
        'And one Glowcap. Small, purple, glows a little. A few grow in the wood, and there are plenty at Moonmere.', { you: ['I\'ll find them.', 'Is it safe?'] },
        'Pick them with your fingers, not a knife, and bring them fresh. They sulk if you keep them waiting.'],
      { where: 'The Apothecary is the teal-roofed house on the far west side of town, north of the main road.' }),
      { kind: 'deliver', npc: 'juniper', text: 'Bring Juniper the mushrooms', items: [{ item: 'Silvercap Mushroom', n: 3 }, { item: 'Glowcap Mushroom', n: 1 }],
        where: 'Silvercaps are small pale blue mushrooms, thickest in Mushroom Hollow. Glowcaps are small and purple, in the wood and at Moonmere.',
        ask: ['Did you find them? Let me smell. Yes, those are the ones.', { you: ['Here you are.'] }], missing: 'Not yet? The pale blue ones, remember. Not the red ones. Never the red ones.',
        lines: ['Give me a moment. Stir, stir, and... there.', 'One bottle. Drink it beside the water you want to see into, and only at night. By day it just tastes of mud.'],
        gives: [['Clearsight Tonic', 1]] },
    ],
    reward: { gold: 250 } },
  { id: 'ff06', name: 'Mirror Pond', chain: 'founding', giver: null, after: ['ff05'],
    summary: 'Juniper\'s tonic only works at night, by still water. Mirror Pond is the stillest water in the wood.',
    steps: [
      C('pond_reflection', 'Mirror Pond', 'Use the tonic there at night', ['You drink the tonic. The pond goes still as glass.',
        'In the reflection there\'s a gap under the far bank. You can\'t see it from this side.', 'A way in, if you don\'t mind getting wet.'],
        { needs: [['Clearsight Tonic', 1]], night: true, dayLines: ['The pond shows the sky, and nothing else.', 'Juniper said the tonic works at night.'], area: 'Mirror Pond',
          where: 'Follow the stream north from the bridge in the middle of Whisperwood to the pond it comes from. Go after dark.' }),
      V('cave_mirror_grotto', 'Swim to the gap under the bank', 'The gap is under the pond\'s north-east bank. Swim across to it.'),
      C('grotto_charm', 'The grotto under the pond', 'Search the grotto', ['A small cave of wet stone. Something growing on the walls gives off a faint light.', 'At the foot of the far wall, a charm of pale stone. It\'s cut to fit something, and the mark is on it.'],
        { gives: [['Mirror Charm', 1]], hidden: true, where: 'Inside the grotto under Mirror Pond, at the foot of the far wall.' }),
    ] },
  { id: 'ff07', name: 'The Forgotten Shrine', chain: 'founding', giver: 'maren', after: ['ff06'],
    summary: 'The charm was cut to fit something, and so was the Old Token. There\'s an old shrine in the south of the wood.',
    steps: [
      C('shrine_socket', 'The Forgotten Shrine', 'Find where the charm and the token fit', ['At the angel\'s feet, two hollows in the stone: one round, one the shape of the charm.',
        'The token fits the round one, the charm the other. Stone grinds, and a panel slides open.',
        'Inside, a torn corner of an old map, and a line cut in the stone:', '"The rest went up the mountain, with the delvers."'],
        { needs: [['Mirror Charm', 1], ['Old Token', 1]], gives: [['Map Piece I', 1]], area: 'The Forgotten Shrine',
          where: 'From the crossroads in the middle of Whisperwood, take the path south to the old stone shrine. The weeping angel stands in the middle of it.' }),
      T('maren', 'Tell Maren what you found', ['{name}! You look like you\'ve been dragged through a hedge. Sit down, sit down.', { you: ['Look at this.', 'I found a map.'] },
        'A piece of a map, torn on three sides. And this ink... this is very old.',
        '"The rest went up the mountain, with the delvers." The delvers were the first miners at Stonepeak, long before the camp.',
        'The miners still keep records up there. Talk to Dunn. He runs the camp, and he\'s kinder than he sounds.'],
      { where: 'Maren\'s house is on the west bank of the river, north of the bridge.' }),
    ],
    reward: { gold: 400 } },

  /* ---------------------------------------------------------------- ACT II: THE DELVERS */
  { id: 'ff08', name: 'The Miners\' Camp', chain: 'founding', giver: 'dunn', after: ['ff07'],
    summary: 'Maren says the miners at Stonepeak keep old records. Dunn runs the camp.',
    steps: [
      V('stonepeak', 'Go east to Stonepeak', 'Take the main road east out of town, past the Forge and the Carpenter. It climbs up to Stonepeak.'),
      C('camp_notice', 'Stonepeak', 'Read the notices at Stonepeak', ['WANTED: strong backs for the winch. Ask at the camp.', 'LOST: one lucky pick, brass-bound. Last seen in the Old Working.', 'The quarry is free to all.'],
        { where: 'There\'s a notice board by the road where you come in, and another at the miners\' camp in the north-west.' }),
      T('dunn', 'Ask Dunn about the old records', ['Right. What brings you up here, then?', { you: ['Old records.', 'Maren sent me.'] },
        'Records? We keep shift counts and a roof that leaks. That\'s about it.',
        'I might know a thing or two. But I\'ve got two problems first, and you\'ve got two hands.',
        'My pick went down the shaft in the Old Working. The lower level. I was lucky it was only the pick.',
        'And the winch is failing. Twenty Copper Ore and twenty-five Stone would see it right. Bring me both and we\'ll talk.'],
      { where: 'Dunn is by the fire at the miners\' camp, in the north-west of Stonepeak.' }),
      V('cave_old_working_2', 'Go down the Old Working', 'The Old Working is the mine mouth south of the tarn, west of the stream. Go in and take the shaft down.'),
      C('lucky_pick', 'The Old Working, lower level', 'Find the lucky pick', ['Wedged between two rocks at the end of a side passage, a small pick bound in brass.', 'The mark is cut into its head.'],
        { gives: [['Lucky Pick', 1]], hidden: true, where: 'On the lower level, make for the far south-west corner. It fell between two rocks at the end of a side passage.' }),
      { kind: 'deliver', npc: 'dunn', text: 'Bring Dunn his pick and ore', items: [{ item: 'Lucky Pick', n: 1 }, { item: 'Copper Ore', n: 20 }, { item: 'Stone', n: 25 }],
        where: 'Copper seams are the orange-flecked rocks in the Old Working. Stone comes from any plain rock. Pickaxes wear out: the Forge sells more.',
        ask: ['Is that my pick? Please tell me that\'s my pick.', { you: ['It\'s your pick.'] }],
        missing: 'Still short? The Old Working\'s full of copper, and every rock\'s got stone in it. Mind your pickaxe, they wear down.',
        lines: ['That\'s her. I thought I\'d never see her again.', 'And that\'s the winch mended for another year. Thank you. Honestly.'] },
    ],
    reward: { gold: 800 } },
  { id: 'ff09', name: 'Haskett\'s Strongbox', chain: 'founding', giver: 'dunn', after: ['ff08'],
    summary: 'Dunn found his pick in the old foreman\'s house. Haskett left a strongbox with four numbers on its dial, and wrote them where he walked every day.',
    steps: [
      T('dunn', 'Ask Dunn about the mark', ['Now then. You wanted to know about old things.',
        'That mark on my pick? It was there when I found it, in the old foreman\'s house. The one next to mine.', { you: ['Whose house?', 'The foreman?'] },
        'Haskett. He ran this camp before me. Went looking for something under the mountain one winter and never came back.',
        'He left a strongbox by his door. Four numbers on the dial, and he never told a soul what they were.',
        'Careful man, Haskett. He\'d have written them where he walked every day. The tarn, the cairn, the company board, the graves. That was his round.'],
      { where: 'Dunn is by the fire at the miners\' camp, in the north-west of Stonepeak.' }),
      { kind: 'all', text: 'Find Haskett\'s four numbers', where: 'Tarn jetty: north of the camp. Cairn: the south ridge. Company board and graves: the ruined compound, up on the High Shelf to the east.', parts: [
        C('tarn_post', 'The tarn jetty', 'Read the marks on the tarn jetty', ['Depth marks, cut into the last plank of the jetty.', 'Beside them, scratched small, a number: {code.1}.'], { area: 'The Tarn' }),
        C('cairn', 'The cairn', 'Look at the cairn', ['A cairn, one stone for every miner who came home.', 'Chalked on the top stone: {code.2}.']),
        C('company_board', 'The High Shelf', 'Read the company board', ['THE HIGH SHELF COMPANY. Shifts posted at dawn.', 'At the bottom, in Haskett\'s hand: "Shift {code.3}. Mine."']),
        C('graves', 'The miners\' graves', 'Look at the miners\' graves', ['Names scratched into slate: TAM, OLD BESS, THE TWINS.', 'Under TAM, small and neat: {code.4}.']),
      ] },
      { kind: 'puzzle', puzzle: 'strongbox', text: 'Open Haskett\'s strongbox', gives: [["Foreman's Record", 1]],
        where: 'The strongbox is bolted down by Haskett\'s door, next to Dunn\'s fire at the camp.',
        lines: ['The dial turns. Something inside clicks.', 'Inside, Haskett\'s record, and nothing else.'] },
    ],
    reward: { gold: 800 } },
  { id: 'ff10', name: 'The Green Vein', chain: 'founding', giver: null, after: ['ff09'],
    summary: 'Haskett barred the Green Vein. His record says whoever opened his box has his leave, and that he went in.',
    steps: [
      V('cave_green_vein', 'Go into the Green Vein', 'The Green Vein is the timbered drift behind the miners\' camp, in the far north-west corner of Stonepeak.'),
      { kind: 'all', text: 'Follow Haskett\'s trail', where: 'Emerald wants a Gold pickaxe: there\'s one in the prospector\'s chest, at the back. Haskett\'s note is by the green pool.', parts: [
        { kind: 'do', on: 'mine', item: 'Emerald', n: 3, text: 'Break three emerald seams', at: { map: 'cave_green_vein' } },
        C('foreman_note', 'The Green Vein', 'Find what Haskett left', ['Pinned under a stone by the green pool, a note in Haskett\'s hand.'],
          { gives: [["Haskett's Note", 1]], hidden: true }),
      ] },
    ],
    reward: { gold: 1000 } },
  { id: 'ff11', name: 'The Lever Handle', chain: 'founding', giver: 'bram', after: ['ff10'],
    summary: 'Haskett\'s note says the lever in the Gloom has lost its handle, and that Bram\'s father made the first.',
    steps: [
      T('bram', 'Ask Bram about the handle', ['Well? What needs making?', { you: ['A lever handle.', 'Read this note.'] },
        'Show me. That\'s Haskett\'s hand. And that\'s my father\'s name.',
        'I remember the drawings. Emeralds set in iron, so the handle wouldn\'t rust down there in the wet.',
        'I can make another. Three Emeralds, fifteen Copper Ore for the fittings, and fifteen thousand Gold for the iron and my time.', { you: ['That\'s a lot.', 'Deal.'] },
        'Good work costs. Leave me Haskett\'s note as well. I\'ll want his measurements.'],
      { where: 'The Forge is just east of the town square, on the north side of the east road.' }),
      { kind: 'deliver', npc: 'bram', text: 'Bring Bram what he asks', items: [{ item: 'Emerald', n: 3 }, { item: 'Copper Ore', n: 15 }, { item: 'gold', n: 15000 }, { item: "Haskett's Note", n: 1 }],
        where: 'Emeralds come from the Green Vein, Copper Ore from the Old Working. Gold comes from selling crops, fish and ore.',
        ask: ['Got everything? Put it on the bench.', { you: ['It\'s all here.'] }], missing: 'Not yet? Three emeralds, fifteen copper, the Gold and the note. Then I start.',
        lines: ['Here. Heavier than it looks.', 'Mind your fingers when you pull it. That\'s advice from a man with nine.'], gives: [['Lever Handle', 1]] },
    ] },
  { id: 'ff12', name: 'The Lever in the Dark', chain: 'founding', giver: null, after: ['ff11'],
    summary: 'The lever is in the Gloom, three levels down. Haskett called it the red deep.',
    steps: [
      V('cave_gloom', 'Go into the Gloom', 'The Gloom is at the far north end of the gorge that runs up the middle of Stonepeak. Haskett left its portcullis up.'),
      V('cave_gloom_3', 'Go down to the red deep', 'In the Gloom, take the stair in the north-east down to the drowned halls, then the stair in their far south-east down again.'),
      C('gloom_lever', 'The red deep', 'Fit the handle to the lever', ['Tucked behind a rock, out of the way, a lever with no handle.', 'Bram\'s handle fits. You pull. Somewhere above, stone scrapes on stone.',
        'In the gap it opened, a carving: four hooded watchers round a court, and a cart.', 'Under it: "The key went with the last cart. The watcher with its number keeps it."'],
        { needs: [['Lever Handle', 1]], hidden: true, where: 'In the red deep, on the east wall. It\'s tucked behind a rock, out of the way.' }),
    ],
    reward: { items: [['tool:sword', 1, { rarity: 'rare' }]] } },
  { id: 'ff13', name: 'The Last Cart', chain: 'founding', giver: null, after: ['ff12'],
    summary: '"The key went with the last cart. The watcher with its number keeps it." The quarry sent carts east to the compound on the delvers\' last day. Not all of them got there.',
    steps: [
      { kind: 'all', text: 'Find which cart never arrived', where: 'The quarry is the open pit in the middle of Stonepeak. The gate book is by the gargoyle at the compound\'s gate. The ruts run up the gorge.', parts: [
        C('quarry_log', 'The Quarry', 'Read the quarry\'s loading log', ['The loading log, nailed to the gantry. The last day\'s page:', 'Carts {carts}, all sent east to the compound.'], { area: 'The Quarry' }),
        C('compound_ledger', 'The Ruined Compound', 'Read the compound\'s gate book', ['The gate book, chained by the gargoyle. The last day\'s arrivals:', 'Carts {arrived}.'], { area: 'The Ruined Compound' }),
        C('gorge_ruts', 'The Gorge', 'Follow the ruts in the gorge', ['Cart ruts, cut deep into the gorge floor.', 'One set turns away from the compound and climbs toward the delvers\' court.'], { area: 'The Gorge' }),
      ] },
      { kind: 'puzzle', puzzle: 'watchers', text: 'Search the right watcher', area: 'The Delvers\' Court', gives: [["Delvers' Key", 1]],
        where: 'The Delvers\' Court is the stone yard in the north-east, up the steps from the High Shelf. Four hooded watchers stand in it.',
        lines: ['Its hands are cupped. In them, black with age: a heavy key.'] },
    ],
    reward: { gold: 1500 } },
  { id: 'ff14', name: 'The Sunken Vault', chain: 'founding', giver: null, after: ['ff13'],
    summary: 'The Delvers\' Key opens the Sunken Vault, under their court.',
    steps: [
      V('cave_vault', 'Open the Sunken Vault', 'The Sunken Vault is east of the Delvers\' Court, at the far edge of the High Shelf. The key opens it now.'),
      V('cave_vault_2', 'Go down to the treasury', 'Take the stair down at the back of the vault.'),
      C('vault_record', 'The delvers\' treasury', 'Search the treasury', ['In a corner of the treasury, a book in a lead case, dry after all this time.', 'Tucked inside its back cover, a torn piece of map.'],
        { gives: [["Delvers' Record", 1], ['Map Piece II', 1]], hidden: true, where: 'Search the treasury\'s corners. The delvers didn\'t leave their record in the middle of the room.' }),
    ],
    reward: { items: [['tool:pickaxe', 1, { tier: 4 }], ['tool:bow', 1, { rarity: 'epic' }]] } },

  /* ---------------------------------------------------------------- ACT III: THE LAKE REMEMBERS */
  { id: 'ff15', name: 'Two More Pieces', chain: 'founding', giver: 'maren', after: ['ff14'],
    summary: 'The delvers\' record says the Founders tore their map in four. You have two of the pieces.',
    steps: [
      T('maren', 'Show Maren the delvers\' record', ['You\'re back. And you\'ve been underground, by the look of you. Here, have some tea.', { you: ['Read this.', 'I found another.'] },
        'The delvers\' record. So they took something from the lake, and the Founders hid what they knew.',
        'Two pieces of their map. The other two could be anywhere by now.', { you: ['Any ideas?', 'Where do I look?'] },
        'Nixie has lived in our river longer than any of us, and she keeps every shiny thing it brings her. Try the pond, below the Market Hall.',
        'And the delvers\' last dig was the Old Cave, up on the ridge across Moonmere.'],
      { where: 'Maren\'s house is on the west bank of the river, north of the bridge.' }),
      T('nixie', 'Ask Nixie about the map', ['Ooh, you want to ask me something. Is it about the river? I know everything about the river.', { you: ['A torn old map.', 'Found any paper?'] },
        'Old paper, torn at the edges? Yes! I have a piece like that. It floated down the river years and years ago.', 'It\'s pretty. I keep all the pretty things the river brings me.',
        { you: ['Can I have it?', 'Would you trade?'] }, 'Only for something prettier. A Golden Fish! They swim in our river, but they almost never bite.'],
      { where: 'Nixie visits the pond in the south-east corner of town, below the Market Hall.' }),
      { kind: 'deliver', npc: 'nixie', text: 'Bring Nixie a Golden Fish', items: [{ item: 'Golden Fish', n: 1 }],
        where: 'Golden Fish swim only in the river, in town or off your island, and they rarely bite. Keep casting.',
        ask: ['Is that... is that gold? Show me, show me!', { you: ['It\'s all yours.'] }], missing: 'No gold yet? Keep fishing! They do bite. Sometimes. Hardly ever.',
        lines: ['Oh, look at it shine!', 'Here. It\'s only paper to me.'], gives: [['Map Piece III', 1]] },
      V('cave_old_cave', 'Go into the Old Cave', 'Moonmere is up a north road from town. The Old Cave is the dark mouth in the cliff on its north-east ridge. It needs a Bronze pickaxe.'),
      C('old_cave_fragment', 'The Old Cave', 'Search the delvers\' last dig', ['In a dry corner, far from the water, a scrap of old paper rolled tight.', 'It is the last corner of the map.'],
        { gives: [['Map Piece IV', 1]], hidden: true, where: 'Inside the Old Cave, away from the water, in the far north-west corner.' }),
      { kind: 'deliver', npc: 'maren', text: 'Bring Maren the four pieces', items: [{ item: 'Map Piece I', n: 1 }, { item: 'Map Piece II', n: 1 }, { item: 'Map Piece III', n: 1 }, { item: 'Map Piece IV', n: 1 }],
        where: 'Maren\'s house is on the west bank of the river, north of the bridge.',
        ask: ['Four pieces? Let me clear the table.', { you: ['Here they are.'] }], missing: 'Still missing some? Nixie had one, and the Old Cave the other.',
        lines: ['Let me see. This edge, and this one. Yes, they fit.', 'It\'s Moonmere, drawn by hand, and a small X.',
          'Here. Glued, not pretty. Read it carefully. I don\'t think they\'d have made it easy.'], gives: [["Founders' Map", 1]] },
    ],
    reward: { gold: 1500 } },
  { id: 'ff16', name: 'The Founders\' Map', chain: 'founding', giver: null, after: ['ff15'],
    summary: 'The Founders\' Map shows Moonmere and an X. Read it and find the place yourself.',
    steps: [
      C('founders_cache', 'Moonmere', 'Find the X on the map', ['Half buried where the map said: an iron chest, the mark on its lid.', 'It\'s rusted shut. You won\'t open it by hand.'],
        { variant: 'spot', hidden: true, where: 'Nobody can show you this one. Hold the Founders\' Map and press Space to read it, then go to Moonmere and dig where the X is.' }),
      T('bram', 'Ask Bram about the chest', ['Back again, {name}? What have you broken this time?', { you: ['A rusted chest.', 'I need a bar.'] },
        'Rusted shut? Iron that old goes like stone. You\'ll snap anything ordinary.', 'I\'d need a bar that won\'t bend. Gold Ore makes the only kind I trust.',
        'Five Gold Ore, and five thousand Gold for the forge. The Sunken Vault is full of ore, if your pick can take it.'],
      { where: 'The Forge is just east of the town square, on the north side of the east road.' }),
      { kind: 'deliver', npc: 'bram', text: 'Bring Bram Gold Ore and 5,000 Gold', items: [{ item: 'Gold Ore', n: 5 }, { item: 'gold', n: 5000 }],
        where: 'Gold Ore is in the rock of the Sunken Vault\'s treasury, and it wants an Amethyst pickaxe. Bram is at the Forge.',
        ask: ['Gold Ore? Let\'s have it, then.', { you: ['Here.'] }], missing: 'Five Gold Ore and the Gold, remember. The vault\'s treasury is full of ore.',
        lines: ['Here. Put your weight on it, not your back.'], gives: [['Pry Bar', 1]] },
      C('founders_cache', 'Moonmere', 'Open the Founders\' chest', ['The bar bites. The lid gives with a groan.', 'Inside, dry as the day it was shut: a letter, and a round seal with the mark.'],
        { needs: [['Pry Bar', 1]], variant: 'spot', gives: [["Founders' Letter", 1], ["Founders' Seal", 1]], hidden: true,
          where: 'Go back to the chest at the X on your map, at Moonmere, with the pry bar.' }),
    ],
    reward: { gold: 2000 } },
  { id: 'ff17', name: 'The Lake Remembers', chain: 'founding', giver: 'marven', after: ['ff16'],
    summary: 'The Founders\' letter talks about someone at the lake they brought gifts to every year. Moonmere might tell you more.',
    steps: [
      { kind: 'all', need: 3, text: 'Look at Moonmere\'s old things', where: 'The Tide Stone by Marven\'s pool, a bottle in Driftwood Cove, a sunken boat, the houseboat on the east shore, a stump in Glowcap Hollow.', parts: [
        C('tide_stone', 'The Tide Stone', 'The Tide Stone', ['Lines cut into the stone, where the water used to reach.', 'Near the top, very small, the mark.']),
        C('bottle', 'A message in a bottle', 'The message in a bottle', ['The paper is mostly gone.', 'What is left: "...gave back the pearl, and the lake gave back..."']),
        C('sunken_boat', 'A sunken boat', 'The sunken boat', ['An old boat, sunk to the rails. The same grey wood as the plank on the riverbank.', 'The mark on the bow.']),
        C('houseboat', 'The houseboat', 'The houseboat', ['Nobody home. A chart pinned to the wall shows the lake, with a pool marked in the west.', 'Someone wrote beside it: "Ask her."']),
        C('glowing_stump', 'A glowing stump', 'The glowing stump', ['The stump glows faintly blue.', 'Someone carved the mark into it long ago, and the wood has healed round the cut.']),
      ] },
      T('marven', 'Find the one beneath the water', ['You\'re carrying something of the Founders\'. I can tell from here.', { you: ['Who are you?', 'I found a letter.'] },
        'I\'m the one they wrote about. They brought me gifts. The delvers took my pearl.',
        'You\'ve followed their marks all the way up here, {name}. Nobody has done that in a long time.',
        'Most people find one of those marks and forget about it. You kept going.', { you: ['What happens now?', 'Can I help?'] },
        'There\'s one more thing I\'d ask of you. Stay a moment and I\'ll tell you.'],
      { where: 'Marven\'s pool is up the stone stairs in the north-west of Moonmere, on the teal shelf.' }),
    ],
    reward: { gold: 2000 } },
  { id: 'ff18', name: 'Marven\'s Request', chain: 'founding', giver: 'marven', after: ['ff17'], founding: true,
    summary: 'Marven wants what the Founders brought her every year, and what the delvers took.',
    steps: [
      T('marven', 'Hear what Marven asks for', ['Every autumn the Founders came up here and brought me food. It was how they said thank you.',
        { you: ['Like what?', 'Go on.'] },
        'A Star Fruit from their own seed. A Ghost Catfish from my water, caught under the moon. A bowl of the stew their letter tells you how to make.',
        'Five Wheat, five Cabbages and five Corn from their fields. Two Rubies from the Gloom, for what the delvers cut. And their Seal.',
        'And my pearl. The delvers took it into the Old Cave across the water. It\'s still in there. I\'d know if it had gone.',
        { you: ['I\'ll bring it.', 'That\'s a lot.'] }, 'No hurry. I\'ve waited this long.'],
      { where: 'Marven\'s pool is up the stone stairs in the north-west of Moonmere, on the teal shelf.' }),
      C('old_cave_pearl', 'The Old Cave', 'Find Marven\'s pearl', ['In the shallows at the far end, something pale catches the light.', 'A pearl. It still glows faintly when you cover it with your hand.'],
        { gives: [['Moon Pearl', 1]], hidden: true, where: 'In the Old Cave, in the shallows at the far end, north of the way in.' }),
      { kind: 'deliver', npc: 'marven', text: 'Bring Marven everything', items: [
        { item: 'Star Fruit', n: 1, grown: true }, { item: 'Ghost Catfish', n: 1, caughtAt: 'lake' }, { item: 'Moonlight Stew', n: 1, cooked: true },
        { item: 'Wheat', n: 5, grown: true }, { item: 'Cabbage', n: 5, grown: true }, { item: 'Corn', n: 5, grown: true },
        { item: 'Ruby', n: 2 }, { item: "Founders' Seal", n: 1 }, { item: 'Moon Pearl', n: 1 }],
        where: 'Star Fruit: the moonstone\'s seeds, Farming level 10. Ghost Catfish: Moonmere, at night. Rubies: the Gloom\'s red deep. Cook at any stove.',
        ask: ['You have everything? Then let me see.', { you: ['It\'s all here.'] }], missing: 'Not all of it yet. That\'s all right. Bring it when you have it.',
        lines: ['That\'s all of it. Every last thing.', 'My pearl, too. I\'d almost stopped expecting it.',
          'You came out of that river with nothing, {name}. Look at you now.',
          'The Founders kept a roll of their names. There\'s room on it for one more.', 'Here. Your name is on it now.'] },
    ],
    reward: { items: [['Founding Farmers Scroll', 1]] } },

  /* ---------------------------------------------------------------- SIDE QUESTS */
  { id: 's_marlow', name: 'A Small Patch of Land', chain: 'side', giver: 'marlow', after: ['q07'],
    summary: 'Marlow has taken on a patch by the greenhouse and wants to see it earn its keep.',
    steps: [
      T('marlow', 'Talk to Marlow', ['{name}! Just the person. Have you got a minute?', { you: ['What\'s up?', 'Sure.'] },
        'I\'ve taken on a patch of the fields by the greenhouse. Trouble is, I can\'t bend like I used to.',
        'Grow three of anything there and bring them over. I\'ll pay what the store would.'],
      { where: 'Marlow\'s house is west of the river, south of the main road, near the allotments.' }),
      D('harvest', 'Harvest three crops', { n: 3, at: TOWN_FIELD, where: 'The fields are north of the town square, by the glass greenhouse.' }),
      { kind: 'deliver', npc: 'marlow', text: 'Bring Marlow three crops', items: [{ item: 'crop:*', n: 3 }],
        where: 'Marlow\'s house is west of the river, south of the main road.',
        ask: ['Is that from the patch? Let\'s see.', { you: ['Fresh today.'] }], missing: 'Nothing yet? It\'ll come. Soil\'s like me. Slow, but it gets there.',
        lines: ['That\'s a fair bit of work.', 'I knew that patch had it in it. Here you are.'] },
    ],
    reward: { gold: 150 } },
  { id: 's_hollis', name: 'One Wandered Off', chain: 'side', giver: 'hollis', after: ['q07'],
    summary: 'One of Hollis\'s hens has gone missing again.',
    steps: [
      T('hollis', 'Talk to Hollis', ['Actually, {name}, you haven\'t seen a hen, have you?', { you: ['A hen?', 'Lost one?'] },
        'One of mine wandered off again. A pale gold hen. She likes the orchard. She thinks nobody knows.'],
      { where: 'Hollis is on the east edge of town, south of the east road, by the houses there.' }),
      C('stray_hen', 'The orchard', 'Find the pale gold hen', ['There she is, under the trees, pretending not to see you.', 'She follows you once she decides it was her idea.'],
        { area: 'The orchard', where: 'The orchard is at the north edge of town, above the mill. Look under the cherry trees.' }),
      T('hollis', 'Tell Hollis where she was', ['Any luck?', { you: ['The orchard.', 'Found her.'] }, 'The orchard. Of course it was.', 'Thank you. She\'s the clever one. Don\'t tell the others.'],
      { where: 'Hollis is on the east edge of town, south of the east road.' }),
    ],
    reward: { gold: 120 } },
  { id: 's_wren', name: 'The One That Got Away', chain: 'side', giver: 'wren', after: ['q07'],
    summary: 'Wren remembers a fish nobody has seen in years.',
    steps: [
      T('wren', 'Talk to Wren', ['Got a minute? Sit. I want to tell you about a fish.', { you: ['A fish?', 'Go on.'] },
        'Tiger Trout. Striped, and it fights like it owes you money. I haven\'t seen one in years.', 'If you ever catch one, I\'d like to see it.'],
      { where: 'Wren\'s cottage is on the east bank of the river, down by the south jetties.' }),
      { kind: 'deliver', npc: 'wren', text: 'Show Wren a Tiger Trout', items: [{ item: 'Tiger Trout', n: 1 }], where: 'Tiger Trout are rare, but they bite anywhere with fish in it. Wren is at her cottage.',
        ask: ['Is that... stripes? Let me see.', { you: ['Look at this.'] }], missing: 'No Tiger Trout yet? Don\'t worry. Nobody\'s caught one in years.',
        lines: ['Would you look at that.', 'Still out there, then. Good. That\'s good.'] },
    ],
    reward: { gold: 400 } },
  { id: 's_juniper', name: 'From Whisperwood', chain: 'side', giver: 'juniper', after: ['q07'],
    summary: 'Juniper is running low on Silvercaps, and they only grow out in the wood.',
    steps: [
      T('juniper', 'Talk to Juniper', ['Are your legs any good, {name}? I need someone with good legs.', { you: ['What for?', 'They\'re fine.'] },
        'Silvercaps. The small pale blue mushrooms in Whisperwood. Mushroom Hollow, in the far west, is full of them.',
        'Mind the myconids out there. They don\'t like being picked either.'],
      { where: 'The Apothecary is the teal-roofed house on the far west side of town, north of the main road.' }),
      { kind: 'deliver', npc: 'juniper', text: 'Bring Juniper two Silvercaps', items: [{ item: 'Silvercap Mushroom', n: 2 }],
        where: 'Silvercaps are the small pale blue mushrooms, thickest in Mushroom Hollow in the far west of Whisperwood.',
        ask: ['Did you find some? Still cold?', { you: ['Here you are.'] }], missing: 'Two Silvercaps, please. Small, pale blue. Not the red ones.',
        lines: ['Perfect. Still cold.', 'That\'ll keep the shelves full a while.'] },
    ],
    reward: { gold: 400 } },
  { id: 's_bram', name: 'Ore for the Forge', chain: 'side', giver: 'bram', after: ['q07'],
    summary: 'Bram wants copper from the mountain.',
    steps: [
      T('bram', 'Talk to Bram', ['Afternoon. You look like you could swing a pick.', { you: ['I could.', 'Need something?'] },
        'Bring me ore from Stonepeak. Five copper will do.', 'The Old Working has plenty, if you don\'t mind the dark.'],
      { where: 'The Forge is just east of the town square, on the north side of the east road.' }),
      { kind: 'deliver', npc: 'bram', text: 'Bring Bram five Copper Ore', items: [{ item: 'Copper Ore', n: 5 }],
        where: 'Copper seams are the orange-flecked rocks in the Old Working at Stonepeak, east of town.',
        ask: ['Copper? Put it here.', { you: ['Five, as asked.'] }], missing: 'Five copper. The Old Working, at Stonepeak. You can\'t miss it.',
        lines: ['Good ore.', 'Here, for your trouble. Save it up and I\'ll make you a proper pick one day.'] },
    ],
    reward: { gold: 200 } },
  { id: 's_tamsin', name: 'Fresh for the Bakery', chain: 'side', giver: 'tamsin', after: ['q07t'],
    summary: 'Tamsin needs fresh ingredients for the week\'s baking.',
    steps: [
      T('tamsin', 'Talk to Tamsin', ['{name}! You\'re a farmer now, aren\'t you? A proper one?', { you: ['I\'m trying.', 'Why?'] },
        'I need fresh vegetables for the week. Four carrots and two parsnips.', 'Grown, mind. Not bought. I can always tell.'],
      { where: 'The Bakery is on the west bank, right by the bridge.' }),
      { kind: 'deliver', npc: 'tamsin', text: 'Bring Tamsin her vegetables', items: [{ item: 'Carrot', n: 4, grown: true }, { item: 'Parsnip', n: 2, grown: true }],
        where: 'Hazel sells carrot and parsnip seeds. Grow them yourself, then take them to the Bakery.',
        ask: ['Oh, are those for me? Let me see.', { you: ['Freshly pulled.'] }], missing: 'Four carrots, two parsnips, and grown by you. I\'ll know.',
        lines: ['Lovely.', 'Come by tomorrow and there\'ll be soup.'] },
    ],
    reward: { gold: 400 } },
  { id: 's_pell', name: 'Timber for the Bridge', chain: 'side', giver: 'pell', after: ['q07'],
    summary: 'Two planks are gone from the footbridge, and Pell needs timber to fix it.',
    steps: [
      T('pell', 'Talk to Pell', ['Hang on. Can you swing an axe?', { you: ['I can.', 'What\'s broken?'] },
        'The footbridge over the river. Two planks gone, and Mabel nearly went in yesterday.', 'Ten wood and I can have it sound by the end of the week.'],
      { where: 'The Carpenter\'s workshop is on the east road, past the Forge.' }),
      { kind: 'deliver', npc: 'pell', text: 'Bring Pell ten Wood', items: [{ item: 'Wood', n: 10 }], where: 'Chop any tree with the axe. Pell is at his workshop on the east road.',
        ask: ['Got the wood?', { you: ['Ten, as asked.'] }], missing: 'Ten wood. Any tree will do. Well, not the orchard. Dara would kill me.',
        lines: ['That\'s the one.', 'Mind how you go on the bridge till I\'m done.'] },
    ],
    reward: { gold: 350 } },
  { id: 's_hazel', name: 'Unusual Seeds', chain: 'side', giver: 'hazel', after: ['q07'],
    summary: 'Hazel has heard about a wild plant out in Whisperwood that nobody here has ever grown.',
    steps: [
      T('hazel', 'Talk to Hazel', ['Oh, {name}! Can I ask you something? It\'s a bit silly.', { you: ['Go on.', 'Silly how?'] },
        'Someone told me there\'s a plant growing wild out in Whisperwood that nobody here has ever planted.', 'In Bramble Meadow, they said. Would you bring me some of its seeds?'],
      { where: 'The Seed & Tool shop is just east of the town square, on the north side of the east road.' }),
      C('wild_seeds', 'Bramble Meadow', 'Find seeds in Bramble Meadow', ['Among the brambles, a plant you don\'t know, gone to seed.', 'You shake a handful into your palm.'],
        { gives: [['Wild Seeds', 1]], area: 'Bramble Meadow', where: 'Bramble Meadow is the wide meadow in the south-east of Whisperwood, south of the lodge.' }),
      { kind: 'deliver', npc: 'hazel', text: 'Bring Hazel the wild seeds', items: [{ item: 'Wild Seeds', n: 1 }], where: 'Hazel is at the Seed & Tool shop, just east of the square.',
        ask: ['Did you find them? Oh, let me see!', { you: ['Here they are.'] }], missing: 'Nothing yet? Bramble Meadow, in the south-east of the wood.',
        lines: ['Oh, these are good. These are really good.', 'Keep a few. Plant them somewhere sunny.'] },
    ],
    reward: { gold: 250, items: [['seed:13', 3]] } },
];

/**
 * THE FIELD WORK (the designer, 2026-10-01: "every quest should also have a side quest to grow some crops... it doesn't
 * increase the time of the quest completion, but it does require players to have more energy"). Beside every chapter
 * of the Founding Farmers but the last (Marven's request is a harvest of its own), a crop to grow and harvest: it
 * begins with its chapter and may be done any time in its act -- the next act waits for the act's field work (chapter
 * 8 for the first seven, 15 for the next seven, 18 for the last three), so the crops grow while the story goes on and
 * one trip to the fields harvests for several. Done in order they take a farmer from Farming 1 to 10, the Star Fruit's
 * level, on about 120 harvests: a seed planted and a crop cut each (rules.js COST). A task counts its own crop and no other
 * (2026-10-04, the designer: "any crop a player grows is getting counted" -- any crop once counted where the farmer's
 * Farming could not buy the task's seeds yet): a farmer short of a task's seeds grows other crops first, and every
 * harvest raises Farming. One already past a chapter when this came in never gets its field work (`late`). No reward: the
 * crops are the farmer's to sell.
 *   [chapter, crop, how many, the crop's plural, name, summary]
 */
const FIELD_WORK = [
  [1, 'Parsnip', 6, 'Parsnips', 'Something in the Ground', 'Marlow says a farmer should always have something growing, whatever else is going on. Start with parsnips.'],
  [2, 'Spring Onion', 6, 'Spring Onions', 'Spring Onions', 'Wren cooks fish with spring onions, and the patch behind the cottage has gone to seed.'],
  [3, 'Wheat', 6, 'Wheat', 'Grist for the Mill', 'Hugo\'s mill is standing still. He needs wheat to grind.'],
  [4, 'Potato', 6, 'Potatoes', 'Potatoes for the Pies', 'Tamsin is short of potatoes for her pies.'],
  [5, 'Cabbage', 6, 'Cabbages', 'Something Green', 'Rowan says the Market Hall has had no greens all week.'],
  [6, 'Onion', 8, 'Onions', 'Onions for the Winter', 'Mabel says every kitchen needs onions hung up before the cold comes.'],
  [7, 'Wheat', 8, 'Wheat', 'A Second Sheaf', 'Hugo is grinding again and wants more wheat.'],
  [8, 'Rice', 8, 'Rice', 'Rice for the Camp', 'The miners at Stonepeak live on rice, and Dunn says the camp\'s store is nearly empty.'],
  [9, 'Broccoli', 6, 'Broccoli', 'Greens for the Miners', 'Dunn says his miners haven\'t seen a green vegetable in weeks.'],
  [10, 'Marigold', 6, 'Marigolds', 'Marigolds for Juniper', 'Juniper makes a salve from marigolds for the miners\' hands.'],
  [11, 'Corn', 6, 'Corn', 'Corn for the Winch', 'The winch team works hungry. Corn keeps them going.'],
  [12, 'Sunflower', 6, 'Sunflowers', 'Sunflowers', 'Juniper presses sunflower seeds for oil and has run out.'],
  [13, 'Tomato', 6, 'Tomatoes', 'Tomatoes for Tamsin', 'Tamsin is making a sauce and wants tomatoes.'],
  [14, 'Cucumber', 8, 'Cucumbers', 'Something Cool', 'It is hot on the deep levels. The miners want cucumbers.'],
  [15, 'Green Beans', 10, 'Green Beans', 'Beans for the Market', 'Rowan says the Market Hall can never get enough beans.'],
  [16, 'Adzuki Bean', 10, 'Adzuki Beans', 'Red Beans', 'Tamsin bakes red bean buns for the autumn fair.'],
  [17, 'Eggplant', 10, 'Eggplants', 'The Founders\' Fields', 'The Founders grew more than Star Fruit. Their fields were full. Fill yours.'],
];
const HERB_SELLER = new Set(['Marigold', 'Sunflower']);              // (the Apothecary's seeds: catalog.js HERBS)
for (const [n, crop, count, plural, name, summary] of FIELD_WORK) {
  const ch = `ff${String(n).padStart(2, '0')}`, gate = n <= 7 ? 8 : n <= 14 ? 15 : 18;
  const story = QUESTS.find((q) => q.id === ch), next = QUESTS.find((q) => q.id === `ff${String(gate).padStart(2, '0')}`);
  const id = `fg${String(n).padStart(2, '0')}`;
  QUESTS.push({ id, name, chain: 'fields', of: ch, giver: null, after: [...story.after], late: `ff${String(n + 1).padStart(2, '0')}`, summary,
    steps: [{ kind: 'do', on: 'harvest', item: crop, n: count, grow: true, text: `Grow and harvest ${count} ${plural}`, at: TOWN_FIELD,
      where: `Seeds: ${HERB_SELLER.has(crop) ? 'Juniper\'s Apothecary' : 'Hazel\'s Seed & Tool shop'}. Plant them by the greenhouse in town, or at home. Needed before chapter ${gate}. Seeds locked? Raise Farming.` }] });
  next.after.push(id);
}
/** EVERY CHAPTER OF THE FOUNDING FARMERS pays Shards too (the designer, 2026-09-30: 10 a chapter, 180 in all). */
export const CHAPTER_SHARDS = 10;
for (const q of QUESTS) if (q.chain === 'founding') q.reward = { ...(q.reward ?? {}), shards: CHAPTER_SHARDS };
export const QUEST = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
/**
 * RETIRED AT THE RELAUNCH (the designer, 2026-10-10: the Founding Farmers story "was for the whitelist"; it ends with
 * the playtest): its chapters and their field work never start for a farm of Season 0 -- one the relaunch reset made
 * (server/reset.js marks it `season0`) or begun after it (server/world2.js). A farm from before keeps them until then.
 */
export const RETIRED = new Set(['founding', 'fields']);
const retired = (save, q) => !!save?.season0 && RETIRED.has(q.chain);
/** A new player's quest line begins with q01; the start of play waits on it (server/world2.js, the game's opening). */
export const FIRST = 'q01';
/** A farmer from before the quests (2026-09-26): the opening is theirs already -- their tools, their name, a farm
 *  of their own -- so it is marked done (skipped) and the town's introduction begins. */
export function skipOpening(save, now) {
  const R = records(save);
  for (const id of ['q01', 'q02', 'q03', 'q04']) R[id] ??= { step: QUEST[id].steps.length, at: now, parts: [], n: 0, done: now, skipped: true };
  startReady(save, now);
}
/** Where a new player wakes: in Marlow's house, until the first talk is done (then a visit starts at home). */
export const OPENING = { map: 'interior_home', until: FIRST };

/** What a locked door says (rules.js lockedBecause): the chapter that opens it. */
export const LOCK_HINTS = {
  ff09: 'The Green Vein is barred with timber. Only the old foreman could give leave to open it.',
  ff10: 'The portcullis is down, and it won\'t budge.',
  ff13: "The vault's gate won't lift. The carvings on it show a key.",
  q04: 'Marlow wants a word before you go.',
  ff06: 'Something under the bank. You would have to know where to look.',
};
useLockHints(LOCK_HINTS);

/* ================================================================================ each player's own puzzles */
// THE DESIGNER, 2026-09-26: a shared answer must be useless. The stone verse, the strongbox's numbers, the carts and
// the watchers, the map's X are drawn from the player's account AND a salt only the server holds (world2.js,
// data/v2/quest-salt.txt): the game in the browser never knows them. It sees a secret only in words the server
// has let it read (quest.inspect, quest.read), and it asks the server to judge an answer (quest.touch/answer).

const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
function rand(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffled = (list, r) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** The Moonstone Circle's six stones, stone by stone (zones tagged puzzle:circle:<k>): what is carved on each. */
export const STONES = ['heron', 'fox', 'owl', 'stag', 'hare', 'boar'];
/** The song names each beast by a riddle, not by name (a player's own pick of three for each: secretsOf .riddle). */
export const RIDDLES = {
  heron: ['the grey fisher who never needs a rod', 'the one who stands all day on one leg in the shallows', 'the long-legged one who spears his supper'],
  fox: ['the red thief with the white-tipped tail', 'the one who wears the autumn all year round', 'the sly one who laughs in the henhouse'],
  owl: ['the one who asks "who?" all night and never waits for an answer', 'the one who turns its head where others turn their bodies', 'the one who hunts the dark without a sound'],
  stag: ['the king of the glade, who drops his crown each spring', 'the one who wears a crown of bone', 'the proud one who fights with branches on his head'],
  hare: ['the long-eared runner who boxes in the spring', 'the one who flies across the field without wings', 'the quick one who sleeps in a scrape of grass'],
  boar: ['the tusked one who ploughs the wood without a plough', 'the bristled digger under the oaks', 'the grunting one who roots for acorns'],
};
/** Where the Founders' chest may be (zones tagged var:spot:<k>, and the map's four drawings). */
export const SPOTS = 4;
/** A player's secrets: { order (the stones, in the verse's order), code (four numbers), carts, arrived, missing,
 *  watchers (the number on each watcher's plinth), right (the watcher that keeps the key), spot }. */
export function secretsOf(playerId, salt) {
  const r = rand(fnv(`${salt ?? ''}|${playerId}|founding-farmers-2`));
  const order = shuffled([0, 1, 2, 3, 4, 5], r);
  const code = [0, 1, 2, 3].map(() => 1 + Math.floor(r() * 9));
  const carts = shuffled(Array.from({ length: 39 }, (_, i) => i + 11), r).slice(0, 5);
  const missing = carts[Math.floor(r() * 5)], arrived = shuffled(carts.filter((c) => c !== missing), r);
  const watchers = shuffled([missing, ...arrived.slice(0, 3)], r);
  const spot = Math.floor(r() * SPOTS);
  // (drawn last, so the answers above are the same as before the riddles came)
  const riddle = STONES.map(() => Math.floor(r() * 3));
  return { order, code, carts, missing, arrived, watchers, right: watchers.indexOf(missing), spot, riddle };
}
/** Words with a player's secrets written in: {verse.1}-{verse.6} (the beasts by name), {riddle.1}-{riddle.6} (by
 *  riddle), {code.1}-{code.4}, {watcher.1}-{watcher.4}, {carts}, {arrived}. (The server's only: see above.) */
export function fillSecrets(text, sec) {
  const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : String(a[0]));
  return String(text).replace(/\{(verse|riddle|code|watcher)\.(\d)\}|\{(carts|arrived)\}/g, (m, k, n, w) => {
    if (w === 'carts') return list(sec.carts);
    if (w === 'arrived') return list(sec.arrived);
    const i = +n - 1;
    if (k === 'verse') return STONES[sec.order[i]];
    if (k === 'riddle') { const beast = STONES[sec.order[i]]; return RIDDLES[beast][sec.riddle?.[sec.order[i]] ?? 0]; }
    if (k === 'code') return String(sec.code[i]);
    return String(sec.watchers[i]);
  });
}
/**
 * THE PUZZLES: zones tagged puzzle:<name>:<k> (a stone, a watcher) or puzzle:<name> (the strongbox).
 *   order  press them in the player's order (a wrong one and they all go back to sleep)
 *   code   the player's four numbers (three tries, then the dial jams for a while)
 *   pick   the one that is right (a wrong one and the court will not be searched for a while)
 */
export const PUZZLES = {
  circle: { kind: 'order', size: 6, wrong: 'The stones go quiet. Whatever you woke has gone back to sleep.' },
  strongbox: { kind: 'code', digits: 4, tries: 3, lockMinutes: 15, wrong: 'The dial clicks, and nothing opens.', jammed: 'The dial has jammed. It will loosen in time.' },
  watchers: { kind: 'pick', lockMinutes: 30, wrong: 'Its hands are empty. A cold draught moves through the court, and the watchers go still.' },
};
/** The puzzle step (or part) a player is on for `puzzle`, if any: { q, part, s }. */
export function puzzleFor(save, puzzle) {
  for (const q of QUESTS) {
    const rec = activeOf(save, q.id); if (!rec || rec.ready) continue;
    const s = stepOf(q, rec); if (!s) continue;
    if (s.kind === 'puzzle' && s.puzzle === puzzle) return { q, part: -1, s };
  }
  return null;
}
/** Minutes left before a puzzle may be tried again (0: now). */
export const lockLeft = (save, puzzle, now) => Math.max(0, Math.ceil(((save?.puz?.[puzzle]?.until ?? 0) - now) / 60e3));

/* ================================================================================ where a player stands */

/** The player's quest records (made when first asked for). */
export const records = (save) => (save.quests ??= {});
export const isDone = (save, id) => !!save?.quests?.[id]?.done;
/** A quest in progress: its record, else null. */
export const activeOf = (save, id) => { const r = save?.quests?.[id]; return r && !r.done ? r : null; };
/** Has `id` reached step `n` (or finished)? */
export const reached = (save, id, n) => isDone(save, id) || (activeOf(save, id)?.step ?? -1) >= n;

/** Start every quest whose predecessors are all done. Returns the ids started. */
export function startReady(save, now) {
  const R = records(save), started = [];
  for (const q of QUESTS) {
    if (R[q.id] || retired(save, q) || !q.after.every((a) => isDone(save, a)) || (q.unless ?? []).some((a) => R[a])) continue;
    // (field work for a chapter the farmer was already past when it came in: theirs is done, unseen -- journal)
    if (q.late && R[q.late]) { R[q.id] = { step: q.steps.length, at: now, parts: [], n: 0, done: now, skipped: true }; continue; }
    R[q.id] = { step: 0, at: now, parts: [], n: 0 };
    started.push(q.id);
    enter(save, q, now);
  }
  return started;
}

/** The step a quest is on, and the part of an `all` step it would be (for a talk or a clue): [step, part | -1]. */
export function stepOf(q, rec) { return q.steps[rec.step] ?? null; }

/** A step that is so already when it comes up: a place the player is in, people they have met. */
function enter(save, q, now) {
  const rec = activeOf(save, q.id); if (!rec) return;
  const s = stepOf(q, rec);
  if (s?.kind === 'visit' && save.where === s.map) { advance(save, q, now); return; }
  if (s?.kind === 'all' && meetParts(s, rec, save) && partsDone(s, rec)) advance(save, q, now);
}
/** Mark the parts of an `all` step that ask to meet someone already met (save.met: the 'meet' command). */
function meetParts(s, rec, save) {
  let any = false;
  s.parts.forEach((p, i) => { if (rec.parts[i] !== true && p.kind === 'meet' && save.met?.[p.npc]) { rec.parts[i] = true; any = true; } });
  return any;
}

/** Does finishing this quest pay something (claimed through quest.turnIn)? */
export const hasReward = (q) => !!(q.reward?.gold || q.reward?.shards || q.reward?.items?.length);
/** Move a quest on to its next step -- or, past the last, finish it (READY first, when there is a reward). */
export function advance(save, q, now) {
  const rec = activeOf(save, q.id); if (!rec) return;
  rec.step++; rec.parts = []; rec.n = 0;
  if (rec.step >= q.steps.length) { if (hasReward(q)) rec.ready = now; else finish(save, rec, now); return; }
  enter(save, q, now);
}
/**
 * THE ADMIN'S SHORTCUT (2026-09-27, the designer: "I shouldn't be required to complete tasks... to see how the
 * whitelist task ends"): put quest `id` at step `n` (0 = its start; its length = done, without its reward), every
 * quest it waits on marked done (skipped) first. True if it was moved.
 */
export function jumpTo(save, id, n, now) {
  const q = QUEST[id];
  if (!q) return false;
  const R = records(save), seen = new Set();
  const before = (qid) => {
    for (const a of QUEST[qid]?.after ?? []) {
      if (seen.has(a)) continue;
      seen.add(a); before(a);
      if (!isDone(save, a)) R[a] = { step: QUEST[a].steps.length, at: now, parts: [], n: 0, done: now, skipped: true };
    }
  };
  before(id);
  const step = Math.max(0, Math.min(q.steps.length, Math.floor(+n) || 0));
  R[id] = step >= q.steps.length ? { step, at: now, parts: [], n: 0, done: now, skipped: true } : { step, at: now, parts: [], n: 0 };
  startReady(save, now);
  if (step < q.steps.length) enter(save, q, now);
  return true;
}
/** A quest done: its time kept, and whatever it opens begins. */
export function finish(save, rec, now) { delete rec.ready; rec.done = now; startReady(save, now); }
/**
 * THE QUEST A FARMER IS HELD UP ON (2026-10-14, the admin's desk, Everyone: "a lot of people are stuck on some quests"):
 * the first in hand as the journal lists them (the opening, the Founding Farmers, their field work, the town). Never a
 * side job, and never one already done and waiting for its reward (the game claims that itself). Null: none.
 */
export function jumpTarget(save) {
  return QUESTS.filter((q) => q.chain !== 'side' && activeOf(save, q.id) && !save.quests[q.id].ready)
    .sort((a, b) => (ORDER[a.chain] - ORDER[b.chain]) || QUESTS.indexOf(a) - QUESTS.indexOf(b))[0] ?? null;
}
/**
 * THE FIELD WORK THAT GOES WITH A JUMP (it pays nothing, it only holds the next chapter back: the designer, 2026-10-14,
 * players on chapter 17 jumped twice must reach the story's end): with a chapter, the field work still in hand for it and
 * every chapter before it. With field work (no chapter in hand: the next one waits on it), all of it in hand.
 */
export function fieldsAlong(save, q) {
  if (q.chain !== 'founding' && q.chain !== 'fields') return [];
  const upTo = q.chain === 'founding' ? chapterOf(q) : Infinity;
  return QUESTS.filter((f) => f.chain === 'fields' && f !== q && activeOf(save, f.id) && chapterOf(QUEST[f.of]) <= upTo);
}
/**
 * What the steps still ahead of a quest hand over (a step's or a part's `gives`), less what those same steps take back
 * (a clue's `needs`, a quest thing delivered): given when an admin finishes the quest for a farmer, so the quests after
 * it have what they ask for (a map piece, the old token, Marlow's tools). [[id, n, state?]]
 */
export function givesAhead(save, q) {
  const rec = activeOf(save, q.id); if (!rec || rec.ready) return [];
  const out = [], take = new Map(), less = (id, n) => take.set(id, (take.get(id) ?? 0) + (n ?? 1));
  q.steps.slice(rec.step).forEach((s, i) => {
    const parts = s.kind === 'all' ? s.parts.filter((_, k) => !(i === 0 && rec.parts[k] === true)) : [];
    for (const x of [s, ...parts]) {
      for (const [id, n, st] of x.gives ?? []) out.push([id, n ?? 1, st]);
      if (x.kind === 'clue' && !x.keeps) for (const [id, n] of x.needs ?? []) less(id, n);
      if (x.kind === 'deliver') for (const w of x.items ?? []) if (QUEST_ITEMS[w.item]) less(w.item, w.n);
    }
  });
  return out.map(([id, n, st]) => { const t = Math.min(take.get(id) ?? 0, n); if (t) take.set(id, take.get(id) - t); return st ? [id, n - t, st] : [id, n - t]; })
    .filter(([, n]) => n > 0);
}
/** The quests waiting for their reward to be claimed. */
export const readyOf = (save) => QUESTS.filter((q) => activeOf(save, q.id)?.ready);

/**
 * THE SERVER'S SAY (the spec: "the requirements should be configurable server-side"): a quest's delivery and
 * reward may be replaced from data/v2/quests.json -- { "<quest>": { "items": [{ item, n, grown?, caughtAt?,
 * cooked? }], "reward": { gold, items } } } -- and the game is told the same (server/world2.js state).
 */
export function configure(cfg) {
  for (const [id, c] of Object.entries(cfg ?? {})) {
    const q = QUEST[id]; if (!q || !c) continue;
    const d = [...q.steps].reverse().find((s) => s.kind === 'deliver');
    if (Array.isArray(c.items) && d) d.items = c.items.filter((w) => typeof w?.item === 'string' && Number.isSafeInteger(w.n) && w.n > 0);
    // (a chapter of the story keeps its Shards unless the server's reward names its own)
    if (c.reward && typeof c.reward === 'object') q.reward = { ...(q.chain === 'founding' && c.reward.shards == null ? { shards: CHAPTER_SHARDS } : {}), ...c.reward };
  }
}

/* ------------------------------------------------------------ what counts */

/**
 * THE FOUNDERS' FRUIT (the designer, 2026-09-29: "there should be no quest which is not doable"). Only two Star Fruit
 * seeds are ever given -- the moonstone's hollow, Chapter 4 -- and Marven wants two Star Fruit's worth: one, and one
 * in the Moonlight Stew. So until her request is done, the fruit and its seeds stay with the farmer: no shop buys them,
 * no trade, stall or order takes them, they are not thrown away, and "any crop" or "any seeds" never means them (the
 * designer chose this over selling the seeds: nothing about the economy changes, and after the scroll they sell as
 * before). And should a farmer still come up short -- a stew eaten, say -- the hollow has two more seeds, three times.
 */
export const FOUNDERS_KEEP = new Set(['Star Fruit', 'seed:14']);
export const KEPT_WHY = 'Keep that: it\'s for your quest';
/**
 * THE STORY'S OWN THINGS ARE KEPT (2026-10-07, the designer: players sold, ate or threw away what the story needs and
 * cannot get again -- "they shouldn't be discarded, sold or consumed"): until Marven's request is done,
 *   - the Founders' fruit, Star Fruit and its seeds: all of them (FOUNDERS_KEEP above);
 *   - your own Moonlight Stew (cooked by you: one, for Marven) and your own Ghost Catfish (caught at Moonmere: one for
 *     Marven, and one more for the stew while none is cooked) -- bought ones are sold, eaten, traded as anything is;
 *   - (a quest's own things -- the map, the seal, the pearl -- are never sold, thrown away, traded or eaten: commands.js).
 * How many of `id` must stay, of all you have (carried, in chests, waiting at home); Infinity: every one.
 */
export function keepCount(save, inv, id) {
  if (isDone(save, 'ff18')) return 0;
  if (FOUNDERS_KEEP.has(id)) return Infinity;
  if (id !== 'Moonlight Stew' && id !== 'Ghost Catfish') return 0;
  const H = inv ? heldCount(inv, id) : Infinity;
  if (id === 'Moonlight Stew') return Math.min(1, ownLeft(save, { cooked: true }, id), H);
  const stewCooked = ownLeft(save, { cooked: true }, 'Moonlight Stew') >= 1;
  return Math.min(stewCooked ? 1 : 2, ownLeft(save, { caughtAt: 'lake' }, id), H);
}
/** Everything of `id` a farmer has: carried, in their chests, waiting at home (an Inventory, or a save's record of one). */
const heldCount = (inv, id) => carriedCount(inv, id) + [...Object.values(inv.chests ?? {}).flat(), ...(inv.stash ?? [])].reduce((t, s) => t + (s?.id === id ? s.n ?? 1 : 0), 0);
/** Would taking `n` of `id` away -- sold, thrown away, eaten, traded, cooked into something else -- leave fewer than the
 *  story keeps? (`inv`: the farmer's things; without them, whatever the story keeps is kept.) */
export const keptFor = (save, id, inv = null, n = 1) => { const k = keepCount(save, inv, id); return k > 0 && (k === Infinity || !inv || heldCount(inv, id) - n < k); };
/** What a save keeps now, by id (a trade between players takes none of these while any is kept). */
export const keptIds = (save) => ['Star Fruit', 'seed:14', 'Ghost Catfish', 'Moonlight Stew'].filter((id) => keepCount(save, save?.inventory ?? null, id) > 0);
/** Is the farmer short of the Founders' fruit -- Chapter 4 done, Marven's request not, and not enough anywhere (in hand,
 *  in a chest, growing) for her Star Fruit and a Moonlight Stew -- with a refill left (three at most)? */
export function foundersShort(save) {
  if (!isDone(save, 'ff04') || isDone(save, 'ff18') || (save?.founders?.refills ?? 0) >= 3) return false;
  const inv = save?.inventory ?? {}, slots = [...(inv.hotbar ?? []), ...(inv.bag ?? []), ...Object.values(inv.chests ?? {}).flat()];
  const count = (id) => slots.reduce((n, s) => n + (s?.id === id ? s.n ?? 1 : 0), 0);
  let growing = 0;
  for (const [k, v] of Object.entries(save ?? {})) if (k.startsWith('farm.') && v && typeof v === 'object') for (const c of Object.values(v)) if (c?.crop?.s === 14) growing++;
  return count('seed:14') + count('Star Fruit') + growing < (count('Moonlight Stew') ? 1 : 2);
}

const matches = (want, got) => {
  if (want == null) return true;
  if (typeof want !== 'string') return false;
  if (want.endsWith(':*')) return !FOUNDERS_KEEP.has(got) && (String(got ?? '').startsWith(want.slice(0, -1)) || (want === 'food:*' && isFood(got)) || (want === 'fish:*' && isFish(got)) || (want === 'crop:*' && isCrop(got)));
  return want === got;
};
/** Does an item id match what a step wants (a name, or a kind: 'fish:*', 'food:*', 'crop:*', 'seed:*')? */
export const matchesItem = (want, got) => matches(want, got);
let KINDS = { food: new Set(), fish: new Set(), crop: new Set() };
/** The catalogue's kinds (catalog.js tells this file which items are food, fish, crops -- it imports this one), and
 *  farmLevel(save) / cropLevel(name): the farmer's Farming level and the level a crop's seeds are sold at. */
export function useKinds(k) { KINDS = k; }
const isFood = (id) => KINDS.food.has(id), isFish = (id) => KINDS.fish.has(id), isCrop = (id) => KINDS.crop.has(id);

/** Does an event ({ on, item, map }) count for a `do` step? Only the thing it names (field work too: 2026-10-04, any
 *  crop no longer counts for a task whose seeds the farmer's Farming cannot buy yet). */
function counts(step, ev) {
  if (step.kind !== 'do') return false;
  const ons = Array.isArray(step.on) ? step.on : [step.on];
  if (!ons.includes(ev.on) || (step.map && step.map !== ev.map)) return false;
  return matches(step.item, ev.item);
}
/** Is a `have` step met by what is carried? */
function has(step, inv) { return !!inv && carriedCount(inv, step.item) >= (step.n ?? 1); }
export function carriedCount(inv, want) {
  let n = 0;
  // (the hotbar and the backpack -- 2026-10-02, five slots -- an Inventory, or a save's own record of one)
  for (const s of [...inv.hotbar.slice(0, inv.size ?? (inv.vip ? 20 : 10)), ...(inv.bag ?? [])]) if (s && matches(want, s.id)) n += s.n ?? 1;
  return n;
}

/**
 * Something happened (a command the rules ran): count it for every quest waiting on it. `ev`: { on, item?,
 * map? }. `inv` lets a `have` step look at the hotbar. Returns [{ id, text, done }] of what moved, for the tracker.
 */
export function onEvent(save, ev, now, inv = null) {
  const moved = [];
  // the player's own record of what they grew, caught and cooked (Marven asks for things "you" made)
  const st = (save.stats ??= {});
  if (ev.on === 'harvest' && ev.item) (st.harvested ??= {})[ev.item] = (st.harvested[ev.item] ?? 0) + 1;
  if (ev.on === 'fish' && ev.map) (st.caughtAt ??= {})[ev.map] = (st.caughtAt[ev.map] ?? 0) + 1;
  // (and which fish, where: a delivery that wants a fish caught by you wants THAT fish, from there -- ownLeft)
  if (ev.on === 'fish' && ev.map && ev.item) { const k = `${ev.item}@${ev.map}`; (st.caughtFish ??= {})[k] = (st.caughtFish[k] ?? 0) + 1; }
  if (ev.on === 'cook' && ev.item) (st.cooked ??= {})[ev.item] = (st.cooked[ev.item] ?? 0) + Math.max(1, Math.floor(ev.n ?? 1));   // (portions: commands.js cook)
  if (ev.on === 'travel' && ev.map) (st.visited ??= {})[ev.map] = st.visited[ev.map] ?? now;
  startReady(save, now);
  // A CROP COUNTS FOR THE FIELD WORK THAT NAMES IT -- every task in hand that names it (2026-10-02, a player: "I harvest
  // 8 wheats in accordance with the quest, but only 2 counted": Wheat is wanted by two tasks, and the first unseen one
  // took six of them) -- and for no other (2026-10-04, the designer: any crop once counted for a task whose seeds the
  // farmer's Farming could not buy yet)
  let fields = null;
  if (ev.on === 'harvest') {
    const open = QUESTS.filter((q) => q.chain === 'fields' && activeOf(save, q.id) && stepOf(q, activeOf(save, q.id))?.grow);
    fields = new Set(open.filter((q) => matches(stepOf(q, activeOf(save, q.id)).item, ev.item)));
  }
  for (const q of QUESTS) {
    const rec = activeOf(save, q.id); if (!rec) continue;
    const s = stepOf(q, rec); if (!s) continue;
    if (s.grow && !fields?.has(q)) continue;
    if (s.kind === 'visit' && ev.on === 'travel' && ev.map === s.map) { advance(save, q, now); moved.push({ id: q.id, text: s.text, done: true, ready: !!rec.ready }); continue; }
    if (s.kind === 'do' && counts(s, ev, save)) {
      rec.n = (rec.n ?? 0) + 1;
      const ok = rec.n >= (s.n ?? 1);
      if (ok) advance(save, q, now);
      moved.push({ id: q.id, text: s.text, done: ok, ready: !!rec.ready });
      continue;
    }
    if (s.kind === 'all') {
      let any = false;
      s.parts.forEach((p, i) => {
        if (rec.parts[i] === true) return;
        if (p.kind === 'do' && counts(p, ev, save)) { rec.parts[i] = ((+rec.parts[i] || 0) + 1) >= (p.n ?? 1) ? true : (+rec.parts[i] || 0) + 1; any = true; }
        else if (p.kind === 'visit' && ev.on === 'travel' && ev.map === p.map) { rec.parts[i] = true; any = true; }
        else if (p.kind === 'have' && has(p, inv)) { rec.parts[i] = true; any = true; }
      });
      if (meetParts(s, rec, save)) any = true;
      if (any) { const ok = partsDone(s, rec); if (ok) advance(save, q, now); moved.push({ id: q.id, text: s.text, done: ok, ready: !!rec.ready }); }
    }
  }
  return moved;
}
export const partsDone = (s, rec) => s.parts.filter((_, i) => rec.parts[i] === true).length >= (s.need ?? s.parts.length);

/* ------------------------------------------------------------ who wants what, for the dialogue and the tracker */

/**
 * What a conversation with `npc` would be about: the first quest step (or part) that wants to talk to them --
 * { q, step, part, kind: 'talk' | 'deliver' | 'remind', lines } -- or null for their everyday words.
 */
export function talkFor(save, npc) {
  for (const q of QUESTS) {
    const rec = activeOf(save, q.id); if (!rec) continue;
    const s = stepOf(q, rec); if (!s) continue;
    if ((s.kind === 'talk' || s.kind === 'deliver') && s.npc === npc) return { q, step: rec.step, part: -1, kind: s.kind, s };
    if (s.kind === 'all') {
      const i = s.parts.findIndex((p, k) => rec.parts[k] !== true && p.kind === 'talk' && p.npc === npc);
      if (i >= 0) return { q, step: rec.step, part: i, kind: 'talk', s: s.parts[i] };
    }
  }
  for (const q of QUESTS) {
    const rec = activeOf(save, q.id); if (!rec || q.giver !== npc) continue;
    const s = stepOf(q, rec);
    if (s?.remind) return { q, step: rec.step, part: -1, kind: 'remind', s, lines: s.remind };
    if (s) return { q, step: rec.step, part: -1, kind: 'remind', s, lines: [`${s.text}.`] };
  }
  return null;
}
/** The clue step (or part) looking for clue `id`, if any. */
export function clueFor(save, id) {
  for (const q of QUESTS) {
    const rec = activeOf(save, q.id); if (!rec) continue;
    const s = stepOf(q, rec); if (!s) continue;
    if (s.kind === 'clue' && s.clue === id) return { q, part: -1, s };
    if (s.kind === 'all') {
      const i = s.parts.findIndex((p, k) => rec.parts[k] !== true && p.kind === 'clue' && p.clue === id);
      if (i >= 0) return { q, part: i, s: s.parts[i] };
    }
  }
  return null;
}
/** A clue part already found, while its step is still in hand: read again (Haskett's numbers, the carts). */
export function clueAgain(save, id) {
  for (const q of QUESTS) {
    const rec = activeOf(save, q.id); if (!rec) continue;
    const s = stepOf(q, rec);
    if (s?.kind === 'all') { const p = s.parts.find((x, k) => rec.parts[k] === true && x.kind === 'clue' && x.clue === id); if (p) return { q, part: -1, s: p }; }
    // (a step just past: the next step still needs what it said -- the strongbox, the watchers)
    const prev = q.steps[rec.step - 1];
    if (prev?.kind === 'all') { const p = prev.parts.find((x) => x.kind === 'clue' && x.clue === id); if (p) return { q, part: -1, s: p }; }
  }
  return null;
}
/** The quests shown to the player: in progress first (the opening, the Founding Farmers, the town, the side
 *  jobs), then done ones. [{ q, rec, step, text, progress }] */
const ORDER = { tutorial: 0, founding: 1, fields: 1.5, town: 2, side: 3 };
export function journal(save, inv = null) {
  const out = [];
  for (const q of QUESTS) {
    const rec = save?.quests?.[q.id]; if (!rec || (rec.skipped && q.chain === 'fields')) continue;
    const s = rec.done ? null : stepOf(q, rec);
    let progress = '', parts = null, next = null;
    if (s?.kind === 'do' && (s.n ?? 1) > 1) progress = `${rec.n ?? 0}/${s.n}`;
    if (s?.kind === 'all') {
      progress = `${s.parts.filter((_, i) => rec.parts[i] === true).length}/${s.need ?? s.parts.length}`;
      // every part, done or not: what "Five everyday things" means, spelled out
      parts = s.parts.map((p, i) => ({ text: p.text, done: rec.parts[i] === true, count: typeof rec.parts[i] === 'number' && (p.n ?? 1) > 1 ? `${rec.parts[i]}/${p.n}` : '' }));
      next = parts.find((p) => !p.done)?.text ?? null;
    }
    if (s?.kind === 'deliver' && inv) {
      // what to bring, each with how many you have (and why it doesn't count yet: grown, caught, cooked by you)
      const want = stillWanted(s, save, inv);
      parts = want.map((w) => ({ text: `${w.item === 'gold' ? 'Gold' : wantName(w)}${w.why ? ` (${w.why})` : ''}`, done: w.met, count: `${Math.min(w.have, w.n)}/${w.n}` }));
      // the tracker says what the person says: the next thing still wanted and how many of IT you carry (2026-10-02,
      // a player: the tracker read "Silvercap (1/2)" -- kinds met -- while Juniper said "Silvercap 2/3")
      const first = parts.find((p) => !p.done);
      progress = first ? first.count : `${want.length}/${want.length}`;
      next = first?.text ?? null;
    }
    out.push({ q, rec, done: !!rec.done, ready: !!rec.ready, text: s?.text ?? (rec.ready ? 'Done: the reward is on its way' : 'Done'), progress, parts, next });
  }
  return out.sort((a, b) => (a.done - b.done) || (ORDER[a.q.chain] - ORDER[b.q.chain]) || QUESTS.indexOf(a.q) - QUESTS.indexOf(b.q));
}

/** THE QUEST FOLLOWED (the journal's Track, save.tracked): that one while it is in hand, else the first in
 *  hand (the opening, the Founding Farmers, the town, the side jobs) -- or NONE when the player has unfollowed
 *  (save.tracked === false: 2026-10-02, players: "can't unfollow it all... sometimes I don't need"). */
export function trackedOf(save, inv = null) {
  if (save?.tracked === false) return null;
  const open = journal(save, inv).filter((j) => !j.done);
  return open.find((j) => j.q.id === save?.tracked) ?? open[0] ?? null;
}
/** A Founding Farmers chapter's number (ff07 -> 7), or 0. */
export const chapterOf = (q) => (q.chain === 'founding' ? +q.id.slice(2) || 0 : 0);

/**
 * WHERE A QUEST WANTS YOU NOW, in the world index (where.js): the step in hand, or the first unfinished part of
 * an `all`. { map, r: [x, y, w, h] | null, exact, npc?, label, spot? } -- exact: a person or a thing; not: a place
 * to search (spot: the thing itself in it, for the marker once you are there); r null: somewhere on that map (a
 * cave's secret, a visit). Null when the step has no place.
 */
export function goalOf(save, q, ix) {
  const rec = activeOf(save, q?.id);
  if (!rec || rec.ready || !ix) return null;
  let s = stepOf(q, rec);
  if (s?.kind === 'all') s = s.parts.find((p, i) => rec.parts[i] !== true) ?? null;
  if (!s) return null;
  const person = (npc) => {
    const at = ix.people?.[npc] ?? [], e = at.find((z) => shownFor({ tags: z.show }, save)) ?? null;
    return e ? { map: e.map, r: e.r, exact: true, npc, label: npc } : null;
  };
  const area = (map, name) => { const a = (ix.areas?.[map] ?? []).find((z) => z.name === name); return a ? { map, r: a.r, exact: false, label: name } : { map, r: null, exact: false, label: name }; };
  if (s.kind === 'talk' || s.kind === 'deliver' || s.kind === 'meet') return person(s.npc);
  if (s.kind === 'visit') return { map: s.map, r: null, exact: false, label: null };
  if (s.kind === 'puzzle') {
    const z = ix.puzzles?.[s.puzzle]?.[0];
    if (!z) return null;
    return s.area ? { ...area(z.map, s.area), spot: z.r } : { map: z.map, r: z.r, exact: true, label: s.text };
  }
  if (s.kind === 'clue') {
    const c = (ix.clues?.[s.clue] ?? []).find((z) => shownFor({ tags: z.show }, save)) ?? ix.clues?.[s.clue]?.[0];
    if (!c) return null;
    if (s.hidden || s.variant) return { map: c.map, r: null, exact: false, label: s.place };
    if (s.area) return { ...area(c.map, s.area), spot: c.r };
    return { map: c.map, r: c.r, exact: true, label: s.place };
  }
  if (s.kind === 'do' && s.at) {
    if (s.at.npc) return person(s.at.npc);
    if (s.at.area) return area(s.at.map, s.at.area);
    const r = s.at.tag ? ix.tags?.[s.at.map]?.[s.at.tag]?.[0] ?? null : null;
    return { map: s.at.map, r, exact: false, label: null };
  }
  return null;
}

/** Who stands where, by the quests (a zone tagged npc:<id> may carry these too):
 *    show:before:<q>        until q is done            show:after:<q>        once q is done
 *    show:from:<q>:<n>      once q reaches step n      show:until:<q>:<n>    until q reaches step n */
export function shownFor(z, save) {
  for (const t of z?.tags ?? []) {
    const m = /^show:(before|after|from|until):([a-z0-9_]+)(?::(\d+))?$/.exec(t);
    if (!m) continue;
    const [, k, id, n] = m;
    if (k === 'before' && isDone(save, id)) return false;
    if (k === 'after' && !isDone(save, id)) return false;
    if (k === 'from' && !reached(save, id, +n)) return false;
    if (k === 'until' && reached(save, id, +n)) return false;
  }
  return true;
}

/**
 * THE STORY'S THINGS ON THE MAP (the designer, 2026-09-26: "that asset needs to be on the map where you need to
 * find it"): a map object with these tags is drawn, and in the way, only while the story has it there --
 *   clue:<id>          while that clue is wanted: a thing lying where you find it, gone once you have it
 *   show:...           as for a zone (shownFor)
 *   var:<secret>:<n>   once the player has found theirs there (save.known: the Founders' chest)
 *   picked:<zone>      while that wild patch (forage) has something ripe
 */
export function objectShown(o, save, map, now) {
  for (const t of o?.tags ?? []) {
    let m;
    if ((m = /^clue:([a-z0-9_]+)$/.exec(t)) && !clueFor(save, m[1])) return false;
    if ((m = /^var:([a-z]+):(\d+)$/.exec(t)) && save?.known?.[m[1]] !== +m[2]) return false;
    if ((m = /^picked:(.+)$/.exec(t)) && (save?.forage?.[`${map}/${m[1]}`] ?? 0) > now) return false;
  }
  return shownFor(o, save);
}

/**
 * YOUR OWN WORK, ONE BY ONE (2026-10-07, a player: a bought Ghost Catfish, put in a chest and taken out again after an
 * evening's fishing at Moonmere, counted as caught there -- the check was "have you ever caught a fish there" and "do you
 * carry one"): how many of a thing you may still hand in as your own -- grown by you, caught by you (that fish, at that
 * place), cooked by you -- less those handed in already, cooked into a dish or eaten (useOwn).
 */
const ownKey = (w, item) => (w.grown ? `grown:${item}` : w.caughtAt ? `caught:${item}@${w.caughtAt}` : w.cooked ? `cooked:${item}` : null);
/**
 * THE CATCHES FROM BEFORE THE FISH WERE COUNTED ONE BY ONE (2026-10-11, a player: "I have the Ghost Catfish but Marven
 * won't take it" -- 84 catches at Moonmere, all before 10-07, and a fish caught in town since): every catch is counted
 * by place (caughtAt) and, since 2026-10-07, by fish and place (caughtFish). The catches at a place that no fish-and-place
 * count holds were made before; any of them may have been the fish asked for. (Before, they counted only until the
 * farmer's next catch, anywhere -- then never again.)
 */
const oldCatches = (st, place) => Math.max(0, ((st.caughtAt ?? {})[place] ?? 0)
  - Object.entries(st.caughtFish ?? {}).reduce((t, [k, n]) => t + (k.endsWith(`@${place}`) ? n : 0), 0));
/** The fish a step asks for as caught somewhere ('Ghost Catfish'): only these take the old catches. */
let caughtWanted = null;
const isCaughtWant = (item) => (caughtWanted ??= new Set(QUESTS.flatMap((q) => q.steps ?? []).flatMap((st) => st.items ?? []).filter((w) => w.caughtAt).map((w) => w.item))).has(item);
function ownMade(st, w, item) {
  if (w.grown) return (st.harvested ?? {})[item] ?? 0;
  if (w.caughtAt) return ((st.caughtFish ?? {})[`${item}@${w.caughtAt}`] ?? 0) + (isCaughtWant(item) ? oldCatches(st, w.caughtAt) : 0);
  if (w.cooked) return (st.cooked ?? {})[item] ?? 0;
  return Infinity;
}
/** How many of `item` the want `w` may still take as your own work (Infinity: it asks for none). */
export function ownLeft(save, w, item) {
  const st = save?.stats ?? {}, k = ownKey(w, item);
  return k ? Math.max(0, ownMade(st, w, item) - ((st.handed ?? {})[k] ?? 0)) : Infinity;
}
const carriedIds = (inv) => [...new Set([...inv.hotbar.slice(0, inv.size ?? (inv.vip ? 20 : 10)), ...(inv.bag ?? [])].filter(Boolean).map((s) => s.id))];
const ownOf = (save, inv, w) => (w.item.endsWith(':*') ? carriedIds(inv).filter((id) => matches(w.item, id)) : [w.item])
  .map((id) => [id, Math.min(carriedCount(inv, id), ownLeft(save, w, id))]).filter(([, k]) => k > 0);
/** What a want takes as your own work: [[id, n]] (for a kind, 'food:*', the things carried that are yours). Null if short. */
export function ownPicks(save, inv, w) {
  const out = []; let need = w.n;
  for (const [id, k] of ownOf(save, inv, w)) { if (!need) break; const t = Math.min(need, k); out.push([id, t]); need -= t; }
  return need ? null : out;
}
/** Handed in as your own (quest.turnIn): no longer yours to hand in again. */
export function spendOwn(save, w, id, n) {
  const k = ownKey(w, id); if (!k || !(n > 0)) return;
  const h = ((save.stats ??= {}).handed ??= {}); h[k] = (h[k] ?? 0) + n;
}
/** n of `id` used up -- cooked into a dish, eaten (commands.js), counted BEFORE they go: the bought ones are taken to go
 *  first, and only what that leaves was your own work (a farmer with a bought Star Fruit and a grown one keeps the grown). */
export function useOwn(save, inv, id, n) {
  const st = save?.stats; if (!st || !(n > 0)) return;
  const C = carriedCount(inv, id);
  // (where it may have been caught: where this fish was, and -- for a fish a step asks for -- where the old catches were)
  const places = new Set(Object.keys(st.caughtFish ?? {}).filter((k) => k.startsWith(`${id}@`)).map((k) => k.slice(id.length + 1)));
  if (isCaughtWant(id)) for (const p of Object.keys(st.caughtAt ?? {})) if (oldCatches(st, p) > 0) places.add(p);
  const wants = [{ grown: true }, { cooked: true }, ...[...places].map((p) => ({ caughtAt: p }))];
  for (const w of wants) {
    const L = ownLeft(save, w, id);
    if (!(L > 0) || L === Infinity) continue;
    const own = Math.max(0, n - Math.max(0, C - L));
    if (own) spendOwn(save, w, id, Math.min(own, L));
  }
}

/** Everything a deliver step still wants, given the hotbar and the player's record: [{ item, n, have, why }]. */
export function stillWanted(s, save, inv) {
  return s.items.map((w) => {
    const have = w.item === 'gold' ? save?.purse?.gold ?? 0 : carriedCount(inv, w.item);
    let why = '';
    if ((w.grown || w.caughtAt || w.cooked) && ownOf(save, inv, w).reduce((t, [, k]) => t + k, 0) < w.n)
      why = w.grown ? 'grown by you' : w.cooked ? 'cooked by you' : `caught at ${w.caughtAt === 'lake' ? 'Moonmere' : w.caughtAt}`;
    return { ...w, have, why, met: have >= w.n && !why };
  });
}
/** A wanted item's name, as a person would say it. */
export const wantName = (w) => ({ 'fish:*': 'fish', 'food:*': 'a dish', 'crop:*': 'crops', 'seed:*': 'seeds', gold: 'Gold' })[w.item] ?? w.item;
