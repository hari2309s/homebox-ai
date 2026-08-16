"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { Button, Input, Spinner } from "@homebox-ai/ui";
import type { FormEvent } from "react";
import { useState } from "react";

import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE } from "../../../lib/password-policy";
import { PasswordRequirementsList } from "../../../lib/password-requirements-list";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (!isPasswordValid(password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    const supabase = createSupabaseBrowserClient();
    // current_password (snake_case — passed straight through to GoTrue) is
    // required because the project has
    // GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD enabled; the
    // update fails without it.
    const { error: authError } = await supabase.auth.updateUser({ password, current_password: currentPassword });

    setPending(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Current password
        <Input
          type="password"
          required
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
            setSaved(false);
          }}
          autoComplete="current-password"
        />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          New password
          <Input
            type="password"
            minLength={PASSWORD_MIN_LENGTH}
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
            minLength={PASSWORD_MIN_LENGTH}
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
      <PasswordRequirementsList password={password} />
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending || !currentPassword || !password || !confirmPassword}
          className="self-start"
        >
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
