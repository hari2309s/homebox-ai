"use client";

import { ConfirmDialog, TapButton } from "@homebox-ai/ui";
import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useState } from "react";

function LogoutIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function LogoutButton({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setError(null);
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/login");
      router.refresh();
    } catch (err) {
      // Signing out failed (e.g. offline) — reset instead of leaving the
      // dialog stuck on a spinner forever, and say so instead of quietly
      // closing as if it had worked.
      setPending(false);
      setConfirmOpen(false);
      setError(err instanceof Error ? err.message : "Couldn't log out");
    }
  }

  function openConfirm() {
    setError(null);
    setConfirmOpen(true);
  }

  return (
    <div className="relative">
      {variant === "row" ? (
        <button
          type="button"
          onClick={openConfirm}
          disabled={pending}
          className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-border bg-card px-3 py-3 disabled:opacity-50"
        >
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[#f3e0d0]">
            <span className="material-symbols-rounded text-[18px] text-clay">logout</span>
          </span>
          <span className="text-[14px] font-semibold text-clay">Sign out</span>
        </button>
      ) : (
        <TapButton
          type="button"
          onClick={openConfirm}
          disabled={pending}
          aria-label="Log out"
          className="cursor-pointer rounded-md border-none bg-transparent p-1 text-ink transition-colors duration-150 hover:text-accent disabled:opacity-50"
        >
          <LogoutIcon className="h-5 w-5 md:h-6 md:w-6" />
        </TapButton>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Log out?"
        confirmLabel="Log out"
        confirming={pending}
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
      {error && (
        <p role="alert" className="absolute right-0 top-full mt-1 w-40 text-right text-xs text-accent-hover">
          {error}
        </p>
      )}
    </div>
  );
}
