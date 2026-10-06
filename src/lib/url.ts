/** Prefixes an absolute path (e.g. "/methodology/") with the configured base path, so links still work when the site is served from a subpath (e.g. GitHub Pages' /hospitality-rankings/). Normalizes slashes itself rather than trusting BASE_URL's own trailing slash, which varies. */
export function href(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const clean = path.replace(/^\/+/, "");
  return clean ? `${base}/${clean}` : `${base}/`;
}
