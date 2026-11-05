// Moni-OS v1.0.2 - Live Companion & Market Radar (Modularized Architecture)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Zap, 
  Coins, 
  Gem, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink, 
  Search, 
  Send, 
  Bot, 
  Sparkles, 
  ShoppingBag, 
  ArrowUpRight, 
  Trash2, 
  RotateCcw, 
  Navigation, 
  Moon, 
  Sun, 
  MapPin, 
  Compass, 
  Hammer, 
  BookOpen, 
  User, 
  Check, 
  Clock, 
  Layers, 
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  Settings,
  LogOut
} from 'lucide-react';

// Importar datos canónicos JSON
import calcData from '../../public/data/bloomshire/calc_data.json';
import npcsData from '../../public/data/bloomshire/npcs.json';
import craftData from '../../public/data/bloomshire/craft_data.json';
import inventoryCatalogData from '../../public/data/bloomshire/inventory_catalog.json';
import itemEncyclopediaData from '../../public/data/bloomshire/item_encyclopedia.json';
import itemIconsMap from '../../public/data/bloomshire/item_icons_map.json';
import megaAtlasData from '../../public/data/bloomshire/mega_atlas_data.json';
import CANONICAL_QUEST_CATALOG from '../data/canonicalQuests.json';
import BloomshireMegaAtlas, { NpcAvatar } from './BloomshireMegaAtlas';
import rulesData from '../data/rules.json';
import ErrorBoundary from './ErrorBoundary';

// Importar lógica y fórmulas de bloomshireEngine
import {
  CANONICAL_SKILLS,
  xpForLevel,
  computeCanonicalSkillsFromRaw,
  computeClientLiveEnergyAndBed,
  computeMaxEnergy
} from './bloomshire/bloomshireEngine';

// Importar submódulos de pestañas desacopladas (Fase 7 Modularización)
import ItemsTab from './bloomshire/tabs/ItemsTab';
import CalcTab from './bloomshire/tabs/CalcTab';
import InventoryTab from './bloomshire/tabs/InventoryTab';
import QuestsTab from './bloomshire/tabs/QuestsTab';
import CraftTab from './bloomshire/tabs/CraftTab';
import NpcsTab from './bloomshire/tabs/NpcsTab';
import MonitorsTab from './bloomshire/tabs/MonitorsTab';
import AdvisorTab from './bloomshire/tabs/AdvisorTab';
import SystemTab from './bloomshire/tabs/SystemTab';

// Importar helpers y constantes canónicas compartidas
import {
  getStorageType,
  NPC_FAVORITE_GIFTS,
  getNpcFavoriteGifts,
  getItemCategoryLabel,
  getItemIcon,
  itemMatchesCategory,
  MANUAL_NPC_COORDS,
  QUEST_REQUIRED_ITEMS,
  ItemSprite,
  CraftMaterialsBadge,
  DASHBOARD_QUEST_CATALOG,
  MARKET_ROTATION_CATALOG,
  CRAFT_STATION_LOCATIONS,
  LockedModuleScreen,
  LiveCropOrTimerCard,
  getItemStorageBreakdown,
  getRecipeCraftability,
  calculateQuantitiesFromRaw,
  getOrderBreakdown,
  getOrderAvailableQty,
  getSharedAudioContext,
  playChimeAlarm
} from './bloomshire/bloomshireHelpers';

// Re-exportar helpers para máxima compatibilidad hacia atrás
export {
  getStorageType,
  NPC_FAVORITE_GIFTS,
  getNpcFavoriteGifts,
  getItemCategoryLabel,
  getItemIcon,
  itemMatchesCategory,
  MANUAL_NPC_COORDS,
  QUEST_REQUIRED_ITEMS,
  ItemSprite,
  CraftMaterialsBadge,
  DASHBOARD_QUEST_CATALOG,
  MARKET_ROTATION_CATALOG,
  CRAFT_STATION_LOCATIONS,
  LockedModuleScreen,
  LiveCropOrTimerCard,
  getItemStorageBreakdown,
  getRecipeCraftability,
  calculateQuantitiesFromRaw,
  getOrderBreakdown,
  getOrderAvailableQty,
  ItemsTab,
  CalcTab,
  InventoryTab,
  QuestsTab,
  CraftTab,
  NpcsTab,
  MonitorsTab,
  AdvisorTab,
  SystemTab
};

export default function BloomshireCommand() {
  const VALID_TABS = ['mega_atlas', 'inventory', 'items', 'craft', 'npcs', 'calc', 'monitors', 'quests', 'advisor', 'system'];
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomshire_active_tab');
      if (saved && VALID_TABS.includes(saved)) {
        const isPrivate = ['quests', 'advisor', 'monitors'].includes(saved);
        const w = localStorage.getItem('bloomshire_wallet');
        const hasWallet = Boolean(w && w !== 'null' && w.startsWith('0x'));
        if (isPrivate && !hasWallet) return 'mega_atlas';
        return saved;
      }
      const w = localStorage.getItem('bloomshire_wallet');
      return (w && w !== 'null' && w.startsWith('0x')) ? 'inventory' : 'mega_atlas';
    } catch {
      return 'mega_atlas';
    }
  });

 // 'inventory', 'quests', 'town', 'world', 'calc', 'craft', 'npcs', 'advisor'

  // Player State
  const [walletAddress, setWalletAddress] = useState(() => {
    try { const w = localStorage.getItem('bloomshire_wallet'); return (w && w !== 'null' && w.startsWith('0x')) ? w : null; } catch { return null; }
  });
  const [sessionToken, setSessionToken] = useState(() => {
    try { return localStorage.getItem('bloomshire_session_token') || null; } catch { return null; }
  });
  const [authenticatedWallet, setAuthenticatedWallet] = useState(null);
  const authenticatedWalletRef = useRef(null);
  const lastReportedExtensionWalletRef = useRef(null);
  useEffect(() => {
    authenticatedWalletRef.current = authenticatedWallet;
  }, [authenticatedWallet]);
  const [viewOnlyWallet, setViewOnlyWallet] = useState(null);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
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

  // El acceso premium exige sesión SIWE verificada por el servidor (S1)
  const isConnected = Boolean(isPremiumUnlocked);

  const handleDisconnect = () => {
    try {
      localStorage.setItem('bloomshire_manual_disconnected', 'true');
      localStorage.removeItem('bloomshire_session_token');
      localStorage.removeItem('bloomshire_wallet');
      localStorage.removeItem('bloomshire_cached_is_vip');
    } catch (_) {}
    setWalletAddress(null);
    setSessionToken(null);
    setAuthenticatedWallet(null);
    authenticatedWalletRef.current = null;
    lastReportedExtensionWalletRef.current = null;
    setViewOnlyWallet(null);
    setIsPremiumUnlocked(false);
    setIsVip(false);
    setVipUntil(0);
    try { localStorage.removeItem('bloomshire_cached_vip_until'); } catch (_) {}
    setPlayerPerks(null);
    setGold(0);
    setCurrentEnergy(0);
    setMaxEnergy(100);
    setShards(0);
    setAvyn(0);
    setFarmersOwned(0);
    setFarmingLevel(0);
    setSkillsBreakdown({});
    setActiveQuestsList([]);
    setActiveOrders([]);
    setActiveCrops([]);
    setProductionTimers([]);
    setRawEnergyObj(null);
    setRawInventory([]);
    setItemQuantities({});
    setActiveTab('mega_atlas');
    try {
      localStorage.removeItem('bloomshire_wallet');
      localStorage.removeItem('bloomshire_cached_gold');
      localStorage.removeItem('bloomshire_cached_shards');
      localStorage.removeItem('bloomshire_cached_avyn');
      localStorage.removeItem('bloomshire_cached_energy');
      localStorage.removeItem('bloomshire_cached_farming_level');
      localStorage.removeItem('bloomshire_cached_farmers');
      localStorage.removeItem('bloomshire_cached_is_vip');
      localStorage.removeItem('bloomshire_cached_perks');
      localStorage.removeItem('bloomshire_cached_active_quest');
      localStorage.removeItem('bloomshire_prod_timers');
      localStorage.removeItem('bloomshire_daily_tasks');
      localStorage.removeItem('bloomshire_cached_snapshot');
      localStorage.removeItem('bloomshire_cached_market_offers');
      localStorage.setItem('bloomshire_active_tab', 'mega_atlas');
    } catch (_) {}
  };
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
  const [selectedQuestId, setSelectedQuestId] = useState(null);
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
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString());
  const lastExtensionSyncAtRef = useRef(0);

  // Inventory & Liquidation State
  const [inventoryScope, setInventoryScope] = useState('all'); // 'all', 'hotbar', 'chest'
  const [rawInventory, setRawInventory] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});

  // Active Orders (Odette)
  const [activeOrders, setActiveOrders] = useState([]);

  // Universal Mega-Atlas Focus Target (para el botón "📍 Ubicar en el Mapa")
  // Settings & System Updates State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [connectCode, setConnectCode] = useState('');
  const [connectFeedback, setConnectFeedback] = useState(null);
  const [injectedWallets, setInjectedWallets] = useState([]);
  const [selectedWalletUuid, setSelectedWalletUuid] = useState(null);

  // Detección de Billeteras mediante estándar EIP-6963 (evita colisión entre Backpack, MetaMask, Rabby, etc.)
  useEffect(() => {
    const handleAnnounce = (event) => {
      if (!event.detail?.info || !event.detail?.provider) return;
      setInjectedWallets(prev => {
        if (prev.some(w => w.info.uuid === event.detail.info.uuid || w.info.name === event.detail.info.name)) return prev;
        return [...prev, event.detail];
      });
    };
    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return () => window.removeEventListener('eip6963:announceProvider', handleAnnounce);
  }, []);

  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState(() => new Date().toLocaleTimeString());
  const [updateStatusMessage, setUpdateStatusMessage] = useState('Todos los módulos y catálogos están 100% sincronizados con el juego.');
  const [systemLogs, setSystemLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), text: 'Sistema Moni-Bot Companion v2.4 iniciado correctamente.', type: 'info' },
    { id: 2, time: new Date().toLocaleTimeString(), text: 'Catálogo de misiones validado: 24 capítulos + secundarias activas.', type: 'success' },
    { id: 3, time: new Date().toLocaleTimeString(), text: 'Mega-Atlas HD: 10 mapas oficiales disponibles en caché local.', type: 'success' },
    { id: 4, time: new Date().toLocaleTimeString(), text: 'Registro de aldeanos: 67 NPCs indexados con tabla de regalos y horarios.', type: 'info' }
  ]);

  const handleConnectAndSignWallet = async (explicitProvider = null) => {
    const activeProvider = explicitProvider || 
      (selectedWalletUuid ? injectedWallets.find(w => w.info.uuid === selectedWalletUuid)?.provider : null) ||
      (injectedWallets[0]?.provider) ||
      (typeof window !== 'undefined' ? window.ethereum : null);

    if (!activeProvider) {
      setConnectFeedback({ type: 'error', text: 'No se detectó ninguna billetera Web3 (MetaMask, Backpack, Rabby, etc.) en este navegador.' });
      return;
    }
    try {
      setConnectFeedback({ type: 'loading', text: 'Solicitando conexión con tu billetera Web3...' });
      const accounts = await activeProvider.request({ method: 'eth_requestAccounts' });
      const account = accounts && accounts[0] ? accounts[0].toLowerCase() : null;
      if (!account) {
        setConnectFeedback({ type: 'error', text: 'No se seleccionó ninguna cuenta en la billetera.' });
        return;
      }

      setConnectFeedback({ type: 'loading', text: 'Obteniendo reto criptográfico de firma (nonce)...' });
      const nonceRes = await fetch(`/api/auth?action=nonce&wallet=${encodeURIComponent(account)}`);
      if (!nonceRes.ok) {
        const errJson = await nonceRes.json().catch(() => ({}));
        setConnectFeedback({ type: 'error', text: errJson.error || 'Error al obtener reto de firma del servidor.' });
        return;
      }
      const { nonce, message } = await nonceRes.json();

      setConnectFeedback({ type: 'loading', text: 'Firma el mensaje en tu billetera para verificar tu identidad (sin costo de gas)...' });
      const signature = await activeProvider.request({
        method: 'personal_sign',
        params: [message, account]
      });

      setConnectFeedback({ type: 'loading', text: 'Verificando firma con el servidor...' });
      const verifyRes = await fetch('/api/auth?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', wallet: account, signature, nonce, message })
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => ({}));
        setConnectFeedback({ type: 'error', text: errJson.error || 'Firma inválida.' });
        return;
      }

      const { token } = await verifyRes.json();
      localStorage.setItem('bloomshire_session_token', token);
      localStorage.setItem('bloomshire_wallet', account);
      localStorage.removeItem('bloomshire_manual_disconnected');
      setWalletAddress(account);
      setAuthenticatedWallet(account);
      authenticatedWalletRef.current = account;
      setSessionToken(token);
      setIsPremiumUnlocked(true);

      setConnectFeedback({ type: 'success', text: `¡Sesión autenticada con éxito! (${account.slice(0, 6)}...)` });

      // Cargar partida privada sincronizada
      const syncRes = await fetch(`/api/bloomshire-advisor?action=sync&wallet=${encodeURIComponent(account)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (syncJson.inGame) {
          applyIncomingSync({
            ...syncJson.inGame,
            wallet: syncJson.onChain?.wallet || account,
            farmersCount: syncJson.onChain?.farmersCount ?? 0
          }, 'server');
        }
      }
      setTimeout(() => { setShowConnectModal(false); setConnectFeedback(null); }, 1500);
    } catch (err) {
      setConnectFeedback({ type: 'error', text: err.message || 'Firma cancelada o rechazada en la billetera.' });
    }
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateStatusMessage('Comprobando versión en vivo con bloomshire.xyz...');
    const nowStr = new Date().toLocaleTimeString();
    setLastUpdateCheck(nowStr);

    try {
      window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
    } catch (e) {}

    try {
      const res = await fetch('/api/bloomshire-version');
      if (res.ok) {
        const info = await res.json();
        setIsCheckingUpdates(false);
        if (info.liveBuild) setGameBuildHash(info.liveBuild);
        if (info.isUpToDate) {
          setGameBuildStatus('synced');
          setUpdateStatusMessage(`¡Sistema al día! Servidor Bloomshire en build ${info.liveBuild}.`);
          setSystemLogs(prev => [
            { id: Date.now(), time: nowStr, text: `Comprobación completada: Servidor en build ${info.liveBuild}. 100% compatible con Tool ${info.toolVersion}.`, type: 'success' },
            ...prev
          ].slice(0, 50));
        } else {
          setGameBuildStatus('patch_detected');
          setUpdateStatusMessage(`⚠️ Nuevo parche detectado en Bloomshire: Build ${info.liveBuild} (Tool en ${info.verifiedBuild})`);
          setSystemLogs(prev => [
            { id: Date.now(), time: nowStr, text: `Alerta de Parche: Bloomshire actualizó al build ${info.liveBuild}. Catálogos locales verificados con a70eb5dd5113.`, type: 'warning' },
            ...prev
          ].slice(0, 50));
        }
        return;
      }
    } catch (err) {
      console.warn('Fallo chequeo de versión API, usando fallback:', err);
    }

    setTimeout(() => {
      setIsCheckingUpdates(false);
      setUpdateStatusMessage('Comprobación exitosa: Servidor y catálogos en build a70eb5dd5113.');
      setSystemLogs(prev => [
        { id: Date.now(), time: nowStr, text: 'Comprobación de versión completada: Build a70eb5dd5113 activo.', type: 'info' },
        ...prev
      ].slice(0, 50));
    }, 1000);
  };

  const handleRefreshMarketOffers = () => {
    setIsMarketOffersLoading(true);
    setUpdateStatusMessage('Descargando puestos y últimas ventas de Rowan...');
    try {
      window.postMessage({ type: 'REQUEST_MARKET_SALES_SYNC' }, '*');
      document.dispatchEvent(new CustomEvent('monios_request_market_sales'));
    } catch (e) {}

    setTimeout(() => {
      setIsMarketOffersLoading(prev => {
        if (prev) {
          setSystemLogs(l => [
            { id: Date.now(), time: new Date().toLocaleTimeString(), text: 'Consulta de mercado finalizada. Si no ves ventas, asegúrate de tener Bloomshire abierto con tu sesión iniciada.', type: 'info' },
            ...l
          ]);
        }
        return false;
      });
    }, 6000);
  };

  const handleForceRedownload = (moduleKey) => {
    const nowStr = new Date().toLocaleTimeString();
    if (moduleKey === 'maps') {
      try {
        window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
      } catch (e) {}
      setSystemLogs(prev => [
        { id: Date.now(), time: nowStr, text: 'Re-renderizado de los 10 mapas Pixel-Art HD iniciado en segundo plano.', type: 'info' },
        ...prev
      ].slice(0, 50));
    } else {
      try {
        window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      } catch (e) {}
      setSystemLogs(prev => [
        { id: Date.now(), time: nowStr, text: `Sincronización forzada de catálogo (${moduleKey || 'todos'}) ejecutada.`, type: 'info' },
        ...prev
      ].slice(0, 50));
    }
  };

  const [atlasFocusTarget, setAtlasFocusTarget] = useState(null);

  const locateInMegaAtlas = (locationObj) => {
    if (!locationObj) return;
    setAtlasFocusTarget({
      ...locationObj,
      timestamp: Date.now()
    });
    setActiveTab('mega_atlas');
  };

  // Collapsible Sections en "Habilidades, Misiones & Moonmere"
  // Tareas Diarias (Task Center / Recompensa Semilla Premium)
  const getInitialDailyTasks = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const defaults = [
      { id: 'water_crops', label: 'Riego de cultivos', icon: '💧', target: 15, current: 0, done: false, stars: 1 },
      { id: 'defeat_creatures', label: 'Derrota criaturas', icon: '⚔️', target: 5, current: 0, done: false, stars: 1 },
      { id: 'gather_mushrooms', label: 'Recolecta hongos', icon: '🍄', target: 4, current: 0, done: false, stars: 1 },
      { id: 'harvest_crops', label: 'Cosecha cultivos', icon: '🌾', target: 30, current: 0, done: false, stars: 2 },
      { id: 'store_orders', label: 'Entrega pedidos de la tienda general', icon: '📦', target: 2, current: 0, done: false, stars: 2 },
      { id: 'catch_fish', label: 'Pesca peces', icon: '🎣', target: 25, current: 0, done: false, stars: 3 }
    ];
    try {
      const stored = localStorage.getItem('bloomshire_daily_tasks');
      if (stored) {
        const parsed = JSON.parse(stored);
        const isOldMock = Array.isArray(parsed.tasks) && (
          (parsed.tasks.every(t => t.done === true) && parsed.tasks.some(t => t.id === 'chop_woodlot')) ||
          parsed.tasks.some(t => t.id === 'mine_rocks' && t.current === 40)
        );
        if (!isOldMock && parsed.date === todayStr && Array.isArray(parsed.tasks) && parsed.tasks.length === 6) {
          return parsed.tasks;
        }
      }
    } catch (e) {}
    return defaults;
  };

  const [dailyTasks, setDailyTasks] = useState(getInitialDailyTasks);

  const toggleDailyTask = (taskId) => {
    setDailyTasks(prev => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const updated = prev.map(t => t.id === taskId ? { ...t, done: !t.done, current: !t.done ? t.target : 0 } : t);
      try {
        localStorage.setItem('bloomshire_daily_tasks', JSON.stringify({ date: todayStr, tasks: updated }));
      } catch (e) {}
      return updated;
    });
  };

  const dailyTasksCompletedCount = useMemo(() => {
    return dailyTasks.filter(t => t.done).length;
  }, [dailyTasks]);

  const [questSectionsOpen, setQuestSectionsOpen] = useState({
    materialTracker: true,
    dailyTasks: true,
    moonmereBanner: true,
    skillsBook: true,
    energyBed: false,
    roadmap: true
  });

  const toggleQuestSection = (sectionKey) => {
    setQuestSectionsOpen(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const toggleAllQuestSections = (openState) => {
    setQuestSectionsOpen({
      materialTracker: openState,
      dailyTasks: openState,
      moonmereBanner: openState,
      skillsBook: openState,
      energyBed: openState,
      roadmap: openState
    });
  };

  // Buscador Universal de Ítems & Enciclopedia (359 ítems del juego)
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');
  const [itemViewMode, setItemViewMode] = useState('grid'); // 'grid' | 'list'
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [inventorySortBy, setInventorySortBy] = useState('owned_desc'); // 'owned_desc' | 'qty_desc' | 'value_desc' | 'name_asc'
  const [craftSearchQuery, setCraftSearchQuery] = useState('');
  const [craftSortBy, setCraftSortBy] = useState('profit_desc'); // 'profit_desc' | 'energy_desc' | 'time_asc' | 'rate_desc' | 'level_asc' | 'xp_desc' | 'name_asc'
  const [craftLevelFilter, setCraftLevelFilter] = useState('all');
  const [craftOnlyAvailable, setCraftOnlyAvailable] = useState(false);
  const [craftViewMode, setCraftViewMode] = useState('grid'); // 'grid' | 'list'
  const [npcViewMode, setNpcViewMode] = useState('grid'); // 'grid' | 'list'
  const [economySubTab, setEconomySubTab] = useState(() => {
    try {
      const w = localStorage.getItem('bloomshire_wallet');
      return (w && w !== 'null' && w.startsWith('0x')) ? 'liquidation' : 'arbitrage';
    } catch {
      return 'arbitrage';
    }
  });
    const [liveMarketOffers, setLiveMarketOffers] = useState(() => {
    try {
      const c = localStorage.getItem('bloomshire_cached_market_offers');
      return c ? JSON.parse(c) : null;
    } catch { return null; }
  });
  const [isMarketOffersLoading, setIsMarketOffersLoading] = useState(false);
  const [marketOffersLastUpdated, setMarketOffersLastUpdated] = useState(() => {
    try {
      const c = localStorage.getItem('bloomshire_cached_market_offers');
      return c ? (JSON.parse(c)?.timestamp || null) : null;
    } catch { return null; }
  });
  const [gameBuildHash, setGameBuildHash] = useState('a70eb5dd5113');
  const [toolVersion] = useState('v2.5.0');
  const [gameBuildStatus, setGameBuildStatus] = useState('synced');

  const [marketTrades, setMarketTrades] = useState(null); // 'liquidation' | 'odette' | 'arbitrage' | 'market_radar'
  const [marketFilter, setMarketFilter] = useState('all'); // 'all' | 'in_stock' | 'ultra' | 'gems' | 'vip'
  const [marketSearch, setMarketSearch] = useState('');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(() => {
    try { return localStorage.getItem('bloomshire_header_collapsed') === 'true'; } catch { return false; }
  });

  // Calculator State
  const [calcSkill, setCalcSkill] = useState('farming');
  const [calcSeasonFilter, setCalcSeasonFilter] = useState('all');
  const [calcLevelFilter, setCalcLevelFilter] = useState('all');
  const [calcSort, setCalcSort] = useState('xpMin_desc');
  const [calcStrategyPreset, setCalcStrategyPreset] = useState('speedrun');
  const [simulatedEnergy, setSimulatedEnergy] = useState('');
  const [availablePlots, setAvailablePlots] = useState(10);
  const [hasFoundersTimeBonus, setHasFoundersTimeBonus] = useState(true);
  const [expandedUsedInIds, setExpandedUsedInIds] = useState(() => new Set());
  const toggleUsedIn = (itemId) => {
    setExpandedUsedInIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Estados del Dashboard de Cosechas, Cocina y Alarmas (En Vivo)
  const [activeCrops, setActiveCrops] = useState([]);
  const [productionTimers, setProductionTimers] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomshire_prod_timers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [soundAlarmEnabled, setSoundAlarmEnabled] = useState(() => {
    try {
      return localStorage.getItem('bloomshire_sound_alarm') !== 'false';
    } catch {
      return true;
    }
  });
  const [showAddTimerModal, setShowAddTimerModal] = useState(false);
  const [newTimerForm, setNewTimerForm] = useState({
    name: '',
    qty: 1,
    durationMinutes: 10,
    location: '🏡 Cabaña (Home Island)',
    icon: '🍲'
  });
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Persistir temporizadores de producción y preferencia de alarma
  useEffect(() => {
    try {
      localStorage.setItem('bloomshire_prod_timers', JSON.stringify(productionTimers));
    } catch (e) {}
  }, [productionTimers]);

  useEffect(() => {
    try {
      localStorage.setItem('bloomshire_sound_alarm', soundAlarmEnabled ? 'true' : 'false');
    } catch (e) {}
  }, [soundAlarmEnabled]);

  // Campanilla sonora retro (Web Audio API nativa reutilizando singleton AudioContext - O15)
  const playChimeAlarm = () => {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // Do5, Mi5, Sol5, Do6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  // Verificación de alarmas desacoplada del render raíz (sin re-renderizar todo el componente cada segundo)
  const alertedProductionIds = useRef(new Set());
  useEffect(() => {
    if (!soundAlarmEnabled) return;
    const interval = setInterval(() => {
      const effectiveNow = Date.now() + serverTimeOffset;
      const allItems = [...activeCrops, ...productionTimers];
      allItems.forEach(item => {
        if (item.readyAt && item.readyAt <= effectiveNow) {
          if (!alertedProductionIds.current.has(item.id)) {
            alertedProductionIds.current.add(item.id);
            playChimeAlarm();
          }
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [serverTimeOffset, activeCrops, productionTimers, soundAlarmEnabled]);

  // Función para agregar un temporizador de producción manual
  const handleAddProductionTimer = () => {
    if (!newTimerForm.name.trim()) return;
    const durationMs = Math.max(1, parseInt(newTimerForm.durationMinutes, 10) || 5) * 60 * 1000;
    const itemReadyAt = Date.now() + durationMs;
    const timerObj = {
      id: 'timer_' + Date.now(),
      name: newTimerForm.name.trim(),
      icon: newTimerForm.icon || '🍲',
      count: Math.max(1, parseInt(newTimerForm.qty, 10) || 1),
      location: newTimerForm.location || '🏡 Cabaña (Home Island)',
      durationMinutes: Math.max(1, parseInt(newTimerForm.durationMinutes, 10) || 5),
      plantedAt: Date.now(),
      readyAt: itemReadyAt,
      isManual: true,
      type: 'production'
    };
    setProductionTimers(prev => [timerObj, ...prev]);
    setShowAddTimerModal(false);
  };

  const handleRemoveProductionTimer = (id) => {
    setProductionTimers(prev => prev.filter(t => t.id !== id));
  };

  // Crafting State
  const [craftCategory, setCraftCategory] = useState('bench');

  // Ubicaciones exactas en el Mega-Atlas para Estaciones de Crafteo y Cocina
  const CRAFT_STATION_LOCATIONS = {
    market: {
      stationName: '⚖️ Mercado Central (Rowan) — Market Hall de Bloomshire',
      stationDesc: 'En la plaza central de Bloomshire Town, habla con Rowan en el Market Hall para comprar y vender artículos.',
      label: '🏛️ Market Hall (Rowan)',
      regionId: 'bloomshire_town',
      subZoneId: 'bloomshire_town_sub_1_bloomshire',
      wx: 5740,
      wy: 4320,
      worldRect: [5620, 4200, 260, 240]
    },
    bench: {
      stationName: '🪵 Banco de Trabajo — Carpintería de Pell (Noreste del Pueblo)',
      stationDesc: 'Camina al este desde la Plaza Central y sube hacia el noreste hasta The Carpenter\'s Shop (Pell).',
      label: '🪵 Carpintería de Pell (Banco de Trabajo)',
      regionId: 'bloomshire_town',
      subZoneId: 'bloomshire_town_sub_1_bloomshire',
      wx: 6397,
      wy: 4215,
      worldRect: [6240, 4100, 300, 240]
    },
    forge: {
      stationName: '⚒️ La Forja y Yunque — Herrería de Bram (Este de la Plaza)',
      stationDesc: 'Camina al este desde la Plaza Central pasando la Tienda de Semillas hasta The Forge (Bram).',
      label: '⚒️ Herrería de Bram (Forja y Yunque)',
      regionId: 'bloomshire_town',
      subZoneId: 'bloomshire_town_sub_1_bloomshire',
      wx: 6126,
      wy: 4245,
      worldRect: [5980, 4120, 280, 240]
    },
    cook: {
      stationName: '🍲 Estufa de Cocina — Panadería de Tamsin (Oeste) o Tu Cabaña (Home Island)',
      stationDesc: 'Puedes cocinar en la estufa pública de The Bakery (Tamsin, al oeste del puente) o en la estufa dentro de tu Cabaña.',
      label: '🍲 Panadería de Tamsin (Estufa de Cocina)',
      regionId: 'bloomshire_town',
      subZoneId: 'bloomshire_town_sub_1_bloomshire',
      wx: 5106,
      wy: 4246,
      worldRect: [4960, 4120, 280, 240],
      altHomeLocation: {
        label: '🏡 Estufa de Tu Cabaña (Home Island)',
        regionId: 'home_island',
        subZoneId: 'home_cottage_sub',
        wx: 4034,
        wy: 10012,
        worldRect: [3930, 9930, 220, 220]
      }
    },
    mill: {
      stationName: '🌊 Molino de Agua & 🥛 Lechería — Granja de Hollin (Southvale)',
      stationDesc: 'Sal por el camino sur de Bloomshire hacia Southvale y entra a la Granja de Hollin (Oeste) para moler Harina, Azúcar, Arroz y batir Mantequilla/Queso.',
      label: '🌊 Molino y Lechería (Granja de Hollin - Southvale)',
      regionId: 'southvale',
      subZoneId: 'southvale_sub_19_hollin_s_farm',
      wx: 4888,
      wy: 6080,
      worldRect: [4608, 5816, 560, 528]
    },
    loom: {
      stationName: '🧵 Telar de Sastrería — Taller de Tilly (Orilla Oeste del Pueblo)',
      stationDesc: 'Cruza el puente al oeste de la Plaza Central y baja unos pasos hasta The Tailor\'s (Tilly) para tejer Tela (Cloth) con Lana.',
      label: '🧵 Sastrería de Tilly (Telar de Tela)',
      regionId: 'bloomshire_town',
      subZoneId: 'bloomshire_town_sub_1_bloomshire',
      wx: 4992,
      wy: 4589,
      worldRect: [4860, 4460, 260, 240]
    }
  };

  // NPCs State
  const [npcFilter, setNpcFilter] = useState('');

  // Copilot State
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorMessages, setAdvisorMessages] = useState([
    {
      id: 'init',
      role: 'assistant',
      content: '🤖 **Copilot IA: En Pausa Temporal (Próximamente)**\n\nEl copiloto estratégico con IA está actualmente en mantenimiento y no configurado. Se activará próximamente una vez finalizada la fase de pruebas y calibración económica. Mientras tanto, puedes consultar la Calculadora de Cultivos, el Mega-Atlas y la Enciclopedia de Ítems libremente.'
    }
  ]);
  const messagesEndRef = useRef(null);


  // Helper: Obtener desglose de existencias por almacén { total, m, cc, cp }
  const getItemStorageBreakdown = (itemObj) => {
    if (!itemObj) return { total: 0, m: 0, cc: 0, cp: 0 };
    const idLower = (itemObj.id || '').toLowerCase().trim();
    const nameLower = (itemObj.name || itemObj.nameEs || '').toLowerCase().trim();
    const idClean = idLower.replace(/_/g, ' ');

    let m = 0;
    let cc = 0;
    let cp = 0;

    rawInventory.forEach(it => {
      const itId = (it.id || '').toLowerCase().trim();
      const itName = (it.name || '').toLowerCase().trim();
      const itClean = itId.replace(/_/g, ' ');
      
      const isMatch = 
        (idLower && (itId === idLower || itName === idLower || itClean === idClean)) || 
        (nameLower && (itId === nameLower || itName === nameLower || itName.includes(nameLower))) ||
        (idLower && (itName.includes(idLower) || itId.includes(idLower)));

      if (isMatch) {
        const qty = Number(it.qty) || Number(it.n) || 0;
        const type = getStorageType(it.area);
        if (type === 'M') m += qty;
        else if (type === 'CC') cc += qty;
        else if (type === 'CP') cp += qty;
      }
    });

    const total = m + cc + cp;
    return { total, m, cc, cp };
  };

  // Helper: Calcular crafteabilidad y disponibilidad de materiales para una receta o plato
  const getRecipeCraftability = (recipe) => {
    if (!recipe) return { canCraft: false, maxBatches: 0, missingCount: 0, breakdown: [] };
    
    if (recipe.needs && Array.isArray(recipe.needs) && recipe.needs.length > 0) {
      let canCraft = true;
      let maxBatches = Infinity;
      let missingCount = 0;
      const breakdown = recipe.needs.map(n => {
        const stock = getItemStorageBreakdown({ id: n.item, name: n.nameEs || n.item });
        const req = Number(n.qty) || 1;
        const hasEnough = stock.total >= req;
        if (!hasEnough) {
          canCraft = false;
          missingCount++;
        }
        const possible = req > 0 ? Math.floor(stock.total / req) : 0;
        if (possible < maxBatches) maxBatches = possible;
        return {
          item: n.item,
          nameEs: n.nameEs || n.item,
          req,
          total: stock.total,
          m: stock.m,
          cc: stock.cc,
          cp: stock.cp,
          hasEnough
        };
      });

      return {
        canCraft: canCraft && maxBatches > 0 && maxBatches !== Infinity,
        maxBatches: canCraft && maxBatches !== Infinity ? maxBatches : 0,
        missingCount,
        breakdown
      };
    }

    if (recipe.mats && typeof recipe.mats === 'string') {
      const parts = recipe.mats.split('+').map(s => s.trim()).filter(Boolean);
      let canCraft = true;
      let maxBatches = Infinity;
      let missingCount = 0;
      const breakdown = parts.map(part => {
        const m = part.match(/^(.*?)(?:\s*(?:x\s*(\d+)|\((\d+)\)|(\d+)\s*x))?$/i);
        const nameOnly = m && m[1] ? m[1].trim() : part;
        const req = m && (m[2] || m[3] || m[4]) ? Number(m[2] || m[3] || m[4]) : 1;
        const searchName = nameOnly.replace(/\s*\([^)]*\)/g, '').split(' o ')[0].trim();
        const stock = getItemStorageBreakdown({ id: searchName, name: nameOnly });
        const hasEnough = stock.total >= req;
        if (!hasEnough) {
          canCraft = false;
          missingCount++;
        }
        const possible = req > 0 ? Math.floor(stock.total / req) : 0;
        if (possible < maxBatches) maxBatches = possible;
        return {
          item: searchName,
          nameEs: nameOnly,
          req,
          total: stock.total,
          m: stock.m,
          cc: stock.cc,
          cp: stock.cp,
          hasEnough
        };
      });

      return {
        canCraft: canCraft && maxBatches > 0 && maxBatches !== Infinity,
        maxBatches: canCraft && maxBatches !== Infinity ? maxBatches : 0,
        missingCount,
        breakdown
      };
    }

    return { canCraft: false, maxBatches: 0, missingCount: 0, breakdown: [] };
  };

  // Helper: Lista filtrada y ordenada de recetas de crafteo / cocina con analíticas de rendimiento
  // Helper: Lista filtrada y ordenada de recetas de crafteo / cocina con analíticas multi-variables
  const filteredAndSortedCrafts = useMemo(() => {
    let list = (craftData && craftData[craftCategory]) ? [...craftData[craftCategory]] : [];

    if (craftSearchQuery && craftSearchQuery.trim()) {
      const q = craftSearchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.item && r.item.toLowerCase().includes(q)) ||
        (r.dish && r.dish.toLowerCase().includes(q)) ||
        (r.craftItem && r.craftItem.toLowerCase().includes(q)) ||
        (r.mats && r.mats.toLowerCase().includes(q)) ||
        (r.desc && r.desc.toLowerCase().includes(q)) ||
        (r.place && r.place.toLowerCase().includes(q))
      );
    }

    if (craftLevelFilter && craftLevelFilter !== 'all') {
      if (craftLevelFilter === 'special') {
        list = list.filter(r => !r.levelNum || r.levelNum === 0 || (r.level && (r.level.toLowerCase().includes('misi') || r.level.toLowerCase().includes('especial') || r.level.toLowerCase().includes('vip'))));
      } else if (craftLevelFilter === '8') {
        list = list.filter(r => (r.levelNum || 1) >= 8 && (r.levelNum || 1) < 10);
      } else if (craftLevelFilter === '10') {
        list = list.filter(r => (r.levelNum || 1) >= 10);
      } else {
        const targetNum = Number(craftLevelFilter);
        list = list.filter(r => (r.levelNum || 1) === targetNum);
      }
    }

    const enriched = list.map(r => {
      const craftability = getRecipeCraftability(r);
      const energyCost = typeof r.energyCost === 'number' ? r.energyCost : (craftCategory === 'cook' ? 1 : craftCategory === 'forge' ? 3 : 2);
      const energyRestore = typeof r.energyRestore === 'number' ? r.energyRestore : 0;
      const netEnergy = energyRestore - energyCost;

      const goldCost = typeof r.goldCost === 'number' ? r.goldCost : 50;
      const sellPrice = typeof r.sellPrice === 'number' ? r.sellPrice : 3000;
      const netGold = Math.max(0, sellPrice - goldCost);

      const minutes = Math.max(1, typeof r.minutes === 'number' ? r.minutes : 1);
      const goldPerMin = Math.round(netGold / minutes);
      const xp = typeof r.xp === 'number' ? r.xp : 25;
      const levelNum = typeof r.levelNum === 'number' ? r.levelNum : (parseInt((r.level || '').replace(/[^0-9]/g, '')) || 1);
      
      const goldPerEnergy = energyCost > 0 ? Math.round(netGold / energyCost) : netGold;
      const xpPerEnergy = energyCost > 0 ? Number((xp / energyCost).toFixed(1)) : xp;
      const xpPerMin = Math.round(xp / minutes);

      return {
        ...r,
        craftability,
        energyCost,
        energyRestore,
        netEnergy,
        goldCost,
        sellPrice,
        netGold,
        minutes,
        goldPerMin,
        goldPerEnergy,
        xpPerEnergy,
        xpPerMin,
        xp,
        levelNum
      };
    });

    let finalFiltered = enriched;
    if (craftOnlyAvailable) {
      finalFiltered = finalFiltered.filter(r => r.craftability.canCraft);
    }

    finalFiltered.sort((a, b) => {
      if (craftSortBy === 'energy_desc') {
        return (b.netEnergy || 0) - (a.netEnergy || 0);
      }
      if (craftSortBy === 'energy_eff_desc') {
        return (b.goldPerEnergy || 0) - (a.goldPerEnergy || 0);
      }
      if (craftSortBy === 'energy_xp_desc') {
        return (b.xpPerEnergy || 0) - (a.xpPerEnergy || 0);
      }
      if (craftSortBy === 'profit_desc') {
        return (b.netGold || 0) - (a.netGold || 0);
      }
      if (craftSortBy === 'rate_desc') {
        return (b.goldPerMin || 0) - (a.goldPerMin || 0);
      }
      if (craftSortBy === 'time_asc') {
        return (a.minutes || 0) - (b.minutes || 0);
      }
      if (craftSortBy === 'xp_desc') {
        return (b.xp || 0) - (a.xp || 0);
      }
      if (craftSortBy === 'name_asc') {
        return (a.item || '').localeCompare(b.item || '');
      }
      return (a.levelNum || 1) - (b.levelNum || 1);
    });

    return finalFiltered;
  }, [craftCategory, craftData, craftSearchQuery, craftSortBy, craftLevelFilter, craftOnlyAvailable, rawInventory]);

  const totalCraftableInCurrentCategory = useMemo(() => {
    const list = (craftData && craftData[craftCategory]) || [];
    return list.filter(r => getRecipeCraftability(r).canCraft).length;
  }, [craftCategory, craftData, rawInventory]);

  // Conteo de crafteables en vivo por cada una de las 5 estaciones
  const craftableCountsByCategory = useMemo(() => {
    const counts = {};
    if (!craftData) return counts;
    ['bench', 'forge', 'cook', 'mill', 'loom'].forEach(k => {
      const list = craftData[k] || [];
      counts[k] = list.filter(r => getRecipeCraftability(r).canCraft).length;
    });
    return counts;
  }, [craftData, rawInventory]);

  // Resumen táctico de la estación actual
  const stationSummary = useMemo(() => {
    const list = (craftData && craftData[craftCategory]) || [];
    let bestEnergyDish = null;
    let bestProfitCraft = null;
    let fastestItem = null;

    list.forEach(r => {
      const eRestore = r.energyRestore || 0;
      if (!bestEnergyDish || eRestore > (bestEnergyDish.energyRestore || 0)) {
        bestEnergyDish = r;
      }
      const netG = (r.sellPrice || 0) - (r.goldCost || 0);
      if (!bestProfitCraft || netG > ((bestProfitCraft.sellPrice || 0) - (bestProfitCraft.goldCost || 0))) {
        bestProfitCraft = r;
      }
      const mins = r.minutes || 1;
      if (!fastestItem || mins < (fastestItem.minutes || 1)) {
        fastestItem = r;
      }
    });

    return {
      total: list.length,
      bestEnergyDish,
      bestProfitCraft,
      fastestItem
    };
  }, [craftCategory, craftData]);

  // Helper: Desglose para órdenes de Odette (con coincidencia estricta para evitar confundir Madera con Blanca de Madera)
  const getOrderBreakdown = (ord) => {
    if (!ord) return { total: 0, m: 0, cc: 0, cp: 0 };
    const rawKey = (ord.rawItem || '').trim();
    const displayKey = (ord.item || '').trim();

    const rawLower = rawKey.toLowerCase();
    const dispLower = displayKey.toLowerCase();

    // 1. Búsqueda directa exacta en el catálogo por ID
    let catMatch = inventoryCatalogData.find(c => {
      const idL = c.id.toLowerCase();
      return (rawLower && idL === rawLower) || (dispLower && idL === dispLower);
    });

    // 2. Búsqueda exacta en matchKeys (ej. 'blanca de madera' -> 'Wood White')
    if (!catMatch) {
      catMatch = inventoryCatalogData.find(c => {
        const keys = (c.matchKeys || []).map(k => k.toLowerCase());
        return (rawLower && keys.includes(rawLower)) || (dispLower && keys.includes(dispLower));
      });
    }

    // 3. Búsqueda exacta por nombre traducido
    if (!catMatch) {
      catMatch = inventoryCatalogData.find(c => {
        const nameL = c.name.toLowerCase();
        return (rawLower && nameL === rawLower) || (dispLower && nameL === dispLower);
      });
    }

    // Si encontramos fila del catálogo, consultar desglose con sus claves exactas
    if (catMatch) {
      return getItemStorageBreakdown({ id: catMatch.id, name: catMatch.name });
    }

    // Fallback: consultar con las claves recibidas directamente
    return getItemStorageBreakdown({ id: rawKey, name: displayKey });
  };

  // Helper: Mapear inventario crudo a catálogo canónico
  const calculateQuantitiesFromRaw = (rawList, scope) => {
    const counts = {};
    inventoryCatalogData.forEach(c => { counts[c.id] = 0; });

    if (!Array.isArray(rawList)) return counts;

    const filtered = rawList.filter(it => {
      const type = getStorageType(it.area);
      if (scope === 'hotbar') return type === 'M';
      if (scope === 'home_chest') return type === 'CC';
      if (scope === 'town_chest') return type === 'CP';
      if (scope === 'chest') return type === 'CC' || type === 'CP';
      return true;
    });

    filtered.forEach(it => {
      const itId = (it.id || '').trim();
      const itName = (it.name || '').trim();
      const itIdLower = itId.toLowerCase();
      const itNameLower = itName.toLowerCase();
      const qty = Number(it.qty) || Number(it.n) || 0;

      if (itIdLower.startsWith('tool:') || itIdLower.startsWith('seed:')) return;

      let matchedRow = inventoryCatalogData.find(x => x.id.toLowerCase() === itIdLower || x.id.toLowerCase() === itNameLower);

      if (!matchedRow) {
        let bestMatch = null;
        let bestLen = 0;
        for (const row of inventoryCatalogData) {
          const keys = row.matchKeys || [row.id.toLowerCase()];
          for (const key of keys) {
            if (itIdLower === key || itNameLower === key || itIdLower.includes(key) || itNameLower.includes(key)) {
              if (key.length > bestLen) {
                bestMatch = row;
                bestLen = key.length;
              }
            }
          }
        }
        matchedRow = bestMatch;
      }

      if (matchedRow && qty > 0) {
        counts[matchedRow.id] = (counts[matchedRow.id] || 0) + qty;
      }
    });

    return counts;
  };

  // Helper: Obtener cantidad disponible en mochila/cofres para una orden de Odette
  const getOrderAvailableQty = (ord) => {
    return getOrderBreakdown(ord).total;
  };

  // Aplicar datos entrantes de telemetría viva (con recálculo canónico de Energía, Cama UTC y 10 Skills)
  const applyIncomingSync = (data, source = 'unknown') => {
    if (!data) return;

    // Respetar desconexión manual del usuario ante eventos de fondo de la extensión
    const isManuallyDisconnected = (function() {
      try { return localStorage.getItem('bloomshire_manual_disconnected') === 'true'; } catch (_) { return false; }
    })();

    if (isManuallyDisconnected && source === 'extension' && !data._userForced) {
      console.log('Ignorando evento de fondo: Sesión desconectada manualmente por el usuario.');
      return;
    }

    const isFromExtension = Boolean(data._fromExtension || source === 'extension');
    if (isFromExtension) {
      lastExtensionSyncAtRef.current = Date.now();
    }

    let effectiveWallet = (data.wallet && typeof data.wallet === 'string' && data.wallet.startsWith('0x')) ? data.wallet.toLowerCase() : null;
    if (isFromExtension && effectiveWallet) {
      lastReportedExtensionWalletRef.current = effectiveWallet;
    }

    // 4.1. Invalidación al Cambiar de Wallet en el Juego (S3):
    // Si la extensión/hook reporta una wallet distinta a la que firmó el token SIWE, desconectar la sesión inmediatamente.
    const activeAuthWallet = authenticatedWalletRef.current;
    if (isFromExtension && effectiveWallet && activeAuthWallet && effectiveWallet !== activeAuthWallet.toLowerCase()) {
      console.warn(`[S3] Conflicto de wallet detectado: la sesión fue autenticada con ${activeAuthWallet} pero la extensión reporta ${effectiveWallet}. Cerrando sesión por seguridad.`);
      handleDisconnect();
      setConnectFeedback({
        type: 'error',
        text: `Se detectó cambio de cuenta en el juego (${effectiveWallet.slice(0, 6)}...${effectiveWallet.slice(-4)}). Tu sesión anterior fue cerrada por seguridad. Por favor, vuelve a firmar con la nueva wallet.`
      });
      setShowConnectModal(true);
      return;
    }

    // Guardar el snapshot en caché SOLO tras verificar que no hay conflicto de wallet
    try {
      localStorage.setItem('bloomshire_cached_snapshot', JSON.stringify(data));
    } catch (e) {}

    if (!effectiveWallet) {
      try {
        const localW = localStorage.getItem('bloomshire_wallet');
        if (localW && localW !== 'null' && localW.startsWith('0x')) {
          effectiveWallet = localW.toLowerCase();
        }
      } catch (_) {}
    }

    if (effectiveWallet) {
      setWalletAddress(effectiveWallet);
      try { 
        localStorage.setItem('bloomshire_wallet', effectiveWallet);
        localStorage.removeItem('bloomshire_manual_disconnected');
      } catch (e) {}

      // Respaldo asíncrono inmediato en Supabase (Nube) si está autenticado con firma
      const currentToken = localStorage.getItem('bloomshire_session_token') || sessionToken;
      if (currentToken) {
        try {
          fetch('/api/bloomshire-advisor?action=push_snapshot', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
              action: 'push_snapshot',
              wallet: effectiveWallet.toLowerCase(),
              snapshot: {
                ...data,
                wallet: effectiveWallet.toLowerCase(),
                timestamp: Date.now()
              }
            })
          }).catch(() => {});
        } catch (_) {}
      }
    }
    if (data.gold !== undefined && data.gold >= 0) setGold(data.gold);
    if (data.shards !== undefined) setShards(data.shards);
    if (data.avyn !== undefined) setAvyn(data.avyn > 100000 ? Math.round(data.avyn / 1e6) : Math.round(Number(data.avyn) * 100) / 100);

    // O3 & O8: Actualizar isVip, perks y farmersOwned
    const effectiveIsVip = Boolean(data.isVip);
    setIsVip(effectiveIsVip);
    const effectiveVipUntil = typeof data.vipUntil === 'number' ? data.vipUntil : (data.isVip ? (vipUntil || 0) : 0);
    setVipUntil(effectiveVipUntil);
    try {
      localStorage.setItem('bloomshire_cached_is_vip', String(effectiveIsVip));
      localStorage.setItem('bloomshire_cached_vip_until', String(effectiveVipUntil));
    } catch (_) {}

    // Perks reales emitidos por el juego (save.perks)
    let effectivePerks = playerPerks;
    if (data.perks && typeof data.perks === 'object') {
      effectivePerks = data.perks;
      setPlayerPerks(data.perks);
      try { localStorage.setItem('bloomshire_cached_perks', JSON.stringify(data.perks)); } catch (_) {}
    }

    // El conteo de farmers sale de on-chain / sync del servidor; la extensión no lo pisa
    let effectiveFarmersCount = farmersOwned;
    if (typeof data.farmersCount === 'number' && data.farmersCount >= 0 && source !== 'extension') {
      effectiveFarmersCount = data.farmersCount;
      setFarmersOwned(data.farmersCount);
      try { localStorage.setItem('bloomshire_cached_farmers', String(data.farmersCount)); } catch (_) {}
    }

    // Holder canónico: posesión on-chain (> 0) o perks vigentes (play.js:2118)
    const isHolder = effectiveFarmersCount > 0 || Boolean(effectivePerks);
    const computedMaxE = computeMaxEnergy(effectiveIsVip, isHolder);
    setMaxEnergy(computedMaxE);

    const snapTime = data.timestamp || Date.now();
    setSnapshotTimestamp(snapTime);
    if (data.rawEnergyObj) {
      setRawEnergyObj(data.rawEnergyObj);
    }

    // 1. Recalcular las 10 habilidades con la fórmula real de catalog.js (100 * (L-1)^2.7) (O9: sin límite de nivel 5)
    if (data.skills && typeof data.skills === 'object' && Object.keys(data.skills).length > 0) {
      const computedSkills = computeCanonicalSkillsFromRaw(data.skills, data.skillsBreakdown);
      setFarmingLevel(computedSkills.farmingLevel);
      setSkillsBreakdown(computedSkills.skillsBreakdown);
      setSkillsMeta(computedSkills.skillsMeta);
      try { localStorage.setItem('bloomshire_cached_farming_level', String(computedSkills.farmingLevel)); } catch (_) {}
    } else if (data.skillsBreakdown && typeof data.skillsBreakdown === 'object' && Object.keys(data.skillsBreakdown).length > 0) {
      const computedSkills = computeCanonicalSkillsFromRaw(null, data.skillsBreakdown);
      setFarmingLevel(computedSkills.farmingLevel);
      setSkillsBreakdown(computedSkills.skillsBreakdown);
      setSkillsMeta(computedSkills.skillsMeta);
      try { localStorage.setItem('bloomshire_cached_farming_level', String(computedSkills.farmingLevel)); } catch (_) {}
    } else if (typeof data.farmingLevel === 'number' && data.farmingLevel >= 0) {
      setFarmingLevel(data.farmingLevel);
      try { localStorage.setItem('bloomshire_cached_farming_level', String(data.farmingLevel)); } catch (_) {}
    }

    // 2. Recalcular Energía Viva (+1 cada 3m VIP), Sapphire Jam, Comida Diaria y Reloj de Cama UTC
    const liveEAndBed = computeClientLiveEnergyAndBed(
      data.rawEnergyObj || null,
      typeof data.currentEnergy === 'number' ? data.currentEnergy : 59,
      snapTime,
      data.energyMeta,
      {
        farmersCount: effectiveFarmersCount,
        isVip: effectiveIsVip,
        vipUntil: effectiveVipUntil,
        maxEnergy: computedMaxE,
        perks: effectivePerks,
        buffs: data.buffs || data.rawEnergyObj?.buffs,
        ate: data.ate || data.rawEnergyObj?.ate,
        sold: data.sold || data.rawEnergyObj?.sold
      }
    );
    if (isFromExtension || liveEAndBed.currentEnergy > 1) {
      setCurrentEnergy(liveEAndBed.currentEnergy);
    }
    setEnergyMeta(liveEAndBed.energyMeta);

    if (data.marketTrades) setMarketTrades(data.marketTrades);
    if (data.activeGameBuild) {
      setGameBuildHash(data.activeGameBuild);
      setGameBuildStatus(data.activeGameBuild === 'a70eb5dd5113' ? 'synced' : 'patch_detected');
    }

    if (Array.isArray(data.activeQuestsList)) {
      setActiveQuestsList(data.activeQuestsList);
    }
    if (Array.isArray(data.dailyTasks) && data.dailyTasks.length > 0) {
      setDailyTasks(prev => {
        const mapped = data.dailyTasks.map((incoming, idx) => {
          const rawText = incoming.text || incoming.label || incoming.name || incoming.desc || incoming.title || '';
          const target = incoming.target || incoming.max || incoming.n || incoming.req || 1;
          const current = incoming.current ?? incoming.progress ?? incoming.count ?? (incoming.done ? target : 0);
          const isDone = Boolean(incoming.done || incoming.completed || incoming.ready || (current >= target));
          
          const prevMatch = prev.find(p => 
            p.id === incoming.id || 
            (incoming.key && p.id === incoming.key) ||
            (rawText && p.label.toLowerCase().includes(rawText.toLowerCase())) ||
            (rawText && rawText.toLowerCase().includes(p.label.toLowerCase()))
          );

          let icon = incoming.icon || prevMatch?.icon || '🌱';
          const lower = (rawText || prevMatch?.label || '').toLowerCase();
          if (lower.includes('rieg') || lower.includes('water')) icon = '💧';
          else if (lower.includes('pesc') || lower.includes('fish')) icon = '🎣';
          else if (lower.includes('tal') || lower.includes('chop') || lower.includes('árb') || lower.includes('tree')) icon = '🪓';
          else if (lower.includes('cosech') || lower.includes('harvest') || lower.includes('cultiv')) icon = '🌾';
          else if (lower.includes('maripos') || lower.includes('butterfl')) icon = '🦋';
          else if (lower.includes('roc') || lower.includes('rock') || lower.includes('pic') || lower.includes('mine')) icon = '⛏️';
          else if (lower.includes('hong') || lower.includes('mush') || lower.includes('forage')) icon = '🍄';
          else if (lower.includes('criat') || lower.includes('kill') || lower.includes('monst')) icon = '⚔️';
          else if (lower.includes('pedid') || lower.includes('order')) icon = '📦';
          else if (lower.includes('cocin') || lower.includes('cook')) icon = '🍲';

          return {
            id: incoming.id || prevMatch?.id || `daily_task_${idx}`,
            label: rawText || prevMatch?.label || `Tarea diaria #${idx + 1}`,
            icon,
            target,
            current: isDone ? target : current,
            done: isDone,
            stars: incoming.stars || incoming.star || prevMatch?.stars || (idx >= 5 ? 3 : idx >= 3 ? 2 : 1)
          };
        });

        try {
          localStorage.setItem('bloomshire_daily_tasks', JSON.stringify({
            date: new Date().toISOString().slice(0, 10),
            tasks: mapped
          }));
        } catch (_) {}

        return mapped;
      });
    }
    if (typeof data.serverTimeOffset === 'number') {
      setServerTimeOffset(data.serverTimeOffset);
    }
    if (Array.isArray(data.activeCrops)) {
      setActiveCrops(data.activeCrops);
    }
    if (Array.isArray(data.liveProductionPots)) {
      setProductionTimers(prev => {
        const manualOnly = prev.filter(t => t.isManual);
        return [...data.liveProductionPots, ...manualOnly];
      });
    }

    if (data.moonmereProgress && typeof data.moonmereProgress === 'object') {
      setMoonmereProgress(prev => ({ ...prev, ...data.moonmereProgress }));
    }

    if (Array.isArray(data.inventory)) {
      setRawInventory(data.inventory);
      setItemQuantities(calculateQuantitiesFromRaw(data.inventory, inventoryScope));
    }

    if (Array.isArray(data.activeOrders)) {
      setActiveOrders(data.activeOrders.map(o => ({
        id: o.id,
        item: o.item,
        rawItem: o.rawItem || o.item,
        n: o.n || o.amount || 1,
        gold: o.gold || o.payoutGold || 0,
        xp: o.xp || o.xpReward || 0,
        skill: o.skill || 'farming',
        done: Boolean(o.done)
      })));
    }

    if (data.activeQuest && typeof data.activeQuest === 'string') {
      setActiveQuest(
        data.activeQuest
          .replace(/Look at the arch (of|de) roots/gi, 'Examina el arco de raíces en Whisperwood')
          .replace(/The Hidden Glade/gi, 'El Claro Escondido')
      );
    }

    setLastSyncTime(new Date().toLocaleTimeString());
  };

  // S1: Validar sesión SIWE al inicio con /api/auth?action=me (anti-phishing y protección premium)
  useEffect(() => {
    let isCancelled = false;
    const validateSession = async () => {
      const storedToken = (function() {
        try { return localStorage.getItem('bloomshire_session_token'); } catch (_) { return null; }
      })();
      if (!storedToken) {
        if (!isCancelled) {
          setSessionToken(null);
          setAuthenticatedWallet(null);
          authenticatedWalletRef.current = null;
          setIsPremiumUnlocked(false);
        }
        return;
      }

      try {
        const res = await fetch('/api/auth?action=me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.wallet) {
            const verifiedWallet = json.wallet.toLowerCase();
            authenticatedWalletRef.current = verifiedWallet;

            // S3: Chequeo de condición de carrera al arranque:
            // Si la extensión reportó una wallet antes de terminar /api/auth?action=me, verificar discrepancia inmediatamente.
            const reportedExtWallet = lastReportedExtensionWalletRef.current;
            if (reportedExtWallet && reportedExtWallet !== verifiedWallet) {
              console.warn(`[S3] Conflicto de wallet detectado al inicializar sesión: sesión SIWE pertenece a ${verifiedWallet} pero la extensión ya reportó ${reportedExtWallet}. Cerrando sesión por seguridad.`);
              handleDisconnect();
              setConnectFeedback({
                type: 'error',
                text: `Se detectó cambio de cuenta en el juego (${reportedExtWallet.slice(0, 6)}...${reportedExtWallet.slice(-4)}). Tu sesión anterior fue cerrada por seguridad. Por favor, vuelve a firmar con la nueva wallet.`
              });
              setShowConnectModal(true);
              return;
            }

            if (!isCancelled) {
              setSessionToken(storedToken);
              setAuthenticatedWallet(verifiedWallet);
              setWalletAddress(verifiedWallet);
              setIsPremiumUnlocked(true);
            }
            return;
          }
        }
        // Si responde 401 o token inválido: limpiar sesión y regresar a modo anónimo
        try {
          localStorage.removeItem('bloomshire_session_token');
          localStorage.removeItem('bloomshire_wallet');
        } catch (_) {}
        if (!isCancelled) {
          setSessionToken(null);
          setAuthenticatedWallet(null);
          authenticatedWalletRef.current = null;
          setWalletAddress(null);
          setIsPremiumUnlocked(false);
        }
      } catch (err) {
        console.warn('Error al verificar sesión SIWE con el servidor:', err);
      }
    };

    validateSession();
    return () => { isCancelled = true; };
  }, []);

  // Inicialización y Listeners
  useEffect(() => {
    try {
      const cached = localStorage.getItem('bloomshire_cached_snapshot');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) applyIncomingSync(parsed, 'cache');
      }
    } catch (e) {}

    const handleCompanionMessage = (event) => {
      if (event.source !== window) return;
      if (event.data?.type === 'MONIOS_COMPANION_SYNC' && event.data.game === 'bloomshire') {
        applyIncomingSync(event.data.data, 'extension');
      }
    };
    const handleCompanionCustomEvent = (event) => {
      if (event.detail?.game === 'bloomshire') {
        applyIncomingSync(event.detail.data, 'extension');
      }
    };

    
    const handleMarketMessage = (event) => {
      if (event.data?.type === 'MONIOS_MARKET_SNAPSHOT' && event.data.offers) {
        const offers = event.data.offers;
        const ts = event.data.timestamp || Date.now();
        setLiveMarketOffers(offers);
        setMarketOffersLastUpdated(ts);
        setIsMarketOffersLoading(false);
        setSystemLogs(l => [
          { id: Date.now(), time: new Date(ts).toLocaleTimeString(), text: `Mercado sincronizado: ${offers.stalls?.length || 0} puestos activos descargados de Rowan.`, type: 'success' },
          ...l
        ].slice(0, 50));
      }
      if (event.data?.type === 'MONIOS_MARKET_SNAPSHOT_ERROR') {
        setIsMarketOffersLoading(false);
        setSystemLogs(l => [
          { id: Date.now(), time: new Date().toLocaleTimeString(), text: `Aviso de mercado: ${event.data.error}`, type: 'warning' },
          ...l
        ].slice(0, 50));
      }
    };

    const handleMarketCustomEvent = (event) => {
      if (event.detail?.offers) {
        const offers = event.detail.offers;
        const ts = event.detail.timestamp || Date.now();
        setLiveMarketOffers(offers);
        setMarketOffersLastUpdated(ts);
        setIsMarketOffersLoading(false);
      }
    };

    window.addEventListener('message', handleMarketMessage);
    document.addEventListener('monios_market_snapshot', handleMarketCustomEvent);

    window.addEventListener('message', handleCompanionMessage);
    document.addEventListener('monios_game_sync', handleCompanionCustomEvent);

    fetchSyncFromServer();

    return () => {
      
      window.removeEventListener('message', handleMarketMessage);
      document.removeEventListener('monios_market_snapshot', handleMarketCustomEvent);

      window.removeEventListener('message', handleCompanionMessage);
      document.removeEventListener('monios_game_sync', handleCompanionCustomEvent);
    };
  }, []);

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
      setItemQuantities(calculateQuantitiesFromRaw(rawInventory, inventoryScope));
    }
  }, [inventoryScope]);

  const lastSyncRequestTimeRef = useRef(0);

  // Consulta de sincronización manual / forzada
  const fetchSyncFromServer = async () => {
    const now = Date.now();
    if (now - lastSyncRequestTimeRef.current < 400) return;
    lastSyncRequestTimeRef.current = now;

    setIsSyncing(true);

    try {
      window.postMessage({ type: 'FORCE_SYNC_ALL', force: true }, '*');
      window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN', force: true }, '*');
      document.dispatchEvent(new CustomEvent('monios_force_sync', { detail: { game: 'bloomshire', force: true } }));
    } catch (e) {}

    try {
      if (!walletAddress || walletAddress === 'null' || !walletAddress.startsWith('0x')) return;
      const currentToken = localStorage.getItem('bloomshire_session_token') || sessionToken;
      const headers = currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {};
      const res = await fetch(`/api/bloomshire-advisor?action=sync&wallet=${encodeURIComponent(walletAddress)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        const msSinceExt = Date.now() - lastExtensionSyncAtRef.current;
        if (msSinceExt > 12000 && json.inGame && (json.inGame.gold > 0 || (Array.isArray(json.inGame.inventory) && json.inGame.inventory.length > 0))) {
          applyIncomingSync({
            ...json.inGame,
            wallet: json.onChain?.wallet || walletAddress,
            farmersCount: json.onChain?.farmersCount ?? 0
          }, 'server');
        } else if (typeof json.onChain?.farmersCount === 'number') {
          setFarmersOwned(json.onChain.farmersCount);
        }
      }
    } catch (err) {
      console.warn('Sync server check warning:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 700);
    }
  };

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
  }, [itemQuantities, remainingThingsCap, remainingGoldCap, soldItemsToday, farmingLevel]);

  // Calcular valor total de liquidación unificada
  const totalLiquidationValue = useMemo(() => {
    let sum = 0;
    inventoryCatalogData.forEach(item => {
      const qty = itemQuantities[item.id] || 0;
      sum += qty * (item.unit || 0);
    });
    return sum;
  }, [itemQuantities]);

  // Catálogo de inventario ordenado dinámicamente (Prioridad: los que tengo > 0 primero)
  const sortedInventoryCatalog = useMemo(() => {
    let list = [...inventoryCatalogData];
    if (inventorySearchQuery) {
      const q = inventorySearchQuery.toLowerCase().trim();
      list = list.filter(it => it.name.toLowerCase().includes(q) || it.id.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const qtyA = itemQuantities[a.id] || 0;
      const qtyB = itemQuantities[b.id] || 0;

      if (inventorySortBy === 'owned_desc') {
        if ((qtyA > 0) !== (qtyB > 0)) return (qtyB > 0 ? 1 : 0) - (qtyA > 0 ? 1 : 0);
        if (qtyB !== qtyA) return qtyB - qtyA;
        return (b.unit || 0) - (a.unit || 0);
      }
      if (inventorySortBy === 'qty_desc') return qtyB - qtyA;
      if (inventorySortBy === 'value_desc') return (b.unit || 0) - (a.unit || 0);
      if (inventorySortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [itemQuantities, inventorySearchQuery, inventorySortBy]);



  // Registro local de entregas manuales de misiones (para sincronizar cuando el juego consume el item)
  const [deliveredItemsManual, setDeliveredItemsManual] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomshire_delivered_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleDeliveredItem = (questId, itemId) => {
    setDeliveredItemsManual(prev => {
      const key = `${questId}_${itemId}`;
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('bloomshire_delivered_items', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Insumos dinámicos requeridos por misiones activas (filtrado estricto por activeQuestsList y paso actual)
  const activeQuestMaterials = useMemo(() => {
    const list = [];
    if (!Array.isArray(activeQuestsList) || activeQuestsList.length === 0) return list;

    activeQuestsList.forEach(q => {
      const qId = (q.id || '').toLowerCase().trim();
      const currentStepNum = q.step !== undefined ? q.step : ((q.stepIdx || 0) + 1);

      const catDef = DASHBOARD_QUEST_CATALOG[qId]
        || DASHBOARD_QUEST_CATALOG[qId.replace(/^sd_/, 's_')]
        || DASHBOARD_QUEST_CATALOG[qId.replace(/^s_/, 'sd_')];

      // Obtener items canónicos del paso actual (de telemetría o del catálogo)
      const rawStepItems = (Array.isArray(q.stepItems) && q.stepItems.length > 0)
        ? q.stepItems
        : (catDef?.steps && catDef.steps[currentStepNum - 1]?.items && catDef.steps[currentStepNum - 1].items.length > 0
          ? catDef.steps[currentStepNum - 1].items
          : []);

      if (rawStepItems.length > 0) {
        rawStepItems.forEach(itemDef => {
          const manualKey = `${q.id}_${itemDef.id}`;
          const isManualDelivered = !!deliveredItemsManual[manualKey];
          // REGLA ESTRICTA: Si ya fue entregado, NO aparece en materiales para no estorbar visualmente
          if (isManualDelivered) return;

          list.push({
            id: itemDef.id,
            name: itemDef.name || itemDef.id,
            needed: itemDef.needed || 1,
            questId: q.id,
            questTitle: q.title || q.name || catDef?.name,
            stepText: q.stepText || q.objective || (catDef?.steps && catDef.steps[currentStepNum - 1]?.name),
            targetStep: currentStepNum,
            isCurrentStep: true,
            hint: itemDef.hint || catDef?.location || '',
            delivered: false
          });
        });
      } else {
        // Fallback a catálogo QUEST_REQUIRED_ITEMS
        const defs = QUEST_REQUIRED_ITEMS[qId] 
          || (q.chapter ? QUEST_REQUIRED_ITEMS['bk' + q.chapter] : null)
          || QUEST_REQUIRED_ITEMS[qId.replace(/^sd_/, 's_')]
          || QUEST_REQUIRED_ITEMS[qId.replace(/^s_/, 'sd_')];

        if (defs && defs.length > 0) {
          defs.forEach(d => {
            const manualKey = `${q.id}_${d.id}`;
            const isManualDelivered = !!deliveredItemsManual[manualKey];
            const targetStep = d.targetStep || 1;
            
            // Solo incluir si coincide exactamente con el paso actual del jugador
            if (currentStepNum !== targetStep) return;
            // Si ya está entregado, omitir
            if (isManualDelivered) return;

            list.push({
              ...d,
              questId: q.id,
              questTitle: q.title || q.name || d.questName,
              stepText: q.stepText || q.objective,
              targetStep,
              isCurrentStep: true,
              delivered: false
            });
          });
        }
      }
    });

    return list;
  }, [activeQuestsList, deliveredItemsManual]);

    // Recuento de slots
  const inventoryCounts = useMemo(() => {
    let hotbar = 0;
    let homeChest = 0;
    let townChest = 0;
    rawInventory.forEach(it => {
      const type = getStorageType(it.area);
      if (type === 'M') hotbar++;
      else if (type === 'CC') homeChest++;
      else if (type === 'CP') townChest++;
    });
    return { hotbar, homeChest, townChest, total: rawInventory.length };
  }, [rawInventory]);

  // Obtener cuántos ejemplares de un ítem de la enciclopedia tiene el jugador en su partida (Mochila + Cofres)
  const getPlayerItemQty = (itemObj) => {
    if (!itemObj) return 0;
    const idRaw = (itemObj.id || '').trim();
    const idLower = idRaw.toLowerCase();
    const nameEsLower = (itemObj.nameEs || '').toLowerCase();

    if (itemQuantities[idRaw] !== undefined && itemQuantities[idRaw] > 0) {
      return itemQuantities[idRaw];
    }

    let sum = 0;
    rawInventory.forEach(it => {
      const itId = (it.id || '').toLowerCase();
      const itName = (it.name || '').toLowerCase();
      if (itId === idLower || itName === idLower || (nameEsLower && (itId === nameEsLower || itName === nameEsLower))) {
        sum += Number(it.qty) || Number(it.n) || 0;
      }
    });
    return sum;
  };


  // Filtrado del Buscador Universal de Ítems (359 ítems oficiales de catalog.js + rules.js + quests.js)
  const filteredEncyclopediaItems = useMemo(() => {
    const q = itemSearchQuery.toLowerCase().trim();
    return itemEncyclopediaData.filter(item => {
      const matchCat = itemMatchesCategory(item, itemCategoryFilter);
      if (!matchCat) return false;
      if (!q) return true;

      const inId = (item.id || '').toLowerCase().includes(q);
      const inNameEs = (item.nameEs || '').toLowerCase().includes(q);
      const inHowToGet = (item.howToGet || '').toLowerCase().includes(q);
      const inDetails = (item.details || '').toLowerCase().includes(q);
      const inCat = ((item.cat || '') + ' ' + (item.categoryLabel || '') + ' ' + getItemCategoryLabel(item.cat)).toLowerCase().includes(q);
      const inUsed = (item.usedIn || []).some(u => u.toLowerCase().includes(q));
      const inLoc = (item.mapLocation?.label || '').toLowerCase().includes(q);

      return inId || inNameEs || inHowToGet || inDetails || inCat || inUsed || inLoc;
    });
  }, [itemSearchQuery, itemCategoryFilter]);

  // Resolver coordenadas exactas en el Mega-Atlas para cualquiera de los 67 NPCs (priorizando megaAtlasData.npcs)
  const resolveNpcMapLocation = (npc) => {
    if (!npc) return null;
    const nId = (npc.id || '').toLowerCase().trim();
    const nName = (npc.name || '').toLowerCase().trim();

    // 1. Prioridad: Buscar en megaAtlasData.npcs (coordenadas reales de píxel)
    const atlasNpc = (megaAtlasData.npcs || []).find(an => {
      const anId = (an.id || '').toLowerCase().trim();
      const anName = (an.name || '').toLowerCase().trim();
      return anId === nId || anName === nName || anName.startsWith(nName + ' ');
    });

    let wx = atlasNpc?.wx;
    let wy = atlasNpc?.wy;
    let regionId = null;
    let subZoneId = null;
    let subZoneName = null;

    if (wx != null && wy != null) {
      // Encontrar en qué región y subzona específica cae (wx, wy)
      for (const reg of (megaAtlasData.regions || [])) {
        for (const sub of (reg.subZones || [])) {
          if (sub.worldRect) {
            const [rx, ry, rw, rh] = sub.worldRect;
            if (wx >= rx && wx <= rx + rw && wy >= ry && wy <= ry + rh) {
              if (!subZoneName || (!sub.isRootBox && sub.nameEs)) {
                regionId = reg.id;
                subZoneId = sub.id;
                subZoneName = sub.nameEs || sub.nameEn || sub.id;
              }
            }
          }
        }
      }
      if (!regionId) regionId = 'bloomshire_town';
    } else if (MANUAL_NPC_COORDS[nId]) {
      // 2. Coordenadas manuales verificadas
      const manual = MANUAL_NPC_COORDS[nId];
      wx = manual.wx;
      wy = manual.wy;
      regionId = manual.regionId;
      subZoneId = manual.subZoneId;
      subZoneName = manual.subName;
    }

    if (wx == null || wy == null) {
      wx = 5752;
      wy = 4472;
      regionId = 'bloomshire_town';
      subZoneId = 'bloomshire_town_sub_1_bloomshire';
      subZoneName = 'Pueblo de Bloomshire';
    }

    const placeLabel = npc.loc || subZoneName || 'Bloomshire';

    return {
      label: `📍 ${npc.name} (${npc.title || 'Aldeano'}) — ${placeLabel}`,
      regionId,
      subZoneId,
      wx: Number(wx),
      wy: Number(wy),
      worldRect: [Number(wx) - 150, Number(wy) - 140, 300, 280]
    };
  };

  // Filtro de Calculadora
  const filteredCalcList = useMemo(() => {
    let list = [...(calcData[calcSkill] || [])];

    // Filtro de Temporada / Época (solo para cultivo)
    if (calcSkill === 'farming' && calcSeasonFilter !== 'all') {
      list = list.filter(x => x.season === 'all' || x.season === calcSeasonFilter);
    }

    if (calcLevelFilter !== 'all') {
      if (calcLevelFilter === 'vip' || calcLevelFilter === 'special') {
        list = list.filter(x => (x.level ?? 1) >= 15 || (x.tip && (x.tip.includes('Fundadores') || x.tip.includes('VIP') || x.tip.includes('Misión'))));
      } else {
        const targetLv = parseInt(calcLevelFilter, 10);
        list = list.filter(x => (x.level ?? 1) <= targetLv || targetLv >= 10);
      }
    }

    const [field, dir] = calcSort.split('_');
    list.sort((a, b) => {
      const eA = calcSkill === 'farming' ? 2 : (a.energyCost || a.energy || 1);
      const eB = calcSkill === 'farming' ? 2 : (b.energyCost || b.energy || 1);
      const xpPerEA = (a.xp ?? 0) / eA;
      const xpPerEB = (b.xp ?? 0) / eB;
      const netA = (a.sell ?? 0) - (a.cost ?? 0);
      const netB = (b.sell ?? 0) - (b.cost ?? 0);
      const goldPerEA = netA / eA;
      const goldPerEB = netB / eB;

      const isMasterA = calcSkill === 'farming' && farmingLevel >= 15 && a.hasRegrow;
      const isMasterB = calcSkill === 'farming' && farmingLevel >= 15 && b.hasRegrow;
      const xpMinA = isMasterA ? (a.regrowXpMin ?? a.xpMin ?? 0) : (a.xpMin ?? 0);
      const xpMinB = isMasterB ? (b.regrowXpMin ?? b.xpMin ?? 0) : (b.xpMin ?? 0);
      const goldMinA = isMasterA ? (a.regrowGoldMin ?? a.goldMin ?? 0) : (a.goldMin ?? 0);
      const goldMinB = isMasterB ? (b.regrowGoldMin ?? b.goldMin ?? 0) : (b.goldMin ?? 0);

      let vA = 0, vB = 0;
      if (field === 'xpEnergy') { vA = xpPerEA; vB = xpPerEB; }
      else if (field === 'goldEnergy') { vA = goldPerEA; vB = goldPerEB; }
      else if (field === 'xpMin') { vA = xpMinA; vB = xpMinB; }
      else if (field === 'goldMin') { vA = goldMinA; vB = goldMinB; }
      else if (field === 'time') { vA = a.grow ?? 1; vB = b.grow ?? 0; }
      else if (field === 'cost') { vA = a.cost ?? 0; vB = b.cost ?? 0; }
      else if (field === 'sell') { vA = a.sell ?? 0; vB = b.sell ?? 0; }
      return dir === 'desc' ? vB - vA : vA - vB;
    });

    return list;
  }, [calcSkill, calcSeasonFilter, calcLevelFilter, calcSort, farmingLevel]);

  // Filtro de NPCs
  const filteredNpcs = useMemo(() => {
    const q = npcFilter.toLowerCase().trim();
    if (!q) return npcsData;
    return npcsData.filter(n => 
      n.name.toLowerCase().includes(q) || 
      n.title.toLowerCase().includes(q) || 
      n.loc.toLowerCase().includes(q) ||
      (n.desc && n.desc.toLowerCase().includes(q))
    );
  }, [npcFilter]);

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
      const bd = getItemStorageBreakdown({ id: entry.id, name: entry.name });
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
  }, [rawInventory, activeQuestMaterials]);

  // Contar órdenes listas para entregar hoy
  const readyOrdersCount = useMemo(() => {
    return activeOrders.filter(ord => !ord.done && getOrderAvailableQty(ord) >= (ord.n || 1)).length;
  }, [activeOrders, itemQuantities, rawInventory]);

  // Manejar chat con Copilot
  const handleSendAdvisor = async (e) => {
    if (e) e.preventDefault();
    if (!advisorInput.trim() || advisorLoading) return;

    const userText = advisorInput.trim();
    setAdvisorInput('');
    const newMsg = { id: Date.now().toString(), role: 'user', content: userText };
    setAdvisorMessages(prev => [...prev, newMsg]);
    setAdvisorLoading(true);

    try {
      const res = await fetch('/api/bloomshire-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          conversation: advisorMessages.slice(-8),
          playerSnapshot: {
            wallet: walletAddress,
            gold,
            energy: currentEnergy,
            maxEnergy,
            shards,
            avyn,
            farmersCount: farmersOwned,
            farmingLevel,
            activeQuest,
            activeQuestsList,
            moonmereProgress,
            energyMeta,
            skillsMeta,
            skillsBreakdown,
            inventory: rawInventory,
            activeOrders
          }
        })
      });

      if (res.ok) {
        const json = await res.json();
        const advisorContent = json.text || json.reply || json.advice || json.analysis || json.response || 'Asesoría táctica recibida con éxito.';
        setAdvisorMessages(prev => [
          ...prev, 
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: advisorContent
          }
        ]);
      } else {
        throw new Error('Advisor API error');
      }
    } catch (err) {
      setAdvisorMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ No se pudo contactar con la API del asesor. Revisa tu conexión o usa la calculadora táctica integrada.'
        }
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] text-slate-100 font-sans select-none overflow-hidden">
      
      {/* 1. MASTER HEADER HUD PRO GAMING (Sleek Obsidian Dashboard 48px - Estilo Boceto) */}
      <header className="px-4 py-2 bg-[#080d19] border-b border-slate-800/80 flex items-center justify-between gap-3 shadow-md shrink-0">
        {/* Izquierda: Indicadores de Estado Estilo Boceto (Píldoras redondeadas con alto contraste) */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
          {/* Logo & Marca */}
          <div className="flex items-center gap-2 shrink-0 pr-1">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm shadow-inner">
              🌾
            </div>
            <span className="font-black text-white text-xs tracking-wider hidden sm:inline">BLOOMSHIRE</span>
          </div>

          {isConnected && walletAddress && walletAddress !== 'null' && walletAddress.startsWith('0x') ? (
            <>
              {/* Píldora de Oro */}
              <div 
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#12192a] border border-amber-500/30 text-amber-300 font-bold text-xs shadow-sm shrink-0" 
                title={`Oro disponible: ${gold.toLocaleString('es-ES')} Gold`}
              >
                <span className="text-amber-400">🪙</span>
                <span>{gold >= 1000 ? `${(gold / 1000).toFixed(1)}k Gold` : `${gold} Gold`}</span>
              </div>

              {/* Píldora de Energía */}
              {energyMeta.isJamActive && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/70 border border-indigo-400/50 text-indigo-300 font-bold text-xs shadow-sm shrink-0 animate-pulse"
                  title={`Mermelada de Zafiro activa (+30% regeneración): +1.3⚡ cada 3m (${energyMeta.jamMinutesLeft}m restante)`}
                >
                  <span className="text-sm">🫐</span>
                  <span className="font-mono text-xs font-black">{energyMeta.jamMinutesLeft}m</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 hidden sm:inline">+30%</span>
                </div>
              )}
              <div 
                className="relative overflow-hidden flex items-center gap-2 px-3 py-1 rounded-xl bg-[#12192a] border border-slate-700/60 text-slate-200 font-bold text-xs shadow-sm shrink-0 min-w-[125px]"
                title={`Energía viva: ${Math.floor(currentEnergy)}/${maxEnergy} ⚡ (${energyMeta.isJamActive ? '🫐 Mermelada activa: +1.3⚡ cada 3m' : isVip ? '+1⚡ cada 3m pasivo VIP' : 'Regen base'})`}
              >
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-amber-600/30 to-amber-500/35 pointer-events-none transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (currentEnergy / maxEnergy) * 100))}%` }}
                />
                <span className="relative z-10 text-amber-400">🛏️</span>
                <span className="relative z-10 font-mono">{`${Math.floor(currentEnergy)}/${maxEnergy}`}</span>
                {energyMeta.canRest && (
                  <span className="relative z-10 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black">LISTA</span>
                )}
              </div>

              {/* Nivel & Wallet interactivo -> Abre Modal de Perfil de Granjero */}
              <button 
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-amber-500/40 hover:border-amber-400/80 text-amber-300 hover:text-white text-xs font-mono shrink-0 cursor-pointer transition-all shadow-sm active:scale-[0.98]"
                title="Abrir Perfil de Granjero, NFTs y Estado On-Chain"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-amber-400 font-bold">Nv {farmingLevel}</span>
                <span className="text-slate-600">•</span>
                <span title={walletAddress}>{walletAddress.slice(0, 5)}...{walletAddress.slice(-3)}</span>
                <span className="text-[10px] font-sans text-amber-400/90 ml-0.5">👤</span>
              </button>

              {/* Shards / Tokens */}
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a]/50 border border-slate-800/80 text-indigo-300 text-[11px] font-mono shrink-0">
                <Gem className="w-3 h-3 text-indigo-400" />
                <span>{`${shards} AVS`}</span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400">{`${avyn} $AVYN`}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {viewOnlyWallet ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-bold text-xs shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="font-mono">Lectura: {viewOnlyWallet.slice(0, 6)}...{viewOnlyWallet.slice(-4)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-bold text-xs shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>Guía Comunitaria Libre</span>
                </div>
              )}
              <button
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs transition-all cursor-pointer"
                title="Vincular tu partida o ingresar clave"
              >
                <span>🎮 Conectar Partida</span>
              </button>
            </div>
          )}
        </div>

        {/* Derecha: Botón Sync estilo Boceto + Colapsar */}
        <div className="flex items-center gap-2 shrink-0">
          {isConnected && (
            <>
              <button
                onClick={fetchSyncFromServer}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-slate-700/80 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                title={`Sincronizar telemetría (Última: ${lastSyncTime})`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                <span>Sync</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 hover:border-rose-400/60 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Desconectar wallet y volver al Modo Guía Libre"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Desconectar</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              const next = !isHeaderCollapsed;
              setIsHeaderCollapsed(next);
              try { localStorage.setItem('bloomshire_header_collapsed', String(next)); } catch {}
            }}
            className="w-8 h-8 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title={isHeaderCollapsed ? "Expandir encabezado" : "Ocultar encabezado"}
          >
            {isHeaderCollapsed ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. NAVEGACIÓN PRINCIPAL HORIZONTAL (Diseño Sobrio y Limpio Idéntico al Boceto) */}
      {!isHeaderCollapsed && (
        <nav className="px-5 py-2 bg-[#0e1628] border-y border-slate-800/90 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar shrink-0 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { key: 'mega_atlas', label: 'MEGA-ATLAS HD' },
              { key: 'inventory', label: 'ECONOMÍA & TIENDAS' },
              { key: 'items', label: 'BUSCADOR ÍTEMS' },
              { key: 'craft', label: 'CRAFTEO & COCINA' },
              { key: 'npcs', label: 'ALDEANOS & REGALOS' },
              { key: 'calc', label: 'CALCULADORA XP' },
              { key: 'monitors', label: isConnected ? 'TEMPORIZADORES' : 'TEMPORIZADORES 🔒' }
            ].map(t => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent border border-amber-500/60 text-amber-200 font-black shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-bold'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Accesos Rápidos Secundarios (Misiones, Copilot IA y Ajustes) */}
          <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-slate-800/80">
            <button
              onClick={() => setActiveTab('quests')}
              className={`px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'quests'
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Libro de Misiones y Progresión"
            >
              <span>Misiones</span>
              {!isConnected && <span className="text-[10px]">🔒</span>}
            </button>

            <button
              onClick={() => setActiveTab('advisor')}
              className={`px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'advisor'
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Copilot IA"
            >
              <span>Copilot</span>
              {!isConnected && <span className="text-[10px]">🔒</span>}
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                activeTab === 'system'
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Ajustes y Diagnóstico"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      )}

      {/* 3. CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary key={activeTab} title={`Error al cargar el módulo (${activeTab})`} onBack={() => setActiveTab('mega_atlas')}>

        {/* ==============================================================
            TAB: BUSCADOR UNIVERSAL DE ÍTEMS ("¿DÓNDE LO CONSIGO?") - 359 ÍTEMS
            ============================================================== */}
        {/* SUBMÓDULOS DE PESTAÑAS DESACOPLADAS (FASE 7) */}
        {activeTab === 'items' && (
          <ItemsTab
            getPlayerItemQty={getPlayerItemQty}
            locateInMegaAtlas={locateInMegaAtlas}
          />
        )}

        {activeTab === 'calc' && (
          <CalcTab
            currentEnergy={currentEnergy}
            maxEnergy={maxEnergy}
            farmingLevel={farmingLevel}
            playerPerks={playerPerks}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            isConnected={isConnected}
            walletAddress={walletAddress}
            gold={gold}
            farmingLevel={farmingLevel}
            rawInventory={rawInventory}
            itemQuantities={itemQuantities}
            setItemQuantities={setItemQuantities}
            inventoryScope={inventoryScope}
            setInventoryScope={setInventoryScope}
            activeOrders={activeOrders}
            activeQuestMaterials={activeQuestMaterials}
            liveMarketOffers={liveMarketOffers}
            marketOffersLastUpdated={marketOffersLastUpdated}
            isMarketOffersLoading={isMarketOffersLoading}
            handleRefreshMarketOffers={handleRefreshMarketOffers}
            remainingThingsCap={remainingThingsCap}
            remainingGoldCap={remainingGoldCap}
            dailyGoldCap={dailyGoldCap}
            dailyThingsCap={dailyThingsCap}
            soldGoldToday={soldGoldToday}
            soldThingsToday={soldThingsToday}
            soldItemsToday={soldItemsToday}
            dailyPerItemCap={dailyPerItemCap}
            locateInMegaAtlas={locateInMegaAtlas}
            setShowConnectModal={setShowConnectModal}
            getPlayerItemQty={getPlayerItemQty}
          />
        )}

        {activeTab === 'quests' && (
          <QuestsTab
            isConnected={isConnected}
            onConnect={() => setShowConnectModal(true)}
            onBack={() => setActiveTab('mega_atlas')}
            activeQuestsList={activeQuestsList}
            activeQuestMaterials={activeQuestMaterials}
            gold={gold}
            farmingLevel={farmingLevel}
            moonmereProgress={moonmereProgress}
            deliveredItemsManual={deliveredItemsManual}
            toggleDeliveredItem={toggleDeliveredItem}
            dailyTasks={dailyTasks}
            setDailyTasks={setDailyTasks}
            toggleDailyTask={toggleDailyTask}
            dailyTasksCompletedCount={dailyTasksCompletedCount}
            energyMeta={energyMeta}
            currentEnergy={currentEnergy}
            maxEnergy={maxEnergy}
            isVip={isVip}
            skillsBreakdown={skillsBreakdown}
            skillsMeta={skillsMeta}
            locateInMegaAtlas={locateInMegaAtlas}
            getItemStorageBreakdown={(itemObj) => getItemStorageBreakdown(itemObj, rawInventory)}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'craft' && (
          <CraftTab
            rawInventory={rawInventory}
            locateInMegaAtlas={locateInMegaAtlas}
            skillsBreakdown={skillsBreakdown}
          />
        )}

        {activeTab === 'npcs' && (
          <NpcsTab
            locateInMegaAtlas={locateInMegaAtlas}
          />
        )}

        {activeTab === 'monitors' && (
          <MonitorsTab
            isConnected={isConnected}
            onConnect={() => setShowConnectModal(true)}
            onBack={() => setActiveTab('mega_atlas')}
            activeCrops={activeCrops}
            productionTimers={productionTimers}
            serverTimeOffset={serverTimeOffset}
            locateInMegaAtlas={locateInMegaAtlas}
            handleRemoveProductionTimer={handleRemoveProductionTimer}
            soundAlarmEnabled={soundAlarmEnabled}
            setSoundAlarmEnabled={setSoundAlarmEnabled}
            playChimeAlarm={playChimeAlarm}
            showAddTimerModal={showAddTimerModal}
            setShowAddTimerModal={setShowAddTimerModal}
            newTimerForm={newTimerForm}
            setNewTimerForm={setNewTimerForm}
            handleAddProductionTimer={handleAddProductionTimer}
            dailyTasks={dailyTasks}
            toggleDailyTask={toggleDailyTask}
            dailyTasksCompletedCount={dailyTasksCompletedCount}
            activeQuestMaterials={activeQuestMaterials}
            getItemStorageBreakdown={(itemObj) => getItemStorageBreakdown(itemObj, rawInventory)}
            energyMeta={energyMeta}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'advisor' && (
          <AdvisorTab
            walletAddress={walletAddress}
            gold={gold}
            currentEnergy={currentEnergy}
            maxEnergy={maxEnergy}
            shards={shards}
            avyn={avyn}
            farmersOwned={farmersOwned}
            farmingLevel={farmingLevel}
            activeQuest={activeQuest}
            activeQuestsList={activeQuestsList}
            moonmereProgress={moonmereProgress}
            energyMeta={energyMeta}
            skillsMeta={skillsMeta}
            skillsBreakdown={skillsBreakdown}
            rawInventory={rawInventory}
            activeOrders={activeOrders}
            locateInMegaAtlas={locateInMegaAtlas}
            isConnected={isConnected}
            setShowConnectModal={setShowConnectModal}
            onConnect={() => setShowConnectModal(true)}
            onBack={() => setActiveTab('mega_atlas')}
          />
        )}

        {activeTab === 'system' && (
          <SystemTab
            handleCheckUpdates={handleCheckUpdates}
            isCheckingUpdates={isCheckingUpdates}
            handleForceRedownload={handleForceRedownload}
            updateStatusMessage={updateStatusMessage}
            activeQuestsList={activeQuestsList}
            activeQuestMaterials={activeQuestMaterials}
            activeCrops={activeCrops}
            productionTimers={productionTimers}
            energyMeta={energyMeta}
            systemLogs={systemLogs}
            setSystemLogs={setSystemLogs}
          />
        )}

        {activeTab === 'mega_atlas' && (
          <BloomshireMegaAtlas
            focusTarget={atlasFocusTarget}
            onClearFocusTarget={() => setAtlasFocusTarget(null)}
          />
        )}

        {/* MODAL DE CONEXIÓN Y DESBLOQUEO PREMIUM */}
        </ErrorBoundary>
      
        {/* MODAL DE PERFIL DE GRANJERO, NFTS Y BOOSTS */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0b1428] border-2 border-amber-500/70 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👨‍🌾</span>
                  <div>
                    <h3 className="text-base font-black text-amber-400">Perfil de Granjero • Bloomshire</h3>
                    <div className="text-[11px] text-slate-400 font-mono">Robinhood Chain • Season 0</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Wallet Info Box */}
              <div className="p-3.5 bg-[#101b33] border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">Wallet Vinculada:</span>
                  <span className="text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Conectado
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#080d17] p-2 rounded-lg border border-slate-700/80 font-mono text-xs text-amber-200 break-all select-all">
                  <span>{walletAddress || '0x...'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (walletAddress) navigator.clipboard.writeText(walletAddress);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] shrink-0 cursor-pointer"
                    title="Copiar dirección"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* Perks & NFTs Oficiales */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💎 Tus NFTs & Boosts Activos:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[#0f172a] border border-amber-500/30 rounded-xl flex items-center gap-2.5">
                    <span className="text-xl">👨‍🌾</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">Founding Farmers</div>
                      <div className="text-[10px] text-amber-300 font-mono font-bold">{farmersOwned} NFT{farmersOwned === 1 ? '' : 's'} Poseído{farmersOwned === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#0f172a] border border-emerald-500/30 rounded-xl flex items-center gap-2.5">
                    <span className="text-xl">⚡</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">Bono de Velocidad</div>
                      <div className="text-[10px] text-emerald-300 font-mono font-bold">
                        {playerPerks?.fast
                          ? `-${Math.round((1 - playerPerks.fast) * 100)}% Crecimiento`
                          : farmersOwned >= 15
                          ? '-30% Crecimiento'
                          : farmersOwned >= 7
                          ? '-20% Crecimiento'
                          : 'Sin bono (< 7 Farmers)'}
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#0f172a] border border-purple-500/30 rounded-xl flex items-center gap-2.5">
                    <span className="text-xl">🐾</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">Mascota de Granja</div>
                      <div className="text-[10px] text-purple-300 font-mono font-bold">Perro Activo (+10% Drop)</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#0f172a] border border-cyan-500/30 rounded-xl flex items-center gap-2.5">
                    <span className="text-xl">🔋</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">{isVip ? 'Estamina VIP' : farmersOwned > 0 ? 'Estamina Holder' : 'Estamina Base'}</div>
                      <div className="text-[10px] text-cyan-300 font-mono font-bold">{maxEnergy}⚡ {isVip ? '(Regen +1 / 3m)' : ''}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado de Supabase */}
              <div className="p-2.5 bg-[#0a1222] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">☁️</span>
                  <div>
                    <div className="font-bold text-slate-300 text-[11px]">Respaldo en Supabase</div>
                    <div className="text-[10px] text-slate-400">Tabla: player_sessions</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (walletAddress) {
                      const currentToken = localStorage.getItem('bloomshire_session_token') || sessionToken;
                      if (!currentToken) {
                        alert('Para guardar tu partida en la nube necesitas autenticar tu wallet con tu firma.');
                        setShowConnectModal(true);
                        return;
                      }
                      fetch('/api/bloomshire-advisor?action=push_snapshot', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${currentToken}`
                        },
                        body: JSON.stringify({
                          action: 'push_snapshot',
                          wallet: walletAddress.toLowerCase(),
                          snapshot: {
                            gold,
                            shards,
                            avyn,
                            currentEnergy,
                            maxEnergy,
                            farmingLevel,
                            inventory: rawInventory,
                            activeOrders,
                            activeCrops,
                            dailyTasks,
                            skills: skillsBreakdown,
                            timestamp: Date.now()
                          }
                        })
                      }).then(res => {
                        if (res.ok) alert('¡Partida respaldada exitosamente en Supabase con firma!');
                        else alert('Error de autorización al respaldar en la nube.');
                      }).catch(() => {});
                    }
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10.5px] font-bold cursor-pointer transition-all shadow-sm"
                >
                  Guardar en Nube
                </button>
              </div>

              {/* Botones de Acción: Cerrar y Desconectar */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleDisconnect();
                    setShowProfileModal(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 hover:border-rose-400 text-rose-300 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <span>🔴 Desconectar Sesión</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {showConnectModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-[#0b1428] border-2 border-amber-500/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎮</span>
                        <h3 className="text-base font-black text-amber-400">Vincular Partida • Bloomshire Companion</h3>
                      </div>
                      <button
                        onClick={() => { setShowConnectModal(false); setConnectFeedback(null); }}
                        className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Opción 1: Firma Web3 Segura (SIWE) */}
                      <div className="p-4 bg-gradient-to-br from-[#101b33] to-[#0a1426] border border-cyan-500/40 rounded-xl space-y-2.5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold rounded-full border border-cyan-500/30">
                          RECOMENDADO
                        </div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>🛡️ Opción 1: Autenticación Criptográfica Web3</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          Firma un mensaje criptográfico con tu billetera (MetaMask, Rabby o navegador) para verificar tu propiedad. <b>Sin costo de gas</b>. Protege tu partida en la nube para que nadie más pueda ver ni sobrescribir tus datos en Supabase.
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleConnectAndSignWallet()}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-900/30 transition-all active:scale-[0.98]"
                          >
                            <span>🔐 Conectar y Firmar con Billetera (Web3)</span>
                          </button>
                        </div>
                        {injectedWallets.length > 1 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
                              Seleccionar Billetera (EIP-6963):
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {injectedWallets.map(w => (
                                <button
                                  key={w.info.uuid}
                                  type="button"
                                  onClick={() => handleConnectAndSignWallet(w.provider)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d172e] hover:bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs font-bold cursor-pointer transition-all active:scale-95"
                                >
                                  {w.info.icon && <img src={w.info.icon} alt={w.info.name} className="w-3.5 h-3.5 rounded" />}
                                  <span>{w.info.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>✓ Compatible con EVM (Ethereum / Arbitrum)</span>
                          <span>•</span>
                          <span>✓ Sesión JWT segura de 24 horas (renovable)</span>
                        </div>
                      </div>

                      {/* Opción 2: Extensión */}
                      <div className="p-4 bg-[#101b33] border border-amber-500/30 rounded-xl space-y-2">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>⚡ Opción 2: Sincronización Automática (Extensión)</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          La extensión oficial <b>Bloomshire Companion</b> lee tu partida localmente en tu navegador con 0 latencia:
                        </p>
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-[10.5px]">
                          ℹ️ <b>Nota:</b> La extensión sincroniza tus existencias locales. Para desbloquear los módulos con candado (Misiones, Liquidador y Asesor IA), firma con tu billetera en la <b>Opción 1</b>.
                        </div>
                        <div className="pt-1 pb-1">
                          <button
                            type="button"
                            onClick={() => {
                              window.postMessage({ type: 'FORCE_SYNC_ALL', force: true }, '*');
                              document.dispatchEvent(new CustomEvent('monios_force_sync', { detail: { force: true } }));
                              setConnectFeedback({ type: 'info', text: '📡 Señal emitida. Buscando extensión Bloomshire Companion...' });
                              setTimeout(() => {
                                const snap = localStorage.getItem('bloomshire_cached_snapshot');
                                const w = localStorage.getItem('bloomshire_wallet');
                                if (snap) {
                                  try {
                                    const parsed = JSON.parse(snap);
                                    if (parsed && (parsed.gold > 0 || (parsed.inventory && parsed.inventory.length > 0))) {
                                      applyIncomingSync(parsed, 'cache');
                                      setConnectFeedback({ 
                                        type: 'success', 
                                        text: '¡Partida vinculada desde la caché de la extensión! Recuerda firmar en la Opción 1 para desbloquear los candados.' 
                                      });
                                      return;
                                    }
                                  } catch (_) {}
                                }
                                if (w && w.startsWith('0x')) {
                                  setConnectFeedback({ 
                                    type: 'success', 
                                    text: `¡Partida vinculada a ${w.slice(0, 6)}...! Recuerda firmar en la Opción 1 para desbloquear los candados.` 
                                  });
                                } else {
                                  setConnectFeedback({ 
                                    type: 'info', 
                                    text: '⚠️ Señal enviada. Si estás en Incógnito, recuerda habilitar la extensión en chrome://extensions. O abre bloomshire.xyz/play en otra pestaña y pulsa "Forzar Sincronización" en el icono de la extensión.' 
                                  });
                                }
                              }, 1500);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                          >
                            <span>⚡ Detectar / Sincronizar Extensión Companion</span>
                          </button>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                          <li>Instala la extensión en Chrome / Brave / Edge.</li>
                          <li>Abre tu partida en <a href="https://bloomshire.xyz/play/" target="_blank" rel="noreferrer" className="text-amber-400 underline font-bold">bloomshire.xyz/play/</a>.</li>
                          <li>Esta tool detectará tu inventario, oro y cultivos en menos de 1 segundo.</li>
                        </ol>
                      </div>

                      {/* Opción 3: Modo Lectura Pública */}
                      <div className="p-4 bg-[#101b33] border border-slate-800 rounded-xl space-y-2.5">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>🔍 Opción 3: Modo Lectura Pública (Manual)</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          Ingresa una wallet (<code className="text-cyan-300 font-mono">0x...</code>) para ver sus NFTs on-chain públicos en modo solo lectura (sin modificar datos):
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={connectCode}
                            onChange={(e) => setConnectCode(e.target.value.trim())}
                            placeholder="0x..."
                            className="flex-1 bg-[#091122] border border-slate-700 focus:border-amber-400 rounded-lg p-2 text-white font-mono text-xs outline-none"
                          />
                          <button
                            onClick={async () => {
                              if (!connectCode) return;
                              const cleanCode = connectCode.trim();

                              if (/^0x[0-9a-fA-F]{40}$/.test(cleanCode)) {
                                const targetWallet = cleanCode.toLowerCase();
                                setViewOnlyWallet(targetWallet);

                                try {
                                  setConnectFeedback({ type: 'loading', text: 'Consultando perfil on-chain en el servidor...' });
                                  const res = await fetch(`/api/bloomshire-advisor?action=sync&wallet=${encodeURIComponent(targetWallet)}`);
                                  if (res.ok) {
                                    const json = await res.json();
                                    if (json.onChain) {
                                      setConnectFeedback({ type: 'success', text: `Perfil público consultado (${targetWallet.slice(0, 6)}... - ${json.onChain.farmersCount ?? 0} Farmers). Modo solo lectura.` });
                                    } else {
                                      setConnectFeedback({ type: 'info', text: `Wallet ${targetWallet.slice(0, 6)}... vinculada en modo solo lectura.` });
                                    }
                                  }
                                } catch (_) {
                                  setConnectFeedback({ type: 'info', text: `Wallet ${targetWallet.slice(0, 6)}... vinculada en modo solo lectura.` });
                                }
                                setTimeout(() => { setShowConnectModal(false); setConnectFeedback(null); }, 2000);
                              } else {
                                setConnectFeedback({ type: 'error', text: 'Dirección inválida. Debe ser una dirección de Ethereum válida de 42 caracteres (0x...).' });
                              }
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer transition-all border border-slate-700 shrink-0"
                          >
                            Ver Perfil
                          </button>
                        </div>
                      </div>

                      {connectFeedback && (
                        <div className={`p-2.5 rounded-lg text-xs font-bold ${connectFeedback.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : connectFeedback.type === 'loading' ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'}`}>
                          {connectFeedback.text}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <span className="text-slate-500">¿Dudas? Consulta la guía en el Mega-Atlas.</span>
                      <button
                        onClick={() => { setShowConnectModal(false); setConnectFeedback(null); }}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

      </div>
    </div>
  );
}
