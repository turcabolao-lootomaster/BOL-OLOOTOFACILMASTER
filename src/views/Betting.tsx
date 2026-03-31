/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Ticket, Check, Info, AlertCircle, Plus, Minus, Sparkles, X, Users, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Contest } from '../types';

const Betting: React.FC = () => {
  const { user } = useAuth();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [pendingBets, setPendingBets] = useState<number[][]>([]);
  const [sellerCode, setSellerCode] = useState('');
  const [betName, setBetName] = useState('');

  const handleBetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBetName(e.target.value.toUpperCase());
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastBetIds, setLastBetIds] = useState<string[]>([]);
  const [lastBetName, setLastBetName] = useState('');
  const [surpresinhaCount, setSurpresinhaCount] = useState(1);
  const [activeContest, setActiveContest] = React.useState<Contest | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('5511999999999');
  const [sellerWhatsApp, setSellerWhatsApp] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      // Check for seller ref in URL
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        setSellerCode(ref.toUpperCase());
        const seller = await firebaseService.getSellerByCode(ref);
        if (seller) {
          const ws = await firebaseService.getSellerWhatsApp(seller.userId);
          if (ws) setSellerWhatsApp(ws);
        }
      }

      const [contest, settings] = await Promise.all([
        firebaseService.getActiveContest(),
        firebaseService.getSettings()
      ]);
      setActiveContest(contest);
      if (settings?.whatsappNumber) {
        setWhatsappNumber(settings.whatsappNumber);
      }
    };
    fetchData();
  }, []);

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 10) {
      setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
    }
  };

  const generateRandomNumbers = () => {
    const numbers: number[] = [];
    while (numbers.length < 10) {
      const num = Math.floor(Math.random() * 25) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  };

  const handleAddSurpresinha = () => {
    const newBets: number[][] = [];
    for (let i = 0; i < surpresinhaCount; i++) {
      newBets.push(generateRandomNumbers());
    }
    setPendingBets([...pendingBets, ...newBets]);
  };

  const registerBet = () => {
    if (selectedNumbers.length === 10) {
      setPendingBets([...pendingBets, [...selectedNumbers]]);
      setSelectedNumbers([]);
    }
  };

  const removePendingBet = (index: number) => {
    setPendingBets(pendingBets.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingBets.length === 0) return;
    if (!betName.trim()) {
      alert('Por favor, preencha o Nome na Aposta.');
      return;
    }
    
    setIsSubmitting(true);
    const ids: string[] = [];
    try {
      // 1. Check name availability
      if (sellerCode) {
        const availability = await firebaseService.checkBetNameAvailability(betName, sellerCode, user?.uid || '');
        if (!availability.available) {
          throw new Error(availability.message);
        }
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
          userId: user?.uid || '',
          userName: user?.name || '',
          contestId: activeContest.id,
          contestNumber: activeContest.number,
          numbers: [...numbers],
          betName: betName || '',
          sellerCode: sellerCode || '', // Fix: Use empty string instead of undefined
        });
        if (id) ids.push(id);
      }
      
      setLastBetIds(ids);
      setLastBetName(betName);
      setSuccess(true);
      setPendingBets([]);
      setSellerCode('');
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
    <div className="mobile-p lg:p-10 max-w-6xl mx-auto space-y-4 sm:space-y-10">
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
          <h1 className="text-lg sm:text-4xl font-display tracking-widest text-slate-900">FAZER <span className="text-lotofacil-purple uppercase">APOSTA</span></h1>
          <p className="text-[10px] sm:text-sm text-slate-600 mt-1">Selecione exatamente 10 números entre 01 e 25.</p>
        </div>
        <div className="glass-card px-4 py-2 flex items-center gap-3 bg-lotofacil-purple/5 border-lotofacil-purple/20 self-start sm:self-auto">
          <Ticket className="text-lotofacil-purple" size={16} />
          <span className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-slate-900">Valor: R$ 10,00</span>
        </div>
      </div>

      {/* Bet Name Input - Moved here for prominence */}
      <div className="max-w-[500px] mx-auto lg:mx-0 space-y-2">
        <label className="block text-[10px] sm:text-xs uppercase tracking-widest text-lotofacil-purple font-black ml-1">
          NOME NA APOSTA (NICK)
        </label>
        <div className="relative">
          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-lotofacil-purple/40" size={18} />
          <input 
            type="text" 
            value={betName}
            onChange={handleBetNameChange}
            placeholder="EX: JOÃO SILVA (AMIGO 1)"
            required
            className="w-full bg-white border-2 border-lotofacil-purple/20 rounded-2xl py-3 sm:py-4 pl-12 pr-4 focus:outline-none focus:border-lotofacil-purple focus:ring-4 focus:ring-lotofacil-purple/10 transition-all text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-300 uppercase shadow-sm"
          />
        </div>
        <p className="text-[9px] text-slate-500 ml-1 italic">* Use nomes diferentes para amigos aparecerem separadamente no ranking.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
        {/* Number Grid */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-8">
          <div className="grid grid-cols-5 gap-1 sm:gap-4 w-full max-w-[500px] mx-auto lg:mx-0">
            {Array.from({ length: 25 }, (_, i) => i + 1).map(num => (
              <motion.button
                key={num}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleNumber(num)}
                className={cn(
                  "aspect-square rounded-lg sm:rounded-2xl transition-all flex items-center justify-center border-2 text-sm sm:text-2xl font-bold",
                  selectedNumbers.includes(num)
                    ? "bg-lotofacil-purple border-lotofacil-purple text-white shadow-md"
                    : "bg-slate-50 border-slate-200 text-blue-600 hover:border-blue-300"
                )}
              >
                {num.toString().padStart(2, '0')}
              </motion.button>
            ))}
          </div>

          {/* Action Buttons below grid */}
          <div className="flex items-center gap-2 max-w-[500px] mx-auto lg:mx-0">
            <button 
              onClick={registerBet}
              disabled={selectedNumbers.length !== 10}
              className="flex-[1.2] bg-gradient-to-r from-slate-900 to-slate-800 text-white h-10 sm:h-12 flex items-center justify-center gap-1 text-[9px] sm:text-xs font-bold uppercase tracking-widest disabled:opacity-50 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.6)] hover:brightness-125 active:scale-95 transition-all border-2 border-white/10 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Plus size={14} className="text-lotofacil-yellow" />
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">REGISTRAR APOSTA</span>
            </button>
            
            <div className="flex-[1.8] flex gap-1 items-center h-10 sm:h-12">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-1.5 h-full">
                <button 
                  onClick={() => setSurpresinhaCount(Math.max(1, surpresinhaCount - 1))} 
                  className="text-slate-400 hover:text-slate-900 p-1"
                >
                  <Minus size={12} />
                </button>
                <span className="text-[10px] sm:text-xs font-bold text-slate-900 w-4 text-center">{surpresinhaCount}</span>
                <button onClick={() => setSurpresinhaCount(Math.min(30, surpresinhaCount + 1))} className="text-slate-400 hover:text-slate-900 p-1"><Plus size={12} /></button>
              </div>
              <button 
                onClick={handleAddSurpresinha}
                className="flex-1 h-full bg-orange-500 border border-orange-600 rounded-xl text-white text-[9px] sm:text-xs font-bold uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-1 shadow-md"
              >
                <Sparkles size={12} />
                SURPRESINHA
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2 max-w-[500px] mx-auto lg:mx-0">
            <p className="text-[9px] sm:text-[11px] text-slate-600 leading-tight text-center px-2">
              Cada aposta de 10 números é válida para os 3 sorteios do concurso atual. O valor é fixo por aposta registrada.
            </p>
          </div>
        </div>

        {/* Bet Summary Sidebar */}
        <div className="space-y-4">
          <div className="glass-card p-4 sm:p-8 space-y-4 sm:space-y-8 lg:sticky lg:top-10 w-full">
            <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">RESUMO DO <span className="text-lotofacil-purple">BOLÃO</span></h2>
            
            {/* List of Registered Bets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-600">Apostas Registradas ({pendingBets.length})</p>
                {pendingBets.length > 0 && (
                  <button onClick={() => setPendingBets([])} className="text-[8px] sm:text-[10px] text-accent-red uppercase tracking-widest hover:underline">Limpar Tudo</button>
                )}
              </div>
              
              <div className="space-y-2 max-h-[150px] sm:max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
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
                          <span key={num} className="text-[10px] sm:text-xs font-bold text-lotofacil-purple">
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
                  <label className="block text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-600 mb-1.5 ml-1">Código do Vendedor (Opcional)</label>
                  <input 
                    type="text" 
                    value={sellerCode}
                    onChange={(e) => setSellerCode(e.target.value)}
                    placeholder="Ex: REF123"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 sm:py-3 px-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs text-slate-900"
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
                  disabled={pendingBets.length === 0 || isSubmitting || (activeContest?.status !== 'aberto') || !betName.trim()}
                  className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white h-12 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm uppercase tracking-widest font-bold hover:brightness-125 transition-all border-2 border-white/10 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                    {isSubmitting ? 'PROCESSANDO...' : (activeContest?.status !== 'aberto' ? 'APOSTAS BLOQUEADAS' : 'FINALIZAR E ENVIAR')}
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
                
                <button 
                  onClick={handleWhatsAppValidation}
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  PEDIR VALIDAÇÃO NO WHATSAPP
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Betting;
