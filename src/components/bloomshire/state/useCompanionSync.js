// src/components/bloomshire/state/useCompanionSync.js
// Sincronizacion con la extension: aplicar una partida (applyIncomingSync), restaurar la cache al abrir,
// escuchar los mensajes de la extension y consultar al servidor (boton Sync). Movido tal cual desde
// BloomshireCommand: los nombres de estado se toman de los otros hooks para no cambiar una linea de la logica.
import { useEffect, useRef } from 'react';
import { computeCanonicalSkillsFromRaw, computeClientLiveEnergyAndBed, computeMaxEnergy } from '../bloomshireEngine';
import { calculateLocalQuantities } from './inventoryLocal';
import { PERKS_WALLET_KEY } from './usePlayerState';
import { markCompanionSeen } from './useCompanionStatus';

export default function useCompanionSync({ wallet, player, timers, tasks, queueCloudBackup, handleDisconnect }) {
  const {
    walletAddress, setWalletAddress, sessionToken, authenticatedWalletRef, lastReportedExtensionWalletRef,
    setConnectFeedback, setShowConnectModal
  } = wallet;
  const {
    setGold, setShards, setAvyn, setIsVip, vipUntil, setVipUntil, playerPerks, setPlayerPerks,
    farmersOwned, setFarmersOwned, setMaxEnergy, setSnapshotTimestamp, setRawEnergyObj,
    setFarmingLevel, setSkillsBreakdown, setSkillsMeta, setCurrentEnergy, setEnergyMeta,
    setActiveQuestsList, setMoonmereProgress, setRawInventory, setItemQuantities, inventoryScope,
    setActiveOrders, setActiveQuest, setIsSyncStale, setLastSyncTime, setIsSyncing
  } = player;
  const { setServerTimeOffset, setActiveCrops, setProductionTimers } = timers;
  const { setDailyTasks } = tasks;

  const lastExtensionSyncAtRef = useRef(0);

  // Al vincular otra wallet (firma u otra cuenta), los beneficios de la partida anterior no son suyos:
  // se borran y la estamina maxima vuelve a calcularse solo con los Farmers on-chain de la nueva.
  useEffect(() => {
    if (!walletAddress) return;
    let owner = null;
    try { owner = localStorage.getItem(PERKS_WALLET_KEY); } catch (_) {}
    if (owner && owner.toLowerCase() === walletAddress.toLowerCase()) return;
    setPlayerPerks(null);
    setIsVip(false);
    setVipUntil(0);
    setMaxEnergy(computeMaxEnergy(false, farmersOwned > 0));
    try {
      ['bloomshire_cached_perks', 'bloomshire_cached_is_vip', 'bloomshire_cached_vip_until', PERKS_WALLET_KEY]
        .forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

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
        key: 'feedback.walletChanged',
        params: { wallet: `${effectiveWallet.slice(0, 6)}...${effectiveWallet.slice(-4)}` }
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

    // Perks reales emitidos por el juego (save.perks). Son de la cuenta de ESTA partida: si la partida trae
    // el campo, manda (null = sin beneficios); si no lo trae, se conservan solo si son de la misma wallet.
    const perksOwner = (() => { try { return localStorage.getItem(PERKS_WALLET_KEY); } catch (_) { return null; } })();
    const sameAccount = !effectiveWallet || !perksOwner || perksOwner.toLowerCase() === effectiveWallet.toLowerCase();
    let effectivePerks = sameAccount ? playerPerks : null;
    if ('perks' in data) effectivePerks = (data.perks && typeof data.perks === 'object') ? data.perks : null;
    setPlayerPerks(effectivePerks);
    try {
      if (effectivePerks) localStorage.setItem('bloomshire_cached_perks', JSON.stringify(effectivePerks));
      else localStorage.removeItem('bloomshire_cached_perks');
      if (effectiveWallet) localStorage.setItem(PERKS_WALLET_KEY, effectiveWallet.toLowerCase());
    } catch (_) {}

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
      setItemQuantities(calculateLocalQuantities(data.inventory, inventoryScope));
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
        markCompanionSeen();
        applyIncomingSync(event.data.data, 'extension');
      }
    };
    const handleCompanionCustomEvent = (event) => {
      if (event.detail?.game === 'bloomshire') {
        markCompanionSeen();
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

  return { applyIncomingSync, fetchSyncFromServer, lastExtensionSyncAtRef };
}
