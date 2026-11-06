// src/components/bloomshire/state/useActiveTab.js
// Pestaña activa, enlaces #logbook y "Ubicar en el Mega-Atlas" (movido tal cual desde BloomshireCommand).
import { useEffect, useState } from 'react';

export default function useActiveTab() {
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

  return { VALID_TABS, activeTab, setActiveTab, atlasFocusTarget, setAtlasFocusTarget, locateInMegaAtlas };
}
