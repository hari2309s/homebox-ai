"use server";

import { createSupabaseServerClient, requireSessionUser } from "@homebox-ai/supabase/server";
import { uploadAvatar } from "@homebox-ai/supabase/storage";

/**
 * Uploads a cropped avatar image for the current user. The userId is derived
 * from the server session — never from a client-supplied prop — so a tampered
 * request can't overwrite another user's avatar.
 */
export async function uploadAvatarAction(formData: FormData): Promise<string> {
  const user = await requireSessionUser();

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) throw new Error("No image provided");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image too large (max 5 MB)");

  const supabase = await createSupabaseServerClient();
  const signedUrl = await uploadAvatar(supabase, user.id, file);
  await supabase.auth.updateUser({ data: { avatar_url: signedUrl } });
  return signedUrl;
}
