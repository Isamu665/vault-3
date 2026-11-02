import { ENTITY_SPECS, SPEC_BY_NAME, MAX_BACKUP_BYTES } from './schema.mjs';
import { normalizePreferences } from './preferences.mjs';
import { validIncomeSchedule } from '../income-recurrence.mjs';
export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31,30,31,30,31,31,30,31,30,31];
  return day <= days[month - 1] && Number.isFinite(Date.parse(value));
}
export function validateBackup(input) {
  const errors = [], warnings = [], stats = [], entities = Object.create(null);
  let errorCount = 0, total = 0;
  const fail = message => { errorCount++; if (errors.length < 100) errors.push(message); };
  const native = isObject(input) && Object.hasOwn(input, 'entities');
  if (!isObject(input)) fail('O arquivo deve conter um objeto JSON.');
  if (JSON.stringify(input)?.length > MAX_BACKUP_BYTES) fail('O arquivo ultrapassa 8 MB.');
  if (native && (input.format !== 'vault-backup' || input.version !== 1)) fail('Formato ou versão de backup não suportado.');
  if (native && (!validDate(input.exportedAt) || !input.exportedAt.includes('T'))) fail('Data de exportação inválida.');
  if (!native) warnings.push('Formato antigo: listas por entidade, sem metadados de backup.');
  const source = native ? input.entities : input;
  if (!isObject(source)) fail('A seção de entidades deve ser um objeto.');
  else {
    for (const key of Object.keys(source)) if (!Object.hasOwn(SPEC_BY_NAME, key)) fail('Entidade desconhecida: ' + key);
    for (const spec of ENTITY_SPECS) {
      const records = Object.hasOwn(source, spec.name) ? source[spec.name] : [];
      if (!Array.isArray(records)) { fail(spec.label + ': use uma lista.'); continue; }
      total += records.length;
      if (total > 10000) { fail('Limite de 10.000 registros por arquivo.'); break; }
      const seen = new Set(); let invalid = 0;
      entities[spec.name] = records;
      for (const [i, record] of records.entries()) {
        const before = errorCount, at = spec.label + ' #' + (i + 1);
        if (!isObject(record)) { fail(at + ': registro inválido.'); invalid++; continue; }
        if (typeof record.id !== 'string' || !record.id.trim() || record.id.length > 256 || record.id !== record.id.trim()) fail(at + ': ID inválido.');
        if (seen.has(record.id)) fail(at + ': ID repetido.'); seen.add(record.id);
        if (record.legacy_id !== undefined && (typeof record.legacy_id !== 'string' || !record.legacy_id.trim() || record.legacy_id.length > 256)) fail(at + ': identificação de origem inválida.');
        if (spec.name === 'Income' && record.income_schedule != null && !validIncomeSchedule(record.income_schedule)) fail(at + ': recorrência inválida.');
        if (spec.name === 'Income' && !!record.recurrence_source !== !!record.recurrence_due) fail(at + ': origem e data da recorrência devem estar juntas.');
        for (const field of spec.required) if (record[field] == null || record[field] === '' || typeof record[field] === 'string' && !record[field].trim()) fail(at + ': falta ' + field + '.');
        for (const field of spec.fields) {
          const value = record[field]; if (value == null) continue;
          let valid;
          if (spec.numbers.includes(field)) valid = typeof value === 'number' && Number.isFinite(value);
          else if (spec.booleans.includes(field)) valid = typeof value === 'boolean';
          else if (spec.dates.includes(field)) valid = value === '' && !spec.required.includes(field) || validDate(value);
          else if (spec.json?.includes(field)) valid = true;
          else valid = typeof value === 'string' && value.length <= 60000;
          if (!valid) fail(at + ': valor inválido em ' + field + '.');
          if (spec.enums[field] && value !== '' && !spec.enums[field].includes(value)) fail(at + ': opção inválida em ' + field + '.');
        }
        if (new TextEncoder().encode(JSON.stringify(record)).byteLength > 65536) fail(at + ': registro ultrapassa 64 KB.');
        if (errorCount > before) invalid++;
      }
      stats.push({ name: spec.name, label: spec.label, total: records.length, invalid });
    }
  }
  const preferences = { localStorage: normalizePreferences(input?.preferences) };
  if (input?.preferences?.localStorage && Object.keys(input.preferences.localStorage).length !== Object.keys(preferences.localStorage).length) warnings.push('Preferências inválidas ou desconhecidas serão ignoradas.');
  return { errors, warnings, errorCount, stats, entities, total, preferences };
}
