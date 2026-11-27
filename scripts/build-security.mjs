import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const knownSecretPatterns = [
  /\bsb_secret_[A-Za-z0-9_-]{12,}\b/,
  /\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,})\b/,
  /\b(?:AIza[A-Za-z0-9_-]{35}|GOCSPX-[A-Za-z0-9_-]{18,}|gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{25,})\b/,
  /\b(?:re_[A-Za-z0-9_]{20,}|xkeysib-[A-Za-z0-9_-]{24,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b/,
  /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/,
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@]+:[^\s@]+@/,
];

function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload?.role;
  } catch {
    return undefined;
  }
}

export function validatePublicSupabaseConfig(url, key) {
  if (key && !/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) {
    const legacyJwt = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    if (!legacyJwt.test(key) || jwtRole(key) !== 'anon') {
      throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY deve ser uma chave publishable ou uma chave anon legada.');
    }
  }

  if (!url) return;
  if (URL.canParse(url)) {
    const parsed = new URL(url);
    if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password
      && !parsed.search && !parsed.hash) return;
  }
  throw new Error('VITE_SUPABASE_URL deve ser uma URL HTTP(S) sem credenciais, consulta ou fragmento.');
}

function containsSecret(text) {
  if (knownSecretPatterns.some(pattern => pattern.test(text))) return true;
  return Array.from(text.matchAll(jwtPattern)).some(([token]) => jwtRole(token) !== 'anon');
}

export async function assertPublicArtifact(root, directory = root) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const artifactPath = relative(root, path);
    if (entry.isDirectory()) {
      await assertPublicArtifact(root, path);
      continue;
    }

    if (!entry.isFile() || /^(?:\.env(?:\..*)?|supabasepswd\.txt)$/i.test(entry.name)
      || /\.(?:pem|pfx|p12|key)$/i.test(entry.name)) {
      throw new Error(`Arquivo não permitido no artefato público: ${artifactPath}`);
    }

    const data = await readFile(path);
    if (containsSecret(data.toString('utf8')) || containsSecret(data.toString('utf16le'))) {
      throw new Error(`Possível credencial no artefato público: ${artifactPath}`);
    }
  }
}
