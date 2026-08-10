import { labelQueries, locationQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { ReceiptForm } from "./receipt-form";

export default async function ReceiptsPage() {
  const user = await getSessionUser();
  const [locations, labels] = user
    ? await Promise.all([locationQueries.listLocations(user.id), labelQueries.listLabels(user.id)])
    : [[], []];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
      <ReceiptForm locations={locations} labels={labels} />
    </div>
  );
}
