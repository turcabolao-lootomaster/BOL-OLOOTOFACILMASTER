import React, { Component, ErrorInfo, ReactNode } from 'react';
import { LogOut, RefreshCw, Trash2 } from 'lucide-react';

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
