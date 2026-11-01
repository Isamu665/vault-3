import { inMonth, sum } from './finance';

/**
 * Processa receitas, despesas e aportes em ordem cronológica para calcular
 * os indicadores "Saldo do mês" e "Dinheiro disponível" conforme a regra V.A.U.L.T.
 *
 * Regra:
 *  - Saldo do mês: receitas recebidas no mês atual e ainda não utilizadas.
 *  - Dinheiro disponível: saldo livre acumulado dos meses anteriores.
 *  - Saídas (despesas e aportes) abatem primeiro o Saldo do mês disponível na data;
 *    se insuficiente, abatem o Dinheiro disponível.
 *  - Receita posterior não cobre retroativamente saída anterior.
 *  - Na virada do mês, o Saldo do mês não utilizado vira Dinheiro disponível.
 *
 * @param {object} collections - { incomes, expenses, reserveTxs, investmentTxs, investments }
 * @param {number} year - ano alvo
 * @param {number} month - mês alvo (0-11)
 * @returns {{ saldoDoMes: number, dinheiroDisponivel: number }}
 */
export function computeSaldoDisponivel({ incomes, expenses, reserveTxs, investmentTxs, investments }, year, month) {
  // Investimentos vinculados a uma reserva são alocação interna de patrimônio:
  // seus aportes não são saídas de caixa (o dinheiro já entrou via reserva).
  const linkedInvestmentIds = new Set(
    (investments || []).filter((inv) => inv.reserve_id).map((inv) => inv.id)
  );

  const events = [];

  // Receitas → entram no Saldo do mês
  (incomes || []).forEach((inc) => {
    events.push({ date: inc.date, kind: 'in', amount: Number(inc.amount) || 0 });
  });

  // Despesas comuns (auto-criadas vinculadas a investimento/reserva são internas)
  (expenses || []).forEach((e) => {
    if (e.investment_id || e.reserve_id) return;
    events.push({ date: e.date, kind: 'out', amount: Number(e.amount) || 0 });
  });

  // Reservas: depósito = aporte (saída); saque = resgate para o caixa (entrada no disponível)
  (reserveTxs || []).forEach((tx) => {
    if (tx.type === 'deposit') {
      events.push({ date: tx.date, kind: 'out', amount: Number(tx.amount) || 0 });
    } else {
      events.push({ date: tx.date, kind: 'resgate', amount: Number(tx.amount) || 0 });
    }
  });

  // Aportes em investimentos não vinculados a reserva = saída de caixa
  (investmentTxs || []).forEach((tx) => {
    if (linkedInvestmentIds.has(tx.investment_id)) return;
    events.push({ date: tx.date, kind: 'out', amount: Number(tx.amount) || 0 });
  });

  // Ordenação cronológica. Mesmo dia: entradas (receita/resgate) antes das saídas.
  const order = { in: 0, resgate: 0, out: 1 };
  events.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return order[a.kind] - order[b.kind];
  });

  // Agrupa por mês
  const byMonth = new Map();
  for (const ev of events) {
    const d = new Date(ev.date);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(ev);
  }

  if (events.length === 0) return { saldoDoMes: 0, dinheiroDisponivel: 0 };

  const sortedKeys = [...byMonth.keys()].sort((a, b) => {
    const [ya, ma] = a.split('-').map(Number);
    const [yb, mb] = b.split('-').map(Number);
    return ya - yb || ma - mb;
  });

  const [firstY, firstM] = sortedKeys[0].split('-').map(Number);

  // Mês alvo anterior ao primeiro movimento: nada acumulado ainda
  if (year < firstY || (year === firstY && month < firstM)) {
    return { saldoDoMes: 0, dinheiroDisponivel: 0 };
  }

  let dinheiroDisponivel = 0;
  let saldoDoMes = 0;
  let cy = firstY;
  let cm = firstM;

  while (true) {
    // Virada do mês: o Saldo do mês não utilizado vira Dinheiro disponível
    dinheiroDisponivel += saldoDoMes;
    saldoDoMes = 0;

    const key = `${cy}-${cm}`;
    const monthEvents = byMonth.get(key) || [];
    for (const ev of monthEvents) {
      if (ev.kind === 'in') {
        saldoDoMes += ev.amount;
      } else if (ev.kind === 'resgate') {
        dinheiroDisponivel += ev.amount;
      } else {
        const usadoMes = Math.min(ev.amount, Math.max(0, saldoDoMes));
        saldoDoMes -= usadoMes;
        dinheiroDisponivel -= (ev.amount - usadoMes);
      }
    }

    if (cy === year && cm === month) {
      return { saldoDoMes, dinheiroDisponivel };
    }

    cm++;
    if (cm > 11) { cm = 0; cy++; }
  }
}