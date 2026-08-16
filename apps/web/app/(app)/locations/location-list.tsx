"use client";

import { EmptyState, Input, Select, StaggerItem, StaggerList, SubmitButton, TapButton } from "@homebox-ai/ui";
import { useState } from "react";

import { deleteLocationAction, updateLocationAction } from "./actions";

interface LocationRecord {
  id: string;
  name: string;
  parentId: string | null;
}

interface LocationListProps {
  locations: LocationRecord[];
  pathById: Map<string, string>;
}

export function LocationList({ locations, pathById }: LocationListProps) {
  if (locations.length === 0) {
    return <EmptyState>No locations yet — add your first one above.</EmptyState>;
  }

  return (
    <StaggerList className="flex list-none flex-col gap-2 p-0 m-0">
      {locations.map((location) => (
        <LocationRow key={location.id} location={location} locations={locations} pathById={pathById} />
      ))}
    </StaggerList>
  );
}

function LocationRow({
  location,
  locations,
  pathById,
}: {
  location: LocationRecord;
  locations: LocationRecord[];
  pathById: Map<string, string>;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <StaggerItem className="rounded-md border border-border p-3" data-testid={`location-row-${location.name}`}>
        <form
          action={async (formData) => {
            setError(null);
            try {
              await updateLocationAction(formData);
              setEditing(false);
            } catch (err) {
              // e.g. re-parenting a location under its own sub-location — a
              // plain user mistake, not a crash: show it inline instead of
              // letting the throw reach Next's uncaught-error page.
              setError(err instanceof Error ? err.message : "Couldn't save that change");
            }
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input type="hidden" name="id" value={location.id} />
            <Input name="name" defaultValue={location.name} required className="sm:flex-1" />
            <Select name="parentId" defaultValue={location.parentId ?? ""}>
              <option value="">No parent (top-level)</option>
              {locations
                .filter((candidate) => candidate.id !== location.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {pathById.get(candidate.id) ?? candidate.name}
                  </option>
                ))}
            </Select>
            <div className="flex gap-3">
              <SubmitButton>Save</SubmitButton>
              <TapButton
                type="button"
                onClick={() => setEditing(false)}
                className="cursor-pointer border-none bg-transparent text-sm font-semibold text-ink"
              >
                Cancel
              </TapButton>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-accent-hover">
              {error}
            </p>
          )}
        </form>
      </StaggerItem>
    );
  }

  return (
    <StaggerItem
      hover
      className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
      data-testid={`location-row-${location.name}`}
    >
      <span className="font-medium text-ink">{pathById.get(location.id) ?? location.name}</span>
      <div className="flex shrink-0 items-center gap-3">
        <TapButton
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-pointer border-none bg-transparent text-sm font-semibold text-ink"
        >
          Edit
        </TapButton>
        <form
          action={async (formData) => {
            if (!confirm(`Delete "${location.name}"? Items inside will become unassigned.`)) return;
            await deleteLocationAction(formData);
          }}
        >
          <input type="hidden" name="id" value={location.id} />
          <TapButton
            type="submit"
            className="cursor-pointer border-none bg-transparent text-sm font-semibold text-accent-hover"
          >
            Delete
          </TapButton>
        </form>
      </div>
    </StaggerItem>
  );
}
