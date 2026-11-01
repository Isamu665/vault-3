import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImportPreview({ preview, onConfirm, onCancel, restore, onRestore }) {
  const rows = preview.rows.filter((row) => row.total > 0);
  const blocked = preview.errorCount > 0;
  const nothingNew = preview.totalPending === 0 && !restore;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium break-all">{preview.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {preview.fileSize} · exportado em {preview.exportedAt}
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Entidade</th>
                <th className="text-right px-3 py-2 font-medium">No arquivo</th>
                <th className="text-right px-3 py-2 font-medium">Novos</th>
                <th className="text-right px-3 py-2 font-medium">Já importados</th>
                <th className="text-right px-3 py-2 font-medium">Com erro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-t">
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.total}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{row.pending}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{row.duplicates}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${row.invalid ? 'text-rose-600' : 'text-muted-foreground'}`}>
                    {row.invalid}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">O arquivo não contém registros.</p>
      )}

      {preview.errors.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/60 dark:bg-rose-950/30">
          <p className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4" />
            {preview.errorCount} problema(s) encontrado(s) no arquivo
          </p>
          <ul className="mt-2 space-y-1 text-xs text-rose-700/90 dark:text-rose-200/90 max-h-40 overflow-y-auto">
            {preview.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          {preview.errorsTruncated && (
            <p className="mt-2 text-[11px] text-rose-700/80 dark:text-rose-200/80">
              Mostrando apenas os primeiros {preview.errors.length} problemas.
            </p>
          )}
          <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
            Corrija o arquivo para importar. Nenhum registro é gravado enquanto houver problemas.
          </p>
        </div>
      )}

      {preview.warnings.length > 0 && (
        <details className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">{preview.warnings.length} aviso(s) do arquivo</summary>
          <ul className="mt-2 space-y-1">
            {preview.warnings.slice(0, 20).map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </details>
      )}

      {preview.preferences.available && (<label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={restore} onChange={event => onRestore(event.target.checked)} /><span>Restaurar neste navegador: {preview.preferences.labels.join(', ')}. A regra de orçamento será vinculada à sua conta atual.</span></label>)}

      <div className="rounded-xl border bg-muted/40 p-4 text-sm">
        <p className="font-medium">
          {blocked
            ? 'Importação bloqueada até que o arquivo esteja válido.'
            : nothingNew
              ? 'Nada novo para importar: todos os registros já existem na sua conta.'
              : preview.totalPending === 0 ? 'Somente as preferências selecionadas serão restauradas.' : `Serão adicionados ${preview.totalPending} registro(s) novos à sua conta.`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Apenas inclusões: nenhum registro existente é apagado ou sobrescrito, e os vínculos entre
          reservas, investimentos e lançamentos são recriados.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onConfirm} disabled={blocked || nothingNew} className="gap-2">
          {blocked ? 'Corrija o arquivo para importar' : nothingNew ? 'Nada a importar' : preview.totalPending === 0 ? 'Restaurar preferências' : `Importar ${preview.totalPending} registro(s)`}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Escolher outro arquivo</Button>
      </div>
    </div>
  );
}
