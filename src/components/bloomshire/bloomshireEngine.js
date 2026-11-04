// bloomshireEngine.js -- Módulo de lógica y utilidades matemáticas para Bloomshire
// Basado en el motor oficial del juego (catalog.js, rules.js, session.js)

export const CANONICAL_SKILLS = [
  { key: 'farming', label: 'Cultivo', icon: '🌾', gated: true, col: 'left' },
  { key: 'woodcutting', label: 'Tala', icon: '🪓', gated: true, col: 'left' },
  { key: 'fishing', label: 'Pesca', icon: '🎣', gated: true, col: 'left' },
  { key: 'foraging', label: 'Recolección', icon: '🌿', gated: true, col: 'left' },
  { key: 'cooking', label: 'Cocina', icon: '🍲', gated: true, col: 'left' },
  { key: 'crafting', label: 'Artesanía', icon: '🧱', gated: true, col: 'right' },
  { key: 'mining', label: 'Minería', icon: '⛏️', gated: true, col: 'right' },
  { key: 'combat', label: 'Combate', icon: '⚔️', gated: true, col: 'right' },
  { key: 'husbandry', label: 'Ganadería', icon: '🐔', gated: false, col: 'right' },
  { key: 'exploration', label: 'Exploración', icon: '📖', gated: false, col: 'right' }
];

export const SKILL_GAP = 3;

// Fórmula canónica oficial del juego (game/catalog.js:501)
export const xpForLevel = (L) => (L <= 1 ? 0 : Math.round(100 * (L - 1) ** 2.7));

// Cálculo canónico unificado de energía máxima: 150 si VIP o holder (>= 1 NFT), 100 de base
export function computeMaxEnergy(isVip, isHolder) {
  return (isVip || isHolder) ? 150 : 100;
}

export function computeCanonicalSkillsFromRaw(rawSkillsObj, fallbackBreak = null) {
  const breakdown = {};
  const source = (rawSkillsObj && typeof rawSkillsObj === 'object' && Object.keys(rawSkillsObj).length > 0)
    ? rawSkillsObj
    : (fallbackBreak || {});

  CANONICAL_SKILLS.forEach(def => {
    const entry = source[def.key];
    const rawXp = typeof entry === 'number'
      ? entry
      : (typeof entry?.xp === 'number' ? entry.xp : 0);

    let L = 1;
    while (L < 30 && rawXp >= xpForLevel(L + 1)) L++;
    const base = xpForLevel(L);
    const next = L >= 30 ? base : xpForLevel(L + 1);
    const into = Math.max(0, Math.round(rawXp - base));
    const need = Math.max(1, Math.round(next - base));
    const pct = L >= 30 ? 100 : Math.min(100, Math.round((into / need) * 100));

    breakdown[def.key] = {
      key: def.key,
      label: def.label,
      icon: def.icon,
      gated: def.gated,
      col: def.col,
      xp: Math.round(rawXp),
      level: L,
      rawLevel: L,
      effectiveLevel: L,
      into,
      need,
      nextLevelXp: next,
      pct
    };
  });

  // Regla de los 3 niveles (SKILL_GAP = 3) solo sobre las 8 GATED_SKILLS
  let minLvl = 30;
  CANONICAL_SKILLS.filter(d => d.gated).forEach(d => {
    const lvl = breakdown[d.key]?.rawLevel ?? 1;
    if (lvl < minLvl) minLvl = lvl;
  });
  if (minLvl === 30) minLvl = 1;

  const minSkillsObjs = CANONICAL_SKILLS.filter(d => d.gated && (breakdown[d.key]?.rawLevel ?? 1) === minLvl);
  const minSkillsLabels = minSkillsObjs.map(d => d.label);
  const maxAllowed = Math.min(30, minLvl + 3);

  CANONICAL_SKILLS.forEach(def => {
    const sk = breakdown[def.key];
    if (!sk) return;
    if (def.gated) {
      sk.effectiveLevel = Math.min(sk.rawLevel, maxAllowed);
      sk.isLowestGated = sk.rawLevel === minLvl;
      sk.capped = sk.rawLevel >= maxAllowed && sk.rawLevel > minLvl;
    } else {
      sk.effectiveLevel = sk.rawLevel;
      sk.isLowestGated = false;
      sk.capped = false;
    }
  });

  const farmRaw = breakdown.farming?.rawLevel || 1;
  const farmingLevel = Math.max(1, Math.min(farmRaw, maxAllowed));

  return {
    farmingLevel,
    skillsBreakdown: breakdown,
    skillsMeta: {
      minSkillKey: minSkillsObjs[0]?.key || 'foraging',
      minSkillName: minSkillsLabels.length > 0 ? minSkillsLabels.join(' y ') : 'Recolección y Cocina',
      minSkillsList: minSkillsLabels,
      minSkillLevel: minLvl,
      maxAllowedLevel: maxAllowed,
      rawFarmingLevel: farmRaw,
      isFarmingCapped: farmRaw >= maxAllowed
    }
  };
}

// Cálculo en vivo de Energía y Reloj de Cama UTC según reglas oficiales (rules.js:46-57)


/**
 * computeCropGrowth
 * Algoritmo canónico de crecimiento oficial de Bloomshire extraído de game/farm.js (growth y grown).
 * Modela con precisión:
 * - 1.er riego y 2.° riego obligatorio para cultivos de más de 60 min.
 * - Rebrotes (Strawberry, Tomato, Corn, etc.).
 * - Aceleración de Founding Farmers (crop.k = 0.8 / 0.7).
 * - Marchitado tras 5 horas de maduro (WITHER.afterRipeHours = 5).
 */
export function computeCropGrowth(crop, now = Date.now(), outdoors = false, seed = null, asIs = false) {
  if (!crop || typeof crop !== 'object') return null;
  if (!seed) return null;

  // Cultivos Premium (VIP Quarter): nunca se marchitan y se riegan automáticamente en crop.t (rules.js: PREMIUM / farm.js:86-90)
  if (!asIs && seed.premium && crop.t) {
    const w1 = crop.w1 ?? crop.t;
    const g0 = computeCropGrowth({ ...crop, w1, w2: null }, now, false, seed, true);
    const w2 = crop.w2 ?? (g0.needs === 'second' ? g0.waitAt : null);
    return { ...computeCropGrowth({ ...crop, w1, w2 }, now, false, seed, true), w1, w2 };
  }

  const stagesCount = typeof seed.stages === 'number'
    ? seed.stages
    : (Array.isArray(seed.stages) ? seed.stages.length : (seed.waterStages ?? 5));
  const last = stagesCount - 1;
  const from = Math.min(crop.base ?? 0, Math.max(0, last - 1));
  const span = Math.max(1, last - from);

  const baseMinutes = crop.regrowing
    ? (seed.regrow ?? seed.regrowMinutes ?? seed.grow ?? seed.growMinutes ?? 15)
    : (seed.grow ?? seed.growMinutes ?? 15);
  const minutes = baseMinutes * (crop.k ?? 1);
  const total = minutes * 60e3;
  const per = total / span;
  const two = minutes > 60 && span >= 2; // WATERING.secondWateringOverMinutes = 60
  const wait = two ? last - 1 : last;
  const late = 5 * 3600e3; // WITHER.afterRipeHours = 5

  if (!crop.w1) {
    return {
      stage: from,
      last,
      ripe: false,
      needs: 'first',
      readyAt: null,
      two,
      per,
      withered: false,
      statusText: outdoors ? 'Requiere riego (o lluvia al aire libre) 💧🌧️' : 'Necesita agua (1.er riego) 💧'
    };
  }

  const first = Math.min(wait, from + Math.floor(Math.max(0, now - crop.w1) / per));
  if (!two) {
    const isRipe = first >= last;
    const readyAt = crop.w1 + total;
    const withered = (!seed.premium) && isRipe && (now >= readyAt + late);
    return {
      stage: first,
      last,
      ripe: isRipe && !withered,
      needs: null,
      readyAt,
      two,
      per,
      withered,
      statusText: withered ? 'Marchito 🥀' : (isRipe ? '¡Listo para cosechar! 🌾' : 'Creciendo 🌱')
    };
  }

  if (first < wait) {
    const waitAt = crop.w1 + (wait - from) * per;
    return {
      stage: first,
      last,
      ripe: false,
      needs: null,
      readyAt: null,
      waitAt,
      two,
      per,
      withered: false,
      statusText: 'Creciendo (esperando 2.° riego) 🌱'
    };
  }

  if (!crop.w2) {
    const waitAt = crop.w1 + (wait - from) * per;
    return {
      stage: wait,
      last,
      ripe: false,
      needs: 'second',
      readyAt: null,
      waitAt,
      two,
      per,
      withered: false,
      statusText: outdoors ? '¡Requiere 2.° riego (o lluvia al aire libre)! 💧🌧️' : '¡Necesita 2.° riego! 💧'
    };
  }

  const stage = Math.min(last, wait + Math.floor(Math.max(0, now - crop.w2) / per));
  const isRipe = stage >= last;
  const readyAt = crop.w2 + per;
  const withered = (!seed.premium) && isRipe && (now >= readyAt + late);
  return {
    stage,
    last,
    ripe: isRipe && !withered,
    needs: null,
    readyAt,
    two,
    per,
    withered,
    statusText: withered ? 'Marchito 🥀' : (isRipe ? '¡Listo para cosechar! 🌾' : 'Creciendo 🌱')
  };
}

// Cálculo en vivo de Energía, Reloj de Cama UTC, Sapphire Jam y Comida diaria según reglas oficiales (rules.js:46-57, 2980-3020)
export function computeClientLiveEnergyAndBed(rawEnergyObj, baseEnergy, snapshotTimestamp, prevEnergyMeta, options = {}) {
  const now = Date.now();
  const count = typeof options.farmersCount === 'number' ? options.farmersCount : 0;
  const isHolder = count > 0 || Boolean(options.perks) || Boolean(options.isHolder);
  // VIP estricto: determinado exclusivamente por vipUntil vigente o flag isVip (rules.js:898)
  const isVip = Boolean(options.isVip || (options.vipUntil && options.vipUntil > now));
  const isHolderOrVip = isHolder || isVip;

  // 100 de base; 150 solo con Founding Farmer (>= 1) o pase VIP (rules.js:46-57)
  const maxE = computeMaxEnergy(isVip, isHolder);

  // Soporte canónico para Sapphire Jam (rules.js:227, 2981-2995):
  // Si está activo el jam, regenera +30% más rápido (1.3x) para CUALQUIER jugador (con o sin VIP)
  const jamTo = Number(options.buffs?.jam || rawEnergyObj?.buffs?.jam || 0);
  const isJamActive = jamTo > now;
  const jamMinutesLeft = isJamActive ? Math.ceil((jamTo - now) / 60000) : 0;
  const baseRegen = 1 / (3 * 60000); // 1 energía cada 3 min
  const regenRate = isJamActive ? (baseRegen * 1.3) : (isVip ? baseRegen : 0);
  
  // Sueño diario canónico:
  // Jugador común: 200 (2 barras de 100).
  // VIP o holder: max(3, min(5, perks.sleeps)) barras de 150 (450 / 600 / 750).
  // Fallback: común 200, VIP/holder 450, 10 farmers / Mythic 600, 20 farmers 750.
  // El Mythic cuenta como 10 farmers.
  const perksSleeps = (options.perks && typeof options.perks.sleeps === 'number')
    ? options.perks.sleeps
    : (typeof options.perksSleeps === 'number' ? options.perksSleeps : null);
  const isMythic = Boolean(options.isMythic || (options.perks && (options.perks.mythic || options.perks.isMythic)));

  let sleepADay = 200;
  if (isHolderOrVip) {
    if (typeof perksSleeps === 'number' && perksSleeps >= 3) {
      sleepADay = Math.max(3, Math.min(5, perksSleeps)) * 150;
    } else if (count >= 20) {
      sleepADay = 750;
    } else if (count >= 10 || isMythic) {
      sleepADay = 600;
    } else {
      sleepADay = 450;
    }
  } else {
    sleepADay = 200;
  }

  const utcDay = Math.floor(now / 86400000);
  const msToNextUtcMidnight = ((utcDay + 1) * 86400000) - now;
  const minsToMidnight = Math.max(1, Math.ceil(msToNextUtcMidnight / 60000));
  const hoursWait = Math.floor(minsToMidnight / 60);
  const minsWait = minsToMidnight % 60;
  const utcCountdownStr = `${hoursWait}h ${minsWait}m`;

  // Contador de Comida Canónico (FOOD_BARS_A_DAY = 1):
  // 1 barra completa al día (100⚡ común / 150⚡ VIP o Holder)
  const ateData = options.ate || rawEnergyObj?.ate || null;
  const foodEatenToday = (ateData && ateData.day === utcDay && typeof ateData.energy === 'number')
    ? Math.round(ateData.energy)
    : (prevEnergyMeta?.foodEatenToday || 0);
  const foodCapToday = maxE;
  const foodRoomToday = Math.max(0, foodCapToday - foodEatenToday);

  if (rawEnergyObj && typeof rawEnergyObj.v === 'number') {
    let v = rawEnergyObj.v;
    let t = (typeof rawEnergyObj.at === 'number' && rawEnergyObj.at > 0) ? rawEnergyObj.at : (snapshotTimestamp || now);
    const r = rawEnergyObj.recovery;
    let sleptGain = 0;

    const grow = (to, rate) => {
      if (to > t) {
        if (v < maxE) v = Math.min(maxE, v + rate * (to - t));
        t = to;
      }
    };

    const vipTo = (isVip && typeof options.vipUntil === 'number' && options.vipUntil > now) ? options.vipUntil : (isVip ? now : 0);
    const rateAt = (x) => (x < jamTo ? baseRegen * 1.3 : x < vipTo ? baseRegen : 0);
    const idle = (to) => {
      for (const edge of [jamTo, vipTo, to].sort((a, b) => a - b)) {
        const end = Math.min(edge, to);
        if (end > t) {
          const k = rateAt(t);
          if (k > 0) grow(end, k);
          else t = end;
        }
      }
    };

    if (r && typeof r.from === 'number' && typeof r.until === 'number' && typeof r.rate === 'number') {
      idle(Math.min(now, r.from));
      const before = v;
      grow(Math.min(now, r.until), r.rate);
      sleptGain = Math.max(0, v - before);
    }
    idle(now);

    const currentEnergy = Math.floor(Math.max(0, Math.min(maxE, v)));
    let usedSleepToday = (rawEnergyObj.slept && rawEnergyObj.slept.day === utcDay)
      ? (Number(rawEnergyObj.slept.n) || 0)
      : (typeof rawEnergyObj.sleepLeft === 'number' ? Math.max(0, sleepADay - rawEnergyObj.sleepLeft) : 0);
    if (r && (r.day ?? Math.floor((r.from || now) / 86400000)) === utcDay) {
      usedSleepToday += sleptGain;
    }
    const sleepLeft = typeof rawEnergyObj.sleepLeft === 'number'
      ? Math.max(0, Math.round(rawEnergyObj.sleepLeft))
      : Math.max(0, Math.round(sleepADay - usedSleepToday));
    const recovering = Boolean(r && now < (r.until || 0) && v < maxE - 1e-3);
    const recoverMinutesLeft = recovering ? Math.max(1, Math.ceil((r.until - now) / 60000)) : 0;
    const sleepExhausted = sleepLeft <= 0;
    const canRest = !recovering && !sleepExhausted && currentEnergy < maxE;

    const bedWaitText = recovering
      ? `Recuperando (${recoverMinutesLeft}m)`
      : sleepExhausted
        ? utcCountdownStr
        : `Lista (${sleepLeft}/${sleepADay}⚡)`;

    return {
      currentEnergy,
      energyMeta: {
        recovering,
        recoverMinutesLeft,
        canRest,
        sleepExhausted,
        nextRestMinutes: sleepExhausted ? minsToMidnight : 0,
        bedWaitText,
        utcCountdownStr,
        sleepLeft,
        sleepADay,
        usedSleepToday: Math.round(usedSleepToday),
        foodEatenToday,
        foodCapToday,
        foodRoomToday,
        foodCapExhausted: foodRoomToday <= 0,
        isJamActive,
        jamMinutesLeft,
        jamBadgeText: isJamActive ? `Mermelada de Zafiro (${jamMinutesLeft}m restante)` : null,
        regenPer3Min: isJamActive ? 1.3 : (isVip ? 1 : 0),
        isVip,
        isHolder
      }
    };
  }

  // Fallback si no hay rawEnergyObj completo
  const baseVal = typeof baseEnergy === 'number' ? baseEnergy : (isHolderOrVip ? 115 : 80);
  const elapsedMs = snapshotTimestamp ? Math.max(0, now - snapshotTimestamp) : 0;
  const gained = elapsedMs * regenRate;
  const currentEnergy = Math.floor(Math.min(maxE, Math.max(0, baseVal + gained)));

  const sleepExhausted = prevEnergyMeta?.sleepExhausted ?? true;
  const sleepLeft = prevEnergyMeta?.sleepLeft ?? (sleepExhausted ? 0 : sleepADay);

  return {
    currentEnergy,
    energyMeta: {
      recovering: false,
      recoverMinutesLeft: 0,
      canRest: !sleepExhausted && currentEnergy < maxE,
      sleepExhausted,
      nextRestMinutes: minsToMidnight,
      bedWaitText: sleepExhausted ? utcCountdownStr : `Lista (${sleepLeft}/${sleepADay}⚡)`,
      utcCountdownStr,
      sleepLeft,
      sleepADay,
      usedSleepToday: sleepADay - sleepLeft,
      foodEatenToday,
      foodCapToday,
      foodRoomToday,
      foodCapExhausted: foodRoomToday <= 0,
      isJamActive,
      jamMinutesLeft,
      jamBadgeText: isJamActive ? `Mermelada de Zafiro (${jamMinutesLeft}m restante)` : null,
      regenPer3Min: isJamActive ? 1.3 : (isVip ? 1 : 0),
      isVip,
      isHolder
    }
  };
}
