import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Server Component / Route Handler / Server Action client. Reads the
 * session from cookies; Postgres RLS applies automatically once this
 * client's access token flows through to a query (see packages/db's
 * `withRLS`, used when a query bypasses PostgREST and talks to Postgres
 * directly instead).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — middleware is responsible
          // for refreshing the session cookie in that case, so this is safe to ignore.
        }
      },
    },
  });
}

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * `getSessionUser()` + a "not authenticated" guard, which every Server
 * Action in this app repeats identically — this is that guard, centralized.
 * Pages (which want a redirect/notFound instead of a thrown error) and
 * Route Handlers (which want a 401 Response) still call getSessionUser()
 * directly; this is specifically for Server Actions, where throwing is the
 * idiomatic way to fail.
 */
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
