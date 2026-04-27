/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Trophy, Medal, TrendingUp, Search, Share2, Crown, FileText, Lock, AlertCircle, HelpCircle, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { RANKING_GOAL, RANKING_PRIZE } from '../utils';
import { UserRanking, ContestStatus, Bet } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Ranking: React.FC = () => {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<UserRanking[]>([]);
  const [activeBetKeys, setActiveBetKeys] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [sortBy, setSortBy] = useState<'points' | 'name'>('points');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleDownloadPDF = () => {
    if (password !== 'Baixarok') {
      setPasswordError(true);
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header Background
    doc.setFillColor(30, 41, 59); // Slate 900
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CORRIDA DOS CAMPEÕES', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`RUMO AOS ${RANKING_GOAL} PONTOS`, pageWidth / 2, 30, { align: 'center' });

    // Meta Info
    doc.setFillColor(147, 51, 234); // Purple 600
    doc.roundedRect(pageWidth / 2 - 60, 35, 120, 8, 2, 2, 'F');
    doc.setFontSize(10);
    doc.text(`META: ${RANKING_GOAL} PONTOS | PRÊMIO: R$ ${RANKING_PRIZE.toFixed(2).replace('.', ',')}`, pageWidth / 2, 40.5, { align: 'center' });

    // Footer Info
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text('Para acompanhar atualizações e mais detalhes, acesse: lotofacilpremiada.online', pageWidth / 2, 55, { align: 'center' });
    doc.text('Ranking atualizado automaticamente a cada concurso', pageWidth / 2, 62, { align: 'center' });
    doc.text('Sistema exclusivo de pontuação acumulada', pageWidth / 2, 67, { align: 'center' });
    doc.text('Acompanhe sua evolução a cada rodada', pageWidth / 2, 72, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')} | Total de Participantes: ${ranking.length}`, pageWidth / 2, 85, { align: 'center' });
    doc.text('Relatório automatizado — Bolão Lotofácil Premiada', pageWidth / 2, 92, { align: 'center' });
    doc.text('Atualizações disponíveis na plataforma online', pageWidth / 2, 97, { align: 'center' });

    // Table
    const headers = ['POS', 'PARTICIPANTE', 'VENDEDOR', 'NÚMEROS DA APOSTA', 'PONTOS ATUAIS', 'PROGRESSO (%)'];
    const data = ranking.map(p => {
      const progress = Math.min((p.points / RANKING_GOAL) * 100, 100).toFixed(1);
      return [
        `#${p.position}`,
        p.userName.toUpperCase(),
        p.sellerCode || '-',
        p.numbers?.join(' ') || '-',
        `${p.points} PTS`,
        `${progress}%`
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 105,
      theme: 'grid',
      styles: { fontSize: 8, halign: 'center', cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 60, fontStyle: 'bold' },
        2: { cellWidth: 25 },
        3: { cellWidth: 60 },
        4: { fillColor: [243, 232, 255], textColor: [107, 33, 168], fontStyle: 'bold', cellWidth: 30 },
        5: { cellWidth: 30 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const points = parseInt(data.cell.raw as string);
          if (points >= RANKING_GOAL) {
            data.cell.styles.fillColor = [30, 58, 138]; // Dark Blue
            data.cell.styles.textColor = [255, 215, 0]; // Gold
          }
        }
      }
    });

    doc.save(`Corrida_dos_Campeoes_Bolao_Premiada_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '_')}.pdf`);
    setShowPasswordModal(false);
    setPassword('');
  };

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
    let filtered = ranking.filter(p => 
      (p.userName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => (a.userName || '').localeCompare(b.userName || ''));
    } else {
      filtered = [...filtered].sort((a, b) => b.points - a.points);
    }

    return filtered.slice(0, 25); // Limit to Top 25
  }, [ranking, searchTerm, sortBy]);

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
              <span className="text-lotofacil-purple"> - {RANKING_GOAL} PTS</span>
            </h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white transition-all shadow-lg shadow-red-200 text-xs font-bold uppercase tracking-widest"
                title="Baixar PDF"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button 
                onClick={() => setShowInfoModal(true)}
                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all shadow-md shadow-emerald-500/20"
                title="Informações sobre a Corrida"
              >
                <HelpCircle size={20} />
              </button>
              <button 
                onClick={handleShare}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-lotofacil-purple transition-all border border-slate-200"
                title="Copiar Link Público"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 sm:mt-2">
            Acompanhe a corrida rumo aos {RANKING_GOAL} pontos!
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="px-3 py-1.5 bg-slate-900 text-white rounded-lg flex items-center gap-2 shadow-md border border-lotofacil-purple/30">
              <Trophy size={14} className="text-lotofacil-purple" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Meta: {RANKING_GOAL} Pontos</span>
            </div>
            <div className="px-3 py-1.5 bg-lotofacil-purple text-white rounded-lg flex items-center gap-2 shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-widest">Prêmio para quem alcançar primeiro: R$ {RANKING_PRIZE}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                      <HelpCircle size={24} />
                    </div>
                    <h3 className="text-xl font-display tracking-widest text-slate-900 uppercase">REGRAS DA <span className="text-lotofacil-purple">CORRIDA</span></h3>
                  </div>
                  <button 
                    onClick={() => setShowInfoModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                  >
                    <CloseIcon size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-amber-100 border border-amber-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertCircle size={20} />
                      <span className="font-bold uppercase tracking-widest text-xs">Importante</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-800 font-bold leading-relaxed">
                        Somente a melhor aposta do participante em cada concurso entra na disputa do geral.
                      </p>
                      <p className="text-sm text-black font-medium leading-relaxed">
                        Use sempre o <span className="font-black underline italic">mesmo nome</span> nas próximas edições para somar os pontos já conquistados na corrida.
                      </p>
                    </div>
                  </div>

                  <div className="bg-lotofacil-purple/5 border border-lotofacil-purple/10 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-lotofacil-purple">
                      <TrendingUp size={20} />
                      <span className="font-bold uppercase tracking-widest text-xs">Funcionamento</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      A Corrida {RANKING_GOAL} PTS soma os pontos de todos os concursos realizados. 
                      Os pontos do concurso atual são adicionados automaticamente após a finalização do 3º sorteio.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        Meta: {RANKING_GOAL} Pontos
                      </div>
                      <div className="px-3 py-1 bg-lotofacil-purple text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        Prêmio: R$ {RANKING_PRIZE}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowInfoModal(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all"
                >
                  Entendido!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top 3 Cards - Horizontal Scroll on Mobile */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-6 overflow-x-auto pb-4 sm:pb-0 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {loading ? (
          <div className="min-w-full text-center py-10 text-slate-600 text-xs sm:text-sm">Carregando ranking...</div>
        ) : filteredRanking.slice(0, 3).map((p, idx) => (
          <motion.div 
            key={p.userId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "glass-card p-3 sm:p-5 flex flex-col items-center text-center space-y-2 sm:space-y-4 relative overflow-hidden min-w-[200px] sm:min-w-0 flex-shrink-0",
              p.position === 1 && "border-lotofacil-yellow/30 ring-1 ring-lotofacil-yellow/20 shadow-sm"
            )}
          >
            {p.position === 1 && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lotofacil-yellow to-transparent" />
            )}
            <div className={cn(
              "w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex items-center justify-center relative",
              p.position === 1 ? "bg-lotofacil-yellow/10" : p.position === 2 ? "bg-slate-100" : "bg-orange-50"
            )}>
              {getRankIcon(p.position)}
              {p.position === 1 && (
                <div className="absolute -top-1 -right-1 bg-slate-900 text-white text-[7px] font-bold px-1 py-0.5 rounded shadow-lg ring-1 ring-lotofacil-purple/50 flex items-center gap-1">
                  <Crown size={7} className="text-lotofacil-purple" /> Líder
                </div>
              )}
            </div>
            <div>
              <h3 className={cn(
                "text-base sm:text-lg font-bold leading-tight",
                p.position === 1 ? "text-lotofacil-yellow" : p.position === 2 ? "text-slate-600" : "text-slate-900"
              )}>{p.userName}</h3>
              
              {/* Numbers Display */}
              {p.numbers && (
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {p.numbers.map(num => (
                    <span key={num} className="text-[9px] sm:text-[11px] font-bold text-black bg-[#ffd700] px-1 py-0.5 rounded border border-black/50 shrink-0 shadow-sm">
                      {num.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              )}

              {p.sellerCode && (
                <p className="text-[7px] sm:text-[9px] text-lotofacil-purple font-bold uppercase tracking-widest mt-0.5">
                  Vendedor: {p.sellerCode}
                </p>
              )}
              {p.position === 1 && (
                <div className="mt-0.5 text-center">
                  <span className="text-[7px] font-black text-lotofacil-yellow uppercase tracking-widest flex items-center justify-center gap-1">
                    <Crown size={8} /> Líder do Ranking
                  </span>
                </div>
              )}
              {p.points >= RANKING_GOAL && (
                <div className="flex flex-col items-center gap-1 mt-1">
                  <span className="px-2 py-0.5 bg-slate-900 text-white text-[7px] font-bold uppercase tracking-tighter rounded flex items-center gap-1 shadow-lg ring-1 ring-lotofacil-yellow/50">
                    <Trophy size={7} className="text-lotofacil-yellow" />
                    META ALCANÇADA
                  </span>
                </div>
              )}
              <p className="text-[9px] sm:text-[10px] text-slate-600 uppercase tracking-widest mt-0.5">Participante</p>
            </div>
            <div className="w-full space-y-1.5 sm:space-y-2.5">
              <div className="flex justify-between items-end text-[10px] sm:text-xs">
                <div className="flex flex-col items-start">
                  <span className="text-slate-600 uppercase tracking-widest text-[7px] sm:text-[9px]">Progresso</span>
                  <span className="text-[8px] sm:text-[10px] font-bold text-lotofacil-purple mt-0.5">
                    {p.points} / {RANKING_GOAL} PTS
                  </span>
                </div>
                <div className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition-all",
                  p.points >= RANKING_GOAL 
                    ? "bg-slate-900 text-white shadow-md scale-105 ring-1 ring-lotofacil-yellow/50" 
                    : "text-lotofacil-purple"
                )}>
                  {p.points} PTS
                </div>
              </div>
              <div className="h-1 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                <div className="pt-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[7px] sm:text-[8px] font-bold uppercase tracking-tighter shadow-sm animate-pulse">
                    Faltam {RANKING_GOAL - p.points} pontos para a meta
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* List */}
      <div className="glass-card p-3 sm:p-8 space-y-4 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-base sm:text-2xl font-display tracking-widest text-slate-900 uppercase">Top 25 <span className="text-slate-600">Classificação</span></h2>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ORDENAR POR</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setSortBy('points')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    sortBy === 'points' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
                  )}
                >
                  Pontos
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    sortBy === 'name' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
                  )}
                >
                  A-Z
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input 
                type="text" 
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-dark-border/40 rounded-xl py-2 pl-9 sm:pl-10 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-[10px] sm:text-xs w-full text-slate-900 placeholder:text-slate-600"
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
              className="flex items-center gap-3 sm:gap-6 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-dark-border/30 hover:border-lotofacil-purple/40 transition-all shadow-sm"
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
                  {p.points >= RANKING_GOAL && (
                    <span className="text-[7px] sm:text-[8px] bg-slate-900 text-white font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm ring-1 ring-lotofacil-purple/30">
                      <Trophy size={8} className="text-lotofacil-purple" />
                      META ALCANÇADA
                    </span>
                  )}
                </div>
                
                {/* Numbers Display */}
                {p.numbers && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.numbers.map(num => (
                      <span key={num} className="text-[8px] sm:text-[10px] font-bold text-black bg-[#ffd700] px-1 py-0.5 rounded border border-black/50 shrink-0 shadow-sm">
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
                    p.points >= RANKING_GOAL 
                      ? "bg-slate-900 text-white shadow-md scale-110 ring-1 ring-lotofacil-yellow/30" 
                      : "bg-slate-50 border border-slate-100"
                  )}>
                    <span className={cn(
                      "text-[10px] sm:text-xs font-bold whitespace-nowrap leading-none",
                      p.points >= RANKING_GOAL ? "text-white" : "text-lotofacil-purple"
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

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPasswordModal(false);
                setPassword('');
                setPasswordError(false);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-8"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                  <Lock size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Acesso Restrito</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Insira a senha para baixar o PDF</p>
                </div>
                
                <div className="w-full space-y-4 pt-4">
                  <div className="relative">
                    <input 
                      type="password" 
                      placeholder="Senha de acesso"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleDownloadPDF();
                      }}
                      className={cn(
                        "w-full bg-slate-50 border rounded-2xl py-4 px-6 focus:outline-none transition-all text-center font-black tracking-[0.3em]",
                        passwordError ? "border-red-500 text-red-500" : "border-slate-200 focus:border-red-500"
                      )}
                      autoFocus
                    />
                    {passwordError && (
                      <p className="text-[10px] text-red-500 font-black uppercase mt-2 tracking-widest">Senha incorreta!</p>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setShowPasswordModal(false);
                        setPassword('');
                        setPasswordError(false);
                      }}
                      className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleDownloadPDF}
                      className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Ranking;
