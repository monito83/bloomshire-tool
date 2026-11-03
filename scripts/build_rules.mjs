/**
 * scripts/build_rules.mjs
 * 
 * Script extractor y generador de la "Única Fuente de Verdad" (Single Source of Truth)
 * a partir del código oficial del juego Bloomshire (catalog.js, game/rules.js y docs oficiales).
 * 
 * Genera rules.json listo para la web tool y para la extensión.
 */

import fs from 'fs';
import path from 'path';

async function main() {
  console.log('⚡ Cargando módulos oficiales del juego...');
  
  const catalog = await import('../game-sources/catalog.js');
  const rules = await import('../game-sources/game/rules.js');

  console.log('📦 Extrayendo catálogo de ítems, cultivos y semillas...');
  
  const crops = [];
  const seeds = [];
  const items = {};

  for (const [key, item] of Object.entries(catalog.ITEMS)) {
    items[key] = {
      name: item.name,
      category: item.cat,
      value: item.value,
      price: item.price ?? null,
      xp: item.xp ?? 0,
      icon: item.icon ?? null,
    };

    if (item.cat === 'crop') {
      crops.push({
        id: key,
        name: item.name,
        sellPrice: item.value,
        xp: item.xp,
        icon: item.icon,
      });
    } else if (item.cat === 'seed') {
      seeds.push({
        id: key,
        name: item.name,
        buyPrice: item.price,
        sellPrice: item.value,
        icon: item.icon,
      });
    }
  }

  const detailedCrops = rules.SEEDS.map((s, index) => {
    const itemData = catalog.ITEMS[s.name] || {};
    const seedData = catalog.ITEMS[`seed:${index}`] || {};

    const cropSeasons = [];
    if (rules.CROP_SEASONS) {
      for (const [season, list] of Object.entries(rules.CROP_SEASONS)) {
        if (Array.isArray(list) && list.includes(s.name)) {
          cropSeasons.push(season);
        }
      }
    }
    const finalSeasons = cropSeasons.length > 0 ? cropSeasons : (s.seasons || ['all']);

    return {
      index,
      name: s.name,
      seedName: `${s.name} seeds`,
      growMinutes: s.grow,
      waterStages: s.stages ?? 1,
      seedDear: Boolean(s.seedDear),
      seedPrice: seedData.price ?? null,
      cropSellValue: itemData.value ?? null,
      farmingXp: itemData.xp ?? 1,
      seasons: finalSeasons,
      icon: itemData.icon ?? null,
    };
  });

  const canonicalRules = {
    metadata: {
      generatedAt: new Date().toISOString(),
      buildHash: '4212f5dc495a',
      rulesHash: 'a70eb5dd5113',
      sourceDate: '2026-10-28',
      description: 'Bloomshire Canonical Game Balance & Economy Rules',
    },
    energy: {
      maxBase: rules.ENERGY.max, // 100
      foundingBonus: rules.ENERGY.foundingBonus, // 0.5 (+50% -> 150)
      maxFounding: Math.round(rules.ENERGY.max * (1 + rules.ENERGY.foundingBonus)), // 150
      regenMinutesVip: rules.ENERGY.regenMinutes, // 1 cada 3 min para VIPs
      sleep: {
        normalBarsPerDay: rules.ENERGY.sleepBars, // 2 barras (200 energía)
        foundingBarsPerDay: rules.ENERGY.foundingSleepBars, // 3 barras (450 energía)
        fillMinutesNormal: rules.ENERGY.sleepMinutes, // 20 min
        foundingPaceMultiplier: rules.ENERGY.foundingSleepPace, // 2x más rápido
      },
      refillsPerDay: rules.ENERGY.refillsADay ?? 3,
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
          description: 'Permanent VIP Quarter access without monthly pass, Elite Founder badge, Founders Hall wall',
          freeVipQuarter: true,
        },
      },
    },
    levelProgression: {
      maxLevel: catalog.MAX_LEVEL,
      formula: '40 * (level - 1)^1.9',
      xpLevels: Array.from({ length: catalog.MAX_LEVEL }, (_, i) => ({
        level: i + 1,
        totalXpRequired: catalog.xpFor(i + 1),
      })),
    },
    fishValues: catalog.FISH.reduce((acc, name) => {
      acc[name] = catalog.ITEMS[name]?.value ?? null;
      return acc;
    }, {}),
    crops: detailedCrops,
    shops: catalog.SHOPS,
  };

  const outPathSrc = path.resolve('src/data/rules.json');
  const outPathPublic = path.resolve('public/data/bloomshire/rules.json');
  const outPathExt = path.resolve('extension/rules.json');

  const targets = [outPathSrc, outPathPublic, outPathExt];

  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, JSON.stringify(canonicalRules, null, 2), 'utf8');
    console.log(`   - ${t}`);
  }

  console.log(`✅ Archivos generados con éxito.`);
  console.log(`📊 Total cultivos procesados: ${detailedCrops.length}`);
  console.log(`📊 Niveles de XP calculados: ${catalog.MAX_LEVEL}`);
}

main().catch(err => {
  console.error('❌ Error al generar rules.json:', err);
  process.exit(1);
});

