// src/components/bloomshire/tabs/AdvisorTab.jsx
// Copilot: chat con /api/bloomshire-advisor. La conversacion vive aca (antes dependia de un estado que la pestaña
// nunca recibia y se rompia al abrirla conectado). Mientras el servidor no tenga clave de IA, responde que esta en pausa.
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Send } from 'lucide-react';
import { LockedModuleScreen } from '../bloomshireHelpers';

export default function AdvisorTab({
  isConnected,
  onConnect,
  onBack,
  walletAddress,
  gold,
  currentEnergy,
  maxEnergy,
  shards,
  avyn,
  farmersOwned,
  farmingLevel,
  activeQuest,
  activeQuestsList,
  moonmereProgress,
  energyMeta,
  skillsMeta,
  skillsBreakdown,
  rawInventory,
  activeOrders
}) {
  const { t } = useTranslation('session');
  const [messages, setMessages] = useState(() => [{ id: 'init', role: 'assistant', content: t('advisor.paused') }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    try { endRef.current?.scrollIntoView?.({ behavior: 'smooth' }); } catch (_) { /* sin scroll */ }
  }, [messages, loading]);

  if (!isConnected) {
    return (
      <LockedModuleScreen
        title={t('advisor.lockedTitle')}
        description={t('advisor.lockedDesc')}
        onConnect={onConnect}
        onBack={onBack}
      />
    );
  }

  const send = async (e) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { id: `u${Date.now()}`, role: 'user', content: text }]);
    setLoading(true);
    try {
      let token = null;
      try { token = localStorage.getItem('bloomshire_session_token'); } catch (_) { /* sin storage */ }
      const res = await fetch('/api/bloomshire-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          message: text,
          conversation: messages.slice(-8),
          playerSnapshot: {
            wallet: walletAddress, gold, energy: currentEnergy, maxEnergy, shards, avyn, farmersCount: farmersOwned, farmingLevel,
            activeQuest, activeQuestsList, moonmereProgress, energyMeta, skillsMeta, skillsBreakdown, inventory: rawInventory, activeOrders
          }
        })
      });
      if (!res.ok) throw new Error(`advisor ${res.status}`);
      const json = await res.json();
      const reply = json.model === 'maintenance-paused'
        ? t('advisor.paused')
        : (json.text || json.reply || json.advice || json.analysis || json.response || t('advisor.empty'));
      setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (_) {
      setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: 'assistant', content: t('advisor.error') }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 max-w-4xl mx-auto w-full">
      <div className="flex-1 bg-[#0a1226] border border-indigo-950/70 rounded-t-xl p-4 overflow-y-auto flex flex-col gap-3 shadow-inner custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 text-xs leading-relaxed ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3.5 rounded-xl whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-amber-600 text-white font-medium rounded-tr-none'
                : 'bg-[#121f3d] border border-indigo-900/60 text-slate-200 rounded-tl-none shadow-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-cyan-400 flex items-center gap-2 p-2 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t('advisor.thinking')}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="p-3 bg-[#0c1630] border-t border-indigo-950/70 rounded-b-xl flex items-center gap-2 shadow-lg">
        <input
          type="text"
          placeholder={t('advisor.placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-[#14203d] border border-slate-700 text-white text-xs rounded-lg px-3 py-2 outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> {t('advisor.send')}
        </button>
      </form>
    </div>
  );
}
