// Especificação das entidades incluídas no backup do V.A.U.L.T.
// Mantida isolada da interface para facilitar a troca de backend no futuro.

export const BACKUP_FORMAT = 'vault-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
export const PAGE_SIZE = 500;
export const IMPORT_CHUNK_SIZE = 100;

// Campos internos de autenticação/ownership: nunca exportados nem importados.
export const INTERNAL_FIELDS = ['created_by_id', 'created_date', 'updated_date', 'id'];

/** @type {Array<{name: string, label: string, fields: string[], required: string[], numbers: string[], booleans: string[], dates: string[], enums: Record<string,string[]>, links: Record<string,string>, json?: string[]}>} */
export const ENTITY_SPECS = [
  {
    name: 'Income',
    label: 'Receitas',
    fields: ['description', 'category', 'amount', 'date', 'recurring', 'notes'],
    required: ['description', 'amount', 'date'],
    numbers: ['amount'],
    booleans: ['recurring'],
    dates: ['date'],
    enums: {},
    links: {},
  },
  {
    name: 'Expense',
    label: 'Despesas',
    fields: [
      'description', 'category', 'amount', 'date', 'payment_method', 'need_type',
      'recurring', 'installment', 'installments_total', 'installment_current',
      'investment_id', 'reserve_id', 'notes',
    ],
    required: ['description', 'amount', 'date'],
    numbers: ['amount', 'installments_total', 'installment_current'],
    booleans: ['recurring', 'installment'],
    dates: ['date'],
    enums: {
      payment_method: ['dinheiro', 'pix', 'débito', 'crédito', 'boleto', 'transferência'],
      need_type: ['necessidade', 'desejo', 'patrimônio', 'investimento'],
    },
    links: { investment_id: 'Investment', reserve_id: 'Reserve' },
  },
  {
    name: 'Category',
    label: 'Categorias',
    fields: ['name', 'type', 'classification', 'color', 'icon', 'status', 'percentage'],
    required: ['name'],
    numbers: ['percentage'],
    booleans: [],
    dates: [],
    enums: {
      type: ['receita', 'despesa', 'reserva'],
      classification: ['necessidade', 'desejo', 'patrimônio'],
      status: ['active', 'inactive'],
    },
    links: {},
  },
  {
    name: 'Bill',
    label: 'Contas a pagar',
    fields: ['description', 'amount', 'due_date', 'status', 'category'],
    required: ['description', 'amount', 'due_date'],
    numbers: ['amount'],
    booleans: [],
    dates: ['due_date'],
    enums: { status: ['pendente', 'pago'] },
    links: {},
  },
  {
    name: 'Debt',
    label: 'Dívidas',
    fields: [
      'creditor', 'start_date', 'original_amount', 'installment_amount', 'installments_total',
      'installment_current', 'interest_rate', 'cet', 'reason',
    ],
    required: ['creditor', 'installment_amount', 'installments_total'],
    numbers: [
      'original_amount', 'installment_amount', 'installments_total',
      'installment_current', 'interest_rate', 'cet',
    ],
    booleans: [],
    dates: ['start_date'],
    enums: {},
    links: {},
  },
  {
    name: 'Goal',
    label: 'Metas',
    fields: ['name', 'category', 'target_amount', 'current_amount', 'deadline', 'where'],
    required: ['name', 'target_amount'],
    numbers: ['target_amount', 'current_amount'],
    booleans: [],
    dates: ['deadline'],
    enums: { category: ['segurança', 'lazer', 'moradia', 'educação', 'aposentadoria', 'outros'] },
    links: {},
  },
  {
    name: 'Reserve',
    label: 'Reservas',
    fields: ['name', 'target_amount', 'current_amount', 'deposit_date', 'deadline', 'notes'],
    required: ['name'],
    numbers: ['target_amount', 'current_amount'],
    booleans: [],
    dates: ['deposit_date', 'deadline'],
    enums: {},
    links: {},
  },
  {
    name: 'ReserveTransaction',
    label: 'Transações de reservas',
    fields: ['reserve_id', 'amount', 'date', 'type', 'notes'],
    required: ['reserve_id', 'amount', 'date', 'type'],
    numbers: ['amount'],
    booleans: [],
    dates: ['date'],
    enums: { type: ['deposit', 'withdrawal'] },
    links: { reserve_id: 'Reserve' },
  },
  {
    name: 'Investment',
    label: 'Investimentos',
    fields: [
      'name', 'type', 'reserve_id', 'applied_amount', 'current_amount', 'institution', 'date',
      'taxa', 'vencimento', 'quantidade', 'preco_medio', 'percentual_cdi', 'notes',
    ],
    required: ['name', 'type'],
    numbers: ['applied_amount', 'current_amount', 'taxa', 'quantidade', 'preco_medio', 'percentual_cdi'],
    booleans: [],
    dates: ['date', 'vencimento'],
    enums: {
      type: ['tesouro_selic', 'acoes', 'etf', 'cdb', 'fundo', 'renda_fixa', 'cripto', 'outros'],
    },
    links: { reserve_id: 'Reserve' },
  },
  {
    name: 'InvestmentTransaction',
    label: 'Transações de investimentos',
    fields: ['investment_id', 'amount', 'date', 'notes'],
    required: ['investment_id', 'amount', 'date'],
    numbers: ['amount'],
    booleans: [],
    dates: ['date'],
    enums: {},
    links: { investment_id: 'Investment' },
  },
  {
    name: 'InvestmentUpdate',
    label: 'Atualizações de investimentos',
    fields: ['investment_id', 'date', 'amount', 'notes'],
    required: ['investment_id', 'date', 'amount'],
    numbers: ['amount'],
    booleans: [],
    dates: ['date'],
    enums: {},
    links: { investment_id: 'Investment' },
  },
  {
    name: 'BudgetPlan',
    label: 'Planos de orçamento',
    fields: [
      'reference_month', 'planned_income', 'planned_necessities',
      'planned_wishes', 'planned_investments', 'notes',
    ],
    required: ['reference_month'],
    numbers: ['planned_income', 'planned_necessities', 'planned_wishes', 'planned_investments'],
    booleans: [],
    dates: ['reference_month'],
    enums: {},
    links: {},
  },
];

// Native backups also preserve the independent app's auxiliary entities.
for (const name of ['MarketIndicator', 'MarketIndicatorHistory']) ENTITY_SPECS.push({
  name, label: name === 'MarketIndicator' ? 'Indicadores salvos' : 'Histórico de indicadores',
  fields: ['indicatorKey', 'name', 'value', 'unit', 'referenceDate', 'referencePeriod', 'source', 'sourceSeries', 'sourceVariable', 'fetchedAt', 'status'],
  required: name === 'MarketIndicator' ? ['indicatorKey', 'name', 'value'] : ['indicatorKey', 'referenceDate', 'value'],
  numbers: ['value'], booleans: [], dates: ['referenceDate', 'fetchedAt'], enums: {}, links: {},
});
ENTITY_SPECS.push({ name: 'Preference', label: 'Preferências da conta', fields: ['key', 'value'], required: ['key'], numbers: [], booleans: [], dates: [], enums: {}, links: {}, json: ['value'] });

export const ENTITY_NAMES = ENTITY_SPECS.map((s) => s.name);

export const SPEC_BY_NAME = ENTITY_SPECS.reduce((acc, spec) => {
  acc[spec.name] = spec;
  return acc;
}, Object.create(null));

// Pais antes dos filhos, para que os vínculos possam ser remapeados na ordem correta.
export const IMPORT_ORDER = [
  'Category',
  'Reserve',
  'Investment',
  'ReserveTransaction',
  'InvestmentTransaction',
  'InvestmentUpdate',
  'Expense',
  'Income',
  'Goal',
  'Debt',
  'Bill',
  'BudgetPlan',
];

// Entidade usada como identificação estável de deduplicação (por usuário).

