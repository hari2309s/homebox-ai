"use client";

import type { ChangeEvent, RefObject } from "react";

import { Spinner } from "./spinner";

interface CapturePhotoPickerProps {
  previewUrl: string | null;
  analyzing: boolean;
  analyzingLabel: string;
  error: string | null;
  placeholder: string;
  pickerLabel: string;
  retakeLabel: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * The "take/upload a photo, then wait for AI analysis" screen shared by the
 * photo-capture and receipt-import flows — shown before either has anything
 * to review yet.
 */
export function CapturePhotoPicker({
  previewUrl,
  analyzing,
  analyzingLabel,
  error,
  placeholder,
  pickerLabel,
  retakeLabel,
  fileInputRef,
  onFileChange,
}: CapturePhotoPickerProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4 text-center sm:p-6">
        {previewUrl ? (
          // Locally-selected blob URL, not a network image — next/image doesn't apply here.
          <img src={previewUrl} alt="" className="max-h-64 w-auto rounded-md object-contain" />
        ) : (
          <p className="text-sm text-muted">{placeholder}</p>
        )}
        {analyzing && (
          <div className="flex items-center gap-2 text-muted">
            <Spinner size={16} />
            <span className="text-sm">{analyzingLabel}</span>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
            {error}
          </p>
        )}
      </div>
      <div className="shrink-0 border-t border-border bg-card p-4 md:p-6">
        <div className="flex justify-center md:mx-auto md:w-full md:max-w-2xl">
          <label className="cursor-pointer rounded-md bg-accent px-4 py-2.5 font-bold text-white transition-colors duration-150 hover:bg-accent-hover">
            {previewUrl ? retakeLabel : pickerLabel}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
