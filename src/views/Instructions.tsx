import React from 'react';
import { BookOpen, MousePointer2, CheckCircle2, ShieldCheck, HelpCircle, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

const Instructions: React.FC = () => {
  return (
    <div className="mobile-p lg:p-10 max-w-4xl mx-auto space-y-8 sm:space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-lotofacil-purple/10 rounded-2xl text-lotofacil-purple mb-4">
          <BookOpen size={32} />
        </div>
        <h1 className="text-3xl sm:text-5xl font-display tracking-widest text-slate-900 uppercase">MANUAL DO <span className="text-lotofacil-purple">USUÁRIO</span></h1>
        <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">Tudo o que você precisa saber para aproveitar ao máximo o Bolão Lotofácil.</p>
      </div>

      {/* For Clients */}
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

      {/* General Info */}
      <div className="bg-lotofacil-yellow/5 border border-lotofacil-yellow/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-16 h-16 bg-lotofacil-yellow/20 rounded-full flex items-center justify-center text-lotofacil-yellow shrink-0">
          <ShieldCheck size={32} />
        </div>
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="font-bold text-slate-900">Transparência Total</h3>
          <p className="text-xs sm:text-sm text-slate-600">Todos os sorteios e classificações são atualizados em tempo real. Você pode conferir os acertos de qualquer participante clicando no nome dele na lista.</p>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
