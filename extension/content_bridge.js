// content_bridge.js - ISOLATED world bridge for bloomshire.xyz
(function () {
  if (window.__bloomshire_bridge_loaded) return;
  window.__bloomshire_bridge_loaded = true;

  console.log('[Bloomshire Companion Bridge] ISOLATED world bridge active');

  let latestBloomshireState = null;
  let latestRawSave = null;

  // Diccionario canónico de ítems (Inglés -> Español)
  const ITEM_NAMES_ES = {
    'Carrot': 'Zanahorias',
    'Parsnip': 'Chirivía',
    'Spring Onion': 'Cebollín',
    'Wheat': 'Trigo',
    'Potato': 'Papa',
    'Cabbage': 'Repollo',
    'Onion': 'Cebolla',
    'Marigold': 'Caléndula (Marigold)',
    'Broccoli': 'Brócoli',
    'Rice': 'Arroz',
    'Sunflower': 'Girasol',
    'Corn': 'Maíz',
    'Cucumber': 'Pepino',
    'Tomato': 'Tomate',
    'Adzuki Bean': 'Judía Adzuki',
    'Green Beans': 'Judías Verdes',
    'Blackberry': 'Mora',
    'Eggplant': 'Berenjena',
    'Bell Pepper': 'Pimiento',
    'Hot Pepper': 'Pimiento Picante',
    'Green Pepper': 'Pimiento Verde',
    'Red Pepper': 'Pimiento Rojo',
    'Yellow Pepper': 'Pimiento Amarillo',
    'Strawberry': 'Fresa',
    'Blueberry': 'Arándano',
    'Grapes': 'Uvas',
    'Star Fruit': 'Fruta Estrella',
    'Watermelon': 'Sandía',
    'Pumpkin': 'Calabaza',
    'Golden Pumpkin': 'Calabaza Dorada',
    'Sapphire Blueberry': 'Arándano Zafiro',
    'Diamond Strawberry': 'Fresa Diamante',
    'Sunfire Pepper': 'Pimiento Fuego Solar',
    'Wood White': 'Blanca de Madera',
    'Pike': 'Lucio',
    'Pike Fish': 'Lucio',
    'Carp': 'Carpa',
    'Salmon': 'Salmón',
    'Trout': 'Trucha',
    'Catfish': 'Pez Gato',
    'Ghost Catfish': 'Pez Gato Fantasma',
    'Golden Fish': 'Pez Dorado',
    'Wood': 'Madera',
    'Stone': 'Piedra',
    'Copper Ore': 'Mena de Cobre',
    'Copper Bar': 'Lingote de Cobre',
    'Topaz': 'Topacio',
    'Sapphire': 'Zafiro',
    'Emerald': 'Esmeralda',
    'Ruby': 'Rubí',
    'Quartz': 'Cuarzo',
    'Rose Quartz': 'Cuarzo Rosa',
    'Silvercap Mushroom': 'Seta Silvercap',
    'Glowcap Mushroom': 'Seta Glowcap'
  };

  // Definición de las 10 habilidades canónicas de catalog.js
  const ALL_SKILLS_DEFS = [
    { key: 'farming', label: 'Cultivo', icon: '🌾', gated: true },
    { key: 'woodcutting', label: 'Tala', icon: '🪓', gated: true },
    { key: 'fishing', label: 'Pesca', icon: '🎣', gated: true },
    { key: 'foraging', label: 'Recolección', icon: '🌿', gated: true },
    { key: 'cooking', label: 'Cocina', icon: '🍲', gated: true },
    { key: 'crafting', label: 'Artesanía', icon: '🧱', gated: true },
    { key: 'mining', label: 'Minería', icon: '⛏️', gated: true },
    { key: 'combat', label: 'Combate', icon: '⚔️', gated: true },
    { key: 'husbandry', label: 'Ganadería', icon: '🐔', gated: false },
    { key: 'exploration', label: 'Exploración', icon: '📖', gated: false }
  ];

  const GATED_SKILLS = ['farming', 'woodcutting', 'mining', 'fishing', 'foraging', 'cooking', 'combat', 'crafting'];

  // Catálogo base de capítulos Book One (Season 0) y secundarias con pasos canónicos
  let KNOWN_QUESTS = {};

  function applyQuestAliases(catalog) {
    if (!catalog) return;
    ['marlow', 'hollis', 'wren', 'juniper', 'bram', 'tamsin', 'pell', 'hazel', 'hugo', 'mabel', 'lena', 'clara', 'elsie'].forEach(k => {
      if (catalog['sd_' + k] && !catalog['s_' + k]) {
        catalog['s_' + k] = catalog['sd_' + k];
      }
      if (catalog['s_' + k] && !catalog['sd_' + k]) {
        catalog['sd_' + k] = catalog['s_' + k];
      }
    });
    if (catalog['bk18'] && !catalog['ff18']) {
      catalog['ff18'] = catalog['bk18'];
    }
    if (catalog['bk19'] && !catalog['ff19']) {
      catalog['ff19'] = catalog['bk19'];
    }
    [20, 21, 22, 23, 24].forEach(n => {
      if (catalog['bk' + n] && !catalog['ff' + n]) {
        catalog['ff' + n] = catalog['bk' + n];
      }
    });
  }

  // Carga asíncrona modular de misiones desde quests_es.json
  let questsCatalogPromise = null;
  async function loadQuestsCatalog() {
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        const url = chrome.runtime.getURL('quests_es.json');
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          KNOWN_QUESTS = data || {};
          applyQuestAliases(KNOWN_QUESTS);
          console.log('[Bloomshire Companion Bridge] Diccionario quests_es.json cargado exitosamente:', Object.keys(KNOWN_QUESTS).length, 'misiones');
          if (latestRawSave) {
            const reParsed = parseSave(latestRawSave);
            if (reParsed) {
              sendSnapshotToBackground(reParsed, false);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Bloomshire Companion Bridge] Error al cargar quests_es.json:', err);
    }
  }
  questsCatalogPromise = loadQuestsCatalog();

  function translateQuestText(txt) {
    if (!txt || typeof txt !== 'string') return '';
    return txt
      .replace(/The Hidden Glade/gi, 'El Claro Escondido')
      .replace(/Look at the arch (of|de) roots/gi, 'Examina el arco de raíces en Whisperwood')
      .replace(/Talk to /gi, 'Habla con ')
      .replace(/Return to /gi, 'Regresa con ')
      .replace(/Bring /gi, 'Lleva ')
      .replace(/Harvest /gi, 'Cosecha ')
      .replace(/Plant /gi, 'Planta ')
      .replace(/Chase off the grey wolf/gi, 'Ahuyenta al lobo gris')
      .replace(/in Whisperwood/gi, 'en Whisperwood');
  }

  // Algoritmo exacto de rules.js (Energy.#walk + THE REWORK 2026-10-26)
  function computeLiveEnergyAndBed(saveEnergy, saveRoot, liveEnergyOverride) {
    const now = Date.now();
    // VIP canónico: vigente por save.vipUntil o save.perks.vipUntil (rules.js:898)
    const vipTo = Math.max(saveRoot?.vipUntil ?? 0, saveRoot?.perks?.vipUntil ?? 0);
    const isVip = vipTo > now;
    // Holder canónico según play.js:2118: !!save.perks
    const isHolder = Boolean(saveRoot?.perks);
    const isHolderOrVip = isHolder || isVip;
    const maxE = isHolderOrVip ? 150 : 100;

    // Soporte para Sapphire Jam (rules.js:2981-2995): +30% regeneración pasiva para cualquiera
    const jamTo = Number(saveRoot?.buffs?.jam || 0);
    const isJamActive = jamTo > now;
    const jamMinutesLeft = isJamActive ? Math.ceil((jamTo - now) / 60000) : 0;
    const baseRegen = 1 / (3 * 60000); // 1 energía cada 3 min
    const hasPassiveRegen = isHolderOrVip;
    const regenRate = isJamActive ? (baseRegen * 1.3) : (hasPassiveRegen ? baseRegen : 0);

    // Escala canónica de sueño diario (rules.js: rules.ENERGY.sleep)
    const perksSleeps = (saveRoot?.perks && typeof saveRoot.perks.sleeps === 'number') ? saveRoot.perks.sleeps : null;
    const isMythic = Boolean(saveRoot?.perks?.mythic || saveRoot?.perks?.isMythic);
    let sleepADay = 200;
    if (isHolderOrVip) {
      if (typeof perksSleeps === 'number' && perksSleeps >= 3) {
        sleepADay = Math.max(3, Math.min(5, perksSleeps)) * 150;
      } else if (isMythic) {
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

    // Contador de comida canónico (FOOD_BARS_A_DAY = 1): 1 barra completa diaria
    const ateData = (saveRoot?.ate && typeof saveRoot.ate === 'object') ? saveRoot.ate : null;
    const foodEatenToday = (ateData && ateData.day === utcDay && typeof ateData.energy === 'number')
      ? Math.round(ateData.energy)
      : 0;
    const foodCapToday = maxE;
    const foodRoomToday = Math.max(0, foodCapToday - foodEatenToday);

    if (typeof saveEnergy === 'number') {
      const val = typeof liveEnergyOverride === 'number' ? liveEnergyOverride : Math.floor(Math.min(maxE, Math.max(0, saveEnergy)));
      return {
        currentEnergy: val,
        rawEnergyObj: null,
        energyMeta: {
          recovering: false,
          recoverMinutesLeft: 0,
          canRest: val < maxE,
          sleepExhausted: false,
          nextRestMinutes: 0,
          bedWaitText: `Lista (${sleepADay}/${sleepADay}⚡)`,
          sleepLeft: sleepADay,
          sleepADay: sleepADay,
          usedSleepToday: 0,
          foodEatenToday,
          foodCapToday,
          foodRoomToday,
          foodCapExhausted: foodRoomToday <= 0,
          isJamActive,
          jamMinutesLeft,
          jamBadgeText: isJamActive ? `Mermelada de Zafiro (${jamMinutesLeft}m restante)` : null,
          regenPer3Min: isJamActive ? 1.3 : (hasPassiveRegen ? 1 : 0)
        }
      };
    }

    const e = (saveEnergy && typeof saveEnergy === 'object') ? saveEnergy : {};
    let v = typeof e.v === 'number' ? e.v : maxE;
    let t = (typeof e.at === 'number' && e.at > 0) ? e.at : now;
    const r = (e.recovery && typeof e.recovery === 'object') ? e.recovery : null;

    let sleptGain = 0;
    const grow = (to, rate) => {
      if (to > t) {
        if (v < maxE) {
          v = Math.min(maxE, v + rate * (to - t));
        }
        t = to;
      }
    };

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
    if (v < maxE && maxE - v < 1e-3) v = maxE;
    const ceiling = Math.max(maxE, typeof e.v === 'number' ? e.v : 0);
    const exactVal = Math.max(0, Math.min(ceiling, v));
    const currentEnergy = Math.floor(Math.max(
      exactVal,
      typeof liveEnergyOverride === 'number' ? liveEnergyOverride : 0
    ));

    // Cuota diaria de sueño según perfil real
    let usedSleepToday = (e.slept && e.slept.day === utcDay)
      ? (Number(e.slept.n) || 0)
      : (typeof e.sleepLeft === 'number' ? Math.max(0, sleepADay - e.sleepLeft) : 0);
    if (r) {
      const rDay = r.day ?? Math.floor((r.from || now) / 86400000);
      if (rDay === utcDay) usedSleepToday += sleptGain;
    }
    const sleepLeft = typeof e.sleepLeft === 'number'
      ? Math.max(0, Math.round(e.sleepLeft))
      : Math.max(0, Math.round(sleepADay - usedSleepToday));

    const recovering = Boolean(r && now < (r.until || 0) && exactVal < maxE - 1e-3);
    const recoverMinutesLeft = recovering ? Math.max(1, Math.ceil((r.until - now) / 60000)) : 0;
    const sleepExhausted = sleepLeft <= 0;
    const nextRestMinutes = sleepExhausted ? minsToMidnight : 0;
    const canRest = !recovering && !sleepExhausted && currentEnergy < maxE;

    const bedWaitText = recovering
      ? `Recuperando (${recoverMinutesLeft}m)`
      : sleepExhausted
        ? utcCountdownStr
        : `Lista (${sleepLeft}/${sleepADay}⚡)`;

    return {
      currentEnergy,
      rawEnergyObj: {
        v: e.v,
        at: e.at,
        recovery: e.recovery || null,
        slept: e.slept || null,
        eaten: e.eaten || null,
        ate: saveRoot?.ate || null,
        sold: saveRoot?.sold || null,
        buffs: saveRoot?.buffs || null
      },
      energyMeta: {
        recovering,
        recoverMinutesLeft,
        canRest,
        sleepExhausted,
        nextRestMinutes,
        bedWaitText,
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
        regenPer3Min: isJamActive ? 1.3 : (isVip ? 1 : 0)
      }
    };
  }

  function parseSave(save) {
    if (!save || typeof save !== 'object') return null;
    latestRawSave = save;

    const purse = save.purse || {};
    const gold = typeof purse.gold === 'number' ? purse.gold : (typeof save.gold === 'number' ? save.gold : (latestBloomshireState?.gold ?? 0));
    const shards = typeof purse.shards === 'number' ? purse.shards : (typeof save.shards === 'number' ? save.shards : (latestBloomshireState?.shards ?? 0));
    const avyn = typeof purse.avyn === 'number' ? purse.avyn : (typeof save.avyn === 'number' ? save.avyn : (latestBloomshireState?.avyn ?? 0));
    const bank = typeof purse.bank === 'number' ? purse.bank : (latestBloomshireState?.bank ?? 0);

    // 1. ENERGÍA EXACTA (#walk + +1 cada 3m VIP) Y MONITOR DE CAMA
    const vipTo = Math.max(save?.vipUntil ?? 0, save?.perks?.vipUntil ?? 0);
    const isVip = vipTo > Date.now();
    const isHolder = Boolean(save?.perks);
    const maxE = (isVip || isHolder) ? 150 : 100;
    const rawEnergyInput = save._liveEnergyObj || (save.energy && typeof save.energy === 'object' ? save.energy : (typeof save.energy === 'number' ? { v: save.energy } : {}));
    const { currentEnergy: energy, rawEnergyObj, energyMeta } = computeLiveEnergyAndBed(
      rawEnergyInput,
      save,
      typeof save._liveEnergy === 'number' ? save._liveEnergy : undefined
    );

    // 2. LAS 10 HABILIDADES REALES Y FÓRMULA OFICIAL DE CATALOG.JS: Math.round(100 * (L - 1) ** 2.7)
    const xpFor = (L) => (L <= 1 ? 0 : Math.round(100 * (L - 1) ** 2.7));
    const calcSkillProgress = (xpVal) => {
      const rawXp = Math.max(0, typeof xpVal === 'number' ? xpVal : (typeof xpVal?.xp === 'number' ? xpVal.xp : 0));
      let L = 1;
      while (L < 30 && rawXp >= xpFor(L + 1)) L++;
      const base = xpFor(L);
      const next = L >= 30 ? base : xpFor(L + 1);
      const into = Math.max(0, Math.round(rawXp - base));
      const need = Math.max(1, Math.round(next - base));
      const pct = L >= 30 ? 100 : Math.min(100, Math.round((into / need) * 100));
      return {
        xp: Math.round(rawXp),
        level: L,
        rawLevel: L,
        effectiveLevel: L,
        into,
        need,
        nextLevelXp: next,
        pct
      };
    };

    let farmingLevel = 5;
    let skillsBreakdown = {};
    let skillsMeta = {
      minSkillKey: 'foraging',
      minSkillName: 'Recolección y Cocina',
      minSkillsList: ['Recolección', 'Cocina'],
      minSkillLevel: 2,
      maxAllowedLevel: 5,
      isFarmingCapped: true
    };

    if (save.skills && typeof save.skills === 'object') {
      ALL_SKILLS_DEFS.forEach(def => {
        const val = save.skills[def.key] ?? 0;
        const prog = calcSkillProgress(val);
        skillsBreakdown[def.key] = {
          ...prog,
          key: def.key,
          label: def.label,
          icon: def.icon,
          gated: def.gated
        };
      });

      // La regla de los 3 niveles (SKILL_GAP = 3) solo evalúa las 8 GATED_SKILLS (excluye husbandry y exploration)
      let minLvl = 30;
      GATED_SKILLS.forEach(k => {
        const lvl = skillsBreakdown[k]?.rawLevel ?? 1;
        if (lvl < minLvl) minLvl = lvl;
      });
      if (minLvl === 30) minLvl = 1;

      const minSkillsObjs = ALL_SKILLS_DEFS.filter(d => d.gated && (skillsBreakdown[d.key]?.rawLevel ?? 1) === minLvl);
      const minSkillsLabels = minSkillsObjs.map(d => d.label);
      const maxAllowed = Math.min(30, minLvl + 3);

      const farmRaw = skillsBreakdown.farming?.rawLevel || 5;
      farmingLevel = Math.max(1, Math.min(farmRaw, maxAllowed));

      ALL_SKILLS_DEFS.forEach(def => {
        const sk = skillsBreakdown[def.key];
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

      skillsMeta = {
        minSkillKey: minSkillsObjs[0]?.key || 'foraging',
        minSkillName: minSkillsLabels.length > 0 ? minSkillsLabels.join(' y ') : 'Recolección',
        minSkillsList: minSkillsLabels,
        minSkillLevel: minLvl,
        maxAllowedLevel: maxAllowed,
        rawFarmingLevel: farmRaw,
        isFarmingCapped: farmRaw >= maxAllowed
      };
    } else if (typeof save.level === 'number' && save.level > 0) {
      farmingLevel = save.level;
    }

    // 3. EXTRAER INVENTARIO (hotbar, bag, chests)
    const inventory = [];
    const inv = save.inventory || {};
    const pushSlot = (slot, area) => {
      if (!slot || !slot.id) return;
      const id = String(slot.id);
      const qty = typeof slot.n === 'number' ? slot.n : (typeof slot.qty === 'number' ? slot.qty : 1);
      if (qty <= 0) return;
      const found = inventory.find(x => x.id.toLowerCase() === id.toLowerCase() && x.area === area);
      if (found) {
        found.qty += qty;
      } else {
        inventory.push({ id, name: id, qty, area, tier: slot.tier || null });
      }
    };

    if (Array.isArray(inv.hotbar)) inv.hotbar.forEach(s => pushSlot(s, 'hotbar'));
    if (Array.isArray(inv.bag)) inv.bag.forEach(s => pushSlot(s, 'bag'));

    // Chests del jugador (inv.chests o save.chests)
    const allChests = inv.chests || save.chests || {};
    if (allChests && typeof allChests === 'object') {
      Object.entries(allChests).forEach(([cId, cSlots]) => {
        const slotsList = Array.isArray(cSlots) ? cSlots : (cSlots && typeof cSlots === 'object' ? Object.values(cSlots) : []);
        slotsList.forEach(s => pushSlot(s, `chest:${cId}`));
      });
    }

    // Stash / Storehouse de Bloomshire (Cofre del Pueblo oficial: inv.stash / save.stash / storehouse / storage)
    const stashCandidates = [
      inv.stash,
      save.stash,
      inv.storehouse,
      save.storehouse,
      inv.town,
      save.town,
      inv.storage,
      save.storage,
      inv.communityChest,
      save.communityChest
    ];

    stashCandidates.forEach(cand => {
      if (!cand) return;
      const slotsList = Array.isArray(cand) ? cand : (typeof cand === 'object' ? Object.values(cand) : []);
      slotsList.forEach(s => {
        if (s && (s.id || s.item)) pushSlot(s, 'chest:storehouse');
      });
    });

    console.log('[Bloomshire Companion Bridge] Diagnóstico detallado de almacenamiento:', {
      invChestsKeys: inv.chests ? Object.keys(inv.chests) : null,
      saveChestsKeys: save.chests ? Object.keys(save.chests) : null,
      invStashCount: Array.isArray(inv.stash) ? inv.stash.length : (inv.stash ? Object.keys(inv.stash).length : 0),
      saveStashCount: Array.isArray(save.stash) ? save.stash.length : (save.stash ? Object.keys(save.stash).length : 0),
      hasStorehouse: Boolean(inv.storehouse || save.storehouse),
      hasStorage: Boolean(inv.storage || save.storage),
      rawKeysInInv: Object.keys(inv),
      totalExtractedItems: inventory.length
    });

    if (inventory.length === 0 && save.pack && typeof save.pack === 'object') {
      for (const [id, val] of Object.entries(save.pack)) {
        const qty = typeof val === 'number' ? val : (val?.n ?? 0);
        if (qty > 0) inventory.push({ id, name: id, qty, area: 'pack' });
      }
    }

    const finalInventory = (inventory.length > 0) ? inventory : (latestBloomshireState?.inventory || []);

    // 4. ÓRDENES ACTIVAS DE ODETTE (save.orders.list y save.orders.done)
    const activeOrders = [];
    const rawOrdersList = Array.isArray(save.orders?.list)
      ? save.orders.list
      : (Array.isArray(save.orders) ? save.orders : []);
    const doneIds = new Set(Array.isArray(save.orders?.done) ? save.orders.done : []);

    if (rawOrdersList.length > 0) {
      rawOrdersList.forEach((o, idx) => {
        if (o && o.item) {
          const rawItem = String(o.item);
          const itemName = ITEM_NAMES_ES[rawItem] || rawItem;
          activeOrders.push({
            id: o.id || `ord_${idx}`,
            item: itemName,
            rawItem,
            n: o.n || o.amount || 1,
            gold: o.gold || o.payoutGold || 0,
            xp: o.xp || o.xpReward || 0,
            skill: o.skill || 'farming',
            done: doneIds.has(o.id) || Boolean(o.done)
          });
        }
      });
    }

    // 5. EXTRACTOR REAL DE MISIONES (save.quests + catálogo dinámico)
    const questCatalogMap = {};
    if (Array.isArray(save._questCatalog)) {
      save._questCatalog.forEach(q => {
        if (q && q.id) questCatalogMap[q.id] = q;
      });
    }

    const questsState = (save.quests && typeof save.quests === 'object' && !Array.isArray(save.quests))
      ? save.quests
      : {};

    const activeQuestsList = [];
    const completedQuestsList = [];
    let highestBookChapterDone = 0;
    let currentBookChapter = 10;

    Object.entries(questsState).forEach(([qId, qVal]) => {
      if (!qVal || typeof qVal !== 'object') return;
      const normalizedId = qId.toLowerCase().trim();
      const serverDef = questCatalogMap[qId] || questCatalogMap[normalizedId];
      const fallbackDef = KNOWN_QUESTS[normalizedId]
        || KNOWN_QUESTS[normalizedId.replace(/^sd_/, 's_')]
        || KNOWN_QUESTS[normalizedId.replace(/^s_/, 'sd_')]
        || KNOWN_QUESTS[qId];

      const isBook = normalizedId.startsWith('bk') || normalizedId.startsWith('ff');
      const chapNum = isBook ? (parseInt(normalizedId.replace(/^(bk|ff)/, ''), 10) || 0) : null;

      const rawTitle = fallbackDef?.name || serverDef?.name || `Misión ${qId.toUpperCase()}`;
      const title = translateQuestText(rawTitle);
      let stepIdx = typeof qVal.step === 'number' ? qVal.step : 0;

      // Obtener la definición de pasos canónica (SIEMPRE CLONADA PARA NO MUTAR EL OBJETO EN MEMORIA)
      const baseSteps = (fallbackDef?.steps && fallbackDef.steps.length > 0) ? fallbackDef.steps : (serverDef?.steps || []);
      const stepsArr = baseSteps.map(s => ({
        ...s,
        items: Array.isArray(s.items) ? s.items.map(it => ({ ...it })) : []
      }));
      const totalSteps = stepsArr.length;

      // Resolución 100% DINÁMICA y AUTOMATIZADA:
      // Jamás limitar stepIdx a totalSteps - 1. Si el jugador avanza a un paso no catalogado previamente,
      // generamos dinámicamente los pasos para que los anteriores se marquen completados y el nuevo quede activo solo.
      if (typeof qVal.step === 'number') {
        stepIdx = Math.max(0, qVal.step);
      } else if ((normalizedId === 'sd_bram' || normalizedId === 's_bram') && Array.isArray(qVal.parts)) {
        const nextIncomplete = qVal.parts.findIndex(p => p !== true);
        if (nextIncomplete >= 0) stepIdx = nextIncomplete;
      }

      // AUTO-AVANCE DE PASOS DE NIVEL:
      // Si el paso actual exige alcanzar un nivel de habilidad (ej: Nivel 4 de Cultivo)
      // y el jugador ya tiene ese nivel o más, auto-avanzar al siguiente paso.
      while (stepIdx < stepsArr.length) {
        const curS = stepsArr[stepIdx];
        const combined = ((curS?.name || '') + ' ' + (curS?.text || '')).toLowerCase();
        
        let reqLevel = null;
        let reqSkill = null;

        if (curS?.kind === 'level' && curS?.n) {
          reqLevel = curS.n;
          reqSkill = curS.skill;
        } else {
          const match = combined.match(/(?:nivel|level)\s*(\d+)\s*(?:de\s*)?([a-zA-Záéíóúñ]+)/i);
          if (match) {
            reqLevel = parseInt(match[1], 10);
            const skWord = match[2].toLowerCase();
            if (skWord.includes('cultiv') || skWord.includes('farm')) reqSkill = 'farming';
            else if (skWord.includes('miner') || skWord.includes('mine')) reqSkill = 'mining';
            else if (skWord.includes('pesc') || skWord.includes('fish')) reqSkill = 'fishing';
            else if (skWord.includes('tal') || skWord.includes('wood')) reqSkill = 'woodcutting';
            else if (skWord.includes('cocin') || skWord.includes('cook')) reqSkill = 'cooking';
          }
        }

        if (reqLevel && reqSkill) {
          const currentSkillLvl = skillsBreakdown[reqSkill]?.level || (reqSkill === 'farming' ? farmingLevel : 1);
          if (currentSkillLvl >= reqLevel) {
            stepIdx++;
            continue;
          }
        }
        break;
      }

      // Si el juego está en un paso que excede los conocidos, expandir stepsArr dinámicamente
      while (stepsArr.length <= stepIdx) {
        const nextStepNum = stepsArr.length + 1;
        const dynamicName = (nextStepNum === stepIdx + 1 && (qVal.stepName || qVal.stepText || qVal.text || qVal.name))
          ? (qVal.stepName || qVal.stepText || qVal.text || qVal.name)
          : `Paso ${nextStepNum}: Continúa la misión`;
        const dynamicText = (nextStepNum === stepIdx + 1 && (qVal.text || qVal.desc || qVal.objective))
          ? (qVal.text || qVal.desc || qVal.objective)
          : `Objetivo en curso. Consulta el panel de misiones en el juego (M) o habla con ${fallbackDef?.giver || 'el personaje'}.`;
        
        stepsArr.push({
          step: nextStepNum,
          name: dynamicName,
          text: dynamicText,
          where: fallbackDef?.location || 'Ver indicador de misión en el mapa (M)',
          npc: fallbackDef?.giver || 'Vecino de Bloomshire',
          coords: fallbackDef?.coords || null,
          items: []
        });
      }

      const currentStepDef = stepsArr[stepIdx] || (stepIdx > 0 && stepsArr.length > 0 ? stepsArr[stepsArr.length - 1] : null);

      const rawStepName = currentStepDef?.name || (totalSteps > 0 ? `Paso ${stepIdx + 1}` : fallbackDef?.hint || `Paso ${stepIdx + 1}`);
      const rawStepText = currentStepDef?.text || currentStepDef?.where || fallbackDef?.hint || serverDef?.summary || `Paso ${stepIdx + 1}`;

      const targetN = currentStepDef?.targetN || currentStepDef?.n || currentStepDef?.count || null;
      const progN = typeof qVal.n === 'number' ? qVal.n : (typeof qVal.fish === 'number' ? qVal.fish : (typeof qVal.progress === 'number' ? qVal.progress : 0));
      let stepText = translateQuestText(rawStepText);
      if ((normalizedId === 'bk21' || normalizedId === 'ff21') && stepIdx === 2) {
        stepText = `Pesca 30 peces en la Laguna (fish ${progN}/30)`;
      } else if (targetN && targetN > 1) {
        stepText = `${stepText} (${progN}/${targetN})`;
      }
      const whereHint = translateQuestText(currentStepDef?.where || fallbackDef?.location || fallbackDef?.hint || 'Pulsa M en el juego para ver el rombo de misión.');
      const coords = currentStepDef?.coords || fallbackDef?.coords || null;
      const stepItems = currentStepDef?.items || [];
      const giver = fallbackDef?.giver || fallbackDef?.npc || 'Vecino de Bloomshire';

      if (qVal.done || qVal.skipped) {
        if (isBook && chapNum > highestBookChapterDone) {
          highestBookChapterDone = chapNum;
        }
        completedQuestsList.push({
          id: qId,
          normalizedId,
          name: title,
          chapter: chapNum,
          doneAt: qVal.done || null,
          isMainStory: isBook
        });
      } else {
        if (isBook && chapNum) {
          currentBookChapter = chapNum;
        }
        activeQuestsList.push({
          id: qId,
          normalizedId,
          name: title,
          title,
          chapter: chapNum,
          step: stepIdx + 1,
          stepIdx,
          totalSteps: totalSteps > 0 ? totalSteps : (stepIdx + 1),
          stepName: rawStepName,
          objective: stepText,
          stepText,
          where: whereHint,
          coords,
          giver,
          stepItems,
          allSteps: stepsArr,
          progressN: progN,
          targetN,
          isMainStory: isBook
        });
      }
    });

    // Ordenar: historia principal primero
    activeQuestsList.sort((a, b) => (b.isMainStory ? 1 : 0) - (a.isMainStory ? 1 : 0));

    if (activeQuestsList.length === 0 && highestBookChapterDone > 0) {
      currentBookChapter = highestBookChapterDone;
    }

    const primaryActiveQuest = activeQuestsList[0];
    const activeQuestLabel = primaryActiveQuest
      ? `${primaryActiveQuest.name} — ${primaryActiveQuest.objective}`
      : (highestBookChapterDone >= 17
        ? 'Libro 1 Completado — Moonmere Desbloqueado'
        : `Libro 1: Cap. ${currentBookChapter} en curso`);

    const isMoonmereChapter = currentBookChapter >= 18;
    const effectiveDone = Math.max(highestBookChapterDone, isMoonmereChapter ? (currentBookChapter - 1) : 0);
    const moonmereProgress = {
      currentChapter: currentBookChapter,
      completedChapters: effectiveDone,
      targetChapter: 24,
      totalChaptersRequired: 24,
      unlocked: highestBookChapterDone >= 17 || currentBookChapter >= 18,
      moonmereUnlocked: highestBookChapterDone >= 17 || currentBookChapter >= 18,
      moonmereIndex: isMoonmereChapter ? (currentBookChapter - 17) : 0,
      totalMoonmereChapters: 7,
      chaptersRemaining: Math.max(0, 24 - effectiveDone)
    };

    const snapshot = {
      game: 'bloomshire',
      wallet: (function() {
        let detected = save.wallet || save.account || null;
        if (!detected) {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              const v = localStorage.getItem(k) || '';
              if (k.startsWith('bloomshire.gameWallet.') || v.includes('0x')) {
                const m = v.match(/0x[a-fA-F0-9]{40}/);
                if (m) { detected = m[0]; break; }
              }
            }
          } catch (_) {}
        }
        if (!detected) {
          try { detected = localStorage.getItem('bloomshire_wallet'); } catch (_) {}
        }
        return detected || null;
      })(),
      gold,
      currentEnergy: energy,
      maxEnergy: maxE,
      rawEnergyObj,
      energyMeta,
      isVip,
      vipUntil: Math.max(save?.vipUntil ?? 0, save?.perks?.vipUntil ?? 0) || null,
      shards,
      avyn,
      bank,
      farmingLevel,
      perks: save?.perks || null,
      ate: save?.ate || null,
      sold: save?.sold || null,
      buffs: save?.buffs || null,
      inventory: finalInventory,
      activeOrders: activeOrders.length > 0 ? activeOrders : (latestBloomshireState?.activeOrders || []),
      activeQuest: activeQuestLabel,
      activeQuestsList,
      completedQuestsCount: completedQuestsList.length,
      moonmereProgress,
      activeCrops: save._activeCrops || [],
      liveProductionPots: save._liveProductionPots || [],
      dailyTasks: save._dailyTasks || save.tasks || save.dailyTasks || [],
      marketTrades: save._marketTrades || null,
      serverTimeOffset: save._serverTimeOffset || 0,
      activeGameBuild: save._activeGameBuild || "a70eb5dd5113",
      stale: Boolean(save?.stale),
      skills: save.skills || {},
      skillsBreakdown,
      skillsMeta,
      timestamp: Date.now()
    };

    latestBloomshireState = snapshot;
    return snapshot;
  }

  function isExtensionContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome?.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  function sendSnapshotToBackground(parsed, force = false) {
    if (!parsed) return;
    if (!isExtensionContextValid()) return;
    try {
      const res = chrome.runtime.sendMessage({
        type: 'BLOOMSHIRE_STATE_UPDATE',
        force: Boolean(force),
        data: parsed
      }, () => {
        // Consumir lastError para que Chrome no lo marque en rojo en Extensiones
        try { const _ = chrome.runtime?.lastError; } catch (_) {}
      });
      if (res && typeof res.catch === 'function') {
        res.catch(() => { });
      }
    } catch (err) {
      // Silencioso ante recargas o desconexión
      return;
    }
  }

  // Escuchar mensajes de content_hook.js asegurando mismo contexto de ventana
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (event.data?.type === '__BLOOMSHIRE_RAW_STATE' && event.data.payload) {
      if (questsCatalogPromise && Object.keys(KNOWN_QUESTS).length === 0) {
        await Promise.race([questsCatalogPromise, new Promise(r => setTimeout(r, 200))]);
      }
      const parsed = parseSave(event.data.payload);
      if (parsed) {
        console.log('[Bloomshire Companion Bridge] Estado extraído con éxito:', {
          gold: parsed.gold,
          energy: parsed.currentEnergy,
          bed: parsed.energyMeta?.bedWaitText,
          level: parsed.farmingLevel,
          items: parsed.inventory.length,
          orders: parsed.activeOrders.length,
          quest: parsed.activeQuest
        });
        sendSnapshotToBackground(parsed, Boolean(event.data.force));
      }
    } else if (event.data?.type === '__BLOOMSHIRE_MARKET_SNAPSHOT' && event.data.offers) {
      // Tablero del Mercado (api/offers): al background, que lo reparte a las pestanas de Bloomshire Tool
      try {
        chrome.runtime.sendMessage({
          type: 'BLOOMSHIRE_MARKET_SNAPSHOT',
          offers: event.data.offers,
          timestamp: event.data.timestamp || Date.now()
        }, () => { try { const _ = chrome.runtime?.lastError; } catch (_) {} });
      } catch (err) { }
    } else if (event.data?.type === '__BLOOMSHIRE_MARKET_SNAPSHOT_ERROR') {
      try {
        chrome.runtime.sendMessage({
          type: 'BLOOMSHIRE_MARKET_SNAPSHOT_ERROR',
          error: String(event.data.error || ''),
          reason: String(event.data.reason || 'game_error')
        }, () => { try { const _ = chrome.runtime?.lastError; } catch (_) {} });
      } catch (err) { }
    } else if (event.data?.type === '__BLOOMSHIRE_MAP_IMAGE' && event.data.payload) {
      const mapPayload = event.data.payload;
      try {
        chrome.runtime.sendMessage({
          type: 'BLOOMSHIRE_MAP_UPDATE',
          payload: mapPayload
        }, () => {
          try { const _ = chrome.runtime?.lastError; } catch (_) {}
        });
      } catch (err) { }
      // Notificar actualización de mapa de forma desacoplada sin inflar el snapshot general
      if (latestBloomshireState) {
        sendSnapshotToBackground({
          ...latestBloomshireState,
          timestamp: Date.now()
        }, false);
      }
    }
  });

  // Recalcular energía pasiva VIP (+1 cada 3m) y reloj de cama cada 20s sin hacer fetch extra
  setInterval(() => {
    if (!latestRawSave || !latestBloomshireState) return;
    const prevE = latestBloomshireState.currentEnergy;
    const prevBed = latestBloomshireState.energyMeta?.bedWaitText;
    const updated = parseSave(latestRawSave);
    if (updated && (updated.currentEnergy !== prevE || updated.energyMeta?.bedWaitText !== prevBed)) {
      sendSnapshotToBackground(updated, false);
    }
  }, 20000);

  // Escuchar petición de sync forzada desde background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'TRIGGER_FORCE_SYNC') {
      console.log('[Bloomshire Companion Bridge] TRIGGER_FORCE_SYNC recibido');
      window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      sendResponse({ ok: true });
      return false;
    }
    
    if (message && message.type === 'FETCH_MARKET_OFFERS_ON_DEMAND') {
      console.log('[Bloomshire Companion Bridge] FETCH_MARKET_OFFERS_ON_DEMAND recibido de background');
      window.postMessage({ type: '__FETCH_MARKET_OFFERS_REQ' }, '*');
      sendResponse({ ok: true });
      return false;
    }

    if (message && message.type === 'TRIGGER_REAL_MAPS_SYNC') {
      console.log('[Bloomshire Companion Bridge] TRIGGER_REAL_MAPS_SYNC recibido');
      window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });
})();
