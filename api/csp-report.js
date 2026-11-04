/**
 * api/csp-report.js
 * Receptor pasivo de violaciones de Content Security Policy (modo reporte).
 * Registra en consola del servidor y devuelve 204 No Content.
 */

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const report = req.body;
      if (process.env.NODE_ENV !== 'production') {
        console.info('[CSP-Report]', JSON.stringify(report));
      }
    } catch (_) {}
    return res.status(204).end();
  }

  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}

