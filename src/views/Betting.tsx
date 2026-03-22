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
    
    setIsSubmitting(true);
    const ids: string[] = [];
    try {
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
    const message = encodeURIComponent(`Olá! Gostaria de validar minhas apostas.\nIDs: ${lastBetIds.join(', ')}\nNome: ${lastBetName || user?.name}`);
    const targetNumber = sellerWhatsApp || whatsappNumber;
    window.open(`https://wa.me/${targetNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-6 sm:space-y-10">
      {activeContest && activeContest.status !== 'aberto' && (
        <div className="bg-accent-orange/20 border border-accent-orange/30 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="text-accent-orange" size={20} />
          <p className="text-sm text-accent-orange font-medium">
            As apostas para o concurso #{activeContest.number} estão bloqueadas ou o concurso já foi finalizado.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6" style={{ width: '700px' }}>
        <div>
          <h1 className="text-2xl sm:text-4xl font-display tracking-widest text-white">FAZER <span className="text-neon-green uppercase">APOSTA</span></h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1 sm:mt-2">Selecione exatamente 10 números entre 01 e 25.</p>
        </div>
        <div className="glass-card px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-3 bg-neon-green/5 border-neon-green/20" style={{ width: '236.422px', height: '46px' }}>
          <Ticket style={{ color: '#11e706' }} size={16} className="sm:w-5 sm:h-5" />
          <span className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-white">Valor: R$ 10,00</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10" style={{ width: '500px' }}>
        {/* Number Grid */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8" style={{ height: '600px', width: '400px' }}>
          <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full max-w-[538px] mx-auto lg:mx-0" style={{ width: '300px', height: '280px' }}>
            {Array.from({ length: 25 }, (_, i) => i + 1).map(num => (
              <motion.button
                key={num}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleNumber(num)}
                style={{ width: '55px', height: '45px', fontWeight: 'bold', fontSize: '24px', lineHeight: '34px' }}
                className={cn(
                  "aspect-square rounded-xl sm:rounded-2xl transition-all flex items-center justify-center border-2",
                  selectedNumbers.includes(num)
                    ? "bg-neon-green border-neon-green text-black shadow-[0_0_15px_rgba(0,255,0,0.4)]"
                    : "bg-white border-white/10 text-black hover:border-white/30"
                )}
              >
                {num.toString().padStart(2, '0')}
              </motion.button>
            ))}
          </div>

          {/* Action Buttons below grid */}
          <div className="flex items-center gap-2" style={{ width: '300px' }}>
            <button 
              onClick={registerBet}
              disabled={selectedNumbers.length !== 10}
              style={{ height: '40px', borderColor: '#14b6ff', color: '#000000', fontStyle: 'normal', borderRadius: '160px' }}
              className="flex-[1.2] btn-primary flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-tighter disabled:opacity-30"
            >
              <Plus size={14} />
              REGISTRAR APOSTA
            </button>
            
            <div className="flex-[1.8] flex gap-1 items-center" style={{ height: '40px' }}>
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-1.5 h-full" style={{ width: '55px' }}>
                <button 
                  onClick={() => setSurpresinhaCount(Math.max(1, surpresinhaCount - 1))} 
                  className="text-white/40 hover:text-white"
                >
                  <Minus size={12} />
                </button>
                <span className="text-[10px] font-bold text-white w-3 text-center">{surpresinhaCount}</span>
                <button onClick={() => setSurpresinhaCount(Math.min(10, surpresinhaCount + 1))} className="text-white/40 hover:text-white"><Plus size={12} /></button>
              </div>
              <button 
                onClick={handleAddSurpresinha}
                className="flex-1 h-full bg-accent-purple/20 border border-accent-purple/30 rounded-xl text-accent-purple text-[9px] font-bold uppercase tracking-tighter hover:bg-accent-purple/30 transition-all flex items-center justify-center gap-1"
              >
                <Sparkles size={12} />
                SURPRESINHA
              </button>
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2 max-w-[538px] mx-auto lg:mx-0" style={{ width: '300px', height: '74px' }}>
            <p className="text-[11px] text-white/60 leading-tight text-center px-2">
              Cada aposta de 10 números é válida para os 3 sorteios do concurso atual. O valor é fixo por aposta registrada.
            </p>
          </div>
        </div>

        {/* Bet Summary Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-5 sm:p-8 space-y-6 lg:space-y-8 lg:sticky lg:top-10 w-full lg:w-[380px]" style={{ width: '456px', height: '700px' }}>
            <h2 className="text-lg sm:text-2xl font-display tracking-widest text-white uppercase">RESUMO DO <span className="text-accent-purple">BOLÃO</span></h2>
            
            {/* List of Registered Bets */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-white/40">Apostas Registradas ({pendingBets.length})</p>
                {pendingBets.length > 0 && (
                  <button onClick={() => setPendingBets([])} className="text-[8px] sm:text-[10px] text-accent-red uppercase tracking-widest hover:underline">Limpar Tudo</button>
                )}
              </div>
              
              <div className="space-y-3 max-h-[200px] sm:max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                <AnimatePresence initial={false}>
                  {pendingBets.map((bet, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between group"
                    >
                      <div className="flex flex-wrap gap-1">
                        {bet.map(num => (
                          <span key={num} className="text-[10px] sm:text-xs font-bold text-neon-green">
                            {num.toString().padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                      <button 
                        onClick={() => removePendingBet(idx)}
                        className="text-white/20 hover:text-accent-red transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {pendingBets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-10 border border-dashed border-white/10 rounded-2xl">
                    <AlertCircle className="text-white/10 mb-2" size={24} />
                    <p className="text-[10px] sm:text-xs text-white/20 italic text-center px-4">Nenhuma aposta registrada ainda. Selecione 10 números ou use a Surpresinha.</p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] sm:text-xs uppercase tracking-widest text-white/40 mb-2 ml-1">Nome na Aposta (Opcional)</label>
                  <input 
                    type="text" 
                    value={betName}
                    onChange={(e) => setBetName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 sm:py-3 px-4 focus:outline-none focus:border-neon-green/50 transition-all text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs uppercase tracking-widest text-white/40 mb-2 ml-1">Código do Vendedor (Opcional)</label>
                  <input 
                    type="text" 
                    value={sellerCode}
                    onChange={(e) => setSellerCode(e.target.value)}
                    placeholder="Ex: REF123"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 sm:py-3 px-4 focus:outline-none focus:border-neon-green/50 transition-all text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/40">Total a Pagar</span>
                  <span className="text-lg sm:text-xl font-bold text-neon-green">R$ {(pendingBets.length * 10).toFixed(2)}</span>
                </div>

                <button 
                  type="submit"
                  disabled={pendingBets.length === 0 || isSubmitting || (activeContest?.status !== 'aberto')}
                  className="w-full btn-primary h-12 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,0,0.2)] disabled:opacity-30 disabled:cursor-not-allowed text-xs sm:text-sm uppercase tracking-widest"
                >
                  {isSubmitting ? 'PROCESSANDO...' : (activeContest?.status !== 'aberto' ? 'APOSTAS BLOQUEADAS' : 'FINALIZAR E ENVIAR')}
                </button>
              </div>
            </form>

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="bg-neon-green/20 border border-neon-green/30 p-4 rounded-2xl flex items-center gap-3">
                  <Check className="text-neon-green" size={20} />
                  <p className="text-sm text-neon-green font-medium">Apostas enviadas com sucesso!</p>
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
