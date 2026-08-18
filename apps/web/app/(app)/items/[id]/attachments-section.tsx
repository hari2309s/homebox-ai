"use client";

import { ConfirmDialog, Select, SubmitButton, TapButton } from "@homebox-ai/ui";
import { motion } from "framer-motion";
import { useState } from "react";

import { deleteAttachmentAction, setPrimaryAttachmentAction, uploadItemAttachmentAction } from "../actions";

interface AttachmentRecord {
  id: string;
  type: string;
  isPrimary: boolean;
  url: string | null;
}

export function AttachmentsSection({ itemId, attachments }: { itemId: string; attachments: AttachmentRecord[] }) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!pendingDeleteId) return;
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("attachmentId", pendingDeleteId);
    setPendingDeleteId(null);
    await deleteAttachmentAction(formData);
  }

  return (
    <div className="flex flex-col gap-3">
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attachments.map((attachment) => (
            <motion.div
              key={attachment.id}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="flex flex-col gap-1"
            >
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
                      <TapButton
                        type="submit"
                        className="cursor-pointer border-none bg-transparent font-semibold text-ink"
                      >
                        Set cover
                      </TapButton>
                    </form>
                  )}
                  <TapButton
                    type="button"
                    onClick={() => setPendingDeleteId(attachment.id)}
                    className="cursor-pointer border-none bg-transparent font-semibold text-accent-hover"
                  >
                    Delete
                  </TapButton>
                </div>
              </div>
            </motion.div>
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

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this attachment?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
