"use client";

import type { IScannerControls } from "@zxing/browser";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { parseScanResult } from "../../../lib/scan-result";
import { ScannerPanel } from "./scanner-panel";

export default function ScanPage() {
  const [desktop, setDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    setDesktop(query.matches);
    const onChange = (event: MediaQueryListEvent) => setDesktop(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  if (desktop === null) return null;
  return desktop ? (
    <div className="flex h-full items-center justify-center p-8">
      <ScannerPanel />
    </div>
  ) : (
    <MobileScanner />
  );
}

function MobileScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | null = null;
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (cancelled || handledRef.current || !result) return;
        handledRef.current = true;
        controls?.stop();

        const parsed = parseScanResult(result.getText(), window.location.origin);
        router.push(
          parsed.type === "item" ? `/items/${parsed.itemId}` : `/items?q=${encodeURIComponent(parsed.query)}`,
        );
      })
      .then((startedControls) => {
        if (cancelled) {
          startedControls.stop();
          return;
        }
        controls = startedControls;
        setReady(true);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't access the camera — check that this site has camera permission.",
        );
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [router]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#1f2622] p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[14px] bg-black shadow-card">
        <video ref={videoRef} muted playsInline className="w-full rounded-[14px]" />
        {ready && !error && (
          <div className="pointer-events-none absolute inset-8 rounded-[10px] border-2 border-white/60" />
        )}
      </div>
      {error ? (
        <p className="max-w-sm rounded-xl bg-[#ecdccd] px-3 py-2.5 text-center text-sm text-[#5a2e18]">{error}</p>
      ) : (
        <p className="max-w-sm text-center text-sm text-white/70">
          Point the camera at a barcode or one of your printed QR labels.
        </p>
      )}
    </div>
  );
}
