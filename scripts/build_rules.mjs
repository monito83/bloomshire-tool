/**
 * scripts/build_rules.mjs
 * 
 * Script extractor y generador de la "Única Fuente de Verdad" (Single Source of Truth)
 * a partir del código oficial del juego Bloomshire (catalog.js, rules.js, orders.js).
 * 
 * Genera y sincroniza:
 * 1. public/data/bloomshire/rules.json, src/data/rules.json, extension/rules.json
 * 2. public/data/bloomshire/calc_data.json (57 cultivos canónicos con XP y tiempos reales)
 * 3. public/data/bloomshire/inventory_catalog.json (catálogo completo de liquidación)
 * 4. extension/content_hook.js (tabla SEEDS_INFO sincronizada con tiempos canónicos)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveSourceFile(filename) {
  const candidates = [
    path.resolve(__dirname, '../scratch/game_sources_live/game', filename),
    path.resolve(__dirname, '../scratch/game_sources_live', filename),
    path.resolve(__dirname, '../game-sources/game', filename),
    path.resolve(__dirname, '../game-sources', filename)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const cropMeta = {
  'Carrot': { es: 'Zanahoria', emoji: '🥕', tip: '⭐ ¡La mejor y más barata para subir Cultivo a Nv 5 rápidamente!' },
  'Potato': { es: 'Patata', emoji: '🥔', tip: 'Equilibrio excelente en fases tempranas.' },
  'Cabbage': { es: 'Repollo', emoji: '🥬', tip: 'Buena ganancia neta para nivel 3.' },
  'Cauliflower': { es: 'Coliflor', emoji: '🥦', tip: 'Excelente venta individual en primavera.' },
  'Strawberry': { es: 'Fresa', emoji: '🍓', tip: '🍓 Rebrota cada 60 min (5 cosechas por semilla). ¡Muy rentable!' },
  'Tomato': { es: 'Tomate', emoji: '🍅', tip: '🍅 Rebrota cada 35 min (5 cosechas por semilla).' },
  'Wheat': { es: 'Trigo', emoji: '🌾', tip: 'Materia prima esencial para Pan y cerveza.' },
  'Sunflower': { es: 'Girasol', emoji: '🌻', tip: 'Flor de verano vendida en la Botica de Hazel.' },
  'Corn': { es: 'Maíz', emoji: '🌽', tip: '🌽 Rebrota cada 30 min (5 cosechas). Gran rendimiento de otoño.' },
  'Green Beans': { es: 'Judías Verdes', emoji: '🫛', tip: '🫛 Rebrota cada 40 min (5 cosechas).' },
  'Cantaloupe': { es: 'Melón Cantalupo', emoji: '🍈', tip: 'Fruta dulce de verano con alto margen de venta.' },
  'Marigold': { es: 'Caléndula', emoji: '🌼', tip: 'Flor medicinal vendida en la Botica de Hazel.' },
  'Sweet Potato': { es: 'Batata', emoji: '🍠', tip: 'Cultivo sólido y nutritivo de otoño.' },
  'Saffron': { es: 'Azafrán', emoji: '🌾', tip: 'Especia rara y valiosa obtenida en aventuras y misiones.' },
  'Star Fruit': { es: 'Fruta Estrella', emoji: '⭐', tip: '⭐ Fruta estelar mítica. Ingrediente clave para Moonlight Stew.' },
  'Onion': { es: 'Cebolla', emoji: '🧅', tip: 'Crecimiento rápido de primavera, clave para Hearty Stew.' },
  'Eggplant': { es: 'Berenjena', emoji: '🍆', tip: '🍆 Rebrota cada 45 min (5 cosechas por semilla).' },
  'Watermelon': { es: 'Sandía', emoji: '🍉', tip: 'Gran venta estival de 1.400 de oro por fruto.' },
  'Beetroot': { es: 'Remolacha', emoji: '🟣', tip: 'Tubérculo de otoño de alto valor en tienda.' },
  'Pumpkin': { es: 'Calabaza', emoji: '🎃', tip: 'Cosecha pesada de otoño, 2.350 oro de venta.' },
  'Grapes': { es: 'Uvas', emoji: '🍇', tip: '🍇 Rebrota cada 90 min (5 cosechas). Gran retorno a largo plazo.' },
  'Hot Pepper': { es: 'Chile Picante', emoji: '🌶️', tip: '🌶️ Rebrota cada 45 min (5 cosechas). Ingrediente para platos picantes.' },
  'Asparagus': { es: 'Espárrago', emoji: '🌱', tip: 'Cosecha de primavera de alto margen.' },
  'Blueberry': { es: 'Arándano', emoji: '🫐', tip: '🫐 Rebrota cada 60 min (5 cosechas). Cosecha reina de primavera.' },
  'Broccoli': { es: 'Brócoli', emoji: '🥦', tip: 'Cultivo sano de primavera de 30 minutos.' },
  'Parsnip': { es: 'Chirivía', emoji: '🥔', tip: 'Excelente rendimiento y balance en fases tempranas.' },
  'Rice': { es: 'Arroz', emoji: '🌾', tip: 'Cereal básico de primavera para recetas de cocina.' },
  'Spring Onion': { es: 'Cebollín', emoji: '🧅', tip: 'Crecimiento súper rápido de 6 minutos.' },
  'Adzuki Bean': { es: 'Frijol Adzuki', emoji: '🫘', tip: '🫘 Rebrota cada 35 min (5 cosechas). Excelente en verano.' },
  'Green Bell Pepper': { es: 'Pimiento Verde', emoji: '🫑', tip: '🫑 Rebrota cada 45 min (5 cosechas).' },
  'Red Bell Pepper': { es: 'Pimiento Rojo', emoji: '🌶️', tip: '🫑 Rebrota cada 45 min (5 cosechas).' },
  'Yellow Bell Pepper': { es: 'Pimiento Amarillo', emoji: '🫑', tip: '🫑 Rebrota cada 45 min (5 cosechas).' },
  'Blackberry': { es: 'Mora', emoji: '🫐', tip: '🫐 Rebrota cada 40 min (5 cosechas por semilla).' },
  'Cucumber': { es: 'Pepino', emoji: '🥒', tip: '🥒 Rebrota cada 30 min (5 cosechas).' },
  'Pineapple': { es: 'Piña', emoji: '🍍', tip: 'Fruta tropical de verano, 3.250 oro de venta.' },
  'Aloe': { es: 'Aloe Vera', emoji: '🪴', tip: 'Planta medicinal vendida en la Botica de Hazel.' },
  'Premium Seed': { es: 'Semilla Premium', emoji: '✨', tip: 'Cosecha VIP de 15 min. No se vende a NPCs; comercia en Rowan P2P.' },
  'Sunfire Pepper': { es: 'Pimiento Fuego Solar', emoji: '🌶️', tip: 'Cosecha VIP de 15 min. Buffs de combate y comercio P2P en Rowan.' },
  'Diamond Strawberry': { es: 'Fresa Diamante', emoji: '🍓', tip: 'Cosecha VIP de 15 min. Ingrediente de Tartas de Diamante.' },
  'Sapphire Blueberry': { es: 'Arándano Zafiro', emoji: '🫐', tip: 'Cosecha VIP de 15 min. Usada para Mermelada de Zafiro (+regen).' },
  'Golden Pumpkin': { es: 'Calabaza Dorada', emoji: '🎃', tip: 'Cosecha VIP de 15 min. Pastel Dorado (+50⚡) y comercio P2P.' },
  'Crystal Grapes': { es: 'Uvas de Cristal', emoji: '🍇', tip: 'Cosecha VIP de 15 min. Alta demanda en Market Hall.' },
  'Starbloom': { es: 'Flor Estelar', emoji: '🌸', tip: 'Cosecha VIP de 15 min. Flor exótica para elixires y mercado P2P.' },
  'Celestial Pineapple': { es: 'Piña Celestial', emoji: '🍍', tip: 'Cosecha VIP de 15 min. Fruta sagrada para buffs de resistencia.' },
  'Winter Kale': { es: 'Winter Kale (Col de Invierno)', emoji: '🥬❄️', tip: 'Crecimiento rápido de 20 min en invierno. ¡Ideal para frío!' },
  'Snow Turnip': { es: 'Snow Turnip (Nabo de Nieve)', emoji: '❄️', tip: 'Tubérculo de invierno de 45 min con 545 oro de venta.' },
  'Frostberry': { es: 'Frostberry (Baya de Escarcha)', emoji: '🫐❄️', tip: '🫐❄️ Rebrota cada 60 min (5 cosechas). Baya reina invernal.' },
  'Ice Melon': { es: 'Ice Melon (Melón de Hielo)', emoji: '🍈❄️', tip: 'Fruta gélida de invierno, 1.950 oro de venta.' },
  'Fireheart Pepper': { es: 'Pimiento Corazón de Fuego', emoji: '🌶️🔥', tip: 'Cultivo especial de fuego para alquimia y platos de élite.' },
  'Fairy Rose': { es: 'Rosa de Hada', emoji: '🌹✨', tip: 'Flor feérica de gran rareza obtenida en eventos y misiones.' },
  'Honeydew Melon': { es: 'Melón Verde', emoji: '🍈', tip: 'Fruta avanzada de verano (Nv 18), 5.550 oro de venta.' },
  'Purple Cauliflower': { es: 'Coliflor Violeta', emoji: '🥦🟣', tip: 'Cultivo élite de primavera (Nv 20), 6.250 oro de venta.' },
  'Snow Pea': { es: 'Snow Pea (Guisante de Nieve)', emoji: '🫛❄️', tip: 'Cultivo maestro de invierno (Nv 22), 6.900 oro de venta.' },
  'Golden Beet': { es: 'Remolacha Dorada', emoji: '🟡', tip: 'Cosecha maestra de primavera (Nv 24), 7.650 oro de venta.' },
  'Black Tomato': { es: 'Tomate Negro', emoji: '🍅🖤', tip: 'Cultivo legendario de verano (Nv 26), 8.350 oro de venta.' },
  'Blue Corn': { es: 'Maíz Azul', emoji: '🌽🔵', tip: 'Cereal mítico de otoño (Nv 28), 9.000 oro de venta.' },
  'Dragon Fruit': { es: 'Fruta del Dragón', emoji: '🐉', tip: '👑 Cosecha cumbre de Bloomshire (Nv 30). Venta: 10.500g, XP: 157.' }
};


async function main() {
  console.log('⚡ Cargando módulos canónicos del juego...');
  
  const catalogPath = resolveSourceFile('catalog.js');
  const rulesPath = resolveSourceFile('rules.js');
  const ordersPath = resolveSourceFile('orders.js');

  if (!catalogPath || !rulesPath) {
    throw new Error(`No se encontraron los archivos del juego (catalog.js o rules.js).`);
  }

  console.log(`   - catalog: ${catalogPath}`);
  console.log(`   - rules:   ${rulesPath}`);
  if (ordersPath) console.log(`   - orders:  ${ordersPath}`);

  const catalog = await import(pathToFileURL(catalogPath).href);
  const rules = await import(pathToFileURL(rulesPath).href);
  const orders = ordersPath ? await import(pathToFileURL(ordersPath).href) : null;

  console.log('📦 Extrayendo catálogo de ítems, cultivos y semillas...');

  // Mapear niveles de tienda para semillas
  const shopLevels = {};
  for (const [shopName, shop] of Object.entries(catalog.SHOPS || {})) {
    (shop.sells || []).forEach(s => {
      if (s.id && s.id.startsWith('seed:')) {
        shopLevels[s.id] = s.level || 1;
      }
    });
  }

  // Mapear temporadas
  const cropSeasonMap = {};
  if (rules.CROP_SEASONS) {
    for (const [season, list] of Object.entries(rules.CROP_SEASONS)) {
      if (Array.isArray(list)) {
        list.forEach(cropName => {
          cropSeasonMap[cropName] = season;
        });
      }
    }
  }

  const detailedCrops = rules.SEEDS.map((s, index) => {
    const itemData = catalog.ITEMS[s.name] || {};
    const seedData = catalog.ITEMS[`seed:${index}`] || {};
    const season = cropSeasonMap[s.name] || (s.seasons ? s.seasons[0] : 'all');
    const finalSeasons = season === 'all' ? ['all'] : [season];

    // Según catalog.js:123, solo los cultivos listados en SEED_SOURCES.shopAtFarmingLevel
    // exigen nivel para comprarse/venderse en tiendas NPC. Los demás (Star Fruit, Saffron, Fairy Rose, etc.) son Nivel 1.
    const requiredLevel = shopLevels[`seed:${index}`] || 1;

    const isPremium = Boolean(s.premium || itemData.cat === 'premium');
    const waterStages = Array.isArray(s.stages) ? s.stages.length : (s.stages ?? 5);
    return {
      index,
      name: s.name,
      seedName: `${s.name} seeds`,
      growMinutes: s.grow,
      regrowMinutes: s.regrow || null,
      harvests: s.harvests || 1,
      waterStages,
      stages: waterStages,
      premium: isPremium,
      seedDear: Boolean(s.seedDear),
      seedPrice: isPremium ? 0 : (seedData.price ?? null),
      cropSellValue: itemData.value ?? 0,
      farmingXp: itemData.xp ?? 1,
      requiredLevel,
      seasons: finalSeasons,
      icon: itemData.icon ?? null,
      category: isPremium ? 'premium' : (itemData.cat || 'crop')
    };
  });

  const canonicalRules = {
    metadata: {
      buildHash: '124afc8d9ec7',
      rulesHash: 'a70eb5dd5113',
      sourceDate: '2026-11-04',
      description: 'Bloomshire Canonical Game Balance & Economy Rules (Build 124afc8d9ec7, Rules a70eb5dd5113)',
    },
    energy: {
      maxBase: rules.ENERGY?.max ?? 100, // 100
      foundingBonus: rules.ENERGY?.foundingBonus ?? 0.5, // 0.5 (+50% -> 150)
      maxFounding: Math.round((rules.ENERGY?.max ?? 100) * (1 + (rules.ENERGY?.foundingBonus ?? 0.5))), // 150
      regenMinutesVip: rules.ENERGY?.regenMinutes ?? 3, // 1 cada 3 min para VIPs
      sleep: {
        normalBarsPerDay: rules.ENERGY?.sleepBars ?? 2, // 2 barras (200 energía)
        foundingBarsPerDay: rules.ENERGY?.foundingSleepBars ?? 3, // 3 barras (450 energía)
        fillMinutesNormal: rules.ENERGY?.sleepMinutes ?? 20, // 20 min
        foundingPaceMultiplier: rules.ENERGY?.foundingSleepPace ?? 2, // 2x más rápido
        dailyEnergyTiers: {
          normal: 200,      // 2 barras de 100
          vipOrHolder: 450, // 3 barras de 150
          holders10: 600,   // 4 barras de 150
          holders20: 750    // 5 barras de 150
        }
      },
      food: {
        dailyBars: rules.FOOD_BARS_A_DAY ?? 1, // 1 barra al día
        moonlightStewEnergy: rules.MOONLIGHT_ENERGY ?? 8, // 8⚡
        countsTowardDailyCap: true // Moonlight Stew sí cuenta para la barra diaria de comida
      },
      refillsPerDay: rules.ENERGY?.refillsADay ?? 3,
    },
    actionCosts: rules.COST,
    vipPerks: rules.VIP_PERKS,
    foundingFarmers: {
      collection: {
        supply: 2222,
        chain: 'Robinhood Chain',
        contract: '0xC53870Cf1381f2848dFfFD2Fd4FfB585bD1b0e9c',
      },
      allHolders: {
        maxEnergy: 150,
        refillSpeed: '2x',
        season0Access: true,
        expBoostByRarity: {
          Common: 0.05,
          Uncommon: 0.05,
          Rare: 0.075,
          Epic: 0.10,
          Legendary: 0.125,
          Mythic: 0.15,
        },
      },
      tiersByCount: {
        2: { description: 'Four Founders seasonal sets (Spring, Summer, Autumn, Winter)' },
        3: { description: 'Pet with +5 carry slots, cave light, forage detection + 4 weapon skins' },
        5: { description: 'Mounts' },
        7: { 
          description: 'Exclusive mount skin, -20% crop grow time, +5 backpack slots',
          cropGrowReduction: 0.20,
          backpackBonus: 5,
        },
        10: { 
          description: 'Permanent VIP Quarter access without monthly pass, 600⚡ sleep per day (4 bars of 150), Elite Founder badge, Founders Hall wall',
          freeVipQuarter: true,
          dailySleepBars: 4,
          dailySleepEnergy: 600
        },
        15: {
          description: '-30% crop grow time',
          cropGrowReduction: 0.30
        },
        20: {
          description: '750⚡ sleep per day (5 bars of 150)',
          dailySleepBars: 5,
          dailySleepEnergy: 750
        }
      },
    },
    levelProgression: {
      maxLevel: catalog.MAX_LEVEL,
      formula: '100 * (level - 1)^2.7',
      xpLevels: Array.from({ length: catalog.MAX_LEVEL }, (_, i) => ({
        level: i + 1,
        totalXpRequired: catalog.xpFor(i + 1),
      })),
    },
    orders: {
      perDay: orders?.ORDERS?.perDay ?? 6,
      cropRatio: orders?.ORDERS?.crops ?? 4,
      premium: orders?.ORDERS?.premium ?? 0.5, // 50% del valor de venta
      cropXpRatio: orders?.ORDERS?.cropXp ?? 0.5, // 50% XP en pedidos de cultivos
      otherXpPerGold: orders?.ORDERS?.otherXpPer ?? 40, // 1 XP por cada 40 Gold en otros pedidos
      slotsFormula: 'Math.min(16, 6 + Math.floor(level / 3))',
      instantRefill: true
    },
    fishValues: catalog.FISH.reduce((acc, name) => {
      acc[name] = catalog.ITEMS[name]?.value ?? null;
      return acc;
    }, {}),
    crops: detailedCrops,
    shops: catalog.SHOPS,
    sellLimits: rules.SELL_LIMITS || { perItem: 15, things: 60, gold: 12000 },
    seedSources: rules.SEED_SOURCES || null,
  };

  // 1. Guardar rules.json
  const outPathSrc = path.resolve(__dirname, '../src/data/rules.json');
  const outPathPublic = path.resolve(__dirname, '../public/data/bloomshire/rules.json');
  const outPathExt = path.resolve(__dirname, '../extension/rules.json');

  for (const t of [outPathSrc, outPathPublic, outPathExt]) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, JSON.stringify(canonicalRules, null, 2), 'utf8');
    console.log(`   - Generado: ${t}`);
  }

  // 2. Generar public/data/bloomshire/calc_data.json
  console.log('📊 Generando calc_data.json con los 57 cultivos...');
  const calcPath = path.resolve(__dirname, '../public/data/bloomshire/calc_data.json');
  let currentCalc = { farming: [], mining: [], foraging: [], fishing: [] };
  if (fs.existsSync(calcPath)) {
    try {
      currentCalc = JSON.parse(fs.readFileSync(calcPath, 'utf8'));
    } catch (_) {}
  }

  const generatedFarming = detailedCrops.map(c => {
    const meta = cropMeta[c.name] || { es: c.name, emoji: '🌱', tip: 'Cultivo de Bloomshire.' };
    const season = c.seasons[0] || 'all';
    const cost = c.seedPrice ?? 0;
    const sell = c.cropSellValue;
    const net = sell - cost;
    const grow = c.growMinutes;
    const xp = c.farmingXp;
    const xpMin = parseFloat((xp / grow).toFixed(2));
    const goldMin = parseFloat((net / grow).toFixed(2));

    const nameFormatted = meta.es.includes(c.name)
      ? `${meta.es} ${meta.emoji}`.trim()
      : `${meta.es} (${c.name}) ${meta.emoji}`.trim();

    let growTxt = `${grow} min`;
    if (grow >= 60) {
      const h = Math.floor(grow / 60);
      const m = grow % 60;
      growTxt = m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    // Regla de rebrote (rules.js:604, 656-657):
    // Nivel < 15: 1 sola cosecha (growMinutes).
    // Nivel >= 15: ciclo de rebrote (hasta seed.harvests cosechas, normalmente 5).
    const hasRegrow = Boolean(c.regrowMinutes && c.harvests > 1);
    const regrowHarvests = hasRegrow ? (c.harvests || 5) : 1;
    const regrowTotalMinutes = hasRegrow
      ? c.growMinutes + (regrowHarvests - 1) * c.regrowMinutes
      : grow;
    const regrowTotalNet = hasRegrow
      ? (sell * regrowHarvests) - cost
      : net;
    const regrowTotalXp = hasRegrow
      ? (xp * regrowHarvests)
      : xp;
    const regrowXpMin = parseFloat((regrowTotalXp / regrowTotalMinutes).toFixed(2));
    const regrowGoldMin = parseFloat((regrowTotalNet / regrowTotalMinutes).toFixed(2));


    return {
      name: nameFormatted,
      id: c.name,
      name_en: `${c.name} ${meta.emoji}`.trim(),
      name_es: `${meta.es.replace(/\s*\(.*\)$/, '')} ${meta.emoji}`.trim(),
      grow,
      growTxt,
      level: c.requiredLevel,
      cost,
      sell,
      net,
      xp,
      xpMin,
      goldMin,
      hasRegrow,
      regrowMinutes: c.regrowMinutes || null,
      harvests: regrowHarvests,
      regrowTotalMinutes,
      regrowNet: regrowTotalNet,
      regrowXp: regrowTotalXp,
      regrowXpMin,
      regrowGoldMin,
      season
    };
  });

  currentCalc.farming = generatedFarming;
  fs.writeFileSync(calcPath, JSON.stringify(currentCalc, null, 2), 'utf8');
  console.log(`   - Generado: ${calcPath} (57 cultivos)`);

  // 3. Sincronizar public/data/bloomshire/inventory_catalog.json
  console.log('📦 Sincronizando inventory_catalog.json...');
  const invPath = path.resolve(__dirname, '../public/data/bloomshire/inventory_catalog.json');
  let invItems = [];
  if (fs.existsSync(invPath)) {
    try {
      invItems = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    } catch (_) {}
  }

  // Precios estimados en mercado Rowan para cosechas VIP (venta 0 a NPCs)
  const vipMarketPrices = {
    'Golden Pumpkin': 750,
    'Sunfire Pepper': 450,
    'Diamond Strawberry': 500,
    'Sapphire Blueberry': 550,
    'Premium Seed': 300,
    'Crystal Grapes': 600,
    'Starbloom': 650,
    'Celestial Pineapple': 800
  };

  detailedCrops.forEach(c => {
    const isVip = c.category === 'premium';
    const meta = cropMeta[c.name] || { es: c.name, emoji: '🌱' };
    const existingIdx = invItems.findIndex(x => x.id === c.name || (x.matchKeys && x.matchKeys.includes(c.name.toLowerCase())));

    const unitPrice = isVip ? (vipMarketPrices[c.name] || 500) : c.cropSellValue;
    const seller = isVip ? 'Mercado Rowan (P2P)' : 'Tienda General (Odette)';

    const matchKeys = Array.from(new Set([
      c.name.toLowerCase(),
      meta.es.toLowerCase(),
      c.name.toLowerCase().replace(/\s+/g, '_'),
      meta.es.toLowerCase().replace(/\s+/g, '_')
    ]));

    const itemObj = {
      id: c.name,
      name: isVip ? `${meta.es} (VIP)` : meta.es,
      unit: unitPrice,
      unitNpc: isVip ? 0 : c.cropSellValue,
      unitP2p: unitPrice,
      seller,
      matchKeys,
      qty: 0,
      cat: isVip ? 'vip' : 'crop',
      icon: meta.emoji,
      requiredLevel: c.requiredLevel,
      desc: isVip
        ? `Cosecha Premium de 15m. Odette no la compra. Véndela en Rowan (~${unitPrice}g) o utilízala en recetas VIP.`
        : `Cultivo de Bloomshire (${c.growMinutes} min). Véndelo a Odette por ${unitPrice}g o entrégalo en el Tablón de Pedidos.`
    };

    if (existingIdx >= 0) {
      // Actualizar preservando campos de usuario si los hubiera
      invItems[existingIdx] = { ...invItems[existingIdx], ...itemObj, qty: invItems[existingIdx].qty ?? 0 };
    } else {
      invItems.push(itemObj);
    }
  });

  fs.writeFileSync(invPath, JSON.stringify(invItems, null, 2), 'utf8');
  console.log(`   - Generado: ${invPath} (${invItems.length} ítems en catálogo)`);

  // 4. Sincronizar SEEDS_INFO en extension/content_hook.js
  console.log('🔌 Sincronizando SEEDS_INFO en extension/content_hook.js...');
  const hookPath = path.resolve(__dirname, '../extension/content_hook.js');
  if (fs.existsSync(hookPath)) {
    let hookContent = fs.readFileSync(hookPath, 'utf8');
    const seedsInfoRows = detailedCrops.map(c => {
      const meta = cropMeta[c.name] || { es: c.name, emoji: '🌱' };
      return `    { id: '${c.name}', name: '${meta.es}', grow: ${c.growMinutes}, regrow: ${c.regrowMinutes ?? 'null'}, harvests: ${c.harvests ?? 1}, stages: ${c.waterStages ?? 5}, premium: ${Boolean(c.premium)}, seasons: ${JSON.stringify(c.seasons)}, icon: '${meta.emoji}' }`;
    });

    const newSeedsInfoBlock = `const SEEDS_INFO = [\n${seedsInfoRows.join(',\n')}\n  ];`;
    const regex = /const SEEDS_INFO = \[[\s\S]*?\];/;
    if (regex.test(hookContent)) {
      hookContent = hookContent.replace(regex, newSeedsInfoBlock);
      fs.writeFileSync(hookPath, hookContent, 'utf8');
      console.log(`   - Sincronizado extension/content_hook.js con los 57 cultivos.`);
    } else {
      console.warn(`   ⚠️ No se encontró el bloque SEEDS_INFO en content_hook.js`);
    }
  }

  console.log(`✅ ¡Fase 2 de Catálogos y Datos completada con éxito!`);
  console.log(`   - Cultivos procesados: ${detailedCrops.length}`);
  console.log(`   - Nivel máximo: ${catalog.MAX_LEVEL} (Fórmula: 100 * (L - 1)^2.7)`);
  console.log(`   - Rules Hash: a70eb5dd5113 | Build Hash: 124afc8d9ec7`);
}

main().catch(err => {
  console.error('❌ Error al generar catálogos:', err);
  process.exit(1);
});
