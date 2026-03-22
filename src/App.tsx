/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Betting from './views/Betting';
import MyBets from './views/MyBets';
import Participants from './views/Participants';
import CurrentContest from './views/CurrentContest';
import Ranking from './views/Ranking';
import SellerPanel from './views/SellerPanel';
import AdminPanel from './views/AdminPanel';
import { Menu } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('ref')) {
      setView('bet');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'bet': return <Betting />;
      case 'my-bets': return <MyBets />;
      case 'participants': return <Participants />;
      case 'current-contest': return <CurrentContest />;
      case 'ranking': return <Ranking />;
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
        {/* Mobile Header */}
        <header className="lg:hidden p-6 flex items-center justify-between border-b border-white/5 bg-card-bg/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neon-green rounded flex items-center justify-center">
              <span className="text-black font-bold text-xl">B</span>
            </div>
            <h1 className="text-lg font-display tracking-wider">BOLÃO <span className="text-neon-green">LOTOFÁCIL</span></h1>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white/60 hover:text-white">
            <Menu size={24} />
          </button>
        </header>

        {renderView()}
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
