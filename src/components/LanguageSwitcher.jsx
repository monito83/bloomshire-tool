import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const currentLang = (i18n.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';

  const handleSelectLanguage = (lang) => {
    if (lang === currentLang) return;
    i18n.changeLanguage(lang);
  };

  return (
    <div
      role="group"
      aria-label="Selector de idioma / Language selector"
      className="flex items-center rounded-xl bg-[#12192a] border border-slate-700/80 p-0.5 shadow-sm text-xs font-bold shrink-0 select-none"
    >
      <button
        type="button"
        onClick={() => handleSelectLanguage('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
          currentLang === 'en'
            ? 'bg-amber-500/25 text-amber-300 font-black border border-amber-500/50 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
        title={t('language.switchToEn')}
        aria-pressed={currentLang === 'en'}
      >
        EN
      </button>
      <span className="text-slate-700 px-0.5 text-[11px] font-mono">|</span>
      <button
        type="button"
        onClick={() => handleSelectLanguage('es')}
        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
          currentLang === 'es'
            ? 'bg-amber-500/25 text-amber-300 font-black border border-amber-500/50 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
        title={t('language.switchToEs')}
        aria-pressed={currentLang === 'es'}
      >
        ES
      </button>
    </div>
  );
}
