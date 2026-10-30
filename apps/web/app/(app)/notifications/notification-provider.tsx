"use client";

import { useNotifications, type NotificationSeedProps } from "./use-notifications";

/**
 * Invisible client component mounted in the app layout that seeds the
 * notification store and fires initial toasts. Server data flows in via
 * props; no client fetch needed.
 */
export function NotificationProvider(props: NotificationSeedProps) {
  useNotifications(props);
  return null;
}
