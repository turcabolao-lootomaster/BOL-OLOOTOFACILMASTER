/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../firebase';
import { Ticket, Check, Info, AlertCircle, Plus, Minus, Sparkles, X, Users, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Contest } from '../types';

interface BettingProps {
  setView?: (view: string) => void;
}

const Betting: React.FC<BettingProps> = ({ setView }) => {
  const { user } = useAuth();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [pendingBets, setPendingBets] = useState<number[][]>([]);
  const [sellerCode, setSellerCode] = useState('');
  const [isSellerLink, setIsSellerLink] = useState(false);
  const [betName, setBetName] = useState('');

  const handleBetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBetName(e.target.value.toUpperCase());
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastBetIds, setLastBetIds] = useState<string[]>([]);
  const [lastBetName, setLastBetName] = useState('');
  const [surpresinhaCount, setSurpresinhaCount] = useState(1);
  const [isLoadingContest, setIsLoadingContest] = useState(true);
  const [activeContest, setActiveContest] = React.useState<Contest | null>(null);
  const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'info' } | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('5511999999999');
  const [sellerWhatsApp, setSellerWhatsApp] = useState<string | null>(null);
  const [sellerPixKey, setSellerPixKey] = useState<string | null>(null);

  React.useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [contestResult, settingsResult] = await Promise.allSettled([
          firebaseService.getActiveContest(),
          firebaseService.getSettings()
        ]);
        
        if (contestResult.status === 'fulfilled') {
          setActiveContest(contestResult.value);
        }
        
        if (settingsResult.status === 'fulfilled' && settingsResult.value?.whatsappNumber) {
          setWhatsappNumber(settingsResult.value.whatsappNumber);
        }

        // Check for seller ref in URL or user link
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        let finalSellerCode = '';
        
        if (user?.role === 'vendedor') {
          const seller = await firebaseService.getSellerByUserId(user.id);
          if (seller) finalSellerCode = seller.code.toUpperCase();
        } else if (ref) {
          finalSellerCode = ref.toUpperCase();
        } else if (user?.linkedSellerCode) {
          finalSellerCode = user.linkedSellerCode.toUpperCase();
        }

        if (finalSellerCode) {
          setSellerCode(finalSellerCode);
          setIsSellerLink(true);
          const seller = await firebaseService.getSellerByCode(finalSellerCode);
          if (seller) {
            const ws = await firebaseService.getSellerWhatsApp(seller.userId);
            if (ws) setSellerWhatsApp(ws);
            if (seller.pixKey) setSellerPixKey(seller.pixKey);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingContest(false);
      }
    };
    fetchData();
  }, [user]);

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 10) {
      setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
    }
  };

  const generateRandomNumbers = (baseNumbers: number[] = []) => {
    const numbers = [...baseNumbers].slice(0, 10);
    while (numbers.length < 10) {
      const num = Math.floor(Math.random() * 25) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  };

  const handleAddSurpresinha = () => {
    if (surpresinhaCount === 1) {
      // Se tiver alguns números selecionados (menos de 10), completa a aposta.
      // Se não tiver nenhum ou já tiver 10, gera uma nova aposta completa.
      const base = selectedNumbers.length > 0 && selectedNumbers.length < 10 ? selectedNumbers : [];
      const numbers = generateRandomNumbers(base);
      setSelectedNumbers(numbers);
      setFeedback({ 
        message: base.length > 0 ? 'Aposta completada com sucesso!' : 'Surpresinha selecionada no grid!', 
        type: 'success' 
      });
    } else {
      // Para múltiplas surpresinhas, mantém o comportamento de adicionar direto ao resumo
      const newBets: number[][] = [];
      for (let i = 0; i < surpresinhaCount; i++) {
        newBets.push(generateRandomNumbers([]));
      }
      setPendingBets([...pendingBets, ...newBets]);
      setFeedback({ 
        message: `${surpresinhaCount} Surpresinhas geradas com sucesso!`, 
        type: 'success' 
      });
    }
  };

  const registerBet = () => {
    if (selectedNumbers.length === 10) {
      setPendingBets([...pendingBets, [...selectedNumbers]]);
      setSelectedNumbers([]);
      setFeedback({ message: 'Aposta registrada com sucesso!', type: 'success' });
    }
  };

  const removePendingBet = (index: number) => {
    setPendingBets(pendingBets.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingBets.length === 0) return;
    
    const cleanBetName = betName.trim().toUpperCase();
    if (!cleanBetName) {
      setFeedback({ message: 'Por favor, preencha o Nome na Aposta.', type: 'info' });
      return;
    }
    
    setIsSubmitting(true);
    const ids: string[] = [];
    let userId = user?.uid || user?.id || auth.currentUser?.uid || '';
    
    // Auto-login anonymous if no user and it's a seller link action
    if (!userId) {
      try {
        const { signInAnonymously } = await import('firebase/auth');
        const userCred = await signInAnonymously(auth);
        userId = userCred.user.uid;
        
        // Basic user setup for the anonymous session
        await firebaseService.updateUserProfile(userId, {
          name: cleanBetName,
          role: 'cliente',
          linkedSellerCode: sellerCode.toUpperCase(),
          totalPoints: 0
        });
      } catch (authError) {
        console.error('Auth error:', authError);
        setFeedback({ message: 'Erro ao processar identificação rápida. Tente novamente.', type: 'info' });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // 1. Check name availability
      const availability = await firebaseService.checkBetNameAvailability(cleanBetName, userId);
      if (!availability.available) {
        throw new Error(availability.message);
      }

      // 2. Link user to seller if not already linked and code is provided
      if (user && !user.linkedSellerCode && sellerCode) {
        await firebaseService.linkUserToSeller(user.id, sellerCode);
      }

      const activeContest = await firebaseService.getActiveContest();
      if (!activeContest) {
        throw new Error('Nenhum concurso aberto no momento.');
      }
      
      if (activeContest.status !== 'aberto') {
        throw new Error('As apostas para este concurso estão bloqueadas ou o concurso já foi finalizado.');
      }

      // If sellerCode is present, try to get their WhatsApp for validation
      if (sellerCode) {
        const seller = await firebaseService.getSellerByCode(sellerCode);
        if (seller) {
          const ws = await firebaseService.getSellerWhatsApp(seller.userId);
          setSellerWhatsApp(ws);
        } else {
          setSellerWhatsApp(null);
        }
      } else {
        setSellerWhatsApp(null);
      }

      // Submit all pending bets
      for (const numbers of pendingBets) {
        const id = await firebaseService.createBet({
          userId: userId,
          userName: user?.name || cleanBetName,
          contestId: activeContest.id,
          contestNumber: activeContest.number,
          numbers: [...numbers],
          betName: cleanBetName,
          sellerCode: sellerCode || '',
        });
        if (id) {
          ids.push(id);
          // Reserve the nick for this user
          await firebaseService.reserveNick(cleanBetName, userId);
        }
      }
      
      setLastBetIds(ids);
      setLastBetName(cleanBetName);
      setSuccess(true);
      setPendingBets([]);
      
      // Preserve seller code if linked
      if (!isSellerLink) {
        setSellerCode('');
      }
      
      setBetName('');
      setTimeout(() => setSuccess(false), 15000); // Keep success message longer for WhatsApp button
    } catch (error: any) {
      console.error('Erro ao realizar apostas:', error);
      alert(error.message || 'Erro ao realizar apostas. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppValidation = () => {
    const truncatedIds = lastBetIds.map(id => id.substring(0, 4).toUpperCase());
    const count = truncatedIds.length;
    const totalValue = count * 10;
    const sellerText = sellerCode ? ' pelo seu link de vendedor' : '';
    
    const message = encodeURIComponent(
      `Olá! Fiz ${count} ${count === 1 ? 'aposta' : 'apostas'}${sellerText} e gostaria de solicitar a validação ${count === 1 ? 'dela' : 'delas'}. 🎯\n` +
      truncatedIds.join('\n') +
      `\n\nTotal de apostas: ${count}` +
      `\nValor total: R$ ${totalValue.toFixed(2).replace('.', ',')}` +
      `\n\nPoderia, por favor, confirmar o recebimento e a validação? Obrigado!`
    );
    
    const targetNumber = sellerWhatsApp || whatsappNumber;
    window.open(`https://wa.me/${targetNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="mobile-p lg:p-6 max-w-[850px] mx-auto space-y-3 sm:space-y-6">
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
          >
            <div className={cn(
              "px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto",
              feedback.type === 'success' ? "bg-green-500 text-white" : "bg-lotofacil-purple text-white"
            )}>
              {feedback.type === 'success' ? <Check size={18} /> : <Info size={18} />}
              <span className="text-sm font-bold uppercase tracking-widest">{feedback.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeContest && activeContest.status !== 'aberto' && (
        <div className="bg-lotofacil-yellow/10 border border-lotofacil-yellow/20 p-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-lotofacil-yellow shrink-0" size={18} />
          <p className="text-[10px] sm:text-sm text-lotofacil-yellow font-medium">
            As apostas para o concurso #{activeContest.number} estão bloqueadas ou o concurso já foi finalizado.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900">FAZER <span className="text-lotofacil-purple uppercase">APOSTA</span></h1>
          <p className="text-[9px] sm:text-xs text-slate-600 mt-0.5">Selecione exatamente 10 números entre 01 e 25.</p>
        </div>
        <div className="glass-card px-4 py-2 flex items-center gap-3 bg-lotofacil-purple/5 border-lotofacil-purple/20 self-start sm:self-auto">
          <Ticket className="text-lotofacil-purple" size={16} />
          <span className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-slate-900">Valor: R$ 10,00</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 justify-center items-start">
        {/* Number Grid Column */}
        <div className="w-full lg:w-[320px] space-y-3 sm:space-y-6 shrink-0">
          {/* Bet Name Input - Moved inside column for alignment */}
          <div className="space-y-1.5">
            <label className="block text-[9px] sm:text-[10px] uppercase tracking-widest text-lotofacil-purple font-black ml-1">
              NOME NA APOSTA (NICK)
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-lotofacil-purple/40" size={16} />
              <input 
                type="text" 
                value={betName}
                onChange={handleBetNameChange}
                placeholder="EX: JOÃO SILVA (AMIGO 1)"
                required
                className="w-full bg-white border-2 border-dark-border rounded-xl py-2 sm:py-3 pl-10 pr-4 focus:outline-none focus:border-lotofacil-purple focus:ring-4 focus:ring-lotofacil-purple/10 transition-all text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-300 uppercase shadow-sm"
              />
            </div>
            <p className="text-[8px] text-slate-500 ml-1 italic">* Use nomes diferentes para amigos aparecerem separadamente no ranking.</p>
          </div>

          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 w-full">
            {Array.from({ length: 25 }, (_, i) => i + 1).map(num => (
              <motion.button
                key={num}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleNumber(num)}
                className={cn(
                  "aspect-square rounded-lg transition-all flex items-center justify-center border-2 text-xs sm:text-base font-bold",
                  selectedNumbers.includes(num)
                    ? "bg-lotofacil-purple border-lotofacil-purple text-white shadow-md"
                    : "bg-slate-50 border-dark-border text-blue-600 hover:border-lotofacil-purple/40"
                )}
              >
                {num.toString().padStart(2, '0')}
              </motion.button>
            ))}
          </div>

          {/* Action Buttons below grid */}
          <div className="flex items-center gap-1.5 w-full">
            <button 
              onClick={registerBet}
              disabled={selectedNumbers.length !== 10}
              className="flex-[1.2] bg-gradient-to-r from-slate-900 to-slate-800 text-white h-9 sm:h-10 flex items-center justify-center gap-1 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 rounded-lg shadow-lg hover:brightness-125 active:scale-95 transition-all border border-white/10 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Plus size={12} className="text-lotofacil-yellow" />
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">REGISTRAR</span>
            </button>
            
            <div className="flex-[1.8] flex gap-1 items-center h-9 sm:h-10">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1 h-full">
                <button 
                  onClick={() => setSurpresinhaCount(Math.max(1, surpresinhaCount - 1))} 
                  className="text-slate-400 hover:text-slate-900 p-0.5"
                >
                  <Minus size={10} />
                </button>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-900 w-3 text-center">{surpresinhaCount}</span>
                <button onClick={() => setSurpresinhaCount(Math.min(30, surpresinhaCount + 1))} className="text-slate-400 hover:text-slate-900 p-0.5"><Plus size={10} /></button>
              </div>
              <button 
                onClick={handleAddSurpresinha}
                className="flex-1 h-full bg-orange-500 border border-orange-600 rounded-lg text-white text-[8px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-1 shadow-md"
              >
                <Sparkles size={10} />
                SURPRESINHA
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2 w-full">
            <p className="text-[9px] sm:text-[11px] text-slate-600 leading-tight text-center px-2">
              Cada aposta de 10 números é válida para os 3 sorteios do concurso atual. O valor é fixo por aposta registrada.
            </p>
          </div>
        </div>

        {/* Bet Summary Sidebar */}
        <div className="w-full lg:w-[360px] space-y-3">
          <div className="glass-card p-4 sm:p-5 space-y-4 sm:space-y-5 lg:sticky lg:top-10 w-full shadow-xl border-slate-200">
            <h2 className="text-base sm:text-xl font-display tracking-widest text-slate-900 uppercase">RESUMO DO <span className="text-lotofacil-purple">BOLÃO</span></h2>
            
            {/* List of Registered Bets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-600">Apostas Registradas ({pendingBets.length})</p>
                {pendingBets.length > 0 && (
                  <button onClick={() => setPendingBets([])} className="text-[8px] sm:text-[9px] text-accent-red uppercase tracking-widest hover:underline">Limpar Tudo</button>
                )}
              </div>
              
              <div className="space-y-1.5 max-h-[120px] sm:max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                <AnimatePresence initial={false}>
                  {pendingBets.map((bet, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between group"
                    >
                      <div className="flex flex-wrap gap-1">
                        {bet.map(num => (
                          <span key={num} className="text-[10px] sm:text-xs font-bold text-black bg-[#ffd700] px-1 rounded border border-black">
                            {num.toString().padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                      <button 
                        onClick={() => removePendingBet(idx)}
                        className="text-slate-300 hover:text-accent-red transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {pendingBets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 sm:py-10 border border-dashed border-slate-200 rounded-2xl">
                    <AlertCircle className="text-slate-200 mb-2" size={20} />
                    <p className="text-[9px] sm:text-xs text-slate-500 italic text-center px-4">Nenhuma aposta registrada ainda. Selecione 10 números ou use a Surpresinha.</p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-600 mb-1.5 ml-1 font-bold">
                    Código do Vendedor {isSellerLink ? '(Vinculado)' : '(Obrigatório)'}
                  </label>
                  <input 
                    type="text" 
                    value={sellerCode}
                    onChange={(e) => (!isSellerLink || user?.role === 'admin' || user?.role === 'master') && setSellerCode(e.target.value.toUpperCase())}
                    readOnly={isSellerLink && user?.role !== 'admin' && user?.role !== 'master'}
                    placeholder="Ex: REF123"
                    required
                    className={cn(
                      "w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 sm:py-3 px-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs text-slate-900 font-bold tracking-widest",
                      isSellerLink && user?.role !== 'admin' && user?.role !== 'master' && "bg-slate-100 text-slate-400 cursor-not-allowed border-dashed"
                    )}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-600">Total a Pagar</span>
                  <span className="text-lg sm:text-xl font-bold text-lotofacil-purple">R$ {(pendingBets.length * 10).toFixed(2)}</span>
                </div>

                <button 
                  type="submit"
                  disabled={pendingBets.length === 0 || isSubmitting || isLoadingContest || (activeContest?.status !== 'aberto') || !betName.trim() || !sellerCode}
                  className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white h-12 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm uppercase tracking-widest font-bold hover:brightness-125 transition-all border-2 border-white/10 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                    {isSubmitting ? 'PROCESSANDO...' : 
                     isLoadingContest ? 'CARREGANDO...' :
                     (!activeContest ? 'SEM CONCURSO ATIVO' : 
                      (activeContest.status !== 'aberto' ? 'APOSTAS BLOQUEADAS' : 'FINALIZAR E ENVIAR'))}
                  </span>
                </button>
              </div>
            </form>

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="bg-lotofacil-yellow/10 border border-lotofacil-yellow/20 p-4 rounded-2xl flex items-center gap-3">
                  <Check className="text-lotofacil-yellow" size={20} />
                  <p className="text-sm text-lotofacil-yellow font-medium">Apostas enviadas com sucesso!</p>
                </div>
                
                <div className="flex flex-col gap-4">
                  {sellerPixKey && (
                    <div className="bg-lotofacil-purple/5 border border-lotofacil-purple/20 p-4 rounded-2xl space-y-2">
                      <p className="text-[10px] font-bold text-lotofacil-purple uppercase tracking-widest text-center">Pague via PIX para o Vendedor</p>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-mono font-black text-slate-900 select-all">{sellerPixKey}</span>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">Toque na chave acima para copiar</p>
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={handleWhatsAppValidation}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    PEDIR VALIDAÇÃO NO WHATSAPP
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Betting;
