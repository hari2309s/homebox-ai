import { listLabelsCached } from "../../../lib/cached-queries";
import { Input, SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLabelAction } from "./actions";
import { CrudShell } from "../crud-shell";
import { LabelList } from "./label-list";

export default async function LabelsPage() {
  const user = await getSessionUser();
  const labels = user ? await listLabelsCached(user.id) : [];

  return (
    <div data-scroll-container className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-3 p-4 pb-0">
        <div className="px-1">
          <div className="font-serif text-[30px] leading-none text-ink">Labels</div>
          <div className="mt-1 font-mono text-[11px] tracking-wide text-muted">
            {labels.length} LABEL{labels.length === 1 ? "" : "S"} · TAP TO EDIT
          </div>
        </div>
      </div>

      <CrudShell
        toggleLabel="Add label"
        formAction={createLabelAction}
        formClassName="flex flex-col gap-2"
        formFields={
          <>
            <div className="font-mono text-[10px] text-muted">NEW LABEL</div>
            <div className="grid grid-cols-[1fr_44px] gap-[6px]">
              <Input name="name" placeholder="e.g. Greenhouse" required />
              <SubmitButton className="!rounded-[10px] !px-0">
                <span className="material-symbols-rounded text-[18px]">add</span>
              </SubmitButton>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-body">Colour</span>
              <input
                type="color"
                name="color"
                defaultValue="#3f6b45"
                aria-label="Label color"
                className="h-[26px] w-[26px] shrink-0 cursor-pointer rounded-full border-none bg-transparent p-0"
              />
            </div>
          </>
        }
      >
        <LabelList labels={labels} />
      </CrudShell>
    </div>
  );
}
