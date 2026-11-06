// content_monios.js - Inyectado en Bloomshire Tool (bloomshire-tool.vercel.app y localhost).
// (El nombre del archivo y los mensajes MONIOS_* se conservan por compatibilidad entre versiones
//  de la extension y de la herramienta; MoniOS ya no se usa.)
(function () {
  // SINGLETON GUARD: Prevenir ejecuciones múltiples si se reinyecta el script
  if (window.__bloomshire_monios_loaded) return;
  window.__bloomshire_monios_loaded = true;

  console.log('[Bloomshire Companion] Conexión activa con Bloomshire Tool:', window.location.origin);

  // Version real del manifest: la tool la usa para avisar si hay una version nueva para descargar
  var VERSION = '0.0.0';
  try { VERSION = chrome.runtime.getManifest().version; } catch (e) { }

  function announceReady() {
    // El DOM es compartido con la pagina: la tool lo lee aunque se monte despues de este script
    try { document.documentElement.setAttribute('data-bloomshire-companion', VERSION); } catch (e) { }
    window.postMessage({
      type: 'MONIOS_COMPANION_READY',
      game: 'bloomshire',
      version: VERSION
    }, '*');
    document.dispatchEvent(new CustomEvent('monios_companion_ready', {
      detail: { game: 'bloomshire', version: VERSION }
    }));
  }

  announceReady();

  // La tool pregunta "¿estas?" al abrir la ventana de conexion
  window.addEventListener('message', function (event) {
    if (event.source !== window || !event.data || event.data.type !== 'MONIOS_COMPANION_PING') return;
    announceReady();
  });

  // Al montar en Bloomshire Tool, pedir a background el último estado disponible de inmediato
  try {
    chrome.runtime.sendMessage({ type: 'GET_BLOOMSHIRE_STATE' }, (resp) => {
      if (resp?.data) {
        console.log('[Bloomshire Companion] Estado inicial entregado a Bloomshire Tool:', resp.data);
        window.postMessage({ type: 'MONIOS_COMPANION_SYNC', game: 'bloomshire', data: resp.data }, '*');
        document.dispatchEvent(new CustomEvent('monios_game_sync', { detail: { game: 'bloomshire', data: resp.data } }));
      }
    });
  } catch (e) { }

  let lastInjectedSig = '';
  let lastInjectedAt = 0;

  // Escuchar inyecciones desde background service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'BLOOMSHIRE_INJECT_DATA' && message.data) {
      const data = message.data;
      const force = Boolean(message.force);
      const ordSig = Array.isArray(data.activeOrders)
        ? data.activeOrders.map(o => `${o.rawItem || o.item}:${o.n}:${o.done ? 1 : 0}`).join('|')
        : '';
      const skillsSig = data.skills ? JSON.stringify(data.skills) : '';
      const tasksSig = Array.isArray(data.dailyTasks) ? JSON.stringify(data.dailyTasks) : '';
      const cropsSig = Array.isArray(data.activeCrops)
        ? data.activeCrops.map(c => `${c.id || c.seedId || c.name}:${c.needsWater ? 1 : 0}:${c.readyAt || 0}:${c.plantedAt || 0}`).join('|')
        : '';
      const potsSig = Array.isArray(data.liveProductionPots)
        ? data.liveProductionPots.map(p => `${p.id}:${p.name}:${p.count}:${p.readyAt}`).join('|')
        : '';
      const sig = `${data.gold}_${data.currentEnergy}_${data.farmingLevel || 0}_${data.inventory?.length}_${ordSig}_${skillsSig}_${tasksSig}_${cropsSig}_${potsSig}_${data.activeQuest || ''}`;
      const now = Date.now();

      // Throttling: si es forzado (botón actualizar) NUNCA throttler; si no es forzado, evitar duplicados exactos dentro de 600ms
      if (!force && sig === lastInjectedSig && now - lastInjectedAt < 600) {
        sendResponse({ status: 'throttled' });
        return false;
      }
      lastInjectedSig = sig;
      lastInjectedAt = now;

      console.log('[Bloomshire Companion] Telemetría inyectada en Bloomshire Tool:', {
        gold: data.gold,
        energy: data.currentEnergy,
        items: data.inventory?.length,
        orders: data.activeOrders?.length
      });

      const payloadWithSource = { ...data, _fromExtension: true, timestamp: data.timestamp || now };

      // Disparar mensaje estándar a Bloomshire Tool
      window.postMessage({
        type: 'MONIOS_COMPANION_SYNC',
        game: 'bloomshire',
        data: payloadWithSource
      }, '*');

      document.dispatchEvent(new CustomEvent('monios_game_sync', {
        detail: { game: 'bloomshire', data: payloadWithSource }
      }));

      sendResponse({ status: 'delivered' });
      return false;
    }

    
    if (message.type === 'BLOOMSHIRE_INJECT_MARKET_SNAPSHOT' && message.offers) {
      console.log('[Bloomshire Companion] Ofertas de mercado inyectadas en Bloomshire Tool:', message.offers);
      window.postMessage({
        type: 'MONIOS_MARKET_SNAPSHOT',
        game: 'bloomshire',
        offers: message.offers,
        timestamp: message.timestamp || Date.now()
      }, '*');
      document.dispatchEvent(new CustomEvent('monios_market_snapshot', {
        detail: {
          offers: message.offers,
          timestamp: message.timestamp || Date.now()
        }
      }));
      try {
        localStorage.setItem('bloomshire_cached_market_offers', JSON.stringify({
          offers: message.offers,
          timestamp: message.timestamp || Date.now()
        }));
      } catch (e) {}
      sendResponse({ status: 'market_delivered' });
      return false;
    }

    if (message.type === 'BLOOMSHIRE_INJECT_MARKET_ERROR') {
      window.postMessage({
        type: 'MONIOS_MARKET_SNAPSHOT_ERROR',
        error: message.error || '',
        reason: message.reason || 'game_error'
      }, '*');
      sendResponse({ status: 'market_error_delivered' });
      return false;
    }

    if (message.type === 'BLOOMSHIRE_INJECT_MAP' && message.payload) {
      const mapPayload = message.payload;
      window.postMessage({
        type: 'MONIOS_BLOOMSHIRE_MAP',
        game: 'bloomshire',
        payload: mapPayload
      }, '*');
      document.dispatchEvent(new CustomEvent('monios_bloomshire_map', {
        detail: mapPayload
      }));
      sendResponse({ status: 'map_delivered' });
      return false;
    }
    return false;
  });

  // Debounce para petición de sincronización forzada desde Bloomshire Tool
  let lastForceSyncSent = 0;
  function triggerForceSync() {
    const now = Date.now();
    if (now - lastForceSyncSent < 400) return;
    lastForceSyncSent = now;
    try {
      chrome.runtime.sendMessage({ type: 'FORCE_SYNC_REQUEST' });
      console.log('[Bloomshire Companion] Petición FORCE_SYNC_REQUEST enviada a background');
    } catch (err) { }
  }

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'FORCE_SYNC_ALL') {
      triggerForceSync();
    
    } else if (e.data?.type === 'REQUEST_MARKET_SALES_SYNC') {
      console.log('[Bloomshire Companion] Petición REQUEST_MARKET_SALES_SYNC reenviada a background');
      try {
        chrome.runtime.sendMessage({ type: 'REQUEST_MARKET_SALES_SYNC' }, (resp) => {
          if (resp && !resp.ok) {
            window.postMessage({
              type: 'MONIOS_MARKET_SNAPSHOT_ERROR',
              reason: 'no_game_tab',
              error: 'Pestaña de Bloomshire no detectada. Abre el juego para sincronizar ofertas.'
            }, '*');
          }
        });
      } catch (err) {}

    } else if (e.data?.type === 'SYNC_BLOOMSHIRE_REAL_MAPS') {
      try {
        chrome.runtime.sendMessage({ type: 'SYNC_REAL_MAPS_REQUEST' });
      } catch (err) { }
    }
  });

  document.addEventListener('monios_force_sync', () => {
    triggerForceSync();
  });

  document.addEventListener('monios_sync_real_maps', () => {
    try {
      chrome.runtime.sendMessage({ type: 'SYNC_REAL_MAPS_REQUEST' });
    } catch (err) { }
  });
})();
