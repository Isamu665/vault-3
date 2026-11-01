import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, Send, X, Loader2, MessageSquare } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { motion } from 'framer-motion';

const AGENT_NAME = 'financial_assistant';

const SUGGESTIONS = [
  'Quanto gastei este mês?',
  'Como está meu saldo?',
  'Registrar despesa',
  'Minhas metas',
  'Registrar receita',
  'Contas próximas do vencimento',
];

export default function AssistantChat({ open, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Criar/obter conversa quando o chat abre
  useEffect(() => {
    if (!open) return;

    async function init() {
      try {
        const convs = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        if (convs && convs.length > 0) {
          const conv = await base44.agents.getConversation(convs[0].id);
          setConversation(conv);
          setMessages(conv.messages || []);
        } else {
          const conv = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: 'Assistente V.A.U.L.T' }
          });
          setConversation(conv);
          setMessages([]);
        }
      } catch (e) {
        console.error('Erro ao iniciar conversa:', e);
      }
    }
    init();
  }, [open]);

  // Subscription para novos messages
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsub();
  }, [conversation?.id]);

  // Scroll para baixo quando novas mensagens chegam
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = useCallback(async (text) => {
    if (!conversation || !text.trim()) return;
    setSending(true);
    setInput('');
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: text.trim() });
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);
    } finally {
      setSending(false);
    }
  }, [conversation]);

  // --- Gravação de voz ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      setRecording(true);
    } catch (e) {
      console.error('Microfone não disponível:', e);
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') { setRecording(false); resolve(); return; }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'voz.webm', { type: 'audio/webm' });
        setTranscribing(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
          const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
          if (transcript) setInput(transcript);
        } catch (e) {
          console.error('Erro na transcrição:', e);
        } finally {
          setTranscribing(false);
          setRecording(false);
        }
        resolve();
      };
      recorder.stop();
      recorder.stream.getTracks().forEach(t => t.stop());
    });
  }, []);

  if (!open) return null;

  const showSuggestions = messages.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex flex-col bg-background md:inset-auto md:bottom-20 md:right-4 md:h-[600px] md:w-[420px] md:rounded-2xl md:shadow-2xl md:border"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Assistente V.A.U.L.T</h3>
            <p className="text-[11px] text-muted-foreground">Financeiro pessoal</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {showSuggestions && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Olá! Sou seu assistente financeiro.<br/>Como posso ajudar?</p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant={recording ? 'destructive' : 'ghost'}
            size="icon"
            className="shrink-0"
            onClick={() => (recording ? stopRecording() : startRecording())}
            disabled={transcribing}
          >
            {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder={recording ? 'Fale agora…' : 'Digite sua pergunta…'}
            disabled={sending || recording}
          />
          <Button
            size="icon"
            className="shrink-0"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending || recording}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}