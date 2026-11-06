// src/components/bloomshire/state/useDailyTasks.js
// Tareas diarias (Task Center) y su contador (movido tal cual desde BloomshireCommand).
import { useMemo, useState } from 'react';

export default function useDailyTasks() {
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

  return { dailyTasks, setDailyTasks, toggleDailyTask, dailyTasksCompletedCount };
}
