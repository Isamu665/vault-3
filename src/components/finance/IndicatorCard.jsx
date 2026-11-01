import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function IndicatorCard({ indicator }) {
  const { name, value, unit, source, referenceDate, referencePeriod, status } = indicator;

  const statusConfig = {
    updated: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Atualizado' },
    stale: { icon: AlertTriangle, color: 'text-amber-500', label: 'Dado mais recente' },
    unavailable: { icon: XCircle, color: 'text-rose-500', label: 'Indisponível' },
  };

  const cfg = statusConfig[status] || statusConfig.updated;
  const StatusIcon = cfg.icon;
  const ref = referencePeriod || (referenceDate ? formatDate(referenceDate) : '');

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">{name}</h4>
        <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
          <StatusIcon className="w-3 h-3" /> {cfg.label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {value != null ? `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—'}
        {unit && unit !== '%' && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {source} {ref ? `• ref. ${ref}` : ''}
      </p>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}