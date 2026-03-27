/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { History, CheckCircle2, Clock, XCircle, ChevronRight, RefreshCcw, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { Bet, Settings } from '../types';

const MyBets: React.FC = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('5511999999999');

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const [userBets, settings] = await Promise.all([
          firebaseService.getUserBets(user.id),
          firebaseService.getSettings()
        ]);
        setBets(userBets);
        if (settings?.whatsappNumber) {
          setWhatsappNumber(settings.whatsappNumber);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleWhatsAppValidation = async (bet: Bet) => {
    let targetNumber = whatsappNumber;
    let sellerText = '';
    
    if (bet.sellerCode) {
      const seller = await firebaseService.getSellerByCode(bet.sellerCode);
      if (seller) {
        const ws = await firebaseService.getSellerWhatsApp(seller.userId);
        if (ws) targetNumber = ws;
        sellerText = ' pelo seu link de vendedor';
      }
    }

    const truncatedId = bet.id.substring(0, 4).toUpperCase();
    
    const message = encodeURIComponent(
      `Olá! Fiz 1 aposta${sellerText} e gostaria de solicitar a validação dela. 🎯\n` +
      truncatedId +
      `\n\nTotal de apostas: 1` +
      `\nValor total: R$ 10,00` +
      `\n\nPoderia, por favor, confirmar o recebimento e a validação? Obrigado!`
    );
    
    window.open(`https://wa.me/${targetNumber}?text=${message}`, '_blank');
  };

  const handleToggleRepeat = async (betId: string, currentRepeat: boolean) => {
    try {
      await firebaseService.toggleBetRepeat(betId, !currentRepeat);
      setBets(prev => prev.map(b => b.id === betId ? { ...b, repeat: !currentRepeat } : b));
    } catch (error) {
      console.error('Error toggling repeat:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validado': return <CheckCircle2 className="text-emerald-600" size={18} />;
      case 'pendente': return <Clock className="text-orange-600" size={18} />;
      case 'rejeitado': return <XCircle className="text-red-600" size={18} />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validado': return 'Validada';
      case 'pendente': return 'Pendente';
      case 'rejeitado': return 'Rejeitada';
      default: return status;
    }
  };

  const getHitColor = (hits: number) => {
    if (hits >= 9) return 'text-lotofacil-yellow';
    if (hits >= 7) return 'text-lotofacil-purple';
    return 'text-slate-400';
  };

  return (
    <div className="mobile-p lg:p-10 space-y-4 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-4xl font-display tracking-widest text-slate-900">MINHAS <span className="text-lotofacil-purple uppercase">APOSTAS</span></h1>
          <p className="text-[10px] sm:text-sm text-slate-600 mt-1">Histórico completo de suas participações nos concursos.</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-slate-600 text-center py-10 text-xs sm:text-sm">Carregando apostas...</p>
        ) : bets.length === 0 ? (
          <p className="text-slate-600 text-center py-10 text-xs sm:text-sm">Nenhuma aposta encontrada.</p>
        ) : bets.map((bet, idx) => (
          <motion.div 
            key={bet.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-3 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-6 group transition-all rounded-xl sm:rounded-2xl border border-slate-200 bg-white hover:border-lotofacil-purple/30 shadow-sm"
          >
            <div className="flex items-center gap-3 lg:w-48">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 bg-lotofacil-purple/10 text-lotofacil-purple">
                <History size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">Concurso</p>
                  <h3 className="text-sm sm:text-lg font-bold text-slate-900">#{bet.contestNumber}</h3>
                </div>
                {bet.betName && (
                  <p className="text-[10px] sm:text-sm text-slate-500 truncate font-medium" title={bet.betName}>
                    {bet.betName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-1">
                {bet.numbers.map(num => (
                  <div key={num} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[9px] sm:text-xs font-bold text-slate-900 border border-slate-200 bg-slate-50">
                    {num.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(bet.status)}
                  <span className={cn(
                    "uppercase tracking-widest text-[9px] sm:text-[10px] font-bold",
                    bet.status === 'validado' ? "text-lotofacil-yellow" : 
                    bet.status === 'pendente' ? "text-orange-600" : "text-red-600"
                  )}>
                    {getStatusLabel(bet.status)}
                  </span>
                  {bet.status === 'pendente' && (
                    <button 
                      onClick={() => handleWhatsAppValidation(bet)}
                      className="ml-2 flex items-center gap-1 px-2 py-1 bg-[#25D366] text-white text-[8px] font-bold rounded-lg hover:bg-[#128C7E] transition-all shadow-sm"
                    >
                      <MessageCircle size={10} />
                      VALIDAR
                    </button>
                  )}
                </div>
                <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                  {bet.createdAt instanceof Date ? bet.createdAt.toLocaleDateString() : 'Recent'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-start gap-4 sm:gap-8 lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-8">
              {bet.hits !== undefined ? (
                <div className="flex gap-4">
                  {Array.isArray(bet.hits) ? (
                    <>
                      {bet.hits.map((hit, i) => (
                        <div key={i} className="text-center">
                          <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">S{i+1}</p>
                          <p className={cn("text-sm sm:text-lg font-bold", getHitColor(hit))}>{hit}</p>
                        </div>
                      ))}
                      <div className="text-center border-l border-slate-200 pl-4">
                        <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-lotofacil-yellow mb-0.5 leading-none">Total</p>
                        <div className="flex flex-col items-center mt-0.5">
                          <p className="text-sm sm:text-lg font-bold text-lotofacil-yellow leading-none">
                            {bet.hits.reduce((a, b) => a + b, 0).toString().padStart(2, '0')}
                          </p>
                          <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">PTS</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Acertos</p>
                      <p className={cn("text-sm sm:text-lg font-bold", getHitColor(bet.hits))}>{bet.hits}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[9px] sm:text-xs italic text-slate-500">Aguardando sorteio</p>
              )}
              
              <div className="flex items-center gap-3 ml-auto lg:ml-0">
                <button 
                  onClick={() => handleToggleRepeat(bet.id, !!bet.repeat)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[9px] uppercase tracking-widest font-bold",
                    bet.repeat 
                      ? "bg-lotofacil-purple/10 border-lotofacil-purple text-lotofacil-purple" 
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800"
                  )}
                  title={bet.repeat ? "Aposta será repetida no próximo concurso" : "Repetir esta aposta no próximo concurso"}
                >
                  <RefreshCcw size={12} className={cn(bet.repeat && "animate-spin-slow")} />
                  <span>{bet.repeat ? 'Repetindo' : 'Repetir'}</span>
                </button>
                <button className="p-1.5 text-slate-500 hover:text-slate-800 transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MyBets;
