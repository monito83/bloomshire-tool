import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado en componente:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#070b14]">
          <div className="max-w-md w-full bg-[#0b1220] border-2 border-red-500/50 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-3xl mx-auto shadow-inner">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">
                {this.props.title || 'Error al cargar este módulo'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ocurrió un error inesperado al procesar los datos de este panel. La herramienta sigue activa.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/60 text-red-300 font-mono text-[10.5px] text-left break-words overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
              >
                🔄 Reintentar
              </button>
              {this.props.onBack && (
                <button
                  type="button"
                  onClick={this.props.onBack}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-all"
                >
                  🏡 Volver al Atlas
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

