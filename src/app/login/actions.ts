"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function login(form: FormData) {
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) redirect("/login?error=credentials");
  redirect("/");
}
export async function logout() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/login");
}
