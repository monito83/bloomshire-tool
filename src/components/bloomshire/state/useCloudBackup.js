// src/components/bloomshire/state/useCloudBackup.js
// Respaldo de la partida en la nube con freno (ver ../cloudBackup.js). Movido tal cual desde BloomshireCommand.
import { useEffect, useRef } from 'react';
import { slimSnapshot, backupFingerprint, backupDecision, CLOUD_BACKUP_AUTO } from '../cloudBackup';

export default function useCloudBackup() {
  // Respaldo en la nube con freno (ver cloudBackup.js): apagado por ahora; prendido, sube como mucho cada 10 min y solo si cambio algo importante
  const cloudBackupRef = useRef({ last: null, pending: null, timer: null });
  const flushCloudBackup = () => {
    const box = cloudBackupRef.current;
    box.timer = null;
    const p = box.pending;
    if (!p) return;
    box.pending = null;
    box.last = { at: Date.now(), fp: p.fp };
    let token = p.token;
    try { token = localStorage.getItem('bloomshire_session_token') || token; } catch (_) {}
    if (!token) return;
    fetch('/api/bloomshire-advisor?action=push_snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        action: 'push_snapshot',
        wallet: p.wallet,
        snapshot: { ...slimSnapshot(p.data), wallet: p.wallet, timestamp: Date.now() }
      })
    }).catch(() => {});
  };
  const queueCloudBackup = (wallet, data, token) => {
    if (!CLOUD_BACKUP_AUTO) return;
    const box = cloudBackupRef.current;
    const fp = backupFingerprint(data);
    const decision = backupDecision(box.last, fp);
    if (decision.action === 'skip') { box.pending = null; return; }
    box.pending = { wallet, data, token, fp };
    if (decision.action === 'now') { clearTimeout(box.timer); flushCloudBackup(); return; }
    if (!box.timer) box.timer = setTimeout(flushCloudBackup, decision.waitMs);
  };
  useEffect(() => () => clearTimeout(cloudBackupRef.current.timer), []);

  return { queueCloudBackup };
}
