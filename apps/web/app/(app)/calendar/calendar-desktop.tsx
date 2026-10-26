"use client";

import { Input, Select, SubmitButton } from "@homebox-ai/ui";
import Link from "next/link";
import { useMemo, useState } from "react";

import { householdUserLabel, type HouseholdUser } from "../../../lib/household";
import { completeReminderAction, createReminderAction, deleteReminderAction, reopenReminderAction } from "./actions";
import {
  assigneeInitial,
  assigneeLabel,
  colorForAssignee,
  getMonthGrid,
  seasonLabel,
  toDateKey,
  UNASSIGNED_COLOR,
  type Item,
  type Reminder,
} from "./calendar-utils";
import { ReminderRow } from "./calendar-view";

const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MAX_CHIPS = 3;

const NAV_BUTTON =
  "flex h-[34px] cursor-pointer items-center justify-center rounded-[9px] border border-border bg-card text-[13px] font-semibold text-ink";

export function CalendarDesktop({
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
  const todayKey = toDateKey(today);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, Reminder[]>();
    for (const r of reminders) map.set(r.dueDate, [...(map.get(r.dueDate) ?? []), r]);
    return map;
  }, [reminders]);

  const days = useMemo(() => {
    const grid = getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth());
    const month = visibleMonth.getMonth();
    let lastInMonth = 0;
    grid.forEach((d, i) => {
      if (d.getMonth() === month) lastInMonth = i;
    });
    return grid.slice(0, Math.ceil((lastInMonth + 1) / 7) * 7);
  }, [visibleMonth]);

  const monthPrefix = toDateKey(visibleMonth).slice(0, 7);
  const monthCountByUser = useMemo(() => {
    const counts = new Map<string | null, number>();
    for (const r of reminders) {
      if (r.dueDate.startsWith(monthPrefix)) counts.set(r.assignedToUserId, (counts.get(r.assignedToUserId) ?? 0) + 1);
    }
    return counts;
  }, [reminders, monthPrefix]);

  const selectedDate = new Date(`${selectedKey}T00:00:00`);
  const selectedReminders = byDate.get(selectedKey) ?? [];

  function changeMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function goToday() {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(todayKey);
  }

  async function runAction(action: (formData: FormData) => Promise<void>, formData: FormData, fallback: string) {
    setError(null);
    try {
      await action(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    }
  }

  async function handleCreate(formData: FormData) {
    setError(null);
    try {
      await createReminderAction(formData);
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this reminder");
    }
  }

  return (
    <div className="flex h-full min-h-[640px]">
      <div className="flex min-w-0 flex-1 flex-col gap-[14px] px-7 py-6">
        <div className="flex items-center gap-[10px]">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] text-muted">{seasonLabel(visibleMonth.getMonth())}</div>
            <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">
              {visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h1>
          </div>
          <div className="flex rounded-[9px] bg-surface-soft p-[3px] text-[13px] font-semibold">
            <span
              aria-current="page"
              className="rounded-[7px] bg-card px-3 py-[6px] text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]"
            >
              Month
            </span>
            <Link href="/maintenance" className="rounded-[7px] px-3 py-[6px] text-muted no-underline hover:text-ink">
              Care
            </Link>
          </div>
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className={`${NAV_BUTTON} w-[34px]`}
          >
            <span aria-hidden className="material-symbols-rounded">
              chevron_left
            </span>
          </button>
          <button type="button" onClick={goToday} className={`${NAV_BUTTON} px-3`}>
            Today
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className={`${NAV_BUTTON} w-[34px]`}
          >
            <span aria-hidden className="material-symbols-rounded">
              chevron_right
            </span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="grid grid-cols-7 border-b border-border/60 font-mono text-[10px] text-muted">
            {DOW.map((d) => (
              <span key={d} className="px-[10px] py-2">
                {d}
              </span>
            ))}
          </div>
          <div
            className="grid flex-1 grid-cols-7"
            style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}
          >
            {days.map((date) => {
              const key = toDateKey(date);
              const inMonth = date.getMonth() === visibleMonth.getMonth();
              const selected = key === selectedKey;
              const isToday = key === todayKey;
              const dayReminders = byDate.get(key) ?? [];
              const hidden = dayReminders.length - MAX_CHIPS;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}, ${dayReminders.length} reminders`}
                  aria-pressed={selected}
                  onClick={() => setSelectedKey(key)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedKey(key);
                    }
                  }}
                  className={`group relative flex min-h-0 cursor-pointer flex-col gap-[3px] overflow-hidden border-b border-r border-border/50 p-[6px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                    selected ? "bg-selected-soft" : inMonth ? "bg-card hover:bg-selected-soft/60" : "bg-rail"
                  }`}
                >
                  <span
                    className={`self-start rounded-full px-[6px] py-px text-[12px] ${
                      selected
                        ? "bg-accent font-bold text-white"
                        : isToday
                          ? "font-bold text-accent"
                          : !inMonth || key < todayKey
                            ? "font-medium text-muted"
                            : "font-medium text-ink"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {dayReminders.slice(0, MAX_CHIPS).map((r) => {
                    const color = colorForAssignee(r.assignedToUserId);
                    return (
                      <span
                        key={r.id}
                        title={r.title}
                        className={`truncate rounded-[3px] border-l-[3px] px-[5px] py-[2px] text-[11px] leading-[1.2] text-ink ${
                          r.status === "done" ? "line-through opacity-60" : ""
                        }`}
                        style={{ borderLeftColor: color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
                      >
                        {r.title}
                      </span>
                    );
                  })}
                  {hidden > 0 && <span className="px-[5px] text-[10px] font-semibold text-muted">+{hidden} more</span>}
                  <button
                    type="button"
                    aria-label={`Add a reminder on ${date.toLocaleDateString(undefined, { day: "numeric", month: "long" })}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedKey(key);
                      setFormOpen(true);
                    }}
                    className="absolute right-[5px] top-[5px] hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-accent text-white group-hover:flex group-focus-visible:flex"
                  >
                    <span aria-hidden className="material-symbols-rounded text-[16px]">
                      add
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="flex w-[300px] flex-none flex-col gap-[14px] overflow-y-auto border-l border-border bg-rail px-[18px] py-6">
        <div>
          <div className="font-mono text-[10px] text-muted">
            {selectedDate.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase()}
            {selectedKey === todayKey ? " · TODAY" : ""}
          </div>
          <h2 className="m-0 font-serif text-[26px] font-normal text-ink">
            {selectedDate.toLocaleDateString(undefined, { day: "numeric", month: "long" })}
          </h2>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-xl bg-[#ecdccd] px-3 py-2.5 text-sm text-[#5a2e18]">
            {error}
          </p>
        )}

        {selectedReminders.length === 0 ? (
          <p className="m-0 text-[13px] text-muted">Nothing on this day.</p>
        ) : (
          <div className="rounded-[14px] border border-border bg-card px-3 py-[2px]">
            {selectedReminders.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                assignee={assigneeLabel(reminder.assignedToUserId, householdUsers)}
                assigneeInitial={assigneeInitial(reminder.assignedToUserId, householdUsers)}
                assigneeColor={colorForAssignee(reminder.assignedToUserId)}
                onComplete={(fd) => runAction(completeReminderAction, fd, "Couldn't update this reminder")}
                onReopen={(fd) => runAction(reopenReminderAction, fd, "Couldn't update this reminder")}
                onDelete={(fd) => runAction(deleteReminderAction, fd, "Couldn't delete this reminder")}
              />
            ))}
          </div>
        )}

        {formOpen ? (
          <form
            key={selectedKey}
            action={handleCreate}
            className="flex flex-col gap-[10px] rounded-[14px] border border-border bg-card p-[14px]"
          >
            <div className="font-serif text-[18px] text-ink">New reminder</div>
            <Input name="title" placeholder="What needs doing" aria-label="Title" required autoFocus />
            <Input name="dueDate" type="date" defaultValue={selectedKey} aria-label="Date" required />
            <Select name="assignedToUserId" defaultValue={currentUserId} aria-label="Assignee">
              <option value="">Unassigned</option>
              {householdUsers.map((person) => (
                <option key={person.userId} value={person.userId}>
                  {householdUserLabel(person)}
                </option>
              ))}
            </Select>
            <Select name="itemId" defaultValue="" aria-label="Linked thing">
              <option value="">No specific thing</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Input name="description" placeholder="Notes (optional)" aria-label="Notes" />
            <div className="flex items-center gap-3">
              <SubmitButton>Add reminder</SubmitButton>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="cursor-pointer border-none bg-transparent text-sm font-semibold text-accent"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex cursor-pointer items-center justify-center gap-[6px] rounded-[10px] border-none bg-accent py-3 text-[14px] font-semibold text-white"
          >
            <span aria-hidden className="material-symbols-rounded text-[18px]">
              add_alarm
            </span>
            Add reminder
          </button>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <div className="font-mono text-[10px] text-muted">WHO · THIS MONTH</div>
          {householdUsers.map((person) => (
            <div key={person.userId} className="flex items-center gap-2 text-[13px] text-ink">
              <span
                className="h-[10px] w-[10px] rounded-full"
                style={{ background: colorForAssignee(person.userId) }}
              />
              <span className="min-w-0 flex-1 truncate">{householdUserLabel(person)}</span>
              <span className="font-mono text-[10px] text-muted">{monthCountByUser.get(person.userId) ?? 0}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-[13px] text-ink">
            <span className="h-[10px] w-[10px] rounded-full" style={{ background: UNASSIGNED_COLOR }} />
            <span className="flex-1">Unassigned</span>
            <span className="font-mono text-[10px] text-muted">{monthCountByUser.get(null) ?? 0}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
