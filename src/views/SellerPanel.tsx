/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { 
  Store, 
  Copy, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ArrowUpRight,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { Seller, Bet, User } from '../types';

const SellerPanel: React.FC = () => {
  const { user } = useAuth();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [recentSales, setRecentSales] = useState<Bet[]>([]);
  const [linkedUsers, setLinkedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sales' | 'finance' | 'clients'>('sales');

  useEffect(() => {
    const userId = user?.id || user?.uid;
    if (!userId) return;
    
    let unsubscribeSales: (() => void) | null = null;
    let isMounted = true;

    // Subscribe to seller data
    const unsubscribeSeller = firebaseService.subscribeToSellerData(userId, async (sellerData) => {
      if (!isMounted) return;
      setSeller(sellerData);
      
      // Clean up previous sales subscription if it exists
      if (unsubscribeSales) {
        unsubscribeSales();
        unsubscribeSales = null;
      }

      if (sellerData) {
        // Subscribe to seller sales
        unsubscribeSales = firebaseService.subscribeToSellerSales(sellerData.code, (sales) => {
          if (!isMounted) return;
          setRecentSales(sales);
          setLoading(false);
        });

        // Fetch linked users
        const users = await firebaseService.getUsersBySellerCode(sellerData.code);
        if (isMounted) setLinkedUsers(users);
      } else {
        setLoading(false);
      }
    });

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      unsubscribeSeller();
      if (unsubscribeSales) unsubscribeSales();
      clearTimeout(timeout);
    };
  }, [user?.id, user?.uid]);

  const handleValidate = async (id: string, status: 'validado' | 'rejeitado') => {
    try {
      await firebaseService.validateBet(id, status);
      // No need to manually refresh, subscriptions will handle it
    } catch (error) {
      console.error('Erro ao validar aposta:', error);
      alert('Erro ao processar validação.');
    }
  };

  const copyLink = () => {
    if (!seller) return;
    const link = `${window.location.origin}/?ref=${seller.code}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado para a área de transferência!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-lotofacil-purple/20 border-t-lotofacil-purple rounded-full animate-spin" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
        <AlertCircle className="text-slate-200" size={48} />
        <h2 className="text-2xl font-display text-slate-900 uppercase tracking-widest">Acesso Restrito</h2>
        <p className="text-slate-400 max-w-md">Você não está cadastrado como vendedor. Entre em contato com um administrador.</p>
      </div>
    );
  }

  const totalSalesCount = recentSales.length;
  const validatedSalesCount = recentSales.filter(s => s.status === 'validado').length;
  const totalCommission = validatedSalesCount * (10 * (seller.commissionPct / 100));
  const totalSalesValue = validatedSalesCount * 10;
  const toSend = totalSalesValue - totalCommission;

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-display tracking-widest text-slate-900">PAINEL DO <span className="text-lotofacil-purple uppercase">VENDEDOR</span></h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">Gerencie suas vendas e acompanhe suas comissões em tempo real.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-card px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-3 border-lotofacil-purple/20">
            <TrendingUp className="text-lotofacil-purple" size={18} />
            <span className="text-[10px] sm:text-sm font-bold text-slate-900 uppercase tracking-widest">Comissão: {seller.commissionPct}%</span>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit">
        <button 
          onClick={() => setActiveTab('sales')}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === 'sales' ? "bg-white text-lotofacil-purple shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Minhas Vendas
        </button>
        <button 
          onClick={() => setActiveTab('finance')}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === 'finance' ? "bg-white text-lotofacil-purple shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Financeiro
        </button>
        <button 
          onClick={() => setActiveTab('clients')}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === 'clients' ? "bg-white text-lotofacil-purple shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Meus Clientes
        </button>
      </div>

      {activeTab === 'sales' ? (
        <>
          {/* Seller Link Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 sm:p-8 bg-gradient-to-br from-lotofacil-purple/5 to-transparent border-lotofacil-purple/20"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-lotofacil-purple rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                    <ExternalLink className="text-white" size={16} />
                  </div>
                  <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">SEU LINK DE VENDAS</h2>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm max-w-md leading-relaxed">
                  Compartilhe este link com seus clientes. Todas as apostas feitas através dele serão vinculadas à sua conta automaticamente.
                </p>
              </div>
              <div className="flex-1 max-w-md w-full">
                <div className="flex items-center gap-2 p-1.5 sm:p-2 bg-slate-100 rounded-xl sm:rounded-2xl border border-slate-200">
                  <div className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[10px] sm:text-xs text-slate-400 truncate">
                    {window.location.origin}/?ref={seller.code}
                  </div>
                  <button 
                    onClick={copyLink}
                    className="btn-primary py-1.5 sm:py-2 px-4 sm:px-6 flex items-center gap-2 text-[10px] sm:text-xs shrink-0"
                  >
                    <Copy size={12} />
                    COPIAR
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Sales Table */}
          <div className="glass-card p-5 sm:p-8 space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">VENDAS <span className="text-slate-200">DOS MEUS CLIENTES</span></h2>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                {recentSales.length} {recentSales.length === 1 ? 'Aposta' : 'Apostas'}
              </span>
            </div>
            
            <div className="overflow-x-auto -mx-5 sm:mx-0">
              <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Data</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Cliente</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Status</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((sale, idx) => (
                    <motion.tr 
                      key={sale.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50 transition-all"
                    >
                      <td className="px-4 sm:px-6 py-4 sm:py-5 text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest">
                        {sale.createdAt instanceof Date ? sale.createdAt.toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[120px] sm:max-w-none">{sale.betName || sale.userName}</p>
                        <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                          <p className="text-[8px] sm:text-[10px] text-slate-300 uppercase tracking-widest">ID: {sale.id.substring(0, 4).toUpperCase()}</p>
                          <span className="text-slate-100">•</span>
                          <p className="text-[8px] sm:text-[10px] text-slate-300 uppercase tracking-widest">Conc: #{sale.contestNumber}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sale.numbers.map(n => (
                            <span key={n} className="text-[8px] font-mono text-lotofacil-purple/60">{n.toString().padStart(2, '0')}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <div className="flex items-center gap-2">
                          {sale.status === 'validado' ? (
                            <CheckCircle2 className="text-emerald-600" size={12} />
                          ) : sale.status === 'pendente' ? (
                            <Clock className="text-orange-600" size={12} />
                          ) : (
                            <AlertCircle className="text-red-600" size={12} />
                          )}
                          <span className={cn(
                            "text-[8px] sm:text-[10px] font-bold uppercase tracking-widest",
                            sale.status === 'validado' ? "text-emerald-600" : 
                            sale.status === 'pendente' ? "text-orange-600" : "text-red-600"
                          )}>
                            {sale.status === 'validado' ? 'Validada' : sale.status === 'pendente' ? 'Pendente' : 'Rejeitada'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <div className="flex items-center justify-center gap-2">
                          {sale.status === 'pendente' ? (
                            <>
                              <button 
                                onClick={() => handleValidate(sale.id, 'validado')}
                                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1.5"
                              >
                                <CheckCircle2 size={12} />
                                Aprovar
                              </button>
                              <button 
                                onClick={() => handleValidate(sale.id, 'rejeitado')}
                                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1.5"
                              >
                                <AlertCircle size={12} />
                                Rejeitar
                              </button>
                            </>
                          ) : (
                            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Processada</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {recentSales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-300 italic text-sm">Nenhuma venda registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'clients' ? (
        <div className="glass-card p-5 sm:p-8 space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">MEUS <span className="text-slate-200">CLIENTES VINCULADOS</span></h2>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
              {linkedUsers.length} {linkedUsers.length === 1 ? 'Cliente' : 'Clientes'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {linkedUsers.length === 0 ? (
              <div className="col-span-full py-10 text-center text-slate-400 text-xs uppercase tracking-widest italic">
                Nenhum cliente vinculado ao seu código ainda.
              </div>
            ) : (
              linkedUsers.map(u => (
                <div key={u.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-lotofacil-purple/10 flex items-center justify-center text-lotofacil-purple font-bold">
                    {u.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{u.name || 'Sem Nome'}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{u.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-10">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { label: 'Vendas Totais', value: totalSalesCount, icon: Store, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Validadas', value: validatedSalesCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Comissão Total', value: `R$ ${totalCommission.toFixed(2)}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'ENVIAR AO ADMIN', value: `R$ ${toSend.toFixed(2)}`, icon: ArrowUpRight, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((stat, idx) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-6 text-center sm:text-left"
              >
                <div className={`w-10 h-10 sm:w-14 sm:h-14 ${stat.bg} rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner`}>
                  <stat.icon className={stat.color} size={20} />
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 mb-0.5 sm:mb-1 truncate">{stat.label}</p>
                  <h3 className="text-base sm:text-2xl font-bold text-slate-900 truncate">{stat.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Financial Breakdown */}
          <div className="glass-card p-5 sm:p-8 space-y-6 sm:space-y-8">
            <h2 className="text-lg sm:text-2xl font-display tracking-widest text-slate-900 uppercase">RESUMO <span className="text-slate-200">FINANCEIRO</span></h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instruções de Repasse</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    O valor de <span className="font-bold text-slate-900">R$ {toSend.toFixed(2)}</span> deve ser enviado ao administrador para validação final das suas comissões.
                  </p>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Sua Chave PIX Cadastrada:</p>
                    <p className="text-sm font-mono font-bold text-lotofacil-purple">{seller.pixKey || 'Não cadastrada'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Total Bruto (Validadas)</span>
                  <span className="text-sm font-bold text-slate-900">R$ {totalSalesValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Sua Comissão ({seller.commissionPct}%)</span>
                  <span className="text-sm font-bold text-emerald-600">- R$ {totalCommission.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Líquido a Enviar</span>
                  <span className="text-lg font-bold text-orange-600">R$ {toSend.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerPanel;
