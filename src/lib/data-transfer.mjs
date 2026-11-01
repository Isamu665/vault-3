import { ENTITIES, recordData } from '../api/record-model.mjs';
const links = { reserve_id: 'Reserve', investment_id: 'Investment' };
async function stableId(text) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const bytes = [...new Uint8Array(buffer)].slice(0,16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.map(value => value.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
export async function prepareImport(input, ownerId) {
  const entities = input?.entities || input;
  if (!entities || typeof entities !== 'object' || Array.isArray(entities)) throw new Error('Use um JSON com listas por entidade.');
  const rows = [], mapping = new Map();
  for (const [entity, records] of Object.entries(entities)) {
    if (!ENTITIES.includes(entity)) throw new Error('Entidade desconhecida: ' + entity);
    if (!Array.isArray(records)) throw new Error('Cada entidade deve ser uma lista.');
    for (const record of records) {
      const data = recordData(record);
      const originalId = record.legacy_id || record.id;
      if (!originalId) throw new Error('Cada registro importado precisa ter um id estável.');
      const id = input.format === 'vault-backup' && input.ownerId === ownerId && /^[0-9a-f-]{36}$/i.test(record.id)
        ? record.id : await stableId(ownerId + ':' + entity + ':' + originalId);
      mapping.set(entity + ':' + record.id, id);
      data.legacy_id = String(originalId);
      rows.push({ id, entity, data });
    }
  }
  if (rows.length > 10000) throw new Error('Importe no máximo 10.000 registros por arquivo.');
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Há IDs repetidos no arquivo.');
  for (const row of rows) for (const [field, entity] of Object.entries(links)) {
    if (row.data[field]) {
      const id = mapping.get(entity + ':' + row.data[field]);
      if (!id) throw new Error('Vínculo ausente: inclua também ' + entity + ' no arquivo.');
      row.data[field] = id;
    }
  }
  return rows;
}
