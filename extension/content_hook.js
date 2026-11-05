// content_hook.js - MAIN world hook for bloomshire.xyz
// Pure helper functions for reference capture (exported for Vitest / Node testing)
function shouldCaptureLiveDoc(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.toLowerCase();
  if (!clean.includes('api/state')) return false;
  if (clean.includes('api/cmd') || clean.includes('api/trade') || clean.includes('api/crypto') || clean.includes('api/offers')) {
    return false;
  }
  return true;
}

function captureLiveDoc(currentRef, data, url, onCaptured) {
  if (!shouldCaptureLiveDoc(url)) return currentRef;
  const newSave = (data && typeof data === 'object' && data.save && typeof data.save === 'object') ? data.save : null;
  if (newSave && newSave !== currentRef) {
    if (typeof onCaptured === 'function') {
      onCaptured(newSave, url);
    }
    return newSave;
  }
  return currentRef;
}

(function () {
  if (typeof window === 'undefined' || window.__bloomshire_hook_loaded) return;
  window.__bloomshire_hook_loaded = true;

  console.log('[Bloomshire Companion Hook] MAIN world hook initialized on', window.location.href);

  // Hook directo a Response.prototype.json para capturar la referencia viva en memoria del save (doc)
  // ÚNICAMENTE desde GET api/state (el juego adopta datos sobre este mismo objeto en #adopt)
  const _origResponseJson = Response.prototype.json;
  Response.prototype.json = async function () {
    const data = await _origResponseJson.apply(this, arguments);
    try {
      const respUrl = this.url || '';
      if (data && typeof data === 'object') {
        if (shouldCaptureLiveDoc(respUrl)) {
          const prev = window.__bloomshire_live_doc;
          const next = captureLiveDoc(prev, data, respUrl, (newRef, u) => {
            console.log(`[Hook] referencia viva fijada desde ${u}`);
          });
          if (next && next !== prev) {
            window.__bloomshire_live_doc = next;
            window.__bloomshire_master_save = next;
            lastKnownSave = next;
            dispatchState(next, true);
          }
        } else if (respUrl.includes('api/cmd') || respUrl.includes('api/trade') || respUrl.includes('api/crypto')) {
          // Las respuestas de api/cmd, trade y crypto solo deben disparar dispatchState sobre el objeto vivo
          const live = window.__bloomshire_live_doc;
          if (live) {
            setTimeout(() => {
              dispatchState(live, true);
            }, 130);
          }
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
    return 'a70eb5dd5113';
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
    { id: 'Carrot', name: 'Zanahoria', grow: 2, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["all"], icon: '🥕' },
    { id: 'Potato', name: 'Patata', grow: 8, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["all"], icon: '🥔' },
    { id: 'Cabbage', name: 'Repollo', grow: 20, regrow: null, harvests: 1, stages: 6, premium: false, seasons: ["all"], icon: '🥬' },
    { id: 'Cauliflower', name: 'Coliflor', grow: 90, regrow: null, harvests: 1, stages: 6, premium: false, seasons: ["Spring"], icon: '🥦' },
    { id: 'Strawberry', name: 'Fresa', grow: 80, regrow: 60, harvests: 5, stages: 5, premium: false, seasons: ["Spring"], icon: '🍓' },
    { id: 'Tomato', name: 'Tomate', grow: 45, regrow: 35, harvests: 5, stages: 6, premium: false, seasons: ["Summer"], icon: '🍅' },
    { id: 'Wheat', name: 'Trigo', grow: 15, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["all"], icon: '🌾' },
    { id: 'Sunflower', name: 'Girasol', grow: 35, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Summer"], icon: '🌻' },
    { id: 'Corn', name: 'Maíz', grow: 40, regrow: 30, harvests: 5, stages: 6, premium: false, seasons: ["Fall"], icon: '🌽' },
    { id: 'Green Beans', name: 'Judías Verdes', grow: 50, regrow: 40, harvests: 5, stages: 5, premium: false, seasons: ["Summer"], icon: '🫛' },
    { id: 'Cantaloupe', name: 'Melón Cantalupo', grow: 100, regrow: null, harvests: 1, stages: 6, premium: false, seasons: ["Summer"], icon: '🍈' },
    { id: 'Marigold', name: 'Caléndula', grow: 20, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["all"], icon: '🌼' },
    { id: 'Sweet Potato', name: 'Batata', grow: 70, regrow: null, harvests: 1, stages: 4, premium: false, seasons: ["Fall"], icon: '🍠' },
    { id: 'Saffron', name: 'Azafrán', grow: 240, regrow: null, harvests: 1, stages: 4, premium: false, seasons: ["Fall"], icon: '🌾' },
    { id: 'Star Fruit', name: 'Fruta Estrella', grow: 300, regrow: null, harvests: 1, stages: 6, premium: false, seasons: ["Summer"], icon: '⭐' },
    { id: 'Onion', name: 'Cebolla', grow: 12, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Spring"], icon: '🧅' },
    { id: 'Eggplant', name: 'Berenjena', grow: 60, regrow: 45, harvests: 5, stages: 5, premium: false, seasons: ["Fall"], icon: '🍆' },
    { id: 'Watermelon', name: 'Sandía', grow: 110, regrow: null, harvests: 1, stages: 7, premium: false, seasons: ["Summer"], icon: '🍉' },
    { id: 'Beetroot', name: 'Remolacha', grow: 120, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Fall"], icon: '🟣' },
    { id: 'Pumpkin', name: 'Calabaza', grow: 180, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Fall"], icon: '🎃' },
    { id: 'Grapes', name: 'Uvas', grow: 150, regrow: 90, harvests: 5, stages: 5, premium: false, seasons: ["Fall"], icon: '🍇' },
    { id: 'Hot Pepper', name: 'Chile Picante', grow: 60, regrow: 45, harvests: 5, stages: 6, premium: false, seasons: ["Summer"], icon: '🌶️' },
    { id: 'Asparagus', name: 'Espárrago', grow: 120, regrow: null, harvests: 1, stages: 4, premium: false, seasons: ["Spring"], icon: '🌱' },
    { id: 'Blueberry', name: 'Arándano', grow: 90, regrow: 60, harvests: 5, stages: 5, premium: false, seasons: ["Spring"], icon: '🫐' },
    { id: 'Broccoli', name: 'Brócoli', grow: 30, regrow: null, harvests: 1, stages: 4, premium: false, seasons: ["Spring"], icon: '🥦' },
    { id: 'Parsnip', name: 'Chirivía', grow: 5, regrow: null, harvests: 1, stages: 4, premium: false, seasons: ["all"], icon: '🥔' },
    { id: 'Rice', name: 'Arroz', grow: 30, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Spring"], icon: '🌾' },
    { id: 'Spring Onion', name: 'Cebollín', grow: 6, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["all"], icon: '🧅' },
    { id: 'Adzuki Bean', name: 'Frijol Adzuki', grow: 45, regrow: 35, harvests: 5, stages: 6, premium: false, seasons: ["Summer"], icon: '🫘' },
    { id: 'Green Bell Pepper', name: 'Pimiento Verde', grow: 60, regrow: 45, harvests: 5, stages: 5, premium: false, seasons: ["Summer"], icon: '🫑' },
    { id: 'Red Bell Pepper', name: 'Pimiento Rojo', grow: 60, regrow: 45, harvests: 5, stages: 5, premium: false, seasons: ["Summer"], icon: '🌶️' },
    { id: 'Yellow Bell Pepper', name: 'Pimiento Amarillo', grow: 60, regrow: 45, harvests: 5, stages: 5, premium: false, seasons: ["Summer"], icon: '🫑' },
    { id: 'Blackberry', name: 'Mora', grow: 50, regrow: 40, harvests: 5, stages: 6, premium: false, seasons: ["Summer"], icon: '🫐' },
    { id: 'Cucumber', name: 'Pepino', grow: 40, regrow: 30, harvests: 5, stages: 5, premium: false, seasons: ["Summer"], icon: '🥒' },
    { id: 'Pineapple', name: 'Piña', grow: 240, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Summer"], icon: '🍍' },
    { id: 'Aloe', name: 'Aloe Vera', grow: 150, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Fall"], icon: '🪴' },
    { id: 'Premium Seed', name: 'Semilla Premium', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true, seasons: ["all"], icon: '✨' },
    { id: 'Sunfire Pepper', name: 'Pimiento Fuego Solar', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true, seasons: ["all"], icon: '🌶️' },
    { id: 'Diamond Strawberry', name: 'Fresa Diamante', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true, seasons: ["all"], icon: '🍓' },
    { id: 'Sapphire Blueberry', name: 'Arándano Zafiro', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true, seasons: ["all"], icon: '🫐' },
    { id: 'Golden Pumpkin', name: 'Calabaza Dorada', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true, seasons: ["all"], icon: '🎃' },
    { id: 'Crystal Grapes', name: 'Uvas de Cristal', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true, seasons: ["all"], icon: '🍇' },
    { id: 'Starbloom', name: 'Flor Estelar', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true, seasons: ["all"], icon: '🌸' },
    { id: 'Celestial Pineapple', name: 'Piña Celestial', grow: 15, regrow: null, harvests: 1, stages: 4, premium: true, seasons: ["all"], icon: '🍍' },
    { id: 'Winter Kale', name: 'Winter Kale (Col de Invierno)', grow: 20, regrow: null, harvests: 1, stages: 4, premium: false, seasons: ["Winter"], icon: '🥬❄️' },
    { id: 'Snow Turnip', name: 'Snow Turnip (Nabo de Nieve)', grow: 45, regrow: null, harvests: 1, stages: 4, premium: false, seasons: ["Winter"], icon: '❄️' },
    { id: 'Frostberry', name: 'Frostberry (Baya de Escarcha)', grow: 90, regrow: 60, harvests: 5, stages: 5, premium: false, seasons: ["Winter"], icon: '🫐❄️' },
    { id: 'Ice Melon', name: 'Ice Melon (Melón de Hielo)', grow: 150, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Winter"], icon: '🍈❄️' },
    { id: 'Fireheart Pepper', name: 'Pimiento Corazón de Fuego', grow: 180, regrow: null, harvests: 1, stages: 6, premium: false, seasons: ["all"], icon: '🌶️🔥' },
    { id: 'Fairy Rose', name: 'Rosa de Hada', grow: 110, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["all"], icon: '🌹✨' },
    { id: 'Honeydew Melon', name: 'Melón Verde', grow: 270, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Summer"], icon: '🍈' },
    { id: 'Purple Cauliflower', name: 'Coliflor Violeta', grow: 300, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Spring"], icon: '🥦🟣' },
    { id: 'Snow Pea', name: 'Snow Pea (Guisante de Nieve)', grow: 330, regrow: null, harvests: 1, stages: 6, premium: false, seasons: ["Winter"], icon: '🫛❄️' },
    { id: 'Golden Beet', name: 'Remolacha Dorada', grow: 360, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Spring"], icon: '🟡' },
    { id: 'Black Tomato', name: 'Tomate Negro', grow: 390, regrow: null, harvests: 1, stages: 6, premium: false, seasons: ["Summer"], icon: '🍅🖤' },
    { id: 'Blue Corn', name: 'Maíz Azul', grow: 420, regrow: null, harvests: 1, stages: 7, premium: false, seasons: ["Fall"], icon: '🌽🔵' },
    { id: 'Dragon Fruit', name: 'Fruta del Dragón', grow: 480, regrow: null, harvests: 1, stages: 5, premium: false, seasons: ["Summer"], icon: '🐉' }
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

    // Constantes y ciclo de lluvia canónico de Bloomshire (rules.js:611 / weather.js:18-138)
    const WORLD_TIME_EPOCH = Date.UTC(2026, 9, 23, 14, 0, 0);
    const BLOOM_DAY_MS = 8 * 3600e3;
    const BLOOM_LIGHT_MS = 6 * 3600e3;
    const BLOOM_DAWN_MIN = 5 * 60;
    const BLOOM_LIGHT_MIN = (21 - 5) * 60;
    const BLOOM_NIGHT_MIN = 24 * 60 - BLOOM_LIGHT_MIN;

    function bloomDayRandom(n) {
      let h = Math.imul((n | 0) ^ 0x9e3779b9, 2654435761) >>> 0;
      h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489917) >>> 0; h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    }

    const rainyDaysCache = new Map();
    let reachDay = -1, nextRainDay = 1;
    function bloomshireRainsOn(day) {
      if (day < 0) return false;
      if (day > reachDay) {
        for (let d = reachDay + 1; d <= day; d++) {
          const yes = d === nextRainDay;
          rainyDaysCache.set(d, yes);
          if (yes) nextRainDay = d + (bloomDayRandom(d * 3 + 11) < 0.5 ? 2 : 3);
        }
        reachDay = day;
      }
      return rainyDaysCache.get(day) ?? false;
    }

    function bloomshireShowerOf(day) {
      const start = (2 + bloomDayRandom(day * 7 + 1) * 9) * 60;
      const hours = 5 + bloomDayRandom(day * 7 + 2) * 4;
      return { from: start, to: start + hours * 60, heavy: bloomDayRandom(day * 7 + 3) > 0.62 };
    }

    function bloomshireDayAt(t) {
      const since = t - WORLD_TIME_EPOCH, day = Math.floor(since / BLOOM_DAY_MS), into = since - day * BLOOM_DAY_MS;
      const fromDawn = into < BLOOM_LIGHT_MS ? (into / BLOOM_LIGHT_MS) * BLOOM_LIGHT_MIN : BLOOM_LIGHT_MIN + ((into - BLOOM_LIGHT_MS) / (BLOOM_DAY_MS - BLOOM_LIGHT_MS)) * BLOOM_NIGHT_MIN;
      return { day, fromDawn, clock: (BLOOM_DAWN_MIN + fromDawn) % 1440 };
    }

    // Temporadas canónicas de Bloomshire (rules.js:618-628)
    const WORLD_TIME = {
      dayRealHours: 8,
      daylight: { from: 5, to: 21, realHours: 6 },
      daysPerSeason: 28,
      seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
      epoch: WORLD_TIME_EPOCH,
    };
    const SEASON_MS = WORLD_TIME.dayRealHours * 3600e3 * WORLD_TIME.daysPerSeason;
    const seasonNo = (t) => Math.max(0, Math.floor((t - WORLD_TIME.epoch) / SEASON_MS));
    const seasonAt = (t = Date.now()) => WORLD_TIME.seasons[((seasonNo(t) % 4) + 4) % 4];
    const seasonStartAt = (t = Date.now()) => WORLD_TIME.epoch + seasonNo(t) * SEASON_MS;
    const inSeason = (seed, t = Date.now()) => {
      if (!seed || !seed.seasons) return true;
      if (Array.isArray(seed.seasons) && (seed.seasons.includes('all') || seed.seasons.length === 0)) return true;
      return seed.seasons.includes(seasonAt(t));
    };

    function bloomshireWorldAt(day, fromDawn) {
      const into = fromDawn < BLOOM_LIGHT_MIN ? (fromDawn / BLOOM_LIGHT_MIN) * BLOOM_LIGHT_MS : BLOOM_LIGHT_MS + ((fromDawn - BLOOM_LIGHT_MIN) / BLOOM_NIGHT_MIN) * (BLOOM_DAY_MS - BLOOM_LIGHT_MS);
      return WORLD_TIME_EPOCH + day * BLOOM_DAY_MS + into;
    }

    function bloomshireFirstRainBetween(a, b) {
      if (!(b > a)) return null;
      let first = null;
      const seen = (from, to) => {
        const x = Math.max(a, from);
        if (Math.min(b, to) > x && (first == null || x < first)) first = x;
      };
      for (let d = Math.max(0, bloomshireDayAt(a).day - 1), last = bloomshireDayAt(b).day; d <= last; d++) {
        if (!bloomshireRainsOn(d)) continue;
        const s = bloomshireShowerOf(d);
        seen(bloomshireWorldAt(d, s.from), bloomshireWorldAt(d, s.to));
      }
      return first;
    }

    // Algoritmo canónico oficial de crecimiento (game/farm.js: growth y grown)
    function computeCropGrowth(crop, nowTs = Date.now(), outdoors = false, seed = null, asIs = false) {
      if (!crop || typeof crop !== 'object') return null;
      if (!seed) return null;

      // Cultivos Premium (VIP Quarter / rules.js: PREMIUM / farm.js:86-90):
      // La rama premium va ANTES de la lluvia: nunca se marchitan, se riegan automáticamente en crop.t
      // e ignoran la lluvia meteorológica (su ciclo es autónomo).
      if (!asIs && seed.premium && crop.t) {
        const w1 = crop.w1 ?? crop.t;
        const g0 = computeCropGrowth({ ...crop, w1, w2: null }, nowTs, false, seed, true);
        const w2 = crop.w2 ?? (g0.needs === 'second' ? g0.waitAt : null);
        return { ...computeCropGrowth({ ...crop, w1, w2 }, nowTs, false, seed, true), w1, w2 };
      }

      // Lluvia canónica (farm.js:52-61): En exteriores la lluvia riega los cultivos automáticamente (solo no-premium)
      if (outdoors && !asIs && !seed.premium) {
        let w1 = crop.w1, w2 = crop.w2, rained = false;
        if (!w1 && crop.t) {
          w1 = bloomshireFirstRainBetween(crop.t, nowTs);
          rained = Boolean(w1);
        }
        if (w1 && !w2) {
          const g0 = computeCropGrowth({ ...crop, w1, w2: null }, nowTs, false, seed, true);
          if (g0.needs === 'second') {
            w2 = bloomshireFirstRainBetween(g0.waitAt ?? w1, nowTs);
            rained = rained || Boolean(w2);
          }
        }
        if (rained) {
          const res = computeCropGrowth({ ...crop, w1, w2 }, nowTs, false, seed, true);
          return {
            ...res,
            rained: true,
            w1,
            w2,
            statusText: res.statusText.includes('Marchito') ? res.statusText : (res.ripe ? '¡Listo para cosechar! 🌾' : 'Creciendo (regado por lluvia) 🌧️🌱')
          };
        }
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
      const two = minutes > 60 && span >= 2;
      const wait = two ? last - 1 : last;
      const late = 5 * 3600e3; // WITHER.afterRipeHours = 5

      let res = null;
      if (!crop.w1) {
        res = {
          stage: from,
          last,
          ripe: false,
          needs: 'first',
          readyAt: null,
          two,
          per,
          withered: false,
          witheredAt: null,
          statusText: outdoors ? 'Requiere riego (o lluvia al aire libre) 💧🌧️' : 'Necesita agua (1.er riego) 💧'
        };
      } else if (!two) {
        const first = Math.min(wait, from + Math.floor(Math.max(0, nowTs - crop.w1) / per));
        const isRipe = first >= last;
        const readyAt = crop.w1 + total;
        res = {
          stage: first,
          last,
          ripe: isRipe,
          needs: null,
          readyAt,
          two,
          per,
          withered: false,
          witheredAt: null,
          statusText: isRipe ? '¡Listo para cosechar! 🌾' : 'Creciendo 🌱'
        };
      } else {
        const first = Math.min(wait, from + Math.floor(Math.max(0, nowTs - crop.w1) / per));
        const waitAt = crop.w1 + (wait - from) * per;
        if (first < wait) {
          res = {
            stage: first,
            last,
            ripe: false,
            needs: null,
            readyAt: null,
            waitAt,
            two,
            per,
            withered: false,
            witheredAt: null,
            statusText: 'Creciendo (esperando 2.° riego) 🌱'
          };
        } else if (!crop.w2) {
          res = {
            stage: wait,
            last,
            ripe: false,
            needs: 'second',
            readyAt: null,
            waitAt,
            two,
            per,
            withered: false,
            witheredAt: null,
            statusText: outdoors ? '¡Requiere 2.° riego (o lluvia al aire libre)! 💧🌧️' : '¡Necesita 2.° riego! 💧'
          };
        } else {
          const stage = Math.min(last, wait + Math.floor(Math.max(0, nowTs - crop.w2) / per));
          const isRipe = stage >= last;
          const readyAt = crop.w2 + per;
          res = {
            stage,
            last,
            ripe: isRipe,
            needs: null,
            readyAt,
            two,
            per,
            withered: false,
            witheredAt: null,
            statusText: isRipe ? '¡Listo para cosechar! 🌾' : 'Creciendo 🌱'
          };
        }
      }

      // WITHER CANÓNICO (farm.js:76-82 & rules.js:654):
      if (!asIs && !seed.premium) {
        if (res.ripe && nowTs >= res.readyAt + late) {
          return {
            ...res,
            ripe: false,
            needs: null,
            withered: true,
            witheredAt: res.readyAt + late,
            statusText: 'Marchito tras 5h maduro 🥀'
          };
        }
        if (crop.t && !inSeason(seed, nowTs)) {
          const turn = seasonStartAt(nowTs);
          if (crop.t < turn && !(res.ripe && res.readyAt <= turn)) {
            return {
              ...res,
              ripe: false,
              needs: null,
              withered: true,
              witheredAt: turn,
              statusText: 'Marchito por fin de temporada 🥀'
            };
          }
        }
      }

      return res;
    }

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
        const colonMatch = str.match(/^seed:(\d+)$/i);
        if (colonMatch) {
          const idx = parseInt(colonMatch[1], 10);
          seedDef = SEEDS_INFO[idx] || null;
        }
        if (!seedDef && /^\d+$/.test(str)) {
          const idx = parseInt(str, 10);
          seedDef = SEEDS_INFO[idx] || null;
        }
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
      const cellId = cell.cell ?? cell.cellId ?? cellIdx;
      const normField = normalizeFarmFieldKey(fieldKey);
      const mapId = normField.replace(/^farm\./i, '');
      // Regla canónica del juego (farm.js:136 & weather.js:245):
      // this.outdoors = !/^interior/i.test(doc.id ?? '') && doc.region !== 'interiors' && !fixedSky(doc);
      const doc = rawMapJsonCache.get(mapId);
      const isInterior = /^interior/i.test(mapId) || (doc && /^interior/i.test(doc.id ?? '')) || (doc && doc.region === 'interiors');
      const isFixedSky = (doc && doc.region === 'vip') || mapId === 'vip' || mapId === 'vip_quarter';
      const isOutdoors = !isInterior && !isFixedSky;

      let growthState = null;
      if (seedDef) {
        growthState = computeCropGrowth(c, now, isOutdoors, seedDef);
      }

      if (!growthState) {
        return {
          id: `${normField}_${cellId}`,
          cellId,
          fieldKey: normField,
          seedId: seedDef?.id || String(seedRaw),
          name: seedName,
          icon: seedIcon,
          growMinutes: seedDef?.grow || 15,
          regrowMinutes: seedDef?.regrow || null,
          harvests: seedDef?.harvests || 1,
          stages: seedDef?.stages || 5,
          premium: Boolean(seedDef?.premium),
          stage: 0,
          lastStage: 4,
          plantedAt: c.t || now,
          wateredAt: c.w1 || null,
          readyAt: null,
          needsWater: true,
          needsWaterStage: 'first',
          isRipe: false,
          isWithered: false,
          twoWaterings: false,
          k: c.k || 1,
          statusText: 'Sin datos de cultivo',
          remainingMs: 0,
          type: 'crop'
        };
      }

      const wateredAt = c.w1 || (seedDef?.premium ? c.t : null);
      const plantedAt = c.t || c.planted || c.plantedAt || wateredAt || now;
      const readyAt = growthState.readyAt;
      const remainingMs = readyAt ? Math.max(0, readyAt - now) : 0;

      return {
        id: `${normField}_${cellId}`,
        cellId,
        fieldKey: normField,
        seedId: seedDef?.id || String(seedRaw),
        name: seedName,
        icon: seedIcon,
        growMinutes: seedDef?.grow || 15,
        regrowMinutes: seedDef?.regrow || null,
        harvests: seedDef?.harvests || 1,
        harvestCount: c.h || 0,
        stages: seedDef?.stages || (growthState.last + 1),
        premium: Boolean(seedDef?.premium),
        stage: growthState.stage,
        lastStage: growthState.last,
        plantedAt,
        wateredAt,
        wateredAt2: c.w2 || null,
        readyAt,
        waitAt: growthState.waitAt || null,
        witherAt: (seedDef?.premium || !readyAt) ? null : (readyAt + 5 * 3600e3),
        needsWater: Boolean(growthState.needs),
        needsWaterStage: growthState.needs || null,
        isRipe: Boolean(growthState.ripe),
        isWithered: Boolean(growthState.withered),
        twoWaterings: Boolean(growthState.two),
        outdoors: isOutdoors,
        rained: Boolean(growthState.rained),
        k: c.k || 1,
        statusText: growthState.statusText,
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
          const cr = parseCellToCrop(cell, normF, cellId);
          if (cr) rawList.push(cr);
        });
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
    const e = (window.__bloomshire_live_doc && window.__bloomshire_live_doc.energy) || save.energy;
    let eSig = '0';
    if (e && typeof e === 'object') {
      const rec = e.recovery;
      eSig = `${e.v ?? 0}_${e.at ?? 0}_${rec ? `${rec.rate}_${rec.until}` : 0}_${e.slept ?? 0}`;
    } else if (typeof e === 'number') {
      eSig = String(Math.floor(e));
    }

    const hb = Array.isArray(save.inventory?.hotbar)
      ? save.inventory.hotbar.map(s => s ? `${s.id || s.item}:${s.n || s.qty || 1}` : '').join(',')
      : '';
    const bag = Array.isArray(save.inventory?.bag)
      ? save.inventory.bag.map(s => s ? `${s.id || s.item}:${s.n || s.qty || 1}` : '').join(',')
      : '';

    const ord = Array.isArray(save.orders?.list) ? save.orders.list.length : 0;
    const ordDone = Array.isArray(save.orders?.done) ? save.orders.done.length : 0;

    const farmKeys = Object.keys(save).filter(k => k.startsWith('farm.'));
    const farmSig = farmKeys.map(k => {
      const f = save[k];
      if (!f || typeof f !== 'object') return `${k}:0`;
      const cKeys = Object.keys(f);
      return `${k}:${cKeys.length}:${cKeys.map(c => `${c}:${f[c]?.crop?.s ?? f[c]?.s ?? ''}:${f[c]?.crop?.t ?? f[c]?.t ?? ''}:${f[c]?.crop?.w1 ?? f[c]?.w1 ?? ''}`).join(',')}`;
    }).join(';');

    const potSig = `${save.pot?.dish || ''}:${save.pot?.ready || 0}_${save.craftPot?.item || ''}:${save.craftPot?.ready || 0}_${save.millPot?.item || ''}:${save.millPot?.ready || 0}_${save.dairyPot?.item || ''}:${save.dairyPot?.ready || 0}`;

    const tasksSig = save.daily?.claimed ? 'claimed' : (save.daily?.list ? save.daily.list.map(t => `${t.id}:${t.n || 0}:${t.done ? 1 : 0}`).join(',') : '');

    return `${g}_${sh}_${eSig}_${hb}_${bag}_${ord}_${ordDone}_${farmSig}_${potSig}_${tasksSig}`;
  }

  function dispatchState(rawPayload, force = false) {
    if (!rawPayload || typeof rawPayload !== 'object') return;
    try {
      if (rawPayload.quests && Array.isArray(rawPayload.quests)) {
        cachedQuestCatalog = rawPayload.quests;
      } else if (rawPayload.questConfig && Array.isArray(rawPayload.questConfig)) {
        cachedQuestCatalog = rawPayload.questConfig;
      }

      const save = window.__bloomshire_live_doc || (rawPayload.save && typeof rawPayload.save === 'object' ? rawPayload.save : rawPayload);
      lastKnownSave = save;

      const isValidSave = Boolean(
        save && (
          save.purse ||
          save.inventory ||
          save.skills ||
          (save.energy && typeof save.energy === 'object')
        )
      );
      if (!isValidSave) return;

      const sig = computeSaveSig(save);
      const now = Date.now() + serverTimeOffset;
      if (!force && sig === lastDispatchSig && now - lastDispatchAt < 1000) return;
      lastDispatchSig = sig;
      lastDispatchAt = now;

      // Extracción canónica de Energy estrictamente desde save.energy ({v, at, recovery, slept})
      let liveEnergyOverride = null;
      let liveEnergyObj = null;
      const activeEnergySource = (window.__bloomshire_live_doc && window.__bloomshire_live_doc.energy)
        ? window.__bloomshire_live_doc.energy
        : (save.energy || null);

      if (activeEnergySource && typeof activeEnergySource === 'object') {
        const ev = typeof activeEnergySource.v === 'number' ? activeEnergySource.v : 150;
        const rec = activeEnergySource.recovery || null;
        let calculatedE = ev;
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
        liveEnergyOverride = calculatedE;
        liveEnergyObj = {
          v: ev,
          at: activeEnergySource.at || now,
          recovery: rec,
          slept: activeEnergySource.slept || null
        };
      } else if (typeof activeEnergySource === 'number') {
        liveEnergyOverride = activeEnergySource;
      }

      const isStale = !window.__bloomshire_live_doc;

      window.postMessage({
        type: '__BLOOMSHIRE_RAW_STATE',
        source: 'bloomshire_hook',
        force: Boolean(force),
        stale: isStale,
        payload: {
          ...save,
          stale: isStale,
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
      }, window.location.origin);
    } catch (err) {
      console.warn('[Bloomshire Companion Hook] Error en dispatchState:', err);
    }
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

  function schedulePostCmdRefresh(delay = 130) {
    if (cmdRefreshTimer) clearTimeout(cmdRefreshTimer);
    cmdRefreshTimer = setTimeout(() => {
      const active = window.__bloomshire_live_doc || lastKnownSave;
      if (active) {
        dispatchState(active, true);
      }
    }, delay);
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
    let reqUrl = '';
    try {
      reqUrl = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      if (reqUrl.includes('api/cmd')) {
        // Al ver salir un api/cmd, programar lectura del objeto vivo a los ~100 ms
        setTimeout(() => {
          const live = window.__bloomshire_live_doc;
          if (live) dispatchState(live, false);
        }, 100);
      }
    } catch (e) {}

    const resp = await _origFetch.apply(this, args);
    try {
      const url = reqUrl || (typeof args[0] === 'string' ? args[0] : (args[0]?.url || ''));
      if (url.includes('/api/session') || url.includes('/play/api/door')) {
        resp.clone().json().then(sessData => {
          const acc = sessData?.account || sessData?.player;
          if (acc?.id) {
            cachedWallet = acc.id;
            try { localStorage.setItem('bloomshire_wallet', acc.id); } catch (_) {}
          }
        }).catch(() => {});
      } else if (shouldCaptureLiveDoc(url)) {
        resp.clone().json().then(data => {
          updateServerTimeOffset(resp, data);
          if (data && data.save) {
            const prev = window.__bloomshire_live_doc;
            const next = captureLiveDoc(prev, data, url, (newRef, u) => {
              console.log(`[Hook] referencia viva fijada desde ${u}`);
            });
            if (next && next !== prev) {
              window.__bloomshire_live_doc = next;
              window.__bloomshire_master_save = next;
              lastKnownSave = next;
              dispatchState(next, true);
            }
          }
        }).catch(() => {});
      } else if (url.includes('api/cmd') || url.includes('api/trade') || url.includes('api/crypto')) {
        // Al volver la respuesta (100–150 ms después, para que el #adopt del juego termine)
        resp.clone().json().then(data => {
          updateServerTimeOffset(resp, data);
        }).catch(() => {});
        setTimeout(() => {
          const live = window.__bloomshire_live_doc;
          if (live) dispatchState(live, true);
        }, 130);
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
        const m = /api\/maps\/([a-zA-Z0-9_-]+)/.exec(url);
        const mapId = m ? decodeURIComponent(m[1]) : null;
        if (mapId && ATLAS_MAP_IDS.has(mapId)) {
          resp.clone().json().then(mapJson => {
            if (mapJson && mapJson.layers) {
              rawMapJsonCache.set(mapId, mapJson);
              setTimeout(() => renderMapJsonToWebP(mapId, mapJson), 800);
            }
          }).catch(() => {});
        }
      }
    } catch (e) {}
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
    const url = this._reqUrl || '';
    if (url.includes('api/cmd')) {
      setTimeout(() => {
        const live = window.__bloomshire_live_doc;
        if (live) dispatchState(live, false);
      }, 100);
    }

    this.addEventListener('load', () => {
      try {
        const reqUrl = this._reqUrl || '';
        if (shouldCaptureLiveDoc(reqUrl)) {
          const data = JSON.parse(this.responseText);
          updateServerTimeOffset(null, data);
          if (data && data.save) {
            const prev = window.__bloomshire_live_doc;
            const next = captureLiveDoc(prev, data, reqUrl, (newRef, u) => {
              console.log(`[Hook] referencia viva fijada desde ${u}`);
            });
            if (next && next !== prev) {
              window.__bloomshire_live_doc = next;
              window.__bloomshire_master_save = next;
              lastKnownSave = next;
              dispatchState(next, true);
            }
          }
        } else if (reqUrl.includes('api/cmd') || reqUrl.includes('api/trade') || reqUrl.includes('api/crypto')) {
          setTimeout(() => {
            const live = window.__bloomshire_live_doc;
            if (live) dispatchState(live, true);
          }, 130);
        }
      } catch (e) {}
    });
    return _origXhrSend.apply(this, arguments);
  };

  // 3. Interceptores pasivos de Storage (100% de solo lectura, sin modificar save)
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
        schedulePostCmdRefresh(100);
      }
    } catch (e) {}
    return _origSetItem.apply(this, arguments);
  };

  const _origRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (key) {
    try {
      if (typeof key === 'string') {
        schedulePostCmdRefresh(100);
      }
    } catch (e) {}
    return _origRemoveItem.apply(this, arguments);
  };

  // Sincronizador automático de respaldo cada 1 segundo (100% pasivo)
  setInterval(() => {
    try {
      const active = window.__bloomshire_live_doc || lastKnownSave;
      if (active) {
        dispatchState(active, false);
      }
    } catch (_) {}
  }, 1000);

  // Sincronización manual instantánea (botón "Sincronizar" en MoniOS o en popup de extensión)
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'FORCE_BLOOMSHIRE_SCAN') {
      console.log('[Bloomshire Companion Hook] Sincronización manual 100% pasiva solicitada');
      const active = window.__bloomshire_live_doc || lastKnownSave;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    shouldCaptureLiveDoc,
    captureLiveDoc
  };
}
if (typeof globalThis !== 'undefined') {
  globalThis.shouldCaptureLiveDoc = shouldCaptureLiveDoc;
  globalThis.captureLiveDoc = captureLiveDoc;
}
