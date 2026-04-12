/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { History, CheckCircle2, Clock, XCircle, ChevronRight, RefreshCcw, MessageCircle, Trash2, Copy, CheckSquare, Square, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Bet, Settings, Contest } from '../types';

const MyBets: React.FC = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('5511999999999');
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [selectedBetIds, setSelectedBetIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRepeatConfirm, setShowRepeatConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const [userBets, settings, contest] = await Promise.all([
          firebaseService.getUserBets(user.id),
          firebaseService.getSettings(),
          firebaseService.getActiveContest()
        ]);
        setBets(userBets);
        setActiveContest(contest);
        if (settings?.whatsappNumber) {
          setWhatsappNumber(settings.whatsappNumber);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const toggleSelectAll = () => {
    if (selectedBetIds.length === bets.length) {
      setSelectedBetIds([]);
    } else {
      setSelectedBetIds(bets.map(b => b.id));
    }
  };

  const toggleSelectBet = (id: string) => {
    setSelectedBetIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkRepeat = async () => {
    if (!activeContest || activeContest.status !== 'aberto') {
      showMessage('Nenhum concurso aberto para novas apostas.', 'error');
      setShowRepeatConfirm(false);
      return;
    }

    if (selectedBetIds.length === 0) return;

    setIsProcessing(true);
    setShowRepeatConfirm(false);
    try {
      const selectedBets = bets.filter(b => selectedBetIds.includes(b.id));
      let successCount = 0;

      // Determine the current seller code for this user
      let currentSellerCode = '';
      if (user?.role === 'vendedor') {
        const seller = await firebaseService.getSellerByUserId(user.id);
        if (seller) currentSellerCode = seller.code.toUpperCase();
      } else if (user?.linkedSellerCode) {
        currentSellerCode = user.linkedSellerCode.toUpperCase();
      }

      for (const bet of selectedBets) {
        try {
          await firebaseService.createBet({
            userId: user?.id || '',
            userName: user?.name || '',
            contestId: activeContest.id,
            contestNumber: activeContest.number,
            numbers: [...bet.numbers],
            betName: bet.betName || '',
            sellerCode: currentSellerCode || bet.sellerCode || '',
          });
          successCount++;
        } catch (err) {
          console.error(`Error repeating bet ${bet.id}:`, err);
        }
      }

      showMessage(`${successCount} apostas repetidas com sucesso no concurso #${activeContest.number}!`, 'success');
      setSelectedBetIds([]);
      
      // Refresh bets list
      if (user) {
        const userBets = await firebaseService.getUserBets(user.id);
        setBets(userBets);
      }
    } catch (error) {
      console.error('Error in bulk repeat:', error);
      showMessage('Erro ao repetir apostas.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBetIds.length === 0) return;
    
    setIsProcessing(true);
    setShowDeleteConfirm(false);
    try {
      const selectedBets = bets.filter(b => selectedBetIds.includes(b.id));
      const toDelete = selectedBets.filter(b => b.status === 'pendente');
      let successCount = 0;

      for (const bet of toDelete) {
        try {
          await firebaseService.deleteBet(bet.id);
          successCount++;
        } catch (err) {
          console.error(`Error deleting bet ${bet.id}:`, err);
        }
      }

      if (successCount < selectedBetIds.length) {
        showMessage(`${successCount} apostas pendentes excluídas. Apostas já validadas não podem ser excluídas.`, 'success');
      } else {
        showMessage(`${successCount} apostas excluídas com sucesso!`, 'success');
      }
      
      setSelectedBetIds([]);
      
      // Refresh bets list
      if (user) {
        const userBets = await firebaseService.getUserBets(user.id);
        setBets(userBets);
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      showMessage('Erro ao excluir apostas.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSingle = async (betId: string) => {
    if (!window.confirm('Deseja excluir esta aposta pendente?')) return;
    
    try {
      await firebaseService.deleteBet(betId);
      setBets(prev => prev.filter(b => b.id !== betId));
      showMessage('Aposta excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Error deleting bet:', error);
      showMessage('Erro ao excluir aposta.', 'error');
    }
  };

  const handleWhatsAppValidation = async (bet: Bet) => {
    let targetNumber = whatsappNumber;
    let sellerText = '';
    
    if (bet.sellerCode) {
      const seller = await firebaseService.getSellerByCode(bet.sellerCode);
      if (seller) {
        const ws = await firebaseService.getSellerWhatsApp(seller.userId);
        if (ws) targetNumber = ws;
        sellerText = ' pelo seu link de vendedor';
      }
    }

    const truncatedId = bet.id.substring(0, 4).toUpperCase();
    
    const message = encodeURIComponent(
      `Olá! Fiz 1 aposta${sellerText} e gostaria de solicitar a validação dela. 🎯\n` +
      truncatedId +
      `\n\nTotal de apostas: 1` +
      `\nValor total: R$ 10,00` +
      `\n\nPoderia, por favor, confirmar o recebimento e a validação? Obrigado!`
    );
    
    window.open(`https://wa.me/${targetNumber}?text=${message}`, '_blank');
  };

  const handleToggleRepeat = async (betId: string, currentRepeat: boolean) => {
    try {
      await firebaseService.toggleBetRepeat(betId, !currentRepeat);
      setBets(prev => prev.map(b => b.id === betId ? { ...b, repeat: !currentRepeat } : b));
    } catch (error) {
      console.error('Error toggling repeat:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validado': return <CheckCircle2 className="text-emerald-600" size={18} />;
      case 'pendente': return <Clock className="text-orange-600" size={18} />;
      case 'rejeitado': return <XCircle className="text-red-600" size={18} />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validado': return 'Validada';
      case 'pendente': return 'Pendente';
      case 'rejeitado': return 'Rejeitada';
      default: return status;
    }
  };

  const getHitColor = (hits: number) => {
    if (hits >= 9) return 'text-lotofacil-yellow';
    if (hits >= 7) return 'text-lotofacil-purple';
    return 'text-slate-400';
  };

  return (
    <div className="mobile-p lg:p-10 space-y-4 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-4xl font-display tracking-widest text-slate-900">MINHAS <span className="text-lotofacil-purple uppercase">APOSTAS</span></h1>
          <p className="text-[10px] sm:text-sm text-slate-600 mt-1">Histórico completo de suas participações nos concursos.</p>
        </div>
        
        {!loading && bets.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedBetIds.length > 0 && (
              <div className="flex items-center gap-2 mr-2 pr-2 border-r border-slate-200">
                <motion.button 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  disabled={isProcessing}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                  title="Excluir selecionadas"
                >
                  <Trash2 size={14} />
                  <span className="hidden md:inline">Excluir</span>
                </motion.button>
                <motion.button 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  disabled={isProcessing || !activeContest || activeContest.status !== 'aberto'}
                  onClick={() => setShowRepeatConfirm(true)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-lotofacil-purple text-white hover:bg-lotofacil-purple/90 transition-all text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-lotofacil-purple/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCcw size={14} className={cn(isProcessing && "animate-spin")} />
                  <span>Repetir ({selectedBetIds.length})</span>
                </motion.button>
              </div>
            )}
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              {selectedBetIds.length === bets.length ? <CheckSquare size={14} className="text-lotofacil-purple" /> : <Square size={14} />}
              <span>{selectedBetIds.length === bets.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}</span>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "p-3 rounded-xl flex items-center gap-3 text-xs font-bold border shadow-sm",
              message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
            )}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3 pb-24">
        {loading ? (
          <p className="text-slate-600 text-center py-10 text-xs sm:text-sm">Carregando apostas...</p>
        ) : bets.length === 0 ? (
          <p className="text-slate-600 text-center py-10 text-xs sm:text-sm">Nenhuma aposta encontrada.</p>
        ) : bets.map((bet, idx) => (
          <motion.div 
            key={bet.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "p-3 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-6 group transition-all rounded-xl sm:rounded-2xl border bg-white shadow-sm relative",
              selectedBetIds.includes(bet.id) ? "border-lotofacil-purple ring-1 ring-lotofacil-purple/20" : "border-slate-200 hover:border-lotofacil-purple/30"
            )}
          >
            {/* Selection Checkbox */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectBet(bet.id);
              }}
              className="absolute top-3 right-3 sm:top-6 sm:right-6 lg:static lg:block cursor-pointer z-10 p-1"
            >
              {selectedBetIds.includes(bet.id) ? (
                <div className="w-6 h-6 rounded-md bg-lotofacil-purple flex items-center justify-center shadow-sm">
                  <CheckSquare size={18} className="text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-md border-2 border-slate-200 bg-white hover:border-lotofacil-purple/50 transition-colors" />
              )}
            </div>

            <div className="flex items-center gap-3 lg:w-48">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 bg-lotofacil-purple/10 text-lotofacil-purple">
                <History size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">Concurso</p>
                  <h3 className="text-sm sm:text-lg font-bold text-slate-900">#{bet.contestNumber}</h3>
                </div>
                {bet.betName && (
                  <p className="text-[10px] sm:text-sm text-slate-500 truncate font-medium" title={bet.betName}>
                    {bet.betName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-1">
                {bet.numbers.map(num => (
                  <div key={num} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[9px] sm:text-xs font-bold text-slate-900 border border-slate-200 bg-slate-50">
                    {num.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(bet.status)}
                  <span className={cn(
                    "uppercase tracking-widest text-[9px] sm:text-[10px] font-bold",
                    bet.status === 'validado' ? "text-lotofacil-yellow" : 
                    bet.status === 'pendente' ? "text-orange-600" : "text-red-600"
                  )}>
                    {getStatusLabel(bet.status)}
                  </span>
                  {bet.status === 'pendente' && (
                    <button 
                      onClick={() => handleWhatsAppValidation(bet)}
                      className="ml-2 flex items-center gap-1 px-2 py-1 bg-[#25D366] text-white text-[8px] font-bold rounded-lg hover:bg-[#128C7E] transition-all shadow-sm"
                    >
                      <MessageCircle size={10} />
                      VALIDAR
                    </button>
                  )}
                </div>
                <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                  {bet.createdAt instanceof Date ? bet.createdAt.toLocaleDateString() : 'Recent'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-start gap-4 sm:gap-8 lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-8">
              {bet.hits !== undefined ? (
                <div className="flex gap-4">
                  {Array.isArray(bet.hits) ? (
                    <>
                      {bet.hits.map((hit, i) => (
                        <div key={i} className="text-center">
                          <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">S{i+1}</p>
                          <div className="flex flex-col items-center">
                            {hit === 10 && (
                              <span className="text-[6px] font-black bg-lotofacil-purple text-white px-1 rounded-sm animate-pulse whitespace-nowrap mb-0.5">10 PONTOS</span>
                            )}
                            <p className={cn("text-sm sm:text-lg font-bold", getHitColor(hit))}>{hit}</p>
                          </div>
                        </div>
                      ))}
                      <div className="text-center border-l border-slate-200 pl-4">
                        <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-lotofacil-yellow mb-0.5 leading-none">Total</p>
                        <div className="flex flex-col items-center mt-0.5">
                          <p className="text-sm sm:text-lg font-bold text-lotofacil-yellow leading-none">
                            {bet.hits.reduce((a, b) => a + b, 0).toString().padStart(2, '0')}
                          </p>
                          <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">PTS</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Acertos</p>
                      <p className={cn("text-sm sm:text-lg font-bold", getHitColor(bet.hits))}>{bet.hits}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[9px] sm:text-xs italic text-slate-500">Aguardando sorteio</p>
              )}
              
              <div className="flex items-center gap-3 ml-auto lg:ml-0">
                {bet.status === 'pendente' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSingle(bet.id);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Excluir aposta"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleRepeat(bet.id, !!bet.repeat);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[9px] uppercase tracking-widest font-bold",
                    bet.repeat 
                      ? "bg-lotofacil-purple/10 border-lotofacil-purple text-lotofacil-purple" 
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800"
                  )}
                  title={bet.repeat ? "Aposta será repetida no próximo concurso" : "Repetir esta aposta no próximo concurso"}
                >
                  <RefreshCcw size={12} className={cn(bet.repeat && "animate-spin-slow")} />
                  <span>{bet.repeat ? 'Repetindo' : 'Repetir'}</span>
                </button>
                <button className="p-1.5 text-slate-500 hover:text-slate-800 transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Custom Confirmation Modals */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-display tracking-widest text-slate-900 text-center mb-2 uppercase">EXCLUIR APOSTAS</h3>
              <p className="text-sm text-slate-600 text-center mb-8">
                Deseja excluir as {selectedBetIds.length} apostas selecionadas? Apenas apostas <span className="font-bold text-orange-600">pendentes</span> serão removidas.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="py-3 rounded-xl bg-red-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showRepeatConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-lotofacil-purple/10 rounded-2xl flex items-center justify-center text-lotofacil-purple mb-6 mx-auto">
                <Copy size={32} />
              </div>
              <h3 className="text-xl font-display tracking-widest text-slate-900 text-center mb-2 uppercase">REPETIR APOSTAS</h3>
              <p className="text-sm text-slate-600 text-center mb-8">
                Deseja repetir as {selectedBetIds.length} apostas selecionadas para o <span className="font-bold text-lotofacil-purple">Concurso #{activeContest?.number}</span>?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowRepeatConfirm(false)}
                  className="py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBulkRepeat}
                  className="py-3 rounded-xl bg-lotofacil-purple text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-lotofacil-purple/20 hover:bg-lotofacil-purple/90 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyBets;
