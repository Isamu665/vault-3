// Account-scoped permission, deliberately excluded from portable backups.
export const CONSENT_VERSION = 1;
export const consentKey = userId => userId ? `vault:assistant-account-consent:${userId}` : null;
export function hasAssistantConsent(storage, userId) {
  const key = consentKey(userId);
  if (!key) return false;
  try {
    const value = JSON.parse(storage.getItem(key));
    return value?.version === CONSENT_VERSION && value?.granted === true &&
      typeof value.grantedAt === 'string' && Number.isFinite(Date.parse(value.grantedAt));
  } catch { return false; }
}
export function saveAssistantConsent(storage, userId, granted) {
  const key = consentKey(userId);
  if (!key) throw new Error('Entre na sua conta para autorizar o assistente.');
  if (granted) storage.setItem(key, JSON.stringify({ version: CONSENT_VERSION, granted: true, grantedAt: new Date().toISOString() }));
  else storage.removeItem(key);
  if (hasAssistantConsent(storage, userId) !== granted) throw new Error('Não foi possível salvar a permissão neste navegador.');
}
