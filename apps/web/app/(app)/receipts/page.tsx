import { listLabelsCached, listLocationsCached } from "../../../lib/cached-queries";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { locationPath, zoneIndexOf, ZONE_DOTS } from "../items/item-summary";
import { ReceiptDesktop } from "./receipt-desktop";
import { ReceiptForm } from "./receipt-form";

export default async function ReceiptsPage() {
  const user = await getSessionUser();
  const [locations, labels] = user
    ? await Promise.all([listLocationsCached(user.id), listLabelsCached(user.id)])
    : [[], []];

  return (
    <>
      <div className="h-full lg:hidden">
        <ReceiptForm locations={locations} labels={labels} />
      </div>
      <div className="hidden h-full lg:block">
        <ReceiptDesktop
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
    </>
  );
}
