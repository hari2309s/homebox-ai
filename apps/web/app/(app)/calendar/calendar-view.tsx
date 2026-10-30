"use client";

import { ConfirmDialog, Input, Select, SubmitButton, TapButton } from "@homebox-ai/ui";
import { useMemo, useState } from "react";

import { householdUserLabel, type HouseholdUser } from "../../../lib/household";
import { toastReminderCompleted, toastReminderReopened } from "../notifications/use-notifications";
import {
  Reminder,
  Item,
  WEEKDAY_LABELS,
  UNASSIGNED_COLOR,
  colorForAssignee,
  toDateKey,
  getMonthGrid,
  assigneeLabel,
  assigneeInitial,
  seasonLabel,
} from "./calendar-utils";
import { CrudShell } from "../crud-shell";
import { completeReminderAction, createReminderAction, deleteReminderAction, reopenReminderAction } from "./actions";

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

  const assigneeColorsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [dateKey, dayReminders] of remindersByDate) {
      map.set(dateKey, [...new Set(dayReminders.map((r) => r.assignedToUserId))].map(colorForAssignee));
    }
    return map;
  }, [remindersByDate]);

  const monthDays = useMemo(() => getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()), [visibleMonth]);

  const selectedReminders = remindersByDate.get(selectedDateKey) ?? [];
  const todayKey = toDateKey(today);
  const monthLabel = visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function changeMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  async function runAction(action: (formData: FormData) => Promise<void>, formData: FormData, fallbackError: string, onSuccess?: () => void) {
    setError(null);
    try {
      await action(formData);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackError);
    }
  }

  return (
    <CrudShell
      toggleLabel="Add reminder"
      formAction={createReminderAction}
      formFields={
        <>
          <div className="flex flex-col gap-[5px]">
            <span className="text-xs font-semibold text-body">Title</span>
            <Input name="title" placeholder="What needs doing" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-[5px]">
              <span className="text-xs font-semibold text-body">Date</span>
              <Input name="dueDate" type="date" defaultValue={selectedDateKey} required />
            </div>
            <div className="flex flex-col gap-[5px]">
              <span className="text-xs font-semibold text-body">Assignee</span>
              <Select name="assignedToUserId" defaultValue={currentUserId}>
                <option value="">Unassigned</option>
                {householdUsers.map((person) => (
                  <option key={person.userId} value={person.userId}>
                    {householdUserLabel(person)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-[5px]">
            <span className="text-xs font-semibold text-body">
              Linked thing <span className="font-normal text-muted">· optional</span>
            </span>
            <Select name="itemId" defaultValue="">
              <option value="">No specific item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-[5px]">
            <span className="text-xs font-semibold text-body">Notes</span>
            <Input name="description" placeholder="Notes (optional)" />
          </div>
          <SubmitButton className="w-full">Add reminder</SubmitButton>
        </>
      }
    >
      {/* Page header */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="font-mono text-[10px] text-muted">{seasonLabel(visibleMonth.getMonth())}</div>
          <div className="font-serif text-[28px] leading-none text-ink">{monthLabel}</div>
        </div>
        <TapButton
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card"
        >
          <span className="material-symbols-rounded text-ink">chevron_left</span>
        </TapButton>
        <TapButton
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card"
        >
          <span className="material-symbols-rounded text-ink">chevron_right</span>
        </TapButton>
      </div>

      {/* Calendar grid */}
      <div className="rounded-[14px] border border-border bg-card p-[10px_8px] shadow-card">
        <div className="grid grid-cols-7 pb-[6px] text-center font-mono text-[10px] text-muted">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-[2px]">
          {monthDays.map((date) => {
            const dateKey = toDateKey(date);
            const inMonth = date.getMonth() === visibleMonth.getMonth();
            const isSelected = dateKey === selectedDateKey;
            const isToday = dateKey === todayKey;
            const assigneeColors = assigneeColorsByDate.get(dateKey) ?? [];

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDateKey(dateKey)}
                className="flex h-11 cursor-pointer flex-col items-center justify-center gap-[3px] rounded-[10px] border-none bg-transparent transition-colors duration-100"
                style={{
                  background: isSelected ? "var(--color-accent)" : "transparent",
                  opacity: inMonth ? 1 : 0.35,
                }}
              >
                <span
                  className="text-[14px]"
                  style={{
                    fontWeight: isSelected || isToday ? 700 : 500,
                    color: isSelected ? "var(--color-surface)" : isToday ? "var(--color-accent)" : "var(--color-ink)",
                  }}
                >
                  {date.getDate()}
                </span>
                {assigneeColors.length > 0 && (
                  <span className="flex items-center gap-[2px]">
                    {assigneeColors.map((color, i) => (
                      <span
                        key={i}
                        className="h-[5px] w-[5px] rounded-full"
                        style={{ background: isSelected ? "var(--color-surface)" : color }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignee legend */}
      {reminders.length > 0 && (
        <div className="flex flex-wrap gap-x-[14px] gap-y-1">
          {householdUsers.map((person) => (
            <span key={person.userId} className="flex items-center gap-[5px] text-xs font-semibold text-body">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorForAssignee(person.userId) }}
              />
              {householdUserLabel(person)}
            </span>
          ))}
          <span className="flex items-center gap-[5px] text-xs font-semibold text-body">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: UNASSIGNED_COLOR }} />
            Unassigned
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      )}

      {/* Day detail */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold text-ink">
            {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
            })}
            {selectedDateKey === todayKey && " · today"}
          </span>
          <span className="font-mono text-[11px] text-muted">
            {selectedReminders.length} REMINDER{selectedReminders.length === 1 ? "" : "S"}
          </span>
        </div>

        {selectedReminders.length === 0 ? (
          <p className="text-sm text-muted">No reminders for this day.</p>
        ) : (
          <div className="rounded-[14px] border border-border bg-card px-3 py-[2px]">
            {selectedReminders.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                assignee={assigneeLabel(reminder.assignedToUserId, householdUsers)}
                assigneeInitial={assigneeInitial(reminder.assignedToUserId, householdUsers)}
                assigneeColor={colorForAssignee(reminder.assignedToUserId)}
                onComplete={(formData) => runAction(completeReminderAction, formData, "Couldn't update this reminder", () => toastReminderCompleted(reminder.title))}
                onReopen={(formData) => runAction(reopenReminderAction, formData, "Couldn't update this reminder", () => toastReminderReopened(reminder.title))}
                onDelete={(formData) => runAction(deleteReminderAction, formData, "Couldn't delete this reminder")}
              />
            ))}
          </div>
        )}
      </div>
    </CrudShell>
  );
}

export function ReminderRow({
  reminder,
  assignee,
  assigneeInitial,
  assigneeColor,
  onComplete,
  onReopen,
  onDelete,
}: {
  reminder: Reminder;
  assignee: string;
  assigneeInitial: string;
  assigneeColor: string;
  onComplete: (formData: FormData) => Promise<void>;
  onReopen: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const done = reminder.status === "done";

  function idFormData() {
    const formData = new FormData();
    formData.set("reminderId", reminder.id);
    return formData;
  }

  async function handleToggleStatus() {
    setTogglingStatus(true);
    try {
      await (done ? onReopen(idFormData()) : onComplete(idFormData()));
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(idFormData());
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-[10px] border-b border-border/40 py-[10px] last:border-b-0">
      <span className="w-[3px] self-stretch rounded-sm" style={{ background: assigneeColor }} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={togglingStatus}
          className={`cursor-pointer border-none bg-transparent p-0 text-left text-[14px] font-medium ${done ? "text-muted line-through" : "text-ink"}`}
        >
          {reminder.title}
        </button>
        <div className="font-mono text-[10px] text-muted">
          {reminder.itemName ? `${reminder.itemName} · ` : ""}
          {assignee}
        </div>
      </div>
      <span
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ background: assigneeColor }}
      >
        {assigneeInitial}
      </span>
      <TapButton
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="cursor-pointer border-none bg-transparent p-0"
        aria-label={`Delete ${reminder.title}`}
      >
        <span className="material-symbols-rounded text-[18px] text-muted">close</span>
      </TapButton>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${reminder.title}"?`}
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
