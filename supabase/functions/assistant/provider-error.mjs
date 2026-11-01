// Never return/log the provider's raw message: it can contain credentials or request data.
export function providerFailure(status, payload = {}) {
  const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];
  const reasons = details.map(d => d?.reason).filter(r => typeof r === 'string' && /^[A-Z_]{1,80}$/.test(r));
  const diagnostic = { providerStatus: status, providerCode: String(payload?.error?.status || '').replace(/[^A-Z_]/g, '').slice(0,80), reasons };
  const error = status === 429 ? 'A cota do Gemini neste projeto Google foi atingida ou não está disponível. Confira os limites no Google AI Studio.'
    : status === 401 || reasons.includes('API_KEY_INVALID') ? 'A chave do Gemini é inválida. Atualize GEMINI_API_KEY nos Secrets do Supabase.'
    : status === 403 ? 'O Google negou acesso à IA. Confira a chave, as restrições da API e a disponibilidade do projeto no Google AI Studio.'
    : status === 404 ? 'O modelo Gemini configurado não está disponível para este projeto. Atualize GEMINI_MODEL no Supabase.'
    : status === 400 ? 'O Google recusou a configuração da IA. Confira o modelo e a chave no Google AI Studio.'
    : 'O Gemini está temporariamente indisponível. Tente novamente em alguns instantes.';
  return { error, diagnostic };
}

