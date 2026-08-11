import { getSessionUser } from "@homebox-ai/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DeleteAccountForm } from "./delete-account-form";
import { DisplayNameForm } from "./display-name-form";
import { PasswordForm } from "./password-form";

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface-soft p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const email = user.email ?? "";
  const displayName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
      <h1 className="text-lg font-bold text-ink">Settings</h1>

      <SettingsSection title="Account">
        <span className="text-sm text-ink">{email}</span>
      </SettingsSection>

      <SettingsSection title="Profile">
        <DisplayNameForm initialName={displayName} />
      </SettingsSection>

      <SettingsSection title="Password">
        <PasswordForm />
      </SettingsSection>

      <SettingsSection title="Your data">
        <p className="text-sm text-body">Download everything in your inventory as a JSON file.</p>
        <a
          href="/api/export"
          download
          className="self-start rounded-md bg-accent px-4 py-2.5 font-bold text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          Export data
        </a>
      </SettingsSection>

      <SettingsSection title="Danger zone">
        <DeleteAccountForm email={email} />
      </SettingsSection>
    </div>
  );
}
