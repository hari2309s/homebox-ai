import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@homebox-ai/supabase/server";

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
  const next = searchParams.get("next") ?? "/items";

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation_failed", request.url));
}
