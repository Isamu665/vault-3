import { requireBackend } from '@/api/supabase';
const CACHE_KEY = 'vault:public-indicators:v1';
let inflight;
export async function getIndicators(forceRefresh = false) {
  let cached;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { /* no cached rates */ }
  if (!forceRefresh && cached && Date.now() - cached.time < 3600000) return cached.result;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await requireBackend().functions.invoke('market-indicators', { body: {} });
      if (error || !data?.indicators?.length) throw error || new Error('Indicadores indisponíveis');
      if (data.status === 'updated') localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), result: data }));
      return { ...data, indicators: data.indicators.map(indicator => ({ ...indicator, status: data.status === 'stale' ? 'stale' : 'updated' })) };
    } catch {
      return cached ? { indicators: cached.result.indicators.map(indicator => ({ ...indicator, status: 'stale' })), status: 'stale' } : { indicators: [], status: 'unavailable' };
    } finally { inflight = null; }
  })();
  return inflight;
}
export function getIndicatorValue(indicators, key) {
  return indicators.find(indicator => indicator.indicatorKey === key)?.value || 0;
}
