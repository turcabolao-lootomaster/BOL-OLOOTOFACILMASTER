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
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'bet', label: 'Fazer Aposta', icon: Ticket, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'my-bets', label: 'Minhas Apostas', icon: History, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'participants', label: 'Classificação (Ao Vivo)', icon: Users, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'current-contest', label: 'Sorteios do Concurso', icon: Trophy, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'ranking', label: 'Ranking Geral', icon: BarChart3, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'seller', label: 'Vendedor', icon: Store, roles: ['master', 'admin', 'vendedor'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['master', 'admin'] },
  ];

  const filteredMenu = menuItems.filter(item => user && item.roles.includes(user.role));

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
        "fixed top-0 left-0 h-full w-64 bg-card-bg border-r border-white/10 z-50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neon-green rounded flex items-center justify-center">
              <span className="text-black font-bold text-xl">B</span>
            </div>
            <h1 className="text-xl font-display tracking-wider">BOLÃO <span className="text-neon-green">LOTOFÁCIL</span></h1>
          </div>
          <button className="lg:hidden" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                currentView === item.id 
                  ? "bg-neon-green text-black font-bold" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-4">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-accent-red hover:bg-accent-red/10 transition-all"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
