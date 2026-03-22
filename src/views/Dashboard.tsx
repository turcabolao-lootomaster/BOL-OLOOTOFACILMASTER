/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { 
  Trophy, 
  Ticket, 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { RANKING_GOAL, cn } from '../utils';
import { Bet, Contest, UserRanking } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [ranking, setRanking] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchData = async () => {
      if (!user) return;
      
      try {
        const [contest, bets] = await Promise.all([
          firebaseService.getActiveContest(),
          firebaseService.getUserBets(user.uid)
        ]);
        
        setActiveContest(contest);
        setUserBets(bets);
        
        unsubscribe = firebaseService.subscribeToRanking((data) => {
          setRanking(data);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const userRank = ranking.find(r => r.userId === user?.uid);
  const totalBets = userBets.length;
  const validatedBets = userBets.filter(b => b.status === 'validado').length;

  // Calculate best bet score in current contest
  const currentContestBets = userBets.filter(b => b.contestId === activeContest?.id && b.status === 'validado');
  const bestContestScore = currentContestBets.length > 0 
    ? Math.max(...currentContestBets.map(b => (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0)))
    : 0;

  const stats = [
    { label: 'Pontos Totais', value: user?.totalPoints || 0, icon: Trophy, color: 'text-neon-green', bg: 'bg-neon-green/10' },
    { label: 'Melhor no Concurso', value: bestContestScore, icon: TrendingUp, color: 'text-accent-orange', bg: 'bg-accent-orange/10' },
    { label: 'Minhas Apostas', value: totalBets, icon: Ticket, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
    { label: 'Sua Posição', value: userRank ? `#${userRank.position}º` : '...', icon: Users, color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display tracking-widest text-white">OLÁ, <span className="text-neon-green uppercase">{user?.name.split(' ')[0]}</span></h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1 sm:mt-2">Bem-vindo ao seu painel de controle do Bolão Lotofácil.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-card px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", 
              activeContest?.status === 'aberto' ? "bg-neon-green" : 
              activeContest?.status === 'em_andamento' ? "bg-accent-blue" :
              "bg-white/20"
            )} />
            <span className="text-[10px] sm:text-sm font-medium text-white/80 uppercase tracking-widest">
              {activeContest ? (
                activeContest.status === 'aberto' ? `Concurso #${activeContest.number} Aberto` :
                activeContest.status === 'em_andamento' ? `Concurso #${activeContest.number} Em Andamento` :
                `Concurso #${activeContest.number} Encerrado`
              ) : 'Nenhum Concurso Ativo'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-3 sm:p-6 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-6 text-center sm:text-left"
          >
            <div className={`w-10 h-10 sm:w-14 sm:h-14 ${stat.bg} rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0`}>
              <stat.icon className={stat.color} size={20} />
            </div>
            <div>
              <p className="text-[8px] sm:text-xs uppercase tracking-widest text-white/40 mb-0.5 sm:mb-1">{stat.label}</p>
              <h3 className="text-lg sm:text-2xl font-bold text-white">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Ranking Progress */}
        <div className="lg:col-span-2 glass-card p-5 sm:p-8 space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white">PROGRESSO NO <span className="text-neon-green">RANKING GERAL</span></h2>
            <TrendingUp className="text-neon-green" size={20} />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[10px] sm:text-sm uppercase tracking-widest">
              <span className="text-white/40">Sua Pontuação</span>
              <span className="text-neon-green font-bold">{user?.totalPoints || 0} / {RANKING_GOAL} PTS</span>
            </div>
            <div className="h-3 sm:h-4 bg-white/5 rounded-full overflow-hidden p-0.5 sm:p-1 border border-white/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((user?.totalPoints || 0) / RANKING_GOAL) * 100, 100)}%` }}
                className="h-full bg-neon-green rounded-full shadow-[0_0_10px_rgba(0,255,0,0.5)]"
              />
            </div>
            <p className="text-[10px] text-white/30 text-center italic">Faltam {Math.max(RANKING_GOAL - (user?.totalPoints || 0), 0)} pontos para o prêmio especial</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 sm:pt-4">
            <div className="bg-white/5 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 text-center sm:text-left">
              <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-white/30 mb-1 sm:mb-2">Meta</p>
              <p className="text-xs sm:text-lg font-bold text-white">{RANKING_GOAL} PTS</p>
            </div>
            <div className="bg-white/5 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 text-center sm:text-left">
              <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-white/30 mb-1 sm:mb-2">Prêmio</p>
              <p className="text-xs sm:text-lg font-bold text-neon-green">R$ 1K</p>
            </div>
            <div className="bg-white/5 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 text-center sm:text-left">
              <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-white/30 mb-1 sm:mb-2">Posição</p>
              <p className="text-xs sm:text-lg font-bold text-accent-blue">{userRank ? `#${userRank.position}º` : '...'}</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-5 sm:p-8 space-y-4 sm:space-y-6">
          <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white">ATIVIDADE <span className="text-accent-purple">RECENTE</span></h2>
          
          <div className="space-y-4 sm:space-y-6">
            {userBets.slice(0, 3).map((bet, idx) => (
              <div key={bet.id} className="flex gap-3 sm:gap-4">
                <div className={cn("mt-1 shrink-0", bet.status === 'validado' ? "text-neon-green" : bet.status === 'pendente' ? "text-accent-orange" : "text-accent-red")}>
                  {bet.status === 'validado' ? <CheckCircle2 size={18} /> : bet.status === 'pendente' ? <Clock size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {bet.betName || `Aposta ${bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}`}
                  </p>
                  <p className="text-[10px] sm:text-xs text-white/40">Concurso #{bet.contestNumber || '...'}</p>
                  <p className="text-[8px] sm:text-[10px] text-white/20 uppercase tracking-tighter mt-0.5 sm:mt-1">
                    {new Date(bet.createdAt as any).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {userBets.length === 0 && (
              <p className="text-center text-white/20 py-6 sm:py-10 text-xs">Nenhuma atividade recente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
