/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { History, CheckCircle2, Clock, XCircle, ChevronRight, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { Bet } from '../types';

const MyBets: React.FC = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      if (user) {
        const userBets = await firebaseService.getUserBets(user.id);
        setBets(userBets);
      }
      setLoading(false);
    };

    fetchBets();
  }, [user]);

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
      case 'validado': return <CheckCircle2 className="text-neon-green" size={18} />;
      case 'pendente': return <Clock className="text-accent-orange" size={18} />;
      case 'rejeitado': return <XCircle className="text-accent-red" size={18} />;
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
    if (hits >= 9) return 'text-neon-green';
    if (hits >= 7) return 'text-accent-orange';
    return 'text-white/40';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-display tracking-widest text-white">MINHAS <span className="text-neon-green uppercase">APOSTAS</span></h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1 sm:mt-2">Histórico completo de suas participações nos concursos.</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-white/40 text-center py-10 text-xs sm:text-sm">Carregando apostas...</p>
        ) : bets.length === 0 ? (
          <p className="text-white/40 text-center py-10 text-xs sm:text-sm">Nenhuma aposta encontrada.</p>
        ) : bets.map((bet, idx) => (
          <motion.div 
            key={bet.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6 group transition-all rounded-2xl border border-white/10"
            style={{ backgroundColor: '#0f515b' }}
          >
            <div className="flex items-center gap-3 sm:gap-4 lg:w-48">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#eece4c' }}>
                <History style={{ color: '#0b0101' }} size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[8px] sm:text-xs uppercase tracking-widest mb-0.5 sm:mb-1" style={{ fontWeight: 'bold', color: '#030000', height: '35px' }}>Concurso</p>
                  <h3 className="text-base sm:text-lg font-bold text-white" style={{ width: '50px' }}>#{bet.contestNumber}</h3>
                </div>
                {bet.betName && (
                  <p className="truncate" style={{ width: '139.4531px', height: '15px', fontSize: '14px', lineHeight: '17px', color: '#0b0000', fontWeight: 'normal' }} title={bet.betName}>
                    {bet.betName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 sm:space-y-4">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {bet.numbers.map(num => (
                  <div key={num} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white border border-white/10" style={{ backgroundColor: '#23023e' }}>
                    {num.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {getStatusIcon(bet.status)}
                  <span className="uppercase tracking-widest" style={{ color: '#060000', fontSize: '12px', fontWeight: 'bold', lineHeight: '17px' }}>
                    {getStatusLabel(bet.status)}
                  </span>
                </div>
                <span className="text-[8px] sm:text-[10px] uppercase tracking-widest" style={{ color: '#030000', fontWeight: 'bold' }}>
                  {bet.createdAt instanceof Date ? bet.createdAt.toLocaleDateString() : 'Recent'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-start gap-4 sm:gap-8 lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 pt-3 sm:pt-4 lg:pt-0 lg:pl-8">
              {bet.hits !== undefined ? (
                <div className="flex gap-4">
                  {Array.isArray(bet.hits) ? (
                    <>
                      {bet.hits.map((hit, i) => (
                        <div key={i} className="text-center">
                          <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-white/30 mb-0.5 sm:mb-1">S{i+1}</p>
                          <p className={cn("text-base sm:text-lg font-bold", getHitColor(hit))}>{hit}</p>
                        </div>
                      ))}
                      <div className="text-center border-l border-white/10 pl-4">
                        <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-neon-green/50 mb-0.5 sm:mb-1">Total</p>
                        <p className="text-base sm:text-lg font-bold text-neon-green">
                          {bet.hits.reduce((a, b) => a + b, 0)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-white/30 mb-0.5 sm:mb-1">Acertos</p>
                      <p className={cn("text-base sm:text-lg font-bold", getHitColor(bet.hits))}>{bet.hits}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs italic" style={{ color: '#0a0101' }}>Aguardando sorteio</p>
              )}
              
              <div className="flex items-center gap-4 ml-auto lg:ml-0">
                <button 
                  onClick={() => handleToggleRepeat(bet.id, !!bet.repeat)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] uppercase tracking-widest font-bold"
                  style={{ backgroundColor: '#000101', color: '#14a709' }}
                  title={bet.repeat ? "Aposta será repetida no próximo concurso" : "Repetir esta aposta no próximo concurso"}
                >
                  <RefreshCcw size={14} className={cn(bet.repeat && "animate-spin-slow")} style={{ color: '#96e413' }} />
                  <span className="hidden sm:inline">{bet.repeat ? 'Repetindo' : 'Repetir'}</span>
                </button>
                <button className="p-1 sm:p-2 transition-colors" style={{ color: '#040000' }}>
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
