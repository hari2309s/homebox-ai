import { getSessionUser } from "@homebox-ai/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-lg font-bold text-ink">Settings</h1>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-soft p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Account</span>
        <span className="text-sm text-ink">{user.email}</span>
      </div>
    </div>
  );
}
