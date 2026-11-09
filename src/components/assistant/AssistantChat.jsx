import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Sparkles, Send, Loader2, ArrowUpRight, ShieldCheck, Plus, Copy, Download, Mic, MicOff, ListChecks, Wrench, TrendingUp, ChevronLeft, Calculator } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useCollection from '@/hooks/useCollection';
import { requireBackend } from '@/api/supabase';
import { financialSnapshot } from '@/lib/assistant-summary.mjs';
import { brl } from '@/lib/finance';
import MessageBubble from './MessageBubble';
import AssistantActions from './AssistantActions';
import AccountEvidence from './AccountEvidence';
import InvestmentComparison from './InvestmentComparison';
import InvestmentScenarios from './InvestmentScenarios';
import { useAuth } from '@/lib/AuthContext';
import { consentKey, hasAssistantConsent, saveAssistantConsent } from '@/lib/assistant-consent.mjs';

const WORK_QUESTIONS = ['Quero registrar uma despesa.', 'Quero anotar uma receita.', 'Quero criar uma conta a pagar.', 'Quero definir uma meta.'];
const QUESTIONS = ['Analise meus gastos fixos e essenciais de outubro de 2026.', 'Quais contas ainda estão pendentes?', 'Quanto falta para minhas metas?'];
const TOOLS = [
  { id: 'investments', title: 'Comparar investimentos', description: 'Gráfico, tabela e exportação do histórico registrado.', Icon: TrendingUp, Component: InvestmentComparison },
  { id: 'scenarios', title: 'Simular cenários', description: 'Compare taxas e aportes com uma projeção interativa.', Icon: Calculator, Component: InvestmentScenarios },
  { id: 'actions', title: 'Ações e histórico', description: 'Revise propostas, confirme alterações e consulte o histórico.', Icon: ListChecks, Component: AssistantActions },
];

export default function AssistantChat({ open, onClose }) {
  const { user } = useAuth();
  // Mount only while opened: requests and chart layout don't run behind a closed panel.
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="max-w-3xl w-[calc(100%_-_1rem)] h-[min(90dvh,820px)] p-0 overflow-hidden rounded-3xl flex flex-col gap-0">
      <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-indigo-600/10 to-emerald-500/5 border-b">
        <div className="flex items-center gap-3"><div className="p-3 bg-indigo-600 text-white rounded-2xl"><Sparkles className="w-5 h-5" /></div>
          <div><DialogTitle>V.A.U.L.T Insights</DialogTitle><DialogDescription>Clareza para decidir o seu próximo passo.</DialogDescription></div></div>
      </DialogHeader>
      {open && <AssistantContent key={user?.id || 'anonymous'} userId={user?.id} onClose={onClose} />}
    </DialogContent>
  </Dialog>;
}
function AssistantContent({ onClose, userId }) {
  const { items: incomes, loading: loadingIn, error: incomeError } = useCollection('Income');
  const { items: expenses, loading: loadingOut, error: expenseError } = useCollection('Expense');
  const { items: bills, loading: loadingBills, error: billsError } = useCollection('Bill');
  const loading = loadingIn || loadingOut || loadingBills;
  const dataError = incomeError || expenseError || billsError;
  const snapshot = useMemo(() => financialSnapshot(incomes, expenses, bills), [incomes, expenses, bills]);
  const [view, setView] = useState('overview'), [messages, setMessages] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const openTool = id => { setActiveTool(id); setView('tools'); };
  const tool = TOOLS.find(item => item.id === activeTool);
  const ToolPanel = tool?.Component;
  const [workMode, setWorkMode] = useState(true);
  const [input, setInput] = useState(''), [sending, setSending] = useState(false), [error, setError] = useState('');
  const readConsent = () => { try { return hasAssistantConsent(window.localStorage, userId); } catch { return false; } };
  const [share, setShare] = useState(readConsent);
  const changeConsent = granted => {
    try {
      saveAssistantConsent(window.localStorage, userId, granted);
      setShare(granted); setError('');
      if (!granted) { setMessages([]); }
    } catch { setShare(false); setError('Não foi possível salvar a permissão. Verifique se o navegador permite armazenamento local e tente novamente.'); }
  };
  useEffect(() => {
    const refresh = event => {
      if (event.type === 'focus' || event.key === null || event.key === consentKey(userId)) {
        const granted = readConsent(); setShare(granted);
        if (!granted) { controller.current?.abort(); setMessages([]); }
      }
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, [userId]);
  const [actionRefresh, setActionRefresh] = useState(0);
  const [recording, setRecording] = useState(false);
  const recognition = useRef(null);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const content = useRef(null), controller = useRef(null);
  useEffect(() => () => {
    controller.current?.abort();
    if (recognition.current) {
      recognition.current.onresult = null; recognition.current.onend = null; recognition.current.onerror = null;
      recognition.current.abort();
    }
  }, []);
  useEffect(() => {
    const panel = content.current;
    if (panel && view === 'chat') panel.scrollTop = panel.scrollHeight;
  }, [view, messages, sending]);
  const dictate = () => {
    if (recording) { recognition.current?.stop(); return; }
    if (!SpeechRecognition) return;
    const engine = new SpeechRecognition();
    engine.lang = 'pt-BR'; engine.interimResults = false; engine.continuous = false;
    engine.onresult = event => setInput(previous => (previous + ' ' + event.results[0][0].transcript).trim().slice(0,4000));
    engine.onerror = () => { setError('Não foi possível usar o ditado. Confira a permissão do microfone ou digite sua pergunta.'); setRecording(false); };
    engine.onend = () => setRecording(false);
    recognition.current = engine;
    try { engine.start(); setRecording(true); setError(''); } catch { setError('Ditado indisponível neste navegador.'); }
  };
  const send = async text => {
    const question = text.trim();
    if (!question || sending || recording) return;
    if (!share || !readConsent()) { setShare(false); setError('Autorize o acesso aos dados da sua conta antes de usar o assistente.'); return; }
    setView('chat'); setError(''); setSending(true);
    setInput('');
    setMessages(previous => [...previous, { role: 'user', content: question }]);
    const request = new AbortController();
    controller.current = request;
    try {
      const result = await requireBackend().functions.invoke('assistant', {
        body: { message: question, mode: workMode ? 'work' : 'chat', shareAccount: true, history: messages.slice(-6).map(m=>({role:m.role,content:m.content.slice(0,1200)})) },
        signal: request.signal,
      });
      if (request.signal.aborted || !readConsent()) return;
      if (result.error) {
        let detail = '';
        try { detail = (await result.error.context?.json())?.error; } catch { /* use fallback */ }
        throw new Error(detail || 'Assistente indisponível. Confira sua conexão e tente novamente.');
      }
      if (!result.data?.content) throw new Error('A IA não retornou uma resposta.');
      setMessages(previous => [...previous, {
        role: 'assistant',
        content: result.data.content,
        analysis: { rows: result.data.analysis || [], period: result.data.period },
        hasProposal: Boolean(result.data.proposal),
        actionId: result.data.proposal?.id,
        investmentTool: /\b(investimentos?|investir|carteira|rentabilidade|aportes?)\b/i.test(question)
          ? (/simul|proje|cen[aá]rio/i.test(question) ? 'scenarios' : 'investments')
          : null,
      }]);
      if(result.data.proposal) setActionRefresh(value=>value+1);
    } catch (e) {
      if (!request.signal.aborted && readConsent()) {
        setError(e.message || 'Não foi possível responder agora.');
      }
    } finally { setSending(false); }
  };
  const exportChat = () => {
    const body = messages.map(message => (message.role === 'user' ? 'Você' : 'V.A.U.L.T') + ':\n' + message.content).join('\n\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'vault-conversa.txt'; a.click(); URL.revokeObjectURL(url);
  };
  return <>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
      <div className="flex gap-2">{[{key:'overview',label:'Panorama',Icon:BarChart3},{key:'chat',label:'Conversar',Icon:Sparkles},{key:'tools',label:'Ferramentas',Icon:Wrench}].map(({key,label,Icon}) =>
        <Button key={key} size="sm" variant={view === key ? 'default' : 'ghost'} aria-pressed={view === key} onClick={() => { setActiveTool(null); setView(key); }}><Icon className="w-4 h-4 mr-2" />{label}</Button>)}</div>
      <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="Exportar conversa" disabled={!messages.length} onClick={exportChat}><Download className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="Nova conversa" disabled={sending} onClick={() => { setMessages([]); setError(''); }}><Plus className="w-4 h-4" /></Button></div>
    </div>
    <div key={view === 'tools' ? activeTool ?? view : view} ref={content} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5">
      {view === 'overview' ? <div className="space-y-5">
        <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Lançamentos em {snapshot.period}</p><h2 className="text-xl font-semibold mt-1">Seu mês, em perspectiva</h2></div>
        {loading ? <p role="status">Carregando seus números…</p> : dataError ? <p role="alert" className="text-destructive">Não foi possível carregar o panorama. Tente novamente mais tarde.</p> : <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[['Receitas',snapshot.income],['Despesas comuns',snapshot.expense],['Receitas − despesas',snapshot.net]].map(([label,value]) =>
            <div key={label} className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold tabular-nums mt-1">{brl(value)}</p></div>)}</div>
          <p className="text-xs text-muted-foreground">A diferença acima não desconta aportes em reservas ou investimentos. Veja o saldo disponível no painel.</p>
          <section className="rounded-2xl border p-4"><h3 className="text-sm font-medium mb-4">Receitas e despesas · últimos 6 meses</h3>
            <div className="h-44" role="img" aria-label="Evolução mensal das receitas e despesas, com valores detalhados abaixo"><ResponsiveContainer width="100%" height="100%"><AreaChart data={snapshot.months}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={45} />
              <Tooltip formatter={value => brl(value)} /><Area type="monotone" name="Receitas" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.12} /><Area type="monotone" name="Despesas" dataKey="expense" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} />
            </AreaChart></ResponsiveContainer></div>
            <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Ver valores</summary><ul>{snapshot.months.map(m => <li key={m.month}>{m.month}: receitas {brl(m.income)} · despesas {brl(m.expense)}</li>)}</ul></details>
          </section>
          <section className="rounded-2xl border p-4"><h3 className="text-sm font-medium mb-3">Onde estão os gastos deste mês?</h3>
            {snapshot.categories.length ? <><div className="h-40" role="img" aria-label="Ranking de despesas por categoria"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={snapshot.categories.slice(0,5)}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} /><Tooltip formatter={value => brl(value)} /><Bar name="Despesas" dataKey="value" fill="#818cf8" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer></div><ul className="sr-only">{snapshot.categories.map(c => <li key={c.name}>{c.name}: {brl(c.value)}</li>)}</ul></> : <p className="text-sm text-muted-foreground">Suas categorias aparecem aqui após os primeiros lançamentos.</p>}
          </section>
        </>}
        <div className="grid grid-cols-2 gap-2"><Link onClick={onClose} to="/despesas" className="rounded-xl border p-3 text-sm flex justify-between">Registrar despesa<ArrowUpRight className="w-4 h-4" /></Link><Link onClick={onClose} to="/metas" className="rounded-xl border p-3 text-sm flex justify-between">Revisar metas<ArrowUpRight className="w-4 h-4" /></Link></div>
      </div> : view === 'tools' ? (
        <div className="space-y-4">
          {ToolPanel ? <>
            <Button size="sm" variant="ghost" onClick={() => setActiveTool(null)}><ChevronLeft className="mr-1 h-4 w-4" />Todas as ferramentas</Button>
            <section className="space-y-3" aria-label={tool.title}>
              <h2 className="text-lg font-semibold">{tool.title}</h2>
              <ToolPanel {...(tool.id === 'actions' ? { refresh: actionRefresh } : {})} />
            </section>
          </> : <>
            <h2 className="text-lg font-semibold">Ferramentas do assistente</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {TOOLS.map(({ id, title, description, Icon }) => (
                <button type="button" key={id} onClick={() => openTool(id)} className="rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
                </button>
              ))}
            </div>
          </>}
        </div>
      ) : <div className="flex flex-col gap-4">
        {!messages.length && <div className="py-6"><Sparkles className="w-8 h-8 text-indigo-400 mb-3" /><h2 className="text-xl font-semibold">Converse, organize e acompanhe suas finanças.</h2><p className="text-sm text-muted-foreground mt-2">O histórico recente desta conversa ajuda a interpretar suas perguntas. Com sua permissão, o servidor consulta sua conta a cada pergunta. A conversa é temporária; o histórico das ações permanece salvo.</p><div className="flex flex-wrap gap-2 mt-5">{(workMode ? WORK_QUESTIONS : QUESTIONS).map(q => <button disabled={sending || !share} key={q} className="rounded-xl border px-3 py-2 text-xs text-left hover:bg-muted disabled:opacity-50" onClick={() => send(q)}>{q}</button>)}</div></div>}
        {messages.map((message, index) => (
          <div key={index} className="space-y-2">
            <MessageBubble message={message} />
            {message.role === 'assistant' && (
              <button className="text-xs text-muted-foreground flex gap-1 items-center" onClick={() => navigator.clipboard.writeText(message.content).catch(() => setError('Não foi possível copiar. Selecione o texto manualmente.'))}>
                <Copy className="w-3 h-3" />Copiar
              </button>
            )}
            {message.analysis?.rows.length > 0 && (
              <details className="rounded-xl border p-3">
                <summary className="cursor-pointer text-sm font-medium">Ver cálculos desta resposta</summary>
                <div className="mt-3"><AccountEvidence analysis={message.analysis} /></div>
              </details>
            )}
            {message.investmentTool && <Button size="sm" variant="outline" onClick={() => openTool(message.investmentTool)}>
              {message.investmentTool === 'scenarios' ? 'Abrir simulador' : 'Abrir comparativo de investimentos'}
            </Button>}
            {message.actionId && <AssistantActions actionId={message.actionId} refresh={actionRefresh} />}
          </div>
        ))}
        {sending && <p role="status" className="text-sm text-muted-foreground flex gap-2"><Loader2 className="w-4 h-4 animate-spin" />Preparando sua resposta…</p>}
      </div>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </div>
    {view === 'chat' && <label className="shrink-0 border-t px-4 py-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={workMode} disabled={sending} onChange={event => setWorkMode(event.target.checked)} />Modo Work · preparar tarefas com confirmação</label>}
    {view === 'chat' && <form className="border-t p-4 bg-muted/20" onSubmit={e => { e.preventDefault(); send(input); }}>
      {share ? (
        <details className="mb-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Privacidade do assistente</summary>
          <button type="button" disabled={sending} className="mt-2 underline" onClick={() => changeConsent(false)}>Revogar acesso aos dados</button>
        </details>
      ) : (
        <section className="mb-3 rounded-xl border bg-background p-3 text-xs">
          <p className="font-medium">Ativar a conversa com dados da conta</p>
          <p className="mt-1 text-muted-foreground">Ao ativar, suas perguntas e os registros financeiros necessários à resposta são enviados ao Google Gemini. Isso pode incluir descrições, notas, valores, categorias, datas e identificadores. A autorização fica salva neste navegador e pode ser revogada em Privacidade do assistente.</p>
          <Button type="button" size="sm" className="mt-2" disabled={sending} onClick={() => changeConsent(true)}>Autorizar e ativar conversa</Button>
        </section>
      )}
      <div className="flex gap-2"><Button type="button" variant="ghost" size="icon" aria-label={recording ? 'Encerrar ditado' : 'Ditar com o serviço de voz do navegador'} aria-pressed={recording} title={SpeechRecognition ? 'O áudio pode ser processado pelo provedor do navegador' : 'Ditado não disponível neste navegador'} disabled={sending || !SpeechRecognition} onClick={dictate}>{recording ? <MicOff className="w-4 h-4 text-rose-500" /> : <Mic className="w-4 h-4" />}</Button><textarea aria-label="Sua pergunta para a IA" rows={2} maxLength={4000} value={input} onChange={e => setInput(e.target.value)} onKeyDown={event => {
          if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
          event.preventDefault();
          if (share && !sending && !recording && input.trim()) event.currentTarget.form?.requestSubmit();
        }} readOnly={sending} disabled={recording} placeholder={recording ? 'Ouvindo…' : 'O que você quer entender melhor?'} className="flex-1 min-w-0 resize-none rounded-xl border bg-background px-3 py-2 text-sm" />
        <Button type="submit" className="h-auto rounded-xl" aria-label="Enviar pergunta" disabled={sending || recording || !share || !input.trim()}>{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button></div>
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2"><ShieldCheck className="w-3 h-3" />Consultas usam os dados autorizados da sua conta. Alterações exigem sua confirmação na prévia. Nenhuma movimentação bancária.</p>
      {SpeechRecognition && <p className="text-[10px] text-muted-foreground mt-1">Ditado opcional: o áudio pode ser processado pelo provedor do navegador. Não há upload de gravação pública.</p>}
    </form>}
  </>;
}
