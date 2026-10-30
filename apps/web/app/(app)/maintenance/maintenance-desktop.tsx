"use client";

import type { MaintenanceSuggestion } from "@homebox-ai/ai";
import Link from "next/link";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { householdUserLabel, type HouseholdUser } from "../../../lib/household";
import { assigneeInitial, colorForAssignee } from "../calendar/calendar-utils";
import { AcceptedHistory, type AcceptedSuggestion } from "./accepted-history";
import { WeatherCard, WeatherNote, type MaintainWeather } from "./weather-card";
import { createReminderFromSuggestionAction, getMaintenanceSuggestionsAction } from "./actions";

export interface CareItem {
  id: string;
  name: string;
  place: string;
  stripe: string;
  warrantyExpires: string | null;
}

export interface CareReminder {
  id: string;
  itemId: string | null;
  title: string;
  dueDate: string;
  assignedToUserId: string | null;
  status: "pending" | "done";
}

const CARD_STYLES = [
  { icon: "filter_alt", bg: "#dfe8d6", fg: "#3f6b45" },
  { icon: "ac_unit", bg: "#dde6f0", fg: "#5b7fa6" },
  { icon: "lightbulb", bg: "#f6e7c4", fg: "#8a6a1a" },
];

function monthDay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey.toUpperCase();
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
    .format(new Date(y, m - 1, d))
    .toUpperCase();
}

function daysUntil(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y!, m! - 1, d!).getTime() - today.getTime()) / 86_400_000);
}

function ItemCombobox({
  items,
  value,
  onChange,
}: {
  items: CareItem[];
  value: CareItem | null;
  onChange: (item: CareItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (
      q ? items.filter((i) => i.name.toLowerCase().includes(q) || i.place.toLowerCase().includes(q)) : items
    ).slice(0, 8);
  }, [items, query]);

  function choose(item: CareItem) {
    onChange(item);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (event.key === "Enter" && open && results[active]) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div className="flex items-center gap-[10px]">
        <span
          className="h-[30px] w-[30px] flex-none rounded-lg"
          style={value ? { backgroundImage: value.stripe } : { background: "var(--color-surface-soft)" }}
        />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && results[active] ? `${listId}-${results[active].id}` : undefined}
          aria-label="Thing to look after"
          value={open ? query : (value?.name ?? "")}
          placeholder="Choose a thing…"
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 border-none bg-transparent text-[14px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
        />
        <span aria-hidden className="material-symbols-rounded text-muted">
          expand_more
        </span>
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-[-10px] right-[-150px] top-[calc(100%+12px)] z-30 m-0 max-h-[320px] list-none overflow-y-auto rounded-[12px] border border-border bg-card p-1 shadow-[8px_12px_24px_-10px_rgba(31,38,34,.35)]"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-muted">No things match.</li>
          ) : (
            results.map((item, i) => (
              <li
                key={item.id}
                id={`${listId}-${item.id}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(item);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-[10px] rounded-[8px] px-2 py-[7px] ${i === active ? "bg-selected-soft" : ""}`}
              >
                <span className="h-7 w-7 flex-none rounded-[7px]" style={{ backgroundImage: item.stripe }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{item.name}</span>
                  <span className="block truncate font-mono text-[9px] text-muted">
                    {item.place.toUpperCase() || "NOT PLACED"}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function HoppingSquares() {
  return (
    <span className="flex gap-1">
      {["#3f6b45", "#b0643f", "#8a7a4f"].map((c, i) => (
        <span
          key={c}
          className="h-2 w-2 animate-bounce rounded-[2px]"
          style={{ background: c, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export function MaintenanceDesktop({
  items,
  reminders,
  householdUsers,
  currentUserId,
  accepted,
  weather,
}: {
  items: CareItem[];
  reminders: CareReminder[];
  householdUsers: HouseholdUser[];
  currentUserId: string;
  accepted: AcceptedSuggestion[];
  weather: MaintainWeather;
}) {
  const [item, setItem] = useState<CareItem | null>(null);
  const [suggestions, setSuggestions] = useState<MaintenanceSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Record<number, string>>({});
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [localScheduled, setLocalScheduled] = useState<CareReminder[]>([]);

  const scheduled = useMemo(
    () =>
      item
        ? (() => {
            const server = reminders.filter((r) => r.itemId === item.id && r.status === "pending");
            const key = (r: CareReminder) => `${r.title}|${r.dueDate}`;
            const known = new Set(server.map(key));
            const local = localScheduled.filter((r) => r.itemId === item.id && !known.has(key(r)));
            return [...server, ...local].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          })()
        : [],
    [item, reminders, localScheduled],
  );

  async function suggest() {
    if (!item) return;
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setAdded(new Set());
    setAssignees({});
    try {
      setSuggestions(await getMaintenanceSuggestionsAction(item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get suggestions for this thing");
    } finally {
      setLoading(false);
    }
  }

  async function accept(index: number, suggestion: MaintenanceSuggestion["suggestions"][number]) {
    if (!item) return;
    const assignee = assignees[index] ?? currentUserId;
    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("title", suggestion.name);
    formData.set("dueDate", suggestion.recommendedDate);
    formData.set(
      "description",
      suggestion.weather ? `${suggestion.reason}\n\nWeather: ${suggestion.weather}` : suggestion.reason,
    );
    formData.set("assignedToUserId", assignee);
    setPending((prev) => new Set(prev).add(index));
    try {
      await createReminderFromSuggestionAction(formData);
      setAdded((prev) => new Set(prev).add(index));
      setLocalScheduled((prev) => [
        ...prev,
        {
          id: `local-${item.id}-${index}`,
          itemId: item.id,
          title: suggestion.name,
          dueDate: suggestion.recommendedDate,
          assignedToUserId: assignee || null,
          status: "pending",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this reminder");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  const warrantyDays = item?.warrantyExpires ? daysUntil(item.warrantyExpires) : null;
  const showWarranty =
    !!item && (suggestions?.warrantyExpiringSoon || (warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 60));
  const nameFor = (userId: string | null) => {
    const person = householdUsers.find((p) => p.userId === userId);
    return person ? householdUserLabel(person) : "Unassigned";
  };

  return (
    <div className="flex flex-col gap-[18px] px-8 py-7">
      <div className="flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] text-muted">SEASONS · CARE PLANS</div>
          <h1 className="m-0 font-serif text-[36px] font-normal leading-[1.1] text-ink">Look after something</h1>
        </div>
        <div className="flex w-[420px] items-center gap-[10px] rounded-xl border border-border bg-card py-[6px] pl-[10px] pr-[6px] focus-within:border-accent">
          <ItemCombobox
            items={items}
            value={item}
            onChange={(next) => {
              setItem(next);
              setSuggestions(null);
              setError(null);
            }}
          />
          <button
            type="button"
            onClick={suggest}
            disabled={!item || loading}
            className="flex h-9 flex-none cursor-pointer items-center gap-[6px] rounded-[9px] border-none bg-accent px-3 text-[13px] font-semibold text-on-accent disabled:opacity-50"
          >
            <span aria-hidden className="material-symbols-rounded text-[18px]">
              auto_awesome
            </span>
            Get suggestions
          </button>
        </div>
      </div>

      <WeatherCard weather={weather} />

      {error && (
        <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      )}

      {showWarranty && item && (
        <div className="flex items-start gap-[10px] rounded-xl bg-danger-soft px-[14px] py-[11px]">
          <span aria-hidden className="material-symbols-rounded text-danger">
            gpp_maybe
          </span>
          <span className="flex-1 text-[13px] leading-[1.45] text-danger-ink">
            <b>
              {warrantyDays !== null && warrantyDays >= 0
                ? `Warranty ends in ${warrantyDays} ${warrantyDays === 1 ? "day" : "days"} (${monthDay(item.warrantyExpires!)}).`
                : "Warranty is ending soon."}
            </b>{" "}
            Register any faults before then.
          </span>
          <Link
            href={`/items/${item.id}#attachments`}
            className="text-[13px] font-semibold text-danger no-underline hover:underline"
          >
            Open receipt
          </Link>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-4" aria-busy="true" aria-label="Getting suggestions">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex h-[220px] flex-col gap-3 rounded-[14px] border border-border bg-card p-4">
              <HoppingSquares />
              <span className="h-5 w-3/4 rounded bg-surface-soft" />
              <span className="h-3 w-full rounded bg-surface-soft" />
              <span className="h-3 w-5/6 rounded bg-surface-soft" />
            </div>
          ))}
        </div>
      ) : suggestions ? (
        suggestions.suggestions.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">Nothing to do for this one right now.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {suggestions.suggestions.map((suggestion, index) => {
              const style = CARD_STYLES[index % CARD_STYLES.length]!;
              const isAdded = added.has(index);
              const assignee = assignees[index] ?? currentUserId;
              return (
                <div
                  key={`${suggestion.name}-${index}`}
                  className="flex flex-col gap-[10px] rounded-[14px] border border-border bg-card p-4 shadow-[8px_12px_24px_-14px_rgba(31,38,34,.25)]"
                >
                  <div className="flex items-center gap-[10px]">
                    <span
                      aria-hidden
                      className="material-symbols-rounded flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ background: style.bg, color: style.fg, fontSize: 18 }}
                    >
                      {style.icon}
                    </span>
                    <span className="flex-1 font-mono text-[10px] text-accent">SUGGESTED</span>
                    <span className="font-mono text-[10px] text-muted">{monthDay(suggestion.recommendedDate)}</span>
                  </div>
                  <div className="font-serif text-[19px] leading-[1.2] text-ink">{suggestion.name}</div>
                  <p className="m-0 flex-1 text-[14px] leading-normal text-body">{suggestion.reason}</p>
                  {suggestion.weather && <WeatherNote note={suggestion.weather} />}
                  <div className="flex items-center gap-[6px]">
                    <label className="relative flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-border px-[10px] py-[6px] text-[13px] text-ink">
                      <span
                        className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: colorForAssignee(assignee || null) }}
                      >
                        {assigneeInitial(assignee || null, householdUsers)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{nameFor(assignee || null)}</span>
                      <span aria-hidden className="material-symbols-rounded text-[16px] text-muted">
                        expand_more
                      </span>
                      <select
                        value={assignee}
                        disabled={isAdded || pending.has(index)}
                        onChange={(event) => setAssignees((prev) => ({ ...prev, [index]: event.target.value }))}
                        aria-label="Assign to"
                        className="absolute inset-0 cursor-pointer opacity-0"
                      >
                        <option value="">Unassigned</option>
                        {householdUsers.map((person) => (
                          <option key={person.userId} value={person.userId}>
                            {householdUserLabel(person)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => accept(index, suggestion)}
                      disabled={isAdded || pending.has(index)}
                      className={`flex h-[34px] flex-none cursor-pointer items-center rounded-[9px] px-3 text-[13px] font-semibold ${
                        isAdded
                          ? "border border-accent bg-card text-accent"
                          : "border-none bg-accent text-on-accent disabled:opacity-60"
                      }`}
                    >
                      {isAdded ? "Added ✓" : pending.has(index) ? "Adding…" : "Add reminder"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-border px-6 py-12 text-center">
          <span aria-hidden className="material-symbols-rounded text-[28px] text-accent">
            yard
          </span>
          <p className="m-0 max-w-md text-[14px] text-muted">
            {item
              ? `Ask for a care plan for ${item.name}. I'll suggest what to do and when.`
              : "Pick a thing above and I'll suggest a care routine for it."}
          </p>
        </div>
      )}

      {item && (
        <div className="rounded-[14px] border border-border bg-card">
          <div className="flex justify-between border-b border-border/60 px-[14px] py-3 font-mono text-[10px] text-muted">
            <span>ALREADY SCHEDULED FOR {item.name.toUpperCase()}</span>
            <span>{scheduled.length}</span>
          </div>
          {scheduled.length === 0 ? (
            <p className="m-0 px-[14px] py-3 text-[13px] text-muted">Nothing scheduled yet.</p>
          ) : (
            scheduled.map((r) => (
              <Link
                key={r.id}
                href="/calendar"
                className="flex items-center gap-[10px] border-b border-border/40 px-[14px] py-[11px] no-underline last:border-b-0 hover:bg-selected-soft"
              >
                <span className="h-2 w-2 rounded-[2px]" style={{ background: colorForAssignee(r.assignedToUserId) }} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{r.title}</span>
                <span className="font-mono text-[10px] text-muted">
                  {monthDay(r.dueDate)} · {nameFor(r.assignedToUserId).toUpperCase()}
                </span>
              </Link>
            ))
          )}
        </div>
      )}

      <AcceptedHistory entries={accepted} householdUsers={householdUsers} />
    </div>
  );
}
