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
    if (!user) return;

    const unsubscribe = firebaseService.subscribeToRanking((data) => {
      setRanking(data);
      if (activeTab === 'geral') setLoading(false);
    });

    const fetchContestRanking = async () => {
      try {
        const active = await firebaseService.getActiveContest();
        if (active) {
          setContestStatus(active.status);
          const data = await firebaseService.getContestRanking(active.id);
          setContestRanking(data.map((p, idx) => ({ ...p, position: idx + 1 })));
        }
      } catch (error) {
        console.error("Error fetching contest ranking:", error);
      } finally {
        if (activeTab === 'concurso') setLoading(false);
      }
    };

    fetchContestRanking();
    return () => unsubscribe();
  }, [user, activeTab]);

  const currentRanking = activeTab === 'geral' ? ranking : contestRanking;

  const filteredRanking = currentRanking.filter(p => 
    (p.userName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Medal className="text-gold" size={24} />;
      case 2: return <Medal className="text-silver" size={24} />;
      case 3: return <Medal className="text-accent-orange" size={24} />;
      default: return <span className="text-sm font-bold text-white/40">#{rank}</span>;
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link público copiado para a área de transferência!');
  };

  const isWinner = (rank: number) => rank <= 2;

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl sm:text-4xl font-display tracking-widest text-white uppercase">RANKING <span className="text-neon-green">{activeTab === 'geral' ? 'GERAL' : 'DO CONCURSO'}</span></h1>
            <button 
              onClick={handleShare}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-neon-green transition-all"
              title="Copiar Link Público"
            >
              <Share2 size={20} />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1 sm:mt-2">
            {activeTab === 'geral' 
              ? 'Acumule pontos em todos os concursos para subir no ranking geral.' 
              : 'Classificação em tempo real do concurso atual.'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setActiveTab('concurso')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'concurso' ? "bg-neon-green text-black" : "text-white/40 hover:text-white"
            )}
          >
            Concurso
          </button>
          <button 
            onClick={() => setActiveTab('geral')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'geral' ? "bg-neon-green text-black" : "text-white/40 hover:text-white"
            )}
          >
            Geral
          </button>
        </div>
      </div>

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-white/40 text-xs sm:text-sm">Carregando ranking...</div>
        ) : filteredRanking.slice(0, 3).map((p, idx) => (
          <motion.div 
            key={p.userId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "glass-card p-5 sm:p-8 flex flex-col items-center text-center space-y-4 sm:space-y-6 relative overflow-hidden",
              p.position === 1 && "border-gold/30 ring-1 ring-gold/20 shadow-[0_0_30px_rgba(255,215,0,0.1)]"
            )}
          >
            {p.position === 1 && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
            )}
            <div className={cn(
              "w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center",
              p.position === 1 ? "bg-gold/10" : p.position === 2 ? "bg-silver/10" : "bg-accent-orange/10"
            )}>
              {getRankIcon(p.position)}
            </div>
            <div>
              <h3 className={cn(
                "text-lg sm:text-xl font-bold",
                p.position === 1 ? "text-gold" : p.position === 2 ? "text-silver" : "text-white"
              )}>{p.userName}</h3>
              {activeTab === 'concurso' && isWinner(p.position) && contestStatus !== 'aberto' && (
                <div className="flex flex-col items-center gap-1 mt-2">
                  <span className="px-2 py-0.5 bg-accent-blue text-white text-[8px] font-bold uppercase tracking-tighter rounded flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                    <Trophy size={8} />
                    {p.position}º LUGAR
                  </span>
                  <p className="text-[8px] sm:text-[10px] text-neon-green font-bold uppercase tracking-widest animate-pulse">
                    Premiado
                  </p>
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest mt-0.5 sm:mt-1">Participante</p>
            </div>
            <div className="w-full space-y-2 sm:space-y-3">
              <div className="flex justify-between text-[10px] sm:text-sm">
                <span className="text-white/40 uppercase tracking-widest text-[8px] sm:text-[10px]">{activeTab === 'geral' ? 'Progresso' : 'Total de Acertos'}</span>
                <span className="text-neon-green font-bold">{activeTab === 'geral' ? p.points : p.totalHits} {activeTab === 'geral' ? 'PTS' : 'ACERTOS'}</span>
              </div>
              <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: activeTab === 'geral' ? `${Math.min((p.points / RANKING_GOAL) * 100, 100)}%` : `${(p.totalHits / 30) * 100}%` }}
                  className={cn(
                    "h-full rounded-full",
                    p.position === 1 ? "bg-gold" : p.position === 2 ? "bg-silver" : "bg-accent-orange"
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
          <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white uppercase">Classificação <span className="text-white/20">Completa</span></h2>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input 
                type="text" 
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 sm:pl-10 pr-4 focus:outline-none focus:border-neon-green/50 transition-all text-[10px] sm:text-xs w-full"
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
              className="flex items-center gap-3 sm:gap-6 p-3 sm:p-4 bg-white/2 rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold text-white/40 shrink-0">
                #{p.position}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "text-xs sm:text-sm font-bold truncate",
                    activeTab === 'concurso' && p.position === 1 ? "text-gold" : activeTab === 'concurso' && p.position === 2 ? "text-silver" : "text-white"
                  )}>{p.userName}</h4>
                  {activeTab === 'concurso' && isWinner(p.position) && contestStatus !== 'aberto' && (
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-accent-blue text-white text-[7px] font-bold uppercase tracking-tighter rounded flex items-center gap-1">
                        <Trophy size={6} />
                        {p.position}º
                      </span>
                      <span className="text-[8px] font-bold text-neon-green uppercase tracking-tighter animate-pulse">
                        Premiado
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:gap-4 mt-1 sm:mt-2">
                  <div className="flex-1 h-1 sm:h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-neon-green/40 rounded-full" style={{ width: activeTab === 'geral' ? `${Math.min((p.points / RANKING_GOAL) * 100, 100)}%` : `${(p.totalHits / 30) * 100}%` }} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-neon-green whitespace-nowrap">{activeTab === 'geral' ? p.points : p.totalHits} {activeTab === 'geral' ? 'PTS' : 'AC'}</span>
                </div>
              </div>
              <TrendingUp className="text-neon-green/20 shrink-0" size={16} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ranking;
