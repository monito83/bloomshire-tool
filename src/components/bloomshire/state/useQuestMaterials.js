// src/components/bloomshire/state/useQuestMaterials.js
// Entregas manuales de misiones e insumos que piden las misiones activas (movido tal cual).
import { useMemo, useState } from 'react';
import { DASHBOARD_QUEST_CATALOG, QUEST_REQUIRED_ITEMS } from '../bloomshireHelpers';

export default function useQuestMaterials(activeQuestsList) {
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

  return { deliveredItemsManual, toggleDeliveredItem, activeQuestMaterials };
}
