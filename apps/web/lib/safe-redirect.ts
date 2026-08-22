// Query-param controlled, so it must be validated before use — reject
// anything that isn't a same-origin relative path. Resolving against a fixed
// placeholder base and checking the resulting origin (rather than just
// blocklisting a leading "//") catches every equivalent trick a URL parser
// would treat as host-changing, including "/\evil.com" — browsers treat a
// backslash the same as a forward slash in a special-scheme URL's path, so a
// plain `startsWith("//")` check alone lets that one through.
export function safeRedirect(path: string | null): string {
  if (!path || !path.startsWith("/")) return "/items";
  try {
    const url = new URL(path, "http://homebox-ai.internal");
    if (url.origin !== "http://homebox-ai.internal") return "/items";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/items";
  }
}
