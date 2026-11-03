// content_hook.js - MAIN world hook for bloomshire.xyz
(function () {
  if (window.__bloomshire_hook_loaded) return;
  window.__bloomshire_hook_loaded = true;

  console.log('[Bloomshire Companion Hook] MAIN world hook initialized on', window.location.href);

  const liveFarmOverlay = new Map();
  const deletedCellKeys = new Set(); // celdas cosechadas / eliminadas recientemente

  // Hook directo a Response.prototype.json para capturar la referencia viva en memoria del save (doc)
  // que Bloomshire (Session.open y rules.js useSaveDoc) muta directamente durante toda la sesión
  function attachLiveSaveWatchers(saveObj) {
    if (!saveObj || typeof saveObj !== 'object') return saveObj;
    if (saveObj.__bloomshire_watched) return saveObj;
    try {
      Object.defineProperty(saveObj, '__bloomshire_watched', {
        value: true,
        enumerable: false,
        configurable: true
      });

      window.__bloomshire_live_doc = saveObj;
      window.__bloomshire_master_save = saveObj;
      lastKnownSave = saveObj;

      // Lista de propiedades críticas que el motor de Bloomshire actualiza con save(name, value) en rules.js
      const criticalKeys = ['energy', 'purse', 'inventory', 'daily', 'quests', 'orders', 'farm', 'crops'];
      criticalKeys.forEach(key => {
        let internalVal = saveObj[key];
        Object.defineProperty(saveObj, key, {
          enumerable: true,
          configurable: true,
          get() {
            return internalVal;
          },
          set(newVal) {
            internalVal = newVal;
            try {
              if (key === 'energy') {
                console.log('[Bloomshire Hook] Motor de juego actualizó energía en memoria viva:', newVal);
              }
              dispatchState(saveObj, true);
            } catch (err) {
              console.warn('[Bloomshire Hook] Error en dispatch reactivo de', key, err);
            }
          }
        });
      });
    } catch (e) {
      console.warn('[Bloomshire Hook] No se pudieron enlazar observadores a save:', e);
    }
    return saveObj;
  }

  const _origResponseJson = Response.prototype.json;
  Response.prototype.json = async function () {
    const data = await _origResponseJson.apply(this, arguments);
    try {
      if (data && typeof data === 'object') {
        if (data.save && typeof data.save === 'object') {
          console.log('[Bloomshire Companion Hook] >>> REFERENCIA MAESTRA DE SAVE CAPTURADA (Response.json) <<<', Object.keys(data.save));
          attachLiveSaveWatchers(data.save);
          liveFarmOverlay.clear();
          deletedCellKeys.clear();
          dispatchState(data.save, true);
        }
        if (data.quests && Array.isArray(data.quests)) {
          cachedQuestCatalog = data.quests;
        } else if (data.questConfig && Array.isArray(data.questConfig)) {
          cachedQuestCatalog = data.questConfig;
        }
      }
    } catch (_) {}
    return data;
  };

  let lastDispatchAt = 0;
  let lastDispatchSig = '';
  let cachedQuestCatalog = null;
  let cmdRefreshTimer = null;
  let lastKnownSave = window.__bloomshire_master_save || null;
  let serverTimeOffset = 0; // Desfase entre el reloj del servidor Bloomshire y el reloj local
  let latestMarketTrades = null;
  let activeFarmKey = 'farm.home';
  let cachedWallet = (function () {
    try { return localStorage.getItem('bloomshire_wallet'); } catch (_) { return null; }
  })();

  // Catálogo canónico oficial de Tareas Diarias de Bloomshire (rules.js DAILY_POOL)
  const DAILY_TASK_DEFS = {
    water15: { label: 'Riego de cultivos', target: 15, icon: '💧', stars: 1 },
    harvest10: { label: 'Cosecha cultivos', target: 10, icon: '🌾', stars: 1 },
    forage4: { label: 'Recolecta hongos', target: 4, icon: '🍄', stars: 1 },
    chop2: { label: 'Tala árboles en Woodlot', target: 2, icon: '🪓', stars: 1 },
    fish5: { label: 'Pesca peces', target: 5, icon: '🎣', stars: 1 },
    kill5: { label: 'Derrota criaturas', target: 5, icon: '⚔️', stars: 1 },
    cook5: { label: 'Cocina platos', target: 5, icon: '🍲', stars: 2 },
    mine15: { label: 'Pica rocas con pico', target: 15, icon: '⛏️', stars: 2 },
    net3: { label: 'Caza mariposas', target: 3, icon: '🦋', stars: 2 },
    order2: { label: 'Entrega pedidos en Tienda General', target: 2, icon: '📦', stars: 2 },
    kill20: { label: 'Derrota 20 criaturas', target: 20, icon: '⚔️', stars: 2 },
    fish12: { label: 'Pesca 12 peces', target: 12, icon: '🎣', stars: 2 },
    harvest30: { label: 'Cosecha 30 cultivos', target: 30, icon: '🌾', stars: 2 },
    boss1: { label: 'Derrota a un Jefe', target: 1, icon: '👑', stars: 3 },
    kill50: { label: 'Derrota 50 criaturas', target: 50, icon: '⚔️', stars: 3 },
    fish25: { label: 'Pesca 25 peces', target: 25, icon: '🎣', stars: 3 },
    cook15: { label: 'Cocina 15 platos', target: 15, icon: '🍲', stars: 3 },
    mine40: { label: 'Pica 40 rocas con pico', target: 40, icon: '⛏️', stars: 3 },
    order5: { label: 'Entrega 5 pedidos en Tienda General', target: 5, icon: '📦', stars: 3 }
  };

  function updateServerTimeOffset(resp, data) {
    try {
      if (resp && typeof resp.headers?.get === 'function') {
        const dStr = resp.headers.get('date');
        if (dStr) {
          const sTime = new Date(dStr).getTime();
          if (!isNaN(sTime) && sTime > 0) {
            serverTimeOffset = sTime - Date.now();
          }
        }
      }
      const rawSky = data?.sky?.t || data?.serverTime || data?.t;
      if (typeof rawSky === 'number' && rawSky > 1000000000) {
        const sTime = rawSky < 10000000000 ? rawSky * 1000 : rawSky;
        serverTimeOffset = sTime - Date.now();
      }
    } catch (e) {}
  }

    
  function getDetectedGameBuild() {
    try {
      const scripts = document.querySelectorAll('script[src*="/v/"]');
      for (const sc of scripts) {
        const m = sc.src.match(/\/v\/([a-zA-Z0-9]{8,16})\//);
        if (m && m[1]) return m[1];
      }
      const links = document.querySelectorAll('link[href*="/v/"]');
      for (const l of links) {
        const m = l.href.match(/\/v\/([a-zA-Z0-9]{8,16})\//);
        if (m && m[1]) return m[1];
      }
    } catch (_) {}
    return '2c7e9a3532e5';
  }

  function applyServerCmdResponse(data, cmdPayload) {
    try {
      const active = window.__bloomshire_master_save || lastKnownSave || {};
      lastKnownSave = active;
      window.__bloomshire_master_save = active;

      // Fusionar deltas que vengan en data, data.state, data.delta, data.patch o data.results
      const patches = [data, data?.state, data?.delta, data?.patch];
      if (Array.isArray(data?.results)) {
        data.results.forEach(r => {
          if (r && typeof r === 'object') {
            patches.push(r, r.save, r.state, r.delta, r.patch);
          }
        });
      }

      patches.forEach(src => {
        if (!src || typeof src !== 'object') return;
        ['farm', 'farms', 'inventory', 'purse', 'energy', 'skills', 'orders', 'quests', 'daily', 'tasks', 'pot', 'craftPot', 'millPot', 'dairyPot', 'loomPot'].forEach(k => {
          if (src[k] !== undefined) active[k] = src[k];
        });
        Object.keys(src).forEach(k => {
          if (k.startsWith('farm.')) active[k] = src[k];
        });
      });

      const rawCmds = Array.isArray(cmdPayload)
        ? cmdPayload
        : (Array.isArray(cmdPayload?.cmds)
          ? cmdPayload.cmds
          : (Array.isArray(cmdPayload?.batch)
            ? cmdPayload.batch
            : (Array.isArray(cmdPayload?.actions)
              ? cmdPayload.actions
              : (cmdPayload ? [cmdPayload] : []))));

      const now = Date.now() + serverTimeOffset;

      rawCmds.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const cmd = String(item.name || item.cmd || item.action || item.c || item.type || item.op || '').toLowerCase();
        const args = (item.args && typeof item.args === 'object') ? item.args : (item.payload && typeof item.payload === 'object' ? item.payload : item);
        const cellId = args.i ?? args.cell ?? args.cellId ?? args.index ?? args.pos ?? args.tile ?? item.cell ?? item.index;
        let seedRaw = args.seed ?? args.s ?? args.seedId ?? args.crop ?? args.item ?? item.seed ?? item.s ?? item.item;
        
        // Comprobar args.id o item.id (el juego pasa id: 'seed:0' en sow)
        if (seedRaw === undefined || seedRaw === null) {
          const rawId = String(args.id || item.id || '');
          if (rawId.startsWith('seed:') || rawId.startsWith('crop:')) {
            seedRaw = rawId;
          }
        }
        // Comprobar ranura de hotbar
        if (seedRaw === undefined || seedRaw === null) {
          const slotIdx = args.slot ?? args.hotbarSlot ?? item.slot;
          if (slotIdx !== undefined) {
            const hItem = active.inventory?.hotbar?.[+slotIdx] || active.inv?.hotbar?.[+slotIdx] || active.hotbar?.[+slotIdx];
            if (hItem) seedRaw = hItem.id ?? hItem.item ?? hItem.name;
          }
        }
        // Si es siembra y aún no se resuelve, asignar por defecto semilla 0 (Zanahoria)
        if ((seedRaw === undefined || seedRaw === null) && (cmd.includes('plant') || cmd.includes('sow') || cmd.includes('seed'))) {
          seedRaw = 'seed:0';
        }

        const farmKey = normalizeFarmFieldKey(args.farm || args.farmKey || args.field || args.map || item.farm || item.farmKey || item.field || activeFarmKey || 'farm.bloomshire');

        if (cmd.includes('plant') || cmd.includes('sow') || cmd.includes('seed')) {
          if (cellId !== undefined && seedRaw !== undefined && seedRaw !== null) {
            const cellKey = `${farmKey}:${cellId}`;
            deletedCellKeys.delete(cellKey);
            deletedCellKeys.delete(`farm.bloomshire:${cellId}`);
            deletedCellKeys.delete(`farm.town:${cellId}`);
            deletedCellKeys.delete(`farm.home:${cellId}`);
            const farmDoc = active[farmKey] || active['farm.bloomshire'] || active['farm.town'] || active['farm.home'];
            const cellDoc = farmDoc?.[cellId] || farmDoc?.[String(cellId)];
            const watered = Boolean(args.watered || args.w1 || cellDoc?.crop?.w1 || cellDoc?.w1 || cellDoc?.wet || true);
            liveFarmOverlay.set(cellKey, {
              fieldKey: farmKey,
              cellId,
              seedId: seedRaw,
              s: seedRaw,
              t: now,
              plantedAt: now,
              wateredAt: now,
              w1: now,
              needsWater: false,
              isLiveOverlay: true
            });
            console.log('[Bloomshire Hook] Siembra en tiempo real detectada (<50ms):', cellKey, seedRaw);
          }
        } else if (cmd.includes('water') || cmd.includes('irrigate')) {
          const targetCells = Array.isArray(args.cells) ? args.cells : (cellId !== undefined ? [cellId] : []);
          targetCells.forEach(cId => {
            const cellKey = `${farmKey}:${cId}`;
            const existing = liveFarmOverlay.get(cellKey);
            if (existing) {
              existing.wateredAt = existing.wateredAt || now;
              existing.w1 = existing.w1 || now;
              existing.needsWater = false;
            } else {
              liveFarmOverlay.set(cellKey, {
                fieldKey: farmKey,
                cellId: cId,
                wateredAt: now,
                w1: now,
                needsWater: false,
                isLiveOverlay: true
              });
            }
          });
        } else if (cmd.includes('harvest') || cmd.includes('reap') || cmd.includes('collect') || cmd.includes('pick') || cmd.includes('dig')) {
          const targetCells = Array.isArray(args.cells) ? args.cells : (cellId !== undefined ? [cellId] : []);
          targetCells.forEach(cId => {
            const numId = Number(cId);
            // 1. Limpiar de liveFarmOverlay
            for (const key of Array.from(liveFarmOverlay.keys())) {
              if (key.endsWith(':' + numId) || key.endsWith(':' + cId)) {
                liveFarmOverlay.delete(key);
              }
            }
            // 2. Registrar en deletedCellKeys para todos los prefijos posibles (bloomshire, town, home, island, etc.)
            const allPrefixes = [farmKey, 'farm.bloomshire', 'farm.town', 'farm.home', 'farm.island', 'farm.greenhouse'];
            allPrefixes.forEach(pfx => {
              deletedCellKeys.add(`${pfx}:${numId}`);
              deletedCellKeys.add(`${pfx}:${cId}`);
              if (active[pfx] && typeof active[pfx] === 'object') {
                delete active[pfx][numId];
                delete active[pfx][String(numId)];
                delete active[pfx][cId];
              }
            });
            console.log('[Bloomshire Hook] Cosecha/recolección detectada en celda:', cId);
          });
        } else if (cmd === 'cook.take' || cmd.endsWith('.take') || (cmd.includes('take') && !cmd.includes('start'))) {
          // cook.take: { place: 'cook' | 'craft' | 'mill' | 'dairy' | 'loom' }
          const place = args.place || item.place || 'cook';
          const placeMap = { cook: 'pot', craft: 'craftPot', loom: 'loomPot', mill: 'millPot', dairy: 'dairyPot' };
          const targetPot = placeMap[place] || 'pot';
          delete active[targetPot];
          delete active.pot;
          // Limpiar también cualquier pot que esté listo en active
          ['pot', 'craftPot', 'millPot', 'dairyPot', 'loomPot'].forEach(k => {
            if (active[k] && active[k].ready && now >= active[k].ready) {
              delete active[k];
            }
          });
          console.log('[Bloomshire Hook] Recogida de cocina/crafteo detectada (<50ms):', targetPot);
        } else if (
          cmd.includes('cook') ||
          cmd.includes('craft') ||
          cmd.includes('forge') ||
          cmd.includes('smelt') ||
          cmd.includes('mill') ||
          cmd.includes('dairy') ||
          cmd.includes('churn') ||
          cmd.includes('loom') ||
          cmd.includes('weave')
        ) {
          const recipeName = args.recipe || args.dish || args.item || args.id || item.dish || item.recipe || item.item;
          if (recipeName) {
            let potKey = 'craftPot';
            if (cmd.includes('cook')) potKey = 'pot';
            else if (cmd.includes('mill')) potKey = 'millPot';
            else if (cmd.includes('dairy') || cmd.includes('churn')) potKey = 'dairyPot';
            else if (cmd.includes('loom') || cmd.includes('weave')) potKey = 'loomPot';

            const qty = Number(args.n || args.qty || args.count || item.n || 1);
            const durSec = Number(args.duration || args.time || item.duration || 60);
            active[potKey] = {
              dish: recipeName,
              item: recipeName,
              n: qty,
              ready: now + (durSec * 1000)
            };
            console.log('[Bloomshire Hook] Crafteo/Cocina en tiempo real detectado (<50ms):', potKey, active[potKey]);
          }
        }
      });
    } catch (err) {
      console.warn('[Bloomshire Hook] Error aplicando acción cmd:', err);
    }
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.includes('save') || k.includes('game') || k.includes('bloomshire'))) {
        const raw = localStorage.getItem(k);
        if (raw && (raw.startsWith('{') || raw.startsWith('['))) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.save || parsed.purse || parsed.inventory)) {
            lastKnownSave = parsed.save || parsed;
            break;
          }
        }
      }
    }
  } catch (e) {}

  // Catálogo canónico oficial de las 57 semillas de Bloomshire (rules.js SEEDS)
  const SEEDS_INFO = [
    { id: 'Carrot', name: 'Zanahoria', grow: 2, icon: '🥕' },
    { id: 'Potato', name: 'Papa', grow: 8, icon: '🥔' },
    { id: 'Cabbage', name: 'Repollo', grow: 20, icon: '🥬' },
    { id: 'Cauliflower', name: 'Coliflor', grow: 90, icon: '🥦' },
    { id: 'Strawberry', name: 'Fresa', grow: 80, icon: '🍓' },
    { id: 'Tomato', name: 'Tomate', grow: 45, icon: '🍅' },
    { id: 'Wheat', name: 'Trigo', grow: 15, icon: '🌾' },
    { id: 'Sunflower', name: 'Girasol', grow: 35, icon: '🌻' },
    { id: 'Corn', name: 'Maíz', grow: 40, icon: '🌽' },
    { id: 'Green Beans', name: 'Judías Verdes', grow: 50, icon: '🫛' },
    { id: 'Cantaloupe', name: 'Melón', grow: 100, icon: '🍈' },
    { id: 'Marigold', name: 'Caléndula', grow: 20, icon: '🌼' },
    { id: 'Sweet Potato', name: 'Batata', grow: 70, icon: '🍠' },
    { id: 'Saffron', name: 'Azafrán', grow: 300, icon: '🌾' },
    { id: 'Star Fruit', name: 'Fruta Estelar', grow: 360, icon: '⭐' },
    { id: 'Onion', name: 'Cebolla', grow: 12, icon: '🧅' },
    { id: 'Eggplant', name: 'Berenjena', grow: 60, icon: '🍆' },
    { id: 'Watermelon', name: 'Sandía', grow: 110, icon: '🍉' },
    { id: 'Beetroot', name: 'Remolacha', grow: 120, icon: '🟣' },
    { id: 'Pumpkin', name: 'Calabaza', grow: 240, icon: '🎃' },
    { id: 'Grapes', name: 'Uvas', grow: 150, icon: '🍇' },
    { id: 'Hot Pepper', name: 'Pimiento Picante', grow: 60, icon: '🌶️' },
    { id: 'Asparagus', name: 'Espárrago', grow: 120, icon: '🌱' },
    { id: 'Blueberry', name: 'Arándano', grow: 90, icon: '🫐' },
    { id: 'Broccoli', name: 'Brócoli', grow: 30, icon: '🥦' },
    { id: 'Parsnip', name: 'Chirivía', grow: 5, icon: '🥕' },
    { id: 'Rice', name: 'Arroz', grow: 30, icon: '🍚' },
    { id: 'Spring Onion', name: 'Cebolleta', grow: 6, icon: '🧅' },
    { id: 'Adzuki Bean', name: 'Judía Adzuki', grow: 45, icon: '🫘' },
    { id: 'Green Bell Pepper', name: 'Pimiento Verde', grow: 60, icon: '🫑' },
    { id: 'Red Bell Pepper', name: 'Pimiento Rojo', grow: 60, icon: '🌶️' },
    { id: 'Yellow Bell Pepper', name: 'Pimiento Amarillo', grow: 60, icon: '🫑' },
    { id: 'Blackberry', name: 'Mora', grow: 50, icon: '🫐' },
    { id: 'Cucumber', name: 'Pepino', grow: 40, icon: '🥒' },
    { id: 'Pineapple', name: 'Piña', grow: 180, icon: '🍍' },
    { id: 'Aloe', name: 'Aloe Vera', grow: 150, icon: '🪴' },
    { id: 'Premium Seed', name: 'Semilla Premium', grow: 60, icon: '✨' },
    { id: 'Sunfire Pepper', name: 'Pimiento Fuego Solar', grow: 120, icon: '🌶️' },
    { id: 'Diamond Strawberry', name: 'Fresa Diamante', grow: 120, icon: '🍓' },
    { id: 'Sapphire Blueberry', name: 'Arándano Zafiro', grow: 120, icon: '🫐' },
    { id: 'Golden Pumpkin', name: 'Calabaza Dorada', grow: 120, icon: '🎃' },
    { id: 'Crystal Grapes', name: 'Uvas de Cristal', grow: 120, icon: '🍇' },
    { id: 'Starbloom', name: 'Flor Estelar', grow: 120, icon: '🌸' },
    { id: 'Celestial Pineapple', name: 'Piña Celestial', grow: 120, icon: '🍍' },
    { id: 'Winter Kale', name: 'Col Rizada Invernal', grow: 90, icon: '🥬' },
    { id: 'Snow Turnip', name: 'Nabo de Nieve', grow: 60, icon: '🧅' },
    { id: 'Frostberry', name: 'Mora Helada', grow: 90, icon: '🫐' },
    { id: 'Ice Melon', name: 'Melón de Hielo', grow: 120, icon: '🍈' },
    { id: 'Fireheart Pepper', name: 'Pimiento Corazón de Fuego', grow: 150, icon: '🌶️' },
    { id: 'Fairy Rose', name: 'Rosa de Hada', grow: 120, icon: '🌹' },
    { id: 'Honeydew Melon', name: 'Melón Verde', grow: 240, icon: '🍈' },
    { id: 'Purple Cauliflower', name: 'Coliflor Violeta', grow: 240, icon: '🥦' },
    { id: 'Snow Pea', name: 'Guisante de Nieve', grow: 180, icon: '🫛' },
    { id: 'Golden Beet', name: 'Remolacha Dorada', grow: 240, icon: '🟡' },
    { id: 'Black Tomato', name: 'Tomate Negro', grow: 240, icon: '🍅' },
    { id: 'Blue Corn', name: 'Maíz Azul', grow: 240, icon: '🌽' },
    { id: 'Dragon Fruit', name: 'Fruta del Dragón', grow: 300, icon: '🐉' }
  ];

  function normalizeFarmFieldKey(key) {
    if (!key) return 'farm.bloomshire';
    const str = String(key).trim();
    if (str.startsWith('farm.')) return str;
    if (str === 'town' || str === 'bloomshire') return 'farm.bloomshire';
    return `farm.${str}`;
  }

  function extractActiveCrops(save) {
    const rawList = [];
    const now = Date.now() + serverTimeOffset;

    function parseCellToCrop(cell, fieldKey, cellIdx) {
      if (!cell || typeof cell !== 'object') return null;
      // En Bloomshire farm.js, una celda es { tilled: true, crop: { s: index, t: now, w1: ... } } o un overlay { s: index, t: ... }
      const c = cell.crop && typeof cell.crop === 'object' ? cell.crop : cell;
      if (!c || typeof c !== 'object') return null;

      const seedRaw = c.s ?? c.seed ?? c.cropId;
      if (seedRaw === undefined || seedRaw === null || seedRaw === '' || seedRaw === -1) return null;
      if (c.harvested || c.empty || c.reaped || c.harvestedAt) return null;

            let seedDef = null;
      if (typeof seedRaw === 'number') {
        seedDef = SEEDS_INFO[seedRaw] || null;
      } else if (typeof seedRaw === 'string') {
        const str = seedRaw.trim();
        // Caso A: 'seed:0', 'seed:25', etc.
        const colonMatch = str.match(/^seed:(\d+)$/i);
        if (colonMatch) {
          const idx = parseInt(colonMatch[1], 10);
          seedDef = SEEDS_INFO[idx] || null;
        }
        // Caso B: número puro en string '0', '1', etc.
        if (!seedDef && /^\d+$/.test(str)) {
          const idx = parseInt(str, 10);
          seedDef = SEEDS_INFO[idx] || null;
        }
        // Caso C: búsqueda por ID o Nombre (ej. 'Carrot', 'Zanahoria')
        if (!seedDef) {
          const normSeed = str.toLowerCase()
            .replace(/^seed[:_]/i, '')
            .replace(/_seed$/i, '')
            .replace(/\s*seeds?$/i, '')
            .trim();
          seedDef = SEEDS_INFO.find(s => 
            s.id.toLowerCase() === normSeed || 
            s.name.toLowerCase() === normSeed
          );
        }
      }

      const seedName = seedDef ? seedDef.name : (c.name || String(seedRaw));
      const seedIcon = seedDef ? seedDef.icon : '🌱';
      const growMinutes = c.grow || (c.dur ? Math.round(c.dur / 60) : (seedDef ? seedDef.grow : 15));
      const totalMs = growMinutes * 60 * 1000;
      const wateredAt = c.w1 || c.watered || c.w || null;
      const plantedAt = c.t || c.planted || c.plantedAt || wateredAt || now;
      const readyAt = c.ready || c.readyAt || c.r || c.matureAt || (wateredAt ? (wateredAt + totalMs) : null);
      const needsWater = !wateredAt;
      const isRipe = Boolean(readyAt && now >= readyAt);
      const remainingMs = readyAt ? Math.max(0, readyAt - now) : 0;
      const cellId = cell.cell ?? cell.cellId ?? cellIdx;
      const normField = normalizeFarmFieldKey(fieldKey);

      return {
        id: `${normField}_${cellId}`,
        cellId,
        fieldKey: normField,
        seedId: seedDef?.id || String(seedRaw),
        name: seedName,
        icon: seedIcon,
        growMinutes,
        plantedAt,
        wateredAt,
        readyAt,
        needsWater,
        isRipe,
        remainingMs,
        type: 'crop'
      };
    }

    try {
      const activeSave = window.__bloomshire_master_save || save;
      const farmSources = new Map();

      // A. Prioridad absoluta: Save vivo en memoria del motor (session.save)
      if (activeSave && typeof activeSave === 'object') {
        Object.entries(activeSave).forEach(([k, v]) => {
          if (k && k.startsWith('farm.') && v && typeof v === 'object') {
            const normF = normalizeFarmFieldKey(k);
            farmSources.set(normF, v);
          }
        });
      }

      // B. Fallback a localStorage solo si el save en memoria no contenía campos farm
      if (farmSources.size === 0) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('farm.')) {
              const normF = normalizeFarmFieldKey(k);
              if (!farmSources.has(normF)) {
                const raw = localStorage.getItem(k);
                if (raw && (raw.startsWith('{') || raw.startsWith('['))) {
                  try {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') {
                      farmSources.set(normF, parsed);
                    }
                  } catch (_) {}
                }
              }
            }
          }
        } catch (e) {}
      }

      // Procesar cada campo de cultivo activo directamente del motor del juego
      // 1. Procesar cada campo de cultivo activo directamente del motor del juego
      farmSources.forEach((cellsObj, fieldKey) => {
        if (!cellsObj || typeof cellsObj !== 'object') return;
        const normF = normalizeFarmFieldKey(fieldKey);
        const entries = Array.isArray(cellsObj)
          ? cellsObj.map((cell, idx) => [idx, cell])
          : (typeof cellsObj.entries === 'function' ? Array.from(cellsObj.entries()) : Object.entries(cellsObj));

        entries.forEach(([idx, cell]) => {
          const cellId = cell?.cell ?? cell?.cellId ?? idx;
          const cellKey = `${normF}:${cellId}`;
          // Si fue cosechada en tiempo real, ignorar hasta próximo F5
          if (deletedCellKeys.has(cellKey) ||
              deletedCellKeys.has(`farm.bloomshire:${cellId}`) ||
              deletedCellKeys.has(`farm.town:${cellId}`) ||
              deletedCellKeys.has(`farm.home:${cellId}`)) return;
          // Si tiene un overlay vivo más reciente (siembra o riego), priorizar el overlay
          const liveOv = liveFarmOverlay.get(cellKey);
          const mergedCell = liveOv ? { ...(typeof cell === 'object' ? cell : {}), ...liveOv, crop: { ...(cell?.crop || {}), ...liveOv } } : cell;
          const cr = parseCellToCrop(mergedCell, normF, cellId);
          if (cr) rawList.push(cr);
        });
      });

      // 2. Inyectar celdas recién sembradas en liveFarmOverlay que aún no existían en farmSources
      liveFarmOverlay.forEach((ov, cellKey) => {
        if (deletedCellKeys.has(cellKey)) return;
        const normF = normalizeFarmFieldKey(ov.fieldKey || 'farm.bloomshire');
        const cellId = ov.cellId;
        const alreadyInList = rawList.some(r => r.id === `${normF}_${cellId}`);
        if (!alreadyInList && ov.seedId !== undefined) {
          const cr = parseCellToCrop(ov, normF, cellId);
          if (cr) rawList.push(cr);
        }
      });
    } catch (err) {
      console.warn('[Bloomshire Companion Hook] Error extrayendo cultivos:', err);
    }

    const seenCells = new Set();
    const dedupedList = [];
    rawList.forEach(cr => {
      if (!seenCells.has(cr.id)) {
        seenCells.add(cr.id);
        dedupedList.push(cr);
      }
    });

    const grouped = {};
    dedupedList.forEach(cr => {
      const isHome = cr.fieldKey.toLowerCase().includes('home');
      const isTown = cr.fieldKey.toLowerCase().includes('town') || cr.fieldKey.toLowerCase().includes('bloomshire');
      const isGreenhouse = cr.fieldKey.toLowerCase().includes('greenhouse');
      const locLabel = isHome
        ? '🏡 Home Island (Tu Cabaña)'
        : (isGreenhouse
            ? '🌿 Invernadero'
            : (isTown ? '🌻 Huerto de la Aldea' : '🚜 Parcela de Cultivo'));

      const atlasTarget = isHome
        ? { label: '🏡 Parcela de Tu Cabaña (Home Island)', regionId: 'home_island', subZoneId: 'home_cottage_sub', wx: 4034, wy: 10012, worldRect: [3930, 9930, 220, 220] }
        : { label: '🌻 Huerto Central (Bloomshire Town)', regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', wx: 5400, wy: 4500, worldRect: [5300, 4400, 250, 250] };

      const timeBucket = cr.readyAt ? Math.round(cr.readyAt / 10000) : 'needs_water';
      const grpKey = cr.seedId + '_' + locLabel + '_' + timeBucket;
      if (!grouped[grpKey]) {
        grouped[grpKey] = {
          id: grpKey,
          name: cr.name,
          seedId: cr.seedId,
          icon: cr.icon,
          count: 0,
          location: locLabel,
          atlasTarget,
          growMinutes: cr.growMinutes,
          plantedAt: cr.plantedAt,
          wateredAt: cr.wateredAt,
          readyAt: cr.readyAt,
          needsWater: cr.needsWater,
          isRipe: cr.isRipe,
          remainingMs: cr.remainingMs,
          type: 'crop'
        };
      }
      grouped[grpKey].count++;
      if (cr.isRipe) grouped[grpKey].isRipe = true;
      if (cr.needsWater) grouped[grpKey].needsWater = true;
    });

    return Object.values(grouped);
  }
  function extractActiveProductionPots(save) {
    const pots = [];
    if (!save || typeof save !== 'object') return pots;
    const now = Date.now() + serverTimeOffset;

    const potDefs = [
      { key: 'pot', place: 'Stove', name: 'Cocina / Fogón', icon: '🍲', location: '🏡 Cabaña / Panadería' },
      { key: 'craftPot', place: 'Anvil', name: 'Forja / Banco de Trabajo', icon: '⚒️', location: '⚒️ Herrería de Bram / Carpintería' },
      { key: 'millPot', place: 'Mill', name: 'Molino de Agua', icon: '🌾', location: '🌾 Granja de Hollin (Molino)' },
      { key: 'dairyPot', place: 'Dairy', name: 'Quesería', icon: '🧀', location: '🧀 Granja de Hollin (Lácteos)' },
      { key: 'loomPot', place: 'Loom', name: 'Telar', icon: '🧵', location: '🧵 Taller Textil' }
    ];

    potDefs.forEach(pDef => {
      const p = save[pDef.key];
      if (p && (p.ready || p.dish || p.item)) {
        const dishName = p.dish || p.item || 'Producción';
        const count = p.n || 1;
        const readyAt = p.ready || (now + 60000);
        const remainingMs = Math.max(0, readyAt - now);
        const isDone = now >= readyAt;

        pots.push({
          id: `live_${pDef.key}_${readyAt}`,
          name: dishName,
          icon: pDef.icon,
          count,
          location: pDef.location,
          readyAt,
          remainingMs,
          isDone,
          isLiveTelemetry: true,
          type: 'production'
        });
      }
    });

    return pots;
  }

  function computeSaveSig(save) {
    if (!save || typeof save !== 'object') return '';
    const g = save.purse?.gold ?? save.gold ?? 0;
    const sh = save.purse?.shards ?? save.shards ?? 0;
    const eObj = (window.__bloomshire_live_doc && window.__bloomshire_live_doc.energy) || save.energy;
    
    // Cálculo de energía viva reactiva para que el despertar de cama (150⚡) y regeneración cambien la firma de inmediato
    let liveEVal = 150;
    if (eObj && typeof eObj === 'object') {
      const now = Date.now() + serverTimeOffset;
      const ev = typeof eObj.v === 'number' ? eObj.v : 150;
      const rec = eObj.recovery;
      if (rec && typeof rec.from === 'number' && typeof rec.until === 'number' && typeof rec.rate === 'number') {
        liveEVal = now >= rec.until ? 150 : Math.min(150, Math.floor(ev + rec.rate * (Math.max(now, rec.from) - rec.from)));
      } else {
        liveEVal = Math.floor(ev);
      }
    } else if (typeof eObj === 'number') {
      liveEVal = Math.floor(eObj);
    }
    const eVal = `${liveEVal}_${eObj?.at || 0}_${eObj?.recovery ? 1 : 0}`;
    const hb = Array.isArray(save.inventory?.hotbar)
      ? save.inventory.hotbar.filter(Boolean).map(s => `${s.id}:${s.n || s.qty || 1}`).join('|')
      : '';
    const bag = Array.isArray(save.inventory?.bag)
      ? save.inventory.bag.filter(Boolean).map(s => `${s.id}:${s.n || s.qty || 1}`).join('|')
      : '';
    const ordList = Array.isArray(save.orders?.list)
      ? save.orders.list.map(o => `${o.id}:${o.item}:${o.n}`).join('|')
      : '';
    const ordDone = Array.isArray(save.orders?.done) ? save.orders.done.join(',') : '';
    const qSig = save.quests ? JSON.stringify(save.quests) : '';
    const farmKeys = Object.keys(save).filter(k => k.startsWith('farm.'));
    const farmSig = farmKeys.map(k => `${k}:${JSON.stringify(save[k])}`).join(';');
    const potSig = `${JSON.stringify(save.pot)}_${JSON.stringify(save.craftPot)}_${JSON.stringify(save.millPot)}_${JSON.stringify(save.dairyPot)}`;
    const skillsSig = save.skills ? JSON.stringify(save.skills) : '';
    const tasksSig = JSON.stringify(save.daily || save.tasks || save.dailyTasks || '');
    let localFarmSig = '';
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('farm.')) {
          localFarmSig += `${k}:${localStorage.getItem(k)}|`;
        }
      }
    } catch (e) {}
    let overlaySig = '';
    liveFarmOverlay.forEach((v, k) => {
      overlaySig += `${k}:${v.seedId}:${v.wateredAt ? 1 : 0}:${v.t}|`;
    });
    const delSig = Array.from(deletedCellKeys).join(',');
    return `${g}_${sh}_${eVal}_${hb}_${bag}_${ordList}_${ordDone}_${qSig}_${skillsSig}_${tasksSig}_${farmSig}_${localFarmSig}_${overlaySig}_${delSig}_${potSig}`;
  }

  function dispatchState(rawPayload, force = false) {
    if (!rawPayload || typeof rawPayload !== 'object') return;
    try {
      // Si viene el paquete raíz de /api/state con { save, quests, sky }, guardar catálogo de quests
      if (rawPayload.quests && Array.isArray(rawPayload.quests)) {
        cachedQuestCatalog = rawPayload.quests;
      } else if (rawPayload.questConfig && Array.isArray(rawPayload.questConfig)) {
        cachedQuestCatalog = rawPayload.questConfig;
      }

      const save = window.__bloomshire_live_doc || (rawPayload.save && typeof rawPayload.save === 'object' ? rawPayload.save : rawPayload);
      lastKnownSave = save;

      // Validar que sea realmente un objeto save de partida (tiene purse, inventory, skills o energy)
      const isValidSave = Boolean(
        save && (
          save.purse ||
          save.inventory ||
          save.skills ||
          (save.energy && typeof save.energy === 'object') ||
          liveFarmOverlay.size > 0
        )
      );
      if (!isValidSave) return;

      const sig = computeSaveSig(save);
      const now = Date.now() + serverTimeOffset;
      if (!force && sig === lastDispatchSig && now - lastDispatchAt < 1000) return;
      lastDispatchSig = sig;
      lastDispatchAt = now;

      // Extracción profunda del objeto Energy (memoria viva canónica y cálculo de cama)
      let liveEnergyOverride = null;
      let liveEnergyObj = null;
      const p = window.bloomshire?.play || window.app?.play || window.__play || window.play;
      if (p?.energy) {
        try {
          const liveE = typeof p.energy.value === 'function' ? p.energy.value() : (typeof p.energy.v === 'number' ? p.energy.v : null);
          if (typeof liveE === 'number' && Number.isFinite(liveE)) {
            liveEnergyOverride = Math.floor(liveE);
          }
          liveEnergyObj = {
            v: typeof p.energy.v === 'number' ? p.energy.v : liveEnergyOverride,
            at: p.energy.at || now,
            recovery: p.energy.recovery || null,
            slept: p.energy.slept || null,
            sleepLeft: typeof p.energy.sleepLeft === 'function' ? p.energy.sleepLeft() : null,
            recovering: typeof p.energy.recovering === 'function' ? p.energy.recovering() : false,
            bedWait: typeof p.energy.bedWait === 'function' ? p.energy.bedWait() : 0
          };
        } catch (e) { }
      }

      // Si no tenemos p.energy por restricción de producción, calcular canónicamente desde save.energy del DOC en memoria viva
      const activeEnergySource = (window.__bloomshire_live_doc && window.__bloomshire_live_doc.energy)
        ? window.__bloomshire_live_doc.energy
        : (save.energy || null);

      if (activeEnergySource && typeof activeEnergySource === 'object') {
        const ev = typeof activeEnergySource.v === 'number' ? activeEnergySource.v : 150;
        const rec = activeEnergySource.recovery || null;
        let calculatedE = ev;
        // Fórmula canónica oficial de rules.js:
        // if (r) v += r.rate * Math.max(0, Math.min(now, r.until) - Math.max(this.at, r.from))
        if (rec && typeof rec.from === 'number' && typeof rec.until === 'number' && typeof rec.rate === 'number') {
          const effectiveNow = Math.min(now, rec.until);
          const effectiveStart = Math.max(activeEnergySource.at || rec.from, rec.from);
          if (effectiveNow > effectiveStart) {
            calculatedE = Math.min(150, Math.floor(ev + rec.rate * (effectiveNow - effectiveStart)));
          }
          if (now >= rec.until) {
            calculatedE = 150;
          }
        }
        if (liveEnergyOverride === null) {
          liveEnergyOverride = calculatedE;
        }
        liveEnergyObj = {
          v: ev,
          at: activeEnergySource.at || now,
          recovery: rec,
          slept: activeEnergySource.slept || null,
          ...(liveEnergyObj || {})
        };
      } else if (typeof activeEnergySource === 'number' && liveEnergyOverride === null) {
        liveEnergyOverride = activeEnergySource;
      }

      window.postMessage({
        type: '__BLOOMSHIRE_RAW_STATE',
        source: 'bloomshire_hook',
        force: Boolean(force),
        payload: {
          ...save,
          wallet: save.wallet || cachedWallet || (function () {
            try { return localStorage.getItem('bloomshire_wallet'); } catch (_) { return null; }
          })(),
          ...(liveEnergyOverride !== null ? { _liveEnergy: liveEnergyOverride } : {}),
          ...(liveEnergyObj ? { _liveEnergyObj: liveEnergyObj } : {}),
          ...(cachedQuestCatalog ? { _questCatalog: cachedQuestCatalog } : {}),
          _dailyTasks: (function() {
            const daily = save.daily || rawPayload.daily || window.__bloomshire_master_save?.daily || null;
            if (daily && Array.isArray(daily.list) && daily.list.length > 0) {
              return daily.list.map(t => {
                const def = DAILY_TASK_DEFS[t.id] || {};
                const target = def.target || t.target || 1;
                const current = typeof t.n === 'number' ? t.n : (t.done ? target : 0);
                const isDone = Boolean(t.done || current >= target || daily.claimed);
                return {
                  id: t.id,
                  label: def.label || t.text || t.id,
                  icon: def.icon || '🌱',
                  stars: def.stars || 1,
                  target,
                  current: isDone ? target : current,
                  done: isDone,
                  completedAt: typeof t.done === 'number' ? t.done : null
                };
              });
            }
            let t = save.tasks || rawPayload.tasks || save.dailyTasks || rawPayload.dailyTasks || null;
            if (!t && p) {
              t = p.tasks || p.dailyTasks || p.daily || (typeof p.getTasks === 'function' ? p.getTasks() : null);
            }
            if (!t) {
              try {
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k && (k.includes('task') || k.includes('daily'))) {
                    const raw = localStorage.getItem(k);
                    if (raw && (raw.startsWith('[') || raw.startsWith('{'))) {
                      const parsed = JSON.parse(raw);
                      if (Array.isArray(parsed) && parsed.length > 0) { t = parsed; break; }
                      else if (parsed && Array.isArray(parsed.tasks)) { t = parsed.tasks; break; }
                    }
                  }
                }
              } catch (e) {}
            }
            return t || [];
          })(),
          _activeCrops: extractActiveCrops(save),
          _liveProductionPots: extractActiveProductionPots(save),
          _marketTrades: latestMarketTrades,
          _activeGameBuild: getDetectedGameBuild(),
          _serverTimeOffset: serverTimeOffset
        }
      }, '*');
    } catch (e) { }
  }

  const _origFetch = window.fetch;

  // Consulta directa al backend de Bloomshire (modo pasivo y seguro: solo bajo demanda explícita, nunca interfiere en interiores)
  async function fetchFreshServerState(force = false) {
    // Si no es petición forzada manual y no estamos seguros del contexto, no interferir
    if (!force) return false;
    const candidateUrls = [
      '/play/api/state',
      `${window.location.origin}/play/api/state`
    ];

    for (const url of candidateUrls) {
      try {
        const resp = await _origFetch(url, {
          method: 'GET',
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        if (resp && resp.ok) {
          const data = await resp.json();
          if (data && (data.save || data.purse)) {
            console.log('[Bloomshire Companion Hook] Estado fresco obtenido de', url);
            dispatchState(data, force);
            return true;
          }
        }
      } catch (err) { }
    }
    return false;
  }

  function schedulePostCmdRefresh() {
    if (cmdRefreshTimer) clearTimeout(cmdRefreshTimer);
    cmdRefreshTimer = setTimeout(() => {
      // Despacho 100% pasivo desde memoria viva Phaser y localStorage (CERO llamadas de red al servidor)
      // NUNCA llamar a fetchFreshServerState aquí: llamar a GET /api/state mientras se está en interiores
      // resetea la sesión del PNJ en el servidor y causa el error "Aquí nadie vende eso" en las tiendas.
      console.log('[Bloomshire Companion Hook] Acción de juego detectada: refrescando parcelas vivas de forma pasiva...');
      dispatchState(window.__bloomshire_master_save || lastKnownSave || {}, true);
    }, 150);
  }

  // 1. Sniffer pasivo de fetch (captura /api/state, /api/cmd y /api/maps/<id> de forma 100% pasiva)
  const ATLAS_MAP_IDS = new Set([
    'bloomshire',
    'whisperwood',
    'stonepeak',
    'everbloom',
    'frosthaven',
    'barrowmire',
    'dreaming_fields',
    'home_island',
    'vip_quarter',
    'colosseum'
  ]);

  const rawMapJsonCache = new Map();     // mapId -> raw map JSON
  const renderedMapCache = new Map();    // mapId -> { mapId, dataUrl, pixelWidth, pixelHeight, scale, fishingSpots }
  const renderingInProgress = new Set(); // mapId en proceso de renderizado
  const packImageCache = new Map();      // path -> Promise<HTMLImageElement | null>
  let safeMapSyncRunning = false;

  function toPackUrl(assetPath) {
    const s = String(assetPath || '');
    if (!s) return '';
    if (s.startsWith('art:')) {
      return `/play/ui/art/${encodeURIComponent(s.slice(4))}`;
    }
    return `/play/pack/${s.split('/').map(encodeURIComponent).join('/')}`;
  }

  function loadPackImage(assetPath) {
    if (!assetPath) return Promise.resolve(null);
    if (packImageCache.has(assetPath)) return packImageCache.get(assetPath);
    const p = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      const timer = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(null);
      }, 15000);
      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timer);
        packImageCache.delete(assetPath);
        resolve(null);
      };
      img.src = toPackUrl(assetPath);
    });
    packImageCache.set(assetPath, p);
    return p;
  }

  function rleDecodeMapLayer(runs, size) {
    const out = new Uint32Array(size);
    if (!Array.isArray(runs)) return out;
    let p = 0;
    for (let i = 0; i + 1 < runs.length && p < size; i += 2) {
      const v = runs[i] >>> 0;
      const n = Math.min(runs[i + 1], size - p);
      if (v) out.fill(v, p, p + n);
      p += n;
    }
    return out;
  }

  function resolveTileGid(tilesets, gid) {
    if (!gid || !tilesets.length) return null;
    let lo = 0, hi = tilesets.length - 1, hit = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (tilesets[m].firstgid <= gid) { hit = m; lo = m + 1; }
      else hi = m - 1;
    }
    if (hit < 0) return null;
    const ts = tilesets[hit];
    const index = gid - ts.firstgid;
    return index < ts.tileCount ? { ts, index } : null;
  }

  function dispatchRenderedMap(mapPayload) {
    if (!mapPayload || !mapPayload.mapId || !mapPayload.dataUrl) return;
    window.postMessage({
      type: '__BLOOMSHIRE_MAP_IMAGE',
      source: 'bloomshire_hook',
      payload: mapPayload
    }, '*');
  }

  async function renderMapJsonToWebP(mapId, j) {
    if (!mapId || !j || typeof j !== 'object') return null;
    if (renderedMapCache.has(mapId)) {
      const cached = renderedMapCache.get(mapId);
      dispatchRenderedMap(cached);
      return cached;
    }
    if (renderingInProgress.has(mapId)) return null;
    renderingInProgress.add(mapId);

    try {
      const width = Math.max(1, j.width | 0);
      const height = Math.max(1, j.height | 0);
      const tileSize = j.tileSize || 16;
      const pixelWidth = width * tileSize;
      const pixelHeight = height * tileSize;

      // Escala óptima para mantener nitidez Pixel-Art sin exceder límites de memoria/mensajería
      const maxDim = Math.max(pixelWidth, pixelHeight);
      const scale = maxDim > 6000 ? 0.375 : (maxDim > 2200 ? 0.5 : 0.75);

      const tilesets = (j.tilesets || [])
        .map(t => ({
          image: t.image,
          firstgid: t.firstgid,
          columns: t.columns || 1,
          rows: t.rows || 1,
          tileCount: t.tileCount ?? ((t.columns || 1) * (t.rows || 1))
        }))
        .sort((a, b) => a.firstgid - b.firstgid);

      // Recolectar todas las imágenes necesarias (tilesets + objetos visibles)
      const neededPaths = new Set();
      tilesets.forEach(t => { if (t.image) neededPaths.add(t.image); });
      (j.layers || []).forEach(l => {
        if (l.visible === false) return;
        if (l.type !== 'tiles' && Array.isArray(l.objects)) {
          l.objects.forEach(o => { if (o && o.asset) neededPaths.add(o.asset); });
        }
      });

      // Cargar imágenes en lotes controlados de 16 en paralelo (aprovechando caché del navegador)
      const pathsList = [...neededPaths];
      const loadedImgs = new Map();
      const BATCH_SIZE = 16;
      for (let i = 0; i < pathsList.length; i += BATCH_SIZE) {
        const chunk = pathsList.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(chunk.map(p => loadPackImage(p)));
        chunk.forEach((p, idx) => {
          if (results[idx]) loadedImgs.set(p, results[idx]);
        });
      }

      // Crear canvas offscreen y dibujar exactamente como render.js (renderRegion)
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(pixelWidth * scale));
      canvas.height = Math.max(1, Math.round(pixelHeight * scale));
      const g = canvas.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.setTransform(scale, 0, 0, scale, 0, 0);

      g.fillStyle = j.background || '#5a8f3c';
      g.fillRect(0, 0, pixelWidth, pixelHeight);

      for (const l of (j.layers || [])) {
        if (l.visible === false) continue;
        g.globalAlpha = l.opacity ?? 1;

        if (l.type === 'tiles') {
          const data = l.encoding === 'rle'
            ? rleDecodeMapLayer(l.data || [], width * height)
            : Uint32Array.from((l.data || []).slice(0, width * height));

          for (let ty = 0; ty < height; ty++) {
            const rowOffset = ty * width;
            for (let tx = 0; tx < width; tx++) {
              const gid = data[rowOffset + tx];
              if (!gid) continue;
              const hit = resolveTileGid(tilesets, gid);
              if (!hit) continue;
              const img = loadedImgs.get(hit.ts.image);
              if (!img) continue;
              const sx = (hit.index % hit.ts.columns) * tileSize;
              const sy = ((hit.index / hit.ts.columns) | 0) * tileSize;
              g.drawImage(img, sx, sy, tileSize, tileSize, tx * tileSize, ty * tileSize, tileSize, tileSize);
            }
          }
        } else if (Array.isArray(l.objects)) {
          const rawObjs = [...l.objects];
          if (rawObjs.length && rawObjs.every(o => typeof o.zIndex === 'number')) {
            rawObjs.sort((a, b) => a.zIndex - b.zIndex);
          }
          const objs = rawObjs.map((o, idx) => {
            const s = o.source || {};
            const sw = Math.max(1, +s.w || +o.width || 16);
            const sh = Math.max(1, +s.h || +o.height || 16);
            return {
              asset: String(o.asset || ''),
              sx: +s.x || 0,
              sy: +s.y || 0,
              sw,
              sh,
              x: +o.x || 0,
              y: +o.y || 0,
              w: +o.width || (sw * (+o.scaleX || 1)) || 16,
              h: +o.height || (sh * (+o.scaleY || 1)) || 16,
              rot: +o.rotation || 0,
              flipX: !!o.flipX,
              flipY: !!o.flipY,
              _i: idx
            };
          });

          const ordered = l.ysort
            ? objs.sort((a, b) => (a.y + a.h) - (b.y + b.h) || a._i - b._i)
            : objs;

          for (const o of ordered) {
            const img = loadedImgs.get(o.asset);
            if (!img) continue;
            const plain = !o.rot && !o.flipX && !o.flipY;
            if (!plain) {
              g.save();
              g.translate(o.x + o.w / 2, o.y + o.h / 2);
              if (o.rot) g.rotate((o.rot * Math.PI) / 180);
              if (o.flipX || o.flipY) g.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
            }
            const dx = plain ? o.x : -o.w / 2;
            const dy = plain ? o.y : -o.h / 2;
            g.drawImage(img, o.sx, o.sy, o.sw, o.sh, dx, dy, o.w, o.h);
            if (!plain) g.restore();
          }
        }
      }

      g.globalAlpha = 1;

      // Si es el mapa central 'bloomshire' (5632x7424), recortar los flancos vacíos donde encastran Whisperwood (0..1792, 0..5504) y Stonepeak (3840..5632, 0..5504)
      if (mapId === 'bloomshire' && pixelWidth >= 5632 && pixelHeight >= 7424) {
        g.clearRect(0, 0, 1792, 5504);
        g.clearRect(3840, 0, 1792, 5504);
      }

      // Extraer zonas de pesca reales del mapa (game/ui.js #mapPicture)
      const fishingSpots = (j.zones || [])
        .filter(z => Array.isArray(z.tags) && z.tags.includes('fishing'))
        .map(z => ({
          x: +z.x || 0,
          y: +z.y || 0,
          w: +(z.width ?? z.w) || 16,
          h: +(z.height ?? z.h) || 16
        }));

      const dataUrl = canvas.toDataURL('image/webp', 0.85);
      const payload = {
        mapId,
        dataUrl,
        pixelWidth,
        pixelHeight,
        scale,
        fishingSpots,
        renderedAt: Date.now()
      };

      renderedMapCache.set(mapId, payload);
      console.log(`[Bloomshire Companion Hook] Mapa Pixel-Art real renderizado (${mapId}): ${canvas.width}x${canvas.height}px`);
      dispatchRenderedMap(payload);
      return payload;
    } catch (err) {
      console.warn(`[Bloomshire Companion Hook] Error renderizando mapa ${mapId}:`, err);
      return null;
    } finally {
      renderingInProgress.delete(mapId);
    }
  }

  // Sincronización segura y pausada bajo demanda (solo lectura de mapas faltantes, 1 cada 1.6s)
  async function syncAllRealMapsSafely() {
    // Reenviar primero todos los que ya están renderizados en memoria
    for (const payload of renderedMapCache.values()) {
      dispatchRenderedMap(payload);
    }

    if (safeMapSyncRunning) return;
    safeMapSyncRunning = true;

    try {
      for (const mapId of ATLAS_MAP_IDS) {
        if (renderedMapCache.has(mapId)) continue;

        let mapJson = rawMapJsonCache.get(mapId);
        if (!mapJson) {
          try {
            const resp = await _origFetch(`/play/api/maps/${encodeURIComponent(mapId)}`, {
              method: 'GET',
              credentials: 'same-origin',
              headers: { 'Accept': 'application/json' }
            });
            if (resp && resp.ok) {
              mapJson = await resp.json();
              if (mapJson && mapJson.layers) {
                rawMapJsonCache.set(mapId, mapJson);
              }
            }
          } catch (e) { }
          // Pausa natural de 1.6 segundos entre lecturas de mapas para comportamiento 100% humano
          await new Promise(r => setTimeout(r, 1600));
        }

        if (mapJson && mapJson.layers) {
          await renderMapJsonToWebP(mapId, mapJson);
        }
      }
    } finally {
      safeMapSyncRunning = false;
    }
  }

  window.fetch = async function (...args) {
    let interceptedCmd = null;
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      if (url.includes('api/cmd')) {
        const rawBody = args[1]?.body;
        if (typeof rawBody === 'string') {
          try { interceptedCmd = JSON.parse(rawBody); } catch (e) {}
        } else if (rawBody && typeof rawBody === 'object') {
          interceptedCmd = rawBody;
        }
      }
    } catch (e) {}

    const resp = await _origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      if (url.includes('/api/session') || url.includes('/play/api/door')) {
        resp.clone().json().then(sessData => {
          const acc = sessData?.account || sessData?.player;
          if (acc?.id) {
            cachedWallet = acc.id;
            try { localStorage.setItem('bloomshire_wallet', acc.id); } catch (_) {}
          }
        }).catch(() => {});
      } else if (url.includes('api/state') || url.includes('api/cmd') || url.includes('api/trade') || url.includes('api/crypto')) {
        resp.clone().json().then(data => {
          updateServerTimeOffset(resp, data);
          if (data && data.save) {
            attachLiveSaveWatchers(data.save);
            dispatchState(data.save, true);
          } else if (url.includes('api/cmd')) {
            applyServerCmdResponse(data, interceptedCmd);
            const live = window.__bloomshire_live_doc || window.__bloomshire_master_save || lastKnownSave;
            if (live) dispatchState(live, true);
            schedulePostCmdRefresh();
          }
        }).catch(() => { });
            } else if (url.includes('api/offers')) {
        resp.clone().json().then(offersData => {
          latestMarketTrades = offersData;
          window.postMessage({
            type: '__BLOOMSHIRE_MARKET_SNAPSHOT',
            offers: offersData,
            timestamp: Date.now()
          }, '*');
        }).catch(() => {});
      } else if (url.includes('api/maps/')) {
        // Captura 100% pasiva cuando el propio juego carga el mapa actual o hace prefetchNext() de mapas vecinos
        const m = /api\/maps\/([a-zA-Z0-9_-]+)/.exec(url);
        const mapId = m ? decodeURIComponent(m[1]) : null;
        if (mapId && ATLAS_MAP_IDS.has(mapId)) {
          resp.clone().json().then(mapJson => {
            if (mapJson && mapJson.layers) {
              rawMapJsonCache.set(mapId, mapJson);
              // Renderizar en segundo plano sin bloquear el hilo principal del juego
              setTimeout(() => renderMapJsonToWebP(mapId, mapJson), 800);
            }
          }).catch(() => { });
        }
      }
    } catch (e) { }
    return resp;
  };

  // 2. Sniffer pasivo de XMLHttpRequest
  const _origXhrOpen = XMLHttpRequest.prototype.open;
  const _origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._reqUrl = url;
    return _origXhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    let interceptedCmd = null;
    try {
      if (typeof body === 'string') {
        interceptedCmd = JSON.parse(body);
      } else if (body && typeof body === 'object') {
        interceptedCmd = body;
      }
    } catch (e) {}

    this.addEventListener('load', () => {
      try {
        const url = this._reqUrl || '';
        if (url.includes('api/state') || url.includes('api/cmd')) {
          const data = JSON.parse(this.responseText);
          updateServerTimeOffset(null, data);
          if (data && data.save) {
            window.__bloomshire_master_save = data.save;
            lastKnownSave = data.save;
            dispatchState(data, true);
          } else if (url.includes('api/cmd')) {
            applyServerCmdResponse(data, interceptedCmd);
            const live = window.__bloomshire_master_save || lastKnownSave;
            if (live) dispatchState(live, true);
            schedulePostCmdRefresh();
          }
        }
      } catch (e) { }
    });
    return _origXhrSend.apply(this, arguments);
  };

  // 3. Interceptores de Storage para sincronización ultra-fluida (<50ms) de parcelas, cocina y crafteo
  function normalizeStorageSubKey(k) {
    if (!k || typeof k !== 'string') return '';
    const farmM = /farm\.[a-zA-Z0-9_-]+/.exec(k);
    if (farmM) return farmM[0];
    const potM = /(pot|craftPot|millPot|dairyPot|loomPot)/.exec(k);
    if (potM) return potM[0];
    return k.split('.').pop();
  }

  const _origSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    try {
      if (typeof key === 'string' && (
        key.includes('farm') || 
        key.includes('pot') || 
        key.includes('craft') || 
        key.includes('mill') || 
        key.includes('dairy') || 
        key.includes('loom') || 
        key.includes('inventory') || 
        key.includes('quests') || 
        key.includes('energy') || 
        key.includes('purse') ||
        key.includes('crop') ||
        key.includes('task') ||
        key.includes('daily')
      )) {
        if (!lastKnownSave) lastKnownSave = {};
        
        let parsedVal = null;
        try {
          parsedVal = (typeof value === 'string' && (value.startsWith('{') || value.startsWith('[') || value === 'null' || !isNaN(value)))
            ? JSON.parse(value)
            : value;
        } catch (_) {}

        const normKey = normalizeStorageSubKey(key);
        if (normKey === 'pot' || normKey === 'craftPot' || normKey === 'millPot' || normKey === 'dairyPot' || normKey === 'loomPot') {
          if (!parsedVal || parsedVal === 'null') {
            delete lastKnownSave[normKey];
          } else {
            lastKnownSave[normKey] = parsedVal;
          }
          console.log('[Bloomshire Hook] Producción/Craft actualizado en vivo:', normKey, parsedVal);
        } else if (normKey.startsWith('farm.')) {
          lastKnownSave[normKey] = parsedVal;
          console.log('[Bloomshire Hook] Parcela actualizada en vivo (<50ms):', normKey);
        } else if (normKey === 'inventory') {
          lastKnownSave.inventory = parsedVal;
        } else if (normKey === 'purse') {
          lastKnownSave.purse = parsedVal;
        } else if (normKey === 'energy') {
          lastKnownSave.energy = parsedVal;
        } else if (normKey === 'quests') {
          lastKnownSave.quests = parsedVal;
        } else if (normKey === 'tasks' || normKey === 'dailyTasks' || key.includes('task') || key.includes('daily')) {
          lastKnownSave.tasks = parsedVal;
          lastKnownSave._dailyTasks = parsedVal;
          console.log('[Bloomshire Hook] Tareas diarias actualizadas en vivo:', parsedVal);
        }

        schedulePostCmdRefresh();
      }
    } catch (e) {}
    return _origSetItem.apply(this, arguments);
  };

  const _origRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (key) {
    try {
      if (typeof key === 'string' && lastKnownSave) {
        const normKey = normalizeStorageSubKey(key);
        if (normKey) {
          delete lastKnownSave[normKey];
          schedulePostCmdRefresh();
        }
      }
    } catch (e) {}
    return _origRemoveItem.apply(this, arguments);
  };

  // Sincronizador automático y ultra-fluido cada 2 segundos (CERO llamadas de red al servidor, 100% pasivo)
  setInterval(() => {
    try {
      const active = window.__bloomshire_live_doc || window.__bloomshire_master_save || lastKnownSave;
      if (active) {
        dispatchState(active, false);
      }
    } catch (_) {}
  }, 2000);

  // Sincronización manual instantánea (botón "Sincronizar" en MoniOS o en popup de extensión)
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'FORCE_BLOOMSHIRE_SCAN') {
      console.log('[Bloomshire Companion Hook] Sincronización manual 100% pasiva solicitada');
      // NUNCA llamar a fetchFreshServerState aquí: llamar a GET /api/state mientras se está en interiores
      // resetea la sesión del PNJ en el servidor y causa el error "Aquí nadie vende eso" en las tiendas.
      const active = window.__bloomshire_master_save || lastKnownSave;
      if (active) {
        dispatchState(active, true);
      }
        } else if (e.data?.type === '__FETCH_MARKET_OFFERS_REQ') {
      console.log('[Bloomshire Companion Hook] Consulta manual on-demand de /play/api/offers solicitada');
      _origFetch('/play/api/offers', { credentials: 'same-origin', cache: 'no-store' })
        .then(r => r.json())
        .then(offersData => {
          latestMarketTrades = offersData;
          window.postMessage({
            type: '__BLOOMSHIRE_MARKET_SNAPSHOT',
            offers: offersData,
            timestamp: Date.now()
          }, '*');
        })
        .catch(err => {
          console.warn('[Bloomshire Companion Hook] Error al obtener /play/api/offers:', err);
          window.postMessage({
            type: '__BLOOMSHIRE_MARKET_SNAPSHOT_ERROR',
            error: err.message
          }, '*');
        });
    } else if (e.data?.type === 'SYNC_BLOOMSHIRE_REAL_MAPS') {
      console.log('[Bloomshire Companion Hook] Sincronización segura de mapas Pixel-Art reales solicitada');
      syncAllRealMapsSafely();
    }
  });
})();
