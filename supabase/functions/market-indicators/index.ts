import { createClient } from 'npm:@supabase/supabase-js@2';
let cached: { indicators: unknown[]; fetchedAt: number } | null = null;
const series = [
  { key: 'CDI_ANNUAL', name: 'CDI', code: 4389, unit: '% a.a.' },
  { key: 'SELIC_META', name: 'Selic Meta', code: 432, unit: '% a.a.' },
  { key: 'SELIC_EFFECTIVE_ANNUAL', name: 'Selic Efetiva', code: 1178, unit: '% a.a.' },
  { key: 'IPCA_12M', name: 'IPCA (12 meses)', code: 13522, unit: '%' },
  { key: 'IPCA_MONTHLY', name: 'IPCA (mensal)', code: 433, unit: '%' },
];
Deno.serve(async req => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply({ error: 'Método não permitido' }, 405);
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return reply({ error: 'Entre na sua conta' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return reply({ error: 'Sessão expirada' }, 401);
  if (cached && Date.now() - cached.fetchedAt < 3600000) return reply({ indicators: cached.indicators, status: 'updated' });
  const results = await Promise.allSettled(series.map(async def => {
    const sourceUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.' + def.code + '/dados/ultimos/1?formato=json';
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('BCB indisponível');
    const [point] = await response.json();
    const value = Number(String(point?.valor).replace(',', '.'));
    if (!Number.isFinite(value) || value < -100 || value > 1000 || !/^\d{2}\/\d{2}\/\d{4}$/.test(point.data)) throw new Error('Indicador inválido');
    const [day, month, year] = point.data.split('/');
    return { indicatorKey: def.key, name: def.name, value, unit: def.unit,
      source: def.key.startsWith('IPCA') ? 'BCB / IBGE' : 'BCB', sourceSeries: String(def.code), sourceUrl,
      referenceDate: year + '-' + month + '-' + day, referencePeriod: def.key.startsWith('IPCA') ? month + '/' + year : '',
      fetchedAt: new Date().toISOString(), status: 'updated' };
  }));
  const indicators = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  if (indicators.length === series.length) cached = { indicators, fetchedAt: Date.now() };
  if (!indicators.length && cached) return reply({ indicators: cached.indicators, status: 'stale' });
  return reply({ indicators, status: indicators.length === series.length ? 'updated' : indicators.length ? 'partial' : 'unavailable' });
});
