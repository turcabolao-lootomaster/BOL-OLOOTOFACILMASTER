/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Trophy, Medal, Search, Share2, DollarSign, TrendingUp, Info, Zap, Download, X, Lock, ChevronRight, FileText, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../utils';
import { Bet, Contest } from '../types';

const Participants: React.FC = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [downloadType, setDownloadType] = useState<'excel' | 'pdf' | null>(null);
  const [editingBet, setEditingBet] = useState<Bet | null>(null);
  const [editBetName, setEditBetName] = useState('');
  const [editBetNumbers, setEditBetNumbers] = useState<number[]>([]);
  const [isUpdatingBet, setIsUpdatingBet] = useState(false);

  useEffect(() => {
    let unsubscribeBets: () => void = () => {};
    const unsubscribeContest = firebaseService.subscribeToActiveContest((activeContest) => {
      setContest(activeContest);
      if (activeContest) {
        unsubscribeBets();
        unsubscribeBets = firebaseService.subscribeToContestBets(activeContest.id, (contestBets) => {
          setBets(contestBets);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeContest();
      unsubscribeBets();
    };
  }, []);

  const betPrice = contest?.betPrice || 10;
  const totalRevenue = bets.length * betPrice;

  // Prize Calculations
  const prizes = useMemo(() => {
    const config = contest?.prizeConfig || {
      pctRapidinha: 0.10,
      pctChampion: 0.45,
      pctVice: 0.15
    };
    const rapidinha = totalRevenue * (config.pctRapidinha || 0.10);
    const champion = totalRevenue * (config.pctChampion || 0.45);
    const vice = totalRevenue * (config.pctVice || 0.15);
    return { rapidinha, champion, vice };
  }, [totalRevenue, contest]);

  const winners = useMemo(() => {
    if (bets.length === 0) return { rapidinha: [], champion: [], vice: [], draws10: [[], [], []], total25: [], total27: [] };

    const sortedByS1 = [...bets].sort((a, b) => (b.hits?.[0] || 0) - (a.hits?.[0] || 0));
    const maxS1 = sortedByS1[0]?.hits?.[0] || 0;
    const rapidinhaWinners = maxS1 > 0 ? sortedByS1.filter(b => (b.hits?.[0] || 0) === maxS1).map(b => b.id) : [];

    const sortedByTotal = [...bets].sort((a, b) => {
      const totalA = (a.hits || []).reduce((sum, h) => sum + h, 0);
      const totalB = (b.hits || []).reduce((sum, h) => sum + h, 0);
      return totalB - totalA;
    });

    const maxTotal = (sortedByTotal[0]?.hits || []).reduce((sum, h) => sum + h, 0);
    const championWinners = maxTotal > 0 ? sortedByTotal.filter(b => (b.hits || []).reduce((sum, h) => sum + h, 0) === maxTotal).map(b => b.id) : [];

    // Vice is the second highest score
    const distinctScores = Array.from(new Set(sortedByTotal.map(b => (b.hits || []).reduce((sum, h) => sum + h, 0)))).sort((a, b) => b - a);
    const viceScore = distinctScores.length > 1 ? distinctScores[1] : -1;
    const viceWinners = viceScore > 0 ? sortedByTotal.filter(b => (b.hits || []).reduce((sum, h) => sum + h, 0) === viceScore).map(b => b.id) : [];

    const draws10 = [
      bets.filter(b => (b.hits?.[0] || 0) >= 10).map(b => b.id),
      bets.filter(b => (b.hits?.[1] || 0) >= 10).map(b => b.id),
      bets.filter(b => (b.hits?.[2] || 0) >= 10).map(b => b.id),
    ];

    const total25 = bets.filter(b => (b.hits || []).reduce((sum, h) => sum + h, 0) >= 25).map(b => b.id);
    const total27 = bets.filter(b => (b.hits || []).reduce((sum, h) => sum + h, 0) >= 27).map(b => b.id);

    return { rapidinha: rapidinhaWinners, champion: championWinners, vice: viceWinners, draws10, total25, total27 };
  }, [bets]);

  const filteredBets = useMemo(() => {
    return bets.filter(b => 
      b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.betName || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      const totalA = (a.hits || []).reduce((sum, h) => sum + h, 0);
      const totalB = (b.hits || []).reduce((sum, h) => sum + h, 0);
      return totalB - totalA;
    });
  }, [bets, searchTerm]);

  const handleShare = () => {
    const url = `${window.location.origin}/?view=participants`;
    navigator.clipboard.writeText(url);
    alert('Link público copiado!');
  };

  const handleDownloadExcel = async () => {
    if (password !== 'Baixarok') {
      setPasswordError(true);
      return;
    }

    setShowPasswordModal(false);
    setPassword('');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Participantes');

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
    titleCell.value = `LISTA DE PARTICIPANTES - CONCURSO #${contest?.number || '...'}`;
    titleCell.style = mainHeaderStyle;
    worksheet.getRow(1).height = 40;

    // Add Prize Info Section
    worksheet.mergeCells('A2:V2');
    const prizeHeaderCell = worksheet.getCell('A2');
    prizeHeaderCell.value = 'DETALHES DA PREMIAÇÃO';
    prizeHeaderCell.style = sectionHeaderStyle;

    worksheet.mergeCells('A3:D3');
    worksheet.getCell('A3').value = 'Rapidinha (1º Sorteio)';
    worksheet.mergeCells('E3:H3');
    worksheet.getCell('E3').value = prizes.rapidinha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    worksheet.mergeCells('A4:D4');
    worksheet.getCell('A4').value = 'Campeão (Total)';
    worksheet.mergeCells('E4:H4');
    worksheet.getCell('E4').value = prizes.champion.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    worksheet.mergeCells('A5:D5');
    worksheet.getCell('A5').value = 'Vice (Total)';
    worksheet.mergeCells('E5:H5');
    worksheet.getCell('E5').value = prizes.vice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Add Draw Results Section
    worksheet.mergeCells('J3:M3');
    worksheet.getCell('J3').value = 'Resultados Sorteios:';
    worksheet.getCell('J3').style = { font: { bold: true } };

    contest?.draws?.forEach((draw, idx) => {
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
      'ID', 'Participante', 
      'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10', 'N11', 'N12', 'N13', 'N14', 'N15',
      'S1', 'S2', 'S3', 'Total', 'Vendedor'
    ];
    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(8);
    headerRow.eachCell((cell) => {
      cell.style = subHeaderStyle;
    });

    // Add data
    filteredBets.forEach((b: any, index: number) => {
      const hits = b.hits || [0, 0, 0];
      const total = hits.reduce((sum: number, h: number) => sum + h, 0);
      const sortedNumbers = [...b.numbers].sort((a, b) => a - b);
      
      // Garantir exatamente 15 colunas para os números
      const numCols = Array(15).fill('');
      sortedNumbers.forEach((n, i) => { if (i < 15) numCols[i] = n; });
      
      const rowData = [
        index + 1,
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
      const allResults = contest?.draws?.flatMap(d => d.results) || [];

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
    anchor.download = `Participantes_Bolao_Concurso_${contest?.number || '...'}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
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
      { label: '1º SORTEIO 10 PTS', value: contest?.prizeConfig?.fixed10PtsDraw1 || 500, color: [255, 247, 237], textColor: [234, 88, 12] },
      { label: '2º SORTEIO 10 PTS', value: contest?.prizeConfig?.fixed10PtsDraw2 || 500, color: [255, 247, 237], textColor: [234, 88, 12] },
      { label: '3º SORTEIO 10 PTS', value: contest?.prizeConfig?.fixed10PtsDraw3 || 500, color: [255, 247, 237], textColor: [234, 88, 12] },
      { label: 'RAPIDINHA', value: prizes.rapidinha, color: [255, 251, 235], textColor: [217, 119, 6] },
      { label: '1º LUGAR', value: prizes.champion, color: [245, 243, 255], textColor: [124, 58, 237] },
      { label: '2º LUGAR', value: prizes.vice, color: [239, 246, 255], textColor: [37, 99, 235] }
    ];

    const bonusCards = [
      { label: 'BÔNUS 25', value: contest?.prizeConfig?.fixed25PlusTotal || 2000, color: [16, 185, 129], sub: '25 PTS NA SOMA TOTAL' },
      { label: 'SUPER BÔNUS 27', value: contest?.prizeConfig?.fixed27PlusTotal || 5000, color: [15, 23, 42], sub: '27 PTS NA SOMA TOTAL' }
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
    doc.text(`CLASSIFICAÇÃO | CONCURSO #${contest?.number || '...'} | INICIO: 10/04/2026`, pageWidth / 2, 150, { align: 'center' });
    
    // Draw Results Section (3 Lines) - Centralized with Balls
    const ballRadius = 2.5;
    const ballGap = 1.2;
    const totalDrawWidth = (ballRadius * 2 * 15) + (ballGap * 14);
    
    contest?.draws?.forEach((draw, idx) => {
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

    const data = filteredBets.map((b: any, index: number) => {
      const hits = b.hits || [0, 0, 0];
      const total = hits.reduce((sum: number, h: number) => sum + h, 0);
      const sortedNumbers = [...b.numbers].sort((a, b) => a - b);
      
      const numCols = Array(10).fill('');
      sortedNumbers.forEach((n, i) => { if (i < 10) numCols[i] = n; });

      // Prize Logic for PDF Labels
      const prizeLabels = [];
      if (winners.champion.includes(b.id)) prizeLabels.push('[1º LUGAR]');
      if (winners.vice.includes(b.id)) prizeLabels.push('[2º LUGAR]');
      if (winners.rapidinha.includes(b.id)) prizeLabels.push('[RAPIDINHA]');
      if (winners.draws10.some(d => d.includes(b.id))) prizeLabels.push('[10 PONTOS]');
      if (winners.total27.includes(b.id)) prizeLabels.push('[27+ PONTOS]');
      else if (winners.total25.includes(b.id)) prizeLabels.push('[25 PONTOS]');

      const nameWithPrizes = `${(b.betName || b.userName).toUpperCase()} ${prizeLabels.join(' ')}`.trim();
      
      return [
        `${index + 1}º`,
        nameWithPrizes,
        b.sellerCode || '-',
        ...numCols,
        hits[0],
        hits[1],
        hits[2],
        total
      ];
    });

    // For Participants list, we highlight all hits from all draws
    const allResults = contest?.draws?.flatMap(d => d.results) || [];

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
          const betId = filteredBets[data.row.index].id;
          
          // Check if winner to highlight row
          const isWinner = winners.rapidinha.includes(betId) || 
                           winners.champion.includes(betId) || 
                           winners.vice.includes(betId) || 
                           winners.total25.includes(betId) || 
                           winners.total27.includes(betId) ||
                           winners.draws10.some(d => d.includes(betId));

          if (isWinner && data.column.index <= 2) {
            data.cell.styles.fillColor = [254, 243, 199]; // Light Gold
          }

          // Highlight hit numbers
          if (data.column.index >= 3 && data.column.index <= 12) {
            const num = data.cell.raw;
            if (typeof num === 'number' && allResults.includes(num)) {
              data.cell.styles.fillColor = [107, 33, 168]; // Purple highlight
              data.cell.styles.textColor = 255;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    doc.save(`Participantes_Bolao_Premiada_Conc_${contest?.number || '...'}.pdf`);
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

  const isAdmin = user?.role === 'admin' || user?.role === 'master';

  return (
    <div className="mobile-p lg:p-10 space-y-6 sm:space-y-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 relative">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-4xl font-display tracking-widest text-slate-900">
              CLASSIFICAÇÃO <span className="text-lotofacil-purple uppercase">AO VIVO</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              Concurso {contest ? `#${contest.number}` : '...'}
            </span>
            <span className="px-2 py-0.5 bg-lotofacil-purple/10 border border-lotofacil-purple/20 rounded-full text-[9px] font-bold text-lotofacil-purple uppercase tracking-widest">
              {bets.length} Apostas
            </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="p-2.5 bg-white hover:bg-slate-50 rounded-xl text-lotofacil-purple transition-all border border-slate-200 shadow-sm"
              title="Compartilhar Link"
            >
              <Share2 size={18} />
            </button>
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

      {/* Prize Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PrizeCard 
          title="Rapidinha (1º Sorteio)" 
          value={prizes.rapidinha} 
          winnersCount={winners.rapidinha.length} 
          icon={<TrendingUp size={16} />}
          color="bg-blue-600"
        />
        <PrizeCard 
          title="1º Lugar (Campeão)" 
          value={prizes.champion} 
          winnersCount={winners.champion.length} 
          icon={<Trophy size={16} />}
          color="bg-lotofacil-purple"
        />
        <PrizeCard 
          title="2º Lugar (Vice)" 
          value={prizes.vice} 
          winnersCount={winners.vice.length} 
          icon={<Medal size={16} />}
          color="bg-slate-600"
        />
      </div>

      {/* Fixed Prizes Info */}
      <div className="space-y-2">
        {/* Bônus 25 */}
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-600 text-white p-3 sm:p-5 rounded-2xl shadow-[0_15px_35px_rgba(16,185,129,0.25)] border border-emerald-400/20 flex flex-row items-center justify-between gap-4 sm:gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-[60px] pointer-events-none" />
            <div className="flex items-center gap-3 sm:gap-6 relative z-10">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg rotate-3 shrink-0">
                <Medal size={24} className="text-white" />
              </div>
              <div>
                <p className="text-[8px] sm:text-xs font-black uppercase tracking-[0.2em] text-emerald-100">🔥 BÔNUS 25</p>
                <h3 className="text-sm sm:text-2xl font-black text-white mt-0.5 tracking-tight">25 PTS: <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">R$ 2.000,00</span></h3>
              </div>
            </div>
            <div className="text-right relative z-10">
              <p className="text-[6px] sm:text-[10px] uppercase tracking-widest text-emerald-100 font-bold mb-0.5">Prêmio Garantido</p>
              <p className="text-[8px] sm:text-sm font-black text-white">SOMA DOS 3 SORTEIOS</p>
            </div>
          </div>
        </div>

        {/* Super Bônus 27 */}
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-3 sm:p-5 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] border border-lotofacil-purple/20 flex flex-row items-center justify-between gap-4 sm:gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-lotofacil-purple/10 rounded-full -mr-24 -mt-24 blur-[60px] pointer-events-none" />
            <div className="flex items-center gap-3 sm:gap-6 relative z-10">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-lotofacil-purple rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.4)] rotate-3 shrink-0">
                <DollarSign size={24} className="text-white" />
              </div>
              <div>
                <p className="text-[8px] sm:text-xs font-black uppercase tracking-[0.2em] text-lotofacil-purple">🏆 Super Bônus 27</p>
                <h3 className="text-sm sm:text-2xl font-black text-white mt-0.5 tracking-tight">27 PTS: <span className="text-lotofacil-purple drop-shadow-[0_0_10px_rgba(147,51,234,0.5)]">R$ 5.000,00</span></h3>
              </div>
            </div>
            <div className="text-right relative z-10">
              <p className="text-[6px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Prêmio Especial</p>
              <p className="text-[8px] sm:text-sm font-black text-white">SOMA DOS 3 SORTEIOS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="glass-card overflow-hidden border-slate-200 shadow-xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-full sm:min-w-[800px] compact-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-1 sm:px-6 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-8 sm:w-20">Pos</th>
                <th className="px-2 sm:px-6 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-600 font-bold">Participante</th>
                <th className="px-2 sm:px-4 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center">Vendedor</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center hide-mobile">Números</th>
                <th className="px-1 sm:px-4 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-10 sm:w-16">S1</th>
                <th className="px-1 sm:px-4 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-10 sm:w-16">S2</th>
                <th className="px-1 sm:px-4 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-10 sm:w-16">S3</th>
                <th className="px-1 sm:px-6 py-4 text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-600 font-bold text-center w-12 sm:w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-lotofacil-purple/20 border-t-lotofacil-purple rounded-full animate-spin" />
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black">Sincronizando Ranking...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Trophy size={48} className="text-slate-900" />
                      <p className="text-slate-900 text-[10px] uppercase tracking-widest font-black">Nenhuma aposta encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBets.map((b, idx) => {
                const hits = b.hits || [0, 0, 0];
                const total = hits.reduce((sum, h) => sum + h, 0);
                const isCurrentUser = b.userId === user?.uid;
                const isRapidinha = winners.rapidinha.includes(b.id);
                const isChampion = winners.champion.includes(b.id);
                const isVice = winners.vice.includes(b.id);
                const is27Plus = total >= 27;
                const isExpanded = expandedBetId === b.id;
                
                return (
                  <React.Fragment key={b.id}>
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                      onClick={() => setExpandedBetId(isExpanded ? null : b.id)}
                      className={cn(
                        "transition-all duration-300 cursor-pointer relative",
                        isExpanded ? "bg-slate-900 text-white shadow-2xl z-30 scale-[1.02] rounded-xl" : 
                        isChampion ? "bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 hover:from-amber-100 hover:via-amber-200 hover:to-amber-100 border-y border-amber-200 shadow-sm" : 
                        isVice ? "bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 hover:from-slate-100 hover:via-slate-200 hover:to-slate-100 border-y border-slate-200 shadow-sm" :
                        isCurrentUser ? "bg-lotofacil-purple/5" : "hover:bg-slate-50"
                      )}
                    >
                      <td className="px-1 sm:px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <ChevronRight 
                            size={14} 
                            className={cn(
                              "transition-transform duration-300",
                              isExpanded ? "rotate-90 text-white" : "text-slate-300"
                            )} 
                          />
                          <div className={cn(
                            "w-5 h-5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-display text-[9px] sm:text-xs shadow-sm",
                            isExpanded ? "bg-white text-slate-900" :
                            idx === 0 ? "bg-lotofacil-yellow text-white" :
                            idx === 1 ? "bg-slate-300 text-white" :
                            idx === 2 ? "bg-lotofacil-purple text-white" :
                            "bg-slate-100 text-slate-600 border border-slate-200"
                          )}>
                            {idx + 1}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[11px] sm:text-sm font-bold truncate max-w-[110px] sm:max-w-none",
                              isExpanded ? "text-white" : 
                              isChampion ? "text-amber-900" :
                              isVice ? "text-slate-900" : "text-slate-900"
                            )}>
                              {b.betName || b.userName}
                            </span>
                            {isChampion && <Trophy size={12} className={isExpanded ? "text-white" : "text-amber-600 animate-bounce-slow"} />}
                            {isVice && <Medal size={12} className={isExpanded ? "text-white" : "text-slate-500"} />}
                            <ChevronRight 
                              size={12} 
                              className={cn(
                                "transition-transform duration-300",
                                isExpanded ? "rotate-90 text-white" : "text-slate-300"
                              )} 
                            />
                            {isCurrentUser && (
                              <span className={cn(
                                "text-[6px] sm:text-[7px] font-black px-1 py-0.5 rounded uppercase",
                                isExpanded ? "bg-white text-slate-900" : "bg-lotofacil-purple text-white"
                              )}>
                                Você
                              </span>
                            )}
                          </div>
                          
                          {/* Mobile Numbers Display */}
                          {!isExpanded && (
                            <div className="flex flex-wrap gap-0.5 mt-1 sm:hidden">
                              {b.numbers.map(num => (
                                <span key={num} className="text-[9px] font-bold text-lotofacil-purple bg-lotofacil-purple/5 px-0.5 rounded border border-lotofacil-purple/10">
                                  {num.toString().padStart(2, '0')}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-1">
                            {isRapidinha && <WinnerBadge label="Rapidinha" color={isExpanded ? "bg-white/20" : "bg-blue-600"} />}
                            {isChampion && <WinnerBadge label="Campeão" color={isExpanded ? "bg-white/20" : "bg-lotofacil-purple"} />}
                            {isVice && <WinnerBadge label="Vice" color={isExpanded ? "bg-white/20" : "bg-slate-600"} />}
                            {is27Plus && <WinnerBadge label="27+ Pontos" color={isExpanded ? "bg-white/20" : "bg-slate-900"} />}
                            {hits.some((h, i) => h >= 10) && <WinnerBadge label="10 Pts" color={isExpanded ? "bg-white/20" : "bg-lotofacil-purple"} />}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-4 text-center">
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest",
                          isExpanded ? "text-white/60" : "text-lotofacil-purple"
                        )}>
                          {b.sellerCode || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 hide-mobile">
                        <div className="flex items-center justify-center gap-1">
                          {b.numbers.map(num => {
                            const allResults = contest?.draws?.flatMap(d => d.results) || [];
                            const isHit = allResults.includes(num);
                            return (
                              <div 
                                key={num} 
                                className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all",
                                  isHit 
                                    ? (isExpanded ? "bg-white text-slate-900 border-white" : "bg-lotofacil-purple border-lotofacil-purple text-white")
                                    : (isExpanded ? "bg-white/10 border-white/10 text-white/40" : "bg-slate-50 border-slate-200 text-slate-600")
                                )}
                              >
                                {num.toString().padStart(2, '0')}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <DrawScore score={hits[0]} isWinner={hits[0] >= 10} isExpanded={isExpanded} />
                      <DrawScore score={hits[1]} isWinner={hits[1] >= 10} isExpanded={isExpanded} />
                      <DrawScore score={hits[2]} isWinner={hits[2] >= 10} isExpanded={isExpanded} />
                      <td className={cn(
                        "px-1 sm:px-6 py-4 text-center transition-all",
                        isExpanded ? "bg-white/10" : "bg-[#1e3a8a] border-x border-white/10"
                      )}>
                        <div className={cn(
                          "inline-flex flex-col items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-xl border transition-all shadow-sm",
                          isExpanded ? "bg-white/10 border-white/20" :
                          total >= 27 ? "bg-slate-900 border-slate-900 shadow-lg scale-110" :
                          idx < 3 ? "bg-white border-lotofacil-purple/30" : "bg-white border-white/10"
                        )}>
                          <span className={cn(
                            "text-xs sm:text-lg font-display tracking-tighter leading-none",
                            isExpanded ? "text-white" : total >= 27 ? "text-white" : "text-[#ffd700]"
                          )}>
                            {total.toString().padStart(2, '0')}
                          </span>
                          <span className={cn(
                            "text-[5px] sm:text-[7px] font-black uppercase tracking-tighter mt-0.5",
                            isExpanded ? "text-white/40" : "text-white/60"
                          )}>
                            PTS
                          </span>
                        </div>
                      </td>
                    </motion.tr>

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
                                      {(contest?.draws?.flatMap(d => d.results) || []).length} de 15 sorteados
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-5 sm:grid-cols-15 gap-2 sm:gap-3">
                                  {b.numbers.map(num => {
                                    const allResults = contest?.draws?.flatMap(d => d.results || []) || [];
                                    const isHit = allResults.includes(num);
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

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Info size={20} className="text-blue-600" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-blue-900 uppercase tracking-widest">Regras de Premiação</p>
          <p className="text-[10px] text-blue-700 leading-relaxed">
            Os prêmios de porcentagem (Rapidinha, Campeão e Vice) são calculados sobre o total arrecadado. 
            Em caso de empate, o prêmio é dividido igualmente entre os ganhadores daquela categoria. 
            Prêmios fixos (10 PTS e 27+ PTS) são garantidos para cada aposta que atingir a pontuação.
          </p>
        </div>
      </div>

      {/* Password Modal */}
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
      </AnimatePresence>
    </div>
  );
};

const PrizeCard = ({ title, value, winnersCount, icon, color }: { title: string, value: number, winnersCount: number, icon: React.ReactNode, color: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden group">
    <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-110", color)} />
    <div className="flex items-center justify-between">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", color)}>
        {icon}
      </div>
      <div className="text-right">
        <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Estimativa</p>
        <p className="text-lg font-black text-slate-900">
          {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>
    </div>
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{title}</p>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-full border border-slate-100 shadow-sm">
        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
          {winnersCount || 0} GANHADORES
        </p>
      </div>
    </div>
  </div>
);

const WinnerBadge = ({ label, color }: { label: string, color: string }) => (
  <span className={cn("text-[7px] font-black text-white px-1.5 py-0.5 rounded shadow-sm uppercase tracking-tighter", color)}>
    {label}
  </span>
);

const DrawScore = ({ score, isWinner, isExpanded }: { score: number, isWinner: boolean, isExpanded?: boolean }) => (
  <td className="px-1 sm:px-4 py-4 text-center">
    <div className="flex flex-col items-center gap-1">
      <span className={cn(
        "text-xs sm:text-sm font-bold font-mono",
        isExpanded ? "text-white" : isWinner ? "text-lotofacil-purple" : score >= 9 ? "text-lotofacil-purple" : "text-slate-400"
      )}>
        {score.toString().padStart(2, '0')}
      </span>
      {isWinner && <div className={cn("w-1 h-1 rounded-full animate-ping", isExpanded ? "bg-white" : "bg-lotofacil-purple")} />}
    </div>
  </td>
);

export default Participants;
