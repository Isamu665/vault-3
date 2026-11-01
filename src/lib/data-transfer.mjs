// Compatible with Base44 vault-backup v1, without its SDK or import ledger.
import { ENTITY_SPECS, MAX_BACKUP_BYTES } from './dataTransfer/schema.mjs';
import { validateBackup } from './dataTransfer/validate.mjs';
export { validateBackup } from './dataTransfer/validate.mjs';
export { MAX_BACKUP_BYTES } from './dataTransfer/schema.mjs';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function stableId(text) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const bytes = [...new Uint8Array(buffer)].slice(0,16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.map(value => value.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
export function backupRecord(record, spec) {
  const result = { id: record.id, legacy_id: record.legacy_id || record.id };
  for (const field of spec.fields) if (record[field] !== undefined && record[field] !== null) result[field] = record[field];
  return result;
}
/** @param {(entity: string) => Promise<any[]>} list
 * @param {string} ownerId
 * @param {object} preferences
 * @param {(progress: {done: number, total: number, label: string}) => void} [onProgress] */
export async function buildBackup(list, ownerId, preferences, onProgress = (_progress) => {}) {
  const entities = {};
  for (const [index, spec] of ENTITY_SPECS.entries()) {
    entities[spec.name] = (await list(spec.name)).map(record => backupRecord(record, spec));
    onProgress({ done: index + 1, total: ENTITY_SPECS.length, label: spec.label });
  }
  const result = { format: 'vault-backup', version: 1, ownerId, exportedAt: new Date().toISOString(), entities, preferences };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_BACKUP_BYTES || Object.values(entities).reduce((n, records) => n + records.length, 0) > 10000) throw new Error('Esta conta ultrapassa o limite de backup (8 MB / 10.000 registros). Nenhum arquivo parcial foi gerado.');
  return result;
}
export async function prepareImport(input, ownerId, existing = []) {
  const validation = validateBackup(input);
  if (validation.errorCount) throw new Error(validation.errors[0]);
  const rows = [], mapping = new Map(), identities = new Set();
  const owned = new Map(existing.map(row => [row.entity + ':' + (row.legacy_id || row.id), row.id]));
  for (const spec of ENTITY_SPECS) for (const record of validation.entities[spec.name] || []) {
    const originalId = record.legacy_id || record.id, identity = spec.name + ':' + originalId;
    if (identities.has(identity)) throw new Error('Identificação de origem repetida em ' + spec.label + '.');
    identities.add(identity);
    const id = owned.get(identity) || (input.format === 'vault-backup' && input.ownerId === ownerId && UUID.test(record.id)
      ? record.id.toLowerCase() : await stableId(ownerId + ':' + spec.name + ':' + originalId));
    const data = backupRecord(record, spec); delete data.id;
    mapping.set(spec.name + ':' + record.id, id);
    rows.push({ id, entity: spec.name, data });
  }
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Há IDs repetidos no arquivo.');
  const existingIds = new Set(existing.map(row => row.entity + ':' + row.id));
  for (const row of rows) {
    const spec = ENTITY_SPECS.find(s => s.name === row.entity);
    for (const [field, entity] of Object.entries(spec.links)) if (row.data[field]) {
      const original = row.data[field];
      const id = mapping.get(entity + ':' + original) || owned.get(entity + ':' + original) ||
        (existingIds.has(entity + ':' + original) ? original : undefined);
      if (!id) throw new Error('Vínculo ausente em ' + spec.label + ': inclua também ' + entity + ' no arquivo. Nenhum vínculo será removido.');
      row.data[field] = id;
    }
  }
  return rows;
}
