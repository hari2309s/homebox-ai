import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSessionUser } from "@homebox-ai/supabase/server";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <div className="min-h-dvh w-full bg-surface">{children}</div>;
}
