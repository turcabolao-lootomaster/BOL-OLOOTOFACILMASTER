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
    if (!user) return;

    const fetchData = async () => {
      const activeContest = await firebaseService.getActiveContest();
      setContest(activeContest);
      if (activeContest) {
        const contestBets = await firebaseService.getContestBets(activeContest.id);
        setBets(contestBets);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const filteredBets = bets.filter(b => 
    b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.betName || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const totalA = Array.isArray(a.hits) ? a.hits.reduce((sum, h) => sum + h, 0) : (a.hits || 0);
    const totalB = Array.isArray(b.hits) ? b.hits.reduce((sum, h) => sum + h, 0) : (b.hits || 0);
    return totalB - totalA;
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Medal className="text-gold" size={20} />;
      case 2: return <Medal className="text-silver" size={20} />;
      case 3: return <Medal className="text-accent-orange" size={20} />;
      default: return <span className="text-xs font-bold text-white/40">#{rank}</span>;
    }
  };

  const isWinner = (rank: number) => rank <= 2;
  const hasTenPoints = (hits: number[]) => hits.some(h => h === 10);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link público copiado para a área de transferência!');
  };

  return (
    <div className="p-6 lg:p-10 space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-display tracking-widest text-white">
              PARTICIPANTES <span className="text-neon-green uppercase">CONCURSO {contest ? `#${contest.number}` : '...'}</span>
            </h1>
            <button 
              onClick={handleShare}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-neon-green transition-all"
              title="Copiar Link Público"
            >
              <Share2 size={20} />
            </button>
          </div>
          <p className="text-white/50 mt-2">Classificação em tempo real baseada nos sorteios realizados.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar participante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-neon-green/50 transition-all text-sm w-64"
            />
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Posição</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold w-full">Participante</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold" style={{ width: '351px' }}>Números</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">S1</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">S2</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">S3</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-white/40">Carregando participantes...</td>
                </tr>
              ) : filteredBets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-white/40">Nenhuma aposta validada encontrada para este concurso.</td>
                </tr>
              ) : filteredBets.map((b, idx) => {
                const hits = Array.isArray(b.hits) ? b.hits : [0, 0, 0];
                const total = hits.reduce((sum, h) => sum + h, 0);
                const rank = idx + 1;
                
                return (
                  <motion.tr 
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "border-b border-white/5 hover:bg-white/5 transition-all group cursor-pointer",
                      rank === 1 && "bg-gold/5 border-l-4 border-l-gold",
                      rank === 2 && "bg-silver/5 border-l-4 border-l-silver",
                      rank === 3 && "bg-accent-orange/5 border-l-4 border-l-accent-orange"
                    )}
                  >
                    <td className="px-6 py-5">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg",
                        rank === 1 ? "bg-gold/20" : rank === 2 ? "bg-silver/20" : rank === 3 ? "bg-accent-orange/20" : "bg-white/5"
                      )}>
                        {getRankIcon(rank)}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <p className={cn(
                          "text-sm font-bold transition-colors",
                          rank === 1 ? "text-gold" : rank === 2 ? "text-silver" : "text-white group-hover:text-neon-green"
                        )}>
                          {b.betName || b.userName}
                        </p>
                        {isWinner(rank) && contest?.status !== 'aberto' && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-accent-blue text-white text-[8px] font-bold uppercase tracking-tighter rounded flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                              <Trophy size={8} />
                              {rank}º LUGAR
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-tighter text-neon-green animate-pulse">
                              PREMIADO
                            </span>
                          </div>
                        )}
                        {hasTenPoints(hits) && (
                          <span className="text-[8px] font-bold uppercase tracking-tighter text-accent-blue mt-0.5">
                            PRÊMIO 10 PONTOS (R$ 500,00)
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">ID: {b.userId.slice(-6).toUpperCase()}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-1" style={{ width: '351px', height: '40px' }}>
                        {b.numbers.map(num => (
                          <div key={num} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-[15px] font-bold text-white/40 border border-white/10" style={{ lineHeight: '21px' }}>
                            {num.toString().padStart(2, '0')}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn("text-sm font-bold", hits[0] >= 11 ? "text-neon-green" : hits[0] >= 9 ? "text-accent-orange" : "text-white/40")}>
                        {hits[0]}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn("text-sm font-bold", hits[1] >= 11 ? "text-neon-green" : hits[1] >= 9 ? "text-accent-orange" : "text-white/40")}>
                        {hits[1]}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn("text-sm font-bold", hits[2] >= 11 ? "text-neon-green" : hits[2] >= 9 ? "text-accent-orange" : "text-white/40")}>
                        {hits[2]}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10" style={{ backgroundColor: '#080101' }}>
                        <span className="text-sm font-bold" style={{ color: '#fb9f14' }}>{total}</span>
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
  );
};

export default Participants;
