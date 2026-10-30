"use client";

import type { MaintenanceSuggestion } from "@homebox-ai/ai";
import { EmptyState, Select } from "@homebox-ai/ui";
import { useState } from "react";

import { formatDate } from "../../../lib/date";
import { householdUserLabel, type HouseholdUser } from "../../../lib/household";
import { AcceptedHistory, type AcceptedSuggestion } from "./accepted-history";
import { WeatherCard, WeatherNote, type MaintainWeather } from "./weather-card";
import { createReminderFromSuggestionAction, getMaintenanceSuggestionsAction } from "./actions";

interface MaintenancePanelProps {
  items: { id: string; name: string }[];
  householdUsers: HouseholdUser[];
  currentUserId: string;
  accepted: AcceptedSuggestion[];
  weather: MaintainWeather;
}

const SUGGESTION_STYLES: { icon: string; bg: string; fg: string }[] = [
  { icon: "build", bg: "#dfe8d6", fg: "#3f6b45" },
  { icon: "water_drop", bg: "#d6eaea", fg: "#3f8a8a" },
  { icon: "cleaning_services", bg: "#ecdccd", fg: "#b0643f" },
];

export function MaintenancePanel({ items, householdUsers, currentUserId, accepted, weather }: MaintenancePanelProps) {
  const [itemId, setItemId] = useState("");
  const [suggestions, setSuggestions] = useState<MaintenanceSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedIndexes, setAcceptedIndexes] = useState<Set<number>>(new Set());
  const [pendingIndexes, setPendingIndexes] = useState<Set<number>>(new Set());
  const [assignees, setAssignees] = useState<Record<number, string>>({});

  async function handleGetSuggestions() {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setAcceptedIndexes(new Set());
    try {
      setSuggestions(await getMaintenanceSuggestionsAction(itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get suggestions for this item");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(suggestion: MaintenanceSuggestion["suggestions"][number], index: number) {
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("title", suggestion.name);
    formData.set("dueDate", suggestion.recommendedDate);
    formData.set("description", suggestion.weather ? `${suggestion.reason}\n\nWeather: ${suggestion.weather}` : suggestion.reason);
    formData.set("assignedToUserId", assignees[index] ?? currentUserId);
    setPendingIndexes((prev) => new Set(prev).add(index));
    try {
      await createReminderFromSuggestionAction(formData);
      setAcceptedIndexes((prev) => new Set(prev).add(index));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this reminder");
    } finally {
      setPendingIndexes((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  const selectedItem = items.find((i) => i.id === itemId);

  return (
    <div data-scroll-container className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-3 p-4">
        <div className="px-1">
          <div className="font-serif text-[30px] leading-none text-ink">Care &amp; upkeep</div>
          <div className="mt-1 font-mono text-[11px] tracking-wide text-muted">
            PICK A THING · I&apos;LL SUGGEST A ROUTINE
          </div>
        </div>

        <WeatherCard weather={weather} />

        {/* Item picker + suggest button */}
        <div className="flex gap-2">
          <div className="relative flex flex-1 items-center gap-[10px] rounded-xl border border-border bg-card px-[10px] py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[repeating-linear-gradient(135deg,#dfe8d6_0_4px,#eef3e9_4px_8px)]" />
            <div className="min-w-0 flex-1">
              {selectedItem ? (
                <div className="truncate text-[14px] font-semibold text-ink">{selectedItem.name}</div>
              ) : (
                <div className="text-[14px] text-muted">Choose an item…</div>
              )}
            </div>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Choose an item"
            >
              <option value="">Choose an item…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <span className="material-symbols-rounded text-muted">expand_more</span>
          </div>
          <button
            type="button"
            onClick={handleGetSuggestions}
            disabled={!itemId || loading}
            className="flex cursor-pointer items-center gap-[6px] rounded-xl border-none bg-accent px-[14px] text-[14px] font-semibold text-on-accent disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-[18px]">auto_awesome</span>
            {loading ? "…" : "Suggest"}
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">{error}</p>
        )}

        {/* Warranty warning */}
        {suggestions?.warrantyExpiringSoon && (
          <div className="flex items-start gap-[10px] rounded-xl bg-danger-soft px-3 py-[11px]">
            <span className="material-symbols-rounded text-danger">gpp_maybe</span>
            <p className="flex-1 text-[13px] leading-snug text-danger-ink">
              <b>Warranty is expiring soon.</b> If something&apos;s wrong, claim it now while the receipt is on file.
            </p>
          </div>
        )}

        {/* Suggestion cards */}
        {suggestions ? (
          suggestions.suggestions.length === 0 ? (
            <p className="text-sm text-muted">No maintenance suggested right now.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {suggestions.suggestions.map((suggestion, index) => {
                const accepted = acceptedIndexes.has(index);
                const pending = pendingIndexes.has(index);
                const style = SUGGESTION_STYLES[index % SUGGESTION_STYLES.length]!;
                return (
                  <div
                    key={`${suggestion.name}-${index}`}
                    className="flex flex-col gap-[10px] rounded-[14px] border border-border bg-card p-3 shadow-card"
                  >
                    <div className="flex items-start gap-[10px]">
                      <span
                        className="material-symbols-rounded flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
                        style={{ background: style.bg, color: style.fg, fontSize: 18 }}
                      >
                        {style.icon}
                      </span>
                      <div className="flex-1">
                        <div className="text-[15px] font-semibold text-ink">{suggestion.name}</div>
                        <div className="mt-0.5 text-[13px] leading-snug text-muted">{suggestion.reason}</div>
                        {suggestion.weather && (
                          <div className="mt-2">
                            <WeatherNote note={suggestion.weather} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-[6px]">
                      <span className="rounded-lg bg-surface-soft px-[9px] py-[7px] font-mono text-[11px] text-ink">
                        {formatDate(suggestion.recommendedDate)}
                      </span>
                      <Select
                        value={assignees[index] ?? currentUserId}
                        onChange={(e) => setAssignees((prev) => ({ ...prev, [index]: e.target.value }))}
                        disabled={accepted || pending}
                        className="flex-1 !rounded-lg !py-[5px] !text-[13px]"
                      >
                        {householdUsers.map((person) => (
                          <option key={person.userId} value={person.userId}>
                            {householdUserLabel(person)}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => handleAccept(suggestion, index)}
                        disabled={accepted || pending}
                        className={`flex cursor-pointer items-center gap-1 rounded-lg border px-[10px] py-[6px] text-[13px] font-semibold ${
                          accepted
                            ? "border-border bg-selected text-moss-ink"
                            : "border-none bg-accent text-on-accent"
                        }`}
                      >
                        <span className="material-symbols-rounded text-[16px]">
                          {accepted ? "check" : "add_alarm"}
                        </span>
                        {accepted ? "Added" : pending ? "…" : "Add"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          !loading && <EmptyState>Choose an item above to get maintenance and warranty suggestions.</EmptyState>
        )}

        <AcceptedHistory entries={accepted} householdUsers={householdUsers} title="HISTORY" />
      </div>
    </div>
  );
}
