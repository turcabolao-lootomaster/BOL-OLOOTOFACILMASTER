/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Betting from './views/Betting';
import MyBets from './views/MyBets';
import LiveRanking from './views/LiveRanking';
import CurrentContest from './views/CurrentContest';
import Ranking from './views/Ranking';
import Instructions from './views/Instructions';
import SellerPanel from './views/SellerPanel';
import AdminPanel from './views/AdminPanel';
import SystemStartModal from './components/SystemStartModal';
import { Menu, LogOut, Lock, AlertTriangle, Database, ExternalLink, Play, Eye, RotateCcw } from 'lucide-react';
import { cn } from './utils';
import { firebaseService, isDemoMode } from './services/firebaseService';
import { initializeDemoDatabase } from './services/demoData';
import { Settings } from './types';

const AppContent: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [currentView, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastCompletedDraws, setLastCompletedDraws] = useState<number>(0);
  const [systemSettings, setSystemSettings] = useState<Settings | null>(null);
  const [isModalManuallyClosed, setIsModalManuallyClosed] = useState(false);
  const [quotaError, setQuotaError] = useState<any | null>(null);

  // Interceptar erros globais de quota
  React.useEffect(() => {
    const handleQuotaError = (event: Event) => {
      const customEvent = event as CustomEvent;
      setQuotaError(customEvent.detail || { error: 'Quota limit exceeded' });
    };

    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || '';
      if (msg.includes('Quota limit exceeded') || msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
        setQuotaError({ error: msg, operationType: 'list', path: 'realtime' });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      if (msg.includes('Quota limit exceeded') || msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
        setQuotaError({ error: msg, operationType: 'list', path: 'realtime' });
      }
    };

    window.addEventListener('firestore-quota-error', handleQuotaError);
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('firestore-quota-error', handleQuotaError);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Monitorar configurações globais
  React.useEffect(() => {
    const unsubscribe = firebaseService.subscribeToSettings((settings) => {
      setSystemSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  const publicViews = ['participants', 'current-contest', 'ranking', 'instructions', 'bet'];

  // Monitorar sorteios para atualizar a bolinha (badge)
  React.useEffect(() => {
    const unsubscribe = firebaseService.subscribeToActiveContest((contest) => {
      if (contest && Array.isArray(contest.draws)) {
        const completedCount = contest.draws.filter(d => d && d.status === 'concluido').length;
        
        // Se o número de sorteios concluídos aumentou, mostramos a bolinha
        setLastCompletedDraws(prev => {
          if (completedCount > prev && prev !== 0) {
            try {
              if ('setAppBadge' in navigator && typeof (navigator as any).setAppBadge === 'function') {
                (navigator as any).setAppBadge(completedCount).catch((err: any) => console.error('Badge error:', err));
              }
            } catch (e) {
              console.error('Failed to set badge:', e);
            }
          }
          return completedCount;
        });
      }
    });

    return () => unsubscribe();
  }, []); // Dependência vazia para evitar re-subscrições em loop

  // Limpar a bolinha quando o usuário navega para visualizações relevantes
  React.useEffect(() => {
    if (currentView === 'dashboard' || currentView === 'current-contest') {
      try {
        if ('clearAppBadge' in navigator && typeof (navigator as any).clearAppBadge === 'function') {
          (navigator as any).clearAppBadge().catch((err: any) => console.error('Clear badge error:', err));
        }
      } catch (e) {
        console.error('Failed to clear badge:', e);
      }
    }
  }, [currentView]);

  React.useEffect(() => {
    document.title = "Bolão Lotofácil";
    
    if (!loading) {
      if (!user && !publicViews.includes(currentView) && currentView !== 'login') {
        setView('login');
        return;
      }

      // Auto redirect based on role when coming from login
      if (currentView === 'login') {
        if (user.role === 'vendedor') {
          setView('seller');
        } else if (user.role === 'admin' || user.role === 'master') {
          setView('dashboard');
        } else {
          setView('dashboard');
        }
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has('ref')) {
      setView('bet');
    } else if (params.has('view')) {
      const view = params.get('view')!;
      if (['participants', 'current-contest', 'ranking', 'instructions'].includes(view)) {
        setView(view);
      }
    }
  }, [loading, user]);

  if (quotaError && !isDemoMode()) {
    const databaseLink = "https://console.firebase.google.com/project/gen-lang-client-0512461180/firestore/databases/ai-studio-d3919a56-b3bb-4c71-b29e-4adcfa738936/data?openUpgradeDialog=true";
    return (
      <div className="min-h-screen bg-[#1c0428] flex flex-col items-center justify-center p-6 text-center animate-fade-in relative">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-600 blur-[80px] opacity-20 animate-pulse" />
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border-4 border-red-500/20">
            <Database size={40} className="text-red-500 animate-bounce" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-display tracking-wider text-[#e2e5eb] mb-4 uppercase">
          Limite de Quota <span className="text-red-500">Excedido</span>
        </h1>
        
        <div className="max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl text-left">
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
            <p className="whitespace-pre-wrap">{quotaError.error || 'Quota limit exceeded'}</p>
            <p className="mt-2 text-slate-500">Operação: {quotaError.operationType || 'get'} | Caminho: {quotaError.path || 'settings/global'}</p>
          </div>

            <div className="space-y-4">
              <p className="text-slate-400 text-xs leading-relaxed">
                <strong>Como resolver:</strong> O limite diário de leitura gratuito para bancos de dados Spark do Firebase (Free Tier) é de 50.000 leituras e se reinicia automaticamente todos os dias às 00:00 PST. Para liberar o acesso imediatamente e evitar quedas, ative o faturamento (Plano Blaze) no console do Firebase. Alternativamente, você pode testar todo o aplicativo offline usando nosso modo de demonstração.
              </p>

              <div className="flex flex-col gap-2.5">
                <a
                  href={databaseLink}
                  target="_blank"
                  rel="noreferrer referrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all text-xs uppercase tracking-widest text-center"
                >
                  Liberar Limite no Firebase <ExternalLink size={14} />
                </a>

                <button
                  onClick={() => {
                    initializeDemoDatabase(true);
                    localStorage.setItem('demo_mode', 'true');
                    window.location.reload();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-[#7a9a09] hover:bg-[#8eb30a] text-white font-bold rounded-xl shadow-lg transition-all text-xs uppercase tracking-widest text-center cursor-pointer"
                >
                  Ativar Modo de Demonstração (Offline) <Eye size={14} />
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

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-lotofacil-purple/20 border-t-lotofacil-purple rounded-full animate-spin" />
      </div>
    );
  }

  const isAdminOrMaster = user?.role === 'admin' || user?.role === 'master' || user?.email === 'turcabolao@gmail.com';
  if (systemSettings?.maintenanceMode && !isAdminOrMaster && currentView !== 'login') {
    return (
      <div className="min-h-screen bg-[#1c0428] flex flex-col items-center justify-center p-6 text-center animate-fade-in relative">
        {/* Botão de Login para Admin */}
        <button 
          onClick={async () => {
            if (user) {
              try {
                await logout();
              } catch (e) {
                console.error("Error logging out:", e);
              }
            }
            setView('login');
          }}
          className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white/40 hover:text-[#7a9a09] transition-all group shadow-xl cursor-pointer"
          title="Acesso Administrador"
        >
          <Lock size={20} className="group-hover:scale-110 transition-transform" />
        </button>

        <div className="relative mb-12">
          <div className="absolute inset-0 bg-[#7a9a09] blur-[100px] opacity-20 animate-pulse" />
          <div className="w-32 h-32 bg-lotofacil-yellow/10 rounded-full flex items-center justify-center border-4 border-lotofacil-yellow/20 animate-bounce">
            <img src="https://cdn-icons-png.flaticon.com/512/3112/3112946.png" alt="Logo" className="w-16 h-16 p-1" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-6xl font-display tracking-[0.2em] text-[#e2e5eb] mb-6 uppercase">
          AGUARDANDO <span className="text-[#7a9a09]">SORTEIO</span>
        </h1>
        
        <div className="max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
          <p className="text-xl text-[#7a9a09] font-bold mb-4 uppercase tracking-widest">
            {systemSettings.maintenanceMessage || "Estamos preparando os resultados do concurso atual."}
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            As apostas foram encerradas e estamos processando os dados. 
            Em instantes a transmissão ao vivo e os resultados estarão disponíveis.
          </p>
        </div>

        <div className="mt-12 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-[#7a9a09] animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#e2e5eb]/60">Sincronizado com o Servidor</span>
        </div>
      </div>
    );
  }

  const isPublicView = publicViews.includes(currentView);

  if (!user && !isPublicView && currentView !== 'login') {
    return <Login />;
  }

  const renderView = () => {
    if (!user && currentView === 'login') return <Login />;
    
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'bet': return <Betting setView={setView} />;
      case 'my-bets': return <MyBets />;
      case 'participants': return <LiveRanking />;
      case 'current-contest': return <CurrentContest />;
      case 'ranking': return <Ranking />;
      case 'instructions': return <Instructions />;
      case 'seller': return <SellerPanel />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col lg:flex-row">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />
      
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
        {isDemoMode() && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-800 px-4 py-2 sm:px-8 text-[11px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 font-medium backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span><strong>Modo de Demonstração Ativo (Offline)</strong> • Os dados estão sendo simulados localmente no seu navegador.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={() => {
                  initializeDemoDatabase(true);
                  window.location.reload();
                }}
                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 rounded flex items-center gap-1 transition-all text-[9px] uppercase font-bold cursor-pointer"
                title="Reinicia o banco de dados simulado com os dados padrão"
              >
                <RotateCcw size={10} /> Reiniciar Dados
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('demo_mode');
                  localStorage.removeItem('demo_user');
                  window.location.reload();
                }}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded flex items-center gap-1 transition-all text-[9px] uppercase font-bold cursor-pointer"
              >
                Sair do Modo Demo
              </button>
            </div>
          </div>
        )}
        
        {/* Modern Header */}
        <header className={cn(
          "sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b px-4 sm:px-8 py-2 sm:py-3 flex items-center justify-between",
          user?.role === 'admin' || user?.role === 'master' ? "border-lotofacil-purple/30 shadow-sm shadow-lotofacil-purple/5" : 
          user?.role === 'vendedor' ? "border-emerald-500/30 shadow-sm shadow-emerald-500/5" : "border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
            >
              <Menu size={20} />
            </button>

            {/* Logo and Title on Left */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center overflow-hidden shadow-md">
                <img src="https://cdn-icons-png.flaticon.com/512/3112/3112946.png" alt="Logo" className="w-full h-full object-cover p-1" />
              </div>
              <h1 className="hidden xs:block text-sm sm:text-lg font-display tracking-widest text-slate-900 uppercase">
                BOLÃO <span className={cn(
                  user?.role === 'admin' || user?.role === 'master' ? "text-lotofacil-purple" : 
                  user?.role === 'vendedor' ? "text-emerald-600" : "text-lotofacil-purple"
                )}>LOTOFÁCIL</span>
              </h1>
            </div>
          </div>

          {/* Right Side: Navigation + Profile */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick Access Desktop Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <button 
                onClick={() => setView('dashboard')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  currentView === 'dashboard' ? "bg-lotofacil-purple text-white shadow-lg shadow-lotofacil-purple/20" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                Início
              </button>
              <button 
                onClick={() => setView('bet')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  currentView === 'bet' ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/30" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                Apostar
              </button>
              <button 
                onClick={() => setView('participants')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  currentView === 'participants' ? "bg-lotofacil-purple text-white shadow-lg shadow-lotofacil-purple/20" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                Ao Vivo
              </button>
              <button 
                onClick={() => setView('instructions')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  currentView === 'instructions' ? "bg-lotofacil-purple text-white shadow-lg shadow-lotofacil-purple/20" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                Instruções
              </button>
              {user && (user.role === 'admin' || user.role === 'master') && (
                <button 
                  onClick={() => setView('admin')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    currentView === 'admin' ? "bg-lotofacil-purple text-white shadow-lg shadow-lotofacil-purple/20" : "text-slate-900 bg-lotofacil-yellow/20 hover:bg-lotofacil-yellow/30"
                  )}
                >
                  Painel Admin
                </button>
              )}
              {user && user.role === 'vendedor' && (
                <button 
                  onClick={() => setView('seller')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    currentView === 'seller' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  )}
                >
                  Painel Vendedor
                </button>
              )}
            </div>

            {/* User Profile Relocated to Top Right */}
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-100">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-bold text-slate-900 leading-none uppercase truncate max-w-[120px]">
                    {user.role === 'vendedor' ? `Vendedor: ${user.name || 'Usuário'}` : (user.name || 'Usuário')}
                  </p>
                  <p className={cn(
                    "text-[8px] font-bold uppercase tracking-widest mt-0.5",
                    user.role === 'admin' || user.role === 'master' ? "text-lotofacil-purple" : 
                    user.role === 'vendedor' ? "text-emerald-600" : "text-slate-400"
                  )}>
                    {user.role === 'vendedor' ? 'Colaborador' : user.role}
                  </p>
                </div>
                <div className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer hover:scale-105 transition-all",
                  user.role === 'admin' || user.role === 'master' ? "bg-lotofacil-purple" : 
                  user.role === 'vendedor' ? "bg-emerald-500" : "bg-slate-400"
                )} onClick={() => setView('dashboard')}>
                  {user.name?.charAt(0) || 'U'}
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Sair da Conta"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setView('login')}
                className="px-4 py-2 bg-lotofacil-purple text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-lotofacil-purple/20"
              >
                Entrar
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 pb-24">
          {renderView()}
        </div>

        <BottomNav currentView={currentView} setView={setView} />
      </main>

      <SystemStartModal 
        isOpen={systemSettings?.isPoolActive === false && user?.role !== 'admin' && user?.role !== 'master' && !isModalManuallyClosed}
        onClose={() => setIsModalManuallyClosed(true)}
        onAdminLogin={() => {
          setView('login');
          setIsModalManuallyClosed(true);
        }}
        startDate={systemSettings?.poolStartDate}
        startTime={systemSettings?.poolStartTime}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
