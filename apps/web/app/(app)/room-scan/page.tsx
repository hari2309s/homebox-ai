import { listLabelsCached, listLocationsCached } from "../../../lib/cached-queries";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { locationPath, zoneIndexOf, ZONE_DOTS } from "../items/item-summary";
import { RoomScanDesktop } from "./room-scan-desktop";
import { RoomScanForm } from "./room-scan-form";

export default async function RoomScanPage() {
  const user = await getSessionUser();
  const [locations, labels] = user
    ? await Promise.all([listLocationsCached(user.id), listLabelsCached(user.id)])
    : [[], []];

  return (
    <div data-full-bleed className="h-full">
      <div className="h-full lg:hidden">
        <RoomScanForm locations={locations} labels={labels} />
      </div>
      <div className="hidden h-full lg:block">
        <RoomScanDesktop
          locations={locations.map((l) => {
            const zone = zoneIndexOf(locations, l.id);
            return {
              id: l.id,
              name: l.name,
              path: locationPath(locations, l.id)
                .map((p) => p.name)
                .join(" › "),
              color: zone < 0 ? "#9aa49c" : ZONE_DOTS[zone % ZONE_DOTS.length]!,
            };
          })}
          labels={labels}
        />
      </div>
    </div>
  );
}
