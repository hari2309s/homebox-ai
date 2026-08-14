import { itemQueries } from "@homebox-ai/db";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { PrintButton } from "./print-button";

export default async function ItemLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const item = await itemQueries.getItem(user.id, id);
  if (!item) notFound();

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const itemUrl = `${protocol}://${host}/items/${item.id}`;

  const qrSvg = await QRCode.toString(itemUrl, { type: "svg", margin: 1 });
  const assetLabel = item.assetId != null ? `#${String(item.assetId).padStart(4, "0")}` : null;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-white p-6 print:h-auto">
      <Link href={`/items/${item.id}`} className="self-start text-sm font-semibold text-ink print:hidden">
        ← Back to item
      </Link>

      <div className="flex flex-col items-center gap-2 rounded-md border border-border p-6 print:border-black">
        {/* Server-rendered QR SVG from the `qrcode` package — trusted, not user input.
            The package hardcodes width/height attributes on the <svg>, so this forces
            it to fill the container instead of overflowing at its own intrinsic size. */}
        <div className="h-44 w-44 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <span className="text-base font-bold text-ink">{item.name}</span>
        {assetLabel && <span className="text-sm text-muted">{assetLabel}</span>}
      </div>

      <PrintButton />
    </div>
  );
}
