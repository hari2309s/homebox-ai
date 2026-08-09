import { redirect } from "next/navigation";

import { getSessionUser } from "@homebox-ai/supabase/server";

export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? "/items" : "/login");
}
