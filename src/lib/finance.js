export const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export const brl = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const pct = (v) => `${(Number(v) || 0).toFixed(0)}%`;

export const civilDate = (value) => String(value ?? '').match(/^\d{4}-\d{2}-\d{2}(?=$|T| )/)?.[0] ?? '';

export const localDate = (date = new Date()) => [
  String(date.getFullYear()).padStart(4, '0'),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

export const inMonth = (dateStr, year, month) => {
  if (!dateStr) return false;
  const date = civilDate(dateStr);
  return Number(date.slice(0, 4)) === year && Number(date.slice(5, 7)) === month + 1;
};

export const sum = (arr, key = 'amount') => arr.reduce((a, b) => a + (Number(b[key]) || 0), 0);

export const daysUntil = (dateStr) => {
  const date = civilDate(dateStr);
  return date ? (Date.parse(date) - Date.parse(localDate())) / 86400000 : null;
};

export const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    const k = item[key] || 'Sem categoria';
    acc[k] = (acc[k] || 0) + (Number(item.amount) || 0);
    return acc;
  }, Object.create(null));

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Alimentação', color: '#f97316', icon: 'Utensils', type: 'despesa', classification: 'necessidade' },
  { name: 'Transporte', color: '#0ea5e9', icon: 'Car', type: 'despesa', classification: 'necessidade' },
  { name: 'Mercado', color: '#22c55e', icon: 'ShoppingCart', type: 'despesa', classification: 'necessidade' },
  { name: 'Lazer', color: '#a855f7', icon: 'Music', type: 'despesa', classification: 'desejo' },
  { name: 'Saúde', color: '#ef4444', icon: 'HeartPulse', type: 'despesa', classification: 'necessidade' },
  { name: 'Educação', color: '#6366f1', icon: 'GraduationCap', type: 'despesa', classification: 'necessidade' },
  { name: 'Assinaturas', color: '#ec4899', icon: 'Repeat', type: 'despesa', classification: 'desejo' },
  { name: 'Moradia', color: '#14b8a6', icon: 'Home', type: 'despesa', classification: 'necessidade' },
  { name: 'Internet', color: '#3b82f6', icon: 'Wifi', type: 'despesa', classification: 'necessidade' },
  { name: 'Restaurantes', color: '#f43f5e', icon: 'Utensils', type: 'despesa', classification: 'desejo' },
  { name: 'Outros', color: '#64748b', icon: 'Tag', type: 'despesa', classification: 'necessidade' },
];

export const DEFAULT_RESERVE_CATEGORIES = [
  { name: 'Reserva de Emergência', color: '#10b981', icon: 'Shield', type: 'reserva', classification: 'patrimônio' },
  { name: 'Aposentadoria', color: '#0ea5e9', icon: 'Sun', type: 'reserva', classification: 'patrimônio' },
];

export const INCOME_CATEGORIES = ['salário', 'renda extra', 'investimentos', 'presentes', 'outros'];