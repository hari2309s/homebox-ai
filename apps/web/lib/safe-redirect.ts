// Query-param controlled, so it must be validated before use — reject
// anything that isn't a same-origin relative path (blocks the "//evil.com"
// protocol-relative-URL open-redirect trick).
export function safeRedirect(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/items";
  return path;
}
