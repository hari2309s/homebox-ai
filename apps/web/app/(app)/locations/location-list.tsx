"use client";

import { EmptyState, StaggerItem, StaggerList } from "@homebox-ai/ui";

export function LocationList({ paths }: { paths: { id: string; path: string }[] }) {
  if (paths.length === 0) {
    return <EmptyState>No locations yet — add your first one above.</EmptyState>;
  }

  return (
    <StaggerList className="flex list-none flex-col gap-2 p-0 m-0">
      {paths.map((location) => (
        <StaggerItem key={location.id} className="rounded-md border border-border px-4 py-3 font-medium text-ink">
          {location.path}
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
