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

// Fórmula canónica oficial del juego (catalog.js:145)
export const xpForLevel = (L) => (L <= 1 ? 0 : Math.round(40 * (L - 1) ** 1.9));

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
export function computeClientLiveEnergyAndBed(rawEnergyObj, baseEnergy, snapshotTimestamp, prevEnergyMeta, options = {}) {
  const now = Date.now();
  const count = typeof options.farmersCount === 'number' ? options.farmersCount : 0;
  const isHolder = count > 0;
  // VIP estricto: pase VIP o 10+ Founding Farmers (rules.js:49)
  const isVip = Boolean(options.isVip || count >= 10);
  const isHolderOrVip = isHolder || isVip;

  // 100 de base; 150 solo con Founding Farmer (>= 1) o pase VIP (rules.js:46-57)
  const maxE = isHolderOrVip ? 150 : 100;
  // +1 energía cada 3 min SOLO para VIPs (rules.js:49)
  const regenRate = isVip ? 1 / (3 * 60000) : 0;
  // 450 energía de descanso por día UTC para holders (3 barras), 200 para jugadores base (2 barras)
  const sleepADay = isHolderOrVip ? 450 : 200;

  const utcDay = Math.floor(now / 86400000);
  const msToNextUtcMidnight = ((utcDay + 1) * 86400000) - now;
  const minsToMidnight = Math.max(1, Math.ceil(msToNextUtcMidnight / 60000));
  const hoursWait = Math.floor(minsToMidnight / 60);
  const minsWait = minsToMidnight % 60;
  const utcCountdownStr = `${hoursWait}h ${minsWait}m`;

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
    if (r && typeof r.from === 'number' && typeof r.until === 'number' && typeof r.rate === 'number') {
      grow(Math.min(now, r.from), regenRate);
      const before = v;
      grow(Math.min(now, r.until), r.rate);
      sleptGain = Math.max(0, v - before);
    }
    grow(now, regenRate);

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

    const utcHalf = Math.floor(now / 43200000);
    const foodEatenHalfDay = (rawEnergyObj.eaten && rawEnergyObj.eaten.half === utcHalf)
      ? Math.round(Number(rawEnergyObj.eaten.n) || 0)
      : (prevEnergyMeta?.foodEatenHalfDay || 0);

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
        foodEatenHalfDay,
        foodCapHalfDay: 90,
        regenPer3Min: isVip ? 1 : 0,
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
      foodEatenHalfDay: prevEnergyMeta?.foodEatenHalfDay || 0,
      foodCapHalfDay: 90,
      regenPer3Min: isVip ? 1 : 0,
      isVip,
      isHolder
    }
  };
}
