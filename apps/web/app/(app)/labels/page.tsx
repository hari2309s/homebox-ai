import { labelQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLabelAction } from "./actions";
import { LabelList } from "./label-list";

export default async function LabelsPage() {
  const user = await getSessionUser();
  const labels = user ? await labelQueries.listLabels(user.id) : [];

  return (
    <div>
      <h1>Labels</h1>
      <form action={createLabelAction} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input name="name" placeholder="New label name" required />
        <button type="submit">Add</button>
      </form>
      <LabelList labels={labels} />
    </div>
  );
}
