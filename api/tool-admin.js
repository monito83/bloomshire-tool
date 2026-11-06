/**
 * api/tool-admin.js — Ajustes de la herramienta (solo admin)
 *
 * POST /api/tool-admin   body JSON { action }   (exige el JWT de admin de api/logbook-admin.js)
 *   status       -> version del juego en vivo vs version de los datos publicados, historial de cambios
 *   runs         -> ultimas corridas del robot de actualizacion (GitHub Actions)
 *   run_update   -> dispara el robot ahora (workflow_dispatch)
 *
 * Variables de entorno:
 *   GITHUB_UPDATE_TOKEN   token de GitHub con permiso Actions: lectura y escritura sobre el repo
 *   GITHUB_REPO           (opcional) "monito83/bloomshire-tool"
 */
import { getConfig, verifyToken, isSameOrigin } from './logbook-admin.js';
import meta from '../public/data/bloomshire/official/meta.json' with { type: 'json' };
import changes from '../public/data/bloomshire/official/changes.json' with { type: 'json' };

const WORKFLOW = 'game-update.yml';
const repo = () => (process.env.GITHUB_REPO || 'monito83/bloomshire-tool').trim();
const ghToken = () => (process.env.GITHUB_UPDATE_TOKEN || '').trim();

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

async function gh(pathAndQuery, { method = 'GET', body } = {}) {
  const token = ghToken();
  if (!token) throw new HttpError(503, 'github_not_configured');
  const res = await fetch(`https://api.github.com/repos/${repo()}/${pathAndQuery}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bloomshire-tool',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 || res.status === 403) throw new HttpError(502, 'github_forbidden');
  if (res.status === 404) throw new HttpError(502, 'github_not_found');
  if (!res.ok) throw new HttpError(502, 'github_error');
  return res.status === 204 ? null : res.json();
}

/** Version publicada ahora en bloomshire.xyz/play/ (null si no responde). */
export async function fetchLiveGameVersion(timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://bloomshire.xyz/play/', { headers: { 'User-Agent': 'Bloomshire-Tool-Version-Check/1.0' }, signal: ctrl.signal });
    if (!res.ok) return null;
    const html = await res.text();
    const version = /v\/([0-9a-f]{8,16})\/js\//.exec(html)?.[1] || null;
    const rules = /name=["']bloomshire-rules["']\s+content=["']([0-9a-zA-Z]+)["']/.exec(html)?.[1] || null;
    return version ? { gameVersion: version, rulesHash: rules } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const shortRun = (r) => ({
  id: r.id,
  status: r.status,            // queued | in_progress | completed
  conclusion: r.conclusion,    // success | failure | cancelled | null
  event: r.event,              // schedule | workflow_dispatch
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  url: r.html_url
});

const actions = {
  async status() {
    const live = await fetchLiveGameVersion();
    const tool = { gameVersion: meta.gameVersion, rulesHash: meta.rulesHash, generatedAt: meta.generatedAt, counts: meta.counts };
    return {
      ok: true,
      live,
      tool,
      upToDate: live ? live.gameVersion === tool.gameVersion && (!live.rulesHash || live.rulesHash === tool.rulesHash) : null,
      updates: (changes.updates || []).slice(0, 10),
      github: { configured: Boolean(ghToken()), repo: repo(), workflowUrl: `https://github.com/${repo()}/actions/workflows/${WORKFLOW}`, commitsUrl: `https://github.com/${repo()}/pulls?q=is%3Apr+head%3Abot%2F` }
    };
  },

  async runs() {
    const data = await gh(`actions/workflows/${WORKFLOW}/runs?per_page=6&branch=main`);
    return { ok: true, runs: (data.workflow_runs || []).map(shortRun) };
  },

  async run_update() {
    const data = await gh(`actions/workflows/${WORKFLOW}/runs?per_page=3&branch=main`);
    if ((data.workflow_runs || []).some((r) => r.status !== 'completed')) throw new HttpError(409, 'update_running');
    await gh(`actions/workflows/${WORKFLOW}/dispatches`, { method: 'POST', body: { ref: 'main', inputs: { reason: 'Boton Actualizar en Ajustes' } } });
    return { ok: true };
  }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!isSameOrigin(req)) return res.status(403).json({ ok: false, error: 'forbidden_origin' });
  const cfg = getConfig();
  if (!cfg.secret || !cfg.password) return res.status(503).json({ ok: false, error: 'not_configured' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const action = String(body?.action || '');
  if (!Object.prototype.hasOwnProperty.call(actions, action)) return res.status(400).json({ ok: false, error: 'invalid_action' });
  const session = await verifyToken(req, cfg);
  if (!session) return res.status(401).json({ ok: false, error: 'unauthorized' });
  try {
    return res.status(200).json(await actions[action](body));
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ ok: false, error: err.code });
    console.error('[tool-admin] error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
