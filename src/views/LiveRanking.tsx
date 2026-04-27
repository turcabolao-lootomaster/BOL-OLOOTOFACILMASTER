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
  Calendar
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
  const [sortBy, setSortBy] = useState<'points' | 'name'>('points');
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
    fixed27PlusTotal: 5000,
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
  const [showStartBubble, setShowStartBubble] = useState(true);

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
    fixed27PlusTotal: 5000
  };

  const prizes = {
    rapidinha: activeContest.displayPrizes?.rapidinha ?? (totalRevenue * (prizeConfig.pctRapidinha || 0.10)),
    campeao: activeContest.displayPrizes?.champion ?? (totalRevenue * (prizeConfig.pctChampion || 0.45)),
    vice: activeContest.displayPrizes?.vice ?? (totalRevenue * (prizeConfig.pctVice || 0.15)),
    fixed10PtsDraw1: activeContest.displayPrizes?.draw1 ?? (maxS1Hits >= 10 ? (prizeConfig.fixed10PtsDraw1 || 300) : 100),
    fixed10PtsDraw2: activeContest.displayPrizes?.draw2 ?? (prizeConfig.fixed10PtsDraw2 || 300),
    fixed10PtsDraw3: activeContest.displayPrizes?.draw3 ?? (prizeConfig.fixed10PtsDraw3 || 300),
    fixed25Plus: activeContest.displayPrizes?.bonus25 ?? (prizeConfig.fixed25PlusTotal || 2000),
    fixed27Plus: activeContest.displayPrizes?.bonus27 ?? (prizeConfig.fixed27PlusTotal || 5000)
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

  const winners27Plus = rankingWithRanks.filter(b => b.rank === 1 && b.totalHits >= 27);
  const winners25Plus = rankingWithRanks.filter(b => b.rank === 1 && b.totalHits >= 25 && b.totalHits < 27);

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
      { label: '1º SORTEIO 10 PTS', value: prizes.fixed10PtsDraw1, color: [255, 247, 237], textColor: [234, 88, 12] },
      { label: '2º SORTEIO 10 PTS', value: prizes.fixed10PtsDraw2, color: [255, 247, 237], textColor: [234, 88, 12] },
      { label: '3º SORTEIO 10 PTS', value: prizes.fixed10PtsDraw3, color: [255, 247, 237], textColor: [234, 88, 12] },
      { label: 'RAPIDINHA', value: prizes.rapidinha, color: [255, 251, 235], textColor: [217, 119, 6] },
      { label: '1º LUGAR', value: prizes.campeao, color: [245, 243, 255], textColor: [124, 58, 237] },
      { label: '2º LUGAR', value: prizes.vice, color: [239, 246, 255], textColor: [37, 99, 235] }
    ];

    const bonusCards = [
      { label: 'BÔNUS 25', value: prizes.fixed25Plus, color: [16, 185, 129], sub: '25 PTS NA SOMA TOTAL' },
      { label: 'SUPER BÔNUS 27', value: prizes.fixed27Plus, color: [15, 23, 42], sub: '27 PTS NA SOMA TOTAL' }
    ];

    const cardWidth = (pageWidth - 40) / 3;
    const cardHeight = 22;
    const startX = 15;
    const startY = 50;

    prizeCards.forEach((card, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = startX + (cardWidth + 5) * col;
      const y = startY + (cardHeight + 5) * row;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');
      
      // Icon placeholder
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(x + 4, y + 4, 12, 14, 2, 2, 'F');
      
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text('ESTIMATIVA', x + cardWidth - 5, y + 6, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setTextColor(card.textColor[0], card.textColor[1], card.textColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), x + cardWidth - 5, y + 12, { align: 'right' });
      
      doc.setFontSize(6);
      doc.setTextColor(30, 41, 59);
      doc.text(card.label, x + cardWidth - 5, y + 17, { align: 'right' });
      
      doc.setFontSize(4);
      doc.setTextColor(148, 163, 184);
      doc.text('0 GANHADOR(ES) NO...', x + cardWidth - 5, y + 20, { align: 'right' });
    });

    // Bonus Cards
    bonusCards.forEach((card, i) => {
      const y = startY + (cardHeight + 5) * 2 + (16 + 3) * i;
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(startX, y, pageWidth - 30, 16, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(card.label, startX + 25, y + 7);
      
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(card.sub, startX + 25, y + 12);
      
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(card.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - 20, y + 10, { align: 'right' });
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
      'POS', 'CLIENTE', 'VENDEDOR', 
      'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10',
      'S1', 'S2', 'S3', 'SOMA'
    ];

    const data = rankingWithRanks.map((b: any) => {
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
      const has27Plus = b.totalHits >= 27;

      const prizeLabels = [];
      if (isChampion) prizeLabels.push('[1º LUGAR]');
      if (isVice) prizeLabels.push('[2º LUGAR]');
      if (isRapidinha) prizeLabels.push('[RAPIDINHA]');
      if (has10Pts) prizeLabels.push('[10 PONTOS]');
      if (has27Plus) prizeLabels.push('[27+ PONTOS]');

      const nameWithPrizes = `${(b.betName || b.userName).toUpperCase()} ${prizeLabels.join(' ')}`.trim();
      
      return [
        `${b.rank}º`,
        nameWithPrizes,
        b.sellerCode || '-',
        ...numCols,
        hits[0],
        hits[1],
        hits[2],
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
      margin: { left: 49.5 }, // Centering the table (297 - 198) / 2
      styles: { fontSize: 7, halign: 'center', cellPadding: 1.2, font: 'helvetica' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { fillColor: [241, 245, 249], fontStyle: 'bold', cellWidth: 10 }, // POS
        1: { halign: 'left', cellWidth: 60 }, // CLIENTE (Increased width)
        2: { cellWidth: 20 }, // VENDEDOR
        3: { cellWidth: 7 }, 4: { cellWidth: 7 }, 5: { cellWidth: 7 }, 6: { cellWidth: 7 }, 7: { cellWidth: 7 },
        8: { cellWidth: 7 }, 9: { cellWidth: 7 }, 10: { cellWidth: 7 }, 11: { cellWidth: 7 }, 12: { cellWidth: 7 },
        13: { fillColor: [219, 234, 254], textColor: [30, 58, 138], fontStyle: 'bold', cellWidth: 8 }, // S1
        14: { fillColor: [255, 237, 213], textColor: [154, 52, 18], fontStyle: 'bold', cellWidth: 8 }, // S2
        15: { fillColor: [243, 232, 255], textColor: [107, 33, 168], fontStyle: 'bold', cellWidth: 8 }, // S3
        16: { fillColor: [30, 58, 138], textColor: [255, 215, 0], fontStyle: 'bold', fontSize: 9, cellWidth: 14 } // SOMA
      },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const rowInfo = rankingWithRanks[data.row.index];
          const betId = rowInfo.id;
          const rank = rowInfo.rank;
          
          // Row Highlighting based on Rank
          if (data.column.index <= 2) {
            if (rank === 1) {
              data.cell.styles.fillColor = [255, 237, 213]; // Orange 100 (Gold/Bronze) - More distinct than Amber 50
              data.cell.styles.fontStyle = 'bold';
            } else if (rank === 2) {
              data.cell.styles.fillColor = [219, 234, 254]; // Blue 100 (Silver/Blue) - Clearly distinct from white
              data.cell.styles.fontStyle = 'bold';
            } else {
              // Check for other special winners (Rapidinha, 10pts etc)
              const isOtherWinner = winners10Pts.some(w => w.some(wb => wb.id === betId)) || 
                                   rapidinhaLeader?.id === betId || 
                                   winners25Plus.some(w => w.id === betId) || 
                                   winners27Plus.some(w => w.id === betId);
              
              if (isOtherWinner) {
                data.cell.styles.fillColor = [241, 245, 249]; // Slate 50
              }
            }
          }

          // Highlight hit numbers for the SELECTED draw only
          if (data.column.index >= 3 && data.column.index <= 12) {
            const num = data.cell.raw;
            if (typeof num === 'number' && currentDrawResults.includes(num)) {
              data.cell.styles.fillColor = [107, 33, 168]; // Purple highlight
              data.cell.styles.textColor = 255;
              data.cell.styles.fontStyle = 'bold';
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
              <p>• <span className="font-bold text-slate-900">Bônus:</span> 25 ou 27 pontos no total garantem prêmios especiais.</p>
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
                          <p className="text-xs text-slate-700 leading-tight">Se o líder fizer <span className="font-bold">27 PONTOS</span>, ele leva o <span className="font-bold text-lotofacil-yellow-dark">SUPER BÔNUS 27</span>.</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-[10px] font-bold">2</div>
                          <p className="text-xs text-slate-700 leading-tight">O <span className="font-bold text-emerald-600">BÔNUS 25</span> é válido se <span className="font-black underline">NÃO</span> houver ganhador do 27.</p>
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
                        <span className="text-slate-500">Bônus 27+:</span>
                        <span className="font-bold text-slate-900">{prizes.fixed27Plus.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
        {/* Balão de Fala Verde - Data de Início */}
        {showStartBubble && systemSettings?.poolStartDate && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10, x: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-20 right-6 z-[160] max-w-[200px]"
          >
            <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-xl relative animate-bounce-subtle">
              <button 
                onClick={() => setShowStartBubble(false)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-white text-emerald-500 rounded-full flex items-center justify-center shadow-md hover:bg-emerald-50 transition-colors border border-emerald-100"
              >
                <X size={10} strokeWidth={3} />
              </button>
              
              <div className="flex items-start gap-2">
                <Calendar size={14} className="shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-tighter opacity-80">Início do Bolão</p>
                  <p className="text-[11px] font-bold leading-tight">
                    {systemSettings.poolStartDate.split('-').reverse().join('/')} às {systemSettings.poolStartTime || '20:00'}
                  </p>
                </div>
              </div>

              {/* Speech Bubble Tail */}
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-emerald-500 rotate-45 transform origin-center" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 relative">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-1.5 py-0.5 rounded-sm bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]">
              <span className="text-[8px] font-black text-white uppercase tracking-widest">LIVE</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Tempo Real</span>
          </div>
          <h1 className="text-lg sm:text-4xl font-display tracking-widest text-slate-900 uppercase">
            CLASSIFICAÇÃO <span className="text-emerald-500">AO VIVO</span>
          </h1>
          <p className="text-[10px] sm:text-sm text-slate-600 mt-1">
            Concurso #{activeContest.number} • {bets.length} Apostas Validadas
          </p>
          
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button 
                onClick={() => setShowPrizeEditModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-lotofacil-purple/10 text-lotofacil-purple rounded-lg hover:bg-lotofacil-purple/20 transition-all text-[10px] font-bold uppercase tracking-widest border border-lotofacil-purple/20"
              >
                <Trophy size={14} />
                Editar Premiações
              </button>
              <button 
                onClick={() => setShowFinalizeConfirm(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-[10px] font-bold uppercase tracking-widest border border-red-100"
              >
                <X size={14} />
                Finalizar Concurso
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          {/* Botões de Informação Rápida */}
          <div className="flex items-center justify-end gap-2 mb-2">
            <button 
              onClick={() => setShowRulesModal(true)}
              className="p-2 bg-white/50 hover:bg-lotofacil-purple/10 text-slate-500 hover:text-lotofacil-purple rounded-full transition-all border border-slate-200"
              title="Regras"
            >
              <HelpCircle size={18} />
            </button>
            <button 
              onClick={() => setShowPrizesInfoModal(true)}
              className="p-2 bg-white/50 hover:bg-lotofacil-yellow/20 text-slate-500 hover:text-lotofacil-yellow-dark rounded-full transition-all border border-slate-200"
              title="Premiação"
            >
              <Gift size={18} />
            </button>
            {!showStartBubble && systemSettings?.poolStartDate && (
              <button 
                onClick={() => setShowStartBubble(true)}
                className="p-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-full transition-all border border-emerald-500/20"
                title="Ver Data de Início"
              >
                <Calendar size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setDownloadType('excel');
                setShowPasswordModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 text-xs font-bold"
              title="Baixar Excel"
            >
              <Download size={16} />
              <span>EXCEL</span>
            </button>
            <button 
              onClick={() => {
                setDownloadType('pdf');
                setShowPasswordModal(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white transition-all shadow-lg shadow-red-200 flex items-center gap-2 text-xs font-bold"
              title="Baixar PDF"
            >
              <FileText size={16} />
              <span>PDF</span>
            </button>
          </div>

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

      {/* 10 PTS Prizes Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[1, 2, 3].map(num => (
          <PrizeCard 
            key={num}
            title={`${num}º SORTEIO 10 PTS`} 
            value={num === 1 ? prizes.fixed10PtsDraw1 : num === 2 ? prizes.fixed10PtsDraw2 : prizes.fixed10PtsDraw3} 
            count={num === 1 && maxS1Hits < 10 && maxS1Hits > 0 ? rapidinhaWinnersCount : winners10Pts[num-1].length}
            icon={Target}
            color="text-orange-600"
            bg="bg-orange-50"
            border="border-orange-200"
            compact
            isFinished={num === 1 ? isDraw1Finished : num === 2 ? isDraw2Finished : isThirdDrawFinished}
            onInfoClick={num === 1 ? () => {
              setPrizeInfoType('draw1');
              setShowPrizesInfoModal(true);
            } : undefined}
          />
        ))}
      </div>

      {/* Main Prizes Row (Rapidinha, 1st, 2nd) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <PrizeCard 
          title="RAPIDINHA" 
          value={prizes.rapidinha} 
          count={rapidinhaWinnersCount}
          icon={Zap}
          color="text-yellow-500"
          bg="bg-white"
          border="border-yellow-100"
          compact
          isFinished={isDraw1Finished}
        />
        <PrizeCard 
          title="1º LUGAR" 
          value={prizes.campeao} 
          count={rankingWithRanks.filter(b => b.totalHits === maxTotalHits && maxTotalHits > 0).length}
          icon={Crown}
          color="text-lotofacil-purple"
          bg="bg-lotofacil-purple/5"
          border="border-lotofacil-purple/10"
          compact
          isFinished={isThirdDrawFinished}
        />
        <PrizeCard 
          title="2º LUGAR" 
          value={prizes.vice} 
          count={rankingWithRanks.filter(b => b.totalHits === secondMaxTotalHits && secondMaxTotalHits > 0).length}
          icon={Award}
          color="text-blue-500"
          bg="bg-blue-50"
          border="border-blue-100"
          compact
          isFinished={isThirdDrawFinished}
        />
      </div>

      {/* Special Prizes */}
      <div className="w-full space-y-3">
        <div className="max-w-4xl mx-auto w-full">
          <PrizeCard 
            title="🏆 Super Bônus 27" 
            value={prizes.fixed27Plus} 
            count={winners27Plus.length}
            icon={Star}
            color="text-lotofacil-yellow"
            bg="bg-lotofacil-yellow/10"
            border="border-lotofacil-yellow/20"
            fullWidth
            pointsLabel="27 PTS NA SOMA TOTAL"
            variant="bonus27"
            isFinished={isThirdDrawFinished}
            onInfoClick={() => {
              setPrizeInfoType('bonus');
              setShowPrizesInfoModal(true);
            }}
          />
        </div>
        <div className="max-w-4xl mx-auto w-full">
          <PrizeCard 
            title="🔥 BÔNUS 25" 
            value={prizes.fixed25Plus} 
            count={winners25Plus.length}
            icon={Medal}
            color="text-white"
            bg="bg-emerald-500"
            border="border-emerald-400"
            fullWidth
            pointsLabel="25 PTS NA SOMA TOTAL"
            variant="bonus25"
            isFinished={isThirdDrawFinished}
            onInfoClick={() => {
              setPrizeInfoType('bonus');
              setShowPrizesInfoModal(true);
            }}
          />
        </div>
      </div>

      {/* Search and Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm sm:text-lg font-display tracking-widest text-slate-900 uppercase">RANKING DO <span className="text-lotofacil-purple">CONCURSO</span></h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Sort Options */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ORDENAR POR</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-1 sm:flex-none">
                <button
                  onClick={() => setSortBy('points')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  sortBy === 'points' ? "bg-lotofacil-purple text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
                )}
              >
                Pontos
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  sortBy === 'name' ? "bg-lotofacil-purple text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
                )}
              >
                A-Z
              </button>
            </div>
          </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Buscar participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-dark-border/40 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-lotofacil-purple/50 transition-all"
              />
            </div>
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
          <div className="px-4 py-4 bg-slate-900 text-white flex flex-col gap-3 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-lotofacil-purple/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-lotofacil-purple animate-pulse shadow-[0_0_8px_rgba(147,51,234,0.8)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lotofacil-purple">
                  RESULTADOS <span className="text-white/40 ml-1">#{activeContest.number}</span>
                </p>
              </div>
              <div className="flex gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10">
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    onClick={() => setSelectedDraw(i)}
                    className={cn(
                      "px-3 py-1 rounded-md text-[9px] font-black transition-all uppercase tracking-tighter",
                      selectedDraw === i 
                        ? "bg-lotofacil-purple text-white shadow-lg scale-105" 
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    S{i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 relative z-10">
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">
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
                    <Clock className="w-3 h-3 text-white/20 animate-spin-slow" />
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest italic">Aguardando sorteio oficial...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse min-w-full sm:min-w-[800px] compact-table">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-0.5 py-3 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-slate-500 w-6 sm:w-10 text-center shrink-0">Pos</th>
                <th className="px-1 py-3 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-slate-500">Participante</th>
                <th className="px-1 py-3 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-slate-500 text-center">Vendedor</th>
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
                const has27Plus = totalHits >= 27 && b.rank === 1;
                const has25Plus = totalHits >= 25 && b.rank === 1;

                const prizeNames = [];
                if (isChampion) prizeNames.push('1º LUGAR');
                if (isVice) prizeNames.push('2º LUGAR');
                if (isRapidinha) prizeNames.push('RAPIDINHA');
                if (has10Pts) prizeNames.push('10 PONTOS');
                if (has27Plus) prizeNames.push('BÔNUS 27');
                if (has25Plus && !has27Plus) prizeNames.push('BÔNUS 25');

                const isWinner = prizeNames.length > 0;
                const isExpanded = expandedBetId === b.id;
                
                return (
                  <React.Fragment key={b.id}>
                    <tr 
                      onClick={() => setExpandedBetId(isExpanded ? null : b.id)}
                      className={cn(
                        "transition-all duration-300 cursor-pointer relative",
                        isExpanded ? "bg-slate-900 text-white shadow-2xl z-30 scale-[1.02] rounded-xl" : 
                        isChampion ? "bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 hover:from-amber-100 hover:via-amber-200 hover:to-amber-100/80 border-y border-amber-200/50 shadow-sm" : 
                        isVice ? "bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 hover:from-blue-100 hover:via-blue-200 hover:to-blue-100/80 border-y border-blue-200/50 shadow-sm" :
                        hits[selectedDraw] >= 10 ? "bg-orange-100/40 hover:bg-orange-200/60" :
                        isRapidinha ? "bg-yellow-100/40 hover:bg-yellow-100/60" :
                        isWinner ? "bg-lotofacil-purple/5 hover:bg-lotofacil-purple/10" : "hover:bg-slate-50"
                      )}
                    >
                      <td className="px-0.5 py-3">
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
                      <td className="px-1 py-3 pr-4">
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
                      <td className="px-1 py-3 text-center">
                        <p className={cn(
                          "text-[7px] sm:text-[9px] uppercase tracking-widest font-bold",
                          isExpanded ? "text-white/60" : "text-lotofacil-purple"
                        )}>
                          {b.sellerCode || '-'}
                        </p>
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
                        "px-0.5 py-3 text-center transition-all",
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
                        "px-0.5 py-3 text-center transition-all",
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
                        "px-0.5 py-3 text-center transition-all",
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
                        "px-0.5 py-3 text-center transition-all",
                        isExpanded ? "bg-white/10" : "bg-[#1e3a8a] border-x border-white/10"
                      )}>
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            "text-xs sm:text-sm font-black",
                            isExpanded ? "text-white" : "text-[#ffd700]"
                          )}>
                            {totalHits}
                          </span>
                          {totalHits >= 25 && b.rank === 1 && (
                            <span className={cn(
                              "text-[6px] font-bold px-1 rounded bg-white text-[#1e3a8a]"
                            )}>
                              BÔNUS {totalHits >= 27 ? '27' : '25'}
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
            Prêmios fixos (10 PTS nos Sorteios S1/S2/S3 e BÔNUS 25 PTS e 27 PTS) são garantidos. Em caso de empate, os prêmios são divididos igualmente entre os ganhadores.
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
                        { label: 'Super 27 Pts', key: 'fixed27PlusTotal' },
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
  variant?: 'default' | 'bonus25' | 'bonus27';
  isFinished?: boolean;
  onInfoClick?: () => void;
}

const PrizeCard: React.FC<PrizeCardProps> = ({ 
  title, value, count, icon: Icon, color, bg, border, compact, fullWidth, pointsLabel, variant = 'default', isFinished, onInfoClick
}) => (
  <div className={cn(
    "glass-card border transition-all relative overflow-hidden group",
    compact ? "p-2 sm:p-3" : fullWidth ? "p-3 sm:p-5" : "p-4 sm:p-6",
    border,
    variant === 'bonus27' ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-lotofacil-yellow/40 shadow-[0_15px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(234,179,8,0.1)]" :
    variant === 'bonus25' ? "bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-600 text-white border-emerald-400/30 shadow-[0_15px_35px_rgba(16,185,129,0.25)]" :
    "bg-white"
  )}>
    {fullWidth ? (
      <div className="flex flex-row items-center justify-between gap-4 sm:gap-10 relative z-10">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className={cn(
            "w-10 h-10 sm:w-16 sm:h-16 rounded-2xl border shadow-lg flex items-center justify-center shrink-0 rotate-3 group-hover:rotate-0 transition-transform duration-500",
            variant === 'bonus27' ? "bg-lotofacil-yellow/20 border-lotofacil-yellow/30 shadow-lotofacil-yellow/20" : "bg-white/20 border-white/30 shadow-white/10"
          )}>
            <Icon className={variant === 'bonus27' ? "text-lotofacil-yellow" : "text-white"} size={variant === 'bonus27' ? 20 : 24} />
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            <h2 className={cn(
              "text-[13px] sm:text-[25px] font-black uppercase tracking-[0.2em] drop-shadow-lg sm:leading-[30px] flex items-center gap-2",
              variant === 'bonus27' ? "text-lotofacil-yellow" : "text-white"
            )}>
              {(isFinished && variant === 'default') ? `${title} (${count || 0} Ganhadores)` : title}
              {onInfoClick && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onInfoClick();
                  }}
                  className="p-1 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                >
                  <HelpCircle size={16} className="sm:w-6 sm:h-6" />
                </button>
              )}
            </h2>
            <div className="flex items-center gap-2">
              {(count !== undefined && (count > 0 || !isFinished)) ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded-full border border-white/10">
                  <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[6px] sm:text-[13px] font-black text-[#f7f7f7] uppercase tracking-widest">
                    {count} ganhador(es)
                  </p>
                </div>
              ) : (isFinished && count === 0) && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 rounded-full border border-red-500/30">
                  <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[6px] sm:text-[13px] font-black text-red-100 uppercase tracking-widest">
                    ACUMULADO
                  </p>
                </div>
              )}
              <div className={cn(
                "px-1.5 py-0.5 rounded-full border",
                variant === 'bonus27' ? "bg-lotofacil-yellow/10 border-lotofacil-yellow/20 text-lotofacil-yellow" : "bg-white/10 border-white/20 text-white"
              )}>
                <p className="text-[6px] sm:text-[13px] font-black uppercase tracking-widest text-[#f7f7f7]">
                  {pointsLabel || (variant === 'bonus27' ? "27+ PONTOS" : "25 PONTOS")}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right sm:bg-transparent rounded-2xl sm:border-0">
          {(variant !== 'bonus25' && variant !== 'bonus27') && (
            <p className="text-[6px] sm:text-[11px] font-black text-white/60 uppercase tracking-[0.1em] mb-0.5">Estimativa</p>
          )}
          <p className={cn(
            "text-lg sm:text-4xl font-black tracking-tighter drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]",
            "text-white"
          )}>
            {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 sm:gap-4 relative z-10">
        <div className={cn(
          "rounded-[0.75rem] sm:rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
          "w-8 h-8 sm:w-16 sm:h-16",
          bg
        )}>
          <Icon className={cn(color, "sm:w-6 sm:h-6")} size={14} />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-400 font-black text-[5px] sm:text-[9px] mb-0.5">
            Estimativa
          </p>
          <div className="flex items-center justify-end gap-1 font-black tracking-tighter leading-none">
            {onInfoClick && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onInfoClick();
                }}
                className="p-1 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-lotofacil-purple"
              >
                <HelpCircle className="w-2.5 h-2.5 sm:w-5 sm:h-5" />
              </button>
            )}
            <p className={cn(
              "text-[9px] sm:text-2xl",
              color
            )}>
              {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <p className="font-bold uppercase tracking-widest truncate text-slate-900 text-[6px] sm:text-[11px] mt-0.5 sm:mt-1">
            {title}
          </p>
          
          <div className="mt-1 sm:mt-2 flex items-center justify-end">
            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200 shadow-sm">
              <div className={cn("w-1 h-1 rounded-full animate-pulse", isFinished ? "bg-emerald-500" : "bg-orange-400")} />
              <p className="text-[6px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest">
                {isFinished ? `${count || 0} GANHADORES` : 'AGUARDANDO...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Background Glow for fullWidth */}
    {fullWidth && (
      <>
        <div className="absolute top-0 right-0 w-64 h-64 bg-lotofacil-yellow/10 rounded-full -mr-32 -mt-32 blur-[80px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-lotofacil-purple/5 rounded-full -ml-24 -mb-24 blur-[60px] pointer-events-none" />
      </>
    )}
  </div>
);

export default LiveRanking;
