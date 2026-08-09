import { FadeIn } from "@homebox-ai/ui";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-dvh flex-col bg-white">
      <FadeIn
        as="nav"
        className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-surface-soft px-4 py-2.5"
      >
        <NavLinks />
      </FadeIn>
      <div className="app-content flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
