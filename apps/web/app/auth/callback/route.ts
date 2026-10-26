import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@homebox-ai/supabase/server";

import { JOIN_PATH, PENDING_JOIN_COOKIE } from "../../../lib/pending-join";
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
  // The hosted project's confirmation email lands here too (not only OAuth). A family member who signed up
  // from an invite goes back to it: via ?next when the link carries it, else via the remembered cookie.
  const pendingJoin = decodeURIComponent(request.cookies.get(PENDING_JOIN_COOKIE)?.value ?? "");
  const next = searchParams.get("next")
    ? safeRedirect(searchParams.get("next"))
    : JOIN_PATH.test(pendingJoin)
      ? pendingJoin
      : safeRedirect(null);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(new URL(next, origin));
      response.cookies.delete(PENDING_JOIN_COOKIE);
      return response;
    }
    if (searchParams.get("from") !== "email")
      return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
    // A confirmation link opened in a different browser can't finish the code exchange (the PKCE verifier
    // lives in the browser that signed up), but Supabase has already confirmed the email by now — so ask
    // them to sign in and carry on to where they were going.
    const login = new URL("/login", origin);
    login.searchParams.set("notice", "confirmed_elsewhere");
    login.searchParams.set("redirectTo", next);
    return NextResponse.redirect(login);
  }

  const expired = (searchParams.get("error_code") ?? "").includes("expired");
  return NextResponse.redirect(new URL(`/login?error=${expired ? "link_expired" : "oauth_failed"}`, origin));
}
