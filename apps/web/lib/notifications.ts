/**
 * Notification types shared by the toast system (sonner) and the notification
 * centre dropdown. Every notification has a `kind` that determines its icon,
 * colour tone, and default behaviour.
 */

export type NotificationKind =
  | "reminder"
  | "weather"
  | "invite"
  | "suggestion"
  | "warranty"
  | "household"
  | "activity"
  | "info";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  /** Deep link into the app — tapping the notification navigates here. */
  href?: string;
  /** ISO timestamp for chronological sorting. */
  timestamp: string;
  read: boolean;
}

/** Material Symbols icon for each notification kind. */
export const NOTIFICATION_ICON: Record<NotificationKind, string> = {
  reminder: "event_upcoming",
  weather: "partly_cloudy_day",
  invite: "diversity_3",
  suggestion: "auto_fix_high",
  warranty: "verified_user",
  household: "group",
  activity: "inventory_2",
  info: "info",
};

/** Tailwind tone classes for the icon badge background + text. */
export const NOTIFICATION_TONE: Record<NotificationKind, string> = {
  reminder: "bg-warn-soft text-warn",
  weather: "bg-surface-soft text-[#5b7fa6]",
  invite: "bg-selected text-accent",
  suggestion: "bg-selected text-accent",
  warranty: "bg-danger-soft text-danger",
  household: "bg-selected text-accent",
  activity: "bg-surface-soft text-body",
  info: "bg-surface-soft text-body",
};

let _counter = 0;
export function notificationId(): string {
  return `n_${Date.now()}_${++_counter}`;
}
