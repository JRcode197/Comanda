"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requestPasswordReset(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  if (!email) redirect("/reset-password");

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? `https://${requestHeaders.get("host")}`;
  const redirectTo = new URL("/auth/callback?next=/reset-password", origin).toString();
  const db = await createClient();

  await db.auth.resetPasswordForEmail(email, { redirectTo });
  // Keep the response independent of account existence.
  redirect("/reset-password?sent=1");
}
