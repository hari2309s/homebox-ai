"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { Button, Spinner } from "@homebox-ai/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthShell } from "../auth-shell";

const inputClassName =
  "rounded-md border border-border bg-white px-3.5 py-2.5 text-base font-normal text-body outline-none transition-shadow duration-150 focus:border-accent focus:ring-4 focus:ring-accent/20";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setPending(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    // Same confirmation either way — revealing whether an email is
    // registered would be a user-enumeration leak.
    setSent(true);
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-ink">Reset your password</h2>
        <p className="text-sm text-muted">We&apos;ll email you a link to set a new one.</p>
      </div>

      {sent ? (
        <p className="text-sm text-body">
          If an account exists for that email, a reset link is on its way — check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className={inputClassName}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner size={16} /> : "Send reset link"}
          </Button>
        </form>
      )}

      <Link href="/login" className="self-center text-sm font-semibold text-ink underline underline-offset-4">
        Back to sign in
      </Link>
    </AuthShell>
  );
}
