import { getSessionUser } from "@homebox-ai/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { CsvImportForm } from "./csv-import-form";
import { DeleteAccountForm } from "./delete-account-form";
import { DisplayNameForm } from "./display-name-form";
import { HouseholdSection } from "./household-section";
import { PasswordForm } from "./password-form";
import { ZipImportForm } from "./zip-import-form";

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

      <SettingsSection title="Household">
        <HouseholdSection />
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

        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm text-body">Export or import items as a CSV spreadsheet.</p>
          <a
            href="/api/export/csv"
            download
            className="self-start text-sm font-semibold text-ink underline underline-offset-4"
          >
            Export items as CSV
          </a>
          <CsvImportForm />
        </div>

        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm text-body">
            Full backup as a ZIP, including photos and other attachment files. Importing adds to your inventory — it
            never replaces or deletes what&apos;s already there.
          </p>
          <a
            href="/api/export/zip"
            download
            className="self-start text-sm font-semibold text-ink underline underline-offset-4"
          >
            Export full backup (ZIP)
          </a>
          <ZipImportForm />
        </div>
      </SettingsSection>

      <SettingsSection title="Danger zone">
        <DeleteAccountForm email={email} />
      </SettingsSection>
    </div>
  );
}
