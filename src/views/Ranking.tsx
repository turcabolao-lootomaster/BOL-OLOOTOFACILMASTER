/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Trophy, Medal, TrendingUp, Search, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { RANKING_GOAL } from '../utils';
import { UserRanking, ContestStatus } from '../types';

const Ranking: React.FC = () => {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<UserRanking[]>([]);
  const [contestRanking, setContestRanking] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'geral' | 'concurso'>('concurso');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [contestStatus, setContestStatus] = useState<ContestStatus>('aberto');

  useEffect(() => {
    const unsubscribeRanking = firebaseService.subscribeToRanking((data) => {
      setRanking(data);
      if (activeTab === 'geral') setLoading(false);
    });

    let unsubscribeBets: () => void = () => {};
    const unsubscribeContest = firebaseService.subscribeToActiveContest((active) => {
      if (active) {
        setContestStatus(active.status);
        unsubscribeBets();
        unsubscribeBets = firebaseService.subscribeToContestBets(active.id, (bets) => {
          // Group by betName + sellerCode
          const participantHits: { [key: string]: { userName: string, totalHits: number, sellerCode: string } } = {};
          
          bets.forEach(bet => {
            const totalHits = (bet.hits || [0, 0, 0]).reduce((acc, h) => acc + h, 0);
            const displayName = (bet.betName || bet.userName).toUpperCase();
            const sellerCode = (bet.sellerCode || '').toUpperCase();
            const key = `${displayName}_${sellerCode}`;

            if (!participantHits[key]) {
              participantHits[key] = { userName: displayName, totalHits: 0, sellerCode };
            }
            if (totalHits > participantHits[key].totalHits) {
              participantHits[key].totalHits = totalHits;
            }
          });

          const sortedData = Object.entries(participantHits)
            .map(([key, d]) => ({ userId: key, ...d }))
            .sort((a, b) => b.totalHits - a.totalHits);
            
          let currentRank = 0;
          let lastScore = -1;
          const dataWithRanks = sortedData.map((p) => {
            if (p.totalHits !== lastScore) {
              currentRank++;
              lastScore = p.totalHits;
            }
            return { ...p, position: currentRank };
          });
            
          setContestRanking(dataWithRanks);
          if (activeTab === 'concurso') setLoading(false);
        });
      } else {
        if (activeTab === 'concurso') setLoading(false);
      }
    });

    return () => {
      unsubscribeRanking();
      unsubscribeContest();
      unsubscribeBets();
    };
  }, [activeTab]);

  const currentRanking = activeTab === 'geral' ? ranking : contestRanking;

  const filteredRanking = React.useMemo(() => {
    return currentRanking.filter(p => 
      (p.userName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentRanking, searchTerm]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Medal className="text-lotofacil-yellow" size={24} />;
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

  const isWinner = (rank: number) => rank <= 2;

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl sm:text-4xl font-display tracking-widest text-slate-900 uppercase">RANKING <span className="text-lotofacil-purple">{activeTab === 'geral' ? 'GERAL' : 'DO CONCURSO'}</span></h1>
            <button 
              onClick={handleShare}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-lotofacil-purple transition-all border border-slate-200"
              title="Copiar Link Público"
            >
              <Share2 size={20} />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 sm:mt-2">
            {activeTab === 'geral' 
              ? 'Acumule pontos em todos os concursos para subir no ranking geral.' 
              : 'Classificação em tempo real do concurso atual.'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('concurso')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'concurso' ? "bg-lotofacil-purple text-white shadow-md" : "text-slate-600 hover:text-slate-800"
            )}
          >
            Concurso
          </button>
          <button 
            onClick={() => setActiveTab('geral')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'geral' ? "bg-lotofacil-purple text-white shadow-md" : "text-slate-600 hover:text-slate-800"
            )}
          >
            Geral
          </button>
        </div>
      </div>

      {activeTab === 'geral' && (
        <div className="p-3 sm:p-4 bg-lotofacil-purple/5 border border-lotofacil-purple/20 rounded-2xl flex items-start gap-3 sm:gap-4">
          <TrendingUp className="text-lotofacil-purple mt-0.5 shrink-0" size={18} />
          <div className="flex flex-col">
            <p className="text-[10px] sm:text-xs font-bold text-lotofacil-purple uppercase tracking-wider">Ranking Acumulado</p>
            <p className="text-[9px] sm:text-xs text-slate-600 leading-relaxed max-w-2xl">
              O Ranking Geral soma os pontos de todos os concursos realizados. 
              Os pontos do concurso atual são adicionados automaticamente após a finalização do 3º sorteio.
            </p>
          </div>
        </div>
      )}

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-slate-600 text-xs sm:text-sm">Carregando ranking...</div>
        ) : filteredRanking.slice(0, 3).map((p, idx) => (
          <motion.div 
            key={p.userId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "glass-card p-5 sm:p-8 flex flex-col items-center text-center space-y-4 sm:space-y-6 relative overflow-hidden",
              p.position === 1 && "border-lotofacil-yellow/30 ring-1 ring-lotofacil-yellow/20 shadow-sm"
            )}
          >
            {p.position === 1 && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lotofacil-yellow to-transparent" />
            )}
            <div className={cn(
              "w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center",
              p.position === 1 ? "bg-lotofacil-yellow/10" : p.position === 2 ? "bg-slate-100" : "bg-orange-50"
            )}>
              {getRankIcon(p.position)}
            </div>
            <div>
              <h3 className={cn(
                "text-lg sm:text-xl font-bold",
                p.position === 1 ? "text-lotofacil-yellow" : p.position === 2 ? "text-slate-600" : "text-slate-900"
              )}>{p.userName}</h3>
              {p.sellerCode && (
                <p className="text-[8px] sm:text-[10px] text-lotofacil-purple font-bold uppercase tracking-widest mt-0.5">
                  Vendedor: {p.sellerCode}
                </p>
              )}
              {activeTab === 'concurso' && isWinner(p.position) && contestStatus !== 'aberto' && (
                <div className="flex flex-col items-center gap-1 mt-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-bold uppercase tracking-tighter rounded flex items-center gap-1 shadow-sm">
                    <Trophy size={8} />
                    {p.position}º LUGAR
                  </span>
                  <p className="text-[8px] sm:text-[10px] text-lotofacil-purple font-bold uppercase tracking-widest animate-pulse">
                    Premiado
                  </p>
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-slate-600 uppercase tracking-widest mt-0.5 sm:mt-1">Participante</p>
            </div>
            <div className="w-full space-y-2 sm:space-y-3">
              <div className="flex justify-between text-[10px] sm:text-sm">
                <span className="text-slate-600 uppercase tracking-widest text-[8px] sm:text-[10px]">{activeTab === 'geral' ? 'Progresso' : 'Total de Acertos'}</span>
                <span className="text-lotofacil-purple font-bold">{activeTab === 'geral' ? p.points : p.totalHits} {activeTab === 'geral' ? 'PTS' : 'ACERTOS'}</span>
              </div>
              <div className="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: activeTab === 'geral' ? `${Math.min((p.points / RANKING_GOAL) * 100, 100)}%` : `${(p.totalHits / 30) * 100}%` }}
                  className={cn(
                    "h-full rounded-full shadow-sm",
                    p.position === 1 ? "bg-lotofacil-yellow" : p.position === 2 ? "bg-slate-600" : "bg-orange-600"
                  )}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* List */}
      <div className="glass-card p-5 sm:p-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">Classificação <span className="text-slate-600">Completa</span></h2>
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
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold text-slate-600 shrink-0 border border-slate-100">
                #{p.position}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "text-xs sm:text-sm font-bold truncate",
                    activeTab === 'concurso' && p.position === 1 ? "text-lotofacil-yellow" : activeTab === 'concurso' && p.position === 2 ? "text-slate-600" : "text-slate-900"
                  )}>{p.userName}</h4>
                  {p.sellerCode && (
                    <span className="text-[7px] sm:text-[8px] text-lotofacil-purple font-bold uppercase tracking-tighter bg-lotofacil-purple/5 px-1.5 py-0.5 rounded">
                      Vendedor: {p.sellerCode}
                    </span>
                  )}
                  {activeTab === 'concurso' && isWinner(p.position) && contestStatus !== 'aberto' && (
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[7px] font-bold uppercase tracking-tighter rounded flex items-center gap-1">
                        <Trophy size={6} />
                        {p.position}º
                      </span>
                      <span className="text-[8px] font-bold text-lotofacil-purple uppercase tracking-tighter animate-pulse">
                        Premiado
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:gap-4 mt-1 sm:mt-2">
                  <div className="flex-1 h-1 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-lotofacil-purple/40 rounded-full" style={{ width: activeTab === 'geral' ? `${Math.min((p.points / RANKING_GOAL) * 100, 100)}%` : `${(p.totalHits / 30) * 100}%` }} />
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] sm:text-xs font-bold text-lotofacil-purple whitespace-nowrap leading-none">
                      {(activeTab === 'geral' ? p.points : p.totalHits).toString().padStart(2, '0')}
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
