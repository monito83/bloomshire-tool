/**
 * scripts/build_logbook_seed.mjs — CONTENIDO INICIAL DE LA BITACORA
 *
 * Arma src/data/logbook_seed.json con guias en ingles y espanol hechas con datos del propio juego:
 *   - Guias del juego: la guia oficial (guidetext.js GUIDE), traducida con el traductor del juego.
 *   - Jefes: donde esta cada uno, su arma debil y la que no le hace nada, su escolta y sus premios
 *     (rules.js ENEMIES / BOSS_WEAPONS / BOSS_PRIZE, Bestiario oficial).
 *   - Armas y combate: armas forjadas por nivel (rules.js FORGED, recetas del codice), rarezas y la Mazmorra.
 *   - Como usar la tool: un recorrido por cada modulo con capturas (scripts/build_tool_guide.mjs).
 * Las imagenes son sprites del juego que ya vienen con la app ("game/beasts|items|portraits/<x>.png").
 * El panel de admin lo carga con "Reemplazar por el contenido inicial" (api/logbook-admin.js seed_reset).
 *
 * Uso: node scripts/build_logbook_seed.mjs [--src game-sources/v-<version>]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { installShims } from './lib/gameShims.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/logbook_seed.json');

function pickSource() {
  const i = process.argv.indexOf('--src');
  if (i > 0 && process.argv[i + 1]) return path.resolve(ROOT, process.argv[i + 1]);
  const base = path.join(ROOT, 'game-sources');
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => d.startsWith('v-') && fs.existsSync(path.join(base, d, 'js/game/guidetext.js'))) : [];
  if (!dirs.length) throw new Error('No hay ninguna descarga del juego en game-sources/v-*');
  return path.join(base, dirs.sort()[dirs.length - 1]);
}

const SRC = pickSource();
installShims(SRC);
const mod = (rel) => import(pathToFileURL(path.join(SRC, 'js', rel)).href);
const i18n = await mod('i18n.js');
await i18n.setLang('es', { keep: false });
const es = (s) => { const t = i18n.t(String(s)); return t || String(s); };

const { GUIDE } = await mod('game/guidetext.js');
const R = await mod('game/rules.js');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const bestiary = readJson('public/data/bloomshire/official/bestiary.json');
const codex = readJson('public/data/bloomshire/official/codex.json');
const meta = readJson('public/data/bloomshire/official/meta.json');
const beast = (id) => bestiary.beasts.find((b) => b.id === id) || {};
const item = (name) => codex.items.find((i) => i.name_en === name) || {};
const itemEs = (name) => item(name).name_es || es(name);

// ---------------------------------------------------------------- Sprites del juego
const PUBLIC = path.join(ROOT, 'public/data/bloomshire');
const icons = readJson('public/data/bloomshire/item_icons_map.json');
/** Ruta "game/<carpeta>/<archivo>.png" solo si el sprite existe en la app. */
const sprite = (folder, file) => (file && fs.existsSync(path.join(PUBLIC, folder, `${file}.png`)) ? `game/${folder}/${file}.png` : null);
const beastSprite = (id) => sprite('beasts', String(beast(id).art || '').replace(/^beasts\//, '').replace(/\.png$/, '') || id);
const itemSprite = (name) => sprite('items', String(icons[String(name).toLowerCase()] || '').split('/').pop().replace(/\.png$/, ''));
const SPRITE_FOLDERS = { b: 'beasts', i: 'items', p: 'portraits' };
const spriteRef = (ref) => { const [k, f] = String(ref || '').split(':'); return sprite(SPRITE_FOLDERS[k], f); };
/** Bloque galeria con sprites; descarta los que faltan. */
const gallery = (images, caption_en = '', caption_es = '') => {
  const list = images.filter((im) => im.path);
  return list.length ? [{ type: 'gallery', images: list, caption_en, caption_es }] : [];
};
const beastImage = (id) => ({ path: beastSprite(id), alt_en: beast(id).name_en, alt_es: beast(id).name_es || beast(id).name_en });
const itemImage = (name) => ({ path: itemSprite(name), alt_en: name, alt_es: itemEs(name) });

/** UUID estable a partir de un texto (asi volver a cargar el paquete da los mismos ids). */
const uid = (s) => {
  const h = crypto.createHash('sha1').update(`bloomshire-logbook:${s}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const fmt = (n, lang) => Number(n).toLocaleString(lang === 'es' ? 'es-AR' : 'en-US');
const range = (r, lang) => (Array.isArray(r) ? `${fmt(r[0], lang)}–${fmt(r[1], lang)}` : '—');

const sections = [
  { key: 'how-to-use', icon: '🧭', title_en: 'How to use the tool', title_es: 'Cómo usar la tool', description_en: 'A quick tour of every module: what it does, what it needs and how to get the most out of it.', description_es: 'Un recorrido rápido por cada módulo: qué hace, qué necesita y cómo sacarle el jugo.' },
  { key: 'guides', icon: '📜', title_en: 'Game guides', title_es: 'Guías del juego', description_en: "The game's own guide, topic by topic: energy, farming, cooking, crafting, quests, money and more.", description_es: 'La guía del propio juego, tema por tema: energía, cultivo, cocina, crafteo, misiones, dinero y más.' },
  { key: 'bosses', icon: '👑', title_en: 'Bosses', title_es: 'Jefes', description_en: 'Where each boss lives, the weapon it fears, who fights beside it and what it pays.', description_es: 'Dónde vive cada jefe, el arma que teme, quién pelea a su lado y qué paga.' },
  { key: 'weapons', icon: '⚔️', title_en: 'Weapons and combat', title_es: 'Armas y combate', description_en: 'How to forge every weapon, what rarity does, and the Dungeon.', description_es: 'Cómo forjar cada arma, para qué sirve la rareza y la Mazmorra.' }
].map((s, i) => ({ id: uid(`section:${s.key}`), parent_id: null, slug: s.key, sort: i * 10, status: 'published', ...s }));
const sectionId = (key) => sections.find((s) => s.key === key).id;

const entries = [];
const add = (section, slug, e) => entries.push({
  id: uid(`entry:${section}:${slug}`), section_id: sectionId(section), slug, status: 'published', author: 'Admin',
  sort: entries.filter((x) => x.section_id === sectionId(section)).length * 10, tags: [], places: [], cover_path: null, ...e
});

// ---------------------------------------------------------------- Como usar la tool (capturas de scripts/build_tool_guide.mjs)
const GUIDE_DIR = path.join(PUBLIC, 'guide');
/** Captura de la tool en el idioma de quien lee (path en ingles, path_es en espanol). */
const shot = (id, alt_en, alt_es, caption_en = '', caption_es = '') => {
  const en = `${id}_en.jpg`;
  const esFile = `${id}_es.jpg`;
  if (!fs.existsSync(path.join(GUIDE_DIR, en))) return [];
  return [{
    type: 'image', path: `game/guide/${en}`,
    ...(fs.existsSync(path.join(GUIDE_DIR, esFile)) ? { path_es: `game/guide/${esFile}` } : {}),
    alt_en, alt_es, caption_en, caption_es
  }];
};
const txt = (md_en, md_es) => ({ type: 'text', md_en, md_es });
const h2 = (text_en, text_es) => ({ type: 'heading', level: 2, text_en, text_es });
const ul = (items_en, items_es) => ({ type: 'list', ordered: false, items_en, items_es });
const ol = (items_en, items_es) => ({ type: 'list', ordered: true, items_en, items_es });
const note = (variant, md_en, md_es, title_en = '', title_es = '') => ({ type: 'callout', variant, title_en, title_es, md_en, md_es });
const link = (slug) => `#logbook/how-to-use/${slug}`;
const NEEDS = {
  free: ['Nothing: open to everyone', 'Nada: abierto para todos'],
  ext: ['Extension (for your game data)', 'Extensión (para los datos de tu partida)'],
  sign: ['Extension + wallet signature', 'Extensión + firma con la wallet']
};
const needs = (k) => note('note', `**Needs:** ${NEEDS[k][0]}. See [Connect your game](${link('connect')}).`, `**Necesita:** ${NEEDS[k][1]}. Mirá [Conectá tu partida](${link('connect')}).`);
const tour = (slug, cover, e) => add('how-to-use', slug, { tags: ['tool', 'tutorial'], cover_path: spriteRef(cover), ...e });

tour('start-here', 'i:starbloom', {
  title_en: 'Start here: what Bloomshire Tool does', title_es: 'Empezá acá: qué hace Bloomshire Tool',
  summary_en: 'A free community companion for Bloomshire: maps, guides, recipes, prices and your own game live, all in one place.',
  summary_es: 'Un compañero gratuito de la comunidad para Bloomshire: mapas, guías, recetas, precios y tu propia partida en vivo, todo en un lugar.',
  blocks: [
    txt('Bloomshire Tool puts everything you look up while playing in one place. Most of it works the moment you open it; connect your game to see your own inventory, orders and timers.',
      'Bloomshire Tool junta en un solo lugar todo lo que buscás mientras jugás. Casi todo funciona apenas la abrís; conectá tu partida para ver tu propio inventario, tus pedidos y tus temporizadores.'),
    ...shot('atlas', 'The Mega-Atlas with a sub-zone selected', 'El Mega-Atlas con una sub-zona elegida'),
    h2('Every module at a glance', 'Todos los módulos de un vistazo'),
    { type: 'table',
      md_en: `| Module | What it's for | Needs |\n|---|---|---|\n| [Mega-Atlas](${link('mega-atlas')}) | The whole world: zones, villagers, caves, secrets | — |\n| [Logbook](${link('logbook')}) | Guides, bosses, weapons and this tour | — |\n| [Item finder](${link('item-finder')}) | What any item is and where to get it | — |\n| [Crafting & cooking](${link('crafting')}) | Every recipe, by station | — |\n| [Villagers & gifts](${link('villagers')}) | What each villager loves and where they are | — |\n| [XP calculator](${link('xp-calculator')}) | What to plant for XP or gold | — |\n| [Economy](${link('economy')}) | Your inventory's worth, Odette's orders, the market | 🔒 |\n| [Timers](${link('timers')}) | Crops and cooking countdowns, daily tasks | 🔒 |\n| [Quests](${link('quests')}) | Your quests step by step and what's missing | 🔒 |`,
      md_es: `| Módulo | Para qué sirve | Necesita |\n|---|---|---|\n| [Mega-Atlas](${link('mega-atlas')}) | Todo el mundo: zonas, aldeanos, cuevas, secretos | — |\n| [Bitácora](${link('logbook')}) | Guías, jefes, armas y este recorrido | — |\n| [Buscador de ítems](${link('item-finder')}) | Qué es cualquier ítem y dónde conseguirlo | — |\n| [Crafteo y cocina](${link('crafting')}) | Todas las recetas, por estación | — |\n| [Aldeanos y regalos](${link('villagers')}) | Qué le encanta a cada aldeano y dónde está | — |\n| [Calculadora XP](${link('xp-calculator')}) | Qué plantar para ganar XP u oro | — |\n| [Economía](${link('economy')}) | Cuánto vale tu inventario, pedidos de Odette, el mercado | 🔒 |\n| [Temporizadores](${link('timers')}) | Cuentas regresivas de cultivos y cocina, tareas diarias | 🔒 |\n| [Misiones](${link('quests')}) | Tus misiones paso a paso y lo que te falta | 🔒 |` },
    note('tip', `The 🔒 modules open when you connect your game: [two quick steps](${link('connect')}).`, `Los módulos con 🔒 se abren cuando conectás tu partida: [dos pasos rápidos](${link('connect')}).`),
    note('note', 'The tool reads public game data and, if you install the extension, your own game. It never plays for you and never changes anything in your game.', 'La tool lee datos públicos del juego y, si instalás la extensión, tu propia partida. Nunca juega por vos ni cambia nada en tu partida.'),
    note('warning', "Bloomshire Tool is an **unofficial community tool**: it is not made or endorsed by the Bloomshire team, and it may contain mistakes or fall behind after a game update. Found a bug or have an idea? Write to **monito83** on Discord. If the tool helps you, the **Buy me a coffee** button at the bottom of the screen has the details.",
      'Bloomshire Tool es una **herramienta de la comunidad, no oficial**: no la hace ni la avala el equipo de Bloomshire, y puede tener errores o quedar atrasada después de una actualización del juego. ¿Encontraste un error o tenés una idea? Escribile a **monito83** por Discord. Si la tool te sirve, el botón **Invitame un cafecito** al pie de la pantalla tiene los datos.',
      'Unofficial tool', 'Herramienta no oficial')
  ]
});

tour('connect', 'i:amulet', {
  title_en: 'Connect your game (2 steps)', title_es: 'Conectá tu partida (2 pasos)',
  summary_en: 'The extension brings your game data; your wallet signature unlocks the 🔒 modules and the cloud save.',
  summary_es: 'La extensión trae los datos de tu partida; la firma con tu wallet desbloquea los módulos con 🔒 y la partida en la nube.',
  blocks: [
    txt('Press **Connect game** at the top. The window shows both steps and tells you which ones are done.', 'Tocá **Conectar partida** arriba. La ventana muestra los dos pasos y te dice cuáles ya están hechos.'),
    ...shot('connect', 'The connection window with its two steps', 'La ventana de conexión con sus dos pasos'),
    h2('Step 1: the Bloomshire Companion extension', 'Paso 1: la extensión Bloomshire Companion'),
    txt('It reads your game live while you play at bloomshire.xyz/play: inventory, chests, gold, energy, crops and crafting timers. It only reads; it never changes your game.', 'Lee tu partida en vivo mientras jugás en bloomshire.xyz/play: inventario, cofres, oro, energía, cultivos y temporizadores de crafteo. Solo lee; nunca cambia tu partida.'),
    ol(['In the connection window, press **Download extension (.zip)** and unzip it. You get a folder called **bloomshire-companion**.', 'Open **chrome://extensions** (brave://extensions in Brave, edge://extensions in Edge).', 'Turn on **Developer mode** (top-right switch).', 'Click **Load unpacked** and pick the **bloomshire-companion** folder.', 'Open your game at bloomshire.xyz/play and come back to the tool: it syncs on its own.'],
      ['En la ventana de conexión, tocá **Descargar extensión (.zip)** y descomprimilo. Te queda una carpeta llamada **bloomshire-companion**.', 'Abrí **chrome://extensions** (brave://extensions en Brave, edge://extensions en Edge).', 'Activá el **Modo de desarrollador** (el interruptor de arriba a la derecha).', 'Tocá **Cargar descomprimida** y elegí la carpeta **bloomshire-companion**.', 'Abrí tu partida en bloomshire.xyz/play y volvé a la tool: se sincroniza sola.']),
    note('tip', 'When there is a new version, the connection window tells you. To update, replace the folder with the new one and press ↻ on the extension card.', 'Cuando hay una versión nueva, la ventana de conexión te avisa. Para actualizar, reemplazá la carpeta por la nueva y tocá ↻ en la tarjeta de la extensión.', 'Updates', 'Actualizaciones'),
    h2('Step 2: sign with your wallet', 'Paso 2: firmá con tu wallet'),
    txt('Press **Connect and sign** and sign the message in your wallet (MetaMask, Rabby…). That proves the game is yours, unlocks the 🔒 modules and saves your game in the cloud so you can see it on any device. The session lasts 24 hours.', 'Tocá **Conectar y firmar** y firmá el mensaje en tu wallet (MetaMask, Rabby…). Eso prueba que la partida es tuya, desbloquea los módulos con 🔒 y guarda tu partida en la nube para verla en cualquier dispositivo. La sesión dura 24 horas.'),
    note('warning', 'You only sign a text message: there is no gas, no transaction and no approval to move funds. The tool will never ask for your seed phrase or private key; if anything ever does, close it.', 'Solo firmás un mensaje de texto: no hay gas, ni transacción, ni permiso para mover fondos. La tool nunca te va a pedir tu frase semilla ni tu clave privada; si algo te la pide, cerralo.', 'Safe by design', 'Seguro por diseño'),
    h2('What each step adds', 'Qué suma cada paso'),
    { type: 'table',
      md_en: '| | Your game data | 🔒 modules | Cloud save |\n|---|---|---|---|\n| Nothing | — | — | — |\n| Extension | ✅ live | — | — |\n| Wallet signature | only a copy saved before | ✅ | ✅ |\n| **Both** | ✅ | ✅ | ✅ |',
      md_es: '| | Datos de tu partida | Módulos 🔒 | Partida en la nube |\n|---|---|---|---|\n| Nada | — | — | — |\n| Extensión | ✅ en vivo | — | — |\n| Firma con la wallet | solo una copia guardada antes | ✅ | ✅ |\n| **Las dos** | ✅ | ✅ | ✅ |' }
  ]
});

tour('mega-atlas', 'p:ylva', {
  title_en: 'Mega-Atlas: the whole world on one map', title_es: 'Mega-Atlas: todo el mundo en un mapa',
  summary_en: 'Every region and sub-zone with its villagers, caves, fishing spots and quest secrets. Other modules send you here with "locate".',
  summary_es: 'Cada región y sub-zona con sus aldeanos, cuevas, lugares de pesca y secretos de misiones. Los demás módulos te mandan acá con "ubicar".',
  blocks: [
    ...shot('atlas', 'The Mega-Atlas', 'El Mega-Atlas'),
    ul(['**Left list:** every region and its sub-zones. Search by zone, villager, cave, fish or quest.', '**Map:** pick a zone to focus it. Hand, pointer and magnifier tools, zoom and quick travel at the bottom.', '**Layers:** turn on or off the HD art, sub-zones, signs, fishing, caves, villagers and secrets.', "**Right panel:** what's in the zone: villagers, quest clues, and the game's exploration book."],
      ['**Lista de la izquierda:** cada región y sus sub-zonas. Buscá por zona, aldeano, cueva, pez o misión.', '**Mapa:** elegí una zona para enfocarla. Herramientas de mano, puntero y lupa, zoom y viaje rápido abajo.', '**Capas:** prendé o apagá el arte HD, las sub-zonas, los carteles, la pesca, las cuevas, los aldeanos y los secretos.', '**Panel derecho:** lo que hay en la zona: aldeanos, pistas de misiones y el libro de exploración del juego.']),
    note('tip', 'With the extension and the game open in another tab, the **Update HD** button (↻, top right of the map) draws the 10 real game maps. They stay saved in your browser.', 'Con la extensión y el juego abierto en otra pestaña, el botón **Actualizar HD** (↻, arriba a la derecha del mapa) dibuja los 10 mapas reales del juego. Quedan guardados en tu navegador.', 'Real maps', 'Mapas reales'),
    needs('free')
  ]
});

tour('logbook', 'p:sylvie', {
  title_en: 'Logbook & guides', title_es: 'Bitácora y guías',
  summary_en: "Guides, bosses, weapons and this tour, in English and Spanish, with places you can open on the Mega-Atlas.",
  summary_es: 'Guías, jefes, armas y este recorrido, en inglés y en español, con lugares que se abren en el Mega-Atlas.',
  blocks: [
    ...shot('logbook', 'A boss entry in the Logbook', 'Una ficha de jefe en la Bitácora'),
    ul(['**Sections** on the left; every entry has a link you can copy and share.', '**Search** finds any word in any entry. **Place** filters entries about one zone.', 'Green place chips open that spot on the Mega-Atlas.', "Entries follow the tool's language; if one isn't translated yet, it says so."],
      ['**Secciones** a la izquierda; cada entrada tiene un enlace que podés copiar y compartir.', 'El **buscador** encuentra cualquier palabra en cualquier entrada. **Lugar** filtra las entradas de una zona.', 'Las etiquetas verdes de lugar abren ese punto en el Mega-Atlas.', 'Las entradas siguen el idioma de la tool; si alguna todavía no está traducida, lo avisa.']),
    needs('free')
  ]
});

tour('economy', 'p:rowan', {
  title_en: 'Economy: liquidator, Odette and market radar', title_es: 'Economía: liquidador, Odette y radar de mercado',
  summary_en: "What your backpack and chests are worth, today's orders from Odette and what sells best at Rowan's Market Hall.",
  summary_es: 'Cuánto valen tu mochila y tus cofres, los pedidos de hoy de Odette y qué se vende mejor en el Mercado de Rowan.',
  blocks: [
    h2('Inventory liquidator', 'Liquidador de inventario'),
    ...shot('economy_liquidator', 'The inventory liquidator', 'El liquidador de inventario'),
    ul(['Adds up what your backpack (M), home chest (CC) and town chest (CP) are worth in gold.', 'Shows how many of each you can still sell to the shop today and what is left over for the market or tomorrow.', 'Adjust the quantities to plan a sale.'],
      ['Suma cuánto oro valen tu mochila (M), el cofre de tu casa (CC) y el cofre del pueblo (CP).', 'Muestra cuántos de cada uno todavía podés vender hoy en la tienda y cuántos te sobran para el mercado o para mañana.', 'Ajustá las cantidades para planear una venta.']),
    h2("Odette's daily orders", 'Pedidos diarios de Odette'),
    ...shot('economy_odette', "Odette's orders", 'Los pedidos de Odette'),
    txt("Odette's board has **6 orders, plus 1 for every 3 Farming levels** (up to 16). Each pays half of what the goods are worth, plus experience. The tool marks the ones you can deliver now and where to get the rest. Orders change at 00:00 UTC.",
      'El tablero de Odette tiene **6 pedidos, más 1 cada 3 niveles de Cultivo** (hasta 16). Cada uno paga la mitad de lo que valen los productos, más experiencia. La tool marca los que podés entregar ya y dónde conseguir el resto. Los pedidos cambian a las 00:00 UTC.'),
    h2('Market radar', 'Radar de mercado'),
    ...shot('economy_radar', 'The market radar', 'El radar de mercado'),
    txt("Real sales from Rowan's Market Hall: what sells, for how much and how fast, matched against your stock. Press **Refresh sales** with the game open in another tab; while the radar is open it checks again every 5 minutes.",
      'Ventas reales del Mercado de Rowan: qué se vende, a cuánto y qué tan rápido, comparado con lo que tenés. Tocá **Actualizar ventas** con el juego abierto en otra pestaña; mientras el radar está abierto, vuelve a mirar cada 5 minutos.'),
    needs('sign')
  ]
});

tour('item-finder', 'i:bugnet', {
  title_en: 'Item finder', title_es: 'Buscador de ítems',
  summary_en: 'Type any item, fish, ore, recipe or quest to see what it is, where it comes from and where to find it on the map.',
  summary_es: 'Escribí cualquier ítem, pez, mineral, receta o misión para ver qué es, de dónde sale y dónde está en el mapa.',
  blocks: [
    ...shot('items', 'The item finder', 'El buscador de ítems'),
    ul(['Search in English or Spanish, or browse by category (crops, fish, ores, food, butterflies, quests…).', "Each card shows the game's own codex: effects, experience, where it comes from and what it sells for.", 'With your game connected, it also shows how many you have.'],
      ['Buscá en inglés o en español, o recorré por categoría (cultivos, peces, minerales, comida, mariposas, misiones…).', 'Cada tarjeta muestra el códice del propio juego: efectos, experiencia, de dónde sale y a cuánto se vende.', 'Con tu partida conectada, también muestra cuántos tenés.']),
    needs('free')
  ]
});

tour('crafting', 'p:bram', {
  title_en: 'Crafting & cooking', title_es: 'Crafteo y cocina',
  summary_en: 'Every recipe by station, with materials, time, experience and energy, and what you can make right now.',
  summary_es: 'Todas las recetas por estación, con materiales, tiempo, experiencia y energía, y lo que podés hacer ahora mismo.',
  blocks: [
    ...shot('craft', 'Recipes at a station', 'Las recetas de una estación'),
    ul(["**Stations:** the stove (Bakery or your cottage), Pell's workbench, Bram's forge, Hollin's mill and dairy, and Tilly's loom. **Locate station** shows each one on the Mega-Atlas.", '**Craftable now** keeps only recipes you have every material for (backpack and chests).', '**My level** hides what you have not unlocked yet. Sort by energy, gold, XP or time.', 'Food cards show the energy you get back minus what the stove costs.'],
      ['**Estaciones:** la cocina (Panadería o tu cabaña), el banco de Pell, la forja de Bram, el molino y la lechería de Hollin, y el telar de Tilly. **Ubicar estación** muestra cada una en el Mega-Atlas.', '**Crafteables ahora** deja solo las recetas para las que tenés todos los materiales (mochila y cofres).', '**Mi nivel** oculta lo que todavía no desbloqueaste. Ordená por energía, oro, XP o tiempo.', 'Las tarjetas de comida muestran la energía que recuperás menos lo que gasta la cocina.']),
    needs('free')
  ]
});

tour('villagers', 'p:ivy', {
  title_en: 'Villagers & gifts', title_es: 'Aldeanos y regalos',
  summary_en: 'What every villager loves, likes and hates, and where to find them.',
  summary_es: 'Qué le encanta, le gusta y odia a cada aldeano, y dónde encontrarlo.',
  blocks: [
    ...shot('npcs', 'The villagers', 'Los aldeanos'),
    ul(['Search by name, trade, place or gift.', 'One gift a day per villager: what they love counts most for friendship; what they hate costs some.', 'The 📍 line on each card opens them on the Mega-Atlas. At night and in rain they go indoors.'],
      ['Buscá por nombre, oficio, lugar o regalo.', 'Un regalo por día a cada aldeano: lo que les encanta suma más amistad; lo que odian resta.', 'La línea 📍 de cada tarjeta los abre en el Mega-Atlas. De noche y con lluvia se meten adentro.']),
    needs('free')
  ]
});

tour('xp-calculator', 'i:wheat', {
  title_en: 'XP calculator', title_es: 'Calculadora XP',
  summary_en: 'What to plant, mine, forage or fish for the most XP or gold with the energy you have.',
  summary_es: 'Qué plantar, minar, recolectar o pescar para ganar más XP u oro con la energía que tenés.',
  blocks: [
    ...shot('calc', 'The XP calculator', 'La calculadora XP'),
    ul(['Pick a goal: XP per energy, XP per minute, gold per energy or gold per minute.', 'Filter by skill, season and level, and set how many plots you have.', 'The energy simulator shows what you get with the energy you have left (it starts from your live energy if your game is connected).'],
      ['Elegí un objetivo: XP por energía, XP por minuto, oro por energía u oro por minuto.', 'Filtrá por habilidad, estación y nivel, y poné cuántas parcelas tenés.', 'El simulador de energía muestra lo que sacás con la energía que te queda (arranca de tu energía en vivo si tu partida está conectada).']),
    needs('free')
  ]
});

tour('timers', 'i:sunflower', {
  title_en: 'Timers', title_es: 'Temporizadores',
  summary_en: 'Live countdowns for your crops and cooking, with an alarm, plus daily tasks, missing quest materials and your rest.',
  summary_es: 'Cuentas regresivas en vivo de tus cultivos y tu cocina, con alarma, y además tareas diarias, materiales que faltan y tu descanso.',
  blocks: [
    ...shot('timers', 'Timers', 'Los temporizadores'),
    ul(['**Crops and production:** every planted plot and cooking or crafting batch with its countdown. An alarm rings when it is ready.', '**Daily tasks:** the Task Center; finish all 6 for 10 premium seeds.', '**Missing materials** for your active quests.', "**Rest and day/night:** today's sleep quota and when villagers go indoors."],
      ['**Cultivos y producción:** cada parcela sembrada y cada lote de cocina o crafteo con su cuenta regresiva. Suena una alarma cuando está listo.', '**Tareas diarias:** el Task Center; completá las 6 para ganar 10 semillas premium.', '**Materiales que faltan** para tus misiones activas.', '**Descanso y día/noche:** la cuota de sueño de hoy y cuándo los aldeanos se meten adentro.']),
    needs('sign')
  ]
});

tour('quests', 'p:maren', {
  title_en: 'Quests', title_es: 'Misiones',
  summary_en: 'Your active quests step by step, what each one still needs, your skills and your progress through the story.',
  summary_es: 'Tus misiones activas paso a paso, lo que le falta a cada una, tus habilidades y tu avance en la historia.',
  blocks: [
    ...shot('quests', 'Quests', 'Las misiones'),
    ul(['**Materials needed:** what every active quest asks for and how many you have in your backpack (M), home chest (CC) and town chest (CP).', '**Quest guide:** the current step of each quest, who gives it and **See on the Mega-Atlas**.', '**Skills:** your 10 skills and the 3-level rule (no skill can be more than 3 levels above your lowest).', '**Story progress, daily tasks, and bed and energy** in their own boxes. Tap a box to open or close it.'],
      ['**Insumos necesarios:** lo que pide cada misión activa y cuántos tenés en la mochila (M), el cofre de tu casa (CC) y el del pueblo (CP).', '**Guía de misiones:** el paso actual de cada misión, quién la da y **Ver en el Mega-Atlas**.', '**Habilidades:** tus 10 habilidades y la regla de 3 niveles (ninguna puede estar más de 3 niveles arriba de la más baja).', '**Avance de la historia, tareas diarias y cama y energía**, cada una en su caja. Tocá una caja para abrirla o cerrarla.']),
    needs('sign')
  ]
});

// ---------------------------------------------------------------- Guias del juego (guidetext.js)
// Portada de cada tema: el aldeano del oficio o un objeto del juego (b: criatura, i: item, p: retrato)
const GUIDE_COVERS = {
  start: 'p:marlow', controls: 'i:hoe', energy: 'i:energy_refill', farming: 'i:wheat', animals: 'p:hollis',
  fishing: 'p:wren', mining: 'p:dunn', woods: 'p:bjorn', cooking: 'i:the_harvest_feast', crafting: 'p:pell',
  skills: 'p:greta', combat: 'i:iron_sword', dungeon: 'b:lich', quests: 'p:maren', people: 'p:ivy',
  money: 'p:farthing', selling: 'p:rowan', emporium: 'i:vip_chest', vip: 'p:celeste', premium: 'i:celestial_pineapple',
  mounts: 'i:hay', world: 'p:wick', social: 'p:felix', founders: 'i:starbloom'
};
const GUIDE_PLACES = { dungeon: ['door:vip_quarter_door_7_dungeon_court'], vip: ['region:vip_quarter'], mining: ['region:stonepeak'], woods: ['region:whisperwood'] };
for (const topic of GUIDE) {
  const blocks = [];
  for (const s of topic.sections || []) {
    const lines = (s.text || []).filter((l) => typeof l === 'string');
    if (!lines.length) continue;
    blocks.push({ type: 'heading', level: 2, text_en: s.title, text_es: es(s.title) });
    blocks.push({ type: 'list', ordered: false, items_en: lines, items_es: lines.map(es) });
  }
  if (!blocks.length) continue;
  const first = (topic.sections || []).flatMap((s) => s.text || []).find((l) => typeof l === 'string') || '';
  blocks.push({ type: 'callout', variant: 'note', title_en: '', title_es: '', md_en: "From the game's own guide (the green book in the game).", md_es: 'De la guía del propio juego (el libro verde dentro del juego).' });
  add('guides', topic.id.replace(/[^a-z0-9]+/g, '-'), {
    title_en: topic.title, title_es: es(topic.title),
    summary_en: first, summary_es: es(first),
    tags: ['guide', topic.id], places: GUIDE_PLACES[topic.id] || [], cover_path: spriteRef(GUIDE_COVERS[topic.id]), blocks
  });
}

// ---------------------------------------------------------------- Jefes
const WEAPON = { blade: ['sword', 'espada'], bow: ['bow', 'arco'], staff: ['staff', 'bastón'] };
const WEAPON_ICON = { blade: '🗡️', bow: '🏹', staff: '🪄' };
const BOSSES = [
  { id: 'storm_slime_king', where_en: 'Whisperwood, in the Storm Hollow', where_es: 'Whisperwood, en la Hondonada de la Tormenta', places: ['sub:whisperwood_sub_15_the_storm_hollow', 'region:whisperwood'],
    tips_en: ['Every blow it lands sends a shock through the ground around it: hit and step back.', 'Three Storm Slimes fight beside it.'],
    tips_es: ['Cada golpe que da manda una descarga por el suelo alrededor: pegá y alejate.', 'Tres Slimes de Tormenta pelean a su lado.'] },
  { id: 'goblin_warchief', where_en: 'Whisperwood, in the Goblin Camp', where_es: 'Whisperwood, en el Campamento Goblin', places: ['sub:whisperwood_sub_14_the_goblin_camp', 'region:whisperwood'],
    tips_en: ['Fast and fierce, with two Goblins and two Goblin Raiders around it.', 'Its great shield takes every arrow: bows do nothing.'],
    tips_es: ['Rápido y feroz, con dos Goblins y dos Goblins Saqueadores alrededor.', 'Su gran escudo para todas las flechas: el arco no le hace nada.'] },
  { id: 'orc_warlord', where_en: "Stonepeak's south, in the Warlord's Camp", where_es: 'El sur de Stonepeak, en el Campamento del Señor de la Guerra', places: ['sub:stonepeak_sub_18_the_warlord_s_camp', 'region:stonepeak'],
    tips_en: ['Every third blow it slams the ground and stuns anyone it catches: dash out of the ring.', 'Its thick hide softens every blow. Two orcs fight beside it.'],
    tips_es: ['Cada tres golpes pega contra el suelo y aturde a quien agarre: esquivá con el dash fuera del círculo.', 'Su cuero grueso amortigua cada golpe. Dos orcos pelean a su lado.'] },
  { id: 'boss_crystal_golem', where_en: "Stonepeak, in the Delvers' Court", where_es: 'Stonepeak, en la Corte de los Excavadores', places: ['sub:stonepeak_sub_17_the_delvers_court', 'region:stonepeak'],
    tips_en: ['Every third blow it leaps and slams the ground, stunning anyone it catches.', 'Its stone softens every blow. Two Crystal Golems fight beside it.'],
    tips_es: ['Cada tres golpes salta y golpea el suelo, aturdiendo a quien agarre.', 'Su piedra amortigua cada golpe. Dos Gólems de Cristal pelean a su lado.'] },
  { id: 'boss_frost_golem', where_en: "Frosthaven, before the great ice cave", where_es: 'Frosthaven, frente a la gran cueva de hielo', places: ['region:frosthaven'],
    tips_en: ['Every second blow it leaps and slams the ground, stunning anyone it catches.', 'Three Frost Golems fight beside it.'],
    tips_es: ['Cada dos golpes salta y golpea el suelo, aturdiendo a quien agarre.', 'Tres Gólems de Escarcha pelean a su lado.'] },
  { id: 'bone_spider', where_en: "The Gloom's deepest cave (Stonepeak)", where_es: 'La cueva más profunda de The Gloom (Stonepeak)', places: ['door:stonepeak_door_3_cave_gloom', 'region:stonepeak'],
    tips_en: ['Its bite poisons you for a few seconds: keep your health up before you go in.', 'Its legs reach far, so keep your distance between blows.'],
    tips_es: ['Su mordida te envenena unos segundos: entrá con la vida alta.', 'Sus patas llegan lejos, así que tomá distancia entre golpes.'] },
  { id: 'vault_queen', where_en: "The Sunken Vault's deepest cave (Stonepeak)", where_es: 'La cueva más profunda de The Sunken Vault (Stonepeak)', places: ['door:stonepeak_door_4_cave_vault', 'region:stonepeak'],
    tips_en: ['The strongest poison under the ground: its bite poisons you for a few seconds.', 'Bring your best weapon of the kind it fears.'],
    tips_es: ['El veneno más fuerte bajo tierra: su mordida te envenena unos segundos.', 'Llevá tu mejor arma del tipo que teme.'] },
  { id: 'lich', where_en: 'The Night Court (the Barrowmire), and the last level of the Dungeon', where_es: 'La Corte Nocturna (el Barrowmire) y el último nivel de la Mazmorra', places: ['region:barrowmire', 'door:vip_quarter_door_7_dungeon_court'],
    tips_en: ['It hurls souls of fire three at a time, and they bend toward you as they fly.', 'It calls up skeletons to fight for it, and its old iron softens every blow.'],
    tips_es: ['Lanza almas de fuego de a tres, y se curvan hacia vos mientras vuelan.', 'Invoca esqueletos para que peleen por él, y su hierro viejo amortigua cada golpe.'] }
];
const FORGED_KIND = { blade: 'sword', bow: 'bow', staff: 'staff' };
const forgedOf = (weak) => Object.entries(R.FORGED || {}).filter(([, f]) => f.kind === FORGED_KIND[weak]).sort((a, b) => a[1].tier - b[1].tier).map(([n]) => n);
const pctUp = Math.round((R.BOSS_WEAK - 1) * 100);
const pctDown = Math.round((1 - R.BOSS_OTHER) * 100);
const respawnH = R.RESPAWN ? R.RESPAWN.bossMin / 60 : null;

add('bosses', 'how-bosses-work', {
  title_en: 'How bosses work', title_es: 'Cómo funcionan los jefes',
  summary_en: `Each boss fears one kind of weapon (+${pctUp}%), two wins a day pay Gold and Premium Seeds, and the first ever adds a gem.`,
  summary_es: `Cada jefe teme un tipo de arma (+${pctUp}%), dos victorias por día pagan oro y semillas premium, y la primera de todas suma una gema.`,
  tags: ['boss', 'combat'], cover_path: sprite('items', 'chest'),
  blocks: [
    { type: 'statcards', cards: [
      { icon: '🗡️', value: `+${pctUp}%`, label_en: 'Weapon it fears', label_es: 'Arma que teme', hint_en: `Any other: -${pctDown}%`, hint_es: `Cualquier otra: -${pctDown}%` },
      { icon: '🌱', value: `${R.BOSS_PRIZE.perDay} × ${R.BOSS_PRIZE.seeds}`, label_en: 'Premium Seeds a day', label_es: 'Semillas premium por día', hint_en: 'First two wins over each boss', hint_es: 'Primeras dos victorias sobre cada jefe' },
      { icon: '⭐', value: range(R.BOSS_PRIZE.fp, 'en'), label_en: 'Farming Points per prize', label_es: 'Puntos de granja por premio', hint_en: '', hint_es: '' },
      ...(respawnH ? [{ icon: '⏳', value: `${respawnH} h`, label_en: 'Back after', label_es: 'Vuelve después de', hint_en: 'A beaten boss returns', hint_es: 'Un jefe derrotado reaparece' }] : [])
    ] },
    { type: 'heading', level: 2, text_en: 'The rules', text_es: 'Las reglas' },
    { type: 'list', ordered: false,
      items_en: [`Each boss fears one kind of weapon: it hits ${pctUp}% harder, any other ${pctDown}% softer. Some take nothing from one kind at all.`, 'Your first two wins over each boss every day pay Gold and 3 Premium Seeds. The very first win also gives a gem.', 'The prize drops in a loot chest. Only you can open it for 2 hours.', 'Bosses cost no energy.', 'Every boss leaps at a farmer who keeps away. Watch for its tell and dash out of the ring.', 'At half health a boss rages and comes faster. Arrows and bolts from far off land softer.'],
      items_es: [`Cada jefe teme un tipo de arma: le pega ${pctUp}% más fuerte, cualquier otra ${pctDown}% más suave. A algunos un tipo de arma no les hace nada.`, 'Tus primeras dos victorias sobre cada jefe, cada día, pagan oro y 3 semillas premium. La primera victoria de todas da además una gema.', 'El premio cae en un cofre. Solo vos lo podés abrir durante 2 horas.', 'Los jefes no gastan energía.', 'Todo jefe salta sobre el granjero que se aleja. Mirá su aviso y salí del círculo con el dash.', 'Con la mitad de la vida, el jefe se enfurece y va más rápido. Las flechas y los rayos desde lejos pegan más suave.'] },
    { type: 'heading', level: 2, text_en: 'All bosses at a glance', text_es: 'Todos los jefes de un vistazo' },
    ...gallery(BOSSES.map((b) => beastImage(b.id))),
    { type: 'table',
      md_en: `| Boss | Where | Fears | Immune to | Gold | First win |\n|---|---|---|---|---:|---|\n${BOSSES.map((b) => { const w = R.BOSS_WEAPONS?.[b.id] || beast(b.id).weapons || {}; const g = R.BOSS_PRIZE.first.gems[b.id]; return `| ${beast(b.id).name_en} | ${b.where_en} | ${WEAPON[w.weak]?.[0] || '—'} | ${WEAPON[w.immune]?.[0] || '—'} | ${range(R.BOSS_PRIZE.gold[b.id], 'en')} | ${g ? `${g[1]} ${g[0]}` : '—'} |`; }).join('\n')}`,
      md_es: `| Jefe | Dónde | Teme | Inmune a | Oro | Primera victoria |\n|---|---|---|---|---:|---|\n${BOSSES.map((b) => { const w = R.BOSS_WEAPONS?.[b.id] || beast(b.id).weapons || {}; const g = R.BOSS_PRIZE.first.gems[b.id]; return `| ${beast(b.id).name_es || beast(b.id).name_en} | ${b.where_es} | ${WEAPON[w.weak]?.[1] || '—'} | ${WEAPON[w.immune]?.[1] || '—'} | ${range(R.BOSS_PRIZE.gold[b.id], 'es')} | ${g ? `${g[1]} ${itemEs(g[0])}` : '—'} |`; }).join('\n')}` },
    { type: 'callout', variant: 'tip', title_en: '', title_es: '', md_en: 'Each boss has its own entry in this section with its arena on the Mega-Atlas.', md_es: 'Cada jefe tiene su propia entrada en esta sección, con su arena en el Mega-Atlas.' }
  ]
});

for (const b of BOSSES) {
  const d = beast(b.id);
  const w = R.BOSS_WEAPONS?.[b.id] || d.weapons || {};
  const gem = R.BOSS_PRIZE.first.gems[b.id];
  const nameEs = d.name_es || d.name_en;
  add('bosses', b.id.replace(/_/g, '-'), {
    title_en: d.name_en, title_es: nameEs,
    summary_en: `${b.where_en}. Fears the ${WEAPON[w.weak]?.[0]}${w.immune ? `, immune to the ${WEAPON[w.immune][0]}` : ''}.`,
    summary_es: `${b.where_es}. Teme ${WEAPON[w.weak]?.[1] === 'arco' ? 'el arco' : WEAPON[w.weak]?.[1] === 'bastón' ? 'el bastón' : 'la espada'}${w.immune ? `; ${WEAPON[w.immune][1] === 'arco' ? 'el arco' : WEAPON[w.immune][1] === 'bastón' ? 'el bastón' : 'la espada'} no le hace nada` : ''}.`,
    tags: ['boss', b.id], places: b.places, cover_path: beastSprite(b.id),
    blocks: [
      { type: 'text', md_en: d.description_en || '', md_es: d.description_es || d.description_en || '' },
      { type: 'statcards', cards: [
        { icon: '❤️', value: fmt(d.stats?.hp ?? 0, 'en'), label_en: 'Health', label_es: 'Vida', hint_en: 'Bestiary value', hint_es: 'Valor del Bestiario' },
        { icon: '💥', value: String(d.stats?.damage ?? '—'), label_en: 'Damage', label_es: 'Daño', hint_en: '', hint_es: '' },
        { icon: '⚔️', value: WEAPON_ICON[w.weak] || '—', label_en: `Fears the ${WEAPON[w.weak]?.[0]} (+${pctUp}%)`, label_es: `Teme: ${WEAPON[w.weak]?.[1]} (+${pctUp}%)`, hint_en: w.immune ? `The ${WEAPON[w.immune][0]} does nothing` : '', hint_es: w.immune ? `Inmune: ${WEAPON[w.immune][1]}` : '' },
        { icon: '🪙', value: range(R.BOSS_PRIZE.gold[b.id], 'en'), label_en: 'Gold per prize', label_es: 'Oro por premio', hint_en: `First ${R.BOSS_PRIZE.perDay} wins a day`, hint_es: `Primeras ${R.BOSS_PRIZE.perDay} victorias del día` }
      ] },
      { type: 'heading', level: 2, text_en: 'Where to find it', text_es: 'Dónde encontrarlo' },
      ...b.places.slice(0, 1).map((key) => ({ type: 'place', key, note_en: b.where_en, note_es: b.where_es })),
      { type: 'heading', level: 2, text_en: 'How it fights', text_es: 'Cómo pelea' },
      { type: 'list', ordered: false, items_en: b.tips_en, items_es: b.tips_es },
      { type: 'heading', level: 2, text_en: 'What it pays', text_es: 'Qué paga' },
      { type: 'list', ordered: false,
        items_en: [`First ${R.BOSS_PRIZE.perDay} wins each day: ${range(R.BOSS_PRIZE.gold[b.id], 'en')} Gold, ${R.BOSS_PRIZE.seeds} Premium Seeds and ${range(R.BOSS_PRIZE.fp, 'en')} Farming Points.`, gem ? `Your very first win: ${gem[1]} ${gem[0]} and ${R.BOSS_PRIZE.first.seeds.join('–')} Premium Seeds more.` : null].filter(Boolean),
        items_es: [`Primeras ${R.BOSS_PRIZE.perDay} victorias de cada día: ${range(R.BOSS_PRIZE.gold[b.id], 'es')} de oro, ${R.BOSS_PRIZE.seeds} semillas premium y ${range(R.BOSS_PRIZE.fp, 'es')} puntos de granja.`, gem ? `Tu primera victoria de todas: ${gem[1]} ${itemEs(gem[0])} y ${R.BOSS_PRIZE.first.seeds.join('–')} semillas premium más.` : null].filter(Boolean) },
      ...gallery(forgedOf(w.weak).map(itemImage), `Every ${WEAPON[w.weak]?.[0]} you can forge, from weakest to strongest.`, `${WEAPON[w.weak]?.[1] === 'arco' ? 'Todos los arcos' : WEAPON[w.weak]?.[1] === 'bastón' ? 'Todos los bastones' : 'Todas las espadas'} que podés forjar, del más débil al más fuerte.`),
      { type: 'callout', variant: 'tip', title_en: 'Weapon', title_es: 'Arma',
        md_en: `Bring a **${WEAPON[w.weak]?.[0]}**${w.immune ? ` and leave the ${WEAPON[w.immune][0]} at home: it does nothing here` : ''}. See *Weapons and combat* for how to forge one.`,
        md_es: `Llevá **${WEAPON[w.weak]?.[1] === 'espada' ? 'una espada' : WEAPON[w.weak]?.[1] === 'arco' ? 'un arco' : 'un bastón'}**${w.immune ? ` y dejá ${WEAPON[w.immune][1] === 'espada' ? 'la espada' : WEAPON[w.immune][1] === 'arco' ? 'el arco' : 'el bastón'} en casa: acá no hace nada` : ''}. En *Armas y combate* está cómo forjarlo.` }
    ]
  });
}

// ---------------------------------------------------------------- Armas y combate
const forged = Object.entries(R.FORGED || {});
const metals = [...new Set(forged.map(([, f]) => f.metal))];
const rar = R.WEAPON_RARITY || {};
const craftData = readJson('public/data/bloomshire/craft_data.json');
const craftRow = (name) => Object.values(craftData).flat().find((r) => r.dish === name);
/** Receta desde craft_data (materiales del juego) con los nombres del codice en cada idioma. */
const recipe = (name, lang) => {
  const r = craftRow(name);
  if (!r) return '—';
  const mats = (r.needs || []).map((n) => `${n.qty} ${lang === 'es' ? itemEs(n.item) : n.item}`).join(' + ');
  return lang === 'es' ? `${mats} · Artesanía nv ${r.levelNum}` : `${mats} · Crafting lv ${r.levelNum}`;
};
add('weapons', 'forged-weapons', {
  title_en: 'Forged weapons: sword, bow and staff', title_es: 'Armas forjadas: espada, arco y bastón',
  summary_en: `Every weapon is made at Bram's anvil at the Forge, in ${metals.length} metals from Crafting level 6 to 25.`,
  summary_es: `Todas las armas se hacen en el yunque de Bram, en la Herrería, en ${metals.length} metales, de Artesanía nivel 6 a 25.`,
  tags: ['weapon', 'crafting', 'forge'], places: ['npc:bram'], cover_path: itemSprite('Gold Sword') || itemSprite(forged[0]?.[0]),
  blocks: [
    { type: 'text', md_en: "Swords, bows and staffs are forged at **Bram's anvil**. Each metal is a step up in rarity, and rarity multiplies your blow. Bosses fear one kind of weapon, so it pays to keep one of each.", md_es: 'Las espadas, los arcos y los bastones se forjan en el **yunque de Bram**. Cada metal sube un escalón de rareza, y la rareza multiplica tu golpe. Los jefes temen un tipo de arma, así que conviene tener una de cada una.' },
    { type: 'table',
      md_en: `| Weapon | Rarity | Blow | How to make it |\n|---|---|---:|---|\n${forged.map(([n, f]) => `| ${n} | ${rar[f.rarity]?.name || f.rarity} | ×${rar[f.rarity]?.damage ?? '—'} | ${recipe(n, 'en')} |`).join('\n')}`,
      md_es: `| Arma | Rareza | Golpe | Cómo se hace |\n|---|---|---:|---|\n${forged.map(([n, f]) => `| ${itemEs(n)} | ${es(rar[f.rarity]?.name || f.rarity)} | ×${String(rar[f.rarity]?.damage ?? '—').replace('.', ',')} | ${recipe(n, 'es')} |`).join('\n')}` },
    ...gallery(['sword', 'bow', 'staff'].flatMap((k) => forged.filter(([, f]) => f.kind === k).sort((a, b) => a[1].tier - b[1].tier).map(([n]) => itemImage(n))), 'Every forged weapon: swords, bows and staffs, by metal.', 'Todas las armas forjadas: espadas, arcos y bastones, por metal.'),
    { type: 'callout', variant: 'tip', title_en: 'Bars first', title_es: 'Primero las barras', md_en: 'Every weapon needs metal bars, smelted at the same anvil from 2 ore each. Cut gems (Topaz, Emerald, Amethyst) are cut there too.', md_es: 'Toda arma necesita barras de metal, que se funden en el mismo yunque con 2 minerales cada una. Las gemas talladas (Topacio, Esmeralda, Amatista) también se tallan ahí.' }
  ]
});

add('weapons', 'which-weapon-for-each-boss', {
  title_en: 'Which weapon for each boss', title_es: 'Qué arma usar con cada jefe',
  summary_en: 'A quick table: the weapon each boss fears and the one that does nothing.',
  summary_es: 'Una tabla rápida: el arma que teme cada jefe y la que no le hace nada.',
  tags: ['weapon', 'boss'], cover_path: itemSprite(forgedOf('blade')[0]),
  blocks: [
    ...gallery(['blade', 'bow', 'staff'].map((k) => itemImage(forgedOf(k)[0])).filter((im) => im.alt_en), 'The three kinds: sword, bow and staff.', 'Los tres tipos: espada, arco y bastón.'),
    { type: 'table',
      md_en: `| Boss | Bring | Leave at home |\n|---|---|---|\n${BOSSES.map((b) => { const w = R.BOSS_WEAPONS?.[b.id] || beast(b.id).weapons || {}; return `| ${beast(b.id).name_en} | ${WEAPON[w.weak]?.[0] || '—'} | ${WEAPON[w.immune]?.[0] || '—'} |`; }).join('\n')}`,
      md_es: `| Jefe | Llevá | Dejá en casa |\n|---|---|---|\n${BOSSES.map((b) => { const w = R.BOSS_WEAPONS?.[b.id] || beast(b.id).weapons || {}; return `| ${beast(b.id).name_es || beast(b.id).name_en} | ${WEAPON[w.weak]?.[1] || '—'} | ${WEAPON[w.immune]?.[1] || '—'} |`; }).join('\n')}` },
    { type: 'callout', variant: 'note', title_en: '', title_es: '', md_en: 'In the Dungeon no boss is immune: the weapon it fears still hits harder.', md_es: 'En la Mazmorra ningún jefe es inmune: el arma que teme igual pega más fuerte.' }
  ]
});

add('weapons', 'rarity', {
  title_en: 'Weapon rarity', title_es: 'Rareza de las armas',
  summary_en: 'What each rarity multiplies, from Common to Legendary.',
  summary_es: 'Cuánto multiplica cada rareza, de Común a Legendaria.',
  tags: ['weapon'], cover_path: itemSprite(forgedOf('staff').at(-1)),
  blocks: [
    { type: 'table',
      md_en: `| Rarity | Blow | Bonus |\n|---|---:|---:|\n${Object.values(rar).map((r) => `| ${r.name} | ×${r.damage} | +${r.bonus} |`).join('\n')}`,
      md_es: `| Rareza | Golpe | Bono |\n|---|---:|---:|\n${Object.values(rar).map((r) => `| ${es(r.name)} | ×${String(r.damage).replace('.', ',')} | +${r.bonus} |`).join('\n')}` },
    { type: 'text', md_en: "A blow is your strength plus your weapon's bonus, and Combat makes you stronger. At Combat 1 creatures are half strength; they reach full strength by Combat 8.", md_es: 'Un golpe es tu fuerza más el bono del arma, y Combate te hace más fuerte. Con Combate 1 las criaturas tienen la mitad de su fuerza; llegan a la fuerza completa en Combate 8.' }
  ]
});

const guards = (R.DUNGEON_GUARDS || []).slice(1);
add('weapons', 'the-dungeon', {
  title_en: 'The Dungeon: six levels and their guardians', title_es: 'La Mazmorra: seis niveles y sus guardianes',
  summary_en: 'Under the VIP Quarter. One weapon, no food, six levels, a guardian at the end of each.',
  summary_es: 'Debajo del Barrio VIP. Un arma, sin comida, seis niveles y un guardián al final de cada uno.',
  tags: ['dungeon', 'boss', 'vip'], places: ['door:vip_quarter_door_7_dungeon_court', 'region:vip_quarter'], cover_path: beastSprite('lich'),
  blocks: [
    { type: 'list', ordered: false,
      items_en: ['It lies under the VIP Quarter, so you need VIP. Walk west past the Library to the Dungeon Steps.', 'Choose one weapon at the top of the stair: only it goes down with you. No food, no tools, no mount, no pet.', 'Beat every creature to open the gate, then the guardian, pick a boon card and go down.', 'Eat before you go: nothing can be eaten inside.', 'Creatures inside drop no Gold; the run pays at the end. Falling loses nothing.'],
      items_es: ['Está debajo del Barrio VIP, así que necesitás VIP. Caminá al oeste pasando la Biblioteca hasta las Escaleras de la Mazmorra.', 'Elegí un arma arriba de la escalera: solo esa baja con vos. Sin comida, herramientas, montura ni mascota.', 'Vencé a todas las criaturas para abrir la reja, después al guardián, elegí una carta de bendición y bajá.', 'Comé antes de entrar: adentro no se puede comer.', 'Las criaturas de adentro no dejan oro; la partida paga al final. Caer no te hace perder nada.'] },
    { type: 'table',
      md_en: `| Level | Guardian | Fears |\n|---:|---|---|\n${guards.map((g, i) => { const w = R.BOSS_WEAPONS?.[g] || beast(g).weapons || {}; return `| ${i + 1} | ${beast(g).name_en} | ${WEAPON[w.weak]?.[0] || '—'} |`; }).join('\n')}`,
      md_es: `| Nivel | Guardián | Teme |\n|---:|---|---|\n${guards.map((g, i) => { const w = R.BOSS_WEAPONS?.[g] || beast(g).weapons || {}; return `| ${i + 1} | ${beast(g).name_es || beast(g).name_en} | ${WEAPON[w.weak]?.[1] || '—'} |`; }).join('\n')}` },
    ...gallery(guards.map(beastImage), 'The six guardians, level by level.', 'Los seis guardianes, nivel por nivel.'),
    { type: 'callout', variant: 'tip', title_en: 'Pick one weapon', title_es: 'Elegí un arma', md_en: 'You only take one weapon down, so pick the kind most guardians fear.', md_es: 'Solo bajás con un arma, así que elegí el tipo que más guardianes temen.' }
  ]
});

const out = { version: meta.gameVersion, generatedAt: new Date().toISOString(), sections: sections.map(({ key, ...s }) => s), entries };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`bitacora: ${sections.length} secciones, ${entries.length} entradas -> ${path.relative(ROOT, OUT)}`);
