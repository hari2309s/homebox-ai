"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { AnimatedHomeboxIcon, FormField, Input, PasswordInput, Spinner, StaggerItem, StaggerList } from "@homebox-ai/ui";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE } from "../../../lib/password-policy";
import { PasswordStrengthBar } from "../../../lib/password-strength-bar";
import { safeRedirect } from "../../../lib/safe-redirect";

const FEATURES = [
  { icon: "photo_camera", label: "Snap a photo to add", bg: "bg-zone-garden", color: "text-accent" },
  { icon: "forum", label: "Ask where anything is", bg: "bg-card", color: "text-accent" },
  { icon: "map", label: "A plan of your property", bg: "bg-zone-garage", color: "text-[#b0643f]" },
  { icon: "yard", label: "Seasonal garden care", bg: "bg-zone-shed", color: "text-[#7a6a3f]" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirectTo"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function switchMode(next: "sign-in" | "sign-up") {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setInfo(null);
    setName("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const supabase = createSupabaseBrowserClient();

    if (mode === "sign-in") {
      setPending(true);
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setPending(false);
        setError(authError.message);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
      return;
    }

    if (!isPasswordValid(password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    });

    if (authError) {
      setPending(false);
      setError(authError.message);
      return;
    }

    if (!data.session) {
      setPending(false);
      setInfo("Check your email to confirm your account, then sign in.");
      setMode("sign-in");
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setInfo(null);
    setPending(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
    });

    if (authError) {
      setPending(false);
      setError(authError.message);
    }
  }

  const passwordMatch = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <main className="no-scrollbar mx-auto flex h-dvh w-full max-w-md flex-col items-center overflow-y-auto px-5 py-10">
      <div className="m-auto flex w-full flex-col items-center gap-4">
        {/* Icon + Title */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
          className="flex flex-col items-center gap-2.5 text-center"
        >
          {mode === "sign-in" ? (
            <AnimatedHomeboxIcon size={96} />
          ) : (
            <AnimatedHomeboxIcon size={48} />
          )}
          <div>
            <h1 className="font-serif text-[30px] leading-none text-ink">Homebox</h1>
            {mode === "sign-in" && (
              <p className="mt-1.5 max-w-[280px] text-sm leading-snug text-muted">
                Everything in your house, garden and garage, found in seconds.
              </p>
            )}
            {mode === "sign-up" && (
              <p className="mt-0.5 text-[13px] text-muted">Map your home, garden &amp; garage.</p>
            )}
          </div>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.12 }}
          className="flex w-full flex-col gap-3"
        >
          {/* Segmented tab */}
          <div role="tablist" aria-label="Account mode" className="grid grid-cols-2 rounded-xl bg-surface-soft p-[3px] text-sm font-semibold text-center">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "sign-in"}
              onClick={() => switchMode("sign-in")}
              className={`cursor-pointer rounded-[9px] px-3 py-2.5 transition-all ${
                mode === "sign-in"
                  ? "bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]"
                  : "bg-transparent text-muted"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "sign-up"}
              onClick={() => switchMode("sign-up")}
              className={`cursor-pointer rounded-[9px] px-3 py-2.5 transition-all ${
                mode === "sign-up"
                  ? "bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]"
                  : "bg-transparent text-muted"
              }`}
            >
              Create account
            </button>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={pending}
            className="flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-surface-soft disabled:cursor-default disabled:opacity-60"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-ink text-[11px] font-bold">
              G
            </span>
            {mode === "sign-in" ? "Continue with Google" : "Sign up with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2.5 font-mono text-[10px] tracking-wider text-[#9aa49c]">
            <span className="h-px flex-1 bg-border" />
            {mode === "sign-in" ? "OR WITH EMAIL" : "OR"}
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Name field (sign-up only) */}
          <AnimatePresence initial={false}>
            {mode === "sign-up" && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <FormField label="Your name">
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </FormField>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <FormField label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </FormField>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <label htmlFor="login-password" className="text-xs font-semibold text-body">
                Password
              </label>
              {mode === "sign-in" && (
                <Link href="/forgot-password" className="text-xs font-semibold text-accent no-underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <PasswordInput
              id="login-password"
              required
              minLength={mode === "sign-up" ? PASSWORD_MIN_LENGTH : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            />
          </div>

          {/* Password strength bar (sign-up only) */}
          <AnimatePresence initial={false}>
            {mode === "sign-up" && (
              <motion.div
                key="strength"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <PasswordStrengthBar password={password} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirm password (sign-up only) */}
          <AnimatePresence initial={false}>
            {mode === "sign-up" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-confirm-password" className="text-xs font-semibold text-body">
                    Confirm password
                  </label>
                  <div className="relative">
                    <PasswordInput
                      id="login-confirm-password"
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    {passwordMatch && (
                      <span className="material-symbols-rounded pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-lg text-accent">
                        check_circle
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error / Info */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden rounded-xl bg-[#ecdccd] px-3 py-2.5 text-sm text-[#5a2e18]"
              >
                {error}
              </motion.p>
            )}
            {info && (
              <motion.p
                key="info"
                role="status"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden rounded-xl bg-zone-garden px-3 py-2.5 text-sm text-[#2c4d31]"
              >
                {info}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={pending}
            whileHover={pending ? undefined : { scale: 1.01 }}
            whileTap={pending ? undefined : { scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex cursor-pointer items-center justify-center rounded-xl bg-accent px-3 py-[15px] text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-default disabled:opacity-60"
          >
            {pending ? <Spinner size={16} /> : mode === "sign-in" ? "Sign in" : "Create account"}
          </motion.button>

          {/* Terms (sign-up only) */}
          {mode === "sign-up" && (
            <p className="text-center text-[11px] leading-snug text-muted">
              By continuing you agree to the Terms and Privacy Policy.
            </p>
          )}
        </motion.form>

        {/* Features (sign-in only) */}
        {mode === "sign-in" && (
          <StaggerList className="mt-1 grid w-full grid-cols-2 gap-2">
            {FEATURES.map((f) => (
              <StaggerItem key={f.label} className={`flex items-center gap-2 rounded-xl ${f.bg} px-2.5 py-2.5`}>
                <span className={`material-symbols-rounded text-xl ${f.color}`}>{f.icon}</span>
                <span className="text-xs font-semibold leading-tight text-ink">{f.label}</span>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
