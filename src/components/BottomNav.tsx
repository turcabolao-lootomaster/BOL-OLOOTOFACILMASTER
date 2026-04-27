/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Ticket, 
  History,
  Users, 
  Trophy,
  Settings,
  LogOut,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentView: string;
  setView: (view: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const { user, logout } = useAuth();

  const mainItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'bet', label: 'Apostar', icon: Ticket, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'my-bets', label: 'Minhas', icon: History, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'participants', label: 'Ao Vivo', icon: Users, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'logout', label: 'Sair', icon: LogOut, roles: ['master', 'admin', 'vendedor', 'cliente'] },
  ];

  // For Admins, we might want to show Admin instead of Sorteios or Sair
  // But let's keep Sair as it's a direct request
  if (user && (user.role === 'admin' || user.role === 'master')) {
    const adminItem = { id: 'admin', label: 'Admin', icon: Settings, roles: ['master', 'admin'] };
    const items = [...mainItems];
    items[3] = adminItem; // Replace 'Ao Vivo' with 'Admin' for admins to keep logout visible
    
    const filteredItems = items.filter(item => item.roles.includes(user.role)).slice(0, 5);
    
    return (
    <nav className="fixed bottom-0 left-0 lg:left-72 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 z-50 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      {filteredItems.map(item => (
        <button
          key={item.id}
          onClick={() => item.id === 'logout' ? logout() : setView(item.id)}
          className={cn(
            "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all min-w-[64px] relative group",
            currentView === item.id 
              ? "text-lotofacil-yellow scale-110" 
              : item.id === 'logout' ? "text-red-400" : "text-white/40"
          )}
        >
          {currentView === item.id && (
            <motion.div 
              layoutId="nav-glow"
              className="absolute inset-0 bg-lotofacil-yellow/5 rounded-2xl blur-lg" 
            />
          )}
          <div className={cn(
            "p-1.5 rounded-xl transition-all relative",
            currentView === item.id ? "bg-lotofacil-yellow/10" : ""
          )}>
            <item.icon 
              size={currentView === item.id ? 24 : 20} 
              strokeWidth={currentView === item.id ? 3 : 2}
              className={cn(
                "transition-all",
                currentView === item.id ? "drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" : "",
                item.id === 'participants' && currentView !== item.id ? "text-emerald-500" : ""
              )} 
            />
            {item.id === 'participants' && currentView !== item.id && (
              <div className="absolute -top-0.5 -right-0.5 px-0.5 rounded-sm bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.4)]">
                <span className="text-[5px] font-black text-white leading-none">LIVE</span>
              </div>
            )}
          </div>
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-widest transition-all",
            currentView === item.id ? "opacity-100 translate-y-0 text-lotofacil-yellow" : "opacity-40"
          )}>
            {item.label}
          </span>
          {currentView === item.id && (
            <motion.div 
              layoutId="nav-dot"
              className="w-1.5 h-1.5 bg-lotofacil-yellow rounded-full mt-0.5 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
            />
          )}
        </button>
      ))}
    </nav>
    );
  }

  const logoutItem = { id: 'logout', label: 'Sair', icon: LogOut, roles: ['master', 'admin', 'vendedor', 'cliente'] };
  const loginItem = { id: 'login', label: 'Entrar', icon: LogOut, roles: [] };

  const filteredItems = user 
    ? mainItems.filter(item => item.roles.includes(user.role)).slice(0, 5)
    : [
        { id: 'participants', label: 'Ao Vivo', icon: Users },
        { id: 'current-contest', label: 'Sorteios', icon: Trophy },
        { id: 'bet', label: 'Apostar', icon: Ticket },
        { id: 'instructions', label: 'Regras', icon: BookOpen },
        { id: 'login', label: 'Entrar', icon: LogOut },
      ];

  const handleAction = (id: string) => {
    if (id === 'logout') {
      logout();
    } else if (id === 'login') {
      setView('login');
    } else {
      setView(id);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 lg:left-72 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 z-50 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      {filteredItems.map(item => (
        <button
          key={item.id}
          onClick={() => handleAction(item.id)}
          className={cn(
            "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all min-w-[64px] relative group",
            currentView === item.id 
              ? "text-lotofacil-yellow scale-110" 
              : item.id === 'logout' || item.id === 'login' ? (user ? "text-red-400" : "text-lotofacil-yellow") : "text-white/40 flex"
          )}
        >
          {currentView === item.id && (
            <motion.div 
              layoutId="nav-glow-guest"
              className="absolute inset-0 bg-lotofacil-yellow/5 rounded-2xl blur-lg" 
            />
          )}
          <div className={cn(
            "p-1.5 rounded-xl transition-all relative",
            currentView === item.id ? "bg-lotofacil-yellow/10" : ""
          )}>
            <item.icon 
              size={currentView === item.id ? 24 : 20} 
              strokeWidth={currentView === item.id ? 3 : 2}
              className={cn(
                "transition-all",
                currentView === item.id ? "drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" : "",
                item.id === 'participants' && currentView !== item.id ? "text-emerald-500" : ""
              )} 
            />
            {item.id === 'participants' && currentView !== item.id && (
              <div className="absolute -top-0.5 -right-0.5 px-0.5 rounded-sm bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.4)]">
                <span className="text-[5px] font-black text-white leading-none">LIVE</span>
              </div>
            )}
          </div>
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-widest transition-all",
            currentView === item.id ? "opacity-100 text-lotofacil-yellow" : "opacity-40"
          )}>
            {item.label}
          </span>
          {currentView === item.id && (
            <motion.div 
              layoutId="nav-dot-guest"
              className="w-1.5 h-1.5 bg-lotofacil-yellow rounded-full mt-0.5 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
            />
          )}
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
