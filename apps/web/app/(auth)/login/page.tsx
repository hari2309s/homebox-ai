"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { AnimatedHomeboxIcon, FadeIn, Spinner, StaggerItem, StaggerList } from "@homebox-ai/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { safeRedirect } from "../../../lib/safe-redirect";

const FEATURES = [
  { icon: "🔍", label: "Ask “where's my passport?” in plain English" },
  { icon: "📸", label: "Snap a photo and get a ready-made item entry" },
  { icon: "🧾", label: "Import receipts — items added automatically" },
  { icon: "🔧", label: "Get maintenance & warranty reminders" },
];

const COPY = {
  "sign-in": { heading: "Welcome back", subtitle: "Sign in to your inventory" },
  "sign-up": { heading: "Create your account", subtitle: "Start organizing with AI" },
};

const inputClassName =
  "rounded-md border border-border bg-white px-3.5 py-2.5 text-base font-normal text-body outline-none transition-shadow duration-150 focus:border-accent focus:ring-4 focus:ring-accent/20";

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
  const [formFocused, setFormFocused] = useState(false);

  function switchMode() {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
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
      // Left pending — about to navigate away, so resetting it here would just
      // flash the button back to "Sign in" for a moment before the page changes.
      router.replace(redirectTo);
      router.refresh();
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

    // The project requires email confirmation, so signUp succeeds without
    // creating a session — there's nothing to redirect into yet.
    if (!data.session) {
      setPending(false);
      setInfo("Check your email to confirm your account, then sign in.");
      setMode("sign-in");
      return;
    }

    // Left pending for the same reason as the sign-in branch above.
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <main className="no-scrollbar mx-auto flex h-dvh w-full max-w-lg flex-col items-center overflow-y-auto px-6 py-12">
      <div className="m-auto flex w-full flex-col items-center gap-10">
        <FadeIn className="flex flex-col items-center gap-2 text-center">
          <div className="flex flex-col items-center gap-2">
            <motion.div
              initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
            >
              <AnimatedHomeboxIcon size={96} attentive={formFocused} />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Homebox AI</h1>
          </div>
          <p className="max-w-md text-base text-muted">Know what you own, and where it is.</p>
        </FadeIn>

        <motion.form
          onSubmit={handleSubmit}
          onFocus={() => setFormFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setFormFocused(false);
          }}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.15 }}
          className="flex w-full max-w-sm flex-col gap-5 rounded-lg bg-surface p-8 shadow-card"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-1"
            >
              <h2 className="text-lg font-bold text-ink">{COPY[mode].heading}</h2>
              <p className="text-sm text-muted">{COPY[mode].subtitle}</p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {mode === "sign-up" && (
              <motion.label
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-1.5 overflow-hidden text-sm font-semibold text-ink"
              >
                Name
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className={inputClassName}
                />
              </motion.label>
            )}
          </AnimatePresence>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputClassName}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className={inputClassName}
            />
          </label>

          <AnimatePresence initial={false}>
            {mode === "sign-up" && (
              <motion.label
                key="confirm-password"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-1.5 overflow-hidden text-sm font-semibold text-ink"
              >
                Confirm password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </motion.label>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover"
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
                className="overflow-hidden rounded-md bg-surface-soft px-3 py-2 text-sm text-ink"
              >
                {info}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={pending}
            whileHover={pending ? undefined : { scale: 1.02 }}
            whileTap={pending ? undefined : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex cursor-pointer items-center justify-center rounded-md bg-accent px-3 py-3 font-bold text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-default disabled:opacity-60"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={pending ? "pending" : mode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="inline-flex items-center gap-2"
              >
                {pending ? <Spinner size={16} /> : mode === "sign-in" ? "Sign in" : "Create account"}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <button
            type="button"
            onClick={switchMode}
            className="cursor-pointer self-center border-none bg-transparent text-sm font-semibold text-ink"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="inline-block underline underline-offset-4"
              >
                {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </motion.span>
            </AnimatePresence>
          </button>
        </motion.form>

        <StaggerList className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <StaggerItem
              key={feature.label}
              className="flex items-start gap-2.5 rounded-md bg-surface-soft px-3.5 py-3"
            >
              <span className="text-lg leading-none">{feature.icon}</span>
              <p className="m-0 text-sm leading-snug text-body">{feature.label}</p>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </main>
  );
}

// useSearchParams() requires a Suspense boundary — otherwise Next.js can't
// statically prerender the rest of this page's markup around it.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
