const RULE = 'rule_50_30_20_config';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function normalizePreferences(preferences) {
  const input = preferences?.localStorage, result = {};
  if (!object(input)) return result;
  if (['dark', 'light'].includes(input.theme)) result.theme = input.theme;
  const cats = input[RULE]?.categories;
  if (Array.isArray(cats) && cats.length > 0 && cats.length <= 20 &&
      new Set(cats.map(c => c?.key)).size === cats.length && cats.every(c => object(c) &&
        typeof c.key === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(c.key) &&
        typeof c.percentage === 'number' && Number.isFinite(c.percentage) && c.percentage >= 0 && c.percentage <= 100 &&
        (c.label === undefined || typeof c.label === 'string' && c.label.length <= 100) &&
        (c.color === undefined || /^#[\da-f]{6}$/i.test(c.color)))) {
    result[RULE] = { categories: cats.map(c => ({ key: c.key, label: c.label || c.key, percentage: c.percentage, color: c.color || '#6366f1' })) };
  }
  return result;
}
export function readPreferences(storage, userId) {
  const localStorage = {};
  try { localStorage[RULE] = JSON.parse(storage.getItem(RULE + ':' + userId)); } catch { /* Optional browser setting. */ }
  try { localStorage.theme = storage.getItem('theme'); } catch { /* Storage may be unavailable. */ }
  return { localStorage: normalizePreferences({ localStorage }) };
}
export function restorePreferences(preferences, storage, userId) {
  const restored = [], errors = [];
  for (const [key, value] of Object.entries(normalizePreferences(preferences))) {
    try {
      storage.setItem(key === RULE ? RULE + ':' + userId : key, typeof value === 'string' ? value : JSON.stringify(value));
      restored.push(key === RULE ? 'Regra de orçamento' : 'Tema');
    } catch { errors.push('Não foi possível salvar ' + key + ' neste navegador.'); }
  }
  return { restored, errors };
}

