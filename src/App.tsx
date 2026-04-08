/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
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
import { Menu } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
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
    <div className="min-h-screen bg-dark-bg flex">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />
      
      <main className="flex-1 lg:ml-64 min-h-screen">
        <MobileZoomHint />
        {/* Mobile Header - More compact */}
        <header className="lg:hidden p-4 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-lotofacil-purple rounded flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <h1 className="text-base font-display tracking-wider text-slate-900">BOLÃO <span className="text-lotofacil-purple">LOTOFÁCIL</span></h1>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-lg">
            <Menu size={20} />
          </button>
        </header>

        <div className="pb-10">
          {renderView()}
        </div>
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
