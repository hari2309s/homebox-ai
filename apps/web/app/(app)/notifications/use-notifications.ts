"use client";

import { useEffect, useRef } from "react";

import { notificationId, type AppNotification } from "../../../lib/notifications";
import type { WeatherAlert } from "../../../lib/weather";
import { addNotification } from "./notification-store";
import { notify } from "./toast";

export interface ReminderSeed {
  id: string;
  title: string;
  itemName: string | null;
  dueDate: string;
  status: string;
}

export interface InviteSeed {
  from: string;
  relationship: string | null;
  href: string;
}

export interface NotificationSeedProps {
  /** Reminders due within the next week. */
  dueReminders: ReminderSeed[];
  /** Weather alerts for the home location. */
  weatherAlerts: WeatherAlert[];
  /** Pending household invite (if any). */
  invite: InviteSeed | null;
}

function dueLabel(dateKey: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateKey <= today) return "overdue";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateKey === tomorrow.toISOString().slice(0, 10)) return "due tomorrow";
  return `due ${dateKey}`;
}

/**
 * Seeds the notification store from server-rendered data on first mount, and
 * fires sonner toasts for anything urgent. Only runs once per mount (or when
 * the seed data identity changes).
 */
export function useNotifications({ dueReminders, weatherAlerts, invite }: NotificationSeedProps) {
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    let toastDelay = 0;

    // --- Pending invite ---
    if (invite) {
      const n: AppNotification = {
        id: `invite:${invite.href}`,
        kind: "invite",
        title: `${invite.from} invited you`,
        body: invite.relationship ? `Join as their ${invite.relationship.toLowerCase()}` : "Join their household",
        href: invite.href,
        timestamp: now,
        read: false,
      };
      addNotification(n);
      setTimeout(
        () =>
          notify({
            title: n.title,
            body: n.body,
            kind: "invite",
            href: invite.href,
            duration: 8000,
          }),
        toastDelay,
      );
      toastDelay += 400;
    }

    // --- Overdue and due-today reminders ---
    const urgent = dueReminders.filter((r) => r.status === "pending" && r.dueDate <= today);
    for (const r of urgent.slice(0, 5)) {
      const n: AppNotification = {
        id: `reminder:${r.id}`,
        kind: "reminder",
        title: r.title,
        body: r.itemName ? `${r.itemName} · ${dueLabel(r.dueDate)}` : dueLabel(r.dueDate),
        href: "/calendar",
        timestamp: now,
        read: false,
      };
      addNotification(n);
      setTimeout(
        () =>
          notify({
            title: n.title,
            body: n.body,
            kind: "reminder",
            href: "/calendar",
          }),
        toastDelay,
      );
      toastDelay += 300;
    }

    // Rest of due-soon reminders go to the centre but don't toast.
    const upcoming = dueReminders.filter((r) => r.status === "pending" && r.dueDate > today);
    for (const r of upcoming.slice(0, 10)) {
      addNotification({
        id: `reminder:${r.id}`,
        kind: "reminder",
        title: r.title,
        body: r.itemName ? `${r.itemName} · ${dueLabel(r.dueDate)}` : dueLabel(r.dueDate),
        href: "/calendar",
        timestamp: now,
        read: true,
      });
    }

    // --- Weather alerts ---
    for (const alert of weatherAlerts.slice(0, 3)) {
      const n: AppNotification = {
        id: `weather:${alert.kind}:${alert.date}`,
        kind: "weather",
        title: alert.title,
        body: alert.tip,
        href: "/maintenance",
        timestamp: now,
        read: false,
      };
      addNotification(n);
      setTimeout(
        () =>
          notify({
            title: n.title,
            body: n.body,
            kind: "weather",
            href: "/maintenance",
            duration: 6000,
          }),
        toastDelay,
      );
      toastDelay += 350;
    }
  }, [dueReminders, weatherAlerts, invite]);
}

/** Fire a one-off toast when a suggestion is accepted (not seed-based). */
export function toastSuggestionAccepted(title: string) {
  const n: AppNotification = {
    id: notificationId(),
    kind: "suggestion",
    title: "Reminder created",
    body: title,
    href: "/calendar",
    timestamp: new Date().toISOString(),
    read: false,
  };
  addNotification(n);
  notify({ title: n.title, body: n.body, kind: "suggestion", href: "/calendar" });
}
