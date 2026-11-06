// src/components/bloomshire/market/marketBits.jsx
// Piezas chicas compartidas por el Radar y el detalle de item.
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const LIQ_STYLE = {
  fast: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  steady: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  slow: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  none: 'bg-slate-700/30 text-slate-400 border-slate-600/40'
};

export function LiqChip({ liq, t }) {
  return (
    <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap ${LIQ_STYLE[liq] || LIQ_STYLE.none}`}>
      {t(`liq.${liq}`)}
    </span>
  );
}

export function TrendBadge({ pct, f }) {
  if (pct == null) return <span className="text-slate-500 text-[11px]">–</span>;
  const up = pct > 2, down = pct < -2;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-black ${up ? 'text-emerald-300' : down ? 'text-rose-300' : 'text-slate-400'}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />{f.pct(pct)}
    </span>
  );
}


/** Emoji de respaldo por capitulo del Codex cuando no hay sprite del item. */
export const CHAPTER_EMOJI = {
  crops: '🌾', seeds: '🌱', food: '🍲', kitchen: '🧂', animal: '🐔', fish: '🐟', bugs: '🦋',
  ores: '⛏️', materials: '🔩', wild: '🍄', tools: '🛠️', weapons: '⚔️', vip: '👑'
};
