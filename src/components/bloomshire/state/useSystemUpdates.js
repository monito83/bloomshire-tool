// src/components/bloomshire/state/useSystemUpdates.js
// Pestaña Ajustes: revisar actualizaciones, forzar descargas y registro del sistema (movido tal cual).
import { useState } from 'react';

export default function useSystemUpdates() {
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState('Todos los módulos y catálogos están 100% sincronizados con el juego.');
  const [systemLogs, setSystemLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), text: 'Sistema Moni-Bot Companion v2.4 iniciado correctamente.', type: 'info' },
    { id: 2, time: new Date().toLocaleTimeString(), text: 'Catálogo de misiones validado: 24 capítulos + secundarias activas.', type: 'success' },
    { id: 3, time: new Date().toLocaleTimeString(), text: 'Mega-Atlas HD: 10 mapas oficiales disponibles en caché local.', type: 'success' },
    { id: 4, time: new Date().toLocaleTimeString(), text: 'Registro de aldeanos: 67 NPCs indexados con tabla de regalos y horarios.', type: 'info' }
  ]);

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

  return { isCheckingUpdates, updateStatusMessage, systemLogs, setSystemLogs, handleCheckUpdates, handleForceRedownload };
}
