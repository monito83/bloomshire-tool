// src/components/bloomshire/tabs/LogbookTab.jsx
// Leonman's Logbook — pestaña publica (fase 2) + modo admin (fase 3).
// Arbol dinamico de secciones, entradas en bloques, busqueda, filtro por lugar,
// enlaces compartibles (#logbook/seccion/entrada) y salto al Mega-Atlas.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, ScrollText, Search, X, ChevronRight, ChevronDown, ChevronLeft, ArrowLeft, ArrowRight,
  FileText, LoaderCircle, RefreshCw, Link2, Check, PanelLeft, Tag, Sparkles, Feather, TriangleAlert,
  LockKeyhole, LogOut, Pencil, ArrowUp, ArrowDown, FilePlus, FolderPlus, ShieldCheck
} from 'lucide-react';
import megaAtlasData from '../../../../public/data/bloomshire/mega_atlas_data.json';
import LogbookBlocks, { PlaceChip } from '../logbook/LogbookBlocks';
import PlaceSearch from '../logbook/PlaceSearch';
import { fetchLogbookIndex, fetchLogbookEntry, searchLogbook } from '../logbook/logbookApi';
import { adminCall, loadAdminSession, saveAdminSession } from '../logbook/logbookAdminApi';
import { AdminLoginModal, useAdminErrorText } from '../logbook/adminUi';
import SectionEditorModal from '../logbook/SectionEditorModal';
import LogbookEditor from '../logbook/LogbookEditor';
import {
  baseLang, pickLang, buildTree, indexTree, entryPath, flattenEntries, parseLogbookHash, buildLogbookHash,
  buildPlaceCorpus, placeLabel, entryHasPlace, isMissingTranslation, mediaUrl, searchEntries
} from '../logbook/logbookModel';

const readHashPath = () => {
  if (typeof window === 'undefined') return '';
  const parsed = parseLogbookHash(window.location.hash);
  return parsed ? parsed.path : '';
};

const formatDate = (iso, lang) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try { return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(d); } catch { return d.toISOString().slice(0, 10); }
};

// ---------------------------------------------------------------------------
// Arbol lateral
// ---------------------------------------------------------------------------

function DraftBadge() {
  const { t } = useTranslation('logbook');
  return <span className="shrink-0 rounded-md border border-slate-600 px-1 text-[9px] font-black uppercase tracking-wider text-slate-400">{t('admin.status.draft')}</span>;
}

/** Botoncito de accion del arbol (solo admin, aparece al pasar el mouse). */
function TreeAction({ icon: Icon, label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-amber-200 disabled:opacity-25 cursor-pointer"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}

function AdminChip({ icon: Icon, label, onClick, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black transition-all cursor-pointer ${
        primary
          ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/50 hover:bg-amber-500/30'
          : 'border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-200'
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function TreeNode({ node, lang, currentPath, onNavigate, openMap, toggleOpen, admin = null, siblings = [] }) {
  const { t } = useTranslation('logbook');
  const path = node.path.join('/');
  const isOpen = openMap[node.id] ?? (currentPath === path || currentPath.startsWith(`${path}/`));
  const isActive = currentPath === path;
  const hasKids = node.children.length > 0 || node.entries.length > 0;
  const pos = siblings.indexOf(node.id);
  const isDraft = node.status === 'draft';
  return (
    <li>
      <div className={`group flex items-center gap-1 rounded-lg pr-1.5 transition-colors ${isActive ? 'bg-amber-500/15' : 'hover:bg-white/[0.04]'} ${isDraft ? 'opacity-70' : ''}`}>
        <button
          type="button"
          onClick={() => hasKids && toggleOpen(node.id, !isOpen)}
          className={`flex h-7 w-6 shrink-0 items-center justify-center text-slate-500 ${hasKids ? 'cursor-pointer hover:text-slate-200' : 'opacity-0'}`}
          aria-label={isOpen ? t('nav.collapse') : t('nav.expand')}
          tabIndex={hasKids ? 0 : -1}
        >
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => { onNavigate(path); toggleOpen(node.id, true); }}
          className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-[13px] font-bold cursor-pointer ${isActive ? 'text-amber-200' : 'text-slate-300 group-hover:text-slate-100'}`}
        >
          <span className="w-4 shrink-0 text-center" aria-hidden="true">{node.icon || '📁'}</span>
          <span className="truncate">{pickLang(node, 'title', lang)}</span>
          {isDraft && <DraftBadge />}
          <span className={`ml-auto shrink-0 rounded-md bg-slate-800/80 px-1.5 text-[10px] font-black text-slate-500 tabular-nums ${admin ? 'group-hover:hidden' : ''}`}>{node.total}</span>
        </button>
        {admin && (
          <span className="hidden shrink-0 items-center group-hover:flex group-focus-within:flex">
            <TreeAction icon={ArrowUp} label={t('admin.actions.moveUp')} disabled={pos <= 0} onClick={() => admin.move('sections', siblings, node.id, -1)} />
            <TreeAction icon={ArrowDown} label={t('admin.actions.moveDown')} disabled={pos < 0 || pos >= siblings.length - 1} onClick={() => admin.move('sections', siblings, node.id, 1)} />
            <TreeAction icon={Pencil} label={t('admin.actions.editSection')} onClick={() => admin.editSection(node)} />
            <TreeAction icon={FolderPlus} label={t('admin.actions.newSubsection')} onClick={() => { toggleOpen(node.id, true); admin.newSection(node.id); }} />
            <TreeAction icon={FilePlus} label={t('admin.actions.newEntry')} onClick={() => admin.newEntry(node.id)} />
          </span>
        )}
      </div>
      {isOpen && hasKids && (
        <ul className="ml-3 border-l border-slate-800/80 pl-2 lb-fade">
          {node.children.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              lang={lang}
              currentPath={currentPath}
              onNavigate={onNavigate}
              openMap={openMap}
              toggleOpen={toggleOpen}
              admin={admin}
              siblings={node.children.map((x) => x.id)}
            />
          ))}
          {node.entries.map((e, ei) => {
            const ePath = [...node.path, e.slug].join('/');
            const active = currentPath === ePath;
            const entryIds = node.entries.map((x) => x.id);
            return (
              <li key={e.id} className="group/entry flex items-center">
                <button
                  type="button"
                  onClick={() => onNavigate(ePath)}
                  className={`relative flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1.5 pl-2 pr-2 text-left text-[13px] transition-all cursor-pointer ${
                    active ? 'bg-gradient-to-r from-amber-500/20 to-transparent font-bold text-amber-100' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  } ${e.status === 'draft' ? 'opacity-70' : ''}`}
                >
                  {active && <span className="absolute -left-[9px] top-1.5 bottom-1.5 w-0.5 rounded-full bg-amber-400" />}
                  <FileText className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-amber-300' : 'text-slate-600'}`} />
                  <span className="truncate">{pickLang(e, 'title', lang)}</span>
                  {e.status === 'draft' && <DraftBadge />}
                </button>
                {admin && (
                  <span className="hidden shrink-0 items-center group-hover/entry:flex group-focus-within/entry:flex">
                    <TreeAction icon={ArrowUp} label={t('admin.actions.moveUp')} disabled={ei === 0} onClick={() => admin.move('entries', entryIds, e.id, -1)} />
                    <TreeAction icon={ArrowDown} label={t('admin.actions.moveDown')} disabled={ei === entryIds.length - 1} onClick={() => admin.move('entries', entryIds, e.id, 1)} />
                    <TreeAction icon={Pencil} label={t('admin.actions.edit')} onClick={() => admin.editEntry(e)} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Tarjetas
// ---------------------------------------------------------------------------

function EntryCard({ entry, lang, path, onNavigate, mediaBase, sectionLabel, snippet, placesByKey }) {
  const { t } = useTranslation('logbook');
  const cover = entry.cover_path ? mediaUrl(mediaBase, entry.cover_path) : null;
  const summary = snippet || pickLang(entry, 'summary', lang);
  return (
    <button
      type="button"
      onClick={() => onNavigate(path)}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#111d35] to-[#0a1224] text-left transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-[0_18px_40px_-20px_rgba(245,158,11,0.45)] cursor-pointer"
    >
      {cover && (
        <div className="relative h-32 w-full overflow-hidden">
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-[#0a1224] to-transparent" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="flex items-center gap-2">
          {sectionLabel && <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400/80">{sectionLabel}</span>}
          {entry.status === 'draft' && <DraftBadge />}
        </span>
        <span className="text-base font-black leading-snug text-slate-100 group-hover:text-amber-100 transition-colors">{pickLang(entry, 'title', lang)}</span>
        {summary && <span className="line-clamp-3 text-[13px] leading-relaxed text-slate-400">{summary}</span>}
        <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {(entry.places || []).slice(0, 2).map((k) => {
            const p = placesByKey.get(k);
            return p ? <span key={k} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300/90">{p.icon} {placeLabel(p, lang)}</span> : null;
          })}
          {entry.updated_at && <span className="ml-auto text-[10px] text-slate-600">{t('entry.updated', { date: formatDate(entry.updated_at, lang) })}</span>}
        </span>
      </div>
      <ArrowRight className="absolute right-3 top-3 h-4 w-4 text-amber-300 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
    </button>
  );
}

function SectionCard({ node, lang, onNavigate }) {
  const { t } = useTranslation('logbook');
  return (
    <button
      type="button"
      onClick={() => onNavigate(node.path.join('/'))}
      className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0d182d] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 cursor-pointer"
    >
      <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl transition-all duration-500 group-hover:bg-amber-500/20 group-hover:scale-125" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-700/10 text-2xl ring-1 ring-amber-500/25" aria-hidden="true">
          {node.icon || '📁'}
        </span>
        <span className="min-w-0">
          <span className="block text-base font-black text-slate-100 group-hover:text-amber-100">{pickLang(node, 'title', lang)}</span>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('home.entries', { count: node.total })}</span>
        </span>
      </div>
      {pickLang(node, 'description', lang) && (
        <p className="relative mt-3 line-clamp-2 text-[13px] text-slate-400">{pickLang(node, 'description', lang)}</p>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Visor de imagenes
// ---------------------------------------------------------------------------

function Lightbox({ images, index, lang, mediaBase, onClose, onMove }) {
  const { t } = useTranslation('logbook');
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onMove(1);
      else if (e.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onMove]);
  const img = images[index];
  if (!img) return null;
  const url = mediaUrl(mediaBase, img.path);
  const caption = pickLang(img, 'caption', lang) || pickLang(img, 'alt', lang);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm lb-fade" onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer" aria-label={t('blocks.close')}>
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); onMove(-1); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer" aria-label={t('blocks.prevImage')}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onMove(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer" aria-label={t('blocks.nextImage')}>
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      {url && <img src={url} alt={pickLang(img, 'alt', lang)} className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl lb-pop" onClick={(e) => e.stopPropagation()} />}
      <div className="mt-3 flex items-center gap-3 text-sm text-slate-300" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && <span className="font-black text-amber-300">{t('blocks.imageCount', { n: index + 1, total: images.length })}</span>}
        {caption && <span className="text-slate-400">{caption}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña
// ---------------------------------------------------------------------------

export default function LogbookTab({ locateInMegaAtlas, initialData = null, initialPath = null, initialEntries = null }) {
  const { t, i18n } = useTranslation('logbook');
  const lang = baseLang(i18n.language);

  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState(initialData ? 'ready' : 'loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [path, setPath] = useState(() => (initialPath != null ? initialPath : readHashPath()));
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [placeFilter, setPlaceFilter] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMap, setOpenMap] = useState({});
  const [entryState, setEntryState] = useState({ id: null, entry: null, status: 'idle' });
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);
  const entryCache = useRef(new Map((initialEntries || []).map((e) => [e.id, e])));
  const mainRef = useRef(null);

  // --- Modo admin (fase 3)
  const errorText = useAdminErrorText();
  const [adminSession, setAdminSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [sectionModal, setSectionModal] = useState(null); // { initial }
  const [editing, setEditing] = useState(null); // { initial }
  const [pendingNav, setPendingNav] = useState(null); // { kind, id }
  const [adminNotice, setAdminNotice] = useState(null);
  const token = adminSession ? adminSession.token : null;

  useEffect(() => {
    const saved = loadAdminSession();
    if (saved) setAdminSession(saved);
  }, []);

  useEffect(() => {
    if (!adminNotice) return undefined;
    const timer = setTimeout(() => setAdminNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [adminNotice]);

  // --- Carga del indice (publico, o completo con borradores si hay sesion admin)
  useEffect(() => {
    if (initialData && !token) return undefined;
    const ctrl = new AbortController();
    let alive = true;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    const load = token ? adminCall('tree', {}, token) : fetchLogbookIndex(ctrl.signal);
    load
      .then((d) => { if (alive) { setData(d); setStatus('ready'); } })
      .catch((err) => {
        if (!alive || err.name === 'AbortError') return;
        if (token && err.code === 'unauthorized') {
          saveAdminSession(null);
          setAdminSession(null);
          setAdminNotice(err);
          return;
        }
        setStatus('error');
      });
    return () => { alive = false; ctrl.abort(); };
  }, [initialData, reloadKey, token]);

  // --- Enlaces (#logbook/...) y boton atras del navegador
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => {
      const parsed = parseLogbookHash(window.location.hash);
      if (parsed) setPath(parsed.path);
    };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const navigate = useCallback((nextPath) => {
    const clean = String(nextPath || '');
    setPath(clean);
    setQuery('');
    setSidebarOpen(false);
    try {
      const hash = buildLogbookHash(clean);
      if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    } catch { /* sin historial (tests / sandbox) */ }
    try { mainRef.current && mainRef.current.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop */ }
  }, []);

  const onInternalLink = useCallback((href) => {
    const parsed = parseLogbookHash(href);
    if (parsed) navigate(parsed.path);
  }, [navigate]);

  // --- Derivados
  const tree = useMemo(() => buildTree(data?.sections || [], data?.entries || []), [data]);
  const index = useMemo(() => indexTree(tree), [tree]);
  const ordered = useMemo(() => flattenEntries(tree), [tree]);
  const corpus = useMemo(() => buildPlaceCorpus(megaAtlasData, data?.places || []), [data]);
  const placesByKey = useMemo(() => new Map(corpus.map((p) => [p.key, p])), [corpus]);
  const mediaBase = data?.mediaBase || '';
  const isDemo = Boolean(data?.demo);

  const target = path ? index.byPath.get(path) : null;
  const currentSection = target?.kind === 'section' ? index.sectionsById.get(target.id) : null;
  const currentEntryMeta = target?.kind === 'entry' ? index.entriesById.get(target.id) : null;

  const sectionTitleOf = useCallback((entry) => {
    const hit = index.entriesById.get(entry.id);
    return hit ? pickLang(hit.section, 'title', lang) : '';
  }, [index, lang]);

  // --- Carga de la entrada abierta
  useEffect(() => {
    const id = currentEntryMeta?.entry.id;
    if (!id) { setEntryState({ id: null, entry: null, status: 'idle' }); return undefined; }
    const cached = entryCache.current.get(id);
    if (cached) { setEntryState({ id, entry: cached, status: 'ready' }); return undefined; }
    const ctrl = new AbortController();
    setEntryState({ id, entry: null, status: 'loading' });
    const load = token
      ? adminCall('entry_get', { id }, token).then((r) => r.entry)
      : fetchLogbookEntry(id, { demo: isDemo, signal: ctrl.signal });
    load
      .then((e) => { entryCache.current.set(id, e); setEntryState({ id, entry: e, status: 'ready' }); })
      .catch((err) => { if (err.name !== 'AbortError') setEntryState({ id, entry: null, status: 'error' }); });
    return () => ctrl.abort();
  }, [currentEntryMeta?.entry.id, isDemo, token]);

  // --- Busqueda: instantanea sobre titulos/resumen/etiquetas + completa en el servidor
  const trimmed = query.trim();
  useEffect(() => {
    setRemoteResults(null);
    if (trimmed.length < 2 || status !== 'ready') return undefined;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      searchLogbook(trimmed, { demo: isDemo, signal: ctrl.signal })
        .then((r) => setRemoteResults(r))
        .catch(() => { /* se queda con los resultados locales */ })
        .finally(() => setSearching(false));
    }, 280);
    return () => { clearTimeout(timer); ctrl.abort(); setSearching(false); };
  }, [trimmed, isDemo, status]);

  const localResults = useMemo(() => {
    if (trimmed.length < 2) return [];
    return searchEntries(data?.entries || [], trimmed, { limit: 40 }).map(({ entry }) => entry);
  }, [data, trimmed]);

  const searchResults = useMemo(() => {
    let list = remoteResults || localResults;
    // solo entradas presentes en el arbol visible
    list = list.filter((e) => index.entriesById.has(e.id));
    if (placeFilter) list = list.filter((e) => entryHasPlace(e, placeFilter.key));
    return list;
  }, [remoteResults, localResults, index, placeFilter]);

  const placeResults = useMemo(
    () => (placeFilter ? ordered.filter((e) => entryHasPlace(e, placeFilter.key)) : []),
    [ordered, placeFilter]
  );

  const recent = useMemo(
    () => [...(data?.entries || [])]
      .filter((e) => index.entriesById.has(e.id))
      .sort((a, b) => String(b.updated_at || b.published_at || '').localeCompare(String(a.updated_at || a.published_at || '')))
      .slice(0, 6),
    [data, index]
  );

  const toggleOpen = useCallback((id, value) => setOpenMap((m) => ({ ...m, [id]: value })), []);

  // --- Acciones de admin
  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const onLoginSuccess = useCallback((session) => {
    saveAdminSession(session);
    entryCache.current.clear();
    setAdminSession(session);
    setShowLogin(false);
  }, []);

  const logout = useCallback(() => {
    saveAdminSession(null);
    entryCache.current.clear();
    setEditing(null);
    setSectionModal(null);
    setAdminSession(null);
    refresh();
  }, [refresh]);

  const call = useCallback(async (action, payload) => {
    try {
      return await adminCall(action, payload, token);
    } catch (err) {
      if (err.code === 'unauthorized') {
        saveAdminSession(null);
        setAdminSession(null);
        setShowLogin(true);
      }
      throw err;
    }
  }, [token]);

  const saveSection = useCallback(async (value) => {
    const r = await call('section_save', { section: value });
    setSectionModal(null);
    refresh();
    setPendingNav({ kind: 'section', id: r.section.id });
  }, [call, refresh]);

  const deleteSection = useCallback(async (id, confirmSlug) => {
    await call('section_delete', { id, confirmSlug });
    setSectionModal(null);
    entryCache.current.clear();
    refresh();
    navigate('');
  }, [call, refresh, navigate]);

  const saveEntry = useCallback(async (value) => {
    const r = await call('entry_save', { entry: value });
    entryCache.current.set(r.entry.id, r.entry);
    refresh();
    return r.entry;
  }, [call, refresh]);

  const deleteEntry = useCallback(async (id, confirmSlug) => {
    await call('entry_delete', { id, confirmSlug });
    entryCache.current.delete(id);
    setEditing(null);
    refresh();
    navigate('');
  }, [call, refresh, navigate]);

  const openEditor = useCallback(async (meta) => {
    try {
      const full = entryCache.current.get(meta.id) || (await call('entry_get', { id: meta.id })).entry;
      setEditing({ initial: full });
    } catch (err) {
      setAdminNotice(err);
    }
  }, [call]);

  const move = useCallback(async (kind, ids, id, delta) => {
    const i = ids.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    const key = kind === 'entries' ? 'entries' : 'sections';
    setData((d) => ({ ...d, [key]: d[key].map((x) => (next.includes(x.id) ? { ...x, sort: next.indexOf(x.id) * 10 } : x)) }));
    try {
      await call('section_reorder', { kind, ids: next });
    } catch (err) {
      setAdminNotice(err);
      refresh();
    }
  }, [call, refresh]);

  const adminActions = useMemo(() => (token ? {
    move,
    editSection: (node) => setSectionModal({ initial: node }),
    newSection: (parentId) => setSectionModal({ initial: { parent_id: parentId || null } }),
    newEntry: (sectionId) => setEditing({ initial: { section_id: sectionId, status: 'draft' } }),
    editEntry: openEditor
  } : null), [token, move, openEditor]);

  // Despues de crear/guardar: navegar al elemento cuando ya esta en el arbol nuevo
  useEffect(() => {
    if (!pendingNav) return;
    const p = pendingNav.kind === 'section'
      ? index.sectionsById.get(pendingNav.id)?.node.path.join('/')
      : entryPath(index, pendingNav.id);
    if (p) {
      setPendingNav(null);
      navigate(p);
    }
  }, [index, pendingNav, navigate]);

  const onLocate = useCallback((targetObj) => {
    if (locateInMegaAtlas && targetObj) locateInMegaAtlas(targetObj);
  }, [locateInMegaAtlas]);

  const copyLink = useCallback(() => {
    try {
      const url = `${window.location.origin}${window.location.pathname}${buildLogbookHash(path)}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      });
    } catch { /* portapapeles bloqueado */ }
  }, [path]);

  const moveLightbox = useCallback((delta) => {
    setLightbox((lb) => (lb ? { ...lb, index: (lb.index + delta + lb.images.length) % lb.images.length } : lb));
  }, []);

  // -------------------------------------------------------------------------
  // Vistas
  // -------------------------------------------------------------------------

  const renderCards = (entries, snippets = false) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((e) => (
        <EntryCard
          key={e.id}
          entry={e}
          lang={lang}
          path={entryPath(index, e.id)}
          onNavigate={navigate}
          mediaBase={mediaBase}
          sectionLabel={sectionTitleOf(e)}
          snippet={snippets ? e.snippet : ''}
          placesByKey={placesByKey}
        />
      ))}
    </div>
  );

  const renderHome = () => (
    <div className="space-y-10 lb-fade">
      <section className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(245,158,11,0.18),transparent_55%),radial-gradient(90%_120%_at_100%_100%,rgba(16,185,129,0.14),transparent_60%),linear-gradient(135deg,#101c34,#0a1222)] p-7 sm:p-10">
        <span className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-amber-500/10" />
        <span className="pointer-events-none absolute -right-4 -top-4 h-40 w-40 rounded-full border border-amber-500/10" />
        <Feather className="pointer-events-none absolute right-8 bottom-6 h-24 w-24 rotate-12 text-amber-500/[0.07]" />
        <div className="relative max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
            <Sparkles className="h-3 w-3" /> {t('hero.kicker')}
          </span>
          <h1 className="bg-gradient-to-r from-amber-100 via-amber-200 to-amber-400 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="text-base leading-relaxed text-slate-300">{t('hero.subtitle')}</p>
          <p className="text-xs text-slate-500">{t('hero.credit')}</p>
        </div>
      </section>

      {tree.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 p-10 text-center">
          <ScrollText className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <h2 className="text-lg font-black text-slate-200">{t('home.emptyTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('home.emptyBody')}</p>
          {adminActions && (
            <button type="button" onClick={() => adminActions.newSection(null)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-2.5 text-xs font-black text-[#1a1205] shadow-[0_8px_24px_-10px_rgba(245,158,11,0.8)] transition-transform hover:-translate-y-0.5 cursor-pointer">
              <FolderPlus className="h-4 w-4" /> {t('admin.actions.createFirst')}
            </button>
          )}
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{t('home.browse')}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tree.map((n) => <SectionCard key={n.id} node={n} lang={lang} onNavigate={navigate} />)}
            </div>
          </section>
          {recent.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{t('home.recent')}</h2>
              {renderCards(recent)}
            </section>
          )}
        </>
      )}
    </div>
  );

  const renderBreadcrumb = (ancestors, last) => (
    <nav className="flex flex-wrap items-center gap-1 text-xs font-bold text-slate-500" aria-label="breadcrumb">
      <button type="button" onClick={() => navigate('')} className="flex items-center gap-1 hover:text-amber-300 cursor-pointer">
        <BookOpen className="h-3.5 w-3.5" /> {t('nav.home')}
      </button>
      {ancestors.map((a) => (
        <React.Fragment key={a.id}>
          <ChevronRight className="h-3 w-3 text-slate-700" />
          <button type="button" onClick={() => navigate(a.path.join('/'))} className="hover:text-amber-300 cursor-pointer">{pickLang(a, 'title', lang)}</button>
        </React.Fragment>
      ))}
      {last && (
        <>
          <ChevronRight className="h-3 w-3 text-slate-700" />
          <span className="text-slate-300">{last}</span>
        </>
      )}
    </nav>
  );

  const renderSection = () => {
    const { node, ancestors } = currentSection;
    return (
      <div className="space-y-8 lb-fade">
        {renderBreadcrumb(ancestors, pickLang(node, 'title', lang))}
        <header className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-700/10 text-3xl ring-1 ring-amber-500/25" aria-hidden="true">{node.icon || '📁'}</span>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-amber-50">{pickLang(node, 'title', lang)}</h1>
            {pickLang(node, 'description', lang) && <p className="mt-1 text-slate-400">{pickLang(node, 'description', lang)}</p>}
          </div>
          {adminActions && (
            <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2">
              <AdminChip icon={Pencil} label={t('admin.actions.editSection')} onClick={() => adminActions.editSection(node)} />
              <AdminChip icon={FolderPlus} label={t('admin.actions.newSubsection')} onClick={() => adminActions.newSection(node.id)} />
              <AdminChip icon={FilePlus} label={t('admin.actions.newEntry')} onClick={() => adminActions.newEntry(node.id)} primary />
            </div>
          )}
        </header>
        {node.children.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{t('section.subsections')}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {node.children.map((c) => <SectionCard key={c.id} node={c} lang={lang} onNavigate={navigate} />)}
            </div>
          </section>
        )}
        <section className="space-y-3">
          {node.children.length > 0 && <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{t('section.entries')}</h2>}
          {node.entries.length ? renderCards(node.entries) : <p className="text-sm text-slate-500">{t('section.empty')}</p>}
        </section>
      </div>
    );
  };

  const renderEntry = () => {
    const { entry: meta, ancestors } = currentEntryMeta;
    const full = entryCache.current.get(meta.id) || (entryState.id === meta.id ? entryState.entry : null);
    const entry = full || meta;
    const pos = ordered.findIndex((e) => e.id === meta.id);
    const prev = pos > 0 ? ordered[pos - 1] : null;
    const next = pos >= 0 && pos < ordered.length - 1 ? ordered[pos + 1] : null;
    const cover = entry.cover_path ? mediaUrl(mediaBase, entry.cover_path) : null;
    const date = formatDate(entry.updated_at || entry.published_at, lang);
    return (
      <article className="mx-auto max-w-3xl space-y-7 lb-fade" key={meta.id}>
        {renderBreadcrumb(ancestors, null)}
        <header className="space-y-4">
          {cover && (
            <div className="relative overflow-hidden rounded-3xl border border-slate-800">
              <img src={cover} alt="" className="max-h-80 w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-[#0b1428] via-transparent to-transparent" />
            </div>
          )}
          {entry.status === 'draft' && <DraftBadge />}
          <h1 className="text-3xl font-black leading-tight tracking-tight text-amber-50 sm:text-4xl">{pickLang(entry, 'title', lang)}</h1>
          {pickLang(entry, 'summary', lang) && <p className="text-lg leading-relaxed text-slate-400">{pickLang(entry, 'summary', lang)}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            {entry.author && <span className="flex items-center gap-1.5 font-bold text-slate-400"><Feather className="h-3.5 w-3.5 text-amber-400/80" /> {t('entry.by', { author: entry.author })}</span>}
            {date && <span>{t('entry.updated', { date })}</span>}
            {adminActions && (
              <span className="ml-auto"><AdminChip icon={Pencil} label={t('admin.actions.edit')} onClick={() => adminActions.editEntry(meta)} primary /></span>
            )}
            <button type="button" onClick={copyLink} className={`${adminActions ? '' : 'ml-auto '}flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 font-bold text-slate-300 transition-colors hover:border-amber-500/50 hover:text-amber-200 cursor-pointer`}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? t('entry.copied') : t('entry.copyLink')}
            </button>
          </div>
          {((entry.places || []).length > 0 || (entry.tags || []).length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {(entry.places || []).map((k) => <PlaceChip key={k} placeKey={k} place={placesByKey.get(k)} lang={lang} onLocate={onLocate} size="sm" />)}
              {(entry.tags || []).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQuery(tag)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[11px] font-bold text-slate-400 hover:border-amber-500/40 hover:text-amber-200 cursor-pointer"
                >
                  <Tag className="h-3 w-3" />{tag}
                </button>
              ))}
            </div>
          )}
        </header>

        {full && isMissingTranslation(full, lang) && (
          <div className="flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-3.5 py-2.5 text-xs text-sky-200">
            <span aria-hidden="true">🌐</span>
            <span>{t('entry.translationMissing')}</span>
          </div>
        )}

        <div className="h-px bg-gradient-to-r from-amber-500/40 via-slate-800 to-transparent" />

        {entryState.status === 'loading' && entryState.id === meta.id && (
          <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
            <LoaderCircle className="h-4 w-4 animate-spin text-amber-400" /> {t('entry.loading')}
          </div>
        )}
        {entryState.status === 'error' && entryState.id === meta.id && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-5 text-sm text-rose-200">{t('entry.notFound')}</div>
        )}
        {full && (
          <LogbookBlocks
            blocks={full.blocks}
            lang={lang}
            mediaBase={mediaBase}
            placesByKey={placesByKey}
            onLocate={onLocate}
            onInternalLink={onInternalLink}
            onOpenImages={(images, i) => setLightbox({ images, index: i })}
          />
        )}

        {(prev || next) && (
          <nav className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-6">
            {prev ? (
              <button type="button" onClick={() => navigate(entryPath(index, prev.id))} className="group rounded-2xl border border-slate-800 p-4 text-left transition-all hover:border-amber-500/40 cursor-pointer">
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"><ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" /> {t('entry.previous')}</span>
                <span className="mt-1 block truncate font-bold text-slate-200 group-hover:text-amber-100">{pickLang(prev, 'title', lang)}</span>
              </button>
            ) : <span />}
            {next ? (
              <button type="button" onClick={() => navigate(entryPath(index, next.id))} className="group rounded-2xl border border-slate-800 p-4 text-right transition-all hover:border-amber-500/40 cursor-pointer">
                <span className="flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('entry.next')} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
                <span className="mt-1 block truncate font-bold text-slate-200 group-hover:text-amber-100">{pickLang(next, 'title', lang)}</span>
              </button>
            ) : <span />}
          </nav>
        )}
      </article>
    );
  };

  const renderSearch = () => (
    <div className="space-y-5 lb-fade">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-100">
        <Search className="h-4 w-4 text-amber-400" /> {t('search.resultsFor', { q: trimmed })}
        {searching && <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" aria-label={t('search.searching')} />}
      </h2>
      {searchResults.length ? renderCards(searchResults, true) : (
        !searching && <p className="text-sm text-slate-500">{t('search.noResults', { q: trimmed })}</p>
      )}
    </div>
  );

  const renderPlaceFilter = () => (
    <div className="space-y-5 lb-fade">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black text-slate-100">{t('places.filteringBy', { place: placeLabel(placeFilter, lang) })}</h2>
        {placeFilter.target && (
          <PlaceChip placeKey={placeFilter.key} place={placeFilter} lang={lang} onLocate={onLocate} size="sm" />
        )}
      </div>
      {placeResults.length ? renderCards(placeResults) : <p className="text-sm text-slate-500">{t('search.noResults', { q: placeLabel(placeFilter, lang) })}</p>}
    </div>
  );

  const renderMain = () => {
    if (status === 'loading') {
      return (
        <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
          <BookOpen className="h-10 w-10 text-amber-400/70 lb-float" />
          <span className="flex items-center gap-2 text-sm"><LoaderCircle className="h-4 w-4 animate-spin" /> {t('state.loading')}</span>
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="mx-auto mt-16 max-w-md rounded-3xl border border-rose-500/30 bg-rose-500/[0.05] p-8 text-center">
          <TriangleAlert className="mx-auto mb-3 h-8 w-8 text-rose-400" />
          <p className="text-sm text-rose-200">{t('state.error')}</p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-400/40 px-4 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/10 cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" /> {t('state.retry')}
          </button>
        </div>
      );
    }
    if (editing && token) {
      return (
        <LogbookEditor
          key={editing.initial.id || 'new'}
          initial={editing.initial}
          tree={tree}
          uiLang={lang}
          corpus={corpus}
          placesByKey={placesByKey}
          mediaBase={mediaBase}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onClose={(id) => { setEditing(null); if (id) setPendingNav({ kind: 'entry', id }); }}
        />
      );
    }
    if (trimmed.length >= 2) return renderSearch();
    if (placeFilter) return renderPlaceFilter();
    if (currentEntryMeta) return renderEntry();
    if (currentSection) return renderSection();
    if (path) {
      return (
        <div className="mx-auto mt-16 max-w-md space-y-4 text-center">
          <p className="text-sm text-slate-400">{t('entry.notFound')}</p>
          <button type="button" onClick={() => navigate('')} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-amber-500/50 cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> {t('entry.back')}
          </button>
        </div>
      );
    }
    return renderHome();
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0b1428] text-slate-200">
      {/* Barra lateral */}
      <aside
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-slate-800 bg-[#0a1222]/95 backdrop-blur-md transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:bg-[#0a1222]`}
        aria-label={t('nav.sections')}
      >
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            <BookOpen className="h-5 w-5 text-[#1a1205]" />
          </span>
          <button type="button" onClick={() => navigate('')} className="min-w-0 text-left cursor-pointer">
            <span className="block truncate text-sm font-black text-amber-100">{t('hero.title')}</span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('nav.sections')}</span>
          </button>
          <button type="button" onClick={() => setSidebarOpen(false)} className="ml-auto rounded-lg p-1 text-slate-500 hover:text-slate-200 lg:hidden cursor-pointer" aria-label={t('nav.hideSections')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {adminActions && (
          <div className="flex items-center gap-2 border-b border-slate-800 bg-amber-500/[0.06] px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" /> {t('admin.mode')}
            </span>
            <button type="button" onClick={() => adminActions.newSection(null)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-amber-500/40 px-2 py-1 text-[11px] font-black text-amber-200 hover:bg-amber-500/15 cursor-pointer">
              <FolderPlus className="h-3.5 w-3.5" /> {t('admin.actions.newSection')}
            </button>
          </div>
        )}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {status === 'ready' && tree.length === 0 && <p className="px-3 text-xs text-slate-500">{t('nav.empty')}</p>}
          <ul className="space-y-0.5">
            {tree.map((n) => (
              <TreeNode
                key={n.id}
                node={n}
                lang={lang}
                currentPath={path}
                onNavigate={navigate}
                openMap={openMap}
                toggleOpen={toggleOpen}
                admin={adminActions}
                siblings={tree.map((x) => x.id)}
              />
            ))}
          </ul>
        </nav>
        {isDemo && (
          <div className="m-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-2.5 text-[11px] leading-snug text-amber-200/90">{t('state.demo')}</div>
        )}
        <div className="flex items-center gap-2 border-t border-slate-800 px-3 py-2.5">
          {adminSession ? (
            <>
              <span className="min-w-0 flex-1 truncate text-[10px] text-slate-500" title={t('admin.draftsVisible')}>
                {t('admin.sessionUntil', { time: new Date(adminSession.expiresAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) })}
              </span>
              <button type="button" onClick={logout} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 hover:bg-white/5 hover:text-rose-200 cursor-pointer">
                <LogOut className="h-3.5 w-3.5" /> {t('admin.logout')}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setShowLogin(true)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-white/5 hover:text-amber-200 cursor-pointer">
              <LockKeyhole className="h-3 w-3" /> {t('admin.button')}
            </button>
          )}
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative z-20 flex flex-wrap items-center gap-2.5 border-b border-slate-800/80 bg-[#0d1830]/80 px-4 py-3 backdrop-blur">
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:border-amber-500/50 lg:hidden cursor-pointer" aria-label={t('nav.showSections')}>
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-700/80 bg-[#0a1324] px-3 py-2 transition-all focus-within:border-amber-500/60 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]">
            <Search className="h-4 w-4 shrink-0 text-amber-400/80" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-200 cursor-pointer" aria-label={t('search.clear')}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="w-full sm:w-72">
            {placeFilter ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">
                <span aria-hidden="true">{placeFilter.icon}</span>
                <span className="truncate">{placeLabel(placeFilter, lang)}</span>
                <button type="button" onClick={() => setPlaceFilter(null)} className="ml-auto text-emerald-300 hover:text-white cursor-pointer" aria-label={t('places.clearFilter')}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <PlaceSearch corpus={corpus} lang={lang} onSelect={(p) => setPlaceFilter(p)} />
            )}
          </div>
        </div>

        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          {renderMain()}
        </main>
      </div>

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} onSuccess={onLoginSuccess} />}
      {sectionModal && token && (
        <SectionEditorModal
          tree={tree}
          lang={lang}
          initial={sectionModal.initial}
          onSave={saveSection}
          onDelete={deleteSection}
          onClose={() => setSectionModal(null)}
        />
      )}
      {adminNotice && (
        <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl border border-rose-500/40 bg-[#1a0f18]/95 px-4 py-2.5 text-sm text-rose-200 shadow-2xl backdrop-blur lb-pop" role="status">
          {errorText(adminNotice)}
        </div>
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          lang={lang}
          mediaBase={mediaBase}
          onClose={() => setLightbox(null)}
          onMove={moveLightbox}
        />
      )}
    </div>
  );
}

