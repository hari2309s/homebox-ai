"use client";

import { Input, SubmitButton } from "@homebox-ai/ui";
import { useState } from "react";

import { deleteAccountAction } from "./actions";

export function DeleteAccountForm({ email }: { email: string }) {
  const [confirmText, setConfirmText] = useState("");
  const confirmed = confirmText.trim().toLowerCase() === email.toLowerCase();

  return (
    <form action={deleteAccountAction} className="flex flex-col gap-3">
      <p className="text-sm text-body">
        This permanently deletes your account and all of its data — items, locations, labels, attachments, and
        chat history. This can&apos;t be undone.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Type <span className="font-mono">{email}</span> to confirm
        <Input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} autoComplete="off" />
      </label>
      <SubmitButton disabled={!confirmed} className="self-start">
        Delete my account
      </SubmitButton>
    </form>
  );
}
