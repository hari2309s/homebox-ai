"use client";

import { Select, SubmitButton } from "@homebox-ai/ui";

import { deleteAttachmentAction, setPrimaryAttachmentAction, uploadItemAttachmentAction } from "../actions";

interface AttachmentRecord {
  id: string;
  type: string;
  isPrimary: boolean;
  storagePath: string;
  url: string | null;
}

export function AttachmentsSection({ itemId, attachments }: { itemId: string; attachments: AttachmentRecord[] }) {
  return (
    <div className="flex flex-col gap-3">
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex flex-col gap-1">
              <div className="relative">
                {attachment.url ? (
                  <a href={attachment.url} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static/local asset */}
                    <img
                      src={attachment.url}
                      alt={attachment.type}
                      className="aspect-square w-full rounded-md border border-border object-cover"
                    />
                  </a>
                ) : (
                  // Signed URLs can fail transiently — falling back to this instead of
                  // rendering nothing keeps the delete/cover controls reachable either way.
                  <div className="flex aspect-square w-full items-center justify-center rounded-md border border-border bg-surface-soft text-center text-xs text-muted">
                    Preview unavailable
                  </div>
                )}
                {attachment.isPrimary && (
                  <span className="absolute left-1 top-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 text-xs">
                <span className="capitalize text-muted">{attachment.type}</span>
                <div className="flex gap-2">
                  {!attachment.isPrimary && (
                    <form action={setPrimaryAttachmentAction}>
                      <input type="hidden" name="itemId" value={itemId} />
                      <input type="hidden" name="attachmentId" value={attachment.id} />
                      <button type="submit" className="cursor-pointer border-none bg-transparent font-semibold text-ink">
                        Set cover
                      </button>
                    </form>
                  )}
                  <form
                    action={async (formData) => {
                      if (!confirm("Delete this attachment?")) return;
                      await deleteAttachmentAction(formData);
                    }}
                  >
                    <input type="hidden" name="itemId" value={itemId} />
                    <input type="hidden" name="attachmentId" value={attachment.id} />
                    <input type="hidden" name="storagePath" value={attachment.storagePath} />
                    <button type="submit" className="cursor-pointer border-none bg-transparent font-semibold text-accent-hover">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={uploadItemAttachmentAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="itemId" value={itemId} />
        <input
          type="file"
          name="file"
          required
          className="flex-1 text-sm text-body file:mr-2 file:cursor-pointer file:rounded-md file:border-none file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
        />
        <Select name="type" defaultValue="manual" className="sm:w-40">
          <option value="manual">Manual</option>
          <option value="warranty">Warranty</option>
          <option value="receipt">Receipt</option>
          <option value="photo">Photo</option>
        </Select>
        <SubmitButton>Upload</SubmitButton>
      </form>
    </div>
  );
}
