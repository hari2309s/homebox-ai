import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@homebox-ai/supabase/server";

import { safeRedirect } from "../../../lib/safe-redirect";

/**
 * Landing point for Supabase's OAuth redirect (Google, etc.) — mirrors
 * `/auth/confirm`'s job for the email-link flow. `signInWithOAuth` sends the
 * browser to the provider, which redirects back here with a `code` this
 * exchanges for a session; that has to happen server-side so the session
 * lands in an httpOnly cookie via `@supabase/ssr` instead of a URL fragment.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
}
