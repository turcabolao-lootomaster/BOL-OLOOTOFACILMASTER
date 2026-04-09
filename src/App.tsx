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
import { Menu, LogOut } from 'lucide-react';
import { cn } from './utils';

const AppContent: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [currentView, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const publicViews = ['participants', 'current-contest', 'ranking', 'instructions'];

  React.useEffect(() => {
    document.title = "Bolão Lotofácil";
    
    if (!loading && !user) {
      setView('login');
      return;
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
      case 'bet': return <Betting />;
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
        
        {/* Modern Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-lotofacil-purple rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <h1 className="text-lg font-display tracking-widest text-slate-900 uppercase">
                BOLÃO <span className="text-lotofacil-purple">LOTOFÁCIL</span>
              </h1>
            </div>
            <div className="sm:hidden flex items-center gap-2">
              <div className="w-7 h-7 bg-lotofacil-purple rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="text-sm font-display tracking-widest text-slate-900 uppercase">BOLÃO</span>
            </div>
          </div>

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
          </div>

          {/* User Profile Quick View */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-bold text-slate-900 leading-none uppercase">{user.name || 'Usuário'}</p>
                <p className="text-[8px] text-lotofacil-purple font-bold uppercase tracking-widest mt-0.5">{user.role}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs sm:text-sm">
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
        </header>

        <div className="flex-1 pb-24">
          {renderView()}
        </div>

        <BottomNav currentView={currentView} setView={setView} />
      </main>
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
