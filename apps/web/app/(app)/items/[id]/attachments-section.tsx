"use client";

import { ConfirmDialog, Select, SubmitButton, TapButton } from "@homebox-ai/ui";
import { useState } from "react";

import { deleteAttachmentAction, setPrimaryAttachmentAction, uploadItemAttachmentAction } from "../actions";

interface AttachmentRecord {
  id: string;
  type: string;
  isPrimary: boolean;
  url: string | null;
}

const ATTACHMENT_STYLES: Record<string, { icon: string; bg: string; fg: string }> = {
  photo: { icon: "image", bg: "#dfe8d6", fg: "#3f6b45" },
  receipt: { icon: "receipt_long", bg: "#ecdccd", fg: "#b0643f" },
  warranty: { icon: "verified_user", bg: "#dde6f0", fg: "#2c4767" },
  manual: { icon: "menu_book", bg: "#e7e1d0", fg: "#5a4f33" },
};

export function AttachmentsSection({ itemId, attachments }: { itemId: string; attachments: AttachmentRecord[] }) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!pendingDeleteId) return;
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("attachmentId", pendingDeleteId);
    setError(null);
    setDeleting(true);
    try {
      await deleteAttachmentAction(formData);
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this attachment");
      setPendingDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  let photoNumber = 0;

  return (
    <div className="flex flex-col gap-3 pb-3">
      {error && (
        <p role="alert" className="rounded-xl bg-[#ecdccd] px-3 py-2.5 text-sm text-[#5a2e18]">
          {error}
        </p>
      )}
      {attachments.length === 0 ? (
        <p className="m-0 text-[13px] text-muted">No photos, receipts or manuals yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-[6px]">
          {attachments.map((attachment) => {
            const style = ATTACHMENT_STYLES[attachment.type] ?? ATTACHMENT_STYLES.manual!;
            const title =
              attachment.type === "photo" ? `Photo ${++photoNumber}` : attachment.type[0]!.toUpperCase() + attachment.type.slice(1);
            return (
              <div
                key={attachment.id}
                className="group flex min-w-0 items-center gap-2 rounded-[10px] border border-border/60 p-[7px]"
              >
                <span
                  className="material-symbols-rounded flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[16px]"
                  style={{ background: style.bg, color: style.fg }}
                >
                  {style.icon}
                </span>
                {attachment.url ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink no-underline hover:underline"
                  >
                    {title}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-muted" title="Preview unavailable">
                    {title}
                  </span>
                )}
                {attachment.type === "photo" &&
                  (attachment.isPrimary ? (
                    <span
                      className="material-symbols-rounded text-[16px] text-accent"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      title="Cover photo"
                    >
                      star
                    </span>
                  ) : (
                    <form action={setPrimaryAttachmentAction} className="flex">
                      <input type="hidden" name="itemId" value={itemId} />
                      <input type="hidden" name="attachmentId" value={attachment.id} />
                      <TapButton
                        type="submit"
                        aria-label={`Make ${title} the cover photo`}
                        className="flex cursor-pointer border-none bg-transparent p-0 text-muted hover:text-accent"
                      >
                        <span className="material-symbols-rounded text-[16px]">star</span>
                      </TapButton>
                    </form>
                  ))}
                <TapButton
                  type="button"
                  onClick={() => setPendingDeleteId(attachment.id)}
                  aria-label={`Delete ${title}`}
                  className="flex cursor-pointer border-none bg-transparent p-0 text-muted hover:text-[#b0643f]"
                >
                  <span className="material-symbols-rounded text-[16px]">close</span>
                </TapButton>
              </div>
            );
          })}
        </div>
      )}

      <form action={uploadItemAttachmentAction} className="flex flex-col gap-2 border-t border-border/40 pt-3">
        <input type="hidden" name="itemId" value={itemId} />
        <input
          type="file"
          name="file"
          required
          aria-label="File to attach"
          className="min-w-0 text-[12px] text-body file:mr-2 file:cursor-pointer file:rounded-lg file:border file:border-solid file:border-border file:bg-card file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-ink"
        />
        <div className="flex gap-2">
          <Select name="type" defaultValue="photo" aria-label="Attachment type" className="flex-1">
            <option value="photo">Photo</option>
            <option value="receipt">Receipt</option>
            <option value="warranty">Warranty</option>
            <option value="manual">Manual</option>
          </Select>
          <SubmitButton>Upload</SubmitButton>
        </div>
      </form>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this attachment?"
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
