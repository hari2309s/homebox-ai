"use client";

import type { MaintenanceSuggestion } from "@homebox-ai/ai";
import { Button, Select, Spinner } from "@homebox-ai/ui";
import { useState } from "react";

import { acceptMaintenanceSuggestionAction, getMaintenanceSuggestionsAction } from "./actions";

interface MaintenancePanelProps {
  items: { id: string; name: string }[];
}

export function MaintenancePanel({ items }: MaintenancePanelProps) {
  const [itemId, setItemId] = useState("");
  const [suggestions, setSuggestions] = useState<MaintenanceSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedNames, setAcceptedNames] = useState<Set<string>>(new Set());

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
    formData.set("name", suggestion.name);
    formData.set("date", suggestion.recommendedDate);
    formData.set("description", suggestion.reason);
    try {
      await acceptMaintenanceSuggestionAction(formData);
      setAcceptedNames((prev) => new Set(prev).add(suggestion.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this to your maintenance log");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg bg-surface-soft p-4 sm:flex-row sm:items-center">
        <Select value={itemId} onChange={(event) => setItemId(event.target.value)} className="sm:flex-1">
          <option value="">Choose an item…</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Button type="button" onClick={handleGetSuggestions} disabled={!itemId || loading}>
          {loading ? <Spinner size={16} /> : "Get suggestions"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
          {error}
        </p>
      )}

      {suggestions && (
        <div className="flex flex-col gap-3">
          {suggestions.warrantyExpiringSoon && (
            <p className="rounded-md bg-accent/10 px-3 py-2 text-sm font-semibold text-accent-hover">
              This item&apos;s warranty is expiring within 60 days.
            </p>
          )}
          {suggestions.suggestions.length === 0 ? (
            <p className="text-sm text-muted">No maintenance suggested right now.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {suggestions.suggestions.map((suggestion, index) => {
                const accepted = acceptedNames.has(suggestion.name);
                return (
                  <li
                    key={`${suggestion.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-ink">{suggestion.name}</span>
                      <span className="text-sm text-muted">{suggestion.reason}</span>
                      <span className="text-xs text-muted">By {suggestion.recommendedDate}</span>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleAccept(suggestion)}
                      disabled={accepted}
                      className="shrink-0"
                    >
                      {accepted ? "Added" : "Add to log"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
