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
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [sortBy, setSortBy] = useState<'points' | 'name'>('points');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [championsSettings, setChampionsSettings] = useState<any>(null);

  useEffect(() => {
    firebaseService.getChampionsSettings().then(settings => {
      setChampionsSettings(settings);
    });
  }, []);

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

    // Champions Block on First Page
    doc.setFillColor(248, 250, 252); // Slate 50 background
    doc.roundedRect(15, 48, pageWidth - 30, 32, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225); // Slate 300 border
    doc.roundedRect(15, 48, pageWidth - 30, 32, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // Slate 900
    doc.setFont('helvetica', 'bold');
    doc.text('PÓDIO E PREMIAÇÃO DA CORRIDA (PRIMEIROS A COMPLETAR 200 PTS):', 20, 53);

    const champS = championsSettings || {
      champions: [],
      prizePool: 800,
      pct1: 50,
      pct2: 30,
      pct3: 20
    };

    doc.setFontSize(7.5);
    // Draw 1st place
    const c1 = champS.champions && champS.champions[0];
    if (c1) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(194, 120, 3); // Gold-ish dark
      doc.text(`1º LUGAR (${champS.pct1 || 50}%): ${c1.betName.toUpperCase()}`, 20, 60);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Vendedor: ${c1.sellerCode || '-'} | Almejou no Concurso ${c1.contestNumber} (${c1.draw})`, 20, 64);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105); // Emerald 600
      doc.text(`Prêmio: R$ ${((champS.prizePool || 800) * ((champS.pct1 || 50) / 100)).toFixed(2).replace('.', ',')} (${c1.points} PTS)`, 20, 68);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`1º LUGAR (${champS.pct1 || 50}%): EM ANDAMENTO...`, 20, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(`Aguardando participante atingir 200 PTS`, 20, 64);
      doc.setFont('helvetica', 'bold');
      doc.text(`Prêmio Estimado: R$ ${((champS.prizePool || 800) * ((champS.pct1 || 50) / 100)).toFixed(2).replace('.', ',')}`, 20, 68);
    }

    // Draw 2nd place
    const c2 = champS.champions && champS.champions[1];
    if (c2) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139); // Silver
      doc.text(`2º LUGAR (${champS.pct2 || 30}%): ${c2.betName.toUpperCase()}`, pageWidth / 2 - 35, 60);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Vendedor: ${c2.sellerCode || '-'} | Almejou no Concurso ${c2.contestNumber} (${c2.draw})`, pageWidth / 2 - 35, 64);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105); // Emerald 600
      doc.text(`Prêmio: R$ ${((champS.prizePool || 800) * ((champS.pct2 || 30) / 100)).toFixed(2).replace('.', ',')} (${c2.points} PTS)`, pageWidth / 2 - 35, 68);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`2º LUGAR (${champS.pct2 || 30}%): EM ANDAMENTO...`, pageWidth / 2 - 35, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(`Aguardando participante atingir 200 PTS`, pageWidth / 2 - 35, 64);
      doc.setFont('helvetica', 'bold');
      doc.text(`Prêmio Estimado: R$ ${((champS.prizePool || 800) * ((champS.pct2 || 30) / 100)).toFixed(2).replace('.', ',')}`, pageWidth / 2 - 35, 68);
    }

    // Draw 3rd place
    const c3 = champS.champions && champS.champions[2];
    if (c3) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9); // Bronze-ish amber
      doc.text(`3º LUGAR (${champS.pct3 || 20}%): ${c3.betName.toUpperCase()}`, pageWidth - 100, 60);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Vendedor: ${c3.sellerCode || '-'} | Almejou no Concurso ${c3.contestNumber} (${c3.draw})`, pageWidth - 100, 64);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105); // Emerald 600
      doc.text(`Prêmio: R$ ${((champS.prizePool || 800) * ((champS.pct3 || 20) / 100)).toFixed(2).replace('.', ',')} (${c3.points} PTS)`, pageWidth - 100, 68);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`3º LUGAR (${champS.pct3 || 20}%): EM ANDAMENTO...`, pageWidth - 100, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(`Aguardando participante atingir 200 PTS`, pageWidth - 100, 64);
      doc.setFont('helvetica', 'bold');
      doc.text(`Prêmio Estimado: R$ ${((champS.prizePool || 800) * ((champS.pct3 || 20) / 100)).toFixed(2).replace('.', ',')}`, pageWidth - 100, 68);
    }

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')} | Total de Participantes: ${ranking.length}`, pageWidth / 2, 85, { align: 'center' });
    doc.text('Relatório automatizado — Bolão Lotofácil Premiada | Confira atualizações em: lotofacilpremiada.online', pageWidth / 2, 92, { align: 'center' });

    // Table
    const headers = ['Nº', 'POS', 'PARTICIPANTE', 'VENDEDOR', 'NÚMEROS DA APOSTA', 'PONTOS ATUAIS', 'PROGRESSO (%)'];
    const data = ranking.map((p, index) => {
      const progress = Math.min((p.points / RANKING_GOAL) * 100, 100).toFixed(1);
      return [
        index + 1,
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
      styles: { fontSize: 8, halign: 'center', cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { fillColor: [255, 255, 255], cellWidth: 10, fontStyle: 'bold' },
        1: { fillColor: [255, 255, 255], cellWidth: 15, fontStyle: 'bold' },
        2: { fillColor: [255, 255, 255], halign: 'left', cellWidth: 55, fontStyle: 'bold' },
        3: { fillColor: [255, 255, 255], cellWidth: 20 },
        4: { cellWidth: 55 },
        5: { fillColor: [243, 232, 255], textColor: [107, 33, 168], fontStyle: 'bold', cellWidth: 25 },
        6: { cellWidth: 20 }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index <= 3) {
            data.cell.styles.fillColor = [255, 255, 255];
          }
          if (data.column.index === 5) {
            const points = parseInt(data.cell.raw as string);
            if (points >= RANKING_GOAL) {
              data.cell.styles.fillColor = [30, 58, 138]; // Dark Blue
              data.cell.styles.textColor = [255, 215, 0]; // Gold
            }
          }
        }
      }
    });

    doc.save(`Corrida_dos_Campeoes_Bolao_Premiada_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '_')}.pdf`);
    setShowPasswordModal(false);
    setPassword('');
  };

  const handleLoadRanking = async () => {
    setLoading(true);
    try {
      const [rankingData, contest, champSettings] = await Promise.all([
        firebaseService.getRanking(300),
        firebaseService.getActiveContest(),
        firebaseService.getChampionsSettings()
      ]);
      setRanking(rankingData);
      setChampionsSettings(champSettings);
      
      if (contest) {
        const bets = await firebaseService.getContestBets(contest.id);
        const keys = new Set(bets.map(b => 
          `${(b.betName || b.userName || '').trim().toUpperCase()}_${(b.sellerCode || '').trim().toUpperCase()}`
        ));
        setActiveBetKeys(keys);
      }
      setDataLoaded(true);
    } catch (error) {
      console.error("Error loading ranking data:", error);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Podium / Campeões da Corrida 200 PTS */}
      {championsSettings && championsSettings.champions && championsSettings.champions.length > 0 ? (
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-lotofacil-purple/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lotofacil-purple/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col items-center mb-6 sm:mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-lotofacil-purple/20 border border-lotofacil-purple/40 rounded-full text-lotofacil-purple text-xs font-bold uppercase tracking-widest mb-3">
              <Crown size={14} className="text-lotofacil-yellow" />
              FINALISTAS DA CORRIDA 200 PTS
            </div>
            <h2 className="text-xl sm:text-3xl font-display tracking-widest uppercase">PÓDIO DA CORRIDA</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Estes são os 3 primeiros participantes que atingiram a meta de {RANKING_GOAL} pontos e garantiram suas premiações!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* 2º Lugar */}
            {championsSettings.champions[1] ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 text-center order-2 md:order-1 transition-all hover:border-slate-600">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-slate-700/60 rounded-full flex items-center justify-center text-slate-300 font-black text-lg border border-slate-600">
                    2º
                  </div>
                </div>
                <h3 className="font-bold text-base tracking-wide text-white uppercase truncate">{championsSettings.champions[1].betName}</h3>
                <p className="text-xs text-slate-400 mt-1 uppercase font-mono">Vendedor: {championsSettings.champions[1].sellerCode || '-'}</p>
                <div className="mt-4 py-2 px-3 bg-slate-900/50 rounded-xl inline-block text-xs font-semibold text-slate-300 border border-slate-800">
                  Concurso {championsSettings.champions[1].contestNumber} • Sorteio {championsSettings.champions[1].draw}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-slate-300 font-bold text-sm">{championsSettings.champions[1].points} PTS</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-black text-sm">
                    R$ {((championsSettings.prizePool || 800) * ((championsSettings.pct2 || 30) / 100)).toFixed(2).replace('.', ',')} ({championsSettings.pct2 || 30}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/10 border border-dashed border-slate-800 rounded-2xl p-5 text-center order-2 md:order-1 flex flex-col items-center justify-center min-h-[180px]">
                <p className="text-slate-500 text-xs uppercase font-bold">2º Lugar em aberto</p>
              </div>
            )}

            {/* 1º Lugar */}
            {championsSettings.champions[0] ? (
              <div className="bg-gradient-to-b from-lotofacil-purple/20 to-slate-800/80 border-2 border-lotofacil-purple/50 rounded-3xl p-6 text-center order-1 md:order-2 shadow-xl relative transform md:-translate-y-2 transition-all hover:border-lotofacil-purple">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-lotofacil-yellow rounded-full p-2 border-4 border-slate-900 shadow-lg animate-bounce">
                  <Crown size={20} className="text-slate-900" />
                </div>
                <div className="flex justify-center mb-4 mt-2">
                  <div className="w-16 h-16 bg-lotofacil-yellow/20 rounded-full flex items-center justify-center text-lotofacil-yellow font-black text-2xl border-2 border-lotofacil-yellow/40 shadow-inner">
                    1º
                  </div>
                </div>
                <h3 className="font-black text-lg sm:text-xl tracking-wider text-white uppercase truncate">{championsSettings.champions[0].betName}</h3>
                <p className="text-xs text-lotofacil-purple mt-1 uppercase font-mono font-bold">Vendedor: {championsSettings.champions[0].sellerCode || '-'}</p>
                <div className="mt-4 py-2 px-4 bg-slate-900/80 rounded-xl inline-block text-xs font-bold text-lotofacil-purple border border-lotofacil-purple/30">
                  Concurso {championsSettings.champions[0].contestNumber} • Sorteio {championsSettings.champions[0].draw}
                </div>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <span className="text-white font-extrabold text-base">{championsSettings.champions[0].points} PTS</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400 font-extrabold text-base">
                    R$ {((championsSettings.prizePool || 800) * ((championsSettings.pct1 || 50) / 100)).toFixed(2).replace('.', ',')} ({championsSettings.pct1 || 50}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl p-6 text-center order-1 md:order-2 flex flex-col items-center justify-center min-h-[220px]">
                <p className="text-slate-500 text-sm uppercase font-bold">1º Lugar em aberto</p>
              </div>
            )}

            {/* 3º Lugar */}
            {championsSettings.champions[2] ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 text-center order-3 md:order-3 transition-all hover:border-slate-600">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-amber-900/40 rounded-full flex items-center justify-center text-amber-500 font-black text-lg border border-amber-800/40">
                    3º
                  </div>
                </div>
                <h3 className="font-bold text-base tracking-wide text-white uppercase truncate">{championsSettings.champions[2].betName}</h3>
                <p className="text-xs text-slate-400 mt-1 uppercase font-mono">Vendedor: {championsSettings.champions[2].sellerCode || '-'}</p>
                <div className="mt-4 py-2 px-3 bg-slate-900/50 rounded-xl inline-block text-xs font-semibold text-slate-300 border border-slate-800">
                  Concurso {championsSettings.champions[2].contestNumber} • Sorteio {championsSettings.champions[2].draw}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-slate-300 font-bold text-sm">{championsSettings.champions[2].points} PTS</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-black text-sm">
                    R$ {((championsSettings.prizePool || 800) * ((championsSettings.pct3 || 20) / 100)).toFixed(2).replace('.', ',')} ({championsSettings.pct3 || 20}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/10 border border-dashed border-slate-800 rounded-2xl p-5 text-center order-3 md:order-3 flex flex-col items-center justify-center min-h-[180px]">
                <p className="text-slate-500 text-xs uppercase font-bold">3º Lugar em aberto</p>
              </div>
            )}
          </div>
        </div>
      ) : championsSettings ? (
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-lotofacil-purple/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lotofacil-purple/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-lotofacil-purple/20 border border-lotofacil-purple/40 rounded-2xl text-lotofacil-purple mb-4">
              <Trophy size={32} className="animate-pulse text-lotofacil-yellow" />
            </div>
            <h2 className="text-xl sm:text-2xl font-display tracking-widest uppercase">CORRIDA AOS {RANKING_GOAL} PONTOS EM ANDAMENTO!</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl">
              Nenhum participante alcançou a meta de {RANKING_GOAL} pontos ainda. Continue acumulando pontos nos sorteios S1, S2 e S3 para garantir seu lugar no pódio!
            </p>
            <div className="mt-6 flex flex-wrap gap-4 justify-center">
              <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-xs font-bold uppercase tracking-widest text-slate-300">
                1º Lugar: {championsSettings.pct1 || 50}% do prêmio (R$ {((championsSettings.prizePool || 800) * ((championsSettings.pct1 || 50) / 100)).toFixed(2).replace('.', ',')})
              </div>
              <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-xs font-bold uppercase tracking-widest text-slate-300">
                2º Lugar: {championsSettings.pct2 || 30}% do prêmio (R$ {((championsSettings.prizePool || 800) * ((championsSettings.pct2 || 30) / 100)).toFixed(2).replace('.', ',')})
              </div>
              <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-xs font-bold uppercase tracking-widest text-slate-300">
                3º Lugar: {championsSettings.pct3 || 20}% do prêmio (R$ {((championsSettings.prizePool || 800) * ((championsSettings.pct3 || 20) / 100)).toFixed(2).replace('.', ',')})
              </div>
            </div>
          </div>
        </div>
      ) : null}

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

      {!dataLoaded ? (
        <div className="glass-card p-6 sm:p-10 max-w-xl mx-auto text-center space-y-6 border border-lotofacil-purple/20 shadow-xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-lotofacil-purple/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
          
          <div className="w-16 h-16 bg-lotofacil-purple/10 text-lotofacil-purple rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Search size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-display tracking-widest text-slate-900 uppercase">Buscar na Corrida dos Campeões</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              Digite o seu nome de participante para ver sua pontuação acumulada e classificação atualizada.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Ex: SEU NOME..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    handleLoadRanking();
                  }
                }}
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-lotofacil-purple/50 focus:bg-white rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold uppercase transition-all outline-none"
              />
            </div>
            <button
              onClick={() => {
                if (searchTerm.trim()) {
                  handleLoadRanking();
                } else {
                  alert('Por favor, digite um nome para buscar.');
                }
              }}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-4 bg-lotofacil-purple hover:bg-lotofacil-purple/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all shrink-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'BUSCAR'
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ou visualize o quadro completo</p>
            <button
              onClick={() => handleLoadRanking()}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl transition-all"
            >
              {loading ? 'CARREGANDO...' : 'VER RANKING COMPLETO'}
            </button>
          </div>
        </div>
      ) : (
        <>
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
      </>)}

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
