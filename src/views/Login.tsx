/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Ticket, Smartphone, User as UserIcon, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

const Login: React.FC = () => {
  const { signInWithGoogle, signInWithWhatsApp, signInWithCode } = useAuth();
  const [activeTab, setActiveTab] = useState<'google' | 'whatsapp' | 'code'>('google');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // WhatsApp state
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Code state
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('A janela de login foi fechada antes de completar o acesso. Tente novamente.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('O navegador bloqueou a janela de login. Por favor, permita popups para este site.');
      } else {
        setError('Erro ao fazer login com Google. Verifique sua conexão ou tente outro método.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Por favor, insira um número de WhatsApp válido.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await signInWithWhatsApp(cleanPhone);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login com WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || accessCode.length !== 4) {
      setError('Por favor, preencha o nome e o código de 4 letras.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await signInWithCode(name, accessCode);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login com Código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-lotofacil-purple/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-lotofacil-purple/5 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl relative z-10 shadow-xl"
      >
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-lotofacil-purple rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(107,33,168,0.3)]">
            <Ticket className="text-white" size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display tracking-widest text-slate-900 uppercase">BOLÃO <span className="text-lotofacil-purple">LOTOFÁCIL</span></h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 sm:mt-2">Gestão Completa de Bolões</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 mb-6 sm:mb-8">
          <button 
            onClick={() => setActiveTab('google')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'google' ? "bg-white text-lotofacil-purple shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Google
          </button>
          <button 
            onClick={() => setActiveTab('whatsapp')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'whatsapp' ? "bg-white text-lotofacil-purple shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            WhatsApp
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'code' ? "bg-white text-lotofacil-purple shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Código
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] sm:text-sm p-2 sm:p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'google' && (
              <motion.div
                key="google"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <p className="text-center text-slate-500 text-[11px] sm:text-sm leading-relaxed mb-4 sm:mb-6">
                  Acesse com sua conta Google para sincronizar em todos os dispositivos.
                </p>
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-lotofacil-purple text-white py-3 sm:py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-[0_4px_15px_rgba(107,33,168,0.3)] disabled:opacity-50"
                >
                  {loading ? (
                    'Entrando...'
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      ENTRAR COM GOOGLE
                    </>
                  )}
                </button>
                {error && activeTab === 'google' && (
                  <p className="text-center text-[9px] text-slate-400 uppercase tracking-widest mt-2">
                    Dica: Se tiver problemas com o Google, tente entrar via <span className="text-lotofacil-purple font-bold cursor-pointer" onClick={() => setActiveTab('whatsapp')}>WhatsApp</span> ou <span className="text-lotofacil-purple font-bold cursor-pointer" onClick={() => setActiveTab('code')}>Código</span>.
                  </p>
                )}
              </motion.div>
            )}

            {activeTab === 'whatsapp' && (
              <motion.div
                key="whatsapp"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <form onSubmit={handleWhatsAppLogin} className="space-y-4">
                  <p className="text-center text-slate-500 text-[11px] sm:text-sm leading-relaxed mb-4 sm:mb-6">
                    Seu número de WhatsApp será sua chave única de acesso.
                  </p>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1 font-bold">Número do WhatsApp</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="xx9xxxx-xxxx"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs sm:text-sm text-slate-900"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={loading || !phoneNumber}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3 sm:py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-[0_4px_15px_rgba(37,211,102,0.2)] disabled:opacity-50"
                  >
                    {loading ? 'PROCESSANDO...' : 'ENTRAR COM WHATSAPP'}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'code' && (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <form onSubmit={handleCodeLogin} className="space-y-4">
                  <p className="text-center text-slate-500 text-[11px] sm:text-sm leading-relaxed mb-4 sm:mb-6">
                    Escolha um nome e um código de 4 letras para acessar.
                  </p>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1 font-bold">Seu Nome</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: João Silva"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs sm:text-sm text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1 font-bold">Código (4 Letras)</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                          type="text" 
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value.toUpperCase().slice(0, 4))}
                          placeholder="Ex: ABCD"
                          maxLength={4}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs sm:text-sm text-slate-900 font-mono tracking-widest"
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={loading || !name || accessCode.length !== 4}
                    className="w-full bg-lotofacil-purple hover:bg-lotofacil-purple/80 text-white py-3 sm:py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-[0_4px_15px_rgba(107,33,168,0.3)] disabled:opacity-50"
                  >
                    {loading ? 'PROCESSANDO...' : 'ENTRAR COM CÓDIGO'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-slate-100 text-center">
          <p className="text-slate-300 text-[9px] uppercase tracking-widest">
            Ao entrar você concorda com nossos termos de uso.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
