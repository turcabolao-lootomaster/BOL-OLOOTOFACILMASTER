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
  BookOpen,
  Store
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

  const hasSellerAccess = user && ['master', 'admin', 'vendedor'].includes(user.role);

  const mainItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'bet', label: 'Apostar', icon: Ticket, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { 
      id: hasSellerAccess ? 'seller' : 'my-bets', 
      label: hasSellerAccess ? 'Vendedor' : 'Minhas', 
      icon: hasSellerAccess ? Store : History, 
      roles: ['master', 'admin', 'vendedor', 'cliente'] 
    },
    { id: 'participants', label: 'Ao Vivo', icon: Users, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'logout', label: 'Sair', icon: LogOut, roles: ['master', 'admin', 'vendedor', 'cliente'] },
  ];

  const getButtonClasses = (itemId: string, isActive: boolean) => {
    const base = "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-xl transition-all duration-300 relative border select-none h-[54px] min-w-[56px] sm:min-w-[72px]";
    
    if (isActive) {
      if (itemId === 'bet') {
        return cn(base, "bg-amber-400/20 border-amber-400 text-amber-300 font-bold shadow-[0_2px_8px_rgba(251,191,36,0.25)] scale-[1.03] z-10");
      }
      if (itemId === 'logout') {
        return cn(base, "bg-red-500/20 border-red-500 text-red-300 font-bold shadow-[0_2px_8px_rgba(239,68,68,0.25)] scale-[1.03] z-10");
      }
      if (itemId === 'login') {
        return cn(base, "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-[0_2px_8px_rgba(16,185,129,0.25)] scale-[1.03] z-10");
      }
      return cn(base, "bg-lotofacil-yellow/20 border-lotofacil-yellow text-lotofacil-yellow font-bold shadow-[0_2px_8px_rgba(251,191,36,0.25)] scale-[1.03] z-10");
    } else {
      if (itemId === 'bet') {
        return cn(base, "bg-amber-950/25 border-amber-500/25 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/40");
      }
      if (itemId === 'logout') {
        return cn(base, "bg-red-950/25 border-red-500/25 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40");
      }
      if (itemId === 'login') {
        return cn(base, "bg-emerald-950/25 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/40");
      }
      return cn(base, "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 hover:border-slate-700");
    }
  };

  // For Admins, we might want to show Admin instead of Sorteios or Sair
  if (user && (user.role === 'admin' || user.role === 'master')) {
    const adminItem = { id: 'admin', label: 'Admin', icon: Settings, roles: ['master', 'admin'] };
    const items = [...mainItems];
    items[3] = adminItem; // Replace 'Ao Vivo' with 'Admin' for admins to keep logout visible
    
    const filteredItems = items.filter(item => item.roles.includes(user.role)).slice(0, 5);
    
    return (
      <nav className="fixed bottom-0 left-0 lg:left-72 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2.5 py-2.5 z-50 flex items-center justify-around gap-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
        {filteredItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => item.id === 'logout' ? logout() : setView(item.id)}
              className={getButtonClasses(item.id, isActive)}
            >
              {isActive && (
                <motion.div 
                  layoutId="nav-glow"
                  className="absolute inset-0 rounded-xl blur-md opacity-30" 
                  style={{
                    backgroundColor: item.id === 'bet' ? '#f59e0b' : item.id === 'logout' ? '#ef4444' : item.id === 'seller' ? '#10b981' : '#facc15'
                  }}
                />
              )}
              <div className={cn(
                "p-1 rounded-lg transition-all relative",
                isActive ? "bg-white/5" : "bg-black/20"
              )}>
                <item.icon 
                  size={isActive ? 20 : 18} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    "transition-all",
                    isActive ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "",
                    item.id === 'participants' && !isActive ? "text-emerald-500" : ""
                  )} 
                />
                {item.id === 'participants' && !isActive && (
                  <div className="absolute -top-1 -right-1 px-1 rounded-sm bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.4)]">
                    <span className="text-[5px] font-black text-white leading-none">LIVE</span>
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[8px] sm:text-[10px] uppercase tracking-wider font-bold truncate max-w-full text-center header-text",
                isActive ? "text-white opacity-100" : "opacity-80"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

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
    <nav className="fixed bottom-0 left-0 lg:left-72 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2.5 py-2.5 z-50 flex items-center justify-around gap-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
      {filteredItems.map(item => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleAction(item.id)}
            className={getButtonClasses(item.id, isActive)}
          >
            {isActive && (
              <motion.div 
                layoutId="nav-glow-guest"
                className="absolute inset-0 rounded-xl blur-md opacity-30" 
                style={{
                  backgroundColor: item.id === 'bet' ? '#f59e0b' : item.id === 'logout' ? '#ef4444' : item.id === 'login' ? '#10b981' : item.id === 'seller' ? '#10b981' : '#facc15'
                }}
              />
            )}
            <div className={cn(
              "p-1 rounded-lg transition-all relative",
              isActive ? "bg-white/5" : "bg-black/20"
            )}>
              <item.icon 
                size={isActive ? 20 : 18} 
                strokeWidth={isActive ? 2.5 : 2}
                className={cn(
                  "transition-all",
                  isActive ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "",
                  item.id === 'participants' && !isActive ? "text-emerald-500" : ""
                )} 
              />
              {item.id === 'participants' && !isActive && (
                <div className="absolute -top-1 -right-1 px-1 rounded-sm bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.4)]">
                  <span className="text-[5px] font-black text-white leading-none">LIVE</span>
                </div>
              )}
            </div>
            <span className={cn(
              "text-[8px] sm:text-[10px] uppercase tracking-wider font-bold truncate max-w-full text-center header-text",
              isActive ? "text-white opacity-100" : "opacity-80"
            )}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
