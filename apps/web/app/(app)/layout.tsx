export const maxDuration = 60;

import { chatQueries } from "@homebox-ai/db";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { BottomNav } from "./bottom-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const unreadChatCount = await chatQueries.countUnreadProactiveMessages(user.id);

  return (
    <div
      id="app-shell"
      className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-surface md:max-w-2xl lg:max-w-4xl xl:max-w-6xl"
    >
      <div className="app-content flex-1 overflow-y-auto">{children}</div>
      <BottomNav unreadChatCount={unreadChatCount} />
    </div>
  );
}
