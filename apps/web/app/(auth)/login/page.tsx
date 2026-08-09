"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./login.module.css";

const FEATURES = [
  { icon: "🔍", label: "Ask “where's my passport?” in plain English" },
  { icon: "📸", label: "Snap a photo and get a ready-made item entry" },
  { icon: "🧾", label: "Import receipts — items added automatically" },
  { icon: "🔧", label: "Get maintenance & warranty reminders" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setPending(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.replace("/items");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <div className={styles.brand}>
        <div className={styles.wordmark}>
          <Image src="/icons/icon-192.png" alt="" width={56} height={56} priority />
          <h1>Homebox AI</h1>
        </div>
        <p className={styles.tagline}>Your home inventory, remembered and organized by AI.</p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className={styles.field}>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>

      <ul className={styles.features} style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {FEATURES.map((feature) => (
          <li key={feature.label} className={styles.feature}>
            <span className={styles.icon}>{feature.icon}</span>
            <p>{feature.label}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
