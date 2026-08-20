"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { Button, FormField, PasswordInput, Spinner } from "@homebox-ai/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE } from "../../../lib/password-policy";
import { PasswordRequirementsList } from "../../../lib/password-requirements-list";
import { AuthShell } from "../auth-shell";

/**
 * Reached only via the emailed reset link, which lands on /auth/callback
 * first — that route exchanges the recovery code for a real session before
 * redirecting here, so `updateUser` below works the same as it would for an
 * already-logged-in user. Middleware already bounces anyone without a
 * session to /login, so no separate guard is needed here.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

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
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setPending(false);
      setError(authError.message);
      return;
    }

    router.replace("/items");
    router.refresh();
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-ink">Choose a new password</h2>
        <p className="text-sm text-muted">Make it a strong one — you&apos;ll use it to sign in from now on.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="New password">
          <PasswordInput
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </FormField>
        <PasswordRequirementsList password={password} />
        <FormField label="Confirm password">
          <PasswordInput
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </FormField>
        {error && (
          <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner size={16} /> : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
