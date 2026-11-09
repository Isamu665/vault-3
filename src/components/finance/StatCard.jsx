import React from 'react';
import { motion } from 'framer-motion';
import useCountUp from '@/hooks/useCountUp';
import { useAppReady } from '@/lib/appReady';
import { brl } from '@/lib/finance';

const EASE = [0.22, 1, 0.36, 1];

export default function StatCard({ label, value, sub = undefined, icon: Icon = undefined, tone = 'default', format = undefined, delay = 0 }) {
  const { ready } = useAppReady();
  const isNumeric = typeof value === 'number';
  const animated = useCountUp(isNumeric ? value : 0, 1000, Math.round(delay * 1000));
  const display = isNumeric ? (format ? format(animated) : brl(animated)) : value;

  const tones = {
    default: 'text-foreground',
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    accent: 'text-indigo-600 dark:text-indigo-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={ready ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.96 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className={`mt-3 text-2xl font-semibold tracking-tight tabular-nums ${tones[tone]}`}>{display}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}