import { Database, ShieldCheck } from 'lucide-react';

export default function SetupRequired() {
  return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
    <section className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
      <Database className="text-indigo-400 mb-5 h-10 w-10" />
      <p className="text-xs tracking-[.3em] text-indigo-300 mb-3">V.A.U.L.T</p>
      <h1 className="text-3xl font-semibold">Seu espaço financeiro está quase pronto.</h1>
      <p className="mt-4 text-slate-300">O administrador precisa concluir a conexão do banco e do login antes de liberar o aplicativo.</p>
      <p className="mt-6 flex gap-2 text-sm text-slate-400"><ShieldCheck className="h-5 w-5 shrink-0" />Nenhuma senha ou informação financeira é salva enquanto a conexão não estiver configurada.</p>
    </section>
  </main>;
}
