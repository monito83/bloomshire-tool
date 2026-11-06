// popup.js - Dedicated Bloomshire popup
function computePopupLiveEnergy(data) {
  if (!data) return 150;
  const maxE = data.maxEnergy ?? 150;
  const e = data.rawEnergyObj;
  if (e && typeof e.v === 'number' && typeof e.at === 'number') {
    const now = Date.now();
    const regenRate = 1 / (3 * 60000); // +1 cada 3m VIP
    let v = e.v;
    let t = e.at;
    const r = e.recovery;
    if (r && typeof r.from === 'number' && typeof r.until === 'number' && typeof r.rate === 'number') {
      if (Math.min(now, r.from) > t) {
        v = Math.min(maxE, v + regenRate * (Math.min(now, r.from) - t));
        t = Math.min(now, r.from);
      }
      if (Math.min(now, r.until) > t) {
        v = Math.min(maxE, v + r.rate * (Math.min(now, r.until) - t));
        t = Math.min(now, r.until);
      }
    }
    if (now > t) {
      v = Math.min(maxE, v + regenRate * (now - t));
    }
    return Math.floor(Math.max(0, Math.min(maxE, v)));
  }
  return typeof data.currentEnergy === 'number' ? Math.floor(data.currentEnergy) : 150;
}

function updateUI(data) {
  if (!data) return;
  document.getElementById('goldVal').textContent = `${(data.gold ?? 0).toLocaleString('es-ES')}g`;
  const liveEnergy = computePopupLiveEnergy(data);
  document.getElementById('energyVal').textContent = `${liveEnergy} / ${data.maxEnergy ?? 150}⚡`;
  const rawAvyn = Number(data.avyn ?? 0);
  const formattedAvyn = rawAvyn > 100000 ? Math.round(rawAvyn / 1e6) : rawAvyn;
  document.getElementById('shardsVal').textContent = `${data.shards ?? 0} / ${formattedAvyn} A`;
  
  const invLen = Array.isArray(data.inventory) ? data.inventory.length : 0;
  document.getElementById('invVal').textContent = `${invLen} ítems`;

  const time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
  document.getElementById('lastSyncTxt').textContent = `Sync: ${time}`;
}

// Cargar estado guardado al abrir el popup
chrome.storage.local.get(['latest_bloomshire_state'], (res) => {
  if (res.latest_bloomshire_state) {
    updateUI(res.latest_bloomshire_state);
  }
});

// Botón de sincronización forzada
document.getElementById('btnSync').addEventListener('click', () => {
  const btn = document.getElementById('btnSync');
  btn.textContent = '⏳ Extrayendo de Bloomshire...';
  chrome.runtime.sendMessage({ type: 'FORCE_SYNC_REQUEST' }, () => {
    setTimeout(() => {
      chrome.storage.local.get(['latest_bloomshire_state'], (res) => {
        if (res.latest_bloomshire_state) updateUI(res.latest_bloomshire_state);
        btn.textContent = '✓ Sincronizado';
        setTimeout(() => {
          btn.textContent = '⚡ Forzar sincronización';
        }, 1500);
      });
    }, 800);
  });
});
