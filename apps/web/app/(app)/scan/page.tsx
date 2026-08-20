"use client";

import type { IScannerControls } from "@zxing/browser";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { parseScanResult } from "../../../lib/scan-result";

export default function ScanPage() {
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
        // The component could have unmounted while the camera was still
        // starting up (e.g. a quick back-navigation) — stop immediately
        // instead of leaving the stream running in the background.
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
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-black p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-md bg-black">
        {/* zxing attaches the camera stream to this element itself once decoding starts. */}
        <video ref={videoRef} muted playsInline className="w-full rounded-md" />
        {ready && !error && (
          <div className="pointer-events-none absolute inset-8 rounded-md border-2 border-white/70" />
        )}
      </div>
      <p className="max-w-sm text-center text-sm text-white/80">
        {error ?? "Point the camera at a barcode, or one of your printed item QR labels, to look it up."}
      </p>
    </div>
  );
}
