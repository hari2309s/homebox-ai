export type ScanResult = { type: "item"; itemId: string } | { type: "search"; query: string };

const ITEM_PATH = /^\/items\/([0-9a-fA-F-]{36})\/?$/;

/**
 * Interprets a decoded barcode/QR payload. Our own printed item labels
 * encode a same-origin `/items/{uuid}` URL (see items/[id]/label/page.tsx)
 * — scanning one of those jumps straight to that item. Anything else (a
 * product barcode, some other URL, plain text) falls back to searching the
 * inventory for it, in case it matches something already stored (e.g. a
 * serial number copied onto the item).
 */
export function parseScanResult(text: string, origin: string): ScanResult {
  try {
    const url = new URL(text);
    if (url.origin === origin) {
      const match = url.pathname.match(ITEM_PATH);
      if (match?.[1]) return { type: "item", itemId: match[1] };
    }
  } catch {
    // Not a URL — fall through to a plain search.
  }
  return { type: "search", query: text };
}
