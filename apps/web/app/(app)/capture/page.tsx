import { listLabelsCached, listLocationsCached } from "../../../lib/cached-queries";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { CaptureForm } from "./capture-form";

export default async function CapturePage() {
  const user = await getSessionUser();
  const [locations, labels] = user
    ? await Promise.all([listLocationsCached(user.id), listLabelsCached(user.id)])
    : [[], []];

  return (
    <div className="h-full">
      <CaptureForm locations={locations} labels={labels} />
    </div>
  );
}
