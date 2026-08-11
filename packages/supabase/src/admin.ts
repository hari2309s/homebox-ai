import { createClient } from "@supabase/supabase-js";

import { supabaseUrl } from "./env";

function supabaseSecretKey() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return key;
}

/**
 * Privileged client using the secret key — bypasses RLS and normal Auth
 * session checks entirely. Server-only, for operations a user's own session
 * can never perform (deleting their own auth user, admin storage cleanup).
 */
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
