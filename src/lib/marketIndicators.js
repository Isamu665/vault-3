// === Market Indicators Service ===
// Fetches CDI, Selic, and IPCA from official sources via the backend (InvokeLLM with web search).
// Uses the MarketIndicator entity for caching (24h TTL).
// Falls back to stale cache if the fetch fails — never invents values.

import { base44 } from '@/api/base44Client';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown

let lastRefreshTime = 0;

// Plausible ranges for validation (detect broken responses, never replace valid data with garbage)
const PLAUSIBLE_RANGES = {
  CDI_ANNUAL: [0, 30],
  SELIC_META: [0, 30],
  SELIC_EFFECTIVE_ANNUAL: [0, 30],
  IPCA_12M: [-5, 20],
  IPCA_MONTHLY: [-2, 5],
};

export async function getIndicators(forceRefresh = false) {
  // Cooldown check
  if (forceRefresh && Date.now() - lastRefreshTime < REFRESH_COOLDOWN_MS) {
    forceRefresh = false;
  }

  // Try cache first
  let cached = [];
  try {
    cached = await base44.entities.MarketIndicator.list();
  } catch (e) {
    // ignore — will fetch fresh
  }

  const now = Date.now();
  const fresh = cached.filter(i => i.fetchedAt && now - new Date(i.fetchedAt).getTime() < CACHE_TTL_MS);

  if (fresh.length >= 4 && !forceRefresh) {
    return { indicators: fresh.map(mapIndicator), status: 'updated' };
  }

  // Fetch from backend (InvokeLLM with web search — server-side, not browser)
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Pesquise os valores mais recentes dos seguintes indicadores econômicos brasileiros em fontes oficiais (Banco Central do Brasil e IBGE):

1. CDI anualizado (Banco Central, SGS série 4389) — valor mais recente
2. Taxa Selic Meta (Banco Central, SGS série 432) — valor mais recente
3. Selic efetiva anualizada (Banco Central, SGS série 1178) — valor mais recente
4. IPCA acumulado em 12 meses (IBGE) — valor mais recente
5. IPCA mensal — último mês disponível (IBGE)

Retorne os valores numéricos como percentuais (exemplo: 13.90 para 13.90%).
Para CDI e Selic, use o formato DD/MM/AAAA para a data de referência.
Para IPCA, use o formato MM/AAAA para o período de referência (mês de competência).
Se não encontrar um valor, retorne null para esse campo. Não invente valores.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          cdi_annual: { type: 'number' },
          cdi_date: { type: 'string' },
          selic_meta: { type: 'number' },
          selic_meta_date: { type: 'string' },
          selic_effective: { type: 'number' },
          selic_effective_date: { type: 'string' },
          ipca_12m: { type: 'number' },
          ipca_12m_period: { type: 'string' },
          ipca_monthly: { type: 'number' },
          ipca_monthly_period: { type: 'string' }
        }
      }
    });

    const indicators = validateAndMap(result);
    if (indicators.length > 0) {
      lastRefreshTime = Date.now();
      await storeIndicators(indicators);
      return { indicators, status: 'updated' };
    }
    throw new Error('No valid indicators returned');
  } catch (e) {
    // Fallback to stale cache — never invent values
    if (cached.length > 0) {
      return { indicators: cached.map(mapIndicator), status: 'stale' };
    }
    return { indicators: [], status: 'unavailable' };
  }
}

function validateAndMap(result) {
  const defs = [
    { key: 'CDI_ANNUAL', name: 'CDI', unit: '% a.a.', source: 'BCB', series: '4389', value: result.cdi_annual, date: result.cdi_date, isPeriod: false },
    { key: 'SELIC_META', name: 'Selic Meta', unit: '% a.a.', source: 'BCB', series: '432', value: result.selic_meta, date: result.selic_meta_date, isPeriod: false },
    { key: 'SELIC_EFFECTIVE_ANNUAL', name: 'Selic Efetiva', unit: '% a.a.', source: 'BCB', series: '1178', value: result.selic_effective, date: result.selic_effective_date, isPeriod: false },
    { key: 'IPCA_12M', name: 'IPCA (12 meses)', unit: '%', source: 'IBGE', variable: '2265', value: result.ipca_12m, date: result.ipca_12m_period, isPeriod: true },
    { key: 'IPCA_MONTHLY', name: 'IPCA (mensal)', unit: '%', source: 'IBGE', variable: '63', value: result.ipca_monthly, date: result.ipca_monthly_period, isPeriod: true },
  ];

  const indicators = [];
  for (const d of defs) {
    // Validate: must be a finite number within plausible range
    if (d.value == null || isNaN(d.value) || !isFinite(d.value)) continue;
    const range = PLAUSIBLE_RANGES[d.key];
    if (range && (d.value < range[0] || d.value > range[1])) continue;

    indicators.push({
      indicatorKey: d.key,
      name: d.name,
      value: d.value,
      unit: d.unit,
      source: d.source,
      sourceSeries: d.series || '',
      sourceVariable: d.variable || '',
      referenceDate: d.isPeriod ? null : parseDate(d.date),
      referencePeriod: d.isPeriod ? d.date : '',
      fetchedAt: new Date().toISOString(),
      status: 'updated',
    });
  }
  return indicators;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

async function storeIndicators(indicators) {
  try {
    await base44.entities.MarketIndicator.deleteMany({});
  } catch (e) {}
  if (indicators.length > 0) {
    await base44.entities.MarketIndicator.bulkCreate(indicators);
  }
}

function mapIndicator(i) {
  return {
    indicatorKey: i.indicatorKey,
    name: i.name,
    value: i.value,
    unit: i.unit,
    source: i.source,
    referenceDate: i.referenceDate,
    referencePeriod: i.referencePeriod,
    status: i.status || 'updated',
  };
}

export function getIndicatorValue(indicators, key) {
  const ind = indicators.find(i => i.indicatorKey === key);
  return ind ? ind.value : 0;
}