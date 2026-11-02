// Forecasts are virtual: only an explicit receipt confirmation creates an Income.
export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function monthlyDate(year, month, day) {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
}
export function nextMonthlyDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return monthlyDate(next.getUTCFullYear(), next.getUTCMonth(), day);
}
export function makeIncomeSchedule(income, today = localToday()) {
  const day = Number(income.date.slice(8, 10));
  // Enabling an old flag never backfills unconfirmed historical income.
  const base = income.date > today ? income.date : today;
  const next = new Date(Date.UTC(Number(base.slice(0, 4)), Number(base.slice(5, 7)), 1));
  return { active: true, start: monthlyDate(next.getUTCFullYear(), next.getUTCMonth(), day),
    day, end: '', amount: Number(income.amount), description: income.description,
    category: income.category || '', notes: income.notes || '' };
}
export function validIncomeSchedule(s) {
  return !!s && typeof s === 'object' && !Array.isArray(s) && typeof s.active === 'boolean' &&
    Number.isInteger(s.day) && s.day >= 1 && s.day <= 31 &&
    typeof s.amount === 'number' && Number.isFinite(s.amount) && s.amount > 0 &&
    typeof s.description === 'string' && !!s.description.trim() && s.description.length <= 500 &&
    typeof s.category === 'string' && s.category.length <= 500 &&
    typeof s.notes === 'string' && s.notes.length <= 5000 &&
    validISO(s.start) && (s.end === '' || validISO(s.end) && s.end >= s.start);
}
function validISO(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const date = new Date(s + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s;
}
export function incomeForecasts(incomes, year, month) {
  const received = new Set(incomes.filter(r => r.recurrence_source && r.recurrence_due)
    .map(r => `${r.recurrence_source}:${r.recurrence_due.slice(0, 7)}`));
  return incomes.flatMap(source => {
    const s = source.income_schedule;
    if (!validIncomeSchedule(s) || !s.active) return [];
    const due = monthlyDate(year, month, s.day);
    if (due < s.start || s.end && due > s.end || received.has(`${source.id}:${due.slice(0, 7)}`)) return [];
    return [{ source, due, ...s }];
  }).sort((a, b) => a.due.localeCompare(b.due));
}
