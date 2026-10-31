import { homeQueries, sharingQueries } from "@homebox-ai/db";
import { getSessionUser } from "@homebox-ai/supabase/server";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AvatarUploadForm } from "../avatar-upload-form";
import { CsvImportForm } from "../csv-import-form";
import { DeleteAccountForm } from "../delete-account-form";
import { DesktopSettingsShell, type DesktopSection } from "../desktop-settings-shell";
import { DisplayNameForm } from "../display-name-form";
import { HomeLocationForm } from "../home-location-form";
import { HouseholdSection } from "../household-section";
import { MobileSettingsAccordion, type AccordionRow } from "../mobile-settings-accordion";
import { PasswordForm } from "../password-form";
import { ThemeSwitcher } from "../../theme-switcher";
import { ZipImportForm } from "../zip-import-form";

const SECTIONS = [
  {
    slug: "profile",
    label: "Profile",
    icon: "person",
    eyebrow: "PROFILE",
    title: "How you show up",
    noteTitle: "Who sees this",
    note: "Your name and photo show on reminders you're assigned, in the household list and on things you add.",
  },
  {
    slug: "account",
    label: "Account",
    icon: "mail",
    eyebrow: "ACCOUNT",
    title: "Your sign-in",
    noteTitle: "Signing in",
    note: "This email is how you sign in and where invites and receipts go. Changing it isn't supported yet.",
  },
  {
    slug: "appearance",
    label: "Appearance",
    icon: "contrast",
    eyebrow: "APPEARANCE",
    title: "Day or night",
    noteTitle: "Following your device",
    note: "System switches with your phone or computer's light and dark mode. Your choice is remembered on this device.",
  },
  {
    slug: "password",
    label: "Password",
    icon: "key",
    eyebrow: "PASSWORD",
    title: "Keep it locked",
    noteTitle: "A good password",
    note: "At least 10 characters, with an uppercase letter, a lowercase letter, a number and a symbol. The checklist ticks off as you type.",
  },
  {
    slug: "household",
    label: "Household",
    icon: "diversity_3",
    eyebrow: "HOUSEHOLD",
    title: "Who looks after the place",
  },
  {
    slug: "data",
    label: "Your data",
    icon: "swap_vert",
    eyebrow: "YOUR DATA",
    title: "Take it with you",
    noteTitle: "What's in each export",
    note: "JSON has everything and can be imported again. CSV is the items list for spreadsheets. ZIP adds every photo and receipt. Importing only adds; it never replaces.",
  },
  {
    slug: "danger",
    label: "Danger zone",
    icon: "warning",
    eyebrow: "DANGER ZONE",
    title: "Leave Homebox",
    noteTitle: "Before you go",
    note: "Export your data first from Your data if you want a copy. Deleting your account can't be undone.",
  },
] as const;

type Slug = (typeof SECTIONS)[number]["slug"];

function SettingsSection({
  slug,
  children,
  aside,
}: {
  slug: Slug;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const meta = SECTIONS.find((s) => s.slug === slug)!;
  const danger = slug === "danger";
  const card = danger
    ? "border-[1.5px] border-danger-line bg-danger-faint"
    : "border border-border bg-card";
  return (
    <section
      id={slug}
      aria-labelledby={`${slug}-title`}
      className="flex scroll-mt-4 flex-col gap-2 lg:gap-[18px]"
    >
      <div>
        <div className={`font-mono text-[10px] ${danger ? "text-danger" : "text-muted"}`}>
          {meta.eyebrow}
        </div>
        <h2 id={`${slug}-title`} className="m-0 font-serif text-[28px] font-normal text-ink">
          {meta.title}
        </h2>
      </div>
      <div className="grid gap-[18px] lg:max-w-[1120px] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <div className={`flex flex-col gap-3 rounded-[14px] p-[14px] lg:p-4 ${card}`}>{children}</div>
        {aside ? (
          <div className="flex flex-col gap-[14px]">{aside}</div>
        ) : "note" in meta ? (
          <div className="hidden flex-col gap-2 rounded-[14px] border border-border bg-card p-4 lg:flex">
            <span className="text-[14px] font-semibold text-ink">{meta.noteTitle}</span>
            <span className="text-[13px] leading-normal text-muted">{meta.note}</span>
          </div>
        ) : null}
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
  const [home, householdUsers] = await Promise.all([
    homeQueries.getHomeLocation(user.id),
    sharingQueries.listHouseholdUsers(user.id),
  ]);

  // Build household subtitle with real names: "Hari, Kamala · Dora invited"
  const memberNames = householdUsers
    .filter((u) => !u.isSelf)
    .map((u) => u.name?.split(" ")[0] ?? u.email?.split("@")[0] ?? "Member");
  const householdSub =
    memberNames.length > 0
      ? memberNames.join(", ")
      : "Invite a family member";

  // Section content shared between mobile accordion and desktop panel
  const householdContent = (
    <>
      <HouseholdSection selfEmail={email} selfName={displayName} />
      <HomeLocationForm current={home?.placeName ?? null} />
    </>
  );
  const passwordContent = <PasswordForm />;
  const appearanceContent = (
    <>
      <span className="text-[12px] font-semibold text-body">Theme</span>
      <ThemeSwitcher />
    </>
  );
  const dataContent = (
    <>
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
    </>
  );
  const dangerContent = <DeleteAccountForm email={email} />;

  const profileContent = (
    <>
      <AvatarUploadForm userId={user.id} currentAvatarUrl={avatarUrl} />
      <DisplayNameForm initialName={displayName} />
    </>
  );

  const accordionRows: AccordionRow[] = [
    { slug: "household", icon: "diversity_3", title: "Household", sub: householdSub, ibg: "#dde6f0", ic: "#2c4767", content: householdContent },
    { slug: "password", icon: "key", title: "Password", sub: "Change your password", ibg: "#e9e8e1", ic: "#1f2622", content: passwordContent },
    { slug: "appearance", icon: "contrast", title: "Appearance", sub: "Light, dark or system", ibg: "#f3eef6", ic: "#5a3d6b", content: appearanceContent },
    { slug: "data", icon: "swap_vert", title: "Your data", sub: "Export or import JSON, CSV, ZIP", ibg: "#e7e1d0", ic: "#5a4f33", content: dataContent },
    { slug: "danger", icon: "warning", title: "Danger zone", sub: "Delete account", bg: "#fbf1ec", bd: "#d9a58a", ibg: "#ecdccd", ic: "#7a3f22", tc: "#5a2e18", content: dangerContent },
  ];

  const desktopSections: DesktopSection[] = SECTIONS.map((s) => ({
    slug: s.slug,
    label: s.label,
    icon: s.icon,
    danger: s.slug === "danger",
  }));

  const desktopContent: Record<string, ReactNode> = {
    profile: (
      <SettingsSection slug="profile">
        <AvatarUploadForm userId={user.id} currentAvatarUrl={avatarUrl} />
        <DisplayNameForm initialName={displayName} />
      </SettingsSection>
    ),
    account: (
      <SettingsSection slug="account">
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
    ),
    appearance: (
      <SettingsSection slug="appearance">
        {appearanceContent}
      </SettingsSection>
    ),
    password: (
      <SettingsSection slug="password">
        {passwordContent}
      </SettingsSection>
    ),
    household: (
      <SettingsSection
        slug="household"
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
        {householdContent}
      </SettingsSection>
    ),
    data: (
      <SettingsSection slug="data">
        {dataContent}
      </SettingsSection>
    ),
    danger: (
      <SettingsSection slug="danger">
        {dangerContent}
      </SettingsSection>
    ),
  };

  return (
    <div data-full-bleed className="flex h-full flex-col lg:flex-row">
      {/* Desktop: client-side section switching (no page navigation) */}
      <DesktopSettingsShell sections={desktopSections} initialSlug={active} content={desktopContent} />

      {/* Mobile accordion — all sections expand inline */}
      <MobileSettingsAccordion
        displayName={displayName}
        email={email}
        avatarUrl={avatarUrl}
        profileContent={profileContent}
        rows={accordionRows}
      />
    </div>
  );
}
