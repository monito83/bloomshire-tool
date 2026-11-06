// src/components/bloomshire/cloudBackup.js
// Respaldo de la partida en la nube (POST /api/bloomshire-advisor?action=push_snapshot), con freno.
//
// Antes se subia la partida completa en cada mensaje de la extension: cada accion en el juego y ademas
// cerca de una vez por minuto por el reloj de energia/cama. Eso consumia el Fast Origin Transfer de Vercel
// (plan Hobby: 10 GB por mes). Ahora:
//  - se sube como mucho una vez cada BACKUP_MIN_INTERVAL_MS,
//  - solo si cambio algo que importa (oro, inventario, pedidos, misiones, habilidades, nivel, VIP),
//  - y sin los datos pesados que la nube no usa (el tablero del mercado, el desglose de habilidades).

export const BACKUP_MIN_INTERVAL_MS = 5 * 60e3;

const HEAVY_KEYS = ['marketTrades', 'skillsBreakdown', 'skillsMeta', '_fromExtension', '_userForced'];

/** La partida sin lo que la nube no necesita. */
export function slimSnapshot(data) {
  const out = { ...(data || {}) };
  HEAVY_KEYS.forEach((k) => { delete out[k]; });
  return out;
}

/** Huella de lo que importa para el respaldo (sin energia, reloj de cama ni marcas de tiempo). */
export function backupFingerprint(data) {
  if (!data) return '';
  const inv = (Array.isArray(data.inventory) ? data.inventory : [])
    .map((it) => `${it?.id}|${it?.qty ?? it?.count ?? 1}|${it?.area ?? ''}|${it?.tier ?? ''}`)
    .sort();
  const quests = (Array.isArray(data.activeQuestsList) ? data.activeQuestsList : [])
    .map((q) => `${q?.id}|${q?.step ?? q?.stepIdx ?? ''}`)
    .sort();
  const orders = (Array.isArray(data.activeOrders) ? data.activeOrders : [])
    .map((o) => `${o?.id ?? o?.item}|${o?.n ?? ''}|${o?.done ? 1 : 0}`)
    .sort();
  return JSON.stringify([
    data.gold ?? null, data.shards ?? null, data.avyn ?? null, data.bank ?? null, data.farmingLevel ?? null,
    Boolean(data.isVip), data.completedQuestsCount ?? null, data.skills ?? null, inv, quests, orders
  ]);
}

/**
 * Decide que hacer con una partida nueva.
 *  'skip'  -> no cambio nada importante
 *  'now'   -> subir ya
 *  'later' -> cambio, pero se subio hace poco: subir cuando pase el intervalo (devuelve waitMs)
 */
export function backupDecision(last, fingerprint, now = Date.now(), minMs = BACKUP_MIN_INTERVAL_MS) {
  if (last && last.fp === fingerprint) return { action: 'skip' };
  const since = last?.at ? now - last.at : Infinity;
  if (since >= minMs) return { action: 'now' };
  return { action: 'later', waitMs: minMs - since };
}
