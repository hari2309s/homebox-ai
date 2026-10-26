import { listLabelsCached, listLocationsCached } from "../../../lib/cached-queries";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { locationPath } from "../items/item-summary";
import { CaptureDesktop } from "./capture-desktop";
import { CaptureForm } from "./capture-form";

export default async function CapturePage() {
  const user = await getSessionUser();
  const [locations, labels] = user
    ? await Promise.all([listLocationsCached(user.id), listLabelsCached(user.id)])
    : [[], []];

  return (
    <>
      <div className="h-full lg:hidden">
        <CaptureForm locations={locations} labels={labels} />
      </div>
      <div className="hidden h-full lg:block">
        <CaptureDesktop
          locations={locations.map((l) => ({
            id: l.id,
            name: l.name,
            path: locationPath(locations, l.id)
              .map((p) => p.name)
              .join(" › "),
          }))}
          labels={labels}
        />
      </div>
    </>
  );
}
