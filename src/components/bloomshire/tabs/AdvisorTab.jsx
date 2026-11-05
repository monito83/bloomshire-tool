// src/components/bloomshire/tabs/AdvisorTab.jsx
import React from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { LockedModuleScreen } from '../bloomshireHelpers';

export default function AdvisorTab({
  isConnected,
  onConnect,
  onBack,
  advisorMessages,
  advisorInput,
  setAdvisorInput,
  advisorLoading,
  handleSendAdvisor,
  messagesEndRef
}) {
  if (!isConnected) {
    return (
      <LockedModuleScreen
        title="Asesor Táctico Copilot IA"
        description="Recibe consejos estratégicos en tiempo real sobre qué plantar, vender o entregar según las existencias de tu mochila y cofres conectando tu partida con la extensión Bloomshire Companion."
        onConnect={onConnect}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 max-w-4xl mx-auto w-full">
      <div className="flex-1 bg-[#0a1226] border border-indigo-950/70 rounded-t-xl p-4 overflow-y-auto flex flex-col gap-3 shadow-inner custom-scrollbar">
        {advisorMessages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex gap-3 text-xs leading-relaxed ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-3.5 rounded-xl whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-amber-600 text-white font-medium rounded-tr-none' 
                : 'bg-[#121f3d] border border-indigo-900/60 text-slate-200 rounded-tl-none shadow-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {advisorLoading && (
          <div className="text-xs text-cyan-400 flex items-center gap-2 p-2 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analizando estado del juego con Gemini 3.8 Flash...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendAdvisor} className="p-3 bg-[#0c1630] border-t border-indigo-950/70 rounded-b-xl flex items-center gap-2 shadow-lg">
        <input 
          type="text"
          placeholder="Pregunta a la IA sobre siembra, energía, órdenes de Odette o misiones..."
          value={advisorInput}
          onChange={(e) => setAdvisorInput(e.target.value)}
          className="flex-1 bg-[#14203d] border border-slate-700 text-white text-xs rounded-lg px-3 py-2 outline-none"
        />
        <button
          type="submit"
          disabled={!advisorInput.trim() || advisorLoading}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> Enviar
        </button>
      </form>
    </div>
  );
}
