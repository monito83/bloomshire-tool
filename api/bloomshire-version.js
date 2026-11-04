/**
 * api/bloomshire-version.js
 * Endpoint de verificación en vivo del Build Hash de Bloomshire y parches de juego.
 */

const VERIFIED_BUILD = '124afc8d9ec7';
const TOOL_VERSION = 'v2.5.0';

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = new Set([
    'https://bloomshire-tool.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ]);
  const reqOrigin = (req.headers.origin || '').trim();
  if (ALLOWED_ORIGINS.has(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://bloomshire-tool.vercel.app');
  }
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
        'User-Agent': 'Bloomshire-Version-Checker/1.0',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const html = await resp.text();
      const rulesMatch = html.match(/bloomshire-rules\s*[:=]\s*["']?([a-zA-Z0-9]{8,16})/i);
      const urlMatch = html.match(/\/v\/([a-zA-Z0-9]{8,16})\//);
      if (rulesMatch && rulesMatch[1]) {
        liveBuild = rulesMatch[1];
        fetchOk = true;
      } else if (urlMatch && urlMatch[1]) {
        liveBuild = urlMatch[1];
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

