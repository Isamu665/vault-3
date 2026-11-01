import { resolveReturnTo } from './return-path.mjs';

export function safeReturnTo() {
  return resolveReturnTo(
    new URLSearchParams(window.location.search).get('returnTo'),
    window.location.origin,
    import.meta.env.BASE_URL,
  );
}
