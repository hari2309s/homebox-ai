import { getSessionUser } from "@homebox-ai/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AvatarUploadForm } from "./avatar-upload-form";
import { CsvImportForm } from "./csv-import-form";
import { DeleteAccountForm } from "./delete-account-form";
import { DisplayNameForm } from "./display-name-form";
import { HouseholdSection } from "./household-section";
import { PasswordForm } from "./password-form";
import { ZipImportForm } from "./zip-import-form";

function SettingsSection({ label, children, danger }: { label: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className="flex flex-col gap-2">
      <div
        className="px-1 font-mono text-[10px] tracking-wide"
        style={{ color: danger ? "#7a3f22" : undefined }}
      >
        {label}
      </div>
      <div
        className="flex flex-col gap-3 rounded-[14px] border p-[14px]"
        style={
          danger
            ? { background: "#fbf1ec", borderColor: "#d9a58a", borderWidth: "1.5px" }
            : { background: "var(--color-card)", borderColor: "var(--color-border)" }
        }
      >
        {children}
      </div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const email = user.email ?? "";
  const displayName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  return (
    <div data-scroll-container className="flex h-full flex-col gap-[22px] overflow-y-auto p-4">
      <div className="px-1">
        <div className="font-serif text-[30px] leading-none text-ink">Settings</div>
      </div>

      <SettingsSection label="PROFILE">
        <AvatarUploadForm userId={user.id} currentAvatarUrl={avatarUrl} />
        <DisplayNameForm initialName={displayName} />
      </SettingsSection>

      <SettingsSection label="ACCOUNT">
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-[11px]">
          <span className="flex-1 text-[15px] text-ink">{email}</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-accent">
            <span className="material-symbols-rounded text-[16px]">verified</span>
            Verified
          </span>
        </div>
      </SettingsSection>

      <SettingsSection label="PASSWORD">
        <PasswordForm />
      </SettingsSection>

      <SettingsSection label="HOUSEHOLD">
        <HouseholdSection />
      </SettingsSection>

      <SettingsSection label="YOUR DATA">
        <div className="text-[14px] font-semibold text-ink">Export</div>
        <div className="grid grid-cols-3 gap-[6px]">
          <a
            href="/api/export"
            download
            className="flex flex-col gap-1 rounded-[10px] border border-border p-[10px] no-underline"
          >
            <span className="material-symbols-rounded text-[20px] text-accent">data_object</span>
            <span className="font-mono text-xs text-ink">JSON</span>
            <span className="text-[11px] leading-snug text-muted">Full inventory data</span>
          </a>
          <a
            href="/api/export/csv"
            download
            className="flex flex-col gap-1 rounded-[10px] border border-border p-[10px] no-underline"
          >
            <span className="material-symbols-rounded text-[20px] text-accent">table_chart</span>
            <span className="font-mono text-xs text-ink">CSV</span>
            <span className="text-[11px] leading-snug text-muted">Items as spreadsheet</span>
          </a>
          <a
            href="/api/export/zip"
            download
            className="flex flex-col gap-1 rounded-[10px] border border-border p-[10px] no-underline"
          >
            <span className="material-symbols-rounded text-[20px] text-accent">folder_zip</span>
            <span className="font-mono text-xs text-ink">ZIP</span>
            <span className="text-[11px] leading-snug text-muted">Full backup + photos</span>
          </a>
        </div>
        <div className="border-t border-border pt-3 text-[14px] font-semibold text-ink">Import</div>
        <CsvImportForm />
        <ZipImportForm />
      </SettingsSection>

      <SettingsSection label="DANGER ZONE" danger>
        <DeleteAccountForm email={email} />
      </SettingsSection>

      <div className="pb-4 text-center font-mono text-[10px] text-muted">
        HOMEBOX · SIGN OUT
      </div>
    </div>
  );
}
