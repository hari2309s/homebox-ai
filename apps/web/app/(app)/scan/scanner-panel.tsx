"use client";

import type { IScannerControls } from "@zxing/browser";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { parseScanResult } from "../../../lib/scan-result";
import { toastScanResult } from "../notifications/use-notifications";

/**
 * Desktop scanner: webcam viewfinder plus an always-focused number field, so a USB/Bluetooth barcode gun
 * can type straight in and Enter looks it up. With no webcam the camera area collapses to just the field.
 */
export function ScannerPanel({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handledRef = useRef(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [camera, setCamera] = useState<"starting" | "on" | "none">("starting");
  const [code, setCode] = useState("");

  function lookUp(text: string) {
    const trimmed = text.trim();
    if (!trimmed || handledRef.current) return;
    handledRef.current = true;
    const parsed = parseScanResult(trimmed, window.location.origin);
    toastScanResult(trimmed, parsed.type === "item");
    onClose?.();
    router.push(
      parsed.type === "item" ? `/items?selected=${parsed.itemId}` : `/items?q=${encodeURIComponent(parsed.query)}`,
    );
  }

  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((found) => {
        setDevices(found);
        if (found.length === 0) setCamera("none");
      })
      .catch(() => setCamera("none"));
  }, []);

  const cameraOff = camera === "none";
  useEffect(() => {
    if (cameraOff || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | null = null;
    let cancelled = false;
    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
        if (!cancelled && result) {
          controls?.stop();
          lookUp(result.getText());
        }
      })
      .then((started) => {
        if (cancelled) return started.stop();
        controls = started;
        setCamera("on");
      })
      .catch(() => setCamera("none"));
    return () => {
      cancelled = true;
      controls?.stop();
    };
    // lookUp only reads refs/props that are stable for the panel's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, cameraOff]);

  return (
    <div className="w-[680px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[18px] bg-[#141916] text-[#f4f3ee] shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]">
      <div className="flex items-center gap-[10px] px-4 py-[14px]">
        <h2 id="scanner-title" className="m-0 flex-1 font-serif text-[20px] font-normal">
          Scan a barcode
        </h2>
        {devices.length > 0 && (
          <label className="relative flex h-[34px] items-center gap-[6px] rounded-[9px] bg-[rgba(244,243,238,.12)] px-3 text-[13px]">
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              videocam
            </span>
            <span className="max-w-[220px] truncate">
              {devices.find((d) => d.deviceId === deviceId)?.label || devices[0]?.label || "Camera"}
            </span>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              expand_more
            </span>
            <select
              aria-label="Camera"
              value={deviceId ?? devices[0]?.deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[9px] border-none bg-[rgba(244,243,238,.12)] text-[#f4f3ee]"
          >
            <span aria-hidden className="material-symbols-rounded">
              close
            </span>
          </button>
        )}
      </div>

      {camera !== "none" && (
        <div className="relative h-[360px] bg-[repeating-linear-gradient(135deg,#1d241f_0_12px,#18201b_12px_24px)]">
          <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute left-1/2 top-[95px] h-[170px] w-[380px] -translate-x-1/2 overflow-hidden rounded-2xl border-2 border-dashed border-white/85 shadow-[0_0_0_2000px_rgba(10,13,11,.45)]">
            {camera === "on" && (
              <span className="scan-line absolute left-[6%] right-[6%] h-[2px] bg-[#9cc68f] shadow-[0_0_10px_#9cc68f]" />
            )}
          </div>
          <div className="absolute bottom-[22px] left-0 right-0 text-center text-[14px]">
            {camera === "on" ? "Hold the box up to the camera. It scans on its own." : "Starting the camera…"}
          </div>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          lookUp(code);
        }}
        className="flex items-center gap-[10px] border-t border-[#2a322d] px-4 py-3"
      >
        <span aria-hidden className="material-symbols-rounded text-[#9aa49c]">
          keyboard
        </span>
        <input
          ref={inputRef}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onBlur={(event) => {
            if (!event.relatedTarget) setTimeout(() => inputRef.current?.focus(), 0);
          }}
          placeholder={
            camera === "none" ? "No camera found. Type or use a USB scanner…" : "Or type / use a USB scanner…"
          }
          aria-label="Barcode or item code"
          className="min-w-0 flex-1 rounded-[10px] border border-[#3a423d] bg-[#1d241f] px-3 py-[9px] font-mono text-[14px] text-[#f4f3ee] outline-none placeholder:text-[#9aa49c] focus:border-[#9cc68f]"
        />
        <button
          type="submit"
          disabled={!code.trim()}
          className="h-[34px] cursor-pointer rounded-[9px] border-none bg-[#9cc68f] px-[14px] text-[13px] font-semibold text-[#1f2622] disabled:opacity-60"
        >
          Look it up
        </button>
      </form>
    </div>
  );
}
