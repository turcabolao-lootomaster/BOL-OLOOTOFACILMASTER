/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Trophy, Medal, Search, Filter, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { Bet, Contest } from '../types';

const Participants: React.FC = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeBets: () => void = () => {};
    const unsubscribeContest = firebaseService.subscribeToActiveContest((activeContest) => {
      setContest(activeContest);
      if (activeContest) {
        unsubscribeBets();
        unsubscribeBets = firebaseService.subscribeToContestBets(activeContest.id, (contestBets) => {
          setBets(contestBets);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeContest();
      unsubscribeBets();
    };
  }, []);

  const betsWithRanks = React.useMemo(() => {
    const sorted = [...bets].sort((a, b) => {
      const totalA = Array.isArray(a.hits) ? a.hits.reduce((sum, h) => sum + h, 0) : (a.hits || 0);
      const totalB = Array.isArray(b.hits) ? b.hits.reduce((sum, h) => sum + h, 0) : (b.hits || 0);
      return totalB - totalA;
    });

    let currentRank = 0;
    let lastScore = -1;
    return sorted.map((b) => {
      const total = Array.isArray(b.hits) ? b.hits.reduce((sum, h) => sum + h, 0) : (b.hits || 0);
      if (total !== lastScore) {
        currentRank++;
        lastScore = total;
      }
      return { ...b, rank: currentRank };
    });
  }, [bets]);

  const filteredBets = React.useMemo(() => {
    return betsWithRanks.filter(b => 
      b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.betName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [betsWithRanks, searchTerm]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Medal className="text-lotofacil-yellow" size={18} />;
      case 2: return <Medal className="text-slate-400" size={18} />;
      case 3: return <Medal className="text-lotofacil-purple" size={18} />;
      default: return <span className="text-[10px] font-bold text-slate-600">#{rank}</span>;
    }
  };

  const isWinner = (rank: number) => rank <= 2;

  const handleShare = () => {
    const url = `${window.location.origin}/?view=participants`;
    navigator.clipboard.writeText(url);
    alert('Link público copiado para a área de transferência!');
  };

  return (
    <div className="mobile-p lg:p-10 space-y-4 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-4xl font-display tracking-widest text-slate-900">
              CLASSIFICAÇÃO <span className="text-lotofacil-purple uppercase">AO VIVO</span>
            </h1>
            <button 
              onClick={handleShare}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-lotofacil-purple transition-all border border-slate-200"
              title="Copiar Link Público"
            >
              <Share2 size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              Concurso {contest ? `#${contest.number}` : '...'}
            </span>
            <span className="px-2 py-0.5 bg-lotofacil-purple/10 border border-lotofacil-purple/20 rounded-full text-[9px] font-bold text-lotofacil-purple uppercase tracking-widest">
              {bets.length} Apostas
            </span>
            <div className="flex items-center gap-1 ml-auto sm:ml-2 px-2 py-0.5 bg-lotofacil-yellow/10 border border-lotofacil-yellow/20 rounded-full text-[9px] font-bold text-lotofacil-yellow uppercase tracking-widest">
              <Trophy size={10} />
              <span>Máx: 30 PTS</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar participante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="glass-card overflow-hidden border-slate-200">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-16">Pos</th>
                  <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold">Participante</th>
                  <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center">Números</th>
                  <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-12">S1</th>
                  <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-12">S2</th>
                  <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-12">S3</th>
                  <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-lotofacil-purple/20 border-t-lotofacil-purple rounded-full animate-spin" />
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Sincronizando...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredBets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <Trophy size={40} className="text-slate-900" />
                        <p className="text-slate-900 text-[10px] uppercase tracking-widest font-bold">Nenhuma aposta</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredBets.map((b, idx) => {
                  const hits = Array.isArray(b.hits) ? b.hits : [0, 0, 0];
                  const total = hits.reduce((sum, h) => sum + h, 0);
                  const rank = (b as any).rank || idx + 1;
                  const isCurrentUser = b.userId === user?.uid;
                  
                  return (
                    <motion.tr 
                      key={b.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 1) }}
                      className={cn(
                        "transition-all group relative",
                        isCurrentUser ? "bg-lotofacil-purple/5" : "hover:bg-slate-50",
                        rank === 1 && "bg-gradient-to-r from-lotofacil-yellow/5 to-transparent",
                        rank === 2 && "bg-gradient-to-r from-slate-100 to-transparent",
                        rank === 3 && "bg-gradient-to-r from-lotofacil-purple/5 to-transparent"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-lg font-display text-xs transition-transform group-hover:scale-110 relative",
                            rank === 1 ? "bg-lotofacil-yellow text-white shadow-md ring-2 ring-lotofacil-yellow/50" : 
                            rank === 2 ? "bg-slate-300 text-white shadow-md ring-2 ring-slate-300/50" : 
                            rank === 3 ? "bg-lotofacil-purple text-white shadow-md" : 
                            "bg-slate-100 text-slate-600 border border-slate-200"
                          )}>
                            {rank}
                            {isWinner(rank) && (
                              <div className="absolute -top-1 -right-1">
                                <Trophy size={10} className="text-white fill-current drop-shadow-sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "text-xs sm:text-sm font-bold tracking-wide truncate max-w-[120px] sm:max-w-none",
                              rank === 1 ? "text-lotofacil-yellow" : rank === 2 ? "text-slate-600" : rank === 3 ? "text-lotofacil-purple" : "text-slate-900"
                            )}>
                              {b.betName || b.userName}
                            </p>
                            {isCurrentUser && (
                              <span className="px-1 py-0.5 bg-lotofacil-purple text-white text-[6px] font-black uppercase rounded">VOCÊ</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-medium">ID: {b.userId.slice(-6).toUpperCase()}</p>
                            {rank <= 3 && contest?.status !== 'aberto' && (
                              <span className={cn(
                                "flex items-center gap-1 text-[7px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded-full shadow-sm",
                                rank === 1 ? "bg-lotofacil-yellow text-white" : 
                                rank === 2 ? "bg-slate-300 text-slate-700" :
                                "bg-lotofacil-purple text-white"
                              )}>
                                <Trophy size={8} className="fill-current" />
                                {rank === 3 ? "FOI QUASE!" : `${rank}º LUGAR`}
                              </span>
                            )}
                            {isWinner(rank) && contest?.status !== 'aberto' && (
                              <span className="flex items-center gap-1 text-[7px] font-bold text-green-600 uppercase tracking-tighter bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100 shadow-sm animate-pulse">
                                <div className="w-1 h-1 rounded-full bg-green-500 animate-ping" />
                                PREMIAÇÃO
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {b.numbers.map(num => (
                            <div 
                              key={num} 
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[8px] sm:text-[10px] font-bold transition-all border bg-slate-50 border-slate-200 text-slate-600"
                            >
                              {num.toString().padStart(2, '0')}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {hits[0] >= 10 && (
                            <span className="text-[7px] font-black bg-lotofacil-yellow text-white px-1.5 py-0.5 rounded-sm animate-pulse whitespace-nowrap shadow-sm border border-lotofacil-yellow/50">10+ PONTOS</span>
                          )}
                          <span className={cn(
                            "text-xs font-bold font-mono",
                            hits[0] >= 11 ? "text-lotofacil-yellow" : hits[0] >= 10 ? "text-lotofacil-yellow" : hits[0] >= 9 ? "text-lotofacil-purple" : "text-slate-500"
                          )}>
                            {hits[0].toString().padStart(2, '0')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {hits[1] >= 10 && (
                            <span className="text-[7px] font-black bg-lotofacil-yellow text-white px-1.5 py-0.5 rounded-sm animate-pulse whitespace-nowrap shadow-sm border border-lotofacil-yellow/50">10+ PONTOS</span>
                          )}
                          <span className={cn(
                            "text-xs font-bold font-mono",
                            hits[1] >= 11 ? "text-lotofacil-yellow" : hits[1] >= 10 ? "text-lotofacil-yellow" : hits[1] >= 9 ? "text-lotofacil-purple" : "text-slate-500"
                          )}>
                            {hits[1].toString().padStart(2, '0')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {hits[2] >= 10 && (
                            <span className="text-[7px] font-black bg-lotofacil-yellow text-white px-1.5 py-0.5 rounded-sm animate-pulse whitespace-nowrap shadow-sm border border-lotofacil-yellow/50">10+ PONTOS</span>
                          )}
                          <span className={cn(
                            "text-xs font-bold font-mono",
                            hits[2] >= 11 ? "text-lotofacil-yellow" : hits[2] >= 10 ? "text-lotofacil-yellow" : hits[2] >= 9 ? "text-lotofacil-purple" : "text-slate-500"
                          )}>
                            {hits[2].toString().padStart(2, '0')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={cn(
                          "inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg border transition-all shadow-sm",
                          rank <= 3 ? "bg-white border-lotofacil-yellow/30" : "bg-slate-50 border-slate-200"
                        )}>
                          <span className={cn(
                            "text-sm sm:text-base font-display tracking-tighter leading-none",
                            rank === 1 ? "text-lotofacil-yellow" : rank === 2 ? "text-slate-600" : rank === 3 ? "text-lotofacil-purple" : "text-lotofacil-purple"
                          )}>
                            {total.toString().padStart(2, '0')}
                          </span>
                          <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">PTS</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Participants;
