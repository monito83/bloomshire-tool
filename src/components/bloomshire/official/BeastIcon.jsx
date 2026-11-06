// src/components/bloomshire/official/BeastIcon.jsx
// Miniatura de una criatura (recortada de su hoja de sprites del juego por
// scripts/build_official_data.mjs); si no hay imagen, el icono de su familia.
import React, { useState } from 'react';
import { FAMILY_ICONS } from './compendiumModel';

export default function BeastIcon({ beast, size = 28, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!beast) return null;
  if (!beast.art || failed) {
    return (
      <span className={`flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }} aria-hidden="true">
        {FAMILY_ICONS[beast.family] || '❔'}
      </span>
    );
  }
  return (
    <span className={`flex shrink-0 items-end justify-center overflow-hidden rounded-md bg-black/25 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <img
        src={`/data/bloomshire/${beast.art}`}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-full max-w-full object-contain"
        style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}
      />
    </span>
  );
}
