import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  xpForLevel,
  computeCanonicalSkillsFromRaw,
  computeClientLiveEnergyAndBed,
  computeCropGrowth,
  computeMaxEnergy,
  bloomshireFirstRainBetween,
  bloomshireRainsOn
} from '../src/components/bloomshire/bloomshireEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Motor Canónico de Bloomshire (Fase 4)', () => {

  // 1. Curva Canónica de XP (rules.js: levelOf y xpForLevel)
  describe('1. Curva Canónica de XP y Habilidades', () => {
    it('calcula la curva de nivel 1 al 10 con la fórmula oficial 100 * (L - 1)^2.7', () => {
      expect(xpForLevel(1)).toBe(0);
      expect(xpForLevel(2)).toBe(100);
      expect(xpForLevel(3)).toBe(650);
      expect(xpForLevel(4)).toBe(1942);
      expect(xpForLevel(5)).toBe(4222);
      expect(xpForLevel(10)).toBe(37710);
    });

    it('un jugador con exactamente 37.710 XP se calcula en Nivel 10 exacto', () => {
      const skills = { farming: 37710 };
      const res = computeCanonicalSkillsFromRaw(skills);
      const farmSkill = res.skillsBreakdown.farming;
      expect(farmSkill.level).toBe(10);
      expect(farmSkill.pct).toBe(0);
    });

    it('un jugador con 37.709 XP está en Nivel 9 (casi Nivel 10)', () => {
      const skills = { farming: 37709 };
      const res = computeCanonicalSkillsFromRaw(skills);
      expect(res.skillsBreakdown.farming.level).toBe(9);
    });

    it('inicializa habilidades limpias en 0 XP y Nivel 1 (O16)', () => {
      const res = computeCanonicalSkillsFromRaw({});
      expect(res.skillsBreakdown.farming.level).toBe(1);
      expect(res.skillsBreakdown.farming.xp).toBe(0);
      expect(res.skillsBreakdown.woodcutting.level).toBe(1);
    });
  });

  // 2. Energía y Pase VIP
  describe('2. Energía y Regeneración Canónica', () => {
    it('100⚡ de base; 150⚡ con pase VIP o Founding Farmer (Holder)', () => {
      expect(computeMaxEnergy(false, false)).toBe(100);
      expect(computeMaxEnergy(true, false)).toBe(150);
      expect(computeMaxEnergy(false, true)).toBe(150);
      expect(computeMaxEnergy(true, true)).toBe(150);
    });

    it('Sapphire Jam otorga +30% de regeneración (+1.3⚡/3min) a cualquier jugador sin VIP', () => {
      const now = Date.now();
      const resJam = computeClientLiveEnergyAndBed(null, 50, now, null, {
        farmersCount: 0,
        isVip: false,
        buffs: { jam: now + 15 * 60000 }
      });
      expect(resJam.energyMeta.isJamActive).toBe(true);
      expect(resJam.energyMeta.regenPer3Min).toBe(1.3);
      expect(resJam.energyMeta.jamMinutesLeft).toBe(15);
    });

    it('no activa VIP fantasma de 24h si vipUntil no está presente o expiró', () => {
      const now = Date.now();
      const res = computeClientLiveEnergyAndBed(null, 50, now, null, {
        farmersCount: 0,
        isVip: false,
        vipUntil: null
      });
      expect(res.energyMeta.isVip).toBe(false);
      expect(res.energyMeta.regenPer3Min).toBe(0);
    });
  });

  // 3. Escala Canónica de Sueño Diario
  describe('3. Escala Canónica de Sueño Diario', () => {
    const now = Date.now();

    it('otorga 200⚡ a un jugador base sin farmers ni perks', () => {
      const res = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, isVip: false });
      expect(res.energyMeta.sleepADay).toBe(200);
    });

    it('otorga 450⚡ a un holder con 1-9 Founding Farmers (Tier 1)', () => {
      const res = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 1, isVip: false });
      expect(res.energyMeta.sleepADay).toBe(450);
    });

    it('otorga 600⚡ a un holder con 10-19 Founding Farmers (Tier 2)', () => {
      const res = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 10, isVip: false });
      expect(res.energyMeta.sleepADay).toBe(600);
    });

    it('otorga 750⚡ a un holder con 20+ Founding Farmers (Tier 3)', () => {
      const res = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 20, isVip: false });
      expect(res.energyMeta.sleepADay).toBe(750);
    });

    it('respeta perks.sleeps explícito enviado en el snapshot (como barras 3, 4, 5 o energía 450, 600, 750)', () => {
      const resBars3 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, perks: { sleeps: 3 } });
      expect(resBars3.energyMeta.sleepADay).toBe(450);

      const resBars4 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, perks: { sleeps: 4 } });
      expect(resBars4.energyMeta.sleepADay).toBe(600);

      const resBars5 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, perks: { sleeps: 5 } });
      expect(resBars5.energyMeta.sleepADay).toBe(750);

      const resEnergy600 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, perks: { sleeps: 600 } });
      expect(resEnergy600.energyMeta.sleepADay).toBe(600);
    });
  });

  // 4. Comida Diaria UTC
  describe('4. Comida Diaria UTC (sin 90⚡ inventado)', () => {
    const now = Date.now();
    const utcDay = Math.floor(now / 86400000);

    it('tope diario de 1 barra (100⚡ o 150⚡ VIP/Holder) y resta lo consumido hoy', () => {
      const res = computeClientLiveEnergyAndBed(null, 50, now, null, {
        farmersCount: 5,
        isVip: true,
        ate: { day: utcDay, energy: 40 }
      });
      expect(res.energyMeta.foodCapToday).toBe(150);
      expect(res.energyMeta.foodEatenToday).toBe(40);
      expect(res.energyMeta.foodRoomToday).toBe(110);
      expect(res.energyMeta.foodCapHalfDay).toBeUndefined();
    });
  });

  // 5. Algoritmo de Cultivos contra farm.js del juego
  describe('5. Algoritmo Canónico de Crecimiento de Cultivos (farm.js)', () => {
    const t0 = 1000000;

    it('fresa rebrotando: madura a los 70 min sin pedir segundo riego (regrow: 60m)', () => {
      const fresaSeed = { id: 'Strawberry', grow: 80, regrow: 60, harvests: 5, stages: 5, premium: false };
      const fresaRebrote = { s: 4, base: 2, regrowing: true, h: 1, t: t0, w1: t0, w2: null };
      const g = computeCropGrowth(fresaRebrote, t0 + 70 * 60000, false, fresaSeed);
      expect(g.ripe).toBe(true);
      expect(g.needs).toBeNull();
    });

    it('tomate rebrotando: madura a los 40 min (ciclo de 35 min, 6 etapas)', () => {
      const tomateSeed = { id: 'Tomato', grow: 45, regrow: 35, harvests: 5, stages: 6, premium: false };
      const tomateRebrote = { s: 5, base: 3, regrowing: true, h: 1, t: t0, w1: t0, w2: null };
      const g = computeCropGrowth(tomateRebrote, t0 + 40 * 60000, false, tomateSeed);
      expect(g.ripe).toBe(true);
    });

    it('coliflor (6 etapas, 90m): requiere 2.° riego a los 72 min y madura a los 90 min exactos', () => {
      const cauliSeed = { id: 'Cauliflower', grow: 90, regrow: null, harvests: 1, stages: 6, premium: false };
      const cauliWait = computeCropGrowth({ s: 3, base: 0, regrowing: false, t: t0, w1: t0 }, t0 + 72 * 60000, false, cauliSeed);
      expect(cauliWait.needs).toBe('second');

      const cauliRipe = computeCropGrowth({ s: 3, base: 0, regrowing: false, t: t0, w1: t0, w2: t0 + 72 * 60000 }, t0 + 90 * 60000, false, cauliSeed);
      expect(cauliRipe.ripe).toBe(true);
    });

    it('cultivo premium (Golden Pumpkin): auto-riego en t, nunca pide riego manual y no marchita', () => {
      const goldSeed = { id: 'Golden Pumpkin', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true };
      const justPlanted = computeCropGrowth({ s: 40, t: t0, w1: null, w2: null }, t0 + 1000, false, goldSeed);
      expect(justPlanted.needs).toBeNull();
      expect(justPlanted.readyAt).toBe(t0 + 15 * 60000);

      const late = computeCropGrowth({ s: 40, t: t0, w1: null, w2: null }, t0 + 20 * 3600000, false, goldSeed);
      expect(late.withered).toBe(false);
    });

    it('cultivo al aire libre: soporta detección meteorológica de lluvia (farm.js:52-61)', () => {
      const carrotSeed = { id: 'Carrot', grow: 2, regrow: null, harvests: 1, stages: 5, premium: false };
      const g = computeCropGrowth({ s: 0, t: t0, w1: null }, t0 + 1000, true, carrotSeed);
      expect(g.statusText).toContain('lluvia');
      expect(bloomshireRainsOn(1)).toBe(true);
    });

    it('valida la existencia de los 57 cultivos en el catálogo oficial', () => {
      const rulesPath = path.resolve(__dirname, '../src/data/rules.json');
      const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      expect(rules.crops.length).toBe(57);
    });
  });

  // 6. Límites Diarios y Excepciones de Nivel (Sellers & Rules)
  describe('6. Límites de Venta a Tiendas NPC y Excepciones de Nivel', () => {
    const rules = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/rules.json'), 'utf8'));

    it('rules.json declara sellLimits canónicos { perItem: 15, things: 60, gold: 12000 }', () => {
      expect(rules.sellLimits).toEqual({ perItem: 15, things: 60, gold: 12000 });
    });

    it('Star Fruit, Saffron, Fairy Rose y Fireheart Pepper tienen requiredLevel: 1 (no bloqueados para venta)', () => {
      const starFruit = rules.crops.find(c => c.name === 'Star Fruit');
      const saffron = rules.crops.find(c => c.name === 'Saffron');
      const fairyRose = rules.crops.find(c => c.name === 'Fairy Rose');
      const fireheart = rules.crops.find(c => c.name === 'Fireheart Pepper');

      expect(starFruit.requiredLevel).toBe(1);
      expect(saffron.requiredLevel).toBe(1);
      expect(fairyRose.requiredLevel).toBe(1);
      expect(fireheart.requiredLevel).toBe(1);
    });

    it('cultivos restringidos por SEED_SOURCES.shopAtFarmingLevel exigen su nivel correspondiente', () => {
      const aloe = rules.crops.find(c => c.name === 'Aloe');
      expect(aloe.requiredLevel).toBe(15);
      const cauliflower = rules.crops.find(c => c.name === 'Cauliflower');
      expect(cauliflower.requiredLevel).toBe(12);
    });
  });
});
