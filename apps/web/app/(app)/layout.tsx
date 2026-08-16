import { chatQueries } from "@homebox-ai/db";
import { AnimatedHomeboxIcon, FadeIn } from "@homebox-ai/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { BottomNav } from "./bottom-nav";
import { LogoutButton } from "./logout-button";
import { SettingsIcon } from "./settings-icon";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const unreadChatCount = await chatQueries.countUnreadProactiveMessages(user.id);

  return (
    <div
      id="app-shell"
      className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-white md:max-w-2xl lg:max-w-4xl xl:max-w-6xl"
    >
      <FadeIn
        as="header"
        id="app-header"
        className="flex shrink-0 items-center gap-2 rounded-b-lg border-b border-border bg-surface-soft px-4 py-2 md:gap-3 md:px-6 md:py-3"
      >
        <div className="flex shrink-0 items-center justify-center rounded-md bg-white p-1 md:rounded-lg md:p-1.5">
          <AnimatedHomeboxIcon size={28} className="h-7 w-7 md:h-10 md:w-10" />
        </div>
        <span className="font-bold text-ink md:text-lg">Homebox AI</span>
        <div className="ml-auto flex items-center gap-1">
          <div id="header-actions" className="flex items-center gap-1" />
          <Link
            href="/settings"
            aria-label="Settings"
            className="rounded-md p-1 text-ink transition-colors duration-150 hover:text-accent"
          >
            <SettingsIcon className="h-5 w-5 md:h-6 md:w-6" />
          </Link>
          <LogoutButton />
        </div>
      </FadeIn>
      <div className="app-content flex-1 overflow-y-auto">{children}</div>
      <BottomNav unreadChatCount={unreadChatCount} />
    </div>
  );
}
