import { inMonth, sum } from './finance';

export function monthDeposits(reserveTxs, year, month) {
  return reserveTxs.filter((tx) => tx.type === 'deposit' && inMonth(tx.date, year, month));
}

export function monthContributions(investmentTxs, year, month) {
  return investmentTxs.filter((tx) => inMonth(tx.date, year, month));
}

export function economiaForMonth(reserveTxs, investmentTxs, investments, year, month) {
  const linkedInvestmentIds = new Set(
    (investments || []).filter((inv) => inv.reserve_id).map((inv) => inv.id)
  );
  const monthReserveTxs = (reserveTxs || []).filter((tx) => inMonth(tx.date, year, month));
  const deposits = sum(monthReserveTxs.filter((tx) => tx.type === 'deposit'));
  const withdrawals = sum(monthReserveTxs.filter((tx) => tx.type === 'withdrawal'));
  const contributions = monthContributions(investmentTxs, year, month)
    .filter((tx) => !linkedInvestmentIds.has(tx.investment_id));
  return (deposits - withdrawals) + sum(contributions);
}

export function patrimonyAccumulated(reserveTxs, investmentTxs, investments, upToDate) {
  const date = upToDate ? new Date(upToDate) : new Date();
  date.setHours(23, 59, 59, 999);
  const reserveBalance = reserveTxs
    .filter((tx) => new Date(tx.date) <= date)
    .reduce((s, tx) => s + (tx.type === 'deposit' ? Number(tx.amount) || 0 : -(Number(tx.amount) || 0)), 0);

  // Exclude investments linked to a reserve — their value is already counted in that reserve's balance
  const linkedInvestmentIds = new Set(
    (investments || []).filter((inv) => inv.reserve_id).map((inv) => inv.id)
  );
  const investmentBalance = investmentTxs
    .filter((tx) => new Date(tx.date) <= date && !linkedInvestmentIds.has(tx.investment_id))
    .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
  return reserveBalance + investmentBalance;
}

export function reserveBalance(reserveTxs, reserveId) {
  return reserveTxs
    .filter((tx) => tx.reserve_id === reserveId)
    .reduce((s, tx) => s + (tx.type === 'deposit' ? Number(tx.amount) || 0 : -(Number(tx.amount) || 0)), 0);
}

export function investmentTotal(investmentTxs, investmentId) {
  return investmentTxs
    .filter((tx) => tx.investment_id === investmentId)
    .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
}

export function patrimonyBreakdown(reserveTxs, investmentTxs, reserves, investments, year, month) {
  const linkedInvestmentIds = new Set(
    (investments || []).filter((inv) => inv.reserve_id).map((inv) => inv.id)
  );
  const items = [];
  reserves.forEach((r) => {
    const txs = reserveTxs.filter((tx) => tx.reserve_id === r.id && inMonth(tx.date, year, month));
    const amount = sum(txs.filter((tx) => tx.type === 'deposit')) - sum(txs.filter((tx) => tx.type === 'withdrawal'));
    if (amount !== 0) items.push({ name: r.name, spent: amount, percentage: 0, color: '#6366f1' });
  });
  investments.forEach((inv) => {
    if (linkedInvestmentIds.has(inv.id)) return;
    const amount = sum(investmentTxs.filter((tx) => tx.investment_id === inv.id && inMonth(tx.date, year, month)));
    if (amount > 0) items.push({ name: inv.name, spent: amount, percentage: 0, color: '#22c55e' });
  });
  return items;
}

export function inRange(dateStr, from, to) {
  return dateStr >= from && dateStr <= to;
}

export function economiaForRange(reserveTxs, investmentTxs, investments, from, to) {
  const linkedInvestmentIds = new Set(
    (investments || []).filter((inv) => inv.reserve_id).map((inv) => inv.id)
  );
  const rTxs = (reserveTxs || []).filter((tx) => inRange(tx.date, from, to));
  const deposits = sum(rTxs.filter((tx) => tx.type === 'deposit'));
  const withdrawals = sum(rTxs.filter((tx) => tx.type === 'withdrawal'));
  const iContribs = investmentTxs.filter((tx) => inRange(tx.date, from, to) && !linkedInvestmentIds.has(tx.investment_id));
  return (deposits - withdrawals) + sum(iContribs);
}