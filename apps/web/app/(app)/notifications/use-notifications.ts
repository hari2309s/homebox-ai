"use client";

import { useEffect, useRef } from "react";

import { notificationId, type AppNotification, type NotificationKind } from "../../../lib/notifications";
import type { WeatherAlert } from "../../../lib/weather";
import { addNotification } from "./notification-store";
import { notify } from "./toast";

// ---------------------------------------------------------------------------
// Seed types — passed from the server layout
// ---------------------------------------------------------------------------

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

export interface WarrantySeed {
  id: string;
  name: string;
  warrantyExpires: string | null;
}

export interface NotificationSeedProps {
  dueReminders: ReminderSeed[];
  weatherAlerts: WeatherAlert[];
  invite: InviteSeed | null;
  expiringWarranties: WarrantySeed[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dueLabel(dateKey: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateKey <= today) return "overdue";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateKey === tomorrow.toISOString().slice(0, 10)) return "due tomorrow";
  return `due ${dateKey}`;
}

function warrantyLabel(dateKey: string | null): string {
  if (!dateKey) return "expiring soon";
  const today = new Date().toISOString().slice(0, 10);
  if (dateKey <= today) return "expired";
  return `expires ${dateKey}`;
}

// ---------------------------------------------------------------------------
// Seed hook — runs once per mount
// ---------------------------------------------------------------------------

export function useNotifications({ dueReminders, weatherAlerts, invite, expiringWarranties }: NotificationSeedProps) {
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
      setTimeout(() => notify({ title: n.title, body: n.body, kind: "invite", href: invite.href, duration: 8000 }), toastDelay);
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
      setTimeout(() => notify({ title: n.title, body: n.body, kind: "reminder", href: "/calendar" }), toastDelay);
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

    // --- Warranty expiry ---
    for (const w of expiringWarranties.slice(0, 5)) {
      const n: AppNotification = {
        id: `warranty:${w.id}`,
        kind: "warranty",
        title: `${w.name} warranty ${warrantyLabel(w.warrantyExpires)}`,
        body: "Check if you need to extend or make a claim",
        href: `/items/${w.id}`,
        timestamp: now,
        read: false,
      };
      addNotification(n);
      setTimeout(() => notify({ title: n.title, body: n.body, kind: "warranty", href: n.href, duration: 6000 }), toastDelay);
      toastDelay += 300;
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
      setTimeout(() => notify({ title: n.title, body: n.body, kind: "weather", href: "/maintenance", duration: 6000 }), toastDelay);
      toastDelay += 350;
    }
  }, [dueReminders, weatherAlerts, invite, expiringWarranties]);
}

// ---------------------------------------------------------------------------
// One-shot toast helpers — called from client components after actions
// ---------------------------------------------------------------------------

function quickToast(kind: NotificationKind, title: string, body?: string, href?: string) {
  const n: AppNotification = {
    id: notificationId(),
    kind,
    title,
    body,
    href,
    timestamp: new Date().toISOString(),
    read: false,
  };
  addNotification(n);
  notify({ title, body, kind, href });
}

// Maintenance suggestions
export function toastSuggestionAccepted(title: string) {
  quickToast("suggestion", "Reminder created", title, "/calendar");
}

// Item CRUD
export function toastItemCreated(name: string) {
  quickToast("activity", `${name} added`, undefined, "/items");
}
export function toastItemUpdated(name: string) {
  quickToast("activity", `${name} updated`);
}
export function toastItemDeleted(name: string) {
  quickToast("activity", `${name} deleted`);
}

// Item moved on plan
export function toastItemMoved(name: string, placeName?: string) {
  quickToast("activity", `${name} moved`, placeName ? `Now in ${placeName}` : undefined);
}

// Maintenance entries
export function toastMaintenanceLogged(entryName: string) {
  quickToast("activity", "Maintenance logged", entryName);
}

// Locations
export function toastLocationCreated(name: string) {
  quickToast("activity", `${name} added`, undefined, "/locations");
}
export function toastLocationUpdated(name: string) {
  quickToast("activity", `${name} updated`);
}
export function toastLocationDeleted(name: string) {
  quickToast("activity", `${name} removed`);
}

// Labels
export function toastLabelCreated(name: string) {
  quickToast("activity", `Label "${name}" created`, undefined, "/labels");
}
export function toastLabelUpdated(name: string) {
  quickToast("activity", `Label "${name}" updated`);
}
export function toastLabelDeleted(name: string) {
  quickToast("activity", `Label "${name}" removed`);
}

// Household
export function toastMemberJoined(name: string) {
  quickToast("household", `${name} joined your household`);
}
export function toastMemberRemoved(name: string) {
  quickToast("household", `${name} was removed from the household`);
}
export function toastLeftHousehold() {
  quickToast("household", "You left the household");
}

// Reminders
export function toastReminderCreated(title: string) {
  quickToast("reminder", "Reminder created", title, "/calendar");
}
export function toastReminderCompleted(title: string) {
  quickToast("reminder", "Marked done", title, "/calendar");
}
export function toastReminderReopened(title: string) {
  quickToast("reminder", "Reopened", title, "/calendar");
}

// Barcode scan
export function toastScanResult(text: string, found: boolean) {
  quickToast("info", found ? "Item found" : "Searching", text);
}

// Onboarding
export function toastOnboardingComplete() {
  quickToast("info", "You're all set!", "Your home is ready to use");
}
