/**
 * api/bloomshire-version.js
 * Endpoint de verificación en vivo del Build Hash de Bloomshire y parches de juego.
 */

const VERIFIED_BUILD = 'fbaab897dc9e';
const TOOL_VERSION = 'v2.5.0';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = new Date();
  let liveBuild = VERIFIED_BUILD;
  let fetchOk = false;
  let errorMsg = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch('https://bloomshire.xyz/play/', {
      headers: {
        'User-Agent': 'MoniOS-Version-Checker/1.0',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const html = await resp.text();
      const match = html.match(/\/v\/([a-zA-Z0-9]{8,16})\//);
      if (match && match[1]) {
        liveBuild = match[1];
        fetchOk = true;
      }
    } else {
      errorMsg = `HTTP ${resp.status} de bloomshire.xyz`;
    }
  } catch (err) {
    errorMsg = err.name === 'AbortError' ? 'Timeout al contactar servidor del juego' : err.message;
  }

  const isUpToDate = (liveBuild === VERIFIED_BUILD);

  return res.status(200).json({
    ok: true,
    toolVersion: TOOL_VERSION,
    verifiedBuild: VERIFIED_BUILD,
    liveBuild,
    isUpToDate,
    status: isUpToDate ? 'synced' : 'patch_detected',
    serverStatus: fetchOk ? 'online' : 'fallback',
    error: errorMsg,
    checkedAt: now.toISOString(),
    checkedAtFormatted: now.toLocaleTimeString('es-ES')
  });
}

