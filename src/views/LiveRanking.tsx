/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  Search,
  Zap,
  Award,
  Star,
  Target,
  Crown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Bet, Contest } from '../types';

const LiveRanking: React.FC = () => {
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDraw, setSelectedDraw] = useState(0);

  useEffect(() => {
    let unsubscribeContest: (() => void) | undefined;
    let unsubscribeBets: (() => void) | undefined;

    const init = async () => {
      unsubscribeContest = firebaseService.subscribeToActiveContest((contest) => {
        setActiveContest(contest);
        if (contest) {
          if (unsubscribeBets) unsubscribeBets();
          unsubscribeBets = firebaseService.subscribeToContestBets(contest.id, (contestBets) => {
            setBets(contestBets);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      });
    };

    init();

    return () => {
      if (unsubscribeContest) unsubscribeContest();
      if (unsubscribeBets) unsubscribeBets();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-lotofacil-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeContest) {
    return (
      <div className="p-10 text-center glass-card">
        <Trophy className="mx-auto text-slate-300 mb-4" size={48} />
        <h2 className="text-xl font-display tracking-widest text-slate-900 uppercase">Nenhum Concurso Ativo</h2>
        <p className="text-slate-500 mt-2">Aguarde o início do próximo concurso.</p>
      </div>
    );
  }

  // Calculate stats
  const betPrice = activeContest.betPrice || 10;
  const totalRevenue = bets.length * betPrice;
  
  const prizeConfig = activeContest.prizeConfig || {
    pctRapidinha: 0.10,
    pctChampion: 0.45,
    pctVice: 0.15
  };

  const prizes = {
    rapidinha: totalRevenue * (prizeConfig.pctRapidinha || 0.10),
    campeao: totalRevenue * (prizeConfig.pctChampion || 0.45),
    vice: totalRevenue * (prizeConfig.pctVice || 0.15),
    fixed10Pts: 500,
    fixed27Plus: 5000
  };

  // Process ranking data - Show all bets individually (No grouping in Live Ranking)
  const sortedRanking = [...bets].sort((a, b) => {
    const totalA = (a.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0);
    const totalB = (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0);
    return totalB - totalA;
  });

  // Calculate ranks with ties (Dense Ranking: 1, 1, 2, 3...)
  let currentRank = 0;
  let lastPoints = -1;
  const rankingWithRanks = sortedRanking.map((bet) => {
    const totalHits = (bet.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0);
    if (totalHits !== lastPoints) {
      currentRank++;
      lastPoints = totalHits;
    }
    return { ...bet, rank: currentRank, totalHits };
  });

  // Identify prize thresholds
  const maxTotalHits = rankingWithRanks.length > 0 ? rankingWithRanks[0].totalHits : 0;
  const secondMaxTotalHits = rankingWithRanks.find(b => b.totalHits < maxTotalHits)?.totalHits || 0;
  const maxS1Hits = bets.length > 0 ? Math.max(...bets.map(b => b.hits?.[0] || 0)) : 0;

  // Find winners/leaders based on all bets
  const rapidinhaLeader = [...bets].sort((a, b) => (b.hits?.[0] || 0) - (a.hits?.[0] || 0))[0];
  const champion = sortedRanking[0];
  const vice = sortedRanking[1];

  const winners10Pts = [
    bets.filter(b => (b.hits?.[0] || 0) >= 10),
    bets.filter(b => (b.hits?.[1] || 0) >= 10),
    bets.filter(b => (b.hits?.[2] || 0) >= 10)
  ];

  const winners27Plus = bets.filter(b => (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0) >= 27);

  const filteredRanking = rankingWithRanks.filter(b => 
    (b.betName || b.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.sellerCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mobile-p mobile-gap flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Ao Vivo</span>
          </div>
          <h1 className="text-lg sm:text-4xl font-display tracking-widest text-slate-900 uppercase">
            CLASSIFICAÇÃO <span className="text-lotofacil-purple">AO VIVO</span>
          </h1>
          <p className="text-[10px] sm:text-sm text-slate-600 mt-1">
            Concurso #{activeContest.number} • {bets.length} Apostas Validadas
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="glass-card px-3 py-1.5 bg-lotofacil-purple/5 border-lotofacil-purple/20">
            <p className="text-[7px] uppercase tracking-widest text-slate-500">Arrecadação Total</p>
            <p className="text-xs sm:text-xl font-bold text-lotofacil-purple">
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>

      {/* 10 PTS Prizes Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[1, 2, 3].map(num => (
          <PrizeCard 
            key={num}
            title={`${num}º SORTEIO 10 PTS`} 
            value={prizes.fixed10Pts} 
            count={winners10Pts[num-1].length}
            icon={Target}
            color="text-orange-600"
            bg="bg-orange-50"
            border="border-orange-200"
            compact
          />
        ))}
      </div>

      {/* Main Prizes Row (Rapidinha, 1st, 2nd) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <PrizeCard 
          title="RAPIDINHA" 
          value={prizes.rapidinha} 
          leader={rapidinhaLeader?.userName}
          icon={Zap}
          color="text-yellow-500"
          bg="bg-yellow-50"
          border="border-yellow-100"
          compact
        />
        <PrizeCard 
          title="1º LUGAR" 
          value={prizes.campeao} 
          leader={champion?.userName}
          icon={Crown}
          color="text-lotofacil-purple"
          bg="bg-lotofacil-purple/5"
          border="border-lotofacil-purple/10"
          compact
        />
        <PrizeCard 
          title="2º LUGAR" 
          value={prizes.vice} 
          leader={vice?.userName}
          icon={Award}
          color="text-blue-500"
          bg="bg-blue-50"
          border="border-blue-100"
          compact
        />
      </div>

      {/* Special Prize (Maintain as is but separate) */}
      <div className="w-full">
        <PrizeCard 
          title="PRÊMIO ESPECIAL ACUMULADO" 
          value={prizes.fixed27Plus} 
          count={winners27Plus.length}
          icon={Star}
          color="text-lotofacil-yellow"
          bg="bg-lotofacil-yellow/10"
          border="border-lotofacil-yellow/20"
          fullWidth
        />
      </div>

      {/* Search and Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm sm:text-lg font-display tracking-widest text-slate-900 uppercase">RANKING DO <span className="text-lotofacil-purple">CONCURSO</span></h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar participante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-lotofacil-purple/50 transition-all"
            />
          </div>
        </div>

        {/* Zoom Hint for Mobile */}
        <div className="sm:hidden bg-lotofacil-purple/5 px-4 py-2 border-b border-lotofacil-purple/10 flex items-center gap-2">
          <Info className="w-3 h-3 text-lotofacil-purple" />
          <p className="text-[9px] text-slate-600 font-medium">
            Dica: Use o gesto de pinça (zoom) para ajustar a visualização se necessário.
          </p>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          {/* Draw Results Display */}
          <div className="px-4 py-3 bg-slate-900 text-white flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-widest text-lotofacil-yellow">
                Números Sorteados - {selectedDraw + 1}º Sorteio
              </p>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    onClick={() => setSelectedDraw(i)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-bold transition-all",
                      selectedDraw === i ? "bg-lotofacil-yellow text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    S{i + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-10 gap-1 w-fit">
              {activeContest.draws[selectedDraw]?.results?.length > 0 ? (
                activeContest.draws[selectedDraw].results.sort((a, b) => a - b).map(num => (
                  <span key={num} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-lotofacil-yellow text-slate-900 flex items-center justify-center text-[8px] sm:text-[9px] font-black shadow-[0_0_6px_rgba(255,191,0,0.3)]">
                    {num.toString().padStart(2, '0')}
                  </span>
                ))
              ) : (
                <p className="col-span-10 text-[10px] text-slate-400 italic">Aguardando sorteio...</p>
              )}
            </div>
          </div>

          <table className="w-full text-left border-collapse min-w-full sm:min-w-[800px] compact-table">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-0.5 py-3 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-slate-500 w-6 sm:w-10 text-center shrink-0">Pos</th>
                <th className="px-1 py-3 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-slate-500">Participante</th>
                <th className="px-2 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500 text-center hidden sm:table-cell">Números da Aposta</th>
                {[1, 2, 3].map((num, i) => (
                  <th 
                    key={num} 
                    onClick={() => setSelectedDraw(i)}
                    className={cn(
                      "px-0.5 py-3 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-center w-6 sm:w-16 cursor-pointer transition-all shrink-0",
                      selectedDraw === i ? "bg-lotofacil-purple text-white" : 
                      i === 0 ? "bg-blue-50/50 text-blue-600" :
                      i === 1 ? "bg-green-50/50 text-green-600" :
                      "bg-purple-50/50 text-purple-600"
                    )}
                  >
                    S{num}
                  </th>
                ))}
                <th className="px-0.5 py-3 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-lotofacil-purple text-center w-8 sm:w-20 shrink-0">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRanking.map((b: any) => {
                const currentDrawResults = activeContest.draws[selectedDraw]?.results || [];
                const hits = b.hits || [0, 0, 0];
                const totalHits = b.totalHits;
                
                // Prize Logic
                const isChampion = totalHits === maxTotalHits && maxTotalHits > 0;
                const isVice = totalHits === secondMaxTotalHits && secondMaxTotalHits > 0;
                const isRapidinha = hits[0] === maxS1Hits && maxS1Hits > 0;
                const has10Pts = hits[0] >= 10 || hits[1] >= 10 || hits[2] >= 10;
                const has27Plus = totalHits >= 27;

                const prizeNames = [];
                if (isChampion) prizeNames.push('1º LUGAR');
                if (isVice) prizeNames.push('2º LUGAR');
                if (isRapidinha) prizeNames.push('RAPIDINHA');
                if (has10Pts) prizeNames.push('10 PONTOS');
                if (has27Plus) prizeNames.push('27+ PONTOS');

                const isWinner = prizeNames.length > 0;
                
                return (
                  <tr key={b.id} className={cn(
                    "hover:bg-slate-50/50 transition-all",
                    isChampion ? "bg-lotofacil-purple/10" : 
                    isVice ? "bg-blue-100/40" :
                    isRapidinha ? "bg-yellow-100/40" :
                    isWinner ? "bg-orange-100/30" : ""
                  )}>
                    <td className="px-0.5 py-3">
                      <div className="relative w-fit mx-auto">
                        <div className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-bold",
                          b.rank === 1 ? "bg-lotofacil-yellow text-white" : 
                          b.rank === 2 ? "bg-slate-300 text-slate-700" :
                          b.rank === 3 ? "bg-amber-600/20 text-amber-700" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {b.rank}º
                        </div>
                      </div>
                    </td>
                    <td className="px-1 py-3">
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] sm:text-xs font-bold text-slate-900 uppercase truncate max-w-[100px] sm:max-w-none leading-tight">
                          {b.betName || b.userName}
                        </p>
                        {b.rank === 1 && <Crown size={10} className="text-lotofacil-yellow shrink-0" />}
                      </div>
                      
                      {/* Prize Labels */}
                      {isWinner && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {prizeNames.map(name => (
                            <span key={name} className={cn(
                              "text-[6px] sm:text-[7px] font-black px-1 rounded-[2px] uppercase tracking-tighter",
                              name === '1º LUGAR' ? "bg-lotofacil-purple text-white" :
                              name === '2º LUGAR' ? "bg-blue-500 text-white" :
                              name === 'RAPIDINHA' ? "bg-yellow-500 text-slate-900" :
                              name === '10 PONTOS' ? "bg-orange-500 text-white" :
                              "bg-lotofacil-yellow text-slate-900"
                            )}>
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Numbers Display - Extreme Compact for Mobile */}
                      <div className="flex flex-nowrap gap-1 mt-1 sm:hidden">
                        {b.numbers.map(num => {
                          const isHit = currentDrawResults.includes(num);
                          return (
                            <span 
                              key={num} 
                              className={cn(
                                "text-[8px] font-bold px-1 rounded-[2px] border transition-all shrink-0",
                                isHit 
                                  ? "bg-lotofacil-yellow text-white border-lotofacil-yellow shadow-[0_0_4px_rgba(255,191,0,0.4)] z-10" 
                                  : "text-lotofacil-purple bg-lotofacil-purple/5 border-lotofacil-purple/10 opacity-40"
                              )}
                            >
                              {num.toString().padStart(2, '0')}
                            </span>
                          );
                        })}
                      </div>

                      <p className="text-[7px] sm:text-[8px] text-lotofacil-yellow uppercase tracking-widest font-bold mt-0.5">Vendedor: {b.sellerCode}</p>
                    </td>
                    <td className="px-2 py-3 hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {b.numbers.map(num => {
                          const isHit = currentDrawResults.includes(num);
                          return (
                            <div 
                              key={num} 
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all",
                                isHit 
                                  ? "bg-lotofacil-yellow border-lotofacil-yellow text-slate-900 shadow-sm scale-110 z-10" 
                                  : "bg-slate-50 border-slate-200 text-slate-400"
                              )}
                            >
                              {num.toString().padStart(2, '0')}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className={cn(
                      "px-0.5 py-3 text-center transition-all",
                      selectedDraw === 0 ? "bg-lotofacil-purple/10" : "bg-blue-50/30"
                    )}>
                      <span className={cn(
                        "text-[10px] sm:text-xs font-bold px-0.5 py-0.5 rounded-md",
                        hits[0] >= 10 ? "bg-green-100 text-green-700" : "text-blue-700"
                      )}>
                        {hits[0]}
                      </span>
                    </td>
                    <td className={cn(
                      "px-0.5 py-3 text-center transition-all",
                      selectedDraw === 1 ? "bg-lotofacil-purple/10" : "bg-green-50/30"
                    )}>
                      <span className={cn(
                        "text-[10px] sm:text-xs font-bold px-0.5 py-0.5 rounded-md",
                        hits[1] >= 10 ? "bg-green-100 text-green-700" : "text-green-700"
                      )}>
                        {hits[1]}
                      </span>
                    </td>
                    <td className={cn(
                      "px-0.5 py-3 text-center transition-all",
                      selectedDraw === 2 ? "bg-lotofacil-purple/10" : "bg-purple-50/30"
                    )}>
                      <span className={cn(
                        "text-[10px] sm:text-xs font-bold px-0.5 py-0.5 rounded-md",
                        hits[2] >= 10 ? "bg-green-100 text-green-700" : "text-purple-700"
                      )}>
                        {hits[2]}
                      </span>
                    </td>
                    <td className="px-0.5 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-xs sm:text-sm font-black",
                          totalHits >= 27 ? "text-lotofacil-yellow" : "text-lotofacil-purple"
                        )}>
                          {totalHits}
                        </span>
                        {totalHits >= 27 && (
                          <span className="text-[6px] font-bold bg-lotofacil-yellow text-white px-1 rounded">PREMIADO</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Footer */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-start gap-3">
        <Info className="text-lotofacil-yellow shrink-0" size={18} />
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest">Informações sobre Premiações</p>
          <p className="text-[9px] text-slate-400 leading-relaxed">
            Prêmios fixos (10 PTS nos Sorteios S1/S2/S3 e 27+ PTS) são garantidos. Em caso de empate, os prêmios são divididos igualmente entre os ganhadores. 
            A classificação é atualizada em tempo real conforme os resultados são inseridos.
          </p>
        </div>
      </div>
    </div>
  );
};

interface PrizeCardProps {
  title: string;
  value: number;
  leader?: string;
  count?: number;
  icon: any;
  color: string;
  bg: string;
  border: string;
  compact?: boolean;
  fullWidth?: boolean;
}

const PrizeCard: React.FC<PrizeCardProps> = ({ 
  title, value, leader, count, icon: Icon, color, bg, border, compact, fullWidth 
}) => (
  <div className={cn(
    "glass-card border transition-all relative overflow-hidden",
    compact ? "p-2 sm:p-3" : "p-4 sm:p-6",
    border,
    fullWidth && "bg-slate-900 text-white border-slate-800"
  )}>
    <div className="flex items-start gap-3 sm:gap-6 relative z-10">
      <div className={cn(
        "rounded-xl flex items-center justify-center shrink-0 shadow-sm",
        compact ? "w-8 h-8 sm:w-12 sm:h-12" : "w-14 h-14 sm:w-20 sm:h-20",
        bg
      )}>
        <Icon className={color} size={compact ? 14 : 28} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <p className={cn(
            "uppercase tracking-widest text-slate-400 font-bold text-right",
            compact ? "text-[6px] sm:text-[8px]" : "text-[7px] sm:text-[10px]"
          )}>
            Estimativa
          </p>
          <p className={cn(
            "font-black tracking-tight text-right",
            compact ? "text-[10px] sm:text-xl" : "text-lg sm:text-3xl",
            fullWidth ? "text-lotofacil-yellow" : color
          )}>
            {fullWidth && <span className="text-white mr-2">27+ PONTOS:</span>}
            {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        
        <div className={cn(
          "mt-1 sm:mt-3",
          compact ? "space-y-0.5" : "space-y-1"
        )}>
          <p className={cn(
            "font-bold uppercase tracking-widest truncate",
            compact ? "text-[6px] sm:text-[10px]" : "text-[9px] sm:text-xs",
            fullWidth ? "text-slate-300" : "text-slate-900"
          )}>
            {title}
          </p>
          
          {leader ? (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-green-500 shrink-0" />
              <p className={cn(
                "font-medium truncate uppercase",
                compact ? "text-[5px] sm:text-[8px]" : "text-[7px] sm:text-[10px]",
                fullWidth ? "text-slate-400" : "text-slate-500"
              )}>{leader} no momento</p>
            </div>
          ) : count !== undefined ? (
            <p className={cn(
              "font-medium uppercase tracking-widest truncate",
              compact ? "text-[5px] sm:text-[8px]" : "text-[7px] sm:text-[10px]",
              fullWidth ? "text-slate-400" : "text-slate-500"
            )}>
              {count} ganhador(es) no momento
            </p>
          ) : (
            <p className={cn(
              "italic truncate",
              compact ? "text-[5px] sm:text-[8px]" : "text-[7px] sm:text-[10px]",
              fullWidth ? "text-slate-500" : "text-slate-400"
            )}>Calculando...</p>
          )}
        </div>
      </div>
    </div>

    {/* Background Glow for fullWidth */}
    {fullWidth && (
      <div className="absolute top-0 right-0 w-32 h-32 bg-lotofacil-yellow/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
    )}
  </div>
);

export default LiveRanking;
