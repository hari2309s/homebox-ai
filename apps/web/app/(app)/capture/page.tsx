import { labelQueries, locationQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { CaptureForm } from "./capture-form";

export default async function CapturePage() {
  const user = await getSessionUser();
  const [locations, labels] = user
    ? await Promise.all([locationQueries.listLocations(user.id), labelQueries.listLabels(user.id)])
    : [[], []];

  return (
    <div className="h-full">
      <CaptureForm locations={locations} labels={labels} />
    </div>
  );
}
