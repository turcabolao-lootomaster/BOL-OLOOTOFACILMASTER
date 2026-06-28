import React, { Component, ErrorInfo, ReactNode } from 'react';
import { LogOut, RefreshCw, Trash2, AlertTriangle, Database, ExternalLink } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies (basic attempt)
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Reload the page
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error ? this.state.error.toString() : '';
      const isQuotaError = errorMsg.toLowerCase().includes('quota') || 
                           errorMsg.toLowerCase().includes('limit exceeded') || 
                           errorMsg.toLowerCase().includes('resource_exhausted') ||
                           errorMsg.toLowerCase().includes('free daily read units');

      if (isQuotaError) {
        const databaseLink = "https://console.firebase.google.com/project/gen-lang-client-0512461180/firestore/databases/ai-studio-d3919a56-b3bb-4c71-b29e-4adcfa738936/data?openUpgradeDialog=true";
        return (
          <div className="min-h-screen bg-[#1c0428] flex flex-col items-center justify-center p-6 text-center relative font-sans">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-red-600 blur-[80px] opacity-20" />
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border-4 border-red-500/20">
                <Database size={40} className="text-red-500" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-wider text-[#e2e5eb] mb-4 uppercase">
              Limite de Quota <span className="text-red-500">Excedido</span>
            </h1>
            
            <div className="max-w-xl w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl text-left">
              <div className="flex items-start gap-4 mb-6">
                <AlertTriangle className="text-yellow-500 shrink-0 mt-1" size={24} />
                <div>
                  <p className="text-lg text-yellow-500 font-bold uppercase tracking-wide">
                    Atenção Administrador/Desenvolvedor
                  </p>
                  <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                    Este projeto do Firebase atingiu o limite gratuito diário de leituras (Free daily read units per project).
                  </p>
                </div>
              </div>

              <div className="bg-black/40 rounded-xl p-4 mb-6 font-mono text-[11px] text-red-300/90 border border-red-900/30 overflow-x-auto">
                <p className="font-bold mb-1">DETALHES DO ERRO:</p>
                <p className="whitespace-pre-wrap">{errorMsg}</p>
              </div>

              <div className="space-y-4">
                <p className="text-slate-400 text-xs leading-relaxed">
                  <strong>Como resolver:</strong> O limite diário de leitura gratuito para bancos de dados Spark do Firebase (Free Tier) é de 50.000 leituras e se reinicia automaticamente todos os dias às 00:00 PST. Para liberar o acesso imediatamente e evitar quedas, ative o faturamento (Plano Blaze) no console do Firebase.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <a
                    href={databaseLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all text-xs uppercase tracking-widest text-center"
                  >
                    Ativar no Firebase <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/15 transition-all text-xs uppercase tracking-widest text-center"
                  >
                    Recarregar Página <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 text-slate-500 text-[10px] tracking-widest uppercase">
              Bolão Lotofácil • Resiliência de Sistema
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-200 text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <LogOut className="text-red-600" size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">Ops! Algo deu errado.</h1>
              <p className="text-slate-500 text-sm">
                O aplicativo encontrou um erro inesperado. Isso pode ser causado por dados antigos em cache.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left overflow-auto max-h-32">
                <p className="text-[10px] font-mono text-red-600 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-lotofacil-purple text-white py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-lotofacil-purple/90 transition-all"
              >
                <RefreshCw size={18} />
                Recarregar Página
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
              >
                <Trash2 size={18} />
                Limpar Cache e Resetar
              </button>
            </div>

            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              Se o erro persistir, tente abrir em uma aba anônima.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
