import { homeQueries } from "@homebox-ai/db";
import { getSessionUser } from "@homebox-ai/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AvatarUploadForm } from "../avatar-upload-form";
import { CsvImportForm } from "../csv-import-form";
import { DeleteAccountForm } from "../delete-account-form";
import { DisplayNameForm } from "../display-name-form";
import { HomeLocationForm } from "../home-location-form";
import { HouseholdSection } from "../household-section";
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

/** J10 mobile hub rows — colored icon backgrounds, subtitles, and optional danger styling. */
const MOBILE_ROWS: {
  slug: string;
  icon: string;
  title: string;
  sub: string;
  ibg: string;
  ic: string;
  bg?: string;
  bd?: string;
  tc?: string;
}[] = [
  { slug: "household", icon: "diversity_3", title: "Household", sub: "Your household members", ibg: "#dde6f0", ic: "#2c4767" },
  { slug: "password", icon: "key", title: "Password", sub: "Change your password", ibg: "#e9e8e1", ic: "#1f2622" },
  { slug: "appearance", icon: "contrast", title: "Appearance", sub: "Light, dark or system", ibg: "#f3eef6", ic: "#5a3d6b" },
  { slug: "data", icon: "swap_vert", title: "Your data", sub: "Export or import JSON, CSV, ZIP", ibg: "#e7e1d0", ic: "#5a4f33" },
  { slug: "danger", icon: "warning", title: "Danger zone", sub: "Delete account", bg: "#fbf1ec", bd: "#d9a58a", ibg: "#ecdccd", ic: "#7a3f22", tc: "#5a2e18" },
];

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
    ? "border-[1.5px] border-danger-line bg-danger-faint"
    : "border border-border bg-card";
  return (
    <section
      id={slug}
      aria-labelledby={`${slug}-title`}
      className={`flex scroll-mt-4 flex-col gap-2 lg:gap-[18px] ${slug === active ? "" : "hidden"}`}
    >
      {/* Mobile back + eyebrow header */}
      <div className="flex items-center gap-3 lg:hidden">
        <Link href="/settings" className="flex items-center justify-center text-ink no-underline">
          <span className="material-symbols-rounded">arrow_back</span>
        </Link>
        <span className={`font-mono text-[10px] tracking-wide ${danger ? "text-danger" : "text-muted"}`}>
          {meta.eyebrow}
        </span>
      </div>
      {/* Desktop eyebrow + title */}
      <div className="hidden lg:block">
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

function UserCard({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}) {
  const initial = (displayName || email || "?").trim().charAt(0).toUpperCase();
  return (
    <Link
      href="/settings/profile"
      className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-[10px_12px] no-underline"
    >
      <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full bg-[#dfe8d6]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-serif text-[20px] text-[#2c4d31]">{initial}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-ink">{displayName || email}</div>
        {displayName && <div className="truncate text-[12px] text-muted">{email}</div>}
      </div>
      <span className="text-[13px] font-semibold text-accent">Edit</span>
    </Link>
  );
}

function MobileHub({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 p-4 lg:hidden">
      <h1 className="m-0 px-[2px] pb-[6px] font-serif text-[28px] font-normal leading-none text-ink">Settings</h1>
      <UserCard displayName={displayName} email={email} avatarUrl={avatarUrl} />
      {MOBILE_ROWS.map((row) => (
        <Link
          key={row.slug}
          href={`/settings/${row.slug}`}
          className="flex min-h-[56px] items-center gap-3 rounded-[14px] border px-3 no-underline"
          style={{
            background: row.bg ?? "#fff",
            borderColor: row.bd ?? "#d9dbd2",
          }}
        >
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px]"
            style={{ background: row.ibg }}
          >
            <span className="material-symbols-rounded text-[18px]" style={{ color: row.ic }}>
              {row.icon}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold" style={{ color: row.tc ?? "#1f2622" }}>
              {row.title}
            </div>
            <div className="truncate text-[12px] text-muted">{row.sub}</div>
          </div>
          <span className="material-symbols-rounded text-[#a3aba5]">expand_more</span>
        </Link>
      ))}
      <div className="pb-4 pt-2 text-center font-mono text-[10px] text-muted">HOMEBOX · SETTINGS</div>
    </div>
  );
}

export default async function SettingsPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const [{ section }, user] = await Promise.all([params, getSessionUser()]);
  if (!user) redirect("/login");
  if (section && (section.length > 1 || !SECTIONS.some((s) => s.slug === section[0]))) notFound();

  const isHub = !section;
  const active = (section?.[0] ?? "profile") as Slug;

  const email = user.email ?? "";
  const displayName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const home = await homeQueries.getHomeLocation(user.id);

  return (
    <div data-full-bleed className="flex h-full flex-col lg:flex-row">
      {/* Desktop sidebar nav — always visible on large screens */}
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
              } ${s.slug === "danger" ? "text-clay" : "text-ink"}`}
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

      {/* Mobile hub — shown when no section is selected */}
      {isHub && <MobileHub displayName={displayName} email={email} avatarUrl={avatarUrl} />}

      {/* Section content — on mobile only visible when a section is explicitly selected,
          on desktop always visible (sidebar selects which one) */}
      <div
        data-scroll-container
        className={`min-w-0 flex-1 flex-col gap-[22px] overflow-y-auto p-4 lg:flex lg:px-9 lg:py-7 ${isHub ? "hidden" : "flex"}`}
      >
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

        <SettingsSection slug="appearance" active={active}>
          <span className="text-[12px] font-semibold text-body">Theme</span>
          <ThemeSwitcher />
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
          <HouseholdSection selfEmail={email} selfName={displayName} />
          <HomeLocationForm current={home?.placeName ?? null} />
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
      </div>
    </div>
  );
}
