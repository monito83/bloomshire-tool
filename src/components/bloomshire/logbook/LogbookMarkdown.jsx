// src/components/bloomshire/logbook/LogbookMarkdown.jsx
// Markdown minimo -> elementos React. Nunca usa HTML crudo (sin
// dangerouslySetInnerHTML), asi que cualquier "<script>" se muestra como texto.
// Enlaces filtrados por safeHref (solo http/https/mailto y #logbook/...).
import React from 'react';
import { safeHref, LOGBOOK_HASH_PREFIX } from './logbookModel';

const INLINE_RE = /(\*\*([^*]+?)\*\*|__([^_]+?)__|\*([^*\s][^*]*?)\*|_([^_\s][^_]*?)_|`([^`]+?)`|\[([^\]]+?)\]\(([^)\s]+)\)|~~([^~]+?)~~)/;

/** Convierte texto en linea a nodos React (negrita, cursiva, codigo, enlaces, tachado). */
export function renderInline(text, keyPrefix = 'i', onInternalLink) {
  const out = [];
  let rest = String(text || '');
  let k = 0;
  while (rest.length) {
    const m = rest.match(INLINE_RE);
    if (!m) { out.push(rest); break; }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const key = `${keyPrefix}-${k++}`;
    if (m[2] != null || m[3] != null) {
      out.push(<strong key={key} className="font-bold text-slate-100">{renderInline(m[2] ?? m[3], key, onInternalLink)}</strong>);
    } else if (m[4] != null || m[5] != null) {
      out.push(<em key={key} className="italic text-slate-200">{renderInline(m[4] ?? m[5], key, onInternalLink)}</em>);
    } else if (m[6] != null) {
      out.push(<code key={key} className="px-1.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-amber-200 text-[0.85em] font-mono">{m[6]}</code>);
    } else if (m[7] != null) {
      const href = safeHref(m[8]);
      if (!href) {
        out.push(<span key={key}>{renderInline(m[7], key, onInternalLink)}</span>);
      } else if (href.toLowerCase().startsWith(LOGBOOK_HASH_PREFIX)) {
        out.push(
          <a
            key={key}
            href={href}
            onClick={(ev) => { if (onInternalLink) { ev.preventDefault(); onInternalLink(href); } }}
            className="text-amber-300 underline decoration-amber-500/40 underline-offset-2 hover:decoration-amber-300 transition-colors"
          >
            {renderInline(m[7], key, onInternalLink)}
          </a>
        );
      } else {
        out.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-300 transition-colors"
          >
            {renderInline(m[7], key, onInternalLink)}
          </a>
        );
      }
    } else if (m[9] != null) {
      out.push(<del key={key} className="text-slate-500">{m[9]}</del>);
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

const splitRow = (line) => {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
};
const isSeparatorRow = (line) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);

/** Tabla markdown -> {head:[...], rows:[[...]], align:[...]} o null. */
export function parseMarkdownTable(md) {
  const lines = String(md || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|') || l.includes('|'));
  if (lines.length < 2 || !isSeparatorRow(lines[1])) {
    if (!lines.length) return null;
    // Sin fila separadora: todas son filas de datos
    const rows = lines.filter((l) => !isSeparatorRow(l)).map(splitRow);
    return rows.length ? { head: [], rows, align: [] } : null;
  }
  const head = splitRow(lines[0]);
  const align = splitRow(lines[1]).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left'));
  const rows = lines.slice(2).map(splitRow).map((r) => head.map((_, i) => r[i] ?? ''));
  return { head, rows, align };
}

export function MarkdownTable({ table, onInternalLink, keyPrefix = 't' }) {
  if (!table) return null;
  const alignCls = (i) => (table.align[i] === 'right' ? 'text-right' : table.align[i] === 'center' ? 'text-center' : 'text-left');
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/70 bg-[#0a1324]/80 shadow-inner">
      <table className="w-full text-sm border-collapse">
        {table.head.length > 0 && (
          <thead>
            <tr className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent">
              {table.head.map((h, i) => (
                <th key={i} className={`px-3 py-2 font-black text-[11px] uppercase tracking-wider text-amber-200 border-b border-slate-700/70 ${alignCls(i)}`}>
                  {renderInline(h, `${keyPrefix}-h${i}`, onInternalLink)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="odd:bg-white/[0.015] hover:bg-amber-500/[0.06] transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-3 py-2 text-slate-300 border-b border-slate-800/70 align-top ${alignCls(ci)}`}>
                  {renderInline(cell, `${keyPrefix}-${ri}-${ci}`, onInternalLink)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Divide markdown en bloques simples. */
export function parseMarkdownBlocks(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { blocks.push({ kind: 'h', level: h[1].length, text: h[2] }); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push({ kind: 'hr' }); i++; continue; }
    if (/^\s*\|/.test(line)) {
      const tbl = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) tbl.push(lines[i++]);
      blocks.push({ kind: 'table', table: parseMarkdownTable(tbl.join('\n')) });
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push({ kind: 'quote', text: q.join('\n') });
      continue;
    }
    const ul = /^\s*[-*•]\s+/;
    const ol = /^\s*\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i++].replace(re, '');
        // continuaciones con sangria
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !ul.test(lines[i]) && !ol.test(lines[i])) item += `\n${lines[i++].trim()}`;
        items.push(item);
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    const para = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) && !/^\s*\|/.test(lines[i]) && !/^\s*>\s?/.test(lines[i]) &&
      !ul.test(lines[i]) && !ol.test(lines[i]) && !/^\s*(-{3,}|\*{3,})\s*$/.test(lines[i])
    ) para.push(lines[i++]);
    blocks.push({ kind: 'p', text: para.join('\n') });
  }
  return blocks;
}

const withBreaks = (text, key, onInternalLink) => {
  const parts = String(text).split('\n');
  return parts.flatMap((p, idx) => (idx === 0
    ? renderInline(p, `${key}-${idx}`, onInternalLink)
    : [<br key={`${key}-br${idx}`} />, ...renderInline(p, `${key}-${idx}`, onInternalLink)]));
};

export default function LogbookMarkdown({ md, onInternalLink, className = '' }) {
  const blocks = parseMarkdownBlocks(md);
  if (!blocks.length) return null;
  return (
    <div className={`space-y-3 text-[15px] leading-relaxed text-slate-300 ${className}`}>
      {blocks.map((b, idx) => {
        const key = `md-${idx}`;
        if (b.kind === 'h') {
          const cls = b.level === 1 ? 'text-xl' : b.level === 2 ? 'text-lg' : 'text-base';
          return <h4 key={key} className={`${cls} font-black text-amber-100 tracking-tight pt-1`}>{renderInline(b.text, key, onInternalLink)}</h4>;
        }
        if (b.kind === 'hr') return <hr key={key} className="border-slate-800" />;
        if (b.kind === 'table') return <MarkdownTable key={key} table={b.table} onInternalLink={onInternalLink} keyPrefix={key} />;
        if (b.kind === 'quote') {
          return (
            <blockquote key={key} className="border-l-2 border-amber-500/50 pl-4 italic text-slate-400">
              {withBreaks(b.text, key, onInternalLink)}
            </blockquote>
          );
        }
        if (b.kind === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul';
          return (
            <Tag key={key} className={`${b.ordered ? 'list-decimal' : 'list-disc'} pl-6 space-y-1.5 marker:text-amber-400/80`}>
              {b.items.map((it, ii) => <li key={ii} className="pl-1">{withBreaks(it, `${key}-${ii}`, onInternalLink)}</li>)}
            </Tag>
          );
        }
        return <p key={key}>{withBreaks(b.text, key, onInternalLink)}</p>;
      })}
    </div>
  );
}
