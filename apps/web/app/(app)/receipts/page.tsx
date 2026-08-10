import { labelQueries, locationQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { ReceiptForm } from "./receipt-form";

export default async function ReceiptsPage() {
  const user = await getSessionUser();
  const [locations, labels] = user
    ? await Promise.all([locationQueries.listLocations(user.id), labelQueries.listLabels(user.id)])
    : [[], []];

  return (
    <div className="h-full">
      <ReceiptForm locations={locations} labels={labels} />
    </div>
  );
}
