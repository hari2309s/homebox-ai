"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { Button, Input, Spinner } from "@homebox-ai/ui";
import type { FormEvent } from "react";
import { useState } from "react";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    setPending(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          New password
          <Input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setSaved(false);
            }}
            autoComplete="new-password"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Confirm password
          <Input
            type="password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setSaved(false);
            }}
            autoComplete="new-password"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !password || !confirmPassword} className="self-start">
          {pending ? <Spinner size={16} /> : "Update password"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-accent-hover">
            {error}
          </p>
        )}
        {saved && !error && <p className="text-sm text-muted">Password updated.</p>}
      </div>
    </form>
  );
}
