import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const hasToolCalls = Array.isArray(message.tool_calls) && message.tool_calls.length > 0;

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
        isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm'
      )}>
        {message.content && (
          isUser
            ? <p className="whitespace-pre-wrap">{message.content}</p>
            : <div className="prose prose-sm max-w-none prose-p:my-1"><ReactMarkdown>{message.content}</ReactMarkdown></div>
        )}
        {hasToolCalls && (
          <div className="mt-2 flex flex-col gap-1.5">
            {message.tool_calls.map((tc, idx) => (
              <ToolCallStatus key={idx} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallStatus({ toolCall }) {
  const failed = toolCall.status === 'failed' || toolCall.status === 'error';
  const running = ['pending', 'running', 'in_progress'].includes(toolCall.status);
  const hide = toolCall.display_projection?.hide_details && toolCall.display_projection?.details_redacted;

  let label;
  if (hide) {
    label = running && toolCall.display_projection?.active_label
      ? toolCall.display_projection.active_label
      : failed && toolCall.display_projection?.error_label
        ? toolCall.display_projection.error_label
        : toolCall.display_projection?.label || toolCall.name;
  } else {
    label = toolCall.name;
  }

  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-lg bg-background/70 px-2 py-1 text-[11px]',
      failed ? 'text-destructive' : 'text-muted-foreground'
    )}>
      <span className="relative flex h-2 w-2">
        {running && !failed && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', failed ? 'bg-destructive' : 'bg-primary')}></span>
      </span>
      <span className="font-medium">{label}</span>
      {running && <span className="text-[10px]">executando…</span>}
      {failed && <span className="text-[10px]">falhou</span>}
    </div>
  );
}