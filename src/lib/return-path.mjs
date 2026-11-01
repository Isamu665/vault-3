const bootstrapParams = [
  'access_token', 'clear_access_token', 'app_id', 'app_base_url',
  'functions_version', 'from_url',
];

// Full-page redirects must retain the repository prefix, unlike Router links.
export function resolveReturnTo(raw, origin, basePath = '/') {
  if (!raw) return basePath;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return basePath;
    const pathname = url.pathname;
    if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\')) {
      return basePath;
    }
    const decoded = decodeURIComponent(pathname);
    if (decoded.startsWith('//') || decoded.includes('\\')) return basePath;
    for (const key of bootstrapParams) url.searchParams.delete(key);
    const path = pathname.startsWith(basePath)
      ? pathname
      : basePath + pathname.slice(1);
    return path + url.search;
  } catch {
    return basePath;
  }
}
