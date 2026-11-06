// src/components/bloomshire/state/useWalletSession.js
// Wallet y sesion SIWE: billeteras EIP-6963, conectar y firmar, validar la sesion al abrir (/api/auth me),
// y el estado de los modales de conexion. Movido tal cual desde BloomshireCommand.
// applySnapshotRef y disconnectRef los llena el componente principal (aplicar una partida / cerrar sesion).
import { useEffect, useRef, useState } from 'react';

export default function useWalletSession({ applySnapshotRef, disconnectRef }) {
  // Player State
  const [walletAddress, setWalletAddress] = useState(() => {
    try { const w = localStorage.getItem('bloomshire_wallet'); return (w && w !== 'null' && w.startsWith('0x')) ? w : null; } catch { return null; }
  });
  const [sessionToken, setSessionToken] = useState(() => {
    try { return localStorage.getItem('bloomshire_session_token') || null; } catch { return null; }
  });
  const [authenticatedWallet, setAuthenticatedWallet] = useState(null);
  const authenticatedWalletRef = useRef(null);
  const lastReportedExtensionWalletRef = useRef(null);
  useEffect(() => {
    authenticatedWalletRef.current = authenticatedWallet;
  }, [authenticatedWallet]);
  const [viewOnlyWallet, setViewOnlyWallet] = useState(null);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);

  // El acceso premium exige sesión SIWE verificada por el servidor (S1)
  const isConnected = Boolean(isPremiumUnlocked);

  // Settings & System Updates State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [connectCode, setConnectCode] = useState('');
  const [connectFeedback, setConnectFeedback] = useState(null);
  const [injectedWallets, setInjectedWallets] = useState([]);
  const [selectedWalletUuid, setSelectedWalletUuid] = useState(null);

  // Detección de Billeteras mediante estándar EIP-6963 (evita colisión entre Backpack, MetaMask, Rabby, etc.)
  useEffect(() => {
    const handleAnnounce = (event) => {
      if (!event.detail?.info || !event.detail?.provider) return;
      setInjectedWallets(prev => {
        if (prev.some(w => w.info.uuid === event.detail.info.uuid || w.info.name === event.detail.info.name)) return prev;
        return [...prev, event.detail];
      });
    };
    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return () => window.removeEventListener('eip6963:announceProvider', handleAnnounce);
  }, []);

  const handleConnectAndSignWallet = async (explicitProvider = null) => {
    const activeProvider = explicitProvider || 
      (selectedWalletUuid ? injectedWallets.find(w => w.info.uuid === selectedWalletUuid)?.provider : null) ||
      (injectedWallets[0]?.provider) ||
      (typeof window !== 'undefined' ? window.ethereum : null);

    if (!activeProvider) {
      setConnectFeedback({ type: 'error', text: 'No se detectó ninguna billetera Web3 (MetaMask, Backpack, Rabby, etc.) en este navegador.' });
      return;
    }
    try {
      setConnectFeedback({ type: 'loading', text: 'Solicitando conexión con tu billetera Web3...' });
      const accounts = await activeProvider.request({ method: 'eth_requestAccounts' });
      const account = accounts && accounts[0] ? accounts[0].toLowerCase() : null;
      if (!account) {
        setConnectFeedback({ type: 'error', text: 'No se seleccionó ninguna cuenta en la billetera.' });
        return;
      }

      setConnectFeedback({ type: 'loading', text: 'Obteniendo reto criptográfico de firma (nonce)...' });
      const nonceRes = await fetch(`/api/auth?action=nonce&wallet=${encodeURIComponent(account)}`);
      if (!nonceRes.ok) {
        const errJson = await nonceRes.json().catch(() => ({}));
        setConnectFeedback({ type: 'error', text: errJson.error || 'Error al obtener reto de firma del servidor.' });
        return;
      }
      const { nonce, message } = await nonceRes.json();

      setConnectFeedback({ type: 'loading', text: 'Firma el mensaje en tu billetera para verificar tu identidad (sin costo de gas)...' });
      const signature = await activeProvider.request({
        method: 'personal_sign',
        params: [message, account]
      });

      setConnectFeedback({ type: 'loading', text: 'Verificando firma con el servidor...' });
      const verifyRes = await fetch('/api/auth?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', wallet: account, signature, nonce, message })
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => ({}));
        setConnectFeedback({ type: 'error', text: errJson.error || 'Firma inválida.' });
        return;
      }

      const { token } = await verifyRes.json();
      localStorage.setItem('bloomshire_session_token', token);
      localStorage.setItem('bloomshire_wallet', account);
      localStorage.removeItem('bloomshire_manual_disconnected');
      setWalletAddress(account);
      setAuthenticatedWallet(account);
      authenticatedWalletRef.current = account;
      setSessionToken(token);
      setIsPremiumUnlocked(true);

      setConnectFeedback({ type: 'success', text: `¡Sesión autenticada con éxito! (${account.slice(0, 6)}...)` });

      // Cargar partida privada sincronizada
      const syncRes = await fetch(`/api/bloomshire-advisor?action=sync&wallet=${encodeURIComponent(account)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (syncJson.inGame) {
          applySnapshotRef.current({
            ...syncJson.inGame,
            wallet: syncJson.onChain?.wallet || account,
            farmersCount: syncJson.onChain?.farmersCount ?? 0
          }, 'server');
        }
      }
      setTimeout(() => { setShowConnectModal(false); setConnectFeedback(null); }, 1500);
    } catch (err) {
      setConnectFeedback({ type: 'error', text: err.message || 'Firma cancelada o rechazada en la billetera.' });
    }
  };

  // S1: Validar sesión SIWE al inicio con /api/auth?action=me (anti-phishing y protección premium)
  useEffect(() => {
    let isCancelled = false;
    const validateSession = async () => {
      const storedToken = (function() {
        try { return localStorage.getItem('bloomshire_session_token'); } catch (_) { return null; }
      })();
      if (!storedToken) {
        if (!isCancelled) {
          setSessionToken(null);
          setAuthenticatedWallet(null);
          authenticatedWalletRef.current = null;
          setIsPremiumUnlocked(false);
        }
        return;
      }

      try {
        const res = await fetch('/api/auth?action=me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.wallet) {
            const verifiedWallet = json.wallet.toLowerCase();
            authenticatedWalletRef.current = verifiedWallet;

            // S3: Chequeo de condición de carrera al arranque:
            // Si la extensión reportó una wallet antes de terminar /api/auth?action=me, verificar discrepancia inmediatamente.
            const reportedExtWallet = lastReportedExtensionWalletRef.current;
            if (reportedExtWallet && reportedExtWallet !== verifiedWallet) {
              console.warn(`[S3] Conflicto de wallet detectado al inicializar sesión: sesión SIWE pertenece a ${verifiedWallet} pero la extensión ya reportó ${reportedExtWallet}. Cerrando sesión por seguridad.`);
              disconnectRef.current();
              setConnectFeedback({
                type: 'error',
                text: `Se detectó cambio de cuenta en el juego (${reportedExtWallet.slice(0, 6)}...${reportedExtWallet.slice(-4)}). Tu sesión anterior fue cerrada por seguridad. Por favor, vuelve a firmar con la nueva wallet.`
              });
              setShowConnectModal(true);
              return;
            }

            if (!isCancelled) {
              setSessionToken(storedToken);
              setAuthenticatedWallet(verifiedWallet);
              setWalletAddress(verifiedWallet);
              setIsPremiumUnlocked(true);
            }
            return;
          }
        }
        // Si responde 401 o token inválido: limpiar sesión y regresar a modo anónimo
        try {
          localStorage.removeItem('bloomshire_session_token');
          localStorage.removeItem('bloomshire_wallet');
        } catch (_) {}
        if (!isCancelled) {
          setSessionToken(null);
          setAuthenticatedWallet(null);
          authenticatedWalletRef.current = null;
          setWalletAddress(null);
          setIsPremiumUnlocked(false);
        }
      } catch (err) {
        console.warn('Error al verificar sesión SIWE con el servidor:', err);
      }
    };

    validateSession();
    return () => { isCancelled = true; };
  }, []);

  return {
    walletAddress, setWalletAddress, sessionToken, setSessionToken,
    authenticatedWallet, setAuthenticatedWallet, authenticatedWalletRef, lastReportedExtensionWalletRef,
    viewOnlyWallet, setViewOnlyWallet, isPremiumUnlocked, setIsPremiumUnlocked, isConnected,
    showConnectModal, setShowConnectModal, showProfileModal, setShowProfileModal,
    connectCode, setConnectCode, connectFeedback, setConnectFeedback,
    injectedWallets, selectedWalletUuid, setSelectedWalletUuid,
    handleConnectAndSignWallet
  };
}
