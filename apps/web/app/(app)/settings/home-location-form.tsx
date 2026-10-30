"use client";

import { useEffect, useId, useState } from "react";

import type { GeocodedPlace } from "../../../lib/weather";
import { searchPlacesAction, setHomeLocationAction } from "./actions/home-location";

/** Where the home is — used for the forecast on Maintain and for weather-aware care suggestions. */
export function HomeLocationForm({ current }: { current: string | null }) {
  const [editing, setEditing] = useState(!current);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  useEffect(() => setEditing(!current), [current]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await searchPlacesAction(q).catch(() => []);
      if (cancelled) return;
      setResults(found);
      setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function save(place: GeocodedPlace | null) {
    setSaving(true);
    setError(null);
    try {
      await setHomeLocationAction(place);
      setQuery("");
      setResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-4">
      <label htmlFor={inputId} className="text-[14px] font-semibold text-ink">
        Home location
      </label>
      <span className="text-[13px] leading-normal text-muted">
        Used for the forecast on Maintain, so care suggestions work around frost, rain, wind and heat.
      </span>

      {current && !editing ? (
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-[10px]">
          <span aria-hidden className="material-symbols-rounded text-[18px] text-accent">
            location_on
          </span>
          <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{current}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-accent"
          >
            Change
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save(null)}
            className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-muted hover:text-ink disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Town, city or postcode"
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-[10px] border border-border bg-card px-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent"
            />
            {current && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setQuery("");
                }}
                className="h-10 cursor-pointer rounded-[10px] border border-border bg-card px-3 text-[13px] font-semibold text-ink"
              >
                Cancel
              </button>
            )}
          </div>
          {query.trim().length >= 2 && (
            <ul
              aria-label="Matching places"
              className="m-0 flex list-none flex-col overflow-hidden rounded-[10px] border border-border p-0"
            >
              {searching && results.length === 0 ? (
                <li className="px-3 py-2 text-[13px] text-muted">Searching…</li>
              ) : results.length === 0 ? (
                <li className="px-3 py-2 text-[13px] text-muted">No places match.</li>
              ) : (
                results.map((place) => (
                  <li
                    key={`${place.latitude},${place.longitude}`}
                    className="border-b border-border/50 last:border-b-0"
                  >
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => save(place)}
                      className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[13px] text-ink hover:bg-selected-soft disabled:opacity-60"
                    >
                      <span aria-hidden className="material-symbols-rounded text-[16px] text-muted">
                        location_on
                      </span>
                      {place.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
