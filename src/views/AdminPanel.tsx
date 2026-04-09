/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { 
  Ticket, 
  Trophy, 
  Settings, 
  Users, 
  BarChart3, 
  Check, 
  X, 
  Plus, 
  Save,
  Search,
  MoreVertical,
  TrendingUp,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Eye,
  ArrowLeft,
  Play,
  Lock,
  Unlock,
  Download,
  DollarSign,
  Info,
  Store,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { cn } from '../utils';
import { Bet, Contest, ContestStatus, Seller, User as AppUser } from '../types';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('apostas');

  const tabs = [
    { id: 'apostas', label: 'Apostas', icon: Ticket },
    { id: 'sorteios', label: 'Sorteios', icon: Trophy },
    { id: 'concursos', label: 'Concursos', icon: Settings },
    { id: 'vendedores', label: 'Vendedores', icon: Users },
    { id: 'usuarios', label: 'Usuários', icon: ShieldCheck },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'config', label: 'Config', icon: Save },
  ];

  if (user?.role !== 'admin' && user?.role !== 'master') {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Acesso Negado</h1>
        <p className="text-slate-600 mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="mobile-p lg:p-10 space-y-4 sm:space-y-10">
      <div className="flex flex-col gap-6">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-4xl font-display tracking-widest text-slate-900">PAINEL <span className="text-lotofacil-purple uppercase">ADMINISTRATIVO</span></h1>
          <p className="text-[10px] sm:text-sm text-slate-600 mt-1">Gestão completa do sistema, sorteios e relatórios.</p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 w-full max-w-5xl mx-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-lotofacil-purple text-white shadow-[0_4px_12px_rgba(107,33,168,0.3)]" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="glass-card p-4 sm:p-8 bg-card-bg"
        >
          {activeTab === 'apostas' && <BetsTab />}
          {activeTab === 'sorteios' && <DrawsTab />}
          {activeTab === 'concursos' && <ContestsTab />}
          {activeTab === 'vendedores' && <SellersTab />}
          {activeTab === 'usuarios' && <UsersTab />}
          {activeTab === 'relatorios' && <ReportsTab />}
          {activeTab === 'financeiro' && <FinanceiroTab />}
          {activeTab === 'config' && <ConfigTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const BetsTab = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pendente' | 'validado' | 'rejeitado' | 'todos'>('pendente');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingBet, setEditingBet] = useState<Bet | null>(null);
  const [editBetName, setEditBetName] = useState('');
  const [editBetNumbers, setEditBetNumbers] = useState<number[]>([]);
  const [isUpdatingBet, setIsUpdatingBet] = useState(false);

  const fetchBets = async () => {
    setLoading(true);
    try {
      let fetchedBets: Bet[] = [];
      if (statusFilter === 'pendente') {
        fetchedBets = await firebaseService.getAllPendingBets();
      } else {
        fetchedBets = await firebaseService.getBetsByStatus(statusFilter === 'todos' ? undefined : statusFilter);
      }
      setBets(fetchedBets);
      setSelectedIds([]); // Clear selection on tab/filter change
    } catch (error) {
      console.error('Erro ao buscar apostas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, [statusFilter]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleValidate = async (id: string, status: 'validado' | 'rejeitado') => {
    try {
      await firebaseService.validateBet(id, status);
      showSuccess(`Aposta ${status === 'validado' ? 'validada' : 'rejeitada'} com sucesso!`);
      if (statusFilter === 'pendente') {
        setBets(prev => prev.filter(b => b.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      } else {
        fetchBets();
      }
    } catch (error) {
      console.error('Erro ao validar aposta:', error);
    }
  };

  const handleBulkValidate = async () => {
    if (selectedIds.length === 0) return;
    
    setIsBulkProcessing(true);
    try {
      // Process in sequence or chunks to be safer, but Promise.all is usually fine for small sets
      await Promise.all(selectedIds.map(id => firebaseService.validateBet(id, 'validado')));
      showSuccess(`${selectedIds.length} apostas validadas com sucesso!`);
      setSelectedIds([]);
      await fetchBets();
    } catch (error) {
      console.error('Erro na validação em massa:', error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkProcessing(true);
    setShowDeleteConfirm(false);
    try {
      await Promise.all(selectedIds.map(id => firebaseService.deleteBet(id)));
      showSuccess(`${selectedIds.length} apostas excluídas com sucesso!`);
      setSelectedIds([]);
      await fetchBets();
    } catch (error) {
      console.error('Erro na exclusão em massa:', error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBets.map(b => b.id));
    }
  };

  const toggleSelectBet = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
      showSuccess('Aposta atualizada com sucesso!');
      setEditingBet(null);
      fetchBets();
    } catch (error) {
      console.error('Erro ao atualizar aposta:', error);
      alert('Erro ao atualizar aposta.');
    } finally {
      setIsUpdatingBet(false);
    }
  };

  const toggleNumberInEdit = (num: number) => {
    setEditBetNumbers(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : (prev.length < 10 ? [...prev, num] : prev)
    );
  };

  const handleDownloadExcel = () => {
    if (filteredBets.length === 0) return;

    // Prepare data for Excel
    const excelData = filteredBets.map(bet => {
      const row: any = {
        'Nome': (bet.betName || bet.userName).toUpperCase(),
      };
      
      // Add each number in its own column
      bet.numbers.sort((a, b) => a - b).forEach((num, index) => {
        row[`N${index + 1}`] = num;
      });
      
      return row;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Apostas");
    
    // Generate filename with current date/status
    const date = new Date().toISOString().split('T')[0];
    const filename = `apostas_${statusFilter}_${date}.xlsx`;
    
    // Download file
    XLSX.writeFile(workbook, filename);
  };

  const filteredBets = bets.filter(b => 
    b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.betName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.sellerCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">GESTÃO DE <span className="text-lotofacil-purple">APOSTAS</span></h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">Total:</span>
            <span className="text-xs font-bold text-lotofacil-yellow">{bets.length}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-[10px] sm:text-xs text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
          >
            <option value="pendente">Pendentes</option>
            <option value="validado">Validadas</option>
            <option value="rejeitado">Rejeitadas</option>
            <option value="todos">Todas</option>
          </select>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-[10px] sm:text-xs w-full placeholder:text-slate-500"
            />
          </div>
          <button 
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all shadow-md"
            title="Baixar Excel"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {editingBet && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
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
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-4 text-lotofacil-yellow">
                <AlertCircle size={32} />
                <h3 className="text-xl font-display tracking-widest uppercase text-slate-900">Confirmar Exclusão</h3>
              </div>
              <p className="text-slate-600 text-sm">
                Deseja EXCLUIR DEFINITIVAMENTE <span className="text-slate-900 font-bold">{selectedIds.length}</span> apostas selecionadas? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all uppercase tracking-widest text-[10px] font-bold border border-slate-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmBulkDelete}
                  className="flex-1 py-3 rounded-xl bg-lotofacil-yellow text-white hover:bg-lotofacil-yellow/80 transition-all uppercase tracking-widest text-[10px] font-bold shadow-lg"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-lotofacil-yellow/10 border border-lotofacil-yellow/20 rounded-xl p-2.5 flex items-center gap-2 text-lotofacil-yellow text-[10px] font-bold uppercase tracking-widest"
          >
            <CheckCircle size={14} />
            {successMessage}
          </motion.div>
        )}
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-lotofacil-purple/10 border border-lotofacil-purple/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-lotofacil-purple text-white flex items-center justify-center font-bold text-[10px]">
                {selectedIds.length}
              </div>
              <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Apostas Selecionadas</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={handleBulkValidate}
                disabled={isBulkProcessing}
                className="flex-1 sm:flex-none bg-lotofacil-purple text-white px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-lotofacil-purple/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_4px_10px_rgba(107,33,168,0.3)]"
              >
                <CheckCircle size={12} />
                Validar
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="flex-1 sm:flex-none bg-red-600 text-white px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                <Trash2 size={12} />
                Excluir
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 w-10">
                <div 
                  onClick={toggleSelectAll}
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all",
                    selectedIds.length === filteredBets.length && filteredBets.length > 0
                      ? "bg-lotofacil-purple border-lotofacil-purple text-white" 
                      : "border-slate-300 hover:border-slate-400"
                  )}
                >
                  {selectedIds.length === filteredBets.length && filteredBets.length > 0 && <Check size={10} strokeWidth={4} />}
                </div>
              </th>
              <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-lotofacil-purple">Data</th>
              <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-lotofacil-purple">Cliente / Vendedor</th>
              <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-center text-lotofacil-purple">Números Escolhidos</th>
              <th className="px-4 py-3 text-[9px] uppercase tracking-widest text-slate-500 font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-[10px] uppercase tracking-widest font-bold">Carregando...</td></tr>
            ) : filteredBets.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-[10px] uppercase tracking-widest font-bold">Nenhuma aposta encontrada.</td></tr>
            ) : filteredBets.map((bet) => (
              <tr 
                key={bet.id} 
                className={cn(
                  "border-b border-slate-100 hover:bg-slate-50 transition-all",
                  selectedIds.includes(bet.id) && "bg-lotofacil-purple/5"
                )}
              >
                <td className="px-4 py-4">
                  <div 
                    onClick={() => toggleSelectBet(bet.id)}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all",
                      selectedIds.includes(bet.id) 
                        ? "bg-lotofacil-purple border-lotofacil-purple text-white" 
                        : "border-slate-300 hover:border-slate-400"
                    )}
                  >
                    {selectedIds.includes(bet.id) && <Check size={10} strokeWidth={4} />}
                  </div>
                </td>
                <td className="px-4 py-4 text-[10px] text-slate-600 uppercase tracking-widest">
                  {bet.createdAt instanceof Date ? bet.createdAt.toLocaleDateString() : 'Recent'}
                </td>
                <td className="px-4 py-4">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                    {bet.betName || bet.userName}
                  </p>
                  {bet.sellerCode && <p className="text-[9px] text-lotofacil-yellow uppercase tracking-widest mt-0.5 font-bold">Vendedor: {bet.sellerCode}</p>}
                  <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5 font-medium">ID: {bet.userId.slice(-6).toUpperCase()}</p>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-wrap justify-center gap-1 max-w-[200px] mx-auto">
                    {bet.numbers.sort((a, b) => a - b).map((num, i) => (
                      <span key={i} className="w-6 h-6 rounded-full bg-slate-100 text-slate-900 text-[10px] font-bold flex items-center justify-center border border-slate-200">
                        {num.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1.5">
                    {bet.status === 'pendente' ? (
                      <>
                        <button 
                          onClick={() => handleValidate(bet.id, 'validado')}
                          className="w-7 h-7 rounded-lg bg-lotofacil-yellow/10 text-lotofacil-yellow hover:bg-lotofacil-yellow hover:text-white transition-all flex items-center justify-center"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => handleValidate(bet.id, 'rejeitado')}
                          className="w-7 h-7 rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                        >
                          <X size={14} />
                        </button>
                        <button 
                          onClick={() => handleEditBet(bet)}
                          className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                          title="Editar Aposta"
                        >
                          <Pencil size={12} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedIds([bet.id]);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                          title="Excluir Aposta"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                          bet.status === 'validado' ? "bg-lotofacil-yellow/10 text-lotofacil-yellow" : "bg-red-100 text-red-600"
                        )}>
                          {bet.status}
                        </span>
                        <button 
                          onClick={() => handleEditBet(bet)}
                          className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                          title="Editar Aposta"
                        >
                          <Pencil size={12} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedIds([bet.id]);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DrawsTab = () => {
  const [contest, setContest] = useState<Contest | null>(null);
  const [drawResults, setDrawResults] = useState<string[][]>([
    Array(15).fill(''),
    Array(15).fill(''),
    Array(15).fill('')
  ]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDrawForBets, setSelectedDrawForBets] = useState<{number: number, results: number[]} | null>(null);
  const [contestBets, setContestBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchContest = async () => {
    const active = await firebaseService.getActiveContest();
    setContest(active);
    if (active) {
      const newResults = active.draws.map(d => {
        const res = Array(15).fill('');
        d.results.forEach((val, idx) => {
          if (idx < 15) res[idx] = val.toString().padStart(2, '0');
        });
        return res;
      });
      setDrawResults(newResults);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContest();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveDraw = async (drawNumber: number) => {
    if (!contest) return;
    const results = drawResults[drawNumber - 1]
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n));
    
    if (results.length !== 15) {
      alert('Por favor, preencha todos os 15 números.');
      return;
    }

    const uniqueResults = new Set(results);
    if (uniqueResults.size !== 15) {
      alert('Não é permitido números repetidos no sorteio.');
      return;
    }

    const invalidNumbers = results.filter(n => n < 1 || n > 25);
    if (invalidNumbers.length > 0) {
      alert('Os números devem estar entre 01 e 25.');
      return;
    }

    try {
      await firebaseService.updateDrawResult(contest.id, drawNumber, results);
      showSuccess(`Sorteio #${drawNumber} validado com sucesso!`);
      fetchContest();
    } catch (error) {
      console.error('Erro ao salvar sorteio:', error);
    }
  };

  const handleFinalizeContest = async () => {
    if (!contest) return;
    try {
      setIsFinalizing(true);
      await firebaseService.updateContestStatus(contest.id, 'encerrado');
      showSuccess('Concurso finalizado com sucesso!');
      await fetchContest();
      setShowFinalizeConfirm(false);
    } catch (error) {
      console.error('Erro ao finalizar concurso:', error);
      alert('Erro ao finalizar concurso.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleRecalculateRanking = async () => {
    console.log('Recalculate ranking button clicked');
    setShowRecalculateConfirm(false);
    setIsRecalculating(true);
    try {
      console.log('Calling firebaseService.recalculateGeneralRanking()...');
      await firebaseService.recalculateGeneralRanking();
      console.log('Recalculate ranking success');
      showSuccess('Corrida 150 PTS recalculada com sucesso!');
    } catch (error) {
      console.error('Error recalculating ranking:', error);
      alert('Erro ao recalcular ranking.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleViewBets = async (drawNumber: number, results: number[]) => {
    if (!contest) return;
    setSelectedDrawForBets({ number: drawNumber, results });
    setLoadingBets(true);
    try {
      const bets = await firebaseService.getContestBets(contest.id);
      setContestBets(bets);
    } catch (error) {
      console.error('Erro ao buscar apostas do concurso:', error);
    } finally {
      setLoadingBets(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-lotofacil-yellow/10 border border-lotofacil-yellow/20 rounded-xl p-2.5 flex items-center gap-2 text-lotofacil-yellow text-[10px] font-bold uppercase tracking-widest"
          >
            <CheckCircle size={14} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draws Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-col">
          <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">INSERIR <span className="text-lotofacil-purple">RESULTADOS</span></h2>
          {contest && (
            <span className="text-[9px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mt-1">Concurso #{contest.number}</span>
          )}
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={() => setShowRecalculateConfirm(true)}
            disabled={isRecalculating}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <TrendingUp size={16} />
            {isRecalculating ? 'RECALCULANDO...' : 'RECALCULAR RANKING'}
          </button>
          {contest && contest.status !== 'encerrado' && (
            <button 
              onClick={() => setShowFinalizeConfirm(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-lotofacil-purple text-white rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-lotofacil-purple/80 transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(147,51,234,0.3)]"
            >
              <CheckCircle size={16} />
              FINALIZAR CONCURSO
            </button>
          )}
        </div>
      </div>

      {/* Recalculate Ranking Confirmation Modal */}
      <AnimatePresence>
        {showRecalculateConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-600">
                <TrendingUp size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-display tracking-widest text-slate-900 uppercase">RECALCULAR <span className="text-lotofacil-purple uppercase">CORRIDA 150 PTS</span></h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Deseja realmente recalcular toda a Corrida 150 PTS? Isso irá reconstruir a pontuação de todos os participantes com base nos concursos encerrados.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRecalculateConfirm(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handleRecalculateRanking}
                  className="flex-1 px-6 py-3 bg-lotofacil-purple text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-lotofacil-purple/80 transition-all shadow-lg"
                >
                  RECALCULAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Finalize Confirmation Modal */}
      <AnimatePresence>
        {showFinalizeConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-4 text-lotofacil-purple">
                <AlertCircle size={32} />
                <h3 className="text-xl font-display tracking-widest uppercase text-slate-900">Finalizar Concurso</h3>
              </div>
              <p className="text-slate-600 text-sm">
                Deseja REALMENTE finalizar o concurso <span className="text-slate-900 font-bold">#{contest?.number}</span>? Esta ação irá bloquear novas alterações nos sorteios e marcar o concurso como encerrado.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFinalizeConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all uppercase tracking-widest text-[10px] font-bold border border-slate-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleFinalizeContest}
                  disabled={isFinalizing}
                  className="flex-1 py-3 rounded-xl bg-lotofacil-purple text-white hover:bg-lotofacil-purple/80 transition-all uppercase tracking-widest text-[10px] font-bold disabled:opacity-50 shadow-lg"
                >
                  {isFinalizing ? 'Finalizando...' : 'Finalizar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
        {[1, 2, 3].map(num => {
          const draw = contest?.draws.find(d => d.number === num);
          const hasResults = draw && draw.results.length > 0;

          return (
            <div key={num} className="bg-slate-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-display tracking-widest text-slate-900 uppercase">SORTEIO #{num}</h3>
                <div className="flex gap-2">
                  {hasResults && (
                    <button 
                      onClick={() => handleViewBets(num, draw.results)}
                      className="w-7 h-7 sm:w-8 sm:h-8 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg flex items-center justify-center transition-all shadow-sm"
                      title="Ver acertos"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-lotofacil-yellow/10 text-lotofacil-yellow rounded-lg flex items-center justify-center border border-lotofacil-yellow/20">
                    <Trophy size={14} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-between items-center">
                  <label className="block text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-600">15 Números</label>
                  <span className={cn(
                    "text-[10px] font-bold",
                    drawResults[num - 1].filter(n => n.trim() !== '').length === 15 ? "text-lotofacil-yellow" : "text-slate-200"
                  )}>
                    {drawResults[num - 1].filter(n => n.trim() !== '').length}/15
                  </span>
                </div>
                
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {drawResults[num - 1].map((val, idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={2}
                      placeholder="00"
                      value={val}
                      onChange={(e) => {
                        const newVal = e.target.value.replace(/\D/g, '').slice(0, 2);
                        const newResults = [...drawResults];
                        newResults[num - 1][idx] = newVal;
                        setDrawResults(newResults);
                        
                        // Auto-focus next input
                        if (newVal.length === 2 && idx < 14) {
                          const nextInput = document.getElementById(`draw-${num}-input-${idx + 1}`);
                          if (nextInput) nextInput.focus();
                        }
                      }}
                      id={`draw-${num}-input-${idx}`}
                      className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-200 text-center text-[10px] sm:text-xs font-black text-slate-900 focus:outline-none focus:border-lotofacil-purple focus:ring-2 focus:ring-lotofacil-purple/20 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_-1px_2px_rgba(0,0,0,0.05)] mx-auto",
                        val && drawResults[num - 1].filter(v => v === val).length > 1 && "border-red-500 text-red-600 bg-red-50",
                        val && (parseInt(val) < 1 || parseInt(val) > 25) && "border-orange-500 text-orange-600 bg-orange-50"
                      )}
                    />
                  ))}
                </div>

                <button 
                  onClick={() => handleSaveDraw(num)}
                  className="w-full py-2.5 bg-lotofacil-purple/10 text-lotofacil-purple border border-lotofacil-purple/20 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-lotofacil-purple hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save size={14} />
                  SALVAR #{num}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Draw Detail Modal */}
      <AnimatePresence>
        {selectedDrawForBets && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display tracking-widest text-slate-900 uppercase">ACERTOS <span className="text-blue-600">SORTEIO #{selectedDrawForBets.number}</span></h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedDrawForBets.results.map(num => (
                      <span key={num} className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-black shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_-1px_2px_rgba(0,0,0,0.1)] border border-slate-200">
                        {num.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDrawForBets(null)}
                  className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all border border-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 bg-slate-50/50">
                {loadingBets ? (
                  <p className="text-slate-600 text-center py-10 uppercase tracking-widest text-[10px] font-bold">Carregando apostas...</p>
                ) : contestBets.length === 0 ? (
                  <p className="text-slate-600 text-center py-10 uppercase tracking-widest text-[10px] font-bold">Nenhuma aposta validada para este concurso.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {contestBets.map((bet) => (
                      <div key={bet.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{bet.userName}</p>
                          <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">ID: {bet.userId.slice(-6).toUpperCase()}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {bet.numbers.map(num => {
                            const isHit = selectedDrawForBets.results.includes(num);
                            return (
                              <span 
                                key={num} 
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all",
                                  isHit 
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-md" 
                                    : "bg-slate-50 border-slate-100 text-slate-300"
                                )}
                              >
                                {num.toString().padStart(2, '0')}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-600 font-bold text-lg">
                            {bet.numbers.filter(n => selectedDrawForBets.results.includes(n)).length} <span className="text-[10px] uppercase font-normal">Acertos</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ContestsTab = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestBetCounts, setContestBetCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newContestNumber, setNewContestNumber] = useState('');
  const [newBetPrice, setNewBetPrice] = useState('10');
  const [newPublicLink, setNewPublicLink] = useState('');
  const [newPrizes, setNewPrizes] = useState<NonNullable<Contest['prizes']>>({
    draw1: '10 PTS',
    draw2: '10 PTS',
    draw3: '10 PTS',
    rapidinha1: '1° LUGAR',
    rapidinha2: '2° LUGAR',
    rankeada: 'LOTOMASTER'
  });

  const [newPrizeConfig, setNewPrizeConfig] = useState<NonNullable<Contest['prizeConfig']>>({
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

  const [editingPrizes, setEditingPrizes] = useState<{ id: string, prizes: NonNullable<Contest['prizes']>, prizeConfig?: Contest['prizeConfig'] } | null>(null);
  const [editingPublicLink, setEditingPublicLink] = useState<{ id: string, publicLink: string } | null>(null);

  const fetchContests = async () => {
    setLoading(true);
    try {
      const allContests = await firebaseService.getAllContests();
      setContests(allContests);
      
      // Fetch bet counts for each contest
      const counts: Record<string, number> = {};
      await Promise.all(allContests.map(async (c) => {
        counts[c.id] = await firebaseService.getContestTotalBets(c.id);
      }));
      setContestBetCounts(counts);
    } catch (error) {
      console.error('Erro ao buscar concursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    fetchContests();
  }, []);

  const handleNewContest = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(newContestNumber);
    if (isNaN(num)) return;

    try {
      await firebaseService.createContest(
        num, 
        newPrizes, 
        newPublicLink, 
        parseFloat(newBetPrice) || 10,
        newPrizeConfig
      );
      setNewContestNumber('');
      setNewPublicLink('');
      setNewPrizes({
        draw1: '10 PTS',
        draw2: '10 PTS',
        draw3: '10 PTS',
        rapidinha1: '1° LUGAR',
        rapidinha2: '2° LUGAR',
        rankeada: 'LOTOMASTER'
      });
      setNewPrizeConfig({
        pctRapidinha: 0.10,
        pctChampion: 0.45,
        pctVice: 0.15,
        pctSeller: 0.15,
        pctAdmin: 0.10,
        pctReserve: 0.05
      });
      setIsCreating(false);
      await fetchContests();
    } catch (error) {
      console.error('Erro ao criar concurso:', error);
    }
  };

  const handleUpdatePrizes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrizes) return;

    try {
      await firebaseService.updateContestPrizes(editingPrizes.id, editingPrizes.prizes);
      if (editingPrizes.prizeConfig) {
        await firebaseService.updateContestPrizeConfig(editingPrizes.id, editingPrizes.prizeConfig);
      }
      setEditingPrizes(null);
      await fetchContests();
    } catch (error) {
      console.error('Erro ao atualizar premiações:', error);
    }
  };

  const handleUpdatePublicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPublicLink) return;

    try {
      await firebaseService.updateContestPublicLink(editingPublicLink.id, editingPublicLink.publicLink);
      setEditingPublicLink(null);
      await fetchContests();
    } catch (error) {
      console.error('Erro ao atualizar link público:', error);
    }
  };

  const handleUpdateStatus = async (contestId: string, status: ContestStatus) => {
    try {
      await firebaseService.updateContestStatus(contestId, status);
      await fetchContests();
    } catch (error) {
      console.error('Erro ao atualizar status do concurso:', error);
    }
  };

  const handleResetAll = async () => {
    try {
      setIsResetting(true);
      await firebaseService.resetAllContests();
      await fetchContests();
      setShowResetConfirm(false);
      alert('Todos os concursos e apostas foram zerados com sucesso.');
    } catch (error) {
      console.error('Erro ao zerar concursos:', error);
      alert('Erro ao zerar concursos. Tente novamente.');
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusLabel = (status: ContestStatus) => {
    switch (status) {
      case 'aberto': return 'Aberto (Apostas Liberadas)';
      case 'em_andamento': return 'Em Andamento (Apostas Bloqueadas)';
      case 'encerrado': return 'Encerrado';
      default: return status;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">GESTÃO DE <span className="text-lotofacil-purple">CONCURSOS</span></h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {!isCreating && (
            <>
              <button 
                onClick={() => setShowResetConfirm(true)} 
                className="px-3 py-2 bg-red-100 text-red-600 border border-red-200 rounded-xl flex items-center gap-2 text-[9px] sm:text-xs justify-center hover:bg-red-200 transition-all font-bold uppercase tracking-widest"
              >
                <Trash2 size={14} />
                ZERAR TUDO
              </button>
              <button 
                onClick={() => setIsCreating(true)} 
                className="bg-lotofacil-purple text-white py-2 px-4 sm:px-6 rounded-xl flex items-center gap-2 text-[9px] sm:text-xs justify-center font-bold uppercase tracking-widest shadow-[0_4px_10px_rgba(107,33,168,0.3)]"
              >
                <Plus size={14} />
                NOVO CONCURSO
              </button>
            </>
          )}
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full space-y-6 text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-display tracking-widest text-slate-900 uppercase">ATENÇÃO!</h3>
              <p className="text-slate-600 text-sm">
                Esta ação irá deletar <span className="text-slate-900 font-bold">TODOS</span> os concursos, apostas e zerar os pontos de todos os usuários. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleResetAll}
                disabled={isResetting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg"
              >
                {isResetting ? 'ZERANDO...' : 'SIM, ZERAR TUDO'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isCreating && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-lotofacil-purple/30 space-y-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Criar Novo Concurso</h3>
          <form onSubmit={handleNewContest} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Número do Concurso</label>
                <input 
                  type="number" 
                  value={newContestNumber}
                  onChange={(e) => setNewContestNumber(e.target.value)}
                  placeholder="Ex: 3050"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Preço da Aposta (R$)</label>
                <input 
                  type="number" 
                  value={newBetPrice}
                  onChange={(e) => setNewBetPrice(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Link Público (Sorteio)</label>
                <input 
                  type="text" 
                  value={newPublicLink}
                  onChange={(e) => setNewPublicLink(e.target.value)}
                  placeholder="Ex: https://youtube.com/..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Rankeada</label>
                <input 
                  type="text" 
                  value={newPrizes.rankeada}
                  onChange={(e) => setNewPrizes({...newPrizes, rankeada: e.target.value})}
                  placeholder="Ex: LOTOMASTER"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">1° Sorteio</label>
                <input 
                  type="text" 
                  value={newPrizes.draw1}
                  onChange={(e) => setNewPrizes({...newPrizes, draw1: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">2° Sorteio</label>
                <input 
                  type="text" 
                  value={newPrizes.draw2}
                  onChange={(e) => setNewPrizes({...newPrizes, draw2: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">3° Sorteio</label>
                <input 
                  type="text" 
                  value={newPrizes.draw3}
                  onChange={(e) => setNewPrizes({...newPrizes, draw3: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Rapidinha 1° Lugar</label>
                <input 
                  type="text" 
                  value={newPrizes.rapidinha1}
                  onChange={(e) => setNewPrizes({...newPrizes, rapidinha1: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Rapidinha 2° Lugar</label>
                <input 
                  type="text" 
                  value={newPrizes.rapidinha2}
                  onChange={(e) => setNewPrizes({...newPrizes, rapidinha2: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
            </div>

            {/* Prêmios Fixos (Valores) */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
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
                        value={(newPrizeConfig as any)[item.key] || 0}
                        onChange={(e) => setNewPrizeConfig({
                          ...newPrizeConfig, 
                          [item.key]: parseFloat(e.target.value) || 0
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Configuração de Porcentagens (%)</h4>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                  Math.round((newPrizeConfig.pctRapidinha + newPrizeConfig.pctChampion + newPrizeConfig.pctVice + newPrizeConfig.pctSeller + newPrizeConfig.pctAdmin + newPrizeConfig.pctReserve) * 100) === 100
                    ? "bg-green-50 text-green-600 border-green-200"
                    : "bg-red-50 text-red-600 border-red-200"
                )}>
                  Total: {Math.round((newPrizeConfig.pctRapidinha + newPrizeConfig.pctChampion + newPrizeConfig.pctVice + newPrizeConfig.pctSeller + newPrizeConfig.pctAdmin + newPrizeConfig.pctReserve) * 100)}%
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {[
                  { label: 'Rapidinha', key: 'pctRapidinha', color: 'bg-blue-50 text-blue-600' },
                  { label: 'Campeão', key: 'pctChampion', color: 'bg-green-50 text-green-600' },
                  { label: 'Vice', key: 'pctVice', color: 'bg-orange-50 text-orange-600' },
                  { label: 'Vendedor', key: 'pctSeller', color: 'bg-purple-50 text-purple-600' },
                  { label: 'Admin', key: 'pctAdmin', color: 'bg-slate-50 text-slate-600' },
                  { label: 'Reserva', key: 'pctReserve', color: 'bg-red-50 text-red-600' },
                ].map((item) => (
                  <div key={item.key} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    <label className={cn("block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md w-fit", item.color)}>
                      {item.label}
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={Math.round((newPrizeConfig as any)[item.key] * 100)}
                        onChange={(e) => setNewPrizeConfig({
                          ...newPrizeConfig, 
                          [item.key]: (parseFloat(e.target.value) || 0) / 100
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-lotofacil-purple/50 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
              {Math.round((newPrizeConfig.pctRapidinha + newPrizeConfig.pctChampion + newPrizeConfig.pctVice + newPrizeConfig.pctSeller + newPrizeConfig.pctAdmin + newPrizeConfig.pctReserve) * 100) !== 100 && (
                <p className="text-[10px] text-red-500 font-medium animate-pulse">
                  * A soma das porcentagens deve ser exatamente 100%
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 bg-lotofacil-purple text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-lotofacil-purple/80 transition-all shadow-lg"
              >
                Criar Concurso
              </button>
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {editingPrizes && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-lotofacil-purple/10 text-lotofacil-purple flex items-center justify-center">
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-display tracking-widest text-slate-900 uppercase">Configurar Premiações</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Concurso #{editingPrizes.id.split('_')[0]}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingPrizes(null)}
                className="w-10 h-10 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
              <form id="prizes-form" onSubmit={handleUpdatePrizes} className="space-y-8">
                {/* Descrições dos Prêmios */}
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
                          value={(editingPrizes.prizes as any)[item.key]}
                          onChange={(e) => setEditingPrizes({...editingPrizes, prizes: {...editingPrizes.prizes, [item.key]: e.target.value}})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50 transition-all"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Rapidinha 1° Lugar', key: 'rapidinha1' },
                      { label: 'Rapidinha 2° Lugar', key: 'rapidinha2' },
                    ].map(item => (
                      <div key={item.key} className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">{item.label}</label>
                        <input 
                          type="text" 
                          value={(editingPrizes.prizes as any)[item.key]}
                          onChange={(e) => setEditingPrizes({...editingPrizes, prizes: {...editingPrizes.prizes, [item.key]: e.target.value}})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50 transition-all"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Rankeada</label>
                    <input 
                      type="text" 
                      value={editingPrizes.prizes.rankeada}
                      onChange={(e) => setEditingPrizes({...editingPrizes, prizes: {...editingPrizes.prizes, rankeada: e.target.value}})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Prêmios Fixos (Valores) */}
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
                            value={(editingPrizes.prizeConfig as any)?.[item.key] || 0}
                            onChange={(e) => setEditingPrizes({
                              ...editingPrizes, 
                              prizeConfig: {
                                ...(editingPrizes.prizeConfig || {}), 
                                [item.key]: parseFloat(e.target.value) || 0
                              } as any
                            })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Porcentagens */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-500" />
                      Distribuição por Porcentagem (%)
                    </h4>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                      Math.round(((editingPrizes.prizeConfig?.pctRapidinha || 0) + (editingPrizes.prizeConfig?.pctChampion || 0) + (editingPrizes.prizeConfig?.pctVice || 0) + (editingPrizes.prizeConfig?.pctSeller || 0) + (editingPrizes.prizeConfig?.pctAdmin || 0) + (editingPrizes.prizeConfig?.pctReserve || 0)) * 100) === 100
                        ? "bg-green-50 text-green-600 border-green-200"
                        : "bg-red-50 text-red-600 border-red-200"
                    )}>
                      Total: {Math.round(((editingPrizes.prizeConfig?.pctRapidinha || 0) + (editingPrizes.prizeConfig?.pctChampion || 0) + (editingPrizes.prizeConfig?.pctVice || 0) + (editingPrizes.prizeConfig?.pctSeller || 0) + (editingPrizes.prizeConfig?.pctAdmin || 0) + (editingPrizes.prizeConfig?.pctReserve || 0)) * 100)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Rapidinha', key: 'pctRapidinha', color: 'bg-blue-50 text-blue-600' },
                      { label: 'Campeão', key: 'pctChampion', color: 'bg-green-50 text-green-600' },
                      { label: 'Vice', key: 'pctVice', color: 'bg-orange-50 text-orange-600' },
                      { label: 'Vendedor', key: 'pctSeller', color: 'bg-purple-50 text-purple-600' },
                      { label: 'Admin', key: 'pctAdmin', color: 'bg-slate-50 text-slate-600' },
                      { label: 'Reserva', key: 'pctReserve', color: 'bg-red-50 text-red-600' },
                    ].map((item) => (
                      <div key={item.key} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 space-y-2">
                        <label className={cn("block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md w-fit", item.color)}>
                          {item.label}
                        </label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={Math.round(((editingPrizes.prizeConfig as any)?.[item.key] || 0) * 100)}
                            onChange={(e) => setEditingPrizes({
                              ...editingPrizes, 
                              prizeConfig: {
                                ...(editingPrizes.prizeConfig || {}), 
                                [item.key]: (parseFloat(e.target.value) || 0) / 100
                              } as any
                            })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-lotofacil-purple/50 pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button 
                type="button"
                onClick={() => setEditingPrizes(null)}
                className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="prizes-form"
                className="flex-1 py-4 bg-lotofacil-purple text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-lotofacil-purple/90 transition-all shadow-lg shadow-purple-200"
              >
                Salvar Configurações
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingPublicLink && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl"
          >
            <h3 className="text-xl font-display tracking-widest text-slate-900 uppercase text-center">Editar Link Público</h3>
            <form onSubmit={handleUpdatePublicLink} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Link do Sorteio</label>
                <input 
                  type="text" 
                  value={editingPublicLink.publicLink}
                  onChange={(e) => setEditingPublicLink({...editingPublicLink, publicLink: e.target.value})}
                  placeholder="Ex: https://youtube.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setEditingPublicLink(null)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-lotofacil-purple text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-lotofacil-purple/80 transition-all shadow-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        {loading ? (
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Carregando...</p>
        ) : contests.length === 0 ? (
          <p className="text-slate-500 text-[10px] uppercase tracking-widest italic">Nenhum concurso encontrado.</p>
        ) : contests.map(c => (
          <div key={c.id} className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center",
                c.status === 'aberto' ? "bg-lotofacil-yellow/10 text-lotofacil-yellow" : 
                c.status === 'em_andamento' ? "bg-lotofacil-purple/10 text-lotofacil-purple" :
                "bg-slate-50 text-slate-300 border border-slate-100"
              )}>
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-bold text-slate-900">Concurso #{c.number}</h3>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[8px] sm:text-[10px] text-slate-600 uppercase tracking-widest">Status: {getStatusLabel(c.status)}</p>
                  <p className="text-[8px] sm:text-[10px] text-lotofacil-yellow uppercase tracking-widest font-bold">Apostas: {contestBetCounts[c.id] || 0}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button 
                onClick={() => setEditingPublicLink({
                  id: c.id,
                  publicLink: c.publicLink || ''
                })}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-sm"
                title="Editar Link Público"
              >
                <Play size={16} />
              </button>
              <button 
                onClick={() => setEditingPrizes({
                  id: c.id,
                  prizes: c.prizes || {
                    draw1: '10 PTS',
                    draw2: '10 PTS',
                    draw3: '10 PTS',
                    rapidinha1: '1° LUGAR',
                    rapidinha2: '2° LUGAR',
                    rankeada: 'LOTOMASTER'
                  },
                  prizeConfig: c.prizeConfig || {
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
                  }
                })}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-slate-600 hover:text-lotofacil-purple border border-slate-200 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-sm"
                title="Editar Premiações"
              >
                <Trophy size={16} />
              </button>
              {c.status === 'aberto' && (
                <button 
                  onClick={() => handleUpdateStatus(c.id, 'em_andamento')}
                  className="px-2.5 py-1.5 bg-lotofacil-purple/10 text-lotofacil-purple border border-lotofacil-purple/20 rounded-lg hover:bg-lotofacil-purple/20 transition-all flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest"
                  title="Bloquear Novas Apostas e Iniciar Sorteios"
                >
                  <Lock size={12} />
                  INICIAR
                </button>
              )}
              {c.status === 'em_andamento' && (
                <>
                  <button 
                    onClick={() => handleUpdateStatus(c.id, 'aberto')}
                    className="px-2.5 py-1.5 bg-lotofacil-yellow/10 text-lotofacil-yellow rounded-lg hover:bg-lotofacil-yellow/20 transition-all flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest"
                    title="Liberar Apostas"
                  >
                    <Unlock size={12} />
                    ABRIR
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(c.id, 'encerrado')}
                    className="px-2.5 py-1.5 bg-lotofacil-purple/20 text-lotofacil-purple rounded-lg hover:bg-lotofacil-purple/30 transition-all flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest"
                    title="Finalizar Concurso"
                  >
                    <CheckCircle size={12} />
                    FINALIZAR
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SellersTab = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSeller, setNewSeller] = useState({
    userId: '',
    code: '',
    commissionPct: 15,
    pixKey: ''
  });

  useEffect(() => {
    const unsubscribeSellers = firebaseService.subscribeToAllSellers((sellersData) => {
      setSellers(sellersData);
      setLoading(false);
    });

    const unsubscribeUsers = firebaseService.subscribeToAllUsers((usersData) => {
      setUsers(usersData);
    });

    return () => {
      unsubscribeSellers();
      unsubscribeUsers();
    };
  }, []);

  const filteredUsersForSeller = users.filter(u => {
    const isClient = u.role === 'cliente' || !u.role;
    if (!isClient) return false;
    
    if (!userSearchTerm) return true;
    
    const searchLower = userSearchTerm.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.whatsapp || '').toLowerCase().includes(searchLower)
    );
  });

  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeller.userId || !newSeller.code) return;
    
    try {
      await firebaseService.createSeller(newSeller);
      setIsAdding(false);
      setNewSeller({ userId: '', code: '', commissionPct: 15, pixKey: '' });
      alert('Vendedor cadastrado com sucesso!');
    } catch (error) {
      console.error('Error adding seller:', error);
      alert('Erro ao cadastrar vendedor.');
    }
  };

  const handleDeleteSeller = async (sellerId: string, userId: string) => {
    if (!window.confirm('Deseja realmente remover este vendedor? O usuário voltará a ser "cliente".')) return;
    try {
      await firebaseService.deleteSeller(sellerId, userId);
      alert('Vendedor removido com sucesso!');
    } catch (error) {
      console.error('Error deleting seller:', error);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!window.confirm('Deseja promover este usuário a ADMINISTRADOR?')) return;
    try {
      await firebaseService.updateUserRole(userId, 'admin');
      alert('Usuário promovido a Administrador!');
    } catch (error) {
      console.error('Error promoting user:', error);
    }
  };

  const handleUpdateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeller) return;
    try {
      await firebaseService.updateSeller(editingSeller.id, {
        commissionPct: editingSeller.commissionPct,
        pixKey: editingSeller.pixKey
      });
      setEditingSeller(null);
      alert('Vendedor atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating seller:', error);
      alert('Erro ao atualizar vendedor.');
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">GESTÃO DE <span className="text-lotofacil-purple">VENDEDORES</span></h2>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-lotofacil-purple text-white py-2 px-4 sm:px-6 rounded-xl flex items-center gap-2 text-[9px] sm:text-xs w-full sm:w-auto justify-center font-bold uppercase tracking-widest shadow-[0_4px_10px_rgba(107,33,168,0.3)]"
          >
            <Plus size={14} />
            CADASTRAR VENDEDOR
          </button>
        )}
      </div>

      <AnimatePresence>
        {editingSeller && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display tracking-widest uppercase text-slate-900">Editar Vendedor</h3>
                <button onClick={() => setEditingSeller(null)} className="text-slate-400 hover:text-slate-600 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateSeller} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Comissão %</label>
                  <input 
                    type="number" 
                    value={editingSeller.commissionPct}
                    onChange={(e) => setEditingSeller({ ...editingSeller, commissionPct: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Chave PIX</label>
                  <input 
                    type="text" 
                    value={editingSeller.pixKey || ''}
                    onChange={(e) => setEditingSeller({ ...editingSeller, pixKey: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-lotofacil-purple text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-lotofacil-purple/80 transition-all shadow-lg"
                  >
                    Salvar Alterações
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingSeller(null)}
                    className="flex-1 border border-slate-200 text-slate-400 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAdding && (
        <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-lotofacil-purple/30 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Cadastrar Novo Vendedor</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Buscar Usuário</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Nome, e-mail ou whatsapp..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Selecionar Usuário</label>
                <select 
                  value={newSeller.userId}
                  onChange={(e) => setNewSeller({ ...newSeller, userId: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                >
                  <option value="">{filteredUsersForSeller.length === 0 ? 'Nenhum usuário encontrado' : 'Selecionar Usuário'}</option>
                  {filteredUsersForSeller.map(u => (
                    <option key={u.id} value={u.id}>{u.name} {u.email ? `(${u.email})` : u.whatsapp ? `(${u.whatsapp})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={handleAddSeller} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Código do Vendedor</label>
                <input 
                  type="text" 
                  value={newSeller.code}
                  onChange={(e) => setNewSeller({ ...newSeller, code: e.target.value.toUpperCase() })}
                  placeholder="Código (ex: REF123)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Comissão %</label>
                <input 
                  type="number" 
                  value={newSeller.commissionPct}
                  onChange={(e) => setNewSeller({ ...newSeller, commissionPct: Number(e.target.value) })}
                  placeholder="Comissão %"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Chave PIX (Para Recebimento)</label>
                <input 
                  type="text" 
                  value={newSeller.pixKey}
                  onChange={(e) => setNewSeller({ ...newSeller, pixKey: e.target.value })}
                  placeholder="Chave PIX (E-mail, CPF, Tel, etc)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lotofacil-purple/50"
                  required
                />
              </div>
              <div className="sm:col-span-2 flex gap-2 pt-2">
                <button 
                  type="submit"
                  className="flex-1 bg-lotofacil-purple text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-lotofacil-purple/80 transition-all shadow-lg"
                >
                  Confirmar Cadastro
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setUserSearchTerm('');
                  }}
                  className="flex-1 border border-slate-200 text-slate-400 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold">Código</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold">Vendedor</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-center">Comissão %</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-center">Vendas</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-center">Total Comissão</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-center">Chave PIX</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sellers.map(s => {
              const user = users.find(u => u.id === s.userId);
              return (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                  <td className="px-6 py-4 font-mono text-lotofacil-yellow text-sm font-bold">{s.code}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{user?.name || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">{user?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-500">{s.commissionPct}%</td>
                  <td className="px-6 py-4 text-center text-sm text-slate-900 font-bold">{s.totalSales || 0}</td>
                  <td className="px-6 py-4 text-center text-sm text-lotofacil-purple font-bold">R$ {(s.totalCommission || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center text-[10px] text-slate-600 font-mono">{s.pixKey || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setEditingSeller(s)}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                        title="Editar Vendedor"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => handlePromoteToAdmin(s.userId)}
                        className="p-2 bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white rounded-lg transition-all"
                        title="Promover a Admin"
                      >
                        <ShieldCheck size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSeller(s.id, s.userId)}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                        title="Remover Vendedor"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sellers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic text-sm">Nenhum vendedor cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToAllUsers((usersData) => {
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateRole = async (userId: string, role: AppUser['role']) => {
    if (!window.confirm(`Deseja alterar o cargo deste usuário para ${role.toUpperCase()}?`)) return;
    try {
      await firebaseService.updateUserRole(userId, role);
      alert('Cargo atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center text-slate-500">Carregando usuários...</div>;

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">GESTÃO DE <span className="text-lotofacil-purple">USUÁRIOS</span></h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full border border-slate-200 uppercase tracking-widest">
              Total: {users.length} Usuários
            </span>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Buscar usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-[10px] sm:text-xs w-full placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold">Nome / E-mail</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-center">Cargo Atual</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(u => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-900">{u.name || 'Sem Nome'}</p>
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest">{u.email}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                    u.role === 'master' ? "bg-red-100 text-red-600" :
                    u.role === 'admin' ? "bg-blue-100 text-blue-600" :
                    u.role === 'vendedor' ? "bg-lotofacil-yellow/10 text-lotofacil-yellow" :
                    "bg-slate-100 text-slate-500"
                  )}>
                    {u.role || 'cliente'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {u.role !== 'admin' && u.role !== 'master' && (
                      <button 
                        onClick={() => handleUpdateRole(u.id, 'admin')}
                        className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-[9px] font-bold uppercase transition-all"
                      >
                        Tornar Admin
                      </button>
                    )}
                    {u.role === 'admin' && (
                      <button 
                        onClick={() => handleUpdateRole(u.id, 'cliente')}
                        className="px-3 py-1 bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white rounded-lg text-[9px] font-bold uppercase transition-all"
                      >
                        Remover Admin
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ReportsTab = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [betCounts, setBetCounts] = useState<Record<string, number>>({});
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeUsers = firebaseService.subscribeToAllUsers((allUsers) => {
      setUserCount(allUsers.length);
    });

    const fetchData = async () => {
      try {
        const allContests = await firebaseService.getAllContests();
        setContests(allContests);
        
        const counts: Record<string, number> = {};
        await Promise.all(allContests.map(async (c) => {
          counts[c.id] = await firebaseService.getContestTotalBets(c.id, 'validado');
        }));
        setBetCounts(counts);
      } catch (error) {
        console.error('Error fetching reports data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => unsubscribeUsers();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">Carregando relatórios...</div>;

  const totalRevenue = contests.reduce((acc, c) => {
    const count = betCounts[c.id] || 0;
    const price = c.betPrice || 10;
    return acc + (count * price);
  }, 0);

  const totalBets = Object.values(betCounts).reduce((acc, count) => (acc as number) + (count as number), 0) as number;

  return (
    <div className="space-y-6 sm:space-y-8">
      <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">RELATÓRIOS <span className="text-lotofacil-purple">FINANCEIROS</span></h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-slate-200 space-y-3 sm:space-y-4 shadow-sm">
          <p className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-600">Arrecadação Total</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
          <div className="flex items-center gap-2 text-lotofacil-yellow text-[10px] sm:text-xs">
            <TrendingUp size={12} />
            <span>{totalBets} Apostas Validadas</span>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-slate-200 space-y-3 sm:space-y-4 shadow-sm">
          <p className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-600">Média por Concurso</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {(contests.length > 0 ? totalRevenue / contests.length : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{contests.length} Concursos Realizados</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-slate-200 space-y-3 sm:space-y-4 shadow-sm">
          <p className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-600">Base de Usuários</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {userCount}
          </h3>
          <div className="flex items-center gap-2 text-blue-600 text-[10px] sm:text-xs">
            <Users size={12} />
            <span>Usuários Cadastrados</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Histórico por Concurso</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold">Concurso</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold">Status</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-center">Apostas</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-center">Preço</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold text-right">Arrecadação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contests.map(c => {
                const count = betCounts[c.id] || 0;
                const price = c.betPrice || 10;
                const revenue = count * price;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-all">
                    <td className="px-6 py-4 font-bold text-slate-900">#{c.number}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest",
                        c.status === 'aberto' ? "bg-green-100 text-green-700" :
                        c.status === 'em_andamento' ? "bg-yellow-100 text-yellow-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">{count}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">R$ {price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-lotofacil-purple">
                      {revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ConfigTab: React.FC = () => {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await firebaseService.getSettings();
      if (settings) {
        setWhatsappNumber(settings.whatsappNumber || '');
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await firebaseService.updateSettings({ whatsappNumber });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg sm:text-xl font-display tracking-widest text-slate-900 uppercase">CONFIGURAÇÕES DO <span className="text-lotofacil-purple">SISTEMA</span></h2>
        <p className="text-[10px] sm:text-sm text-slate-600 mt-1">Ajuste parâmetros globais do aplicativo.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-slate-600 mb-2 ml-1 font-bold">WhatsApp para Validação</label>
            <div className="relative">
              <input 
                type="text" 
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Ex: 5511999999999"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-sm text-slate-900"
              />
              <p className="text-[9px] text-slate-500 mt-2 ml-1 leading-relaxed">Insira apenas números com DDD (ex: 5511999999999). Este número será usado no botão de validação de apostas.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            type="submit"
            disabled={loading}
            className="bg-lotofacil-purple text-white px-6 h-11 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(107,33,168,0.3)] disabled:opacity-30 text-[10px] font-bold uppercase tracking-widest"
          >
            {loading ? 'SALVANDO...' : (
              <>
                <Save size={16} />
                SALVAR
              </>
            )}
          </button>
          
          {success && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-lotofacil-yellow text-[10px] font-bold uppercase tracking-widest"
            >
              <Check size={16} />
              SALVO!
            </motion.div>
          )}
        </div>
      </form>
    </div>
  );
};

const FinanceiroTab: React.FC = () => {
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [contest, allSellers] = await Promise.all([
        firebaseService.getActiveContest(),
        firebaseService.getAllSellers()
      ]);
      
      setActiveContest(contest);
      setSellers(allSellers);
      
      if (contest) {
        const contestBets = await firebaseService.getContestBets(contest.id);
        setBets(contestBets);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">Carregando dados financeiros...</div>;
  if (!activeContest) return <div className="p-10 text-center text-slate-500 italic uppercase tracking-widest text-[10px] font-bold">Nenhum concurso ativo para análise financeira.</div>;

  const betPrice = activeContest.betPrice || 10;
  const totalRevenue = bets.length * betPrice;
  
  // Percentages from contest config or defaults
  const config = activeContest.prizeConfig || {
    pctRapidinha: 0.10,
    pctChampion: 0.45,
    pctVice: 0.15,
    pctSeller: 0.15,
    pctAdmin: 0.10,
    pctReserve: 0.05
  };

  const values = {
    rapidinha: totalRevenue * (config.pctRapidinha || 0.10),
    champion: totalRevenue * (config.pctChampion || 0.45),
    vice: totalRevenue * (config.pctVice || 0.15),
    seller: totalRevenue * (config.pctSeller || 0.15),
    admin: totalRevenue * (config.pctAdmin || 0.10),
    reserve: totalRevenue * (config.pctReserve || 0.05),
    totalPrizes: totalRevenue * ((config.pctRapidinha || 0.10) + (config.pctChampion || 0.45) + (config.pctVice || 0.15)),
    totalOperation: totalRevenue * ((config.pctSeller || 0.15) + (config.pctAdmin || 0.10)),
  };

  // Calculate seller performance for this contest
  const sellerStats = sellers.map(seller => {
    const sellerBets = bets.filter(b => b.sellerCode === seller.code);
    const sales = sellerBets.length;
    const totalSalesValue = sales * betPrice;
    const commission = totalSalesValue * (seller.commissionPct / 100);
    const repasse = totalSalesValue - commission;
    return {
      ...seller,
      currentSales: sales,
      currentCommission: commission,
      currentRepasse: repasse
    };
  }).filter(s => s.currentSales > 0).sort((a, b) => b.currentSales - a.currentSales);

  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">RESUMO <span className="text-lotofacil-purple">FINANCEIRO</span></h2>
          <p className="text-[10px] sm:text-sm text-slate-600 mt-1">Concurso #{activeContest.number} • {bets.length} Apostas Validadas</p>
        </div>
        <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl">
          <p className="text-[8px] uppercase tracking-widest text-slate-400 mb-1">Total Arrecadado</p>
          <p className="text-xl sm:text-3xl font-black text-lotofacil-yellow">
            {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Prizes Column */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Trophy size={14} className="text-lotofacil-purple" />
            Distribuição de Prêmios (70%)
          </h3>
          <div className="glass-card p-6 space-y-6 border-lotofacil-purple/10">
            <FinanceItem label="Rapidinha (10%)" value={values.rapidinha} color="text-slate-900" />
            <FinanceItem label="Campeão (45%)" value={values.champion} color="text-lotofacil-purple" />
            <FinanceItem label="Vice-Campeão (15%)" value={values.vice} color="text-blue-600" />
            <div className="pt-4 border-t border-slate-100">
              <FinanceItem label="Total em Prêmios" value={values.totalPrizes} color="text-slate-900" bold />
            </div>
          </div>
        </div>

        {/* Operation Column */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Users size={14} className="text-blue-600" />
            Operação e Vendas (25%)
          </h3>
          <div className="glass-card p-6 space-y-6 border-blue-100">
            <FinanceItem label="Comissão Vendedores (15%)" value={values.seller} color="text-slate-900" />
            <FinanceItem label="Operação Admin (10%)" value={values.admin} color="text-blue-600" />
            <div className="pt-4 border-t border-slate-100">
              <FinanceItem label="Total Operação" value={values.totalOperation} color="text-slate-900" bold />
            </div>
          </div>
        </div>

        {/* Reserve Column */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <ShieldCheck size={14} className="text-lotofacil-yellow" />
            Reserva e Garantia (5%)
          </h3>
          <div className="glass-card p-6 space-y-6 border-lotofacil-yellow/10">
            <FinanceItem label="Fundo de Reserva (5%)" value={values.reserve} color="text-lotofacil-yellow" />
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[8px] uppercase tracking-widest text-slate-400 mb-2">Prêmios Fixos Garantidos</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-600">10 PTS (Sorteios)</span>
                  <span className="text-[10px] font-bold text-slate-900">R$ 500,00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-600">27+ PTS (Total)</span>
                  <span className="text-[10px] font-bold text-slate-900">R$ 5.000,00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Performance Table */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Store size={14} className="text-lotofacil-purple" />
          Desempenho por Vendedor (Concurso Atual)
        </h3>
        <div className="glass-card overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Vendedor</th>
                  <th className="px-6 py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold text-center">Código</th>
                  <th className="px-6 py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold text-center">Vendas</th>
                  <th className="px-6 py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold text-right">Comissão</th>
                  <th className="px-6 py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold text-right">Repasse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellerStats.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-all">
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">{s.code}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{s.code}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-slate-900">{s.currentSales}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-black text-emerald-600">
                        {s.currentCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-black text-blue-600">
                        {s.currentRepasse.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                  </tr>
                ))}
                {sellerStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic text-sm">Nenhuma venda registrada por vendedores neste concurso.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
          <Info size={20} className="text-slate-600" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Nota sobre Automação</p>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Os valores acima são calculados automaticamente com base no número de apostas validadas e no preço definido para o concurso (R$ {betPrice}). 
            A distribuição segue rigorosamente as porcentagens definidas: 70% Prêmios, 25% Operação e 5% Reserva.
          </p>
        </div>
      </div>
    </div>
  );
};

const FinanceItem = ({ label, value, color, bold = false }: { label: string, value: number, color: string, bold?: boolean }) => (
  <div className="flex justify-between items-center">
    <span className={cn("text-[10px] uppercase tracking-widest text-slate-500", bold && "font-bold text-slate-700")}>{label}</span>
    <span className={cn("text-sm font-bold", color, bold && "text-lg font-black")}>
      {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
    </span>
  </div>
);

export default AdminPanel;
