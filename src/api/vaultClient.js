import { requireBackend } from './supabase';
import { ENTITIES, recordData, fromRecord, sortRecords } from './record-model.mjs';

export const DATA_CHANGED = 'vault:data-changed';
function changed(entity) { window.dispatchEvent(new CustomEvent(DATA_CHANGED, { detail: entity })); }
async function owner() {
  const { data, error } = await requireBackend().auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Entre na sua conta para continuar.');
  return data.session.user.id;
}
function unwrap(result) { if (result.error) throw result.error; return result.data; }

function entityClient(entity) {
  const query = (userId) => requireBackend().from('vault_records').select('*').eq('user_id', userId).eq('entity', entity);
  const list = async (sort = '-created_date', limit = Infinity, filter = {}) => {
    const userId = await owner();
    let rows = [], offset = 0;
    // Page through every record before sorting: financial totals must not stop at 1000.
    while (true) {
      let request = query(userId).order('id').range(offset, offset + 499);
      if (Object.keys(filter).length) request = request.contains('data', filter);
      const page = unwrap(await request);
      rows.push(...page.map(fromRecord));
      if (page.length < 500) break;
      offset += 500;
    }
    return sortRecords(rows, sort).slice(0, limit);
  };
  return {
    list,
    filter: (filter, sort, limit) => list(sort, limit, filter),
    async get(id) { return fromRecord(unwrap(await query(await owner()).eq('id', id).single())); },
    async create(input) {
      const row = unwrap(await requireBackend().from('vault_records').insert({ entity, user_id: await owner(), data: recordData(input) }).select().single());
      changed(entity); return fromRecord(row);
    },
    async bulkCreate(inputs) {
      if (!inputs.length) return [];
      const userId = await owner();
      const rows = unwrap(await requireBackend().from('vault_records').insert(inputs.map(data => ({ entity, user_id: userId, data: recordData(data) }))).select());
      changed(entity); return rows.map(fromRecord);
    },
    async update(id, input) {
      const userId = await owner();
      // Merge atomically in SQL, preserving concurrent updates to other fields.
      const row = unwrap(await requireBackend().rpc('patch_vault_record', { record_id: id, record_entity: entity, patch: recordData(input) }).single());
      if (!row || row.user_id !== userId) throw new Error('Registro não encontrado.');
      changed(entity); return fromRecord(row);
    },
    async delete(id) {
      unwrap(await requireBackend().from('vault_records').delete().eq('user_id', await owner()).eq('entity', entity).eq('id', id));
      changed(entity);
    },
    async deleteMany(filter) {
      if (!filter || !Object.keys(filter).length) throw new Error('Informe quais registros deseja excluir.');
      unwrap(await requireBackend().from('vault_records').delete().eq('user_id', await owner()).eq('entity', entity).contains('data', filter));
      changed(entity);
    },
  };
}

export const vault = { entities: Object.fromEntries(ENTITIES.map(name => [name, entityClient(name)])),
  async payBill(id,payment) {
    await owner();
    const result=unwrap(await requireBackend().rpc('pay_bill',{bill_id:id,payment}));
    changed('Bill'); changed('Expense'); changed('Category'); return result;
  },
};

