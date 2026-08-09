"use client";

import { StaggerItem, StaggerList } from "@homebox-ai/ui";

export function LabelList({ labels }: { labels: { id: string; name: string }[] }) {
  if (labels.length === 0) {
    return <p className="text-sm text-muted">No labels yet — add your first one above.</p>;
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
