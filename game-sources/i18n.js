// i18n.js -- THE GAME IN THE PLAYER'S LANGUAGE (2026-09-28).
//
// The designer: "we definitely want different languages... not just for the HUD, not just the UI -- dialogues, NPCs,
// everything". The game is written in English and stays so; what reaches the screen passes through t(), which gives
// it in the language picked (Settings: Language; kept in this browser):
//
//   * a text the game shows as it is -- a button, an item's name, a line a townsperson says -- is looked up whole;
//   * a sentence the game makes -- "Bought 2 Carrot from Sel", "Only 3 left." (a server's word too) -- is matched
//     against the language's sentence patterns ("Bought {0} {1} from {2}"), and what fills the gaps is looked up in
//     its turn ("Carrot" is itself a word), then set into the translated pattern, in the order that language puts them;
//   * anything without a translation stays English: nothing is ever lost, only left untranslated.
//
// A language is one file, js/lang/<id>.json (tools/map-editor/js/lang, copied by build-game): { id, name, strings: { "<English>": "<translation>" } } (made from the
// English the game shows: tools/i18n/extract.mjs). The interface's screens take t() through the kit (widgets.js
// say); the plain HTML parts call it themselves.

import { serverURL } from './util.js';
import { LANGS } from './langs.js';

/** The languages there are (langs.js): the one the game is written in, and those translated. */
export { LANGS };
const KEY = 'bloomshire.lang';

let lang = 'en';
let num = null;                      // the language's way of writing numbers, when it is not English's
let clock24 = false;                 // its clock: 18:27, not 6:27 pm
let units = null;                    // its words for "1 h 5 min"
let gap = ' ';                       // what stands between a number and a word, '' where words are not spaced
let exact = new Map();               // English -> translation (every text, a template with its {gaps} too)
let patterns = [];                   // { re, gaps: [name...], to } (sentences with gaps), longest first
let html = null;                     // (the few texts with HTML in them, as the page writes them back)
let htmlSrc = [];
let memo = new Map();                // what t() has answered (the same text comes every frame)
const listeners = new Set();

/** The language in use. */
export const langNow = () => lang;
/** Its entry in LANGS. */
export const langInfo = () => LANGS.find((l) => l.id === lang) ?? LANGS[0];

/** The language this browser chose last (or the browser's own, when it is one we have), before anything is shown. */
export function preferredLang() {
  let id = null;
  try { id = localStorage.getItem(KEY); } catch { /* none */ }
  if (!id) id = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS.some((l) => l.id === id) ? id : 'en';
}

/** Put a language to use (its file fetched and read). Resolves to the language in use (English when it failed). */
export async function setLang(id, { keep = true } = {}) {
  if (!LANGS.some((l) => l.id === id)) id = 'en';
  if (id === 'en') apply('en', {});
  else {
    try {
      const r = await fetch(serverURL(`js/lang/${id}.json`), { cache: 'no-cache' });
      if (!r.ok) throw new Error(`${r.status}`);
      apply(id, (await r.json()).strings ?? {});
    } catch (e) { console.warn(`[i18n] ${id} could not be read (${e.message}): English`); apply('en', {}); }
  }
  if (keep) { try { localStorage.setItem(KEY, lang); } catch { /* for this visit */ } }
  for (const f of listeners) { try { f(lang); } catch { /* one listener */ } }
  return lang;
}

/** Be told when the language changes (a plain HTML part that shows words). Returns a way to stop. */
export function onLang(f) { listeners.add(f); return () => listeners.delete(f); }

const GAP = /\{([\w.]+)\}/g;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// (the words between the gaps, any run of spaces as one: the game writes "E  Talk to Marlow" with two)
const words = (s) => escape(s).replace(/\s+/g, '\\s+');
const squeeze = (s) => s.replace(/\s+/g, ' ').trim();

function apply(id, strings) {
  lang = id;
  const L = LANGS.find((l) => l.id === id);
  num = L?.num ?? null;
  clock24 = !!L?.clock24;
  units = L?.units ?? null;
  gap = L?.spaces === false ? '' : ' ';
  exact = new Map(); patterns = []; memo = new Map(); html = null; htmlSrc = [];
  for (const [en, to] of Object.entries(strings)) {
    if (typeof to !== 'string' || !to) continue;
    exact.set(en, to);                                               // (a screen's template is asked for as it is)
    if (/<[a-z][^>]*>|&\w+;/i.test(en)) htmlSrc.push([en, to]);
    if (!en.includes('{')) continue;
    // A sentence with gaps, to match what the game shows: the words around a gap hold it in place, and it takes as
    // little as it can. A gap straight after a letter is an ending that may be nothing ("listing{1}": "listings" or
    // "listing"); of two gaps side by side ("Bought {0}{1}") the first takes the lot and the second is the ending
    // (a sentence with the ending there has its own line: "Quest complete: {0}. You got {1}").
    const gaps = [], ms = [...en.matchAll(GAP)];
    let src = '^', at = 0;
    ms.forEach((m, i) => {
      const lit = en.slice(at, m.index);
      const before = lit ? lit[lit.length - 1] : (i ? '}' : '');
      const joined = ms[i + 1]?.index === m.index + m[0].length;          // (the next gap starts where this one ends)
      const word = /[\p{L}\p{N}]/u.test(before);
      src += words(lit) + (before === '}' ? '(.*?)' : joined ? (word ? '(.*)' : '(.+)') : word ? '(.*?)' : '(.+?)');
      gaps.push(m[1]); at = m.index + m[0].length;
    });
    src += words(en.slice(at)) + '$';
    const literal = en.replace(GAP, '');
    if (!/\p{L}/u.test(literal)) continue;                           // (gaps and marks alone, "{0} {1}", would match anything)
    patterns.push({ re: new RegExp(src, 'su'), gaps, to, literal: literal.length });
  }
  patterns.sort((a, b) => b.literal - a.literal);
}

const NUMBERISH = /^[\d.,:%+\-x×\s$]*$/;
const NUMBER = /^([+\-]?)(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d+))?(%?)$/;

/** A number as the language writes it: 12,500.5 -> 12.500,5 (null when `s` is not a plain number). */
function localNumber(s) {
  const m = num && NUMBER.exec(s);
  if (!m || (!m[2] && m[3] == null)) return null;
  return m[1] + (m[2] || '0').replace(/,/g, num.group) + (m[3] != null ? num.dec + m[3] : '') + m[4];
}

/** THE TEXT IN THE PLAYER'S LANGUAGE (English as it is, when there is no translation). */
export function t(text, depth = 0) {
  if (lang === 'en' || text == null || text === '') return text;
  const s = String(text);
  const key = depth ? `\u0000${depth}\u0000${s}` : s;   // (a gap's answer is kept apart: deeper, fewer tries)
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  let out = exact.get(s);
  if (out === undefined) {
    const trimmed = s.trim(), flat = squeeze(s);
    if (trimmed !== s && exact.has(trimmed)) out = s.replace(trimmed, exact.get(trimmed));
    else if (flat !== trimmed && exact.has(flat)) out = exact.get(flat);
  }
  // a name the game writes small, inside a sentence ("Harvest the sweet potato"; never a whole text: a word
  // already translated, "menu", must not be taken for English again)
  if (out === undefined && depth > 0 && /^[a-z][a-z' -]*[a-z]$/.test(s)) {
    const up = exact.get(s[0].toUpperCase() + s.slice(1)) ?? exact.get(s.replace(/(^|[ -])[a-z]/g, (c) => c.toUpperCase()));
    if (up && !up.includes('{')) out = up.toLocaleLowerCase(lang);
  }
  if (out === undefined && clock24) {                               // the clock: "6:27 pm" is 18:27 there
    const c = /^(\d{1,2}):(\d{2})\s?(am|pm)$/i.exec(s.trim());
    if (c) out = `${String((+c[1] % 12) + (/pm/i.test(c[3]) ? 12 : 0)).padStart(2, '0')}:${c[2]}`;
  }
  if (out === undefined && units) {                                 // how long: "1 h 5 min" (game/hero.js until)
    const d = /^(?:(\d+) h)?\s*(?:(\d+) min)?$/.exec(s.trim());
    if (d && (d[1] || d[2])) out = [d[1] && `${d[1]}${gap}${units.h}`, d[2] && `${d[2]}${gap}${units.min}`].filter(Boolean).join(gap);
  }
  if (out === undefined && NUMBERISH.test(s)) out = localNumber(s.trim()) ?? undefined;
  if (out === undefined && depth < 3 && !NUMBERISH.test(s)) {
    for (const p of patterns) {
      const m = p.re.exec(s);
      if (!m) continue;
      const vals = Object.fromEntries(p.gaps.map((g, i) => [g, t(m[i + 1], depth + 1)]));
      out = p.to.replace(GAP, (all, g) => (g in vals ? vals[g] : all));
      break;
    }
  }
  // A list of names ("100 Gold, Carrot seeds"), a count and a name ("2 Carrot", often what fills a gap), a mark and
  // words: each part in its turn -- a list only when every part has a translation (a sentence with a comma is not
  // one). (Chinese: a count needs no space, `gap`; its lists are joined with 、)
  if (out === undefined && depth < 3) {
    for (const sep of [', ', ' · ']) {
      if (!s.includes(sep)) continue;
      const parts = s.split(sep), got = parts.map((x) => t(x, depth + 1));
      if (got.every((x, i) => x !== parts[i] || NUMBERISH.test(parts[i]))) out = got.join(sep === ', ' && !gap ? '、' : sep);
      break;
    }
    // (a count and a name -- "3 Carrot", or how many of how many, "0/1 fish" (the Hearth's needs, 2026-10-02))
    const n = out === undefined && /^(\s*)([+\-]?[\d.,]+(?:\/[\d.,]+)?)(\s+)(\S.*)$/su.exec(s);
    const mark = out === undefined && !n && /^([^\p{L}\p{N}{]+)(\p{L}.*)$/su.exec(s);        // ("· Brown", "↩ Reply")
    if (n) { const rest = t(n[4], depth + 1), k = localNumber(n[2]) ?? n[2]; if (rest !== n[4] || k !== n[2]) out = n[1] + k + (/^\p{L}/u.test(rest) && !/^[A-Za-z]/.test(rest) ? gap : n[3]) + rest; }
    else if (mark) { const rest = t(mark[2], depth + 1); if (rest !== mark[2]) out = mark[1] + rest; }
  }
  if (out === undefined) {
    out = s;
    // (for finding what is still English: a page may set globalThis.__i18nMiss = new Set(); a bare {binding} is not one)
    if (globalThis.__i18nMiss && /\p{L}{2,}/u.test(s.replace(GAP, ''))) globalThis.__i18nMiss.add(s);
  }
  if (memo.size > 20000) memo.clear();
  memo.set(key, out);
  return out;
}

/* ---------------------------------------------------------------- the plain HTML parts */

// What players wrote (chat lines, names, wallets) is never translated: inside these, nothing is touched.
const KEEP = '[data-no-i18n], .chat-text, .chat-name, .chat-quote, .chat-peek-line, .chat-suggest, .adm-w, .adm-who b, .adm-card-head b, .adm-word, kbd, input, textarea, script, style';
const ATTRS = ['placeholder', 'title', 'aria-label'];
const shown = new WeakMap();             // a text node -> { en, as } (its English, and what it shows now)
const attrs = new WeakMap();             // an element -> { attr: { en, as } }

function translateText(n) {
  const p = n.parentElement;
  if (!p || ours.has(n) || p.closest(KEEP)) return;
  const was = shown.get(n);
  const en = was && n.data === was.as ? was.en : n.data;             // (changed by the game since: new English)
  if (!/[A-Za-z]{2,}/.test(en)) { shown.delete(n); return; }
  const as = t(en.trim()) === en.trim() ? en : en.replace(en.trim(), t(en.trim()));
  shown.set(n, { en, as });
  if (n.data !== as) n.data = as;
}
function translateAttrs(e) {
  if (e.closest(KEEP.replace(', input, textarea', ''))) return;
  let rec = attrs.get(e);
  for (const a of ATTRS) {
    const v = e.getAttribute(a);
    if (v == null) continue;
    const was = rec?.[a], en = was && v === was.as ? was.en : v, as = t(en);
    (rec ??= {})[a] = { en, as };
    if (v !== as) e.setAttribute(a, as);
  }
  if (rec) attrs.set(e, rec);
}
// A few texts carry their own HTML ("Arrows or WASD to move &middot; ... <kbd>Esc</kbd> the menu"): an element whose
// whole inside is one of them is given that text in the language, tags and all.
const htmlShown = new WeakMap();         // an element -> { en, as } (its English HTML, and what it shows now)
const ours = new WeakSet();              // the text nodes such a translation made (already in the language)
function htmlMap() {
  if (!html) {
    html = new Map();
    const tpl = document.createElement('template');
    for (const [en, to] of htmlSrc) { tpl.innerHTML = en; html.set(tpl.innerHTML, to); }   // (as the page writes it back)
  }
  return html;
}
function translateHtml(e) {
  if (!htmlSrc.length || !e.querySelector?.(':scope > b, :scope > kbd, :scope > small') || e.closest(KEEP)) return false;
  const was = htmlShown.get(e), now = e.innerHTML;
  const en = was && now === was.as ? was.en : now, to = htmlMap().get(en);
  if (!to) return false;
  e.innerHTML = to;
  htmlShown.set(e, { en, as: e.innerHTML });
  const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) ours.add(n);
  return true;
}
function translateTree(root) {
  if (root.nodeType === 3) { translateText(root); return; }
  if (root.nodeType !== 1) return;
  if (root.matches?.(KEEP) && !/^(INPUT|TEXTAREA)$/.test(root.tagName)) return;
  translateAttrs(root);
  if (translateHtml(root)) return;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (n.nodeType === 3) translateText(n);
    else { translateAttrs(n); translateHtml(n); }
  }
}

/**
 * THE PLAIN HTML PARTS (the door, the banner, the chat's buttons, the Emporium, the keys card...): every word put on
 * the page under `root` is shown in the player's language as it arrives, and again when the language changes. What
 * players wrote is left alone (KEEP).
 */
export function watchDom(root) {
  if (typeof MutationObserver === 'undefined' || !root) return;
  const busy = { on: false };
  const obs = new MutationObserver((list) => {
    if (busy.on || lang === 'en') return;
    busy.on = true;
    try {
      for (const m of list) {
        if (m.type === 'characterData') translateText(m.target);
        else if (m.type === 'attributes') translateAttrs(m.target);
        else if (!(m.target.nodeType === 1 && translateHtml(m.target))) for (const n of m.addedNodes) translateTree(n);
      }
    } finally { obs.takeRecords(); busy.on = false; }
  });
  obs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // (a new language: everything already on the page, from its English)
  onLang(() => {
    busy.on = true;
    try {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (n.nodeType === 3) {
          const was = shown.get(n);
          if (was && n.data === was.as) { n.data = was.en; shown.delete(n); }
          if (lang !== 'en') translateText(n);
        } else {
          const rec = attrs.get(n);
          if (rec) for (const [a, r] of Object.entries(rec)) if (n.getAttribute(a) === r.as) n.setAttribute(a, r.en);
          attrs.delete(n);
          const hr = htmlShown.get(n);
          if (hr && n.innerHTML === hr.as) { n.innerHTML = hr.en; htmlShown.delete(n); }
          if (lang !== 'en') { translateAttrs(n); translateHtml(n); }
        }
      }
    } finally { obs.takeRecords(); busy.on = false; }
  });
  if (lang !== 'en') translateTree(root);
}

/** t() for a sentence with named gaps the game fills itself: tf('Bought {n} {item}', { n: 2, item: 'Carrot' }). */
export function tf(template, vals = {}) {
  const tpl = lang === 'en' ? template : exact.get(template) ?? patterns.find((p) => p.re.source === template)?.to ?? t(template);
  return String(tpl).replace(GAP, (all, g) => (g in vals ? (typeof vals[g] === 'number' ? String(vals[g]) : t(String(vals[g]))) : all));
}
