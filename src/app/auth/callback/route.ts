import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/auth/redirect";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const db = await createClient();
  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let ok = false;
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (token && (type === "invite" || type === "recovery")) {
    const { error } = await db.auth.verifyOtp({ token_hash: token, type });
    ok = !error;
  }
  const next =
    type === "invite"
      ? "/invite"
      : type === "recovery"
        ? "/reset-password"
        : safeRedirect(url.searchParams.get("next"));
  return NextResponse.redirect(
    new URL(ok ? next : "/login?error=callback", url.origin),
  );
}
