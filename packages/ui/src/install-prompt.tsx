"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "homebox-a2hs-dismiss";
const DISMISS_DAYS = 30;
const MAX_DISMISSALS = 2;
const VISIT_KEY = "homebox-visit-count";
const VISIT_THRESHOLD = 3;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

/**
 * J10 Add-to-Home-Screen prompt (screen 118).
 * - Shown once after the 3rd visit, or on the first barcode scan.
 * - On Android Chrome: one "Install" button using the deferred beforeinstallprompt.
 * - On iOS Safari: step-by-step instructions (tap Share → Add to Home Screen).
 * - "Not now" hides it for 30 days. After 2 dismissals, only shows in Settings.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Don't show if already installed.
    if (isStandalone()) return;

    // Check dismissal count.
    const dismissData = localStorage.getItem(DISMISS_KEY);
    if (dismissData) {
      try {
        const { count, until } = JSON.parse(dismissData);
        if (count >= MAX_DISMISSALS) return;
        if (Date.now() < until) return;
      } catch { /* continue */ }
    }

    // Count visits.
    const visits = Number(localStorage.getItem(VISIT_KEY) ?? "0") + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIos(ios);

    if (visits >= VISIT_THRESHOLD) {
      if (ios) {
        // iOS: show manual instructions.
        setShowPrompt(true);
      }
      // Android: wait for beforeinstallprompt.
    }

    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (visits >= VISIT_THRESHOLD) setShowPrompt(true);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    const prev = localStorage.getItem(DISMISS_KEY);
    let count = 1;
    if (prev) {
      try { count = JSON.parse(prev).count + 1; } catch { /* default 1 */ }
    }
    localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ count, until: Date.now() + DISMISS_DAYS * 86_400_000 }),
    );
  }, []);

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-[rgba(31,38,34,.3)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            key="prompt"
            role="dialog"
            aria-modal="true"
            aria-label="Install Homebox"
            className="fixed inset-x-3 bottom-24 z-50 flex flex-col gap-[14px] rounded-[20px] border border-border bg-card p-4 shadow-xl"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="flex gap-3">
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-[14px] bg-[#dfe8d6]">
                <span className="material-symbols-rounded text-[28px] text-[#2c4d31]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  home
                </span>
              </div>
              <div className="flex-1">
                <div className="font-serif text-[20px] leading-tight text-ink">
                  Keep Homebox by the back door
                </div>
                <div className="mt-[3px] text-[13px] leading-[1.45] text-muted">
                  Add it to your home screen for full-screen scanning and offline access.
                </div>
              </div>
            </div>

            {isIos && !deferredPrompt && (
              <div className="flex flex-col gap-2 rounded-xl bg-surface p-[10px_12px]">
                <span className="flex items-center gap-[10px] text-[13px] text-ink">
                  <span className="font-mono text-[11px] text-muted">1</span>
                  Tap{" "}
                  <span className="material-symbols-rounded text-[18px] text-[#2c4767]">ios_share</span>
                  {" "}Share in Safari&apos;s toolbar
                </span>
                <span className="flex items-center gap-[10px] text-[13px] text-ink">
                  <span className="font-mono text-[11px] text-muted">2</span>
                  Choose{" "}
                  <span className="material-symbols-rounded text-[18px] text-ink">add_box</span>
                  {" "}<b>Add to Home Screen</b>
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-[15px] font-semibold text-ink"
              >
                Not now
              </button>
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="flex h-12 flex-[1.3] cursor-pointer items-center justify-center rounded-xl border-none bg-accent text-[15px] font-semibold text-on-accent"
                >
                  Install
                </button>
              ) : (
                isIos && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="flex h-12 flex-[1.3] cursor-pointer items-center justify-center rounded-xl border-none bg-accent text-[15px] font-semibold text-on-accent"
                  >
                    Got it
                  </button>
                )
              )}
            </div>
          </motion.div>

          {/* Arrow pointing at Safari toolbar */}
          {isIos && !deferredPrompt && (
            <motion.div
              className="fixed bottom-[62px] left-1/2 z-50 -translate-x-1/2 text-on-accent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="material-symbols-rounded text-[28px]">south</span>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
