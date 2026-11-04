/**
 * api/bloomshire-advisor.js
 * Asesor Estratégico Cuantitativo con IA para Bloomshire (Robinhood Chain).
 * Integra la biblia matemática del juego extraída de rules.js, catalog.js, orders.js
 * y los modelos Gemini 3.6/1.5 Flash con fallback algorítmico offline.
 */

import { jwtVerify } from 'jose';

import canonicalRules from '../src/data/rules.json' with { type: 'json' };

function getCanonicalRulesSummary() {
  const r = canonicalRules;
  const sleepTiers = r.energy?.sleep?.dailyEnergyTiers;
  const ffTiers = r.foundingFarmers?.tiersByCount;
  return `
========================
REGLAS CANÓNICAS VIGENTES (Build ${r.metadata?.buildHash} | Rules ${r.metadata?.rulesHash}):
========================
• Fórmula Oficial de XP: ${r.levelProgression?.formula || '100 * (level - 1)^2.7'}
• Escala de Sueño Diario: Normal ${sleepTiers?.normal || 200}⚡ (2x100), VIP/Holder ${sleepTiers?.vipOrHolder || 450}⚡ (3x150), 10 Farmers ${sleepTiers?.holders10 || 600}⚡ (4x150), 20 Farmers ${sleepTiers?.holders20 || 750}⚡ (5x150).
• Límite Diario de Comida: 1 barra completa (${r.energy?.maxBase || 100}⚡ común / ${r.energy?.maxFounding || 150}⚡ VIP/Holder).
• Moonlight Stew: da +${r.energy?.food?.moonlightStewEnergy || 8}⚡ y cuenta para la barra diaria de comida como todo plato.
• Tablón de Pedidos de Odette: ${r.orders?.slotsFormula || '6 + Math.floor(level/3)'} pedidos simultáneos con reposición continua inmediata. Pagan 50% del valor de tienda en Gold (ORDERS.premium = ${r.orders?.premium || 0.5}). Pedidos de cultivos dan 50% de XP (cropXp = ${r.orders?.cropXpRatio || 0.5}); demás pedidos dan 1 XP por cada 40 Gold.
• Market Hall (Rowan): Mercado P2P con 2.5% de comisión, sin tope rígido de ofertas.
• Founding Farmers: 7 FF (-20% tiempo cultivos), 10 FF (${ffTiers?.[10]?.dailySleepEnergy || 600}⚡ sueño, VIP Quarter permanente), 15 FF (-30% tiempo), 20 FF (${ffTiers?.[20]?.dailySleepEnergy || 750}⚡ sueño).
`;
}


export async function getAuthenticatedWallet(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length < 32) {
    // Si SESSION_SECRET no está configurada en Vercel, no se autentica ninguna sesión por seguridad
    return null;
  }

  try {
    const secretKey = new TextEncoder().encode(secret.trim());
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: 'bloomshire-tool',
      audience: 'bloomshire-tool'
    });
    return payload?.wallet ? payload.wallet.toLowerCase() : null;
  } catch (_) {
    return null;
  }
}

const BLOOMSHIRE_MATH_SYSTEM_PROMPT = `
Eres "Bloomshire Advisor", el copiloto y estratega cuantitativo del jugador en el juego "Bloomshire" en Robinhood Chain.
Hablas con tono natural, cercano, lúcido y humano (como un compañero de cooperativo experto, programador y gamer de alto nivel). NO hables como un robot ni como un burócrata rígido.

========================
DIRECTRICES DE CONVERSACIÓN:
========================
1. 🗣️ CONVERSACIÓN NATURAL Y HUMANA:
   • Si el usuario te saluda ("hola", "buenas", "hola bro", "¿cómo estás?"), salúdalo con calidez y naturalidad: ej. "¡Hola! ¿Cómo estás? ¿Cómo va todo hoy por Bloomshire? ¿Qué necesitas consultar o planificar?".
   • NUNCA le dispares un informe ejecutivo gigantesco con cálculos no pedidos ante un simple saludo. Habla con él de tú a tú.
2. 🎯 PRECISIÓN Y CERTEZA TOTAL ANTE CONSULTAS:
   • Cuando el usuario te pregunte algo específico (estrategia, precios, dónde vender, cultivos, cuevas, energía, tablón de Odette, NPCs, misiones, Moonmere, el lobo de Otto, etc.), responde de forma directa, certera y con conocimiento absoluto del juego y de su partida.
   • Usa los datos en tiempo real de su sesión (su Nivel actual de Farming, sus Founding Farmers en posesión, su Oro, su Energía exacta, sus Misiones activas y sus Pedidos de Odette). Si no hay datos vinculados, indícaselo amablemente.
3. 🚫 CERO LATEX: Prohibido usar LaTeX ($$, \\text, etc.). Escribe siempre en texto plano legible.
4. 🚫 ESTRICTA ADAPTACIÓN AL NIVEL ACTUAL DEL JUGADOR:
   • Adapta tus recomendaciones de cultivo estrictamente al Nivel actual de Farming reportado en el ESTADO EN TIEMPO REAL DEL JUGADOR (ej. si es Nivel 5 tiene desbloqueados Zanahoria L1, Chirivía L1, Cebollín L2, Trigo L2, Papa L3, Repollo L3, Cebolla L4, Caléndula/Marigold L5, Brócoli L5 y Arroz/Rice L5).
   • PROHIBIDO hablar de sembrar Blueberry (L12) o Strawberry (L11) si el jugador aún no tiene ese nivel.
5. 🛑 CONOCIMIENTO TOTAL Y VERÍDICO (INCLUYENDO MOONMERE Y EL LOBO DE OTTO):
   • Para ahuyentar al lobo gris en "La Ronda de Otto" (Cap. 10, bk10): cruzar el puente oeste hacia Whisperwood, equipar la Espada Oxidada en la barra rápida (1-9) y acercarse al lobo junto a las ovejas o golpearlo 3 veces con Espacio/Clic.
   • Expansión "Book One, Part Four: Moonmere": añade 7 capítulos nuevos en el lago norte (Marven, 12 piedras lunares, aldea de la laguna, Nixie, criatura gris profunda, Santuario de la Hada Lunar y festival). Se desbloquea automáticamente al terminar el Capítulo 17 ("Home Changed", bk17) caminando al noreste del lago Moonmere ("Marven's Pool").

========================
ENCICLOPEDIA OFICIAL DEL JUEGO (Código y Documentación):
========================
0. REGLA CANÓNICA DE NOCHE, LLUVIA Y HORARIOS DE NPCs:
   • De noche (20:00 a 07:00 reloj del juego) y cuando LLUEVE, TODOS los aldeanos se meten dentro de sus casas a dormir (excepto Marlow y las sirenas). Si buscas a Hollis, Greta, Cole, etc. a las 02:00 AM o bajo lluvia, NO estarán en la calle ni corrales; debes esperar a las 07:00 AM o abrir su puerta.
   • Greta: Maestra de escuela en la Escuela (Schoolhouse) al noreste del pueblo, enseña de 07:00 a 18:00.
   • Hollis & Cole: Ganaderos en el Paddock & Corrales (al este del pueblo, a la derecha del banco).
   • Pell: Carpintero al noreste. Compra madera (29g c/u) y piedra (14g c/u).
   • Odette: Tienda General. Compra cualquier cosa a precio oficial. En el Tablón de Pedidos ofrece órdenes dinámicas (6 base + 1 cada 3 niveles de Farming, hasta 16 a nivel 30) que se reponen al instante. Los pedidos pagan el 50% del valor de venta en Gold (ORDERS.premium = 0.5); los pedidos de cultivos dan +50% de XP de cosecha, y los demás dan 1 XP por cada 40 Gold.
   • 67 Personajes: El engine contiene 67 NPCs en Moonmere, Whisperwood, Stonepeak y Home Island.
   • Anuncio oficial de Syd: 40M AVS quemados. Semana de depósito 30 Oct - 6 Nov a ratio fijo 2 AVS = 1 $AVYN en TGE.
   • Regla de los 3 niveles: Ninguna habilidad puede superar a la más baja por más de 3 niveles.

1. DINÁMICA DE CULTIVOS (Tiempos, Precios y Re-cosechas):
   • Carrot: 2 min | Venta: 40g | Semilla: 20g | Ganancia: +20g | XP: 4 | Inicial
   • Parsnip: 5 min | Venta: 73g | Semilla: 36g | Ganancia: +37g | XP: 7 | Inicial
   • Spring Onion: 6 min | Venta: 89g | Semilla: 45g | Ganancia: +44g | XP: 8 | Nivel 2
   • Wheat: 15 min | Venta: 185g | Semilla: 90g | Ganancia: +95g | XP: 14 | Nivel 2
   • Potato: 8 min | Venta: 105g | Semilla: 55g | Ganancia: +50g | XP: 9 | Nivel 3
   • Cabbage: 20 min | Venta: 240g | Semilla: 120g | Ganancia: +120g | XP: 17 | Nivel 3
   • Onion: 12 min | Venta: 150g | Semilla: 75g | Ganancia: +75g | XP: 12 | Nivel 4
   • Marigold: 20 min | Venta: 240g | Semilla: 120g | Ganancia: +120g | XP: 17 | Nivel 5 (Apothecary)
   • Broccoli / Rice: 30 min | Venta: 355g | Semilla: 175g | Ganancia: +180g | XP: 23 | Nivel 5
   • Sunflower: 35 min | Venta: 420g | Semilla: 210g | Ganancia: +210g | XP: 25 | Nivel 6
   • Corn: 40 min (Regrow: 30 min, 5 cosechas) | Venta: 490g | Semilla: 610g | Nivel 6
   • Cucumber: 40 min (Regrow: 30 min, 5 cosechas) | Venta: 490g | Semilla: 610g | Nivel 7
   • Tomato: 45 min (Regrow: 35 min, 5 cosechas) | Venta: 545g | Semilla: 680g | Nivel 7
   • Adzuki Bean: 45 min (Regrow: 35 min, 5 cosechas) | Venta: 545g | Semilla: 680g | Nivel 8
   • Green Beans / Blackberry: 50 min (Regrow: 40 min, 5 cosechas) | Venta: 605g | Nivel 8-9
   • Eggplant / Bell Peppers (Hot, Green, Red, Yellow): 1h (Regrow: 45 min, 5 cosechas) | Venta: 740g | Nivel 9-10
   • Strawberry: 1h 20 min (Regrow: 1h, 5 cosechas) | Venta: 990g | Nivel 11
   • Blueberry: 1h 30 min (Regrow: 1h, 5 cosechas) | Venta: 1.150g | Nivel 12
   • Grapes: 2h 30 min (Regrow: 1h 30 min, 5 cosechas) | Venta: 1.950g | Nivel 16
   • Star Fruit: 5h | Venta: 4.150g | Semilla: 2.075g | Nivel 10 (Historia) - Clave para Moonlight Stew.
   • Los cultivos que tienen re-cosecha (regrow) rinden EXACTAMENTE 5 cosechas por semilla.
   • Sembrar y cosechar cuestan 1 de energía. Arar y regar son 100% GRATIS. Cultivos de más de 1 hora requieren un segundo riego antes de madurar.

2. ENERGÍA, SALUD Y DESCANSO:
   • Energía base: 100 (150 para VIP y Founding Farmers).
   • Recuperación en cama (Sueño diario): 200⚡ al día para jugadores normales (2 barras de 100). Para VIP y Founding Farmers: 3 barras de 150 (450⚡ diaria) base, 4 barras de 150 (600⚡) con 10 farmers o 1 Mythic, 5 barras de 150 (750⚡) con 20 farmers.
   • Comida ordinaria: tope diario de 1 barra completa (100⚡ para normal, 150⚡ para VIP/Holder) por día UTC (FOOD_BARS_A_DAY = 1).
   • Salud base: 100. La cama cura al 100% en cualquier momento. La comida cocida cura el doble de la energía que da.

3. COCINA Y EL SECRETO DEL MOONLIGHT STEW:
   • Se cocina gratis en la cabaña o en la Panadería. Los platos cocinados NO se venden a NPCs ni tiendas comunes (Odette/Hazel/Pell solo compran materias primas), únicamente se venden a otros jugadores en el Market Hall (Rowan) o se consumen para recargar energía y curarse.
   • Parsnip Soup (Sopa de Chirivía): 2x Parsnip (+2 Energía).
   • Vegetable Plate: 1 Carrot + 1 Potato (+2 Energía).
   • Garden Salad: 1 Cabbage + 1 Tomato (+3 Energía).
   • Bread: 2 Wheat (+4 Energía).
   • Fried Fish: 1 Carp (+5 Energía).
   • Hearty Stew: 1 Pike Fish + 1 Potato + 1 Onion (+22 Energía).
   • Golden Pie / Diamond Tart: Platos premium VIP con buffs (+40 Vida, +50 Energía, velocidad/resistencia). Solo se venden en Market Hall o se comen antes de bajar a The Dungeon.
   • **Moonlight Stew:** 1x Ghost Catfish + 1x Star Fruit + 2x Silvercap Mushroom. Da **+8 de Energía** (MOONLIGHT_ENERGY = 8 en rules.js) y cuenta para la barra diaria de comida como cualquier otro plato.

4. MINERÍA, HERRAMIENTAS Y DURABILIDAD:
   • Herramientas infinitas: Azadón (hoe), Regadera (watering can), Hoz (sickle), Pala (shovel) y Armas nunca se rompen ni gastan energía para usarse.
   • Herramientas con desgaste: Hacha, Pico y Caña de pescar gastan 1 uso por golpe/tiro.
   • Niveles de metal:
     - Hierro: 300 usos, 2.500 Gold (Bram/Wren).
     - Bronce: 1.000 usos, 5.000 Gold.
     - Oro: 4.000 usos, 35.000 Gold.
     - Amatista: 10.000 usos, 120.000 Gold.
   • Los picos superiores rompen menas más duras. La mena rota vuelve a crecer.

5. LAS 8 CUEVAS Y COMBATE:
   • Glimmer Hollow (Whisperwood, 1 nivel): Spiders de cristal, slimes de cristal.
   • Grotto under Mirror Pond (Whisperwood, 1 nivel, Historia): Pale spiders.
   • The Old Cave (Moonmere, 1 nivel, requiere pico de bronce): Drowned spiders (veneno).
   • The Old Working (Stonepeak, 2 niveles): Pit y tunnel spiders, cave slimes.
   • Topaz Drift (Stonepeak, 1 nivel): Topaz spiders.
   • The Green Vein (Stonepeak, 1 nivel, Historia): Venom spiders (veneno).
   • The Gloom (Stonepeak, 3 niveles, Historia): Ember/cinder spiders, lava slimes, Jefe: Bone Spider.
   • The Sunken Vault (Stonepeak, 2 niveles, Historia): Gilded spiders, Jefe: Vault Queen.
   • En combate, cada 3 golpes acertados gastan 1 de energía.

6. ECONOMÍA (Gold, Shards, $AVYN) Y MERCADO:
   • Gold: Moneda diaria para semillas y herramientas. Cofres extra cuestan 150.000 Gold en el Market Hall.
   • Lucky Shards (Token AVS): Máximo 30 por día (reset 00:00 UTC).
     - Cosecha de cultivo raro (Nivel 10+): 1 en 8 (12.5%).
     - Pesca: 1 en 20 (5%).
     - Minería/Tala/Forraje: 1 en 25 (4%).
     - Quests: +10 Shards por capítulo de Founding Farmers.
   • $AVYN: Moneda exclusiva para intercambios P2P cara a cara y en el Exchange (ningún NPC la acepta).
   • Market Hall (Rowan): Mercado P2P donde los jugadores intercambian cosechas, platos y recursos con otros jugadores por Gold o $AVYN. Comisión del 2.5% para el vendedor. NO tiene tope rígido de 8 ofertas.
   • Órdenes de Odette (General Store): Tablón de pedidos dinámico (6 base + 1 cada 3 niveles de Farming, hasta 16 a nivel 30). Las órdenes completadas se reponen de inmediato (no se agotan). Pagan el 50% del valor de venta en Gold (ORDERS.premium = 0.5); pedidos de cultivos dan 50% de XP, y los demás dan 1 XP por cada 40 Gold.

7. FOUNDING FARMERS (2.222 NFTs en Robinhood Chain):
   • 1 Farmer: Acceso Season 0, 150 Energía máxima, sueño diario de 450⚡ (3 barras de 150), boost de XP (+5% a +15%).
   • 2 Farmers: 4 sets cosméticos estacionales.
   • 3 Farmers: **Mascota (PET)** que encuentra forraje, ilumina cuevas y da **+5 slots de carga** (clave por el tope de 10 ítems).
   • 5 Farmers: Monturas.
   • 7 Farmers: **-20% de tiempo en TODOS los cultivos** y +5 slots más en mochila.
   • 10 Farmers: **600⚡ de sueño diario (4 barras de 150)**, área VIP permanente sin pase mensual, medalla Elite y muro en Founders Hall. (Un Mythic cuenta como 10).
   • 15 Farmers: **-30% de tiempo en TODOS los cultivos** (perks.fast = 0.70).
   • 20 Farmers: **750⚡ de sueño diario (5 barras de 150)**.
`;

const ROBINHOOD_RPCS = [
  'https://4663.rpc.thirdweb.com',
  'https://rpc-robinhood.globalstake.io',
  'https://robinhood-rpc.publicnode.com',
  'https://rpc.mainnet.chain.robinhood.com'
];
const FOUNDING_FARMERS_CONTRACT = '0xC53870Cf1381f2848dFfFD2Fd4FfB585bD1b0e9c';

// Caché en memoria por wallet para entornos Serverless en Vercel
const memorySnapshotsByWallet = {};

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vbefuztmqqymlotdhjvh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

async function pushSnapshotToSupabase(wallet, snap) {
  if (!wallet || !snap || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/player_sessions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        wallet: wallet.toLowerCase(),
        gold: snap.gold ?? 0,
        shards: snap.shards ?? 0,
        avyn: snap.avyn ?? 0,
        current_energy: snap.currentEnergy ?? 150,
        max_energy: snap.maxEnergy ?? 150,
        farming_level: snap.farmingLevel ?? 1,
        inventory: snap.inventory ?? [],
        active_orders: snap.activeOrders ?? [],
        active_crops: snap.activeCrops ?? [],
        daily_tasks: snap.dailyTasks ?? [],
        active_quests_list: snap.activeQuestsList ?? [],
        skills: snap.skills ?? {},
        skills_breakdown: snap.skillsBreakdown ?? {},
        raw_energy_obj: snap.rawEnergyObj ?? null,
        updated_at: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function getSnapshotFromSupabase(wallet) {
  if (!wallet || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/player_sessions?wallet=eq.${encodeURIComponent(wallet.toLowerCase())}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0];
        return {
          wallet: r.wallet,
          gold: Number(r.gold) || 0,
          shards: r.shards || 0,
          avyn: Number(r.avyn) || 0,
          currentEnergy: r.current_energy,
          maxEnergy: r.max_energy,
          farmingLevel: r.farming_level,
          inventory: r.inventory || [],
          activeOrders: r.active_orders || [],
          activeCrops: r.active_crops || [],
          dailyTasks: r.daily_tasks || [],
          activeQuestsList: r.active_quests_list || [],
          skills: r.skills || {},
          skillsBreakdown: r.skills_breakdown || {},
          rawEnergyObj: r.raw_energy_obj,
          timestamp: new Date(r.updated_at).getTime()
        };
      }
    }
  } catch (_) {}
  return null;
}

const WALLET_REGEX = /^0x[0-9a-fA-F]{40}$/;

async function handleSync(req, res) {
  // Push Snapshot from MoniOS / Bloomshire Companion Extension
  if (req.method === 'POST' && (req.query?.action === 'push_snapshot' || req.body?.action === 'push_snapshot' || req.body?.snapshot)) {
    const snap = req.body?.snapshot || req.body;
    const snapWallet = (snap?.wallet || req.body?.wallet || req.query?.wallet || '').trim();
    
    if (!snapWallet || !WALLET_REGEX.test(snapWallet)) {
      return res.status(400).json({ ok: false, error: 'Wallet inválida o faltante. Formato esperado: 0x seguido de 40 caracteres hex.', timestamp: Date.now() });
    }

    const targetWallet = snapWallet.toLowerCase();

    // Verificación criptográfica de firma
    const authedWallet = await getAuthenticatedWallet(req);
    if (!authedWallet) {
      return res.status(401).json({
        ok: false,
        error: 'No autorizado. Se requiere firma criptográfica de wallet para guardar partidas en la nube.',
        requiresAuth: true
      });
    }

    if (authedWallet !== targetWallet) {
      return res.status(403).json({
        ok: false,
        error: `Prohibido. No puedes modificar la partida de otra wallet (${targetWallet.slice(0, 6)}...).`
      });
    }

    snap.wallet = targetWallet;
    memorySnapshotsByWallet[targetWallet] = snap;
    
    await pushSnapshotToSupabase(targetWallet, snap);
    return res.status(200).json({ ok: true, message: 'Snapshot autenticado y guardado con éxito en la nube', wallet: targetWallet, timestamp: Date.now() });
  }

  const rawWallet = (req.query?.wallet || req.body?.wallet || '').trim();

  // MODO PÚBLICO: Si no hay wallet, responder como guía comunitaria libre sin filtrar datos privados
  if (!rawWallet) {
    return res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      isPublicGuide: true,
      onChain: null,
      inGame: null,
      message: 'Modo Guía Comunitaria: Sin wallet ni companion conectado.'
    });
  }

  if (!WALLET_REGEX.test(rawWallet)) {
    return res.status(400).json({ ok: false, error: 'Formato de wallet inválido. Formato esperado: 0x seguido de 40 caracteres hex.' });
  }

  const wallet = rawWallet;
  const targetWalletLower = wallet.toLowerCase();

  let onChainData = {
    wallet: wallet,
    farmersCount: 0,
    ethBalance: 0,
    hasSpeedBonus: false,
    hasPet: false,
    maxEnergy: 100,
    chainConnected: false,
    blockNumber: null
  };

  let inGameData = {
    serverOnline: false,
    signedIn: false,
    farmingLevel: 1,
    currentEnergy: 100,
    gold: 0,
    shards: 0,
    luckyShardsToday: 0,
    activeOrders: [],
    inventory: [],
    skills: {},
    details: 'Esperando conexión con el servidor del juego'
  };

  // Prioridad de persistencia: memoria viva -> Supabase (Nube)
  let effectiveSnap = memorySnapshotsByWallet[targetWalletLower] || null;

  if (!effectiveSnap) {
    try {
      const supaSnap = await getSnapshotFromSupabase(targetWalletLower);
      if (supaSnap) {
        effectiveSnap = supaSnap;
        memorySnapshotsByWallet[targetWalletLower] = supaSnap;
      }
    } catch (_) {}
  }

  if (effectiveSnap) {
    inGameData = { ...inGameData, ...effectiveSnap, signedIn: true, serverOnline: true, details: 'Sincronizado vía Companion' };
  }

  try {
    if (wallet && wallet.startsWith('0x')) {
      const clean = wallet.replace('0x', '').toLowerCase().padStart(64, '0');
      const balanceOfData = '0x70a08231' + clean;

      if (wallet.length === 42) {
        const rpcPayload = [
          { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] },
          { jsonrpc: '2.0', id: 2, method: 'eth_call', params: [{ to: FOUNDING_FARMERS_CONTRACT, data: balanceOfData }, 'latest'] },
          { jsonrpc: '2.0', id: 3, method: 'eth_getBalance', params: [wallet, 'latest'] }
        ];

        for (const rpcUrl of ROBINHOOD_RPCS) {
          try {
            const rpcRes = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rpcPayload),
              signal: AbortSignal.timeout(3000)
            });

            if (rpcRes.ok) {
              const batchResults = await rpcRes.json();
              if (Array.isArray(batchResults)) {
                const blockHex = batchResults.find(r => r.id === 1)?.result;
                const balanceHex = batchResults.find(r => r.id === 2)?.result;
                const ethHex = batchResults.find(r => r.id === 3)?.result;

                if (blockHex) {
                  onChainData.chainConnected = true;
                  onChainData.blockNumber = parseInt(blockHex, 16);
                }

                if (balanceHex && balanceHex !== '0x' && !balanceHex.error) {
                  const count = Number(BigInt(balanceHex));
                  if (count > 0) {
                    onChainData.farmersCount = count;
                    onChainData.hasSpeedBonus = count >= 7;
                    onChainData.hasPet = count >= 3;
                    onChainData.maxEnergy = count >= 1 ? 150 : 100;
                  }
                }

                if (ethHex && ethHex !== '0x' && !ethHex.error) {
                  onChainData.ethBalance = Number(BigInt(ethHex)) / 1e18;
                }
                break; // Success!
              }
            }
          } catch (err) {
            // Silencioso
          }
        }
      }
    }

    try {
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'MoniOS-Bloomshire-Bridge/1.0'
      };
      if (sessionCookie) headers['Cookie'] = sessionCookie;

      const gameRes = await fetch('https://bloomshire.xyz/play/api/state', {
        headers,
        cache: 'no-store'
      });

      if (gameRes.status === 401) {
        inGameData.serverOnline = true;
        inGameData.signedIn = false;
        inGameData.details = 'Servidor activo. Inicia sesión en bloomshire.xyz/play para sincronizar inventario';
      } else if (gameRes.ok) {
        const gameData = await gameRes.json();
        inGameData.serverOnline = true;
        inGameData.signedIn = true;
        inGameData.details = 'Sincronizado en tiempo real';

        const save = gameData?.save || {};
        if (save.purse) {
          inGameData.gold = save.purse.gold ?? 0;
          inGameData.shards = save.purse.shards ?? 0;
        }

        if (save.skills?.farming?.level) {
          inGameData.farmingLevel = save.skills.farming.level;
        } else if (typeof save.level === 'number') {
          inGameData.farmingLevel = save.level;
        }

        if (save.energy?.v !== undefined) {
          inGameData.currentEnergy = save.energy.v;
        }

        if (save.stats?.luckyShardsToday !== undefined) {
          inGameData.luckyShardsToday = save.stats.luckyShardsToday;
        }

        if (save.orders?.list) {
          inGameData.activeOrders = save.orders.list;
        }
      }
    } catch (err) {
      inGameData.details = 'Servidor temporalmente no accesible';
    }

    // Comprobación de propiedad autenticada para lectura de partida in-game privada
    const authedWallet = await getAuthenticatedWallet(req);
    const isOwner = Boolean(authedWallet && authedWallet === targetWalletLower);

    return res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      authenticated: isOwner,
      onChain: onChainData,
      inGame: isOwner ? inGameData : null,
      message: isOwner ? 'Sincronización autenticada con éxito' : 'Modo lectura pública. Para sincronizar tu oro, inventario y pedidos privados, firma con tu wallet.'
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// Rate limiting en memoria para el endpoint de IA: máx 15 requests por minuto por IP
const aiRateLimits = new Map();
function isAiRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 15;
  const timestamps = (aiRateLimits.get(ip) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return true;
  }
  timestamps.push(now);
  aiRateLimits.set(ip, timestamps);
  return false;
}

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = new Set([
    'https://bloomshire-tool.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ]);
  const reqOrigin = (req.headers.origin || '').trim();
  if (ALLOWED_ORIGINS.has(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://bloomshire-tool.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle Sync route (action=sync or GET/POST with wallet and no prompt/message)
  const hasPrompt = !!(req.body?.prompt || req.body?.message);
  const isSync = !hasPrompt && (req.query?.action === 'sync' || req.body?.action === 'sync' || req.body?.action === 'push_snapshot' || (req.method === 'GET' && req.query?.wallet !== undefined) || (req.method === 'POST' && req.body?.wallet !== undefined));
  if (isSync) {
    return await handleSync(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isAiRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Límite de consultas de IA alcanzado (máximo 15 por minuto). Espera unos instantes antes de volver a consultar.' });
  }

  const prompt = (req.body?.prompt || req.body?.message || '').trim();
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt or message is required' });
  }
  if (prompt.length > 2000) {
    return res.status(400).json({ error: 'Prompt too long (max 2000 characters)' });
  }

  const rawConv = req.body?.conversation;
  const conversation = Array.isArray(rawConv)
    ? rawConv
        .filter(m => m && typeof m.content === 'string')
        .slice(-10)
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content.slice(0, 2000)
        }))
    : [];

  const playerSnapshot = req.body?.playerSnapshot || {};
  const marketContext = req.body?.marketContext || {};
  const imageBase64 = req.body?.imageBase64 || null;

  const farmingLvl = Math.max(1, Math.min(30, playerSnapshot.farmingLevel || 5));
  const farmersCount = playerSnapshot.farmersCount ?? playerSnapshot.farmersOwned ?? 10;
  const currentEnergy = Math.round(playerSnapshot.energy ?? 115);
  const maxEnergy = playerSnapshot.maxEnergy || (farmersCount >= 1 ? 150 : 100);
  const gold = playerSnapshot.gold ?? 0;
  const shards = playerSnapshot.shards ?? 0;
  const avyn = playerSnapshot.avyn ?? 0;

  // Generar contexto dinámico del jugador
  const playerName = playerSnapshot.playerName || playerSnapshot.name || 'Farmer';
  let contextDescription = '\n================ ESTADO EN TIEMPO REAL DEL JUGADOR ================\n';
  contextDescription += `Nombre del jugador: ${playerName}\n`;
  contextDescription += `Nivel Actual de Farming: Nivel ${farmingLvl}\n`;
  contextDescription += `Energía Actual: ${currentEnergy} / ${maxEnergy}⚡\n`;
  contextDescription += `Gold en Cartera: ${gold.toLocaleString('es-ES')} Gold\n`;
  contextDescription += `Averyn Shards (AVS): ${shards} Shards\n`;
  contextDescription += `$AVYN: ${avyn} $AVYN\n`;
  contextDescription += `Founding Farmers en posesión: ${farmersCount} NFTs\n`;
  contextDescription += `Misión Principal Activa: ${playerSnapshot.activeQuest || 'Ninguna activa'}\n`;

  if (playerSnapshot.moonmereProgress) {
    const mp = playerSnapshot.moonmereProgress;
    contextDescription += `Progreso hacia Moonmere (Cap. 17 Home Changed): ${mp.completedChapters || 11}/${mp.totalChaptersRequired || 17} capítulos completados (${mp.moonmereUnlocked ? 'Moonmere DESBLOQUEADO' : 'En progreso'})\n`;
  }

  if (playerSnapshot.skillsMeta) {
    const sm = playerSnapshot.skillsMeta;
    contextDescription += `Regla de los 3 Niveles: Habilidad más baja = ${sm.minSkillName} (Nv ${sm.minSkillLevel}) -> Nivel máximo permitido = Nv ${sm.maxAllowedLevel} (${sm.isFarmingCapped ? 'Farming en TOPE, necesita subir ' + sm.minSkillName : 'Con margen'})\n`;
  }

  if (Array.isArray(playerSnapshot.activeQuestsList) && playerSnapshot.activeQuestsList.length > 0) {
    contextDescription += `\n--- Misiones Activas del Jugador ---\n`;
    playerSnapshot.activeQuestsList.forEach(q => {
      contextDescription += `• [${q.id}] ${q.title}: ${q.stepText} (Dónde: ${q.where || 'Bloomshire'})\n`;
    });
  }

  if (Array.isArray(playerSnapshot.activePlots) && playerSnapshot.activePlots.length > 0) {
    contextDescription += `\n--- Parcelas Sembradas (${playerSnapshot.activePlots.length} parcelas) ---\n`;
    playerSnapshot.activePlots.forEach((plot, i) => {
      contextDescription += `Parcela ${i + 1}: ${plot.crop} | Estado: ${plot.status} | Tiempo restante: ${plot.remainingMinutes} min | Cosechas restantes: ${plot.harvestsLeft || 1}/5\n`;
    });
  }

  const rawOrders = playerSnapshot.activeOrders || marketContext.odetteOrders || [];
  if (Array.isArray(rawOrders) && rawOrders.length > 0) {
    contextDescription += `\n--- Tablón de Pedidos Diarios de Odette (Órdenes continuas: 50% Oro y 50% XP) ---\n`;
    rawOrders.forEach((o, i) => {
      const it = o.item || o.name || 'Cultivo';
      const n = o.n || o.amount || 1;
      const g = o.gold || o.payoutGold || 0;
      const xp = o.xp || o.xpReward || 0;
      const st = o.done ? 'COMPLETADA' : 'PENDIENTE';
      contextDescription += `• Pedido ${i + 1}: ${n}x ${it} -> Paga: ${g} Gold y +${xp} XP [${st}]\n`;
    });
  }
  contextDescription += '===================================================================\n';

  const dynamicRules = getCanonicalRulesSummary();
  const fullSystemInstruction = `${BLOOMSHIRE_MATH_SYSTEM_PROMPT}\n${dynamicRules}\n${contextDescription}`;

  // API Key Check (usa env de Vercel)
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    const pausedNotice = '🤖 **Copilot IA: En Pausa Temporal (Próximamente)**\\n\\nEl servicio de inteligencia artificial está actualmente en pausa y no configurado. Se activará próximamente una vez finalizada la fase de pruebas y balance del sistema.';
    return res.status(200).json({
      ok: true,
      text: pausedNotice,
      reply: pausedNotice,
      advice: pausedNotice,
      analysis: pausedNotice,
      model: 'maintenance-paused'
    });
  }

  const modelCandidates = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  const formattedContents = [];

  conversation.forEach(msg => {
    formattedContents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  });

  formattedContents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  let lastError = null;

  for (const model of modelCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const payload = {
        contents: formattedContents,
        systemInstruction: {
          parts: [{ text: fullSystemInstruction }]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      };

      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.warn(`[Bloomshire Advisor] Model ${model} returned error ${geminiRes.status}: ${errText.slice(0, 150)}`);
        lastError = new Error(`Gemini API Error (${geminiRes.status}): ${errText}`);
        continue;
      }

      const geminiData = await geminiRes.json();
      const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        const clean = cleanLatex(generatedText.trim());
        return res.status(200).json({
          ok: true,
          text: clean,
          reply: clean,
          advice: clean,
          analysis: clean,
          model: model
        });
      }
    } catch (err) {
      console.warn(`[Bloomshire Advisor] Failed calling ${model}:`, err.message);
      lastError = err;
    }
  }

  // Fallback
  console.error('[Bloomshire Advisor] All Gemini calls failed. Using algorithmic fallback:', lastError?.message);
  const fallbackText = generateAlgorithmicAdvice(prompt, playerSnapshot);
  const offlineText = `*(Modo offline analítico activo)*\n\n${fallbackText}`;
  return res.status(200).json({
    ok: true,
    text: offlineText,
    reply: offlineText,
    advice: offlineText,
    analysis: offlineText,
    model: 'algorithmic-advisor'
  });
}

function cleanLatex(text = '') {
  if (!text) return '';
  return text
    .replace(/\$\$(.*?)\$\$/gs, '\n> $1\n')
    .replace(/\$(.*?)\$/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\times/g, 'x')
    .replace(/\\cdot/g, '·')
    .replace(/\\pm/g, '±')
    .trim();
}

/**
 * Motor Algorítmico Cuantitativo de Respaldo
 */
function generateAlgorithmicAdvice(prompt = '', player = {}) {
  const p = prompt.toLowerCase().trim();
  const lvl = Math.max(1, Math.min(30, player.farmingLevel || 1));
  const energy = Math.round(player.energy || 100);
  const gold = (player.gold || 0).toLocaleString('es-ES');
  const farmers = player.farmersCount ?? player.farmersOwned ?? 0;
  const playerName = player.playerName || player.name || 'Farmer';

  if (p === 'hola' || p === 'hola bro' || p === 'buenas' || p === 'hey' || p.startsWith('hola ') || p.startsWith('buenas ')) {
    return `¡Hola ${playerName}! ¿Cómo estás? ¿Cómo va todo hoy por Bloomshire?

Veo tu partida lista: **${gold} Gold**, **${energy}⚡ de energía**, **Nivel ${lvl} de Farming** y **${farmers} Founding Farmers** en cartera.

¿Qué necesitas consultar o calcular hoy? (pedidos de Odette, qué sembrar, energía, crafteo o precios)`;
  }

  if (p.includes('shards') || p.includes('avs') || p.includes('lucky')) {
    return `💡 **Resumen Ejecutivo:**
• Para maximizar los **30 Lucky Shards diarios (AVS)** necesitas cosechar cultivos de **Nivel 10 o superior** (tasa de 1 en 8, es decir, 12.5% de chance de 1 o 2 Shards).

📊 **Diagnóstico Cuantitativo:**
• 🌾 **Tasa de Drop por Actividad:**
  - **Cultivos Raros (Lvl 10+):** 1 en 8 cosechas (12.5%). Con ~240 cosechas de cultivos raros agotas el tope de 30 Shards.
  - **Pesca:** 1 en 20 peces (5%).
  - **Minería / Tala:** 1 en 25 golpes (4%).
• ⏳ **Tope Diario:** 30 Shards por día (se reinicia a las 00:00 UTC).

🎯 **Plan de Acción Paso a Paso:**
• **Paso 1:** Lleva tu habilidad de Farming a Nivel 10 lo antes posible plantando cultivos de re-cosecha (Maíz, Tomate, Judías).
• **Paso 2:** Al llegar a Nivel 10, siembra **Hot Pepper** o **Bell Peppers** (1 hora de crecimiento y 5 cosechas por semilla).
• **Paso 3:** Cada cosecha tiene un 12.5% de darte Shards directos a tu cartera.`;
  }

  if (p.includes('farmers') || p.includes('perk') || p.includes('mint') || p.includes('comprar')) {
    return `💡 **Resumen Ejecutivo:**
• El umbral óptimo de inversión es **3 Farmers** para desbloquear la **Pet** (+5 slots de carga, forrajeo pasivo y luz en cuevas), o **7 Farmers** para la reducción del **-20% de tiempo de crecimiento** en todos los cultivos.

📊 **Diagnóstico Cuantitativo:**
• 🥇 **1 Farmer:** Acceso a Season 0, Energía máxima 150 y 450⚡ de sueño diario en cama (3 barras de 150).
• 🥈 **3 Farmers (Punto Dulce Operativo):** Desbloquea la Mascota, vital para superar el límite estricto de 10 ítems en la mochila y minar en cuevas oscuras.
• 🚀 **7 Farmers (Ventaja Competitiva):** -20% de tiempo en cultivos acelera tu Gold y Shards/hora.
• 👑 **10 Farmers (Élite):** 600⚡ de sueño diario (4 barras) y acceso VIP permanente.
• ⚡ **15 Farmers:** -30% de tiempo de crecimiento.
• 🌟 **20 Farmers:** 750⚡ de sueño diario (5 barras).

🎯 **Plan de Acción:**
• Si minteas mañana gratis en GTD/FCFS, asegura al menos 1 para Season 0.
• En mercado secundario, apunta a acumular 3 farmers si el floor price es razonable.`;
  }

  if (p.includes('moonlight') || p.includes('stew') || p.includes('estofado') || p.includes('comida')) {
    return `💡 **Resumen Ejecutivo:**
• El **Moonlight Stew** es el plato de Bloomshire que recupera **8 de Energía** (MOONLIGHT_ENERGY = 8). Al igual que los demás platos, cuenta para la barra diaria de comida (FOOD_BARS_A_DAY = 1).

📊 **Receta Secreta del Moonlight Stew:**
• 🐟 **1x Ghost Catfish** (Pez fantasma de aguas profundas).
• ⭐ **1x Star Fruit** (Requiere Farming Nivel 10, tarda 5 horas).
• 🍄 **2x Silvercap Mushroom** (Forraje raro en Whisperwood y cuevas).

🎯 **Estrategia de Uso:**
• Cocínalo en el horno de tu cabaña o en la panadería.
• Úsalo durante sesiones maratónicas de minería en The Gloom o cosechas masivas para romper el límite de energía.`;
  }

  // Recomendación general de cultivo por nivel
  let bestCrop = 'Onion (Cebolla) o Cabbage (Repollo)';
  if (lvl < 3) bestCrop = 'Carrot (Zanahoria) o Parsnip (Chirivía)';
  else if (lvl >= 3 && lvl < 6) bestCrop = 'Onion (Cebolla - 12m, +75g) o Cabbage (Repollo - 20m, +120g)';
  else if (lvl >= 6 && lvl < 8) bestCrop = 'Corn (Maíz) - Da 5 cosechas cada 30 min';
  else if (lvl >= 8 && lvl < 10) bestCrop = 'Green Beans o Adzuki Bean (5 cosechas cada 35-40 min)';
  else if (lvl >= 10) bestCrop = 'Hot Pepper o Bell Peppers (5 cosechas + 12.5% chance de Lucky Shards)';

  return `💡 **Resumen Ejecutivo:**
• Con tu nivel actual de Farming (${lvl}) y ${energy} de energía, tu cultivo óptimo es **${bestCrop}**.

📊 **Diagnóstico Cuantitativo:**
• 🚜 **Cultivos de Re-cosecha:** Prioriza siempre cultivos que re-crecen (Corn, Cucumber, Tomato, Peppers). Una sola semilla te rinde 5 cosechas completas, ahorrando el 80% del gasto en semillas.
• 📦 **Órdenes de Odette:** Revisa siempre el tablón del General Store. Las órdenes se reponen al instante, pagando el 50% del valor de venta en Gold; los pedidos de cultivos dan 50% de XP y los demás 1 XP cada 40 Gold.

🎯 **Plan de Acción Inmediato:**
• **Paso 1:** Planta tu campo completo con ${bestCrop}.
• **Paso 2:** Deja suficiente energía para regar (el riego es gratis, pero cosechar cuesta 1 de energía por planta).
• **Paso 3:** Descansa en tu cama para consumir tu cupo diario de sueño (200⚡ normal, 450⚡ con 1 Farmer/VIP, 600⚡ con 10 Farmers, 750⚡ con 20 Farmers).`;
}
