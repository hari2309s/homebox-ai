/**
 * In-memory notification store for the current session. Notifications are
 * ephemeral (not persisted to DB) — they're generated from server state each
 * time the app shell loads, and new ones arrive via the `useNotifications`
 * hook. The store is a simple pub/sub so the bell badge, dropdown, and toast
 * layer all stay in sync.
 *
 * Read-state is backed by localStorage so marking-all-read survives a refresh.
 */

import type { AppNotification } from "../../../lib/notifications";

type Listener = () => void;

let _notifications: AppNotification[] = [];
const _listeners = new Set<Listener>();

// ── Persistent read ids (localStorage) ──────────────────────────────────

const READ_KEY = "homebox-read-notifications";

let _readIds: Set<string> | null = null;

function getReadIds(): Set<string> {
  if (_readIds) return _readIds;
  try {
    const json = typeof window !== "undefined" ? localStorage.getItem(READ_KEY) : null;
    _readIds = json ? new Set(JSON.parse(json) as string[]) : new Set();
  } catch {
    _readIds = new Set();
  }
  return _readIds;
}

function persistReadIds() {
  try {
    // Cap at 200 entries to avoid localStorage bloat.
    const arr = [...getReadIds()].slice(-200);
    localStorage.setItem(READ_KEY, JSON.stringify(arr));
  } catch { /* quota / SSR */ }
}

// ── Store ───────────────────────────────────────────────────────────────

function emit() {
  for (const fn of _listeners) fn();
}

export function getNotifications(): AppNotification[] {
  return _notifications;
}

export function getUnreadCount(): number {
  return _notifications.filter((n) => !n.read).length;
}

/**
 * Add a notification. Returns `true` if it was genuinely new **and** unread
 * (i.e. the caller should fire a toast). Returns `false` for duplicates or
 * previously-read ids.
 */
export function addNotification(n: AppNotification): boolean {
  if (_notifications.some((existing) => existing.id === n.id)) return false;
  const wasRead = getReadIds().has(n.id);
  const notification = wasRead ? { ...n, read: true } : n;
  _notifications = [notification, ..._notifications].slice(0, 50);
  emit();
  return !wasRead;
}

export function markRead(id: string) {
  _notifications = _notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  getReadIds().add(id);
  persistReadIds();
  emit();
}

export function markAllRead() {
  const readIds = getReadIds();
  _notifications = _notifications.map((n) => {
    readIds.add(n.id);
    return { ...n, read: true };
  });
  persistReadIds();
  emit();
}

export function clearAll() {
  const readIds = getReadIds();
  for (const n of _notifications) readIds.add(n.id);
  persistReadIds();
  _notifications = [];
  emit();
}

export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
