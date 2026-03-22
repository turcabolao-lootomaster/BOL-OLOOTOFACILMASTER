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
  Eye,
  ArrowLeft,
  Play,
  Lock,
  Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  ];

  if (user?.role !== 'admin' && user?.role !== 'master') {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-white">Acesso Negado</h1>
        <p className="text-white/40 mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-display tracking-widest text-white">PAINEL <span className="text-neon-green uppercase">ADMINISTRATIVO</span></h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1 sm:mt-2">Gestão completa do sistema, sorteios e relatórios financeiros.</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl sm:rounded-2xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-neon-green text-black shadow-[0_0_15px_rgba(0,255,0,0.3)]" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={12} />
              <span className="inline">{tab.label}</span>
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
          className="glass-card p-5 sm:p-8"
        >
          {activeTab === 'apostas' && <BetsTab />}
          {activeTab === 'sorteios' && <DrawsTab />}
          {activeTab === 'concursos' && <ContestsTab />}
          {activeTab === 'vendedores' && <SellersTab />}
          {activeTab === 'relatorios' && <ReportsTab />}
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

  const filteredBets = bets.filter(b => 
    b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.betName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.sellerCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white uppercase">GESTÃO DE <span className="text-neon-green">APOSTAS</span></h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-[10px] sm:text-xs text-white focus:outline-none"
          >
            <option value="pendente">Pendentes</option>
            <option value="validado">Validadas</option>
            <option value="rejeitado">Rejeitadas</option>
            <option value="todos">Todas</option>
          </select>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text" 
              placeholder="Buscar cliente ou vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 sm:pl-10 pr-4 focus:outline-none focus:border-neon-green/50 transition-all text-[10px] sm:text-xs w-full"
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center gap-4 text-accent-orange">
                <AlertCircle size={32} />
                <h3 className="text-xl font-display tracking-widest uppercase">Confirmar Exclusão</h3>
              </div>
              <p className="text-white/60 text-sm">
                Deseja EXCLUIR DEFINITIVAMENTE <span className="text-white font-bold">{selectedIds.length}</span> apostas selecionadas? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-all uppercase tracking-widest text-[10px] font-bold"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmBulkDelete}
                  className="flex-1 py-3 rounded-xl bg-accent-orange text-black hover:bg-accent-orange/80 transition-all uppercase tracking-widest text-[10px] font-bold"
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
            className="bg-neon-green/20 border border-neon-green/30 rounded-xl p-3 flex items-center gap-2 text-neon-green text-xs font-bold uppercase tracking-widest"
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
            className="bg-neon-green/10 border border-neon-green/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-neon-green text-black flex items-center justify-center font-bold text-xs">
                {selectedIds.length}
              </div>
              <p className="text-xs font-bold text-white uppercase tracking-widest">Apostas Selecionadas</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={handleBulkValidate}
                disabled={isBulkProcessing}
                className="flex-1 sm:flex-none bg-neon-green text-black px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-neon-green/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle size={14} />
                Validar Selecionadas
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="flex-1 sm:flex-none bg-accent-red text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-accent-red/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Excluir Selecionadas
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto -mx-5 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="px-4 sm:px-6 py-3 sm:py-4 w-10" style={{ color: '#a9f110' }}>
                <div 
                  onClick={toggleSelectAll}
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all",
                    selectedIds.length === filteredBets.length && filteredBets.length > 0
                      ? "bg-neon-green border-neon-green text-black" 
                      : "border-white/20 hover:border-white/40"
                  )}
                >
                  {selectedIds.length === filteredBets.length && filteredBets.length > 0 && <Check size={10} strokeWidth={4} />}
                </div>
              </th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold" style={{ color: '#beeb0f' }}>Data</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold" style={{ color: '#d0f115' }}>Cliente / Vendedor</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-center" style={{ color: '#7fea11' }}>S1</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-center" style={{ color: '#bbf10e' }}>S2</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-center" style={{ color: '#9df40f' }}>S3</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-center" style={{ color: '#9ce710' }}>Pontos</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 sm:px-6 py-8 sm:py-10 text-center text-white/40 text-xs">Carregando apostas...</td></tr>
            ) : filteredBets.length === 0 ? (
              <tr><td colSpan={8} className="px-4 sm:px-6 py-8 sm:py-10 text-center text-white/40 text-xs">Nenhuma aposta encontrada.</td></tr>
            ) : filteredBets.map((bet) => (
              <tr 
                key={bet.id} 
                className={cn(
                  "border-b border-white/5 hover:bg-white/5 transition-all",
                  selectedIds.includes(bet.id) && "bg-white/5"
                )}
              >
                <td className="px-4 sm:px-6 py-4 sm:py-5">
                  <div 
                    onClick={() => toggleSelectBet(bet.id)}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all",
                      selectedIds.includes(bet.id) 
                        ? "bg-neon-green border-neon-green text-black" 
                        : "border-white/20 hover:border-white/40"
                    )}
                  >
                    {selectedIds.includes(bet.id) && <Check size={10} strokeWidth={4} />}
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5 text-[10px] sm:text-xs text-white/40 uppercase tracking-widest" style={{ width: '260.031px', height: '90px' }}>
                  {bet.createdAt instanceof Date ? bet.createdAt.toLocaleDateString() : 'Recent'}
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5">
                  <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-none">
                    {bet.betName || bet.userName}
                  </p>
                  {bet.sellerCode && <p className="text-[8px] sm:text-[10px] text-neon-green uppercase tracking-widest mt-0.5">Vendedor: {bet.sellerCode}</p>}
                  <p className="text-[8px] sm:text-[10px] text-white/20 uppercase tracking-widest mt-0.5 sm:mt-1">ID: {bet.userId.slice(-6).toUpperCase()}</p>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5 text-center">
                  <span className="text-xs font-bold" style={{ color: '#d7cbc3' }}>{bet.hits?.[0] ?? '-'}</span>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5 text-center">
                  <span className="text-xs font-bold" style={{ color: '#ffffff' }}>{bet.hits?.[1] ?? '-'}</span>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5 text-center">
                  <span className="text-xs font-bold" style={{ color: '#fffdfd' }}>{bet.hits?.[2] ?? '-'}</span>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5 text-center">
                  <div className="inline-flex items-center justify-center px-3 py-1 rounded-md font-bold" style={{ backgroundColor: '#000000', color: '#f8e506' }}>
                    <span style={{ fontSize: '20px', lineHeight: '24px' }}>
                      {bet.hits ? bet.hits.reduce((a, b) => a + b, 0) : 0}
                    </span>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    {bet.status === 'pendente' ? (
                      <>
                        <button 
                          onClick={() => handleValidate(bet.id, 'validado')}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-neon-green/10 text-neon-green hover:bg-neon-green hover:text-black transition-all flex items-center justify-center"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => handleValidate(bet.id, 'rejeitado')}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white transition-all flex items-center justify-center"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[8px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                          bet.status === 'validado' ? "bg-neon-green/10 text-neon-green" : "bg-accent-red/10 text-accent-red"
                        )}>
                          {bet.status}
                        </span>
                        <button 
                          onClick={() => {
                            setSelectedIds([bet.id]);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 text-white/20 hover:bg-accent-red hover:text-white transition-all flex items-center justify-center"
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
  const [drawResults, setDrawResults] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDrawForBets, setSelectedDrawForBets] = useState<{number: number, results: number[]} | null>(null);
  const [contestBets, setContestBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);

  const fetchContest = async () => {
    const active = await firebaseService.getActiveContest();
    setContest(active);
    if (active) {
      setDrawResults(active.draws.map(d => d.results.join(', ')));
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
      .split(',')
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n));
    
    if (results.length !== 15) {
      alert('Por favor, insira exatamente 15 números.');
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
    <div className="space-y-6 sm:space-y-8">
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-accent-blue/20 border border-accent-blue/30 rounded-xl p-3 flex items-center gap-2 text-accent-blue text-xs font-bold uppercase tracking-widest"
          >
            <CheckCircle size={14} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white uppercase">INSERIR <span className="text-accent-blue">RESULTADOS</span></h2>
        {contest && <span className="text-[10px] sm:text-xs font-bold text-white/40 uppercase tracking-widest">Concurso #{contest.number}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {[1, 2, 3].map(num => {
          const draw = contest?.draws.find(d => d.number === num);
          const hasResults = draw && draw.results.length > 0;

          return (
            <div key={num} className="bg-white/5 p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-display tracking-widest text-white uppercase">SORTEIO #{num}</h3>
                <div className="flex gap-2">
                  {hasResults && (
                    <button 
                      onClick={() => handleViewBets(num, draw.results)}
                      className="w-7 h-7 sm:w-8 sm:h-8 bg-white/5 text-white/40 hover:text-white rounded-lg flex items-center justify-center transition-all"
                      title="Ver acertos"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-accent-blue/10 text-accent-blue rounded-lg flex items-center justify-center">
                    <Trophy size={14} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-[8px] sm:text-[10px] uppercase tracking-widest text-white/40">15 Números (Separados por vírgula)</label>
                  <span className={cn(
                    "text-[10px] font-bold",
                    drawResults[num - 1].split(',').filter(n => n.trim() !== '').length === 15 ? "text-neon-green" : "text-white/20"
                  )}>
                    {drawResults[num - 1].split(',').filter(n => n.trim() !== '').length}/15
                  </span>
                </div>
                <textarea 
                  placeholder="Ex: 01, 02, 03..."
                  value={drawResults[num - 1]}
                  onChange={(e) => {
                    const newResults = [...drawResults];
                    newResults[num - 1] = e.target.value;
                    setDrawResults(newResults);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 text-[10px] sm:text-xs font-mono text-white/60 focus:outline-none focus:border-accent-blue/50 h-24 sm:h-32 resize-none"
                />
                <button 
                  onClick={() => handleSaveDraw(num)}
                  className="w-full py-2.5 sm:py-3 bg-accent-blue/20 text-accent-blue border border-accent-blue/30 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-accent-blue hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Save size={12} />
                  SALVAR SORTEIO
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display tracking-widest text-white uppercase">ACERTOS <span className="text-accent-blue">SORTEIO #{selectedDrawForBets.number}</span></h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedDrawForBets.results.map(num => (
                      <span key={num} className="w-8 h-8 rounded-full bg-accent-blue text-white flex items-center justify-center text-xs font-bold">
                        {num.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDrawForBets(null)}
                  className="w-10 h-10 rounded-full bg-white/5 text-white/40 hover:text-white flex items-center justify-center transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
                {loadingBets ? (
                  <p className="text-white/40 text-center py-10">Carregando apostas...</p>
                ) : contestBets.length === 0 ? (
                  <p className="text-white/40 text-center py-10">Nenhuma aposta validada para este concurso.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {contestBets.map((bet) => (
                      <div key={bet.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-white">{bet.userName}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">ID: {bet.userId.slice(-6).toUpperCase()}</p>
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
                                    ? "bg-neon-green border-neon-green text-black shadow-[0_0_10px_rgba(0,255,0,0.3)]" 
                                    : "bg-white/5 border-white/10 text-white/40"
                                )}
                              >
                                {num.toString().padStart(2, '0')}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-right">
                          <p className="text-neon-green font-bold text-lg">
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
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newContestNumber, setNewContestNumber] = useState('');

  const fetchContests = async () => {
    setLoading(true);
    try {
      const allContests = await firebaseService.getAllContests();
      setContests(allContests);
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
      await firebaseService.createContest(num);
      setNewContestNumber('');
      setIsCreating(false);
      await fetchContests();
    } catch (error) {
      console.error('Erro ao criar concurso:', error);
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
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white uppercase">GESTÃO DE <span className="text-accent-purple">CONCURSOS</span></h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {!isCreating && (
            <>
              <button 
                onClick={() => setShowResetConfirm(true)} 
                className="px-4 py-2 bg-accent-red/20 text-accent-red border border-accent-red/30 rounded-xl flex items-center gap-2 text-[10px] sm:text-xs justify-center hover:bg-accent-red/30 transition-all"
              >
                <Trash2 size={14} />
                ZERAR TODOS CONCURSOS
              </button>
              <button 
                onClick={() => setIsCreating(true)} 
                className="btn-primary py-2 px-4 sm:px-6 flex items-center gap-2 text-[10px] sm:text-xs justify-center"
              >
                <Plus size={14} />
                NOVO CONCURSO
              </button>
            </>
          )}
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-md w-full space-y-6 text-center"
          >
            <div className="w-16 h-16 bg-accent-red/20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="text-accent-red" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-display tracking-widest text-white uppercase">ATENÇÃO!</h3>
              <p className="text-white/60 text-sm">
                Esta ação irá deletar <span className="text-white font-bold">TODOS</span> os concursos, apostas e zerar os pontos de todos os usuários. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 border border-white/10 rounded-xl text-white/60 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleResetAll}
                disabled={isResetting}
                className="flex-1 py-3 bg-accent-red text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accent-red/80 transition-all disabled:opacity-50"
              >
                {isResetting ? 'ZERANDO...' : 'SIM, ZERAR TUDO'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isCreating && (
        <div className="bg-white/5 p-6 rounded-2xl border border-accent-purple/30 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Criar Novo Concurso</h3>
          <form onSubmit={handleNewContest} className="flex flex-col sm:flex-row gap-4">
            <input 
              type="number" 
              value={newContestNumber}
              onChange={(e) => setNewContestNumber(e.target.value)}
              placeholder="Número do Concurso (ex: 3050)"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-purple/50"
              required
            />
            <div className="flex gap-2">
              <button 
                type="submit"
                className="flex-1 sm:flex-none bg-accent-purple text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accent-purple/80 transition-all"
              >
                Confirmar
              </button>
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 sm:flex-none bg-white/5 text-white/60 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {loading ? (
          <p className="text-white/40 text-xs">Carregando...</p>
        ) : contests.length === 0 ? (
          <p className="text-white/20 text-xs italic">Nenhum concurso aberto encontrado.</p>
        ) : contests.map(c => (
          <div key={c.id} className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center",
                c.status === 'aberto' ? "bg-neon-green/10 text-neon-green" : 
                c.status === 'em_andamento' ? "bg-accent-blue/10 text-accent-blue" :
                "bg-white/5 text-white/20"
              )}>
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Concurso #{c.number}</h3>
                <p className="text-[8px] sm:text-[10px] text-white/40 uppercase tracking-widest">Status: {getStatusLabel(c.status)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {c.status === 'aberto' && (
                <button 
                  onClick={() => handleUpdateStatus(c.id, 'em_andamento')}
                  className="px-3 py-2 bg-accent-blue/20 text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/30 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                  title="Bloquear Novas Apostas e Iniciar Sorteios"
                >
                  <Lock size={14} />
                  BLOQUEAR / INICIAR
                </button>
              )}
              {c.status === 'em_andamento' && (
                <>
                  <button 
                    onClick={() => handleUpdateStatus(c.id, 'aberto')}
                    className="px-3 py-2 bg-neon-green/20 text-neon-green rounded-lg hover:bg-neon-green/30 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                    title="Liberar Apostas"
                  >
                    <Unlock size={14} />
                    Liberar Apostas
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(c.id, 'encerrado')}
                    className="px-3 py-2 bg-accent-purple/20 text-accent-purple rounded-lg hover:bg-accent-purple/30 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                    title="Finalizar Concurso"
                  >
                    <CheckCircle size={14} />
                    Finalizar
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
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newSeller, setNewSeller] = useState({
    userId: '',
    code: '',
    commissionPct: 15
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [sellersData, usersData] = await Promise.all([
      firebaseService.getAllSellers(),
      firebaseService.getAllUsers()
    ]);
    setSellers(sellersData);
    setUsers(usersData);
    setLoading(false);
  };

  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeller.userId || !newSeller.code) return;
    
    try {
      await firebaseService.createSeller(newSeller);
      await fetchData();
      setIsAdding(false);
      setNewSeller({ userId: '', code: '', commissionPct: 15 });
      alert('Vendedor cadastrado com sucesso!');
    } catch (error) {
      console.error('Error adding seller:', error);
      alert('Erro ao cadastrar vendedor.');
    }
  };

  if (loading) return <div className="p-10 text-center text-white/20">Carregando...</div>;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white uppercase">GESTÃO DE <span className="text-accent-orange">VENDEDORES</span></h2>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-primary py-2 px-4 sm:px-6 flex items-center gap-2 text-[10px] sm:text-xs w-full sm:w-auto justify-center"
          >
            <Plus size={14} />
            CADASTRAR VENDEDOR
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white/5 p-6 rounded-2xl border border-accent-orange/30 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Cadastrar Novo Vendedor</h3>
          <form onSubmit={handleAddSeller} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select 
              value={newSeller.userId}
              onChange={(e) => setNewSeller({ ...newSeller, userId: e.target.value })}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-orange/50"
              required
            >
              <option value="">Selecionar Usuário</option>
              {users.filter(u => u.role === 'cliente').map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <input 
              type="text" 
              value={newSeller.code}
              onChange={(e) => setNewSeller({ ...newSeller, code: e.target.value.toUpperCase() })}
              placeholder="Código (ex: REF123)"
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-orange/50"
              required
            />
            <input 
              type="number" 
              value={newSeller.commissionPct}
              onChange={(e) => setNewSeller({ ...newSeller, commissionPct: Number(e.target.value) })}
              placeholder="Comissão %"
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-orange/50"
              required
            />
            <div className="sm:col-span-3 flex gap-2">
              <button 
                type="submit"
                className="flex-1 bg-accent-orange text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accent-orange/80 transition-all"
              >
                Confirmar
              </button>
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 border border-white/10 text-white/60 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Código</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Vendedor</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">Comissão %</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">Vendas</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">Total Comissão</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map(s => {
              const user = users.find(u => u.id === s.userId);
              return (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="px-6 py-4 font-mono text-neon-green text-sm">{s.code}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-white">{user?.name || 'Unknown'}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">{user?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-white/60">{s.commissionPct}%</td>
                  <td className="px-6 py-4 text-center text-sm text-white font-bold">{s.totalSales || 0}</td>
                  <td className="px-6 py-4 text-center text-sm text-accent-purple font-bold">R$ {(s.totalCommission || 0).toFixed(2)}</td>
                </tr>
              );
            })}
            {sellers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-white/20 italic text-sm">Nenhum vendedor cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ReportsTab = () => (
  <div className="space-y-6 sm:space-y-8">
    <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white uppercase">RELATÓRIOS <span className="text-white/20">FINANCEIROS</span></h2>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      <div className="bg-white/5 p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-white/10 space-y-3 sm:space-y-4">
        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-white/40">Arrecadação Total</p>
        <h3 className="text-2xl sm:text-3xl font-bold text-white">R$ 0,00</h3>
        <div className="flex items-center gap-2 text-neon-green text-[10px] sm:text-xs">
          <TrendingUp size={12} />
          <span>+0% este mês</span>
        </div>
      </div>
    </div>
  </div>
);

export default AdminPanel;
