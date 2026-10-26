import { itemQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { listLocationsCached } from "../../../lib/cached-queries";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const user = await getSessionUser();
  const [itemCount, locations] = user
    ? await Promise.all([itemQueries.countItems(user.id), listLocationsCached(user.id)])
    : [0, []];

  return <ChatClient itemCount={itemCount} zoneCount={locations.filter((l) => !l.parentId).length} />;
}
