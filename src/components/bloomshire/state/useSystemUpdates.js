// src/components/bloomshire/state/useSystemUpdates.js
// Pestaña Ajustes: revisar actualizaciones, forzar descargas y registro del sistema.
// La version de referencia sale de official/meta.json (la escribe el robot de actualizacion).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import meta from '../../../../public/data/bloomshire/official/meta.json';

export const DATA_GAME_VERSION = meta.gameVersion || '';

const logLine = (text, type) => ({ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), text, type });

export default function useSystemUpdates() {
  const { t } = useTranslation('session');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState(() => t('system.idle'));
  const [systemLogs, setSystemLogs] = useState(() => [
    logLine(t('system.started'), 'info'),
    logLine(t('system.data', {
      version: DATA_GAME_VERSION,
      items: meta.counts?.codex ?? 0,
      beasts: meta.counts?.beasts ?? 0,
      places: meta.counts?.places ?? 0
    }), 'success')
  ]);

  const pushLog = (text, type) => setSystemLogs(prev => [logLine(text, type), ...prev].slice(0, 50));

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateStatusMessage(t('system.checking'));

    try {
      window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
    } catch (e) {}

    try {
      const res = await fetch('/api/bloomshire-version');
      if (res.ok) {
        const info = await res.json();
        const ours = info.verifiedBuild || DATA_GAME_VERSION;
        setIsCheckingUpdates(false);
        if (info.isUpToDate) {
          setUpdateStatusMessage(t('system.upToDate', { live: info.liveBuild }));
          pushLog(t('system.upToDateLog', { live: info.liveBuild }), 'success');
        } else {
          setUpdateStatusMessage(t('system.patch', { live: info.liveBuild, ours }));
          pushLog(t('system.patchLog', { live: info.liveBuild, ours }), 'warning');
        }
        return;
      }
    } catch (err) {
      console.warn('Fallo chequeo de versión API:', err);
    }

    setIsCheckingUpdates(false);
    setUpdateStatusMessage(t('system.checkFailed', { ours: DATA_GAME_VERSION }));
    pushLog(t('system.checkFailed', { ours: DATA_GAME_VERSION }), 'warning');
  };

  const handleForceRedownload = (moduleKey) => {
    if (moduleKey === 'maps') {
      try {
        window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
      } catch (e) {}
      pushLog(t('system.mapsLog'), 'info');
    } else {
      try {
        window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      } catch (e) {}
      pushLog(t('system.scanLog', { module: moduleKey || 'all' }), 'info');
    }
  };

  return { isCheckingUpdates, updateStatusMessage, systemLogs, setSystemLogs, handleCheckUpdates, handleForceRedownload };
}
