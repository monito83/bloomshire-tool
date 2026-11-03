// npcs.js -- THE PEOPLE OF BLOOMSHIRE (2026-09-25; the townsfolk grown, and met properly, 2026-09-26).
//
// Who they are (the docs' villagers where the docs name one: Bram the smith, Tamsin the cook, Wren the
// fisher, Juniper at the apothecary, Pell the carpenter, Rowan at the Market Hall, Maren the elder, Marlow
// the old farmer, Hollis the animal keeper; new faces for the shops the docs leave unnamed, and the townsfolk
// who simply live here), what they do (a shop -- catalog.js SHOPS --, the bank, the Exchange, quests, or just
// a word), how they look (the pack's own premade people -- the Blacksmith, the Chef, a Mermaid, the old
// sailor -- or the farmer's own layered villager, dressed), and what they say.
//
// THE FIRST TIME YOU MEET SOMEONE (the designer, 2026-09-26) is a real first meeting: their `intro`, a short
// exchange -- they speak, you answer (one of your replies, as the dialogue box's answers), they tell you who
// they are. A page is a line of theirs, or { you: [your replies] } after it. When it is over the rules'
// `meet` command writes it into the save (save.met), and from then on they say their everyday `lines`.
//
// WHERE THEY STAND IS THE MAP'S: a zone tagged npc:<id> (and face:<up|down|left|right>, else down) -- the
// designer moves a person by moving their zone in the editor. THE STORY MAY MOVE THEM (game/quests.js
// shownFor): a zone may also carry show:before|after:<quest> or show:from|until:<quest>:<step>. When the story
// moves someone to another zone on the map you are on, they WALK there, round whatever is in the way; when it
// takes them off the map, they walk out by the nearest door (Play gives the way: its own collision). They
// stand with their feet at the zone's middle, block your way like anyone would (not while walking), and E
// (facing them, close by) talks to them. The server reads the same zones: a shop sells only while its keeper
// is on the map you stand on (game/commands.js).
//
// BY NIGHT AND IN THE RAIN NOBODY IS OUT (the designer, 2026-10-01): Play's `shown` says no for everyone under the
// open sky then (weather.js keptIn), and as a map opens they are simply in. HOME BY WALKING (the designer, 2026-10-04:
// "make it so that they go back to their houses by walking, so it looks much more natural"): whoever is out when the
// night or the rain comes walks home -- in at their own door (a person's `home`: the building they belong to, else
// the door nearest the spot they stand at by day) -- and on a dry morning walks out of it again to their spot. One with
// no way home goes only once you look away; nobody vanishes in front of you. (Indoors -- the shops, the bank --
// nothing changes.)

import { Villager, DEFAULT_LOOK, ACTIONS } from './villager.js';
import { bounds } from '../doc.js';

const NPC = "Character/NPC'S";
/** The pack's premade people: a sheet of 32 px frames, 4 a direction standing and 6 walking, in the order
 *  down, up, left, right -- one long strip, or (`grid`) a row each -- and a portrait sheet of 64 px expressions.
 *  A mermaid's sprite has 4 frames, facing you. `head`: how far above the feet the top of the head (or hat) is,
 *  measured from the first frame (PREMADE_FEET less its top row) -- where the name plate points. */
const BLACKSMITH = { sheet: `${NPC}/Blacksmith/Premade/Alaric/Blacksmith Idle.png`, walk: `${NPC}/Blacksmith/Premade/Alaric/Blacksmith Walk.png`,
  portrait: `${NPC}/Blacksmith/Premade/Alaric/Blacksmith aseprite.png`, dirs: 4, head: 23 };
const CHEF = { sheet: `${NPC}/Chef/Premade/Gaston/Chef Sprites Idle.png`, walk: `${NPC}/Chef/Premade/Gaston/Chef Sprites Walk.png`,
  portrait: `${NPC}/Chef/Premade/Gaston/Chef Portrait.png`, dirs: 4, head: 26 };
const MERMAID = { sheet: `${NPC}/Mermaid/Premade/Nixie/Sprite.png`, portrait: `${NPC}/Mermaid/Premade/Nixie/Portrait.png`, dirs: 1, head: 23 };
const MARVEN = { sheet: `${NPC}/Mermaid/Premade/Aquina/Sprite.png`, portrait: `${NPC}/Mermaid/Premade/Aquina/Portrait.png`, dirs: 1, head: 23 };
const SAILOR = { sheet: `${NPC}/Pirate/Premade/OLD/Idle.png`, walk: `${NPC}/Pirate/Premade/OLD/Walk.png`,
  portrait: `${NPC}/Pirate/Premade/Jack/Pirate Portrait.png`, dirs: 4, grid: true, head: 24 };

/**
 * THE PEOPLE: id -> { name, title, role: 'shop' | 'bank' | 'exchange' | 'market' | 'quest' | 'seeds' (the VIP Shop's
 * counter) | 'garden' (the Celestial Garden's panel) | 'talk', shop (catalog.js), premade | look, intro: the first meeting, lines: what they say after }.
 */
export const NPCS = {
  // the shops (catalog.js SHOPS)
  hazel:    { name: 'Hazel', title: 'Seed & Tool', role: 'shop', shop: 'seedtool',
              look: { skin: '1', eyes: 'Female/Brown', hairStyle: 'Iridessa', hairColour: 'Brown', clothes: 'Green', acc: 'Farm' },
              intro: ['Oh! Sorry, I didn\'t hear the door. Are you new?', { you: ['Hi! I\'m new here.', 'Marlow sent me.'] },
                'Then you\'ll be needing seeds. Everyone starts with seeds.', 'I\'m Hazel. Start with carrots or parsnips. They\'re very hard to get wrong.',
                'And if you ever have crops to spare, I\'ll buy them.'],
              hello: ['Oh! {name}. Hi.', 'Morning, {name}. What are we planting?', 'Back again? Good.'],
              lines: ['Better seed for better farmers. Show me what you can do with carrots first.', 'If anything comes up looking funny, bring it in. I love a funny one.'] },
  odette:   { name: 'Odette', title: 'General Store', role: 'shop', shop: 'general',
              look: { skin: '2', eyes: 'Female/Green', hairStyle: 'Lyria', hairColour: 'Ginger', clothes: 'Pink', acc: '' },
              intro: ['Welcome! Mind the step, it\'s been loose since spring.', { you: ['I\'m new in town.', 'What do you sell?'] },
                'A bit of everything. Wood, stone, bread, and whatever people bring in.', 'I\'m Odette. If you have something you don\'t need, I\'ll probably buy it.',
                'Within reason. I don\'t want your old boots.', 'And I keep a board of orders. Six a day. Bring me what\'s on it and I\'ll pay you well.'],
              hello: ['Hello, {name}! Step\'s still loose, sorry.', 'Oh, it\'s you. Come in.', 'Afternoon, {name}.'],
              lines: ['Buying or selling? Either way, be quick. I\'m doing the books.', 'Wood, stone, a loaf for the road. What will it be?',
                'Have you seen my orders today? Six of them, new every morning.'] },
  bram:     { name: 'Bram', title: 'The Forge', role: 'shop', shop: 'blacksmith', premade: BLACKSMITH,
              intro: ['Careful. The anvil\'s still hot.', { you: ['Sorry! I\'m new.', 'You\'re the smith?'] },
                'Bram. I make the tools in this town, and I mend the ones people break.', 'Iron first. Then bronze, gold, amethyst. Better metal lasts longer.',
                'Bring me ore from Stonepeak one day and we\'ll talk.'],
              hello: ['{name}.', 'You again. Good.', 'Mind the anvil, {name}.'],
              lines: ['Tools wear down with use. When yours goes, come here.', 'I buy stone. Not pebbles. Stone.'] },
  pell:     { name: 'Pell', title: 'Carpenter', role: 'shop', shop: 'carpenter',
              look: { skin: '3', eyes: 'Male/Brown', hairStyle: 'Josh', hairColour: 'Black', clothes: 'Red', acc: 'Beard/Black' },
              intro: ['Watch your feet. There\'s sawdust everywhere.', { you: ['Busy day?', 'Hi. I\'m new here.'] },
                'Always. If it\'s not a fence, it\'s a roof.', 'Pell. Carpenter. If you\'ve got timber, I\'ll buy it. All of it.',
                'The bridge, the fences, half the roofs in town. Mine. So if they leak, don\'t tell me.'],
              hello: ['{name}. Hang on, let me put this down.', 'Mind the saw.', 'Morning, {name}.'],
              lines: ['Bring me wood. Straight bits if you can. I\'ll take the bent ones too.', 'Mabel wants another bench by the pond. Third this year. Don\'t ask.'] },
  wren:     { name: 'Wren', title: 'Fisher', role: 'shop', shop: 'fisherman',
              look: { skin: '1', eyes: 'Female/Black', hairStyle: 'Silvermist', hairColour: 'Blonde', clothes: 'Blue', acc: 'Pirate' },
              intro: ['Shh. You\'ll scare the fish.', { you: ['Sorry!', 'Fish? In here?'] },
                'No, I\'m joking. They\'re all out in the river.', 'Wren. I buy fish and I sell rods. That\'s the whole business.',
                'Mornings are best. The fish are hungry and the water\'s calm.'],
              hello: ['Afternoon, {name}.', 'Oh, it\'s you. Wipe your feet.', 'Hello, {name}. Anything biting?'],
              lines: ['Bring me what you catch. I\'ll even take the ugly ones.', 'Four generations of us on this river. You\'d think one of us would be rich by now.'] },
  tamsin:   { name: 'Tamsin', title: 'The Bakery', role: 'shop', shop: 'bakery', premade: CHEF,
              intro: ['Hello! Something smells good, doesn\'t it? That\'s me.', { you: ['Smells wonderful.', 'You\'re the baker?'] },
                'I\'m Tamsin. Bread in the morning, stew at night, and cake when I\'m in a good mood.', 'You look like you skip breakfast. Don\'t. You\'ll need the energy.',
                'Come back when you\'re hungry.'],
              hello: ['{name}! Come in, come in.', 'Hello, love. Hungry?', 'Oh, hello! Watch the flour.'],
              lines: ['Mind, that tray\'s hot. Everything\'s hot in here.', 'Bring me vegetables and I\'ll put them in something. Usually soup.'] },
  juniper:  { name: 'Juniper', title: 'The Apothecary', role: 'shop', shop: 'apothecary',
              look: { skin: '3', eyes: 'Female/Green', hairStyle: 'Iridessa', hairColour: 'Black', clothes: 'Purple', acc: 'Wizard' },
              intro: ['Hm? Oh, hello. Don\'t touch the blue jars.', { you: ['I won\'t.', 'What\'s in them?'] },
                'Things that grow where they shouldn\'t. I\'m Juniper.', 'I sell herbs, flowers, and the seeds that grow them. And I buy what you find in the wild.',
                'Whisperwood is full of good things. Bring me anything odd you find out there. The odder the better.'],
              hello: ['Hm? Oh, {name}. Hello.', 'Don\'t touch the blue jars. Hello.', '{name}. You\'re not carrying anything alive, are you?'],
              lines: ['Herbs, flowers, seeds. Don\'t sniff the purple ones.', 'If a jar starts humming, tell me. Don\'t open it.'] },
  rowan:    { name: 'Rowan', title: 'The Market Hall', role: 'market', shop: 'market',                // (the stalls; and chests: catalog.js)
              look: { skin: '2', eyes: 'Female/Blue', hairStyle: 'Fawn', hairColour: 'Brown', clothes: 'Red', acc: '' },
              intro: ['Welcome to the Market Hall. First time?', { you: ['Yes. What is it?', 'Just looking.'] },
                'Farmers set out stalls here and sell to each other. You pick the price.', 'I\'m Rowan. I keep the stalls fair and the floor swept.',
                'When you\'ve got something worth selling, come and set out a stall.'],
              hello: ['Welcome back, {name}.', 'Hello! Busy day in the Hall.'],
              lines: ['Set your own price. Just don\'t ask me what it should be. Everyone asks.', 'No shouting, no fighting over stalls, and no goats. Those are the rules.'] },
  // the money
  farthing: { name: 'Farthing', title: 'The Bank', role: 'bank',                // (his name plate holds eight letters or so)
              look: { skin: '4', eyes: 'Male/Black', hairStyle: 'Standard', hairColour: 'Black', clothes: 'Blue', acc: '' },
              intro: ['Good day. Farthing, of the Bloomshire Bank.', { you: ['Hello.', 'A bank? Here?'] },
                'Every town needs somewhere safe to keep its Gold.', 'Put by what you don\'t need to carry. It\'ll be here when you come back.',
                'We\'ve never lost a coin. I count them twice a day.'],
              hello: ['Good day, {name}.', 'Ah, {name}. Good day to you.'],
              lines: ['Deposits on the left, withdrawals on the right. It\'s the same counter. But in principle.', 'I counted it all again this morning. It\'s all there. Yours too.'] },
  quill:    { name: 'Quill', title: 'The Exchange', role: 'exchange',
              look: { skin: '1', eyes: 'Male/Blue', hairStyle: 'Sebastian', hairColour: 'Blonde', clothes: 'Purple', acc: 'Beret' },
              intro: ['Ah, a newcomer. Welcome to the Exchange.', { you: ['What do you swap?', 'Hello.'] },
                'Materials, mostly. Too much wood and not enough stone? I can help with that.', 'I\'m Quill. Farmers post their own offers on my board, too: Gold, Shards, even $AVYN.',
                'Have a look. Somebody always wants what you\'ve got too much of.'],
              hello: ['Ah, {name}. Looking for a deal?', 'Hello again.'],
              lines: ['Too much wood, not enough stone? That\'s what I\'m here for.', 'I swap materials at the counter. The board is for farmers trading with each other. Gold, Shards, even $AVYN.'] },
  tilly:    { name: 'Tilly', title: 'The Tailor', role: 'talk',
              look: { skin: '1', eyes: 'Female/Blue', hairStyle: 'Lyria', hairColour: 'Blonde', clothes: 'Purple', acc: 'Beret' },
              intro: ['Oh, hello! Don\'t mind the pins.', { you: ['Nice shop.', 'You make clothes?'] },
                'I\'m Tilly. I make clothes, I mend clothes, and I complain about the price of cloth.', 'New cloth is on its way. When it comes, I\'ll make you something nice.',
                'Until then, the wardrobe at home will have to do.'],
              hello: ['{name}! Come in, it\'s warmer in here.', 'Hello again!'],
              lines: ['The cloth still hasn\'t come. I\'ve written twice. Fenwick says it\'s not his fault.', 'That shirt\'s seen some weather, hasn\'t it? I\'ve seen worse. Not much worse.'] },
  // the people the quests begin with
  maren:    { name: 'Maren', title: 'The Elder', role: 'quest',
              look: { skin: '1', eyes: 'Female/Blue', hairStyle: 'Silvermist', hairColour: 'Blonde', clothes: 'Purple', acc: '' },
              intro: ['Hello. You must be the one Marlow pulled out of the river.', { you: ['That\'s me.', 'Word gets around.'] },
                'It does here. There\'s not much else to do in the evenings.', 'I\'m Maren. I\'m the Elder, which mostly means people bring me their problems.',
                'Come and see me if you need anything. I\'m nearly always in.'],
              hello: ['Hello, {name}. Any news?', '{name}! I was just talking about you.', 'Come in, {name}. Kettle\'s on.'],
              lines: ['Have you eaten today? Tamsin\'s got soup on. I could smell it from here.', 'If Fenwick tells you anything, check it with me first. Half of it he makes up.'] },
  marlow:   { name: 'Marlow', title: 'The Old Farmer', role: 'quest',         // (met already: he found you)
              look: { skin: '2', eyes: 'Male/Brown', hairStyle: 'Standard', hairColour: 'Blonde', clothes: 'Green', acc: 'Farm' },
              hello: ['Hello, {name}.', 'There you are, {name}. Keeping well?', '{name}. Pull up a box.'],
              lines: ['Still haven\'t unpacked. I might just live out of the boxes.', 'How\'s the island? Don\'t tell me about the roof. I know about the roof.'] },
  hollis:   { name: 'Hollis', title: 'Animal Keeper', role: 'quest',
              look: { skin: '4', eyes: 'Male/Green', hairStyle: 'Josh', hairColour: 'Brown', clothes: 'Green', acc: 'Beard/Brown' },
              intro: ['Easy there. The goats don\'t know you yet.', { you: ['Sorry. Hello.', 'Are these yours?'] },
                'I\'m Hollis. I look after the town\'s animals. Chickens, goats, and one very stubborn cow.', 'Move slowly round them. They\'ll come to you when they\'re ready.',
                'If you\'re ever bored, there\'s always something here that needs feeding.'],
              hello: ['Easy there. Oh, it\'s you, {name}.', 'Hello, {name}.'],
              lines: ['Don\'t let the goats near your pockets.', 'The cow\'s in a mood today. Best leave her be.'] },
  nixie:    { name: 'Nixie', title: 'The Mermaid', role: 'quest', premade: MERMAID,
              intro: ['Oh! Hello! Nobody ever stops at the pond.', { you: ['Hello?', 'You\'re a mermaid!'] },
                'I\'m Nixie. The pond is mine. It used to be bigger.', 'I hear everything in this town. People talk by the water and forget I\'m in it.',
                'Come and talk to me sometimes. It gets quiet down here.'],
              hello: ['Oh! Hello, hello, {name}!', 'You came to see me!'],
              lines: ['Did you bring anything shiny? No? That\'s all right.', 'Somebody dropped a spoon in the pond yesterday. It\'s mine now.'] },
  // Stonepeak's head miner (2026-09-26, the Founding Farmers chain: Chapters 8 and 9)
  dunn:     { name: 'Dunn', title: 'Head Miner', role: 'quest',
              look: { skin: '2', eyes: 'Male/Green', hairStyle: 'Standard', hairColour: 'Ginger', clothes: 'Blue', acc: 'Beard/Ginger' },
              intro: ['You\'re not one of mine. Lost?', { you: ['Just exploring.', 'I\'m new up here.'] },
                'Well, stay back from the gorge edge. It crumbles.', 'Dunn. I run the camp. Mostly I stop the tunnels falling in.',
                'The quarry\'s free to anyone with a pickaxe. The seams are another matter.'],
              hello: ['You again.', 'Morning, {name}. Mind your head.', '{name}. Still in one piece?'],
              lines: ['Pickaxe going blunt? Bram in town will sort you out.', 'Quarry\'s free. Help yourself. Leave some for the rest of us.'] },
  // Moonmere's mermaid, in her pool up on the teal shelf
  marven:   { name: 'Marven', title: 'The Lake Mermaid', role: 'quest', premade: MARVEN,
              intro: ['You found my pool. Not many do.', { you: ['Who are you?', 'Sorry to intrude.'] },
                'Marven. I\'ve lived in this lake since before there was a town.', 'Those stones out in the water stood on dry land once. That\'s how long.',
                'Come back if you ever have a reason to.'],
              hello: ['You came back, {name}.', 'Sit down a while, {name}.'],
              lines: ['People used to come up here all the time. Now it\'s mostly frogs.', 'Those stones out in the lake stood on dry land once. I remember it.',
                'The Ghost Catfish only come up at night. They don\'t like being looked at.'] },

  // THE NIGHT COURT (refinement 6): Silas keeps the graves, Wick rows the ferry, and two of the night folk keep the night
  // market before the Grand House -- out only after dark (`night`: play.js NIGHT_FOLK; their counter shuts by day)
  silas:    { name: 'Silas', title: 'The Gravedigger', role: 'quest',
              look: { skin: '2', eyes: 'Male/Black', hairStyle: 'Sebastian', hairColour: 'Black', clothes: 'Blue', acc: 'Beard/Black' },
              intro: ['Mind where you stand. Some of them are shallow.', { you: ['Sorry!', 'Who are you?'] },
                'Silas. I dig the graves and I keep them. Have done since I was a lad.', 'The night folk bury their own. I just make sure nobody forgets where.'],
              hello: ['{name}. Come to see the dead?', 'Evening, {name}. Or morning. It\'s all one to me.'],
              lines: ['Quiet lot, the dead. Better company than most.', 'If you hear the chapel bell, don\'t go looking for who rang it.',
                'The lights on the water? Follow one if you like. They always know the way somewhere.'] },
  wick:     { name: 'Wick', title: 'The Ferryman', role: 'ferry',
              look: { skin: '1', eyes: 'Male/Blue', hairStyle: 'Standard', hairColour: 'Blonde', clothes: 'Purple', acc: 'Beard/Blonde' },
              intro: ['Need the boat? Everybody needs the boat sooner or later.', { you: ['Where do you go?', 'Who are you?'] },
                'Wick. I row the marsh: the hollow, the isles, the far shore under the tower, the chapel.', 'Old Elias had the boat before me. He never took a coin for it, and nor do I.'],
              hello: ['Back for the boat, {name}?', 'Where to tonight?'],
              lines: ['Never trail your hand in the water. Not here.', 'The eels come up after dark. Big ones. Silas likes them for his supper.',
                'Elias used to say the lights on the water were the dead, looking for the way. I just row.'] },
  sable:    { name: 'Sable', title: 'The Night Market', role: 'shop', shop: 'nightmarket', night: true,
              look: { skin: '1', eyes: 'Female/Black', hairStyle: 'Silvermist', hairColour: 'Black', clothes: 'Purple', acc: '' },
              intro: ['A day-walker, at the market. How brave.', { you: ['What do you sell?', 'The night market?'] },
                'Sable. I keep the market when the court is awake.', 'Smoked eel, the best in the marsh. And I buy what the marsh gives you: fish, Glowcaps.',
                'We open at dusk. We shut before the light.'],
              hello: ['Welcome back to the dark, {name}.', 'The market\'s open, {name}.'],
              lines: ['Everything here was made by night. Day-made things don\'t keep.', 'The court buys from us. We buy from you. Everyone stays fed.'] },
  vesper:   { name: 'Vesper', title: 'The Lamplighter', role: 'talk', night: true,
              look: { skin: '1', eyes: 'Female/Blue', hairStyle: 'Lyria', hairColour: 'Black', clothes: 'Blue', acc: 'Wizard' },
              intro: ['Careful. You\'re standing in my light.', { you: ['Sorry.', 'Your light?'] },
                'Vesper. I light the fires along the causeway. They burn green. They always have.', 'Sit a while. I hear everything the night says.'],
              hello: ['Still out, {name}?', 'The night\'s young, {name}.'],
              lines: ['On the darkest nights, when even the moon stays in, they say someone stands on the old tower. Hooded. Watching.',
                'I\'ve seen him once. Once, in all my years. I was standing still at the tower\'s foot, looking up. You\'d have to be very lucky. Or very patient.',
                'Follow a light off the causeway and it\'ll lead you somewhere. It always does.',
                'The crypt on the lawn has been shut since before the Grand House was built. Silas has the key. He doesn\'t lend it.'] },

  // THE TOWNSFOLK (2026-09-26, the designer: "more NPCs, even without their own quests yet")
  jory:     { name: 'Jory', title: 'Old Sailor', role: 'talk', premade: SAILOR, home: 'fisherman',
              intro: ['Ahoy. Don\'t see many new faces on these docks.', { you: ['Hello there.', 'A sailor, then?'] },
                'Forty years at sea, and I ended up on a river. Funny how that goes.', 'Name\'s Jory. I mend nets now, and tell stories to anyone who\'ll sit still.',
                'Sit down sometime. I\'ve got stories. Most of them are even true.'],
              lines: ['Call this a river? You should see a storm at sea. Waves as big as houses.', 'I once saw a fish as big as a boat. Nobody believes me.', 'Rosa\'s reading my old logbook. Says it\'s a good story. It\'s all true, you know.'] },
  greta:    { name: 'Greta', title: 'Schoolteacher', role: 'talk', home: 'school',
              look: { skin: '2', eyes: 'Female/Brown', hairStyle: 'Lyria', hairColour: 'Brown', clothes: 'Purple', acc: '' },
              intro: ['Hello! Are you a new parent? No, you look too lost for that.', { you: ['I\'m new in town.', 'Is this a school?'] },
                'It is. I\'m Greta. I teach the children letters, sums and good manners.', 'Some days the manners are the hardest part.',
                'If you ever want to help with a lesson, you\'d be very welcome.'],
              lines: ['The children are learning about the seasons this week.', 'Quiet, please. Oh, sorry. Habit.', 'Every child in Bloomshire can name ten crops. I made sure of it.'] },
  mabel:    { name: 'Mabel', title: 'Pond Keeper', role: 'talk',
              look: { skin: '1', eyes: 'Female/Blue', hairStyle: 'Silvermist', hairColour: 'Brown', clothes: 'Pink', acc: '' },
              intro: ['Hello, dear. Would you like to feed the ducks?', { you: ['Maybe later.', 'I\'d love to.'] },
                'They\'re greedy things, but I love them. That one\'s Pudding.', 'I\'m Mabel. I\'ve lived in Bloomshire all my life.',
                'Sit with me some afternoon. I\'ll tell you how the town used to be.'],
              lines: ['Pudding has been eating too much bread again.', 'When I was a girl, this pond was twice the size.', 'Take care of yourself, dear. And eat properly.'] },
  ansel:    { name: 'Ansel', title: 'Chapel Keeper', role: 'talk',
              look: { skin: '1', eyes: 'Male/Blue', hairStyle: 'Standard', hairColour: 'Blonde', clothes: 'Blue', acc: 'Beard/Blonde' },
              intro: ['Hello, friend. The chapel\'s open to anyone who wants a quiet moment.', { you: ['Thank you.', 'Do you work here?'] },
                'I look after it. I ring the bell, sweep the floor and keep the graves tidy.', 'I\'m Ansel. It\'s peaceful work. I recommend it.',
                'Come by whenever the town gets too loud.'],
              lines: ['The bell rings at dawn and at dusk. You\'ll get used to it.', 'Some of these graves are older than the town itself.', 'The roof leaks over the third pew. Sit somewhere else when it rains.'] },
  dara:     { name: 'Dara', title: 'Orchard Keeper', role: 'talk',
              look: { skin: '3', eyes: 'Female/Green', hairStyle: 'Fawn', hairColour: 'Black', clothes: 'Green', acc: 'Farm' },
              intro: ['Careful where you step. The fallen cherries are slippery.', { you: ['Lovely trees!', 'Your orchard?'] },
                'The orchard belongs to the town. I just look after it.', 'I\'m Dara. Cherries, oranges, and apricots that never quite ripen.',
                'Hollis\'s hens love it in here. They think I don\'t notice.'],
              lines: ['Blossom season is my favourite. The whole orchard turns pink.', 'Don\'t climb the trees. I know you want to. Don\'t.', 'If you see a hen in here, it\'s probably the pale gold one.'] },
  cole:     { name: 'Cole', title: 'Farmhand', role: 'talk',
              look: { skin: '4', eyes: 'Male/Brown', hairStyle: 'Josh', hairColour: 'Black', clothes: 'Green', acc: '' },
              intro: ['Morning. You here to help, or just to look at the cows?', { you: ['Just looking.', 'I could help.'] },
                'Either way, you\'re welcome. They\'re good cows. Better company than most people.', 'I\'m Cole. I work the paddock for Hollis. Feeding, mucking out, the lot.',
                'If Hollis ever needs an extra pair of hands, I\'ll send them your way.'],
              lines: ['The brown cow bit me yesterday. We\'re not speaking.', 'Mucking out\'s not so bad once you stop breathing through your nose.', 'Hollis says I talk to the cows too much. He talks to the goats.'] },
  fenwick:  { name: 'Fenwick', title: 'Postmaster', role: 'talk',
              look: { skin: '2', eyes: 'Male/Black', hairStyle: 'Sebastian', hairColour: 'Brown', clothes: 'Red', acc: 'Beret' },
              intro: ['Letters! No? Sorry, I say that to everyone.', { you: ['That\'s all right.', 'The postman?'] },
                'Postmaster, if you please. I\'m Fenwick. Every letter in Bloomshire goes through my hands.', 'Nothing happens here without me hearing about it.',
                'If you want to know what\'s going on in town, ask me. I usually know.'],
              lines: ['Tamsin\'s baking something new. The whole square smells of it.', 'Word is the miners found something odd up at Stonepeak.', 'No letters for you today. Maybe tomorrow.'] },
  ivy:      { name: 'Ivy', title: 'Flower Seller', role: 'talk',
              look: { skin: '1', eyes: 'Female/Green', hairStyle: 'Iridessa', hairColour: 'Ginger', clothes: 'Pink', acc: 'Butterfly/Pink' },
              intro: ['Flowers? Fresh this morning. Well, yesterday. Mostly fresh.', { you: ['They\'re lovely.', 'Hi! I\'m new here.'] },
                'Thank you! I\'m Ivy. I grow them myself, out past the allotments.', 'People buy them for birthdays, for apologies, and for no reason at all.',
                'The last kind is my favourite.'],
              lines: ['Sunflowers are selling well this week.', 'Tulips for sorry, sunflowers for thank you. That\'s what I tell people. I made it up.', 'Juniper says some flowers can heal. I just think they\'re pretty.'] },
  otto:     { name: 'Otto', title: 'Lamplighter', role: 'talk',
              look: { skin: '3', eyes: 'Male/Blue', hairStyle: 'Standard', hairColour: 'Black', clothes: 'Purple', acc: '' },
              intro: ['Evening. Or it will be, soon. Then I get to work.', { you: ['What do you do?', 'Hello.'] },
                'I light the lamps. Every one of them, every night, all over town.', 'I\'m Otto. It\'s a long walk, but I like seeing the town in the dark.',
                'If you\'re ever out late, you\'ll know I\'ve been by.'],
              lines: ['I\'ve counted the lamps in this town a thousand times. Still not sure I\'ve got it right.', 'The lamp by the bridge always goes out first. Nobody knows why.',
                'I sleep all day. People think I\'m lazy. I\'m not. I just work nights.'] },
  lena:     { name: 'Lena', title: 'Gardener', role: 'talk',
              look: { skin: '2', eyes: 'Female/Black', hairStyle: 'Fawn', hairColour: 'Blonde', clothes: 'Green', acc: '' },
              intro: ['Oh, hello! Sorry, I\'ve got mud on everything.', { you: ['That\'s all right.', 'What\'s growing?'] },
                'Beans, mostly. And cabbages. And one very ambitious pumpkin.', 'I\'m Lena. These allotments are for anyone in town who wants a patch.',
                'You\'ve got your own island, though. Lucky you.'],
              lines: ['Slugs got my lettuce again.', 'The secret is good soil. Everyone says it\'s water. It\'s soil.', 'My pumpkin is going to win a prize one day.'] },
  hugo:     { name: 'Hugo', title: 'The Miller', role: 'talk',
              look: { skin: '1', eyes: 'Male/Green', hairStyle: 'Josh', hairColour: 'Ginger', clothes: 'Blue', acc: 'Beard/Ginger' },
              intro: ['Hello there! Don\'t stand too close to the sails.', { you: ['Is it your mill?', 'Hello!'] },
                'It is. Hugo, the miller. Wheat goes in, flour comes out.', 'Tamsin buys most of my flour. Without me, there\'s no bread in Bloomshire.',
                'Grow some wheat one day. Tamsin can never get enough of it.'],
              lines: ['The wind\'s good today. The mill\'s happy.', 'I\'ve got flour in places I didn\'t know I had.', 'Every loaf in town started here.'] },
  rosa:     { name: 'Rosa', title: 'Reader', role: 'talk',
              look: { skin: '4', eyes: 'Female/Brown', hairStyle: 'Silvermist', hairColour: 'Black', clothes: 'Blue', acc: '' },
              intro: ['Hm? Oh, sorry. I was in the middle of a chapter.', { you: ['What\'s the book?', 'Sorry to bother!'] },
                'A story about sailors lost at sea. Jory lent it to me. I think it\'s about him.', 'I\'m Rosa. I come here every afternoon when the weather\'s nice.',
                'It\'s the best spot in town. Don\'t tell anyone.'],
              lines: ['Only three chapters left.', 'Jory says the book is all true. I\'m not so sure.', 'Have you been up to Moonmere? I hear it\'s beautiful.'] },
  // THE SWEETHEARTS (2026-10-22, the designer: "we want new characters which are young, not old ... the men should look
  // like men ... the woman chin need to be smaller, a bit sharper"; then "they need to be different ... an elf girl, an
  // elf boy ... in Everbloom"): eight young townsfolk (game/hearts.js), their faces their own (`face`: fifteen 64 px faces
  // in the townsfolk's own layout, made by design/sweethearts/make_portraits.py from the pack's townsfolk portrait: their
  // hair, clothes, hats and marks their own, the women's chins a little sharper), their bodies villagers
  jasper:   { name: 'Jasper', title: 'Boatwright', role: 'talk', face: 'qart/portraits/jasper.png',
              look: { skin: '3', eyes: 'Male/Brown', hairStyle: 'Standard', hairColour: 'Black', clothes: 'Blue', acc: '' },
              intro: ['Mind the tar, it\'s still wet.', { you: ['Your boat?', 'Hello!'] },
                'Jasper. I mend the town\'s boats, and build a new one when somebody\'s brave enough to pay for it.', 'If yours ever leaks, bring her here. I won\'t laugh. Much.'],
              lines: ['The river\'s high today. Good for launching.', 'I can tell a boat\'s age by the smell of her. Don\'t ask how.',
                'Wren says my knots are fancy. They\'re not fancy, they\'re correct.'] },
  felix:    { name: 'Felix', title: 'Fiddler', role: 'talk', face: 'qart/portraits/felix.png',
              look: { skin: '1', eyes: 'Male/Blue', hairStyle: 'Sebastian', hairColour: 'Blonde', clothes: 'Red', acc: 'Beret' },
              intro: ['A new face! Stop, stop, I need a rhyme for you.', { you: ['A rhyme?', 'Who are you?'] },
                'Felix. I play by the fountain, for coins and for the pigeons, who are a tough crowd.', 'Come back when I\'ve thought of a rhyme. It might take a while.'],
              lines: ['Requests are welcome. Requests for silence are not.', 'Otto hums along with me. Badly. I love it.',
                'Every town has a tune. Bloomshire\'s is in a major key. Mostly.'] },
  rhys:     { name: 'Rhys', title: 'Farmhand', role: 'talk', face: 'qart/portraits/rhys.png',
              look: { skin: '2', eyes: 'Male/Green', hairStyle: 'Josh', hairColour: 'Brown', clothes: 'Red', acc: 'Farm' },
              intro: ['Oh, hello. Sorry, I was miles away. Thinking about beans.', { you: ['Beans?', 'Who are you?'] },
                'Rhys. I work Hazel\'s fields by the greenhouse. Turning soil, mostly. And thinking about beans.', 'If you ever need a hand with your own field, ask. I like digging.'],
              lines: ['Rain\'s coming, I think. Or not. The soil can\'t decide.', 'Hazel says I\'m the best digger she\'s ever had. I\'m the only one she\'s had.',
                'My little sister sent me a drawing of a carrot. I keep it in my pocket.'] },
  clara:    { name: 'Clara', title: 'Baker\'s Apprentice', role: 'talk', face: 'qart/portraits/clara.png',
              look: { skin: '1', eyes: 'Female/Blue', hairStyle: 'Fawn', hairColour: 'Blonde', clothes: 'Pink', acc: '' },
              intro: ['Oh! Hello! You\'re the one from the river, aren\'t you? Everybody\'s been talking.', { you: ['That\'s me.', 'Who are you?'] },
                'Clara. Tamsin\'s niece. I do the early bake, and the late bake, and most of the bakes in between.', 'Come by in the morning. The first buns come out at six, and they\'re the best ones.'],
              lines: ['Flour gets everywhere. Everywhere.', 'Aunt Tamsin says I knead like I\'m angry at the dough. I\'m not angry. I\'m thorough.',
                'One day there\'ll be a bakery with my name on it. Blue door.'] },
  elsie:    { name: 'Elsie', title: 'Painter', role: 'talk', face: 'qart/portraits/elsie.png',
              look: { skin: '2', eyes: 'Female/Brown', hairStyle: 'Iridessa', hairColour: 'Black', clothes: 'Purple', acc: '' },
              intro: ['Oh. Don\'t mind me. I\'m trying to catch the light before it moves.', { you: ['What light?', 'Who are you?'] },
                'Elsie. I paint. Mostly the river, sometimes the people who walk by it.', 'You\'d make a good painting. Something about the way you stand.'],
              lines: ['The light here is different every hour. I\'ll never finish.', 'I traded Hugo a painting for a sack of flour. He hung it upside down.',
                'Green is the hardest colour. There are a hundred greens in that garden.'] },
  willa:    { name: 'Willa', title: 'Beekeeper', role: 'talk', face: 'qart/portraits/willa.png',
              look: { skin: '3', eyes: 'Female/Green', hairStyle: 'Lyria', hairColour: 'Ginger', clothes: 'Blue', acc: '' },
              intro: ['Careful, slow steps! The bees don\'t mind you if you don\'t mind them.', { you: ['Are they yours?', 'Who are you?'] },
                'Willa. These are my bees. Well. I\'m their Willa, is more how they see it.', 'Come by when the clover\'s out. The honey tastes like summer.'],
              lines: ['The bees are happy today. Listen to them.', 'I\'ve never been stung. The bees know I mean well.',
                'Dara lets me keep the hives by the orchard. The cherries have never been better.'] },
  // ...and the two of Everbloom, the elf city beyond the arch of roots (Book One opens it)
  faelan:   { name: 'Faelan', title: 'Bloom Warden', role: 'talk', face: 'qart/portraits/faelan.png',
              look: { skin: '1', eyes: 'Male/Green', hairStyle: 'Josh', hairColour: 'Blonde', hairTint: 'silver', clothes: 'Green', acc: 'Elf/1' },
              intro: ['A human. Here. The arch let you through?', { you: ['It did.', 'Who are you?'] },
                'Faelan. I keep the paths of the elf city, and the gardens round the Heart Tree.', 'No human has walked here in my lifetime. Forgive me if I stare.'],
              lines: ['The Heart Tree hums at dusk. Stand still and you can hear it.', 'Your town has bread? Tell me about bread.',
                'We count our years in blossoms. By ours, I am barely grown.'] },
  liora:    { name: 'Liora', title: 'Fountain Singer', role: 'talk', face: 'qart/portraits/liora.png',
              look: { skin: '1', eyes: 'Female/Blue', hairStyle: 'Silvermist', hairColour: 'Blonde', hairTint: 'silver', clothes: 'Blue', acc: 'Elf/1' },
              intro: ['Oh! A human! Stand still, let me look at you.', { you: ['Hello?', 'Who are you?'] },
                'Liora. I sing the evening song at the fountain. Every evening, the same song, since I was small.', 'You are the most interesting thing that has happened here in years.'],
              lines: ['The fountain sings back if you hum the right note. Try it.', 'The elders frown at me. I frown back. It is a fair arrangement.',
                'Is it true that humans dance at harvest? Show me one day.'] },
  // THE SUNLANDS (2026-10-16, the Sunlands' fifth refinement): the last of the tomb keepers, and a stall still kept
  aurel:    { name: 'Aurel', title: 'Tomb Keeper', role: 'talk',
              look: { skin: '3', eyes: 'Male/Brown', hairStyle: 'Standard', hairColour: 'Blonde', clothes: 'Green', acc: 'Beard/Blonde' },
              intro: ['You came up the old road? Hardly anybody did, until this spring.', { you: ['I was curious.', 'Who are you?'] },
                "I'm Aurel. I keep the tombs. Somebody has to sweep the names clean.", "My family has done it since the floods. I'm the last of us.",
                "Mind the steps on the hill. The fires up there haven't been lit in a long time."],
              lines: ["They say the Sun King's fires burned every night once. You could see them from the sea.",
                'The Golden Paladin built that wall with his own hands. The water came anyway.',
                'The fountain in the square ran with water from the hills. Then the aqueduct fell, and that was that.',
                "The Saint's door won't open for me. Maybe it's waiting for someone else.",
                'That scholar keeps digging by my tombs. He says it is for history. I say put the turf back.',
                'Folk on the road again, carts and sheep and children. The dead must wonder what all the noise is.'] },
  nella:    { name: 'Nella', title: 'Stallkeeper', role: 'talk',
              look: { skin: '2', eyes: 'Female/Brown', hairStyle: 'Lyria', hairColour: 'Black', clothes: 'Red', acc: '' },
              intro: ['Oh! A customer! Well. A visitor. Close enough.', { you: ['Selling things?', 'Who comes here?'] },
                'Olives, figs, whatever the hills give. More of us come up from the river villages every month.', "I'm Nella. This was my grandmother's stall. Her grandmother's too.",
                "It's a real market day again. Teodor shouts now, which is how you know."],
              lines: ["The grapes on the far bank are the sweetest. Don't tell the birds.",
                'The old presses are still standing. Corin has one working. Mostly.',
                'The fish in the river are fat and lazy. The ponds have something else in them.',
                'My stripes have faded. They were red once. Proper red.'] },
  // THE SUNLANDS RECLAIMED (2026-10-16, the designer's last refinement: "it doesn't look like there's much going on ...
  // it doesn't look like it has some purpose"): the river villages' folk come back up to the old kingdom, each at
  // their work where they stand (`doing`: a villager.js action, worked in strokes with a breath between)
  teodor:   { name: 'Teodor', title: 'Fruit Seller', role: 'talk',
              look: { skin: '4', eyes: 'Male/Brown', hairStyle: 'Josh', hairColour: 'Brown', clothes: 'Green', acc: 'Farm' },
              intro: ['Figs! Grapes! Olives cured three ways! Oh. You are new.', { you: ['Is this a market?', 'Three ways?'] },
                "It's market day. The first real one up here since my father was a boy.", "I'm Teodor. We came up from the river villages in the spring, a few families at first.",
                'Now look at it. Stalls with roofs on. Somebody even swept.'],
              lines: ['The figs by the old villas are the best. Nobody planted them. They just kept going.',
                'Nella says I shout too much. A market needs shouting.',
                'The olives here were famous once. Ships came in from the sea for them.',
                'When the fountain runs again this square will be full every week. You watch.'] },
  brenna:   { name: 'Brenna', title: 'Mason', role: 'talk', doing: 'pickaxe', strokes: 3, rest: 1.6,
              look: { skin: '2', eyes: 'Female/Green', hairStyle: 'Fawn', hairColour: 'Ginger', clothes: 'Blue', acc: '' },
              intro: ['Mind your head. Stone falls up here. Usually on purpose.', { you: ['What is this?', 'Can I help?'] },
                "I'm Brenna. Mason, like my mother. We're putting the aqueduct back.", 'One span at a time. Cut the stone, lift the stone, shout at the stone.',
                'When the water reaches the square, the whole place comes back to life. That is the idea, anyway.'],
              lines: ['Every block up there was cut by hand. So is every block down here. Some things never change.',
                'The old masons marked their stones with little suns. Look closely at the piers.',
                'Three spans are down past the road. Those are the bad ones.',
                "The scaffold's safe. Probably. Don't climb it."] },
  sefa:     { name: 'Sefa', title: 'Shepherd', role: 'talk', doing: 'flute',
              look: { skin: '3', eyes: 'Female/Brown', hairStyle: 'Silvermist', hairColour: 'Blonde', clothes: 'Green', acc: 'Farm' },
              intro: ['Shh. They are nearly asleep.', { you: ['The sheep?', 'Sorry!'] },
                'The sheep. And the goats, though goats never sleep, they only pretend.', "I'm Sefa. I brought the flock up when the grass came back. My grandfather kept sheep on these same fields.",
                'The old fold was still standing. Stones remember what they are for.'],
              lines: ['A tune keeps them close. A bad tune keeps them closer.',
                "The goats go up the Sun King's hill. They like the view, I think.",
                'One of my goats is missing again. She always comes back fatter.',
                'Wool, cheese and a quiet life. Ask me again in a year if it is quiet.'] },
  corin:    { name: 'Corin', title: 'Vintner', role: 'talk', doing: 'sickle', strokes: 2, rest: 2.2,
              look: { skin: '1', eyes: 'Male/Green', hairStyle: 'Sebastian', hairColour: 'Brown', clothes: 'Purple', acc: '' },
              intro: ["Careful, those are this year's. Well. This year's first.", { you: ['You make wine?', 'Whose vines?'] },
                "Nobody's, for a long time. Now mine, until somebody argues.", "I'm Corin. The vines went wild but they never stopped fruiting. I'm cutting them back to something sensible.",
                'The old press by the field still works. Mostly. I mended it with rope.'],
              lines: ['Prune hard and the vine thanks you. Prune soft and it eats the field.',
                'The grapes on the far bank are sweeter, Nella says. Nella is wrong.',
                'The birds take a share. I let them. They were here first.',
                'Wine wants time. Lucky for me, so does everything else up here.'] },
  pim:      { name: 'Pim', title: 'Fisher', role: 'talk', doing: 'fishWait',
              look: { skin: '2', eyes: 'Male/Blue', hairStyle: 'Standard', hairColour: 'Ginger', clothes: 'Blue', acc: '' },
              intro: ['Quiet, please. The fish can hear you think.', { you: ['Catching much?', 'Sorry.'] },
                "Not yet. I'm Pim. I fish the river for the market, and I mend nets for the camp when it rains.",
                "My family came up from the river villages with Teodor's. The boat on the bank was my grandfather's.",
                'The river runs clean and fast up here. Down in the villages it is all mud.'],
              lines: ['Wade in by the bridge and the water knocks you flat. Fish the slow bend instead.',
                'The ponds by the old flood wall are murky. Something big lives in the deepest one.',
                'Fish in the crate, boat on the bank, nothing biting. A good day all the same.',
                'When the wind is off the sea you can smell the salt all the way up here.'] },
  oriel:    { name: 'Oriel', title: 'Pilgrim', role: 'talk', doing: 'sit',
              look: { skin: '4', eyes: 'Female/Blue', hairStyle: 'Lyria', hairColour: 'Black', clothes: 'Purple', acc: '' },
              intro: ['Peace to you, traveller.', { you: ['Who are you?', 'Are you praying?'] },
                "Waiting, mostly. I'm Oriel. I walked here from the coast, as the old pilgrims did.",
                "They came to the Saint's door at dawn, every one of them, to ask her blessing on the road ahead.",
                'The door does not open now. I come anyway. Somebody should keep the habit.'],
              lines: ['The Saint healed the sick on these steps, the old songs say. Hands full of light.',
                'In the old days pilgrims slept in the square. Tents, lanterns, singing all night.',
                'Aurel keeps the dead. I keep the living company. Between us the place is not empty.',
                'The old pilgrims spoke of a road beyond the door, to halls where it is always dawn.'] },
  aldous:   { name: 'Aldous', title: 'Scholar', role: 'talk', doing: 'shovel', strokes: 2, rest: 2.6,
              look: { skin: '1', eyes: 'Male/Blue', hairStyle: 'Standard', hairColour: 'Blonde', clothes: 'Green', acc: 'Beret' },
              intro: ['Ah! Do not step there. That is very old dirt.', { you: ['Digging for what?', 'Old dirt?'] },
                "I'm Aldous. I study the old kingdom, which is why I am covered in it.",
                'The Sun King left three gifts to this land, the old books say. Daybreak, Mending and Aegis.',
                'Fire, water and a shield. I mean to find where each one sleeps.'],
              lines: ['Paving! Real paving, two feet down. There was a road here before the road.',
                'The tombs are older than the chapel. Aurel does not like it when I say so.',
                "The Paladin by the flood wall holds Aegis in stone. Or holds a very good copy. I can't tell yet.",
                'Every pot I find is broken. That is how you know it is old.'] },
  // FROSTHAVEN'S FOLK (2026-10-18, the designer's second refinement: "it kind of feels very empty"): the frost folk,
  // cousins of the dwarves, at their work round the hot springs, on the lake's ice and at the stair's foot
  hakon:    { name: 'Hakon', title: 'Ice Fisher', role: 'talk', doing: 'fishWait',
              look: { skin: '1', eyes: 'Male/Blue', hairStyle: 'Standard', hairColour: 'Ginger', clothes: 'Blue', acc: 'Beard/Ginger' },
              intro: ['Shh. You will scare them back under the ice.', { you: ['Under the ice?', 'Catching any?'] },
                "I'm Hakon. I keep the holes open and the village fed. Every morning I chop them clear again.",
                'The lake freezes a hand thick in one night. The fish do not mind. They are slow and fat and very foolish.',
                'Bring a rod. There are three holes, and the fish are not mine alone.'],
              lines: ['The far hole, out by the south shore, is where the big ones are. They bite slowly.',
                'Old Gunnar says the lake never froze this early when he was young. He says that about everything.',
                'Something knocked on the ice under me last week. From below. I have not fished the north end since.',
                'Keep your boots dry. Wet boots, and the frost will have your toes.'] },
  sigrun:   { name: 'Sigrun', title: 'Smith', role: 'talk', doing: 'pickaxe', strokes: 3, rest: 1.4,
              look: { skin: '2', eyes: 'Female/Green', hairStyle: 'Fawn', hairColour: 'Black', clothes: 'Red', acc: '' },
              intro: ['Stand back from the sparks. They do not care whose coat they land on.', { you: ['Making what?', 'So hot in here!'] },
                "I'm Sigrun. My forge has burned since my grandmother's grandmother lit it.",
                'Spearheads, mostly, this winter. And nails. Always nails.',
                'The frost folk learned iron from our cousins under the mountain. The cold we learned from nobody.'],
              lines: ['Good iron rings like a bell. Bad iron sulks.',
                'The watch on the stair wants new spears. Toke says it is only a precaution.',
                'Bjorn keeps me in charcoal. I keep him in axes. A fair trade.',
                'Frost gets into a blade if you let it. Oil it, and keep it by the fire.'] },
  bjorn:    { name: 'Bjorn', title: 'Woodcutter', role: 'talk', chore: 'woodcut',
              look: { skin: '3', eyes: 'Male/Brown', hairStyle: 'Josh', hairColour: 'Blonde', clothes: 'Green', acc: 'Beard/Blonde' },
              intro: ['Mind the chips. They fly further than you think.', { you: ['Cutting firewood?', 'So many logs!'] },
                "It is never a lot of logs. Not in Frosthaven. I'm Bjorn.",
                'Every house burns through a woodpile a week in the deep winter. I cut, Sigrun forges, Hakon fishes.',
                'And when the wood runs out, the springs keep us warm.'],
              lines: ['Holly berries go on the doors at midwinter. The children pick them.',
                'The deer come down to the edge of the wood at dawn. Leave them be.',
                'Split with the grain. Fight the grain, and the log fights back.',
                'One tree a day from the edge of the wood, never more. By spring the wood has given it back.'] },
  ylva:     { name: 'Ylva', title: 'Path Keeper', role: 'talk', doing: 'shovel', strokes: 2, rest: 2.4,
              look: { skin: '1', eyes: 'Female/Blue', hairStyle: 'Silvermist', hairColour: 'Blonde', clothes: 'Purple', acc: '' },
              intro: ['Morning! Mind where you step, I have only done this bit.', { you: ['All the paths?', 'Can I help?'] },
                "Every path in the village, every morning. I'm Ylva.",
                'It snows in the night, I shovel in the day. The snow and I have an understanding.',
                'If you want to help, walk where I have already been.'],
              lines: ["The heaps of snow by the paths are mine. The snowmen on top of them are the children's.",
                'The hall steps first, always. Nobody wants an elder sliding down them.',
                'When the frost is really bad, the snow squeaks under your boots. Listen.',
                'Liv plays while I work. The shovelling goes quicker.'] },
  gunnar:   { name: 'Gunnar', title: 'Elder', role: 'talk', doing: 'sit',
              look: { skin: '4', eyes: 'Male/Black', hairStyle: 'Standard', hairColour: 'Blonde', clothes: 'Blue', acc: 'Beard/Blonde' },
              intro: ['Sit, sit. The stones are warm by the springs. One of the few warm things left.', { you: ['The elder?', 'Warm springs?'] },
                "I'm Gunnar. The oldest, at least. Elder is a word other people use.",
                'The springs come up warm from deep under the valley. The first frost folk built their houses round them, and so here we all are.',
                "Up the stair, at the top of the world, is the Frost Wraith's step. That is where the frost is kept. Or was."],
              lines: ['The frost kept the north safe for longer than anyone remembers. Now it is failing. You can see it past the lake.',
                'There are tracks out of the great ice cave. Big ones. Nobody goes near it now.',
                'My grandfather said Rime sleeps up on the step, waiting for someone worth waking for.',
                'When I was young the waterfall still ran in summer. Now it never thaws.'] },
  liv:      { name: 'Liv', title: 'Musician', role: 'talk', doing: 'flute',
              look: { skin: '2', eyes: 'Female/Brown', hairStyle: 'Lyria', hairColour: 'Ginger', clothes: 'Pink', acc: '' },
              intro: ['Oh! Was I too loud? The cold makes everything ring.', { you: ['It sounds lovely.', 'What song is it?'] },
                "A winter song. The old frost songs, the ones the children learn. I'm Liv.",
                'There is a song for every season, but here it is mostly winter, so I know the winter ones best.',
                'They say the frost itself taught us the songs. I think somebody made them up on a cold night.'],
              lines: ['Play by the springs and the steam dances. I am sure of it.',
                'There is an old song about the Frost Wraith. Nobody sings the last verse.',
                "My flute is bone and silver. My mother's, and hers before that.",
                'If you hear music in the night, it is not me. I am asleep.'] },
  toke:     { name: 'Toke', title: 'Watchman', role: 'talk',
              look: { skin: '3', eyes: 'Male/Green', hairStyle: 'Sebastian', hairColour: 'Brown', clothes: 'Green', acc: 'Beard/Brown' },
              intro: ['Halt. Oh. You are not from the north. Good.', { you: ['Watching what?', 'What\'s up there?'] },
                "Whatever comes down. I'm Toke. I keep the watch at the foot of the stair.",
                "Up there is the Frost Wraith's step, and past it the far north, where the frost begins.",
                'The frost kept things out for a very long time. Lately I keep a spear handy as well.'],
              lines: ['The stair is safe to climb. The top is safe to stand on. Past that, I would not.',
                'The braziers stay lit all night. Fire and frost, the old guard.',
                'Sigrun is making new spears. Only a precaution.',
                'The view from the step is worth the climb. You can see the whole valley.'] },
  inga:     { name: 'Inga', title: 'Fishmonger', role: 'talk',
              look: { skin: '1', eyes: 'Female/Green', hairStyle: 'Iridessa', hairColour: 'Brown', clothes: 'Blue', acc: '' },
              intro: ['Fresh fish! Frozen fish! All the fish here is frozen fish, really.', { you: ['Who caught these?', 'Furs too?'] },
                "Hakon, mostly, out on the lake. I'm Inga. I salt them, dry them and sell them.",
                'Furs too, yes. Hare and fox, from the trappers up the valley. Warm as an oven.',
                'And holly berries in the basket. Not for eating. For the doors.'],
              lines: ['The drying racks are down by the shore. Up here the fish freeze dry in a week.',
                'Never buy fish from anyone who has not been out on the ice themselves.',
                'Gunnar takes his fish salted. Liv takes hers smoked. Toke takes whatever is going.',
                'Market day is every day the snow lets us.'] },
  eira:     { name: 'Eira', title: 'Hunter', role: 'talk', doing: 'sit',
              look: { skin: '3', eyes: 'Female/Green', hairStyle: 'Fawn', hairColour: 'Black', clothes: 'Green', acc: '' },
              intro: ['Easy. Come in to the fire, slowly. You walk like a deer, and I nearly took you for one.', { you: ['Living out here?', 'What do you hunt?'] },
                "Through the winter, yes. I'm Eira. Hare and fox, mostly, for their furs. Inga sells them in the village.",
                'The wood is quiet in the snow. You hear everything coming a long way off.',
                'Lately I hear things I do not like, up past the old garden. I keep the fire high at night.'],
              lines: ['A white fox is worth three red ones. And ten times harder to see.',
                'The old garden? The frost folk grew roots there. Nobody goes now. Something walks there at night.',
                'Follow the tracks in the snow and you learn who lives in a wood. And who hunts in it.',
                'The pond in the south wood freezes first every year. The children skate on it when nobody is looking.'] },

  // THE VIP QUARTER (2026-10-08, the designer: "every shop will have an NPC ... There will also be a few other NPCs in
  // around the VIP area"): a keeper in each of its rooms, the golden boat's boatman, the Celestial Garden's keeper, and a
  // resident. Words only (the counter sells: game/seedshop.js; the Exchange opens later)
  celeste:  { name: 'Celeste', title: 'The VIP Shop', role: 'seeds', shop: 'vipshop',
              look: { skin: '1', eyes: 'Female/Blue', hairStyle: 'Lyria', hairColour: 'Blonde', clothes: 'Blue', acc: '' },
              intro: ['Welcome to the VIP Shop. Do come in.', { you: ['Hello!', 'What do you sell?'] },
                'Premium Seeds. Only those. I\'m Celeste.', 'Plant one in the premium beds outside. In fifteen minutes you\'ll see what it became.',
                'Nobody knows which crop it will be. That\'s rather the point.'],
              hello: ['Ah, {name}. Back for more seeds?', 'Good day, {name}.', '{name}! Lovely to see you.'],
              lines: ['Fifteen seeds for a dollar. The bigger bundles are kinder.', 'Most become peppers or berries. Some become something rarer.',
                'I polish this counter twice a day. Nobody notices.'] },
  augustin: { name: 'Augustin', title: 'The VIP Exchange', role: 'talk',
              look: { skin: '2', eyes: 'Male/Black', hairStyle: 'Sebastian', hairColour: 'Black', clothes: 'Purple', acc: '' },
              intro: ['Ah. A visitor. Please, mind the ledgers.', { you: ['Sorry!', 'Is it open?'] },
                'Not quite. I\'m Augustin. I keep the Exchange.', 'We open soon. Everything must balance first. To the last coin.'],
              hello: ['{name}. Good day.', 'Ah, {name}. Still not open, I\'m afraid.'],
              lines: ['Soon. Very soon. I\'m checking the numbers one more time.', 'A ledger that doesn\'t balance keeps me up at night.',
                'When we open, you\'ll be among the first to know.'] },
  sylvie:   { name: 'Sylvie', title: 'The Library', role: 'talk',
              look: { skin: '3', eyes: 'Female/Brown', hairStyle: 'Silvermist', hairColour: 'Black', clothes: 'Green', acc: '' },
              intro: ['Shh. Oh, sorry. Hello.', { you: ['Hi.', 'Can I read here?'] },
                'You can. That\'s what the shelves are for. I\'m Sylvie.', 'Press E at a shelf to read. And please put nothing back in the wrong place.'],
              hello: ['Hello, {name}. Quietly, now.', 'Oh, {name}. Welcome back.'],
              lines: ['I\'ve read every book in here twice. Some three times.', 'Quietly, please. The books don\'t like shouting.',
                'A library is the quietest place in any town. I made sure of it.'] },
  pemberton: { name: 'Pemberton', title: 'The Manor', role: 'talk',
              look: { skin: '1', eyes: 'Male/Blue', hairStyle: 'Standard', hairColour: 'Black', clothes: 'Blue', acc: 'Beard/Black' },
              intro: ['Good day. Welcome to the Manor.', { you: ['Thank you.', 'Who are you?'] },
                'Pemberton. I keep the house in order.', 'The rooms are yours to wander. Please don\'t touch the vases.'],
              hello: ['Good day, {name}.', 'Welcome back to the Manor, {name}.'],
              lines: ['Every room is dusted by noon. Every one.', 'The vases are older than I am. Much older.',
                'I\'ve dusted that chandelier four times today. It insists.'] },
  fern:     { name: 'Fern', title: 'The Greenhouse', role: 'talk',
              look: { skin: '4', eyes: 'Female/Green', hairStyle: 'Fawn', hairColour: 'Ginger', clothes: 'Green', acc: 'Farm' },
              intro: ['Oh, hello! Careful, the ferns are shy.', { you: ['Hello!', 'Nice plants.'] },
                'Thank you. I\'m Fern. Yes, really. My mother thought it was funny.', 'Everything in here is for looking at. The premium beds outside are for growing.'],
              hello: ['Hello, {name}! Mind the pots.', 'Oh, {name}. Come and see the orchid.'],
              lines: ['Premium crops don\'t need watering. Lucky them.', 'Talk to your plants. It helps. Mostly it helps me.',
                'That orchid bloomed three times this week. Show off.'] },
  theo:     { name: 'Theo', title: 'The Golden Boat', role: 'talk',
              look: { skin: '3', eyes: 'Male/Brown', hairStyle: 'Josh', hairColour: 'Brown', clothes: 'Blue', acc: 'Beret' },
              intro: ['Welcome ashore! Mind the step.', { you: ['Thanks!', 'Nice boat.'] },
                'Isn\'t she? Gold to the waterline. I\'m Theo.', 'I row pass holders between town and the Quarter. Any time, any weather.',
                // (the way to the dungeon, told on the way in: 2026-10-27, design/vip-small/entrances/dungeon_approach.py)
                'Looking for a fight? The Dungeon is west along the main walk, past the Library. Look for the fires.'],
              hello: ['Ahoy, {name}!', 'Ready to sail, {name}?'],
              lines: ['Ready when you are. Just step into the boat.', 'Rain or snow, she floats. I\'ve checked.', 'I polish her every morning. She deserves it.',
                'The Dungeon? West along the walk, past the Library. You can\'t miss the fires.'] },
  iris:     { name: 'Iris', title: 'The Celestial Garden', role: 'garden',
              look: { skin: '2', eyes: 'Female/Blue', hairStyle: 'Iridessa', hairColour: 'Blonde', clothes: 'Purple', acc: '' },
              intro: ['Hello. You\'ve found the Celestial Garden.', { you: ['What is this?', 'Pretty pedestals.'] },
                'I\'m Iris. I look after the pedestals.', 'Set Crystal Grapes, a Starbloom or a Celestial Pineapple on one. It harvests $AVYN for you every day.'],
              hello: ['Hello, {name}.', 'Come to collect, {name}?'],
              lines: ['The rarer the crop, the bigger its share of the day\'s $AVYN.', 'Only a hundred Celestial Pineapples will ever grow. Imagine having one.',
                'Come back and collect. The pedestals don\'t mind waiting.'] },
  amelia:   { name: 'Lady Amelia', title: 'Resident', role: 'talk',
              look: { skin: '1', eyes: 'Female/Green', hairStyle: 'Lyria', hairColour: 'Ginger', clothes: 'Pink', acc: '' },
              intro: ['Oh, a new face! How delightful.', { you: ['Hello!', 'Do you live here?'] },
                'Near the Manor, darling. I\'m Lady Amelia.', 'The fountain is lovely at this hour. It\'s always this hour here, you know.'],
              hello: ['{name}, darling!', 'Oh, it\'s you. Wonderful.'],
              lines: ['Have you tried the Sunfire Chili? Terribly spicy. I had three.', 'The snow here never bothers anyone. Very civilised.',
                'Someone grew a Starbloom yesterday. I was so jealous.'] },
};
// HOW THE TOWNSFOLK SAY HELLO (the designer, 2026-09-27: "there is no greeting when the player goes to the NPC"):
// the first words of any talk after the first meeting, {name} being yours
const HELLO = {
  jory: ['Ahoy, {name}.', 'Well, if it isn\'t {name}. Sit down, sit down.'],
  greta: ['Hello, {name}! Walking, not running, I hope.', 'Oh, {name}. Good afternoon.'],
  mabel: ['Hello, dear.', 'Oh, it\'s you, {name}. Come and sit.'],
  ansel: ['Peace to you, {name}.', 'Hello, friend.'],
  dara: ['Oh, it\'s you, {name}. I thought you were a hen.', 'Hello! Lovely day for it.'],
  cole: ['Morning, {name}.', 'All right, {name}?'],
  fenwick: ['{name}! Letters? No. Sorry. Habit.', 'Ah, {name}. Heard the news?'],
  ivy: ['Flowers, {name}? Go on.', 'Oh, hi, {name}!'],
  otto: ['Evening, {name}. Or near enough.', 'Hello there.'],
  lena: ['Hello, {name}. Careful of the beds.', 'Hi! Have you seen my pumpkin? Look at it.'],
  hugo: ['{name}! Pardon the flour.', 'Morning!'],
  rosa: ['Oh! Hello, {name}.', 'Hi, {name}. Just one more page...'],
  jasper: ['Ahoy, {name}. Mind the tar.', 'Oh, hello, {name}.'],
  felix: ['{name}! My favourite audience.', 'Ah, {name}. Sit, listen.'],
  rhys: ['Morning, {name}.', 'Oh, hello, {name}.'],
  clara: ['Morning, {name}! Bun?', 'Oh, hi, {name}!'],
  elsie: ['Oh, hello, {name}.', '{name}! Stand there a moment. Perfect.'],
  willa: ['Hello, {name}! The bees say hello too.', 'Oh, it\'s you! Lovely.'],
  faelan: ['Well met, {name}.', '{name}! The arch let you back.'],
  liora: ['{name}! You came back!', 'Oh, it is you. Good. I was bored.'],
  aurel: ['Ah. {name}. You came back.', 'Peace on the road, {name}.'],
  nella: ['{name}! Market day, is it?', 'Hello again!'],
  teodor: ['{name}! Figs?', 'Back again! Good, good.'],
  brenna: ['Mind the stones, {name}.', 'Oh, it is you. Hello.'],
  sefa: ['Hello, {name}. Softly now.', 'Back to hear the tune?'],
  corin: ['{name}. Mind the vines.', 'Hello again!'],
  pim: ['Shh. Hello, {name}.', 'Nothing yet. Hello.'],
  oriel: ['Peace to you, {name}.', 'Welcome back, friend.'],
  aldous: ['{name}! Come and look at this. No, this.', 'Ah, my assistant. Unpaid.'],
  hakon: ['Quietly, {name}. They are biting.', 'Back for the fish, {name}?'],
  sigrun: ['{name}. Mind the sparks.', 'Warm yourself by the forge, {name}.'],
  bjorn: ['{name}! Grab an axe. No? Fair enough.', 'Morning, {name}.'],
  ylva: ['Walk where I have been, {name}!', 'Hello, {name}. More snow last night.'],
  gunnar: ['Ah, {name}. Sit a while.', 'The springs are warm today, {name}.'],
  liv: ['{name}! Shall I play you one?', 'Hello, {name}. Cold enough for you?'],
  toke: ['All quiet, {name}.', '{name}. Nothing from the north today.'],
  inga: ['{name}! Fish? Furs? Fish?', 'Back again, {name}. Good.'],
  eira: ['Sit by the fire, {name}.', '{name}. Quiet out here today.'],
};
for (const [id, h] of Object.entries(HELLO)) if (NPCS[id]) NPCS[id].hello ??= h;

/** The spots a map gives its people: zones tagged npc:<id>. [{ id, def, x, y (feet), facing, zone }] */
export function peopleOn(doc) {
  const out = [];
  for (const z of doc?.zones ?? []) {
    const tag = (z.tags ?? []).find((t) => t.startsWith('npc:')), id = tag?.slice(4);
    if (!id || !NPCS[id]) continue;
    const face = (z.tags ?? []).find((t) => t.startsWith('face:'))?.slice(5);
    out.push({ id, def: NPCS[id], x: Math.round(z.x + z.w / 2), y: Math.round(z.y + z.h / 2) + 4, facing: ['up', 'down', 'left', 'right'].includes(face) ? face : 'down', zone: z });
  }
  return out;
}

const DIR_ROW = { down: 0, up: 1, left: 2, right: 3 };
const PREMADE_FEET = 28;                        // the premade people's feet, from the top of their 32 px frame
const VILLAGER_HEAD = 20;                       // a villager's head (or hat) over its feet (villager.js: feet 26, hair from row ~7)
const WALK_SPEED = 50;                          // px a second: an unhurried walk (the player strolls at about this)
const LOG_BUNDLE = 'region/Objects/Frost Log Bundle.png';   // (what the woodcutter carries home)

/** The people on the map being played: drawn among the objects by depth, solid underfoot, and found by E. */
export class Townsfolk {
  /**
   * `shown(zone)`: is this person here at this point of the story (game/quests.js shownFor)?
   * `route([x, y], [x, y])`: a way round what is solid -- [[x, y], ...] -- or null (Play's own collision);
   * `exit(x, y)`: the nearest way out of the map, a point a door takes you from, or null;
   * `home(p)`: the door someone goes home by at night, and comes out of in the morning, or null.
   */
  constructor(doc, { image, files, shown = () => true, route = null, exit = null, home = null, work = null }) {
    this.image = image; this.shown = shown; this.route = route; this.exit = exit; this.home = home; this.work = work;
    this.view = null;                                                // (the part of the map on screen: movers())
    this.all = peopleOn(doc);
    const spots = new Map();
    for (const p of this.all) {
      p.hx = p.x; p.hy = p.y; p.home = p.facing;
      spots.set(p.id, (spots.get(p.id) ?? 0) + 1);
      if (!p.def.premade) {
        p.rig = new Villager(files, image, { ...DEFAULT_LOOK, ...p.def.look });
        // (their face, for the dialogue box: made from their look; or, the sweethearts', a sheet of their own in the same
        //  layout -- design/sweethearts/make_portraits.py)
        p.portrait = p.def.face ? () => { const r = image(p.def.face); return r.state === 'ok' ? r.img : null; } : () => (p.faceSheet ??= portraitSheet(p.def.look, image));
      }
    }
    for (const p of this.all) p.moves = spots.get(p.id) > 1;                  // someone the story moves about this map
    // A CHORE (2026-10-19, Frosthaven, the designer: "an NPC is using an axe somewhere which doesn't even make any sense
    // ... there is a tree, and that NPC does cut the tree ... then take those tree logs and then go to his home"): the
    // map says where: zones tagged chop:<id> (where they stand to cut a tree, and face:), drop:<id> (where the logs
    // go), home:<id> (their door). The world draws the trees (`work`: game/frostfx.js).
    for (const p of this.all) {
      if (!p.def.chore) continue;
      const mine = (k) => (doc?.zones ?? []).filter((z) => (z.tags ?? []).includes(`${k}:${p.id}`)).map((z) => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 + 4, face: (z.tags.find((t) => t.startsWith('face:')) ?? 'face:down').slice(5) }));
      p.chopAt = mine('chop'); p.dropAt = mine('drop')[0] ?? null; p.doorAt = mine('home')[0] ?? null;
      p.moves = true;
    }
    this.people = [];
    this.refresh(true);
    this.t = 0;
  }

  /** Who is here now: asked again whenever the story moves. Someone the story now wants elsewhere on this map
   *  walks there; someone it takes away walks out by the nearest door. (`first`: as the map opens, everyone
   *  simply is where they belong.) `why` 'weather': the night or the rain came, or went -- everyone out walks home
   *  by their own door, and back out of it to their spot. */
  refresh(first = false, why = null) {
    const weather = why === 'weather';
    const next = this.all.filter((p) => this.shown(p.zone));
    const before = new Map(this.people.filter((p) => !p.leaving).map((p) => [p.id, p]));
    const out = [];
    for (const p of next) {
      if (p.def.chore && (first || weather)) { p.job = null; p.carry = false; p.hidden = false; }
      const old = before.get(p.id) ?? (weather ? this.people.find((q) => q === p && q.leaving) : null);   // (turned back on the way home)
      before.delete(p.id);
      p.leaving = false; p.unseen = false;
      if (old === p && !p.path) { out.push(p); continue; }
      if (!first && old) { p.x = old.x; p.y = old.y; p.facing = old.facing; this.#walk(p, [p.hx, p.hy]); }
      else if (!first && weather && this.#comeOut(p)) { /* out of their door, on their way to their spot */ }
      else { p.x = p.hx; p.y = p.hy; p.facing = p.home; p.path = null; }
      out.push(p);
    }
    if (!first) {
      for (const [, old] of before) {
        // (someone with no legs to walk on -- a mermaid -- slips back into the water where she is)
        if (old.def.premade && !old.def.premade.walk) continue;
        const door = (weather ? this.home?.(old) : null) ?? this.exit?.(old.x, old.y);
        if (door && this.#walk(old, door, !weather)) { old.leaving = true; out.push(old); }
        else if (weather) { old.leaving = true; old.unseen = true; old.path = null; out.push(old); }    // (no way: gone once out of sight)
      }
    }
    for (const p of this.people) if (p.leaving && !out.includes(p) && !next.includes(p)) out.push(p);   // (on their way out already)
    this.people = out;
  }
  /** Walk p to `to` round what is in the way. No way there: false -- and (`jump`) p is simply there. */
  #walk(p, to, jump = true) {
    const path = this.route?.([p.x, p.y], to);
    if (!path?.length) { if (jump) { p.x = to[0]; p.y = to[1]; p.path = null; p.facing = p.home; } return false; }
    p.path = path;
    return true;
  }
  /** Out of their door in the morning (home()), walking to their spot. False: no door, or no way from it. */
  #comeOut(p) {
    const door = this.home?.(p), path = door && this.route?.(door, [p.hx, p.hy]);
    if (!path?.length) return false;
    p.x = door[0]; p.y = door[1]; p.path = path;
    return true;
  }
  /** Out of sight: off the part of the map on screen (with room for a whole person). */
  #unseenNow(p) {
    const v = this.view;
    return !v || p.x < v.x0 - 24 || p.x > v.x1 + 24 || p.y < v.y0 - 8 || p.y > v.y1 + 40;
  }
  /** Anyone walking anywhere? */
  get walking() { return this.people.some((p) => p.path); }

  update(dt) {
    this.t += dt;
    // (everyone's walking pictures, a moment after the map opens: anyone may walk home at nightfall)
    if (!this.warmed && this.t > 2) {
      this.warmed = true;
      for (const p of this.all) {
        const pm = p.def.premade;
        if (pm) { if (pm.walk) this.image(pm.walk); } else for (const f of p.rig.files('walk')) this.image(f);
      }
    }
    // (someone with no way home: gone, once you look away)
    if (this.people.some((p) => p.unseen)) this.people = this.people.filter((p) => !(p.unseen && this.#unseenNow(p)));
    for (const p of this.people) if (p.def.chore && this.work && !p.leaving && !p.unseen) this.#chore(p, dt);
    for (const p of this.people) {
      if (!p.path) continue;
      let step = (p.carry ? 0.8 : 1) * WALK_SPEED * dt;
      while (step > 0 && p.path.length) {
        const [tx, ty] = p.path[0], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        if (d > 0.01) p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (d <= step) { p.x = tx; p.y = ty; p.path.shift(); step -= d; continue; }
        p.x += (dx / d) * step; p.y += (dy / d) * step; step = 0;
      }
      if (p.path.length) continue;
      p.path = null;
      if (p.leaving) { p.leaving = false; this.people = this.people.filter((q) => q !== p); }
      else if (!p.job) p.facing = p.home;
    }
  }
  /** THE WOODCUTTER'S DAY: to a tree at the wood's edge, a few blows and a breath, again, until it comes down away from
   *  the axe; the logs up over the head and home with them, set down on the pile; in at the door a while; out, and to
   *  the next tree. A felled tree comes back while nobody looks (the world's regrow). */
  #chore(p, dt) {
    const W = this.work, j = (p.job ??= { st: 'rest', e: 0, wait: 1.5, k: -1 });
    j.e += dt;
    const go = (to, st) => { const path = this.route?.([p.x, p.y], [to.x, to.y]); if (!path?.length) return false; p.path = path; j.st = st; j.e = 0; return true; };
    switch (j.st) {
      case 'rest': if (j.e >= j.wait) { j.st = 'pick'; j.e = 0; } break;
      case 'pick': {
        const spots = p.chopAt ?? [];
        for (let n = 0; n < spots.length; n++) {
          j.k = (j.k + 1) % spots.length;
          const s = spots[j.k];
          s.tree ??= W.treeAt(s.x, s.y, s.face);
          if (!s.tree) continue;
          if (W.felled(s.tree)) { if (W.seen(s.tree)) continue; W.regrow(s.tree); }
          if (go(s, 'toTree')) { j.spot = s; return; }
        }
        j.st = 'rest'; j.e = 0; j.wait = 10; break;
      }
      case 'toTree': if (!p.path) { p.facing = j.spot.face; j.st = 'chop'; j.e = 0; j.n = 0; } break;
      case 'chop': {
        // (blows in threes, a breath between; a blow lands at its sixth of a swing's frames)
        const cyc = ACTIONS.axe.fpb / ACTIONS.axe.fps, grp = 3 * cyc + 0.8, BLOWS = 7;
        const hitAt = (n) => Math.floor(n / 3) * grp + (n % 3) * cyc + cyc * 0.66;
        while (j.n < BLOWS && j.e >= hitAt(j.n)) { W.chop(j.spot.tree); j.n++; }
        if (j.n >= BLOWS && j.e >= hitAt(BLOWS - 1) + cyc * 0.5) { W.fell(j.spot.tree, j.spot.face === 'left' ? -1 : 1); j.st = 'falling'; j.e = 0; }
        break;
      }
      case 'falling': if (j.e >= 2.0) { j.st = 'pickup'; j.e = 0; } break;
      case 'pickup': if (j.e >= 0.45) { W.take(j.spot.tree); p.carry = true; if (!(p.dropAt && go(p.dropAt, 'toDrop'))) { j.st = 'putdown'; j.e = 0; } } break;
      case 'toDrop': if (!p.path) { p.facing = p.dropAt.face; j.st = 'putdown'; j.e = 0; } break;
      case 'putdown': if (j.e >= 0.45) { p.carry = false; if (!(p.doorAt && go(p.doorAt, 'toDoor'))) { j.st = 'rest'; j.e = 0; j.wait = 6; } } break;
      case 'toDoor': if (!p.path) { p.hidden = true; j.st = 'inside'; j.e = 0; j.wait = 8 + Math.random() * 7; } break;
      case 'inside': if (j.e >= j.wait) { p.hidden = false; p.facing = 'down'; j.st = 'pick'; j.e = 0; } break;
    }
  }
  /** What a chore has someone doing this moment, to draw: an action and its time, or null for standing. */
  #choreDraw(p) {
    const j = p.job;
    if (!j) return null;
    if (p.path) return { act: p.carry ? 'carryWalk' : 'walk', t: this.t };
    if (j.st === 'chop') {
      const cyc = ACTIONS.axe.fpb / ACTIONS.axe.fps, grp = 3 * cyc + 0.8, ph = j.e % grp;
      return ph < 3 * cyc ? { act: 'axe', t: ph % cyc } : null;
    }
    if (j.st === 'pickup') return { act: 'pickup', t: j.e };
    if (j.st === 'putdown') return { act: 'throw', t: j.e };
    if (p.carry) return { act: 'carryIdle', t: this.t };
    return null;
  }
  /** Load everything a person is drawn with (their standing frames, and walking ones for the story's movers). */
  preload() {
    for (const p of this.all) {
      const pm = p.def.premade;
      if (pm) { this.image(pm.sheet); this.image(pm.portrait); if (pm.walk && p.moves) this.image(pm.walk); }
      else {
        if (p.def.face) this.image(p.def.face); else for (const f of portraitLayers(p.def.look)) this.image(f);
        for (const f of p.rig.files('idle')) this.image(f); if (p.moves) for (const f of p.rig.files('walk')) this.image(f); if (p.def.doing) for (const f of p.rig.files(p.def.doing)) this.image(f);
        if (p.def.chore) { for (const a of ['axe', 'carryWalk', 'carryIdle', 'pickup', 'throw']) for (const f of p.rig.files(a)) this.image(f); this.image(LOG_BUNDLE); }
      }
    }
  }
  /** How far above their feet the top of someone's head is (their name plate points there). */
  headOf(p) { return p.def.premade?.head ?? VILLAGER_HEAD; }
  /** What stops you: a small box at the feet of each person standing still (someone walking steps round you). */
  solids() { return this.people.filter((p) => !p.path && !p.hidden).map((p) => ({ x: p.x - 6, y: p.y - 6, w: 12, h: 7, npc: p.id })); }
  /** Does anyone standing still stand in the box [x0, x1) x [y0, y1)? */
  blocks(x0, y0, x1, y1) {
    for (const p of this.people) {
      if (p.path || p.hidden) continue;
      if (x1 > p.x - 6 && x0 < p.x + 6 && y1 > p.y - 6 && y0 < p.y + 1) return true;
    }
    return false;
  }
  /** The person you face within reach of (x, y), your feet, facing that way -- or null. (Reach is a
   *  counter's depth: a keeper stands behind it, you in front of it.) */
  facing(x, y, facing, reach = 44) {
    let best = null, bd = reach;
    for (const p of this.people) {
      if (p.leaving || p.hidden) continue;
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy);
      const ahead = facing === 'up' ? dy < 4 : facing === 'down' ? dy > -4 : facing === 'left' ? dx < 4 : dx > -4;
      if (d < bd && ahead) { bd = d; best = p; }
    }
    return best;
  }
  /** Each person as a thing that stands at its feet (Play draws them among the objects by depth). */
  movers(rect) {
    this.view = rect;
    const out = [];
    for (const p of this.people) {
      if (p.hidden || p.x < rect.x0 - 32 || p.x > rect.x1 + 32 || p.y < rect.y0 - 32 || p.y > rect.y1 + 40) continue;
      out.push({ y: p.y, p, draw: (g) => this.draw(g, p) });
    }
    return out;
  }
  /**
   * A person among things laid in the designer's order rather than by depth (a room's furniture, which you
   * walk over): drawn over it all, then whatever stands in front of their feet -- the counter, the table --
   * laid back over them, only where they are. So a keeper's counter hides their legs.
   */
  drawAmong(g, p, things, drawThing) {
    const front = p.path ? this.#front(p, things, false) : p.front?.get(things) ?? this.#front(p, things);
    if (!front.length) { this.draw(g, p); return; }
    const c = (p.cut ??= Object.assign(document.createElement('canvas'), { width: 48, height: 48 }));
    const q = c.getContext('2d'), ox = Math.round(p.x) - 24, oy = Math.round(p.y) - 36;
    q.setTransform(1, 0, 0, 1, 0, 0);
    q.globalCompositeOperation = 'source-over';
    q.clearRect(0, 0, 48, 48);
    q.imageSmoothingEnabled = false;
    q.setTransform(1, 0, 0, 1, -ox, -oy);
    this.draw(q, p);
    q.globalCompositeOperation = 'source-atop';
    for (const o of front) drawThing(q, o);
    q.globalCompositeOperation = 'source-over';
    g.drawImage(c, ox, oy);
  }
  /** The things in front of a person (their base below the feet) that overlap them. Kept while they stand. */
  #front(p, things, keep = true) {
    const x0 = p.x - 24, x1 = p.x + 24, y0 = p.y - 36, y1 = p.y + 12;
    const out = things.filter((o) => {
      const b = o.rot ? bounds(o) : o;
      return b.y + b.h > p.y && b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0;
    });
    if (keep) (p.front ??= new Map()).set(things, out);
    else p.front = null;
    return out;
  }
  draw(g, p) {
    const x = Math.round(p.x), y = Math.round(p.y);
    g.fillStyle = 'rgba(0, 0, 0, 0.22)';
    g.beginPath(); g.ellipse(x, y - 1, 5, 2, 0, 0, Math.PI * 2); g.fill();
    const pm = p.def.premade;
    if (pm) {
      // walking, with a walking sheet: its six frames a direction; else the standing four
      let sheet = pm.sheet, n = 4, fps = 4;
      if (p.path && pm.walk && this.image(pm.walk).state === 'ok') { sheet = pm.walk; n = 6; fps = 9; }
      const rec = this.image(sheet);
      if (rec.state !== 'ok') return;
      const f = Math.floor(this.t * fps + (p.hx % 7)) % n, row = pm.dirs === 1 ? 0 : DIR_ROW[p.facing];
      if (pm.grid) g.drawImage(rec.img, f * 32, row * 32, 32, 32, x - 16, y - PREMADE_FEET, 32, 32);
      else g.drawImage(rec.img, (pm.dirs === 1 ? f : row * n + f) * 32, 0, 32, 32, x - 16, y - PREMADE_FEET, 32, 32);
      return;
    }
    const t = this.t + (p.hx % 5) * 0.37;
    if (p.hidden) return;
    if (p.job) {                                                         // (at a chore: game/frostfx.js draws the trees)
      const d = this.#choreDraw(p);
      if (!(d && p.rig.draw(g, d.act, p.facing, d.t, x, y))) p.rig.draw(g, 'idle', p.facing, t, x, y);
      if (p.carry) {                                                     // (the logs, up over the head)
        const lg = this.image(LOG_BUNDLE);
        if (lg.state === 'ok') g.drawImage(lg.img, Math.round(x - lg.img.width / 2), Math.round(y - 34 + (p.path ? Math.floor(this.t * 10) % 2 : 0)));
      }
      return;
    }
    if (p.path && p.rig.draw(g, 'walk', p.facing, t, x, y)) return;
    // AT WORK (2026-10-16, the Sunlands reclaimed: "it doesn't look like there's much going on"): someone with `doing` (a
    // villager.js action: pickaxe, shovel, sickle, hoe, fishWait, flute, sit...) works at it where they stand, a few
    // strokes (`strokes`), a breath (`rest` seconds), again; a lasting one (fishing, the flute, sitting) without pause
    const w = p.def.doing, act = w && ACTIONS[w];
    if (act && !p.path) {
      const cyc = act.fpb / act.fps, strokes = p.def.strokes ?? 3, rest = act.loop ? 0 : p.def.rest ?? 1.4, period = cyc * strokes + rest;
      const ph = t % period;
      if (act.loop || ph < cyc * strokes) { if (p.rig.draw(g, w, p.facing, act.loop ? t : ph % cyc, x, y)) return; }
    }
    p.rig.draw(g, 'idle', p.facing, t, x, y);
  }
}

/* ---------------------------------------------------------------------------------------------------- their faces */
//
// THE PORTRAITS (2026-10-22, the designer: "every NPC should have a portrait when talking to those NPCs. We already have
// portraits inside our asset pack, with all expressions"). The pack's portrait layers (Character/Character/Portrait/PNG)
// are sheets of fifteen 64 px faces, five across: a smile, talking, "oh", downcast, a frown; the same again (under the
// effects layer's sparkles, "!" and cross mark); and the five with the eyes shut. Stacked as the pack's own premade
// faces are (measured against them: skin, eyes, clothes, hair, an elf's ears over the hair, the hat or beard, the
// effects) for a villager's own look, they are that person's face. The premade people (the blacksmith, the chef, the
// mermaids, the old sailor) have the pack's own sheets: eight faces, four across.

const PORTRAIT = 'Character/Character/Portrait/PNG/';
// (the villager's accessory as the portrait layers name it, where the two differ)
const PORTRAIT_ACC = { 'pirate eye patch': 'Pirate eyepatch', 'Santa hat': 'Santa Hat' };

/** A look's portrait layers, bottom first, and which one is the effects (drawn on the sheet's lower half only). */
export function portraitLayers(look) {
  const L = { ...DEFAULT_LOOK, ...look }, sex = String(L.eyes).startsWith('Female') ? 'Female' : 'Male';
  const style = L.hairStyle === 'Standard' ? 'Standart' : L.hairStyle;
  const hair = style === 'Lyria' && L.hairColour === 'Blonde' ? 'blonde' : L.hairColour;      // (the pack's own spelling)
  const acc = String(L.acc ?? ''), elf = acc.startsWith('Elf/');
  return [
    `${PORTRAIT}Skins/${sex}/${L.skin}.png`, `${PORTRAIT}Eyes/${String(L.eyes).split('/').pop()}.png`,
    `${PORTRAIT}Clothers/${sex}/${L.clothes}.png`, `${PORTRAIT}Hair/${style}/${hair}.png`,
    ...(elf ? [`${PORTRAIT}Skins/Ears/Elf/${L.skin}.png`] : acc ? [`${PORTRAIT}Acc/${PORTRAIT_ACC[acc] ?? acc}.png`] : []),
    `${PORTRAIT}FX.png`,
  ];
}

/**
 * Someone's portrait sheet, made once its layers are in (null till then): 320 x 384, the fifteen faces plain above and
 * under the effects below (frame + 15) -- so a blink is not a sparkle.
 * @param image  the game's picture loader (an { img, state } record for a pack path)
 */
export function portraitSheet(look, image) {
  const recs = portraitLayers(look).map((f) => image(f));
  if (recs.some((r) => r.state !== 'ok' && r.state !== 'error') || recs[0].state !== 'ok') return null;
  const c = document.createElement('canvas'); c.width = 320; c.height = 384;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  recs.forEach((r, k) => {
    if (r.state !== 'ok') return;                                   // (a layer the pack lacks: the face without it)
    if (k < recs.length - 1) g.drawImage(r.img, 0, 0);
    g.drawImage(r.img, 0, 192);
  });
  return c;
}

/** How someone feels saying `words`: glad, oh (surprised), cross, sad, think, or plain -- read off the words. */
export function moodOf(words) {
  const w = String(words ?? '');
  if (/\b(hmph|thie(f|ves)|get out|go away|how dare|curse|blast it|leave me|enough of)\b/i.test(w)) return 'cross';
  if (/(\?!|!\?)/.test(w) || /^(oh|ah|whoa|wow|what)\b[!,.?]/i.test(w)) return 'oh';
  if (/\b(sorry|sadly|alas|grief|mourn|miss (him|her|them)|never came back|lost (him|her|them|my))\b/i.test(w)) return 'sad';
  if (/!|\b(welcome|thank|wonderful|lovely|delight|good to see|splendid|ha(ha)+)\b/i.test(w)) return 'glad';
  if (/\b(hmm+|perhaps|i wonder|maybe)\b/i.test(w)) return 'think';
  return 'plain';
}

// a villager's faces (portraitSheet): the two its mouth moves between, for each mood (the cross and the sad keep
// their eyes: no smile between their words), the first second's own face, the blink
const VILLAGER_FACES = {
  plain: { talk: [0, 1], blink: 10 }, think: { talk: [0, 1], blink: 10 },
  glad: { talk: [0, 1], first: [20, 21], blink: 10, laugh: [25, 26] },
  oh: { talk: [2, 1], first: [22, 22], blink: 12 },
  cross: { talk: [4, 3], first: [24, 24], blink: 14 },
  sad: { talk: [3, 4], blink: 13 },
};
// the premade people's eight: plain, glad, laughing, thinking, cross, sad, shocked, nervous
const PREMADE_FACES = { plain: 0, glad: 1, think: 3, cross: 4, sad: 5, oh: 6 };

/**
 * Which face someone shows: `since` seconds after they began saying `words` (talking a while, longer for more), at `t`
 * (blinks), `seed` their own (so two people do not blink as one). `villager`: their sheet is portraitSheet's.
 */
export function faceFrame(words, since, t, seed = 0, villager = true) {
  const mood = moodOf(words), len = String(words ?? '').length;
  if (!villager) return since < 1.6 && mood === 'glad' && /\bha(ha)+\b/i.test(words) ? 2 : PREMADE_FACES[mood] ?? 0;
  const f = VILLAGER_FACES[mood], talking = since < Math.min(3.2, 0.5 + len * 0.035);
  const open = Math.floor(since / 0.14) % 2;
  if (since < 1.1 && f.first) return f.first[talking ? open : 0];
  if (mood === 'glad' && /\bha(ha)+\b/i.test(words) && since < 2) return f.laugh[open];
  if (talking) return f.talk[open];
  const k = (t + seed * 0.731) % 3.7;                                   // (a blink every few seconds, a tenth of one)
  return k < 0.13 ? f.blink : f.talk[0];
}
