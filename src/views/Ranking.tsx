/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Trophy, Medal, TrendingUp, Search, Share2, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { RANKING_GOAL } from '../utils';
import { UserRanking, ContestStatus, Bet } from '../types';

const Ranking: React.FC = () => {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<UserRanking[]>([]);
  const [activeBetKeys, setActiveBetKeys] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeRanking = firebaseService.subscribeToRanking((data) => {
      setRanking(data);
      setLoading(false);
    });

    // Subscribe to active contest bets to show blinking dot
    let unsubscribeBets: (() => void) | undefined;
    const unsubscribeContest = firebaseService.subscribeToActiveContest((contest) => {
      if (contest) {
        if (unsubscribeBets) unsubscribeBets();
        unsubscribeBets = firebaseService.subscribeToContestBets(contest.id, (bets: Bet[]) => {
          const keys = new Set(bets.map(b => 
            `${(b.betName || b.userName || '').trim().toUpperCase()}_${(b.sellerCode || '').trim().toUpperCase()}`
          ));
          setActiveBetKeys(keys);
        });
      }
    });

    return () => {
      unsubscribeRanking();
      unsubscribeContest();
      if (unsubscribeBets) unsubscribeBets();
    };
  }, []);

  const filteredRanking = React.useMemo(() => {
    const filtered = ranking.filter(p => 
      (p.userName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.slice(0, 25); // Limit to Top 25
  }, [ranking, searchTerm]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="text-lotofacil-yellow" size={24} />;
      case 2: return <Medal className="text-slate-400" size={24} />;
      case 3: return <Medal className="text-orange-600" size={24} />;
      default: return <span className="text-sm font-bold text-slate-600">#{rank}</span>;
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?view=ranking`;
    navigator.clipboard.writeText(url);
    alert('Link público copiado para a área de transferência!');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-4xl font-display tracking-widest text-slate-900 uppercase">
              CORRIDA DOS CAMPEÕES
              <span className="text-lotofacil-purple"> - 150 PTS</span>
            </h1>
            <button 
              onClick={handleShare}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-lotofacil-purple transition-all border border-slate-200"
              title="Copiar Link Público"
            >
              <Share2 size={20} />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 sm:mt-2">
            Acompanhe a corrida rumo aos 150 pontos!
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="px-3 py-1.5 bg-slate-900 text-white rounded-lg flex items-center gap-2 shadow-md border border-lotofacil-yellow/30">
              <Trophy size={14} className="text-lotofacil-yellow" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Meta: 150 Pontos</span>
            </div>
            <div className="px-3 py-1.5 bg-lotofacil-yellow text-slate-900 rounded-lg flex items-center gap-2 shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-widest">Prêmio para quem alcançar primeiro: R$ 1.000</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 bg-lotofacil-purple/5 border border-lotofacil-purple/20 rounded-2xl flex items-start gap-3 sm:gap-4">
        <TrendingUp className="text-lotofacil-purple mt-0.5 shrink-0" size={18} />
        <div className="flex flex-col">
          <p className="text-[10px] sm:text-xs font-bold text-lotofacil-purple uppercase tracking-wider">Corrida 150 PTS</p>
          <p className="text-[9px] sm:text-xs text-slate-600 leading-relaxed max-w-2xl">
            A Corrida 150 PTS soma os pontos de todos os concursos realizados. 
            Os pontos do concurso atual são adicionados automaticamente após a finalização do 3º sorteio.
          </p>
        </div>
      </div>

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-slate-600 text-xs sm:text-sm">Carregando ranking...</div>
        ) : filteredRanking.slice(0, 3).map((p, idx) => (
          <motion.div 
            key={p.userId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "glass-card p-4 sm:p-8 flex flex-col items-center text-center space-y-3 sm:space-y-6 relative overflow-hidden",
              p.position === 1 && "border-lotofacil-yellow/30 ring-1 ring-lotofacil-yellow/20 shadow-sm"
            )}
          >
            {p.position === 1 && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lotofacil-yellow to-transparent" />
            )}
            <div className={cn(
              "w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center relative",
              p.position === 1 ? "bg-lotofacil-yellow/10" : p.position === 2 ? "bg-slate-100" : "bg-orange-50"
            )}>
              {getRankIcon(p.position)}
              {p.position === 1 && (
                <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg ring-1 ring-lotofacil-yellow/50 flex items-center gap-1">
                  <Crown size={8} className="text-lotofacil-yellow" /> Líder
                </div>
              )}
            </div>
            <div>
              <h3 className={cn(
                "text-lg sm:text-xl font-bold",
                p.position === 1 ? "text-lotofacil-yellow" : p.position === 2 ? "text-slate-600" : "text-slate-900"
              )}>{p.userName}</h3>
              
              {/* Numbers Display */}
              {p.numbers && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-2">
                  {p.numbers.map(num => (
                    <span key={num} className="text-[9px] font-bold text-lotofacil-purple bg-lotofacil-purple/5 px-0.5 rounded border border-lotofacil-purple/10">
                      {num.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              )}

              {p.sellerCode && (
                <p className="text-[8px] sm:text-[10px] text-lotofacil-purple font-bold uppercase tracking-widest mt-0.5">
                  Vendedor: {p.sellerCode}
                </p>
              )}
              {p.position === 1 && (
                <div className="mt-1">
                  <span className="text-[8px] font-black text-lotofacil-yellow uppercase tracking-widest flex items-center justify-center gap-1">
                    <Crown size={10} /> Líder do Ranking
                  </span>
                </div>
              )}
              {p.points >= 150 && (
                <div className="flex flex-col items-center gap-1 mt-2">
                  <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-bold uppercase tracking-tighter rounded flex items-center gap-1 shadow-lg ring-1 ring-lotofacil-yellow/50">
                    <Trophy size={8} className="text-lotofacil-yellow" />
                    META ALCANÇADA
                  </span>
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-slate-600 uppercase tracking-widest mt-0.5 sm:mt-1">Participante</p>
            </div>
            <div className="w-full space-y-2 sm:space-y-3">
              <div className="flex justify-between items-end text-[10px] sm:text-sm">
                <div className="flex flex-col items-start">
                  <span className="text-slate-600 uppercase tracking-widest text-[8px] sm:text-[10px]">Progresso</span>
                  <span className="text-[9px] font-bold text-lotofacil-purple mt-0.5">
                    {p.points} / {RANKING_GOAL} PTS
                  </span>
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded font-bold transition-all",
                  p.points >= 150 
                    ? "bg-slate-900 text-white shadow-lg scale-110 ring-2 ring-lotofacil-yellow/50" 
                    : "text-lotofacil-purple"
                )}>
                  {p.points} PTS
                </div>
              </div>
              <div className="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((p.points / RANKING_GOAL) * 100, 100)}%` }}
                  className={cn(
                    "h-full rounded-full shadow-sm",
                    p.position === 1 ? "bg-lotofacil-yellow" : p.position === 2 ? "bg-slate-600" : "bg-orange-600"
                  )}
                />
              </div>
              {p.points < RANKING_GOAL && (
                <p className="text-[8px] sm:text-[9px] text-slate-500 font-medium italic">
                  Faltam {RANKING_GOAL - p.points} pontos para alcançar a meta
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* List */}
      <div className="glass-card p-3 sm:p-8 space-y-4 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-base sm:text-2xl font-display tracking-widest text-slate-900 uppercase">Top 25 <span className="text-slate-600">Classificação</span></h2>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input 
                type="text" 
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 sm:pl-10 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-[10px] sm:text-xs w-full text-slate-900 placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {filteredRanking.slice(3).map((p, idx) => (
            <motion.div 
              key={p.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-3 sm:gap-6 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold text-slate-600 shrink-0 border border-slate-100 relative">
                #{p.position}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold truncate text-slate-900">{p.userName}</h4>
                  {p.sellerCode && (
                    <span className="text-[7px] sm:text-[8px] text-lotofacil-purple font-bold uppercase tracking-tighter bg-lotofacil-purple/5 px-1.5 py-0.5 rounded">
                      Vendedor: {p.sellerCode}
                    </span>
                  )}
                  {p.points >= 150 && (
                    <span className="text-[7px] sm:text-[8px] bg-slate-900 text-white font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm ring-1 ring-lotofacil-yellow/30">
                      <Trophy size={8} className="text-lotofacil-yellow" />
                      META ALCANÇADA
                    </span>
                  )}
                </div>
                
                {/* Numbers Display */}
                {p.numbers && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {p.numbers.map(num => (
                      <span key={num} className="text-[9px] font-bold text-lotofacil-purple bg-lotofacil-purple/5 px-0.5 rounded border border-lotofacil-purple/10">
                        {num.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 sm:gap-4 mt-1 sm:mt-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-1 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-lotofacil-purple/40 rounded-full" style={{ width: `${Math.min((p.points / RANKING_GOAL) * 100, 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold text-lotofacil-purple">
                        {p.points} / {RANKING_GOAL} PTS
                      </span>
                      {p.points < RANKING_GOAL && (
                        <span className="text-[7px] text-slate-500 italic">
                          Faltam {RANKING_GOAL - p.points} para a meta
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[40px] shrink-0",
                    p.points >= 150 
                      ? "bg-slate-900 text-white shadow-md scale-110 ring-1 ring-lotofacil-yellow/30" 
                      : "bg-slate-50 border border-slate-100"
                  )}>
                    <span className={cn(
                      "text-[10px] sm:text-xs font-bold whitespace-nowrap leading-none",
                      p.points >= 150 ? "text-white" : "text-lotofacil-purple"
                    )}>
                      {p.points.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">PTS</span>
                  </div>
                </div>
              </div>
              <TrendingUp className="text-lotofacil-purple/20 shrink-0" size={16} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ranking;
