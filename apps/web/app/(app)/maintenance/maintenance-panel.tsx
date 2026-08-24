"use client";

import type { MaintenanceSuggestion } from "@homebox-ai/ai";
import { Button, EmptyState, Select, StaggerItem, StaggerList } from "@homebox-ai/ui";
import { useState } from "react";

import { createReminderFromSuggestionAction, getMaintenanceSuggestionsAction } from "./actions";

interface HouseholdUser {
  userId: string;
  email: string | null;
  isSelf: boolean;
}

interface MaintenancePanelProps {
  items: { id: string; name: string }[];
  householdUsers: HouseholdUser[];
  currentUserId: string;
}

export function MaintenancePanel({ items, householdUsers, currentUserId }: MaintenancePanelProps) {
  const [itemId, setItemId] = useState("");
  const [suggestions, setSuggestions] = useState<MaintenanceSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedNames, setAcceptedNames] = useState<Set<string>>(new Set());
  const [pendingNames, setPendingNames] = useState<Set<string>>(new Set());
  const [assignees, setAssignees] = useState<Record<string, string>>({});

  async function handleGetSuggestions() {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setAcceptedNames(new Set());
    try {
      setSuggestions(await getMaintenanceSuggestionsAction(itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get suggestions for this item");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(suggestion: MaintenanceSuggestion["suggestions"][number]) {
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("title", suggestion.name);
    formData.set("dueDate", suggestion.recommendedDate);
    formData.set("description", suggestion.reason);
    formData.set("assignedToUserId", assignees[suggestion.name] ?? currentUserId);
    setPendingNames((prev) => new Set(prev).add(suggestion.name));
    try {
      await createReminderFromSuggestionAction(formData);
      setAcceptedNames((prev) => new Set(prev).add(suggestion.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this reminder");
    } finally {
      setPendingNames((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.name);
        return next;
      });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
        {error && (
          <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
            {error}
          </p>
        )}

        {suggestions ? (
          <div className="flex flex-col gap-3">
            {suggestions.warrantyExpiringSoon && (
              <p className="rounded-md bg-accent/10 px-3 py-2 text-sm font-semibold text-accent-hover">
                This item&apos;s warranty is expiring within 60 days.
              </p>
            )}
            {suggestions.suggestions.length === 0 ? (
              <p className="text-sm text-muted">No maintenance suggested right now.</p>
            ) : (
              <StaggerList className="m-0 flex list-none flex-col gap-2 p-0">
                {suggestions.suggestions.map((suggestion, index) => {
                  const accepted = acceptedNames.has(suggestion.name);
                  const pending = pendingNames.has(suggestion.name);
                  return (
                    <StaggerItem
                      key={`${suggestion.name}-${index}`}
                      hover
                      className="flex flex-col gap-3 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-ink">{suggestion.name}</span>
                        <span className="text-sm text-muted">{suggestion.reason}</span>
                        <span className="text-xs text-muted">By {suggestion.recommendedDate}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Select
                          value={assignees[suggestion.name] ?? currentUserId}
                          onChange={(event) =>
                            setAssignees((prev) => ({ ...prev, [suggestion.name]: event.target.value }))
                          }
                          disabled={accepted || pending}
                          className="w-36"
                        >
                          {householdUsers.map((person) => (
                            <option key={person.userId} value={person.userId}>
                              {person.isSelf ? "Myself" : (person.email ?? "Family member")}
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          onClick={() => handleAccept(suggestion)}
                          disabled={accepted}
                          loading={pending}
                        >
                          {accepted ? "Added" : "Add reminder"}
                        </Button>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerList>
            )}
          </div>
        ) : (
          <EmptyState>Choose an item below to get maintenance and warranty suggestions.</EmptyState>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:mx-auto md:w-full md:max-w-2xl">
          <Select value={itemId} onChange={(event) => setItemId(event.target.value)} className="sm:flex-1">
            <option value="">Choose an item…</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Button type="button" onClick={handleGetSuggestions} disabled={!itemId} loading={loading}>
            Get suggestions
          </Button>
        </div>
      </div>
    </div>
  );
}
