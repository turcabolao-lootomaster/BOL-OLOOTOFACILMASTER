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
  BarChart3, 
  Settings, 
  LogOut,
  Store,
  BookOpen,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, setIsOpen }) => {
  const { user, logout, loginWithGoogle } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'bet', label: 'Fazer Aposta', icon: Ticket, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'my-bets', label: 'Minhas Apostas', icon: History, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'participants', label: 'Classificação (Ao Vivo)', icon: Users, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'current-contest', label: 'Sorteios do Concurso', icon: Trophy, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'ranking', label: 'Ranking Geral', icon: BarChart3, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'instructions', label: 'Instruções', icon: BookOpen, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'seller', label: 'Vendedor', icon: Store, roles: ['master', 'admin', 'vendedor'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['master', 'admin'] },
  ];

  const publicViews = ['participants', 'current-contest', 'ranking'];

  const filteredMenu = menuItems.filter(item => {
    if (!user) return publicViews.includes(item.id);
    return item.roles.includes(user.role);
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-lotofacil-purple rounded flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <h1 className="text-xl font-display tracking-wider text-slate-900">BOLÃO <span className="text-lotofacil-purple">LOTOFÁCIL</span></h1>
          </div>
          <button className="lg:hidden p-1.5 bg-slate-100 rounded-lg text-slate-400" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-1">
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm uppercase tracking-widest font-medium",
                currentView === item.id 
                  ? "bg-lotofacil-purple text-white font-bold shadow-md" 
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-4 space-y-2">
          {user && (
            <div className="px-4 py-1">
              <p className="text-[10px] text-slate-400 truncate uppercase tracking-widest">{user.email || user.whatsapp || 'Usuário'}</p>
            </div>
          )}
          {user ? (
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-accent-red hover:bg-accent-red/10 transition-all"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          ) : (
            <button 
              onClick={() => {
                setView('login');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-lotofacil-purple hover:bg-lotofacil-purple/10 transition-all font-bold uppercase tracking-widest text-xs"
            >
              <LogOut size={20} className="rotate-180" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
