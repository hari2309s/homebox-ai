import { labelQueries } from "@homebox-ai/db";
import { Input, SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLabelAction } from "./actions";
import { LabelList } from "./label-list";

export default async function LabelsPage() {
  const user = await getSessionUser();
  const labels = user ? await labelQueries.listLabels(user.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Labels</h1>

      <form
        action={createLabelAction}
        className="flex flex-col gap-3 rounded-lg bg-surface-soft p-4 sm:flex-row sm:items-center"
      >
        <Input name="name" placeholder="New label name" required className="sm:flex-1" />
        <SubmitButton>Add</SubmitButton>
      </form>

      <LabelList labels={labels} />
    </div>
  );
}
