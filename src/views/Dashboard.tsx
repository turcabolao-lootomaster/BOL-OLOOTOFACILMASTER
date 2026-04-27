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
  const [profileData, setProfileData] = useState({ name: '', whatsapp: '', pixKey: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({ 
        name: user.name || '', 
        whatsapp: user.whatsapp || '',
        pixKey: user.pixKey || ''
      });
    }
  }, [user]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchData = async () => {
      const userId = user?.id || user?.uid;
      if (!userId) return;
      
      try {
        const [contest, bets] = await Promise.all([
          firebaseService.getActiveContest(),
          firebaseService.getUserBets(userId)
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
    const userId = user?.id || user?.uid;
    if (!userId) return;
    
    setSavingProfile(true);
    try {
      // Check if the new name is available
      if (profileData.name !== user?.name) {
        const availability = await firebaseService.checkBetNameAvailability(profileData.name, userId);
        if (!availability.available) {
          alert(availability.message);
          setSavingProfile(false);
          return;
        }
        
        // Reserve the new nick
        await firebaseService.reserveNick(profileData.name, userId);
      }
      
      await firebaseService.updateUserProfile(userId, profileData);
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setSavingProfile(false);
    }
  };

  const userRank = ranking.find(r => r.userId === (user?.id || user?.uid));
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
    <div className={cn(
      "mobile-p mobile-gap flex flex-col min-h-screen transition-colors duration-500",
      user?.role === 'admin' || user?.role === 'master' ? "bg-lotofacil-purple/5" : 
      user?.role === 'vendedor' ? "bg-emerald-500/5" : "bg-dark-bg"
    )}>
      {/* Compact Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/40 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-white/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0",
            user?.role === 'admin' || user?.role === 'master' ? "bg-lotofacil-purple" : 
            user?.role === 'vendedor' ? "bg-emerald-500" : "bg-slate-800"
          )}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight uppercase">
              {user?.role === 'vendedor' ? 'Olá Colaborador ' : 'Olá, '}
              <span className={cn(
                user?.role === 'admin' || user?.role === 'master' ? "text-lotofacil-purple" : 
                user?.role === 'vendedor' ? "text-emerald-600" : "text-lotofacil-purple"
              )}>{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">
              {user?.whatsapp || user?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none glass-card px-3 py-1.5 flex items-center gap-2 border-slate-200/50">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
              activeContest?.status === 'aberto' ? "bg-lotofacil-purple" : 
              activeContest?.status === 'em_andamento' ? "bg-accent-blue" :
              "bg-slate-200"
            )} />
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">
              {activeContest ? `#${activeContest.number} ${activeContest.status.replace('_', ' ')}` : 'Sem Concurso'}
            </span>
          </div>
          <button 
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="glass-card px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
          >
            {isEditingProfile ? 'Fechar' : 'Perfil'}
          </button>
        </div>
      </div>

      {/* Profile Edit Overlay (Compact) */}
      {isEditingProfile && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border-lotofacil-purple/20 bg-white/80"
        >
          <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[8px] uppercase tracking-widest text-slate-500 font-bold ml-1">Nome</label>
              <input 
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full bg-white border border-dark-border/40 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-lotofacil-purple/50"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] uppercase tracking-widest text-slate-500 font-bold ml-1">WhatsApp</label>
              <input 
                type="text"
                value={profileData.whatsapp}
                onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                className="w-full bg-white border border-dark-border/40 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-lotofacil-purple/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] uppercase tracking-widest text-slate-500 font-bold ml-1">Chave PIX</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={profileData.pixKey}
                  onChange={(e) => setProfileData({ ...profileData, pixKey: e.target.value })}
                  className="flex-1 bg-white border border-dark-border/40 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-lotofacil-purple/50"
                />
                <button 
                  type="submit"
                  disabled={savingProfile}
                  className="bg-lotofacil-purple text-white px-4 rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {savingProfile ? '...' : 'Salvar'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card p-2 sm:p-3 flex items-center gap-2 sm:gap-3"
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 ${stat.bg} rounded-lg flex items-center justify-center shrink-0`}>
              <stat.icon className={stat.color} size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[7px] sm:text-[8px] uppercase tracking-widest text-slate-500 truncate">{stat.label}</p>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {stat.value}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Current Draw Section (If available) */}
      {activeContest && activeContest.draws.some(d => d.results.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-3 sm:p-4 bg-slate-900 text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-lotofacil-purple/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-lotofacil-purple animate-pulse" />
                <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-lotofacil-purple">ÚLTIMO RESULTADO <span className="text-white/40 ml-1">#{activeContest.number}</span></h2>
              </div>
              <p className="text-[8px] sm:text-[10px] text-white/40 uppercase tracking-widest mt-1">Confira os números sorteados no concurso atual</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {activeContest.draws.find(d => d.results.length > 0)?.results.sort((a, b) => a - b).map((num, i) => (
                <motion.span 
                  key={num} 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white text-slate-900 flex items-center justify-center text-[9px] sm:text-xs font-black shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_-2px_4px_rgba(0,0,0,0.1)] border border-slate-200"
                >
                  {num.toString().padStart(2, '0')}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content Grid - Denser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Ranking Progress */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold tracking-widest text-slate-900 uppercase">CORRIDA <span className="text-lotofacil-purple">160 PTS</span></h2>
            <TrendingUp className="text-lotofacil-purple" size={14} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[8px] sm:text-[10px] uppercase tracking-widest font-bold">
              <span className="text-slate-500">Progresso</span>
              <span className="text-lotofacil-purple">{user?.totalPoints || 0} / {RANKING_GOAL} PTS</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((user?.totalPoints || 0) / RANKING_GOAL) * 100, 100)}%` }}
                className="h-full bg-lotofacil-purple rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
              <p className="text-[7px] uppercase tracking-widest text-slate-500 mb-0.5">Meta</p>
              <p className="text-[10px] font-bold text-slate-900">{RANKING_GOAL} PTS</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
              <p className="text-[7px] uppercase tracking-widest text-slate-500 mb-0.5">Prêmio</p>
              <p className="text-[10px] font-bold text-lotofacil-purple">R$ 1K</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
              <p className="text-[7px] uppercase tracking-widest text-slate-500 mb-0.5">Posição</p>
              <p className="text-[10px] font-bold text-accent-blue">{userRank ? `#${userRank.position}º` : '...'}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-2">
            <p className="text-[9px] text-slate-800 leading-tight">
              Somente sua <span className="font-bold">melhor aposta</span> de cada concurso conta para a corrida. 
              Mantenha o mesmo nome para acumular pontos.
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-4 sm:p-5 space-y-3">
          <h2 className="text-xs sm:text-sm font-bold tracking-widest text-slate-900 uppercase">ATIVIDADE <span className="text-accent-purple">RECENTE</span></h2>
          
          <div className="space-y-2">
            {userBets.slice(0, 4).map((bet) => (
              <div key={bet.id} className="flex gap-2 items-center p-1.5 hover:bg-slate-50 rounded-lg transition-all">
                <div className={cn("shrink-0", bet.status === 'validado' ? "text-lotofacil-purple" : bet.status === 'pendente' ? "text-lotofacil-yellow" : "text-accent-red")}>
                  {bet.status === 'validado' ? <CheckCircle2 size={12} /> : bet.status === 'pendente' ? <Clock size={12} /> : <ArrowUpRight size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-900 truncate">
                    {bet.betName || `Aposta ${bet.status}`}
                  </p>
                  <p className="text-[8px] text-slate-500">#{bet.contestNumber || '...'}</p>
                </div>
                <p className="text-[8px] text-slate-400 font-medium">
                  {new Date(bet.createdAt as any).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
            ))}
            {userBets.length === 0 && (
              <p className="text-center text-slate-500 py-4 text-[9px]">Nenhuma atividade.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
