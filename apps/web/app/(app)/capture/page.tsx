import { labelQueries, locationQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { CaptureForm } from "./capture-form";

export default async function CapturePage() {
  const user = await getSessionUser();
  const [locations, labels] = user
    ? await Promise.all([locationQueries.listLocations(user.id), labelQueries.listLabels(user.id)])
    : [[], []];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
      <CaptureForm locations={locations} labels={labels} />
    </div>
  );
}
