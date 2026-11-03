/**
 * api/auth.js
 * Endpoints de autenticación criptográfica SIWE (Sign-In with Ethereum / EIP-4361)
 * para Bloomshire Tool.
 */

import crypto from 'crypto';
import { verifyMessage } from 'viem';
import { SignJWT, jwtVerify } from 'jose';

const ALLOWED_ORIGINS = new Set([
  'https://bloomshire-tool.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
]);

const WALLET_REGEX = /^0x[0-9a-fA-F]{40}$/;
const noncesMap = new Map(); // wallet -> { nonce, message, expiresAt }

function cleanExpiredNonces() {
  const now = Date.now();
  for (const [w, entry] of noncesMap.entries()) {
    if (entry.expiresAt < now) noncesMap.delete(w);
  }
}

export default async function handler(req, res) {
  const reqOrigin = (req.headers.origin || '').trim();
  if (ALLOWED_ORIGINS.has(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://bloomshire-tool.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  cleanExpiredNonces();

  const action = req.query?.action || req.body?.action;

  // 1. GENERAR NONCE Y MENSAJE DE RETO
  if (req.method === 'GET' && action === 'nonce') {
    const rawWallet = (req.query?.wallet || '').trim();
    if (!rawWallet || !WALLET_REGEX.test(rawWallet)) {
      return res.status(400).json({ ok: false, error: 'Wallet inválida. Formato esperado: 0x seguido de 40 caracteres hex.' });
    }
    const wallet = rawWallet.toLowerCase();
    const nonce = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos de validez

    const message = [
      'Iniciar sesión en Bloomshire Tool',
      '',
      `Wallet: ${wallet}`,
      `Nonce: ${nonce}`,
      `Fecha: ${now.toISOString()}`,
      '',
      'Esta firma es gratuita, no interactúa con la blockchain y autentica tu acceso seguro a la herramienta.'
    ].join('\n');

    noncesMap.set(wallet, { nonce, message, expiresAt });

    return res.status(200).json({
      ok: true,
      wallet,
      nonce,
      message,
      expiresAt
    });
  }

  // 2. VERIFICAR FIRMA Y EMITIR JWT
  if (req.method === 'POST' && action === 'verify') {
    const { wallet: rawWallet, signature, nonce } = req.body || {};
    if (!rawWallet || !WALLET_REGEX.test(rawWallet) || !signature || !nonce) {
      return res.status(400).json({ ok: false, error: 'Parámetros incompletos (se requiere wallet, signature y nonce).' });
    }

    const wallet = rawWallet.toLowerCase();
    const stored = noncesMap.get(wallet);

    if (!stored || stored.nonce !== nonce) {
      return res.status(401).json({ ok: false, error: 'Nonce inválido o inexistente. Solicita un nuevo reto de firma.' });
    }

    if (Date.now() > stored.expiresAt) {
      noncesMap.delete(wallet);
      return res.status(401).json({ ok: false, error: 'El nonce ha expirado. Solicita una nueva firma.' });
    }

    try {
      const isValid = await verifyMessage({
        address: wallet,
        message: stored.message,
        signature
      });

      if (!isValid) {
        noncesMap.delete(wallet);
        return res.status(401).json({ ok: false, error: 'Firma criptográfica inválida.' });
      }

      // Replay attack protection: borrar el nonce utilizado
      noncesMap.delete(wallet);

      const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET || 'bloomshire-super-secret-session-salt-2026');
      const token = await new SignJWT({ wallet })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secretKey);

      return res.status(200).json({
        ok: true,
        message: 'Sesión autenticada con éxito',
        token,
        wallet,
        expiresIn: '7d'
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: `Error al verificar la firma: ${err.message}` });
    }
  }

  // 3. CONSULTAR SESIÓN ACTUAL (ME)
  if (req.method === 'GET' && action === 'me') {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Token no provisto' });
    }
    const token = authHeader.slice(7).trim();
    try {
      const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET || 'bloomshire-super-secret-session-salt-2026');
      const { payload } = await jwtVerify(token, secretKey);
      return res.status(200).json({ ok: true, wallet: payload.wallet });
    } catch (_) {
      return res.status(401).json({ ok: false, error: 'Token expirado o inválido' });
    }
  }

  return res.status(400).json({ ok: false, error: 'Acción no soportada. Acciones válidas: nonce, verify, me.' });
}

