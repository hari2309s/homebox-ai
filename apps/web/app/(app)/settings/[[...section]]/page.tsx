import { getSessionUser } from "@homebox-ai/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AvatarUploadForm } from "../avatar-upload-form";
import { CsvImportForm } from "../csv-import-form";
import { DeleteAccountForm } from "../delete-account-form";
import { DisplayNameForm } from "../display-name-form";
import { HouseholdSection } from "../household-section";
import { PasswordForm } from "../password-form";
import { ZipImportForm } from "../zip-import-form";

const SECTIONS = [
  { slug: "profile", label: "Profile", icon: "person", eyebrow: "PROFILE", title: "How you show up" },
  { slug: "account", label: "Account", icon: "mail", eyebrow: "ACCOUNT", title: "Your sign-in" },
  { slug: "password", label: "Password", icon: "key", eyebrow: "PASSWORD", title: "Keep it locked" },
  {
    slug: "household",
    label: "Household",
    icon: "diversity_3",
    eyebrow: "HOUSEHOLD",
    title: "Who looks after the place",
  },
  { slug: "data", label: "Your data", icon: "swap_vert", eyebrow: "YOUR DATA", title: "Take it with you" },
  { slug: "danger", label: "Danger zone", icon: "warning", eyebrow: "DANGER ZONE", title: "Leave Homebox" },
] as const;

type Slug = (typeof SECTIONS)[number]["slug"];

function SettingsSection({
  slug,
  active,
  children,
  aside,
}: {
  slug: Slug;
  active: Slug;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const meta = SECTIONS.find((s) => s.slug === slug)!;
  const danger = slug === "danger";
  const card = danger
    ? "border-[1.5px] border-[#d9a58a] bg-[#fbf1ec] dark:border-[#6b3d28] dark:bg-[#2a1d16]"
    : "border border-border bg-card";
  return (
    <section
      id={slug}
      aria-labelledby={`${slug}-title`}
      className={`flex scroll-mt-4 flex-col gap-2 lg:gap-[18px] ${slug === active ? "" : "lg:hidden"}`}
    >
      <div
        className={`px-1 font-mono text-[10px] tracking-wide lg:hidden ${danger ? "text-[#7a3f22] dark:text-[#e7a582]" : "text-muted"}`}
      >
        {meta.eyebrow}
      </div>
      <div className="hidden lg:block">
        <div className={`font-mono text-[10px] ${danger ? "text-[#7a3f22] dark:text-[#e7a582]" : "text-muted"}`}>
          {meta.eyebrow}
        </div>
        <h2 id={`${slug}-title`} className="m-0 font-serif text-[28px] font-normal text-ink">
          {meta.title}
        </h2>
      </div>
      <div
        className={
          aside ? "grid gap-[18px] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start" : "lg:max-w-[640px]"
        }
      >
        <div className={`flex flex-col gap-3 rounded-[14px] p-[14px] lg:p-4 ${card}`}>{children}</div>
        {aside && <div className="flex flex-col gap-[14px]">{aside}</div>}
      </div>
    </section>
  );
}

export default async function SettingsPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const [{ section }, user] = await Promise.all([params, getSessionUser()]);
  if (!user) redirect("/login");
  if (section && (section.length > 1 || !SECTIONS.some((s) => s.slug === section[0]))) notFound();
  const active = (section?.[0] ?? "profile") as Slug;

  const email = user.email ?? "";
  const displayName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <nav
        aria-label="Settings sections"
        className="hidden w-[240px] flex-none flex-col gap-1 border-r border-border px-4 py-7 lg:flex"
      >
        <h1 className="m-0 px-[10px] pb-[14px] font-serif text-[28px] font-normal text-ink">Settings</h1>
        {SECTIONS.map((s) => {
          const isActive = s.slug === active;
          return (
            <Link
              key={s.slug}
              href={`/settings/${s.slug}`}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-10 items-center gap-[10px] rounded-[10px] px-[10px] text-[14px] font-semibold no-underline ${
                isActive ? "bg-selected" : "hover:bg-surface-soft"
              } ${s.slug === "danger" ? "text-[#b0643f]" : "text-ink"}`}
            >
              <span
                aria-hidden
                className="material-symbols-rounded text-[19px]"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}
              >
                {s.icon}
              </span>
              {s.label}
            </Link>
          );
        })}
      </nav>

      <div
        data-scroll-container
        className="flex min-w-0 flex-1 flex-col gap-[22px] overflow-y-auto p-4 lg:px-9 lg:py-7"
      >
        <div className="px-1 lg:hidden">
          <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">Settings</h1>
        </div>

        <SettingsSection slug="profile" active={active}>
          <AvatarUploadForm userId={user.id} currentAvatarUrl={avatarUrl} />
          <DisplayNameForm initialName={displayName} />
        </SettingsSection>

        <SettingsSection slug="account" active={active}>
          <span className="text-xs font-semibold text-body">Email</span>
          <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-[11px]">
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{email}</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-accent">
              <span aria-hidden className="material-symbols-rounded text-[16px]">
                verified
              </span>
              Verified
            </span>
          </div>
          <span className="text-xs text-muted">Used for invites and receipts.</span>
        </SettingsSection>

        <SettingsSection slug="password" active={active}>
          <PasswordForm />
        </SettingsSection>

        <SettingsSection
          slug="household"
          active={active}
          aside={
            <div className="hidden flex-col gap-2 rounded-[14px] border border-border bg-card p-4 lg:flex">
              <span className="text-[14px] font-semibold text-ink">Roles</span>
              <span className="text-[13px] leading-normal text-muted">
                The owner can invite and remove members. Members can add, edit and move anything in the household, and
                can leave it at any time.
              </span>
            </div>
          }
        >
          <HouseholdSection />
        </SettingsSection>

        <SettingsSection slug="data" active={active}>
          <div className="text-[14px] font-semibold text-ink">Export</div>
          <div className="grid grid-cols-3 gap-[6px]">
            {[
              { href: "/api/export", icon: "data_object", format: "JSON", note: "Full inventory data" },
              { href: "/api/export/csv", icon: "table_chart", format: "CSV", note: "Items as spreadsheet" },
              { href: "/api/export/zip", icon: "folder_zip", format: "ZIP", note: "Full backup + photos" },
            ].map((x) => (
              <a
                key={x.format}
                href={x.href}
                download
                className="flex flex-col gap-1 rounded-[10px] border border-border p-[10px] no-underline hover:border-accent"
              >
                <span aria-hidden className="material-symbols-rounded text-[20px] text-accent">
                  {x.icon}
                </span>
                <span className="font-mono text-xs text-ink">{x.format}</span>
                <span className="text-[11px] leading-snug text-muted">{x.note}</span>
              </a>
            ))}
          </div>
          <div className="border-t border-border pt-3 text-[14px] font-semibold text-ink">Import</div>
          <CsvImportForm />
          <ZipImportForm />
        </SettingsSection>

        <SettingsSection slug="danger" active={active}>
          <DeleteAccountForm email={email} />
        </SettingsSection>

        <div className="pb-4 text-center font-mono text-[10px] text-muted lg:hidden">HOMEBOX · SETTINGS</div>
      </div>
    </div>
  );
}
