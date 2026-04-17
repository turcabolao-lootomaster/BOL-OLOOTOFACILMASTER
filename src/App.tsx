/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MobileZoomHint from './components/MobileZoomHint';
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
import { Menu, LogOut } from 'lucide-react';
import { cn } from './utils';
import { firebaseService } from './services/firebaseService';
import { Settings } from './types';

const AppContent: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [currentView, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastCompletedDraws, setLastCompletedDraws] = useState<number>(0);
  const [systemSettings, setSystemSettings] = useState<Settings | null>(null);
  const [isModalManuallyClosed, setIsModalManuallyClosed] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-lotofacil-purple/20 border-t-lotofacil-purple rounded-full animate-spin" />
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
        <MobileZoomHint />
        
        {/* General Notice Banner */}
        {user && (!user.name || !user.whatsapp || !user.pixKey) && (
          <div className="bg-lotofacil-yellow/10 border-b border-lotofacil-yellow/20 px-4 py-1 flex items-center justify-center gap-2 animate-pulse">
            <span className="text-[8px] sm:text-[10px] font-bold text-lotofacil-yellow uppercase tracking-widest text-center">
              ⚠️ ATENÇÃO: COMPLETE SEU PERFIL (NOME, WHATSAPP, PIX) PARA RECEBER PRÊMIOS!
            </span>
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
                  currentView === 'bet' ? "bg-lotofacil-purple text-white shadow-lg shadow-lotofacil-purple/20" : "text-slate-500 hover:bg-slate-50"
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
