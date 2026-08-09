"use client";

import { StaggerItem, StaggerList } from "@homebox-ai/ui";

export function LocationList({ paths }: { paths: { id: string; path: string }[] }) {
  return (
    <StaggerList>
      {paths.map((location) => (
        <StaggerItem key={location.id}>{location.path}</StaggerItem>
      ))}
    </StaggerList>
  );
}
