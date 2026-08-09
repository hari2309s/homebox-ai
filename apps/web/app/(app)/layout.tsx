import { FadeIn } from "@homebox-ai/ui";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-white">
      <FadeIn
        as="nav"
        className="flex flex-wrap items-center gap-1 border-b border-border bg-surface-soft px-4 py-2.5"
      >
        <NavLinks />
      </FadeIn>
      <FadeIn delay={0.1} className="mx-auto max-w-4xl p-6">
        {children}
      </FadeIn>
    </div>
  );
}
