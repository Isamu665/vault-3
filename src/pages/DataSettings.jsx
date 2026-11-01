import { useState } from 'react';
import { Download, Upload, Database } from 'lucide-react';
import { vault } from '@/api/vaultClient';
import { ENTITIES } from '@/api/record-model.mjs';
import { requireBackend } from '@/api/supabase';
import { useAuth } from '@/lib/AuthContext';
import { prepareImport } from '@/lib/data-transfer.mjs';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/finance/PageHeader';

export default function DataSettings() {
  const { user } = useAuth(), client = useQueryClient();
  const [preview, setPreview] = useState(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const backup = async () => {
    setBusy(true); setError('');
    try {
      const entities = {};
      for (const entity of ENTITIES) entities[entity] = await vault.entities[entity].list();
      const file = { format: 'vault-backup', version: 1, ownerId: user.id, exportedAt: new Date().toISOString(), entities };
      const url = URL.createObjectURL(new Blob([JSON.stringify(file,null,2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'vault-backup-' + new Date().toISOString().slice(0,10) + '.json'; anchor.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const read = async event => {
    setPreview(null); setError(''); setNotice('');
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 10000000) throw new Error('O limite por arquivo é 10 MB.');
      const rows = await prepareImport(JSON.parse(await file.text()), user.id);
      setPreview(rows);
    } catch (e) { setError(e.message); }
  };
  const apply = async () => {
    setBusy(true); setError('');
    try {
      const { data, error } = await requireBackend().rpc('import_vault_records', { payload: preview });
      if (error) throw error;
      setNotice(data + ' registros adicionados. Registros já existentes foram preservados.');
      setPreview(null); await client.invalidateQueries({ queryKey: ['records',user.id] });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="space-y-6"><PageHeader title="Seus dados" subtitle="Exporte, preserve e traga seus registros para o V.A.U.L.T." />
    <section className="rounded-2xl border bg-card p-6 space-y-4"><Database className="text-indigo-400" /><h2 className="text-lg font-semibold">Sua conta</h2><p className="text-sm text-muted-foreground">{user.email}</p><p className="text-sm">Os registros ficam vinculados à sua conta. A regra de orçamento deste navegador é salva separadamente para cada usuário.</p></section>
    <section className="rounded-2xl border bg-card p-6 space-y-4"><h2 className="text-lg font-semibold">Cópia de segurança</h2><p className="text-sm text-muted-foreground">O arquivo contém informações financeiras. Guarde-o em um local privado.</p><Button onClick={backup} disabled={busy} className="gap-2"><Download className="w-4 h-4" />Exportar meus dados</Button></section>
    <section className="rounded-2xl border bg-card p-6 space-y-4"><h2 className="text-lg font-semibold">Importar JSON</h2><p className="text-sm text-muted-foreground">Aceita backups do V.A.U.L.T. ou um objeto com listas como Income, Expense, Reserve e Investment. Inclua os registros vinculados no mesmo arquivo. O aplicativo não acessa o Base44.</p>
      <label className="block text-sm">Selecionar arquivo<input className="block mt-2" type="file" accept=".json,application/json" onChange={read} disabled={busy} /></label>
      {preview && <div className="rounded-xl bg-muted p-4 text-sm"><p>{preview.length} registros encontrados. A importação adiciona os novos registros à conta {user.email}, sem apagar nem sobrescrever os existentes.</p><Button onClick={apply} disabled={busy || !preview.length} className="mt-3 gap-2"><Upload className="w-4 h-4" />Confirmar importação</Button></div>}
    </section>{error && <p role="alert" className="text-destructive">{error}</p>}{notice && <p role="status" className="text-emerald-600">{notice}</p>}
  </div>;
}
