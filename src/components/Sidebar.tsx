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
  X,
  MessageCircle,
  Download
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
  const { user, logout, signInWithGoogle } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);

  React.useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir o mini-infobar do Chrome no mobile
      e.preventDefault();
      // Guardar o evento para ser disparado depois
      setDeferredPrompt(e);
      setIsInstallable(true);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('App instalado com sucesso!');
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Mostrar o prompt de instalação
    deferredPrompt.prompt();
    
    // Esperar pela escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuário escolheu: ${outcome}`);
    
    // Limpar o prompt
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'bet', label: 'Fazer Aposta', icon: Ticket, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'my-bets', label: 'Minhas Apostas', icon: History, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'participants', label: 'Classificação (Ao Vivo)', icon: Users, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'current-contest', label: 'Sorteios do Concurso', icon: Trophy, roles: ['master', 'admin', 'vendedor', 'cliente'] },
    { id: 'ranking', label: 'Corrida dos Campeões', icon: BarChart3, roles: ['master', 'admin', 'vendedor', 'cliente'] },
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
        "fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0 flex flex-col shadow-2xl lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between shrink-0 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lotofacil-purple rounded-xl flex items-center justify-center shadow-lg shadow-lotofacil-purple/20">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <div>
              <h1 className="text-lg font-display tracking-widest text-slate-900 leading-none">BOLÃO</h1>
              <span className="text-lotofacil-purple font-bold text-[10px] tracking-[0.2em] uppercase">Lotofácil</span>
            </div>
          </div>
          <button className="lg:hidden p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Menu Principal</p>
          </div>
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-xs uppercase tracking-widest font-bold group",
                currentView === item.id 
                  ? "bg-lotofacil-purple text-white shadow-lg shadow-lotofacil-purple/20" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={18} className={cn(
                "transition-transform group-hover:scale-110",
                currentView === item.id ? "text-white" : "text-slate-400 group-hover:text-lotofacil-purple"
              )} />
              <span>{item.label}</span>
              {currentView === item.id && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
          {user && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-lotofacil-purple/10 flex items-center justify-center text-lotofacil-purple font-bold text-xs border border-lotofacil-purple/20">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-900 truncate uppercase tracking-wider">{user.name || 'Usuário'}</p>
                <p className="text-[9px] text-slate-400 truncate tracking-tight">{user.email || user.whatsapp}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            {isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-lotofacil-purple/10 text-lotofacil-purple hover:bg-lotofacil-purple/20 transition-all text-[10px] font-bold uppercase tracking-widest border border-lotofacil-purple/20 mb-2 animate-pulse"
              >
                <Download size={18} />
                <span>Instalar Aplicativo</span>
              </button>
            )}

            <a 
              href="https://wa.me/5511978193552" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#25D366] hover:bg-[#25D366]/5 transition-all text-[10px] font-bold uppercase tracking-widest border border-[#25D366]/20 mb-2"
            >
              <MessageCircle size={18} />
              <span>Suporte WhatsApp</span>
            </a>

            {user ? (
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all text-xs font-bold uppercase tracking-widest"
              >
                <LogOut size={18} />
                <span>Sair da Conta</span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  setView('login');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-lotofacil-purple text-white hover:bg-lotofacil-purple/90 transition-all font-bold uppercase tracking-widest text-xs shadow-lg shadow-lotofacil-purple/20"
              >
                <LogOut size={18} className="rotate-180" />
                <span>Entrar / Login</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
