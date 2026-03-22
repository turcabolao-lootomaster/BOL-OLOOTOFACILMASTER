/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Trophy, Calendar, CheckCircle2, Clock, AlertCircle, Eye, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Contest, Bet } from '../types';

const CurrentContest: React.FC = () => {
  const { user } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDrawForBets, setSelectedDrawForBets] = useState<{number: number, results: number[]} | null>(null);
  const [contestBets, setContestBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchContest = async () => {
      const active = await firebaseService.getActiveContest();
      setContest(active);
      setLoading(false);
    };
    fetchContest();
  }, [user]);

  const handleViewBets = async (drawNumber: number, results: number[]) => {
    if (!contest) return;
    setSelectedDrawForBets({ number: drawNumber, results });
    setLoadingBets(true);
    try {
      const bets = await firebaseService.getContestBets(contest.id);
      setContestBets(bets);
    } catch (error) {
      console.error('Erro ao buscar apostas do concurso:', error);
    } finally {
      setLoadingBets(false);
    }
  };

  const filteredBets = contestBets.filter(b => 
    b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.betName || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (!selectedDrawForBets) return 0;
    const hitsA = a.numbers.filter(n => selectedDrawForBets.results.includes(n)).length;
    const hitsB = b.numbers.filter(n => selectedDrawForBets.results.includes(n)).length;
    return hitsB - hitsA;
  });

  if (loading) {
    return (
      <div className="p-10 text-center text-white/40">Carregando concurso...</div>
    );
  }

  if (!contest) {
    return (
      <div className="p-10 text-center text-white/40">Nenhum concurso ativo no momento.</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-display tracking-widest text-white uppercase">SORTEIOS DO <span className="text-neon-green">CONCURSO #{contest.number}</span></h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1 sm:mt-2">Acompanhe os resultados oficiais dos 3 sorteios deste concurso.</p>
        </div>
        <div className="flex items-center gap-4">
          {contest.status === 'encerrado' && (
            <div className="glass-card px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-3 border-accent-red/20 bg-accent-red/10">
              <AlertCircle className="text-accent-red" size={18} />
              <span className="text-[10px] sm:text-sm font-bold text-accent-red uppercase tracking-widest animate-pulse">
                CONCURSO ENCERRADO
              </span>
            </div>
          )}
          <div className="glass-card px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-3 border-neon-green/20">
            <Calendar className="text-neon-green" size={18} />
            <span className="text-[10px] sm:text-sm font-bold text-white uppercase tracking-widest">
              Ativo desde {new Date(contest.createdAt as any).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:gap-8">
        {contest.draws.map((draw, idx) => (
          <motion.div 
            key={draw.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-5 sm:p-8 space-y-6 sm:space-y-8 relative overflow-hidden"
          >
            {/* Background Number */}
            <div className="absolute -top-4 -right-4 text-[80px] sm:text-[120px] font-display text-white/5 pointer-events-none">
              {draw.number}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0",
                  draw.status === 'concluido' ? "bg-neon-green/10 text-neon-green" : "bg-accent-orange/10 text-accent-orange"
                )}>
                  <Trophy size={20} />
                </div>
                <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white uppercase">SORTEIO #{draw.number}</h2>
                      {draw.status === 'concluido' && (
                        <button 
                          onClick={() => handleViewBets(draw.number, draw.results)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                        >
                          <Eye size={14} />
                          Visualizar Lista
                        </button>
                      )}
                    </div>
                  <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                    {draw.status === 'concluido' ? (
                      <CheckCircle2 className="text-neon-green" size={12} />
                    ) : (
                      <Clock className="text-accent-orange" size={12} />
                    )}
                    <span className={cn(
                      "text-[8px] sm:text-[10px] font-bold uppercase tracking-widest",
                      draw.status === 'concluido' ? "text-neon-green" : "text-accent-orange"
                    )}>
                      {draw.status === 'concluido' ? `Realizado` : `Aguardando sorteio`}
                    </span>
                  </div>
                  {draw.status === 'concluido' && (
                    <p className="text-[8px] sm:text-[10px] text-accent-blue font-bold uppercase tracking-widest mt-1">
                      Prêmio 10 Pontos: R$ 500,00
                    </p>
                  )}
                </div>
              </div>

              {draw.status === 'concluido' && (
                <div className="flex items-center gap-2 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-white/10 w-fit">
                  <AlertCircle className="text-white/40" size={14} />
                  <span className="text-[10px] sm:text-xs text-white/60">15 números sorteados</span>
                </div>
              )}
            </div>

            {draw.status === 'concluido' ? (
              <div className="flex flex-wrap gap-2 sm:gap-3 relative z-10">
                {draw.results.sort((a, b) => a - b).map(num => (
                  <motion.div
                    key={num}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-neon-green rounded-full flex items-center justify-center text-black font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(0,255,0,0.3)]"
                  >
                    {num.toString().padStart(2, '0')}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 bg-white/2 rounded-xl sm:rounded-2xl border border-dashed border-white/10 relative z-10">
                <Clock className="text-white/10 mb-3 sm:mb-4" size={32} />
                <p className="text-white/40 font-display tracking-widest text-lg sm:text-xl uppercase text-center">Aguardando Sorteio Oficial</p>
                <p className="text-white/20 text-[8px] sm:text-[10px] mt-1 sm:mt-2 uppercase tracking-widest text-center">O resultado será inserido após a realização do sorteio</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Draw Detail Modal */}
      <AnimatePresence>
        {selectedDrawForBets && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display tracking-widest text-white uppercase">APOSTAS <span className="text-neon-green">SORTEIO #{selectedDrawForBets.number}</span></h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedDrawForBets.results.map(num => (
                      <span key={num} className="w-8 h-8 rounded-full bg-neon-green text-black flex items-center justify-center text-xs font-bold">
                        {num.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedDrawForBets(null);
                    setSearchTerm('');
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 text-white/40 hover:text-white flex items-center justify-center transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 sm:px-8 py-4 border-b border-white/5">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar participante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-neon-green/50 transition-all text-sm w-full"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 no-scrollbar">
                {loadingBets ? (
                  <p className="text-white/40 text-center py-10">Carregando apostas...</p>
                ) : filteredBets.length === 0 ? (
                  <p className="text-white/40 text-center py-10">Nenhuma aposta encontrada.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredBets.map((bet) => {
                      const hitsCount = bet.numbers.filter(n => selectedDrawForBets.results.includes(n)).length;
                      return (
                        <div key={bet.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {bet.betName || bet.userName}
                            </p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">ID: {bet.userId.slice(-6).toUpperCase()}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {bet.numbers.map(num => {
                              const isHit = selectedDrawForBets.results.includes(num);
                              return (
                                <span 
                                  key={num} 
                                  className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all",
                                    isHit 
                                      ? "bg-neon-green border-neon-green text-black shadow-[0_0_10px_rgba(0,255,0,0.3)]" 
                                      : "bg-white/5 border-white/10 text-white/40"
                                  )}
                                >
                                  {num.toString().padStart(2, '0')}
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-right">
                            <p className="text-neon-green font-bold text-lg">
                              {hitsCount} <span className="text-[10px] uppercase font-normal">Acertos</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CurrentContest;
