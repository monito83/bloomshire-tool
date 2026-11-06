import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { unzipSync, strFromU8 } from 'fflate';

import i18n from '../src/i18n/index';
import ConnectModal from '../src/components/bloomshire/app/ConnectModal';
import {
  compareVersions, companionState, LATEST_EXTENSION_VERSION, EXTENSION_ZIP_URL
} from '../src/components/bloomshire/state/useCompanionStatus';
import { buildExtensionZip, listExtensionFiles } from '../scripts/build_extension_zip.mjs';

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'extension/manifest.json'), 'utf8'));

describe('Extension: version y estado', () => {
  it('compareVersions', () => {
    expect(compareVersions('1.2.0', '1.3.0')).toBe(-1);
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.3', '1.3.0')).toBe(0);
    expect(compareVersions('', '0.0.1')).toBe(-1);
  });

  it('companionState: buscando, falta, vieja (con o sin version) y al dia', () => {
    expect(companionState({ version: null, legacy: false, settled: false })).toBe('checking');
    expect(companionState({ version: null, legacy: false, settled: true })).toBe('missing');
    expect(companionState({ version: null, legacy: true, settled: true })).toBe('outdated');
    expect(companionState({ version: '1.0.0', legacy: false, settled: true })).toBe('outdated');
    expect(companionState({ version: LATEST_EXTENSION_VERSION, legacy: true, settled: true })).toBe('ok');
  });

  it('la ultima version es la del manifest y la extension anuncia su version real', () => {
    expect(LATEST_EXTENSION_VERSION).toBe(manifest.version);
    const src = fs.readFileSync(path.join(ROOT, 'extension/content_monios.js'), 'utf8');
    expect(src).toContain('chrome.runtime.getManifest().version');
    expect(src).toContain('data-bloomshire-companion');
    expect(src).toContain('MONIOS_COMPANION_PING');
  });
});

describe('Extension: zip para descargar', () => {
  it('trae todos los archivos dentro de bloomshire-companion/ y el manifest correcto', () => {
    const r = buildExtensionZip();
    expect(r.version).toBe(manifest.version);
    const zip = unzipSync(new Uint8Array(fs.readFileSync(path.join(ROOT, 'public', EXTENSION_ZIP_URL))));
    const names = Object.keys(zip).sort();
    expect(names).toEqual(listExtensionFiles().map((f) => `bloomshire-companion/${f}`).sort());
    expect(JSON.parse(strFromU8(zip['bloomshire-companion/manifest.json'])).version).toBe(manifest.version);
    expect(names.some((n) => n.split('/').some((p) => p.startsWith('.')))).toBe(false);
  });
});

describe('Ventana de conexion', () => {
  afterEach(async () => { await i18n.changeLanguage('en'); });
  const props = {
    applyIncomingSync: () => {}, connectFeedback: null, handleConnectAndSignWallet: () => {}, injectedWallets: [],
    setConnectFeedback: () => {}, setShowConnectModal: () => {}
  };

  it('muestra los dos pasos, la descarga y que suma cada uno; sin la opcion de pegar una wallet', async () => {
    await i18n.changeLanguage('es');
    const html = renderToString(<ConnectModal {...props} />);
    expect(html).toContain('Extensión Bloomshire Companion');
    expect(html).toContain('Firmá con tu wallet');
    expect(html).toContain(EXTENSION_ZIP_URL);
    expect(html).toContain('Qué suma cada paso');
    expect(html).not.toMatch(/0x\.\.\./);
    expect(html).not.toMatch(/Opci[oó]n 3/);
  });

  it('con la wallet firmada muestra el paso 2 hecho y no ofrece firmar de nuevo', async () => {
    const html = renderToString(<ConnectModal {...props} isConnected walletAddress="0x1234567890abcdef1234567890abcdef12345678" />);
    expect(html).toContain('Signed · 0x1234…5678');
    expect(html).not.toContain('Connect and sign');
  });
});
