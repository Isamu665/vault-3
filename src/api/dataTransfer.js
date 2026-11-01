import { vault } from './vaultClient';
import { requireBackend } from './supabase';
import { ENTITY_SPECS } from '@/lib/dataTransfer/schema.mjs';
export async function checkAccount(expectedId) {
  const { data, error } = await requireBackend().auth.getUser();
  if (error || data.user?.id !== expectedId) throw new Error('A sessão mudou. Entre novamente e selecione o arquivo.');
}
export async function ownedRecords(userId) {
  await checkAccount(userId);
  const rows = [];
  for (const spec of ENTITY_SPECS) for (const record of await vault.entities[spec.name].list()) rows.push({ ...record, entity: spec.name });
  await checkAccount(userId);
  return rows;
}
export async function importRecords(payload, userId) {
  await checkAccount(userId);
  const { data, error } = await requireBackend().rpc('import_vault_backup', { payload, expected_user: userId });
  if (error) throw new Error('Importação não confirmada: ' + error.message + '. Você pode tentar novamente com o mesmo arquivo; os IDs impedem duplicação.');
  return data;
}
