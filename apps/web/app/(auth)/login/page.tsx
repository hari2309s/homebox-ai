"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import {
  AnimatedHomeboxIcon,
  FormField,
  Input,
  PasswordInput,
  StaggerItem,
  StaggerList,
  WalkingDots,
} from "@homebox-ai/ui";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE } from "../../../lib/password-policy";
import { PasswordStrengthBar } from "../../../lib/password-strength-bar";
import { JOIN_PATH, PENDING_JOIN_COOKIE } from "../../../lib/pending-join";
import { safeRedirect } from "../../../lib/safe-redirect";

const FEATURES = [
  { icon: "photo_camera", label: "Snap a photo to add", bg: "bg-zone-garden", color: "text-accent" },
  { icon: "forum", label: "Ask where anything is", bg: "bg-card", color: "text-accent" },
  { icon: "map", label: "A plan of your property", bg: "bg-zone-garage", color: "text-clay" },
  { icon: "yard", label: "Seasonal garden care", bg: "bg-zone-shed", color: "text-zone-shed-ink" },
];

const AUTH_ERRORS: Record<string, string> = {
  confirmation_failed: "That confirmation link didn't work. It may have expired. Try signing in, or sign up again.",
  oauth_failed: "Signing in didn't finish. Please try again.",
  link_expired: "That link has expired. Sign in, or ask for a new one.",
};

const AUTH_NOTICES: Record<string, string> = {
  confirmed_elsewhere: "Your email is confirmed. Sign in to continue.",
};

function useResend(email: string, emailRedirectTo: string) {
  const [cooldown, setCooldown] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    setResendError(null);
    const { error } = await createSupabaseBrowserClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo },
    });
    if (error) setResendError(error.message);
    else setCooldown(60);
  }

  return { cooldown, resend, resendError };
}

/** J7 #40 — shown after sign-up until the email is confirmed (in any tab of this browser), then moves on. */
function ConfirmPending({
  email,
  emailRedirectTo,
  onConfirmed,
  onChangeEmail,
}: {
  email: string;
  emailRedirectTo: string;
  onConfirmed: () => void;
  onChangeEmail: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const { cooldown, resend, resendError } = useResend(email, emailRedirectTo);
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    // Confirming in another tab of this browser signs it in via the shared session cookie.
    const timer = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        clearInterval(timer);
        setConfirmed(true);
        setTimeout(() => onConfirmedRef.current(), 800);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col px-6 pb-[34px] pt-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <AnimatedHomeboxIcon size={96} />
        <div className="font-mono text-[11px] text-accent">ONE LAST STEP</div>
        <h1 className="m-0 font-serif text-[30px] font-normal leading-[1.1] text-ink">
          Check your email to confirm your account
        </h1>
        <p className="m-0 text-[15px] leading-[1.55] text-muted">
          We sent a link to <b className="text-ink">{email}</b>. Tap it and you&apos;ll land straight on your new plot.
        </p>
        <div
          className="flex w-full flex-col gap-2 rounded-[14px] border border-border bg-card px-[14px] py-3 text-left"
          aria-live="polite"
        >
          <span className="flex items-center gap-2 text-[13px] text-body">
            <span aria-hidden className="material-symbols-rounded text-[18px] text-accent">
              check_circle
            </span>
            Account created
          </span>
          <span className="flex items-center gap-2 text-[13px] text-body">
            <span
              aria-hidden
              className={`material-symbols-rounded text-[18px] ${confirmed ? "text-accent" : "text-warn"}`}
            >
              {confirmed ? "check_circle" : "pending"}
            </span>
            {confirmed ? "Confirmed. Taking you in…" : "Waiting for you to confirm…"}
          </span>
        </div>
        {resendError && (
          <p role="alert" className="m-0 text-[13px] text-clay">
            {resendError}
          </p>
        )}
      </div>
      <div className="flex flex-col items-center gap-[10px]">
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="w-full cursor-pointer rounded-xl border border-border bg-card py-[13px] text-[15px] font-semibold text-ink disabled:cursor-default disabled:opacity-60"
        >
          {cooldown > 0 ? `Sent ✓ · resend in ${cooldown}s` : "Resend email"}
        </button>
        <span className="text-[14px] text-muted">
          Wrong address?{" "}
          <button
            type="button"
            onClick={onChangeEmail}
            className="cursor-pointer border-none bg-transparent p-0 text-[14px] font-semibold text-accent"
          >
            Change it
          </button>
        </span>
      </div>
    </main>
  );
}

/** J7 #41 — signing in before confirming. */
function UnconfirmedNotice({ email, emailRedirectTo }: { email: string; emailRedirectTo: string }) {
  const { cooldown, resend, resendError } = useResend(email, emailRedirectTo);
  return (
    <div role="alert" className="flex items-start gap-[10px] rounded-xl bg-warn-soft p-3">
      <span aria-hidden className="material-symbols-rounded text-warn">
        mark_email_unread
      </span>
      <div className="flex flex-1 flex-col gap-2">
        <span className="text-[13px] leading-normal text-warn-ink">
          <b>Confirm your email first.</b> We sent a link to {email} when you signed up.
        </span>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="self-start cursor-pointer rounded-lg border-none bg-card px-3 py-[6px] text-[13px] font-semibold text-ink disabled:opacity-60"
        >
          {cooldown > 0 ? `Sent ✓ (${cooldown}s)` : "Resend link"}
        </button>
        {resendError && <span className="text-[12px] text-clay">{resendError}</span>}
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirectTo"));
  const joining = JOIN_PATH.test(redirectTo);

  // A new family member signing up has to confirm their email first, and that link can land in a fresh
  // tab with no memory of the invite. Remember it so /auth/callback and /auth/confirm can send them back.
  useEffect(() => {
    if (joining)
      document.cookie = `${PENDING_JOIN_COOKIE}=${encodeURIComponent(redirectTo)}; path=/; max-age=${7 * 24 * 3600}; samesite=lax`;
  }, [joining, redirectTo]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(() => AUTH_ERRORS[searchParams.get("error") ?? ""] ?? null);
  const [info, setInfo] = useState<string | null>(() => AUTH_NOTICES[searchParams.get("notice") ?? ""] ?? null);
  const [pending, setPending] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  const emailRedirectTo = () =>
    `${window.location.origin}/auth/callback?from=email&next=${encodeURIComponent(redirectTo)}`;

  function switchMode(next: "sign-in" | "sign-up") {
    if (next === mode) return;
    setUnconfirmed(null);
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
    setUnconfirmed(null);

    const supabase = createSupabaseBrowserClient();

    if (mode === "sign-in") {
      setPending(true);
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setPending(false);
        if (authError.code === "email_not_confirmed") setUnconfirmed(email);
        else setError(authError.message);
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
      options: {
        // pending_join lets the app offer the invite again after sign-in even if the confirmation email is
        // opened on another device; emailRedirectTo brings this browser straight back to it.
        data: { full_name: name.trim(), ...(joining ? { pending_join: redirectTo } : {}) },
        emailRedirectTo: emailRedirectTo(),
      },
    });

    if (authError) {
      setPending(false);
      setError(authError.message);
      return;
    }

    if (!data.session) {
      setPending(false);
      setAwaitingConfirm(email);
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

  if (awaitingConfirm) {
    return (
      <ConfirmPending
        email={awaitingConfirm}
        emailRedirectTo={emailRedirectTo()}
        onConfirmed={() => {
          router.replace(redirectTo);
          router.refresh();
        }}
        onChangeEmail={() => {
          setAwaitingConfirm(null);
          setMode("sign-up");
        }}
      />
    );
  }

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
          {mode === "sign-in" ? <AnimatedHomeboxIcon size={96} /> : <AnimatedHomeboxIcon size={48} />}
          <div>
            <h1 className="font-serif text-[30px] leading-none text-ink">Homebox</h1>
            {mode === "sign-in" && (
              <p className="mt-1.5 max-w-[280px] text-sm leading-snug text-muted">
                Everything in your house, garden and garage, found in seconds.
              </p>
            )}
            {mode === "sign-up" && <p className="mt-0.5 text-[13px] text-muted">Map your home, garden &amp; garage.</p>}
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
          {joining && (
            <p className="m-0 rounded-xl bg-selected px-3 py-2.5 text-center text-[13px] leading-snug text-(--plan-ink)">
              Sign in, or create an account, to accept your household invite.
            </p>
          )}

          {unconfirmed && mode === "sign-in" && (
            <UnconfirmedNotice email={unconfirmed} emailRedirectTo={emailRedirectTo()} />
          )}

          {/* Segmented tab */}
          <div
            role="tablist"
            aria-label="Account mode"
            className="grid grid-cols-2 rounded-xl bg-surface-soft p-[3px] text-sm font-semibold text-center"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "sign-in"}
              onClick={() => switchMode("sign-in")}
              className={`cursor-pointer rounded-[9px] px-3 py-2.5 transition-all ${
                mode === "sign-in" ? "bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "bg-transparent text-muted"
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
                mode === "sign-up" ? "bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "bg-transparent text-muted"
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
          <div className="flex items-center gap-2.5 font-mono text-[10px] tracking-wider text-faint">
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
                className="overflow-hidden rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink"
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
                className="overflow-hidden rounded-xl bg-zone-garden px-3 py-2.5 text-sm text-moss-ink"
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
            className="flex cursor-pointer items-center justify-center rounded-xl bg-accent px-3 py-[15px] text-base font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-default disabled:opacity-60"
          >
            {pending ? <WalkingDots size={6} /> : mode === "sign-in" ? "Sign in" : "Create account"}
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
