import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeClientLiveEnergyAndBed,
  computeCropGrowth,
  computeMaxEnergy
} from '../src/components/bloomshire/bloomshireEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Ejecutando suite de pruebas de Fase 3 (Motor, Cultivos, Perks, Límites)...\n');

// 1. Algoritmo Canónico de Crecimiento de Cultivos (farm.js)
const t0 = 1000000;

// Caso A: Fresa rebrotando a los 70 min (regrow: 60 min, stages: 5)
// Debe estar madura y NO pedir segundo riego
const fresaSeed = { id: 'Strawberry', grow: 80, regrow: 60, harvests: 5, stages: 5, premium: false };
const fresaRebrote = { s: 4, base: 2, regrowing: true, h: 1, t: t0, w1: t0, w2: null };
const fresa70 = computeCropGrowth(fresaRebrote, t0 + 70 * 60000, false, fresaSeed);
assert.strictEqual(fresa70.ripe, true, 'Fresa a 70 min debe estar madura');
assert.strictEqual(fresa70.needs, null, 'Fresa a 70 min no debe pedir 2do riego');
console.log('✅ 1.1 Fresa rebrotando: madura a los 70 min sin pedir 2.° riego.');

// Caso B: Tomate rebrotando a los 40 min (regrow: 35 min, stages: 6)
// Debe estar maduro (el ciclo de rebrote toma 35 min)
const tomateSeed = { id: 'Tomato', grow: 45, regrow: 35, harvests: 5, stages: 6, premium: false };
const tomateRebrote = { s: 5, base: 3, regrowing: true, h: 1, t: t0, w1: t0, w2: null };
const tomate40 = computeCropGrowth(tomateRebrote, t0 + 40 * 60000, false, tomateSeed);
assert.strictEqual(tomate40.ripe, true, 'Tomate a 40 min debe estar maduro (regrow es 35 min)');
console.log('✅ 1.2 Tomate rebrotando: maduro a los 40 min (ciclo de 35 min).');

// Caso C: Coliflor (grow: 90 min, stages: 6)
// 6 etapas -> span: 5 -> wait: etapa 4 (al 80% = 72 min). Con 2do riego a los 72 min, madura exactamente a los 90 min
const cauliSeed = { id: 'Cauliflower', grow: 90, regrow: null, harvests: 1, stages: 6, premium: false };
const cauliWait = computeCropGrowth({ s: 3, base: 0, regrowing: false, t: t0, w1: t0 }, t0 + 72 * 60000, false, cauliSeed);
assert.strictEqual(cauliWait.needs, 'second', 'Coliflor a los 72 min debe requerir 2.° riego');

const cauliRipe = computeCropGrowth({ s: 3, base: 0, regrowing: false, t: t0, w1: t0, w2: t0 + 72 * 60000 }, t0 + 90 * 60000, false, cauliSeed);
assert.strictEqual(cauliRipe.ripe, true, 'Coliflor regada a tiempo debe madurar exactamente a los 90 min');
console.log('✅ 1.3 Coliflor (6 etapas): pide 2.° riego a los 72m y madura a los 90m exactos.');

// Caso D: Cultivos Premium (Golden Pumpkin - VIP Quarter)
// Crecen inmediatamente desde crop.t, nunca piden riego manual y nunca se marchitan
const goldSeed = { id: 'Golden Pumpkin', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true };
const goldJustPlanted = computeCropGrowth({ s: 40, t: t0, w1: null, w2: null }, t0 + 1000, false, goldSeed);
assert.strictEqual(goldJustPlanted.needs, null, 'Cultivo premium nunca debe pedir riego manual');
assert.strictEqual(goldJustPlanted.readyAt, t0 + 15 * 60000, 'Cultivo premium madura a los 15 min de sembrado');

const goldLate = computeCropGrowth({ s: 40, t: t0, w1: null, w2: null }, t0 + 20 * 3600000, false, goldSeed);
assert.strictEqual(goldLate.withered, false, 'Cultivo premium nunca se marchita tras madurar');
console.log('✅ 1.4 Cultivo Premium: auto-riego en t, nunca pide riego manual y no marchita.');

// Caso E: Cultivo al aire libre (outdoors) sin regar
const carrotSeed = { id: 'Carrot', grow: 2, regrow: null, harvests: 1, stages: 5, premium: false };
const carrotOutdoors = computeCropGrowth({ s: 0, t: t0, w1: null }, t0 + 1000, true, carrotSeed);
assert(carrotOutdoors.statusText.includes('lluvia'), 'Debe contemplar posible lluvia al aire libre');
console.log('✅ 1.5 Cultivo al aire libre: mensaje contextual de riego o lluvia.');

// 2. Escala Canónica de Sueño Diario
const now = Date.now();
const resBase = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, isVip: false });
assert.strictEqual(resBase.energyMeta.sleepADay, 200, 'Jugador común debe tener 200⚡');

const resHolder1 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 1, isVip: false });
assert.strictEqual(resHolder1.energyMeta.sleepADay, 450, 'Holder 1-9 FF debe tener 450⚡');

const resHolder10 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 10, isVip: false });
assert.strictEqual(resHolder10.energyMeta.sleepADay, 600, 'Holder 10 FF debe tener 600⚡');

const resHolder20 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 20, isVip: false });
assert.strictEqual(resHolder20.energyMeta.sleepADay, 750, 'Holder 20 FF debe tener 750⚡');

const resMythic = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, isVip: false, perks: { mythic: true } });
assert.strictEqual(resMythic.energyMeta.sleepADay, 600, 'Mythic debe tener 600⚡');
console.log('✅ 2.1 Escala canónica de sueño diario (200 / 450 / 600 / 750⚡).');

// 3. Comida Diaria y Eliminación de 90⚡ inventado
const utcDay = Math.floor(now / 86400000);
const resFood = computeClientLiveEnergyAndBed(null, 50, now, null, {
  farmersCount: 5,
  isVip: true,
  ate: { day: utcDay, energy: 60 }
});
assert.strictEqual(resFood.energyMeta.foodCapToday, 150, 'Tope de comida debe ser 150⚡ para VIP/Holder');
assert.strictEqual(resFood.energyMeta.foodEatenToday, 60, 'Debe registrar 60⚡ comidos hoy');
assert.strictEqual(resFood.energyMeta.foodRoomToday, 90, 'Deben restar 90⚡ de cupo');
assert.strictEqual(resFood.energyMeta.foodCapHalfDay, undefined, 'foodCapHalfDay debe estar eliminado');
console.log('✅ 3.1 Comida diaria UTC (1 barra = 100/150⚡) y sin tope 90.');

// 4. Sapphire Jam (+30% regeneración sin VIP)
const resJam = computeClientLiveEnergyAndBed(null, 50, now, null, {
  farmersCount: 0,
  isVip: false,
  buffs: { jam: now + 12 * 60000 }
});
assert.strictEqual(resJam.energyMeta.isJamActive, true);
assert.strictEqual(resJam.energyMeta.jamMinutesLeft, 12);
assert.strictEqual(resJam.energyMeta.regenPer3Min, 1.3);
console.log('✅ 4.1 Sapphire Jam: +30% regeneración (+1.3⚡ cada 3 min) sin pase VIP.');

// 5. Sin VIP fantasma si no hay vipUntil
const resNoPhantomVip = computeClientLiveEnergyAndBed(null, 50, now, null, {
  farmersCount: 0,
  isVip: false,
  vipUntil: null
});
assert.strictEqual(resNoPhantomVip.energyMeta.isVip, false);
assert.strictEqual(resNoPhantomVip.energyMeta.regenPer3Min, 0);
console.log('✅ 5.1 Sin VIP fantasma si no hay pase vigente.');

// 6. Catálogo de Inventario y Límites
const rulesJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/bloomshire/rules.json'), 'utf8'));
assert.deepStrictEqual(rulesJson.sellLimits, { perItem: 15, things: 60, gold: 12000 });
assert(rulesJson.seedSources?.shopAtFarmingLevel, 'Debe incluir SEED_SOURCES.shopAtFarmingLevel');

const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/bloomshire/inventory_catalog.json'), 'utf8'));
const foods = catalog.filter(i => i.cat === 'food');
const vips = catalog.filter(i => i.cat === 'vip');
assert(foods.length >= 7 && foods.every(f => f.unitNpc === 0), 'Platos deben tener unitNpc === 0');
assert(vips.length >= 8 && vips.every(v => v.unitNpc === 0), 'Cosechas VIP deben tener unitNpc === 0');
console.log('✅ 6.1 SELL_LIMITS canónicos y catálogo de platos/VIPs con precio NPC 0.');

console.log('\n🎉 ¡TODOS LOS TESTS DE FASE 3 PASARON SATISFACTORIAMENTE (100% VERIFICADO)!');
