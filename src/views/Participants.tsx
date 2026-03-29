/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Trophy, Medal, Search, Share2, DollarSign, TrendingUp, Info } from 'lucide-react';
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

  const betPrice = contest?.betPrice || 10;
  const totalRevenue = bets.length * betPrice;

  // Prize Calculations
  const prizes = useMemo(() => {
    const config = contest?.prizeConfig || {
      pctRapidinha: 0.10,
      pctChampion: 0.45,
      pctVice: 0.15
    };
    const rapidinha = totalRevenue * (config.pctRapidinha || 0.10);
    const champion = totalRevenue * (config.pctChampion || 0.45);
    const vice = totalRevenue * (config.pctVice || 0.15);
    return { rapidinha, champion, vice };
  }, [totalRevenue, contest]);

  const winners = useMemo(() => {
    if (bets.length === 0) return { rapidinha: [], champion: [], vice: [], draws10: [[], [], []], total27: [] };

    const sortedByS1 = [...bets].sort((a, b) => (b.hits?.[0] || 0) - (a.hits?.[0] || 0));
    const maxS1 = sortedByS1[0]?.hits?.[0] || 0;
    const rapidinhaWinners = maxS1 > 0 ? sortedByS1.filter(b => (b.hits?.[0] || 0) === maxS1).map(b => b.id) : [];

    const sortedByTotal = [...bets].sort((a, b) => {
      const totalA = (a.hits || []).reduce((sum, h) => sum + h, 0);
      const totalB = (b.hits || []).reduce((sum, h) => sum + h, 0);
      return totalB - totalA;
    });

    const maxTotal = (sortedByTotal[0]?.hits || []).reduce((sum, h) => sum + h, 0);
    const championWinners = maxTotal > 0 ? sortedByTotal.filter(b => (b.hits || []).reduce((sum, h) => sum + h, 0) === maxTotal).map(b => b.id) : [];

    // Vice is the second highest score
    const distinctScores = Array.from(new Set(sortedByTotal.map(b => (b.hits || []).reduce((sum, h) => sum + h, 0)))).sort((a, b) => b - a);
    const viceScore = distinctScores.length > 1 ? distinctScores[1] : -1;
    const viceWinners = viceScore > 0 ? sortedByTotal.filter(b => (b.hits || []).reduce((sum, h) => sum + h, 0) === viceScore).map(b => b.id) : [];

    const draws10 = [
      bets.filter(b => (b.hits?.[0] || 0) >= 10).map(b => b.id),
      bets.filter(b => (b.hits?.[1] || 0) >= 10).map(b => b.id),
      bets.filter(b => (b.hits?.[2] || 0) >= 10).map(b => b.id),
    ];

    const total27 = bets.filter(b => (b.hits || []).reduce((sum, h) => sum + h, 0) >= 27).map(b => b.id);

    return { rapidinha: rapidinhaWinners, champion: championWinners, vice: viceWinners, draws10, total27 };
  }, [bets]);

  const filteredBets = useMemo(() => {
    return bets.filter(b => 
      b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.betName || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      const totalA = (a.hits || []).reduce((sum, h) => sum + h, 0);
      const totalB = (b.hits || []).reduce((sum, h) => sum + h, 0);
      return totalB - totalA;
    });
  }, [bets, searchTerm]);

  const handleShare = () => {
    const url = `${window.location.origin}/?view=participants`;
    navigator.clipboard.writeText(url);
    alert('Link público copiado!');
  };

  return (
    <div className="mobile-p lg:p-10 space-y-6 sm:space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-4xl font-display tracking-widest text-slate-900">
              CLASSIFICAÇÃO <span className="text-lotofacil-purple uppercase">AO VIVO</span>
            </h1>
            <button 
              onClick={handleShare}
              className="p-2 bg-white hover:bg-slate-50 rounded-xl text-lotofacil-purple transition-all border border-slate-200 shadow-sm"
            >
              <Share2 size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              Concurso {contest ? `#${contest.number}` : '...'}
            </span>
            <span className="px-2 py-0.5 bg-lotofacil-purple/10 border border-lotofacil-purple/20 rounded-full text-[9px] font-bold text-lotofacil-purple uppercase tracking-widest">
              {bets.length} Apostas
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar participante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs w-full sm:w-64 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Prize Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PrizeCard 
          title="Rapidinha (1º Sorteio)" 
          value={prizes.rapidinha} 
          winnersCount={winners.rapidinha.length} 
          icon={<TrendingUp size={16} />}
          color="bg-blue-600"
        />
        <PrizeCard 
          title="1º Lugar (Campeão)" 
          value={prizes.champion} 
          winnersCount={winners.champion.length} 
          icon={<Trophy size={16} />}
          color="bg-lotofacil-purple"
        />
        <PrizeCard 
          title="2º Lugar (Vice)" 
          value={prizes.vice} 
          winnersCount={winners.vice.length} 
          icon={<Medal size={16} />}
          color="bg-slate-600"
        />
      </div>

      {/* Fixed Prizes Info */}
      <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-lotofacil-yellow rounded-xl flex items-center justify-center shadow-lg rotate-3">
            <DollarSign size={24} className="text-slate-900" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Prêmio Especial Acumulado</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">27+ PONTOS: <span className="text-lotofacil-yellow">R$ 5.000,00</span></h3>
          </div>
        </div>
        <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-700 pt-4 sm:pt-0 sm:pl-6">
          <div className="text-center sm:text-left">
            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mb-1">Prêmio por Sorteio</p>
            <p className="text-sm font-bold text-white">10 PTS: <span className="text-lotofacil-yellow">R$ 500,00</span></p>
          </div>
          <div className="w-px h-8 bg-slate-700 hidden sm:block" />
          <div className="text-center sm:text-left">
            <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mb-1">Participantes</p>
            <p className="text-sm font-bold text-white">{bets.length} <span className="text-[10px] text-slate-500">ATIVOS</span></p>
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="glass-card overflow-hidden border-slate-200 shadow-xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-20">Pos</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold">Participante</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center">Números</th>
                <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-16">S1</th>
                <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-16">S2</th>
                <th className="px-4 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-16">S3</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-lotofacil-purple/20 border-t-lotofacil-purple rounded-full animate-spin" />
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black">Sincronizando Ranking...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Trophy size={48} className="text-slate-900" />
                      <p className="text-slate-900 text-[10px] uppercase tracking-widest font-black">Nenhuma aposta encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBets.map((b, idx) => {
                const hits = b.hits || [0, 0, 0];
                const total = hits.reduce((sum, h) => sum + h, 0);
                const isCurrentUser = b.userId === user?.uid;
                const isRapidinha = winners.rapidinha.includes(b.id);
                const isChampion = winners.champion.includes(b.id);
                const isVice = winners.vice.includes(b.id);
                const is27Plus = total >= 27;
                
                return (
                  <motion.tr 
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                    className={cn(
                      "transition-all group",
                      isCurrentUser ? "bg-lotofacil-purple/5" : "hover:bg-slate-50",
                      idx === 0 && "bg-gradient-to-r from-lotofacil-yellow/5 to-transparent"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-display text-xs shadow-sm",
                          idx === 0 ? "bg-lotofacil-yellow text-white" :
                          idx === 1 ? "bg-slate-300 text-white" :
                          idx === 2 ? "bg-lotofacil-purple text-white" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        )}>
                          {idx + 1}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{b.betName || b.userName}</span>
                          {isCurrentUser && (
                            <span className="bg-lotofacil-purple text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Você</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {isRapidinha && <WinnerBadge label="Rapidinha" color="bg-blue-600" />}
                          {isChampion && <WinnerBadge label="Campeão" color="bg-lotofacil-purple" />}
                          {isVice && <WinnerBadge label="Vice" color="bg-slate-600" />}
                          {is27Plus && <WinnerBadge label="27+ Pontos" color="bg-slate-900" />}
                          {hits.some((h, i) => h >= 10) && <WinnerBadge label="10 Pts" color="bg-lotofacil-yellow" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {b.numbers.map(num => (
                          <div key={num} className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {num.toString().padStart(2, '0')}
                          </div>
                        ))}
                      </div>
                    </td>
                    <DrawScore score={hits[0]} isWinner={hits[0] >= 10} />
                    <DrawScore score={hits[1]} isWinner={hits[1] >= 10} />
                    <DrawScore score={hits[2]} isWinner={hits[2] >= 10} />
                    <td className="px-6 py-4 text-center">
                      <div className={cn(
                        "inline-flex flex-col items-center justify-center w-12 h-12 rounded-xl border transition-all shadow-sm",
                        total >= 27 ? "bg-slate-900 border-slate-900 shadow-lg scale-110" :
                        idx < 3 ? "bg-white border-lotofacil-yellow/30" : "bg-slate-50 border-slate-200"
                      )}>
                        <span className={cn(
                          "text-lg font-display tracking-tighter leading-none",
                          total >= 27 ? "text-white" : "text-lotofacil-purple"
                        )}>
                          {total.toString().padStart(2, '0')}
                        </span>
                        <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 mt-0.5">PTS</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Info size={20} className="text-blue-600" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-blue-900 uppercase tracking-widest">Regras de Premiação</p>
          <p className="text-[10px] text-blue-700 leading-relaxed">
            Os prêmios de porcentagem (Rapidinha, Campeão e Vice) são calculados sobre o total arrecadado. 
            Em caso de empate, o prêmio é dividido igualmente entre os ganhadores daquela categoria. 
            Prêmios fixos (10 PTS e 27+ PTS) são garantidos para cada aposta que atingir a pontuação.
          </p>
        </div>
      </div>
    </div>
  );
};

const PrizeCard = ({ title, value, winnersCount, icon, color }: { title: string, value: number, winnersCount: number, icon: React.ReactNode, color: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden group">
    <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-110", color)} />
    <div className="flex items-center justify-between">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", color)}>
        {icon}
      </div>
      <div className="text-right">
        <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Estimativa</p>
        <p className="text-lg font-black text-slate-900">
          {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{title}</p>
      <p className="text-[9px] text-slate-400 mt-1">
        {winnersCount > 0 ? `${winnersCount} ganhador(es) no momento` : 'Aguardando resultados'}
      </p>
    </div>
  </div>
);

const WinnerBadge = ({ label, color }: { label: string, color: string }) => (
  <span className={cn("text-[7px] font-black text-white px-1.5 py-0.5 rounded shadow-sm uppercase tracking-tighter", color)}>
    {label}
  </span>
);

const DrawScore = ({ score, isWinner }: { score: number, isWinner: boolean }) => (
  <td className="px-4 py-4 text-center">
    <div className="flex flex-col items-center gap-1">
      <span className={cn(
        "text-sm font-bold font-mono",
        isWinner ? "text-lotofacil-yellow" : score >= 9 ? "text-lotofacil-purple" : "text-slate-400"
      )}>
        {score.toString().padStart(2, '0')}
      </span>
      {isWinner && <div className="w-1 h-1 rounded-full bg-lotofacil-yellow animate-ping" />}
    </div>
  </td>
);

export default Participants;
