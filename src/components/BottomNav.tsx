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
      <nav className="fixed bottom-0 left-0 lg:left-72 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-2 py-1 z-50 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {filteredItems.map(item => (
          <button
            key={item.id}
            onClick={() => item.id === 'logout' ? logout() : setView(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[64px]",
              currentView === item.id 
                ? "text-lotofacil-purple scale-110" 
                : item.id === 'logout' ? "text-red-400" : "text-slate-400"
            )}
          >
            <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-tighter",
              currentView === item.id ? "opacity-100" : "opacity-60"
            )}>
              {item.label}
            </span>
            {currentView === item.id && (
              <div className="w-1 h-1 bg-lotofacil-purple rounded-full mt-0.5" />
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
    <nav className="fixed bottom-0 left-0 lg:left-72 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-2 py-1 z-50 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {filteredItems.map(item => (
        <button
          key={item.id}
          onClick={() => handleAction(item.id)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[64px]",
            currentView === item.id 
              ? "text-lotofacil-purple scale-110" 
              : item.id === 'logout' || item.id === 'login' ? (user ? "text-red-400" : "text-lotofacil-purple") : "text-slate-400"
          )}
        >
          <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-tighter",
            currentView === item.id ? "opacity-100" : "opacity-60"
          )}>
            {item.label}
          </span>
          {currentView === item.id && (
            <div className="w-1 h-1 bg-lotofacil-purple rounded-full mt-0.5" />
          )}
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
