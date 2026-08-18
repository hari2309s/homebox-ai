"use client";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";
import { Button, FormField, Input, Spinner } from "@homebox-ai/ui";
import type { FormEvent } from "react";
import { useState } from "react";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });

    setPending(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <FormField label="Display name" flex>
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          placeholder="Your name"
        />
      </FormField>
      <Button type="submit" disabled={pending || !name.trim()}>
        {pending ? <Spinner size={16} /> : "Save"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-accent-hover sm:basis-full">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-muted sm:basis-full">Saved.</p>}
    </form>
  );
}
