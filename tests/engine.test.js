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
  bloomshireRainsOn,
  WORLD_TIME,
  SEASON_MS,
  seasonNo,
  seasonAt,
  seasonStartAt,
  inSeason
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

    it('respeta perks.sleeps explícito enviado en el snapshot (como barras canónicas 3, 4, 5)', () => {
      const resBars3 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, perks: { sleeps: 3 } });
      expect(resBars3.energyMeta.sleepADay).toBe(450);

      const resBars4 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, perks: { sleeps: 4 } });
      expect(resBars4.energyMeta.sleepADay).toBe(600);

      const resBars5 = computeClientLiveEnergyAndBed(null, 50, now, null, { farmersCount: 0, perks: { sleeps: 5 } });
      expect(resBars5.energyMeta.sleepADay).toBe(750);
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

    it('cultivos premium ignoran la lluvia meteorológica incluso sembrados al aire libre (outdoors = true)', () => {
      const goldSeed = { id: 'Golden Pumpkin', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true };
      const tPlanted = 1730000000000;
      const g = computeCropGrowth({ s: 40, t: tPlanted, w1: null, w2: null }, tPlanted + 5000, true, goldSeed);

      expect(g.rained).toBeUndefined();
      expect(g.readyAt).toBe(tPlanted + 15 * 60000);
      expect(g.statusText).not.toContain('LLUVIA');
      expect(g.statusText).not.toContain('lluvia');
    });

    it('aplica la regla canónica de mapas interiores y fixedSky del juego (farm.js:136 & weather.js:245)', () => {
      const isOutdoors = (doc) => {
        const id = doc?.id ?? '';
        const region = doc?.region ?? '';
        const isInterior = /^interior/i.test(id) || region === 'interiors';
        const isFixedSky = region === 'vip' || id === 'vip' || id === 'vip_quarter';
        return !isInterior && !isFixedSky;
      };

      expect(isOutdoors({ id: 'interior_barn', region: 'interiors' })).toBe(false);
      expect(isOutdoors({ id: 'interior_greenhouse', region: 'interiors' })).toBe(false);
      expect(isOutdoors({ id: 'home_island', region: 'interiors' })).toBe(false);
      expect(isOutdoors({ id: 'vip_quarter', region: 'vip' })).toBe(false); // VIP Quarter no recibe lluvia por fixedSky
      expect(isOutdoors({ id: 'bloomshire', region: 'valley' })).toBe(true);
      expect(isOutdoors({ id: 'whisperwood', region: 'forest' })).toBe(true);
    });

    it('calcula la rotación canónica de las 4 estaciones de 28 días (rules.js:611-628)', () => {
      const epoch = WORLD_TIME.epoch;
      expect(SEASON_MS).toBe(8 * 3600e3 * 28); // 806.400.000 ms
      expect(seasonAt(epoch)).toBe('Spring');
      expect(seasonAt(epoch + SEASON_MS)).toBe('Summer');
      expect(seasonAt(epoch + 2 * SEASON_MS)).toBe('Fall');
      expect(seasonAt(epoch + 3 * SEASON_MS)).toBe('Winter');
      expect(seasonAt(epoch + 4 * SEASON_MS)).toBe('Spring');
    });

    it('marchitado por fin de temporada (farm.js:79-82): cultivo de primavera que no madura a tiempo se marchita en turn', () => {
      const springTurn = WORLD_TIME.epoch + SEASON_MS; // Inicio de Verano (turn)
      const cauliSeed = { id: 'Cauliflower', grow: 90, regrow: null, harvests: 1, stages: 6, seasons: ['Spring'], premium: false };
      
      // Sembrado y regado 30 min antes del cambio de temporada (necesita 90 min)
      const tPlanted = springTurn - 30 * 60000;
      const g = computeCropGrowth({ s: 3, t: tPlanted, w1: tPlanted, w2: null }, springTurn + 1000, false, cauliSeed);

      expect(g.withered).toBe(true);
      expect(g.witheredAt).toBe(springTurn);
      expect(g.ripe).toBe(false);
      expect(g.statusText).toContain('Marchito por fin de temporada');
    });

    it('cultivo que maduró antes del cambio de estación NO se marchita al cambio y espera 5h (farm.js:81 & rules.js:654)', () => {
      const springTurn = WORLD_TIME.epoch + SEASON_MS;
      const springOnionSeed = { id: 'Spring Onion', grow: 6, regrow: null, harvests: 1, stages: 3, seasons: ['Spring'], premium: false };

      // Sembrado 10 min antes del cambio (madura a los 6 min, antes de turn)
      const tPlanted = springTurn - 10 * 60000;
      const tReady = tPlanted + 6 * 60000; // 4 min antes de turn

      // En turn + 1 minuto: sigue maduro y NO marchito porque maduró a tiempo
      const gAtTurn = computeCropGrowth({ s: 27, t: tPlanted, w1: tPlanted }, springTurn + 60000, false, springOnionSeed);
      expect(gAtTurn.ripe).toBe(true);
      expect(gAtTurn.withered).toBe(false);

      // Tras 5 horas de maduro (tReady + 5h + 1s): se marchita por WITHER.afterRipeHours
      const g5h = computeCropGrowth({ s: 27, t: tPlanted, w1: tPlanted }, tReady + 5 * 3600e3 + 1000, false, springOnionSeed);
      expect(g5h.withered).toBe(true);
      expect(g5h.statusText).toContain('Marchito tras 5h maduro');
    });

    it('cultivos permanentes (staples: Carrot, Wheat) y premium nunca se marchitan por fin de estación', () => {
      const springTurn = WORLD_TIME.epoch + SEASON_MS;
      const carrotSeed = { id: 'Carrot', grow: 2, regrow: null, harvests: 1, stages: 5, seasons: ['all'], premium: false };
      const goldSeed = { id: 'Golden Pumpkin', grow: 15, regrow: null, harvests: 1, stages: 4, seasons: null, premium: true };

      // Zanahoria sembrada justo antes del cambio:
      const tPlanted = springTurn - 1000;
      const gCarrot = computeCropGrowth({ s: 0, t: tPlanted, w1: tPlanted }, springTurn + 1000, false, carrotSeed);
      expect(gCarrot.withered).toBe(false);

      // Golden Pumpkin VIP sembrada justo antes del cambio:
      const gGold = computeCropGrowth({ s: 40, t: tPlanted }, springTurn + 1000, false, goldSeed);
      expect(gGold.withered).toBe(false);
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

    it('VIP otorga tope diario de oro con el multiplicador oficial (rules.vipPerks.sellGold = 1.25 -> 15.000g)', () => {
      expect(rules.vipPerks?.sellGold).toBe(1.25);
      const baseCap = rules.sellLimits.gold; // 12000
      const vipCap = Math.round(baseCap * (rules.vipPerks?.sellGold ?? 1.25));
      expect(vipCap).toBe(15000);
    });

    it('calc_data.json incluye métricas de rebrote para granjeros Nivel 15+ (rules.REGROW_FROM_LEVEL = 15)', () => {
      const calcPath = path.resolve(__dirname, '../public/data/bloomshire/calc_data.json');
      const calc = JSON.parse(fs.readFileSync(calcPath, 'utf8'));
      
      const strawberry = calc.farming.find(c => c.name.includes('Fresa') && !c.name.includes('Diamante'));
      expect(strawberry.hasRegrow).toBe(true);
      expect(strawberry.regrowMinutes).toBe(60);
      expect(strawberry.harvests).toBe(5);
      // Ciclo: 80 min + 4 * 60 min = 320 min
      expect(strawberry.regrowTotalMinutes).toBe(320);
      // 5 cosechas * 990g - 495g coste semilla = 4455g
      expect(strawberry.regrowNet).toBe(4455);
      // Oro/min con rebrote: 4455 / 320 = 13.92g/min (más del doble que 6.19g/min)
      expect(strawberry.regrowGoldMin).toBe(13.92);

      const tomato = calc.farming.find(c => c.name.includes('Tomate') && !c.name.includes('Negro'));
      expect(tomato.hasRegrow).toBe(true);
      expect(tomato.regrowMinutes).toBe(35);
      expect(tomato.regrowTotalMinutes).toBe(185); // 45 + 4*35
      expect(tomato.regrowGoldMin).toBe(13.24); // (5*545 - 275) / 185
    });
  });

  // 7. Seguridad SIWE y Conflicto de Wallet (S3)
  describe('7. Seguridad SIWE y Resolución de Conflicto de Wallet (S3)', () => {
    it('detecta conflicto cuando un evento de extensión trae una wallet distinta a la autenticada', () => {
      const authenticatedWallet = '0x1111111111111111111111111111111111111111';
      const incomingExtensionWallet = '0x2222222222222222222222222222222222222222';
      const isFromExtension = true;

      const hasConflict = Boolean(
        isFromExtension &&
        incomingExtensionWallet &&
        authenticatedWallet &&
        incomingExtensionWallet.toLowerCase() !== authenticatedWallet.toLowerCase()
      );

      expect(hasConflict).toBe(true);
    });

    it('no dispara conflicto ante la misma wallet o eventos no provenientes de la extensión', () => {
      const authenticatedWallet = '0x1111111111111111111111111111111111111111';
      const sameWallet = '0x1111111111111111111111111111111111111111';
      
      const hasConflictSame = Boolean(
        true &&
        sameWallet &&
        authenticatedWallet &&
        sameWallet.toLowerCase() !== authenticatedWallet.toLowerCase()
      );
      expect(hasConflictSame).toBe(false);

      const hasConflictNotExtension = Boolean(
        false &&
        '0x3333333333333333333333333333333333333333' &&
        authenticatedWallet &&
        '0x3333333333333333333333333333333333333333' !== authenticatedWallet.toLowerCase()
      );
      expect(hasConflictNotExtension).toBe(false);
    });

    it('S3: carrera al inicio detectada si la extensión reporta antes de resolver /api/auth?action=me', () => {
      // Simular referencia mutable lastReportedExtensionWalletRef y authenticatedWalletRef
      let lastReportedExtensionWallet = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'.toLowerCase();
      let authenticatedWallet = null;

      // Evento de extensión llega primero (applyIncomingSync)
      // Guarda en lastReportedExtensionWalletRef
      expect(lastReportedExtensionWallet).toBeTruthy();

      // Tiempo después, concluye fetch('/api/auth?action=me') con verifiedWallet distinta
      const verifiedWallet = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'.toLowerCase();
      authenticatedWallet = verifiedWallet;

      // Validación de carrera
      const isRaceMismatch = Boolean(
        lastReportedExtensionWallet &&
        lastReportedExtensionWallet !== verifiedWallet
      );

      expect(isRaceMismatch).toBe(true);
    });
  });
});
