import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import '../extension/content_hook.js';

describe('Bloomshire Companion - Synchronizer Reference & Read-Only Safety', () => {
  const { shouldCaptureLiveDoc, captureLiveDoc } = globalThis;

  describe('shouldCaptureLiveDoc', () => {
    it('returns true for canonical api/state endpoints', () => {
      expect(shouldCaptureLiveDoc('/play/api/state')).toBe(true);
      expect(shouldCaptureLiveDoc('/api/state')).toBe(true);
      expect(shouldCaptureLiveDoc('https://bloomshire.xyz/play/api/state')).toBe(true);
      expect(shouldCaptureLiveDoc('https://bloomshire.xyz/play/api/state?t=123456789')).toBe(true);
    });

    it('returns false for api/cmd, trade, crypto, and offers', () => {
      expect(shouldCaptureLiveDoc('/play/api/cmd')).toBe(false);
      expect(shouldCaptureLiveDoc('/api/cmd')).toBe(false);
      expect(shouldCaptureLiveDoc('https://bloomshire.xyz/play/api/cmd')).toBe(false);
      expect(shouldCaptureLiveDoc('/play/api/trade')).toBe(false);
      expect(shouldCaptureLiveDoc('/play/api/crypto')).toBe(false);
      expect(shouldCaptureLiveDoc('/play/api/offers')).toBe(false);
    });

    it('returns false for non-string or unrelated urls', () => {
      expect(shouldCaptureLiveDoc(null)).toBe(false);
      expect(shouldCaptureLiveDoc(undefined)).toBe(false);
      expect(shouldCaptureLiveDoc('')).toBe(false);
      expect(shouldCaptureLiveDoc('/play/api/session')).toBe(false);
      expect(shouldCaptureLiveDoc('/play/api/maps/bloomshire')).toBe(false);
    });
  });

  describe('captureLiveDoc', () => {
    it('captures live doc only from api/state and triggers onCaptured', () => {
      const initialSave = { energy: { v: 150 }, purse: { gold: 100 } };
      let capturedLog = null;
      const onCaptured = (ref, url) => {
        capturedLog = `[Hook] referencia viva fijada desde ${url}`;
      };

      const result = captureLiveDoc(null, { save: initialSave }, '/play/api/state', onCaptured);
      expect(result).toBe(initialSave);
      expect(capturedLog).toBe('[Hook] referencia viva fijada desde /play/api/state');
    });

    it('refuses to overwrite live doc from api/cmd', () => {
      const activeSave = { energy: { v: 140 } };
      const ephemeralCmdSave = { energy: { v: 139 } };

      const result = captureLiveDoc(activeSave, { save: ephemeralCmdSave }, '/play/api/cmd');
      expect(result).toBe(activeSave);
      expect(result.energy.v).toBe(140);
    });
  });

  describe('Game Lifecycle Simulation Sequence (Session.open, #adopt, in-memory mutation)', () => {
    it('maintains identity with session.save through commands, #adopt, and local actions', () => {
      // (a) llega api/state y se fija la referencia
      const sessionSave = {
        energy: { v: 150, at: 1000 },
        purse: { gold: 500, shards: 0 },
        inventory: { hotbar: [], bag: [] },
        farm: {}
      };

      let liveDoc = null;
      liveDoc = captureLiveDoc(liveDoc, { save: sessionSave }, '/play/api/state');
      expect(liveDoc).toBe(sessionSave);
      expect(liveDoc.energy.v).toBe(150);

      // (b) se simula un save('energy', ...) local del juego (ej: caminar / gastar energía)
      sessionSave.energy = { v: 140, at: 1050 };
      expect(liveDoc.energy.v).toBe(140);
      expect(liveDoc).toBe(sessionSave);

      // (c) llega una respuesta de api/cmd con un objeto save distinto del servidor
      const ephemeralServerSave = {
        energy: { v: 139, at: 1100 },
        purse: { gold: 500, shards: 0 },
        inventory: { hotbar: [], bag: [] },
        farm: {}
      };
      const afterCmdAttempt = captureLiveDoc(liveDoc, { save: ephemeralServerSave }, '/play/api/cmd');
      // La referencia NO debe cambiar al objeto efímero
      expect(afterCmdAttempt).toBe(sessionSave);
      expect(afterCmdAttempt).not.toBe(ephemeralServerSave);

      // (d) el juego ejecuta rules.js / Session #adopt:
      // Hace delete de todas las claves sobre session.save y Object.assign con la respuesta del servidor
      for (const k of Object.keys(sessionSave)) {
        delete sessionSave[k];
      }
      Object.assign(sessionSave, ephemeralServerSave);

      // Comprobar que liveDoc refleja inmediatamente los datos adoptados sin haber perdido la referencia
      expect(liveDoc.energy.v).toBe(139);
      expect(liveDoc).toBe(sessionSave);

      // (e) otro save('energy', ...) local del juego (ej: talar un árbol)
      sessionSave.energy = { v: 135, at: 1200 };
      expect(liveDoc.energy.v).toBe(135);
      expect(liveDoc).toBe(sessionSave);
    });
  });

  describe('Static Analysis - Read-Only Invariants (Zero Game Mutation)', () => {
    const hookSource = fs.readFileSync(path.join(__dirname, '..', 'extension', 'content_hook.js'), 'utf8');

    it('contains no mutations on active game save objects', () => {
      expect(hookSource).not.toMatch(/active\[/);
      expect(hookSource).not.toMatch(/delete active/);
      expect(hookSource).not.toMatch(/delete lastKnownSave/);
      expect(hookSource).not.toMatch(/lastKnownSave\[/);
    });

    it('contains no guessing overlay (liveFarmOverlay, deletedCellKeys)', () => {
      expect(hookSource).not.toMatch(/liveFarmOverlay/);
      expect(hookSource).not.toMatch(/deletedCellKeys/);
    });

    it('contains no admin-only window.bloomshire?.play references', () => {
      expect(hookSource).not.toMatch(/bloomshire\?\.play/);
      expect(hookSource).not.toMatch(/window\.bloomshire/);
    });

    it('contains no Object.defineProperty interceptors on save properties', () => {
      expect(hookSource).not.toMatch(/Object\.defineProperty/);
    });
  });
});
