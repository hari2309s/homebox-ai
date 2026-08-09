import { FadeIn } from "@homebox-ai/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSessionUser } from "@homebox-ai/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div>
      <FadeIn
        as="nav"
        style={{ display: "flex", gap: "1rem", padding: "1rem", borderBottom: "1px solid #ddd" }}
      >
        <Link href="/items">Items</Link>
        <Link href="/locations">Locations</Link>
        <Link href="/labels">Labels</Link>
        <Link href="/chat">Chat</Link>
        <Link href="/capture">Capture</Link>
        <Link href="/receipts">Receipts</Link>
        <Link href="/maintenance">Maintenance</Link>
      </FadeIn>
      <FadeIn delay={0.1} style={{ padding: "1rem" }}>
        {children}
      </FadeIn>
    </div>
  );
}
