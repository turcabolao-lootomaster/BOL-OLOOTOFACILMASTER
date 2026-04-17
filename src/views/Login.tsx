/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Ticket, Smartphone, User as UserIcon, Key, Store, X, CheckCircle, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { firebaseService } from '../services/firebaseService';

const Login: React.FC = () => {
  const { user, logout, signInWithGoogle, signInWithWhatsApp, signInWithSellerCode, signInWithClientCode } = useAuth();
  const [activeTab, setActiveTab] = useState<'client' | 'google' | 'seller'>('client');
  const [loginMethod, setLoginMethod] = useState<'whatsapp' | 'code'>('whatsapp');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Registration Modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    whatsapp: '',
    email: '',
    requestedCode: ''
  });
  
  // WhatsApp state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [waName, setWaName] = useState('');
  const [sellerCode, setSellerCode] = useState('');
  
  // Code state (Client or Seller)
  const [accessName, setAccessName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [sellerPassword, setSellerPassword] = useState('');

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
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Este domínio (lotofacilpremiada.online) não está autorizado no Firebase. Adicione-o na lista de "Domínios Autorizados" no Console do Firebase > Authentication > Settings.');
      } else {
        setError(`Erro ao fazer login (${err.code || 'erro desconhecido'}). Verifique sua conexão ou tente outro método.`);
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
      await signInWithWhatsApp(cleanPhone, waName, sellerCode);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login com WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode) {
      setError('Por favor, insira o código do vendedor.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      if (accessName.trim()) {
        // Client login with Name + Seller Code
        await signInWithClientCode(accessName.trim(), accessCode);
      } else {
        // Seller login with Code + Password
        if (!sellerPassword) {
          setError('Vendedores precisam de senha para acessar o painel.');
          setLoading(false);
          return;
        }
        await signInWithSellerCode(accessCode, sellerPassword);
      }
    } catch (err: any) {
      let msg = err.message || 'Erro ao fazer login com Código';
      // Try to parse JSON error from firestore service
      if (msg.startsWith('{') && msg.includes('"error"')) {
        try {
          const parsed = JSON.parse(msg);
          msg = parsed.error;
          if (msg.includes('Missing or insufficient permissions')) {
            msg = 'Erro de permissão no banco de dados. Verifique se o código está correto ou contate o administrador.';
          }
        } catch (e) {}
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.whatsapp || !regForm.requestedCode) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      await firebaseService.createSellerRequest({
        userId: user?.uid || 'guest',
        name: regForm.name,
        whatsapp: regForm.whatsapp,
        email: regForm.email,
        requestedCode: regForm.requestedCode.toUpperCase()
      });
      setRegSuccess(true);
      setRegForm({ name: '', whatsapp: '', email: '', requestedCode: '' });
      setTimeout(() => {
        setShowRegisterModal(false);
        setRegSuccess(false);
      }, 5000);
    } catch (err: any) {
      setError('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center p-4 bg-slate-50 relative overflow-hidden pt-10 sm:pt-20">
      {/* Registration Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8 bg-lotofacil-purple text-white relative">
                <button 
                  onClick={() => setShowRegisterModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Store size={24} />
                  </div>
                  <h3 className="text-xl font-display tracking-widest uppercase">Novos Colaboradores</h3>
                </div>
                <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Preencha os dados e aguarde a aprovação do administrador.</p>
              </div>

              <div className="p-6 sm:p-8">
                {regSuccess ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle size={40} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-slate-900 uppercase">Solicitação Enviada!</h4>
                      <p className="text-sm text-slate-500">
                        O administrador analisará seus dados e entrará em contato em breve via WhatsApp.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSeller} className="space-y-4">
                    {error && loginMethod === 'code' && !showRegisterModal ? null : error && (
                      <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-3 text-red-600 animate-shake">
                        <Key size={18} className="shrink-0" />
                        <p className="text-xs font-medium leading-tight">{error}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome Completo</label>
                      <input 
                        type="text" 
                        value={regForm.name}
                        onChange={(e) => setRegForm({...regForm, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lotofacil-purple/50"
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">WhatsApp</label>
                      <input 
                        type="tel" 
                        value={regForm.whatsapp}
                        onChange={(e) => setRegForm({...regForm, whatsapp: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lotofacil-purple/50"
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Código Sugerido (Opcional)</label>
                      <input 
                        type="text" 
                        value={regForm.requestedCode}
                        onChange={(e) => setRegForm({...regForm, requestedCode: e.target.value.toUpperCase()})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lotofacil-purple/50 font-bold uppercase"
                        placeholder="Ex: SORTE10"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-lotofacil-purple text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-lotofacil-purple/20 transition-all disabled:opacity-50 mt-4"
                    >
                      {loading ? 'ENVIANDO...' : 'SOLICITAR ACESSO'}
                    </button>
                    <p className="text-[8px] text-slate-400 text-center uppercase tracking-widest leading-relaxed">
                      Ao solicitar acesso, você concorda em seguir os termos de colaboração do sistema.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-lotofacil-purple/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-lotofacil-purple/5 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl relative z-10 shadow-xl"
      >
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-[0_0_20px_rgba(107,33,168,0.2)]">
            <img src="https://cdn-icons-png.flaticon.com/512/3112/3112946.png" alt="Logo" className="w-full h-full object-cover p-2" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display tracking-widest text-slate-900 uppercase">BOLÃO <span className="text-lotofacil-purple">LOTOFÁCIL</span></h1>
          <div className="flex flex-col items-center mt-1 sm:mt-2">
            <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-tighter">Seu bolão com organização e clareza</p>
            <p className="text-slate-400 text-[9px] sm:text-[11px] mt-0.5">Tudo do seu bolão na palma da sua mão</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 mb-6 sm:mb-8">
          <button 
            onClick={() => setActiveTab('client')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'client' ? "bg-white text-lotofacil-purple shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            WhatsApp | Cliente
          </button>
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
            onClick={() => {
              setActiveTab('seller');
              setAccessName(''); // Clear access name to ensure it goes through seller login path
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
              activeTab === 'seller' ? "bg-white text-lotofacil-purple shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Vendedor
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
                    Dica: Se tiver problemas com o Google, tente entrar via <span className="text-lotofacil-purple font-bold cursor-pointer" onClick={() => { setActiveTab('client'); setLoginMethod('whatsapp'); }}>WhatsApp</span> ou <span className="text-lotofacil-purple font-bold cursor-pointer" onClick={() => { setActiveTab('client'); setLoginMethod('code'); }}>Código</span>.
                  </p>
                )}
              </motion.div>
            )}

            {activeTab === 'client' && (
              <motion.div
                key="client"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => setLoginMethod('whatsapp')}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest border transition-all",
                      loginMethod === 'whatsapp' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-white text-slate-400 border-slate-100"
                    )}
                  >
                    Via WhatsApp
                  </button>
                  <button 
                    onClick={() => setLoginMethod('code')}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest border transition-all",
                      loginMethod === 'code' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100"
                    )}
                  >
                    Via Nome e Código
                  </button>
                </div>

                {loginMethod === 'whatsapp' ? (
                  <form onSubmit={handleWhatsAppLogin} className="space-y-4">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1 font-bold">Seu Nome</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input 
                            type="text" 
                            value={waName}
                            onChange={(e) => setWaName(e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs sm:text-sm text-slate-900"
                            required
                          />
                        </div>
                      </div>
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
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1 font-bold">Código do Vendedor</label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input 
                            type="text" 
                            value={sellerCode}
                            onChange={(e) => setSellerCode(e.target.value.toUpperCase())}
                            placeholder="Ex: REF123"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs sm:text-sm text-slate-900 font-bold"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={loading || !phoneNumber || !waName || !sellerCode}
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3 sm:py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-[0_4px_15px_rgba(37,211,102,0.2)] disabled:opacity-50"
                    >
                      {loading ? 'PROCESSANDO...' : 'ENTRAR COM WHATSAPP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleCodeLogin} className="space-y-4">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1 font-bold">Seu Nome</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input 
                            type="text" 
                            value={accessName}
                            onChange={(e) => setAccessName(e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs sm:text-sm text-slate-900"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1 font-bold">Código do Vendedor</label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input 
                            type="text" 
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                            placeholder="Ex: REF123"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs sm:text-sm text-slate-900 font-bold tracking-widest"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={loading || !accessCode || !accessName.trim()}
                      className="w-full bg-slate-900 text-white shadow-slate-900/10 py-3 sm:py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-lg disabled:opacity-50"
                    >
                      {loading ? 'PROCESSANDO...' : 'ENTRAR COMO CONVIDADO'}
                    </button>
                    <p className="text-center text-[9px] text-slate-400 uppercase tracking-widest mt-2">
                      Dica: Use o código que seu vendedor te passou para ver seus pontos e bilhetes.
                    </p>
                  </form>
                )}
              </motion.div>
            )}

            {activeTab === 'seller' && (
              <motion.div
                key="seller"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <form onSubmit={handleCodeLogin} className="space-y-4">
                  <p className="text-center text-slate-500 text-[11px] sm:text-sm leading-relaxed mb-4 sm:mb-6 uppercase font-bold tracking-widest">
                    Acesso Colaborador
                  </p>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1 font-bold">Código do Vendedor</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                          type="text" 
                          value={accessCode}
                          onChange={(e) => {
                            setAccessCode(e.target.value.toUpperCase());
                            setAccessName(''); // Ensure accessName is empty for seller login logic
                          }}
                          placeholder="Ex: REF123"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs sm:text-sm text-slate-900 font-bold tracking-widest"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1 font-bold">Senha do Vendedor</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                          type="password" 
                          value={sellerPassword}
                          onChange={(e) => setSellerPassword(e.target.value)}
                          placeholder="Sua senha de acesso"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-lotofacil-purple/50 transition-all text-xs sm:text-sm text-slate-900"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={loading || !accessCode || !sellerPassword}
                    className="w-full bg-emerald-600 text-white shadow-emerald-600/20 py-3 sm:py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-lg disabled:opacity-50"
                  >
                    {loading ? 'PROCESSANDO...' : 'ACESSAR PAINEL'}
                  </button>
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowRegisterModal(true)}
                      className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-lotofacil-purple border border-lotofacil-purple/20 hover:bg-lotofacil-purple/5 transition-all"
                    >
                      Quero ser um Colaborador
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-slate-100 text-center space-y-4">
          <p className="text-slate-300 text-[9px] uppercase tracking-widest">
            Ao entrar você concorda com nossos termos de uso.
          </p>
          <div className="flex flex-col items-center gap-3">
            <a 
              href="https://wa.me/5511978193552" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#25D366] hover:text-[#128C7E] transition-colors"
            >
              <Smartphone size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Suporte WhatsApp: 11 97819-3552</span>
            </a>
            
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="text-[9px] text-slate-400 hover:text-lotofacil-purple uppercase tracking-widest underline decoration-dotted underline-offset-4"
            >
              Problemas ao carregar? Limpar Cache e Recarregar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
