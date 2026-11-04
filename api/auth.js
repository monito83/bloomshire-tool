/**
 * api/auth.js
 * Endpoints de autenticación criptográfica SIWE (Sign-In with Ethereum / EIP-4361)
 * para Bloomshire Tool.
 *
 * Implementa nonces sin estado basados en HMAC-SHA256 (compatibles con Serverless multi-instancia),
 * validación canónica EIP-4361 con viem/siwe, validación estricta de mensaje obligatorio (anti-phishing)
 * y sesiones JWT de 24 horas con issuer y audience.
 */

import crypto from 'crypto';
import { verifyMessage, getAddress } from 'viem';
import { createSiweMessage, parseSiweMessage, validateSiweMessage } from 'viem/siwe';
import { SignJWT, jwtVerify } from 'jose';

const ALLOWED_ORIGINS = new Set([
  'https://bloomshire-tool.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
]);

const ALLOWED_HOSTS = new Set([
  'bloomshire-tool.vercel.app',
  'localhost:5173',
  'localhost:3000',
  '127.0.0.1:5173'
]);

const WALLET_REGEX = /^0x[0-9a-fA-F]{40}$/;
const SIWE_STATEMENT = 'Iniciar sesión en Bloomshire Tool para proteger y sincronizar tu partida.';

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length < 32) {
    return null;
  }
  return secret.trim();
}

/**
 * Genera un nonce criptográfico sin estado firmado con HMAC-SHA256.
 * Formato: 16 hex (random) + 11 hex (timestamp) + 24 hex (HMAC) = 51 caracteres hex.
 * Permite que cualquier instancia serverless valide el nonce sin base de datos ni memoria compartida.
 */
function generateStatelessNonce(wallet, secret, nowMs = Date.now()) {
  const randomHex = crypto.randomBytes(8).toString('hex'); // 16 chars
  const timeHex = nowMs.toString(16).padStart(11, '0'); // 11 chars
  const hmacHex = crypto.createHmac('sha256', secret)
    .update(`${wallet.toLowerCase()}:${randomHex}:${timeHex}`)
    .digest('hex')
    .slice(0, 24); // 24 chars
  return `${randomHex}${timeHex}${hmacHex}`;
}

/**
 * Verifica la autenticidad, wallet asociada y vigencia de un nonce sin estado.
 */
function verifyStatelessNonce(nonce, wallet, secret) {
  if (typeof nonce !== 'string' || nonce.length !== 51) {
    return { valid: false, error: 'Formato de nonce inválido.' };
  }

  const randomHex = nonce.slice(0, 16);
  const timeHex = nonce.slice(16, 27);
  const hmacHex = nonce.slice(27, 51);

  const issuedAt = parseInt(timeHex, 16);
  if (isNaN(issuedAt)) {
    return { valid: false, error: 'Timestamp de nonce corrupto.' };
  }

  const now = Date.now();
  // Validez de 5 minutos (300.000 ms) + 60s de margen por desincronización de reloj
  if (now - issuedAt > 5 * 60 * 1000) {
    return { valid: false, error: 'El reto de firma (nonce) ha expirado (validez máxima: 5 minutos).' };
  }
  if (issuedAt - now > 60 * 1000) {
    return { valid: false, error: 'Timestamp de nonce en el futuro.' };
  }

  const expectedHmac = crypto.createHmac('sha256', secret)
    .update(`${wallet.toLowerCase()}:${randomHex}:${timeHex}`)
    .digest('hex')
    .slice(0, 24);

  const isValidHmac = crypto.timingSafeEqual(Buffer.from(hmacHex), Buffer.from(expectedHmac));
  if (!isValidHmac) {
    return { valid: false, error: 'Nonce inválido o no generado para esta wallet.' };
  }

  return { valid: true, issuedAt };
}

function resolveHostAndUri(req) {
  const hostHeader = (req.headers.host || '').trim();
  const host = ALLOWED_HOSTS.has(hostHeader) ? hostHeader : 'bloomshire-tool.vercel.app';
  const scheme = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  const uri = `${scheme}://${host}`;
  return { host, uri };
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

  // Comprobación estricta de secreto: SIN fallbacks hardcodeados en el código
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Error de configuración en el servidor: SESSION_SECRET no está definida en las variables de entorno de Vercel (mínimo 32 caracteres).'
    });
  }

  const action = req.query?.action || req.body?.action;

  // 1. GENERAR NONCE Y MENSAJE EIP-4361 (SIWE)
  if (req.method === 'GET' && action === 'nonce') {
    const rawWallet = (req.query?.wallet || '').trim();
    if (!rawWallet || !WALLET_REGEX.test(rawWallet)) {
      return res.status(400).json({
        ok: false,
        error: 'Wallet inválida. Formato esperado: 0x seguido de 40 caracteres hex.'
      });
    }

    const wallet = rawWallet.toLowerCase();
    const checksumWallet = getAddress(wallet);
    const { host, uri } = resolveHostAndUri(req);
    const nowMs = Date.now();
    const nonce = generateStatelessNonce(wallet, sessionSecret, nowMs);
    const issuedAt = new Date(nowMs);
    const expirationTime = new Date(nowMs + 5 * 60 * 1000);

    const message = createSiweMessage({
      address: checksumWallet,
      domain: host,
      uri,
      version: '1',
      chainId: 1,
      nonce,
      issuedAt,
      expirationTime,
      statement: SIWE_STATEMENT
    });

    return res.status(200).json({
      ok: true,
      wallet,
      nonce,
      domain: host,
      message,
      expiresAt: expirationTime.getTime()
    });
  }

  // 2. VERIFICAR FIRMA Y EMITIR JWT (24h)
  if (req.method === 'POST' && action === 'verify') {
    const { wallet: rawWallet, signature, nonce, message } = req.body || {};
    if (!rawWallet || !WALLET_REGEX.test(rawWallet) || !signature || !nonce) {
      return res.status(400).json({
        ok: false,
        error: 'Parámetros incompletos (se requiere wallet, signature y nonce).'
      });
    }

    // P1: message es OBLIGATORIO para prevenir bypass de dominio y ataques de phishing
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Parámetro message obligatorio. Debe contener el mensaje EIP-4361 completo emitido por el servidor.'
      });
    }

    const wallet = rawWallet.toLowerCase();
    const checksumWallet = getAddress(wallet);

    // a) Verificar el nonce sin estado con HMAC
    const nonceCheck = verifyStatelessNonce(nonce, wallet, sessionSecret);
    if (!nonceCheck.valid) {
      return res.status(401).json({ ok: false, error: nonceCheck.error });
    }

    // b) Validar exhaustivamente el mensaje SIWE (P1 + P2)
    const { host, uri } = resolveHostAndUri(req);
    let parsedSiwe;
    try {
      parsedSiwe = parseSiweMessage(message);
    } catch (err) {
      return res.status(400).json({
        ok: false,
        error: `Error al parsear el mensaje EIP-4361: ${err.message}`
      });
    }

    // Validación formal con viem/siwe
    const isValidSiwe = validateSiweMessage({
      address: checksumWallet,
      domain: host,
      nonce,
      message: parsedSiwe
    });
    if (!isValidSiwe) {
      return res.status(401).json({
        ok: false,
        error: 'El mensaje SIWE no coincide con el dominio autorizado, la wallet o el nonce emitido.'
      });
    }

    // Validaciones explícitas de campos críticos (P2)
    if (parsedSiwe.uri !== uri) {
      return res.status(401).json({ ok: false, error: `URI del mensaje no autorizada: ${parsedSiwe.uri}` });
    }
    if (parsedSiwe.chainId !== 1) {
      return res.status(401).json({ ok: false, error: `Chain ID no soportado: ${parsedSiwe.chainId}` });
    }
    if (parsedSiwe.version !== '1') {
      return res.status(401).json({ ok: false, error: `Versión SIWE no soportada: ${parsedSiwe.version}` });
    }
    if (parsedSiwe.statement !== SIWE_STATEMENT) {
      return res.status(401).json({ ok: false, error: 'El statement del mensaje no coincide con el oficial.' });
    }

    // Comprobar expiración del mensaje SIWE
    if (parsedSiwe.expirationTime) {
      const expMs = new Date(parsedSiwe.expirationTime).getTime();
      if (Date.now() > expMs) {
        return res.status(401).json({ ok: false, error: 'El mensaje SIWE ha expirado.' });
      }
    }

    // Reconstruir el mensaje exacto esperado por el servidor a partir del timestamp del nonce y comparar (P1)
    const expectedMessage = createSiweMessage({
      address: checksumWallet,
      domain: host,
      uri,
      version: '1',
      chainId: 1,
      nonce,
      issuedAt: new Date(nonceCheck.issuedAt),
      expirationTime: new Date(nonceCheck.issuedAt + 5 * 60 * 1000),
      statement: SIWE_STATEMENT
    });

    if (message.trim() !== expectedMessage.trim()) {
      return res.status(401).json({
        ok: false,
        error: 'El contenido del mensaje EIP-4361 no coincide exactamente con el reto emitido por el servidor.'
      });
    }

    // c) Validar la firma criptográfica sobre el mensaje SIWE canónico (NUNCA sobre nonce pelado)
    try {
      const isValidSig = await verifyMessage({
        address: wallet,
        message,
        signature
      });

      if (!isValidSig) {
        return res.status(401).json({ ok: false, error: 'Firma criptográfica inválida.' });
      }

      // d) Emitir token JWT con 24 horas de validez, con issuer y audience (P6)
      const secretKey = new TextEncoder().encode(sessionSecret);
      const token = await new SignJWT({ wallet })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('bloomshire-tool')
        .setAudience('bloomshire-tool')
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secretKey);

      return res.status(200).json({
        ok: true,
        message: 'Sesión autenticada con éxito',
        token,
        wallet,
        expiresIn: '24h'
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
      const secretKey = new TextEncoder().encode(sessionSecret);
      const { payload } = await jwtVerify(token, secretKey, {
        issuer: 'bloomshire-tool',
        audience: 'bloomshire-tool'
      });
      return res.status(200).json({ ok: true, wallet: payload.wallet });
    } catch (_) {
      return res.status(401).json({ ok: false, error: 'Token expirado o inválido' });
    }
  }

  return res.status(400).json({ ok: false, error: 'Acción no soportada. Acciones válidas: nonce, verify, me.' });
}
