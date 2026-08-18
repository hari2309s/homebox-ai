import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@homebox-ai/supabase/server";

import { safeRedirect } from "../../../lib/safe-redirect";

/**
 * Landing point for the confirmation email's link. The email template points
 * here (not at Supabase's own `.ConfirmationURL`) because that default uses
 * an implicit-flow redirect with URL-fragment tokens meant for client-side
 * SPAs — it never reaches our `@supabase/ssr` cookie-based session handling.
 * Exchanging the token_hash server-side here sets the session cookie properly.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Query-param controlled — an absolute or protocol-relative value here
  // would let a crafted link (real domain, real token_hash) redirect a
  // freshly-verified session off-site. safeRedirect() rejects anything that
  // isn't a same-origin relative path.
  const next = safeRedirect(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation_failed", request.url));
}
