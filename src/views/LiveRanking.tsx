/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Medal,
  Info,
  Clock,
  Download,
  Lock,
  X,
  ChevronRight,
  FileText,
  Pencil,
  Trash2,
  AlertCircle,
  HelpCircle,
  Gift,
  Calendar,
  Ticket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../utils';
import { Bet, Contest, Settings } from '../types';

const LiveRanking: React.FC = () => {
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [systemSettings, setSystemSettings] = useState<Settings | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [sortBy, setSortBy] = useState<'points' | 'name'>('name');
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; totalMs: number } | null>(null);
  const [showCountdownModal, setShowCountdownModal] = useState(false);

  useEffect(() => {
    if (!activeContest) return;

    const calcTime = () => {
      const displayStartDate = activeContest.startDate || systemSettings?.poolStartDate;
      const displayStartTime = activeContest.startTime || systemSettings?.poolStartTime || '19:00';
      
      if (!displayStartDate) {
        setTimeLeft(null);
        return;
      }

      let formattedDate = displayStartDate;
      if (displayStartDate.includes('-')) {
        formattedDate = displayStartDate;
      } else if (displayStartDate.includes('/')) {
        const parts = displayStartDate.split('/');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const deadline = new Date(`${formattedDate}T${displayStartTime}:00`);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalMs: diff });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, totalMs: diff });
      }
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);

    return () => clearInterval(interval);
  }, [activeContest, systemSettings]);

  useEffect(() => {
    if (activeContest) {
      const hasResults = activeContest.draws.some(d => d.results && d.results.length > 0);
      setSortBy(hasResults ? 'points' : 'name');
    }
  }, [activeContest?.draws]);
  const [selectedDraw, setSelectedDraw] = useState(0);
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [downloadType, setDownloadType] = useState<'excel' | 'pdf' | null>(null);
  const { user } = useAuth();
  const [editingBet, setEditingBet] = useState<Bet | null>(null);
  const [editBetName, setEditBetName] = useState('');
  const [editBetNumbers, setEditBetNumbers] = useState<number[]>([]);
  const [isUpdatingBet, setIsUpdatingBet] = useState(false);
  const [showPrizeEditModal, setShowPrizeEditModal] = useState(false);
  const [editingPrizeConfig, setEditingPrizeConfig] = useState<NonNullable<Contest['prizeConfig']>>({
    fixed10PtsDraw1: 500,
    fixed10PtsDraw2: 500,
    fixed10PtsDraw3: 500,
    fixed25PlusTotal: 2000,
    fixed28PlusTotal: 7000,
    pctRapidinha: 0.10,
    pctChampion: 0.45,
    pctVice: 0.15,
    pctSeller: 0.15,
    pctAdmin: 0.10,
    pctReserve: 0.05
  });
  const [editingPrizes, setEditingPrizes] = useState<NonNullable<Contest['prizes']>>({
    draw1: '10 PTS',
    draw2: '10 PTS',
    draw3: '10 PTS',
    rapidinha1: '1° LUGAR',
    rapidinha2: '2° LUGAR',
    rankeada: 'LOTOMASTER'
  });
  const [isUpdatingPrizes, setIsUpdatingPrizes] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showPrizesInfoModal, setShowPrizesInfoModal] = useState(false);
  const [prizeInfoType, setPrizeInfoType] = useState<'draw1' | 'bonus' | null>(null);
  const [showPrizesModal, setShowPrizesModal] = useState(false);
  const [showDownloadOptionsModal, setShowDownloadOptionsModal] = useState(false);

  useEffect(() => {
    let unsubscribeContest: (() => void) | undefined;
    let unsubscribeBets: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    const init = async () => {
      unsubscribeSettings = firebaseService.subscribeToSettings((settings) => {
        setSystemSettings(settings);
      });

      unsubscribeContest = firebaseService.subscribeToActiveContest((contest) => {
        setActiveContest(contest);
        if (contest) {
          if (contest.prizeConfig) setEditingPrizeConfig(contest.prizeConfig);
          if (contest.prizes) setEditingPrizes(contest.prizes);
          
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
    
    // Track page hit
    if (user) {
      firebaseService.trackPageView('live_ranking', user.role);
    }

    return () => {
      if (unsubscribeContest) unsubscribeContest();
      if (unsubscribeBets) unsubscribeBets();
      if (unsubscribeSettings) unsubscribeSettings();
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

  // Safer calculation for large datasets instead of Math.max(...array)
  let maxS1Hits = 0;
  if (bets.length > 0) {
    for (const b of bets) {
      const h1 = b.hits?.[0] || 0;
      if (h1 > maxS1Hits) maxS1Hits = h1;
    }
  }
  
  const prizeConfig = activeContest.prizeConfig || {
    pctRapidinha: 0.10,
    pctChampion: 0.45,
    pctVice: 0.15,
    fixed10PtsDraw1: 500,
    fixed10PtsDraw2: 500,
    fixed10PtsDraw3: 500,
    fixed25PlusTotal: 2000,
    fixed28PlusTotal: 7000
  };

  const prizes = {
    rapidinha: activeContest.displayPrizes?.rapidinha ?? (totalRevenue * (prizeConfig.pctRapidinha || 0.10)),
    campeao: activeContest.displayPrizes?.champion ?? (totalRevenue * (prizeConfig.pctChampion || 0.45)),
    vice: activeContest.displayPrizes?.vice ?? (totalRevenue * (prizeConfig.pctVice || 0.15)),
    fixed10PtsDraw1: activeContest.displayPrizes?.draw1 ?? (maxS1Hits >= 10 ? (prizeConfig.fixed10PtsDraw1 || 300) : 100),
    fixed10PtsDraw2: activeContest.displayPrizes?.draw2 ?? (prizeConfig.fixed10PtsDraw2 || 300),
    fixed10PtsDraw3: activeContest.displayPrizes?.draw3 ?? (prizeConfig.fixed10PtsDraw3 || 300),
    fixed25Plus: activeContest.displayPrizes?.bonus25 ?? (prizeConfig.fixed25PlusTotal || 2000),
    fixed28Plus: activeContest.displayPrizes?.bonus28 ?? (prizeConfig.fixed28PlusTotal || 7000)
  };

  // Process ranking data - Show all bets individually (No grouping in Live Ranking)
  const sortedRanking = [...bets].sort((a, b) => {
    if (sortBy === 'points') {
      const totalA = (a.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0);
      const totalB = (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0);
      return totalB - totalA;
    } else {
      const nameA = (a.betName || a.userName).toLowerCase();
      const nameB = (b.betName || b.userName).toLowerCase();
      return nameA.localeCompare(nameB);
    }
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
  
  // Find winners/leaders based on all bets
  const rapidinhaLeader = [...bets].sort((a, b) => (b.hits?.[0] || 0) - (a.hits?.[0] || 0))[0];
  const champion = sortedRanking[0];
  const vice = sortedRanking[1];

  const winners10Pts = [
    bets.filter(b => (b.hits?.[0] || 0) >= 10),
    bets.filter(b => (b.hits?.[1] || 0) >= 10),
    bets.filter(b => (b.hits?.[2] || 0) >= 10)
  ];

  const rapidinhaWinnersCount = bets.filter(b => (b.hits?.[0] || 0) === maxS1Hits && maxS1Hits > 0).length;

  const winners28Plus = rankingWithRanks.filter(b => b.totalHits >= 28);
  const winners25Plus = rankingWithRanks.filter(b => b.totalHits >= 25 && b.totalHits < 28);

  const isDraw1Finished = activeContest.draws?.[0]?.status === 'concluido';
  const isDraw2Finished = activeContest.draws?.[1]?.status === 'concluido';
  const isThirdDrawFinished = activeContest.draws?.[2]?.status === 'concluido';

  const handleDownloadExcel = async () => {
    if (password !== 'Baixarok') {
      setPasswordError(true);
      return;
    }

    setShowPasswordModal(false);
    setPassword('');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Classificação Ao Vivo');

    // Header styling
    const mainHeaderStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } }, // lotofacil-purple
      alignment: { horizontal: 'center', vertical: 'middle' },
    };

    const sectionHeaderStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const subHeaderStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FF1E293B' }, size: 10 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // Add Title
    worksheet.mergeCells('A1:V1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `RANKING AO VIVO - CONCURSO #${activeContest.number}`;
    titleCell.style = mainHeaderStyle;
    worksheet.getRow(1).height = 40;

    // Add Prize Info Section
    worksheet.mergeCells('A2:V2');
    const prizeHeaderCell = worksheet.getCell('A2');
    prizeHeaderCell.value = 'DETALHES DA PREMIAÇÃO (ESTIMATIVA)';
    prizeHeaderCell.style = sectionHeaderStyle;

    worksheet.mergeCells('A3:D3');
    worksheet.getCell('A3').value = 'Rapidinha (1º Sorteio)';
    worksheet.mergeCells('E3:H3');
    worksheet.getCell('E3').value = prizes.rapidinha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    worksheet.mergeCells('A4:D4');
    worksheet.getCell('A4').value = 'Campeão (Total)';
    worksheet.mergeCells('E4:H4');
    worksheet.getCell('E4').value = prizes.campeao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    worksheet.mergeCells('A5:D5');
    worksheet.getCell('A5').value = 'Vice (Total)';
    worksheet.mergeCells('E5:H5');
    worksheet.getCell('E5').value = prizes.vice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Add Draw Results Section
    worksheet.mergeCells('J3:M3');
    worksheet.getCell('J3').value = 'Resultados Sorteios:';
    worksheet.getCell('J3').style = { font: { bold: true } };

    activeContest.draws.forEach((draw, idx) => {
      const row = 3 + idx;
      worksheet.mergeCells(`N${row}:O${row}`);
      worksheet.getCell(`N${row}`).value = `Sorteio ${idx + 1}:`;
      worksheet.mergeCells(`P${row}:V${row}`);
      worksheet.getCell(`P${row}`).value = draw.results.sort((a, b) => a - b).join(', ');
    });

    // Add Info Row
    worksheet.mergeCells('A7:V7');
    const infoCell = worksheet.getCell('A7');
    infoCell.value = `Relatório gerado em: ${new Date().toLocaleString('pt-BR')} | Total de Apostas: ${bets.length}`;
    infoCell.style = {
      font: { italic: true, size: 10, color: { argb: 'FF64748B' } },
      alignment: { horizontal: 'center' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    };

    // Add column headers
    const headers = [
      'Pos', 'Participante', 
      'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10', 'N11', 'N12', 'N13', 'N14', 'N15',
      'S1', 'S2', 'S3', 'Total', 'Vendedor'
    ];
    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(8);
    headerRow.eachCell((cell) => {
      cell.style = subHeaderStyle;
    });

    // Add data
    rankingWithRanks.forEach((b: any, index: number) => {
      const hits = b.hits || [0, 0, 0];
      const total = hits.reduce((sum: number, h: number) => sum + h, 0);
      const sortedNumbers = [...b.numbers].sort((a, b) => a - b);
      
      // Garantir exatamente 15 colunas para os números
      const numCols = Array(15).fill('');
      sortedNumbers.forEach((n, i) => { if (i < 15) numCols[i] = n; });
      
      const rowData = [
        b.rank,
        b.betName || b.userName,
        ...numCols,
        hits[0], hits[1], hits[2],
        total,
        b.sellerCode || '-'
      ];
      const row = worksheet.addRow(rowData);
      
      // Alternating row colors
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      }

      // Formatting for numbers and hits
      const allResults = activeContest.draws.flatMap(d => d.results);

      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Highlight hit numbers
        if (colNumber >= 3 && colNumber <= 17) {
          const num = cell.value as number;
          if (allResults.includes(num)) {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9333EA' } }; // purple
          }
        }

        // Highlight S1, S2, S3 and Total
        if (colNumber >= 18 && colNumber <= 21) {
          cell.font = { bold: true };
          if (cell.value as number >= 10) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // yellow-100
            cell.font = { bold: true, color: { argb: 'FF92400E' } }; // amber-800
          }
        }
      });
    });

    // Column widths
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 25;
    for (let i = 3; i <= 17; i++) worksheet.getColumn(i).width = 4;
    worksheet.getColumn(18).width = 6;
    worksheet.getColumn(19).width = 6;
    worksheet.getColumn(20).width = 6;
    worksheet.getColumn(21).width = 8;
    worksheet.getColumn(22).width = 12;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Ranking_Bolao_Concurso_${activeContest.number}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (password !== 'Baixarok') {
      setPasswordError(true);
      return;
    }

    setShowPasswordModal(false);
    setPassword('');
    
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header - Main Title
    doc.setFillColor(107, 33, 168); // lotofacil-purple
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`BOLÃO LOTOFÁCIL PRÊMIADA`, pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Para acompanhar atualizações e mais detalhes, acesse: lotofacilpremiada.online`, pageWidth / 2, 26, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`Ranking atualizado automaticamente a cada concurso`, pageWidth / 2, 33, { align: 'center' });
    doc.text(`Sistema exclusivo de pontuação acumulada`, pageWidth / 2, 38, { align: 'center' });
    doc.text(`Acompanhe sua evolução a cada rodada`, pageWidth / 2, 43, { align: 'center' });

    // Prize Cards in Header (Grid Layout matching the app)
    const prizeCards = [
      { 
        label: 'RAPIDINHA', 
        value: prizes.rapidinha, 
        color: [255, 251, 235], 
        textColor: [217, 119, 6],
        count: rapidinhaWinnersCount,
        isFinished: isDraw1Finished
      },
      { 
        label: '1º LUGAR', 
        value: prizes.campeao, 
        color: [245, 243, 255], 
        textColor: [124, 58, 237],
        count: rankingWithRanks.filter(b => b.rank === 1 && maxTotalHits > 0).length,
        isFinished: isThirdDrawFinished
      },
      { 
        label: '2º LUGAR', 
        value: prizes.vice, 
        color: [239, 246, 255], 
        textColor: [37, 99, 235],
        count: rankingWithRanks.filter(b => b.rank === 2 && secondMaxTotalHits > 0).length,
        isFinished: isThirdDrawFinished
      },
      { 
        label: '1º SORTEIO 10 PTS', 
        value: prizes.fixed10PtsDraw1, 
        color: [255, 247, 237], 
        textColor: [234, 88, 12],
        count: winners10Pts[0].length,
        isFinished: isDraw1Finished
      },
      { 
        label: '2º SORTEIO 10 PTS', 
        value: prizes.fixed10PtsDraw2, 
        color: [255, 247, 237], 
        textColor: [234, 88, 12],
        count: winners10Pts[1].length,
        isFinished: isDraw2Finished
      },
      { 
        label: '3º SORTEIO 10 PTS', 
        value: prizes.fixed10PtsDraw3, 
        color: [255, 247, 237], 
        textColor: [234, 88, 12],
        count: winners10Pts[2].length,
        isFinished: isThirdDrawFinished
      }
    ];

    const bonusCards = [
      { 
        label: 'SUPER BÔNUS 28', 
        value: prizes.fixed28Plus, 
        color: [15, 23, 42], 
        sub: '28 PTS NA SOMA TOTAL', 
        isSuper: true,
        count: winners28Plus.length,
        isFinished: isDraw1Finished && isDraw2Finished && isThirdDrawFinished
      },
      { 
        label: 'BÔNUS 25', 
        value: prizes.fixed25Plus, 
        color: [16, 185, 129], 
        sub: '25 PTS NA SOMA TOTAL', 
        isSuper: false,
        count: winners25Plus.length,
        isFinished: isDraw1Finished && isDraw2Finished && isThirdDrawFinished
      }
    ];

    const cardWidth = (pageWidth - 40) / 3;
    const cardHeight = 22;
    const startX = 15;
    const startY = 50;

    // Drawing Bonus Cards First
    bonusCards.forEach((card, i) => {
      const y = startY + (16 + 3) * i;
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(startX, y, pageWidth - 30, 16, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(card.isSuper ? `COROA SUPER BÔNUS 28` : card.label, startX + 25, y + 7);
      
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(card.sub, startX + 25, y + 12);
      
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      const valToPrint = card.count > 1 ? (card.value / card.count) : card.value;
      const mainText = valToPrint.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + (card.count > 1 ? " cada" : "");
      doc.text(mainText, pageWidth - 20, y + 10, { align: 'right' });

      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      const statusText = card.isFinished 
        ? `${card.count} Ganhador(es)` 
        : "Aguardando conclusão...";
      doc.text(statusText, pageWidth - 20, y + 14, { align: 'right' });
    });

    const prizeCardsStartY = startY + (16 + 3) * 2 + 5;

    prizeCards.forEach((card, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = startX + (cardWidth + 5) * col;
      const y = prizeCardsStartY + (cardHeight + 5) * row;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');
      
      // Icon placeholder
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(x + 4, y + 4, 12, 14, 2, 2, 'F');
      
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text(card.isFinished ? 'VALOR PAGO' : 'ESTIMATIVA', x + cardWidth - 5, y + 6, { align: 'right' });
      
      doc.setFontSize(9);
      doc.setTextColor(card.textColor[0], card.textColor[1], card.textColor[2]);
      doc.setFont('helvetica', 'bold');
      const valToPrint = card.isFinished && card.count > 1 ? (card.value / card.count) : card.value;
      const prizeValStr = valToPrint.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + (card.isFinished && card.count > 1 ? " cada" : "");
      doc.text(prizeValStr, x + cardWidth - 5, y + 11, { align: 'right' });
      
      doc.setFontSize(6);
      doc.setTextColor(30, 41, 59);
      doc.text(card.label, x + cardWidth - 5, y + 16, { align: 'right' });
      
      doc.setFontSize(4.5);
      doc.setTextColor(148, 163, 184);
      const statusStr = card.isFinished 
        ? `${card.count} GANHADOR(ES)` 
        : 'AGUARDANDO...';
      doc.text(statusStr, x + cardWidth - 5, y + 20, { align: 'right' });
    });

    // Subheader Info - Centralized
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    
    // Use contest start date if available, otherwise global start date
    const displayStartDate = activeContest.startDate || systemSettings?.poolStartDate || '10/04/2026';
    const displayStartTime = activeContest.startTime || systemSettings?.poolStartTime || '';
    
    const formattedStartDate = displayStartDate.includes('-') 
      ? displayStartDate.split('-').reverse().join('/') 
      : displayStartDate;
      
    const startInfo = displayStartTime ? `${formattedStartDate} | ${displayStartTime}` : formattedStartDate;

    doc.text(`CLASSIFICAÇÃO | CONCURSO #${activeContest.number} | INICIO: ${startInfo}`, pageWidth / 2, 150, { align: 'center' });
    
    // Draw Results Section (3 Lines) - Centralized with Balls
    const ballRadius = 2.5;
    const ballGap = 1.2;
    const totalDrawWidth = (ballRadius * 2 * 15) + (ballGap * 14);
    
    activeContest.draws.forEach((draw, idx) => {
      const yPos = 160 + (idx * 8);
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}º SORTEIO:`, pageWidth / 2 - totalDrawWidth / 2 - 25, yPos + 1);

      const sortedRes = [...draw.results].sort((a, b) => a - b);
      if (sortedRes.length > 0) {
        sortedRes.forEach((num, nIdx) => {
          const xPos = pageWidth / 2 - totalDrawWidth / 2 + (ballRadius * 2 + ballGap) * nIdx;
          doc.setFillColor(107, 33, 168); // Purple ball
          doc.circle(xPos, yPos, ballRadius, 'F');
          doc.setFontSize(6);
          doc.setTextColor(255, 255, 255);
          doc.text(num.toString().padStart(2, '0'), xPos, yPos + 0.8, { align: 'center' });
        });
      } else {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('Aguardando sorteio...', pageWidth / 2, yPos + 1, { align: 'center' });
      }
    });

    // Info Row
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')} | Total de Apostas: ${bets.length}`, pageWidth / 2, 185, { align: 'center' });
    doc.text(`Relatório automatizado — Bolão Lotofácil Premiada`, pageWidth / 2, 193, { align: 'center' });
    doc.text(`Atualizações disponíveis na plataforma online`, pageWidth / 2, 198, { align: 'center' });

    // Table starts on 2nd page
    doc.addPage();

    // Table Headers - Reordered: S1, S2, S3, SOMA at the end
    const headers = [
      'Nº', 'POS', 'CLIENTE', 'VENDEDOR', 
      '', // Spacing after Vendedor (no borders)
      'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10',
      '', // Spacing after Numbers (no borders)
      'S1', 'S2', 'S3',
      '', // Spacing after S3 (no borders)
      'SOMA'
    ];

    const data = rankingWithRanks.map((b: any, index: number) => {
      const hits = b.hits || [0, 0, 0];
      const total = hits.reduce((sum: number, h: number) => sum + h, 0);
      const sortedNumbers = [...b.numbers].sort((a, b) => a - b);
      
      const numCols = Array(10).fill('');
      sortedNumbers.forEach((n, i) => { if (i < 10) numCols[i] = n; });

      // Prize Logic for PDF Labels
      const isChampion = b.totalHits === maxTotalHits && maxTotalHits > 0;
      const isVice = b.totalHits === secondMaxTotalHits && secondMaxTotalHits > 0;
      const isRapidinha = hits[0] === maxS1Hits && maxS1Hits > 0;
      const has10Pts = hits[0] >= 10 || hits[1] >= 10 || hits[2] >= 10;
      const has28Plus = b.totalHits >= 28;
      const has25Plus = b.totalHits >= 25 && b.totalHits < 28;

      const prizeLabels = [];
      if (isChampion) prizeLabels.push('[1º LUGAR]');
      if (isVice) prizeLabels.push('[2º LUGAR]');
      if (isRapidinha) prizeLabels.push('[RAPIDINHA]');
      if (has10Pts) prizeLabels.push('[10 PONTOS]');
      if (has28Plus) prizeLabels.push('[BÔNUS 28]');
      if (has25Plus) prizeLabels.push('[BÔNUS 25]');

      const nameWithPrizes = `${(b.betName || b.userName).toUpperCase()} ${prizeLabels.join(' ')}`.trim();
      
      return [
        index + 1,
        `${b.rank}º`,
        nameWithPrizes,
        b.sellerCode || '-',
        '', // Spacing after Vendedor
        ...numCols,
        '', // Spacing after Numbers
        hits[0],
        hits[1],
        hits[2],
        '', // Spacing after S3
        total
      ];
    });

    // Use results of the selected draw for highlighting
    const currentDrawResults = activeContest.draws[selectedDraw]?.results || [];

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 15,
      theme: 'grid',
      margin: { left: 11 }, // Bring closer to the margins (297 - 275) / 2
      styles: { fontSize: 7, halign: 'center', cellPadding: 1.2, font: 'helvetica', lineColor: [0, 0, 0], lineWidth: 0.5 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.5 },
      columnStyles: {
        0: { fillColor: [255, 255, 255], fontStyle: 'bold', cellWidth: 8 }, // Nº
        1: { fillColor: [255, 255, 255], fontStyle: 'bold', cellWidth: 9 }, // POS
        2: { fillColor: [255, 255, 255], halign: 'left', cellWidth: 65 }, // CLIENTE (Increased width)
        3: { fillColor: [255, 255, 255], cellWidth: 27 }, // VENDEDOR (Increased width to avoid wrapping)
        4: { fillColor: [255, 255, 255], cellWidth: 3.5 }, // Spacing after Vendedor (blank)
        5: { cellWidth: 11 }, 6: { cellWidth: 11 }, 7: { cellWidth: 11 }, 8: { cellWidth: 11 }, 9: { cellWidth: 11 },
        10: { cellWidth: 11 }, 11: { cellWidth: 11 }, 12: { cellWidth: 11 }, 13: { cellWidth: 11 }, 14: { cellWidth: 11 }, // N1 to N10 (indices 5-14) (Wider & more rectangular)
        15: { fillColor: [255, 255, 255], cellWidth: 3.5 }, // Spacing after Numbers (blank)
        16: { fillColor: [219, 234, 254], textColor: [30, 58, 138], fontStyle: 'bold', cellWidth: 10 }, // S1
        17: { fillColor: [255, 237, 213], textColor: [154, 52, 18], fontStyle: 'bold', cellWidth: 10 }, // S2
        18: { fillColor: [243, 232, 255], textColor: [107, 33, 168], fontStyle: 'bold', cellWidth: 10 }, // S3
        19: { fillColor: [255, 255, 255], cellWidth: 3.5 }, // Spacing after S3 (blank)
        20: { fillColor: [30, 58, 138], textColor: [255, 215, 0], fontStyle: 'bold', fontSize: 11, cellWidth: 15.5 } // SOMA
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      didParseCell: (data) => {
        // Clear borders and colors of spacing columns
        if (data.column.index === 4 || data.column.index === 15 || data.column.index === 19) {
          data.cell.styles.lineWidth = 0;
          data.cell.styles.lineColor = [255, 255, 255];
          data.cell.styles.fillColor = [255, 255, 255];
        } else {
          // Keep thick black borders on normal cells
          data.cell.styles.lineWidth = 0.5;
          data.cell.styles.lineColor = [0, 0, 0];
          
          if (data.section === 'head') {
            if (data.column.index === 16) { // S1
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.textColor = [30, 58, 138];
              data.cell.styles.fontSize = 10;
            } else if (data.column.index === 17) { // S2
              data.cell.styles.fillColor = [255, 237, 213];
              data.cell.styles.textColor = [154, 52, 18];
              data.cell.styles.fontSize = 10;
            } else if (data.column.index === 18) { // S3
              data.cell.styles.fillColor = [243, 232, 255];
              data.cell.styles.textColor = [107, 33, 168];
              data.cell.styles.fontSize = 10;
            } else if (data.column.index === 20) { // SOMA
              data.cell.styles.fillColor = [30, 58, 138];
              data.cell.styles.textColor = [255, 215, 0];
              data.cell.styles.fontSize = 11;
            } else if (data.column.index >= 5 && data.column.index <= 14) { // Numbers N1 to N10
              data.cell.styles.fillColor = [107, 33, 168]; // Purple background
              data.cell.styles.textColor = [255, 255, 255]; // White Text
              data.cell.styles.fontSize = 9;
              data.cell.styles.fontStyle = 'bold';
            } else { // Nº, POS, CLIENTE, VENDEDOR (0, 1, 2, 3)
              data.cell.styles.fillColor = [107, 33, 168]; // Purple background
              data.cell.styles.textColor = [255, 255, 255]; // White text
              data.cell.styles.fontStyle = 'bold';
            }
          } else if (data.section === 'body') {
            if (data.column.index === 16) { // S1
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.textColor = [30, 58, 138];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 10;
            } else if (data.column.index === 17) { // S2
              data.cell.styles.fillColor = [255, 237, 213];
              data.cell.styles.textColor = [154, 52, 18];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 10;
            } else if (data.column.index === 18) { // S3
              data.cell.styles.fillColor = [243, 232, 255];
              data.cell.styles.textColor = [107, 33, 168];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 10;
            } else if (data.column.index === 20) { // SOMA
              data.cell.styles.fillColor = [30, 58, 138];
              data.cell.styles.textColor = [255, 215, 0];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 11;
            } else if (data.column.index >= 5 && data.column.index <= 14) { // Numbers N1 to N10
              data.cell.styles.fillColor = [255, 255, 255];
              data.cell.styles.textColor = [0, 0, 0];
              data.cell.styles.fontSize = 9;
              data.cell.styles.fontStyle = 'bold'; // Bold numbers in table body!
            } else {
              data.cell.styles.fillColor = [255, 255, 255];
              data.cell.styles.textColor = [0, 0, 0];
              data.cell.styles.fontStyle = (data.column.index <= 1) ? 'bold' : 'normal';
            }
          }
        }
      }
    });

    doc.save(`Ranking_Bolao_Premiada_S${selectedDraw + 1}_Conc_${activeContest.number}.pdf`);
  };

  const handleEditBet = (bet: Bet) => {
    setEditingBet(bet);
    setEditBetName(bet.betName || bet.userName);
    setEditBetNumbers([...bet.numbers]);
  };

  const handleUpdateBet = async () => {
    if (!editingBet) return;
    
    if (editBetNumbers.length !== 10) {
      alert('A aposta deve ter exatamente 10 números.');
      return;
    }

    const uniqueNumbers = new Set(editBetNumbers);
    if (uniqueNumbers.size !== 10) {
      alert('Não é permitido números repetidos na aposta.');
      return;
    }

    setIsUpdatingBet(true);
    try {
      await firebaseService.updateBet(editingBet.id, {
        betName: editBetName,
        numbers: editBetNumbers
      });
      setEditingBet(null);
      alert('Aposta atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar aposta:', error);
      alert('Erro ao atualizar aposta.');
    } finally {
      setIsUpdatingBet(false);
    }
  };

  const handleDeleteBet = async (betId: string) => {
    if (!window.confirm('Deseja realmente excluir esta aposta? Esta ação não pode ser desfeita.')) return;
    
    try {
      await firebaseService.deleteBet(betId);
      alert('Aposta excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir aposta:', error);
      alert('Erro ao excluir aposta.');
    }
  };

  const toggleNumberInEdit = (num: number) => {
    setEditBetNumbers(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : (prev.length < 10 ? [...prev, num] : prev)
    );
  };

  const handleUpdatePrizes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContest) return;

    setIsUpdatingPrizes(true);
    try {
      await firebaseService.updateContestPrizes(activeContest.id, editingPrizes);
      await firebaseService.updateContestPrizeConfig(activeContest.id, editingPrizeConfig);
      setShowPrizeEditModal(false);
      alert('Premiações atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar premiações:', error);
      alert('Erro ao atualizar premiações.');
    } finally {
      setIsUpdatingPrizes(false);
    }
  };

  const handleFinalizeContest = async () => {
    if (!activeContest) return;
    setIsFinalizing(true);
    try {
      await firebaseService.updateContestStatus(activeContest.id, 'encerrado');
      setShowFinalizeConfirm(false);
      alert('Concurso finalizado com sucesso!');
    } catch (error) {
      console.error('Erro ao finalizar concurso:', error);
      alert('Erro ao finalizar concurso.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'master';

  const filteredRanking = rankingWithRanks.filter(b => 
    (b.betName || b.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.sellerCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mobile-p mobile-gap flex flex-col">
      <AnimatePresence>
        {/* Modal Pequeno de Regras */}
        {showRulesModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-24 right-4 z-[150] w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-lotofacil-purple font-bold text-xs uppercase tracking-widest">
                <HelpCircle size={14} />
                Regras Rápidas
              </div>
              <button 
                onClick={() => setShowRulesModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2 text-[10px] text-slate-600 leading-tight">
              <p>• <span className="font-bold text-slate-900">Sorteio 1:</span> Marque 10 pontos e ganhe o prêmio fixo.</p>
              <p>• <span className="font-bold text-slate-900">Rapidinha:</span> Quem tiver mais pontos no 1º sorteio leva.</p>
              <p>• <span className="font-bold text-slate-900">Total:</span> Maior pontuação acumulada (S1+S2+S3) vence o Bolão.</p>
              <p>• <span className="font-bold text-slate-900">Bônus:</span> 25 ou 28 pontos no total garantem prêmios especiais.</p>
            </div>
          </motion.div>
        )}

        {/* Modal Pequeno de Prêmios */}
        {/* Modal de Informações de Prêmios */}
        {showPrizesInfoModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-lotofacil-purple to-lotofacil-orange" />
              
              <button 
                onClick={() => setShowPrizesInfoModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-lotofacil-purple/10 rounded-2xl text-lotofacil-purple">
                  <Info size={32} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-display tracking-widest text-slate-900 uppercase">
                    {prizeInfoType === 'draw1' ? 'Regras do 1º Sorteio' : (prizeInfoType === 'bonus' ? 'Regras de Prêmios Bônus' : 'Estimativa de Prêmios')}
                  </h3>
                  <div className="w-12 h-1 bg-lotofacil-purple/20 mx-auto rounded-full" />
                </div>

                <div className="text-sm text-slate-600 leading-relaxed space-y-4">
                  {prizeInfoType === 'draw1' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-lotofacil-purple" />
                          <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">10 PONTOS</p>
                        </div>
                        <p className="font-bold text-slate-800 text-xs">Prêmio de R$ 300,00.</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-lotofacil-purple" />
                          <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">NÃO HAVENDO 10 PONTOS</p>
                        </div>
                        <p className="font-bold text-slate-800 text-xs">R$ 100,00 para a maior pontuação do dia.</p>
                      </div>
                    </div>
                  ) : prizeInfoType === 'bonus' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left">
                        <p className="font-bold text-amber-900 text-[10px] text-center uppercase tracking-widest mb-3">⚠️ REGRA DE UNIFICAÇÃO</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed text-center">
                          Somente <span className="font-black underline">UM</span> dos bônus é válido por edição para o líder. <br/>
                          <span className="font-black">OBS: Os valores já incluem o prêmio de 1º lugar.</span>
                        </p>
                      </div>

                      <div className="space-y-3 text-left">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-[10px] font-bold">1</div>
                          <p className="text-xs text-slate-700 leading-tight">Se o líder fizer <span className="font-bold">28 PONTOS</span>, ele leva o <span className="font-bold text-lotofacil-yellow-dark">SUPER BÔNUS 28</span>.</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-[10px] font-bold">2</div>
                          <p className="text-xs text-slate-700 leading-tight">O <span className="font-bold text-emerald-600">BÔNUS 25</span> é válido se <span className="font-black underline">NÃO</span> houver ganhador do 28.</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-[10px] font-bold">3</div>
                          <p className="text-xs text-slate-700 leading-tight">Apostas fora do 1º lugar <span className="font-bold text-red-500">NÃO</span> têm direito aos bônus.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] border-b border-slate-50 pb-1">
                        <span className="text-slate-500">Campeão:</span>
                        <span className="font-bold text-lotofacil-purple">{prizes.campeao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] border-b border-slate-50 pb-1">
                        <span className="text-slate-500">Rapidinha:</span>
                        <span className="font-bold text-lotofacil-yellow-dark">{prizes.rapidinha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] border-b border-slate-50 pb-1">
                        <span className="text-slate-500">Bônus 28+:</span>
                        <span className="font-bold text-slate-900">{prizes.fixed28Plus.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <p className="text-[8px] text-slate-400 italic text-center mt-2">Valores calculados com base nas apostas validadas.</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setShowPrizesInfoModal(false)}
                  className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-lg transition-all active:scale-95"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
                    {/* Optimized Header Section */}
      <div className="flex flex-col gap-3 sm:gap-6 pt-0 sm:pt-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <div className="px-1 sm:px-1.5 py-0.5 bg-emerald-500 text-white rounded-[4px] text-[7px] sm:text-[8px] font-black uppercase tracking-widest animate-pulse shadow-sm">Live</div>
              <p className="text-[8px] sm:text-[10px] font-black text-black uppercase tracking-[0.2em]">Tempo Real</p>
            </div>
            <h1 className="text-lg sm:text-4xl font-display tracking-[0.1em] sm:tracking-[0.5em] text-slate-900 uppercase leading-tight truncate sm:whitespace-normal">Classificação <span className="text-emerald-500">Ao Vivo</span></h1>
            <p className="text-[9px] sm:text-xs text-slate-400 font-medium truncate">Concurso #{activeContest.number} • {bets.length} Apostas</p>
            
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                <button 
                  onClick={() => setShowPrizeEditModal(true)}
                  className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-[#52d60c] text-white rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-widest border border-lotofacil-purple/10"
                >
                  Editar
                </button>
                <button 
                  onClick={() => setShowFinalizeConfirm(true)}
                  className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-50 text-red-600 rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-widest border border-red-100"
                >
                  Finalizar
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5 sm:gap-2 shrink-0">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              animate={{ 
                boxShadow: [
                  "0 0 0 rgba(147, 51, 234, 0)", 
                  "0 0 20px rgba(147, 51, 234, 0.4)", 
                  "0 0 0 rgba(147, 51, 234, 0)"
                ] 
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              onClick={() => setShowPrizesModal(true)}
              className="w-12 h-12 sm:w-20 sm:h-20 bg-white rounded-2xl sm:rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-emerald-100 flex flex-col items-center justify-center text-lotofacil-purple group relative overflow-hidden"
            >
               <div className="absolute inset-0 bg-lotofacil-purple/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <motion.div
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               >
                 <Gift size={20} className="sm:w-8 sm:h-8 mb-0.5 sm:mb-1" />
               </motion.div>
               <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-lotofacil-purple transition-colors">Prêmios</span>
               <div className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            </motion.button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button 
                onClick={() => setShowDownloadOptionsModal(true)}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-slate-400 rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-100 shadow-sm"
                title="Download"
              >
                <Download size={16} className="sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => setShowRulesModal(true)}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 text-slate-400 rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-100"
              >
                <HelpCircle size={16} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Faixa Rápida de Contagem Regressiva */}
      {timeLeft && activeContest.status === 'aberto' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowCountdownModal(true)}
          className="w-full bg-gradient-to-r from-red-500 via-amber-400 to-red-500 p-[1.5px] rounded-2xl animate-pulse-glow shadow-lg shadow-yellow-500/5 mb-2 cursor-pointer relative group overflow-hidden shrink-0"
        >
          <div className="bg-slate-950 rounded-[14px] px-3 py-2.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 overflow-hidden relative">
            <div className="absolute inset-0 bg-yellow-400/5 group-hover:bg-yellow-400/10 transition-all" />
            
            <div className="flex items-center gap-2 relative z-10">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-100 flex items-center gap-1.5">
                ⌛ REGISTRO DE APOSTAS FECHA EM:
              </span>
            </div>
            
            <div className="flex items-center gap-2 relative z-10 font-mono">
              {timeLeft.totalMs > 0 ? (
                <>
                  <div className="flex items-center gap-1">
                    <span className="bg-red-500/15 text-red-400 border border-red-500/30 rounded px-2 py-0.5 text-xs sm:text-sm font-black">
                      {timeLeft.hours.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">h</span>
                  </div>
                  <span className="text-red-500 font-black animate-pulse">:</span>
                  <div className="flex items-center gap-1">
                    <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-2 py-0.5 text-xs sm:text-sm font-black">
                      {timeLeft.minutes.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">m</span>
                  </div>
                  <span className="text-amber-400 font-black animate-pulse">:</span>
                  <div className="flex items-center gap-1">
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-2 py-0.5 text-xs sm:text-sm font-black">
                      {timeLeft.seconds.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">s</span>
                  </div>
                </>
              ) : (
                <span className="text-red-500 font-black tracking-widest animate-pulse text-[11px] sm:text-xs uppercase">
                  🚨 INSCRIÇÃO ENCERRADA! AGUARDANDO ADM FINALIZAR
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Modal Contagem Regressiva */}
      <AnimatePresence>
        {showCountdownModal && timeLeft && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-sm w-full shadow-2xl border-2 border-lotofacil-purple/30 relative overflow-hidden text-center space-y-6"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" />
              
              <button 
                onClick={() => setShowCountdownModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X size={20} />
              </button>

              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-400/15 rounded-3xl text-amber-500 animate-bounce-subtle mt-2">
                <Clock size={32} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-display tracking-widest text-slate-900 uppercase">
                  REGISTRO DE APOSTAS
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Concurso #{activeContest.number}
                </p>
              </div>

              {timeLeft.totalMs > 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 font-mono space-y-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">AS APOSTAS FECHAM EM:</p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-slate-950 leading-none">
                        {timeLeft.hours.toString().padStart(2, '0')}
                      </span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Horas</span>
                    </div>
                    <span className="text-2xl font-black text-slate-300 animate-pulse">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-slate-955 leading-none">
                        {timeLeft.minutes.toString().padStart(2, '0')}
                      </span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Minutos</span>
                    </div>
                    <span className="text-2xl font-black text-slate-300 animate-pulse">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-slate-950 leading-none">
                        {timeLeft.seconds.toString().padStart(2, '0')}
                      </span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Segundos</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 space-y-2 text-center">
                  <AlertCircle className="text-red-500 mx-auto" size={24} />
                  <p className="text-sm font-black text-red-600 uppercase tracking-wider">PRAZO ENCERRADO!</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">As apostas se encerraram para este concurso.</p>
                </div>
              )}

              <div className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-wider">
                Prazo final: <span className="text-slate-950 font-black">{activeContest.startDate?.split('-').reverse().join('/') || systemSettings?.poolStartDate}</span> às <span className="text-slate-950 font-black">{activeContest.startTime || systemSettings?.poolStartTime || '19:00'}</span>
              </div>

              {timeLeft.totalMs > 0 && (
                <button 
                  onClick={() => {
                    setShowCountdownModal(false);
                    const buttons = Array.from(document.querySelectorAll('button, a'));
                    const betButton = buttons.find(b => 
                      b.textContent?.toUpperCase().includes('APOSTAR') || 
                      b.textContent?.toUpperCase().includes('FAZER APOSTA')
                    ) as HTMLButtonElement;
                    
                    if (betButton) {
                      betButton.click();
                    } else {
                      window.location.href = '?view=bet';
                    }
                  }}
                  className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Ticket size={16} />
                  FAZER APOSTA AGORA!
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-6">
        <AnimatePresence>
          {showDownloadOptionsModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDownloadOptionsModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 text-center border-b border-slate-50">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Download size={32} />
                </div>
                <h2 className="text-xl font-display tracking-widest text-slate-900 uppercase">Download de Relatórios</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Selecione o formato desejado</p>
              </div>

              <div className="p-4 space-y-3">
                <button 
                  onClick={() => {
                    setDownloadType('excel');
                    setShowPasswordModal(true);
                    setShowDownloadOptionsModal(false);
                  }}
                  className="w-full group flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-2xl border border-emerald-500/10 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-[#107c41] text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0 group-hover:scale-110 transition-transform">
                    <Download size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#107c41] uppercase tracking-widest">Excel Spreadsheet</p>
                    <p className="text-[10px] text-emerald-600 font-medium font-mono">.xlsx format</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setDownloadType('pdf');
                    setShowPasswordModal(true);
                    setShowDownloadOptionsModal(false);
                  }}
                  className="w-full group flex items-center gap-4 p-4 bg-rose-50 hover:bg-rose-100 rounded-2xl border border-rose-500/10 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-[#e11d48] text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 shrink-0 group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#e11d48] uppercase tracking-widest">PDF Document</p>
                    <p className="text-[10px] text-rose-600 font-medium font-mono">.pdf format</p>
                  </div>
                </button>
              </div>

              <button 
                onClick={() => setShowDownloadOptionsModal(false)}
                className="w-full py-4 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-colors border-t border-slate-100"
              >
                Voltar
              </button>
            </motion.div>
          </div>
        )}
        {showPrizesModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPrizesModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden bg-[#f8fafc] rounded-[40px] shadow-2xl flex flex-col border border-white"
              >
                {/* Modal Header */}
                <div className="p-6 sm:p-10 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-lotofacil-purple/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 bg-lotofacil-purple/10 text-lotofacil-purple rounded-[22px] flex items-center justify-center shadow-inner">
                      <Gift size={32} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-display tracking-[0.2em] text-slate-900 uppercase">Valores do Concurso</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">Concurso #{activeContest.number}</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Atualizado Agora
                        </span>
                      </div>
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowPrizesModal(false)}
                    className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white transition-all shadow-sm border border-slate-100"
                  >
                    <X size={28} />
                  </motion.button>
                </div>

                {/* Modal Content */}
                <div className="p-4 sm:p-10 overflow-y-auto no-scrollbar space-y-10 custom-scrollbar">
                  {/* High Value Bonus Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                      <Crown size={20} className="text-lotofacil-yellow" />
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Bonus Especiais</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PrizeCard 
                        title="👑 SUPER BÔNUS 28" 
                        value={prizes.fixed28Plus} 
                        count={winners28Plus.length}
                        icon={Crown}
                        color="text-lotofacil-yellow"
                        bg="bg-slate-950"
                        border="border-lotofacil-yellow/30"
                        fullWidth
                        pointsLabel="28 Pontos na Soma"
                        variant="bonus28"
                        isFinished={isDraw1Finished && isDraw2Finished && isThirdDrawFinished}
                      />

                      <PrizeCard 
                        title="🔥 BÔNUS 25" 
                        value={prizes.fixed25Plus} 
                        count={winners25Plus.length}
                        icon={Medal}
                        color="text-[#10b981]"
                        bg="bg-emerald-50"
                        border="border-emerald-500/20"
                        fullWidth
                        pointsLabel="25 Pontos na Soma"
                        variant="bonus25"
                        isFinished={isDraw1Finished && isDraw2Finished && isThirdDrawFinished}
                        onInfoClick={() => {
                          setPrizeInfoType('bonus');
                          setShowPrizesInfoModal(true);
                        }}
                      />
                    </div>
                  </div>

                  {/* Main Grid Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                    <Trophy size={20} className="text-lotofacil-purple" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Premiação por Performance</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <PrizeCard 
                        title="⚡ RAPIDINHA" 
                        value={prizes.rapidinha} 
                        count={rapidinhaWinnersCount}
                        icon={Zap}
                        color="text-amber-600"
                        bg="bg-amber-50"
                        border="border-amber-100"
                        isFinished={isDraw1Finished}
                      />

                      <PrizeCard 
                        title="🏆 1º LUGAR" 
                        value={prizes.campeao} 
                        count={rankingWithRanks.filter(b => b.rank === 1 && maxTotalHits > 0).length}
                        icon={Trophy}
                        color="text-lotofacil-purple"
                        bg="bg-purple-50"
                        border="border-purple-100"
                        isFinished={isThirdDrawFinished}
                      />

                      <PrizeCard 
                        title="🥈 2º LUGAR" 
                        value={prizes.vice} 
                        count={rankingWithRanks.filter(b => b.rank === 2 && secondMaxTotalHits > 0).length}
                        icon={Award}
                        color="text-slate-600"
                        bg="bg-slate-50"
                        border="border-slate-100"
                        isFinished={isThirdDrawFinished}
                      />

                      <PrizeCard 
                        title="🎯 S1 | 10 PTS" 
                        value={prizes.fixed10PtsDraw1} 
                        count={winners10Pts[0].length}
                        icon={Target}
                        color="text-orange-600"
                        bg="bg-orange-50"
                        border="border-orange-100"
                        isFinished={isDraw1Finished}
                      />

                      <PrizeCard 
                        title="🎯 S2 | 10 PTS" 
                        value={prizes.fixed10PtsDraw2} 
                        count={winners10Pts[1].length}
                        icon={Target}
                        color="text-orange-600"
                        bg="bg-orange-50"
                        border="border-orange-100"
                        isFinished={isDraw2Finished}
                      />

                      <PrizeCard 
                        title="🎯 S3 | 10 PTS" 
                        value={prizes.fixed10PtsDraw3} 
                        count={winners10Pts[2].length}
                        icon={Target}
                        color="text-orange-600"
                        bg="bg-orange-50"
                        border="border-orange-100"
                        isFinished={isThirdDrawFinished}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Search and Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-3 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <h2 className="text-xs sm:text-lg font-display tracking-widest text-slate-900 uppercase">RANKING DO <span className="text-lotofacil-purple">CONCURSO</span></h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Sort Options */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ORDENAR</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg sm:rounded-xl border border-slate-200 flex-1 sm:flex-none">
                <button
                  onClick={() => setSortBy('points')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all",
                    sortBy === 'points' ? "bg-lotofacil-purple text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
                  )}
                >
                  Pontos
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all",
                    sortBy === 'name' ? "bg-lotofacil-purple text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
                  )}
                >
                  A-Z
                </button>
              </div>
            </div>

            {/* Displaying Always Open Highlighted Search Mechanism */}
            <div className="flex items-center w-full sm:w-72">
              <div 
                className="relative flex items-center w-full rounded-xl border-2 border-lotofacil-purple/40 bg-purple-50/50 hover:bg-purple-50 hover:border-lotofacil-purple/60 transition-all duration-300 shadow-sm"
              >
                <div className="w-10 h-10 flex items-center justify-center text-lotofacil-purple shrink-0">
                  <Search size={15} className="stroke-[2.5]" />
                </div>
                
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none py-2 pr-2 text-xs focus:outline-none placeholder:text-lotofacil-purple/50 text-lotofacil-purple font-bold uppercase transition-all"
                />

                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="w-8 h-8 flex items-center justify-center text-lotofacil-purple/60 hover:text-lotofacil-purple hover:bg-purple-200/50 rounded-lg mr-1 shrink-0 transition-all"
                  >
                    <X size={14} className="stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>


        <div className="overflow-x-auto no-scrollbar">
          {/* Draw Results Display */}
          <div className="px-4 py-4 bg-slate-900 text-white flex flex-col gap-3 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-lotofacil-purple/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-lotofacil-purple animate-pulse shadow-[0_0_8px_rgba(147,51,234,0.8)]" />
                <p className="text-lotofacil-purple font-black uppercase tracking-[0.2em]" style={{ fontSize: '14px', color: '#f5f5f5' }}>
                  RESULTADOS <span className="ml-1" style={{ color: '#eee6e6' }}>#{activeContest.number}</span>
                </p>
              </div>
              <div className="flex gap-1.5 p-1 rounded-lg border border-white/10" style={{ backgroundColor: '#030101' }}>
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    onClick={() => setSelectedDraw(i)}
                    className={cn(
                      "px-3 py-1 rounded-md text-[9px] font-black transition-all uppercase tracking-tighter",
                      selectedDraw === i 
                        ? "bg-lotofacil-purple text-white shadow-lg scale-105" 
                        : "hover:text-white/70 hover:bg-white/5"
                    )}
                    style={{
                      color: i === 0 ? '#0ded20' : i === 1 ? '#49ea11' : '#41ed0d'
                    }}
                  >
                    S{i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 relative z-10">
              <p className="font-bold uppercase tracking-widest" style={{ fontSize: '9px', color: '#85d707' }}>
                {selectedDraw + 1}º Sorteio Realizado
              </p>
              <div className="grid grid-cols-10 gap-2 w-fit">
                {activeContest.draws[selectedDraw]?.results?.length > 0 ? (
                  activeContest.draws[selectedDraw].results.sort((a, b) => a - b).map((num, i) => (
                    <motion.span 
                      key={num} 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white text-slate-900 flex items-center justify-center text-[10px] sm:text-xs font-black shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_-2px_4px_rgba(0,0,0,0.1)] border border-slate-200"
                    >
                      {num.toString().padStart(2, '0')}
                    </motion.span>
                  ))
                ) : (
                  <div className="col-span-10 flex items-center gap-2 py-2">
                    <Clock className="w-3 h-3 animate-spin-slow" style={{ color: '#ffffff' }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest italic" style={{ color: '#f5f5f5' }}>Aguardando sorteio oficial...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse min-w-full sm:min-w-[800px] compact-table relative">
            <thead className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm">
              <tr className="border-b border-slate-100">
                <th className="px-1 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest font-black text-black w-8 sm:w-12 text-center">Pos</th>
                <th className="px-1 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest font-black text-black">Participante</th>
                <th className="px-1 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest font-black text-black text-center">Vendedor</th>
                <th className="px-2 py-4 text-[9px] uppercase tracking-widest font-black text-black text-center hidden sm:table-cell">Números da Aposta</th>
                {[1, 2, 3].map((num, i) => (
                  <th 
                    key={num} 
                    onClick={() => setSelectedDraw(i)}
                    className={cn(
                      "px-1 py-4 text-[10px] sm:text-xs uppercase tracking-tighter font-black text-center w-8 sm:w-20 cursor-pointer transition-all shrink-0",
                      selectedDraw === i ? "bg-lotofacil-purple text-white shadow-inner" : 
                      i === 0 ? "text-black" :
                      i === 1 ? "text-emerald-500" :
                      "text-black"
                    )}
                  >
                    S{num}
                  </th>
                ))}
                <th className="px-1 py-4 uppercase tracking-tighter font-black text-center w-10 sm:w-24 shrink-0 bg-purple-50/30" style={{ color: '#7c9f04', fontSize: '12px' }}>Total</th>
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
                const has28Plus = totalHits >= 28;
                const has25Plus = totalHits >= 25;

                const prizeNames = [];
                if (isChampion) prizeNames.push('1º LUGAR');
                if (isVice) prizeNames.push('2º LUGAR');
                if (isRapidinha) prizeNames.push('RAPIDINHA');
                if (has10Pts) prizeNames.push('10 PONTOS');
                if (has28Plus) prizeNames.push('BÔNUS 28');
                if (has25Plus && !has28Plus) prizeNames.push('BÔNUS 25');

                const isWinner = prizeNames.length > 0;
                const isExpanded = expandedBetId === b.id;
                
                return (
                  <React.Fragment key={b.id}>
                    <tr 
                      onClick={() => setExpandedBetId(isExpanded ? null : b.id)}
                      className={cn(
                        "transition-all duration-300 cursor-pointer relative",
                        isExpanded ? "bg-slate-900 text-white shadow-2xl z-30 scale-[1.01] rounded-xl" : 
                        has28Plus ? "bg-amber-50/50 border-l-4 border-l-lotofacil-yellow" :
                        has25Plus ? "bg-emerald-50/50 border-l-4 border-l-emerald-500" :
                        isChampion ? "bg-amber-50/30" : 
                        isVice ? "bg-blue-50/30" :
                        "hover:bg-slate-50"
                      )}
                    >
                      <td className="px-0.5 py-2.5 sm:py-3">
                        <div className="relative w-fit mx-auto">
                          <div className={cn(
                            "w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-bold",
                            isExpanded ? "bg-white text-slate-900" :
                            b.rank === 1 ? "bg-lotofacil-purple text-white" : 
                            b.rank === 2 ? "bg-slate-300 text-slate-700" :
                            b.rank === 3 ? "bg-amber-600/20 text-amber-700" :
                            "bg-slate-100 text-slate-500"
                          )}>
                            {b.rank}º
                          </div>
                        </div>
                      </td>
                      <td className="px-1 py-2.5 sm:py-3 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <p className={cn(
                            "text-[10px] sm:text-xs font-bold uppercase truncate max-w-[100px] sm:max-w-none leading-tight",
                            isExpanded ? "text-white" : 
                            isChampion ? "text-amber-900" :
                            isVice ? "text-slate-900" : "text-slate-900"
                          )}>
                            {b.betName || b.userName}
                          </p>
                          {isChampion && <Trophy size={12} className={isExpanded ? "text-white" : "text-amber-600 animate-bounce-slow"} />}
                          {isVice && <Medal size={12} className={isExpanded ? "text-white" : "text-slate-500"} />}
                          {!isChampion && !isVice && b.rank === 1 && <Crown size={10} className={isExpanded ? "text-white" : "text-lotofacil-purple"} />}
                          <ChevronRight 
                            size={14} 
                            className={cn(
                              "transition-transform duration-300 ml-1",
                              isExpanded ? "rotate-90 text-white" : "text-slate-300"
                            )} 
                          />
                        </div>
                        
                        {/* Prize Labels */}
                        {isWinner && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {prizeNames.map(name => (
                              <span key={name} className={cn(
                                "text-[6px] sm:text-[7px] font-black px-1 rounded-[2px] uppercase tracking-tighter",
                                isExpanded ? "bg-white/20 text-white" :
                                name === '1º LUGAR' ? "bg-lotofacil-purple text-white" :
                                name === '2º LUGAR' ? "bg-blue-500 text-white" :
                                name === 'RAPIDINHA' ? "bg-yellow-500 text-slate-900" :
                                name === '10 PONTOS' ? "bg-lotofacil-purple text-white" :
                                "bg-lotofacil-purple text-white"
                              )}>
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Numbers Display - Extreme Compact for Mobile */}
                        {!isExpanded && (
                          <div className="flex flex-nowrap gap-0.5 mt-1 sm:hidden">
                            {b.numbers.map(num => {
                              const isHit = currentDrawResults.includes(num);
                              return (
                                <span 
                                  key={num} 
                                  className={cn(
                                    "text-[7px] font-bold px-0.5 rounded-[2px] border transition-all shrink-0",
                                    isHit 
                                      ? "bg-lotofacil-purple text-white border-lotofacil-purple shadow-[0_0_4px_rgba(107,33,168,0.4)] z-10" 
                                      : "bg-[#ffd700] text-black border-black/50"
                                  )}
                                >
                                  {num.toString().padStart(2, '0')}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-2.5 sm:py-3 text-center">
                        <p className={cn(
                          "text-[7px] sm:text-[9px] uppercase tracking-widest font-bold",
                          isExpanded ? "text-white/60" : "text-lotofacil-purple"
                        )}>
                          {b.sellerCode || '-'}
                        </p>
                      </td>
                      <td className="px-2 py-2.5 sm:py-3 hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          {b.numbers.map(num => {
                            const isHit = currentDrawResults.includes(num);
                            return (
                              <div 
                                key={num} 
                                className={cn(
                                  "w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all",
                                  isHit 
                                    ? (isExpanded ? "bg-white text-slate-900 border-white" : "bg-lotofacil-purple border-lotofacil-purple text-white shadow-sm scale-110 z-10")
                                    : (isExpanded ? "bg-white/10 border-white/10 text-white/40" : "bg-[#ffd700] border-black text-black")
                                )}
                              >
                                {num.toString().padStart(2, '0')}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className={cn(
                        "px-0.5 py-2.5 sm:py-3 text-center transition-all",
                        isExpanded ? "bg-white/5" : selectedDraw === 0 ? "bg-lotofacil-purple/10" : "bg-blue-50/30"
                      )}>
                        <span className={cn(
                          "text-[10px] sm:text-xs font-bold px-0.5 py-0.5 rounded-md",
                          isExpanded ? "text-white" : hits[0] >= 10 ? "bg-green-100 text-green-700" : "text-blue-700"
                        )}>
                          {hits[0]}
                        </span>
                      </td>
                      <td className={cn(
                        "px-0.5 py-2.5 sm:py-3 text-center transition-all",
                        isExpanded ? "bg-white/10" : selectedDraw === 1 ? "bg-lotofacil-purple/10" : "bg-green-50/30"
                      )}>
                        <span className={cn(
                          "text-[10px] sm:text-xs font-bold px-0.5 py-0.5 rounded-md",
                          isExpanded ? "text-white" : hits[1] >= 10 ? "bg-green-100 text-green-700" : "text-green-700"
                        )}>
                          {hits[1]}
                        </span>
                      </td>
                      <td className={cn(
                        "px-0.5 py-2.5 sm:py-3 text-center transition-all",
                        isExpanded ? "bg-white/5" : selectedDraw === 2 ? "bg-lotofacil-purple/10" : "bg-purple-50/30"
                      )}>
                        <span className={cn(
                          "text-[10px] sm:text-xs font-bold px-0.5 py-0.5 rounded-md",
                          isExpanded ? "text-white" : hits[2] >= 10 ? "bg-green-100 text-green-700" : "text-purple-700"
                        )}>
                          {hits[2]}
                        </span>
                      </td>
                      <td className={cn(
                        "px-0.5 py-2.5 sm:py-3 text-center transition-all",
                        isExpanded ? "bg-white/10" : "bg-[#1e3a8a] border-x border-white/10"
                      )}>
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            "text-xs sm:text-sm font-black",
                            isExpanded ? "text-white" : "text-[#ffd700]"
                          )}>
                            {totalHits}
                          </span>
                          {totalHits >= 25 && (
                            <span className={cn(
                              "text-[6px] font-bold px-1 rounded bg-white text-[#1e3a8a] mt-0.5"
                            )}>
                              BÔNUS {totalHits >= 28 ? '28' : '25'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expansion Row */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr className="bg-slate-900 border-none">
                          <td colSpan={8} className="px-4 pb-6 pt-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10 space-y-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Visualização Expandida</p>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-white uppercase">
                                      {currentDrawResults.length} de 15 sorteados
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-5 sm:grid-cols-15 gap-2 sm:gap-3">
                                  {b.numbers.map(num => {
                                    const isHit = currentDrawResults.includes(num);
                                    return (
                                      <div 
                                        key={num}
                                        className={cn(
                                          "aspect-square rounded-xl flex items-center justify-center text-sm sm:text-xl font-black border-2 transition-all",
                                          isHit 
                                            ? "bg-lotofacil-purple border-lotofacil-purple text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] scale-105" 
                                            : "bg-[#ffd700] border-black text-black"
                                        )}
                                      >
                                        {num.toString().padStart(2, '0')}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[9px] text-white/40 uppercase font-bold">Toque novamente para fechar</p>
                                    {isAdmin && (
                                      <>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditBet(b);
                                          }}
                                          className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[8px] font-bold text-white uppercase tracking-widest transition-all"
                                        >
                                          <Pencil size={8} />
                                          Editar
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteBet(b.id);
                                          }}
                                          className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-md text-[8px] font-bold text-red-500 uppercase tracking-widest transition-all"
                                        >
                                          <Trash2 size={8} />
                                          Excluir
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">ID: {b.id.slice(0, 8)}</p>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Footer */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-start gap-3">
        <Info className="text-lotofacil-purple shrink-0" size={18} />
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest">Informações sobre Premiações</p>
          <p className="text-[9px] text-slate-400 leading-relaxed">
            A classificação é atualizada em tempo real conforme os resultados da Lotofácil Oficial Caixa.
            Prêmios fixos (10 PTS nos Sorteios S1/S2/S3 e BÔNUS 25 PTS e 28 PTS) são garantidos. Em caso de empate, os prêmios são divididos igualmente entre os ganhadores.
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingBet && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display tracking-widest uppercase text-slate-900">Editar Aposta</h3>
                <button onClick={() => setEditingBet(null)} className="text-slate-400 hover:text-slate-600 transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nome na Aposta</label>
                  <input 
                    type="text" 
                    value={editBetName}
                    onChange={(e) => setEditBetName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50 font-bold uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Números ({editBetNumbers.length}/10)</label>
                    <button 
                      onClick={() => setEditBetNumbers([])}
                      className="text-[8px] font-bold text-red-500 uppercase tracking-widest hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 25 }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        onClick={() => toggleNumberInEdit(num)}
                        className={cn(
                          "aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all",
                          editBetNumbers.includes(num)
                            ? "bg-lotofacil-purple border-lotofacil-purple text-white shadow-md"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                        )}
                      >
                        {num.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setEditingBet(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all uppercase tracking-widest text-[10px] font-bold border border-slate-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateBet}
                  disabled={isUpdatingBet || editBetNumbers.length !== 10}
                  className="flex-1 py-3 rounded-xl bg-lotofacil-purple text-white hover:bg-lotofacil-purple/80 transition-all uppercase tracking-widest text-[10px] font-bold shadow-lg disabled:opacity-50"
                >
                  {isUpdatingBet ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
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
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Lock size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Acesso Restrito</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Insira a senha para baixar o Excel</p>
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
                        if (e.key === 'Enter') {
                          if (downloadType === 'excel') handleDownloadExcel();
                          else if (downloadType === 'pdf') handleDownloadPDF();
                        }
                      }}
                      className={cn(
                        "w-full bg-slate-50 border rounded-2xl py-4 px-6 focus:outline-none transition-all text-center font-black tracking-[0.3em]",
                        passwordError ? "border-red-500 text-red-500" : "border-slate-200 focus:border-emerald-500"
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
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        if (downloadType === 'excel') handleDownloadExcel();
                        else if (downloadType === 'pdf') handleDownloadPDF();
                      }}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showPrizeEditModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-lotofacil-purple/10 text-lotofacil-purple flex items-center justify-center">
                    <Trophy size={20} />
                  </div>
                  <h3 className="text-lg font-display tracking-widest text-slate-900 uppercase">Configurar Premiações</h3>
                </div>
                <button 
                  onClick={() => setShowPrizeEditModal(false)}
                  className="w-10 h-10 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
                <form id="prizes-form-live" onSubmit={handleUpdatePrizes} className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-lotofacil-purple" />
                      Descrições dos Prêmios (Textos)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: '1° Sorteio', key: 'draw1' },
                        { label: '2° Sorteio', key: 'draw2' },
                        { label: '3° Sorteio', key: 'draw3' },
                      ].map(item => (
                        <div key={item.key} className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">{item.label}</label>
                          <input 
                            type="text" 
                            value={(editingPrizes as any)[item.key]}
                            onChange={(e) => setEditingPrizes({...editingPrizes, [item.key]: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50 transition-all"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-emerald-500" />
                      Valores dos Prêmios Fixos (R$)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: '10 Pts (S1)', key: 'fixed10PtsDraw1' },
                        { label: '10 Pts (S2)', key: 'fixed10PtsDraw2' },
                        { label: '10 Pts (S3)', key: 'fixed10PtsDraw3' },
                        { label: 'Bônus 25 Pts', key: 'fixed25PlusTotal' },
                        { label: 'Super 28 Pts', key: 'fixed28PlusTotal' },
                      ].map(item => (
                        <div key={item.key} className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">{item.label}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                            <input 
                              type="number" 
                              value={(editingPrizeConfig as any)[item.key] || 0}
                              onChange={(e) => setEditingPrizeConfig({
                                ...editingPrizeConfig, 
                                [item.key]: parseFloat(e.target.value) || 0
                              })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all"
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPrizeEditModal(false)}
                  className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="prizes-form-live"
                  disabled={isUpdatingPrizes}
                  className="flex-1 py-4 bg-lotofacil-purple text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-lotofacil-purple/90 transition-all shadow-lg disabled:opacity-50"
                >
                  {isUpdatingPrizes ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showFinalizeConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 space-y-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-display tracking-widest text-slate-900 uppercase">Finalizar Concurso?</h3>
                <p className="text-slate-600 text-sm">
                  Deseja realmente encerrar o Concurso #{activeContest.number}? Isso impedirá novas alterações e moverá o concurso para o histórico.
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowFinalizeConfirm(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleFinalizeContest}
                  disabled={isFinalizing}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg"
                >
                  {isFinalizing ? 'ENCERRANDO...' : 'SIM, FINALIZAR'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface PrizeCardProps {
  title: string;
  value: number;
  count?: number;
  icon: any;
  color: string;
  bg: string;
  border: string;
  compact?: boolean;
  fullWidth?: boolean;
  pointsLabel?: string;
  variant?: 'default' | 'bonus25' | 'bonus28';
  isFinished?: boolean;
  onInfoClick?: () => void;
}

const PrizeCard: React.FC<PrizeCardProps> = ({ 
  title, value, count, icon: Icon, color, bg, border, fullWidth, pointsLabel, variant = 'default', isFinished, onInfoClick
}) => {
  const isPremium = variant === 'bonus28' || variant === 'bonus25';
  
  // High contrast gradients for Jackpots/Special Bonuses, or gorgeous subtle pastel for standard cards
  const containerClasses = cn(
    "group relative flex flex-row items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-300 overflow-hidden",
    variant === 'bonus28' ? "bg-gradient-to-br from-slate-900 via-amber-950/80 to-slate-950 text-white border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.15)] hover:scale-[1.01]" :
    variant === 'bonus25' ? "bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:scale-[1.01]" :
    cn(
      bg.includes('amber') || bg.includes('yellow') ? "bg-amber-50/40 border-amber-200/50 hover:border-amber-300" :
      bg.includes('purple') ? "bg-purple-50/40 border-purple-200/60 hover:border-purple-300" :
      bg.includes('slate') || bg.includes('gray') ? "bg-sky-50/40 border-sky-200/60 hover:border-sky-300" :
      bg.includes('orange') ? "bg-slate-50/60 border-slate-200/60 hover:border-slate-300" :
      "bg-slate-50 border-slate-200 hover:border-slate-350"
    )
  );

  const iconContainerClasses = cn(
    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300",
    variant === 'bonus28' ? "bg-amber-500/20 border-amber-500/30 text-amber-400" :
    variant === 'bonus25' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
    cn(
      bg.includes('amber') || bg.includes('yellow') ? "bg-amber-100/50 text-amber-600 border-amber-200/50" :
      bg.includes('purple') ? "bg-purple-100/50 text-lotofacil-purple border-purple-200/50" :
      bg.includes('slate') || bg.includes('gray') ? "bg-sky-100/50 text-slate-600 border-sky-200/50" :
      bg.includes('orange') ? "bg-slate-100/80 text-orange-600 border-slate-200/60" :
      "bg-slate-100 text-slate-500 border-slate-200"
    )
  );

  // Calculate divided value if multiple winners
  const displayValue = count && count > 1 ? value / count : value;

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={containerClasses}
    >
      {/* Decorative bg glow for premium cards */}
      {variant === 'bonus28' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
      )}
      {variant === 'bonus25' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex items-center gap-4 relative z-10 w-full justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {/* Icon */}
          <div className={iconContainerClasses}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Core Info */}
          <div className="min-w-0 text-left">
            <p className={cn(
              "text-[9px] font-black uppercase tracking-[0.15em] mb-0.5",
              variant === 'bonus28' ? "text-amber-400" : 
              variant === 'bonus25' ? "text-emerald-400" : 
              bg.includes('amber') || bg.includes('yellow') ? "text-amber-700" :
              bg.includes('purple') ? "text-purple-700" :
              bg.includes('slate') || bg.includes('gray') ? "text-sky-700" :
              bg.includes('orange') ? "text-slate-500" :
              "text-slate-400"
            )}>
              {pointsLabel || (variant === 'bonus28' ? "👑 Super Bônus" : variant === 'bonus25' ? "🔥 Bônus" : "Estimativa")}
            </p>
            <h3 className={cn(
              "text-xs sm:text-sm font-black uppercase tracking-wider truncate",
              isPremium ? "text-slate-200" : "text-slate-800"
            )}>
              {title.replace('🔥 ', '').replace('👑 ', '')}
            </h3>

            {/* Badges for status or winners */}
            <div className="mt-1.5 flex flex-wrap gap-2 items-center">
              {(!isFinished || (count !== undefined && count > 0)) ? (
                <div className={cn(
                  "px-2 py-0.5 rounded-full border text-[7px] sm:text-[9px] font-bold uppercase tracking-widest flex items-center gap-1",
                  isPremium ? "bg-white/5 border-white/10 text-slate-350" : 
                  "bg-white/80 border-slate-150 text-slate-500"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", isFinished ? "bg-emerald-500" : "bg-orange-400 animate-pulse")} />
                  {isFinished ? `${count || 0} Ganhadores` : "Aguardando..."}
                </div>
              ) : (
                <div className={cn(
                  "px-2 py-0.5 rounded-full border text-[7px] sm:text-[9px] font-bold uppercase tracking-widest",
                  isPremium ? "bg-white/5 border-red-500/20 text-red-400" : "bg-white/80 border-red-100 text-red-500"
                )}>
                  Acumulado
                </div>
              )}

              {onInfoClick && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onInfoClick();
                  }}
                  className={cn(
                    "text-[7px] sm:text-[9px] items-center gap-0.5 font-bold uppercase tracking-widest transition-colors inline-flex border px-2 py-0.5 rounded-full",
                    isPremium ? "bg-white/5 border-white/10 text-slate-300 hover:text-white" : "bg-white/80 border-slate-150 text-slate-400 hover:text-lotofacil-purple"
                  )}
                >
                  Regras
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pricing tag */}
        <div className="text-right shrink-0">
          <p className={cn(
            "text-lg sm:text-xl font-black tracking-tight leading-none",
            variant === 'bonus28' ? "text-amber-400" :
            variant === 'bonus25' ? "text-emerald-400" :
            "text-slate-900"
          )}>
            {displayValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            {count && count > 1 ? (
              <span className="text-[8px] font-bold uppercase tracking-normal block mt-1 text-slate-400">
                Cada
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveRanking;
