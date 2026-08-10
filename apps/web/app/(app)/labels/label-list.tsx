"use client";

import { EmptyState, StaggerItem, StaggerList } from "@homebox-ai/ui";

export function LabelList({ labels }: { labels: { id: string; name: string }[] }) {
  if (labels.length === 0) {
    return <EmptyState>No labels yet — add your first one above.</EmptyState>;
  }

  return (
    <StaggerList className="flex list-none flex-wrap gap-2 p-0 m-0">
      {labels.map((label) => (
        <StaggerItem
          key={label.id}
          className="rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-ink"
        >
          {label.name}
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
