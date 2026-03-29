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
  
  const prizes = {
    rapidinha: totalRevenue * 0.10,
    campeao: totalRevenue * 0.45,
    vice: totalRevenue * 0.15,
    fixed10Pts: 500,
    fixed27Plus: 5000
  };

  // Process ranking data
  // Group by betName + sellerCode to get the best bet for each participant
  const participantData: { [key: string]: { 
    id: string,
    userName: string, 
    sellerCode: string, 
    hits: number[], 
    totalHits: number,
    bets: Bet[]
  } } = {};

  bets.forEach(bet => {
    const betName = (bet.betName || bet.userName || 'Participante').trim().toUpperCase();
    const sellerCode = (bet.sellerCode || '').trim().toUpperCase();
    const key = `${betName}_${sellerCode}`;
    const hits = bet.hits || [0, 0, 0];
    const totalHits = hits.reduce((a, b) => a + b, 0);

    if (!participantData[key] || totalHits > participantData[key].totalHits) {
      participantData[key] = {
        id: key,
        userName: betName,
        sellerCode: sellerCode,
        hits: hits,
        totalHits: totalHits,
        bets: [bet]
      };
    } else if (totalHits === participantData[key].totalHits) {
      participantData[key].bets.push(bet);
    }
  });

  const sortedRanking = Object.values(participantData).sort((a, b) => b.totalHits - a.totalHits);

  // Find winners/leaders
  const rapidinhaLeader = [...Object.values(participantData)].sort((a, b) => b.hits[0] - a.hits[0])[0];
  const champion = sortedRanking[0];
  const vice = sortedRanking[1];

  const winners10Pts = [
    Object.values(participantData).filter(p => p.hits[0] >= 10),
    Object.values(participantData).filter(p => p.hits[1] >= 10),
    Object.values(participantData).filter(p => p.hits[2] >= 10)
  ];

  const winners27Plus = Object.values(participantData).filter(p => p.totalHits >= 27);

  const filteredRanking = sortedRanking.filter(p => 
    p.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sellerCode.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-xl sm:text-4xl font-display tracking-widest text-slate-900 uppercase">
            CLASSIFICAÇÃO <span className="text-lotofacil-purple">AO VIVO</span>
          </h1>
          <p className="text-[10px] sm:text-sm text-slate-600 mt-1">
            Concurso #{activeContest.number} • {bets.length} Apostas Validadas
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 bg-lotofacil-purple/5 border-lotofacil-purple/20">
            <p className="text-[8px] uppercase tracking-widest text-slate-500">Arrecadação Total</p>
            <p className="text-sm sm:text-xl font-bold text-lotofacil-purple">
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>

      {/* Prize Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <PrizeCard 
          title="Rapidinha (1º Sorteio)" 
          value={prizes.rapidinha} 
          leader={rapidinhaLeader?.userName}
          icon={Zap}
          color="text-yellow-500"
          bg="bg-yellow-50"
          border="border-yellow-100"
        />
        <PrizeCard 
          title="Campeão (Geral)" 
          value={prizes.campeao} 
          leader={champion?.userName}
          icon={Crown}
          color="text-lotofacil-purple"
          bg="bg-lotofacil-purple/5"
          border="border-lotofacil-purple/10"
        />
        <PrizeCard 
          title="Vice-Campeão" 
          value={prizes.vice} 
          leader={vice?.userName}
          icon={Award}
          color="text-blue-500"
          bg="bg-blue-50"
          border="border-blue-100"
        />
        <PrizeCard 
          title="Prêmio Especial 27+" 
          value={prizes.fixed27Plus} 
          count={winners27Plus.length}
          icon={Star}
          color="text-lotofacil-yellow"
          bg="bg-lotofacil-yellow/5"
          border="border-lotofacil-yellow/10"
        />
      </div>

      {/* Fixed Prizes Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
        {[1, 2, 3].map(num => (
          <div key={num} className="glass-card p-3 flex items-center justify-between border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Target size={16} />
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-widest text-slate-500">{num}º Sorteio (10 PTS)</p>
                <p className="text-xs font-bold text-slate-900">R$ 500,00</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] uppercase tracking-widest text-slate-400">Ganhadores</p>
              <p className="text-xs font-bold text-lotofacil-purple">{winners10Pts[num-1].length}</p>
            </div>
          </div>
        ))}
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">Pos</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">Participante</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500 text-center">1º Sort</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500 text-center">2º Sort</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500 text-center">3º Sort</th>
                <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-lotofacil-purple text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRanking.map((p, idx) => (
                <tr key={p.id} className={cn(
                  "hover:bg-slate-50/50 transition-all",
                  idx === 0 && "bg-lotofacil-purple/[0.02]"
                )}>
                  <td className="px-4 py-4">
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold",
                      idx === 0 ? "bg-lotofacil-yellow text-white" : 
                      idx === 1 ? "bg-slate-300 text-slate-700" :
                      idx === 2 ? "bg-amber-600/20 text-amber-700" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {idx + 1}º
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs font-bold text-slate-900 uppercase">{p.userName}</p>
                    <p className="text-[8px] text-lotofacil-yellow uppercase tracking-widest font-bold">Vendedor: {p.sellerCode}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-md",
                      p.hits[0] >= 10 ? "bg-green-100 text-green-700" : "text-slate-600"
                    )}>
                      {p.hits[0]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-md",
                      p.hits[1] >= 10 ? "bg-green-100 text-green-700" : "text-slate-600"
                    )}>
                      {p.hits[1]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-md",
                      p.hits[2] >= 10 ? "bg-green-100 text-green-700" : "text-slate-600"
                    )}>
                      {p.hits[2]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-sm font-black",
                        p.totalHits >= 27 ? "text-lotofacil-yellow" : "text-lotofacil-purple"
                      )}>
                        {p.totalHits}
                      </span>
                      {p.totalHits >= 27 && (
                        <span className="text-[7px] font-bold bg-lotofacil-yellow text-white px-1 rounded">PREMIADO</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
            Os prêmios de porcentagem (Rapidinha, Campeão e Vice) são calculados sobre o valor total arrecadado. 
            Prêmios fixos (10 pts e 27+ pts) são garantidos. Em caso de empate, os prêmios são divididos igualmente entre os ganhadores.
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
}

const PrizeCard: React.FC<PrizeCardProps> = ({ title, value, leader, count, icon: Icon, color, bg, border }) => (
  <div className={cn("glass-card p-3 sm:p-4 border", border)}>
    <div className="flex items-center justify-between mb-2 sm:mb-3">
      <div className={cn("w-7 h-7 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center", bg)}>
        <Icon className={color} size={16} />
      </div>
      <div className="text-right">
        <p className="text-[7px] sm:text-[9px] uppercase tracking-widest text-slate-500">{title}</p>
        <p className={cn("text-xs sm:text-lg font-black", color)}>
          {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>
    </div>
    <div className="pt-2 border-t border-slate-100">
      {leader ? (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-700 truncate uppercase">{leader}</p>
        </div>
      ) : count !== undefined ? (
        <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {count} Ganhadores
        </p>
      ) : (
        <p className="text-[8px] sm:text-[10px] text-slate-400 italic">Calculando...</p>
      )}
    </div>
  </div>
);

export default LiveRanking;
