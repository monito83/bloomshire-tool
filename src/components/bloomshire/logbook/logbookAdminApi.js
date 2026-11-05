// src/components/bloomshire/logbook/logbookAdminApi.js
// Cliente de /api/logbook-admin. La sesion (JWT 12 h) vive en sessionStorage:
// se pierde al cerrar la pestaña del navegador y no la ven otras pestañas.

const API = '/api/logbook-admin';
const STORAGE_KEY = 'bloomshire_logbook_admin';

export function loadAdminSession() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.token !== 'string' || !Number.isFinite(s.expiresAt) || s.expiresAt <= Date.now() + 30000) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function saveAdminSession(session) {
  try {
    if (session) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* almacenamiento bloqueado: la sesion dura hasta recargar */ }
}

export class AdminApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export async function adminCall(action, payload = {}, token = null) {
  let res;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ action, ...payload })
    });
  } catch {
    throw new AdminApiError('network_error', 0);
  }
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new AdminApiError(res.status === 404 ? 'not_available' : 'server_error', res.status);
  const data = await res.json();
  if (!res.ok || !data || data.ok === false) throw new AdminApiError((data && data.error) || 'server_error', res.status);
  return data;
}

export const adminLogin = (password) => adminCall('login', { password });
