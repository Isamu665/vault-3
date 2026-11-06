import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MONTHS } from '@/lib/finance';

export default function MonthPicker({ year, month, onChange }) {
  const shift = (delta) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    onChange(y, m);
  };
  return (
    <div className="flex items-center gap-1 rounded-full border bg-card px-1 py-1 shadow-sm">
      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" aria-label="Mês anterior" onClick={() => shift(-1)}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="min-w-[9rem] text-center text-sm font-medium">{MONTHS[month]} {year}</span>
      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" aria-label="Próximo mês" onClick={() => shift(1)}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}