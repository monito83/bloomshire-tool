import React, { useState, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  Zap,
  MapPin,
  Trash2,
  RotateCcw,
  Search,
  Check,
  RefreshCw
} from 'lucide-react';
import MarketRadar from '../market/MarketRadar';
import defaultInventoryCatalog from '../../../../public/data/bloomshire/inventory_catalog.json';
import { NpcAvatar } from '../../BloomshireMegaAtlas';
import {
  CRAFT_STATION_LOCATIONS,
  getStorageType,
  getItemStorageBreakdown as getItemStorageBreakdownHelper,
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
  initialSubTab,
  getPlayerItemQty: propGetPlayerItemQty,
  openItemsSearch
}) {
  const { t, i18n } = useTranslation('inventory');
  const isEn = String(i18n.language || '').toLowerCase().startsWith('en');
  const fmt = (n) => Number(n || 0).toLocaleString(i18n.language);
  // En ingles, el id del catalogo es el nombre del juego (en espanol el catalogo trae su propio nombre)
  const itemLabel = (item) => (isEn ? item.id : item.name);
  const inventoryCatalogData = propCatalogData || defaultInventoryCatalog;
  const [economySubTab, setEconomySubTab] = useState(() => {
    if (initialSubTab) return initialSubTab;
    return (walletAddress && walletAddress !== 'null' && walletAddress.startsWith('0x')) ? 'liquidation' : 'arbitrage';
  });
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [inventorySortBy, setInventorySortBy] = useState('owned_desc');

  // Helpers de desglose vinculados al inventario vivo
  const getItemStorageBreakdown = (itemObj) => getItemStorageBreakdownHelper(itemObj, rawInventory);
  const getOrderBreakdown = (ord) => getOrderBreakdownHelper(ord, rawInventory, inventoryCatalogData);
  const getOrderAvailableQty = (ord) => getOrderAvailableQtyHelper(ord, rawInventory, inventoryCatalogData);
  const getPlayerItemQty = propGetPlayerItemQty || ((itemObj) => {
    if (!itemObj) return 0;
    const idRaw = (itemObj.id || '').trim();
    if (itemQuantities[idRaw] !== undefined && itemQuantities[idRaw] > 0) {
      return itemQuantities[idRaw];
    }
    return getItemStorageBreakdown(itemObj).total;
  });

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
            ? t('liq.reasonLevel', { n: reqLevel })
            : (item.cat === 'food' ? t('liq.reasonFood') : t('liq.reasonVip'))
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
        String(item.id || '').toLowerCase().includes(q) ||
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
      if (inventorySortBy === 'name_asc') return itemLabel(a).localeCompare(itemLabel(b));
      return 0;
    });

    return list;
  }, [itemQuantities, inventorySearchQuery, inventorySortBy, inventoryCatalogData, isEn]);


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
                  <span>{t('tabs.liquidation')}</span>{!isConnected && <span className="text-[10px] ml-1">🔒</span>}
                </button>
                <button
                  onClick={() => setEconomySubTab('odette')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    economySubTab === 'odette'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{t('tabs.odette')}</span>{!isConnected && <span className="text-[10px] ml-1">🔒</span>}
                  {readyOrdersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                      {t('tabs.ready', { count: readyOrdersCount })}
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
                  <span>{t('tabs.arbitrage')}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {t('tabs.new')}
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
                  <span>{t('tabs.radar')}</span>{!isConnected && <span className="text-[10px] ml-1">🔒</span>}
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                    {t('tabs.hot')}
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
                          <span className="uppercase">{t('arb.title')}</span>
                        </div>
                        <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                          <Trans t={t} i18nKey="arb.subtitle" components={{ b: <b /> }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{t('arb.cost')}</span>
                        </div>
                        <button
                          onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.cook)}
                          className="px-3 py-1 rounded-lg bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title={t('arb.locateTitle')}
                        >
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('arb.locate')}</span>
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
                        matsEn: '1x Flour (15g)',
                        matsCost: 15,
                        energyCost: 1,
                        cookedItem: 'Fish Pie (Tarta de Pescado)',
                        cookedPrice: 165,
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
                        matsEn: '1x Potato (45g)',
                        matsCost: 45,
                        energyCost: 1,
                        cookedItem: 'Fish Stew (Guiso de Pescado)',
                        cookedPrice: 210,
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
                        matsEn: '1x Parsnip (25g)',
                        matsCost: 25,
                        energyCost: 1,
                        cookedItem: 'Vegetable Plate (Plato Verduras)',
                        cookedPrice: 95,
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
                        matsEn: '1x Butter (35g)',
                        matsCost: 35,
                        energyCost: 1,
                        cookedItem: 'Roast Fish Platter (Bandeja Asada)',
                        cookedPrice: 340,
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
                        matsEn: '1x Oil (10g)',
                        matsCost: 10,
                        energyCost: 1,
                        cookedItem: 'Fried Fish (Pescado Frito)',
                        cookedPrice: 90,
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
                        matsEn: 'Milling flour (10g)',
                        matsCost: 10,
                        energyCost: 1,
                        cookedItem: 'Bread (Pan Casero)',
                        cookedPrice: 280,
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
                                  <div className="font-bold text-xs text-white truncate leading-tight" title={isEn ? arb.rawId : arb.rawItem}>
                                    {isEn ? arb.rawId : arb.rawItem}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {owned > 0 ? (
                                      <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/30">
                                        {t('arb.bag', { n: owned })}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">{t('arb.noStock')}</span>
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
                                  <span className="truncate">{isEn ? arb.cookedItem.split(' (')[0] : arb.cookedItem}</span>
                                </span>
                                <span className="text-[10px] text-purple-300 font-mono font-bold shrink-0 ml-1">
                                  +{arb.xp} XP
                                </span>
                              </div>
                              <div className="text-[10.5px] text-slate-400 truncate">
                                🛒 {isEn ? (arb.matsCost > 0 ? arb.matsEn : t('arb.noMats')) : arb.secondMats}
                              </div>
                            </div>

                            {/* Fila 3: Micro-desglose financiero */}
                            <div className="grid grid-cols-3 gap-1 p-1.5 bg-[#091122] rounded-lg border border-slate-800/60 text-[10.5px] text-center font-mono">
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">{t('arb.raw')}</div>
                                <div className="text-amber-300 font-bold">{arb.rawPrice}g</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">{t('arb.mats')}</div>
                                <div className="text-slate-300 font-semibold">{arb.matsCost > 0 ? `-${arb.matsCost}g` : '0g'}</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">{t('arb.sale')}</div>
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
                                <span className="text-amber-300 font-bold" title={t('arb.totalTitle')}>
                                  +{fmt(arb.netProfit * owned)}g
                                </span>
                              )}
                              <button
                                onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.cook)}
                                className="w-6 h-6 rounded bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center cursor-pointer transition-all shrink-0"
                                title={t('arb.locateTitle')}
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
                    title={t('liq.lockedTitle')}
                    description={t('liq.lockedDesc')}
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
                            <span>{t('liq.personal')}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-mono">{t('liq.freeMode')}</span>
                          </div>
                          <div className="text-xs text-slate-300 max-w-xl mt-0.5">
                            <Trans t={t} i18nKey="liq.personalDesc" components={{ b: <b /> }} />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowConnectModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer shrink-0"
                      >
                        {t('liq.connect')}
                      </button>
                    </div>
                  )}
                  <div className="p-4 bg-[#0e172c] border-2 border-amber-500/60 rounded-xl flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {t('liq.total')}
                        </div>
                        <div className="text-3xl font-black text-amber-400 font-mono tracking-wider mt-0.5">
                          {t('liq.gold', { gold: fmt(totalLiquidationValue) })}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{t('liq.slots', { n: inventoryCounts.total })}</span>
                          <span>•</span>
                          <span className="text-cyan-300 font-semibold">{t('liq.bagSlots', { count: inventoryCounts.hotbar })}</span>
                          <span>•</span>
                          <span className="text-amber-300 font-semibold">{t('liq.homeSlots', { count: inventoryCounts.homeChest })}</span>
                          <span>•</span>
                          <span className="text-purple-300 font-semibold">{t('liq.townSlots', { count: inventoryCounts.townChest })}</span>
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
                          <Trash2 className="w-3.5 h-3.5" /> {t('liq.clear')}
                        </button>
                        <button 
                          onClick={() => {
                            const syn = calculateQuantitiesFromRaw(rawInventory, inventoryScope);
                            setItemQuantities(syn);
                          }}
                          className="px-3 py-1.5 bg-[#142245] hover:bg-[#1a2c5a] border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title={t('liq.restoreTitle')}
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> {t('liq.restore')}
                        </button>
                      </div>
                    </div>

                    {/* Botones de Filtro por Almacén: Todo / Mochila / Cofre Casa / Cofre Pueblo */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase mr-1">{t('liq.filter')}</span>
                      {[
                        { key: 'all', label: t('liq.all'), count: inventoryCounts.total, color: 'border-slate-700' },
                        { key: 'hotbar', label: t('liq.bag'), count: inventoryCounts.hotbar, color: 'text-cyan-300 border-cyan-500/40' },
                        { key: 'home_chest', label: t('liq.home'), count: inventoryCounts.homeChest, color: 'text-amber-300 border-amber-500/40' },
                        { key: 'town_chest', label: t('liq.town'), count: inventoryCounts.townChest, color: 'text-purple-300 border-purple-500/40' }
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
                          placeholder={t('liq.search')}
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
                        <span className="text-[10.5px] font-bold text-slate-400">{t('liq.sort')}</span>
                        <select
                          value={inventorySortBy}
                          onChange={(e) => setInventorySortBy(e.target.value)}
                          className="bg-[#14203d] border border-slate-700 text-amber-300 rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="owned_desc">{t('liq.sortOwned')}</option>
                          <option value="value_desc">{t('liq.sortValue')}</option>
                          <option value="qty_desc">{t('liq.sortQty')}</option>
                          <option value="name_asc">{t('liq.sortName')}</option>
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
                                <div className="font-bold text-xs text-white truncate leading-snug" title={itemLabel(item)}>
                                  {itemLabel(item)}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono flex-wrap">
                                  <span className="text-amber-400 font-bold">{t('liq.unit', { price: unitPrice })}</span>
                                  {isFood ? (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-blue-950 text-blue-300 border border-blue-500/40" title={t('liq.foodTitle')}>
                                      {t('liq.food')}
                                    </span>
                                  ) : isVipCrop ? (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-purple-950 text-purple-300 border border-purple-500/40" title={t('liq.vipTitle')}>
                                      {t('liq.vip')}
                                    </span>
                                  ) : detail.isLevelLocked ? (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-rose-950 text-rose-300 border border-rose-500/40" title={t('liq.lockedLvlTitle', { n: detail.reqLevel })}>
                                      {t('liq.lockedLvl', { n: detail.reqLevel })}
                                    </span>
                                  ) : (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-slate-800 text-slate-300">
                                      {t('liq.npc')}
                                    </span>
                                  )}
                                  {bd.total > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-600">•</span>
                                      {bd.m > 0 && <span title={t('liq.inBag')} className="text-cyan-400 font-bold">🎒{bd.m}</span>}
                                      {bd.cc > 0 && <span title={t('liq.inHome')} className="text-amber-400 font-bold">🏡{bd.cc}</span>}
                                      {bd.cp > 0 && <span title={t('liq.inTown')} className="text-purple-400 font-bold">🏬{bd.cp}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {qty > 0 && (
                              <div className="text-right shrink-0">
                                <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded block">
                                  +{fmt((detail.npcGold || 0) + (detail.p2pGold || 0))}g
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Fila Intermedia: Desglose NPC vs Excedente */}
                          {qty > 0 && (
                            <div className="text-[10px] font-mono bg-[#091122] p-1.5 rounded border border-slate-800/80 flex flex-col gap-0.5">
                              {detail.npcSellQty > 0 && (
                                <div className="text-emerald-300 flex justify-between">
                                  <span>{t('liq.npcToday')}</span>
                                  <b>{detail.npcSellQty}x (+{detail.npcGold}g)</b>
                                </div>
                              )}
                              {detail.p2pQty > 0 && (
                                <div className="text-purple-300 flex justify-between">
                                  <span>{isFood || isVipCrop ? t('liq.market') : t('liq.surplus')}</span>
                                  <b>{detail.p2pQty}x (+{detail.p2pGold}g)</b>
                                </div>
                              )}
                              {!isFood && !isVipCrop && detail.itemQuotaLeft <= 0 && (
                                <div className="text-rose-400 text-[9px] font-bold">
                                  {t('liq.capReached')}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Fila Inferior: Indicador de Venta + Stepper con Botones */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 mt-0.5">
                            <span className="text-[10px] font-mono">
                              {qty > 0 ? (
                                <span className="text-emerald-400 font-bold">{t('liq.totalQty', { n: qty })}</span>
                              ) : (
                                <span className="text-slate-500">{t('liq.none')}</span>
                              )}
                            </span>

                            <div className="flex items-center shrink-0">
                              <button 
                                onClick={() => setItemQuantities(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                                className="w-6 h-6 rounded-l bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 transition-all"
                                title={t('liq.minus')}
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
                                title={t('liq.plus')}
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
                    title={t('odette.lockedTitle')}
                    description={t('odette.lockedDesc')}
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
                            <span className="uppercase">{t('odette.title')}</span>
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {t('odette.badge')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                          <Trans t={t} i18nKey="odette.desc" components={{ b: <b /> }} />
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <div className="px-3.5 py-1.5 rounded-xl bg-[#091122] border border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">{t('odette.ready')}</div>
                        <div className={`font-mono text-sm font-black ${readyOrdersCount > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {t('odette.readyCount', { n: readyOrdersCount, total: activeOrders.length })}
                        </div>
                      </div>
                      <button
                        onClick={() => locateInMegaAtlas({
                          label: t('odette.shopLabel'),
                          regionId: 'bloomshire_town',
                          subZoneId: 'bloomshire_town_sub_1_bloomshire',
                          wx: 5510,
                          wy: 4326,
                          worldRect: [5380, 4200, 260, 240]
                        })}
                        className="px-3.5 py-2 bg-[#142245] hover:bg-[#1b2d5c] border border-amber-500/50 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                        title={t('odette.locateTitle')}
                      >
                        <MapPin className="w-4 h-4 text-amber-400" />
                        <span>{t('odette.locate')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Barra de Totales y Filtros */}
                  <div className="flex items-center justify-between p-3 bg-[#0a101f] border border-indigo-950/80 rounded-xl text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-slate-300 font-mono">
                      <span><Trans t={t} i18nKey="odette.available" values={{ n: activeOrders.length }} components={{ b: <b className="text-white" /> }} /></span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">
                        {t('odette.potential', { gold: fmt(activeOrders.reduce((sum, o) => sum + (o.gold || 0), 0)) })}
                      </span>
                      <span>•</span>
                      <span className="text-cyan-300 font-bold">
                        {t('odette.xp', { xp: activeOrders.reduce((sum, o) => sum + (o.xp || 0), 0) })}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      {t('odette.renew')}
                    </div>
                  </div>

                  {/* Cuadrícula de Pedidos Diarios (3 columnas amplias y detalladas) */}
                  {activeOrders.length === 0 ? (
                    <div className="p-8 bg-[#0a1020] border border-slate-800 rounded-xl text-center flex flex-col items-center justify-center gap-3 my-4">
                      <span className="text-4xl">📜</span>
                      <h3 className="font-bold text-white text-base">{t('odette.waiting')}</h3>
                      <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                        <Trans t={t} i18nKey="odette.waitingDesc" components={{ b: <b /> }} />
                      </p>
                      <button
                        onClick={() => setShowConnectModal(true)}
                        className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
                      >
                        {t('odette.connect')}
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
                                    {t('odette.order', { n: i + 1 })}
                                  </div>
                                </div>
                              </div>

                              <div>
                                {ord.done ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                    {t('odette.delivered')}
                                  </span>
                                ) : hasEnough ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-400" /> {t('odette.readyBadge')}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                    {t('odette.missing', { n: required - available })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Recompensas */}
                            <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-[#080d17] rounded-lg border border-slate-800 text-xs">
                              <div>
                                <div className="text-[9.5px] text-slate-400 font-bold uppercase">{t('odette.goldReward')}</div>
                                <div className="font-mono text-amber-400 font-black text-sm flex items-center gap-1">
                                  <span>🪙 +{ord.gold}g</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[9.5px] text-slate-400 font-bold uppercase">{t('odette.xpReward')}</div>
                                <div className="font-mono text-cyan-300 font-black text-sm">
                                  ⚡ +{ord.xp} XP {ord.skill || ''}
                                </div>
                              </div>
                            </div>

                            {/* Barra de Progreso y Stock en Almacenes */}
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">{t('odette.progress')}</span>
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
                                  <span>{t('odette.where')}</span>
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
                              onClick={() => openItemsSearch && openItemsSearch(ord.rawItem || ord.item)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Search className="w-3 h-3" />
                              <span>{t('odette.find', { item: ord.rawItem || ord.item })}</span>
                            </button>

                            {hasEnough && !ord.done && (
                              <button
                                onClick={() => locateInMegaAtlas({
                                  label: t('odette.shopLabel'),
                                  regionId: 'bloomshire_town',
                                  subZoneId: 'bloomshire_town_sub_1_bloomshire',
                                  wx: 5510,
                                  wy: 4326,
                                  worldRect: [5380, 4200, 260, 240]
                                })}
                                className="px-2 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <MapPin className="w-3 h-3 text-emerald-400" />
                                <span>{t('odette.deliver')}</span>
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
                    title={t('radar.lockedTitle')}
                    description={t('radar.lockedDesc')}
                    onConnect={() => setShowConnectModal(true)}
                    onBack={() => setEconomySubTab('arbitrage')}
                  />
                ) : (
                <MarketRadar
                  rawInventory={rawInventory}
                  activeQuestMaterials={activeQuestMaterials}
                  soldItemsToday={soldItemsToday}
                  dailyPerItemCap={dailyPerItemCap}
                  onLocateMarket={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.market)}
                />
                )
              )}
            </div>
  );
}
