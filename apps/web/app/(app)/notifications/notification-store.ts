/**
 * In-memory notification store for the current session. Notifications are
 * ephemeral (not persisted to DB) — they're generated from server state each
 * time the app shell loads, and new ones arrive via the `useNotifications`
 * hook. The store is a simple pub/sub so the bell badge, dropdown, and toast
 * layer all stay in sync.
 */

import type { AppNotification } from "../../../lib/notifications";

type Listener = () => void;

let _notifications: AppNotification[] = [];
const _listeners = new Set<Listener>();

function emit() {
  for (const fn of _listeners) fn();
}

export function getNotifications(): AppNotification[] {
  return _notifications;
}

export function getUnreadCount(): number {
  return _notifications.filter((n) => !n.read).length;
}

export function addNotification(n: AppNotification) {
  // Deduplicate by id.
  if (_notifications.some((existing) => existing.id === n.id)) return;
  _notifications = [n, ..._notifications].slice(0, 50);
  emit();
}

export function markRead(id: string) {
  _notifications = _notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
}

export function markAllRead() {
  _notifications = _notifications.map((n) => ({ ...n, read: true }));
  emit();
}

export function clearAll() {
  _notifications = [];
  emit();
}

export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
