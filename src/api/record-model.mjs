export const ENTITIES = Object.freeze([
  'Bill', 'BudgetPlan', 'Category', 'Debt', 'Expense', 'Goal', 'Income',
  'Investment', 'InvestmentTransaction', 'InvestmentUpdate', 'Reserve',
  'ReserveTransaction', 'MarketIndicator', 'MarketIndicatorHistory', 'Preference',
]);
export function recordData(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Registro inválido.');
  const data = { ...input };
  for (const key of ['id', 'user_id', 'created_by', 'created_by_id', 'created_date', 'updated_date']) delete data[key];
  return data;
}
export function fromRecord(row) {
  return { ...row.data, id: row.id, created_date: row.created_at, updated_date: row.updated_at };
}
export function sortRecords(rows, sort = '-created_date') {
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const left = a[field] ?? '', right = b[field] ?? '';
    const value = typeof left === 'number' && typeof right === 'number'
      ? left - right : String(left).localeCompare(String(right), 'pt-BR');
    return descending ? -value : value;
  });
}
