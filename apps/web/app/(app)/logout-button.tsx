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

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      // Signing out failed (e.g. offline) — reset instead of leaving the
      // dialog stuck on a spinner forever.
      setPending(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <TapButton
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        aria-label="Log out"
        className="cursor-pointer rounded-md border-none bg-transparent p-1 text-ink transition-colors duration-150 hover:text-accent disabled:opacity-50"
      >
        <LogoutIcon className="h-5 w-5 md:h-6 md:w-6" />
      </TapButton>
      <ConfirmDialog
        open={confirmOpen}
        title="Log out?"
        confirmLabel="Log out"
        confirming={pending}
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
