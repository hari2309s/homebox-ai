"use client";

import { ConfirmDialog, Input, Select, StaggerItem, StaggerList, SubmitButton, TapButton } from "@homebox-ai/ui";
import { useMemo, useState } from "react";

import { completeReminderAction, createReminderAction, deleteReminderAction, reopenReminderAction } from "./actions";

interface Reminder {
  id: string;
  itemId: string | null;
  itemName: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  assignedToUserId: string | null;
  status: "pending" | "done";
}

interface HouseholdUser {
  userId: string;
  email: string | null;
  isSelf: boolean;
}

interface Item {
  id: string;
  name: string;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function assigneeLabel(userId: string | null, householdUsers: HouseholdUser[]): string {
  if (!userId) return "Unassigned";
  const match = householdUsers.find((person) => person.userId === userId);
  if (!match) return "Someone";
  return match.isSelf ? "Myself" : (match.email ?? "Family member");
}

export function CalendarView({
  reminders,
  householdUsers,
  items,
  currentUserId,
}: {
  reminders: Reminder[];
  householdUsers: HouseholdUser[];
  items: Item[];
  currentUserId: string;
}) {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(today));
  const [error, setError] = useState<string | null>(null);

  const remindersByDate = useMemo(() => {
    const map = new Map<string, Reminder[]>();
    for (const reminder of reminders) {
      const list = map.get(reminder.dueDate) ?? [];
      list.push(reminder);
      map.set(reminder.dueDate, list);
    }
    return map;
  }, [reminders]);

  const monthDays = useMemo(
    () => getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  const selectedReminders = remindersByDate.get(selectedDateKey) ?? [];
  const todayKey = toDateKey(today);
  const monthLabel = visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function changeMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  async function runAction(action: (formData: FormData) => Promise<void>, formData: FormData, fallbackError: string) {
    setError(null);
    try {
      await action(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackError);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="order-2 shrink-0 border-t border-border bg-card p-4 md:p-6">
        <form
          action={async (formData) => {
            await runAction(createReminderAction, formData, "Couldn't add this reminder");
          }}
          className="flex flex-col gap-2 md:mx-auto md:w-full md:max-w-2xl"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input name="title" placeholder="What needs doing" required className="sm:flex-1" />
            <Input name="dueDate" type="date" defaultValue={selectedDateKey} required className="sm:w-40" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select name="itemId" className="sm:flex-1" defaultValue="">
              <option value="">No specific item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select name="assignedToUserId" className="sm:w-48" defaultValue={currentUserId}>
              <option value="">Unassigned</option>
              {householdUsers.map((person) => (
                <option key={person.userId} value={person.userId}>
                  {person.isSelf ? "Myself" : (person.email ?? "Family member")}
                </option>
              ))}
            </Select>
          </div>
          <Input name="description" placeholder="Notes (optional)" />
          <SubmitButton className="self-start">Add reminder</SubmitButton>
          {error && (
            <p role="alert" className="text-sm text-accent-hover">
              {error}
            </p>
          )}
        </form>
      </div>

      <div className="order-1 flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
        <div className="flex items-center justify-between">
          <TapButton
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-ink"
          >
            ‹
          </TapButton>
          <span className="text-base font-bold text-ink">{monthLabel}</span>
          <TapButton
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-ink"
          >
            ›
          </TapButton>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((date) => {
            const dateKey = toDateKey(date);
            const inMonth = date.getMonth() === visibleMonth.getMonth();
            const dayReminders = remindersByDate.get(dateKey) ?? [];
            const isSelected = dateKey === selectedDateKey;
            const isToday = dateKey === todayKey;
            const hasPending = dayReminders.some((r) => r.status === "pending");

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDateKey(dateKey)}
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border text-sm transition-colors duration-150 ${
                  isSelected ? "border-accent bg-accent/10" : "border-transparent hover:bg-surface-soft"
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <span className={isToday ? "font-bold text-accent-hover" : "text-ink"}>{date.getDate()}</span>
                {dayReminders.length > 0 && (
                  <span className={`h-1.5 w-1.5 rounded-full ${hasPending ? "bg-accent" : "bg-muted"}`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-ink">
            {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          {selectedReminders.length === 0 ? (
            <p className="text-sm text-muted">No reminders for this day.</p>
          ) : (
            <StaggerList className="m-0 flex list-none flex-col gap-2 p-0">
              {selectedReminders.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  assignee={assigneeLabel(reminder.assignedToUserId, householdUsers)}
                  onComplete={(formData) => runAction(completeReminderAction, formData, "Couldn't update this reminder")}
                  onReopen={(formData) => runAction(reopenReminderAction, formData, "Couldn't update this reminder")}
                  onDelete={(formData) => runAction(deleteReminderAction, formData, "Couldn't delete this reminder")}
                />
              ))}
            </StaggerList>
          )}
        </div>
      </div>
    </div>
  );
}

function ReminderRow({
  reminder,
  assignee,
  onComplete,
  onReopen,
  onDelete,
}: {
  reminder: Reminder;
  assignee: string;
  onComplete: (formData: FormData) => void;
  onReopen: (formData: FormData) => void;
  onDelete: (formData: FormData) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const done = reminder.status === "done";

  function idFormData() {
    const formData = new FormData();
    formData.set("reminderId", reminder.id);
    return formData;
  }

  return (
    <StaggerItem hover className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className={`font-medium ${done ? "text-muted line-through" : "text-ink"}`}>{reminder.title}</span>
          <span className="text-xs text-muted">
            {reminder.itemName ? `${reminder.itemName} · ` : ""}Assigned to {assignee}
          </span>
          {reminder.description && <span className="text-sm text-body">{reminder.description}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm">
          <TapButton
            type="button"
            onClick={() => (done ? onReopen(idFormData()) : onComplete(idFormData()))}
            className="cursor-pointer border-none bg-transparent font-semibold text-ink"
          >
            {done ? "Reopen" : "Done"}
          </TapButton>
          <TapButton
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="cursor-pointer border-none bg-transparent font-semibold text-accent-hover"
          >
            Delete
          </TapButton>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${reminder.title}"?`}
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete(idFormData());
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </StaggerItem>
  );
}
