"use client";

import { Button, Spinner } from "@homebox-ai/ui";
import { useRef, useState } from "react";

import { importZipAction } from "./actions";

export function ZipImportForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await importZipAction(formData);
      setMessage(
        `Added ${result.items} item${result.items === 1 ? "" : "s"}, ${result.locations} location${result.locations === 1 ? "" : "s"}, ${result.labels} label${result.labels === 1 ? "" : "s"}, ${result.maintenanceEntries} maintenance entr${result.maintenanceEntries === 1 ? "y" : "ies"}, and ${result.attachments} attachment${result.attachments === 1 ? "" : "s"}.`,
      );
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't import that file");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-2">
      <input
        type="file"
        name="file"
        accept=".zip,application/zip"
        required
        className="text-sm text-body file:mr-2 file:cursor-pointer file:rounded-md file:border-none file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
      />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <Spinner size={16} /> : "Import backup"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-accent-hover">
          {error}
        </p>
      )}
      {message && !error && <p className="text-sm text-muted">{message}</p>}
    </form>
  );
}
