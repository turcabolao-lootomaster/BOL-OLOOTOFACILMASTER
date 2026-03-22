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
      setError(err.message || 'Erro ao fazer login com Google');
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-dark-bg relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-green/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-purple/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-neon-green rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,0,0.3)]">
            <Ticket className="text-black" size={32} />
          </div>
          <h1 className="text-3xl font-display tracking-widest text-white">BOLÃO <span className="text-neon-green">LOTOFÁCIL</span></h1>
          <p className="text-white/50 text-sm mt-2">Gestão Completa de Bolões</p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 mb-8">
          <button 
            onClick={() => setActiveTab('google')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'google' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            Google
          </button>
          <button 
            onClick={() => setActiveTab('whatsapp')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'whatsapp' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            WhatsApp
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'code' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            Código
          </button>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm p-3 rounded-xl text-center">
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
                <p className="text-center text-white/60 text-sm leading-relaxed mb-6">
                  Acesse com sua conta Google para sincronizar em todos os dispositivos.
                </p>
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full btn-primary py-4 shadow-[0_0_20px_rgba(0,255,0,0.2)] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    'Entrando...'
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      ENTRAR COM GOOGLE
                    </>
                  )}
                </button>
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
                  <p className="text-center text-white/60 text-sm leading-relaxed mb-6">
                    Seu número de WhatsApp será sua chave única de acesso.
                  </p>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 ml-1">Número do WhatsApp</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input 
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="xx9xxxx-xxxx"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-neon-green/50 transition-all text-sm text-white"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={loading || !phoneNumber}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(37,211,102,0.2)] disabled:opacity-50"
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
                  <p className="text-center text-white/60 text-sm leading-relaxed mb-6">
                    Escolha um nome e um código de 4 letras para acessar.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 ml-1">Seu Nome</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: João Silva"
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-neon-green/50 transition-all text-sm text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 ml-1">Código (4 Letras)</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input 
                          type="text" 
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value.toUpperCase().slice(0, 4))}
                          placeholder="Ex: ABCD"
                          maxLength={4}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-neon-green/50 transition-all text-sm text-white font-mono tracking-widest"
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={loading || !name || accessCode.length !== 4}
                    className="w-full bg-accent-purple hover:bg-accent-purple/80 text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)] disabled:opacity-50"
                  >
                    {loading ? 'PROCESSANDO...' : 'ENTRAR COM CÓDIGO'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-white/30 text-[10px] uppercase tracking-widest">
            Ao entrar você concorda com nossos termos de uso.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
