// src/components/bloomshire/admin/AdminGate.jsx
// Muestra su contenido solo con la sesion de admin (la misma contraseña que la
// bitacora). Sin sesion: pantalla de acceso.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LockKeyhole } from 'lucide-react';
import { AdminLoginModal } from '../logbook/adminUi';
import { loadAdminSession, saveAdminSession } from '../logbook/logbookAdminApi';

export default function AdminGate({ children }) {
  const { t } = useTranslation('updates');
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    setSession(loadAdminSession());
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    saveAdminSession(null);
    setSession(null);
  }, []);

  const onSuccess = useCallback((s) => {
    saveAdminSession(s);
    setSession(s);
    setShowLogin(false);
  }, []);

  if (session) return children({ token: session.token, expiresAt: session.expiresAt, logout });

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-amber-500/25 bg-gradient-to-br from-[#101c34] to-[#0a1222] p-8 text-center shadow-2xl lb-fade">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/30">
          <LockKeyhole className="h-7 w-7 text-amber-300" />
        </span>
        <h2 className="text-lg font-black text-amber-100">{t('gate.title')}</h2>
        <p className="mt-1.5 text-sm text-slate-400">{t('gate.body')}</p>
        <button
          type="button"
          disabled={!ready}
          onClick={() => setShowLogin(true)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-2.5 text-xs font-black text-[#1a1205] shadow-[0_8px_24px_-10px_rgba(245,158,11,0.8)] transition-transform hover:-translate-y-0.5 cursor-pointer"
        >
          <LockKeyhole className="h-4 w-4" /> {t('gate.enter')}
        </button>
      </div>
      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} onSuccess={onSuccess} />}
    </div>
  );
}
