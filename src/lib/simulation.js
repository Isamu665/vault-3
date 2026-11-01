// === Financial Simulation Engine for VAULT Simulacro ===
// All financial calculations use this single engine.
// Never hardcode indicator values (CDI, Selic, IPCA) here — they are always passed as parameters.

// --- Rate Conversions (compound, never linear) ---

export function annualToDaily(annualRate) {
  return Math.pow(1 + annualRate, 1 / 252) - 1;
}

export function annualToMonthly(annualRate) {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

export function monthlyToAnnual(monthlyRate) {
  return Math.pow(1 + monthlyRate, 12) - 1;
}

// --- Tax: IR regressivo (renda fixa) ---

export function getIrRate(days) {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.20;
  if (days <= 720) return 0.175;
  return 0.15;
}

// --- Tax: IOF regressivo (first 30 days) ---

export function getIofRate(days) {
  if (days >= 30) return 0;
  return Math.max(0, 0.96 - days * 0.032);
}

// --- IPCA composition (never sum monthly rates) ---

export function composeInflation(monthlyRatePercents) {
  return monthlyRatePercents.reduce((acc, r) => acc * (1 + r / 100), 1) - 1;
}

// --- Product monthly rate calculation ---

export function getProductMonthlyRate(product, rates) {
  const cdiDecimal = rates.cdiAnnual / 100;
  const ipcaDecimal = rates.ipcaAnnual / 100;
  const selicDecimal = rates.selicAnnual / 100;

  switch (product.type) {
    case 'cdb_cdi': {
      // CDI: convert annual to daily (252 business days), apply percent, convert back
      const cdiDaily = annualToDaily(cdiDecimal);
      const productDaily = cdiDaily * (product.percent / 100);
      const productAnnual = Math.pow(1 + productDaily, 252) - 1;
      return annualToMonthly(productAnnual);
    }
    case 'prefixado':
      return annualToMonthly(product.customRate / 100);
    case 'ipca_plus': {
      // nominal = (1 + inflation) * (1 + realRate) - 1
      const realRate = product.ipcaSpread / 100;
      const nominalAnnual = (1 + ipcaDecimal) * (1 + realRate) - 1;
      return annualToMonthly(nominalAnnual);
    }
    case 'selic':
      return annualToMonthly(selicDecimal * (product.percent / 100));
    case 'custom':
      return annualToMonthly(product.customRate / 100);
    default:
      return 0;
  }
}

// --- Core simulation ---

export function runSimulation(params) {
  const {
    initialCapital = 0,
    monthlyContribution = 0,
    months = 0,
    product = { type: 'cdb_cdi', percent: 100 },
    cdiAnnual = 0,
    ipcaAnnual = 0,
    selicAnnual = 0,
    rateMode = 'current',
  } = params;

  const monthlyRate = getProductMonthlyRate(product, { cdiAnnual, ipcaAnnual, selicAnnual });
  const monthlyInflation = annualToMonthly(ipcaAnnual / 100);

  // Build contributions list — each contribution has its own start month
  const contributions = [];
  if (initialCapital > 0) contributions.push({ amount: initialCapital, startMonth: 0 });
  for (let m = 1; m <= months; m++) {
    if (monthlyContribution > 0) contributions.push({ amount: monthlyContribution, startMonth: m });
  }

  // Monthly projection — compute gross, net (after IR), and inflation-corrected at each month
  const projection = [];
  let invested = 0;

  for (let m = 0; m <= months; m++) {
    if (m === 0 && initialCapital > 0) invested += initialCapital;
    if (m > 0 && monthlyContribution > 0) invested += monthlyContribution;

    let gross = 0, ir = 0, corrected = 0;
    for (const c of contributions) {
      if (c.startMonth > m) continue;
      const growthMonths = m - c.startMonth;
      const growthFactor = Math.pow(1 + monthlyRate, growthMonths);
      const grossValue = c.amount * growthFactor;
      const profit = grossValue - c.amount;
      gross += grossValue;
      if (profit > 0) {
        const ageDays = growthMonths * 30;
        ir += profit * getIrRate(ageDays);
      }
      // Each contribution corrected by its own inflation period
      corrected += c.amount * Math.pow(1 + monthlyInflation, growthMonths);
    }

    projection.push({
      month: m,
      invested: Math.round(invested),
      gross: Math.round(gross),
      net: Math.round(gross - ir),
      ir: Math.round(ir),
      corrected: Math.round(corrected),
    });
  }

  const last = projection[projection.length - 1] || {};
  const totalInvested = last.invested || 0;
  const grossBalance = last.gross || 0;
  const grossProfit = grossBalance - totalInvested;
  const irEstimated = last.ir || 0;
  const netBalance = last.net || 0;
  const inflationAccumulated = months > 0 ? Math.pow(1 + monthlyInflation, months) - 1 : 0;
  const correctedValue = last.corrected || 0;
  const realGainAbs = netBalance - correctedValue;
  const realGainPct = correctedValue > 0 ? realGainAbs / correctedValue : 0;
  const nominalReturn = totalInvested > 0 ? grossBalance / totalInvested - 1 : 0;
  const realReturn = correctedValue > 0 ? netBalance / correctedValue - 1 : 0;

  return {
    projection,
    totalInvested,
    grossBalance,
    grossProfit,
    irEstimated,
    netBalance,
    inflationAccumulated,
    correctedValue,
    realGainAbs,
    realGainPct,
    nominalReturn,
    realReturn,
    monthlyRate,
    rateMode,
    cdiUsed: cdiAnnual,
    ipcaUsed: ipcaAnnual,
    selicUsed: selicAnnual,
  };
}