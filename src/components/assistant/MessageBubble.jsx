import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
export default function MessageBubble({ message }) {
  const user = message.role === 'user';
  return <div className={cn('flex', user ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words', user ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm')}>
    {user ? <p className="whitespace-pre-wrap">{message.content}</p> : <div className="[&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline"><ReactMarkdown components={{ a: props => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>{message.content}</ReactMarkdown></div>}
  </div></div>;
}
