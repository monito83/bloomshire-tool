// src/components/bloomshire/admin/GameUpdatePanel.jsx
// Ajustes (solo admin): version del juego en vivo vs datos de la herramienta,
// boton para actualizar (robot de GitHub Actions), corridas recientes e
// historial de lo que cambio en cada actualizacion.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Rocket, CircleCheck, CircleAlert, CircleX, LoaderCircle, ExternalLink, LogOut, History, Clock
} from 'lucide-react';
import { baseLang, pickLang } from '../logbook/logbookModel';
import { useAdminErrorText } from '../logbook/adminUi';

const API = '/api/tool-admin';

async function call(action, token) {
  let res;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action })
    });
  } catch {
    const e = new Error('network_error'); e.code = 'network_error'; throw e;
  }
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : null;
  if (!res.ok || !data || data.ok === false) {
    const e = new Error((data && data.error) || (res.status === 404 ? 'not_available' : 'server_error'));
    e.code = e.message;
    e.status = res.status;
    throw e;
  }
  return data;
}

const fmtDate = (iso, lang) => {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); } catch { return iso; }
};

function RunBadge({ run, t }) {
  if (run.status !== 'completed') {
    return <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-0.5 text-[10px] font-black text-sky-300"><LoaderCircle className="h-3 w-3 animate-spin" />{t(`runs.status.${run.status}`, { defaultValue: run.status })}</span>;
  }
  const ok = run.conclusion === 'success';
  const Icon = ok ? CircleCheck : run.conclusion === 'cancelled' ? CircleAlert : CircleX;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
      <Icon className="h-3 w-3" />{t(`runs.conclusion.${run.conclusion}`, { defaultValue: run.conclusion })}
    </span>
  );
}

function NameList({ list, lang, tone }) {
  if (!list || !list.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {list.slice(0, 12).map((x) => (
        <span key={x.id} className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>{pickLang(x, 'name', lang) || x.id}</span>
      ))}
      {list.length > 12 && <span className="text-[10px] text-slate-500">+{list.length - 12}</span>}
    </span>
  );
}

export default function GameUpdatePanel({ token, expiresAt, onLogout }) {
  const { t, i18n } = useTranslation('updates');
  const lang = baseLang(i18n.language);
  const errorText = useAdminErrorText();
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runsError, setRunsError] = useState(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef(null);

  const handleError = useCallback((err, set) => {
    if (err.code === 'unauthorized') { onLogout(); return; }
    set(err);
  }, [onLogout]);

  const loadRuns = useCallback(async () => {
    try {
      const r = await call('runs', token);
      setRuns(r.runs);
      setRunsError(null);
      return r.runs;
    } catch (err) {
      handleError(err, setRunsError);
      return null;
    }
  }, [token, handleError]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await call('status', token));
    } catch (err) {
      handleError(err, setError);
    }
    await loadRuns();
    setLoading(false);
  }, [token, loadRuns, handleError]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Mientras el robot trabaja, consultar cada 10 s
  const running = (runs || []).some((r) => r.status !== 'completed');
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!running) return undefined;
    pollRef.current = setInterval(async () => {
      const r = await loadRuns();
      if (r && !r.some((x) => x.status !== 'completed')) loadAll();
    }, 10000);
    return () => clearInterval(pollRef.current);
  }, [running, loadRuns, loadAll]);

  const startUpdate = async () => {
    setStarting(true);
    setRunsError(null);
    try {
      await call('run_update', token);
      // GitHub tarda unos segundos en listar la corrida nueva
      setTimeout(loadRuns, 4000);
      setTimeout(loadRuns, 9000);
    } catch (err) {
      handleError(err, setRunsError);
    } finally {
      setTimeout(() => setStarting(false), 4000);
    }
  };

  const live = status?.live;
  const tool = status?.tool;
  const upToDate = status?.upToDate;
  const gh = status?.github;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(245,158,11,0.14),transparent_55%),linear-gradient(135deg,#101c34,#0a1222)] p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-white">
              <span className="rounded-lg border border-amber-500/30 bg-amber-500/15 p-1.5">🛰️</span>
              {t('title')}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={loadAll} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-amber-500/50 disabled:opacity-50 cursor-pointer">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> {t('check')}
            </button>
            <button type="button" onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-rose-200 cursor-pointer" title={expiresAt ? t('sessionUntil', { time: new Date(expiresAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) }) : undefined}>
              <LogOut className="h-3.5 w-3.5" /> {t('logout')}
            </button>
          </div>
        </div>

        {error && <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{errorText(error)}</p>}

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700/70 bg-black/20 p-3.5">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('live')}</div>
            <div className="mt-1 font-mono text-base font-black text-cyan-300">{live ? live.gameVersion : loading ? '…' : t('unreachable')}</div>
            {live?.rulesHash && <div className="font-mono text-[10.5px] text-slate-500">{t('rules', { hash: live.rulesHash })}</div>}
          </div>
          <div className="rounded-xl border border-slate-700/70 bg-black/20 p-3.5">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('tool')}</div>
            <div className="mt-1 font-mono text-base font-black text-amber-200">{tool ? tool.gameVersion : '…'}</div>
            {tool && <div className="text-[10.5px] text-slate-500">{t('generated', { date: fmtDate(tool.generatedAt, lang) })}</div>}
          </div>
          <div className={`flex flex-col justify-center rounded-xl border p-3.5 ${upToDate ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : upToDate === false ? 'border-amber-500/50 bg-amber-500/[0.08]' : 'border-slate-700/70 bg-black/20'}`}>
            <div className={`flex items-center gap-1.5 text-sm font-black ${upToDate ? 'text-emerald-300' : upToDate === false ? 'text-amber-300' : 'text-slate-400'}`}>
              {upToDate ? <CircleCheck className="h-4 w-4" /> : upToDate === false ? <CircleAlert className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {upToDate ? t('upToDate') : upToDate === false ? t('outdated') : t('unknown')}
            </div>
            <div className="mt-0.5 text-[10.5px] text-slate-400">{upToDate === false ? t('outdatedHint') : t('autoHint')}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startUpdate}
            disabled={starting || running || gh?.configured === false}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-2.5 text-xs font-black text-[#1a1205] shadow-[0_8px_24px_-10px_rgba(245,158,11,0.8)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 cursor-pointer"
          >
            {starting || running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {running ? t('running') : t('updateNow')}
          </button>
          <span className="text-[11px] leading-snug text-slate-400">{t('updateHint')}</span>
        </div>
        {gh?.configured === false && <p className="mt-2 text-[11px] font-bold text-amber-300">{t('githubMissing')}</p>}
        {runsError && <p className="mt-2 text-[11px] font-bold text-rose-300">{t(`errors.${runsError.code}`, { defaultValue: errorText(runsError) })}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-[#0c1426] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300"><Rocket className="h-3.5 w-3.5" /> {t('runs.title')}</h3>
          {!runs?.length ? (
            <p className="text-xs text-slate-500">{runs ? t('runs.empty') : '…'}</p>
          ) : (
            <ul className="space-y-1.5">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-black/20 px-2.5 py-1.5 text-[11px]">
                  <RunBadge run={r} t={t} />
                  <span className="text-slate-300">{fmtDate(r.createdAt, lang)}</span>
                  <span className="text-slate-500">· {t(`runs.event.${r.event}`, { defaultValue: r.event })}</span>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-sky-300 hover:text-sky-200">
                    {t('runs.details')} <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          {gh && (
            <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
              <a href={gh.workflowUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200">{t('runs.all')} <ExternalLink className="h-3 w-3" /></a>
              <a href={gh.commitsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200">{t('runs.commits')} <ExternalLink className="h-3 w-3" /></a>
            </div>
          )}
          <p className="mt-3 text-[10.5px] leading-snug text-slate-500">{t('rollback')}</p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0c1426] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300"><History className="h-3.5 w-3.5" /> {t('history.title')}</h3>
          {!status?.updates?.length ? (
            <p className="text-xs text-slate-500">{t('history.empty')}</p>
          ) : (
            <ul className="space-y-2.5">
              {status.updates.map((u) => (
                <li key={u.at} className="rounded-xl border border-slate-800 bg-black/20 p-3 text-[11px] space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-slate-100">{fmtDate(u.at, lang)}</span>
                    <span className="font-mono text-slate-500">{u.from?.gameVersion || '—'} → <span className="text-amber-200">{u.to.gameVersion}</span></span>
                  </div>
                  {(u.items.added.length > 0 || u.items.removed.length > 0 || u.items.changedCount > 0) && (
                    <div className="space-y-1">
                      <div className="text-slate-400">{t('history.items', { added: u.items.added.length, removed: u.items.removed.length, changed: u.items.changedCount })}</div>
                      <NameList list={u.items.added} lang={lang} tone="bg-emerald-500/15 text-emerald-300" />
                      <NameList list={u.items.removed} lang={lang} tone="bg-rose-500/15 text-rose-300 line-through" />
                      <NameList list={u.items.changed} lang={lang} tone="bg-sky-500/10 text-sky-300" />
                    </div>
                  )}
                  {(u.beasts.added.length > 0 || u.beasts.removed.length > 0 || u.beasts.changedCount > 0) && (
                    <div className="space-y-1">
                      <div className="text-slate-400">{t('history.beasts', { added: u.beasts.added.length, removed: u.beasts.removed.length, changed: u.beasts.changedCount })}</div>
                      <NameList list={u.beasts.added} lang={lang} tone="bg-emerald-500/15 text-emerald-300" />
                      <NameList list={u.beasts.changed} lang={lang} tone="bg-sky-500/10 text-sky-300" />
                    </div>
                  )}
                  {u.skills.length > 0 && (
                    <div className="text-slate-400">{t('history.skills')} <NameList list={u.skills} lang={lang} tone="bg-purple-500/15 text-purple-300" /></div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
