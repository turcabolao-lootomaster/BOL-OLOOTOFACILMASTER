import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Rocket, Bell, PartyPopper, X, ShieldCheck } from 'lucide-react';
import { cn } from '../utils';

interface SystemStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLogin: () => void;
  startDate?: string;
  startTime?: string;
}

const SystemStartModal: React.FC<SystemStartModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdminLogin,
  startDate, 
  startTime 
}) => {
  if (!isOpen) return null;

  // Format date: YYYY-MM-DD -> DD/MM/YYYY
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-[32px] max-w-md w-full overflow-hidden shadow-2xl shadow-lotofacil-purple/30 relative"
      >
        {/* Botão de Fechar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Banner Decorativo */}
        <div className="h-32 bg-gradient-to-br from-lotofacil-purple via-lotofacil-purple to-lotofacil-yellow relative flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-lotofacil-yellow/20 rounded-full blur-2xl" />
          </div>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-lotofacil-purple relative z-10"
          >
            <Rocket size={32} />
          </motion.div>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-display tracking-widest text-slate-900 uppercase">
              O GRANDE INÍCIO ESTÁ <span className="text-lotofacil-purple">CHEGANDO!</span>
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Prepare-se para a melhor experiência em bolões. O Concurso #1 será lançado em breve!
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-lotofacil-purple/10 text-lotofacil-purple flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Data</p>
                <p className="text-xs font-bold text-slate-900 mt-1">{formatDate(startDate)}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-lotofacil-purple/10 text-lotofacil-purple flex items-center justify-center">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Horário</p>
                <p className="text-xs font-bold text-slate-900 mt-1">{startTime || '--:--'}</p>
              </div>
            </div>
          </div>

          <div className="bg-lotofacil-yellow/10 p-4 rounded-2xl border border-lotofacil-yellow/20 flex items-start gap-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-lotofacil-yellow/20 text-lotofacil-yellow flex items-center justify-center shrink-0">
              <Bell size={20} className="animate-bounce" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Fique Atento!</p>
              <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                As apostas serão abertas pontualmente. Entre em contato com seu vendedor para garantir sua participação.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <button 
              onClick={onAdminLogin}
              className="flex items-center justify-center gap-2 mx-auto text-[10px] font-black text-lotofacil-purple hover:underline uppercase tracking-widest"
            >
              <ShieldCheck size={14} />
              Acesso Administrativo
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              <PartyPopper size={12} />
              Bolão Lotofácil v1.0
              <PartyPopper size={12} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SystemStartModal;
