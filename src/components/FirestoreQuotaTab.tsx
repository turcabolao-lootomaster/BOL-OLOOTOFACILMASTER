import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Zap, 
  AlertTriangle, 
  RefreshCw, 
  Info, 
  Eye, 
  TrendingUp,
  HelpCircle,
  ExternalLink,
  Users,
  Layers,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { firebaseService, getLocalReadsToday } from '../services/firebaseService';

interface PageStats {
  [key: string]: number;
}

export const FirestoreQuotaTab: React.FC = () => {
  const [localReads, setLocalReads] = useState<number>(0);
  const [pageStats, setPageStats] = useState<PageStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeUsersInput, setActiveUsersInput] = useState<number>(100);
  const [viewsPerDayInput, setViewsPerDayInput] = useState<number>(3);
  const [averageRankSize, setAverageRankSize] = useState<number>(80);

  // Load stats and local reads
  const loadData = async () => {
    setIsLoading(true);
    try {
      setLocalReads(getLocalReadsToday());
      const stats = await firebaseService.getPageViewStats();
      if (stats) {
        setPageStats(stats);
      }
    } catch (e) {
      console.error("Error loading quota stats:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time local read events
    const handleReadsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setLocalReads(customEvent.detail);
    };

    window.addEventListener('firestore-reads-updated', handleReadsUpdated);
    return () => {
      window.removeEventListener('firestore-reads-updated', handleReadsUpdated);
    };
  }, []);

  // Formular simulated daily consumption based on inputs
  // 1. Home / Login views: 3 reads per view
  const loginReads = activeUsersInput * viewsPerDayInput * 3;
  // 2. Ranking views: averageRankSize reads per view
  const rankingReads = activeUsersInput * viewsPerDayInput * averageRankSize;
  // 3. User bets views: averageRankSize * 0.15 (estimated) reads per view
  const myBetsReads = activeUsersInput * (viewsPerDayInput / 2) * 15;
  // 4. Admin / Seller overhead: constant estimated 1500 reads
  const adminReads = 1500;

  const totalSimulatedReads = loginReads + rankingReads + myBetsReads + adminReads;
  const percentageOfFreeQuota = Math.min(100, (totalSimulatedReads / 50000) * 100);

  // Real data calculations if page stats exist
  const getCalculatedReadsFromStats = () => {
    if (!pageStats) return 0;
    
    // Extrapolate reads based on tracked page view stats
    const liveRankingViews = pageStats.live_ranking_total || pageStats.ranking_total || 0;
    const betViews = pageStats.bet_total || pageStats.participate_total || 0;
    const participantsViews = pageStats.participants_total || 0;
    const adminViews = pageStats.admin_total || pageStats.dashboard_total || 0;

    // Approximated weights (number of documents loaded per view)
    const rankingReadsWeight = liveRankingViews * averageRankSize; // Ranking loads all user ranking documents
    const betReadsWeight = betViews * 4; // Bet page loads active contest, settings, user details
    const participantsReadsWeight = participantsViews * 140; // Participants page loads all 140 bets
    const adminReadsWeight = adminViews * 150; // Admin panel loads users, bets, seller requests

    return Math.round(rankingReadsWeight + betReadsWeight + participantsReadsWeight + adminReadsWeight + 500);
  };

  const calculatedReadsFromStats = getCalculatedReadsFromStats();
  const calculatedPercentage = Math.min(100, (calculatedReadsFromStats / 50000) * 100);

  const resetLocalReadsCounter = () => {
    localStorage.setItem('reads_count', '0');
    setLocalReads(0);
  };

  const firebaseConsoleLink = "https://console.firebase.google.com/project/gen-lang-client-0512461180/firestore/databases/ai-studio-d3919a56-b3bb-4c71-b29e-4adcfa738936/data?openUpgradeDialog=true";

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#310f46] to-[#1c0428] border border-purple-500/20 p-6 rounded-3xl shadow-xl text-white">
        <div className="space-y-1.5">
          <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-wider rounded-full">
            Diagnóstico do Sistema
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-black tracking-wide uppercase">
            Monitor de Consumo do Firestore
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            Entenda detalhadamente para onde vão suas leituras e aprenda a otimizar o seu banco de dados.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Atualizar Dados
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Local Read Counter */}
        <div className="glass-card bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Leituras Deste Dispositivo</span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <p className="text-4xl font-display font-black text-slate-900 tracking-tight">
              {localReads.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Leituras feitas pela sua sessão atual hoje. Toda vez que você navega pelas abas do admin, aprova uma aposta ou visualiza o ranking, esse número sobe em tempo real!
            </p>
          </div>
          <button 
            onClick={resetLocalReadsCounter}
            className="w-full py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all"
          >
            Zerar Contador Local
          </button>
        </div>

        {/* Global Estimate Card */}
        <div className="glass-card bg-white border border-slate-100 p-6 rounded-3xl shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Consumo Estimado do Projeto</span>
              <h3 className="text-base font-black text-slate-900 uppercase">Estimativa de Leituras Diárias</h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Cota: 50.000 Grátis / Dia
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">Consumo Estimado (Hoje):</span>
              <span className={calculatedReadsFromStats >= 45000 ? "text-red-600" : calculatedReadsFromStats >= 30000 ? "text-amber-600" : "text-emerald-600"}>
                {calculatedReadsFromStats.toLocaleString('pt-BR')} / 50.000 leituras ({calculatedPercentage.toFixed(1)}%)
              </span>
            </div>
            
            {/* Custom Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${calculatedPercentage}%` }}
                transition={{ duration: 1 }}
                className={`h-full rounded-full ${
                  calculatedPercentage >= 90 ? 'bg-red-500' : calculatedPercentage >= 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-emerald-500 to-purple-500'
                }`}
              />
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              * Esta estimativa é calculada dinamicamente cruzando as estatísticas reais de visualizações de páginas do aplicativo com o peso médio de leitura de cada página do bolão.
            </p>
          </div>
        </div>
      </div>

      {/* Mathematical Explanation */}
      <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/60 border border-indigo-100/60 rounded-3xl p-6 space-y-6">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="text-indigo-600 shrink-0" size={24} />
          <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
            "Como gastei 50.000 leituras se tenho apenas 140 apostas?"
          </h3>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Muitos administradores acham que as leituras são proporcionais apenas ao número de apostas. No entanto, no Firebase Firestore, **o faturamento é baseado em documentos lidos**, e não no tamanho do banco de dados. Veja abaixo como o efeito multiplicador consome sua cota:
        </p>

        {/* Interactive Simulator */}
        <div className="bg-white rounded-2xl border border-indigo-100/40 p-5 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={12} className="fill-indigo-600 text-indigo-600 animate-pulse" />
              Simulador Matemático Interativo
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                👥 Participantes Ativos
              </label>
              <input 
                type="number" 
                value={activeUsersInput}
                onChange={(e) => setActiveUsersInput(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 block leading-tight">Número total de pessoas usando o aplicativo.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                🔄 Acessos Diários por Pessoa
              </label>
              <input 
                type="number" 
                value={viewsPerDayInput}
                onChange={(e) => setViewsPerDayInput(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 block leading-tight">Quantas vezes em média cada pessoa abre o app por dia.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                🏆 Participantes no Ranking
              </label>
              <input 
                type="number" 
                value={averageRankSize}
                onChange={(e) => setAverageRankSize(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 block leading-tight">Total de registros na tabela de classificação.</span>
            </div>
          </div>

          {/* Results Block */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-2">
              <span className="text-[9px] uppercase tracking-widest font-black text-purple-400">Total Diário Estimado</span>
              <p className="text-3xl font-display font-black text-purple-300">
                {totalSimulatedReads.toLocaleString('pt-BR')} <span className="text-xs font-sans text-slate-400 font-normal">leituras/dia</span>
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Neste cenário, cada participante consome em média <strong className="text-white">{Math.round(totalSimulatedReads / activeUsersInput)} leituras por dia</strong> ao abrir e acompanhar a classificação do bolão.
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-1">
              <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Porcentagem da Cota</span>
              <p className={`text-2xl font-display font-black ${totalSimulatedReads >= 50000 ? 'text-red-400' : 'text-emerald-400'}`}>
                {percentageOfFreeQuota.toFixed(1)}%
              </p>
              <span className="text-[9px] text-slate-400 block">
                {totalSimulatedReads >= 50000 ? "🔴 ESTOURO DE QUOTA" : "🟢 DENTRO DO LIMITE"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Optimizations & Blaze Plan Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Optimizations applied */}
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-emerald-700 fill-emerald-100" />
            <h4 className="text-sm sm:text-base font-black text-emerald-900 uppercase">⚡ Otimizações Aplicadas</h4>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Nós já aplicamos várias melhorias de código no seu aplicativo para economizar o máximo possível de leituras:
          </p>
          <ul className="text-xs text-emerald-700 space-y-2.5 list-disc list-inside">
            <li>
              <strong>Contagem por Servidor (getCountFromServer):</strong> Agora a contagem de apostas por concurso é feita direto nos servidores do Google. Antes, carregar a contagem consumia 140 leituras por acesso; agora consome apenas 1 leitura! <span className="font-bold">(Economia de 140x)</span>.
            </li>
            <li>
              <strong>Filtros e Limites de Query:</strong> Limitamos o ranking inicial e as listas a apenas registros essenciais, evitando carregar dados pesados de histórico antigo sem necessidade.
            </li>
          </ul>
        </div>

        {/* Blaze Plan Instructions */}
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-700" />
            <h4 className="text-sm sm:text-base font-black text-amber-900 uppercase">💎 Como Resolver Definitivamente</h4>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Se o seu bolão tem muitos participantes ativos, a cota de 50.000 leituras pode ser ultrapassada em dias de apuração ou sorteio. Para evitar que o app saia do ar nesses momentos cruciais:
          </p>
          <div className="space-y-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              O faturamento do Firebase é do tipo <strong>"Pague pelo que usar" (Plano Blaze)</strong>, mas mantém a gratuidade de 50k leituras diárias:
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside font-medium">
              <li>Você continua com as mesmas 50.000 leituras diárias de graça.</li>
              <li>Leituras extras custam apenas <strong>US$ 0.06 (cerca de R$ 0,33) por lote de 100.000 leituras adicionais</strong>.</li>
              <li>Se o app gastar 150.000 leituras no dia mais cheio, você pagará apenas <strong>R$ 0,66</strong> por esse dia!</li>
            </ul>
          </div>
          <div className="pt-2">
            <a 
              href={firebaseConsoleLink}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Ir para o Console do Firebase <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

    </div>
  );
};
