import { useRef, useState } from 'react';
import { Download, Upload, Database, CheckCircle2 } from 'lucide-react';
import { vault } from '@/api/vaultClient';
import { checkAccount, ownedRecords, importRecords } from '@/api/dataTransfer';
import { useAuth } from '@/lib/AuthContext';
import { prepareImport, validateBackup, buildBackup, MAX_BACKUP_BYTES } from '@/lib/data-transfer.mjs';
import { readPreferences, restorePreferences } from '@/lib/dataTransfer/preferences.mjs';
import { SPEC_BY_NAME } from '@/lib/dataTransfer/schema.mjs';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/finance/PageHeader';
import ImportPreview from '@/components/data/ImportPreview';

export default function DataSettings() {
  const { user } = useAuth(), client = useQueryClient(), input = useRef(null);
  const [preview, setPreview] = useState(null), [busy, setBusy] = useState(false), [progress, setProgress] = useState('');
  const [notice, setNotice] = useState(''), [error, setError] = useState(''), [restore, setRestore] = useState(false), [summary, setSummary] = useState(null);
  const backup = async () => {
    setBusy(true); setError(''); setNotice(''); setProgress('Lendo seus dados…');
    try {
      await checkAccount(user.id);
      const file = await buildBackup(entity => vault.entities[entity].list(), user.id, readPreferences(localStorage, user.id), p => setProgress(p.label + ' · ' + p.done + '/' + p.total));
      await checkAccount(user.id);
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'vault-backup-' + new Date().toISOString().slice(0,10) + '.json';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(Object.values(file.entities).reduce((n, rows) => n + rows.length, 0) + ' registros exportados. Guarde o arquivo em local privado.');
    } catch (e) { setError(e.message); } finally { setBusy(false); setProgress(''); }
  };
  const reset = () => { setPreview(null); setSummary(null); setRestore(false); setError(''); if (input.current) input.current.value = ''; };
  const read = async event => {
    const file = event.target.files[0]; reset(); setNotice(''); if (!file) return;
    setBusy(true); setProgress('Validando arquivo…');
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('O limite por arquivo é 8 MB.');
      let parsed; try { parsed = JSON.parse(await file.text()); } catch { throw new Error('JSON inválido. Selecione o arquivo original exportado pelo aplicativo.'); }
      const validation = validateBackup(parsed);
      let payload = [], existing = [];
      if (!validation.errorCount) {
        setProgress('Conferindo registros existentes…'); existing = await ownedRecords(user.id);
        try { payload = await prepareImport(parsed, user.id, existing); }
        catch (e) { validation.errors.push(e.message); validation.errorCount++; }
      }
      const existingIds = new Set(existing.map(r => r.entity + ':' + r.id));
      const rows = validation.stats.map(row => ({ ...row, duplicates: payload.filter(p => p.entity === row.name && existingIds.has(p.entity + ':' + p.id)).length,
        pending: payload.filter(p => p.entity === row.name && !existingIds.has(p.entity + ':' + p.id)).length }));
      const prefs = Object.keys(validation.preferences.localStorage);
      setPreview({ ...validation, payload, rows, fileName: file.name, fileSize: (file.size / 1024).toFixed(1) + ' KB',
        exportedAt: parsed.exportedAt || 'data não informada (formato antigo)', totalPending: rows.reduce((n, row) => n + row.pending, 0),
        errorsTruncated: validation.errorCount > validation.errors.length,
        preferences: { available: prefs.length > 0, labels: prefs.map(key => key === 'theme' ? 'Tema' : 'Regra de orçamento') }, rawPreferences: validation.preferences });
    } catch (e) { setError(e.message); } finally { setBusy(false); setProgress(''); }
  };
  const apply = async () => {
    if (!preview || preview.errorCount) return;
    setBusy(true); setError(''); setProgress('Importando com segurança…');
    try {
      const result = await importRecords(preview.payload, user.id);
      await checkAccount(user.id);
      const prefs = restore ? restorePreferences(preview.rawPreferences, localStorage, user.id) : { restored: [], errors: [] };
      setSummary({ ...result, prefs }); setPreview(null);
      await client.invalidateQueries({ queryKey: ['records', user.id] });
    } catch (e) { setError(e.message); } finally { setBusy(false); setProgress(''); }
  };
  return <div className="space-y-6"><PageHeader title="Importar e exportar dados" subtitle="Leve suas finanças com você e preserve uma cópia de segurança." />
    <section className="rounded-2xl border bg-card p-6 space-y-3"><Database className="text-indigo-400" /><h2 className="text-lg font-semibold">Sua conta</h2><p className="text-sm break-all">{user.email}</p><p className="text-sm text-muted-foreground">Os dados serão adicionados somente a esta conta. Senhas, sessões e credenciais não são transferidas.</p></section>
    <section className="rounded-2xl border bg-card p-6 space-y-4"><h2 className="text-lg font-semibold">Exportar meus dados</h2><p className="text-sm text-muted-foreground">Inclui receitas, despesas, reservas, investimentos e seus vínculos, além das preferências disponíveis neste navegador. O JSON contém informações financeiras; guarde-o em local privado.</p><Button onClick={backup} disabled={busy} className="gap-2"><Download className="w-4 h-4" />Exportar JSON</Button></section>
    <section className="rounded-2xl border bg-card p-6 space-y-4"><h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="w-5 h-5" />Importar dados</h2><p className="text-sm text-muted-foreground">Aceita o backup V.A.U.L.T. v1 exportado pelo Base44 ou por este aplicativo e as listas JSON antigas. Limite: 8 MB e 10.000 registros. A prévia não grava dados.</p>
      {!summary && <label className="block text-sm">Selecionar arquivo JSON<input ref={input} className="block mt-2 max-w-full" type="file" accept=".json,application/json" onChange={read} disabled={busy} /></label>}
      {preview && !busy && <ImportPreview preview={preview} onConfirm={apply} onCancel={reset} restore={restore} onRestore={setRestore} />}
      {summary && <div className="space-y-3" role="status"><p className="font-medium flex items-center gap-2 text-emerald-600"><CheckCircle2 className="w-5 h-5" />{summary.addedTotal} registro(s) adicionado(s)</p><p className="text-sm text-muted-foreground">{summary.duplicatesTotal} registro(s) já existentes foram preservados. Nenhum registro foi apagado ou sobrescrito.</p>
        <ul className="text-sm">{Object.entries(summary.added).filter(([, n]) => n > 0).map(([entity, n]) => <li key={entity}>{SPEC_BY_NAME[entity]?.label || entity}: {n}</li>)}</ul>
        {summary.prefs.restored.length > 0 && <p className="text-sm">Restaurado neste navegador: {summary.prefs.restored.join(', ')}. Recarregue para aplicar.</p>}
        {summary.prefs.errors.map(message => <p key={message} role="alert" className="text-destructive text-sm">{message}</p>)}
        <Button variant="outline" onClick={reset}>Importar outro arquivo</Button>{summary.prefs.restored.length > 0 && <Button variant="ghost" onClick={() => window.location.reload()}>Recarregar aplicativo</Button>}</div>}
    </section>{busy && <p role="status" className="text-sm text-muted-foreground">{progress}</p>}{error && <p role="alert" className="text-destructive break-words">{error}</p>}{notice && <p role="status" className="text-emerald-600">{notice}</p>}
  </div>;
}
