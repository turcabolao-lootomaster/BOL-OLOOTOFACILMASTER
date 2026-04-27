import React from 'react';
import { BookOpen, MousePointer2, CheckCircle2, ShieldCheck, HelpCircle, MessageCircle, Trophy, Zap, Target, TrendingUp, Flag, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

const Instructions: React.FC = () => {
  return (
    <div className="mobile-p lg:p-10 max-w-4xl mx-auto pb-32">
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-6 sm:p-10 md:p-16 space-y-12 border border-slate-100">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lotofacil-purple/10 rounded-2xl text-lotofacil-purple mb-4">
            <BookOpen size={32} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-display tracking-widest text-slate-900 uppercase">REGRAS E <span className="text-lotofacil-purple">MANUAL</span></h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">Tudo o que você precisa saber sobre o funcionamento e premiações do Bolão Lotofácil.</p>
        </div>

      {/* Installation Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-l-4 border-lotofacil-purple pl-4">
          <Smartphone className="text-lotofacil-purple" size={24} />
          <h2 className="text-xl sm:text-2xl font-display tracking-widest text-slate-900 uppercase">COMO INSTALAR O <span className="text-lotofacil-purple">APLICATIVO</span></h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-6 border-t-4 border-blue-500">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414C17.039 15.3414 16.647 14.9494 16.647 14.4654C16.647 13.9814 17.039 13.5894 17.523 13.5894C18.007 13.5894 18.399 13.9814 18.399 14.4654C18.399 14.9494 18.007 15.3414 17.523 15.3414ZM6.477 15.3414C5.993 15.3414 5.601 14.9494 5.601 14.4654C5.601 13.9814 5.993 13.5894 6.477 13.5894C6.961 13.5894 7.353 13.9814 7.353 14.4654C7.353 14.9494 6.961 15.3414 6.477 15.3414ZM17.915 11.2314L19.782 7.99741C19.89 7.81041 19.826 7.57041 19.639 7.46241C19.452 7.35441 19.212 7.41841 19.104 7.60541L17.215 10.8764C15.716 10.1934 14.018 9.81741 12.235 9.81741C10.452 9.81741 8.754 10.1934 7.255 10.8764L5.366 7.60541C5.258 7.41841 5.018 7.35441 4.831 7.46241C4.644 7.57041 4.58 7.81041 4.688 7.99741L6.555 11.2314C3.388 13.0484 1.235 16.3414 1.235 20.1704H23.235C23.235 16.3414 21.082 13.0484 17.915 11.2314Z"/>
              </svg>
              Android (Chrome)
            </h3>
            <ul className="text-xs text-slate-600 space-y-2 list-decimal pl-4">
              <li>Abra o site no navegador <b>Chrome</b>.</li>
              <li>Clique nos <b>três pontinhos</b> no canto superior direito.</li>
              <li>Selecione a opção <b>"Instalar aplicativo"</b> ou "Adicionar à tela inicial".</li>
              <li>Confirme e o ícone aparecerá na sua tela de apps.</li>
            </ul>
          </div>

          <div className="glass-card p-6 border-t-4 border-slate-400">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
              </svg>
              iPhone (Safari)
            </h3>
            <ul className="text-xs text-slate-600 space-y-2 list-decimal pl-4">
              <li>Abra o site no navegador <b>Safari</b>.</li>
              <li>Clique no botão de <b>Compartilhar</b> (ícone de quadrado com seta para cima).</li>
              <li>Role para baixo e clique em <b>"Adicionar à Tela de Início"</b>.</li>
              <li>Clique em "Adicionar" no canto superior direito.</li>
            </ul>
          </div>
        </div>
      </section>

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
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Acertos por Sorteio (Prêmio Fixo R$ 300,00)</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada concurso dura **3 dias**, com **1 sorteio por dia às 21:00** (baseado no sorteio oficial da LOTOFÁCIL).
              Cada aposta tem **10 números**. São sorteados **15 números** em cada dia.
              Se você acertar os **10 números** em qualquer um dos 3 dias, você ganha o **prêmio fixo de R$ 300,00** na hora!
            </p>
          </div>

          {/* Bônus por Pontuação - OBJETIVO PRINCIPAL */}
          <div className="glass-card p-6 border-l-4 border-emerald-500 bg-emerald-50/10">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="text-emerald-500" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Prêmios Bônus (Objetivo Principal)</h3>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Este é o grande objetivo! Ao somar seus acertos nos 3 dias de concurso, você concorre aos bônus destinados ao <span className="font-bold text-emerald-600 underline">LÍDER DO CONCURSO</span>:
              </p>
              
              <div className="space-y-3">
                <div className="p-3 bg-white border border-emerald-100 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-lotofacil-yellow" />
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Prioridade 1</span>
                    <span className="text-xs font-black text-slate-900 uppercase">SUPER BÔNUS 27</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700">R$ 5.000,00 Estimados</p>
                  <p className="text-[9px] text-slate-500">Pago ao líder que atingir 27 pontos (Já incluso prêmio de 1º lugar).</p>
                </div>

                <div className="p-3 bg-white border border-emerald-100 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Prioridade 2</span>
                    <span className="text-xs font-black text-slate-900 uppercase">BÔNUS 25</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700">R$ 2.000,00 Estimados</p>
                  <p className="text-[9px] text-slate-500">Pago ao líder (25+ pts) SE NÃO HOUVER ganhador do 27 (Já incluso prêmio de 1º lugar).</p>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <ShieldCheck size={12} />
                    Regra de Unificação
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed italic">
                    Somente o líder do ranking tem direito a receber o bônus, e apenas um bônus é pago por edição. Se houver 27 pontos, o bônus de 25 fica automaticamente acumulado para a próxima edição.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rapidinha */}
          <div className="glass-card p-6 border-l-4 border-orange-500">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="text-orange-500" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Rapidinha (Somente 1° Dia)</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                Prêmio destinado para quem fizer a pontuação no sorteio do 1° dia:
              </p>
              <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5">
                <li><span className="font-bold">10 PONTOS:</span> Prêmio de <span className="font-bold text-orange-600">R$ 300,00</span>.</li>
                <li><span className="font-bold">NÃO HAVENDO 10 PONTOS:</span> <span className="font-bold text-orange-600">R$ 100,00</span> para a maior pontuação do dia.</li>
                <li><span className="italic text-[10px]">Em caso de empate, o valor será dividido entre os ganhadores.</span></li>
              </ul>
            </div>
          </div>

          {/* Ranking Geral */}
          <div className="glass-card p-6 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="text-blue-500" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Ranking do Concurso (Soma Total)</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              O sistema soma seus acertos acumulados nos 3 dias. Quem ficar no topo ganha:
            </p>
            <ul className="text-sm text-slate-600 space-y-1 mt-2 list-disc pl-5">
              <li><span className="font-bold">1º LUGAR:</span> Maior pontuação na soma total dos 3 dias.</li>
              <li><span className="font-bold">2º LUGAR:</span> Segunda maior pontuação na soma total dos 3 dias.</li>
            </ul>
          </div>

          {/* Corrida dos Campeões */}
          <div className="glass-card p-6 border-l-4 border-lotofacil-yellow">
            <div className="flex items-center gap-3 mb-3">
              <Flag className="text-lotofacil-yellow" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Corrida dos Campeões (Constância)</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Prêmio voltado para a **constância do participante**. Sua participação em sequência gera pontos que são acumulados. Quem alcançar primeiro a marca de **200 pontos** no ranking geral ganha este prêmio especial.
            </p>
          </div>
        </div>
      </section>

        {/* Manual Section (Original Content) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-l-4 border-lotofacil-purple pl-4">
            <HelpCircle className="text-lotofacil-purple" size={24} />
            <h2 className="text-xl sm:text-2xl font-display tracking-widest text-slate-900 uppercase">COMO APOSTAR <span className="text-slate-500">(CLIENTES)</span></h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-lotofacil-purple shadow-sm">1</div>
              <h3 className="font-bold text-slate-900">Escolha seus Números</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Selecione 10 números no volante ou use a "Surpresinha" para gerar números aleatórios.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-lotofacil-purple shadow-sm">2</div>
              <h3 className="font-bold text-slate-900">Identifique sua Aposta</h3>
              <p className="text-xs text-slate-600 leading-relaxed">No campo "Nome na Aposta", coloque seu apelido. Se fizer vários jogos, use nomes diferentes para cada um.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-lotofacil-purple shadow-sm">3</div>
              <h3 className="font-bold text-slate-900">Finalize e Envie</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Confira o resumo e clique em "Finalizar e Enviar". Suas apostas ficarão salvas em "Meus Jogos".</p>
            </div>
            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-emerald-600 shadow-sm">4</div>
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
          
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 space-y-8 border border-white/5 shadow-2xl">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                <TrendingUp size={32} className="text-orange-400" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold uppercase tracking-widest text-[#ffd700]">💼 BONIFICAÇÃO DO VENDEDOR</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  O vendedor receberá <span className="font-bold text-white text-base">15%</span> sobre o valor das apostas realizadas. Além disso, será concedido um bônus especial:
                </p>
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Trophy size={16} />
                    <span className="font-black text-xs uppercase tracking-widest">Prêmio de Incentivo</span>
                  </div>
                  <p className="text-base font-black text-white">R$ 100,00 ao vendedor responsável pela aposta vencedora do 1º lugar.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-2">
                    <ShieldCheck size={12} className="text-orange-400" />
                    ⚠️ CONDIÇÕES
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-2 list-disc pl-5 italic">
                    <li>O bônus será pago somente ao vendedor vinculado diretamente à aposta vencedora.</li>
                    <li>Em caso de empate no 1º lugar, o bônus será dividido proporcionalmente.</li>
                    <li>O bônus do vendedor não interfere na premiação dos participantes.</li>
                  </ul>
                </div>
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

        {/* Support Section */}
        <section className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 sm:p-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#25D366] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#25D366]/20">
              <MessageCircle size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">Suporte WhatsApp</h2>
              <p className="text-slate-500 font-medium text-sm">Dúvidas ou problemas? Fale conosco!</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <a 
              href="https://wa.me/5511978193552" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_10px_30px_rgba(37,211,102,0.3)] hover:scale-105"
            >
              <Smartphone size={20} />
              11 97819-3552
            </a>
            
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Atendimento de Segunda a Sábado</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Instructions;
