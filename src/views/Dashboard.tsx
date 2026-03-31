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
  Clock,
  ExternalLink
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', whatsapp: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({ name: user.name || '', whatsapp: user.whatsapp || '' });
    }
  }, [user]);

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await firebaseService.updateUserProfile(user.uid, profileData);
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSavingProfile(false);
    }
  };

  const userRank = ranking.find(r => r.userId === user?.uid);
  const totalBets = userBets.length;
  const validatedBets = userBets.filter(b => b.status === 'validado').length;

  // Calculate best bet score in current contest
  const currentContestBets = userBets.filter(b => b.contestId === activeContest?.id && b.status === 'validado');
  const bestContestScore = currentContestBets.length > 0 
    ? Math.max(...currentContestBets.map(b => (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0)))
    : 0;

  const stats = [
    { label: 'Pontos Totais', value: user?.totalPoints || 0, icon: Trophy, color: 'text-lotofacil-purple', bg: 'bg-lotofacil-purple/10' },
    { label: 'Melhor no Concurso', value: bestContestScore, icon: TrendingUp, color: 'text-lotofacil-yellow', bg: 'bg-lotofacil-yellow/10' },
    { label: 'Minhas Apostas', value: totalBets, icon: Ticket, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
    { label: 'Sua Posição', value: userRank ? `#${userRank.position}º` : '...', icon: Users, color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
  ];

  return (
    <div className="mobile-p mobile-gap flex flex-col">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-3xl lg:text-4xl font-display tracking-widest text-slate-900 uppercase">
            OLÁ, <span className="text-lotofacil-purple">{user?.name}</span>, <span className="text-slate-500">{user?.whatsapp || user?.email}</span>
          </h1>
          <p className="text-[10px] sm:text-sm text-slate-500 mt-0.5 sm:mt-2">Bem-vindo ao seu painel de controle do Bolão Lotofácil.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-card px-3 py-1.5 sm:px-6 sm:py-3 flex items-center gap-2 sm:gap-3">
            <div className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse", 
              activeContest?.status === 'aberto' ? "bg-lotofacil-purple" : 
              activeContest?.status === 'em_andamento' ? "bg-accent-blue" :
              "bg-slate-200"
            )} />
            <span className="text-[8px] sm:text-sm font-medium text-slate-600 uppercase tracking-widest">
              {activeContest ? (
                activeContest.status === 'aberto' ? `Concurso #${activeContest.number} Aberto` :
                activeContest.status === 'em_andamento' ? `Concurso #${activeContest.number} Em Andamento` :
                `Concurso #${activeContest.number} Encerrado`
              ) : 'Nenhum Concurso Ativo'}
            </span>
          </div>
          {activeContest?.publicLink && (
            <a 
              href={activeContest.publicLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-card px-3 py-1.5 sm:px-6 sm:py-3 flex items-center gap-2 sm:gap-3 text-blue-600 hover:text-blue-700 transition-all"
            >
              <ExternalLink size={14} />
              <span className="text-[8px] sm:text-sm font-bold uppercase tracking-widest">Link do Sorteio</span>
            </a>
          )}
        </div>
      </div>

      {/* Stats Grid - Compact on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card p-2.5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-6 text-center sm:text-left"
          >
            <div className={`w-8 h-8 sm:w-14 sm:h-14 ${stat.bg} rounded-lg sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner`}>
              <stat.icon className={stat.color} size={16} />
            </div>
            <div>
              <p className="text-[7px] sm:text-xs uppercase tracking-widest text-slate-600 mb-0.5 sm:mb-1">{stat.label}</p>
              <h3 className="text-base sm:text-2xl font-bold text-slate-900">
                {stat.value}
                {stat.label.includes('Pontos') && <span className="text-[10px] sm:text-xs ml-1 text-slate-400 font-normal">PTS</span>}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Ranking Progress */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-8 space-y-4 sm:space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-2xl font-display tracking-widest text-slate-900">PROGRESSO NA <span className="text-lotofacil-purple uppercase">CORRIDA 150 PTS</span></h2>
            <TrendingUp className="text-lotofacil-purple" size={18} />
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between text-[9px] sm:text-sm uppercase tracking-widest">
              <span className="text-slate-600">Sua Pontuação</span>
              <span className="text-lotofacil-purple font-bold">{user?.totalPoints || 0} / {RANKING_GOAL} PTS</span>
            </div>
            <div className="h-2.5 sm:h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((user?.totalPoints || 0) / RANKING_GOAL) * 100, 100)}%` }}
                className="h-full bg-lotofacil-purple rounded-full shadow-sm"
              />
            </div>
            <p className="text-[9px] text-slate-600 text-center italic">Faltam {Math.max(RANKING_GOAL - (user?.totalPoints || 0), 0)} pontos para alcançar a meta de 150 pts</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2">
            <div className="bg-slate-50 p-2 sm:p-4 rounded-lg sm:rounded-2xl border border-slate-100 text-center sm:text-left">
              <p className="text-[7px] sm:text-[10px] uppercase tracking-widest text-slate-600 mb-0.5 sm:mb-2">Meta</p>
              <p className="text-xs sm:text-lg font-bold text-slate-900">{RANKING_GOAL} PTS</p>
            </div>
            <div className="bg-slate-50 p-2 sm:p-4 rounded-lg sm:rounded-2xl border border-slate-100 text-center sm:text-left">
              <p className="text-[7px] sm:text-[10px] uppercase tracking-widest text-slate-600 mb-0.5 sm:mb-2">Prêmio</p>
              <p className="text-xs sm:text-lg font-bold text-lotofacil-purple">R$ 1K</p>
            </div>
            <div className="bg-slate-50 p-2 sm:p-4 rounded-lg sm:rounded-2xl border border-slate-100 text-center sm:text-left">
              <p className="text-[7px] sm:text-[10px] uppercase tracking-widest text-slate-600 mb-0.5 sm:mb-2">Posição</p>
              <p className="text-xs sm:text-lg font-bold text-accent-blue">{userRank ? `#${userRank.position}º` : '...'}</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          {/* Profile Card */}
          <div className="glass-card p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-lg font-display tracking-widest text-slate-900 uppercase">MEU <span className="text-lotofacil-purple">PERFIL</span></h2>
              <button 
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="text-[10px] uppercase tracking-widest font-bold text-lotofacil-purple hover:underline"
              >
                {isEditingProfile ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            
            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 ml-1">Nome Completo</label>
                  <input 
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-lotofacil-purple/50"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 ml-1">WhatsApp</label>
                  <input 
                    type="text"
                    value={profileData.whatsapp}
                    onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-lotofacil-purple/50"
                    placeholder="Ex: 5511999999999"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={savingProfile}
                  className="w-full bg-lotofacil-purple text-white py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg disabled:opacity-50"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
                </button>
              </form>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-slate-400">Nome</p>
                  <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-slate-400">Contato</p>
                  <p className="text-xs font-bold text-slate-800">{user?.whatsapp || user?.email || 'Não informado'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card p-4 sm:p-8 space-y-4">
            <h2 className="text-base sm:text-2xl font-display tracking-widest text-slate-900">ATIVIDADE <span className="text-accent-purple">RECENTE</span></h2>
            
            <div className="space-y-3 sm:space-y-6">
              {userBets.slice(0, 3).map((bet, idx) => (
                <div key={bet.id} className="flex gap-3 sm:gap-4 items-center">
                  <div className={cn("shrink-0", bet.status === 'validado' ? "text-lotofacil-purple" : bet.status === 'pendente' ? "text-lotofacil-yellow" : "text-accent-red")}>
                    {bet.status === 'validado' ? <CheckCircle2 size={16} /> : bet.status === 'pendente' ? <Clock size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {bet.betName || `Aposta ${bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}`}
                    </p>
                    <p className="text-[9px] sm:text-xs text-slate-600">Concurso #{bet.contestNumber || '...'}</p>
                  </div>
                  <p className="text-[8px] sm:text-[10px] text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                    {new Date(bet.createdAt as any).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {userBets.length === 0 && (
                <p className="text-center text-slate-500 py-4 sm:py-10 text-[10px]">Nenhuma atividade recente.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
