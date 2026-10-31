"use client";

import { useCallback, useState, type ReactNode } from "react";

export interface DesktopSection {
  slug: string;
  label: string;
  icon: string;
  danger?: boolean;
}

interface Props {
  sections: DesktopSection[];
  initialSlug: string;
  content: Record<string, ReactNode>;
}

export function DesktopSettingsShell({ sections, initialSlug, content }: Props) {
  const [active, setActive] = useState(initialSlug);

  const handleClick = useCallback((slug: string) => {
    setActive(slug);
    window.history.replaceState(null, "", `/settings/${slug}`);
  }, []);

  return (
    <>
      <nav
        aria-label="Settings sections"
        className="hidden w-[240px] flex-none flex-col gap-1 border-r border-border px-4 py-7 lg:flex"
      >
        <h1 className="m-0 px-[10px] pb-[14px] font-serif text-[28px] font-normal text-ink">Settings</h1>
        {sections.map((s) => {
          const isCurrent = s.slug === active;
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => handleClick(s.slug)}
              aria-current={isCurrent ? "page" : undefined}
              className={`flex h-10 cursor-pointer items-center gap-[10px] rounded-[10px] border-none bg-transparent px-[10px] text-left text-[14px] font-semibold ${
                isCurrent ? "bg-selected" : "hover:bg-surface-soft"
              } ${s.danger ? "text-clay" : "text-ink"}`}
            >
              <span
                aria-hidden
                className="material-symbols-rounded text-[19px]"
                style={{ fontVariationSettings: isCurrent ? "'FILL' 1" : undefined }}
              >
                {s.icon}
              </span>
              {s.label}
            </button>
          );
        })}
      </nav>

      <div
        data-scroll-container
        className="hidden min-w-0 flex-1 flex-col gap-[22px] overflow-y-auto p-4 lg:flex lg:px-9 lg:py-7"
      >
        {sections.map((s) => (
          <div key={s.slug} className={s.slug === active ? "" : "hidden"}>
            {content[s.slug]}
          </div>
        ))}
      </div>
    </>
  );
}
