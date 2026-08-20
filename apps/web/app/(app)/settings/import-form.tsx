"use client";

import { Button, Spinner } from "@homebox-ai/ui";
import { useRef, useState } from "react";

interface ImportFormProps<T> {
  action: (formData: FormData) => Promise<T>;
  accept: string;
  submitLabel: string;
  formatMessage: (result: T) => string;
}

/** Shared file-upload/import shell for the CSV and ZIP importers below — same pending/message/error state machine, just a different action and result summary. */
export function ImportForm<T>({ action, accept, submitLabel, formatMessage }: ImportFormProps<T>) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await action(formData);
      setMessage(formatMessage(result));
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
        accept={accept}
        required
        className="text-sm text-body file:mr-2 file:cursor-pointer file:rounded-md file:border-none file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
      />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <Spinner size={16} /> : submitLabel}
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
