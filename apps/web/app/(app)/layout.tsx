import { AnimatedHomeboxIcon, FadeIn } from "@homebox-ai/ui";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { BottomNav } from "./bottom-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-white md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
      <FadeIn
        as="header"
        className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 md:gap-3 md:px-6 md:py-3"
      >
        <AnimatedHomeboxIcon size={28} className="h-7 w-7 md:h-10 md:w-10" />
        <span className="font-bold text-ink md:text-lg">Homebox AI</span>
      </FadeIn>
      <div className="app-content flex-1 overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
