"use client";

import { EmptyState, Input, Select, StaggerItem, StaggerList, SubmitButton } from "@homebox-ai/ui";
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

  if (editing) {
    return (
      <StaggerItem className="rounded-md border border-border p-3">
        <form
          action={async (formData) => {
            await updateLocationAction(formData);
            setEditing(false);
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
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
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer border-none bg-transparent text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      </StaggerItem>
    );
  }

  return (
    <StaggerItem className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
      <span className="font-medium text-ink">{pathById.get(location.id) ?? location.name}</span>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-pointer border-none bg-transparent text-sm font-semibold text-ink"
        >
          Edit
        </button>
        <form
          action={async (formData) => {
            if (!confirm(`Delete "${location.name}"? Items inside will become unassigned.`)) return;
            await deleteLocationAction(formData);
          }}
        >
          <input type="hidden" name="id" value={location.id} />
          <button type="submit" className="cursor-pointer border-none bg-transparent text-sm font-semibold text-accent-hover">
            Delete
          </button>
        </form>
      </div>
    </StaggerItem>
  );
}
