import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ text = 'Nada por aqui ainda.' }) {
  return (
    <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
      <Inbox className="w-8 h-8 mx-auto mb-3 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}