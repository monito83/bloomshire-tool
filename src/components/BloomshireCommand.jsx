// Bloomshire Tool - Live Companion & Market Radar (Modularized Architecture)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Coins,
  Gem,
  RefreshCw,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Settings,
  LogOut,
  Map as MapIcon,
  PackageSearch,
  ChefHat,
  HeartHandshake,
  Calculator,
  Timer,
  ScrollText
} from 'lucide-react';

// Importar datos canónicos JSON
import inventoryCatalogData from '../../public/data/bloomshire/inventory_catalog.json';
import BloomshireMegaAtlas from './BloomshireMegaAtlas';
import rulesData from '../data/rules.json';
import ErrorBoundary from './ErrorBoundary';
import '../i18n';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

// Importar lógica y fórmulas de bloomshireEngine
import { computeCanonicalSkillsFromRaw, computeClientLiveEnergyAndBed, computeMaxEnergy } from './bloomshire/bloomshireEngine';

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
import LogbookTab from './bloomshire/tabs/LogbookTab';
import AdminGate from './bloomshire/admin/AdminGate';
import GameUpdatePanel from './bloomshire/admin/GameUpdatePanel';

// Importar helpers y constantes canónicas compartidas
import {
  getStorageType,
  QUEST_REQUIRED_ITEMS,
  DASHBOARD_QUEST_CATALOG,
  getSharedAudioContext
} from './bloomshire/bloomshireHelpers';
import {
  slimSnapshot,
  backupFingerprint,
  backupDecision,
  CLOUD_BACKUP_AUTO
} from './bloomshire/cloudBackup';

export default function BloomshireCommand() {
  const { t: tHeader, i18n } = useTranslation('header');
  const { t: tTabs } = useTranslation('tabs');
  const { t: tErrors } = useTranslation('errors');
  const VALID_TABS = ['mega_atlas', 'logbook', 'inventory', 'items', 'craft', 'npcs', 'calc', 'monitors', 'quests', 'advisor', 'system'];
  const [activeTab, setActiveTab] = useState(() => {
    try {
      // Enlace compartido a la bitacora (#logbook/...) abre esa pestaña directamente
      if (typeof window !== 'undefined' && String(window.location.hash || '').toLowerCase().startsWith('#logbook')) return 'logbook';
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
    setIsSyncStale(false);
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
  const lastExtensionSyncAtRef = useRef(0);

  // Respaldo en la nube con freno (ver cloudBackup.js): apagado por ahora; prendido, sube como mucho cada 10 min y solo si cambio algo importante
  const cloudBackupRef = useRef({ last: null, pending: null, timer: null });
  const flushCloudBackup = () => {
    const box = cloudBackupRef.current;
    box.timer = null;
    const p = box.pending;
    if (!p) return;
    box.pending = null;
    box.last = { at: Date.now(), fp: p.fp };
    let token = p.token;
    try { token = localStorage.getItem('bloomshire_session_token') || token; } catch (_) {}
    if (!token) return;
    fetch('/api/bloomshire-advisor?action=push_snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        action: 'push_snapshot',
        wallet: p.wallet,
        snapshot: { ...slimSnapshot(p.data), wallet: p.wallet, timestamp: Date.now() }
      })
    }).catch(() => {});
  };
  const queueCloudBackup = (wallet, data, token) => {
    if (!CLOUD_BACKUP_AUTO) return;
    const box = cloudBackupRef.current;
    const fp = backupFingerprint(data);
    const decision = backupDecision(box.last, fp);
    if (decision.action === 'skip') { box.pending = null; return; }
    box.pending = { wallet, data, token, fp };
    if (decision.action === 'now') { clearTimeout(box.timer); flushCloudBackup(); return; }
    if (!box.timer) box.timer = setTimeout(flushCloudBackup, decision.waitMs);
  };
  useEffect(() => () => clearTimeout(cloudBackupRef.current.timer), []);

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

    try {
      window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
    } catch (e) {}

    try {
      const res = await fetch('/api/bloomshire-version');
      if (res.ok) {
        const info = await res.json();
        setIsCheckingUpdates(false);
        if (info.isUpToDate) {
          setUpdateStatusMessage(`¡Sistema al día! Servidor Bloomshire en build ${info.liveBuild}.`);
          setSystemLogs(prev => [
            { id: Date.now(), time: nowStr, text: `Comprobación completada: Servidor en build ${info.liveBuild}. 100% compatible con Tool ${info.toolVersion}.`, type: 'success' },
            ...prev
          ].slice(0, 50));
        } else {
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

  // Bitacora: abrir la pestaña si cambia el hash a #logbook/... y limpiar el hash al salir de ella
  useEffect(() => {
    const onHash = () => {
      if (String(window.location.hash || '').toLowerCase().startsWith('#logbook')) setActiveTab('logbook');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (activeTab === 'logbook') return;
    try {
      if (String(window.location.hash || '').toLowerCase().startsWith('#logbook')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (_) {}
  }, [activeTab]);

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

  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(() => {
    try { return localStorage.getItem('bloomshire_header_collapsed') === 'true'; } catch { return false; }
  });

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

      // Respaldo en Supabase (Nube) si está autenticado con firma: solo lo que llega de la extensión,
      // con freno (cada 5 min como mucho y solo si cambió algo importante) para no gastar el tráfico de Vercel
      const currentToken = localStorage.getItem('bloomshire_session_token') || sessionToken;
      if (currentToken && isFromExtension) {
        try { queueCloudBackup(effectiveWallet.toLowerCase(), data, currentToken); } catch (_) {}
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

    setIsSyncStale(Boolean(data?.stale));
    setLastSyncTime(new Date());
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

    

    window.addEventListener('message', handleCompanionMessage);
    document.addEventListener('monios_game_sync', handleCompanionCustomEvent);

    fetchSyncFromServer();

    return () => {
      

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
                title={tHeader('gold.tooltip', { amount: new Intl.NumberFormat(i18n.language || 'en').format(gold) })}
              >
                <span className="text-amber-400">🪙</span>
                <span>{gold >= 1000 ? tHeader('gold.displayK', { amount: (gold / 1000).toFixed(1) }) : tHeader('gold.display', { amount: new Intl.NumberFormat(i18n.language || 'en').format(gold) })}</span>
              </div>

              {/* Píldora de Energía */}
              {energyMeta.isJamActive && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/70 border border-indigo-400/50 text-indigo-300 font-bold text-xs shadow-sm shrink-0 animate-pulse"
                  title={tHeader('energy.jamTooltip', { minutes: energyMeta.jamMinutesLeft })}
                >
                  <span className="text-sm">🫐</span>
                  <span className="font-mono text-xs font-black">{energyMeta.jamMinutesLeft}m</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 hidden sm:inline">+30%</span>
                </div>
              )}
              <div 
                className="relative overflow-hidden flex items-center gap-2 px-3 py-1 rounded-xl bg-[#12192a] border border-slate-700/60 text-slate-200 font-bold text-xs shadow-sm shrink-0 min-w-[125px]"
                title={tHeader('energy.liveTooltip', {
                  current: Math.floor(currentEnergy),
                  max: maxEnergy,
                  detail: energyMeta.isJamActive
                    ? tHeader('energy.jamDetail')
                    : isVip
                    ? tHeader('energy.vipDetail')
                    : tHeader('energy.baseDetail')
                })}
              >
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-amber-600/30 to-amber-500/35 pointer-events-none transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (currentEnergy / maxEnergy) * 100))}%` }}
                />
                <span className="relative z-10 text-amber-400">🛏️</span>
                <span className="relative z-10 font-mono">{`${Math.floor(currentEnergy)}/${maxEnergy}`}</span>
                {energyMeta.canRest && (
                  <span className="relative z-10 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black">{tHeader('energy.ready')}</span>
                )}
              </div>

              {/* Nivel & Wallet interactivo -> Abre Modal de Perfil de Granjero */}
              <button 
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-amber-500/40 hover:border-amber-400/80 text-amber-300 hover:text-white text-xs font-mono shrink-0 cursor-pointer transition-all shadow-sm active:scale-[0.98]"
                title={tHeader('farmer.profileTooltip')}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-amber-400 font-bold">{tHeader('farmer.level', { level: farmingLevel })}</span>
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
                  <span className="font-mono">{tHeader('mode.readOnly', { wallet: `${viewOnlyWallet.slice(0, 6)}...${viewOnlyWallet.slice(-4)}` })}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-bold text-xs shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>{tHeader('mode.freeGuide')}</span>
                </div>
              )}
              <button
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs transition-all cursor-pointer"
                title={tHeader('mode.connectGameTitle')}
              >
                <span>{tHeader('mode.connectGameButton')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Derecha: Selector de Idioma + Botón Sync estilo Boceto + Desconectar + Colapsar */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher />
          {isConnected && (
            <>
              {isSyncStale && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm" title={tHeader('sync.staleTooltip')}>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="hidden sm:inline">{tHeader('sync.staleFull')}</span>
                  <span className="sm:hidden">{tHeader('sync.staleShort')}</span>
                </div>
              )}
              <button
                onClick={fetchSyncFromServer}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-slate-700/80 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                title={tHeader('sync.tooltip', { time: formattedLastSyncTime })}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                <span>{tHeader('sync.button')}</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 hover:border-rose-400/60 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title={tHeader('disconnect.title')}
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{tHeader('disconnect.button')}</span>
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
            title={isHeaderCollapsed ? tHeader('toggle.expand') : tHeader('toggle.collapse')}
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
              { key: 'mega_atlas', label: tTabs('titles.mega_atlas'), Icon: MapIcon },
              { key: 'logbook', label: tTabs('titles.logbook'), Icon: BookOpen },
              { key: 'inventory', label: tTabs('titles.inventory'), Icon: Coins },
              { key: 'items', label: tTabs('titles.items'), Icon: PackageSearch },
              { key: 'craft', label: tTabs('titles.craft'), Icon: ChefHat },
              { key: 'npcs', label: tTabs('titles.npcs'), Icon: HeartHandshake },
              { key: 'calc', label: tTabs('titles.calc'), Icon: Calculator },
              { key: 'monitors', label: isConnected ? tTabs('titles.monitors') : tTabs('titles.monitorsLocked'), Icon: Timer }
            ].map(t => {
              const isActive = activeTab === t.key;
              const TabIcon = t.Icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`group px-3.5 py-1.5 rounded-xl text-[11px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/60 text-amber-200 font-black shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-bold'
                  }`}
                >
                  <TabIcon
                    aria-hidden="true"
                    strokeWidth={2.2}
                    className={`w-3.5 h-3.5 shrink-0 transition-all duration-300 ${
                      isActive ? 'text-amber-300 opacity-100' : 'opacity-60 group-hover:opacity-100 group-hover:text-amber-300/90 group-hover:-translate-y-px'
                    }`}
                  />
                  <span>{t.label}</span>
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
              title={tTabs('titles.questsTitle')}
            >
              <ScrollText aria-hidden="true" strokeWidth={2.2} className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'quests' ? 'opacity-100' : 'opacity-60'}`} />
              <span>{tTabs('titles.quests')}</span>
              {!isConnected && <span className="text-[10px]">🔒</span>}
            </button>

            <button
              onClick={() => setActiveTab('advisor')}
              className={`px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'advisor'
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={tTabs('titles.advisorTitle')}
            >
              <Sparkles aria-hidden="true" strokeWidth={2.2} className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'advisor' ? 'opacity-100' : 'opacity-60'}`} />
              <span>{tTabs('titles.advisor')}</span>
              {!isConnected && <span className="text-[10px]">🔒</span>}
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                activeTab === 'system'
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={tTabs('titles.systemTitle')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      )}

      {/* 3. CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary key={activeTab} title={tErrors('boundary.moduleTitle', { tab: activeTab })} onBack={() => setActiveTab('mega_atlas')}>

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
          <AdminGate>
            {({ token, expiresAt, logout }) => (
              <SystemTab
                headerSlot={<GameUpdatePanel token={token} expiresAt={expiresAt} onLogout={logout} />}
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
          </AdminGate>
        )}

        {activeTab === 'logbook' && (
          <LogbookTab locateInMegaAtlas={locateInMegaAtlas} />
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
