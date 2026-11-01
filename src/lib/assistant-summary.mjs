const amount = rows => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
export function financialSnapshot(incomes, expenses, bills, now = new Date()) {
  const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const ordinary = expenses.filter(row => !row.investment_id && !row.reserve_id);
  const monthly = rows => rows.filter(row => String(row.date || '').startsWith(monthKey));
  const income = round(amount(monthly(incomes))), expense = round(amount(monthly(ordinary)));
  const groups = new Map();
  for (const row of monthly(ordinary)) {
    const category = String(row.category || 'Sem categoria').slice(0, 60);
    groups.set(category, (groups.get(category) || 0) + (Number(row.amount) || 0));
  }
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    return { month: key, income: round(amount(incomes.filter(row => String(row.date || '').startsWith(key)))),
      expense: round(amount(ordinary.filter(row => String(row.date || '').startsWith(key)))) };
  });
  return { period: monthKey, income, expense, net: round(income - expense),
    pendingBills: round(amount(bills.filter(row => row.status !== 'pago'))),
    categories: [...groups].map(([name, value]) => ({ name, value: round(value) })).sort((a,b) => b.value-a.value).slice(0, 8), months };
}
