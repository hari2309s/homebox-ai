"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { uploadAvatar } from "@homebox-ai/supabase/storage";
import { Spinner } from "@homebox-ai/ui";
import { useRef, useState } from "react";

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

interface AvatarUploadFormProps {
  userId: string;
  currentAvatarUrl: string | null;
}

export function AvatarUploadForm({ userId, currentAvatarUrl }: AvatarUploadFormProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const signedUrl = await uploadAvatar(supabase, userId, file);
      await supabase.auth.updateUser({ data: { avatar_url: signedUrl } });
      setAvatarUrl(signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected if needed.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile picture"
        className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border bg-surface-soft transition-opacity duration-150 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset
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

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
