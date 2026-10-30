"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { Button, FormField, Input, WalkingDots } from "@homebox-ai/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthShell } from "../auth-shell";

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
    setSent(true);
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl text-ink">Reset your password</h2>
        <p className="text-sm text-muted">We&apos;ll email you a link to set a new one.</p>
      </div>

      {sent ? (
        <p className="text-sm leading-relaxed text-body">
          If an account exists for that email, a reset link is on its way — check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </FormField>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? <WalkingDots size={6} /> : "Send reset link"}
          </Button>
        </form>
      )}

      <Link href="/login" className="self-center text-sm font-semibold text-accent no-underline">
        Back to sign in
      </Link>
    </AuthShell>
  );
}
