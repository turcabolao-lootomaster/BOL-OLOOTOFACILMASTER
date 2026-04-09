import React from 'react';
import { BookOpen, MousePointer2, CheckCircle2, ShieldCheck, HelpCircle, MessageCircle, Trophy, Zap, Target, TrendingUp, Flag, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

const Instructions: React.FC = () => {
  return (
    <div className="mobile-p lg:p-10 max-w-4xl mx-auto space-y-8 sm:space-y-12 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-lotofacil-purple/10 rounded-2xl text-lotofacil-purple mb-4">
          <BookOpen size={32} />
        </div>
        <h1 className="text-3xl sm:text-5xl font-display tracking-widest text-slate-900 uppercase">REGRAS E <span className="text-lotofacil-purple">MANUAL</span></h1>
        <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">Tudo o que você precisa saber sobre o funcionamento e premiações do Bolão Lotofácil.</p>
      </div>

      {/* Rules Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-l-4 border-lotofacil-yellow pl-4">
          <Trophy className="text-lotofacil-yellow" size={24} />
          <h2 className="text-xl sm:text-2xl font-display tracking-widest text-slate-900 uppercase">REGRAS DO <span className="text-lotofacil-yellow">BOLÃO</span></h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Acertos por Sorteio */}
          <div className="glass-card p-6 border-l-4 border-lotofacil-purple">
            <div className="flex items-center gap-3 mb-3">
              <Target className="text-lotofacil-purple" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Acertos por Sorteio (Prêmio Fixo)</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada aposta tem **10 números**. São sorteados **15 números** em cada sorteio.
              Se você acertar os **10 números** em qualquer um dos 3 sorteios (Sorteio 1, 2 ou 3), você ganha o prêmio fixo estipulado para aquele sorteio.
            </p>
          </div>

          {/* Bônus por Pontuação */}
          <div className="glass-card p-6 border-l-4 border-emerald-500">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="text-emerald-500" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Bônus por Pontuação Total</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                <span className="font-bold text-emerald-600">Bônus 25:</span> Se a soma dos seus acertos nos 3 sorteios for igual ou superior a **25 pontos**, você ganha um bônus extra.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                <span className="font-bold text-emerald-600">Super Bônus 27:</span> Se a soma for igual ou superior a **27 pontos**, você ganha o prêmio máximo de pontuação.
              </p>
            </div>
          </div>

          {/* Ranking Geral */}
          <div className="glass-card p-6 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="text-blue-500" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Ranking Geral (Classificação)</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              O sistema soma seus acertos nos 3 sorteios (Ex: 8 no primeiro + 7 no segundo + 9 no terceiro = 24 pontos).
              Quem ficar no topo do ranking (maior soma de pontos) ganha o prêmio principal e secundário: **1º LUGAR** e **2º LUGAR**.
            </p>
          </div>

          {/* Rapidinha */}
          <div className="glass-card p-6 border-l-4 border-orange-500">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="text-orange-500" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Rapidinha</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Prêmio destinado para quem fizer a **maior pontuação exclusivamente no 1° sorteio**.
            </p>
          </div>

          {/* Corrida dos Campeões */}
          <div className="glass-card p-6 border-l-4 border-lotofacil-yellow">
            <div className="flex items-center gap-3 mb-3">
              <Flag className="text-lotofacil-yellow" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Corrida dos Campeões - 150 PTS</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sua pontuação de cada concurso é salva e acumulada. Quem alcançar primeiro a marca de **150 pontos** ganha este prêmio especial. O sistema soma automaticamente seus acertos de todos os concursos.
            </p>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#25D366]/20 rounded-2xl text-[#25D366]">
            <MessageCircle size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest">Suporte WhatsApp</h2>
            <p className="text-slate-400 text-sm">Dúvidas ou problemas? Fale conosco!</p>
          </div>
        </div>
        
        <a 
          href="https://wa.me/5511978193552" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all shadow-[0_4px_20px_rgba(37,211,102,0.3)]"
        >
          <Smartphone size={20} />
          11 97819-3552
        </a>
      </section>

      {/* Manual Section (Original Content) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-l-4 border-lotofacil-purple pl-4">
          <HelpCircle className="text-lotofacil-purple" size={24} />
          <h2 className="text-xl sm:text-2xl font-display tracking-widest text-slate-900 uppercase">COMO APOSTAR <span className="text-slate-500">(CLIENTES)</span></h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-6 space-y-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-lotofacil-purple">1</div>
            <h3 className="font-bold text-slate-900">Escolha seus Números</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Selecione 10 números no volante ou use a "Surpresinha" para gerar números aleatórios.</p>
          </div>
          <div className="glass-card p-6 space-y-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-lotofacil-purple">2</div>
            <h3 className="font-bold text-slate-900">Identifique sua Aposta</h3>
            <p className="text-xs text-slate-600 leading-relaxed">No campo "Nome na Aposta", coloque seu apelido. Se fizer vários jogos, use nomes diferentes para cada um.</p>
          </div>
          <div className="glass-card p-6 space-y-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-lotofacil-purple">3</div>
            <h3 className="font-bold text-slate-900">Finalize e Envie</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Confira o resumo e clique em "Finalizar e Enviar". Suas apostas ficarão salvas em "Meus Jogos".</p>
          </div>
          <div className="glass-card p-6 space-y-3 border-emerald-100 bg-emerald-50/30">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center font-bold text-emerald-600">4</div>
            <h3 className="font-bold text-slate-900">Peça a Validação</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Clique no botão do WhatsApp para enviar o comprovante ao vendedor. Sua aposta só vale após ele validar!</p>
          </div>
        </div>
      </section>

      {/* For Sellers */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-l-4 border-orange-500 pl-4">
          <MousePointer2 className="text-orange-500" size={24} />
          <h2 className="text-xl sm:text-2xl font-display tracking-widest text-slate-900 uppercase">PAINEL DO <span className="text-slate-500">(VENDEDOR)</span></h2>
        </div>
        
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 space-y-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="p-4 bg-white/10 rounded-2xl">
              <MessageCircle size={32} className="text-orange-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Use seu Link de Vendas</h3>
              <p className="text-sm text-slate-400">No seu painel, copie o link exclusivo. Ao enviar para o cliente, seu código já vem preenchido, garantindo sua comissão.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-white/10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-400">
                <CheckCircle2 size={18} />
                <span className="font-bold uppercase tracking-widest text-[10px]">Validação</span>
              </div>
              <p className="text-xs text-slate-400">Sempre confira o pagamento antes de clicar em "Validar". Uma vez validada, a aposta entra no sorteio.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-400">
                <ShieldCheck size={18} />
                <span className="font-bold uppercase tracking-widest text-[10px]">Segurança</span>
              </div>
              <p className="text-xs text-slate-400">O sistema protege os nomes dos seus clientes. Ninguém pode "roubar" o nome de um líder no seu código.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Instructions;
