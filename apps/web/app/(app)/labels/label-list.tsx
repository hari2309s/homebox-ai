"use client";

import { StaggerItem, StaggerList } from "@homebox-ai/ui";

export function LabelList({ labels }: { labels: { id: string; name: string }[] }) {
  return (
    <StaggerList>
      {labels.map((label) => (
        <StaggerItem key={label.id}>{label.name}</StaggerItem>
      ))}
    </StaggerList>
  );
}
