import React, { useState, useMemo } from 'react';
import {
  Zap,
  MapPin,
  Trash2,
  RotateCcw,
  Search,
  Check,
  RefreshCw
} from 'lucide-react';
import defaultInventoryCatalog from '../../../../public/data/bloomshire/inventory_catalog.json';
import { NpcAvatar } from '../../BloomshireMegaAtlas';
import {
  CRAFT_STATION_LOCATIONS,
  MARKET_ROTATION_CATALOG,
  getStorageType,
  getItemStorageBreakdown,
  calculateQuantitiesFromRaw,
  getOrderBreakdown as getOrderBreakdownHelper,
  getOrderAvailableQty as getOrderAvailableQtyHelper,
  ItemSprite,
  LockedModuleScreen
} from '../bloomshireHelpers';

export default function InventoryTab({
  isConnected = false,
  walletAddress = '',
  gold = 0,
  farmingLevel = 1,
  rawInventory = [],
  itemQuantities = {},
  setItemQuantities = () => {},
  inventoryScope = 'all',
  setInventoryScope = () => {},
  activeOrders = [],
  activeQuestMaterials = [],
  liveMarketOffers = null,
  marketOffersLastUpdated = null,
  isMarketOffersLoading = false,
  handleRefreshMarketOffers = () => {},
  remainingThingsCap = 1500,
  remainingGoldCap = 500000,
  dailyGoldCap = 500000,
  dailyThingsCap = 1500,
  soldGoldToday = 0,
  soldThingsToday = 0,
  soldItemsToday = {},
  dailyPerItemCap = 15,
  locateInMegaAtlas = () => {},
  setShowConnectModal = () => {},
  inventoryCatalogData: propCatalogData,
  initialSubTab
}) {
  const inventoryCatalogData = propCatalogData || defaultInventoryCatalog;
  const [economySubTab, setEconomySubTab] = useState(() => {
    if (initialSubTab) return initialSubTab;
    return (walletAddress && walletAddress !== 'null' && walletAddress.startsWith('0x')) ? 'liquidation' : 'arbitrage';
  });
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [inventorySortBy, setInventorySortBy] = useState('owned_desc');
  const [marketFilter, setMarketFilter] = useState('all');
  const [marketSearch, setMarketSearch] = useState('');

  // Helpers de desglose vinculados al inventario vivo
  const getItemStorageBreakdownLocal = (itemObj) => getItemStorageBreakdown(itemObj, rawInventory);
  const getOrderBreakdown = (ord) => getOrderBreakdownHelper(ord, rawInventory, inventoryCatalogData);
  const getOrderAvailableQty = (ord) => getOrderAvailableQtyHelper(ord, rawInventory, inventoryCatalogData);

  // Conteo de slots por almacén
  const inventoryCounts = useMemo(() => {
    let hotbar = 0;
    let homeChest = 0;
    let townChest = 0;
    (rawInventory || []).forEach(it => {
      const type = getStorageType(it.area);
      if (type === 'M') hotbar++;
      else if (type === 'CC') homeChest++;
      else if (type === 'CP') townChest++;
    });
    return { hotbar, homeChest, townChest, total: (rawInventory || []).length };
  }, [rawInventory]);

  // Contar órdenes listas para entregar hoy
  const readyOrdersCount = useMemo(() => {
    return (activeOrders || []).filter(ord => !ord.done && getOrderAvailableQty(ord) >= (ord.n || 1)).length;
  }, [activeOrders, itemQuantities, rawInventory]);

  // Desglose de liquidación canónica: Vendible hoy en tiendas NPC vs Excedente para Mercado Rowan (P2P)
  const liquidationBreakdown = useMemo(() => {
    let npcSellableGold = 0;
    let npcSellableThings = 0;
    let p2pMarketGold = 0;
    let p2pMarketThings = 0;

    let remainingThingsBudget = remainingThingsCap;
    let remainingGoldBudget = remainingGoldCap;

    const itemDetails = {};

    inventoryCatalogData.forEach(item => {
      const owned = itemQuantities[item.id] || 0;
      if (owned <= 0) {
        itemDetails[item.id] = { npcSellQty: 0, npcGold: 0, p2pQty: 0, p2pGold: 0, itemQuotaLeft: dailyPerItemCap };
        return;
      }

      const reqLevel = item.requiredLevel || 1;
      const isLevelLocked = item.cat === 'crop' && farmingLevel < reqLevel;
      const isNpcSellable = item.cat !== 'vip' && item.cat !== 'food' && !isLevelLocked && (item.unitNpc ?? item.unit ?? 0) > 0;
      const npcPrice = isNpcSellable ? (item.unitNpc ?? item.unit ?? 0) : 0;
      const p2pPrice = item.unitP2p ?? item.unit ?? 0;

      if (!isNpcSellable) {
        p2pMarketThings += owned;
        p2pMarketGold += owned * p2pPrice;
        itemDetails[item.id] = {
          npcSellQty: 0,
          npcGold: 0,
          p2pQty: owned,
          p2pGold: owned * p2pPrice,
          isP2pOnly: true,
          itemQuotaLeft: 0,
          isLevelLocked,
          reqLevel,
          reason: isLevelLocked
            ? `Requiere Nv ${reqLevel} de Cultivo para vender en tiendas NPC (SEED_SOURCES.shopAtFarmingLevel)`
            : (item.cat === 'food' ? 'Plato Cocinado (0g en tiendas NPC, consumo o P2P)' : 'Cosecha VIP (Mercado Rowan)')
        };
        return;
      }

      const alreadySoldItem = Number(soldItemsToday[item.id]) || 0;
      const itemQuotaLeft = Math.max(0, dailyPerItemCap - alreadySoldItem);

      const candidateQty = Math.min(owned, itemQuotaLeft);
      const fitThingsQty = Math.min(candidateQty, remainingThingsBudget);
      const maxThingsByGold = npcPrice > 0 ? Math.floor(remainingGoldBudget / npcPrice) : fitThingsQty;
      const actualNpcQty = Math.min(fitThingsQty, maxThingsByGold);

      const actualNpcGold = actualNpcQty * npcPrice;
      npcSellableThings += actualNpcQty;
      npcSellableGold += actualNpcGold;
      remainingThingsBudget -= actualNpcQty;
      remainingGoldBudget -= actualNpcGold;

      const surplusQty = owned - actualNpcQty;
      const surplusGold = surplusQty * (p2pPrice || npcPrice);
      p2pMarketThings += surplusQty;
      p2pMarketGold += surplusGold;

      itemDetails[item.id] = {
        npcSellQty: actualNpcQty,
        npcGold: actualNpcGold,
        p2pQty: surplusQty,
        p2pGold: surplusGold,
        isP2pOnly: false,
        itemQuotaLeft
      };
    });

    return {
      npcSellableGold,
      npcSellableThings,
      p2pMarketGold,
      p2pMarketThings,
      itemDetails
    };
  }, [itemQuantities, remainingThingsCap, remainingGoldCap, soldItemsToday, farmingLevel, inventoryCatalogData]);

  // Calcular valor total de liquidación unificada
  const totalLiquidationValue = useMemo(() => {
    let sum = 0;
    inventoryCatalogData.forEach(item => {
      const qty = itemQuantities[item.id] || 0;
      sum += qty * (item.unit || 0);
    });
    return sum;
  }, [itemQuantities, inventoryCatalogData]);

  // Catálogo de inventario ordenado dinámicamente (Prioridad: los que tengo > 0 primero)
  const sortedInventoryCatalog = useMemo(() => {
    let list = [...inventoryCatalogData];
    if (inventorySearchQuery) {
      const q = inventorySearchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.cat && item.cat.toLowerCase().includes(q)) ||
        (item.desc && item.desc.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      const qtyA = itemQuantities[a.id] || 0;
      const qtyB = itemQuantities[b.id] || 0;

      if (inventorySortBy === 'owned_desc') {
        if (qtyA > 0 && qtyB <= 0) return -1;
        if (qtyA <= 0 && qtyB > 0) return 1;
        return qtyB - qtyA;
      }

      if (inventorySortBy === 'qty_desc') return qtyB - qtyA;
      if (inventorySortBy === 'value_desc') return (b.unit || 0) - (a.unit || 0);
      if (inventorySortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [itemQuantities, inventorySearchQuery, inventorySortBy, inventoryCatalogData]);

  // Oportunidades de Venta y Rotación en Mercado (Rowan)
  const marketOpportunities = useMemo(() => {
    const protectedMap = {};
    if (Array.isArray(activeQuestMaterials)) {
      activeQuestMaterials.forEach(mat => {
        const key = (mat.id || '').toLowerCase().trim();
        if (key) {
          protectedMap[key] = {
            needed: mat.needed,
            questTitle: mat.questTitle || 'Misión Activa'
          };
        }
      });
    }

    return MARKET_ROTATION_CATALOG.map(entry => {
      const bd = getItemStorageBreakdownLocal({ id: entry.id, name: entry.name });
      const idKey = entry.id.toLowerCase().trim();
      const isProtected = !!protectedMap[idKey];
      const questProtection = protectedMap[idKey] || null;

      // Cruzar con puestos vivos de Rowan si fueron descargados
      const stallsForThis = Array.isArray(liveMarketOffers?.stalls)
        ? liveMarketOffers.stalls.filter(s => (s.item || '').toLowerCase().trim() === idKey)
        : [];
      const hasLiveStalls = stallsForThis.length > 0;
      let effectiveMinPrice = entry.minPrice;
      let effectiveAvgPrice = entry.avgPrice;
      let effectiveMaxPrice = entry.maxPrice;
      let totalListedOnServer = 0;

      if (hasLiveStalls) {
        const prices = stallsForThis.map(s => Number(s.price) || 0).filter(p => p > 0);
        if (prices.length > 0) {
          effectiveMinPrice = Math.min(...prices);
          effectiveMaxPrice = Math.max(...prices);
          effectiveAvgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        }
        totalListedOnServer = stallsForThis.reduce((acc, s) => acc + (Number(s.left) || 1), 0);
      }

      const totalPotentialGold = bd.total * effectiveAvgPrice;
      const minGold = bd.total * effectiveMinPrice;
      const maxGold = bd.total * effectiveMaxPrice;

      let score = entry.volumeScore;
      if (bd.total > 0) score += 100;
      if (isProtected) score -= 150;
      if (hasLiveStalls && totalListedOnServer < 15) score += 30;

      let dynamicTag = entry.tag;
      if (hasLiveStalls) {
        if (totalListedOnServer <= 10) dynamicTag = 'Poca Oferta 🔥';
        else if (totalListedOnServer >= 40) dynamicTag = 'Alta Competencia ⚠️';
        else dynamicTag = `En Venta (${totalListedOnServer} un.)`;
      }

      return {
        ...entry,
        minPrice: effectiveMinPrice,
        avgPrice: effectiveAvgPrice,
        maxPrice: effectiveMaxPrice,
        hasLiveStalls,
        totalListedOnServer,
        liveStallsCount: stallsForThis.length,
        tag: dynamicTag,
        stock: bd,
        hasStock: bd.total > 0,
        isProtected,
        questProtection,
        totalPotentialGold,
        minGold,
        maxGold,
        score
      };
    }).sort((a, b) => b.score - a.score);
  }, [rawInventory, activeQuestMaterials, liveMarketOffers]);

  // Alias para uso directo dentro del JSX existente
  const getItemStorageBreakdown = getItemStorageBreakdownLocal;

  return (
            <div className="flex flex-col h-full w-full overflow-hidden p-4 gap-3">
              {/* Selector de Sub-herramientas de Economía */}
              <div className="flex items-center gap-2 bg-[#0a1224] p-1.5 rounded-xl border border-indigo-950/80 shrink-0">
                <button
                  onClick={() => setEconomySubTab('liquidation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    economySubTab === 'liquidation'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>📦 Liquidador de Inventario</span>{!isConnected && <span className="text-[10px] ml-1">🔒</span>}
                </button>
                <button
                  onClick={() => setEconomySubTab('odette')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    economySubTab === 'odette'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>📜 Pedidos Diarios de Odette</span>{!isConnected && <span className="text-[10px] ml-1">🔒</span>}
                  {readyOrdersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                      {readyOrdersCount} Listo
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setEconomySubTab('arbitrage')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    economySubTab === 'arbitrage'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>⚖️ Calculadora de Arbitraje (Vender Crudo vs Cocinar)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    NUEVO
                  </span>
                </button>
                <button
                  onClick={() => setEconomySubTab('market_radar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    economySubTab === 'market_radar'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>📈 Radar de Rotación de Mercado (Rowan)</span>{!isConnected && <span className="text-[10px] ml-1">🔒</span>}
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                    HOT
                  </span>
                </button>
              </div>

              {/* Sub-vista 1: Arbitraje y Lucro de Cocina (Tarjetas compactas en cuadrícula 4-6 columnas) */}
              {economySubTab === 'arbitrage' && (
                <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1">
                  <div className="p-3.5 bg-[#0e172c] border-2 border-amber-500/60 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-black text-amber-400 flex items-center gap-2">
                          <span>⚖️ MOTOR DE ARBITRAJE: ¿VENDER CRUDO A WREN O COCINAR EN ESTUFA?</span>
                        </div>
                        <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Desglose financiero neto: descuenta el valor de venta crudo en mano, el costo de insumos secundarios comprados y el consumo de <b>1⚡ de energía</b> en estufa.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Costo Fijo de Cocción: 1⚡ por plato</span>
                        </div>
                        <button
                          onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.stove)}
                          className="px-3 py-1 rounded-lg bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="Ubicar Estufa en el Mega-Atlas"
                        >
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ubicar Estufa</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cuadrícula compacta de Arbitraje (4-6 columnas estilo Buscador de Ítems) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
                    {[
                      {
                        rawId: 'Carp',
                        rawItem: 'Carpa (Carp)',
                        rawPrice: 53,
                        secondMats: '1x Harina (15g)',
                        matsCost: 15,
                        energyCost: 1,
                        cookedItem: 'Fish Pie (Tarta de Pescado)',
                        cookedPrice: 165,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 11',
                        xp: 55,
                        icon: '🐟',
                        netProfit: 97, // 165 - (53 + 15) = 97
                        mult: '+142%',
                        goldPerEnergy: '+97g / 1⚡'
                      },
                      {
                        rawId: 'Perch',
                        rawItem: 'Perca (Perch)',
                        rawPrice: 81,
                        secondMats: '1x Papa (45g)',
                        matsCost: 45,
                        energyCost: 1,
                        cookedItem: 'Fish Stew (Guiso de Pescado)',
                        cookedPrice: 210,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 8',
                        xp: 50,
                        icon: '🐟',
                        netProfit: 84, // 210 - (81 + 45) = 84
                        mult: '+103%',
                        goldPerEnergy: '+84g / 1⚡'
                      },
                      {
                        rawId: 'Silvercap Mushroom',
                        rawItem: 'Silvercap Mushroom',
                        rawPrice: 60,
                        secondMats: 'Sin insumos extra (0g)',
                        matsCost: 0,
                        energyCost: 1,
                        cookedItem: 'Fried Mushrooms (Setas Salteadas)',
                        cookedPrice: 180,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 3',
                        xp: 60,
                        icon: '🍄',
                        netProfit: 120, // 180 - 60 = 120
                        mult: '+200%',
                        goldPerEnergy: '+120g / 1⚡'
                      },
                      {
                        rawId: 'Carrot',
                        rawItem: 'Zanahoria (Carrot)',
                        rawPrice: 40,
                        secondMats: '1x Chirivía (25g)',
                        matsCost: 25,
                        energyCost: 1,
                        cookedItem: 'Vegetable Plate (Plato Verduras)',
                        cookedPrice: 95,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 1',
                        xp: 30,
                        icon: '🥕',
                        netProfit: 30, // 95 - (40 + 25) = 30
                        mult: '+75%',
                        goldPerEnergy: '+30g / 1⚡'
                      },
                      {
                        rawId: 'Potato',
                        rawItem: 'Papa / Patata (Potato)',
                        rawPrice: 45,
                        secondMats: 'Sin insumos extra (0g)',
                        matsCost: 0,
                        energyCost: 1,
                        cookedItem: 'Baked Potato (Papa Asada)',
                        cookedPrice: 110,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 2',
                        xp: 35,
                        icon: '🥔',
                        netProfit: 65, // 110 - 45 = 65
                        mult: '+144%',
                        goldPerEnergy: '+65g / 1⚡'
                      },
                      {
                        rawId: 'Pike',
                        rawItem: 'Lucio (Pike)',
                        rawPrice: 150,
                        secondMats: '1x Mantequilla (35g)',
                        matsCost: 35,
                        energyCost: 1,
                        cookedItem: 'Roast Fish Platter (Bandeja Asada)',
                        cookedPrice: 340,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 15',
                        xp: 75,
                        icon: '🐟',
                        netProfit: 155, // 340 - (150 + 35) = 155
                        mult: '+103%',
                        goldPerEnergy: '+155g / 1⚡'
                      },
                      {
                        rawId: 'Chub',
                        rawItem: 'Cacho (Chub)',
                        rawPrice: 32,
                        secondMats: '1x Aceite (10g)',
                        matsCost: 10,
                        energyCost: 1,
                        cookedItem: 'Fried Fish (Pescado Frito)',
                        cookedPrice: 90,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 4',
                        xp: 40,
                        icon: '🐟',
                        netProfit: 48, // 90 - (32 + 10) = 48
                        mult: '+114%',
                        goldPerEnergy: '+48g / 1⚡'
                      },
                      {
                        rawId: 'Wheat',
                        rawItem: 'Trigo Cosechado',
                        rawPrice: 185,
                        secondMats: 'Molienda Harina (10g)',
                        matsCost: 10,
                        energyCost: 1,
                        cookedItem: 'Bread (Pan Casero)',
                        cookedPrice: 280,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 5',
                        xp: 45,
                        icon: '🌾',
                        netProfit: 85, // 280 - (185 + 10) = 85
                        mult: '+44%',
                        goldPerEnergy: '+85g / 1⚡'
                      }
                    ].map((arb, i) => {
                      const owned = getPlayerItemQty({ id: arb.rawId });
                      const totalPotentialProfit = owned > 0 ? arb.netProfit * owned : arb.netProfit;

                      return (
                        <div 
                          key={i} 
                          className="p-3 bg-[#0c1322] border border-indigo-950/90 hover:border-amber-500/60 rounded-xl shadow-md flex flex-col justify-between gap-2.5 transition-all"
                        >
                          {/* Fila 1: Ícono + Nombre Crudo + Lucro Neto */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-1.5 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <ItemSprite name={arb.rawItem} id={arb.rawId} fallback={arb.icon || '🐟'} size={24} className="shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-xs text-white truncate leading-tight" title={arb.rawItem}>
                                    {arb.rawItem}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {owned > 0 ? (
                                      <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/30">
                                        Mochila: {owned}x
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">Sin stock</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[11px] font-mono shrink-0">
                                +{arb.netProfit}g
                              </span>
                            </div>

                            {/* Fila 2: Plato Resultado + Nivel de Cocina */}
                            <div className="p-2 bg-[#080d18] rounded-lg border border-slate-800/80 flex flex-col gap-1">
                              <div className="flex items-center justify-between text-xs font-semibold text-amber-200">
                                <span className="truncate flex items-center gap-1">
                                  <span>🍳</span>
                                  <span className="truncate">{arb.cookedItem}</span>
                                </span>
                                <span className="text-[10px] text-purple-300 font-mono font-bold shrink-0 ml-1">
                                  +{arb.xp} XP
                                </span>
                              </div>
                              <div className="text-[10.5px] text-slate-400 truncate">
                                🛒 {arb.secondMats}
                              </div>
                            </div>

                            {/* Fila 3: Micro-desglose financiero */}
                            <div className="grid grid-cols-3 gap-1 p-1.5 bg-[#091122] rounded-lg border border-slate-800/60 text-[10.5px] text-center font-mono">
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">CRUDO</div>
                                <div className="text-amber-300 font-bold">{arb.rawPrice}g</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">INSUMOS</div>
                                <div className="text-slate-300 font-semibold">{arb.matsCost > 0 ? `-${arb.matsCost}g` : '0g'}</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">VENTA</div>
                                <div className="text-emerald-400 font-bold">{arb.cookedPrice}g</div>
                              </div>
                            </div>
                          </div>

                          {/* Pie de Tarjeta: Rinde de Energía + Lucro Total + Ubicar */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px] font-mono">
                            <span className="text-cyan-300 font-bold">
                              ⚡ {arb.goldPerEnergy}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {owned > 0 && (
                                <span className="text-amber-300 font-bold" title="Lucro total con tu stock actual">
                                  +{(arb.netProfit * owned).toLocaleString('es-ES')}g
                                </span>
                              )}
                              <button
                                onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.stove)}
                                className="w-6 h-6 rounded bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center cursor-pointer transition-all shrink-0"
                                title="Ubicar Estufa en el Mega-Atlas"
                              >
                                <MapPin className="w-3 h-3 text-amber-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-vista 2: Liquidador de Inventario (Full-Width, sin Odette lateral, tarjetas legibles) */}
              {economySubTab === 'liquidation' && (
                !isConnected ? (
                  <LockedModuleScreen
                    title="Liquidador de Inventario & Almacenes"
                    description="Audita en tiempo real el valor de liquidación en oro de tu Mochila, Cofres de Casa y Cofre del Pueblo leyendo automáticamente tus existencias con la extensión Bloomshire Companion."
                    onConnect={() => setShowConnectModal(true)}
                    onBack={() => setEconomySubTab('arbitrage')}
                  />
                ) : (
                <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1">
                  {(!walletAddress || walletAddress === 'null' || !walletAddress.startsWith('0x')) && (
                    <div className="p-4 bg-gradient-to-r from-amber-950/40 via-[#0e172c] to-indigo-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between gap-4 flex-wrap shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-xl shrink-0">
                          🔒
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>Módulo Personal: Liquidador de Almacén</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-mono">Modo Guía Libre</span>
                          </div>
                          <div className="text-xs text-slate-300 max-w-xl mt-0.5">
                            Este módulo audita automáticamente el valor en oro de tu Mochila, Cofres de Casa y Cofre del Pueblo leyendo directamente tu partida mediante la extensión <b>Bloomshire Companion</b>.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowConnectModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer shrink-0"
                      >
                        🎮 Conectar Partida
                      </button>
                    </div>
                  )}
                  <div className="p-4 bg-[#0e172c] border-2 border-amber-500/60 rounded-xl flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          VALOR TOTAL ESTIMADO DE LIQUIDACIÓN:
                        </div>
                        <div className="text-3xl font-black text-amber-400 font-mono tracking-wider mt-0.5">
                          {totalLiquidationValue.toLocaleString('es-ES')} ORO
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>Total Slots: {inventoryCounts.total}</span>
                          <span>•</span>
                          <span className="text-cyan-300 font-semibold">🎒 Mochila: {inventoryCounts.hotbar} slots</span>
                          <span>•</span>
                          <span className="text-amber-300 font-semibold">🏡 Cofre Casa: {inventoryCounts.homeChest} slots</span>
                          <span>•</span>
                          <span className="text-purple-300 font-semibold">🏬 Cofre Pueblo: {inventoryCounts.townChest} slots</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const empty = {};
                            inventoryCatalogData.forEach(c => { empty[c.id] = 0; });
                            setItemQuantities(empty);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Limpiar Todo
                        </button>
                        <button 
                          onClick={() => {
                            const syn = calculateQuantitiesFromRaw(rawInventory, inventoryScope);
                            setItemQuantities(syn);
                          }}
                          className="px-3 py-1.5 bg-[#142245] hover:bg-[#1a2c5a] border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Restablece las cantidades exactas capturadas de tu partida"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restaurar Mochila del Juego
                        </button>
                      </div>
                    </div>

                    {/* Botones de Filtro por Almacén: Todo / Mochila / Cofre Casa / Cofre Pueblo */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase mr-1">Filtrar Almacén:</span>
                      {[
                        { key: 'all', label: '🌐 Todo Unificado', count: inventoryCounts.total, color: 'border-slate-700' },
                        { key: 'hotbar', label: '🎒 Mochila (M)', count: inventoryCounts.hotbar, color: 'text-cyan-300 border-cyan-500/40' },
                        { key: 'home_chest', label: '🏡 Cofre Casa (CC)', count: inventoryCounts.homeChest, color: 'text-amber-300 border-amber-500/40' },
                        { key: 'town_chest', label: '🏬 Cofre Pueblo (CP)', count: inventoryCounts.townChest, color: 'text-purple-300 border-purple-500/40' }
                      ].map(btn => (
                        <button
                          key={btn.key}
                          onClick={() => setInventoryScope(btn.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                            inventoryScope === btn.key
                              ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-sm'
                              : `bg-[#0c1427] text-slate-300 hover:bg-slate-800 ${btn.color}`
                          }`}
                        >
                          <span>{btn.label}</span>
                          <span className="font-mono text-[10px] opacity-80">({btn.count})</span>
                        </button>
                      ))}
                    </div>

                    {/* Buscador de inventario + Selector de Orden */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex-1 flex items-center gap-2 bg-[#080d17] border border-slate-700/80 rounded-lg px-2.5 py-1 shadow-inner">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Buscar en inventario (ej: zanahoria, madera, lingote)..."
                          value={inventorySearchQuery}
                          onChange={(e) => setInventorySearchQuery(e.target.value)}
                          className="bg-transparent border-none text-white text-xs outline-none w-full placeholder:text-slate-500"
                        />
                        {inventorySearchQuery && (
                          <button
                            onClick={() => setInventorySearchQuery('')}
                            className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10.5px] font-bold text-slate-400">Ordenar:</span>
                        <select
                          value={inventorySortBy}
                          onChange={(e) => setInventorySortBy(e.target.value)}
                          className="bg-[#14203d] border border-slate-700 text-amber-300 rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="owned_desc">📦 Tengo primero (Mayor cantidad)</option>
                          <option value="value_desc">🪙 Mayor precio de venta</option>
                          <option value="qty_desc">🔢 Solo por cantidad</option>
                          <option value="name_asc">🔤 Nombre (A-Z)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Cuadrícula de Liquidación: 2 filas por tarjeta, nombres sin recortar y sin solapamiento */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
                    {sortedInventoryCatalog.map(item => {
                      const qty = itemQuantities[item.id] || 0;
                      const detail = liquidationBreakdown.itemDetails[item.id] || { npcSellQty: 0, npcGold: 0, p2pQty: qty, p2pGold: qty * (item.unit || 0), itemQuotaLeft: 15 };
                      const bd = getItemStorageBreakdown(item);
                      const isFood = item.cat === 'food';
                      const isVipCrop = item.cat === 'vip';
                      const unitPrice = isFood || isVipCrop ? (item.unitP2p || item.unit) : (item.unitNpc ?? item.unit);

                      return (
                        <div 
                          key={item.id} 
                          className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 shadow-sm ${
                            qty > 0 
                              ? 'bg-[#101726] border-amber-500/60 shadow-md' 
                              : 'bg-[#0a0f1a] border-slate-800/60 opacity-60 hover:opacity-95'
                          }`}
                        >
                          {/* Fila Superior: Ícono + Nombre Completo + Subtotal */}
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ItemSprite name={item.name} id={item.id} fallback={item.icon || '📦'} size={24} className="shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs text-white truncate leading-snug" title={item.name}>
                                  {item.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono flex-wrap">
                                  <span className="text-amber-400 font-bold">🪙 {unitPrice}g/u</span>
                                  {isFood ? (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-blue-950 text-blue-300 border border-blue-500/40" title="Plato cocinado: no se vende a NPCs, sirve para consumo o venta P2P">
                                      Plato (P2P / 0g NPC)
                                    </span>
                                  ) : isVipCrop ? (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-purple-950 text-purple-300 border border-purple-500/40" title="Cosecha VIP: venta en Rowan P2P">
                                      VIP Rowan
                                    </span>
                                  ) : detail.isLevelLocked ? (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-rose-950 text-rose-300 border border-rose-500/40" title={`Las tiendas solo compran este cultivo a granjeros de Nv ${detail.reqLevel}+ (SEED_SOURCES.shopAtFarmingLevel)`}>
                                      Bloq Nv {detail.reqLevel}
                                    </span>
                                  ) : (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-slate-800 text-slate-300">
                                      NPC (15/día)
                                    </span>
                                  )}
                                  {bd.total > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-600">•</span>
                                      {bd.m > 0 && <span title="En Mochila" className="text-cyan-400 font-bold">🎒{bd.m}</span>}
                                      {bd.cc > 0 && <span title="En Cofre de Casa" className="text-amber-400 font-bold">🏡{bd.cc}</span>}
                                      {bd.cp > 0 && <span title="En Cofre del Pueblo" className="text-purple-400 font-bold">🏬{bd.cp}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {qty > 0 && (
                              <div className="text-right shrink-0">
                                <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded block">
                                  +{((detail.npcGold || 0) + (detail.p2pGold || 0)).toLocaleString('es-ES')}g
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Fila Intermedia: Desglose NPC vs Excedente */}
                          {qty > 0 && (
                            <div className="text-[10px] font-mono bg-[#091122] p-1.5 rounded border border-slate-800/80 flex flex-col gap-0.5">
                              {detail.npcSellQty > 0 && (
                                <div className="text-emerald-300 flex justify-between">
                                  <span>Vendible NPC hoy:</span>
                                  <b>{detail.npcSellQty}x (+{detail.npcGold}g)</b>
                                </div>
                              )}
                              {detail.p2pQty > 0 && (
                                <div className="text-purple-300 flex justify-between">
                                  <span>{isFood || isVipCrop ? 'Mercado Rowan / P2P:' : 'Excedente (P2P/mañana):'}</span>
                                  <b>{detail.p2pQty}x (+{detail.p2pGold}g)</b>
                                </div>
                              )}
                              {!isFood && !isVipCrop && detail.itemQuotaLeft <= 0 && (
                                <div className="text-rose-400 text-[9px] font-bold">
                                  ⛔ Cupo diario alcanzado (15/15)
                                </div>
                              )}
                            </div>
                          )}

                          {/* Fila Inferior: Indicador de Venta + Stepper con Botones */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 mt-0.5">
                            <span className="text-[10px] font-mono">
                              {qty > 0 ? (
                                <span className="text-emerald-400 font-bold">Total: {qty}x</span>
                              ) : (
                                <span className="text-slate-500">0 en lote</span>
                              )}
                            </span>

                            <div className="flex items-center shrink-0">
                              <button 
                                onClick={() => setItemQuantities(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                                className="w-6 h-6 rounded-l bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 transition-all"
                                title="Restar 1"
                              >
                                -
                              </button>
                              <input 
                                type="number" 
                                min="0"
                                value={qty}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setItemQuantities(prev => ({ ...prev, [item.id]: val }));
                                }}
                                className="w-12 h-6 bg-[#131d30] border-y border-slate-700 text-amber-300 text-center font-bold font-mono text-xs focus:outline-none"
                              />
                              <button 
                                onClick={() => setItemQuantities(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                                className="w-6 h-6 rounded-r bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 transition-all"
                                title="Sumar 1"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                )
              )}

              {/* Sub-vista 3: Pedidos Diarios de Odette (Módulo Propio y Dedicado) */}
              {economySubTab === 'odette' && (
                !isConnected ? (
                  <LockedModuleScreen
                    title="Pedidos Diarios de Odette (+25% Oro)"
                    description="Consulta tus 6 encargos diarios exclusivos de hoy, su recompensa en oro con bonificación del +25% y entrega directa en tienda vinculando tu partida con la extensión Bloomshire Companion."
                    onConnect={() => setShowConnectModal(true)}
                    onBack={() => setEconomySubTab('arbitrage')}
                  />
                ) : (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                  {/* Hero Banner de Odette con Retrato Oficial y Estadísticas */}
                  <div className="p-4 bg-[#0d162b] border-2 border-amber-500/60 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <NpcAvatar npcId="odette" name="Odette" size={56} className="border-2 border-amber-500/60 shadow-lg rounded-2xl shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-black text-amber-400">
                            📜 TABLÓN DE PEDIDOS DIARIOS DE ODETTE
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            PEDIDOS DIARIOS
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                          Odette ofrece <b>6 + ⌊Nivel / 3⌋ pedidos diarios</b> (hasta un máximo de 16) en el tablón de su Tienda General en Bloomshire. Paga aproximadamente el <b>50% del valor de venta en tienda</b> y recompensa con experiencia directa para subir de nivel tus oficios.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <div className="px-3.5 py-1.5 rounded-xl bg-[#091122] border border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Listos para Entrega</div>
                        <div className={`font-mono text-sm font-black ${readyOrdersCount > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {readyOrdersCount} de {activeOrders.length}
                        </div>
                      </div>
                      <button
                        onClick={() => locateInMegaAtlas({
                          label: '🏬 Tienda General de Odette (Tablón de Pedidos)',
                          regionId: 'bloomshire_town',
                          subZoneId: 'bloomshire_town_sub_1_bloomshire',
                          wx: 5510,
                          wy: 4326,
                          worldRect: [5380, 4200, 260, 240]
                        })}
                        className="px-3.5 py-2 bg-[#142245] hover:bg-[#1b2d5c] border border-amber-500/50 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                        title="Ubicar la Tienda de Odette en el Mega-Atlas"
                      >
                        <MapPin className="w-4 h-4 text-amber-400" />
                        <span>Ubicar Tienda en Atlas</span>
                      </button>
                    </div>
                  </div>

                  {/* Barra de Totales y Filtros */}
                  <div className="flex items-center justify-between p-3 bg-[#0a101f] border border-indigo-950/80 rounded-xl text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-slate-300 font-mono">
                      <span>Total disponible: <b className="text-white">{activeOrders.length} Pedidos</b></span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">
                        Oro Potencial: +{activeOrders.reduce((sum, o) => sum + (o.gold || 0), 0).toLocaleString('es-ES')}g
                      </span>
                      <span>•</span>
                      <span className="text-cyan-300 font-bold">
                        XP Acumulable: +{activeOrders.reduce((sum, o) => sum + (o.xp || 0), 0)} XP
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      💡 Los pedidos se renuevan diariamente con el ciclo del servidor
                    </div>
                  </div>

                  {/* Cuadrícula de Pedidos Diarios (3 columnas amplias y detalladas) */}
                  {activeOrders.length === 0 ? (
                    <div className="p-8 bg-[#0a1020] border border-slate-800 rounded-xl text-center flex flex-col items-center justify-center gap-3 my-4">
                      <span className="text-4xl">📜</span>
                      <h3 className="font-bold text-white text-base">Esperando sincronización de pedidos</h3>
                      <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                        Los pedidos diarios de Odette son únicos para cada jugador y rotan a las 00:00 UTC. Abre el juego con la extensión <b>Bloomshire Companion</b> para consultar tus pedidos de hoy.
                      </p>
                      <button
                        onClick={() => setShowConnectModal(true)}
                        className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
                      >
                        🎮 Conectar con Companion
                      </button>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {activeOrders.map((ord, i) => {
                      const required = ord.n || 1;
                      const available = getOrderAvailableQty(ord);
                      const hasEnough = available >= required;
                      const bd = getOrderBreakdown(ord);
                      const progressPct = Math.min(100, Math.round((available / required) * 100));

                      return (
                        <div 
                          key={i} 
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all shadow-md ${
                            ord.done 
                              ? 'bg-slate-900/40 border-slate-800 opacity-60' 
                              : hasEnough 
                              ? 'bg-[#0d1d22] border-emerald-500/60 shadow-emerald-950/20' 
                              : 'bg-[#0c1427] border-indigo-950/90 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            {/* Cabecera: Ícono + Cantidad/Nombre + Estado */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ItemSprite name={ord.item} fallback={ord.icon || '📦'} size={28} className="shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-white truncate leading-tight">
                                    {required}x {ord.item}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Pedido #{i + 1} del Tablón
                                  </div>
                                </div>
                              </div>

                              <div>
                                {ord.done ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                    ✓ Entregado
                                  </span>
                                ) : hasEnough ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-400" /> Listo
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                    Faltan {required - available}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Recompensas */}
                            <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-[#080d17] rounded-lg border border-slate-800 text-xs">
                              <div>
                                <div className="text-[9.5px] text-slate-400 font-bold uppercase">Recompensa Oro:</div>
                                <div className="font-mono text-amber-400 font-black text-sm flex items-center gap-1">
                                  <span>🪙 +{ord.gold}g</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[9.5px] text-slate-400 font-bold uppercase">Experiencia:</div>
                                <div className="font-mono text-cyan-300 font-black text-sm">
                                  ⚡ +{ord.xp} XP {ord.skill || ''}
                                </div>
                              </div>
                            </div>

                            {/* Barra de Progreso y Stock en Almacenes */}
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">Progreso en Inventario:</span>
                                <span className={`font-bold ${hasEnough ? 'text-emerald-400' : 'text-slate-300'}`}>
                                  {available} / {required} ({progressPct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${hasEnough ? 'bg-emerald-400' : 'bg-amber-500'}`} 
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>

                              {available > 0 && (
                                <div className="flex items-center gap-2 pt-1 text-[10.5px] font-mono text-slate-400">
                                  <span>Disponible en:</span>
                                  {bd.m > 0 && <span className="text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/30">🎒 {bd.m}</span>}
                                  {bd.cc > 0 && <span className="text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30">🏡 {bd.cc}</span>}
                                  {bd.cp > 0 && <span className="text-purple-400 font-bold bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-500/30">🏬 {bd.cp}</span>}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pie de Tarjeta: Acciones */}
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                setItemCategoryFilter('all');
                                setItemSearchQuery(ord.rawItem || ord.item);
                                setActiveTab('items');
                              }}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Search className="w-3 h-3" />
                              <span>¿Dónde consigo {ord.rawItem || ord.item}?</span>
                            </button>

                            {hasEnough && !ord.done && (
                              <button
                                onClick={() => locateInMegaAtlas({
                                  label: '🏬 Tienda General de Odette (Tablón de Pedidos)',
                                  regionId: 'bloomshire_town',
                                  subZoneId: 'bloomshire_town_sub_1_bloomshire',
                                  wx: 5510,
                                  wy: 4326,
                                  worldRect: [5380, 4200, 260, 240]
                                })}
                                className="px-2 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <MapPin className="w-3 h-3 text-emerald-400" />
                                <span>Entregar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
                )
              )}

              {/* Sub-vista 4: Radar de Rotación de Mercado (Market Hall / Rowan) */}
              {economySubTab === 'market_radar' && (
                !isConnected ? (
                  <LockedModuleScreen
                    title="Radar de Rotación de Mercado (Rowan)"
                    description="Cruza tus existencias unificadas (Mochila, Cofres de Casa y Pueblo) con los productos de mayor demanda conectando tu partida con Bloomshire Companion."
                    onConnect={() => setShowConnectModal(true)}
                    onBack={() => setEconomySubTab('arbitrage')}
                  />
                ) : (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                  {/* Hero Banner de Rowan */}
                  <div className="p-4 bg-[#0d162b] border-2 border-emerald-500/60 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 border-2 border-emerald-400/80 flex items-center justify-center text-3xl shadow-lg shrink-0">
                        ⚖️
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-black text-emerald-400">
                            📈 RADAR DE ROTACIÓN DE MERCADO // ROWAN & MARKET HALL
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ESTRATEGIA DE ORO RÁPIDO
                          </span>
                          {marketOffersLastUpdated ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              🟢 Ventas Vivas ({new Date(marketOffersLastUpdated).toLocaleTimeString('es-ES')})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700/50">
                              ⚪ Precios Estimados
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                          Analiza tus existencias unificadas (Mochila, Cofre de la Casa y Cofre del Pueblo) cruzándolas con los productos de <b>mayor velocidad de compraventa</b> en el mercado. Convierte stock ocioso en oro líquido y <b>protege</b> los materiales que necesitas para tus misiones activas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <div className="px-3.5 py-1.5 rounded-xl bg-[#091122] border border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Oro Rápido Proyectado</div>
                        <div className="font-mono text-sm font-black text-amber-400">
                          +{marketOpportunities.filter(o => o.hasStock && !o.isProtected).reduce((sum, o) => sum + o.totalPotentialGold, 0).toLocaleString('es-ES')}g
                        </div>
                      </div>
                      <div className="px-3.5 py-1.5 rounded-xl bg-[#091122] border border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Items Listos en Stock</div>
                        <div className="font-mono text-sm font-black text-emerald-400">
                          {marketOpportunities.filter(o => o.hasStock && !o.isProtected).length} productos
                        </div>
                      </div>
                      <button
                        onClick={handleRefreshMarketOffers}
                        disabled={isMarketOffersLoading}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-all disabled:opacity-50"
                        title="Descargar las últimas 200 ventas y puestos activos de Rowan"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isMarketOffersLoading ? 'animate-spin' : ''}`} />
                        <span>{isMarketOffersLoading ? 'Consultando...' : '🔍 Actualizar Ventas'}</span>
                      </button>
                      <button
                        onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.market)}
                        className="px-3.5 py-2 bg-[#142e2b] hover:bg-[#1a3d39] border border-emerald-500/50 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                        title="Ubicar el Market Hall de Rowan en el Mega-Atlas"
                      >
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span>Ubicar Market Hall</span>
                      </button>
                    </div>
                  </div>

                  {/* Barra de Búsqueda y Filtros de Categoría */}
                  <div className="flex items-center justify-between p-3 bg-[#0a101f] border border-indigo-950/80 rounded-xl text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={marketSearch}
                          onChange={e => setMarketSearch(e.target.value)}
                          placeholder="Buscar producto en radar..."
                          className="pl-8 pr-3 py-1.5 bg-[#0e172c] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48 sm:w-64"
                        />
                      </div>

                      {[
                        { key: 'all', label: 'Todos' },
                        { key: 'in_stock', label: 'Con Stock en Mano ✨' },
                        { key: 'ultra', label: 'Salida Inmediata ⚡' },
                        { key: 'gems', label: 'Gemas & Lujo 💎' },
                        { key: 'vip', label: 'Cultivos VIP 🍓' }
                      ].map(f => (
                        <button
                          key={f.key}
                          onClick={() => setMarketFilter(f.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            marketFilter === f.key
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                              : 'bg-[#101b33] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      🛡️ Los insumos de misión están protegidos para evitar ventas por error
                    </div>
                  </div>

                  {/* Cuadrícula de Oportunidades de Mercado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {marketOpportunities
                      .filter(opp => {
                        if (marketSearch.trim()) {
                          const q = marketSearch.toLowerCase().trim();
                          if (!opp.name.toLowerCase().includes(q) && !opp.category.toLowerCase().includes(q)) {
                            return false;
                          }
                        }
                        if (marketFilter === 'in_stock') return opp.hasStock;
                        if (marketFilter === 'ultra') return opp.velocity === 'ultra';
                        if (marketFilter === 'gems') return opp.category.includes('Gemas');
                        if (marketFilter === 'vip') return opp.category.includes('VIP');
                        return true;
                      })
                      .map(opp => {
                        const isUltra = opp.velocity === 'ultra';
                        const isHigh = opp.velocity === 'high';

                        return (
                          <div
                            key={opp.id}
                            className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all shadow-md ${
                              opp.isProtected
                                ? 'bg-[#18111e] border-rose-500/50 hover:border-rose-400'
                                : opp.hasStock
                                ? 'bg-[#0d1d22] border-emerald-500/60 shadow-emerald-950/20'
                                : 'bg-[#0c1427] border-indigo-950/90 opacity-75 hover:opacity-100'
                            }`}
                          >
                            <div>
                              {/* Cabecera: Ícono + Nombre + Badge de Rotación */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-2xl">{opp.icon}</span>
                                  <div>
                                    <div className="text-sm font-bold text-white leading-tight">
                                      {opp.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {opp.category}
                                    </div>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${
                                  opp.isProtected
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : isUltra
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : isHigh
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                }`}>
                                  {opp.isProtected ? '🛑 RESERVADO' : opp.tag}
                                </span>
                              </div>

                              {/* Alerta de Protección de Misión si corresponde */}
                              {opp.isProtected && (
                                <div className="mt-2.5 p-2 bg-rose-950/60 border border-rose-500/40 rounded-lg text-[11px] text-rose-200 flex items-center gap-1.5">
                                  <span>⚠️</span>
                                  <span>
                                    <b>No vender:</b> Requerido para <b>{opp.questProtection?.questTitle}</b> (Necesitas {opp.questProtection?.needed}).
                                  </span>
                                </div>
                              )}

                              {/* Precios de Mercado y Velocidad */}
                              <div className="mt-3 grid grid-cols-2 gap-2 bg-[#08101d] p-2.5 rounded-lg border border-slate-800/80 text-xs">
                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase font-mono">Precio Sugerido</div>
                                  <div className="text-amber-300 font-bold font-mono text-sm">
                                    ~{opp.avgPrice}g <span className="text-[10px] text-slate-400 font-normal">({opp.minPrice}-{opp.maxPrice}g)</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase font-mono">Índice de Salida</div>
                                  <div className={`font-bold font-mono text-xs ${isUltra ? 'text-amber-400' : isHigh ? 'text-emerald-400' : 'text-cyan-400'}`}>
                                    {opp.volumeScore}% Demanda Activa
                                  </div>
                                </div>
                              </div>

                              {/* Stock Unificado */}
                              <div className="mt-2.5 flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400 text-[11px]">Tu Stock:</span>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded" title="En Mochila">
                                    🎒 {opp.stock.m}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded" title="En Cofre de la Casa">
                                    🏡 {opp.stock.cc}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-purple-950/60 border border-purple-500/40 text-purple-300 rounded" title="En Cofre del Pueblo">
                                    🏬 {opp.stock.cp}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded font-bold ${
                                    opp.hasStock ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    Total: {opp.stock.total}
                                  </span>
                                </div>
                              </div>

                              {/* Consejo Táctico */}
                              <div className="mt-2.5 text-[11px] text-slate-300 leading-relaxed bg-[#0a1424] p-2 rounded-lg border border-slate-800/60">
                                💡 {opp.tip}
                              </div>
                            </div>

                            {/* Pie de Tarjeta: Potencial de Oro y Acción */}
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 mt-auto">
                              <div>
                                <div className="text-[10px] text-slate-400 uppercase font-mono">Oro en Mano si Vendes</div>
                                <div className={`font-mono font-black text-sm ${opp.hasStock ? 'text-amber-400' : 'text-slate-500'}`}>
                                  {opp.hasStock ? `+${opp.totalPotentialGold.toLocaleString('es-ES')} Oro` : '0g (Sin stock)'}
                                </div>
                              </div>

                              <button
                                onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.market)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  opp.hasStock && !opp.isProtected
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black shadow-md'
                                    : 'bg-[#15233d] hover:bg-[#1c3054] text-slate-300'
                                }`}
                                title="Publicar o Vender en Market Hall de Rowan"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Vender en Rowan</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                )
              )}
            </div>
  );
}
