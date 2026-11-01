import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Calculator, TrendingUp, PiggyBank, Wallet, RefreshCw, Info, Receipt, Shield, Banknote, Percent, ArrowRightLeft } from 'lucide-react';
import PageHeader from '@/components/finance/PageHeader';
import StatCard from '@/components/finance/StatCard';
import Section from '@/components/finance/Section';
import IndicatorCard from '@/components/finance/IndicatorCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { brl } from '@/lib/finance';
import useRuleConfig from '@/hooks/useRuleConfig';
import { runSimulation } from '@/lib/simulation';
import { getIndicators, getIndicatorValue } from '@/lib/marketIndicators';

const PRODUCT_TYPES = [
  { value: 'cdb_cdi', label: 'CDB % CDI', usesIndicator: true },
  { value: 'prefixado', label: 'Prefixado', usesIndicator: false },
  { value: 'ipca_plus', label: 'IPCA +', usesIndicator: true },
  { value: 'selic', label: 'Selic', usesIndicator: true },
  { value: 'custom', label: 'Taxa personalizada', usesIndicator: false },
];

const PRESETS = [
  { label: 'Poupança', productType: 'custom', customRate: '8' },
  { label: 'Tesouro Selic', productType: 'selic', percent: '100' },
  { label: 'CDB 110% CDI', productType: 'cdb_cdi', percent: '110' },
  { label: 'CDB 100% CDI', productType: 'cdb_cdi', percent: '100' },
  { label: 'IPCA + 6%', productType: 'ipca_plus', ipcaSpread: '6' },
];

const pct2 = (v) => `${(Number(v) || 0).toFixed(2)}%`;

export default function Simulacro() {
  const { config } = useRuleConfig();
  const [indicators, setIndicators] = useState([]);
  const [indicatorStatus, setIndicatorStatus] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const [productType, setProductType] = useState('cdb_cdi');
  const [rateMode, setRateMode] = useState('current');
  const [percent, setPercent] = useState('110');
  const [customRate, setCustomRate] = useState('12');
  const [ipcaSpread, setIpcaSpread] = useState('6');
  const [initialCapital, setInitialCapital] = useState('10000');
  const [monthlyContribution, setMonthlyContribution] = useState('500');
  const [period, setPeriod] = useState('120');
  const [customCdi, setCustomCdi] = useState('13');
  const [customIpca, setCustomIpca] = useState('4');
  const [customSelic, setCustomSelic] = useState('13');
  const [income, setIncome] = useState('6000');

  const necessCat = config.categories.find(c => c.key === 'necessidades');
  const desejoCat = config.categories.find(c => c.key === 'desejos');
  const patrimonioCat = config.categories.find(c => c.key === 'patrimonio');
  const patrimonioAmount = (Number(income) || 0) * ((patrimonioCat?.percentage || 20) / 100);

  useEffect(() => { fetchIndicators(); }, []);
  useEffect(() => {
    if (indicatorStatus === 'loading') return;
    if (!['CDI_ANNUAL', 'IPCA_12M', 'SELIC_META'].every(key => indicators.some(i => i.indicatorKey === key))) setRateMode('custom');
  }, [indicators, indicatorStatus, rateMode]);

  const fetchIndicators = async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const { indicators: inds, status } = await getIndicators(force);
      setIndicators(inds);
      setIndicatorStatus(status);
    } catch {
      setIndicatorStatus('unavailable');
    }
    if (force) setRefreshing(false);
  };

  const result = useMemo(() => {
    const cdiAnnual = rateMode === 'custom' ? Number(customCdi) : getIndicatorValue(indicators, 'CDI_ANNUAL');
    const ipcaAnnual = rateMode === 'custom' ? Number(customIpca) : getIndicatorValue(indicators, 'IPCA_12M');
    const selicAnnual = rateMode === 'custom' ? Number(customSelic) : getIndicatorValue(indicators, 'SELIC_META');

    const product = {
      type: productType,
      percent: Number(percent) || 100,
      customRate: Number(customRate) || 0,
      ipcaSpread: Number(ipcaSpread) || 0,
    };

    return runSimulation({
      initialCapital: Number(initialCapital) || 0,
      monthlyContribution: Number(monthlyContribution) || 0,
      months: Number(period) || 0,
      product,
      cdiAnnual, ipcaAnnual, selicAnnual,
      rateMode,
    });
  }, [indicators, rateMode, productType, percent, customRate, ipcaSpread, initialCapital, monthlyContribution, period, customCdi, customIpca, customSelic]);

  const chartData = result.projection.map(p => ({
    mes: p.month,
    'Capital aportado': p.invested,
    'Patrimônio bruto': p.gross,
    'Patrimônio líquido': p.net,
    'Valor corrigido': p.corrected,
  }));

  const scenarioText = result.totalInvested > 0
    ? `Neste cenário, foram aportados ${brl(result.totalInvested)} ao longo de ${period} meses (${(Number(period) / 12).toFixed(1)} anos). O patrimônio bruto seria de ${brl(result.grossBalance)}. Caso o investimento fosse liquidado na data final, os tributos estimados seriam ${brl(result.irEstimated)}, resultando em patrimônio líquido de ${brl(result.netBalance)}. Considerando a inflação do período, seriam necessários ${brl(result.correctedValue)} para preservar o poder de compra dos aportes. O ganho real estimado seria de ${brl(result.realGainAbs)} (${pct2(result.realGainPct * 100)}).`
    : '';

  const currentProduct = PRODUCT_TYPES.find(p => p.value === productType);

  return (
    <div>
      <PageHeader title="Simulacro" subtitle="Simule o crescimento do seu patrimônio com indicadores reais" />
      {indicatorStatus !== 'loading' && !['CDI_ANNUAL','IPCA_12M','SELIC_META'].every(key => indicators.some(i => i.indicatorKey === key)) &&
        <p role="status" className="mb-4 rounded-xl bg-amber-100 text-amber-950 p-3 text-sm">Alguns indicadores estão indisponíveis. A simulação usa taxas personalizadas: revise as hipóteses antes de interpretar os resultados.</p>}

      {/* === Indicadores de referência === */}
      <Section title="Indicadores de referência" className="mb-6" action={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowInfo(true)}>
            <Info className="w-4 h-4" /> Sobre
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchIndicators(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      }>
        {indicatorStatus === 'loading' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl border bg-card animate-pulse" />)}
          </div>
        ) : indicators.length === 0 ? (
          <p className="text-sm text-muted-foreground">Indicadores temporariamente indisponíveis. Use taxa personalizada na simulação.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {indicators.filter(i => ['CDI_ANNUAL', 'SELIC_META', 'SELIC_EFFECTIVE_ANNUAL', 'IPCA_12M'].includes(i.indicatorKey)).map(i => (
              <IndicatorCard key={i.indicatorKey} indicator={i} />
            ))}
          </div>
        )}
        {rateMode === 'current' && (
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
            Taxa atual utilizada como hipótese de simulação. Não representa previsão de indicadores futuros.
          </p>
        )}
      </Section>

      {/* === Parâmetros da simulação === */}
      <Section title="Parâmetros da simulação" className="mb-6">
        <div className="space-y-4">
          <div>
            <Label>Produto</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRODUCT_TYPES.map(pt => (
                <button key={pt.value} onClick={() => setProductType(pt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${productType === pt.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-card hover:bg-accent'}`}>
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Presets</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => {
                  setProductType(p.productType);
                  if (p.percent) setPercent(p.percent);
                  if (p.customRate) setCustomRate(p.customRate);
                  if (p.ipcaSpread) setIpcaSpread(p.ipcaSpread);
                }}
                  className="rounded-full px-3 py-1.5 text-xs border bg-card hover:bg-accent transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product-specific inputs */}
          {(productType === 'cdb_cdi' || productType === 'selic') && (
            <div><Label>{productType === 'cdb_cdi' ? 'Percentual do CDI' : 'Percentual da Selic'} (%)</Label>
              <Input type="number" step="1" value={percent} onChange={e => setPercent(e.target.value)} className="rounded-xl mt-1" /></div>
          )}
          {productType === 'prefixado' && (
            <div><Label>Taxa prefixada (% a.a.)</Label>
              <Input type="number" step="0.01" value={customRate} onChange={e => setCustomRate(e.target.value)} className="rounded-xl mt-1" /></div>
          )}
          {productType === 'ipca_plus' && (
            <div><Label>Spread sobre IPCA (% a.a.)</Label>
              <Input type="number" step="0.01" value={ipcaSpread} onChange={e => setIpcaSpread(e.target.value)} className="rounded-xl mt-1" /></div>
          )}
          {productType === 'custom' && (
            <div><Label>Taxa personalizada (% a.a.)</Label>
              <Input type="number" step="0.01" value={customRate} onChange={e => setCustomRate(e.target.value)} className="rounded-xl mt-1" /></div>
          )}

          {/* Rate mode selector for indicator-based products */}
          {currentProduct?.usesIndicator && (
            <div>
              <Label>Origem da taxa</Label>
              <div className="flex gap-2 mt-2">
                {[{ v: 'current', l: 'Atual' }, { v: 'custom', l: 'Personalizada' }].map(rm => (
                  <button key={rm.v} onClick={() => setRateMode(rm.v)}
                    className={`rounded-lg px-3 py-1.5 text-xs border transition-colors ${rateMode === rm.v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-card hover:bg-accent'}`}>
                    {rm.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom rate inputs */}
          {rateMode === 'custom' && currentProduct?.usesIndicator && (
            <div className="grid gap-3 sm:grid-cols-3 rounded-xl border p-4 bg-muted/30">
              {productType === 'cdb_cdi' && <div><Label>CDI customizado (% a.a.)</Label><Input type="number" step="0.01" value={customCdi} onChange={e => setCustomCdi(e.target.value)} className="rounded-xl mt-1" /></div>}
              {(productType === 'ipca_plus' || productType === 'cdb_cdi') && <div><Label>IPCA customizado (% a.a.)</Label><Input type="number" step="0.01" value={customIpca} onChange={e => setCustomIpca(e.target.value)} className="rounded-xl mt-1" /></div>}
              {productType === 'selic' && <div><Label>Selic customizada (% a.a.)</Label><Input type="number" step="0.01" value={customSelic} onChange={e => setCustomSelic(e.target.value)} className="rounded-xl mt-1" /></div>}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Capital inicial</Label><Input type="number" step="0.01" value={initialCapital} onChange={e => setInitialCapital(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>Aporte mensal</Label><Input type="number" step="0.01" value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>Período (meses)</Label><Input type="number" value={period} onChange={e => setPeriod(e.target.value)} className="rounded-xl mt-1" /></div>
          </div>
          <div>
            <Label>Período: {period} meses ({(Number(period) / 12).toFixed(1)} anos)</Label>
            <Slider value={[Number(period) || 0]} min={1} max={360} step={1} onValueChange={v => setPeriod(String(v[0]))} className="mt-2" />
          </div>
        </div>
      </Section>

      {/* === Distribuição da renda (existing 50/30/20) === */}
      <Section title={`Distribuição da renda (${config.categories.map(c => c.percentage).join('/')})`} className="mb-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Necessidades</span>
              <span className="text-xs font-semibold text-blue-600">{necessCat?.percentage || 50}%</span>
            </div>
            <p className="text-xl font-semibold">{brl((Number(income) || 0) * ((necessCat?.percentage || 50) / 100))}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Desejos</span>
              <span className="text-xs font-semibold text-purple-600">{desejoCat?.percentage || 30}%</span>
            </div>
            <p className="text-xl font-semibold">{brl((Number(income) || 0) * ((desejoCat?.percentage || 30) / 100))}</p>
          </div>
          <div className="rounded-xl border p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Patrimônio</span>
              <span className="text-xs font-semibold text-indigo-600">{patrimonioCat?.percentage || 20}%</span>
            </div>
            <p className="text-xl font-semibold text-indigo-700 dark:text-indigo-300">{brl(patrimonioAmount)}</p>
            <button onClick={() => setMonthlyContribution(String(Math.round(patrimonioAmount)))}
              className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 hover:underline">
              Usar como aporte →
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Input placeholder="Renda mensal (opcional)" type="number" value={income} onChange={e => setIncome(e.target.value)} className="max-w-xs rounded-xl" />
        </div>
      </Section>

      {/* === Results === */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 mb-6">
        <StatCard label="Total aportado" value={brl(result.totalInvested)} icon={Wallet} />
        <StatCard label="Patrimônio bruto" value={brl(result.grossBalance)} icon={TrendingUp} tone="positive" />
        <StatCard label="Lucro bruto" value={brl(result.grossProfit)} icon={Calculator} tone="accent" />
        <StatCard label="IR estimado" value={brl(result.irEstimated)} icon={Receipt} tone="negative" />
        <StatCard label="Patrimônio líquido" value={brl(result.netBalance)} icon={Banknote} tone="positive" />
        <StatCard label="Inflação acumulada" value={pct2(result.inflationAccumulated * 100)} icon={Percent} tone="negative" />
        <StatCard label="Valor corrigido" value={brl(result.correctedValue)} icon={Shield} />
        <StatCard label="Ganho real" value={brl(result.realGainAbs)} icon={ArrowRightLeft} tone={result.realGainAbs >= 0 ? 'positive' : 'negative'} sub={pct2(result.realGainPct * 100)} />
        <StatCard label="Rentabilidade nominal" value={pct2(result.nominalReturn * 100)} icon={TrendingUp} tone="positive" />
        <StatCard label="Rentabilidade real" value={pct2(result.realReturn * 100)} icon={PiggyBank} tone={result.realReturn >= 0 ? 'positive' : 'negative'} />
      </div>

      {/* === Chart === */}
      <Section title="Crescimento do patrimônio" className="mb-6">
        {chartData.length <= 1 ? (
          <p className="text-sm text-muted-foreground">Defina um período para ver a projeção.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} tickFormatter={m => m % 12 === 0 ? `Ano ${m / 12}` : ''} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={60} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => brl(v)}
                  labelFormatter={(m) => `Mês ${m}`}
                />
                <Legend />
                <Line type="monotone" dataKey="Capital aportado" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Patrimônio bruto" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Patrimônio líquido" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="Valor corrigido" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* === Scenario explanation === */}
      {scenarioText && (
        <Section title="Análise do cenário" className="mb-6">
          <div className="rounded-2xl border bg-muted/30 p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{scenarioText}</p>
            <div className="mt-4 pt-3 border-t flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>Modo: <strong className="text-foreground">{rateMode === 'current' ? 'Atual' : 'Personalizada'}</strong></span>
              {productType === 'cdb_cdi' && <span>CDI usado: <strong className="text-foreground">{pct2(result.cdiUsed)}</strong></span>}
              <span>IPCA usado: <strong className="text-foreground">{pct2(result.ipcaUsed)}</strong></span>
              {productType === 'selic' && <span>Selic usada: <strong className="text-foreground">{pct2(result.selicUsed)}</strong></span>}
            </div>
          </div>
        </Section>
      )}

      {/* === Info dialog === */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>Sobre os indicadores</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Os indicadores econômicos utilizados pelo VAULT são obtidos de bases públicas oficiais.</p>
            <p><strong className="text-foreground">Selic e CDI:</strong> Banco Central do Brasil — Sistema Gerenciador de Séries Temporais (SGS).</p>
            <p><strong className="text-foreground">IPCA:</strong> Instituto Brasileiro de Geografia e Estatística — SIDRA.</p>
            <p>A data exibida corresponde ao período de referência do dado, que pode ser anterior à data atual.</p>
            <p className="text-xs">Consultas realizadas via backend com cache de 24 horas. Em caso de indisponibilidade temporária das fontes, o último valor válido é mantido e marcado como desatualizado.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
