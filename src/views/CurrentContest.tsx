/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Trophy, Calendar, CheckCircle2, Clock, AlertCircle, Eye, X, Search, ExternalLink, Share2 } from 'lucide-react';
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
    const unsubscribe = firebaseService.subscribeToActiveContest((active) => {
      setContest(active);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  const handleShare = () => {
    const url = `${window.location.origin}/?view=current-contest`;
    navigator.clipboard.writeText(url);
    alert('Link público copiado para a área de transferência!');
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-300">Carregando concurso...</div>
    );
  }

  if (!contest) {
    return (
      <div className="p-10 text-center text-slate-300">Nenhum concurso ativo no momento.</div>
    );
  }

  return (
    <div className="px-1 py-2 sm:p-10 space-y-1.5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2">
        <div>
          <h1 className="text-sm sm:text-4xl font-display tracking-widest text-slate-900 uppercase">SORTEIOS DO <span className="text-lotofacil-purple">CONCURSO #{contest.number}</span></h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-0.5">
            <p className="text-[7px] sm:text-sm text-slate-400 font-medium">Acompanhe os resultados oficiais dos 3 sorteios.</p>
            {contest.publicLink && (
              <a 
                href={contest.publicLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[7px] sm:text-xs font-bold text-blue-600 hover:text-blue-700 transition-all uppercase tracking-widest bg-blue-50 px-1 py-0.5 rounded border border-blue-100"
              >
                <ExternalLink size={8} className="sm:w-3 sm:h-3" />
                Sorteio Ao Vivo
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="p-1 sm:p-2 bg-white hover:bg-slate-50 rounded-lg sm:rounded-xl text-lotofacil-purple transition-all border border-dark-border/40 shadow-sm"
            title="Copiar Link Público"
          >
            <Share2 size={12} className="sm:w-4 sm:h-4" />
          </button>
          {contest.status === 'encerrado' && (
            <div className="bg-white border border-red-200 rounded-lg sm:rounded-xl px-1.5 py-0.5 sm:px-3 sm:py-1.5 flex items-center gap-1 bg-red-50 shadow-sm">
              <AlertCircle className="text-red-600" size={8} />
              <span className="text-[7px] sm:text-xs font-bold text-red-600 uppercase tracking-widest animate-pulse">
                ENCERRADO
              </span>
            </div>
          )}
          <div className="bg-white border border-lotofacil-purple/20 rounded-lg sm:rounded-xl px-1.5 py-0.5 sm:px-3 sm:py-1.5 flex items-center gap-1 bg-lotofacil-purple/5 shadow-sm">
            <Calendar className="text-lotofacil-purple" size={8} />
            <span className="text-[7px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
              {new Date(contest.createdAt as any).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:gap-6">
        {contest.draws.map((draw, idx) => (
          <motion.div 
            key={draw.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-slate-200 p-2 sm:p-6 rounded-lg sm:rounded-[2rem] space-y-1.5 sm:space-y-6 relative overflow-hidden shadow-sm"
          >
            {/* Background Number */}
            <div className="absolute -top-1 -right-1 text-[30px] sm:text-[100px] font-display text-slate-900/[0.03] pointer-events-none">
              {draw.number}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5 sm:gap-3 relative z-10">
              <div className="flex items-center gap-1.5 sm:gap-4">
                <div className={cn(
                  "w-6 h-6 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0",
                  draw.status === 'concluido' ? "bg-lotofacil-purple/10 text-lotofacil-purple" : "bg-orange-100 text-orange-600"
                )}>
                  <Trophy size={12} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-[10px] sm:text-2xl font-display tracking-widest text-slate-900 uppercase leading-none">SORTEIO #{draw.number}</h2>
                      {draw.status === 'concluido' && (
                        <button 
                          onClick={() => handleViewBets(draw.number, draw.results)}
                          className="px-1.5 py-0.5 bg-lotofacil-purple hover:bg-lotofacil-purple/80 text-white rounded transition-all flex items-center gap-1 text-[7px] font-black uppercase tracking-widest shadow-[0_2px_6px_rgba(107,33,168,0.3)]"
                        >
                          <Eye size={8} />
                          Ver
                        </button>
                      )}
                    </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {draw.status === 'concluido' ? (
                      <CheckCircle2 className="text-lotofacil-purple" size={8} />
                    ) : (
                      <Clock className="text-orange-600" size={8} />
                    )}
                    <span className={cn(
                      "text-[7px] sm:text-[10px] font-bold uppercase tracking-widest",
                      draw.status === 'concluido' ? "text-lotofacil-purple" : "text-orange-600"
                    )}>
                      {draw.status === 'concluido' ? `Realizado` : `Aguardando`}
                    </span>
                  </div>
                </div>
              </div>

              {draw.status === 'concluido' && (
                <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 w-fit">
                  <AlertCircle className="text-slate-300" size={8} />
                  <span className="text-[7px] sm:text-xs text-slate-400">15 números sorteados</span>
                </div>
              )}
            </div>

            {draw.status === 'concluido' ? (
              <div className="flex flex-wrap gap-1 sm:gap-2 relative z-10 px-0.5">
                {draw.results.sort((a, b) => a - b).map(num => (
                  <motion.div
                    key={num}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 sm:w-10 sm:h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-900 font-black text-[8px] sm:text-base shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_-1px_2px_rgba(0,0,0,0.05)]"
                  >
                    {num.toString().padStart(2, '0')}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 sm:py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 relative z-10">
                <Clock className="text-slate-200 mb-1 sm:w-6 sm:h-6" size={12} />
                <p className="text-slate-300 font-display tracking-widest text-[8px] sm:text-xl uppercase text-center font-bold">Aguardando Sorteio</p>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-2xl font-display tracking-widest text-slate-900 uppercase">APOSTAS <span className="text-lotofacil-purple">SORTEIO #{selectedDrawForBets.number}</span></h3>
                  <div className="flex flex-wrap gap-1 mt-2 sm:mt-4">
                    {selectedDrawForBets.results.map(num => (
                      <span key={num} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-lotofacil-purple text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold">
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
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all"
                >
                  <X size={16} className="sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="px-4 sm:px-8 py-3 border-b border-slate-100">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 sm:w-4 sm:h-4" size={14} />
                  <input 
                    type="text" 
                    placeholder="Buscar participante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-[10px] sm:text-xs w-full text-slate-900"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-2 sm:space-y-3 no-scrollbar">
                {loadingBets ? (
                  <p className="text-slate-300 text-center py-6 text-[10px] uppercase tracking-widest font-bold">Carregando...</p>
                ) : filteredBets.length === 0 ? (
                  <p className="text-slate-300 text-center py-6 text-[10px] uppercase tracking-widest font-bold">Nenhuma aposta encontrada.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {filteredBets.map((bet) => {
                      const hitsCount = bet.numbers.filter(n => selectedDrawForBets.results.includes(n)).length;
                      return (
                        <div key={bet.id} className="bg-white border border-slate-100 rounded-xl p-2.5 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 shadow-sm">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {bet.betName || bet.userName}
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 font-medium">ID: {bet.userId.slice(-6).toUpperCase()}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {bet.numbers.map(num => {
                              const isHit = selectedDrawForBets.results.includes(num);
                              return (
                                <span 
                                  key={num} 
                                  className={cn(
                                    "w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[8px] sm:text-[9px] font-bold border transition-all",
                                    isHit 
                                      ? "bg-lotofacil-purple border-lotofacil-purple text-white" 
                                      : "bg-slate-50 border-slate-200 text-slate-300"
                                  )}
                                >
                                  {num.toString().padStart(2, '0')}
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lotofacil-purple font-bold text-base sm:text-lg leading-none">
                              {hitsCount} <span className="text-[8px] sm:text-[9px] uppercase font-normal text-slate-400">Acertos</span>
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
