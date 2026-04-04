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
  Medal,
  Info,
  Clock,
  Download,
  Lock,
  X,
  ChevronRight,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../utils';
import { Bet, Contest } from '../types';

const LiveRanking: React.FC = () => {
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
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
    fixed25Plus: 2000,
    fixed27Plus: 5000
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

  const rapidinhaWinnersCount = bets.filter(b => (b.hits?.[0] || 0) === maxS1Hits && maxS1Hits > 0).length;

  const winners27Plus = bets.filter(b => (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0) >= 27);
  const winners25Plus = bets.filter(b => (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0) >= 25);

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

    // Header
    doc.setFillColor(107, 33, 168); // lotofacil-purple
    doc.rect(0, 0, 297, 25, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(`RANKING AO VIVO - CONCURSO #${activeContest.number}`, 148.5, 15, { align: 'center' });

    // Prize Info
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('DETALHES DA PREMIAÇÃO (ESTIMATIVA)', 14, 35);
    doc.setFontSize(8);
    doc.text(`Rapidinha: ${prizes.rapidinha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 42);
    doc.text(`Campeão: ${prizes.campeao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 47);
    doc.text(`Vice: ${prizes.vice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 52);

    // Draw Results
    doc.setFontSize(10);
    doc.text('RESULTADOS SORTEIOS:', 100, 35);
    doc.setFontSize(8);
    activeContest.draws.forEach((draw, idx) => {
      doc.text(`Sorteio ${idx + 1}: ${draw.results.sort((a, b) => a - b).join(', ')}`, 100, 42 + (idx * 5));
    });

    // Info Row
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')} | Total de Apostas: ${bets.length}`, 14, 65);

    // Table
    const headers = [
      'Pos', 'Participante', 
      'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10',
      'S1', 'S2', 'S3', 'Total', 'Vendedor'
    ];

    const currentDrawResults = activeContest.draws.flatMap(d => d.results);

    const data = rankingWithRanks.map((b: any) => {
      const hits = b.hits || [0, 0, 0];
      const total = hits.reduce((sum: number, h: number) => sum + h, 0);
      const sortedNumbers = [...b.numbers].sort((a, b) => a - b);
      
      // Garantir exatamente 10 colunas para os números (N1 a N10)
      const numCols = Array(10).fill('');
      sortedNumbers.forEach((n, i) => { if (i < 10) numCols[i] = n; });
      
      return [
        b.rank,
        b.betName || b.userName,
        ...numCols,
        hits[0], hits[1], hits[2],
        total,
        b.sellerCode || '-'
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 70,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', cellPadding: 1 },
      headStyles: { fillColor: [107, 33, 168], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Highlight hit numbers (N1 to N10 are at indices 2 to 11)
          if (data.column.index >= 2 && data.column.index <= 11) {
            const num = data.cell.raw;
            if (typeof num === 'number' && currentDrawResults.includes(num)) {
              data.cell.styles.fillColor = [147, 51, 234]; // purple-600
              data.cell.styles.textColor = 255;
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Highlight S1, S2, S3 and Total (now at indices 12 to 15)
          if (data.column.index >= 12 && data.column.index <= 15) {
            const val = data.cell.raw;
            if (typeof val === 'number' && val >= 10) {
              data.cell.styles.fillColor = [254, 243, 199]; // yellow-100
              data.cell.styles.textColor = [146, 64, 14]; // amber-800
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    doc.save(`Ranking_Bolao_Concurso_${activeContest.number}.pdf`);
  };

  const filteredRanking = rankingWithRanks.filter(b => 
    (b.betName || b.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.sellerCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mobile-p mobile-gap flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 relative">
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
        
        <div className="flex flex-col gap-4">
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
            value={prizes.fixed10Pts} 
            count={winners10Pts[num-1].length}
            icon={Target}
            color="text-orange-600"
            bg="bg-orange-50"
            border="border-orange-200"
            compact
            isFinished={num === 1 ? isDraw1Finished : num === 2 ? isDraw2Finished : isThirdDrawFinished}
          />
        ))}
      </div>

      {/* Main Prizes Row (Rapidinha, 1st, 2nd) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <PrizeCard 
          title="RAPIDINHA" 
          value={prizes.rapidinha} 
          leader={rapidinhaLeader?.userName}
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
          leader={champion?.userName}
          count={bets.filter(b => b.totalHits === maxTotalHits && maxTotalHits > 0).length}
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
          leader={vice?.userName}
          count={bets.filter(b => b.totalHits === secondMaxTotalHits && secondMaxTotalHits > 0).length}
          icon={Award}
          color="text-blue-500"
          bg="bg-blue-50"
          border="border-blue-100"
          compact
          isFinished={isThirdDrawFinished}
        />
      </div>

      {/* Special Prizes (Maintain as is but separate) */}
      <div className="w-full space-y-2">
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
          />
        </div>
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
        />
      </div>

      {/* Search and Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm sm:text-lg font-display tracking-widest text-slate-900 uppercase">RANKING DO <span className="text-lotofacil-purple">CONCURSO</span></h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Sort Options */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
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

            {/* Search Input */}
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
                const isExpanded = expandedBetId === b.id;
                
                return (
                  <React.Fragment key={b.id}>
                    <tr 
                      onClick={() => setExpandedBetId(isExpanded ? null : b.id)}
                      className={cn(
                        "transition-all duration-300 cursor-pointer relative",
                        isExpanded ? "bg-slate-900 text-white shadow-2xl z-30 scale-[1.02] rounded-xl" : 
                        hits[selectedDraw] >= 10 ? "bg-orange-100 hover:bg-orange-200" :
                        isChampion ? "bg-lotofacil-purple/10 hover:bg-lotofacil-purple/20" : 
                        isVice ? "bg-blue-100/40 hover:bg-blue-100/60" :
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
                            isExpanded ? "text-white" : "text-slate-900"
                          )}>
                            {b.betName || b.userName}
                          </p>
                          {b.rank === 1 && <Crown size={10} className={isExpanded ? "text-white" : "text-lotofacil-purple"} />}
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
                          <div className="flex flex-nowrap gap-1 mt-1 sm:hidden">
                            {b.numbers.map(num => {
                              const isHit = currentDrawResults.includes(num);
                              return (
                                <span 
                                  key={num} 
                                  className={cn(
                                    "text-[8px] font-bold px-1 rounded-[2px] border transition-all shrink-0",
                                    isHit 
                                      ? "bg-lotofacil-purple text-white border-lotofacil-purple shadow-[0_0_4px_rgba(107,33,168,0.4)] z-10" 
                                      : "text-lotofacil-purple bg-lotofacil-purple/5 border-lotofacil-purple/10 opacity-40"
                                  )}
                                >
                                  {num.toString().padStart(2, '0')}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <p className={cn(
                          "text-[7px] sm:text-[8px] uppercase tracking-widest font-bold mt-0.5",
                          isExpanded ? "text-white/60" : "text-lotofacil-purple"
                        )}>
                          Vendedor: {b.sellerCode}
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
                                    : (isExpanded ? "bg-white/10 border-white/10 text-white/40" : "bg-slate-50 border-slate-200 text-slate-400")
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
                      <td className="px-0.5 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            "text-xs sm:text-sm font-black",
                            isExpanded ? "text-white" : "text-lotofacil-purple"
                          )}>
                            {totalHits}
                          </span>
                          {totalHits >= 27 && (
                            <span className={cn(
                              "text-[6px] font-bold px-1 rounded",
                              isExpanded ? "bg-white text-slate-900" : "bg-lotofacil-purple text-white"
                            )}>
                              PREMIADO
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expansion Row */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr className="bg-slate-900 border-none">
                          <td colSpan={7} className="px-4 pb-6 pt-0">
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
                                            ? "bg-white border-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105" 
                                            : "bg-white/5 border-white/10 text-white/20"
                                        )}
                                      >
                                        {num.toString().padStart(2, '0')}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                  <p className="text-[9px] text-white/40 uppercase font-bold">Toque novamente para fechar</p>
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
      </AnimatePresence>
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
  pointsLabel?: string;
  variant?: 'default' | 'bonus25' | 'bonus27';
  isFinished?: boolean;
}

const PrizeCard: React.FC<PrizeCardProps> = ({ 
  title, value, leader, count, icon: Icon, color, bg, border, compact, fullWidth, pointsLabel, variant = 'default', isFinished
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
              "text-[13px] sm:text-[25px] font-black uppercase tracking-[0.2em] drop-shadow-lg sm:leading-[30px]",
              variant === 'bonus27' ? "text-lotofacil-yellow" : "text-white"
            )}>
              {(isFinished && variant === 'default') ? `${title} (${count || 0} Ganhadores)` : title}
            </h2>
            <div className="flex items-center gap-2">
              {(count !== undefined && (count > 0 || !isFinished)) && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded-full border border-white/10">
                  <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[6px] sm:text-[13px] font-black text-[#f7f7f7] uppercase tracking-widest">
                    {count} ganhador(es)
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
      <div className="flex items-start gap-3 sm:gap-6 relative z-10">
        <div className={cn(
          "rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
          compact ? "w-8 h-8 sm:w-12 sm:h-12" : "w-14 h-14 sm:w-20 sm:h-20",
          bg
        )}>
          <Icon className={color} size={compact ? 14 : 28} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <p className={cn(
              "uppercase tracking-widest text-black font-bold text-right",
              compact ? "text-[7px] sm:text-[9px]" : "text-[7px] sm:text-[10px]"
            )}>
              Estimativa
            </p>
            <p className={cn(
              "font-black tracking-tight text-right",
              compact ? "text-[10px] sm:text-xl" : "text-lg sm:text-3xl",
              color
            )}>
              {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          
          <div className={cn(
            "mt-1 sm:mt-3",
            compact ? "space-y-0.5" : "space-y-1"
          )}>
            <p className={cn(
              "font-bold uppercase tracking-widest truncate text-slate-900",
              compact ? "text-[6px] sm:text-[10px]" : "text-[9px] sm:text-xs"
            )}>
              {isFinished ? `${title} (${count || 0} Ganhadores)` : title}
            </p>
            
            {leader ? (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-green-500 shrink-0" />
                <p className={cn(
                  "font-medium truncate uppercase",
                  compact ? "text-[5px] sm:text-[8px]" : "text-[7px] sm:text-[10px]",
                  "text-slate-500"
                )}>{leader} no momento</p>
              </div>
            ) : (count !== undefined && !isFinished) ? (
              <p className={cn(
                "font-medium uppercase tracking-widest truncate text-slate-500",
                compact ? "text-[5px] sm:text-[8px]" : "text-[7px] sm:text-[10px]"
              )}>
                {count} ganhador(es) no momento
              </p>
            ) : !isFinished ? (
              <p className={cn(
                "italic truncate text-slate-400",
                compact ? "text-[5px] sm:text-[8px]" : "text-[7px] sm:text-[10px]"
              )}>Calculando...</p>
            ) : null}
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
