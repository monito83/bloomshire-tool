import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { slimSnapshot, backupFingerprint, backupDecision, BACKUP_MIN_INTERVAL_MS } from '../src/components/bloomshire/cloudBackup';

const base = {
  wallet: '0xabc', gold: 1000, shards: 5, farmingLevel: 7, isVip: false, currentEnergy: 80,
  energyMeta: { bedWaitText: '3h 10m' }, timestamp: 1,
  inventory: [{ id: 'Wheat', qty: 10, area: 'pack' }, { id: 'Coal', qty: 3, area: 'home' }],
  activeQuestsList: [{ id: 'q1', step: 2 }], activeOrders: [{ id: 'o1', n: 3, done: false }],
  marketTrades: { recent: new Array(200).fill({ item: 'Plank' }) }, skillsBreakdown: { big: true }
};

describe('Respaldo en la nube con freno (Fast Origin Transfer de Vercel)', () => {
  it('saca los datos pesados que la nube no usa', () => {
    const slim = slimSnapshot(base);
    expect(slim.marketTrades).toBeUndefined();
    expect(slim.skillsBreakdown).toBeUndefined();
    expect(slim.inventory).toHaveLength(2);
    expect(base.marketTrades).toBeDefined(); // no toca el original
  });

  it('la energia, el reloj de la cama y la hora no cambian la huella', () => {
    const fp = backupFingerprint(base);
    expect(backupFingerprint({ ...base, currentEnergy: 12, energyMeta: { bedWaitText: '1m' }, timestamp: 999 })).toBe(fp);
    expect(backupFingerprint({ ...base, inventory: [...base.inventory].reverse() })).toBe(fp);
  });

  it('oro, inventario, misiones o pedidos si la cambian', () => {
    const fp = backupFingerprint(base);
    expect(backupFingerprint({ ...base, gold: 1001 })).not.toBe(fp);
    expect(backupFingerprint({ ...base, inventory: [{ id: 'Wheat', qty: 11, area: 'pack' }] })).not.toBe(fp);
    expect(backupFingerprint({ ...base, activeQuestsList: [{ id: 'q1', step: 3 }] })).not.toBe(fp);
    expect(backupFingerprint({ ...base, activeOrders: [{ id: 'o1', n: 3, done: true }] })).not.toBe(fp);
  });

  it('sube la primera vez, saltea si no cambio nada y espera el intervalo si cambio hace poco', () => {
    const now = 10_000_000;
    expect(backupDecision(null, 'a', now).action).toBe('now');
    expect(backupDecision({ at: now - 1000, fp: 'a' }, 'a', now).action).toBe('skip');
    const later = backupDecision({ at: now - 60e3, fp: 'a' }, 'b', now);
    expect(later).toEqual({ action: 'later', waitMs: BACKUP_MIN_INTERVAL_MS - 60e3 });
    expect(backupDecision({ at: now - BACKUP_MIN_INTERVAL_MS, fp: 'a' }, 'b', now).action).toBe('now');
  });

  it('la herramienta ya no sube la partida completa en cada mensaje de la extension', () => {
    const src = fs.readFileSync('src/components/BloomshireCommand.jsx', 'utf8');
    const autoPushes = src.split("fetch('/api/bloomshire-advisor?action=push_snapshot'").length - 1;
    expect(autoPushes).toBe(2); // el respaldo con freno y el boton manual "Guardar en la nube"
    expect(src).toContain('queueCloudBackup(effectiveWallet.toLowerCase(), data, currentToken)');
    expect(src).toContain('slimSnapshot(p.data)');
  });

  it('la extension ya no mete el tablero del mercado en cada partida', () => {
    expect(fs.readFileSync('extension/content_bridge.js', 'utf8')).not.toContain('marketTrades');
    expect(fs.readFileSync('extension/content_hook.js', 'utf8')).not.toContain('_marketTrades');
  });
});
