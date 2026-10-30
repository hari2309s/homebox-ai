import { itemQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { listLocationsCached } from "../../../lib/cached-queries";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const user = await getSessionUser();
  const [itemCount, locations] = user
    ? await Promise.all([itemQueries.countItems(user.id), listLocationsCached(user.id)])
    : [0, []];

  const fullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const userName = fullName || (user?.email?.split("@")[0] ?? "You");

  return <ChatClient itemCount={itemCount} zoneCount={locations.filter((l) => !l.parentId).length} userName={userName} />;
}
