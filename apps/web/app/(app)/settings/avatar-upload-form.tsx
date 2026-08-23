"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { uploadAvatar } from "@homebox-ai/supabase/storage";
import { Spinner } from "@homebox-ai/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-muted"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

/** Crops `imageSrc` (object URL) to the given pixel area and returns a JPEG Blob. */
async function cropImageToBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const size = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Circular clip so the saved file already has a round shape on transparent-aware viewers.
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))), "image/jpeg", 0.92),
  );
}

interface AvatarUploadFormProps {
  userId: string;
  currentAvatarUrl: string | null;
}

export function AvatarUploadForm({ userId, currentAvatarUrl }: AvatarUploadFormProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    // Reset crop state and open modal.
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropSrc(URL.createObjectURL(file));
    // Reset so the same file can be re-selected.
    if (inputRef.current) inputRef.current.value = "";
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function handleCancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleApplyCrop() {
    if (!cropSrc || !croppedAreaPixels) return;
    setError(null);
    setUploading(true);
    try {
      const blob = await cropImageToBlob(cropSrc, croppedAreaPixels);
      const supabase = createSupabaseBrowserClient();
      const signedUrl = await uploadAvatar(supabase, userId, blob);
      await supabase.auth.updateUser({ data: { avatar_url: signedUrl } });
      setAvatarUrl(signedUrl);
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile picture"
          className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border bg-surface-soft transition-opacity duration-150 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
            <img src={avatarUrl} alt="Profile picture" className="h-full w-full object-cover" />
          ) : (
            <UserIcon />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Spinner size={20} className="text-white" />
            </div>
          )}
        </button>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="self-start text-sm font-semibold text-accent transition-colors duration-150 hover:text-accent-hover disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          <p className="text-xs text-muted">JPG, PNG or WebP · max 5 MB</p>
          {error && (
            <p role="alert" className="text-xs text-accent-hover">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Crop modal */}
      <AnimatePresence>
        {cropSrc && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-50 bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelCrop}
            />
            <motion.div
              key="modal"
              className="fixed inset-x-4 top-1/2 z-50 mx-auto flex w-full max-w-sm -translate-y-1/2 flex-col gap-4 rounded-2xl bg-card p-5 shadow-xl"
              initial={{ opacity: 0, scale: 0.95, y: "-45%" }}
              animate={{ opacity: 1, scale: 1, y: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, y: "-45%" }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <h2 className="text-sm font-bold text-ink">Crop photo</h2>

              {/* Crop canvas */}
              <div className="relative h-80 w-full overflow-hidden rounded-xl bg-black">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  style={{
                    containerStyle: { borderRadius: "12px" },
                  }}
                />
              </div>

              {/* Zoom slider */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">−</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-accent"
                  aria-label="Zoom"
                />
                <span className="text-xs text-muted">+</span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-muted transition-colors duration-150 hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-bold text-white transition-colors duration-150 hover:bg-accent-hover disabled:opacity-60"
                >
                  {uploading && <Spinner size={14} className="text-white" />}
                  {uploading ? "Saving…" : "Save"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
