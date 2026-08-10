import { labelQueries } from "@homebox-ai/db";
import { Input, SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLabelAction } from "./actions";
import { CrudShell } from "../crud-shell";
import { LabelList } from "./label-list";

export default async function LabelsPage() {
  const user = await getSessionUser();
  const labels = user ? await labelQueries.listLabels(user.id) : [];

  return (
    <CrudShell
      form={
        <form
          action={createLabelAction}
          className="flex flex-col gap-3 rounded-lg bg-surface-soft p-4 sm:flex-row sm:items-center md:rounded-md md:bg-transparent md:p-0"
        >
          <Input name="name" placeholder="New label name" required className="sm:flex-1" />
          <SubmitButton>Add</SubmitButton>
        </form>
      }
    >
      <LabelList labels={labels} />
    </CrudShell>
  );
}
