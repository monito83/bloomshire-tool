// src/components/bloomshire/state/usePlayerState.js
// Estado de la partida del jugador (oro, energia, habilidades, misiones, inventario, pedidos), el tick de
// energia de 15 s, los topes diarios de venta y las cuentas de inventario. Movido tal cual desde BloomshireCommand.
import { useEffect, useMemo, useState } from 'react';
import rulesData from '../../../data/rules.json';
import { computeCanonicalSkillsFromRaw, computeClientLiveEnergyAndBed, computeMaxEnergy } from '../bloomshireEngine';
import { calculateLocalQuantities, getLocalStorageBreakdown, getLocalPlayerItemQty } from './inventoryLocal';

export default function usePlayerState(i18n) {
  const [isVip, setIsVip] = useState(() => {
    try { return localStorage.getItem('bloomshire_cached_is_vip') === 'true'; } catch { return false; }
  });
  const [vipUntil, setVipUntil] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_vip_until')) || 0; } catch { return 0; }
  });
  const [playerPerks, setPlayerPerks] = useState(() => {
    try {
      const cached = localStorage.getItem('bloomshire_cached_perks');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [farmersOwned, setFarmersOwned] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_farmers')) || 0; } catch { return 0; }
  });
  const [farmingLevel, setFarmingLevel] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_farming_level')) || 0; } catch { return 0; }
  });
  const [currentEnergy, setCurrentEnergy] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_energy')) || 0; } catch { return 0; }
  });
  const [maxEnergy, setMaxEnergy] = useState(() => {
    const cachedVip = (() => { try { return localStorage.getItem('bloomshire_cached_is_vip') === 'true'; } catch { return false; } })();
    const cachedFarmers = (() => { try { return Number(localStorage.getItem('bloomshire_cached_farmers')) || 0; } catch { return 0; } })();
    const cachedPerks = (() => { try { const p = localStorage.getItem('bloomshire_cached_perks'); return p ? JSON.parse(p) : null; } catch { return null; } })();
    const isHolder = cachedFarmers > 0 || Boolean(cachedPerks);
    return computeMaxEnergy(cachedVip, isHolder);
  });
  const [rawEnergyObj, setRawEnergyObj] = useState(null);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(() => Date.now());
  const [gold, setGold] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_gold')) || 0; } catch { return 0; }
  });
  const [shards, setShards] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_shards')) || 0; } catch { return 0; }
  });
  const [avyn, setAvyn] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_avyn')) || 0; } catch { return 0; }
  });
  const [activeQuest, setActiveQuest] = useState(() => {
    try { return localStorage.getItem('bloomshire_cached_active_quest') || ''; } catch { return ''; }
  });
  const [activeQuestsList, setActiveQuestsList] = useState([]);
  const [moonmereProgress, setMoonmereProgress] = useState({
    currentChapter: 0,
    completedChapters: 0,
    targetChapter: 24,
    totalChaptersRequired: 24,
    homeChangedDone: false,
    moonmereUnlocked: false,
    moonmereIndex: 0,
    totalMoonmereChapters: 7,
    unlocked: false
  });
  const [energyMeta, setEnergyMeta] = useState(() => {
    const init = computeClientLiveEnergyAndBed(null, 0, Date.now(), { sleepExhausted: false, sleepLeft: 0 }, { farmersCount: farmersOwned });
    return init.energyMeta;
  });
  const [skillsMeta, setSkillsMeta] = useState({
    minSkillKey: 'farming',
    minSkillName: 'Cultivo',
    minSkillsList: ['Cultivo'],
    minSkillLevel: 1,
    maxAllowedLevel: 30,
    isFarmingCapped: false
  });
  const [skillsBreakdown, setSkillsBreakdown] = useState(() => {
    return computeCanonicalSkillsFromRaw({}).skillsBreakdown;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncStale, setIsSyncStale] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date());
  const formattedLastSyncTime = useMemo(() => {
    const d = lastSyncTime instanceof Date ? lastSyncTime : new Date();
    try {
      return new Intl.DateTimeFormat(i18n.language || 'en', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(d);
    } catch {
      return d.toLocaleTimeString();
    }
  }, [lastSyncTime, i18n.language]);

  // Inventory & Liquidation State
  const [inventoryScope, setInventoryScope] = useState('all'); // 'all', 'hotbar', 'chest'
  const [rawInventory, setRawInventory] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});

  // Active Orders (Odette)
  const [activeOrders, setActiveOrders] = useState([]);

  // Tick local cada 15s para actualizar energía pasiva (+1 cada 3m VIP) y cuenta regresiva de Cama UTC
  useEffect(() => {
    const timer = setInterval(() => {
      const isHolder = farmersOwned > 0 || Boolean(playerPerks);
      const updated = computeClientLiveEnergyAndBed(
        rawEnergyObj,
        currentEnergy,
        snapshotTimestamp,
        energyMeta,
        {
          farmersCount: farmersOwned,
          isVip,
          vipUntil,
          maxEnergy: computeMaxEnergy(isVip, isHolder),
          perks: playerPerks,
          buffs: rawEnergyObj?.buffs,
          ate: rawEnergyObj?.ate,
          sold: rawEnergyObj?.sold
        }
      );
      if (rawEnergyObj) {
        setCurrentEnergy(updated.currentEnergy);
      }
      setEnergyMeta(updated.energyMeta);
    }, 15000);
    return () => clearInterval(timer);
  }, [rawEnergyObj, currentEnergy, snapshotTimestamp, energyMeta, farmersOwned, playerPerks, isVip, maxEnergy]);

  // Recalcular cantidades cuando cambia el scope
  useEffect(() => {
    if (rawInventory.length > 0) {
      setItemQuantities(calculateLocalQuantities(rawInventory, inventoryScope));
    }
  }, [inventoryScope]);

  // Límites diarios de venta a tiendas NPC según rules.json (sellLimits = { perItem: 15, things: 60, gold: 12000 })
  const utcDay = Math.floor(Date.now() / 86400000);
  const soldData = rawEnergyObj?.sold || null;
  const isTodaySold = Boolean(soldData && soldData.day === utcDay);
  const soldGoldToday = isTodaySold ? (Number(soldData.gold) || 0) : 0;
  const soldThingsToday = isTodaySold ? (Number(soldData.n) || 0) : 0;
  const soldItemsToday = isTodaySold ? (soldData.items || {}) : {};

  const baseGoldCap = rulesData?.sellLimits?.gold ?? 12000;
  const dailyGoldCap = isVip ? Math.round(baseGoldCap * (rulesData?.vipPerks?.sellGold ?? 1.25)) : baseGoldCap; // VIP otorga bono oficial (rules.VIP_PERKS.sellGold = 1.25)
  const dailyThingsCap = rulesData?.sellLimits?.things ?? 60;
  const dailyPerItemCap = rulesData?.sellLimits?.perItem ?? 15;

  const remainingGoldCap = Math.max(0, dailyGoldCap - soldGoldToday);
  const remainingThingsCap = Math.max(0, dailyThingsCap - soldThingsToday);

  const getItemStorageBreakdown = (itemObj) => getLocalStorageBreakdown(itemObj, rawInventory);
  const getPlayerItemQty = (itemObj) => getLocalPlayerItemQty(itemObj, itemQuantities, rawInventory);

  return {
    isVip, setIsVip, vipUntil, setVipUntil, playerPerks, setPlayerPerks,
    farmersOwned, setFarmersOwned, farmingLevel, setFarmingLevel,
    currentEnergy, setCurrentEnergy, maxEnergy, setMaxEnergy,
    rawEnergyObj, setRawEnergyObj, snapshotTimestamp, setSnapshotTimestamp,
    gold, setGold, shards, setShards, avyn, setAvyn,
    activeQuest, setActiveQuest, activeQuestsList, setActiveQuestsList,
    moonmereProgress, setMoonmereProgress, energyMeta, setEnergyMeta,
    skillsMeta, setSkillsMeta, skillsBreakdown, setSkillsBreakdown,
    isSyncing, setIsSyncing, isSyncStale, setIsSyncStale, lastSyncTime, setLastSyncTime, formattedLastSyncTime,
    inventoryScope, setInventoryScope, rawInventory, setRawInventory, itemQuantities, setItemQuantities,
    activeOrders, setActiveOrders,
    soldGoldToday, soldThingsToday, soldItemsToday,
    dailyGoldCap, dailyThingsCap, dailyPerItemCap, remainingGoldCap, remainingThingsCap,
    getItemStorageBreakdown, getPlayerItemQty
  };
}
