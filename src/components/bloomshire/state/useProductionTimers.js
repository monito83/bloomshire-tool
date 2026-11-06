// src/components/bloomshire/state/useProductionTimers.js
// Cosechas y temporizadores de produccion en vivo, alarma y campanilla (movido tal cual).
import { useEffect, useRef, useState } from 'react';
import { getSharedAudioContext } from '../bloomshireHelpers';

export default function useProductionTimers() {
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
    location: 'home',
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
      location: newTimerForm.location || 'home',
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

  return {
    activeCrops, setActiveCrops,
    productionTimers, setProductionTimers,
    soundAlarmEnabled, setSoundAlarmEnabled,
    showAddTimerModal, setShowAddTimerModal,
    newTimerForm, setNewTimerForm,
    serverTimeOffset, setServerTimeOffset,
    playChimeAlarm, handleAddProductionTimer, handleRemoveProductionTimer
  };
}
