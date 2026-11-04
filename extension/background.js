// background.js - Service Worker exclusivo para Bloomshire Companion
console.log('[Bloomshire Companion BG] Service Worker iniciado');

function isToolUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return host === 'bloomshire-tool.vercel.app' || host === 'localhost' || host === '127.0.0.1';
  } catch (_) {
    return false;
  }
}

function isBloomshireUrl(url) {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('bloomshire.xyz') || u.includes('bloomshire.io');
}

// Inyectar bridge en pestaña de Bloomshire si quedó desvinculada tras recarga de extensión
function ensureMoniosInjected(tabId) {
  if (chrome.scripting) {
    chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ['content_monios.js']
    }).catch(() => { });
  }
}

function rebindAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (!tab.id || !tab.url) return;
      if (isBloomshireUrl(tab.url)) {
        ensureBloomshireInjected(tab.id);
      } else if (isToolUrl(tab.url)) {
        ensureMoniosInjected(tab.id);
      }
    });
  });
}

try {
  chrome.runtime.onInstalled.addListener(() => {
    rebindAllTabs();
  });
  rebindAllTabs();
} catch (_) {}

function ensureBloomshireInjected(tabId) {
  if (chrome.scripting) {
    chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ['content_bridge.js']
    }).then(() => {
      chrome.tabs.sendMessage(tabId, { type: 'TRIGGER_FORCE_SYNC' }).catch(() => { });
    }).catch(() => { });
  }
}

// Reenviar datos a pestañas de MoniOS (con control de errores sin bucles)
function broadcastToMonios(data, force = false) {
  if (!data) return;
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (!tab.id) return;
      const url = tab.url || '';
      if (isToolUrl(url)) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'BLOOMSHIRE_INJECT_DATA',
          force: Boolean(force),
          data
        }).catch(() => { });
      }
    });
  });
}

// Throttling en background con firma completa (incluyendo ítems de Odette y misiones)
let lastStateSig = '';
let lastStateBroadcastAt = 0;

function buildFullSig(data) {
  if (!data) return '';
  const ordersSig = Array.isArray(data.activeOrders)
    ? data.activeOrders.map(o => `${o.rawItem || o.item}:${o.n}:${o.done ? 1 : 0}`).join('|')
    : '';
  const invSig = Array.isArray(data.inventory)
    ? data.inventory.map(i => `${i.id}:${i.qty}`).join('|')
    : '';
  const skillsSig = data.skills ? JSON.stringify(data.skills) : '';
  const tasksSig = Array.isArray(data.dailyTasks) ? JSON.stringify(data.dailyTasks) : '';
  const cropsSig = Array.isArray(data.activeCrops)
    ? data.activeCrops.map(c => `${c.id || c.seedId || c.name}:${c.needsWater ? 1 : 0}:${c.readyAt || 0}:${c.plantedAt || 0}`).join('|')
    : '';
  const potsSig = Array.isArray(data.liveProductionPots)
    ? data.liveProductionPots.map(p => `${p.id}:${p.name}:${p.count}:${p.readyAt}`).join('|')
    : '';
  return `${data.gold}_${data.currentEnergy}_${data.shards}_${data.farmingLevel || 0}_${ordersSig}_${invSig}_${skillsSig}_${tasksSig}_${cropsSig}_${potsSig}_${data.activeQuest || ''}`;
}

// Escuchar mensajes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'BLOOMSHIRE_STATE_UPDATE' && message.data) {
    const data = message.data;
    const force = Boolean(message.force);
    const now = Date.now();
    const sig = buildFullSig(data);

    // Si los datos son idénticos, no es forzado y pasaron menos de 1.2 segundos, evitar duplicados
    if (!force && sig === lastStateSig && now - lastStateBroadcastAt < 1200) {
      sendResponse({ status: 'throttled' });
      return false;
    }
    lastStateSig = sig;
    lastStateBroadcastAt = now;

    chrome.storage.local.set({ latest_bloomshire_state: data });
    broadcastToMonios(data, force);
    sendResponse({ status: 'broadcasted' });
    return false;
  }

  if (message.type === 'BLOOMSHIRE_MAP_UPDATE' && message.payload) {
    const mapPayload = message.payload;
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.id) return;
        const url = tab.url || '';
        if (isMoniosUrl(url)) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'BLOOMSHIRE_INJECT_MAP',
            payload: mapPayload
          }).catch(() => { });
        }
      });
    });
    sendResponse({ status: 'map_broadcasted' });
    return false;
  }

  
  if (message.type === 'BLOOMSHIRE_MARKET_SNAPSHOT' && message.offers) {
    console.log('[Background] Guardando y retransmitiendo snapshot de ofertas de mercado');
    chrome.storage.local.set({ latest_market_snapshot: { offers: message.offers, timestamp: message.timestamp || Date.now() } });
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.id) return;
        const url = tab.url || '';
        if (isMoniosUrl(url)) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'BLOOMSHIRE_INJECT_MARKET_SNAPSHOT',
            offers: message.offers,
            timestamp: message.timestamp || Date.now()
          }).catch(() => {});
        }
      });
    });
    sendResponse({ status: 'market_snapshot_broadcasted' });
    return false;
  }

  if (message.type === 'REQUEST_MARKET_SALES_SYNC') {
    console.log('[Background] Petición manual REQUEST_MARKET_SALES_SYNC recibida de MoniOS');
    chrome.tabs.query({}, (tabs) => {
      let bloomshireTabFound = false;
      tabs.forEach(tab => {
        if (!tab.id) return;
        const url = tab.url || '';
        if (isBloomshireUrl(url)) {
          bloomshireTabFound = true;
          chrome.tabs.sendMessage(tab.id, { type: 'FETCH_MARKET_OFFERS_ON_DEMAND' }, () => {
            if (chrome.runtime.lastError) {
              ensureBloomshireInjected(tab.id);
            }
          });
        }
      });
      try {
        sendResponse({ ok: bloomshireTabFound, bloomshireOpen: bloomshireTabFound });
      } catch (_) {}
    });
    return true;
  }

  if (message.type === 'SYNC_REAL_MAPS_REQUEST') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.id) return;
        const url = tab.url || '';
        if (isBloomshireUrl(url)) {
          chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_REAL_MAPS_SYNC' }, () => {
            if (chrome.runtime.lastError) {
              ensureBloomshireInjected(tab.id);
            }
          });
        }
      });
    });
    sendResponse({ status: 'real_maps_sync_requested' });
    return false;
  }

  if (message.type === 'FORCE_SYNC_REQUEST') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.id) return;
        const url = tab.url || '';
        if (isBloomshireUrl(url)) {
          chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_FORCE_SYNC' }, () => {
            if (chrome.runtime.lastError) {
              ensureBloomshireInjected(tab.id);
            }
          });
        }
      });

      // Entregar también de inmediato el último estado en storage por si la pestaña del juego está cerrada
      chrome.storage.local.get(['latest_bloomshire_state'], (res) => {
        if (res.latest_bloomshire_state) {
          broadcastToMonios(res.latest_bloomshire_state, true);
        }
      });
    });

    sendResponse({ status: 'sync_requested' });
    return false;
  }

  if (message.type === 'GET_BLOOMSHIRE_STATE') {
    chrome.storage.local.get(['latest_bloomshire_state'], (res) => {
      try {
        sendResponse({ data: res.latest_bloomshire_state || null });
      } catch (_) {}
    });
    return true; // Async response
  }

  return false;
});
